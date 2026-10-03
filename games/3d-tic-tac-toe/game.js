import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { Q3 } from './engine.js';
import './strings.js';

const SLUG = '3d-tic-tac-toe';
const STORE = 'mg-' + SLUG;
const COLORS = [PALETTE.blue, PALETTE.red];
const MARK = ['X', 'O'];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

// geometry (SVG units): four 4×4 layers in a 2×2 grid, reading order = top → bottom
const C = 40, LS = 4 * C, M = 6, LH = 30, GX = 24, GY = 10;
const W = 2 * M + 2 * LS + GX, H = 2 * M + 2 * (LH + LS) + GY;
const layerXY = (z) => [M + (z % 2) * (LS + GX), M + LH + (z >> 1) * (LS + LH + GY)];
function cellBox(i) {
  const { x, y, z } = Q3.coords(i);
  const [lx, ly] = layerXY(z);
  return [lx + x * C, ly + y * C];
}
const cellCenter = (i) => { const [x, y] = cellBox(i); return [x + C / 2, y + C / 2]; };

const cfg = Object.assign({ mode: 'pvp', gravity: false, hints: false, names: ['', ''] }, JSON.parse(localStorage.getItem(STORE) || '{}'));
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));

let st, history, shapes, over, aiTimer, hoverCell = -1, peek = false;
let starter = 1;                    // flips before every new game → the first game starts with player 0
let wins = [0, 0];
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
function name(p) {
  if (isAI(p)) return t('q3.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('q3.p' + p);
}

const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- drawing ----------
function markPath(i, p, k = 'm') {
  const [cx, cy] = cellCenter(i), r = C * 0.3;
  return shapeFor(k + i + '_' + p, () => (p === 0
    ? line(cx - r, cy - r, cx + r, cy + r, 2) + ' ' + line(cx + r, cy - r, cx - r, cy + r, 2)
    : circle(cx, cy, r * 1.08, r * 1.08, 0.08)));
}
function cellFill(i, k, color, cls = '') {
  const [x, y] = cellBox(i);
  const d = shapeFor('f' + k + i, () => `M${x + 3} ${y + 3}h${C - 6}v${C - 6}h${-(C - 6)}z`);
  return `<path class="cellfill ${cls}" d="${d}" fill="${color}" filter="url(#mg-crayon)"/>`;
}
function stackIcon(z, x, y) {
  let s = '';
  for (let k = 3; k >= 0; k--) {
    const yy = y + k * 5;
    s += `<path d="M${x + 6} ${yy} h20 l-6 5 h-20 z" class="${k === z ? 'slab on' : 'slab'}"/>`;
  }
  return s;
}

function render(animateLast) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const winSet = new Set(over && st.line >= 0 ? Q3.LINES[st.line] : []);
  let out = '';

  for (let z = 0; z < 4; z++) {
    const [lx, ly] = layerXY(z);
    const tag = z === 0 ? ' · ' + t('q3.top') : z === 3 ? ' · ' + t('q3.bottom') : '';
    out += `<text class="lbl" x="${lx + 2}" y="${ly - 9}">${t('q3.layer', { n: z + 1 })}${tag}</text>`;
    out += stackIcon(z, lx + LS - 28, ly - 26);
  }

  // cell backgrounds: last move, win line, unreachable cells (gravity)
  for (let i = 0; i < Q3.CELLS; i++) {
    if (winSet.has(i)) out += cellFill(i, 'w', COLORS[st.winner].fill, 'win');
    else if (!over && i === st.last) out += cellFill(i, 'l', COLORS[st.b[i]].fill, 'last');
    else if (!over && st.gravity && st.b[i] < 0 && !Q3.canPlay(st, i)) out += cellFill(i, 'g', 'var(--q3-blocked)', 'blocked');
  }

  // grids
  for (let z = 0; z < 4; z++) {
    const [lx, ly] = layerXY(z);
    const d = shapeFor('grid' + z, () => {
      let p = '';
      for (let k = 1; k < 4; k++) p += line(lx + k * C, ly + 2, lx + k * C, ly + LS - 2, 1.6) + line(lx + 2, ly + k * C, lx + LS - 2, ly + k * C, 1.6);
      return p;
    });
    const frame = shapeFor('frame' + z, () =>
      line(lx, ly, lx + LS, ly, 1.4) + line(lx + LS, ly, lx + LS, ly + LS, 1.4) + line(lx + LS, ly + LS, lx, ly + LS, 1.4) + line(lx, ly + LS, lx, ly, 1.4));
    out += `<path class="grid" d="${d}"/><path class="frame" d="${frame}"/>`;
  }

  // hints: cells where someone can finish a four right now
  if (cfg.hints && !over) {
    for (const p of [0, 1]) for (const i of Q3.winCells(st, p)) {
      const [cx, cy] = cellCenter(i);
      out += `<circle class="hint" cx="${cx}" cy="${cy}" r="${C * 0.36 + p * 3}" stroke="${COLORS[p].main}"/>`;
    }
  }

  for (let i = 0; i < Q3.CELLS; i++) {
    const p = st.b[i];
    if (p < 0) continue;
    const fresh = animateLast && i === st.last;
    const dim = over && st.line >= 0 && !winSet.has(i);
    out += `<path class="mark${fresh ? ' fresh' : ''}${dim ? ' dim' : ''}" d="${markPath(i, p)}" stroke="${COLORS[p].main}" pathLength="1"/>`;
  }
  out += '<g id="hover"></g>';
  svg.innerHTML = out;
  hoverCell = -1;
  renderPlayers();
}

