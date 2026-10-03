import { t, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { AMZ } from './engine.js';
import './strings.js';

const SLUG = 'amazons';
const S = 50, M = 8; // cell size, margin
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 8, mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-amazons') || '{}'));
if (!AMZ.SIZES.includes(+cfg.size)) cfg.size = 8;
const saveCfg = () => localStorage.setItem('mg-amazons', JSON.stringify(cfg));

let st, history, over, aiTimer, hoverCell = -1;
let sel = -1;                       // selected amazon (picking a destination)
let pend = null;                    // {from, to}: amazon moved, arrow not shot yet
let nextFirst = 0;                  // who opens the next game (alternates)
let sess = null;                    // online session (shared/net.js), null when playing locally
let wasSealed = false;
let slideShown = false;              // the step was already animated while waiting for the arrow
let pendFresh = false;               // animate the pending step once
const shapes = {};                  // cached wobble per element
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
  if (isAI(p)) return t('amz.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('amz.p' + p);
}

// ---------- geometry ----------
// The online guest (red) sees the board turned around, so their own amazons start at the bottom.
const flipped = () => online() && mySeat() === 1;
const W = () => M * 2 + st.N * S;
function cellXY(i) {
  const N = st.N;
  let r = Math.floor(i / N), c = i % N;
  if (flipped()) { r = N - 1 - r; c = N - 1 - c; }
  return [M + c * S + S / 2, M + r * S + S / 2];
}
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const N = st.N;
  let c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  if (r < 0 || r >= N || c < 0 || c >= N) return -1;
  if (flipped()) { r = N - 1 - r; c = N - 1 - c; }
  return r * N + c;
}
const shapeFor = (k, make) => (shapes[k] ??= make());
const fx = (n) => n.toFixed(1);

// ---------- pieces ----------
function burnt(i, fresh) {
  const [x, y] = cellXY(i), h = S / 2 - 3;
  const d = shapeFor('x' + i + flipped(), () => {
    const j = () => (Math.random() * 2 - 1) * 1.8;
    return `M${fx(x - h + j())} ${fx(y - h + j())} L${fx(x + h + j())} ${fx(y - h + j())} L${fx(x + h + j())} ${fx(y + h + j())} L${fx(x - h + j())} ${fx(y + h + j())} Z`;
  });
  const hatch = shapeFor('xh' + i + flipped(), () => {
    let p = '';
    for (let k = -1; k <= 1; k++) {
      const cx = x + k * h * 0.5, cy = y + k * h * 0.5, L = h * (k ? 0.45 : 0.7);
      p += line(cx - L, cy + L, cx + L, cy - L, 0.8) + ' ';
    }
    return p;
  });
  let s = `<g class="burnt${fresh ? ' fresh' : ''}"><path d="${d}" fill="${INK}" opacity=".78" filter="url(#mg-crayon)"/>`;
  s += `<path d="${hatch}" stroke="${INK}" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>`;
  if (fresh) s += flame(x, y);
  return s + '</g>';
}

function flame(x, y) {
  const outer = `M${x} ${y + 14} C${x - 13} ${y + 13} ${x - 13} ${y - 1} ${x - 6} ${y - 8} C${x - 5} ${y - 3} ${x - 2} ${y - 2} ${x - 2} ${y - 4} C${x - 3} ${y - 11} ${x + 2} ${y - 16} ${x + 4} ${y - 19} C${x + 4} ${y - 11} ${x + 13} ${y - 6} ${x + 12} ${y + 4} C${x + 11} ${y + 11} ${x + 6} ${y + 14} ${x} ${y + 14} Z`;
  const inner = `M${x} ${y + 12} C${x - 6} ${y + 12} ${x - 7} ${y + 5} ${x - 3} ${y} C${x - 2} ${y + 3} ${x + 1} ${y + 3} ${x + 1} ${y - 3} C${x + 5} ${y + 1} ${x + 7} ${y + 6} ${x + 5} ${y + 9} C${x + 4} ${y + 11} ${x + 2} ${y + 12} ${x} ${y + 12} Z`;
  return `<g class="flame"><path d="${outer}" fill="#f39a2b" filter="url(#mg-crayon)"/><path d="${outer}" fill="none" stroke="#d9601c" stroke-width="2"/><path d="${inner}" fill="#ffd54a"/></g>`;
}

