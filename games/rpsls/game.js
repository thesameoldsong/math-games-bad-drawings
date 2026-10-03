import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, curve, figureSVG, injectDefs, withSeed, rng } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { RPS } from './engine.js';
import './strings.js';

const SLUG = 'rpsls';
const W = 360, H = 466;
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const GREY = { main: '#9a9aa3', dark: '#6d6d77', fill: '#d9d9de' };
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ mode: 'pvp', set: 5, target: 3, names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, over;
let uncovered = null;   // hot-seat: the player who pressed "it's me" for the current pick
let revealing = false;  // counting "one, two, three"
let countI = 0;
let fresh = false;      // the last round was just revealed (animate it)
let revealTimers = [];
let hoverG = null;
let sess = null;        // online session (shared/net.js), null when playing locally
let guestPick = null;   // guest: { n, g, sent } picked but not yet confirmed by the host
let guestReady = -1;    // host: round in which the guest has locked in (its gesture is still kept back)
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
  if (isAI(p)) return t('rps.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('rps.p' + p);
}
// Which player this screen is picking for right now (-1: nobody).
function picker() {
  if (over || revealing) return -1;
  if (online()) return sess.connected && st.pending[mySeat()] === null ? mySeat() : -1;
  if (!hotSeat()) return 0;
  return st.pending[0] === null ? 0 : 1;
}
// p has locked in a gesture this round (for the host, also a guest who has only said "ready")
const locked = (p) => st.pending[p] !== null || (p === 1 && online() && sess.host && guestReady === st.rounds.length);
const canPick = () => { const p = picker(); return p >= 0 && (!hotSeat() || uncovered === p); };

