import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, curve, withSeed, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { CS } from './engine.js';
import './strings.js';

const SLUG = 'chopsticks';
const COLORS = [
  PALETTE.blue,
  PALETTE.red,
  { main: '#3aa655', dark: '#1f7536', fill: '#a3dcae' },
  { main: '#8d5cc9', dark: '#5f3593', fill: '#cdb4ec' },
];
const GREY = { main: '#bdbdbd', dark: '#9a9a9a', fill: '#ececec' };
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign(
  { mode: 'pvp', players: 2, rule: 'wrap', start: 1, names: ['', '', '', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'),
);
while (cfg.names.length < 4) cfg.names.push('');
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, over, aiTimer, animTimer, busy = false, sel = -1, preview = null, nextFirst = 0, fx = null;
let sess = null;                          // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canMove = () => !over && !busy && isLocal(st.turn) && (!online() || sess.connected);
const playersWanted = () => (online() || cfg.mode !== 'pvp' ? 2 : +cfg.players);
const rulesWanted = () => ({ players: playersWanted(), cutoff: cfg.rule === 'cutoff', start: +cfg.start });
function name(p) {
  if (isAI(p)) return t('cs.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('cs.p' + p);
}

// ---------- geometry ----------
// Each hand is drawn in its own frame: palm bottom at (0,0), fingers pointing up (−y), thumb on the −x side.
const W = 360;
function layout() {
  const n = st.n, slots = [];
  if (n === 2) {
    const bottom = online() ? mySeat() : 0, top = 1 - bottom;
    const s = 1.12;
    // bottom player: fingers up; top player faces us (rotated), so their left hand is on our right
    slots[bottom] = { box: [6, 202, 348, 182], hands: [{ x: 95, y: 352, rot: 0, s }, { x: 265, y: 352, rot: 0, s }] };
    slots[top] = { box: [6, 6, 348, 182], hands: [{ x: 265, y: 36, rot: 180, s }, { x: 95, y: 36, rot: 180, s }] };
    return { H: 390, slots };
  }
  const s = 0.84, sw = 172, sh = 138;
  const seatXY = n === 3 ? [[4, 4], [184, 4], [94, 150]] : [[4, 4], [184, 4], [4, 150], [184, 150]];
  for (let p = 0; p < n; p++) {
    const [bx, by] = seatXY[p], cx = bx + sw / 2, y = by + 108;
    slots[p] = { box: [bx, by, sw, sh], hands: [{ x: cx - 44, y, rot: 0, s }, { x: cx + 44, y, rot: 0, s }] };
  }
  return { H: 292, slots };
}
// point in a hand's frame → board coordinates
function toBoard(hp, lx, ly) {
  const m = mirror(hp), r = (hp.rot * Math.PI) / 180;
  const x = lx * m * hp.s, y = ly * hp.s;
  return [hp.x + x * Math.cos(r) - y * Math.sin(r), hp.y + x * Math.sin(r) + y * Math.cos(r)];
}
// thumbs point toward the middle of the seat
function mirror(hp) {
  const minusXGoesLeft = hp.rot === 0;
  const centerIsLeft = hp.x > (hp.seatCx ?? W / 2);
  return minusXGoesLeft === centerIsLeft ? 1 : -1;
}

// ---------- drawing a hand ----------
const FX = [-20, -6.5, 7, 20.5];          // index … pinky
const FLEN = [44, 50, 46, 35];
const shapeCache = {};
function handArt(count, color, seed) {
  const k = `${count}|${color.main}|${seed}`;
  if (shapeCache[k]) return shapeCache[k];
  const art = withSeed(seed, () => {
    const j = () => (Math.random() * 2 - 1) * 1.2;
    const palmPts = [[-29, -50], [-10, -53], [10, -53], [29, -50], [31, -26], [28, -5], [0, -1], [-28, -5], [-31, -26]]
      .map(([x, y]) => [x + j(), y + j()]);
    const palm = curve([...palmPts, palmPts[0], palmPts[1]]);
    const fingers = FX.map((x, i) => {
      const up = i < count, lean = (i - 1.5) * (up ? 3.2 : 0.6);
      const L = up ? FLEN[i] : 7;
      return { up, d: line(x, -44, x + lean, -50 - L, up ? 1.6 : 0.3), tip: [x + lean, -50 - L] };
    });
    const thumb = line(-27, -14, -37, -27, 0.5);
    const sleeve = `M-23 -4 L-24 20 Q0 23 24 19 L23 -4 Q0 0 -23 -4 Z`;
    let s = '';
    const fingerPaths = (w, c) => fingers.map((f) => `<path d="${f.d}" stroke="${c}" stroke-width="${w}"/>`).join('') +
      `<path d="${thumb}" stroke="${c}" stroke-width="${w - 1}"/>`;
    s += `<g fill="none" stroke-linecap="round">${fingerPaths(19.5, color.dark)}</g>`;
    s += `<path d="${palm}" fill="${color.dark}" stroke="${color.dark}" stroke-width="5.5" stroke-linejoin="round"/>`;
    s += `<g fill="none" stroke-linecap="round">${fingerPaths(13.5, '#fff')}</g><path d="${palm}" fill="#fff"/>`;
    s += `<g filter="url(#mg-crayon)"><g fill="none" stroke-linecap="round">${fingerPaths(13.5, color.fill)}</g><path d="${palm}" fill="${color.fill}"/></g>`;
    // nails on raised fingers, knuckle creases on folded ones
    for (const f of fingers) {
      const [x, y] = f.tip;
      s += f.up
        ? `<path d="M${(x - 3.4).toFixed(1)} ${(y + 4.5).toFixed(1)} Q${x.toFixed(1)} ${(y + 7.5).toFixed(1)} ${(x + 3.4).toFixed(1)} ${(y + 4.5).toFixed(1)}" stroke="${color.dark}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
        : `<path d="${line(x - 4.5, -45, x + 4.5, -45, 0.4)}" stroke="${color.dark}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    }
    s += `<path d="${sleeve}" fill="${color.main}" stroke="${color.dark}" stroke-width="3" stroke-linejoin="round"/>`;
    return s;
  });
  return (shapeCache[k] = art);
}

// Wobbly seat frame, cached per box.
const frameCache = {};
function frame([x, y, w, h], seed) {
  const k = [x, y, w, h].join(',');
  return (frameCache[k] ??= withSeed(seed, () => {
    const r = 18;
    return [
      line(x + r, y, x + w - r, y, 1.6), line(x + w, y + r, x + w, y + h - r, 1.6),
      line(x + w - r, y + h, x + r, y + h, 1.6), line(x, y + h - r, x, y + r, 1.6),
      `M${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r}`, `M${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h}`,
      `M${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r}`, `M${x} ${y + r} Q${x} ${y} ${x + r} ${y}`,
    ].join(' ');
  }));
}

// ---------- rendering ----------
let geo;
function render() {
  geo = layout();
  svg.setAttribute('viewBox', `0 0 ${W} ${geo.H}`);
  svg.classList.toggle('n2', st.n === 2);
  const active = !over ? st.turn : -1;
  const targets = sel >= 0 && canMove() ? targetsFor(sel) : [];
  let out = '';

  if (st.n === 2) out += `<path class="divider" d="${frameCache.div ??= withSeed(5, () => line(30, 195, 330, 195, 2))}"/>`;
  for (let p = 0; p < st.n; p++) {
    const slot = geo.slots[p];
    const [bx, by, bw, bh] = slot.box;
    slot.hands.forEach((hp) => (hp.seatCx = bx + bw / 2));
    const dead = !CS.alive(st, p);
    out += `<path class="seat${p === active ? ' on' : ''}${dead ? ' dead' : ''}" d="${frame(slot.box, 3 + p)}" stroke="${COLORS[p].main}"/>`;
    for (let h = 0; h < 2; h++) {
      const hp = slot.hands[h];
      let v = st.hands[p][h];
      if (preview && p === st.turn) v = preview[h];
      const color = v ? COLORS[p] : GREY;
      const isSel = p === st.turn && h === sel && canMove();
      const pickable = canMove() && p === st.turn && v > 0 && !preview;
      const tgt = targets.find((x) => x.p === p && x.to === h);
      const cls = ['hand', isSel && 'sel', pickable && 'pick', tgt && 'target', !v && 'fist', preview && p === st.turn && 'ghost',
        fx && fx.p === p && fx.h === h && 'pop'].filter(Boolean).join(' ');
      const tr = `translate(${hp.x} ${hp.y}) rotate(${hp.rot}) scale(${(mirror(hp) * hp.s).toFixed(3)} ${hp.s})`;
      out += `<g class="${cls}" data-p="${p}" data-h="${h}" data-v="${st.hands[p][h]}"><g transform="${tr}"><g class="lift">`;
      if (tgt) out += `<ellipse class="ring" cx="0" cy="-42" rx="50" ry="72" stroke="${COLORS[st.turn].main}"/>`;
      if (isSel) out += `<ellipse class="ring self" cx="0" cy="-42" rx="50" ry="72" stroke="${COLORS[p].main}"/>`;
      out += handArt(v, color, 100 + p * 10 + h);
      out += `<rect class="hit" x="-46" y="-110" width="92" height="136"/>`;
      out += `</g></g>`;
      const [nx, ny] = toBoard(hp, 0, -25);
      out += `<text class="num" x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" font-size="${(34 * hp.s).toFixed(1)}" fill="${color.dark}">${v}</text>`;
      if (tgt) {
        const [bx2, by2] = toBoard(hp, 0, -118);
        const txt = tgt.after ? `→ ${tgt.after}` : t('cs.out');
        out += `<text class="badge" x="${bx2.toFixed(1)}" y="${by2.toFixed(1)}" fill="${COLORS[st.turn].dark}">${txt}</text>`;
      }
      out += `</g>`;
    }
  }
  if (fx?.text) {
    const hp = geo.slots[fx.p].hands[fx.h];
    const [fx0, fy0] = toBoard(hp, 0, -118);
    out += `<text class="float" x="${fx0.toFixed(1)}" y="${fy0.toFixed(1)}" fill="${fx.color}">${fx.text}</text>`;
  }
  svg.innerHTML = out;
  renderPlayers();
  renderSplits();
}

function targetsFor(h) {
  const me = st.turn, a = st.hands[me][h], out = [];
  if (!a) return out;
  for (let p = 0; p < st.n; p++) {
    if (p === me || !CS.alive(st, p)) continue;
    for (let to = 0; to < 2; to++) {
      const b = st.hands[p][to];
      if (b) out.push({ p, to, after: CS.tapValue(a, b, st.rules.cutoff) });
    }
  }
  return out;
}

function renderSplits() {
  const box = $('#splits');
  const show = canMove() && CS.splitsOf(st.hands[st.turn]).length > 0;
  box.hidden = !show;
  if (!show) { box.innerHTML = ''; box.dataset.html = ''; return; }
  const c = COLORS[st.turn];
  box.style.setProperty('--c', c.main);
  const html = `<span class="lbl">${t('cs.split')}</span>` + CS.splitsOf(st.hands[st.turn])
    .map(([l, r]) => `<button class="chip" data-l="${l}" data-r="${r}">${l}<i>|</i>${r}</button>`).join('');
  // rebuilding the buttons under a pressed mouse (hover preview) would swallow the click
  if (box.dataset.html !== html) { box.innerHTML = html; box.dataset.html = html; }
}

function renderPlayers() {
  for (let p = 0; p < 4; p++) {
    const el = $(`.player.p${p}`);
    el.hidden = p >= st.n;
    if (p >= st.n) continue;
    const dead = !CS.alive(st, p);
    el.classList.toggle('active', !over && st.turn === p);
    el.classList.toggle('out', dead && !over);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : !over && st.turn === p ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p % 2 ? 'left' : 'right', seed: 11 + p * 31 });
    const liveHands = st.hands[p].filter((x) => x > 0).length;
    el.querySelector('.score').textContent = dead ? t('cs.outplayer') : plural(liveHands, 'cs.hands');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  document.querySelector('.arena').dataset.n = st.n;

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('cs.online.wait');
  else if (online()) status.textContent = isLocal(st.turn) ? t('cs.turn.you') : t('cs.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('cs.thinking', { name: name(st.turn) });
  else status.textContent = t(sel >= 0 ? 'cs.turn.target' : 'cs.turn.pick', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || busy || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#players').disabled = online();
  $('#players-field').hidden = online() || cfg.mode !== 'pvp';
  for (const id of ['#rule', '#start', '#new']) $(id).disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('cs.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('cs.online.note') : cfg.mode !== 'pvp' ? t('cs.ai.note') : '';
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
const calmAll = () => { for (let p = 0; p < 4; p++) setMood(p, 'neutral'); };

// ---------- flow ----------
function newGame(rules = rulesWanted(), first) {
  clearTimeout(aiTimer); clearTimeout(animTimer); busy = false;
  if (first === undefined) { first = nextFirst % rules.players; nextFirst = (first + 1) % rules.players; }
  st = CS.create({ ...rules, first });
  history = []; over = false; sel = -1; preview = null; fx = null;
  calmAll();
  $('#result').hidden = true;
  autoSelect();
  render();
  maybeAI();
}

// A player with a single live hand doesn't need to pick it.
function autoSelect() {
  sel = -1;
  if (over || !isLocal(st.turn)) return;
  const live = [0, 1].filter((h) => st.hands[st.turn][h] > 0);
  if (live.length === 1) sel = live[0];
}

function play(m, animate = true) {
  if (busy) return;
  if (m.t === 'tap' && animate) {
    busy = true;
    const from = geo.slots[st.turn].hands[m.h], to = geo.slots[m.p].hands[m.to];
    const g = svg.querySelector(`.hand[data-p="${st.turn}"][data-h="${m.h}"]`);
    if (g) {
      const [ax, ay] = toBoard(from, 0, -60), [bx, by] = toBoard(to, 0, -40);
      g.classList.add('lunge');
      g.style.transform = `translate(${((bx - ax) * 0.42).toFixed(1)}px, ${((by - ay) * 0.42).toFixed(1)}px)`;
    }
    animTimer = setTimeout(() => { busy = false; commit(m); }, 240);
    return;
  }
  commit(m);
}

function commit(m) {
  const prev = CS.clone(st);
  history.push(prev);
  const who = st.turn;
  // exact judgement (two players): did this move throw away a safe position?
  let blunder = false;
  if (st.n === 2) {
    const before = CS.evaluate(prev), after = CS.moveValue(prev, m);
    blunder = before && before.v >= 0 && after.v === -1;
  }
  const info = CS.apply(st, m);
  sel = -1; preview = null;
  if (m.t === 'tap') {
    const v = m.p;
    fx = { p: v, h: m.to, text: info.knocked ? t('cs.out') : `+${info.add}`, color: info.knocked ? COLORS[who].dark : COLORS[who].main };
    if (info.knocked) {
      setMood(who, 'happy', 'wave');
      setMood(v, info.eliminated === v ? 'sad' : 'worried');
      if (info.eliminated !== v) { if (Math.random() < 0.7) say(who, 'cs.say.knock'); if (Math.random() < 0.5) say(v, 'cs.say.ouch'); }
      else if (!CS.isOver(st)) say(v, 'cs.say.elim');
    } else {
      setMood(who, 'neutral');
      if (moods[v].mood !== 'smug') setMood(v, 'neutral');
    }
  } else {
    fx = null;
    if (info.revived) { setMood(who, 'happy', 'up'); say(who, 'cs.say.revive'); }
    else { setMood(who, 'neutral'); if (Math.random() < 0.25) say(who, 'cs.say.split'); }
  }
  if (blunder && !CS.isOver(st)) {
    const o = 1 - who;
    setMood(o, 'smug');
    if (!isLocal(o) || Math.random() < 0.6) say(o, 'cs.say.blunder');
    if (moods[who].mood === 'neutral') setMood(who, 'worried');
  }
  if (!CS.isOver(st) && st.rep === 2 && Math.random() < 0.6) say(st.turn, 'cs.say.repeat');
  if (CS.isOver(st)) return finish();
  autoSelect();
  render();
  // forget the "+n" float once it has played, so later redraws (e.g. picking a hand) don't replay it
  const shown = fx;
  setTimeout(() => { if (fx === shown) fx = null; }, 700);
  maybeAI();
}

function maybeAI() {
  if (over || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const m = CS.aiMove(st, cfg.mode);
    // point at the chosen hand for a moment before tapping
    if (m.t === 'tap') {
      const g = svg.querySelector(`.hand[data-p="${st.turn}"][data-h="${m.h}"]`);
      g?.classList.add('sel');
      aiTimer = setTimeout(() => play(m), 350);
    } else play(m);
  }, 600);
}

function finish() {
  over = true; sel = -1;
  const w = st.winner;
  if (w < 0) {
    for (let p = 0; p < st.n; p++) setMood(p, 'worried');
    say(0, 'cs.say.draw');
  } else {
    for (let p = 0; p < st.n; p++) if (p !== w) setMood(p, 'sad');
    setMood(w, 'happy', 'up');
    say(w, 'cs.say.win');
    const loser = st.n === 2 ? 1 - w : st.last?.p;
    if (loser !== undefined && loser !== w) setTimeout(() => say(loser, 'cs.say.lose'), 900);
  }
  render();
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('cs.draw') : t('cs.win', { name: name(w) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  const nf = nextFirst % st.n;
  $('#result-sub').textContent = w < 0 ? t('cs.draw.sub') : online() ? '' : t('cs.next', { name: name(nf) });
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1000);
}

function undo() {
  if (!history.length || online() || busy) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && isAI(st.turn));
  over = false; fx = null; preview = null;
  calmAll();
  $('#result').hidden = true;
  autoSelect();
  render();
  maybeAI();
}

// Online, only the room creator may restart or change the rules; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sess.send('new', { rules: st.rules, first: st.turn, nextFirst });
}

// ---------- online ----------
function sendState() {
  sess.send('state', { st, over, names: cfg.names, nextFirst });
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer); clearTimeout(animTimer); busy = false;
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    clearTimeout(animTimer); busy = false;
    st = d.st; over = false; history = []; fx = null; preview = null; nextFirst = d.nextFirst;
    syncRuleInputs(st.rules);
    remoteNames[0] = d.names[0];
    calmAll();
    $('#result').hidden = true;
    autoSelect();
    d.over ? finish() : render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (busy || d.n !== st.moves || !CS.isLegal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('resync', () => s.host && sendState());
  s.on('new', (d) => {
    if (s.host) return;
    nextFirst = d.nextFirst;
    syncRuleInputs(d.rules);
    newGame({ players: 2, cutoff: d.rules.cutoff, start: d.rules.start }, d.first);
  });
  if (s.host) { nextFirst = 0; newGame(); }
  else render();
}
function syncRuleInputs(r) {
  $('#rule').value = r.cutoff ? 'cutoff' : 'wrap';
  $('#start').value = String(r.start);
}

function localMove(m) {
  if (online()) sess.send('move', { m, n: st.moves });
  play(m);
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const g = evt.target.closest('.hand');
  if (!g) { if (sel >= 0 && st.hands[st.turn].filter((x) => x).length > 1) { sel = -1; render(); } return; }
  const p = +g.dataset.p, h = +g.dataset.h;
  if (p === st.turn) {
    if (!st.hands[p][h]) return;
    const onlyOne = st.hands[p].filter((x) => x).length === 1;
    sel = sel === h && !onlyOne ? -1 : h;
    render();
    return;
  }
  if (sel < 0 || !st.hands[p][h] || !CS.alive(st, p)) return;
  localMove({ t: 'tap', h: sel, p, to: h });
});

const splitsBox = $('#splits');
splitsBox.addEventListener('click', (evt) => {
  const b = evt.target.closest('.chip');
  if (!b || !canMove()) return;
  localMove({ t: 'split', to: [+b.dataset.l, +b.dataset.r] });
});
// Mouse hover over a split button previews it on the board. Re-rendering is deferred so it never
// replaces the element under a pointer that is just being pressed (that would swallow the click).
let previewTimer;
function setPreview(pv) {
  if (String(pv) === String(preview)) return;
  preview = pv;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => { if (!busy && !over) render(); }, 0);
}
splitsBox.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse' || !canMove()) return;
  const b = evt.target.closest('.chip');
  setPreview(b ? [+b.dataset.l, +b.dataset.r] : null);
});
splitsBox.addEventListener('pointerleave', () => setPreview(null));

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); nextFirst = 0; newGame(); });
$('#players').addEventListener('change', (e) => { cfg.players = +e.target.value; saveCfg(); nextFirst = 0; newGame(); });
$('#rule').addEventListener('change', (e) => { cfg.rule = e.target.value; saveCfg(); restart(); });
$('#start').addEventListener('change', (e) => { cfg.start = +e.target.value; saveCfg(); restart(); });
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
document.addEventListener('mg:lang', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#players').value = String(cfg.players);
$('#rule').value = cfg.rule;
$('#start').value = String(cfg.start);
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; syncRuleInputs(rulesWanted()); nextFirst = 0; newGame(); },
});
if (!online()) showOnce('how', SLUG);
