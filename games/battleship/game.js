import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, injectDefs, figureSVG } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { BS } from './engine.js';
import './strings.js';

const SLUG = 'battleship';
const COLORS = [PALETTE.blue, PALETTE.red];
const N = BS.N;
const W = 340, H = 488;
const GX = 24, GY = 20, CS = 31;            // main grid origin + cell size
const STRIP = GY + N * CS + 12;            // top of the strip under the main grid
const MX = 6, MY = STRIP + 22, MS = 12.4;   // mini grid (own fleet)
const RX = 146, RW = W - RX - 4, RC = RX + RW / 2; // right panel
const COLS = 'ABCDEFGHIJ';
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', report: 'count', notes: 'auto', names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, flashTimer;
let drafts = [null, null];   // set-up: local fleets not yet submitted
let drag = null;             // set-up: { k, off, from, at, moved }
let sel = [];                // cells picked for the next salvo
let inspect = -1;            // salvo index outlined on the target grid
let uncovered = null;        // hot-seat: who pressed "show" behind the cover
let justFired = false;       // hot-seat: shooter still looking at the result
let pendingAct = false;      // guest waiting for the host to confirm an action
let finished = false;
let fresh = null;            // { p, t } salvo to animate
let flash = '';              // short set-up warning
let nextFirst = 0;
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
  if (isAI(p)) return t('bs.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('bs.p' + p);
}

function arranger() {
  if (st.phase !== 'setup' || !ready() || pendingAct) return -1;
  return [0, 1].find((p) => isLocal(p) && !st.ready[p]) ?? -1;
}
// Whose eyes are on the screen right now (-1 = hot-seat cover).
function viewer() {
  if (online()) return mySeat();
  if (!hotSeat()) return 0;
  if (st.phase === 'over') return st.winner;
  if (st.phase === 'setup') { const a = arranger(); return a >= 0 && uncovered === a ? a : -1; }
  if (uncovered === st.turn && !justFired) return st.turn;
  if (justFired && uncovered === 1 - st.turn) return uncovered;
  return -1;
}
const coverFor = () => (viewer() >= 0 ? -1 : st.phase === 'setup' ? arranger() : st.turn);
const canShoot = () => st.phase === 'fire' && ready() && !pendingAct && !justFired &&
  isLocal(st.turn) && viewer() === st.turn;

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function txt(x, y, s, { size = 22, color = 'var(--ink)', cls = '', anchor = 'middle', max = 320, weight = 700 } = {}) {
  const fit = String(s).length * size * 0.42 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="t ${cls}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${fit}>${esc(s)}</text>`;
}
function boxPath(k, x, y, w, h, amp = 1.2) {
  return shapeFor(k, () => line(x, y, x + w, y, amp) + ' ' + line(x + w, y, x + w, y + h, amp).replace('M', 'L') + ' ' +
    line(x + w, y + h, x, y + h, amp).replace('M', 'L') + ' ' + line(x, y + h, x, y, amp).replace('M', 'L'));
}
function button(k, act, x, y, w, h, label, color = null, disabled = false) {
  const fill = color ? color.main : '#fff';
  return `<g class="sbtn${disabled ? ' off' : ''}" data-act="${act}">
    <path d="${boxPath(k, x, y, w, h)}" fill="${fill}" stroke="${color ? color.dark : 'var(--ink)'}" stroke-width="2.6" stroke-linejoin="round"/>
    ${txt(x + w / 2, y + h / 2 + 1, label, { size: 23, color: color ? '#fff' : 'var(--ink)', max: w - 14 })}</g>`;
}
const cellXY = (i) => [GX + (i % N) * CS, GY + Math.floor(i / N) * CS];
const miniXY = (i) => [MX + (i % N) * MS, MY + Math.floor(i / N) * MS];

function gridLines(key, x0, y0, cs, amp) {
  let d = '';
  const n = N * cs;
  for (let k = 0; k <= N; k++) {
    d += shapeFor(`${key}h${k}`, () => line(x0 - 1, y0 + k * cs, x0 + n + 1, y0 + k * cs, amp)) + ' ';
    d += shapeFor(`${key}v${k}`, () => line(x0 + k * cs, y0 - 1, x0 + k * cs, y0 + n + 1, amp)) + ' ';
  }
  return `<path class="grid" d="${d}"/><path class="frame" d="${boxPath(key + 'fr', x0, y0, n, n, amp)}"/>`;
}
function labels() {
  let s = '';
  for (let k = 0; k < N; k++) {
    s += txt(GX + k * CS + CS / 2, GY - 9, COLS[k], { size: 16, color: '#8a8a92', weight: 600 });
    s += txt(GX - 11, GY + k * CS + CS / 2 + 1, k + 1, { size: 16, color: '#8a8a92', weight: 600 });
  }
  return s;
}