const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const f1 = (n) => n.toFixed(1);
const txt = (x, y, s, { size = 22, color = INK, weight = 700, anchor = 'middle', cls = '' } = {}) =>
  `<text x="${f1(x)}" y="${f1(y)}" class="t ${cls}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;

// ---------- drawing: the five gestures (our own little pictures, ~70 units across, centred at 0,0) ----------
const SW = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
const gestureCache = new Map();
const SKIN = '#f3cba5', GREEN = '#63b347', GREEN_D = '#2f7a2a', STONE = '#a3a3ad', STEEL = '#cfd3da', HANDLE = '#e8902e';

function gestureSVG(g, seed = 1) {
  const k = g + seed;
  if (gestureCache.has(k)) return gestureCache.get(k);
  const s = withSeed(seed * 131 + g.length * 7, () => {
    const r = rng(seed * 17 + g.charCodeAt(0));
    const j = (a) => (r() * 2 - 1) * a;
    const poly = (pts) => 'M' + pts.map(([x, y]) => `${f1(x + j(1))} ${f1(y + j(1))}`).join(' L') + ' Z';
    const ink = (d, w = 3.5) => `<path d="${d}" stroke="${INK}" stroke-width="${w}" ${SW}/>`;
    const fill = (d, c) => `<path d="${d}" fill="${c}" filter="url(#mg-crayon)"/>`;
    const tube = (d, w, c) => `<path d="${d}" stroke="${INK}" stroke-width="${w + 4}" ${SW}/><path d="${d}" stroke="${c}" stroke-width="${w}" ${SW}/>`;
    let o = '';
    if (g === 'rock') {
      const b = circle(0, 4, 32, 25, 0.13);
      o += `<path d="${b}" fill="#fff"/>` + fill(b, STONE) + ink(b);
      o += ink(line(-14, -8, -4, 1, 0.6) + ' ' + line(-4, 1, -8, 13, 0.6) + ' ' + line(11, -12, 17, -1, 0.6), 2.4);
      o += `<path d="${line(-21, -6, -13, -14, 0.5)}" stroke="#fff" stroke-width="3" opacity=".8" ${SW}/>`;
    } else if (g === 'paper') {
      const b = poly([[-23, -31], [12, -31], [23, -20], [23, 31], [-23, 31]]);
      o += `<g transform="rotate(-8)"><path d="${b}" fill="#fff"/>` + ink(b);
      for (const y of [-12, -3, 6, 15, 24]) o += `<path d="${line(-15, y, 15, y, 0.5)}" stroke="#8cc0dc" stroke-width="2" ${SW}/>`;
      o += `<path d="M12 -31 L12 -20 L23 -20 Z" fill="#ebe8df" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`;
    } else if (g === 'scissors') {
      const blade = (d) => {
        const p = `M${f1(d * 2)} 5 L${f1(-d * 19)} -33 Q${f1(-d * 15)} -36 ${f1(-d * 11)} -32 L${f1(-d * 3)} 3 Z`;
        return `<path d="${p}" fill="${STEEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      };
      o += blade(-1) + blade(1);
      for (const d of [-1, 1]) {
        o += tube(line(0, 4, d * 9, 15, 0.4), 4.5, HANDLE);
        o += tube(circle(d * 13, 24, 9, 8, 0.06), 4.5, HANDLE);
      }
      o += `<circle cx="0" cy="3" r="2.8" fill="${INK}"/>`;
    } else if (g === 'lizard') {
      o += tube(curve([[1, 14], [8, 23], [3, 32], [-9, 33], [-15, 28]]), 5, GREEN);
      for (const d of [-1, 1]) {
        o += tube(`M${d * 5} -9 L${d * 16} -15 L${d * 19} -23`, 3.5, GREEN);
        o += tube(`M${d * 5} 9 L${d * 16} 13 L${d * 20} 6`, 3.5, GREEN);
      }
      const body = circle(0, -1, 9.5, 17, 0.05), head = circle(0, -24, 8.5, 10, 0.05);
      o += `<path d="${body}" fill="${GREEN}"/>` + ink(body, 3);
      o += `<path d="${head}" fill="${GREEN}"/>` + ink(head, 3);
      o += `<circle cx="-1" cy="-4" r="1.8" fill="${GREEN_D}"/><circle cx="3" cy="4" r="1.6" fill="${GREEN_D}"/><circle cx="-3" cy="9" r="1.4" fill="${GREEN_D}"/>`;
      o += `<circle cx="-4" cy="-27" r="2.2" fill="${INK}"/><circle cx="4" cy="-27" r="2.2" fill="${INK}"/>`;
    } else if (g === 'spock') {
      for (const d of [-1, 1]) o += `<path d="M${d * 17} -4 L${d * 29} -24 L${d * 19} 10 Z" fill="${SKIN}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
      const face = circle(0, 3, 20, 25, 0.04);
      o += `<path d="${face}" fill="${SKIN}"/>` + ink(face);
      o += `<path d="M-21 4 L-21 -9 Q-21 -29 0 -29 Q21 -29 21 -9 L21 4 L17 4 L17 -7 L-17 -7 L-17 4 Z" fill="#2b2b33" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
      o += ink(line(-4, 0, -14, -4, 0.3) + ' ' + line(4, 0, 14, -4, 0.3), 3);
      o += `<circle cx="-8" cy="5" r="2.4" fill="${INK}"/><circle cx="8" cy="5" r="2.4" fill="${INK}"/>`;
      o += ink(line(0, 6, -2, 12, 0.3), 2.2) + ink(line(-6, 18, 6, 18, 0.4), 2.6);
    }
    return o;
  });
  gestureCache.set(k, s);
  return s;
}

// ---------- layout ----------
const ARENA = { y: 104, x: [88, 272], r: 44 };
const PK = { cx: 180, cy: 334, R: 94, r: 33 };
function pkPos(g) {
  const gs = RPS.gesturesOf(st.set), i = gs.indexOf(g);
  const a = (i * 2 * Math.PI) / gs.length;
  return [PK.cx + PK.R * Math.sin(a), PK.cy - PK.R * Math.cos(a)];
}
const lastRound = () => st.rounds[st.rounds.length - 1];

