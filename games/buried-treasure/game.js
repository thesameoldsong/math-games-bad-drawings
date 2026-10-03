import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { BT } from './engine.js';
import './strings.js';

const SLUG = 'buried-treasure';
const COLORS = [PALETTE.blue, PALETTE.red];
const GOLD = { main: '#f2b51b', dark: '#b07d00', fill: '#ffd95a' };
const M = 6, HD = 36, CS = 40;          // margin, header strip, cell size
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 9, mode: 'pvp', notes: 'smart', names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, holdTimer, pendTimer;
let uncovered = null;   // hot-seat: who pressed "it's me" behind the cover
let hold = -1;          // hot-seat: keep showing the digger's map for a moment after the dig
let pending = false;    // guest: move sent, waiting for the host's state
let freshAt = -1;       // log index whose mark should animate
let hoverKey = null;
let sess = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];
const timers = [];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const hotSeat = () => !online() && cfg.mode === 'pvp';
const ready = () => !online() || sess.connected;
const over = () => st.phase === 'over';
function name(p) {
  if (isAI(p)) return t('bt.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('bt.p' + p);
}
function viewer() {
  if (online()) return mySeat();
  if (!hotSeat()) return 0;
  if (over()) return st.winner;
  return hold >= 0 ? hold : st.turn;
}
const coverFor = () => (hotSeat() && !over() && hold < 0 && uncovered !== st.turn ? st.turn : -1);
const canAct = () => !over() && hold < 0 && coverFor() < 0 && isLocal(st.turn) && ready() && !pending;

// ---------- geometry ----------
const N = () => st.size;
const G = M + HD;                                   // grid origin (x and y)
const dims = () => { const W = G + N() * CS + M; return { W, H: G + N() * CS + 62, B: G + N() * CS }; };
const colX = (i) => G + i * CS;
const rowY = (j) => G + j * CS;

function hitAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const i = Math.floor((p.x - G) / CS), j = Math.floor((p.y - G) / CS);
  const L = BT.letters(N()), Ns = BT.numbers(N());
  if (p.y >= M - 2 && p.y < G && i >= 0 && i < N()) return { t: 'card', c: L[i], k: 'c' + L[i] };
  if (p.x >= M - 2 && p.x < G && j >= 0 && j < N()) return { t: 'card', c: Ns[j], k: 'c' + Ns[j] };
  if (i >= 0 && j >= 0 && i < N() && j < N()) return { t: 'cell', l: L[i], n: Ns[j], k: L[i] + Ns[j] };
  return null;
}

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function txt(x, y, s, { size = 22, color = 'var(--ink)', anchor = 'middle', max = 999, weight = 700, cls = '' } = {}) {
  const fit = String(s).length * size * 0.4 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="t ${cls}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${fit}>${esc(s)}</text>`;
}
function box(k, x, y, w, h, a = 1.2) {
  return shapeFor(k, () => line(x, y, x + w, y, a) + ' ' + line(x + w, y, x + w, y + h, a).replace('M', 'L') + ' ' +
    line(x + w, y + h, x, y + h, a).replace('M', 'L') + ' ' + line(x, y + h, x, y, a).replace('M', 'L'));
}
const cross = (k, cx, cy, r) => shapeFor(k, () => line(cx - r, cy - r, cx + r, cy + r, 1) + ' ' + line(cx + r, cy - r, cx - r, cy + r, 1));

// What viewer v knows about each card (null = show nothing, e.g. under the hot-seat cover).
function knowledgeFor(v) {
  if (over()) {
    const k = {};
    for (const c of [...BT.letters(N()), ...BT.numbers(N())]) k[c] = st.hands[0].includes(c) ? 'p0' : st.hands[1].includes(c) ? 'p1' : 'gold';
    return k;
  }
  if (coverFor() >= 0 || !st.hands[v]) return null;
  return BT.knowledge(N(), st.hands[v], st.log, v, cfg.notes === 'smart');
}
function possibleCells(v, k) {
  if (!k || over()) return null;
  if (cfg.notes === 'smart') return new Set(BT.candidates(N(), st.hands[v], st.log, v).map(([l, n]) => l + n));
  const out = new Set();
  const ok = (c) => k[c] === '?' || k[c] === 'gold';
  for (const l of BT.letters(N())) for (const n of BT.numbers(N())) if (ok(l) && ok(n)) out.add(l + n);
  return out;
}

