import { t, plural, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { TAX } from './engine.js';
import './strings.js';

const SLUG = 'tax-collector';
const COLORS = [PALETTE.blue, PALETTE.red];
const S = 64, M = 6;                       // cell size, margin (viewBox units)
const COLS = { 10: 5, 12: 4, 15: 5, 20: 5, 24: 6, 30: 6, 36: 6, 42: 7 };
const EXACT_UP_TO = 30;                    // judge moves exactly (solver) up to this ceiling
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ n: 12, names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!TAX.CEILINGS.includes(cfg.n)) cfg.n = 12;
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, over, sel = null, hover = null, hintX = null, flash = '', fresh = null, judgeTimer, resultTimer;
let confirmTips = 2;                       // how many times the player still explains "tap again"
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

const name = (p) => (p === 0 && cfg.names[0]?.trim()) || t('tc.p' + p);

// ---------- geometry ----------
const cols = () => COLS[st.n] || 6;
const rows = () => Math.ceil(st.n / cols());
const cellXY = (x) => { const i = x - 1, c = cols(); return [M + (i % c) * S + S / 2, M + Math.floor(i / c) * S + S / 2]; };
function numAt(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const c = Math.floor((p.x - M) / S), r = Math.floor((p.y - M) / S);
  if (c < 0 || c >= cols() || r < 0) return null;
  const x = r * cols() + c + 1;
  return x >= 1 && x <= st.n ? x : null;
}
// wobble cached per element so redraws don't jitter
const shapeFor = (k, make) => (shapes[k] ??= make());
function boxPath(cx, cy, h) {
  const a = [cx - h, cy - h], b = [cx + h, cy - h], c = [cx + h, cy + h], d = [cx - h, cy + h];
  return [line(...a, ...b, 1.6), line(...b, ...c, 1.6), line(...c, ...d, 1.6), line(...d, ...a, 1.6)].join(' ');
}

// ---------- rendering ----------
function render() {
  const W = M * 2 + cols() * S, H = M * 2 + rows() * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const focus = canMove() ? (sel ?? hover) : null;
  const focusTax = focus && TAX.isLegal(st, focus) ? TAX.taxOf(st, focus) : null;
  let out = '';

  // preview strings from the chosen number to the divisors the taxman would get
  if (focusTax) {
    const [fx, fy] = cellXY(focus);
    for (const d of focusTax) {
      const [dx, dy] = cellXY(d);
      out += `<path class="tie" d="${line(fx, fy, dx, dy, 3)}"/>`;
    }
  }

  const taxedFresh = fresh ? fresh.taxed : [], sweepFresh = fresh?.sweep || [];
  for (let x = 1; x <= st.n; x++) {
    const [cx, cy] = cellXY(x);
    const o = st.owner[x];
    let cls = 'num', mark = '';
    if (o === 0) {
      cls += ' mine';
      const d = shapeFor('c' + x, () => circle(cx, cy, 25, 24, 0.06));
      mark = `<path class="fillc" d="${d}" filter="url(#mg-crayon)"/><path class="ring${fresh?.x === x ? ' fresh' : ''}" d="${d}" pathLength="1"/>`;
    } else if (o === 1) {
      cls += ' tax';
      const i = taxedFresh.indexOf(x), j = sweepFresh.indexOf(x);
      const delay = i >= 0 ? 0.25 + i * 0.09 : j >= 0 ? 0.6 + j * 0.07 : -1;
      const d = shapeFor('b' + x, () => boxPath(cx, cy, 22));
      mark = `<path class="box${delay >= 0 ? ' fresh' : ''}" d="${d}"${delay >= 0 ? ` style="animation-delay:${delay.toFixed(2)}s"` : ''}/>`;
    } else {
      cls += TAX.isLegal(st, x) ? ' open' : ' dead';
      if (focusTax?.includes(x)) { cls += ' taxing'; mark = `<path class="box ghost" d="${shapeFor('b' + x, () => boxPath(cx, cy, 22))}"/>`; }
      if (x === focus && focusTax) { cls += ' focus'; mark = `<path class="ring ghost" d="${shapeFor('c' + x, () => circle(cx, cy, 25, 24, 0.06))}"/>`; }
      if (x === hintX) mark += `<circle class="hintc" cx="${cx}" cy="${cy}" r="29"/>`;
    }
    const rot = shapeFor('r' + x, () => (Math.random() * 2 - 1) * 5);
    out += `<g class="${cls}">${mark}<text x="${cx}" y="${cy + 1}" transform="rotate(${rot.toFixed(1)} ${cx} ${cy})">${x}</text></g>`;
  }
  svg.innerHTML = out;
  fresh = null;                            // animate a move once, not again on every hover/hint redraw
  svg.style.cursor = focusTax && !sel ? 'pointer' : '';
  renderPlayers(focus, focusTax);
}

