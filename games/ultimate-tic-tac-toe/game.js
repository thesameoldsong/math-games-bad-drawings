import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { UTTT } from './engine.js';
import './strings.js';

const SLUG = 'ultimate-tic-tac-toe';
const STORE = 'mg-' + SLUG;
const M = 8, B = 114, G = 12, C = B / 3, W = 2 * M + 3 * B + 2 * G; // margin, mini-board, gap, cell, total
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', names: ['', ''], win: 'line', shared: false }, JSON.parse(localStorage.getItem(STORE) || '{}'));
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));
const localRules = () => ({ win: cfg.win, shared: !!cfg.shared });

let st, history, shapes, over, aiTimer, hoverM = -1;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];       // names announced by the peer in online play
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('ut.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('ut.p' + p);
}

// ---------- geometry ----------
const boardXY = (b) => [M + (b % 3) * (B + G), M + ((b / 3) | 0) * (B + G)];
function cellXY(m) {
  const [x, y] = boardXY((m / 9) | 0), c = m % 9;
  return [x + (c % 3) * C + C / 2, y + ((c / 3) | 0) * C + C / 2];
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  if (p.x < 0 || p.y < 0 || p.x > W || p.y > W) return -1;
  const col = clamp(Math.floor((p.x - M + G / 2) / (B + G)), 0, 2), row = clamp(Math.floor((p.y - M + G / 2) / (B + G)), 0, 2);
  const b = row * 3 + col, [bx, by] = boardXY(b);
  const cc = clamp(Math.floor((p.x - bx) / C), 0, 2), cr = clamp(Math.floor((p.y - by) / C), 0, 2);
  return b * 9 + cr * 3 + cc;
}

// Every stroke gets its wobble once, so redraws don't jitter.
const shapeFor = (k, make) => (shapes[k] ??= make());
const xPath = (cx, cy, r) => line(cx - r, cy - r, cx + r, cy + r, r * 0.12) + ' ' + line(cx + r, cy - r, cx - r, cy + r, r * 0.12);
const oPath = (cx, cy, r) => circle(cx, cy, r, r * 1.04, 0.06);
const markPath = (p, cx, cy, r) => (p === 0 ? xPath(cx, cy, r * 0.92) : oPath(cx, cy, r));
const ends = (L, at, ext) => {
  const [x1, y1] = at(L[0]), [x2, y2] = at(L[2]);
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  return [x1 - (dx / len) * ext, y1 - (dy / len) * ext, x2 + (dx / len) * ext, y2 + (dy / len) * ext];
};

