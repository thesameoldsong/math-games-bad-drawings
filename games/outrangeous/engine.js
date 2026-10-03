// Outrangeous — pure game logic + computer guessers (no DOM).
//
// Each round everybody (except the judge, if judges rotate) secretly writes a range [lo, hi].
// Missing the true answer scores 0 (and gives the judge 1 point). A range that captures the answer
// scores 1 point for every other guesser it beats: everyone who missed, and every correct guesser
// whose range is strictly wider. Optional "ratio" scoring compares hi/lo instead of hi − lo.
import { QUESTIONS, BY_ID } from './questions.js';

function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (rnd) => {
  let u = 0;
  while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
};
const shuffle = (arr, rnd) => {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};
const roll = ([n, sides], rnd) => { let s = 0; for (let i = 0; i < n; i++) s += 1 + Math.floor(rnd() * sides); return s; };

// Exact distribution of the sum of n dice: { min, max, p: [prob of min, …, prob of max] }.
function diceDist([n, sides]) {
  let p = [1];
  for (let i = 0; i < n; i++) {
    const q = new Array(p.length + sides - 1).fill(0);
    p.forEach((x, k) => { for (let f = 0; f < sides; f++) q[k + f] += x / sides; });
    p = q;
  }
  return { min: n, max: n * sides, p };
}

const isGuess = (g) => g && typeof g === 'object' && Number.isFinite(g.lo) && Number.isFinite(g.hi);
const contains = (g, a) => isGuess(g) && g.lo <= a && a <= g.hi;

// How "wide" a range is: its width, or under ratio scoring the ratio of its ends
// (a range touching zero or crossing it is infinitely wide on that scale).
function size(g, scoring = 'width') {
  if (scoring !== 'ratio') return g.hi - g.lo;
  if (g.lo > 0) return g.hi / g.lo;
  if (g.hi < 0) return g.lo / g.hi;
  return Infinity;
}
const narrower = (a, b) => a !== b && (b === Infinity || (a !== Infinity && b - a > 1e-9 * Math.max(1, Math.abs(b))));

// Points for one round. guesses: array (null for players who don't guess, e.g. the judge).
function score(guesses, answer, judge = -1, scoring = 'width') {
  const who = guesses.map((g, p) => (isGuess(g) && p !== judge ? p : -1)).filter((p) => p >= 0);
  const correct = guesses.map((g, p) => who.includes(p) && contains(g, answer));
  const sz = guesses.map((g) => (isGuess(g) ? size(g, scoring) : Infinity));
  const gains = guesses.map(() => 0);
  for (const i of who) {
    if (!correct[i]) continue;
    for (const j of who) if (j !== i && (!correct[j] || narrower(sz[i], sz[j]))) gains[i]++;
  }
  const misses = who.filter((p) => !correct[p]).length;
  if (judge >= 0) gains[judge] += misses;
  return { gains, correct, misses };
}

// ---------- game state ----------
// opts: players (2–8), rounds, judge (rotate the judge role), scoring 'width' | 'ratio',
//       deck 'mix' | 'trivia' | 'dice', avoid (question ids to use last), seed
function create(opts = {}) {
  const players = Math.max(2, Math.min(8, opts.players ?? 3));
  const judge = !!opts.judge && players >= 3;
  let rounds = Math.max(1, opts.rounds ?? 8);
  if (judge) rounds = Math.ceil(rounds / players) * players; // everyone judges equally often
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const rnd = mulberry(seed);
  const deck = opts.deck || 'mix';
  const avoid = new Set(opts.avoid || []);
  const trivia = QUESTIONS.filter((q) => !q.dice);
  const dice = QUESTIONS.filter((q) => q.dice);
  const fresh = shuffle(trivia.filter((q) => !avoid.has(q.id)), rnd);
  const stale = shuffle(trivia.filter((q) => avoid.has(q.id)), rnd);
  const pile = [...fresh, ...stale];
  const qs = [];
  let ti = 0, sinceDice = 0;
  for (let r = 0; r < rounds; r++) {
    const wantDice = deck === 'dice' || (deck === 'mix' && r > 0 && sinceDice >= 2 && rnd() < 0.22);
    if (wantDice) {
      const q = dice[Math.floor(rnd() * dice.length)];
      qs.push({ id: q.id, a: roll(q.dice, rnd) });
      sinceDice = 0;
    } else {
      const q = pile[ti++ % pile.length];
      qs.push({ id: q.id, a: q.a });
      sinceDice++;
    }
  }
  return {
    players, rounds, judge, scoring: opts.scoring === 'ratio' ? 'ratio' : 'width', deck,
    qs, round: 0, phase: 'guess', n: 0,
    guesses: new Array(players).fill(null),
    scores: new Array(players).fill(0),
    log: [],
  };
}

