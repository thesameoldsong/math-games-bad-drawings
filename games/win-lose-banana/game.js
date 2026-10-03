import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { WLB } from './engine.js';
import './strings.js';

const SLUG = 'win-lose-banana';
const COLORS = [PALETTE.blue, PALETTE.red, PALETTE.green];
const INK = PALETTE.ink;
const GOLD = 'var(--wlb-gold)';
const W = 360, H = 360;
const CX = [60, 180, 300], CW = 92, CH = 126, CT = 8;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ humans: 1, netSeats: 3, level: 'normal', names: ['', '', ''], model: {} },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (![1, 2, 3].includes(cfg.humans)) cfg.humans = 1;
if (![2, 3].includes(cfg.netSeats)) cfg.netSeats = 3;
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
// Online, up to three devices. Who plays a seat is decided at the deal (st.bots): a seat without a device
// is the computer's for the whole round; a guest who joins mid-round plays from the next round.
// A guest who drops mid-round keeps the seat for TAKEOVER_MS, then the computer finishes the round for them.
const TAKEOVER_MS = 8000;
let restored = false;     // host: the match came back from sessionStorage after a reload
let gathering = false;   // host's 3-seat lobby: the "seats filling up" dialog is open, nobody moves yet
let away = new Set();    // seats whose device dropped (host's truth, mirrored to guests)
let waitSeats = new Set(); // seats with a device that is watching this round (joined mid-round)
const taken = new Set(); // host: seats the computer took over in this round
const takeTimers = {};
let netMax = 3, netHere = []; // guest: room size and seats with a device, as the host reports them
const seatCount = () => (!online() ? 3 : sess.host ? sess.maxPlayers : netMax);

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const hotBot = (p) => (cfg.humans === 1 ? p > 0 : cfg.humans === 2 ? p === 2 : false);
const isBot = (p) => (online() ? !!st?.bots?.[p] : hotBot(p));
const isRemote = (p) => online() && !isBot(p) && p !== mySeat();
const isLocal = (p) => !isBot(p) && !isRemote(p);
const authority = () => !online() || sess.host;
const over = () => st.phase === 'over';
const peekActive = () => !!peek && peek.i < peek.queue.length;
const peeker = () => (peekActive() ? peek.queue[peek.i] : -1);
const localCount = () => [0, 1, 2].filter(isLocal).length;
// While the host gathers players, seats are named after the devices at the table, not the provisional deal.
const seated = (p) => online() && gathering && (p === mySeat() || (sess.host ? sess.seats() : netHere).includes(p));
function name(p) {
  if (isBot(p) && !seated(p)) return t('wlb.cpu' + (p === 1 ? 1 : 2));
  if (online() && p === mySeat()) return cfg.names[p]?.trim() || t('net.you');
  const n = online() ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('wlb.p' + p);
}
// Host: which seats the computer plays in a fresh deal.
const dealBots = () => [0, 1, 2].map((p) => (online() ? p > 0 && (p >= sess.maxPlayers || !sess.seats().includes(p)) : hotBot(p)));
// Online the round runs while connected — or, on the host, when the computer plays every other seat: in a 3-seat
// room once the host has started ("let's play"), in a 2-seat room only after it took over a guest who left
// (a fresh 2-seat room waits for its guest, so the first round isn't played before they arrive).
const live = () => !online() || sess.connected ||
  (sess.host && !!st && [1, 2].every((p) => st.bots[p]) && (sess.maxPlayers > 2 || taken.size > 0));
const canAct = () => !!st && !waiting && !over() && !pending && !peekActive() && live() && !(online() && gathering);
const canSpeak = (p) => canAct() && isLocal(p) && WLB.canPitch(st, p, 'me');
const canChoose = (p) => canAct() && isLocal(st.win) && WLB.canPick(st, p);

// Is p's card face up on this screen?
function faceUp(p) {
  if (waiting) return false;
  if (online() && gathering) return false;
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
  s += `<path d="${box('btn' + act + x + y + w, x, y, w, h, 1)}" fill="${primary ? color.main : 'var(--card)'}" stroke="${color.text}" stroke-width="2.5" stroke-linejoin="round"/>`;
  s += txt(x + w / 2, y + h / 2 + size * 0.34, label, { size, color: primary ? 'var(--on-accent)' : color.text, max: w - 14 });
  return s + '</g>';
}

