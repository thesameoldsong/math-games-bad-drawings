import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { BC } from './engine.js';
import './strings.js';

const SLUG = 'bullseyes-and-close-calls';
const COLORS = [PALETTE.blue, PALETTE.red];
const W = 360, H = 506;
const COL = [4, 184], CW = 172;              // guess-log columns
const LOG0 = 58, LOGH = 226, RH = 25;        // log area top, height, normal row height
const INFO = 296;                            // info line
const SLOT = 308;                            // secret / guess slots
const KEYS = 362, KH = 42, KSTEP = 48;       // keypad rows
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', len: 4, rep: 0, count: 0, names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, gid = 0;
let draft = '';              // digits typed at the keypad
let draftFor = -1;           // whose draft it is (reset when the keypad changes hands)
let notes = [new Array(10).fill(0), new Array(10).fill(0)]; // 0 none, 1 crossed out, 2 circled
let notesMode = false;
let uncovered = -1;          // hot-seat set-up: who pressed "show" behind the cover
let pending = false;         // guest waiting for the host to confirm
let fresh = null;            // [p, index] of the newest log row (animated once)
let sess = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

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
  if (isAI(p)) return t('bc.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('bc.p' + p);
}

// Who sits at the keypad right now.
function keypadPlayer() {
  if (online()) return mySeat();
  if (cfg.mode !== 'pvp') return 0;
  if (st.phase === 'setup') return st.secrets[0] === null ? 0 : 1;
  return st.turn;
}
const coverFor = () => (hotSeat() && st.phase === 'setup' && uncovered !== keypadPlayer() ? keypadPlayer() : -1);
function canType() {
  const p = keypadPlayer();
  if (!ready() || pending || coverFor() >= 0) return false;
  if (st.phase === 'setup') return st.secrets[p] === null;
  return st.phase === 'play' && st.turn === p && isLocal(p);
}
// May the local viewer see p's secret?
function secretVisible(p) {
  if (over()) return true;
  if (online()) return p === mySeat();
  return cfg.mode !== 'pvp' && p === 0;
}

// How many numbers still fit p's clues (memoised: the 5-digit universe is large).
const possibleMemo = new Map();
function possible(s, p) {
  const k = `${s.len}${s.rep}:` + s.guesses[p].map((e) => e.g + e.b + e.c).join(',');
  if (!possibleMemo.has(k)) {
    if (possibleMemo.size > 200) possibleMemo.clear();
    possibleMemo.set(k, BC.countPossible(s, p));
  }
  return possibleMemo.get(k);
}

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function txt(x, y, s, { size = 22, color = 'var(--ink)', cls = '', anchor = 'middle', max = 340, weight = 700, style = '' } = {}) {
  const fit = String(s).length * size * 0.42 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="t ${cls}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${fit}${style ? ` style="${style}"` : ''}>${esc(s)}</text>`;
}
function box(k, x, y, w, h, amp = 1.2) {
  return shapeFor(k, () => line(x, y, x + w, y, amp) + ' ' + line(x + w, y, x + w, y + h, amp).replace('M', 'L') + ' ' +
    line(x + w, y + h, x, y + h, amp).replace('M', 'L') + ' ' + line(x, y + h, x, y, amp).replace('M', 'L'));
}
function button(k, act, x, y, w, h, label, { color = null, off = false, on = false, size = 22 } = {}) {
  const fill = color ? color.main : on ? 'var(--bc-key-on)' : 'var(--card)';
  return `<g class="sbtn${off ? ' off' : ''}" data-act="${act}">
    <path d="${box(k, x, y, w, h)}" fill="${fill}" stroke="${color ? color.text : 'var(--ink)'}" stroke-width="2.4" stroke-linejoin="round"/>
    ${txt(x + w / 2, y + h / 2 + 1, label, { size, color: color ? 'var(--on-accent)' : 'var(--ink)', max: w - 12 })}</g>`;
}
// feedback marks: bullseye = target (ring + centre), close call = empty ring
function bullIcon(x, y, r, k) {
  return `<path class="ic" d="${shapeFor(k, () => circle(x, y, r, r, 0.08))}"/><circle cx="${x}" cy="${y}" r="${(r * 0.45).toFixed(1)}" class="icf"/>`;
}
function closeIcon(x, y, r, k) {
  return `<path class="ic" d="${shapeFor(k, () => circle(x, y, r, r, 0.08))}"/>`;
}