const clone = (s) => JSON.parse(JSON.stringify(s));
const judgeOf = (s, r = s.round) => (s.judge ? r % s.players : -1);
const guessers = (s) => [...Array(s.players).keys()].filter((p) => p !== judgeOf(s));
const waitingFor = (s) => (s.phase === 'guess' ? guessers(s).filter((p) => s.guesses[p] === null) : []);
const question = (s, r = s.round) => BY_ID[s.qs[r]?.id];

// Lock in a range for player p. Swaps the ends if needed. Resolves the round when the last guess arrives.
function guess(s, p, lo, hi) {
  if (s.phase !== 'guess' || !waitingFor(s).includes(p)) return false;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return false;
  if (lo > hi) [lo, hi] = [hi, lo];
  s.guesses[p] = { lo, hi };
  s.n++;
  if (!waitingFor(s).length) resolve(s);
  return true;
}

function resolve(s) {
  const judge = judgeOf(s), q = s.qs[s.round];
  const res = score(s.guesses, q.a, judge, s.scoring);
  res.gains.forEach((g, p) => (s.scores[p] += g));
  s.log.push({ round: s.round, id: q.id, a: q.a, judge, guesses: s.guesses, gains: res.gains, correct: res.correct });
  s.round++;
  s.guesses = new Array(s.players).fill(null);
  if (s.round >= s.rounds) s.phase = 'over';
}

function winners(s) {
  const top = Math.max(...s.scores);
  return s.scores.map((v, p) => (v === top ? p : -1)).filter((p) => p >= 0);
}

// What player `seat` may see: other players' pending ranges and unrevealed answers are blanked.
function redact(s, seat) {
  const r = clone(s);
  r.guesses = r.guesses.map((g, p) => (p === seat || g === null ? g : 'locked'));
  r.qs = r.qs.map((q, i) => (i < r.round ? q : i === r.round ? { id: q.id, a: null } : { id: null, a: null }));
  return r;
}