// a ship as a hand-drawn capsule
function shipShape(key, s, x0, y0, cs, { color, cls = '', inset } = {}) {
  const ins = inset ?? cs * 0.14;
  const x = x0 + s.c * cs + ins, y = y0 + s.r * cs + ins;
  const w = (s.dir === 'h' ? s.len : 1) * cs - ins * 2, h = (s.dir === 'v' ? s.len : 1) * cs - ins * 2;
  const r = Math.min(w, h) / 2;
  return `<rect class="ship ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${color.fill}" stroke="${color.main}" filter="url(#mg-crayon)"/>` +
    `<rect class="ship-line ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" stroke="${color.main}"/>`;
}
function cross(key, x, y, sz, color, cls = '') {
  const d = shapeFor(key, () => line(x - sz, y - sz, x + sz, y + sz, 1) + ' ' + line(x + sz, y - sz, x - sz, y + sz, 1));
  return `<path class="hitx ${cls}" d="${d}" stroke="${color}"/>`;
}

// ---------- main grid views ----------
function setupView(p, editable) {
  const f = editable ? drafts[p] : st.fleets[p] || drafts[p];
  let s = `<rect class="sea" x="${GX}" y="${GY}" width="${N * CS}" height="${N * CS}"/>` + labels() + gridLines('g', GX, GY, CS, 1);
  f.forEach((sh, k) => {
    if (drag && drag.k === k && drag.moved) return;
    s += shipShape('s' + k, sh, GX, GY, CS, { color: COLORS[p], cls: drag && drag.k === k ? 'grab' : '' });
  });
  if (drag && drag.moved && drag.cand) {
    const ok = BS.canPlace(f, drag.k, drag.cand);
    s += shipShape('d', drag.cand, GX, GY, CS, { color: ok ? COLORS[p] : { fill: '#ddd', main: '#999' }, cls: ok ? 'drag' : 'drag bad' });
  }
  return s;
}

