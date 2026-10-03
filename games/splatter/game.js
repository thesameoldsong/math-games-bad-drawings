import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, curve, rng, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { SPL, EMPTY, GONE } from './engine.js';
import './strings.js';

const SLUG = 'splatter';
const S = 60, M = 8; // cell size, margin
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const SIZES = ['4x4', '4x6', '6x6', '6x8', '8x8'];
const cfg = Object.assign({ size: '6x6', mode: 'pvp', patterns: 'classic', setup: 'random', names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!SIZES.includes(cfg.size)) cfg.size = '6x6';
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, over, aiTimer, sel = -1, previewPat = 'all', nextFirst = 0;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && st && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('spl.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('spl.p' + p);
}

// ---------- drawing helpers ----------
const cellXY = (i) => [M + (i % st.C) * S + S / 2, M + Math.floor(i / st.C) * S + S / 2];
const shapeFor = (k, make) => (shapes[k] ??= make());

// Lumpy paint blob with a couple of droplets.
function blobShape(cx, cy, seed) {
  const R = rng(seed);
  const n = 9, pts = [], r0 = S * 0.3;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2, rr = r0 * (0.86 + R() * 0.26);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  pts[n] = pts[0];
  const drops = [];
  for (let k = 0; k < 2; k++) {
    const a = R() * Math.PI * 2, d = r0 * (1.15 + R() * 0.2);
    drops.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.8 + R() * 2]);
  }
  return { body: curve([...pts, pts[1]]), drops };
}

// Spiky splash for a splattered cell.
function splashShape(cx, cy, seed) {
  const R = rng(seed);
  const n = 14, pts = [];
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2, rr = S * (k % 2 ? 0.2 + R() * 0.08 : 0.32 + R() * 0.14);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  pts[n] = pts[0];
  const drops = [];
  for (let k = 0; k < 3; k++) {
    const a = R() * Math.PI * 2, d = S * (0.36 + R() * 0.1);
    drops.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + R() * 2.2]);
  }
  return { body: curve(pts), drops };
}

// ---------- rendering ----------
function render(animateLast) {
  const W = M * 2 + st.C * S, H = M * 2 + st.R * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let out = '';
  const last = animateLast ? st.last : null;
  const fresh = new Set(last ? (last.hit || [last.i]) : []);

  // grid
  for (let r = 0; r <= st.R; r++) {
    const d = shapeFor('h' + r, () => line(M - 2, M + r * S, M + st.C * S + 2, M + r * S, 1.6));
    out += `<path class="grid" d="${d}"/>`;
  }
  for (let c = 0; c <= st.C; c++) {
    const d = shapeFor('v' + c, () => line(M + c * S, M - 2, M + c * S, M + st.R * S + 2, 1.6));
    out += `<path class="grid" d="${d}"/>`;
  }

  const affected = new Set(sel >= 0 ? SPL.hits(st, sel, previewPat) : []);
  const mine = canMove() && st.phase === 'play' ? st.turn : -1;

  for (let i = 0; i < st.cells.length; i++) {
    const [cx, cy] = cellXY(i), v = st.cells[i];
    const f = fresh.has(i) ? ' fresh' : '';
    if (v === GONE) {
      const sh = shapeFor('s' + i, () => splashShape(cx, cy, 1000 + i * 7 + Math.floor(Math.random() * 999)));
      const col = COLORS[st.splat[i]];
      out += `<g class="splash${f}" style="transform-origin:${cx}px ${cy}px"><path d="${sh.body}" fill="${col.fill}" filter="url(#mg-crayon)"/>`;
      for (const [x, y, r] of sh.drops) out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col.fill}"/>`;
      out += `</g>`;
    } else if (v >= 0) {
      const sh = shapeFor('b' + i, () => blobShape(cx, cy, 77 + i * 13 + Math.floor(Math.random() * 999)));
      const col = COLORS[v];
      const cls = ['blob', v === mine ? 'mine' : '', i === sel ? 'sel' : '', affected.has(i) && i !== sel ? 'doomed' : '', f].join(' ');
      out += `<g class="${cls}" data-i="${i}" style="transform-origin:${cx}px ${cy}px">`;
      out += `<path d="${sh.body}" fill="${col.main}" filter="url(#mg-crayon)"/>`;
      out += `<path d="${sh.body}" fill="none" stroke="${col.dark}" stroke-width="2.4"/>`;
      for (const [x, y, r] of sh.drops) out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col.main}"/>`;
      out += `</g>`;
    }
    if (affected.has(i)) {
      const d = shapeFor('x' + i, () => circle(cx, cy, S * 0.42, S * 0.42, 0.06));
      out += `<path class="ring${i === sel ? ' sel' : ''}" d="${d}"/>`;
    }
  }
  // hit area for every cell (on top)
  for (let i = 0; i < st.cells.length; i++) {
    const [cx, cy] = cellXY(i);
    out += `<rect class="hit" data-i="${i}" x="${cx - S / 2}" y="${cy - S / 2}" width="${S}" height="${S}"/>`;
  }
  svg.innerHTML = out;
  svg.classList.toggle('placing', canMove() && st.phase === 'place');
  renderPicker();
  renderPlayers();
}

