import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { SIM } from './engine.js';
import './strings.js';

const SLUG = 'sim';
const W = 300, H = 268;
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', layout: 'hex', rule: 'auto', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-sim') || '{}'));
const saveCfg = () => localStorage.setItem('mg-sim', JSON.stringify(cfg));

let st, history, over, aiTimer;
let sel = -1;                       // first dot of a line being drawn
let calling = false, callSel = [];  // "SIM!" mode: dots picked so far
let hoverKey = '';
let nextFirst = 0;                  // who opens the next game (alternates)
let wins = [0, 0];
let sess = null;                    // online session (shared/net.js), null when playing locally
const shapes = {};                  // cached wobble per element
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
  if (isAI(p)) return t('sim.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('sim.p' + p);
}

// ---------- geometry ----------
// Two arrangements of the same six dots (the graph is identical, only the picture changes).
const LAYOUTS = {
  // flat-top hexagon
  hex: Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k + Math.PI;
    return [150 + 122 * Math.cos(a), 134 + 122 * Math.sin(a)];
  }),
  // triangle inside a triangle: only three crossings
  jim: Array.from({ length: 6 }, (_, k) => {
    const outer = k % 2 === 0, r = outer ? 140 : 54;
    const a = -Math.PI / 2 + (Math.PI * 2 / 3) * Math.floor(k / 2) + (outer ? 0 : 0.1);
    return [150 + r * Math.cos(a), 168 + r * Math.sin(a)];
  }),
};
const P = () => LAYOUTS[cfg.layout] || LAYOUTS.hex;
const ends = (i) => SIM.EDGES[i].map((v) => P()[v]);

function toSvg(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function distToSeg(px, py, [[x1, y1], [x2, y2]]) {
  const dx = x2 - x1, dy = y2 - y1;
  const k = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - x1 - k * dx, py - y1 - k * dy);
}
// What is under the pointer: { dot } or { edge } (a free line, only when unambiguous) or null.
function hitAt(evt) {
  const p = toSvg(evt);
  let bd = 30, dot = -1;
  P().forEach(([x, y], v) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; dot = v; } });
  if (dot >= 0) return { dot };
  if (calling || sel >= 0) return null;
  const ds = SIM.freeEdges(st).map((i) => ({ i, d: distToSeg(p.x, p.y, ends(i)) })).sort((a, b) => a.d - b.d);
  if (ds.length && ds[0].d < 13 && (ds.length < 2 || ds[1].d > ds[0].d + 6)) return { edge: ds[0].i };
  return null;
}
const hasFree = (v) => SIM.freeEdges(st).some((i) => SIM.EDGES[i].includes(v));

