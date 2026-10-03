import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { GL } from './engine.js';
import './strings.js';

const SLUG = 'gridlock';
const CS = 30, GAP = 26, M = 7; // cell size, gap between grids, margin (SVG units)
const COLORS = [PALETTE.blue, PALETTE.red];
const ROLL_MS = 650;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 10, mode: 'pvp', spoil: true, names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, passTimer, rollTimer, rolling = false, starter = 1;
let ghost = null, orient = 0, anchor = null;  // pending rectangle preview, chosen orientation, its centre (board, row, col)
let sess = null;                               // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !st.over && !rolling && !!st.dice && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('gl.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('gl.p' + p);
}

// ---------- geometry ----------
const bx = (b) => M + b * (st.N * CS + GAP);
const sizeW = () => 2 * M + 2 * st.N * CS + GAP;
const sizeH = () => 2 * M + st.N * CS;
const curShape = () => { const sh = GL.shapesOf(st.dice); return sh[orient % sh.length]; };
const boardAllowed = (b) => b === st.turn || (st.spoil && b === 1 - st.turn);

function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
// Pointer → anchor (board + fractional cell coordinates of the rectangle's centre).
function anchorAt(p) {
  const b = p.x < M + st.N * CS + GAP / 2 ? 0 : 1;
  if (!boardAllowed(b)) return null;
  return { b, y: (p.y - M) / CS, x: (p.x - bx(b)) / CS };
}
function ghostFrom(a) {
  if (!a || !st.dice) return null;
  const [h, w] = curShape(), N = st.N;
  const clamp = (v, n) => Math.max(0, Math.min(N - n, v));
  return { b: a.b, r: clamp(Math.round(a.y - h / 2), h), c: clamp(Math.round(a.x - w / 2), w), h, w };
}
const inGhost = (p) => ghost && p.x >= bx(ghost.b) + ghost.c * CS && p.x <= bx(ghost.b) + (ghost.c + ghost.w) * CS &&
  p.y >= M + ghost.r * CS && p.y <= M + (ghost.r + ghost.h) * CS;

// Wobbly marker outline of a rectangle (cached per key so redraws don't jitter).
const shapeFor = (k, make) => (shapes[k] ??= make());
function rectPath(x, y, w, h, amp = 1.2) {
  return [line(x, y, x + w, y, amp), line(x + w, y, x + w, y + h, amp), line(x + w, y + h, x, y + h, amp), line(x, y + h, x, y, amp)].join(' ');
}

// ---------- rendering ----------
function render(fresh) {
  const N = st.N;
  svg.setAttribute('viewBox', `0 0 ${sizeW()} ${sizeH()}`);
  let out = '';
  for (const b of [0, 1]) {
    const x0 = bx(b), y0 = M, L = N * CS;
    const active = !st.over && st.turn === b;
    out += `<rect class="paper${active ? ' on' : ''}" x="${x0}" y="${y0}" width="${L}" height="${L}" style="--c:${COLORS[b].fill}"/>`;
    let grid = '';
    for (let i = 1; i < N; i++) {
      grid += shapeFor(`g${b}h${i}`, () => line(x0, y0 + i * CS, x0 + L, y0 + i * CS, 0.8)) + ' ';
      grid += shapeFor(`g${b}v${i}`, () => line(x0 + i * CS, y0, x0 + i * CS, y0 + L, 0.8)) + ' ';
    }
    out += `<path class="grid" d="${grid}"/>`;
  }
  st.pieces.forEach((pc, i) => {
    const x = bx(pc.b) + pc.c * CS, y = M + pc.r * CS, w = pc.w * CS, h = pc.h * CS;
    const isFresh = fresh && i === st.pieces.length - 1;
    const spoil = pc.b !== pc.p;
    out += `<g class="piece${isFresh ? ' fresh' : ''}${spoil ? ' spoil' : ''}" style="transform-origin:${x + w / 2}px ${y + h / 2}px">`;
    out += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="${COLORS[pc.p].fill}" filter="url(#mg-crayon)"/>`;
    out += `<path class="outline" d="${shapeFor(`p${pc.b},${pc.r},${pc.c},${pc.h},${pc.w}`, () => rectPath(x + 1.5, y + 1.5, w - 3, h - 3, 1.6))}" stroke="${COLORS[pc.p].main}"/>`;
    out += `</g>`;
  });
  for (const b of [0, 1]) {
    const L = N * CS;
    out += `<path class="frame${!st.over && st.turn === b ? ' on' : ''}" d="${shapeFor('f' + b, () => rectPath(bx(b), M, L, L, 1.6))}" stroke="${COLORS[b].main}"/>`;
  }
  out += '<g id="ghost"></g>';
  svg.innerHTML = out;
  renderGhost();
  renderControls();
  renderPlayers();
}

function renderGhost() {
  const g = svg.querySelector('#ghost');
  if (!g) return;
  if (!ghost || !canMove()) { g.innerHTML = ''; return; }
  const ok = GL.canPlace(st, ghost);
  const x = bx(ghost.b) + ghost.c * CS, y = M + ghost.r * CS, w = ghost.w * CS, h = ghost.h * CS;
  const col = ok ? COLORS[st.turn].main : '#8a8a92';
  g.setAttribute('class', ok ? 'ghost ok' : 'ghost bad');
  g.innerHTML = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ok ? COLORS[st.turn].fill : 'url(#gl-hatch)'}" stroke="${col}"/>` +
    (ok ? '' : `<path class="x" d="M${x + 6} ${y + 6} L${x + w - 6} ${y + h - 6} M${x + w - 6} ${y + 6} L${x + 6} ${y + h - 6}"/>`);
}

const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]], 5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]] };
function dieSVG(v, i) {
  const d = shapeFor('die' + i, () => rectPath(3, 3, 38, 38, 1.4));
  let s = `<svg viewBox="0 0 44 44" class="die" aria-hidden="true"><rect x="4" y="4" width="36" height="36" rx="7" fill="#fff"/><path d="${d}" class="die-edge"/>`;
  if (v) for (const [r, c] of PIPS[v]) s += `<circle cx="${12 + c * 10}" cy="${12 + r * 10}" r="3.4" class="pip"/>`;
  else s += `<text x="22" y="24" class="q">?</text>`;
  return s + '</svg>';
}

