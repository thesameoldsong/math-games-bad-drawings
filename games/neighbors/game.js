import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { NB } from './engine.js';
import './strings.js';

const SLUG = 'neighbors';
const COLORS = [
  PALETTE.blue, PALETTE.red,
  PALETTE.green,
  { main: 'var(--nb-orange)', text: 'var(--nb-orange-text)', fill: 'var(--nb-orange-fill)', dark: 'var(--nb-orange-face)' },
];
// SVG layout: a strip with the die and the other players' small boards, then the big 5×5 grid.
const W = 340, TH = 114, DECK_H = 30, CELL = 64, GX = 10;
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const svg = $('#board');

const KEY = 'mg-neighbors';
const cfg = Object.assign(
  { mode: 'pvp', players: 2, source: 'die', secret: 'open', hints: 'off', names: ['', '', '', ''], best: {} },
  JSON.parse(localStorage.getItem(KEY) || '{}'),
);
const saveCfg = () => localStorage.setItem(KEY, JSON.stringify(cfg));

let st, history, over, aiTimer, hintTimer, shapes = {}, hint = null, fx = null, shownRolls = 0;
let view = 0, revealed = 0, hoverCell = -1;
let sess = null, pending = null, synced = false, netRules = { secret: 'open' };
// Online seats. Host decides and broadcasts: kinds[p] = 'human' (a device plays it), 'off' (its device dropped),
// 'cpu' (nobody joined: the computer plays it; only with 3+ seats). gid tells games apart.
let netNames = ['', '', '', ''], kinds = [], gid = null;
const offSince = [];
// Game seat ≠ room seat: net.js hands out room seats in the order guests knock, which can change when the host
// reloads. The host therefore remembers which device (net.js client id) owns which game seat:
// owners[p] = client id, netOf[p] = room seat of the device playing p right now (-1 = none). Guests learn their
// game seat from the host (myP; -1 = watching).
// devs[p] = a per-browser id (localStorage): a player who closed the tab and reopens the link gets a new tab id,
// but the same browser id, so they get their own board back once the old tab has timed out.
let owners = [], devs = [], netOf = [], myP = -1, cidOf = {}, devOf = {};
const clientId = () => sessionStorage.getItem('mg-client-id') || '';
const deviceId = () => {
  let d = localStorage.getItem('mg-device-id');
  if (!d) { d = Math.random().toString(36).slice(2, 12); localStorage.setItem('mg-device-id', d); }
  return d;
};
let placeId = 0;
const OFF_GRACE = 10000; // a dropped player gets this long to come back before the computer moves for them
const NET_AI = 'normal';
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => (sess.host ? 0 : myP);
// My seat in the current online game, or -1 if I'm only watching.
const me = () => (mySeat() >= 0 && mySeat() < st.n ? mySeat() : -1);
// My own name online (a guest keeps one name, whichever seat it gets).
const myName = () => (sess.host ? cfg.names[0] : cfg.netName ?? cfg.names[sess.seat]) || '';
const vsAI = () => ['easy', 'normal', 'hard'].includes(cfg.mode);
const isAI = (p) => (online() ? kinds[p] === 'cpu' : vsAI() && p === 1);
const isOff = (p) => online() && st.n > 2 && kinds[p] === 'off';
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const hotSeat = () => !online() && st.n > 1 && !vsAI();
const secret = () => st.n > 1 && (online() ? netRules.secret : cfg.secret) === 'secret';
const cpus = () => (online() ? kinds.filter((k) => k === 'cpu').length : 0);
// The narrow player cards get a short label when several computers sit at the table.
const cardName = (p) => (isAI(p) && cpus() > 1 ? t('nb.cpu.short', { k: p + 1 }) : name(p));
function name(p) {
  // several computers online are told apart by seat number (as in the room's seat list)
  if (isAI(p)) return cpus() > 1 ? t('nb.cpu.k', { k: p + 1 }) : t('nb.cpu');
  if (online() && p === mySeat()) return myName().trim() || t('nb.you');
  const n = isRemote(p) ? netNames[p] : cfg.names[p];
  return (n && n.trim()) || t('nb.p' + p);
}
const playersFor = () => (cfg.mode === 'solo' ? 1 : cfg.mode === 'pvp' ? +cfg.players : 2);

// The local player who has to write the current number right now (or -1).
function activeLocal() {
  if (over) return -1;
  if (online()) return me() >= 0 && !st.placed[me()] && !pending ? me() : -1;
  return NB.waiting(st).find(isLocal) ?? -1;
}
// Whose board this screen "belongs" to: their numbers are shown, the others may be hidden.
const owner = () => (online() ? mySeat() : hotSeat() ? view : 0);
const hiddenFor = (p) => secret() && !over && p !== owner();
const coverUp = () => !$('#cover').hidden;
// Online: with 3+ seats the host may play while seats are still empty (the computer fills them);
// two players wait for each other as before.
const netReady = () => (sess.host ? st.n > 2 || sess.connected : sess.connected && synced);
const canMove = () => activeLocal() >= 0 && !coverUp() && (!online() || netReady());