function amazon(i, p, { fresh, at, dead } = {}) {
  const [x, y] = cellXY(at ?? i);
  const col = COLORS[p], R = S * 0.38;
  const k = `a${p}_${i}`;
  let style = '', cls = 'amz';
  if (fresh != null) {
    const [ox, oy] = cellXY(fresh);
    style = ` style="--dx:${fx(ox - x)}px;--dy:${fx(oy - y)}px"`;
    cls += ' fresh';
  }
  if (dead) cls += ' dead';
  const body = shapeFor(k + 'b', () => circle(0, 0, R, R, 0.06));
  // a little crown, with one lazy wobble
  const crown = shapeFor(k + 'c', () => {
    const j = () => (Math.random() * 2 - 1) * 0.8;
    return `M${fx(-9 + j())} 5 L${fx(-10 + j())} ${fx(-6 + j())} L-4.5 ${fx(-1 + j())} L${fx(j())} ${fx(-10 + j())} L4.5 ${fx(-1 + j())} L${fx(10 + j())} ${fx(-6 + j())} L${fx(9 + j())} 5 Z`;
  });
  return `<g class="${cls}"${style}><g transform="translate(${fx(x)} ${fx(y)})">
    <path d="${body}" fill="${col.fill}" filter="url(#mg-crayon)"/>
    <path d="${body}" fill="none" stroke="${col.main}" stroke-width="3.6"/>
    <path d="${crown}" fill="${col.main}" stroke="${col.dark}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="0" cy="-10" r="1.8" fill="${col.dark}"/></g></g>`;
}

function trail(a, b, color, k, cls, head) {
  const [x1, y1] = cellXY(a), [x2, y2] = cellXY(b);
  const len = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const cut = head ? 12 : 4, ex = x2 - ux * cut, ey = y2 - uy * cut;
  const body = shapeFor(`t${k}${a}_${b}_${flipped()}`, () => line(x1 + ux * 6, y1 + uy * 6, ex, ey, 1.6));
  let s = `<g class="${cls}" stroke="${color}"><path d="${body}"/>`;
  if (head) {
    const hx = -uy, hy = ux;
    s += `<path class="head" d="M${fx(ex - ux * 8 + hx * 6)} ${fx(ey - uy * 8 + hy * 6)} L${fx(ex)} ${fx(ey)} L${fx(ex - ux * 8 - hx * 6)} ${fx(ey - uy * 8 - hy * 6)}"/>`;
  }
  return s + '</g>';
}

// ---------- rendering ----------
function render(animate) {
  const N = st.N, w = W();
  svg.setAttribute('viewBox', `0 0 ${w} ${w}`);
  let out = '';
  // light checker shading, pencil grid
  for (let i = 0; i < N * N; i++) {
    if ((Math.floor(i / N) + i % N) % 2 === 0) continue;
    const [x, y] = cellXY(i);
    out += `<rect class="shade" x="${x - S / 2}" y="${y - S / 2}" width="${S}" height="${S}"/>`;
  }
  for (let k = 0; k <= N; k++) {
    const a = M + k * S;
    out += `<path class="grid" d="${shapeFor('gh' + N + '_' + k, () => line(M - 3, a, w - M + 3, a, 1.4))}"/>`;
    out += `<path class="grid" d="${shapeFor('gv' + N + '_' + k, () => line(a, M - 3, a, w - M + 3, 1.4))}"/>`;
  }
  const last = st.last;
  for (let i = 0; i < N * N; i++) if (st.b[i] === AMZ.BURNT) out += burnt(i, animate && last && last.arrow === i);

  // last turn: the amazon's path and the arrow's flight
  if (last && !pend) {
    out += trail(last.from, last.to, COLORS[last.who].main, 'm', 'trail', false);
    out += trail(last.to, last.arrow, COLORS[last.who].dark, 'a', 'trail shot', true);
  }

  const mine = canMove();
  const movable = mine && !pend ? AMZ.amazons(st, st.turn).filter((i) => AMZ.targets(st, i).length) : [];
  for (const i of movable) {
    const [x, y] = cellXY(i);
    out += `<path class="ring${i === sel ? ' sel' : ' can'}" d="${shapeFor('r' + i + flipped(), () => circle(x, y, S * 0.47, S * 0.47, 0.05))}" stroke="${COLORS[st.turn].main}"/>`;
  }

  // amazons
  for (let i = 0; i < N * N; i++) {
    const p = st.b[i];
    if (p !== 0 && p !== 1) continue;
    if (pend && i === pend.from) continue;
    const fresh = animate && !slideShown && last && last.to === i ? last.from : null;
    out += amazon(i, p, { fresh, dead: !canStepAt(i) });
  }
  if (pend) {
    out += trail(pend.from, pend.to, COLORS[st.turn].main, 'p', 'trail', false);
    out += amazon(pend.from, st.turn, { at: pend.to, fresh: pendFresh ? pend.from : null });
    pendFresh = false;
    const [x, y] = cellXY(pend.to);
    out += `<path class="ring sel" d="${shapeFor('r' + pend.to + flipped(), () => circle(x, y, S * 0.47, S * 0.47, 0.05))}" stroke="${COLORS[st.turn].main}"/>`;
  }

  // targets
  if (mine && pend) {
    for (const i of AMZ.arrowTargets(st, pend.from, pend.to)) {
      const [x, y] = cellXY(i);
      out += `<g class="target shoot" stroke="${COLORS[st.turn].dark}"><path d="M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x + 5} ${y - 5} L${x - 5} ${y + 5}"/></g>`;
    }
  } else if (mine && sel >= 0) {
    for (const i of AMZ.targets(st, sel)) {
      const [x, y] = cellXY(i);
      out += `<circle class="target" cx="${x}" cy="${y}" r="6" fill="${COLORS[st.turn].main}"/>`;
    }
  }
  out += `<path id="preview" class="preview" d=""/>`;
  svg.innerHTML = out;
  svg.classList.toggle('busy', !mine);
  hoverCell = -1;
  renderPlayers();
}
function canStepAt(i) {
  const N = st.N, r = Math.floor(i / N), c = i % N;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = c + dc;
    if ((dr || dc) && rr >= 0 && rr < N && cc >= 0 && cc < N && st.b[rr * N + cc] === AMZ.EMPTY) return true;
  }
  return false;
}

