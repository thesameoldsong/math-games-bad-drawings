import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { PII, N, CELLS } from './engine.js';
import './strings.js';

const SLUG = 'patterns-ii';
const KEY = 'mg-patterns-ii';
const CS = 60, M = 8, W = M * 2 + CS * N; // cell size, margin, board size
const COLORS = [
  PALETTE.blue, PALETTE.red,
  { main: '#3aa655', dark: '#1f7a37', fill: '#97d9a8' },
  { main: '#f08c1e', dark: '#b8600a', fill: '#f8c58c' },
  { main: '#8a5cc7', dark: '#5d3594', fill: '#c6aee6' },
];
const INK = PALETTE.ink;
const $ = (s) => document.querySelector(s);
const svg = $('#board');

const cfg = Object.assign({ designer: 'cpu', players: 2, bots: 1, level: 'normal', names: ['', '', '', '', ''] },
  JSON.parse(localStorage.getItem(KEY) || '{}'));
const saveCfg = () => localStorage.setItem(KEY, JSON.stringify(cfg));

let m;                         // match (full on host / hot-seat; a filtered view on an online guest)
let shapes = {};               // cached wobble per drawn element
let gtool = 'peek', dtool = 1; // guesser tool / designer symbol
let pending = new Set();       // squares marked "ask" (local actor only)
let draft = null;              // local designer's pattern in progress
let myGuess = null;            // online guest: own predictions (kept private until handed in)
let undoStack = [], undoOwner = '';
let uncovered = '';            // hot-seat: actor key that confirmed "it's me"
let viewSeat = null;           // done phase: whose sheet is shown
let snap = null;               // previous state summary for reactions
let botTimers = [];
let sureGiveUp = 0;
let sess = null, guestReady = false;
const remoteNames = ['', ''];
const moods = Array.from({ length: 5 }, () => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const isHost = () => !online() || sess.host;
const hotSeat = () => !online();
const R = () => m.round;
const roundKey = () => `${m.mid}:${m.rid}`; // a new match restarts rid, so tag it with the match id
const isBot = (p) => p >= m.humans;
const isRemote = (p) => online() && !isBot(p) && p !== sess.seat;
const isLocalHuman = (p) => p >= 0 && !isBot(p) && !isRemote(p);
const COLOR = (p) => (p >= 0 ? COLORS[p] : { main: INK, dark: INK, fill: '#ccc' });
function name(p) {
  if (p < 0) return t('pii.cpu.designer');
  if (isBot(p)) return t('pii.cpu', { n: m.seats - m.humans > 1 ? p - m.humans + 1 : '' }).trim();
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('pii.p' + p);
}
const sheet = (p) => R().sheets[p];
const playing = (p) => R().phase === 'guess' && !!sheet(p) && sheet(p).status === 'play';

// The seat that may act on this device right now (-1: nobody).
function actor() {
  if (!m) return -1;
  if (online() && (!sess.connected || (!sess.host && !guestReady))) return -1;
  const r = R();
  if (r.phase === 'design') return r.designer >= 0 && isLocalHuman(r.designer) ? r.designer : -1;
  if (r.phase !== 'guess') return -1;
  if (online()) return playing(sess.seat) ? sess.seat : -1;
  for (let p = 0; p < m.humans; p++) if (playing(p)) return p;
  return -1;
}
const actorKey = () => `${m.rid}:${R().phase}:${actor()}`;
const needsCover = () => hotSeat() && m.humans >= 2 && actor() >= 0 && uncovered !== actorKey();
const canEdit = () => actor() >= 0 && !needsCover();

function guessOf(p, c) {
  if (online() && !sess.host && p === sess.seat && R().phase === 'guess') return myGuess ? myGuess[c] : -1;
  return sheet(p).guess[c];
}
const guessCount = (p) => { let n = 0; for (let c = 0; c < CELLS; c++) if (guessOf(p, c) >= 0) n++; return n; };

// ---------- drawing ----------
const shapeFor = (k, make) => (shapes[k] ??= make());
const cxy = (c) => [M + (c % N) * CS + CS / 2, M + Math.floor(c / N) * CS + CS / 2];

function symbolSVG(s, cx, cy, color, k, scale = 1) {
  const z = scale, sw = (w) => (w * Math.max(z, 0.7)).toFixed(1);
  if (s === 0) {
    const d = shapeFor(`t${k}`, () => {
      const a = [0, -17], b = [17, 13], c = [-17, 13];
      return [line(...a, ...b, 1), line(...b, ...c, 1), line(...c, ...a, 1)].join(' ');
    });
    return `<path d="${d}" transform="translate(${cx} ${cy}) scale(${z})" fill="none" stroke="${color}" stroke-width="${sw(4.4) / z}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (s === 1) {
    const d = shapeFor(`c${k}`, () => circle(0, 0, 14.5, 14.5, 0.06));
    return `<g transform="translate(${cx} ${cy}) scale(${z})"><path d="${d}" fill="${color}" filter="url(#mg-crayon)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${sw(3.6) / z}"/></g>`;
  }
  if (s === 2) {
    const d = shapeFor(`p${k}`, () => line(-17, 0, 17, 0, 1.2) + ' ' + line(0, -17, 0, 17, 1.2));
    return `<path d="${d}" transform="translate(${cx} ${cy}) scale(${z})" fill="none" stroke="${color}" stroke-width="${sw(5) / z}" stroke-linecap="round"/>`;
  }
  const pts = shapeFor(`d${k}`, () => [[-11, -11], [11, -10], [0, 0], [-10, 11], [11, 11]].map(([x, y]) => [x + (Math.random() * 3 - 1.5), y + (Math.random() * 3 - 1.5)]));
  return `<g transform="translate(${cx} ${cy}) scale(${z})" fill="${color}">${pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.3"/>`).join('')}</g>`;
}
function symIcon(s, color = INK) {
  return `<svg viewBox="-24 -24 48 48" aria-hidden="true">${symbolSVG(s, 0, 0, color, 'icon' + s)}</svg>`;
}
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12.2c2.4-4.2 5.6-6.3 9.5-6.3s7.1 2.1 9.5 6.3c-2.4 4-5.6 6-9.5 6s-7.1-2-9.5-6z"/><circle cx="12" cy="12.1" r="3"/></svg>';
const ERASER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.4 4.6 20 10.2l-8.6 8.6H7.2L3.6 15.2z"/><path d="M9.6 9.4l5.6 5.6M11.4 18.8H20"/></svg>';
const DICE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/></svg>';
const BUCKET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11.5 11 4.5l7 7-6.3 6.3a1.6 1.6 0 0 1-2.3 0z"/><path d="M4 11.5h14M20.2 15.5c.8 1.3 1.2 2.1 1.2 2.7a1.2 1.2 0 0 1-2.4 0c0-.6.4-1.4 1.2-2.7z"/></svg>';

function cellBg(c, fill, extra = '') {
  const [x, y] = cxy(c);
  const d = shapeFor(`bg${c}`, () => {
    const h = CS / 2 - 3.5, j = () => (Math.random() * 2 - 1) * 1.2;
    return `M${x - h + j()} ${y - h + j()} L${x + h + j()} ${y - h + j()} L${x + h + j()} ${y + h + j()} L${x - h + j()} ${y + h + j()} Z`;
  });
  return `<path d="${d}" fill="${fill}" ${extra}/>`;
}
function tick(c, color, w = 3) { // the little "please show me" stroke in a square's lower-left corner
  const [x, y] = cxy(c);
  const d = shapeFor(`tk${c}`, () => line(x - CS / 2 + 6, y + CS / 2 - 15, x - CS / 2 + 15, y + CS / 2 - 6, 0.6));
  return `<path d="${d}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
}

function grid() {
  let s = '';
  for (let i = 0; i <= N; i++) {
    const p = M + i * CS, edge = i === 0 || i === N;
    const h = shapeFor(`gh${i}`, () => line(M - 2, p, W - M + 2, p, 1.6));
    const v = shapeFor(`gv${i}`, () => line(p, M - 2, p, W - M + 2, 1.6));
    s += `<path class="gl${edge ? ' edge' : ''}" d="${h}"/><path class="gl${edge ? ' edge' : ''}" d="${v}"/>`;
  }
  return s;
}

function boardSVG() {
  const r = R(), a = actor();
  let s = '';
  const mode = boardMode();
  if (mode === 'design') {
    for (let c = 0; c < CELLS; c++) s += `<g class="cell">${symbolSVG(draft[c], ...cxy(c), INK, c)}</g>`;
  } else if (mode === 'sheet' || mode === 'mysheet') {
    const p = mode === 'sheet' ? a : sess.seat, col = COLOR(p).main, sh = sheet(p);
    for (let c = 0; c < CELLS; c++) {
      if (sh.rev[c] >= 0) {
        s += cellBg(c, '#e9e5d8', 'filter="url(#mg-crayon)"') + tick(c, '#9a968a', 2.4);
        s += symbolSVG(sh.rev[c], ...cxy(c), INK, c);
        continue;
      }
      if (pending.has(c)) s += cellBg(c, col, 'opacity=".14"') + tick(c, col, 4);
      const g = guessOf(p, c);
      if (g >= 0) s += symbolSVG(g, ...cxy(c), col, c);
    }
  } else if (mode === 'owner') {
    for (let c = 0; c < CELLS; c++) s += symbolSVG(r.pattern[c], ...cxy(c), INK, c);
  } else if (mode === 'result') {
    const p = viewSeat;
    if (p == null || !sheet(p)) {
      for (let c = 0; c < CELLS; c++) s += symbolSVG(r.pattern[c], ...cxy(c), INK, c);
    } else {
      const col = COLOR(p).main, sh = sheet(p);
      for (let c = 0; c < CELLS; c++) {
        const truth = r.pattern[c], [x, y] = cxy(c);
        if (sh.rev[c] >= 0) { s += cellBg(c, '#e9e5d8', 'filter="url(#mg-crayon)"') + tick(c, '#9a968a', 2.4) + symbolSVG(truth, x, y, INK, c); continue; }
        const g = sh.guess[c];
        if (g < 0) { s += symbolSVG(truth, x, y, '#c9c6bd', c); continue; }
        if (g === truth) { s += cellBg(c, '#cdeccf') + symbolSVG(g, x, y, col, c); continue; }
        s += cellBg(c, '#fbd9dc') + symbolSVG(g, x - 6, y - 6, col, c, 0.72);
        s += symbolSVG(truth, x + 15, y + 15, INK, 'w' + c, 0.42);
        s += `<path d="${shapeFor('x' + c, () => line(x - 22, y + 10, x + 10, y - 22, 0.8))}" stroke="${PALETTE.red.dark}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
      }
    }
  }
  return s + grid();
}