function boardOf(p) {
  let b = st.boards[p];
  if (online() && p === mySeat() && pending && pending.round === st.round) { b = b.slice(); b[pending.i] = st.roll; }
  return hiddenFor(p) ? b.map((v) => (v ? -1 : 0)) : b;
}
const scoreOf = (p) => NB.score(boardOf(p));

function syncView() {
  if (over) return;
  if (online()) { view = Math.max(0, me()); return; }
  const a = activeLocal();
  if (a >= 0) view = a;
  else if (isAI(view)) view = 0;
  // Secret boards on one screen: hide everything until the next player says they're ready.
  const needCover = hotSeat() && secret() && a >= 0 && a !== revealed;
  $('#cover').hidden = !needCover;
  if (needCover) {
    const who = $('#cover-who');
    who.textContent = t('nb.pass.who', { name: name(a) });
    who.style.color = COLORS[a].main;
  }
}

// ---------- rendering ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const gridTop = () => TH + (st.source === 'deck' ? DECK_H : 0);

function dieSVG() {
  const v = st.roll, rolled = st.rolls.length !== shownRolls;
  shownRolls = st.rolls.length;
  const cls = `die${rolled ? ' rolling' : ''}${over ? ' done' : ''}`;
  let s = `<g class="${cls}" transform="translate(14 2) scale(.93)">`;
  if (st.source === 'deck') {
    const card = shapeFor('card', () => {
      const p = [[14, 2], [78, 2], [78, 92], [14, 92]];
      return p.map((a, k) => line(...a, ...p[(k + 1) % 4], 1.2)).join(' ');
    });
    s += `<g transform="rotate(-5 46 47)"><rect x="14" y="2" width="64" height="90" rx="6" fill="var(--card)"/>`;
    s += `<path d="${card}" class="ink-line"/>`;
    if (!over) {
      s += `<text class="die-num" x="46" y="50">${v}</text>`;
      s += `<text class="card-corner" x="24" y="16">${v}</text><text class="card-corner" x="68" y="80" transform="rotate(180 68 80)">${v}</text>`;
    }
    s += `</g>`;
  } else {
    const T = [46, 2], R = [90, 40], RB = [84, 64], B = [46, 92], LB = [8, 64], L = [2, 40];
    const fT = T, fR = [70, 46], fB = [46, 64], fL = [22, 46];
    const d = shapeFor('die', () => [
      [T, R], [R, RB], [RB, B], [B, LB], [LB, L], [L, T],
      [fT, fR], [fR, fB], [fB, fL], [fL, fT], [fR, R], [fB, B], [fL, L],
    ].map(([a, b]) => line(...a, ...b, 1.2)).join(' '));
    const outline = [T, R, RB, B, LB, L].map((p) => p.join(' ')).join(' L');
    s += `<path d="M${outline} Z" class="die-fill" filter="url(#mg-crayon)"/>`;
    s += `<path d="M${[fT, fR, fB, fL].map((p) => p.join(' ')).join(' L')} Z" class="die-hi"/>`;
    s += `<path d="${d}" class="ink-line"/>`;
    if (!over) s += `<text class="die-num${v === 10 ? ' ten' : ''}" x="46" y="38">${v}</text>`;
  }
  s += `</g>`;
  const k = Math.min(st.round + 1, NB.ROUNDS);
  s += `<text class="round-txt" x="58" y="${TH - 6}">${t(st.source === 'deck' ? 'nb.round.card' : 'nb.round', { k })}</text>`;
  return s;
}

function deckSVG(y) {
  let s = `<g class="deck"><title>${t('nb.deckleft')}</title>`;
  for (let v = 1; v <= 10; v++) {
    const cx = GX + (v - 0.5) * 32;
    s += `<text class="deck-num" x="${cx}" y="${y + 10}">${v}</text>`;
    for (let k = 0; k < 4; k++) {
      const on = k < st.deck[v];
      s += `<circle cx="${cx - 9 + k * 6}" cy="${y + 23}" r="2.3" class="${on ? 'pip on' : 'pip'}"/>`;
    }
  }
  return s + '</g>';
}

function ovalPath(p, run, x0, y0, cell, tag) {
  const a = run.cells[0], len = run.cells.length;
  const r = (a / 5) | 0, c = a % 5;
  const k = `${tag}${p}${run.dir}${a}_${len}`;
  return shapeFor(k, () => {
    if (run.dir === 'h') {
      const cx = x0 + (c + len / 2) * cell, cy = y0 + (r + 0.5) * cell;
      return circle(cx, cy, (len * cell) / 2 - cell * 0.08, cell * 0.36, 0.04);
    }
    const cx = x0 + (c + 0.5) * cell, cy = y0 + (r + len / 2) * cell;
    return circle(cx, cy, cell * 0.36, (len * cell) / 2 - cell * 0.08, 0.04);
  });
}

