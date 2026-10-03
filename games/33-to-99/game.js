import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { N99 } from './engine.js';
import './strings.js';

const SLUG = '33-to-99';
const VW = 400, VH = 450;
const COLORS = [
  PALETTE.blue, PALETTE.red,
  PALETTE.green,
  { main: 'var(--n99-orange)', text: 'var(--n99-orange-dark)', fill: 'var(--n99-orange-fill)', dark: 'var(--n99-orange-face)' },
  PALETTE.violet,
];
const INK = PALETTE.ink;
const TIMERS = [0, 60, 90, 120, 180];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', n: 2, timer: 120, perLeader: 2, names: ['', '', '', '', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
while (cfg.names.length < 5) cfg.names.push('');
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let G;                      // the match (engine state); online: the host's copy is authoritative
let W = null;               // local workspace of the player who is solving on this device
let covered = false;        // hot-seat "pass the device" screen
let deadline = 0, tickT = null, hurried = false;
let aiTimer, lastTag = '', nextFirst = 0, pendingPick = false, seq = 0, lastSeq = -1;
let sess = null;            // online session (shared/net.js)
const remoteNames = ['', '', '', '', ''];
// Online, who sits in each seat: 'host' | 'on' (a guest's device) | 'away' (device dropped) |
// 'free' (2 players: nobody yet) | 'cpu' (3+ players: a seat without a device is played by the computer).
// The host works it out; guests get it with every state.
let ctrl = [];
const AWAY_MS = 20000;      // 3+ players: a dropped guest gets this long to come back before the computer steps in
const away = new Map();     // host: seat → takeover timer
// Game seats are kept apart from net.js seats: if the host reloads, guests may come back in another
// order and get different net seats, but each device keeps its game seat (recognised by a per-tab id).
const CID_KEY = 'mg-n99-cid';
const myCid = sessionStorage.getItem(CID_KEY) || Math.random().toString(36).slice(2, 12);
sessionStorage.setItem(CID_KEY, myCid);
// A per-browser id as well: someone who reopens the link in a new tab of the same browser (new tab id)
// is offered their old seat back if it is free, rather than a computer seat.
const DID_KEY = 'mg-n99-did';
const myDid = localStorage.getItem(DID_KEY) || Math.random().toString(36).slice(2, 12);
localStorage.setItem(DID_KEY, myDid);
let owner = [];             // host: game seat → id of the device that plays it
let ownerDid = [];          // host: game seat → browser id of that device
const gameOf = new Map();   // host: net seat → game seat (devices that said hello)
const cidOf = new Map();    // host: net seat → device id
const didOf = new Map();    // host: net seat → browser id
let myG = -1;               // guest: my game seat, as the host told me
const SPECT = 100;          // game seats from here on: watching (no free seat in this game)
let moods = [];
const shapes = {};
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => (sess.host ? 0 : myG >= 0 ? myG : sess.seat);
const NET_AI = 'normal';    // online computer seats play at this level
const isAI = (p) => (online() ? ctrl[p] === 'cpu' : cfg.mode !== 'pvp' && p === 1);
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const humans = () => (online() ? 1 : cfg.mode === 'pvp' ? G.n : 1);
// Can this device act? 2 players online: only with the other side present. 3+: the host always can
// (empty seats are the computer's); a guest needs the link to the host.
function connected() {
  if (!online()) return true;
  if (!sess.host) return sess.connected;
  return G.n > 2 || liveSeats().includes(1);
}
const spectator = () => online() && mySeat() >= G.n;
const aiLevel = () => (online() ? NET_AI : cfg.mode);
// A guest's own name is kept apart from the hot-seat names: its game seat can change between rooms/reloads.
const ownName = (p) => ((online() && !sess.host ? cfg.netName ?? cfg.names[p] : cfg.names[p]) || '');
function name(p) {
  if (isAI(p)) return online() && ctrl.filter((c) => c === 'cpu').length > 1 ? t('n99.cpu.n', { n: p + 1 }) : t('n99.cpu');
  if (online() && p === mySeat()) return ownName(p).trim() || t('n99.you');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('n99.p' + p);
}
const nameAway = (p) => (online() && ctrl[p] === 'away' ? `${name(p)} (${t('n99.away')})` : name(p));
// Order of solving on a shared device: the leader first, then around the table.
const order = () => Array.from({ length: G.n }, (_, k) => (G.leader + k) % G.n);
function localSolver() {
  if (G.phase !== 'solve' || !connected()) return -1;
  if (online()) return G.done[mySeat()] ? -1 : mySeat();
  return order().find((p) => isLocal(p) && !G.done[p]) ?? -1;
}

