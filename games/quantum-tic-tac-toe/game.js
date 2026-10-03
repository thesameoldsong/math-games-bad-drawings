import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { QTT, LINES } from './engine.js';
import './strings.js';

const SLUG = 'quantum-tic-tac-toe';
const CS = 112, M = 8, W = M * 2 + CS * 3; // cell size, margin, board size
const COLORS = [PALETTE.blue, PALETTE.red];
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', rule: 'choose', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st = null, history = [], shapes = {}, over = false, timer = 0;
let sel = null, hover = null, pick = null, touchy = false; // UI selection state
let tally = [0, 0];                 // match score across games
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
const coinPending = () => st.phase === 'collapse' && st.coin;
function name(p) {
  if (isAI(p)) return t('qtt.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('qtt.p' + p);
}
const sym = (p) => QTT.sym(st, p);
const markLabel = (n) => sym(QTT.markN(st, n).p) + String(n).split('').map((d) => SUB[d]).join('');

// ---------- geometry ----------
const cellXY = (c) => [M + (c % 3) * CS, M + Math.floor(c / 3) * CS];
const cellCenter = (c) => { const [x, y] = cellXY(c); return [x + CS / 2, y + CS / 2]; };
function slotXY(c, n) {
  const [x, y] = cellXY(c), i = n - 1;
  return [x + CS * (0.2 + 0.3 * (i % 3)), y + CS * (0.22 + 0.29 * Math.floor(i / 3))];
}
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const col = Math.floor((p.x - M) / CS), row = Math.floor((p.y - M) / CS);
  return col >= 0 && col < 3 && row >= 0 && row < 3 ? row * 3 + col : null;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- drawing ----------
const pathEl = (d, cls, color, extra = '') => `<path class="${cls}" d="${d}" stroke="${color}" ${extra}/>`;
function bigMark(c, p, n, cls) {
  const [cx, cy] = cellCenter(c), r = CS * 0.3, col = COLORS[p].main;
  let s = '';
  if (sym(p) === 'X') {
    const [a, b] = shapeFor(`X${c}_${n}`, () => [line(cx - r, cy - r, cx + r, cy + r, 3), line(cx + r, cy - r, cx - r, cy + r, 3)]);
    s += pathEl(a, 'big', col) + pathEl(b, 'big', col);
  } else {
    s += pathEl(shapeFor(`O${c}_${n}`, () => circle(cx, cy, r, r * 1.05, 0.06)), 'big', col);
  }
  const [x, y] = cellXY(c);
  s += `<text class="bign" x="${x + CS - 12}" y="${y + CS - 10}" fill="${COLORS[p].dark}">${n}</text>`;
  return `<g class="${cls}">${s}</g>`;
}
function spooky(c, m, cls = '') {
  const [x, y] = slotXY(c, m.n);
  return `<text class="spk ${cls}" x="${x}" y="${y}" fill="${COLORS[m.p].main}">${sym(m.p)}<tspan class="sub" dy="5">${m.n}</tspan></text>`;
}
function link(m, cls = '') {
  const [x1, y1] = slotXY(m.a, m.n), [x2, y2] = slotXY(m.b, m.n);
  const d = shapeFor(`L${m.n}_${m.a}_${m.b}`, () => line(x1 + 4, y1 - 6, x2 + 4, y2 - 6, 6));
  return pathEl(d, 'link ' + cls, COLORS[m.p].main);
}
function cellFill(c, cls, color = '') {
  const [x, y] = cellXY(c);
  return `<rect class="${cls}" x="${x + 6}" y="${y + 6}" width="${CS - 12}" height="${CS - 12}" rx="14" ${color ? `fill="${color}"` : ''}/>`;
}

function render(animate = false) {
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';
  const cyc = QTT.cycle(st);
  const pend = st.phase === 'collapse' ? QTT.markN(st, st.pending) : null;
  const myTurn = canMove() && !coinPending();

  // cell backgrounds
  if (cyc) for (const c of cyc.cells) out += cellFill(c, 'loop', '#ffe48a');
  if (pend && myTurn) for (const c of [pend.a, pend.b]) out += cellFill(c, 'cand' + (pick === c ? ' on' : ''));
  if (sel !== null) out += cellFill(sel, 'sel', COLORS[st.turn].fill);
  if (myTurn && st.phase === 'place' && hover !== null && hover !== sel && !st.cls[hover]) out += cellFill(hover, 'hov', COLORS[st.turn].fill);

  // grid (#)
  for (let i = 1; i < 3; i++) {
    const v = M + i * CS;
    out += pathEl(shapeFor('gv' + i, () => line(v, M + 4, v, W - M - 4, 3)), 'grid', PALETTE.ink);
    out += pathEl(shapeFor('gh' + i, () => line(M + 4, v, W - M - 4, v, 3)), 'grid', PALETTE.ink);
  }

  // collapse preview (selected or hovered candidate)
  const prevCell = pend && myTurn ? (pick ?? (pend.a === hover || pend.b === hover ? hover : null)) : null;
  const preview = prevCell !== null ? QTT.previewCollapse(st, prevCell) : null;
  const resolving = new Set(preview ? preview.map((x) => x.n) : []);

  // entanglement links + spooky marks
  const open = QTT.open(st);
  const freshN = animate && st.last && st.last.t === 'place' ? st.last.n : 0;
  for (const m of open) out += link(m, (resolving.has(m.n) ? 'fade' : '') + (m.n === freshN ? ' fresh' : '') + (cyc && cyc.marks.includes(m.n) ? ' inloop' : ''));
  for (const m of open) for (const c of [m.a, m.b]) out += spooky(c, m, (resolving.has(m.n) ? 'fade' : '') + (m.n === freshN ? ' fresh' : ''));

  // classical marks
  const freshCells = animate && st.last && st.last.t === 'collapse' ? st.last.cells : [];
  st.cls.forEach((x, c) => { if (x) out += bigMark(c, x.p, x.n, freshCells.includes(c) ? 'fresh' : ''); });
  if (preview) for (const x of preview) out += bigMark(x.cell, x.p, x.n, 'ghost');

  // placement ghosts
  if (myTurn && st.phase === 'place' && sel !== null) {
    const n = st.marks.length + 1, ghost = { p: st.turn, n, a: sel, b: hover ?? sel };
    if (hover !== null && hover !== sel && !st.cls[hover]) out += link(ghost, 'ghost') + spooky(hover, ghost, 'ghost');
    out += spooky(sel, ghost, 'ghost');
  }

  // winning lines
  if (over && st.result) for (const l of st.result.lines) {
    const [x1, y1] = cellCenter(l.cells[0]), [x2, y2] = cellCenter(l.cells[2]);
    const dx = (x2 - x1) * 0.18, dy = (y2 - y1) * 0.18;
    out += pathEl(shapeFor('win' + l.cells.join(), () => line(x1 - dx, y1 - dy, x2 + dx, y2 + dy, 4)), 'strike', COLORS[l.p].dark, 'pathLength="1"');
  }
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
    el.querySelector('.score').innerHTML = `<b class="sym" style="color:${COLORS[p].main}">${sym(p)}</b> · ${plural(tally[p], 'qtt.pts')}`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  let main = '', hint = '';
  const p = st.turn;
  if (over) main = '';
  else if (online() && !sess.connected) main = t('qtt.online.wait');
  else if (st.phase === 'collapse') {
    if (st.coin) main = t('qtt.loop.coin');
    else if (isAI(p)) main = t('qtt.thinking', { name: name(p) });
    else {
      main = online() ? (isLocal(p) ? t('qtt.loop.you') : t('qtt.loop', { name: name(p) })) : t('qtt.loop', { name: name(p) });
      if (isLocal(p)) hint = pick !== null ? t('qtt.loop.confirm') : t('qtt.loop.hint', { mark: markLabel(st.pending) });
    }
  } else if (isAI(p)) main = t('qtt.thinking', { name: name(p) });
  else if (online()) main = isLocal(p) ? t('qtt.turn.you', { sym: sym(p) }) : t('qtt.turn.them', { name: name(p) });
  else main = t('qtt.turn', { name: name(p), sym: sym(p) });
  if (!over && st.phase === 'place' && canMove()) hint = t(sel === null ? 'qtt.hint.first' : 'qtt.hint.second');
  $('#status-main').textContent = main;
  $('#status-hint').textContent = hint;
  $('#status').style.color = COLORS[p].main;

  $('#undo').disabled = online() || !history.length || (!over && isAI(st.turn));
  $('#mode').disabled = online();
  $('#rule').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('qtt.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('qtt.online.note') : '';
}

const bubbleTimers = [], sayTimers = [];
// A newer line (or a new game) cancels a delayed one, so stale reactions never pop up later.
function say(p, key, delay = 0) {
  clearTimeout(sayTimers[p]);
  sayTimers[p] = setTimeout(() => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  }, delay);
}
const hush = () => [0, 1].forEach((p) => { clearTimeout(sayTimers[p]); clearTimeout(bubbleTimers[p]); $(`.player.p${p} .bubble`).classList.remove('show'); });
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame(first = st ? 1 - st.first : 0, coin = cfg.rule === 'coin') {
  clearTimeout(timer);
  st = QTT.create({ first, coin });
  history = []; shapes = {}; over = false; sel = hover = pick = null;
  hush();
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAuto();
}

function play(mv) {
  history.push({ st: QTT.clone(st), tally: tally.slice() });
  const who = st.turn, other = 1 - who;
  const info = QTT.apply(st, mv);
  sel = pick = null;
  if (mv.t === 'place') {
    if (info.cycle) {
      const cyc = QTT.cycle(st);
      if (cyc.marks.every((n) => QTT.markN(st, n).p === who)) { setMood(who, 'smug', 'wave'); say(who, 'say.allmine'); }
      else { setMood(who, 'worried'); say(who, 'say.loop'); }
      setMood(other, st.coin ? 'worried' : 'smug', 'point');
      say(other, st.coin ? 'say.coin' : 'say.choose', 700);
    } else { setMood(who, 'neutral'); if (moods[other].mood !== 'neutral') setMood(other, 'neutral'); }
  } else {
    if (st.over) return finish();
    const v = QTT.evaluate(st, who);
    if (v > 18) { setMood(who, 'happy', 'wave'); setMood(other, 'sad'); say(who, 'say.good'); if (v > 40) say(other, 'say.bad', 600); }
    else if (v < -18) { setMood(who, 'worried'); setMood(other, 'smug'); say(who, 'say.bad'); }
    else { setMood(who, 'neutral'); setMood(other, 'neutral'); }
  }
  render(true);
  maybeAuto();
}

// AI turns and coin-flip collapses run on their own (online: only on the deciding player's device).
function maybeAuto() {
  clearTimeout(timer);
  if (over) return;
  const p = st.turn;
  if (coinPending() && (isAI(p) || (isLocal(p) && (!online() || sess.connected)))) {
    const m = QTT.markN(st, st.pending);
    timer = setTimeout(() => localMove({ t: 'collapse', c: Math.random() < 0.5 ? m.a : m.b }), 1300);
  } else if (isAI(p)) {
    timer = setTimeout(() => play(QTT.aiMove(st, cfg.mode)), st.phase === 'collapse' ? 900 : 550);
  }
}

function finish() {
  over = true;
  const r = st.result;
  tally = tally.map((x, p) => x + r.pts[p]);
  const txt = $('#result-text'), sub = $('#result-sub');
  if (r.winners.length === 2) {
    setMood(0, 'happy', 'up'); setMood(1, 'happy', 'up'); say(0, 'say.shared'); say(1, 'say.shared', 700);
    txt.textContent = t('qtt.shared'); txt.style.color = 'var(--ink)'; sub.textContent = t('qtt.shared.sub');
  } else if (r.winners.length === 1) {
    const w = r.winners[0];
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'say.win'); say(1 - w, 'say.lose', 900);
    txt.textContent = t(r.pts[w] > 1 ? 'qtt.win.double' : 'qtt.win', { name: name(w) }); txt.style.color = COLORS[w].main;
    sub.textContent = '';
  } else {
    setMood(0, 'worried'); setMood(1, 'worried'); say(0, 'say.draw'); say(1, 'say.draw', 600);
    txt.textContent = t('qtt.draw'); txt.style.color = 'var(--ink)'; sub.textContent = '';
  }
  if (canRestart()) sub.textContent = (sub.textContent ? sub.textContent + '. ' : '') + t('qtt.next', { name: name(1 - st.first) });
  render(true);
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1100);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(timer);
  let h;
  do { h = history.pop(); st = h.st; tally = h.tally; } while (history.length && (isAI(st.turn) || coinPending()));
  over = false; sel = pick = null;
  hush();
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAuto();
}