// What the board shows on this device.
function boardMode() {
  const r = R(), a = actor();
  if (needsCover()) return 'blank';
  if (r.phase === 'design') return a >= 0 && draft ? 'design' : 'blank';
  if (r.phase === 'done') return 'result';
  if (a >= 0) return 'sheet';
  if (online() && (sess.host || guestReady)) {
    if (r.designer === sess.seat && r.pattern) return 'owner';
    if (sheet(sess.seat)) return 'mysheet';
  }
  return 'blank';
}

function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  svg.innerHTML = boardSVG();
  svg.classList.toggle('editable', canEdit());
  renderCover();
  renderPal();
  renderActs();
  renderPlayers();
  renderStatus();
  $('#undo').disabled = !(undoStack.length && undoOwner === actorKey() && canEdit());
  $('#new').disabled = !isHost();
  for (const id of ['designer', 'players', 'bots', 'level']) $('#' + id).disabled = !isHost();
  syncSettingsUI();
}

function renderCover() {
  const cov = $('#cover');
  cov.hidden = !needsCover();
  if (cov.hidden) return;
  const a = actor(), col = COLOR(a);
  $('#cover-title').textContent = t('pii.cover.title', { name: name(a) });
  $('#cover-title').style.color = col.main;
  $('#cover-note').textContent = t(R().phase === 'design' ? 'pii.cover.note.design' : 'pii.cover.note.guess');
  const b = $('#uncover');
  b.textContent = t('pii.cover.btn', { name: name(a) });
  b.style.background = col.main; b.style.borderColor = col.dark;
}