function gridLines(x0, y0, cell, tag, width) {
  return shapeFor(tag, () => {
    let d = '';
    const n = 5 * cell, amp = cell > 30 ? 1.6 : 0.7;
    for (let k = 0; k <= 5; k++) {
      d += line(x0 + k * cell, y0, x0 + k * cell, y0 + n, amp) + ' ';
      d += line(x0, y0 + k * cell, x0 + n, y0 + k * cell, amp) + ' ';
    }
    return d;
  }).replace(/^/, `<path class="grid" stroke-width="${width}" d="`) + '"/>';
}

function bigBoard(y0) {
  const p = view, b = boardOf(p), col = COLORS[p];
  let s = `<g class="big">`;
  if (canMove()) {
    for (let i = 0; i < 25; i++) if (!b[i]) {
      s += `<rect class="free" x="${GX + (i % 5) * CELL + 3}" y="${y0 + ((i / 5) | 0) * CELL + 3}" width="${CELL - 6}" height="${CELL - 6}" rx="8"/>`;
    }
  }
  if (hint && hint.p === p && hint.round === st.round && !b[hint.i] && canMove()) {
    const cx = GX + (hint.i % 5 + 0.5) * CELL, cy = y0 + (((hint.i / 5) | 0) + 0.5) * CELL;
    s += `<path class="hint" d="${shapeFor('hint' + hint.i + '_' + st.round, () => circle(cx, cy, 24, 24, 0.06))}"/>`;
  }
  s += gridLines(GX, y0, CELL, 'gbig', 2.6);
  s += `<path class="frame" stroke="${col.main}" d="${shapeFor('frame' + p, () => {
    const n = 5 * CELL, q = [[GX, y0], [GX + n, y0], [GX + n, y0 + n], [GX, y0 + n]];
    return q.map((a, k) => line(...a, ...q[(k + 1) % 4], 1.4)).join(' ');
  })}"/>`;
  for (const run of NB.runs(b)) s += `<path class="oval" stroke="${col.text}" d="${ovalPath(p, run, GX, y0, CELL, 'B')}"/>`;
  for (let i = 0; i < 25; i++) {
    const v = b[i];
    if (!v) continue;
    const cx = GX + (i % 5 + 0.5) * CELL, cy = y0 + (((i / 5) | 0) + 0.5) * CELL;
    if (v < 0) { s += hiddenMark(cx, cy, 14, 'hb' + i); continue; }
    const rot = shapeFor(`r${p}_${i}_${v}`, () => (Math.random() * 2 - 1) * 7).toFixed(1);
    const fresh = fx && fx.fresh && fx.p === p && fx.i === i;
    s += `<text class="num${fresh ? ' fresh' : ''}" x="${cx}" y="${cy + 2}" fill="${col.main}" transform="rotate(${rot} ${cx} ${cy})">${v}</text>`;
  }
  if (fx && fx.fresh && fx.p === p && fx.g > 0) {
    const cx = GX + (fx.i % 5 + 0.5) * CELL, cy = y0 + (((fx.i / 5) | 0) + 0.2) * CELL;
    s += `<text class="float" x="${cx}" y="${cy}" fill="${col.text}">+${fx.g}</text>`;
  }
  s += `<text id="ghost" class="num ghost" x="-99" y="-99" fill="${col.main}"></text>`;
  return s + '</g>';
}

function hiddenMark(cx, cy, r, k) {
  return `<path class="hidden-mark" d="${shapeFor(k, () => line(cx - r, cy + r * 0.4, cx - r * 0.3, cy - r * 0.5, 0.6) + ' ' + line(cx - r * 0.3, cy + r * 0.5, cx + r * 0.4, cy - r * 0.4, 0.6) + ' ' + line(cx + r * 0.3, cy + r * 0.5, cx + r, cy - r * 0.3, 0.6))}"/>`;
}