function targetView(v) {
  const d = 1 - v, c = COLORS[v];
  const salvos = st.salvos[v];
  const auto = cfg.notes === 'auto';
  const { known, frac } = BS.deduce(auto ? salvos : salvos.filter((x) => x.marks));
  let s = `<rect class="sea" x="${GX}" y="${GY}" width="${N * CS}" height="${N * CS}"/>`;
  const where = new Map();
  salvos.forEach((x, k) => x.cells.forEach((i) => where.set(i, k)));
  // tints first
  for (const i of where.keys()) {
    const [x, y] = cellXY(i);
    if (known[i] === 1) s += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${CS - 3}" height="${CS - 3}" fill="${c.fill}" opacity=".55" filter="url(#mg-crayon)"/>`;
    else if (!known[i] && auto && frac[i] > 0) s += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${CS - 3}" height="${CS - 3}" fill="${c.fill}" opacity="${(0.12 + frac[i] * 0.4).toFixed(2)}"/>`;
  }
  s += labels() + gridLines('g', GX, GY, CS, 1);
  // revealed enemy fleet at the end
  if (st.phase === 'over' && st.fleets[d]) st.fleets[d].forEach((sh, k) => (s += shipShape('e' + k, sh, GX, GY, CS, { color: COLORS[d], cls: 'ghost' })));
  for (const [i, k] of where) {
    const [x, y] = cellXY(i), cx = x + CS / 2, cy = y + CS / 2;
    const isFresh = fresh && fresh.p === v && fresh.t === k ? ' pop' : '';
    if (known[i] === 1) s += cross('tx' + i, cx, cy, 8, c.dark, isFresh);
    else if (known[i] === -1) s += `<circle class="${isFresh}" cx="${cx}" cy="${cy}" r="3.6" fill="#8a8a92"/>`;
    else s += txt(cx, cy + 1, k + 1, { size: k + 1 >= 10 ? 16 : 18, color: '#6d6d78', weight: 700, cls: 'sn' + isFresh });
  }
  if (inspect >= 0 && salvos[inspect]) {
    for (const i of salvos[inspect].cells) {
      const [x, y] = cellXY(i);
      s += `<rect class="insp" x="${x + 2}" y="${y + 2}" width="${CS - 4}" height="${CS - 4}" rx="5"/>`;
    }
  }
  // the latest salvo stays ringed (and pops in when it's new)
  if (salvos.length && st.phase !== 'over') {
    const k = salvos.length - 1, pop = fresh && fresh.p === v && fresh.t === k ? ' pop' : '';
    for (const i of salvos[k].cells) {
      const [x, y] = cellXY(i);
      s += `<path class="ring${pop}" d="${shapeFor('fr' + i, () => circle(x + CS / 2, y + CS / 2, 12.5, 12.5, 0.08))}" stroke="${c.main}"/>`;
    }
  }
  // picked squares
  sel.forEach((i, n) => {
    const [x, y] = cellXY(i), cx = x + CS / 2, cy = y + CS / 2;
    s += `<path class="aim" d="${shapeFor('sel' + i, () => circle(cx, cy, 11.5, 11.5, 0.08))}" stroke="${c.main}"/>` +
      `<path class="aim" d="M${cx - 15} ${cy}h7M${cx + 8} ${cy}h7M${cx} ${cy - 15}v7M${cx} ${cy + 8}v7" stroke="${c.main}"/>` +
      txt(cx, cy + 1, n + 1, { size: 15, color: c.dark });
  });
  if (canShoot()) {
    const fired = BS.firedBy(st, v);
    for (let i = 0; i < BS.CELLS; i++) {
      if (fired.has(i)) continue;
      const [x, y] = cellXY(i);
      s += `<rect class="cell" data-i="${i}" x="${x}" y="${y}" width="${CS}" height="${CS}"/>`;
    }
  }
  return s;
}

function coverView(p) {
  const c = COLORS[p], n = N * CS;
  let s = `<rect x="${GX}" y="${GY}" width="${n}" height="${n}" fill="${c.fill}" opacity=".3" filter="url(#mg-crayon)"/>`;
  let d = '';
  for (let k = 1; k < 31; k++) {
    const a = k * 20;
    d += shapeFor('hh' + k, () => line(GX + Math.max(0, a - n), GY + Math.min(n, a), GX + Math.min(n, a), GY + Math.max(0, a - n), 1.5)) + ' ';
  }
  s += `<path class="hatch" d="${d}" stroke="${c.main}"/>` + gridLines('g', GX, GY, CS, 1);
  const cx = GX + n / 2;
  s += `<rect x="${cx - 130}" y="${GY + 88}" width="260" height="150" rx="16" fill="#fffefb" opacity=".93"/>`;
  s += txt(cx, GY + 118, t('bs.cover.title', { name: name(p) }), { size: 28, color: c.dark, max: 240 });
  s += txt(cx, GY + 150, t('bs.cover.note'), { size: 20, color: '#777', weight: 600, max: 240 });
  s += button('cov', 'uncover', cx - 70, GY + 172, 140, 46, t('bs.cover.btn'), c);
  return s;
}

// ---------- strip under the grid ----------
function miniFleet(v) {
  const c = COLORS[v], o = 1 - v;
  let s = txt(MX, MY - 11, hotSeat() ? t('bs.mine.of', { name: name(v) }) : t('bs.mine'), { size: 17, color: '#777', anchor: 'start', weight: 600, max: 126 });
  s += `<rect class="sea" x="${MX}" y="${MY}" width="${N * MS}" height="${N * MS}"/>`;
  const f = st.fleets[v] || drafts[v];
  if (f) {
    const sunk = st.fleets[v] ? BS.sunkFlags(st, v) : [];
    f.forEach((sh, k) => (s += shipShape('m' + k, sh, MX, MY, MS, { color: sunk[k] ? { fill: '#cfcfd4', main: '#8a8a92' } : c, inset: 1.6, cls: 'mini' })));
  }
  s += gridLines('m', MX, MY, MS, 0.4);
  const occ = f ? BS.occupancy(f) : [];
  const inc = st.salvos[o];
  inc.forEach((x, k) => x.cells.forEach((i) => {
    const [px, py] = miniXY(i), cx = px + MS / 2, cy = py + MS / 2;
    const last = k === inc.length - 1;
    if (occ[i] >= 0) s += cross('mx' + i, cx, cy, 3.6, COLORS[o].dark, 'mini' + (last ? ' pop' : ''));
    else s += `<circle cx="${cx}" cy="${cy}" r="${last ? 2.4 : 1.7}" fill="${last ? COLORS[o].main : '#8a8a92'}" class="${last ? 'pop' : ''}"/>`;
    if (last) s += `<rect class="lastin" x="${px + 0.5}" y="${py + 0.5}" width="${MS - 1}" height="${MS - 1}" stroke="${COLORS[o].main}"/>`;
  }));
  return s;
}

function reportText(v, k) {
  const x = st.salvos[v][k];
  return x.hits ? t('bs.rep.hits', { k: k + 1, hits: plural(x.hits, 'bs.hits') }) : t('bs.rep.miss', { k: k + 1 });
}
function sunkText(x) {
  if (!x.sunk.length) return '';
  return x.sunk.length === 1 ? t('bs.rep.sunk', { len: x.sunk[0] }) : t('bs.rep.sunk2', { list: x.sunk.join(', ') });
}

function tally(v) {
  const o = 1 - v, sunk = BS.sunkLengths(st, o).slice();
  const u = 7.6, gap = 6;
  let x = RX + 4, s = '';
  const y = STRIP + 70;
  for (const len of BS.SHIPS) {
    const k = sunk.indexOf(len), isSunk = k >= 0;
    if (isSunk) sunk.splice(k, 1);
    const col = isSunk ? { fill: '#d9d9de', main: '#9a9aa4' } : COLORS[o];
    s += `<rect class="tal" x="${x}" y="${y}" width="${len * u}" height="${u + 2}" rx="${(u + 2) / 2}" fill="${col.fill}" stroke="${col.main}"/>`;
    if (isSunk) s += `<path class="strike" d="${shapeFor('st' + x, () => line(x - 2, y + u / 2 + 3, x + len * u + 2, y + u / 2 - 1, 0.8))}"/>`;
    x += len * u + gap;
  }
  return s;
}

function strip() {
  const y = STRIP;
  if (online() && !sess.connected) return txt(W / 2, y + 70, t('bs.online.wait'), { size: 24, color: '#777' });
  const cov = coverFor();
  if (cov >= 0) return '';
  const v = viewer();
  if (st.phase === 'setup') {
    const a = arranger();
    if (a >= 0 && a === v) {
      return txt(W / 2, y + 16, flash || t('bs.setup.hint'), { size: 20, color: flash ? 'var(--red-dark)' : '#777', weight: 600 }) +
        txt(W / 2, y + 40, t('bs.setup.hint2'), { size: 20, color: '#777', weight: 600 }) +
        button('shuf', 'shuffle', 28, y + 66, 132, 46, t('bs.shuffle')) +
        button('rdy', 'ready', 180, y + 66, 132, 46, t('bs.ready'), COLORS[a]);
    }
    const other = [0, 1].find((p) => !st.ready[p]);
    return other === undefined ? '' : txt(W / 2, y + 70, t('bs.setup.wait', { name: name(other) }), { size: 21, color: '#777', max: 320 });
  }
  let s = miniFleet(v);
  const mine = st.salvos[v], inc = st.salvos[1 - v];
  // line 1: my last report, or the inspected salvo
  let l1 = '', l1b = '';
  if (inspect >= 0 && mine[inspect]) {
    const x = mine[inspect];
    l1 = t('bs.inspect', { k: inspect + 1, hits: plural(x.hits, 'bs.hits'), n: x.cells.length });
    l1b = sunkText(x);
  } else if (mine.length) { l1 = reportText(v, mine.length - 1); l1b = sunkText(mine[mine.length - 1]); }
  else if (st.turn === v && st.phase === 'fire') l1 = t('bs.first');
  if (l1) s += txt(RC, y + 8, l1, { size: 20, color: COLORS[v].dark, max: RW });
  if (l1b) s += txt(RC, y + 29, l1b, { size: 18, color: COLORS[v].dark, weight: 600, max: RW });
  // line 2: last salvo at me
  if (inc.length) {
    const x = inc[inc.length - 1];
    const l2 = x.hits ? t('bs.inc.hits', { hits: plural(x.hits, 'bs.hits') }) : t('bs.inc.miss');
    s += txt(RC, y + 51, l2, { size: 18, color: COLORS[1 - v].dark, weight: 600, max: RW });
  }
  s += tally(v);
  const by = y + 98;
  if (st.phase === 'fire') {
    if (justFired && v !== st.turn) s += button('pass', 'pass', RC - 78, by, 156, 46, t('bs.pass'), COLORS[v]);
    else if (canShoot()) {
      const k = BS.salvoSize(st, v);
      const full = sel.length === k;
      s += button('fire', 'fire', RC - 78, by, 156, 46, full ? t('bs.fire') : t('bs.pick', { a: sel.length, b: k }), full ? COLORS[v] : null, !full);
    } else if (st.turn !== v || pendingAct) {
      s += `<g class="dots">${[0, 1, 2].map((i) => `<circle cx="${RC - 15 + i * 15}" cy="${by + 23}" r="4" fill="${COLORS[st.turn].main}" style="animation-delay:${i * 0.2}s"/>`).join('')}</g>`;
    }
  }
  return s;
}

// ---------- render ----------
function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const v = viewer(), cov = coverFor();
  let s;
  if (cov >= 0) s = coverView(cov);
  else if (st.phase === 'setup') s = setupView(v, arranger() === v);
  else s = targetView(v);
  s += strip();
  svg.innerHTML = s;
  svg.classList.toggle('arranging', cov < 0 && st.phase === 'setup' && arranger() === v && v >= 0);
  fresh = null;
  renderPlayers();
}