function renderPlayers() {
  const look = AMZ.outlook(st);
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 23 + p * 37,
    });
    el.querySelector('.score').textContent = look.sealed && !over
      ? t('amz.room', { n: Math.round(look.terr[p]) })
      : t('amz.free', { n: AMZ.freeCount(st, p), k: AMZ.amazons(st, p).length });
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const phase = pend ? 'shoot' : sel >= 0 ? 'step' : 'pick';
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('amz.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('amz.you.' + phase) : t('amz.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('amz.thinking', { name: name(st.turn) });
  else status.textContent = t('amz.turn.' + phase, { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || (!history.length && !((pend || sel >= 0) && canMove())) || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('amz.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('amz.online.note') : '';
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

// ---------- flow ----------
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  st = AMZ.create({ N: +cfg.size, first });
  nextFirst = 1 - first;
  history = []; over = false; sel = -1; pend = null; wasSealed = false;
  for (const k in shapes) delete shapes[k];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

function play(m) {
  const prev = AMZ.clone(st);
  history.push(prev);
  const who = st.turn;
  AMZ.apply(st, m);
  slideShown = !!pend;
  sel = -1; pend = null;
  if (AMZ.isOver(st)) return finish();
  react(prev, who, 1 - who);
  render(true);
  maybeAI();
}

// Reactions after a whole turn: did someone get boxed in, did the land shift a lot?
function react(prev, who, other) {
  const look = AMZ.outlook(st);
  const trappedOther = AMZ.freeCount(st, other) < AMZ.freeCount(prev, other);
  const trappedSelf = AMZ.freeCount(st, who) < AMZ.freeCount(prev, who);
  const delta = AMZ.evaluate(st, who) - AMZ.evaluate(prev, who);
  if (look.sealed && !wasSealed) {
    wasSealed = true;
    const lead = look.terr[0] === look.terr[1] ? who : look.terr[0] > look.terr[1] ? 0 : 1;
    setMood(lead, 'smug'); setMood(1 - lead, 'worried');
    say(lead, 'amz.say.sealed');
  } else if (trappedOther) {
    setMood(who, 'smug', 'wave'); setMood(other, 'sad');
    say(who, 'amz.say.trap');
    if (Math.random() < 0.6) setTimeout(() => say(other, 'amz.say.trapped'), 800);
  } else if (trappedSelf) {
    setMood(who, 'worried'); setMood(other, 'happy');
    say(who, 'amz.say.oops');
  } else if (delta >= 4) {
    setMood(who, 'happy', 'wave'); setMood(other, 'worried');
    if (Math.random() < 0.6) say(who, 'amz.say.good');
    else if (Math.random() < 0.5) say(other, 'amz.say.worried');
  } else if (delta <= -4 && !isAI(who)) {
    setMood(who, 'worried'); setMood(other, 'smug');
    if (Math.random() < 0.5) say(who, 'amz.say.oops');
  } else {
    setMood(who, 'neutral'); setMood(other, 'neutral');
  }
}

// The computer steps first, then shoots a beat later, so you can follow it.
function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const m = AMZ.aiMove(st, cfg.mode);
    if (!m) return;
    pend = { from: m.from, to: m.to }; pendFresh = true;
    render(false);
    aiTimer = setTimeout(() => play(m), 550);
  }, 450);
}

function finish() {
  over = true;
  clearTimeout(aiTimer);
  const w = st.winner, l = 1 - w;
  setMood(w, 'happy', 'up'); setMood(l, 'sad');
  say(w, 'amz.say.win');
  setTimeout(() => say(l, 'amz.say.lose'), 900);
  fillResult();
  render(true);
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1000);
}

