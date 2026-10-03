import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { FPL } from './engine.js';
import './strings.js';

const SLUG = 'franco-prussian-labyrinth';
const S = 40, L = 26, T = 26, R = 8; // cell size, label margins (left/top), right/bottom margin
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const GOLD = '#f2b632';
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ variant: 'classic', mode: 'pvp', names: ['', ''], starter: 0 },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st;                       // engine state (online guest: redacted copy from the host)
let drafts = [[], []];        // labyrinths being built on this device
let builder = 0;              // who is building right now on this device (hot-seat: 0, then 1)
let cover = null;             // hot-seat cover screen: 'build' | 'pass' | 'play' | null
let history = [];             // play-phase snapshots for undo
let shapes = {};              // cached wobble per drawn element
let shown = 0;                // whose walk is on the board during play
let overView = 0;             // after the game: whose labyrinth is shown (its builder)
let peeking = false;          // result card hidden to look at the mazes
let busy = false, flowTimer, msgTimer, flash = null, msg = '';
let sel = -1;                 // French rules: chosen starting square
let fresh = null;             // last event to animate on the next render
let sentMaze = false;         // online: our labyrinth has been handed in
let pending = false;          // online guest: waiting for the host to answer a move
let sess = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];
const said = { close: [false, false] };

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const vsAI = () => !online() && cfg.mode !== 'pvp';
const hotseat = () => !online() && !vsAI();
const isAI = (p) => vsAI() && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const me = () => (online() ? mySeat() : 0); // the human whose own maze may be shown in full
function name(p) {
  if (isAI(p)) return t('fpl.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('fpl.p' + p);
}
const cellName = (c) => 'ABCDEFGHIJ'[c % st.N] + (Math.floor(c / st.N) + 1);
const connectedOK = () => !online() || sess.connected;

function canBuild() {
  return st.phase === 'build' && !cover && connectedOK() && !st.ready[builder] && !sentMaze && isLocal(builder);
}
const canWalk = () => st.phase === 'play' && !busy && !pending && !cover && isLocal(st.turn) && connectedOK();

// ---------- geometry ----------
const cx = (c) => L + (c % st.N) * S + S / 2;
const cy = (c) => T + Math.floor(c / st.N) * S + S / 2;
const ptX = (x) => L + x * S, ptY = (y) => T + y * S;
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function cellAt(p) {
  const c = Math.floor((p.x - L) / S), r = Math.floor((p.y - T) / S);
  return r < 0 || c < 0 || r >= st.N || c >= st.N ? -1 : r * st.N + c;
}
// Nearest internal edge to a point (for building), or null.
function edgeAt(p) {
  const x = (p.x - L) / S, y = (p.y - T) / S, N = st.N;
  let best = null, bd = 0.34;
  const vx = Math.round(x), vy = Math.floor(y);
  if (Math.abs(x - vx) < bd) { const e = FPL.edgeOfSeg(N, [vx, vy], [vx, vy + 1]); if (e) { best = e; bd = Math.abs(x - vx); } }
  const hy = Math.round(y), hx = Math.floor(x);
  if (Math.abs(y - hy) < bd) { const e = FPL.edgeOfSeg(N, [hx, hy], [hx + 1, hy]); if (e) best = e; }
  return best;
}
const shapeFor = (k, make) => (shapes[k] ??= make());

function wallPath(key) {
  return shapeFor('w' + key, () => {
    const [[x1, y1], [x2, y2]] = FPL.segOf(st.N, key);
    const ox = x1 === x2 ? 0 : 0.06, oy = x1 === x2 ? 0.06 : 0;
    return line(ptX(x1 - ox), ptY(y1 - oy), ptX(x2 + ox), ptY(y2 + oy), 1.6);
  });
}

// ---------- what the board shows ----------
function view() {
  if (st.phase === 'build') return { mode: 'build', p: builder };
  if (st.phase === 'over') return { mode: 'walk', w: 1 - overView, full: true };
  const w = shown;
  return { mode: 'walk', w, full: !hotseat() && w !== me() };
}

// ---------- rendering ----------
function render() {
  const N = st.N, W = L + N * S + R, H = T + N * S + R;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const v = view();
  let out = '';

  // paper grid + labels
  out += `<g class="grid">`;
  for (let i = 1; i < N; i++) {
    out += `<path d="${shapeFor(`gv${N}_${i}`, () => line(ptX(i), ptY(0), ptX(i), ptY(N), 0.8))}"/>`;
    out += `<path d="${shapeFor(`gh${N}_${i}`, () => line(ptX(0), ptY(i), ptX(N), ptY(i), 0.8))}"/>`;
  }
  out += `</g>`;
  for (let i = 0; i < N; i++) {
    out += `<text class="lbl" x="${ptX(i) + S / 2}" y="${T - 9}">${'ABCDEFGHIJ'[i]}</text>`;
    out += `<text class="lbl" x="${L / 2 - 1}" y="${ptY(i) + S / 2 + 1}">${i + 1}</text>`;
  }

  // goal star
  const G = FPL.goal(N);
  out += `<path class="star" d="${shapeFor('star' + N, () => star(cx(G), cy(G), 14))}" fill="${GOLD}" stroke="${INK}"/>`;

  if (v.mode === 'build') out += renderBuild(v.p);
  else out += renderWalk(v);

  out += `<path class="frame" d="${shapeFor('frame' + N, () => [
    line(ptX(0), ptY(0), ptX(N), ptY(0), 1.4), line(ptX(N), ptY(0), ptX(N), ptY(N), 1.4),
    line(ptX(N), ptY(N), ptX(0), ptY(N), 1.4), line(ptX(0), ptY(N), ptX(0), ptY(0), 1.4)].join(' '))}"/>`;
  out += `<path id="preview" class="preview" d=""/>`;
  svg.innerHTML = out;
  svg.classList.toggle('busy', st.phase === 'play' && !canWalk());
  fresh = null;
  renderChrome();
}

function star(x, y, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 0.45 : 1;
    pts.push([x + Math.cos(a) * r * k + (Math.random() - 0.5), y + Math.sin(a) * r * k + (Math.random() - 0.5)]);
  }
  return 'M' + pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L') + ' Z';
}