// Pictures on the card faces (our own doodles), centred at (0, 0).
function banana(k) {
  const outline = 'M-34 -14 C-30 18 20 28 36 -6 C18 8 -14 6 -34 -14 Z';
  return `<path d="${outline}" fill="var(--wlb-banana)" filter="url(#mg-crayon)"/>` +
    `<path d="${outline}" fill="none" stroke="var(--wlb-banana-edge)" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="${shapeFor(k + 'h', () => line(-22, 2, 14, 10, 1.2))}" stroke="var(--wlb-banana-edge)" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>` +
    `<path d="${shapeFor(k + 's', () => line(35, -6, 41, -16, 0.6))}" stroke="var(--wlb-stem)" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<circle cx="-33" cy="-13" r="2.6" fill="var(--wlb-stem)"/>`;
}
function trophy() {
  const cup = 'M-20 -24 L20 -24 C20 -2 10 6 0 6 C-10 6 -20 -2 -20 -24 Z';
  return `<path d="M-20 -18 C-33 -18 -31 -2 -15 0 M20 -18 C33 -18 31 -2 15 0" stroke="var(--wlb-trophy)" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="${cup}" fill="var(--wlb-trophy-fill)" filter="url(#mg-crayon)"/><path d="${cup}" fill="none" stroke="var(--wlb-trophy)" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M0 6 L0 16 M-12 19 L12 19" stroke="var(--wlb-trophy)" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M0 -19 L2.6 -13.4 L8.6 -12.8 L4 -8.8 L5.4 -2.8 L0 -6 L-5.4 -2.8 L-4 -8.8 L-8.6 -12.8 L-2.6 -13.4 Z" fill="#fff" opacity=".85"/>`;
}
function cloud(k) {
  const c = shapeFor(k + 'c', () => circle(-12, -6, 12, 10) + ' ' + circle(4, -12, 15, 13) + ' ' + circle(17, -3, 11, 9) + ' ' + circle(0, 0, 19, 8));
  let s = `<path d="${c}" fill="var(--wlb-cloud)" filter="url(#mg-crayon)"/><path d="${c}" fill="none" stroke="var(--wlb-cloud-edge)" stroke-width="2"/>`;
  for (const [x, y] of [[-12, 14], [0, 18], [12, 13]]) s += `<path d="${shapeFor(k + 'd' + x, () => line(x, y, x - 3, y + 8, 0.5))}" stroke="${PALETTE.blue.main}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  return s;
}

function card(p, role) {
  const x = CX[p] - CW / 2, y = CT, k = 'card' + p;
  const act = canChoose(p) ? ` data-act="card:${p}"` : '';
  const selected = sel === p && !over();
  let s = `<g class="card${act ? ' pickable' : ''}${selected ? ' sel' : ''}"${act}>`;
  s += `<path d="${box(k, x, y, CW, CH, 1.2)}" fill="var(--card)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  if (!role) {
    // back: pencil hatching and a question mark
    s += `<clipPath id="clip${p}"><rect x="${x + 7}" y="${y + 7}" width="${CW - 14}" height="${CH - 14}"/></clipPath>`;
    s += `<path clip-path="url(#clip${p})" d="${shapeFor(k + 'hatch', () => {
      let d = '';
      for (let i = -CH; i < CW; i += 13) d += line(x + i, y, x + i + CH, y + CH, 0.8) + ' ';
      return d;
    })}" stroke="${PALETTE.pencil}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    s += `<circle cx="${CX[p]}" cy="${y + CH / 2}" r="22" fill="var(--card)"/>`;
    s += txt(CX[p], y + CH / 2 + 13, '?', { size: 40, color: COLORS[p].main });
  } else {
    const pic = role === 'win' ? trophy() : role === 'lose' ? cloud(k) : banana(k);
    s += `<g transform="translate(${CX[p]} ${y + 50})">${pic}</g>`;
    const col = role === 'win' ? 'var(--wlb-trophy)' : role === 'lose' ? 'var(--wlb-cloud-edge)' : GOLD;
    const label = t('wlb.card.' + role);
    s += txt(CX[p], y + CH - 18, label, { size: label.length > 6 ? 17 : 20, color: col, max: CW - 16, force: label.length > 6 });
  }
  if (st.tell[p] === 'nervous' && !over() && !waiting && !(online() && gathering)) {
    // sweat drops: a bot's tell
    for (const [dx, dy] of [[CW / 2 + 4, 10], [CW / 2 + 10, 26]]) {
      s += `<path d="M${CX[p] + dx} ${y + dy} q4 7 0 9 q-4 -2 0 -9 Z" fill="var(--wlb-drop)" stroke="${PALETTE.blue.text}" stroke-width="1.3"/>`;
    }
  }
  if (selected) s += `<path d="${shapeFor(k + 'sel', () => circle(CX[p], y + CH / 2, CW / 2 + 10, CH / 2 + 8, 0.04))}" stroke="${COLORS[st.win].main}" stroke-width="3.5" fill="none" stroke-dasharray="7 6"/>`;
  if (over() && st.pick === p) {
    const ok = st.result.correct;
    s += `<path class="pop" d="${shapeFor(k + 'pick', () => circle(CX[p], y + CH / 2, CW / 2 + 9, CH / 2 + 7, 0.05))}" stroke="${COLORS[st.win].main}" stroke-width="4" fill="none"/>`;
    s += `<g class="pop">` + (ok
      ? `<path d="M${CX[p] + 22} ${y + CH - 6} l9 10 l18 -26" stroke="var(--ok)" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
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
    s += `<path d="${box('chip' + p + id, x, y, 110, CHIP_H, 0.9)}" fill="var(--card)" stroke="${COLORS[p].main}" stroke-width="2.2" stroke-linejoin="round"/>`;
    s += txt(CX[p], y + 22, t('wlb.chip.' + id), { size: 18, color: COLORS[p].text, max: 100 });
    s += '</g>';
  });
  return s;
}
function lines(p, key, color = 'var(--wlb-hint)') {
  return t(key).split('|').map((l, i) => txt(CX[p], CHIP_Y + 26 + i * 24, l, { size: 20, color, weight: 600, max: 112 })).join('');
}