let palKey = '';
function renderPal() {
  const pal = $('#pal'), mode = canEdit() ? R().phase : '';
  const col = actor() >= 0 ? COLOR(actor()).main : INK;
  let html = '';
  if (mode === 'design') {
    html = [0, 1, 2, 3].map((s) => `<button class="pb${dtool === s ? ' on' : ''}" data-t="${s}" aria-label="${s}">${symIcon(s)}</button>`).join('') +
      `<span class="pgap"></span><button class="pb wide" data-t="random">${DICE}<span>${t('pii.random')}</span></button>` +
      `<button class="pb wide" data-t="fill">${BUCKET}<span>${t('pii.fill')}</span></button>`;
  } else if (mode === 'guess') {
    html = `<button class="pb wide peek${gtool === 'peek' ? ' on' : ''}" data-t="peek">${EYE}<span>${t('pii.tool.peek')}</span></button><span class="pgap"></span>` +
      [0, 1, 2, 3].map((s) => `<button class="pb${gtool === s ? ' on' : ''}" data-t="${s}" aria-label="${s}">${symIcon(s, col)}</button>`).join('') +
      `<span class="pgap"></span><button class="pb${gtool === 'erase' ? ' on' : ''}" data-t="erase" aria-label="${t('pii.tool.erase')}">${ERASER}</button>`;
  }
  const k = html + col;
  if (k !== palKey) { pal.innerHTML = html; palKey = k; }
  pal.style.setProperty('--pc', col);
  pal.classList.toggle('empty', !html);
  pal.classList.toggle('gone', R().phase === 'done');
}