function header(c, x, y, s, v) {
  const k = 'h' + c;
  let o = '';
  const owner = s === 'mine' ? v : s === 'p0' ? 0 : s === 'p1' ? 1 : -1;
  let color = 'var(--ink)';
  if (owner >= 0) {
    const col = COLORS[owner];
    const d = box(k, x - 15, y - 15, 30, 30, 1.6);
    o += `<path d="${d}" fill="${col.fill}" opacity=".6" filter="url(#mg-crayon)"/><path class="scrap" d="${d}" stroke="${col.main}"/>`;
    color = col.dark;
  } else if (s === 'gold') {
    const d = shapeFor(k + 'g', () => circle(x, y, 16, 16, 0.06));
    o += `<path d="${d}" fill="${GOLD.fill}" filter="url(#mg-crayon)"/><path class="ring" d="${d}" stroke="${GOLD.main}"/>`;
  } else if (s === 'opp') color = '#a8a8a8';
  o += txt(x, y + 1, c, { size: c.length > 1 ? 24 : 28, color });
  if (s === 'opp') o += `<path class="strike" d="${shapeFor(k + 's', () => line(x - 13, y + 11, x + 13, y - 11, 1.2))}" stroke="${COLORS[1 - v].main}"/>`;
  return o;
}

function chest(cx, cy) {
  return `<g class="chest">
    <path d="${shapeFor('glow', () => circle(cx, cy, 19, 19, 0.08))}" fill="${GOLD.fill}" filter="url(#mg-crayon)"/>
    <path d="${shapeFor('lid', () => `M${cx - 12} ${cy - 1} Q${cx - 12} ${cy - 12} ${cx} ${cy - 12} Q${cx + 12} ${cy - 12} ${cx + 12} ${cy - 1} Z`)}" fill="#c47a2c" stroke="#6b3f12" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${box('body', cx - 12, cy - 1, 24, 13, 0.6)}" fill="#a8621f" stroke="#6b3f12" stroke-width="2.2" stroke-linejoin="round"/>
    <rect x="${cx - 3}" y="${cy - 4}" width="6" height="7" rx="1.5" fill="${GOLD.main}" stroke="#6b3f12" stroke-width="1.4"/>
  </g>`;
}

// ---------- rendering ----------
function logLine(e) {
  if (e.t === 'ask') return t('bt.log.ask', { name: name(e.p), c: e.c, ans: t(e.yes ? 'bt.log.yes' : 'bt.log.no') });
  return t('bt.log.dig', { name: name(e.p), cell: e.l + e.n, res: t('bt.log.' + e.r) });
}
const lastLines = () => st.log.slice(-2);