function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let s = '';
  for (const p of [0, 1, 2]) s += card(p, faceUp(p) ? st.roles[p] : null);

  if (!waiting && !(online() && gathering)) {
    // captions under the cards: who guesses, what each suspect said last
    for (const p of [0, 1, 2]) {
      if (p === st.win) { s += txt(CX[p], 156, t('wlb.cap.win'), { size: 20, color: COLORS[p].main, max: 112 }); continue; }
      const last = st.said[p][st.said[p].length - 1];
      s += last ? txt(CX[p], 156, `«${t('wlb.chip.' + last)}»`, { size: 18, color: COLORS[p].text, max: 114 })
        : txt(CX[p], 156, t('wlb.cap.quiet'), { size: 18, color: 'var(--muted-2)', weight: 600, max: 112 });
    }
  }

  if (peekActive()) s += peekLayer();
  else if (!waiting && !over() && !gathering) {
    for (const p of WLB.suspects(st)) if (canSpeak(p)) s += chips(p);
    const w = st.win;
    if (isLocal(w) && canAct()) s += lines(w, 'wlb.hint.pick', COLORS[w].text);
    else if (isBot(w) && st.oneWord && !WLB.allSpoke(st)) s += lines(w, 'wlb.hint.lastword');
    if (sel !== null && canChoose(sel)) s += button('confirm', 70, 318, 220, 38, t('wlb.confirm', { name: name(sel) }), { color: COLORS[w], size: 21 });
  }
  svg.innerHTML = s;
  // public round id for tests/debugging: deal number, round, moves made
  svg.dataset.round = waiting ? '' : `${st.deal}:${st.round}:${st.n}`;
  renderPlayers();
}

function peekLayer() {
  const p = peeker(), c = COLORS[p];
  if (peek.shown) {
    let s = `<rect x="0" y="${CHIP_Y - 4}" width="${W}" height="${H - CHIP_Y + 4}" fill="var(--paper)"/>`;
    s += txt(W / 2, CHIP_Y + 40, t('wlb.cover.know'), { size: 21, color: c.text, weight: 600 });
    return s + button('hide', 70, 268, 220, 44, t('wlb.cover.hide'), { color: c });
  }
  let s = `<path d="${box('cover', 8, 4, W - 16, H - 8, 1.4)}" fill="var(--wlb-cover)" stroke="${PALETTE.pencil}" stroke-width="2.5"/>`;
  s += `<g transform="translate(${W / 2} 92) scale(1.5)">${banana('coverb')}</g>`;
  s += txt(W / 2, 168, t('wlb.cover.title'), { size: 24, color: 'var(--muted)' });
  s += txt(W / 2, 212, name(p), { size: 40, color: c.main });
  s += txt(W / 2, 246, t('wlb.cover.away'), { size: 20, color: 'var(--wlb-faint)', weight: 600 });
  return s + button('peek', 70, 272, 220, 46, t('wlb.cover.btn'), { color: c });
}

