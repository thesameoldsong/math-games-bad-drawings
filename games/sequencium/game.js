import { t, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, scribble, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { SEQ } from './engine.js';
import './strings.js';

const SLUG = 'sequencium';
const S = 60, M = 8; // cell size, margin
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 6, order: 'alt', mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (![6, 7, 8].includes(+cfg.size)) cfg.size = 6;
if (!['alt', 'double', 'tm'].includes(cfg.order)) cfg.order = 'alt';
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, over, aiTimer, sel = -1, hoverCell = -1;
let nextFirst = 0;                  // who opens the next game (alternates: moving first is an advantage)
let sess = null;                    // online session (shared/net.js), null when playing locally
let shapes = {};                    // cached wobble per element, so redraws don't jitter
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
  if (isAI(p)) return t('seq.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('seq.p' + p);
}

// ---------- geometry ----------
const W = () => M * 2 + st.n * S;
const cellXY = (i) => [M + (i % st.n) * S + S / 2, M + Math.floor(i / st.n) * S + S / 2];
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  if (r < 0 || r >= st.n || c < 0 || c >= st.n) return -1;
  return r * st.n + c;
}
const shapeFor = (k, make) => (shapes[k] ??= make());
const adjacent = (a, b) => a !== b && SEQ.neighbours(st.n)[a].includes(b);
const hasRoom = (i) => SEQ.neighbours(st.n)[i].some((j) => st.own[j] === SEQ.EMPTY);

// What a tap on cell i would do for the player to move.
function actionAt(i) {
  if (i < 0 || !canMove()) return null;
  const p = st.turn;
  if (st.own[i] === p && hasRoom(i)) return { select: i };
  if (st.own[i] !== SEQ.EMPTY) return null;
  // with a number selected only its own dots are live; any other tap just drops the selection
  if (sel >= 0) return adjacent(sel, i) ? { move: { from: sel, to: i } } : null;
  const f = SEQ.bestFrom(st, p, i);
  return f >= 0 ? { move: { from: f, to: i } } : null;
}

// ---------- rendering ----------
function linkPath(from, to, k) {
  return shapeFor(k, () => {
    const [x1, y1] = cellXY(from), [x2, y2] = cellXY(to);
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const cut = len > S * 1.1 ? 17 : 15;
    return line(x1 + ux * cut, y1 + uy * cut, x2 - ux * cut, y2 - uy * cut, 1.6);
  });
}

function numText(i, v, color, cls, extra = '') {
  const [x, y] = cellXY(i);
  const rot = shapeFor('r' + i, () => (Math.random() * 2 - 1) * 6);
  const fs = v >= 10 ? 34 : 40;
  return `<text class="num${cls}" x="${x}" y="${y + 1}" font-size="${fs}" fill="${color}" transform="rotate(${rot.toFixed(1)} ${x} ${y})"${extra}>${v}</text>`;
}

