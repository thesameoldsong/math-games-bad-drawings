import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, injectDefs, figureSVG } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { PB } from './engine.js';
import './strings.js';

const SLUG = 'paper-boxing';
const COLORS = [PALETTE.blue, PALETTE.red];
const W = 360, H = 328;
const CS = 40, GX = [12, 188], GY = 8;          // cell size, grid origins
const PANEL = 178;                              // top of the button/hint strip
const LOG = 256;                                // top of the round table
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', rules: 'secret', boards: 'arrange', names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer;
let drafts = [null, null];   // set-up: local arrangements not yet submitted
let swapSel = null;          // set-up: first square tapped for a swap
let sel = null;              // pick: highlighted (not yet locked) square
let uncovered = null;        // hot-seat: who pressed "it's me" behind the cover
let pendingAct = false;      // guest waiting for the host to confirm an action
let finished = false;
let freshRound = false;      // animate the newest path segment
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
function name(p) {
  if (isAI(p)) return t('pb.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('pb.p' + p);
}
// hot-seat order alternates each round, so whoever chose last also chooses first next round (one hand-over per round)
const order = () => (st.round % 2 ? [1, 0] : [0, 1]);

function localArranger() {
  if (st.phase !== 'setup' || !ready() || pendingAct) return -1;
  return order().find((p) => isLocal(p) && !PB.isReady(st, p)) ?? -1;
}
function localPicker() {
  if (st.phase !== 'pick' || !ready() || pendingAct) return -1;
  const w = PB.waitingFor(st);
  return order().find((p) => w.includes(p) && isLocal(p)) ?? -1;
}
// a hand-over cover is needed before someone acts in secret at a shared screen
function coverFor() {
  if (!hotSeat()) return -1;
  const a = localArranger();
  if (a >= 0) return uncovered === a ? -1 : a;
  const p = localPicker();
  if (p >= 0 && st.mode !== 'open') return uncovered === p ? -1 : p;
  return -1;
}
function gridVisible(p) {
  if (st.phase !== 'setup') return true;
  if (coverFor() >= 0) return false;
  return localArranger() === p;
}
const gridOf = (p) => (st.phase === 'setup' && localArranger() === p ? drafts[p] : st.grids[p]);

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function txt(x, y, s, { size = 22, color = 'var(--ink)', cls = '', anchor = 'middle', max = 340, weight = 700 } = {}) {
  const fit = String(s).length * size * 0.42 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="t ${cls}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${fit}>${esc(s)}</text>`;
}
function box(k, x, y, w, h) {
  return shapeFor(k, () => line(x, y, x + w, y, 1.2) + ' ' + line(x + w, y, x + w, y + h, 1.2).replace('M', 'L') + ' ' +
    line(x + w, y + h, x, y + h, 1.2).replace('M', 'L') + ' ' + line(x, y + h, x, y, 1.2).replace('M', 'L'));
}
function button(k, act, x, y, w, h, label, color = null, disabled = false) {
  const fill = color ? color.main : '#fff';
  return `<g class="sbtn${disabled ? ' off' : ''}" data-act="${act}">
    <path d="${box(k, x, y, w, h)}" fill="${fill}" stroke="${color ? color.dark : 'var(--ink)'}" stroke-width="2.6" stroke-linejoin="round"/>
    ${txt(x + w / 2, y + h / 2 + 1, label, { size: 23, color: color ? '#fff' : 'var(--ink)', max: w - 14 })}</g>`;
}
const cellXY = (p, i) => [GX[p] + (i % 4) * CS, GY + Math.floor(i / 4) * CS];
const centre = (p, i) => { const [x, y] = cellXY(p, i); return [x + CS / 2, y + CS / 2]; };

// ---------- grids ----------
function gridLines(p) {
  const x0 = GX[p], y0 = GY, n = 4 * CS;
  let d = '';
  for (let k = 0; k <= 4; k++) {
    d += shapeFor(`gh${p}_${k}`, () => line(x0 - 2, y0 + k * CS, x0 + n + 2, y0 + k * CS, 1.1)) + ' ';
    d += shapeFor(`gv${p}_${k}`, () => line(x0 + k * CS, y0 - 2, x0 + k * CS, y0 + n + 2, 1.1)) + ' ';
  }
  return `<path class="grid" d="${d}"/>`;
}

function hiddenGrid(p) {
  const x0 = GX[p], y0 = GY, n = 4 * CS, c = COLORS[p];
  let s = `<rect x="${x0}" y="${y0}" width="${n}" height="${n}" fill="${c.fill}" opacity=".35" filter="url(#mg-crayon)"/>`;
  let d = '';
  for (let k = 1; k < 16; k++) d += shapeFor(`hh${p}_${k}`, () => line(x0 + Math.max(0, k * 20 - n), y0 + Math.min(n, k * 20), x0 + Math.min(n, k * 20), y0 + Math.max(0, k * 20 - n), 1.5)) + ' ';
  s += `<path class="hatch" d="${d}" stroke="${c.main}"/>`;
  s += gridLines(p);
  const done = PB.isReady(st, p);
  const lab = done ? '✓ ' + t('pb.ready') : '?';
  s += txt(x0 + n / 2, y0 + n / 2, lab, { size: done ? 30 : 64, color: c.dark, cls: 'halo' });
  return s;
}

function gridView(p) {
  if (!gridVisible(p)) return hiddenGrid(p);
  const g = gridOf(p), c = COLORS[p];
  const setup = st.phase === 'setup';
  const lp = localPicker(), cov = coverFor();
  const legal = !setup && lp === p && cov < 0 ? PB.moves(st, p) : [];
  const path = st.path[p];
  const lastC = st.log.length ? st.log[st.log.length - 1].c[p] : -1;
  const shown = typeof st.picks[p] === 'number' && (st.mode === 'open' || (isLocal(p) && !hotSeat())) ? st.picks[p] : -1;
  const isOn = (i) => (setup ? swapSel === i && localArranger() === p : (sel === i && lp === p) || shown === i);
  let s = '';
  // tints: visited squares, legal options, selection
  for (let i = 1; i < 16; i++) {
    const [x, y] = cellXY(p, i);
    const on = isOn(i);
    if (on) s += `<rect x="${x + 3}" y="${y + 3}" width="${CS - 6}" height="${CS - 6}" rx="4" fill="${c.main}"/>`;
    else if (!setup && path.includes(i)) s += `<rect x="${x + 2}" y="${y + 2}" width="${CS - 4}" height="${CS - 4}" fill="${c.fill}" opacity=".45" filter="url(#mg-crayon)"/>`;
    else if (legal.includes(i)) s += `<rect class="opt" x="${x + 4}" y="${y + 4}" width="${CS - 8}" height="${CS - 8}" rx="6" stroke="${c.main}"/>`;
  }
  s += gridLines(p);
  // the blank start square
  const [sx, sy] = centre(p, 0);
  s += `<path d="${shapeFor('st' + p, () => circle(sx, sy, 5, 5, 0.1))}" fill="${c.main}" stroke="${c.dark}" stroke-width="1.5"/>`;
  // path line
  if (!setup && path.length > 1) {
    for (let k = 1; k < path.length; k++) {
      const [a, b] = centre(p, path[k - 1]), [x2, y2] = centre(p, path[k]);
      const d = shapeFor(`pa${p}_${path[k - 1]}_${path[k]}`, () => line(a, b, x2, y2, 1.6));
      const fresh = freshRound && k === path.length - 1 && lastC === path[k];
      s += `<path class="path${fresh ? ' fresh' : ''}" d="${d}" stroke="${c.main}" pathLength="1"/>`;
    }
  }
  // numbers
  for (let i = 1; i < 16; i++) {
    const [x, y] = centre(p, i);
    const on = isOn(i);
    const used = !setup && path.includes(i);
    s += txt(x, y + 1, g[i], { size: 26, color: on ? '#fff' : used ? c.dark : c.main, cls: 'num' + (used ? ' used' : on ? '' : ' halo-s') });
  }
  // current square
  if (!setup && st.phase !== 'over') {
    const [cx, cy] = centre(p, st.pos[p]);
    s += `<path class="ring" d="${shapeFor(`ring${p}_${st.pos[p]}`, () => circle(cx, cy, 17, 17, 0.08))}" stroke="${c.dark}"/>`;
    if (PB.trapped(st, p)) {
      const [x, y] = cellXY(p, st.pos[p]);
      s += `<path class="cross" d="${shapeFor('x' + p + st.pos[p], () => line(x + 6, y + 6, x + CS - 6, y + CS - 6, 1) + ' ' + line(x + CS - 6, y + 6, x + 6, y + CS - 6, 1))}"/>`;
    }
  }
  // hit areas
  if (setup ? localArranger() === p && cov < 0 : legal.length) {
    for (let i = 1; i < 16; i++) {
      if (!setup && !legal.includes(i)) continue;
      const [x, y] = cellXY(p, i);
      s += `<rect class="cell" data-p="${p}" data-i="${i}" x="${x}" y="${y}" width="${CS}" height="${CS}"/>`;
    }
  }
  return s;
}

// ---------- strip under the grids ----------
function lastLine() {
  const e = st.log[st.log.length - 1];
  if (!e) return null;
  const r = st.log.length, [a, b] = e.v;
  if (e.w < 0) return [t('pb.last.tie', { r, a, b }), '#777'];
  return [t('pb.last.win', { r, a, b, name: name(e.w) }), COLORS[e.w].main];
}

function panel() {
  const y = PANEL, cov = coverFor();
  if (online() && !sess.connected) return '';
  if (cov >= 0) {
    return txt(112, y + 30, t('pb.cover.title', { name: name(cov) }), { size: 23, color: COLORS[cov].main, max: 200 }) +
      txt(112, y + 56, t('pb.cover.note'), { size: 19, color: '#999', weight: 600, max: 200 }) +
      button('cov', 'uncover', 228, y + 20, 120, 44, t('pb.cover.btn'), COLORS[cov]);
  }
  if (st.phase === 'setup') {
    const a = localArranger();
    if (a >= 0) {
      return txt(180, y + 12, t('pb.setup.hint'), { size: 19, color: '#777', weight: 600 }) +
        button('shuf', 'shuffle', 36, y + 28, 136, 44, t('pb.shuffle')) +
        button('rdy', 'ready', 188, y + 28, 136, 44, t('pb.ready'), COLORS[a]);
    }
    const other = [0, 1].find((p) => !PB.isReady(st, p));
    return other === undefined ? '' : txt(180, y + 40, t('pb.setup.wait', { name: name(other) }), { size: 22, color: '#777' });
  }
  let s = '';
  const last = lastLine();
  const lp = localPicker();
  if (lp >= 0) {
    if (last) s += txt(180, y + 12, last[0], { size: 19, color: last[1], weight: 600 });
    else s += txt(180, y + 12, t('pb.tap'), { size: 19, color: '#777', weight: 600 });
    const label = sel === null ? t('pb.choose') : t('pb.punch', { x: st.grids[lp][sel] });
    s += button('ok', 'lock', 100, y + 28, 160, 44, label, sel === null ? null : COLORS[lp], sel === null);
    return s;
  }
  if (last) s += txt(180, y + 24, last[0], { size: 22, color: last[1] });
  if (st.phase === 'pick') {
    const notes = [];
    for (const p of [0, 1]) {
      if (PB.trapped(st, p)) notes.push([t('pb.trapped', { name: name(p) }), COLORS[p].main]);
      else if (st.picks[p] !== null && st.mode !== 'open') notes.push([t('pb.picked', { name: name(p) }), COLORS[p].main]);
    }
    notes.slice(0, 1).forEach(([n, c]) => (s += txt(180, y + 56, n, { size: 20, color: c, weight: 600 })));
    if (!notes.length) s += `<g class="dots">${[0, 1, 2].map((i) => `<circle cx="${165 + i * 15}" cy="${y + 56}" r="4" fill="var(--pencil)" style="animation-delay:${i * 0.2}s"/>`).join('')}</g>`;
  }
  return s;
}

// ---------- round table ----------
function table() {
  const x0 = 4, lab = 22, cw = 22, y0 = LOG + 8, rh = 22;
  let s = `<path class="rule" d="${shapeFor('rule', () => line(x0, y0 + 11, W - x0, y0 + 11, 0.6))}"/>`;
  for (let r = 0; r < 15; r++) {
    const cx = x0 + lab + r * cw + cw / 2, cur = r === st.round && st.phase === 'pick';
    s += txt(cx, y0, r + 1, { size: 14, color: cur ? 'var(--ink)' : '#aaa', weight: cur ? 700 : 600 });
    if (cur) s += `<path class="cur" d="${shapeFor('cur' + r, () => circle(cx, y0, 9, 9, 0.08))}"/>`;
  }
  for (const p of [0, 1]) {
    const y = y0 + 12 + (p + 1) * rh - 6;
    s += `<circle cx="${x0 + 9}" cy="${y}" r="6" fill="${COLORS[p].main}"/>`;
    st.log.forEach((e, r) => {
      const cx = x0 + lab + r * cw + cw / 2, won = e.w === p;
      s += txt(cx, y, e.v[p], { size: won ? 20 : 17, color: won ? COLORS[p].main : '#a5a5a5', weight: won ? 700 : 500, cls: r === st.log.length - 1 && freshRound ? 'pop' : '' });
      if (won) s += `<path d="${shapeFor(`u${r}_${p}`, () => circle(cx, y, 10.5, 10, 0.08))}" stroke="${COLORS[p].main}" class="win"/>`;
    });
  }
  return s;
}

// ---------- render ----------
function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let s = gridView(0) + gridView(1) + panel() + table();
  if (online() && !sess.connected) s += txt(180, PANEL + 40, t('pb.online.wait'), { size: 24, color: '#777' });
  svg.innerHTML = s;
  freshRound = false;
  renderPlayers();
}

