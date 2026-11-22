// OmniFlash Studio — interfaz
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const UPLOAD_TTL = 23 * 3600 * 1000;
const RESULT_TTL = 13.5 * 24 * 3600 * 1000;

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
  star: '<svg class="i" viewBox="0 0 24 24"><path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5Z"/></svg>',
  extend: '<svg class="i" viewBox="0 0 24 24"><path d="M3 12h13m0 0-4-4m4 4-4 4M20 5v14"/></svg>',
  hq: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 9v6m0-3h3m0-3v6m4-6h2a2 2 0 0 1 0 6h-2V9Z"/></svg>',
  sparkle: '<svg class="i" viewBox="0 0 24 24"><path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z"/></svg>',
  compare: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="16" rx="2"/><rect x="13" y="4" width="8" height="16" rx="2"/></svg>',
  sound: '<svg class="i" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  mute: '<svg class="i" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="m17 9 4 6m0-6-4 6"/></svg>',
};

const MODES = {
  text: 'Describe la escena y la IA crea el video desde cero.',
  images: 'Sube imágenes (personajes, productos, lugares) y el video las usará como referencia.',
  frames: 'Elige cómo empieza el video y, si quieres, cómo termina. La IA crea lo que pasa en medio.',
  video: 'Sube un video corto y describe cómo quieres transformarlo.',
};
const MODE_NAMES = { text: 'Texto', images: 'Imágenes', frames: 'Inicio y fin', video: 'Video', extend: 'Continuación', upscale: 'Mejorado' };
const MODEL_INFO = {
  '1.2': { durations: [4, 6, 8, 10, 12, 15], maxImg: 6, maxChar: 2, maxVideo: 15, seedMin: 10000, seedMax: 99999 },
  '1.1': { durations: [4, 6, 8, 10], maxImg: 7, maxChar: 3, maxVideo: 30, seedMin: 0, seedMax: 2147483647 },
};
const VOICES = [
  ['sulafat', 'cálida'], ['achird', 'amigable'], ['callirrhoe', 'tranquila'], ['umbriel', 'relajada'], ['vindemiatrix', 'gentil'],
  ['achernar', 'suave'], ['algieba', 'suave'], ['despina', 'suave'], ['aoede', 'ligera'], ['leda', 'juvenil'],
  ['puck', 'animada'], ['laomedeia', 'animada'], ['sadachbia', 'vivaz'], ['fenrir', 'emocionada'], ['zephyr', 'brillante'],
  ['autonoe', 'brillante'], ['iapetus', 'clara'], ['erinome', 'clara'], ['charon', 'informativa'], ['rasalgethi', 'informativa'],
  ['sadaltager', 'experta'], ['kore', 'firme'], ['orus', 'firme'], ['alnilam', 'firme'], ['schedar', 'pareja'],
  ['pulcherrima', 'directa'], ['zubenelgenubi', 'casual'], ['gacrux', 'madura'], ['algenib', 'ronca'], ['enceladus', 'susurrante'],
];

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

// ---------- Estado ----------
const saved = JSON.parse(localStorage.getItem('ofs-settings') || '{}');
const state = {
  model: saved.model || '1.2',
  mode: saved.mode || 'text',
  duration: saved.duration || '6',
  ratio: saved.ratio || '16:9',
  resolution: saved.resolution || '720p',
  count: saved.count || '1',
  targetProject: saved.targetProject || '',
  selectedChars: new Set(saved.selectedChars || []),
  images: [], first: null, last: null, video: null,
  prices: null,
  credits: null,
  spending: null,
  items: new Map(),
  characters: [], recipes: [], projects: [],
  queue: { maxConcurrent: 2, paused: false, pauseReason: '', queued: 0, active: 0 },
  filter: 'all', projectFilter: '__all', search: '',
  selectMode: false, selected: new Set(),
  busy: false, loaded: false, hasKey: true, isLocal: true,
};
const persist = () => localStorage.setItem('ofs-settings', JSON.stringify({
  model: state.model, mode: state.mode, duration: state.duration, ratio: state.ratio, resolution: state.resolution,
  count: state.count, targetProject: state.targetProject, selectedChars: [...state.selectedChars],
}));
const mi = () => MODEL_INFO[state.model];

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
const post = (path, body, method = 'POST') => api(path, { method, body: JSON.stringify(body || {}) });

// ---------- Avisos ----------
function toast(msg, type = 'ok', { ms = 4200, action } = {}) {
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
  if (!text || !el.isConnected) return;
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
  if (!el || e.pointerType === 'touch' || !el.dataset.tip) return;
  tipTarget = el;
  tipTimer = setTimeout(() => showTip(el), Date.now() < tipWarmUntil ? 0 : 420);
});
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.confirm')) hideTip(); });
document.addEventListener('scroll', hideTip, true);
document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el && el.matches(':focus-visible')) { hideTip(); tipTarget = el; showTip(el); } });
document.addEventListener('focusout', hideTip);

// ---------- Modales ----------
const openModals = [];
function openModal(el) {
  hideTip();
  el.hidden = false;
  el.classList.remove('closing');
  if (!openModals.includes(el)) openModals.push(el);
}
function closeModal(el, after) {
  if (el.hidden) return;
  const i = openModals.indexOf(el);
  if (i >= 0) openModals.splice(i, 1);
  el.classList.add('closing');
  setTimeout(() => { el.hidden = true; el.classList.remove('closing'); after?.(); }, reduceMotion ? 0 : 200);
}
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-close]');
  if (c) { const m = c.closest('.modal'); if (m.id === 'viewer') closeViewer(); else if (m.id === 'compare') closeCompare(); else closeModal(m); }
  else if (e.target.classList?.contains('modal') && e.target.id !== 'keyModal') {
    if (e.target.id === 'viewer') closeViewer(); else if (e.target.id === 'compare') closeCompare(); else closeModal(e.target);
  }
});
// Pregunta corta (en vez de la ventanita del navegador)
function ask(title, { placeholder = '', value = '', ok = 'Guardar' } = {}) {
  return new Promise((resolve) => {
    $('#askTitle').textContent = title;
    const input = $('#askInput');
    input.placeholder = placeholder; input.value = value;
    $('#askOk').textContent = ok;
    openModal($('#ask'));
    setTimeout(() => input.focus(), 60);
    const form = $('#askForm');
    const done = (v) => { form.onsubmit = null; observer.disconnect(); closeModal($('#ask')); resolve(v); };
    form.onsubmit = (e) => { e.preventDefault(); const v = input.value.trim(); if (v) done(v); else input.focus(); };
    const observer = new MutationObserver(() => { if ($('#ask').classList.contains('closing') && form.onsubmit) { form.onsubmit = null; observer.disconnect(); resolve(null); } });
    observer.observe($('#ask'), { attributes: true, attributeFilter: ['class'] });
  });
}

// ---------- Créditos, cuenta y gastos ----------
const formatNum = (n) => Number(n).toLocaleString('es', { maximumFractionDigits: 1 });
function setCredits(c) {
  if (c == null) return;
  const prev = state.credits;
  state.credits = c;
  const el = $('#creditsText');
  el.textContent = `${formatNum(c)} créditos`;
  if (prev != null && prev !== c) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  $('#accCredits').textContent = formatNum(c);
  $('#accDollars').textContent = `≈ $${(c * 0.005).toFixed(2)} USD`;
  updateCost();
}
async function loadConfig() {
  const cfg = await api('/api/config');
  state.prices = cfg.prices;
  state.hasKey = cfg.hasKey;
  state.keyHint = cfg.keyHint;
  state.isLocal = cfg.isLocal;
  $('#keyCurrent').textContent = cfg.keyHint ? `Llave actual: ${cfg.keyHint}` : '';
  document.body.classList.toggle('remote', !cfg.isLocal);
  if (!cfg.hasKey) { openModal($('#keyModal')); setTimeout(() => $('#keyInput').focus(), 60); $('#creditsText').textContent = 'Sin conectar'; }
  updateCost();
}
async function refreshCredits(manual = false) {
  const btn = $('#accRefresh');
  btn.disabled = true;
  try {
    const { credits } = await api('/api/credits');
    setCredits(credits);
    if (manual) toast('Créditos actualizados');
  } catch (e) {
    if (manual) toast(e.message, 'error');
  } finally { btn.disabled = false; }
}
function bindKeyForm(form, onOk) {
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const input = form.querySelector('input'), btn = form.querySelector('button'), err = form.nextElementSibling;
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Comprobando…'; err.hidden = true;
    try {
      const { credits } = await post('/api/config', { apiKey: input.value });
      input.value = '';
      state.hasKey = true;
      setCredits(credits);
      loadConfig();
      onOk?.();
      toast(`¡Conectado! Tienes ${formatNum(credits)} créditos.`);
    } catch (e) {
      err.textContent = e.message; err.hidden = false;
      form.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 280 });
    } finally { btn.disabled = false; btn.textContent = label; }
  });
}
bindKeyForm($('#keyForm'), () => closeModal($('#keyModal')));
bindKeyForm($('#keyForm2'));

