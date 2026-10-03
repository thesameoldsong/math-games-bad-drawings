import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { MED } from './engine.js';
import './strings.js';

const SLUG = 'mediocrity';
const GREEN = { main: '#3aa655', dark: '#1f7a37', fill: '#97d9a8' };
const COLORS = [PALETTE.blue, PALETTE.red, GREEN];
const P3 = [0, 1, 2];
const W = 360, H = 430;
const NAP = [60, 180, 300];               // napkin centres
const PANEL = 90, GRID_X = 13, STEP = 42, CELL = 40, COLS = 8;
const TABLE = 328;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ rounds: 5, humans: 1, level: 'normal', names: ['', '', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, pendingAct = false;
let sel = null;          // highlighted number in the grid (not yet locked in)
let reveal = null;       // index into st.log shown as "round result" until dismissed
let uncovered = null;    // hot-seat: the player who confirmed "it's me" for the current pick
let finished = false;    // result card shown for this game
let sess = null;         // online session, null when local
const remoteNames = ['', '', ''];
const moods = P3.map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => (online() ? p === 2 : p >= cfg.humans);
const isRemote = (p) => online() && p !== mySeat() && (p !== 2 || !sess.host);
const isLocal = (p) => !isAI(p) && !isRemote(p);
const runsAI = () => !online() || sess.host;
const localHumans = () => P3.filter((p) => isLocal(p)).length;
const hotSeat = () => !online() && localHumans() > 1;
const ready = () => !online() || sess.connected;
function name(p) {
  if (isAI(p)) return online() ? t('med.cpu2') : t(p === 1 ? 'med.cpu1' : 'med.cpu2');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('med.p' + p);
}
const level = () => cfg.level;

// The local human who has to pick right now (hot-seat goes in seat order).
function localPicker() {
  if (st.phase !== 'pick' || reveal !== null || !ready() || pendingAct) return -1;
  return MED.waitingFor(st).find((p) => isLocal(p)) ?? -1;
}
const localChooser = () =>
  (st.phase === 'assign' || st.phase === 'crown') && reveal === null && ready() && !pendingAct && isLocal(st.pending.chooser)
    ? st.pending.chooser : -1;

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function txt(x, y, s, { size = 22, color = 'var(--ink)', cls = '', anchor = 'middle', max = 330, weight = 700 } = {}) {
  const fit = String(s).length * size * 0.43 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="t ${cls}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${fit}>${esc(s)}</text>`;
}
function box(k, x, y, w, h) {
  return shapeFor(k, () => line(x, y, x + w, y, 1.2) + ' ' + line(x + w, y, x + w, y + h, 1.2).replace('M', 'L') + ' ' +
    line(x + w, y + h, x, y + h, 1.2).replace('M', 'L') + ' ' + line(x, y + h, x, y, 1.2).replace('M', 'L'));
}
function button(k, act, x, y, w, h, label, color = null, disabled = false) {
  const c = color ? color.main : 'var(--ink)';
  const fill = color ? color.main : '#fff';
  return `<g class="sbtn${disabled ? ' off' : ''}" data-act="${act}">
    <path d="${box(k, x, y, w, h)}" fill="${fill}" stroke="${color ? color.dark : c}" stroke-width="2.6" stroke-linejoin="round"/>
    ${txt(x + w / 2, y + h / 2 + 1, label, { size: 24, color: color ? '#fff' : c, max: w - 14 })}</g>`;
}

// ---------- napkins (one per player) ----------
function napkin(p, mode, value, star) {
  const cx = NAP[p], x = cx - 48, y = 6, w = 96, h = 70, c = COLORS[p];
  let s = `<path class="nap" d="${box('nap' + p, x, y, w, h)}"/>`;
  s += `<path d="${shapeFor('napc' + p, () => line(x + 6, y + 8, x + 30, y + 8, 1))}" stroke="${c.main}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  if (mode === 'empty') {
    s += txt(cx, y + 40, '…', { size: 30, color: 'var(--pencil)' });
  } else if (mode === 'folded') {
    // a folded corner + question mark
    s += `<path d="M${x + w - 26} ${y} L${x + w} ${y + 26} L${x + w - 26} ${y + 26} Z" fill="#f2efe6" stroke="var(--pencil)" stroke-width="2" stroke-linejoin="round"/>`;
    s += txt(cx - 6, y + 42, value === null ? '?' : value, { size: value === null ? 38 : 30, color: c.main, cls: value === null ? '' : 'mine' });
  } else {
    s += txt(cx, y + 41, value, { size: 44, color: c.main, cls: 'num pop' });
    if (star) s += `<path class="ring" d="${shapeFor('ring' + p, () => circle(cx, y + 40, 31, 27, 0.08))}" stroke="${c.dark}"/>`;
  }
  return s;
}

function napkins() {
  let s = '';
  let shown = null, winner = -1;
  if (reveal !== null) { const e = st.log[reveal]; shown = e.picks; winner = e.to; }
  else if (st.phase === 'assign') shown = st.picks;
  for (const p of P3) {
    if (shown) {
      const med = winner >= 0 ? p === winner : st.phase === 'assign' && reveal === null && st.pending.tied.includes(p);
      s += napkin(p, 'open', shown[p], med);
    } else if (st.phase === 'pick') {
      const v = st.picks[p];
      if (v === null) s += napkin(p, 'empty');
      else s += napkin(p, 'folded', isLocal(p) && !hotSeat() && v >= 0 ? v : null);
    } else {
      s += napkin(p, 'open', st.scores[p], st.phase === 'over' && st.winner === p);
    }
  }
  return s;
}

// ---------- number line used by the reveal / assign panels ----------
function numberLine(picks, hi, y = PANEL + 60) {
  const x0 = 28, x1 = 332, X = (v) => x0 + ((x1 - x0) * v) / st.max;
  let s = `<path class="axis" d="${shapeFor('axis', () => line(x0, y, x1, y, 1.2))}"/>`;
  for (let v = 0; v <= st.max; v += 5) {
    s += `<path class="tick" d="M${X(v)} ${y - 5} L${X(v)} ${y + 5}"/>`;
    s += txt(X(v), y + 24, v, { size: 17, color: '#888', weight: 600 });
  }
  const seen = {};
  for (const p of P3) {
    const v = picks[p], k = (seen[v] = (seen[v] || 0) + 1) - 1;
    const cy = y - 14 - k * 22, c = COLORS[p];
    s += `<circle cx="${X(v)}" cy="${cy}" r="9" fill="${c.main}" stroke="${c.dark}" stroke-width="2"/>`;
    if (hi.includes(p)) s += `<path class="ring" d="${circle(X(v), cy, 14, 14, 0.06)}" stroke="${c.dark}"/>`;
  }
  return s;
}

// ---------- panels ----------
function gridPanel(p) {
  let s = '';
  for (let v = 0; v <= st.max; v++) {
    const r = Math.floor(v / COLS), c = v % COLS, x = GRID_X + c * STEP, y = PANEL + 2 + r * STEP;
    const on = v === sel, col = COLORS[p];
    s += `<g class="cell${on ? ' on' : ''}" data-num="${v}">
      <path d="${box('c' + v, x, y, CELL, CELL)}" fill="${on ? col.main : '#fff'}" stroke="${on ? col.dark : 'var(--pencil)'}" stroke-width="2"/>
      ${txt(x + CELL / 2, y + CELL / 2 + 1, v, { size: 24, color: on ? '#fff' : 'var(--ink)' })}</g>`;
  }
  const label = sel === null ? t('med.choose') : t('med.confirm', { x: sel });
  s += button('ok', 'lock', 80, PANEL + 178, 200, 44, label, sel === null ? null : COLORS[p], sel === null);
  return s;
}

function coverPanel(p) {
  return txt(180, PANEL + 52, t('med.cover.title'), { size: 26, color: '#666' }) +
    txt(180, PANEL + 104, name(p), { size: 48, color: COLORS[p].main }) +
    txt(180, PANEL + 140, t('med.cover.note'), { size: 21, color: '#888', weight: 600 }) +
    button('cov', 'uncover', 70, PANEL + 178, 220, 44, t('med.cover.btn'), COLORS[p]);
}

function revealPanel(e) {
  let s = numberLine(e.picks, e.to >= 0 ? [e.to] : []);
  let line1, color = 'var(--ink)';
  if (e.to < 0) line1 = t('med.rev.triple', { v: e.value });
  else if (e.chooser >= 0) { line1 = t('med.rev.gave', { chooser: name(e.chooser), v: e.value, name: name(e.to) }); color = COLORS[e.to].main; }
  else { line1 = t(e.value ? 'med.rev.single' : 'med.rev.zero', { name: name(e.to), v: e.value }); color = COLORS[e.to].main; }
  s += txt(180, PANEL + 140, line1, { size: 25, color });
  const last = reveal === st.log.length - 1 && st.phase !== 'pick';
  s += button('next', 'next', 110, PANEL + 178, 140, 44, t(last ? 'med.next.final' : 'med.next'));
  return s;
}

function choicePanel() {
  const { value, chooser, tied } = st.pending;
  const crown = st.phase === 'crown';
  let s = '';
  if (!crown) s += numberLine(st.picks, tied);
  else s += crownBars();
  const [a, b] = tied;
  s += txt(180, PANEL + 120, t(crown ? 'med.crown.line' : 'med.tie.line', { a: name(a), b: name(b), v: value }), { size: 22, color: '#555' });
  const me = localChooser() === chooser;
  s += txt(180, PANEL + 152, t(me ? (crown ? 'med.crown.you' : 'med.assign.you') : (crown ? 'med.crown.wait' : 'med.assign.wait'), { name: name(chooser), v: value }),
    { size: 25, color: COLORS[chooser].main });
  if (me) {
    s += button('ch0', 'give:' + a, 22, PANEL + 178, 150, 44, name(a), COLORS[a]);
    s += button('ch1', 'give:' + b, 188, PANEL + 178, 150, 44, name(b), COLORS[b]);
  }
  return s;
}

// final totals as three crayon bars (shown while crowning)
function crownBars() {
  const top = Math.max(1, ...st.scores), base = PANEL + 86;
  let s = '';
  for (const p of P3) {
    const h = Math.max(3, (st.scores[p] / top) * 64), x = NAP[p] - 22;
    s += `<rect x="${x}" y="${base - h}" width="44" height="${h}" fill="${COLORS[p].main}" filter="url(#mg-crayon)"/>`;
  }
  s += `<path class="axis" d="${shapeFor('bars', () => line(20, base, 340, base, 1))}"/>`;
  return s;
}

function waitPanel() {
  let s = '';
  const mine = P3.find((p) => isLocal(p) && st.picks[p] !== null && st.picks[p] >= 0);
  if (mine !== undefined && !hotSeat()) s += txt(180, PANEL + 70, t('med.mine', { x: st.picks[mine] }), { size: 30, color: COLORS[mine].main });
  const waiting = MED.waitingFor(st);
  if (waiting.length) s += txt(180, PANEL + 120, t('med.pick.wait', { names: waiting.map(name).join(', ') }), { size: 23, color: '#777', weight: 600 });
  s += `<g class="dots">${[0, 1, 2].map((i) => `<circle cx="${165 + i * 15}" cy="${PANEL + 150}" r="4" fill="var(--pencil)" style="animation-delay:${i * 0.2}s"/>`).join('')}</g>`;
  return s;
}

// ---------- score table ----------
function table() {
  const n = st.rounds, cw = n > 7 ? 30 : 36, totalW = 46, labW = 22;
  const x0 = (W - (labW + n * cw + totalW)) / 2, y0 = TABLE + 4, rh = 22;
  let s = `<path class="rule" d="${shapeFor('rule' + n, () => line(x0, y0 + 15, W - x0, y0 + 15, 0.8))}"/>`;
  for (let r = 0; r < n; r++) {
    const cx = x0 + labW + r * cw + cw / 2, cur = r === st.round && st.phase !== 'over' && st.phase !== 'crown';
    s += txt(cx, y0, r + 1, { size: 17, color: cur ? 'var(--ink)' : '#aaa', weight: cur ? 700 : 600 });
    if (cur) s += `<path class="cur" d="${shapeFor('cur' + r + '_' + n, () => circle(cx, y0, 11, 11, 0.08))}"/>`;
  }
  s += txt(x0 + labW + n * cw + totalW / 2, y0, 'Σ', { size: 18, color: '#888' });
  for (const p of P3) {
    const y = y0 + 16 + (p + 1) * rh - 4;
    s += `<circle cx="${x0 + 8}" cy="${y}" r="6" fill="${COLORS[p].main}"/>`;
    st.log.forEach((e, r) => {
      const cx = x0 + labW + r * cw + cw / 2, got = e.to === p;
      s += txt(cx, y, e.picks[p], { size: got ? 21 : 18, color: got ? COLORS[p].main : '#999', weight: got ? 700 : 500 });
      if (got) s += `<path d="${shapeFor(`u${r}_${p}`, () => line(cx - 10, y + 11, cx + 10, y + 11, 0.8))}" stroke="${COLORS[p].main}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    });
    s += txt(x0 + labW + n * cw + totalW / 2, y, st.scores[p], { size: 22, color: COLORS[p].main });
  }
  return s;
}

