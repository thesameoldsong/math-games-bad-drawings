import { t, plural, applyI18n, getLang } from '../../shared/i18n.js';
import { PALETTE, line, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { QGF } from './engine.js';
import './strings.js';

const SLUG = 'quantum-go-fish';
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Eight player colours: the book's blue and red first.
const COLORS = [
  PALETTE.blue, PALETTE.red,
  { main: 'var(--qgf-green)', text: 'var(--qgf-green)', fill: 'var(--qgf-green-fill)', dark: 'var(--qgf-green-face)' },
  { main: 'var(--qgf-orange)', text: 'var(--qgf-orange)', fill: 'var(--qgf-orange-fill)', dark: 'var(--qgf-orange-face)' },
  { main: 'var(--qgf-violet)', text: 'var(--qgf-violet)', fill: 'var(--qgf-violet-fill)', dark: 'var(--qgf-violet-face)' },
  { main: 'var(--qgf-pink)', text: 'var(--qgf-pink)', fill: 'var(--qgf-pink-fill)', dark: 'var(--qgf-pink-face)' },
  { main: 'var(--qgf-brown)', text: 'var(--qgf-brown)', fill: 'var(--qgf-brown-fill)', dark: 'var(--qgf-brown-face)' },
  { main: 'var(--qgf-olive)', text: 'var(--qgf-olive)', fill: 'var(--qgf-olive-fill)', dark: 'var(--qgf-olive-face)' },
];

// Suit drawings (our own), 24×24 box: crayon fill + ink outline + details.
const SUITS = [
  { fill: '#f5a623', body: 'M3 12C6 6.2 14.5 6 18 12C14.5 18 6 17.8 3 12Z M17.6 12L22 7.8L21.6 16.4Z', ink: 'M7.5 10.6h.1 M11 9.5c.8 1.4.8 3.6 0 5' },
  { fill: '#b48ae0', body: 'M8 2.5H15.5V12.5L18.6 15.2C21 17.4 19.6 21.4 16 21.4H10.4C6.8 21.4 5.8 17.6 8 15.6Z', ink: 'M8 6.4H15.5 M8 9H15.5' },
  { fill: '#7cc576', body: 'M9.8 21V5.2C9.8 2.4 14.2 2.4 14.2 5.2V21Z M9.8 14H6.6C5.4 14 5 13.2 5 12V8.6C5 7.2 7 7.2 7 8.6V11.6H9.8Z M14.2 12H17V7.4C17 6 19 6 19 7.4V11C19 12.6 18.2 13.6 16.8 13.6H14.2Z', ink: 'M6 21.4H18 M12 7v.1 M12 11v.1 M12 15v.1' },
  { fill: '#ee6b5f', body: 'M2.6 12.4C2.6 4.6 21.4 4.6 21.4 12.4Z', ink: 'M9.2 12.6V19.4C9.2 21.6 14.8 21.6 14.8 19.4V12.6 M7.4 9.4h.1 M12 7.4h.1 M16.4 9.6h.1' },
  { fill: '#f7d84a', body: 'M14.6 2.8A9.4 9.4 0 1 0 21.4 15.4A7.4 7.4 0 1 1 14.6 2.8Z', ink: 'M8.4 12.6h.1 M10.4 16.8h.1' },
  { fill: '#d6ad7c', body: 'M13 6.2A6.2 6.2 0 1 1 13 18.6A6.2 6.2 0 1 1 13 6.2Z', ink: 'M13 12.4c0-1.2 1.6-1.4 2-.2.6 1.6-1.4 3-3 2.2-2.2-1-2-4.4.6-5 3.4-.8 5.4 3.4 3.2 6 M2.4 19.6H19.8C21.4 19.6 21.4 17.8 19.6 17.8 M4.4 19.6C3.4 16.4 3.6 14 5.6 13.6 M5 13.4L3.6 10.2 M5.6 13.4L6.4 10' },
  { fill: '#4fc1b0', body: 'M2.6 12.6C2.6 3.8 21.4 3.8 21.4 12.6C19.6 10.8 17.4 10.8 15.6 12.6C13.8 10.8 11.4 10.8 9.6 12.6C7.6 10.8 4.6 10.8 2.6 12.6Z', ink: 'M12 12V19.6C12 21.6 9 21.6 9 19.6 M12 4.4V3' },
  { fill: '#f08bb8', body: 'M3.4 18L2.8 7.4L8.4 12L12 4.4L15.6 12L21.2 7.4L20.6 18Z', ink: 'M3.4 20.6H20.6 M12 13.4v.1' },
];

const store = 'mg-' + SLUG;
const cfg = Object.assign({ n: 4, humans: 1, level: 'normal', hints: 'on', names: [] }, JSON.parse(localStorage.getItem(store) || '{}'));
const saveCfg = () => localStorage.setItem(store, JSON.stringify(cfg));

let st, history = [], over = false, timer = 0, sel = { to: -1, suit: -1 }, nextFirst = 0;
let shapes = {}, moods = [], fresh = null, built = -1;
let sess = null;                    // online session (shared/net.js), null when playing locally
// Online, the host decides who controls each player and every device mirrors it:
//   ctl[p]   'human' — a device plays p; 'away' — its device dropped out (we wait a bit); 'cpu' — the host's computer plays p.
//   owner[p] the room seat (shared/net.js) whose device plays p, -1 if none. Players are not tied to room seats:
//            after a host reload net.js hands out seats in reconnect order, so each guest says which player it was.
let ctl = [], owner = [], netNames = [], seatNames = {};
let paused = false;                 // online: the host's room dialog is open → the table waits
let started = false;                // host: "let's play" was pressed in this room (survives a reload)
let joined = {};                    // host: room seat → {p, at} for a device that just sat at a computer's player
let pending = false;                // guest: our move is on its way to the host
const awayTimers = {};
const AWAY_MS = 15000;              // a dropped player's seat goes to the computer after this
// Guest: which player we play in this room. Kept per tab and, as a fallback for the link reopened in a
// new tab (net.js then sees a new device), per browser.
const meKey = () => `mg-${SLUG}-me-${sess.code}`;
const saveMe = (p) => { sessionStorage.setItem(meKey(), String(p)); localStorage.setItem(meKey(), String(p)); };
const loadMe = () => { const v = Number(sessionStorage.getItem(meKey()) ?? localStorage.getItem(meKey()) ?? NaN); return Number.isInteger(v) ? v : null; };
let everLinked = false;             // guest: reached the host at least once

// ---------- who is who ----------
const online = () => !!sess;
// The player this device controls online (-1: watching).
const me = () => (sess.host ? 0 : owner.indexOf(sess.seat));
const humans = () => (online() ? ctl.filter((c) => c && c !== 'cpu').length : Math.min(cfg.humans, st.n));
const isAI = (p) => (online() ? ctl[p] === 'cpu' : p >= humans());
const isLocal = (p) => (online() ? p === me() : !isAI(p));
const isRemote = (p) => online() && !isAI(p) && p !== me();
const spectator = () => online() && !(me() >= 0 && me() < st.n); // no free player for us (or the table shrank)
const runsAI = () => !online() || (sess.host && !paused);   // only the host drives computer seats online
const linked = () => !online() || sess.host || sess.connected;
const actor = () => QGF.actor(st);
const canAct = () => !over && actor() >= 0 && isLocal(actor()) && linked() && !(online() && (paused || pending));
// Online, this device's own name is always cfg.names[0] (whatever seat it gets), not a hot-seat name.
const nameIdx = (p) => (online() ? 0 : p);
function name(p) {
  if (isAI(p)) return t('qgf.cpu' + p);
  const n = online() && p !== me() ? netNames[p] : cfg.names[nameIdx(p)];
  return (n && n.trim()) || t('qgf.p' + p);
}
const suitLook = (s) => st.look[s];
const suitName = (s) => t('qgf.suit' + suitLook(s));
const lower = (s) => s.toLowerCase();

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
function suitIcon(s, x, y, size, cls = '') {
  const L = SUITS[suitLook(s)], k = size / 24;
  return `<g class="sicon ${cls}" transform="translate(${x} ${y}) scale(${k.toFixed(3)})">
    <path d="${L.body}" fill="${L.fill}" filter="url(#mg-crayon)"/>
    <path d="${L.body}" class="ink"/><path d="${L.ink}" class="ink thin"/></g>`;
}
const iconSVG = (s, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${suitIcon(s, 0, 0, 24)}${cls === 'crossed' ? '<path class="x" d="M2 22L22 2"/>' : ''}</svg>`;
const qIcon = () => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><text x="12" y="13" class="qmark">?</text></svg>`;

const CW = 28, CH = 38, STEP = 34;
function cardPath(key, x, y) {
  return shapeFor(key, () => withSeed(key.length * 7919 + [...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 99991, () =>
    [line(x + 3, y, x + CW - 3, y, 1.2), line(x + CW, y + 3, x + CW, y + CH - 3, 1.2),
      line(x + CW - 3, y + CH, x + 3, y + CH, 1.2), line(x, y + CH - 3, x, y + 3, 1.2)].join(' ')));
}
function card(p, i, kind, s, extra = '') {
  const x = 2 + i * STEP, y = 3;
  let s1 = `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" rx="4" class="cbg ${kind}"/>`;
  s1 += `<path d="${cardPath(`c${p}_${i}`, x, y)}" class="cedge ${kind}" stroke="${kind === 'unk' ? COLORS[p].main : 'var(--ink)'}"/>`;
  if (kind === 'unk') s1 += `<text x="${x + CW / 2}" y="${y + CH / 2 + 1}" class="qmark" fill="${COLORS[p].main}">?</text>`;
  else s1 += suitIcon(s, x + 2, y + 7, CW - 4, kind);
  return `<g class="card ${extra}">${s1}</g>`;
}

// ---------- table ----------
function buildSeats() {
  built = st.n;
  shapes = {};
  $('#seats').className = `seats n${st.n}${st.n >= 6 ? ' compact' : ''}`;
  $('#seats').innerHTML = Array.from({ length: st.n }, (_, p) => `
    <div class="seat" data-p="${p}" style="--pc:${COLORS[p].main}">
      <div class="fig-wrap"><div class="bubble" style="color:${COLORS[p].main}"></div><div class="fig"></div></div>
      <div class="seat-main">
        <div class="seat-top"><span class="nm"></span><span class="cnt"></span><span class="off"></span><span class="nots"></span></div>
        <svg class="hand" preserveAspectRatio="xMinYMid meet"></svg>
      </div>
    </div>`).join('');
}

function view() {
  const hints = cfg.hints === 'on' || over;
  if (hints) {
    const d = QGF.deduce(st);
    return { min: d.min, no: d.may.map((r, p) => r.map((m) => !m && QGF.unknown(st, p) > 0)) };
  }
  return { min: st.known, no: st.excl.map((r, p) => r.map((x) => x && QGF.unknown(st, p) > 0)) };
}

function renderSeats() {
  if (built !== st.n) buildSeats();
  const v = view();
  const act = actor();
  for (let p = 0; p < st.n; p++) {
    const el = $(`.seat[data-p="${p}"]`);
    const targetable = canAct() && st.phase === 'ask' && p !== st.turn && st.hand[p] > 0;
    el.classList.toggle('turn', !over && st.turn === p);
    el.classList.toggle('asked', !over && st.phase === 'answer' && st.ask.to === p);
    el.classList.toggle('acting', !over && act === p);
    el.classList.toggle('targetable', targetable);
    el.classList.toggle('sel', targetable && sel.to === p);
    el.classList.toggle('winner', over && st.winner === p);
    el.classList.toggle('empty', st.hand[p] === 0);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : act === p ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: 'right', seed: 11 + p * 31 })
      .replace('viewBox="0 0 140 240"', st.n >= 6 ? 'viewBox="-4 10 148 172"' : 'viewBox="-4 6 148 230"');
    const mine = online() && p === me(), away = online() && ctl[p] === 'away';
    el.classList.toggle('me', mine);
    el.classList.toggle('away', away);
    el.querySelector('.nm').textContent = name(p) + (mine ? ` (${t('net.you')})` : '');
    el.querySelector('.off').textContent = away ? t('qgf.off') : '';
    el.querySelector('.cnt').textContent = plural(st.hand[p], 'qgf.cards');
    // the hand: known suits, deduced suits (dashed), then mystery cards
    let out = '', i = 0;
    for (let s = 0; s < st.n; s++) {
      for (let k = 0; k < st.known[p][s]; k++, i++) {
        const isFresh = fresh && fresh.p === p && fresh.s === s && k === 0;
        out += card(p, i, 'known', s, isFresh ? 'fresh' : '');
      }
    }
    for (let s = 0; s < st.n; s++) for (let k = st.known[p][s]; k < v.min[p][s]; k++, i++) out += card(p, i, 'deduced', s);
    for (; i < st.hand[p]; i++) out += card(p, i, 'unk');
    const svg = el.querySelector('.hand');
    svg.setAttribute('viewBox', `0 0 ${Math.max(st.hand[p] * STEP + 4, 8 * STEP + 4)} 44`);
    svg.innerHTML = out;
    let nots = '';
    for (let s = 0; s < st.named; s++) if (v.no[p][s]) nots += iconSVG(s, 'crossed');
    el.querySelector('.nots').innerHTML = nots ? `<span class="nots-l">${t('qgf.not')}</span>${nots}` : '';
  }
}

function chip(s, enabled, hintCount) {
  const isNew = s === st.named;
  const label = isNew ? t('qgf.suit.new') : suitName(s);
  const cnt = hintCount != null && !isNew ? `<span class="chip-n">${hintCount}/4</span>` : '';
  return `<button class="chip${sel.suit === s ? ' on' : ''}" data-suit="${s}" ${enabled ? '' : 'disabled'}>${isNew ? qIcon() : iconSVG(s)}<span class="chip-l">${esc(label)}</span>${cnt}</button>`;
}

function lastLine() {
  const L = st.last;
  if (!L) return '';
  return `<div class="last"><b style="color:${COLORS[L.from].main}">${esc(name(L.from))}</b> → <b style="color:${COLORS[L.to].main}">${esc(name(L.to))}</b>: ${iconSVG(L.suit)} ${esc(lower(suitName(L.suit)))}? — ${t(L.yes ? 'qgf.log.yes' : 'qgf.log.no')}</div>`;
}

function renderPanel() {
  const panel = $('#panel');
  if (over) { panel.innerHTML = lastLine(); return; }
  let html = '';
  if (st.phase === 'ask') {
    html += lastLine();
    const p = st.turn, mine = canAct();
    const hints = cfg.hints === 'on';
    const placed = (s) => st.known.reduce((a, r) => a + r[s], 0);
    html += `<div class="chips${mine ? '' : ' idle'}">`;
    for (let s = 0; s <= Math.min(st.named, st.n - 1); s++) html += chip(s, mine && QGF.canHold(st, p, s), hints ? placed(s) : null);
    html += '</div>';
  } else {
    const { from, to, suit, fresh: isNew } = st.ask;
    if (isNew) html += `<div class="last newsuit">${esc(t('qgf.newsuit', { suit: suitName(suit) }))}</div>`;
    html += `<div class="question"><span class="asks" style="color:${COLORS[from].main}">${esc(t('qgf.asks', { name: name(from) }))}</span>
      <span class="q">${iconSVG(suit)} ${esc(t('qgf.q', { target: name(to), suit: lower(suitName(suit)) }))}</span></div>`;
    if (canAct()) {
      const a = QGF.answers(st);
      html += `<div class="answers">
        <button class="btn ans ${a.yes ? 'primary' : ''}" data-ans="yes" ${a.yes ? '' : 'disabled'}>${t('qgf.yes')}${a.yes ? '' : `<small>${t('qgf.forced')}</small>`}</button>
        <button class="btn ans ${a.no ? 'primary' : ''}" data-ans="no" ${a.no ? '' : 'disabled'}>${t('qgf.no')}${a.no ? '' : `<small>${t('qgf.forced')}</small>`}</button>
      </div>`;
    }
  }
  panel.innerHTML = html;
}

function renderStatus() {
  const status = $('#status');
  const a = actor();
  let txt = '';
  if (over) txt = '';
  else if (!linked()) txt = t(everLinked ? 'qgf.st.wait' : 'qgf.st.join');
  else if (online() && paused) txt = sess.host ? t('qgf.st.paused.host') : t('qgf.st.paused', { name: name(0) });
  else if (online() && ctl[a] === 'away') txt = t('qgf.st.away', { name: name(a) });
  else if (spectator()) txt = t('qgf.st.watch');
  else if (isAI(a)) txt = t('qgf.st.thinking', { name: name(a) });
  else if (isRemote(a)) txt = t('qgf.st.remote', { name: name(a) });
  else if (st.phase === 'answer') txt = online() || humans() === 1 ? t('qgf.st.answer.you') : t('qgf.st.answer', { name: name(a) });
  else if (sel.to >= 0) txt = t('qgf.st.suit');
  else if (sel.suit >= 0) txt = t('qgf.st.who');
  else txt = online() || humans() === 1 ? t('qgf.st.you') : t('qgf.st.ask', { name: name(a) });
  status.textContent = txt;
  status.style.color = a >= 0 ? COLORS[a].main : 'var(--ink)';
}

function renderTools() {
  $('#undo').disabled = online() || !history.length;
  const host = canRestart();
  $('#new').disabled = !host;
  $('#np').disabled = !host;
  $('#humans').disabled = online();
  $('#again').hidden = !host;
  $('#result-wait').hidden = host;
  if (online()) $('#result-wait').textContent = t('qgf.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('qgf.online.note', { s: Math.round(AWAY_MS / 1000) }) : '';
  $('#level-field').hidden = online() ? !sess.host : humans() >= st.n;
}

// The result card is redrawn with the table, so names stay right if someone takes a seat afterwards.
function renderResult() {
  if (!over) return;
  const w = st.winner, txt = $('#result-text');
  txt.textContent = st.draw ? t('qgf.draw') : t('qgf.win', { name: name(w) });
  txt.style.color = st.draw ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').textContent = st.draw ? t('qgf.draw.why') : st.winBy === 'four' ? t('qgf.win.four', { suit: lower(suitName(st.winSuit)) }) : t('qgf.win.all');
}

function render() {
  persist();
  renderResult();
  renderSeats();
  renderPanel();
  renderStatus();
  renderTools();
}

// ---------- settings ----------
function fillSettings() {
  $('#np').value = String(online() ? st.n : cfg.n);
  const n = online() ? st.n : cfg.n;
  const hs = $('#humans');
  hs.innerHTML = Array.from({ length: n }, (_, i) => {
    const k = i + 1;
    const lbl = k === 1 ? t('qgf.humans.1') : k === n ? t('qgf.humans.all', { k }) : t('qgf.humans.k', { k });
    return `<option value="${k}">${lbl}</option>`;
  }).join('');
  hs.value = String(online() ? Math.max(1, Math.min(humans(), n)) : Math.min(cfg.humans, n));
  $('#level').value = cfg.level;
  $('#hints').value = cfg.hints;
  const seats = online() ? [Math.max(0, me())] : Array.from({ length: Math.min(cfg.humans, n) }, (_, i) => i);
  // don't rebuild the name fields under the user's fingers (seat updates arrive while a guest types)
  const box = $('#names'), key = `${online()}:${seats}:${getLang()}`;
  if (box.dataset.key === key && box.contains(document.activeElement)) return;
  box.dataset.key = key;
  box.innerHTML = seats.map((p) =>
    `<input type="text" maxlength="14" spellcheck="false" data-p="${p}" style="color:${COLORS[p].main}" placeholder="${esc(t('qgf.p' + p))}" value="${esc(cfg.names[nameIdx(p)] || '')}">`).join('');
}

// ---------- reactions ----------
const bubbleTimers = [];
// Where the row has room (desktop, short hands), speak from just past the last card so the name and
// cards stay visible; otherwise keep the CSS spot beside the figure.
function placeBubble(b) {
  const seat = b.closest('.seat'), cards = seat.querySelectorAll('.hand .card');
  const end = cards.length ? cards[cards.length - 1].getBoundingClientRect().right : 0;
  const room = seat.getBoundingClientRect().right - end - 22;
  const fits = end > 0 && room >= 150;
  b.style.left = fits ? `${Math.round(end - b.parentElement.getBoundingClientRect().left + 12)}px` : '';
  b.style.maxWidth = fits ? `${Math.round(room)}px` : '';
}
function say(p, text) {
  const b = $(`.seat[data-p="${p}"] .bubble`);
  if (!b) return;
  b.textContent = text;
  b.classList.add('show');
  requestAnimationFrame(() => placeBubble(b)); // after the move has been rendered
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 2300);
}
const hush = () => document.querySelectorAll('.seat .bubble.show').forEach((b) => b.classList.remove('show'));
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
// A follow-up remark, dropped if the game moved on in the meantime.
const later = (fn, ms) => { const n = st.moves; setTimeout(() => { if (!over && st.moves === n) fn(); }, ms); };
const calm = () => { moods = Array.from({ length: st.n }, () => ({ mood: 'neutral', pose: 'down' })); };

// ---------- flow ----------
function newGame(n = cfg.n, first = nextFirst) {
  clearTimeout(timer);
  st = QGF.create(n, { first: first % n });
  nextFirst = (first + 1) % n;
  history = []; over = false; sel = { to: -1, suit: -1 }; fresh = null;
  if (online() && sess.host) syncCtl();
  calm(); hush();
  $('#result').hidden = true;
  fillSettings();
  render();
  maybeAI();
}

function doMove(m, fromNet = false) {
  if (over || !QGF.isLegal(st, m)) return false;
  const n0 = st.moves;
  history.push(QGF.clone(st));
  const answering = st.phase === 'answer';
  const forced = answering && Object.values(QGF.answers(st)).filter(Boolean).length === 1;
  QGF.apply(st, m);
  sel = { to: -1, suit: -1 };
  fresh = null;
  // the host relays every applied move (its own, the computers' and the guests') to the whole table
  if (online() && sess.host) sess.send('move', { m, n: n0 });
  if (!answering) {
    const { from, to, suit, fresh: isNew } = st.ask;
    calm();
    setMood(from, 'neutral', 'point');
    hush();
    say(from, t('qgf.say.ask', { name: name(to), suit: lower(suitName(suit)) }));
    if (isNew && st.named > 1) setMood(to, 'worried');
  } else {
    const L = st.last;
    if (L.yes) {
      fresh = { p: L.from, s: L.suit };
      say(L.to, t(forced ? 'qgf.say.forced' : 'qgf.say.yes'));
      setMood(L.to, forced ? 'sad' : 'neutral');
      setMood(L.from, 'happy', 'wave');
      if (Math.random() < 0.35) later(() => say(L.from, t('qgf.say.got')), 900);
    } else {
      say(L.to, t('qgf.say.no'));
      setMood(L.to, 'smug');
      setMood(L.from, 'worried');
      if (Math.random() < 0.3) later(() => say(L.from, t('qgf.say.hmm')), 900);
    }
  }
  if (QGF.isOver(st)) return finish(), true;
  render();
  maybeAI();
  return true;
}

function maybeAI() {
  clearTimeout(timer);
  if (over || !runsAI()) return;
  const a = actor();
  if (a < 0 || !isAI(a)) return;
  const delay = st.phase === 'ask' ? 1100 : 1000;
  timer = setTimeout(() => { if (!over && actor() === a && isAI(a) && runsAI()) doMove(QGF.aiMove(st, cfg.level)); }, delay);
}

function finish() {
  over = true;
  clearTimeout(timer);
  const w = st.winner;
  for (let p = 0; p < st.n; p++) setMood(p, st.draw ? 'worried' : p === w ? 'happy' : 'sad', p === w ? 'up' : 'down');
  setTimeout(() => {
    if (!over) return;
    if (st.draw) say(st.turn, t('qgf.say.draw'));
    else {
      say(w, st.winBy === 'four' ? t('qgf.say.win4', { suit: lower(suitName(st.winSuit)) }) : t('qgf.say.winAll'));
      const others = [...Array(st.n).keys()].filter((p) => p !== w);
      const loser = others[Math.floor(Math.random() * others.length)];
      setTimeout(() => over && say(loser, t('qgf.say.lose')), 900);
    }
  }, 700);
  render();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1300);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(timer);
  do st = history.pop(); while (history.length && !isLocal(QGF.actor(st)));
  over = false; sel = { to: -1, suit: -1 }; fresh = null;
  calm(); hush();
  $('#result').hidden = true;
  render();
  maybeAI();
}

