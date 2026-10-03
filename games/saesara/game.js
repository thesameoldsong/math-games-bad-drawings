import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce, openSheet } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { SAE, ATOMS } from './engine.js';
import './strings.js';

const SLUG = 'saesara';
const COLORS = [PALETTE.blue, PALETTE.red, PALETTE.green, PALETTE.violet];
const OK = 'var(--ok)', NO = 'var(--sae-no)', FAINT = 'var(--sae-faint)', ZERO = 'var(--sae-zero)';
const CELL = 50, M = 8;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign(
  { mode: 'hot', players: 2, maker: 'cpu', tier: 'easy', size: 8, rounds: 3, names: ['', '', '', ''] },
  JSON.parse(localStorage.getItem('mg-saesara') || '{}'),
);
const saveCfg = () => localStorage.setItem('mg-saesara', JSON.stringify(cfg));

let st, history = [], aiTimer, resultTimer, hoverSq = -1, flash = null, freshSq = -1, pending = false;
let giveArmed = false, giveTimer;
let sess = null, myGameSeat = null, bench = false; // guest: the game seat the host gave this device
// Online: names everyone chose (host relays them) and who controls each seat:
// 'human' (a device), 'cpu' (no device: the host's computer plays it), 'off' (its device dropped out a moment ago),
// 'wait' (two-seat room: nobody there yet — the game waits, as it always did).
const netNames = ['', '', '', ''];
let ctl = ['human', 'human', 'human', 'human'];
const OFF_MS = 15000; // a dropped player gets this long to come back before the computer steps in
const offSince = {};
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));
const shapes = {};
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => (sess.host ? 0 : myGameSeat ?? sess.seat);
const seatsOnline = () => Math.min(4, Math.max(2, cfg.players)); // online rooms seat 2–4 players
// A room with more than two seats: empty seats are played by the computer.
const multiRoom = () => online() && (sess.host ? sess.maxPlayers : st.nPlayers) > 2;
const vsAI = () => !online() && cfg.mode !== 'hot';
const isAI = (p) => (online() ? ctl[p] === 'cpu' : vsAI() && p === 1);
const isLocal = (p) => (online() ? p === mySeat() : !isAI(p));
const isRemote = (p) => online() && !isLocal(p) && !isAI(p);
const live = () => st.phase === 'try' || st.phase === 'decide';
// Online the game runs while the host's link is up; a host with computer seats may also play alone.
const canPlay = () => !online() || sess.connected || (sess.host && multiRoom());
const canAct = () => live() && isLocal(st.turn) && !pending && canPlay();
const solo = () => st.nPlayers === 1;
function name(p) {
  if (!online() && isAI(p)) return t('sae.cpu');
  const n = online() && !isLocal(p) ? netNames[p] : cfg.names[p];
  return (n && n.trim()) || t('sae.p' + p);
}
const colorOf = (p) => (p >= 0 ? COLORS[p] : { main: PALETTE.ink, text: PALETTE.ink, dark: PALETTE.ink });
const centerK = (N) => N - 2 * Math.floor(N / 4);

// ---------- rule text ----------
const atomText = (id, N = st?.N ?? cfg.size) => t('sae.a.' + id, { k: centerK(N) });
function ruleText(r, N = st?.N ?? cfg.size) {
  if (!r) return '';
  if (r.t === 'par') return t('sae.r.par', { a: atomText(r.odd, N), b: atomText(r.even, N) });
  const a = r.op ? t('sae.r.' + r.op, { a: atomText(r.a, N), b: atomText(r.b, N) }) : atomText(r.a, N);
  return t('sae.r.all', { a });
}

// ---------- board drawing ----------
const cx = (sq, N) => M + (sq % N) * CELL + CELL / 2;
const cy = (sq, N) => M + Math.floor(sq / N) * CELL + CELL / 2;

// opts: { N, nums: [{ n, sq, color, dashed, fresh, zero }], smalls: { sq: [{ n, ok }] }, crosses: [sq], rings: [{ sq, n }],
//         dots: [sq], hover: bool }
function boardSVG(o) {
  const N = o.N, W = N * CELL + 2 * M;
  let s = '';
  for (const sq of o.dots || []) s += `<circle class="reveal" cx="${cx(sq, N)}" cy="${cy(sq, N)}" r="7" fill="${OK}" opacity=".45"/>`;
  s += '<rect id="hover" class="hover" x="0" y="0" width="0" height="0" rx="6"/>';
  for (let i = 0; i <= N; i++) {
    const outer = i === 0 || i === N, cls = outer ? 'grid outer' : 'grid';
    const h = shapeFor(`h${N}_${i}`, () => line(M, M + i * CELL, M + N * CELL, M + i * CELL, outer ? 1.6 : 2));
    const v = shapeFor(`v${N}_${i}`, () => line(M + i * CELL, M, M + i * CELL, M + N * CELL, outer ? 1.6 : 2));
    s += `<path class="${cls}" d="${h}"/><path class="${cls}" d="${v}"/>`;
  }
  for (const [sq, list] of Object.entries(o.smalls || {})) {
    const x0 = M + (sq % N) * CELL + 4, y0 = M + Math.floor(sq / N) * CELL + 11;
    list.slice(-3).forEach((m, i) => {
      const x = x0 + i * 15, w = String(m.n).length * 7 + 2;
      s += `<text class="small" x="${x}" y="${y0}" fill="${m.ok ? OK : FAINT}">${m.n}</text>`;
      if (!m.ok) s += `<path class="strike" d="M${x - 2} ${y0 - 12} L${x + w} ${y0 + 2}"/>`;
    });
  }
  for (const sq of o.crosses || []) {
    const x = cx(sq, N), y = cy(sq, N), r = 13;
    const d = shapeFor(`x${sq}`, () => line(x - r, y - r, x + r, y + r, 1.4) + ' ' + line(x + r, y - r, x - r, y + r, 1.4));
    s += `<path class="cross" d="${d}" stroke="${NO}"/>`;
  }
  for (const rg of o.rings || []) {
    const x = cx(rg.sq, N), y = cy(rg.sq, N);
    s += `<path class="ring" d="${shapeFor(`r${rg.sq}`, () => circle(x, y, 19, 18, 0.06))}" stroke="${OK}"/>`;
    if (rg.n != null) s += `<text class="num ghost" x="${x}" y="${y + 1}" fill="${OK}">${rg.n}</text>`;
  }
  for (const nm of o.nums || []) {
    const x = cx(nm.sq, N), y = cy(nm.sq, N);
    const rot = shapeFor(`t${nm.n}_${nm.sq}`, () => (Math.random() * 2 - 1) * 6);
    if (nm.zero) s += `<path class="zero-ring" d="${shapeFor(`z${nm.sq}`, () => circle(x, y, 17, 17, 0.07))}"/>`;
    s += `<text class="num${nm.dashed ? ' ghost' : ''}${nm.fresh ? ' fresh' : ''}" x="${x}" y="${y + 1}" fill="${nm.color}" transform="rotate(${rot.toFixed(1)} ${x} ${y})">${nm.n}</text>`;
  }
  return { s, W };
}

