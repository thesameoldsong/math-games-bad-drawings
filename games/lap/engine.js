// LAP (Labyrinthine Area Puzzles): pure game logic + AI. No DOM.
//
// Each player secretly splits an N×N grid into K connected regions of equal size (labels 0..K-1).
// On a turn you either probe a rectangle of the opponent's grid (at least 2×2; exactly 2×2 in the
// classic rules) and learn how many of its cells belong to each region, or you announce a guess
// of the whole grid. A correct guess wins, a wrong one loses. Guesses are compared as partitions:
// the region names don't have to match, only the shapes.
//
// Grids are flat arrays of length N*N, index = r*N + c, value = label or -1 (empty).
// Rect = {r0, c0, r1, c1} inclusive, r0 <= r1, c0 <= c1.

const VARIANTS = {
  std: { N: 6, K: 4 },      // the book's main game
  beginner: { N: 6, K: 2 }, // two regions of 18
  expert: { N: 8, K: 4 },   // the original 8×8
};

function create({ variant = 'std', classic = false, first = 0 } = {}) {
  const { N, K } = VARIANTS[variant] || VARIANTS.std;
  return {
    variant, N, K, S: (N * N) / K, classic: !!classic,
    phase: 'setup',            // setup → play → over
    boards: [null, null],
    probes: [[], []],          // probes[p] = rects p asked about the opponent's grid, with answers
    turn: first, first,
    moves: 0,                  // every accepted action bumps this (online move counter)
    guess: null,               // {p, grid, correct}
    winner: -1,
  };
}

const clone = (s) => ({
  ...s,
  boards: s.boards.map((b) => b && b.slice()),
  probes: s.probes.map((l) => l.map((x) => ({ ...x, counts: x.counts.slice() }))),
  guess: s.guess && { ...s.guess, grid: s.guess.grid.slice() },
});

// ---------- geometry ----------
const normRect = ({ r0, c0, r1, c1 }) => ({ r0: Math.min(r0, r1), c0: Math.min(c0, c1), r1: Math.max(r0, r1), c1: Math.max(c0, c1) });
const rectCells = (N, { r0, c0, r1, c1 }) => {
  const out = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) out.push(r * N + c);
  return out;
};
const rectKey = (x) => `${x.r0},${x.c0},${x.r1},${x.c1}`;
const COLS = 'ABCDEFGH';
const cellName = (r, c) => COLS[c] + (r + 1);
const rectName = (x) => cellName(x.r0, x.c0) + ':' + cellName(x.r1, x.c1);

function rectOk(s, x) {
  if (!x) return false;
  const { r0, c0, r1, c1 } = x;
  if (![r0, c0, r1, c1].every((v) => Number.isInteger(v) && v >= 0 && v < s.N)) return false;
  if (r0 > r1 || c0 > c1) return false;
  const h = r1 - r0 + 1, w = c1 - c0 + 1;
  return s.classic ? h === 2 && w === 2 : h >= 2 && w >= 2;
}

function allRects(s) {
  const out = [];
  for (let r0 = 0; r0 < s.N; r0++) for (let r1 = r0 + 1; r1 < s.N; r1++)
    for (let c0 = 0; c0 < s.N; c0++) for (let c1 = c0 + 1; c1 < s.N; c1++) {
      const x = { r0, c0, r1, c1 };
      if (rectOk(s, x)) out.push(x);
    }
  return out;
}

function answer(grid, N, K, x) {
  const counts = Array(K).fill(0);
  for (const i of rectCells(N, x)) counts[grid[i]]++;
  return counts;
}

function neighbors(N, i) {
  const r = (i / N) | 0, c = i % N, out = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
}

