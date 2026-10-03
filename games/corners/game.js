import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { CORNERS as C } from './engine.js';
import './strings.js';

const SLUG = 'corners';
const STORE = 'mg-corners';
const S = 50, M = 7, R = 14; // cell size, margin, dot radius
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 7, fill: 'area', hints: 'on', mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem(STORE) || '{}'));
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));

let st, history, shapes, over, aiTimer, sel = null, fresh = new Set(), nextFirst = 0, hoverCell = -1, flash = '', flashTimer;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];       // names announced by the peer in online play
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('cor.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('cor.p' + p);
}
const geo = () => C.geometry(st.n);

// ---------- geometry ----------
const cellXY = (i) => [M + (i % st.n) * S + S / 2, M + Math.floor(i / st.n) * S + S / 2];
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  return c < 0 || r < 0 || c >= st.n || r >= st.n ? -1 : r * st.n + c;
}
// Wobbles are generated once per element, so redraws don't jitter.
const shapeFor = (k, make) => (shapes[k] ??= make());
function squarePath(id, key, amp = 1.6) {
  return shapeFor(key, () => {
    const pts = geo().squares[id].corners.map(cellXY);
    return pts.map((a, j) => { const b = pts[(j + 1) % 4]; return line(a[0], a[1], b[0], b[1], amp); }).join(' ');
  });
}

// ---------- rendering ----------
const showHints = () => cfg.hints === 'on' && !over && isLocal(st.turn) && (!online() || sess.connected);

function render(animate) {
  const n = st.n, W = M * 2 + n * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';

  // grid
  let g = '';
  for (let k = 0; k <= n; k++) {
    const z = M + k * S;
    g += shapeFor('gh' + k, () => line(M - 2, z, M + n * S + 2, z, 1.8)) + ' ';
    g += shapeFor('gv' + k, () => line(z, M - 2, z, M + n * S + 2, 1.8)) + ' ';
  }
  out += `<path class="grid" d="${g}"/>`;

  // claimed squares (faint), the newest one drawn in
  st.claims.forEach((c, k) => {
    const last = k === st.claims.length - 1 && st.last?.t === 'claim';
    out += `<path class="claimed${last ? ' last' : ''}${last && animate ? ' fresh' : ''}" d="${squarePath(c.s, 'q' + k + '_' + c.s)}" stroke="${COLORS[c.p].main}" pathLength="1"/>`;
  });

  // ready squares of the player to move
  const selId = sel ? sel.list[sel.k].s : -1;
  if (showHints()) {
    for (const c of C.claimsFor(st, st.turn)) {
      if (c.s === selId) continue;
      out += `<path class="hint" d="${squarePath(c.s, 'h' + c.s, 1)}" stroke="${COLORS[st.turn].main}"/>`;
    }
  }

  // dots
  for (let i = 0; i < n * n; i++) {
    const p = st.owner[i];
    if (p < 0) continue;
    const [x, y] = cellXY(i);
    const d = shapeFor('c' + i, () => circle(x, y, R, R * 1.03, 0.07));
    const col = COLORS[p];
    const cls = fresh.has(i) && animate ? ' fresh' : '';
    out += `<g class="dot${cls}" style="transform-origin:${x}px ${y}px">`;
    if (st.shaded[i]) out += `<path d="${d}" fill="${col.main}" filter="url(#mg-crayon)"/>`;
    out += `<path class="ring" d="${d}" stroke="${st.shaded[i] ? col.text : col.main}"/></g>`;
  }

  // the square being claimed: bold frame, pulsing corners, ghost dots where new ones will go
  if (sel) {
    const sq = geo().squares[selId], col = COLORS[st.turn];
    out += `<path class="sel" d="${squarePath(selId, 's' + selId, 1.2)}" stroke="${col.main}"/>`;
    for (const i of st.fill === 'edge' ? sq.edge : sq.area) {
      if (st.owner[i] >= 0) continue;
      const [x, y] = cellXY(i);
      out += `<circle class="ghost" cx="${x}" cy="${y}" r="${R - 2}" stroke="${col.main}"/>`;
    }
    for (const i of sq.corners) {
      const [x, y] = cellXY(i);
      out += `<circle class="pulse" cx="${x}" cy="${y}" r="${R + 6}" stroke="${col.main}"/>`;
    }
  }

  out += `<circle id="preview" class="preview" r="${R}" cx="-99" cy="-99"/>`;
  svg.innerHTML = out;
  hoverCell = -1;
  renderPlayers();
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
    el.querySelector('.score').textContent = plural(st.score[p], 'cor.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const text = $('#status-text'), bar = $('#claim-bar');
  const final = st.phase === 'final';
  const ready = cfg.hints === 'on' && C.hasClaim(st, st.turn);
  let s = '';
  if (over) s = '';
  else if (online() && !sess.connected) s = t('cor.online.wait');
  else if (flash) s = flash;
  else if (online()) s = isLocal(st.turn) ? t(final ? 'cor.turn.you.final' : ready ? 'cor.turn.you.ready' : 'cor.turn.you') : t('cor.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) s = t('cor.thinking', { name: name(st.turn) });
  else s = t(final ? 'cor.turn.final' : ready ? 'cor.turn.ready' : 'cor.turn', { name: name(st.turn) });
  text.textContent = s;
  $('#status').style.color = COLORS[st.turn].main;

  bar.hidden = !sel;
  text.hidden = !!sel;
  if (sel) {
    const c = sel.list[sel.k];
    $('#claim-ok').textContent = c.points ? t('cor.claim', { n: c.points }) : t('cor.claim0');
    $('#claim-next').hidden = sel.list.length < 2;
    $('#claim-next').textContent = t('cor.other', { i: sel.k + 1, k: sel.list.length });
  }

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#fill').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('cor.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('cor.online.note') : '';
}

const bubbleTimers = [];
let sayTimers = [];                 // delayed lines; dropped when the position resets
function say(p, key, delay = 0) {
  sayTimers.push(setTimeout(() => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  }, delay));
}
const hushDelayed = () => { sayTimers.forEach(clearTimeout); sayTimers = []; };
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
function showFlash(key) {
  flash = t(key);
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { flash = ''; if (st) renderPlayers(); }, 1600);
  renderPlayers();
}

