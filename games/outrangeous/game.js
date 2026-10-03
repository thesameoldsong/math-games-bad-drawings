import { t, plural, applyI18n, getLang } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { OUT } from './engine.js';
import './strings.js';

const SLUG = 'outrangeous';
const COLORS = [
  PALETTE.blue, PALETTE.red,
  { main: '#3aa655', dark: '#1f7a37', fill: '#97d9a8' },
  { main: '#f08c1e', dark: '#b8600a', fill: '#f8c58c' },
  { main: '#8a5cc7', dark: '#5d3594', fill: '#c6aee6' },
  { main: '#9a6b43', dark: '#6b4425', fill: '#d2b292' },
];
const MAXP = 6;
const ALL = [...Array(MAXP).keys()];
const $ = (sel) => document.querySelector(sel);
const arena = $('#arena'), panel = $('#panel');
const desktop = matchMedia('(min-width: 900px)');
const finePointer = matchMedia('(pointer: fine)');

const cfg = Object.assign(
  { players: 3, humans: 1, level: 'normal', rounds: 8, deck: 'mix', judge: false, scoring: 'width', names: ['', '', '', '', '', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));
const SEEN_KEY = 'mg-' + SLUG + '-seen';
const seen = () => JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');

let st, history = [], shapes = {}, aiTimer, gameHumans = 1;
let reveal = null;       // index into st.log shown as the round result until dismissed
let uncovered = null;    // hot-seat: the player who confirmed "it's me"
let finished = false;
let pendingAct = false;  // guest: a guess is on its way to the host
let panelKey = '';
let sess = null;
let synced = false;    // guest: the host's state has arrived (until then the local question is not the real one)
const remoteNames = ['', ''];
const moods = ALL.map(() => ({ mood: 'neutral', pose: 'down' }));

// ---------- who is who ----------
const online = () => !!sess;
const N = () => st.players;
const PL = () => ALL.slice(0, N());
const isAI = (p) => !online() && p >= gameHumans;
const isRemote = (p) => online() && p !== sess.seat;
const isLocal = (p) => !isAI(p) && !isRemote(p);
const hotSeat = () => !online() && gameHumans > 1;
const ready = () => !online() || (sess.connected && (sess.host || synced));
function name(p) {
  if (isAI(p)) return N() - gameHumans === 1 ? t('out.cpu') : t('out.bot' + (p - gameHumans + 1));
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('out.p' + p);
}
function localGuesser() {
  if (st.phase !== 'guess' || reveal !== null || !ready() || pendingAct) return -1;
  return OUT.waitingFor(st).find((p) => isLocal(p)) ?? -1;
}

// ---------- formatting ----------
const loc = () => (getLang() === 'ru' ? 'ru-RU' : 'en-US');
const fmt = (v) => new Intl.NumberFormat(loc(), { maximumFractionDigits: 3 }).format(v);
const fmtShort = (v) => new Intl.NumberFormat(loc(), { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const rangeTxt = (g) => (g.lo === g.hi ? fmt(g.lo) : `${fmt(g.lo)} – ${fmt(g.hi)}`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const qText = (q) => (getLang() === 'ru' ? q.ru : q.en);
const shapeFor = (k, make) => (shapes[k] ??= make());
const widthTxt = (g) => {
  if (g.lo === g.hi) return t('out.point');
  if (st.scoring === 'ratio') {
    const r = OUT.size(g, 'ratio');
    return t('out.ratio', { w: r === Infinity ? '∞' : fmt(+r.toPrecision(3)) });
  }
  return t('out.width', { w: fmt(+(g.hi - g.lo).toPrecision(12)) });
};

// ---------- dice pictures ----------
function diceArt(q, value) {
  const [n, sides] = q.dice;
  let s = '';
  if (sides === 6) {
    const faces = [];
    if (value != null) { const b = Math.floor(value / n); let r = value - b * n; for (let i = 0; i < n; i++) faces.push(b + (r-- > 0 ? 1 : 0)); }
    const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    for (let i = 0; i < n; i++) {
      const x = 4 + i * 40, y = 6 + (i % 2) * 4, rot = (i % 2 ? 7 : -6);
      s += `<g transform="rotate(${rot} ${x + 16} ${y + 16})"><path d="${shapeFor('die' + n + i, () => line(x, y, x + 32, y, 1) + line(x + 32, y, x + 32, y + 32, 1).replace('M', 'L') + line(x + 32, y + 32, x, y + 32, 1).replace('M', 'L') + line(x, y + 32, x, y, 1).replace('M', 'L'))}" fill="#fff" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>`;
      if (value == null) s += `<text x="${x + 16}" y="${y + 17}" class="t" font-size="24" text-anchor="middle" fill="#999">?</text>`;
      else for (const [dx, dy] of PIPS[faces[i]]) s += `<circle cx="${x + 16 + dx * 8}" cy="${y + 16 + dy * 8}" r="3.3" fill="var(--ink)"/>`;
      s += '</g>';
    }
    return `<svg viewBox="0 0 ${n * 40 + 4} 44" class="dice">${s}</svg>`;
  }
  // a big polyhedral die: kite for d10, hexagon for d20
  const pts = sides === 10 ? [[24, 2], [44, 20], [24, 44], [4, 20]] : [[24, 1], [44, 12], [44, 34], [24, 45], [4, 34], [4, 12]];
  const d = shapeFor('poly' + sides, () => pts.map(([x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; const seg = line(x, y, x2, y2, 1); return i ? seg.replace('M', 'L') : seg; }).join(' ') + ' Z');
  s += `<path d="${d}" fill="#fff" stroke="var(--ink)" stroke-width="2.4" stroke-linejoin="round"/>`;
  s += `<text x="24" y="${sides === 10 ? 21 : 24}" class="t" font-size="${value == null ? 24 : 21}" text-anchor="middle" fill="${value == null ? '#999' : 'var(--ink)'}">${value == null ? '?' : value}</text>`;
  return `<svg viewBox="0 0 48 47" class="dice">${s}</svg>`;
}

// ---------- question card ----------
function renderCard() {
  const r = reveal !== null ? reveal : st.phase === 'over' ? st.log.length - 1 : st.round;
  const id = reveal !== null || st.phase === 'over' ? st.log[r].id : st.qs[r].id;
  const q = OUT.BY_ID[id];
  $('#qround').textContent = t('out.round', { r: r + 1, n: st.rounds });
  const j = OUT.judgeOf(st, r);
  const jEl = $('#qjudge');
  jEl.textContent = j >= 0 ? t('out.judge.line', { name: name(j) }) : '';
  jEl.style.color = j >= 0 ? COLORS[j].main : '';
  $('#qtext').textContent = qText(q);
  const shown = reveal !== null || st.phase === 'over' ? st.log[r].a : null;
  $('#qart').innerHTML = q.dice ? diceArt(q, shown) : '';
  $('#qart').hidden = !q.dice;
}

// ---------- panels ----------
function formPanel(p) {
  const q = OUT.question(st), c = COLORS[p];
  const neg = (k) => (q.neg ? `<button type="button" class="gneg" data-neg="${k}" aria-label="±">±</button>` : '');
  return `<form class="gform" id="gform" autocomplete="off" novalidate>
    <div class="grow">
      <label class="gfield"><span>${t('out.from')}</span><span class="gin">${neg('lo')}<input type="text" id="g-lo" inputmode="decimal" enterkeyhint="next" style="border-color:${c.main}"></span></label>
      <span class="gdash" style="color:${c.main}">…</span>
      <label class="gfield"><span>${t('out.to')}</span><span class="gin">${neg('hi')}<input type="text" id="g-hi" inputmode="decimal" enterkeyhint="done" style="border-color:${c.main}"></span></label>
    </div>
    <div class="gprev" id="g-prev"></div>
    <button class="btn primary" id="g-lock" type="submit" style="background:${c.main};border-color:${c.dark}">${t('out.lock')}</button>
  </form>`;
}
const readForm = () => {
  const lo = OUT.parseNumber($('#g-lo')?.value, getLang()), hi = OUT.parseNumber($('#g-hi')?.value, getLang());
  return { lo, hi, ok: lo !== null && hi !== null };
};
function updatePreview(warn = false) {
  const el = $('#g-prev');
  if (!el) return;
  const { lo, hi, ok } = readForm();
  el.classList.toggle('warn', warn && !ok);
  if (!ok) { el.textContent = warn ? t('out.need') : ''; return; }
  const g = { lo: Math.min(lo, hi), hi: Math.max(lo, hi) };
  el.textContent = `${rangeTxt(g)} · ${widthTxt(g)}`;
}

function coverPanel(p) {
  return `<div class="cover">
    <div class="ctitle">${t('out.cover.title')}</div>
    <div class="cwho" style="color:${COLORS[p].main}">${esc(name(p))}</div>
    <div class="cnote">${t('out.cover.note')}</div>
    <button class="btn primary" data-act="uncover" style="background:${COLORS[p].main};border-color:${COLORS[p].dark}">${t('out.cover.btn')}</button>
  </div>`;
}

function waitPanel() {
  let s = '<div class="waitp">';
  const mine = PL().filter((p) => isLocal(p) && st.guesses[p] && st.guesses[p] !== 'locked');
  if (!hotSeat()) for (const p of mine) s += `<div class="wmine" style="color:${COLORS[p].main}">${t('out.mine', { r: rangeTxt(st.guesses[p]) })}</div>`;
  const j = OUT.judgeOf(st);
  if (j >= 0 && isLocal(j) && !hotSeat()) s += `<div class="wnote">${t('out.judge.you')}</div>`;
  else if (j >= 0) s += `<div class="wnote">${t('out.judge.note', { name: esc(name(j)) })}</div>`;
  const w = OUT.waitingFor(st);
  if (w.length) s += `<div class="wwho">${t('out.wait', { names: w.map((p) => `<b style="color:${COLORS[p].main}">${esc(name(p))}</b>`).join(', ') })}</div>`;
  s += `<svg class="dots" viewBox="0 0 60 12">${[0, 1, 2].map((i) => `<circle cx="${15 + i * 15}" cy="6" r="4" fill="var(--pencil)" style="animation-delay:${i * 0.2}s"/>`).join('')}</svg>`;
  return s + '</div>';
}

// The reveal: each guesser's range as a crayon bar on a shared number line, the answer as a dashed line.
function revealSVG(e) {
  const W = 360, x0 = 16, x1 = 344, TOP = 38;
  const rows = PL().filter((p) => p !== e.judge && e.guesses[p] && e.guesses[p] !== 'locked');
  const ROW = rows.length >= 5 ? 34 : rows.length >= 4 ? 38 : 44, BAR = ROW > 40 ? 24 : 21, LBL = ROW > 40 ? 12 : 9;
  const vals = rows.flatMap((p) => [e.guesses[p].lo, e.guesses[p].hi]).concat(e.a);
  const pos = vals.filter((v) => v > 0);
  const useLog = e.a > 0 && pos.length && Math.max(...pos) / Math.min(...pos) > 40;
  let D0, D1, X;
  if (useLog) {
    let a = Math.log10(Math.min(...pos)), b = Math.log10(Math.max(...pos));
    const pad = Math.max(0.15, (b - a) * 0.06);
    D0 = a - pad; D1 = b + pad;
    X = (v) => x0 + ((x1 - x0) * (Math.log10(Math.max(v, 10 ** D0)) - D0)) / (D1 - D0);
  } else {
    let a = Math.min(...vals), b = Math.max(...vals);
    const pad = (b - a) * 0.07 || Math.max(1, Math.abs(e.a) * 0.1);
    D0 = a - pad; D1 = b + pad;
    X = (v) => x0 + ((x1 - x0) * (v - D0)) / (D1 - D0);
  }
  const H = TOP + rows.length * ROW + (e.judge >= 0 ? 26 : 0) + 40;
  const axisY = H - 30;
  let s = '';
  // answer marker
  const ax = X(e.a);
  s += `<path d="M${ax.toFixed(1)} ${TOP - 6} L${ax.toFixed(1)} ${axisY}" class="truth"/>`;
  const q = OUT.BY_ID[e.id];
  const label = t(q.dice ? 'out.rolled' : 'out.answer', { a: fmt(e.a) }), lw = label.length * 10.5 + 20;
  const lx = Math.max(x0 - 6 + lw / 2, Math.min(x1 + 6 - lw / 2, ax));
  s += `<rect x="${(lx - lw / 2).toFixed(1)}" y="4" width="${lw}" height="28" rx="8" fill="#fff" stroke="var(--ink)" stroke-width="2.4"/>`;
  s += `<text x="${lx.toFixed(1)}" y="19" class="t" font-size="23" text-anchor="middle" fill="var(--ink)">${label}</text>`;
  rows.forEach((p, i) => {
    const g = e.guesses[p], c = COLORS[p], y = TOP + i * ROW, ok = e.correct[p];
    let bx0 = X(g.lo), bx1 = X(g.hi);
    if (bx1 - bx0 < 7) { const m = (bx0 + bx1) / 2; bx0 = m - 3.5; bx1 = m + 3.5; }
    const clipped = useLog && g.lo <= 0;
    const by = y + BAR;
    s += `<rect x="${bx0.toFixed(1)}" y="${by}" width="${(bx1 - bx0).toFixed(1)}" height="11" fill="${ok ? c.main : c.fill}" filter="url(#mg-crayon)" class="pop" style="animation-delay:${i * 0.12}s"/>`;
    s += `<path d="${shapeFor(`bar${e.round}_${p}`, () => line(bx0, by, bx1, by, 0.6) + line(bx1, by + 11, bx0, by + 11, 0.6))}" stroke="${ok ? c.dark : c.main}" stroke-width="2" fill="none" stroke-linecap="round"${ok ? '' : ' stroke-dasharray="4 4"'}/>`;
    if (clipped) s += `<path d="M${bx0 + 9} ${by - 1} L${bx0 + 1} ${by + 5.5} L${bx0 + 9} ${by + 12}" stroke="${c.dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    s += `<text x="${x0 - 4}" y="${y + LBL}" class="t lbl" font-size="19" fill="${c.main}">${esc(name(p))}: <tspan fill="var(--ink)" font-weight="600">${rangeTxt(g)}</tspan></text>`;
    const gain = e.gains[p];
    s += `<text x="${x1 + 4}" y="${y + LBL}" class="t lbl" font-size="20" text-anchor="end" fill="${ok ? c.dark : '#999'}">${ok ? '+' + gain : t('out.miss')}</text>`;
  });
  if (e.judge >= 0) {
    const y = TOP + rows.length * ROW + 10, c = COLORS[e.judge];
    s += `<text x="${x0 - 4}" y="${y}" class="t lbl" font-size="19" fill="${c.main}">${esc(name(e.judge))} (${t('out.judge.tag')})</text>`;
    s += `<text x="${x1 + 4}" y="${y}" class="t lbl" font-size="20" text-anchor="end" fill="${c.dark}">+${e.gains[e.judge]}</text>`;
  }
  // axis
  s += `<path d="${shapeFor('axis', () => line(x0 - 6, 0, x1 + 6, 0, 1))}" transform="translate(0 ${axisY})" class="axis"/>`;
  const ticks = [];
  if (useLog) {
    for (let k = Math.ceil(D0); k <= Math.floor(D1); k++) ticks.push(10 ** k);
    if (ticks.length < 2) ticks.push(...[2, 5].map((m) => m * 10 ** Math.floor(D0)).filter((v) => Math.log10(v) > D0 && Math.log10(v) < D1));
  } else {
    const raw = (D1 - D0) / 4, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw);
    for (let v = Math.ceil(D0 / step) * step; v <= D1; v += step) ticks.push(+v.toPrecision(12));
  }
  for (const v of ticks) {
    const x = X(v);
    s += `<path d="M${x.toFixed(1)} ${axisY - 5} L${x.toFixed(1)} ${axisY + 5}" class="axis"/>`;
    s += `<text x="${x.toFixed(1)}" y="${axisY + 18}" class="t" font-size="16" text-anchor="middle" fill="#888" font-weight="600">${fmtShort(v)}</text>`;
  }
  return `<svg class="revsvg" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
}

function revealPanel(e) {
  const last = reveal === st.log.length - 1 && st.phase === 'over';
  return `<div class="rev">
    ${revealSVG(e)}
    <button class="btn primary" data-act="next">${t(last ? 'out.final' : 'out.next')}</button>
  </div>`;
}

function standingsPanel() {
  const order = PL().sort((a, b) => st.scores[b] - st.scores[a]);
  const top = Math.max(1, ...st.scores);
  return `<div class="stand">${order.map((p) => `<div class="srow"><span class="sname" style="color:${COLORS[p].main}">${esc(name(p))}</span>
    <span class="sbar"><i style="width:${(st.scores[p] / top) * 100}%;background:${COLORS[p].main}"></i></span><b>${st.scores[p]}</b></div>`).join('')}</div>`;
}

function renderPanel() {
  const lp = localGuesser();
  let key, html;
  if (reveal !== null) { key = 'rev' + reveal + getLang(); html = () => revealPanel(st.log[reveal]); }
  else if (st.phase === 'over') { key = 'over' + getLang() + st.scores.join(); html = standingsPanel; }
  else if (lp >= 0 && hotSeat() && uncovered !== lp) { key = `cov${st.round}_${lp}${getLang()}`; html = () => coverPanel(lp); }
  else if (lp >= 0) { key = `form${st.round}_${lp}${getLang()}`; html = () => formPanel(lp); }
  else { key = `wait${st.round}_${OUT.waitingFor(st).join()}_${pendingAct}_${ready()}${getLang()}`; html = waitPanel; }
  if (key === panelKey) return updatePreview();
  const keep = key.startsWith('form') && panelKey.startsWith('form') ? [$('#g-lo')?.value, $('#g-hi')?.value] : null;
  panelKey = key;
  panel.innerHTML = html();
  if (key.startsWith('form')) {
    if (keep) { $('#g-lo').value = keep[0] || ''; $('#g-hi').value = keep[1] || ''; }
    updatePreview();
    if (finePointer.matches) $('#g-lo').focus({ preventScroll: true });
  }
}

// ---------- render ----------
function render() {
  renderCard();
  renderPanel();
  renderPlayers();
}

function statusLine() {
  if (online() && !ready()) return [t('out.online.wait'), 'var(--ink)'];
  if (reveal !== null) {
    const e = st.log[reveal];
    const g = Math.max(...e.gains);
    if (!e.correct.some(Boolean)) return [t('out.allmiss'), 'var(--ink)'];
    const best = PL().filter((p) => e.gains[p] === g);
    return [best.map((p) => t('out.best', { name: name(p), g })).join(' · '), best.length === 1 ? COLORS[best[0]].main : 'var(--ink)'];
  }
  if (st.phase === 'over') return ['', 'var(--ink)'];
  const lp = localGuesser();
  if (lp >= 0 && hotSeat() && uncovered !== lp) return [t('out.cover.status', { name: name(lp) }), COLORS[lp].main];
  if (lp >= 0) return [hotSeat() ? t('out.turn', { name: name(lp) }) : t('out.turn.you'), COLORS[lp].main];
  if (pendingAct) return [t('out.online.sent'), 'var(--ink)'];
  const j = OUT.judgeOf(st);
  const w = OUT.waitingFor(st);
  if (j >= 0 && isLocal(j) && !hotSeat() && w.length) return [t('out.judging'), COLORS[j].main];
  if (w.length === 1) return [t(isAI(w[0]) ? 'out.thinking' : 'out.wait', { name: name(w[0]), names: name(w[0]) }), COLORS[w[0]].main];
  return [t('out.round', { r: st.round + 1, n: st.rounds }), 'var(--ink)'];
}

function layoutClass() {
  for (let n = 2; n <= MAXP; n++) arena.classList.toggle('n' + n, n === N());
}

function renderPlayers() {
  layoutClass();
  const waiting = reveal === null ? OUT.waitingFor(st) : [];
  const judge = reveal === null && st.phase === 'guess' ? OUT.judgeOf(st) : -1;
  const cols = desktop.matches ? 2 : N() === 2 || N() === 4 ? 2 : 3;
  for (const p of ALL) {
    const el = $(`.player.p${p}`);
    el.hidden = p >= N();
    if (p >= N()) continue;
    const active = waiting.includes(p);
    el.classList.toggle('active', active || reveal !== null || st.phase === 'over' || p === judge);
    // the card in the right-hand column talks to the left so the bubble stays on screen
    const flip = N() > 2 && p % cols === cols - 1;
    el.classList.toggle('flip', flip);
    const m = moods[p];
    const pose = m.pose !== 'down' ? m.pose : active && localGuesser() === p ? 'point' : 'down';
    const face = N() === 2 ? (p === 0 ? 'right' : 'left') : flip ? 'left' : 'right';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face, seed: 11 + p * 31 });
    el.querySelector('.bubble').style.color = COLORS[p].main;
    let sc = plural(st.scores[p], 'out.pts');
    if (p === judge) sc += ' · ' + t('out.judge.tag');
    else if (reveal === null && st.phase === 'guess' && st.guesses[p] !== null) sc += ' ' + t('out.locked');
    el.querySelector('.score').textContent = sc;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }
  const [s, c] = statusLine();
  const status = $('#status');
  status.textContent = s;
  status.style.color = c;

  $('#undo').disabled = online() || !history.length;
  for (const id of ['players', 'humans', 'judge']) $('#' + id).disabled = online();
  $('#level').disabled = online();
  for (const id of ['rounds', 'deck', 'scoring']) $('#' + id).disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('out.online.waitnew', { name: name(1 - sess.seat) });
  $('#players-field').hidden = online();
  $('#humans-field').hidden = online();
  $('#level-field').hidden = online() || cfg.humans >= cfg.players;
  $('#judge-field').hidden = online() || cfg.players < 3;
  $('#settings-note').textContent = online() ? t('out.online.note') : '';
}

function fillHumans() {
  const sel = $('#humans');
  sel.innerHTML = '';
  for (let h = 1; h <= cfg.players; h++) {
    const o = document.createElement('option');
    o.value = h;
    o.textContent = h === cfg.players ? `${h} (${t('out.humans.all')})` : t('out.humans.n', { h, b: cfg.players - h });
    sel.append(o);
  }
  cfg.humans = Math.min(cfg.humans, cfg.players);
  sel.value = cfg.humans;
}

// ---------- bubbles & moods ----------
const bubbleTimers = [], sayTimers = [];
function say(p, key, delay = 0) {
  sayTimers.push(setTimeout(() => {
    if (p >= N()) return;
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 2000);
  }, delay));
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const calm = () => ALL.forEach((p) => setMood(p, 'neutral'));
// drop queued speech (e.g. reveal remarks still pending when the next screen comes up)
const hush = () => { sayTimers.splice(0).forEach(clearTimeout); document.querySelectorAll('.player .bubble').forEach((b) => b.classList.remove('show')); };

function react(e) {
  hush(); calm();
  const guessed = PL().filter((p) => p !== e.judge);
  const top = Math.max(...e.gains);
  const lines = [];
  for (const p of guessed) {
    const g = e.guesses[p];
    if (!e.correct[p]) {
      const off = e.a < g.lo ? g.lo - e.a : e.a - g.hi;
      const close = off <= Math.max(1, Math.min(Math.abs(e.a) * 0.1, (g.hi - g.lo) * 0.2));
      setMood(p, close ? 'worried' : 'sad');
      lines.push([p, close ? 'out.say.close' : 'out.say.miss', close ? 2 : 1]);
    } else if (g.lo === g.hi) {
      setMood(p, 'happy', 'up'); lines.push([p, 'out.say.bull', 4]);
    } else if (e.gains[p] === top && top > 0) {
      setMood(p, 'happy', 'up'); lines.push([p, 'out.say.best', 3]);
    } else if (guessed.filter((q) => e.correct[q]).every((q) => OUT.size(e.guesses[q], st.scoring) <= OUT.size(g, st.scoring)) && guessed.some((q) => q !== p && e.correct[q])) {
      setMood(p, 'smug'); lines.push([p, 'out.say.safe', 1]);
    } else {
      setMood(p, 'happy', 'wave'); lines.push([p, 'out.say.ok', 0]);
    }
  }
  if (e.judge >= 0 && e.gains[e.judge] > 0) { setMood(e.judge, 'smug', 'wave'); lines.push([e.judge, 'out.say.judge', 2]); }
  lines.sort((a, b) => b[2] - a[2]).slice(0, N() > 3 ? 3 : 2).forEach(([p, k], i) => say(p, k, 250 + i * 650));
}

// ---------- flow ----------
function setState(next, { snapshot = false } = {}) {
  const prev = st;
  if (snapshot && !online()) history.push(OUT.clone(prev));
  st = next;
  pendingAct = false;
  if (st.log.length > prev.log.length) {
    reveal = st.log.length - 1;
    history = []; uncovered = null;
    react(st.log[reveal]);
  } else if (st.phase === 'guess') {
    for (const p of PL()) if (prev.guesses[p] === null && st.guesses[p] !== null && !isLocal(p) && Math.random() < 0.35) say(p, 'out.say.locked');
  }
  render();
  if (online() && sess.host) sendState();
  tick();
}

function act(p, lo, hi) {
  if (online() && !sess.host) {
    pendingAct = true;
    sess.send('move', { n: st.n, round: st.round, lo, hi });
    render();
    return;
  }
  const next = OUT.clone(st);
  if (OUT.guess(next, p, lo, hi)) setState(next, { snapshot: isLocal(p) });
}

function newGame() {
  clearTimeout(aiTimer);
  gameHumans = online() ? 2 : Math.min(cfg.humans, cfg.players);
  st = OUT.create({
    players: online() ? 2 : cfg.players, rounds: cfg.rounds, deck: cfg.deck, scoring: cfg.scoring,
    judge: !online() && cfg.judge, avoid: seen(),
  });
  st.gid = Math.random().toString(36).slice(2, 10);
  if (!online() || sess.host) {
    const ids = [...seen().filter((id) => !st.qs.some((q) => q.id === id)), ...st.qs.map((q) => q.id)];
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-70)));
  }
  history = []; shapes = {}; reveal = null; uncovered = null; finished = false; pendingAct = false; panelKey = '';
  hush(); calm();
  $('#result').hidden = true;
  render();
  if (online() && sess.host) sendState();
  tick();
}

// Computer guessers (never online). They don't look at anyone's range; they just "half-know" the answer.
function tick() {
  clearTimeout(aiTimer);
  if (online() || st.phase !== 'guess' || reveal !== null) return;
  const p = OUT.waitingFor(st).find((q) => isAI(q));
  if (p === undefined) return;
  aiTimer = setTimeout(() => {
    const g = OUT.aiGuess(st, p, cfg.level);
    act(p, g.lo, g.hi);
  }, 650 + Math.random() * 900);
}

function finish() {
  if (finished) return;
  finished = true;
  const w = OUT.winners(st);
  hush(); calm();
  const others = PL().filter((p) => !w.includes(p));
  if (w.length > 1) { w.forEach((p) => setMood(p, 'worried', 'wave')); say(w[0], 'out.say.draw'); }
  else { setMood(w[0], 'happy', 'up'); say(w[0], 'out.say.win'); }
  others.forEach((p) => setMood(p, 'sad'));
  if (others.length) say(others[0], 'out.say.lose', 800);
  const tx = $('#result-text');
  tx.textContent = w.length > 1 ? t('out.tie', { names: w.map(name).join(', ') }) : t('out.win', { name: name(w[0]) });
  tx.style.color = w.length > 1 ? 'var(--ink)' : COLORS[w[0]].main;
  $('#result-sub').textContent = PL().sort((a, b) => st.scores[b] - st.scores[a]).map((p) => `${name(p)} ${st.scores[p]}`).join(' · ');
  render();
  setTimeout(() => { if (finished && st.phase === 'over') $('#result').hidden = false; }, 500);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  st = history.pop();
  reveal = null; finished = false; pendingAct = false;
  // hot-seat: the player whose range was taken back gets the cover again
  uncovered = null;
  hush(); calm();
  $('#result').hidden = true;
  render();
  tick();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
}

// ---------- online ----------
// Host is authoritative and keeps secrets: the guest gets a copy with the host's pending range and the
// current answer blanked out. Moves carry the round/counter; a stale move just triggers a fresh 'state'.
function sendState() {
  sess.send('state', { st: OUT.redact(st, 1), names: cfg.names });
}
function onSession(s) {
  sess = s;
  synced = false;
  clearTimeout(aiTimer);
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    synced = true;
    remoteNames[0] = d.names[0];
    if (d.st.gid !== st.gid || d.st.log.length < st.log.length) {
      st = d.st; gameHumans = 2;
      reveal = null; finished = false; pendingAct = false; uncovered = null; shapes = {}; panelKey = '';
      for (const [k, v] of [['rounds', st.rounds], ['deck', st.deck], ['scoring', st.scoring]]) { cfg[k] = v; $('#' + k).value = v; }
      calm(); $('#result').hidden = true;
      if (st.phase === 'over') { reveal = null; finish(); }
      render();
      return;
    }
    setState(d.st);
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (!s.host) return;
    if (d.round !== st.round || st.phase !== 'guess') return sendState();
    const next = OUT.clone(st);
    if (OUT.guess(next, 1, d.lo, d.hi)) setState(next); else sendState();
  });
  s.on('resync', () => s.host && sendState());
  newGame();
  if (!s.host) s.send('resync');
}

