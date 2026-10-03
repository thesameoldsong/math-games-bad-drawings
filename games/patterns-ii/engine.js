// Patterns II — pure rules + computer players (no DOM).
//
// A designer fills a 6×6 grid with four symbols (0..3). Every other player (a "guesser") asks to see
// any cells they like, then predicts symbols for some of the hidden cells: +1 per right guess, −1 per
// wrong one. Instead of predicting, a guesser may give up (0 points). The designer scores the spread
// between the best and the worst guesser, minus 5 for the first give-up and 10 for every further one.
//
// A match is one round with a computer designer, or one round per seat when players take turns designing.

export const N = 6, CELLS = 36, SYMS = 4;

const rcOf = (i) => [Math.floor(i / N), i % N];

// ---------------- match / round ----------------

function newSheet() {
  return { rev: Array(CELLS).fill(-1), guess: Array(CELLS).fill(-1), status: 'play', peeks: 0 };
}

function newRound(seats, designer, rid) {
  return {
    rid, designer, phase: designer < 0 ? 'guess' : 'design', pattern: null,
    sheets: Array.from({ length: seats }, (_, p) => (p === designer ? null : newSheet())),
    result: null,
  };
}

function designerOf(m, roundNo) { return m.cpuDesigner ? -1 : (m.first + roundNo) % m.seats; }

function newMatch({ seats, cpuDesigner = true, first = 0 }) {
  if (seats < 1 || seats > 5 || (!cpuDesigner && seats < 2)) throw new Error('bad seat count');
  const m = { seats, cpuDesigner, first, rounds: cpuDesigner ? 1 : seats, roundNo: 0, totals: Array(seats).fill(0), past: [], round: null, rid: 1 };
  m.round = newRound(seats, designerOf(m, 0), m.rid);
  return m;
}

function nextRound(m) {
  if (m.round.phase !== 'done' || m.roundNo + 1 >= m.rounds) return false;
  m.roundNo++;
  m.rid++;
  m.round = newRound(m.seats, designerOf(m, m.roundNo), m.rid);
  return true;
}

const isMatchOver = (m) => m.round.phase === 'done' && m.roundNo + 1 >= m.rounds;

function validPattern(p) {
  return Array.isArray(p) && p.length === CELLS && p.every((s) => Number.isInteger(s) && s >= 0 && s < SYMS);
}

function setPattern(r, pattern) {
  if (r.phase !== 'design' && !(r.phase === 'guess' && r.designer < 0 && !r.pattern)) return false;
  if (!validPattern(pattern)) return false;
  r.pattern = pattern.slice();
  r.phase = 'guess';
  return true;
}

const guessers = (r) => r.sheets.map((s, p) => (s ? p : -1)).filter((p) => p >= 0);
const canAct = (r, p) => r.phase === 'guess' && !!r.pattern && !!r.sheets[p] && r.sheets[p].status === 'play';

// Reveal cells to a guesser. Returns the revealed symbols (or null if not allowed).
function peek(r, p, cells) {
  if (!canAct(r, p)) return null;
  const sh = r.sheets[p], out = [];
  for (const c of cells) {
    if (!Number.isInteger(c) || c < 0 || c >= CELLS) continue;
    if (sh.rev[c] < 0) { sh.rev[c] = r.pattern[c]; sh.peeks++; }
    sh.guess[c] = -1;
    out.push([c, sh.rev[c]]);
  }
  return out;
}

function setGuess(r, p, cell, sym) {
  if (!canAct(r, p) || !Number.isInteger(cell) || cell < 0 || cell >= CELLS || r.sheets[p].rev[cell] >= 0) return false;
  if (!(sym === -1 || (Number.isInteger(sym) && sym >= 0 && sym < SYMS))) return false;
  r.sheets[p].guess[cell] = sym;
  return true;
}

// Lock in predictions (optionally passing the full guess array, as an online guest does).
function submit(r, p, guesses) {
  if (!canAct(r, p)) return false;
  const sh = r.sheets[p];
  if (guesses) {
    if (!Array.isArray(guesses) || guesses.length !== CELLS) return false;
    sh.guess = guesses.map((g, c) => (sh.rev[c] < 0 && Number.isInteger(g) && g >= 0 && g < SYMS ? g : -1));
  }
  sh.status = 'done';
  return true;
}