function placerOf(n) {
  const o = st.obs.find((x) => x.n === n && x.ok && x.k === 'try' && !x.pre?.length);
  return o ? o.by : -1;
}

function render() {
  const N = st.N, n0 = SAE.nextNum(st);
  const nums = [], smalls = {}, crosses = [], rings = [];
  st.pos.forEach((sq, k) => {
    if (sq < 0) return;
    nums.push({ n: k, sq, color: k === 0 ? ZERO : colorOf(placerOf(k)).main, zero: k === 0, fresh: sq === freshSq });
  });
  for (const o of st.obs) {
    if (o.pre?.length) continue;
    if (o.n === n0 && live()) { if (o.ok) rings.push({ sq: o.sq }); else crosses.push(o.sq); continue; }
    if (o.ok && st.pos[o.n] === o.sq) continue;
    (smalls[o.sq] ||= []).push({ n: o.n, ok: o.ok });
  }
  let dots = [];
  if (!live() && st.rule && st.phase !== 'make' && n0 <= st.maxNum) dots = SAE.allowedSquares(st.rule, N, st.pos);
  const { s, W } = boardSVG({ N, nums, smalls, crosses, rings, dots });
  svg.setAttribute('viewBox', `0 0 ${W} ${W}`);
  svg.innerHTML = s;
  svg.classList.toggle('playable', canAct() && st.phase === 'try');
  hoverSq = -1;
  renderPlayers();
  renderStatus();
  renderActions();
  renderOverlays();
  persist();
}

function renderPlayers() {
  const n = st.nPlayers;
  $('#arena').className = `arena sae-arena n${n}`;
  for (let p = 0; p < 4; p++) {
    const el = $(`.player.p${p}`);
    el.hidden = p >= n;
    if (p >= n) continue;
    const active = live() && st.turn === p;
    el.classList.toggle('active', active || (st.phase === 'make' && st.maker === p));
    el.classList.toggle('maker', st.maker === p);
    const m = moods[p];
    const pose = !live() || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    const face = p === 0 || (p === 2 && n !== 3) ? 'right' : 'left';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face, seed: 11 + p * 31 });
    const sc = el.querySelector('.score');
    sc.innerHTML = (st.maker === p ? `<span class="badge">${t('sae.maker.badge')}</span> ` : '') + plural(st.scores[p], 'sae.pts') + seatTag(p);
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
}

function seatTag(p) {
  if (!online()) return '';
  const k = isLocal(p) ? 'net.you' : ctl[p] === 'cpu' ? 'sae.tag.cpu' : ctl[p] === 'off' ? 'sae.tag.off' : '';
  return k ? ` <span class="seat-tag${ctl[p] === 'off' ? ' off' : ''}">${t(k)}</span>` : '';
}

function renderStatus() {
  const el = $('#status'), n0 = SAE.nextNum(st), p = st.turn;
  let main = '', color = live() ? COLORS[p].main : 'var(--ink)';
  if (!canPlay()) main = t(sess.host || !multiRoom() ? 'sae.st.wait' : 'sae.st.waithost');
  else if (online() && mySeat() >= st.nPlayers) main = t(bench ? 'sae.st.bench' : 'sae.st.spectate');
  else if (online() && live() && ctl[p] === 'off') main = t('sae.st.off', { name: name(p) });
  else if (st.phase === 'make') { main = t('sae.st.make', { name: name(st.maker) }); color = COLORS[st.maker].main; }
  else if (!live()) main = '';
  else if (isAI(p)) main = t('sae.st.thinking', { name: name(p) });
  else if (online()) main = isLocal(p) ? t(st.phase === 'try' ? 'sae.st.you' : 'sae.st.you.decide', { n: n0 }) : t('sae.st.them', { name: name(p) });
  else if (solo()) main = t(st.phase === 'try' ? 'sae.st.try.solo' : 'sae.st.decide.solo', { n: n0 });
  else main = t(st.phase === 'try' ? 'sae.st.try' : 'sae.st.decide', { name: name(p), n: n0 });
  let top = '';
  if (flash && live()) top = `<span class="flash" style="color:${flash.ok ? OK : NO}">${t(flash.ok ? 'sae.st.yes' : 'sae.st.no', { n: flash.n })}</span>`;
  else if (online() && live() && st.rule && st.maker === mySeat()) top = `<span class="flash round">${esc(t('sae.st.myrule', { rule: ruleText(st.rule) }))}</span>`;
  else if (live() && st.rounds > 1) top = `<span class="flash round">${t('sae.st.round', { r: st.round + 1, k: st.rounds })}</span>`;
  const voter = live() ? st.votes.findIndex((v, q) => v && !isLocal(q)) : -1;
  if (online() && voter >= 0 && !st.votes[mySeat()] && SAE.guessers(st).includes(mySeat())) top = `<span class="flash" style="color:${COLORS[voter].main}">${esc(t('sae.st.vote', { name: name(voter) }))}</span>`;
  // names come from other devices online: plain text only
  el.innerHTML = `${top}<span class="main"></span>`;
  el.querySelector('.main').textContent = main;
  el.querySelector('.main').style.color = color;
}

