// OmniFlash Studio — editor básico: ordena clips, recórtalos, une con fundidos, añade música y exporta.
const O = window.OFS;
const { $, $$, esc, api, post, toast, openModal, closeModal, state, ICON } = O;

const EI = {
  film: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
  pause: '<svg class="i" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  restart: '<svg class="i" viewBox="0 0 24 24"><path d="M6 5v14M19 5 9 12l10 7V5Z"/></svg>',
  music: '<svg class="i" viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  dup: '<svg class="i" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></svg>',
  pencil: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/></svg>',
  addAll: '<svg class="i" viewBox="0 0 24 24"><path d="M4 6h10M4 12h10M4 18h6M18 14v6m-3-3h6"/></svg>',
};

const E = { list: [], cur: null, ffmpeg: true, sel: null, binProject: '__edit', dur: new Map(), saveTimer: null, open: false };
const A = $('#edA'), B = $('#edB'), MUS = $('#edMusic');
const P = { playing: false, idx: 0, cur: A, other: B, t: 0, raf: 0, token: 0, prepIdx: -1, prepP: null, out: null, outStart: 0, outOut: 0, switching: false };

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmt1 = (s) => `${(Math.round(s * 10) / 10).toFixed(1)} s`;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const itemOf = (c) => state.items.get(c.itemId);
const srcOf = (h) => `/videos/${encodeURIComponent(h.localFile)}`;
const durOf = (h) => E.dur.get(h.id) || Number(h.settings?.duration) || 5;
const newKey = () => 'c' + Math.random().toString(36).slice(2, 9);

// Duración real de cada video (la de los ajustes es aproximada)
function probeDur(h) {
  if (!h?.localFile || E.dur.has(h.id) || probeDur.busy.has(h.id)) return;
  probeDur.busy.add(h.id);
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.onloadedmetadata = () => { if (isFinite(v.duration) && v.duration > 0) { E.dur.set(h.id, Math.round(v.duration * 100) / 100); if (E.open) { renderTimeline(); renderSide(); } } v.removeAttribute('src'); v.load(); };
  v.src = srcOf(h);
}
probeDur.busy = new Set();

// ---------- Cálculo de la línea de tiempo ----------
function segs() {
  const clips = (E.cur?.clips || []).filter((c) => itemOf(c)?.localFile);
  const list = clips.map((c) => {
    const item = itemOf(c);
    const D = durOf(item);
    const inn = clamp(c.in || 0, 0, Math.max(0, D - 0.3));
    const out = clamp(c.out == null ? D : c.out, inn + 0.3, D);
    return { c, item, D, in: inn, out, len: out - inn };
  });
  const F = E.cur?.transition === 'fade' && list.length > 1 ? Math.min(0.6, ...list.map((s) => s.len / 2.5)) : 0;
  let t = 0;
  for (const s of list) { s.start = t; t += s.len - F; }
  const total = list.length ? t + F : 0;
  return { list, F, total };
}

// ---------- Guardar ----------
function save(patch = {}) {
  $('#edSaved').textContent = 'Guardando…';
  clearTimeout(E.saveTimer);
  Object.assign(E.pending || (E.pending = {}), patch);
  E.saveTimer = setTimeout(async () => {
    const body = { ...E.pending, clips: E.cur.clips };
    E.pending = null;
    try {
      const { edit } = await post(`/api/edits/${E.cur.id}`, body, 'PUT');
      $('#edSaved').textContent = 'Guardado ✓';
    } catch (err) { $('#edSaved').textContent = ''; toast(err.message, 'error'); }
  }, 450);
}
function setCur(patch) { Object.assign(E.cur, patch); save(patch); }

// ---------- Abrir / cerrar ----------
async function openEditor({ addItemId, editId } = {}) {
  try {
    const d = await api('/api/edits');
    E.list = d.edits; E.ffmpeg = d.ffmpeg;
  } catch (err) { return toast(err.message, 'error'); }
  const add = addItemId ? state.items.get(addItemId) : null;
  if (editId && E.list.some((x) => x.id === editId)) E.cur = E.list.find((x) => x.id === editId);
  else if (!E.cur || !E.list.some((x) => x.id === E.cur.id)) {
    E.cur = [...E.list].sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  } else E.cur = E.list.find((x) => x.id === E.cur.id);
  if (!E.cur) {
    const project = add?.project || (state.projectFilter !== '__all' ? state.projectFilter : state.targetProject) || '';
    const { edit } = await post('/api/edits', { name: project ? `${project} · Episodio 1` : 'Episodio 1', project, ratio: add?.settings?.aspect_ratio || state.ratio });
    E.list.push(edit); E.cur = edit;
  }
  E.open = true;
  E.sel = null;
  openModal($('#editor'));
  if (add) addClip(add, { quiet: true });
  renderAll();
  seek(0);
  if (add) toast('Clip añadido al final del episodio', 'ok', { ms: 2500 });
}
function closeEditor() {
  pause();
  E.open = false;
  if (E.saveTimer) { clearTimeout(E.saveTimer); E.saveTimer = null; post(`/api/edits/${E.cur.id}`, { ...(E.pending || {}), clips: E.cur.clips }, 'PUT').catch(() => {}); E.pending = null; }
  closeModal($('#editor'), () => { for (const v of [A, B]) { v.removeAttribute('src'); v.dataset.src = ''; v.load(); } MUS.removeAttribute('src'); MUS.dataset.src = ''; });
}
function switchEdit(edit) {
  pause();
  E.cur = edit; E.sel = null;
  renderAll(); seek(0);
}

