import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { LAP } from './engine.js';
import './strings.js';

const SLUG = 'lap';
const COLORS = [PALETTE.blue, PALETTE.red];
const REG = [
  { fill: '#f6c445', ink: '#8a6800', name: 'I' },
  { fill: '#62c370', ink: '#256b33', name: 'II' },
  { fill: '#a07ad9', ink: '#4f2f88', name: 'III' },
  { fill: '#f59a3c', ink: '#94500c', name: 'IV' },
];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ variant: 'std', rule: 'any', mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-lap') || '{}'));
const saveCfg = () => localStorage.setItem('mg-lap', JSON.stringify(cfg));

let st, history, shapes, aiTimer;
let drafts, notes;            // drafts[p]: p's secret map while drawing; notes[p]: p's pencil notes on the opponent's map
let tool = 0, sel = null, anchor = null, hl = -1;
let handover = null;          // hot-seat: the prober keeps the screen until "pass turn"
let uncovered = null;         // hot-seat: who confirmed "it's me" behind the cover during setup
let showMine = false;         // play: look at my own map instead of my notes
let overOwner = null;         // over: whose map is shown
let armGuess = 0;             // two-tap confirmation for "guess!"
let nextFirst = 0;
let sess = null;
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
  if (isAI(p)) return t('lap.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('lap.p' + p);
}
const N = () => st.N;
const empty = () => Array(st.N * st.N).fill(-1);

function setupPlayer() {
  if (online()) return mySeat();
  if (!hotSeat()) return 0;
  return st.boards[0] ? 1 : 0;
}
function viewer() {
  if (online()) return mySeat();
  if (!hotSeat()) return 0;
  if (st.phase === 'setup') return setupPlayer();
  if (st.phase === 'play') return handover ?? st.turn;
  return st.guess ? st.guess.p : 0;
}
const covered = () => hotSeat() && st.phase === 'setup' && uncovered !== setupPlayer();
function owner() {
  const v = viewer();
  if (st.phase === 'setup') return v;
  if (st.phase === 'play') return showMine ? v : 1 - v;
  return overOwner ?? (st.guess ? 1 - st.guess.p : 1 - v);
}
// The grid currently drawn and, if the local player may color it, the array to edit.
function shown() {
  const v = viewer(), o = owner();
  if (st.phase === 'setup') return { grid: drafts[v], edit: st.boards[v] || covered() ? null : drafts[v] };
  if (st.phase === 'play') return o === v ? { grid: st.boards[v], edit: null } : { grid: notes[v], edit: notes[v] };
  return { grid: Array.isArray(st.boards[o]) ? st.boards[o] : null, edit: null };
}
const myTurn = () => st.phase === 'play' && isLocal(st.turn) && st.turn === viewer() && handover == null && (!online() || sess.connected);
const canProbe = () => myTurn() && owner() !== viewer() && tool === 'probe';

// ---------- geometry ----------
const CS = () => (st.N > 6 ? 40 : 50);
const ML = 24, MT = 24, MR = 6, MB = 6;
const cellXY = (r, c) => [ML + c * CS(), MT + r * CS()];
function cellAt(evt, clamp) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  let c = Math.floor((p.x - ML) / CS()), r = Math.floor((p.y - MT) / CS());
  if (clamp) { r = Math.max(0, Math.min(st.N - 1, r)); c = Math.max(0, Math.min(st.N - 1, c)); }
  return r >= 0 && c >= 0 && r < st.N && c < st.N ? { r, c } : null;
}
const shapeFor = (k, make) => (shapes[k] ??= make());
const ansHTML = (counts) => counts.map((n, L) => (n ? `<span class="lap-sw" style="--c:${REG[L].fill}">${REG[L].name}<small>×${n}</small></span>` : '')).join('');

