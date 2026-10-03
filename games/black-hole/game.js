import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, curve, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { BH } from './engine.js';
import './strings.js';

const SLUG = 'black-hole';
const STORE = 'mg-' + SLUG;
const D = 60, R = 26.5, DY = D * 0.866, M = 8;   // circle spacing, radius, row step, margin
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 6, mode: 'pvp', first: 'alt', names: ['', ''] }, JSON.parse(localStorage.getItem(STORE) || '{}'));
if (!BH.SIZES.includes(+cfg.size)) cfg.size = 6;
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));

// match: wins per seat and how many games were started (the starter alternates when first = 'alt')
let match = { wins: [0, 0], game: 0 };
let st, history, shapes, over, aiTimer, resultTimer, showTimer, hoverCell = -1;
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
const canRestart = () => !online() || sess.host;
const starter = (game) => (cfg.first === 'alt' ? game % 2 : +cfg.first);
function name(p) {
  if (isAI(p)) return t('bh.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('bh.p' + p);
}
// the number player p writes next
const nextOf = (s, p) => s.owner.reduce((k, o) => k + (o === p), 0) + 1;

// ---------- geometry ----------
const width = () => st.rows * D + 2 * M;
const height = () => (st.rows - 1) * DY + D + 2 * M;
function cellXY(i) {
  const [r, c] = BH.rowCol(st, i);
  return [width() / 2 + (c - r / 2) * D, M + D / 2 + r * DY];
}
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  let best = -1, bd = D * 0.5;
  for (let i = 0; i < st.n; i++) {
    const [x, y] = cellXY(i), d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- drawing ----------
function numberSVG(i, v, color, cls = '') {
  const [x, y] = cellXY(i);
  const rot = shapeFor('rot' + i, () => (Math.random() * 2 - 1) * 7);
  const fs = v >= 10 ? 36 : 42;
  // the wrapper carries CSS animations, the text keeps its own (attribute) tilt
  return `<g class="num ${cls}" style="transform-origin:${x}px ${y}px"><text x="${x}" y="${y + 1}" fill="${color}" font-size="${fs}" transform="rotate(${rot.toFixed(1)} ${x} ${y})">${v}</text></g>`;
}
function spiral(cx, cy, r) {
  const pts = [];
  for (let k = 0; k <= 28; k++) {
    const a = k * 0.62, rr = r * (0.08 + 0.92 * (k / 28));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return curve(pts);
}

function render(animateLast) {
  svg.setAttribute('viewBox', `0 0 ${width()} ${height()}`);
  const doomed = new Set(over ? BH.neighbors(st, st.hole) : []);
  let fills = '', rings = '', nums = '', fx = '';
  for (let i = 0; i < st.n; i++) {
    const [x, y] = cellXY(i), o = st.owner[i];
    const ring = shapeFor('c' + i, () => circle(x, y, R, R * 1.03, 0.045));
    if (over && i === st.hole) {
      fills += `<path class="hole${animateLast ? ' fresh' : ''}" d="${ring}" style="transform-origin:${x}px ${y}px"/>`;
      fx += `<path class="swirl${animateLast ? ' fresh' : ''}" d="${shapeFor('sw', () => spiral(x, y, R * 0.8))}" style="transform-origin:${x}px ${y}px"/>`;
      continue;
    }
    if (o >= 0) fills += `<path class="tint" d="${ring}" fill="${COLORS[o].fill}"/>`;
    if (i === st.last && !over) fills += `<path class="last" d="${shapeFor('l' + i, () => circle(x, y, R + 3, R + 3, 0.03))}"/>`;
    rings += `<path class="ring${o < 0 && !over ? ' empty' : ''}" d="${ring}"/>`;
    if (o < 0) continue;
    const fresh = animateLast && i === st.last && !over;
    if (doomed.has(i)) {
      nums += numberSVG(i, st.val[i], COLORS[o].main, 'doomed' + (animateLast ? ' fresh' : ''));
      const [hx, hy] = cellXY(st.hole);
      const s = R * 0.62;
      fx += `<path class="strike${animateLast ? ' fresh' : ''}" d="${shapeFor('x' + i, () => line(x - s, y + s, x + s, y - s, 2))}" pathLength="1"/>`;
      if (animateLast) {
        fx += `<g class="sucked" style="--dx:${(hx - x).toFixed(1)}px;--dy:${(hy - y).toFixed(1)}px;transform-origin:${x}px ${y}px">${numberSVG(i, st.val[i], COLORS[o].main)}</g>`;
      }
    } else nums += numberSVG(i, st.val[i], COLORS[o].main, fresh ? 'fresh' : '');
  }
  svg.innerHTML = `${fills}${rings}${nums}${fx}<g id="ghost"></g>`;
  hoverCell = -1;
  renderPlayers();
}

function renderGhost(i) {
  const g = svg.querySelector('#ghost');
  if (!g) return;
  g.innerHTML = i < 0 ? '' : numberSVG(i, BH.nextNumber(st), COLORS[st.turn].main, 'ghost');
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
    const nx = nextOf(st, p);
    const main = over ? t('bh.lost', { n: st.lost[p] }) : nx > BH.maxNumber(st) ? t('bh.done') : t('bh.next', { n: nx });
    const wins = match.wins[0] + match.wins[1] ? `<span class="wins">${plural(match.wins[p], 'bh.wins')}</span>` : '';
    el.querySelector('.score').innerHTML = `<span class="pts${over ? ' lost' : ''}">${main}</span>${wins}`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const n = BH.nextNumber(st);
  if (over) status.textContent = t('bh.collapse');
  else if (online() && !sess.connected) status.textContent = t('bh.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('bh.turn.you', { n }) : t('bh.turn.them', { name: name(st.turn), n });
  else if (isAI(st.turn)) status.textContent = t('bh.thinking', { name: name(st.turn) });
  else status.textContent = t('bh.turn', { name: name(st.turn), n });
  status.style.color = over ? 'var(--ink)' : COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#first').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('bh.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('bh.online.note') : '';
  for (const o of $('#first').options) if (o.value !== 'alt') o.textContent = name(+o.value);
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
function newGame() {
  clearTimeout(aiTimer); clearTimeout(resultTimer); clearTimeout(showTimer);
  st = BH.create(+cfg.size, starter(match.game));
  history = []; shapes = {}; over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
  $('#result').hidden = true;
  render(false);
  maybeAI();
}
function newMatch() { match = { wins: [0, 0], game: 0 }; newGame(); }

// Exact value for small endgames (cheap), used only to make the figures react.
const SOLVE_LIMIT = 9;
function react(prev, i) {
  const who = prev.turn, other = 1 - who;
  const leftBefore = prev.n - prev.moves;
  setMood(who, 'neutral');
  if (moods[other].mood !== 'smug') setMood(other, 'neutral');
  if (leftBefore <= SOLVE_LIMIT) {
    const before = BH.solve(prev), after = -BH.solve(st);
    if (after < before) {
      setMood(other, 'happy', 'wave'); setMood(who, 'worried');
      if (Math.random() < 0.7) say(other, 'bh.say.gift');
      else say(who, 'bh.say.oops');
    } else if (after > 0 && leftBefore <= 5 && Math.random() < 0.6) {
      setMood(who, 'smug'); setMood(other, 'worried');
      say(who, 'bh.say.plan');
    }
  } else {
    const loss = BH.lossAt(prev, i), v = st.val[i];
    const openAround = BH.neighbors(st, i).filter((j) => st.owner[j] < 0).length;
    if (loss[who] >= 6 && loss[who] > loss[other]) {
      setMood(who, 'happy', 'wave');
      if (Math.random() < 0.6) say(who, 'bh.say.safe');
    } else if (loss[other] >= 7 && loss[other] > loss[who]) {
      setMood(other, 'happy');
      if (Math.random() < 0.6) say(other, 'bh.say.gift');
    } else if (v >= BH.maxNumber(st) * 0.6 && openAround >= 3) {
      setMood(who, 'worried'); setMood(other, 'smug');
      if (Math.random() < 0.5) say(other, 'bh.say.risky');
    }
  }
  // the very last move picks the hole
  if (st.n - st.moves === 2 && Math.random() < 0.7) setTimeout(() => !over && say(st.turn, 'bh.say.last'), 500);
}

function play(i) {
  const prev = BH.clone(st);
  history.push({ st: prev, wins: match.wins.slice() });
  BH.apply(st, i);
  if (BH.isOver(st)) {
    if (st.winner < 2) match.wins[st.winner]++;
    return finish(true);
  }
  react(prev, i);
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    play(BH.aiMove(st, cfg.mode));
  }, 650);
}

function finish(fresh) {
  over = true;
  clearTimeout(resultTimer);
  const w = st.winner;
  if (w === 2) { setMood(0, 'worried'); setMood(1, 'worried'); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); }
  if (fresh) {
    hush();
    resultTimer = setTimeout(() => {
      if (!over) return;
      if (w === 2) say(0, 'bh.say.tie');
      else { say(w, 'bh.say.win'); setTimeout(() => over && say(1 - w, 'bh.say.lose'), 800); }
    }, 900);
  }
  render(fresh);
  resultText();
  clearTimeout(showTimer);
  const show = () => { if (over) $('#result').hidden = false; };
  if (fresh) showTimer = setTimeout(show, 2000); else show();
}
// Texts of the result card (also refreshed on a language switch or a name change).
function resultText() {
  const w = st.winner, txt = $('#result-text');
  txt.textContent = w === 2 ? t('bh.tie') : t('bh.win', { name: name(w) });
  txt.style.color = w === 2 ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').textContent = t('bh.why', { n0: name(0), n1: name(1), a: st.lost[0], b: st.lost[1] });
  $('#result-next').textContent = t('bh.nextgame', { name: name(starter(match.game + 1)) });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer); clearTimeout(resultTimer); clearTimeout(showTimer);
  let h;
  do { h = history.pop(); st = h.st; } while (history.length && isAI(st.turn));
  match.wins = h.wins;
  over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart or change settings; the guest follows.
function restart(next) {
  if (!canRestart()) return;
  if (next) match.game++;
  newGame();
  if (online()) sendState('new');
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
function sendState(type = 'state') {
  sess.send(type, { st, over, match, size: cfg.size, first: cfg.first, names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  const receive = (d) => {
    if (s.host) return;
    clearTimeout(resultTimer); clearTimeout(showTimer);
    st = d.st; over = d.over; match = d.match; history = []; shapes = {};
    cfg.size = d.size; cfg.first = d.first;
    $('#size').value = cfg.size; $('#first').value = cfg.first;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    hush();
    $('#result').hidden = true;
    over ? finish(false) : render(false);
  };
  s.on('state', receive);
  s.on('new', receive);
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; renderPlayers(); if (over) resultText(); });
  s.on('move', (d) => {
    if (d.n !== st.moves || !BH.legal(st, d.i) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.i);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else render(false);
}

function localMove(i) {
  if (online()) sess.send('move', { i, n: st.moves });
  play(i);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  let i = canMove() ? cellAt(evt) : -1;
  if (i >= 0 && st.owner[i] >= 0) i = -1;
  if (i === hoverCell) return;
  hoverCell = i;
  renderGhost(i);
  svg.style.cursor = i >= 0 ? 'pointer' : '';
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; renderGhost(-1); });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const i = cellAt(evt);
  if (BH.legal(st, i)) localMove(i);
});

const hostSetting = () => { saveCfg(); if (canRestart()) { newMatch(); if (online()) sendState('new'); } };
$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; hostSetting(); });
$('#first').addEventListener('change', (e) => { cfg.first = e.target.value; hostSetting(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newMatch(); });
$('#new').addEventListener('click', () => restart(over));
$('#again').addEventListener('click', () => restart(true));
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    renderPlayers();
    if (over) resultText();
  }));
document.addEventListener('mg:lang', () => { renderPlayers(); if (over) resultText(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
$('#first').value = cfg.first;
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newMatch(); },
});
if (!online()) showOnce('how', SLUG);
