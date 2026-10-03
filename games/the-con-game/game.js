import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { CON } from './engine.js';
import './strings.js';

const SLUG = 'the-con-game';
const COLORS = [PALETTE.blue, PALETTE.red, PALETTE.green, PALETTE.violet];
// Board tints (light/dark values live in style.css).
const C = {
  card: 'var(--card)', sel: 'var(--con-sel)', back: 'var(--con-back)', unknown: 'var(--con-unknown)',
  backLine: 'var(--con-back-line)', backX: 'var(--con-back-x)', q: 'var(--con-q)', rock: 'var(--con-rock)',
  zone: 'var(--con-zone)', zoneLine: 'var(--con-zone-line)', cover: 'var(--con-cover)',
  muted: 'var(--muted)', muted2: 'var(--muted-2)', hint: 'var(--con-hint)', soft: 'var(--con-soft)', faint: 'var(--con-faint)', dash: 'var(--con-dash)',
};
const INK = PALETTE.ink;
const W = 360, PAD = 6;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ players: 2, mode: 'normal', rounds: 8, names: ['', '', '', ''], me: '' },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (![2, 3, 4].includes(cfg.players)) cfg.players = 2;
if (!['pvp', 'easy', 'normal'].includes(cfg.mode)) cfg.mode = 'normal';
if (![5, 8, 12].includes(cfg.rounds)) cfg.rounds = 8;
while (cfg.names.length < 4) cfg.names.push('');
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, gameNo = 0, gid = Math.floor(Math.random() * 1e9); // gid: every new table, also after a settings change (online sync)
let uncovered = null;    // hot-seat: the player who pressed "it's me"
let lastViewer = 0;      // hot-seat: whose side of the table is shown when nobody local has to act
let fresh = false;       // animate the fight that was just revealed
let finished = false;
let pendingAct = false;  // guest: an action was sent, waiting for the host
let sess = null;         // online session (shared/net.js), null when playing locally
let remoteNames = ['', '', '', ''];
// Online: who plays each seat — 'host' (seat 0), 'human' (a guest's device), 'away' (that device dropped out),
// 'cpu' (no device: the host's computer plays it; only with 3–4 players), 'wait' (2 players: seat 1 still empty).
let ctrl = ['host', 'wait', 'cpu', 'cpu'];
let synced = true;       // guest: got the host's state at least once in this session
let hostGame = -1;       // guest: host's game number of the state on screen
let notice = null;       // {key, until}: a short message for the status line
let fullGuest = false;   // see mountOnline's maxPlayers below
const cpuMarked = new Set();   // host: seats whose cards the computer marked (a guest joining in setup re-marks them)
const tookOver = new Set();    // host: seats a guest took from the computer mid-game (tell them once)
// Host: game seat ↔ device. net.js numbers its seats in order of arrival, which can change when the host's tab
// reloads; the game keeps its own map from a device's id (its net.js client id) to the game seat it plays,
// so after any reconnect every device gets its own hand back and never someone else's.
let owner = [null, null, null, null];   // game seat → device id
let ownerDev = [null, null, null, null]; // game seat → browser id (localStorage: shared by the tabs of one browser)
const slot = new Map();                 // net seat → game seat (devices that said hello in this session)
const intro = new Map();                // net seat → {cid, nm, dev} from its hello
const held = new Map();                 // net seat → timer: a new tab of a browser whose old tab still holds a seat
const HOLD_MS = 9000;
let you = -1;                           // guest: my game seat, as told by the host (-1: not yet)
const hadHuman = new Set();    // host: seats a guest's device played in this game (getting it back is no "take over")
const awayTimers = [];
const AWAY_MS = 15000;   // a dropped guest's seat goes to the computer after this long (3–4 players)
const ui = { mine: null, target: null, want: null, setup: null, setupFor: -1 };
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => (sess.host ? 0 : you);
const NP = () => st.np;
const seats = () => [...Array(st.np).keys()];
// The computer plays this seat (locally: the opponents; online: seats without a device, run by the host).
const cpuSeat = (p) => (online() ? ctrl[p] === 'cpu' : cfg.mode !== 'pvp' && p !== 0);
const isAI = (p) => cpuSeat(p) && (!online() || sess.host);
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const hotSeat = () => !online() && cfg.mode === 'pvp';
const level = () => cfg.mode === 'easy' ? 'easy' : 'normal';
const over = () => st.phase === 'over';
const spectator = () => online() && mySeat() >= st.np;
// A guest's own name is kept apart from the hot-seat names (its seat number depends on the room).
const ownName = (p) => (online() && !sess.host ? cfg.me : cfg.names[p]) || '';
function name(p) {
  if (cpuSeat(p)) return t('con.cpu' + p);
  const n = isRemote(p) ? remoteNames[p] : ownName(p);
  return (n && n.trim()) || t('con.p' + p);
}
// Online and offline the same: no connection to anyone who could answer → nobody acts.
function blocked() {
  if (!online()) return false;
  if (!sess.host) return !sess.connected || !synced;
  return st.np === 2 && !sess.connected; // 2 players: wait for the guest; 3–4: the computer fills in
}
// The local human who must act right now (-1: nobody here).
function localActor() {
  if (over() || pendingAct || blocked() || spectator()) return -1;
  return CON.actors(st).find((p) => isLocal(p)) ?? -1;
}
const covered = () => hotSeat() && localActor() >= 0 && uncovered !== localActor();
function viewer() {
  if (online()) return spectator() || mySeat() < 0 ? -1 : mySeat();
  if (!hotSeat()) return 0;
  const la = localActor();
  if (la >= 0) lastViewer = la;
  return lastViewer;
}
// What this screen may show: everything once the game is over, otherwise the viewer's knowledge.
function known() {
  if (over()) return st;
  return CON.view(st, covered() ? -1 : viewer());
}

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function txt(x, y, s, { size = 20, color = INK, weight = 700, anchor = 'middle', max = 344, cls = '' } = {}) {
  const fit = String(s).length * size * 0.42 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="t ${cls}" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${fit}>${esc(s)}</text>`;
}
function box(k, x, y, w, h, amp = 1.1) {
  return shapeFor(k, () => line(x, y, x + w, y, amp) + ' ' + line(x + w, y, x + w, y + h, amp).replace('M', 'L') + ' ' +
    line(x + w, y + h, x, y + h, amp).replace('M', 'L') + ' ' + line(x, y + h, x, y, amp).replace('M', 'L') + ' Z');
}
function button(act, x, y, w, h, label, { color = null, off = false } = {}) {
  const fill = color ? color.main : C.card, stroke = color ? color.dark : INK; // .dark = same shade as .btn.primary's border
  return `<g class="sbtn${off ? ' off' : ''}" ${off ? '' : `data-act="${act}"`} role="button">
    <path d="${box(`btn${w}x${h}_${x}_${y}`, x, y, w, h, 1.4)}" fill="${fill}" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round"/>
    ${txt(x + w / 2, y + h / 2 + 7, label, { size: 22, color: color ? 'var(--on-accent)' : INK, max: w - 12 })}</g>`;
}

// Type pictures, drawn in a 24×24 box centred on 0,0.
const ICON = {};
function typeIcon(type) {
  return (ICON[type] ??= withSeed(17 + type * 5, () => {
    const sw = 'stroke-linecap="round" stroke-linejoin="round"';
    if (type === 0) {
      const d = circle(0, 1, 10, 8.4, 0.13);
      return `<path d="${d}" fill="${C.rock}" filter="url(#mg-crayon)"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="2" ${sw}/>` +
        `<path d="M-4 -2 Q-1 -4 2 -3" fill="none" stroke="${INK}" stroke-width="1.3" ${sw}/>`;
    }
    if (type === 1) {
      return `<g transform="rotate(-8)"><path d="M-7.5 -10.5 L5 -10.5 L8 -7.5 L8 10.5 L-7.5 10.5 Z" fill="${C.card}" stroke="${INK}" stroke-width="2" ${sw}/>` +
        `<path d="M-4.5 -5 L4.5 -5 M-4.5 -1 L4.5 -1 M-4.5 3 L4.5 3 M-4.5 7 L1.5 7" stroke="${C.rock}" stroke-width="1.4" ${sw}/></g>`;
    }
    return `<path d="M-2.4 3.8 L6 -11 M2.4 3.8 L-6 -11" stroke="${INK}" stroke-width="2.4" ${sw} fill="none"/>` +
      `<path d="${circle(-4.6, 7.4, 3.6, 3.6, 0.05)}" fill="${C.card}" stroke="${INK}" stroke-width="2" ${sw}/>` +
      `<path d="${circle(4.6, 7.4, 3.6, 3.6, 0.05)}" fill="${C.card}" stroke="${INK}" stroke-width="2" ${sw}/>`;
  }));
}
const STAR = 'M0 -5.5 L1.6 -1.7 L5.4 -1.6 L2.4 1 L3.4 5 L0 2.7 L-3.4 5 L-2.4 1 L-5.4 -1.6 L-1.6 -1.7 Z';

// One card. id < 0 draws an anonymous face-down card.
function card(id, x, y, w, h, { type = null, sel = false, star = false, act = '', cls = '', word = false } = {}) {
  const back = id < 0;
  const own = back ? null : COLORS[CON.owner(id)];
  const body = box(`card${back ? 'b' : id}_${w.toFixed(1)}x${h.toFixed(1)}`, 0, 0, w, h, Math.min(1.2, w / 40));
  const fill = sel ? C.sel : back ? C.back : type === null ? C.unknown : C.card;
  // The animation class sits on an inner group: a CSS transform on the outer one would replace its translate.
  let s = `<g class="card${sel ? ' sel' : ''}" transform="translate(${x.toFixed(1)} ${(y - (sel ? 6 : 0)).toFixed(1)})" ${act}><g class="${cls}">`;
  s += `<path d="${body}" fill="${fill}" stroke="${back ? C.backLine : sel ? INK : own.main}" stroke-width="${sel ? 3 : 2.4}" stroke-linejoin="round"/>`;
  if (back) {
    s += `<path d="M${w * 0.2} ${h * 0.25} L${w * 0.8} ${h * 0.75} M${w * 0.8} ${h * 0.25} L${w * 0.2} ${h * 0.75}" stroke="${C.backX}" stroke-width="2" stroke-linecap="round"/>`;
    s += txt(w / 2, h / 2 + w * 0.2, '?', { size: w * 0.6, color: C.muted2 });
    return s + '</g></g>';
  }
  const ns = Math.max(11, Math.min(w * 0.42, h * 0.3));
  s += txt(4 + ns * 0.02, ns * 0.95, CON.num(id), { size: ns, color: own.main, anchor: 'start' });
  const k = Math.min(w * 0.68, h * (word ? 0.4 : 0.48)) / 24;
  const cy = word ? h * 0.52 : h * 0.62;
  if (type === null) s += txt(w / 2, cy + 9 * k, '?', { size: 26 * k, color: C.q });
  else s += `<g transform="translate(${(w / 2).toFixed(1)} ${cy.toFixed(1)}) scale(${k.toFixed(2)})">${typeIcon(type)}</g>`;
  if (word && type !== null) s += txt(w / 2, h - 7, t('con.type' + type), { size: Math.min(16, w * 0.26), color: C.muted, weight: 600, max: w - 6 });
  if (star) s += `<path d="${STAR}" transform="translate(${(w - 7).toFixed(1)} 8) scale(${Math.min(1.1, w / 36).toFixed(2)})" fill="#f2b705" stroke="#b07f00" stroke-width="1"/>`;
  return s + '</g></g>';
}

// Biggest card size that fits n cards in a w×h area.
function fit(n, w, h, max = 52, ratio = 1.34, gap = 4) {
  for (let cw = max; cw >= 12; cw -= 1) {
    const cols = Math.max(1, Math.floor((w + gap) / (cw + gap)));
    const rows = Math.ceil(n / cols), ch = cw * ratio;
    if (rows * ch + (rows - 1) * gap <= h) return { cw, ch, cols: Math.ceil(n / rows), gap };
  }
  return { cw: 12, ch: 16, cols: Math.floor(w / 16), gap: 2 };
}
// Own cards first, then the others' by seat and number.
const sortHand = (hand, me) => hand.slice().sort((a, b) =>
  ((CON.owner(a) - me + 4) % 4) - ((CON.owner(b) - me + 4) % 4) || a - b);

function handCards(ids, x, y, w, h, opts) {
  if (!ids.length) return txt(x + w / 2, y + h / 2 + 6, '—', { size: 24, color: C.dash });
  const { cw, ch, cols, gap } = fit(ids.length, w, h, opts.max);
  const rows = Math.ceil(ids.length / cols);
  let s = '';
  ids.forEach((id, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = r === rows - 1 ? ids.length - r * cols : cols;
    const x0 = x + (w - (inRow * cw + (inRow - 1) * gap)) / 2;
    s += card(id, x0 + c * (cw + gap), y + r * (ch + gap), cw, ch, opts.each(id));
  });
  return s;
}

// ---------- layout ----------
function layout() {
  const np = NP();
  const oppH = { 2: 134, 3: 104, 4: 88 }[np], arenaH = np === 4 ? 112 : 122, myH = np === 2 ? 156 : 140, barH = 66;
  const me = viewer(), zones = [];
  let y = 2;
  // a spectator (seat beyond the player count) sees every hand face down and no hand of their own
  for (let i = me < 0 ? 0 : 1; i < np; i++) { zones.push({ q: (Math.max(me, 0) + i) % np, y, h: oppH }); y += oppH + 4; }
  const arenaY = y; y += arenaH + 2;
  const myY = y; y += myH + 2;
  const barY = y; y += barH;
  return { me, zones, arenaY, arenaH, myY, myH, barY, barH, H: y + 2 };
}

// ---------- rendering ----------
function render() {
  persist();
  const L = layout(), kv = known();
  svg.setAttribute('viewBox', `0 0 ${W} ${L.H}`);
  let s = '';
  for (const z of L.zones) s += oppZone(z, kv);
  s += arena(L, kv);
  s += myZone(L, kv);
  s += actionBar(L, kv);
  svg.innerHTML = s;
  fresh = false;
  renderPlayers();
}

function zoneHeader(x, y, p, n, extra = '') {
  const c = COLORS[p];
  return `<circle cx="${x + 7}" cy="${y + 9}" r="6" fill="${c.main}"/>` +
    txt(x + 19, y + 15, `${name(p)} · ${plural(n, 'con.cards')}${extra}`, { size: 18, color: c.main, anchor: 'start', max: 300 });
}

function oppZone(z, kv) {
  const { q, y, h } = z;
  const la = localActor(), myTurn = st.phase === 'turn' && la >= 0 && !covered();
  const can = myTurn && CON.canChallenge(st, la, q);
  const tradeable = myTurn && !st.traded;
  const chosen = myTurn && ui.target === q;
  const stars = CON.counting(st, q);
  const c = COLORS[q];
  let s = `<g class="zone${can || tradeable ? ' pick' : ''}" ${can || tradeable ? `data-act="zone" data-q="${q}"` : ''}>`;
  s += `<path d="${box('zone' + q + '_' + h + '_' + y, PAD, y, W - 2 * PAD, h, 1)}" fill="${chosen ? C.zone : 'transparent'}" stroke="${chosen ? c.main : C.zoneLine}" stroke-width="${chosen ? 2.6 : 1.6}" ${chosen ? '' : 'stroke-dasharray="5 6"'}/>`;
  s += zoneHeader(PAD + 4, y + 3, q, st.hand[q].length);
  const ids = sortHand(st.hand[q], q);
  s += handCards(ids, PAD + 6, y + 24, W - 2 * PAD - 12, h - 30, {
    max: NP() === 2 ? 50 : 46,
    each: (id) => ({ type: kv.type[id], star: stars.has(id), sel: myTurn && ui.want === id,
      act: tradeable ? `data-act="want" data-id="${id}"` : '' }),
  });
  return s + '</g>';
}

function evText(ev) {
  if (!ev) return null;
  const n = (p) => name(p);
  switch (ev.k) {
    case 'decline': return [t('con.e.decline', { a: n(ev.a), b: n(ev.b) }), COLORS[ev.b].main];
    case 'deal': return [t('con.e.deal', { a: n(ev.a), b: n(ev.b) }), COLORS[ev.a].main];
    case 'nodeal': return [t('con.e.nodeal', { a: n(ev.a), b: n(ev.b) }), COLORS[ev.b].main];
    case 'pass': return [t('con.e.pass', { a: n(ev.a) }), COLORS[ev.a].main];
    default: return null;
  }
}

// Two cards side by side with a sign between them, plus a line of text below.
function duelPic(L, left, right, mid, caption, capColor, under) {
  const cw = 54, ch = 72, cy = L.arenaY + 22, cx = W / 2;
  let s = '';
  s += left(cx - 44 - cw, cy, cw, ch);
  s += right(cx + 44, cy, cw, ch);
  s += mid(cx, cy + ch / 2);
  if (caption) s += txt(cx, L.arenaY + 15, caption, { size: 18, color: capColor, weight: 700 });
  if (under) s += txt(cx, cy + ch + 22, under[0], { size: 19, color: under[1] });
  return s;
}
const vsMark = (cx, cy) => txt(cx, cy + 8, 'vs', { size: 26, color: C.muted2 });

function arena(L, kv) {
  const y = L.arenaY, cx = W / 2;
  let s = `<path d="${shapeFor('arena' + y, () => line(16, y - 1, W - 16, y - 1, 0.8))}" stroke="${PALETTE.pencil}" stroke-width="1.6" stroke-dasharray="3 6" fill="none"/>`;
  if (st.phase === 'setup') {
    const la = localActor();
    if (la >= 0 && !covered()) {
      s += txt(cx, y + 40, t('con.h.setup'), { size: 22, color: COLORS[la].main });
      s += txt(cx, y + 68, t('con.h.setup2'), { size: 17, color: C.hint, weight: 600 });
      const cnt = [0, 1, 2].map((k) => ui.setup.filter((x) => x === k).length);
      [0, 1, 2].forEach((k) => {
        const x = cx - 96 + k * 80;
        s += `<g transform="translate(${x} ${y + 98}) scale(.95)">${typeIcon(k)}</g>` + txt(x + 24, y + 106, '× ' + cnt[k], { size: 21, color: INK, anchor: 'middle' });
      });
    } else {
      s += txt(cx, y + 46, t('con.a.waitsetup'), { size: 21, color: C.muted });
      seats().forEach((p, i) => {
        const x = cx + (i - (NP() - 1) / 2) * 76;
        s += `<circle cx="${x - 28}" cy="${y + 80}" r="6" fill="${COLORS[p].main}"/>`;
        s += txt(x - 18, y + 86, st.ready[p] ? '✓ ' + t('con.ready') : '…', { size: 19, color: st.ready[p] ? COLORS[p].main : C.faint, anchor: 'start' });
      });
    }
    return s;
  }
  const me = L.me;
  if (st.phase === 'fight') {
    const { a, b, ca } = kv.pend;
    const showA = ca !== null && ca !== undefined && (a === me && !covered());
    return s + duelPic(L,
      (x, yy, w, h) => (showA ? card(ca, x, yy, w, h, { type: kv.type[ca] }) : card(-1, x, yy, w, h)),
      (x, yy, w, h) => card(-1, x, yy, w, h),
      (x, yy) => txt(x, yy + 10, '⚔', { size: 30, color: INK }),
      t('con.a.challenge', { a: name(a), b: name(b) }), COLORS[a].main);
  }
  if (st.phase === 'trade') {
    const { a, b, give, want } = kv.pend;
    return s + duelPic(L,
      (x, yy, w, h) => card(give, x, yy, w, h, { type: kv.type[give] }) + txt(x + w / 2, yy + h + 18, t('con.a.give'), { size: 16, color: COLORS[a].main, weight: 600 }),
      (x, yy, w, h) => card(want, x, yy, w, h, { type: kv.type[want] }) + txt(x + w / 2, yy + h + 18, t('con.a.want'), { size: 16, color: COLORS[a].main, weight: 600 }),
      (x, yy) => txt(x, yy + 9, '⇄', { size: 34, color: INK }),
      t('con.a.offer', { a: name(a), b: name(b) }), COLORS[a].main);
  }
  const ev = evText(st.ev);
  if (st.last) {
    const { a, b, ca, cb, w } = st.last;
    const anim = fresh ? ' pop' : '';
    const res = w >= 0 ? [t('con.r.win', { name: name(w) }), COLORS[w].main] : [t('con.r.tie'), C.hint];
    const mark = (x, yy) => {
      if (w < 0) return txt(x, yy + 9, '=', { size: 34, color: C.muted2 });
      const dir = w === a ? 1 : -1; // arrow points from winner to loser
      const d = shapeFor('arr' + dir, () => line(x - 24 * dir, yy, x + 24 * dir, yy, 1.4));
      return `<g class="arrow${anim}"><path d="${d}" stroke="${COLORS[w].main}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        `<path d="M${x + 14 * dir} ${yy - 9} L${x + 25 * dir} ${yy} L${x + 14 * dir} ${yy + 9}" stroke="${COLORS[w].main}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    };
    s += duelPic(L,
      (x, yy, wd, h) => card(ca, x, yy, wd, h, { type: kv.type[ca], cls: anim, word: true }),
      (x, yy, wd, h) => card(cb, x, yy, wd, h, { type: kv.type[cb], cls: anim, word: true }),
      mark,
      ev ? ev[0] : `${name(a)} ⚔ ${name(b)}`, ev ? ev[1] : C.soft, res);
    return s;
  }
  if (ev) s += txt(cx, y + 15, ev[0], { size: 18, color: ev[1] });
  s += txt(cx, y + 60, t('con.a.start', { name: name(st.first) }), { size: 23, color: COLORS[st.first].main });
  s += `<g transform="translate(${cx - 50} ${y + 92})">${typeIcon(0)}</g><g transform="translate(${cx} ${y + 92})">${typeIcon(2)}</g><g transform="translate(${cx + 50} ${y + 92})">${typeIcon(1)}</g>`;
  s += txt(cx - 25, y + 99, '›', { size: 24, color: C.muted2 }) + txt(cx + 25, y + 99, '›', { size: 24, color: C.muted2 });
  return s;
}