// ---------- render ----------
function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let s = napkins();
  const lp = localPicker(), lc = localChooser();
  if (reveal !== null) s += revealPanel(st.log[reveal]);
  else if (st.phase === 'assign' || st.phase === 'crown') s += choicePanel();
  else if (st.phase === 'over') s += '';
  else if (lp >= 0 && hotSeat() && uncovered !== lp) s += coverPanel(lp);
  else if (lp >= 0) s += gridPanel(lp);
  else s += waitPanel();
  s += table();
  svg.innerHTML = s;
  svg.dataset.lp = lp; svg.dataset.lc = lc;
  renderPlayers();
}

function statusLine() {
  if (online() && !sess.connected) return [t('med.online.wait'), 'var(--ink)'];
  const round = t('med.round', { r: Math.min(st.round + 1, st.rounds), n: st.rounds });
  if (reveal !== null) return [t('med.round', { r: reveal + 1, n: st.rounds }), 'var(--ink)'];
  if (st.phase === 'over') return ['', 'var(--ink)'];
  if (st.phase !== 'pick') {
    const c = st.pending.chooser;
    if (localChooser() === c) return [round, 'var(--ink)'];
    if (isAI(c) && !isRemote(c)) return [t('med.thinking', { name: name(c) }), COLORS[c].main];
    return [t(st.phase === 'crown' ? 'med.crown.wait' : 'med.assign.wait', { name: name(c), v: st.pending.value }), COLORS[c].main];
  }
  const lp = localPicker();
  if (lp >= 0 && hotSeat() && uncovered !== lp) return [t('med.cover.status', { name: name(lp) }), COLORS[lp].main];
  if (lp >= 0) return [online() || localHumans() === 1 ? `${t('med.pick.you.online')} · ${round}` : t('med.pick.you', { name: name(lp) }), COLORS[lp].main];
  const w = MED.waitingFor(st);
  if (w.length === 1 && isAI(w[0])) return [t('med.thinking', { name: name(w[0]) }), COLORS[w[0]].main];
  return [round, 'var(--ink)'];
}