function renderSpending() {
  const s = state.spending;
  if (!s) return;
  $('#spToday').textContent = formatNum(s.today);
  $('#spWeek').textContent = formatNum(s.week);
  $('#spTotal').textContent = formatNum(s.total);
  $('#spVideos').textContent = s.videos;
  const max = Math.max(1, ...s.days.map((d) => d.credits));
  $('#spBars').innerHTML = s.days.map((d, i) => `<div class="bar-col ${i === 6 ? 'today' : ''}" data-tip="${esc(d.day)}: ${formatNum(d.credits)} créditos ($${(d.credits * 0.005).toFixed(2)})">
      <div class="bar-fill" style="height:${Math.max(3, (d.credits / max) * 100)}%"></div><span>${esc(d.day.replace('.', ''))}</span></div>`).join('');
  if (document.activeElement !== $('#limitInput')) $('#limitInput').value = s.dailyLimit || '';
  $('#limitText').textContent = s.dailyLimit
    ? `Hoy llevas ${formatNum(s.today)} de ${formatNum(s.dailyLimit)} créditos (${Math.min(100, Math.round((s.today / s.dailyLimit) * 100))}%).`
    : 'Sin límite: la cola nunca se pausa por gasto.';
}
function openAccount() {
  openModal($('#account'));
  renderSpending();
  refreshCredits();
}
$('#creditsBtn').addEventListener('click', openAccount);
$('#settingsBtn').addEventListener('click', openAccount);
$('#accRefresh').addEventListener('click', () => refreshCredits(true));
$('#limitSave').addEventListener('click', async () => {
  try {
    const { dailyLimit } = await post('/api/settings', { dailyLimit: Number($('#limitInput').value) || 0 });
    toast(dailyLimit ? `Límite guardado: ${formatNum(dailyLimit)} créditos por día` : 'Límite quitado');
  } catch (e) { toast(e.message, 'error'); }
});
$('#folderBtn').addEventListener('click', () => api('/api/open-folder', { method: 'POST' }).then(() => toast('Abriendo la carpeta de videos…', 'info')).catch((e) => toast(e.message, 'error')));

// ---------- Celular ----------
async function renderPhone(info) {
  info = info || (await api('/api/lan'));
  $('#lanToggle').checked = info.enabled;
  $('#lanToggle').disabled = !state.isLocal;
  $('#lanOnlyPc').hidden = state.isLocal;
  $('#qrBox').hidden = !info.enabled || !info.url;
  if (info.enabled && info.url && window.qrcode) {
    const qr = window.qrcode(0, 'M');
    qr.addData(info.url);
    qr.make();
    $('#qr').innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
    $('#lanUrl').textContent = info.url.replace(/\?t=.*/, '');
  }
  if (info.enabled && !info.ip) toast('No encontré tu red Wi-Fi. ¿La computadora está conectada?', 'error');
}
$('#phoneBtn').addEventListener('click', () => { openModal($('#phone')); renderPhone().catch((e) => toast(e.message, 'error')); });
$('#lanToggle').addEventListener('change', async (e) => {
  try {
    const info = await post('/api/lan', { enabled: e.target.checked });
    renderPhone(info);
    if (info.enabled) toast('Listo. Escanea el código con tu celular.', 'info');
  } catch (err) { toast(err.message, 'error'); e.target.checked = !e.target.checked; }
});
$('#lanNewToken').addEventListener('click', async () => {
  const info = await post('/api/lan', { newToken: true });
  renderPhone(info);
  toast('Código cambiado. El anterior ya no funciona.', 'info');
});

// ---------- Modelo y modos ----------
function positionIndicator(animate = true) {
  const on = $(`#modes button[data-mode="${state.mode}"]`);
  const ind = $('#modeIndicator');
  if (!on) return;
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
  if (changedMode && animate && !reduceMotion) help.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
  help.textContent = MODES[mode];
  swapUploads(animate && changedMode);
  refreshForm();
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

// Todo lo que depende del modelo y del modo
function refreshForm() {
  const info = mi();
  // Duraciones
  const seg = $('#durationSeg');
  const maxDur = state.model === '1.2' && state.mode === 'frames' && state.last ? 10 : 99;
  if (seg.dataset.model !== state.model) {
    seg.innerHTML = info.durations.map((d) => `<button data-value="${d}">${d} s</button>`).join('');
    seg.dataset.model = state.model;
  }
  if (!info.durations.includes(Number(state.duration))) state.duration = String(info.durations.reduce((a, b) => (Math.abs(b - state.duration) < Math.abs(a - state.duration) ? b : a)));
  if (Number(state.duration) > maxDur) state.duration = '10';
  const isVideo = state.mode === 'video';
  $$('button', seg).forEach((b) => { b.disabled = isVideo || Number(b.dataset.value) > maxDur; b.classList.toggle('on', b.dataset.value === String(state.duration)); });
  $('#durationHint').textContent = isVideo ? (state.model === '1.2' ? 'Igual a la de tu video' : 'La elige la IA') : maxDur === 10 ? 'Máx. 10 s con último cuadro' : '';
  // Semilla
  $('#seed').min = info.seedMin; $('#seed').max = info.seedMax;
  $('#seedInfo').dataset.tip = `Es como el número de una receta: con la misma descripción y el mismo número, el resultado sale parecido. Con este modelo va de ${info.seedMin.toLocaleString('es')} a ${info.seedMax.toLocaleString('es')}. Déjalo vacío para que sea al azar.`;
  // Personajes
  const charsAllowed = state.mode !== 'frames';
  $('#charField').classList.toggle('disabled', !charsAllowed);
  $('#charHint').textContent = !charsAllowed ? 'No se pueden usar con «Inicio y fin»' : `Hasta ${info.maxChar} a la vez`;
  if (state.selectedChars.size > info.maxChar) state.selectedChars = new Set([...state.selectedChars].slice(0, info.maxChar));
  renderChars();
  persist();
  updateCost();
  updateGenerate();
}

// ---------- Selectores ----------
const syncs = {};
function bindSeg(id, key, after) {
  const seg = $(id);
  const sync = () => $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.value === String(state[key])));
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    state[key] = b.dataset.value;
    persist(); sync(); after ? after() : (updateCost(), updateGenerate());
  });
  syncs[key] = sync;
  sync();
}
bindSeg('#modelSeg', 'model', () => { swapUploads(state.mode === 'video'); refreshForm(); });
bindSeg('#ratioSeg', 'ratio');
bindSeg('#durationSeg', 'duration');
bindSeg('#resSeg', 'resolution');
bindSeg('#countSeg', 'count');
const syncAll = () => Object.values(syncs).forEach((f) => f());