// The taxman: our red stick figure plus a top hat and a bow tie.
const TAXMAN_EXTRA = withSeed(77, () => {
  const ink = PALETTE.ink;
  const hat = `M46 22 L48 -18 Q70 -24 92 -18 L94 22 Z`;
  return `<path d="${hat}" fill="${ink}" filter="url(#mg-crayon)"/>` +
    `<path d="${hat}" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<path d="M47 12 Q70 8 93 12" stroke="${PALETTE.red.dark}" stroke-width="6" fill="none"/>` +
    `<path d="${line(30, 24, 110, 22, 1.5)}" stroke="${ink}" stroke-width="6" stroke-linecap="round" fill="none"/>` +
    `<path d="M70 108 L53 99 L54 118 Z M70 108 L87 99 L86 118 Z" fill="${ink}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<circle cx="70" cy="108" r="4.5" fill="${PALETTE.red.dark}"/>`;
});
const figure = (p, mood, pose) => {
  const s = figureSVG({ color: COLORS[p], mood, pose, face: p === 0 ? 'right' : 'left', seed: 11 + p * 31 });
  return p === 1 ? s.replace('</svg>', TAXMAN_EXTRA + '</svg>') : s;
};

function renderPlayers(focus = null, focusTax = null) {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    el.classList.add('active');
    const m = moods[p];
    el.querySelector('.fig').innerHTML = figure(p, m.mood, m.pose);
    el.querySelector('.score').textContent = plural(st.score[p], 'tc.pts');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (p === 0 && document.activeElement !== inp) inp.value = cfg.names[0];
    inp.style.color = COLORS[p].main;
  }
  const status = $('#status');
  status.style.color = PALETTE.ink;
  if (over) status.textContent = '';
  else if (focusTax) {
    const tax = focusTax.reduce((a, b) => a + b, 0);
    status.textContent = t('tc.preview', { x: focus, tax });
  } else status.textContent = flash || t('tc.pick');

  $('#undo').disabled = !history.length;
  $('#hint').disabled = over;
  $('#settings-note').textContent = t('tc.record', { n: cfg.n, best: TAX.OPTIMUM[cfg.n], total: TAX.total(cfg.n) });
}

const bubbleTimers = [];
function say(p, key, vars, ms = 1900) {
  const b = $(`.player.p${p} .bubble`);
  b.textContent = t(key, vars);
  b.classList.add('show');
  clearTimeout(bubbleTimers[p]);
  bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), ms);
}
const hush = () => document.querySelectorAll('.bubble').forEach((b) => b.classList.remove('show'));
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });

// ---------- flow ----------
const canMove = () => !over;

function newGame() {
  clearTimeout(judgeTimer); clearTimeout(resultTimer);
  st = TAX.create(cfg.n);
  history = []; shapes = {}; over = false; sel = hover = hintX = null; flash = ''; fresh = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
  $('#result').hidden = true;
  render();
}

function claim(x) {
  if (!canMove()) return;
  if (!TAX.isLegal(st, x)) {
    flash = x === 1 ? t('tc.one') : t('tc.nodiv', { x });
    sel = null;
    say(1, 'say.nodiv');
    return render();
  }
  clearTimeout(judgeTimer);
  const before = TAX.clone(st);
  history.push(before);
  const res = TAX.apply(st, x);
  sel = hover = hintX = null; flash = '';
  fresh = res;
  if (st.over) return finish(res);
  render();
  react(before, res);
}

// Character reactions: exact judgement for small ceilings, a rule of thumb otherwise.
function react(before, res) {
  const tax = res.taxed.reduce((a, b) => a + b, 0);
  const orphans = TAX.stranded(before, st).filter((y) => y !== res.x);
  const judge = () => {
    let loss = null;
    if (st.n <= EXACT_UP_TO) {
      const a = TAX.solve(before, { budget: 150000 }), b = TAX.solve(st, { budget: 150000 });
      if (a.exact && b.exact) loss = a.gain - (res.x + b.gain);
    }
    const bad = loss !== null ? loss > 0 : orphans.length > 0 || tax >= res.x;
    if (bad) {
      setMood(0, 'worried');
      setMood(1, 'smug');
      if (orphans.length) say(1, 'say.orphan', { list: orphans.join(', ') });
      else say(1, 'say.thanks');
      if (Math.random() < 0.4) setTimeout(() => say(0, 'say.oops'), 700);
    } else if (res.taxed.length === 1 || tax * 3 <= res.x) {
      setMood(0, 'happy', 'wave');
      setMood(1, 'sad');
      if (res.taxed.length === 1 && Math.random() < 0.6) say(0, 'say.cheap', { t: tax });
      else say(0, 'say.good');
      if (Math.random() < 0.35) setTimeout(() => say(1, 'say.grr'), 800);
    } else {
      setMood(0, 'happy');
      setMood(1, 'neutral');
      if (Math.random() < 0.3) say(0, 'say.good');
    }
    renderPlayers();
  };
  judgeTimer = setTimeout(judge, 60);
}

