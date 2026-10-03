import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, curve, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { TP } from './engine.js';
import './strings.js';

const SLUG = 'turning-points';
const S = 60, M = 38; // cell size, margin around the grid (room for shore bands and arrow pads)
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 5, mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (![4, 5, 6].includes(+cfg.size)) cfg.size = 5;
if (!['pvp', 'easy', 'normal', 'hard'].includes(cfg.mode)) cfg.mode = 'pvp';
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, over, aiTimer, nextFirst = 0;
let sel = -1, hover = null;          // touch: selected empty cell; mouse: hovered {i, d}
let anim = null;                     // running chain animation
const shapes = {};                   // cached wobble per element
const angles = {};                   // displayed (cumulative) rotation per cell, so turns always go clockwise
let sess = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && !anim && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('tp.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('tp.p' + p);
}

// ---------- geometry ----------
const N = () => st.N;
const cellXY = (i) => [M + (i % N()) * S + S / 2, M + Math.floor(i / N()) * S + S / 2];
const PAD = 0.8 * S, PAD_R = 0.34 * S;
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function cellAt(p) {
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  return r < 0 || c < 0 || r >= N() || c >= N() ? -1 : r * N() + c;
}
function quadrant(p, i) {
  const [cx, cy] = cellXY(i), dx = p.x - cx, dy = p.y - cy;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy < 0 ? 0 : 2;
}
function padAt(p) {
  if (sel < 0) return -1;
  const [cx, cy] = cellXY(sel);
  for (let d = 0; d < 4; d++) if (Math.hypot(p.x - cx - TP.DC[d] * PAD, p.y - cy - TP.DR[d] * PAD) < PAD_R * 1.15) return d;
  return -1;
}
const shapeFor = (k, make) => (shapes[k] ??= make());
const jit = (a) => (Math.random() * 2 - 1) * a;

// A fish drawn nose-up around (0,0); rotated per piece.
function fishPaths() {
  const j = (x, y, a = 0.9) => [x + jit(a), y + jit(a)];
  const body = curve([j(0, -24, 0.4), j(10, -16), j(12, -3), j(7, 8), j(0, 12, 0.4), j(-7, 8), j(-12, -3), j(-10, -16), j(0, -24, 0.4)]);
  const tail = `M0 9 Q${(8 + jit(1)).toFixed(1)} 15 ${(12 + jit(1)).toFixed(1)} ${(24 + jit(1)).toFixed(1)} Q0 ${(19 + jit(1)).toFixed(1)} ${(-12 + jit(1)).toFixed(1)} ${(24 + jit(1)).toFixed(1)} Q-8 15 0 9 Z`;
  const fin = line(-5 + jit(1), 2, 5 + jit(1), 2, 0.8);
  return { body, tail, fin };
}
const dirClass = (d) => (d === 3 ? 'blue' : d === 1 ? 'red' : 'none');

// ---------- rendering ----------
function render() {
  const n = N(), W = M * 2 + n * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';

  // shores: left = blue, right = red
  const y0 = M - 6, y1 = M + n * S + 6;
  out += `<path class="shore" d="${shapeFor('shore0', () => line(M - 14, y0, M - 14, y1, 3))}" stroke="${COLORS[0].main}"/>`;
  out += `<path class="shore" d="${shapeFor('shore1', () => line(W - M + 14, y0, W - M + 14, y1, 3))}" stroke="${COLORS[1].main}"/>`;
  out += `<text class="shore-lbl" x="${M - 28}" y="${W / 2}" fill="${COLORS[0].dark}" transform="rotate(-90 ${M - 28} ${W / 2})">${t('tp.side0')}</text>`;
  out += `<text class="shore-lbl" x="${W - M + 28}" y="${W / 2}" fill="${COLORS[1].dark}" transform="rotate(90 ${W - M + 28} ${W / 2})">${t('tp.side1')}</text>`;

  // grid
  for (let k = 0; k <= n; k++) {
    const a = M + k * S;
    out += `<path class="grid" d="${shapeFor('gh' + k, () => line(M - 3, a, M + n * S + 3, a, 1.6))}"/>`;
    out += `<path class="grid" d="${shapeFor('gv' + k, () => line(a, M - 3, a, M + n * S + 3, 1.6))}"/>`;
  }

  // last move marker
  if (st.last && !over) {
    const [x, y] = cellXY(st.last.i);
    out += `<path class="last" d="${shapeFor('last' + st.ply, () => circle(x, y, S * 0.43, S * 0.43, 0.06))}" stroke="${COLORS[1 - st.turn].main}"/>`;
  }

  // pieces
  const disp = anim ? anim.disp : st.b;
  out += '<g id="pieces">';
  for (let i = 0; i < disp.length; i++) {
    const d = disp[i];
    if (d < 0) { delete angles[i]; continue; }
    if (angles[i] === undefined || (((angles[i] / 90) % 4) + 4) % 4 !== d) angles[i] = d * 90;
    out += pieceSVG(i, d, anim && anim.fresh === i);
  }
  out += '</g><g id="overlay"></g>';
  svg.innerHTML = out;
  renderOverlay();
  renderPlayers();
}

