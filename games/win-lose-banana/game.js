import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { WLB } from './engine.js';
import './strings.js';

const SLUG = 'win-lose-banana';
const GREEN = { main: '#3aa655', dark: '#1f7a37', fill: '#97d9a8' };
const COLORS = [PALETTE.blue, PALETTE.red, GREEN];
const INK = PALETTE.ink;
const GOLD = '#c58a00';
const W = 360, H = 360;
const CX = [60, 180, 300], CW = 92, CH = 126, CT = 8;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ humans: 1, level: 'normal', names: ['', '', ''], model: {} },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (![1, 2, 3].includes(cfg.humans)) cfg.humans = 1;
if (!['easy', 'normal'].includes(cfg.level)) cfg.level = 'normal';
while (cfg.names.length < 3) cfg.names.push('');
if (!cfg.model || typeof cfg.model !== 'object') cfg.model = {};
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st = null;           // full state (local/host) or the host's view of it (guest)
let shapes = {};         // cached wobble per drawn element
let peek = null;         // hot-seat: { queue: [seats], i, shown } — suspects peeking in turn
let sel = null;          // the local guesser's tentative pick
let botTimer = 0, resultTimer = 0;
let waiting = false;     // guest before the first state from the host
let pending = false;     // guest: an action was sent, waiting for the host
let dealNo = Math.floor(Math.random() * 1e6);
let sess = null;
let netModel = {};       // what the online bot learned in this room
const remoteNames = ['', '', ''];
const moods = [0, 1, 2].map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isBot = (p) => (online() ? p === 2 : cfg.humans === 1 ? p > 0 : cfg.humans === 2 ? p === 2 : false);
const isRemote = (p) => online() && !isBot(p) && p !== mySeat();
const isLocal = (p) => !isBot(p) && !isRemote(p);
const authority = () => !online() || sess.host;
const over = () => st.phase === 'over';
const peekActive = () => !!peek && peek.i < peek.queue.length;
const peeker = () => (peekActive() ? peek.queue[peek.i] : -1);
const localCount = () => [0, 1, 2].filter(isLocal).length;
function name(p) {
  if (isBot(p)) return t('wlb.cpu' + (p === 1 ? 1 : 2));
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('wlb.p' + p);
}
const canAct = () => !!st && !waiting && !over() && !pending && !peekActive() && (!online() || sess.connected);
const canSpeak = (p) => canAct() && isLocal(p) && WLB.canPitch(st, p, 'me');
const canChoose = (p) => canAct() && isLocal(st.win) && WLB.canPick(st, p);

// Is p's card face up on this screen?
function faceUp(p) {
  if (waiting) return false;
  if (over() || p === st.win) return true;
  // a suspect knows their own card and therefore the other suspect's too
  if (online()) return mySeat() !== st.win;
  if (peekActive()) return peek.shown;
  if (peek) return false;   // a local human guesses: suspects keep their cards hidden
  return WLB.suspects(st).some(isLocal);
}

// ---------- drawing helpers ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function txt(x, y, s, { size = 20, color = INK, weight = 700, anchor = 'middle', max = 340, force = false } = {}) {
  const fit = force || String(s).length * size * 0.45 > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : '';
  return `<text class="t" x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}"${fit}>${esc(s)}</text>`;
}
function box(k, x, y, w, h, amp = 1.1) {
  return shapeFor(k, () => line(x, y, x + w, y, amp) + ' ' + line(x + w, y, x + w, y + h, amp).replace('M', 'L') + ' ' +
    line(x + w, y + h, x, y + h, amp).replace('M', 'L') + ' ' + line(x, y + h, x, y, amp).replace('M', 'L') + ' Z');
}
function button(act, x, y, w, h, label, { color = PALETTE.blue, primary = true, size = 22 } = {}) {
  let s = `<g class="sbtn" data-act="${act}">`;
  s += `<path d="${box('btn' + act + x + y + w, x, y, w, h, 1)}" fill="${primary ? color.main : '#fff'}" stroke="${color.dark}" stroke-width="2.5" stroke-linejoin="round"/>`;
  s += txt(x + w / 2, y + h / 2 + size * 0.34, label, { size, color: primary ? '#fff' : color.dark, max: w - 14 });
  return s + '</g>';
}

