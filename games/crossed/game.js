import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { CROSSED as C } from './engine.js';
import './strings.js';

const SLUG = 'crossed';
const V = 360, M = 26, L = V - 2 * M; // viewBox size, margin, side of the square
const HIT = 30;                        // tap radius around a dot (viewBox units)
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 4, mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (![3, 4, 5].includes(cfg.size)) cfg.size = 4;
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, over, aiTimer, sel = null, lastFirst = 1;
let drag = null;                    // { from, moved } while a pointer is down
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('cr.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('cr.p' + p);
}

// ---------- geometry ----------
const xy = (d) => { const [x, y] = C.pos(st.n, d); return [M + x * L, M + y * L]; };
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
// Nearest free dot to the pointer (optionally only those that pass `ok`), within `r`.
function dotAt(p, ok = () => true, r = HIT) {
  let best = -1, bd = r;
  for (let d = 0; d < st.used.length; d++) {
    if (st.used[d] >= 0 || !ok(d)) continue;
    const [x, y] = xy(d), dd = Math.hypot(p.x - x, p.y - y);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}
const hasPartner = (d) => C.legalMoves(st).some(([a, b]) => a === d || b === d);
const partnerOf = (d) => (e) => C.isLegal(st, d, e);

const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- rendering ----------
function render(animateLast) {
  svg.setAttribute('viewBox', `0 0 ${V} ${V}`);
  let out = '';
  // the square: four pencil sides, each drawn separately so "sides" read clearly
  const c = [[M, M], [M + L, M], [M + L, M + L], [M, M + L]];
  for (let i = 0; i < 4; i++) {
    const [a, b] = c[i], [e, f] = c[(i + 1) % 4];
    out += `<path class="frame" d="${shapeFor('f' + i, () => line(a, b, e, f, 1.2))}"/>`;
  }
  for (let i = 0; i < 4; i++) {
    const [x, y] = c[i];
    out += `<path class="corner" d="${shapeFor('c' + i, () => circle(x, y, 2.4, 2.4, 0.1))}"/>`;
  }

  const lastI = st.lines.length - 1;
  st.lines.forEach((l, i) => {
    const [x1, y1] = xy(l.a), [x2, y2] = xy(l.b);
    const d = shapeFor(`l${l.a}_${l.b}`, () => line(x1, y1, x2, y2, 1.8));
    out += `<path class="ln${i === lastI && animateLast ? ' fresh' : ''}" d="${d}" stroke="${COLORS[l.p].main}" pathLength="1"/>`;
  });

  // where the latest line crossed earlier ones, and what it earned
  if (lastI >= 0 && sel == null) {
    const l = st.lines[lastI], col = COLORS[l.p];
    const prev = { ...st, lines: st.lines.slice(0, lastI) };
    const cr = C.crossings(prev, l.a, l.b, l.p);
    for (const k of cr) {
      const [ux, uy] = C.meet(st.n, l, st.lines[k.i]);
      const x = M + ux * L, y = M + uy * L;
      out += `<circle class="hit${animateLast ? ' fresh' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${k.own ? 7 : 5}" stroke="${col.text}"/>`;
    }
    if (cr.length) out += gainLabel(l.a, l.b, cr.reduce((s, k) => s + k.pts, 0), l.p, animateLast ? ' fresh' : '');
  }

  out += `<g id="preview"></g>`;

  const targets = sel != null ? partnerOf(sel) : null;
  for (let d = 0; d < st.used.length; d++) {
    const [x, y] = xy(d), u = st.used[d];
    let cls = 'dot';
    if (u >= 0) cls += ' used';
    else if (sel === d) cls += ' sel';
    else if (targets) cls += targets(d) ? ' target' : ' off';
    const fill = u >= 0 ? COLORS[u].text : sel === d ? COLORS[st.turn].main : '';
    out += `<path class="${cls}" d="${shapeFor('d' + d, () => circle(x, y, 5, 5, 0.12))}"${fill ? ` fill="${fill}"` : ''}/>`;
    if (sel === d) out += `<circle class="ring" cx="${x}" cy="${y}" r="13" stroke="${COLORS[st.turn].main}"/>`;
  }
  svg.innerHTML = out;
  renderPlayers();
}

function gainLabel(a, b, pts, p, extra = '') {
  const [x1, y1] = xy(a), [x2, y2] = xy(b);
  // put it a little off the middle of the line, nudged towards the centre of the board
  let x = (x1 + x2) / 2, y = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const sgn = (V / 2 - x) * nx + (V / 2 - y) * ny > 0 ? 1 : -1;
  x += nx * 18 * sgn; y += ny * 18 * sgn;
  x = Math.min(V - 22, Math.max(22, x)); y = Math.min(V - 14, Math.max(16, y));
  return `<text class="gain${extra}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${COLORS[p].text}">+${pts}</text>`;
}

function showPreview(target, px, py) {
  const g = svg.querySelector('#preview');
  if (!g) return;
  if (sel == null) { g.innerHTML = ''; return; }
  const [x1, y1] = xy(sel), col = COLORS[st.turn].main;
  if (target >= 0) {
    const [x2, y2] = xy(target);
    g.innerHTML = `<path class="pv" d="M${x1} ${y1} L${x2} ${y2}" stroke="${col}"/>` + gainLabel(sel, target, C.gain(st, sel, target), st.turn);
  } else if (px != null) {
    g.innerHTML = `<path class="pv loose" d="M${x1} ${y1} L${px.toFixed(1)} ${py.toFixed(1)}" stroke="${col}"/>`;
  } else g.innerHTML = '';
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    el.querySelector('.score').textContent = plural(st.score[p], 'cr.points');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('cr.online.wait');
  else if (sel != null) status.textContent = t('cr.pick2');
  else if (online()) status.textContent = isLocal(st.turn) ? t('cr.turn.you') : t('cr.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('cr.thinking', { name: name(st.turn) });
  else status.textContent = t('cr.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over) || !history.some((h) => isLocal(h.turn));
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('cr.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('cr.online.note') : '';
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
  sayTimers.splice(0).forEach(clearTimeout); // a delayed line from the last game must not pop up in the next
  document.querySelectorAll('.player .bubble').forEach((b) => b.classList.remove('show'));
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame(size = cfg.size, first = 1 - lastFirst) {
  clearTimeout(aiTimer);
  lastFirst = first;
  st = C.create(size, first);
  history = []; shapes = {}; over = false; sel = null; drag = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  history.push(C.clone(st));
  const who = st.turn, other = 1 - who;
  sel = null;
  const r = C.apply(st, m);
  if (r.pts >= 4) {
    setMood(who, 'happy', 'up'); setMood(other, 'worried');
    say(who, 'cr.say.big'); say(other, 'cr.say.ouch', 700);
  } else if (r.own > 0) {
    setMood(who, 'happy', 'wave'); setMood(other, r.pts >= 3 ? 'sad' : 'neutral');
    if (Math.random() < 0.75) say(who, 'cr.say.self');
  } else if (r.pts > 0) {
    setMood(who, 'smug'); setMood(other, 'neutral');
    if (Math.random() < 0.5) say(who, 'cr.say.cross');
  } else {
    setMood(who, 'neutral'); setMood(other, 'neutral');
    if (Math.random() < 0.25) say(who, 'cr.say.quiet');
  }
  if (C.isOver(st)) return finish();
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    play(C.aiMove(st, cfg.mode));
  }, 700);
}

function finish() {
  over = true;
  const w = C.winner(st);
  if (w < 0) { setMood(0, 'worried', 'up'); setMood(1, 'worried', 'up'); say(0, 'cr.say.tie', 600); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'cr.say.win', 600); say(1 - w, 'cr.say.lose', 1500); }
  render(true);
  resultText();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1300);
}
function resultText() {
  const [a, b] = st.score, w = C.winner(st);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('cr.tie', { a, b }) : t('cr.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-sub').textContent = t('cr.next', { name: name(1 - st.first) });
  $('#result-sub').hidden = !canRestart(); // the guest sees who restarts instead
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; sel = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and resize); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sess.send('new', { size: cfg.size, first: st.first });
}

