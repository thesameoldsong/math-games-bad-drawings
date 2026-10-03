import { t, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { CE } from './engine.js';
import { itemSVG } from './items.js';
import './strings.js';

const SLUG = 'caveat-emptor';
const COLORS = [
  PALETTE.blue, PALETTE.red,
  { main: '#3aa655', dark: '#1f6e33', fill: '#93d6a3' },
  { main: '#f08a24', dark: '#a8540a', fill: '#f8c48d' },
  { main: '#8a5cc7', dark: '#5a3591', fill: '#c6aee8' },
  { main: '#14a39a', dark: '#0b6b63', fill: '#86d6cf' },
  { main: '#e05aa8', dark: '#9c2a6c', fill: '#f2a9d3' },
  { main: '#9a6b3f', dark: '#5f3f20', fill: '#d4b391' },
];
const INK = PALETTE.ink;
const EYE = '<svg class="eye" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 8 Q12 -2 22 8 Q12 18 2 8 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="8" r="3.2" fill="currentColor"/></svg>';
const W = 400;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board'), panel = $('#panel');

const cfg = Object.assign({ players: 4, cpu: 3, level: 'normal', rounds: 5, names: [] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const fixCfg = () => {
  cfg.players = Math.min(8, Math.max(2, +cfg.players || 4));
  cfg.cpu = Math.min(cfg.players - 1, Math.max(0, +cfg.cpu || 0));
  cfg.rounds = Math.min(7, Math.max(3, +cfg.rounds || 5));
  if (!['easy', 'normal', 'hard'].includes(cfg.level)) cfg.level = 'normal';
  cfg.names = Array.from({ length: 8 }, (_, i) => cfg.names[i] || '');
};
fixCfg();
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history = [], shapes = {}, aiTimer, gid = 0, gameCpu = 0, gameLevel = 'normal';
let uncovered = -1;      // hot-seat: which player pressed "it's me" behind the cover
let peeking = false;     // hot-seat: current bidder holds the peek button
let bidDraft = 0, draftSeq = -1, resultShown = false, synced = false;
let sess = null;
let hostLevel = 'normal'; // guest: the host's computer level, shown in the (read-only) settings
const remoteNames = ['', ''];
let moods = [];

// ---------- who is who ----------
const online = () => !!sess;
const guest = () => online() && !sess.host;
function kind(p) {
  if (online()) return p === sess.seat ? 'local' : p <= 1 ? 'remote' : 'ai';
  return p < st.n - gameCpu ? 'local' : 'ai';
}
const locals = () => [...Array(st.n).keys()].filter((p) => kind(p) === 'local');
const hotSeat = () => !online() && locals().length > 1;
const ready = () => !online() || (sess.connected && (sess.host || synced));
const canAct = (p) => p >= 0 && kind(p) === 'local' && ready();
function name(p) {
  if (kind(p) === 'ai') return t('ce.bot' + p);
  const n = kind(p) === 'remote' ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('ce.p' + p);
}
const level = () => (online() ? cfg.level : gameLevel);
// Whose secret card this screen may show right now.
function viewer() {
  if (online()) return sess.seat;
  if (!hotSeat()) return 0;
  if (st.phase === 'pick' && uncovered >= 0) return uncovered;
  if (st.phase === 'bid' && peeking && canAct(st.turn)) return st.turn;
  return -1;
}
const vis = () => (guest() ? st : CE.view(st, viewer()));
// hot-seat: the next local player who still has to pick a card (behind a cover)
const picker = () => (st.phase === 'pick' ? locals().find((p) => !st.pick[p]) ?? -1 : -1);
const signed = (x) => (x > 0 ? '+' + x : x < 0 ? '−' + -x : '0');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const itemName = (v) => t('ce.item' + v.items[Math.min(v.round, v.rounds - 1)]);

// ---------- seats (player cards) ----------
let seatsN = 0;
function buildSeats(n) {
  seatsN = n;
  const a = Math.ceil(n / 2);
  const html = (p, flip) => `
    <div class="seat${flip ? ' flip' : ''}" data-p="${p}" style="color:${COLORS[p].main}">
      <div class="fig-wrap"><div class="bubble"></div><div class="fig"></div></div>
      <div class="who"><div class="nm"></div><div class="sc"></div></div>
    </div>`;
  const A = $('#seats-a'), B = $('#seats-b');
  A.innerHTML = [...Array(a).keys()].map((p) => html(p, false)).join('');
  B.innerHTML = [...Array(n - a).keys()].map((i) => html(a + i, true)).join('');
  A.classList.toggle('one', a === 1); B.classList.toggle('one', n - a === 1);
  const arena = $('#arena');
  arena.style.setProperty('--ca', a + 'fr');
  arena.style.setProperty('--cb', n - a + 'fr');
  arena.dataset.n = n;
}

function renderSeats(v) {
  if (seatsN !== v.n) buildSeats(v.n);
  for (let p = 0; p < v.n; p++) {
    const el = document.querySelector(`.seat[data-p="${p}"]`);
    const turn = v.phase === 'bid' && v.turn === p;
    el.classList.toggle('active', turn || (v.phase === 'pick' && !v.pick[p]));
    el.classList.toggle('out', v.phase === 'bid' && !v.active[p]);
    const m = moods[p] || { mood: 'neutral', pose: 'down' };
    const pose = m.pose !== 'down' ? m.pose : turn ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: el.classList.contains('flip') ? 'left' : 'right', seed: 11 + p * 31,
    });
    el.querySelector('.nm').textContent = name(p);
    el.querySelector('.sc').textContent = signed(v.scores[p]);
    el.title = name(p);
  }
}

const bubbleTimers = [];
function say(p, key, vars, delay = 0) {
  setTimeout(() => {
    const b = document.querySelector(`.seat[data-p="${p}"] .bubble`);
    if (!b) return;
    // On a phone the seats sit in one row, so bubbles would pile up: keep only the newest.
    if (innerWidth < 900) document.querySelectorAll('.seat .bubble.show').forEach((x) => x !== b && x.classList.remove('show'));
    b.textContent = t(key, vars);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 2100);
  }, delay);
}
const hush = () => document.querySelectorAll('.seat .bubble').forEach((b) => b.classList.remove('show'));
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const calm = (n) => (moods = Array.from({ length: n }, () => ({ mood: 'neutral', pose: 'down' })));

