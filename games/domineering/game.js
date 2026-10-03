import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, curve, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { DOM } from './engine.js';
import './strings.js';

const SLUG = 'domineering';
const S = 50, M = 8; // cell size, margin
const COLORS = [PALETTE.blue, PALETTE.red];
const SIZES = ['4x4', '5x5', '6x6', '7x7', '8x8', '9x6', '10x10'];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: '8x8', variant: 'dom', mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!SIZES.includes(cfg.size)) cfg.size = '8x8';
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));
const dims = (size) => size.split('x').map(Number); // [R, C]

let st, history, shapes, over, aiTimer, preview = null, pressing = false, nextFirst = 0, gameId = 0;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('dom.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('dom.p' + p);
}

// ---------- the computer thinks in a worker ----------
let worker = null, reqId = 0;
const pending = new Map();
function think(state, level) {
  if (worker === null) {
    try {
      worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const r = pending.get(e.data.id); pending.delete(e.data.id); r?.(e.data.move); };
      worker.onerror = () => { worker = false; pending.forEach((r, id) => { pending.delete(id); r(null); }); };
    } catch { worker = false; }
  }
  if (!worker) return Promise.resolve(DOM.aiMove(state, level));
  return new Promise((res) => { const id = ++reqId; pending.set(id, res); worker.postMessage({ id, st: state, level }); });
}

// ---------- geometry ----------
const cellXY = (r, c) => [M + c * S, M + r * S];
function boardPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
const center = (m) => (m.o === 'h' ? [M + (m.c + 1) * S, M + (m.r + 0.5) * S] : [M + (m.c + 0.5) * S, M + (m.r + 1) * S]);
// The legal placement closest to the pointer (the pointer must be on or right next to it).
function moveAt(evt) {
  const { x, y } = boardPoint(evt);
  let best = null, bd = Infinity;
  for (const m of DOM.moves(st)) {
    const [cx, cy] = center(m);
    const hw = m.o === 'h' ? S : S / 2, hh = m.o === 'h' ? S / 2 : S;
    const dx = Math.abs(x - cx) - hw, dy = Math.abs(y - cy) - hh;
    if (dx > S * 0.2 || dy > S * 0.2) continue;
    const d = Math.hypot(x - cx, y - cy);
    if (d < bd) { bd = d; best = m; }
  }
  return best;
}

// ---------- drawing ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const jit = (a) => (Math.random() * 2 - 1) * a;
// Hand-drawn rounded rectangle: a closed wobbly loop through points around the box.
function sketchRect(x, y, w, h, a = 1.6) {
  const r = 7, pts = [
    [x + r, y], [x + w / 2, y], [x + w - r, y], [x + w, y + r], [x + w, y + h / 2], [x + w, y + h - r],
    [x + w - r, y + h], [x + w / 2, y + h], [x + r, y + h], [x, y + h - r], [x, y + h / 2], [x, y + r],
  ].map(([px, py]) => [px + jit(a), py + jit(a)]);
  pts.push(pts[0], pts[1]);
  return curve(pts);
}
function pieceShape(m, k) {
  return shapeFor(k, () => {
    const [x, y] = cellXY(m.r, m.c), w = m.o === 'h' ? 2 * S : S, h = m.o === 'h' ? S : 2 * S, pad = 4.5;
    const mid = m.o === 'h' ? line(x + S, y + 11, x + S, y + S - 11, 0.8) : line(x + 11, y + S, x + S - 11, y + S, 0.8);
    return { body: sketchRect(x + pad, y + pad, w - 2 * pad, h - 2 * pad), mid, rot: jit(1.2) };
  });
}

