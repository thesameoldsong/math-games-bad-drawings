import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { STAR } from './engine.js';
import './strings.js';

const SLUG = 'starlitaire';
const VB = 400, CX = 200, CY = 200, R = 166;
const INK = [
  '#ec3a4a', '#1ea5cf', '#7b4bb7', '#f0a800', '#2bb24c', '#f07c22', '#e0559b', '#14a39a', '#3b3b44', '#8a5a2b',
];
const FIGS = [{ color: PALETTE.blue, seed: 11 }, { color: PALETTE.red, seed: 42 }];
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ n: 12, rule: '2', hint: 'miss', guess: 'on', name: '' },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!(Number.isInteger(cfg.n) && cfg.n >= 5 && cfg.n <= 24)) cfg.n = 12;
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, autoTimer, guessVal, guessSkipped, slipped, missAt, resultTimer;
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- rules ----------
const patternOf = (key) => (key === 'free' ? null : key.split(',').map(Number));
function ruleKeys(n) {
  const keys = [];
  for (let k = 0; k <= Math.max(0, Math.floor(n / 2) - 1); k++) keys.push(String(k));
  for (const p of STAR.PATTERNS) if (p.every((k) => k + 1 < n) && !STAR.degenerate(n, p)) keys.push(p.join(','));
  keys.push('free');
  return keys;
}
function ruleText(key) {
  if (key === 'free') return t('star.rule.free');
  const p = patternOf(key);
  if (p.length > 1) return t('star.rule.mix', { list: p.join(', ') });
  return p[0] === 0 ? t('star.rule.skip0') : t('star.rule.skip', { k: p[0] });
}
const ruleShort = (key) => (key === 'free' ? t('star.rule.freeS')
  : key.includes(',') ? t('star.rule.mixS', { list: key.replace(/,/g, ', ') }) : ruleText(key));
const stepText = (k) => (k === 0 ? t('star.rule.cur0') : t('star.rule.skip', { k }));

// ---------- geometry ----------
const dotXY = (d) => {
  const a = -Math.PI / 2 + (2 * Math.PI * d) / st.n;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
};
function dotAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const reach = Math.min(40, Math.PI * R / st.n + 4);
  let best = null, bd = reach;
  for (let d = 0; d < st.n; d++) {
    const [x, y] = dotXY(d), dist = Math.hypot(p.x - x, p.y - y);
    if (dist < bd) { bd = dist; best = d; }
  }
  return best;
}
const shapeFor = (k, make) => (shapes[k] ??= make());
const colorOf = (loop) => INK[loop % INK.length];

// ---------- rendering ----------
const hintOn = () => !STAR.free(st) && (cfg.hint === 'always' || (cfg.hint === 'miss' && slipped));

function render(animateLast = false) {
  svg.setAttribute('viewBox', `0 0 ${VB} ${VB}`);
  let out = `<circle class="ring" cx="${CX}" cy="${CY}" r="${R}"/>`;
  const done = STAR.isDone(st);

  st.segs.forEach(([a, b, loop], i) => {
    const d = shapeFor(`s${i}_${a}_${b}`, () => { const [x1, y1] = dotXY(a), [x2, y2] = dotXY(b); return line(x1, y1, x2, y2, 3); });
    const fresh = animateLast && i === st.segs.length - 1;
    out += `<path class="seg${fresh ? ' fresh' : ''}${done ? ' glow' : ''}" d="${d}" stroke="${colorOf(loop)}" pathLength="1"/>`;
  });

  // hints: the target dot glows, the jumped-over dots get counted 1, 2, 3…
  const nxt = STAR.next(st);
  if (hintOn() && nxt !== null) {
    const col = colorOf(st.loops.length - 1);
    STAR.skipped(st).forEach((d, i) => {
      const [x, y] = dotXY(d), a = Math.atan2(y - CY, x - CX);
      out += `<text class="count" x="${(CX + (R + 19) * Math.cos(a)).toFixed(1)}" y="${(CY + (R + 19) * Math.sin(a)).toFixed(1)}">${i + 1}</text>`;
    });
    const [x, y] = dotXY(nxt);
    out += `<circle class="target" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" stroke="${col}"/>`;
  }
  if (st.pen === null && st.loops.length && !done && !STAR.free(st) && cfg.hint !== 'never') {
    for (const d of STAR.startDots(st)) {
      const [x, y] = dotXY(d);
      out += `<circle class="open" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"/>`;
    }
  }
  if (st.pen !== null) {
    const [x, y] = dotXY(st.pen);
    out += `<path class="pen" d="${shapeFor('pen' + st.pen, () => circle(x, y, 12, 12, 0.08))}" stroke="${colorOf(st.loops.length - 1)}"/>`;
  }

  for (let d = 0; d < st.n; d++) {
    const [x, y] = dotXY(d);
    out += `<path class="dot${st.touched[d] ? ' used' : ''}" d="${shapeFor('d' + d, () => circle(x, y, 5.2, 5.2, 0.12))}"/>`;
  }
  if (missAt !== null) {
    const [x, y] = dotXY(missAt);
    out += `<path class="miss" d="${line(x - 9, y - 9, x + 9, y + 9, 1)} ${line(x + 9, y - 9, x - 9, y + 9, 1)}"/>`;
  }
  svg.innerHTML = out;
  renderSide();
}

