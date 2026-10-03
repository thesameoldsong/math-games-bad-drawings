import { t, plural, applyI18n, getLang } from '../../shared/i18n.js';
import { PALETTE, line, figureSVG, injectDefs } from '../../shared/sketch.js';
import { mountTools, mountSheets, showOnce } from '../../shared/ui.js';
import { mountOnline } from '../../shared/net.js';
import { BR } from './engine.js';
import './strings.js';

const SLUG = 'breaking-rank';
const COLORS = [PALETTE.blue, PALETTE.red];
const $ = (sel) => document.querySelector(sel);
const board = $('#board');

const cfg = Object.assign({ rounds: 3, choose: true, mode: 'pvp', names: ['', ''] },
  JSON.parse(localStorage.getItem('mg-' + SLUG) || '{}'));
const saveCfg = () => localStorage.setItem('mg-' + SLUG, JSON.stringify(cfg));

let st, history, draft, over, aiTimers = [], nextStarter = 0, fresh = false;
let sess = null;                    // online session (shared/net.js), null when playing locally
const remoteNames = ['', ''];       // names announced by the peer in online play
const moods = [{ mood: 'neutral', pose: 'down' }, { mood: 'neutral', pose: 'down' }];
const shapes = {};                  // cached wobbly strokes

// ---------- who is who ----------
const online = () => !!sess;
const mySeat = () => sess.seat;
const isAI = (p) => !online() && cfg.mode !== 'pvp' && p === 1;
const isRemote = (p) => online() && p !== mySeat();
const isLocal = (p) => !isAI(p) && !isRemote(p);
const ready = () => !online() || sess.connected;
const actor = () => (st.phase === 'pick' ? BR.judge(st) : BR.guesser(st));
const canAct = () => !over && st.phase !== 'over' && st.phase !== 'reveal' && isLocal(actor()) && ready();
const canNext = () => !over && st.phase === 'reveal' && ready();
function name(p) {
  if (isAI(p)) return t('br.cpu');
  const n = isRemote(p) ? remoteNames[p] : cfg.names[p];
  return (n && n.trim()) || t('br.p' + p);
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const L = () => (getLang() === 'ru' ? 'ru' : 'en');
const nameHTML = (p) => `<b style="color:${COLORS[p].main}">${esc(name(p))}</b>`;

// ---------- values ----------
function fmtVal(cat, i) {
  const v = cat.items[i][2], ru = L() === 'ru';
  if (cat.kind === 'year') return v < 0 ? `${-v} ${ru ? 'до н. э.' : 'BC'}` : String(v);
  const num = v.toLocaleString(ru ? 'ru-RU' : 'en-US', { maximumFractionDigits: 5 });
  const u = cat.u[L()];
  return (cat.approx ? '≈ ' : '') + num + (u ? (u.startsWith('×') || u === '°C' ? ' ' : ' ') + u : '');
}
const itemName = (cat, i) => cat.items[i][L() === 'ru' ? 0 : 1];

// ---------- little hand-drawn bits ----------
const shape = (k, make) => (shapes[k] ??= make());
function mark(ok, k) {
  const d = shape((ok ? 'ok' : 'x') + k, () => ok
    ? line(4, 13, 10, 19, 1) + ' ' + line(10, 19, 21, 4, 1.4)
    : line(5, 5, 19, 19, 1.4) + ' ' + line(19, 5, 5, 19, 1.4));
  return `<svg class="mark ${ok ? 'ok' : 'bad'}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
}
function underline(k, color) {
  const d = shape('u' + k, () => line(4, 6, 196, 5 + Math.random() * 2, 3));
  return `<svg class="uline" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" stroke="${color}"/></svg>`;
}

// ---------- rendering ----------
function headHTML() {
  const j = BR.judge(st);
  return `<div class="br-head"><span>${t('br.round', { a: Math.min(st.t + 1, BR.turns(st)), b: BR.turns(st) })}</span>` +
    `<span>${t('br.role.judge')}: ${nameHTML(j)}</span></div>`;
}

function renderPick() {
  const j = BR.judge(st), g = BR.guesser(st), mine = canAct();
  let h = headHTML();
  h += `<div class="br-q">${t('br.pick.head')}</div>${underline('pick' + st.t, COLORS[j].main)}`;
  h += `<div class="br-sub">${t('br.pick.for', { name: nameHTML(g) })}</div><div class="br-topics">`;
  for (const id of st.offer) {
    const c = BR.CAT[id];
    h += `<button class="br-topic" data-cat="${id}" ${mine ? '' : 'disabled'}>` +
      `<span class="tt">${esc(c.t[L()])}</span><span class="ts">${esc(c.s[L()])}</span>` +
      `<span class="tn">${plural(c.items.length, 'br.items')}</span></button>`;
  }
  return h + '</div>';
}

function topicHTML(cat) {
  return `<div class="br-q">${esc(cat.t[L()])}</div>${underline(cat.id, COLORS[BR.guesser(st)].main)}` +
    `<div class="br-sub">${esc(cat.s[L()])}</div>`;
}

function renderGuess() {
  const cat = BR.cat(st), g = BR.guesser(st), mine = canAct();
  let h = headHTML() + topicHTML(cat);
  h += `<ol class="br-list${mine ? ' live' : ''}" style="--pc:${COLORS[g].main}">`;
  draft.forEach((i, k) => {
    h += `<li><button class="br-item in" data-i="${i}" ${mine ? '' : 'disabled'}><span class="num">${k + 1}</span>` +
      `<span class="nm">${esc(itemName(cat, i))}</span></button></li>`;
  });
  const rest = st.order.filter((i) => !draft.includes(i));
  if (draft.length && rest.length) h += '<li class="sep" aria-hidden="true"></li>';
  for (const i of rest) {
    h += `<li><button class="br-item" data-i="${i}" ${mine ? '' : 'disabled'}><span class="num"></span>` +
      `<span class="nm">${esc(itemName(cat, i))}</span></button></li>`;
  }
  h += '</ol>';
  if (mine) {
    h += `<div class="br-ctl"><button class="btn" id="br-clear" ${draft.length ? '' : 'disabled'}>${t('br.clear')}</button>` +
      `<button class="btn primary" id="br-lock" ${draft.length ? '' : 'disabled'}>${draft.length ? t('br.lock', { n: draft.length }) : t('br.lock0')}</button></div>`;
    if (!draft.length) h += `<p class="br-hint">${t('br.hint')}</p>`;
  } else {
    h += `<p class="br-hint">${t('br.hint.wait', { name: nameHTML(g) })}</p>`;
  }
  return h;
}

function renderReveal() {
  const cat = BR.cat(st), { list, ok, bad, pts, guesser: g } = st.last, j = 1 - g;
  let h = headHTML() + topicHTML(cat);
  h += `<ol class="br-list reveal" style="--pc:${COLORS[g].main}">`;
  list.forEach((i, k) => {
    const good = !bad.includes(k);
    h += `<li><div class="br-item in shown${good ? '' : ' wrong'}" style="--d:${k * 0.16}s"><span class="num">${k + 1}</span>` +
      `<span class="nm">${esc(itemName(cat, i))}</span><span class="val">${fmtVal(cat, i)}</span>${mark(good, st.t + '_' + k)}</div></li>`;
  });
  h += '</ol>';
  const verdict = ok ? t('br.right', { n: pts, name: nameHTML(g) }) : t('br.wrong', { name: nameHTML(j) });
  h += `<div class="br-verdict ${ok ? 'ok' : 'bad'}" style="--d:${list.length * 0.16 + 0.1}s">${verdict}</div>`;
  const rest = BR.truth(cat).filter((i) => !list.includes(i));
  if (rest.length) {
    h += `<div class="br-rest"><span class="lbl">${t('br.unused')}</span> ` +
      rest.map((i) => `<span class="ri">${esc(itemName(cat, i))} <i>${fmtVal(cat, i)}</i></span>`).join(' ') + '</div>';
  }
  const last = st.t + 1 >= BR.turns(st);
  if (st.phase === 'over') return h;
  h += `<div class="br-ctl"><button class="btn primary" id="br-next" ${canNext() ? '' : 'disabled'}>${t(last ? 'br.finish' : 'br.next')}</button></div>`;
  return h;
}

function render() {
  let h = '';
  if (st.phase === 'pick') h = renderPick();
  else if (st.phase === 'guess') h = renderGuess();
  else if (st.phase === 'reveal' || (st.phase === 'over' && st.last)) h = renderReveal();
  else if (st.last == null && st.phase === 'over') h = headHTML();
  board.innerHTML = `<div class="br-card${fresh ? ' fresh' : ''}" data-phase="${st.phase}">${h}</div>`;
  fresh = false;
  renderPlayers();
}

function renderPlayers() {
  const act = over || st.phase === 'over' ? -1 : st.phase === 'reveal' ? BR.guesser(st) : actor();
  for (const p of [0, 1]) {
    const el = $(`.player.p${p}`);
    el.classList.toggle('active', act === p);
    const m = moods[p];
    const pose = over || m.pose !== 'down' ? m.pose : act === p && st.phase !== 'reveal' ? 'point' : 'down';
    el.querySelector('.fig').innerHTML = figureSVG({
      color: COLORS[p], mood: m.mood, pose, face: p === 0 ? 'right' : 'left', seed: 17 + p * 29,
    });
    const role = over || st.phase === 'over' ? '' : t(p === BR.judge(st) ? 'br.role.judge' : 'br.role.guess');
    el.querySelector('.score').innerHTML = `<span>${plural(st.score[p], 'br.pts')}</span>` + (role ? `<span class="role">${role}</span>` : '');
    const inp = el.querySelector('.name');
    inp.placeholder = name(p);
    if (document.activeElement !== inp) inp.value = isLocal(p) ? cfg.names[p] : '';
    inp.style.color = COLORS[p].main;
    inp.disabled = !isLocal(p);
  }

  const status = $('#status');
  const a = actor();
  let s = '';
  if (over || st.phase === 'over') s = '';
  else if (online() && !sess.connected) s = t('br.online.wait');
  else if (st.phase === 'reveal') s = '';
  else if (isAI(a)) s = t('br.thinking', { name: name(a) });
  else if (st.phase === 'pick') s = online() ? (isLocal(a) ? t('br.status.pick.you') : t('br.status.pick', { name: name(a) })) : t('br.status.pick', { name: name(a) });
  else s = online() ? (isLocal(a) ? t('br.status.guess.you') : t('br.status.guess.them', { name: name(a) })) : t('br.status.guess', { name: name(a) });
  status.textContent = s;
  status.style.color = COLORS[a].main;

  $('#undo').disabled = !undoable();
  $('#mode').disabled = online();
  $('#rounds').disabled = !canRestart();
  $('#choose').disabled = !canRestart();
  $('#new').disabled = !canRestart();
  $('#again').hidden = !canRestart();
  $('#result-wait').hidden = canRestart();
  if (online()) $('#result-wait').textContent = t('br.online.waitnew', { name: name(1 - mySeat()) });
  $('#settings-note').textContent = online() ? t('br.online.note') : '';
}

const bubbleTimers = [];
function say(p, key, delay = 0) {
  const show = () => {
    const b = $(`.player.p${p} .bubble`);
    b.textContent = t(key);
    b.classList.add('show');
    clearTimeout(bubbleTimers[p]);
    bubbleTimers[p] = setTimeout(() => b.classList.remove('show'), 1900);
  };
  delay ? later(show, delay) : show();
}
const setMood = (p, mood, pose = 'down') => (moods[p] = { mood, pose });
const later = (fn, ms) => aiTimers.push(setTimeout(fn, ms));
const stopTimers = () => { aiTimers.forEach(clearTimeout); aiTimers = []; };

// ---------- flow ----------
function newGame(state) {
  stopTimers();
  st = state || BR.create({ rounds: cfg.rounds, choose: cfg.choose, starter: nextStarter });
  if (!state) nextStarter = 1 - nextStarter;
  history = []; draft = []; over = false; fresh = true;
  setMood(0, 'neutral'); setMood(1, 'neutral');
  $('#result').hidden = true;
  render();
  maybeAI();
}

function play(m) {
  if (!BR.legal(st, m)) return false;
  const prev = BR.clone(st);
  if (m.type === 'pick') history.push(prev);
  const g = BR.guesser(st), j = 1 - g;
  BR.apply(st, m);
  fresh = true;
  if (m.type === 'pick') {
    stopTimers();
    draft = [];
    setMood(j, 'smug', 'point'); setMood(g, 'neutral');
    if (Math.random() < 0.6) say(j, 'br.say.pick');
  } else if (m.type === 'submit') {
    history = [];
    draft = [];
    const { ok, pts, list } = st.last;
    setMood(g, 'worried'); setMood(j, 'neutral');
    if (list.length >= 5) say(g, 'br.say.risky');
    else if (list.length === 1) { say(g, 'br.say.safe'); setMood(j, 'smug'); }
    const wait = list.length * 160 + 450;
    later(() => {
      if (ok) {
        setMood(g, 'happy', pts >= 5 ? 'up' : 'wave');
        say(g, pts >= 5 ? 'br.say.great' : 'br.say.right');
        setMood(j, pts >= 4 ? 'worried' : pts === 1 ? 'smug' : 'neutral');
        if (pts >= 4) say(j, 'br.say.ouch', 800);
      } else {
        setMood(g, 'sad');
        setMood(j, 'happy', 'wave');
        say(j, 'br.say.stumped');
        say(g, 'br.say.wrong', 800);
      }
      renderPlayers();
    }, wait);
  } else if (m.type === 'next') {
    stopTimers();
    history = []; draft = [];
    setMood(0, 'neutral'); setMood(1, 'neutral');
    if (BR.isOver(st)) return finish(), true;
  }
  render();
  maybeAI();
  return true;
}

function maybeAI() {
  if (over || online() || st.phase === 'over') return;
  const a = actor();
  if (!isAI(a) || st.phase === 'reveal') return;
  if (st.phase === 'pick') {
    later(() => play(BR.aiPick(st, cfg.mode)), 1100);
  } else if (st.phase === 'guess') {
    const m = BR.aiGuess(st, cfg.mode);
    let k = 0;
    const step = () => {
      if (k < m.list.length) { draft.push(m.list[k++]); render(); later(step, 650); }
      else later(() => play(m), 500);
    };
    later(step, 900);
  }
}

function finish() {
  over = true;
  const w = BR.winner(st);
  if (w < 0) { setMood(0, 'worried'); setMood(1, 'worried'); }
  else { setMood(w, 'happy', 'up'); setMood(1 - w, 'sad'); say(w, 'br.say.win'); say(1 - w, 'br.say.lose', 900); }
  render();
  resultText();
  later(() => { if (over) $('#result').hidden = false; }, 700);
}
function resultText() {
  const [a, b] = st.score, w = BR.winner(st);
  const txt = $('#result-text');
  txt.textContent = w < 0 ? t('br.tie', { a, b }) : t('br.win', { name: name(w), a: Math.max(a, b), b: Math.min(a, b) });
  txt.style.color = w < 0 ? 'var(--ink)' : COLORS[w].main;
  $('#result-next').textContent = t('br.nextstart', { name: name(nextStarter) });
}

// Undo takes back list items one by one, then the judge's topic choice. Revealed answers can't be undone.
function undoable() {
  if (online() || over || st.phase !== 'guess') return false;
  if (draft.length && isLocal(BR.guesser(st))) return true;
  return history.length > 0 && isLocal(BR.judge(st));
}
function undo() {
  if (!undoable()) return;
  if (draft.length && isLocal(BR.guesser(st))) draft.pop();
  else {
    stopTimers(); // the computer may be halfway through its list
    st = history.pop(); draft = [];
    setMood(0, 'neutral'); setMood(1, 'neutral');
  }
  render();
}

// Online, only the room creator may restart (and change settings); the guest follows.
const canRestart = () => !online() || sess.host;
function restart() {
  if (!canRestart()) return;
  newGame();
  if (online()) sendState();
}

// ---------- online ----------
// Host is authoritative: on (re)connect it sends the whole state; moves carry a counter to catch desyncs.
function sendState() {
  sess.send('state', { st, draft, names: cfg.names, nextStarter });
}
function onSession(s) {
  sess = s;
  stopTimers();
  s.on('status', () => renderPlayers());
  s.on('peer-join', () => {
    s.send('name', { seat: s.seat, name: cfg.names[s.seat] });
    if (s.host) sendState();
  });
  s.on('state', (d) => {
    if (s.host) return;
    remoteNames[0] = d.names[0];
    nextStarter = d.nextStarter;
    st = d.st; over = false; history = []; draft = st.phase === 'guess' ? d.draft || [] : []; fresh = true;
    cfg.rounds = st.rounds; $('#rounds').value = st.rounds;
    cfg.choose = st.choose; $('#choose').value = st.choose ? '1' : '0';
    setMood(0, 'neutral'); setMood(1, 'neutral');
    $('#result').hidden = true;
    BR.isOver(st) ? finish() : render();
  });
  s.on('name', (d) => { remoteNames[d.seat] = d.name || ''; render(); });
  s.on('move', (d) => {
    if (d.n !== st.n || !BR.legal(st, d.m)) return s.host ? sendState() : s.send('resync');
    play(d.m);
  });
  s.on('draft', (d) => {
    if (d.n !== st.n || st.phase !== 'guess' || !isRemote(BR.guesser(st))) return;
    draft = (d.list || []).filter((i) => st.order.includes(i));
    render();
  });
  s.on('resync', () => s.host && sendState());
  if (s.host) newGame();
  else render();
}

function localMove(m) {
  if (online()) sess.send('move', { m, n: st.n });
  play(m);
}
function draftChanged() {
  if (online()) sess.send('draft', { list: draft, n: st.n });
  render();
}

// ---------- input ----------
board.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  if (b.id === 'br-next') { if (canNext()) localMove({ type: 'next' }); return; }
  if (!canAct()) return;
  if (b.dataset.cat) return localMove({ type: 'pick', cat: b.dataset.cat });
  if (b.dataset.i != null && st.phase === 'guess') {
    const i = +b.dataset.i, k = draft.indexOf(i);
    if (k >= 0) draft.splice(k, 1); else draft.push(i);
    return draftChanged();
  }
  if (b.id === 'br-clear') { draft = []; return draftChanged(); }
  if (b.id === 'br-lock' && draft.length) localMove({ type: 'submit', list: draft.slice() });
});

