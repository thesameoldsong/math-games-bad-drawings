import { t, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { NEU } from './engine.js';
import './strings.js';

const SLUG = 'neutron';
const N = NEU.N, S = 64, M = 14, W = M * 2 + N * S; // cell size, margin, board size
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', variant: 'step', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-neutron') || '{}'));
const saveCfg = () => localStorage.setItem('mg-neutron', JSON.stringify(cfg));

let st, history, over, aiTimer, sel = -1, hoverCell = -1;
let pendingAI = null;               // the computer's piece move, played after its neutron step
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
  if (isAI(p)) return t('neu.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('neu.p' + p);
}

// ---------- geometry ----------
// The online guest (red) sees the board turned around, so their own home row is at the bottom.
const flipped = () => online() && mySeat() === 1;
function cellXY(i) {
  let r = NEU.rowOf(i), c = NEU.colOf(i);
  if (flipped()) { r = N - 1 - r; c = N - 1 - c; }
  return [M + c * S + S / 2, M + r * S + S / 2];
}
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  let c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  if (r < 0 || r >= N || c < 0 || c >= N) return -1;
  if (flipped()) { r = N - 1 - r; c = N - 1 - c; }
  return r * N + c;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- rendering ----------
function arrow(from, to, color, k, old) {
  const [x1, y1] = cellXY(from), [x2, y2] = cellXY(to);
  const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const ex = x2 - ux * 25, ey = y2 - uy * 25;
  const body = shapeFor(`a${k}${from}_${to}_${flipped()}`, () => line(x1 - ux * 4, y1 - uy * 4, ex, ey, 2));
  const hx = -uy, hy = ux;
  const head = `M${(ex - ux * 9 + hx * 7).toFixed(1)} ${(ey - uy * 9 + hy * 7).toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${(ex - ux * 9 - hx * 7).toFixed(1)} ${(ey - uy * 9 - hy * 7).toFixed(1)}`;
  return `<g class="trail${old ? ' old' : ''}" stroke="${color}"><path d="${body}"/><path d="${head}"/></g>`;
}

function token(i, v, fresh) {
  const [x, y] = cellXY(i);
  const k = `t${i}`;
  let style = '', cls = 'tok';
  if (fresh) {
    const [fx, fy] = cellXY(fresh.from);
    style = ` style="--dx:${(fx - x).toFixed(1)}px;--dy:${(fy - y).toFixed(1)}px"`;
    cls += ' fresh';
  }
  if (v === 2) {
    const d = shapeFor(k + 'n', () => circle(0, 0, 21, 21, 0.06));
    const orbit = shapeFor(k + 'o', () => circle(0, 0, 13, 5.5, 0.08));
    return `<g class="${cls} neutron"${style}><g transform="translate(${x} ${y})">
      <path d="${d}" fill="${INK}" filter="url(#mg-crayon)"/>
      <path d="${d}" fill="none" stroke="${INK}" stroke-width="3.5"/>
      <path d="${orbit}" fill="none" stroke="var(--card)" stroke-width="2.4" transform="rotate(-30)"/>
      <path d="${orbit}" fill="none" stroke="var(--card)" stroke-width="2.4" transform="rotate(35)"/>
      <circle r="3.2" fill="var(--card)"/></g></g>`;
  }
  const col = COLORS[v];
  const d = shapeFor(k + 'p' + v, () => circle(0, 0, 22, 22, 0.07));
  const dot = shapeFor(k + 'i' + v, () => circle(-4, -5, 8, 7, 0.1));
  return `<g class="${cls}"${style}><g transform="translate(${x} ${y})">
    <path d="${d}" fill="${col.fill}" filter="url(#mg-crayon)"/>
    <path d="${dot}" fill="${col.main}" opacity=".35" filter="url(#mg-crayon)"/>
    <path d="${d}" fill="none" stroke="${col.main}" stroke-width="4"/></g></g>`;
}

