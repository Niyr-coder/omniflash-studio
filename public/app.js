// OmniFlash Studio — interfaz
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const UPLOAD_TTL = 23 * 3600 * 1000;

const ICON = {
  upload: '<svg class="i" viewBox="0 0 24 24"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  play: '<svg class="i" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5-13-7.5Z"/></svg>',
  download: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v12m0 0 4-4m-4 4-4-4M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/></svg>',
  reuse: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m14.5 7.5 3 3"/></svg>',
  retry: '<svg class="i" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15m0 5v-5h5"/></svg>',
  copy: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
  trash: '<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  alert: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3v.01"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pause: '<svg class="i" viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>',
  resume: '<svg class="i" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5-13-7.5Z"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  chevL: '<svg class="i" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
  chevR: '<svg class="i" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
};

const MODES = {
  text: 'Describe la escena y la IA crea el video desde cero.',
  images: 'Sube de 1 a 7 imágenes (personajes, productos, lugares) y el video las usará como referencia.',
  frames: 'Elige cómo empieza el video y, si quieres, cómo termina. La IA crea lo que pasa en medio.',
  video: 'Sube un video corto (máx. 30 s) y elige un tramo de hasta 10 s para transformarlo o continuarlo.',
};
const MODE_NAMES = { text: 'Texto', images: 'Imágenes', frames: 'Inicio y fin', video: 'Video' };

const STYLES = [
  ['Cine', 'estilo cinematográfico, lente anamórfico, profundidad de campo', 'Se ve como una película'],
  ['Animación 3D', 'animación 3D estilo película de estudio, colores vivos', 'Como una película animada'],
  ['Anime', 'estilo anime, trazos limpios, colores saturados', 'Dibujo animado japonés'],
  ['Documental', 'estilo documental, cámara en mano, luz natural', 'Realista, como grabado en la vida real'],
  ['Hora dorada', 'luz dorada del atardecer, sombras largas y cálidas', 'Luz cálida del atardecer'],
  ['Cámara lenta', 'en cámara lenta', 'El movimiento va más despacio'],
  ['Drone', 'toma aérea con drone, movimiento suave', 'Vista desde el aire'],
  ['Producto', 'anuncio de producto, estudio limpio, iluminación suave, giro de cámara', 'Para mostrar algo que vendes'],
];

const IDEAS = [
  'Un astronauta camina por un mercado nocturno en Tokio bajo la lluvia, letreros de neón reflejados en los charcos, cámara siguiéndolo por detrás.',
  'Una taza de café humeante sobre una mesa de madera junto a una ventana, la lluvia cae afuera, la cámara se acerca lentamente.',
  'Un colibrí bebe néctar de una flor tropical, cámara lenta extrema, fondo desenfocado verde intenso.',
  'Una ola gigante rompe al atardecer y un surfista la cruza, toma con drone que gira alrededor.',
  'Un pequeño robot de juguete despierta en un taller desordenado y mira a su alrededor con curiosidad, estilo animación 3D.',
  'Una abuela amasa pan en una cocina rústica iluminada por la mañana, harina flotando en el aire, planos cercanos de sus manos.',
  'Un dragón de papel origami se despliega y emprende vuelo sobre una ciudad hecha de libros.',
  'Una zapatilla deportiva gira sobre un pedestal mientras salpicaduras de pintura de colores explotan a su alrededor, anuncio de producto.',
  'Un lobo aúlla en la cima de una montaña nevada bajo la aurora boreal, la cámara se aleja lentamente.',
  'Un chef flambea un plato en una cocina profesional, llamas naranjas, ambiente de restaurante elegante.',
];

const PRICES_FALLBACK = { normal: { 4: 63, 6: 84, 8: 105, 10: 126 }, '4k': { 4: 147, 6: 168, 8: 189, 10: 210 }, withVideo: { normal: 168, '4k': 252 } };

// ---------- Estado ----------
const saved = JSON.parse(localStorage.getItem('ofs-settings') || '{}');
const state = {
  mode: saved.mode || 'text',
  duration: saved.duration || '6',
  ratio: saved.ratio || '16:9',
  resolution: saved.resolution || '720p',
  count: saved.count || '1',
  images: [], first: null, last: null, video: null,
  prices: PRICES_FALLBACK,
  credits: null,
  items: new Map(),
  queue: { maxConcurrent: 2, paused: false, pauseReason: '', queued: 0, active: 0 },
  filter: 'all',
  busy: false,
  loaded: false,
  hasKey: true,
};
const persist = () => localStorage.setItem('ofs-settings', JSON.stringify({ mode: state.mode, duration: state.duration, ratio: state.ratio, resolution: state.resolution, count: state.count }));

// ---------- API ----------
async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, { ...opts, headers: opts.body && typeof opts.body === 'string' ? { 'Content-Type': 'application/json' } : opts.headers });
  } catch {
    throw new Error('El estudio se cerró. Vuelve a abrir Iniciar.bat.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Algo salió mal.'); e.code = data.code; throw e; }
  return data;
}