// ---------- board ----------
function header(p) {
  const x0 = COL[p], q = 1 - p, L = st.len;
  let s = txt(x0 + CW / 2, 13, t('bc.col', { name: name(p) }), { size: 19, color: COLORS[p].main, max: CW - 6 });
  const bw = L > 4 ? 22 : 25, gap = 5, tot = L * bw + (L - 1) * gap, bx = x0 + (CW - tot) / 2;
  const sec = over() ? st.secrets[q] : null;
  for (let k = 0; k < L; k++) {
    const x = bx + k * (bw + gap);
    s += `<path class="tbox" d="${box(`tb${p}_${k}_${L}`, x, 27, bw, 25, 0.9)}" stroke="${COLORS[q].main}"/>`;
    s += txt(x + bw / 2, 40, sec ? sec[k] : '?', { size: sec ? 23 : 19, color: sec ? COLORS[q].main : 'var(--bc-q)', cls: sec ? 'pop' : '' });
  }
  return s;
}

function logColumn(p) {
  const x0 = COL[p], L = st.len, rows = st.guesses[p];
  let s = '';
  const minRH = 16, maxShow = Math.floor(LOGH / minRH);
  const shown = rows.length > maxShow ? rows.slice(rows.length - maxShow + 1) : rows;
  const skipped = rows.length - shown.length;
  const n = shown.length + (skipped ? 1 : 0);
  const rh = Math.min(RH, LOGH / Math.max(1, n)), k = rh / RH;
  let y = LOG0 + rh / 2;
  if (skipped) { s += txt(x0 + CW / 2, y, t('bc.more', { n: skipped }), { size: 15, color: 'var(--muted-2)', weight: 600 }); y += rh; }
  const DX = L > 4 ? 15 : 16, fs = Math.round(24 * Math.max(0.75, k));
  const ir = 5.6 * Math.max(0.75, k), IS = L > 4 ? 14 : 17;
  shown.forEach((e, j) => {
    const i = skipped + j;
    const isFresh = fresh && fresh[0] === p && fresh[1] === i;
    let row = txt(x0 + 9, y, i + 1, { size: Math.round(15 * Math.max(0.8, k)), color: 'var(--bc-num)', weight: 600 });
    for (let d = 0; d < L; d++) row += txt(x0 + 27 + d * DX, y, e.g[d], { size: fs, color: COLORS[p].main });
    const ix = x0 + 27 + (L - 1) * DX + 21;
    let marks = '';
    if (e.b + e.c === 0) marks += txt(ix + 8, y, '—', { size: 20, color: 'var(--bc-num)', weight: 600 });
    for (let m = 0; m < e.b + e.c; m++) {
      const cx = +(ix + m * IS).toFixed(1), key = `ic${p}_${i}_${m}_${cx}_${y.toFixed(1)}_${ir.toFixed(1)}`;
      const icon = m < e.b ? bullIcon(cx, y, ir, key) : closeIcon(cx, y, ir, key);
      marks += isFresh ? `<g class="pop" style="animation-delay:${0.25 + m * 0.18}s">${icon}</g>` : icon;
    }
    s += `<g class="row${isFresh ? ' new' : ''}">${row}${marks}</g>`;
    y += rh;
  });
  return s;
}

function setupInfo() {
  // shown in the empty log area while numbers are being chosen
  const p = keypadPlayer();
  const mine = st.secrets[p] !== null;
  let s = `<path class="paper" d="${box('setup-card', 22, LOG0 + 12, W - 44, 150, 1.6)}"/>`;
  if (online() && mine) {
    s += txt(W / 2, LOG0 + 70, t('bc.setup.waiting'), { size: 22, color: 'var(--bc-note)', max: W - 70 });
    return s;
  }
  s += txt(W / 2, LOG0 + 50, t('bc.setup.title'), { size: 30, color: COLORS[p].main, max: W - 70 });
  s += txt(W / 2, LOG0 + 90, t(st.rep ? 'bc.setup.rep' : 'bc.setup.distinct', { d: plural(st.len, st.rep ? 'bc.digits' : 'bc.ddigits') }), { size: 20, color: 'var(--muted)', weight: 600, max: W - 70 });
  s += bullIcon(70, LOG0 + 128, 8, 'demo-b') + txt(84, LOG0 + 128, t('bc.lbl.bull'), { size: 19, anchor: 'start', weight: 600, color: 'var(--bc-text-2)', max: 90 });
  s += closeIcon(200, LOG0 + 128, 8, 'demo-c') + txt(214, LOG0 + 128, t('bc.lbl.close'), { size: 19, anchor: 'start', weight: 600, color: 'var(--bc-text-2)', max: 90 });
  return s;
}