let actsKey = '';
function renderActs() {
  const acts = $('#acts'), r = R();
  let html = '';
  if (canEdit() && r.phase === 'design') {
    html = `<button class="btn primary" data-a="design">${t('pii.design.done')}</button>`;
  } else if (canEdit() && r.phase === 'guess') {
    const n = pending.size;
    html = `<button class="btn${sureGiveUp ? ' warn' : ''}" data-a="giveup">${t(sureGiveUp ? 'pii.giveup.sure' : 'pii.giveup')}</button>` +
      `<button class="btn ask" data-a="ask"${n ? '' : ' disabled'}>${n ? t('pii.ask', { n }) : t('pii.ask0')}</button>` +
      `<button class="btn primary" data-a="done">${t('pii.done')}</button>`;
  } else if (r.phase === 'done') {
    html = `<button class="btn" data-a="results">${t('pii.results')}</button>` +
      (isHost() ? `<button class="btn primary" data-a="again">${t(PII.isMatchOver(m) ? 'pii.again' : 'pii.next')}</button>` : '');
  }
  const col = actor() >= 0 ? COLOR(actor()) : COLORS[0];
  const k = html + col.main;
  if (k !== actsKey) { acts.innerHTML = html; actsKey = k; }
  acts.querySelectorAll('.btn.primary').forEach((b) => { b.style.background = col.main; b.style.borderColor = col.dark; });
  acts.classList.toggle('empty', !html);
}

const sgn = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0');
function cardLine(p) {
  const r = R();
  if (r.phase === 'done') {
    const sc = r.result.scores[p];
    return m.rounds > 1 ? `${sgn(sc)} · ${t('pii.card.total', { n: m.totals[p] })}` : plural(Math.abs(sc), 'pii.points').replace(/^\d+/, sgn(sc));
  }
  if (p === r.designer) return t(r.phase === 'design' ? 'pii.card.drawing' : 'pii.card.author');
  const sh = sheet(p);
  if (r.phase === 'design') return t('pii.card.wait');
  if (sh.status === 'done') return t('pii.card.done');
  if (sh.status === 'gaveup') return t('pii.card.gaveup');
  return t('pii.card.peeks', { n: sh.peeks });
}

function renderPlayers() {
  const n = m.seats, arena = $('#arena');
  arena.className = `arena pii-arena n${n}`;
  const cols = n === 4 ? 2 : n >= 3 ? 3 : 2;
  const r = R(), a = actor();
  for (let p = 0; p < 5; p++) {
    const el = $(`.player.p${p}`);
    el.hidden = p >= n;
    if (p >= n) continue;
    const flip = n > 2 ? p % cols === cols - 1 && !(n === 5 && p === 4) : p === 1;
    el.classList.toggle('flip', flip);
    const active = r.phase === 'done' ? viewSeat === p : r.phase === 'design' ? r.designer === p : a >= 0 ? a === p : playing(p);
    el.classList.toggle('active', active);
    el.classList.toggle('designer', p === r.designer);
    el.classList.toggle('pickable', r.phase === 'done');
    const mo = moods[p];
    const pose = mo.pose !== 'down' ? mo.pose : active && r.phase !== 'done' ? 'point' : 'down';
    const face = n === 2 ? (p === 0 ? 'right' : 'left') : flip ? 'left' : 'right';
    const fk = `${mo.mood}|${pose}|${face}`;
    const fig = el.querySelector('.fig');
    if (fig.dataset.k !== fk) { fig.innerHTML = figureSVG({ color: COLORS[p], mood: mo.mood, pose, face, seed: 11 + p * 31 }); fig.dataset.k = fk; }
    el.querySelector('.bubble').style.color = COLORS[p].main;
    el.querySelector('.score').textContent = cardLine(p);
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocalHuman(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocalHuman(p);
  }
}

function renderStatus() {
  const st = $('#status'), r = R(), a = actor();
  let txt = '', col = INK;
  if (online() && !sess.connected) txt = t('pii.online.wait');
  else if (needsCover()) { txt = t('pii.st.cover', { name: name(a) }); col = COLOR(a).main; }
  else if (r.phase === 'design') {
    if (a >= 0) { txt = t('pii.st.design.you'); col = COLOR(a).main; }
    else { txt = t('pii.st.design.them', { name: name(r.designer) }); col = COLOR(r.designer).main; }
  } else if (r.phase === 'guess') {
    if (a >= 0) { txt = (m.humans > 1 && hotSeat() ? name(a) + ': ' : '') + t(gtool === 'peek' ? 'pii.st.peek' : 'pii.st.guess'); col = COLOR(a).main; }
    else {
      const left = PII.guessers(r).filter((p) => playing(p));
      txt = left.length ? t('pii.st.wait.them', { names: left.map(name).join(', ') }) : t('pii.st.wait.others');
    }
  } else if (r.phase === 'done') {
    if (viewSeat == null || !sheet(viewSeat)) txt = t('pii.st.done.pattern');
    else { txt = t('pii.st.done.view', { name: name(viewSeat) }); col = COLOR(viewSeat).main; }
  }
  st.textContent = txt;
  st.style.color = col;
}

// ---------- reactions ----------
const bubbleTimers = [];
function say(p, key, delay = 0) {
  if (p < 0 || p >= m.seats) return;
  setTimeout(() => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), m.seats > 2 ? 1600 : 2000);
  }, delay);
}
const setMood = (p, mood, pose = 'down') => { if (p >= 0) moods[p] = { mood, pose }; };

