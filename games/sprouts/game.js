import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { SPR } from './engine.js';
import './strings.js';

const SLUG = 'sprouts';
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ spots: 3, mode: 'pvp', first: '0', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-sprouts') || '{}'));
const saveCfg = () => localStorage.setItem('mg-sprouts', JSON.stringify(cfg));

let st, history, over, stuckLoser = -1, nextFirst = 0, drawing = null, token = 0;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];
let lastValue = null;               // Sprague–Grundy value of the position for the player to move (null = unknown)

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('spr.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('spr.p' + p);
}

// ---------- the computer thinks in a worker ----------
let worker = null;
const pending = new Map();
let reqId = 0;
function ask(type, payload) {
  if (!worker) {
    try {
      worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const r = pending.get(e.data.id); pending.delete(e.data.id); r?.(e.data.res); };
    } catch { worker = false; }
  }
  if (!worker) { // no workers: think on the main thread
    return new Promise((res) => setTimeout(() => res(type === 'ai' ? SPR.aiMove(payload.st, payload.level) : SPR.canDraw(payload.st)), 30));
  }
  return new Promise((res) => { const id = ++reqId; pending.set(id, res); worker.postMessage({ id, type, ...payload }); });
}

// ---------- geometry ----------
function toBoard(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [p.x, p.y];
}
const pathD = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
let frame = null;
function paperFrame() {
  if (frame) return frame;
  const m = 3, W = SPR.W, H = SPR.H;
  return (frame = [line(m, m, W - m, m, 2), line(W - m, m, W - m, H - m, 2), line(W - m, H - m, m, H - m, 2), line(m, H - m, m, m, 2)].join(' '));
}
const spotShape = {};
const spotPath = (i, r) => (spotShape[i + ':' + r] ??= circle(st.spots[i].x, st.spots[i].y, r, r, 0.1));