function giveUp(r, p) {
  if (!canAct(r, p)) return false;
  const sh = r.sheets[p];
  sh.guess.fill(-1);
  sh.status = 'gaveup';
  return true;
}

// Online seat hand-over: may a seat switch between computer and human right now without anyone
// having to take back a move? True for the designer once the pattern exists (nothing left to do),
// and for a guesser who hasn't revealed or handed in anything yet.
function untouched(r, p) {
  if (r.phase === 'done' || p < 0 || p >= r.sheets.length) return false;
  if (p === r.designer) return r.phase === 'guess';
  const sh = r.sheets[p];
  return !!sh && sh.status === 'play' && sh.peeks === 0;
}

const allDone = (r) => r.phase === 'guess' && guessers(r).every((p) => r.sheets[p].status !== 'play');

function sheetScore(pattern, sh) {
  if (sh.status === 'gaveup') return { score: 0, right: 0, wrong: 0 };
  let right = 0, wrong = 0;
  for (let c = 0; c < CELLS; c++) {
    if (sh.rev[c] >= 0 || sh.guess[c] < 0) continue;
    if (sh.guess[c] === pattern[c]) right++; else wrong++;
  }
  return { score: right - wrong, right, wrong };
}

const giveUpPenalty = (k) => (k > 0 ? 5 + 10 * (k - 1) : 0);

function scoreRound(r) {
  const gs = guessers(r);
  const per = r.sheets.map((sh) => (sh ? sheetScore(r.pattern, sh) : null));
  const vals = gs.map((p) => per[p].score);
  const giveUps = gs.filter((p) => r.sheets[p].status === 'gaveup').length;
  const spread = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
  const designerScore = spread - giveUpPenalty(giveUps);
  const scores = r.sheets.map((sh, p) => (p === r.designer ? designerScore : sh ? per[p].score : 0));
  return { scores, per, spread, giveUps, designerScore };
}

function finishRound(m) {
  const r = m.round;
  if (!allDone(r)) return false;
  r.result = scoreRound(r);
  r.phase = 'done';
  r.result.scores.forEach((s, p) => (m.totals[p] += s));
  m.past.push(r.result.scores.slice());
  return true;
}

// Winner(s) of the match: highest total (ties → several).
function leaders(m) {
  const best = Math.max(...m.totals);
  return m.totals.map((v, p) => (v === best ? p : -1)).filter((p) => p >= 0);
}

// ---------------- partitions: the "kinds of regularity" the computer knows ----------------
// A partition assigns every cell a class; a pattern fits it if each class is a single symbol.

function canon(cls) {
  const map = new Map(), out = new Uint8Array(CELLS);
  for (let i = 0; i < CELLS; i++) {
    if (!map.has(cls[i])) map.set(cls[i], map.size);
    out[i] = map.get(cls[i]);
  }
  return { cls: out, k: map.size, key: out.join(',') };
}
const byKey = (fn) => canon(Array.from({ length: CELLS }, (_, i) => String(fn(...rcOf(i)))));

function unionFind() {
  const par = Array.from({ length: CELLS }, (_, i) => i);
  const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
  return { find, join: (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; } };
}
const idx = (r, c) => r * N + c;
const PERMS = {
  H: (r, c) => idx(r, N - 1 - c), V: (r, c) => idx(N - 1 - r, c), R2: (r, c) => idx(N - 1 - r, N - 1 - c),
  R4: (r, c) => idx(c, N - 1 - r), T: (r, c) => idx(c, r), A: (r, c) => idx(N - 1 - c, N - 1 - r),
};
function bySym(names) {
  const u = unionFind();
  for (let i = 0; i < CELLS; i++) for (const n of names) u.join(i, PERMS[n](...rcOf(i)));
  return canon(Array.from({ length: CELLS }, (_, i) => u.find(i)));
}
function join(a, b) { // finer constraints together: both regularities hold
  const u = unionFind(), fa = [], fb = [];
  for (let i = 0; i < CELLS; i++) {
    if (fa[a.cls[i]] === undefined) fa[a.cls[i]] = i; else u.join(i, fa[a.cls[i]]);
    if (fb[b.cls[i]] === undefined) fb[b.cls[i]] = i; else u.join(i, fb[b.cls[i]]);
  }
  return canon(Array.from({ length: CELLS }, (_, i) => u.find(i)));
}
const meet = (a, b) => canon(Array.from({ length: CELLS }, (_, i) => a.cls[i] * 64 + b.cls[i]));