// Online, only the room creator may restart or change the table; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- input ----------
// A guest only proposes the move; the host checks it and relays it to everyone (us included).
function play(m) {
  if (!QGF.isLegal(st, m)) return false;
  if (!online() || sess.host) return doMove(m);
  pending = true;
  sel = { to: -1, suit: -1 };
  sess.send('move', { m, n: st.moves });
  render();
  return true;
}
function tryAsk() {
  if (sel.to < 0 || sel.suit < 0) return render();
  const m = { t: 'ask', to: sel.to, suit: sel.suit };
  if (!play(m)) { sel = { to: -1, suit: -1 }; render(); }
}
$('#seats').addEventListener('click', (e) => {
  const seat = e.target.closest('.seat');
  if (!seat || !canAct() || st.phase !== 'ask') return;
  const p = +seat.dataset.p;
  if (p === st.turn || st.hand[p] === 0) return;
  sel.to = sel.to === p ? -1 : p;
  tryAsk();
});
$('#panel').addEventListener('click', (e) => {
  if (!canAct()) return;
  const c = e.target.closest('.chip');
  if (c && !c.disabled && st.phase === 'ask') {
    const s = +c.dataset.suit;
    sel.suit = sel.suit === s ? -1 : s;
    return tryAsk();
  }
  const a = e.target.closest('[data-ans]');
  if (a && !a.disabled && st.phase === 'answer') play({ t: 'answer', yes: a.dataset.ans === 'yes' });
});

