import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { HTL } from './engine.js';
import './strings.js';

const SLUG = 'hold-that-line';
const M = 26; // margin around the dots
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ variant: 'sackson4', mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!HTL.VARIANTS[cfg.variant]) cfg.variant = 'sackson4';
if (!['pvp', 'easy', 'normal', 'hard'].includes(cfg.mode)) cfg.mode = 'pvp';
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, over, aiTimer, nextFirst = 0, gameId = 0;
let sel = null;      // selected end (or, before the first segment, the first dot)
let ask = null;      // target dot reachable from both ends: waiting for the player to pick the end
let hover = null;    // dot under the mouse / finger
let down = null;     // dot where the current press started
let claimed = -1;    // player the characters already "know" is winning
let sess = null;     // online session (shared/net.js), null when playing locally
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
  if (isAI(p)) return t('htl.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('htl.p' + p);
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
  if (!worker) return Promise.resolve(HTL.aiMove(state, level));
  return new Promise((res) => { const id = ++reqId; pending.set(id, res); worker.postMessage({ id, st: state, level }); });
}

// ---------- geometry ----------
const spacing = () => (st.N <= 4 ? 84 : st.N === 5 ? 68 : 56);
function dotXY(i) {
  const [r, c] = HTL.rc(st, i), S = spacing();
  return [M + c * S, M + r * S];
}
function boardPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function dotAt(evt) {
  const { x, y } = boardPoint(evt), S = spacing();
  const c = Math.round((x - M) / S), r = Math.round((y - M) / S);
  if (r < 0 || c < 0 || r >= st.N || c >= st.N) return null;
  const i = r * st.N + c, [dx, dy] = dotXY(i);
  return Math.hypot(x - dx, y - dy) <= S * 0.48 ? i : null;
}

// ---------- legal moves seen from the UI ----------
const legal = (a, b) => a !== null && b !== null && HTL.isLegal(st, { from: a, to: b });
function targetsFrom(a) {
  const out = [];
  for (let b = 0; b < st.N * st.N; b++) if (legal(a, b)) out.push(b);
  return out;
}
const fromEnds = (b) => HTL.growEnds(st).filter((e) => legal(e, b));
// Dots worth marking as "you can go here".
function targets() {
  if (!canMove()) return [];
  if (ask !== null) return [ask];
  if (!st.ends) return sel === null ? [] : targetsFrom(sel);
  if (sel !== null) return targetsFrom(sel);
  const set = new Set();
  for (const e of HTL.growEnds(st)) targetsFrom(e).forEach((b) => set.add(b));
  return [...set];
}
// Which segment would a press on `b` draw right now (for the preview)?
function intended(b) {
  if (b === null || !canMove()) return null;
  if (down !== null && down !== b && legal(down, b) && (!st.ends || HTL.growEnds(st).includes(down))) return { from: down, to: b };
  if (sel !== null) return legal(sel, b) ? { from: sel, to: b } : null;
  if (!st.ends) return null;
  const f = fromEnds(b);
  return f.length === 1 ? { from: f[0], to: b } : null;
}

// ---------- drawing ----------
const shapeFor = (k, make) => (shapes[k] ??= make());

function render(animateLast) {
  const S = spacing(), W = M * 2 + (st.N - 1) * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';
  st.segs.forEach((g, i) => {
    const d = shapeFor('s' + i, () => { const [a, b] = dotXY(g.from), [c, e] = dotXY(g.to); return line(a, b, c, e, 2.4); });
    const fresh = animateLast && i === st.segs.length - 1;
    out += `<path class="seg${fresh ? ' fresh' : ''}" d="${d}" stroke="${COLORS[g.p].main}" pathLength="1"/>`;
  });
  out += '<g id="preview"></g>';
  for (let i = 0; i < st.N * st.N; i++) {
    const [x, y] = dotXY(i), on = st.vis[i];
    out += `<path class="dot${on ? ' on' : ''}" d="${shapeFor('d' + i, () => circle(x, y, 5.2, 5.2, 0.12))}"/>`;
  }
  // Ends of the line: the ones that may grow this turn get a ring in the mover's colour.
  const col = COLORS[st.turn].main, grow = canMove() ? HTL.growEnds(st) : [];
  for (const e of st.ends || []) {
    const [x, y] = dotXY(e);
    const g = grow.includes(e), cls = e === sel || (ask !== null && g) ? 'sel' : g ? 'grow' : '';
    out += `<path class="end ${cls}" d="${shapeFor('e' + e, () => circle(x, y, 13, 13, 0.06))}" stroke="${g ? col : 'var(--dot)'}"/>`;
  }
  if (!st.ends && sel !== null) {
    const [x, y] = dotXY(sel);
    out += `<path class="end sel" d="${shapeFor('e' + sel, () => circle(x, y, 13, 13, 0.06))}" stroke="${col}"/>`;
  }
  for (const b of targets()) {
    const [x, y] = dotXY(b);
    out += `<circle class="target" cx="${x}" cy="${y}" r="10" stroke="${col}" fill="${COLORS[st.turn].fill}"/>`;
  }
  svg.innerHTML = out;
  drawPreview();
  renderPlayers();
}

