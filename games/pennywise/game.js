import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, curve, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { PW } from './engine.js';
import './strings.js';

const SLUG = 'pennywise';
const COLORS = [
  PALETTE.blue, PALETTE.red,
  { main: 'var(--pw-green)', text: 'var(--pw-green-text)', fill: 'var(--pw-green-fill)', dark: 'var(--pw-green-face)' },
  { main: 'var(--pw-orange)', text: 'var(--pw-orange-text)', fill: 'var(--pw-orange-fill)', dark: 'var(--pw-orange-face)' },
  { main: 'var(--pw-violet)', text: 'var(--pw-violet-text)', fill: 'var(--pw-violet-fill)', dark: 'var(--pw-violet-face)' },
  { main: 'var(--pw-pink)', text: 'var(--pw-pink-text)', fill: 'var(--pw-pink-fill)', dark: 'var(--pw-pink-face)' },
];
const COPPER = { fill: 'var(--pw-copper)', edge: 'var(--pw-copper-edge)', text: 'var(--pw-copper-text)' };
const SILVER = { fill: 'var(--pw-silver)', edge: 'var(--pw-silver-edge)', text: 'var(--pw-silver-text)' };
const W = 360;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const DEF = { players: 2, mode: 'pvp', coins: 'classic', rule: 'classic', names: ['', '', '', '', '', ''] };
const cfg = Object.assign({}, DEF, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!PW.COINAGES[cfg.coins]) cfg.coins = 'classic';
if (!PW.RULES.includes(cfg.rule)) cfg.rule = 'classic';
if (!['pvp', 'easy', 'normal', 'hard'].includes(cfg.mode)) cfg.mode = 'pvp';
cfg.players = Math.min(6, Math.max(2, +cfg.players || 2));
while (cfg.names.length < 6) cfg.names.push('');
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, over, pend = null, fresh = null, shapes = {};
let gameFirst = 0, nextFirst = 0, aiTimer, aiReq = 0, smugSaid = false, lowSaid = {};
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', '', '', '', '', ''];
const moods = Array.from({ length: 6 }, () => ({ mood: 'neutral', pose: 'down' }));
// Online bookkeeping. Host: when each guest seat lost its device. Guest: the host's view of the seats.
const GONE_DELAY = 12000;           // a disconnected player's seat is taken over by the computer after this
const goneAt = {};
let netN = 2, netKinds = [], netSynced = false, fullRoom = false;

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => (sess.host ? 0 : netMe ?? 99);   // 99: a guest without a seat in this game (watching)
const nPlayers = () => (online() && !sess.host ? netN : cfg.players);
// What sits in seat p: offline 'local' | 'cpu'; online 'me' | 'human' | 'cpu' (no device yet) |
// 'gone' (device dropped, waiting a little) | 'away' (dropped, computer plays for it) | 'wait' (2 players: just wait).
function kind(p) {
  if (!online()) return cfg.mode !== 'pvp' && p !== 0 ? 'cpu' : 'local';
  if (p === mySeat()) return 'me';
  if (!sess.host) return netKinds[p] || 'human';
  if (bind[p] != null) return 'human';
  if (st.n === 2) return 'wait';
  if (goneAt[p] == null) return 'cpu';
  return Date.now() - goneAt[p] < GONE_DELAY ? 'gone' : 'away';
}
const isCPU = (p) => { const k = kind(p); return k === 'cpu' || k === 'away'; };
const isAI = (p) => isCPU(p) && (!online() || sess.host);    // only the host runs the computer's moves
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isCPU(p) && !isRemote(p);
const soloHuman = () => online() || cfg.mode !== 'pvp';   // one human on this device: say "you"
// With 3+ seats the host plays at once (empty seats are the computer); with 2 it waits for the guest.
const netReady = () => !online() || (sess.host ? st.n > 2 || bind[1] != null : sess.connected && netSynced);
const canMove = () => !over && isLocal(st.turn) && netReady();
// A guest's own name online is kept apart from the hot-seat name slots (its seat may differ between rooms).
const isGuest = () => online() && !sess.host;
const ownName = () => String(cfg.netName ?? cfg.names[0] ?? '');
const localName = (p) => (isGuest() && p === mySeat() ? ownName() : cfg.names[p]);
function name(p) {
  if (kind(p) === 'cpu') return st.n === 2 ? t('pw.cpu') : t('pw.bot', { n: p });
  const n = isRemote(p) ? remoteNames[p] : localName(p);
  return (n && n.trim()) || t('pw.p' + p);
}
const initial = (p) => (kind(p) === 'cpu' && st.n > 2 ? String(p) : [...name(p).trim()][0]?.toUpperCase() || '?');
const sum = (a) => a.reduce((x, y) => x + y, 0);
const bottomSeat = () => (online() && mySeat() < st.n ? mySeat() : 0);

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const metal = (i) => (st.denoms[i] < 5 ? COPPER : SILVER);
function coinR(i, scale) {
  const k = st.denoms.length;
  return (11.5 + 8.5 * (k > 1 ? i / (k - 1) : 1)) * scale;
}
function coin(key, x, y, i, r, cls = '') {
  const m = metal(i), v = st.denoms[i];
  const d = shapeFor('c' + key + '_' + r.toFixed(1), () => circle(0, 0, r, r, 0.035));
  const fs = (v >= 10 ? 1.08 : 1.32) * r;
  // The pop animation sits on an inner group: a CSS transform would override the outer translate attribute.
  return `<g class="coin" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="${cls}">` +
    `<path d="${d}" fill="${m.fill}" filter="url(#mg-crayon)"/>` +
    `<path d="${d}" class="rim" stroke="${m.edge}"/>` +
    `<circle r="${(r * 0.74).toFixed(1)}" class="ring" stroke="${m.edge}"/>` +
    `<text class="cv" y="1" font-size="${fs.toFixed(1)}" fill="${m.text}">${v}</text></g></g>`;
}
// Sketchy rounded box (cached per key).
function box(key, x, y, w, h) {
  return shapeFor('b' + key + `_${x}_${y}_${w}_${h}`, () => {
    const j = () => (Math.random() * 2 - 1) * 1.6, c = Math.min(14, h / 3);
    const pts = [
      [x + c, y + j()], [x + w / 2, y + j()], [x + w - c, y + j()], [x + w + j(), y + c], [x + w + j(), y + h - c],
      [x + w - c, y + h + j()], [x + w / 2, y + h + j()], [x + c, y + h + j()], [x + j(), y + h - c], [x + j(), y + c],
    ];
    return curve([...pts, pts[0], pts[1]]);
  });
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- layout ----------
function layout() {
  const many = st.n > 2, rowH = many ? 46 : 60, L = { rows: [], rowH, many };
  let y = 4;
  const bottom = bottomSeat();
  if (!many) { L.rows[1 - bottom] = y; y += rowH + 6; }
  L.table = { y, h: many ? 112 : 130 }; y += L.table.h + 4;
  L.tray = { y, h: 58 }; y += L.tray.h + 4;
  if (!many) { L.rows[bottom] = y; y += rowH; }
  else for (let p = 0; p < st.n; p++) { L.rows[p] = y; y += rowH + (p < st.n - 1 ? 4 : 0); }
  L.H = y + 4;
  return L;
}

// Coins shown in a purse / on the table, taking the move being composed into account.
function shownHand(p) {
  const h = st.hands[p].slice();
  if (pend && p === st.turn) h[pend.give]--;
  return h;
}
function shownPot() {
  const pot = st.pot.slice();
  if (pend) pend.take.forEach((c, j) => (pot[j] -= c));
  return pot;
}

function pile(key, cx, cy, i, r, count, max, dy) {
  if (!count) return `<path d="${shapeFor('g' + key, () => circle(cx, cy, r, r, 0.03))}" class="ghost"/>`;
  let s = '';
  const m = Math.min(count, max);
  for (let j = 0; j < m; j++) {
    const top = j === m - 1;
    s += coin(key + '_' + j, cx + (j % 2 ? 1.5 : -1.5) * (j ? 1 : 0), cy - j * dy, i, r, top && fresh?.slot === key ? 'fresh' : '');
  }
  if (count > 1) s += `<text class="cnt" x="${(cx + r + 3).toFixed(1)}" y="${(cy + r * 0.55).toFixed(1)}">×${count}</text>`;
  return s;
}

// ---------- rendering ----------
function render() {
  const L = layout();
  svg.setAttribute('viewBox', `0 0 ${W} ${L.H}`);
  svg.style.setProperty('--board-h', L.H);
  const k = st.denoms.length, me = st.turn, myMove = canMove();
  let out = '';

  // table
  const T = L.table, pot = shownPot();
  out += `<path d="${box('table', 6, T.y, W - 12, T.h)}" class="table" filter="url(#mg-crayon)"/>`;
  out += `<path d="${box('table', 6, T.y, W - 12, T.h)}" class="table-rim"/>`;
  out += `<text class="tlabel" x="18" y="${T.y + 20}">${esc(t('pw.table'))}</text>`;
  if (!sum(pot)) out += `<text class="empty" x="${W / 2}" y="${T.y + T.h / 2 + 4}">${esc(t('pw.empty'))}</text>`;
  else {
    const sw = (W - 40) / k;
    for (let i = 0; i < k; i++) {
      const r = coinR(i, L.many ? 0.95 : 1.05), cx = 22 + sw * i + sw * 0.4, cy = T.y + T.h * 0.62;
      const live = myMove && pend && PW.canAdd(st, pend.give, pend.take, i);
      out += `<g class="slot${live ? ' live' : ''}" ${live ? `data-act="add" data-i="${i}"` : ''}>`;
      out += `<rect class="hit" x="${(22 + sw * i - 6).toFixed(1)}" y="${T.y + 4}" width="${sw.toFixed(1)}" height="${T.h - 8}"/>`;
      if (live) out += `<ellipse class="glow" cx="${cx}" cy="${cy}" rx="${r + 7}" ry="${r + 7}" stroke="${COLORS[me].main}"/>`;
      if (pot[i]) out += pile('pot' + i, cx, cy, i, r, pot[i], 5, 4.5);
      out += `</g>`;
    }
  }

  out += renderTray(L);

  // purses
  for (let p = 0; p < st.n; p++) {
    const y = L.rows[p], h = L.rowH, col = COLORS[p], cur = !over && p === me, alive = st.alive[p];
    out += `<g class="purse${cur ? ' cur' : ''}${alive ? '' : ' out'}">`;
    out += `<path d="${box('row' + p, 6, y, W - 12, h)}" class="row" fill="${col.fill}" stroke="${col.main}"/>`;
    const x0 = L.many ? 42 : 12;
    if (L.many) {
      out += `<path d="${shapeFor('ini' + p, () => circle(24, y + h / 2, 14, 14, 0.05))}" fill="${col.main}" class="ini"/>`;
      out += `<text class="initial" x="24" y="${y + h / 2 + 1}">${esc(initial(p))}</text>`;
    }
    if (!alive) { out += `<text class="brokeT" x="${(x0 + W) / 2}" y="${y + h / 2 + 2}" fill="${col.text}">${esc(t('pw.broke'))}</text></g>`; continue; }
    const hand = shownHand(p), sw = (W - 12 - x0) / k, liveRow = cur && myMove;
    for (let i = 0; i < k; i++) {
      const r = coinR(i, L.many ? 0.72 : 0.9), cx = x0 + sw * i + Math.max(r + 4, sw * 0.36), cy = y + h / 2 + (L.many ? 3 : 4);
      const live = liveRow && st.hands[p][i] > 0, chosen = pend && cur && pend.give === i;
      out += `<g class="slot${live ? ' live' : ''}${chosen ? ' chosen' : ''}" ${live ? `data-act="give" data-i="${i}"` : ''}>`;
      out += `<rect class="hit" x="${(x0 + sw * i).toFixed(1)}" y="${y}" width="${sw.toFixed(1)}" height="${h}"/>`;
      if (live && !pend) out += `<ellipse class="glow" cx="${cx}" cy="${cy - 2}" rx="${r + 6}" ry="${r + 7}" stroke="${col.main}"/>`;
      out += pile(`h${p}_${i}`, cx, cy, i, r, hand[i], 3, 4) + '</g>';
    }
    out += `</g>`;
  }

  svg.innerHTML = out;
  fresh = null;
  renderPlayers();
  persist();
}

function renderTray(L) {
  const T = L.tray, y = T.y, cy = y + 38;
  let s = `<g class="tray">`;
  const changeRow = (give, take, xEnd, act, who) => {
    let o = '';
    const r0 = coinR(give, 0.8);
    o += `<g class="given${act ? ' live' : ''}" ${act ? 'data-act="cancel"' : ''}>`;
    o += `<path d="${shapeFor('gring', () => circle(24, cy, r0 + 5, r0 + 5, 0.05))}" class="gring" stroke="${COLORS[who].main}"/>`;
    o += coin('tg', 24, cy, give, r0, fresh?.tray ? 'fresh' : '') + `</g>`;
    o += `<path d="${shapeFor('arrow', () => line(50, cy, 70, cy, 1) + ' ' + line(63, cy - 6, 71, cy, 0.6) + ' ' + line(63, cy + 6, 71, cy, 0.6))}" class="arrow"/>`;
    const list = [];
    for (let j = take.length - 1; j >= 0; j--) for (let c = 0; c < take[j]; c++) list.push(j);
    if (!list.length) o += `<text class="none" x="${80}" y="${cy + 6}">${esc(t('pw.tray.none'))}</text>`;
    else {
      const avail = xEnd - 82;
      const rs = list.map((j) => coinR(j, 0.72));
      const need = rs.reduce((a, r) => a + 2 * r + 3, 0);
      const squeeze = Math.min(1, avail / need);
      let x = 82;
      list.forEach((j, n) => {
        const r = rs[n];
        x += r * squeeze;
        o += `<g class="${act ? 'live' : ''}" ${act ? `data-act="remove" data-i="${j}"` : ''}>${coin('tc' + n, x, cy, j, r, fresh?.tray ? 'fresh' : '')}</g>`;
        x += (r + 3) * squeeze;
      });
    }
    return o;
  };

  if (pend && !over) {
    const got = PW.value(st, pend.take), lim = PW.limit(st, pend.give);
    const cap = pend.give === 0 ? t('pw.tray.small', { v: st.denoms[0] })
      : lim === Infinity ? t('pw.tray.more', { got }) : t('pw.tray.lim', { got, lim });
    s += `<text class="cap" x="12" y="${y + 13}" fill="${COLORS[st.turn].text}">${esc(cap)}</text>`;
    s += changeRow(pend.give, pend.take, 262, true, st.turn);
    s += `<g class="okbtn" data-act="ok"><path d="${box('ok', 272, cy - 19, 80, 38)}" fill="${COLORS[st.turn].main}" stroke="${COLORS[st.turn].text}"/>`;
    s += `<text x="312" y="${cy + 1}">${esc(t('pw.ok'))}</text></g>`;
  } else if (st.last) {
    const { p, give, take } = st.last;
    s += `<text class="cap" x="12" y="${y + 13}" fill="${COLORS[p].text}">${esc(t('pw.last', { name: name(p), give: st.denoms[give], got: PW.value(st, take) }))}</text>`;
    s += changeRow(give, take, W - 10, false, p);
  } else {
    s += `<text class="hint" x="${W / 2}" y="${cy}">${esc(t(canMove() ? 'pw.tray.hint' : 'pw.tray.start'))}</text>`;
  }
  return s + `</g>`;
}

function renderPlayers() {
  for (let p = 0; p < st.n; p++) {
    const el = document.querySelector(`.player[data-p="${p}"]`);
    if (!el) continue;
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    el.classList.toggle('out', !st.alive[p]);
    const k = kind(p);
    el.classList.toggle('me', k === 'me');
    el.classList.toggle('gone', k === 'gone' || k === 'away' || k === 'wait');
    const tag = k === 'me' ? t('net.you') : k === 'gone' || k === 'wait' ? t('pw.net.off') : k === 'away' ? t('pw.net.away') : '';
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    const face = st.n === 2 ? (el.closest('.side-l') ? 'right' : 'left') : 'right';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face, seed: 11 + p * 31 });
    el.querySelector('.score').innerHTML = (tag ? `<span class="tag">${esc(tag)}</span> ` : '') + (st.alive[p]
      ? `<span class="cents">${PW.cents(st, p)}¢</span><span class="sep"> · </span><span class="cn">${plural(PW.coins(st, p), 'pw.coinsN')}</span>`
      : esc(t('pw.broke')));
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? localName(p) : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status'), me = st.turn;
  if (over) status.textContent = '';
  else if (online() && !netReady()) status.textContent = t(sess.host ? 'pw.online.wait' : sess.connected || !netSynced ? 'pw.net.joining' : 'pw.net.nohost');
  else if (online() && mySeat() >= st.n) status.textContent = t('pw.net.watch');
  else if (kind(me) === 'gone') status.textContent = t('pw.net.gone', { name: name(me) });
  else if (isCPU(me)) status.textContent = t('pw.thinking', { name: name(me) });
  else if (isRemote(me)) status.textContent = t('pw.them', { name: name(me) });
  else if (soloHuman()) status.textContent = t(pend ? 'pw.change.you' : 'pw.pick.you');
  else status.textContent = t(pend ? 'pw.change' : 'pw.pick', { name: name(me) });
  status.style.color = COLORS[me].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#players').disabled = !canRestart();
  $('#coins').disabled = !canRestart();
  $('#rule').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('pw.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('pw.online.note') : cfg.mode !== 'pvp' && cfg.players > 2 ? t('pw.vsnote') : '';
  const purse = PW.COINAGES[cfg.coins];
  $('#purse-note').textContent = t('pw.purse', { list: purse.join(' · '), sum: sum(purse) });
}

function buildCards() {
  const n = st.n, L = $('.side-l'), R = $('.side-r');
  $('#arena').classList.toggle('many', n > 2);
  L.innerHTML = R.innerHTML = '';
  for (let p = 0; p < n; p++) {
    const html = `<div class="player" data-p="${p}" style="order:${p}">
      <div class="fig-wrap"><div class="bubble" style="color:${COLORS[p].main}"></div><div class="fig"></div></div>
      <input type="text" class="name" maxlength="14" spellcheck="false">
      <div class="score"></div></div>`;
    (p % 2 ? R : L).insertAdjacentHTML('beforeend', html);
  }
  document.querySelectorAll('.player .name').forEach((inp) =>
    inp.addEventListener('input', () => {
      const p = +inp.closest('.player').dataset.p;
      if (isGuest()) cfg.netName = inp.value;
      else cfg.names[p] = inp.value;
      saveCfg();
      if (online()) sess.send('name', { seat: p, name: inp.value });
      render();
    }));
}

const bubbleTimers = [];
function say(p, key, delay = 0) {
  setTimeout(() => {
    const b = document.querySelector(`.player[data-p="${p}"] .bubble`);
    if (!b) return;
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  }, delay);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function cancelAI() { clearTimeout(aiTimer); aiReq++; }

function newGame(first = nextFirst) {
  cancelAI();
  const n = nPlayers();
  gameFirst = first % n;
  st = PW.create({ coins: cfg.coins, rule: cfg.rule, n, first: gameFirst });
  history = []; over = false; pend = null; fresh = null; shapes = {}; smugSaid = false; lowSaid = {};
  moods.forEach((_, p) => setMood(p, 'neutral'));
  $('#result').hidden = true;
  buildCards();
  render();
  maybeAI();
}

// from: the seat whose device made the move (host relays every applied move to everyone else).
function play(m, from = -1) {
  if (online() && sess.host) relayMove(m, from);
  history.push(PW.clone(st));
  const who = st.turn, before = PW.clone(st);
  const info = PW.apply(st, m);
  pend = null;
  fresh = { slot: 'pot' + m.give, tray: true };
  react(before, m, info, who);
  if (PW.isOver(st)) return finish();
  render();
  maybeAI();
}

function react(before, m, info, who) {
  for (let q = 0; q < st.n; q++) if (q !== who && moods[q].mood !== 'smug' && st.alive[q]) setMood(q, 'neutral');
  const v = before.denoms[m.give], got = PW.value(before, m.take), nTaken = sum(m.take);
  if (got > 0 && (got >= 4 || nTaken >= 3)) {
    setMood(who, 'happy', 'wave');
    if (Math.random() < 0.6) say(who, 'pw.say.big');
    // Whoever dropped those small coins on the table watches them go.
    const victim = before.last?.p;
    if (m.take[0] >= 2 && victim != null && victim !== who && st.alive[victim]) { setMood(victim, 'worried'); if (Math.random() < 0.5) say(victim, 'pw.say.robbed', 700); }
  } else if (v >= 5 && got === 0) {
    setMood(who, 'sad');
    if (Math.random() < 0.7) say(who, 'pw.say.nochange');
  } else {
    setMood(who, 'neutral');
    if (v === 1 && Math.random() < 0.2) say(who, 'pw.say.penny');
  }
  if (info.broke && !PW.isOver(st)) { setMood(who, 'sad'); say(who, 'pw.say.broke'); }
  else if (st.alive[who] && PW.coins(st, who) <= 2 && !lowSaid[who] && !PW.isOver(st)) {
    lowSaid[who] = true;
    setMood(who, 'worried');
    say(who, 'pw.say.low', 500);
  }
}

// ---------- computer ----------
let worker;
const waiting = new Map();
let wid = 0;
function think(s, level) {
  if (worker === undefined) {
    try {
      worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => { const w = waiting.get(e.data.id); waiting.delete(e.data.id); w?.res(e.data); };
      worker.onerror = () => {
        worker = null;
        for (const [id, w] of waiting) { waiting.delete(id); w.res({ move: PW.aiMove(w.s, w.level), sure: false }); }
      };
    } catch { worker = null; }
  }
  if (!worker) return Promise.resolve({ move: PW.aiMove(s, level), sure: false });
  return new Promise((res) => { const id = ++wid; waiting.set(id, { res, s, level }); worker.postMessage({ id, st: s, level }); });
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  const id = ++aiReq, t0 = performance.now(), who = st.turn;
  // Online the mode menu is off; computer seats in a room play the normal level unless one was picked before.
  const level = cfg.mode !== 'pvp' ? cfg.mode : 'normal';
  think(PW.clone(st), level).then(({ move, sure }) => {
    if (id !== aiReq || over || st.turn !== who) return;
    const wait = Math.max(0, (st.n > 2 ? 650 : 800) - (performance.now() - t0));
    aiTimer = setTimeout(() => {
      if (id !== aiReq || !isAI(st.turn) || !PW.legal(st, move)) return;
      play(move);
      if (sure && !smugSaid && !over) { smugSaid = true; setMood(who, 'smug'); say(who, 'pw.say.smug', 400); renderPlayers(); }
    }, wait);
  });
}

function finish() {
  over = true;
  pend = null;
  const w = PW.winner(st), loser = st.last.p;
  nextFirst = (gameFirst + 1) % st.n;
  for (let p = 0; p < st.n; p++) if (p !== w) setMood(p, 'sad');
  setMood(w, 'happy', 'up');
  say(w, 'pw.say.win');
  say(loser, 'pw.say.lose', 900);
  render();
  const txt = $('#result-text');
  txt.textContent = t('pw.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-sub').innerHTML = esc(t('pw.left', { cents: PW.cents(st, w) })) + '<br>' + esc(t('pw.next', { name: name(nextFirst) }));
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1000);
}

function undo() {
  if (!history.length || online()) return;
  cancelAI();
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; pend = null; fresh = null;
  moods.forEach((_, p) => setMood(p, 'neutral'));
  $('#result').hidden = true;
  render();
  maybeAI();
}

// Online, only the room creator may restart or change the purse; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  if (online()) sess.setMaxPlayers(cfg.players);
  newGame();
  if (!online()) return;
  // Fewer seats now: those devices watch. More seats: devices that were watching sit down.
  for (const p in bind) if (+p >= st.n) delete bind[p];
  for (const k of sess.seats()) if (k > 0 && playerAt(k) < 0) claim(k, cids[k]);
  render();
  for (const k of sess.seats()) if (k > 0) sess.send('new', { coins: cfg.coins, rule: cfg.rule, first: gameFirst, n: st.n, you: playerAt(k), ...seatInfo() }, { to: k });
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
// Every purse is public in this game (as on a real table), so all devices get the same state — nothing is hidden.
// Guests send their moves to the host, which checks them with the engine and relays every applied move
// (people's and the computer's) to the others.
// Players vs. devices: net.js numbers the devices (seats 1..n-1). The host binds each device to a player by its
// tab id, so a device that comes back gets its own purse again — even after the host's own reload, when net.js
// may hand out its seat numbers in a different order.
const bind = {};          // host: player → net seat of the device playing it
const cids = {};          // host: net seat → tab id
let owner = [];           // host: player → tab id of the device that played it last
let ownerDev = [];        // host: player → browser id (localStorage) of that device: a new tab of the same browser
let netMe = null;         // guest: the player this device plays (null = watching)
function playerAt(seat) { for (const p in bind) if (bind[p] === seat) return +p; return -1; }
const myCid = () => sessionStorage.getItem('mg-client-id') || '';
// Per-browser id: a guest who reopens the link in a new tab gets a new tab id but keeps this one.
const myDev = () => {
  let d = localStorage.getItem('mg-' + SLUG + '-dev');
  if (!d) localStorage.setItem('mg-' + SLUG + '-dev', (d = Math.random().toString(36).slice(2, 12)));
  return d;
};
const devs = {};          // host: net seat → browser id
// Host: give a device a player — its own one if it had one, else a computer seat, else the seat of someone who
// dropped out. Returns the player, or -1 (no seat in this game: the device watches).
function claim(seat, cid, dev = devs[seat]) {
  let p = playerAt(seat);
  if (p < 0) {
    const ps = [...Array(st.n).keys()].slice(1).filter((q) => bind[q] == null);
    p = ps.find((q) => cid && owner[q] === cid) ?? ps.find((q) => dev && ownerDev[q] === dev)
      ?? (ps.includes(seat) && !owner[seat] ? seat : undefined)
      ?? ps.find((q) => !owner[q]) ?? ps[0] ?? -1;
  }
  if (p > 0) { bind[p] = seat; owner[p] = cid || owner[p]; ownerDev[p] = dev || ownerDev[p]; delete goneAt[p]; }
  return p;
}
function seatInfo() {
  const kinds = [], names = [];
  for (let p = 0; p < 6; p++) {
    kinds.push(p === 0 ? 'human' : p < st.n ? kind(p) : '');
    names.push((p === 0 ? cfg.names[0] : remoteNames[p]) || '');
  }
  return { kinds, names };
}
function sendState(to) {
  sess.send('state', { st, over, first: gameFirst, coins: cfg.coins, rule: cfg.rule, you: playerAt(to), ...seatInfo() }, { to });
}
const sendSeats = () => sess.send('seats', seatInfo());
function relayMove(m, from) {
  const d = { m, n: st.moves };
  for (const k of sess.seats()) if (k !== 0 && k !== from) sess.send('move', d, { to: k });
}
function takeSeats(d) {
  netKinds = d.kinds || [];
  (d.names || []).forEach((nm, p) => { if (p !== mySeat()) remoteNames[p] = nm || ''; });
}
function onSession(s) {
  sess = s;
  cancelAI();
  netSynced = false; netMe = null; owner = []; ownerDev = [];
  for (const o of [goneAt, bind, cids, devs]) for (const k in o) delete o[k];
  const me = () => sess === s;
  s.on('status', () => me() && renderPlayers());
  s.on('peer-join', () => {
    if (!me() || s.host) return;
    // Introduce ourselves; the host answers with the state. Ask again until it arrives (a message can get lost
    // while channels settle). Also after the host comes back: what we hold may be stale.
    netSynced = false;
    const hi = () => { if (me() && s.connected && !netSynced) { s.send('hi', { cid: myCid(), dev: myDev(), name: ownName() }); setTimeout(hi, 3000); } };
    hi();
    renderPlayers();
  });
  s.on('hi', (d, { seat }) => {
    if (!s.host || !me() || !d) return;
    // A device (new, or back after a reload) takes its seat right away, even mid-game: it was the computer's.
    cids[seat] = String(d.cid || '').slice(0, 20);
    devs[seat] = String(d.dev || '').slice(0, 20);
    const p = claim(seat, cids[seat], devs[seat]);
    if (p > 0 && typeof d.name === 'string') remoteNames[p] = d.name.slice(0, 14);
    sendState(seat);
    sendSeats();
    cancelAI();
    render();
    maybeAI();
  });
  s.on('peer-leave', ({ seat }) => {
    if (!me()) return;
    if (s.host) {
      const p = playerAt(seat);
      if (p > 0) { delete bind[p]; if (st.n > 2) markGone(p); }
      sendSeats();
    }
    render();
  });
  s.on('state', (d) => {
    if (s.host || !me() || !d?.st) return;
    cancelAI();
    cfg.coins = d.coins; cfg.rule = d.rule;
    $('#coins').value = d.coins; $('#rule').value = d.rule;
    st = d.st; over = false; gameFirst = d.first; history = []; pend = null; fresh = null; shapes = {};
    netN = st.n; netSynced = true; netMe = d.you > 0 ? d.you : null;
    $('#players').value = netN;
    takeSeats(d);
    moods.forEach((_, p) => setMood(p, 'neutral'));
    $('#result').hidden = true;
    buildCards();
    d.over ? finish() : render();
  });
  s.on('seats', (d) => { if (!s.host && me() && d) { takeSeats(d); render(); } });
  s.on('name', (d, { seat }) => {
    if (!me() || !d) return;
    if (s.host) {
      // Only trust the sender's own player, then pass the name on to everyone else.
      const p = playerAt(seat);
      if (p <= 0) return;
      remoteNames[p] = String(d.name || '').slice(0, 14);
      for (const k of s.seats()) if (k !== 0 && k !== seat) s.send('name', { seat: p, name: remoteNames[p] }, { to: k });
    } else if (d.seat !== mySeat()) remoteNames[d.seat] = d.name || '';
    render();
  });
  s.on('move', (d, { seat }) => {
    if (!me()) return;
    if (!d || typeof d.m !== 'object' || !d.m) return s.host ? sendState(seat) : s.send('resync');
    if (s.host) {
      const p = playerAt(seat);
      if (over || p <= 0 || d.n !== st.moves || st.turn !== p || !PW.legal(st, d.m)) return sendState(seat);
      return play({ give: d.m.give, take: d.m.take.slice() }, seat);
    }
    if (over || d.n !== st.moves || !PW.legal(st, d.m)) return s.send('resync');
    play(d.m);
  });
  s.on('resync', (d, { seat }) => s.host && me() && sendState(seat));
  s.on('new', (d) => {
    if (s.host || !me() || !d) return;
    cfg.coins = d.coins; cfg.rule = d.rule;
    $('#coins').value = d.coins; $('#rule').value = d.rule;
    netN = d.n || 2; netMe = d.you > 0 ? d.you : null;
    $('#players').value = netN;
    takeSeats(d);
    newGame(d.first);
  });
  const saved = s.host && JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
  if (saved?.st) {
    // The host reloaded: carry on with the same match. Players who had a device keep their seat for a while
    // (shown as offline) so the computer doesn't jump in before they reconnect.
    st = saved.st; over = false; gameFirst = saved.first || 0; nextFirst = saved.next || 0;
    history = []; pend = null; fresh = null; shapes = {}; smugSaid = false; lowSaid = {};
    cfg.coins = saved.coins; cfg.rule = saved.rule; cfg.players = st.n; saveCfg();
    $('#coins').value = cfg.coins; $('#rule').value = cfg.rule; $('#players').value = st.n;
    s.setMaxPlayers(st.n);
    owner = saved.owner || []; ownerDev = saved.ownerDev || [];
    (saved.names || []).forEach((nm, p) => { if (p > 0) remoteNames[p] = nm || ''; });
    (saved.humans || []).forEach((p) => { if (p > 0 && p < st.n) markGone(p); });
    moods.forEach((_, p) => setMood(p, 'neutral'));
    $('#result').hidden = true;
    buildCards();
    if (saved.over) finish(); else { render(); maybeAI(); }
  } else newGame(0);
}

// A player's device dropped: show the seat offline, and after a pause let the computer play it (3+ players).
function markGone(p) {
  const s = sess;
  goneAt[p] = Date.now();
  setTimeout(() => {
    if (sess !== s || goneAt[p] == null) return;
    sendSeats(); render(); maybeAI();
  }, GONE_DELAY + 50);
}

// The host keeps the match in sessionStorage per room, so reloading the host's tab doesn't wipe it.
const roomKey = (s) => `mg-pw-room-${s.code}`;
function persist() {
  if (!online() || !sess.host || !st) return;
  const humans = [];
  for (let p = 1; p < st.n; p++) if (['human', 'gone', 'away'].includes(kind(p))) humans.push(p);
  sessionStorage.setItem(roomKey(sess), JSON.stringify({
    st, over, first: gameFirst, next: nextFirst, coins: cfg.coins, rule: cfg.rule, names: remoteNames, humans, owner, ownerDev,
  }));
}

function localMove(m) {
  if (online() && !sess.host) sess.send('move', { m, n: st.moves });
  play(m, 0);
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const g = evt.target.closest('[data-act]');
  if (!g || !canMove()) return;
  const act = g.dataset.act, i = +g.dataset.i;
  if (act === 'give') {
    if (pend && pend.give === i) pend = null;
    else if (st.hands[st.turn][i] > 0) pend = { give: i, take: PW.bestTake(st, i) };
  } else if (act === 'add') {
    if (pend && PW.canAdd(st, pend.give, pend.take, i)) pend.take[i]++;
  } else if (act === 'remove') {
    if (pend && pend.take[i] > 0) pend.take[i]--;
  } else if (act === 'cancel') {
    pend = null;
  } else if (act === 'ok') {
    if (pend && PW.legal(st, pend)) return localMove({ give: pend.give, take: pend.take.slice() });
  }
  render();
});

const onSetting = (key, conv = (x) => x) => (e) => { cfg[key] = conv(e.target.value); saveCfg(); nextFirst = 0; restart(); };
$('#players').addEventListener('change', onSetting('players', Number));
$('#mode').addEventListener('change', onSetting('mode'));
$('#coins').addEventListener('change', onSetting('coins'));
$('#rule').addEventListener('change', onSetting('rule'));
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.addEventListener('mg:lang', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#players').value = cfg.players;
$('#mode').value = cfg.mode;
$('#coins').value = cfg.coins;
$('#rule').value = cfg.rule;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => {
    // Turned away from a full room: net.js words its message by our own player count; make it say "no free seats".
    if (sess && !sess.host && sess.status === 'full') fullRoom = true;
    sess = null; netSynced = false; $('#players').value = cfg.players; newGame(0);
  },
  maxPlayers: () => { if (fullRoom) { fullRoom = false; return 6; } return cfg.players; },
});
if (!online()) showOnce('how', SLUG);
