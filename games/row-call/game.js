import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { RC } from './engine.js';
import './strings.js';

const SLUG = 'row-call';
const STORE = 'mg-' + SLUG;
const S = 64, B = 46, M = 8;          // cell size, label band, outer margin
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ size: 4, mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem(STORE) || '{}'));
if (![4, 5].includes(+cfg.size)) cfg.size = 4;
cfg.size = +cfg.size;
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));

// match: wins per seat and how many games were started (the first caller alternates)
let match = { score: [0, 0], game: 0 };
let st, history, shapes, over, aiTimer, hover = null, nudgeTimer;
let sess = null;                      // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const actor = () => RC.actor(st);
const canMove = () => !over && isLocal(actor()) && (!online() || sess.connected);
const canRestart = () => !online() || sess.host;
function name(p) {
  if (isAI(p)) return t('rc.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('rc.p' + p);
}
const colName = (i) => t('rc.cols')[i] || String(i + 1);
const lineLabel = (L) => t(L.t === 'r' ? 'rc.in.row' : 'rc.in.col', { i: L.t === 'r' ? L.i + 1 : colName(L.i) });

// ---------- geometry ----------
const size = () => B + st.N * S + M;
const cellXY = (i) => [B + (i % st.N) * S + S / 2, B + Math.floor(i / st.N) * S + S / 2];
function hitAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const N = st.N;
  const c = Math.floor((p.x - B) / S), r = Math.floor((p.y - B) / S);
  if (p.y < B && p.y > 0 && c >= 0 && c < N) return { line: { t: 'c', i: c } };
  if (p.x < B && p.x > 0 && r >= 0 && r < N) return { line: { t: 'r', i: r } };
  if (r >= 0 && r < N && c >= 0 && c < N) return { cell: r * N + c };
  return null;
}
const shapeFor = (k, make) => (shapes[k] ??= make());
const sameLine = (a, b) => a && b && a.t === b.t && a.i === b.i;

// ---------- drawing ----------
function markSVG(p, cx, cy, key, cls = '', r = S * 0.27) {
  const col = COLORS[p].main;
  const P = (d, w = 6.5) => `<path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
  const s = p === 0
    ? P(shapeFor(key + 'a', () => line(cx - r, cy - r, cx + r, cy + r, 2.2))) + P(shapeFor(key + 'b', () => line(cx + r, cy - r, cx - r, cy + r, 2.2)))
    : P(shapeFor(key + 'o', () => circle(cx, cy, r * 1.04, r * 1.1, 0.06)));
  return `<g class="mark ${cls}" style="transform-origin:${cx}px ${cy}px">${s}</g>`;
}

function bandRect(L, pad = 3) {
  const N = st.N;
  return L.t === 'r'
    ? { x: B + pad, y: B + L.i * S + pad, w: N * S - pad * 2, h: S - pad * 2 }
    : { x: B + L.i * S + pad, y: B + pad, w: S - pad * 2, h: N * S - pad * 2 };
}
function bandSVG(L, cls, color) {
  const { x, y, w, h } = bandRect(L);
  return `<rect class="band-under ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${color}"/>`
    + `<rect class="band ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${color}"/>`;
}

function render(animateLast) {
  const W = size(), N = st.N;
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  let out = '';
  const placing = st.phase === 'place' && !over;
  const caller = st.turn;

  // the called line (or the last one, faintly)
  if (placing) out += bandSVG(st.line, 'called' + (animateLast ? ' fresh' : ''), COLORS[caller].fill);
  else if (st.line && st.last >= 0) out += bandSVG(st.line, 'prev', '#e9e6dc');
  out += '<g id="hover"></g>';
  if (st.last >= 0) {
    const [x, y] = cellXY(st.last);
    out += `<rect class="last" x="${x - S / 2 + 6}" y="${y - S / 2 + 6}" width="${S - 12}" height="${S - 12}" rx="9"/>`;
  }

  // grid
  for (let k = 0; k <= N; k++) {
    const a = B + k * S, outer = k === 0 || k === N;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gh' + k, () => line(B, a, B + N * S, a, 1.6))}"/>`;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gv' + k, () => line(a, B, a, B + N * S, 1.6))}"/>`;
  }

  // marks
  for (let i = 0; i < N * N; i++) {
    const v = st.cells[i];
    if (v < 0) continue;
    const [x, y] = cellXY(i);
    out += markSVG(v, x, y, 'm' + i, animateLast && st.last === i ? 'fresh' : '');
  }

  // where the mark may go: faint ghosts for the placer
  if (placing && canMove()) {
    for (const c of RC.empties(st, st.line)) {
      const [x, y] = cellXY(c);
      out += `<g class="cand" data-c="${c}">${markSVG(caller, x, y, 'ghost' + c, 'ghost')}</g>`;
    }
  }

  // handles: letters over columns, numbers beside rows
  const pickable = !over && st.phase === 'pick';
  const callerCol = COLORS[caller];
  for (const tt of ['c', 'r']) for (let i = 0; i < N; i++) {
    const L = { t: tt, i };
    const [cx, cy] = tt === 'c' ? [B + i * S + S / 2, B / 2 + 1] : [B / 2 + 1, B + i * S + S / 2];
    const free = RC.empties(st, L).length > 0;
    const on = placing && sameLine(st.line, L);
    let cls = 'handle';
    if (!free && !on) cls += ' full';
    if (pickable && free && canMove()) cls += ' live';
    if (on) cls += ' on';
    const ring = shapeFor('h' + tt + i, () => circle(cx, cy, 17, 17, 0.07));
    const fill = on ? callerCol.main : '#fff';
    const stroke = on ? callerCol.dark : pickable && free && canMove() ? callerCol.main : PALETTE.ink;
    out += `<g class="${cls}" data-t="${tt}" data-i="${i}">
      <rect x="${cx - B / 2 + 1}" y="${cy - B / 2 + 1}" width="${B - 2}" height="${B - 2}" fill="transparent"/>
      <path d="${ring}" fill="${fill}" stroke="${stroke}" stroke-width="2.6"/>
      <text x="${cx}" y="${cy + 1}" fill="${on ? '#fff' : stroke}">${tt === 'c' ? colName(i) : i + 1}</text></g>`;
  }

  // winning row
  if (st.win) {
    const [a, b] = [cellXY(st.win[0]), cellXY(st.win[st.win.length - 1])];
    const dx = Math.sign(b[0] - a[0]) * S * 0.34, dy = Math.sign(b[1] - a[1]) * S * 0.34;
    const d = shapeFor('win', () => line(a[0] - dx, a[1] - dy, b[0] + dx, b[1] + dy, 3));
    out += `<path class="winline${animateLast ? ' fresh' : ''}" d="${d}" pathLength="1"/>`;
  }
  svg.innerHTML = out;
  hover = null;
  renderPlayers();
}