function renderBuild(p) {
  if (cover || (online() && !connectedOK())) return '';
  const col = COLORS[p].main;
  let out = '';
  for (const k of drafts[p]) out += `<path class="wall" d="${wallPath(k)}" stroke="${col}"/>`;
  if (flash) out += `<path class="wall bad" d="${wallPath(flash)}" stroke="${INK}"/>`;
  return out;
}

function renderWalk({ w, full }) {
  const N = st.N, b = 1 - w, wc = COLORS[w], bc = COLORS[b];
  const K = st.know[w];
  let out = '';
  // visited squares
  const seen = new Set([0]);
  for (const [a, c] of st.trail[w]) { seen.add(a); seen.add(c); }
  out += `<g class="visited" fill="${wc.fill}" filter="url(#mg-crayon)">`;
  for (const c of seen) out += `<rect x="${cx(c) - S / 2 + 2}" y="${cy(c) - S / 2 + 2}" width="${S - 4}" height="${S - 4}" rx="4"/>`;
  out += `</g>`;
  // Ariadne's thread
  let d = '';
  for (const [a, c] of st.trail[w]) d += shapeFor(`t${a}_${c}`, () => line(cx(a), cy(a), cx(c), cy(c), 2.5)) + ' ';
  if (d) out += `<path class="thread" d="${d}" stroke="${wc.main}"/>`;
  // walls: the whole labyrinth faintly when we may see it, the discovered ones boldly
  const maze = st.maze[b];
  if (full && maze) for (const k of maze) if (K[k] !== 2) out += `<path class="wall ghost" d="${wallPath(k)}" stroke="${bc.main}"/>`;
  const bumped = fresh && fresh.bump;
  for (const [k, val] of Object.entries(K)) {
    if (val !== 2) continue;
    out += `<path class="wall${k === bumped ? ' fresh' : ''}" d="${wallPath(k)}" stroke="${bc.main}"/>`;
  }
  // move hints for the walker
  const mine = st.phase === 'play' && w === st.turn && isLocal(w) && !cover && !busy && !pending;
  const from = st.slide && sel >= 0 ? sel : st.pos[w];
  if (mine) {
    if (st.slide) {
      for (const c of st.starts[w]) {
        if (c === from) continue;
        out += `<path class="start" d="${shapeFor('s' + c, () => circle(cx(c), cy(c), 11, 11, 0.06))}" stroke="${wc.main}"/>`;
      }
    }
    for (const m of FPL.legalMoves(st)) {
      if (st.slide && m.from !== from) continue;
      out += hintArrow(from, m.d, wc.main);
    }
  }
  // the walker
  out += tokenSVG(mine ? from : st.pos[w], w, fresh && fresh.p === w ? fresh : null);
  return out;
}