function statusLine() {
  if (online() && !sess.connected) return ['', 'var(--ink)'];
  if (st.phase === 'over') return ['', 'var(--ink)'];
  const cov = coverFor();
  if (cov >= 0) return [t(st.phase === 'setup' ? 'pb.setup.status' : 'pb.cover.status', { name: name(cov) }), COLORS[cov].main];
  if (st.phase === 'setup') {
    const a = localArranger();
    if (a >= 0) return [hotSeat() ? t('pb.setup.status', { name: name(a) }) : t('pb.setup.you'), COLORS[a].main];
    return ['', 'var(--ink)'];
  }
  const r = st.round + 1;
  const lp = localPicker();
  if (lp >= 0) {
    if (st.mode === 'open' && st.picks[1 - lp] !== null) return [t('pb.st.answer', { r, name: name(lp) }), COLORS[lp].main];
    return [hotSeat() ? t('pb.st.turn', { r, name: name(lp) }) : t('pb.st.you', { r }), COLORS[lp].main];
  }
  const w = PB.waitingFor(st);
  if (w.length) {
    const p = w[0];
    return [isAI(p) ? t('pb.thinking', { name: name(p) }) : t('pb.st.wait', { r, name: name(p) }), COLORS[p].main];
  }
  return [t('pb.round', { r }), 'var(--ink)'];
}

