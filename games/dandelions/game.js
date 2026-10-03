import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { DAN } from './engine.js';
import './strings.js';

const SLUG = 'dandelions';
const S = 60, M = 8;                 // cell size, board margin
const COLORS = [PALETTE.blue, PALETTE.red]; // by seat
const $ = (sel) => document.querySelector(sel);
const svg = $('#board'), rose = $('#compass');

const cfg = Object.assign({ size: 5, variant: 'classic', mode: 'pvp', dSeat: 0, hint: false, names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, over, aiTimer, dSeat = cfg.dSeat, armed = -1, hover = null, sure = false;
let sess = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const roleOf = (seat) => (seat === dSeat ? 0 : 1);
const seatOf = (role) => (role === 0 ? dSeat : 1 - dSeat);
const curSeat = () => seatOf(DAN.turn(st));
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && !DAN.isOver(st) && isLocal(curSeat()) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('dan.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('dan.p' + p);
}
const dColor = () => COLORS[seatOf(0)];
const wColor = () => COLORS[seatOf(1)];

// ---------- geometry ----------
const cellXY = (i) => [M + (i % st.n) * S + S / 2, M + Math.floor(i / st.n) * S + S / 2];
const ANG = (d) => ((-90 + 45 * d) * Math.PI) / 180;
const shapeFor = (k, make) => (shapes[k] ??= make());
function svgPoint(el, evt) {
  const pt = el.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(el.getScreenCTM().inverse());
}
function cellAt(evt) {
  const p = svgPoint(svg, evt);
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  if (r < 0 || c < 0 || r >= st.n || c >= st.n) return -1;
  return r * st.n + c;
}
const RC = { x: 180, y: 64, r: 56 }; // compass rose centre/radius inside its viewBox
function dirAt(evt) {
  const p = svgPoint(rose, evt);
  const dx = p.x - RC.x, dy = p.y - RC.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 12 || dist > RC.r + 30) return -1;
  return ((Math.round((Math.atan2(dy, dx) * 180) / Math.PI / 45) + 2) % 8 + 8) % 8;
}

// ---------- drawings ----------
function flowerPath(cx, cy) {
  let d = '';
  const n = 12, R = S * 0.34;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.2, r = R * (0.85 + Math.random() * 0.25);
    d += line(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.2) + ' ';
  }
  return d;
}
function flowerTips(d) {
  // little seed heads at the end of every spoke
  return [...d.matchAll(/Q[-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)/g)].map(([, x, y]) => [+x, +y]);
}
function seedPath(cx, cy) {
  const ox = (Math.random() - 0.5) * 8, oy = (Math.random() - 0.5) * 8 + 4, x = cx + ox, y = cy + oy;
  const fluff = [-0.9, -0.3, 0.3, 0.9].map((a) => line(x, y - 4, x + Math.sin(a) * 9, y - 4 - Math.cos(a) * 9, 0.6)).join(' ');
  return { x, y, fluff };
}
function roleIcon(role, color) {
  if (role === 0) {
    let d = '';
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; d += `M${10 + Math.cos(a) * 2.5} ${10 + Math.sin(a) * 2.5} L${(10 + Math.cos(a) * 8).toFixed(1)} ${(10 + Math.sin(a) * 8).toFixed(1)} `; }
    return `<svg class="ricon" viewBox="0 0 20 20"><path d="${d}" stroke="${color}" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="10" r="2.6" fill="${color}"/></svg>`;
  }
  return `<svg class="ricon" viewBox="0 0 20 20" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><path d="M2 7h10a3 3 0 1 0-3-3M2 12h14a3 3 0 1 1-3 3M2 16.5h5"/></svg>`;
}

// ---------- rendering ----------
function seedDelays() {
  // stagger fresh seeds by their distance from the nearest upwind flower
  const out = {};
  const L = st.last;
  if (!L || L.t !== 'w') return out;
  const { ray } = DAN.geo(st.n);
  for (const f of st.flowers) ray[f][L.d].forEach((j, k) => { if (L.seeds.includes(j)) out[j] = Math.min(out[j] ?? 99, k); });
  return out;
}