function myZone(L, kv) {
  const y = L.myY, h = L.myH, me = L.me;
  if (me < 0) return over() || blocked() ? '' : txt(W / 2, y + h / 2, t('con.watch'), { size: 20, color: C.soft });
  if (over()) {
    return zoneHeader(PAD + 4, y + 2, me, st.hand[me].length) + handCards(sortHand(st.hand[me], me), PAD + 6, y + 24, W - 2 * PAD - 12, h - 26,
      { max: 52, each: (id) => ({ type: st.type[id], star: CON.counting(st, me).has(id) }) });
  }
  if (covered()) {
    const p = localActor(), c = COLORS[p];
    let s = `<path d="${box('cover' + y, 10, y + 4, W - 20, h + L.barH - 8, 1.4)}" fill="${C.cover}" stroke="${PALETTE.pencil}" stroke-width="2.5"/>`;
    s += txt(W / 2, y + 40, t('con.cover.title'), { size: 24, color: C.muted });
    s += txt(W / 2, y + 86, name(p), { size: 44, color: c.main });
    s += txt(W / 2, y + 116, t('con.cover.note'), { size: 19, color: C.soft, weight: 600 });
    s += button('uncover', 60, y + 138, 240, 46, t('con.cover.btn'), { color: c });
    return s;
  }
  if (st.phase === 'setup') {
    const la = localActor();
    if (la < 0) return '';
    let s = '';
    const cw = 62, ch = 74, gap = 7, x0 = (W - 5 * cw - 4 * gap) / 2;
    for (let i = 0; i < 10; i++) {
      const id = la * 10 + i, r = Math.floor(i / 5), c = i % 5;
      s += card(id, x0 + c * (cw + gap), y + 4 + r * (ch + gap), cw, ch, { type: ui.setup[i], word: true, act: `data-act="mark" data-i="${i}"` });
    }
    return s;
  }
  const la = localActor();
  const picking = la === me && (st.phase === 'turn' || st.phase === 'fight');
  const committed = st.phase === 'fight' && kv.pend.a === me ? kv.pend.ca : null;
  const stars = CON.counting(st, me);
  let s = zoneHeader(PAD + 4, y + 2, me, st.hand[me].length);
  s += handCards(sortHand(st.hand[me], me), PAD + 6, y + 30, W - 2 * PAD - 12, h - 32, {
    max: 52,
    each: (id) => ({ type: kv.type[id], star: stars.has(id), sel: picking ? ui.mine === id : id === committed,
      act: picking ? `data-act="mine" data-id="${id}"` : '' }),
  });
  return s;
}