function hintArrow(c, d, col) {
  const DX = [0, 1, 0, -1][d], DY = [-1, 0, 1, 0][d];
  const x = cx(c) + DX * S * 0.78, y = cy(c) + DY * S * 0.78;
  const px = -DY, py = DX, a = 6;
  return `<path class="hint" d="M${x - DX * a + px * a} ${y - DY * a + py * a} L${x + DX * a * 0.6} ${y + DY * a * 0.6} L${x - DX * a - px * a} ${y - DY * a - py * a}" stroke="${col}"/>`;
}

function tokenSVG(c, w, ev) {
  const col = COLORS[w], x = cx(c), y = cy(c);
  let style = '', cls = 'tok';
  if (ev && ev.path.length > 1 && ev.path[ev.path.length - 1] === c) {
    const f = ev.path[0];
    style = `--dx:${cx(f) - x}px;--dy:${cy(f) - y}px;--t:${Math.min(0.9, 0.16 + 0.1 * (ev.path.length - 1))}s`;
    cls += ' slide';
  }
  if (ev && ev.bump) {
    const DX = [0, 1, 0, -1][ev.d], DY = [-1, 0, 1, 0][ev.d];
    style += `;--bx:${DX * 9}px;--by:${DY * 9}px`;
    cls += ev.path.length > 1 ? ' slide bump-late' : ' bump';
  }
  const head = shapeFor('tok', () => circle(0, 0, 12.5, 12.8, 0.06));
  const look = ev ? [[0, -2], [2.5, 0], [0, 2.5], [-2.5, 0]][ev.d] : [1.5, 0];
  return `<g transform="translate(${x} ${y})"><g class="${cls}" style="${style}">
    <path d="${head}" fill="${col.main}" filter="url(#mg-crayon)"/>
    <path d="${head}" fill="none" stroke="${col.text}" stroke-width="2.4"/>
    <circle cx="-4.5" cy="-2" r="3.6" fill="var(--eye)" stroke="${col.dark}" stroke-width="1.3"/><circle cx="4.5" cy="-2" r="3.6" fill="var(--eye)" stroke="${col.dark}" stroke-width="1.3"/>
    <circle cx="${-4.5 + look[0] * 0.6}" cy="${-2 + look[1] * 0.6}" r="1.6" fill="${col.dark}"/><circle cx="${4.5 + look[0] * 0.6}" cy="${-2 + look[1] * 0.6}" r="1.6" fill="${col.dark}"/>
  </g></g>`;
}