const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- rendering ----------
function render(animate) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const L = cfg.layout;
  let out = '';
  const free = SIM.freeEdges(st);
  const live = canMove() && !calling;

  // the deciding triangle: crayon glow under the lines
  if (over && st.tri) {
    const pts = st.tri.map((v) => P()[v]);
    const c = SIM.monoColor(st, st.tri);
    const d = shapeFor(`tri${L}${st.tri}`, () => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`);
    if (c >= 0) {
      out += `<path class="tri-fill" d="${d}" fill="${COLORS[c].fill}" filter="url(#mg-crayon)"/>`;
      out += `<path class="tri-glow" d="${d}" stroke="${COLORS[c].fill}"/>`;
    }
  }

  // faint pencil guides for every line still free
  for (const i of free) {
    const [[a, b], [c, d]] = ends(i);
    const near = sel >= 0 && SIM.EDGES[i].includes(sel);
    const path = shapeFor(`g${L}${i}`, () => line(a, b, c, d, 1.2));
    out += `<path class="guide${near ? ' near' : ''}" d="${path}"${near ? ` stroke="${COLORS[st.turn].main}"` : ''}/>`;
  }
  // coloured lines
  st.col.forEach((p, i) => {
    if (p < 0) return;
    const [[a, b], [c, d]] = ends(i);
    const path = shapeFor(`e${L}${i}`, () => line(a, b, c, d, 2));
    const fresh = animate && st.last && st.last.e === i;
    out += `<path class="edge${fresh ? ' fresh' : ''}" d="${path}" stroke="${COLORS[p].main}" pathLength="1"/>`;
  });
  // a wrong call: dashed pencil triangle
  if (over && st.tri && st.reason === 'false') {
    const pts = st.tri.map((v) => P()[v]);
    out += `<path class="tri-false" d="M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z"/>`;
  }
  out += `<path id="preview" class="preview" d=""/>`;

  // dots (+ selection rings)
  P().forEach(([x, y], v) => {
    if (v === sel) out += `<path class="ring sel" d="${shapeFor(`r${L}${v}`, () => circle(x, y, 17, 17, 0.06))}" stroke="${COLORS[st.turn].main}"/>`;
    if (callSel.includes(v)) out += `<path class="ring call" d="${shapeFor(`c${L}${v}`, () => circle(x, y, 18, 18, 0.06))}"/>`;
    const lit = live && sel >= 0 && v !== sel && free.includes(SIM.edge(sel, v));
    out += `<path class="dot${lit ? ' lit' : ''}" d="${shapeFor(`d${L}${v}`, () => circle(x, y, 7.5, 7.5, 0.1))}"${lit ? ` style="--c:${COLORS[st.turn].main}"` : ''}/>`;
  });
  svg.innerHTML = out;
  svg.classList.toggle('busy', !canMove());
  hoverKey = '';
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
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 23 + p * 37,
    });
    el.querySelector('.score').textContent = plural(wins[p], 'sim.wins');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('sim.online.wait');
  else if (canMove() && SIM.mustCall(st)) status.textContent = t('sim.call.full');
  else if (canMove() && calling) status.textContent = t('sim.call.pick');
  else if (canMove() && sel >= 0) status.textContent = t('sim.turn.pick', { name: online() ? t('sim.turn.you') : name(st.turn) });
  else if (online()) status.textContent = isLocal(st.turn) ? t('sim.turn.you') : t('sim.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('sim.thinking', { name: name(st.turn) });
  else status.textContent = t('sim.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  const call = $('#call');
  call.hidden = !st.manual || !canMove();
  call.textContent = t(calling && !SIM.mustCall(st) ? 'sim.call.cancel' : 'sim.call.btn');
  call.classList.toggle('on', calling);
  call.style.setProperty('--c', COLORS[st.turn].main);

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#rule').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('sim.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('sim.online.note') : '';
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
function resetInput() { sel = -1; calling = false; callSel = []; }

function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  st = SIM.create({ first, manual: cfg.rule === 'manual' });
  nextFirst = 1 - first;
  history = []; over = false; resetInput();
  for (const k in shapes) if (k.startsWith('tri')) delete shapes[k];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  if (Math.random() < 0.4) say(first, 'say.start');
  maybeAI();
}

function play(m) {
  const prev = SIM.clone(st);
  history.push({ st: prev, wins: [...wins] });
  const who = st.turn, other = 1 - who;
  SIM.apply(st, m);
  resetInput();
  if (st.over) return finish();
  if (!st.manual) react(prev, who, other);
  render(true);
  maybeAI();
}

// Reactions to an ordinary move (auto rule only: in the paper version a reaction would give triangles away).
function react(prev, who, other) {
  const oppSafe = SIM.safeEdges(st, other).length;
  const mySafe = SIM.safeEdges(st, who).length;
  const freeLeft = SIM.freeEdges(st).length;
  if (oppSafe === 0) {
    setMood(who, 'smug', 'wave'); setMood(other, 'worried');
    say(who, 'say.trap');
    setTimeout(() => say(other, 'say.stuck'), 800);
    return;
  }
  // Late in the game the position is cheap to solve exactly: notice a thrown-away win.
  if (freeLeft <= 9 && SIM.moverWins(prev) && SIM.moverWins(st)) {
    setMood(other, 'smug'); setMood(who, 'neutral');
    if (isAI(other) || Math.random() < 0.5) say(other, 'say.hmm');
    return;
  }
  if (oppSafe <= 2 && mySafe > oppSafe) {
    setMood(who, 'happy'); setMood(other, 'worried');
    if (Math.random() < 0.5) say(other, 'say.tight');
    return;
  }
  if (mySafe <= 1 && freeLeft > 1) {
    setMood(who, 'worried'); setMood(other, 'neutral');
    if (Math.random() < 0.5) say(who, 'say.tight');
    return;
  }
  setMood(who, 'neutral');
  if (moods[other].mood !== 'smug') setMood(other, 'neutral');
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const m = SIM.aiMove(st, cfg.mode);
    if (m && SIM.isLegal(st, m)) play(m);
  }, 700);
}

function finish() {
  over = true;
  clearTimeout(aiTimer);
  const w = st.winner, l = 1 - w;
  wins[w]++;
  const lines = {
    triangle: ['say.win', 'say.oops'],
    called: ['say.sim', 'say.lose'],
    stolen: ['say.steal', 'say.lose'],
    false: ['say.lucky', 'say.false'],
  }[st.reason];
  setMood(w, st.reason === 'stolen' ? 'smug' : 'happy', 'up');
  setMood(l, 'sad');
  if (st.reason === 'triangle') {
    say(l, lines[1]);
    setTimeout(() => say(w, lines[0]), 900);
  } else {
    say(st.last.p, st.reason === 'false' ? lines[1] : lines[0]);
    setTimeout(() => say(1 - st.last.p, st.reason === 'false' ? lines[0] : lines[1]), 900);
  }
  fillResult();
  render(true);
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1300);
}

function fillResult() {
  const w = st.winner, l = 1 - w;
  const txt = $('#result-text');
  txt.textContent = t('sim.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-why').textContent = t('sim.why.' + st.reason, { winner: name(w), loser: name(l) });
  $('#result-next').textContent = t('sim.next', { name: name(nextFirst) });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  let h;
  do { h = history.pop(); } while (history.length && isAI(h.st.turn));
  st = h.st; wins = h.wins;
  over = false; resetInput();
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
// moves carry the ply counter to catch desyncs.
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst, wins });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  wins = [0, 0];
  s.on('status', () => render(false));
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = false; history = []; nextFirst = d.nextFirst; wins = d.wins || [0, 0];
    resetInput();
    $('#rule').value = st.manual ? 'manual' : 'auto';
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    if (d.over) { over = true; fillResult(); render(false); $('#result').hidden = false; }
    else render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); if (over) fillResult(); });
  s.on('move', (d) => {
    if (d.n !== st.ply || !SIM.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else render(false);
}

function localMove(m) {
  if (!SIM.isLegal(st, m)) return;
  if (online()) sess.send('move', { m, n: st.ply });
  play(m);
}

// ---------- input ----------
// Tap a dot, then another dot. A tap right on a free guide line (away from crossings) draws it at once.
// "SIM!" mode: tap the three corners of the triangle you're calling.
function tapDot(v) {
  if (calling) {
    callSel = callSel.includes(v) ? callSel.filter((x) => x !== v) : [...callSel, v];
    if (callSel.length === 3) return localMove({ call: callSel });
    return render(false);
  }
  if (sel < 0) { if (hasFree(v)) sel = v; }
  else if (v === sel) sel = -1;
  else if (st.col[SIM.edge(sel, v)] < 0) return localMove({ e: SIM.edge(sel, v) });
  else sel = hasFree(v) ? v : -1;
  render(false);
}

svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  if (SIM.mustCall(st)) calling = true;
  const h = hitAt(evt);
  if (h?.dot !== undefined) return tapDot(h.dot);
  if (h?.edge !== undefined) return localMove({ e: h.edge });
  if (sel >= 0) { sel = -1; render(false); }
});
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const h = canMove() ? hitAt(evt) : null;
  let e = -1;
  if (h?.edge !== undefined) e = h.edge;
  else if (h?.dot !== undefined && sel >= 0 && h.dot !== sel && !calling) {
    const i = SIM.edge(sel, h.dot);
    if (st.col[i] < 0) e = i;
  }
  const k = `${e}:${h?.dot ?? ''}`;
  if (k === hoverKey) return;
  hoverKey = k;
  svg.style.cursor = h ? 'pointer' : '';
  const pv = svg.querySelector('#preview');
  if (e < 0) { pv.setAttribute('d', ''); return; }
  const [[a, b], [c, d]] = ends(e);
  pv.setAttribute('d', `M${a.toFixed(1)} ${b.toFixed(1)} L${c.toFixed(1)} ${d.toFixed(1)}`);
  pv.setAttribute('stroke', COLORS[st.turn].main);
});
svg.addEventListener('pointerleave', () => { hoverKey = ''; svg.querySelector('#preview')?.setAttribute('d', ''); });

$('#call').addEventListener('click', () => {
  if (!canMove()) return;
  calling = SIM.mustCall(st) || !calling;
  callSel = []; sel = -1;
  render(false);
});
$('#layout').addEventListener('change', (e) => { cfg.layout = e.target.value; saveCfg(); render(false); });
$('#rule').addEventListener('change', (e) => { cfg.rule = e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); wins = [0, 0]; newGame(); });
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
$('#mode').value = cfg.mode;
$('#layout').value = cfg.layout;
$('#rule').value = cfg.rule;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; wins = [0, 0]; $('#rule').value = cfg.rule; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
