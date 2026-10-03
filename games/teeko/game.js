import { t, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { TEEKO } from './engine.js';
import './strings.js';

const SLUG = 'teeko';
const N = TEEKO.N, S = 64, M = 12, W = M * 2 + N * S; // cell size, margin, board size
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', variant: 'advanced', warn: 'on', names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-teeko') || '{}'));
const saveCfg = () => localStorage.setItem('mg-teeko', JSON.stringify(cfg));

let st, history, over, aiTimer, sel = -1, hoverCell = -1;
let nextFirst = 0;                  // who opens the next game (alternates)
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
  if (isAI(p)) return t('tk.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('tk.p' + p);
}

// ---------- geometry ----------
const cellXY = (i) => [M + TEEKO.colOf(i) * S + S / 2, M + TEEKO.rowOf(i) * S + S / 2];
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  if (r < 0 || r >= N || c < 0 || c >= N) return -1;
  return r * N + c;
}
const shapeFor = (k, make) => (shapes[k] ??= make());
// Threats by the player who just moved (only shown with the "check" rule on).
const threats = () => (over || cfg.warn !== 'on' || !st.ply ? [] : TEEKO.winningMoves(st, 1 - st.turn));

// ---------- rendering ----------
function arrow(from, to, color) {
  const [x1, y1] = cellXY(from), [x2, y2] = cellXY(to);
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const sx = x1 + ux * 6, sy = y1 + uy * 6, ex = x2 - ux * 26, ey = y2 - uy * 26;
  const body = shapeFor(`a${from}_${to}`, () => line(sx, sy, ex, ey, 1.2));
  const hx = -uy, hy = ux;
  const head = `M${(ex - ux * 8 + hx * 6).toFixed(1)} ${(ey - uy * 8 + hy * 6).toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${(ex - ux * 8 - hx * 6).toFixed(1)} ${(ey - uy * 8 - hy * 6).toFixed(1)}`;
  return `<g class="trail" stroke="${color}"><path d="${body}"/><path d="${head}"/></g>`;
}

function token(i, v, fresh) {
  const [x, y] = cellXY(i);
  const col = COLORS[v];
  let style = '', cls = 'tok';
  if (fresh && fresh.from >= 0) {
    const [fx, fy] = cellXY(fresh.from);
    style = ` style="--dx:${(fx - x).toFixed(1)}px;--dy:${(fy - y).toFixed(1)}px"`;
    cls += ' slide';
  } else if (fresh) cls += ' drop';
  const d = shapeFor(`t${i}p${v}`, () => circle(0, 0, 22, 22, 0.07));
  const inner = shapeFor(`t${i}i${v}`, () => circle(0, 0, 12, 12, 0.1));
  const shine = shapeFor(`t${i}s${v}`, () => circle(-6, -7, 6, 4.5, 0.12));
  return `<g class="${cls}"${style}><g transform="translate(${x} ${y})"><g class="tok-in">
    <path d="${d}" fill="${col.fill}" filter="url(#mg-crayon)"/>
    <path d="${inner}" fill="none" stroke="${col.main}" stroke-width="2.4" opacity=".55"/>
    <path d="${shine}" fill="var(--eye)" opacity=".55"/>
    <path d="${d}" fill="none" stroke="${col.main}" stroke-width="4"/></g></g></g>`;
}

