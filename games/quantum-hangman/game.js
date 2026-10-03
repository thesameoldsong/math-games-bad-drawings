import { t, applyI18n, getLang, plural } from '../../shared/i18n.js';
import { PALETTE, line, circle, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { QH } from './engine.js';
import './strings.js';

const SLUG = 'quantum-hangman';
const KEY = 'mg-' + SLUG;
const COLORS = [PALETTE.blue, PALETTE.red];
const INK = PALETTE.ink;
const W = 400;
const $ = (sel) => document.querySelector(sel);
const svg = $('#board');
const panel = $('#panel');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const cfg = Object.assign({ mode: 'pvp', you: 'alt', nwords: 2, len: 5, names: ['', ''] }, JSON.parse(localStorage.getItem(KEY) || '{}'));
const saveCfg = () => localStorage.setItem(KEY, JSON.stringify(cfg));

// M: the match. Host/local keep the full engine state in M.g; an online guest only gets M.v (a filtered view).
let M;
let history = [];      // engine snapshots for undo (local play only)
let cover = null;      // hot-seat "pass the device" screen: 'setter' | 'guesser' | null
let shapes = {};       // cached wobble per drawn element
let aiTimer, sess = null, synced = false, lastWrong = 0, pending = false, pendingTimer, panelKey = '', freshKey = null;
const remoteNames = ['', ''];
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];

// ---------- who is who ----------
const online = () => !!sess;
const isGuest = () => online() && !sess.host;
const vsAI = () => !online() && cfg.mode !== 'pvp';
const hotSeat = () => !online() && cfg.mode === 'pvp';
const isAI = (p) => vsAI() && p === 1;
const isRemote = (p) => online() && p !== sess.seat;
const isLocal = (p) => !isAI(p) && !isRemote(p);
function setterOf(round) {
  if (vsAI() && cfg.you !== 'alt') return cfg.you === 'guess' ? 1 : 0;
  return (round + 1) % 2; // red sets first, blue guesses first
}
const setter = () => setterOf(M.round);
const guesser = () => 1 - setter();
function name(p) {
  if (isAI(p)) return t('qh.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('qh.p' + p);
}

// What this screen shows. The setter's own device (vs computer / online) sees the secret words.
function V() {
  if (isGuest()) return M.v;
  if (!M.g) return null;
  return QH.view(M.g, M.phase === 'over' || (!hotSeat() && isLocal(setter())));
}
const canAct = () => {
  const v = V();
  return M.phase === 'play' && !cover && !pending && v && isLocal(guesser()) && (!online() || sess.connected)
    && (v.status === 'play' || v.status === 'conflict');
};

// ---------- geometry / drawing ----------
const shape = (k, make) => (shapes[k] ??= make());
const P = (d, color = INK, w = 3.2, extra = '') =>
  `<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
function box(x, y, w, h, amp = 1.2) {
  return [line(x, y, x + w, y, amp), line(x + w, y, x + w, y + h, amp), line(x + w, y + h, x, y + h, amp), line(x, y + h, x, y, amp)].join(' ');
}
const txt = (x, y, s, { size = 34, color = INK, weight = 700, anchor = 'middle', cls = '', extra = '' } = {}) =>
  `<text class="${cls}" x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}" ${extra}>${esc(s)}</text>`;

