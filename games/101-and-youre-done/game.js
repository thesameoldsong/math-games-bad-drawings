import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { H101 } from './engine.js';
import './strings.js';

const SLUG = '101-and-youre-done';
const VW = 400;
const COLORS = [
  PALETTE.blue, PALETTE.red,
  PALETTE.green,
  { main: 'var(--h101-orange)', text: 'var(--h101-orange-text)', fill: 'var(--h101-orange-fill)', dark: 'var(--h101-orange-face)' },
];
const INK = PALETTE.ink;
const ROUNDS = [1, 3, 5, 7];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', n: 2, rounds: 5, names: ['', '', '', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
while (cfg.names.length < 4) cfg.names.push('');
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let G;                       // engine state; online the host's copy is authoritative
let undoStack = [];          // snapshots before each local human decision
let aiTimer, rolledNow = false, justMoved = false, pending = false, nextFirst = 0;
let sess = null;             // online session (shared/net.js)
let guestEnded = false;
const netNames = ['', '', '', ''];  // online: names of the other seats, as the host relays them
let ctrl = [];               // online, per seat: 'human' | 'away' (device dropped, waiting) | 'cpu' (no device)
const awayTimers = [];
const AWAY_MS = 15000;       // a dropped player gets this long before the computer takes over (3+ players)
// Game seats vs. net seats: net.js numbers guests in the order they (re)connect, which after a host reload can
// differ from who sat where. So the host remembers which tab owns each game seat and maps every connected
// net seat to its game seat; guests learn theirs from 'state' ('you').
const tabId = () => sessionStorage.getItem('mg-client-id') || '';
let owner = [];              // host: game seat → tab id of the device that plays it
const n2g = new Map();       // host: connected net seat → game seat
let myG = null;              // guest: my game seat, as told by the host
const backAfterReload = new Set(); // host after a reload: seats whose devices haven't come back yet
const CPU_LEVEL = 'normal';
let moods = [];
const shapes = {};
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => (sess.host ? 0 : myG ?? sess.seat);
const gOf = (k) => (k === 0 ? 0 : n2g.has(k) ? n2g.get(k) : -1);   // host: net seat → game seat (-1: not known yet)
// 3–4 seats online: empty seats are played by the computer and the host never has to wait.
const multi = () => online() && G.n > 2;
const isAI = (p) => (online() ? multi() && ctrl[p] === 'cpu' : cfg.mode !== 'pvp' && p === 1);
const isAway = (p) => multi() && ctrl[p] === 'away';
const isRemote = (p) => online() && p !== mySeat() && !isAI(p);
const isLocal = (p) => !isAI(p) && !isRemote(p);
const spectator = () => online() && mySeat() >= G.n;
const connected = () => !online() || (sess.host && multi()) || sess.connected;
const humans = () => (online() ? 1 : cfg.mode === 'pvp' ? G.n : 1);
function name(p) {
  if (isAI(p) && !online()) return t('h101.cpu');
  if (isAI(p)) return t('h101.p' + p);
  const n = online() && p !== mySeat() ? netNames[p] : cfg.names[p];
  return (n && n.trim()) || t('h101.p' + p);
}
const initial = (p) => [...name(p).trim()][0]?.toUpperCase() || '?';
const canAct = () => !pending && connected() && (G.phase === 'roll' || G.phase === 'choose') && isLocal(G.turn);
const canNext = () => !pending && connected() && G.phase === 'roundover';

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
const stroke = (d, c, w = 2.6, extra = '') => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" ${extra}/>`;
const PIPS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

// ---------- board layout (viewBox 400 × 430) ----------
const X0 = 24, X100 = 338, TRACK_Y = 82;
const xOf = (v) => X0 + ((X100 - X0) * v) / 100;
const COL_Y = 128, ROW_H = 24, CTRL_Y = 334;

function render() {
  let o = '';
  o += header();
  o += track();
  o += columns();
  o += controls();
  svg.innerHTML = o;
  svg.dataset.match = `${G.id}:${G.round}:${G.seq}:${G.phase}`; // for test probes
  rolledNow = false;
  justMoved = false;
  renderPlayers();
  persist();
}

