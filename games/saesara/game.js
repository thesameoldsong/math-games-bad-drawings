import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce, openSheet } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { SAE, ATOMS } from './engine.js';
import './strings.js';

const SLUG = 'saesara';
const GREEN = { main: '#3aa655', dark: '#23753a', fill: '#8fd4a0' };
const VIOLET = { main: '#8e5cc4', dark: '#5e3590', fill: '#c6a8e8' };
const COLORS = [PALETTE.blue, PALETTE.red, GREEN, VIOLET];
const OK = '#2f9e4f', NO = '#d6343f';
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
let sess = null;
const remoteNames = ['', '', '', ''];
const moods = [0, 1, 2, 3].map(() => ({ mood: 'neutral', pose: 'down' }));
const shapes = {};
const shapeFor = (k, make) => (shapes[k] ??= make());

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const vsAI = () => !online() && cfg.mode !== 'hot';
const isAI = (p) => vsAI() && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const live = () => st.phase === 'try' || st.phase === 'decide';
const canAct = () => live() && isLocal(st.turn) && !pending && (!online() || sess.connected);
const solo = () => st.nPlayers === 1;
function name(p) {
  if (isAI(p)) return t('sae.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('sae.p' + p);
}
const colorOf = (p) => (p >= 0 ? COLORS[p] : { main: PALETTE.ink, dark: PALETTE.ink });
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
      s += `<text class="small" x="${x}" y="${y0}" fill="${m.ok ? OK : '#8a8a92'}">${m.n}</text>`;
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
    nums.push({ n: k, sq, color: k === 0 ? '#77777f' : colorOf(placerOf(k)).main, zero: k === 0, fresh: sq === freshSq });
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
    sc.innerHTML = (st.maker === p ? `<span class="badge">${t('sae.maker.badge')}</span> ` : '') + plural(st.scores[p], 'sae.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
}

function renderStatus() {
  const el = $('#status'), n0 = SAE.nextNum(st), p = st.turn;
  let main = '', color = live() ? COLORS[p].main : 'var(--ink)';
  if (online() && !sess.connected) main = t('sae.st.wait');
  else if (st.phase === 'make') { main = t('sae.st.make', { name: name(st.maker) }); color = COLORS[st.maker].main; }
  else if (!live()) main = '';
  else if (isAI(p)) main = t('sae.st.thinking', { name: name(p) });
  else if (online()) main = isLocal(p) ? t(st.phase === 'try' ? 'sae.st.you' : 'sae.st.you.decide', { n: n0 }) : t('sae.st.them', { name: name(p) });
  else if (solo()) main = t(st.phase === 'try' ? 'sae.st.try.solo' : 'sae.st.decide.solo', { n: n0 });
  else main = t(st.phase === 'try' ? 'sae.st.try' : 'sae.st.decide', { name: name(p), n: n0 });
  let top = '';
  if (flash && live()) top = `<span class="flash" style="color:${flash.ok ? OK : NO}">${t(flash.ok ? 'sae.st.yes' : 'sae.st.no', { n: flash.n })}</span>`;
  else if (live() && st.rounds > 1) top = `<span class="flash round">${t('sae.st.round', { r: st.round + 1, k: st.rounds })}</span>`;
  const voter = live() ? st.votes.findIndex((v, q) => v && !isLocal(q)) : -1;
  if (online() && voter >= 0 && !st.votes[mySeat()]) top = `<span class="flash" style="color:${COLORS[voter].main}">${t('sae.st.vote', { name: name(voter) })}</span>`;
  el.innerHTML = `${top}<span class="main">${main}</span>`;
  el.querySelector('.main').style.color = color;
}

function renderActions() {
  const mine = canAct();
  const g = $('#guess'), ps = $('#pass'), gu = $('#giveup'), lg = $('#log');
  g.hidden = ps.hidden = !(mine && st.phase === 'decide');
  ps.textContent = t(solo() ? 'sae.btn.more' : 'sae.btn.pass');
  const iVoted = online() && st.votes[mySeat()];
  const theyVoted = online() && st.votes[1 - mySeat()];
  gu.hidden = !live() || (!online() && isAI(st.turn)) || (online() && !sess.connected);
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
  $('#players-field').hidden = online() || cfg.mode !== 'hot';
  $('#maker-field').hidden = online() || cfg.mode !== 'hot' || cfg.players < 3;
  const humanMaker = !online() && cfg.mode === 'hot' && cfg.players >= 3 && cfg.maker === 'players';
  $('#tier-field').hidden = humanMaker;
  $('#rounds-field').hidden = humanMaker;
  $('#settings-note').textContent = online() ? t('sae.online.note') : humanMaker ? t('sae.note.players') : '';
}

function renderOverlays() {
  // cover: a human patternmaker takes the device
  const cover = $('#cover');
  const showCover = st.phase === 'make' && isLocal(st.maker);
  cover.hidden = !showCover;
  if (showCover) {
    $('#cover-title').textContent = t('sae.cover.title', { name: name(st.maker) });
    $('#cover-title').style.color = COLORS[st.maker].main;
    $('#cover-btn').textContent = t('sae.cover.btn', { name: name(st.maker) });
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
  if (online()) wait.textContent = t(over ? 'sae.res.waitnew' : 'sae.res.waitnext', { name: name(1 - mySeat()) });
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
    nums.push({ n: k, sq, zero: k === 0, dashed: k >= real, color: k === 0 ? '#77777f' : k >= real ? '#77777f' : colorOf(placerOf(k)).main });
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
  if (online()) return { N: cfg.size, nPlayers: 2, rounds: cfg.rounds, maker: 'cpu', tier: cfg.tier };
  if (vsAI()) return { N: cfg.size, nPlayers: 2, rounds: cfg.rounds, maker: 'cpu', tier: cfg.tier };
  return { N: cfg.size, nPlayers: cfg.players, rounds: cfg.rounds, maker: cfg.maker, tier: cfg.tier };
}
function newMatch() {
  clearTimeout(aiTimer); clearTimeout(resultTimer);
  st = SAE.create(settingsFor());
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
  else sess.send('state', { st: SAE.publicView(st), ev });
  giveArmed = false;
  react(ev);
  render();
  scheduleAI();
  return ev;
}

function scheduleAI() {
  clearTimeout(aiTimer);
  if (online() || !live() || !isAI(st.turn)) return;
  aiTimer = setTimeout(() => {
    const a = SAE.aiAction(SAE.publicView(st), cfg.mode);
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
  if (online()) sess.send('state', { st: SAE.publicView(st), ev: { type: 'new' } });
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
function sendState() { sess.send('state', { st: SAE.publicView(st) }); }
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
    st = d.st; pending = false; history = [];
    cfg.size = st.N; cfg.tier = st.tier; cfg.rounds = st.rounds;
    syncSelects();
    if (d.ev) react(d.ev);
    else if (!live()) { flash = null; fillResult(); $('#result').hidden = false; }
    if (d.ev?.type === 'new' || d.ev?.type === 'round') $('#result').hidden = true;
    render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('act', (d) => {
    if (!s.host) return;
    const a = d.a || {};
    const mineToDo = a.type === 'giveup' ? a.p === 1 - s.seat : st.turn === 1 - s.seat && a.type !== 'next' && a.type !== 'make';
    if (d.acts !== st.acts || !mineToDo || !doAct(a)) sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else render();
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
$('#players').addEventListener('change', (e) => { cfg.players = +e.target.value; saveCfg(); newMatch(); });
$('#maker').addEventListener('change', (e) => { cfg.maker = e.target.value; saveCfg(); newMatch(); });
$('#tier').addEventListener('change', (e) => { cfg.tier = e.target.value; saveCfg(); restart(); });
$('#size').addEventListener('change', (e) => { cfg.size = +e.target.value; saveCfg(); restart(); });
$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
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
  onSession,
  onEnd: () => { sess = null; newMatch(); },
});
if (!online()) showOnce('how', SLUG);