function react() {
  const r = R();
  const cur = { rid: roundKey(), phase: r.phase, st: r.sheets.map((s) => s && s.status), pk: r.sheets.map((s) => s && s.peeks) };
  if (!snap || snap.rid !== cur.rid) {
    moods.forEach((_, p) => setMood(p, 'neutral'));
    if (cur.phase === 'guess' && r.designer >= 0) { setMood(r.designer, 'smug'); say(r.designer, 'pii.say.design', 300); }
  } else {
    if (snap.phase === 'design' && cur.phase === 'guess') { setMood(r.designer, 'smug'); say(r.designer, 'pii.say.design'); }
    let delay = 0;
    for (let p = 0; p < m.seats; p++) {
      if (snap.st[p] !== 'play') continue;
      if (cur.st[p] === 'done') { const bold = cur.pk[p] <= 12; setMood(p, bold ? 'happy' : 'neutral', bold ? 'wave' : 'down'); say(p, bold ? 'pii.say.bold' : 'pii.say.careful', delay); delay += 500; }
      else if (cur.st[p] === 'gaveup') {
        setMood(p, 'sad'); say(p, 'pii.say.giveup', delay);
        if (r.designer >= 0) { setMood(r.designer, 'worried'); say(r.designer, 'pii.say.ouch', delay + 900); }
        delay += 500;
      } else if (cur.pk[p] > snap.pk[p]) { setMood(p, 'neutral', 'point'); if (Math.random() < 0.45) say(p, 'pii.say.peek'); }
    }
    if (snap.phase !== 'done' && cur.phase === 'done') onRoundDone();
  }
  snap = cur;
}

function onRoundDone() {
  const r = R(), res = r.result, gs = PII.guessers(r);
  const best = Math.max(...gs.map((p) => res.scores[p]));
  // a few voices only, one after another, so bubbles on narrow screens don't pile up
  const gap = m.seats > 2 ? 1700 : 500;
  let delay = 300, talkers = 0;
  const talk = (p, key) => { if (talkers++ < 3) { say(p, key, delay); delay += gap; } };
  for (const p of gs) {
    const sc = res.scores[p], sh = sheet(p);
    if (sh.status === 'gaveup') setMood(p, 'sad');
    else if (sc === best && sc > 0) setMood(p, 'happy', 'up');
    else if (sc < 0) setMood(p, 'sad');
    else if (sc === 0) setMood(p, 'worried');
    else setMood(p, 'neutral', 'wave');
  }
  const winner = gs.find((p) => res.scores[p] === best && best > 0 && sheet(p).status !== 'gaveup');
  if (winner != null) talk(winner, 'pii.say.win');
  const worst = gs.filter((p) => p !== winner && sheet(p).status !== 'gaveup').sort((x, y) => res.scores[x] - res.scores[y])[0];
  if (worst != null && res.scores[worst] <= 0) talk(worst, res.scores[worst] < 0 ? 'pii.say.minus' : 'pii.say.zero');
  if (r.designer >= 0) {
    if (res.giveUps) setMood(r.designer, 'worried');
    else if (res.spread >= 6) { setMood(r.designer, 'smug', 'up'); talk(r.designer, 'pii.say.spread'); }
    else setMood(r.designer, 'neutral');
  }
  // default sheet to look at: mine, else the first human guesser, else the best one
  const mine = online() ? (sheet(sess.seat) ? sess.seat : null) : gs.find((p) => !isBot(p));
  viewSeat = mine ?? gs.find((p) => res.scores[p] === best) ?? null;
  fillResult();
  const rid = m.rid;
  setTimeout(() => { if (m.rid === rid && R().phase === 'done') $('#result').hidden = false; }, 1300);
}