function render(animate) {
  const w = W();
  svg.setAttribute('viewBox', `0 0 ${w} ${w}`);
  const N = st.n * st.n;
  let out = '';
  // blocked centre (7×7)
  for (let i = 0; i < N; i++) {
    if (st.own[i] !== SEQ.BLOCK) continue;
    const [x, y] = cellXY(i);
    out += `<path class="block" d="${shapeFor('blk' + i, () => scribble(x, y, S - 10, S - 14, 9))}"/>`;
  }
  // grid
  for (let k = 0; k <= st.n; k++) {
    const a = M + k * S;
    out += `<path class="grid" d="${shapeFor('h' + k, () => line(M - 2, a, w - M + 2, a, 1.4))}"/>`;
    out += `<path class="grid" d="${shapeFor('v' + k, () => line(a, M - 2, a, w - M + 2, 1.4))}"/>`;
  }
  // links between consecutive numbers
  for (let i = 0; i < N; i++) {
    const p = st.own[i];
    if (p < 0 || st.from[i] < 0) continue;
    const fresh = animate && i === st.last;
    out += `<path class="link${fresh ? ' fresh' : ''}" d="${linkPath(st.from[i], i, 'l' + st.from[i] + '_' + i)}" stroke="${COLORS[p].main}" pathLength="1"/>`;
  }
  // each player's current top number gets a marker loop
  if (st.ply > 0 || over) for (let i = 0; i < N; i++) {
    const p = st.own[i];
    if (p < 0 || st.val[i] !== st.max[p]) continue;
    const [x, y] = cellXY(i);
    out += `<path class="top" d="${shapeFor('top' + i, () => circle(x, y + 1, 25, 23, 0.06))}" stroke="${COLORS[p].main}"/>`;
  }
  // targets for the player to move
  if (canMove()) {
    const p = st.turn;
    if (sel >= 0) {
      const [x, y] = cellXY(sel);
      out += `<path class="ring" d="${shapeFor('ring' + sel, () => circle(x, y + 1, 26, 25, 0.05))}" stroke="${COLORS[p].main}"/>`;
    }
    for (let i = 0; i < N; i++) {
      if (st.own[i] !== SEQ.EMPTY) continue;
      const ok = sel >= 0 ? adjacent(sel, i) : SEQ.bestFrom(st, p, i) >= 0;
      if (!ok) continue;
      const [x, y] = cellXY(i);
      out += `<path class="target" d="${shapeFor('dot' + i, () => circle(x, y, 4.5, 4.5, 0.12))}" fill="${COLORS[p].main}"/>`;
    }
  }
  // numbers
  for (let i = 0; i < N; i++) {
    const p = st.own[i];
    if (p < 0) continue;
    out += numText(i, st.val[i], COLORS[p].main, animate && i === st.last ? ' fresh' : '');
  }
  out += '<g id="preview"></g>';
  svg.innerHTML = out;
  svg.classList.toggle('busy', !canMove());
  hoverCell = -1;
  renderPlayers();
}

function showPreview(a) {
  const g = svg.querySelector('#preview');
  if (!g) return;
  if (!a?.move) { g.innerHTML = ''; return; }
  const { from, to } = a.move, col = COLORS[st.turn].main;
  g.innerHTML = `<path class="link" d="${linkPath(from, to, 'l' + from + '_' + to)}" stroke="${col}"/>` + numText(to, st.val[from] + 1, col, '');
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 23 + p * 37,
    });
    el.querySelector('.score').textContent = t('seq.top', { n: st.max[p] });
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const p = st.turn;
  const again = history.length > 0 && history[history.length - 1].turn === p;
  const two = SEQ.movesAgain(st) && !again;
  const alone = !SEQ.hasMove(st, 1 - p);
  let txt;
  if (over) txt = '';
  else if (online() && !sess.connected) txt = t('seq.online.wait');
  else if (sel >= 0 && canMove()) txt = t('seq.hint.pick', { n: st.val[sel] });
  else if (alone) txt = t('seq.turn.alone', { name: name(p) });
  else if (isAI(p)) txt = t('seq.thinking', { name: name(p) });
  else if (online() && isRemote(p)) txt = t('seq.turn.them', { name: name(p) });
  else if (online()) txt = t(again ? 'seq.you.again' : two ? 'seq.you.two' : 'seq.you');
  else txt = t(again ? 'seq.turn.again' : two ? 'seq.turn.two' : 'seq.turn', { name: name(p) });
  status.textContent = txt;
  status.style.color = COLORS[p].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#order').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('seq.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('seq.online.note') : '';
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
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  st = SEQ.create({ size: +cfg.size, order: cfg.order, first });
  nextFirst = 1 - first;
  history = []; over = false; sel = -1; shapes = {};
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  const prev = SEQ.clone(st);
  history.push(prev);
  const who = st.turn;
  SEQ.apply(st, m);
  sel = -1;
  if (SEQ.isOver(st)) return finish();
  react(prev, who);
  render(true);
  maybeAI();
}