function renderHover(h) {
  const g = svg.querySelector('#hover');
  if (!g) return;
  svg.querySelectorAll('.cand.hot').forEach((x) => x.classList.remove('hot'));
  g.innerHTML = '';
  if (!h) return;
  if (h.line) g.innerHTML = bandSVG(h.line, 'hover', COLORS[st.turn].fill);
  else svg.querySelector(`.cand[data-c="${h.cell}"]`)?.classList.add('hot');
}

function renderPlayers() {
  const act = actor();
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && act === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 23 + p * 37,
    });
    el.querySelector('.score').innerHTML =
      `<svg class="mini" viewBox="0 0 40 40" aria-hidden="true">${markSVG(p, 20, 20, 'mini' + p, '', 11)}</svg><span>${plural(match.score[p], 'rc.wins')}</span>`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const picking = st.phase === 'pick';
  const where = st.line ? lineLabel(st.line) : '';
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('rc.online.wait');
  else if (online()) {
    status.textContent = isLocal(act)
      ? t(picking ? 'rc.you.pick' : 'rc.you.place', { line: where })
      : t(picking ? 'rc.them.pick' : 'rc.them.place', { name: name(act), line: where });
  } else if (isAI(act)) status.textContent = t('rc.thinking', { name: name(act) });
  else status.textContent = t(picking ? 'rc.turn.pick' : 'rc.turn.place', { name: name(act), line: where });
  status.style.color = COLORS[act].main;

  $('#undo').disabled = online() || !history.length || (isAI(act) && !over);
  $('#mode').disabled = online();
  $('#size').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('rc.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('rc.online.note') : '';
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
function newGame() {
  clearTimeout(aiTimer);
  st = RC.create({ N: cfg.size, first: match.game % 2 });
  history = []; shapes = {}; over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}
function newMatch() { match = { score: [0, 0], game: 0 }; newGame(); }

function act(a) {
  const prev = RC.clone(st);
  history.push({ st: prev, score: match.score.slice() });
  const caller = prev.turn, placer = 1 - caller;
  const placed = RC.apply(st, a);
  if (st.winner >= 0) match.score[st.winner]++;
  if (RC.isOver(st)) return finish(true);

  if (a.pick) {
    const killer = RC.killerLines(prev, caller).some((L) => sameLine(L, a.pick));
    if (killer) { setMood(caller, 'smug', 'point'); setMood(placer, 'worried'); say(caller, 'rc.say.killer'); setTimeout(() => say(placer, 'rc.say.doomed'), 700); }
    else if (st.forced) { setMood(caller, 'smug', 'point'); say(caller, 'rc.say.forced'); }
    else { setMood(caller, 'neutral', 'point'); if (moods[placer].mood !== 'smug') setMood(placer, 'neutral'); if (Math.random() < 0.25) say(caller, 'rc.say.call'); }
  }
  if (placed) {
    // the caller's mark just landed; the placer calls next
    const before = RC.threats(prev, caller).length, after = RC.threats(st, caller).length;
    const trapNow = RC.killerLines(st, placer).length, trapBefore = RC.killerLines(prev, placer).length;
    if (trapNow && !trapBefore) { setMood(placer, 'smug', 'wave'); setMood(caller, 'worried'); say(placer, 'rc.say.trap'); }
    else if (after > before) {
      setMood(caller, 'happy', 'wave'); setMood(placer, 'worried');
      if (!st.forced) { say(caller, 'rc.say.threat'); if (Math.random() < 0.5) setTimeout(() => say(placer, 'rc.say.oops'), 600); }
    } else if (!st.forced) { setMood(caller, 'neutral'); setMood(placer, 'neutral'); }
  }
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(actor())) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(actor())) return;
    const a = RC.aiAction(st, cfg.mode);
    if (a) act(a);
  }, st.phase === 'pick' ? 700 : 750);
}

