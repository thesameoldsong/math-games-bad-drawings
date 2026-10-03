import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { UC } from './engine.js';
import './strings.js';

const SLUG = 'undercut';
const W = 360, H = 478;
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign(
  { mode: 'pvp', rules: 'classic', target: { ...UC.DEFAULT_TARGET }, names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'),
);
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, over;
let uncovered = null;   // hot-seat: the player who pressed "it's me" for the current pick
let revealing = false;  // fists are shaking, the round is about to be shown
let fresh = false;      // the last round was just revealed (animate it)
let revealTimer;
let sess = null;        // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const hotSeat = () => !online() && cfg.mode === 'pvp';
function name(p) {
  if (isAI(p)) return t('uc.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('uc.p' + p);
}
// Which player this screen is picking for right now (-1: nobody).
function picker() {
  if (over || revealing) return -1;
  if (online()) return sess.connected && st.pending[mySeat()] === null ? mySeat() : -1;
  if (!hotSeat()) return 0;
  return st.pending[0] === null ? 0 : 1;
}
const targetOpts = () => UC.TARGETS[cfg.rules];
const curTarget = () => {
  const v = cfg.target[cfg.rules];
  return targetOpts().includes(v) ? v : UC.DEFAULT_TARGET[cfg.rules];
};

// Every hand/stroke gets its wobble once, so redraws don't jitter.
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- drawing: hands ----------
// Fingers in local coordinates (palm centre at 0,0, pointing up): [base, raised tip, folded tip, width]
const FINGERS = [
  [[-19, 6], [-40, -20], [-4, 2], 12],    // thumb
  [[-14, -17], [-18, -60], [-13, -24], 11], // index
  [[-3, -20], [-3, -66], [-3, -27], 11],    // middle
  [[8, -18], [11, -60], [8, -25], 11],      // ring
  [[18, -11], [24, -44], [17, -18], 10],    // pinky
];
const RAISED = { 0: [], 1: [1], 2: [1, 2], 3: [1, 2, 3], 4: [1, 2, 3, 4], 5: [0, 1, 2, 3, 4] };

// n fingers up (0 = fist). Returns SVG markup in local coordinates; `key` caches the wobble.
function handSVG(n, color, key) {
  return shapeFor('hand' + key + '_' + n, () => withSeed(key.length * 97 + n * 13 + key.charCodeAt(0), () => {
    const up = RAISED[n];
    const segs = FINGERS.map(([b, tip, fold, w], i) => {
      const raised = up.includes(i);
      if (i === 0 && !raised) return null; // folded thumb is drawn across the palm
      const e = raised ? tip : fold;
      return { d: line(b[0], b[1], e[0], e[1], raised ? 2 : 0.6), w };
    }).filter(Boolean);
    segs.push({ d: line(0, 18, 1, 40, 1), w: 24 }); // wrist
    const palm = circle(0, 0, 23, 25, 0.06);
    const sw = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
    let s = '';
    for (const g of segs) s += `<path d="${g.d}" ${sw} stroke="${color.dark}" stroke-width="${g.w + 6}"/>`;
    s += `<path d="${palm}" fill="#fff" stroke="${color.dark}" stroke-width="5"/>`;
    for (const g of segs) s += `<path d="${g.d}" ${sw} stroke="#fff" stroke-width="${g.w}"/>`;
    let c = `<path d="${palm}" fill="${color.main}"/>`;
    for (const g of segs) c += `<path d="${g.d}" ${sw} stroke="${color.main}" stroke-width="${g.w}"/>`;
    s += `<g filter="url(#mg-crayon)" opacity=".9">${c}</g>`;
    if (!up.includes(0)) s += `<path d="${line(-20, 8, -2, 3, 0.8)}" ${sw} stroke="${color.dark}" stroke-width="3.5"/>`;
    // cuff
    s += `<path d="${line(-13, 32, 14, 32, 0.6)}" ${sw} stroke="${color.dark}" stroke-width="3.5"/>`;
    return s;
  }));
}

// ---------- rendering ----------
const txt = (x, y, s, { size = 22, color = INK, weight = 700, anchor = 'middle', cls = '' } = {}) =>
  `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;

function renderMeter() {
  const T = st.target, d = st.score[0] - st.score[1];
  const x0 = 34, x1 = W - 34, cx = W / 2, half = (x1 - x0) / 2, y = 38;
  let s = '';
  s += `<path d="${shapeFor('track', () => line(x0, y, x1, y, 1.2))}" stroke="${PALETTE.pencil}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const n = T <= 21 ? T : 10;
  for (let i = -n; i <= n; i++) {
    const x = cx + (i * half) / n, big = i === 0;
    s += `<path d="M${x.toFixed(1)} ${y - (big ? 9 : 4)} L${x.toFixed(1)} ${y + (big ? 9 : 4)}" stroke="${big ? INK : PALETTE.pencil}" stroke-width="${big ? 3 : 2}" stroke-linecap="round"/>`;
  }
  // goal flags at both ends
  for (const p of [0, 1]) {
    const x = p === 0 ? x0 - 6 : x1 + 6, dir = p === 0 ? -1 : 1;
    s += `<path d="${shapeFor('pole' + p, () => line(x, y + 12, x, y - 26, 0.6))}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${shapeFor('flag' + p, () => `M${x} ${y - 26} Q${x - dir * 10} ${y - 24} ${x - dir * 20} ${y - 19} Q${x - dir * 10} ${y - 15} ${x} ${y - 12} Z`)}" fill="${COLORS[p].main}" filter="url(#mg-crayon)"/>`;
  }
  const k = Math.max(-1, Math.min(1, d / T));
  const mx = cx - k * half;
  if (d) {
    const lead = d > 0 ? 0 : 1;
    s += `<path d="M${cx} ${y} L${mx.toFixed(1)} ${y}" stroke="${COLORS[lead].main}" stroke-width="7" stroke-linecap="round" class="rope"/>`;
  }
  s += `<g class="knot" style="transform: translate(${mx.toFixed(1)}px, ${y}px)"><path d="${shapeFor('knot', () => circle(0, 0, 9, 9, 0.08))}" fill="#fff" stroke="${INK}" stroke-width="3.5"/></g>`;
  const label = d ? t('uc.lead', { n: Math.abs(d), t: T }) : t('uc.even', { t: T });
  s += txt(cx, 14, label, { size: 19, color: d ? COLORS[d > 0 ? 0 : 1].main : '#777', weight: 700 });
  return s;
}

const HX = [92, 268], HY = 160;

function renderArena() {
  let s = '';
  const last = st.rounds[st.rounds.length - 1];
  const showing = revealing ? null : last;
  // round label + per-player status tags
  if (st.rounds.length) s += txt(W / 2, 80, t('uc.round', { n: st.rounds.length }), { size: 18, color: '#888', weight: 600 });
  for (const p of [0, 1]) {
    const tagOn = !over && !revealing && st.pending[p] !== null;
    if (tagOn) s += txt(HX[p], 80, t('uc.ready'), { size: 19, color: COLORS[p].main, cls: 'tag' });
  }
  for (const p of [0, 1]) {
    const flip = p === 1 ? -1 : 1;
    const n = showing ? showing.picks[p] : 0;
    const cls = revealing ? 'hand shake' : fresh && showing ? 'hand pop' : 'hand';
    s += `<g transform="translate(${HX[p]} ${HY}) scale(${flip * 0.95} 0.95)"><g class="${cls}">${handSVG(n, COLORS[p], 'big' + p)}</g></g>`;
    if (!showing) {
      s += txt(HX[p] + flip * 2, HY + 8, '?', { size: 40, color: '#fff', cls: 'q' });
      continue;
    }
    // points circle
    const pts = showing.pts[p];
    const cy = 238, ccls = fresh ? 'pts drop' : 'pts';
    s += `<g class="${ccls}">`;
    s += `<path d="${shapeFor('pc' + p, () => circle(HX[p], cy, 24, 17, 0.06))}" fill="#fff" stroke="${pts ? COLORS[p].main : PALETTE.pencil}" stroke-width="3.5"/>`;
    s += txt(HX[p], cy + 7, '+' + pts, { size: 24, color: pts ? COLORS[p].main : '#aaa' });
    s += '</g>';
    if (st.flaunt && showing.vals[p] !== showing.picks[p]) {
      const k = Math.round(Math.log(showing.vals[p]) / Math.log(showing.picks[p]));
      s += txt(HX[p] + flip * 50, 116, showing.picks[p] + sup(k), { size: 24, color: COLORS[p].dark, cls: 'pow' });
    }
  }
  // centre: undercut arrow or "same"
  if (showing && showing.cut >= 0) {
    const c = showing.cut, v = 1 - c;
    const from = HX[v] + (c === 0 ? -34 : 34), to = HX[c] + (c === 0 ? 30 : -30);
    const a = shapeFor('arrow' + c, () => {
      const y0 = 210, mid = (from + to) / 2;
      return { body: `M${from} ${y0} Q${mid} ${y0 - 38} ${to} ${y0 + 10}`,
        head: `M${to + (c === 0 ? 4 : -4)} ${y0 - 6} L${to} ${y0 + 10} L${to + (c === 0 ? 16 : -16)} ${y0 + 8}` };
    });
    s += `<g class="${fresh ? 'cutmark draw' : 'cutmark'}">`;
    s += `<path d="${a.body}" fill="none" stroke="${COLORS[c].main}" stroke-width="4" stroke-linecap="round" stroke-dasharray="7 7"/>`;
    s += `<path d="${a.head}" fill="none" stroke="${COLORS[c].main}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += txt(W / 2, 150, t('uc.cut'), { size: 30, color: COLORS[c].main, cls: 'cut' });
    s += '</g>';
  } else if (showing && showing.picks[0] === showing.picks[1]) {
    s += txt(W / 2, 156, '=', { size: 40, color: '#888' });
  } else if (showing) {
    s += txt(W / 2, 154, ':', { size: 34, color: '#bbb' });
  }
  return s;
}
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (k) => [...String(k)].map((c) => SUP[c]).join('');

function renderHistory() {
  const rs = st.rounds.slice(-10), y = 276;
  if (!rs.length) return '';
  let s = `<path d="${shapeFor('hline', () => line(16, y - 14, W - 16, y - 14, 0.8))}" stroke="${PALETTE.pencil}" stroke-width="2" fill="none" stroke-dasharray="3 6" stroke-linecap="round"/>`;
  const step = 32, x0 = W / 2 - ((rs.length - 1) * step) / 2;
  rs.forEach((r, i) => {
    const x = x0 + i * step;
    for (const p of [0, 1]) {
      const yy = y + 4 + p * 22;
      if (r.cut === p) s += `<path transform="translate(${x} ${yy - 6})" d="${shapeFor('hc' + (st.rounds.length - rs.length + i) + p, () => circle(0, 0, 11, 11, 0.08))}" fill="none" stroke="${COLORS[p].main}" stroke-width="2.5"/>`;
      s += txt(x, yy, r.picks[p], { size: 20, color: COLORS[p].main, cls: 'hist' });
    }
  });
  return s;
}

const PK = { y: 314, h: 160, w: 64, gap: 7 };
const pkX = (i) => (W - 5 * PK.w - 4 * PK.gap) / 2 + i * (PK.w + PK.gap);

function renderPicker() {
  const p = picker();
  let s = '';
  if (p >= 0 && hotSeat() && uncovered !== p) {
    // cover: pass the device
    const c = COLORS[p];
    s += `<path d="${shapeFor('cover', () => `M10 ${PK.y + 4} L${W - 10} ${PK.y} L${W - 8} ${PK.y + PK.h} L8 ${PK.y + PK.h - 2} Z`)}" fill="#f6f5f0" stroke="${PALETTE.pencil}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += txt(W / 2, PK.y + 40, t('uc.cover.title', { name: name(p) }), { size: 28, color: c.main });
    s += txt(W / 2, PK.y + 70, t('uc.cover.note'), { size: 20, color: '#777', weight: 600 });
    s += `<g class="btn-svg" data-act="uncover" role="button">`;
    s += `<path d="${shapeFor('covbtn', () => `M70 ${PK.y + 96} Q180 ${PK.y + 92} 290 ${PK.y + 97} L288 ${PK.y + 142} Q180 ${PK.y + 146} 72 ${PK.y + 141} Z`)}" fill="${c.main}" stroke="${c.dark}" stroke-width="3" stroke-linejoin="round"/>`;
    s += txt(W / 2, PK.y + 128, t('uc.cover.btn'), { size: 25, color: '#fff' });
    s += '</g>';
    return s;
  }
  const owner = p >= 0 ? p : online() ? mySeat() : hotSeat() ? -1 : 0;
  const mine = online() ? st.pending[mySeat()] : null;
  const color = owner >= 0 ? COLORS[owner] : { main: '#aaa', dark: '#888', fill: '#ddd' };
  const flip = owner === 1 ? -1 : 1;
  for (let i = 0; i < 5; i++) {
    const v = i + 1, x = pkX(i);
    const enabled = p >= 0;
    const chosen = typeof mine === 'number' && mine === v;
    s += `<g class="pk${enabled ? ' on' : ''}${chosen ? ' chosen' : ''}" ${enabled ? `data-act="pick" data-v="${v}" role="button"` : ''}>`;
    s += `<path class="pk-bg" d="${shapeFor('pkb' + i, () => {
      const r = () => (Math.random() * 2 - 1) * 2;
      return `M${x + r()} ${PK.y + r()} L${x + PK.w + r()} ${PK.y + r()} L${x + PK.w + r()} ${PK.y + PK.h + r()} L${x + r()} ${PK.y + PK.h + r()} Z`;
    })}" fill="#fff" stroke="${chosen ? color.main : enabled ? INK : PALETTE.pencil}" stroke-width="${chosen ? 4 : 2.5}" stroke-linejoin="round"/>`;
    s += `<g transform="translate(${x + PK.w / 2} ${PK.y + 78}) scale(${flip * 0.62} 0.62)" opacity="${enabled || chosen ? 1 : 0.35}">${handSVG(v, color, 'pk' + Math.max(owner, 0))}</g>`;
    if (st.flaunt && owner >= 0) {
      const k = UC.streak(st, owner, v);
      if (k > 1) s += txt(x + PK.w / 2, PK.y + 22, `${v}${sup(k)}=${v ** k}`, { size: 17, color: color.dark, cls: 'pow' });
    }
    s += txt(x + PK.w / 2, PK.y + PK.h - 12, v, { size: 34, color: enabled || chosen ? color.main : '#bbb' });
    s += '</g>';
  }
  return s;
}

function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = renderMeter() + renderArena() + renderHistory() + renderPicker();
  renderPlayers();
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && !revealing && (hotSeat() ? picker() === p : st.pending[p] === null && (!online() || sess.connected));
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : picker() === p && (!hotSeat() || uncovered === p) ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 11 + p * 31,
    });
    el.querySelector('.score').textContent = plural(st.score[p], 'uc.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const p = picker();
  let text = '', col = INK;
  if (over || revealing) text = '';
  else if (online() && !sess.connected) text = t('uc.online.wait');
  else if (online()) {
    const me = mySeat();
    if (p >= 0) { text = t('uc.pick.you'); col = COLORS[me].main; }
    else { text = t('uc.pick.mine', { v: st.pending[me] }); col = COLORS[1 - me].main; }
  } else if (hotSeat()) {
    text = t(uncovered === p ? 'uc.pick' : 'uc.cover.status', { name: name(p) });
    col = COLORS[p].main;
  } else { text = t('uc.pick.you'); col = COLORS[0].main; }
  status.textContent = text;
  status.style.color = col;

  $('#undo').disabled = online() || !history.length || revealing;
  $('#mode').disabled = online();
  $('#rules').disabled = !canRestart();
  $('#target').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('uc.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('uc.online.note') : '';
}

const bubbleTimers = [];
function say(p, key, delay = 0) {
  setTimeout(() => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  }, delay);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function fillTargets() {
  const sel = $('#target');
  sel.innerHTML = targetOpts().map((v) => `<option value="${v}">${v}</option>`).join('');
  sel.value = curTarget();
  $('#rules').value = cfg.rules;
}

function newGame() {
  clearTimeout(revealTimer);
  st = UC.create({ target: curTarget(), flaunt: cfg.rules === 'flaunt' });
  history = []; shapes = {}; over = false; uncovered = null; revealing = false; fresh = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
}

// React to the round that was just revealed.
function react(r) {
  const [a, b] = r.picks;
  if (r.cut >= 0) {
    const c = r.cut, v = 1 - c;
    setMood(c, 'happy', 'up'); setMood(v, 'sad');
    say(c, 'uc.say.cut');
    if (Math.random() < 0.6) say(v, 'uc.say.cutby', 650);
  } else if (a === b) {
    setMood(0, 'neutral'); setMood(1, 'neutral');
    if (Math.random() < 0.6) say(Math.random() < 0.5 ? 0 : 1, 'uc.say.same');
  } else {
    const hi = a > b ? 0 : 1;
    setMood(hi, 'happy', 'wave'); setMood(1 - hi, 'neutral');
    if (r.pts[hi] >= 4 && Math.random() < 0.5) say(hi, 'uc.say.big');
  }
  if (st.flaunt) for (const p of [0, 1]) if (r.picks[p] > 1 && r.vals[p] >= r.picks[p] ** 3) say(p, 'uc.say.streak', 300);
  if (UC.isOver(st)) return;
  const d = st.score[0] - st.score[1];
  if (Math.abs(d) >= st.target * 0.65) {
    const lead = d > 0 ? 0 : 1;
    if (moods[lead].mood !== 'happy') setMood(lead, 'smug');
    if (moods[1 - lead].mood !== 'sad') setMood(1 - lead, 'worried');
    if (Math.random() < 0.35) say(lead, 'uc.say.close', 900);
    else if (Math.random() < 0.35) say(1 - lead, 'uc.say.worried', 900);
  }
}

// Shake the fists for a moment, then show the round (r = the finished round).
function reveal(r) {
  revealing = true; fresh = false;
  render();
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => {
    revealing = false; fresh = true;
    react(r);
    if (UC.isOver(st)) return finish();
    render();
    fresh = false;
  }, 650);
}

