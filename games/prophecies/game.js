import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { PRO } from './engine.js';
import './strings.js';

const SLUG = 'prophecies';
const STORE = 'mg-' + SLUG;
const S = 60, M = 6, HM = 40;           // cell size, outer margin, hint margin (right + bottom)
const COLORS = [PALETTE.blue, PALETTE.red];
const SIZES = ['4x4', '4x5', '5x5', '5x6', '6x6', '7x7', '8x8'];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: '5x5', mode: 'pvp', variant: 'classic', hints: '1', names: ['', ''] },
  JSON.parse(localStorage.getItem(STORE) || '{}'));
if (!SIZES.includes(cfg.size)) cfg.size = '5x5';
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));
const dims = (size) => size.split('x').map(Number);

let match = { game: 0 };               // games started in this session: the first player alternates
let st, history, shapes, over, aiTimer, selCell = -1;
let sess = null;                       // online session (shared/net.js), null when playing locally
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
function name(p) {
  if (isAI(p)) return t('pro.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('pro.p' + p);
}

// ---------- geometry ----------
const boardW = () => M + st.C * S + HM;
const boardH = () => M + st.R * S + HM;
const cellXY = (i) => [M + (i % st.C) * S + S / 2, M + Math.floor(i / st.C) * S + S / 2];
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  return r >= 0 && r < st.R && c >= 0 && c < st.C ? r * st.C + c : -1;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- drawing ----------
function xMark(cx, cy, key, color, w, r = S * 0.3) {
  const a = shapeFor(key + 'a', () => line(cx - r, cy - r, cx + r, cy + r, 1.8));
  const b = shapeFor(key + 'b', () => line(cx + r, cy - r, cx - r, cy + r, 1.8));
  return `<path d="${a}" stroke="${color}" stroke-width="${w}"/><path d="${b}" stroke="${color}" stroke-width="${w}"/>`;
}

function render(animateLast) {
  const W = boardW(), H = boardH();
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.setProperty('--ar', (W / H).toFixed(3));
  const sc = over ? PRO.score(st) : null;
  const hits = new Set(sc ? sc.lines.filter((l) => l.hit >= 0).map((l) => l.hit) : []);
  const last = st.last;
  let out = '';

  // row/column of the selected cell, last move, selection
  if (selCell >= 0) {
    const r = Math.floor(selCell / st.C), c = selCell % st.C;
    out += `<rect class="band" x="${M}" y="${M + r * S}" width="${st.C * S}" height="${S}"/>`;
    out += `<rect class="band" x="${M + c * S}" y="${M}" width="${S}" height="${st.R * S}"/>`;
  }
  if (last && !over) {
    const [x, y] = cellXY(last.i);
    out += `<rect class="last" x="${x - S / 2 + 3}" y="${y - S / 2 + 3}" width="${S - 6}" height="${S - 6}" rx="7"/>`;
  }
  if (selCell >= 0) {
    const [x, y] = cellXY(selCell);
    out += `<rect class="sel" x="${x - S / 2 + 3}" y="${y - S / 2 + 3}" width="${S - 6}" height="${S - 6}" rx="7" style="fill:${COLORS[st.turn].fill};stroke:${COLORS[st.turn].main}"/>`;
  }

  // grid
  const x0 = M, y0 = M, x1 = M + st.C * S, y1 = M + st.R * S;
  for (let r = 0; r <= st.R; r++) {
    const y = M + r * S, outer = r === 0 || r === st.R;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gh' + r, () => line(x0 - 2, y, x1 + 2, y, 1.6))}"/>`;
  }
  for (let c = 0; c <= st.C; c++) {
    const x = M + c * S, outer = c === 0 || c === st.C;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gv' + c, () => line(x, y0 - 2, x, y1 + 2, 1.6))}"/>`;
  }

  // marks
  for (let i = 0; i < st.cells.length; i++) {
    const v = st.cells[i];
    if (!v) continue;
    const [x, y] = cellXY(i);
    const fresh = animateLast && last && (last.i === i || last.auto.includes(i)) ? ' fresh' : '';
    const own = st.owner[i];
    if (v === PRO.X) {
      const auto = own < 0;
      out += `<g class="xm${auto ? ' auto' : ''}${fresh}" style="transform-origin:${x}px ${y}px">${xMark(x, y, 'x' + i, auto ? PALETTE.pencil : COLORS[own].main, auto ? 3 : 4.5, auto ? S * 0.36 : S * 0.27)}</g>`;
      continue;
    }
    const rot = shapeFor('r' + i, () => (Math.random() * 2 - 1) * 7);
    const dim = over ? !hits.has(i) : !PRO.alive(st, i);
    out += `<g class="pop${fresh}" style="transform-origin:${x}px ${y}px"><text class="num${dim ? ' dead' : ''}" x="${x}" y="${y + 2}" fill="${COLORS[own].main}" transform="rotate(${rot.toFixed(1)} ${x} ${y})">${v}</text></g>`;
    if (over && hits.has(i)) {
      out += `<path class="ring${animateLast ? ' fresh' : ''}" d="${shapeFor('o' + i, () => circle(x, y + 1, S * 0.38, S * 0.4, 0.06))}" stroke="${COLORS[own].main}" pathLength="1"/>`;
    }
  }

  // edge hints: how many numbers (or X's) each line can still end with; final counts when over
  const showHints = over || cfg.hints === '1';
  if (showHints) {
    const lines = PRO.lines(st);
    lines.forEach((L, k) => {
      const hx = L.kind === 'r' ? x1 + HM / 2 + 1 : M + L.idx * S + S / 2;
      const hy = L.kind === 'r' ? M + L.idx * S + S / 2 : y1 + HM / 2;
      let txt, color = 'var(--pro-hint)', cls = 'hint';
      if (over) {
        const info = sc.lines[k];
        if (info.owner >= 0) { txt = '+' + info.count; color = COLORS[info.owner].main; cls += ' won'; }
        else txt = String(info.count);
      } else {
        const [lo, hi] = PRO.lineRange(st, L);
        if (L.cells.every((i) => st.cells[i] === 0)) return; // untouched line: nothing to say yet
        txt = lo === hi ? String(lo) : `${lo}–${hi}`;
        if (lo === hi) cls += ' fixed';
      }
      out += `<text class="${cls}" x="${hx}" y="${hy}" fill="${color}">${txt}</text>`;
    });
  }

  out += `<rect class="hover" id="hover" x="0" y="0" width="${S - 6}" height="${S - 6}" rx="7" visibility="hidden"/>`;
  svg.innerHTML = out;
  renderPlayers();
  renderPicker();
}

function renderPicker() {
  const pk = $('#picker');
  const active = canMove() && selCell >= 0;
  const ok = new Set(active ? PRO.legalValues(st, selCell) : []);
  const col = COLORS[st.turn].main;
  let html = '';
  for (let v = 1; v <= PRO.maxValue(st); v++) {
    html += `<button class="pick" data-v="${v}" style="--c:${col}" ${ok.has(v) ? '' : 'disabled'}>${v}</button>`;
  }
  const xs = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M10 10 L30 30 M30 10 L10 30" stroke="${active ? col : PALETTE.ink}" stroke-width="4.5" stroke-linecap="round" fill="none"/></svg>`;
  html += `<button class="pick px" data-v="-1" style="--c:${col}" aria-label="X" ${active ? '' : 'disabled'}>${xs}</button>`;
  pk.innerHTML = html;
  pk.classList.toggle('armed', active);
}

function renderPlayers() {
  const sc = over ? PRO.score(st) : null;
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 23 + p * 37,
    });
    const preds = st.owner.filter((o, i) => o === p && st.cells[i] > 0).length;
    el.querySelector('.score').textContent = over ? plural(sc.pts[p], 'pro.pts') : plural(preds, 'pro.preds');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) {
    const { pts } = PRO.score(st);
    status.textContent = $('#result').hidden ? t('pro.final', { a: pts[0], b: pts[1] }) : '';
    status.style.color = 'var(--ink)';
    return renderButtons();
  }
  if (online() && !sess.connected) status.textContent = t('pro.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? (selCell >= 0 ? t('pro.pickval') : t('pro.turn.you')) : t('pro.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('pro.thinking', { name: name(st.turn) });
  else status.textContent = selCell >= 0 ? t('pro.pickval') : t('pro.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;
  renderButtons();
}

function renderButtons() {
  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#variant').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('pro.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('pro.online.note') : '';
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
  const [R, C] = dims(cfg.size);
  st = PRO.create(R, C, { variant: cfg.variant, first: match.game % 2 });
  history = []; shapes = {}; over = false; selCell = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  const prev = PRO.clone(st);
  history.push(prev);
  const who = st.turn, other = 1 - who;
  PRO.apply(st, m);
  selCell = -1;
  if (PRO.isOver(st)) return finish(true);
  react(prev, m, who, other);
  render(true);
  maybeAI();
}

// Character reactions: broken prophecies, self-defeating ones, and big swings of the estimate.
function react(prev, m, who, other) {
  const lostOther = PRO.aliveCount(prev, other) - PRO.aliveCount(st, other);
  const selfDead = m.v > 0 && !PRO.alive(st, m.i);
  const lostOwn = PRO.aliveCount(prev, who) + (m.v > 0 ? 1 : 0) - PRO.aliveCount(st, who);
  const gain = PRO.evaluate(st, who) - PRO.evaluate(prev, who);
  if (lostOther > 0) {
    setMood(who, 'smug', 'wave'); setMood(other, 'sad');
    say(who, 'pro.say.kill');
    if (Math.random() < 0.5) setTimeout(() => !over && say(other, 'pro.say.hurt'), 800);
  } else if (selfDead || lostOwn > 0) {
    setMood(who, 'worried'); setMood(other, 'happy');
    say(who, 'pro.say.self');
    if (Math.random() < 0.4) setTimeout(() => !over && say(other, 'pro.say.thanks'), 800);
  } else if (gain > 2.5) {
    setMood(who, 'happy', gain > 5 ? 'up' : 'wave'); setMood(other, 'worried');
    if (m.v > 0 && Math.random() < 0.6) say(who, 'pro.say.true');
  } else if (gain < -2.5) {
    setMood(who, 'worried'); setMood(other, 'happy');
    if (Math.random() < 0.4) say(other, 'pro.say.thanks');
  } else {
    setMood(who, 'neutral');
    if (moods[other].mood !== 'smug') setMood(other, 'neutral');
  }
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    const m = PRO.aiMove(st, cfg.mode);
    if (m) play(m);
  }, 650);
}