function renderPlayers() {
  const waiting = reveal === null ? MED.waitingFor(st) : [];
  for (const p of P3) {
    const el = $(`.player.p${p}`);
    const active = waiting.includes(p);
    el.classList.toggle('active', active || st.phase === 'over' || reveal !== null);
    const m = moods[p];
    const pose = m.pose !== 'down' ? m.pose : active && st.phase !== 'pick' ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 2 ? 'left' : 'right', seed: 11 + p * 31 });
    el.querySelector('.score').textContent = plural(st.scores[p], 'med.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const [s, c] = statusLine();
  const status = $('#status');
  status.textContent = s;
  status.style.color = c;

  $('#undo').disabled = online() || !history.length;
  $('#humans').disabled = online();
  $('#level').disabled = online() && !sess.host;
  $('#rounds').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('med.online.waitnew', { name: name(1 - mySeat()) });
  $('#level-field').hidden = !online() && cfg.humans >= 3;
  $('#settings-note').textContent = online() ? t('med.online.note') : '';
}

// ---------- bubbles & moods ----------
const bubbleTimers = [];
function say(p, key, vars) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key, vars);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const calm = () => P3.forEach((p) => setMood(p, 'neutral'));

// React to what changed between two states (works the same on host, guest and locally).
function react(prev, next) {
  if (next.log.length > prev.log.length) {
    const e = next.log[next.log.length - 1];
    calm();
    if (e.to < 0) { P3.forEach((p) => setMood(p, 'worried')); say(0, 'med.say.triple'); setTimeout(() => say(2, 'med.say.triple'), 500); }
    else if (e.chooser >= 0) {
      const snub = P3.find((p) => p !== e.to && p !== e.chooser);
      setMood(e.to, 'happy', 'wave'); setMood(snub, 'sad'); setMood(e.chooser, 'smug');
      say(e.to, 'med.say.thanks'); setTimeout(() => say(snub, 'med.say.snub'), 600);
    } else {
      setMood(e.to, 'happy', e.value >= 15 ? 'up' : 'wave');
      say(e.to, e.value ? 'med.say.gain' : 'med.say.zero', { v: e.value });
      // whoever was closest to stealing the middle grumbles
      const others = P3.filter((p) => p !== e.to);
      const near = others.reduce((a, b) => (Math.abs(e.picks[a] - e.value) <= Math.abs(e.picks[b] - e.value) ? a : b));
      if (Math.abs(e.picks[near] - e.value) <= 3) { setMood(near, 'sad'); setTimeout(() => say(near, 'med.say.miss'), 700); }
    }
  } else if ((next.phase === 'assign' || next.phase === 'crown') && prev.phase !== next.phase) {
    const { chooser, tied } = next.pending;
    calm();
    setMood(chooser, 'smug', 'point'); tied.forEach((p) => setMood(p, 'worried'));
    say(chooser, 'med.say.choose');
  } else if (next.phase === 'pick') {
    for (const p of P3) if (prev.picks[p] === null && next.picks[p] !== null && Math.random() < 0.45) say(p, 'med.say.picked');
  }
}

