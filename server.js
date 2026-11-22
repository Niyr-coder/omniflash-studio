// OmniFlash Studio — servidor local sin dependencias.
// Guarda tu llave de Kie en tu computadora, maneja una cola de videos,
// avisa en vivo a la interfaz de cada cambio y descarga los videos a /videos.

import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { exec, execFile, spawn } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const FILES = {
  history: path.join(DATA_DIR, 'history.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
  characters: path.join(DATA_DIR, 'characters.json'),
  recipes: path.join(DATA_DIR, 'recipes.json'),
  styles: path.join(DATA_DIR, 'styles.json'),
  edits: path.join(DATA_DIR, 'edits.json'),
};
const MUSIC_DIR = path.join(DATA_DIR, 'music');
const ENV_FILE = path.join(ROOT, '.env');

const KIE_API = 'https://api.kie.ai';
const KIE_UPLOAD = 'https://kieai.redpandaai.co';
const UPLOAD_TTL = 23 * 3600 * 1000; // Kie borra lo subido a las 24 h
const RESULT_TTL = 13.5 * 24 * 3600 * 1000; // y lo generado a los 14 días
const CHAT_MODEL_PATH = '/gemini-3-8-flash-openai/v1/chat/completions';

// ---------- Modelos ----------
const MODELS = {
  '1.2': 'google/gemini-omni-flash-1-2',
  '1.1': 'google/gemini-omni-flash-1-1',
  extend: 'google/gemini-omni-flash-1-2-extend',
  upscale: 'video/upscale',
};
const MODEL_NAMES = {
  [MODELS['1.2']]: 'Gemini Omni Flash 1.2', [MODELS['1.1']]: 'Gemini Omni Flash 1.1',
  [MODELS.extend]: 'Gemini Omni Flash 1.2 Extend (continuar videos)', [MODELS.upscale]: 'Video Upscale (mejorar calidad)',
};

// ---------- Precios (créditos de Kie, 1 crédito = $0.005) ----------
const PRICES = {
  '1.1': { normal: { 4: 63, 6: 84, 8: 105, 10: 126 }, '4k': { 4: 147, 6: 168, 8: 189, 10: 210 }, withVideo: { normal: 168, '4k': 252 } },
  '1.2': { perSecond: { '360p': 4, '720p': 9, '1080p': 10, '4k': 22 } },
};
function estimateCredits({ model, resolution, duration, videoSeconds }) {
  if (model === '1.1') {
    const t = resolution === '4k' ? '4k' : 'normal';
    return videoSeconds ? PRICES['1.1'].withVideo[t] : PRICES['1.1'][t][Number(duration)] ?? 0;
  }
  if (model === '1.2' || model === 'extend') {
    const s = videoSeconds || Number(duration) || 0;
    return Math.round(s * (PRICES['1.2'].perSecond[resolution] ?? 9));
  }
  return 0; // mejora de calidad: Kie no publica el precio; se ve al terminar
}

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
fs.mkdirSync(MUSIC_DIR, { recursive: true });
const readJsonFile = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };
const timers = {};
const debounce = (key, ms, fn) => { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); };
const writeLater = (key, file, getData) => debounce(key, 200, () => fsp.writeFile(file, JSON.stringify(getData(), null, 2)).catch(() => {}));

let history = readJsonFile(FILES.history, []);
let characters = readJsonFile(FILES.characters, []);
let recipes = readJsonFile(FILES.recipes, []);
let styles = readJsonFile(FILES.styles, []);
let edits = readJsonFile(FILES.edits, []);
const settings = {
  maxConcurrent: 2, paused: false, pauseReason: '',
  dailyLimit: 0, projects: [], bibles: {},
  lan: { enabled: false, token: crypto.randomBytes(12).toString('hex') },
  ...readJsonFile(FILES.settings, {}),
};
let credits = null;

// Migrar entradas antiguas y limpiar estados a medias
for (const h of history) {
  if (!h.taskId && h.state !== 'queued') h.taskId = h.id;
  if (h.state === 'sending') h.state = 'queued';
  if (!h.sentAt && h.taskId) h.sentAt = h.createdAt;
  if (!h.model) h.model = '1.1';
  if (h.request && !h.request.model) h.request.model = MODELS['1.1'];
}

const saveHistory = () => writeLater('h', FILES.history, () => history);
const saveSettings = () => writeLater('s', FILES.settings, () => settings);
const saveCharacters = () => writeLater('c', FILES.characters, () => characters);
const saveRecipes = () => writeLater('r', FILES.recipes, () => recipes);
const saveStyles = () => writeLater('st', FILES.styles, () => styles);
const saveEdits = () => writeLater('ed', FILES.edits, () => edits);
for (const e of edits) if (e.render?.state === 'working') e.render = { state: 'failed', error: 'Se cerró el estudio mientras se exportaba. Vuelve a exportar.' };

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
const isActive = (h) => h.state === 'sending' || h.state === 'pending';
const queueState = () => ({
  maxConcurrent: settings.maxConcurrent, paused: settings.paused, pauseReason: settings.pauseReason,
  queued: history.filter((h) => h.state === 'queued').length, active: history.filter(isActive).length,
});
const emitQueue = () => emit('queue', queueState());
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000);

// ---------- Gastos ----------
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const spentOf = (h) => (h.state === 'failed' ? 0 : Number(h.credits) || 0);
function spending() {
  const sent = history.filter((h) => h.sentAt);
  const now = Date.now();
  const today = dayKey(now);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const t = now - i * 86400000;
    const k = dayKey(t);
    days.push({ day: new Date(t).toLocaleDateString('es', { weekday: 'short' }), credits: sent.filter((h) => dayKey(h.sentAt) === k).reduce((a, h) => a + spentOf(h), 0) });
  }
  const sum = (arr) => arr.reduce((a, h) => a + spentOf(h), 0);
  return {
    today: sum(sent.filter((h) => dayKey(h.sentAt) === today)),
    week: sum(sent.filter((h) => now - h.sentAt < 7 * 86400000)),
    total: sum(sent),
    videos: sent.filter((h) => h.state === 'done').length,
    days,
    dailyLimit: settings.dailyLimit,
  };
}
const emitSpending = () => debounce('sp', 400, () => emit('spending', spending()));

