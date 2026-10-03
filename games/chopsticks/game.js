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
  { main: 'var(--cs-green)', text: 'var(--cs-green-text)', fill: 'var(--cs-green-fill)', dark: 'var(--cs-green-face)' },
  { main: 'var(--cs-violet)', text: 'var(--cs-violet-text)', fill: 'var(--cs-violet-fill)', dark: 'var(--cs-violet-face)' },
];
const GREY = { main: 'var(--cs-grey)', text: 'var(--cs-grey-text)', fill: 'var(--cs-grey-fill)', dark: 'var(--cs-grey-text)' };
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
const remoteNames = ['', '', '', ''];
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));
// Online: who controls each seat (decided by the host, mirrored on guests).
//   'h' host · 'g' a guest's device · 'c' computer (free seat, 3+ players) · 'x' guest away, waiting ·
//   'w' two-player room: nobody joined yet.
// Chopsticks has no hidden information and every move is atomic, so a guest who joins mid-game takes
// over a computer seat right away (from that seat's next move). A guest who drops out keeps the seat for
// AWAY_MS; after that the computer plays it until they come back. Two-player rooms simply wait (as before).
let ctl = ['h', 'w', 'w', 'w'];
const AWAY_MS = 10000;
const goneAt = {};
let inbox = [];                           // moves that arrived during an animation
let pending = null;                       // the move being animated (not applied to st yet)

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => (sess.host ? 0 : myGame ?? sess.seat);
const multi = () => online() && st.n > 2;
const isAI = (p) => (online() ? ctl[p] === 'c' : cfg.mode !== 'pvp' && p === 1);
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const spectator = () => online() && mySeat() >= st.n;
const linkOk = () => !online() || sess.connected || (sess.host && st.n > 2);
const canMove = () => !over && !busy && isLocal(st.turn) && linkOk();
const playersWanted = () => (online() ? +cfg.players : cfg.mode !== 'pvp' ? 2 : +cfg.players);
const rulesWanted = () => ({ players: playersWanted(), cutoff: cfg.rule === 'cutoff', start: +cfg.start });
function name(p) {
  if (isAI(p)) return multi() ? t('cs.p' + p) : t('cs.cpu'); // online 3-4: "computer" goes in the card's tag line
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('cs.p' + p);
}