function render(animate) {
  const n = st.n, W = M * 2 + n * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  const dc = dColor().main;
  let out = '';
  // meadow
  out += `<rect x="${M}" y="${M}" width="${n * S}" height="${n * S}" class="meadow"/>`;
  for (let k = 0; k <= n; k++) {
    const p = M + k * S;
    out += `<path class="grid" d="${shapeFor('gh' + k, () => line(M - 2, p, M + n * S + 2, p, 2))}"/>`;
    out += `<path class="grid" d="${shapeFor('gv' + k, () => line(p, M - 2, p, M + n * S + 2, 2))}"/>`;
  }
  // hint: inevitable squares
  if (cfg.hint && !over) for (const i of DAN.guaranteed(st)) {
    const [x, y] = cellXY(i);
    out += `<path class="sure" d="${shapeFor('h' + i, () => circle(x, y, S * 0.3, S * 0.3, 0.08))}"/>`;
  }
  // holes at the end
  if (over) st.cells.forEach((v, i) => {
    if (v) return;
    const [x, y] = cellXY(i);
    out += `<path class="hole" d="${shapeFor('o' + i, () => circle(x, y, S * 0.36, S * 0.36, 0.1))}" stroke="${wColor().main}"/>`;
  });
  const delays = animate ? seedDelays() : {};
  st.cells.forEach((v, i) => {
    if (v !== 1) return;
    const [cx, cy] = cellXY(i);
    const sd = shapeFor('s' + i, () => seedPath(cx, cy));
    const fresh = i in delays;
    out += `<g class="seed${fresh ? ' fresh' : ''}" style="${fresh ? `animation-delay:${(delays[i] * 0.09 + 0.1).toFixed(2)}s` : ''}">` +
      `<path d="${sd.fluff}" stroke="${dc}" class="fluff"/><circle cx="${sd.x.toFixed(1)}" cy="${sd.y.toFixed(1)}" r="4.3" fill="${dc}"/></g>`;
  });
  const lastPlant = st.last && st.last.t === 'p' ? st.last.i : -1;
  for (const i of st.flowers) out += flowerSVG(i, dc, animate && i === lastPlant ? ' fresh' : '');
  // gust swoosh
  if (animate && st.last && st.last.t === 'w') out += gustSVG(st.last.d, wColor().main);
  out += `<g id="ghost"></g>`;
  svg.innerHTML = out;
  renderCompass();
  renderPlayers();
  drawGhost();
}

function flowerSVG(i, color, cls = '', ghost = false) {
  const [cx, cy] = cellXY(i);
  const d = ghost ? shapeFor('gf' + i, () => flowerPath(cx, cy)) : shapeFor('f' + i, () => flowerPath(cx, cy));
  const tips = flowerTips(d).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3"/>`).join('');
  return `<g class="flower${cls}${ghost ? ' ghost' : ''}" style="transform-origin:${cx}px ${cy}px" fill="${color}">` +
    `<path d="${d}" stroke="${color}" class="spokes"/>${tips}` +
    `<path d="${shapeFor('fc' + i, () => circle(cx, cy, 6.5, 6.5, 0.1))}" fill="${color}" stroke="${color}" class="core" filter="url(#mg-crayon)"/></g>`;
}

function gustSVG(d, color) {
  const n = st.n, W = M * 2 + n * S, c = W / 2, a = ANG(d);
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
  let out = '';
  [-0.28, 0.05, 0.32].forEach((o, k) => {
    const L = W * 0.42, ox = c + px * o * W, oy = c + py * o * W;
    const x1 = ox - ux * L, y1 = oy - uy * L, x2 = ox + ux * L, y2 = oy + uy * L;
    const mx = (x1 + x2) / 2 + px * 14, my = (y1 + y2) / 2 + py * 14;
    out += `<path class="gust" style="animation-delay:${k * 0.08}s" d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${color}" pathLength="1"/>`;
  });
  return out;
}

