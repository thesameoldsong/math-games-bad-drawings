import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { OAC } from './engine.js';
import './strings.js';

const SLUG = 'order-and-chaos';
const STORE = 'mg-' + SLUG;
const N = OAC.N, S = 60, M = 8;            // cell size, margin
const W = M * 2 + N * S;
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', first: 0, jewels: 0, names: ['', ''] }, JSON.parse(localStorage.getItem(STORE) || '{}'));
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));

// match: points per seat and how many games were started (sides swap every game)
let match = { score: [0, 0], game: 0 };
let st, history, shapes, over, aiTimer, hoverCell = -1;
let sel = 'X';                        // symbol chosen in the picker
let sess = null;                      // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const orderSeat = () => (cfg.first + match.game) % 2;
const seatOf = (role) => (role === 0 ? orderSeat() : 1 - orderSeat());
const roleOf = (seat) => (seat === orderSeat() ? 0 : 1);
const turnSeat = () => seatOf(st.turn);
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(turnSeat()) && (!online() || sess.connected);
const canRestart = () => !online() || sess.host;
function name(p) {
  if (isAI(p)) return t('oac.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('oac.p' + p);
}

// ---------- geometry ----------
const cellXY = (i) => [M + (i % N) * S + S / 2, M + Math.floor(i / N) * S + S / 2];
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  return r >= 0 && r < N && c >= 0 && c < N ? r * N + c : -1;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- drawing ----------
function symbolSVG(sym, cx, cy, color, key, cls = '') {
  const r = S * 0.3;
  const P = (d, w = 6) => `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const x1 = () => line(cx - r, cy - r, cx + r, cy + r, 2.2), x2 = () => line(cx + r, cy - r, cx - r, cy + r, 2.2);
  let s = '';
  if (sym === 'X') s = P(shapeFor(key + 'a', x1)) + P(shapeFor(key + 'b', x2));
  else if (sym === 'O') s = P(shapeFor(key + 'o', () => circle(cx, cy, r * 1.02, r * 1.08, 0.06)));
  else if (sym === 'W') {
    const rr = r * 0.62;
    s = P(shapeFor(key + 'o', () => circle(cx, cy, r * 1.12, r * 1.15, 0.05)), 5)
      + P(shapeFor(key + 'a', () => line(cx - rr, cy - rr, cx + rr, cy + rr, 1.4)), 5)
      + P(shapeFor(key + 'b', () => line(cx + rr, cy - rr, cx - rr, cy + rr, 1.4)), 5);
  } else if (sym === 'B') {
    const q = r * 0.95;
    const d = shapeFor(key + 'q', () => `${line(cx - q, cy - q, cx + q, cy - q, 1.2)} ${line(cx + q, cy - q, cx + q, cy + q, 1.2).replace('M', 'L')} ${line(cx + q, cy + q, cx - q, cy + q, 1.2).replace('M', 'L')} ${line(cx - q, cy + q, cx - q, cy - q, 1.2).replace('M', 'L')}`);
    s = `<path d="${d}" fill="${color}" filter="url(#mg-crayon)"/>` + P(d, 4);
  }
  return `<g class="sym ${cls}" style="transform-origin:${cx}px ${cy}px">${s}</g>`;
}

function render(animateLast) {
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';
  // grid
  for (let k = 0; k <= N; k++) {
    const a = M + k * S, outer = k === 0 || k === N;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gh' + k, () => line(M, a, W - M, a, 1.6))}"/>`;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gv' + k, () => line(a, M, a, W - M, 1.6))}"/>`;
  }
  // last-move highlight
  if (st.last) {
    const [x, y] = cellXY(st.last.i);
    out += `<rect class="last" x="${x - S / 2 + 4}" y="${y - S / 2 + 4}" width="${S - 8}" height="${S - 8}" rx="8"/>`;
  }
  // marks
  for (let i = 0; i < N * N; i++) {
    const v = st.cells[i];
    if (!v) continue;
    const [x, y] = cellXY(i);
    const col = v === 'B' ? PALETTE.ink : COLORS[seatOf(st.by[i])].main;
    const fresh = animateLast && st.last && st.last.i === i;
    out += symbolSVG(v, x, y, col, 'c' + i, fresh ? 'fresh' : '');
  }
  // winning five
  if (st.line) {
    const [a, b] = [cellXY(st.line[0]), cellXY(st.line[st.line.length - 1])];
    const dx = Math.sign(b[0] - a[0]) * S * 0.32, dy = Math.sign(b[1] - a[1]) * S * 0.32;
    const d = shapeFor('win', () => line(a[0] - dx, a[1] - dy, b[0] + dx, b[1] + dy, 3));
    out += `<path class="winline${animateLast ? ' fresh' : ''}" d="${d}" pathLength="1"/>`;
  }
  out += '<g id="ghost"></g>';
  svg.innerHTML = out;
  hoverCell = -1;
  renderPlayers();
  renderPicker();
}