function renderHover(i) {
  if (i === hoverCell) return;
  hoverCell = i;
  const g = svg.querySelector('#hover');
  if (!g) return;
  if (i < 0) { g.innerHTML = ''; svg.style.cursor = ''; return; }
  const { x, y, z } = Q3.coords(i);
  let s = '';
  for (let zz = 0; zz < 4; zz++) {
    if (zz === z) continue;
    const [bx, by] = cellBox(Q3.idx(x, y, zz));
    s += `<rect class="twin" x="${bx + 4}" y="${by + 4}" width="${C - 8}" height="${C - 8}" rx="5"/>`;
  }
  s += `<path class="ghost" d="${markPath(i, st.turn, 'g')}" stroke="${COLORS[st.turn].main}"/>`;
  g.innerHTML = s;
  svg.style.cursor = 'pointer';
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
    el.querySelector('.score').innerHTML = `<b class="mk" style="color:${COLORS[p].main}">${MARK[p]}</b> · ${plural(wins[p], 'q3.wins')}`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) status.textContent = peek ? $('#result-text').textContent : '';
  else if (online() && !sess.connected) status.textContent = t('q3.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('q3.turn.you') : t('q3.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('q3.thinking', { name: name(st.turn) });
  else status.textContent = t(st.moves ? 'q3.turn' : 'q3.first', { name: name(st.turn) });
  status.style.color = over && st.winner < 0 ? 'var(--ink)' : COLORS[over ? Math.max(0, st.winner) : st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#gravity').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('q3.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('q3.online.note') : '';
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
function newGame(first) {
  clearTimeout(aiTimer);
  if (first === undefined) { starter = 1 - starter; first = starter; }
  st = Q3.create({ gravity: cfg.gravity, first });
  history = []; shapes = {}; over = false; peek = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(i) {
  if (!Q3.canPlay(st, i)) return false;
  history.push({ st: Q3.clone(st), wins: wins.slice() });
  const who = st.turn, other = 1 - who;
  const theirWins = Q3.winCells(st, other);
  const hadThreat = Q3.winCells(st, who).length > 0;
  Q3.apply(st, i);
  if (st.over) { finish(true); return true; }

  const mine = Q3.winCells(st, who);
  if (mine.length >= 2) {
    setMood(who, 'happy', 'up'); setMood(other, 'worried');
    say(who, 'q3.say.fork'); setTimeout(() => say(other, 'q3.say.uhoh'), 700);
  } else if (theirWins.includes(i)) {
    setMood(who, 'happy', 'wave'); setMood(other, 'sad');
    say(who, 'q3.say.block');
    if (Math.random() < 0.5) setTimeout(() => say(other, 'q3.say.blocked'), 700);
  } else if (mine.length === 1) {
    setMood(who, 'smug'); setMood(other, 'worried');
    if (Math.random() < 0.6) say(who, 'q3.say.threat');
  } else if (theirWins.length) {
    // a threat was left open: the opponent can win next move
    setMood(who, 'neutral'); setMood(other, 'smug');
  } else {
    setMood(who, 'neutral');
    if (!hadThreat || moods[other].mood !== 'worried') setMood(other, 'neutral');
  }
  render(true);
  maybeAI();
  return true;
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const m = Q3.aiMove(st, cfg.mode);
    if (m >= 0) play(m);
  }, 550);
}

function finish(count) {
  over = true; peek = false;
  clearTimeout(aiTimer);
  const w = st.winner;
  if (count && w >= 0) wins[w]++;
  const cross = w >= 0 && Q3.crossLayer(st.line);
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); say(0, 'q3.say.tie'); }
  else {
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
    say(w, cross ? 'q3.say.wincross' : 'q3.say.win');
    setTimeout(() => say(1 - w, 'q3.say.lose'), 900);
  }
  render(true);
  showResult();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1100);
}