// ---------- Avisos ----------
function toast(msg, type = 'ok', { ms = 4200, action } = {}) {
  // Si el mismo aviso ya está en pantalla, se suma un contador en vez de apilarlo
  const same = [...$('#toasts').children].find((t) => t.dataset.msg === msg && !t.classList.contains('out'));
  if (same) {
    const n = Number(same.dataset.n || 1) + 1;
    same.dataset.n = n;
    same.querySelector('.times').textContent = `×${n}`;
    same.animate([{ transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 220 });
    return;
  }
  const el = document.createElement('div');
  el.dataset.msg = msg;
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="dot"></span><span>${esc(msg)}</span><b class="times"></b>${action ? `<button class="toast-btn">${esc(action.label)}</button>` : ''}`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  if (action) el.querySelector('.toast-btn').onclick = () => { action.fn(); close(); };
  $('#toasts').append(el);
  while ($('#toasts').children.length > 3) $('#toasts').firstElementChild.remove();
  setTimeout(close, ms);
}

// ---------- Tooltips ----------
const tip = $('#tooltip');
let tipTarget = null, tipTimer = null, tipWarmUntil = 0;
function showTip(el) {
  const text = el.dataset.tip;
  if (!text) return;
  tip.textContent = text;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  let top = r.top - t.height - 10;
  let below = false;
  if (top < 8) { top = r.bottom + 10; below = true; }
  const left = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2));
  tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  tip.classList.toggle('below', below);
  tip.style.setProperty('--arrow', `${Math.round(r.left + r.width / 2 - left)}px`);
  requestAnimationFrame(() => tip.classList.add('on'));
}
function hideTip() {
  clearTimeout(tipTimer);
  if (!tip.hidden) tipWarmUntil = Date.now() + 300;
  tip.classList.remove('on');
  tip.hidden = true;
  tipTarget = null;
}
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el === tipTarget) return;
  hideTip();
  if (!el || e.pointerType === 'touch') return;
  tipTarget = el;
  tipTimer = setTimeout(() => showTip(el), Date.now() < tipWarmUntil ? 0 : 420);
});
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.confirm')) hideTip(); });
document.addEventListener('scroll', hideTip, true);
document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el && el.matches(':focus-visible')) { hideTip(); tipTarget = el; showTip(el); } });
document.addEventListener('focusout', hideTip);

// ---------- Modales con animación ----------
function openModal(el) { el.hidden = false; el.classList.remove('closing'); }
function closeModal(el, after) {
  if (el.hidden) return;
  el.classList.add('closing');
  setTimeout(() => { el.hidden = true; el.classList.remove('closing'); after?.(); }, reduceMotion ? 0 : 200);
}

// ---------- Llave / créditos ----------
const formatNum = (n) => Number(n).toLocaleString('es', { maximumFractionDigits: 1 });
function setCredits(c) {
  if (c == null) return;
  const prev = state.credits;
  state.credits = c;
  const el = $('#creditsText');
  el.textContent = `${formatNum(c)} créditos`;
  if (prev != null && prev !== c) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  updateCost();
}
async function loadConfig() {
  const cfg = await api('/api/config');
  if (cfg.prices) state.prices = cfg.prices;
  state.hasKey = cfg.hasKey;
  state.keyHint = cfg.keyHint;
  if (!cfg.hasKey) { openKeyModal(true); $('#creditsText').textContent = 'Sin conectar'; }
  updateCost();
}
async function refreshCredits(manual = false) {
  const btn = $('#creditsBtn');
  btn.classList.add('loading');
  try {
    const { credits } = await api('/api/credits');
    setCredits(credits);
    if (manual) toast('Créditos actualizados');
  } catch (e) {
    if (e.code === 401) openKeyModal(true);
    else if (manual) toast(e.message, 'error');
  } finally {
    btn.classList.remove('loading');
  }
}
function openKeyModal(firstTime) {
  $('#keyTitle').textContent = firstTime ? 'Bienvenido a OmniFlash Studio' : 'Tu cuenta de Kie';
  $('#keySubtitle').textContent = firstTime ? 'Conecta tu cuenta de Kie una sola vez y empieza a crear videos.' : 'Cambia la llave si quieres usar otra cuenta de Kie.';
  $('#keyClose').hidden = firstTime;
  $('#keyCurrent').hidden = firstTime || !state.keyHint;
  $('#keyCurrent').textContent = `Llave actual: ${state.keyHint || ''}`;
  $('#keyError').hidden = true;
  $('#keyModal').dataset.first = firstTime ? '1' : '';
  openModal($('#keyModal'));
  setTimeout(() => $('#keyInput').focus(), 60);
}
$('#keyForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = $('#keySubmit');
  btn.disabled = true; btn.textContent = 'Comprobando…';
  $('#keyError').hidden = true;
  try {
    const { credits } = await api('/api/config', { method: 'POST', body: JSON.stringify({ apiKey: $('#keyInput').value }) });
    state.hasKey = true;
    closeModal($('#keyModal'));
    $('#keyInput').value = '';
    setCredits(credits);
    loadConfig();
    toast(`¡Conectado! Tienes ${formatNum(credits)} créditos.`);
  } catch (e) {
    $('#keyError').textContent = e.message;
    $('#keyError').hidden = false;
    $('#keyForm').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 280 });
  } finally {
    btn.disabled = false; btn.textContent = 'Conectar';
  }
});
$('#keyClose').addEventListener('click', () => closeModal($('#keyModal')));
$('#settingsBtn').addEventListener('click', () => openKeyModal(false));
$('#creditsBtn').addEventListener('click', () => refreshCredits(true));
$('#folderBtn').addEventListener('click', () => api('/api/open-folder', { method: 'POST' }).then(() => toast('Abriendo la carpeta de videos…', 'info')));

// ---------- Modos (con transición suave) ----------
function positionIndicator(animate = true) {
  const on = $(`#modes button[data-mode="${state.mode}"]`);
  const ind = $('#modeIndicator');
  if (!animate) ind.style.transition = 'none';
  ind.style.width = `${on.offsetWidth}px`;
  ind.style.transform = `translateX(${on.offsetLeft - 4}px)`;
  if (!animate) { void ind.offsetWidth; ind.style.transition = ''; }
}
function setMode(mode, { animate = true } = {}) {
  const changedMode = mode !== state.mode;
  state.mode = mode;
  persist();
  $$('#modes button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === mode); b.setAttribute('aria-selected', b.dataset.mode === mode); });
  positionIndicator(animate);
  const help = $('#modeHelp');
  if (changedMode && animate && !reduceMotion) {
    help.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
  }
  help.textContent = MODES[mode];
  const isVideo = mode === 'video';
  $$('#durationSeg button').forEach((b) => (b.disabled = isVideo));
  $('#durationHint').textContent = isVideo ? 'La elige la IA según tu video' : '';
  swapUploads(animate && changedMode);
  updateCost();
  updateGenerate();
}
function swapUploads(animate) {
  const wrap = $('#uploadsWrap'), box = $('#uploads');
  if (!animate || reduceMotion) return renderUploads();
  const h0 = wrap.offsetHeight;
  renderUploads();
  const h1 = wrap.offsetHeight;
  wrap.getAnimations().forEach((a) => a.cancel());
  if (h0 !== h1) {
    wrap.style.overflow = 'hidden';
    wrap.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 300, easing: EASE }).onfinish = () => (wrap.style.overflow = '');
  }
  box.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 60, easing: EASE, fill: 'backwards' });
}
$$('#modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
window.addEventListener('resize', () => positionIndicator(false));

// ---------- Selectores ----------
const syncs = {};
function bindSeg(id, key, after) {
  const seg = $(id);
  const sync = () => $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.value === state[key]));
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    state[key] = b.dataset.value;
    persist(); sync(); updateCost(); updateGenerate(); after?.();
  });
  syncs[key] = sync;
  sync();
}
bindSeg('#ratioSeg', 'ratio');
bindSeg('#durationSeg', 'duration');
bindSeg('#resSeg', 'resolution');
bindSeg('#countSeg', 'count');
const syncAll = () => Object.values(syncs).forEach((f) => f());