// Online, only the room creator may restart (and change rules); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sess.send('new', { first: st.first, coin: st.coin, tally });
}

// ---------- online ----------
function sendState() { sess.send('state', { st, over, tally, names: cfg.names }); }
function onSession(s) {
  sess = s;
  clearTimeout(timer);
  tally = [0, 0];
  s.on('status', () => { if (sess === s) { renderPlayers(); maybeAuto(); } });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = d.over; tally = d.tally; history = []; shapes = {}; sel = hover = pick = null;
    remoteNames[0] = d.names[0];
    $('#rule').value = st.coin ? 'coin' : 'choose';
    $('#result').hidden = true;
    if (over) { over = false; tally = tally.map((x, p) => x - st.result.pts[p]); finish(); } else { render(false); maybeAuto(); }
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.ply || !QTT.isLegal(st, d.mv)) return s.host ? sendState() : s.send('resync');
    play(d.mv);
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => {
    if (s.host) return;
    tally = d.tally;
    $('#rule').value = d.coin ? 'coin' : 'choose';
    newGame(d.first, d.coin);
  });
  if (s.host) newGame();
  else render(false);
}

function localMove(mv) {
  if (!QTT.isLegal(st, mv)) return;
  if (online()) sess.send('move', { mv, n: st.ply });
  play(mv);
}