// ---------- geometry ----------
// Each hand is drawn in its own frame: palm bottom at (0,0), fingers pointing up (−y), thumb on the −x side.
const W = 360;
function layout() {
  const n = st.n, slots = [];
  if (n === 2) {
    const bottom = online() && mySeat() < 2 ? mySeat() : 0, top = 1 - bottom;
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
    // paper under the crayon: plain card in light, a chalk tint of the hand colour on the dark board
    const under = `color-mix(in srgb, ${color.fill} var(--cs-palm-mix), var(--card))`;
    const fingerPaths = (w, c) => fingers.map((f) => `<path d="${f.d}" stroke="${c}" stroke-width="${w}"/>`).join('') +
      `<path d="${thumb}" stroke="${c}" stroke-width="${w - 1}"/>`;
    s += `<g fill="none" stroke-linecap="round">${fingerPaths(19.5, color.text)}</g>`;
    s += `<path d="${palm}" fill="${color.text}" stroke="${color.text}" stroke-width="5.5" stroke-linejoin="round"/>`;
    s += `<g fill="none" stroke-linecap="round">${fingerPaths(13.5, under)}</g><path d="${palm}" fill="${under}"/>`;
    s += `<g filter="url(#mg-crayon)"><g fill="none" stroke-linecap="round">${fingerPaths(13.5, color.fill)}</g><path d="${palm}" fill="${color.fill}"/></g>`;
    // nails on raised fingers, knuckle creases on folded ones
    for (const f of fingers) {
      const [x, y] = f.tip;
      s += f.up
        ? `<path d="M${(x - 3.4).toFixed(1)} ${(y + 4.5).toFixed(1)} Q${x.toFixed(1)} ${(y + 7.5).toFixed(1)} ${(x + 3.4).toFixed(1)} ${(y + 4.5).toFixed(1)}" stroke="${color.text}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
        : `<path d="${line(x - 4.5, -45, x + 4.5, -45, 0.4)}" stroke="${color.text}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    }
    s += `<path d="${sleeve}" fill="${color.main}" stroke="${color.text}" stroke-width="3" stroke-linejoin="round"/>`;
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
  persist();
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
      out += `<text class="num" x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" font-size="${(34 * hp.s).toFixed(1)}" fill="${color.text}">${v}</text>`;
      if (tgt) {
        const [bx2, by2] = toBoard(hp, 0, -118);
        const txt = tgt.after ? `→ ${tgt.after}` : t('cs.out');
        out += `<text class="badge" x="${bx2.toFixed(1)}" y="${by2.toFixed(1)}" fill="${COLORS[st.turn].text}">${txt}</text>`;
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
    const away = online() && ctl[p] === 'x';
    el.classList.toggle('away', away && !dead);
    el.classList.toggle('me', online() && p === mySeat());
    const tags = [];
    if (online() && p === mySeat()) tags.push(t('net.you'));
    if (away && !dead) tags.push(t('cs.away'));
    if (multi() && isAI(p) && !dead) tags.push(t('cs.cpu.tag'));
    tags.push(dead ? t('cs.outplayer') : plural(liveHands, 'cs.hands'));
    el.querySelector('.score').textContent = tags.join(' · ');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  document.querySelector('.arena').dataset.n = st.n;

  const status = $('#status');
  if (over) status.textContent = '';
  else if (online() && !sess.host && !sess.connected && st.n > 2) status.textContent = t('cs.online.nohost');
  else if (!linkOk()) status.textContent = t('cs.online.wait');
  else if (spectator()) status.textContent = t('cs.online.spectator');
  else if (online() && ctl[st.turn] === 'x') status.textContent = t('cs.online.away', { name: name(st.turn) });
  else if (online() && isAI(st.turn)) status.textContent = t('cs.thinking', { name: name(st.turn) });
  else if (online()) status.textContent = isLocal(st.turn) ? t('cs.turn.you') : t('cs.turn.them', { name: name(st.turn) });
  else if (isAI(st.turn)) status.textContent = t('cs.thinking', { name: name(st.turn) });
  else status.textContent = t(sel >= 0 ? 'cs.turn.target' : 'cs.turn.pick', { name: name(st.turn) });
  status.style.color = COLORS[st.turn].main;

  $('#undo').disabled = online() || busy || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#players').disabled = !canRestart();
  $('#players-field').hidden = !online() && cfg.mode !== 'pvp';
  for (const id of ['#rule', '#start', '#new']) $(id).disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('cs.online.waitnew', { name: name(0) });
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
  history = []; over = false; sel = -1; preview = null; fx = null; inbox = [];
  if (online() && sess.host) { compactSeats(); ctl = computeCtl(); }
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
    pending = m;
    animTimer = setTimeout(() => { busy = false; pending = null; commit(m); }, 240);
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
    fx = { p: v, h: m.to, text: info.knocked ? t('cs.out') : `+${info.add}`, color: info.knocked ? COLORS[who].text : COLORS[who].main };
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
  if (CS.isOver(st)) { finish(); return drainInbox(); }
  autoSelect();
  render();
  // forget the "+n" float once it has played, so later redraws (e.g. picking a hand) don't replay it
  const shown = fx;
  setTimeout(() => { if (fx === shown) fx = null; }, 700);
  if (!drainInbox()) maybeAI();
}

// Online: a move that arrived while the previous one was still animating.
function drainInbox() {
  if (!inbox.length) return false;
  const [d, from] = inbox.shift();
  onMove(d, from);
  return true;
}

// Online the computer seats are played on the host only (and broadcast like any other move).
function maybeAI() {
  clearTimeout(aiTimer);
  if (over || !isAI(st.turn) || (online() && !sess.host)) return;
  aiTimer = setTimeout(() => {
    const m = CS.aiMove(st, online() ? 'normal' : cfg.mode);
    // point at the chosen hand for a moment before tapping
    if (m.t === 'tap') {
      const g = svg.querySelector(`.hand[data-p="${st.turn}"][data-h="${m.h}"]`);
      g?.classList.add('sel');
      aiTimer = setTimeout(() => { if (online()) broadcastMove(m); play(m); }, 350);
    } else { if (online()) broadcastMove(m); play(m); }
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
  $('#result-sub').textContent = w < 0 ? t('cs.draw.sub') : online() && st.n === 2 ? '' : t('cs.next', { name: name(nf) });
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

// Online, only the room creator may restart or change the rules / player count; guests follow.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Messages (no hidden information in this game, so every device gets the same public state):
//   host → guests: 'state' {st, over, ctl, names, nextFirst, you} · 'move' {m, n} · 'seats' {ctl, names, you}
//   guest → host:  'name' {name, cid} (also the hello) · 'move' {m, n} (host validates, applies, relays) · 'resync'
// Game seats are the host's to hand out: a guest is recognised by its tab id (cid), so after a host reload,
// when net.js may hand out connection seats in a different order, everyone still gets their own colour back.
const allNames = () => [cfg.names[0], remoteNames[1], remoteNames[2], remoteNames[3]];
let owner = [];                           // host: game seat → cid of the guest playing it
let gseat = {};                           // host: connection seat → game seat
let myGame = null;                        // guest: my game seat as told by the host
const hello = new Set();                  // host: connection seats that (re)joined and owe us their name/cid
const myCid = () => sessionStorage.getItem('mg-client-id') || '';
// Per-browser id (shared by its tabs): a guest who closes the tab and opens the link again gets a new tab id,
// but can still have their seat back if nobody is playing it.
const myDev = () => {
  let d = localStorage.getItem('mg-' + SLUG + '-dev');
  if (!d) localStorage.setItem('mg-' + SLUG + '-dev', (d = Math.random().toString(36).slice(2, 12)));
  return d;
};
let ownerDev = [];                        // host: game seat → browser id of its guest
const liveSeats = () => Object.values(gseat);
const netOf = (g) => Object.keys(gseat).find((k) => gseat[k] === g);
// The host keeps the match in sessionStorage per room, so reloading the host tab does not wipe it.
const roomKey = (s) => `mg-${SLUG}-room-${s.code}`;
function persist() {
  if (online() && sess.host && st) sessionStorage.setItem(roomKey(sess), JSON.stringify({ st, over, ctl, owner, ownerDev, names: allNames(), nextFirst }));
}
function sendState(to) {
  for (const k of to === undefined ? Object.keys(gseat) : [to]) {
    if (gseat[k] === undefined) continue;
    sess.send('state', { st, over, ctl, names: allNames(), nextFirst, you: gseat[k] }, { to: +k });
    // a move still animating here is not in st yet, and the guest may have missed its broadcast
    if (busy && pending) sess.send('move', { m: pending, n: st.moves }, { to: +k });
  }
}
function sendSeats() {
  for (const k in gseat) sess.send('seats', { ctl, names: allNames(), you: gseat[k] }, { to: +k });
}
// Host: which game seat does the guest on connection seat k get?
function assignSeat(k, cid, dev) {
  delete gseat[k];
  const n = st.n, live = liveSeats();
  const free = (g) => g > 0 && g < n && !live.includes(g);
  let g = owner.indexOf(cid);
  if (g <= 0 && dev) g = ownerDev.findIndex((x, i) => x === dev && free(i));
  if (g <= 0 || live.includes(g)) {
    const cands = [k, ...Array.from({ length: n }, (_, i) => i)];
    g = cands.find((x) => free(x) && !owner[x]) ?? cands.find(free) ?? k; // unowned first, then a seat whose owner left
  }
  owner[g] = cid; ownerDev[g] = dev;
  gseat[k] = g;
  delete goneAt[g];
}
// Host, new game with a smaller table: move guests sitting beyond it onto free seats.
function compactSeats() {
  for (const k in gseat) {
    if (gseat[k] < st.n) continue;
    const g = Array.from({ length: st.n }, (_, i) => i).find((x) => x > 0 && !liveSeats().includes(x));
    if (g === undefined) continue;
    owner[g] = owner[gseat[k]]; owner[gseat[k]] = undefined;
    ownerDev[g] = ownerDev[gseat[k]]; ownerDev[gseat[k]] = undefined;
    gseat[k] = g;
  }
}
function computeCtl() {
  const live = liveSeats();
  return Array.from({ length: st.n }, (_, p) => {
    if (p === 0) return 'h';
    if (live.includes(p)) return 'g';
    if (goneAt[p] !== undefined && (st.n === 2 || Date.now() - goneAt[p] < AWAY_MS)) return 'x';
    return st.n === 2 ? 'w' : 'c';
  });
}
// someone (re)took a seat: a little hello on every device
function greet(was, now) {
  now.forEach((c, p) => { if (c === 'g' && was[p] && was[p] !== 'g' && p !== mySeat() && !over) say(p, 'cs.say.hi'); });
}
// Host: seats changed hands. A guest takes over a computer seat at once (any moment between moves is safe).
function updateCtl() {
  const was = ctl, now = computeCtl();
  if (String(was) === String(now)) return render();
  ctl = now;
  greet(was, now);
  sendSeats();
  if (!over && !busy && was[st.turn] !== now[st.turn]) { autoSelect(); maybeAI(); }
  render();
}
function broadcastMove(m, except) {
  for (const k in gseat) if (+k !== except) sess.send('move', { m, n: st.moves }, { to: +k });
}
// The engine's own copy of a legal move (never apply an object that came over the wire as is).
const legalMove = (m) => (over ? null : CS.moves(st).find((x) => CS.sameMove(x, m)) || null);
function onMove(d, k) {
  if (busy) { inbox.push([d, k]); return; }
  const m = d && typeof d === 'object' ? legalMove(d.m) : null;
  if (sess.host) {
    const from = gseat[k];
    if (from === undefined) return;
    if (!m || from !== st.turn || ctl[from] !== 'g' || d.n !== st.moves) return sendState(k);
    broadcastMove(m, k);
    play(m);
  } else {
    if (!m || d.n !== st.moves) return sess.send('resync');
    play(m);
  }
}
// Guest: seat info from the host.
function applySeats(d) {
  const was = ctl;
  ctl = d.ctl;
  if (d.you !== undefined && d.you !== myGame) {
    const old = mySeat();
    myGame = d.you;
    if (!cfg.names[myGame] && cfg.names[old]) { cfg.names[myGame] = cfg.names[old]; sendName(); }
  }
  d.names.forEach((n, p) => { if (p !== mySeat()) remoteNames[p] = n || ''; });
  return was;
}
const sendName = () => sess.send('name', { name: cfg.names[mySeat()] || '', cid: myCid(), dev: myDev() });
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer); clearTimeout(animTimer); busy = false; inbox = [];
  for (const k in goneAt) delete goneAt[k];
  owner = []; ownerDev = []; gseat = {}; myGame = null; hello.clear();
  s.on('status', () => render());
  // guest: say hello (name + tab id); the host answers with the state once it knows our seat
  s.on('peer-join', ({ seat }) => { if (s.host) hello.add(seat); else sendName(); });
  s.on('peer-leave', ({ seat }) => {
    if (!s.host) return render();
    const g = gseat[seat];
    delete gseat[seat];
    if (g === undefined) return;
    goneAt[g] = Date.now();
    updateCtl();
    setTimeout(() => { if (sess === s) updateCtl(); }, AWAY_MS + 50);
  });
  s.on('state', (d) => {
    if (s.host) return;
    clearTimeout(animTimer); clearTimeout(aiTimer); busy = false; inbox = [];
    st = d.st; over = false; history = []; fx = null; preview = null; nextFirst = d.nextFirst;
    applySeats(d);
    syncRuleInputs({ ...st.rules, players: st.n });
    calmAll();
    $('#result').hidden = true;
    autoSelect();
    d.over ? finish() : render();
  });
  s.on('seats', (d) => {
    if (s.host) return;
    greet(applySeats(d), ctl);
    if (!busy) autoSelect();
    render();
  });
  s.on('name', (d, { seat }) => {
    if (!s.host || !d || typeof d !== 'object') return;
    const fresh = hello.delete(seat) || gseat[seat] === undefined;
    if (fresh) assignSeat(seat, String(d.cid || seat), d.dev ? String(d.dev) : '');
    remoteNames[gseat[seat]] = String(d.name || '').slice(0, 14);
    if (fresh) { updateCtl(); sendState(seat); }
    sendSeats();
    render();
  });
  s.on('move', (d, { seat }) => onMove(d, seat));
  s.on('resync', (_, { seat }) => s.host && sendState(seat));
  const saved = s.host && JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
  if (saved) {
    // host reload: guests come back on their own; until then their seats count as "away", not computer
    st = saved.st; over = saved.over; nextFirst = saved.nextFirst; history = []; fx = null; preview = null;
    owner = saved.owner || []; ownerDev = saved.ownerDev || [];
    saved.names.forEach((n, p) => { if (p) remoteNames[p] = n || ''; });
    saved.ctl.forEach((c, p) => { if (c === 'g' || c === 'x') goneAt[p] = Date.now(); });
    ctl = computeCtl();
    s.setMaxPlayers(st.n);
    syncRuleInputs({ ...st.rules, players: st.n });
    calmAll();
    $('#result').hidden = true;
    autoSelect();
    over ? finish() : render();
    setTimeout(() => { if (sess === s) updateCtl(); }, AWAY_MS + 50);
    maybeAI();
  } else if (s.host) { nextFirst = 0; newGame(); }
  else render();
}
function syncRuleInputs(r) {
  $('#rule').value = r.cutoff ? 'cutoff' : 'wrap';
  $('#start').value = String(r.start);
  $('#players').value = String(r.players);
}

function localMove(m) {
  if (online()) {
    if (sess.host) broadcastMove(m);
    else sess.send('move', { m, n: st.moves });
  }
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
$('#players').addEventListener('change', (e) => {
  cfg.players = +e.target.value; saveCfg(); nextFirst = 0;
  // online: the host decides how many seats the room has (seats without a device are the computer's)
  if (online()) { sess.setMaxPlayers(cfg.players); restart(); } else newGame();
});
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
    if (online()) sess.host ? sendSeats() : sendName();
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
  maxPlayers: () => +cfg.players,
  onSession,
  onEnd: () => { sess = null; syncRuleInputs(rulesWanted()); $('#players').value = String(cfg.players); nextFirst = 0; newGame(); },
});
if (!online()) showOnce('how', SLUG);