function drawGhost() {
  const g = svg.querySelector('#ghost');
  if (!g) return;
  let out = '';
  const dc = dColor().main;
  const showDir = armed >= 0 ? armed : hover && hover.t === 'w' ? hover.d : -1;
  if (canMove() && DAN.turn(st) === 1 && showDir >= 0 && !st.used.includes(showDir)) {
    for (const j of DAN.gustSeeds(st, showDir)) {
      const [cx, cy] = cellXY(j);
      out += `<circle class="ghost-seed" cx="${cx}" cy="${cy + 3}" r="5" fill="${dc}"/>`;
    }
  }
  if (canMove() && DAN.turn(st) === 0 && hover && hover.t === 'p' && st.cells[hover.i] !== 2) out += flowerSVG(hover.i, dc, '', true);
  g.innerHTML = out;
}

function renderCompass() {
  const wc = wColor().main, ink = PALETTE.ink;
  let out = '';
  out += `<path class="rose-ring" d="${shapeFor('ring', () => circle(RC.x, RC.y, 16, 16, 0.08))}"/>`;
  const order = st.used;
  const turnW = !over && DAN.turn(st) === 1;
  for (let d = 0; d < 8; d++) {
    const a = ANG(d), r1 = 20, r2 = RC.r - (d % 2 ? 6 : 0);
    const x1 = RC.x + Math.cos(a) * r1, y1 = RC.y + Math.sin(a) * r1, x2 = RC.x + Math.cos(a) * r2, y2 = RC.y + Math.sin(a) * r2;
    const used = order.indexOf(d);
    const isLast = st.last && st.last.t === 'w' && st.last.d === d;
    const hl = armed === d || (hover && hover.t === 'w' && hover.d === d && canMove());
    const skipped = over && used < 0;
    const color = used >= 0 ? '#9a9aa2' : wc;
    const body = shapeFor('ar' + d, () => line(x1, y1, x2, y2, 1.5));
    const hx = Math.cos(a + 2.6) * 11, hy = Math.sin(a + 2.6) * 11, hx2 = Math.cos(a - 2.6) * 11, hy2 = Math.sin(a - 2.6) * 11;
    const head = `M${(x2 + hx).toFixed(1)} ${(y2 + hy).toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${(x2 + hx2).toFixed(1)} ${(y2 + hy2).toFixed(1)}`;
    const cls = ['arrow', used >= 0 ? 'used' : '', isLast ? 'last' : '', hl ? 'hl' : '', skipped ? 'skipped' : '', turnW && used < 0 && canMove() ? 'live' : ''].join(' ');
    out += `<g class="${cls}" data-d="${d}"><path d="${body} ${head}" stroke="${isLast ? wc : color}"/>`;
    if (used >= 0) {
      // cross it off and number it
      const mx = (x1 + x2) / 2 + Math.cos(a) * 6, my = (y1 + y2) / 2 + Math.sin(a) * 6;
      out += `<path class="xout" d="${shapeFor('x' + d, () => line(mx - 7, my - 7, mx + 7, my + 7, 0.8) + ' ' + line(mx + 7, my - 7, mx - 7, my + 7, 0.8))}" stroke="${isLast ? wc : ink}"/>`;
      const tx = RC.x + Math.cos(a) * (r2 + 14), ty = RC.y + Math.sin(a) * (r2 + 14);
      out += `<text class="ord" x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="${isLast ? wc : '#888'}">${used + 1}</text>`;
    }
    out += '</g>';
  }
  // side texts: empty squares and gusts used
  const tot = DAN.totals(st);
  const planted = st.flowers.length;
  out += `<g class="side-txt">` +
    `<text x="6" y="50" fill="${dColor().main}">${t('dan.count.p', { k: planted, n: tot.plants })}</text>` +
    `<text x="6" y="84" fill="${PALETTE.ink}">${t('dan.empty', { k: DAN.emptyCount(st) })}</text>` +
    `<text x="354" y="50" text-anchor="end" fill="${wc}">${t('dan.count.w', { k: st.used.length, n: tot.gusts })}</text></g>`;
  rose.setAttribute('viewBox', '0 0 360 128');
  rose.innerHTML = out;
  rose.classList.toggle('active', turnW && canMove());
  rose.classList.toggle('armed', armed >= 0);
}