$('#np').addEventListener('change', (e) => {
  if (!canRestart()) return;
  cfg.n = +e.target.value; saveCfg();
  if (online()) sess.setMaxPlayers(cfg.n);
  fillSettings(); restart();
});
$('#humans').addEventListener('change', (e) => { cfg.humans = +e.target.value; saveCfg(); fillSettings(); newGame(); });
$('#level').addEventListener('change', (e) => { cfg.level = e.target.value; saveCfg(); });
$('#hints').addEventListener('change', (e) => { cfg.hints = e.target.value; saveCfg(); render(); });
$('#names').addEventListener('input', (e) => {
  cfg.names[nameIdx(+e.target.dataset.p)] = e.target.value;
  saveCfg();
  if (online()) sendMyName();
  render();
});
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.addEventListener('mg:lang', () => { fillSettings(); render(); if (over) finish(); });

// ---------- online ----------
// Everything on this table is public (nobody holds a secret card:
// suits only exist as shared facts), so every device gets the same state and the same move stream.
// The host is authoritative: guests propose moves, the host validates, applies and relays them.
// The host keeps the match in sessionStorage per room, so reloading the host's tab doesn't wipe it.
const roomKey = (s) => `mg-${SLUG}-room-${s.code}`;
function persist() {
  if (online() && sess.host && st) sessionStorage.setItem(roomKey(sess), JSON.stringify({ st, over, first: nextFirst, ctl, names: netNames, started }));
}
const seatInfo = () => { netNames[0] = cfg.names[0] || ''; return { ctl, owner, names: netNames, paused }; };
function sendState(to) {
  sess.send('state', { st, over, first: nextFirst, ...seatInfo() }, to === undefined ? {} : { to });
}
const sendSeats = () => sess.send('seats', seatInfo());
function sendMyName() {
  if (sess.host) { sendSeats(); return; }
  sess.send('name', { name: cfg.names[0] || '' });
}
const live = (k) => k === 0 || sess.seats().includes(k);