function renderControls() {
  const dice = st.dice;
  const dEl = $('#dice');
  dEl.innerHTML = dieSVG(rolling || !dice ? (rolling ? 1 + ((Math.random() * 6) | 0) : 0) : dice[0], 0) +
    dieSVG(rolling || !dice ? (rolling ? 1 + ((Math.random() * 6) | 0) : 0) : dice[1], 1);
  dEl.classList.toggle('rolling', rolling);
  dEl.style.setProperty('--c', COLORS[st.turn].main);
  const showShape = dice && !rolling && !st.over;
  const sEl = $('#shape-svg');
  if (showShape) {
    const [h, w] = curShape(), u = 36 / 6;
    sEl.innerHTML = `<rect x="${2 + (6 - w) * u / 2}" y="${2 + (6 - h) * u / 2}" width="${w * u}" height="${h * u}" fill="${COLORS[st.turn].fill}" stroke="${COLORS[st.turn].main}" stroke-width="2"/>`;
    $('#shape-txt').textContent = `${h}×${w}`;
  } else { sEl.innerHTML = ''; $('#shape-txt').textContent = ''; }
  const my = canMove();
  const square = dice && dice[0] === dice[1];
  $('#shape').disabled = !my || square;
  $('#rotate').disabled = !my || square;
  const pass = my && GL.canPass(st);
  $('#pass').hidden = !pass;
  $('#place').hidden = pass && !ghost;
  $('#place').disabled = !my || !ghost || !GL.canPlace(st, ghost);
  $('#ctrl').classList.toggle('idle', !my);
  $('#ctrl').style.visibility = st.over ? 'hidden' : '';
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !st.over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = st.over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29 });
    el.querySelector('.score').textContent = plural(GL.score(st, p), 'gl.cells');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const status = $('#status');
  const [a, b] = st.dice || [0, 0];
  let txt = '';
  if (st.over) txt = '';
  else if (online() && !sess.connected) txt = t('gl.online.wait');
  else if (rolling || !st.dice) txt = t('gl.rolling');
  else if (isAI(st.turn)) txt = t('gl.thinking', { name: name(st.turn) });
  else if (isRemote(st.turn)) txt = t('gl.turn.them', { name: name(st.turn) });
  else if (!GL.fitsOwn(st)) txt = t(GL.fitsOpp(st) ? 'gl.nofit.own' : 'gl.nofit.all', { a, b });
  else txt = online() ? t('gl.turn.you', { a, b }) : t('gl.turn', { name: name(st.turn), a, b });
  status.textContent = txt;
  status.classList.toggle('long', txt.length > 34);
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !st.over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#spoil').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('gl.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('gl.online.note') : '';
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
function clearTimers() { clearTimeout(aiTimer); clearTimeout(passTimer); clearTimeout(rollTimer); rolling = false; }