// A pick by player p (local or received). Returns true when a round got revealed.
function doPick(p, v) {
  const r = UC.pick(st, p, v);
  uncovered = null;
  if (r) reveal(r); else render();
  return !!r;
}

function localPick(v) {
  const p = picker();
  if (p < 0 || (hotSeat() && uncovered !== p)) return;
  if (online()) {
    if (sess.host) { doPick(p, v); sendState(); }
    else { st.pending[p] = v; guestPick = { n: st.rounds.length, v }; sess.send('move', { n: st.rounds.length, v }); render(); }
    return;
  }
  history.push(UC.clone(st));
  if (isAI(1)) {
    // the computer decides from the revealed rounds only — it never looks at v
    const ai = UC.aiPick(st, 1, cfg.mode);
    UC.pick(st, 0, v);
    doPick(1, ai);
    return;
  }
  doPick(p, v);
}

function finish() {
  over = true;
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  say(w, 'uc.say.win', 200); say(1 - w, 'uc.say.lose', 1100);
  render();
  fresh = false;
  const [a, b] = st.score;
  const txtEl = $('#result-text');
  txtEl.textContent = t('uc.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  txtEl.style.color = COLORS[w].main;
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1300);
}

function undo() {
  if (!history.length || online() || revealing) return;
  clearTimeout(revealTimer);
  const roundDone = st.pending.every((x) => x === null);
  st = history.pop();
  // Hot-seat: undoing a revealed round takes back both picks, otherwise the second player
  // would re-pick already knowing the first one.
  if (roundDone && st.pending.some((x) => x !== null) && history.length) st = history.pop();
  over = false; uncovered = null; fresh = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
}