function gallows(nWrong, maxWrong) {
  const grew = nWrong > lastWrong;
  lastWrong = nWrong;
  let s = '';
  for (const [k, a] of [['gb', [10, 146, 132, 146]], ['gp', [36, 146, 36, 14]], ['gt', [28, 16, 110, 16]], ['gs', [36, 46, 64, 16]], ['gr', [100, 16, 100, 34]]])
    s += P(shape(k, () => line(...a, 1.6)), INK, 4);
  const parts = [
    () => shape('mh', () => circle(100, 47, 13, 13.5, 0.06)),
    () => shape('mb', () => line(100, 61, 100, 100, 1.2)),
    () => shape('ma1', () => line(100, 72, 84, 90, 1)),
    () => shape('ma2', () => line(100, 72, 116, 90, 1)),
    () => shape('ml1', () => line(100, 100, 88, 128, 1)),
    () => shape('ml2', () => line(100, 100, 112, 128, 1)),
    () => 'M93 41 L97 45 M97 41 L93 45 M103 41 L107 45 M107 41 L103 45',
    () => 'M95 54 Q100 50 105 54',
  ];
  // spread the 8 drawing steps over maxWrong misses
  const shown = Math.min(parts.length, Math.round((Math.min(nWrong, maxWrong) * parts.length) / maxWrong));
  for (let i = 0; i < shown; i++) s += P(parts[i](), PALETTE.red.dark, i >= 6 ? 2.4 : 3.6, i === shown - 1 && grew ? 'class="fresh-part" pathLength="1"' : '');
  return s;
}

function render() {
  renderBoard();
  renderPanel();
  renderPlayers();
}