// ---------- input ----------
function onCell(c) {
  if (c === null || !canMove() || coinPending()) return;
  if (st.phase === 'collapse') {
    const m = QTT.markN(st, st.pending);
    if (c !== m.a && c !== m.b) { pick = null; return render(); }
    if (touchy && pick !== c) { pick = c; return render(); } // touch: first tap previews, second confirms
    return localMove({ t: 'collapse', c });
  }
  if (st.cls[c]) return;
  if (sel === null) { sel = c; return render(); }
  if (sel === c) { sel = null; return render(); }
  localMove({ t: 'place', a: sel, b: c });
}
svg.addEventListener('pointerdown', (evt) => { touchy = evt.pointerType !== 'mouse'; });
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const c = canMove() ? cellAt(evt) : null;
  if (c === hover) return;
  hover = c;
  svg.style.cursor = c !== null && !st.cls[c] ? 'pointer' : '';
  render();
});
svg.addEventListener('pointerleave', () => { if (hover !== null) { hover = null; render(); } });
svg.addEventListener('click', (evt) => onCell(cellAt(evt)));

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); tally = [0, 0]; newGame(0); });
$('#rule').addEventListener('change', (e) => { cfg.rule = e.target.value; saveCfg(); restart(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    render();
  }));
document.addEventListener('mg:lang', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#rule').value = cfg.rule;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; tally = [0, 0]; $('#rule').value = cfg.rule; newGame(0); },
});
if (!online()) showOnce('how', SLUG);

// test hook for gameplay scripts
window.__qtt = { get st() { return st; }, get over() { return over; } };