// ---------- Errores en español ----------
const KIE_ERRORS = {
  401: 'Kie no autorizó la solicitud.',
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
  }
}
async function kie(pathname, { method = 'GET', body, base = KIE_API, raw = false } = {}) {
  const key = apiKey();
  if (!key) throw Object.assign(new Error('Conecta tu llave de Kie primero.'), { code: 401 });
  const headers = { Authorization: `Bearer ${key}` };
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(base + pathname, {
      method, headers, signal: AbortSignal.timeout(body instanceof FormData ? 300000 : 60000),
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('No hay conexión con Kie. Revisa tu internet.'), { network: true });
  }
  let json;
  try { json = await res.json(); } catch { throw new KieError(res.status, `HTTP ${res.status}`); }
  if (raw && res.ok && json.choices) return json; // respuesta de chat (formato OpenAI)
  const code = Number(json.code ?? res.status);
  if (code !== 200 || json.success === false) {
    const msg = json.msg || json.error?.message || '';
    if (!pathname.startsWith('/api/v1/jobs/recordInfo')) console.log(`  [Kie] ${new Date().toLocaleTimeString()} ${pathname.split('?')[0]} → ${code} ${msg}`);
    if (/not authorized to use this model/i.test(msg)) {
      const name = pathname === CHAT_MODEL_PATH ? 'Gemini 3.8 Flash (texto, para «Mejorar con IA»)'
        : pathname.includes('/omni/audio') ? 'Gemini Omni Audio (voces)'
        : pathname.includes('/omni/character') ? 'Gemini Omni Character (personajes)'
        : MODEL_NAMES[body?.model] || body?.model || 'este modelo';
      throw Object.assign(new Error(`Tu llave de Kie no tiene permiso para usar ${name}. Entra a kie.ai → API Key, edita tu llave y activa ese modelo (o permite todos).`), { code: 403, modelBlocked: true });
    }
    throw new KieError(code, msg);
  }
  return json.data;
}
async function refreshCredits() {
  try { credits = await kie('/api/v1/chat/credit'); emit('credits', { credits }); } catch {}
  return credits;
}
const refreshCreditsSoon = () => debounce('cr', 1500, refreshCredits);
async function keyWorks() { try { await kie('/api/v1/chat/credit'); return true; } catch { return false; } }

// ---------- Construir solicitudes ----------
const RATIOS = ['16:9', '9:16'];
const RESOLUTIONS = ['360p', '720p', '1080p', '4k'];
const round1 = (n) => Math.round(n * 10) / 10;
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function buildRequest(p) {
  const model = p.model === '1.1' ? '1.1' : '1.2';
  const prompt = String(p.prompt || '').trim();
  if (!prompt) throw new Error('Escribe qué quieres ver en el video.');
  if (prompt.length > 20000) throw new Error('El texto es demasiado largo (máximo 20 000 caracteres).');
  const resolution = RESOLUTIONS.includes(p.resolution) ? p.resolution : '720p';
  const input = { prompt, aspect_ratio: RATIOS.includes(p.aspect_ratio) ? p.aspect_ratio : '16:9', resolution };
  const images = (p.image_urls || []).filter(Boolean);
  const chars = (p.character_ids || []).filter(Boolean);
  const maxImg = model === '1.1' ? 7 : 6;
  const maxChar = model === '1.1' ? 3 : 2;
  let duration = Number(p.duration) || 6;
  let videoSeconds = 0;

  // Semilla: siempre guardamos una, así «Recrear en alta calidad» da un resultado parecido
  let seed = p.seed === '' || p.seed == null ? null : Math.floor(Number(p.seed));
  if (model === '1.2') {
    if (seed == null || !(seed >= 10000 && seed <= 99999)) seed = seed == null ? rnd(10000, 99999) : 10000 + (Math.abs(seed) % 90000);
    input.seeds = seed;
  } else {
    if (seed == null || !(seed >= 0 && seed <= 2147483647)) seed = seed == null ? rnd(0, 2147483647) : Math.abs(seed) % 2147483648;
    input.seed = seed;
  }

  if (chars.length > maxChar) throw new Error(`Con este modelo puedes usar máximo ${maxChar} personajes a la vez.`);

  switch (p.mode) {
    case 'text':
    case 'images':
      if (p.mode === 'images' && !images.length) throw new Error('Sube al menos una imagen de referencia.');
      if (images.length > maxImg) throw new Error(`Máximo ${maxImg} imágenes de referencia con este modelo.`);
      if (images.length) input.image_urls = images;
      if (chars.length) input.character_ids = chars;
      break;
    case 'frames':
      if (!p.first_frame_url) throw new Error('Sube la imagen del primer cuadro.');
      input.first_frame_url = p.first_frame_url;
      if (p.last_frame_url) input.last_frame_url = p.last_frame_url;
      if (model === '1.2' && p.last_frame_url && duration > 10) throw new Error('Con primer y último cuadro, el video puede durar máximo 10 segundos.');
      break;
    case 'video': {
      const v = p.video || {};
      if (!v.url) throw new Error('Sube el video que quieres usar.');
      if (model === '1.1') {
        const start = Math.max(0, Number(v.start) || 0);
        const ends = Number(v.ends);
        if (!(ends > start)) throw new Error('El final del recorte debe ser mayor que el inicio.');
        if (ends - start > 10.05) throw new Error('El recorte del video puede durar máximo 10 segundos.');
        input.video_list = [{ url: v.url, start: round1(start), ends: round1(ends) }];
        videoSeconds = ends - start;
      } else {
        if (Number(v.length) > 15.5) throw new Error('Con el modelo 1.2 el video puede durar máximo 15 s. Recórtalo o cambia al modelo 1.1.');
        input.video_list = [v.url];
        videoSeconds = Math.max(1, Math.round(Number(v.length) || 10));
      }
      if (images.length > 5) throw new Error('Con un video puedes añadir máximo 5 imágenes.');
      if (images.length) input.image_urls = images;
      if (chars.length) input.character_ids = chars;
      break;
    }
    default: throw new Error('Modo desconocido.');
  }

  if (model === '1.1') {
    if (![4, 6, 8, 10].includes(duration)) duration = 6;
    input.duration = String(duration);
    if (images.length + (videoSeconds ? 2 : 0) + chars.length > 7) throw new Error('Demasiados archivos juntos: imágenes + personajes (+2 si hay video) no pueden pasar de 7.');
  } else if (p.mode !== 'video') {
    duration = Math.min(15, Math.max(3, Math.round(duration)));
    input.duration = duration;
  }
  if (model === '1.2' && images.length + (videoSeconds ? 2 : 0) > 7) throw new Error('Demasiados archivos juntos: imágenes (+2 si hay video) no pueden pasar de 7.');
  const outSeconds = p.mode === 'video' ? videoSeconds : duration;
  return {
    model, request: { model: MODELS[model], input },
    settings: { duration: outSeconds, aspect_ratio: input.aspect_ratio, resolution, seed },
    credits: estimateCredits({ model, resolution, duration, videoSeconds: p.mode === 'video' ? videoSeconds : 0 }),
  };
}

function newItem({ mode, model, request, settings: s, credits: c, prompt, previews, uploadedAt, project, extra = {} }) {
  return {
    id: 'v_' + crypto.randomBytes(6).toString('hex'),
    createdAt: Date.now(),
    uploadedAt: uploadedAt || Date.now(),
    state: 'queued',
    mode, model, prompt,
    settings: s,
    inputs: summarizeInputs(request.input),
    previews: previews || {},
    credits: c,
    project: project || '',
    request,
    ...extra,
  };
}
function summarizeInputs(i) {
  const v = i.video_list?.[0];
  return {
    image_urls: i.image_urls, first_frame_url: i.first_frame_url, last_frame_url: i.last_frame_url,
    video: typeof v === 'string' ? { url: v } : v, character_ids: i.character_ids,
  };
}
function enqueue(items) {
  for (const it of items) { history.unshift(it); changed(it); }
  emitQueue();
  setTimeout(processQueue, 50);
}