function renderActions() {
  const mine = canAct();
  const g = $('#guess'), ps = $('#pass'), gu = $('#giveup'), lg = $('#log');
  g.hidden = ps.hidden = !(mine && st.phase === 'decide');
  ps.textContent = t(solo() ? 'sae.btn.more' : 'sae.btn.pass');
  const iVoted = online() && st.votes[mySeat()];
  const theyVoted = online() && st.votes.some((v, q) => v && q !== mySeat());
  gu.hidden = !live() || (!online() && isAI(st.turn)) || (online() && (!canPlay() || !SAE.guessers(st).includes(mySeat())));
  gu.disabled = !!iVoted;
  gu.classList.toggle('hot', giveArmed || (!!theyVoted && !iVoted));
  gu.textContent = iVoted ? t('sae.btn.giveup.wait') : theyVoted ? t('sae.btn.giveup.agree') : t(giveArmed ? 'sae.btn.giveup.sure' : 'sae.btn.giveup');
  lg.hidden = !st.guesses.length;
  lg.textContent = t('sae.btn.log', { k: st.guesses.length });

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && live());
  const restartOK = canRestart();
  $('#new').disabled = !restartOK;
  for (const id of ['size', 'tier', 'rounds']) $('#' + id).disabled = !restartOK;
  $('#mode').disabled = online();
  const players = online() ? seatsOnline() : cfg.players, table = online() || cfg.mode === 'hot';
  $('#players-field').hidden = !table;
  $('#maker-field').hidden = !table || players < 3;
  $('#players').disabled = $('#maker').disabled = !restartOK;
  // Online: 2–4 seats, never fewer than the seats already taken by devices.
  const taken = online() && sess.host ? Math.max(0, ...gameSeats()) : 0;
  for (const o of $('#players').options) o.disabled = online() && (+o.value < 2 || +o.value <= taken);
  if (online()) $('#players').value = players;
  const humanMaker = table && players >= 3 && cfg.maker === 'players';
  $('#tier-field').hidden = humanMaker;
  $('#rounds-field').hidden = humanMaker;
  let note = humanMaker ? t('sae.note.players') : '';
  if (online()) note = [t('sae.online.note'), multiRoom() ? t('sae.online.seats') : sess.host ? t('sae.online.more') : '', note].filter(Boolean).join(' ');
  $('#settings-note').textContent = note;
}

function renderOverlays() {
  // cover: a human patternmaker takes the device
  const cover = $('#cover');
  const showCover = st.phase === 'make' && isLocal(st.maker);
  cover.hidden = !showCover;
  if (showCover) {
    $('#cover-title').textContent = t('sae.cover.title', { name: name(st.maker) });
    $('#cover-title').style.color = COLORS[st.maker].main;
    $('#cover-btn').textContent = online() ? t('sae.cover.btn.online') : t('sae.cover.btn', { name: name(st.maker) });
    $('#cover-text').textContent = t(online() ? 'sae.cover.online' : 'sae.cover.text');
  }
  if (live() || st.phase === 'make') { $('#result').hidden = true; return; }
  fillResult();
}

function fillResult() {
  const r = st.result, over = st.phase === 'over';
  let title, sub, score = '', color = 'var(--ink)';
  if (r.kind === 'guessed') {
    title = t('sae.res.guessed');
    color = COLORS[r.by].main;
    sub = r.maker >= 0
      ? t('sae.res.guessed.maker', { name: name(r.by), pts: plural(r.pts, 'sae.pts'), maker: name(r.maker) })
      : t('sae.res.guessed.by', { name: name(r.by), pts: plural(r.pts, 'sae.pts') });
  } else {
    title = r.kind === 'max' ? t('sae.res.max', { max: st.maxNum }) : r.kind === 'stuck' ? t('sae.res.stuck', { n: SAE.nextNum(st) }) : t('sae.res.giveup');
    sub = t('sae.res.zero');
  }
  if (over) {
    sub = `${title}${/[!?.…]$/.test(title) ? '' : '.'} ${sub}`;
    const best = Math.max(...st.scores), top = st.scores.map((s, p) => (s === best ? p : -1)).filter((p) => p >= 0);
    if (solo()) { title = t('sae.res.solo', { pts: plural(st.scores[0], 'sae.pts') }); color = COLORS[0].main; }
    else if (top.length === 1) { title = t('sae.res.win', { name: name(top[0]) }); color = COLORS[top[0]].main; }
    else { title = t('sae.res.tie'); color = 'var(--ink)'; }
    if (!solo()) score = t('sae.res.scores', { s: st.scores.join(' : ') });
  }
  const tx = $('#result-text');
  tx.textContent = title;
  tx.style.color = color;
  $('#result-sub').textContent = sub;
  $('#result-score').textContent = score;
  $('#result-score').hidden = !score;
  $('#result-rule').textContent = t('sae.res.rule', { rule: ruleText(r.rule) });
  const again = $('#again');
  again.textContent = t(over ? 'sae.res.again' : 'sae.res.next');
  again.hidden = !canRestart();
  const wait = $('#result-wait');
  wait.hidden = canRestart();
  if (online()) wait.textContent = t(over ? 'sae.res.waitnew' : 'sae.res.waitnext', { name: name(0) });
}

