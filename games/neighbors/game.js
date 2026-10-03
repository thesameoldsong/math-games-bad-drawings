import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { NB } from './engine.js';
import './strings.js';

const SLUG = 'neighbors';
const COLORS = [
  PALETTE.blue, PALETTE.red,
  { main: '#3aa655', dark: '#22753a', fill: '#9ad8a8' },
  { main: '#f08c1e', dark: '#b05c00', fill: '#f8c58a' },
];
// SVG layout: a strip with the die and the other players' small boards, then the big 5×5 grid.
const W = 340, TH = 114, DECK_H = 30, CELL = 64, GX = 10;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const KEY = 'mg-neighbors';
const cfg = Object.assign(
  { mode: 'pvp', players: 2, source: 'die', secret: 'open', hints: 'off', names: ['', '', '', ''], best: {} },
  JSON.parse(localStorage.getItem(KEY) || '{}'),
);
const saveCfg = () => localStorage.setItem(KEY, JSON.stringify(cfg));

let st, history, over, aiTimer, hintTimer, shapes = {}, hint = null, fx = null, shownRolls = 0;
let view = 0, revealed = 0, hoverCell = -1;
let sess = null, pending = null, synced = false, netRules = { secret: 'open' };
const remoteNames = ['', ''];
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const vsAI = () => ['easy', 'normal', 'hard'].includes(cfg.mode);
const isAI = (p) => !online() && vsAI() && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const hotSeat = () => !online() && st.n > 1 && !vsAI();
const secret = () => st.n > 1 && (online() ? netRules.secret : cfg.secret) === 'secret';
function name(p) {
  if (isAI(p)) return t('nb.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('nb.p' + p);
}
const playersFor = () => (cfg.mode === 'solo' ? 1 : cfg.mode === 'pvp' ? +cfg.players : 2);

// The local player who has to write the current number right now (or -1).
function activeLocal() {
  if (over) return -1;
  if (online()) return !st.placed[mySeat()] && !pending ? mySeat() : -1;
  return NB.waiting(st).find(isLocal) ?? -1;
}
// Whose board this screen "belongs" to: their numbers are shown, the others may be hidden.
const owner = () => (online() ? mySeat() : hotSeat() ? view : 0);
const hiddenFor = (p) => secret() && !over && p !== owner();
const coverUp = () => !$('#cover').hidden;
const canMove = () => activeLocal() >= 0 && !coverUp() && (!online() || (sess.connected && (sess.host || synced)));

function boardOf(p) {
  let b = st.boards[p];
  if (online() && p === mySeat() && pending && pending.round === st.round) { b = b.slice(); b[pending.i] = st.roll; }
  return hiddenFor(p) ? b.map((v) => (v ? -1 : 0)) : b;
}
const scoreOf = (p) => NB.score(boardOf(p));

function syncView() {
  if (over) return;
  if (online()) { view = mySeat(); return; }
  const a = activeLocal();
  if (a >= 0) view = a;
  else if (isAI(view)) view = 0;
  // Secret boards on one screen: hide everything until the next player says they're ready.
  const needCover = hotSeat() && secret() && a >= 0 && a !== revealed;
  $('#cover').hidden = !needCover;
  if (needCover) {
    const who = $('#cover-who');
    who.textContent = t('nb.pass.who', { name: name(a) });
    who.style.color = COLORS[a].main;
  }
}

// ---------- rendering ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const gridTop = () => TH + (st.source === 'deck' ? DECK_H : 0);

function dieSVG() {
  const v = st.roll, rolled = st.rolls.length !== shownRolls;
  shownRolls = st.rolls.length;
  const cls = `die${rolled ? ' rolling' : ''}${over ? ' done' : ''}`;
  let s = `<g class="${cls}" transform="translate(14 2) scale(.93)">`;
  if (st.source === 'deck') {
    const card = shapeFor('card', () => {
      const p = [[14, 2], [78, 2], [78, 92], [14, 92]];
      return p.map((a, k) => line(...a, ...p[(k + 1) % 4], 1.2)).join(' ');
    });
    s += `<g transform="rotate(-5 46 47)"><rect x="14" y="2" width="64" height="90" rx="6" fill="#fff"/>`;
    s += `<path d="${card}" class="ink-line"/>`;
    if (!over) {
      s += `<text class="die-num" x="46" y="50">${v}</text>`;
      s += `<text class="card-corner" x="24" y="16">${v}</text><text class="card-corner" x="68" y="80" transform="rotate(180 68 80)">${v}</text>`;
    }
    s += `</g>`;
  } else {
    const T = [46, 2], R = [90, 40], RB = [84, 64], B = [46, 92], LB = [8, 64], L = [2, 40];
    const fT = T, fR = [70, 46], fB = [46, 64], fL = [22, 46];
    const d = shapeFor('die', () => [
      [T, R], [R, RB], [RB, B], [B, LB], [LB, L], [L, T],
      [fT, fR], [fR, fB], [fB, fL], [fL, fT], [fR, R], [fB, B], [fL, L],
    ].map(([a, b]) => line(...a, ...b, 1.2)).join(' '));
    const outline = [T, R, RB, B, LB, L].map((p) => p.join(' ')).join(' L');
    s += `<path d="M${outline} Z" class="die-fill" filter="url(#mg-crayon)"/>`;
    s += `<path d="M${[fT, fR, fB, fL].map((p) => p.join(' ')).join(' L')} Z" fill="#fff" opacity=".55"/>`;
    s += `<path d="${d}" class="ink-line"/>`;
    if (!over) s += `<text class="die-num${v === 10 ? ' ten' : ''}" x="46" y="38">${v}</text>`;
  }
  s += `</g>`;
  const k = Math.min(st.round + 1, NB.ROUNDS);
  s += `<text class="round-txt" x="58" y="${TH - 6}">${t(st.source === 'deck' ? 'nb.round.card' : 'nb.round', { k })}</text>`;
  return s;
}

function deckSVG(y) {
  let s = `<g class="deck"><title>${t('nb.deckleft')}</title>`;
  for (let v = 1; v <= 10; v++) {
    const cx = GX + (v - 0.5) * 32;
    s += `<text class="deck-num" x="${cx}" y="${y + 10}">${v}</text>`;
    for (let k = 0; k < 4; k++) {
      const on = k < st.deck[v];
      s += `<circle cx="${cx - 9 + k * 6}" cy="${y + 23}" r="2.3" class="${on ? 'pip on' : 'pip'}"/>`;
    }
  }
  return s + '</g>';
}

function ovalPath(p, run, x0, y0, cell, tag) {
  const a = run.cells[0], len = run.cells.length;
  const r = (a / 5) | 0, c = a % 5;
  const k = `${tag}${p}${run.dir}${a}_${len}`;
  return shapeFor(k, () => {
    if (run.dir === 'h') {
      const cx = x0 + (c + len / 2) * cell, cy = y0 + (r + 0.5) * cell;
      return circle(cx, cy, (len * cell) / 2 - cell * 0.08, cell * 0.36, 0.04);
    }
    const cx = x0 + (c + 0.5) * cell, cy = y0 + (r + len / 2) * cell;
    return circle(cx, cy, cell * 0.36, (len * cell) / 2 - cell * 0.08, 0.04);
  });
}

function gridLines(x0, y0, cell, tag, width) {
  return shapeFor(tag, () => {
    let d = '';
    const n = 5 * cell, amp = cell > 30 ? 1.6 : 0.7;
    for (let k = 0; k <= 5; k++) {
      d += line(x0 + k * cell, y0, x0 + k * cell, y0 + n, amp) + ' ';
      d += line(x0, y0 + k * cell, x0 + n, y0 + k * cell, amp) + ' ';
    }
    return d;
  }).replace(/^/, `<path class="grid" stroke-width="${width}" d="`) + '"/>';
}

function bigBoard(y0) {
  const p = view, b = boardOf(p), col = COLORS[p];
  let s = `<g class="big">`;
  if (canMove()) {
    for (let i = 0; i < 25; i++) if (!b[i]) {
      s += `<rect class="free" x="${GX + (i % 5) * CELL + 3}" y="${y0 + ((i / 5) | 0) * CELL + 3}" width="${CELL - 6}" height="${CELL - 6}" rx="8"/>`;
    }
  }
  if (hint && hint.p === p && hint.round === st.round && !b[hint.i] && canMove()) {
    const cx = GX + (hint.i % 5 + 0.5) * CELL, cy = y0 + (((hint.i / 5) | 0) + 0.5) * CELL;
    s += `<path class="hint" d="${shapeFor('hint' + hint.i + '_' + st.round, () => circle(cx, cy, 24, 24, 0.06))}"/>`;
  }
  s += gridLines(GX, y0, CELL, 'gbig', 2.6);
  s += `<path class="frame" stroke="${col.main}" d="${shapeFor('frame' + p, () => {
    const n = 5 * CELL, q = [[GX, y0], [GX + n, y0], [GX + n, y0 + n], [GX, y0 + n]];
    return q.map((a, k) => line(...a, ...q[(k + 1) % 4], 1.4)).join(' ');
  })}"/>`;
  for (const run of NB.runs(b)) s += `<path class="oval" stroke="${col.dark}" d="${ovalPath(p, run, GX, y0, CELL, 'B')}"/>`;
  for (let i = 0; i < 25; i++) {
    const v = b[i];
    if (!v) continue;
    const cx = GX + (i % 5 + 0.5) * CELL, cy = y0 + (((i / 5) | 0) + 0.5) * CELL;
    if (v < 0) { s += hiddenMark(cx, cy, 14, 'hb' + i); continue; }
    const rot = shapeFor(`r${p}_${i}_${v}`, () => (Math.random() * 2 - 1) * 7).toFixed(1);
    const fresh = fx && fx.fresh && fx.p === p && fx.i === i;
    s += `<text class="num${fresh ? ' fresh' : ''}" x="${cx}" y="${cy + 2}" fill="${col.main}" transform="rotate(${rot} ${cx} ${cy})">${v}</text>`;
  }
  if (fx && fx.fresh && fx.p === p && fx.g > 0) {
    const cx = GX + (fx.i % 5 + 0.5) * CELL, cy = y0 + (((fx.i / 5) | 0) + 0.2) * CELL;
    s += `<text class="float" x="${cx}" y="${cy}" fill="${col.dark}">+${fx.g}</text>`;
  }
  s += `<text id="ghost" class="num ghost" x="-99" y="-99" fill="${col.main}"></text>`;
  return s + '</g>';
}

function hiddenMark(cx, cy, r, k) {
  return `<path class="hidden-mark" d="${shapeFor(k, () => line(cx - r, cy + r * 0.4, cx - r * 0.3, cy - r * 0.5, 0.6) + ' ' + line(cx - r * 0.3, cy + r * 0.5, cx + r * 0.4, cy - r * 0.4, 0.6) + ' ' + line(cx + r * 0.3, cy + r * 0.5, cx + r, cy - r * 0.3, 0.6))}"/>`;
}

function minisSVG() {
  const others = [];
  for (let p = 0; p < st.n; p++) if (p !== view) others.push(p);
  const x0 = 118, aw = W - x0 - 4, gap = 12;
  if (!others.length) {
    const best = cfg.best[st.source];
    let s = `<text class="best-lbl" x="${x0 + aw / 2}" y="${best ? 36 : 58}">${t(best ? 'nb.best' : 'nb.best.none')}</text>`;
    if (best) s += `<text class="best-num" x="${x0 + aw / 2}" y="78">${best}</text>`;
    return s;
  }
  const m = others.length, cell = Math.min(18, Math.floor((aw - (m - 1) * gap) / (5 * m)));
  const tot = m * 5 * cell + (m - 1) * gap;
  let x = x0 + (aw - tot) / 2;
  const y = 4 + (96 - 5 * cell) / 2;
  let s = '';
  for (const p of others) {
    const b = boardOf(p), col = COLORS[p];
    s += `<g class="mini${over ? ' pick' : ''}" data-view="${p}">`;
    s += `<rect x="${x - 3}" y="${y - 3}" width="${5 * cell + 6}" height="${5 * cell + 6}" fill="#fff" fill-opacity="0"/>`;
    const slot = `${m}_${x}`;
    s += gridLines(x, y, cell, `gm${slot}`, 1.4).replace('class="grid"', `class="grid" style="stroke:${col.main}"`);
    for (const run of NB.runs(b)) s += `<path class="oval mini-oval" stroke="${col.dark}" d="${ovalPath(p, run, x, y, cell, 'm' + slot + '_')}"/>`;
    for (let i = 0; i < 25; i++) {
      const v = b[i];
      if (!v) continue;
      const cx = x + (i % 5 + 0.5) * cell, cy = y + (((i / 5) | 0) + 0.5) * cell;
      if (v < 0) { s += hiddenMark(cx, cy, cell * 0.28, `hm${slot}_${i}`); continue; }
      const fresh = fx && fx.fresh && fx.p === p && fx.i === i;
      s += `<text class="mini-num${fresh ? ' fresh' : ''}" x="${cx}" y="${cy + 1}" fill="${col.main}" style="font-size:${(cell * 0.82).toFixed(1)}px">${v}</text>`;
    }
    s += '</g>';
    x += 5 * cell + gap;
  }
  return s;
}

function render() {
  syncView();
  const y0 = gridTop(), H = y0 + 5 * CELL + 8;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let out = dieSVG() + minisSVG();
  if (st.source === 'deck') out += deckSVG(TH - 4);
  out += bigBoard(y0);
  svg.innerHTML = out;
  if (fx) fx.fresh = false;
  hoverCell = -1;
  renderPlayers();
}

function renderPlayers() {
  const arena = $('.arena');
  arena.classList.remove('n1', 'n2', 'n3', 'n4');
  arena.classList.add('n' + st.n);
  for (let p = 0; p < 4; p++) {
    const el = $(`.player.p${p}`);
    el.hidden = p >= st.n;
    if (p >= st.n) continue;
    const active = !over && !st.placed[p] && !(online() && p === mySeat() && pending);
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active && (p === view || isAI(p) || online()) ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p % 2 === 0 ? 'right' : 'left', seed: 11 + p * 31,
    });
    el.querySelector('.score').textContent = hiddenFor(p) ? t('nb.secret.score') : plural(scoreOf(p), 'nb.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] || '' : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const v = st.roll, a = activeLocal();
  let txt = '', who = view;
  if (over) txt = st.n > 1 && $('#result').hidden ? t('nb.view.hint') : '';
  else if (online() && !sess.connected) txt = t('nb.online.wait');
  else if (online()) {
    const them = 1 - mySeat();
    txt = a >= 0 ? t('nb.turn.you', { v }) : t('nb.wait.them', { name: name(them), v });
    if (a < 0) who = them;
  } else if (a < 0) { who = 1; txt = t('nb.thinking', { name: name(1) }); }
  else if (st.n === 1 || vsAI()) txt = t('nb.turn.solo', { v });
  else txt = t('nb.turn', { name: name(a), v });
  status.textContent = txt;
  status.style.color = over ? 'var(--ink)' : COLORS[who].main;

  const restartable = canRestart();
  $('#undo').disabled = online() || !history.length;
  $('#mode').disabled = online();
  $('#players').disabled = online();
  $('#players-field').hidden = online() || cfg.mode !== 'pvp';
  $('#secret-field').hidden = !online() && cfg.mode === 'solo';
  $('#source').disabled = !restartable;
  $('#secret').disabled = !restartable;
  $('#new').disabled = !restartable;
  $('#again').hidden = !restartable;
  $('#result-wait').hidden = restartable;
  if (online()) $('#result-wait').textContent = t('nb.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('nb.online.note') : '';
}

const bubbleTimers = [];
function say(p, key, vars) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key, vars);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
function newGame() {
  clearTimeout(aiTimer);
  clearTimeout(hintTimer);
  st = NB.create({ players: online() ? 2 : playersFor(), source: cfg.source });
  history = []; shapes = {}; over = false; hint = null; fx = null; pending = null;
  view = online() ? mySeat() : 0; revealed = 0;
  for (let p = 0; p < 4; p++) setMood(p, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
  scheduleHint();
}

// How a placement looks to the players: big gains cheer, a high number with nowhere to go hurts,
// and dumping a small number while a point was on offer is the book's "don't sell prime real estate".
function react(p, g, v, bestNow, i) {
  if (g >= 18) {
    setMood(p, 'happy', 'up'); say(p, 'nb.say.big', { n: g });
    if (st.n === 2) { setMood(1 - p, 'worried'); if (Math.random() < 0.5) setTimeout(() => say(1 - p, 'nb.say.wow'), 700); }
  } else if (g > 0) {
    setMood(p, 'happy', 'wave');
    if (Math.random() < 0.45) say(p, 'nb.say.pair', { n: g });
  } else if (bestNow === 0 && v >= 7) {
    setMood(p, 'worried');
    if (Math.random() < 0.6) say(p, 'nb.say.meh');
  } else if (bestNow > 0 && v <= 3 && (i % 5 === 0 || i % 5 === 4 || i < 5 || i >= 20)) {
    setMood(p, 'smug');
    if (Math.random() < 0.6) say(p, 'nb.say.dump');
  } else setMood(p, 'neutral');
}

// Authoritative placement (local play, or the host online).
function apply(p, i) {
  const v = st.roll, b = st.boards[p];
  const bestNow = Math.max(0, ...NB.empties(b).map((j) => NB.gain(b, j, v)));
  const g = NB.place(st, p, i);
  fx = { p, i, g, fresh: true };
  if (!hiddenFor(p)) react(p, g, v, bestNow, i);
  if (st.over) finish();
  else { render(); maybeAI(); scheduleHint(); }
  if (online() && sess.host) sendState();
}

function localPlace(i) {
  const p = activeLocal();
  if (p < 0 || !NB.canPlace(st, p, i)) return;
  if (online() && !sess.host) {
    const v = st.roll, b = st.boards[p];
    const bestNow = Math.max(0, ...NB.empties(b).map((j) => NB.gain(b, j, v)));
    const g = NB.gain(b, i, v);
    pending = { round: st.round, i };
    fx = { p, i, g, fresh: true };
    react(p, g, v, bestNow, i);
    sess.send('place', { i, round: st.round });
    render();
    return;
  }
  if (!online()) history.push(NB.clone(st));
  revealed = p;
  apply(p, i);
}

function maybeAI() {
  clearTimeout(aiTimer);
  if (over || online() || !vsAI() || st.placed[1] || activeLocal() >= 0) return;
  aiTimer = setTimeout(() => {
    if (over || st.placed[1]) return;
    apply(1, NB.aiMove(st, 1, cfg.mode));
  }, 520);
}

function scheduleHint() {
  clearTimeout(hintTimer);
  if (cfg.hints !== 'on' || over) return;
  const p = activeLocal(), round = st.round;
  if (p < 0 || (hint && hint.p === p && hint.round === round)) return;
  hintTimer = setTimeout(() => {
    if (over || activeLocal() !== p || st.round !== round) return;
    hint = { p, round, i: NB.aiMove(st, p, 'hard') };
    render();
  }, 120);
}

function finish() {
  over = true;
  clearTimeout(aiTimer);
  const sc = st.boards.map((b) => NB.score(b));
  const w = NB.winners(st);
  view = online() ? mySeat() : 0;
  const txt = $('#result-text'), sub = $('#result-sub');
  if (st.n === 1) {
    const prev = cfg.best[st.source] || 0, rec = sc[0] > prev;
    if (rec) { cfg.best[st.source] = sc[0]; saveCfg(); }
    setMood(0, rec ? 'happy' : 'neutral', rec ? 'up' : 'wave');
    say(0, rec ? 'nb.say.record' : 'nb.say.solo');
    txt.textContent = t('nb.solo.total', { pts: plural(sc[0], 'nb.pts') });
    txt.style.color = COLORS[0].main;
    sub.textContent = rec ? t('nb.solo.record') : t('nb.solo.best', { n: prev });
  } else {
    for (let p = 0; p < st.n; p++) {
      if (w.includes(p)) setMood(p, w.length > 1 ? 'worried' : 'happy', w.length > 1 ? 'down' : 'up');
      else setMood(p, 'sad');
    }
    if (w.length === 1) {
      say(w[0], 'nb.say.win');
      const loser = [...Array(st.n).keys()].find((p) => p !== w[0]);
      setTimeout(() => say(loser, 'nb.say.lose'), 900);
      txt.textContent = t('nb.win', { name: name(w[0]) });
      txt.style.color = COLORS[w[0]].main;
    } else {
      say(w[0], 'nb.say.tie');
      txt.textContent = w.length === st.n ? t('nb.tie') : t('nb.tie.some', { names: w.map(name).join(', ') });
      txt.style.color = 'var(--ink)';
    }
    sub.innerHTML = sc.map((x, p) => `<span style="color:${COLORS[p].main}">${st.n > 2 ? name(p) + ' ' : ''}${x}</span>`).join(st.n > 2 ? ' · ' : ' : ');
  }
  render();
  setTimeout(() => { if (over) { $('#result').hidden = false; renderPlayers(); } }, 1100);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  st = history.pop();
  over = false; fx = null; hint = null;
  revealed = -1; // secret boards on one screen: whoever holds the device must confirm again
  for (let p = 0; p < 4; p++) setMood(p, 'neutral');
  $('#result').hidden = true;
  shownRolls = st.rolls.length;
  render();
  maybeAI();
  scheduleHint();
}

// Online, only the room creator may restart or change the rules; the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState(true);
}

// ---------- online ----------
// Host is authoritative and sends the whole (masked, if boards are secret) state after every change.
function sendState(fresh = false) {
  if (!sess) return;
  const rules = { secret: cfg.secret };
  sess.send('state', { st: rules.secret === 'secret' ? NB.masked(st, 1) : st, rules, names: cfg.names, fresh });
}

function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  netRules = { secret: cfg.secret };
  synced = s.host;
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prev = st;
    const sameGame = !d.fresh && prev && !prev.dummy && prev.n === d.st.n && d.st.rolls.length >= prev.rolls.length
      && prev.rolls.every((v, k) => d.st.rolls[k] === v);
    netRules = d.rules;
    synced = true;
    remoteNames[0] = d.names[0];
    st = d.st;
    if (pending && (st.round !== pending.round || st.placed[mySeat()])) pending = null;
    if (!sameGame) {
      history = []; shapes = {}; fx = null; hint = null; pending = null; over = false;
      for (let p = 0; p < 4; p++) setMood(p, 'neutral');
      $('#result').hidden = true;
      cfg.source = st.source; $('#source').value = st.source;
    } else {
      // The host's move: react if we can see it.
      const placedNow = prev.round < st.round || (!prev.placed[0] && st.placed[0]);
      if (placedNow && !prev.placed[0] && !hiddenFor(0) && st.last[0] >= 0) {
        const g = NB.score(st.boards[0]) - NB.score(prev.boards[0]);
        fx = { p: 0, i: st.last[0], g, fresh: true };
        const v = st.boards[0][st.last[0]], pb = prev.boards[0];
        react(0, g, v, Math.max(0, ...NB.empties(pb).map((j) => NB.gain(pb, j, v))), st.last[0]);
      }
    }
    $('#secret').value = netRules.secret;
    if (st.over && !over) finish();
    else { if (!st.over) over = false; render(); scheduleHint(); }
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('place', (d) => {
    if (!s.host) return;
    if (over || d.round !== st.round || !NB.canPlace(st, 1, d.i)) return sendState();
    apply(1, d.i);
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else { st = NB.create({ players: 2, source: cfg.source }); st.dummy = true; history = []; over = false; render(); }
}

// ---------- input ----------
function svgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function cellAt(evt) {
  const p = svgPoint(evt), y0 = gridTop();
  const c = Math.floor((p.x - GX) / CELL), r = Math.floor((p.y - y0) / CELL);
  if (c < 0 || c > 4 || r < 0 || r > 4) return -1;
  return r * 5 + c;
}

svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const i = canMove() ? cellAt(evt) : -1;
  const ok = i >= 0 && !boardOf(view)[i];
  if ((ok ? i : -1) === hoverCell) return;
  hoverCell = ok ? i : -1;
  const g = svg.querySelector('#ghost');
  svg.style.cursor = ok ? 'pointer' : '';
  if (!g) return;
  if (!ok) { g.setAttribute('x', -99); return; }
  g.textContent = st.roll;
  g.setAttribute('x', GX + (i % 5 + 0.5) * CELL);
  g.setAttribute('y', gridTop() + (((i / 5) | 0) + 0.5) * CELL + 2);
});
svg.addEventListener('pointerleave', () => { hoverCell = -1; svg.querySelector('#ghost')?.setAttribute('x', -99); });
svg.addEventListener('click', (evt) => {
  const mini = evt.target.closest('[data-view]');
  if (mini && over) { view = +mini.dataset.view; render(); return; }
  if (!canMove()) return;
  const i = cellAt(evt);
  if (i >= 0 && !boardOf(view)[i]) localPlace(i);
});

$('#cover-go').addEventListener('click', () => { revealed = activeLocal(); $('#cover').hidden = true; render(); scheduleHint(); });
$('#result').addEventListener('click', (e) => { if (!e.target.closest('.result-card')) { $('#result').hidden = true; renderPlayers(); } });

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#players').addEventListener('change', (e) => { cfg.players = +e.target.value; saveCfg(); newGame(); });
$('#source').addEventListener('change', (e) => { cfg.source = e.target.value; saveCfg(); restart(); });
$('#secret').addEventListener('change', (e) => { cfg.secret = e.target.value; saveCfg(); if (online()) netRules = { secret: cfg.secret }; restart(); });
$('#hints').addEventListener('change', (e) => { cfg.hints = e.target.value; saveCfg(); hint = null; render(); scheduleHint(); });
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
$('#mode').value = cfg.mode;
$('#players').value = cfg.players;
$('#source').value = cfg.source;
$('#secret').value = cfg.secret;
$('#hints').value = cfg.hints;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; pending = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