function header() {
  // one pip per round: winner's colour, ink dot for a shared round, a cross when nobody took it
  const r = 9, gap = 22, x0 = VW - 14 - (G.rounds - 1) * gap;
  let o = txt(x0 - 18, 16, t('h101.round', { r: G.round + 1, n: G.rounds }), 'lbl round end');
  for (let i = 0; i < G.rounds; i++) {
    const x = x0 + i * gap, y = 16, h = G.history[i];
    const ring = shapeFor(`pip${i}:${G.rounds}`, () => circle(x, y, r, r, 0.08));
    if (!h) { o += stroke(ring, i === G.round ? INK : PALETTE.pencil, 2.2); continue; }
    if (h.winners.length === 1) {
      const c = COLORS[h.winners[0]];
      o += `<path d="${ring}" fill="${c.main}" filter="url(#mg-crayon)"/>` + stroke(ring, c.text, 2.2);
    } else if (h.winners.length) {
      h.winners.forEach((p, k) => {
        const a = (k / h.winners.length) * Math.PI * 2;
        o += `<circle cx="${fx(x + Math.cos(a) * 4)}" cy="${fx(y + Math.sin(a) * 4)}" r="3.6" fill="${COLORS[p].main}"/>`;
      });
      o += stroke(ring, INK, 2.2);
    } else {
      o += stroke(ring, PALETTE.pencil, 2.2) + stroke(line(x - 5, y - 5, x + 5, y + 5, 0.4), PALETTE.red.text, 2.4) + stroke(line(x + 5, y - 5, x - 5, y + 5, 0.4), PALETTE.red.text, 2.4);
    }
  }
  return o;
}

// The number line 0…100 with a bust zone past the end; one pin per player.
function track() {
  let o = '';
  o += `<path d="${shapeFor('bustzone', () => rrect(X100 + 12, TRACK_Y - 14, 38, 28, 6, 1.2))}" class="bustzone"/>`;
  o += txt(X100 + 31, TRACK_Y + 1, '✗', 'bustx');
  o += stroke(shapeFor('track', () => line(X0, TRACK_Y, X100, TRACK_Y, 1.2)), INK, 3);
  for (let v = 0; v <= 100; v += 10) {
    const x = xOf(v), big = v % 50 === 0;
    o += stroke(shapeFor('tick' + v, () => line(x, TRACK_Y - (big ? 7 : 4), x, TRACK_Y + (big ? 7 : 4), 0.3)), v === 100 ? PALETTE.red.text : INK, big ? 2.6 : 1.8);
    if (big) o += txt(x, TRACK_Y + 19, v, 'tick-lbl' + (v === 100 ? ' hundred' : ''));
  }
  // pins, bumped upward when they would overlap
  const pins = [...Array(G.n).keys()].map((p) => ({ p, x: G.bust[p] ? X100 + 31 : xOf(G.totals[p]) }));
  pins.sort((a, b) => a.x - b.x || a.p - b.p);
  const PR = G.n > 2 ? 8.5 : 10, placed = [];
  for (const pin of pins) {
    let lvl = 0;
    while (placed.some((q) => q.lvl === lvl && Math.abs(q.x - pin.x) < PR * 2 + 1)) lvl++;
    pin.lvl = lvl;
    placed.push(pin);
  }
  let stems = '', heads = '';
  for (const { p, x, lvl } of placed) {
    const y = TRACK_Y - 20 - lvl * (PR * 2 + 0.5), c = COLORS[p];
    const active = (G.phase === 'roll' || G.phase === 'choose') && G.turn === p;
    stems += stroke(`M${fx(x)} ${fx(y + 8)} L${fx(x)} ${fx(TRACK_Y - 2)}`, c.text, 2);
    heads += `<g class="pin${active ? ' active' : ''}">`;
    const ring = shapeFor(`pin${p}:${PR}`, () => circle(0, 0, PR, PR, 0.06));
    heads += `<g transform="translate(${fx(x)} ${fx(y)})"><path d="${ring}" fill="${G.bust[p] ? 'var(--card)' : c.main}" stroke="${c.text}" stroke-width="2.2"/>`;
    heads += txt(0, 1, initial(p), 'pin-lbl', `font-size="${PR * 1.45}" ` + `fill="${G.bust[p] ? c.text : 'var(--on-accent)'}"`) + '</g></g>';
  }
  return o + stems + heads;
}