// ---------- reactions ----------
const bubbleTimers = [];
function say(p, key) {
  if (p < 0 || p >= st.nPlayers) return;
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
}
let laterTimers = [];
const sayLater = (p, key, ms) => laterTimers.push(setTimeout(() => say(p, key), ms));
// Silences everyone (pending lines too) when the game jumps: new match, new round, undo.
function hush() {
  laterTimers.forEach(clearTimeout);
  laterTimers = [];
  document.querySelectorAll('.player .bubble.show').forEach((b) => b.classList.remove('show'));
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const resetMoods = () => moods.forEach((_, p) => setMood(p, 'neutral'));
const others = (p) => [...Array(st.nPlayers).keys()].filter((q) => q !== p);

function react(ev) {
  flash = null; freshSq = -1;
  const maker = st.maker;
  switch (ev.type) {
    case 'try':
      flash = { ok: ev.ok, n: ev.n };
      if (ev.ok) {
        freshSq = ev.sq;
        setMood(ev.by, 'happy', 'wave');
        if (Math.random() < 0.45) say(ev.by, 'sae.say.yes');
      } else {
        setMood(ev.by, 'worried');
        if (Math.random() < 0.35) say(ev.by, 'sae.say.no');
        if (maker >= 0) setMood(maker, 'smug');
      }
      for (const q of others(ev.by)) if (q !== maker && moods[q].mood !== 'sad') setMood(q, 'neutral');
      break;
    case 'wrong': {
      setMood(ev.by, 'sad');
      say(ev.by, 'sae.say.wrong');
      const rest = others(ev.by).filter((q) => q !== maker);
      if (rest.length) { const q = rest[Math.floor(Math.random() * rest.length)]; setMood(q, 'smug'); sayLater(q, 'sae.say.relief', 700); }
      if (maker >= 0) { setMood(maker, 'smug'); sayLater(maker, 'sae.say.smug', 500); }
      showCx(st.guesses[st.guesses.length - 1]);
      break;
    }
    case 'right':
      setMood(ev.by, 'happy', 'up');
      say(ev.by, 'sae.say.eureka');
      for (const q of others(ev.by)) {
        if (q === maker) { setMood(q, 'happy', 'wave'); sayLater(q, 'sae.say.makerHappy', 800); }
        else { setMood(q, 'sad'); sayLater(q, 'sae.say.missed', 1000); }
      }
      break;
    case 'vote':
      setMood(ev.by, 'worried');
      break;
    case 'round':
    case 'make':
    case 'new':
      hush();
      resetMoods();
      break;
  }
  if (ev.end) {
    for (let q = 0; q < st.nPlayers; q++) setMood(q, 'worried');
    say(ev.by >= 0 ? ev.by : 0, 'sae.say.stalemate');
  }
  if (st.phase === 'over') {
    const best = Math.max(...st.scores);
    if (!solo() && st.scores.some((s) => s !== best)) {
      st.scores.forEach((s, q) => {
        if (s === best) { setMood(q, 'happy', 'up'); sayLater(q, 'sae.say.win', 1200); }
        else { setMood(q, 'sad'); sayLater(q, 'sae.say.lose', 1700); }
      });
    }
    else if (!solo()) for (let q = 0; q < st.nPlayers; q++) setMood(q, 'worried');
  }
  if (!live() && st.phase !== 'make') {
    clearTimeout(resultTimer);
    $('#result').hidden = true;
    resultTimer = setTimeout(() => { if (!live() && st.phase !== 'make') { fillResult(); $('#result').hidden = false; } }, ev.end || ev.type === 'right' ? 1300 : 300);
  }
}

// ---------- counterexample / log popups ----------
function showCx(g) {
  if (!g || !g.cx) return;
  const c = g.cx, N = st.N, P = SAE.obsPositions(st.pos, c), real = c.n - (c.pre?.length || 0);
  const nums = [];
  P.forEach((sq, k) => {
    if (sq < 0) return;
    nums.push({ n: k, sq, zero: k === 0, dashed: k >= real, color: k === 0 ? ZERO : k >= real ? ZERO : colorOf(placerOf(k)).main });
  });
  const o = { N, nums, rings: c.ok ? [{ sq: c.sq, n: c.n }] : [], crosses: c.ok ? [] : [c.sq] };
  const { s, W } = boardSVG(o);
  const b = $('#cx-board');
  b.setAttribute('viewBox', `0 0 ${W} ${W}`);
  b.innerHTML = s;
  const who = `<b style="color:${COLORS[g.by].main}">${esc(name(g.by))}</b>`;
  $('#cx-guess').innerHTML = t('sae.cx.guess', { who, rule: esc(ruleText(g.rule)) });
  // An old fact may itself come from an earlier counterexample: describe it the way it was first shown.
  const tried = st.obs.some((o) => o.k === 'try' && o.n === c.n && o.sq === c.sq && !o.pre?.length);
  const src = c.src !== 'past' ? c.src : c.pre?.length ? 'future' : tried ? 'past' : 'now';
  $('#cx-text').textContent = t(`sae.cx.${src}.${c.ok ? 'yes' : 'no'}`, { n: c.n });
  document.querySelectorAll('dialog[open]').forEach((d) => d.id !== 'sheet-cx' && d.close());
  openSheet('cx');
}
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

function showLog() {
  const list = $('#log-list');
  if (!st.guesses.length) list.innerHTML = `<p>${t('sae.log.empty')}</p>`;
  else list.innerHTML = st.guesses.map((g, i) => `
    <div class="log-item">
      <b style="color:${COLORS[g.by].main}">${esc(name(g.by))}</b> <span class="log-n">(${g.n})</span>: «${esc(ruleText(g.rule))}»
      ${g.cx ? `<button class="linkish" data-cx="${i}">✗ ${t('sae.log.show')}</button>` : '<b class="ok">✓</b>'}
    </div>`).join('');
  openSheet('log');
}
$('#log-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cx]');
  if (b) { $('#sheet-log').close(); showCx(st.guesses[+b.dataset.cx]); }
});