function renderPlayers() {
  const cs = DAN.isOver(st) ? -1 : curSeat();
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && cs === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29 });
    const role = roleOf(p);
    el.querySelector('.score').innerHTML = `${roleIcon(role, COLORS[p].main)}<span>${t('dan.role' + role)}</span>`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const tr = DAN.turn(st);
  if (over || tr < 0) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('dan.online.wait');
  else if (armed >= 0) status.textContent = t('dan.confirm');
  else if (online()) status.textContent = isLocal(cs) ? t('dan.you.' + (tr ? 'w' : 'p')) : t('dan.them', { name: name(cs) });
  else if (isAI(cs)) status.textContent = t('dan.thinking', { name: name(cs) });
  else status.textContent = t('dan.turn.' + (tr ? 'w' : 'p'), { name: name(cs) });
  status.style.color = cs >= 0 ? COLORS[cs].main : '';

  $('#undo').disabled = online() || !history.length || (isAI(cs) && !over);
  $('#mode').disabled = online();
  $('#side').value = String(roleOf(0));
  $('#side-field').hidden = online() || cfg.mode === 'pvp';
  for (const id of ['#size', '#variant', '#new', '#swap', '#swap2', '#side']) $(id).disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#swap2').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('dan.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('dan.online.note') : '';
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
// Settings selects show the game actually on the board (online, the host's choice).
function showRules() { $('#size').value = st.n; $('#variant').value = st.variant; }

// ---------- flow ----------
function newGame(size = cfg.size, variant = cfg.variant) {
  clearTimeout(aiTimer);
  st = DAN.create(size, variant);
  showRules();
  history = []; shapes = {}; over = false; armed = -1; hover = null; sure = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  const prev = DAN.clone(st);
  history.push(prev);
  armed = -1; hover = null;
  const D = seatOf(0), Wd = seatOf(1);
  const before = DAN.holes(prev)[0];
  const seeds = DAN.apply(st, m);
  if (m.t === 'p') {
    const after = DAN.isOver(st) ? before : DAN.holes(st)[0];
    if (!sure && after === 0 && DAN.emptyCount(st) > 0) {
      sure = true;
      setMood(D, 'smug', 'up'); say(D, 'dan.say.sure');
      setMood(Wd, 'worried'); setTimeout(() => !over && say(Wd, 'dan.say.gloom'), 700);
    } else if (before - after >= 3) {
      setMood(D, 'happy', 'wave'); if (Math.random() < 0.6) say(D, 'dan.say.plant');
      if (moods[Wd].mood !== 'worried') setMood(Wd, 'neutral');
    } else {
      setMood(D, sure ? 'smug' : 'neutral');
      if (Math.random() < 0.25) say(D, 'dan.say.plant');
    }
  } else {
    const options = DAN.unused(prev).map((d) => DAN.gustSeeds(prev, d).length);
    const best = Math.min(...options), k = seeds.length;
    if (k >= 4 && k > best + 1) {
      setMood(D, 'happy', 'up'); say(D, 'dan.say.bigGust');
      setMood(Wd, 'worried'); if (Math.random() < 0.5) setTimeout(() => !over && say(Wd, 'dan.say.ouch'), 650);
    } else if (k <= Math.max(1, best)) {
      setMood(Wd, 'smug', 'wave'); if (Math.random() < 0.7) say(Wd, 'dan.say.calm');
      if (!sure) { setMood(D, 'sad'); if (Math.random() < 0.35) setTimeout(() => !over && say(D, 'dan.say.meh'), 650); }
    } else {
      setMood(Wd, 'neutral');
      if (!sure) setMood(D, 'neutral');
    }
  }
  if (DAN.isOver(st)) return finish();
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || DAN.isOver(st) || !isAI(curSeat())) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(curSeat())) return;
    play(DAN.aiMove(st, cfg.mode));
  }, DAN.turn(st) === 1 ? 750 : 600);
}

function finish() {
  over = true;
  const wRole = DAN.winner(st), w = seatOf(wRole), l = 1 - w;
  setMood(w, 'happy', 'up'); setMood(l, 'sad');
  render(true);
  resultText();
  setTimeout(() => { if (!over) return; say(w, 'dan.say.win'); setTimeout(() => over && say(l, 'dan.say.lose'), 900); }, 500);
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1500);
}