// ---------- flow ----------
function setState(next, { snapshot = false } = {}) {
  const prev = st;
  if (snapshot && !online()) history.push(MED.clone(prev));
  st = next;
  if (prev && st.log.length > prev.log.length) reveal = st.log.length - 1;
  if (prev && st.log.length < prev.log.length) reveal = null;
  if (st.picks.every((v) => v === null)) sel = null;
  if (prev) react(prev, st);
  pendingAct = false;
  if (prev && prev.phase === 'crown' && st.phase === 'over') reveal = null;
  if (st.phase === 'over' && reveal === null) finish();
  render();
  if (online() && sess.host) sendState();
  tick();
}

function act(kind, p, x) {
  if (online() && !sess.host) {
    pendingAct = true;
    sess.send('act', { kind, x, n: st.n, round: st.round, phase: st.phase });
    render();
    return;
  }
  const next = MED.clone(st);
  const ok = kind === 'pick' ? MED.pick(next, p, x) : kind === 'assign' ? MED.assign(next, p, x) : MED.crown(next, p, x);
  if (ok) setState(next, { snapshot: isLocal(p) });
}

function newGame() {
  clearTimeout(aiTimer);
  st = MED.create({ rounds: cfg.rounds });
  history = []; shapes = {}; sel = null; reveal = null; uncovered = null; finished = false; pendingAct = false;
  calm();
  $('#result').hidden = true;
  render();
  if (online() && sess.host) sendState();
  tick();
}