// ---------- rendering ----------
function render() {
  const n = st.N, cs = CS(), W = ML + n * cs + MR, H = MT + n * cs + MB;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const { grid } = shown();
  const o = owner(), v = viewer();
  let out = '';

  // coordinates
  for (let c = 0; c < n; c++) out += `<text class="coord" x="${ML + c * cs + cs / 2}" y="${MT - 11}">${'ABCDEFGH'[c]}</text>`;
  for (let r = 0; r < n; r++) out += `<text class="coord" x="${ML - 12}" y="${MT + r * cs + cs / 2}">${r + 1}</text>`;

  // crayon fills
  if (grid) for (let i = 0; i < n * n; i++) {
    const L = grid[i];
    if (L < 0) continue;
    const [x, y] = cellXY((i / n) | 0, i % n);
    out += `<rect class="fill" x="${x + 1}" y="${y + 1}" width="${cs - 2}" height="${cs - 2}" fill="${REG[L].fill}" filter="url(#mg-crayon)"/>`;
  }
  // pencil grid
  for (let k = 1; k < n; k++) {
    const a = shapeFor('gh' + k, () => line(ML, MT + k * cs, ML + n * cs, MT + k * cs, 1));
    const b = shapeFor('gv' + k, () => line(ML + k * cs, MT, ML + k * cs, MT + n * cs, 1));
    out += `<path class="gridline" d="${a}"/><path class="gridline" d="${b}"/>`;
  }
  // region names
  if (grid) for (let i = 0; i < n * n; i++) {
    const L = grid[i];
    if (L < 0) continue;
    const [x, y] = cellXY((i / n) | 0, i % n);
    out += `<text class="rn" x="${x + cs / 2}" y="${y + cs / 2}" fill="${REG[L].ink}" font-size="${cs * 0.4}">${REG[L].name}</text>`;
  }
  // walls between different regions
  if (grid) for (let i = 0; i < n * n; i++) {
    const r = (i / n) | 0, c = i % n, [x, y] = cellXY(r, c);
    if (c < n - 1 && grid[i] >= 0 && grid[i + 1] >= 0 && grid[i] !== grid[i + 1])
      out += `<path class="wall" d="${shapeFor('wv' + i, () => line(x + cs, y, x + cs, y + cs, 1.4))}"/>`;
    if (r < n - 1 && grid[i] >= 0 && grid[i + n] >= 0 && grid[i] !== grid[i + n])
      out += `<path class="wall" d="${shapeFor('wh' + i, () => line(x, y + cs, x + cs, y + cs, 1.4))}"/>`;
  }
  // frame
  const fr = shapeFor('frame' + n, () => [
    line(ML, MT, ML + n * cs, MT, 1.6), line(ML + n * cs, MT, ML + n * cs, MT + n * cs, 1.6),
    line(ML + n * cs, MT + n * cs, ML, MT + n * cs, 1.6), line(ML, MT + n * cs, ML, MT, 1.6),
  ].join(' '));
  out += `<path class="frame" d="${fr}"/>`;

  // mistakes in the final guess
  if (st.phase === 'over' && st.guess && st.guess.p === 1 - o && Array.isArray(st.boards[o])) {
    const mm = LAP.mismatches(st.guess.grid, st.boards[o], st.K);
    mm.forEach((bad, i) => {
      if (!bad) return;
      const [x, y] = cellXY((i / n) | 0, i % n), d = cs * 0.28;
      const k = shapeFor('x' + i, () => line(x + d, y + d, x + cs - d, y + cs - d, 1.5) + ' ' + line(x + cs - d, y + d, x + d, y + cs - d, 1.5));
      out += `<path class="miss" d="${k}"/>`;
    });
  }

  // highlighted probe
  const probes = st.probes[1 - o] || [];
  const hx = hl >= 0 && hl < probes.length ? probes[hl] : probes[probes.length - 1];
  if (hx && st.phase !== 'setup' && !sel) out += rectSVG(hx, 'hl', PALETTE.ink);
  // pending selection
  const s = sel || (anchor && { r0: anchor.r, c0: anchor.c, r1: anchor.r, c1: anchor.c });
  if (s && canProbe()) out += rectSVG(s, LAP.rectOk(st, s) ? 'sel' : 'sel bad', COLORS[v].main);

  svg.innerHTML = out;
  svg.classList.toggle('editable', !!shown().edit || canProbe());
  renderPanel();
  renderPlayers();
  renderCover();
}

function rectSVG(x, cls, color) {
  const cs = CS(), [x0, y0] = cellXY(x.r0, x.c0), w = (x.c1 - x.c0 + 1) * cs, h = (x.r1 - x.r0 + 1) * cs;
  return `<rect class="${cls}" x="${x0 + 2}" y="${y0 + 2}" width="${w - 4}" height="${h - 4}" rx="6" stroke="${color}" fill="${color}"/>`;
}