// ---------- rendering ----------
function render(animateLast) {
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';
  const tg = over ? [] : UTTT.targets(st);
  const col = COLORS[st.turn];
  const free = tg.length > 1;
  for (const b of tg) {
    const [x, y] = boardXY(b);
    out += `<rect class="target${free ? ' free' : ''}" data-b="${b}" x="${x - 4}" y="${y - 4}" width="${B + 8}" height="${B + 8}" rx="12" fill="${col.fill}"/>`;
  }
  if (st.last >= 0) {
    const [cx, cy] = cellXY(st.last);
    out += `<rect class="lastbg" x="${cx - C / 2 + 3}" y="${cy - C / 2 + 3}" width="${C - 6}" height="${C - 6}" rx="7"/>`;
  }

  // big grid
  for (const k of [1, 2]) {
    const g = M + k * B + (k - .5) * G;
    out += `<path class="grid big" d="${shapeFor('gv' + k, () => line(g, M - 2, g, W - M + 2, 3))}"/>`;
    out += `<path class="grid big" d="${shapeFor('gh' + k, () => line(M - 2, g, W - M + 2, g, 3))}"/>`;
  }

  for (let b = 0; b < 9; b++) {
    const [x, y] = boardXY(b), owner = st.boards[b];
    out += `<g class="mini${owner >= 0 ? ' closed' : ''}${owner === 2 ? ' dead' : ''}">`;
    for (const k of [1, 2]) {
      out += `<path class="grid" d="${shapeFor(`v${b}_${k}`, () => line(x + k * C, y + 5, x + k * C, y + B - 5, 1.6))}"/>`;
      out += `<path class="grid" d="${shapeFor(`h${b}_${k}`, () => line(x + 5, y + k * C, x + B - 5, y + k * C, 1.6))}"/>`;
    }
    for (let c = 0; c < 9; c++) {
      const m = b * 9 + c, p = st.cells[m];
      if (p < 0) continue;
      const [cx, cy] = cellXY(m);
      const fresh = animateLast && m === st.last;
      out += `<path class="mark${fresh ? ' fresh' : ''}" data-m="${m}" data-p="${p}" d="${shapeFor('m' + m, () => markPath(p, cx, cy, C * 0.3))}" stroke="${COLORS[p].main}" pathLength="1"/>`;
    }
    const L = st.boardLines[b];
    if (L) {
      const [a1, a2, b1, b2] = ends(L, (c) => cellXY(b * 9 + c), 10);
      out += `<path class="miniline" d="${shapeFor('ml' + b, () => line(a1, a2, b1, b2, 2))}" stroke="${COLORS[owner].dark}"/>`;
    }
    out += '</g>';
    if (owner === 0 || owner === 1) {
      const fresh = animateLast && ((st.last / 9) | 0) === b;
      const cx = x + B / 2, cy = y + B / 2;
      out += `<path class="bigmark${fresh ? ' fresh' : ''}" d="${shapeFor('bm' + b, () => markPath(owner, cx, cy, B * 0.38))}" stroke="${COLORS[owner].main}" pathLength="1"/>`;
    }
  }

  if (st.line) {
    const [a1, a2, b1, b2] = ends(st.line, (b) => { const [x, y] = boardXY(b); return [x + B / 2, y + B / 2]; }, 40);
    out += `<path class="winline${animateLast ? ' fresh' : ''}" d="${shapeFor('win', () => line(a1, a2, b1, b2, 5))}" stroke="${COLORS[st.winner].dark}" pathLength="1"/>`;
  }

  out += `<path id="preview" class="preview" d=""/>`;
  svg.innerHTML = out;
  hoverM = -1;
  renderPlayers();
}

const miniMark = (p) =>
  `<svg class="mk" viewBox="0 0 20 20" aria-hidden="true"><path d="${p === 0 ? 'M4 4 L16 16 M16 4 L4 16' : 'M10 3.5a6.5 6.5 0 1 0 .1 0'}" stroke="${COLORS[p].main}"/></svg>`;

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 11 + p * 31,
    });
    el.querySelector('.score').innerHTML = miniMark(p) + ' ' + plural(UTTT.count(st, p), 'ut.boards');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const any = UTTT.targets(st).length > 1;
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('ut.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t(any ? 'ut.turn.you.any' : 'ut.turn.you.here') : t('ut.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('ut.thinking', { name: name(st.turn) });
  else status.textContent = t(st.moves === 0 ? 'ut.turn.first' : any ? 'ut.turn.any' : 'ut.turn.here', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#win').disabled = !canRestart();
  $('#shared').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('ut.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('ut.online.note') : '';
  syncRuleInputs();
}

// The rule pickers show the rules of the game on the board (the host's, when online).
function syncRuleInputs() {
  const r = st ? st.rules : localRules();
  $('#win').value = r.win;
  $('#shared').value = r.shared ? '1' : '0';
  $('#shared-field').hidden = r.win !== 'line';
  $('#win-hint').textContent = t(`ut.win.${r.win}.hint`);
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1800);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame(rules = localRules()) {
  clearTimeout(aiTimer);
  st = UTTT.create(rules);
  history = []; shapes = {}; over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Two boards of a meta-line already mine and the third still open?
function hasThreat(s, p) {
  if (s.rules.win !== 'line') return false;
  return UTTT.LINES.some((L) => {
    const mine = L.filter((b) => s.boards[b] === p || (s.rules.shared && s.boards[b] === 2)).length;
    return mine === 2 && L.some((b) => s.boards[b] === -1);
  });
}

function play(m) {
  const prev = UTTT.clone(st);
  history.push(prev);
  const who = st.turn, other = 1 - who;
  const res = UTTT.apply(st, m);
  if (UTTT.isOver(st)) return finish();

  setMood(who, 'neutral'); setMood(other, 'neutral');
  let spoke = false;
  if (res === who) {
    const threat = hasThreat(st, who) && !hasThreat(prev, who);
    setMood(who, threat ? 'smug' : 'happy', 'wave');
    setMood(other, threat ? 'worried' : 'sad');
    say(who, threat ? 'ut.say.threat' : 'ut.say.board');
    if (Math.random() < 0.5) setTimeout(() => say(other, 'ut.say.lostboard'), 700);
    spoke = true;
  } else if (res === 2 && Math.random() < 0.5) {
    setMood(who, 'worried');
    say(who, 'ut.say.dead');
    spoke = true;
  }
  // Where did the mover send the opponent?
  if (st.next < 0) {
    setMood(other, 'smug', 'up');
    if (!spoke || Math.random() < 0.4) setTimeout(() => say(other, 'ut.say.free'), spoke ? 900 : 0);
  } else if (UTTT.boardWinningCells(st, st.next, other).length && res !== who) {
    setMood(other, 'smug');
    if (moods[who].mood === 'neutral') setMood(who, 'worried');
    if (!spoke && Math.random() < 0.35) say(who, 'ut.say.oops');
  }
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    play(UTTT.aiMove(st, cfg.mode));
  }, 550);
}

function finish() {
  over = true;
  const w = st.winner;
  if (w === 2) { setMood(0, 'worried'); setMood(1, 'worried'); say(0, 'ut.say.tie'); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'ut.say.win'); setTimeout(() => say(1 - w, 'ut.say.lose'), 900); }
  render(true);
  fillResult();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1000);
}