// ---------- flow ----------
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  hushDelayed();
  st = C.create(cfg.size, { fill: cfg.fill, first });
  nextFirst = 1 - first;
  history = []; shapes = {}; over = false; sel = null; fresh = new Set(); flash = '';
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  const prev = C.clone(st);
  const who = st.turn, other = 1 - who;
  const blocks = m.t === 'dot' && C.threatCells(st, other).has(m.i);
  const readyBefore = C.claimsFor(st, who).length;
  if (!C.apply(st, m)) return false;
  history.push(prev);
  sel = null;
  fresh = new Set();
  for (let i = 0; i < st.owner.length; i++) if (st.owner[i] !== prev.owner[i] || st.shaded[i] !== prev.shaded[i]) fresh.add(i);

  if (m.t === 'dot') {
    const made = C.claimsFor(st, who).length - readyBefore;
    if (made >= 2) { setMood(who, 'smug', 'up'); setMood(other, 'worried'); say(who, 'cor.say.fork'); }
    else if (made === 1) { setMood(who, 'smug'); setMood(other, 'worried'); if (Math.random() < 0.6) say(who, 'cor.say.square'); }
    else if (blocks) { setMood(who, 'happy', 'wave'); setMood(other, 'sad'); say(who, 'cor.say.block'); if (Math.random() < 0.5) say(other, 'cor.say.blocked', 700); }
    else { setMood(who, 'neutral'); if (moods[other].mood === 'happy' || moods[other].mood === 'sad') setMood(other, 'neutral'); }
  } else {
    const { points, dots } = st.last;
    if (points + dots >= 8) { setMood(who, 'happy', 'up'); setMood(other, 'sad'); say(who, 'cor.say.big'); say(other, 'cor.say.ouch', 800); }
    else { setMood(who, 'happy', 'wave'); if (moods[other].mood !== 'worried') setMood(other, 'neutral'); if (Math.random() < 0.7) say(who, 'cor.say.claim'); }
  }
  st.skipped.forEach((p, k) => { setMood(p, 'sad'); say(p, 'cor.say.pass', 600 + k * 500); });

  if (C.isOver(st)) { finish(); return true; }
  render(true);
  maybeAI();
  return true;
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => play(C.aiMove(st, cfg.mode)), st.phase === 'final' ? 900 : 650);
}

