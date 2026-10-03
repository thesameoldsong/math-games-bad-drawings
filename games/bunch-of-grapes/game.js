import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, curve, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { GR } from './engine.js';
import './strings.js';

const SLUG = 'bunch-of-grapes';
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 'medium', mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!GR.SIZES[cfg.size]) cfg.size = 'medium';
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, over, aiTimer, hoverG = -1, geo = null, nextFirst = 0;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];
const flyDir = [1, -1];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('grp.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('grp.p' + p);
}

// ---------- geometry (cached per board) ----------
function geometry() {
  if (geo && geo.board === st.board) return geo;
  const { polys } = GR.cells(st.board.grapes);
  const rMean = st.board.grapes.reduce((s, g) => s + g.r, 0) / st.board.grapes.length;
  const paths = polys.map((P) => 'M' + P.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z');
  const shines = st.board.grapes.map((g, i) => withSeed(i * 97 + 5, () => {
    const a0 = Math.PI * (1.08 + Math.random() * 0.12), a1 = a0 + 0.55 + Math.random() * 0.3, rr = g.r * 0.62;
    const pts = [0, 0.5, 1].map((k) => { const a = a0 + (a1 - a0) * k; return [g.x + Math.cos(a) * rr, g.y + Math.sin(a) * rr]; });
    return curve(pts);
  }));
  // the stalk ends inside the top-most grape near the middle of the bunch
  const top = st.board.grapes.reduce((m, g) => (g.y - g.r + Math.abs(g.x - GR.W / 2) * 0.6 < m.y - m.r + Math.abs(m.x - GR.W / 2) * 0.6 ? g : m));
  const ex = top.x, ey = top.y - top.r * 0.9, sx = ex + 8, sy = Math.max(4, ey - 36);
  const stem = withSeed(7, () => ({
    stem: line(sx, sy, ex, ey, 3),
    leaf: curve([[sx + 2, sy + 10], [sx + 32, sy - 2], [sx + 64, sy + 8], [sx + 40, sy + 26], [sx + 4, sy + 16]]),
    vein: line(sx + 6, sy + 12, sx + 50, sy + 10, 2),
    curl: curve([[sx - 4, sy + 8], [sx - 22, sy + 2], [sx - 32, sy + 12], [sx - 24, sy + 20], [sx - 16, sy + 14]]),
  }));
  geo = { board: st.board, paths, shines, stem, flyScale: Math.max(0.6, Math.min(1.25, rMean / 24)) };
  return geo;
}

// ---------- rendering ----------
const FLY = (c) => `
  <g class="legs" stroke="${PALETTE.ink}" stroke-width="1.6" stroke-linecap="round" fill="none">
    <path d="M-6 5 L-10 11 M0 6 L-1 12 M5 5 L8 11"/>
  </g>
  <ellipse class="wing w2" cx="-6" cy="-7" rx="10" ry="5.4" transform="rotate(-40 -6 -7)"/>
  <ellipse cx="-2" cy="1" rx="10.5" ry="7" fill="${c.main}" stroke="${c.dark}" stroke-width="2"/>
  <path d="M-6 -4 Q-4 1 -6 6 M-1 -5.5 Q1 1 -1 7" stroke="${c.dark}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <ellipse class="wing" cx="-3" cy="-9" rx="10" ry="5.4" transform="rotate(-18 -3 -9)"/>
  <circle cx="10" cy="-1" r="6.4" fill="${c.dark}"/>
  <circle cx="12.5" cy="-4.5" r="3.8" fill="#fff" stroke="${c.dark}" stroke-width="1.2"/>
  <circle cx="8.6" cy="-5" r="3.4" fill="#fff" stroke="${c.dark}" stroke-width="1.2"/>
  <circle class="pupil" cx="13.6" cy="-4.4" r="1.7" fill="${PALETTE.ink}"/>
  <circle class="pupil" cx="9.6" cy="-4.9" r="1.6" fill="${PALETTE.ink}"/>`;

function buildBoard() {
  const G = geometry();
  const { stem } = G;
  svg.innerHTML = `
    <g class="stem">
      <path d="${stem.leaf}" class="leaf" filter="url(#mg-crayon)"/>
      <path d="${stem.leaf}" class="leaf-line"/>
      <path d="${stem.vein}" class="leaf-line"/>
      <path d="${stem.curl}" class="tendril"/>
      <path d="${stem.stem}" class="stalk"/>
    </g>
    <g id="fills"></g>
    <g id="outlines" filter="url(#mg-marker)">${G.paths.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g id="shines">${G.shines.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g id="hints"></g>
    <g id="flies">${[0, 1].map((p) => `<g class="fly f${p}" data-p="${p}"><g class="fly-in">${FLY(COLORS[p])}</g></g>`).join('')}</g>
    <g id="ghost" class="ghost"><g class="fly-in">${FLY(COLORS[0])}</g></g>`;
  for (const p of [0, 1]) placeFly(p, false);
}

function placeFly(p, animate) {
  const el = svg.querySelector(`.fly.f${p}`);
  const g = st.fly[p];
  el.classList.toggle('gone', g < 0);
  if (g < 0) return;
  const { x, y } = st.board.grapes[g];
  el.classList.toggle('anim', !!animate);
  el.style.transform = `translate(${x}px, ${y}px)`;
  el.querySelector('.fly-in').setAttribute('transform', `scale(${(geometry().flyScale * flyDir[p]).toFixed(3)} ${geometry().flyScale.toFixed(3)})`);
}

function render(animate = false) {
  const G = geometry();
  if (!svg.querySelector('#fills') || svg.dataset.board !== String(st.boardId)) { buildBoard(); svg.dataset.board = String(st.boardId); }
  const fresh = animate && st.last && st.phase === 'move' && st.from != null ? st.from : -1;
  svg.querySelector('#fills').innerHTML = st.eaten.map((e, i) => (e < 0
    ? `<path d="${G.paths[i]}" class="grape"/>`
    : `<path d="${G.paths[i]}" class="eaten${i === fresh ? ' fresh' : ''}" fill="${COLORS[e].main}" filter="url(#mg-crayon)"/>`)).join('');
  svg.querySelectorAll('#shines path').forEach((el, i) => el.classList.toggle('off', st.eaten[i] >= 0));
  for (const p of [0, 1]) placeFly(p, animate && st.last && st.last.p === p);
  svg.querySelectorAll('.fly').forEach((el) => el.classList.toggle('turn', !over && +el.dataset.p === st.turn && st.phase === 'move'));
  renderHints();
  renderPlayers();
}

function renderHints() {
  const G = geometry();
  let out = '';
  if (canMove() && st.phase === 'move') {
    for (const g of GR.legal(st)) out += `<path d="${G.paths[g]}" class="hint${g === hoverG ? ' hover' : ''}" stroke="${COLORS[st.turn].main}"/>`;
  } else if (canMove() && hoverG >= 0) {
    out += `<path d="${G.paths[hoverG]}" class="hint hover" stroke="${COLORS[st.turn].main}"/>`;
  }
  svg.querySelector('#hints').innerHTML = out;
  const ghost = svg.querySelector('#ghost');
  const showGhost = canMove() && st.phase === 'place' && hoverG >= 0;
  ghost.classList.toggle('show', showGhost);
  if (showGhost) {
    const { x, y } = st.board.grapes[hoverG], k = G.flyScale;
    ghost.querySelector('.fly-in').innerHTML = FLY(COLORS[st.turn]);
    ghost.setAttribute('transform', `translate(${x} ${y}) scale(${k * flyDir[st.turn]} ${k})`);
  }
}

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
    el.querySelector('.score').textContent = st.fly[p] < 0 ? t('grp.nofly') : plural(GR.eatenBy(st, p), 'grp.grapes');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const place = st.phase === 'place';
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('grp.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t(place ? 'grp.place.you' : 'grp.turn.you') : t(place ? 'grp.place.them' : 'grp.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('grp.thinking', { name: name(st.turn) });
  else status.textContent = t(place ? 'grp.place' : 'grp.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (!over && isAI(st.turn)) || !history.some((h) => isLocal(h.turn));
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('grp.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('grp.online.note') : '';
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
let boardSeq = 0;
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  st = GR.create(GR.generate(cfg.size), first);
  st.boardId = ++boardSeq + '-' + Date.now();
  nextFirst = 1 - first;
  history = []; over = false; hoverG = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function react(prev, who) {
  const other = 1 - who;
  if (prev.phase === 'place') {
    setMood(who, 'happy');
    if (Math.random() < 0.6) say(who, 'grp.say.place');
    return;
  }
  const a = GR.assess(prev), b = GR.assess(st);
  if (!a || !b) return;
  setMood(who, 'neutral'); setMood(other, 'neutral');
  if (b.sep && !a.sep) {
    // the flies just got separated: whoever has the longer path will win
    const winning = b.len[who] >= b.len[other];
    if (winning) { setMood(who, 'happy', 'wave'); setMood(other, 'worried'); say(who, 'grp.say.cut'); setTimeout(() => !over && say(other, 'grp.say.tight'), 900); }
    else { setMood(who, 'worried'); setMood(other, 'smug'); say(who, 'grp.say.oops'); }
    return;
  }
  if (b.sep) {
    const winning = b.len[who] >= b.len[other];
    setMood(who, winning ? 'happy' : 'worried'); setMood(other, winning ? 'worried' : 'smug');
    return;
  }
  if (b.mob[other] === 1) { setMood(who, 'smug'); setMood(other, 'worried'); if (Math.random() < 0.6) say(who, 'grp.say.squeeze'); else say(other, 'grp.say.tight'); return; }
  const d = (b.terr[who] - b.terr[other]) - (a.terr[who] - a.terr[other]);
  if (d >= 4) { setMood(who, 'happy'); setMood(other, 'worried'); if (Math.random() < 0.5) say(who, 'grp.say.good'); }
  else if (d <= -4) { setMood(who, 'worried'); setMood(other, 'smug'); if (Math.random() < 0.4) say(who, 'grp.say.oops'); }
}

function play(g) {
  const prev = GR.clone(st);
  if (!GR.apply(st, g)) return false;
  history.push(prev);
  const who = prev.turn;
  if (st.from != null) flyDir[who] = st.board.grapes[g].x >= st.board.grapes[st.from].x ? 1 : -1;
  hoverG = -1;
  react(prev, who);
  if (GR.isOver(st)) return finish(), true;
  render(true);
  maybeAI();
  return true;
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => play(GR.aiMove(st, cfg.mode)), st.phase === 'place' ? 700 : 550);
}

function finish() {
  over = true;
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  say(w, 'grp.say.win'); setTimeout(() => say(1 - w, 'grp.say.lose'), 900);
  render(true);
  resultText();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1100);
}

function resultText() {
  const w = st.winner, txt = $('#result-text');
  txt.textContent = t('grp.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-sub').textContent = t('grp.stuck');
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && !isLocal(st.turn));
  over = false; hoverG = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and pick the bunch size); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Host is authoritative: on (re)connect and on every new game it sends the whole state (incl. the bunch);
// moves carry the ply counter so a desync triggers a resync.
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst });
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
    if (s.host) return;
    st = d.st; over = false; history = []; hoverG = -1; nextFirst = d.nextFirst;
    if (GR.SIZES[st.board.size]) { cfg.size = st.board.size; $('#size').value = cfg.size; }
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    if (GR.isOver(st)) finish(); else render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; renderPlayers(); });
  s.on('move', (d) => {
    if (d.n !== st.ply || !GR.isLegal(st, d.g) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.g);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else render(false);
}

function localMove(g) {
  if (!canMove() || !GR.isLegal(st, g)) return;
  const n = st.ply;
  if (play(g) && online()) sess.send('move', { g, n });
}

// ---------- input ----------
function grapeAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  let best = -1, bd = Infinity;
  for (const g of GR.legal(st)) {
    const G = st.board.grapes[g], d = Math.hypot(p.x - G.x, p.y - G.y) / G.r;
    if (d < bd) { bd = d; best = g; }
  }
  return bd < (evt.pointerType === 'mouse' ? 1.02 : 1.25) ? best : -1;
}
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const g = canMove() ? grapeAt(evt) : -1;
  if (g === hoverG) return;
  hoverG = g;
  svg.style.cursor = g >= 0 ? 'pointer' : '';
  renderHints();
});
svg.addEventListener('pointerleave', () => { hoverG = -1; renderHints(); });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const g = grapeAt(evt);
  if (g >= 0) localMove(g);
});

$('#size').addEventListener('change', (e) => { cfg.size = e.target.value; saveCfg(); restart(); });
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
  }));
document.addEventListener('mg:lang', () => { renderPlayers(); if (over) resultText(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