function renderPanel() {
  const v = viewer(), o = owner();
  const { edit } = shown();
  // palette: probe tool + region pencils + eraser
  const pal = $('#palette');
  let ph = '';
  if (st.phase === 'play' && o !== v) ph += `<button class="lap-tool probe${tool === 'probe' ? ' on' : ''}" data-tool="probe">${probeIcon()}<span>${t('lap.tool.probe')}</span></button>`;
  const counts = Array(st.K).fill(0);
  if (edit) for (const x of edit) if (x >= 0) counts[x]++;
  for (let L = 0; L < st.K; L++) {
    const full = counts[L] === st.S, over = counts[L] > st.S;
    ph += `<button class="lap-tool reg${tool === L ? ' on' : ''}" data-tool="${L}" style="--c:${REG[L].fill};--k:${REG[L].ink}"><b>${REG[L].name}</b><span class="${over ? 'over' : full ? 'full' : ''}">${counts[L]}/${st.S}</span></button>`;
  }
  ph += `<button class="lap-tool erase${tool === 'erase' ? ' on' : ''}" data-tool="erase">${eraseIcon()}<span>${t('lap.tool.erase')}</span></button>`;
  pal.innerHTML = ph;
  pal.classList.toggle('off', !edit);

  // action buttons
  const act = $('#actions');
  let ah = '';
  const btn = (id, label, cls = '', dis = false) => `<button class="btn ${cls}" data-act="${id}"${dis ? ' disabled' : ''}>${label}</button>`;
  if (st.phase === 'setup') {
    const mine = st.boards[v];
    const ok = edit && validDraft(edit) === 'ok';
    ah += btn('random', t('lap.act.random'), '', !edit);
    ah += btn('clear', t('lap.act.clear'), '', !edit);
    ah += btn('ready', t('lap.act.ready'), 'primary', !ok || !!mine || (online() && !sess.connected));
  } else if (st.phase === 'play') {
    if (handover != null) ah += btn('pass', t('lap.act.pass'), 'primary');
    else if (o !== v) {
      const okSel = sel && LAP.rectOk(st, sel);
      ah += btn('ask', okSel ? t('lap.act.ask', { rect: LAP.rectName(sel) }) : t('lap.act.ask0'), 'primary', !myTurn() || !okSel);
      ah += btn('guess', armGuess ? t('lap.act.sure') : t('lap.act.guess'), armGuess ? 'warn' : '', !myTurn() || !guessable(notes[v]));
    }
    if (!hotSeat()) {
      const lbl = showMine ? t('lap.act.theirs') : t('lap.act.mine');
      ah += `<button class="btn mine${showMine ? ' on' : ''}" data-act="mine" title="${lbl}" aria-label="${lbl}" style="color:${COLORS[showMine ? 1 - v : v].main}">${mapIcon()}</button>`;
    }
  } else {
    for (const p of [0, 1]) if (Array.isArray(st.boards[p])) ah += `<button class="btn mapbtn${o === p ? ' on' : ''}" data-act="show${p}" style="color:${COLORS[p].main}">${mapIcon()}${name(p)}</button>`;
    if (canRestart()) ah += btn('again', t('lap.again'), 'primary');
  }
  act.innerHTML = ah;

  // answers log for the shown map
  const log = $('#log');
  const probes = st.phase === 'setup' ? [] : st.probes[1 - o] || [];
  const cur = hl >= 0 && hl < probes.length ? hl : probes.length - 1;
  log.innerHTML = probes.length
    ? probes.map((x, i) => [i, x]).reverse()
      .map(([i, x]) => `<button class="lap-chip${i === cur && !sel ? ' on' : ''}" data-i="${i}"><span class="nm">${LAP.rectName(x)}</span>${ansHTML(x.counts)}</button>`).join('')
    : `<span class="lap-empty hand">${st.phase === 'setup' ? '' : t('lap.log.empty')}</span>`;
  log.scrollLeft = 0;
}

