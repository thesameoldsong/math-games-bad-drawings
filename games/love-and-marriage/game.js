import { t, getLang, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs, withSeed } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { LAM } from './engine.js';
import './strings.js';

const SLUG = 'love-and-marriage';
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink, GREY = 'var(--lm-grey)';
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

const cfg = Object.assign({ guests: 16, rounds: 3, mode: 'pvp', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
if (!LAM.SIZES.includes(+cfg.guests)) cfg.guests = 16;
if (![1, 3, 5].includes(+cfg.rounds)) cfg.rounds = 3;
if (!['pvp', 'easy', 'normal'].includes(cfg.mode)) cfg.mode = 'pvp';
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, shapes, aiTimer, pending = false, fresh = new Set(), pops = [], popTimer;
let sess = null;                    // online session (shared/net.js), null when playing locally
let synced = false;                 // guest: the state on screen came from the host
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const ready = () => !online() || sess.connected;
const canMove = () => st.phase === 'play' && st.turn >= 0 && isLocal(st.turn) && ready() && !pending;
function name(p) {
  if (isAI(p)) return t('lam.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('lam.p' + p);
}
const fmt = (x) => {
  const s = String(Math.round(x * 10) / 10);
  return getLang() === 'ru' ? s.replace('.', ',') : s;
};

// ---------- geometry ----------
const W = 400, TOP = 42, FX = 130, COLS = 4;
function geo() {
  const R = st.labels.length, FR = Math.ceil(st.n / COLS);
  const H = TOP + Math.max(R * 31, FR * 76) + 4;
  return { R, FR, H, rh: (H - TOP - 4) / R, cw: (W - FX) / COLS, ch: (H - TOP - 4) / FR };
}
function cellXY(g, G) {
  const k = st.pos[g], col = k % COLS, row = Math.floor(k / COLS);
  return { cx: FX + col * G.cw + G.cw / 2, y: TOP + row * G.ch };
}
const shapeFor = (k, make) => (shapes[k] ??= make());
// Closed wobbly rectangle (one path, so it can be filled).
function rectPath(x, y, w, h, a = 1.2) {
  const j = () => (Math.random() * 2 - 1) * a;
  const P = [[x + j(), y + j()], [x + w + j(), y + j()], [x + w + j(), y + h + j()], [x + j(), y + h + j()]];
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4];
    d += ` Q${((x1 + x2) / 2 + j()).toFixed(1)} ${((y1 + y2) / 2 + j()).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d + 'Z';
}
const heart = (x, y, s) =>
  `M${x} ${y + s * 0.9} C${x - s * 1.4} ${y - s * 0.1} ${x - s * 0.7} ${y - s * 1.1} ${x} ${y - s * 0.35} C${x + s * 0.7} ${y - s * 1.1} ${x + s * 1.4} ${y - s * 0.1} ${x} ${y + s * 0.9}Z`;

// ---------- rendering ----------
function render() {
  const G = geo();
  svg.setAttribute('viewBox', `0 0 ${W} ${G.H}`);
  const turn = st.phase === 'play' ? st.turn : -1;
  const active = canMove() ? turn : -1;
  let out = '';

  // top strip: round, clock, wait button
  out += `<text class="lm-round" x="6" y="27">${t('lam.round', { r: st.round, n: st.rounds })}</text>`;
  for (let i = 0; i < st.T; i++) {
    const x = FX + 6 + i * 15.5, y = 21;
    const used = i < st.beat || st.phase !== 'play';
    const now = i === st.beat && st.phase === 'play';
    out += `<circle class="lm-tick${used ? ' used' : ''}${now ? ' now' : ''}" cx="${x}" cy="${y}" r="5.6"/>`;
  }
  const waitOk = active >= 0;
  out += `<g class="lm-wait${waitOk ? ' on' : ''}" data-act="wait">
    <path d="${shapeFor('waitbtn', () => rectPath(W - 84, 6, 80, 30, 1.6))}" ${waitOk ? `style="stroke:${COLORS[active].main}"` : ''}/>
    <text x="${W - 44}" y="28">${t('lam.wait')}</text></g>`;

  // scoreboard
  for (let i = 0; i < G.R; i++) {
    const y = TOP + i * G.rh, pair = st.track[i], next = i === st.track.length && st.phase === 'play';
    out += `<text class="lm-row${next ? ' next' : ''}" x="40" y="${y + G.rh / 2 + 1}">${st.labels[i]}</text>`;
    if (next) out += `<path class="lm-next" d="${shapeFor('nx' + i, () => line(2, y + G.rh / 2, 9, y + G.rh / 2, 0.5))}"/>`;
    for (let j = 0; j < 2; j++) {
      const x = 46 + j * 39, w = 35, h = G.rh - 7, yy = y + 3.5;
      const g = pair ? pair[j] : -1;
      const pc = g >= 0 && g < 2 ? COLORS[g] : null;
      const cls = 'lm-slot' + (g >= 0 ? ' full' : '') + (pair && fresh.has('row' + i) ? ' fresh' : '');
      out += `<path class="${cls}" d="${shapeFor('s' + i + j, () => rectPath(x, yy, w, h, 0.8))}" ${pc ? `style="fill:color-mix(in srgb, ${pc.fill} var(--lm-slot-mix), var(--card));stroke:${pc.text}"` : ''}/>`;
      if (g >= 0) out += `<text class="lm-slotnum${fresh.has('row' + i) ? ' fresh' : ''}" x="${x + w / 2}" y="${yy + h / 2 + 1}" ${pc ? `style="fill:${pc.text}"` : ''}>${st.card[g]}</text>`;
    }
  }

  // players' proposals: arrows across the room
  for (const p of [0, 1]) {
    const tg = st.target[p];
    if (st.phase === 'play' && LAM.free(st, p) && tg >= 0 && LAM.free(st, tg)) {
      const a = cellXY(p, G), b = cellXY(tg, G);
      const x1 = a.cx, y1 = a.y + 40, x2 = b.cx, y2 = b.y + 40;
      const mx = (x1 + x2) / 2 + (y2 - y1) * 0.25, my = (y1 + y2) / 2 - (x2 - x1) * 0.25 - 10;
      out += `<path class="lm-arrow" d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" stroke="${COLORS[p].main}"/>`;
    }
  }

  // the room
  const suitorsOf = active >= 0 ? new Set(LAM.suitors(st, active)) : new Set();
  for (let g = 0; g < st.n; g++) {
    const { cx, y } = cellXY(g, G);
    if (!LAM.free(st, g)) {
      out += `<path class="lm-ghost" d="${heart(cx, y + 36, 7)}"/>`;
      continue;
    }
    const pc = g < 2 ? COLORS[g] : null, known = st.known[g];
    const isSuitor = suitorsOf.has(g);
    const tappable = active >= 0 && g !== active && (known || g >= 2);
    let cls = 'lm-guest' + (tappable ? ' tap' : '') + (g === turn ? ' turn' : '');
    out += `<g class="${cls}" data-g="${g}">`;
    out += `<rect class="hit" x="${cx - (G.cw / 2 - 2)}" y="${y + 1}" width="${G.cw - 4}" height="${G.ch - 2}" rx="8"/>`;
    // head
    const hd = shapeFor('h' + g + '_' + st.round, () => withSeed(g * 13 + st.round, () => circle(cx, y + 13, 9.5, 9.5, 0.08)));
    out += `<path d="${hd}" class="lm-head" ${pc ? `style="fill:${pc.main}"` : ''} filter="url(#mg-crayon)"/>`;
    out += `<path d="${hd}" class="lm-head-o" ${pc ? `style="stroke:${pc.text}"` : ''}/>`;
    // card
    const cw = 48, chh = 32, x0 = cx - cw / 2, y0 = y + 25;
    const cp = shapeFor('c' + g + '_' + st.round, () => rectPath(x0, y0, cw, chh, 1.1));
    const ring = isSuitor ? COLORS[active] : pc;
    out += `<path class="lm-card${known ? '' : ' back'}${isSuitor ? ' suitor' : ''}${fresh.has('k' + g) ? ' fresh' : ''}" d="${cp}" ${ring ? `style="stroke:${ring.main}"` : ''}/>`;
    out += `<text class="lm-num${known ? '' : ' q'}" x="${cx}" y="${y0 + chh / 2 + 1}" ${pc ? `style="fill:${pc.text}"` : ''}>${known ? st.card[g] : '?'}</text>`;
    // whom this guest is courting
    const tg = st.target[g];
    if (tg >= 0 && LAM.free(st, tg)) {
      const hc = tg < 2 ? COLORS[tg].main : GREY;
      const ty = Math.min(y + G.ch - 6, y0 + chh + 15);
      out += `<path d="${heart(cx - 11, ty - 5, 5.2)}" fill="${hc}"/>`;
      out += `<text class="lm-court" x="${cx - 3}" y="${ty - 4}" fill="${hc}">${st.known[tg] ? st.card[tg] : '?'}</text>`;
    }
    if (isSuitor) out += `<path class="lm-badge" d="${heart(cx + cw / 2 - 2, y0 - 1, 6.5)}" fill="${COLORS[active].main}"/>`;
    out += '</g>';
  }

  // little speech pops in the room
  const now = Date.now();
  pops = pops.filter((q) => q.until > now);
  const placed = [];
  for (const q of pops) {
    if (q.g >= st.n) continue;
    const { cx, y: cy } = cellXY(q.g, G);
    const w = Math.max(40, q.text.length * 8.6 + 14), x = Math.max(FX + 2, Math.min(W - w - 2, cx - w / 2));
    // nudge down past bubbles already shown, so two shouts never cover each other
    let y = cy - 6;
    for (let k = 0; k < 4 && placed.some((r) => x < r.x + r.w && r.x < x + w && y < r.y + 26 && r.y < y + 26); k++) y += 27;
    placed.push({ x, y, w });
    out += `<g class="lm-pop"><rect x="${x}" y="${y}" width="${w}" height="24" rx="10" stroke="${q.color}"/>
      <text x="${x + w / 2}" y="${y + 13}" fill="${q.color}">${q.text}</text></g>`;
  }
  svg.innerHTML = out;
  svg.classList.toggle('can', active >= 0);
  renderPlayers();
}

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const act = st.phase === 'play' && st.turn === p;
    el.classList.toggle('active', act || st.phase !== 'play');
    const m = moods[p];
    const pose = st.phase !== 'play' || m.pose !== 'down' ? m.pose : act ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    const mate = st.partner[p];
    const cardTxt = mate >= 0 ? `${st.card[p]}\u2009♥\u2009${st.card[mate]}` : t('lam.card', { c: st.card[p] });
    el.querySelector('.score').textContent = `${cardTxt} · ${fmt(st.totals[p] + (st.phase === 'play' ? st.score[p] : 0))}`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) && !isAI(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p) || isAI(p);
  }

  const status = $('#status');
  const tp = st.turn;
  if (st.phase !== 'play') status.textContent = '';
  else if (online() && !sess.connected) status.textContent = t('lam.online.wait');
  else if (online()) status.textContent = isLocal(tp) ? t('lam.turn.you') : t('lam.turn.them', { name: name(tp) });
  else if (isAI(tp)) status.textContent = t('lam.thinking', { name: name(tp) });
  else status.textContent = t('lam.turn', { name: name(tp) });
  if (st.phase === 'play' && canMove() && st.round === 1 && st.beat < 2) status.insertAdjacentHTML('beforeend', `<small class="lm-hint">${t('lam.hint')}</small>`);
  status.style.color = tp >= 0 ? COLORS[tp].main : 'var(--ink)';

  $('#undo').disabled = online() || !history.length || (st.phase === 'play' && isAI(st.turn));
  $('#mode').disabled = online();
  $('#guests').disabled = !canRestart();
  $('#rounds').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#settings-note').textContent = online() ? t('lam.online.note') : '';
  renderResult();
}