function renderChrome() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = st.phase === 'build' ? (builder === p && !st.ready[p]) || (online() && !st.ready[p]) : st.phase === 'play' && st.turn === p;
    el.classList.toggle('active', !!active);
    const m = moods[p];
    const pose = st.phase === 'over' || m.pose !== 'down' ? m.pose : st.phase === 'play' && st.turn === p ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29 });
    let sc = '';
    if (st.phase === 'build') sc = st.ready[p] ? t('fpl.card.ready') : (online() ? true : builder === p) ? t('fpl.card.building') : '';
    else sc = `${cellName(st.pos[p])} · ${plural(st.moves[p], st.slide ? 'fpl.slides' : 'fpl.steps')}`;
    el.querySelector('.score').textContent = sc;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  // build bar
  const showBar = st.phase === 'build' && canBuild();
  $('#build-bar').hidden = !showBar;
  if (showBar) {
    const n = drafts[builder].length;
    $('#b-ready').disabled = n !== st.W;
    $('#b-clear').disabled = !n;
    $('#b-random').disabled = n === st.W;
  }

  // cover screen
  let cv = null;
  if (st.phase === 'build' && online() && connectedOK() && (sentMaze || st.ready[mySeat()]) && !st.ready[1 - mySeat()]) {
    cv = { text: t('fpl.cover.wait', { name: name(1 - mySeat()) }), sub: t('fpl.cover.wait.sub') };
  } else if (cover === 'build') cv = { text: t('fpl.cover.build', { name: name(0) }), sub: t('fpl.cover.build.sub', { other: name(1) }), go: t('fpl.cover.build.go'), col: 0 };
  else if (cover === 'pass') cv = { text: t('fpl.cover.pass', { name: name(1) }), sub: t('fpl.cover.pass.sub', { other: name(0) }), go: t('fpl.cover.build.go'), col: 1 };
  else if (cover === 'play') cv = { text: t('fpl.cover.play'), sub: t('fpl.cover.play.sub', { name: name(st.turn) }), go: t('fpl.cover.play.go'), col: st.turn };
  $('#cover').hidden = !cv;
  if (cv) {
    $('#cover-text').textContent = cv.text;
    $('#cover-text').style.color = cv.col === undefined ? 'var(--ink)' : COLORS[cv.col].main;
    $('#cover-sub').textContent = cv.sub;
    $('#cover-go').hidden = !cv.go;
    $('#cover-go').textContent = cv.go || '';
  }

  // status line
  const status = $('#status');
  let s = '', col = INK;
  if (online() && !sess.connected) s = t('fpl.online.wait');
  else if (st.phase === 'build') {
    if (!cv && canBuild()) {
      const n = drafts[builder].length, walls = n ? t('fpl.walls', { n, w: st.W }) : t('fpl.build.hint');
      s = msg || (hotseat() ? t('fpl.build', { name: name(builder), walls }) : t('fpl.build.you', { walls }));
      col = msg ? INK : COLORS[builder].main;
    }
  } else if (st.phase === 'play') {
    const p = st.turn;
    col = COLORS[p].main;
    const extra = st.slide ? t('fpl.pick') : t('fpl.left', { n: st.left });
    if (cover) s = '';
    else if (busy && shown !== p) { s = t(st.last && st.last.bump ? 'fpl.end.bump' : 'fpl.end.done', { name: name(shown) }); col = COLORS[shown].main; }
    else if (isAI(p)) s = t('fpl.thinking', { name: name(p) });
    else if (isRemote(p)) s = t('fpl.turn.them', { name: name(p) });
    else if (online() || vsAI()) s = `${t('fpl.turn.you')} · ${extra}`;
    else s = `${t('fpl.turn', { name: name(p) })} · ${extra}`;
  } else if (peeking) {
    s = t('fpl.over.view', { name: name(overView) });
    col = COLORS[overView].main;
  }
  status.textContent = s;
  status.style.color = col;

  $('#undo').disabled = online() || (st.phase === 'build' ? !canBuild() || !drafts[builder].length : !history.length || busy);
  $('#mode').disabled = online();
  $('#variant').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('fpl.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('fpl.online.note') : '';
}

