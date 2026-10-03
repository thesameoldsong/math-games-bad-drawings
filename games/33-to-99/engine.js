// 33 to 99 — pure rules, solver and computer players (no DOM).
//
// A round: the leader names a target (33..99), five dice are rolled, everybody combines all five
// dice with + − × ÷ (any order, any grouping, fractions allowed on the way) into one whole number
// that must not exceed the target. Points = distance to the target, capped at 10. Fewest points wins.
//
// Working numbers are "tiles": { v: {n, d}, e: expr }, expr = { i: diceIndex } | { op, a, b }.
// A player's answer is a list of steps [i, op, j]: combine tile i with tile j (i op j); the result
// takes j's place and tile i disappears. Four steps reduce five dice to one tile.

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
function F(n, d = 1) {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
const OPS = ['+', '-', '*', '/'];
function apply(x, op, y) {
  switch (op) {
    case '+': return F(x.n * y.d + y.n * x.d, x.d * y.d);
    case '-': return F(x.n * y.d - y.n * x.d, x.d * y.d);
    case '*': return F(x.n * y.n, x.d * y.d);
    case '/': return y.n === 0 ? null : F(x.n * y.d, x.d * y.n);
  }
  return null;
}
const isInt = (v) => v.d === 1;
const fkey = (v) => v.n + '/' + v.d;

// ---------- expressions as text ----------
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };
const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
function exprText(e, dice) {
  if (e.i !== undefined) return String(dice[e.i]);
  const p = PREC[e.op];
  let a = exprText(e.a, dice), b = exprText(e.b, dice);
  if (e.a.op && PREC[e.a.op] < p) a = `(${a})`;
  // right side needs brackets when it binds weaker, or equally for − and ÷ (non-associative)
  if (e.b.op && (PREC[e.b.op] < p || (PREC[e.b.op] === p && (e.op === '-' || e.op === '/')))) b = `(${b})`;
  return `${a} ${SYM[e.op]} ${b}`;
}
const fracText = (v) => (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`);

// ---------- tiles & steps ----------
const startTiles = (dice) => dice.map((x, i) => ({ v: F(x), e: { i } }));
function combine(tiles, i, op, j) {
  if (!Number.isInteger(i) || !Number.isInteger(j) || i === j || !tiles[i] || !tiles[j] || !OPS.includes(op)) return null;
  const v = apply(tiles[i].v, op, tiles[j].v);
  if (!v) return null;
  const out = tiles.slice();
  out[j] = { v, e: { op, a: tiles[i].e, b: tiles[j].e } };
  out.splice(i, 1);
  return out;
}
function replay(dice, steps) {
  let tiles = startTiles(dice);
  for (const s of steps || []) {
    if (!Array.isArray(s) || s.length !== 3) return null;
    tiles = combine(tiles, s[0], s[1], s[2]);
    if (!tiles) return null;
  }
  return tiles;
}
// Final tile of a complete answer, or null if the steps are invalid / incomplete.
function finalTile(dice, steps) {
  const t = replay(dice, steps);
  return t && t.length === 1 ? t[0] : null;
}
const MAXPTS = 10;
function points(target, v) {
  if (!v || !isInt(v) || v.n > target) return MAXPTS;
  return Math.min(MAXPTS, target - v.n);
}
function scoreSteps(dice, target, steps) {
  const t = steps && finalTile(dice, steps);
  return t ? points(target, t.v) : MAXPTS;
}

// Turn an expression tree back into steps on the dice row.
function treeToSteps(e, n) {
  const ids = Array.from({ length: n }, (_, i) => 'd' + i);
  const steps = [];
  let uid = 0;
  const walk = (x) => {
    if (x.i !== undefined) return 'd' + x.i;
    const a = walk(x.a), b = walk(x.b);
    const i = ids.indexOf(a), j = ids.indexOf(b);
    steps.push([i, x.op, j]);
    const id = 'n' + uid++;
    ids[j] = id;
    ids.splice(i, 1);
    return id;
  };
  walk(e);
  return steps;
}

// ---------- exhaustive solver ----------
// For every subset of dice: all reachable values (as fractions) with one expression each.
function reachable(dice) {
  const n = dice.length, full = (1 << n) - 1;
  const memo = new Array(full + 1);
  for (let i = 0; i < n; i++) memo[1 << i] = new Map([[fkey(F(dice[i])), { v: F(dice[i]), e: { i } }]]);
  const masks = [];
  for (let m = 1; m <= full; m++) masks.push(m);
  masks.sort((a, b) => popcount(a) - popcount(b));
  for (const m of masks) {
    if (memo[m]) continue;
    const out = new Map();
    for (let a = (m - 1) & m; a > 0; a = (a - 1) & m) {
      const b = m ^ a;
      if (a < b) continue; // each unordered split once; both operand orders below
      for (const x of memo[a].values()) for (const y of memo[b].values()) {
        for (const [p, q] of [[x, y], [y, x]]) for (const op of OPS) {
          if ((op === '+' || op === '*') && p === y) continue;
          const v = apply(p.v, op, q.v);
          if (!v) continue;
          const k = fkey(v);
          if (!out.has(k)) out.set(k, { v, e: { op, a: p.e, b: q.e } });
        }
      }
    }
    memo[m] = out;
  }
  return memo[full];
}
function popcount(m) { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; }

const solveCache = new Map();
// Whole-number results from all five dice: Map value -> expression tree.
function wholeValues(dice) {
  const key = dice.join(',');
  if (solveCache.has(key)) return solveCache.get(key);
  const res = new Map();
  for (const x of reachable(dice).values()) if (isInt(x.v)) res.set(x.v.n, x.e);
  if (solveCache.size > 200) solveCache.clear();
  solveCache.set(key, res);
  return res;
}
// The best possible answer: { value, e, steps, pts }.
function best(dice, target) {
  const w = wholeValues(dice);
  let bv = null;
  for (const v of w.keys()) if (v <= target && (bv === null || v > bv)) bv = v;
  if (bv === null) return null;
  const e = w.get(bv);
  return { value: bv, e, steps: treeToSteps(e, dice.length), pts: points(target, F(bv)) };
}

// ---------- computer players ----------
// easy: a handful of random tries, mostly + and ×; normal: many random tries;
// hard: the exhaustive solver (always finds the best answer).
function randomSteps(n, rng, ops) {
  const steps = [];
  for (let k = n; k > 1; k--) {
    const i = Math.floor(rng() * k);
    let j = Math.floor(rng() * (k - 1));
    if (j >= i) j++;
    steps.push([i, ops[Math.floor(rng() * ops.length)], j]);
  }
  return steps;
}
const AI_TRIES = { easy: 30, normal: 1500 };
function aiSteps(dice, target, level = 'normal', rng = Math.random, triesOverride) {
  if (level === 'hard') {
    const b = best(dice, target);
    if (b) return b.steps;
  }
  const tries = triesOverride || AI_TRIES[level] || AI_TRIES.normal;
  const ops = level === 'easy' ? ['+', '+', '*', '*', '-'] : OPS;
  let bestS = null, bestP = Infinity;
  for (let k = 0; k < tries; k++) {
    const s = randomSteps(dice.length, rng, ops);
    if (!finalTile(dice, s)) continue;
    const p = scoreSteps(dice, target, s);
    if (p < bestP) { bestP = p; bestS = s; if (p === 0) break; }
  }
  return bestS || randomSteps(dice.length, rng, ['+']);
}
const aiTarget = (rng = Math.random) => MIN + Math.floor(rng() * (MAX - MIN + 1));

// ---------- the match ----------
const MIN = 33, MAX = 99, DICE = 5;
const rollDice = (rng = Math.random, k = DICE) => Array.from({ length: k }, () => 1 + Math.floor(rng() * 6));

// G.done[p]: answer handed in this round; G.subs[p]: the steps, or null (none / invalid / time ran out).
function newMatch({ n = 2, perLeader = 2, first = 0, timer = 0 } = {}) {
  return {
    id: Math.random().toString(36).slice(2, 9),
    n, perLeader, first, timer, round: 0, leader: first, phase: 'pick',
    target: null, dice: null, subs: Array(n).fill(null), done: Array(n).fill(false),
    totals: Array(n).fill(0), history: [],
  };
}
const totalRounds = (G) => G.n * G.perLeader;
const validTarget = (t) => Number.isInteger(t) && t >= MIN && t <= MAX;
function setTarget(G, target, dice) {
  if (G.phase !== 'pick' || !validTarget(target)) return false;
  if (!Array.isArray(dice) || dice.length !== DICE || dice.some((x) => !Number.isInteger(x) || x < 1 || x > 6)) return false;
  G.target = target; G.dice = dice.slice();
  G.subs = Array(G.n).fill(null); G.done = Array(G.n).fill(false);
  G.phase = 'solve';
  return true;
}
function submit(G, p, steps) {
  if (G.phase !== 'solve' || !(p >= 0 && p < G.n) || G.done[p]) return false;
  G.subs[p] = Array.isArray(steps) && finalTile(G.dice, steps) ? steps.map((s) => s.slice()) : null;
  G.done[p] = true;
  if (G.done.every(Boolean)) finishRound(G);
  return true;
}
function finishRound(G) {
  const vals = G.subs.map((s) => (s ? finalTile(G.dice, s).v : null));
  const pts = vals.map((v) => points(G.target, v));
  pts.forEach((x, p) => (G.totals[p] += x));
  const b = best(G.dice, G.target);
  G.history.push({
    target: G.target, dice: G.dice.slice(), leader: G.leader, subs: G.subs.slice(),
    vals: vals.map((v) => (v ? fracText(v) : null)), pts, best: b ? { value: b.value, steps: b.steps, pts: b.pts } : null,
  });
  G.phase = 'reveal';
}
function nextRound(G) {
  if (G.phase !== 'reveal') return false;
  G.round++;
  if (G.round >= totalRounds(G)) { G.phase = 'over'; return true; }
  G.leader = (G.first + G.round) % G.n;
  G.phase = 'pick'; G.target = null; G.dice = null;
  G.subs = Array(G.n).fill(null); G.done = Array(G.n).fill(false);
  return true;
}
// Players with the fewest points (several on a tie).
function winners(G) {
  const m = Math.min(...G.totals);
  return G.totals.map((x, p) => (x === m ? p : -1)).filter((p) => p >= 0);
}
const clone = (G) => JSON.parse(JSON.stringify(G));

export const N99 = {
  MIN, MAX, DICE, MAXPTS, OPS, SYM,
  F, apply, isInt, fracText, exprText,
  startTiles, combine, replay, finalTile, points, scoreSteps, treeToSteps,
  reachable, wholeValues, best, aiSteps, aiTarget, rollDice,
  newMatch, totalRounds, validTarget, setTarget, submit, finishRound, nextRound, winners, clone,
};