function resultText() {
  const wRole = DAN.winner(st), w = seatOf(wRole);
  const txt = $('#result-text');
  txt.textContent = t(wRole === 0 ? 'dan.win.d' : 'dan.win.w', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-sub').textContent = wRole === 0 ? t('dan.win.d.sub') : t('dan.win.w.sub', { cells: plural(DAN.emptyCount(st), 'dan.cells') });
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(curSeat()));
  over = false; armed = -1; hover = null;
  sure = DAN.holes(st)[0] === 0 && st.flowers.length > 0;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart, resize or swap roles; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  dSeat = cfg.dSeat;
  newGame();
  if (online()) sess.send('new', { size: cfg.size, variant: cfg.variant, dSeat });
}
function swapRoles() {
  if (!canRestart()) return;
  cfg.dSeat = 1 - dSeat; saveCfg();
  restart();
}

// ---------- online ----------
function sendState() { sess.send('state', { st, over, dSeat, names: cfg.names }); }
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = false; dSeat = d.dSeat; history = []; shapes = {}; armed = -1; hover = null;
    showRules();
    sure = !DAN.isOver(st) && st.flowers.length > 0 && DAN.holes(st)[0] === 0;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    if (DAN.isOver(st)) finish(); else render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.step || !DAN.isLegal(st, d.m) || isLocal(curSeat())) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => { if (s.host) return; dSeat = d.dSeat; newGame(d.size, d.variant); });
  if (s.host) { dSeat = cfg.dSeat; newGame(); }
  else render(false);
}

function localMove(m) {
  if (!DAN.isLegal(st, m)) return;
  if (online()) sess.send('move', { m, n: st.step });
  play(m);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse' || !canMove() || DAN.turn(st) !== 0) return;
  const i = cellAt(evt);
  const h = i >= 0 && st.cells[i] !== 2 ? { t: 'p', i } : null;
  if ((h && h.i) === (hover && hover.i)) return;
  hover = h;
  svg.style.cursor = h ? 'pointer' : '';
  drawGhost();
});
svg.addEventListener('pointerleave', () => { if (hover && hover.t === 'p') { hover = null; drawGhost(); } });
svg.addEventListener('click', (evt) => {
  if (!canMove() || DAN.turn(st) !== 0) return;
  const i = cellAt(evt);
  if (i >= 0 && st.cells[i] !== 2) localMove({ t: 'p', i });
});

rose.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse' || !canMove() || DAN.turn(st) !== 1) return;
  const d = dirAt(evt);
  const h = d >= 0 && !st.used.includes(d) ? { t: 'w', d } : null;
  if ((h && h.d) === (hover && hover.d) && !!h === !!hover) return;
  hover = h;
  rose.style.cursor = h ? 'pointer' : '';
  renderCompass(); drawGhost();
});
rose.addEventListener('pointerleave', () => { if (hover && hover.t === 'w') { hover = null; renderCompass(); drawGhost(); } });
rose.addEventListener('click', (evt) => {
  if (!canMove() || DAN.turn(st) !== 1) return;
  const d = dirAt(evt);
  if (d < 0 || st.used.includes(d)) { if (armed >= 0) { armed = -1; render(false); } return; }
  // Mouse: hovering already previewed it. Touch/pen: first tap previews, second tap blows.
  if (evt.pointerType === 'mouse' || armed === d) localMove({ t: 'w', d });
  else { armed = d; renderCompass(); drawGhost(); renderPlayers(); }
});

$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
$('#variant').addEventListener('change', (e) => { cfg.variant = e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#side').addEventListener('change', (e) => { cfg.dSeat = e.target.value === '0' ? 0 : 1; saveCfg(); restart(); });
$('#hint').addEventListener('change', (e) => { cfg.hint = e.target.checked; saveCfg(); render(false); });
$('#swap').addEventListener('click', swapRoles);
$('#swap2').addEventListener('click', swapRoles);
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    render(false);
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) resultText(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#hint').checked = cfg.hint;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; dSeat = cfg.dSeat; newGame(); },
});
if (!online()) showOnce('how', SLUG);