// Pictures on the card faces (our own doodles), centred at (0, 0).
function banana(k) {
  const outline = 'M-34 -14 C-30 18 20 28 36 -6 C18 8 -14 6 -34 -14 Z';
  return `<path d="${outline}" fill="#f7d23e" filter="url(#mg-crayon)"/>` +
    `<path d="${outline}" fill="none" stroke="#c99a10" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="${shapeFor(k + 'h', () => line(-22, 2, 14, 10, 1.2))}" stroke="#c99a10" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>` +
    `<path d="${shapeFor(k + 's', () => line(35, -6, 41, -16, 0.6))}" stroke="#6b4a1e" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<circle cx="-33" cy="-13" r="2.6" fill="#6b4a1e"/>`;
}
function trophy() {
  const cup = 'M-20 -24 L20 -24 C20 -2 10 6 0 6 C-10 6 -20 -2 -20 -24 Z';
  return `<path d="M-20 -18 C-33 -18 -31 -2 -15 0 M20 -18 C33 -18 31 -2 15 0" stroke="#b98a12" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="${cup}" fill="#f4bf3a" filter="url(#mg-crayon)"/><path d="${cup}" fill="none" stroke="#b98a12" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M0 6 L0 16 M-12 19 L12 19" stroke="#b98a12" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M0 -19 L2.6 -13.4 L8.6 -12.8 L4 -8.8 L5.4 -2.8 L0 -6 L-5.4 -2.8 L-4 -8.8 L-8.6 -12.8 L-2.6 -13.4 Z" fill="#fff" opacity=".85"/>`;
}
function cloud(k) {
  const c = shapeFor(k + 'c', () => circle(-12, -6, 12, 10) + ' ' + circle(4, -12, 15, 13) + ' ' + circle(17, -3, 11, 9) + ' ' + circle(0, 0, 19, 8));
  let s = `<path d="${c}" fill="#b7bac6" filter="url(#mg-crayon)"/><path d="${c}" fill="none" stroke="#6c7080" stroke-width="2"/>`;
  for (const [x, y] of [[-12, 14], [0, 18], [12, 13]]) s += `<path d="${shapeFor(k + 'd' + x, () => line(x, y, x - 3, y + 8, 0.5))}" stroke="${PALETTE.blue.main}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  return s;
}

function card(p, role) {
  const x = CX[p] - CW / 2, y = CT, k = 'card' + p;
  const act = canChoose(p) ? ` data-act="card:${p}"` : '';
  const selected = sel === p && !over();
  let s = `<g class="card${act ? ' pickable' : ''}${selected ? ' sel' : ''}"${act}>`;
  s += `<path d="${box(k, x, y, CW, CH, 1.2)}" fill="#fff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  if (!role) {
    // back: pencil hatching and a question mark
    s += `<clipPath id="clip${p}"><rect x="${x + 7}" y="${y + 7}" width="${CW - 14}" height="${CH - 14}"/></clipPath>`;
    s += `<path clip-path="url(#clip${p})" d="${shapeFor(k + 'hatch', () => {
      let d = '';
      for (let i = -CH; i < CW; i += 13) d += line(x + i, y, x + i + CH, y + CH, 0.8) + ' ';
      return d;
    })}" stroke="${PALETTE.pencil}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="${CX[p]}" cy="${y + CH / 2}" r="22" fill="#fff"/>`;
    s += txt(CX[p], y + CH / 2 + 13, '?', { size: 40, color: COLORS[p].main });
  } else {
    const pic = role === 'win' ? trophy() : role === 'lose' ? cloud(k) : banana(k);
    s += `<g transform="translate(${CX[p]} ${y + 50})">${pic}</g>`;
    const col = role === 'win' ? '#b98a12' : role === 'lose' ? '#6c7080' : GOLD;
    const label = t('wlb.card.' + role);
    s += txt(CX[p], y + CH - 18, label, { size: label.length > 6 ? 17 : 20, color: col, max: CW - 16, force: label.length > 6 });
  }
  if (st.tell[p] === 'nervous' && !over() && !waiting) {
    // sweat drops: a bot's tell
    for (const [dx, dy] of [[CW / 2 + 4, 10], [CW / 2 + 10, 26]]) {
      s += `<path d="M${CX[p] + dx} ${y + dy} q4 7 0 9 q-4 -2 0 -9 Z" fill="#9fdcf2" stroke="${PALETTE.blue.dark}" stroke-width="1.3"/>`;
    }
  }
  if (selected) s += `<path d="${shapeFor(k + 'sel', () => circle(CX[p], y + CH / 2, CW / 2 + 10, CH / 2 + 8, 0.04))}" stroke="${COLORS[st.win].main}" stroke-width="3.5" fill="none" stroke-dasharray="7 6"/>`;
  if (over() && st.pick === p) {
    const ok = st.result.correct;
    s += `<path class="pop" d="${shapeFor(k + 'pick', () => circle(CX[p], y + CH / 2, CW / 2 + 9, CH / 2 + 7, 0.05))}" stroke="${COLORS[st.win].main}" stroke-width="4" fill="none"/>`;
    s += `<g class="pop">` + (ok
      ? `<path d="M${CX[p] + 22} ${y + CH - 6} l9 10 l18 -26" stroke="#2a9d48" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M${CX[p] + 24} ${y + CH - 14} l20 20 M${CX[p] + 44} ${y + CH - 14} l-20 20" stroke="${PALETTE.red.main}" stroke-width="6" fill="none" stroke-linecap="round"/>`) + '</g>';
  }
  return s + '</g>';
}