function render() {
  const { W, H, B } = dims();
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const v = viewer(), k = knowledgeFor(v), poss = possibleCells(v, k);
  const L = BT.letters(N()), Ns = BT.numbers(N());
  const vc = COLORS[v] || COLORS[0];
  let o = '';

  // paper under the map
  o += `<rect x="${G}" y="${G}" width="${N() * CS}" height="${N() * CS}" fill="#fff"/>`;

  // shaded squares: no treasure possible there
  if (poss) {
    let sh = '';
    for (let i = 0; i < N(); i++) for (let j = 0; j < N(); j++) {
      if (poss.has(L[i] + Ns[j])) continue;
      sh += `<rect x="${colX(i)}" y="${rowY(j)}" width="${CS}" height="${CS}"/>`;
    }
    o += `<g fill="${vc.fill}" opacity=".5" filter="url(#mg-crayon)">${sh}</g>`;
  }

  // grid lines
  let d = '';
  for (let q = 0; q <= N(); q++) {
    d += shapeFor('gh' + q, () => line(G - 2, rowY(q), G + N() * CS + 2, rowY(q), 0.9)) + ' ';
    d += shapeFor('gv' + q, () => line(colX(q), G - 2, colX(q), G + N() * CS + 2, 0.9)) + ' ';
  }
  o += `<path class="grid" d="${d}"/>`;

  // headers = the cards you can ask about
  for (let i = 0; i < N(); i++) o += header(L[i], colX(i) + CS / 2, M + HD / 2, k ? k[L[i]] : '?', v);
  for (let j = 0; j < N(); j++) o += header(Ns[j], M + HD / 2, rowY(j) + CS / 2, k ? k[Ns[j]] : '?', v);

  // a single remaining square: point at it
  if (poss && poss.size === 1 && isLocal(v)) {
    const [c] = poss;
    const i = L.indexOf(c[0]), j = Ns.indexOf(c.slice(1));
    o += `<path class="hint" d="${shapeFor('hint' + c, () => circle(colX(i) + CS / 2, rowY(j) + CS / 2, CS * 0.42, CS * 0.42, 0.05))}" stroke="${GOLD.main}"/>`;
  }

  // treasure revealed at the end
  if (over() && st.treasure) {
    const i = L.indexOf(st.treasure[0]), j = Ns.indexOf(st.treasure[1]);
    o += chest(colX(i) + CS / 2, rowY(j) + CS / 2);
  }

  // dig marks
  st.log.forEach((e, idx) => {
    if (e.t !== 'dig' || e.r === 'win') return;
    const i = L.indexOf(e.l), j = Ns.indexOf(e.n);
    const cx = colX(i) + CS / 2 + (e.p ? 4 : -4), cy = rowY(j) + CS / 2 + (e.p ? 4 : -4);
    o += `<path class="dig${idx === freshAt ? ' fresh' : ''}" d="${cross('x' + idx, cx, cy, 8)}" stroke="${COLORS[e.p].main}"/>`;
  });

  o += `<g id="hover"></g>`;

  // log panel
  const lines = lastLines();
  if (!lines.length) {
    if (k) o += txt(W / 2, B + 34, t('bt.legend'), { size: 20, color: '#777', max: W - 16, weight: 600 });
  } else lines.forEach((e, n) => {
    o += txt(M + 2, B + 24 + n * 26, logLine(e), { size: 20, color: COLORS[e.p].dark, anchor: 'start', max: W - 2 * M - 4, weight: 600 });
  });

  svg.innerHTML = o;
  hoverKey = null;
  freshAt = -1;
  renderCover();
  renderPlayers();
}

function renderCover() {
  const cov = coverFor();
  const el = $('#cover');
  el.hidden = cov < 0;
  if (cov < 0) return;
  const b = $('#uncover');
  b.textContent = t('bt.cover.btn', { name: name(cov) });
  b.style.background = COLORS[cov].main;
  b.style.borderColor = COLORS[cov].dark;
  const lines = lastLines();
  $('#cover-last').innerHTML = lines.length
    ? `<div>${esc(t('bt.cover.last'))}</div>` + lines.map((e) => `<div style="color:${COLORS[e.p].dark}">${esc(logLine(e))}</div>`).join('')
    : '';
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over() && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over() || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    el.querySelector('.score').textContent = plural(st.log.filter((e) => e.t === 'dig' && e.p === p).length, 'bt.digs');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const cov = coverFor();
  let s = '';
  if (over() || hold >= 0) s = '';
  else if (online() && !sess.connected) s = t('bt.online.wait');
  else if (cov >= 0) s = t('bt.cover.status', { name: name(cov) });
  else if (isAI(st.turn)) s = t('bt.thinking', { name: name(st.turn) });
  else if (isRemote(st.turn) || pending) s = t('bt.turn.them', { name: name(st.turn) });
  else if (hotSeat()) s = t(st.phase === 'ask' ? 'bt.turn.ask' : 'bt.turn.dig', { name: name(st.turn) });
  else s = t(st.phase === 'ask' ? 'bt.you.ask' : 'bt.you.dig');
  status.textContent = s;
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over());
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('bt.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('bt.online.note') : '';
}