// ---------- Cola ----------
let processing = false;
async function processQueue() {
  if (processing || settings.paused || !apiKey()) return;
  processing = true;
  try {
    const now = Date.now();
    const waiting = history.filter((h) => h.state === 'queued' && !(h.retryAt > now)).sort((a, b) => a.createdAt - b.createdAt);
    let free = settings.maxConcurrent - history.filter(isActive).length;
    for (const item of waiting) {
      if (free <= 0 || settings.paused) break;
      if (settings.dailyLimit > 0 && spending().today + (Number(item.credits) || 0) > settings.dailyLimit) {
        pauseQueue(`Llegaste a tu límite de ${settings.dailyLimit} créditos por día. Súbelo en Tu cuenta o reanuda mañana.`);
        break;
      }
      free--;
      await sendToKie(item);
    }
  } finally {
    processing = false;
  }
}
function pauseQueue(reason) {
  settings.paused = true;
  settings.pauseReason = reason;
  saveSettings();
  emitQueue();
}
const hasUploads = (h) => !!(h.inputs?.image_urls?.length || h.inputs?.first_frame_url || h.inputs?.video);

async function sendToKie(item) {
  if (item.model !== 'upscale' && item.model !== 'extend' && item.uploadedAt && Date.now() - item.uploadedAt > UPLOAD_TTL && hasUploads(item)) {
    item.state = 'failed';
    item.error = 'Los archivos que subiste ya expiraron en Kie (duran 24 h). Usa «Crear otra versión» y vuelve a subirlos.';
    return changed(item);
  }
  item.state = 'sending';
  item.note = '';
  changed(item);
  emitQueue();
  try {
    const data = await kie('/api/v1/jobs/createTask', { method: 'POST', body: item.request });
    item.taskId = data.taskId;
    item.state = 'pending';
    item.sentAt = Date.now();
    item.retryAt = 0;
    changed(item);
    refreshCreditsSoon();
    emitSpending();
  } catch (err) {
    if (err.network || err.code === 429 || err.code === 455 || err.code === 500) {
      item.state = 'queued';
      item.retries = (item.retries || 0) + 1;
      item.retryAt = Date.now() + Math.min(60000, 8000 * item.retries);
      item.note = err.code === 429 ? 'Kie está ocupado; lo reintento en unos segundos' : err.network ? 'Sin conexión; lo reintento en unos segundos' : 'Kie tuvo un problema; lo reintento en unos segundos';
      changed(item);
    } else if (err.code === 402 || (err.code === 401 && !(await keyWorks()))) {
      item.state = 'queued';
      changed(item);
      pauseQueue(err.code === 402 ? 'Te quedaste sin créditos. Recarga en kie.ai y reanuda la cola.' : 'Tu llave de Kie no funciona. Revísala en Tu cuenta y reanuda la cola.');
    } else {
      item.state = 'failed';
      item.error = err.message;
      changed(item);
    }
  }
  emitQueue();
}

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
          if (d.creditsConsumed != null) item.credits = d.creditsConsumed;
          item.costTime = d.costTime;
          item.completedAt = Date.now();
          if (item.videoUrl) downloadVideo(item);
          else { item.state = 'failed'; item.error = 'Kie terminó pero no devolvió el video.'; changed(item); }
          refreshCreditsSoon(); emitQueue(); emitSpending();
        } else if (d.state === 'fail') {
          item.state = 'failed';
          item.error = traducirFallo(d.failMsg, d.failCode);
          item.completedAt = Date.now();
          changed(item);
          refreshCreditsSoon(); emitQueue(); emitSpending();
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
const safeName = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
async function downloadVideo(item) {
  item.state = 'downloading';
  changed(item);
  const suffix = item.model === 'upscale' ? `-mejorado-${item.settings.resolution}` : item.model === 'extend' ? '-continuacion' : '';
  const file = `${safeName(item.prompt).slice(0, 40) || 'video'}${suffix}-${(item.taskId || item.id).slice(-8)}.mp4`;
  try {
    const res = await fetch(item.videoUrl, { signal: AbortSignal.timeout(300000) });
    if (!res.ok || !res.body) throw new Error();
    const tmp = path.join(VIDEOS_DIR, file + '.part');
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
    await fsp.rename(tmp, path.join(VIDEOS_DIR, file));
    item.localFile = file;
    item.fileSize = (await fsp.stat(path.join(VIDEOS_DIR, file))).size;
  } catch {
    // Si la descarga falla, el video sigue disponible en Kie (14 días).
  }
  item.state = 'done';
  changed(item);
}

for (const h of history) if (h.state === 'downloading') downloadVideo(h);
setInterval(processQueue, 2000);
setInterval(pollPending, 4000);
pollPending();
refreshCredits();

// ---------- Mejorar la descripción con IA ----------
async function improvePrompt({ prompt, mode, characters: names = [], duration }) {
  const text = String(prompt || '').trim();
  if (!text) throw new Error('Escribe primero una idea, aunque sea corta.');
  if (mode === 'style') {
    const system = 'Eres director de fotografía. A partir del texto del usuario, escribe SOLO un ESTILO VISUAL reutilizable para videos de IA, en el MISMO idioma del usuario: paleta de colores, iluminación, tipo de lente y cámara, movimiento de cámara, textura o grano, época y ambiente. No incluyas personajes, lugares concretos ni acciones. Máximo 50 palabras, una sola frase descriptiva, sin comillas ni explicaciones.';
    const json = await kie(CHAT_MODEL_PATH, { method: 'POST', raw: true, body: { messages: [{ role: 'system', content: [{ type: 'text', text: system }] }, { role: 'user', content: [{ type: 'text', text }] }], stream: false } });
    const out = String(json.choices?.[0]?.message?.content || '').trim().replace(/^["“]|["”]$/g, '');
    if (!out) throw new Error('La IA no devolvió un estilo. Intenta de nuevo.');
    refreshCreditsSoon();
    return { prompt: out, credits: json.credits_consumed ?? null };
  }
  const modeHint = {
    text: 'El video se crea solo a partir del texto.',
    images: 'El usuario adjunta imágenes de referencia; menciónalas como "la persona/el producto de la imagen" sin inventar su aspecto.',
    frames: 'El usuario da el primer cuadro (y quizás el último); describe el movimiento y lo que ocurre entre ellos, sin redescribir la imagen.',
    video: 'El usuario adjunta un video; describe cómo transformarlo o continuarlo.',
    extend: 'Es la continuación de un video ya existente; describe solo lo que pasa a continuación.',
  }[mode] || '';
  const system = [
    'Eres un director de fotografía que escribe descripciones para un generador de video con IA (Gemini Omni).',
    'Reescribe la idea del usuario como UNA descripción de video clara y visual, en el MISMO idioma que usó el usuario.',
    'Incluye: sujeto y acción, lugar, iluminación, estilo visual, movimiento de cámara y ambiente. Si hay diálogo, ponlo entre comillas.',
    `El video dura unos ${duration || 8} segundos: describe una sola escena realista para ese tiempo.`,
    modeHint,
    names.length ? `Usa estos personajes por su nombre: ${names.join(', ')}.` : '',
    'No inventes marcas ni personas reales. Máximo 90 palabras. Responde SOLO con la descripción, sin comillas, títulos ni explicaciones.',
  ].filter(Boolean).join(' ');
  const json = await kie(CHAT_MODEL_PATH, {
    method: 'POST', raw: true,
    body: { messages: [{ role: 'system', content: [{ type: 'text', text: system }] }, { role: 'user', content: [{ type: 'text', text }] }], stream: false },
  });
  const out = String(json.choices?.[0]?.message?.content || '').trim().replace(/^["“]|["”]$/g, '');
  if (!out) throw new Error('La IA no devolvió una descripción. Intenta de nuevo.');
  refreshCreditsSoon();
  return { prompt: out, credits: json.credits_consumed ?? null };
}

// ---------- Personajes y voces ----------
async function createCharacter(b) {
  const name = String(b.name || '').trim().slice(0, 60);
  const description = String(b.description || '').trim();
  if (!name) throw new Error('Ponle un nombre a tu personaje.');
  if (!description) throw new Error('Describe a tu personaje (cómo es, cómo se viste, su personalidad).');
  if (!b.portraitUrl) throw new Error('Sube una foto de la cara del personaje.');
  let audioId;
  if (b.voice) {
    const a = await kie('/api/v1/omni/audio/create', {
      method: 'POST',
      body: { audio_id: b.voice, name: `${name} (voz)`.slice(0, 200), ...(b.voiceDescription ? { voice_description: String(b.voiceDescription).slice(0, 2000) } : {}) },
    });
    audioId = a.audioId;
  }
  const image_urls = [b.portraitUrl, ...(b.bodyUrl ? [b.bodyUrl] : [])];
  const c = await kie('/api/v1/omni/character/create', {
    method: 'POST',
    body: { descriptions: description, image_urls, character_name: name, ...(audioId ? { audio_ids: [audioId] } : {}) },
  });
  const ch = {
    id: c.characterId, name, description, voice: b.voice || '', voiceDescription: b.voiceDescription || '', audioId: audioId || '',
    preview: b.preview || '', hasBody: !!b.bodyUrl, createdAt: Date.now(),
  };
  characters.unshift(ch);
  saveCharacters();
  emit('characters', characters);
  return ch;
}

// ---------- Acceso desde el celular ----------
function lanIp() {
  const all = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal);
  return (all.find((i) => /^192\.168\./.test(i.address)) || all.find((i) => /^10\./.test(i.address)) || all[0])?.address || '';
}
const lanInfo = () => {
  const ip = lanIp();
  return { enabled: settings.lan.enabled, ip, url: settings.lan.enabled && ip ? `http://${ip}:${PORT}/?t=${settings.lan.token}` : '' };
};
const isLocal = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const cookieToken = (req) => (req.headers.cookie || '').match(/(?:^|;\s*)ofs_t=([a-f0-9]+)/)?.[1];