// One score column per player: six slots, then the total.
function columns() {
  let o = '';
  const w = VW / G.n, hw = Math.min(w - 12, 150);
  const winners = G.phase === 'roundover' || G.phase === 'over' ? G.history[G.round].winners : [];
  for (let p = 0; p < G.n; p++) {
    const cx = w * p + w / 2, c = COLORS[p];
    const active = (G.phase === 'roll' || G.phase === 'choose') && G.turn === p;
    o += stroke(shapeFor(`chead${p}:${G.n}`, () => line(cx - hw / 2, COL_Y - 6, cx + hw / 2, COL_Y - 6, 1)), c.main, active ? 5 : 3.5);
    const rolls = G.rolls[p];
    for (let i = 0; i < H101.ROLLS; i++) {
      const y = COL_Y + 12 + i * ROW_H, r = rolls[i];
      if (r) {
        const fresh = G.last && G.last.p === p && i === rolls.length - 1 && justMoved;
        const busted = G.bust[p] && i === rolls.length - 1;
        o += txt(cx, y, '+' + (r.x10 ? r.d * 10 : r.d), `entry${r.x10 ? ' tens' : ''}${fresh ? ' fresh' : ''}${busted ? ' over' : ''}`, `fill="${busted ? PALETTE.red.text : r.x10 ? c.text : INK}"`);
      } else if (active && i === rolls.length) {
        o += `<path d="${shapeFor(`slot${p}:${i}:${G.n}`, () => rrect(cx - 30, y - 11, 60, 22, 7, 1))}" class="slot" stroke="${c.main}"/>`;
        if (G.phase === 'choose') o += txt(cx, y, '?', 'entry pend', `fill="${c.main}"`);
      } else if (!G.bust[p]) {
        o += stroke(shapeFor(`dash${p}:${i}:${G.n}`, () => line(cx - 8, y, cx + 8, y, 0.5)), PALETTE.pencil, 2);
      }
    }
    const ty = COL_Y + 12 + H101.ROLLS * ROW_H + 4;
    o += stroke(shapeFor(`csum${p}:${G.n}`, () => line(cx - hw / 2 + 10, ty - 12, cx + hw / 2 - 10, ty - 12, 0.8)), INK, 2);
    const total = G.totals[p], ycen = ty + 14;
    if (G.bust[p]) {
      o += txt(cx - 14, ycen, total, 'total bust', `fill="${PALETTE.red.text}"`);
      o += stroke(shapeFor(`strike${p}:${G.n}`, () => line(cx - 40, ycen + 6, cx + 12, ycen - 6, 0.8)), PALETTE.red.text, 3);
      o += txt(cx + 26, ycen + 1, '0', 'total', `fill="${PALETTE.red.text}"`);
    } else {
      o += txt(cx, ycen, total, 'total', `fill="${c.text}"`);
    }
    if (winners.includes(p)) {
      o += stroke(shapeFor(`win${p}:${G.n}:${G.round}`, () => circle(cx, ycen, Math.min(hw / 2 - 2, 42), 20, 0.07)), c.main, 3.2, 'class="winring"');
    }
  }
  return o;
}

function die(x, y, s, v, extra = '') {
  let o = `<path d="${shapeFor(`die${s}`, () => rrect(x - s / 2, y - s / 2, s, s, s * 0.2, 1.3))}" class="die-body"/>`;
  if (v) for (const [a, b] of PIPS[v]) o += `<circle cx="${fx(x + a * s * 0.26)}" cy="${fx(y + b * s * 0.26)}" r="${fx(s * 0.085)}" class="pip"/>`;
  else o += txt(x, y + 2, '?', 'die-q', `font-size="${fx(s * 0.6)}"`);
  return `<g class="die ${extra}" style="--rot:${(Math.random() * 40 - 20).toFixed(0)}deg">${o}</g>`;
}

function button(x, y, w, h, key, color, { act, off, primary, big, small, smallCls = '' }) {
  const d = shapeFor(`btn${key}:${w}`, () => rrect(x, y, w, h, 12, 1.6));
  const on = !off && primary;
  let o = `<g class="sbtn${off ? ' off' : ''}" ${off ? '' : `data-act="${act}"`}>`;
  o += `<path d="${d}" fill="${on ? color.main : 'var(--card)'}" stroke="${on ? color.text : off ? INK : color.text}" stroke-width="2.8"/>`;
  const fill = on ? 'var(--on-accent)' : INK;
  if (small) {
    o += txt(x + w / 2, y + h * 0.36, big, 'btn-big', `fill="${fill}"`);
    o += txt(x + w / 2, y + h * 0.76, small, 'btn-small ' + smallCls, smallCls ? '' : `fill="${fill}"`);
  } else o += txt(x + w / 2, y + h / 2 + 1, big, 'btn-txt', `fill="${fill}"`);
  return o + '</g>';
}