function newGame() {
  clearTimers();
  starter = 1 - starter;
  st = GL.create(cfg.size, { spoil: cfg.spoil, first: starter });
  history = []; shapes = {}; ghost = null; anchor = null; orient = 0;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  if (!online() || sess.host) startTurn();
  else render(false);
  if (online() && sess.host) sendState();
}

// Roll for the side to move (host / local only), with a short tumble.
function startTurn(fresh = false) {
  if (st.over) return;
  if (!st.dice) GL.roll(st);
  beginTurn(fresh);
}
function beginTurn(fresh = false) {
  ghost = null; anchor = null; orient = 0;
  rolling = true;
  render(fresh);
  let spins = 0;
  const spin = () => {
    if (!rolling) return;
    if (++spins * 90 < ROLL_MS) { renderControls(); rollTimer = setTimeout(spin, 90); return; }
    rolling = false;
    render(false);
    afterRoll();
  };
  rollTimer = setTimeout(spin, 90);
}

function afterRoll() {
  if (st.over) return;
  if (isAI(st.turn)) { aiTimer = setTimeout(() => play(GL.aiMove(st, cfg.mode)), 700); return; }
  // Nothing fits anywhere → the turn is lost automatically.
  if (isLocal(st.turn) && GL.canPass(st) && !GL.fitsOpp(st) && (!online() || sess.connected)) {
    passTimer = setTimeout(() => { if (canMove() && GL.canPass(st) && !GL.fitsOpp(st)) localMove({ pass: true }); }, 1600);
  }
}

function react(prev, m) {
  const who = prev.turn, other = 1 - who;
  if (m.pass) {
    setMood(who, 'sad'); say(who, 'say.pass');
    setMood(other, 'smug');
    if (Math.random() < 0.4) setTimeout(() => say(other, 'say.passOther'), 700);
    return;
  }
  const area = m.h * m.w;
  if (m.b !== who) {
    setMood(who, 'smug', 'point'); say(who, 'say.spoil');
    setMood(other, 'worried'); setTimeout(() => say(other, 'say.spoiled'), 650);
    return;
  }
  setMood(other, 'neutral');
  if (area >= 20) { setMood(who, 'happy', 'up'); say(who, 'say.big'); setMood(other, 'worried'); }
  else if (area <= 2) { setMood(who, 'neutral'); if (Math.random() < 0.5) say(who, 'say.tiny'); }
  else if (GL.contact(prev.cells[m.b], prev.N, m) >= 0.75 && area >= 4) { setMood(who, 'happy', 'wave'); if (Math.random() < 0.45) say(who, 'say.snug'); }
  else setMood(who, area >= 12 ? 'happy' : 'neutral');
}

// Applies a move. With `next` (dice for the following turn, from the host) online guests skip rolling.
function play(m, next) {
  clearTimers();
  const prev = GL.clone(st);
  if (!GL.apply(st, m)) return false;
  history.push(prev);
  react(prev, m);
  ghost = null; anchor = null;
  if (st.over) { finish(); return true; }
  if (next) st.dice = next.slice();
  if (online() && !sess.host && !st.dice) { render(true); return true; } // wait for host's roll
  startTurn(true);
  return true;
}

function finish() {
  const w = GL.winner(st);
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'say.win'); setTimeout(() => say(1 - w, 'say.lose'), 900); }
  render(true);
  resultText();
  setTimeout(() => { if (st.over) $('#result').hidden = false; }, 1100);
}
function resultText() {
  const a = GL.score(st, 0), b = GL.score(st, 1), w = GL.winner(st);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('gl.tie', { a, b }) : t('gl.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-sub').textContent = t('gl.lastpass');
}

function undo() {
  if (!history.length || online()) return;
  clearTimers();
  do st = history.pop(); while (history.length && isAI(st.turn));
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  ghost = null; anchor = null; orient = 0;
  render(false);
  afterRoll();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
}