// Online, only the room creator may restart (and change rules); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState(true);
}

// ---------- online ----------
// Host is authoritative and keeps its own pending pick secret: the guest only learns that it exists.
let guestPick = null; // guest: { n, v } sent but not yet confirmed by the host
function sendState(isNew = false) {
  const s = UC.clone(st);
  if (s.pending[0] !== null) s.pending[0] = true;
  sess.send('state', { st: s, names: cfg.names, fresh: isNew });
}
function onSession(s) {
  sess = s;
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prevLen = st.rounds.length, prevOver = over;
    const ns = d.st;
    remoteNames[0] = d.names[0];
    if (guestPick && guestPick.n === ns.rounds.length && ns.pending[1] === null) ns.pending[1] = guestPick.v;
    if (guestPick && guestPick.n !== ns.rounds.length) guestPick = null;
    const newRound = !d.fresh && ns.rounds.length === prevLen + 1 && !prevOver;
    st = ns;
    // show the host's rules without touching our own saved settings
    $('#rules').value = st.flaunt ? 'flaunt' : 'classic';
    fillTargetsFor(st);
    if (d.fresh || ns.rounds.length < prevLen) {
      clearTimeout(revealTimer);
      over = false; revealing = false; fresh = false; shapes = {};
      setMood(0, 'neutral'); setMood(1, 'neutral');
      $('#result').hidden = true;
    }
    if (newRound) return reveal(st.rounds[st.rounds.length - 1]);
    if (UC.isOver(st) && !over) return finish();
    if (!revealing) render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (!s.host) return;
    if (d.n !== st.rounds.length || st.pending[1] !== null || over || !UC.valid(d.v)) return sendState();
    doPick(1, d.v);
    sendState();
  });
  if (s.host) newGame();
  else { guestPick = null; render(); }
}
function fillTargetsFor(s) {
  const opts = UC.TARGETS[s.flaunt ? 'flaunt' : 'classic'];
  const sel = $('#target');
  sel.innerHTML = [...new Set([...opts, s.target])].sort((a, b) => a - b).map((v) => `<option value="${v}">${v}</option>`).join('');
  sel.value = s.target;
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'uncover') {
    const p = picker();
    if (p >= 0 && hotSeat()) { uncovered = p; render(); }
  } else if (el.dataset.act === 'pick') localPick(+el.dataset.v);
});

$('#rules').addEventListener('change', (e) => { cfg.rules = e.target.value; saveCfg(); fillTargets(); restart(); });
$('#target').addEventListener('change', (e) => { cfg.target[cfg.rules] = +e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    renderPlayers();
    if (!revealing) render();
  }));
document.addEventListener('mg:lang', () => { if (!revealing) render(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
if (!['pvp', 'easy', 'normal', 'hard'].includes(cfg.mode)) cfg.mode = 'pvp';
if (!UC.TARGETS[cfg.rules]) cfg.rules = 'classic';
$('#mode').value = cfg.mode;
fillTargets();
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; guestPick = null; fillTargets(); newGame(); },
});
if (!online()) showOnce('how', SLUG);