// ---------- rendering ----------
function render(fresh = false) {
  svg.setAttribute('viewBox', `0 0 ${SPR.W} ${SPR.H}`);
  let out = `<path class="frame" d="${paperFrame()}"/>`;
  const nE = st.edges.length;
  st.edges.forEach((e, i) => {
    const cls = fresh && st.last != null && i >= nE - 2 ? (i === nE - 2 ? ' fresh' : ' fresh fresh2') : '';
    out += `<path class="edge${cls}" d="${pathD(e.pts)}" stroke="${COLORS[e.p].main}" pathLength="1"/>`;
  });
  if (!st.moves && !over && isLocal(st.turn)) out += `<text class="hint" x="${SPR.W / 2}" y="${SPR.H - 22}">${t('spr.hint')}</text>`;
  out += `<path id="ink" class="ink" d=""/>`;
  st.spots.forEach((p, i) => {
    const dead = p.deg >= 3, isNew = i === st.last;
    if (isNew && !over) out += `<path class="halo${fresh ? ' fresh' : ''}" d="${spotPath(i, 11)}" stroke="${COLORS[1 - st.turn].main}"/>`;
    out += `<path class="spot${dead ? ' dead' : ''}${isNew && fresh ? ' fresh' : ''}" data-i="${i}" d="${spotPath(i, dead ? 3.6 : 5.2)}"/>`;
  });
  svg.innerHTML = out;
  renderPlayers();
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29 });
    el.querySelector('.score').textContent = plural(st.count[p], 'spr.moves');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('spr.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('spr.turn.you') : t('spr.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('spr.thinking', { name: name(st.turn) });
  else status.textContent = t('spr.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || isAI(st.turn) && !over;
  $('#mode').disabled = online();
  $('#spots').disabled = !canRestart();
  $('#first').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('spr.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('spr.online.note') : '';
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
const hush = () => document.querySelectorAll('.player .bubble').forEach((b) => b.classList.remove('show'));
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

let toastTimer;
function toast(key) {
  const el = $('#toast');
  el.textContent = t(key);
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

// ---------- flow ----------
function newGame(first) {
  token++;
  st = SPR.create(+cfg.spots);
  if (first === undefined) {
    first = cfg.first === 'alt' ? nextFirst : +cfg.first;
    nextFirst = 1 - first;
  }
  st.turn = first;
  history = []; over = false; stuckLoser = -1; drawing = null;
  hush();
  for (const k in spotShape) delete spotShape[k];
  lastValue = SPR.value(st, 80);
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  afterTurn();
}

// Apply a move (already validated) for the player to move.
function play(m) {
  history.push(SPR.clone(st));
  const who = st.turn, other = 1 - who, before = lastValue;
  SPR.apply(st, m);
  token++;
  if (st.over) return finish();
  const after = SPR.value(st, 60);
  lastValue = after;
  // the mover is winning iff the position left behind has value 0
  if (after === 0) {
    setMood(who, isAI(who) ? 'smug' : 'happy', 'wave'); setMood(other, 'worried');
    if (isAI(who) || Math.random() < 0.3) say(who, 'spr.say.good');
  } else if (after !== null && before !== null && before !== 0) {
    setMood(who, 'worried'); setMood(other, isAI(other) ? 'smug' : 'neutral');
    if (Math.random() < 0.45) say(who, 'spr.say.blunder');
  } else {
    setMood(who, 'neutral'); setMood(other, after === null ? 'neutral' : 'happy');
    if (m.a === m.b && Math.random() < 0.5) say(who, 'spr.say.loop');
    else if (after === null && SPR.livePairs(st).length <= 2 && Math.random() < 0.4) say(other, 'spr.say.worry');
  }
  render(true);
  afterTurn();
}

// Whose turn now: let the computer move, or make sure the human still has room to draw.
function afterTurn() {
  if (over) return;
  const my = token;
  if (isAI(st.turn)) {
    const started = Date.now();
    ask('ai', { st, level: cfg.mode }).then((m) => {
      if (my !== token || over) return;
      setTimeout(() => {
        if (my !== token || over) return;
        if (m) play(m); else resign(st.turn);
      }, Math.max(0, 650 - (Date.now() - started)));
    });
  } else if (isLocal(st.turn) && (!online() || sess.connected) && st.moves > 0 && SPR.livePairs(st).length <= 3) {
    ask('can', { st }).then((ok) => {
      if (my !== token || over || ok) return;
      resign(st.turn);
      if (online()) sess.send('stuck', { n: st.moves });
    });
  }
}

// Player p can't draw any of the (theoretically) remaining moves: they lose.
function resign(p) {
  stuckLoser = p;
  say(p, 'spr.say.stuck');
  finish();
}

function finish() {
  over = true;
  const w = stuckLoser >= 0 ? 1 - stuckLoser : st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  if (stuckLoser < 0) say(w, 'spr.say.win');
  const my = token;
  setTimeout(() => { if (my === token) say(1 - w, 'spr.say.lose'); }, stuckLoser < 0 ? 900 : 2000);
  render(true);
  resultText();
  setTimeout(() => { if (over && my === token) $('#result').hidden = false; }, 1100);
}

function resultText() {
  const w = stuckLoser >= 0 ? 1 - stuckLoser : st.winner;
  const txt = $('#result-text');
  txt.textContent = t('spr.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-sub').textContent = stuckLoser >= 0 ? t('spr.win.stuck', { name: name(stuckLoser) }) : t('spr.win.sub', { n: st.moves });
}

function undo() {
  if (!history.length || online()) return;
  token++;
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; stuckLoser = -1;
  hush();
  lastValue = SPR.value(st, 80);
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  afterTurn();
}

// Online, only the room creator may restart (and change settings); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
function sendState() { sess.send('state', { st, over, stuckLoser, names: cfg.names }); }
function onSession(s) {
  sess = s;
  token++;
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
    afterTurn();
  });
  s.on('state', (d) => {
    if (s.host) return;
    token++;
    st = d.st; over = false; stuckLoser = -1; history = [];
    for (const k in spotShape) delete spotShape[k];
    remoteNames[0] = d.names[0];
    cfg.spots = st.n; $('#spots').value = st.n;
    lastValue = SPR.value(st, 80);
    $('#result').hidden = true;
    if (d.over) { stuckLoser = d.stuckLoser; finish(); } else { setMood(0, 'neutral'); setMood(1, 'neutral'); render(false); afterTurn(); }
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; renderPlayers(); });
  s.on('move', (d) => {
    const m = d && d.n === st.moves && !over && isRemote(st.turn) ? SPR.verify(st, d.m) : null;
    if (!m) return s.host ? sendState() : s.send('resync');
    play(m);
  });
  s.on('stuck', (d) => { if (d.n === st.moves && !over && isRemote(st.turn)) resign(st.turn); else if (s.host) sendState(); else s.send('resync'); });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(); else render(false);
}

function localMove(m) {
  if (online()) sess.send('move', { m, n: st.moves });
  play(m);
}

// ---------- drawing input ----------
function nearSpot(p, r) {
  let bi = -1, bd = r;
  st.spots.forEach((q, i) => { const d = Math.hypot(q.x - p[0], q.y - p[1]); if (d < bd) { bd = d; bi = i; } });
  return bi;
}
svg.addEventListener('pointerdown', (evt) => {
  if (!canMove() || drawing) return;
  const p = toBoard(evt), snap = evt.pointerType === 'mouse' ? 18 : 28;
  const i = nearSpot(p, snap);
  if (i < 0) return;
  evt.preventDefault();
  if (SPR.lives(st, i) < 1) { toast('spr.err.full'); return; }
  drawing = { id: evt.pointerId, pts: [p], from: i, snap };
  try { svg.setPointerCapture(evt.pointerId); } catch {}
  svg.querySelector(`.spot[data-i="${i}"]`)?.classList.add('picked');
  const ink = svg.querySelector('#ink');
  ink.setAttribute('stroke', COLORS[st.turn].main);
  ink.classList.remove('bad');
});
svg.addEventListener('pointermove', (evt) => {
  if (!drawing || evt.pointerId !== drawing.id) return;
  const evs = evt.getCoalescedEvents ? evt.getCoalescedEvents() : [evt];
  for (const e of evs.length ? evs : [evt]) {
    const p = toBoard(e), q = drawing.pts[drawing.pts.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 1.5) drawing.pts.push(p);
  }
  svg.querySelector('#ink').setAttribute('d', pathD(drawing.pts));
});
function endStroke(evt, cancel) {
  if (!drawing || evt.pointerId !== drawing.id) return;
  const d = drawing;
  drawing = null;
  svg.querySelectorAll('.spot.picked').forEach((x) => x.classList.remove('picked'));
  const ink = svg.querySelector('#ink');
  if (cancel || !canMove()) { ink?.setAttribute('d', ''); return; }
  d.pts.push(toBoard(evt));
  let m = SPR.fromStroke(st, d.pts, d.snap);
  if (m.err && ['cross', 'spot', 'edge'].includes(m.err)) {
    const fixed = SPR.assist(st, m);
    if (fixed) { say(st.turn, 'spr.say.fixed'); m = fixed; }
  }
  if (m.err) {
    if (d.pts.length < 4 && m.err === 'end') { ink.setAttribute('d', ''); return; } // just a tap
    toast('spr.err.' + m.err);
    ink.classList.add('bad');
    setMood(st.turn, 'worried');
    if (Math.random() < 0.5) say(st.turn, 'spr.say.oops');
    renderPlayers();
    setTimeout(() => { if (!drawing) { ink.setAttribute('d', ''); ink.classList.remove('bad'); } }, 650);
    return;
  }
  localMove(m);
}
svg.addEventListener('pointerup', (e) => endStroke(e, false));
svg.addEventListener('pointercancel', (e) => endStroke(e, true));

$('#spots').addEventListener('change', (e) => { cfg.spots = +e.target.value; saveCfg(); restart(); });
$('#first').addEventListener('change', (e) => { cfg.first = e.target.value; nextFirst = cfg.first === 'alt' ? 0 : nextFirst; saveCfg(); restart(); });
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
    renderPlayers();
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) resultText(); });
// read-only peek for automated UI tests
window.__sprouts = { get st() { return st; }, get over() { return over; } };

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#spots').value = cfg.spots;
$('#mode').value = cfg.mode;
$('#first').value = cfg.first;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
