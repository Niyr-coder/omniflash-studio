// OmniFlash Studio — servidor local sin dependencias.
// Guarda tu llave de Kie en tu computadora, maneja una cola de videos,
// avisa en vivo a la interfaz de cada cambio y descarga los videos a /videos.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { exec } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const ENV_FILE = path.join(ROOT, '.env');

const KIE_API = 'https://api.kie.ai';
const KIE_UPLOAD = 'https://kieai.redpandaai.co';
const MODEL = 'google/gemini-omni-flash-1-1';
const UPLOAD_TTL = 23 * 3600 * 1000; // Kie borra lo subido a las 24 h

// ---------- Configuración (.env) ----------
function readEnv() {
  const env = {};
  try {
    for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
  return env;
}
let env = readEnv();
const PORT = Number(process.env.PORT || env.PORT || 4747);
const apiKey = () => process.env.KIE_API_KEY || env.KIE_API_KEY || '';

async function saveApiKey(key) {
  let text = '';
  try { text = await fsp.readFile(ENV_FILE, 'utf8'); } catch {}
  if (/^KIE_API_KEY=.*$/m.test(text)) text = text.replace(/^KIE_API_KEY=.*$/m, `KIE_API_KEY=${key}`);
  else text = `KIE_API_KEY=${key}\n` + text;
  await fsp.writeFile(ENV_FILE, text);
  env = readEnv();
}

// ---------- Datos locales ----------
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });
const readJsonFile = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };

let history = readJsonFile(HISTORY_FILE, []);
const queue = { maxConcurrent: 2, paused: false, pauseReason: '', ...readJsonFile(SETTINGS_FILE, {}) };
let credits = null;

// Migrar entradas antiguas y limpiar estados a medias
for (const h of history) {
  if (!h.taskId && h.state !== 'queued') h.taskId = h.id;
  if (h.state === 'sending') h.state = 'queued';
  if (!h.sentAt && h.taskId) h.sentAt = h.createdAt;
}

const timers = {};
const debounce = (key, ms, fn) => { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); };
const saveHistory = () => debounce('h', 200, () => fsp.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2)).catch(() => {}));
const saveQueue = () => fsp.writeFile(SETTINGS_FILE, JSON.stringify({ maxConcurrent: queue.maxConcurrent, paused: queue.paused, pauseReason: queue.pauseReason }, null, 2)).catch(() => {});

// ---------- Eventos en vivo (Server-Sent Events) ----------
const clients = new Set();
function emit(type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}
const publicItem = (h) => { const { request, ...rest } = h; return { ...rest, canRetry: !!request }; };
function changed(item) {
  item.updatedAt = Date.now();
  saveHistory();
  emit('item', publicItem(item));
}
const queueState = () => ({ ...queue, queued: history.filter((h) => h.state === 'queued').length, active: history.filter(isActive).length });
const emitQueue = () => emit('queue', queueState());
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000);

// ---------- Precios (créditos de Kie, 1 crédito = $0.005) ----------
const PRICES = {
  normal: { '4': 63, '6': 84, '8': 105, '10': 126 },
  '4k': { '4': 147, '6': 168, '8': 189, '10': 210 },
  withVideo: { normal: 168, '4k': 252 },
};
function estimateCredits({ resolution, duration, hasVideo }) {
  const tier = resolution === '4k' ? '4k' : 'normal';
  if (hasVideo) return PRICES.withVideo[tier];
  return PRICES[tier][String(duration)] ?? 0;
}

// ---------- Errores en español ----------
const KIE_ERRORS = {
  401: 'Tu llave de Kie no es válida. Revísala en Ajustes.',
  402: 'No te quedan créditos suficientes en Kie. Recarga en kie.ai.',
  404: 'Kie no encontró lo que pedimos.',
  408: 'Kie tardó demasiado (más de 10 minutos) sin devolver el video.',
  422: 'Kie no aceptó los datos. Revisa el texto y los archivos.',
  429: 'Kie está recibiendo demasiadas solicitudes.',
  433: 'Kie rechazó la solicitud por sus límites de uso.',
  455: 'Kie está en mantenimiento.',
  500: 'Kie tuvo un error interno.',
  501: 'La generación falló en Kie.',
  505: 'Esta función está desactivada en Kie por ahora.',
};
class KieError extends Error {
  constructor(code, msg) {
    super(KIE_ERRORS[code] ? `${KIE_ERRORS[code]}${msg && code !== 402 ? ` (Kie dice: ${msg})` : ''}` : msg || 'Error desconocido de Kie.');
    this.code = code;
    this.kieMsg = msg;
  }
}