const ring = (r, c) => Math.min(r, c, N - 1 - r, N - 1 - c);
const SYMGROUPS = [['H'], ['V'], ['R2'], ['T'], ['A'], ['H', 'V'], ['T', 'A'], ['R4'], ['H', 'V', 'T']];

function basePartitions() {
  const list = [];
  for (const g of SYMGROUPS) list.push(bySym(g));
  for (const k of [2, 3, 4, 6]) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) list.push(byKey((r, c) => (a * r + b * c) % k));
  for (const pr of [1, 2, 3, 6]) for (const pc of [1, 2, 3, 6]) list.push(byKey((r, c) => `${r % pr}.${c % pc}`));
  for (const br of [1, 2, 3, 6]) for (const bc of [1, 2, 3, 6]) {
    list.push(byKey((r, c) => `${Math.floor(r / br)}.${Math.floor(c / bc)}`));
    list.push(byKey((r, c) => (Math.floor(r / br) + Math.floor(c / bc)) % 2));
  }
  list.push(byKey((r, c) => r + c), byKey((r, c) => r - c));
  list.push(byKey(ring), byKey((r, c) => ring(r, c) % 2), byKey((r, c) => (ring(r, c) ? 1 : 0)));
  list.push(byKey((r, c) => Math.abs(2 * r - 5) + Math.abs(2 * c - 5)));
  list.push(byKey((r, c) => Math.sign(r - c)), byKey((r, c) => Math.sign(r + c - 5)));
  list.push(byKey((r, c) => `${Math.sign(r - c)}${Math.sign(r + c - 5)}`));
  list.push(byKey((r, c) => (r === c || r + c === 5 ? 1 : 0)));
  const seen = new Set(), out = [];
  for (const p of list) if (p.k < CELLS && !seen.has(p.key)) { seen.add(p.key); out.push(p); }
  return out;
}

let LIB = null;
function library() {
  if (LIB) return LIB;
  const base = basePartitions();
  const seen = new Set(base.map((p) => p.key)), full = base.slice();
  const add = (p) => { if (p.k < CELLS && !seen.has(p.key)) { seen.add(p.key); full.push(p); } };
  for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) {
    add(join(base[i], base[j]));
    if (base[i].k * base[j].k <= 12) add(meet(base[i], base[j]));
  }
  LIB = { base, full };
  return LIB;
}

// ---------------- inference ----------------
// Bayesian mixture over partitions (plus a "no structure" model). Each class gets an unknown symbol;
// a small error rate keeps one odd cell from ruling a model out completely.

function predict(known, { models = library().full, eps = 0.03, nullWeight = 0.25 } = {}) {
  const obs = [];
  for (let c = 0; c < CELLS; c++) if (known[c] >= 0) obs.push(c);
  const lHit = Math.log(1 - eps), lMiss = Math.log(eps / 3), lq = Math.log(0.25);
  const logs = new Float64Array(models.length);
  const cnt = new Int16Array(CELLS * SYMS), tot = new Int16Array(CELLS);
  let best = -Infinity;
  for (let mi = 0; mi < models.length; mi++) {
    const { cls, k } = models[mi];
    cnt.fill(0, 0, k * SYMS); tot.fill(0, 0, k);
    for (const c of obs) { cnt[cls[c] * SYMS + known[c]]++; tot[cls[c]]++; }
    let L = 0;
    for (let q = 0; q < k; q++) {
      if (!tot[q]) continue;
      let mx = -Infinity; const terms = [];
      for (let s = 0; s < SYMS; s++) { const v = lq + cnt[q * SYMS + s] * lHit + (tot[q] - cnt[q * SYMS + s]) * lMiss; terms.push(v); if (v > mx) mx = v; }
      L += mx + Math.log(terms.reduce((a, v) => a + Math.exp(v - mx), 0));
    }
    logs[mi] = L;
    if (L > best) best = L;
  }
  const nullLog = obs.length * lq + Math.log(nullWeight * models.length / (1 - nullWeight));
  best = Math.max(best, nullLog);
  let W = Math.exp(nullLog - best);
  const P = Array.from({ length: CELLS }, () => [0, 0, 0, 0]);
  for (let c = 0; c < CELLS; c++) for (let s = 0; s < SYMS; s++) P[c][s] = 0.25 * W;
  for (let mi = 0; mi < models.length; mi++) {
    const w = Math.exp(logs[mi] - best);
    if (w < 1e-7) continue;
    W += w;
    const { cls, k } = models[mi];
    cnt.fill(0, 0, k * SYMS); tot.fill(0, 0, k);
    for (const c of obs) { cnt[cls[c] * SYMS + known[c]]++; tot[cls[c]]++; }
    const post = [];
    for (let q = 0; q < k; q++) {
      if (!tot[q]) { post.push(null); continue; }
      const t = [0, 0, 0, 0].map((_, s) => cnt[q * SYMS + s] * lHit + (tot[q] - cnt[q * SYMS + s]) * lMiss);
      const mx = Math.max(...t), e = t.map((v) => Math.exp(v - mx)), z = e.reduce((a, b) => a + b, 0);
      post.push(e.map((v) => v / z));
    }
    for (let c = 0; c < CELLS; c++) {
      const ps = post[cls[c]];
      if (!ps) { for (let s = 0; s < SYMS; s++) P[c][s] += 0.25 * w; continue; }
      for (let x = 0; x < SYMS; x++) P[c][x] += w * (ps[x] * (1 - eps) + (1 - ps[x]) * (eps / 3));
    }
  }
  for (let c = 0; c < CELLS; c++) for (let s = 0; s < SYMS; s++) P[c][s] /= W;
  return P;
}