function pieceSVG(i, d, fresh) {
  const [x, y] = cellXY(i);
  const f = shapeFor('f' + i, fishPaths);
  return `<g transform="translate(${x} ${y})"><g class="pc ${dirClass(d)}${fresh ? ' fresh' : ''}" data-i="${i}" style="transform:rotate(${angles[i]}deg)">` +
    `<path class="tail" d="${f.tail}"/><path class="body" d="${f.body}"/><path class="fin" d="${f.fin}"/>` +
    `<circle class="eye" cx="-4.5" cy="-13" r="2.3"/><circle class="eye" cx="4.5" cy="-13" r="2.3"/></g></g>`;
}

// Hover ghost + chain preview (mouse), or the four arrow pads around a selected cell (touch).
function renderOverlay() {
  const ov = svg.querySelector('#overlay');
  if (!ov) return;
  let out = '';
  const col = COLORS[st.turn];
  if (canMove() && hover) {
    const b = st.b.slice(), turned = TP.place(b, N(), hover.i, hover.d);
    for (const j of new Set(turned)) {
      const [x, y] = cellXY(j);
      out += `<circle class="will-turn" cx="${x}" cy="${y}" r="${S * 0.4}" stroke="${col.main}"/>`;
    }
    const [x, y] = cellXY(hover.i);
    out += `<g class="ghost" transform="translate(${x} ${y}) rotate(${hover.d * 90})"><path d="M0 -24 L9 -10 L4 -10 L4 14 L-4 14 L-4 -10 L-9 -10 Z" fill="${col.main}"/></g>`;
  }
  if (canMove() && sel >= 0) {
    const [cx, cy] = cellXY(sel);
    out += `<path class="sel" d="${shapeFor('sel' + sel, () => circle(cx, cy, S * 0.42, S * 0.42, 0.05))}" stroke="${col.main}"/>`;
    for (let d = 0; d < 4; d++) {
      const x = cx + TP.DC[d] * PAD, y = cy + TP.DR[d] * PAD;
      out += `<g class="pad" data-d="${d}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">` +
        `<circle r="${PAD_R}" fill="#fff" stroke="${col.main}"/>` +
        `<path d="M0 -11 L9 1 L3.5 1 L3.5 11 L-3.5 11 L-3.5 1 L-9 1 Z" fill="${col.main}" transform="rotate(${d * 90})"/></g>`;
    }
  }
  ov.innerHTML = out;
  svg.style.cursor = canMove() && hover ? 'pointer' : '';
}