function minisSVG() {
  const others = [];
  for (let p = 0; p < st.n; p++) if (p !== view) others.push(p);
  const x0 = 118, aw = W - x0 - 4, gap = 12;
  if (!others.length) {
    const best = cfg.best[st.source];
    let s = `<text class="best-lbl" x="${x0 + aw / 2}" y="${best ? 36 : 58}">${t(best ? 'nb.best' : 'nb.best.none')}</text>`;
    if (best) s += `<text class="best-num" x="${x0 + aw / 2}" y="78">${best}</text>`;
    return s;
  }
  const m = others.length, cell = Math.min(18, Math.floor((aw - (m - 1) * gap) / (5 * m)));
  const tot = m * 5 * cell + (m - 1) * gap;
  let x = x0 + (aw - tot) / 2;
  const y = 4 + (96 - 5 * cell) / 2;
  let s = '';
  for (const p of others) {
    const b = boardOf(p), col = COLORS[p];
    s += `<g class="mini${over ? ' pick' : ''}" data-view="${p}">`;
    s += `<rect x="${x - 3}" y="${y - 3}" width="${5 * cell + 6}" height="${5 * cell + 6}" fill="transparent"/>`;
    const slot = `${m}_${x}`;
    s += gridLines(x, y, cell, `gm${slot}`, 1.4).replace('class="grid"', `class="grid" style="stroke:${col.main}"`);
    for (const run of NB.runs(b)) s += `<path class="oval mini-oval" stroke="${col.text}" d="${ovalPath(p, run, x, y, cell, 'm' + slot + '_')}"/>`;
    for (let i = 0; i < 25; i++) {
      const v = b[i];
      if (!v) continue;
      const cx = x + (i % 5 + 0.5) * cell, cy = y + (((i / 5) | 0) + 0.5) * cell;
      if (v < 0) { s += hiddenMark(cx, cy, cell * 0.28, `hm${slot}_${i}`); continue; }
      const fresh = fx && fx.fresh && fx.p === p && fx.i === i;
      s += `<text class="mini-num${fresh ? ' fresh' : ''}" x="${cx}" y="${cy + 1}" fill="${col.main}" style="font-size:${(cell * 0.82).toFixed(1)}px">${v}</text>`;
    }
    s += '</g>';
    x += 5 * cell + gap;
  }
  return s;
}

function render() {
  syncView();
  const y0 = gridTop(), H = y0 + 5 * CELL + 8;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let out = dieSVG() + minisSVG();
  if (st.source === 'deck') out += deckSVG(TH - 4);
  out += bigBoard(y0);
  svg.innerHTML = out;
  if (fx) fx.fresh = false;
  persist();
  hoverCell = -1;
  renderPlayers();
}