function finish(res) {
  over = true;
  const [a, b] = st.score;
  render();
  if (res.sweep?.length) say(1, 'say.sweep', null, 1500);
  const delay = 700 + (res.sweep?.length || 0) * 70;
  resultTimer = setTimeout(() => {
    const w = a === b ? -1 : a > b ? 0 : 1;
    if (w === 0) { setMood(0, 'happy', 'up'); setMood(1, 'sad'); say(0, 'say.win'); setTimeout(() => say(1, 'say.taxlose'), 800); }
    else if (w === 1) { setMood(1, 'happy', 'up'); setMood(0, 'sad'); say(1, 'say.taxwin'); setTimeout(() => say(0, 'say.lose'), 800); }
    else { setMood(0, 'worried'); setMood(1, 'worried'); }
    renderPlayers();
    resultText();
    $('#result').hidden = false;
  }, delay);
}

function resultText() {
  const [a, b] = st.score;
  const w = a === b ? -1 : a > b ? 0 : 1;
  const txt = $('#result-text');
  txt.textContent = t(w < 0 ? 'tc.tie' : w === 0 ? 'tc.win' : 'tc.lose');
  $('#result-score').innerHTML = `<span style="color:${COLORS[0].main}">${a}</span> : <span style="color:${COLORS[1].main}">${b}</span>`;
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  const best = TAX.OPTIMUM[st.n];
  $('#result-sub').textContent = a >= best ? t('tc.perfect') : t('tc.short', { n: st.n, best, d: best - a });
}

function undo() {
  if (!history.length) return;
  clearTimeout(judgeTimer); clearTimeout(resultTimer);
  st = history.pop();
  over = false; sel = hover = hintX = null; flash = ''; fresh = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  hush();
  $('#result').hidden = true;
  render();
}

function hint() {
  if (over) return;
  const x = TAX.hint(st, 150000);
  if (x == null) return;
  hintX = x; flash = t('tc.hinted', { x });
  sel = null;
  render();
}

// ---------- input ----------
// Mouse: hover previews, click takes. Touch/pen: first tap previews, second tap on the same number takes.
svg.addEventListener('pointermove', (evt) => {
  if (evt.pointerType !== 'mouse' || !canMove()) return;
  const x = numAt(evt);
  const h = x && st.owner[x] === -1 && TAX.isLegal(st, x) ? x : null;
  if (h === hover) return;
  hover = h;
  render();
});
svg.addEventListener('pointerleave', () => { if (hover !== null) { hover = null; render(); } });
let lastPointer = 'mouse';
svg.addEventListener('pointerdown', (evt) => { lastPointer = evt.pointerType; });
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  const x = numAt(evt);
  if (x == null || st.owner[x] !== -1) { if (sel !== null) { sel = null; render(); } return; }
  if (lastPointer === 'mouse' || sel === x) return claim(x);
  if (!TAX.isLegal(st, x)) return claim(x);   // explains why it is not allowed
  sel = x; flash = '';
  render();
  if (confirmTips > 0) { confirmTips--; say(0, 'tc.confirm', null, 2200); }
});

const ceilingSel = $('#ceiling');
ceilingSel.innerHTML = TAX.CEILINGS.map((n) => `<option value="${n}">${n}</option>`).join('');
ceilingSel.addEventListener('change', (e) => { cfg.n = +e.target.value; saveCfg(); newGame(); });
$('#new').addEventListener('click', newGame);
$('#again').addEventListener('click', newGame);
$('#undo').addEventListener('click', undo);
$('#hint').addEventListener('click', hint);
const nameInp = $('.player.p0 .name');
nameInp.addEventListener('input', () => { cfg.names[0] = nameInp.value; saveCfg(); renderPlayers(); });
document.addEventListener('mg:lang', () => { if (flash) flash = ''; render(); howPic(); if (over && !$('#result').hidden) resultText(); });

// small worked example for the rules sheet: take 8, the taxman gets 1, 2 and 4
function howPic() {
  const el = $('#how-pic');
  const pic = withSeed(5, () => {
    let s = '';
    for (let x = 1; x <= 8; x++) {
      const cx = 22 + (x - 1) * 38, cy = 26;
      if (x === 8) s += `<path d="${circle(cx, cy, 16, 16, 0.06)}" fill="${PALETTE.blue.fill}" filter="url(#mg-crayon)"/><path d="${circle(cx, cy, 16, 16, 0.06)}" fill="none" stroke="${PALETTE.blue.main}" stroke-width="3" stroke-linecap="round"/>`;
      if ([1, 2, 4].includes(x)) s += `<path d="${boxPath(cx, cy, 14)}" fill="none" stroke="${PALETTE.red.main}" stroke-width="3" stroke-linecap="round"/>`;
      const col = x === 8 ? PALETTE.blue.text : [1, 2, 4].includes(x) ? PALETTE.red.text : PALETTE.ink;
      s += `<text x="${cx}" y="${cy + 1}" fill="${col}">${x}</text>`;
    }
    s += `<text x="288" y="66" fill="${PALETTE.blue.text}" class="lbl">${t('tc.p0')} +8</text>`;
    s += `<text x="58" y="66" fill="${PALETTE.red.text}" class="lbl">${t('tc.p1')} +1+2+4</text>`;
    return s;
  });
  el.innerHTML = `<svg viewBox="0 0 312 80">${pic}</svg>`;
}

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
ceilingSel.value = cfg.n;
howPic();
newGame();
showOnce('how', SLUG);