function actionBar(L, kv) {
  const y = L.barY, la = localActor();
  if (over() || covered()) return '';
  const hint = (k, c = C.hint) => txt(W / 2, y + 14, t(k), { size: 18, color: c, weight: 600 });
  const by = y + 20, bh = 42;
  if (st.phase === 'setup') {
    if (la < 0) return hint('con.h.wait');
    return button('shuffle', 30, by, 140, bh, t('con.b.shuffle')) + button('ready', 190, by, 140, bh, t('con.b.ready'), { color: COLORS[la] });
  }
  if (la < 0 || la !== L.me) return '';
  const c = COLORS[la];
  if (st.phase === 'turn') {
    const fightOk = ui.mine !== null && ui.target !== null && CON.canChallenge(st, la, ui.target);
    const swapOk = ui.mine !== null && ui.want !== null && CON.canOffer(st, la, ui.target, ui.mine, ui.want);
    let h;
    if (ui.mine === null) h = hint('con.h.pick', c.main);
    else if (ui.target === null) h = hint('con.h.target', c.main);
    else h = hint('con.h.go', c.main);
    return h + button('fight', 8, by, 132, bh, t('con.b.fight'), { color: fightOk ? c : null, off: !fightOk }) +
      button('swap', 148, by, 112, bh, t('con.b.swap'), { off: !swapOk }) +
      button('pass', 268, by, 84, bh, t('con.b.pass'));
  }
  if (st.phase === 'fight') {
    const dec = CON.canDecline(st, la, st.pend.a);
    const ok = ui.mine !== null;
    let s = hint(dec ? 'con.h.defend2' : 'con.h.defend', c.main);
    if (dec) s += button('respond', 30, by, 160, bh, t('con.b.respond'), { color: ok ? c : null, off: !ok }) + button('decline', 200, by, 130, bh, t('con.b.decline'));
    else s += button('respond', 90, by, 180, bh, t('con.b.respond'), { color: ok ? c : null, off: !ok });
    return s;
  }
  if (st.phase === 'trade') {
    return hint('con.h.trade', c.main) + button('accept', 40, by, 140, bh, t('con.b.accept'), { color: c }) + button('reject', 190, by, 130, bh, t('con.b.reject'));
  }
  return '';
}

