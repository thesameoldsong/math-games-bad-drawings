import { t, applyI18n } from '../../shared/i18n.js';
import { PALETTE, line, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { ARP } from './engine.js';
import './strings.js';

const SLUG = 'arpeggios';
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');

// sheet geometry (viewBox 400 × 470)
const COLX = [107, 293], COLW = 172, ROW0 = 50, RH = 26.6;
const rowY = (i) => ROW0 + i * RH;
const DIE = [[172, 368], [228, 368]], DS = 50;

const cfg = Object.assign({ mode: 'pvp', asc: 'roll', names: ['', ''] }, JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, over, aiTimer, shapes = {}, rollAnim = false, flash = null;
// Dice are fixed per action index for the whole game, so undo + replay can never be used to re-roll.
let fate = {};
const rollAt = (n) => (fate['r' + n] ??= [ARP.die(), ARP.die()]);
const rerollAt = (n) => (fate['v' + n] ??= ARP.die());
let sess = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const canAct = () => !over && isLocal(st.turn) && (!online() || sess.connected);
function name(p) {
  if (isAI(p)) return t('arp.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('arp.p' + p);
}

// ---------- drawing helpers ----------
const fx = (n) => n.toFixed(1);
const shapeFor = (k, make) => (shapes[k] ??= make());
function rrect(x, y, w, h, r = 8, a = 1.4) {
  const j = () => (Math.random() * 2 - 1) * a;
  const P = (px, py) => `${fx(px + j())} ${fx(py + j())}`;
  return `M${P(x + r, y)} L${P(x + w - r, y)} Q${fx(x + w)} ${fx(y)} ${P(x + w, y + r)} L${P(x + w, y + h - r)} ` +
    `Q${fx(x + w)} ${fx(y + h)} ${P(x + w - r, y + h)} L${P(x + r, y + h)} Q${fx(x)} ${fx(y + h)} ${P(x, y + h - r)} ` +
    `L${P(x, y + r)} Q${fx(x)} ${fx(y)} ${fx(x + r)} ${fx(y)} Z`;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const txt = (x, y, s, cls, extra = '') => `<text x="${fx(x)}" y="${fx(y)}" class="${cls}" ${extra}>${esc(s)}</text>`;
const stroke = (d, color, w = 3, extra = '') =>
  `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const PIPS = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
function die(i, v, cls, color) {
  const [x, y] = DIE[i];
  let o = `<path d="${shapeFor('die' + i, () => rrect(x - DS / 2, y - DS / 2, DS, DS, DS * 0.2, 1.2))}" class="die-body"${color ? ` style="stroke:${color}"` : ''}/>`;
  if (v) for (const [a, b] of PIPS[v]) o += `<circle cx="${fx(x + a * DS * 0.26)}" cy="${fx(y + b * DS * 0.26)}" r="${fx(DS * 0.09)}" class="pip"/>`;
  else o += txt(x, y + 2, '?', 'die-q');
  return `<g class="die ${cls}" data-act="${cls.includes('can') ? 'roll' : ''}">${o}</g>`;
}
function button(x, y, w, h, label, act, color, { primary = false, off = false, sub = '', cls = '', data = '' } = {}) {
  const d = shapeFor(`btn${x}:${y}:${w}`, () => rrect(x, y, w, h, 12, 1.5));
  const fill = primary && !off ? color.main : '#fff';
  const ink = primary && !off ? '#fff' : off ? '#999' : color.main ?? INK;
  let o = `<g class="sbtn ${cls}${off ? ' off' : ''}" ${act && !off ? `data-act="${act}"` : ''} ${data}>`;
  o += `<path d="${d}" fill="${fill}" stroke="${primary && !off ? color.dark : off ? '#bbb' : color.main ?? INK}" stroke-width="2.6"/>`;
  o += txt(x + w / 2, y + h / 2 + (sub ? -8 : 1), label, 'btn-txt', `fill="${ink}"`);
  if (sub) o += txt(x + w / 2, y + h - 10, sub, 'btn-sub', `fill="${ink}"`);
  return o + '</g>';
}
function arrow(x, y1, y2, color) {
  const up = y2 < y1, h = up ? 7 : -7;
  return stroke(shapeFor(`ar${x}${y1}`, () => line(x, y1, x, y2, 0.8)), color, 3.2) +
    stroke(`M${x - 6} ${y2 + h} L${x} ${y2} L${x + 6} ${y2 + h}`, color, 3.2);
}

// ---------- rendering ----------
function render() {
  let o = '';
  // paper sheet
  o += `<path d="${shapeFor('paper', () => rrect(10, 4, 380, 318, 6, 1.2))}" class="paper"/>`;
  o += stroke(shapeFor('div', () => line(200, 10, 200, 316, 1.2)), INK, 2.4);
  o += stroke(shapeFor('hdr', () => line(16, ROW0 - 2, 384, ROW0 - 2, 1)), INK, 2.4);
  for (let i = 1; i <= 10; i++) {
    for (const p of [0, 1]) {
      const x0 = COLX[p] - COLW / 2 + 4;
      o += stroke(shapeFor(`rl${p}_${i}`, () => line(x0, rowY(i), x0 + COLW - 8, rowY(i), 0.6)), PALETTE.pencil, 1.6);
    }
  }
  const actor = st.phase === 'decide' || st.phase === 'steal' ? st.turn : -1;
  for (const p of [0, 1]) {
    const c = COLORS[p], cx = COLX[p], L = st.lists[p], up = st.dirs[p] > 0;
    // header: arrow + direction word + reset token
    o += arrow(cx - 70, up ? 40 : 12, up ? 12 : 40, c.main);
    o += txt(cx - 56, 27, t(up ? 'arp.up' : 'arp.down').replace(/^[↑↓]\s*/, ''), 'dir', `fill="${c.main}"`);
    const used = ARP.broke(st, p);
    o += txt(cx + 80, 28, t('arp.reset'), 'reset' + (used ? ' used' : ''), '');
    if (used) { const w = [...t("arp.reset")].length * 7.4 + 6; o += stroke(shapeFor("rs" + p + w, () => line(cx + 83 - w, 25, cx + 83, 30, 1)), c.main, 2.6); }
    // next row hint for whoever is deciding
    if (p === actor && L.length < 10) {
      o += `<path d="${shapeFor(`hl${p}_${L.length}`, () => rrect(cx - COLW / 2 + 6, rowY(L.length) + 2, COLW - 12, RH - 3, 6, 0.8))}" fill="${c.fill}" opacity=".28"/>`;
    }
    // numbers
    L.forEach((n, i) => {
      const rot = shapeFor(`rot${p}_${i}_${n}`, () => (Math.random() * 2 - 1) * 4);
      const y = rowY(i) + RH / 2 + 1, fresh = flash && flash.p === p && flash.i === i;
      // rotation on the wrapper so the pop animation's CSS transform doesn't fight it
      o += `<g transform="rotate(${rot.toFixed(1)} ${cx} ${fx(y)})"><text x="${cx}" y="${fx(y)}" class="num${fresh ? ' fresh' : ''}" fill="${c.main}">${n}</text></g>`;
    });
    if (st.breakAt[p] > 0) {
      const y = rowY(st.breakAt[p]);
      o += stroke(shapeFor(`brk${p}_${st.breakAt[p]}`, () => line(cx - COLW / 2 + 6, y, cx + COLW / 2 - 6, y, 0.8)), c.main, 4.5);
    }
    if (!over && ARP.stuck(st, p)) o += txt(cx, rowY(Math.min(L.length, 9)) + RH / 2 + 1, t('arp.stuck'), 'stucktag', `fill="${c.dark}"`);
  }
  // ghosts: what a number button would write (shown on hover via CSS :has)
  if (actor >= 0 && canAct()) {
    const L = st.lists[actor];
    for (const n of ARP.options(st, actor)) {
      const cx = COLX[actor], y = rowY(L.length) + RH / 2 + 1;
      o += `<g class="ghost" data-n="${n}"><text x="${cx}" y="${fx(y)}" class="num" fill="${COLORS[actor].main}">${n}</text>`;
      if (ARP.kind(st, actor, n) === 2) o += stroke(line(cx - COLW / 2 + 6, rowY(L.length), cx + COLW / 2 - 6, rowY(L.length), 0.5), COLORS[actor].main, 4.5);
      o += '</g>';
    }
  }

  // dice + actions
  const local = canAct();
  const roller = st.phase === 'roll' ? st.turn : st.roller;
  const rc = COLORS[roller];
  if (st.dice) {
    o += die(0, st.dice[0], rollAnim ? 'roll' : '', rc.dark) + die(1, st.dice[1], rollAnim ? 'roll2' : '', rc.dark);
  } else {
    const can = local && st.phase === 'roll';
    o += die(0, 0, 'empty' + (can ? ' can' : '')) + die(1, 0, 'empty' + (can ? ' can' : ''));
  }
  if (!over) {
    if (st.phase === 'roll') {
      if (local) o += button(120, 410, 160, 50, t('arp.roll'), 'roll', COLORS[st.turn], { primary: true });
    } else {
      const p = st.turn, c = COLORS[p];
      const [a, b] = st.dice;
      const nums = a === b ? [a * 11] : [a * 10 + b, b * 10 + a];
      nums.forEach((n, k) => {
        const kd = ARP.kind(st, p, n);
        const x = k === 0 ? 18 : 270;
        const sub = kd === 2 ? t('arp.reset') : '';
        o += button(x, 342, 112, 52, String(n), 'place', c, {
          off: !kd || !local, sub, cls: 'nb' + (!kd ? ' bad' : '') + (flash && flash.n === n && flash.p === p ? ' chosen' : ''),
          data: `data-n="${n}"`,
        });
        if (!kd) o += stroke(shapeFor(`x${k}_${n}`, () => line(x + 26, 368, x + 86, 368, 1.5)), '#999', 3);
      });
      if (st.phase === 'decide' && ARP.canReroll(st)) {
        o += button(270, 342, 112, 52, t('arp.reroll'), 'reroll', INK_C, { off: !local, cls: 'small' });
      }
      if (local) {
        if (st.phase === 'decide') o += button(140, 410, 120, 50, t('arp.pass'), 'pass', c);
        else o += button(120, 410, 160, 50, t('arp.decline'), 'decline', c, { primary: !ARP.options(st, p).length });
      }
    }
  }
  svg.innerHTML = o;
  rollAnim = false;
  renderPlayers();
}
const INK_C = { main: INK, dark: INK, fill: '#ddd' };

function renderPlayers() {
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    const active = !over && st.turn === p;
    el.classList.toggle('active', active);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : active ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    el.querySelector('.score').textContent = `${st.dirs[p] > 0 ? '↑' : '↓'} ${t('arp.count', { n: st.lists[p].length })}`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status'), p = st.turn, nm = { name: name(p) };
  const none = (st.phase === 'decide' || st.phase === 'steal') && !ARP.options(st, p).length;
  let s = '';
  if (over) s = '';
  else if (online() && !sess.connected) s = t('arp.online.wait');
  else if (isAI(p)) s = t('arp.thinking', nm);
  else if (online() && isRemote(p)) s = t('arp.them', nm);
  else if (online()) s = t(st.phase === 'roll' ? 'arp.you.roll' : st.phase === 'decide' ? 'arp.you.decide' : 'arp.you.steal');
  else if (st.phase === 'roll') s = t('arp.turn', nm);
  else if (st.phase === 'decide') s = t(none ? 'arp.decide.none' : 'arp.decide', nm);
  else s = t(none ? 'arp.steal.none' : 'arp.steal', nm);
  status.textContent = s;
  status.style.color = COLORS[p].main;

  $('#undo').disabled = online() || !history.length || (isAI(st.turn) && !over);
  $('#mode').disabled = online();
  $('#asc').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('arp.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('arp.online.note') : '';
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
function pickAsc() {
  if (cfg.asc === '0' || cfg.asc === '1') return +cfg.asc;
  // the book: each rolls a die, the lower roll goes up (reroll ties)
  let a, b;
  do { a = ARP.die(); b = ARP.die(); } while (a === b);
  return a < b ? 0 : 1;
}
function newGame(state) {
  clearTimeout(aiTimer);
  st = state || ARP.create({ asc: pickAsc() });
  history = []; over = false; flash = null; fate = {};
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  const up = st.dirs[0] > 0 ? 0 : 1;
  setTimeout(() => { say(up, 'arp.say.up'); setTimeout(() => say(1 - up, 'arp.say.down'), 500); }, 250);
  maybeAI();
}

function play(a) {
  const prev = ARP.clone(st);
  if (!ARP.apply(st, a)) return false;
  history.push(prev);
  const p = prev.turn, o = 1 - p;
  flash = null;
  if (a.t === 'roll') {
    rollAnim = true;
    setMood(p, 'neutral');
    if (st.dice[0] === st.dice[1]) { setMood(p, 'happy'); say(p, 'arp.say.double'); }
  } else if (a.t === 'reroll') {
    rollAnim = true;
  } else if (a.t === 'pass') {
    setMood(p, 'neutral');
    say(p, 'arp.say.pass');
  } else if (a.t === 'decline') {
    setMood(p, 'neutral');
    say(p, 'arp.say.decline');
  } else if (a.t === 'place') {
    const c = ARP.cost(prev, p, a.n), k = ARP.kind(prev, p, a.n), stolen = prev.phase === 'steal';
    flash = { p, i: st.lists[p].length - 1, n: a.n };
    if (stolen) {
      setMood(p, 'smug', 'wave'); say(p, 'arp.say.steal');
      setMood(o, 'sad'); if (Math.random() < 0.6) setTimeout(() => say(o, 'arp.say.robbed'), 700);
    } else if (k === 2) { setMood(p, 'happy', 'wave'); say(p, 'arp.say.reset'); }
    else if (c <= 3) { setMood(p, 'happy', 'wave'); say(p, 'arp.say.good'); }
    else if (c >= 12) { setMood(p, 'worried'); say(p, 'arp.say.risky'); }
    else { setMood(p, 'neutral'); if (Math.random() < 0.35) say(p, 'arp.say.ok'); }
    if (!stolen && moods[o].mood !== 'smug') setMood(o, 'neutral');
    const n = st.lists[p].length;
    if (st.phase !== 'over') {
      if (ARP.stuck(st, p)) { setMood(p, 'sad'); setTimeout(() => say(p, 'arp.say.stuck'), 900); }
      else if (n === 9) { setTimeout(() => say(p, 'arp.say.close'), 900); setMood(o, 'worried'); setTimeout(() => say(o, 'arp.say.worry'), 1500); }
    }
  }
  if (ARP.isOver(st)) { finish(); return true; }
  render();
  maybeAI();
  return true;
}

function maybeAI() {
  clearTimeout(aiTimer);
  if (over || !isAI(st.turn)) return;
  const delay = st.phase === 'roll' ? 650 : 1100;
  aiTimer = setTimeout(() => {
    const a = ARP.aiMove(st, cfg.mode);
    if (a.t === 'roll') a.d = rollAt(st.n);
    if (a.t === 'reroll') a.v = rerollAt(st.n);
    if (a.t === 'place') { // show which number the computer picks for a moment
      flash = { p: st.turn, n: a.n, i: -1 };
      render();
      aiTimer = setTimeout(() => play(a), 450);
    } else play(a);
  }, delay);
}

function finish() {
  over = true;
  const w = st.winner, [a, b] = st.lists.map((l) => l.length);
  if (w === 2) { setMood(0, 'worried'); setMood(1, 'worried'); }
  else {
    setMood(w, 'happy', 'up'); setMood(1 - w, 'sad');
    setTimeout(() => say(w, 'arp.say.win'), 300);
    setTimeout(() => say(1 - w, 'arp.say.lose'), 1100);
  }
  render();
  const txtEl = $('#result-text');
  txtEl.textContent = w === 2 ? t('arp.tie', { a, b }) : t('arp.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  txtEl.style.color = w === 2 ? 'var(--ink)' : COLORS[w].main;
  $('#result-sub').hidden = st.end !== 'stuck';
  $('#result-sub').textContent = t('arp.stuckend');
  setTimeout(() => { if (over) $('#result').hidden = false; }, 1100);
}

// Undo back to this device's previous decision (never to a bare roll, so dice can't be re-rolled).
function undo() {
  if (!history.length || online()) return;
  clearTimeout(aiTimer);
  do st = history.pop(); while (history.length && !(st.phase !== 'roll' && isLocal(st.turn)));
  over = false; flash = null;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
function sendState() { sess.send('state', { st, names: cfg.names }); }
function onSession(s) {
  sess = s;
  clearTimeout(aiTimer);
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    remoteNames[0] = d.names[0];
    const fresh = d.st.n === 0;
    if (fresh) return newGame(d.st);
    st = d.st; history = []; flash = null; over = false;
    $('#result').hidden = true;
    ARP.isOver(st) ? finish() : render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (d.n !== st.n || !isRemote(st.turn)) return s.host ? sendState() : s.send('resync');
    if (!play(d.a)) return s.host ? sendState() : s.send('resync');
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else render();
}

// ---------- input ----------
function act(type, n) {
  if (!canAct()) return;
  let a;
  if (type === 'roll') a = { t: 'roll', d: rollAt(st.n) };
  else if (type === 'reroll') a = { t: 'reroll', v: rerollAt(st.n) };
  else if (type === 'place') a = { t: 'place', n };
  else a = { t: type };
  const n0 = st.n;
  if (play(a) && online()) sess.send('move', { a, n: n0 });
}
// Mouse hover over a number button previews it in the column.
svg.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const b = e.target.closest('.nb[data-act]');
  svg.querySelectorAll('.ghost.on').forEach((g) => g.classList.remove('on'));
  if (b) svg.querySelector(`.ghost[data-n="${b.dataset.n}"]`)?.classList.add('on');
});
svg.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !el.dataset.act) return;
  act(el.dataset.act, el.dataset.n ? +el.dataset.n : undefined);
});

$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#asc').addEventListener('change', (e) => { cfg.asc = e.target.value; saveCfg(); restart(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    renderPlayers();
  }));
document.addEventListener('mg:lang', () => render());

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#asc').value = cfg.asc;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