function renderPlayers() {
  const sc = TP.score({ b: anim ? anim.disp : st.b });
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    el.querySelector('.score').textContent = plural(sc[p], 'tp.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('tp.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t(sel >= 0 ? 'tp.turn.you.pick' : 'tp.turn.you') : t('tp.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('tp.thinking', { name: name(st.turn) });
  else status.textContent = t(sel >= 0 ? 'tp.turn.pick' : 'tp.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('tp.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('tp.online.note') : '';
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
// Delayed replies (e.g. the loser's line) are dropped when a new game starts or a move is undone.
let sayLater = [];
const later = (fn, ms) => sayLater.push(setTimeout(fn, ms));
function hush() {
  sayLater.forEach(clearTimeout); sayLater = [];
  for (const p of [0, 1]) { clearTimeout(bubbleTimers[p]); $(`.player.p${p} .bubble`).classList.remove('show'); }
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function stopAnim() {
  if (!anim) return;
  clearTimeout(anim.timer);
  anim = null;
}

function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  stopAnim();
  hush();
  st = TP.create(+cfg.size, first);
  nextFirst = 1 - first;
  history = []; over = false; sel = -1; hover = null;
  for (const k in shapes) delete shapes[k];
  for (const k in angles) delete angles[k];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

function play(m) {
  if (anim) finishAnim();
  const prev = TP.clone(st);
  history.push(prev);
  const who = st.turn;
  const before = TP.score(prev);
  const chain = TP.apply(st, m);
  sel = -1; hover = null;

  // Animate: place the fish, then turn the chain one fish at a time.
  const disp = prev.b.slice();
  disp[m.i] = m.d;
  angles[m.i] = m.d * 90;
  anim = { disp, chain, k: 0, fresh: m.i, who, before, step: Math.max(70, Math.min(260, 2600 / Math.max(1, chain.length))) };
  render();
  anim.timer = setTimeout(stepAnim, chain.length ? 320 : 120);
}

function stepAnim() {
  const a = anim;
  if (!a) return;
  if (a.k >= a.chain.length) return endAnim();
  const j = a.chain[a.k++];
  a.disp[j] = (a.disp[j] + 1) & 3;
  angles[j] += 90;
  const g = svg.querySelector(`.pc[data-i="${j}"]`);
  if (g) {
    g.style.transitionDuration = `${Math.round(a.step * 0.9)}ms`;
    g.style.transform = `rotate(${angles[j]}deg)`;
    g.setAttribute('class', `pc ${dirClass(a.disp[j])}`);
  }
  const sc = TP.score({ b: a.disp });
  for (const p of [0, 1]) $(`.player.p${p} .score`).textContent = plural(sc[p], 'tp.pts');
  a.timer = setTimeout(stepAnim, a.step);
}

// Jump to the end of the running animation (e.g. a remote move arrives while we're still spinning).
function finishAnim() {
  const a = anim;
  if (!a) return;
  clearTimeout(a.timer);
  while (a.k < a.chain.length) { const j = a.chain[a.k++]; a.disp[j] = (a.disp[j] + 1) & 3; angles[j] += 90; }
  endAnim();
}

function endAnim() {
  const a = anim;
  anim = null;
  react(a.who, a.before, TP.score(st), a.chain.length);
  if (TP.isOver(st)) return finish();
  render();
  maybeAI();
}

function react(who, before, after, len) {
  const other = 1 - who;
  const mine = after[who] - before[who], theirs = after[other] - before[other];
  if (mine < 0 && mine - theirs < 0) {
    setMood(who, 'worried'); setMood(other, 'smug');
    say(who, 'tp.say.oops');
  } else if (theirs < 0 || mine - theirs >= 2) {
    setMood(who, 'happy', len >= 4 ? 'up' : 'wave');
    setMood(other, theirs <= -2 ? 'worried' : 'sad');
    if (len >= 4) say(who, 'tp.say.big');
    else if (Math.random() < 0.5) say(who, 'tp.say.gain');
    if (theirs < 0) later(() => say(other, 'tp.say.ouch'), len >= 4 ? 700 : 350);
  } else if (len >= 5) {
    setMood(who, 'happy', 'up'); setMood(other, 'worried');
    say(who, 'tp.say.big');
  } else {
    setMood(who, mine > 0 ? 'happy' : 'neutral');
    if (moods[other].mood !== 'smug' || Math.random() < 0.5) setMood(other, 'neutral');
  }
}

function maybeAI() {
  if (over || anim || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (over || anim || !isAI(st.turn)) return;
    play(TP.aiMove(st, cfg.mode));
  }, 450);
}

function finish() {
  over = true; sel = -1; hover = null;
  const w = TP.winner(st);
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); say(0, 'tp.say.tie'); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'tp.say.win'); later(() => say(1 - w, 'tp.say.lose'), 900); }
  render();
  fillResult();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1000);
}

function fillResult() {
  const [a, b] = TP.score(st), w = TP.winner(st);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('tp.tie') : t('tp.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-score').innerHTML = t('tp.final', { a: `<span class="blue">${a}</span>`, b: `<span class="red">${b}</span>` });
  $('#result-next').textContent = t('tp.next', { name: name(nextFirst) });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  stopAnim();
  hush();
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; sel = -1; hover = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

// Online, only the room creator may restart (and resize); the guest follows.
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
  sess.send('state', { st, over, names: cfg.names, nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    stopAnim();
    hush();
    st = d.st; over = d.over; history = []; sel = -1; hover = null; nextFirst = d.nextFirst;
    cfg.size = st.N; $('#size').value = st.N;
    for (const k in angles) delete angles[k];
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish() : render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (d.n !== st.ply || !TP.isLegal(st, d.m) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else render();
}

function localMove(m) {
  if (!canMove() || !TP.isLegal(st, m)) return;
  if (online()) sess.send('move', { m, n: st.ply });
  play(m);
}

// ---------- input ----------
// Mouse: hover shows which way the fish will face (by the side of the cell) and which fish will turn;
// click places. Touch: tap an empty cell, then one of the four arrows around it.
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  let h = null;
  if (canMove()) {
    const p = svgPoint(evt), i = cellAt(p);
    if (padAt(p) < 0 && i >= 0 && st.b[i] < 0) h = { i, d: quadrant(p, i) };
  }
  if (h?.i === hover?.i && h?.d === hover?.d) return;
  hover = h;
  renderOverlay();
});
// Not every browser reports pointerType on click, so remember it from pointerdown.
let ptrType = 'mouse';
svg.addEventListener('pointerdown', (evt) => { ptrType = evt.pointerType || 'mouse'; });
svg.addEventListener('pointerleave', () => { if (hover) { hover = null; renderOverlay(); } });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const p = svgPoint(evt);
  const d = padAt(p);
  if (d >= 0) return localMove({ i: sel, d });
  const i = cellAt(p);
  if (ptrType === 'mouse' && i >= 0 && st.b[i] < 0) return localMove({ i, d: quadrant(p, i) });
  sel = i >= 0 && st.b[i] < 0 && i !== sel ? i : -1;
  hover = null;
  renderOverlay();
  renderPlayers();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sel >= 0) { sel = -1; renderOverlay(); renderPlayers(); }
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
    if (online()) sess.send('name', { seat: p, name: inp.value });
    renderPlayers();
    if (over) fillResult();
  }));
document.addEventListener('mg:lang', () => { render(); if (over) fillResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