function render(animate) {
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';
  // home rows, tinted in their owner's color
  for (const p of [0, 1]) {
    const [, y] = cellXY(NEU.HOME[p] * N);
    const d = shapeFor(`home${p}_${flipped()}`, () => {
      const y0 = y - S / 2 + 4, y1 = y + S / 2 - 4, x0 = M + 4, x1 = W - M - 4;
      return `M${x0} ${y0} L${x1} ${y0 + 2} L${x1 - 1} ${y1} L${x0 + 1} ${y1 - 1} Z`;
    });
    out += `<path class="home" d="${d}" fill="${COLORS[p].fill}" filter="url(#mg-crayon)"/>`;
  }
  // grid
  for (let k = 0; k <= N; k++) {
    const a = M + k * S;
    out += `<path class="grid" d="${shapeFor('h' + k, () => line(M - 3, a, W - M + 3, a, 1.6))}"/>`;
    out += `<path class="grid" d="${shapeFor('v' + k, () => line(a, M - 3, a, W - M + 3, 1.6))}"/>`;
  }
  // the last turn's arrows
  const lastWho = st.last.length ? st.last[st.last.length - 1].who : -1;
  for (const m of st.last) if (m.kind === 'piece' || m.who === lastWho) out += arrow(m.from, m.to, m.kind === 'neutron' ? INK : COLORS[m.who].main, m.kind[0], m.who !== lastWho);

  const moves = canMove() ? NEU.legalMoves(st) : [];
  const movable = new Set(moves.map((m) => m.from));
  // selection rings
  if (moves.length) {
    if (st.phase === 'neutron') {
      const [x, y] = cellXY(st.nu);
      out += `<path class="ring pulse" d="${shapeFor('ringN' + st.nu + flipped(), () => circle(x, y, 28, 28, 0.05))}" stroke="${COLORS[st.turn].main}"/>`;
    } else {
      for (const i of movable) {
        const [x, y] = cellXY(i);
        out += `<path class="ring${i === sel ? ' sel' : ' can'}" d="${shapeFor('ring' + i + flipped(), () => circle(x, y, 28, 28, 0.05))}" stroke="${COLORS[st.turn].main}"/>`;
      }
    }
  }
  const last = st.last[st.last.length - 1];
  for (let i = 0; i < N * N; i++) {
    if (st.b[i] < 0) continue;
    out += token(i, st.b[i], animate && last && last.to === i ? last : null);
  }
  // move targets
  const from = st.phase === 'neutron' ? st.nu : sel;
  for (const m of moves) {
    if (m.from !== from) continue;
    const [x, y] = cellXY(m.to);
    out += `<path class="target" data-to="${m.to}" d="${shapeFor('dot' + m.to + flipped(), () => circle(x, y, 7, 7, 0.1))}" fill="${COLORS[st.turn].main}"/>`;
  }
  out += `<path id="preview" class="preview" d=""/>`;
  svg.innerHTML = out;
  svg.classList.toggle('busy', !canMove());
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
    const [, y] = cellXY(NEU.HOME[p] * N);
    el.querySelector('.score').textContent = t(y > W / 2 ? 'neu.home.down' : 'neu.home.up');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const phase = st.ply === 0 ? 'first' : st.phase;
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('neu.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('neu.you.' + phase) : t('neu.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('neu.thinking', { name: name(st.turn) });
  else status.textContent = t('neu.turn.' + phase, { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#variant').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('neu.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('neu.online.note') : '';
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
  st = NEU.create({ first, slide: cfg.variant === 'slide' });
  nextFirst = 1 - first;
  history = []; over = false; sel = -1;
  for (const k in shapes) if (k.startsWith('a') || k.startsWith('t')) delete shapes[k];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// distance of the neutron from p's home row
const homeDist = (s, p) => Math.abs(NEU.rowOf(s.nu) - NEU.HOME[p]);

function play(m) {
  const prev = NEU.clone(st);
  history.push(prev);
  const who = st.turn, other = 1 - who;
  NEU.apply(st, m);
  sel = -1;
  if (NEU.isOver(st)) return finish();
  if (st.turn !== who) react(prev, who, other);
  render(true);
  maybeAI();
}

// Reactions after a whole turn: did the mover just hand over a win, or corner the opponent?
function react(prev, who, other) {
  const o = NEU.outlook(st);
  const start = history.length >= 2 ? history[history.length - 2] : prev;
  if (o.canWin) {
    setMood(who, 'worried'); setMood(other, 'smug');
    if (isLocal(other) || Math.random() < 0.7) say(other, 'neu.say.gift');
    if (!isAI(who)) setTimeout(() => say(who, 'neu.say.oops'), 700);
  } else if (o.safe === 0) {
    setMood(who, 'smug', 'wave'); setMood(other, 'worried');
    say(who, 'neu.say.trap');
  } else if (o.safe === 1) {
    setMood(who, 'happy'); setMood(other, 'worried');
    if (Math.random() < 0.6) say(other, 'neu.say.worried');
  } else if (homeDist(st, who) < homeDist(start, who) && homeDist(st, who) <= 1) {
    setMood(who, 'happy', 'wave'); setMood(other, 'neutral');
    if (Math.random() < 0.5) say(who, 'neu.say.good');
  } else {
    setMood(who, 'neutral'); setMood(other, 'neutral');
  }
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  const delay = st.phase === 'piece' && st.ply > 0 ? 520 : 650;
  aiTimer = setTimeout(() => {
    if (st.phase === 'neutron' || st.ply === 0) {
      const tr = NEU.aiTurn(st, cfg.mode);
      if (!tr) return;
      pendingAI = tr.p;
      if (tr.n) { play(tr.n); return; }
    }
    const p = pendingAI && NEU.isLegal(st, pendingAI) ? pendingAI : (NEU.aiTurn(st, cfg.mode) || {}).p;
    pendingAI = null;
    if (p) play(p);
  }, delay);
}
function finish() {
  over = true;
  clearTimeout(aiTimer);
  const w = st.winner;
  if (st.draw) {
    setMood(0, 'worried'); setMood(1, 'worried');
    say(0, 'neu.say.draw');
  } else {
    const l = 1 - w;
    setMood(w, 'happy', 'up'); setMood(l, 'sad');
    say(w, 'neu.say.win');
    setTimeout(() => say(l, st.reason === 'own-goal' ? 'neu.say.owngoal' : 'neu.say.lose'), 900);
  }
  fillResult();
  render(true);
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1000);
}

function fillResult() {
  const txt = $('#result-text'), w = st.winner;
  txt.textContent = st.draw ? t('neu.draw') : t('neu.win', { name: name(w) });
  txt.style.color = st.draw ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').textContent = t('neu.why.' + st.reason);
  $('#result-next').textContent = t('neu.next', { name: name(nextFirst) });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  pendingAI = null;
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
// moves carry the half-move counter (ply) to catch desyncs.
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  for (const k in shapes) delete shapes[k];
  s.on('status', () => render(false));
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = d.over; history = []; sel = -1; nextFirst = d.nextFirst;
    cfg.variant = st.slide ? 'slide' : 'step'; $('#variant').value = cfg.variant;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.ply || !NEU.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
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
// Neutron phase: tap a dot. Piece phase: tap your piece, then a dot (tapping a dot that only one
// of your pieces can reach also works).
function actionAt(i) {
  if (i < 0) return null;
  const moves = NEU.legalMoves(st);
  if (st.phase === 'neutron') {
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
  if (a?.move) {
    const [x1, y1] = cellXY(a.move.from), [x2, y2] = cellXY(a.move.to);
    pv.setAttribute('d', `M${x1} ${y1} L${x2} ${y2}`);
    pv.setAttribute('stroke', COLORS[st.turn].main);
  } else pv.setAttribute('d', '');
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; svg.querySelector('#preview')?.setAttribute('d', ''); });

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
document.addEventListener('mg:lang', () => { render(false); if (over) fillResult(); });

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
  onEnd: () => { sess = null; for (const k in shapes) delete shapes[k]; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
