import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { JAM } from './engine.js';
import './strings.js';

const SLUG = 'jam';
const STORE = 'mg-' + SLUG;
const W = 360, R = 29;                     // board width, number circle radius
const COLORS = [PALETTE.blue, PALETTE.red];
// digit colour on a filled hand chip (dark ink in both themes, see style.css)
const ON_FILL = ['var(--jam-on-blue)', 'var(--jam-on-red)'];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', first: 0, layout: 'line', hints: 0, names: ['', ''] }, JSON.parse(localStorage.getItem(STORE) || '{}'));
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));

let match = { score: [0, 0], game: 0 };   // wins per seat, games started (first move alternates)
let st, history, shapes, over, aiTimer, hoverNum = 0;
let sess = null;                           // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const firstSeat = (g = match.game) => (cfg.first + g) % 2;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
const canRestart = () => !online() || sess.host;
function name(p) {
  if (isAI(p)) return t('jam.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('jam.p' + p);
}

// ---------- geometry ----------
// Where each number sits: two rows (1–5, 6–9) or the 3 × 3 magic square.
const GRID = 78;
const MAGIC_X0 = (W - GRID * 3) / 2, MAGIC_Y0 = 6;
function pos(n) {
  if (cfg.layout === 'magic') {
    const i = JAM.MAGIC.indexOf(n);
    return [MAGIC_X0 + (i % 3) * GRID + GRID / 2, MAGIC_Y0 + Math.floor(i / 3) * GRID + GRID / 2];
  }
  return n <= 5 ? [36 + (n - 1) * 72, 40] : [72 + (n - 6) * 72, 110];
}
const poolH = () => (cfg.layout === 'magic' ? MAGIC_Y0 + GRID * 3 + 6 : 146);
const svgPoint = (evt) => {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
};
function numAt(evt) {
  const p = svgPoint(evt);
  let best = 0, bd = R * 1.3;
  for (const n of JAM.NUMS) {
    const [x, y] = pos(n), d = Math.hypot(p.x - x, p.y - y);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- drawing ----------
function render(animateLast) {
  const ph = poolH(), handY = ph + 30, eqY = handY + 46, H = eqY + 22;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const L = cfg.layout;
  let out = '';

  // tic-tac-toe grid behind the magic square
  if (L === 'magic') {
    for (const k of [1, 2]) {
      const a = MAGIC_X0 + k * GRID, b = MAGIC_Y0 + k * GRID;
      out += `<path class="grid" d="${shapeFor('gv' + k, () => line(a, MAGIC_Y0 + 4, a, MAGIC_Y0 + GRID * 3 - 4, 1.8))}"/>`;
      out += `<path class="grid" d="${shapeFor('gh' + k, () => line(MAGIC_X0 + 4, b, MAGIC_X0 + GRID * 3 - 4, b, 1.8))}"/>`;
    }
  }

  const last = st.order[st.order.length - 1];
  const need = cfg.hints && !over ? [JAM.completers(st, 0), JAM.completers(st, 1)] : [[], []];
  const trio = st.trio || [];
  for (const n of JAM.NUMS) {
    const [x, y] = pos(n), o = st.owner[n], key = L + n;
    const ring = shapeFor('r' + key, () => circle(x, y, R, R * 1.04, 0.05));
    let cls = 'num' + (o < 0 ? ' free' : ' p' + o) + (trio.includes(n) ? ' win' : '');
    if (animateLast && n === last) cls += ' fresh';
    out += `<g class="${cls}" data-n="${n}" style="transform-origin:${x}px ${y}px">`;
    if (n === last && !over) out += `<circle class="last" cx="${x}" cy="${y}" r="${R + 7}"/>`;
    if (o >= 0) out += `<path d="${ring}" fill="${COLORS[o].fill}" filter="url(#mg-crayon)" class="fill"/>`;
    // hint marks: dashed halo in the colour of whoever this number would complete
    need.forEach((list, p) => {
      if (!list.includes(n)) return;
      const rr = R + 5 + p * 5;
      out += `<circle class="need" cx="${x}" cy="${y}" r="${rr}" stroke="${COLORS[p].main}"/>`;
    });
    out += `<path class="ring" d="${ring}" stroke="${o < 0 ? PALETTE.ink : COLORS[o].main}"/>`;
    out += `<text class="digit" x="${x}" y="${y + 1}" fill="${o < 0 ? PALETTE.ink : COLORS[o].text}">${n}</text>`;
    out += '</g>';
  }

  // winning line across the magic square
  if (st.trio && L === 'magic') {
    const pts = st.trio.map(pos);
    const idx = st.trio.map((n) => JAM.MAGIC.indexOf(n));
    // ends of the line are the two cells farthest apart
    let a = pts[0], b = pts[1], best = -1;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d > best) { best = d; a = pts[i]; b = pts[j]; }
    }
    const dx = Math.sign(b[0] - a[0]) * R * 0.9, dy = Math.sign(b[1] - a[1]) * R * 0.9;
    const d = shapeFor('win' + idx.join(), () => line(a[0] - dx, a[1] - dy, b[0] + dx, b[1] + dy, 3));
    out += `<path class="winline${animateLast ? ' fresh' : ''}" d="${d}" stroke="${COLORS[st.winner].main}" pathLength="1"/>`;
  }

  // the two hands: numbers each player owns, sorted, so the sums are easy to check
  out += `<path class="sep" d="${shapeFor('sep' + L, () => line(W / 2, ph + 8, W / 2, eqY - 12, 1.2))}"/>`;
  for (const p of [0, 1]) {
    const mine = JAM.numbersOf(st, p);
    const r = 14, step = 38, x0 = p === 0 ? W / 4 - ((mine.length - 1) * step) / 2 : (3 * W) / 4 - ((mine.length - 1) * step) / 2;
    if (!mine.length) out += `<text class="hand-empty" x="${p === 0 ? W / 4 : (3 * W) / 4}" y="${handY}" fill="${COLORS[p].main}">—</text>`;
    mine.forEach((n, i) => {
      const x = x0 + i * step, y = handY;
      const w = trio.includes(n) && st.winner === p;
      out += `<path class="chip${w ? ' win' : ''}" d="${shapeFor(`h${L}${p}_${n}_${i}_${mine.length}`, () => circle(x, y, r, r, 0.06))}" stroke="${COLORS[p].main}" fill="${w ? COLORS[p].fill : 'var(--card)'}"/>`;
      out += `<text class="chip-digit" x="${x}" y="${y + 1}" fill="${w ? ON_FILL[p] : COLORS[p].text}">${n}</text>`;
    });
  }
  if (st.trio) {
    out += `<text class="equation${animateLast ? ' fresh' : ''}" x="${W / 2}" y="${eqY}" fill="${COLORS[st.winner].main}">${st.trio.join(' + ')} = 15</text>`;
  } else if (cfg.hints && !over && (need[0].length || need[1].length)) {
    out += `<text class="legend" x="${W / 2}" y="${eqY}">◌ ${t('jam.legend.need')}</text>`;
  }
  out += '<g id="ghost"></g>';
  svg.innerHTML = out;
  hoverNum = 0;
  renderPlayers();
}

function renderGhost(n) {
  const g = svg.querySelector('#ghost');
  if (!g) return;
  if (!n) { g.innerHTML = ''; return; }
  const [x, y] = pos(n);
  g.innerHTML = `<circle class="ghost" cx="${x}" cy="${y}" r="${R - 2}" fill="${COLORS[st.turn].fill}"/>`;
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
    el.querySelector('.score').textContent = plural(match.score[p], 'jam.wins');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('jam.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('jam.turn.you') : t('jam.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('jam.thinking', { name: name(st.turn) });
  else status.textContent = t('jam.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#first').disabled = !canRestart();
  $('#hints').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('jam.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('jam.online.note') : '';
  for (const o of $('#first').options) o.textContent = name(+o.value);
  svg.classList.toggle('can-move', canMove());
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
  st = JAM.create({ first: firstSeat() });
  history = []; shapes = {}; over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}
function newMatch() { match = { score: [0, 0], game: 0 }; newGame(); }

function play(n) {
  const prev = JAM.clone(st);
  history.push({ st: prev, score: match.score.slice() });
  const who = st.turn, other = 1 - who;
  const couldWin = JAM.completers(prev, who), mustBlock = JAM.completers(prev, other);
  JAM.apply(st, n);
  if (st.over) {
    if (st.winner >= 0) match.score[st.winner]++;
    return finish(true);
  }
  const threats = JAM.completers(st, who), before = new Set(JAM.completers(prev, who));
  const fresh = threats.filter((x) => !before.has(x));
  const blocked = mustBlock.includes(n);
  if (couldWin.length) {
    // had 15 in hand and walked past it
    setMood(who, 'neutral'); setMood(other, 'happy', 'wave'); say(other, 'jam.say.missed');
  } else if (mustBlock.length && !blocked) {
    // left the opponent's winning number on the table
    setMood(other, 'smug', 'wave'); setMood(who, 'worried');
    say(other, 'jam.say.gift');
  } else if (threats.length >= 2 && fresh.length) {
    setMood(who, 'happy', 'up'); setMood(other, 'worried');
    say(who, 'jam.say.fork'); setTimeout(() => !over && say(other, 'jam.say.worried'), 700);
  } else if (blocked) {
    setMood(who, 'smug'); setMood(other, 'sad');
    if (Math.random() < 0.75) say(who, 'jam.say.block');
  } else if (fresh.length) {
    setMood(who, 'happy', 'wave'); setMood(other, 'worried');
    if (Math.random() < 0.5) say(who, 'jam.say.threat');
  } else {
    setMood(who, 'neutral');
    if (moods[other].mood !== 'smug') setMood(other, 'neutral');
  }
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const n = JAM.aiMove(st, cfg.mode);
    if (n && !over && isAI(st.turn)) play(n);
  }, 650);
}

function finish(fresh) {
  over = true;
  const w = st.winner;
  if (w < 0) {
    setMood(0, 'worried'); setMood(1, 'worried');
    if (fresh) say(st.turn, 'jam.say.tie');
  } else {
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
    if (fresh) { say(w, 'jam.say.win'); setTimeout(() => over && say(1 - w, 'jam.say.lose'), 900); }
  }
  render(fresh);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('jam.tie') : t('jam.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').textContent = w < 0 ? t('jam.why.tie') : `${st.trio.join(' + ')} = 15`;
  $('#result-why').style.color = w < 0 ? '' : COLORS[w].main;
  $('#result-next').textContent = t('jam.next', { name: name(firstSeat(match.game + 1)) });
  setTimeout(() => { if (over) $('#result').hidden = false; }, fresh ? 1200 : 0);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  let h;
  do { h = history.pop(); st = h.st; } while (history.length && isAI(st.turn));
  match.score = h.score;
  over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart or change shared settings; the guest follows.
function restart(next) {
  if (!canRestart()) return;
  if (next) match.game++;
  newGame();
  if (online()) sendState('new');
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
function sendState(type = 'state') {
  sess.send(type, { st, over, match, first: cfg.first, hints: cfg.hints, names: cfg.names });
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
    cfg.first = d.first; cfg.hints = d.hints;
    $('#first').value = cfg.first; $('#hints').value = cfg.hints;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish(false) : render(false);
  };
  s.on('state', receive);
  s.on('new', receive);
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); if (over) finish(false); });
  s.on('move', (d) => {
    if (d.k !== st.moves || !JAM.legal(st, d.n) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.n);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else render(false);
}

function localMove(n) {
  if (!canMove() || !JAM.legal(st, n)) return;
  if (online()) sess.send('move', { n, k: st.moves });
  play(n);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  let n = canMove() ? numAt(evt) : 0;
  if (n && st.owner[n] >= 0) n = 0;
  if (n === hoverNum) return;
  hoverNum = n;
  renderGhost(n);
  svg.style.cursor = n ? 'pointer' : '';
});
svg.addEventListener('pointerleave', () => { hoverNum = 0; renderGhost(0); });
svg.addEventListener('click', (evt) => {
  const n = numAt(evt);
  if (n) localMove(n);
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, select, textarea') || document.querySelector('dialog[open]')) return;
  if (/^[1-9]$/.test(e.key)) localMove(+e.key);
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newMatch(); });
$('#first').addEventListener('change', (e) => { cfg.first = +e.target.value; saveCfg(); if (canRestart()) { newMatch(); if (online()) sendState('new'); } });
$('#hints').addEventListener('change', (e) => { cfg.hints = +e.target.value; saveCfg(); if (online()) { if (sess.host) sendState(); } render(false); if (over) finish(false); });
$('#layout').addEventListener('change', (e) => { cfg.layout = e.target.value; saveCfg(); render(false); if (over) finish(false); });
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
$('#layout').value = cfg.layout;
$('#hints').value = cfg.hints;
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newMatch(); },
});
if (!online()) showOnce('how', SLUG);