function infoLine() {
  if (over()) return txt(W / 2, INFO, t('bc.reveal', { a: st.secrets[0], b: st.secrets[1] }), { size: 20, color: 'var(--muted)', weight: 600 });
  const p = keypadPlayer();
  if (st.phase === 'play' && cfg.count && (isLocal(p))) {
    return txt(W / 2, INFO, t('bc.possible', { n: possible(st, p) }), { size: 19, color: COLORS[p].text, weight: 600 });
  }
  return '';
}

function keypad() {
  const p = keypadPlayer(), L = st.len, typing = canType();
  const c = COLORS[st.phase === 'setup' ? p : st.phase === 'play' ? st.turn : p];
  let s = '';
  // slots
  const sw = 42, gap = 9, tot = L * sw + (L - 1) * gap, sx = (W - tot) / 2;
  const shown = st.phase === 'setup' && st.secrets[p] !== null && online() ? st.secrets[p] : draft;
  for (let k = 0; k < L; k++) {
    const x = sx + k * (sw + gap), cur = typing && k === draft.length;
    s += `<path class="slot${cur ? ' cur' : ''}" d="${box(`sl${k}_${L}`, x, SLOT, sw, 44, 1)}" stroke="${cur ? c.main : 'var(--ink)'}"/>`;
    if (shown[k] !== undefined) s += txt(x + sw / 2, SLOT + 23, shown[k], { size: 34, color: c.main, cls: k === draft.length - 1 && typing ? 'pop' : '' });
  }
  // digit keys
  const kw = 62, kg = 6, kx = (W - (5 * kw + 4 * kg)) / 2;
  const nt = notes[p];
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach((d, i) => {
    const x = kx + (i % 5) * (kw + kg), y = KEYS + Math.floor(i / 5) * KSTEP;
    const used = !st.rep && draft.includes(String(d));
    const off = notesMode ? !(st.phase === 'play' || st.phase === 'over') : !typing || used || draft.length >= L;
    const mark = nt[d];
    let g = `<path d="${box(`k${d}`, x, y, kw, KH)}" class="key${notesMode ? ' notes' : ''}" />`;
    g += txt(x + kw / 2, y + KH / 2 + 1, d, { size: 30, color: mark === 1 ? 'var(--bc-faint)' : 'var(--ink)' });
    if (mark === 1) g += `<path class="strike" d="${shapeFor('st' + d, () => line(x + kw / 2 - 13, y + KH - 9, x + kw / 2 + 13, y + 9, 1))}"/>`;
    if (mark === 2) g += `<path class="ring" d="${shapeFor('rg' + d, () => circle(x + kw / 2, y + KH / 2 + 1, 15, 16, 0.08))}" stroke="${PALETTE.ink}"/>`;
    s += `<g class="sbtn${off ? ' off' : ''}" data-act="k${d}">${g}</g>`;
  });
  // action row
  const y = KEYS + 2 * KSTEP, x0 = kx, full = kx + 5 * kw + 4 * kg;
  const canNotes = st.phase !== 'setup';
  s += button('bn', 'notes', x0, y, 96, KH, '✎ ' + t('bc.notes'), { on: notesMode, off: !canNotes, size: 21 });
  s += button('bd', 'del', x0 + 104, y, 74, KH, '⌫', { off: !typing || !draft.length, size: 26 });
  const okLabel = st.phase === 'setup' ? t('bc.lock') : t('bc.go');
  const okOff = !typing || draft.length !== L;
  s += button('bo', 'ok', x0 + 186, y, full - x0 - 186, KH, okLabel, { color: okOff ? null : c, off: okOff, size: 24 });
  return s;
}