// ---------- characters ----------
const bubbleTimers = [];
function say(p, key, vars) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key, vars);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 2000);
}
const later = (ms, fn) => timers.push(setTimeout(fn, ms));
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// Reactions only use public information (what both players hear at the table).
function react(e) {
  const a = e.p, b = 1 - a;
  if (e.t === 'ask') {
    say(a, 'bt.say.ask', { c: e.c });
    later(650, () => {
      say(b, e.yes ? 'bt.say.yes' : 'bt.say.no');
      if (e.yes) { setMood(a, 'neutral'); setMood(b, 'neutral'); }
      else { setMood(a, 'smug'); setMood(b, 'worried'); }
      renderPlayers();
    });
    return;
  }
  const cell = e.l + e.n;
  say(a, e.r === 'win' ? 'bt.say.win' : 'bt.say.dig', { cell });
  if (e.r === 'opp') later(650, () => { say(b, 'bt.say.empty'); setMood(b, 'smug'); setMood(a, 'sad'); renderPlayers(); });
  if (e.r === 'self') later(650, () => {
    say(a, 'bt.say.bluff'); setMood(a, 'smug', 'wave'); setMood(b, 'worried');
    if (Math.random() < 0.4) later(900, () => say(b, 'bt.say.worried'));
    renderPlayers();
  });
}

// ---------- flow ----------
function clearTimers() {
  clearTimeout(aiTimer); clearTimeout(holdTimer); clearTimeout(pendTimer);
  while (timers.length) clearTimeout(timers.pop());
}
function newGame(size = cfg.size) {
  clearTimers();
  // players take turns starting; an untouched game keeps its starter
  const first = !st ? 0 : st.log.length ? 1 - st.first : st.first;
  st = BT.create({ size, first });
  st.gid = Math.random().toString(36).slice(2, 10);
  history = []; shapes = {}; uncovered = null; hold = -1; pending = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  if (online() && sess.host) sendState();
  maybeAI();
}

function play(m) {
  if (over()) return;
  const before = BT.clone(st);
  const e = BT.apply(st, m);
  if (!e) return;
  if (!online() && isLocal(e.p)) history.push(before);
  freshAt = st.log.length - 1;
  react(e);
  if (online() && sess.host) sendState();
  if (e.r === 'win') return finish();
  if (e.t === 'dig' && hotSeat()) {
    // let the digger see the result on their own map, then hand over
    hold = e.p; uncovered = null;
    holdTimer = setTimeout(() => { hold = -1; render(); }, 1500);
  }
  render();
  maybeAI();
}

function maybeAI() {
  if (over() || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => play(BT.aiMove(BT.view(st, st.turn), cfg.mode)), st.phase === 'ask' ? 1000 : 1500);
}

function finish() {
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  later(1000, () => say(1 - w, 'bt.say.lose'));
  hold = -1;
  render();
  const txtEl = $('#result-text');
  txtEl.textContent = t('bt.win', { name: name(w) });
  txtEl.style.color = COLORS[w].main;
  $('#result-sub').textContent = st.treasure ? t('bt.where', { cell: st.treasure.join('') }) : '';
  later(1400, () => { if (over()) $('#result').hidden = false; });
}

function undo() {
  if (!history.length || online()) return;
  clearTimers();
  st = history.pop();
  hold = -1; uncovered = null; pending = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

// Online, only the room creator may restart (and resize); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
}