const CHIP_H = 32, CHIP_GAP = 5, CHIP_Y = 168;
function chips(p) {
  let s = '';
  WLB.PITCHES.forEach((id, i) => {
    const x = CX[p] - 55, y = CHIP_Y + i * (CHIP_H + CHIP_GAP);
    s += `<g class="chip" data-act="pitch:${p}:${id}">`;
    s += `<path d="${box('chip' + p + id, x, y, 110, CHIP_H, 0.9)}" fill="#fff" stroke="${COLORS[p].main}" stroke-width="2.2" stroke-linejoin="round"/>`;
    s += txt(CX[p], y + 22, t('wlb.chip.' + id), { size: 18, color: COLORS[p].dark, max: 100 });
    s += '</g>';
  });
  return s;
}
function lines(p, key, color = '#777') {
  return t(key).split('|').map((l, i) => txt(CX[p], CHIP_Y + 26 + i * 24, l, { size: 20, color, weight: 600, max: 112 })).join('');
}

function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let s = '';
  for (const p of [0, 1, 2]) s += card(p, faceUp(p) ? st.roles[p] : null);

  if (!waiting) {
    // captions under the cards: who guesses, what each suspect said last
    for (const p of [0, 1, 2]) {
      if (p === st.win) { s += txt(CX[p], 156, t('wlb.cap.win'), { size: 20, color: COLORS[p].main, max: 112 }); continue; }
      const last = st.said[p][st.said[p].length - 1];
      s += last ? txt(CX[p], 156, `«${t('wlb.chip.' + last)}»`, { size: 18, color: COLORS[p].dark, max: 114 })
        : txt(CX[p], 156, t('wlb.cap.quiet'), { size: 18, color: '#999', weight: 600, max: 112 });
    }
  }

  if (peekActive()) s += peekLayer();
  else if (!waiting && !over()) {
    for (const p of WLB.suspects(st)) if (canSpeak(p)) s += chips(p);
    const w = st.win;
    if (isLocal(w) && canAct()) s += lines(w, 'wlb.hint.pick', COLORS[w].dark);
    else if (isBot(w) && st.oneWord && !WLB.allSpoke(st)) s += lines(w, 'wlb.hint.lastword');
    if (sel !== null && canChoose(sel)) s += button('confirm', 70, 318, 220, 38, t('wlb.confirm', { name: name(sel) }), { color: COLORS[w], size: 21 });
  }
  svg.innerHTML = s;
  renderPlayers();
}