// ---------- online ----------
// Host is authoritative: it owns the dice and sends the full state on (re)connect.
// 'move' {m, n, dice?}: n = moves made before it; host attaches the next roll to its own moves.
// 'roll' {n, dice}: host's roll after the guest's move.
function sendState() {
  sess.send('state', { st, names: cfg.names, starter });
}
function onSession(s) {
  sess = s;
  clearTimers();
  s.on('status', () => { renderPlayers(); renderControls(); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    clearTimers();
    st = d.st; starter = d.starter; history = []; shapes = {}; ghost = null; anchor = null; orient = 0;
    cfg.size = st.N; cfg.spoil = st.spoil;
    $('#size').value = st.N; $('#spoil').value = st.spoil ? '1' : '0';
    remoteNames[0] = d.names[0];
    $('#result').hidden = true;
    if (st.over) finish();
    else { setMood(0, 'neutral'); setMood(1, 'neutral'); render(false); afterRoll(); }
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.n || !st.dice || st.turn === s.seat) return s.host ? sendState() : s.send('resync');
    if (!play(d.m, d.dice)) return s.host ? sendState() : s.send('resync');
    if (s.host && !st.over) s.send('roll', { n: st.n, dice: st.dice });
  });
  s.on('roll', (d) => {
    if (s.host) return;
    if (d.n !== st.n || st.over) return s.send('resync');
    if (st.dice) return;
    st.dice = d.dice;
    beginTurn(false);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) { starter = 1; newGame(); }
  else render(false);
}

function localMove(m) {
  if (!canMove()) return;
  const n = st.n;
  if (!play(m)) return;
  if (online()) sess.send('move', sess.host ? { m, n, dice: st.dice } : { m, n });
}

// ---------- input ----------
let down = null; // {x, y, inside, moved}
function setGhost(a) {
  anchor = a;
  const g = ghostFrom(a);
  const same = g && ghost && g.b === ghost.b && g.r === ghost.r && g.c === ghost.c && g.h === ghost.h;
  ghost = g;
  if (!same) { renderGhost(); renderControls(); }
}
svg.addEventListener('pointerdown', (evt) => {
  if (!canMove() || evt.button !== 0) return; // right button rotates (contextmenu)
  const p = svgPoint(evt);
  down = { x: evt.clientX, y: evt.clientY, inside: inGhost(p) && GL.canPlace(st, ghost), moved: false, mouse: evt.pointerType === 'mouse' };
  if (!down.inside) setGhost(anchorAt(p));
  try { svg.setPointerCapture(evt.pointerId); } catch {}
});
svg.addEventListener('pointermove', (evt) => {
  if (!canMove()) return;
  if (down) {
    if (Math.hypot(evt.clientX - down.x, evt.clientY - down.y) > 8) down.moved = true;
    if (down.moved || !down.inside) setGhost(anchorAt(svgPoint(evt)));
  } else if (evt.pointerType === 'mouse') setGhost(anchorAt(svgPoint(evt)));
});
svg.addEventListener('pointerup', () => {
  if (!down) return;
  const d = down;
  down = null;
  if (!canMove() || !ghost) return;
  // Mouse: click places right away. Touch: first tap shows the shadow, a second tap on it places.
  if ((d.mouse || (d.inside && !d.moved)) && GL.canPlace(st, ghost)) localMove({ ...ghost });
});
svg.addEventListener('pointercancel', () => { down = null; });
svg.addEventListener('pointerleave', (evt) => {
  if (evt.pointerType === 'mouse' && !down && ghost) { ghost = null; renderGhost(); renderControls(); }
});
svg.addEventListener('contextmenu', (evt) => { evt.preventDefault(); rotate(); });

function rotate() {
  if (!canMove() || st.dice[0] === st.dice[1]) return;
  orient ^= 1;
  ghost = ghostFrom(anchor);
  renderGhost(); renderControls();
}
$('#rotate').addEventListener('click', rotate);
$('#shape').addEventListener('click', rotate);
$('#dice').addEventListener('click', rotate);
$('#place').addEventListener('click', () => { if (ghost && GL.canPlace(st, ghost)) localMove({ ...ghost }); });
$('#pass').addEventListener('click', () => { if (canMove() && GL.canPass(st)) localMove({ pass: true }); });
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, dialog[open]')) return;
  if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') rotate();
});

$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); starter = 1; restart(); });
$('#spoil').addEventListener('change', (e) => { cfg.spoil = e.target.value === '1'; saveCfg(); starter = 1; restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); starter = 1; newGame(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    renderPlayers();
  }));
document.addEventListener('mg:lang', () => { render(false); if (st.over) resultText(); });

// ---------- boot ----------
injectDefs();
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="gl-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="8" height="8" fill="rgba(140,140,150,.12)"/><line x1="0" y1="0" x2="0" y2="8" stroke="rgba(120,120,130,.45)" stroke-width="3"/>
  </pattern></defs></svg>`);
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
$('#spoil').value = cfg.spoil ? '1' : '0';
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; starter = 1; newGame(); },
});
if (!online()) showOnce('how', SLUG);
// Read-only hook for UI test scripts.
window.__gridlock = { get st() { return st; }, get ghost() { return ghost; }, get rolling() { return rolling; } };