function fillResult() {
  const r = R(), res = r.result, over = PII.isMatchOver(m);
  const sub = $('#result-sub'), txt = $('#result-text');
  sub.textContent = m.rounds > 1 ? t('pii.res.round', { i: m.roundNo + 1, n: m.rounds }) : '';
  sub.hidden = m.rounds <= 1;
  if (m.seats === 1) { txt.textContent = t('pii.res.solo', { n: sgn(res.scores[0]) }); txt.style.color = COLORS[0].main; }
  else if (over) {
    const lead = PII.leaders(m);
    txt.textContent = lead.length === 1 ? t('pii.res.win', { name: name(lead[0]) }) : t('pii.res.tie', { names: lead.map(name).join(', ') });
    txt.style.color = lead.length === 1 ? COLORS[lead[0]].main : INK;
  } else { txt.textContent = t('pii.res.round', { i: m.roundNo + 1, n: m.rounds }); txt.style.color = INK; sub.hidden = true; }
  const order = [...Array(m.seats).keys()].sort((a, b) => (over && m.rounds > 1 ? m.totals[b] - m.totals[a] : res.scores[b] - res.scores[a]));
  $('#result-list').innerHTML = order.map((p) => {
    let det;
    if (p === r.designer) det = t('pii.res.designer', { spread: res.spread }) + (res.giveUps ? t('pii.res.penalty', { p: PII.giveUpPenalty(res.giveUps) }) : '');
    else if (sheet(p).status === 'gaveup') det = t('pii.res.gaveup');
    else det = t('pii.res.line', res.per[p]);
    const tot = m.rounds > 1 ? `<span class="rtot">Σ ${m.totals[p]}</span>` : '';
    return `<div class="rrow" style="color:${COLORS[p].main}"><b class="rname">${esc(name(p))}</b><b class="rsc">${sgn(res.scores[p])}</b><span class="rdet">${det}</span>${tot}</div>`;
  }).join('');
  $('#again').textContent = t(over ? 'pii.again' : 'pii.next');
  $('#again').hidden = !isHost();
  $('#result-wait').hidden = isHost();
  if (!isHost()) $('#result-wait').textContent = t('pii.online.waitnew', { name: name(0) });
}
const esc = (s) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------- flow (host / hot-seat) ----------
function clearBots() { botTimers.forEach(clearTimeout); botTimers = []; }

function resetLocals() {
  pending = new Set(); draft = null; myGuess = Array(CELLS).fill(-1); undoStack = []; undoOwner = '';
  uncovered = ''; viewSeat = null; sureGiveUp = 0; gtool = 'peek';
  $('#result').hidden = true;
}

function seatsFromCfg() {
  if (online()) return { seats: Math.max(2, cfg.players), humans: 2 };
  const seats = cfg.designer === 'rotate' ? Math.max(2, cfg.players) : cfg.players;
  return { seats, humans: Math.max(1, seats - Math.min(cfg.bots, seats - 1)) };
}

function newMatch() {
  clearBots();
  const { seats, humans } = seatsFromCfg();
  const rotate = cfg.designer === 'rotate';
  m = PII.newMatch({ seats, cpuDesigner: !rotate, first: rotate && humans < seats ? humans : 0 });
  m.humans = humans; m.level = cfg.level; m.v = 0; m.mid = Math.random().toString(36).slice(2, 8);
  shapes = {}; snap = null;
  beginRound();
}

function beginRound() {
  clearBots();
  resetLocals();
  const r = R();
  if (r.designer < 0 || isBot(r.designer)) PII.setPattern(r, PII.generatePattern());
  else if (isLocalHuman(r.designer)) draft = Array(CELLS).fill(dtool === 0 ? 1 : 0);
  sync();
}

function scheduleBots() {
  const r = R(), rid = m.rid;
  if (r.phase !== 'guess') return;
  for (const p of PII.guessers(r)) {
    if (!isBot(p) || !playing(p) || botTimers[p]) continue;
    botTimers[p] = setTimeout(() => {
      if (m.rid !== rid || !playing(p)) return;
      PII.aiTurn(R(), p, m.level || 'normal');
      sync();
    }, 2500 + Math.random() * 3500 + (p - m.humans) * 900);
  }
}

// Apply host-side consequences, react, redraw, tell the guest.
function sync() {
  if (isHost() && m.round.phase === 'guess') {
    scheduleBots();
    if (PII.allDone(m.round)) { clearBots(); PII.finishRound(m); }
  }
  react();
  render();
  sendState();
}

function nextOrAgain() {
  if (!isHost()) return;
  if (PII.isMatchOver(m)) newMatch();
  else { PII.nextRound(m); botTimers = []; beginRound(); }
}

// ---------- local actions ----------
function pushUndo(items) {
  if (!items.length) return;
  if (undoOwner !== actorKey()) { undoStack = []; undoOwner = actorKey(); }
  undoStack.push(items);
}

function setGuessLocal(p, c, s) {
  if (online() && !sess.host) { if (sheet(p).rev[c] < 0) myGuess[c] = s; return; }
  PII.setGuess(R(), p, c, s);
}