function renderResult() {
  const res = $('#result');
  if (st.phase === 'play') { res.hidden = true; return; }
  const last = st.history[st.history.length - 1];
  const lines = [0, 1].map((p) => {
    const mate = last.partners[p];
    const what = mate == null ? t('lam.single') : `${t('lam.couple', { a: last.cards[p], b: mate })} → ${fmt(last.score[p])}`;
    return `<div style="color:${COLORS[p].main}">${t('lam.round.line', { name: name(p), pts: what })}</div>`;
  });
  const txt = $('#result-text'), sub = $('#result-sub');
  if (st.phase === 'roundEnd') {
    txt.textContent = t('lam.round.head', { r: last.round });
    txt.style.color = 'var(--ink)';
    sub.innerHTML = lines.join('');
    $("#next").hidden = !ready();
    $('#again').hidden = true;
    $('#result-wait').hidden = true;
  } else {
    const [a, b] = st.totals;
    const w = Math.abs(a - b) < 1e-9 ? -1 : a > b ? 0 : 1;
    txt.textContent = w < 0 ? t('lam.tie') : t('lam.win', { name: name(w) });
    txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
    const total = `<div class="lm-total"><span style="color:${COLORS[0].main}">${fmt(a)}</span> : <span style="color:${COLORS[1].main}">${fmt(b)}</span></div>`;
    sub.innerHTML = total + (st.rounds > 1 ? `<div class="lm-small">${t('lam.round.head', { r: last.round })}</div>` : '') + lines.join('');
    $('#next').hidden = true;
    $('#again').hidden = !canRestart();
    $('#result-wait').hidden = canRestart();
    if (online()) $('#result-wait').textContent = t('lam.online.waitnew', { name: name(1 - mySeat()) });
  }
  if (res.hidden && !res.dataset.timer) {
    res.dataset.timer = setTimeout(() => { delete res.dataset.timer; if (st.phase !== 'play') res.hidden = false; }, 1000);
  }
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
function pop(g, text, color) {
  pops = pops.filter((q) => q.g !== g);
  pops.push({ g, text, color, until: Date.now() + 1500 });
  clearTimeout(popTimer);
  popTimer = setTimeout(() => render(), 1550);
}

// ---------- reactions ----------
function react(prev, events) {
  fresh = new Set();
  const said = [false, false];
  const speak = (p, key, vars) => { if (!said[p]) { said[p] = true; say(p, key, vars); } };
  for (const e of events) {
    if (e.t === 'reveal') {
      fresh.add('k' + e.g);
      if (e.by === e.g && LAM.free(st, e.g) && st.target[e.g] >= 0 && st.target[e.g] < 2) {
        const p = st.target[e.g];
        pop(e.g, t('lam.my', { c: st.card[e.g] }), COLORS[p].main);
      } else if (e.by < 2) {
        pop(e.g, t('lam.my', { c: st.card[e.g] }), INK);
        if (Math.random() < 0.3) speak(e.by, 'say.ask');
      }
    } else if (e.t === 'refuse') {
      if (e.g >= 2) pop(e.g, t('lam.no'), INK);
      setMood(e.p, 'sad');
      speak(e.p, 'say.no');
    } else if (e.t === 'marry') {
      fresh.add('row' + e.row);
      for (const p of [0, 1]) {
        if (e.a !== p && e.b !== p) continue;
        const mate = e.a === p ? e.b : e.a;
        if (mate >= 2) pop(mate, t('lam.yes'), COLORS[p].main);
        const v = st.score[p];
        setMood(p, 'happy', v >= 50 ? 'up' : 'wave');
        speak(p, v >= 70 ? 'say.great' : v < 20 ? 'say.meh' : 'say.wed');
        const o = 1 - p;
        if (LAM.free(st, o) && mate !== o) setMood(o, 'worried');
      }
      // somebody snapped up the guest a player was courting
      for (const p of [0, 1]) {
        const tg = prev.target[p];
        if (LAM.free(st, p) && tg >= 0 && (e.a === tg || e.b === tg) && e.a !== p && e.b !== p) {
          setMood(p, 'sad');
          speak(p, 'say.stolen');
        }
      }
    }
  }
  // new admirers
  for (const p of [0, 1]) {
    if (!LAM.free(st, p) || st.phase !== 'play') continue;
    const before = new Set(LAM.suitors(prev, p)), now = LAM.suitors(st, p);
    if (now.some((g) => !before.has(g))) { setMood(p, 'smug'); speak(p, 'say.suitor'); }
    else if (st.beat >= st.T - 3 && prev.beat !== st.beat && Math.random() < 0.5) { setMood(p, 'worried'); speak(p, 'say.hurry'); }
  }
  const end = events.find((e) => e.t === 'roundEnd' || e.t === 'over');
  if (end) {
    const [a, b] = end.t === 'over' ? st.totals : end.score;
    const w = Math.abs(a - b) < 1e-9 ? -1 : a > b ? 0 : 1;
    if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); }
    else if (end.t === 'over') {
      setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
      setTimeout(() => say(w, 'say.win'), 300);
      setTimeout(() => say(1 - w, 'say.lose'), 1200);
    } else {
      setMood(w, 'happy', 'wave'); setMood(1 - w, 'sad');
      setTimeout(() => say(w, 'say.round'), 300);
      setTimeout(() => say(1 - w, 'say.roundbad'), 1200);
    }
  }
}