// Reactions: did the move wall the opponent in, grab open space, or take the lead?
function react(prev, who) {
  const other = 1 - who;
  const a = SEQ.outlook(prev).pot, b = SEQ.outlook(st).pot;
  const chatty = (pr) => Math.random() < pr;
  if (SEQ.hasMove(prev, other) && !SEQ.hasMove(st, other)) {
    setMood(who, 'smug', 'wave'); setMood(other, 'sad');
    say(other, 'seq.say.stuck');
    setTimeout(() => !over && say(who, 'seq.say.alone'), 900);
  } else if (!SEQ.hasMove(st, other)) {
    setMood(who, 'happy'); setMood(other, 'sad');
  } else if (b[other] - a[other] <= -3) {
    setMood(who, 'smug', 'wave'); setMood(other, 'worried');
    if (chatty(0.75)) say(who, 'seq.say.cut');
    if (chatty(0.6)) setTimeout(() => !over && say(other, 'seq.say.ouch'), 700);
  } else if (b[who] - a[who] >= 3) {
    setMood(who, 'happy', 'wave'); setMood(other, 'neutral');
    if (chatty(0.6)) say(who, 'seq.say.space');
  } else if (prev.max[who] <= prev.max[other] && st.max[who] > st.max[other]) {
    setMood(who, 'happy'); setMood(other, 'neutral');
    if (chatty(0.5)) say(who, 'seq.say.lead');
  } else {
    setMood(who, b[who] >= b[other] ? 'neutral' : 'worried');
    if (moods[other].mood !== 'sad') setMood(other, 'neutral');
  }
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    const m = SEQ.aiMove(st, cfg.mode, { budget: cfg.mode === 'hard' ? 750 : 300 });
    if (m) play(m);
  }, history.length && history[history.length - 1].turn === st.turn ? 420 : 620);
}

function finish() {
  over = true; sel = -1;
  clearTimeout(aiTimer);
  const w = SEQ.winner(st);
  if (w < 0) {
    setMood(0, 'worried'); setMood(1, 'worried');
    say(0, 'seq.say.tie');
  } else {
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
    say(w, 'seq.say.win');
    setTimeout(() => say(1 - w, 'seq.say.lose'), 900);
  }
  fillResult();
  render(true);
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1100);
}

function fillResult() {
  const txt = $('#result-text'), w = SEQ.winner(st);
  txt.textContent = w < 0 ? t('seq.tie') : t('seq.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  const hi = w < 0 ? 0 : w;
  const why = $('#result-why');
  why.innerHTML = t('seq.score', {
    a: `<b style="color:${COLORS[hi].main}">${st.max[hi]}</b>`,
    b: `<b style="color:${COLORS[1 - hi].main}">${st.max[1 - hi]}</b>`,
  });
  $('#result-next').textContent = t('seq.next', { name: name(nextFirst) });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; sel = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and change the rules); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Host is authoritative: on (re)connect and on every new game it sends the whole state;
// moves carry the move counter (ply) to catch desyncs.
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => render(false));
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = d.over; history = []; sel = -1; nextFirst = d.nextFirst; shapes = {};
    cfg.size = st.n; $('#size').value = st.n;
    cfg.order = st.order; $('#order').value = st.order;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); if (over) fillResult(); });
  s.on('move', (d) => {
    if (d.n !== st.ply || st.turn === s.seat || !SEQ.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else render(false);
}

function localMove(m) {
  if (online()) sess.send('move', { m, n: st.ply });
  play(m);
}

// ---------- input ----------
// Tap an empty cell with a dot: it gets the biggest number that can go there.
// Tap one of your numbers first to grow from that one instead.
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const a = actionAt(cellAt(evt));
  if (a?.move) return localMove(a.move);
  sel = a && a.select !== sel ? a.select : -1;
  render(false);
});
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const i = canMove() ? cellAt(evt) : -1;
  if (i === hoverCell) return;
  hoverCell = i;
  const a = actionAt(i);
  svg.style.cursor = a ? 'pointer' : '';
  showPreview(a);
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; showPreview(null); });

$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
$('#order').addEventListener('change', (e) => { cfg.order = e.target.value; saveCfg(); restart(); });
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
document.addEventListener('mg:lang', () => { render(false); if (over) fillResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#order').value = cfg.order;
$('#mode').value = cfg.mode;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