function statusLine() {
  if (online() && !sess.connected) return ['', 'var(--ink)'];
  if (st.phase === 'over') return ['', 'var(--ink)'];
  const cov = coverFor();
  if (cov >= 0) return [t('bs.cover.status', { name: name(cov) }), COLORS[cov].main];
  if (st.phase === 'setup') {
    const a = arranger();
    if (a >= 0) return [hotSeat() ? t('bs.setup.status', { name: name(a) }) : t('bs.setup.you'), COLORS[a].main];
    return ['', 'var(--ink)'];
  }
  const p = st.turn;
  if (justFired) return [t('bs.pass.status'), COLORS[p].main];
  if (canShoot()) {
    const k = BS.salvoSize(st, p);
    const one = k === 1 ? '1' : '';
    return [hotSeat() ? t('bs.turn' + one, { name: name(p), k }) : t('bs.turn.you' + one, { k }), COLORS[p].main];
  }
  if (isAI(p)) return [t('bs.thinking', { name: name(p) }), COLORS[p].main];
  return [t('bs.turn.them', { name: name(p) }), COLORS[p].main];
}

function renderPlayers() {
  const waiting = st.phase === 'fire' ? [st.turn] : st.phase === 'setup' ? [0, 1].filter((p) => !st.ready[p]) : [0, 1];
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = waiting.includes(p);
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = m.pose !== 'down' ? m.pose : active && st.phase === 'fire' ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 23 + p * 37 });
    el.querySelector('.score').textContent = t('bs.score', { n: BS.sunkLengths(st, 1 - p).length });
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

  $('#undo').disabled = online() || !history.length || pendingAct;
  $('#mode').disabled = online();
  $('#report').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('bs.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('bs.online.note') : '';
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
  for (const p of [0, 1]) if (!prev.ready[p] && next.ready[p] && !isAI(p)) say(p, 'bs.say.ready');
  for (const p of [0, 1]) {
    if (next.salvos[p].length <= prev.salvos[p].length) continue;
    const x = next.salvos[p][next.salvos[p].length - 1], d = 1 - p;
    fresh = { p, t: next.salvos[p].length - 1 };
    calm();
    if (next.phase === 'over') continue;
    if (x.sunk.length) {
      setMood(p, 'happy', 'up'); setMood(d, 'sad');
      say(p, 'bs.say.sank');
      later(750, () => say(d, 'bs.say.sunk', { len: x.sunk[0] }));
    } else if (x.hits >= 2) {
      setMood(p, 'happy', 'wave'); setMood(d, 'worried');
      say(p, 'bs.say.hits', { n: x.hits });
      if (Math.random() < 0.6) later(700, () => say(d, 'bs.say.ouch'));
    } else if (x.hits === 1) {
      setMood(p, 'smug'); setMood(d, 'worried');
      if (Math.random() < 0.6) say(p, 'bs.say.hit');
    } else {
      setMood(p, 'sad'); setMood(d, 'smug');
      if (Math.random() < 0.5) say(p, 'bs.say.miss'); else say(d, 'bs.say.phew');
    }
  }
}