// ---------- rule builder ----------
let gMode = 'guess', gKind = 'all';
function fillSelects() {
  const groups = ['special', 'geo', 'prev', 'all'];
  const html = groups.map((g) => `<optgroup label="${esc(t('sae.grp.' + g))}">${ATOMS.filter((a) => a.g === g).map((a) => `<option value="${a.id}">${esc(atomText(a.id))}</option>`).join('')}</optgroup>`).join('');
  document.querySelectorAll('.atom-select').forEach((s) => { const v = s.value; s.innerHTML = html; if (v) s.value = v; });
}
function builderRule() {
  if (gKind === 'par') return { t: 'par', odd: $('#g-odd').value, even: $('#g-even').value };
  const op = $('#g-op').value || null;
  return { t: 'all', a: $('#g-a').value, op, b: op ? $('#g-b').value : null };
}
function updateBuilder() {
  document.querySelectorAll('.g-kind .chip').forEach((c) => c.classList.toggle('on', c.dataset.kind === gKind));
  $('#g-all').hidden = gKind !== 'all';
  $('#g-par').hidden = gKind !== 'par';
  $('#g-b-field').hidden = !$('#g-op').value;
  const rule = builderRule();
  $('#g-preview').textContent = ruleText(SAE.normRule(rule));
  let warn = '', block = false;
  if (gMode === 'make') {
    const P = [SAE.needsZero(rule) ? Math.floor(st.N * st.N / 2) + Math.floor(st.N / 2) : -1];
    const first = SAE.allowedSquares(rule, st.N, P).length;
    if (!first) { warn = t('sae.g.none'); block = true; }
    else {
      const pl = SAE.playability(rule, st.N, st.maxNum, Math.random, 30);
      warn = t('sae.g.first', { k: first });
      if (pl.full < 0.7) warn += ' ' + t('sae.g.stuck', { max: st.maxNum });
      else if (pl.frac > 0.75) warn += ' ' + t('sae.g.loose');
    }
  }
  $('#g-warn').textContent = warn;
  $('#g-warn').classList.toggle('bad', block);
  $('#g-go').disabled = block;
}
function openBuilder(mode) {
  gMode = mode;
  fillSelects();
  if (mode === 'make') { gKind = 'all'; $('#g-a').value = 'top'; $('#g-op').value = ''; $('#g-b').value = 'left'; $('#g-odd').value = 'top'; $('#g-even').value = 'bottom'; }
  else if (!$('#g-a').value || $('#g-a').value === '') $('#g-a').value = 'any';
  const p = mode === 'make' ? st.maker : st.turn;
  $('#g-title').textContent = t(mode === 'make' ? 'sae.g.title.make' : 'sae.g.title');
  const who = $('#g-who');
  who.textContent = t(mode === 'make' ? 'sae.g.who.make' : 'sae.g.who', { name: name(p) });
  who.style.color = COLORS[p].main;
  $('#g-go').textContent = t(mode === 'make' ? 'sae.g.make' : 'sae.g.check');
  updateBuilder();
  openSheet('guess');
}
document.querySelectorAll('.g-kind .chip').forEach((c) => c.addEventListener('click', () => { gKind = c.dataset.kind; updateBuilder(); }));
document.querySelectorAll('#sheet-guess select').forEach((s) => s.addEventListener('change', updateBuilder));
$('#g-go').addEventListener('click', () => {
  const rule = builderRule();
  $('#sheet-guess').close();
  if (gMode === 'make') {
    if (st.phase !== 'make') return;
    if (!act({ type: 'make', rule })) openBuilder('make');
  } else if (canAct() && st.phase === 'decide') act({ type: 'guess', rule });
});

// ---------- flow ----------
function settingsFor() {
  if (online()) return { N: cfg.size, nPlayers: seatsOnline(), rounds: cfg.rounds, maker: cfg.maker, tier: cfg.tier };
  if (vsAI()) return { N: cfg.size, nPlayers: 2, rounds: cfg.rounds, maker: 'cpu', tier: cfg.tier };
  return { N: cfg.size, nPlayers: cfg.players, rounds: cfg.rounds, maker: cfg.maker, tier: cfg.tier };
}
function newMatch() {
  clearTimeout(aiTimer); clearTimeout(resultTimer);
  st = SAE.create(settingsFor());
  if (online() && sess.host) { reseat(); ctl = hostCtl(); }
  history = []; flash = null; freshSq = -1; pending = false; giveArmed = false;
  hush();
  resetMoods();
  $('#result').hidden = true;
  document.querySelectorAll('dialog#sheet-cx[open], dialog#sheet-guess[open], dialog#sheet-log[open]').forEach((d) => d.close());
  render();
  scheduleAI();
}