// ---------- online ----------
function sendState() {
  sess.send('state', { st, over, names: cfg.names });
}
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
    st = d.st; over = d.over; history = []; shapes = {}; sel = null; drag = null;
    lastFirst = st.first;
    cfg.size = st.n; $('#size').value = st.n;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    const m = d.m;
    if (over || d.n !== st.lines.length || !Array.isArray(m) || st.turn === mySeat() || !C.isLegal(st, m[0], m[1])) {
      return s.host ? sendState() : s.send('resync');
    }
    play(m);
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => {
    if (s.host) return;
    cfg.size = d.size; $('#size').value = d.size;
    newGame(d.size, d.first);
  });
  if (s.host) newGame();
  else render(false);
}

function localMove(m) {
  if (online()) sess.send('move', { m, n: st.lines.length });
  play(m);
}

// ---------- input ----------
// Tap a dot, then a partner dot; or press on a dot and drag to the partner.
svg.addEventListener('pointerdown', (evt) => {
  if (!canMove()) return;
  const p = svgPoint(evt);
  if (sel != null) {
    const tgt = dotAt(p, partnerOf(sel));
    if (tgt >= 0) { localMove([sel, tgt]); return; }
  }
  const d = dotAt(p);
  if (d < 0) { if (sel != null) { sel = null; render(false); } return; }
  if (d === sel) { drag = { from: d, moved: false, wasSel: true }; }
  else {
    if (!hasPartner(d)) return;
    sel = d; drag = { from: d, moved: false, wasSel: false };
    render(false);
  }
  try { svg.setPointerCapture(evt.pointerId); } catch {}
});

svg.addEventListener('pointermove', (evt) => {
  if (!canMove()) return;
  const p = svgPoint(evt);
  if (drag) {
    const [x0, y0] = xy(drag.from);
    if (Math.hypot(p.x - x0, p.y - y0) > 12) drag.moved = true;
    if (drag.moved) showPreview(dotAt(p, partnerOf(sel), HIT * 0.9), p.x, p.y);
    return;
  }
  if (evt.pointerType !== 'mouse') return;
  if (sel != null) showPreview(dotAt(p, partnerOf(sel)));
  const near = dotAt(p, sel != null ? partnerOf(sel) : hasPartner);
  svg.style.cursor = near >= 0 ? 'pointer' : '';
});

svg.addEventListener('pointerup', (evt) => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!canMove() || sel == null) return;
  if (d.moved) {
    const tgt = dotAt(svgPoint(evt), partnerOf(sel), HIT * 0.9);
    if (tgt >= 0) return localMove([sel, tgt]);
    showPreview(-1); // keep the dot selected: finish with a tap
  } else if (d.wasSel) {
    sel = null; render(false); // tapping the selected dot again lets go of it
  }
});
svg.addEventListener('pointercancel', () => { drag = null; showPreview(-1); });
svg.addEventListener('pointerleave', (evt) => { if (!drag && evt.pointerType === 'mouse') showPreview(-1); });

$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
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
document.addEventListener('mg:lang', () => { render(false); if (over) resultText(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
newGame(cfg.size, 0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);

// test hook for gameplay scripts
window.__crossed = { get st() { return st; }, xy: (d) => xy(d), get over() { return over; } };