function finish(fresh) {
  over = true;
  const w = st.winner;
  if (w < 0) {
    setMood(0, 'worried'); setMood(1, 'worried');
    if (fresh) { say(0, 'rc.say.tie'); setTimeout(() => over && say(1, 'rc.say.tie'), 700); }
  } else {
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
    if (fresh) { say(w, st.K === 3 ? 'rc.say.win' : 'rc.say.win4'); setTimeout(() => over && say(1 - w, 'rc.say.lose'), 900); }
  }
  render(fresh);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('rc.tie') : t('rc.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-why').textContent = w < 0 ? t('rc.why.full') : t('rc.why.' + st.K);
  $('#result-next').textContent = t('rc.next', { name: name((match.game + 1) % 2) });
  setTimeout(() => { if (over) $('#result').hidden = false; }, fresh ? 1100 : 0);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  let h;
  do { h = history.pop(); st = h.st; } while (history.length && isAI(RC.actor(st)));
  match.score = h.score;
  over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart or change the board; the guest follows.
function restart(next) {
  if (!canRestart()) return;
  if (next) match.game++;
  newGame();
  if (online()) sendState('new');
}

function nudge() {
  svg.classList.remove('nudge');
  void svg.getBoundingClientRect();
  svg.classList.add('nudge');
  const status = $('#status');
  status.textContent = t('rc.hint.pick');
  clearTimeout(nudgeTimer);
  nudgeTimer = setTimeout(() => { svg.classList.remove('nudge'); renderPlayers(); }, 1800);
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; actions carry a counter to catch desyncs.
function sendState(type = 'state') {
  sess.send(type, { st, over, match, size: cfg.size, names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  const receive = (d) => {
    if (s.host) return;
    st = d.st; over = d.over; match = d.match; history = []; shapes = {};
    cfg.size = d.size; $('#size').value = d.size;
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    over ? finish(false) : render(false);
  };
  s.on('state', receive);
  s.on('new', receive);
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); if (over) finish(false); });
  s.on('act', (d) => {
    if (d.n !== st.n || !RC.legal(st, d.a) || isLocal(actor())) return s.host ? sendState() : s.send('resync');
    act(d.a);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else render(false);
}

function localAct(a) {
  if (!RC.legal(st, a)) return;
  if (online()) sess.send('act', { a, n: st.n });
  act(a);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  let h = canMove() ? hitAt(evt) : null;
  if (h?.line && !RC.legal(st, { pick: h.line })) h = null;
  if (h?.cell !== undefined && !RC.legal(st, { place: h.cell })) h = null;
  const k = h ? JSON.stringify(h) : null;
  if (k === hover) return;
  hover = k;
  renderHover(h);
  svg.style.cursor = h ? 'pointer' : '';
});
svg.addEventListener('pointerleave', () => { hover = null; renderHover(null); svg.style.cursor = ''; });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const h = hitAt(evt);
  if (!h) return;
  if (h.line && st.phase === 'pick') localAct({ pick: h.line });
  else if (h.cell !== undefined && st.phase === 'place') localAct({ place: h.cell });
  else if (h.cell !== undefined && st.phase === 'pick') nudge();
});

$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); if (canRestart()) { match = { score: [0, 0], game: 0 }; restart(false); } });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newMatch(); });
$('#new').addEventListener('click', () => restart(over));
$('#again').addEventListener('click', () => restart(true));
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    renderPlayers();
  }));
document.addEventListener('mg:lang', () => { render(false); if (over) finish(false); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#size').value = cfg.size;
$('#mode').value = cfg.mode;
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newMatch(); },
});
if (!online()) showOnce('how', SLUG);