// ---------- flow ----------
function setState(next, { snapshot = false, local = false } = {}) {
  const prev = st;
  if (snapshot && !online()) history.push(prev);
  st = next;
  const firedNow = st.salvos[0].length + st.salvos[1].length > prev.salvos[0].length + prev.salvos[1].length;
  if (firedNow || prev.phase !== st.phase) { sel = []; inspect = -1; }
  if (local && firedNow && hotSeat() && st.phase === 'fire') justFired = true;
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
    sess.send('act', { kind, x, n: st.n });
    render();
    return;
  }
  const next = BS.clone(st);
  const ok = kind === 'fleet' ? BS.setFleet(next, p, x) : !!BS.fire(next, p, x);
  if (ok) setState(next, { snapshot: isLocal(p), local: isLocal(p) });
}

function newGame() {
  clearTimeout(aiTimer);
  const first = online() ? 0 : nextFirst;
  nextFirst = 1 - first;
  st = BS.create({ first, exact: cfg.report === 'exact' });
  if (isAI(1)) BS.setFleet(st, 1, BS.aiFleet());
  drafts = [BS.randomFleet(), BS.randomFleet()];
  history = []; shapes = {}; sel = []; inspect = -1; drag = null;
  uncovered = null; justFired = false; finished = false; pendingAct = false; flash = '';
  calm();
  $('#result').hidden = true;
  render();
  if (online() && sess.host) sendState();
  tick();
}