function winMark(winFresh) {
  const w = st.win, col = COLORS[st.winner].text;
  const pts = w.cells.map(cellXY);
  if (w.kind === 'line') {
    const [a, b] = [pts[0], pts[3]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const d = shapeFor('win', () => line(a[0] - ux * 26, a[1] - uy * 26, b[0] + ux * 26, b[1] + uy * 26, 3));
    return `<path class="win${winFresh ? ' fresh' : ''}" d="${d}" stroke="${col}" pathLength="1"/>`;
  }
  // square: corners are [tl, tr, bl, br]
  const [tl, tr, bl, br] = pts;
  // one continuous stroke (so the draw-in animation runs around the square)
  const d = shapeFor('win', () => [line(...tl, ...tr, 2), line(...tr, ...br, 2), line(...br, ...bl, 2), line(...bl, ...tl, 2)]
    .map((seg, k) => (k ? seg.replace(/^M/, 'L') : seg)).join(' '));
  return `<path class="win${winFresh ? ' fresh' : ''}" d="${d}" stroke="${col}" pathLength="1"/>`;
}

function render(animate) {
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';
  // grid
  for (let k = 0; k <= N; k++) {
    const a = M + k * S;
    out += `<path class="grid" d="${shapeFor('h' + k, () => line(M - 3, a, W - M + 3, a, 1.6))}"/>`;
    out += `<path class="grid" d="${shapeFor('v' + k, () => line(a, M - 3, a, W - M + 3, 1.6))}"/>`;
  }
  // threatened cells (the "check" rule)
  for (const th of threats()) {
    const [x, y] = cellXY(th.move.to);
    const d = shapeFor('th' + th.move.to, () => circle(x, y, 22, 22, 0.08)), col = COLORS[1 - st.turn];
    out += `<g class="threat"><path d="${d}" fill="${col.fill}" filter="url(#mg-crayon)"/><path d="${d}" fill="none" stroke="${col.main}"/></g>`;
  }
  // last move
  if (st.last && st.last.from >= 0) out += arrow(st.last.from, st.last.to, COLORS[st.last.who].main);

  const moves = canMove() ? TEEKO.legalMoves(st) : [];
  const drop = TEEKO.phaseOf(st) === 'drop';
  // movable pieces
  if (moves.length && !drop) {
    const movable = new Set(moves.map((m) => m.from));
    for (const i of movable) {
      const [x, y] = cellXY(i);
      out += `<path class="ring${i === sel ? ' sel' : ' can'}" d="${shapeFor('ring' + i, () => circle(x, y, 28, 28, 0.05))}" stroke="${COLORS[st.turn].main}"/>`;
    }
  }
  for (let i = 0; i < N * N; i++) {
    if (st.b[i] < 0) continue;
    out += token(i, st.b[i], animate && st.last && st.last.to === i ? st.last : null);
  }
  // move targets
  if (!drop) for (const m of moves) {
    if (m.from !== sel) continue;
    const [x, y] = cellXY(m.to);
    out += `<path class="target" d="${shapeFor('dot' + m.to, () => circle(x, y, 7, 7, 0.1))}" fill="${COLORS[st.turn].main}"/>`;
  }
  if (over && st.win) out += winMark(animate);
  out += `<g id="preview"></g>`;
  svg.innerHTML = out;
  svg.classList.toggle('busy', !canMove());
  hoverCell = -1;
  renderPlayers();
}

function handDots(p) {
  const left = TEEKO.PIECES - st.placed[p], col = COLORS[p];
  let s = '';
  for (let k = 0; k < TEEKO.PIECES; k++) {
    const x = 9 + k * 19;
    const d = shapeFor(`hand${p}_${k}`, () => circle(x, 9, 7, 7, 0.08));
    s += k < left
      ? `<path d="${d}" fill="${col.fill}" stroke="${col.main}" stroke-width="2.2"/>`
      : `<path d="${d}" fill="none" stroke="${PALETTE.pencil}" stroke-width="1.8" stroke-dasharray="3 3"/>`;
  }
  return `<span class="hand-lbl">${t('tk.hand')}</span> <svg class="hand-dots" viewBox="0 0 76 18" aria-hidden="true">${s}</svg>`;
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
    el.querySelector('.score').innerHTML = st.placed[p] < TEEKO.PIECES ? handDots(p) : t('tk.onboard');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const phase = TEEKO.phaseOf(st);
  const th = threats().length;
  let color = COLORS[st.turn].main;
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('tk.online.wait');
  else if (th) { status.textContent = t('tk.check', { name: name(1 - st.turn) }); color = COLORS[1 - st.turn].main; }
  else if (online()) status.textContent = isLocal(st.turn) ? t('tk.you.' + phase) : t('tk.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('tk.thinking', { name: name(st.turn) });
  else status.textContent = t('tk.turn.' + phase, { name: name(st.turn) });
  status.style.color = color;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#variant').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('tk.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('tk.online.note') : '';
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

// ---------- flow ----------
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  st = TEEKO.create({ first, classic: cfg.variant === 'classic' });
  nextFirst = 1 - first;
  history = []; over = false; sel = -1;
  for (const k in shapes) if (/^(a|win)/.test(k)) delete shapes[k];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  const prev = TEEKO.clone(st);
  history.push(prev);
  const who = st.turn, other = 1 - who;
  TEEKO.apply(st, m);
  sel = -1;
  if (TEEKO.isOver(st)) return finish();
  react(prev, who, other);
  render(true);
  maybeAI();
}

// Reactions: handing over a win, making a threat (or two), blocking one.
// With the "check" warning off, threats stay secret: nobody reacts to them in advance.
function react(prev, who, other) {
  const reveal = cfg.warn === 'on';
  const gift = reveal && TEEKO.winningMoves(st, other).length;
  const targets = reveal ? new Set(TEEKO.winningMoves(st, who).map((x) => x.move.to)).size : 0;
  const hadAgainst = TEEKO.winningMoves(prev, other).length;
  if (gift) {
    setMood(who, 'worried'); setMood(other, 'smug');
    say(other, 'tk.say.gift');
    if (!isAI(who) && Math.random() < 0.6) setTimeout(() => say(who, 'tk.say.oops'), 700);
  } else if (targets >= 2) {
    setMood(who, 'smug', 'wave'); setMood(other, 'worried');
    say(who, 'tk.say.fork');
  } else if (targets === 1) {
    setMood(who, 'happy', 'point'); setMood(other, 'worried');
    say(who, 'tk.say.check');
    if (Math.random() < 0.3) setTimeout(() => say(other, 'tk.say.worried'), 800);
  } else if (hadAgainst && !TEEKO.winningMoves(st, other).length) {
    setMood(who, 'happy', 'wave'); setMood(other, 'neutral');
    if (Math.random() < 0.7) say(who, 'tk.say.block');
  } else {
    setMood(who, 'neutral'); setMood(other, 'neutral');
  }
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const m = TEEKO.aiMove(st, cfg.mode);
    if (m) play(m);
  }, 550);
}