function renderBoard() {
  const v = V();
  const alpha = v ? v.alpha : getLang() === 'ru' ? 'ru' : 'en';
  const letters = [...QH.ALPHA[alpha]];
  const act = canAct();
  let s = '';

  // gallows + misses box
  const nWrong = v ? v.wrong.length : 0, maxWrong = v ? v.maxWrong : 8;
  s += gallows(nWrong, maxWrong);
  const rows = Math.max(2, Math.ceil(nWrong / 4));
  const bx = 160, by = 6, bw = 234, bh = 40 + rows * 42;
  s += P(shape('box' + rows, () => box(bx, by, bw, bh)), INK, 2.6);
  s += txt(bx + 14, by + 28, `${t('qh.wrongbox')}  ${nWrong}/${maxWrong}`, { size: 22, color: '#777', anchor: 'start', weight: 600 });
  for (let i = 0; i < Math.max(maxWrong, nWrong); i++) {
    const r = Math.floor(i / 4), c = i % 4, x = bx + 16 + c * 54, y = by + 70 + r * 42;
    s += P(shape('wl' + i, () => line(x, y + 4, x + 40, y + 4, 1)), '#9a9aa4', 2.2);
    const w = v && v.wrong[i];
    if (w) {
      s += txt(x + 20, y, w.c, { size: 34, color: PALETTE.red.main, cls: freshKey === 'x' + w.c ? 'pop' : '' });
      if (w.retro) s += P(`M${x + 2} ${y + 9} q4 -4 8 0 t8 0 t8 0 t8 0 t8 0`, PALETTE.red.dark, 1.8);
    }
  }
  let top = by + bh + 8;
  if (v && v.words && M.phase !== 'over') {
    const parts = v.words.map((w, i) => (v.aliveMask[i] ? w : `<tspan text-decoration="line-through" fill="#aaa">${w}</tspan>`));
    s += `<text x="${bx + 4}" y="${top + 18}" font-size="21" fill="#666" font-weight="600">${esc(t('qh.yourwords'))} ${parts.join(' · ')}</text>`;
    top += 46;
  }
  top = Math.max(top, 154);

  // blanks
  const L = v ? v.L : cfg.len;
  const sw = Math.min(48, 392 / L), x0 = (W - sw * L) / 2;
  const yb = top + 78, fs = Math.min(42, sw * 0.95);
  for (let i = 0; i < L; i++) {
    const x = x0 + i * sw;
    s += P(shape(`bl${L}_${i}_${yb}`, () => line(x + 4, yb, x + sw - 4, yb, 1.2)), INK, 3.4);
    if (!v) continue;
    const cell = v.cells[i], cx = x + sw / 2;
    if (cell.length > 1) {
      // a clash: both letters, stacked, each tappable to keep it
      cell.forEach((c, k) => {
        const y = yb - 8 - k * (fs + 6);
        s += `<g class="keep${act ? ' live' : ''}" data-keep="${i}:${c}">`;
        s += P(shape(`cc${L}_${i}_${k}_${c}_${yb}`, () => circle(cx, y - fs * 0.34, sw * 0.46, fs * 0.6, 0.08)), PALETTE.red.main, 2.6, 'class="ring"');
        s += `<rect x="${x}" y="${y - fs - 2}" width="${sw}" height="${fs + 6}" fill="transparent"/>`;
        s += txt(cx, y, c, { size: fs, color: PALETTE.red.dark });
        s += '</g>';
      });
    } else if (cell.length) {
      s += txt(cx, yb - 8, cell[0], { size: fs, color: COLORS[guesser()].dark, cls: freshKey === 'b' + cell[0] ? 'pop' : '' });
    }
    v.ghosts[i].forEach((c, k) => {
      const gy = yb + 26 + k * 22;
      s += txt(cx, gy, c, { size: 22, color: '#b0b0b8', weight: 600 });
      s += P(`M${cx - 9} ${gy - 6} L${cx + 9} ${gy - 10}`, '#b0b0b8', 2);
    });
  }

  // keyboard
  const cols = letters.length > 26 ? 11 : 9;
  const ghostRows = v ? Math.max(1, ...v.ghosts.map((g) => g.length)) : 1; // 3 words: up to 2 struck letters per blank
  const kw = W / cols, kh = 46, ky = yb + 52 + (ghostRows - 1) * 24;
  const G = new Set(v ? v.guessed : []);
  const wrongSet = new Set(v ? v.wrong.map((w) => w.c) : []);
  const nRows = Math.ceil(letters.length / cols);
  letters.forEach((c, i) => {
    const r = Math.floor(i / cols), inRow = Math.min(cols, letters.length - r * cols);
    const x = (W - inRow * kw) / 2 + (i % cols) * kw + 2, y = ky + r * (kh + 6);
    const used = G.has(c), miss = wrongSet.has(c);
    const live = act && v.status === 'play' && !used;
    const fill = !used ? '#fff' : miss ? '#ededf0' : COLORS[guesser()].fill;
    s += `<g class="key${live ? ' live' : ''}${used ? ' used' : ''}" data-key="${c}">`;
    s += `<path d="${shape(`k${alpha}${i}_${ky}`, () => box(x, y, kw - 4, kh, 0.9))}" fill="${fill}" stroke="${used && miss ? '#b8b8c0' : INK}" stroke-width="2" stroke-linejoin="round"/>`;
    s += txt(x + (kw - 4) / 2, y + kh / 2 + 10, c, { size: 28, color: miss ? '#a8a8b0' : used ? COLORS[guesser()].dark : INK });
    if (miss) s += P(shape(`kx${alpha}${i}_${ky}`, () => line(x + 6, y + kh - 6, x + kw - 10, y + 6, 1)), PALETTE.red.main, 2.4);
    s += '</g>';
  });
  const H = ky + nRows * (kh + 6) + 2;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.classList.toggle('idle', !act);
  svg.innerHTML = s;
}