function renderPlayers() {
  const arena = $('.arena');
  arena.classList.remove('n1', 'n2', 'n3', 'n4');
  arena.classList.add('n' + st.n);
  for (let p = 0; p < 4; p++) {
    const el = $(`.player.p${p}`);
    el.hidden = p >= st.n;
    if (p >= st.n) continue;
    const active = !over && !st.placed[p] && !(online() && p === mySeat() && pending);
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active && (p === view || isAI(p) || online()) ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p % 2 === 0 ? 'right' : 'left', seed: 11 + p * 31,
    });
    const off = isOff(p) && !over;
    el.classList.toggle('off', off);
    el.querySelector('.score').textContent = off ? t('nb.off') : hiddenFor(p) ? t('nb.secret.score') : plural(scoreOf(p), 'nb.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = cardName(p);
    if (document.activeElement !== inp) inp.value = !isLocal(p) ? '' : online() ? myName() : cfg.names[p] || '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const v = st.roll, a = activeLocal();
  let txt = '', who = view;
  if (over) txt = st.n > 1 && $('#result').hidden ? t('nb.view.hint') : '';
  else if (online() && !netReady()) txt = t(sess.host || st.n <= 2 ? 'nb.online.wait' : 'nb.online.lost');
  else if (online() && me() < 0) txt = t('nb.online.watch');
  else if (online()) {
    const them = NB.waiting(st).filter((p) => p !== mySeat());
    if (a >= 0) txt = t('nb.turn.you', { v });
    else if (them.length <= 1 || st.n <= 2) { who = them[0] ?? (mySeat() ? 0 : 1); txt = t('nb.wait.them', { name: name(who), v }); }
    else { who = -1; txt = t('nb.wait.many', { names: them.map(name).join(', '), v }); }
  } else if (a < 0) { who = 1; txt = t('nb.thinking', { name: name(1) }); }
  else if (st.n === 1 || vsAI()) txt = t('nb.turn.solo', { v });
  else txt = t('nb.turn', { name: name(a), v });
  status.textContent = txt;
  status.style.color = over || !COLORS[who] ? 'var(--ink)' : COLORS[who].main;

  const restartable = canRestart();
  $('#undo').disabled = online() || !history.length;
  $('#mode').disabled = online();
  $('#players').disabled = !restartable; // online: the room creator picks how many seats the table has
  $('#players-field').hidden = online() ? false : cfg.mode !== 'pvp';
  $('#secret-field').hidden = !online() && cfg.mode === 'solo';
  $('#source').disabled = !restartable;
  $('#secret').disabled = !restartable;
  $('#new').disabled = !restartable;
  $('#again').hidden = !restartable;
  $('#result-wait').hidden = restartable;
  if (online()) $('#result-wait').textContent = t('nb.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('nb.online.note') + (st.n > 2 ? ' ' + t('nb.online.note.n') : '') : '';
}

const bubbleTimers = [];
function say(p, key, vars) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key, vars);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame() {
  clearTimeout(aiTimer);
  clearTimeout(hintTimer);
  st = NB.create({ players: online() ? +cfg.players : playersFor(), source: cfg.source });
  history = []; shapes = {}; over = false; hint = null; fx = null; pending = null;
  gid = Math.random().toString(36).slice(2, 10);
  // Online (host): seats with a device are people; the rest are the computer (3+ seats) or awaited (2 seats).
  if (online() && sess.host) {
    assignSeats();
    kinds = Array.from({ length: st.n }, (_, p) => (p === 0 || netOf[p] >= 0 ? 'human' : st.n > 2 ? 'cpu' : 'off'));
  }
  view = online() ? Math.max(0, me()) : 0; revealed = 0;
  for (let p = 0; p < 4; p++) setMood(p, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
  scheduleHint();
}

// How a placement looks to the players: big gains cheer, a high number with nowhere to go hurts,
// and dumping a small number while a point was on offer is the book's "don't sell prime real estate".
function react(p, g, v, bestNow, i) {
  if (g >= 18) {
    setMood(p, 'happy', 'up'); say(p, 'nb.say.big', { n: g });
    if (st.n === 2) { setMood(1 - p, 'worried'); if (Math.random() < 0.5) setTimeout(() => say(1 - p, 'nb.say.wow'), 700); }
  } else if (g > 0) {
    setMood(p, 'happy', 'wave');
    if (Math.random() < 0.45) say(p, 'nb.say.pair', { n: g });
  } else if (bestNow === 0 && v >= 7) {
    setMood(p, 'worried');
    if (Math.random() < 0.6) say(p, 'nb.say.meh');
  } else if (bestNow > 0 && v <= 3 && (i % 5 === 0 || i % 5 === 4 || i < 5 || i >= 20)) {
    setMood(p, 'smug');
    if (Math.random() < 0.6) say(p, 'nb.say.dump');
  } else setMood(p, 'neutral');
}

// Authoritative placement (local play, or the host online).
function apply(p, i) {
  const v = st.roll, b = st.boards[p];
  const bestNow = Math.max(0, ...NB.empties(b).map((j) => NB.gain(b, j, v)));
  const g = NB.place(st, p, i);
  fx = { p, i, g, fresh: true };
  if (!hiddenFor(p)) react(p, g, v, bestNow, i);
  if (st.over) finish();
  else { render(); maybeAI(); scheduleHint(); }
  if (online() && sess.host) sendState();
}

function localPlace(i) {
  const p = activeLocal();
  if (p < 0 || !NB.canPlace(st, p, i)) return;
  if (online() && !sess.host) {
    const v = st.roll, b = st.boards[p];
    const bestNow = Math.max(0, ...NB.empties(b).map((j) => NB.gain(b, j, v)));
    const g = NB.gain(b, i, v);
    pending = { round: st.round, i, id: ++placeId };
    fx = { p, i, g, fresh: true };
    react(p, g, v, bestNow, i);
    sess.send('place', { i, round: st.round, id: placeId });
    render();
    return;
  }
  if (!online()) history.push(NB.clone(st));
  revealed = p;
  apply(p, i);
}

// Online host: the computer writes for empty seats right away, and for a dropped player after a grace period.
// It waits while the host still has the room dialog open (the table is filling up).
function netAI() {
  if (over || !sess.host || st.n <= 2 || $('#mg-online')?.open) return;
  const now = Date.now();
  let best = -1, due = Infinity;
  for (let p = 1; p < st.n; p++) {
    if (st.placed[p]) continue;
    const at = kinds[p] === 'cpu' ? 0 : kinds[p] === 'off' ? (offSince[p] || 0) + OFF_GRACE : Infinity;
    if (at < due) { due = at; best = p; }
  }
  if (best < 0) return;
  aiTimer = setTimeout(() => {
    if (!online() || over || st.placed[best] || kinds[best] === 'human') return maybeAI();
    apply(best, NB.aiMove(st, best, NET_AI));
  }, Math.max(520, due - now));
}

function maybeAI() {
  clearTimeout(aiTimer);
  if (online()) return netAI();
  if (over || !vsAI() || st.placed[1] || activeLocal() >= 0) return;
  aiTimer = setTimeout(() => {
    if (over || st.placed[1]) return;
    apply(1, NB.aiMove(st, 1, cfg.mode));
  }, 520);
}

function scheduleHint() {
  clearTimeout(hintTimer);
  if (cfg.hints !== 'on' || over) return;
  const p = activeLocal(), round = st.round;
  if (p < 0 || (hint && hint.p === p && hint.round === round)) return;
  hintTimer = setTimeout(() => {
    if (over || activeLocal() !== p || st.round !== round) return;
    hint = { p, round, i: NB.aiMove(st, p, 'hard') };
    render();
  }, 120);
}

function finish() {
  over = true;
  clearTimeout(aiTimer);
  const sc = st.boards.map((b) => NB.score(b));
  const w = NB.winners(st);
  view = online() ? Math.max(0, me()) : 0;
  const txt = $('#result-text'), sub = $('#result-sub');
  if (st.n === 1) {
    const prev = cfg.best[st.source] || 0, rec = sc[0] > prev;
    if (rec) { cfg.best[st.source] = sc[0]; saveCfg(); }
    setMood(0, rec ? 'happy' : 'neutral', rec ? 'up' : 'wave');
    say(0, rec ? 'nb.say.record' : 'nb.say.solo');
    txt.textContent = t('nb.solo.total', { pts: plural(sc[0], 'nb.pts') });
    txt.style.color = COLORS[0].main;
    sub.textContent = rec ? t('nb.solo.record') : t('nb.solo.best', { n: prev });
  } else {
    for (let p = 0; p < st.n; p++) {
      if (w.includes(p)) setMood(p, w.length > 1 ? 'worried' : 'happy', w.length > 1 ? 'down' : 'up');
      else setMood(p, 'sad');
    }
    if (w.length === 1) {
      say(w[0], 'nb.say.win');
      const loser = [...Array(st.n).keys()].find((p) => p !== w[0]);
      setTimeout(() => say(loser, 'nb.say.lose'), 900);
      txt.textContent = online() && w[0] === mySeat() ? t('nb.win.you') : t('nb.win', { name: name(w[0]) });
      txt.style.color = COLORS[w[0]].main;
    } else {
      say(w[0], 'nb.say.tie');
      txt.textContent = w.length === st.n ? t('nb.tie') : t('nb.tie.some', { names: w.map(name).join(', ') });
      txt.style.color = 'var(--ink)';
    }
    sub.innerHTML = sc.map((x, p) => `<span style="color:${COLORS[p].main}">${st.n > 2 ? esc(name(p)) + ' ' : ''}${x}</span>`).join(st.n > 2 ? ' · ' : ' : ');
  }
  render();
  setTimeout(() => { if (over) { $('#result').hidden = false; renderPlayers(); } }, 1100);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  st = history.pop();
  over = false; fx = null; hint = null;
  revealed = -1; // secret boards on one screen: whoever holds the device must confirm again
  for (let p = 0; p < 4; p++) setMood(p, 'neutral');
  $('#result').hidden = true;
  shownRolls = st.rolls.length;
  render();
  maybeAI();
  scheduleHint();
}

// Online, only the room creator may restart or change the rules; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState(true);
}