function finish() {
  over = true;
  clearTimeout(aiTimer);
  if (st.draw) {
    setMood(0, 'worried'); setMood(1, 'worried');
    say(st.turn, 'tk.say.draw');
  } else {
    const w = st.winner, l = 1 - w;
    setMood(w, 'happy', 'up'); setMood(l, 'sad');
    say(w, 'tk.say.win');
    setTimeout(() => say(l, 'tk.say.lose'), 900);
  }
  fillResult();
  render(true);
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1600);
}

function fillResult() {
  const txt = $('#result-text'), w = st.winner;
  txt.textContent = st.draw ? t('tk.draw') : t('tk.win', { name: name(w) });
  txt.style.color = st.draw ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').textContent = st.draw ? t('tk.why.' + (st.reason || 'repeat'))
    : st.win.kind === 'line' ? t('tk.why.line') : t('tk.why.square', { k: st.win.size + 1 });
  $('#result-next').textContent = t('tk.next', { name: name(nextFirst) });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; sel = -1;
  for (const k in shapes) if (/^(a|win)/.test(k)) delete shapes[k];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
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
// moves carry the half-move counter (ply) to catch desyncs.
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
    st = d.st; over = d.over; history = []; sel = -1; nextFirst = d.nextFirst;
    for (const k in shapes) if (/^(a|win)/.test(k)) delete shapes[k];
    $('#variant').value = st.classic ? 'classic' : 'advanced';
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    hush();
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.ply || !isRemote(st.turn) || !TEEKO.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
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
// Placing: tap an empty cell. Moving: tap your token, then a neighboring cell
// (a cell that only one of your tokens can reach works straight away).
function actionAt(i) {
  if (i < 0) return null;
  const moves = TEEKO.legalMoves(st);
  if (TEEKO.phaseOf(st) === 'drop') {
    const m = moves.find((x) => x.to === i);
    return m ? { move: m } : null;
  }
  if (st.b[i] === st.turn && moves.some((x) => x.from === i)) return { select: i };
  const viaSel = moves.find((x) => x.from === sel && x.to === i);
  if (viaSel) return { move: viaSel };
  const any = moves.filter((x) => x.to === i);
  if (sel < 0 && any.length === 1) return { move: any[0] };
  return null;
}

svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const a = actionAt(cellAt(evt));
  if (a?.move) return localMove(a.move);
  sel = a?.select !== undefined && a.select !== sel ? a.select : -1;
  render(false);
});
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const i = canMove() ? cellAt(evt) : -1;
  if (i === hoverCell) return;
  hoverCell = i;
  const a = actionAt(i);
  svg.style.cursor = a ? 'pointer' : '';
  const pv = svg.querySelector('#preview');
  if (!pv) return;
  if (a?.move) {
    const [x, y] = cellXY(a.move.to);
    pv.innerHTML = `<circle class="ghost" cx="${x}" cy="${y}" r="21" fill="${COLORS[st.turn].fill}" stroke="${COLORS[st.turn].main}"/>`;
  } else pv.innerHTML = '';
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; const pv = svg.querySelector('#preview'); if (pv) pv.innerHTML = ''; });

$('#variant').addEventListener('change', (e) => { cfg.variant = e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#warn').addEventListener('change', (e) => { cfg.warn = e.target.value; saveCfg(); render(false); });
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
$('#variant').value = cfg.variant;
$('#mode').value = cfg.mode;
$('#warn').value = cfg.warn;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; $('#variant').value = cfg.variant; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