// ---------- setup / cover / waiting panel ----------
function renderPanel() {
  let key = '', html = '';
  const S = setter(), Gp = guesser();
  if (M.phase === 'setup') {
    if (online() && !sess.connected) key = 'none';
    else if (!isLocal(S)) {
      key = 'wait' + S;
      html = `<div class="panel-card"><p class="panel-title" style="color:${COLORS[S].main}">${esc(t('qh.wait.setup', { name: name(S) }))}</p><span class="mg-on-spin"></span></div>`;
    } else if (cover === 'setter') {
      key = 'cs' + S;
      html = `<div class="panel-card"><p class="panel-title" style="color:${COLORS[S].main}">${esc(t('qh.cover.setter', { name: name(S) }))}</p>
        <button class="btn primary" data-act="uncover" style="background:${COLORS[S].main};border-color:${COLORS[S].dark}">${esc(t('qh.cover.setter.btn'))}</button></div>`;
    } else {
      const n = cfg.nwords;
      key = 'setup' + S + n + M.round;
      const inputs = Array.from({ length: n }, (_, i) =>
        `<input type="text" class="word-in" maxlength="${QH.MAX_LEN}" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="${esc(t('qh.setup.ph', { i: i + 1 }))}">`).join('');
      html = `<form class="panel-card setup" autocomplete="off">
        <p class="panel-title" style="color:${COLORS[S].main}">${esc(t('qh.setup.title', { name: name(S), n: t('qh.setup.n' + n) }))}</p>
        ${inputs}
        <p class="setup-err"></p>
        <div class="setup-actions"><button type="button" class="btn" data-act="rand">${esc(t('qh.setup.rand'))}</button>
        <button type="submit" class="btn primary" style="background:${COLORS[S].main};border-color:${COLORS[S].dark}">${esc(t('qh.setup.ok'))}</button></div>
        <p class="setup-note">${esc(t('qh.setup.note'))}${hotSeat() ? ' ' + esc(t('qh.setup.peek', { name: name(Gp) })) : ''}</p>
      </form>`;
    }
  } else if (M.phase === 'play' && cover === 'guesser') {
    key = 'cg' + Gp;
    html = `<div class="panel-card"><p class="panel-title" style="color:${COLORS[Gp].main}">${esc(t('qh.cover.guesser', { name: name(Gp) }))}</p>
      <button class="btn primary" data-act="uncover" style="background:${COLORS[Gp].main};border-color:${COLORS[Gp].dark}">${esc(t('qh.cover.guesser.btn'))}</button></div>`;
  }
  key += getLang();
  if (!html) { panel.hidden = true; panel.innerHTML = ''; panelKey = ''; $('.board-wrap').classList.remove('with-panel'); return; }
  $('.board-wrap').classList.add('with-panel');
  panel.hidden = false;
  if (key === panelKey) return; // don't wipe what the setter is typing
  panelKey = key;
  const typed = [...panel.querySelectorAll('.word-in')].map((i) => i.value);
  panel.innerHTML = html;
  panel.querySelectorAll('.word-in').forEach((inp, i) => (inp.value = typed[i] || ''));
}

panel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-act]')?.dataset.act;
  if (a === 'uncover') { cover = null; render(); }
  if (a === 'rand') {
    const ins = panel.querySelectorAll('.word-in');
    const ws = QH.randomWords(getLang() === 'ru' ? 'ru' : 'en', cfg.len, ins.length);
    ins.forEach((inp, i) => (inp.value = ws[i]));
    panel.querySelector('.setup-err').textContent = '';
  }
});
panel.addEventListener('submit', (e) => {
  e.preventDefault();
  const words = [...panel.querySelectorAll('.word-in')].map((i) => i.value);
  const err = QH.checkWords(words);
  if (err) { panel.querySelector('.setup-err').textContent = t('qh.err.' + err); return; }
  document.activeElement?.blur?.();
  if (isGuest()) { setPending(); sess.send('words', { words, round: M.round }); return; }
  setWords(words);
});