// Validates a finished board: every label used exactly S times and connected.
function check(grid, N, K) {
  const S = (N * N) / K;
  const counts = Array(K).fill(0);
  let empty = 0;
  for (const v of grid) v >= 0 && v < K ? counts[v]++ : empty++;
  const broken = [];
  for (let L = 0; L < K; L++) {
    if (!counts[L]) continue;
    const start = grid.indexOf(L), seen = new Set([start]), q = [start];
    while (q.length) for (const j of neighbors(N, q.pop())) if (grid[j] === L && !seen.has(j)) { seen.add(j); q.push(j); }
    if (seen.size !== counts[L]) broken.push(L);
  }
  const ok = !empty && !broken.length && counts.every((n) => n === S);
  return { ok, counts, broken, empty, S };
}

// Same regions, regardless of which name each region got.
function samePartition(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const f = new Map(), g = new Map();
  for (let i = 0; i < a.length; i++) {
    if (a[i] < 0 || b[i] < 0) return false;
    if (f.has(a[i]) ? f.get(a[i]) !== b[i] : (f.set(a[i], b[i]), false)) return false;
    if (g.has(b[i]) ? g.get(b[i]) !== a[i] : (g.set(b[i], a[i]), false)) return false;
  }
  return true;
}

function perms(n) {
  if (n <= 1) return [[0]];
  const out = [];
  for (const p of perms(n - 1)) for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]);
  return out;
}

// Cells where a guess differs from the truth, after renaming the guess's regions as well as possible.
function mismatches(guess, truth, K) {
  let best = null, bestHit = -1;
  for (const p of perms(K)) {
    let hit = 0;
    for (let i = 0; i < truth.length; i++) if (guess[i] >= 0 && p[guess[i]] === truth[i]) hit++;
    if (hit > bestHit) { bestHit = hit; best = p; }
  }
  return truth.map((v, i) => guess[i] < 0 || best[guess[i]] !== v);
}

// ---------- actions (mutate s; return false when illegal) ----------
function setBoard(s, p, grid) {
  if (s.phase !== 'setup' || s.boards[p] || !Array.isArray(grid) || grid.length !== s.N * s.N) return false;
  if (!check(grid, s.N, s.K).ok) return false;
  if (s.classic && ambiguous(grid, s.N, s.K)) return false;
  s.boards[p] = grid.slice();
  s.moves++;
  if (s.boards[0] && s.boards[1]) { s.phase = 'play'; s.turn = s.first; }
  return true;
}

function probe(s, x) {
  if (s.phase !== 'play' || !rectOk(s, x)) return null;
  const p = s.turn, counts = answer(s.boards[1 - p], s.N, s.K, x);
  s.probes[p].push({ r0: x.r0, c0: x.c0, r1: x.r1, c1: x.c1, counts });
  s.turn = 1 - p;
  s.moves++;
  return counts;
}

function guess(s, grid) {
  if (s.phase !== 'play' || !Array.isArray(grid) || grid.length !== s.N * s.N || grid.some((v) => !(v >= 0 && v < s.K))) return null;
  const p = s.turn, correct = samePartition(grid, s.boards[1 - p]);
  s.guess = { p, grid: grid.slice(), correct };
  s.winner = correct ? p : 1 - p;
  s.phase = 'over';
  s.moves++;
  return correct;
}

