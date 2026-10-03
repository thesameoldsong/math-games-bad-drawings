// Dandelions: pure game logic + AI. No DOM.
//
// Two roles: 0 = dandelions (plant flowers), 1 = wind (blows each compass direction at most once).
// Board: n×n cells, index i = r*n + c. cell: 0 empty, 1 seed, 2 flower.
// A gust in direction d sends seeds from EVERY flower along its ray to the board edge
// (seeds are not blocked by anything; flowers stay flowers). Seeds never spread.
// After the last gust the dandelions win iff no empty cell remains.

// Directions = where the seeds travel. 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW.
const DIRS = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];
const SIZES = [5, 6, 7];

// Turn order: 'P' = plant, 'W' = wind. 'double' = balance variant (two plantings first,
// two gusts at the very end; still 7 flowers and 7 gusts).
function schedule(variant) {
  if (variant === 'double') return 'PPW' + 'PW'.repeat(4) + 'PWW';
  return 'PW'.repeat(7);
}

// ---------- geometry (cached per size) ----------
const geoCache = {};
function geo(n) {
  if (geoCache[n]) return geoCache[n];
  const N = n * n;
  const ray = []; // ray[i][d] = list of cells strictly downwind of i
  const rayMask = []; // same as BigInt masks
  for (let i = 0; i < N; i++) {
    const r0 = Math.floor(i / n), c0 = i % n;
    ray.push([]); rayMask.push([]);
    for (const [dr, dc] of DIRS) {
      const out = []; let m = 0n;
      for (let r = r0 + dr, c = c0 + dc; r >= 0 && r < n && c >= 0 && c < n; r += dr, c += dc) {
        out.push(r * n + c); m |= 1n << BigInt(r * n + c);
      }
      ray[i].push(out); rayMask[i].push(m);
    }
  }
  const full = (1n << BigInt(N)) - 1n;
  return (geoCache[n] = { N, ray, rayMask, full });
}

function create(n = 5, variant = 'classic') {
  return { n, variant, sched: schedule(variant), cells: Array(n * n).fill(0), used: [], flowers: [], step: 0, last: null };
}
const clone = (s) => ({ ...s, cells: s.cells.slice(), used: s.used.slice(), flowers: s.flowers.slice(), last: s.last && { ...s.last } });

const isOver = (s) => s.step >= s.sched.length;
const turn = (s) => (isOver(s) ? -1 : s.sched[s.step] === 'P' ? 0 : 1);
const unused = (s) => DIRS.map((_, d) => d).filter((d) => !s.used.includes(d));
const plantsLeft = (s) => [...s.sched.slice(s.step)].filter((x) => x === 'P').length;
const gustsLeft = (s) => [...s.sched.slice(s.step)].filter((x) => x === 'W').length;
const emptyCount = (s) => s.cells.reduce((k, v) => k + (v === 0), 0);
const totals = (s) => ({ plants: [...s.sched].filter((x) => x === 'P').length, gusts: [...s.sched].filter((x) => x === 'W').length });

function legalMoves(s) {
  const tn = turn(s);
  if (tn === 0) return s.cells.map((v, i) => (v === 2 ? -1 : i)).filter((i) => i >= 0).map((i) => ({ t: 'p', i }));
  if (tn === 1) return unused(s).map((d) => ({ t: 'w', d }));
  return [];
}
function isLegal(s, m) {
  if (!m) return false;
  const tn = turn(s);
  if (m.t === 'p') return tn === 0 && Number.isInteger(m.i) && m.i >= 0 && m.i < s.cells.length && s.cells[m.i] !== 2;
  if (m.t === 'w') return tn === 1 && Number.isInteger(m.d) && m.d >= 0 && m.d < 8 && !s.used.includes(m.d);
  return false;
}

// Cells that a gust in direction d would newly seed.
function gustSeeds(s, d) {
  const { ray } = geo(s.n), out = [];
  const seen = new Set();
  for (const f of s.flowers) for (const j of ray[f][d]) if (s.cells[j] === 0 && !seen.has(j)) { seen.add(j); out.push(j); }
  return out;
}

// Mutates s. Returns the list of newly seeded cells (empty for plantings).
function apply(s, m) {
  if (!isLegal(s, m)) throw new Error('illegal move ' + JSON.stringify(m));
  let seeds = [];
  if (m.t === 'p') {
    s.cells[m.i] = 2;
    s.flowers.push(m.i);
    s.last = { t: 'p', i: m.i };
  } else {
    seeds = gustSeeds(s, m.d);
    for (const j of seeds) s.cells[j] = 1;
    s.used.push(m.d);
    s.last = { t: 'w', d: m.d, seeds };
  }
  s.step++;
  return seeds;
}

// Winner role once the game is over: 0 dandelions (meadow full), 1 wind.
const winner = (s) => (!isOver(s) ? -1 : emptyCount(s) === 0 ? 0 : 1);

