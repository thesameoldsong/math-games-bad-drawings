import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { DAB } from './engine.js';
import './strings.js';

const SLUG = 'dots-and-boxes';
const S = 64, M = 30; // dot spacing, margin
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 5, mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-dab') || '{}'));
const saveCfg = () => localStorage.setItem('mg-dab', JSON.stringify(cfg));

let st, history, shapes, over, aiTimer, hoverKey, streak = 0;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];       // names announced by the peer in online play
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const session = () => sess;
const online = () => !!session();
const mySeat = () => session().seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || session().connected);
function name(p) {
  if (isAI(p)) return t('dab.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('dab.p' + p);
}
const initial = (p) => [...name(p).trim()][0]?.toUpperCase() || '?';
const drawnCount = (s) => s.R * (s.C + 1) + (s.R + 1) * s.C - DAB.freeEdges(s).length;

// ---------- geometry ----------
const dotXY = (r, c) => [M + c * S, M + r * S];
const ends = (e) => (e.t === 'h' ? [dotXY(e.r, e.c), dotXY(e.r, e.c + 1)] : [dotXY(e.r, e.c), dotXY(e.r + 1, e.c)]);
function distToSeg(px, py, [[x1, y1], [x2, y2]]) {
  const dx = x2 - x1, dy = y2 - y1;
  const k = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - x1 - k * dx, py - y1 - k * dy);
}
function edgeAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  let best = null, bd = S * 0.42;
  for (const e of DAB.freeEdges(st)) {
    const d = distToSeg(p.x, p.y, ends(e));
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// Every edge/box gets its wobble once, so redraws don't jitter.
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- rendering ----------
function* allEdges() {
  for (let r = 0; r <= st.R; r++) for (let c = 0; c < st.C; c++) yield { t: 'h', r, c };
  for (let r = 0; r < st.R; r++) for (let c = 0; c <= st.C; c++) yield { t: 'v', r, c };
}

function render(animateLast) {
  const W = M * 2 + st.C * S, H = M * 2 + st.R * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let out = '';

  for (let r = 0; r < st.R; r++) for (let c = 0; c < st.C; c++) {
    const p = st.box[r][c];
    if (p < 0) continue;
    const [x, y] = dotXY(r, c), cx = x + S / 2, cy = y + S / 2;
    const rot = shapeFor('b' + r + '_' + c, () => (Math.random() * 2 - 1) * 8);
    const fresh = animateLast && st.last && DAB.boxesOf(st, st.last).some(([a, b]) => a === r && b === c);
    out += `<text class="letter${fresh ? ' fresh' : ''}" x="${cx}" y="${cy}" fill="${COLORS[p].main}" transform="rotate(${rot.toFixed(1)} ${cx} ${cy})">${initial(p)}</text>`;
  }

  const lastK = st.last && DAB.key(st.last);
  for (const e of allEdges()) {
    const p = DAB.get(st, e);
    if (p < 0) continue;
    const k = DAB.key(e);
    const d = shapeFor(k, () => { const [[a, b], [c, dd]] = ends(e); return line(a, b, c, dd, 2.2); });
    out += `<path class="edge${k === lastK && animateLast ? ' fresh' : ''}" d="${d}" stroke="${COLORS[p].main}" pathLength="1"/>`;
  }

  out += `<path id="preview" class="preview" d=""/>`;

  for (let r = 0; r <= st.R; r++) for (let c = 0; c <= st.C; c++) {
    const [x, y] = dotXY(r, c);
    out += `<path class="dot" d="${shapeFor('d' + r + '_' + c, () => circle(x, y, 4.2, 4.2, 0.12))}"/>`;
  }
  svg.innerHTML = out;
  hoverKey = null;
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
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 11 + p * 31,
    });
    el.querySelector('.score').textContent = plural(st.score[p], 'dab.boxes');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const again = history.length && history[history.length - 1].turn === st.turn;
  if (over) status.textContent = '';
  else if (online() && !session().connected) status.textContent = t('dab.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('dab.turn.you') : t('dab.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('dab.thinking', { name: name(st.turn) });
  else status.textContent = t(again ? 'dab.turn.again' : 'dab.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('dab.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('dab.online.note') : '';
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1800);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame(size = cfg.size) {
  clearTimeout(aiTimer);
  st = DAB.create(size, size);
  history = []; shapes = {}; over = false; streak = 0;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(e) {
  const prev = DAB.clone(st);
  history.push(prev);
  const who = st.turn;
  const got = DAB.apply(st, e);
  const other = 1 - who;
  if (got) {
    streak++;
    setMood(who, 'happy', streak > 2 ? 'up' : 'wave');
    setMood(other, streak > 2 ? 'worried' : 'sad');
    if (streak === 1 || streak === 4 || Math.random() < 0.25) say(who, streak > 2 ? 'say.chain' : 'say.capture');
    if (streak === 3) say(other, 'say.lost');
  } else {
    // A capture was available but declined: the sneaky AI's double cross.
    const declined = DAB.freeEdges(prev).some((x) => DAB.boxesOf(prev, x).some(([r, c]) => sidesOf(prev, r, c) === 3));
    if (declined && cfg.mode === 'hard' && isAI(who)) { setMood(who, 'smug'); say(who, 'say.dc'); }
    else setMood(who, 'neutral');
    if (moods[other].mood !== 'smug') setMood(other, 'neutral');
    streak = 0;
  }
  if (DAB.isOver(st)) return finish();
  render(true);
  maybeAI();
}
const sidesOf = (s, r, c) =>
  [{ t: 'h', r, c }, { t: 'h', r: r + 1, c }, { t: 'v', r, c }, { t: 'v', r, c: c + 1 }].filter((e) => DAB.get(s, e) >= 0).length;

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => play(DAB.aiMove(st, cfg.mode)), streak ? 380 : 650);
}