function drawPreview() {
  const g = svg.querySelector('#preview');
  if (!g) return;
  const m = intended(hover);
  svg.style.cursor = hover !== null && canMove() ? 'pointer' : '';
  // Waiting for "which end?": show both candidate segments.
  const list = m ? [m] : ask !== null && canMove() ? fromEnds(ask).map((e) => ({ from: e, to: ask })) : [];
  g.innerHTML = list.map((x) => {
    const [a, b] = dotXY(x.from), [c, d] = dotXY(x.to);
    return `<path class="preview" d="M${a} ${b} L${c} ${d}" stroke="${COLORS[st.turn].main}"/>`;
  }).join('');
}

function statusText() {
  if (over) return '';
  if (online() && !sess.connected) return t('htl.online.wait');
  if (isAI(st.turn)) return t('htl.thinking', { name: name(st.turn) });
  if (isRemote(st.turn)) return t('htl.turn.them', { name: name(st.turn) });
  const nm = online() ? t('htl.turn.you') : name(st.turn);
  if (ask !== null) return t('htl.turn.pick');
  if (!st.ends) return t(sel === null ? 'htl.turn.first' : 'htl.turn.from', { name: nm });
  if (sel !== null) return t('htl.turn.from', { name: nm });
  return online() ? nm : t('htl.turn', { name: nm });
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
    el.querySelector('.score').textContent = plural(st.segs.filter((g) => g.p === p).length, 'htl.segs');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const status = $('#status');
  status.textContent = statusText();
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#variant').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('htl.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('htl.online.note') : '';
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
function resetInput() { sel = null; ask = null; down = null; }

function newGame(first = nextFirst, variant = cfg.variant) {
  clearTimeout(aiTimer);
  gameId++;
  st = HTL.create({ variant, first });
  nextFirst = 1 - first;
  history = []; shapes = {}; over = false; claimed = -1;
  resetInput();
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  if (over || !HTL.isLegal(st, m)) return false;
  const prev = HTL.clone(st);
  history.push(prev);
  const who = st.turn, other = 1 - who;
  const before = HTL.evaluate(prev, 12000);      // true: the mover was winning
  HTL.apply(st, m);
  resetInput();
  if (HTL.isOver(st)) { finish(true); return true; }
  const after = HTL.evaluate(st, 12000);         // true: the opponent is now winning
  const [r1, c1] = HTL.rc(st, m.from), [r2, c2] = HTL.rc(st, m.to);
  react(who, other, before, after, Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)));
  render(true);
  maybeAI();
  return true;
}

// Characters "feel" the position: a thrown-away win, a sprung trap, a cramped board, a big swing.
function react(who, other, before, after, len) {
  const left = HTL.moves(st).length;
  setMood(who, 'neutral');
  if (moods[other].mood !== 'smug') setMood(other, 'neutral');
  if (before === true && after === true) {
    claimed = other;
    setMood(other, 'smug'); setMood(who, 'worried');
    if (Math.random() < 0.55) say(other, 'htl.say.thanks'); else say(who, 'htl.say.oops');
  } else if (after === false && claimed !== who) {
    claimed = who;
    setMood(who, 'smug'); setMood(other, 'worried');
    if (Math.random() < 0.7) say(who, 'htl.say.trap');
  } else if (left <= 3) {
    setMood(other, 'worried');
    if (Math.random() < 0.5) say(other, 'htl.say.tight');
  } else if (len >= 3) {
    setMood(who, 'happy', 'wave');
    if (Math.random() < 0.6) say(who, 'htl.say.long');
  }
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  const id = gameId, n = st.segs.length, t0 = Date.now();
  const snapshot = HTL.clone(st);
  aiTimer = setTimeout(() => {
    think(snapshot, cfg.mode).then((m) => {
      if (id !== gameId || st.segs.length !== n || over) return; // stale (undo / new game)
      const wait = Math.max(0, 600 - (Date.now() - t0));
      aiTimer = setTimeout(() => {
        if (id !== gameId || st.segs.length !== n) return;
        if (!m || !HTL.isLegal(st, m)) m = HTL.aiMove(st, 'easy');
        play(m);
      }, wait);
    });
  }, 120);
}