function peekLayer() {
  const p = peeker(), c = COLORS[p];
  if (peek.shown) {
    let s = `<rect x="0" y="${CHIP_Y - 4}" width="${W}" height="${H - CHIP_Y + 4}" fill="var(--paper)"/>`;
    s += txt(W / 2, CHIP_Y + 40, t('wlb.cover.know'), { size: 21, color: c.dark, weight: 600 });
    return s + button('hide', 70, 268, 220, 44, t('wlb.cover.hide'), { color: c });
  }
  let s = `<path d="${box('cover', 8, 4, W - 16, H - 8, 1.4)}" fill="#f6f5f0" stroke="${PALETTE.pencil}" stroke-width="2.5"/>`;
  s += `<g transform="translate(${W / 2} 92) scale(1.5)">${banana('coverb')}</g>`;
  s += txt(W / 2, 168, t('wlb.cover.title'), { size: 24, color: '#666' });
  s += txt(W / 2, 212, name(p), { size: 40, color: c.main });
  s += txt(W / 2, 246, t('wlb.cover.away'), { size: 20, color: '#888', weight: 600 });
  return s + button('peek', 70, 272, 220, 46, t('wlb.cover.btn'), { color: c });
}

function renderPlayers() {
  for (const p of [0, 1, 2]) {
    const el = $(`.player.p${p}`);
    const active = !st || waiting ? true : peekActive() ? p === peeker() : over() ? st.result.winners.includes(p) : true;
    el.classList.toggle('active', active);
    const m = moods[p];
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose: m.pose, face: p === 2 ? 'left' : 'right', seed: 11 + p * 31 });
    el.querySelector('.score').textContent = st && !waiting ? plural(st.scores[p], 'wlb.wins') : '';
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const [text, color] = statusLine();
  const status = $('#status');
  status.textContent = text;
  status.style.color = color;

  $('#undo').disabled = online() || sel === null || !canAct() || !isLocal(st.win);
  $('#humans').disabled = online();
  $('#level').disabled = !canRestart();
  $('#level-field').hidden = !online() && cfg.humans === 3;
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('wlb.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('wlb.online.note') : '';
}

function statusLine() {
  if (online() && !sess.connected) return [t('wlb.online.wait'), INK];
  if (!st || waiting || over()) return ['', INK];
  if (peekActive()) return [t('wlb.st.peek', { name: name(peeker()) }), COLORS[peeker()].main];
  const w = st.win, c = COLORS[w].main;
  if (isLocal(w)) return [localCount() > 1 ? t('wlb.st.guess', { name: name(w) }) : t('wlb.st.guess.you'), c];
  if (isBot(w)) {
    const silent = WLB.suspects(st).filter((p) => isLocal(p) && !st.said[p].length);
    if (silent.length) return [localCount() > 1 ? t('wlb.st.lastword', { name: name(silent[0]) }) : t('wlb.st.lastword.you'), COLORS[silent[0]].main];
    return [t(WLB.allSpoke(st) ? 'wlb.st.thinking' : 'wlb.st.listen', { name: name(w) }), c];
  }
  return [mySeat() === w ? '' : t('wlb.st.convince', { name: name(w) }), c];
}

// ---------- reactions ----------
const bubbleTimers = [];
function say(p, key, ms = 2200) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), ms);
}
const hush = () => document.querySelectorAll('.player .bubble').forEach((b) => b.classList.remove('show'));
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const later = [];
const after = (ms, fn) => later.push(setTimeout(fn, ms));
const clearLater = () => { later.forEach(clearTimeout); later.length = 0; };