// ---------- players / status ----------
function renderPlayers() {
  const v = V();
  const S = setter(), Gp = guesser();
  const activeP = M.phase === 'setup' ? S : M.phase === 'play' ? Gp : -1;
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    el.classList.toggle('active', activeP === p);
    const m = moods[p];
    const pose = M.phase === 'over' || m.pose !== 'down' ? m.pose : activeP === p ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({ color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 11 + p * 31 });
    el.querySelector('.score').innerHTML = `${esc(t(p === S ? 'qh.role.set' : 'qh.role.guess'))} · <b title="${esc(plural(M.wins[p], 'qh.wins'))}">★${M.wins[p]}</b>`;
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  let msg = '', col = COLORS[activeP < 0 ? Gp : activeP].main;
  if (M.phase === 'over') msg = '';
  else if (online() && !sess.connected) msg = t('qh.online.wait');
  else if (M.phase === 'setup') msg = t('qh.st.setup', { name: name(S) });
  else if (cover) msg = t('qh.st.cover');
  else if (v && v.status === 'conflict') {
    msg = isLocal(Gp) ? t('qh.st.conflict') : t(isAI(Gp) ? 'qh.st.think' : 'qh.st.conflict.them', { name: name(Gp) });
    if (isLocal(Gp)) col = PALETTE.red.dark;
  } else if (isAI(Gp)) msg = t('qh.st.think', { name: name(Gp) });
  else if (isRemote(Gp)) msg = isLocal(S) ? t('qh.st.watch', { name: name(Gp) }) : t('qh.st.them', { name: name(Gp) });
  else if (online() || vsAI()) msg = t('qh.st.you');
  else msg = t('qh.st.turn', { name: name(Gp) });
  status.textContent = msg;
  status.style.color = col;

  $('#undo').disabled = online() || !history.length || isAI(guesser()) || !!cover;
  $('#mode').disabled = online();
  $('#you').disabled = online();
  $('#you-field').hidden = !vsAI();
  $('#nwords').disabled = !canRestart();
  $('#len').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('qh.online.waitnew', { name: name(0) });
  $('#settings-note').textContent = online() ? t('qh.online.note') : '';
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
const calm = () => { setMood(0, 'neutral'); setMood(1, 'neutral'); };

// Reactions run on every device from the same event description.
function react(ev) {
  const S = setter(), Gp = guesser();
  freshKey = null;
  if (ev.kind === 'set') { setMood(S, 'smug'); setMood(Gp, 'neutral'); say(S, 'qh.say.set'); }
  if (ev.kind === 'guess') {
    if (ev.conflict) { setMood(Gp, 'worried'); setMood(S, 'smug'); say(Gp, 'qh.say.conflict'); freshKey = 'b' + ev.c; }
    else if (ev.hit) {
      freshKey = 'b' + ev.c;
      setMood(Gp, 'happy', ev.blanks > 1 ? 'up' : 'wave'); setMood(S, 'worried');
      if (ev.blanks > 1) say(Gp, 'qh.say.multi', { k: ev.blanks });
      else if (Math.random() < 0.5) say(Gp, 'qh.say.hit');
      else if (Math.random() < 0.4) say(S, 'qh.say.setter.hit');
    } else {
      freshKey = 'x' + ev.c;
      setMood(Gp, 'sad'); setMood(S, 'smug');
      if (Math.random() < 0.6) say(S, 'qh.say.setter.miss'); else say(Gp, 'qh.say.miss');
    }
  }
  if (ev.kind === 'resolve') {
    if (ev.retro > 0) {
      setMood(Gp, 'sad'); setMood(S, 'happy', 'wave');
      say(Gp, 'qh.say.collapse.bad', { k: ev.retro });
      setTimeout(() => say(S, 'qh.say.setter.collapse'), 700);
    } else { setMood(Gp, 'happy', 'wave'); setMood(S, 'worried'); say(Gp, 'qh.say.collapse.ok'); }
  }
  if (ev.over) {
    const w = ev.winner, l = 1 - w;
    setTimeout(() => {
      setMood(w, 'happy', 'up'); setMood(l, 'sad');
      say(w, w === Gp ? 'qh.say.win' : 'qh.say.setwin');
      setTimeout(() => say(l, 'qh.say.lose'), 900);
      renderPlayers();
    }, ev.kind === 'resolve' && ev.retro ? 1300 : 300);
  }
}

// ---------- flow (host / local) ----------
function newMatch() {
  M = { round: 0, wins: [0, 0], phase: 'setup', g: null, v: null, winner: -1, ev: null, evId: 0 };
  newRound(false);
}

function newRound(next) {
  clearTimeout(aiTimer);
  if (isGuest()) return;
  if (next) M.round++;
  M.phase = 'setup'; M.g = null; M.winner = -1; M.ev = null;
  history = []; shapes = {}; freshKey = null; panelKey = '';
  cover = hotSeat() ? 'setter' : null;
  calm();
  $('#result').hidden = true;
  if (isAI(setter())) {
    const lang = getLang() === 'ru' ? 'ru' : 'en';
    return setWords(QH.aiWords(lang, cfg.len, cfg.nwords, cfg.mode));
  }
  render();
  sync();
}

function setWords(words) {
  M.g = QH.create(words);
  M.phase = 'play';
  history = [];
  cover = hotSeat() ? 'guesser' : null;
  emit({ kind: 'set' });
  render();
  sync();
  maybeAI();
}

function emit(ev) {
  M.ev = ev; M.evId++;
  react(ev);
}

function doAction(a) {
  if (M.phase !== 'play') return false;
  const prev = QH.clone(M.g);
  const r = a.kind === 'guess' ? QH.guess(M.g, a.c) : QH.resolve(M.g, a.pos, a.letter);
  if (!r) return false;
  history.push(prev);
  const ev = a.kind === 'guess' ? { kind: 'guess', c: a.c, hit: r.hit, blanks: r.blanks, conflict: r.conflict } : { kind: 'resolve', retro: r.retro };
  if (QH.isOver(M.g)) {
    M.phase = 'over';
    M.winner = QH.status(M.g) === 'won' ? guesser() : setter();
    M.wins[M.winner]++;
    ev.over = true; ev.winner = M.winner;
  }
  emit(ev);
  render();
  if (M.phase === 'over') showResult();
  sync();
  maybeAI();
  return true;
}

function maybeAI() {
  clearTimeout(aiTimer);
  if (M.phase !== 'play' || !isAI(guesser())) return;
  const v = QH.view(M.g);
  aiTimer = setTimeout(() => {
    if (v.status === 'conflict') { const r = QH.aiResolve(v, cfg.mode); doAction({ kind: 'resolve', pos: r.pos, letter: r.letter }); }
    else doAction({ kind: 'guess', c: QH.aiGuess(v, cfg.mode) });
  }, v.status === 'conflict' ? 1500 : 850);
}

function showResult() {
  const v = V();
  const won = v.status === 'won', w = M.winner;
  const txtEl = $('#result-text');
  txtEl.textContent = t(won ? 'qh.res.won' : 'qh.res.lost');
  txtEl.style.color = COLORS[w].main;
  $('#result-who').textContent = t('qh.res.winner', { name: name(w) });
  $('#result-who').style.color = COLORS[w].dark;
  const ws = (v.words || []).map((x, i) => `<span class="${v.aliveMask[i] ? 'alive' : 'dead'}">${esc(x)}</span>`).join(' ');
  $('#result-words').innerHTML = ws ? `<span class="lbl">${esc(t('qh.res.words'))}</span> ${ws}` : '';
  setTimeout(() => { if (M.phase === 'over') $('#result').hidden = false; }, 1100);
}

function undo() {
  if (online() || !history.length || isAI(guesser())) return;
  clearTimeout(aiTimer);
  if (M.phase === 'over') { M.wins[M.winner]--; M.winner = -1; M.phase = 'play'; }
  M.g = history.pop();
  freshKey = null;
  calm();
  $('#result').hidden = true;
  render();
}

const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newRound(M.phase === 'over');
}