function render(animateLast) {
  const W = M * 2 + st.C * S, H = M * 2 + st.R * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let out = shapeFor('grid', () => {
    let g = '';
    for (let r = 0; r <= st.R; r++) g += `<path class="grid${r % st.R ? '' : ' rim'}" d="${line(M - 2, M + r * S, W - M + 2, M + r * S, 1.2)}"/>`;
    for (let c = 0; c <= st.C; c++) g += `<path class="grid${c % st.C ? '' : ' rim'}" d="${line(M + c * S, M - 2, M + c * S, H - M + 2, 1.2)}"/>`;
    return g;
  });
  st.pieces.forEach((m, i) => {
    const sh = pieceShape(m, 'p' + i), col = COLORS[m.p];
    const [cx, cy] = center(m);
    const fresh = animateLast && i === st.pieces.length - 1;
    out += `<g transform="rotate(${sh.rot.toFixed(1)} ${cx} ${cy})"><g class="piece${fresh ? ' fresh' : ''}" style="transform-origin:${cx}px ${cy}px">` +
      `<path d="${sh.body}" fill="${col.fill}" filter="url(#mg-crayon)"/>` +
      `<path d="${sh.body}" class="outline" stroke="${col.main}"/>` +
      `<path d="${sh.mid}" class="mid" stroke="${col.main}"/></g></g>`;
  });
  out += `<g id="preview"></g>`;
  svg.innerHTML = out;
  drawPreview();
  renderPlayers();
}

function drawPreview() {
  const g = svg.querySelector('#preview');
  if (!g) return;
  if (!preview || !canMove()) { g.innerHTML = ''; svg.style.cursor = ''; return; }
  const m = preview, [x, y] = cellXY(m.r, m.c), w = m.o === 'h' ? 2 * S : S, h = m.o === 'h' ? S : 2 * S;
  const col = COLORS[st.turn];
  g.innerHTML = `<rect class="ghost" x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="7" fill="${col.fill}" stroke="${col.main}"/>`;
  svg.style.cursor = 'pointer';
}