function note(key) {
  msg = t(key);
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { msg = ''; flash = null; render(); }, 1600);
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1800);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame() {
  clearTimeout(flowTimer);
  st = FPL.create(cfg.variant, cfg.starter);
  drafts = [[], []]; history = []; shapes = {}; sel = -1; fresh = null; busy = false; pending = false; sentMaze = false;
  peeking = false; said.close = [false, false]; msg = ''; flash = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  builder = online() ? mySeat() : 0;
  cover = hotseat() ? 'build' : null;
  if (vsAI()) FPL.setMaze(st, 1, FPL.aiMaze(cfg.variant, cfg.mode));
  render();
}

function toggleWall(key) {
  const d = drafts[builder], i = d.indexOf(key);
  if (i >= 0) d.splice(i, 1);
  else if (d.length >= st.W) { flash = null; note('fpl.build.full'); }
  else if (!FPL.canAddWall(st.N, d, key)) { flash = key; note('fpl.build.blocked'); }
  else d.push(key);
  render();
}
function fillRandom() {
  drafts[builder] = FPL.randomMaze(st.N, st.W, Math.random, drafts[builder]);
  render();
}

function finishBuild() {
  const walls = drafts[builder];
  if (walls.length !== st.W) return;
  const p = builder;
  if (online() && !sess.host) {
    sentMaze = true;
    sess.send('maze', { walls, id: st.id });
    say(p, 'fpl.say.ready');
    return render();
  }
  if (!FPL.setMaze(st, p, walls)) return;
  say(p, 'fpl.say.ready');
  if (hotseat() && p === 0) { builder = 1; cover = 'pass'; return render(); }
  if (hotseat()) cover = 'play';
  if (online()) sendState();
  if (st.phase === 'play') startPlay(); else render();
}

function startPlay() {
  history = []; shown = st.turn; sel = -1; busy = false;
  render();
  maybeAI();
}

function play(m) {
  if (!online()) history.push(FPL.clone(st));
  const ev = FPL.apply(st, m);
  if (online()) sendState();
  afterEvent(ev);
}

function afterEvent(ev) {
  const w = ev.p, b = 1 - w, N = st.N;
  fresh = ev;
  const end = ev.path[ev.path.length - 1];
  const dist = (c) => 2 * (N - 1) - Math.floor(c / N) - (c % N);
  if (ev.win) {
    busy = true;
    overView = b; // keep the winner's own walk on the board while the last step plays out
    render();
    clearTimeout(flowTimer);
    flowTimer = setTimeout(finish, 700);
    return;
  }
  if (ev.bump) {
    setMood(w, Math.random() < 0.5 ? 'sad' : 'worried');
    setMood(b, 'smug');
    if (Math.random() < 0.55) say(w, 'fpl.say.bump'); else say(b, 'fpl.say.glee');
  } else if (dist(end) <= 3 && !said.close[w]) {
    said.close[w] = true;
    setMood(w, 'happy', 'wave'); setMood(b, 'worried');
    say(w, 'fpl.say.close');
    setTimeout(() => say(b, 'fpl.say.worry'), 900);
  } else if (ev.turnEnd) {
    setMood(w, 'happy', 'wave');
    if (moods[b].mood === 'smug') setMood(b, 'neutral');
    if (Math.random() < 0.4) say(w, 'fpl.say.run');
  } else if (moods[w].mood !== 'neutral' && moods[w].mood !== 'happy') setMood(w, 'neutral');

  if (ev.turnEnd) {
    busy = true;
    render();
    clearTimeout(flowTimer);
    flowTimer = setTimeout(() => {
      busy = false; shown = st.turn; sel = -1;
      if (moods[st.turn].pose !== 'down') setMood(st.turn, moods[st.turn].mood);
      render();
      maybeAI();
    }, ev.bump ? 1200 : 900);
  } else {
    render();
    maybeAI();
  }
}

