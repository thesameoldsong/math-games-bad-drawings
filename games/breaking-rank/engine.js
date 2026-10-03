// Breaking Rank — pure game logic + computer player (no DOM).
//
// Two players take turns as guesser and judge. Each turn the judge picks a topic (a group of items and a
// statistic); the guesser lists any number of those items in decreasing order of the statistic.
// Correct list → guesser scores 1 point per item. Any item larger than the one above it → guesser scores 0
// and the judge scores 1. After `rounds` turns each as guesser, the higher score wins.
//
// Everything random (topic offers, item shuffles) is derived from state.seed, so two devices that apply
// the same moves to the same state stay in sync.
import { CATS, CAT } from './questions.js';

function rng(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, r) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Standard normal (Box–Muller) and its CDF.
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
function Phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

const OFFER = 3;
const LEVELS = {
  // noise: how fuzzy the computer's knowledge is (std. dev. on a log scale);
  // trust: the noise it *thinks* it has — the easy one knows little, is a bit overconfident and picks topics at random.
  easy: { noise: 0.8, trust: 0.6, hardPick: false },
  normal: { noise: 0.5, trust: 0.5, hardPick: true },
  hard: { noise: 0.25, trust: 0.25, hardPick: true },
};

export const BR = {
  CATS, CAT, LEVELS,
  rng,

  create({ rounds = 3, starter = 0, choose = true, seed = (Math.random() * 2 ** 32) >>> 0 } = {}) {
    const s = { rounds, starter, choose, seed, t: 0, n: 0, phase: 'pick', offer: [], cat: null, order: [],
      score: [0, 0], used: [], last: null };
    BR.deal(s);
    return s;
  },
  clone: (s) => JSON.parse(JSON.stringify(s)),
  guesser: (s) => (s.starter + s.t) % 2,
  judge: (s) => 1 - BR.guesser(s),
  turns: (s) => s.rounds * 2,
  cat: (s) => CAT[s.cat],

  // Offer topics for the current turn (never one already played this game).
  deal(s) {
    const r = rng(s.seed ^ Math.imul(s.t + 1, 0x9e3779b1));
    let pool = CATS.map((c) => c.id).filter((id) => !s.used.includes(id));
    if (pool.length < OFFER) pool = CATS.map((c) => c.id);
    s.offer = shuffle(pool, r).slice(0, s.choose ? OFFER : 1);
    s.phase = 'pick'; s.cat = null; s.order = []; s.last = null;
    if (!s.choose) BR.pick(s, s.offer[0], true);
  },

  // Sort key: larger = should come earlier in the list.
  key: (cat, i) => cat.items[i][2],

  // Index list → { ok, bad: positions that are larger than the item above them }.
  check(cat, list) {
    const bad = [];
    for (let i = 1; i < list.length; i++) if (BR.key(cat, list[i]) > BR.key(cat, list[i - 1])) bad.push(i);
    return { ok: bad.length === 0, bad };
  },
  // True ranking (indices, largest first).
  truth(cat) {
    return cat.items.map((_, i) => i).sort((a, b) => BR.key(cat, b) - BR.key(cat, a));
  },

  legal(s, m) {
    if (!m || s.phase === 'over') return false;
    if (m.type === 'pick') return s.phase === 'pick' && s.offer.includes(m.cat);
    if (m.type === 'submit') {
      if (s.phase !== 'guess' || !Array.isArray(m.list) || !m.list.length) return false;
      const n = CAT[s.cat].items.length;
      return m.list.every((i) => Number.isInteger(i) && i >= 0 && i < n) && new Set(m.list).size === m.list.length;
    }
    if (m.type === 'next') return s.phase === 'reveal';
    return false;
  },

  pick(s, id, auto = false) {
    s.cat = id;
    const r = rng(s.seed ^ Math.imul(s.t + 7, 0x85ebca6b));
    s.order = shuffle(CAT[id].items.map((_, i) => i), r);
    s.phase = 'guess';
    if (!auto) s.n++;
  },

  apply(s, m) {
    if (!BR.legal(s, m)) return false;
    if (m.type === 'pick') BR.pick(s, m.cat);
    else if (m.type === 'submit') {
      const cat = CAT[s.cat], g = BR.guesser(s), j = 1 - g;
      const { ok, bad } = BR.check(cat, m.list);
      const pts = ok ? m.list.length : 0;
      if (ok) s.score[g] += pts; else s.score[j] += 1;
      s.last = { list: m.list.slice(), ok, bad, pts, guesser: g };
      s.used.push(s.cat);
      s.phase = 'reveal';
      s.n++;
    } else if (m.type === 'next') {
      s.t++;
      s.n++;
      if (s.t >= BR.turns(s)) { s.phase = 'over'; s.offer = []; return true; }
      BR.deal(s);
    }
    return true;
  },

  isOver: (s) => s.phase === 'over',
  winner(s) {
    const [a, b] = s.score;
    return a === b ? -1 : a > b ? 0 : 1;
  },

  // ---------- computer ----------
  // How hard a topic is: the closer neighbouring values are (on a log scale), the harder.
  difficulty(cat) {
    const v = BR.truth(cat).map((i) => logKey(cat, i));
    let sum = 0;
    for (let i = 1; i < v.length; i++) sum += 1 / (0.05 + v[i - 1] - v[i]);
    return sum / (v.length - 1);
  },
  aiPick(s, level = 'normal', r = Math.random) {
    const L = LEVELS[level] || LEVELS.normal;
    if (!L.hardPick) return { type: 'pick', cat: s.offer[Math.floor(r() * s.offer.length)] };
    const best = s.offer.slice().sort((a, b) => BR.difficulty(CAT[b]) - BR.difficulty(CAT[a]))[0];
    return { type: 'pick', cat: best };
  },

  // The computer "remembers" every value with some fuzz, then picks the list with the best expected score.
  aiGuess(s, level = 'normal', r = Math.random) {
    const L = LEVELS[level] || LEVELS.normal;
    const cat = CAT[s.cat];
    const belief = s.order.map((i) => ({ i, b: logKey(cat, i) + gauss(r) * L.noise }));
    belief.sort((x, y) => y.b - x.b);
    const n = belief.length, sd = L.trust * Math.SQRT2;
    const p = (a, b) => Phi((belief[a].b - belief[b].b) / sd); // P(item a really outranks item b)
    // best[k][j]: best probability of a correct chain of k+1 items ending at belief position j
    const best = [belief.map(() => 1)], from = [belief.map(() => -1)];
    for (let k = 1; k < n; k++) {
      best[k] = []; from[k] = [];
      for (let j = 0; j < n; j++) {
        let bp = 0, bi = -1;
        for (let i = 0; i < j; i++) {
          const q = best[k - 1][i] * p(i, j);
          if (q > bp) { bp = q; bi = i; }
        }
        best[k][j] = bp; from[k][j] = bi;
      }
    }
    let bestEV = -1, bk = 0, bj = 0;
    for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) {
      const ev = (k + 1) * best[k][j];
      if (from[k][j] < 0 && k > 0) continue;
      if (ev > bestEV + 1e-9) { bestEV = ev; bk = k; bj = j; }
    }
    const chain = [];
    for (let k = bk, j = bj; k >= 0; j = from[k][j], k--) chain.unshift(belief[j].i);
    return { type: 'submit', list: chain };
  },
};

function logKey(cat, i) {
  const v = cat.items[i][2];
  // Years: think in "how long ago" — a decade matters more for 1990 vs 2000 than for 500 vs 510.
  return cat.kind === 'year' ? -Math.log(2030 - v) : Math.log(v);
}