async function kie(pathname, { method = 'GET', body, base = KIE_API } = {}) {
  const key = apiKey();
  if (!key) throw new KieError(401);
  const headers = { Authorization: `Bearer ${key}` };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(base + pathname, {
      method, headers, signal: AbortSignal.timeout(body instanceof FormData ? 300000 : 30000),
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const e = new Error('No hay conexión con Kie. Revisa tu internet.');
    e.network = true;
    throw e;
  }
  let json;
  try { json = await res.json(); } catch { throw new KieError(res.status, `HTTP ${res.status}`); }
  const code = Number(json.code ?? res.status);
  if (code !== 200 || json.success === false) {
    if (!pathname.startsWith('/api/v1/jobs/recordInfo')) console.log(`  [Kie] ${new Date().toLocaleTimeString()} ${pathname.split('?')[0]} → ${code} ${json.msg || ''}`);
    throw new KieError(code, json.msg);
  }
  return json.data;
}

async function refreshCredits() {
  try { credits = await kie('/api/v1/chat/credit'); emit('credits', { credits }); } catch {}
  return credits;
}
const refreshCreditsSoon = () => debounce('c', 1500, refreshCredits);

// ---------- Construir la solicitud para Kie ----------
const DURATIONS = ['4', '6', '8', '10'];
const RATIOS = ['16:9', '9:16'];
const RESOLUTIONS = ['360p', '720p', '1080p', '4k'];
const round1 = (n) => Math.round(n * 10) / 10;

function buildInput(p) {
  const prompt = String(p.prompt || '').trim();
  if (!prompt) throw new Error('Escribe qué quieres ver en el video.');
  if (prompt.length > 20000) throw new Error('El texto es demasiado largo (máximo 20 000 caracteres).');
  const input = {
    prompt,
    duration: DURATIONS.includes(String(p.duration)) ? String(p.duration) : '6',
    aspect_ratio: RATIOS.includes(p.aspect_ratio) ? p.aspect_ratio : '16:9',
    resolution: RESOLUTIONS.includes(p.resolution) ? p.resolution : '720p',
  };
  if (p.seed !== undefined && p.seed !== null && p.seed !== '') {
    const seed = Math.floor(Number(p.seed));
    if (!(seed >= 0 && seed <= 2147483647)) throw new Error('La semilla debe ser un número entre 0 y 2 147 483 647.');
    input.seed = seed;
  }
  const images = (p.image_urls || []).filter(Boolean);
  switch (p.mode) {
    case 'text': break;
    case 'images':
      if (!images.length) throw new Error('Sube al menos una imagen de referencia.');
      if (images.length > 7) throw new Error('Máximo 7 imágenes de referencia.');
      input.image_urls = images;
      break;
    case 'frames':
      if (!p.first_frame_url) throw new Error('Sube la imagen del primer cuadro.');
      input.first_frame_url = p.first_frame_url;
      if (p.last_frame_url) input.last_frame_url = p.last_frame_url;
      break;
    case 'video': {
      const v = p.video || {};
      if (!v.url) throw new Error('Sube el video que quieres usar.');
      const start = Math.max(0, Number(v.start) || 0);
      const ends = Number(v.ends);
      if (!(ends > start)) throw new Error('El final del recorte debe ser mayor que el inicio.');
      if (ends - start > 10.05) throw new Error('El recorte del video puede durar máximo 10 segundos.');
      input.video_list = [{ url: v.url, start: round1(start), ends: round1(ends) }];
      if (images.length > 5) throw new Error('Con un video puedes añadir máximo 5 imágenes.');
      if (images.length) input.image_urls = images;
      break;
    }
    default: throw new Error('Modo desconocido.');
  }
  return input;
}

function newItem({ mode, input, previews, uploadedAt }) {
  return {
    id: 'v_' + crypto.randomBytes(6).toString('hex'),
    createdAt: Date.now(),
    uploadedAt: uploadedAt || Date.now(),
    state: 'queued',
    mode,
    prompt: input.prompt,
    settings: { duration: input.duration, aspect_ratio: input.aspect_ratio, resolution: input.resolution, seed: input.seed },
    inputs: { image_urls: input.image_urls, first_frame_url: input.first_frame_url, last_frame_url: input.last_frame_url, video: input.video_list?.[0] },
    previews: previews || {},
    credits: estimateCredits({ resolution: input.resolution, duration: input.duration, hasVideo: !!input.video_list }),
    request: { mode, input },
  };
}

// ---------- Cola ----------
const isActive = (h) => h.state === 'sending' || h.state === 'pending';
let processing = false;

async function processQueue() {
  if (processing || queue.paused || !apiKey()) return;
  processing = true;
  try {
    const now = Date.now();
    // Más antiguos primero
    const waiting = history.filter((h) => h.state === 'queued' && !(h.retryAt > now)).sort((a, b) => a.createdAt - b.createdAt);
    let free = queue.maxConcurrent - history.filter(isActive).length;
    for (const item of waiting) {
      if (free <= 0 || queue.paused) break;
      free--;
      await sendToKie(item);
    }
  } finally {
    processing = false;
  }
}

async function sendToKie(item) {
  if (item.uploadedAt && Date.now() - item.uploadedAt > UPLOAD_TTL && hasUploads(item)) {
    item.state = 'failed';
    item.error = 'Los archivos que subiste ya expiraron en Kie (duran 24 h). Usa «Crear otra versión» y vuelve a subirlos.';
    return changed(item);
  }
  item.state = 'sending';
  item.note = '';
  changed(item);
  emitQueue();
  try {
    const data = await kie('/api/v1/jobs/createTask', { method: 'POST', body: { model: MODEL, input: item.request.input } });
    item.taskId = data.taskId;
    item.state = 'pending';
    item.sentAt = Date.now();
    item.retryAt = 0;
    changed(item);
    refreshCreditsSoon();
  } catch (err) {
    if (err.network || err.code === 429 || err.code === 455 || err.code === 500) {
      item.state = 'queued';
      item.retries = (item.retries || 0) + 1;
      item.retryAt = Date.now() + Math.min(60000, 8000 * item.retries);
      item.note = err.code === 429 ? 'Kie está ocupado; lo reintento en unos segundos' : err.network ? 'Sin conexión; lo reintento en unos segundos' : 'Kie tuvo un problema; lo reintento en unos segundos';
      changed(item);
    } else if (err.code === 402 || (err.code === 401 && !(await keyWorks()))) {
      // Sin créditos o llave realmente mala: pausar la cola para no fallar uno tras otro
      item.state = 'queued';
      changed(item);
      queue.paused = true;
      queue.pauseReason = err.code === 402 ? 'Te quedaste sin créditos. Recarga en kie.ai y reanuda la cola.' : 'Tu llave de Kie no funciona. Revísala en Ajustes y reanuda la cola.';
      saveQueue();
    } else {
      // La llave sirve pero Kie rechazó este video en concreto: se marca solo este
      item.state = 'failed';
      item.error = err.message;
      changed(item);
    }
  }
  emitQueue();
}
async function keyWorks() {
  try { await kie('/api/v1/chat/credit'); return true; } catch { return false; }
}
const hasUploads = (h) => !!(h.inputs?.image_urls?.length || h.inputs?.first_frame_url || h.inputs?.video);

// ---------- Vigilar tareas en Kie ----------
let polling = false;
async function pollPending() {
  if (polling) return;
  polling = true;
  try {
    for (const item of history.filter((h) => h.state === 'pending')) {
      try {
        const d = await kie(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(item.taskId)}`);
        const prevSig = `${item.kieState}|${item.progress}`;
        item.kieState = d.state;
        if (typeof d.progress === 'number') item.progress = d.progress;
        item.pollErrors = 0;
        if (d.state === 'success') {
          let urls = [];
          try { urls = JSON.parse(d.resultJson || '{}').resultUrls || []; } catch {}
          item.videoUrl = urls[0];
          item.credits = d.creditsConsumed ?? item.credits;
          item.costTime = d.costTime;
          item.completedAt = Date.now();
          if (item.videoUrl) downloadVideo(item);
          else { item.state = 'failed'; item.error = 'Kie terminó pero no devolvió el video.'; changed(item); }
          refreshCreditsSoon();
          emitQueue();
        } else if (d.state === 'fail') {
          item.state = 'failed';
          item.error = traducirFallo(d.failMsg, d.failCode);
          item.completedAt = Date.now();
          changed(item);
          refreshCreditsSoon();
          emitQueue();
        } else if (prevSig !== `${item.kieState}|${item.progress}`) {
          changed(item);
        }
      } catch (err) {
        if (err.code === 401) break;
        item.pollErrors = (item.pollErrors || 0) + 1;
        if (item.pollErrors > 120) { item.state = 'failed'; item.error = err.message; changed(item); emitQueue(); }
      }
    }
  } finally {
    polling = false;
  }
}
function traducirFallo(msg, code) {
  const m = String(msg || '');
  if (/safety|policy|moderat|sensitive|nsfw|violat/i.test(m)) return 'Kie bloqueó el video por sus reglas de contenido. Prueba con otra descripción o imagen.';
  if (/timeout|timed out/i.test(m)) return 'La generación tardó demasiado. Intenta de nuevo.';
  return m ? `La generación falló: ${m}` : `La generación falló${code ? ` (código ${code})` : ''}.`;
}
async function downloadVideo(item) {
  item.state = 'downloading';
  changed(item);
  const file = `${safeName(item.prompt).slice(0, 40) || 'video'}-${(item.taskId || item.id).slice(-8)}.mp4`;
  try {
    const res = await fetch(item.videoUrl, { signal: AbortSignal.timeout(300000) });
    if (!res.ok || !res.body) throw new Error();
    const tmp = path.join(VIDEOS_DIR, file + '.part');
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
    await fsp.rename(tmp, path.join(VIDEOS_DIR, file));
    item.localFile = file;
  } catch {
    // Si la descarga falla, el video sigue disponible en Kie (14 días).
  }
  item.state = 'done';
  changed(item);
}
const safeName = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

for (const h of history) if (h.state === 'downloading') downloadVideo(h);
setInterval(processQueue, 2000);
setInterval(pollPending, 4000);
pollPending();
refreshCredits();

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.json': 'application/json',
};
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function readBody(req, limit = 120 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('El archivo es demasiado grande.');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}
async function readJson(req) {
  const buf = await readBody(req, 8 * 1024 * 1024);
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { throw new Error('Solicitud inválida.'); }
}

async function serveStatic(req, res, baseDir, rel) {
  const filePath = path.join(baseDir, path.normalize(rel).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(baseDir)) return send(res, 403, { error: 'Prohibido' });
  let stat;
  try { stat = await fsp.stat(filePath); } catch { return send(res, 404, { error: 'No encontrado' }); }
  if (stat.isDirectory()) return serveStatic(req, res, baseDir, path.join(rel, 'index.html'));
  const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range;
  if (range && type === 'video/mp4') {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = Number(s) || 0;
    const end = e ? Math.min(Number(e), stat.size - 1) : stat.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-cache', 'Accept-Ranges': type === 'video/mp4' ? 'bytes' : 'none' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  try {
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`event: hello\ndata: ${JSON.stringify({ queue: queueState(), credits })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // Llave
    if (p === '/api/config' && req.method === 'GET') {
      const k = apiKey();
      return send(res, 200, { hasKey: !!k, keyHint: k ? `••••${k.slice(-4)}` : '', model: MODEL, prices: PRICES });
    }
    if (p === '/api/config' && req.method === 'POST') {
      const { apiKey: key } = await readJson(req);
      const clean = String(key || '').trim();
      if (!/^[A-Za-z0-9_\-]{16,}$/.test(clean)) return send(res, 400, { error: 'Esa llave no parece válida. Cópiala completa desde kie.ai/api-key.' });
      const prev = process.env.KIE_API_KEY;
      process.env.KIE_API_KEY = clean;
      try {
        credits = await kie('/api/v1/chat/credit');
        await saveApiKey(clean);
        if (queue.paused && /llave/i.test(queue.pauseReason)) { queue.paused = false; queue.pauseReason = ''; saveQueue(); emitQueue(); }
        emit('credits', { credits });
        return send(res, 200, { ok: true, credits });
      } catch (err) {
        if (prev) process.env.KIE_API_KEY = prev; else delete process.env.KIE_API_KEY;
        return send(res, 400, { error: err.message });
      }
    }
    if (p === '/api/credits' && req.method === 'GET') {
      credits = await kie('/api/v1/chat/credit');
      emit('credits', { credits });
      return send(res, 200, { credits });
    }

    // Subir archivo a Kie
    if (p === '/api/upload' && req.method === 'POST') {
      const name = safeName(url.searchParams.get('name') || 'archivo').slice(0, 60) || 'archivo';
      const ext = (url.searchParams.get('ext') || '').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase() || 'bin';
      const type = req.headers['content-type'] || 'application/octet-stream';
      const buf = await readBody(req);
      const isVideo = type.startsWith('video/');
      if (!isVideo && buf.length > 20 * 1024 * 1024) return send(res, 400, { error: 'Las imágenes pueden pesar máximo 20 MB.' });
      if (isVideo && buf.length > 100 * 1024 * 1024) return send(res, 400, { error: 'El video puede pesar máximo 100 MB.' });
      const form = new FormData();
      form.append('file', new Blob([buf], { type }), `${name}.${ext}`);
      form.append('uploadPath', 'omniflash-studio');
      form.append('fileName', `${Date.now()}-${name}.${ext}`);
      const data = await kie('/api/file-stream-upload', { method: 'POST', body: form, base: KIE_UPLOAD });
      return send(res, 200, { url: data.downloadUrl, uploadedAt: Date.now() });
    }

    // Poner videos en la cola
    if (p === '/api/generate' && req.method === 'POST') {
      const b = await readJson(req);
      const count = Math.min(4, Math.max(1, Math.floor(Number(b.count) || 1)));
      const base = buildInput(b);
      const items = [];
      for (let i = 0; i < count; i++) {
        const input = { ...base };
        if (base.seed !== undefined && i > 0) input.seed = (base.seed + i) % 2147483648;
        const item = newItem({ mode: b.mode, input, previews: b.previews, uploadedAt: Number(b.uploadedAt) || Date.now() });
        item.createdAt += i; // conserva el orden
        if (count > 1) item.batch = { n: i + 1, of: count };
        history.unshift(item);
        items.push(item);
        changed(item);
      }
      emitQueue();
      setTimeout(processQueue, 50);
      return send(res, 200, { items: items.map(publicItem) });
    }

    // Historial
    if (p === '/api/history' && req.method === 'GET') return send(res, 200, { items: history.map(publicItem), queue: queueState(), credits });
    const m = p.match(/^\/api\/history\/([\w\-]+)(\/retry)?$/);
    if (m) {
      const item = history.find((h) => h.id === m[1]);
      if (!item) return send(res, 404, { error: 'Ese video ya no existe.' });
      if (m[2] && req.method === 'POST') {
        if (!item.request) return send(res, 400, { error: 'Este video es de una versión anterior; usa «Crear otra versión».' });
        const copy = newItem({ mode: item.mode, input: item.request.input, previews: item.previews, uploadedAt: item.uploadedAt });
        history.unshift(copy);
        changed(copy);
        emitQueue();
        setTimeout(processQueue, 50);
        return send(res, 200, { item: publicItem(copy) });
      }
      if (req.method === 'DELETE') {
        if (isActive(item)) return send(res, 409, { error: 'Este video ya se está creando en Kie y no se puede cancelar. Podrás borrarlo cuando termine.' });
        history.splice(history.indexOf(item), 1);
        if (item.localFile) await fsp.rm(path.join(VIDEOS_DIR, item.localFile), { force: true });
        saveHistory();
        emit('remove', { id: item.id });
        emitQueue();
        return send(res, 200, { ok: true });
      }
    }

    // Ajustes de la cola
    if (p === '/api/queue' && req.method === 'POST') {
      const b = await readJson(req);
      if (b.maxConcurrent !== undefined) queue.maxConcurrent = Math.min(4, Math.max(1, Math.floor(Number(b.maxConcurrent) || 1)));
      if (b.paused !== undefined) { queue.paused = !!b.paused; if (!queue.paused) queue.pauseReason = ''; }
      for (const h of history) if (h.state === 'queued') h.retryAt = 0;
      saveQueue();
      emitQueue();
      setTimeout(processQueue, 50);
      return send(res, 200, queueState());
    }

    if (p === '/api/open-folder' && req.method === 'POST') {
      const cmd = process.platform === 'win32' ? `explorer "${VIDEOS_DIR}"` : process.platform === 'darwin' ? `open "${VIDEOS_DIR}"` : `xdg-open "${VIDEOS_DIR}"`;
      exec(cmd);
      return send(res, 200, { ok: true });
    }

    if (p.startsWith('/api/')) return send(res, 404, { error: 'No encontrado' });
    if (p.startsWith('/videos/')) return serveStatic(req, res, VIDEOS_DIR, decodeURIComponent(p.slice(8)));
    return serveStatic(req, res, PUBLIC_DIR, decodeURIComponent(p));
  } catch (err) {
    send(res, err instanceof KieError ? 502 : 400, { error: err.message || 'Algo salió mal.', code: err.code });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  El puerto ${PORT} ya está en uso. ¿Ya tienes OmniFlash Studio abierto?`);
    console.log(`  Abre http://localhost:${PORT} o cambia PORT en el archivo .env\n`);
  } else console.error(err);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const link = `http://localhost:${PORT}`;
  console.log('\n  ✦ OmniFlash Studio está listo');
  console.log(`  → Abre ${link} en tu navegador`);
  console.log('  (Deja esta ventana abierta mientras lo uses. Para cerrar: Ctrl + C)\n');
  if (process.env.OPEN_BROWSER) {
    const cmd = process.platform === 'win32' ? `start "" ${link}` : process.platform === 'darwin' ? `open ${link}` : `xdg-open ${link}`;
    exec(cmd);
  }
});