function tick() {
  clearTimeout(aiTimer);
  if (online() || st.phase !== 'fire' || !isAI(st.turn)) return;
  const p = st.turn;
  aiTimer = setTimeout(() => {
    const view = BS.redact(st, p);
    act('fire', p, BS.aiSalvo(view, p, cfg.mode));
  }, 900 + Math.random() * 500);
}

function finish() {
  if (finished) return;
  finished = true;
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  later(300, () => say(w, 'bs.say.win'));
  later(1100, () => say(1 - w, 'bs.say.lose'));
  resultText();
  setTimeout(() => { if (finished && st.phase === 'over') $('#result').hidden = false; }, 1400);
}
function resultText() {
  if (st.phase !== 'over') return;
  const w = st.winner, tx = $('#result-text');
  tx.textContent = t('bs.win', { name: name(w) });
  tx.style.color = COLORS[w].main;
  $('#result-sub').textContent = t('bs.win.sub', { n: plural(st.salvos[w].length, 'bs.salvos') });
}

function undo() {
  if (!history.length || online() || pendingAct) return;
  clearTimeout(aiTimer);
  st = history.pop();
  sel = []; inspect = -1; drag = null; uncovered = null; justFired = false; finished = false; flash = '';
  if (!hotSeat()) uncovered = 0;
  calm();
  $('#result').hidden = true;
  render();
  tick();
}

const canRestart = () => !online() || sess.host;
function restart() { if (canRestart()) newGame(); }

// ---------- online ----------
// Host keeps every secret: the guest never receives the host's fleet (until the game is over),
// and salvo records carry only the hit count (plus per-shot marks in the 'exact' variant).
function sendState() {
  sess.send('state', { st: BS.redact(st, 1), names: cfg.names });
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
    $('#report').value = d.st.exact ? 'exact' : 'count';
    if (d.st.id !== st.id || d.st.n < st.n) {
      if (d.st.id !== st.id) drafts = [BS.randomFleet(), BS.randomFleet()];
      st = d.st; finished = false; sel = []; inspect = -1; drag = null; pendingAct = false; shapes = {};
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
    if (d.n !== st.n) return sendState();
    const next = BS.clone(st);
    const ok = d.kind === 'fleet' ? BS.setFleet(next, 1, d.x) : !!BS.fire(next, 1, d.x);
    if (ok) setState(next); else sendState();
  });
  s.on('resync', () => s.host && sendState());
  newGame();
  if (!s.host) s.send('resync');
}

// ---------- input ----------
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function cellAt(evt) {
  const p = svgPoint(evt);
  const c = Math.floor((p.x - GX) / CS), r = Math.floor((p.y - GY) / CS);
  return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null;
}
const clampShip = (s) => ({
  ...s,
  r: Math.max(0, Math.min(N - (s.dir === 'v' ? s.len : 1), s.r)),
  c: Math.max(0, Math.min(N - (s.dir === 'h' ? s.len : 1), s.c)),
});
function setFlash(msg) {
  flash = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { flash = ''; if (st.phase === 'setup') render(); }, 1600);
}