// Host: seat room seat k at player p (taking over a computer or a dropped-out player).
function seatAt(p, k) {
  owner[p] = k;
  netNames[p] = seatNames[k] || '';
  clearTimeout(awayTimers[p]);
}
// Host: which player should room seat k play? `was` = the player that device says it played before.
// A newcomer gets a computer player (never one whose owner may still come back), else watches.
function claim(k, was) {
  const n = st.n, mine = owner.indexOf(k);
  if (mine > 0 && mine < n) return mine;
  const open = (q) => Number.isInteger(q) && q > 0 && q < n && !(owner[q] >= 0 && owner[q] !== k && live(owner[q]));
  if (open(was)) return was;
  // a device we don't know yet is most likely a player who dropped out and reopened the link: give it that player
  const away = [...Array(n).keys()].filter((q) => open(q) && ctl[q] === 'away');
  if (was == null && away.length) return away[0];
  const cpu = [...Array(n).keys()].filter((q) => open(q) && ctl[q] === 'cpu');
  return [k, ...cpu.filter((q) => !(owner[q] >= 0)), ...cpu].find((q) => cpu.includes(q)) ?? -1;
}
function takeSeat(k, was) {
  const p = claim(k, was);
  if (p < 0) { sendSeats(); render(); return; } // watching; seats still go out so the guest knows
  const old = ctl.slice();
  // (remembered for a moment: if it is someone's new tab, their old tab is about to be noticed gone)
  if (ctl[p] === 'cpu' && Number.isInteger(was) && was !== p) joined[k] = { p, was, at: Date.now() };
  seatAt(p, k);
  ctl[p] = 'human';
  sendSeats();
  seatsChanged(old);
}