// ---------------- computer guesser ----------------
const LEVELS = {
  easy: { minPeek: 5, maxPeek: 14, conf: 0.7, bet: 0.38, models: 'base', eps: 0.08, randomPeeks: true },
  normal: { minPeek: 8, maxPeek: 20, conf: 0.7, bet: 0.6, models: 'base', eps: 0.04 },
  hard: { minPeek: 6, maxPeek: 24, conf: 0.8, bet: 0.5, models: 'full', eps: 0.03 },
};

// Plays a whole sheet. `ask(cells)` returns [[cell, symbol], …] — the only access to the secret.
function aiPlay(ask, level = 'normal', rnd = Math.random) {
  const L = LEVELS[level] || LEVELS.normal;
  const models = L.models === 'base' ? library().base : library().full;
  const known = Array(CELLS).fill(-1);
  const opts = { models, eps: L.eps };
  let P = predict(known, opts), peeks = 0;
  const cap = L.minPeek + Math.floor(rnd() * (L.maxPeek - L.minPeek + 1));
  const reveal = (c) => { for (const [cell, s] of ask([c])) known[cell] = s; peeks++; };
  while (peeks < (L.randomPeeks ? cap : L.maxPeek)) {
    const open = [];
    for (let c = 0; c < CELLS; c++) if (known[c] < 0) open.push(c);
    if (!open.length) break;
    if (!L.randomPeeks && peeks >= L.minPeek && open.every((c) => Math.max(...P[c]) >= L.conf)) break;
    let pick;
    if (L.randomPeeks) pick = open[Math.floor(rnd() * open.length)];
    else {
      // most uncertain cell; ties go to the cell farthest from what we've already seen
      let bs = -Infinity;
      for (const c of open) {
        const [r, cc] = rcOf(c);
        let near = 9;
        for (let d = 0; d < CELLS; d++) if (known[d] >= 0) { const [r2, c2] = rcOf(d); near = Math.min(near, Math.abs(r - r2) + Math.abs(cc - c2)); }
        const s = (1 - Math.max(...P[c])) * 10 + Math.min(near, 4) * 0.15 + rnd() * 0.05;
        if (s > bs) { bs = s; pick = c; }
      }
    }
    reveal(pick);
    P = predict(known, opts);
  }
  const guess = Array(CELLS).fill(-1);
  let ev = 0, n = 0;
  for (let c = 0; c < CELLS; c++) {
    if (known[c] >= 0) continue;
    const mx = Math.max(...P[c]);
    if (mx > L.bet) { guess[c] = P[c].indexOf(mx); ev += 2 * mx - 1; n++; }
  }
  // Nothing worth betting on: bow out (the designer pays for a too-hard pattern).
  const gaveUp = level !== 'easy' && (n === 0 || ev < 0.5);
  return { known, guess: gaveUp ? Array(CELLS).fill(-1) : guess, gaveUp, peeks, ev };
}