// ---------- online ----------
// Host is authoritative. After every change it sends each guest its own copy of the state: with secret
// boards the others' numbers are masked per seat (NB.masked), so no device ever receives a board it may not see.
// extra: per-seat additions, e.g. {2: {takeover: true}}.
function sendState(fresh = false, extra = {}) {
  if (!sess || !sess.host) return;
  netNames[0] = cfg.names[0] || '';
  const rules = { secret: cfg.secret };
  const base = { rules, names: netNames.slice(), kinds: kinds.slice(), gid, fresh };
  for (const k of sess.seats()) {
    if (k === 0) continue;
    const p = netOf.indexOf(k); // -1: this device only watches
    sess.send('state', { ...base, you: p, st: rules.secret === 'secret' ? NB.masked(st, p) : st, ...extra[p] }, { to: k });
  }
}

// Host: give every connected device a game seat (its own one if it had one, else a free one).
// Returns the seat for room seat k (or -1). Prefers seats nobody owns, then seats whose owner is gone.
function seatFor(k, cid, dev) {
  let p = netOf.indexOf(k);
  if (p >= 1 && p < st.n) return p;
  if (p >= 0) netOf[p] = -1;
  const free = (q) => q >= 1 && q < st.n && netOf[q] < 0;
  const order = [k, 1, 2, 3].filter((q, i, a) => a.indexOf(q) === i && free(q));
  p = cid ? owners.indexOf(cid) : -1;
  if (!free(p) && dev) p = devs.indexOf(dev);
  if (!free(p)) p = order.find((q) => !owners[q]) ?? order[0] ?? -1;
  if (p < 0) return -1;
  netOf[p] = k;
  if (cid) owners[p] = cid;
  if (dev) devs[p] = dev;
  return p;
}
function assignSeats() {
  const live = sess.seats();
  for (let p = 0; p < 4; p++) if (netOf[p] >= 0 && (!live.includes(netOf[p]) || p >= st.n)) netOf[p] = -1;
  for (const k of live) if (k > 0) seatFor(k, cidOf[k] || null, devOf[k] || null);
}