function renderGhost(i) {
  const g = svg.querySelector('#ghost');
  if (!g) return;
  if (i < 0) { g.innerHTML = ''; return; }
  const [x, y] = cellXY(i);
  const col = sel === 'B' ? PALETTE.ink : COLORS[turnSeat()].main;
  g.innerHTML = symbolSVG(sel, x, y, col, 'ghost' + sel, 'ghost');
}

function renderPicker() {
  const syms = ['X', 'O'];
  if (st.jewelsOn) {
    syms.push(st.turn === 0 ? 'W' : 'B');
  }
  const avail = OAC.symbols(st);
  if (!avail.includes(sel)) sel = 'X';
  const col = COLORS[turnSeat()].main;
  const active = canMove();
  $('#picker').innerHTML = syms.map((sym) => {
    const ok = active && avail.includes(sym);
    const cap = sym === 'W' || sym === 'B' ? `<span class="cap">${t('oac.sym.' + sym)}</span>` : '';
    return `<button class="pick${sym === sel && ok ? ' on' : ''}" data-sym="${sym}" ${ok ? '' : 'disabled'} style="--c:${col}" aria-label="${sym}">
      <svg viewBox="${M + S * 0} ${M} ${S} ${S}">${symbolSVG(sym, M + S / 2, M + S / 2, sym === 'B' ? PALETTE.ink : col, 'pick' + sym)}</svg>${cap}</button>`;
  }).join('');
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && turnSeat() === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    const role = roleOf(p);
    el.querySelector('.score').innerHTML = `<span class="role r${role}">${t('oac.role' + role)}</span> <span class="pts">${plural(match.score[p], 'oac.pts')}</span>`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const ts = turnSeat(), role = t('oac.role' + st.turn);
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('oac.online.wait');
  else if (online()) status.textContent = isLocal(ts) ? t('oac.turn.you', { role }) : t('oac.turn.them', { name: name(ts) });
  else if (isAI(ts)) status.textContent = t('oac.thinking', { name: name(ts) });
  else status.textContent = t('oac.turn', { name: name(ts), role });
  status.style.color = COLORS[ts].main;

  $('#undo').disabled = online() || !history.length || isAI(ts);
  $('#mode').disabled = online();
  $('#first').disabled = !canRestart();
  $('#jewels').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('oac.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('oac.online.note') : '';
  for (const o of $('#first').options) o.textContent = name(+o.value);
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
function newGame() {
  clearTimeout(aiTimer);
  st = OAC.create({ jewels: !!+cfg.jewels });
  history = []; shapes = {}; over = false; sel = 'X';
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}
function newMatch() { match = { score: [0, 0], game: 0 }; newGame(); }

// Threat summary for reactions: how many distinct squares would finish a five, and is any "unstoppable".
function danger(s) {
  const tr = OAC.threats(s.cells), cells = new Set(tr.map((x) => x.i));
  return { n: cells.size, fork: cells.size > 1 || (tr.length > cells.size && !s.jewels[1]) };
}

function play(m) {
  const prev = OAC.clone(st);
  history.push({ st: prev, score: match.score.slice() });
  const role = st.turn, who = seatOf(role), other = 1 - who;
  OAC.apply(st, m);
  if (OAC.isOver(st)) {
    match.score[seatOf(st.winner)] += OAC.points(st);
    return finish(true);
  }
  const before = danger(prev), after = danger(st);
  const runB = OAC.bestRun(prev), runA = OAC.bestRun(st);
  if (m.sym === 'W' || m.sym === 'B') { setMood(who, 'smug', 'wave'); say(who, m.sym === 'W' ? 'oac.say.jewelW' : 'oac.say.jewelB'); }
  else if (role === 0) {
    if (after.fork) { setMood(who, 'happy', 'up'); setMood(other, 'worried'); say(who, 'oac.say.fork'); say(other, 'oac.say.worried'); }
    else if (after.n > before.n || (runA >= 4 && runA > runB)) {
      setMood(who, 'happy', 'wave'); setMood(other, 'worried');
      if (Math.random() < 0.6) say(who, 'oac.say.threat');
    } else { setMood(who, 'neutral'); if (moods[other].mood !== 'smug') setMood(other, 'neutral'); }
  } else {
    if (after.n > before.n) { setMood(other, 'happy', 'wave'); setMood(who, 'worried'); say(other, 'oac.say.oops'); }
    else if (before.n > 0 && after.n < before.n) { setMood(who, 'smug'); setMood(other, 'sad'); say(who, 'oac.say.block'); if (Math.random() < 0.4) setTimeout(() => say(other, 'oac.say.sad'), 700); }
    else if (runA < runB && runB >= 3) { setMood(who, 'smug'); setMood(other, 'sad'); if (Math.random() < 0.5) say(who, 'oac.say.block'); }
    else { setMood(who, 'neutral'); if (moods[other].mood !== 'happy') setMood(other, 'neutral'); }
  }
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(turnSeat())) return;
  aiTimer = setTimeout(() => {
    const m = OAC.aiMove(st, cfg.mode);
    if (m && !over && isAI(turnSeat())) play(m);
  }, 600);
}

function finish(fresh) {
  over = true;
  const w = seatOf(st.winner), pts = OAC.points(st);
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  if (fresh) {
    say(w, st.winner === 0 ? 'oac.say.win' : 'oac.say.winChaos');
    setTimeout(() => over && say(1 - w, 'oac.say.lose'), 900);
  }
  render(fresh);
  const txt = $('#result-text');
  txt.textContent = t('oac.win', { name: name(w) });
  $('#result-why').textContent = t(st.winner === 0 ? 'oac.why.order' : 'oac.why.chaos', { pts });
  txt.style.color = COLORS[w].main;
  $('#result-next').textContent = t('oac.next', { name: name(1 - orderSeat()) });
  setTimeout(() => { if (over) $('#result').hidden = false; }, fresh ? 1100 : 0);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  let h;
  do { h = history.pop(); st = h.st; } while (history.length && isAI(seatOf(st.turn)));
  match.score = h.score;
  over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
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
  sess.send(type, { st, over, match, first: cfg.first, jewels: cfg.jewels, names: cfg.names });
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
    st = d.st; over = d.over; match = d.match; history = []; shapes = {};
    cfg.first = d.first; cfg.jewels = d.jewels;
    $('#first').value = cfg.first; $('#jewels').value = cfg.jewels;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish(false) : render(false);
  };
  s.on('state', receive);
  s.on('new', receive);
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); if (over) finish(false); });
  s.on('move', (d) => {
    if (d.n !== st.moves || !OAC.legal(st, d.m) || isLocal(turnSeat())) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else render(false);
}

function localMove(m) {
  if (online()) sess.send('move', { m, n: st.moves });
  play(m);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  let i = canMove() ? cellAt(evt) : -1;
  if (i >= 0 && st.cells[i]) i = -1;
  if (i === hoverCell) return;
  hoverCell = i;
  renderGhost(i);
  svg.style.cursor = i >= 0 ? 'pointer' : '';
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; renderGhost(-1); });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const i = cellAt(evt);
  const m = { i, sym: sel };
  if (OAC.legal(st, m)) localMove(m);
});
$('#picker').addEventListener('click', (e) => {
  const b = e.target.closest('.pick');
  if (!b || b.disabled) return;
  sel = b.dataset.sym;
  renderPicker();
  if (hoverCell >= 0) renderGhost(hoverCell);
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || !canMove()) return;
  const k = e.key.toLowerCase();
  const map = { x: 'X', 'х': 'X', o: 'O', 'о': 'O', 0: 'O', j: OAC.symbols(st)[2] };
  if (map[k] && OAC.symbols(st).includes(map[k])) { sel = map[k]; renderPicker(); if (hoverCell >= 0) renderGhost(hoverCell); }
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newMatch(); });
$('#first').addEventListener('change', (e) => { cfg.first = +e.target.value; saveCfg(); if (canRestart()) { newMatch(); if (online()) sendState('new'); } });
$('#jewels').addEventListener('change', (e) => { cfg.jewels = +e.target.value; saveCfg(); if (canRestart()) { newMatch(); if (online()) sendState('new'); } });
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
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) finish(false); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#first').value = cfg.first;
$('#jewels').value = cfg.jewels;
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newMatch(); },
});
if (!online()) showOnce('how', SLUG);