let stroke = null;
function applyTool(c, first) {
  const a = actor(), r = R();
  if (r.phase === 'design') {
    if (draft[c] === dtool) return;
    stroke.items.push({ k: 'draft', c, prev: draft[c] });
    draft[c] = dtool;
    return;
  }
  const sh = sheet(a);
  if (sh.rev[c] >= 0) return;
  if (gtool === 'peek') {
    if (first) stroke.mode = pending.has(c) ? 'del' : 'add';
    const want = stroke.mode === 'add';
    if (pending.has(c) === want) return;
    stroke.items.push({ k: 'pend', c, prev: !want });
    want ? pending.add(c) : pending.delete(c);
    return;
  }
  const cur = guessOf(a, c);
  if (gtool === 'erase') {
    if (cur >= 0) { stroke.items.push({ k: 'guess', c, prev: cur }); setGuessLocal(a, c, -1); }
    if (pending.has(c)) { stroke.items.push({ k: 'pend', c, prev: true }); pending.delete(c); }
    return;
  }
  if (first) stroke.mode = cur === gtool ? 'clear' : 'set';
  const want = stroke.mode === 'clear' ? -1 : gtool;
  if (cur === want) return;
  stroke.items.push({ k: 'guess', c, prev: cur });
  setGuessLocal(a, c, want);
}

function undo() {
  if (!undoStack.length || undoOwner !== actorKey() || !canEdit()) return;
  const items = undoStack.pop(), a = actor();
  for (const it of items.reverse()) {
    if (it.k === 'draft' && draft) draft[it.c] = it.prev;
    else if (it.k === 'pend') { if (sheet(a).rev[it.c] < 0) it.prev ? pending.add(it.c) : pending.delete(it.c); }
    else if (it.k === 'guess') setGuessLocal(a, it.c, it.prev);
  }
  render();
}

function ask() {
  const a = actor(), cells = [...pending];
  if (!cells.length) return;
  pending = new Set();
  undoStack = undoStack.map((g) => g.filter((it) => it.k !== 'pend' && !(it.k === 'guess' && cells.includes(it.c)))).filter((g) => g.length);
  if (online() && !sess.host) {
    cells.forEach((c) => (myGuess[c] = -1));
    sess.send('peek', { rid: roundKey(), cells });
    render();
    return;
  }
  PII.peek(R(), a, cells);
  sync();
}

function handIn() {
  const a = actor();
  if (online() && !sess.host) {
    sess.send('submit', { rid: roundKey(), guesses: myGuess.slice() });
    sheet(a).status = 'done';
    sync();
    return;
  }
  PII.submit(R(), a);
  pending = new Set();
  sync();
}

function giveUp() {
  if (!sureGiveUp) { sureGiveUp = setTimeout(() => { sureGiveUp = 0; render(); }, 3000); render(); return; }
  clearTimeout(sureGiveUp); sureGiveUp = 0;
  const a = actor();
  pending = new Set();
  if (online() && !sess.host) {
    sess.send('giveup', { rid: roundKey() });
    sheet(a).status = 'gaveup';
    sync();
    return;
  }
  PII.giveUp(R(), a);
  sync();
}

function designDone() {
  const r = R();
  if (online() && !sess.host) {
    sess.send('design', { rid: roundKey(), pattern: draft.slice() });
    r.pattern = draft.slice(); r.phase = 'guess';
    draft = null;
    sync();
    return;
  }
  PII.setPattern(r, draft);
  draft = null; undoStack = [];
  sync();
}

// ---------- online ----------
function sendState() {
  if (!online() || !sess.host || !sess.connected) return;
  m.v = (m.v || 0) + 1;
  sess.send('state', { m: PII.viewFor(m, 1) });
}

function onSession(s) {
  sess = s; guestReady = false;
  clearBots();
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('name', (d) => { if (d.seat !== s.seat) { remoteNames[d.seat] = d.name || ''; render(); if (R().phase === 'done') fillResult(); } });
  s.on('state', (d) => {
    if (s.host) return;
    const same = !!m && guestReady && d.m.mid === m.mid && d.m.rid === m.rid;
    if (same && d.m.v <= m.v) return;
    const fresh = !same;
    const keep = myGuess, keepDraft = draft;
    m = d.m; guestReady = true;
    if (fresh) {
      clearBots(); resetLocals(); shapes = {}; snap = null;
    } else {
      myGuess = keep; draft = keepDraft;
      const sh = sheet(s.seat);
      if (sh) for (let c = 0; c < CELLS; c++) if (sh.rev[c] >= 0) { myGuess[c] = -1; pending.delete(c); }
    }
    if (R().phase === 'design' && R().designer === s.seat && !draft) draft = Array(CELLS).fill(0);
    sync();
  });
  // host side: guest's requests
  const stale = (d) => { if (d.rid !== roundKey()) { sendState(); return true; } return false; };
  s.on('peek', (d) => { if (!s.host || stale(d)) return; PII.peek(R(), 1, (d.cells || []).slice(0, CELLS)); sync(); });
  s.on('submit', (d) => { if (!s.host || stale(d)) return; PII.submit(R(), 1, d.guesses); sync(); });
  s.on('giveup', (d) => { if (!s.host || stale(d)) return; PII.giveUp(R(), 1); sync(); });
  s.on('design', (d) => { if (!s.host || stale(d)) return; if (R().designer === 1) PII.setPattern(R(), d.pattern); sync(); });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else render();
}