function finish() {
  over = true;
  const w = C.winner(st);
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); say(0, 'cor.say.tie', 300); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'cor.say.win', 300); say(1 - w, 'cor.say.lose', 1200); }
  render(true);
  finishText();
  $('#result-text').style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1100);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  hushDelayed();
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; sel = null; fresh = new Set();
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and change the board); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  const first = nextFirst;
  newGame(first);
  if (online()) sess.send('new', { size: cfg.size, fill: cfg.fill, first });
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
function sendState() {
  sess.send('state', { st, over, nextFirst, names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => { sel = null; render(false); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = false; nextFirst = d.nextFirst; history = []; shapes = {}; sel = null; fresh = new Set();
    cfg.size = st.n; cfg.fill = st.fill;
    $('#size').value = st.n; $('#fill').value = st.fill;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    C.isOver(st) ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (s.host && st.turn === s.seat) return sendState(); // not the guest's turn
    if (d.n !== st.moves || !C.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => {
    if (s.host) return;
    cfg.size = d.size; cfg.fill = d.fill;
    $('#size').value = d.size; $('#fill').value = d.fill;
    newGame(d.first);
  });
  if (s.host) newGame(0);
  else render(false);
}

function localMove(m) {
  if (!C.isLegal(st, m)) return;
  if (online()) sess.send('move', { m, n: st.moves });
  play(m);
}

// ---------- input ----------
function cancelSel() { if (sel) { sel = null; render(false); } }

svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const i = cellAt(evt);
  if (i < 0) return cancelSel();
  if (sel && geo().squares[sel.list[sel.k].s].corners.includes(i)) return localMove({ t: 'claim', s: sel.list[sel.k].s });
  const cand = C.claimsAt(st, i);
  if (cand.length) { sel = { cell: i, list: cand, k: 0 }; flash = ''; return render(false); }
  if (sel) return cancelSel();
  if (st.owner[i] < 0) return localMove({ t: 'dot', i });
  if (st.owner[i] === st.turn) showFlash('cor.noclaim');
});

svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const i = canMove() ? cellAt(evt) : -1;
  if (i === hoverCell) return;
  hoverCell = i;
  const pv = svg.querySelector('#preview');
  const empty = i >= 0 && st.owner[i] < 0 && st.phase === 'play' && !sel;
  const claimable = i >= 0 && C.claimsAt(st, i).length > 0;
  if (empty) {
    const [x, y] = cellXY(i);
    pv.setAttribute('cx', x); pv.setAttribute('cy', y);
    pv.setAttribute('stroke', COLORS[st.turn].main);
  } else { pv.setAttribute('cx', -99); pv.setAttribute('cy', -99); }
  svg.style.cursor = empty || claimable ? 'pointer' : '';
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; svg.querySelector('#preview')?.setAttribute('cx', -99); });

$('#claim-ok').addEventListener('click', () => { if (sel && canMove()) localMove({ t: 'claim', s: sel.list[sel.k].s }); });
$('#claim-next').addEventListener('click', () => { if (sel) { sel.k = (sel.k + 1) % sel.list.length; render(false); } });
$('#claim-cancel').addEventListener('click', cancelSel);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sel && !document.querySelector('dialog[open]')) cancelSel(); });

$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
$('#fill').addEventListener('change', (e) => { cfg.fill = e.target.value; saveCfg(); restart(); });
$('#hints').addEventListener('change', (e) => { cfg.hints = e.target.value; saveCfg(); render(false); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(0); });
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
document.addEventListener('mg:lang', () => { render(false); if (over) finishText(); });
function finishText() {
  const [a, b] = st.score, w = C.winner(st);
  $('#result-text').textContent = w < 0 ? t('cor.tie', { a, b }) : t('cor.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  $('#result-next').textContent = t('cor.next', { name: name(nextFirst) });
}

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#fill').value = cfg.fill;
$('#hints').value = cfg.hints;
$('#mode').value = cfg.mode;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