const probeIcon = () => '<svg viewBox="0 0 24 24" class="ti"><path d="M4 6.5h16v11H4z" stroke-dasharray="3 2.6"/><circle cx="17" cy="16" r="3.4" fill="#fff"/><path d="m19.4 18.4 2.4 2.4"/></svg>';
const mapIcon = () => '<svg viewBox="0 0 24 24" class="ti"><path d="M3.5 4.5h17v15h-17zM3.5 11h8V4.5M11.5 11v8.5M11.5 14h9"/></svg>';
const eraseIcon = () => '<svg viewBox="0 0 24 24" class="ti"><path d="M8.5 19.5 3.8 14.8l9.4-9.4 6.3 6.3-8 7.8zM8.5 19.5H20"/><path d="m8.6 10 6.2 6.2"/></svg>';

function validDraft(g, amb = st.classic) {
  const c = LAP.check(g, st.N, st.K);
  if (c.empty) return 'empty';
  if (c.counts.some((x) => x !== st.S)) return 'count';
  if (c.broken.length) return 'broken:' + c.broken[0];
  if (amb && LAP.ambiguous(g, st.N, st.K)) return 'amb';
  return 'ok';
}
// A guess has to be a legal map: anything else can't match and would just lose.
const guessable = (g) => validDraft(g, false) === 'ok';

function statusLine() {
  const v = viewer();
  if (online() && !sess.connected) return [t('lap.online.wait'), PALETTE.ink];
  if (st.phase === 'setup') {
    if (covered()) return [t('lap.st.cover', { name: name(setupPlayer()) }), COLORS[setupPlayer()].main];
    if (st.boards[v]) return [t('lap.st.waitsetup', { name: name(1 - v) }), COLORS[1 - v].main];
    const d = validDraft(drafts[v]);
    const msg = d === 'ok' ? t('lap.st.setup.ok')
      : d === 'count' ? t('lap.st.setup.count', { s: st.S })
      : d === 'amb' ? t('lap.st.setup.amb')
      : d.startsWith('broken') ? t('lap.st.setup.bad', { reg: REG[+d.split(':')[1]].name })
      : t('lap.st.setup', { name: name(v), k: st.K, s: st.S });
    return [msg, COLORS[v].main];
  }
  if (st.phase === 'over') return ['', PALETTE.ink];
  if (handover != null) {
    return [t('lap.st.pass', { name: name(st.turn) }), COLORS[handover].main];
  }
  if (showMine) return [t('lap.st.mine'), COLORS[v].main];
  const p = st.turn;
  if (isAI(p)) return [t('lap.st.thinking', { name: name(p) }), COLORS[p].main];
  if (isRemote(p)) return [t('lap.st.them', { name: name(p) }), COLORS[p].main];
  if (tool === 'probe') {
    if (sel && LAP.rectOk(st, sel)) return [t('lap.st.sel', { rect: LAP.rectName(sel) }), COLORS[p].main];
    if (sel) return [t(st.classic ? 'lap.st.classic' : 'lap.st.small'), COLORS[p].main];
    if (anchor) return [t('lap.st.corner'), COLORS[p].main];
  }
  if (notes[p].every((x) => x >= 0) && !guessable(notes[p])) return [t('lap.st.notmap', { s: st.S }), COLORS[p].main];
  // otherwise show the most recent answer the player got, if any
  const last = st.probes[1 - p].at(-1);
  if (last && !online() && cfg.mode !== 'pvp' && isAI(1 - p))
    return [t('lap.st.asked', { name: name(1 - p), rect: LAP.rectName(last) }) + ' ' + ansHTML(last.counts), COLORS[1 - p].main];
  return [online() ? t('lap.st.turn.you') : t('lap.st.turn', { name: name(p) }), COLORS[p].main];
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = st.phase === 'play' ? st.turn === p : st.phase === 'setup' ? !st.boards[p] : false;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = st.phase === 'over' || m.pose !== 'down' ? m.pose : active && st.phase === 'play' ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29 });
    el.querySelector('.score').textContent = plural(st.probes[p].length, 'lap.probes');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const [txt, col] = statusLine();
  const status = $('#status');
  status.innerHTML = txt;
  status.style.color = col;

  $('#undo').disabled = online() || !history.some((h) => !isAI(h.st.turn)) || st.phase !== 'play' || isAI(st.turn);
  $('#mode').disabled = online();
  $('#variant').disabled = !canRestart();
  $('#probe-rule').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('lap.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('lap.online.note') : '';
}