// ---------- drawing helpers ----------
const fx = (n) => n.toFixed(1);
function rrect(x, y, w, h, r = 8, a = 1.4) {
  const j = () => (Math.random() * 2 - 1) * a;
  const P = (px, py) => `${fx(px + j())} ${fx(py + j())}`;
  return `M${P(x + r, y)} L${P(x + w - r, y)} Q${fx(x + w)} ${fx(y)} ${P(x + w, y + r)} L${P(x + w, y + h - r)} ` +
    `Q${fx(x + w)} ${fx(y + h)} ${P(x + w - r, y + h)} L${P(x + r, y + h)} Q${fx(x)} ${fx(y + h)} ${P(x, y + h - r)} ` +
    `L${P(x, y + r)} Q${fx(x)} ${fx(y)} ${fx(x + r)} ${fx(y)} Z`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const txt = (x, y, s, cls, extra = '') => `<text x="${fx(x)}" y="${fx(y)}" class="${cls}" ${extra}>${esc(s)}</text>`;
const PIPS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
function die(x, y, s, v, key, extra = '') {
  let o = `<path d="${shapeFor(`die${key}:${x}:${y}:${s}`, () => rrect(x - s / 2, y - s / 2, s, s, s * 0.18, 1.2))}" class="die-body"/>`;
  if (v) for (const [a, b] of PIPS[v]) o += `<circle cx="${fx(x + a * s * 0.26)}" cy="${fx(y + b * s * 0.26)}" r="${fx(s * 0.085)}" class="pip"/>`;
  else o += txt(x, y + 2, '?', 'die-q', `font-size="${fx(s * 0.6)}"`);
  return `<g class="die ${extra}" style="--rot:${(Math.random() * 40 - 20).toFixed(0)}deg">${o}</g>`;
}
function button(x, y, w, h, label, act, color, primary, disabled) {
  const k = 'btn' + act + w;
  const d = shapeFor(k, () => rrect(x, y, w, h, 12, 1.6));
  const fill = primary && !disabled ? color.main : 'var(--card)';
  return `<g class="sbtn${disabled ? ' off' : ''}" ${disabled ? '' : `data-act="${act}"`}>` +
    `<path d="${d}" fill="${fill}" stroke="${primary && !disabled ? color.text : INK}" stroke-width="2.6"/>` +
    txt(x + w / 2, y + h / 2 + 1, label, 'btn-txt', `fill="${primary && !disabled ? 'var(--on-accent)' : INK}"`) + '</g>';
}

// A number tile: untouched dice keep their pips, worked-out numbers become paper slips.
function tileSVG(tile, x, y, s, k, sel, color, fresh, roll) {
  const cls = `tile${sel ? ' sel' : ''}${fresh ? ' fresh' : ''}`;
  let o = `<g class="${cls}" data-act="tile" data-i="${k}">`;
  o += `<rect x="${x - s / 2 - 4}" y="${y - s / 2 - 4}" width="${s + 8}" height="${s + 8}" fill="transparent"/>`;
  if (sel) o += `<path d="${shapeFor(`hl${x}:${y}:${s}`, () => rrect(x - s / 2 - 5, y - s / 2 - 5, s + 10, s + 10, 14, 1.5))}" fill="${color.fill}" stroke="${color.main}" stroke-width="3.5" opacity=".9"/>`;
  if (tile.e.i !== undefined) {
    o += die(x, y, s, G.dice[tile.e.i], 't' + k, roll ? 'roll' : '');
  } else {
    o += `<path d="${shapeFor(`slip${x}:${y}:${s}`, () => rrect(x - s / 2, y - s / 2, s, s, 6, 2))}" class="slip"/>`;
    const v = tile.v;
    if (v.d === 1) {
      const str = String(v.n), fs = str.length > 4 ? 22 : str.length > 3 ? 28 : 36;
      o += txt(x, y + 2, str.replace('-', '−'), 'tile-num', `font-size="${fs}"`);
    } else {
      const neg = v.n < 0, a = String(Math.abs(v.n)), b = String(v.d);
      const fs = Math.max(a.length, b.length) > 3 ? 18 : 24;
      o += txt(x + (neg ? 4 : 0), y - 13, a, 'tile-num', `font-size="${fs}"`) + txt(x + (neg ? 4 : 0), y + 17, b, 'tile-num', `font-size="${fs}"`);
      o += `<path d="${line(x - 16 + (neg ? 4 : 0), y + 1, x + 16 + (neg ? 4 : 0), y + 1, 0.6)}" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" fill="none"/>`;
      if (neg) o += txt(x - 20, y + 2, '−', 'tile-num', `font-size="${fs}"`);
    }
  }
  return o + '</g>';
}
function tilesRow(tiles, y, s, gap, color, opts = {}) {
  const k = tiles.length, w = k * s + (k - 1) * gap;
  let o = '';
  tiles.forEach((tile, i) => {
    const x = VW / 2 - w / 2 + s / 2 + i * (s + gap);
    o += tileSVG(tile, x, y, s, i, opts.sel === i, color, opts.fresh === i, opts.roll);
  });
  return o;
}
const stepLines = (dice, steps) => {
  let tiles = N99.startTiles(dice);
  return steps.map(([i, op, j]) => {
    const a = tiles[i].v, b = tiles[j].v;
    tiles = N99.combine(tiles, i, op, j);
    const r = tiles[j > i ? j - 1 : j].v;
    const fr = (v) => (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`).replace('-', '−');
    const br = (v) => (v.n < 0 || v.d !== 1 ? `(${fr(v)})` : fr(v));
    return `${fr(a)} ${N99.SYM[op]} ${br(b)} = ${fr(r)}`;
  });
};
const exprOf = (dice, steps) => {
  const tl = N99.finalTile(dice, steps);
  return tl ? N99.exprText(tl.e, dice) : '';
};

// ---------- rendering ----------
function header(showTarget) {
  let o = `<path d="${shapeFor('tbox', () => rrect(8, 6, 104, 58, 10, 1.6))}" class="tbox"/>`;
  o += txt(60, 22, t('n99.target'), 'lbl');
  o += txt(60, 51, showTarget && G.target ? G.target : '?', 'tnum');
  o += txt(VW / 2 + 22, 24, t('n99.round', { r: Math.min(G.round + 1, N99.totalRounds(G)), n: N99.totalRounds(G) }), 'lbl round');
  // a running clock stays visible even if the setting changes mid-answer (the new value applies next time)
  const showTimer = W && deadline && !covered && G.phase === 'solve';
  if (showTimer) {
    o += `<g class="clock"><path d="${shapeFor('clk', () => circle(310, 40, 15, 15, 0.05))}" fill="var(--card)" stroke="${INK}" stroke-width="2.6"/>` +
      `<path d="M310 40 L310 30 M310 40 L317 44" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/></g>`;
    o += txt(390, 42, '', 'tnum timer', 'id="timer-txt"');
  }
  return o;
}

function viewPick() {
  const L = G.leader, mine = isLocal(L) && connected() && !pendingPick;
  let o = header(false);
  if (!mine) {
    o += `<g class="dicerow">${[0, 1, 2, 3, 4].map((k) => die(72 + k * 64, 170, 52, 0, 'pk' + k)).join('')}</g>`;
    o += txt(VW / 2, 270, t('n99.pick.wait'), 'mid', 'fill="var(--muted-2)"');
    return o;
  }
  const c = COLORS[L];
  o += txt(VW / 2 + 22, 52, t('n99.pick.title'), 'mid', `fill="${c.main}"`);
  const cw = 37, ch = 40, x0 = VW / 2 - cw * 5, y0 = 78;
  for (let v = N99.MIN; v <= N99.MAX; v++) {
    const r = Math.floor(v / 10) - 3, col = v % 10;
    const x = x0 + col * cw, y = y0 + r * ch;
    o += `<g class="cell" data-act="pick" data-t="${v}"><path d="${shapeFor('cell' + v, () => rrect(x + 2, y + 2, cw - 4, ch - 4, 8, 1))}"/>` +
      txt(x + cw / 2, y + ch / 2 + 1, v, 'cell-num') + '</g>';
  }
  o += button(VW / 2 - 80, 372, 160, 46, t('n99.pick.random'), 'random', c, true, false);
  return o;
}

function viewCover() {
  const p = W.p, c = COLORS[p];
  let o = header(true);
  o += `<g class="dicerow">${[0, 1, 2, 3, 4].map((k) => die(72 + k * 64, 128, 52, 0, 'cv' + k)).join('')}</g>`;
  o += txt(VW / 2, 222, t('n99.cover.title', { name: name(p) }), 'big', `fill="${c.main}"`);
  o += txt(VW / 2, 258, t('n99.cover.sub'), 'mid');
  if (G.timer) o += txt(VW / 2, 288, t('n99.cover.timer'), 'small');
  o += button(VW / 2 - 90, 320, 180, 56, t('n99.go'), 'go', c, true, false);
  return o;
}

function viewSolve() {
  const p = W.p, c = COLORS[p];
  let o = header(true);
  o += tilesRow(W.tiles, 118, 66, 10, c, { sel: W.sel, fresh: W.fresh, roll: !W.rolled });
  // operations
  const ops = N99.OPS, canOp = W.sel >= 0 && W.tiles.length > 1;
  ops.forEach((op, k) => {
    const x = 65 + k * 90, y = 206, on = W.op === op;
    o += `<g class="op${canOp ? '' : ' off'}${on ? ' on' : ''}" ${canOp ? `data-act="op" data-op="${op}"` : ''}>` +
      `<path d="${shapeFor('op' + k, () => circle(x, y, 27, 27, 0.05))}" fill="${on ? c.main : 'var(--card)'}" stroke="${on ? c.text : INK}" stroke-width="2.8"/>` +
      txt(x, y + 2, N99.SYM[op], 'op-sym', `fill="${on ? 'var(--on-accent)' : INK}"`) + '</g>';
  });
  // the work so far
  const lines = stepLines(G.dice, W.steps);
  if (W.sel >= 0 && W.op) {
    const v = W.tiles[W.sel].v;
    lines.push(`${N99.fracText(v).replace('-', '−')} ${N99.SYM[W.op]} …`);
  }
  lines.slice(-4).forEach((s, k) => (o += txt(VW / 2, 268 + k * 27, s, 'work' + (k === lines.slice(-4).length - 1 && W.op && W.sel >= 0 ? ' pending' : ''))));
  if (W.err) o += txt(VW / 2, 268 + Math.min(lines.length, 4) * 27, W.err, 'work err');
  // best answer so far
  const b = W.best;
  o += txt(VW / 2, 384, b ? `${t('n99.best', { v: b.label })} → ${plural(b.pts, 'n99.pts')}` : t('n99.best.none'), 'bestline', b ? `fill="${c.text}"` : '');
  o += button(24, 398, 160, 46, t('n99.reset'), 'reset', c, false, !W.steps.length);
  o += button(216, 398, 160, 46, t('n99.done') + ' ✓', 'done', c, true, !b);
  return o;
}

function viewWait() {
  const me = online() ? mySeat() : -1;
  let o = header(true);
  o += `<g class="dicerow">${G.dice.map((v, k) => die(72 + k * 64, 112, 50, v, 'wd' + k)).join('')}</g>`;
  if (me >= 0 && me < G.n && G.done[me]) {
    const s = G.subs[me];
    o += txt(VW / 2, 190, s ? `${exprOf(G.dice, s)} = ${N99.fracText(N99.finalTile(G.dice, s).v)}` : t('n99.res.none'), 'mid', `fill="${COLORS[me].main}"`);
    if (s) o += txt(VW / 2, 222, plural(N99.scoreSteps(G.dice, G.target, s), 'n99.pts'), 'small');
    // joined (or came back) after the computer had already answered for this seat
    if (G.auto && G.auto[me]) {
      o += txt(VW / 2, 362, t('n99.auto.you'), 'small');
      o += txt(VW / 2, 388, t('n99.auto.next'), 'small');
    }
  }
  const waiting = [...Array(G.n).keys()].filter((p) => !G.done[p]).map(nameAway).join(', ');
  o += txt(VW / 2, 300, t('n99.still', { names: waiting }), 'mid', 'fill="var(--muted-2)"');
  return o;
}

function resultRows(h, y0, rowH) {
  let o = '';
  for (let p = 0; p < G.n; p++) {
    const y = y0 + p * rowH, s = h.subs[p], c = COLORS[p];
    let val;
    if (!s) val = t('n99.res.none');
    else {
      const v = N99.finalTile(h.dice, s).v;
      val = N99.fracText(v).replace('-', '−') + (v.d !== 1 ? ` (${t('n99.res.frac')})` : v.n > h.target ? ` (${t('n99.res.over')})` : '');
    }
    o += `<path d="${shapeFor('row' + p + rowH, () => rrect(10, y, VW - 20, rowH - 6, 10, 1.2))}" class="rowbox" stroke="${c.main}"/>`;
    const y1 = y + (rowH - 6) * (s ? 0.3 : 0.5), y2 = y + (rowH - 6) * 0.73;
    o += txt(22, y1, name(p), 'rname', `fill="${c.main}"`);
    o += txt(VW - 74, y1, val, 'rval');
    o += txt(VW - 22, y + (rowH - 6) / 2, '+' + h.pts[p], 'rpts', `fill="${h.pts[p] === 0 ? 'var(--ok)' : h.pts[p] >= 10 ? 'var(--red-dark)' : INK}"`);
    if (s) o += txt(22, y2, exprOf(h.dice, s), 'rexpr');
  }
  return o;
}

function viewReveal() {
  const h = G.history.at(-1);
  let o = header(true);
  o += `<g class="dicerow">${h.dice.map((v, k) => die(200 + (k - 2) * 46, 92, 36, v, 'rd' + k)).join('')}</g>`;
  const rowH = G.n <= 3 ? 62 : G.n === 4 ? 54 : 46;
  const y0 = 120;
  o += resultRows(h, y0, rowH);
  const yb = y0 + G.n * rowH + 18;
  const minPts = Math.min(...h.pts);
  if (h.best) {
    if (h.best.pts >= minPts) o += txt(VW / 2, yb, t('n99.res.bestsame'), 'bestline good');
    else o += txt(VW / 2, yb, t('n99.res.best', { e: N99.exprText(N99.finalTile(h.dice, h.best.steps).e, h.dice), v: h.best.value }), 'bestline');
  }
  const last = G.round + 1 >= N99.totalRounds(G);
  o += button(VW / 2 - 85, Math.min(398, yb + 26), 170, 46, t(last ? 'n99.final' : 'n99.next') + ' →', 'next', COLORS[G.leader], true, !connected() || spectator());
  return o;
}

function viewOver() {
  let o = header(false).replace(/>\?</, '>✓<');
  const many = G.n > 3, rowH = many ? 44 : 58, y0 = many ? 102 : 120;
  o += txt(VW / 2, y0 - 18, t('n99.final'), 'big');
  const ranked = [...Array(G.n).keys()].sort((a, b) => G.totals[a] - G.totals[b]);
  ranked.forEach((p, k) => {
    const y = y0 + k * rowH, c = COLORS[p];
    o += `<path d="${shapeFor('orow' + k + rowH, () => rrect(10, y, VW - 20, rowH - 6, 10, 1.2))}" class="rowbox" stroke="${c.main}"/>`;
    o += txt(22, y + (rowH - 6) * 0.3, name(p), 'rname', `fill="${c.main}"`);
    o += txt(VW - 22, y + (rowH - 6) / 2, plural(G.totals[p], 'n99.pts'), 'rtotal', `fill="${c.main}"`);
    o += txt(22, y + (rowH - 6) * 0.73, G.history.map((h) => h.pts[p]).join(' + '), 'rexpr');
  });
  return o;
}

function render() {
  syncWorkspace();
  let o;
  if (G.phase === 'pick') o = viewPick();
  else if (G.phase === 'solve') o = W ? (covered ? viewCover() : viewSolve()) : viewWait();
  else if (G.phase === 'reveal') o = viewReveal();
  else o = viewOver();
  svg.innerHTML = o;
  svg.classList.toggle('picking', G.phase === 'pick');
  if (W && !covered) { W.rolled = true; W.fresh = -1; }
  updateTimer();
  renderPlayers();
}

// ---------- players ----------
let builtN = 0;
function buildPlayers() {
  if (builtN === G.n) return;
  builtN = G.n;
  $('#arena').classList.toggle('many', G.n > 2);
  $('#pcol0').innerHTML = ''; $('#pcol1').innerHTML = '';
  // first half of the table on the left, the rest on the right (2 players: one each side)
  const left = Math.ceil(G.n / 2);
  $('#arena').style.setProperty('--ca', left + 'fr');
  $('#arena').style.setProperty('--cb', G.n - left + 'fr');
  for (let p = 0; p < G.n; p++) {
    $(p < left ? '#pcol0' : '#pcol1').insertAdjacentHTML('beforeend', `
      <div class="player" data-p="${p}">
        <div class="fig-wrap"><div class="bubble"></div><div class="fig"></div></div>
        <input type="text" class="name" maxlength="14" spellcheck="false">
        <div class="score"></div>
      </div>`);
  }
  document.querySelectorAll('.player').forEach((el) => {
    const p = +el.dataset.p;
    el.querySelector('.bubble').style.color = COLORS[p].main;
    el.querySelector('.name').addEventListener('input', (e) => {
      if (online() && !sess.host) cfg.netName = e.target.value;
      else cfg.names[p] = e.target.value;
      saveCfg();
      // guests tell the host, the host tells everybody
      if (online()) sess.host ? sendNames() : sess.send('name', { name: e.target.value });
      renderPlayers();
      if (G.phase !== 'solve' || !W) render();
    });
  });
  moods = Array.from({ length: G.n }, () => ({ mood: 'neutral', pose: 'down' }));
}

function activeSet() {
  if (G.phase === 'pick') return [G.leader];
  if (G.phase === 'solve') {
    if (W && !online()) return [W.p];
    return [...Array(G.n).keys()].filter((p) => !G.done[p]);
  }
  return [...Array(G.n).keys()];
}

function renderPlayers() {
  buildPlayers();
  const act = activeSet();
  for (let p = 0; p < G.n; p++) {
    const el = $(`.player[data-p="${p}"]`);
    const active = act.includes(p);
    el.classList.toggle('active', active);
    const off = online() && ctrl[p] === 'away';
    el.classList.toggle('away', off);
    el.classList.toggle('me', online() && p === mySeat());
    el.querySelector('.fig-wrap').dataset.me = t('n99.you');
    const m = moods[p];
    const pose = m.pose !== 'down' ? m.pose : active && G.phase !== 'reveal' && G.phase !== 'over' ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: off ? 'worried' : m.mood, pose, face: p < Math.ceil(G.n / 2) ? 'right' : 'left', seed: 11 + p * 31 });
    let sc = plural(G.totals[p], 'n99.pts');
    if (G.phase === 'solve' && G.done[p]) sc += ' ✓';
    if (G.phase === 'pick' && G.leader === p) sc += ' ★';
    el.querySelector('.score').textContent = off ? t('n99.away') : sc;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? ownName(p) : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  renderStatus();
  renderControls();
}

function renderStatus() {
  const st = $('#status');
  let s = '', col = INK;
  if (!connected()) s = t(online() && !sess.host && G.n > 2 && lastSeq >= 0 ? 'n99.st.lost' : 'n99.st.wait.net');
  else if (spectator() && G.phase !== 'over') s = t('n99.st.spect');
  else if (G.phase === 'pick') {
    col = COLORS[G.leader].main;
    s = online() && ctrl[G.leader] === 'away' ? t('n99.st.away', { name: name(G.leader) })
      : isLocal(G.leader) && !pendingPick ? (humans() > 1 ? t('n99.st.pick', { name: name(G.leader) }) : t('n99.st.pick.you')) : t('n99.st.pick', { name: name(G.leader) });
  } else if (G.phase === 'solve') {
    if (W && covered) { s = t('n99.st.pass', { name: name(W.p) }); col = COLORS[W.p].main; }
    else if (W) { s = humans() > 1 ? t('n99.st.solve', { name: name(W.p), t: G.target }) : t('n99.st.solve.you', { t: G.target }); col = COLORS[W.p].main; }
    else s = t('n99.st.wait', { names: [...Array(G.n).keys()].filter((p) => !G.done[p]).map(nameAway).join(', ') });
  } else if (G.phase === 'reveal') {
    const h = G.history.at(-1), m = Math.min(...h.pts), best = [...h.pts.keys()].filter((p) => h.pts[p] === m);
    const msg = best.length === 1 ? t('n99.st.roundwin', { name: name(best[0]) }) : t('n99.st.roundtie');
    if (best.length === 1) col = COLORS[best[0]].main;
    s = t('n99.st.reveal', { r: G.round + 1, msg });
  }
  st.textContent = s;
  st.style.color = col;
}

function renderControls() {
  const host = !online() || sess.host;
  $('#undo').disabled = !(W && !covered && W.hist.length);
  $('#mode').disabled = online();
  // online the host picks how many seats the room has (never fewer than the guests already seated)
  $('#players').disabled = !host;
  $('#f-players').hidden = !online() && cfg.mode !== 'pvp';
  const top = online() && sess.host ? Math.max(...sess.seats(), ...liveSeats().filter((g) => g < SPECT)) : 0;
  for (const o of $('#players').options) o.disabled = +o.value <= top;
  $('#timer').disabled = !host;
  $('#rounds').disabled = !host;
  $('#new').disabled = !host;
  $('#again').hidden = !host;
  $('#result-wait').hidden = host;
  if (online()) $('#result-wait').textContent = t('n99.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('n99.online.note') + (G.n > 2 ? ' ' + t('n99.online.note.n') : '') : '';
}

// ---------- speech & moods ----------
const bubbleTimers = [];
function say(p, key, vars) {
  const b = $(`.player[data-p="${p}"] .bubble`);
  if (!b) return;
  b.textContent = t(key, vars);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 2000);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const calm = () => { for (let p = 0; p < G.n; p++) setMood(p, 'neutral'); };

// Reactions run once per phase change, on every device, from the shared state alone.
function react() {
  const tag = `${G.id}:${G.round}:${G.phase}`;
  if (tag === lastTag) return;
  lastTag = tag;
  buildPlayers();
  if (G.phase === 'pick') calm();
  if (G.phase === 'solve') {
    calm();
    setMood(G.leader, 'smug', 'wave');
    say(G.leader, 'n99.say.target', { t: G.target });
    for (let p = 0; p < G.n; p++) if (isAI(p)) setTimeout(() => G.phase === 'solve' && say(p, 'n99.say.think'), 2200);
  }
  if (G.phase === 'reveal') {
    const h = G.history.at(-1), m = Math.min(...h.pts);
    let talk = 0;
    for (let p = 0; p < G.n; p++) {
      const x = h.pts[p];
      if (x === 0) { setMood(p, 'happy', 'up'); if (talk++ < 2) say(p, 'n99.say.zero', { t: h.target }); }
      else if (x >= N99.MAXPTS) { setMood(p, 'sad'); if (talk++ < 2) setTimeout(() => say(p, 'n99.say.bad'), 700); }
      else if (x === m) setMood(p, 'happy', 'wave');
      else if (m === 0) { setMood(p, 'worried'); if (talk++ < 2) setTimeout(() => say(p, 'n99.say.envy'), 700); }
      else setMood(p, 'neutral');
    }
    if (m > 0 && talk === 0) {
      const w = h.pts.indexOf(m);
      say(w, m <= 3 ? 'n99.say.close' : 'n99.say.far');
    }
  }
  if (G.phase === 'over') finish();
}

function finish() {
  const ws = N99.winners(G);
  const all = ws.length === G.n;
  for (let p = 0; p < G.n; p++) {
    if (all) setMood(p, 'worried');
    else if (ws.includes(p)) { setMood(p, 'happy', 'up'); say(p, 'n99.say.win'); }
    else { setMood(p, 'sad'); setTimeout(() => say(p, 'n99.say.lose'), 900); }
  }
  const tx = $('#result-text');
  if (ws.length === 1) {
    tx.textContent = online() && ws[0] === mySeat() ? t('n99.win.you') : t('n99.win', { name: name(ws[0]) });
    tx.style.color = COLORS[ws[0]].main;
  }
  else { tx.textContent = all ? t('n99.tie') : t('n99.tie.some', { names: ws.map(name).join(', ') }); tx.style.color = INK; }
  $('#result-sub').textContent = G.n === 2 ? `${plural(G.totals[ws[0]], 'n99.pts')} : ${plural(Math.max(...G.totals), 'n99.pts')}` : '';
  $('#result-sub').hidden = G.n !== 2;
  setTimeout(() => { if (G.phase === 'over') $('#result').hidden = false; }, 900);
}

// ---------- workspace & timer ----------
function syncWorkspace() {
  const p = localSolver();
  const key = p < 0 ? '' : `${G.id}:${G.round}:${p}`;
  if (key === (W ? W.key : '')) return;
  stopTimer();
  W = p < 0 ? null : { key, p, tiles: N99.startTiles(G.dice), steps: [], hist: [], sel: -1, op: null, best: null, fresh: -1, rolled: false, err: '' };
  covered = !!W && humans() > 1;
  if (W && !covered) startTimer();
}
function startTimer() {
  stopTimer();
  hurried = false;
  if (!G.timer) return;
  deadline = Date.now() + G.timer * 1000;
  tickT = setInterval(updateTimer, 250);
}
function stopTimer() { clearInterval(tickT); tickT = null; deadline = 0; }
function updateTimer() {
  const el = svg.querySelector('#timer-txt');
  if (!deadline || !W) return;
  const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  if (el) {
    el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    el.classList.toggle('low', left <= 10);
  }
  if (left <= 10 && !hurried) {
    hurried = true;
    const other = [...Array(G.n).keys()].find((p) => p !== W.p && (isAI(p) || humans() === 1 || online()));
    if (other !== undefined) say(other, 'n99.say.hurry');
  }
  if (left <= 0) finishLocal();
}

function tapTile(i) {
  if (!W || covered) return;
  W.err = '';
  if (W.sel < 0 || W.tiles.length < 2) W.sel = W.tiles.length > 1 ? i : -1;
  else if (W.sel === i) { W.sel = -1; W.op = null; }
  else if (!W.op) W.sel = i;
  else return doCombine(W.sel, W.op, i);
  render();
}
function tapOp(op) {
  if (!W || W.sel < 0) return;
  W.err = '';
  W.op = W.op === op ? null : op;
  render();
}
function doCombine(i, op, j) {
  const nt = N99.combine(W.tiles, i, op, j);
  if (!nt) { W.err = '÷ 0 ✗'; W.op = null; return render(); }
  W.hist.push({ tiles: W.tiles, steps: W.steps.slice() });
  W.tiles = nt;
  W.steps = [...W.steps, [i, op, j]];
  const k = j > i ? j - 1 : j;
  W.fresh = k;
  W.sel = nt.length > 1 ? k : -1;
  W.op = null;
  if (nt.length === 1) {
    const v = nt[0].v, pts = N99.points(G.target, v);
    if (!W.best || pts < W.best.pts) W.best = { steps: W.steps.map((s) => s.slice()), pts, label: N99.fracText(v).replace('-', '−') };
    if (pts === 0) { setMood(W.p, 'happy', 'up'); say(W.p, 'n99.say.exact'); }
    else if (pts <= 3) { setMood(W.p, 'happy'); say(W.p, 'n99.say.close'); }
    else { setMood(W.p, 'worried'); say(W.p, 'n99.say.far'); }
  }
  render();
}
function resetWork() {
  if (!W || !W.steps.length) return;
  W.hist.push({ tiles: W.tiles, steps: W.steps.slice() });
  W.tiles = N99.startTiles(G.dice); W.steps = []; W.sel = -1; W.op = null; W.err = '';
  setMood(W.p, 'neutral');
  render();
}
function undo() {
  if (!W || covered || !W.hist.length) return;
  const h = W.hist.pop();
  W.tiles = h.tiles; W.steps = h.steps; W.sel = -1; W.op = null; W.err = '';
  render();
}

// Hand in the best answer found so far (or nothing).
function finishLocal() {
  if (!W) return;
  const p = W.p, steps = W.best ? W.best.steps : null;
  stopTimer();
  setMood(p, 'neutral');
  if (online() && !sess.host) {
    sess.send('submit', { id: G.id, round: G.round, steps });
    G.done[p] = true; G.subs[p] = steps;
    W = null;
    return render();
  }
  N99.submit(G, p, steps);
  W = null;
  changed();
}

// ---------- flow ----------
function changed() {
  clearTimeout(aiTimer);
  const host = !online() || sess.host;   // guests never run the computer players: the host does
  if (online() && sess.host) computeCtrl();
  if (G.phase === 'pick') G.auto = [];
  // the computer answers instantly; its answer stays hidden until the reveal
  if (G.phase === 'solve' && host) {
    for (let p = 0; p < G.n; p++) {
      if (isAI(p) && !G.done[p]) { (G.auto ||= [])[p] = true; N99.submit(G, p, N99.aiSteps(G.dice, G.target, aiLevel())); }
    }
  }
  if (online() && sess.host) sendState();
  $('#result').hidden = G.phase !== 'over' || $('#result').hidden;
  react();
  render();
  if (G.phase === 'pick' && isAI(G.leader) && host) {
    aiTimer = setTimeout(() => { if (G.phase === 'pick' && isAI(G.leader)) { N99.setTarget(G, N99.aiTarget(), N99.rollDice()); changed(); } }, 1100);
  }
}

function pickTarget(v) {
  if (G.phase !== 'pick' || !isLocal(G.leader) || !connected() || pendingPick) return;
  if (online() && !sess.host) {
    pendingPick = true;
    sess.send('target', { id: G.id, round: G.round, t: v });
    return render();
  }
  N99.setTarget(G, v, N99.rollDice());
  changed();
}
function nextRound() {
  if (G.phase !== 'reveal' || !connected() || spectator()) return;
  if (online() && !sess.host) return sess.send('next', { id: G.id, round: G.round });
  N99.nextRound(G);
  changed();
}

function newGame() {
  clearTimeout(aiTimer);
  stopTimer();
  const n = online() || cfg.mode === 'pvp' ? cfg.n : 2;
  G = N99.newMatch({ n, perLeader: cfg.perLeader, first: nextFirst % n, timer: cfg.timer });
  nextFirst = (nextFirst + 1) % n;
  W = null; covered = false; pendingPick = false; lastTag = '';
  builtN = 0;
  $('#result').hidden = true;
  changed();
}
const canRestart = () => !online() || sess.host;
function restart() { if (canRestart()) newGame(); }

// ---------- online ----------
// Host is authoritative: guests send what they intend (target, answer, next), the host checks it with
// the engine, applies it and sends every seat its own view. While answers are being worked out a seat
// only learns *that* the others are done, never their answers (each state is cut per seat).
// host: game seats with a live device (the host's own included)
function liveSeats() {
  const net = sess.seats();
  return [0, ...[...gameOf].filter(([n]) => net.includes(n)).map(([, g]) => g)];
}
// host: pick a game seat for a device that said hello from net seat n
function seatFor(n, cid, did) {
  const live = new Set(liveSeats());
  const open = (k) => k > 0 && k < G.n && !live.has(k);
  const mine = owner.indexOf(cid);
  if (open(mine)) return mine;
  const sameBrowser = did ? ownerDid.findIndex((d, k) => d === did && open(k)) : -1;
  if (sameBrowser > 0) return sameBrowser;
  const seats = [n, ...Array.from({ length: G.n }, (_, k) => k)];
  // a seat nobody has had yet, then one whose device dropped out (net.js hands those out only when the room is full)
  return seats.find((k) => open(k) && !owner[k]) ?? seats.find((k) => open(k) && !away.has(k)) ?? seats.find(open) ?? SPECT + n;
}
function seat(n, cid, did) {
  const g = seatFor(n, cid, did);
  gameOf.set(n, g);
  if (g < SPECT) {
    owner[g] = cid; ownerDid[g] = did;
    clearTimeout(away.get(g)); away.delete(g);
  }
  return g;
}
// host: seat a device that said hello (now, or once the tab it replaces has dropped)
const pendingHi = new Map(); // host: net seat → timer (waiting for its old tab to drop)
const hiName = new Map();    // host: net seat → the name it said hello with
function seatNow(n, quiet) {
  clearTimeout(pendingHi.get(n)); pendingHi.delete(n);
  if (!sess || !sess.seats().includes(n) || !cidOf.has(n)) return;
  const g = seat(n, cidOf.get(n), didOf.get(n));
  if (g < SPECT) remoteNames[g] = hiName.get(n) ?? '';
  if (!quiet) changed();
}
const clearPending = () => { for (const tm of pendingHi.values()) clearTimeout(tm); pendingHi.clear(); hiName.clear(); };
// host: watchers get a seat once one opens up (more players, someone left for good)
function reseat() {
  const net = sess.seats();
  for (const [n, g] of gameOf) if (net.includes(n) && g >= G.n) {
    const cid = cidOf.get(n), did = didOf.get(n), k = seatFor(n, cid, did);
    if (k < SPECT) { gameOf.set(n, k); owner[k] = cid; ownerDid[k] = did; remoteNames[k] = hiName.get(n) ?? ''; }
  }
}
function computeCtrl() {
  reseat();
  const live = liveSeats();
  ctrl = Array.from({ length: G.n }, (_, p) => {
    if (p === 0) return 'host';
    if (live.includes(p)) return 'on';
    if (away.has(p) || (G.n === 2 && owner[p])) return 'away';
    return G.n === 2 ? 'free' : 'cpu';
  });
}
function viewFor(k) {
  const g = N99.clone(G);
  if (g.phase === 'solve') g.subs = g.subs.map((s, p) => (p === k ? s : null));
  return g;
}
const netNames = () => remoteNames.map((n, k) => (k === 0 ? cfg.names[0] || '' : n));
// The host keeps the match in sessionStorage, so reloading its tab doesn't wipe the game.
const roomKey = (s) => `mg-n99-room-${s.code}`;
function persist() {
  if (online() && sess.host) sessionStorage.setItem(roomKey(sess), JSON.stringify({ G, owner, ownerDid, names: remoteNames, nextFirst, seq }));
}
// to: one game seat (a resync), or everybody
function sendState(to) {
  seq++;
  persist();
  const names = netNames(), net = sess.seats();
  for (const [n, g] of gameOf) {
    if (net.includes(n) && (to === undefined || g === to)) sess.send('state', { G: viewFor(g), seq, names, ctrl, you: g }, { to: n });
  }
}
const sendNames = () => { persist(); sess.send('names', { names: netNames() }); };
const takeNames = (names) => { if (Array.isArray(names)) names.forEach((n, k) => { if (k < remoteNames.length) remoteNames[k] = String(n || '').slice(0, 14); }); };
const refresh = () => (G.phase === 'solve' && W ? renderPlayers() : render());
function clearAway() { for (const tm of away.values()) clearTimeout(tm); away.clear(); }
// 3+ players: a seat whose device dropped gets a moment to come back (a reload), then the computer plays it
function markAway(g) {
  clearTimeout(away.get(g));
  away.set(g, setTimeout(() => { away.delete(g); if (sess && sess.host) changed(); }, AWAY_MS));
}

function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  clearAway(); clearPending(); gameOf.clear(); cidOf.clear(); didOf.clear(); owner = []; ownerDid = []; remoteNames.fill(''); ctrl = []; lastSeq = -1; myG = -1;
  const mine = () => sess === s;
  s.on('status', () => mine() && render());
  s.on('peer-join', () => {
    if (!mine()) return;
    // guest: (re)connected to the host — say who we are; the host answers with our seat and the state
    if (!s.host) { lastSeq = -1; s.send('hi', { cid: myCid, did: myDid, name: ownName(mySeat()) }); return render(); }
    render();
  });
  s.on('hi', (d, { seat: n }) => {
    if (!mine() || !s.host || !d || typeof d.cid !== 'string') return;
    const did = typeof d.did === 'string' ? d.did : '';
    gameOf.delete(n); cidOf.set(n, d.cid); didOf.set(n, did); hiName.set(n, String(d.name || '').slice(0, 14));
    // The link reopened in a new tab while the old tab's seat still looks connected (its heartbeat hasn't
    // timed out yet): hold on a few seconds so this tab gets that seat back rather than a computer seat.
    const live = liveSeats();
    const twin = did ? ownerDid.findIndex((x, k) => x === did && k > 0 && k < G.n && live.includes(k) && owner[k] !== d.cid) : -1;
    clearTimeout(pendingHi.get(n));
    if (twin > 0) { pendingHi.set(n, setTimeout(() => mine() && seatNow(n), 10000)); return; }
    seatNow(n);
  });
  s.on('peer-leave', (d) => {
    if (!mine()) return;
    if (!s.host) return render();
    const g = gameOf.get(d.seat);
    gameOf.delete(d.seat); cidOf.delete(d.seat); didOf.delete(d.seat); hiName.delete(d.seat);
    clearTimeout(pendingHi.get(d.seat)); pendingHi.delete(d.seat);
    if (g === undefined) return render();
    if (G.n > 2 && g < G.n) markAway(g);
    for (const n of [...pendingHi.keys()]) seatNow(n, true);
    changed();
  });
  s.on('state', (d) => {
    if (s.host || !d || !d.G) return;
    if (G && d.G.id === G.id && d.seq <= lastSeq) return;
    lastSeq = d.seq;
    if (!G || d.G.id !== G.id) { lastTag = ''; $('#result').hidden = true; }
    if (Number.isInteger(d.you)) myG = d.you;
    // keep my own answer if the host hasn't seen it yet
    const me = mySeat();
    const keep = G && G.id === d.G.id && G.round === d.G.round && G.phase === 'solve' && d.G.phase === 'solve' && G.done[me] && !d.G.done[me];
    const steps = keep ? G.subs[me] : null;
    G = d.G;
    ctrl = Array.isArray(d.ctrl) ? d.ctrl : [];
    takeNames(d.names);
    if (keep) { G.done[me] = true; G.subs[me] = steps; s.send('submit', { id: G.id, round: G.round, steps }); }
    pendingPick = false;
    syncSettingsUI();
    react();
    render();
  });
  s.on('names', (d) => { if (!s.host && d) { takeNames(d.names); refresh(); } });
  // host side: messages from a guest, by its game seat (ignored until it has said hello)
  const from = (n) => gameOf.get(n) ?? -1;
  s.on('name', (d, { seat: n }) => {
    const g = from(n);
    if (!s.host || !(g > 0) || g >= remoteNames.length) return;
    remoteNames[g] = String(d?.name || '').slice(0, 14);
    sendNames();
    refresh();
  });
  s.on('target', (d, { seat: n }) => {
    const g = from(n);
    if (!s.host || g < 0) return;
    if (!d || d.id !== G.id || d.round !== G.round || G.phase !== 'pick' || G.leader !== g || isAI(g) || !N99.validTarget(d.t)) return sendState(g);
    N99.setTarget(G, d.t, N99.rollDice());
    changed();
  });
  s.on('submit', (d, { seat: n }) => {
    const g = from(n);
    if (!s.host || g < 0) return;
    if (!d || d.id !== G.id || d.round !== G.round || G.phase !== 'solve' || !(g < G.n) || G.done[g]) return sendState(g);
    N99.submit(G, g, d.steps);
    changed();
  });
  s.on('next', (d, { seat: n }) => {
    const g = from(n);
    if (!s.host || g < 0) return;
    if (!d || d.id !== G.id || d.round !== G.round || G.phase !== 'reveal' || !(g < G.n)) return sendState(g);
    N99.nextRound(G);
    changed();
  });
  s.on('resync', (d, { seat: n }) => s.host && from(n) >= 0 && sendState(from(n)));
  if (s.host) {
    const saved = JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
    if (saved && saved.G) {
      // the host reloaded: same match; everybody who had a seat gets a moment to reconnect
      G = saved.G; owner = saved.owner || []; ownerDid = saved.ownerDid || []; takeNames(saved.names); nextFirst = saved.nextFirst || 0; seq = saved.seq || 0;
      if (G.n > 2) owner.forEach((c, g) => c && g > 0 && g < G.n && markAway(g));
      if (s.maxPlayers !== G.n) s.setMaxPlayers(G.n);
      W = null; covered = false; pendingPick = false; lastTag = ''; builtN = 0;
      $('#result').hidden = true;
      syncSettingsUI();
      changed();
    } else { nextFirst = 0; newGame(); }
  } else { G = N99.newMatch({ n: 2, timer: cfg.timer, perLeader: cfg.perLeader }); G.id = 'wait'; lastTag = ''; builtN = 0; W = null; render(); }
}

// ---------- settings ----------
function fillSelects() {
  $('#timer').innerHTML = TIMERS.map((s) => `<option value="${s}">${s === 0 ? t('n99.timer.off') : s < 120 ? t('n99.timer.s', { n: s }) : t('n99.timer.m', { n: s / 60 })}</option>`).join('');
  $('#rounds').innerHTML = [1, 2, 3].map((n) => `<option value="${n}">${plural(n, 'n99.rounds.n')}</option>`).join('');
  syncSettingsUI();
}
function syncSettingsUI() {
  const g = G && online() ? G : null;
  $('#mode').value = cfg.mode;
  $('#players').value = g ? g.n : cfg.n;
  $('#timer').value = g ? g.timer : cfg.timer;
  $('#rounds').value = g ? g.perLeader : cfg.perLeader;
}

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); nextFirst = 0; newGame(); });
$('#players').addEventListener('change', (e) => {
  if (!canRestart()) return syncSettingsUI();
  cfg.n = +e.target.value; saveCfg();
  if (online()) sess.setMaxPlayers(cfg.n);   // the room offers as many seats as the game has players
  nextFirst = 0; newGame();
});
$('#timer').addEventListener('change', (e) => {
  cfg.timer = +e.target.value; saveCfg();
  G.timer = cfg.timer;               // applies from the next answer on
  if (online() && sess.host) sendState();
});
$('#rounds').addEventListener('change', (e) => { cfg.perLeader = +e.target.value; saveCfg(); restart(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);

// ---------- input ----------
svg.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const act = a.dataset.act;
  if (act === 'tile') tapTile(+a.dataset.i);
  else if (act === 'op') tapOp(a.dataset.op);
  else if (act === 'reset') resetWork();
  else if (act === 'done') finishLocal();
  else if (act === 'pick') pickTarget(+a.dataset.t);
  else if (act === 'random') pickTarget(N99.aiTarget());
  else if (act === 'go') { covered = false; startTimer(); render(); }
  else if (act === 'next') nextRound();
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, dialog[open]') || !W || covered) return;
  const k = e.key;
  const op = { '+': '+', '-': '-', '*': '*', x: '*', 'х': '*', '/': '/', ':': '/' }[k];
  if (op) { tapOp(op); e.preventDefault(); }
  else if (/^[1-5]$/.test(k) && +k <= W.tiles.length) tapTile(+k - 1);
  else if (k === 'Backspace') { undo(); e.preventDefault(); }
  else if (k === 'Enter' && W.best) finishLocal();
  else if (k === 'Escape') { W.sel = -1; W.op = null; render(); }
});
document.addEventListener('mg:lang', () => { fillSelects(); render(); if (G.phase === 'over') finish(); });

// ---------- boot ----------
// The room size is the host's player count. A guest only learns it from the host's welcome, so until
// then (e.g. for the "room is full" message) it assumes the biggest table rather than its own setting.
const N_MAX = 5;
let creating = false;
document.addEventListener('click', (e) => { creating = !!e.target.closest?.('#mg-online [data-act=host]'); }, true);
const hosting = () => creating || !!JSON.parse(sessionStorage.getItem('mg-net-' + SLUG) || 'null')?.host;

injectDefs();
mountTools();
mountSheets();
applyI18n();
fillSelects();
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { if (sess) sessionStorage.removeItem(roomKey(sess)); sess = null; clearAway(); clearPending(); ctrl = []; owner = []; ownerDid = []; gameOf.clear(); cidOf.clear(); didOf.clear(); myG = -1; nextFirst = 0; newGame(); },
  maxPlayers: () => (hosting() ? cfg.n : N_MAX),
});
// for scripted UI checks
window.__n99 = { get G() { return G; }, get ctrl() { return ctrl; }, get seat() { return !sess ? -1 : sess.host ? 0 : myG; }, get status() { return sess ? sess.status : ''; }, seats: () => (sess ? sess.seats() : []), name: (p) => name(p), map: () => [...gameOf], send: (type, payload) => sess && sess.send(type, payload) };
if (!online()) showOnce('how', SLUG);