// Opciones avanzadas: abrir y cerrar con suavidad
$('#advanced summary').addEventListener('click', (e) => {
  const d = $('#advanced'), body = $('.advanced-body', d);
  if (reduceMotion) return;
  e.preventDefault();
  if (d.open) {
    const a = body.animate([{ height: `${body.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: EASE });
    d.classList.add('closing');
    a.onfinish = () => { d.open = false; d.classList.remove('closing'); };
  } else {
    d.open = true;
    body.animate([{ height: '0px', opacity: 0 }, { height: `${body.offsetHeight}px`, opacity: 1 }], { duration: 260, easing: EASE });
  }
});

// ---------- Costo y botón ----------
function unitCost() {
  const tier = state.resolution === '4k' ? '4k' : 'normal';
  if (state.mode === 'video') return state.prices.withVideo[tier];
  return state.prices[tier][state.duration];
}
const totalCost = () => unitCost() * Number(state.count);
function updateCost() {
  const c = unitCost(), n = Number(state.count), t = c * n;
  $('#costText').textContent = `${n > 1 ? `${n} × ${c} = ` : ''}${t} créditos · $${(t * 0.005).toFixed(2)}`;
  const low = state.credits != null && state.credits < t;
  $('#creditsBtn').classList.toggle('low', low);
  $('#costText').classList.toggle('warn', low);
  $('#costText').dataset.tip = low
    ? `Te faltan ${formatNum(t - state.credits)} créditos. Los videos esperarán en la cola hasta que recargues en kie.ai.`
    : 'Lo que te cobrará Kie. 1 crédito = $0.005 USD';
}
function uploadsInProgress() {
  const slots = [state.first, state.last, state.video, ...state.images].filter((s) => s?.uploading);
  if (!slots.length) return null;
  return Math.round((slots.reduce((a, s) => a + (s.progress || 0), 0) / slots.length) * 100);
}
function updateGenerate(flash) {
  const btn = $('#generateBtn'), txt = $('#generateText');
  const up = uploadsInProgress();
  const n = Number(state.count);
  btn.classList.toggle('waiting', up !== null);
  btn.classList.toggle('busy', state.busy);
  if (flash) { btn.classList.add('flash'); txt.textContent = flash; setTimeout(() => { btn.classList.remove('flash'); updateGenerate(); }, 1400); return; }
  if (btn.classList.contains('flash')) return;
  txt.textContent = state.busy ? 'Enviando…' : up !== null ? `Subiendo archivos… ${up}%` : n > 1 ? `Crear ${n} versiones` : 'Crear video';
  const busyNow = state.queue.active + state.queue.queued;
  $('#shortcut').innerHTML = busyNow
    ? `Se añadirá a la cola (${busyNow} en proceso) · <kbd>Ctrl</kbd> + <kbd>Enter</kbd>`
    : 'Puedes seguir creando mientras esperas · <kbd>Ctrl</kbd> + <kbd>Enter</kbd>';
}

// ---------- Texto ----------
const promptEl = $('#prompt');
const autoGrow = () => { promptEl.style.height = 'auto'; promptEl.style.height = `${Math.min(Math.max(promptEl.scrollHeight, 104), 340)}px`; };
promptEl.addEventListener('input', () => {
  $('#charCount').textContent = promptEl.value.length.toLocaleString('es');
  localStorage.setItem('ofs-prompt', promptEl.value);
  syncChips(); autoGrow();
});
promptEl.value = localStorage.getItem('ofs-prompt') || '';
$('#charCount').textContent = promptEl.value.length.toLocaleString('es');

$('#styleChips').innerHTML = STYLES.map(([name, , help], i) => `<button type="button" class="chip" data-i="${i}" data-tip="${esc(help)}. Clic para añadirlo o quitarlo.">${esc(name)}</button>`).join('');
function syncChips() { $$('#styleChips .chip').forEach((c) => c.classList.toggle('on', promptEl.value.includes(STYLES[c.dataset.i][1]))); }
syncChips();
$('#styleChips').addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  const text = STYLES[c.dataset.i][1];
  let v = promptEl.value;
  if (v.includes(text)) v = v.replace(new RegExp(`(,\\s*)?${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '').replace(/^,\s*/, '');
  else v = v.trim() ? `${v.trim().replace(/[.,]$/, '')}, ${text}` : text;
  promptEl.value = v;
  promptEl.dispatchEvent(new Event('input'));
});
let ideaIdx = Math.floor(Math.random() * IDEAS.length);
$('#ideaBtn').addEventListener('click', () => {
  ideaIdx = (ideaIdx + 1) % IDEAS.length;
  promptEl.value = IDEAS[ideaIdx];
  promptEl.dispatchEvent(new Event('input'));
  if (!reduceMotion) promptEl.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 300 });
  promptEl.focus();
});
$('#diceBtn').addEventListener('click', () => ($('#seed').value = Math.floor(Math.random() * 2147483647)));

// ---------- Subidas ----------
let uid = 0;
function saveSlots() {
  const keep = (s) => s && s.url && !s.error ? { url: s.url, preview: s.preview, uploadedAt: s.uploadedAt } : null;
  localStorage.setItem('ofs-uploads', JSON.stringify({
    images: state.images.map(keep).filter(Boolean),
    first: keep(state.first), last: keep(state.last),
    video: state.video?.url && !state.video.error ? { url: state.video.url, thumb: state.video.thumb, length: state.video.length, start: state.video.start, ends: state.video.ends, uploadedAt: state.video.uploadedAt } : null,
  }));
}
function restoreSlots() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('ofs-uploads') || '{}'); } catch {}
  const fresh = (x) => x && Date.now() - x.uploadedAt < UPLOAD_TTL;
  const mk = (x) => ({ id: ++uid, url: x.url, preview: x.preview, uploadedAt: x.uploadedAt });
  state.images = (s.images || []).filter(fresh).map(mk);
  state.first = fresh(s.first) ? mk(s.first) : null;
  state.last = fresh(s.last) ? mk(s.last) : null;
  state.video = fresh(s.video) ? { ...s.video, id: ++uid, preview: s.video.url } : null;
}

function makeThumb(file, max = 240) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve('');
    img.src = URL.createObjectURL(file);
  });
}
function videoThumb(video, max = 320) {
  try {
    const s = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(video.videoWidth * s); c.height = Math.round(video.videoHeight * s);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.75);
  } catch { return ''; }
}