function renderSide() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const m = moods[p];
    el.querySelector('.fig').innerHTML = figureSVG({
      color: FIGS[p].color, mood: m.mood, pose: m.pose, face: p === 0 ? 'right' : 'left', seed: FIGS[p].seed,
    });
  }
  const inp = $('.player.p0 .name');
  inp.placeholder = t('star.p0');
  if (document.activeElement !== inp) inp.value = cfg.name;
  inp.style.color = PALETTE.blue.main;
  $('.player.p1 .name').style.color = PALETTE.red.main;
  let sc = plural(st.segs.length, 'star.lines');
  if (st.mistakes) sc += ' · ' + t('star.miss', { m: st.mistakes });
  $('.player.p0 .score').textContent = sc;
  $('#rule-label').textContent = t('star.rulecard', { n: st.n, rule: ruleShort(cfg.rule) });

  // status line + chips
  const done = STAR.isDone(st), free = STAR.free(st);
  const choices = STAR.guessChoices(st.n, st.pattern);
  const asking = choices.length > 0 && cfg.guess === 'on' && !st.loops.length && guessVal === null && !guessSkipped;
  let msg;
  if (done) msg = t('star.done') + ' ' + summary().main;
  else if (free) msg = t(st.pen === null ? 'star.st.free' : 'star.st.freepen');
  else if (asking) msg = t('star.st.ask');
  else if (st.pen !== null) msg = t('star.st.next', { f: st.loops.length, rule: stepText(st.pattern[st.pi]) });
  else if (st.loops.length) msg = t('star.st.newfig');
  else msg = guessVal !== null ? t('star.st.bet', { g: guessVal }) : t('star.st.start');
  $('#status').textContent = msg;

  let chips = '';
  if (done) {
    chips = `<button class="chip" data-act="again">${t('star.again')}</button><button class="chip primary" data-act="random">${t('star.random')}</button>`;
  } else if (asking) {
    chips = choices.map((g) => `<button class="chip num" data-guess="${g}">${g}</button>`).join('') +
      `<button class="chip" data-act="noguess">${t('star.skipguess')}</button>`;
  } else if (!free) {
    chips = `<button class="chip" data-act="auto">${t(autoTimer ? 'star.stop' : 'star.auto')}</button>`;
  }
  $('#chips').innerHTML = chips;
  $('#undo').disabled = !history.length;
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

// ---------- results ----------
function summary() {
  const figs = STAR.figures(st), f = figs.length, cs = figs.map((x) => x.corners);
  let main;
  if (f === 1) main = t('star.sum.one', { c: plural(cs[0], 'star.corners') });
  else if (cs.every((c) => c === cs[0])) main = t('star.sum.many', { f: plural(f, 'star.figs'), c: plural(cs[0], 'star.corners') });
  else main = t('star.sum.mixed', { f: plural(f, 'star.figs'), list: cs.join(' + ') });
  let why = '';
  if (st.pattern.length === 1) { const s = st.pattern[0] + 1; why = t('star.why', { s, n: st.n, g: STAR.gcd(st.n, s) }); }
  return { f, main, why };
}
const isPrime = (n) => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return n > 1; };

function finish() {
  stopAuto();
  const s = summary();
  setMood(0, 'happy', 'up'); setMood(1, 'happy', 'wave');
  say(1, isPrime(st.n) && s.f === 1 && Math.random() < 0.6 ? 'star.say.prime' : 'star.say.done', { n: st.n });
  let bet = '';
  if (guessVal !== null) {
    const right = guessVal === s.f;
    bet = t(right ? 'star.guess.right' : 'star.guess.wrong', { g: guessVal, f: s.f });
    if (!right) setMood(0, 'worried', 'down');
    setTimeout(() => say(0, right ? 'star.say.right' : 'star.say.wrongbet'), 700);
  }
  render(true);
  $('#result-text').textContent = t('star.done');
  $('#result-sub').innerHTML = [s.main, s.why, bet].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => { if (STAR.isDone(st)) $('#result').hidden = false; }, 1100);
}