const PAT_ICON = {
  one: [[1, 1]],
  all: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  x: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  plus: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
};
function patIcon(p, color) {
  let s = '<svg class="pat-ico" viewBox="0 0 30 30" aria-hidden="true">';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const on = PAT_ICON[p].some(([a, b]) => a === r && b === c);
    s += on ? `<circle cx="${5 + c * 10}" cy="${5 + r * 10}" r="${r === 1 && c === 1 ? 4.4 : 3.4}" fill="${color}"/>`
      : `<circle cx="${5 + c * 10}" cy="${5 + r * 10}" r="1.6" fill="#ccc"/>`;
  }
  return s + '</svg>';
}

function renderPicker() {
  const pk = $('#picker');
  const show = sel >= 0 && canMove() && st.phase === 'play';
  pk.hidden = !show;
  $('#status').hidden = show;
  if (!show) return;
  const col = COLORS[st.turn].main;
  // Only list splats that differ (no neighbours left → "neighbours" equals "alone").
  const seen = new Set();
  const pats = SPL.PATTERNS[st.patterns].filter((p) => {
    const k = SPL.hits(st, sel, p).sort((a, b) => a - b).join(',');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  // Rebuild the buttons only when they change: a hover re-render must not swap the button under
  // the pointer between press and release (the click would be lost).
  const html = pats.map((p) =>
    `<button class="pat" data-p="${p}" style="--c:${col}">${patIcon(p, col)}<span>${t('spl.pat.' + p)}</span></button>`).join('');
  if (pk.dataset.html !== html) { pk.innerHTML = html; pk.dataset.html = html; }
  for (const b of pk.children) b.classList.toggle('on', b.dataset.p === previewPat);
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
    el.querySelector('.score').textContent = plural(SPL.count(st, p), 'spl.blobs');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const n = name(st.turn), placing = st.phase === 'place';
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('spl.online.wait');
  else if (online()) {
    status.textContent = isLocal(st.turn) ? t(placing ? 'spl.place.you' : 'spl.turn.you') : t('spl.turn.them', { name: n });
  } else if (isAI(st.turn)) status.textContent = t('spl.thinking', { name: n });
  else status.textContent = t(placing ? 'spl.place' : 'spl.turn', { name: n });
  status.parentElement.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over) ||!history.some((h) => !isAI(h.turn));
  $('#mode').disabled = online();
  for (const id of ['#size', '#patterns', '#setup', '#new']) $(id).disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('spl.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('spl.online.note') : '';
}

const bubbleTimers = [];
function say(p, key, delay = 0) {
  setTimeout(() => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1800);
  }, delay);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function startGame(state) {
  clearTimeout(aiTimer);
  st = state;
  history = []; shapes = {}; over = false; sel = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  if (SPL.isOver(st)) finish(false);
  else render(false);
  maybeAI();
}
function newGame() {
  const [R, C] = cfg.size.split('x').map(Number);
  const first = nextFirst;
  nextFirst = 1 - nextFirst; // players take turns going first
  startGame(SPL.create({ R, C, patterns: cfg.patterns, setup: cfg.setup, first }));
}

function play(m) {
  history.push(SPL.clone(st));
  const who = st.turn, other = 1 - who;
  const before = [SPL.count(st, 0), SPL.count(st, 1)];
  sel = -1;
  SPL.apply(st, m);
  if (!m.p) {
    if (Math.random() < 0.15) say(who, 'spl.say.place');
  } else {
    const lostMine = before[who] - SPL.count(st, who) - 1, lostTheirs = before[other] - SPL.count(st, other);
    if (lostTheirs >= 3) {
      setMood(who, 'happy', 'up'); setMood(other, 'worried');
      say(who, 'spl.say.big'); if (Math.random() < 0.6) say(other, 'spl.say.ouch', 700);
    } else if (lostTheirs > lostMine) {
      setMood(who, 'happy', 'wave'); setMood(other, 'sad');
      if (Math.random() < 0.45) say(who, 'spl.say.hit');
    } else if (lostMine > lostTheirs) {
      setMood(who, 'worried'); setMood(other, 'smug');
    } else if (m.p === 'one') {
      setMood(who, 'smug'); if (moods[other].mood === 'happy') setMood(other, 'neutral');
      if (Math.random() < 0.2) say(who, 'spl.say.slow');
    } else {
      setMood(who, 'neutral'); setMood(other, 'neutral');
    }
    for (const p of [0, 1]) {
      if (SPL.count(st, p) === 1 && before[p] > 1 && !SPL.isOver(st)) { setMood(p, 'worried'); say(p, 'spl.say.last', 500); }
    }
  }
  if (SPL.isOver(st)) return finish(true);
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  // Give the page a moment to paint the "thinking" status before a long search.
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    play(SPL.aiMove(st, cfg.mode));
  }, st.phase === 'place' ? 350 : 650);
}