function finish(animate) {
  over = true;
  resetInput();
  const w = HTL.winner(st);
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  if (animate) { say(w, 'htl.say.win'); setTimeout(() => over && say(1 - w, 'htl.say.lose'), 900); }
  render(animate);
  $('#result-text').textContent = t('htl.win', { name: name(w) });
  $('#result-text').style.color = COLORS[w].main;
  $('#result-why').textContent = t(HTL.VARIANTS[st.variant].misere ? 'htl.why.misere' : 'htl.why.normal');
  setTimeout(() => { if (over) $('#result').hidden = false; }, animate ? 1000 : 0);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  gameId++;
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; claimed = -1;
  resetInput();
  shapes = Object.fromEntries(Object.entries(shapes).filter(([k]) => k[0] !== 's' || +k.slice(1) < st.segs.length));
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart or change the rules; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Host is authoritative: on (re)connect and on every new game it sends the whole state;
// moves carry the segment count so either side can spot a desync and ask for a resync.
function sendState() {
  sess.send('state', { st, names: cfg.names, nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  gameId++;
  s.on('status', () => render(false));
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = false; history = []; shapes = {}; nextFirst = d.nextFirst; claimed = -1;
    resetInput();
    remoteNames[0] = d.names[0];
    $('#variant').value = st.variant; // show the host's rules, keep our own saved choice for later
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    HTL.isOver(st) ? finish(false) : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.segs.length || isLocal(st.turn) || !HTL.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else render(false);
}

function localMove(m) {
  if (!canMove() || !HTL.isLegal(st, m)) return;
  const n = st.segs.length;
  if (play(m) && online()) sess.send('move', { m: { from: m.from, to: m.to }, n });
}

// ---------- input ----------
// Tap an end, then a target dot (one tap is enough when only one end reaches it), or drag end → dot.
function tapDot(d) {
  if (!st.ends) {
    if (sel === null) sel = targetsFrom(d).length ? d : null;
    else if (sel === d) sel = null;
    else if (legal(sel, d)) return localMove({ from: sel, to: d });
    else sel = targetsFrom(d).length ? d : null;
    return render(false);
  }
  const ends = HTL.growEnds(st);
  if (ask !== null && ends.includes(d)) { const m = { from: d, to: ask }; ask = null; return localMove(m); }
  if (ends.includes(d)) {
    ask = null;
    sel = sel === d || ends.length === 1 ? null : d;
    return render(false);
  }
  if (sel !== null) {
    if (legal(sel, d)) return localMove({ from: sel, to: d });
    sel = null;
    return render(false);
  }
  const f = fromEnds(d);
  if (f.length === 1) return localMove({ from: f[0], to: d });
  ask = f.length > 1 ? d : null;
  render(false);
}

svg.addEventListener('pointerdown', (evt) => {
  if (!canMove()) return;
  if (evt.pointerType !== 'mouse') svg.setPointerCapture?.(evt.pointerId);
  down = dotAt(evt);
  hover = down;
  drawPreview();
});
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse' && down === null) return;
  const d = dotAt(evt);
  if (d === hover) return;
  hover = d;
  drawPreview();
});
svg.addEventListener('pointerup', (evt) => {
  const start = down;
  down = null;
  if (!canMove()) return;
  const d = dotAt(evt);
  if (evt.pointerType !== 'mouse') hover = null;
  if (d === null) { if (start === null) { sel = null; ask = null; } return render(false); }
  const startOk = start !== null && (!st.ends || HTL.growEnds(st).includes(start));
  if (start !== null && start !== d && startOk && legal(start, d)) return localMove({ from: start, to: d });
  tapDot(d);
});
svg.addEventListener('pointercancel', () => { down = null; hover = null; drawPreview(); });
svg.addEventListener('pointerleave', (evt) => {
  if (evt.pointerType === 'mouse') { hover = null; drawPreview(); }
});

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
$('#variant').value = cfg.variant;
$('#mode').value = cfg.mode;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; $('#variant').value = cfg.variant; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