function statusLine() {
  if (online() && blocked()) return [t(!sess.host && sess.maxPlayers > 2 ? 'con.online.host' : 'con.online.wait'), INK];
  if (over()) return ['', INK];
  if (notice && Date.now() < notice.until) return [t(notice.key), COLORS[mySeat()]?.main || INK];
  if (spectator()) return [t('con.watch'), C.hint];
  const away = online() ? CON.actors(st).find((p) => ctrl[p] === 'away') : undefined;
  if (away !== undefined && localActor() < 0) return [t(st.np > 2 ? 'con.away.status' : 'con.away.wait', { name: name(away) }), COLORS[away].main];
  const round = t('con.round', { r: CON.round(st), n: st.rounds });
  const solo = online() || !hotSeat();
  const la = localActor();
  if (st.phase === 'setup') {
    if (la >= 0 && covered()) return [t('con.cover.status', { name: name(la) }), COLORS[la].main];
    if (la >= 0) return [solo ? t('con.setup.you') : t('con.setup.name', { name: name(la) }), COLORS[la].main];
    return [t('con.setup.wait'), C.hint];
  }
  const [p] = CON.actors(st);
  if (la >= 0) {
    if (covered()) return [t('con.cover.status', { name: name(la) }), COLORS[la].main];
    if (st.phase === 'fight') return [solo ? t('con.defend.you') : t('con.defend', { name: name(la) }), COLORS[la].main];
    if (st.phase === 'trade') return [t('con.trade.you'), COLORS[la].main];
    return [solo ? t('con.turn.you', { round }) : t('con.turn', { name: name(la), round }), COLORS[la].main];
  }
  if (cpuSeat(p)) return [t(st.phase === 'trade' ? 'con.trade.them' : 'con.thinking', { name: name(p) }), COLORS[p].main];
  return [t(st.phase === 'trade' ? 'con.trade.them' : 'con.turn.them', { name: name(p) }), COLORS[p].main];
}