function renderPlayers() {
  for (const p of [0, 1, 2]) {
    const el = $(`.player.p${p}`);
    const active = !st || waiting ? true : peekActive() ? p === peeker() : over() ? st.result.winners.includes(p) : true;
    el.classList.toggle('active', active);
    const m = moods[p];
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose: m.pose, face: p === 2 ? 'left' : 'right', seed: 11 + p * 31 });
    const tag = seatTag(p);
    el.classList.toggle('away', online() && away.has(p));
    el.querySelector('.score').textContent = st && !waiting ? plural(st.scores[p], 'wlb.wins') + (tag ? ' · ' + tag : '') : tag;
    const inp = el.querySelector('.name');
    const mine = online() ? p === mySeat() : isLocal(p);
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = mine ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !mine;
  }
  const [text, color] = statusLine();
  const status = $('#status');
  status.textContent = text;
  status.style.color = color;

  $('#undo').disabled = online() || sel === null || !canAct() || !isLocal(st.win);
  $('#humans').disabled = online();
  $('#humans-field').hidden = online();
  $('#seats').disabled = !canRestart();
  $('#seats-field').hidden = !canRestart();
  $('#seats').value = String(online() ? sess.maxPlayers : cfg.netSeats);
  $('#level').disabled = !canRestart();
  $('#level-field').hidden = !online() && cfg.humans === 3;
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('wlb.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('wlb.online.note') : '';
}

// Small online note under a player: lost connection / watching until the next round.
function seatTag(p) {
  if (!online() || !st || waiting) return '';
  if (away.has(p)) return t('wlb.tag.away');
  if (waitSeats.has(p)) return t('wlb.tag.next');
  return '';
}