// ---------- online ----------
// Host is authoritative and keeps the secrets: the guest only ever gets view(st, 1) —
// its own cards and the public log (everything is revealed once the treasure is found).
function sendState() {
  sess.send('state', { v: BT.view(st, 1), names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimers();
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const v = d.v;
    const same = st && st.gid === v.gid && v.log.length >= st.log.length;
    const fresh = same ? v.log.slice(st.log.length) : [];
    if (!same) { shapes = {}; clearTimers(); setMood(0, 'neutral'); setMood(1, 'neutral'); $('#result').hidden = true; }
    st = v; history = []; pending = false; hold = -1;
    clearTimeout(pendTimer);
    cfg.size = st.size; $('#size').value = st.size;
    remoteNames[0] = d.names[0];
    if (fresh.length) freshAt = st.log.length - 1;
    fresh.slice(-2).forEach((e, i) => later(i * 900, () => react(e)));
    if (over()) finish(); else render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (!s.host) return;
    if (d.gid !== st.gid || d.n !== st.log.length || st.turn !== 1 || over()) return sendState();
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else render();
}

function localMove(m) {
  if (!canAct()) return;
  if (online() && !sess.host) {
    pending = true;
    sess.send('move', { m, n: st.log.length, gid: st.gid });
    clearTimeout(pendTimer);
    pendTimer = setTimeout(() => { if (pending) sess.send('resync'); }, 4000);
    renderPlayers();
    return;
  }
  play(m);
}

// ---------- input ----------
function targetOK(h) {
  if (!h || !canAct()) return false;
  return st.phase === 'ask' ? h.t === 'card' : h.t === 'cell';
}
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const h = hitAt(evt);
  const ok = targetOK(h);
  const key = ok ? h.k : null;
  if (key === hoverKey) return;
  hoverKey = key;
  const g = svg.querySelector('#hover');
  svg.style.cursor = ok ? 'pointer' : '';
  if (!g) return;
  if (!ok) { g.innerHTML = ''; return; }
  const col = COLORS[st.turn].main;
  const L = BT.letters(N()), Ns = BT.numbers(N());
  if (h.t === 'card') {
    const li = L.indexOf(h.c), nj = Ns.indexOf(h.c);
    const [x, y] = li >= 0 ? [colX(li) + 2, M + 1] : [M + 1, rowY(nj) + 2];
    const [w, hh] = li >= 0 ? [CS - 4, HD - 2] : [HD - 2, CS - 4];
    g.innerHTML = `<rect class="hov" x="${x}" y="${y}" width="${w}" height="${hh}" rx="6" stroke="${col}"/>`;
  } else {
    const i = L.indexOf(h.l), j = Ns.indexOf(h.n);
    g.innerHTML = `<rect class="hov-line" x="${colX(i)}" y="${G}" width="${CS}" height="${N() * CS}" fill="${col}"/>` +
      `<rect class="hov-line" x="${G}" y="${rowY(j)}" width="${N() * CS}" height="${CS}" fill="${col}"/>` +
      `<rect class="hov" x="${colX(i) + 3}" y="${rowY(j) + 3}" width="${CS - 6}" height="${CS - 6}" rx="5" stroke="${col}"/>`;
  }
});
svg.addEventListener('pointerleave', () => { hoverKey = null; const g = svg.querySelector('#hover'); if (g) g.innerHTML = ''; });
svg.addEventListener('click', (evt) => {
  const h = hitAt(evt);
  if (!targetOK(h)) return;
  localMove(h.t === 'card' ? { t: 'ask', c: h.c } : { t: 'dig', l: h.l, n: h.n });
});

$('#uncover').addEventListener('click', () => { uncovered = coverFor(); render(); });
$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#notes').addEventListener('change', (e) => { cfg.notes = e.target.value; saveCfg(); render(); });
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
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
$('#notes').value = cfg.notes;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