function maybeAI() {
  if (st.phase !== 'play' || !isAI(st.turn) || busy) return;
  busy = true;
  clearTimeout(flowTimer);
  flowTimer = setTimeout(() => { busy = false; play(FPL.aiMove(st, cfg.mode)); }, st.slide ? 750 : 430);
}

function finish() {
  busy = false;
  const w = st.winner;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  say(w, 'fpl.say.win'); setTimeout(() => say(1 - w, 'fpl.say.lose'), 900);
  overView = 1 - w; peeking = false;
  render();
  const txt = $('#result-text');
  txt.textContent = t('fpl.win', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-sub').textContent = t('fpl.win.sub', { n: plural(st.moves[w], st.slide ? 'fpl.slides' : 'fpl.steps') });
  clearTimeout(flowTimer);
  flowTimer = setTimeout(() => { if (st.phase === 'over' && !peeking) $('#result').hidden = false; }, 700);
}

function undo() {
  if (online()) return;
  if (st.phase === 'build') {
    if (canBuild() && drafts[builder].length) { drafts[builder].pop(); render(); }
    return;
  }
  if (!history.length) return;
  clearTimeout(flowTimer);
  const cur = st;
  do st = history.pop(); while (history.length && isAI(st.turn));
  // You can't un-learn a wall you have bumped into.
  for (const p of [0, 1]) Object.assign(st.know[p], cur.know[p]);
  busy = false; shown = st.turn; sel = -1; peeking = false; fresh = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

// Online, only the room creator may restart (and change the rules); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  cfg.starter = st && st.phase === 'over' ? 1 - st.first : cfg.starter;
  saveCfg();
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Host is authoritative and keeps both labyrinths; the guest only ever receives its own maze
// plus what it has discovered of the host's (FPL.redact) until the game is over.
function sendState() {
  if (sess && sess.host) sess.send('state', { st: FPL.redact(st, 1), names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(flowTimer);
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prev = st;
    st = d.st; pending = false;
    remoteNames[0] = d.names[0];
    cfg.variant = st.v; $('#variant').value = st.v;
    builder = 1;
    if (!prev || prev.id !== st.id) {
      if (!prev || prev.N !== st.N || prev.phase !== 'build' || sentMaze) drafts = [[], []];
      sentMaze = false; shapes = {}; history = []; sel = -1; busy = false; peeking = false; said.close = [false, false];
      setMood(0, 'neutral'); setMood(1, 'neutral');
      $('#result').hidden = true;
      shown = st.turn;
      if (st.phase === 'over') return finish();
      return render();
    }
    if (st.ready[1]) sentMaze = false;
    if (st.phase === 'play' && prev.phase === 'build') return startPlay();
    if (st.n === prev.n + 1 && st.last) return afterEvent(st.last);
    if (st.n !== prev.n) { clearTimeout(flowTimer); busy = false; shown = st.turn; }
    if (st.phase === 'over' && prev.phase !== 'over') return finish();
    render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('maze', (d) => {
    if (!s.host) return;
    if (d.id === st.id && FPL.setMaze(st, 1, d.walls)) {
      sendState();
      if (st.phase === 'play') return startPlay();
      return render();
    }
    sendState();
  });
  s.on('move', (d) => {
    if (!s.host) return;
    if (st.phase !== 'play' || st.turn !== 1 || d.n !== st.n || !FPL.isLegal(st, d.m)) return sendState();
    play(d.m);
  });
  s.on('resync', () => sendState());
  if (s.host) newGame();
  else { builder = 1; cover = null; render(); }
}

function localMove(m) {
  if (!FPL.isLegal(st, m)) return;
  if (online() && !sess.host) {
    pending = true;
    sess.send('move', { m, n: st.n });
    clearTimeout(flowTimer);
    flowTimer = setTimeout(() => { if (pending) sess.send('resync'); }, 4000);
    return render();
  }
  play(m);
}

// ---------- input ----------
function walkInput(p) {
  const w = st.turn;
  if (st.slide) {
    const c = cellAt(p);
    if (c < 0) return;
    const from = sel >= 0 ? sel : st.pos[w];
    if (c !== from && st.starts[w].includes(c)) { sel = c; return render(); }
    const N = st.N, fr = Math.floor(from / N), fc = from % N, r = Math.floor(c / N), cc = c % N;
    let d = -1;
    if (r === fr && cc !== fc) d = cc > fc ? 1 : 3;
    else if (cc === fc && r !== fr) d = r > fr ? 2 : 0;
    if (d >= 0) localMove({ from, d });
    return;
  }
  const at = st.pos[w], dx = p.x - cx(at), dy = p.y - cy(at);
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  if (m < S * 0.45 || m > S * 1.6) return;
  const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
  localMove({ d });
}

svg.addEventListener('click', (evt) => {
  const p = svgPoint(evt);
  if (st.phase === 'build') { if (canBuild()) { const e = edgeAt(p); if (e) toggleWall(e); } return; }
  if (st.phase === 'over') { if (peeking) { overView = 1 - overView; render(); } return; }
  if (canWalk()) walkInput(p);
});
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const pv = svg.querySelector('#preview');
  if (!pv) return;
  let d = '', col = INK;
  const p = svgPoint(evt);
  if (st.phase === 'build' && canBuild()) {
    const e = edgeAt(p);
    if (e) { d = wallPath(e); col = COLORS[builder].main; }
  } else if (canWalk() && !st.slide) {
    const at = st.pos[st.turn], dx = p.x - cx(at), dy = p.y - cy(at), m = Math.max(Math.abs(dx), Math.abs(dy));
    if (m >= S * 0.45 && m <= S * 1.6) {
      const dd = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
      const x = FPL.nb(st.N, at, dd);
      if (x >= 0 && FPL.isLegal(st, { d: dd })) { d = `M${cx(x) - 13} ${cy(x) - 13} h26 v26 h-26 Z`; col = COLORS[st.turn].main; }
    }
  } else if (canWalk() && st.slide) {
    const c = cellAt(p);
    if (c >= 0) { d = `M${cx(c) - 15} ${cy(c) - 15} h30 v30 h-30 Z`; col = COLORS[st.turn].main; }
  }
  pv.setAttribute('d', d);
  pv.setAttribute('stroke', col);
  svg.style.cursor = d ? 'pointer' : '';
});
svg.addEventListener('pointerleave', () => svg.querySelector('#preview')?.setAttribute('d', ''));
document.addEventListener('keydown', (e) => {
  const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
  if (d === undefined || document.querySelector('dialog[open]') || e.target.matches('input, select')) return;
  if (!canWalk()) return;
  e.preventDefault();
  localMove(st.slide ? { from: sel >= 0 ? sel : st.pos[st.turn], d } : { d });
});

$('#b-random').addEventListener('click', () => canBuild() && fillRandom());
$('#b-clear').addEventListener('click', () => { if (canBuild()) { drafts[builder] = []; render(); } });
$('#b-ready').addEventListener('click', () => canBuild() && finishBuild());
$('#cover-go').addEventListener('click', () => {
  if (cover === 'play') { cover = null; startPlay(); return; }
  cover = null; render();
});
$('#peek').addEventListener('click', () => { peeking = true; $('#result').hidden = true; render(); });
$('#variant').addEventListener('change', (e) => { cfg.variant = e.target.value; saveCfg(); restart(); });
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
    render();
  }));
document.addEventListener('mg:lang', () => { render(); if (st.phase === 'over') finishText(); });
function finishText() {
  const w = st.winner;
  $('#result-text').textContent = t('fpl.win', { name: name(w) });
  $('#result-sub').textContent = t('fpl.win.sub', { n: plural(st.moves[w], st.slide ? 'fpl.slides' : 'fpl.steps') });
}

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#variant').value = cfg.variant;
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