function statusLine() {
  if (!live()) return [t(sess.maxPlayers > 2 ? 'wlb.online.wait.n' : 'wlb.online.wait'), INK];
  if (online() && gathering && !waiting) return [t(sess.host ? 'wlb.online.gather.host' : 'wlb.online.gather'), INK];
  if (!st || waiting || over()) return ['', INK];
  if (online() && mySeat() >= seatCount()) return [t('wlb.online.watch'), INK];
  if (online() && isBot(mySeat())) return [t('wlb.online.next'), COLORS[mySeat()].main];
  const gone = [0, 1, 2].filter((p) => away.has(p) && !isBot(p));
  if (online() && gone.length) return [t('wlb.online.away', { name: name(gone[0]) }), COLORS[gone[0]].main];
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
    if (online() && gathering) { for (const p of [0, 1, 2]) setMood(p, 'neutral'); return; } // provisional deal: no reactions
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

// redo: deal this round again (same round number and scores) — used online before anyone has moved.
function newRound(reset, redo = false) {
  clearTimeout(botTimer);
  const prev = st;
  const scores = reset || !st ? [0, 0, 0] : st.scores;
  const round = reset || !st ? 1 : st.round + (redo ? 0 : 1);
  st = WLB.create({ bots: dealBots(), level: cfg.level, scores, round });
  st.deal = ++dealNo;
  taken.clear();
  if (online() && sess.host) waitSeats = new Set(sess.seats().filter((p) => p > 0 && p < sess.maxPlayers && st.bots[p]));
  pending = false; waiting = false;
  // Hot-seat: if a human here guesses, the human suspects here peek one by one behind a cover.
  const peekers = online() || !isLocal(st.win) ? [] : WLB.suspects(st).filter(isLocal);
  peek = peekers.length ? { queue: peekers, i: 0, shown: false } : null;
  commit(prev);
}

// The authoritative side applies an action; actor = the seat that sent it.
function perform(a, actor, fromNet = false) {
  if (!st || over()) return false;
  // a guest may only act for a seat a human plays this round, and not while the host gathers players
  if (fromNet && (isBot(actor) || gathering)) return false;
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
  if (!authority() || !st || over() || peekActive() || !live() || (online() && gathering)) return;
  const quiet = WLB.suspects(st).filter((p) => isBot(p) && !st.said[p].length);
  if (quiet.length) {
    const p = quiet[0];
    botTimer = setTimeout(() => perform({ t: 'pitch', p, id: WLB.aiPitch(st, p) }, p), 900 + Math.random() * 900);
    return;
  }
  if (isBot(st.win)) {
    const w = st.win;
    if (!WLB.allSpoke(st)) {
      // The computer took over a guesser who dropped mid-round: don't wait forever for silent suspects.
      if (!st.oneWord) botTimer = setTimeout(() => scheduleBotsGuess(w), 12000);
      return;
    }
    scheduleBotsGuess(w);
    return;
  }
  // A human guesses: a bot suspect may chip in once more while they hesitate.
  const chatty = WLB.suspects(st).filter((p) => isBot(p) && st.said[p].length === 1);
  if (chatty.length) {
    const p = chatty[Math.floor(Math.random() * chatty.length)];
    botTimer = setTimeout(() => perform({ t: 'pitch', p, id: WLB.aiPitch(st, p) }, p), 5000 + Math.random() * 3000);
  }
}

function scheduleBotsGuess(w) {
  botTimer = setTimeout(() => {
    say(w, 'wlb.say.think', 1200);
    botTimer = setTimeout(() => {
      const target = WLB.aiGuess(st, online() ? netModel : cfg.model);
      sel = target; setMood(w, 'worried', 'point'); render();
      botTimer = setTimeout(() => perform({ t: 'pick', target }, w), 700);
    }, 1200);
  }, 500);
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
// Host is authoritative and deals. Each guest gets its own view: a suspect knows both hidden cards, the
// guesser and anyone merely watching this round (seat played by the computer) see only the public one.
const allNames = () => [0, 1, 2].map((p) => (p === 0 ? cfg.names[0] : remoteNames[p]) || '');
function sendState(only) {
  if (!sess?.host || !st) return;
  for (const k of sess.seats()) {
    if (k === 0 || (only !== undefined && k !== only)) continue;
    const viewer = k < 3 && !st.bots[k] ? k : -1;
    sess.send('state', { st: WLB.view(st, viewer), names: allNames(), away: [...away], wait: [...waitSeats], gathering, max: sess.maxPlayers, here: sess.seats() }, { to: k });
  }
  persist();
}
// The host keeps the match in sessionStorage per room, so reloading the host's tab doesn't wipe it.
const roomKey = (s) => `mg-wlb-room-${s.code}`;
function persist() {
  if (!sess?.host || !st) return;
  sessionStorage.setItem(roomKey(sess), JSON.stringify({ st, names: remoteNames, netModel, gathering, max: sess.maxPlayers, taken: [...taken], wait: [...waitSeats] }));
}
// "let's play": deal the round for whoever is at the table now (nobody could act while gathering).
function endGathering() {
  if (!gathering || !sess?.host) return;
  gathering = false;
  if (st && st.n === 0 && !over()) newRound(false, true);
  else { sendState(); render(); scheduleBots(); }
}
function armTakeover(k, ms = TAKEOVER_MS) {
  clearTimeout(takeTimers[k]);
  takeTimers[k] = setTimeout(() => takeOver(k), ms);
}
function takeOver(k) {
  if (!sess?.host || !away.has(k) || !st || over() || st.bots[k]) return;
  st.bots[k] = true; taken.add(k);
  if (sel !== null && !canChoose(sel)) sel = null;
  render(); sendState(); scheduleBots();
}
function onSession(s) {
  sess = s;
  clearTimeout(botTimer);
  away = new Set(); waitSeats = new Set(); taken.clear();
  Object.values(takeTimers).forEach(clearTimeout);
  gathering = s.host && s.maxPlayers > 2;
  restored = false;
  s.on('status', () => {
    // host reload mid-match: net.js keeps the 3-seat dialog open; close it once someone is back
    if (restored && s.connected) { restored = false; document.getElementById('mg-online')?.close(); }
    render(); scheduleBots();
  });
  s.on('peer-join', ({ seat }) => {
    if (!s.host) { s.send('name', { name: cfg.names[s.seat] }); return; }
    away.delete(seat); clearTimeout(takeTimers[seat]);
    const fits = seat < s.maxPlayers;
    if (!gathering && fits && st.bots[seat] && !over()) {
      if (st.n === 0) return newRound(false, true);                       // nobody spoke yet: deal them in
      if (taken.has(seat)) { st.bots[seat] = false; taken.delete(seat); } // back in time: play on
      else waitSeats.add(seat);                                            // joins from the next round
    }
    sendState(); render(); scheduleBots();
  });
  s.on('peer-leave', ({ seat }) => {
    if (!s.host) { render(); return; }
    away.add(seat); waitSeats.delete(seat);
    clearTimeout(takeTimers[seat]);
    if (!gathering && !st.bots[seat] && !over()) armTakeover(seat);
    sendState(); render();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prev = waiting ? null : st;
    waiting = false; pending = false; peek = null;
    d.names.forEach((n, p) => { if (p !== s.seat) remoteNames[p] = n || ''; });
    away = new Set(d.away || []); waitSeats = new Set(d.wait || []); gathering = !!d.gathering; netMax = d.max || 3; netHere = d.here || [];
    st = d.st;
    visuals(prev, st);
    if (sel !== null && !canChoose(sel)) sel = null;
    render();
  });
  // guest → host: my name; host → guests: everybody's names
  s.on('name', (d, { seat }) => {
    if (!s.host || seat < 1 || seat > 2) return;
    remoteNames[seat] = String(d?.name || '').slice(0, 14);
    s.send('names', allNames());
    persist();
    render();
  });
  s.on('names', (names) => {
    if (s.host) return;
    names.forEach((n, p) => { if (p !== s.seat) remoteNames[p] = n || ''; });
    render();
  });
  s.on('move', (d, { seat }) => {
    if (!s.host || !st) return;
    if (!d || typeof d.a !== 'object' || !d.a || d.n !== st.n || d.deal !== st.deal || !perform(d.a, seat, true)) sendState(seat);
  });
  s.on('resync', (_, { seat }) => s.host && sendState(seat));
  const saved = s.host && JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
  if (saved?.st) {
    // host reload: carry on with the same match; human guests get a while to come back
    st = saved.st; dealNo = Math.max(dealNo, st.deal || 0);
    saved.names?.forEach((n, p) => { remoteNames[p] = n || ''; });
    netModel = saved.netModel || {};
    gathering = !!saved.gathering;
    (saved.taken || []).forEach((k) => taken.add(k));
    waitSeats = new Set(saved.wait || []);
    restored = !gathering;
    if (saved.max && saved.max !== s.maxPlayers) { cfg.netSeats = saved.max; s.setMaxPlayers(saved.max); }
    waiting = false; pending = false; peek = null; sel = null;
    visuals(null, st);
    for (const k of [1, 2]) if (!st.bots[k] && k < s.maxPlayers) { away.add(k); if (!gathering && !over()) armTakeover(k, 25000); }
    render();
  } else if (s.host) {
    netModel = {};
    newRound(true);
    // the "seats filling up" dialog is open; the round starts when the host closes it ("let's play")
    setTimeout(() => { if (gathering && !document.getElementById('mg-online')?.open) endGathering(); }, 0);
  } else {
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
$('#seats').addEventListener('change', (e) => {
  cfg.netSeats = +e.target.value; saveCfg();
  // online: the host resizes the room; the new size applies from a fresh game
  if (online() && sess.host) { sess.setMaxPlayers(cfg.netSeats); newRound(true); } else render();
});
$('#level').addEventListener('change', (e) => { cfg.level = e.target.value; saveCfg(); if (canRestart()) newRound(true); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', again);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) {
      if (sess.host) { sess.send('names', allNames()); persist(); }
      else sess.send('name', { name: inp.value });
    }
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
$('#seats').value = cfg.netSeats;
newRound(true);
mountOnline({
  slug: SLUG,
  button: $('#online'),
  maxPlayers: () => cfg.netSeats,
  onSession,
  onEnd: () => {
    sess = null; waiting = false; pending = false; gathering = false;
    away = new Set(); waitSeats = new Set(); taken.clear();
    Object.values(takeTimers).forEach(clearTimeout);
    newRound(true);
  },
});
document.getElementById('mg-online').addEventListener('close', endGathering);
if (!online()) showOnce('how', SLUG);