function renderPlayers() {
  const np = NP();
  $('#arena').classList.toggle('np3', np === 3);
  $('#arena').classList.toggle('np4', np === 4);
  $('#arena').classList.toggle('multi', np > 2);
  const acting = over() ? [] : CON.actors(st);
  for (const p of [0, 1, 2, 3]) {
    const el = $(`.player.p${p}`);
    el.hidden = p >= np;
    if (p >= np) continue;
    el.classList.toggle('active', over() || acting.includes(p));
    const m = moods[p];
    const pose = m.pose !== 'down' ? m.pose : acting.includes(p) && st.phase === 'turn' ? 'point' : 'down';
    const face = np === 2 ? (p === 0 ? 'right' : 'left') : p < np / 2 ? 'right' : 'left';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face, seed: 11 + p * 31 });
    const away = online() && ctrl[p] === 'away';
    const me = online() && p === mySeat();
    el.classList.toggle('away', away);
    el.classList.toggle('me', me);
    el.querySelector('.score').textContent = away ? t('con.away') : plural(CON.score(st, p), 'con.pts');
    const inp = el.querySelector('.name');
    // online: your own card says "you" until you type a name
    inp.placeholder = me && !ownName(p).trim() ? t('net.you') : name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) || me ? ownName(p) : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = online() ? !me : !isLocal(p);
  }
  const [txtS, col] = statusLine();
  const status = $('#status');
  status.textContent = txtS;
  status.style.color = col;

  $('#undo').disabled = online() || !history.length;
  $('#mode').disabled = online();
  $('#players').disabled = online() && !sess.host;
  if (online() && sess.host) {
    // seats that already have a device can't be removed
    const need = Math.max(2, ...[...slot.values()].filter((g) => g < 4).map((g) => g + 1));
    $('#players').querySelectorAll('option').forEach((o) => (o.disabled = +o.value < need));
  } else $('#players').querySelectorAll('option').forEach((o) => (o.disabled = false));
  $('#rounds').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('con.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('con.online.note') : '';
}