// Fire the visual side of whatever changed between two states (local, host and guest alike).
function visuals(prev, next) {
  const fresh = !prev || prev.deal !== next.deal;
  if (fresh) {
    clearLater(); hush(); clearTimeout(resultTimer);
    $('#result').hidden = true;
    sel = null; shapes = {};
    for (const p of [0, 1, 2]) {
      if (p === next.win) setMood(p, 'worried');
      else if (next.tell[p]) setMood(p, next.tell[p] === 'nervous' ? 'worried' : 'smug');
      else setMood(p, 'neutral');
    }
    after(500, () => say(next.win, 'wlb.say.think', 1600));
    for (const p of [0, 1, 2]) if (next.tell[p] && Math.random() < 0.6) after(1400 + p * 300, () => say(p, 'wlb.say.' + next.tell[p], 1400));
  }
  for (const p of [0, 1, 2]) {
    const from = fresh ? 0 : prev.said[p].length;
    if (next.said[p].length > from) {
      const id = next.said[p][next.said[p].length - 1];
      setMood(p, id === 'bluff' ? 'smug' : next.tell[p] === 'nervous' ? 'worried' : 'happy', id === 'liar' ? 'point' : id === 'bluff' ? 'down' : 'wave');
      say(p, 'wlb.say.' + id);
      if (moods[next.win].pose !== 'point') setMood(next.win, 'worried');
    }
  }
  if (next.phase === 'over' && (fresh || prev.phase !== 'over')) finishVisuals(next);
}

function finishVisuals(s) {
  hush(); clearLater();
  const { correct, banana, lose, winners } = s.result;
  for (const p of [0, 1, 2]) setMood(p, winners.includes(p) ? 'happy' : 'sad', winners.includes(p) ? 'up' : 'down');
  if (correct) { say(s.win, 'wlb.say.right'); after(700, () => say(banana, 'wlb.say.banana')); after(1300, () => say(lose, 'wlb.say.lost')); }
  else { setMood(lose, 'smug', 'up'); say(lose, 'wlb.say.trick'); after(700, () => say(s.win, 'wlb.say.fooled')); after(1300, () => say(banana, 'wlb.say.lost')); }
  resultText(s);
  resultTimer = setTimeout(() => { if (st && over()) $('#result').hidden = false; }, 1500);
}
function resultText(s) {
  const { correct, banana, lose } = s.result;
  const title = $('#result-text'), sub = $('#result-sub');
  title.textContent = t(correct ? 'wlb.res.right' : 'wlb.res.wrong', { name: name(banana) });
  title.style.color = correct ? GOLD : COLORS[lose].main;
  sub.textContent = correct ? t('wlb.res.both', { a: name(s.win), b: name(banana) }) : t('wlb.res.lose', { name: name(lose) });
}

// ---------- flow ----------
function commit(prev) {
  visuals(prev, st);
  render();
  if (online() && sess.host) sendState();
  scheduleBots();
}

function newRound(reset) {
  clearTimeout(botTimer);
  const prev = st;
  const scores = reset || !st ? [0, 0, 0] : st.scores;
  const round = reset || !st ? 1 : st.round + 1;
  st = WLB.create({ bots: [0, 1, 2].map(isBot), level: cfg.level, scores, round });
  st.deal = ++dealNo;
  pending = false; waiting = false;
  // Hot-seat: if a human here guesses, the human suspects here peek one by one behind a cover.
  const peekers = online() || !isLocal(st.win) ? [] : WLB.suspects(st).filter(isLocal);
  peek = peekers.length ? { queue: peekers, i: 0, shown: false } : null;
  commit(prev);
}

// The authoritative side applies an action; actor = the seat that sent it.
function perform(a, actor) {
  if (!st || over()) return false;
  const prev = WLB.clone(st);
  if (a.t === 'pitch') {
    if (a.p !== actor || !WLB.pitch(st, a.p, a.id)) return false;
  } else if (a.t === 'pick') {
    if (st.win !== actor || !WLB.pick(st, a.target)) return false;
    sel = null;
    if (!online()) { WLB.learn(cfg.model, st); saveCfg(); }
    else WLB.learn(netModel, st);
  } else return false;
  commit(prev);
  return true;
}

function localAction(a, actor) {
  if (!canAct()) return;
  if (online() && !sess.host) {
    pending = true;
    sess.send('move', { n: st.n, deal: st.deal, a });
    render();
    return;
  }
  perform(a, actor);
}