function renderCover() {
  const c = covered();
  $('#cover').hidden = !c;
  if (!c) return;
  const p = setupPlayer();
  $('#cover-text').textContent = t('lap.cover.title', { name: name(p) });
  $('#cover-text').style.color = COLORS[p].main;
  $('#uncover').textContent = t('lap.cover.btn', { name: name(p) });
  $('#uncover').style.background = COLORS[p].main;
  $('#uncover').style.borderColor = COLORS[p].dark;
  $('#cover-fig').innerHTML = figureSVG({ color: COLORS[p], mood: 'smug', pose: 'wave', face: 'right', seed: 17 + p * 29 });
}

const bubbleTimers = [];
function say(p, key) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 2000);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- reactions ----------
function reactProbe(p, counts) {
  const other = 1 - p;
  const kinds = counts.filter(Boolean).length, area = counts.reduce((a, b) => a + b, 0);
  if (kinds === 1) { setMood(p, 'happy', 'wave'); setMood(other, 'worried'); say(p, 'say.clean'); }
  else if (kinds >= 3 && area <= 6) { setMood(p, 'worried'); setMood(other, 'smug'); say(Math.random() < 0.5 ? p : other, Math.random() < 0.5 ? 'say.mess' : 'say.tease'); }
  else {
    setMood(p, 'neutral'); setMood(other, 'neutral');
    if (isAI(p) && st.probes[p].length >= 4 && Math.random() < 0.35) { setMood(p, 'smug'); say(p, 'say.close'); }
    else if (Math.random() < 0.3) say(Math.random() < 0.5 ? p : other, Math.random() < 0.5 ? 'say.probe' : 'say.tease');
  }
}
function react(prev, cur) {
  if (!prev || prev.gid !== cur.gid) return;
  for (const p of [0, 1]) if (!prev.boards[p] && cur.boards[p] && cur.phase === 'setup') { say(p, 'say.ready'); setMood(p, 'smug'); }
  for (const p of [0, 1]) if (cur.probes[p].length > prev.probes[p].length) reactProbe(p, cur.probes[p].at(-1).counts);
  if (cur.phase === 'over' && prev.phase !== 'over') finishMoods();
}
function finishMoods() {
  const w = st.winner, g = st.guess;
  setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
  if (g && !g.correct) { setMood(g.p, 'worried'); say(w, 'say.miss'); setTimeout(() => say(g.p, 'say.wrong'), 900); }
  else { say(w, 'say.win'); setTimeout(() => say(1 - w, 'say.lose'), 900); }
}

// ---------- flow ----------
function newGame(first = nextFirst) {
  clearTimeout(aiTimer);
  st = LAP.create({ variant: cfg.variant, classic: cfg.rule === 'classic', first });
  st.gid = Math.random().toString(36).slice(2, 9);
  nextFirst = 1 - first;
  if (!online() && cfg.mode !== 'pvp') LAP.setBoard(st, 1, LAP.makeBoard(st, cfg.mode));
  resetLocal();
  render();
  if (hotSeat()) say(1, 'say.peek');
}
function resetLocal() {
  drafts = [empty(), empty()]; notes = [empty(), empty()];
  history = []; shapes = {}; tool = st.phase === 'play' ? 'probe' : 0; sel = null; anchor = null; hl = -1;
  handover = null; uncovered = null; showMine = false; overOwner = null; armGuess = 0;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
}

function afterChange(prev) {
  react(prev, st);
  if (online() && sess.host) sendState();
  if (prev.phase === 'setup' && st.phase === 'play') { tool = 'probe'; showMine = false; }
  sel = null; anchor = null; hl = -1; armGuess = 0;
  if (st.phase === 'over') return finish();
  render();
  maybeAI();
}

function doSetup(p, grid) {
  const prev = LAP.clone(st);
  if (!LAP.setBoard(st, p, grid)) return false;
  if (hotSeat()) uncovered = null;
  afterChange(prev);
  return true;
}
function doProbe(rect) {
  const prev = LAP.clone(st);
  if (!online()) history.push({ st: prev, handover });
  if (!LAP.probe(st, rect)) { history.pop(); return false; }
  if (hotSeat()) handover = prev.turn;
  afterChange(prev);
  return true;
}
function doGuess(grid) {
  const prev = LAP.clone(st);
  if (LAP.guess(st, grid) == null) return false;
  afterChange(prev);
  return true;
}