// ---------- solver: labelled grids consistent with probe answers ----------
// Depth-first search; picks the most constrained cell first (MRV), prunes on probe counts,
// region sizes and connectivity. Returns {solutions, complete, nodes}.
function solve({ N, K, probes = [], limit = 2, maxNodes = 150000, rand = null }) {
  const S = (N * N) / K, n = N * N, FULL = (1 << K) - 1;
  const cons = [];
  for (const x of probes) {
    const cells = rectCells(N, x), inside = new Set(cells);
    cons.push({ cells, need: x.counts });
    // the rest of the board holds the rest of each region
    const out = [];
    for (let i = 0; i < n; i++) if (!inside.has(i)) out.push(i);
    if (out.length) cons.push({ cells: out, need: x.counts.map((v) => S - v) });
  }
  const of = Array.from({ length: n }, () => []);
  cons.forEach((c, ci) => c.cells.forEach((i) => of[i].push(ci)));
  const cnt = cons.map(() => Array(K).fill(0));
  const rem = cons.map((c) => c.cells.length);
  const allow = new Int32Array(cons.length);
  const total = Array(K).fill(0);
  const g = new Int8Array(n).fill(-1);
  const nb = Array.from({ length: n }, (_, i) => neighbors(N, i));
  const solutions = [];
  let nodes = 0, aborted = false, assigned = 0;
  const seen = new Int32Array(n);
  let stamp = 0;
  const stack = new Int32Array(n);
  const BITS = Array.from({ length: 1 << K }, (_, m) => { const o = []; for (let L = 0; L < K; L++) if (m >> L & 1) o.push(L); return o; });

  // Each started label must still be able to grow into one connected region of size S that
  // reaches every probe that still needs cells of that label.
  function connected() {
    let open = 0;
    for (let L = 0; L < K; L++) if (total[L] && total[L] < S) open |= 1 << L;
    for (let L = 0; L < K; L++) {
      if (!total[L]) continue;
      const grow = total[L] < S;
      stamp++;
      let start = -1;
      for (let i = 0; i < n; i++) if (g[i] === L) { start = i; break; }
      let sp = 0, reach = 0, placed = 0;
      stack[sp++] = start; seen[start] = stamp;
      while (sp) {
        const i = stack[--sp];
        reach++;
        if (g[i] === L) placed++;
        for (const j of nb[i]) {
          if (seen[j] === stamp) continue;
          if (g[j] === L || (grow && g[j] < 0)) { seen[j] = stamp; stack[sp++] = j; }
        }
      }
      if (placed < total[L] || reach < S) return false;
      if (grow) for (let ci = 0; ci < cons.length; ci++) {
        if (cnt[ci][L] >= cons[ci].need[L]) continue;
        let hit = false;
        for (const i of cons[ci].cells) if (g[i] < 0 && seen[i] === stamp) { hit = true; break; }
        if (!hit) return false;
      }
    }
    // Every pocket of empty cells must be fillable by the regions that can still reach it.
    let fresh = 0;
    for (let L = 0; L < K; L++) if (!total[L]) fresh++;
    stamp++;
    for (let i0 = 0; i0 < n; i0++) {
      if (g[i0] >= 0 || seen[i0] === stamp) continue;
      let sp = 0, size = 0, near = 0;
      stack[sp++] = i0; seen[i0] = stamp;
      while (sp) {
        const i = stack[--sp];
        size++;
        for (const j of nb[i]) {
          if (g[j] >= 0) near |= 1 << g[j];
          else if (seen[j] !== stamp) { seen[j] = stamp; stack[sp++] = j; }
        }
      }
      let room = fresh * S;
      for (let L = 0; L < K; L++) if (near >> L & 1) room += S - total[L];
      if (room < size) return false;
      // a pocket no started region can reach must hold whole new regions
      if (!(near & open) && size % S) return false;
    }
    return true;
  }

  function place(i, L, d) {
    g[i] = d > 0 ? L : -1; total[L] += d; assigned += d;
    for (const ci of of[i]) { cnt[ci][L] += d; rem[ci] -= d; }
  }

  function rec() {
    if (aborted) return;
    if (++nodes > maxNodes) { aborted = true; return; }
    if (assigned === n) { solutions.push(Array.from(g)); return; }
    let cap = 0;
    for (let L = 0; L < K; L++) if (total[L] < S) cap |= 1 << L;
    for (let ci = 0; ci < cons.length; ci++) {
      if (!rem[ci]) continue;
      let m = 0;
      for (let L = 0; L < K; L++) {
        const d = cons[ci].need[L] - cnt[ci][L];
        if (d === rem[ci]) { m = 1 << L; break; }
        if (d > 0) m |= 1 << L;
      }
      allow[ci] = m;
    }
    let best = -1, bm = 0, bs = 99, badj = -1;
    for (let i = 0; i < n; i++) {
      if (g[i] >= 0) continue;
      let m = cap;
      for (const ci of of[i]) m &= allow[ci];
      const sz = BITS[m].length;
      if (!sz) return;
      let adj = 0;
      for (const j of nb[i]) if (g[j] >= 0) adj++;
      if (sz < bs || (sz === bs && adj > badj)) { bs = sz; best = i; bm = m; badj = adj; }
    }
    let labels = BITS[bm];
    if (rand) {
      // random order, but try the neighbours' labels first: regions grow instead of fragmenting
      let near = 0;
      for (const j of nb[best]) if (g[j] >= 0) near |= 1 << g[j];
      labels = [...shuffle(BITS[bm & near].slice(), rand), ...shuffle(BITS[bm & ~near].slice(), rand)];
    }
    for (const L of labels) {
      place(best, L, 1);
      if (connected()) rec();
      place(best, L, -1);
      if (solutions.length >= limit || aborted) return;
    }
  }
  rec();
  return { solutions, complete: !aborted, nodes };
}