// ---------- input ----------
function cellAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / CS), r = Math.floor((p.y - M) / CS);
  return c >= 0 && c < N && r >= 0 && r < N ? r * N + c : -1;
}
let lastCell = -1;
svg.addEventListener('pointerdown', (e) => {
  if (!canEdit()) return;
  const c = cellAt(e);
  if (c < 0) return;
  e.preventDefault();
  try { svg.setPointerCapture(e.pointerId); } catch {}
  stroke = { items: [], mode: null };
  lastCell = c;
  applyTool(c, true);
  render();
});
svg.addEventListener('pointermove', (e) => {
  if (!stroke) return;
  const c = cellAt(e);
  if (c < 0 || c === lastCell) return;
  lastCell = c;
  applyTool(c, false);
  render();
});
const endStroke = () => { if (!stroke) return; pushUndo(stroke.items); stroke = null; render(); };
svg.addEventListener('pointerup', endStroke);
svg.addEventListener('pointercancel', endStroke);

$('#pal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-t]');
  if (!b || !canEdit()) return;
  const v = b.dataset.t;
  if (R().phase === 'design') {
    if (v === 'random') { pushUndo(draft.map((prev, c) => ({ k: 'draft', c, prev }))); draft = PII.generatePattern(); }
    else if (v === 'fill') { pushUndo(draft.map((prev, c) => ({ k: 'draft', c, prev }))); draft.fill(dtool); }
    else dtool = +v;
  } else gtool = v === 'peek' || v === 'erase' ? v : +v;
  render();
});
$('#acts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const a = b.dataset.a;
  if (a === 'results') { fillResult(); $('#result').hidden = false; return; }
  if (a === 'again') return nextOrAgain();
  if (!canEdit()) return;
  if (a === 'design') designDone();
  if (a === 'ask') ask();
  if (a === 'done') handIn();
  if (a === 'giveup') giveUp();
});
$('#uncover').addEventListener('click', () => { uncovered = actorKey(); render(); });
$('#look').addEventListener('click', () => { $('#result').hidden = true; });
$('#again').addEventListener('click', nextOrAgain);
$('#new').addEventListener('click', () => { if (isHost()) newMatch(); });
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player').forEach((el) => el.addEventListener('click', (e) => {
  if (e.target.closest('.name') || !m || R().phase !== 'done') return;
  const p = +el.dataset.p;
  viewSeat = viewSeat === p ? null : p;
  render();
}));
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    render();
  }));

// ---------- settings ----------
function syncSettingsUI() {
  const on = online();
  $('#designer').value = on && !sess.host ? (m.cpuDesigner ? 'cpu' : 'rotate') : cfg.designer;
  $('#players').value = on && !sess.host ? m.seats : on ? Math.max(2, cfg.players) : cfg.players;
  $('#players option[value="1"]').disabled = on || cfg.designer === 'rotate';
  const players = +$('#players').value;
  $('#bots').value = Math.min(cfg.bots, players - 1);
  $('#bots').querySelectorAll('option').forEach((o) => (o.disabled = +o.value > players - 1));
  $('#bots-field').hidden = on || players < 2;
  const bots = on ? m.seats - 2 : players === 1 ? 0 : Math.min(cfg.bots, players - 1);
  $('#level-field').hidden = bots === 0;
  $('#level').value = on && !sess.host ? m.level : cfg.level;
  $('#settings-note').textContent = on ? t('pii.online.note') : t('pii.settings.note');
}
function onSetting() {
  if (!isHost()) return;
  cfg.designer = $('#designer').value;
  cfg.players = +$('#players').value;
  if (cfg.designer === 'rotate' && cfg.players < 2) cfg.players = 2;
  if (!online()) cfg.bots = Math.min(+$('#bots').value, Math.max(0, cfg.players - 1));
  cfg.level = $('#level').value;
  saveCfg();
  newMatch();
}
for (const id of ['designer', 'players', 'bots', 'level']) $('#' + id).addEventListener('change', onSetting);
document.addEventListener('mg:lang', () => { palKey = actsKey = ''; render(); if (m && R().phase === 'done') fillResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; guestReady = false; newMatch(); },
});
if (!online()) showOnce('how', SLUG);

// test hook for scripted UI checks
window.__pii = { get m() { return m; }, actor, PII };