// Runs a bot seat on a round (host / hot-seat only — needs the pattern).
function aiTurn(r, p, level, rnd) {
  if (!canAct(r, p)) return null;
  const res = aiPlay((cells) => peek(r, p, cells), level, rnd);
  if (res.gaveUp) giveUp(r, p);
  else { r.sheets[p].guess = res.guess.map((g, c) => (r.sheets[p].rev[c] >= 0 ? -1 : g)); submit(r, p); }
  return res;
}

// ---------------- computer designer ----------------
function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function generatePattern(rnd = Math.random) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  for (let tries = 0; tries < 50; tries++) {
    let part;
    const fam = Math.floor(rnd() * 7);
    if (fam === 0) part = bySym(pick([['H', 'V', 'T'], ['H', 'V'], ['R4'], ['T', 'A'], ['H', 'V', 'T'], ['R4']]));
    else if (fam === 1) { const k = pick([2, 3, 3, 4]); const a = 1 + Math.floor(rnd() * (k - 1)), b = Math.floor(rnd() * k); part = byKey((r, c) => (a * r + b * c) % k); }
    else if (fam === 2) part = pick([byKey(ring), byKey((r, c) => Math.abs(2 * r - 5) + Math.abs(2 * c - 5)), byKey((r, c) => ring(r, c) % 2)]);
    else if (fam === 3) { const [tr, tc] = pick([[2, 2], [3, 3], [2, 3], [3, 2], [1, 3], [3, 1], [2, 6]]); part = byKey((r, c) => `${r % tr}.${c % tc}`); }
    else if (fam === 4) { const b = pick([2, 3]); part = pick([byKey((r, c) => `${Math.floor(r / b)}.${Math.floor(c / b)}`), byKey((r, c) => (Math.floor(r / b) + Math.floor(c / b)) % 2)]); }
    else if (fam === 5) part = pick([byKey((r, c) => Math.sign(r - c)), byKey((r, c) => `${Math.sign(r - c)}${Math.sign(r + c - 5)}`), byKey((r, c) => r + c)]);
    else { const base = library().base; part = meet(pick(base.filter((p) => p.k <= 3)), pick(base.filter((p) => p.k === 2))); }
    if (part.k > 12) continue;
    const k = Math.min(part.k, pick([2, 3, 3, 4]));
    const syms = shuffle([0, 1, 2, 3], rnd).slice(0, k);
    const colour = Array.from({ length: part.k }, (_, i) => (i < k ? syms[i] : pick(syms)));
    shuffle(colour, rnd);
    const pat = Array.from(part.cls, (q) => colour[q]);
    if (rnd() < 0.3) { // overlay a line on top
      const line = pick([(r, c) => r === c, (r, c) => r + c === 5, (r, c) => r === c || r + c === 5, (r, c) => ring(r, c) === 0, (r, c) => r === 2 || r === 3 || c === 2 || c === 3]);
      const s = pick([0, 1, 2, 3]);
      for (let i = 0; i < CELLS; i++) if (line(...rcOf(i))) pat[i] = s;
    }
    const used = new Set(pat).size;
    if (used >= 2) return pat;
  }
  return Array.from({ length: CELLS }, (_, i) => (rcOf(i)[0] + rcOf(i)[1]) % 2);
}

// ---------------- online view (host → guest): only what that seat may see ----------------
function viewFor(m, seat) {
  const r = m.round, open = r.phase === 'done';
  const round = {
    ...r,
    pattern: open || r.designer === seat ? r.pattern : null,
    sheets: r.sheets.map((sh, p) => {
      if (!sh) return null;
      if (open || p === seat) return { ...sh, rev: sh.rev.slice(), guess: open ? sh.guess.slice() : Array(CELLS).fill(-1) };
      return { status: sh.status, peeks: sh.peeks, rev: Array(CELLS).fill(-1), guess: Array(CELLS).fill(-1) };
    }),
  };
  return { ...m, totals: m.totals.slice(), past: m.past.map((x) => x.slice()), round };
}

const clone = (x) => JSON.parse(JSON.stringify(x));

export const PII = {
  N, CELLS, SYMS, LEVELS,
  newMatch, nextRound, isMatchOver, designerOf, setPattern, validPattern, guessers, canAct,
  peek, setGuess, submit, giveUp, allDone, untouched, sheetScore, scoreRound, finishRound, leaders, giveUpPenalty,
  library, predict, aiPlay, aiTurn, generatePattern, viewFor, clone,
};