// reveal = false only refreshes the texts (language/name change) and keeps a dismissed card hidden.
function finish(fresh, reveal = true) {
  over = true;
  selCell = -1;
  const { pts } = PRO.score(st);
  const [a, b] = pts;
  const w = a === b ? -1 : a > b ? 0 : 1;
  if (w < 0) {
    setMood(0, 'worried'); setMood(1, 'worried');
    if (fresh) say(0, 'pro.say.tie');
  } else {
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
    if (fresh) { say(w, 'pro.say.win'); setTimeout(() => over && say(1 - w, 'pro.say.lose'), 900); }
  }
  render(fresh);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('pro.tie') : t('pro.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').innerHTML = `<span style="color:${COLORS[0].main}">${a}</span> : <span style="color:${COLORS[1].main}">${b}</span>`;
  $('#result-next').textContent = t('pro.next', { name: name((match.game + 1) % 2) });
  if (reveal) setTimeout(() => { if (over) { $('#result').hidden = false; renderPlayers(); } }, fresh ? 1500 : 0);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; selCell = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart or change board/rules; the guest follows.
function restart(next) {
  if (!canRestart()) return;
  if (next) match.game++;
  newGame();
  if (online()) sendState('new');
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
function sendState(type = 'state') {
  sess.send(type, { st, over, match, size: cfg.size, variant: cfg.variant, names: cfg.names });
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
    st = d.st; over = d.over; match = d.match; history = []; shapes = {}; selCell = -1;
    if (SIZES.includes(d.size)) { cfg.size = d.size; $('#size').value = d.size; }
    cfg.variant = d.variant; $('#variant').value = d.variant;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish(false) : render(false);
  };
  s.on('state', receive);
  s.on('new', receive);
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); if (over) finish(false, false); });
  s.on('move', (d) => {
    if (d.n !== st.moves || isLocal(st.turn) || !PRO.legal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) { match = { game: 0 }; newGame(); }
  else render(false);
}

function localMove(m) {
  if (!canMove() || !PRO.legal(st, m)) return;
  if (online()) sess.send('move', { m, n: st.moves });
  play(m);
}

// ---------- input ----------
function select(i) {
  selCell = i;
  render(false);
}
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const i = cellAt(evt);
  if (i < 0 || st.cells[i] !== 0) return select(-1);
  select(selCell === i ? -1 : i);
});
svg.addEventListener('pointermove', (evt) => {
  const h = svg.querySelector('#hover');
  if (!h) return;
  const i = evt.pointerType === 'mouse' && canMove() ? cellAt(evt) : -1;
  if (i < 0 || st.cells[i] !== 0 || i === selCell) { h.setAttribute('visibility', 'hidden'); svg.style.cursor = ''; return; }
  const [x, y] = cellXY(i);
  h.setAttribute('x', x - S / 2 + 3); h.setAttribute('y', y - S / 2 + 3);
  h.setAttribute('visibility', 'visible');
  svg.style.cursor = 'pointer';
});
svg.addEventListener('pointerleave', () => svg.querySelector('#hover')?.setAttribute('visibility', 'hidden'));
$('#picker').addEventListener('click', (e) => {
  const b = e.target.closest('.pick');
  if (!b || b.disabled || selCell < 0) return;
  localMove({ i: selCell, v: +b.dataset.v });
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, select, textarea') || document.querySelector('dialog[open]') || !canMove()) return;
  if (e.key === 'Escape' && selCell >= 0) return select(-1);
  if (selCell < 0) return;
  const k = e.key.toLowerCase();
  if (k === 'x' || k === 'х' || k === '0') localMove({ i: selCell, v: PRO.X });
  else if (/^[1-9]$/.test(k)) localMove({ i: selCell, v: +k });
});

const settingRestart = () => { if (canRestart()) { match = { game: 0 }; newGame(); if (online()) sendState('new'); } };
$('#size').addEventListener('change', (e) => { cfg.size = e.target.value; saveCfg(); settingRestart(); });
$('#variant').addEventListener('change', (e) => { cfg.variant = e.target.value; saveCfg(); settingRestart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); match = { game: 0 }; newGame(); });
$('#hints').addEventListener('change', (e) => { cfg.hints = e.target.value; saveCfg(); render(false); });
$('#new').addEventListener('click', () => restart(over));
$('#again').addEventListener('click', () => restart(true));
$('#undo').addEventListener('click', undo);
// tap beside the result card to study the final board; the status line keeps the score
$('#result').addEventListener('click', (e) => { if (e.target.id === 'result') { $('#result').hidden = true; renderPlayers(); } });
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    renderPlayers();
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) finish(false, false); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
$('#variant').value = cfg.variant;
$('#hints').value = cfg.hints;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; match = { game: 0 }; newGame(); },
});
if (!online()) showOnce('how', SLUG);