function fillResult() {
  const w = st.winner;
  const [a, b] = [UTTT.count(st, 0), UTTT.count(st, 1)];
  const txt = $('#result-text');
  txt.textContent = w === 2 ? t('ut.tie') : t('ut.win.text', { name: name(w) });
  txt.style.color = w === 2 ? 'var(--ink)' : COLORS[w].main;
  let sub = t('ut.score', { a, b });
  if (w === 2 && st.rules.win === 'line') sub = (st.boards.includes(-1) ? t('ut.tie.stuck') : t('ut.tie.full')) + ' ' + sub;
  $('#result-sub').textContent = sub;
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and change rules); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sess.send('new', { rules: st.rules });
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
const sendState = () => sess.send('state', { st, over, names: cfg.names });
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => { if (sess === s) renderPlayers(); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host || sess !== s) return;
    st = d.st; over = d.over; history = []; shapes = {};
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.moves || !UTTT.isLegal(st, d.m) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => { if (!s.host) newGame(d.rules); });
  if (s.host) newGame();
  else render(false);
}

function localMove(m) {
  if (!canMove() || !UTTT.isLegal(st, m)) return;
  if (online()) sess.send('move', { m, n: st.moves });
  play(m);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  let m = canMove() ? cellAt(evt) : -1;
  if (m >= 0 && !UTTT.isLegal(st, m)) m = -1;
  if (m === hoverM) return;
  hoverM = m;
  const pv = svg.querySelector('#preview');
  if (m < 0) { pv.setAttribute('d', ''); svg.style.cursor = ''; return; }
  const [cx, cy] = cellXY(m);
  pv.setAttribute('d', st.turn === 0 ? `M${cx - 9} ${cy - 9} L${cx + 9} ${cy + 9} M${cx + 9} ${cy - 9} L${cx - 9} ${cy + 9}` : `M${cx} ${cy - 11} a11 11 0 1 0 .1 0`);
  pv.setAttribute('stroke', COLORS[st.turn].main);
  svg.style.cursor = 'pointer';
});
svg.addEventListener('pointerleave', () => { hoverM = -1; svg.querySelector('#preview')?.setAttribute('d', ''); });
svg.addEventListener('click', (evt) => {
  const m = cellAt(evt);
  if (m >= 0) localMove(m);
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#win').addEventListener('change', (e) => { if (!canRestart()) return; cfg.win = e.target.value; saveCfg(); restart(); });
$('#shared').addEventListener('change', (e) => { if (!canRestart()) return; cfg.shared = e.target.value === '1'; saveCfg(); restart(); });
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
document.addEventListener('mg:lang', () => { render(false); if (over) fillResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