function scheduleBots() {
  clearTimeout(botTimer);
  if (!authority() || !st || over() || peekActive() || (online() && !sess.connected)) return;
  const quiet = WLB.suspects(st).filter((p) => isBot(p) && !st.said[p].length);
  if (quiet.length) {
    const p = quiet[0];
    botTimer = setTimeout(() => perform({ t: 'pitch', p, id: WLB.aiPitch(st, p) }, p), 900 + Math.random() * 900);
    return;
  }
  if (isBot(st.win)) {
    if (!WLB.allSpoke(st)) return;
    const w = st.win;
    botTimer = setTimeout(() => {
      say(w, 'wlb.say.think', 1200);
      botTimer = setTimeout(() => {
        const target = WLB.aiGuess(st, online() ? netModel : cfg.model);
        sel = target; setMood(w, 'worried', 'point'); render();
        botTimer = setTimeout(() => perform({ t: 'pick', target }, w), 700);
      }, 1200);
    }, 500);
    return;
  }
  // A human guesses: a bot suspect may chip in once more while they hesitate.
  const chatty = WLB.suspects(st).filter((p) => isBot(p) && st.said[p].length === 1);
  if (chatty.length) {
    const p = chatty[Math.floor(Math.random() * chatty.length)];
    botTimer = setTimeout(() => perform({ t: 'pitch', p, id: WLB.aiPitch(st, p) }, p), 5000 + Math.random() * 3000);
  }
}

function undo() {
  if (online() || sel === null || !canAct() || !isLocal(st.win)) return;
  sel = null;
  setMood(st.win, 'worried');
  render();
}

const canRestart = () => !online() || sess.host;
function restart() { if (canRestart()) newRound(true); }
function again() { if (canRestart()) newRound(false); }

// ---------- online ----------
// Host is authoritative and deals; the guest only sees its own card (plus the public one).
function sendState() {
  if (!sess?.connected) return;
  sess.send('state', { st: WLB.view(st, 1), names: cfg.names });
}
function onSession(s) {
  sess = s;
  clearTimeout(botTimer);
  s.on('status', () => { render(); scheduleBots(); });
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
    scheduleBots();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prev = waiting ? null : st;
    waiting = false; pending = false; peek = null;
    remoteNames[0] = d.names[0] || '';
    st = d.st;
    visuals(prev, st);
    if (sel !== null && !canChoose(sel)) sel = null;
    render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (!s.host) return;
    if (d.n !== st.n || d.deal !== st.deal || !perform(d.a, 1)) sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newRound(true);
  else {
    waiting = true; peek = null; sel = null;
    clearLater(); hush(); $('#result').hidden = true;
    for (const p of [0, 1, 2]) setMood(p, 'neutral');
    render();
    s.send('resync');
  }
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  const a = evt.target.closest('[data-act]')?.dataset.act;
  if (!a) return;
  const [kind, x, y] = a.split(':');
  if (kind === 'peek' && peekActive()) { peek.shown = true; render(); return; }
  if (kind === 'hide' && peekActive()) {
    peek.i++; peek.shown = false;
    render(); scheduleBots();
    return;
  }
  if (kind === 'pitch') return localAction({ t: 'pitch', p: +x, id: y }, +x);
  if (kind === 'card') {
    const p = +x;
    if (!canChoose(p)) return;
    sel = sel === p ? null : p;
    if (sel !== null) { setMood(st.win, 'worried', 'point'); say(st.win, 'wlb.say.select', 1200); }
    render();
    return;
  }
  if (kind === 'confirm' && sel !== null) localAction({ t: 'pick', target: sel }, st.win);
});

$('#humans').addEventListener('change', (e) => { cfg.humans = +e.target.value; saveCfg(); newRound(true); });
$('#level').addEventListener('change', (e) => { cfg.level = e.target.value; saveCfg(); if (canRestart()) newRound(true); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', again);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    render();
  }));
document.addEventListener('mg:lang', () => { if (!st) return; if (!waiting && over()) resultText(st); render(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#humans').value = cfg.humans;
$('#level').value = cfg.level;
newRound(true);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; waiting = false; pending = false; newRound(true); },
});
if (!online()) showOnce('how', SLUG);