function controls() {
  let o = `<path d="${shapeFor('ctrlline', () => line(8, CTRL_Y - 10, VW - 8, CTRL_Y - 10, 1))}" stroke="${PALETTE.pencil}" stroke-width="2" stroke-dasharray="2 7" fill="none" stroke-linecap="round"/>`;
  const DX = 60, DY = CTRL_Y + 46, DS = 74;
  const bx = 118, bw = VW - bx - 10, by = CTRL_Y + 12, bh = 68;
  if (G.phase === 'over') return o + die(DX, DY, DS, G.last ? G.last.d : 0, 'faded');
  if (G.phase === 'roundover') {
    o += die(DX, DY, DS, G.last ? G.last.d : 0, 'faded');
    return o + button(bx, by + 6, bw, bh - 12, 'next', COLORS[(G.first + 1) % G.n], { act: 'next', off: !canNext(), primary: true, big: t('h101.next') });
  }
  const p = G.turn, c = COLORS[p], mine = canAct();
  if (G.phase === 'roll') {
    const lastV = G.last && !mine ? G.last.d : 0;
    o += `<g ${mine ? 'data-act="roll"' : ''} class="${mine ? 'tap' : ''}">` + `<rect x="${DX - DS / 2 - 6}" y="${DY - DS / 2 - 6}" width="${DS + 12}" height="${DS + 12}" fill="transparent"/>` +
      die(DX, DY, DS, rolledNow ? G.last.d : lastV, `${mine ? 'pulse' : 'faded'}${rolledNow ? ' roll' : ''}`) + '</g>';
    if (mine) o += button(bx, by, bw, bh, 'roll', c, { act: 'roll', primary: true, big: t('h101.roll') });
    else o += txt(bx + bw / 2, by + bh / 2, `${name(p)} ${t('h101.wait.roll')}`, 'wait', `fill="${c.main}"`);
    return o;
  }
  // choose
  const d = G.die, a = G.totals[p];
  o += die(DX, DY, DS, d, rolledNow ? 'roll' : '');
  const half = (bw - 10) / 2;
  const opts = [[d, 'one'], [d * 10, 'ten']];
  opts.forEach(([v, key], i) => {
    const after = a + v, bust = after > H101.LIMIT;
    o += button(bx + i * (half + 10), by, half, bh, key, c, {
      act: 'pick' + i, off: !mine, primary: i === 1 && !bust, big: '+' + v,
      small: bust ? `→ ${t('h101.bust')}` : `→ ${after}`, smallCls: bust ? 'bad' : '',
    });
  });
  return o;
}

