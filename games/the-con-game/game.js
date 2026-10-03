import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { CON } from './engine.js';
import './strings.js';

const SLUG = 'the-con-game';
const GREEN = { main: '#3aa655', dark: '#1f7a37', fill: '#97d9a8' };
const VIOLET = { main: '#8e5cc4', dark: '#5f3590', fill: '#c9b0e6' };
const COLORS = [PALETTE.blue, PALETTE.red, GREEN, VIOLET];
const INK = PALETTE.ink;
const W = 360, PAD = 6;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ players: 2, mode: 'normal', rounds: 8, names: ['', '', '', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (![2, 3, 4].includes(cfg.players)) cfg.players = 2;
if (!['pvp', 'easy', 'normal'].includes(cfg.mode)) cfg.mode = 'normal';
if (![5, 8, 12].includes(cfg.rounds)) cfg.rounds = 8;
while (cfg.names.length < 4) cfg.names.push('');
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, gameNo = 0;
let uncovered = null;    // hot-seat: the player who pressed "it's me"
let lastViewer = 0;      // hot-seat: whose side of the table is shown when nobody local has to act
let fresh = false;       // animate the fight that was just revealed
let finished = false;
let pendingAct = false;  // guest: an action was sent, waiting for the host
let sess = null;         // online session (shared/net.js), null when playing locally
const remoteNames = ['', '', '', ''];
const ui = { mine: null, target: null, want: null, setup: null, setupFor: -1 };
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const NP = () => st.np;
const seats = () => [...Array(st.np).keys()];
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p !== 0;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const hotSeat = () => !online() && cfg.mode === 'pvp';
const level = () => cfg.mode === 'easy' ? 'easy' : 'normal';
const over = () => st.phase === 'over';
function name(p) {
  if (isAI(p)) return t('con.cpu' + p);
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('con.p' + p);
}
// The local human who must act right now (-1: nobody here).
function localActor() {
  if (over() || pendingAct || (online() && !sess.connected)) return -1;
  return CON.actors(st).find((p) => isLocal(p)) ?? -1;
}
const covered = () => hotSeat() && localActor() >= 0 && uncovered !== localActor();
function viewer() {
  if (online()) return mySeat();
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
  const fill = color ? color.main : '#fff', stroke = color ? color.dark : INK;
  return `<g class="sbtn${off ? ' off' : ''}" ${off ? '' : `data-act="${act}"`} role="button">
    <path d="${box(`btn${w}x${h}_${x}_${y}`, x, y, w, h, 1.4)}" fill="${fill}" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round"/>
    ${txt(x + w / 2, y + h / 2 + 7, label, { size: 22, color: color ? '#fff' : INK, max: w - 12 })}</g>`;
}

// Type pictures, drawn in a 24×24 box centred on 0,0.
const ICON = {};
function typeIcon(type) {
  return (ICON[type] ??= withSeed(17 + type * 5, () => {
    const sw = 'stroke-linecap="round" stroke-linejoin="round"';
    if (type === 0) {
      const d = circle(0, 1, 10, 8.4, 0.13);
      return `<path d="${d}" fill="#9a98a3" filter="url(#mg-crayon)"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="2" ${sw}/>` +
        `<path d="M-4 -2 Q-1 -4 2 -3" fill="none" stroke="${INK}" stroke-width="1.3" ${sw}/>`;
    }
    if (type === 1) {
      return `<g transform="rotate(-8)"><path d="M-7.5 -10.5 L5 -10.5 L8 -7.5 L8 10.5 L-7.5 10.5 Z" fill="#fff" stroke="${INK}" stroke-width="2" ${sw}/>` +
        `<path d="M-4.5 -5 L4.5 -5 M-4.5 -1 L4.5 -1 M-4.5 3 L4.5 3 M-4.5 7 L1.5 7" stroke="#9a98a3" stroke-width="1.4" ${sw}/></g>`;
    }
    return `<path d="M-2.4 3.8 L6 -11 M2.4 3.8 L-6 -11" stroke="${INK}" stroke-width="2.4" ${sw} fill="none"/>` +
      `<path d="${circle(-4.6, 7.4, 3.6, 3.6, 0.05)}" fill="#fff" stroke="${INK}" stroke-width="2" ${sw}/>` +
      `<path d="${circle(4.6, 7.4, 3.6, 3.6, 0.05)}" fill="#fff" stroke="${INK}" stroke-width="2" ${sw}/>`;
  }));
}
const STAR = 'M0 -5.5 L1.6 -1.7 L5.4 -1.6 L2.4 1 L3.4 5 L0 2.7 L-3.4 5 L-2.4 1 L-5.4 -1.6 L-1.6 -1.7 Z';

// One card. id < 0 draws an anonymous face-down card.
function card(id, x, y, w, h, { type = null, sel = false, star = false, act = '', cls = '', word = false } = {}) {
  const back = id < 0;
  const own = back ? null : COLORS[CON.owner(id)];
  const body = box(`card${back ? 'b' : id}_${w.toFixed(1)}x${h.toFixed(1)}`, 0, 0, w, h, Math.min(1.2, w / 40));
  const fill = sel ? '#fff4c4' : back ? '#ecebe4' : type === null ? '#f4f3ee' : '#fff';
  // The animation class sits on an inner group: a CSS transform on the outer one would replace its translate.
  let s = `<g class="card${sel ? ' sel' : ''}" transform="translate(${x.toFixed(1)} ${(y - (sel ? 6 : 0)).toFixed(1)})" ${act}><g class="${cls}">`;
  s += `<path d="${body}" fill="${fill}" stroke="${back ? '#aaa' : sel ? INK : own.main}" stroke-width="${sel ? 3 : 2.4}" stroke-linejoin="round"/>`;
  if (back) {
    s += `<path d="M${w * 0.2} ${h * 0.25} L${w * 0.8} ${h * 0.75} M${w * 0.8} ${h * 0.25} L${w * 0.2} ${h * 0.75}" stroke="#ccc" stroke-width="2" stroke-linecap="round"/>`;
    s += txt(w / 2, h / 2 + w * 0.2, '?', { size: w * 0.6, color: '#999' });
    return s + '</g></g>';
  }
  const ns = Math.max(11, Math.min(w * 0.42, h * 0.3));
  s += txt(4 + ns * 0.02, ns * 0.95, CON.num(id), { size: ns, color: own.main, anchor: 'start' });
  const k = Math.min(w * 0.68, h * (word ? 0.4 : 0.48)) / 24;
  const cy = word ? h * 0.52 : h * 0.62;
  if (type === null) s += txt(w / 2, cy + 9 * k, '?', { size: 26 * k, color: '#b8b6ad' });
  else s += `<g transform="translate(${(w / 2).toFixed(1)} ${cy.toFixed(1)}) scale(${k.toFixed(2)})">${typeIcon(type)}</g>`;
  if (word && type !== null) s += txt(w / 2, h - 7, t('con.type' + type), { size: Math.min(16, w * 0.26), color: '#666', weight: 600, max: w - 6 });
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
  if (!ids.length) return txt(x + w / 2, y + h / 2 + 6, '—', { size: 24, color: '#bbb' });
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
  for (let i = 1; i < np; i++) { zones.push({ q: (me + i) % np, y, h: oppH }); y += oppH + 4; }
  const arenaY = y; y += arenaH + 2;
  const myY = y; y += myH + 2;
  const barY = y; y += barH;
  return { me, zones, arenaY, arenaH, myY, myH, barY, barH, H: y + 2 };
}

// ---------- rendering ----------
function render() {
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
  s += `<path d="${box('zone' + q + '_' + h + '_' + y, PAD, y, W - 2 * PAD, h, 1)}" fill="${chosen ? '#fbf8ee' : 'transparent'}" stroke="${chosen ? c.main : '#d6d4cc'}" stroke-width="${chosen ? 2.6 : 1.6}" ${chosen ? '' : 'stroke-dasharray="5 6"'}/>`;
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
const vsMark = (cx, cy) => txt(cx, cy + 8, 'vs', { size: 26, color: '#999' });

function arena(L, kv) {
  const y = L.arenaY, cx = W / 2;
  let s = `<path d="${shapeFor('arena' + y, () => line(16, y - 1, W - 16, y - 1, 0.8))}" stroke="${PALETTE.pencil}" stroke-width="1.6" stroke-dasharray="3 6" fill="none"/>`;
  if (st.phase === 'setup') {
    const la = localActor();
    if (la >= 0 && !covered()) {
      s += txt(cx, y + 40, t('con.h.setup'), { size: 22, color: COLORS[la].main });
      s += txt(cx, y + 68, t('con.h.setup2'), { size: 17, color: '#777', weight: 600 });
      const cnt = [0, 1, 2].map((k) => ui.setup.filter((x) => x === k).length);
      [0, 1, 2].forEach((k) => {
        const x = cx - 96 + k * 80;
        s += `<g transform="translate(${x} ${y + 98}) scale(.95)">${typeIcon(k)}</g>` + txt(x + 24, y + 106, '× ' + cnt[k], { size: 21, color: INK, anchor: 'middle' });
      });
    } else {
      s += txt(cx, y + 46, t('con.a.waitsetup'), { size: 21, color: '#666' });
      seats().forEach((p, i) => {
        const x = cx + (i - (NP() - 1) / 2) * 76;
        s += `<circle cx="${x - 28}" cy="${y + 80}" r="6" fill="${COLORS[p].main}"/>`;
        s += txt(x - 18, y + 86, st.ready[p] ? '✓ ' + t('con.ready') : '…', { size: 19, color: st.ready[p] ? COLORS[p].main : '#aaa', anchor: 'start' });
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
    const res = w >= 0 ? [t('con.r.win', { name: name(w) }), COLORS[w].main] : [t('con.r.tie'), '#777'];
    const mark = (x, yy) => {
      if (w < 0) return txt(x, yy + 9, '=', { size: 34, color: '#999' });
      const dir = w === a ? 1 : -1; // arrow points from winner to loser
      const d = shapeFor('arr' + dir, () => line(x - 24 * dir, yy, x + 24 * dir, yy, 1.4));
      return `<g class="arrow${anim}"><path d="${d}" stroke="${COLORS[w].main}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        `<path d="M${x + 14 * dir} ${yy - 9} L${x + 25 * dir} ${yy} L${x + 14 * dir} ${yy + 9}" stroke="${COLORS[w].main}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    };
    s += duelPic(L,
      (x, yy, wd, h) => card(ca, x, yy, wd, h, { type: kv.type[ca], cls: anim, word: true }),
      (x, yy, wd, h) => card(cb, x, yy, wd, h, { type: kv.type[cb], cls: anim, word: true }),
      mark,
      ev ? ev[0] : `${name(a)} ⚔ ${name(b)}`, ev ? ev[1] : '#888', res);
    return s;
  }
  if (ev) s += txt(cx, y + 15, ev[0], { size: 18, color: ev[1] });
  s += txt(cx, y + 60, t('con.a.start', { name: name(st.first) }), { size: 23, color: COLORS[st.first].main });
  s += `<g transform="translate(${cx - 50} ${y + 92})">${typeIcon(0)}</g><g transform="translate(${cx} ${y + 92})">${typeIcon(2)}</g><g transform="translate(${cx + 50} ${y + 92})">${typeIcon(1)}</g>`;
  s += txt(cx - 25, y + 99, '›', { size: 24, color: '#999' }) + txt(cx + 25, y + 99, '›', { size: 24, color: '#999' });
  return s;
}

function myZone(L, kv) {
  const y = L.myY, h = L.myH, me = L.me;
  if (over()) {
    return zoneHeader(PAD + 4, y + 2, me, st.hand[me].length) + handCards(sortHand(st.hand[me], me), PAD + 6, y + 24, W - 2 * PAD - 12, h - 26,
      { max: 52, each: (id) => ({ type: st.type[id], star: CON.counting(st, me).has(id) }) });
  }
  if (covered()) {
    const p = localActor(), c = COLORS[p];
    let s = `<path d="${box('cover' + y, 10, y + 4, W - 20, h + L.barH - 8, 1.4)}" fill="#f6f5f0" stroke="${PALETTE.pencil}" stroke-width="2.5"/>`;
    s += txt(W / 2, y + 40, t('con.cover.title'), { size: 24, color: '#666' });
    s += txt(W / 2, y + 86, name(p), { size: 44, color: c.main });
    s += txt(W / 2, y + 116, t('con.cover.note'), { size: 19, color: '#888', weight: 600 });
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
  const hint = (k, c = '#777') => txt(W / 2, y + 14, t(k), { size: 18, color: c, weight: 600 });
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
  if (online() && !sess.connected) return [t('con.online.wait'), INK];
  if (over()) return ['', INK];
  const round = t('con.round', { r: CON.round(st), n: st.rounds });
  const solo = online() || !hotSeat();
  const la = localActor();
  if (st.phase === 'setup') {
    if (la >= 0 && covered()) return [t('con.cover.status', { name: name(la) }), COLORS[la].main];
    if (la >= 0) return [solo ? t('con.setup.you') : t('con.setup.name', { name: name(la) }), COLORS[la].main];
    return [t('con.setup.wait'), '#777'];
  }
  const [p] = CON.actors(st);
  if (la >= 0) {
    if (covered()) return [t('con.cover.status', { name: name(la) }), COLORS[la].main];
    if (st.phase === 'fight') return [solo ? t('con.defend.you') : t('con.defend', { name: name(la) }), COLORS[la].main];
    if (st.phase === 'trade') return [t('con.trade.you'), COLORS[la].main];
    return [solo ? t('con.turn.you', { round }) : t('con.turn', { name: name(la), round }), COLORS[la].main];
  }
  if (isAI(p)) return [t(st.phase === 'trade' ? 'con.trade.them' : 'con.thinking', { name: name(p) }), COLORS[p].main];
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
    el.querySelector('.score').textContent = plural(CON.score(st, p), 'con.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const [txtS, col] = statusLine();
  const status = $('#status');
  status.textContent = txtS;
  status.style.color = col;

  $('#undo').disabled = online() || !history.length;
  $('#mode').disabled = online();
  $('#players').disabled = online();
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
  if (apply(next, p, a)) setState(next, { snapshot: isLocal(p) && !online() });
}

function newGame() {
  clearTimeout(aiTimer);
  const np = online() ? 2 : cfg.players;
  st = CON.create({ players: np, rounds: cfg.rounds, first: gameNo % np });
  history = []; shapes = {}; uncovered = null; lastViewer = 0; fresh = false; finished = false; pendingAct = false;
  ui.setupFor = -1;
  calm();
  $('#result').hidden = true;
  resetSelection();
  prepareUI();
  render();
  if (online() && sess.host) sendState();
  tick();
}

// Computer players (never online). They only ever look at their own view of the table.
function tick() {
  clearTimeout(aiTimer);
  if (online() || over() || cfg.mode === 'pvp') return;
  const ai = CON.actors(st).filter((p) => isAI(p));
  if (!ai.length) return;
  if (st.phase === 'setup') {
    aiTimer = setTimeout(() => {
      const next = CON.clone(st);
      for (const p of ai) CON.setTypes(next, p, CON.aiTypes(level()));
      setState(next);
    }, 250);
    return;
  }
  const p = ai[0], lv = level();
  const afterFight = st.ev && st.ev.k === 'fight';
  const delay = st.phase === 'turn' ? (afterFight ? 1700 : 1000) : 850;
  aiTimer = setTimeout(() => {
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
// Host is authoritative and keeps the secrets: the guest only gets what seat 1 may see.
function sendState() {
  sess.send('state', { st: over() ? st : CON.view(st, 1), names: cfg.names });
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
    const ns = d.st;
    $('#rounds').value = ns.rounds;
    const restarted = ns.seq < st.seq || ns.np !== st.np || (ns.seq === 0 && st.seq !== 0) || ns.first !== st.first;
    if (restarted) {
      st = ns; shapes = {}; finished = false; pendingAct = false; ui.setupFor = -1; fresh = false;
      calm(); $('#result').hidden = true;
      resetSelection(); prepareUI();
      if (over()) finish();
      render();
      return;
    }
    setState(ns);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('act', (d) => {
    if (!s.host) return;
    if (d.kind !== 'setTypes' && d.seq !== st.seq) return sendState();
    const next = CON.clone(st);
    if (apply(next, 1, d)) setState(next); else sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else { newGame(); s.send('resync'); }
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

$('#players').addEventListener('change', (e) => { cfg.players = +e.target.value; saveCfg(); newGame(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
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
$('#players').value = cfg.players;
$('#mode').value = cfg.mode;
$('#rounds').value = cfg.rounds;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; $('#rounds').value = cfg.rounds; newGame(); },
});
if (!online()) showOnce('how', SLUG);