// ---------- bubbles & moods ----------
const bubbleTimers = [];
function say(p, key, delay = 0) {
  setTimeout(() => {
    if (p >= NP()) return;
    const b = $(`.player.p${p} .bubble`);
    // 3–4 players sit in one row: neighbouring bubbles would overlap, so only the latest one speaks
    if (NP() > 2) document.querySelectorAll('.player .bubble.show').forEach((o) => o !== b && o.classList.remove('show'));
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  }, delay);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const calm = () => [0, 1, 2, 3].forEach((p) => setMood(p, 'neutral'));

// React to the latest public event (same on host, guest and locally).
function react(prev, next) {
  if (!prev || next.seq === prev.seq || !next.ev) return;
  const ev = next.ev;
  switch (ev.k) {
    case 'start': calm(); break;
    case 'challenge':
      calm(); setMood(ev.a, 'smug', 'point'); setMood(ev.b, 'worried');
      say(ev.a, 'con.say.fight'); if (Math.random() < 0.5) say(ev.b, 'con.say.scared', 600);
      break;
    case 'fight': {
      calm(); fresh = true;
      if (ev.w < 0) { setMood(ev.a, 'worried'); setMood(ev.b, 'worried'); say(ev.b, 'con.say.tie'); break; }
      const l = ev.w === ev.a ? ev.b : ev.a, got = ev.w === ev.a ? ev.cb : ev.ca;
      const own = CON.owner(got) === ev.w, big = !own && CON.num(got) >= 8;
      setMood(ev.w, 'happy', big ? 'up' : 'wave'); setMood(l, 'sad');
      say(ev.w, own ? 'con.say.back' : big ? 'con.say.big' : 'con.say.won');
      if (big || Math.random() < 0.5) say(l, 'con.say.lost', 700);
      break;
    }
    case 'decline': calm(); setMood(ev.b, 'smug'); setMood(ev.a, 'sad'); say(ev.b, 'con.say.decline'); say(ev.a, 'con.say.refused', 700); break;
    case 'offer': calm(); setMood(ev.a, 'smug', 'wave'); say(ev.a, 'con.say.offer'); break;
    case 'deal': calm(); setMood(ev.a, 'happy'); setMood(ev.b, 'happy', 'wave'); say(ev.b, 'con.say.deal'); break;
    case 'nodeal': calm(); setMood(ev.a, 'sad'); setMood(ev.b, 'smug'); say(ev.b, 'con.say.nodeal'); break;
    case 'pass': setMood(ev.a, 'neutral'); if (Math.random() < 0.6) say(ev.a, 'con.say.pass'); break;
  }
}

// ---------- flow ----------
function resetSelection() { ui.mine = null; ui.want = null; ui.target = NP() === 2 && localActor() >= 0 ? 1 - localActor() : null; }

function prepareUI() {
  const la = localActor();
  if (st.phase === 'setup' && la >= 0 && ui.setupFor !== la) { ui.setup = CON.aiTypes('easy'); ui.setupFor = la; }
  if (ui.mine !== null && !(la >= 0 && st.hand[la].includes(ui.mine))) ui.mine = null;
  if (ui.want !== null && !(ui.target !== null && st.hand[ui.target]?.includes(ui.want))) ui.want = null;
}

function setState(next, { snapshot = false } = {}) {
  const prev = st;
  // During setup also remember the marks being made, so undoing "ready" gives them back.
  if (snapshot && !online()) history.push({ st: CON.clone(prev), setup: prev.phase === 'setup' ? [ui.setupFor, ui.setup.slice()] : null });
  const prevActor = localActor();
  st = next;
  pendingAct = false;
  react(prev, st);
  if (localActor() !== prevActor || st.phase !== prev.phase) resetSelection();
  prepareUI();
  if (over()) finish();
  render();
  if (online() && sess.host) sendState();
  tick();
}

function apply(s, p, a) {
  switch (a.kind) {
    case 'setTypes': return CON.setTypes(s, p, a.types);
    case 'challenge': return CON.challenge(s, p, a.b, a.card);
    case 'respond': return CON.respond(s, p, a.card);
    case 'decline': return CON.decline(s, p);
    case 'offer': return CON.offer(s, p, a.b, a.give, a.want);
    case 'answer': return CON.answer(s, p, !!a.yes);
    case 'pass': return CON.pass(s, p);
  }
  return false;
}

function act(p, a) {
  if (online() && !sess.host) {
    pendingAct = true;
    sess.send('act', { ...a, seq: st.seq });
    render();
    return;
  }
  const next = CON.clone(st);
  if (!apply(next, p, a)) return;
  if (online() && a.kind === 'setTypes') { if (isAI(p)) cpuMarked.add(p); else cpuMarked.delete(p); }
  setState(next, { snapshot: isLocal(p) && !online() });
}

function newGame() {
  clearTimeout(aiTimer);
  const np = cfg.players;
  gid++;
  st = CON.create({ players: np, rounds: cfg.rounds, first: gameNo % np });
  history = []; shapes = {}; uncovered = null; lastViewer = 0; fresh = false; finished = false; pendingAct = false;
  ui.setupFor = -1;
  cpuMarked.clear(); tookOver.clear(); hadHuman.clear();
  if (online() && sess.host) initCtrl();
  calm();
  $('#result').hidden = true;
  resetSelection();
  prepareUI();
  render();
  if (online() && sess.host) sendState();
  tick();
}

// Computer players: locally, or on the host for online seats without a device.
// They only ever look at their own view of the table.
function tick() {
  clearTimeout(aiTimer);
  if (over() || (online() ? !sess.host : cfg.mode === 'pvp')) return;
  const ai = CON.actors(st).filter((p) => isAI(p));
  if (!ai.length) return;
  const s0 = st; // the table may change before the timer fires (a guest takes the seat, a restart…)
  if (st.phase === 'setup') {
    aiTimer = setTimeout(() => {
      if (st !== s0) return;
      const next = CON.clone(st);
      for (const p of ai) if (isAI(p)) { CON.setTypes(next, p, CON.aiTypes(level())); cpuMarked.add(p); }
      setState(next);
    }, 250);
    return;
  }
  const p = ai[0], lv = level();
  const afterFight = st.ev && st.ev.k === 'fight';
  const delay = st.phase === 'turn' ? (afterFight ? 1700 : 1000) : 850;
  aiTimer = setTimeout(() => {
    if (st !== s0 || !isAI(p)) return;
    const v = CON.view(st, p);
    let a;
    if (st.phase === 'turn') {
      const x = CON.aiAct(v, p, lv);
      a = x.kind === 'pass' ? { kind: 'pass' } : x.kind === 'offer' ? x : { kind: 'challenge', b: x.b, card: x.card };
    } else if (st.phase === 'fight') {
      const x = CON.aiRespond(v, p, lv);
      a = x.kind === 'decline' ? { kind: 'decline' } : { kind: 'respond', card: x.card };
    } else a = { kind: 'answer', yes: CON.aiAnswer(v, p, lv) };
    act(p, a);
  }, delay + Math.random() * 300);
}

function finish() {
  if (finished) return;
  finished = true;
  const sc = CON.scores(st), win = CON.winners(st);
  calm();
  if (win.length > 1) { win.forEach((p) => setMood(p, 'worried')); say(win[0], 'con.say.tie'); }
  else {
    const w = win[0];
    setMood(w, 'happy', 'up'); say(w, 'con.say.win', 200);
    seats().filter((p) => p !== w).forEach((p, i) => { setMood(p, 'sad'); if (i < 2) say(p, 'con.say.lose', 900 + i * 600); });
  }
  const tx = $('#result-text');
  tx.textContent = win.length > 1 ? t('con.tie') : t('con.win', { name: name(win[0]) });
  tx.style.color = win.length > 1 ? INK : COLORS[win[0]].main;
  $('#result-sub').textContent = t('con.score.sub', { s: sc.join(' · ') });
  setTimeout(() => { if (finished && over()) $('#result').hidden = false; }, 1300);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  const h = history.pop();
  st = h.st;
  uncovered = null; fresh = false; finished = false; pendingAct = false;
  [ui.setupFor, ui.setup] = h.setup || [-1, null];
  calm();
  $('#result').hidden = true;
  resetSelection();
  prepareUI();
  render();
  tick();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  gameNo++;
  newGame();
}

// ---------- online ----------
// Host is authoritative and keeps the secrets: every guest only gets what its own seat may see
// (marks of its own cards, its own card in a pending fight). Once the game is over everything is shown.
function initCtrl() {
  // devices that only watched (too few seats) may get a seat at the new table
  for (const [n, g] of [...slot]) if (g >= st.np && intro.has(n)) { slot.delete(n); assign(n, true); }
  const live = [...slot.values()];
  ctrl = [0, 1, 2, 3].map((k) => k === 0 ? 'host' : live.includes(k) ? 'human' : cfg.players > 2 ? 'cpu' : 'wait');
  live.forEach((k) => hadHuman.add(k));
  awayTimers.forEach((x) => clearTimeout(x));
}
// The host keeps the match in sessionStorage (per room), so reloading the host's tab doesn't wipe it.
const roomKey = (s) => `mg-con-room-${s.code}`;
function persist() {
  if (!online() || !sess.host || !st) return;
  sessionStorage.setItem(roomKey(sess), JSON.stringify({
    st, gid, gameNo, ctrl, remoteNames, owner, ownerDev, cpuMarked: [...cpuMarked], hadHuman: [...hadHuman],
  }));
}
// Host reload: put the saved match back. Guests' devices reconnect in a few seconds; until then their seats
// are "away" (2 players: wait; 3–4: the computer steps in only if they don't come back).
function restore(s) {
  const saved = JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
  if (!saved || !saved.st || ![2, 3, 4].includes(saved.st.np)) return false;
  clearTimeout(aiTimer);
  st = saved.st; gid = saved.gid; gameNo = saved.gameNo || 0;
  remoteNames = saved.remoteNames || ['', '', '', ''];
  owner = saved.owner || [null, null, null, null];
  ownerDev = saved.ownerDev || [null, null, null, null];
  cpuMarked.clear(); (saved.cpuMarked || []).forEach((k) => cpuMarked.add(k));
  hadHuman.clear(); (saved.hadHuman || []).forEach((k) => hadHuman.add(k));
  tookOver.clear();
  if (cfg.players !== st.np) { cfg.players = st.np; saveCfg(); s.setMaxPlayers(st.np); }
  cfg.rounds = st.rounds;
  $('#players').value = st.np; $('#rounds').value = st.rounds;
  ctrl = (saved.ctrl || []).slice(0, 4);
  history = []; shapes = {}; uncovered = null; fresh = false; finished = false; pendingAct = false; ui.setupFor = -1;
  calm(); $('#result').hidden = true;
  for (let k = 1; k < 4; k++) if (ctrl[k] === 'human' || ctrl[k] === 'away') seatLeftNow(k);
  resetSelection(); prepareUI();
  if (over()) finish();
  render();
  tick();
  return true;
}
const int = (x) => (Number.isInteger(x) ? x : -1);
const cleanName = (x) => (typeof x === 'string' ? x.slice(0, 14) : '');
function cleanAct(d) {
  if (!d || typeof d !== 'object') return null;
  const seq = d.seq;
  switch (d.kind) {
    case 'setTypes': return { kind: d.kind, types: Array.isArray(d.types) ? d.types.slice(0, CON.HAND + 1) : null };
    case 'challenge': return { kind: d.kind, seq, b: int(d.b), card: int(d.card) };
    case 'respond': return { kind: d.kind, seq, card: int(d.card) };
    case 'offer': return { kind: d.kind, seq, b: int(d.b), give: int(d.give), want: int(d.want) };
    case 'answer': return { kind: d.kind, seq, yes: d.yes === true };
    case 'decline': case 'pass': return { kind: d.kind, seq };
  }
  return null;
}
function names() { return [0, 1, 2, 3].map((k) => (k === 0 ? cfg.names[0] : remoteNames[k]) || ''); }
function sendState(only) {
  for (const [n, k] of slot) {
    if (only !== undefined && k !== only) continue;
    const took = tookOver.delete(k);
    sess.send('state', { st: over() ? st : CON.view(st, k < st.np ? k : -1), names: names(), ctrl, g: gid, took, you: k }, { to: n });
  }
}
// Host: the device at net seat n introduced itself. Its old game seat if it had one; otherwise a seat nobody
// owns, else one whose device is gone (a player who reopened the link in a new tab); else it watches.
function hello(n, cid, nm, dev) {
  if (typeof cid !== 'string' || !cid || cid.length > 40) return;
  if (typeof dev !== 'string' || dev.length > 40) dev = '';
  unhold(n);
  slot.delete(n);
  intro.set(n, { cid, nm: cleanName(nm), dev });
  assign(n, false);
}
// silent: called from newGame (no join reactions / state yet — the caller sends it)
function assign(n, silent, noHold = silent) {
  const { cid, nm, dev } = intro.get(n);
  const live = new Set(slot.values());
  const ok = (k) => k >= 1 && k < st.np;
  let g = owner.indexOf(cid);
  if (!ok(g)) {
    g = -1;
    // The same browser's earlier tab played a seat (the link reopened in a new tab): give that seat back.
    // If the old tab still looks connected (it takes a few seconds to notice it's gone), wait for it a moment.
    const mine = dev ? [1, 2, 3].find((k) => ok(k) && ownerDev[k] === dev) : undefined;
    if (mine !== undefined) {
      if (!live.has(mine)) g = mine;
      else if (!noHold) {
        held.set(n, setTimeout(() => { held.delete(n); if (sess?.host && intro.has(n) && !slot.has(n)) assign(n, false, true); }, HOLD_MS));
        return;
      }
    }
    if (g < 0) {
      const seatsN = [n, 1, 2, 3].filter(ok);
      g = seatsN.find((k) => !owner[k] && !live.has(k)) ?? seatsN.find((k) => !live.has(k)) ?? 9;
    }
  }
  unhold(n);
  for (const [m, k] of slot) if (k === g) slot.delete(m); // a stale device on that seat
  if (g < 4) { owner[g] = cid; ownerDev[g] = dev; remoteNames[g] = nm; }
  slot.set(n, g);
  if (!silent) seatJoined(g);
}
function unhold(n) { if (held.has(n)) { clearTimeout(held.get(n)); held.delete(n); } }
// A seat's device left: a new tab of the same browser that was waiting for it takes the seat now.
function releaseHeld(g) {
  for (const n of [...held.keys()]) {
    const i = intro.get(n);
    if (i && i.dev && ownerDev[g] === i.dev) { unhold(n); assign(n, false); return; }
  }
}
// Host: a guest's device (re)appeared at seat k.
function seatJoined(k) {
  clearTimeout(awayTimers[k]);
  if (k >= st.np) return sendState(k); // no seat for this device: it watches
  const was = ctrl[k];
  ctrl[k] = 'human';
  if (st.phase === 'setup' && st.ready[k] && cpuMarked.has(k)) {
    // the computer marked these cards a moment ago — let the human mark their own
    const next = CON.clone(st);
    next.ready[k] = false;
    for (let i = 0; i < CON.HAND; i++) next.type[k * CON.HAND + i] = null;
    next.seq++;
    cpuMarked.delete(k);
    st = next;
  } else if (was === 'cpu' && st.phase !== 'setup' && !over() && !hadHuman.has(k)) tookOver.add(k);
  hadHuman.add(k);
  if (was !== 'human' && was !== 'away') say(k, 'con.say.join');
  render();
  sendState();
  tick();
}
// Host: seat k's device dropped out. 3–4 players: the computer steps in after a while; 2 players: wait, as always.
function seatLeft(k) {
  if (k >= st.np || ctrl[k] !== 'human') return;
  seatLeftNow(k);
  render();
  sendState();
}
function seatLeftNow(k) {
  ctrl[k] = 'away';
  clearTimeout(awayTimers[k]);
  if (st.np > 2) {
    awayTimers[k] = setTimeout(() => {
      if (!sess || ctrl[k] !== 'away') return;
      ctrl[k] = 'cpu';
      render(); sendState(); tick();
    }, AWAY_MS);
  }
}
// Per-browser id (all tabs of a browser share it), so a guest who reopens the link in a new tab gets their seat back.
function devId() {
  let d = localStorage.getItem('mg-con-dev');
  if (!d) { d = Math.random().toString(36).slice(2, 12); localStorage.setItem('mg-con-dev', d); }
  return d;
}
function showNotice(key, ms = 6000) {
  notice = { key, until: Date.now() + ms };
  setTimeout(() => { if (notice && Date.now() >= notice.until) { notice = null; render(); } }, ms + 50);
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  remoteNames = ['', '', '', ''];
  owner = [null, null, null, null]; ownerDev = [null, null, null, null]; slot.clear(); intro.clear(); you = -1;
  for (const n of [...held.keys()]) unhold(n);
  synced = s.host; hostGame = -1; notice = null;
  const cid = () => sessionStorage.getItem('mg-client-id') || '';
  s.on('status', () => { if (sess === s) render(); });
  s.on('roster', () => { if (sess === s && s.host) render(); });
  // Guests introduce themselves; the host answers with that device's seat and view.
  s.on('peer-join', () => { if (sess === s && !s.host) s.send('hello', { cid: cid(), dev: devId(), name: cfg.me || '' }); });
  s.on('hello', (d, { seat }) => { if (sess === s && s.host) hello(seat, d?.cid, d?.name, d?.dev); });
  s.on('peer-leave', ({ seat }) => {
    if (sess !== s) return;
    if (!s.host) return render();
    unhold(seat);
    intro.delete(seat);
    const g = slot.get(seat);
    if (g === undefined) return;
    slot.delete(seat);
    seatLeft(g);
    if (g < 4) releaseHeld(g);
  });
  s.on('state', (d) => {
    if (s.host || sess !== s) return;
    const ns = d.st;
    remoteNames = d.names.slice();
    ctrl = d.ctrl.slice();
    $('#rounds').value = ns.rounds;
    $('#players').value = ns.np;
    const restarted = !synced || d.g !== hostGame || ns.np !== st.np || ns.seq < st.seq || d.you !== you;
    synced = true; hostGame = d.g; you = Number.isInteger(d.you) ? d.you : 9;
    if (d.took) showNotice('con.online.took');
    if (restarted) {
      st = ns; history = []; shapes = {}; finished = false; pendingAct = false; ui.setupFor = -1; fresh = false;
      calm(); $('#result').hidden = true;
      resetSelection(); prepareUI();
      if (over()) finish();
      render();
      return;
    }
    setState(ns);
  });
  s.on('name', (d, { seat: n }) => {
    const seat = slot.get(n);
    if (!s.host || !(seat < 4)) return;
    remoteNames[seat] = cleanName(d?.name);
    render();
    sendState();
  });
  s.on('act', (raw, { seat: n }) => {
    const seat = slot.get(n);
    if (!s.host || seat === undefined) return;
    // A guest's message is untrusted: keep only the known fields, card/seat numbers must be integers.
    const d = cleanAct(raw);
    if (!d || seat >= st.np || ctrl[seat] !== 'human') return sendState(seat);
    if (d.kind !== 'setTypes' && d.seq !== st.seq) return sendState(seat);
    const next = CON.clone(st);
    if (apply(next, seat, d)) { if (d.kind === 'setTypes') cpuMarked.delete(seat); setState(next); } else sendState(seat);
  });
  s.on('resync', (d, { seat: n }) => s.host && slot.has(n) && sendState(slot.get(n)));
  if (!(s.host && restore(s))) newGame();
  if (!s.host) s.send('resync');
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, la = localActor();
  if (a === 'uncover') { if (la >= 0) { uncovered = la; resetSelection(); prepareUI(); render(); } return; }
  if (la < 0 || covered()) return;
  const id = el.dataset.id !== undefined ? +el.dataset.id : null;
  switch (a) {
    case 'mark': { const i = +el.dataset.i; ui.setup[i] = (ui.setup[i] + 1) % 3; break; }
    case 'shuffle': ui.setup = CON.aiTypes('easy'); break;
    case 'ready': act(la, { kind: 'setTypes', types: ui.setup.slice() }); return;
    case 'mine': ui.mine = ui.mine === id ? null : id; break;
    case 'want': {
      const q = st.hand.findIndex((h) => h.includes(id));
      if (ui.want === id) ui.want = null; else { ui.want = id; ui.target = q; }
      break;
    }
    case 'zone': { const q = +el.dataset.q; if (ui.target !== q) ui.want = null; ui.target = q; break; }
    case 'fight': if (ui.mine !== null && ui.target !== null) act(la, { kind: 'challenge', b: ui.target, card: ui.mine }); return;
    case 'swap': if (ui.mine !== null && ui.want !== null) act(la, { kind: 'offer', b: ui.target, give: ui.mine, want: ui.want }); return;
    case 'pass': act(la, { kind: 'pass' }); return;
    case 'respond': if (ui.mine !== null) act(la, { kind: 'respond', card: ui.mine }); return;
    case 'decline': act(la, { kind: 'decline' }); return;
    case 'accept': act(la, { kind: 'answer', yes: true }); return;
    case 'reject': act(la, { kind: 'answer', yes: false }); return;
  }
  render();
});

$('#players').addEventListener('change', (e) => {
  if (online() && !sess.host) return;
  cfg.players = +e.target.value; saveCfg();
  if (online()) sess.setMaxPlayers(cfg.players);
  newGame();
});
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    if (online() && !sess.host) cfg.me = inp.value; else cfg.names[p] = inp.value;
    saveCfg();
    if (online()) { if (sess.host) sendState(); else sess.send('name', { name: inp.value }); }
    render();
  }));
document.addEventListener('mg:lang', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#players').value = cfg.players;
$('#mode').value = cfg.mode;
$('#rounds').value = cfg.rounds;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  // A guest turned away from a full room doesn't know how big the room is; net.js picks the "full" text from
  // this function, so answer "more than two" just for that moment to get the generic "no free seats" text.
  maxPlayers: () => (fullGuest ? 4 : cfg.players),
  onEnd: () => {
    if (sess && !sess.host && sess.status === 'full') { fullGuest = true; setTimeout(() => (fullGuest = false)); }
    sess = null; awayTimers.forEach((x) => clearTimeout(x)); notice = null;
    $('#rounds').value = cfg.rounds; $('#players').value = cfg.players; newGame();
  },
});
if (!online()) showOnce('how', SLUG);