function fillResult() {
  const txt = $('#result-text'), w = st.winner;
  txt.textContent = t('amz.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-why').textContent = t('amz.why');
  $('#result-next').textContent = t('amz.next', { name: name(nextFirst) });
}

function undo() {
  if (online()) return;
  if (pend || sel >= 0) { pend = null; sel = -1; render(false); return; }
  if (!history.length) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; sel = -1; pend = null;
  wasSealed = AMZ.outlook(st).sealed;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and resize); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Host is authoritative: on (re)connect and on every new game it sends the whole state;
// moves carry the turn counter (ply) to catch desyncs.
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  for (const k in shapes) delete shapes[k];
  s.on('status', () => render(false));
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    st = d.st; over = d.over; history = []; sel = -1; pend = null; nextFirst = d.nextFirst;
    wasSealed = AMZ.outlook(st).sealed;
    $('#size').value = st.N;
    remoteNames[0] = d.names[0];
    for (const k in shapes) delete shapes[k];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish() : render(false);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (d.n !== st.ply || !AMZ.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else render(false);
}

function localMove(m) {
  if (online()) sess.send('move', { m, n: st.ply });
  play(m);
}

// ---------- input ----------
// Tap your amazon → tap where it goes → tap where it shoots. Tap the amazon again to take the step back.
function actionAt(i) {
  if (i < 0) return null;
  if (pend) {
    if (AMZ.arrowTargets(st, pend.from, pend.to).includes(i)) return { move: { ...pend, arrow: i } };
    if (i === pend.to || i === pend.from) return { cancel: true };
    if (st.b[i] === st.turn && AMZ.targets(st, i).length) return { select: i };
    return null;
  }
  if (st.b[i] === st.turn && AMZ.targets(st, i).length) return { select: i };
  if (sel >= 0 && AMZ.targets(st, sel).includes(i)) return { step: { from: sel, to: i } };
  return null;
}

svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const a = actionAt(cellAt(evt));
  if (a?.move) return localMove(a.move);
  if (a?.step) { pend = a.step; pendFresh = true; sel = -1; }
  else if (a?.cancel) { sel = pend.from; pend = null; }
  else if (a?.select !== undefined) { pend = null; sel = a.select === sel ? -1 : a.select; }
  else if (!pend) sel = -1;
  render(false);
});
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const i = canMove() ? cellAt(evt) : -1;
  if (i === hoverCell) return;
  hoverCell = i;
  const a = actionAt(i);
  svg.style.cursor = a ? 'pointer' : '';
  const pv = svg.querySelector('#preview');
  const seg = a?.move ? [a.move.to, a.move.arrow] : a?.step ? [a.step.from, a.step.to] : null;
  if (seg) {
    const [x1, y1] = cellXY(seg[0]), [x2, y2] = cellXY(seg[1]);
    pv.setAttribute('d', `M${x1} ${y1} L${x2} ${y2}`);
    pv.setAttribute('stroke', (a.move ? COLORS[st.turn].dark : COLORS[st.turn].main));
  } else pv.setAttribute('d', '');
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; svg.querySelector('#preview')?.setAttribute('d', ''); });

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
    render(false);
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) fillResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
newGame(0);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; for (const k in shapes) delete shapes[k]; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