function showResult() {
  const w = st.winner;
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('q3.tie') : t('q3.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  const how = w < 0 ? t('q3.tie.sub') : t(Q3.crossLayer(st.line) ? 'q3.win.cross' : 'q3.win.flat');
  const nextFirst = 1 - st.first;
  $('#result-sub').innerHTML = `${how}<br><span style="color:${COLORS[nextFirst].main}">${t('q3.next', { name: name(nextFirst) })}</span>`;
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  let h;
  do { h = history.pop(); st = h.st; } while (history.length && isAI(st.turn));
  wins = h.wins;
  over = false; peek = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and change rules); the guest follows the host's state.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
function sendState() {
  if (sess) sess.send('state', { st, over, wins, names: cfg.names });
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
    if (s.host || !d || !d.st) return;
    clearTimeout(aiTimer);
    st = d.st; over = !!d.over; peek = false; wins = d.wins || [0, 0]; history = []; shapes = {};
    remoteNames[0] = d.names?.[0] || '';
    $('#gravity').value = st.gravity ? '1' : '0';
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    if (over) { render(false); showResult(); $('#result').hidden = false; } else render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    const bad = !d || d.n !== st.moves || st.turn === mySeat() || !Q3.canPlay(st, d.i);
    if (bad) return s.host ? sendState() : s.send('resync');
    play(d.i);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) { starter = 1; wins = [0, 0]; newGame(); }
  else render(false);
}

function localMove(i) {
  const n = st.moves;
  if (!play(i)) return;
  if (online()) sess.send('move', { i, n });
}

// ---------- input ----------
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  for (let z = 0; z < 4; z++) {
    const [lx, ly] = layerXY(z);
    const x = Math.floor((p.x - lx) / C), y = Math.floor((p.y - ly) / C);
    if (x >= 0 && x < 4 && y >= 0 && y < 4) return Q3.idx(x, y, z);
  }
  return -1;
}
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const i = canMove() ? cellAt(evt) : -1;
  renderHover(i >= 0 && Q3.canPlay(st, i) ? i : -1);
});
svg.addEventListener('pointerleave', () => renderHover(-1));
svg.addEventListener('click', (evt) => {
  if (over && peek) { peek = false; $('#result').hidden = false; renderPlayers(); return; }
  if (!canMove()) return;
  const i = cellAt(evt);
  if (i >= 0 && Q3.canPlay(st, i)) localMove(i);
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#gravity').addEventListener('change', (e) => { cfg.gravity = e.target.value === '1'; saveCfg(); restart(); });
$('#hints').addEventListener('change', (e) => { cfg.hints = e.target.value === '1'; saveCfg(); render(false); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
// Tap the dimmed board around the result card to hide it and look at the final position;
// the status line then keeps the result, and tapping the board brings the card back.
$('#result').addEventListener('click', (e) => {
  if (e.target.closest('.result-card')) return;
  $('#result').hidden = true;
  peek = true;
  renderPlayers();
});
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    render(false);
    if (over) showResult();
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) showResult(); });

// ---------- rules illustration: four layers stacked into a cube, with a line piercing them ----------
function howPic() {
  const ink = PALETTE.ink;
  let s = '';
  const slab = (k) => {
    const y = 14 + k * 26, x = 40;
    return `M${x + 30} ${y} L${x + 150} ${y} L${x + 120} ${y + 22} L${x} ${y + 22} Z`;
  };
  for (let k = 0; k < 4; k++) {
    const fill = k === 0 ? PALETTE.blue.fill : k === 3 ? PALETTE.red.fill : 'var(--card)';
    s += `<path d="${slab(k)}" fill="${fill}" fill-opacity=".45" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`;
    s += `<text x="210" y="${30 + k * 26}" class="lbl">${k + 1}</text>`;
  }
  // a diagonal four: one X per layer, shifting right
  const pts = [0, 1, 2, 3].map((k) => [85 + k * 30, 25 + k * 26]);
  pts.forEach(([x, y], k) => {
    const xx = x - k * 7;
    s += `<path d="M${xx - 6} ${y - 5}l12 10M${xx + 6} ${y - 5}l-12 10" stroke="${PALETTE.blue.main}" stroke-width="3.2" stroke-linecap="round"/>`;
  });
  s += `<path d="M${pts[0][0] - 2} ${pts[0][1] - 10} L${pts[3][0] - 19} ${pts[3][1] + 10}" stroke="${PALETTE.blue.text}" stroke-width="1.6" stroke-dasharray="4 4" fill="none"/>`;
  $('#how-pic').innerHTML = `<svg viewBox="0 0 240 124">${s}</svg>`;
}

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
howPic();
$('#mode').value = cfg.mode;
$('#gravity').value = cfg.gravity ? '1' : '0';
$('#hints').value = cfg.hints ? '1' : '0';
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; wins = [0, 0]; starter = 1; newGame(); },
});
if (!online()) showOnce('how', SLUG);