svg.addEventListener('pointerdown', (evt) => {
  const p = arranger();
  if (p < 0 || viewer() !== p || evt.target.closest('.sbtn')) return;
  const rcl = cellAt(evt);
  if (!rcl) return;
  const k = BS.occupancy(drafts[p])[BS.idx(...rcl)];
  if (k < 0) return;
  const sh = drafts[p][k];
  drag = { k, off: sh.dir === 'h' ? rcl[1] - sh.c : rcl[0] - sh.r, from: rcl, at: rcl, moved: false, cand: null };
  svg.setPointerCapture(evt.pointerId);
  evt.preventDefault();
  render();
});
svg.addEventListener('pointermove', (evt) => {
  if (!drag) return;
  const p = arranger();
  const pt = svgPoint(evt);
  const r = Math.max(0, Math.min(N - 1, Math.floor((pt.y - GY) / CS))), c = Math.max(0, Math.min(N - 1, Math.floor((pt.x - GX) / CS)));
  if (r === drag.at[0] && c === drag.at[1]) return;
  drag.at = [r, c];
  drag.moved = drag.moved || r !== drag.from[0] || c !== drag.from[1];
  const sh = drafts[p][drag.k];
  drag.cand = clampShip({ ...sh, r: sh.dir === 'v' ? r - drag.off : r, c: sh.dir === 'h' ? c - drag.off : c });
  render();
});
function endDrag(cancel) {
  if (!drag) return;
  const p = arranger(), d = drag;
  drag = null;
  if (p < 0 || cancel) return render();
  const f = drafts[p], sh = f[d.k];
  if (d.moved) {
    if (d.cand && BS.canPlace(f, d.k, d.cand)) f[d.k] = d.cand;
    else setFlash(t('bs.setup.bad'));
  } else {
    // tap: turn the ship around the touched square, sliding it if it would stick out or overlap
    const [r, c] = d.from, dir = sh.dir === 'h' ? 'v' : 'h';
    let done = false;
    const tries = [d.off];
    for (let k = 0; k < sh.len; k++) if (k !== d.off) tries.push(k);
    for (const off of tries) {
      const cand = { ...sh, dir, r: dir === 'v' ? r - off : r, c: dir === 'h' ? c - off : c };
      if (BS.canPlace(f, d.k, cand)) { f[d.k] = cand; done = true; break; }
    }
    if (!done) setFlash(t('bs.setup.bad'));
  }
  render();
}
svg.addEventListener('pointerup', () => endDrag(false));
svg.addEventListener('pointercancel', () => endDrag(true));

svg.addEventListener('click', (evt) => {
  const b = evt.target.closest('.sbtn');
  if (b) {
    if (b.classList.contains('off')) return;
    const a = b.dataset.act;
    if (a === 'uncover') { uncovered = coverFor(); sel = []; inspect = -1; render(); }
    else if (a === 'shuffle') { const p = arranger(); if (p >= 0) { drafts[p] = BS.randomFleet(); render(); } }
    else if (a === 'ready') { const p = arranger(); if (p >= 0) act('fleet', p, drafts[p].map((x) => ({ ...x }))); }
    else if (a === 'fire') {
      const p = st.turn;
      if (canShoot() && sel.length === BS.salvoSize(st, p)) { const cells = sel.slice(); sel = []; act('fire', p, cells); }
    } else if (a === 'pass') { justFired = false; uncovered = null; render(); }
    return;
  }
  if (st.phase === 'setup') return;
  const rcl = cellAt(evt);
  const v = viewer();
  if (!rcl || v < 0) { if (inspect >= 0) { inspect = -1; render(); } return; }
  const i = BS.idx(...rcl);
  const k = st.salvos[v].findIndex((x) => x.cells.includes(i));
  if (k >= 0) { inspect = inspect === k ? -1 : k; return render(); }
  inspect = -1;
  if (!canShoot()) return render();
  const j = sel.indexOf(i);
  if (j >= 0) sel.splice(j, 1);
  else if (sel.length < BS.salvoSize(st, st.turn)) sel.push(i);
  else { sel.shift(); sel.push(i); }
  render();
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#report').addEventListener('change', (e) => { cfg.report = e.target.value; saveCfg(); restart(); });
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
document.addEventListener('mg:lang', () => { resultText(); render(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#report').value = cfg.report;
$('#notes').value = cfg.notes;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
