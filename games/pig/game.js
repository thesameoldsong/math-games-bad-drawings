import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, curve, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { PIG } from './engine.js';
import './strings.js';

const SLUG = 'pig';
const COLORS = [
  PALETTE.blue, PALETTE.red,
  ...[2, 3, 4, 5, 6, 7].map((i) => ({ main: `var(--pig-c${i})`, text: `var(--pig-c${i}-text)`, fill: `var(--pig-c${i}-fill)`, dark: `var(--pig-c${i}-face)` })),
];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');
const arena = $('#arena');

const cfg = Object.assign({ players: 2, dice: 2, mode: 'pvp', names: [] }, JSON.parse(localStorage.getItem('mg-pig') || '{}'));
cfg.names = Array.from({ length: 8 }, (_, i) => cfg.names[i] || '');
const saveCfg = () => localStorage.setItem('mg-pig', JSON.stringify(cfg));

let st, history = [], shapes = {}, over = false, aiTimer, nextFirst = 0, lastEv = null, lockUntil = 0, pending = false;
let sess = null;                    // online session (shared/net.js), null when playing locally
const netNames = Array(8).fill(''); // online: every seat's name as the host knows it
// Online, who plays each seat (host decides, guests mirror it):
//   'human' — a device is at this seat; 'cpu' — the computer (3+ players only);
//   'away'  — the device left (3+ players: the computer takes over after AWAY_MS); 'open' — 2 players, nobody joined yet.
let ctrl = [];
const takeover = new Set();         // host: seats a newly joined guest takes over once the computer's current turn ends
const awayTimers = {};
const AWAY_MS = 12000;
let guestEnded = false;
// Game seats vs. net seats: net.js numbers guests in the order they (re)connect, which after a host reload
// can differ from who sat where. So every tab has its own id; the host remembers which id owns each game seat
// and maps each connected net seat to its game seat (guests learn theirs from 'state').
const TAB_KEY = 'mg-pig-tab';
const tabId = sessionStorage.getItem(TAB_KEY) || Math.random().toString(36).slice(2, 12);
sessionStorage.setItem(TAB_KEY, tabId);
// …and every browser has a device id, so reopening the link in a new tab gets the old seat back.
const DEV_KEY = 'mg-pig-dev';
const devId = localStorage.getItem(DEV_KEY) || Math.random().toString(36).slice(2, 12);
localStorage.setItem(DEV_KEY, devId);
let owner = [];                      // host: game seat → tab id of the device that plays it
let ownerDev = [];                   // host: game seat → device id
const parked = new Map();            // host: net seat → {d, timer}: a new tab whose device's old tab still looks connected
const PARK_MS = 10000;
let synced = false;                  // guest: got the host's state at least once in this session
const n2g = new Map();               // host: connected net seat → game seat
let myG = null;                      // guest: my game seat, as told by the host
const moods = Array.from({ length: 8 }, () => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
// (a guest has no seat until the host's first 'state' says which one is theirs)
const mySeat = () => (sess.host ? 0 : synced ? myG ?? sess.seat : -1);
const gOf = (k) => (k === 0 ? 0 : n2g.has(k) ? n2g.get(k) : -1);   // host: net seat → game seat (-1: not yet known)
const liveG = () => [0, ...n2g.values()];                         // host: game seats with a device right now
const nPlayers = () => (online() && !sess.host ? (st ? st.n : 2) : cfg.players);
const isAI = (p) => (online() ? ctrl[p] === 'cpu' : cfg.mode !== 'pvp' && p !== 0);
const isLocal = (p) => (online() ? p === mySeat() : !isAI(p));
// Online the guest needs the host; the host needs a guest only in a duel (3+ players: the computer fills in).
const netOk = () => !online() || (sess.host ? sess.connected || st.n > 2 : sess.connected && synced);
const canAct = () => !over && isLocal(st.turn) && !isAI(st.turn) && netOk() && !pending && Date.now() >= lockUntil;
function name(p) {
  if (isAI(p)) return st.n > 2 ? t('pig.cpu.n', { n: p }) : t('pig.cpu');
  const n = online() && p !== mySeat() ? netNames[p] : cfg.names[p];
  return (n && n.trim()) || t('pig.name' + p);
}
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- player cards ----------
function buildCards(n) {
  if (arena.dataset.n === String(n)) return;
  arena.querySelectorAll('.player').forEach((el) => el.remove());
  const wrap = arena.querySelector('.board-wrap');
  for (let p = 0; p < n; p++) {
    wrap.insertAdjacentHTML('beforebegin', `
      <div class="player p${p}" data-p="${p}">
        <div class="fig-wrap"><div class="bubble" style="color:${COLORS[p].main}"></div><div class="fig"></div></div>
        <input type="text" class="name" maxlength="14" spellcheck="false">
        <div class="score"></div>
      </div>`);
  }
  arena.querySelectorAll('.player .name').forEach((inp) =>
    inp.addEventListener('input', () => {
      const p = +inp.closest('.player').dataset.p;
      cfg.names[p] = inp.value;
      saveCfg();
      if (online()) {
        if (sess.host) { netNames[0] = inp.value; sendNames(); }
        else hello();
      }
      render();
    }));
  // grid areas: two cards per row on phones; on desktop the cards flank the board
  const rows = [], drows = [];
  for (let r = 0; r < Math.ceil(n / 2); r++) {
    const a = `p${2 * r}`, b = 2 * r + 1 < n ? `p${2 * r + 1}` : '.';
    rows.push(`"${a} ${b}"`);
    drows.push(`"info ${a} board ${b} play"`);
  }
  arena.dataset.n = n;
  arena.style.setProperty('--areas-m', `${rows.join(' ')} "board board" "status status"`);
  arena.style.setProperty('--areas-d', `${drows.join(' ')} ". . status . ."`);
}

// ---------- board geometry ----------
const W = 360, X0 = 26, X1 = 326;
function layout() {
  const n = st.n, gap = n <= 2 ? 17 : n <= 4 ? 12 : 10.5;
  const ty = 30, tb = ty + (n - 1) * gap;
  const dy = tb + 82;
  return { gap, ty, tb, dy, ly: dy + 74, ky: dy + 110, H: dy + 132 };
}
const xOf = (v) => X0 + ((X1 - X0) * Math.min(v, st.target)) / st.target;

const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

function roundedSquare(cx, cy, s) {
  const h = s / 2, r = s * 0.2, j = () => (Math.random() * 2 - 1) * 0.7;
  const pts = [];
  // clockwise from the top-right corner: each corner is a quarter circle, sides are the gaps between them
  const corners = [[cx + h - r, cy - h + r], [cx + h - r, cy + h - r], [cx - h + r, cy + h - r], [cx - h + r, cy - h + r]];
  corners.forEach(([ccx, ccy], q) => {
    for (let i = 0; i <= 2; i++) {
      const a = -Math.PI / 2 + (q + i / 2) * (Math.PI / 2);
      pts.push([ccx + Math.cos(a) * r + j(), ccy + Math.sin(a) * r + j()]);
    }
  });
  pts.push([pts[0][0] + 2 + j(), pts[0][1] + j()]);
  return curve(pts);
}

function dieSVG(key, cx, cy, s, v, opts) {
  const tilt = shapeFor(key + 'r', () => (Math.random() * 2 - 1) * 9);
  const body = shapeFor(key + 'b', () => roundedSquare(0, 0, s));
  const pipR = s * 0.085, u = s * 0.26;
  let o = `<g class="die${opts.idle ? ' idle' : ''}" transform="translate(${cx} ${cy})"><g class="tumbler${opts.fresh ? ' fresh' : ''}"><g transform="rotate(${tilt.toFixed(1)})">`;
  o += `<path d="${body}" class="die-body"${opts.ring ? ` stroke="${opts.ring}"` : ''}/>`;
  for (const [a, b] of PIPS[v]) {
    const pr = v === 1 ? pipR * 1.45 : pipR;
    o += `<path d="${shapeFor(key + 'p' + a + b + v, () => circle(a * u, b * u, pr, pr, 0.1))}" class="pip${v === 1 ? ' one' : ''}"/>`;
  }
  if (opts.cross) {
    const c = s * 0.42;
    o += `<path class="cross" d="${shapeFor(key + 'x1', () => line(-c, -c, c, c, 2))}"/><path class="cross" d="${shapeFor(key + 'x2', () => line(c, -c, -c, c, 2))}"/>`;
  }
  return o + '</g></g></g>';
}

function render(anim = false) {
  const L = layout();
  svg.setAttribute('viewBox', `0 0 ${W} ${L.H}`);
  let out = '';

  // race track: one lane per player, finish line at 100
  out += `<text class="trk-lbl" x="${X0}" y="${L.ty - 13}">0</text><text class="trk-lbl" x="${(X0 + X1) / 2}" y="${L.ty - 13}">${st.target / 2}</text>`;
  for (const v of [st.target / 4, st.target / 2, (st.target * 3) / 4]) {
    out += `<path class="tick" d="${shapeFor('tk' + v, () => line(xOf(v), L.ty - 7, xOf(v), L.tb + 7, 0.6))}"/>`;
  }
  const fin = shapeFor('fin', () => line(X1, L.ty - 9, X1, L.tb + 9, 0.8));
  out += `<path class="finish" d="${fin}"/>`;
  out += `<path class="flag" d="M${X1} ${L.ty - 9} l0 -14 l16 4 l-16 5" filter="url(#mg-crayon)"/>`;
  out += `<text class="trk-lbl goal" x="${X1 + 20}" y="${L.ty + (L.tb - L.ty) / 2}">${st.target}</text>`;
  const sw = st.n <= 2 ? 7 : st.n <= 4 ? 6 : 4.5;
  for (let p = 0; p < st.n; p++) {
    const y = L.ty + p * L.gap, c = COLORS[p];
    out += `<path class="lane" d="${shapeFor('ln' + p + '_' + st.n, () => line(X0, y, X1, y, 0.8))}"/>`;
    const s = st.scores[p];
    if (s > 0) out += `<path class="prog" stroke="${c.main}" stroke-width="${sw}" d="${shapeFor('pg' + p + '_' + s, () => line(X0, y, xOf(s), y, 0.9))}"/>`;
    if (p === st.turn && st.k > 0 && !over) {
      out += `<path class="pend" stroke="${c.main}" stroke-width="${sw}" d="M${xOf(s).toFixed(1)} ${y} L${xOf(s + st.k).toFixed(1)} ${y}"/>`;
    }
    const mx = xOf(s + (p === st.turn && !over ? st.k : 0));
    out += `<path class="marker" fill="${c.main}" stroke="${c.text}" d="${shapeFor('mk' + p, () => circle(0, 0, sw * 0.9 + 1.5, sw * 0.9 + 1.5, 0.08))}" transform="translate(${mx.toFixed(1)} ${y})"/>`;
  }

  // dice
  const last = st.last;
  const rolled = lastEv && lastEv.type !== 'hold' && last && lastEv.p === last.p;
  const fresh = anim && rolled;
  const mine = last && !over && last.p === st.turn && st.rolls.length > 0;
  const showLast = last && (mine || rolled || over);
  const faces = last ? last.d : st.dice === 2 ? [3, 4] : [4];
  const idle = !showLast;
  const rollKey = last ? 'm' + st.moves : 'idle';
  const size = st.dice === 2 ? 82 : 90, cx = W / 2;
  const ring = last && (last.kind === 'double' || last.kind === 'snake') && showLast ? COLORS[last.p].main : null;
  faces.forEach((v, i) => {
    const x = faces.length === 2 ? cx + (i ? 1 : -1) * (size / 2 + 12) : cx;
    out += dieSVG(`d${i}${rollKey}`, x, L.dy, size, v, { fresh, idle, ring,
      cross: showLast && last.kind === 'bust' && v === 1 });
  });
  out += `<rect class="dice-hit" x="${cx - 100}" y="${L.dy - 50}" width="200" height="100" fill="transparent"/>`;
  if (last && last.kind === 'snake' && showLast) {
    for (const [sx, sy] of [[-1, -1], [1, -0.6], [-0.7, 1.1], [1.1, 0.9]]) {
      const x = cx + sx * (size + 26), y = L.dy + sy * 34;
      out += `<path class="spark" d="M${x} ${y - 9} L${x} ${y + 9} M${x - 9} ${y} L${x + 9} ${y}" stroke="${COLORS[last.p].main}"/>`;
    }
  }

  // what happened + turn total
  let msg = '', mcol = 'var(--ink)';
  if (lastEv && lastEv.type === 'hold') { msg = t('pig.r.hold', { name: name(lastEv.p), k: lastEv.banked }); mcol = COLORS[lastEv.p].main; }
  else if (showLast && last) {
    mcol = last.kind === 'bust' ? 'var(--red-dark)' : COLORS[last.p].main;
    if (last.kind === 'bust') msg = lastEv && lastEv.type === 'bust' && lastEv.lost ? t('pig.r.bust', { k: lastEv.lost }) : t('pig.r.bust0');
    else msg = t('pig.r.' + last.kind, { g: last.g });
  }
  out += `<text class="roll-msg${anim ? ' fresh' : ''}" x="${cx}" y="${L.ly}" fill="${mcol}">${esc(msg)}</text>`;
  if (!over) {
    const kc = COLORS[st.turn];
    out += `<text class="turn-total" x="${cx}" y="${L.ky}" fill="${kc.main}">${esc(st.k ? t('pig.turnpts', { k: st.k }) : t('pig.turnzero'))}</text>`;
  }
  svg.innerHTML = out;
  svg.classList.toggle('can-roll', canAct());
  renderPlayers();
  persist();
}

function renderPlayers() {
  for (let p = 0; p < st.n; p++) {
    const el = $(`.player.p${p}`);
    if (!el) continue;
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p % 2 === 0 ? 'right' : 'left', seed: 13 + p * 29,
    });
    const sc = el.querySelector('.score');
    // online: "you" on this device's own seat, "offline" on a seat whose device left
    const tag = !online() ? '' : p === mySeat() ? t('net.you') : ctrl[p] === 'away' ? t('pig.online.off') : '';
    sc.innerHTML = esc(plural(st.scores[p], 'pig.pts')) + (active && st.k ? ` <span class="pend-pts" style="color:${COLORS[p].main}">+${st.k}</span>` : '')
      + (tag ? ` <span class="seat-tag${ctrl[p] === 'away' ? ' off' : ''}">${esc(tag)}</span>` : '');
    el.classList.toggle('away', online() && ctrl[p] === 'away');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const start = st.rolls.length === 0, tn = st.turn;
  if (over) status.textContent = '';
  else if (online() && !sess.host && !synced) status.textContent = t('net.joining') + '…';
  else if (online() && !netOk()) status.textContent = t(sess.host || st.n === 2 ? 'pig.online.wait' : 'pig.online.hostlost');
  else if (online() && mySeat() >= st.n) status.textContent = t('pig.online.watch', { n: st.n });
  else if (online() && ctrl[mySeat()] === 'cpu') status.textContent = t('pig.online.takeover');
  else if (online() && isLocal(tn)) status.textContent = t(start ? 'pig.turn.youstart' : 'pig.turn.you');
  else if (online() && ctrl[tn] === 'away') status.textContent = t(st.n > 2 ? 'pig.online.away.n' : 'pig.online.wait', { name: name(tn) });
  else if (isAI(tn)) status.textContent = t('pig.thinking', { name: name(tn) });
  else if (online()) status.textContent = t('pig.turn.them', { name: name(tn) });
  else status.textContent = t(start ? 'pig.turn.start' : 'pig.turn', { name: name(tn) });
  status.style.color = COLORS[tn].main;

  const roll = $('#roll'), hold = $('#hold'), act = canAct();
  roll.textContent = t('pig.roll');
  hold.textContent = st.k && !over ? t('pig.hold.n', { k: st.k }) : t('pig.hold');
  roll.disabled = !act;
  hold.disabled = !act || !PIG.canHold(st);
  const c = COLORS[st.turn];
  roll.style.background = act ? c.main : '';
  roll.style.borderColor = act ? c.text : '';
  roll.style.color = act ? 'var(--on-accent)' : '';
  hold.style.borderColor = act && PIG.canHold(st) ? c.text : '';
  hold.style.color = act && PIG.canHold(st) ? c.text : '';

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  const pl = $('#players');
  pl.disabled = !canRestart();
  // the host can't shrink the table below a seat that has a device at it
  const minN = online() && sess.host ? Math.max(2, ...liveG().map((g) => g + 1)) : 2;
  pl.querySelectorAll('option').forEach((o) => (o.disabled = +o.value < minN));
  if (online() && !sess.host) pl.value = st.n;
  $('#dice').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('pig.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t(sess.host ? 'pig.online.note.host' : 'pig.online.note') : cfg.mode !== 'pvp' && cfg.players > 2 ? t('pig.mode.note') : '';
}

const bubbleTimers = [];
function say(p, key, vars) {
  const b = $(`.player.p${p} .bubble`);
  if (!b) return;
  b.textContent = t(key, vars);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
// a reaction that comes a moment later (cancelled by undo / restart)
let laterTimers = [];
const later = (fn, ms) => laterTimers.push(setTimeout(fn, ms));
function hush() {
  laterTimers.forEach(clearTimeout); laterTimers = [];
  bubbleTimers.forEach(clearTimeout);
  arena.querySelectorAll('.bubble.show').forEach((b) => b.classList.remove('show'));
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const others = (p) => [...Array(st.n).keys()].filter((q) => q !== p);
// the opponent who reacts: in a duel the other player, otherwise the current leader among the rest
const rivalOf = (p) => others(p).reduce((a, b) => (st.scores[b] > st.scores[a] ? b : a));

// ---------- flow ----------
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  hush();
  const n = nPlayers();
  buildCards(n);
  st = PIG.create({ players: n, dice: cfg.dice, first: first % n });
  nextFirst = (st.turn + 1) % n;
  history = []; shapes = {}; over = false; lastEv = null; lockUntil = 0; pending = false;
  if (online() && sess.host) seatCtrl();
  moods.forEach((_, p) => setMood(p, 'neutral'));
  $('#result').hidden = true;
  render();
  maybeAI();
}

// Host: everything that changes the game goes through here, so every guest sees the same action.
function commit(full) {
  if (online() && sess.host) sess.send('act', { act: full, n: st.moves });
  perform(full);
}

function perform(act) {
  history.push(PIG.clone(st));
  const ev = PIG.apply(st, act);
  lastEv = ev;
  react(ev);
  if (online() && sess.host && takeover.size) handOver();
  if (ev.type === 'win') return finish();
  if (ev.type === 'bust' || ev.type === 'hold') {
    lockUntil = Date.now() + (ev.type === 'bust' ? 850 : 450);
    setTimeout(() => { if (!over) renderPlayers(); svg.classList.toggle('can-roll', canAct()); }, lockUntil - Date.now() + 20);
  }
  render(true);
  maybeAI();
}

function react(ev) {
  const p = ev.p, r = rivalOf(p);
  if (ev.type === 'roll') {
    if (ev.kind === 'snake') {
      setMood(p, 'happy', 'up'); setMood(r, 'worried'); say(p, 'pig.say.snake');
    } else if (ev.kind === 'double') {
      setMood(p, 'happy', 'wave'); setMood(r, 'worried');
      if (Math.random() < 0.75) say(p, 'pig.say.double');
    } else if (ev.k >= 30) {
      setMood(p, 'smug', 'point'); setMood(r, 'worried');
      if (Math.random() < 0.4) say(r, 'pig.say.stop');
      else if (Math.random() < 0.3) say(p, 'pig.say.greedy');
    } else {
      setMood(p, ev.k >= 15 ? 'happy' : 'neutral'); if (moods[r].mood !== 'worried') setMood(r, 'neutral');
    }
  } else if (ev.type === 'bust') {
    const big = ev.lost >= 20;
    setMood(p, big ? 'worried' : 'sad');
    say(p, big ? 'pig.say.bustbig' : 'pig.say.bust');
    if (ev.lost >= 10) { setMood(r, 'smug', 'wave'); if (big || Math.random() < 0.5) later(() => say(r, 'pig.say.gloat'), 700); }
    else setMood(r, 'neutral');
  } else if (ev.type === 'hold') {
    if (ev.banked >= 30) {
      setMood(p, 'happy', 'wave'); setMood(r, 'worried');
      say(p, 'pig.say.bankbig');
      if (Math.random() < 0.4) later(() => say(r, 'pig.say.worry'), 700);
    } else {
      setMood(p, ev.banked >= 15 ? 'happy' : 'neutral');
      if (Math.random() < 0.35) say(p, 'pig.say.bank');
      setMood(r, 'neutral');
    }
  }
  const nx = st.turn;
  if (ev.type !== 'roll' && nx !== r && nx !== p) setMood(nx, 'neutral');
}

// Online only the host runs the computer seats (at the normal level unless the host picked another one offline).
const aiLevel = () => (cfg.mode === 'pvp' ? 'normal' : cfg.mode);
function maybeAI() {
  clearTimeout(aiTimer);
  if (over || !isAI(st.turn) || (online() && !sess.host)) return;
  const delay = st.rolls.length === 0 ? 1150 : 800;
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    const a = PIG.aiAction(st, aiLevel());
    commit(a === 'hold' ? { a: 'hold' } : { a: 'roll', d: PIG.throwDice(st.dice) });
  }, delay);
}