// ---------- flow ----------
function newGame() {
  clearTimeout(aiTimer);
  st = LAM.create({ guests: cfg.guests, rounds: cfg.rounds });
  history = []; shapes = {}; pops = []; fresh = new Set(); pending = false;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

function act(a) {
  if (!LAM.isLegal(st, a)) return;
  const prev = LAM.clone(st);
  history.push(prev);
  if (a.t === 'next') { setMood(0, 'neutral'); setMood(1, 'neutral'); shapes = {}; }
  const events = LAM.apply(st, a);
  if (a.t === 'next') { $('#result').hidden = true; fresh = new Set(); }
  else react(prev, events);
  render();
  if (online() && sess.host) sendState(events);
  maybeAI();
}

function maybeAI() {
  clearTimeout(aiTimer);
  if (online()) return;
  if (st.phase === 'play' && isAI(st.turn)) aiTimer = setTimeout(() => act(LAM.aiAction(st, cfg.mode)), 850);
}

function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && (st.phase !== 'play' || isAI(st.turn)));
  if (st.phase !== 'play' || isAI(st.turn)) { newGame(); return; }
  fresh = new Set(); pops = [];
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
}

// Online, only the room creator may restart (and change settings); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState([]);
}

// ---------- online ----------
// The host owns the full state (hidden cards, crowd moods, the random seed) and sends the guest
// only the redacted view after every action. The guest sends actions tagged with the move counter.
function sendState(events = []) {
  sess.send('state', { st: LAM.redact(st), ev: events, names: cfg.names });
}
function onSession(s) {
  sess = s; synced = false;
  clearTimeout(aiTimer);
  s.on('status', () => render());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState([]);
  });
  s.on('state', (d) => {
    if (s.host) return;
    const prev = st;
    // same match as the one on screen? (the first state replaces the guest's own local deal)
    const same = synced && prev.id === d.st.id && prev.round === d.st.round && d.st.moves >= prev.moves;
    st = d.st; history = []; pending = false; synced = true;
    remoteNames[0] = d.names[0];
    cfg.guests = st.n; $('#guests').value = st.n;
    cfg.rounds = st.rounds; $('#rounds').value = st.rounds;
    if (!same) { shapes = {}; fresh = new Set(); setMood(0, 'neutral'); setMood(1, 'neutral'); }
    if (same && d.ev.length) react(prev, d.ev);
    if (st.phase === 'play') $('#result').hidden = true;
    render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (!s.host) return;
    if (d.n !== st.moves || !LAM.isLegal(st, d.a) || (d.a.t !== 'next' && st.turn !== 1)) return sendState([]);
    act(d.a);
  });
  s.on('resync', () => s.host && sendState([]));
  if (s.host) newGame();
  else { pending = false; render(); s.send('resync'); }
}

function localMove(a) {
  if (online() && !sess.host) {
    if (pending) return;
    pending = true;
    sess.send('move', { a, n: st.moves });
    render();
    setTimeout(() => { if (pending) { pending = false; sess && sess.send('resync'); } }, 4000);
    return;
  }
  act(a);
}

// ---------- input ----------
svg.addEventListener('click', (evt) => {
  if (!canMove()) return;
  if (evt.target.closest('[data-act=wait]')) return localMove({ t: 'wait' });
  const el = evt.target.closest('[data-g]');
  if (!el) return;
  const g = +el.dataset.g;
  if (g === st.turn || !LAM.free(st, g)) return;
  localMove(st.known[g] ? { t: 'propose', g } : { t: 'ask', g });
});

$('#guests').addEventListener('change', (e) => { cfg.guests = +e.target.value; saveCfg(); restart(); });
$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#next').addEventListener('click', () => {
  if (st.phase !== 'roundEnd' || !ready()) return;
  localMove({ t: 'next' });
});
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
$('#guests').value = cfg.guests;
$('#rounds').value = cfg.rounds;
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