// ---------- number input ----------
const SUFFIX = [
  [/(млрд|bn|b)\.?$/, 1e9], [/(млн|mln|m)\.?$/, 1e6], [/(тыс|k|к|т)\.?$/, 1e3],
];
// "1 200", "1,200" (en), "3,5" (ru), "2.5k", "1,5 млн", "−40" → number, or null if unreadable.
function parseNumber(str, lang = 'en') {
  let s = String(str ?? '').trim().toLowerCase().replace(/[−–—]/g, '-').replace(/[\s  ']/g, '');
  if (!s) return null;
  let mult = 1;
  for (const [re, m] of SUFFIX) if (re.test(s)) { s = s.replace(re, ''); mult = m; break; }
  if (lang === 'ru') s = s.replace(/,/g, '.');
  else if (/^[-+]?\d{1,3}(,\d{3})+(\.\d*)?$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(/,/g, '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const v = Number(s) * mult;
  return Number.isFinite(v) ? Math.round(v * 1e9) / 1e9 : null;
}

// ---------- computer guessers ----------
// The bots "half-know" each answer: their best guess is off by a random error of the question's
// typical size, scaled by level. Easy is overconfident (too-narrow ranges); normal aims for a
// sensible ~70–90% range; hard picks the range with the best expected score against the field.
const KNOW = { easy: 1.35, normal: 1.0, hard: 0.85 };

function niceStep(x, sigma, logScale) {
  const ax = Math.abs(x);
  if (logScale) return ax < 10 ? 1 : 10 ** (Math.floor(Math.log10(ax)) - 1);
  return Math.max(1, 10 ** Math.floor(Math.log10(Math.max(1, sigma / 2))));
}
function rounded(lo, hi, sigma, logScale, intOnly) {
  const sl = niceStep(lo, sigma, logScale), sh = niceStep(hi, sigma, logScale);
  let a = Math.floor(lo / sl) * sl, b = Math.ceil(hi / sh) * sh;
  if (intOnly) { a = Math.floor(a); b = Math.ceil(b); }
  if (logScale && a <= 0) a = Math.max(intOnly ? 1 : 0, Math.floor(lo));
  return { lo: +a.toPrecision(12), hi: +b.toPrecision(12) };
}

function aiDice(q, level, nOpp, rnd) {
  const { min, max, p } = diceDist(q.dice);
  const span = max - min + 1;
  const pick = (lo, hi) => ({ lo: min + lo, hi: min + hi });
  if (level === 'easy') {
    const w = Math.floor(rnd() * Math.max(1, span * 0.4));
    const lo = Math.floor(rnd() * (span - w));
    return pick(lo, lo + w);
  }
  // all intervals [i, j]; their probability mass
  const cum = [0];
  p.forEach((x) => cum.push(cum[cum.length - 1] + x));
  const mass = (i, j) => cum[j + 1] - cum[i];
  const ivs = [];
  for (let i = 0; i < span; i++) for (let j = i; j < span; j++) ivs.push([i, j]);
  if (level === 'normal') {
    // a fairly wide range around the most likely values
    const want = 0.55 + rnd() * 0.35;
    const ok = ivs.filter(([i, j]) => mass(i, j) >= want);
    const w = Math.min(...ok.map(([i, j]) => j - i));
    const best = ok.filter(([i, j]) => j - i === w);
    const [i, j] = best[Math.floor(rnd() * best.length)];
    return pick(i, j);
  }
  // hard: expected points against opponents who pick a random interval holding 40–95% of the mass
  const opp = ivs.filter(([i, j]) => { const m = mass(i, j); return m >= 0.4 && m <= 0.95; });
  let bestV = -1, best = [];
  for (const [i, j] of ivs) {
    let ev = 0;
    for (let tv = i; tv <= j; tv++) {
      // probability a random opponent is beaten when the answer is tv
      let beat = 0;
      for (const [a, b] of opp) if (tv < a || tv > b || b - a > j - i) beat++;
      ev += p[tv] * (beat / opp.length) * nOpp;
    }
    if (ev > bestV + 1e-9) { bestV = ev; best = [[i, j]]; }
    else if (Math.abs(ev - bestV) <= 0.03 * bestV) best.push([i, j]); // near-ties: mix it up
  }
  const [i, j] = best[Math.floor(rnd() * best.length)];
  return pick(i, j);
}

function aiTrivia(q, level, nOpp, rnd) {
  const logScale = q.log != null && q.a > 0;
  const u = logScale ? q.log : q.sd ?? Math.max(1, Math.abs(q.a) * 0.3);
  const k = KNOW[level] ?? 1;
  const to = (v) => (logScale ? 10 ** v : v);
  const truthPos = logScale ? Math.log10(q.a) : q.a;
  const c = truthPos + gauss(rnd) * u * k;   // the bot's best guess
  const sig = u * k;                        // and how unsure it (correctly) is
  let z;
  if (level === 'easy') z = 0.2 + rnd() * 0.6;
  else if (level === 'normal') z = 0.9 + rnd() * 0.8;
  else {
    // Monte Carlo over the bot's belief and a model of the other guessers.
    const M = 240, Z = [];
    for (let x = 0.15; x <= 3.01; x += 0.15) Z.push(x);
    const ev = Z.map(() => 0);
    for (let m = 0; m < M; m++) {
      const tr = c + gauss(rnd) * sig;
      const opps = [];
      for (let o = 0; o < nOpp; o++) {
        const oc = tr + gauss(rnd) * u, oh = (0.3 + rnd() * 1.6) * u;
        opps.push([oc - oh, oc + oh]);
      }
      Z.forEach((zz, zi) => {
        const h = zz * sig;
        if (tr < c - h || tr > c + h) return;
        for (const [a, b] of opps) if (tr < a || tr > b || b - a > 2 * h) ev[zi]++;
      });
    }
    const top = Math.max(...ev);
    const near = Z.filter((_, i) => ev[i] >= top * 0.96);
    z = near[Math.floor(rnd() * near.length)];
  }
  const intOnly = Number.isInteger(q.a);
  const r = rounded(to(c - z * sig), to(c + z * sig), logScale ? 0 : sig, logScale, intOnly);
  return r;
}

function aiGuess(s, p, level = 'normal', rnd = Math.random) {
  const q = question(s);
  const nOpp = Math.max(1, guessers(s).length - 1);
  return q.dice ? aiDice(q, level, nOpp, rnd) : aiTrivia(q, level, nOpp, rnd);
}

export const OUT = {
  QUESTIONS, BY_ID, create, clone, judgeOf, guessers, waitingFor, question, guess, score, size, contains,
  winners, redact, parseNumber, aiGuess, diceDist, mulberry,
};