// ---------- Editor: unir escenas en un episodio (con FFmpeg) ----------
let ffmpegBin = null, ffprobeBin = null, ffLastCheck = 0;
const runOk = (bin, args) => new Promise((r) => execFile(bin, args, { windowsHide: true, timeout: 10000 }, (e) => r(!e)));
async function findFfmpeg() {
  if (ffmpegBin) return ffmpegBin;
  if (Date.now() - ffLastCheck < 15000) return null;
  ffLastCheck = Date.now();
  const exe = process.platform === 'win32' ? '.exe' : '';
  const cands = [process.env.FFMPEG_PATH, env.FFMPEG_PATH, 'ffmpeg'].filter(Boolean);
  if (process.platform === 'win32') {
    const la = process.env.LOCALAPPDATA || '';
    cands.push(path.join(la, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'));
    const pk = path.join(la, 'Microsoft', 'WinGet', 'Packages');
    try {
      for (const d of fs.readdirSync(pk).filter((n) => /ffmpeg/i.test(n))) {
        for (const sub of fs.readdirSync(path.join(pk, d))) cands.push(path.join(pk, d, sub, 'bin', 'ffmpeg.exe'));
      }
    } catch {}
    cands.push('C:\\ffmpeg\\bin\\ffmpeg.exe', path.join(process.env.ProgramFiles || 'C:\\Program Files', 'ffmpeg', 'bin', 'ffmpeg.exe'));
  } else cands.push('/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg');
  for (const c of cands) {
    if (await runOk(c, ['-version'])) {
      ffmpegBin = c;
      ffprobeBin = c === 'ffmpeg' ? 'ffprobe' : path.join(path.dirname(c), 'ffprobe' + exe);
      console.log(`  🎞  FFmpeg listo para el editor: ${c}`);
      return c;
    }
  }
  return null;
}
function probe(file) {
  return new Promise((resolve) => {
    if (!ffprobeBin) return resolve({ duration: 0, hasAudio: true });
    execFile(ffprobeBin, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', file], { windowsHide: true, timeout: 15000 }, (err, out) => {
      try {
        const j = JSON.parse(out);
        resolve({ duration: Number(j.format?.duration) || 0, hasAudio: (j.streams || []).some((x) => x.codec_type === 'audio') });
      } catch { resolve({ duration: 0, hasAudio: true }); }
    });
  });
}
findFfmpeg();

const emitEdit = (e) => emit('edit', e);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const round2 = (n) => Math.round(n * 100) / 100;
function sanitizeEdit(e, b) {
  if (b.name !== undefined) e.name = String(b.name || '').trim().slice(0, 60) || 'Episodio';
  if (b.project !== undefined) e.project = String(b.project || '').slice(0, 40);
  if (b.ratio !== undefined) e.ratio = b.ratio === '9:16' ? '9:16' : '16:9';
  if (b.quality !== undefined) e.quality = ['auto', '720p', '1080p'].includes(b.quality) ? b.quality : 'auto';
  if (b.transition !== undefined) e.transition = b.transition === 'fade' ? 'fade' : 'cut';
  if (b.clipVolume !== undefined) e.clipVolume = clamp(Number(b.clipVolume) || 0, 0, 1);
  if (b.musicVolume !== undefined && e.music) e.music.volume = clamp(Number(b.musicVolume) || 0, 0, 1);
  if (Array.isArray(b.clips)) {
    e.clips = b.clips.slice(0, 80).filter((c) => history.some((h) => h.id === c.itemId)).map((c) => {
      const inn = Math.max(0, round2(Number(c.in) || 0));
      const out = c.out == null ? null : Math.max(inn + 0.3, round2(Number(c.out) || 0));
      return { key: String(c.key || crypto.randomBytes(4).toString('hex')).slice(0, 20), itemId: c.itemId, in: inn, out };
    });
  }
  e.updatedAt = Date.now();
  return e;
}
let renderBusy = false;

async function renderEdit(edit) {
  if (renderBusy) throw new Error('Ya se está exportando otro episodio. Espera a que termine.');
  renderBusy = true;
  edit.render = { state: 'working', pct: 0, file: edit.render?.file, itemId: edit.render?.itemId };
  emitEdit(edit);
  try {
    const ff = await findFfmpeg();
    if (!ff) throw new Error('Para exportar necesitas FFmpeg (es gratis). Mira cómo instalarlo en el editor.');
    const clips = edit.clips.map((c) => ({ ...c, item: history.find((h) => h.id === c.itemId) })).filter((c) => c.item?.localFile);
    if (!clips.length) throw new Error('Añade al menos un clip guardado en tu PC.');
    for (const c of clips) {
      c.file = path.join(VIDEOS_DIR, c.item.localFile);
      c.info = await probe(c.file);
      const D = c.info.duration || Number(c.item.settings?.duration) || 5;
      c.in = clamp(c.in || 0, 0, Math.max(0, D - 0.3));
      c.out = clamp(c.out == null ? D : c.out, c.in + 0.3, D);
      c.len = round2(c.out - c.in);
    }
    const vertical = edit.ratio === '9:16';
    const hiRes = ['1080p', '4k', '1080P', '2K', '4K'];
    const hi = edit.quality === '1080p' || (edit.quality !== '720p' && clips.some((c) => hiRes.includes(c.item.settings?.resolution)));
    const [W, H] = hi ? (vertical ? [1080, 1920] : [1920, 1080]) : (vertical ? [720, 1280] : [1280, 720]);
    const F = edit.transition === 'fade' && clips.length > 1 ? round2(Math.min(0.6, ...clips.map((c) => c.len / 2.5))) : 0;
    const total = clips.reduce((a, c) => a + c.len, 0) - F * (clips.length - 1);
    const vol = clamp(edit.clipVolume ?? 1, 0, 1);

    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-nostats', '-progress', 'pipe:1'];
    for (const c of clips) args.push('-ss', c.in.toFixed(3), '-t', c.len.toFixed(3), '-i', c.file);
    const music = edit.music && fs.existsSync(path.join(MUSIC_DIR, edit.music.file)) ? edit.music : null;
    if (music) args.push('-stream_loop', '-1', '-i', path.join(MUSIC_DIR, music.file));

    const f = [];
    clips.forEach((c, i) => {
      const L = c.len.toFixed(3);
      f.push(`[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30,format=yuv420p,trim=duration=${L},setpts=PTS-STARTPTS[v${i}]`);
      if (c.info.hasAudio) f.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=duration=${L},asetpts=PTS-STARTPTS,apad,atrim=duration=${L},volume=${vol}[a${i}]`);
      else f.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${L}[a${i}]`);
    });
    if (clips.length === 1) f.push('[v0]null[vj]', '[a0]anull[aj]');
    else if (!F) f.push(`${clips.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${clips.length}:v=1:a=1[vj][aj]`);
    else {
      let off = clips[0].len - F, pv = 'v0', pa = 'a0';
      for (let i = 1; i < clips.length; i++) {
        const last = i === clips.length - 1;
        const nv = last ? 'vj' : `xv${i}`, na = last ? 'aj' : `xa${i}`;
        f.push(`[${pv}][v${i}]xfade=transition=fade:duration=${F}:offset=${off.toFixed(3)}[${nv}]`);
        f.push(`[${pa}][a${i}]acrossfade=d=${F}:c1=tri:c2=tri[${na}]`);
        off += clips[i].len - F; pv = nv; pa = na;
      }
    }
    let aOut = 'aj';
    if (music) {
      const mv = clamp(music.volume ?? 0.35, 0, 1);
      const fo = Math.min(2, total / 3);
      f.push(`[${clips.length}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=duration=${total.toFixed(3)},asetpts=PTS-STARTPTS,volume=${mv},afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, total - fo).toFixed(3)}:d=${fo.toFixed(3)}[mus]`);
      f.push('[aj][mus]amix=inputs=2:duration=first:normalize=0[am]');
      aOut = 'am';
    }
    const base = `episodio-${safeName(edit.name).slice(0, 40) || 'sin-nombre'}-${edit.id.slice(-6)}`;
    const file = `${base}-${Date.now().toString(36)}.mp4`;
    const tmp = path.join(VIDEOS_DIR, `${base}.tmp.mp4`);
    args.push('-filter_complex', f.join(';'), '-map', '[vj]', '-map', `[${aOut}]`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', total.toFixed(3), tmp);

    await new Promise((resolve, reject) => {
      const child = spawn(ff, args, { windowsHide: true });
      let errTxt = '', lastEmit = 0;
      child.stdout.on('data', (d) => {
        const m = String(d).match(/out_time_us=(\d+)/g);
        if (!m) return;
        const us = Number(m.at(-1).split('=')[1]);
        edit.render.pct = clamp(Math.round((us / 1e6 / total) * 100), 0, 99);
        if (Date.now() - lastEmit > 400) { lastEmit = Date.now(); emitEdit(edit); }
      });
      child.stderr.on('data', (d) => { errTxt = (errTxt + d).slice(-2000); });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) return resolve();
        console.log(`[Editor] FFmpeg falló (${code}):\n${errTxt}`);
        reject(new Error('FFmpeg no pudo armar el episodio. Revisa la ventana negra para ver el detalle.'));
      });
    });

    await fsp.rename(tmp, path.join(VIDEOS_DIR, file));
    const size = (await fsp.stat(path.join(VIDEOS_DIR, file))).size;
    // El episodio aparece en la galería como un video más (se reemplaza la exportación anterior)
    let item = history.find((h) => h.id === edit.render?.itemId);
    if (item?.localFile && item.localFile !== file) await fsp.rm(path.join(VIDEOS_DIR, item.localFile), { force: true });
    const pv = clips[0].item.previews || {};
    const fields = {
      state: 'done', mode: 'edit', model: 'edit', kind: 'edit', prompt: edit.name,
      settings: { duration: round1(total), aspect_ratio: edit.ratio, resolution: hi ? '1080p' : '720p' },
      previews: { first: pv.first || pv.video || pv.images?.[0] || '' },
      credits: 0, project: edit.project || '', localFile: file, fileSize: size, editId: edit.id,
      clipsCount: clips.length, completedAt: Date.now(), inputs: {},
    };
    if (item) Object.assign(item, fields);
    else {
      item = { id: 'v_' + crypto.randomBytes(6).toString('hex'), createdAt: Date.now(), ...fields };
      history.push(item);
    }
    changed(item);
    edit.render = { state: 'done', pct: 100, file, itemId: item.id, at: Date.now() };
  } catch (err) {
    edit.render = { state: 'failed', error: err.message, itemId: edit.render?.itemId };
    throw err;
  } finally {
    renderBusy = false;
    saveEdits();
    emitEdit(edit);
  }
}

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
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
  const media = type === 'video/mp4' || type.startsWith('audio/');
  if (range && media) {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = Number(s) || 0;
    const end = e ? Math.min(Number(e), stat.size - 1) : stat.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': 'no-cache', 'Accept-Ranges': media ? 'bytes' : 'none' });
  fs.createReadStream(filePath).pipe(res);
}
function findItem(id) {
  const item = history.find((h) => h.id === id);
  if (!item) throw Object.assign(new Error('Ese video ya no existe.'), { status: 404 });
  return item;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  // Desde otro dispositivo solo se entra con el enlace secreto
  if (!isLocal(req)) {
    const t = url.searchParams.get('t');
    if (!settings.lan.enabled) return send(res, 403, { error: 'El acceso desde otros dispositivos está apagado.' });
    if (t === settings.lan.token) {
      res.writeHead(302, { 'Set-Cookie': `ofs_t=${t}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`, Location: '/' });
      return res.end();
    }
    if (cookieToken(req) !== settings.lan.token) {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<meta name="viewport" content="width=device-width"><body style="font-family:sans-serif;background:#0a0a10;color:#eee;padding:40px;text-align:center"><h2>Escanea el código QR</h2><p>Abre OmniFlash Studio en tu computadora → Tu cuenta → Usar desde el celular, y escanea el código.</p></body>');
    }
  }

  try {
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`event: hello\ndata: ${JSON.stringify({ queue: queueState(), credits, spending: spending(), characters })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // Cuenta
    if (p === '/api/config' && req.method === 'GET') {
      const k = apiKey();
      return send(res, 200, { hasKey: !!k, keyHint: k ? `••••${k.slice(-4)}` : '', prices: PRICES, isLocal: isLocal(req) });
    }
    if (p === '/api/config' && req.method === 'POST') {
      if (!isLocal(req)) return send(res, 403, { error: 'La llave solo se puede cambiar desde la computadora.' });
      const { apiKey: key } = await readJson(req);
      const clean = String(key || '').trim();
      if (!/^[A-Za-z0-9_\-]{16,}$/.test(clean)) return send(res, 400, { error: 'Esa llave no parece válida. Cópiala completa desde kie.ai/api-key.' });
      const prev = process.env.KIE_API_KEY;
      process.env.KIE_API_KEY = clean;
      try {
        credits = await kie('/api/v1/chat/credit');
        await saveApiKey(clean);
        if (settings.paused && /llave/i.test(settings.pauseReason)) { settings.paused = false; settings.pauseReason = ''; saveSettings(); emitQueue(); }
        emit('credits', { credits });
        return send(res, 200, { ok: true, credits });
      } catch (err) {
        if (prev) process.env.KIE_API_KEY = prev; else delete process.env.KIE_API_KEY;
        return send(res, 400, { error: err.code === 401 ? 'Kie no reconoce esa llave. Cópiala completa desde kie.ai/api-key.' : err.message });
      }
    }
    if (p === '/api/credits' && req.method === 'GET') {
      credits = await kie('/api/v1/chat/credit');
      emit('credits', { credits });
      return send(res, 200, { credits });
    }
    if (p === '/api/spending' && req.method === 'GET') return send(res, 200, spending());
    if (p === '/api/settings' && req.method === 'POST') {
      const b = await readJson(req);
      if (b.dailyLimit !== undefined) {
        settings.dailyLimit = Math.max(0, Math.floor(Number(b.dailyLimit) || 0));
        if (settings.paused && /límite/i.test(settings.pauseReason)) { settings.paused = false; settings.pauseReason = ''; }
      }
      saveSettings(); emitQueue(); emitSpending();
      setTimeout(processQueue, 50);
      return send(res, 200, { ok: true, dailyLimit: settings.dailyLimit });
    }

    // Celular
    if (p === '/api/lan' && req.method === 'GET') return send(res, 200, lanInfo());
    if (p === '/api/lan' && req.method === 'POST') {
      if (!isLocal(req)) return send(res, 403, { error: 'Esto solo se cambia desde la computadora.' });
      const b = await readJson(req);
      if (b.newToken) settings.lan.token = crypto.randomBytes(12).toString('hex');
      if (b.enabled !== undefined) settings.lan.enabled = !!b.enabled;
      saveSettings();
      send(res, 200, lanInfo());
      setTimeout(relisten, 100);
      return;
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

    // IA para la descripción
    if (p === '/api/improve-prompt' && req.method === 'POST') return send(res, 200, await improvePrompt(await readJson(req)));

    // Personajes
    if (p === '/api/characters' && req.method === 'GET') return send(res, 200, characters);
    if (p === '/api/characters' && req.method === 'POST') return send(res, 200, await createCharacter(await readJson(req)));
    const mc = p.match(/^\/api\/characters\/([\w\-]+)$/);
    if (mc && req.method === 'DELETE') {
      characters = characters.filter((c) => c.id !== mc[1]);
      saveCharacters();
      emit('characters', characters);
      return send(res, 200, { ok: true });
    }

    // Recetas
    if (p === '/api/recipes' && req.method === 'GET') return send(res, 200, recipes);
    if (p === '/api/recipes' && req.method === 'POST') {
      const b = await readJson(req);
      const name = String(b.name || '').trim().slice(0, 60);
      if (!name) throw new Error('Ponle un nombre a la receta.');
      const r = { id: 'r_' + crypto.randomBytes(5).toString('hex'), name, createdAt: Date.now(), data: b.data || {} };
      recipes.unshift(r);
      saveRecipes();
      emit('recipes', recipes);
      return send(res, 200, r);
    }
    const mr = p.match(/^\/api\/recipes\/([\w\-]+)$/);
    if (mr && req.method === 'DELETE') {
      recipes = recipes.filter((r) => r.id !== mr[1]);
      saveRecipes();
      emit('recipes', recipes);
      return send(res, 200, { ok: true });
    }

    // Estilos guardados
    if (p === '/api/styles' && req.method === 'GET') return send(res, 200, styles);
    if (p === '/api/styles' && req.method === 'POST') {
      const b = await readJson(req);
      const name = String(b.name || '').trim().slice(0, 40);
      const text = String(b.text || '').trim().slice(0, 2000);
      if (!name) throw new Error('Ponle un nombre al estilo.');
      if (!text) throw new Error('Describe el estilo (colores, luz, cámara, ambiente).');
      let st = b.id && styles.find((x) => x.id === b.id);
      if (st) Object.assign(st, { name, text, exampleId: b.exampleId ?? st.exampleId });
      else { st = { id: 's_' + crypto.randomBytes(5).toString('hex'), name, text, exampleId: b.exampleId || '', createdAt: Date.now() }; styles.unshift(st); }
      saveStyles();
      emit('styles', styles);
      return send(res, 200, st);
    }
    const mst = p.match(/^\/api\/styles\/([\w\-]+)$/);
    if (mst && req.method === 'DELETE') {
      styles = styles.filter((x) => x.id !== mst[1]);
      for (const k of Object.keys(settings.bibles)) if (settings.bibles[k].styleId === mst[1]) settings.bibles[k].styleId = '';
      saveStyles(); saveSettings();
      emit('styles', styles); emit('bibles', settings.bibles);
      return send(res, 200, { ok: true });
    }

    // Biblia de un proyecto (su «system prompt»)
    const mb = p.match(/^\/api\/projects\/(.+)\/bible$/);
    if (mb && req.method === 'POST') {
      const name = decodeURIComponent(mb[1]);
      if (!settings.projects.includes(name)) throw new Error('Ese proyecto no existe.');
      const b = await readJson(req);
      const clip = (v, n) => String(v || '').trim().slice(0, n);
      settings.bibles[name] = {
        style: clip(b.style, 3000), avoid: clip(b.avoid, 1000), styleId: clip(b.styleId, 40),
        chars: Array.isArray(b.chars) ? b.chars.slice(0, 3).map(String) : [],
        seed: b.seed === '' || b.seed == null ? '' : Math.abs(Math.floor(Number(b.seed))) || '',
        defaults: b.defaults && typeof b.defaults === 'object' ? {
          model: ['1.1', '1.2'].includes(b.defaults.model) ? b.defaults.model : undefined,
          ratio: ['16:9', '9:16'].includes(b.defaults.ratio) ? b.defaults.ratio : undefined,
          resolution: ['360p', '720p', '1080p', '4k'].includes(b.defaults.resolution) ? b.defaults.resolution : undefined,
        } : null,
      };
      saveSettings();
      emit('bibles', settings.bibles);
      return send(res, 200, settings.bibles[name]);
    }

    // Proyectos
    if (p === '/api/projects' && req.method === 'POST') {
      const b = await readJson(req);
      const name = String(b.name || '').trim().slice(0, 40);
      if (!name) throw new Error('Ponle un nombre al proyecto.');
      if (!settings.projects.includes(name)) settings.projects.push(name);
      saveSettings();
      emit('projects', settings.projects);
      return send(res, 200, settings.projects);
    }
    const mp = p.match(/^\/api\/projects\/(.+)$/);
    if (mp && req.method === 'DELETE') {
      const name = decodeURIComponent(mp[1]);
      settings.projects = settings.projects.filter((x) => x !== name);
      delete settings.bibles[name];
      emit('bibles', settings.bibles);
      for (const h of history) if (h.project === name) { h.project = ''; changed(h); }
      saveSettings();
      emit('projects', settings.projects);
      return send(res, 200, settings.projects);
    }

    // Poner videos en la cola
    if (p === '/api/generate' && req.method === 'POST') {
      const b = await readJson(req);
      const count = Math.min(4, Math.max(1, Math.floor(Number(b.count) || 1)));
      const batchId = count > 1 ? 'b_' + crypto.randomBytes(4).toString('hex') : null;
      const items = [];
      for (let i = 0; i < count; i++) {
        const built = buildRequest({ ...b, seed: i > 0 && b.seed !== '' && b.seed != null ? Number(b.seed) + i : i > 0 ? '' : b.seed });
        const it = newItem({ ...built, mode: b.mode, prompt: built.request.input.prompt, previews: b.previews, uploadedAt: Number(b.uploadedAt) || Date.now(), project: b.project, extra: { ...(batchId ? { batch: { id: batchId, n: i + 1, of: count } } : {}), userPrompt: String(b.userPrompt || '').trim() || undefined, styleName: b.styleName || undefined, fromId: b.fromId || undefined } });
        it.createdAt += i;
        items.push(it);
      }
      enqueue(items);
      return send(res, 200, { items: items.map(publicItem) });
    }

    // Historial
    if (p === '/api/history' && req.method === 'GET') {
      return send(res, 200, { items: history.map(publicItem), queue: queueState(), credits, projects: settings.projects, bibles: settings.bibles, styles, recipes, characters, spending: spending() });
    }
    const m = p.match(/^\/api\/history\/([\w\-]+)(?:\/(retry|extend|upscale|remake))?$/);
    if (m) {
      const item = findItem(m[1]);
      const action = m[2];
      if (action === 'retry' && req.method === 'POST') {
        if (!item.request) return send(res, 400, { error: 'Este video es de una versión anterior; usa «Crear otra versión».' });
        const copy = newItem({ ...item, request: item.request, extra: { parentId: item.parentId, kind: item.kind } });
        enqueue([copy]);
        return send(res, 200, { item: publicItem(copy) });
      }
      if (action === 'remake' && req.method === 'POST') {
        // Volver a crear la misma idea con más calidad (misma semilla → resultado parecido)
        const b = await readJson(req);
        if (!item.request || !['1.1', '1.2'].includes(item.model)) return send(res, 400, { error: 'Este video no se puede recrear.' });
        const resolution = RESOLUTIONS.includes(b.resolution) ? b.resolution : '1080p';
        const request = JSON.parse(JSON.stringify(item.request));
        request.input.resolution = resolution;
        const vs = item.mode === 'video' ? Number(item.settings.duration) : 0;
        const copy = newItem({
          ...item, request, settings: { ...item.settings, resolution },
          credits: estimateCredits({ model: item.model, resolution, duration: item.settings.duration, videoSeconds: vs }),
          extra: { parentId: item.id, kind: 'remake' },
        });
        enqueue([copy]);
        return send(res, 200, { item: publicItem(copy) });
      }
      if (action === 'extend' && req.method === 'POST') {
        const b = await readJson(req);
        if (!['1.2', 'extend'].includes(item.model)) return send(res, 400, { error: 'Solo se pueden continuar videos hechos con el modelo 1.2.' });
        if (item.state !== 'done' || !item.taskId) return send(res, 400, { error: 'El video tiene que estar terminado.' });
        if (!['360p', '720p'].includes(item.settings.resolution)) return send(res, 400, { error: 'Kie solo continúa videos en 360p o 720p.' });
        if (Number(item.settings.duration) > 15) return send(res, 400, { error: 'Este video ya dura más de 15 s; Kie no puede alargarlo más.' });
        if (Date.now() - (item.completedAt || item.createdAt) > RESULT_TTL) return send(res, 400, { error: 'Este video ya expiró en Kie (14 días) y no se puede continuar.' });
        const prompt = String(b.prompt || '').trim();
        if (!prompt) return send(res, 400, { error: 'Escribe qué pasa a continuación.' });
        const duration = Math.min(10, Math.max(3, Math.round(Number(b.duration) || 5)));
        const images = (b.image_urls || []).filter(Boolean).slice(0, 3);
        const input = { task_id: item.taskId, prompt, duration, ...(images.length ? { image_urls: images } : {}) };
        const res2 = item.settings.resolution;
        const copy = newItem({
          mode: 'extend', model: 'extend', prompt, request: { model: MODELS.extend, input },
          settings: { duration: Number(item.settings.duration) + duration, aspect_ratio: item.settings.aspect_ratio, resolution: res2 },
          credits: estimateCredits({ model: 'extend', resolution: res2, duration }),
          previews: item.previews, project: item.project,
          extra: { parentId: item.id, kind: 'extend', addedSeconds: duration, estimateOnly: true, userPrompt: String(b.userPrompt || '').trim() || undefined },
        });
        enqueue([copy]);
        return send(res, 200, { item: publicItem(copy) });
      }
      if (action === 'upscale' && req.method === 'POST') {
        const b = await readJson(req);
        if (item.state !== 'done' || !item.videoUrl) return send(res, 400, { error: 'El video tiene que estar terminado.' });
        if (Date.now() - (item.completedAt || item.createdAt) > RESULT_TTL) return send(res, 400, { error: 'Este video ya expiró en Kie (14 días) y no se puede mejorar.' });
        if (item.fileSize && item.fileSize > 50 * 1024 * 1024) return send(res, 400, { error: 'El video pesa más de 50 MB; Kie no puede mejorarlo.' });
        const resolution = ['1080P', '2K', '4K'].includes(b.resolution) ? b.resolution : '2K';
        const copy = newItem({
          mode: 'upscale', model: 'upscale', prompt: item.prompt, request: { model: MODELS.upscale, input: { video_url: item.videoUrl, resolution } },
          settings: { duration: item.settings.duration, aspect_ratio: item.settings.aspect_ratio, resolution },
          credits: 0, previews: item.previews, project: item.project,
          extra: { parentId: item.id, kind: 'upscale', unknownPrice: true },
        });
        enqueue([copy]);
        return send(res, 200, { item: publicItem(copy) });
      }
      if (!action && req.method === 'PATCH') {
        const b = await readJson(req);
        if (b.favorite !== undefined) item.favorite = !!b.favorite;
        if (b.project !== undefined) item.project = String(b.project || '').slice(0, 40);
        changed(item);
        return send(res, 200, { item: publicItem(item) });
      }
      if (!action && req.method === 'DELETE') {
        if (isActive(item)) return send(res, 409, { error: 'Este video ya se está creando en Kie y no se puede cancelar. Podrás borrarlo cuando termine.' });
        history.splice(history.indexOf(item), 1);
        if (item.localFile) await fsp.rm(path.join(VIDEOS_DIR, item.localFile), { force: true });
        saveHistory();
        emit('remove', { id: item.id });
        emitQueue(); emitSpending();
        return send(res, 200, { ok: true });
      }
    }

    // Editor
    if (p === '/api/edits' && req.method === 'GET') return send(res, 200, { edits, ffmpeg: !!(await findFfmpeg()) });
    if (p === '/api/edits' && req.method === 'POST') {
      const b = await readJson(req);
      const e = sanitizeEdit({ id: 'e_' + crypto.randomBytes(5).toString('hex'), createdAt: Date.now(), name: 'Episodio', project: '', ratio: '16:9', quality: 'auto', transition: 'fade', clipVolume: 1, music: null, clips: [], render: null }, b);
      edits.push(e); saveEdits(); emitEdit(e);
      return send(res, 200, { edit: e });
    }
    const em = p.match(/^\/api\/edits\/(e_[a-f0-9]+)(?:\/(music|render))?$/);
    if (em) {
      const e = edits.find((x) => x.id === em[1]);
      if (!e) return send(res, 404, { error: 'Ese episodio ya no existe.' });
      const action = em[2];
      if (!action && req.method === 'PUT') { sanitizeEdit(e, await readJson(req)); saveEdits(); emitEdit(e); return send(res, 200, { edit: e }); }
      if (!action && req.method === 'DELETE') {
        if (e.render?.state === 'working') return send(res, 409, { error: 'Espera a que termine de exportarse.' });
        edits.splice(edits.indexOf(e), 1);
        if (e.music) await fsp.rm(path.join(MUSIC_DIR, e.music.file), { force: true });
        saveEdits(); emit('edit-remove', { id: e.id });
        return send(res, 200, { ok: true });
      }
      if (action === 'music' && req.method === 'POST') {
        const name = decodeURIComponent(String(req.headers['x-filename'] || 'musica.mp3')).slice(0, 80);
        const ext = (path.extname(name).toLowerCase().match(/^\.(mp3|m4a|aac|wav|ogg|flac)$/) || ['.mp3'])[0];
        const buf = await readBody(req, 60 * 1024 * 1024);
        if (!buf.length) return send(res, 400, { error: 'El archivo de música está vacío.' });
        const file = `m_${crypto.randomBytes(6).toString('hex')}${ext}`;
        await fsp.writeFile(path.join(MUSIC_DIR, file), buf);
        if (e.music) await fsp.rm(path.join(MUSIC_DIR, e.music.file), { force: true });
        await findFfmpeg();
        const info = await probe(path.join(MUSIC_DIR, file));
        e.music = { file, name: name.replace(/\.[^.]+$/, ''), volume: e.music?.volume ?? 0.35, duration: round2(info.duration) };
        e.updatedAt = Date.now(); saveEdits(); emitEdit(e);
        return send(res, 200, { edit: e });
      }
      if (action === 'music' && req.method === 'DELETE') {
        if (e.music) await fsp.rm(path.join(MUSIC_DIR, e.music.file), { force: true });
        e.music = null; e.updatedAt = Date.now(); saveEdits(); emitEdit(e);
        return send(res, 200, { edit: e });
      }
      if (action === 'render' && req.method === 'POST') {
        if (!(await findFfmpeg())) return send(res, 400, { error: 'Para exportar necesitas FFmpeg (es gratis). Mira cómo instalarlo en el editor.', code: 'NO_FFMPEG' });
        if (renderBusy) return send(res, 409, { error: 'Ya se está exportando otro episodio. Espera a que termine.' });
        if (!e.clips.length) return send(res, 400, { error: 'Añade al menos un clip.' });
        renderEdit(e).catch(() => {});
        return send(res, 200, { edit: e });
      }
    }

    // Ajustes de la cola
    if (p === '/api/queue' && req.method === 'POST') {
      const b = await readJson(req);
      if (b.maxConcurrent !== undefined) settings.maxConcurrent = Math.min(4, Math.max(1, Math.floor(Number(b.maxConcurrent) || 1)));
      if (b.paused !== undefined) { settings.paused = !!b.paused; if (!settings.paused) settings.pauseReason = ''; }
      for (const h of history) if (h.state === 'queued') h.retryAt = 0;
      saveSettings(); emitQueue();
      setTimeout(processQueue, 50);
      return send(res, 200, queueState());
    }

    if (p === '/api/open-folder' && req.method === 'POST') {
      if (!isLocal(req)) return send(res, 403, { error: 'La carpeta solo se abre en la computadora.' });
      const cmd = process.platform === 'win32' ? `explorer "${VIDEOS_DIR}"` : process.platform === 'darwin' ? `open "${VIDEOS_DIR}"` : `xdg-open "${VIDEOS_DIR}"`;
      exec(cmd);
      return send(res, 200, { ok: true });
    }

    if (p.startsWith('/api/')) return send(res, 404, { error: 'No encontrado' });
    if (p.startsWith('/videos/')) return serveStatic(req, res, VIDEOS_DIR, decodeURIComponent(p.slice(8)));
    if (p.startsWith('/music/')) return serveStatic(req, res, MUSIC_DIR, decodeURIComponent(p.slice(7)));
    return serveStatic(req, res, PUBLIC_DIR, decodeURIComponent(p));
  } catch (err) {
    send(res, err.status || (err instanceof KieError ? 502 : 400), { error: err.message || 'Algo salió mal.', code: err.code });
  }
});

// Escuchar solo en esta computadora, o también en la red de casa si se activó el celular
let firstListen = true;
function relisten() {
  const host = settings.lan.enabled ? '0.0.0.0' : '127.0.0.1';
  const start = () => server.listen(PORT, host, onListening);
  if (firstListen) return start();
  server.close();
  server.closeAllConnections?.();
  setTimeout(start, 150);
}
function onListening() {
  const link = `http://localhost:${PORT}`;
  if (firstListen) {
    console.log('\n  ✦ OmniFlash Studio está listo');
    console.log(`  → Abre ${link} en tu navegador`);
    console.log('  (Deja esta ventana abierta mientras lo uses. Para cerrar: Ctrl + C)\n');
    if (process.env.OPEN_BROWSER) {
      const cmd = process.platform === 'win32' ? `start "" ${link}` : process.platform === 'darwin' ? `open ${link}` : `xdg-open ${link}`;
      exec(cmd);
    }
  }
  if (settings.lan.enabled) console.log(`  📱 Acceso desde el celular activado (misma red Wi-Fi): http://${lanIp()}:${PORT}`);
  firstListen = false;
}
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n  El puerto ${PORT} ya está en uso. ¿Ya tienes OmniFlash Studio abierto?`);
    console.log(`  Abre http://localhost:${PORT} o cambia PORT en el archivo .env\n`);
  } else console.error(err);
  process.exit(1);
});
relisten();