// ---------- Pintar todo ----------
function renderAll() {
  renderHead(); renderBin(); renderTimeline(); renderSide(); fitScreen(); renderExport(); syncMusicSrc();
  $('#edNoFf').hidden = E.ffmpeg;
}
function renderHead() {
  $('#edPick').innerHTML = [...E.list].sort((a, b) => a.createdAt - b.createdAt).map((e) => `<option value="${e.id}" ${e.id === E.cur.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('') + '<option value="__new">+ Nuevo episodio…</option>';
}
function binItems() {
  const proj = E.binProject === '__edit' ? E.cur.project : E.binProject;
  return [...state.items.values()]
    .filter((h) => h.state === 'done' && h.localFile && h.kind !== 'edit' && (proj === '__all' || !proj || h.project === proj))
    .sort((a, b) => a.createdAt - b.createdAt);
}
function renderBin() {
  const projs = state.projects;
  const sel = $('#edBinProject');
  const label = E.cur.project ? `Proyecto «${E.cur.project}»` : 'Todos los videos';
  sel.innerHTML = `<option value="__edit">${esc(label)}</option>${E.cur.project ? '<option value="__all">Todos los videos</option>' : ''}${projs.filter((p) => p !== E.cur.project).map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}`;
  sel.value = [...sel.options].some((o) => o.value === E.binProject) ? E.binProject : '__edit';
  const items = binItems();
  items.forEach(probeDur);
  const used = new Set(E.cur.clips.map((c) => c.itemId));
  $('#edAddAll').hidden = items.length < 2;
  $('#edBin').innerHTML = items.length ? items.map((h) => `
    <div class="ed-clip ${used.has(h.id) ? 'used' : ''}" data-add="${h.id}" data-tip="Añadir al final del episodio">
      <div class="ed-clip-th">${O.thumbOf(h) ? `<img src="${O.thumbOf(h)}" alt="">` : ''}<video src="${srcOf(h)}#t=0.5" muted preload="metadata" playsinline></video><span class="ed-dur">${fmt1(durOf(h))}</span>${used.has(h.id) ? `<span class="ed-used" data-tip="Ya está en el episodio">${ICON.check}</span>` : ''}</div>
      <p>${esc(h.userPrompt || h.prompt)}</p>
      <span class="ed-add">${ICON.plus}</span>
    </div>`).join('')
    : `<div class="ed-bin-empty">${EI.film}<p>No hay videos listos ${E.cur.project && E.binProject === '__edit' ? 'en este proyecto' : 'todavía'}.</p><span>Los videos terminados y guardados en tu PC aparecen aquí.</span></div>`;
}

const tl = $('#edTrack');
function renderTimeline() {
  const S = segs();
  const avail = Math.max(200, $('#edTimeline').clientWidth - 40);
  const sum = S.list.reduce((a, s) => a + s.len, 0) || 1;
  const pps = clamp(avail / sum, 14, 110);
  $('#edTotal').textContent = S.list.length ? `${S.list.length} ${S.list.length === 1 ? 'clip' : 'clips'} · ${fmt(S.total)} en total` : '';
  if (!S.list.length) {
    tl.innerHTML = `<div class="ed-tl-empty"><span>Toca <b>+</b> en un clip de la izquierda para empezar tu episodio. Luego arrástralos para ordenarlos.</span></div>`;
    $('#edHead').hidden = true;
    return;
  }
  $('#edHead').hidden = false;
  tl.innerHTML = S.list.map((s, i) => `
    ${i ? `<i class="ed-tr ${S.F ? 'fade' : ''}" data-tip="${S.F ? 'Fundido suave' : 'Corte directo'}"></i>` : ''}
    <div class="ed-block ${E.sel === s.c.key ? 'on' : ''}" draggable="true" data-key="${s.c.key}" style="width:${Math.max(64, s.len * pps)}px">
      ${O.thumbOf(s.item) ? `<img src="${O.thumbOf(s.item)}" alt="">` : `<video src="${srcOf(s.item)}#t=${(s.in + 0.2).toFixed(1)}" muted preload="metadata"></video>`}
      <span class="ed-bn">${i + 1}</span>
      <span class="ed-bl">${fmt1(s.len)}${s.in > 0.05 || s.out < s.D - 0.05 ? ' ✂' : ''}</span>
    </div>`).join('');
  paintHead();
}
function blockEl(key) { return tl.querySelector(`.ed-block[data-key="${key}"]`); }
function paintHead() {
  const S = segs();
  const s = S.list[P.idx];
  if (!s) return;
  const el = blockEl(s.c.key);
  if (!el) return;
  const frac = clamp((P.t - s.start) / s.len, 0, 1);
  $('#edHead').style.transform = `translateX(${el.offsetLeft + frac * el.offsetWidth}px)`;
  $('#edTime').textContent = `${fmt(P.t)} / ${fmt(S.total)}`;
  tl.querySelectorAll('.ed-block.playing').forEach((b) => b !== el && b.classList.remove('playing'));
  el.classList.add('playing');
}

// ---------- Panel derecho ----------
function seg(items, key, cur, small = '') { return `<div class="seg mini ${small}" data-seg="${key}">${items.map(([v, l]) => `<button data-value="${v}" class="${String(cur) === v ? 'on' : ''}">${l}</button>`).join('')}</div>`; }
function renderSide() {
  const S = segs();
  const e = E.cur;
  const s = S.list.find((x) => x.c.key === E.sel);
  const n = S.list.indexOf(s);
  const clipHTML = s ? `
    <section class="ed-sec">
      <div class="ed-sec-head"><h3>Clip ${n + 1}</h3><button class="icon-btn sm" id="edDeselect" data-tip="Cerrar">${ICON.x}</button></div>
      <p class="ed-clip-name">${esc(s.item.userPrompt || s.item.prompt)}</p>
      <label class="ed-lbl">Recortar <span class="muted">arrastra los bordes</span></label>
      <div class="trim" id="edTrim">
        <div class="trim-sel" style="left:${(s.in / s.D) * 100}%;right:${100 - (s.out / s.D) * 100}%"></div>
        <button class="trim-h l" data-h="in" style="left:${(s.in / s.D) * 100}%" role="slider" aria-label="Dónde empieza" aria-valuenow="${s.in.toFixed(1)}" data-tip="Dónde empieza (flechas: ±0.1 s)"></button>
        <button class="trim-h r" data-h="out" style="left:${(s.out / s.D) * 100}%" role="slider" aria-label="Dónde termina" aria-valuenow="${s.out.toFixed(1)}" data-tip="Dónde termina (flechas: ±0.1 s)"></button>
      </div>
      <div class="trim-nums"><span>Empieza <b>${fmt1(s.in)}</b></span><span>Dura <b>${fmt1(s.len)}</b></span><span>Termina <b>${fmt1(s.out)}</b></span></div>
      ${s.in > 0.05 || s.out < s.D - 0.05 ? '<button class="link-btn" id="edUntrim">Usar el clip completo</button>' : ''}
      <div class="ed-row">
        <button class="btn sm" id="edLeft" ${n === 0 ? 'disabled' : ''} data-tip="Mover antes">${ICON.chevL}</button>
        <button class="btn sm" id="edRight" ${n === S.list.length - 1 ? 'disabled' : ''} data-tip="Mover después">${ICON.chevR}</button>
        <button class="btn sm" id="edDup" data-tip="Repetir este clip">${EI.dup}</button>
        <button class="btn sm danger-line" id="edRemove" data-tip="Quitar del episodio (el video no se borra)">${ICON.trash}</button>
      </div>
    </section>` : `<section class="ed-sec ed-hint"><p>Toca un clip de la línea de tiempo para <b>recortarlo</b>, moverlo o quitarlo.</p></section>`;
  const projOpts = `<option value="">Sin proyecto</option>${state.projects.map((p) => `<option ${p === e.project ? 'selected' : ''} value="${esc(p)}">${esc(p)}</option>`).join('')}`;
  const m = e.music;
  $('#edSide').innerHTML = clipHTML + `
    <section class="ed-sec">
      <h3>Episodio</h3>
      <label class="ed-lbl">Proyecto</label>
      <select id="edProject" data-tip="Dónde se guarda el episodio al exportarlo">${projOpts}</select>
      <label class="ed-lbl">Formato</label>
      ${seg([['16:9', 'Horizontal'], ['9:16', 'Vertical']], 'ratio', e.ratio)}
      <label class="ed-lbl">Entre clips</label>
      ${seg([['cut', 'Corte directo'], ['fade', 'Fundido suave']], 'transition', e.transition)}
      <label class="ed-lbl">Sonido de los clips <span class="muted" id="edVolTxt">${Math.round(e.clipVolume * 100)}%</span></label>
      <input type="range" min="0" max="100" value="${Math.round(e.clipVolume * 100)}" id="edVol" data-tip="Volumen del sonido que trae cada video">
      <label class="ed-lbl">Música de fondo</label>
      ${m ? `<div class="ed-music"><span class="ed-music-ic">${EI.music}</span><span class="ed-music-name" title="${esc(m.name)}">${esc(m.name)}</span><button class="icon-btn sm" id="edMusicDel" data-tip="Quitar la música">${ICON.x}</button></div>
        <label class="ed-lbl sub">Volumen de la música <span class="muted" id="edMVolTxt">${Math.round(m.volume * 100)}%</span></label>
        <input type="range" min="0" max="100" value="${Math.round(m.volume * 100)}" id="edMVol">`
      : `<label class="btn sm ed-upload" data-tip="MP3, M4A, WAV u OGG. Se repite si es más corta que el episodio y baja suave al final.">${EI.music} Añadir música<input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac" id="edMusicIn" hidden></label>`}
      <label class="ed-lbl">Calidad del archivo</label>
      ${seg([['auto', 'Automática'], ['720p', '720p'], ['1080p', '1080p']], 'quality', e.quality)}
      <p class="muted small">Automática: 1080p si algún clip es de 1080p o más; si no, 720p. Los clips de otro formato se ajustan sin deformarse (con bordes negros).</p>
    </section>`;
  bindSide(s, n);
}
function bindSide(s, n) {
  $$('#edSide [data-seg]').forEach((g) => (g.onclick = (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    const key = g.dataset.seg, v = b.dataset.value;
    if (E.cur[key] === v) return;
    setCur({ [key]: v });
    renderSide(); renderTimeline();
    if (key === 'ratio') fitScreen();
    if (key === 'transition') seek(P.t, { play: P.playing });
  }));
  $('#edProject').onchange = (ev) => { setCur({ project: ev.target.value }); E.binProject = '__edit'; renderBin(); };
  $('#edVol').oninput = (ev) => { const v = ev.target.value / 100; E.cur.clipVolume = v; $('#edVolTxt').textContent = `${ev.target.value}%`; P.cur.volume = v; save({ clipVolume: v }); };
  const mv = $('#edMVol');
  if (mv) mv.oninput = (ev) => { const v = ev.target.value / 100; E.cur.music.volume = v; MUS.volume = v; $('#edMVolTxt').textContent = `${ev.target.value}%`; save({ musicVolume: v }); };
  $('#edMusicIn')?.addEventListener('change', (ev) => uploadMusic(ev.target.files[0]));
  $('#edMusicDel')?.addEventListener('click', async () => {
    try { const { edit } = await post(`/api/edits/${E.cur.id}/music`, {}, 'DELETE'); E.cur.music = edit.music; syncMusicSrc(); renderSide(); } catch (err) { toast(err.message, 'error'); }
  });
  if (!s) return;
  $('#edDeselect').onclick = () => { E.sel = null; renderSide(); renderTimeline(); };
  $('#edUntrim')?.addEventListener('click', () => { s.c.in = 0; s.c.out = null; save(); renderSide(); renderTimeline(); seek(segs().list[n].start); });
  const move = (d) => { const cl = E.cur.clips; const i = cl.indexOf(s.c); cl.splice(i, 1); cl.splice(i + d, 0, s.c); save(); renderSide(); renderTimeline(); seek(segs().list.find((x) => x.c === s.c).start); };
  $('#edLeft').onclick = () => move(-1);
  $('#edRight').onclick = () => move(1);
  $('#edDup').onclick = () => { const c = { ...s.c, key: newKey() }; E.cur.clips.splice(E.cur.clips.indexOf(s.c) + 1, 0, c); E.sel = c.key; save(); renderSide(); renderTimeline(); renderBin(); };
  $('#edRemove').onclick = () => removeClip(s.c);
  bindTrim(s);
}
function removeClip(c) {
  const i = E.cur.clips.indexOf(c);
  if (i < 0) return;
  pause();
  E.cur.clips.splice(i, 1);
  E.sel = null;
  save(); renderSide(); renderTimeline(); renderBin();
  seek(Math.min(P.t, segs().total));
  toast('Clip quitado del episodio', 'ok', { ms: 4500, action: { label: 'Deshacer', fn: () => { E.cur.clips.splice(i, 0, c); E.sel = c.key; save(); renderSide(); renderTimeline(); renderBin(); } } });
}

// ---------- Recorte ----------
function bindTrim(s) {
  const bar = $('#edTrim');
  const apply = (h, t) => {
    t = Math.round(t * 10) / 10;
    if (h === 'in') s.c.in = clamp(t, 0, s.out - 0.5);
    else s.c.out = clamp(t, s.in + 0.5, s.D);
    if (s.c.out != null && s.c.out >= s.D - 0.05) s.c.out = null;
    const ns = segs().list.find((x) => x.c === s.c);
    Object.assign(s, ns);
    bar.querySelector('.trim-sel').style.cssText = `left:${(s.in / s.D) * 100}%;right:${100 - (s.out / s.D) * 100}%`;
    bar.querySelector('.l').style.left = `${(s.in / s.D) * 100}%`;
    bar.querySelector('.r').style.left = `${(s.out / s.D) * 100}%`;
    const nums = $$('.trim-nums b');
    nums[0].textContent = fmt1(s.in); nums[1].textContent = fmt1(s.len); nums[2].textContent = fmt1(s.out);
    showFrame(s, h === 'in' ? s.in : Math.max(s.in, s.out - 0.05));
  };
  bar.querySelectorAll('.trim-h').forEach((hEl) => {
    hEl.onpointerdown = (ev) => {
      ev.preventDefault();
      pause();
      hEl.setPointerCapture(ev.pointerId);
      hEl.classList.add('drag');
      const r = bar.getBoundingClientRect();
      const mv = (e2) => apply(hEl.dataset.h, ((e2.clientX - r.left) / r.width) * s.D);
      const up = () => { hEl.classList.remove('drag'); hEl.removeEventListener('pointermove', mv); hEl.removeEventListener('pointerup', up); hEl.removeEventListener('pointercancel', up); save(); renderTimeline(); renderSide(); };
      hEl.addEventListener('pointermove', mv);
      hEl.addEventListener('pointerup', up);
      hEl.addEventListener('pointercancel', up);
    };
    hEl.onkeydown = (ev) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(ev.key)) return;
      ev.preventDefault(); pause();
      const d = ev.key === 'ArrowRight' ? 0.1 : -0.1;
      apply(hEl.dataset.h, (hEl.dataset.h === 'in' ? s.in : s.out) + d);
      clearTimeout(bindTrim.t); bindTrim.t = setTimeout(() => { save(); renderTimeline(); }, 400);
    };
  });
}
async function showFrame(s, time) {
  const S = segs();
  const idx = S.list.findIndex((x) => x.c === s.c);
  if (idx < 0) return;
  const tok = ++P.token;
  stopOut();
  P.idx = idx; P.t = S.list[idx].start + (time - S.list[idx].in);
  await load(P.cur, s, time);
  if (tok !== P.token) return;
  show(P.cur);
  paintHead();
}

// ---------- Añadir clips ----------
function addClip(h, { quiet = false } = {}) {
  const c = { key: newKey(), itemId: h.id, in: 0, out: null };
  E.cur.clips.push(c);
  if (!E.cur.project && h.project && E.cur.clips.length === 1) E.cur.project = h.project, save({ project: h.project });
  if (E.cur.clips.length === 1 && h.settings?.aspect_ratio && h.settings.aspect_ratio !== E.cur.ratio) { E.cur.ratio = h.settings.aspect_ratio; save({ ratio: E.cur.ratio }); fitScreen(); }
  probeDur(h);
  save();
  if (!quiet) {
    renderTimeline(); renderBin(); renderSide();
    const el = blockEl(c.key);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
    el?.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    if (E.cur.clips.length === 1) seek(0);
  }
}
$('#edBin').addEventListener('click', (e) => {
  const el = e.target.closest('[data-add]'); if (!el) return;
  const h = state.items.get(el.dataset.add);
  if (h) addClip(h);
});
$('#edAddAll').onclick = () => {
  const items = binItems();
  const used = new Set(E.cur.clips.map((c) => c.itemId));
  const fresh = items.filter((h) => !used.has(h.id));
  if (!fresh.length) return toast('Todos estos clips ya están en el episodio.', 'info');
  fresh.forEach((h) => addClip(h, { quiet: true }));
  renderTimeline(); renderBin(); renderSide(); seek(P.t);
  toast(`${fresh.length} ${fresh.length === 1 ? 'clip añadido' : 'clips añadidos'} en orden de creación`, 'ok', { ms: 2800 });
};
$('#edBinProject').onchange = (e) => { E.binProject = e.target.value; renderBin(); };

// ---------- Línea de tiempo: elegir, saltar, arrastrar ----------
tl.addEventListener('click', (e) => {
  const b = e.target.closest('.ed-block'); if (!b) return;
  const S = segs();
  const s = S.list.find((x) => x.c.key === b.dataset.key);
  const r = b.getBoundingClientRect();
  const frac = clamp((e.clientX - r.left) / r.width, 0, 0.999);
  const wasSel = E.sel === s.c.key;
  E.sel = s.c.key;
  if (!wasSel) { renderSide(); tl.querySelectorAll('.ed-block').forEach((x) => x.classList.toggle('on', x === b)); }
  seek(s.start + frac * s.len, { play: P.playing });
});
let dragKey = null;
tl.addEventListener('dragstart', (e) => {
  const b = e.target.closest('.ed-block'); if (!b) return;
  dragKey = b.dataset.key; b.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragKey);
});
tl.addEventListener('dragover', (e) => {
  if (!dragKey) return;
  e.preventDefault();
  const b = e.target.closest('.ed-block');
  tl.querySelectorAll('.drop-l,.drop-r').forEach((x) => x.classList.remove('drop-l', 'drop-r'));
  if (!b || b.dataset.key === dragKey) return;
  const r = b.getBoundingClientRect();
  b.classList.add(e.clientX < r.left + r.width / 2 ? 'drop-l' : 'drop-r');
});
tl.addEventListener('drop', (e) => {
  e.preventDefault();
  const b = tl.querySelector('.drop-l,.drop-r');
  if (!b || !dragKey) return;
  const cl = E.cur.clips;
  const from = cl.findIndex((c) => c.key === dragKey);
  const [c] = cl.splice(from, 1);
  let to = cl.findIndex((x) => x.key === b.dataset.key);
  if (b.classList.contains('drop-r')) to++;
  cl.splice(to, 0, c);
  E.sel = c.key;
  save(); renderTimeline(); renderSide();
  seek(segs().list.find((x) => x.c === c).start);
});
tl.addEventListener('dragend', () => { dragKey = null; tl.querySelectorAll('.dragging,.drop-l,.drop-r').forEach((x) => x.classList.remove('dragging', 'drop-l', 'drop-r')); });
$('#edTimeline').addEventListener('scroll', () => paintHead(), { passive: true });

// ---------- Reproductor (dos videos que se turnan, para fundidos sin saltos) ----------
const once = (el, ev, ms = 4000) => new Promise((r) => { const t = setTimeout(r, ms); el.addEventListener(ev, () => { clearTimeout(t); r(); }, { once: true }); });
async function load(v, s, at) {
  const src = srcOf(s.item);
  if (v.dataset.src !== src) { v.dataset.src = src; v.src = src; await once(v, 'loadedmetadata'); }
  if (Math.abs(v.currentTime - at) > 0.04) { v.currentTime = at; await once(v, 'seeked', 2000); }
}
function show(v) {
  const o = v === A ? B : A;
  v.style.opacity = 1; v.style.zIndex = 2;
  o.style.opacity = 0; o.style.zIndex = 1;
}
function stopOut() { if (P.out) { P.out.pause(); P.out = null; } }
async function seek(t, { play = false } = {}) {
  const S = segs();
  const tok = ++P.token;
  $('#edEmpty').hidden = !!S.list.length;
  if (!S.list.length) { pause(); P.t = 0; $('#edTime').textContent = '0:00 / 0:00'; for (const v of [A, B]) v.style.opacity = 0; return; }
  t = clamp(t, 0, Math.max(0, S.total - 0.05));
  let idx = 0;
  S.list.forEach((s, i) => { if (s.start <= t + 1e-6) idx = i; });
  stopOut();
  P.other.pause();
  P.idx = idx; P.t = t; P.prepIdx = -1; P.prepP = null;
  const s = S.list[idx];
  P.cur.volume = E.cur.clipVolume;
  await load(P.cur, s, s.in + (t - s.start));
  if (tok !== P.token) return;
  show(P.cur);
  paintHead();
  syncMusic();
  if (play) { await P.cur.play().catch(() => {}); startLoop(); }
}
function setPlayBtn() {
  $('#edPlay').innerHTML = P.playing ? EI.pause : ICON.play;
  $('#edPlay').dataset.tip = P.playing ? 'Pausar (barra espaciadora)' : 'Reproducir (barra espaciadora)';
}
async function play() {
  const S = segs();
  if (!S.list.length) return;
  if (P.t >= S.total - 0.1) await seek(0);
  P.playing = true; setPlayBtn();
  P.cur.volume = E.cur.clipVolume;
  await P.cur.play().catch(() => {});
  syncMusic();
  startLoop();
}
function pause() {
  P.playing = false; setPlayBtn();
  stopFrame();
  A.pause(); B.pause(); MUS.pause();
  if (P.out) { P.out = null; show(P.cur); }
}
// Un temporizador fijo (no requestAnimationFrame): sigue funcionando aunque la pestaña quede en segundo plano.
const stopFrame = () => { clearInterval(P.iv); P.iv = 0; };
function startLoop() { if (P.playing && !P.iv) P.iv = setInterval(tick, 40); }
function tick() {
  if (!P.playing || P.switching) return;
  const S = segs();
  const s = S.list[P.idx];
  if (!s) return pause();
  P.t = s.start + (P.cur.currentTime - s.in);
  if (P.out) {
    const k = S.F ? clamp((P.t - P.outStart) / S.F, 0, 1) : 1;
    P.cur.style.opacity = k;
    P.out.volume = E.cur.clipVolume * (1 - k);
    P.cur.volume = E.cur.clipVolume * k;
    if (k >= 1 || P.out.currentTime >= P.outOut) { P.out.pause(); P.out = null; show(P.cur); P.cur.volume = E.cur.clipVolume; }
  }
  const next = S.list[P.idx + 1];
  if (next) {
    if (P.prepIdx !== P.idx + 1 && P.t >= next.start - 2.5) { P.prepIdx = P.idx + 1; P.prepP = load(P.other, next, next.in); }
    if (!P.switching && (P.t >= next.start - 0.02 || P.cur.currentTime >= s.out - 0.03 || P.cur.ended)) { switchTo(next, s, S); return; }
  } else if (P.cur.currentTime >= s.out - 0.03 || P.cur.ended) {
    pause(); seek(S.total);
    return;
  }
  paintHead();
}
async function switchTo(next, s, S) {
  P.switching = true;
  if (P.prepIdx !== P.idx + 1) { P.prepIdx = P.idx + 1; P.prepP = load(P.other, next, next.in); }
  const tok = P.token;
  await P.prepP;
  P.switching = false;
  if (tok !== P.token || !P.playing) return;
  const outgoing = P.cur, incoming = P.other;
  incoming.volume = S.F ? 0 : E.cur.clipVolume;
  await incoming.play().catch(() => {});
  if (S.F) {
    incoming.style.zIndex = 3; incoming.style.opacity = 0; outgoing.style.zIndex = 2;
    P.out = outgoing; P.outStart = next.start; P.outOut = s.out;
  } else { outgoing.pause(); show(incoming); }
  P.cur = incoming; P.other = outgoing; P.idx++;
  P.prepIdx = -1;
  startLoop();
}
$('#edPlay').onclick = () => (P.playing ? pause() : play());
$('#edRestart').onclick = () => seek(0, { play: P.playing });

// Música en la vista previa
function syncMusicSrc() {
  const m = E.cur?.music;
  const src = m ? `/music/${encodeURIComponent(m.file)}` : '';
  if (MUS.dataset.src !== src) { MUS.dataset.src = src; if (src) MUS.src = src; else { MUS.pause(); MUS.removeAttribute('src'); } }
}
function syncMusic() {
  const m = E.cur?.music;
  if (!m || !MUS.dataset.src) return;
  MUS.volume = m.volume;
  const d = MUS.duration || m.duration;
  if (d) { const want = P.t % d; if (Math.abs(MUS.currentTime - want) > 0.25) MUS.currentTime = want; }
  if (P.playing) MUS.play().catch(() => {}); else MUS.pause();
}
async function uploadMusic(file) {
  if (!file) return;
  if (file.size > 60 * 1024 * 1024) return toast('La música pesa más de 60 MB. Usa un archivo más liviano.', 'error');
  const btn = $('.ed-upload');
  if (btn) btn.innerHTML = `<span class="spin"></span> Subiendo…`;
  try {
    const res = await fetch(`/api/edits/${E.cur.id}/music`, { method: 'POST', headers: { 'x-filename': encodeURIComponent(file.name) }, body: file });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'No se pudo guardar la música.');
    E.cur.music = d.edit.music;
    syncMusicSrc(); renderSide(); syncMusic();
    toast('Música añadida. Se escucha en la vista previa.', 'ok', { ms: 3000 });
  } catch (err) { toast(err.message, 'error'); renderSide(); }
}

// Tamaño de la pantalla según el formato
const stage = $('#edStageBox');
function fitScreen() {
  const r = stage.getBoundingClientRect();
  const ratio = E.cur?.ratio === '9:16' ? 9 / 16 : 16 / 9;
  let w = r.width, h = w / ratio;
  if (h > r.height) { h = r.height; w = h * ratio; }
  const sc = $('#edScreen');
  sc.style.width = `${Math.floor(w)}px`; sc.style.height = `${Math.floor(h)}px`;
}
new ResizeObserver(() => { if (E.open) fitScreen(); }).observe(stage);
new ResizeObserver(() => { if (E.open) renderTimeline(); }).observe($('#edTimeline'));

// ---------- Exportar ----------
function renderExport() {
  const r = E.cur.render;
  const btn = $('#edExport');
  const working = r?.state === 'working';
  btn.disabled = working || !E.cur.clips.length;
  btn.classList.toggle('working', working);
  btn.style.setProperty('--pct', `${working ? r.pct || 0 : 0}%`);
  btn.querySelector('span').textContent = working ? `Exportando… ${r.pct || 0}%` : r?.state === 'done' ? 'Exportar de nuevo' : 'Exportar episodio';
  btn.dataset.tip = !E.cur.clips.length ? 'Primero añade clips' : r?.state === 'done' ? 'Vuelve a crear el archivo con tus cambios (reemplaza el anterior)' : 'Crea un solo video MP4 con todo el episodio. No gasta créditos.';
  const view = $('#edView');
  view.hidden = !(r?.state === 'done' && state.items.get(r.itemId));
}
$('#edExport').onclick = async () => {
  if (!E.ffmpeg) { $('#edNoFf').hidden = false; $('#edNoFf').animate([{ transform: 'translateY(4px)' }, { transform: 'none' }], { duration: 200 }); return toast('Primero instala FFmpeg (es gratis). Abajo tienes cómo.', 'error', { ms: 6000 }); }
  pause();
  clearTimeout(E.saveTimer);
  try {
    await post(`/api/edits/${E.cur.id}`, { ...(E.pending || {}), clips: E.cur.clips }, 'PUT');
    E.pending = null; $('#edSaved').textContent = 'Guardado ✓';
    const { edit } = await post(`/api/edits/${E.cur.id}/render`, {});
    E.cur.render = edit.render; renderExport();
    toast('Armando tu episodio… puedes seguir usando el estudio.', 'info', { ms: 3500 });
  } catch (err) {
    if (err.code === 'NO_FFMPEG') { E.ffmpeg = false; $('#edNoFf').hidden = false; }
    toast(err.message, 'error', { ms: 6500 });
  }
};
$('#edView').onclick = () => { const h = state.items.get(E.cur.render?.itemId); if (h) { closeEditor(); setTimeout(() => O.openViewer(h), 220); } };
$('#edFfRetry').onclick = async () => {
  const d = await api('/api/edits').catch(() => null);
  if (d?.ffmpeg) { E.ffmpeg = true; $('#edNoFf').hidden = true; toast('¡FFmpeg encontrado! Ya puedes exportar.', 'ok'); }
  else toast('Todavía no lo encuentro. Si ya lo instalaste, cierra la ventana negra y abre Iniciar.bat otra vez.', 'error', { ms: 7000 });
};
$('#edFfCopy').onclick = (e) => navigator.clipboard.writeText('winget install Gyan.FFmpeg').then(() => { e.currentTarget.innerHTML = `${ICON.check} Copiado`; });

// ---------- Episodios ----------
$('#edPick').onchange = async (e) => {
  const v = e.target.value;
  if (v !== '__new') return switchEdit(E.list.find((x) => x.id === v));
  e.target.value = E.cur.id;
  const project = E.cur.project || '';
  const n = E.list.filter((x) => (x.project || '') === project).length + 1;
  const name = await O.ask('Nombre del nuevo episodio', { value: project ? `${project} · Episodio ${n}` : `Episodio ${n}`, ok: 'Crear' });
  if (!name) return;
  try {
    const { edit } = await post('/api/edits', { name, project, ratio: E.cur.ratio, transition: E.cur.transition });
    if (!E.list.some((x) => x.id === edit.id)) E.list.push(edit);
    switchEdit(E.list.find((x) => x.id === edit.id));
  } catch (err) { toast(err.message, 'error'); }
};
$('#edRename').onclick = async () => {
  const name = await O.ask('Nombre del episodio', { value: E.cur.name });
  if (!name) return;
  setCur({ name }); renderHead();
};
let delTimer;
$('#edDelete').onclick = async (e) => {
  const b = e.currentTarget;
  if (!b.classList.contains('confirm')) {
    b.classList.add('confirm'); b.dataset.tip = 'Toca otra vez para borrar el episodio (tus videos no se borran)';
    O.showTip?.(b);
    clearTimeout(delTimer); delTimer = setTimeout(() => { b.classList.remove('confirm'); b.dataset.tip = 'Borrar este episodio (tus videos no se borran)'; }, 3000);
    return;
  }
  b.classList.remove('confirm');
  try {
    await post(`/api/edits/${E.cur.id}`, {}, 'DELETE');
    E.list = E.list.filter((x) => x.id !== E.cur.id);
    toast('Episodio borrado. Tus videos siguen en la galería.', 'ok');
    if (!E.list.length) { const { edit } = await post('/api/edits', { name: 'Episodio 1', project: E.cur.project, ratio: E.cur.ratio }); E.list.push(edit); }
    switchEdit([...E.list].sort((a, b2) => b2.updatedAt - a.updatedAt)[0]);
  } catch (err) { toast(err.message, 'error'); }
};

// ---------- Teclado y eventos en vivo ----------
document.addEventListener('keydown', (e) => {
  if (!E.open || O.topModal() !== $('#editor') || e.target.closest('input, textarea, select')) return;
  if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); P.playing ? pause() : play(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && E.sel && !e.target.closest('.trim-h')) { const c = E.cur.clips.find((x) => x.key === E.sel); if (c) { e.preventDefault(); removeClip(c); } }
});
function onEdit(edit) {
  const i = E.list.findIndex((x) => x.id === edit.id);
  const prev = i >= 0 ? E.list[i] : null;
  if (E.cur?.id === edit.id) {
    const was = E.cur.render?.state;
    E.cur.render = edit.render;
    if (E.open) renderExport();
    if (was === 'working' && edit.render?.state === 'done') {
      toast(`🎬 «${edit.name}» está listo`, 'ok', { ms: 7000, action: { label: 'Ver', fn: () => { const h = state.items.get(edit.render.itemId); if (h) { if (E.open) closeEditor(); setTimeout(() => O.openViewer(h), 220); } } } });
    }
    if (was === 'working' && edit.render?.state === 'failed') toast(edit.render.error || 'No se pudo exportar.', 'error', { ms: 8000 });
  } else if (i >= 0) E.list[i] = edit;
  else E.list.push(edit);
  if (!prev && E.open) renderHead();
}
function onEditRemove({ id }) {
  E.list = E.list.filter((x) => x.id !== id);
  if (E.open) renderHead();
}
let binSig = '';
function onItems() {
  if (!E.open) return;
  const sig = binItems().map((h) => h.id).join(',') + '|' + E.cur.clips.map((c) => c.itemId).join(',');
  if (sig !== binSig) { binSig = sig; renderBin(); renderTimeline(); }
  renderExport();
}

Object.assign(O, { openEditor, closeEditor, onEdit, onEditRemove, onItems });