// ---------- local input ----------
function localAction(a) {
  if (!canAct()) return;
  if (isGuest()) { setPending(); sess.send('move', { a, n: M.v.n }); return; }
  doAction(a);
}
svg.addEventListener('click', (e) => {
  const k = e.target.closest('[data-key]'), keep = e.target.closest('[data-keep]');
  const v = V();
  if (!v) return;
  if (keep && v.status === 'conflict') {
    const [pos, letter] = keep.dataset.keep.split(':');
    localAction({ kind: 'resolve', pos: +pos, letter });
  } else if (k && v.status === 'play' && !v.guessed.includes(k.dataset.key)) localAction({ kind: 'guess', c: k.dataset.key });
});
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, select, textarea') || document.querySelector('dialog[open]')) return;
  const v = V();
  if (!v || v.status !== 'play') return;
  const c = QH.norm(e.key);
  if (c.length === 1 && QH.ALPHA[v.alpha].includes(c) && !v.guessed.includes(c)) localAction({ kind: 'guess', c });
});

// ---------- online ----------
// Host is authoritative. The guest only ever receives a view: the secret words are included only
// when the guest is the one who set them, or once the round is over.
function setPending() {
  pending = true;
  clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => { if (pending && sess) sess.send('resync'); }, 3000);
  render();
}
function sync() { if (online() && sess.host) sendState(); }
function sendState() {
  sess.send('state', {
    round: M.round, wins: M.wins, phase: M.phase, winner: M.winner, ev: M.ev, evId: M.evId,
    v: M.g ? QH.view(M.g, M.phase === 'over' || setter() === 1) : null,
    names: cfg.names, nwords: cfg.nwords, len: cfg.len,
  });
}
function onSession(s) {
  sess = s;
  synced = false;
  clearTimeout(aiTimer);
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
    render();
  });
  s.on('state', (d) => {
    if (s.host) return;
    const first = !synced;
    synced = true;
    const newEv = d.evId !== M.evId && d.ev;
    const roundChanged = d.round !== M.round || d.phase === 'setup';
    pending = false; clearTimeout(pendingTimer);
    if (roundChanged && d.phase === 'setup') { shapes = {}; calm(); }
    const wasOver = M.phase === 'over';
    Object.assign(M, { round: d.round, wins: d.wins, phase: d.phase, winner: d.winner, ev: d.ev, evId: d.evId, v: d.v });
    remoteNames[0] = d.names[0];
    cfg.nwords = d.nwords; cfg.len = d.len;
    $('#nwords').value = d.nwords; $('#len').value = d.len;
    if (newEv && !first) react(d.ev);
    if (M.phase !== 'over') $('#result').hidden = true;
    render();
    if (M.phase === 'over' && !wasOver) showResult();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('words', (d) => {
    if (!s.host) return;
    if (M.phase === 'setup' && setter() === 1 && d.round === M.round && !QH.checkWords(d.words)) setWords(d.words);
    else sendState();
  });
  s.on('move', (d) => {
    if (!s.host) return;
    if (M.phase !== 'play' || guesser() !== 1 || d.n !== M.g.n || !doAction(d.a)) sendState();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newMatch();
  else { M = { round: 0, wins: [0, 0], phase: 'setup', g: null, v: null, winner: -1, ev: null, evId: 0 }; cover = null; history = []; $('#result').hidden = true; render(); }
}

// ---------- settings & controls ----------
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newMatch(); });
$('#you').addEventListener('change', (e) => { cfg.you = e.target.value; saveCfg(); newMatch(); });
$('#nwords').addEventListener('change', (e) => { cfg.nwords = +e.target.value; saveCfg(); if (canRestart()) newRound(false); });
$('#len').addEventListener('change', (e) => { cfg.len = +e.target.value; saveCfg(); if (canRestart() && (M.phase === 'setup' || isAI(setter()))) newRound(false); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    panelKey = ''; // names appear in the panel text
    render();
  }));
document.addEventListener('mg:lang', () => { panelKey = ''; render(); if (M.phase === 'over' && !$('#result').hidden) showResult(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#mode').value = cfg.mode;
$('#you').value = cfg.you;
$('#nwords').value = cfg.nwords;
$('#len').value = cfg.len;
newMatch();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; pending = false; newMatch(); },
});
if (!online()) showOnce('how', SLUG);