// ---------- players ----------
let builtN = 0;
function buildPlayers() {
  if (builtN === G.n) return;
  builtN = G.n;
  $('#arena').classList.toggle('many', G.n > 2);
  $('#pcol0').innerHTML = ''; $('#pcol1').innerHTML = '';
  const leftN = Math.ceil(G.n / 2);
  $('#arena').style.setProperty('--ca', leftN + 'fr');
  $('#arena').style.setProperty('--cb', G.n - leftN + 'fr');
  for (let p = 0; p < G.n; p++) {
    $(p < leftN ? '#pcol0' : '#pcol1').insertAdjacentHTML('beforeend', `
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
      cfg.names[p] = e.target.value;
      saveCfg();
      if (online()) { if (sess.host) sendSeats(); else sess.send('name', { name: e.target.value, id: tabId() }); }
      render();
    });
  });
  moods = Array.from({ length: G.n }, () => ({ mood: 'neutral', pose: 'down' }));
}

function renderPlayers() {
  buildPlayers();
  const playing = G.phase === 'roll' || G.phase === 'choose';
  const leftN = Math.ceil(G.n / 2);
  for (let p = 0; p < G.n; p++) {
    const el = $(`.player[data-p="${p}"]`);
    const active = playing ? G.turn === p : true;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = m.pose !== 'down' ? m.pose : playing && G.turn === p ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p < leftN ? 'right' : 'left', seed: 11 + p * 31 });
    const score = el.querySelector('.score');
    score.textContent = '★ ' + plural(G.wins[p], 'h101.wins');
    const tag = !online() ? '' : p === mySeat() ? t('net.you') : isAI(p) ? t('h101.tag.cpu') : isAway(p) ? t('h101.tag.away') : '';
    if (tag) score.insertAdjacentHTML('beforeend', ` <span class="tag${isAway(p) ? ' away' : ''}">${esc(tag)}</span>`);
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  renderStatus();
  renderControls();
}

function renderStatus() {
  const st = $('#status');
  let s = '', col = INK;
  const p = G.turn;
  if (online() && !connected()) s = t(sess.host || G.n <= 2 ? 'h101.online.wait' : 'h101.online.lost');
  else if (spectator() && G.phase !== 'over') s = t('h101.online.spect');
  else if (G.phase === 'roll' || G.phase === 'choose') {
    col = COLORS[p].main;
    const solo = humans() === 1 && isLocal(p);
    if (isAway(p)) s = t('h101.st.away', { name: name(p) });
    else if (isAI(p)) s = t('h101.st.thinking', { name: name(p) });
    else if (isRemote(p)) s = t('h101.st.them', { name: name(p) });
    else if (G.phase === 'roll') s = solo ? t('h101.st.roll.you') : t('h101.st.roll', { name: name(p) });
    else s = t(solo ? 'h101.st.pick.you' : 'h101.st.pick', { name: name(p), d: G.die, dd: G.die * 10 });
  } else if (G.phase === 'roundover' || G.phase === 'over') {
    const h = G.history[G.round];
    if (!h.winners.length) s = t('h101.st.roundnone');
    else if (h.winners.length === 1) { col = COLORS[h.winners[0]].main; s = t('h101.st.roundwin', { name: name(h.winners[0]), v: h.totals[h.winners[0]] }); }
    else s = t('h101.st.roundtie', { names: h.winners.map(name).join(', ') });
  }
  st.textContent = s;
  st.style.color = col;
}

function renderControls() {
  const host = !online() || sess.host;
  $('#undo').disabled = online() || !undoStack.length;
  $('#mode').disabled = online();
  $('#players').disabled = !host;
  $('#f-players').hidden = !online() && cfg.mode !== 'pvp';
  if (online()) $('#players').value = sess.host ? cfg.n : G.n;
  $('#rounds').disabled = !host;
  $('#new').disabled = !host;
  $('#again').hidden = !host;
  $('#result-wait').hidden = host;
  if (online()) $('#result-wait').textContent = t('h101.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('h101.online.note') : '';
}

// ---------- speech & moods ----------
const bubbleTimers = [];
function say(p, key, delay = 0) {
  const show = () => {
    const b = $(`.player[data-p="${p}"] .bubble`);
    if (!b) return;
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  };
  delay ? setTimeout(show, delay) : show();
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const calm = () => { for (let p = 0; p < G.n; p++) setMood(p, 'neutral'); };
// someone other than p to comment (prefer the next to play)
const witness = (p) => (p + 1) % G.n;

// Reactions after an action, from the state before (prev) and after (G). Runs on every device.
function react(prev, a) {
  justMoved = true;
  if (a.k === 'roll' || a.k === 'pick') {
    const last = G.last;
    if (a.k === 'roll' && prev.phase === 'roll' && G.phase !== 'choose' && last && last.forced) {
      setMood(last.p, 'sad'); say(last.p, 'say.bust');
      setMood(witness(last.p), 'smug'); say(witness(last.p), 'say.gloat', 700);
    } else if (a.k === 'pick') {
      const p = prev.turn, d = prev.die, x10 = a.x;
      const [v1, v10] = H101.rate(prev);
      const chosen = x10 ? v10 : v1, other = x10 ? v1 : v10, diff = chosen - other;
      const w = witness(p);
      for (let q = 0; q < G.n; q++) if (q !== p && moods[q].mood !== 'neutral' && Math.random() < 0.5) setMood(q, 'neutral');
      if (G.bust[p]) {
        setMood(p, 'sad'); say(p, 'say.bust');
        setMood(w, 'smug'); say(w, 'say.gloat', 700);
      } else if (G.totals[p] === 100 && H101.left(G, p) === 0) {
        setMood(p, 'happy', 'up'); say(p, 'say.hundred');
      } else if (diff < -0.12) {
        setMood(p, 'neutral');
        setMood(w, 'smug'); say(w, x10 ? 'say.risky' : 'say.timid', 400);
      } else if (diff > 0.12) {
        setMood(p, 'happy', x10 ? 'wave' : 'down'); say(p, x10 && d >= 4 ? 'say.big' : x10 ? 'say.good' : 'say.careful');
        if (G.n === 2) setMood(w, 'worried');
      } else if (x10 && d >= 5 && Math.random() < 0.5) {
        setMood(p, 'happy', 'wave'); say(p, 'say.big');
      } else if (!x10 && prev.totals[p] + 10 * d <= 100 && isAI(p) && cfg.mode === 'hard' && Math.random() < 0.5) {
        setMood(p, 'smug'); say(p, 'say.careful');
      } else setMood(p, 'neutral');
    }
    if (G.phase === 'roundover' || G.phase === 'over') roundReact();
  } else if (a.k === 'next') {
    calm();
    justMoved = false;
  }
  if (G.phase === 'over') finish();
}

function roundReact() {
  const h = G.history[G.round];
  setTimeout(() => {
    if (!G.history[G.round] || G.history[G.round] !== h) return;
    for (let p = 0; p < G.n; p++) {
      if (h.winners.includes(p)) setMood(p, 'happy', 'wave');
      else setMood(p, G.bust[p] ? 'sad' : 'worried');
    }
    if (G.phase === 'roundover') {
      if (h.winners.length) say(h.winners[0], 'say.round');
      const loser = [...Array(G.n).keys()].find((p) => !h.winners.includes(p));
      if (loser !== undefined) say(loser, 'say.lostround', 700);
    }
    renderPlayers();
  }, 650);
}

function finish() {
  const ws = H101.champions(G);
  const all = ws.length === G.n;
  setTimeout(() => {
    if (G.phase !== 'over') return;
    for (let p = 0; p < G.n; p++) {
      if (all) setMood(p, 'worried');
      else if (ws.includes(p)) { setMood(p, 'happy', 'up'); say(p, 'say.win'); }
      else { setMood(p, 'sad'); say(p, 'say.lose', 900); }
    }
    renderPlayers();
  }, 700);
  showResult();
  setTimeout(() => { if (G.phase === 'over') $('#result').hidden = false; }, 1500);
}
function showResult() {
  const ws = H101.champions(G);
  const tx = $('#result-text');
  if (ws.length === 1) { tx.textContent = t('h101.win', { name: name(ws[0]) }); tx.style.color = COLORS[ws[0]].main; }
  else { tx.textContent = ws.length === G.n ? t('h101.tie') : t('h101.tie.some', { names: ws.map(name).join(', ') }); tx.style.color = INK; }
  $('#result-sub').textContent = t('h101.score', { s: G.wins.join(' : ') });
}

// ---------- flow ----------
// a = { k: 'roll', v } | { k: 'pick', x } | { k: 'next' }. Applies to G; returns false if illegal.
function apply(a) {
  const prev = H101.clone(G);
  let ok = false;
  if (a.k === 'roll') ok = H101.roll(G, a.v);
  else if (a.k === 'pick') ok = H101.choose(G, a.x);
  else if (a.k === 'next') ok = H101.nextRound(G);
  if (!ok) return false;
  if (a.k === 'roll') rolledNow = true;
  react(prev, a);
  return true;
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);

// A local player (or the host acting for anyone) does something.
function act(a) {
  if (a.k === 'next' ? !canNext() : !canAct()) return;
  if (online() && !sess.host) {
    pending = true;
    sess.send('req', { a, n: G.seq });
    return render();
  }
  if (a.k === 'pick' && !online()) undoStack.push(H101.clone(G));
  doHost(a);
}
// Host side: fill in the die, apply, tell the guest.
function doHost(a) {
  if (a.k === 'roll') a = { k: 'roll', v: rollDie() };
  const n = G.seq;
  if (!apply(a)) return false;
  if (online()) sess.send('move', { a, n });
  render();
  schedule();
  return true;
}

function schedule() {
  clearTimeout(aiTimer);
  if (online() && !sess.host) return;
  if (!isAI(G.turn) || (G.phase !== 'roll' && G.phase !== 'choose')) return;
  aiTimer = setTimeout(() => {
    if (!isAI(G.turn)) return;
    if (G.phase === 'roll') doHost({ k: 'roll' });
    else if (G.phase === 'choose') doHost({ k: 'pick', x: H101.aiChoose(G, online() ? CPU_LEVEL : cfg.mode) });
  }, G.phase === 'roll' ? 650 : 900);
}

function newGame() {
  clearTimeout(aiTimer);
  const n = online() ? cfg.n : cfg.mode === 'pvp' ? cfg.n : 2;
  G = H101.create({ n, rounds: cfg.rounds, first: nextFirst % n });
  G.id = Math.random().toString(36).slice(2, 8);
  nextFirst = (nextFirst + 1) % n;
  undoStack = []; pending = false; justMoved = false;
  if (online()) initSeats();
  builtN = 0;
  $('#result').hidden = true;
  buildPlayers(); calm();
  render();
  if (online() && sess.host) sendState();
  schedule();
}
const canRestart = () => !online() || sess.host;
function restart() { if (canRestart()) newGame(); }

function undo() {
  if (online() || !undoStack.length) return;
  clearTimeout(aiTimer);
  G = undoStack.pop();
  justMoved = false;
  calm();
  $('#result').hidden = true;
  render();
  schedule();
}

// ---------- online ----------
// Host is authoritative and rolls every die; guests ask ('req') and apply the echoed 'move'.
// Nothing in this game is hidden (every roll and total is public), so every seat gets the same state.
// Seats: the host is 0, guests 1..n-1. With 3–4 players a seat without a device is played by the computer;
// a guest who joins (or comes back) takes their seat over at once — between two moves is always a safe point.
const tableNames = () => Array.from({ length: G.n }, (_, p) => (p === 0 ? cfg.names[0] : netNames[p]) || '');
// to: a net seat, or every connected guest; each one is told its own game seat
function sendState(to) {
  for (const k of to === undefined ? [...n2g.keys()] : [to]) {
    if (gOf(k) > 0) sess.send('state', { G, names: tableNames(), ctrl, you: gOf(k) }, { to: k });
  }
}
// Host: a guest at net seat k with tab id `id` introduced itself — find its game seat.
function bind(k, id) {
  n2g.delete(k);
  const taken = new Set(n2g.values());
  let g = owner.findIndex((x, i) => i > 0 && x === id && !taken.has(i));
  if (g < 0) {
    const free = [];
    for (let i = 1; i < Math.max(G.n, sess.maxPlayers); i++) if (!taken.has(i)) free.push(i);
    // a newcomer prefers a seat nobody has claimed yet, so a known player's seat stays theirs
    g = (free.includes(k) && !owner[k] ? k : free.find((i) => !owner[i])) ?? (free.includes(k) ? k : free[0] ?? k);
  }
  owner[g] = id;
  n2g.set(k, g);
  return g;
}
// The host keeps the match in sessionStorage per room, so reloading the host's tab doesn't wipe it.
const roomKey = (s) => `mg-h101-room-${s.code}`;
function persist() {
  if (online() && sess.host && G) sessionStorage.setItem(roomKey(sess), JSON.stringify({ G, ctrl, names: netNames, nextFirst, owner }));
}
// Host, 3+ seats: a seat whose device dropped waits AWAY_MS, then the computer plays it until the player is back.
function markAway(seat) {
  const s = sess;
  ctrl[seat] = 'away';
  clearTimeout(awayTimers[seat]);
  awayTimers[seat] = setTimeout(() => {
    if (sess !== s || ctrl[seat] !== 'away') return;
    ctrl[seat] = 'cpu';
    sendSeats();
    render();
    schedule();
  }, AWAY_MS);
}
function sendSeats() { sess.send('seats', { names: tableNames(), ctrl }); }

// Host: who plays each seat at the start of a match.
function initSeats() {
  if (!sess.host) return;
  // fewer seats than before: a guest left without a seat moves to a free one
  for (const [k, g] of n2g) {
    if (g < G.n) continue;
    const used = new Set(n2g.values());
    const i = [...Array(G.n).keys()].find((j) => j > 0 && !used.has(j));
    if (i !== undefined) { owner[i] = owner[g]; owner[g] = undefined; n2g.set(k, i); }
  }
  const live = [0, ...n2g.values()];
  awayTimers.forEach(clearTimeout);
  backAfterReload.clear();
  ctrl = Array.from({ length: G.n }, (_, p) => (p === 0 || G.n <= 2 || live.includes(p) ? 'human' : 'cpu'));
}
// Both sides: adopt a new seat table, greeting players who just took over from the computer.
function setCtrl(next) {
  const old = ctrl;
  ctrl = next.slice();
  if (!G || !online() || G.n <= 2) return;
  for (let p = 0; p < G.n; p++) if (old[p] && old[p] !== 'human' && ctrl[p] === 'human') say(p, 'say.back');
}

function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  ctrl = [];
  owner = []; n2g.clear(); myG = null; backAfterReload.clear();
  netNames.fill('');
  s.on('status', () => { if (s === sess) render(); });
  s.on('peer-join', ({ seat }) => {
    if (s !== sess) return;
    if (!s.host) { s.send('name', { name: cfg.names[mySeat()], id: tabId() }); return render(); }
    n2g.delete(seat); // (re)connected: its game seat is settled when its 'name' (with the tab id) arrives
  });
  s.on('peer-leave', ({ seat }) => {
    if (s !== sess) return;
    if (!s.host) return render();
    const g = gOf(seat);
    n2g.delete(seat);
    if (g < 0 || !multi() || g >= G.n || ctrl[g] !== 'human') return render();
    markAway(g);
    sendSeats();
    render();
  });
  s.on('state', (d) => {
    if (s.host || !d || !d.G) return;
    const fresh = !G || d.G.id !== G.id;
    G = d.G;
    const was = mySeat();
    myG = Number.isInteger(d.you) ? d.you : null;
    if (mySeat() !== was) s.send('name', { name: cfg.names[mySeat()], id: tabId() });
    d.names?.forEach?.((v, p) => (netNames[p] = v || ''));
    ctrl = (d.ctrl || []).slice();
    pending = false; justMoved = false;
    $('#rounds').value = G.rounds;
    builtN = 0;
    if (fresh) { buildPlayers(); calm(); }
    $('#result').hidden = true;
    render();
    if (G.phase === 'over') { showResult(); $('#result').hidden = false; }
  });
  s.on('seats', (d) => {
    if (s.host || !d) return;
    d.names?.forEach?.((v, p) => (netNames[p] = v || ''));
    if (d.ctrl) setCtrl(d.ctrl);
    render();
    if (G.phase === 'over') showResult();
  });
  // A guest introduces itself (tab id + name) right after connecting, and again when its name changes.
  s.on('name', (d, { seat }) => {
    if (!s.host || !d) return;
    const fresh = !n2g.has(seat);
    const g = fresh ? bind(seat, String(d.id || 'net' + seat)) : gOf(seat);
    netNames[g] = String(d.name || '').slice(0, 14);
    if (fresh) {
      clearTimeout(awayTimers[g]);
      if (g < G.n) { const c = ctrl.slice(); c[g] = 'human'; setCtrl(c); }
      sendState(seat);
      // after a host reload, close the room dialog once everyone who was playing is back (as with two players)
      if (backAfterReload.delete(g) && !backAfterReload.size) document.getElementById('mg-online')?.close();
    }
    sendSeats();
    render();
    if (G.phase === 'over') showResult();
    if (fresh) schedule(); // a computer about to move for this seat stands down
  });
  s.on('move', (d) => {
    if (s.host) return;
    if (!d || d.n !== G.seq) return s.send('resync');
    pending = false;
    if (!apply(d.a)) return s.send('resync');
    render();
  });
  s.on('req', (d, { seat }) => {
    if (!s.host || !d || !d.a) return;
    const a = d.a, g = gOf(seat);
    const mine = g > 0 && g < G.n && ctrl[g] === 'human';
    const legal = mine && d.n === G.seq && (a.k === 'next' ? G.phase === 'roundover' : (G.phase === 'roll' || G.phase === 'choose') && G.turn === g &&
      ((a.k === 'roll' && G.phase === 'roll') || (a.k === 'pick' && G.phase === 'choose')));
    if (!legal || !doHost(a.k === 'pick' ? { k: 'pick', x: !!a.x } : { k: a.k })) sendState(seat);
  });
  s.on('resync', (d, { seat }) => s.host && sendState(seat));
  const saved = s.host && JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
  if (saved?.G) {
    // The host reloaded: carry on with the same match. Guests come back on their own (peer-join → state).
    G = saved.G;
    nextFirst = saved.nextFirst || 0;
    (saved.names || []).forEach((v, p) => (netNames[p] = v || ''));
    owner = saved.owner || [];
    cfg.n = G.n; cfg.rounds = G.rounds; saveCfg(); syncSettingsUI();
    s.setMaxPlayers(G.n);
    ctrl = Array.from({ length: G.n }, (_, p) => saved.ctrl?.[p] || 'human');
    // nobody is connected yet right after the reload: guests' seats wait for their devices to come back
    for (let p = 1; p < G.n; p++) if (ctrl[p] === 'human' || ctrl[p] === 'away') { backAfterReload.add(p); if (G.n > 2) markAway(p); }
    undoStack = []; pending = false; justMoved = false;
    builtN = 0;
    $('#result').hidden = true;
    buildPlayers(); calm();
    render();
    if (G.phase === 'over') { showResult(); $('#result').hidden = false; }
    schedule();
  } else if (s.host) { nextFirst = 0; newGame(); }
  else {
    G = H101.create({ n: 2, rounds: cfg.rounds });
    G.id = 'wait';
    builtN = 0; undoStack = []; pending = false;
    $('#result').hidden = true;
    render();
  }
}

// ---------- settings ----------
function fillSelects() {
  $('#rounds').innerHTML = ROUNDS.map((n) => `<option value="${n}">${plural(n, 'h101.rounds.n')}</option>`).join('');
  syncSettingsUI();
}
function syncSettingsUI() {
  $('#mode').value = cfg.mode;
  $('#players').value = cfg.n;
  $('#rounds').value = cfg.rounds;
}

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); nextFirst = 0; newGame(); });
$('#players').addEventListener('change', (e) => {
  if (online() && !sess.host) return;
  cfg.n = +e.target.value; saveCfg(); nextFirst = 0;
  if (online()) sess.setMaxPlayers(cfg.n); // the room offers one seat per player
  newGame();
});
$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);

// ---------- input ----------
svg.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const k = el.dataset.act;
  if (k === 'roll') act({ k: 'roll' });
  else if (k === 'pick0') act({ k: 'pick', x: false });
  else if (k === 'pick1') act({ k: 'pick', x: true });
  else if (k === 'next') act({ k: 'next' });
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, dialog[open]')) return;
  const k = e.key;
  if ((k === ' ' || k === 'Enter') && G.phase === 'roll') { act({ k: 'roll' }); e.preventDefault(); }
  else if ((k === 'Enter' || k === ' ') && G.phase === 'roundover') { act({ k: 'next' }); e.preventDefault(); }
  else if (k === '1' && G.phase === 'choose') act({ k: 'pick', x: false });
  else if ((k === '0' || k === '2') && G.phase === 'choose') act({ k: 'pick', x: true });
});
document.addEventListener('mg:lang', () => { fillSelects(); render(); if (G.phase === 'over') showResult(); });

// ---------- boot ----------
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
  // A guest can't know the room size: when a room turns them away, net.js picks its "full" wording from this
  // value, so right after a guest session ends report more than two seats (the generic "no free seats" text).
  maxPlayers: () => (guestEnded ? 4 : cfg.n),
  onEnd: () => {
    if (sess?.host) sessionStorage.removeItem(roomKey(sess)); // left the room on purpose
    guestEnded = !!sess && !sess.host;
    setTimeout(() => (guestEnded = false));
    sess = null; ctrl = []; owner = []; n2g.clear(); myG = null; backAfterReload.clear();
    awayTimers.forEach(clearTimeout);
    nextFirst = 0;
    newGame();
  },
});
if (!online()) showOnce('how', SLUG);