function shuffle(a, rand = Math.random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Classic rules (2×2 probes only): some boards can't be told apart from others. They're not allowed.
function ambiguous(grid, N, K) {
  const probes = [];
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) {
    const x = { r0: r, c0: c, r1: r + 1, c1: c + 1 };
    probes.push({ ...x, counts: answer(grid, N, K, x) });
  }
  const { solutions, complete } = solve({ N, K, probes, limit: 2, maxNodes: 400000 });
  if (!complete) return true;
  return solutions.length > 1 && !samePartition(solutions[0], solutions[1]);
}

// ---------- random boards ----------
function freeConnected(g, N, skip) {
  let start = -1, free = 0;
  for (let i = 0; i < g.length; i++) if (g[i] < 0 && i !== skip) { free++; if (start < 0) start = i; }
  if (!free) return true;
  const seen = new Set([start]), q = [start];
  while (q.length) for (const j of neighbors(N, q.pop())) if (g[j] < 0 && j !== skip && !seen.has(j)) { seen.add(j); q.push(j); }
  return seen.size === free;
}

function randomBoard(N, K, rand = Math.random) {
  const S = (N * N) / K, n = N * N;
  for (let attempt = 0; attempt < 2000; attempt++) {
    const g = Array(n).fill(-1);
    let ok = true;
    for (let L = 0; L < K - 1 && ok; L++) {
      // start in a tight spot (fewest free neighbours) so regions pack without leaving holes
      let best = [], bv = 9;
      for (let i = 0; i < n; i++) {
        if (g[i] >= 0) continue;
        const v = neighbors(N, i).filter((j) => g[j] < 0).length;
        if (v < bv) { bv = v; best = [i]; } else if (v === bv) best.push(i);
      }
      let cur = best[Math.floor(rand() * best.length)];
      if (!freeConnected(g, N, cur)) { ok = false; break; }
      g[cur] = L;
      const region = [cur];
      while (region.length < S) {
        const front = [...new Set(region.flatMap((i) => neighbors(N, i)).filter((j) => g[j] < 0))]
          .filter((j) => freeConnected(g, N, j));
        if (!front.length) { ok = false; break; }
        const j = front[Math.floor(rand() * front.length)];
        g[j] = L; region.push(j);
      }
    }
    if (!ok) continue;
    for (let i = 0; i < n; i++) if (g[i] < 0) g[i] = K - 1;
    if (!check(g, N, K).ok) continue;
    const p = shuffle(Array.from({ length: K }, (_, i) => i), rand);
    return g.map((v) => p[v]);
  }
  throw new Error('randomBoard failed');
}

// Number of region walls: more walls = twistier, harder-to-read board.
function wiggle(g, N) {
  let w = 0;
  for (let i = 0; i < g.length; i++) {
    if (i % N < N - 1 && g[i] !== g[i + 1]) w++;
    if (i + N < g.length && g[i] !== g[i + N]) w++;
  }
  return w;
}

function makeBoard(s, level = 'normal', rand = Math.random) {
  const tries = level === 'hard' ? 24 : 1;
  let best = null, bw = -1;
  for (let k = 0; k < tries * 3 && (k < tries || !best); k++) {
    const g = randomBoard(s.N, s.K, rand);
    if (s.classic && ambiguous(g, s.N, s.K)) continue;
    const w = wiggle(g, s.N);
    if (w > bw) { bw = w; best = g; }
  }
  if (!best) { do best = randomBoard(s.N, s.K, rand); while (s.classic && ambiguous(best, s.N, s.K)); }
  return best;
}

