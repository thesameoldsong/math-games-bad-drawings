import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, curve, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { CAD } from './engine.js';
import './strings.js';

const SLUG = 'cats-and-dogs';
const STORE = 'mg-' + SLUG;
const S = 56, M = 8;                       // cell size, margin
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign(
  { mode: 'pvp', first: 0, size: 7, rule: 'snort', touch: 'diag', hints: '1', names: ['', ''] },
  JSON.parse(localStorage.getItem(STORE) || '{}'),
);
const saveCfg = () => localStorage.setItem(STORE, JSON.stringify(cfg));

let match = { game: 0 };                   // games started in this match (the starter alternates)
let st, history, shapes, over, aiTimer, hoverCell = -1, mirrorSaid = false, lowSaid = [false, false];
let sess = null;                           // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && isLocal(st.turn) && (!online() || sess.connected);
const canRestart = () => !online() || sess.host;
const starter = () => (cfg.first + match.game) % 2;
function name(p) {
  if (isAI(p)) return t('cad.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('cad.p' + p);
}

// ---------- geometry ----------
const cellXY = (i) => [M + (i % st.n) * S + S / 2, M + Math.floor(i / st.n) * S + S / 2];
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  return r >= 0 && r < st.n && c >= 0 && c < st.n ? r * st.n + c : -1;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- drawing ----------
// Our own doodles: a cat head (pointy ears, whiskers) and a dog head (floppy ears, big nose).
function animalSVG(p, cx, cy, key, cls = '', cache = shapeFor) {
  const r = S * 0.3, col = COLORS[p];
  const P = (d, w = 3.2, extra = '') => `<path d="${d}" stroke="${col.dark}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  const F = (d) => `<path d="${d}" fill="${col.fill}" filter="url(#mg-crayon)"/>`;
  const dot = (x, y, rr) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr}" fill="${col.dark}"/>`;
  let s = '';
  if (p === 0) {
    const hy = cy + r * 0.12;
    const head = cache(key + 'h', () => circle(cx, hy, r, r * 0.86, 0.05));
    const earL = cache(key + 'l', () => curve([[cx - r * 0.92, hy - r * 0.3], [cx - r * 0.78, hy - r * 1.22], [cx - r * 0.2, hy - r * 0.84]]));
    const earR = cache(key + 'r', () => curve([[cx + r * 0.92, hy - r * 0.3], [cx + r * 0.78, hy - r * 1.22], [cx + r * 0.2, hy - r * 0.84]]));
    const wh = cache(key + 'w', () => [
      line(cx - r * 0.35, hy + r * 0.22, cx - r * 1.25, hy + r * 0.08, 0.6), line(cx - r * 0.35, hy + r * 0.36, cx - r * 1.2, hy + r * 0.5, 0.6),
      line(cx + r * 0.35, hy + r * 0.22, cx + r * 1.25, hy + r * 0.08, 0.6), line(cx + r * 0.35, hy + r * 0.36, cx + r * 1.2, hy + r * 0.5, 0.6),
    ].join(' '));
    s = F(earL + 'Z') + F(earR + 'Z') + F(head) + P(earL) + P(earR) + P(head)
      + dot(cx - r * 0.36, hy - r * 0.1, 2.6) + dot(cx + r * 0.36, hy - r * 0.1, 2.6)
      + `<path d="M${cx - 3} ${hy + r * 0.16} L${cx + 3} ${hy + r * 0.16} L${cx} ${hy + r * 0.3}Z" fill="${col.dark}"/>`
      + P(wh, 1.6);
  } else {
    const hy = cy - r * 0.02;
    const head = cache(key + 'h', () => circle(cx, hy, r * 0.86, r * 0.95, 0.05));
    const snout = cache(key + 's', () => circle(cx, hy + r * 0.38, r * 0.42, r * 0.3, 0.06));
    // long floppy ears hanging from the top of the head, tilted outwards
    const ear = (sgn) => cache(key + 'e' + sgn, () => circle(0, 0, r * 0.27, r * 0.62, 0.07));
    const ex = r * 0.82, ey = hy + r * 0.05;
    const earG = (sgn) => `<g transform="translate(${(cx + sgn * ex).toFixed(1)} ${ey.toFixed(1)}) rotate(${-sgn * 22})">`
      + `<path d="${ear(sgn)}" fill="${col.main}" filter="url(#mg-crayon)"/>${P(ear(sgn), 2.6)}</g>`;
    const mouth = cache(key + 'm', () => curve([[cx - r * 0.2, hy + r * 0.5], [cx, hy + r * 0.6], [cx + r * 0.2, hy + r * 0.5]]));
    s = F(head) + P(head)
      + `<path d="${snout}" fill="#fff"/>` + P(snout, 2)
      + earG(-1) + earG(1)
      + dot(cx - r * 0.32, hy - r * 0.2, 2.6) + dot(cx + r * 0.32, hy - r * 0.2, 2.6)
      + `<ellipse cx="${cx}" cy="${(hy + r * 0.28).toFixed(1)}" rx="${(r * 0.2).toFixed(1)}" ry="${(r * 0.13).toFixed(1)}" fill="${col.dark}"/>`
      + P(mouth, 2);
  }
  return `<g class="animal ${cls}" style="transform-origin:${cx}px ${cy}px">${s}</g>`;
}

const miniCache = {};
const mini = (p) => `<svg class="mini" viewBox="${-S / 2} ${-S / 2} ${S} ${S}" aria-hidden="true">${animalSVG(p, 0, 0, 'm' + p, '', (k, f) => (miniCache[k] ??= f()))}</svg>`;

function render(animateLast) {
  const W = M * 2 + st.n * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  const stat = CAD.status(st);
  let out = '';
  // territory hints
  if (cfg.hints === '1') {
    for (let i = 0; i < stat.length; i++) {
      const v = stat[i];
      if (v < 0 || v === 3) continue;
      const [x, y] = cellXY(i);
      if (v === 0) {
        const q = S * 0.13;
        out += `<path class="dead" d="${shapeFor('x' + i, () => line(x - q, y - q, x + q, y + q, 0.8) + ' ' + line(x + q, y - q, x - q, y + q, 0.8))}"/>`;
      } else {
        out += `<rect class="own" x="${x - S / 2 + 3}" y="${y - S / 2 + 3}" width="${S - 6}" height="${S - 6}" rx="6" fill="${COLORS[v - 1].fill}" filter="url(#mg-crayon)"/>`;
      }
    }
  }
  if (st.last >= 0) {
    const [x, y] = cellXY(st.last);
    out += `<rect class="last" x="${x - S / 2 + 4}" y="${y - S / 2 + 4}" width="${S - 8}" height="${S - 8}" rx="8"/>`;
  }
  // grid
  for (let k = 0; k <= st.n; k++) {
    const a = M + k * S, outer = k === 0 || k === st.n;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gh' + k, () => line(M, a, W - M, a, 1.6))}"/>`;
    out += `<path class="grid${outer ? ' outer' : ''}" d="${shapeFor('gv' + k, () => line(a, M, a, W - M, 1.6))}"/>`;
  }
  // animals
  for (let i = 0; i < st.cells.length; i++) {
    const v = st.cells[i];
    if (v < 0) continue;
    const [x, y] = cellXY(i);
    out += animalSVG(v, x, y, 'a' + i + '_' + v, animateLast && st.last === i ? 'fresh' : '');
  }
  out += '<g id="ghost"></g><g id="nope"></g>';
  svg.innerHTML = out;
  hoverCell = -1;
  renderPlayers();
}

function renderGhost(i) {
  const g = svg.querySelector('#ghost');
  if (!g) return;
  if (i < 0) { g.innerHTML = ''; return; }
  const [x, y] = cellXY(i);
  g.innerHTML = animalSVG(st.turn, x, y, 'ghost' + st.turn + '_' + i, 'ghost');
}

let nopeTimer;
function flashNope(i) {
  const g = svg.querySelector('#nope');
  if (!g || i < 0) return;
  const [x, y] = cellXY(i);
  g.innerHTML = `<rect class="nope" x="${x - S / 2 + 3}" y="${y - S / 2 + 3}" width="${S - 6}" height="${S - 6}" rx="7"/>`;
  clearTimeout(nopeTimer);
  nopeTimer = setTimeout(() => (g.innerHTML = ''), 450);
}

function renderPlayers() {
  const c = CAD.counts(st);
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 23 + p * 37,
    });
    const sc = el.querySelector('.score');
    sc.innerHTML = `${mini(p)}<span>${plural(c.avail[p], 'cad.spots')}</span>`;
    sc.title = t('cad.spots.title');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('cad.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('cad.turn.you') : t('cad.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('cad.thinking', { name: name(st.turn) });
  else status.textContent = t('cad.turn', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  for (const id of ['#first', '#size', '#rule', '#touch']) $(id).disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('cad.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('cad.online.note') : '';
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
const hush = () => document.querySelectorAll('.player .bubble').forEach((b) => b.classList.remove('show'));
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame() {
  clearTimeout(aiTimer);
  st = CAD.create({ size: +cfg.size, rule: cfg.rule, diag: cfg.touch === 'diag', first: starter() });
  history = []; shapes = {}; over = false; mirrorSaid = false; lowSaid = [false, false];
  setMood(0, 'neutral'); setMood(1, 'neutral'); hush();
  $('#result').hidden = true;
  render(false);
  maybeAI();
}
function newMatch() { match = { game: 0 }; newGame(); }

function play(i) {
  const prev = CAD.clone(st);
  history.push(prev);
  const who = st.turn, other = 1 - who;
  const before = CAD.counts(prev), wasStat = CAD.status(prev)[i];
  const mirrored = isAI(who) && cfg.mode === 'hard' && prev.moves > 0 && CAD.mirrorMove(prev) === i;
  CAD.apply(st, i);
  if (CAD.isOver(st)) return finish(true);

  const after = CAD.counts(st);
  const stolen = before.avail[other] - after.avail[other];
  const big = st.diag ? 4 : 3;
  if (mirrored && !mirrorSaid) {
    mirrorSaid = true;
    setMood(who, 'smug', 'wave'); say(who, 'cad.say.mirror');
    if (moods[other].mood === 'happy') setMood(other, 'neutral');
  } else if (after.avail[other] <= 3 && after.avail[other] < after.avail[who]) {
    setMood(who, 'happy', 'wave'); setMood(other, 'worried');
    if (!lowSaid[other]) { lowSaid[other] = true; say(other, 'cad.say.low'); }
  } else if (stolen >= big) {
    setMood(who, 'happy', stolen >= big + 2 ? 'up' : 'wave'); setMood(other, 'worried');
    if (stolen >= big + 2 || Math.random() < 0.5) say(who, 'cad.say.grab' + who);
    else if (Math.random() < 0.5) say(other, 'cad.say.squeezed');
  } else if (st.rule === 'snort' && wasStat !== 3 && before.both > 0) {
    // Spent a private square while shared ones were still up for grabs.
    setMood(who, 'neutral'); setMood(other, 'smug');
    if (Math.random() < 0.4) say(other, 'cad.say.waste');
  } else {
    setMood(who, 'neutral');
    if (moods[other].mood !== 'worried') setMood(other, 'neutral');
  }
  render(true);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (over || !isAI(st.turn)) return;
    const m = CAD.aiMove(st, cfg.mode, { timeMs: 450 });
    if (CAD.legal(st, m)) play(m);
  }, 550);
}

function finish(fresh) {
  over = true;
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  if (fresh) {
    say(w, 'cad.say.win');
    setTimeout(() => over && say(1 - w, 'cad.say.lose'), 900);
  }
  render(fresh);
  const txt = $('#result-text');
  txt.textContent = t('cad.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-why').textContent = t('cad.why' + w);
  $('#result-next').textContent = t('cad.next', { name: name((cfg.first + match.game + 1) % 2) });
  setTimeout(() => { if (over) $('#result').hidden = false; }, fresh ? 1000 : 0);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false;
  setMood(0, 'neutral'); setMood(1, 'neutral'); hush();
  $('#result').hidden = true;
  render(false);
  maybeAI();
}

// Online, only the room creator may restart or change the rules; the guest follows.
function restart(next) {
  if (!canRestart()) return;
  if (next) match.game++;
  newGame();
  if (online()) sendState('new');
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
const RULES = ['first', 'size', 'rule', 'touch'];
function sendState(type = 'state') {
  const rules = Object.fromEntries(RULES.map((k) => [k, cfg[k]]));
  sess.send(type, { st, over, match, rules, names: cfg.names });
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
    for (const k of RULES) { cfg[k] = d.rules[k]; $('#' + k).value = cfg[k]; }
    remoteNames[0] = d.names[0];
    setMood(0, 'neutral'); setMood(1, 'neutral'); hush();
    $('#result').hidden = true;
    over ? finish(false) : render(false);
  };
  s.on('state', receive);
  s.on('new', receive);
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(false); if (over) finish(false); });
  s.on('move', (d) => {
    if (d.n !== st.moves || !CAD.legal(st, d.i) || isLocal(st.turn)) return s.host ? sendState() : s.send('resync');
    play(d.i);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else render(false);
}

function localMove(i) {
  if (online()) sess.send('move', { i, n: st.moves });
  play(i);
}

// ---------- input ----------
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  let i = canMove() ? cellAt(evt) : -1;
  if (i >= 0 && !CAD.legal(st, i)) i = -1;
  if (i === hoverCell) return;
  hoverCell = i;
  renderGhost(i);
  svg.style.cursor = i >= 0 ? 'pointer' : '';
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; renderGhost(-1); });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const i = cellAt(evt);
  if (i < 0) return;
  if (CAD.legal(st, i)) localMove(i);
  else flashNope(i);
});

const onRule = (k) => (e) => {
  const v = e.target.value;
  cfg[k] = k === 'first' || k === 'size' ? +v : v; saveCfg();
  if (canRestart()) { newMatch(); if (online()) sendState('new'); }
};
for (const k of RULES) $('#' + k).addEventListener('change', onRule(k));
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newMatch(); });
$('#hints').addEventListener('change', (e) => { cfg.hints = e.target.value; saveCfg(); render(false); });
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
for (const k of [...RULES, 'mode', 'hints']) $('#' + k).value = cfg[k];
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newMatch(); },
});
if (!online()) showOnce('how', SLUG);