// Computer moves (on the host when online). AI picks never look at the others' current numbers.
function tick() {
  clearTimeout(aiTimer);
  if (!runsAI() || !ready()) return;
  if (st.phase === 'pick') {
    const p = MED.waitingFor(st).find((q) => isAI(q));
    if (p === undefined) return;
    aiTimer = setTimeout(() => {
      const view = MED.redact(st, p);
      act('pick', p, MED.aiPick(view, p, level()));
    }, 500 + Math.random() * 700);
  } else if ((st.phase === 'assign' || st.phase === 'crown') && isAI(st.pending.chooser)) {
    if (reveal !== null && !online()) return;
    const p = st.pending.chooser;
    aiTimer = setTimeout(() => act(st.phase === 'assign' ? 'assign' : 'crown', p, MED.aiAssign(st, p, level())), 1300);
  }
}

function finish() {
  if (finished) return;
  finished = true;
  const w = st.winner;
  const scoresTxt = st.scores.join(' · ');
  if (w < 0) { P3.forEach((p) => setMood(p, 'worried')); say(1, 'med.say.draw'); }
  else {
    calm();
    setMood(w, 'happy', 'up'); say(w, 'med.say.win');
    const others = P3.filter((p) => p !== w).sort((a, b) => st.scores[b] - st.scores[a]);
    setMood(others[0], 'sad'); setMood(others[1], 'sad');
    setTimeout(() => say(others[0], 'med.say.top'), 700);
    setTimeout(() => say(others[1], 'med.say.bottom'), 1400);
  }
  const tx = $('#result-text');
  tx.textContent = w < 0 ? t('med.draw') : t('med.win', { name: name(w) });
  tx.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-sub').textContent = t(w < 0 ? 'med.draw.sub' : 'med.win.sub', { s: scoresTxt });
  setTimeout(() => { if (finished && st.phase === 'over') $('#result').hidden = false; }, 1000);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  st = history.pop();
  // The computers pick again: their old numbers may already have been seen in the reveal.
  if (st.phase === 'pick') st.picks = st.picks.map((v, p) => (isAI(p) ? null : v));
  sel = null; reveal = null; uncovered = null; finished = false; pendingAct = false;
  calm();
  $('#result').hidden = true;
  render();
  tick();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
}