// ---------- AI ----------
// What player p knows about the opponent: candidate grids consistent with p's probe answers.
function candidates(s, p, { samples = 12, rand = Math.random, budget = 160000 } = {}) {
  const probes = s.probes[p], N = s.N, K = s.K;
  const exact = solve({ N, K, probes, limit: 2, maxNodes: budget / 3 });
  if (exact.complete && exact.solutions.length <= 1) return { unique: exact.solutions[0] || null, pool: exact.solutions };
  const pool = new Map();
  for (const x of exact.solutions) pool.set(x.join(''), x);
  // Random restarts with a small node cap: the search has a heavy tail, short runs dodge it.
  let spent = 0, runs = 0;
  while (pool.size < samples && spent < budget && runs < samples * 6) {
    const r = solve({ N, K, probes, limit: 1, maxNodes: 40 * N * N, rand });
    spent += r.nodes; runs++;
    for (const x of r.solutions) pool.set(x.join(''), x);
  }
  return { unique: null, pool: [...pool.values()] };
}

function aiMove(s, level = 'normal', rand = Math.random) {
  const p = s.turn;
  const asked = new Set(s.probes[p].map(rectKey));
  const fresh = allRects(s).filter((x) => !asked.has(rectKey(x)));
  const samples = level === 'hard' ? 28 : level === 'normal' ? 14 : 4;
  const { unique, pool } = candidates(s, p, { samples, rand });
  if (unique) return { type: 'guess', grid: unique };
  // the proof keeps timing out but every sample agrees: it's (almost surely) this one
  if (pool.length === 1 && s.probes[p].length >= 10) return { type: 'guess', grid: pool[0] };

  const area = (x) => (x.r1 - x.r0 + 1) * (x.c1 - x.c0 + 1);
  if (level === 'easy') {
    // Random little peeks; takes a gamble once only a couple of options seem to be left.
    if (pool.length && pool.length <= 2 && s.probes[p].length >= 10 && rand() < 0.5) return { type: 'guess', grid: pool[0] };
    const small = fresh.filter((x) => area(x) === 4);
    const list = small.length ? small : fresh.length ? fresh : allRects(s);
    return { type: 'probe', rect: list[Math.floor(rand() * list.length)] };
  }
  // Normal sticks to small probes, like a cautious human; hard considers every rectangle.
  const pickFrom = level === 'hard' ? fresh : fresh.filter((x) => area(x) <= 6);

  // Pick the probe that splits the sampled candidates best (smallest expected leftover group).
  let best = [], bv = Infinity;
  for (const x of pickFrom.length ? pickFrom : fresh) {
    const groups = new Map();
    for (const g of pool) {
      const k = answer(g, s.N, s.K, x).join(',');
      groups.set(k, (groups.get(k) || 0) + 1);
    }
    let v = 0;
    for (const m of groups.values()) v += m * m;
    v += area(x) * 1e-4; // prefer smaller probes on ties
    if (v < bv - 1e-9) { bv = v; best = [x]; } else if (Math.abs(v - bv) < 1e-9) best.push(x);
  }
  if (!best.length) best = allRects(s);
  return { type: 'probe', rect: best[Math.floor(rand() * best.length)] };
}

// Only what player `seat` may see (online: the host strips its own secret grid).
function viewFor(s, seat) {
  const v = clone(s);
  if (s.phase !== 'over') v.boards[1 - seat] = v.boards[1 - seat] ? 'hidden' : null;
  return v;
}

export const LAP = {
  VARIANTS, create, clone, normRect, rectCells, rectKey, rectName, cellName, rectOk, allRects, answer, check,
  samePartition, mismatches, setBoard, probe, guess, solve, ambiguous, randomBoard, makeBoard, wiggle,
  candidates, aiMove, viewFor,
};