// Host, new game: connected devices keep their players, dropped ones stay 'away' (their timer runs on),
// free players go to the computer, and watching devices get any free player.
function syncCtl() {
  const prevOwner = owner, prevCtl = ctl;
  owner = [0]; ctl = ['human'];
  for (let p = 1; p < st.n; p++) {
    const k = prevOwner[p] ?? -1;
    if (k > 0 && live(k)) { owner[p] = k; ctl[p] = 'human'; }
    else if (prevCtl[p] === 'away') { owner[p] = k; ctl[p] = 'away'; }
    else { owner[p] = -1; ctl[p] = 'cpu'; }
  }
  for (const k of sess.seats()) {
    if (k === 0 || owner.includes(k)) continue;
    const p = claim(k);
    if (p >= 0) { seatAt(p, k); ctl[p] = 'human'; }
  }
  for (let p = 0; p < st.n; p++) netNames[p] = p === 0 ? cfg.names[0] || '' : owner[p] > 0 ? seatNames[owner[p]] || '' : '';
}
// Someone sat down or got up: a short remark from that seat, then carry on.
function seatsChanged(old) {
  for (let p = 0; p < st.n; p++) {
    if (!old[p] || old[p] === ctl[p] || over) continue;
    if (ctl[p] === 'human' && old[p] === 'cpu') say(p, t('qgf.say.hi'));
    if (ctl[p] === 'cpu') say(p, t('qgf.say.cpu'));
  }
  if (online() && !sess.host && me() >= 0) saveMe(me());
  fillSettings();
  render();
  maybeAI();
}
function setCtl(p, c) {
  if (p >= st.n || ctl[p] === c) return;
  const old = ctl.slice();
  ctl[p] = c;
  sendSeats();
  seatsChanged(old);
}
function awayLater(s, p, ms = AWAY_MS) {
  clearTimeout(awayTimers[p]);
  awayTimers[p] = setTimeout(() => {
    if (sess !== s || ctl[p] !== 'away') return;
    setCtl(p, 'cpu');
    const watcher = s.seats().find((k) => k > 0 && !owner.includes(k)); // someone watching takes the seat
    if (watcher !== undefined) takeSeat(watcher);
  }, ms);
}