// The authoritative side (local game or online host) applies an action; the guest asks the host.
function act(a) {
  if (online() && !sess.host) {
    if (!sess.connected) return false;
    pending = true;
    sess.send('act', { a, acts: st.acts });
    render();
    return true;
  }
  return !!doAct(a);
}
function doAct(a) {
  const snap = SAE.clone(st);
  const ev = SAE.apply(st, a);
  if (!ev) return null;
  if (!online()) history.push(snap);
  else {
    if (ev.type === 'round') { reseat(); ctl = hostCtl(); }
    sendState(ev);
  }
  giveArmed = false;
  react(ev);
  render();
  scheduleAI();
  return ev;
}

// Online the host's dialog may be open while seats fill up: computer seats hold still until it closes.
const aiPaused = () => online() && !!document.getElementById('mg-online')?.open;
function scheduleAI() {
  clearTimeout(aiTimer);
  if (online() && (!sess.host || aiPaused())) return;
  // Computer guessers back a give-up proposal from the people at the table.
  if (online() && live() && st.votes.some(Boolean)) {
    const q = SAE.guessers(st).find((g) => isAI(g) && !st.votes[g]);
    if (q !== undefined) { aiTimer = setTimeout(() => !aiPaused() && doAct({ type: 'giveup', p: q }), 600); return; }
  }
  if (st.phase === 'make' && isAI(st.maker)) {
    aiTimer = setTimeout(() => {
      if (aiPaused() || st.phase !== 'make') return;
      doAct({ type: 'make', rule: SAE.randomRule(st.N, st.maxNum, st.tier) }) || doAct({ type: 'make', rule: { t: 'all', a: 'top', op: null, b: null } });
    }, 900);
    return;
  }
  if (!live() || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    if (aiPaused()) return;
    const a = SAE.aiAction(SAE.publicView(st), online() ? 'normal' : cfg.mode);
    if (a.type === 'guess' && Math.random() < 0.5) say(st.turn, 'sae.say.think');
    if (!doAct(a)) doAct({ type: 'pass' });
  }, st.phase === 'try' ? 850 : 750);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer); clearTimeout(resultTimer);
  do st = history.pop(); while (history.length && isAI(st.turn) && live());
  flash = null; freshSq = -1; giveArmed = false;
  hush();
  resetMoods();
  $('#result').hidden = true;
  render();
  scheduleAI();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newMatch();
  if (online()) sendState({ type: 'new' });
}
function again() {
  if (!canRestart()) return;
  if (st.phase === 'roundover') { act({ type: 'next' }); return; }
  restart();
}

function giveUp() {
  if (!live()) return;
  if (online()) { act({ type: 'giveup', p: mySeat() }); return; }
  if (!giveArmed) {
    giveArmed = true;
    clearTimeout(giveTimer);
    giveTimer = setTimeout(() => { giveArmed = false; renderActions(); }, 3500);
    renderActions();
    return;
  }
  giveArmed = false;
  // Everyone at this device agrees; the computer opponent always agrees.
  for (const p of SAE.guessers(st)) if (live() && !st.votes[p]) doAct({ type: 'giveup', p });
}