function renderPlayers() {
  const waiting = st.phase === 'pick' ? PB.waitingFor(st)
    : st.phase === 'setup' ? [0, 1].filter((p) => !PB.isReady(st, p)) : [];
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = waiting.includes(p);
    el.classList.toggle('active', active || st.phase === 'over');
    const m = moods[p];
    const pose = m.pose !== 'down' ? m.pose : active && st.phase === 'pick' ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29 });
    el.querySelector('.score').textContent = plural(st.score[p], 'pb.pts');
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
  $('#mode').disabled = online();
  $('#rules').disabled = !canRestart();
  $('#boards').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('pb.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('pb.online.note') : '';
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
const later = (ms, fn) => setTimeout(fn, ms);
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const calm = () => [0, 1].forEach((p) => setMood(p, 'neutral'));

// React to what changed between two states (same on host, guest and locally).
function react(prev, next) {
  if (next.log.length > prev.log.length) {
    const e = next.log[next.log.length - 1];
    calm();
    if (e.w < 0) {
      if (e.v[0] > 0) { setMood(0, 'worried'); setMood(1, 'worried'); say(0, 'pb.say.tie'); }
    } else {
      const w = e.w, l = 1 - w, gap = e.v[w] - e.v[l];
      if (e.v[l] === 0) { setMood(w, 'happy', 'wave'); if (Math.random() < 0.4) say(w, 'pb.say.free'); }
      else if (gap <= 2) { setMood(w, 'smug', 'wave'); setMood(l, 'sad'); say(w, 'pb.say.thin'); }
      else if (gap >= 7 && e.v[l] <= 4) { setMood(w, 'happy', 'up'); setMood(l, 'smug'); say(w, 'pb.say.big'); later(650, () => say(l, 'pb.say.cheap')); }
      else { setMood(w, 'happy', 'wave'); setMood(l, 'sad'); if (Math.random() < 0.5) say(l, 'pb.say.lost'); else say(w, 'pb.say.big'); }
    }
    // somebody just ran out of moves
    for (const p of [0, 1]) {
      if (next.phase !== 'over' && PB.trapped(next, p) && !PB.trapped(prev, p)) {
        setMood(p, 'worried'); later(500, () => say(p, 'pb.say.trap'));
        if (!PB.trapped(next, 1 - p)) { setMood(1 - p, 'smug'); later(1300, () => say(1 - p, 'pb.say.free')); }
      }
    }
  } else if (next.phase === 'setup' || (prev.phase === 'setup' && next.phase === 'pick')) {
    for (const p of [0, 1]) if (!PB.isReady(prev, p) && PB.isReady(next, p) && !isAI(p)) say(p, 'pb.say.ready');
  } else if (next.phase === 'pick' && next.mode !== 'open') {
    for (const p of [0, 1]) if (prev.picks[p] === null && next.picks[p] !== null && !isLocal(p) && Math.random() < 0.4) say(p, 'pb.say.picked');
  }
}

// ---------- flow ----------
function setState(next, { snapshot = false } = {}) {
  const prev = st;
  if (snapshot && !online()) history.push(PB.clone(prev));
  st = next;
  // once the grids are revealed, undo must not reopen the set-up (it would let a player re-arrange knowing the other grid)
  if (prev.phase === 'setup' && st.phase !== 'setup') history = [];
  if (prev.log.length !== st.log.length || prev.phase !== st.phase) { sel = null; swapSel = null; }
  if (st.log.length > prev.log.length) freshRound = true;
  react(prev, st);
  pendingAct = false;
  if (st.phase === 'over') finish();
  render();
  if (online() && sess.host) sendState();
  tick();
}

function act(kind, p, x) {
  if (online() && !sess.host) {
    pendingAct = true;
    sess.send('act', { kind, x, round: st.round, phase: st.phase });
    render();
    return;
  }
  const next = PB.clone(st);
  const ok = kind === 'grid' ? PB.setGrid(next, p, x) : PB.pick(next, p, x);
  if (ok) setState(next, { snapshot: isLocal(p) });
}

function newGame() {
  clearTimeout(aiTimer);
  const grids = cfg.boards === 'random' ? [PB.randomGrid(), PB.randomGrid()] : null;
  st = PB.create({ mode: cfg.rules, grids });
  if (!grids && isAI(1)) PB.setGrid(st, 1, PB.aiGrid());
  drafts = [PB.randomGrid(), PB.randomGrid()];
  history = []; shapes = {}; sel = null; swapSel = null; uncovered = null; finished = false; pendingAct = false;
  calm();
  $('#result').hidden = true;
  render();
  if (online() && sess.host) sendState();
  tick();
}

function tick() {
  clearTimeout(aiTimer);
  if (online() || st.phase !== 'pick') return;
  const p = PB.waitingFor(st).find((q) => isAI(q));
  if (p === undefined) return;
  aiTimer = setTimeout(() => {
    const view = PB.redact(st, p);
    act('pick', p, PB.aiPick(view, p, cfg.mode));
  }, 600 + Math.random() * 500);
}

function finish() {
  if (finished) return;
  finished = true;
  const w = PB.winner(st), [a, b] = st.score;
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); later(400, () => say(0, 'pb.say.draw')); }
  else {
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
    later(300, () => say(w, 'pb.say.win'));
    later(1100, () => say(1 - w, 'pb.say.lose'));
  }
  const tx = $('#result-text');
  tx.textContent = w < 0 ? t('pb.tie', { a, b }) : t('pb.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  tx.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  setTimeout(() => { if (finished && st.phase === 'over') $('#result').hidden = false; }, 1300);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  st = history.pop();
  // A secret round restarts from scratch: a pick made before the undo may have leaked through the
  // result (the computer's pick, or the first hot-seat player's), so nobody keeps a locked choice.
  if (st.phase === 'pick' && st.mode !== 'open') {
    while (st.picks.some((x) => x !== null) && history.length && history[history.length - 1].round === st.round) st = history.pop();
    st.picks = [null, null];
  }
  // open mode: the computer re-chooses too
  for (const p of [0, 1]) if (isAI(p) && st.phase === 'pick') st.picks[p] = null;
  for (const p of [0, 1]) if (st.grids[p] && st.phase === 'setup') drafts[p] = st.grids[p].slice();
  sel = null; swapSel = null; uncovered = null; finished = false; pendingAct = false;
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
// Host keeps every secret: the guest gets a copy with the host's grid (during set-up) and secret pick blanked.
function sendState() {
  sess.send('state', { st: PB.redact(st, 1), names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    remoteNames[0] = d.names[0];
    const fresh = d.st.id !== st.id || d.st.n < st.n;
    $('#rules').value = d.st.mode;
    if (fresh) {
      if (d.st.id !== st.id) drafts = [PB.randomGrid(), PB.randomGrid()];
      st = d.st; finished = false; sel = null; swapSel = null; pendingAct = false; shapes = {};
      calm(); $('#result').hidden = true;
      if (st.phase === 'over') finish();
      render();
      return;
    }
    setState(d.st);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('act', (d) => {
    if (!s.host) return;
    if (d.round !== st.round || d.phase !== st.phase) return sendState();
    const next = PB.clone(st);
    const ok = d.kind === 'grid' ? PB.setGrid(next, 1, d.x) : PB.pick(next, 1, d.x);
    if (ok) setState(next); else sendState();
  });
  s.on('resync', () => s.host && sendState());
  newGame();
  if (!s.host) s.send('resync');
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const cell = evt.target.closest('.cell');
  if (cell) {
    const p = +cell.dataset.p, i = +cell.dataset.i;
    if (st.phase === 'setup' && localArranger() === p) {
      if (swapSel === null) swapSel = i;
      else {
        const g = drafts[p];
        [g[swapSel], g[i]] = [g[i], g[swapSel]];
        swapSel = null;
      }
      return render();
    }
    if (localPicker() === p) {
      if (sel === i) { sel = null; act('pick', p, i); return; }
      sel = i;
      return render();
    }
    return;
  }
  const b = evt.target.closest('.sbtn');
  if (!b || b.classList.contains('off')) return;
  const a = b.dataset.act;
  if (a === 'uncover') { uncovered = coverFor(); sel = null; swapSel = null; render(); }
  else if (a === 'shuffle') { const p = localArranger(); if (p >= 0) { drafts[p] = PB.randomGrid(); swapSel = null; render(); } }
  else if (a === 'ready') {
    const p = localArranger();
    if (p >= 0) { swapSel = null; act('grid', p, drafts[p].slice()); }
  } else if (a === 'lock') {
    const p = localPicker();
    if (p >= 0 && sel !== null) { const x = sel; sel = null; act('pick', p, x); }
  }
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#rules').addEventListener('change', (e) => { cfg.rules = e.target.value; saveCfg(); restart(); });
$('#boards').addEventListener('change', (e) => { cfg.boards = e.target.value; saveCfg(); restart(); });
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
$('#mode').value = cfg.mode;
$('#rules').value = cfg.rules;
$('#boards').value = cfg.boards;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