// ---------- analysis ----------
const popcount = (x) => { let k = 0; while (x) { x &= x - 1n; k++; } return k; };
function emptyMask(s) {
  let m = 0n;
  for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === 0) m |= 1n << BigInt(i);
  return m;
}
// For each unused direction: mask of cells the current flowers will seed if that gust comes.
function coverMasks(s) {
  const { rayMask } = geo(s.n);
  return unused(s).map((d) => {
    let m = 0n;
    for (const f of s.flowers) m |= rayMask[f][d];
    return m;
  });
}

// Empty cells that WILL be filled no matter what the wind does from now on:
// the wind skips (unused − gustsLeft) directions, so a cell reached by more directions than that is safe.
function guaranteed(s) {
  if (isOver(s)) return [];
  const U = unused(s), skip = U.length - gustsLeft(s), masks = coverMasks(s), out = [];
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== 0) continue;
    const b = 1n << BigInt(i);
    let k = 0;
    for (const m of masks) if (m & b) k++;
    if (k > skip) out.push(i);
  }
  return out;
}

// "Holes": how many empty cells the current flowers can't be sure to cover, if the wind
// picks the worst direction(s) to skip. Assumes exactly one skipped direction (8 dirs, 7 gusts).
// Returns [worst, average] over skip choices.
function holes(s) {
  const masks = coverMasks(s), E = emptyMask(s), k = masks.length;
  if (!E) return [0, 0];
  if (!k) return [popcount(E), popcount(E)];
  const skip = k - gustsLeft(s);
  if (skip <= 0) { let all = 0n; for (const m of masks) all |= m; const h = popcount(E & ~all); return [h, h]; }
  // prefix/suffix unions → union of all masks except one
  const pre = [0n], suf = Array(k + 1).fill(0n);
  for (let i = 0; i < k; i++) pre.push(pre[i] | masks[i]);
  for (let i = k - 1; i >= 0; i--) suf[i] = suf[i + 1] | masks[i];
  let worst = 0, sum = 0;
  for (let i = 0; i < k; i++) {
    const h = popcount(E & ~(pre[i] | suf[i + 1]));
    sum += h; if (h > worst) worst = h;
  }
  return [worst, sum / k];
}

// ---------- AI ----------
// Minimax over a single number V (wind maximises, dandelions minimise).
const WIN_W = 1000, WIN_D = -1000;
function evaluate(s) {
  if (isOver(s)) { const e = emptyCount(s); return e ? WIN_W + e : WIN_D; }
  const [w, a] = holes(s);
  if (w === 0) return WIN_D; // every empty cell is already guaranteed
  return w * 10 + a;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Dandelion candidates ordered by 1-ply value; keep the best `k`.
function candidates(s, k) {
  const moves = legalMoves(s);
  if (turn(s) === 1 || moves.length <= k) return moves;
  const scored = moves.map((m) => { const x = clone(s); apply(x, m); return { m, v: evaluate(x) + Math.random() * 0.01 }; });
  scored.sort((a, b) => a.v - b.v);
  return scored.slice(0, k).map((o) => o.m);
}

function search(s, depth, alpha, beta, width, budget) {
  if (isOver(s) || depth === 0 || budget.n-- <= 0) return evaluate(s);
  const quick = evaluate(s);
  if (quick === WIN_D) return quick;
  const maxing = turn(s) === 1;
  let best = maxing ? -Infinity : Infinity;
  for (const m of candidates(s, width)) {
    const x = clone(s); apply(x, m);
    const v = search(x, depth - 1, alpha, beta, width, budget);
    if (maxing) { if (v > best) best = v; if (best > alpha) alpha = best; }
    else { if (v < best) best = v; if (best < beta) beta = best; }
    if (alpha >= beta) break;
  }
  return best;
}

const LEVELS = {
  easy: { depth: 1, width: 99, noise: 0.45 },
  normal: { depth: 2, width: 12, noise: 0 },
  hard: { depth: 4, width: 10, noise: 0 },
};

function aiMove(s, level = 'normal') {
  const L = LEVELS[level] || LEVELS.normal;
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (L.noise && Math.random() < L.noise) return pick(moves);
  const maxing = turn(s) === 1;
  const remaining = s.sched.length - s.step;
  // Near the end, look all the way to the final position.
  const depth = level === 'hard' && remaining <= 5 ? remaining : Math.min(L.depth, remaining);
  const width = level === 'hard' && remaining <= 5 ? 14 : L.width;
  const budget = { n: 80000 };
  let best = [], bv = maxing ? -Infinity : Infinity;
  for (const m of candidates(s, Math.max(width, 14))) {
    const x = clone(s); apply(x, m);
    const v = search(x, depth - 1, -Infinity, Infinity, width, budget);
    if (maxing ? v > bv + 1e-9 : v < bv - 1e-9) { bv = v; best = [m]; }
    else if (Math.abs(v - bv) <= 1e-9) best.push(m);
  }
  return pick(best);
}

export const DAN = {
  DIRS, SIZES, schedule, create, clone, isOver, turn, unused, plantsLeft, gustsLeft, emptyCount, totals,
  legalMoves, isLegal, gustSeeds, apply, winner, guaranteed, holes, aiMove, geo,
};