// ---------- online ----------
// Host is authoritative: it keeps the full state (with the secret rule), runs the referee and the computer seats,
// and sends every seat its own view — the rule only goes to the seat that made it up (until the round ends).
//
// Game seats vs room seats: net.js numbers devices 1..n-1, but after the host reloads it hands those numbers out
// again in whatever order the devices knock. So each guest remembers its game seat (per room code) and claims it
// in its 'hello'; the host maps room seat → game seat. Nothing is sent to a device before its 'hello' arrives,
// so a device never sees another seat's view, even for a moment. A device keeps its game seat while connected.
const seatOf = {}; // host: room seat → game seat (devices that said hello)
const claim = {}; // host: room seat → game seat its device had before
const nameOf = {}; // host: room seat → the name its device chose
// host: game seat → secret token of the device sitting there. A claim needs the token, so a device can't just
// say "I was the rule maker" and read the rule; a seat that changes hands gets a new token.
const seatTok = {};
const newTok = () => Math.random().toString(36).slice(2, 12);
const mySeatKey = (s) => `mg-sae-seat-${s.code}`;
// The seat that knows the secret rule right now (a player made it up and the round is on).
const secretSeat = () => (st.maker >= 0 && st.rule && live() ? st.maker : -1);
function assignSeat(k) {
  const used = new Set([0, ...Object.entries(seatOf).filter(([j]) => +j !== k).map(([, g]) => g)]);
  // Only the device that held the rule maker's seat (its claim) may sit there mid-round: a fresh device
  // (e.g. a guesser who reopened the link in a new tab) would otherwise read the secret rule. It watches until the round ends.
  const sec = secretSeat();
  const ok = (g) => Number.isInteger(g) && g > 0 && g < st.nPlayers && !used.has(g);
  const c = claim[k], mine = !!c && typeof c.tok === 'string' && seatTok[c.g] === c.tok;
  let g = mine && ok(c.g) ? c.g : ok(k) && k !== sec ? k : null;
  if (g === null) { g = 1; while (used.has(g) || g === sec) g++; } // past nPlayers: the device watches
  if (!(mine && g === c.g) && g < st.nPlayers) seatTok[g] = newTok();
  seatOf[k] = g;
  if (nameOf[k] !== undefined) netNames[g] = nameOf[k];
}
const gameSeats = () => Object.values(seatOf);
// A new round or game: devices that were watching sit down in the free seats.
function reseat() {
  for (const k of Object.keys(seatOf).map(Number)) if (seatOf[k] >= st.nPlayers) { delete seatOf[k]; claim[k] = undefined; assignSeat(k); }
}
// Watching only because the free seat is the rule maker's (the round is on): it gets a seat when the round ends.
const benched = (g) => g >= st.nPlayers && g < 4 && secretSeat() >= 0 && !gameSeats().includes(secretSeat());
function hostCtl() {
  const on = gameSeats();
  return [0, 1, 2, 3].map((p) => {
    if (p === 0 || on.includes(p)) return 'human';
    if (sess.maxPlayers <= 2) return 'wait';
    return offSince[p] && Date.now() - offSince[p] < OFF_MS ? 'off' : 'cpu';
  });
}
function sendMeta() {
  netNames[0] = cfg.names[0];
  for (const [k, g] of Object.entries(seatOf)) sess.send('meta', { ctl, names: netNames, you: g, tok: seatTok[g], bench: benched(g) }, { to: +k });
}
// to: one room seat, or every device that said hello.
function sendState(ev, to) {
  if (!sess?.host) return;
  netNames[0] = cfg.names[0];
  const seats = to === undefined ? Object.keys(seatOf).map(Number) : [to];
  for (const k of seats) {
    const g = seatOf[k];
    if (g !== undefined) sess.send('state', { st: SAE.seatView(st, g), you: g, tok: seatTok[g], bench: benched(g), ev, ctl, names: netNames }, { to: k });
  }
}
// Someone came or went: recompute who plays which seat, tell everyone, let the computer pick up (or hand back).
function refreshCtl() {
  if (!sess?.host) return;
  ctl = hostCtl();
  sendMeta();
  render();
  scheduleAI();
}
// The host's room may be full of devices that can't sit in this game (fewer seats): they watch.
function guestSeat(g, tok, s) {
  if (!Number.isInteger(g)) return;
  sessionStorage.setItem(mySeatKey(s), JSON.stringify({ g, tok }));
  if (g === myGameSeat) return;
  myGameSeat = g;
  if (cfg.netName != null) cfg.names[g] = cfg.netName;
}
// The host keeps the match in sessionStorage (per room code), so reloading the host's tab doesn't wipe it.
const roomKey = (s) => `mg-sae-room-${s.code}`;
function persist() {
  if (online() && sess.host) sessionStorage.setItem(roomKey(sess), JSON.stringify({ st, names: netNames, ctl, tok: seatTok }));
}
function restore(s) {
  const saved = JSON.parse(sessionStorage.getItem(roomKey(s)) || 'null');
  if (!saved?.st) return false;
  st = saved.st;
  (saved.names || []).forEach((n, k) => (netNames[k] = n || ''));
  Object.assign(seatTok, saved.tok || {});
  // People who were at the table get the usual grace period to reconnect before the computer steps in.
  (saved.ctl || []).forEach((c, k) => { if (k > 0 && (c === 'human' || c === 'off')) offSince[k] = Date.now(); });
  setTimeout(() => sess === s && refreshCtl(), OFF_MS + 100);
  ctl = hostCtl();
  history = []; flash = null; freshSq = -1; pending = false; giveArmed = false;
  hush(); resetMoods();
  $('#result').hidden = true;
  render();
  if (!live() && st.phase !== 'make') { fillResult(); $('#result').hidden = false; }
  scheduleAI();
  return true;
}
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  ctl = ['human', 'human', 'human', 'human'];
  myGameSeat = null;
  for (const o of [seatOf, claim, nameOf, seatTok, offSince]) for (const k in o) delete o[k];
  s.on('status', () => {
    render();
    // After a host reload the match is already under way: once someone is back, don't hold the computer seats
    // behind the "seats filling up" dialog.
    if (s.host && s.restored && s.connected) { s.restored = false; document.getElementById('mg-online')?.close(); }
  });
  s.on('peer-join', () => {
    if (sess !== s) return;
    if (s.host) { renderActions(); return; } // the device introduces itself with 'hello'
    let was = null;
    try { was = JSON.parse(sessionStorage.getItem(mySeatKey(s))); } catch {}
    const prev = Number.isInteger(was?.g) ? was.g : s.seat;
    s.send('hello', { was: was?.g ?? null, tok: was?.tok ?? null, name: cfg.netName ?? cfg.names[prev] ?? '' });
    render();
  });
  s.on('hello', (d, { seat }) => {
    if (!s.host) return;
    nameOf[seat] = String(d?.name || '').slice(0, 14);
    // A device that is already seated keeps its seat: a second 'hello' can't move it (e.g. onto the rule maker's).
    if (seatOf[seat] === undefined) {
      claim[seat] = Number.isInteger(d?.was) ? { g: d.was, tok: d.tok } : undefined;
      assignSeat(seat);
    } else netNames[seatOf[seat]] = nameOf[seat];
    delete offSince[seatOf[seat]];
    refreshCtl();
    sendState(undefined, seat);
  });
  s.on('peer-leave', ({ seat }) => {
    if (sess !== s) return;
    if (!s.host) { render(); return; }
    const g = seatOf[seat];
    delete seatOf[seat];
    if (g !== undefined) offSince[g] = Date.now();
    refreshCtl();
    setTimeout(() => sess === s && refreshCtl(), OFF_MS + 100);
  });
  s.on('roster', () => sess === s && s.host && renderActions());
  // net.js words "room full" for a two-seat room; the room may have more seats than this device's settings say.
  s.on('full', () => { const e = document.querySelector('#mg-online .mg-on-error'); if (e) e.textContent = t('net.full.n', { code: s.code }); });
  s.on('state', (d) => {
    if (s.host) return;
    guestSeat(d.you, d.tok, s);
    bench = !!d.bench;
    st = d.st; pending = false; history = [];
    if (d.ctl) ctl = d.ctl;
    if (d.names) d.names.forEach((n, k) => (netNames[k] = n || ''));
    cfg.size = st.N; cfg.tier = st.tier; cfg.rounds = st.rounds; cfg.players = st.nPlayers;
    if (st.nPlayers >= 3) cfg.maker = st.makerMode;
    syncSelects();
    if (d.ev) react(d.ev);
    else if (!live() && st.phase !== 'make') { flash = null; fillResult(); $('#result').hidden = false; }
    if (d.ev?.type === 'new' || d.ev?.type === 'round') $('#result').hidden = true;
    render();
  });
  s.on('meta', (d) => {
    if (s.host) return;
    guestSeat(d.you, d.tok, s);
    bench = !!d.bench;
    ctl = d.ctl || ctl;
    (d.names || []).forEach((n, k) => (netNames[k] = n || ''));
    render();
  });
  s.on('name', (d, { seat }) => {
    if (!s.host) return;
    nameOf[seat] = String(d?.name || '').slice(0, 14);
    if (seatOf[seat] === undefined) return;
    netNames[seatOf[seat]] = nameOf[seat];
    sendMeta();
    render();
  });
  s.on('act', (d, { seat }) => {
    if (!s.host) return;
    const p = seatOf[seat];
    if (p === undefined) return;
    const a = d?.a && typeof d.a === 'object' ? d.a : {};
    let ok = d?.acts === st.acts && p < st.nPlayers;
    if (ok) {
      if (a.type === 'giveup') ok = a.p === p;
      else if (a.type === 'make') ok = st.phase === 'make' && st.maker === p;
      else ok = ['try', 'guess', 'pass'].includes(a.type) && st.phase !== 'make' && st.turn === p;
    }
    if (!ok || !doAct(a)) sendState(undefined, seat);
  });
  s.on('resync', (_, { seat }) => s.host && sendState(undefined, seat));
  if (!s.host) render();
  else if (restore(s)) s.restored = true;
  else newMatch();
}