// Tiny domino glyph in the player's colour showing which way they place pieces
// (in Cram a flat and an upright domino crossed, so the card stays narrow).
function roleIcon(p) {
  const col = COLORS[p], a = `fill="${col.fill}" stroke="${col.main}" stroke-width="2"`;
  if (st.cram) return `<svg class="role" viewBox="0 0 26 26"><rect x="1.5" y="7.5" width="23" height="11" rx="2.5" ${a}/><rect x="7.5" y="1.5" width="11" height="23" rx="2.5" ${a}/></svg>`;
  return p === 0
    ? `<svg class="role" viewBox="0 0 26 14"><rect x="1.5" y="1.5" width="23" height="11" rx="2.5" ${a}/><path d="M13 4v6" stroke="${col.main}" stroke-width="1.6"/></svg>`
    : `<svg class="role" viewBox="0 0 14 26"><rect x="1.5" y="1.5" width="11" height="23" rx="2.5" ${a}/><path d="M4 13h6" stroke="${col.main}" stroke-width="1.6"/></svg>`;
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    el.querySelector('.score').innerHTML = `${roleIcon(p)} <span>${plural(DOM.countMoves(st, p), 'dom.spots')}</span>`;
    el.querySelector('.score').title = t(st.cram ? 'dom.role.any' : p === 0 ? 'dom.role.h' : 'dom.role.v');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('dom.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('dom.turn.you') : t('dom.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('dom.thinking', { name: name(st.turn) });
  else status.textContent = t('dom.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#variant').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('dom.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('dom.online.note') : '';
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame(first = nextFirst, size = cfg.size, variant = cfg.variant) {
  clearTimeout(aiTimer);
  gameId++;
  const [R, C] = dims(size);
  st = DOM.create({ R, C, first, cram: variant === 'cram' });
  nextFirst = 1 - first;
  history = []; shapes = {}; over = false; preview = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  if (over || !DOM.isLegal(st, m)) return false;
  const prev = DOM.clone(st);
  history.push(prev);
  const who = st.turn, other = 1 - who;
  const oppBefore = DOM.countMoves(prev, other), myBefore = DOM.countMoves(prev, who);
  const safeBefore = DOM.safeSpots(prev, who);
  DOM.apply(st, m);
  preview = null;
  if (DOM.isOver(st)) { finish(true); return true; }
  react(who, other, oppBefore - DOM.countMoves(st, other), myBefore - DOM.countMoves(st, who), DOM.safeSpots(st, who) - safeBefore);
  render(true);
  maybeAI();
  return true;
}

// Characters react: a squeeze that steals lots of room is a good move; running low on room is worrying.
function react(who, other, stolen, spent, safeGain) {
  const left = DOM.countMoves(st, other);
  const big = st.cram ? 6 : 4;
  setMood(who, 'neutral');
  if (moods[other].mood !== 'worried' || left > 3) setMood(other, 'neutral');
  if (left <= 3) {
    setMood(other, 'worried');
    setMood(who, 'smug');
    if (Math.random() < 0.6) say(other, 'dom.say.low');
  } else if (stolen >= big && stolen > spent) {
    setMood(who, 'happy', 'wave');
    setMood(other, 'sad');
    if (Math.random() < 0.55) say(who, 'dom.say.squeeze');
    else if (Math.random() < 0.4) say(other, 'dom.say.ouch');
  } else if (!st.cram && safeGain > 0 && Math.random() < 0.35) {
    setMood(who, 'smug');
    say(who, 'dom.say.safe');
  }
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  const id = gameId, n = st.pieces.length, t0 = Date.now();
  const snapshot = DOM.clone(st);
  aiTimer = setTimeout(() => {
    think(snapshot, cfg.mode).then((m) => {
      if (id !== gameId || st.pieces.length !== n || over) return; // stale (undo / new game)
      const wait = Math.max(0, 550 - (Date.now() - t0));
      aiTimer = setTimeout(() => {
        if (id !== gameId || st.pieces.length !== n) return;
        if (!m || !DOM.isLegal(st, m)) m = DOM.aiMove(st, 'easy');
        play(m);
      }, wait);
    });
  }, 120);
}

function finish(animate) {
  over = true;
  const w = DOM.winner(st);
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  if (animate) { say(w, 'dom.say.win'); setTimeout(() => over && say(1 - w, 'dom.say.lose'), 900); }
  render(animate);
  $('#result-text').textContent = t('dom.win', { name: name(w) });
  $('#result-text').style.color = COLORS[w].main;
  $('#result-why').textContent = t('dom.why', { name: name(1 - w) });
  setTimeout(() => { if (over) $('#result').hidden = false; }, animate ? 900 : 0);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  gameId++;
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; preview = null;
  shapes = Object.fromEntries(Object.entries(shapes).filter(([k]) => !k.startsWith('p') || +k.slice(1) < st.pieces.length));
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart or change the board; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Host is authoritative: on (re)connect and on every new game it sends the whole state;
// moves carry the piece count so either side can spot a desync and ask for a resync.
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst, size: cfg.size, variant: cfg.variant });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  gameId++;
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = false; history = []; shapes = {}; preview = null; nextFirst = d.nextFirst;
    remoteNames[0] = d.names[0];
    // Show the host's board in settings, but keep our own saved choices for after the session.
    $('#size').value = d.size; $('#variant').value = d.variant;
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    DOM.isOver(st) ? finish(false) : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.pieces.length || !DOM.isLegal(st, d.m) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else render(false);
}

function localMove(m) {
  if (!canMove() || !DOM.isLegal(st, m)) return;
  const n = st.pieces.length;
  if (play(m) && online()) sess.send('move', { m, n });
}

// ---------- input ----------
// Mouse: hover shows where the domino lands, click places it.
// Touch: press shows the domino, slide to adjust, lift to place (lift off the board to cancel).
function updatePreview(evt) {
  const m = canMove() ? moveAt(evt) : null;
  const same = m && preview && m.r === preview.r && m.c === preview.c && m.o === preview.o;
  if (same || (!m && !preview)) return;
  preview = m;
  drawPreview();
}
svg.addEventListener('pointerdown', (evt) => {
  if (!canMove()) return;
  pressing = true;
  if (evt.pointerType !== 'mouse') svg.setPointerCapture?.(evt.pointerId);
  updatePreview(evt);
});
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType === 'mouse' || pressing) updatePreview(evt);
});
svg.addEventListener('pointerup', (evt) => {
  if (!pressing) return;
  pressing = false;
  const m = canMove() ? moveAt(evt) : null;
  if (m) localMove(m);
  else { preview = null; drawPreview(); }
});
svg.addEventListener('pointercancel', () => { pressing = false; preview = null; drawPreview(); });
svg.addEventListener('pointerleave', (evt) => {
  if (evt.pointerType === 'mouse') { pressing = false; preview = null; drawPreview(); }
});

$('#size').addEventListener('change', (e) => { cfg.size = e.target.value; saveCfg(); restart(); });
$('#variant').addEventListener('change', (e) => { cfg.variant = e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    render(false);
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) finish(false); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#variant').value = cfg.variant;
$('#mode').value = cfg.mode;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; $('#size').value = cfg.size; $('#variant').value = cfg.variant; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