function uploadFile(file, slot) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const name = file.name.replace(/\.[^.]+$/, '');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    slot.xhr = xhr;
    xhr.open('POST', `/api/upload?name=${encodeURIComponent(name)}&ext=${encodeURIComponent(ext)}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) { slot.progress = (e.loaded / e.total) * 0.9; paintSlot(slot); updateGenerate(); } };
    xhr.upload.onload = () => { slot.progress = 0.92; paintSlot(slot); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      xhr.status === 200 && data.url ? resolve(data) : reject(new Error(data.error || 'No se pudo subir el archivo.'));
    };
    xhr.onerror = () => reject(new Error('No se pudo subir el archivo.'));
    xhr.onabort = () => reject(Object.assign(new Error('cancelado'), { aborted: true }));
    xhr.send(file);
  });
}
async function runUpload(file, slot) {
  slot.uploading = true; slot.progress = 0;
  updateGenerate();
  try {
    const { url, uploadedAt } = await uploadFile(file, slot);
    slot.url = url; slot.uploadedAt = uploadedAt;
  } catch (e) {
    if (e.aborted) return;
    slot.error = e.message.length > 60 ? 'No se pudo subir' : e.message;
    toast(e.message, 'error');
    if (e.message.includes('llave')) openKeyModal(true);
  }
  slot.uploading = false;
  paintSlot(slot);
  saveSlots();
  updateGenerate();
}
// Actualiza solo la capa de estado de una miniatura (sin redibujar todo)
function paintSlot(slot) {
  const host = document.querySelector(`[data-slot="${slot.id}"]`);
  if (!host) return;
  let layer = host.querySelector(':scope > .state');
  if (slot.uploading) {
    const pct = Math.round((slot.progress || 0) * 100);
    const label = slot.progress >= 0.9 ? 'Preparando…' : `${pct}%`;
    if (!layer) { layer = document.createElement('div'); layer.className = 'state'; host.append(layer); }
    layer.className = 'state';
    layer.innerHTML = `<div style="display:grid;gap:5px;justify-items:center"><div class="ring" style="--p:${pct}"></div><small>${label}</small></div>`;
  } else if (slot.error) {
    if (!layer) { layer = document.createElement('div'); host.append(layer); }
    layer.className = 'state err';
    layer.innerHTML = `${ICON.alert}<span>${esc(slot.error)}</span>`;
  } else if (layer) {
    layer.classList.add('leaving');
    setTimeout(() => layer.remove(), 250);
    host.classList.add('ready');
  }
}

async function addImageTo(target, file) {
  if (!file.type.startsWith('image/')) return toast('Ese archivo no es una imagen.', 'error');
  if (file.size > 20 * 1024 * 1024) return toast('La imagen pesa más de 20 MB.', 'error');
  const slot = { id: ++uid, preview: await makeThumb(file), uploading: true, progress: 0 };
  if (target === 'images') state.images.push(slot);
  else { state[target]?.xhr?.abort(); state[target] = slot; }
  renderUploads();
  runUpload(file, slot);
}
async function setVideo(file) {
  if (!file.type.startsWith('video/')) return toast('Ese archivo no es un video.', 'error');
  if (file.size > 100 * 1024 * 1024) return toast('El video pesa más de 100 MB.', 'error');
  const preview = URL.createObjectURL(file);
  const length = await new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.src = preview;
    v.onloadedmetadata = () => resolve(v.duration);
    v.onerror = () => resolve(0);
  });
  if (length > 30.5) { URL.revokeObjectURL(preview); return toast(`Tu video dura ${Math.round(length)} s. Kie acepta videos de máximo 30 s; recórtalo primero.`, 'error', { ms: 6500 }); }
  state.video?.xhr?.abort();
  if (state.video?.preview?.startsWith('blob:')) URL.revokeObjectURL(state.video.preview);
  const slot = { id: ++uid, preview, length, start: 0, ends: Math.min(length || 10, 10), uploading: true, progress: 0 };
  state.video = slot;
  renderUploads();
  runUpload(file, slot);
}

function slotHTML(slot, { frame = false, tag = '', remove = '' } = {}) {
  return `<div class="thumb ${frame ? 'frame' : ''}" data-slot="${slot.id}">
    ${slot.preview ? `<img src="${slot.preview}" alt="">` : ''}
    ${tag ? `<span class="tag">${tag}</span>` : ''}
    <button class="x" type="button" data-remove="${remove}" data-tip="Quitar">${ICON.x}</button>
  </div>`;
}
function dropHTML(target, title, sub, accept = 'image/*', multiple = false) {
  return `<label class="drop" data-target="${target}">
    ${ICON.upload}<b>${title}</b><span>${sub}</span>
    <input type="file" accept="${accept}" ${multiple ? 'multiple' : ''} data-target="${target}">
  </label>`;
}
const addTile = (max) => `<label class="thumb add" data-tip="Añadir más imágenes (máx. ${max})">${ICON.plus}<input type="file" accept="image/*" multiple data-target="images"></label>`;

function renderUploads() {
  const box = $('#uploads');
  const m = state.mode;
  if (m === 'text') {
    box.innerHTML = '';
  } else if (m === 'images') {
    const n = state.images.length;
    box.innerHTML = `<div class="drop-label">Imágenes de referencia <span>${n}/7</span></div>` +
      (n ? `<div class="thumbs">${state.images.map((s, i) => slotHTML(s, { tag: `#${i + 1}`, remove: `img:${s.id}` })).join('')}${n < 7 ? addTile(7) : ''}</div>`
        : dropHTML('images', 'Arrastra o elige imágenes', 'JPG, PNG o WebP · hasta 20 MB c/u · también Ctrl+V', 'image/*', true));
  } else if (m === 'frames') {
    const part = (key, title) => state[key] ? slotHTML(state[key], { frame: true, tag: title, remove: key }) : dropHTML(key, title, key === 'last' ? 'Opcional' : 'Obligatorio');
    box.innerHTML = `<div class="drop-label">Fotogramas</div><div class="drop-row two">${part('first', 'Primer cuadro')}${part('last', 'Último cuadro')}</div>`;
  } else if (m === 'video') {
    const v = state.video;
    if (!v) {
      box.innerHTML = `<div class="drop-label">Video de entrada</div>${dropHTML('video', 'Arrastra o elige un video', 'MP4 o MOV · máx. 30 s y 100 MB', 'video/*')}`;
    } else {
      const len = v.length || 10;
      box.innerHTML = `<div class="drop-label">Video de entrada <span>${len.toFixed(1)} s</span></div>
        <div class="video-prev" data-slot="${v.id}">
          <video src="${v.preview}" muted playsinline preload="metadata" id="trimVideo"></video>
          <button class="icon-btn x" type="button" data-remove="video" data-tip="Quitar el video">${ICON.x}</button>
        </div>
        <div class="trim">
          <div class="trim-head"><span>Tramo a usar <button type="button" class="info" data-tip="Mueve los dos puntos para elegir qué parte del video usará la IA. Máximo 10 segundos.">?</button></span><b id="trimText"></b></div>
          <div class="range"><div class="track"></div><div class="sel" id="trimSel"></div>
            <input type="range" id="trimStart" min="0" max="${len}" step="0.1" value="${v.start}" aria-label="Inicio del tramo">
            <input type="range" id="trimEnd" min="0" max="${len}" step="0.1" value="${v.ends}" aria-label="Fin del tramo">
          </div>
        </div>
        <div class="extra-imgs">
          <div class="drop-label">Imágenes extra <span>Opcional · ${state.images.length}/5</span></div>
          <div class="thumbs">${state.images.map((s, i) => slotHTML(s, { tag: `#${i + 1}`, remove: `img:${s.id}` })).join('')}${state.images.length < 5 ? addTile(5) : ''}</div>
        </div>`;
      bindTrim();
    }
  }
  [state.first, state.last, state.video, ...state.images].forEach((s) => s && (s.uploading || s.error) && paintSlot(s));
}

function bindTrim() {
  const v = state.video, s = $('#trimStart'), e = $('#trimEnd'), vid = $('#trimVideo');
  const len = v.length || 10;
  const draw = (moved) => {
    let a = Number(s.value), b = Number(e.value);
    if (moved === 's') { if (a > b - 0.5) a = Math.max(0, b - 0.5); if (b - a > 10) b = Math.min(len, a + 10); }
    else if (moved === 'e') { if (b < a + 0.5) b = Math.min(len, a + 0.5); if (b - a > 10) a = Math.max(0, b - 10); }
    s.value = a; e.value = b; v.start = a; v.ends = b;
    $('#trimSel').style.left = `${(a / len) * 100}%`;
    $('#trimSel').style.width = `${((b - a) / len) * 100}%`;
    $('#trimText').textContent = `${a.toFixed(1)} s → ${b.toFixed(1)} s · ${(b - a).toFixed(1)} s`;
    if (moved && vid) vid.currentTime = moved === 's' ? a : b;
  };
  s.addEventListener('input', () => draw('s'));
  e.addEventListener('input', () => draw('e'));
  s.addEventListener('change', saveSlots);
  e.addEventListener('change', saveSlots);
  vid?.addEventListener('loadeddata', () => { vid.currentTime = v.start || 0.1; if (!v.thumb) { setTimeout(() => { v.thumb = videoThumb(vid); saveSlots(); }, 200); } }, { once: true });
  draw();
}

const uploadsBox = $('#uploads');
uploadsBox.addEventListener('change', (e) => {
  const input = e.target.closest('input[type=file]');
  if (!input) return;
  handleFiles(input.dataset.target, [...input.files]);
  input.value = '';
});
uploadsBox.addEventListener('click', (e) => {
  const b = e.target.closest('[data-remove]');
  if (!b) return;
  e.preventDefault();
  hideTip();
  const r = b.dataset.remove;
  const host = b.closest('.thumb, .video-prev');
  const apply = () => {
    if (r.startsWith('img:')) { const s = state.images.find((x) => x.id === Number(r.slice(4))); s?.xhr?.abort(); state.images = state.images.filter((x) => x !== s); }
    else if (r === 'video') { state.video?.xhr?.abort(); if (state.video?.preview?.startsWith('blob:')) URL.revokeObjectURL(state.video.preview); state.video = null; }
    else { state[r]?.xhr?.abort(); state[r] = null; }
    saveSlots();
    swapUploads(true);
    updateGenerate();
  };
  if (host && !reduceMotion) host.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.92)' }], { duration: 160, easing: EASE }).onfinish = apply;
  else apply();
});
uploadsBox.addEventListener('dragover', (e) => { const d = e.target.closest('.drop, .thumb.add'); if (d) { e.preventDefault(); d.classList.add('over'); } });
uploadsBox.addEventListener('dragleave', (e) => e.target.closest('.drop, .thumb.add')?.classList.remove('over'));
uploadsBox.addEventListener('drop', (e) => {
  const d = e.target.closest('.drop, .thumb.add');
  if (!d) return;
  e.preventDefault(); d.classList.remove('over');
  handleFiles(d.dataset.target || 'images', [...e.dataTransfer.files]);
});
document.addEventListener('paste', (e) => {
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  if (state.mode === 'text') setMode('images');
  if (state.mode === 'frames') handleFiles(state.first ? 'last' : 'first', files.slice(0, 1));
  else handleFiles('images', files);
});
function handleFiles(target, files) {
  if (!files.length) return;
  if (target === 'video') return setVideo(files[0]);
  if (target === 'images') {
    const max = state.mode === 'video' ? 5 : 7;
    const room = max - state.images.length;
    if (files.length > room) toast(`Solo caben ${max} imágenes; añadí ${Math.max(room, 0)}.`, 'info');
    files.slice(0, Math.max(room, 0)).forEach((f) => addImageTo('images', f));
    return;
  }
  addImageTo(target, files[0]);
}

// ---------- Crear (se añade a la cola) ----------
function collect() {
  if (uploadsInProgress() !== null) throw new Error('Espera un momento: tus archivos todavía se están subiendo.');
  const ok = (s) => s && s.url && !s.error;
  const used = [];
  const body = {
    mode: state.mode, prompt: promptEl.value, duration: state.duration, aspect_ratio: state.ratio,
    resolution: state.resolution, seed: $('#seed').value, count: state.count, previews: {},
  };
  if (state.mode === 'images' || state.mode === 'video') {
    const imgs = state.images.filter(ok);
    if (state.mode === 'images' && !imgs.length) throw new Error('Sube al menos una imagen de referencia.');
    body.image_urls = imgs.map((s) => s.url);
    body.previews.images = imgs.map((s) => s.preview);
    used.push(...imgs);
  }
  if (state.mode === 'frames') {
    if (!ok(state.first)) throw new Error('Sube la imagen del primer cuadro.');
    body.first_frame_url = state.first.url;
    body.previews.first = state.first.preview;
    used.push(state.first);
    if (ok(state.last)) { body.last_frame_url = state.last.url; body.previews.last = state.last.preview; used.push(state.last); }
  }
  if (state.mode === 'video') {
    if (!ok(state.video)) throw new Error('Sube el video que quieres usar.');
    body.video = { url: state.video.url, start: state.video.start, ends: state.video.ends };
    body.previews.video = state.video.thumb;
    used.push(state.video);
  }
  if (used.length) body.uploadedAt = Math.min(...used.map((s) => s.uploadedAt || Date.now()));
  return body;
}
function nudge(el) { if (!reduceMotion) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 260 }); }
async function generate() {
  if (state.busy) return;
  if (!state.hasKey) return openKeyModal(true);
  let body;
  try { body = collect(); } catch (e) { nudge($('#uploadsWrap')); return toast(e.message, 'error'); }
  if (!body.prompt.trim()) { nudge($('.prompt-box')); promptEl.focus(); return toast('Escribe qué quieres ver en el video.', 'error'); }
  state.busy = true;
  updateGenerate();
  try {
    const { items } = await api('/api/generate', { method: 'POST', body: JSON.stringify(body) });
    items.forEach((it) => upsert(it, { quiet: true }));
    renderGallery();
    if (state.filter === 'done') setFilter('all');
    updateGenerate(items.length > 1 ? `✓ ${items.length} en la cola` : '✓ En la cola');
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  } catch (e) {
    toast(e.message, 'error', { ms: 6500 });
    if (e.code === 401) openKeyModal(true);
  } finally {
    state.busy = false;
    updateGenerate();
  }
}
$('#generateBtn').addEventListener('click', generate);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generate(); }
  if (e.key === 'Escape') {
    if (!$('#viewer').hidden) closeViewer();
    else if (!$('#keyModal').hidden && !$('#keyModal').dataset.first) closeModal($('#keyModal'));
  }
  if (!$('#viewer').hidden && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) stepViewer(e.key === 'ArrowRight' ? 1 : -1);
});

// ---------- Tiempos ----------
const BASE_SECONDS = { '360p': 60, '720p': 85, '1080p': 110, '4k': 210 };
function expectedSeconds(h) {
  const res = h.settings?.resolution || '720p';
  const samples = [...state.items.values()].filter((x) => x.state === 'done' && x.costTime && x.settings?.resolution === res).slice(0, 8).map((x) => x.costTime).sort((a, b) => a - b);
  if (samples.length >= 2) return samples[Math.floor(samples.length / 2)];
  const d = Number(h.settings?.duration || 6);
  return BASE_SECONDS[res] * (1 + (d - 4) * 0.08) + (h.mode === 'video' ? 30 : 0);
}
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function fmtLeft(s) {
  if (s < 45) return 'menos de 1 min';
  const m = Math.round(s / 60);
  return `~${m} min`;
}
function progressOf(h) {
  if (h.state === 'downloading') return 98;
  const el = (Date.now() - (h.sentAt || h.createdAt)) / 1000;
  if (typeof h.progress === 'number' && h.progress > 0) return Math.min(97, h.progress);
  const exp = expectedSeconds(h);
  return Math.min(95, 95 * (1 - Math.exp((-1.9 * el) / exp)));
}
function etaLine(h) {
  const el = (Date.now() - (h.sentAt || h.createdAt)) / 1000;
  const exp = expectedSeconds(h);
  if (h.state === 'downloading') return 'Casi listo';
  if (el < exp) return `Faltan ${fmtLeft(exp - el)}`;
  if (el < 600) return 'Tardando un poco más de lo normal…';
  return 'Kie va lento hoy; seguimos esperando';
}
function queuedOrder() {
  return [...state.items.values()].filter((h) => h.state === 'queued').sort((a, b) => a.createdAt - b.createdAt);
}

// ---------- Galería (actualiza solo lo que cambia) ----------
const isWorking = (h) => ['queued', 'sending', 'pending', 'downloading'].includes(h.state);
const srcOf = (h) => (h.localFile ? `/videos/${encodeURIComponent(h.localFile)}` : h.videoUrl);
const thumbOf = (h) => h.previews?.first || h.previews?.video || h.previews?.images?.[0] || '';
const resLabel = (r) => (r === '4k' ? '4K' : r);
const sigOf = (h) => [h.state, h.localFile, h.error, h.canRetry, h.videoUrl, h.state === 'pending' ? h.kieState : ''].join('|');

function stageLabel(h) {
  if (h.state === 'queued') return 'En cola';
  if (h.state === 'sending') return 'Enviando';
  if (h.state === 'downloading') return 'Guardando';
  return { waiting: 'En la fila de Kie', queuing: 'En la fila de Kie', generating: 'Generando' }[h.kieState] || 'Enviado';
}

function cardHTML(h) {
  const s = h.settings || {};
  const meta = `<div class="meta">
      <span data-tip="Modo con el que se creó">${MODE_NAMES[h.mode] || ''}</span>
      <span>${h.mode === 'video' ? '' : `${s.duration} s · `}${resLabel(s.resolution)}${s.aspect_ratio === '9:16' ? ' · 9:16' : ''}</span>
      ${h.batch ? `<span data-tip="Versión ${h.batch.n} de ${h.batch.of} de la misma idea">v${h.batch.n}</span>` : ''}
    </div>`;
  const thumb = thumbOf(h);
  let media;
  if (h.state === 'queued') {
    media = `<div class="vmedia waiting">
      ${thumb ? `<img class="thumb-in" src="${thumb}" alt="">` : ''}
      <span class="badge"><span class="dot idle"></span>En cola</span>
      <div class="loading-center">${ICON.clock}<strong data-live="qpos"></strong><span data-live="qnote"></span></div>
    </div>`;
  } else if (isWorking(h)) {
    media = `<div class="vmedia loading">
      ${thumb ? `<img class="thumb-in" src="${thumb}" alt="">` : ''}
      <span class="badge live"><span class="dot"></span><span data-live="stage">${stageLabel(h)}</span></span>
      <span class="badge right timer" data-live="clock" data-tip="Tiempo que lleva creándose"></span>
      <div class="loading-center"><div class="orb"></div><strong>${h.state === 'sending' ? 'Enviando a Kie…' : h.state === 'downloading' ? 'Guardando en tu PC…' : 'Creando tu video…'}</strong><span data-live="eta"></span></div>
      <div class="bar"><i data-live="bar"></i></div>
    </div>`;
  } else if (h.state === 'failed') {
    media = `<div class="vmedia failed"><span class="badge fail"><span class="dot"></span>No se pudo crear</span>
      <div class="failed-msg">${esc(h.error || 'La generación falló.')}</div></div>`;
  } else {
    const src = srcOf(h);
    media = `<div class="vmedia" data-open="${h.id}" data-tip="Clic para verlo en grande">
      ${thumb ? `<img class="bg" src="${thumb}" alt="">` : ''}
      <video class="main" src="${src}#t=0.1" muted loop playsinline preload="metadata"></video>
      <span class="badge right">${resLabel(s.resolution)}</span>
      <span class="play">${ICON.play}</span>
    </div>`;
  }
  let actions = '';
  if (h.state === 'done') actions += `<a class="icon-btn" href="${srcOf(h)}" download data-tip="Descargar a tu computadora">${ICON.download}</a>`;
  if (h.state === 'failed' && h.canRetry) actions += `<button class="icon-btn" data-act="retry" data-tip="Intentar otra vez con lo mismo">${ICON.retry}</button>`;
  actions += `<button class="icon-btn" data-act="reuse" data-tip="Llevar esta idea al panel para cambiarla y crear otra">${ICON.reuse}</button>`;
  if (h.state === 'queued') actions += `<button class="icon-btn danger" data-act="delete" data-tip="Quitar de la cola (no se cobra)">${ICON.x}</button>`;
  else if (h.state === 'done' || h.state === 'failed') actions += `<button class="icon-btn danger" data-act="delete" data-tip="Borrar este video">${ICON.trash}</button>`;
  return `${media}
    <div class="vbody">
      <p class="vprompt">${esc(h.prompt)}</p>
      <div class="vfoot">${meta}<div class="actions">${actions}</div></div>
    </div>`;
}

const nodes = new Map(); // id -> { el, sig }
function sortedItems() { return [...state.items.values()].sort((a, b) => b.createdAt - a.createdAt); }
const matchesFilter = (h) => state.filter === 'all' || (state.filter === 'pending' ? isWorking(h) : h.state === 'done');

function renderGallery() {
  const grid = $('#grid');
  const list = sortedItems();
  const alive = new Set(list.map((h) => h.id));
  // Quitar los que ya no existen (con salida suave)
  for (const [id, n] of nodes) {
    if (alive.has(id)) continue;
    nodes.delete(id);
    if (reduceMotion) n.el.remove();
    else n.el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 220, easing: EASE }).onfinish = () => n.el.remove();
  }
  let prev = null;
  for (const h of list) {
    let n = nodes.get(h.id);
    const sig = sigOf(h);
    if (!n) {
      const el = document.createElement('article');
      el.className = `vcard ${state.loaded ? 'enter' : ''}`;
      el.dataset.id = h.id;
      el.innerHTML = cardHTML(h);
      n = { el, sig };
      nodes.set(h.id, n);
    } else if (n.sig !== sig) {
      const wasWorking = n.el.classList.contains('working');
      n.el.innerHTML = cardHTML(h);
      n.sig = sig;
      if (h.state === 'done' && wasWorking) { n.el.classList.remove('reveal'); void n.el.offsetWidth; n.el.classList.add('reveal'); }
    }
    n.el.classList.toggle('working', isWorking(h));
    n.el.hidden = !matchesFilter(h);
    const want = prev ? prev.nextSibling : grid.firstChild;
    if (n.el !== want) grid.insertBefore(n.el, want);
    prev = n.el;
  }
  const visible = list.filter(matchesFilter).length;
  $('#empty').hidden = !state.loaded || list.length > 0;
  $('#filterEmpty').hidden = !list.length || visible > 0;
  $('#nAll').textContent = list.length || '';
  $('#nPending').textContent = list.filter(isWorking).length || '';
  $('#nDone').textContent = list.filter((h) => h.state === 'done').length || '';
  tickLive();
  renderQueueBar();
}

// Textos que cambian cada segundo (sin redibujar la tarjeta)
function tickLive() {
  const order = queuedOrder();
  for (const [id, n] of nodes) {
    const h = state.items.get(id);
    if (!h || !isWorking(h)) continue;
    const q = (k) => n.el.querySelector(`[data-live="${k}"]`);
    if (h.state === 'queued') {
      const pos = order.indexOf(h) + 1;
      q('qpos') && (q('qpos').textContent = pos === 1 ? 'Es el siguiente' : `Turno ${pos} en la cola`);
      q('qnote') && (q('qnote').textContent = h.note || (state.queue.paused ? 'La cola está en pausa' : 'Empieza cuando termine otro video'));
      continue;
    }
    const el = (Date.now() - (h.sentAt || h.createdAt)) / 1000;
    q('clock') && (q('clock').textContent = fmtClock(Math.max(0, el)));
    q('eta') && (q('eta').textContent = h.state === 'sending' ? 'Un momento…' : etaLine(h));
    q('bar') && (q('bar').style.width = `${progressOf(h)}%`);
    q('stage') && (q('stage').textContent = stageLabel(h));
  }
  updateTitle();
}
setInterval(tickLive, 1000);

function updateTitle() {
  const working = [...state.items.values()].filter((h) => ['sending', 'pending', 'downloading'].includes(h.state)).length;
  const queued = state.queue.queued;
  document.title = working || queued ? `(${working + queued}) Creando… · OmniFlash Studio` : 'OmniFlash Studio';
}

function setFilter(f) {
  state.filter = f;
  $$('#filters button').forEach((x) => x.classList.toggle('on', x.dataset.filter === f));
  renderGallery();
}
$('#filters').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.filter); });

// ---------- Barra de la cola ----------
function renderQueueBar() {
  const q = state.queue;
  const working = [...state.items.values()].filter((h) => ['sending', 'pending', 'downloading'].includes(h.state));
  const queued = queuedOrder();
  const bar = $('#queuebar');
  const show = working.length > 0 || queued.length > 0 || q.paused;
  if (show && bar.hidden) { bar.hidden = false; if (!reduceMotion) bar.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE }); }
  if (!show) bar.hidden = true;
  if (!show) return;
  bar.classList.toggle('paused', q.paused);
  const parts = [];
  if (working.length) parts.push(`${working.length} creándose`);
  if (queued.length) parts.push(`${queued.length} en cola`);
  $('#qTitle').textContent = q.paused ? 'Cola en pausa' : parts.join(' · ') || 'Todo listo';
  let sub = '';
  if (q.paused) sub = q.pauseReason || 'Los videos en cola esperan hasta que la reanudes.';
  else {
    const remaining = working.reduce((a, h) => a + Math.max(20, expectedSeconds(h) - (Date.now() - (h.sentAt || h.createdAt)) / 1000), 0)
      + queued.reduce((a, h) => a + expectedSeconds(h), 0);
    const total = remaining / Math.max(1, Math.min(q.maxConcurrent, working.length + queued.length));
    sub = `Todo listo en ${fmtLeft(total)} · puedes cerrar el navegador, se guardan solos`;
  }
  $('#qSub').textContent = sub;
  $('#qMax').textContent = q.maxConcurrent;
  $('#qMinus').disabled = q.maxConcurrent <= 1;
  $('#qPlus').disabled = q.maxConcurrent >= 4;
  const pb = $('#qPause');
  pb.innerHTML = q.paused ? `${ICON.resume} Reanudar` : `${ICON.pause} Pausar`;
  pb.dataset.tip = q.paused ? 'Seguir enviando los videos en cola' : 'Detener los envíos. Los que ya se están creando terminan igual.';
  pb.hidden = !q.paused && !queued.length;
}
setInterval(() => !$('#queuebar').hidden && renderQueueBar(), 5000);
async function setQueue(patch) {
  Object.assign(state.queue, patch);
  renderQueueBar();
  try { state.queue = { ...state.queue, ...(await api('/api/queue', { method: 'POST', body: JSON.stringify(patch) })) }; renderQueueBar(); }
  catch (e) { toast(e.message, 'error'); }
}
$('#qMinus').addEventListener('click', () => setQueue({ maxConcurrent: state.queue.maxConcurrent - 1 }));
$('#qPlus').addEventListener('click', () => setQueue({ maxConcurrent: state.queue.maxConcurrent + 1 }));
$('#qPause').addEventListener('click', () => { hideTip(); setQueue({ paused: !state.queue.paused }); });

// ---------- Acciones en tarjetas ----------
const grid = $('#grid');
grid.addEventListener('mouseover', (e) => {
  const m = e.target.closest('.vmedia[data-open]');
  if (m && !m.contains(e.relatedTarget)) { const v = m.querySelector('video.main'); if (v) { v.currentTime = 0; v.play().catch(() => {}); } }
});
grid.addEventListener('mouseout', (e) => {
  const m = e.target.closest('.vmedia[data-open]');
  if (m && !m.contains(e.relatedTarget)) m.querySelector('video.main')?.pause();
});
grid.addEventListener('click', async (e) => {
  const card = e.target.closest('.vcard');
  if (!card) return;
  const h = state.items.get(card.dataset.id);
  if (!h) return;
  if (e.target.closest('[data-open]')) return openViewer(h);
  const btn = e.target.closest('[data-act]');
  const act = btn?.dataset.act;
  if (act === 'reuse') reuse(h);
  if (act === 'retry') {
    try { const { item } = await api(`/api/history/${h.id}/retry`, { method: 'POST' }); upsert(item, { quiet: true }); renderGallery(); toast('Lo puse otra vez en la cola', 'info'); }
    catch (err) { toast(err.message, 'error', { ms: 6500 }); }
  }
  if (act === 'delete') {
    // Confirmación sin ventanas: segundo clic para borrar (no hace falta para quitar de la cola)
    if (h.state !== 'queued' && !btn.classList.contains('confirm')) {
      btn.classList.add('confirm');
      btn.dataset.tipOld = btn.dataset.tip;
      btn.dataset.tip = 'Haz clic otra vez para borrarlo';
      hideTip(); tipTarget = btn; showTip(btn);
      setTimeout(() => { if (btn.isConnected) { btn.classList.remove('confirm'); btn.dataset.tip = btn.dataset.tipOld; } }, 3000);
      return;
    }
    hideTip();
    state.items.delete(h.id);
    renderGallery();
    try { await api(`/api/history/${h.id}`, { method: 'DELETE' }); toast(h.state === 'queued' ? 'Quitado de la cola' : 'Video borrado'); }
    catch (err) { upsert(h, { quiet: true }); renderGallery(); toast(err.message, 'error'); }
  }
});

function reuse(h) {
  promptEl.value = h.prompt;
  promptEl.dispatchEvent(new Event('input'));
  Object.assign(state, { duration: h.settings.duration, ratio: h.settings.aspect_ratio, resolution: h.settings.resolution, count: '1' });
  $('#seed').value = h.settings.seed ?? '';
  syncAll(); persist();
  const fresh = Date.now() - (h.uploadedAt || h.createdAt) < UPLOAD_TTL;
  [state.first, state.last, state.video, ...state.images].forEach((s) => s?.xhr?.abort());
  state.images = []; state.first = null; state.last = null; state.video = null;
  const at = h.uploadedAt || h.createdAt;
  if (fresh) {
    (h.inputs?.image_urls || []).forEach((url, i) => state.images.push({ id: ++uid, url, uploadedAt: at, preview: h.previews?.images?.[i] || '' }));
    if (h.inputs?.first_frame_url) state.first = { id: ++uid, url: h.inputs.first_frame_url, uploadedAt: at, preview: h.previews?.first || '' };
    if (h.inputs?.last_frame_url) state.last = { id: ++uid, url: h.inputs.last_frame_url, uploadedAt: at, preview: h.previews?.last || '' };
    if (h.inputs?.video) { const v = h.inputs.video; state.video = { id: ++uid, url: v.url, preview: v.url, uploadedAt: at, thumb: h.previews?.video, start: v.start, ends: v.ends, length: Math.max(v.ends, 10) }; }
  }
  saveSlots();
  const sameMode = state.mode === h.mode;
  setMode(h.mode);
  if (sameMode) swapUploads(true);
  closeViewer();
  const comp = $('.composer');
  comp.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (!reduceMotion) comp.animate([{ boxShadow: '0 0 0 2px rgba(139,108,255,.7)' }, { boxShadow: '0 0 0 2px rgba(139,108,255,0)' }], { duration: 1200, easing: 'ease-out' });
  const skipped = !fresh && h.mode !== 'text';
  toast(skipped ? 'Idea cargada. Vuelve a subir los archivos: Kie los borra a las 24 horas.' : 'Idea cargada en el panel. Cámbiala y crea otra versión.', 'info', { ms: 5000 });
  promptEl.focus({ preventScroll: true });
}

// ---------- Visor ----------
let viewerId = null;
function doneList() { return sortedItems().filter((h) => h.state === 'done'); }
function openViewer(h) {
  hideTip();
  viewerId = h.id;
  const src = srcOf(h);
  const list = doneList();
  const idx = list.findIndex((x) => x.id === h.id);
  $('#viewerMedia').innerHTML = `<video src="${src}" controls autoplay loop playsinline></video>
    ${list.length > 1 ? `<button class="nav prev" data-step="-1" data-tip="Anterior (←)" ${idx <= 0 ? 'disabled' : ''}>${ICON.chevL}</button><button class="nav next" data-step="1" data-tip="Siguiente (→)" ${idx >= list.length - 1 ? 'disabled' : ''}>${ICON.chevR}</button>` : ''}`;
  const when = new Date(h.createdAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  const s = h.settings;
  $('#viewerInfo').innerHTML = `
    <h3>Descripción</h3>
    <p class="full-prompt">${esc(h.prompt)}</p>
    <h3>Detalles</h3>
    <dl class="kv">
      <dt>Modo</dt><dd>${MODE_NAMES[h.mode]}</dd>
      ${h.mode !== 'video' ? `<dt>Duración</dt><dd>${s.duration} s</dd>` : ''}
      <dt>Calidad</dt><dd>${resLabel(s.resolution)}</dd>
      <dt>Formato</dt><dd>${s.aspect_ratio === '9:16' ? 'Vertical 9:16' : 'Horizontal 16:9'}</dd>
      ${s.seed != null ? `<dt>Semilla</dt><dd>${s.seed}</dd>` : ''}
      <dt>Créditos</dt><dd>${h.credits ?? '—'}</dd>
      ${h.costTime ? `<dt>Tardó</dt><dd>${fmtClock(h.costTime)} min</dd>` : ''}
      <dt>Creado</dt><dd>${when}</dd>
      <dt>Guardado</dt><dd>${h.localFile ? 'En tu PC ✓' : 'Solo en Kie (14 días)'}</dd>
    </dl>
    <div class="viewer-actions">
      <a class="btn primary" href="${src}" download>${ICON.download} Descargar</a>
      <button class="btn" id="vReuse" data-tip="Lleva esta idea al panel para cambiarla">${ICON.reuse} Crear otra versión</button>
      <button class="btn" id="vCopy">${ICON.copy} Copiar descripción</button>
    </div>`;
  $('#vReuse').onclick = () => reuse(h);
  $('#vCopy').onclick = (ev) => navigator.clipboard.writeText(h.prompt).then(() => { ev.currentTarget.innerHTML = `${ICON.check} Copiado`; });
  openModal($('#viewer'));
}
function stepViewer(d) {
  const list = doneList();
  const i = list.findIndex((x) => x.id === viewerId) + d;
  if (list[i]) openViewer(list[i]);
}
$('#viewerMedia').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (b) stepViewer(Number(b.dataset.step)); });
function closeViewer() {
  viewerId = null;
  closeModal($('#viewer'), () => ($('#viewerMedia').innerHTML = ''));
}
$('#viewerClose').addEventListener('click', closeViewer);
$('#viewer').addEventListener('click', (e) => { if (e.target.id === 'viewer') closeViewer(); });

// ---------- Sincronización en vivo ----------
function upsert(item, { quiet = false } = {}) {
  const prev = state.items.get(item.id);
  state.items.set(item.id, item);
  if (quiet || !prev || prev.state === item.state || !state.loaded) return;
  if (item.state === 'done') {
    toast('🎬 ¡Tu video está listo!', 'ok', { ms: 6000, action: { label: 'Ver', fn: () => openViewer(state.items.get(item.id)) } });
    notify(item);
  }
  if (item.state === 'failed') toast(item.error || 'Un video no se pudo crear.', 'error', { ms: 7000 });
}
function notify(h) {
  if (document.hasFocus() || !('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification('Tu video está listo', { body: h.prompt.slice(0, 90), icon: '/favicon.svg' });
  n.onclick = () => { window.focus(); openViewer(state.items.get(h.id)); };
}
async function loadHistory() {
  const data = await api('/api/history');
  const fresh = new Map(data.items.map((h) => [h.id, h]));
  for (const id of [...state.items.keys()]) if (!fresh.has(id)) state.items.delete(id);
  data.items.forEach((h) => upsert(h));
  state.queue = data.queue;
  if (data.credits != null) setCredits(data.credits);
  const first = !state.loaded;
  state.loaded = true;
  if (first) $('#skeletonGrid').remove();
  renderGallery();
  updateGenerate();
}

let es = null, rendering = false;
const scheduleRender = () => { if (rendering) return; rendering = true; requestAnimationFrame(() => { rendering = false; renderGallery(); updateGenerate(); }); };
function connect() {
  es = new EventSource('/api/events');
  es.addEventListener('hello', (e) => {
    const d = JSON.parse(e.data);
    state.queue = d.queue;
    if (d.credits != null) setCredits(d.credits);
    setLive(true);
    loadHistory().catch(() => {});
  });
  es.addEventListener('item', (e) => { upsert(JSON.parse(e.data)); scheduleRender(); });
  es.addEventListener('remove', (e) => { state.items.delete(JSON.parse(e.data).id); scheduleRender(); });
  es.addEventListener('queue', (e) => { state.queue = JSON.parse(e.data); scheduleRender(); });
  es.addEventListener('credits', (e) => setCredits(JSON.parse(e.data).credits));
  es.onerror = () => setLive(false);
}
let offlineToast = null;
function setLive(on) {
  const dot = $('#liveDot');
  dot.classList.toggle('off', !on);
  dot.dataset.tip = on ? 'Conectado: todo se actualiza solo, sin recargar la página.' : 'Se perdió la conexión con el estudio. Reintentando… (¿cerraste la ventana negra?)';
  if (!on && !offlineToast) { offlineToast = setTimeout(() => toast('Se perdió la conexión con el estudio. Reintentando…', 'error', { ms: 5000 }), 3000); }
  if (on) { clearTimeout(offlineToast); offlineToast = null; }
}

// ---------- Inicio ----------
restoreSlots();
autoGrow();
syncAll();
setMode(state.mode, { animate: false });
document.fonts?.ready.then(() => positionIndicator(false));
requestAnimationFrame(() => document.body.classList.remove('booting'));
loadConfig().catch(() => toast('No se pudo hablar con el estudio. ¿Está abierta la ventana negra?', 'error'));
connect();
