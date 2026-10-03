import { t, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { RT } from './engine.js';
import './strings.js';

const SLUG = 'racetrack';
const S = 20, M = 12;                       // px per grid square, margin
const VW = RT.W * S + 2 * M, VH = RT.H * S + 2 * M;
const X = (x) => M + x * S, Y = (y) => M + y * S;
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ track: 'loop', penalty: '2', mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-racetrack') || '{}'));
if (!RT.TRACKS.includes(cfg.track)) cfg.track = 'loop';
const saveCfg = () => localStorage.setItem('mg-racetrack', JSON.stringify(cfg));

let st, history = [], over = false, aiTimer, sel = -1, hover = -1, ptrType = 'mouse';
let nextFirst = 0, leader = -1, lastEv = null;
let sess = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];
const angles = [-90, -90];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('rt.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('rt.p' + p);
}

// ---------- static track art (cached per track) ----------
const artCache = {};
function trackArt(id) {
  if (artCache[id]) return artCache[id];
  const T = RT.track(id);
  const poly = (w) => 'M' + w.map(([x, y]) => `${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join('L') + 'Z';
  const band = poly(T.walls[0]) + poly(T.walls[1]);
  let s = `<defs>
    <pattern id="rt-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 3.5H7" stroke="var(--rt-hatch)" stroke-width="1.6"/></pattern>
    <clipPath id="rt-band"><path d="${band}" clip-rule="evenodd"/></clipPath>
  </defs>`;
  let g = '';
  for (let x = 0; x <= RT.W; x++) g += `M${X(x)} ${M - 8}V${VH - M + 8}`;
  for (let y = 0; y <= RT.H; y++) g += `M${M - 8} ${Y(y)}H${VW - M + 8}`;
  s += `<path class="grid" d="${g}"/>`;
  s += `<path class="outside" d="M0 0H${VW}V${VH}H0Z${band}" fill-rule="evenodd"/>`;
  // finish: a chequered strip clipped to the band
  const [[fx1, fy], [fx2]] = T.finish, q = 0.25;
  let ch = '';
  for (let i = 0, x = Math.floor(fx1 / q) * q; x < fx2; x += q, i++)
    for (let r = 0; r < 2; r++) if ((i + r) % 2 === 0) ch += `M${X(x).toFixed(1)} ${Y(fy - q + r * q).toFixed(1)}h${q * S}v${q * S}h${-q * S}Z`;
  s += `<g clip-path="url(#rt-band)"><rect x="${X(fx1)}" y="${Y(fy - q)}" width="${(fx2 - fx1) * S}" height="${2 * q * S}" fill="var(--card)"/><path class="checker" d="${ch}"/></g>`;
  // pencil chevrons showing the direction of travel
  const C = T.center, n = C.length;
  withSeed(7, () => {
    for (let k = 1; k <= 7; k++) {
      const i = Math.round((k * n) / 8) % n, a = C[(i - 1 + n) % n], b = C[(i + 1) % n];
      const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      s += `<path class="chev" transform="translate(${X(C[i][0]).toFixed(1)} ${Y(C[i][1]).toFixed(1)}) rotate(${ang.toFixed(1)})" d="${line(-9, 0, 7, 0, 0.8)} ${line(1, -5, 7, 0, 0.5)} ${line(7, 0, 1, 5, 0.5)}"/>`;
    }
    for (const w of T.walls) s += `<path class="wall" d="${poly(w)}"/>`;
  });
  return (artCache[id] = s);
}

// ---------- rendering ----------
function boom(x, y, r = 9, cls = 'boom') {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8, rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
  }
  return `<path class="${cls}" d="${d}Z"/>`;
}

function carSVG(p, fresh) {
  const c = st.cars[p], col = COLORS[p];
  if (c.vx || c.vy) angles[p] = (Math.atan2(c.vy, c.vx) * 180) / Math.PI;
  let style = '', cls = 'car';
  if (fresh && lastEv && lastEv.p === p) {
    const [fx, fy] = lastEv.crash ? lastEv.exit : lastEv.from;
    style = ` style="--dx:${((fx - c.x) * S).toFixed(1)}px;--dy:${((fy - c.y) * S).toFixed(1)}px"`;
    cls += lastEv.crash ? ' fresh crashed' : ' fresh';
  }
  return `<g class="${cls}"${style}><g transform="translate(${X(c.x)} ${Y(c.y)}) rotate(${angles[p].toFixed(0)}) scale(.85)">
    <rect x="-6" y="-7.5" width="4.5" height="3" rx="1" fill="${INK}"/><rect x="3.5" y="-7.5" width="4.5" height="3" rx="1" fill="${INK}"/>
    <rect x="-6" y="4.5" width="4.5" height="3" rx="1" fill="${INK}"/><rect x="3.5" y="4.5" width="4.5" height="3" rx="1" fill="${INK}"/>
    <path d="M-9 -4.6Q-9 -5.6 -8 -5.6H6Q10.5 -5.6 10.5 0Q10.5 5.6 6 5.6H-8Q-9 5.6 -9 4.6Z" fill="${col.main}" stroke="${col.text}" stroke-width="1.6"/>
    <path d="M2.2 -3.8Q5.4 0 2.2 3.8" fill="none" stroke="var(--eye)" stroke-width="2" stroke-linecap="round"/>
  </g></g>`;
}

function trailSVG(p, fresh) {
  const c = st.cars[p], col = COLORS[p].main, tr = c.trail;
  let s = '', d = '';
  for (let i = 1; i < tr.length; i++) {
    const [ax, ay] = tr[i - 1], [bx, by, ex, ey] = tr[i];
    const isNew = fresh && i === tr.length - 1 && lastEv && lastEv.p === p;
    if (ex === undefined) {
      const seg = `M${X(ax)} ${Y(ay)}L${X(bx)} ${Y(by)}`;
      if (isNew) s += `<path class="trail fresh" d="${seg}" stroke="${col}" pathLength="1"/>`;
      else d += seg;
    } else {
      s += `<path class="trail" d="M${X(ax)} ${Y(ay)}L${X(ex).toFixed(1)} ${Y(ey).toFixed(1)}" stroke="${col}"/>`;
      s += `<path class="trail tow" d="M${X(ex).toFixed(1)} ${Y(ey).toFixed(1)}L${X(bx)} ${Y(by)}" stroke="${col}"/>`;
      s += boom(X(ex), Y(ey), 8, 'boom' + (isNew ? ' fresh' : ''));
    }
  }
  s = `<path class="trail" d="${d}" stroke="${col}"/>` + s;
  for (let i = 0; i < tr.length - 1; i++) s += `<circle class="stop" cx="${X(tr[i][0])}" cy="${Y(tr[i][1])}" r="2.6" fill="${col}"/>`;
  return s;
}

function render(fresh = false) {
  svg.setAttribute('viewBox', `0 0 ${VW} ${VH}`);
  let s = trackArt(st.track);
  // the car to move is drawn on top
  const order = st.turn === 0 ? [1, 0] : [0, 1];
  for (const p of order) s += `<g class="tr${p}">${trailSVG(p, fresh)}</g>`;
  s += '<g id="opts"></g>';
  for (const p of order) s += carSVG(p, fresh);
  svg.innerHTML = s;
  sel = -1; hover = -1;
  renderOpts();
  renderPlayers();
}

// The 9 choices around the "coasting" point for a local player.
let opts = [], doomIdx = -1;
function renderOpts() {
  const g = svg.querySelector('#opts');
  if (!g) return;
  opts = canMove() ? RT.options(st) : [];
  doomIdx = -1;
  if (!opts.length) { g.innerHTML = ''; return; }
  const c = st.cars[st.turn], col = COLORS[st.turn], T = RT.track(st.track);
  if (opts.every((o) => o.crash || o.blocked)) {
    let bv = Infinity;
    opts.forEach((o, i) => {
      if (o.blocked) return;
      const r = T.drive(c.x, c.y, o.x, o.y), v = T.togo(r.rx, r.ry);
      if (v < bv) { bv = v; doomIdx = i; }
    });
  }
  const cx = c.x + c.vx, cy = c.y + c.vy;
  let s = `<rect class="box" x="${X(cx - 1.45)}" y="${Y(cy - 1.45)}" width="${2.9 * S}" height="${2.9 * S}" rx="12"/>`;
  if (c.vx || c.vy) s += `<path class="inertia" d="M${X(c.x)} ${Y(c.y)}L${X(cx)} ${Y(cy)}"/>`;
  const act = sel >= 0 ? sel : hover;
  if (act >= 0) {
    const o = opts[act];
    if (o.crash) {
      const r = T.drive(c.x, c.y, o.x, o.y);
      s += `<path class="pv crash" d="M${X(c.x)} ${Y(c.y)}L${X(r.ex).toFixed(1)} ${Y(r.ey).toFixed(1)}" stroke="${col.main}"/>` + boom(X(r.ex), Y(r.ey), 7, 'boom pv');
    } else s += `<path class="pv" d="M${X(c.x)} ${Y(c.y)}L${X(o.x)} ${Y(o.y)}" stroke="${col.main}"/>`;
  }
  opts.forEach((o, i) => {
    const x = X(o.x), y = Y(o.y);
    if (o.blocked) return;
    if (o.crash) s += `<path class="no${i === act ? ' on' : ''}" d="M${x - 4} ${y - 4}L${x + 4} ${y + 4}M${x + 4} ${y - 4}L${x - 4} ${y + 4}"/>`;
    else s += `<circle class="opt${i === act ? ' on' : ''}" cx="${x}" cy="${y}" r="${i === act ? 6.5 : 5.2}" stroke="${col.main}" fill="${i === act ? col.main : 'var(--card)'}"/>`;
  });
  g.innerHTML = s;
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 11 + p * 31 });
    const c = st.cars[p];
    el.querySelector('.score').textContent = c.laps >= 1 ? t('rt.card.done')
      : c.skip > 0 ? t('rt.card.pits', { n: c.skip })
      : t('rt.card', { pct: Math.round(RT.progress(st, p) * 100), v: Math.max(Math.abs(c.vx), Math.abs(c.vy)) });
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  renderStatus();
  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#track').disabled = !canRestart();
  $('#penalty').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('rt.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('rt.online.note') : '';
}

function renderStatus() {
  const status = $('#status'), p = st.turn;
  const last = st.pending >= 0;
  const again = lastEv && lastEv.skipped.length && lastEv.p === p;
  let txt;
  if (over) txt = '';
  else if (online() && !sess.connected) txt = t('rt.online.wait');
  else if (sel < 0 && doomIdx >= 0 && canMove()) txt = t('rt.doomed');
  else if (sel >= 0 && canMove()) txt = t(opts[sel].crash ? 'rt.confirm.crash' : 'rt.confirm');
  else if (online()) txt = isLocal(p) ? t(last ? 'rt.turn.you.last' : 'rt.turn.you') : t('rt.turn.them', { name: name(p) });
  else if (isAI(p)) txt = t('rt.thinking', { name: name(p) });
  else txt = t(last ? 'rt.turn.last' : again ? 'rt.turn.again' : 'rt.turn', { name: name(p) });
  status.textContent = txt;
  status.style.color = COLORS[p].main;
}

const bubbleTimers = [];
function say(p, key, delay = 0) {
  const show = () => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  };
  delay ? setTimeout(show, delay) : show();
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  st = RT.create(cfg.track, { penalty: cfg.penalty, first });
  history = []; over = false; leader = -1; lastEv = null;
  angles[0] = angles[1] = -90;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  const prev = RT.clone(st);
  const ev = RT.apply(st, m);
  if (!ev) return false;
  history.push(prev);
  lastEv = ev;
  react(ev);
  if (st.over) { finish(); return true; }
  render(true);
  maybeAI();
  return true;
}

function react(ev) {
  const p = ev.p, q = 1 - p;
  if (ev.crash) {
    setMood(p, 'sad'); say(p, 'say.crash');
    setMood(q, 'smug'); if (Math.random() < 0.7) say(q, 'say.gloat', 700);
    return;
  }
  if (ev.finished) {
    setMood(p, 'happy', 'up'); say(p, 'say.finish');
    if (ev.reply) { setMood(q, 'worried'); say(q, 'say.chase', 800); }
    return;
  }
  // overtaking: who is ahead along the track (with a little slack so the start doesn't count)
  const d = RT.position(st, 0) - RT.position(st, 1);
  const now = d > 1.5 ? 0 : d < -1.5 ? 1 : leader;
  if (now !== leader && leader >= 0 && now === p) {
    setMood(p, 'happy', 'wave'); say(p, 'say.pass');
    setMood(q, 'worried'); say(q, 'say.passed', 800);
  } else if (ev.speed >= 5) {
    setMood(p, 'happy', 'wave'); if (Math.random() < 0.5) say(p, 'say.fast');
  } else setMood(p, now === p ? 'happy' : 'neutral');
  leader = now;
  if (moods[q].mood === 'smug' || moods[q].mood === 'worried') setMood(q, 'neutral');
  for (const n of ev.skipped) { setMood(n, 'worried'); if (Math.random() < 0.6) say(n, 'say.pits', 500); }
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const m = RT.aiMove(st, cfg.mode);
    play(m);
  }, lastEv && lastEv.skipped.length ? 900 : 650);
}

function finish() {
  over = true;
  const w = st.winner;
  nextFirst = 1 - st.first;
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'say.win', 300); say(1 - w, 'say.lose', 1100); }
  render(true);
  showResult();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1100);
}

function showResult() {
  const w = st.winner, txt = $('#result-text');
  txt.textContent = w < 0 ? t('rt.tie') : t('rt.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').textContent = (w < 0 ? t('rt.why.tie') : t('rt.why.' + st.reason)) + '. ' + t('rt.next', { name: name(nextFirst) }) + '.';
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; lastEv = null; leader = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and change track/penalty); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sess.send('new', { track: cfg.track, penalty: cfg.penalty, first: st.first });
}

// ---------- online ----------
function sendState() { sess.send('state', { st, names: cfg.names, nextFirst }); }
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => { renderOpts(); renderPlayers(); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = st.over; history = []; lastEv = null; leader = -1; nextFirst = d.nextFirst;
    $('#track').value = st.track; $('#penalty').value = String(st.penalty);
    remoteNames[0] = d.names[0];
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; renderPlayers(); if (over) showResult(); });
  s.on('move', (d) => {
    if (d.n !== st.n || st.turn === mySeat() || !play(d.m)) return s.host ? sendState() : s.send('resync');
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => {
    if (s.host) return;
    cfg.track = d.track; cfg.penalty = d.penalty;
    $('#track').value = d.track; $('#penalty').value = String(d.penalty);
    newGame(d.first);
  });
  if (s.host) newGame();
  else render(false);
}

function localMove(i) {
  const o = opts[i];
  const m = { ax: o.ax, ay: o.ay };
  const n = st.n;
  if (play(m) && online()) sess.send('move', { m, n });
}

// ---------- input ----------
function optAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  let best = -1, bd = S * 0.72;
  opts.forEach((o, i) => {
    if (o.blocked) return;
    const d = Math.hypot(p.x - X(o.x), p.y - Y(o.y));
    if (d < bd) { bd = d; best = i; }
  });
  // every choice is a crash (maybe off the board): any tap picks the least bad one
  return best < 0 && doomIdx >= 0 ? doomIdx : best;
}
svg.addEventListener('pointerdown', (e) => { ptrType = e.pointerType || 'mouse'; });
svg.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !canMove()) return;
  const i = optAt(e);
  if (i === hover) return;
  hover = i;
  svg.style.cursor = i >= 0 ? 'pointer' : '';
  renderOpts();
});
svg.addEventListener('pointerleave', () => { if (hover >= 0) { hover = -1; renderOpts(); } });
svg.addEventListener('click', (e) => {
  if (!canMove()) return;
  const i = optAt(e);
  if (i < 0) { if (sel >= 0) { sel = -1; renderOpts(); renderStatus(); } return; }
  const mouse = ptrType === 'mouse';
  if (i === sel || (mouse && !opts[i].crash)) return localMove(i);
  sel = i;
  renderOpts();
  renderStatus();
});

$('#track').addEventListener('change', (e) => { cfg.track = e.target.value; saveCfg(); restart(); });
$('#penalty').addEventListener('change', (e) => { cfg.penalty = e.target.value; saveCfg(); restart(); });
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
  }));
document.addEventListener('mg:lang', () => { renderPlayers(); if (over) showResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#track').value = cfg.track;
$('#penalty').value = cfg.penalty;
$('#mode').value = cfg.mode;
newGame();
mountOnline({ slug: SLUG, button: $('#online'), onSession, onEnd: () => { sess = null; newGame(); } });
if (!online()) showOnce('how', SLUG);