function finish() {
  over = true;
  const [a, b] = st.score;
  const w = a === b ? -1 : a > b ? 0 : 1;
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'say.win'); setTimeout(() => say(1 - w, 'say.lose'), 900); }
  render(true);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('dab.tie', { a, b }) : t('dab.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  setTimeout(() => { if (over) $('#result').hidden = false; }, 900);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; streak = 0;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and resize); the guest follows.
const canRestart = () => !online() || session().host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) session().send('new', { size: cfg.size });
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
function sendState() {
  const s = session();
  s.send('state', { st, over, names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = d.over; history = []; shapes = {}; streak = 0;
    cfg.size = st.R; $('#size').value = st.R;
    remoteNames[0] = d.names[0];
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== drawnCount(st) || DAB.get(st, d.e) >= 0) return s.host ? sendState() : s.send('resync');
    play(d.e);
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => { if (s.host) return; cfg.size = d.size; $('#size').value = d.size; newGame(d.size); });
  if (s.host) newGame();
  else render(false);
}

function localMove(e) {
  if (online()) session().send('move', { e, n: drawnCount(st) });
  play(e);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const e = canMove() ? edgeAt(evt) : null;
  const k = e && DAB.key(e);
  if (k === hoverKey) return;
  hoverKey = k;
  const pv = svg.querySelector('#preview');
  if (!e) { pv.setAttribute('d', ''); svg.style.cursor = ''; return; }
  const [[a, b], [c, d]] = ends(e);
  pv.setAttribute('d', `M${a} ${b} L${c} ${d}`);
  pv.setAttribute('stroke', COLORS[st.turn].main);
  svg.style.cursor = 'pointer';
});
svg.addEventListener('pointerleave', () => { hoverKey = null; svg.querySelector('#preview')?.setAttribute('d', ''); });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const e = edgeAt(evt);
  if (e) localMove(e);
});

$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) session().send('name', { seat: p, name: inp.value });
    render(false);
  }));
document.addEventListener('mg:lang', () => render(false));

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