// The host keeps the match per room in sessionStorage, so reloading its tab doesn't wipe the game.
const roomKey = () => `mg-nb-room-${sess.code}`;
function persist() {
  if (!online() || !sess.host || !st) return;
  sessionStorage.setItem(roomKey(), JSON.stringify({ st, over, kinds, gid, netNames, owners, devs, secret: cfg.secret }));
}
function restore() {
  const saved = JSON.parse(sessionStorage.getItem(roomKey()) || 'null');
  if (!saved?.st) return false;
  clearTimeout(aiTimer);
  st = saved.st; over = false; gid = saved.gid; netNames = saved.netNames; owners = saved.owners || []; devs = saved.devs || [];
  netOf = [-1, -1, -1, -1];
  // Everybody's device has to come back; the computer covers for them after the grace period (3+ seats).
  kinds = saved.kinds.map((k) => (k === 'human' ? 'off' : k));
  kinds[0] = 'human';
  for (let p = 0; p < st.n; p++) offSince[p] = Date.now();
  cfg.secret = saved.secret; netRules = { secret: cfg.secret };
  cfg.source = st.source; cfg.players = st.n; saveCfg();
  $('#secret').value = cfg.secret; $('#source').value = st.source; $('#players').value = st.n;
  sess.setMaxPlayers(st.n);
  history = []; shapes = {}; hint = null; fx = null; pending = null; revealed = 0;
  view = 0; shownRolls = st.rolls.length;
  for (let p = 0; p < 4; p++) setMood(p, 'neutral');
  $('#result').hidden = true;
  if (saved.over || st.over) finish();
  else { render(); maybeAI(); scheduleHint(); }
  return true;
}

// A game is "in progress" once anybody has written a number.
const started = () => st.round > 0 || st.placed.some(Boolean);

// Guest: show bubbles for the moves of the others that this screen can see.
function reactOthers(prev) {
  for (let p = 0; p < st.n; p++) {
    if (p === mySeat() || hiddenFor(p)) continue;
    const pb = prev.boards[p], b = st.boards[p];
    const fresh = [];
    for (let i = 0; i < 25; i++) if (!pb[i] && b[i] > 0) fresh.push(i);
    if (fresh.length !== 1) continue;
    const i = fresh[0], v = b[i], g = NB.score(b) - NB.score(pb);
    fx = { p, i, g, fresh: true };
    react(p, g, v, Math.max(0, ...NB.empties(pb).map((j) => NB.gain(pb, j, v))), i);
  }
}

function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  netRules = { secret: cfg.secret };
  netNames = ['', '', '', ''];
  kinds = []; owners = []; devs = []; netOf = [-1, -1, -1, -1]; myP = s.seat; cidOf = {}; devOf = {};
  synced = s.host;
  s.on('status', () => renderPlayers());
  // A guest can't know the room's size before it is let in, and net.js words "full" by the guest's own
  // player-count setting ("already has two players"); use the neutral wording, true for any size.
  s.on('full', () => {
    const err = $('#mg-online .mg-on-error');
    if (err) err.textContent = t('net.full.n', { code: s.code });
  });
  s.on('peer-join', () => {
    if (s.host) return render(); // the guest introduces itself with 'name' (+ device id) next
    // (Re)connected to the host: a move sent into the void is forgotten; the host's state follows.
    pending = null;
    s.send('name', { name: myName(), cid: clientId(), dev: deviceId() });
  });
  s.on('peer-leave', ({ seat }) => {
    if (!s.host) return render();
    const p = netOf.indexOf(seat);
    if (p < 0) return;
    netOf[p] = -1;
    if (kinds[p] === 'human') { kinds[p] = 'off'; offSince[p] = Date.now(); }
    render();
    sendState();
    maybeAI();
  });
  s.on('state', (d) => {
    if (s.host || !d?.st) return;
    const prev = st;
    const sameGame = !d.fresh && prev && !prev.dummy && d.gid === gid && prev.n === d.st.n && d.you === myP;
    netRules = d.rules;
    synced = true;
    netNames = d.names.slice();
    kinds = d.kinds.slice();
    gid = d.gid;
    myP = d.you;
    st = d.st;
    if (pending && (d.rejected === pending.id || st.round !== pending.round || me() < 0 || st.placed[me()])) pending = null;
    if (!sameGame) {
      history = []; shapes = {}; fx = null; hint = null; pending = null; over = false;
      for (let p = 0; p < 4; p++) setMood(p, 'neutral');
      $('#result').hidden = true;
      cfg.source = st.source; $('#source').value = st.source;
      $('#players').value = st.n;
    } else reactOthers(prev);
    $('#secret').value = netRules.secret;
    if (st.over && !over) finish();
    else { if (!st.over) over = false; render(); scheduleHint(); }
    if (d.takeover && me() >= 0) say(me(), 'nb.say.takeover');
  });
  // A guest says who it is: its name and device id (so it gets its own board back after any reconnect).
  s.on('name', (d, { seat }) => {
    if (!s.host || !d || typeof d !== 'object') return;
    const known = netOf.indexOf(seat) >= 1;
    if (typeof d.cid === 'string') cidOf[seat] = d.cid.slice(0, 40);
    if (typeof d.dev === 'string') devOf[seat] = d.dev.slice(0, 40);
    const p = seatFor(seat, cidOf[seat] || '', devOf[seat] || '');
    const extra = {};
    if (p >= 1) {
      netNames[p] = typeof d.name === 'string' ? d.name.slice(0, 14) : '';
      // A newcomer takes over the computer's (or their own dropped) seat right away: in Neighbors every board is
      // independent, so they simply continue it from the next number they get to write.
      if (!known && !over && kinds[p] === 'cpu' && started()) extra[p] = { takeover: true };
      kinds[p] = 'human';
    }
    render();
    sendState(false, extra);
    maybeAI();
  });
  s.on('place', (d, { seat }) => {
    if (!s.host) return;
    const p = netOf.indexOf(seat);
    if (!d || typeof d !== 'object') return sendState();
    if (over || p < 1 || p >= st.n || d.round !== st.round || !NB.canPlace(st, p, d.i)) return sendState(false, { [p]: { rejected: d.id } });
    kinds[p] = 'human';
    apply(p, d.i);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) { if (!restore()) newGame(); }
  else { st = NB.create({ players: 2, source: cfg.source }); st.dummy = true; history = []; over = false; render(); }
}