function finish() {
  over = true;
  clearTimeout(aiTimer);
  const w = st.winner;
  for (const q of others(w)) setMood(q, 'sad');
  setMood(w, 'happy', 'up');
  say(w, 'pig.say.win');
  later(() => say(rivalOf(w), 'pig.say.lose'), 900);
  fillResult();
  render(true);
  later(() => { if (over) $('#result').hidden = false; }, 1100);
}

function fillResult() {
  const w = st.winner, txt = $('#result-text');
  txt.textContent = t('pig.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  const order = [...Array(st.n).keys()].sort((a, b) => st.scores[b] - st.scores[a]);
  $('#result-scores').innerHTML = (st.n === 2 ? [w, 1 - w] : order)
    .map((p) => `<span style="color:${COLORS[p].main}">${esc(name(p))}&nbsp;${st.scores[p]}</span>`).join(' · ');
  $('#result-next').textContent = t('pig.next', { name: name(nextFirst) });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  hush();
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; lastEv = null; lockUntil = 0;
  moods.forEach((_, p) => setMood(p, 'neutral'));
  $('#result').hidden = true;
  render();
  maybeAI();
}

// Online, only the room creator may restart (and change the dice / player count); guests follow.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- local input ----------
function act(a) {
  if (!canAct()) return;
  if (a === 'hold' && !PIG.canHold(st)) return;
  if (online() && !sess.host) {
    pending = true;
    sess.send('req', { a, n: st.moves });
    renderPlayers();
    return;
  }
  commit(a === 'hold' ? { a: 'hold' } : { a: 'roll', d: PIG.throwDice(st.dice) });
}

// ---------- online ----------
// Host is authoritative and owns the dice: a guest asks to roll/bank for its own seat ('req'), the host
// validates it, throws and broadcasts the result ('act' with the action counter). Pig has no hidden
// information, so every device gets the same public state. State is re-sent on join, restart and mismatch.
// 3+ players: seats without a device are played by the computer (run on the host); a guest who joins
// mid-game takes over its seat right away, or — if the computer is in the middle of that seat's turn —
// once that turn ends. A guest who leaves is shown as offline; after AWAY_MS the computer takes over.
const hello = () => sess.send('name', { name: cfg.names[synced ? mySeat() : sess.seat] || '', id: tabId, dev: devId });
const namesNow = () => netNames.map((x, k) => (k === 0 ? cfg.names[0] : x));
function sendNames() { sess.send('names', { names: namesNow() }); }
// to: a net seat, or every connected guest; each one is told its own game seat
function sendState(to) {
  for (const k of to === undefined ? [...n2g.keys()] : [to]) {
    if (gOf(k) > 0) sess.send('state', { st, over, names: namesNow(), ctrl, nextFirst, you: gOf(k) }, { to: k });
  }
}
// Host: a guest at net seat k with tab id `id` introduced itself — find its game seat.
const takenBy = (k) => new Set([...n2g].filter(([kk]) => kk !== k).map(([, g]) => g));
function bind(k, id, dev) {
  n2g.delete(k);
  const taken = new Set(n2g.values());
  let g = owner.findIndex((x, i) => i > 0 && x === id && !taken.has(i));
  if (g < 0 && dev) g = ownerDev.findIndex((x, i) => i > 0 && x === dev && !taken.has(i));
  if (g < 0) {
    const free = [];
    for (let i = 1; i < sess.maxPlayers; i++) if (!taken.has(i)) free.push(i);
    // a newcomer prefers a seat nobody has claimed yet, so a known player's seat stays theirs
    g = (free.includes(k) && !owner[k] ? k : free.find((i) => !owner[i])) ?? (free.includes(k) ? k : free[0] ?? k);
  }
  owner[g] = id;
  ownerDev[g] = dev;
  n2g.set(k, g);
  return g;
}
// Host: seat a guest that introduced itself. If this device's seat is still held by its old tab (closed, but not
// timed out yet), wait for that tab to drop — or PARK_MS, in case both tabs really are open — before seating it.
function admit(k, d, force = false) {
  const id = String(d?.id || 'net' + k), dev = String(d?.dev || '');
  const taken = takenBy(k);
  const free = (arr, v) => v && arr.some((x, i) => i > 0 && x === v && !taken.has(i));
  if (!force && !parked.has(k) && !free(owner, id) && !free(ownerDev, dev) && dev && ownerDev.some((x, i) => i > 0 && x === dev && taken.has(i))) {
    parked.set(k, { d, timer: setTimeout(() => unpark(k, true), PARK_MS) });
    return;
  }
  const g = bind(k, id, dev);
  netNames[g] = String(d?.name ?? '').slice(0, 14);
  seatJoined(g);
  sendState(k);
  sendCtrl();
  sendNames();
  render();
  if (over) fillResult();
  maybeAI();
}
function unpark(k, force = false) {
  const p = parked.get(k);
  if (!p) return;
  clearTimeout(p.timer);
  parked.delete(k);
  if (sess?.host) admit(k, p.d, force);
}
const sendCtrl = () => sess.send('seats', { ctrl });

// The host keeps the match in sessionStorage (per room code), so reloading the host's tab doesn't wipe it.
const roomKey = (s) => `mg-pig-room-${s.code}`;
function persist() {
  if (online() && sess.host && st) sessionStorage.setItem(roomKey(sess), JSON.stringify({ st, over, nextFirst, ctrl, names: netNames, owner, ownerDev }));
}
function restore(saved) {
  clearTimeout(aiTimer);
  hush();
  buildCards(saved.st.n);
  st = saved.st; over = saved.over; nextFirst = saved.nextFirst;
  history = []; shapes = {}; lastEv = null; lockUntil = 0; pending = false;
  saved.names.forEach((x, k) => (netNames[k] = x || ''));
  owner = saved.owner || [];
  ownerDev = saved.ownerDev || [];
  cfg.players = st.n; cfg.dice = st.dice; saveCfg();
  $('#players').value = st.n; $('#dice').value = st.dice;
  sess.setMaxPlayers(st.n);
  // nobody is connected yet right after the reload: guests' seats wait for their devices to come back
  ctrl = saved.ctrl.slice();
  ctrl.forEach((c, k) => { if (k > 0 && (c === 'human' || c === 'away')) seatLeft(k); });
  moods.forEach((_, p) => setMood(p, 'neutral'));
  $('#result').hidden = true;
  over ? finish() : render();
  maybeAI();
}

// Host: who plays each seat at the start of a game.
function seatCtrl() {
  const live = liveG();
  takeover.clear();
  ctrl = Array.from({ length: st.n }, (_, k) => (k === 0 || live.includes(k) ? 'human' : st.n > 2 ? 'cpu' : 'open'));
  for (const k in awayTimers) { clearTimeout(awayTimers[k]); delete awayTimers[k]; }
}
// Host: a joined guest replaces the computer once the computer isn't halfway through that seat's turn.
function handOver() {
  let changed = false;
  for (const k of [...takeover]) {
    if (over || st.turn !== k || st.rolls.length === 0) { takeover.delete(k); ctrl[k] = 'human'; changed = true; }
  }
  if (changed) sendCtrl();
}
function seatJoined(k) {
  clearTimeout(awayTimers[k]); delete awayTimers[k];
  if (k >= st.n) return;
  if (ctrl[k] === 'cpu' && !over && st.turn === k && st.rolls.length > 0) takeover.add(k);
  else ctrl[k] = 'human';
}
function seatLeft(k) {
  takeover.delete(k);
  if (k >= st.n) return;
  ctrl[k] = 'away';
  if (st.n > 2) {
    awayTimers[k] = setTimeout(() => {
      delete awayTimers[k];
      if (!sess || ctrl[k] !== 'away') return;
      ctrl[k] = 'cpu';
      sendCtrl();
      render();
      maybeAI();
    }, AWAY_MS);
  }
}

function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  netNames.fill('');
  ctrl = [];
  takeover.clear();
  owner = []; ownerDev = []; n2g.clear(); myG = null; synced = false;
  parked.forEach((p) => clearTimeout(p.timer)); parked.clear();
  s.on('status', () => { if (s === sess) render(); });
  s.on('roster', () => { if (s === sess) renderPlayers(); });
  s.on('peer-join', ({ seat }) => {
    if (s !== sess) return;
    if (!s.host) { hello(); return; }
    n2g.delete(seat);   // (re)connected: its game seat is settled when its 'name' arrives
    renderPlayers();
  });
  s.on('peer-leave', ({ seat }) => {
    if (s !== sess || !s.host) return;
    if (parked.has(seat)) { clearTimeout(parked.get(seat).timer); parked.delete(seat); }
    const g = gOf(seat);
    n2g.delete(seat);
    if (g < 0) return;
    seatLeft(g);
    sendCtrl();
    render();
    // a new tab of the same device was waiting for exactly this seat
    for (const [k, p] of parked) if (ownerDev[g] && String(p.d?.dev || '') === ownerDev[g]) { unpark(k); break; }
  });
  s.on('state', (d) => {
    if (s.host) return;
    buildCards(d.st.n);
    hush();
    st = d.st; over = d.over; history = []; shapes = {}; nextFirst = d.nextFirst; lastEv = null; pending = false; lockUntil = 0;
    ctrl = d.ctrl;
    const was = mySeat();
    myG = d.you ?? null;
    synced = true;
    if (mySeat() !== was) hello();
    d.names.forEach((x, k) => (netNames[k] = x || ''));
    $('#dice').value = st.dice;
    moods.forEach((_, p) => setMood(p, 'neutral'));
    $('#result').hidden = true;
    over ? finish() : render();
  });
  s.on('seats', (d) => { if (!s.host) { ctrl = d.ctrl; render(); } });
  s.on('names', (d) => {
    if (s.host) return;
    d.names.forEach((x, k) => (netNames[k] = x || ''));
    render();
    if (over) fillResult();
  });
  // A guest introduces itself (tab id + name) right after connecting, and again when its name changes.
  s.on('name', (d, { seat }) => {
    if (!s.host) return;
    if (parked.has(seat)) { parked.get(seat).d = d; return; }
    if (!n2g.has(seat)) return admit(seat, d);
    netNames[gOf(seat)] = String(d?.name ?? '').slice(0, 14);
    sendNames();
    render();
    if (over) fillResult();
  });
  s.on('req', (d, { seat }) => {
    if (!s.host) return;
    const g = gOf(seat);
    if (over || !d || g < 0 || st.turn !== g || ctrl[g] !== 'human' || d.n !== st.moves || (d.a !== 'roll' && d.a !== 'hold')
      || (d.a === 'hold' && !PIG.canHold(st))) return sendState(seat);
    commit(d.a === 'hold' ? { a: 'hold' } : { a: 'roll', d: PIG.throwDice(st.dice) });
  });
  s.on('act', (d) => {
    if (s.host) return;
    pending = false;
    if (d.n !== st.moves || !PIG.isLegal(st, d.act)) return s.send('resync');
    perform(d.act);
  });
  s.on('resync', (_, { seat }) => s.host && sendState(seat));
  const saved = s.host && JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
  if (saved?.st) restore(saved);
  else newGame(0);
}