// ---------- rendering ----------
function renderHistory() {
  const n = Math.min(st.rounds.length, 10), rs = st.rounds.slice(-n);
  const step = 34, x0 = W / 2 - ((n - 1) * step) / 2;
  let s = '';
  rs.forEach((r, i) => {
    const x = x0 + i * step, idx = st.rounds.length - n + i;
    for (const p of [0, 1]) {
      const y = 12 + p * 23;
      const won = r.win === p;
      s += `<g transform="translate(${f1(x)} ${y})"><g class="mini${fresh && idx === st.rounds.length - 1 ? ' pop' : ''}">`;
      s += `<path d="${shapeFor('hc' + idx + p, () => circle(0, 0, 11, 11, 0.06))}" fill="${won ? COLORS[p].fill : '#fff'}" stroke="${won ? COLORS[p].main : PALETTE.pencil}" stroke-width="${won ? 2.6 : 1.6}" ${won ? 'fill-opacity=".45"' : ''}/>`;
      s += `<g transform="scale(.25)">${gestureSVG(r.picks[p], 3)}</g></g></g>`;
    }
  });
  return s;
}

function renderArena() {
  let s = '';
  const last = lastRound();
  const showing = revealing ? null : last;
  // centre labels
  s += txt(W / 2, 72, t('rps.round', { n: Math.max(1, st.rounds.length) }), { size: 17, color: '#888', weight: 600 });
  s += txt(W / 2, 90, t('rps.upto', { n: plural(st.target, 'rps.wins.gen') }), { size: 15, color: '#aaa', weight: 600 });
  for (const p of [0, 1]) {
    const x = ARENA.x[p], y = ARENA.y, c = COLORS[p];
    const lost = showing && showing.win === 1 - p;
    s += `<g transform="translate(${x} ${y})"><g class="slot${revealing ? ' shake' + p : ''}">`;
    const ring = shapeFor('ring' + p, () => circle(0, 0, ARENA.r, ARENA.r, 0.05));
    s += `<path d="${ring}" fill="${c.fill}" opacity=".35" filter="url(#mg-crayon)"/>`;
    s += `<path d="${ring}" fill="none" stroke="${c.main}" stroke-width="3.5"/>`;
    if (showing) {
      s += `<g class="${fresh ? 'pop' : ''}${lost ? ' lost' : ''}"><g transform="scale(1.02)">${gestureSVG(showing.picks[p], 1)}</g></g>`;
    } else {
      s += txt(0, 14, '?', { size: 46, color: c.main, cls: 'q' });
    }
    s += '</g></g>';
    // the opponent (or the other hot-seat player) has locked in a gesture
    if (!revealing && !over && locked(p)) s += txt(x, y + ARENA.r + 20, t('rps.ready'), { size: 19, color: c.main, cls: 'tag' });
    if (lost) s += `<path d="${shapeFor('x' + p, () => line(x - 30, y - 30, x + 30, y + 30, 1.5) + ' ' + line(x + 30, y - 30, x - 30, y + 30, 1.5))}" class="cross${fresh ? ' draw' : ''}" stroke="${COLORS[1 - p].main}" stroke-width="4.5" ${SW} pathLength="1"/>`;
  }
  // centre: count, winner arrow, tie sign
  const cy = 122;
  if (revealing) {
    s += txt(W / 2, cy + 6, t('rps.count.' + countI), { size: countI === 2 ? 30 : 24, color: INK, cls: 'count' });
  } else if (showing && showing.win >= 0) {
    const w = showing.win, dir = w === 0 ? 1 : -1;
    const a = shapeFor('arr' + w, () => line(W / 2 - dir * 26, cy, W / 2 + dir * 20, cy, 1.2));
    const tip = W / 2 + dir * 24;
    s += `<path d="${a} M${tip - dir * 11} ${cy - 9} L${tip} ${cy} L${tip - dir * 11} ${cy + 9}" stroke="${COLORS[w].main}" stroke-width="5" ${SW}/>`;
  } else if (showing) {
    s += txt(W / 2, cy + 10, '=', { size: 40, color: '#999' });
  } else {
    s += txt(W / 2, cy + 6, t('rps.vs'), { size: 24, color: '#bbb' });
  }
  // verb line
  if (showing) {
    const rule = showing.win >= 0 ? RPS.rule(showing.picks[showing.win], showing.picks[1 - showing.win]) : null;
    const text = rule ? t('v.' + rule[2]) : t('rps.tie');
    s += txt(W / 2, 176, text, { size: 24, color: rule ? COLORS[showing.win].main : '#888', cls: fresh ? 'verb pop' : 'verb' });
  }
  return s;
}

