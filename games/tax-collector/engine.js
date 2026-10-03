// Tax Collector — pure rules + solver (no DOM).
//
// Numbers 1..n lie on the table. Each turn the player claims a number that still has at least one
// proper divisor on the table; the Tax Collector takes every such divisor. When no number can be
// claimed any more, the Tax Collector takes everything that is left.
//
// State: { n, owner: Int8Array(n+1) (-1 on the table, 0 player, 1 tax collector), score: [you, tax],
//          log: [{ x, taxed: [...] }], sweep: [...] | null, over }

const CEILINGS = [10, 12, 15, 20, 24, 30, 36, 42];

// Best possible player score for each ceiling (computed offline with an exhaustive TAX.solve;
// the small ones are re-verified in engine.test.mjs). Shown after the game.
const OPTIMUM = { 10: 40, 12: 50, 15: 81, 20: 124, 24: 182, 30: 301, 36: 442, 42: 571 };

const divCache = new Map();
// proper divisors of every k <= n: divs[k] = [d < k, d | k]
function divisorTable(n) {
  if (divCache.has(n)) return divCache.get(n);
  const divs = Array.from({ length: n + 1 }, () => []);
  for (let d = 1; d <= n; d++) for (let k = 2 * d; k <= n; k += d) divs[k].push(d);
  divCache.set(n, divs);
  return divs;
}

function create(n = 12) {
  const owner = new Int8Array(n + 1).fill(-1);
  owner[0] = 2; // unused slot
  return { n, owner, score: [0, 0], log: [], sweep: null, over: false };
}

function clone(s) {
  return { n: s.n, owner: Int8Array.from(s.owner), score: [...s.score], log: s.log.map((e) => ({ x: e.x, taxed: [...e.taxed] })), sweep: s.sweep && [...s.sweep], over: s.over };
}

// remaining proper divisors of x (what the Tax Collector would get)
function taxOf(s, x) {
  return divisorTable(s.n)[x].filter((d) => s.owner[d] === -1);
}

const isLegal = (s, x) => !s.over && x >= 1 && x <= s.n && s.owner[x] === -1 && taxOf(s, x).length > 0;

function legalMoves(s) {
  if (s.over) return [];
  const out = [];
  for (let x = 1; x <= s.n; x++) if (isLegal(s, x)) out.push(x);
  return out;
}

const sum = (a) => a.reduce((p, q) => p + q, 0);
const remaining = (s) => { const r = []; for (let x = 1; x <= s.n; x++) if (s.owner[x] === -1) r.push(x); return r; };

// Claims x. Returns { x, taxed, sweep } or null when illegal. Ends the game when nothing is claimable.
function apply(s, x) {
  if (!isLegal(s, x)) return null;
  const taxed = taxOf(s, x);
  s.owner[x] = 0;
  s.score[0] += x;
  for (const d of taxed) s.owner[d] = 1;
  s.score[1] += sum(taxed);
  s.log.push({ x, taxed });
  let sweep = null;
  if (!legalMoves(s).length) {
    sweep = remaining(s);
    for (const d of sweep) s.owner[d] = 1;
    s.score[1] += sum(sweep);
    s.sweep = sweep;
    s.over = true;
  }
  return { x, taxed, sweep };
}

// Numbers that are claimable in `before` but not in `after` (other than the ones that just moved):
// they became gifts for the Tax Collector.
function stranded(before, after) {
  const out = [];
  for (let x = 1; x <= before.n; x++)
    if (after.owner[x] === -1 && isLegal(before, x) && !isLegal(after, x)) out.push(x);
  return out;
}

// ---------- solver ----------
// Exact memoised search over the set of numbers still on the table, with a node budget. When the
// budget runs out it falls back to the best line found so far (still a sensible move).
//
// Bitmasks are BigInt (n <= 64).
function solve(s, { budget = 400000 } = {}) {
  const n = s.n, divs = divisorTable(n);
  const bit = Array.from({ length: n + 1 }, (_, k) => 1n << BigInt(k));
  let mask = 0n;
  for (let x = 1; x <= n; x++) if (s.owner[x] === -1) mask |= bit[x];
  const memo = new Map();
  let nodes = 0, exact = true;

  // Greedy-ish rollout used when the budget is exhausted: prefer moves taxing a single small divisor,
  // then the biggest net gain.
  function rollout(m) {
    let total = 0;
    for (;;) {
      let best = -1, bestKey = -Infinity, bestTax = 0n;
      for (let x = n; x >= 2; x--) {
        if (!(m & bit[x])) continue;
        let t = 0, cnt = 0, tm = 0n;
        for (const d of divs[x]) if (m & bit[d]) { t += d; cnt++; tm |= bit[d]; }
        if (!cnt) continue;
        const key = (x - t) * 2 - (cnt - 1) * 3;
        if (key > bestKey) { bestKey = key; best = x; bestTax = tm; }
      }
      if (best < 0) return total;
      total += best;
      m &= ~(bit[best] | bestTax);
    }
  }

  function moves(m) {
    const out = [];
    for (let x = n; x >= 2; x--) {
      if (!(m & bit[x])) continue;
      let tm = 0n, t = 0;
      for (const d of divs[x]) if (m & bit[d]) { tm |= bit[d]; t += d; }
      if (tm) out.push({ x, tm, net: x - t });
    }
    out.sort((a, b) => b.net - a.net);
    return out;
  }

  function f(m) {
    const hit = memo.get(m);
    if (hit !== undefined) return hit;
    if (++nodes > budget) { exact = false; return rollout(m); }
    let best = 0;
    for (const { x, tm } of moves(m)) {
      const v = x + f(m & ~(bit[x] | tm));
      if (v > best) best = v;
    }
    memo.set(m, best);
    return best;
  }

  let bestMove = null, bestVal = -1;
  for (const { x, tm } of moves(mask)) {
    const v = x + f(mask & ~(bit[x] | tm));
    if (v > bestVal) { bestVal = v; bestMove = x; }
  }
  return { move: bestMove, gain: Math.max(0, bestVal), exact, nodes };
}

// Suggested next number (null when the game is over).
function hint(s, budget) {
  return s.over ? null : solve(s, { budget }).move;
}

const total = (n) => (n * (n + 1)) / 2;

export const TAX = { CEILINGS, OPTIMUM, create, clone, taxOf, isLegal, legalMoves, apply, remaining, stranded, solve, hint, total, divisorTable };