// ---------- input ----------
function sqAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / CELL), r = Math.floor((p.y - M) / CELL);
  if (c < 0 || r < 0 || c >= st.N || r >= st.N) return -1;
  return r * st.N + c;
}
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse') return;
  const sq = canAct() && st.phase === 'try' ? sqAt(evt) : -1;
  const ok = sq >= 0 && SAE.canTry(st, sq);
  const k = ok ? sq : -1;
  if (k === hoverSq) return;
  hoverSq = k;
  const h = svg.querySelector('#hover');
  if (!h) return;
  if (k < 0) { h.setAttribute('width', 0); svg.style.cursor = ''; return; }
  h.setAttribute('x', M + (k % st.N) * CELL + 3); h.setAttribute('y', M + Math.floor(k / st.N) * CELL + 3);
  h.setAttribute('width', CELL - 6); h.setAttribute('height', CELL - 6);
  h.setAttribute('fill', COLORS[st.turn].fill);
  svg.style.cursor = 'pointer';
});
svg.addEventListener('pointerleave', () => { hoverSq = -1; svg.querySelector('#hover')?.setAttribute('width', 0); });
svg.addEventListener('click', (evt) => {
  if (!canAct() || st.phase !== 'try') return;
  const sq = sqAt(evt);
  if (sq >= 0 && SAE.canTry(st, sq)) act({ type: 'try', sq });
});

$('#guess').addEventListener('click', () => canAct() && st.phase === 'decide' && openBuilder('guess'));
$('#pass').addEventListener('click', () => canAct() && st.phase === 'decide' && act({ type: 'pass' }));
$('#giveup').addEventListener('click', giveUp);
$('#log').addEventListener('click', showLog);
$('#cover-btn').addEventListener('click', () => st.phase === 'make' && openBuilder('make'));
$('#again').addEventListener('click', again);
$('#new').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);

function syncSelects() {
  $('#mode').value = cfg.mode; $('#players').value = cfg.players; $('#maker').value = cfg.maker;
  $('#tier').value = cfg.tier; $('#size').value = cfg.size; $('#rounds').value = cfg.rounds;
}
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newMatch(); });
$('#players').addEventListener('change', (e) => {
  cfg.players = +e.target.value; saveCfg();
  if (online()) sess.setMaxPlayers(seatsOnline());
  restart();
});
$('#maker').addEventListener('change', (e) => { cfg.maker = e.target.value; saveCfg(); restart(); });
$('#tier').addEventListener('change', (e) => { cfg.tier = e.target.value; saveCfg(); restart(); });
$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) { if (sess.host) sendMeta(); else { cfg.netName = inp.value; saveCfg(); sess.send('name', { name: inp.value }); } }
    renderStatus();
  }));
document.addEventListener('mg:lang', () => { fillSelects(); render(); if ($('#sheet-guess').open) updateBuilder(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
if (!cfg.names || cfg.names.length < 4) cfg.names = [...(cfg.names || []), '', '', '', ''].slice(0, 4);
syncSelects();
fillSelects();
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  maxPlayers: seatsOnline,
  onSession,
  onEnd: () => { sess = null; syncSelects(); newMatch(); },
});
// The host's dialog stays open while the seats fill up; computer seats start once it closes.
$('#mg-online')?.addEventListener('close', () => { if (online() && sess.host) refreshCtl(); });
if (!online()) showOnce('how', SLUG);