function finish(animate) {
  over = true; sel = -1;
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  say(w, 'spl.say.win'); say(1 - w, 'spl.say.lose', 900);
  render(animate);
  resultText();
  setTimeout(() => { if (over) $('#result').hidden = false; }, 900);
}
function resultText() {
  const w = st.winner;
  const txt = $('#result-text');
  txt.textContent = t('spl.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  const left = SPL.count(st, w);
  $('#result-sub').textContent = left ? t('spl.win.left', { n: left }) : t('spl.win.both');
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; sel = -1;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart (and change settings); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => { if (sess === s) render(false); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host || sess !== s) return;
    remoteNames[0] = d.names[0];
    for (const id of ['patterns', 'setup']) $('#' + id).value = d.st[id];
    $('#size').value = `${d.st.R}x${d.st.C}`;
    startGame(d.st);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); });
  s.on('move', (d) => {
    if (sess !== s) return;
    if (d.n !== st.moves || !SPL.isLegal(st, d.m) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) { nextFirst = 0; newGame(); }
  else render(false);
}

function localMove(m) {
  if (!SPL.isLegal(st, m)) return;
  if (online()) sess.send('move', { m, n: st.moves });
  play(m);
}

// ---------- input ----------
function cellAt(evt) {
  const el = evt.target.closest('[data-i]');
  return el ? +el.dataset.i : -1;
}
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const i = cellAt(evt);
  if (i < 0) return;
  if (st.phase === 'place') {
    if (st.cells[i] === EMPTY) localMove({ i });
    return;
  }
  if (st.cells[i] === st.turn) {
    if (i === sel) { sel = -1; render(false); return; } // tap again to cancel
    sel = i;
    previewPat = SPL.hits(st, i, 'all').length > 1 ? 'all' : 'one';
  } else sel = -1;
  render(false);
});
// Hover preview on desktop: show what a splat would wipe out.
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse' || !canMove() || st.phase !== 'play') return;
  const i = cellAt(evt);
  svg.style.cursor = i >= 0 && st.cells[i] === st.turn ? 'pointer' : '';
});
const picker = $('#picker');
picker.addEventListener('click', (evt) => {
  const b = evt.target.closest('.pat');
  if (!b || sel < 0 || !canMove()) return;
  localMove({ i: sel, p: b.dataset.p });
});
picker.addEventListener('pointerover', (evt) => {
  const b = evt.target.closest('.pat');
  if (!b || evt.pointerType !== 'mouse' || b.dataset.p === previewPat) return;
  previewPat = b.dataset.p;
  render(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sel >= 0) { sel = -1; render(false); } });

for (const id of ['size', 'patterns', 'setup']) {
  $('#' + id).addEventListener('change', (e) => { cfg[id] = e.target.value; saveCfg(); restart(); });
}
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); nextFirst = 0; newGame(); });
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
document.addEventListener('mg:lang', () => {
  render(false);
  if (over) resultText();
});

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
for (const id of ['size', 'mode', 'patterns', 'setup']) $('#' + id).value = cfg[id];
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; nextFirst = 0; newGame(); },
});
if (!online()) showOnce('how', SLUG);