function maybeAI() {
  if (st.phase !== 'play' || !isAI(st.turn)) return;
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => {
    if (st.phase !== 'play' || !isAI(st.turn)) return;
    const m = LAP.aiMove(st, cfg.mode);
    if (m.type === 'guess') doGuess(m.grid);
    else doProbe(m.rect);
  }, 750);
}

function finish() {
  overOwner = st.guess ? 1 - st.guess.p : 0;
  render();
  const w = st.winner, txt = $('#result-text');
  txt.textContent = t(st.guess.correct ? 'lap.win.right' : 'lap.win.wrong', { name: name(w) });
  txt.style.color = COLORS[w].main;
  $('#result-next').textContent = t('lap.next', { name: name(nextFirst) });
  setTimeout(() => { if (st.phase === 'over') $('#result').hidden = false; }, 1000);
}

function undo() {
  if (online() || !history.some((h) => !isAI(h.st.turn))) return;
  clearTimeout(aiTimer);
  let h;
  do h = history.pop(); while (history.length && isAI(h.st.turn));
  st = h.st; handover = h.handover;
  sel = null; anchor = null; hl = -1; armGuess = 0;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- local actions (routed to the host when we're the online guest) ----------
function act(kind, data) {
  if (online() && !sess.host) { sess.send('act', { kind, data, n: st.moves }); return; }
  if (kind === 'setup') doSetup(viewer(), data);
  if (kind === 'probe') doProbe(data);
  if (kind === 'guess') doGuess(data);
}

// ---------- online ----------
// Host is authoritative and keeps both secret maps; the guest only ever receives its own map
// (the host's map arrives once the game is over). Guest actions carry the move counter.
// An online player's pencil notes survive a page reload (same game id, same tab).
const NOTES_KEY = 'mg-lap-notes';
function keepNotes() {
  if (online() && st.phase === 'play') sessionStorage.setItem(NOTES_KEY, JSON.stringify({ gid: st.gid, notes: notes[mySeat()] }));
}
function restoreNotes() {
  const k = JSON.parse(sessionStorage.getItem(NOTES_KEY) || 'null');
  if (k && k.gid === st.gid && k.notes.length === st.N * st.N) notes[mySeat()] = k.notes;
}
function sendState() {
  if (!sess || !sess.host) return;
  sess.send('state', { st: LAP.viewFor(st, 1), names: cfg.names, next: nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prev = st, fresh = !prev || prev.gid !== d.st.gid;
    st = d.st;
    remoteNames[0] = d.names[0];
    cfg.variant = st.variant; cfg.rule = st.classic ? 'classic' : 'any';
    $('#variant').value = cfg.variant; $('#probe-rule').value = cfg.rule;
    if (fresh) { resetLocal(); restoreNotes(); } else react(prev, st);
    if (prev && prev.phase === 'setup' && st.phase === 'play') tool = 'probe';
    sel = null; anchor = null; armGuess = 0;
    if (!fresh) hl = -1;
    if (st.phase === 'over' && (fresh || prev.phase !== 'over')) {
      overOwner = st.guess ? 1 - st.guess.p : 0;
      if (fresh) finishMoods();
      render();
      const w = st.winner, txt = $('#result-text');
      txt.textContent = t(st.guess.correct ? 'lap.win.right' : 'lap.win.wrong', { name: name(w) });
      txt.style.color = COLORS[w].main;
      $('#result-next').textContent = t('lap.next', { name: name(d.next) });
      setTimeout(() => { if (st.phase === 'over') $('#result').hidden = false; }, 1000);
      return;
    }
    render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('act', (d) => {
    if (!s.host) return;
    const p = 1;
    // the two maps are drawn independently, so a map may arrive after the host's own "ready"
    let ok = d.kind === 'setup' || d.n === st.moves;
    if (ok && d.kind === 'setup') ok = st.phase === 'setup' && !st.boards[p] && doSetup(p, d.data);
    else if (ok && d.kind === 'probe') ok = st.phase === 'play' && st.turn === p && doProbe(d.data);
    else if (ok && d.kind === 'guess') ok = st.phase === 'play' && st.turn === p && doGuess(d.data);
    if (!ok) sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame(0);
  else { resetLocal(); render(); }
}

// ---------- input ----------
let drag = null; // {kind:'sel'|'paint', value}
svg.addEventListener('pointerdown', (evt) => {
  if (covered() || st.phase === 'over') return;
  const cell = cellAt(evt);
  if (!cell) return;
  const { edit } = shown();
  if (canProbe()) {
    if (anchor && !sel) sel = LAP.normRect({ r0: anchor.r, c0: anchor.c, r1: cell.r, c1: cell.c });
    else { anchor = cell; sel = null; }
    drag = { kind: 'sel', start: cell, moved: false };
  } else if (edit && tool !== 'probe') {
    const i = cell.r * st.N + cell.c;
    const value = tool === 'erase' ? -1 : edit[i] === tool ? -1 : tool;
    edit[i] = value;
    drag = { kind: 'paint', value };
  } else return;
  armGuess = 0;
  svg.setPointerCapture?.(evt.pointerId);
  evt.preventDefault();
  render();
});
svg.addEventListener('pointermove', (evt) => {
  if (!drag) return;
  const cell = cellAt(evt, drag.kind === 'sel');
  if (!cell) return;
  if (drag.kind === 'sel') {
    if (!drag.moved && cell.r === drag.start.r && cell.c === drag.start.c) return;
    drag.moved = true;
    sel = LAP.normRect({ r0: drag.start.r, c0: drag.start.c, r1: cell.r, c1: cell.c });
    anchor = null;
    render();
  } else {
    const { edit } = shown();
    const i = cell.r * st.N + cell.c;
    if (edit && edit[i] !== drag.value) { edit[i] = drag.value; render(); }
  }
});
const endDrag = () => {
  if (drag?.kind === 'paint') keepNotes();
  if (drag?.kind === 'sel' && sel && sel.r0 === sel.r1 && sel.c0 === sel.c1) { anchor = { r: sel.r0, c: sel.c0 }; sel = null; render(); }
  if (drag?.kind === 'sel' && sel) anchor = null;
  drag = null;
};
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);

$('#palette').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (!b) return;
  const v = b.dataset.tool;
  tool = v === 'probe' || v === 'erase' ? v : +v;
  if (tool !== 'probe') { sel = null; anchor = null; }
  render();
});
$('#log').addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]');
  if (!b) return;
  hl = +b.dataset.i; sel = null; anchor = null;
  render();
});
$('#actions').addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (!a) return;
  const v = viewer();
  if (a === 'random') { drafts[v] = LAP.makeBoard(st, 'normal'); render(); }
  if (a === 'clear') { drafts[v] = empty(); render(); }
  if (a === 'ready' && validDraft(drafts[v]) === 'ok') act('setup', drafts[v].slice());
  if (a === 'ask' && myTurn() && sel && LAP.rectOk(st, sel)) act('probe', { ...sel });
  if (a === 'guess' && myTurn() && guessable(notes[v])) {
    if (!armGuess) { armGuess = Date.now(); render(); setTimeout(() => { if (armGuess && Date.now() - armGuess >= 2900) { armGuess = 0; render(); } }, 3000); }
    else { armGuess = 0; act('guess', notes[v].slice()); }
  }
  if (a === 'pass') { handover = null; sel = null; anchor = null; hl = -1; tool = 'probe'; render(); }
  if (a === 'mine') { showMine = !showMine; sel = null; anchor = null; hl = -1; render(); }
  if (a === 'show0' || a === 'show1') { overOwner = +a.slice(4); hl = -1; render(); }
  if (a === 'again') restart();
});
$('#uncover').addEventListener('click', () => { uncovered = setupPlayer(); tool = 0; render(); });
$('#look').addEventListener('click', () => { $('#result').hidden = true; });
$('#variant').addEventListener('change', (e) => { cfg.variant = e.target.value; saveCfg(); restart(); });
$('#probe-rule').addEventListener('change', (e) => { cfg.rule = e.target.value; saveCfg(); restart(); });
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
    render();
  }));
document.addEventListener('mg:lang', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#variant').value = cfg.variant;
$('#probe-rule').value = cfg.rule;
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(0); },
});
if (!online()) showOnce('how', SLUG);