$('#rounds').addEventListener('change', (e) => { cfg.rounds = +e.target.value; saveCfg(); restart(); });
$('#choose').addEventListener('change', (e) => { cfg.choose = e.target.value === '1'; saveCfg(); restart(); });
$('#mode').addEventListener('change', (e) => { cfg.mode = e.target.value; saveCfg(); newGame(); });
$('#new').addEventListener('click', restart);
$('#again').addEventListener('click', restart);
$('#undo').addEventListener('click', undo);
document.querySelectorAll('.player .name').forEach((inp) =>
  inp.addEventListener('input', () => {
    const p = +inp.closest('.player').dataset.p;
    cfg.names[p] = inp.value;
    saveCfg();
    if (online()) sess.send('name', { seat: p, name: inp.value });
    render();
  }));
document.addEventListener('mg:lang', () => { render(); if (over) resultText(); });

// ---------- boot ----------
injectDefs();
mountTools();
mountSheets();
applyI18n();
$('#rounds').value = cfg.rounds;
$('#choose').value = cfg.choose ? '1' : '0';
$('#mode').value = cfg.mode;
newGame();
mountOnline({
  slug: SLUG,
  button: $('#online'),
  onSession,
  onEnd: () => { sess = null; newGame(); },
});
if (!online()) showOnce('how', SLUG);