function cover(p) {
  const c = COLORS[p];
  let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="var(--paper)" opacity=".96"/>`;
  s += `<path class="paper" d="${box('cover', 26, 80, W - 52, 300, 2)}"/>`;
  s += txt(W / 2, 130, t('bc.cover.title'), { size: 32, max: W - 80 });
  s += txt(W / 2, 180, t('bc.cover.who', { name: name(p) }), { size: 26, color: c.main, max: W - 80 });
  s += txt(W / 2, 220, t('bc.cover.note'), { size: 20, color: 'var(--bc-note)', weight: 600, max: W - 80 });
  s += button('cvb', 'uncover', W / 2 - 80, 268, 160, 54, t('bc.cover.btn'), { color: c, size: 28 });
  return s;
}

function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  if (draftFor !== keypadPlayer() + st.phase) { draft = ''; draftFor = keypadPlayer() + st.phase; }
  const setup = st.phase === 'setup' && ready();
  let s = `<path class="divider" d="${shapeFor('div' + setup, () => line(180, 6, 180, setup ? LOG0 - 3 : LOG0 + LOGH, 1.4))}"/>`;
  s += `<path class="rule" d="${shapeFor('rule', () => line(10, LOG0 - 3, W - 10, LOG0 - 3, 0.8))}"/>`;
  s += header(0) + header(1);
  if (setup) s += setupInfo();
  else s += logColumn(0) + logColumn(1);
  s += infoLine();
  s += keypad();
  if (online() && !sess.connected) {
    s += `<rect x="0" y="${LOG0}" width="${W}" height="${H - LOG0}" fill="var(--paper)" opacity=".85"/>`;
    s += txt(W / 2, LOG0 + 110, t('bc.online.wait'), { size: 26, color: 'var(--bc-note)' });
  }
  const cov = coverFor();
  if (cov >= 0) s += cover(cov);
  svg.innerHTML = s;
  fresh = null;
  renderPlayers();
}

function cardLine(p) {
  const sec = st.secrets[p];
  if (st.phase === 'setup') return sec === null ? t('bc.card.choosing') : secretVisible(p) && sec !== '?' ? t('bc.card.secret', { code: sec }) : t('bc.card.ready');
  if (secretVisible(p) && sec && sec !== '?') return t('bc.card.secret', { code: sec });
  return plural(st.guesses[p].length, 'bc.guesses');
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over() && (st.phase === 'setup' ? st.secrets[p] === null : st.turn === p);
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over() || m.pose !== 'down' ? m.pose : active && st.phase === 'play' ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 7 + p * 29 });
    el.querySelector('.score').textContent = cardLine(p);
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  let txtS = '', col = st.turn;
  if (over()) txtS = '';
  else if (online() && !sess.connected) txtS = t('bc.online.wait');
  else if (st.phase === 'setup') {
    const p = keypadPlayer();
    col = p;
    if (coverFor() >= 0) txtS = t('bc.st.cover', { name: name(p) });
    else if (online() && st.secrets[p] !== null) { col = 1 - p; txtS = t('bc.st.setup.wait', { name: name(1 - p) }); }
    else txtS = hotSeat() ? t('bc.st.setup', { name: name(p) }) : t('bc.st.setup.you');
  } else if (BC.lastChance(st)) txtS = t('bc.st.last', { name: name(st.turn) });
  else if (isAI(st.turn)) txtS = t('bc.st.thinking', { name: name(st.turn) });
  else if (online()) txtS = isLocal(st.turn) ? t('bc.st.you') : t('bc.st.them', { name: name(st.turn) });
  else txtS = t('bc.st.turn', { name: name(st.turn) });
  status.textContent = txtS;
  status.style.color = COLORS[col].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over());
  $('#mode').disabled = online();
  $('#len').disabled = !canRestart();
  $('#rep').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('bc.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('bc.online.note') : '';
}

const bubbleTimers = [];
function sayText(p, text) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 2000);
}
const say = (p, key) => sayText(p, t(key));
const later = [];
function sayLater(p, key, ms) { later.push(setTimeout(() => say(p, key), ms)); }
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

function feedbackText(e) {
  if (e.b === st.len) return t('bc.fb.win', { n: st.len });
  if (e.b + e.c === 0) return t('bc.fb.zero');
  return [e.b && plural(e.b, 'bc.bulls'), e.c && plural(e.c, 'bc.closes')].filter(Boolean).join(', ');
}

// The defender announces the answer; the guesser reacts to how much it narrowed things down.
function react(p, e, before) {
  const q = 1 - p;
  sayText(q, feedbackText(e));
  if (e.b === st.len) {
    setMood(p, 'happy', 'up'); setMood(q, 'worried');
    if (!over()) sayLater(q, 'bc.say.last', 1300);
    return;
  }
  const after = possible(st, p);
  if (after === 1) { setMood(p, 'smug', 'wave'); setMood(q, 'worried'); sayLater(p, 'bc.say.know', 1200); }
  else if (after / before <= 0.12) { setMood(p, 'happy', 'wave'); setMood(q, 'worried'); if (Math.random() < 0.6) sayLater(p, e.b + e.c ? 'bc.say.great' : 'bc.say.zero', 1200); }
  else if (after / before >= 0.6) { setMood(p, 'sad'); setMood(q, 'smug'); if (Math.random() < 0.5) sayLater(p, 'bc.say.meh', 1200); }
  else { setMood(p, 'neutral'); if (moods[q].mood !== 'worried') setMood(q, 'neutral'); }
}

// ---------- flow ----------
function clearTimers() { clearTimeout(aiTimer); later.splice(0).forEach(clearTimeout); }

function newGame() {
  clearTimers();
  // the first guesser alternates, but only once a game has actually been played
  const first = !st ? 0 : BC.moves(st) ? 1 - st.first : st.first;
  st = BC.create({ len: +cfg.len, rep: !!+cfg.rep, first });
  if (isAI(1)) BC.setSecret(st, 1, BC.randomCode(st.len, st.rep));
  resetLocal();
  render();
  maybeAI();
}
function resetLocal() {
  gid = Math.floor(Math.random() * 1e9);
  history = []; shapes = {}; draft = ''; draftFor = -1; uncovered = -1; pending = false; notesMode = false;
  notes = [new Array(10).fill(0), new Array(10).fill(0)];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
}

function lockSecret(p, code) {
  if (!BC.setSecret(st, p, code)) return false;
  draft = ''; uncovered = -1;
  setMood(p, 'smug');
  say(p, 'bc.say.locked');
  return true;
}

function play(code) {
  const p = st.turn;
  const before = possible(st, p);
  history.push(BC.clone(st));
  const e = BC.guess(st, code);
  if (!e) { history.pop(); return false; }
  fresh = [p, st.guesses[p].length - 1];
  draft = '';
  react(p, e, before);
  if (over()) finish();
  else render();
  maybeAI();
  return true;
}

function maybeAI() {
  if (st.phase !== 'play' || !isAI(st.turn)) return;
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => { if (st.phase === 'play' && isAI(st.turn)) play(BC.aiGuess(st, cfg.mode)); }, 1100);
}

function finish() {
  const w = st.winner;
  if (w < 0) { setMood(0, 'happy'); setMood(1, 'happy'); sayLater(0, 'bc.say.tie', 1300); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); sayLater(w, 'bc.say.win', 1300); sayLater(1 - w, 'bc.say.lose', 2100); }
  render();
  finishText();
  const g = gid;
  setTimeout(() => { if (over() && g === gid) $('#result').hidden = false; }, 1500);
}

function undo() {
  if (!history.length || online()) return;
  clearTimers();
  do st = history.pop(); while (history.length && isAI(st.turn));
  draft = ''; fresh = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
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
// Host is authoritative and holds both secrets; the guest only ever gets BC.view (host secret hidden until the end).
function sendState() {
  if (!sess?.host) return;
  sess.send('state', { st: BC.view(st, 1), gid, names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimers();
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prev = st;
    const sameGame = d.gid === gid;
    st = d.st;
    remoteNames[0] = d.names[0];
    cfg.len = st.len; cfg.rep = st.rep ? 1 : 0;
    $('#len').value = st.len; $('#rep').value = cfg.rep;
    pending = false;
    if (!sameGame) { resetLocal(); gid = d.gid; }
    // a new log entry arrived: animate and react
    if (sameGame && prev && BC.moves(st) === BC.moves(prev) + 1) {
      const p = st.guesses[0].length > prev.guesses[0].length ? 0 : 1;
      const e = st.guesses[p][st.guesses[p].length - 1];
      fresh = [p, st.guesses[p].length - 1];
      react(p, e, possible(prev, p));
      if (p === 1) draft = '';
    } else if (sameGame && prev && prev.secrets[0] === null && st.secrets[0] !== null) {
      setMood(0, 'smug'); say(0, 'bc.say.locked');
    }
    if (over()) { $('#result').hidden = true; finish(); } else render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('secret', (d) => {
    if (!s.host) return;
    if (st.phase === 'setup' && st.secrets[1] === null) lockSecret(1, d.code);
    render();
    sendState();
  });
  s.on('move', (d) => {
    if (!s.host) return;
    if (d.n !== BC.moves(st) || st.phase !== 'play' || st.turn !== 1 || !play(d.code)) return sendState();
    sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else { resetLocal(); render(); }
}

// ---------- local actions ----------
function submit() {
  if (!canType() || draft.length !== st.len) return;
  const p = keypadPlayer(), code = draft;
  if (st.phase === 'setup') {
    if (!BC.validCode(st.len, st.rep, code)) return;
    if (online() && !sess.host) {
      pending = true;
      st.secrets[1] = code; // shown locally until the host confirms
      draft = '';
      setMood(1, 'smug'); say(1, 'bc.say.locked');
      sess.send('secret', { code });
      return render();
    }
    lockSecret(p, code);
    render();
    if (online()) sendState();
    maybeAI();
    return;
  }
  if (online() && !sess.host) {
    pending = true;
    sess.send('move', { code, n: BC.moves(st) });
    return render();
  }
  if (play(code) && online()) sendState();
}

function press(act) {
  if (act === 'uncover') { uncovered = keypadPlayer(); return render(); }
  if (act === 'notes') { if (st.phase !== 'setup') { notesMode = !notesMode; render(); } return; }
  if (act === 'del') { if (canType() && draft) { draft = draft.slice(0, -1); render(); } return; }
  if (act === 'ok') return submit();
  if (act[0] === 'k') {
    const d = act.slice(1);
    if (notesMode) {
      if (st.phase === 'setup') return;
      const n = notes[keypadPlayer()];
      n[+d] = (n[+d] + 1) % 3;
      return render();
    }
    if (!canType() || draft.length >= st.len || (!st.rep && draft.includes(d))) return;
    draft += d;
    render();
  }
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const g = evt.target.closest('[data-act]');
  if (!g || g.classList.contains('off')) return;
  press(g.dataset.act);
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea') || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[0-9]$/.test(e.key)) press('k' + e.key);
  else if (e.key === 'Backspace') { e.preventDefault(); press('del'); }
  else if (e.key === 'Enter') { e.preventDefault(); press(coverFor() >= 0 ? 'uncover' : 'ok'); } // not also a focused toolbar button
  else if (e.key === 'n' || e.key === 'N') press('notes');
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#len').addEventListener('change', (e) => { cfg.len = +e.target.value; saveCfg(); restart(); });
$('#rep').addEventListener('change', (e) => { cfg.rep = +e.target.value; saveCfg(); restart(); });
$('#count').addEventListener('change', (e) => { cfg.count = +e.target.value; saveCfg(); render(); });
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
document.addEventListener('mg:lang', () => { render(); if (over()) finishText(); });
function finishText() {
  const w = st.winner, n = plural(st.guesses[w < 0 ? 0 : w].length, 'bc.guesses');
  $('#result-text').textContent = w < 0 ? t('bc.tie') : t('bc.win', { name: name(w) });
  $('#result-text').style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-sub').textContent = (w < 0 ? t('bc.tie.sub', { n }) : t('bc.win.sub', { n }));
  $('#result-next').textContent = t('bc.next', { name: name(1 - st.first) });
}

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#len').value = cfg.len;
$('#rep').value = cfg.rep;
$('#count').value = cfg.count;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