// ---------- online ----------
// Host keeps every secret: the guest gets a copy of the state with the other numbers blanked out while picking.
function sendState() {
  sess.send('state', { st: MED.redact(st, 1), names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => { render(); tick(); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
    tick();
  });
  let synced = false;   // the first state after (re)joining is taken as is, without replaying the last reveal
  s.on('state', (d) => {
    if (s.host) return;
    remoteNames[0] = d.names[0];
    const fresh = !synced || d.st.n < st.n || d.st.log.length < st.log.length || d.st.rounds !== st.rounds;
    synced = true;
    if (fresh || (d.st.n === 0 && st.n !== 0)) {
      st = d.st; reveal = null; finished = false; sel = null; pendingAct = false; shapes = {};
      calm(); $('#result').hidden = true;
      cfg.rounds = st.rounds; $('#rounds').value = st.rounds;
      if (st.phase === 'over') finish();
      render();
      return;
    }
    setState(d.st);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('act', (d) => {
    if (!s.host) return;
    // Picks are checked by round (the computer may pick in between); choices must match the phase.
    if (d.round !== st.round || d.phase !== st.phase) return sendState();
    const next = MED.clone(st);
    const ok = d.kind === 'pick' ? MED.pick(next, 1, d.x) : d.kind === 'assign' ? MED.assign(next, 1, d.x) : MED.crown(next, 1, d.x);
    if (ok) setState(next); else sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else { newGame(); s.send('resync'); }
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const cell = evt.target.closest('.cell');
  const lp = localPicker();
  if (cell && lp >= 0) {
    const v = +cell.dataset.num;
    sel = v;
    return render();
  }
  const b = evt.target.closest('.sbtn');
  if (!b || b.classList.contains('off')) return;
  const a = b.dataset.act;
  if (a === 'uncover') { uncovered = lp; sel = null; render(); }
  else if (a === 'lock' && lp >= 0 && sel !== null) { const x = sel; sel = null; uncovered = null; act('pick', lp, x); }
  else if (a === 'next') {
    reveal = null;
    if (st.phase === 'over') finish();
    render(); tick();
  } else if (a.startsWith('give:')) {
    const c = localChooser();
    if (c >= 0) act(st.phase === 'assign' ? 'assign' : 'crown', c, +a.slice(5));
  }
});

$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
$('#humans').addEventListener('change', (e) => { cfg.humans = +e.target.value; saveCfg(); newGame(); });
$('#level').addEventListener('change', (e) => { cfg.level = e.target.value; saveCfg(); render(); });
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
$('#rounds').value = cfg.rounds;
$('#humans').value = cfg.humans;
$('#level').value = cfg.level;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