// ---------- flow ----------
function newGame() {
  stopAuto();
  clearTimeout(resultTimer);
  st = STAR.create(cfg.n, patternOf(cfg.rule));
  history = []; shapes = {}; guessVal = null; guessSkipped = false; slipped = false; missAt = null;
  setMood(0, 'neutral', 'point'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
}

function play(d, auto = false) {
  const before = STAR.clone(st);
  const r = STAR.tap(st, d);
  if (r === 'ignored') {
    if (!auto && st.pen === null && !STAR.free(st)) { setMood(1, 'neutral', 'point'); say(1, 'star.say.empty'); renderSide(); }
    return r;
  }
  missAt = null;
  if (r === 'wrong') {
    slipped = true; missAt = d;
    setMood(0, 'worried'); setMood(1, 'smug', 'point');
    say(1, 'star.say.wrong');
    if (Math.random() < 0.4) say(0, 'star.say.oops');
    render();
    setTimeout(() => { if (missAt === d) { missAt = null; svg.querySelector('.miss')?.remove(); } }, 700);
    return r;
  }
  history.push(before);
  if (r === 'line' || r === 'start') {
    slipped = false;
    if (!auto && r === 'line') {
      setMood(0, 'happy', 'point'); setMood(1, 'neutral');
      if (Math.random() < 0.18) say(0, 'star.say.ok');
    }
  }
  if (r === 'close' || r === 'lift') {
    slipped = false;
    setMood(0, 'happy', 'wave'); setMood(1, 'happy', 'point');
    if (r === 'close' || Math.random() < 0.3) say(1, 'star.say.close');
  }
  if (r === 'done') return finish(), r;
  render(r === 'line' || r === 'close' || r === 'lift');
  return r;
}

function stopAuto() {
  if (!autoTimer) return;
  clearTimeout(autoTimer); autoTimer = null;
}
function toggleAuto() {
  if (autoTimer) { stopAuto(); renderSide(); return; }
  guessSkipped = guessSkipped || guessVal === null;
  const step = () => {
    if (STAR.isDone(st)) { autoTimer = null; return; }
    const d = STAR.autoTap(st);
    autoTimer = setTimeout(step, Math.max(70, Math.min(260, 3600 / (st.n * st.pattern.length))));
    play(d, true);
  };
  autoTimer = 1; // mark running before the first step so the chip shows "stop"
  step();
}

function undo() {
  if (!history.length) return;
  stopAuto();
  clearTimeout(resultTimer);
  st = history.pop();
  missAt = null; slipped = false;
  setMood(0, 'neutral', 'point'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
}

function randomize() {
  const n = 5 + Math.floor(Math.random() * 16);
  const keys = ruleKeys(n).filter((k) => k !== 'free' && k !== '0');
  cfg.n = n;
  cfg.rule = keys[Math.floor(Math.random() * keys.length)];
  saveCfg(); fillSelects(); newGame();
}

// ---------- settings ----------
function fillSelects() {
  const dots = $('#dots');
  if (!dots.options.length) for (let n = 5; n <= 24; n++) dots.add(new Option(String(n), String(n)));
  dots.value = cfg.n;
  const keys = ruleKeys(cfg.n);
  if (!keys.includes(cfg.rule)) cfg.rule = '1';
  const rule = $('#rule');
  rule.innerHTML = '';
  for (const k of keys) rule.add(new Option(ruleText(k), k));
  rule.value = cfg.rule;
  $('#hint').value = cfg.hint;
  $('#guess').value = cfg.guess;
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  if (STAR.isDone(st)) return;
  const d = dotAt(evt);
  if (d === null) return;
  stopAuto();
  play(d);
});
$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.guess) { guessVal = +b.dataset.guess; setMood(0, 'smug', 'point'); render(); return; }
  const act = b.dataset.act;
  if (act === 'noguess') { guessSkipped = true; render(); }
  if (act === 'auto') toggleAuto();
  if (act === 'again') newGame();
  if (act === 'random') randomize();
});
$('#result').addEventListener('click', (e) => { if (!e.target.closest('.result-card')) $('#result').hidden = true; });
$('#dots').addEventListener('change', (e) => { cfg.n = +e.target.value; fillSelects(); saveCfg(); newGame(); });
$('#rule').addEventListener('change', (e) => { cfg.rule = e.target.value; saveCfg(); newGame(); });
$('#hint').addEventListener('change', (e) => { cfg.hint = e.target.value; saveCfg(); render(); });
$('#guess').addEventListener('change', (e) => { cfg.guess = e.target.value; saveCfg(); render(); });
$('#new').addEventListener('click', newGame);
$('#again').addEventListener('click', newGame);
$('#random').addEventListener('click', randomize);
$('#undo').addEventListener('click', undo);
$('.player.p0 .name').addEventListener('input', (e) => { cfg.name = e.target.value; saveCfg(); });
document.addEventListener('mg:lang', () => { fillSelects(); render(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
fillSelects();
newGame();
showOnce('how', SLUG);