function arrowPath(w, l) {
  const [x1, y1] = pkPos(w), [x2, y2] = pkPos(l);
  const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
  const ax = x1 + ux * (PK.r + 3), ay = y1 + uy * (PK.r + 3), bx = x2 - ux * (PK.r + 5), by = y2 - uy * (PK.r + 5);
  const body = line(ax, ay, bx, by, 1);
  const hx = (k) => bx - ux * 10 + (-uy) * k * 6, hy = (k) => by - uy * 10 + ux * k * 6;
  return `${body} M${f1(hx(1))} ${f1(hy(1))} L${f1(bx)} ${f1(by)} L${f1(hx(-1))} ${f1(hy(-1))}`;
}

function renderPicker() {
  const p = picker();
  let s = '';
  if (p >= 0 && hotSeat() && uncovered !== p) {
    const c = COLORS[p], y0 = 196;
    s += `<path d="${shapeFor('cover', () => `M10 ${y0 + 4} L${W - 10} ${y0} L${W - 8} ${H - 6} L8 ${H - 8} Z`)}" fill="#f6f5f0" stroke="${PALETTE.pencil}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s += `<g transform="translate(${W / 2} ${y0 + 70}) scale(.9)" opacity=".5">${gestureSVG('rock', 9)}</g>`;
    s += txt(W / 2, y0 + 140, t('rps.cover.title', { name: name(p) }), { size: 30, color: c.main });
    s += txt(W / 2, y0 + 170, t('rps.cover.note'), { size: 20, color: '#777', weight: 600 });
    s += `<g class="btn-svg" data-act="uncover" role="button">`;
    s += `<path d="${shapeFor('covbtn', () => `M60 ${y0 + 192} Q180 ${y0 + 187} 300 ${y0 + 193} L298 ${y0 + 240} Q180 ${y0 + 244} 62 ${y0 + 239} Z`)}" fill="${c.main}" stroke="${c.dark}" stroke-width="3" stroke-linejoin="round"/>`;
    s += txt(W / 2, y0 + 225, t('rps.cover.btn'), { size: 25, color: '#fff' });
    s += '</g>';
    return s;
  }
  const owner = p >= 0 ? p : online() ? mySeat() : hotSeat() ? -1 : 0;
  const color = owner >= 0 ? COLORS[owner] : GREY;
  const enabled = canPick();
  const mine = online() ? st.pending[mySeat()] : null;
  const last = !revealing && lastRound();
  const decide = last && last.win >= 0 ? [last.picks[last.win], last.picks[1 - last.win], COLORS[last.win].main] : null;
  const gs = RPS.gesturesOf(st.set);

  for (const [w, l] of RPS.RULES) {
    if (!gs.includes(w) || !gs.includes(l)) continue;
    const isDecide = decide && decide[0] === w && decide[1] === l;
    s += `<path class="arr${isDecide ? ' decide' : ''}" data-w="${w}" data-l="${l}" d="${shapeFor('a' + st.set + w + l, () => arrowPath(w, l))}" ${isDecide ? `style="--dc:${decide[2]}"` : ''}/>`;
  }
  for (const g of gs) {
    const [x, y] = pkPos(g);
    const chosen = mine === g;
    s += `<g class="pk${enabled ? ' on' : ''}${chosen ? ' chosen' : ''}" data-g="${g}" ${enabled ? `data-act="pick" role="button"` : ''} transform="translate(${f1(x)} ${f1(y)})">`;
    s += `<g class="lift"><path class="pk-bg" d="${shapeFor('pkb' + g, () => circle(0, 0, PK.r, PK.r, 0.05))}" fill="#fff" stroke="${chosen ? color.main : enabled ? INK : PALETTE.pencil}" stroke-width="${chosen ? 4.5 : 2.6}" style="--pc:${color.main}"/>`;
    s += `<g transform="scale(.66)" opacity="${enabled || chosen ? 1 : 0.45}">${gestureSVG(g, 2)}</g></g>`;
    // label: above the top button, beside the upper side ones, below the rest
    const top = y < PK.cy - PK.R + 1, side = !top && y < PK.cy, right = x > PK.cx;
    const [lx, ly, anchor] = top ? [0, -PK.r - 7, 'middle'] : side ? [(right ? 1 : -1) * (PK.r + 5), 5, right ? 'start' : 'end'] : [0, PK.r + 17, 'middle'];
    s += txt(lx, ly, t('g.' + g), { size: 17, color: enabled || chosen ? color.dark : '#999', weight: 700, cls: 'lbl', anchor });
    s += '</g>';
  }
  return s;
}

function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = renderHistory() + renderArena() + renderPicker();
  applyHover();
  renderPlayers();
}

// Hover (mouse) on a gesture: its outgoing arrows (what it beats) light up.
function applyHover() {
  svg.classList.toggle('hovering', !!hoverG);
  svg.querySelectorAll('.arr').forEach((a) => {
    a.classList.toggle('out', a.dataset.w === hoverG);
    a.classList.toggle('in', a.dataset.l === hoverG);
  });
  const beaten = hoverG ? RPS.gesturesOf(st.set).filter((g) => RPS.outcome(hoverG, g) > 0) : [];
  svg.querySelectorAll('.pk').forEach((b) => {
    b.classList.toggle('hl', b.dataset.g === hoverG);
    b.classList.toggle('prey', beaten.includes(b.dataset.g));
  });
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && !revealing && !locked(p) && (online() ? sess.connected : true);
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : picker() === p && (!hotSeat() || uncovered === p) ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 11 + p * 31,
    });
    el.querySelector('.score').textContent = plural(st.score[p], 'rps.wins');
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
  else if (online() && !sess.connected) text = t('rps.online.wait');
  else if (online()) {
    const me = mySeat();
    text = t(p >= 0 ? 'rps.pick.you' : 'rps.pick.wait');
    col = COLORS[p >= 0 ? me : 1 - me].main;
  } else if (hotSeat()) {
    text = t(uncovered === p ? 'rps.pick' : 'rps.cover.status', { name: name(p) });
    col = COLORS[p].main;
  } else { text = t(st.rounds.length ? 'rps.pick.you' : 'rps.pick.cpu'); col = COLORS[0].main; }
  status.textContent = text;
  status.style.color = col;

  $('#undo').disabled = online() || !history.length || revealing;
  $('#mode').disabled = online();
  $('#set').disabled = !canRestart();
  $('#target').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('rps.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('rps.online.note') : '';
}

const bubbleTimers = [], sayTimers = [];
function say(p, key, delay = 0) {
  sayTimers.push(setTimeout(() => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  }, delay));
}
function hush() {
  sayTimers.splice(0).forEach(clearTimeout);
  document.querySelectorAll('.player .bubble').forEach((b) => b.classList.remove('show'));
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function fillTargets() {
  const sel = $('#target');
  const opts = [...new Set([...RPS.TARGETS, st ? st.target : cfg.target])].sort((a, b) => a - b);
  sel.innerHTML = opts.map((v) => `<option value="${v}">${plural(v, 'rps.wins.gen')}</option>`).join('');
  sel.value = st ? st.target : cfg.target;
  $('#set').value = st ? st.set : cfg.set;
}

function stopTimers() { revealTimers.forEach(clearTimeout); revealTimers = []; }

function newGame() {
  stopTimers(); hush();
  st = RPS.create({ set: cfg.set, target: cfg.target });
  history = []; shapes = {}; over = false; guestReady = -1; uncovered = null; revealing = false; fresh = false; hoverG = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  fillTargets();
  render();
}

// Count of consecutive decided rounds won by p, most recent first (ties don't break a streak).
function streak(p) {
  let n = 0;
  for (let i = st.rounds.length - 1; i >= 0; i--) {
    const w = st.rounds[i].win;
    if (w < 0) continue;
    if (w !== p) break;
    n++;
  }
  return n;
}

// React to the round that was just revealed.
function react(r) {
  if (r.win < 0) {
    setMood(0, 'worried'); setMood(1, 'worried');
    if (Math.random() < 0.7) say(Math.random() < 0.5 ? 0 : 1, 'rps.say.tie');
    return;
  }
  const w = r.win, l = 1 - w;
  setMood(w, 'happy', 'wave'); setMood(l, 'sad');
  if (RPS.isOver(st)) return;
  const k = streak(w);
  if (k >= 3 && Math.random() < 0.7) { setMood(w, 'smug', 'wave'); say(w, 'rps.say.streak'); }
  else say(w, Math.random() < 0.45 ? 'rps.say.' + r.picks[w] : 'rps.say.win');
  if (Math.random() < 0.5) say(l, 'rps.say.lose', 700);
  // match point
  if (st.target > 1) {
    for (const p of [0, 1]) {
      if (st.score[p] === st.target - 1 && st.score[1 - p] < st.target - 1) {
        if (p === w) setMood(p, 'smug', 'wave'); else setMood(1 - p, 'worried');
        if (Math.random() < 0.5) say(p === w ? w : 1 - p, p === w ? 'rps.say.matchpoint' : 'rps.say.worried', 1300);
      }
    }
  }
}

// "One… two… three!", then show the round.
function reveal(r) {
  stopTimers();
  revealing = true; fresh = false; countI = 0; hoverG = null;
  hush();
  setMood(0, 'neutral'); setMood(1, 'neutral');
  render();
  revealTimers.push(setTimeout(() => { countI = 1; render(); }, 330));
  revealTimers.push(setTimeout(() => { countI = 2; render(); }, 660));
  revealTimers.push(setTimeout(() => {
    revealing = false; fresh = true;
    react(r);
    if (RPS.isOver(st)) finish();
    else render();
    fresh = false;
  }, 1000));
}

// A pick by player p (local or received). Returns true when a round got revealed.
function doPick(p, g) {
  const r = RPS.pick(st, p, g);
  uncovered = null;
  if (r) reveal(r); else render();
  return !!r;
}

function localPick(g) {
  if (!canPick() || !RPS.valid(st, g)) return;
  const p = picker();
  if (online()) {
    if (sess.host) { doPick(p, g); sendState(); }
    else { st.pending[p] = g; guestPick = { n: st.rounds.length, g, sent: false }; guestSend(); render(); }
    return;
  }
  // one undo step = the whole round so far (otherwise player 2 could undo a reveal and re-pick)
  if (st.pending[0] === null && st.pending[1] === null) history.push(RPS.clone(st));
  if (isAI(1)) {
    // the computer decides from the revealed rounds only — it never looks at g
    const ai = RPS.aiPick(st, 1, cfg.mode);
    RPS.pick(st, 0, g);
    doPick(1, ai);
    return;
  }
  doPick(p, g);
}

function finish() {
  over = true;
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  say(w, 'rps.say.champ', 200); say(1 - w, 'rps.say.loser', 1100);
  render();
  resultText();
  revealTimers.push(setTimeout(() => { if (over) $('#result').hidden = false; }, 1500));
}

function resultText() {
  const w = st.winner, [a, b] = st.score;
  const el = $('#result-text');
  el.textContent = t('rps.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  el.style.color = COLORS[w].main;
}

function undo() {
  if (!history.length || online() || revealing) return;
  stopTimers(); hush();
  st = history.pop();
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
// The guest keeps its gesture back too: it first says "ready" and sends the gesture only once
// the host's pick is locked in, so neither side can peek.
function sendState(isNew = false) {
  const s = RPS.clone(st);
  if (s.pending[0] !== null) s.pending[0] = true;
  sess.send('state', { st: s, names: cfg.names, fresh: isNew, ready1: guestReady === st.rounds.length });
}
// guest: tell the host about our pick (just "ready" until the host has picked)
function guestSend(hostKnowsReady = false) {
  const gp = guestPick;
  if (!gp || gp.sent || gp.n !== st.rounds.length) return;
  if (st.pending[0] !== null) { gp.sent = true; sess.send('move', { n: gp.n, g: gp.g }); }
  else if (!hostKnowsReady) sess.send('ready', { n: gp.n });
}
function onSession(s) {
  sess = s;
  stopTimers();
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) { guestReady = -1; sendState(); }
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prevLen = st.rounds.length, prevOver = over, prevSet = st.set;
    const ns = d.st;
    remoteNames[0] = d.names[0];
    if (d.fresh) guestPick = null;
    if (guestPick && guestPick.n === ns.rounds.length && ns.pending[1] === null) ns.pending[1] = guestPick.g;
    if (guestPick && guestPick.n !== ns.rounds.length) guestPick = null;
    const newRound = !d.fresh && ns.rounds.length === prevLen + 1 && !prevOver;
    st = ns;
    guestSend(d.ready1);
    fillTargets();
    if (d.fresh || ns.rounds.length < prevLen || ns.set !== prevSet) {
      stopTimers(); hush();
      over = false; revealing = false; fresh = false; shapes = {};
      setMood(0, 'neutral'); setMood(1, 'neutral');
      $('#result').hidden = true;
    }
    if (newRound) return reveal(st.rounds[st.rounds.length - 1]);
    if (RPS.isOver(st) && !over) return finish();
    if (!revealing) render();
  });
  s.on('name', (d) => {
    remoteNames[d.seat] = d.name || '';
    if (!revealing) render(); else renderPlayers();
    if (over) resultText();
  });
  s.on('ready', (d) => {
    if (!s.host) return;
    if (d.n !== st.rounds.length || st.pending[1] !== null || over) return sendState();
    guestReady = d.n;
    if (!revealing) render();
  });
  s.on('move', (d) => {
    if (!s.host) return;
    if (d.n !== st.rounds.length || st.pending[1] !== null || over || !RPS.valid(st, d.g)) return sendState();
    guestReady = -1;
    doPick(1, d.g);
    sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else { guestPick = null; render(); }
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'uncover') {
    const p = picker();
    if (p >= 0 && hotSeat()) { uncovered = p; render(); }
  } else if (el.dataset.act === 'pick') localPick(el.dataset.g);
});
svg.addEventListener('pointerover', (evt) => {
  if (evt.pointerType !== 'mouse' || !matchMedia('(hover: hover)').matches) return;
  const g = evt.target.closest('.pk')?.dataset.g || null;
  if (g !== hoverG) { hoverG = g; applyHover(); }
});
svg.addEventListener('pointerleave', () => { hoverG = null; applyHover(); });

$('#set').addEventListener('change', (e) => { cfg.set = +e.target.value; saveCfg(); restart(); });
$('#target').addEventListener('change', (e) => { cfg.target = +e.target.value; saveCfg(); restart(); });
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
    if (!revealing) render(); else renderPlayers();
  }));
document.addEventListener('mg:lang', () => { fillTargets(); if (!revealing) render(); if (over) resultText(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
if (!['pvp', 'easy', 'normal', 'hard'].includes(cfg.mode)) cfg.mode = 'pvp';
if (!RPS.SETS.includes(cfg.set)) cfg.set = 5;
if (!RPS.TARGETS.includes(cfg.target)) cfg.target = 3;
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