// ---------- input ----------
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function cellAt(evt) {
  const p = svgPoint(evt), y0 = gridTop();
  const c = Math.floor((p.x - GX) / CELL), r = Math.floor((p.y - y0) / CELL);
  if (c < 0 || c > 4 || r < 0 || r > 4) return -1;
  return r * 5 + c;
}

svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const i = canMove() ? cellAt(evt) : -1;
  const ok = i >= 0 && !boardOf(view)[i];
  if ((ok ? i : -1) === hoverCell) return;
  hoverCell = ok ? i : -1;
  const g = svg.querySelector('#ghost');
  svg.style.cursor = ok ? 'pointer' : '';
  if (!g) return;
  if (!ok) { g.setAttribute('x', -99); return; }
  g.textContent = st.roll;
  g.setAttribute('x', GX + (i % 5 + 0.5) * CELL);
  g.setAttribute('y', gridTop() + (((i / 5) | 0) + 0.5) * CELL + 2);
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; svg.querySelector('#ghost')?.setAttribute('x', -99); });
svg.addEventListener('click', (evt) => {
  const mini = evt.target.closest('[data-view]');
  if (mini && over) { view = +mini.dataset.view; render(); return; }
  if (!canMove()) return;
  const i = cellAt(evt);
  if (i >= 0 && !boardOf(view)[i]) localPlace(i);
});

$('#cover-go').addEventListener('click', () => { revealed = activeLocal(); $('#cover').hidden = true; render(); scheduleHint(); });
$('#result').addEventListener('click', (e) => { if (!e.target.closest('.result-card')) { $('#result').hidden = true; renderPlayers(); } });

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#players').addEventListener('change', (e) => {
  if (!canRestart()) return;
  cfg.players = +e.target.value;
  saveCfg();
  if (!online()) return newGame();
  sess.setMaxPlayers(cfg.players); // the room now offers this many seats
  restart();
});
$('#source').addEventListener('change', (e) => { cfg.source = e.target.value; saveCfg(); restart(); });
$('#secret').addEventListener('change', (e) => { cfg.secret = e.target.value; saveCfg(); if (online()) netRules = { secret: cfg.secret }; restart(); });
$('#hints').addEventListener('change', (e) => { cfg.hints = e.target.value; saveCfg(); hint = null; render(); scheduleHint(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    if (online() && !sess.host) cfg.netName = inp.value;
    else cfg.names[p] = inp.value;
    saveCfg();
    if (online()) { if (sess.host) sendState(); else sess.send('name', { name: inp.value, cid: clientId(), dev: deviceId() }); }
    render();
  }));
document.addEventListener('mg:lang', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#players').value = cfg.players;
$('#source').value = cfg.source;
$('#secret').value = cfg.secret;
$('#hints').value = cfg.hints;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  maxPlayers: () => +cfg.players,
  onSession,
  onEnd: () => { sess = null; pending = null; kinds = []; myP = -1; $('#players').value = cfg.players; newGame(); },
});
// The host's room dialog stays open while the table fills up; the computer starts once it is closed.
$('#mg-online').addEventListener('close', () => { if (online()) { maybeAI(); render(); } });
if (!online()) showOnce('how', SLUG);