// ---------- input ----------
panel.addEventListener('submit', (evt) => {
  evt.preventDefault();
  const lp = localGuesser();
  if (lp < 0) return;
  const { lo, hi, ok } = readForm();
  if (!ok) {
    updatePreview(true);
    const f = $('#gform');
    f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
    (OUT.parseNumber($('#g-lo').value, getLang()) === null ? $('#g-lo') : $('#g-hi')).focus();
    return;
  }
  document.activeElement?.blur();
  uncovered = null;
  act(lp, lo, hi);
});
panel.addEventListener('input', () => updatePreview());
panel.addEventListener('keydown', (evt) => {
  if (evt.key === 'Enter' && evt.target.id === 'g-lo') { evt.preventDefault(); $('#g-hi').focus(); }
});
panel.addEventListener('click', (evt) => {
  const neg = evt.target.closest('[data-neg]');
  if (neg) {
    const inp = $('#g-' + neg.dataset.neg);
    const v = inp.value.trim();
    inp.value = v.startsWith('-') || v.startsWith('−') ? v.slice(1) : '-' + v;
    updatePreview();
    return;
  }
  const b = evt.target.closest('[data-act]');
  if (!b) return;
  if (b.dataset.act === 'uncover') { uncovered = localGuesser(); render(); }
  if (b.dataset.act === 'next') {
    reveal = null;
    hush(); calm();
    if (st.phase === 'over') finish();
    else { render(); tick(); }
  }
});

$('#players').addEventListener('change', (e) => { cfg.players = +e.target.value; fillHumans(); saveCfg(); newGame(); });
$('#humans').addEventListener('change', (e) => { cfg.humans = +e.target.value; saveCfg(); newGame(); });
$('#level').addEventListener('change', (e) => { cfg.level = e.target.value; saveCfg(); render(); });
$('#judge').addEventListener('change', (e) => { cfg.judge = e.target.value === '1'; saveCfg(); newGame(); });
for (const k of ['rounds', 'deck', 'scoring']) {
  $('#' + k).addEventListener('change', (e) => { cfg[k] = k === 'rounds' ? +e.target.value : e.target.value; saveCfg(); restart(); });
}
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    panelKey = panelKey.startsWith('form') ? panelKey : '';
    render();
  }));
document.addEventListener('mg:lang', () => { fillHumans(); render(); if (finished) { finished = false; finish(); } });
desktop.addEventListener('change', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
fillHumans();
$('#players').value = cfg.players;
$('#level').value = cfg.level;
$('#rounds').value = cfg.rounds;
$('#deck').value = cfg.deck;
$('#judge').value = cfg.judge ? '1' : '0';
$('#scoring').value = cfg.scoring;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