$('#roll').addEventListener('click', () => act('roll'));
$('#hold').addEventListener('click', () => act('hold'));
svg.addEventListener('click', (e) => { if (e.target.closest('.die, .dice-hit')) act('roll'); });
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;   // keep Ctrl+R and other browser shortcuts working
  if (e.target.closest('input, select, textarea, a') || document.querySelector('dialog[open]')) return;
  if (e.target.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;   // the focused button handles these
  if (e.key === 'r' || e.key === ' ') { e.preventDefault(); act('roll'); }
  if (e.key === 'h' || e.key === 'Enter') { e.preventDefault(); act('hold'); }
});

$('#players').addEventListener('change', (e) => {
  if (!canRestart()) return;
  cfg.players = +e.target.value;
  saveCfg();
  if (online()) sess.setMaxPlayers(cfg.players);
  newGame(0);
  if (online()) sendState();
});
$('#dice').addEventListener('change', (e) => { cfg.dice = +e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(0); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.addEventListener('mg:lang', () => { render(); if (over) fillResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#players').value = cfg.players;
$('#dice').value = cfg.dice;
$('#mode').value = cfg.mode;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  // A guest turned away from a full room doesn't know the room's size; for that one moment report "more than
  // two" so net.js shows the generic "no free seats" text instead of "already has two players".
  maxPlayers: () => (guestEnded ? 8 : cfg.players),
  onSession,
  onEnd: () => {
    if (sess && !sess.host) { guestEnded = true; setTimeout(() => (guestEnded = false)); }
    sess = null; ctrl = []; $('#dice').value = cfg.dice; $('#players').value = cfg.players; newGame(0);
  },
});
if (!online()) showOnce('how', SLUG);