// ---------- board (SVG) ----------
const shape = (k, make) => (shapes[k] ??= make());
function fitText(s, maxW, size) {
  const w = [...s].length * size * 0.46;
  return w > maxW ? Math.max(11, Math.floor((size * maxW) / w)) : size;
}
function clip(s, maxW, size) {
  const max = Math.floor(maxW / (size * 0.47));
  const a = [...s];
  return a.length > max ? a.slice(0, Math.max(1, max - 1)).join('') + '…' : s;
}
const txt = (x, y, s, { size = 20, color = INK, weight = 700, anchor = 'middle', extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;

function layout(n, M) {
  const rowH = n <= 4 ? 31 : n <= 6 ? 27 : 24;
  const top = 128, head = 22;
  const x0 = 100, cw = Math.min(27, (W - x0 - 126) / M);
  const end = x0 + M * cw, colW = (W - 6 - end) / 3;
  return { rowH, top, head, x0, cw, cols: [end + colW / 2, end + colW * 1.5, end + colW * 2.5], H: top + head + n * rowH + 10 };
}

function renderBoard(v) {
  const L = layout(v.n, v.M);
  svg.setAttribute('viewBox', `0 0 ${W} ${L.H}`);
  const round = Math.min(v.round, v.rounds - 1);
  const res = v.phase === 'reveal' || v.phase === 'over' ? v.results[v.results.length - 1] : null;
  let o = '';

  // --- the lot ---
  o += `<path d="${shape('frame', () => circle(62, 62, 56, 54, 0.03))}" fill="#fffaf0" stroke="${PALETTE.pencil}" stroke-width="2.5"/>`;
  o += itemSVG(v.items[round], 14, 12, 96);
  if (res) {
    o += `<g transform="rotate(-14 62 66)"><rect x="12" y="50" width="100" height="32" rx="6" fill="rgba(255,255,255,.8)" stroke="${PALETTE.red.main}" stroke-width="3"/>` +
      txt(62, 74, t('ce.sold').toUpperCase(), { size: fitText(t('ce.sold'), 90, 24), color: PALETTE.red.main }) + '</g>';
  }
  o += txt(130, 24, `${t('ce.lot', { r: round + 1, n: v.rounds })} · ${t('ce.auctioneer', { name: name(v.auctioneer) })}`,
    { size: fitText(t('ce.lot', { r: 9, n: 9 }) + ' · ' + t('ce.auctioneer', { name: name(v.auctioneer) }), 264, 17), color: '#777', weight: 600, anchor: 'start' });
  const iname = cap(itemName(v));
  o += txt(130, 52, iname, { size: fitText(iname, 262, 26), anchor: 'start' });

  // price tag
  const tag = shape('tag', () => line(130, 68, 236, 66, 1) + ' ' + line(236, 66, 256, 88, 1) + ' ' + line(256, 88, 236, 110, 1) + ' ' + line(236, 110, 130, 110, 1) + ' ' + line(130, 110, 130, 68, 1));
  o += `<path d="M130 68 L236 66 L256 88 L236 110 L130 110 Z" fill="#fff6cf" filter="url(#mg-crayon)"/>`;
  o += `<path d="${tag}" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  o += `<circle cx="240" cy="88" r="4" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
  if (v.bidder >= 0) {
    o += txt(184, 101, String(v.bid), { size: 38, color: COLORS[v.bidder].main });
    if (res) {
      o += txt(266, 84, `${t('ce.value')} ${res.value}`, { size: fitText(`${t('ce.value')} ${res.value}`, 128, 22), anchor: 'start' });
      o += txt(266, 108, `${name(res.winner)} ${signed(res.profit)}`, { size: fitText(`${name(res.winner)} ${signed(res.profit)}`, 128, 21), color: res.profit < 0 ? PALETTE.red.dark : res.profit > 0 ? '#2a8a3f' : '#777', anchor: 'start' });
    } else {
      o += txt(266, 96, name(v.bidder), { size: fitText(name(v.bidder), 128, 22), color: COLORS[v.bidder].main, anchor: 'start' });
    }
  } else {
    o += txt(184, 96, v.phase === 'pick' ? '?' : '…', { size: 34, color: '#aaa' });
    o += txt(266, 96, t('ce.nobid'), { size: fitText(t('ce.nobid'), 128, 19), color: '#999', weight: 600, anchor: 'start' });
  }

  // --- ledger ---
  const y0 = L.top, yr = y0 + L.head;
  o += `<path d="${shape('box' + v.n + v.M, () => line(4, y0 - 4, W - 4, y0 - 3, 1.2) + ' ' + line(W - 4, y0 - 3, W - 5, L.H - 4, 1.2) + ' ' + line(W - 5, L.H - 4, 5, L.H - 5, 1.2) + ' ' + line(5, L.H - 5, 4, y0 - 4, 1.2))}" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  o += `<path d="${shape('hd' + v.n + v.M, () => line(8, yr - 2, W - 8, yr - 1, 1))}" stroke="${PALETTE.pencil}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const hs = { size: 15, color: '#888', weight: 600 };
  o += txt(L.x0 + (v.M * L.cw) / 2, y0 + 14, t('ce.col.cards'), hs);
  ['now', 'bid', 'score'].forEach((k, i) => (o += txt(L.cols[i], y0 + 14, t('ce.col.' + k), { ...hs, size: fitText(t('ce.col.' + k), L.cols[1] - L.cols[0] - 2, 15) })));

  for (let p = 0; p < v.n; p++) {
    const y = yr + p * L.rowH, cy = y + L.rowH / 2, col = COLORS[p];
    const isTurn = v.phase === 'bid' && v.turn === p, isBuyer = res && res.winner === p;
    if (isTurn || isBuyer) {
      o += `<path d="${shape('hl' + p + v.n, () => line(10, cy, W - 10, cy + 1, 1.5))}" stroke="${isTurn ? '#fff09a' : '#e3f6e6'}" stroke-width="${L.rowH - 4}" fill="none" stroke-linecap="round" opacity=".9"/>`;
    }
    if (p === v.auctioneer) o += gavel(18, cy, col.main);
    const nm = name(p), ns = L.rowH > 26 ? 20 : 18;
    o += txt(29, cy + 6, clip(nm, 68, ns), { size: ns, color: col.main, anchor: 'start' });
    // cards 1..M
    for (let c = 1; c <= v.M; c++) {
      const x = L.x0 + (c - 0.5) * L.cw, used = v.used[p].includes(c), now = v.pick[p] === c;
      o += txt(x, cy + 6, String(c), { size: L.rowH > 26 ? 20 : 18, color: used ? '#b5b5b5' : now ? INK : '#666', weight: now ? 700 : 600 });
      if (used) o += `<path d="${shape(`x${p}_${c}`, () => line(x - 7, cy - 7, x + 7, cy + 7, 1) + ' ' + line(x + 7, cy - 7, x - 7, cy + 7, 1))}" stroke="${col.main}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
      if (now) o += `<path d="${shape(`o${p}_${c}_${v.round}`, () => circle(x, cy, 10.5, 11.5, 0.08))}" stroke="${col.main}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    }
    // this round's secret card
    const cx = L.cols[0], ch = L.rowH - 7, cw2 = ch * 0.74;
    if (v.pick[p] !== 0) {
      const back = v.pick[p] < 0;
      o += `<rect x="${cx - cw2 / 2}" y="${cy - ch / 2}" width="${cw2}" height="${ch}" rx="3" fill="${back ? col.fill : '#fff'}" stroke="${back ? col.dark : col.main}" stroke-width="2" ${back ? 'filter="url(#mg-crayon)"' : ''}/>`;
      if (back) o += `<rect x="${cx - cw2 / 2}" y="${cy - ch / 2}" width="${cw2}" height="${ch}" rx="3" fill="none" stroke="${col.dark}" stroke-width="2"/>`;
      o += txt(cx, cy + 6, back ? '?' : String(v.pick[p]), { size: L.rowH > 26 ? 19 : 17, color: back ? col.dark : INK });
    } else if (v.phase === 'pick') {
      o += `<rect x="${cx - cw2 / 2}" y="${cy - ch / 2}" width="${cw2}" height="${ch}" rx="3" fill="none" stroke="#bbb" stroke-width="1.6" stroke-dasharray="3 3"/>`;
    }
    // bid (struck through once the player dropped out)
    if (v.phase !== 'pick') {
      const dropped = !v.active[p];
      if (v.bids[p]) {
        o += txt(L.cols[1], cy + 6, String(v.bids[p]), { size: 19, color: v.bidder === p ? col.main : '#999', weight: v.bidder === p ? 700 : 600 });
        if (dropped) o += `<path d="${shape('s' + p, () => line(L.cols[1] - 12, cy + 1, L.cols[1] + 12, cy - 1, 0.6))}" stroke="#999" stroke-width="2" fill="none"/>`;
      } else if (dropped) o += txt(L.cols[1], cy + 6, t('ce.out'), { size: 17, color: '#999', weight: 600 });
    }
    o += txt(L.cols[2], cy + 6, signed(v.scores[p]), { size: 20, color: v.scores[p] < 0 ? PALETTE.red.dark : col.main });
  }
  svg.innerHTML = o;
}

function gavel(x, y, color) {
  return `<g transform="translate(${x} ${y}) rotate(-35)" stroke="${color}" stroke-linecap="round" fill="none">
    <path d="M-1 -2 L-1 8" stroke-width="2.6"/><rect x="-7" y="-8" width="12" height="6" rx="1.5" fill="${color}" stroke-width="1.4"/></g>`;
}

// ---------- panel (HTML controls under the board) ----------
function cardsRow(v, p) {
  const used = v.used[p];
  let h = '<div class="cards">';
  for (let c = 1; c <= v.M; c++) {
    const u = used.includes(c);
    h += `<button class="ce-card" data-act="pick" data-c="${c}" ${u ? 'disabled' : ''} style="--c:${COLORS[p].main}">${c}</button>`;
  }
  return h + '</div>';
}
const worth = (v, p) => { const [lo, hi] = CE.range(v, p); return lo === hi ? `${t('ce.value')} ${lo}` : t('ce.worth', { lo, hi }); };

function renderPanel(v) {
  let h = '';
  const me = viewer();
  if (v.phase === 'pick') {
    const pk = picker();
    if (hotSeat() && pk >= 0) {
      if (uncovered !== pk) {
        h = `<div class="cover" style="--c:${COLORS[pk].main}"><div class="cover-t">${esc(t('ce.cover', { name: name(pk) }))}</div>
          <div class="cover-n">${esc(t('ce.cover.note'))}</div>
          <button class="btn primary" data-act="uncover" style="background:${COLORS[pk].main};border-color:${COLORS[pk].dark}">${esc(t('ce.cover.btn', { name: name(pk) }))}</button></div>`;
      } else {
        h = `<div class="ptitle" style="color:${COLORS[pk].main}">${esc(t('ce.pick.name', { name: name(pk) }))}</div>` + cardsRow(v, pk);
      }
    } else if (me >= 0 && !v.pick[me] && canAct(me)) {
      h = `<div class="ptitle">${esc(t('ce.pick.you'))}</div>` + cardsRow(v, me);
    } else {
      h = `<div class="pinfo">${esc(t('ce.wait.pick'))}</div>`;
      if (me >= 0 && v.pick[me] > 0) h += `<div class="pinfo mine">${esc(t('ce.mine', { c: v.pick[me] }))}</div>`;
    }
  } else if (v.phase === 'bid') {
    const p = v.turn;
    if (hotSeat() && canAct(p)) {
      const real = CE.view(st, p);
      h += `<button class="btn peek" data-peek style="--c:${COLORS[p].main}"><span class="peek-off">${EYE} ${esc(t('ce.peek'))}</span>` +
        `<span class="peek-on">${esc(t('ce.mine', { c: real.pick[p] }))} · ${esc(worth(real, p))}</span></button>`;
    } else if (me >= 0) {
      h += `<div class="pinfo mine"><b style="color:${COLORS[me].main}">${esc(t('ce.mine', { c: v.pick[me] }))}</b> · ${esc(worth(v, me))}</div>`;
    } else {
      h += `<div class="pinfo">${esc(cap(worth(v, -1)))}</div>`;
    }
    if (canAct(p)) {
      const min = CE.minBid(v), max = CE.maxBid(v);
      // The opener starts from the lot's public lower bound (never from their own card: others may be watching).
      if (draftSeq !== v.seq) { bidDraft = v.bidder < 0 ? Math.max(min, CE.range(CE.view(st, -1), -1)[0]) : min; draftSeq = v.seq; }
      bidDraft = Math.max(min, Math.min(max, bidDraft));
      h += `<div class="bidrow" style="--c:${COLORS[p].main}">
        <button class="step" data-act="minus" ${bidDraft <= min ? 'disabled' : ''} aria-label="−">−</button>
        <span class="bidval">${bidDraft}</span>
        <button class="step" data-act="plus" ${bidDraft >= max ? 'disabled' : ''} aria-label="+">+</button>
        <button class="btn primary bidbtn" data-act="bid" ${min > max ? 'disabled' : ''}>${esc(t('ce.bid', { n: bidDraft }))}</button>
        <button class="btn dropbtn" data-act="drop" ${v.bidder < 0 ? 'disabled' : ''} title="${v.bidder < 0 ? esc(t('ce.open')) : ''}">${esc(t('ce.drop'))}</button>
      </div>`;
    }
  } else {
    const r = v.results[v.results.length - 1];
    const cards = r.picks.map((c, q) => `<b style="color:${COLORS[q].main}">${c}</b>`).join(' + ');
    h += `<div class="pinfo">${t('ce.sum', { cards, v: r.value })}</div>`;
    h += `<div class="pinfo deal" style="color:${r.profit < 0 ? PALETTE.red.dark : r.profit > 0 ? '#2a8a3f' : '#666'}">${esc(t('ce.deal', { name: name(r.winner), v: r.value, p: r.price, d: signed(r.profit) }))}</div>`;
    if (v.phase === 'reveal' && ready()) h += `<button class="btn primary nextbtn" data-act="next">${esc(t('ce.next'))}</button>`;
  }
  panel.innerHTML = h;
}

function statusLine(v) {
  if (online() && !sess.connected) return [t('ce.online.wait'), INK];
  if (guest() && !synced) return [t('ce.online.wait'), INK];
  if (v.phase === 'pick') {
    const pk = picker();
    if (hotSeat() && pk >= 0 && uncovered === pk) return [t('ce.pick.name', { name: name(pk) }).replace(/:$/, ''), COLORS[pk].main];
    return [t('ce.st.pick'), INK];
  }
  if (v.phase === 'bid') {
    const p = v.turn, c = COLORS[p].main;
    if (kind(p) === 'ai') return [t('ce.st.thinking', { name: name(p) }), c];
    if (kind(p) === 'remote') return [t('ce.st.them', { name: name(p) }), c];
    if (online() || !hotSeat()) return [t(v.bidder < 0 ? 'ce.st.open' : 'ce.st.you', { name: name(p) }), c];
    return [t(v.bidder < 0 ? 'ce.st.open' : 'ce.st.turn', { name: name(p) }), c];
  }
  if (v.phase === 'reveal') {
    const r = v.results[v.results.length - 1];
    return [t('ce.st.sold', { name: name(r.winner), d: signed(r.profit) }), COLORS[r.winner].main];
  }
  return ['', INK];
}

function render() {
  const v = vis();
  renderSeats(v);
  renderBoard(v);
  renderPanel(v);
  const [s, c] = statusLine(v);
  const status = $('#status');
  status.textContent = s;
  status.style.color = c;

  $('#undo').disabled = online() || !history.length;
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('ce.online.waitnew', { name: name(0) });
  syncSettings();
}

// ---------- flow ----------
function pitch() {
  const it = itemName(st);
  say(st.auctioneer, 'say.pitch', { item: it, Item: cap(it) }, 250);
  setMood(st.auctioneer, 'happy', 'wave');
}

function newGame() {
  clearTimeout(aiTimer);
  const n = cfg.players;
  gameCpu = cfg.cpu; gameLevel = cfg.level;
  st = CE.create({ n, rounds: cfg.rounds, first: Math.floor(Math.random() * n) });
  gid = Math.floor(Math.random() * 1e9);
  history = []; shapes = {}; uncovered = -1; peeking = false; resultShown = false;
  calm(n); hush();
  $('#result').hidden = true;
  pitch();
  render();
  if (online() && sess.host) sendState();
  maybeAI();
}

function act(a) {
  if (!CE.legal(st, a)) return false;
  if (!online() && (a.t === 'next' || kind(a.p) === 'local')) history.push(CE.clone(st));
  CE.apply(st, a);
  if (a.t === 'pick' && a.p === uncovered) uncovered = -1;
  if (a.t !== 'pick' || st.phase !== 'pick') peeking = false;
  react(st.ev);
  render();
  if (online() && sess.host) sendState();
  if (st.phase === 'over') finish();
  maybeAI();
  return true;
}

// A local player's action: guests ask the host, everyone else applies it directly.
function localAct(a) {
  if (!CE.legal(st, a)) return;
  if (guest()) { sess.send('move', { a, n: st.seq }); return; }
  act(a);
}

function maybeAI() {
  clearTimeout(aiTimer);
  if (guest() || (online() && !sess.connected)) return;
  if (st.phase === 'pick') {
    for (let p = 0; p < st.n; p++) {
      if (kind(p) === 'ai' && !st.pick[p] && st.phase === 'pick') { act(CE.aiAction(CE.view(st, p), p, level())); return; }
    }
    return;
  }
  if (st.phase === 'bid' && kind(st.turn) === 'ai') {
    const p = st.turn;
    aiTimer = setTimeout(() => {
      if (st.phase !== 'bid' || st.turn !== p) return;
      act(CE.aiAction(CE.view(st, p), p, level()));
    }, 650 + Math.random() * 500);
  }
}

function react(evs) {
  for (const e of evs || []) {
    if (e.t === 'round') { calm(st.n); pitch(); }
    else if (e.t === 'bidstart') { for (let p = 0; p < st.n; p++) if (moods[p].pose === 'wave') setMood(p, 'neutral'); }
    else if (e.t === 'bid') {
      for (let p = 0; p < st.n; p++) if (p !== e.p && moods[p].mood === 'happy') setMood(p, 'neutral');
      setMood(e.p, Math.random() < 0.5 ? 'smug' : 'happy', 'point');
      say(e.p, e.open ? 'say.open' : 'say.bid', { n: e.amount });
    } else if (e.t === 'drop') {
      setMood(e.p, 'worried');
      say(e.p, 'say.drop', { c: e.card });
    } else if (e.t === 'sold') {
      for (let p = 0; p < st.n; p++) setMood(p, 'neutral');
      const others = [...Array(st.n).keys()].filter((p) => p !== e.p);
      const o = others[Math.floor(Math.random() * others.length)];
      if (e.profit > 0) {
        setMood(e.p, 'happy', 'up'); say(e.p, 'say.profit', null, 300);
        others.forEach((p) => setMood(p, 'sad'));
        if (e.profit >= 3) say(o, 'say.envy', null, 1300);
      } else if (e.profit < 0) {
        setMood(e.p, 'sad'); say(e.p, 'say.curse', null, 300);
        others.forEach((p) => setMood(p, 'smug'));
        say(o, 'say.gloat', null, 1300);
      } else { setMood(e.p, 'worried'); say(e.p, 'say.even', null, 300); }
    } else if (e.t === 'over') {
      const w = CE.winners(st);
      for (let p = 0; p < st.n; p++) setMood(p, w.includes(p) ? 'happy' : 'sad', w.includes(p) ? 'up' : 'down');
      w.forEach((p, i) => say(p, 'say.win', null, 2400 + i * 300));
      const losers = [...Array(st.n).keys()].filter((p) => !w.includes(p));
      if (losers.length) say(losers[Math.floor(Math.random() * losers.length)], 'say.lose', null, 3300);
    }
  }
}

function finish() {
  if (resultShown) return;
  resultShown = true;
  const w = CE.winners(st);
  const txtEl = $('#result-text');
  if (w.length === 1) { txtEl.textContent = t('ce.win', { name: name(w[0]) }); txtEl.style.color = COLORS[w[0]].main; }
  else { txtEl.textContent = t('ce.tie', { names: w.map(name).join(', ') }); txtEl.style.color = INK; }
  const order = [...Array(st.n).keys()].sort((a, b) => st.scores[b] - st.scores[a]);
  $('#result-list').innerHTML = order.map((p) => `<span style="color:${COLORS[p].main}">${esc(name(p))} ${signed(st.scores[p])}</span>`).join(' · ');
  setTimeout(() => { if (resultShown && st.phase === 'over') $('#result').hidden = false; }, 2200);
}

function undo() {
  if (online() || !history.length) return;
  clearTimeout(aiTimer);
  st = history.pop();
  // The computers re-choose their hidden cards: the old ones may have been revealed after this point.
  if (st.phase === 'pick' || st.phase === 'bid') {
    for (let p = 0; p < st.n; p++) if (kind(p) === 'ai' && st.pick[p] > 0 && !st.revealed[p]) {
      const a = CE.avail(st, p);
      st.pick[p] = a[Math.floor(Math.random() * a.length)];
    }
  }
  uncovered = -1; peeking = false; resultShown = false; draftSeq = -1;
  calm(st.n); hush();
  $('#result').hidden = true;
  render();
  maybeAI();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
}

// ---------- online ----------
// Host is authoritative and keeps every secret: the guest only ever receives CE.view(st, 1).
function sendState() {
  if (!sess?.connected) return;
  sess.send('state', { st: CE.view(st, 1), gid, names: [cfg.names[0]], level: cfg.level });
}
function onSession(s) {
  sess = s;
  synced = false;
  clearTimeout(aiTimer);
  s.on('status', () => { render(); if (s.host) maybeAI(); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
    else s.send('resync');
  });
  s.on('state', (d) => {
    if (s.host) return;
    const fresh = d.gid !== gid || !synced;
    const newer = d.st.seq > st.seq;
    st = d.st; gid = d.gid; synced = true;
    remoteNames[0] = d.names?.[0] || '';
    hostLevel = d.level || 'normal';
    if (fresh) {
      history = []; shapes = {}; resultShown = false; calm(st.n); hush(); draftSeq = -1;
      fillSelects();
      $('#result').hidden = true;
      if (st.phase === 'pick' && st.round === 0 && !st.pick.some((c) => c)) pitch();
    } else if (newer) react(st.ev);
    render();
    if (st.phase === 'over') finish();
  });
  s.on('name', (d) => { if (d.seat === 0 || d.seat === 1) remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (!s.host) return;
    const a = d?.a;
    if (d.n !== st.seq || !a || (a.t !== 'next' && a.p !== 1) || !CE.legal(st, a)) return sendState();
    act(a);
  });
  s.on('resync', () => s.host && sendState());
  fillSelects(); renderNames();
  if (s.host) newGame();
  else render();
}

// ---------- settings ----------
function fillSelects() {
  // Online the sheet shows the game being played (a guest's own saved settings don't apply).
  const g = guest() && synced, players = g ? st.n : cfg.players;
  const cpu = $('#cpu');
  cpu.innerHTML = [...Array(players).keys()].map((k) => `<option value="${k}">${k}</option>`).join('');
  cpu.value = online() ? Math.max(0, players - 2) : cfg.cpu;
  $('#rounds').innerHTML = [3, 4, 5, 6, 7].map((n) => `<option value="${n}">${esc(t('ce.rounds.opt', { n, m: n + 1 }))}</option>`).join('');
  $('#rounds').value = g ? st.rounds : cfg.rounds;
  $('#players').value = players;
  $('#level').value = g ? hostLevel : cfg.level;
}
function syncSettings() {
  const host = canRestart();
  $('#players').disabled = !host;
  $('#rounds').disabled = !host;
  $('#level').disabled = !host;
  $('#cpu').disabled = online();
  const cpus = online() ? $('#players').value - 2 : cfg.cpu;
  $('#level-field').hidden = cpus <= 0;
  $('#settings-note').textContent = online() ? t('ce.online.note') : '';
}
function renderNames() {
  const seats = online() ? [sess.seat] : [...Array(cfg.players - cfg.cpu).keys()];
  $('#names').innerHTML = seats.map((p) =>
    `<input type="text" class="nm-in" data-p="${p}" maxlength="14" spellcheck="false" placeholder="${esc(t('ce.p' + p))}" value="${esc(cfg.names[p])}" style="color:${COLORS[p].main}">`).join('');
}
function settingsChanged() {
  fixCfg(); saveCfg(); fillSelects(); renderNames();
  if (canRestart()) newGame();
}

$('#players').addEventListener('change', (e) => {
  const old = cfg.players;
  cfg.players = +e.target.value;
  if (cfg.cpu === old - 1 || cfg.cpu > cfg.players - 1) cfg.cpu = cfg.players - 1; // "me vs computers" stays that way
  settingsChanged();
});
$('#cpu').addEventListener('change', (e) => { cfg.cpu = +e.target.value; settingsChanged(); });
$('#level').addEventListener('change', (e) => { cfg.level = e.target.value; saveCfg(); if (canRestart()) newGame(); });
$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; settingsChanged(); });
$('#names').addEventListener('input', (e) => {
  const inp = e.target.closest('.nm-in');
  if (!inp) return;
  const p = +inp.dataset.p;
  cfg.names[p] = inp.value;
  saveCfg();
  if (online()) sess.send('name', { seat: p, name: inp.value });
  render();
});
document.querySelector('[data-sheet=settings]').addEventListener('click', renderNames);

// ---------- input ----------
panel.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const v = vis();
  switch (b.dataset.act) {
    case 'uncover': uncovered = picker(); render(); break;
    case 'pick': {
      const p = hotSeat() ? picker() : viewer();
      if (canAct(p)) localAct({ t: 'pick', p, card: +b.dataset.c });
      break;
    }
    case 'minus': bidDraft--; render(); break;
    case 'plus': bidDraft++; render(); break;
    case 'bid': if (canAct(v.turn)) localAct({ t: 'bid', p: v.turn, amount: bidDraft }); break;
    case 'drop': if (canAct(v.turn)) localAct({ t: 'drop', p: v.turn }); break;
    case 'next': localAct({ t: 'next' }); break;
  }
});
// Hold-to-peek: only the board is redrawn so the pressed button stays in place.
function setPeek(on) {
  if (peeking === on) return;
  peeking = on;
  panel.classList.toggle('peeking', on);
  renderBoard(vis());
}
panel.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-peek]')) { e.preventDefault(); setPeek(true); } });
for (const ev of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(ev, () => setPeek(false));
panel.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-peek]')) e.preventDefault(); });

$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.addEventListener('mg:lang', () => { fillSelects(); renderNames(); render(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
fillSelects();
renderNames();
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; synced = false; fillSelects(); renderNames(); newGame(); },
});
if (!online()) showOnce('how', SLUG);
