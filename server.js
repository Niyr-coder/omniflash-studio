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
import { exec } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const VIDEOS_DIR = path.join(ROOT, 'videos');
const FILES = {
  history: path.join(DATA_DIR, 'history.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
  characters: path.join(DATA_DIR, 'characters.json'),
  recipes: path.join(DATA_DIR, 'recipes.json'),
};
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
const readJsonFile = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };
const timers = {};
const debounce = (key, ms, fn) => { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); };
const writeLater = (key, file, getData) => debounce(key, 200, () => fsp.writeFile(file, JSON.stringify(getData(), null, 2)).catch(() => {}));

let history = readJsonFile(FILES.history, []);
let characters = readJsonFile(FILES.characters, []);
let recipes = readJsonFile(FILES.recipes, []);
const settings = {
  maxConcurrent: 2, paused: false, pauseReason: '',
  dailyLimit: 0, projects: [],
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
        const it = newItem({ ...built, mode: b.mode, prompt: built.request.input.prompt, previews: b.previews, uploadedAt: Number(b.uploadedAt) || Date.now(), project: b.project, extra: batchId ? { batch: { id: batchId, n: i + 1, of: count } } : {} });
        it.createdAt += i;
        items.push(it);
      }
      enqueue(items);
      return send(res, 200, { items: items.map(publicItem) });
    }

    // Historial
    if (p === '/api/history' && req.method === 'GET') {
      return send(res, 200, { items: history.map(publicItem), queue: queueState(), credits, projects: settings.projects, recipes, characters, spending: spending() });
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
          extra: { parentId: item.id, kind: 'extend', addedSeconds: duration, estimateOnly: true },
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