$('#advanced summary').addEventListener('click', (e) => {
  const d = $('#advanced'), body = $('.advanced-body', d);
  if (reduceMotion) return;
  e.preventDefault();
  if (d.open) {
    const a = body.animate([{ height: `${body.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 220, easing: EASE });
    a.onfinish = () => { d.open = false; };
  } else {
    d.open = true;
    body.animate([{ height: '0px', opacity: 0 }, { height: `${body.offsetHeight}px`, opacity: 1 }], { duration: 260, easing: EASE });
  }
});

// ---------- Costo y botón ----------
function costFor({ model, resolution, duration, mode, videoSeconds }) {
  const P = state.prices;
  if (!P) return 0;
  if (model === '1.1') {
    const t = resolution === '4k' ? '4k' : 'normal';
    return mode === 'video' ? P['1.1'].withVideo[t] : P['1.1'][t][duration] ?? 0;
  }
  const s = mode === 'video' ? videoSeconds || 0 : Number(duration);
  return Math.round(s * P['1.2'].perSecond[resolution]);
}
const unitCost = () => costFor({ model: state.model, resolution: state.resolution, duration: state.duration, mode: state.mode, videoSeconds: Math.round(state.video?.length || 0) });
function updateCost() {
  if (!state.prices) return;
  const c = unitCost(), n = Number(state.count), t = c * n;
  const unknownVideo = state.mode === 'video' && state.model === '1.2' && !state.video;
  $('#costText').textContent = unknownVideo ? 'Sube un video para ver el precio' : `${n > 1 ? `${n} × ${c} = ` : ''}${formatNum(t)} créditos · $${(t * 0.005).toFixed(2)}`;
  const low = state.credits != null && state.credits < t;
  $('#costText').classList.toggle('warn', low);
  $('#costText').dataset.tip = low
    ? `Te faltan ${formatNum(t - state.credits)} créditos. Los videos esperarán en la cola hasta que recargues en kie.ai.`
    : state.model === '1.2' ? `El modelo 1.2 cobra por segundo de video (${state.prices['1.2'].perSecond[state.resolution]} créditos por segundo en ${state.resolution}). 1 crédito = $0.005` : 'Lo que te cobrará Kie. 1 crédito = $0.005';
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
function setPrompt(v) { promptEl.value = v; promptEl.dispatchEvent(new Event('input')); }

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
  setPrompt(v);
});
let ideaIdx = Math.floor(Math.random() * IDEAS.length);
$('#ideaBtn').addEventListener('click', () => {
  ideaIdx = (ideaIdx + 1) % IDEAS.length;
  setPrompt(IDEAS[ideaIdx]);
  if (!reduceMotion) promptEl.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 300 });
  promptEl.focus();
});
$('#diceBtn').addEventListener('click', () => { const i = mi(); $('#seed').value = i.seedMin + Math.floor(Math.random() * (i.seedMax - i.seedMin)); });

// Mejorar con IA (con deshacer)
async function improveText(textarea, mode, btn, duration) {
  const before = textarea.value;
  if (!before.trim()) { nudge(textarea.closest('.prompt-box') || textarea); return toast('Escribe primero una idea, aunque sea corta.', 'error'); }
  btn.classList.add('busy'); btn.disabled = true;
  textarea.classList.add('thinking');
  try {
    const names = state.characters.filter((c) => state.selectedChars.has(c.id)).map((c) => c.name);
    const { prompt, credits } = await post('/api/improve-prompt', { prompt: before, mode, characters: mode === 'extend' ? [] : names, duration });
    textarea.value = prompt;
    textarea.dispatchEvent(new Event('input'));
    if (!reduceMotion) textarea.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 400 });
    toast(`Descripción mejorada${credits != null ? ` (usó ${formatNum(credits)} créditos)` : ''}`, 'ok', {
      ms: 8000, action: { label: 'Deshacer', fn: () => { textarea.value = before; textarea.dispatchEvent(new Event('input')); } },
    });
  } catch (e) { toast(e.message, 'error', { ms: 6000 }); }
  finally { btn.classList.remove('busy'); btn.disabled = false; textarea.classList.remove('thinking'); }
}
$('#improveBtn').addEventListener('click', (e) => improveText(promptEl, state.mode, e.currentTarget, state.duration));

// ---------- Personajes ----------
function renderChars() {
  const row = $('#charRow');
  const max = mi().maxChar;
  if (!state.characters.length) {
    row.innerHTML = `<button type="button" class="char-empty" data-new-char>${ICON.plus}<span>Crea tu primer personaje para que salga igual en todos tus videos</span></button>`;
    return;
  }
  const full = state.selectedChars.size >= max;
  row.innerHTML = state.characters.map((c) => {
    const on = state.selectedChars.has(c.id);
    const voice = VOICES.find((v) => v[0] === c.voice);
    return `<button type="button" class="char-chip ${on ? 'on' : ''}" data-char="${c.id}" ${!on && full ? 'data-full' : ''}
      data-tip="${esc(c.description)}${voice ? ` · Voz ${voice[1]}` : ''}. ${on ? 'Clic para quitarlo de este video.' : 'Clic para usarlo en este video.'}">
      <span class="avatar">${c.preview ? `<img src="${c.preview}" alt="">` : esc(c.name[0])}</span><span>${esc(c.name)}</span>${on ? ICON.check : ''}</button>`;
  }).join('');
}
$('#charRow').addEventListener('click', (e) => {
  if (e.target.closest('[data-new-char]')) return openCharModal();
  const b = e.target.closest('[data-char]');
  if (!b || $('#charField').classList.contains('disabled')) return;
  const id = b.dataset.char;
  if (state.selectedChars.has(id)) state.selectedChars.delete(id);
  else {
    if (state.selectedChars.size >= mi().maxChar) return toast(`Con este modelo puedes usar hasta ${mi().maxChar} personajes a la vez.`, 'info');
    state.selectedChars.add(id);
    const c = state.characters.find((x) => x.id === id);
    if (c && !norm(promptEl.value).includes(norm(c.name))) toast(`Menciona a «${c.name}» en la descripción para decir qué hace.`, 'info');
  }
  hideTip(); persist(); renderChars();
});
$('#newCharBtn').addEventListener('click', () => openCharModal());

const charDraft = { portrait: null, body: null };
$('#charVoice').innerHTML = `<option value="">Sin voz (no habla)</option>` + VOICES.map(([id, tone]) => `<option value="${id}">${id[0].toUpperCase() + id.slice(1)} — ${tone}</option>`).join('');
function openCharModal() {
  charDraft.portrait = null; charDraft.body = null;
  ['portrait', 'body'].forEach(paintPhoto);
  $('#charName').value = ''; $('#charDesc').value = ''; $('#charVoice').value = ''; $('#charVoiceDesc').value = '';
  $('#charError').hidden = true;
  renderCharList();
  openModal($('#charModal'));
  setTimeout(() => $('#charName').focus(), 60);
}
function paintPhoto(kind) {
  const drop = $(kind === 'portrait' ? '#portraitDrop' : '#bodyDrop');
  const s = charDraft[kind];
  drop.classList.toggle('has', !!s);
  drop.querySelector('.ph-img')?.remove();
  drop.querySelector('.state')?.remove();
  if (!s) return;
  drop.insertAdjacentHTML('beforeend', `<img class="ph-img" src="${s.preview}" alt="">${s.uploading ? '<div class="state"><div class="spinner"></div></div>' : s.error ? `<div class="state err">${esc(s.error)}</div>` : ''}`);
}
$('#charModal').addEventListener('change', async (e) => {
  const input = e.target.closest('[data-photo]');
  if (!input || !input.files[0]) return;
  const kind = input.dataset.photo, file = input.files[0];
  input.value = '';
  if (!file.type.startsWith('image/')) return toast('Ese archivo no es una imagen.', 'error');
  const slot = { id: ++uid, preview: await makeThumb(file, 360), uploading: true };
  charDraft[kind] = slot;
  paintPhoto(kind);
  try { const { url } = await uploadFile(file, slot); slot.url = url; }
  catch (err) { slot.error = 'No se pudo subir'; toast(err.message, 'error'); }
  slot.uploading = false;
  if (charDraft[kind] === slot) paintPhoto(kind);
});
function renderCharList() {
  $('#charList').innerHTML = state.characters.length
    ? `<span class="muted small">Tus personajes:</span>` + state.characters.map((c) => `<span class="mini-char"><span class="avatar">${c.preview ? `<img src="${c.preview}" alt="">` : esc(c.name[0])}</span>${esc(c.name)}<button data-del-char="${c.id}" data-tip="Quitar de tu lista">${ICON.x}</button></span>`).join('')
    : '';
}
$('#charList').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del-char]');
  if (!b) return;
  if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.dataset.tip = 'Clic otra vez para quitarlo'; hideTip(); tipTarget = b; showTip(b); setTimeout(() => b.isConnected && b.classList.remove('confirm'), 3000); return; }
  hideTip();
  await api(`/api/characters/${b.dataset.delChar}`, { method: 'DELETE' });
  state.selectedChars.delete(b.dataset.delChar);
});
$('#charSave').addEventListener('click', async () => {
  const btn = $('#charSave'), err = $('#charError');
  err.hidden = true;
  const p = charDraft.portrait, b = charDraft.body;
  const fail = (m) => { err.textContent = m; err.hidden = false; nudge(err); };
  if (p?.uploading || b?.uploading) return fail('Espera a que terminen de subirse las fotos.');
  if (!p?.url) return fail('Sube una foto de la cara del personaje.');
  btn.disabled = true; btn.textContent = 'Creando…';
  try {
    const ch = await post('/api/characters', {
      name: $('#charName').value, description: $('#charDesc').value, portraitUrl: p.url, bodyUrl: b?.url || '',
      voice: $('#charVoice').value, voiceDescription: $('#charVoiceDesc').value, preview: await makeThumb(dataUrlToBlob(p.preview), 120),
    });
    if (state.mode !== 'frames' && state.selectedChars.size < mi().maxChar) state.selectedChars.add(ch.id);
    persist();
    closeModal($('#charModal'));
    toast(`¡${ch.name} está listo! Menciónalo en la descripción.`);
  } catch (e) { fail(e.message); }
  finally { btn.disabled = false; btn.textContent = 'Crear personaje'; }
});
function dataUrlToBlob(d) {
  const [h, b] = d.split(',');
  const bin = atob(b);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: h.match(/:(.*?);/)[1] });
}

// ---------- Recetas ----------
function renderRecipes() {
  $('#recipeList').innerHTML = state.recipes.length
    ? state.recipes.map((r) => {
      const d = r.data || {};
      return `<div class="recipe" data-recipe="${r.id}">
        <div><b>${esc(r.name)}</b><span>${esc(MODE_NAMES[d.mode] || '')} · Omni ${esc(d.model || '1.2')} · ${esc(d.duration || '')} s · ${esc(d.resolution || '')}</span><p>${esc((d.prompt || '').slice(0, 90))}${(d.prompt || '').length > 90 ? '…' : ''}</p></div>
        <button class="icon-btn" data-del-recipe="${r.id}" data-tip="Borrar receta">${ICON.trash}</button>
      </div>`;
    }).join('')
    : '<p class="muted small pop-empty">Aún no tienes recetas. Cuando una descripción te salga bien, guárdala aquí para repetirla con un clic.</p>';
}
function toggleRecipes(force) {
  const pop = $('#recipesPop');
  const open = force ?? pop.hidden;
  if (!open) { pop.hidden = true; return; }
  renderRecipes();
  pop.hidden = false;
  const r = $('#recipesBtn').getBoundingClientRect();
  const w = pop.offsetWidth;
  pop.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w))}px`;
  pop.style.top = `${r.bottom + 8}px`;
  if (!reduceMotion) pop.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: EASE });
}
$('#recipesBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleRecipes(); });
document.addEventListener('click', (e) => { if (!$('#recipesPop').hidden && !e.target.closest('#recipesPop, #recipesBtn, #ask')) toggleRecipes(false); });
$('#recipeSave').addEventListener('click', async () => {
  if (!promptEl.value.trim()) return toast('Escribe una descripción antes de guardarla.', 'error');
  toggleRecipes(false);
  const name = await ask('Nombre de la receta', { placeholder: 'Ej.: Anuncio de producto vertical' });
  if (!name) return;
  try {
    await post('/api/recipes', { name, data: { prompt: promptEl.value, mode: state.mode, model: state.model, duration: state.duration, ratio: state.ratio, resolution: state.resolution, count: state.count, chars: [...state.selectedChars] } });
    toast(`Receta «${name}» guardada`);
  } catch (e) { toast(e.message, 'error'); }
});
$('#recipeList').addEventListener('click', async (e) => {
  const del = e.target.closest('[data-del-recipe]');
  if (del) { e.stopPropagation(); hideTip(); await api(`/api/recipes/${del.dataset.delRecipe}`, { method: 'DELETE' }); return; }
  const row = e.target.closest('[data-recipe]');
  if (!row) return;
  const r = state.recipes.find((x) => x.id === row.dataset.recipe);
  const d = r.data || {};
  Object.assign(state, { model: d.model || '1.2', duration: d.duration || state.duration, ratio: d.ratio || state.ratio, resolution: d.resolution || state.resolution, count: d.count || '1' });
  state.selectedChars = new Set((d.chars || []).filter((id) => state.characters.some((c) => c.id === id)));
  setPrompt(d.prompt || '');
  syncAll();
  setMode(d.mode || 'text');
  toggleRecipes(false);
  flashComposer();
  toast(`Receta «${r.name}» cargada`, 'info');
});

// ---------- Subidas ----------
let uid = 0;
function saveSlots() {
  const keep = (s) => (s && s.url && !s.error ? { url: s.url, preview: s.preview, uploadedAt: s.uploadedAt } : null);
  localStorage.setItem('ofs-uploads', JSON.stringify({
    images: state.images.map(keep).filter(Boolean), first: keep(state.first), last: keep(state.last),
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
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const name = (file.name || 'imagen').replace(/\.[^.]+$/, '');
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
  }
  slot.uploading = false;
  paintSlot(slot);
  saveSlots();
  updateGenerate();
}
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
  if (target === 'last') refreshForm();
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
  if (length > 30.5) { URL.revokeObjectURL(preview); return toast(`Tu video dura ${Math.round(length)} s. El máximo es 30 s (15 s con el modelo 1.2); recórtalo primero.`, 'error', { ms: 6500 }); }
  state.video?.xhr?.abort();
  if (state.video?.preview?.startsWith('blob:')) URL.revokeObjectURL(state.video.preview);
  const slot = { id: ++uid, preview, length, start: 0, ends: Math.min(length || 10, 10), uploading: true, progress: 0 };
  state.video = slot;
  renderUploads();
  updateCost();
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
const imgMax = () => (state.mode === 'video' ? 5 : mi().maxImg);

function renderUploads() {
  const box = $('#uploads');
  const m = state.mode;
  if (m === 'text') box.innerHTML = '';
  else if (m === 'images') {
    const n = state.images.length, max = imgMax();
    box.innerHTML = `<div class="drop-label">Imágenes de referencia <span class="${n > max ? 'over' : ''}">${n}/${max}</span></div>` +
      (n ? `<div class="thumbs">${state.images.map((s, i) => slotHTML(s, { tag: `#${i + 1}`, remove: `img:${s.id}` })).join('')}${n < max ? addTile(max) : ''}</div>`
        : dropHTML('images', 'Arrastra o elige imágenes', 'JPG, PNG o WebP · hasta 20 MB c/u · también Ctrl+V', 'image/*', true));
  } else if (m === 'frames') {
    const part = (key, title) => state[key] ? slotHTML(state[key], { frame: true, tag: title, remove: key }) : dropHTML(key, title, key === 'last' ? 'Opcional' : 'Obligatorio');
    box.innerHTML = `<div class="drop-label">Fotogramas</div><div class="drop-row two">${part('first', 'Primer cuadro')}${part('last', 'Último cuadro')}</div>`;
  } else if (m === 'video') {
    const v = state.video;
    const maxLen = mi().maxVideo;
    if (!v) {
      box.innerHTML = `<div class="drop-label">Video de entrada</div>${dropHTML('video', 'Arrastra o elige un video', `MP4 o MOV · máx. ${maxLen} s y 100 MB`, 'video/*')}`;
    } else {
      const len = v.length || 10;
      const tooLong = state.model === '1.2' && len > 15.5;
      const trim = state.model === '1.1'
        ? `<div class="trim">
          <div class="trim-head"><span>Tramo a usar <button type="button" class="info" data-tip="Mueve los dos puntos para elegir qué parte del video usará la IA. Máximo 10 segundos.">?</button></span><b id="trimText"></b></div>
          <div class="range"><div class="track"></div><div class="sel" id="trimSel"></div>
            <input type="range" id="trimStart" min="0" max="${len}" step="0.1" value="${v.start ?? 0}" aria-label="Inicio del tramo">
            <input type="range" id="trimEnd" min="0" max="${len}" step="0.1" value="${v.ends ?? Math.min(len, 10)}" aria-label="Fin del tramo">
          </div></div>`
        : tooLong ? `<p class="warn-box">${ICON.alert} Tu video dura ${len.toFixed(0)} s y el modelo 1.2 acepta hasta 15 s. Cambia arriba a <b>Omni 1.1</b> para elegir un tramo, o súbelo más corto.</p>`
          : `<p class="muted small">El modelo 1.2 usa el video completo (${len.toFixed(1)} s) y cobra según su duración.</p>`;
      box.innerHTML = `<div class="drop-label">Video de entrada <span>${len.toFixed(1)} s</span></div>
        <div class="video-prev" data-slot="${v.id}">
          <video src="${v.preview}" muted playsinline preload="metadata" id="trimVideo"></video>
          <button class="icon-btn x" type="button" data-remove="video" data-tip="Quitar el video">${ICON.x}</button>
        </div>
        ${trim}
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
  const v = state.video, vid = $('#trimVideo');
  vid?.addEventListener('loadeddata', () => { vid.currentTime = v.start || 0.1; if (!v.thumb) setTimeout(() => { v.thumb = videoThumb(vid); saveSlots(); }, 200); }, { once: true });
  const s = $('#trimStart'), e = $('#trimEnd');
  if (!s) return;
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
    refreshForm();
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
  if (openModals.length) return;
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
    const max = imgMax();
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
    model: state.model, mode: state.mode, prompt: promptEl.value, duration: state.duration, aspect_ratio: state.ratio,
    resolution: state.resolution, seed: $('#seed').value, count: state.count, previews: {}, project: state.targetProject,
    character_ids: state.mode === 'frames' ? [] : [...state.selectedChars].filter((id) => state.characters.some((c) => c.id === id)),
  };
  if (body.character_ids.length) body.previews.chars = state.characters.filter((c) => body.character_ids.includes(c.id)).map((c) => ({ name: c.name, preview: c.preview }));
  if (state.mode === 'images' || state.mode === 'video') {
    const imgs = state.images.filter(ok);
    if (state.mode === 'images' && !imgs.length) throw new Error('Sube al menos una imagen de referencia.');
    if (imgs.length > imgMax()) throw new Error(`Con este modelo caben ${imgMax()} imágenes. Quita algunas.`);
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
    body.video = { url: state.video.url, start: state.video.start, ends: state.video.ends, length: state.video.length };
    body.previews.video = state.video.thumb;
    used.push(state.video);
  }
  if (used.length) body.uploadedAt = Math.min(...used.map((s) => s.uploadedAt || Date.now()));
  return body;
}
function nudge(el) { if (!reduceMotion && el) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 260 }); }
function flashComposer() {
  const comp = $('.composer');
  comp.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (!reduceMotion) comp.animate([{ boxShadow: '0 0 0 2px rgba(139,108,255,.7)' }, { boxShadow: '0 0 0 2px rgba(139,108,255,0)' }], { duration: 1200, easing: 'ease-out' });
}
async function generate() {
  if (state.busy) return;
  if (!state.hasKey) return openModal($('#keyModal'));
  let body;
  try { body = collect(); } catch (e) { nudge($('#uploadsWrap')); return toast(e.message, 'error'); }
  if (!body.prompt.trim()) { nudge($('.prompt-box')); promptEl.focus(); return toast('Escribe qué quieres ver en el video.', 'error'); }
  state.busy = true;
  updateGenerate();
  try {
    const { items } = await post('/api/generate', body);
    items.forEach((it) => upsert(it, { quiet: true }));
    if (state.filter === 'done' || state.filter === 'fav') setFilter('all');
    if (state.projectFilter !== '__all' && state.projectFilter !== (body.project || '__none')) setProjectFilter('__all');
    renderGallery();
    updateGenerate(items.length > 1 ? `✓ ${items.length} en la cola` : '✓ En la cola');
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  } catch (e) {
    toast(e.message, 'error', { ms: 6500 });
  } finally {
    state.busy = false;
    updateGenerate();
  }
}
$('#generateBtn').addEventListener('click', generate);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !openModals.length) { e.preventDefault(); generate(); }
  if (e.key === 'Escape') {
    if (!$('#recipesPop').hidden) return toggleRecipes(false);
    if (state.selectMode && !openModals.length) return setSelectMode(false);
    const top = openModals[openModals.length - 1];
    if (!top || top.id === 'keyModal') return;
    if (top.id === 'viewer') closeViewer(); else if (top.id === 'compare') closeCompare(); else closeModal(top);
  }
  if (!$('#viewer').hidden && openModals.at(-1)?.id === 'viewer' && !e.target.closest('input, textarea') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) stepViewer(e.key === 'ArrowRight' ? 1 : -1);
});

// ---------- Proyectos ----------
function renderProjects() {
  const opts = state.projects.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
  const pf = $('#projectFilter');
  pf.innerHTML = `<option value="__all">Todos los proyectos</option><option value="__none">Sin proyecto</option>${opts}<option value="__new">+ Nuevo proyecto…</option>`;
  pf.value = state.projectFilter === '__all' || state.projectFilter === '__none' || state.projects.includes(state.projectFilter) ? state.projectFilter : '__all';
  const tp = $('#targetProject');
  tp.innerHTML = `<option value="">Sin proyecto</option>${opts}<option value="__new">+ Nuevo proyecto…</option>`;
  if (!state.projects.includes(state.targetProject)) state.targetProject = '';
  tp.value = state.targetProject;
}
async function newProject() {
  const name = await ask('Nuevo proyecto', { placeholder: 'Ej.: Miniserie del robot', ok: 'Crear' });
  if (!name) return null;
  try { state.projects = await post('/api/projects', { name }); renderProjects(); return name; }
  catch (e) { toast(e.message, 'error'); return null; }
}
function setProjectFilter(v) {
  state.projectFilter = v;
  if (v !== '__all' && v !== '__none') { state.targetProject = v; persist(); }
  renderProjects();
  renderGallery();
}
$('#projectFilter').addEventListener('change', async (e) => {
  if (e.target.value === '__new') { const n = await newProject(); setProjectFilter(n || state.projectFilter); return; }
  setProjectFilter(e.target.value);
});
$('#targetProject').addEventListener('change', async (e) => {
  if (e.target.value === '__new') { const n = await newProject(); state.targetProject = n || state.targetProject; }
  else state.targetProject = e.target.value;
  persist(); renderProjects();
});
let searchTimer;
$('#search').addEventListener('input', (e) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.search = norm(e.target.value.trim()); renderGallery(); }, 120); });

// ---------- Tiempos ----------
const BASE_SECONDS = { '360p': 55, '720p': 85, '1080p': 110, '4k': 210 };
function expectedSeconds(h) {
  const res = h.settings?.resolution || '720p';
  if (h.model === 'upscale') return 120;
  const samples = [...state.items.values()].filter((x) => x.state === 'done' && x.costTime && x.model === h.model && x.settings?.resolution === res).slice(0, 8).map((x) => x.costTime).sort((a, b) => a - b);
  if (samples.length >= 2) return samples[Math.floor(samples.length / 2)];
  const d = Number(h.model === 'extend' ? h.addedSeconds : h.settings?.duration || 6);
  return (BASE_SECONDS[res] || 100) * (1 + (d - 4) * 0.08) + (h.mode === 'video' ? 30 : 0);
}
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtLeft = (s) => (s < 45 ? 'menos de 1 min' : `~${Math.round(s / 60)} min`);
function progressOf(h) {
  if (h.state === 'downloading') return 98;
  const el = (Date.now() - (h.sentAt || h.createdAt)) / 1000;
  if (typeof h.progress === 'number' && h.progress > 0) return Math.min(97, h.progress);
  return Math.min(95, 95 * (1 - Math.exp((-1.9 * el) / expectedSeconds(h))));
}
function etaLine(h) {
  const el = (Date.now() - (h.sentAt || h.createdAt)) / 1000;
  const exp = expectedSeconds(h);
  if (h.state === 'downloading') return 'Casi listo';
  if (el < exp) return `Faltan ${fmtLeft(exp - el)}`;
  if (el < 600) return 'Tardando un poco más de lo normal…';
  return 'Kie va lento hoy; seguimos esperando';
}
const queuedOrder = () => [...state.items.values()].filter((h) => h.state === 'queued').sort((a, b) => a.createdAt - b.createdAt);

// ---------- Galería (actualiza solo lo que cambia) ----------
const isWorking = (h) => ['queued', 'sending', 'pending', 'downloading'].includes(h.state);
const srcOf = (h) => (h.localFile ? `/videos/${encodeURIComponent(h.localFile)}` : h.videoUrl);
const thumbOf = (h) => h.previews?.first || h.previews?.video || h.previews?.images?.[0] || h.previews?.chars?.[0]?.preview || '';
const resLabel = (r) => ({ '4k': '4K', '1080P': '1080p', '2K': '2K', '4K': '4K' }[r] || r);
const sigOf = (h) => [h.state, h.localFile, h.error, h.canRetry, h.videoUrl, h.favorite, h.project, h.state === 'pending' ? h.kieState : '', state.selectMode, state.selected.has(h.id)].join('|');
function stageLabel(h) {
  if (h.state === 'queued') return 'En cola';
  if (h.state === 'sending') return 'Enviando';
  if (h.state === 'downloading') return 'Guardando';
  return { waiting: 'En la fila de Kie', queuing: 'En la fila de Kie', generating: h.model === 'upscale' ? 'Mejorando' : 'Generando' }[h.kieState] || 'Enviado';
}
function kindBadge(h) {
  if (h.kind === 'extend') return `<span class="kind" data-tip="Continuación de otro video: incluye el original más ${h.addedSeconds} s nuevos">${ICON.extend} Continuación</span>`;
  if (h.kind === 'upscale') return `<span class="kind" data-tip="El mismo video con más calidad">${ICON.hq} Mejorado ${resLabel(h.settings?.resolution)}</span>`;
  if (h.kind === 'remake') return `<span class="kind" data-tip="La misma idea creada otra vez con más calidad">${ICON.hq} Alta calidad</span>`;
  return '';
}
function cardHTML(h) {
  const s = h.settings || {};
  const modelTag = h.model === '1.1' || h.model === '1.2' ? `<span data-tip="Modelo Omni ${h.model}">${h.model}</span>` : '';
  const meta = `<div class="meta">
      ${modelTag}
      <span>${s.duration ? `${s.duration} s · ` : ''}${resLabel(s.resolution)}${s.aspect_ratio === '9:16' ? ' · 9:16' : ''}</span>
      ${h.batch ? `<span data-tip="Versión ${h.batch.n} de ${h.batch.of} de la misma idea">v${h.batch.n}</span>` : ''}
      ${h.project && state.projectFilter === '__all' ? `<span class="proj" data-tip="Proyecto">${esc(h.project)}</span>` : ''}
    </div>`;
  const thumb = thumbOf(h);
  const kb = kindBadge(h);
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
      <span class="badge right timer" data-live="clock" data-tip="Tiempo que lleva"></span>
      <div class="loading-center"><div class="orb"></div><strong>${h.state === 'sending' ? 'Enviando a Kie…' : h.state === 'downloading' ? 'Guardando en tu PC…' : h.model === 'upscale' ? 'Mejorando la calidad…' : h.model === 'extend' ? 'Continuando tu video…' : 'Creando tu video…'}</strong><span data-live="eta"></span></div>
      <div class="bar"><i data-live="bar"></i></div>
    </div>`;
  } else if (h.state === 'failed') {
    media = `<div class="vmedia failed"><span class="badge fail"><span class="dot"></span>No se pudo crear</span>
      <div class="failed-msg">${esc(h.error || 'La generación falló.')}</div></div>`;
  } else {
    const sel = state.selectMode ? `<span class="pick ${state.selected.has(h.id) ? 'on' : ''}">${ICON.check}</span>` : '';
    media = `<div class="vmedia" data-open="${h.id}" data-tip="${state.selectMode ? 'Clic para elegirlo' : 'Clic para verlo en grande'}">
      ${thumb ? `<img class="bg" src="${thumb}" alt="">` : ''}
      <video class="main" src="${srcOf(h)}#t=0.1" muted loop playsinline preload="metadata"></video>
      <span class="badge right">${resLabel(s.resolution)}</span>
      <span class="play">${ICON.play}</span>${sel}
    </div>`;
  }
  let actions = '';
  if (h.state === 'done') {
    actions += `<button class="icon-btn fav ${h.favorite ? 'on' : ''}" data-act="fav" data-tip="${h.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}">${ICON.star}</button>`;
    actions += `<a class="icon-btn" href="${srcOf(h)}" download data-tip="Descargar a tu computadora">${ICON.download}</a>`;
  }
  if (h.state === 'failed' && h.canRetry) actions += `<button class="icon-btn" data-act="retry" data-tip="Intentar otra vez con lo mismo">${ICON.retry}</button>`;
  if (h.model === '1.1' || h.model === '1.2') actions += `<button class="icon-btn" data-act="reuse" data-tip="Llevar esta idea al panel para cambiarla y crear otra">${ICON.reuse}</button>`;
  if (h.state === 'queued') actions += `<button class="icon-btn danger" data-act="delete" data-tip="Quitar de la cola (no se cobra)">${ICON.x}</button>`;
  else if (h.state === 'done' || h.state === 'failed') actions += `<button class="icon-btn danger" data-act="delete" data-tip="Borrar este video">${ICON.trash}</button>`;
  return `${media}
    <div class="vbody">
      ${kb ? `<div class="kinds">${kb}</div>` : ''}
      <p class="vprompt">${esc(h.prompt)}</p>
      <div class="vfoot">${meta}<div class="actions">${actions}</div></div>
    </div>`;
}

const nodes = new Map();
const sortedItems = () => [...state.items.values()].sort((a, b) => b.createdAt - a.createdAt);
function matchesFilter(h) {
  if (state.filter === 'pending' && !isWorking(h)) return false;
  if (state.filter === 'done' && h.state !== 'done') return false;
  if (state.filter === 'fav' && !h.favorite) return false;
  if (state.projectFilter === '__none' && h.project) return false;
  if (state.projectFilter !== '__all' && state.projectFilter !== '__none' && h.project !== state.projectFilter) return false;
  if (state.search && !norm(h.prompt).includes(state.search)) return false;
  return true;
}
function renderGallery() {
  const grid = $('#grid');
  const list = sortedItems();
  const alive = new Set(list.map((h) => h.id));
  for (const [id, n] of nodes) {
    if (alive.has(id)) continue;
    nodes.delete(id);
    if (reduceMotion || n.el.hidden) n.el.remove();
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
    n.el.classList.toggle('dim', state.selectMode && h.state !== 'done');
    n.el.hidden = !matchesFilter(h);
    const want = prev ? prev.nextSibling : grid.firstChild;
    if (n.el !== want) grid.insertBefore(n.el, want);
    prev = n.el;
  }
  const visible = list.filter(matchesFilter).length;
  $('#empty').hidden = !state.loaded || list.length > 0;
  $('#filterEmpty').hidden = !list.length || visible > 0;
  const inProj = list.filter((h) => state.projectFilter === '__all' || (state.projectFilter === '__none' ? !h.project : h.project === state.projectFilter));
  $('#nAll').textContent = inProj.length || '';
  $('#nPending').textContent = inProj.filter(isWorking).length || '';
  $('#nDone').textContent = inProj.filter((h) => h.state === 'done').length || '';
  $('#nFav').textContent = inProj.filter((h) => h.favorite).length || '';
  tickLive();
  renderQueueBar();
}
function tickLive() {
  const order = queuedOrder();
  for (const [id, n] of nodes) {
    const h = state.items.get(id);
    if (!h || !isWorking(h) || n.el.hidden) continue;
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
  const working = [...state.items.values()].filter((h) => ['sending', 'pending', 'downloading'].includes(h.state)).length;
  const n = working + state.queue.queued;
  document.title = n ? `(${n}) Creando… · OmniFlash Studio` : 'OmniFlash Studio';
}
setInterval(tickLive, 1000);
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
  if (!show) { bar.hidden = true; return; }
  bar.classList.toggle('paused', q.paused);
  const parts = [];
  if (working.length) parts.push(`${working.length} creándose`);
  if (queued.length) parts.push(`${queued.length} en cola`);
  $('#qTitle').textContent = q.paused ? 'Cola en pausa' : parts.join(' · ');
  let sub;
  if (q.paused) sub = q.pauseReason || 'Los videos en cola esperan hasta que la reanudes.';
  else {
    const remaining = working.reduce((a, h) => a + Math.max(20, expectedSeconds(h) - (Date.now() - (h.sentAt || h.createdAt)) / 1000), 0) + queued.reduce((a, h) => a + expectedSeconds(h), 0);
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
  try { state.queue = { ...state.queue, ...(await post('/api/queue', patch)) }; renderQueueBar(); }
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
async function patchItem(h, patch) {
  Object.assign(h, patch);
  renderGallery();
  try { const { item } = await post(`/api/history/${h.id}`, patch, 'PATCH'); upsert(item, { quiet: true }); }
  catch (e) { toast(e.message, 'error'); }
}
grid.addEventListener('click', async (e) => {
  const card = e.target.closest('.vcard');
  if (!card) return;
  const h = state.items.get(card.dataset.id);
  if (!h) return;
  if (e.target.closest('[data-open]')) {
    if (state.selectMode) return toggleSelect(h);
    return openViewer(h);
  }
  const btn = e.target.closest('[data-act]');
  const act = btn?.dataset.act;
  if (act === 'fav') { hideTip(); patchItem(h, { favorite: !h.favorite }); }
  if (act === 'reuse') reuse(h);
  if (act === 'retry') {
    try { const { item } = await post(`/api/history/${h.id}/retry`); upsert(item, { quiet: true }); renderGallery(); toast('Lo puse otra vez en la cola', 'info'); }
    catch (err) { toast(err.message, 'error', { ms: 6500 }); }
  }
  if (act === 'delete') {
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
  setPrompt(h.prompt);
  Object.assign(state, { model: h.model === '1.1' ? '1.1' : '1.2', ratio: h.settings.aspect_ratio, resolution: ['360p', '720p', '1080p', '4k'].includes(h.settings.resolution) ? h.settings.resolution : '720p', count: '1' });
  if (h.mode !== 'video') state.duration = String(h.settings.duration);
  $('#seed').value = h.settings.seed ?? '';
  if (h.inputs?.character_ids?.length) state.selectedChars = new Set(h.inputs.character_ids.filter((id) => state.characters.some((c) => c.id === id)));
  if (h.project) state.targetProject = h.project;
  syncAll(); persist(); renderProjects();
  const fresh = Date.now() - (h.uploadedAt || h.createdAt) < UPLOAD_TTL;
  [state.first, state.last, state.video, ...state.images].forEach((s) => s?.xhr?.abort());
  state.images = []; state.first = null; state.last = null; state.video = null;
  const at = h.uploadedAt || h.createdAt;
  if (fresh) {
    (h.inputs?.image_urls || []).forEach((url, i) => state.images.push({ id: ++uid, url, uploadedAt: at, preview: h.previews?.images?.[i] || '' }));
    if (h.inputs?.first_frame_url) state.first = { id: ++uid, url: h.inputs.first_frame_url, uploadedAt: at, preview: h.previews?.first || '' };
    if (h.inputs?.last_frame_url) state.last = { id: ++uid, url: h.inputs.last_frame_url, uploadedAt: at, preview: h.previews?.last || '' };
    if (h.inputs?.video) { const v = h.inputs.video; state.video = { id: ++uid, url: v.url, preview: v.url, uploadedAt: at, thumb: h.previews?.video, start: v.start ?? 0, ends: v.ends ?? 10, length: h.mode === 'video' ? Number(h.settings.duration) || 10 : 10 }; }
  }
  saveSlots();
  const sameMode = state.mode === h.mode;
  setMode(h.mode);
  if (sameMode) swapUploads(true);
  closeViewer();
  flashComposer();
  const skipped = !fresh && h.mode !== 'text';
  toast(skipped ? 'Idea cargada. Vuelve a subir los archivos: Kie los borra a las 24 horas.' : 'Idea cargada en el panel. Cámbiala y crea otra versión.', 'info', { ms: 5000 });
  promptEl.focus({ preventScroll: true });
}

// ---------- Visor ----------
let viewerId = null;
const doneList = () => sortedItems().filter((h) => h.state === 'done' && matchesFilter(h));
function canExtend(h) { return ['1.2', 'extend'].includes(h.model) && ['360p', '720p'].includes(h.settings?.resolution) && Number(h.settings?.duration) <= 15 && h.taskId && Date.now() - (h.completedAt || h.createdAt) < RESULT_TTL; }
const canRemake = (h) => ['1.1', '1.2'].includes(h.model) && ['360p', '720p'].includes(h.settings?.resolution) && h.canRetry;
const canUpscale = (h) => h.videoUrl && h.model !== 'upscale' && Date.now() - (h.completedAt || h.createdAt) < RESULT_TTL;
function siblings(h) { return h.batch ? sortedItems().filter((x) => x.batch?.id === h.batch.id && x.state === 'done') : []; }

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
  const sib = siblings(h);
  const projOpts = `<option value="">Sin proyecto</option>${state.projects.map((p) => `<option ${p === h.project ? 'selected' : ''} value="${esc(p)}">${esc(p)}</option>`).join('')}<option value="__new">+ Nuevo proyecto…</option>`;
  const remakeCost = (r) => costFor({ model: h.model, resolution: r, duration: s.duration, mode: h.mode, videoSeconds: Number(s.duration) });
  const extRate = state.prices?.['1.2'].perSecond[s.resolution] || 9;
  $('#viewerInfo').innerHTML = `
    <div class="vi-top">
      <button class="icon-btn fav ${h.favorite ? 'on' : ''}" id="vFav" data-tip="${h.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}">${ICON.star}</button>
      <select id="vProject" data-tip="Mover a un proyecto">${projOpts}</select>
    </div>
    ${kindBadge(h) ? `<div class="kinds">${kindBadge(h)}</div>` : ''}
    <h3>Descripción</h3>
    <p class="full-prompt">${esc(h.prompt)}</p>
    <h3>Detalles</h3>
    <dl class="kv">
      <dt>Modelo</dt><dd>${h.model === 'upscale' ? 'Mejora de calidad' : h.model === 'extend' ? 'Omni 1.2 (continuación)' : `Omni ${h.model}`}</dd>
      <dt>Modo</dt><dd>${MODE_NAMES[h.mode] || ''}</dd>
      ${s.duration ? `<dt>Duración</dt><dd>${s.duration} s</dd>` : ''}
      <dt>Calidad</dt><dd>${resLabel(s.resolution)}</dd>
      <dt>Formato</dt><dd>${s.aspect_ratio === '9:16' ? 'Vertical 9:16' : 'Horizontal 16:9'}</dd>
      ${s.seed != null ? `<dt>Semilla</dt><dd>${s.seed}</dd>` : ''}
      ${h.previews?.chars?.length ? `<dt>Personajes</dt><dd>${h.previews.chars.map((c) => esc(c.name)).join(', ')}</dd>` : ''}
      <dt>Créditos</dt><dd>${h.unknownPrice && !h.credits ? 'Kie aún no lo informa' : `${h.estimateOnly && h.state !== 'done' ? '≈ ' : ''}${formatNum(h.credits ?? 0)}`}</dd>
      ${h.costTime ? `<dt>Tardó</dt><dd>${fmtClock(h.costTime)} min</dd>` : ''}
      <dt>Creado</dt><dd>${when}</dd>
      <dt>Guardado</dt><dd>${h.localFile ? 'En tu PC ✓' : 'Solo en Kie (14 días)'}</dd>
    </dl>

    <div class="viewer-actions">
      <a class="btn primary" href="${src}" download>${ICON.download} Descargar</a>
      ${sib.length >= 2 ? `<button class="btn" id="vCompare" data-tip="Ver las ${sib.length} versiones de esta idea lado a lado">${ICON.compare} Comparar las ${sib.length} versiones</button>` : ''}
      ${h.model === '1.1' || h.model === '1.2' ? `<button class="btn" id="vReuse" data-tip="Lleva esta idea al panel para cambiarla">${ICON.reuse} Crear otra versión</button>` : ''}
    </div>

    ${canExtend(h) ? `
    <details class="tool" id="extendTool">
      <summary>${ICON.extend} Continuar este video <span class="tool-hint">Kie lo alarga con una escena nueva</span></summary>
      <div class="tool-body">
        <div class="prompt-box small">
          <textarea id="extPrompt" rows="3" placeholder="¿Qué pasa después? Ej.: el personaje voltea a la cámara y saluda, la cámara se aleja."></textarea>
          <div class="prompt-foot"><span></span><button type="button" class="ai-btn" id="extImprove" data-tip="La IA mejora tu descripción">${ICON.sparkle}<span>Mejorar con IA</span></button></div>
        </div>
        <div class="seg small" id="extDur">${[3, 4, 5, 6, 8, 10].map((d) => `<button data-value="${d}" ${d === 5 ? 'class="on"' : ''}>+${d} s</button>`).join('')}</div>
        <p class="muted small" id="extNote"></p>
        <button class="btn primary" id="extGo">${ICON.extend} Continuar</button>
      </div>
    </details>` : ''}

    ${canRemake(h) ? `
    <details class="tool">
      <summary>${ICON.hq} Recrear en alta calidad <span class="tool-hint">La misma idea, otra vez, más nítida</span></summary>
      <div class="tool-body">
        <p class="muted small">Se vuelve a crear con la misma descripción y semilla, así que sale muy parecido (no idéntico).</p>
        <div class="tool-row">
          <button class="btn" data-remake="1080p">1080p · ${formatNum(remakeCost('1080p'))} créditos</button>
          <button class="btn" data-remake="4k">4K · ${formatNum(remakeCost('4k'))} créditos</button>
        </div>
      </div>
    </details>` : ''}

    ${canUpscale(h) ? `
    <details class="tool">
      <summary>${ICON.sparkle} Mejorar calidad <span class="tool-hint">El mismo video exacto, con más resolución</span></summary>
      <div class="tool-body">
        <p class="muted small">Kie agranda este mismo video sin cambiarlo. <b>Kie no publica el precio</b>; lo verás aquí cuando termine.</p>
        <div class="tool-row">
          <button class="btn" data-upscale="1080P">1080p</button>
          <button class="btn" data-upscale="2K">2K</button>
          <button class="btn" data-upscale="4K">4K</button>
        </div>
      </div>
    </details>` : ''}

    <button class="btn ghost-line" id="vCopy">${ICON.copy} Copiar descripción</button>`;

  $('#vFav').onclick = () => { patchItem(h, { favorite: !h.favorite }); openViewer(h); };
  $('#vProject').onchange = async (e) => {
    let v = e.target.value;
    if (v === '__new') { v = await newProject(); if (!v) { e.target.value = h.project || ''; return; } }
    patchItem(h, { project: v });
    toast(v ? `Movido a «${v}»` : 'Quitado del proyecto');
    openViewer(h);
  };
  $('#vReuse')?.addEventListener('click', () => reuse(h));
  $('#vCompare')?.addEventListener('click', () => { closeViewer(); openCompare(sib); });
  $('#vCopy').onclick = (ev) => navigator.clipboard.writeText(h.prompt).then(() => { ev.currentTarget.innerHTML = `${ICON.check} Copiado`; });
  // Continuar
  if (canExtend(h)) {
    let extDur = 5;
    const note = () => {
      const total = Number(s.duration) + extDur;
      $('#extNote').textContent = `Quedará de ~${total} s en total. Costo aproximado: ${formatNum(extDur * extRate)} créditos (Kie no publica el precio exacto de continuar).${total > 15 ? ' Después ya no se podrá alargar más.' : ''}`;
    };
    note();
    $('#extDur').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; extDur = Number(b.dataset.value); $$('#extDur button').forEach((x) => x.classList.toggle('on', x === b)); note(); };
    $('#extImprove').onclick = (e) => improveText($('#extPrompt'), 'extend', e.currentTarget, extDur);
    $('#extGo').onclick = async () => {
      const prompt = $('#extPrompt').value.trim();
      if (!prompt) { nudge($('#extPrompt')); return toast('Escribe qué pasa a continuación.', 'error'); }
      try {
        const { item } = await post(`/api/history/${h.id}/extend`, { prompt, duration: extDur });
        upsert(item, { quiet: true }); renderGallery(); closeViewer();
        toast('Continuación en la cola. El video nuevo incluirá el original.', 'info', { ms: 5500 });
      } catch (err) { toast(err.message, 'error', { ms: 6500 }); }
    };
  }
  $$('[data-remake]').forEach((b) => (b.onclick = async () => {
    try { const { item } = await post(`/api/history/${h.id}/remake`, { resolution: b.dataset.remake }); upsert(item, { quiet: true }); renderGallery(); closeViewer(); toast(`Recreándolo en ${resLabel(b.dataset.remake)}…`, 'info'); }
    catch (err) { toast(err.message, 'error', { ms: 6500 }); }
  }));
  $$('[data-upscale]').forEach((b) => (b.onclick = async () => {
    try { const { item } = await post(`/api/history/${h.id}/upscale`, { resolution: b.dataset.upscale }); upsert(item, { quiet: true }); renderGallery(); closeViewer(); toast(`Mejorando a ${resLabel(b.dataset.upscale)}…`, 'info'); }
    catch (err) { toast(err.message, 'error', { ms: 6500 }); }
  }));
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

// ---------- Comparar ----------
function setSelectMode(on) {
  state.selectMode = on;
  state.selected.clear();
  $('#compareBtn').classList.toggle('on', on);
  $('#selectbar').hidden = !on;
  if (on && state.filter === 'pending') setFilter('done');
  updateSelectBar();
  renderGallery();
}
function toggleSelect(h) {
  if (h.state !== 'done') return;
  if (state.selected.has(h.id)) state.selected.delete(h.id);
  else if (state.selected.size >= 4) return toast('Puedes comparar hasta 4 videos.', 'info');
  else state.selected.add(h.id);
  updateSelectBar();
  renderGallery();
}
function updateSelectBar() {
  const n = state.selected.size;
  $('#selectText').textContent = n ? `${n} elegido${n > 1 ? 's' : ''} · elige de 2 a 4` : 'Toca los videos listos que quieres comparar (de 2 a 4)';
  $('#selectGo').disabled = n < 2;
  $('#selectGo').textContent = n >= 2 ? `Comparar ${n}` : 'Comparar';
}
$('#compareBtn').addEventListener('click', () => setSelectMode(!state.selectMode));
$('#selectCancel').addEventListener('click', () => setSelectMode(false));
$('#selectGo').addEventListener('click', () => { const list = [...state.selected].map((id) => state.items.get(id)).filter(Boolean); setSelectMode(false); openCompare(list); });

let cmpAudio = -1;
function openCompare(list) {
  const g = $('#compareGrid');
  g.dataset.n = list.length;
  cmpAudio = -1;
  g.innerHTML = list.map((h, i) => `<figure class="cmp" data-i="${i}">
    <video src="${srcOf(h)}" muted loop playsinline preload="auto"></video>
    <figcaption>
      <span>${h.batch ? `v${h.batch.n}` : `#${i + 1}`} · ${resLabel(h.settings.resolution)}${h.settings.seed != null ? ` · semilla ${h.settings.seed}` : ''}</span>
      <span class="cmp-actions">
        <button class="icon-btn" data-cmp-audio="${i}" data-tip="Escuchar el sonido de este">${ICON.mute}</button>
        <button class="icon-btn fav ${h.favorite ? 'on' : ''}" data-cmp-fav="${h.id}" data-tip="Me quedo con este (favorito)">${ICON.star}</button>
        <a class="icon-btn" href="${srcOf(h)}" download data-tip="Descargar">${ICON.download}</a>
      </span>
    </figcaption></figure>`).join('');
  openModal($('#compare'));
  const vids = $$('video', g);
  let ready = 0;
  vids.forEach((v) => v.addEventListener('canplay', () => { if (++ready === vids.length) cmpPlay(true); }, { once: true }));
  setTimeout(() => cmpPlay(true), 2500);
  paintCmpCtrl();
}
const cmpVids = () => $$('#compareGrid video');
function cmpPlay(play) {
  const vids = cmpVids();
  if (play) { const t = vids[0]?.currentTime || 0; vids.forEach((v) => { v.currentTime = t; v.play().catch(() => {}); }); }
  else vids.forEach((v) => v.pause());
  paintCmpCtrl();
}
function paintCmpCtrl() {
  const playing = cmpVids().some((v) => !v.paused);
  $('#cmpPlay').innerHTML = playing ? `${ICON.pause} Pausar todo` : `${ICON.resume} Reproducir todo`;
  $('#cmpMute').innerHTML = `${ICON.mute} Silencio`;
  $('#cmpMute').hidden = cmpAudio < 0;
}
$('#cmpPlay').addEventListener('click', () => cmpPlay(cmpVids().every((v) => v.paused)));
$('#cmpRestart').addEventListener('click', () => { cmpVids().forEach((v) => (v.currentTime = 0)); cmpPlay(true); });
$('#cmpMute').addEventListener('click', () => setCmpAudio(-1));
function setCmpAudio(i) {
  cmpAudio = i;
  cmpVids().forEach((v, j) => (v.muted = j !== i));
  $$('[data-cmp-audio]').forEach((b) => { const on = Number(b.dataset.cmpAudio) === i; b.innerHTML = on ? ICON.sound : ICON.mute; b.classList.toggle('on', on); });
  $$('#compareGrid .cmp').forEach((f) => f.classList.toggle('audio', Number(f.dataset.i) === i));
  paintCmpCtrl();
}
$('#compareGrid').addEventListener('click', (e) => {
  const a = e.target.closest('[data-cmp-audio]');
  if (a) return setCmpAudio(Number(a.dataset.cmpAudio) === cmpAudio ? -1 : Number(a.dataset.cmpAudio));
  const f = e.target.closest('[data-cmp-fav]');
  if (f) { const h = state.items.get(f.dataset.cmpFav); patchItem(h, { favorite: !h.favorite }); f.classList.toggle('on', !!h.favorite); hideTip(); }
});
function closeCompare() { closeModal($('#compare'), () => ($('#compareGrid').innerHTML = '')); }

// ---------- Sincronización en vivo ----------
function upsert(item, { quiet = false } = {}) {
  const prev = state.items.get(item.id);
  state.items.set(item.id, item);
  if (quiet || !prev || prev.state === item.state || !state.loaded) return;
  if (item.state === 'done') {
    const what = item.model === 'upscale' ? '✨ Tu video mejorado está listo' : item.model === 'extend' ? '🎬 Tu continuación está lista' : '🎬 ¡Tu video está listo!';
    toast(what, 'ok', { ms: 6000, action: { label: 'Ver', fn: () => openViewer(state.items.get(item.id)) } });
    notify(item, what);
  }
  if (item.state === 'failed') toast(item.error || 'Un video no se pudo crear.', 'error', { ms: 7000 });
}
function notify(h, title) {
  if (document.hasFocus() || !('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title.replace(/^\S+\s/, ''), { body: h.prompt.slice(0, 90), icon: '/favicon.svg' });
  n.onclick = () => { window.focus(); openViewer(state.items.get(h.id)); };
}
function applyLists(d) {
  if (d.characters) { state.characters = d.characters; for (const id of [...state.selectedChars]) if (!d.characters.some((c) => c.id === id)) state.selectedChars.delete(id); renderChars(); if (!$('#charModal').hidden) renderCharList(); }
  if (d.recipes) { state.recipes = d.recipes; if (!$('#recipesPop').hidden) renderRecipes(); }
  if (d.projects) { state.projects = d.projects; renderProjects(); }
  if (d.spending) { state.spending = d.spending; renderSpending(); }
}
async function loadHistory() {
  const data = await api('/api/history');
  const fresh = new Map(data.items.map((h) => [h.id, h]));
  for (const id of [...state.items.keys()]) if (!fresh.has(id)) state.items.delete(id);
  data.items.forEach((h) => upsert(h));
  state.queue = data.queue;
  if (data.credits != null) setCredits(data.credits);
  applyLists(data);
  const first = !state.loaded;
  state.loaded = true;
  if (first) $('#skeletonGrid')?.remove();
  renderGallery();
  updateGenerate();
}
let rendering = false;
const scheduleRender = () => { if (rendering) return; rendering = true; requestAnimationFrame(() => { rendering = false; renderGallery(); updateGenerate(); }); };
function connect() {
  const es = new EventSource('/api/events');
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
  es.addEventListener('spending', (e) => applyLists({ spending: JSON.parse(e.data) }));
  es.addEventListener('characters', (e) => applyLists({ characters: JSON.parse(e.data) }));
  es.addEventListener('recipes', (e) => applyLists({ recipes: JSON.parse(e.data) }));
  es.addEventListener('projects', (e) => applyLists({ projects: JSON.parse(e.data) }));
  es.onerror = () => setLive(false);
}
let offlineToast = null;
function setLive(on) {
  const dot = $('#liveDot');
  dot.classList.toggle('off', !on);
  dot.dataset.tip = on ? 'Conectado: todo se actualiza solo, sin recargar la página.' : 'Se perdió la conexión con el estudio. Reintentando… (¿cerraste la ventana negra?)';
  if (!on && !offlineToast) offlineToast = setTimeout(() => toast('Se perdió la conexión con el estudio. Reintentando…', 'error', { ms: 5000 }), 3000);
  if (on) { clearTimeout(offlineToast); offlineToast = null; }
}

// ---------- Inicio ----------
restoreSlots();
autoGrow();
syncAll();
renderProjects();
setMode(state.mode, { animate: false });
document.fonts?.ready.then(() => positionIndicator(false));
requestAnimationFrame(() => document.body.classList.remove('booting'));
loadConfig().then(updateCost).catch(() => toast('No se pudo hablar con el estudio. ¿Está abierta la ventana negra?', 'error'));
connect();