function onSession(s) {
  sess = s;
  clearTimeout(timer);
  ctl = []; owner = []; netNames = []; seatNames = {}; joined = {}; pending = false; everLinked = false; started = false;
  const netDlg = document.getElementById('mg-online');
  paused = s.host && !!netDlg?.open;
  s.on('status', () => { if (sess !== s) return; render(); maybeAI(); });
  s.on('peer-join', ({ seat }) => {
    if (sess !== s) return;
    if (!s.host) {
      // tell the host who we are (and which player we were, in case it reloaded and reshuffled seats)
      everLinked = true;
      s.send('hi', { name: cfg.names[0] || '', was: loadMe() });
      return;
    }
    sendState(seat); // the table as it is; the guest's player follows once it says hi
    const p = owner.indexOf(seat);
    if (p > 0 && p < st.n) { seatAt(p, seat); setCtl(p, 'human'); } // same device back on its seat
  });
  s.on('peer-leave', ({ seat }) => {
    if (sess !== s) return;
    if (!s.host) { pending = false; render(); return; }
    const p = owner.indexOf(seat);
    if (p <= 0 || p >= st.n) return render();
    setCtl(p, 'away');
    awayLater(s, p);
    // The link reopened in a new tab reaches us before the old tab is noticed gone (~7 s), so that device got a
    // computer's player although it said it was p (same browser). Move it to p, unless it is in the middle of a move.
    // (A device we don't know — another browser — can't be told apart from a newcomer; it keeps its seat.)
    for (const [k, j] of Object.entries(joined)) {
      if (Date.now() - j.at > 15000 || j.was !== p || !live(+k) || owner[j.p] !== +k || actor() === j.p) continue;
      delete joined[k];
      const old = ctl.slice();
      owner[j.p] = -1; ctl[j.p] = 'cpu';
      seatAt(p, +k); ctl[p] = 'human';
      sendSeats();
      seatsChanged(old);
      break;
    }
  });
  s.on('hi', (d, { seat }) => {
    if (!s.host || sess !== s) return;
    seatNames[seat] = String(d?.name ?? '').slice(0, 14);
    const p = owner.indexOf(seat);
    if (p > 0 && p < st.n) { netNames[p] = seatNames[seat]; setCtl(p, 'human'); sendSeats(); render(); return; }
    takeSeat(seat, d?.was);
  });
  s.on('name', (d, { seat }) => {
    if (!s.host || sess !== s) return;
    seatNames[seat] = String(d?.name ?? '').slice(0, 14);
    const p = owner.indexOf(seat);
    if (p > 0) netNames[p] = seatNames[seat];
    sendSeats();
    render();
  });
  s.on('seats', (d) => {
    if (s.host || sess !== s) return;
    const old = ctl.slice();
    ctl = d.ctl; owner = d.owner; netNames = d.names; paused = d.paused;
    seatsChanged(old);
  });
  s.on('state', (d) => {
    if (s.host || sess !== s) return;
    st = d.st; over = false; history = []; sel = { to: -1, suit: -1 }; fresh = null; pending = false;
    nextFirst = d.first;
    ctl = d.ctl; owner = d.owner; netNames = d.names; paused = d.paused;
    if (me() >= 0) saveMe(me());
    calm(); hush();
    $('#result').hidden = true;
    fillSettings();
    if (QGF.isOver(st)) finish(); else render();
  });
  s.on('move', (d, { seat }) => {
    if (sess !== s) return;
    if (s.host) {
      // only the device playing the acting player may move, and only a legal move on the current position;
      // rebuilt from known fields only, so nothing else a guest stuffs into it gets relayed
      const m = d?.m?.t === 'ask' ? { t: 'ask', to: d.m.to, suit: d.m.suit } : d?.m?.t === 'answer' ? { t: 'answer', yes: d.m.yes === true } : null;
      const p = owner.indexOf(seat);
      if (over || paused || p < 0 || p !== actor() || ctl[p] !== 'human' || d?.n !== st.moves || !QGF.isLegal(st, m)) return sendState(seat);
      doMove(m);
      return;
    }
    pending = false;
    if (!st || d.n !== st.moves || !QGF.isLegal(st, d.m)) return s.send('resync');
    doMove(d.m, true);
  });
  s.on('resync', (_, { seat }) => { if (s.host && sess === s) sendState(seat); });
  if (s.host) {
    // While the host watches the room fill up, the table waits; "let's play" (closing the dialog) starts it.
    if (netDlg && !netDlg.dataset.qgf) {
      netDlg.dataset.qgf = '1';
      new MutationObserver(() => {
        if (!online() || !sess.host) return;
        const p = netDlg.open;
        if (p === paused) return;
        paused = p;
        if (!p) started = true;
        sendSeats();
        render();
        maybeAI();
      }).observe(netDlg, { attributes: true, attributeFilter: ['open'] });
    }
    const saved = JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
    if (saved?.st) {
      // Back after a reload. Guests reconnect on their own (possibly on other room seats) and say which
      // player they were; until then their players count as dropped out.
      st = saved.st; nextFirst = saved.first; netNames = saved.names || []; started = !!saved.started;
      history = []; sel = { to: -1, suit: -1 }; fresh = null; over = false;
      ctl = Array.from({ length: st.n }, (_, p) => (p === 0 ? 'human' : saved.ctl?.[p] === 'cpu' ? 'cpu' : 'away'));
      owner = Array.from({ length: st.n }, (_, p) => (p === 0 ? 0 : -1));
      // (finding a reloaded host takes the guests longer than a guest reload, so wait longer)
      for (let p = 1; p < st.n; p++) if (ctl[p] === 'away') awayLater(s, p, AWAY_MS * 4);
      calm(); hush();
      $('#result').hidden = true;
      fillSettings();
      if (QGF.isOver(st)) finish(); else { render(); maybeAI(); }
      // A match already under way just carries on: don't hold it behind the room dialog that net.js
      // reopens while the guests find us again (the seats show who is still offline).
      if (started) setTimeout(() => { if (sess === s && netDlg?.open) netDlg.close(); }, 0);
    } else newGame();
  } else { clearTimeout(timer); over = false; $('#result').hidden = true; fillSettings(); render(); }
}

function endSession() {
  if (sess) sessionStorage.removeItem(roomKey(sess));
  sess = null;
  ctl = []; owner = []; netNames = []; seatNames = {}; paused = false; pending = false;
  Object.values(awayTimers).forEach(clearTimeout);
  newGame();
}

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
newGame(cfg.n, 0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  maxPlayers: () => cfg.n,
  onSession,
  onEnd: endSession,
});
if (!online()) showOnce('how', SLUG);
