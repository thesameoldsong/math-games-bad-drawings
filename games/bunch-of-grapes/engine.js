// Bunch of Grapes: pure game logic, board generator and AI. No DOM.
//
// Board: grapes are circles {x, y, r}; overlapping grapes are split by the radical line (like soap
// bubbles), and two grapes are neighbours when they share a clearly visible stretch of border.
// The generator nudges grapes until every pair either shares a real border or has a clear gap.
//
// Play: each player puts a fly on a grape (first placer, then second placer). The second placer
// moves first. A move = your fly eats the grape it sits on and hops to a neighbouring grape that is
// neither eaten nor occupied by the other fly. Whoever cannot move loses.

export const W = 360, H = 420;
const CX = W / 2, TOP = 44, BOT = H - 8;

export const SIZES = { small: 22, medium: 32, large: 44 };

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Half-width of the bunch silhouette at height y: rounded shoulders on top, a tapering point below.
function halfWidth(y) {
  const t = (y - TOP) / (BOT - TOP);
  if (t < 0 || t > 1) return 0;
  return 168 * (1 - 0.8 * Math.pow(t, 1.3)) * Math.min(1, 0.62 + 4 * t);
}

// ---------- cells (circle clipped by radical lines of overlapping neighbours) ----------
const SEG = 56;
function clip(poly, a, b) {
  // keep points p with p·a <= b
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = p[0] * a[0] + p[1] * a[1] - b, dq = q[0] * a[0] + q[1] * a[1] - b;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const k = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]);
    }
  }
  return out;
}
function radical(g, h) {
  const a = [h.x - g.x, h.y - g.y];
  const b = (h.x * h.x + h.y * h.y - h.r * h.r - g.x * g.x - g.y * g.y + g.r * g.r) / 2;
  return [a, b];
}
const polyArea = (P) => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

// Returns { polys, border } where border[i][j] = length of the shared border of grapes i and j.
export function cells(grapes) {
  const n = grapes.length, polys = [], border = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    const g = grapes[i];
    let P = [];
    for (let k = 0; k < SEG; k++) { const a = (k / SEG) * Math.PI * 2; P.push([g.x + Math.cos(a) * g.r, g.y + Math.sin(a) * g.r]); }
    const lines = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const h = grapes[j];
      if (Math.hypot(h.x - g.x, h.y - g.y) >= g.r + h.r) continue;
      const [a, b] = radical(g, h);
      P = clip(P, a, b);
      lines.push([j, a, b, Math.hypot(a[0], a[1])]);
    }
    polys.push(P);
    for (let k = 0; k < P.length; k++) {
      const p = P[k], q = P[(k + 1) % P.length];
      for (const [j, a, b, L] of lines) {
        if (Math.abs(p[0] * a[0] + p[1] * a[1] - b) / L < 0.01 && Math.abs(q[0] * a[0] + q[1] * a[1] - b) / L < 0.01) {
          border[i][j] += Math.hypot(q[0] - p[0], q[1] - p[1]);
        }
      }
    }
  }
  return { polys, border };
}

// ---------- generator ----------
function clampIn(g) {
  const m = g.r * 0.55;
  g.y = Math.max(TOP + m, Math.min(Math.min(BOT - m, H - 3 - g.r), g.y));
  const hw = Math.max(0, Math.min(halfWidth(g.y) - m, CX - 3 - g.r));
  g.x = Math.max(CX - hw, Math.min(CX + hw, g.x));
}
function relax(G, iters, cohesion) {
  const n = G.length;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = G[i], b = G[j];
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d < 1e-6) { dx = 0.01; dy = 0; d = 0.01; }
      const s = a.r + b.r, target = 0.88 * s;
      let push = 0;
      if (d < target) push = (target - d) * 0.3;
      else if (cohesion && d < 1.35 * s) push = -(d - target) * 0.025;
      if (!push) continue;
      const ux = dx / d, uy = dy / d;
      a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
    }
    for (const g of G) clampIn(g);
  }
}

function connected(adj) {
  const seen = new Set([0]), q = [0];
  while (q.length) for (const k of adj[q.pop()]) if (!seen.has(k)) { seen.add(k); q.push(k); }
  return seen.size === adj.length;
}

// Try once with a given seed; returns null when the result is not clean enough.
function attempt(N, seed) {
  const R = rng(seed);
  const area = 74000, rMean = Math.sqrt(area / (2.75 * N));
  const G = [];
  while (G.length < N) {
    const y = TOP + R() * (BOT - TOP), x = CX + (R() * 2 - 1) * halfWidth(y);
    const g = { x, y, r: rMean * (0.78 + R() * 0.44) };
    clampIn(g);
    G.push(g);
  }
  relax(G, 260, true);
  relax(G, 40, false);
  for (let round = 0; round < 60; round++) {
    const { polys, border } = cells(G);
    let bad = 0;
    for (let i = 0; i < N; i++) {
      if (polyArea(polys[i]) < 0.5 * Math.PI * G[i].r ** 2) return null;
      for (let j = i + 1; j < N; j++) {
        const a = G[i], b = G[j], d = Math.hypot(b.x - a.x, b.y - a.y), s = a.r + b.r;
        const minB = 0.42 * Math.min(a.r, b.r);
        const shared = Math.min(border[i][j], border[j][i]);
        const ambiguous = (d < s && shared < minB) || (d >= s && d < 1.08 * s);
        if (!ambiguous) continue;
        bad++;
        // pull overlapping pairs that clearly touch closer, push the rest to a clear gap
        const target = d < 0.97 * s && shared > minB * 0.5 ? 0.86 * s : 1.12 * s;
        const k = (target - d) / 2 / (d || 1);
        const dx = (b.x - a.x) * k, dy = (b.y - a.y) * k;
        a.x -= dx; a.y -= dy; b.x += dx; b.y += dy;
      }
    }
    for (const g of G) clampIn(g);
    if (!bad) {
      const adj = G.map(() => []);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j && Math.min(border[i][j], border[j][i]) >= 0.42 * Math.min(G[i].r, G[j].r)) adj[i].push(j);
      if (!connected(adj) || adj.some((a) => !a.length)) return null;
      const grapes = G.map((g) => ({ x: +g.x.toFixed(2), y: +g.y.toFixed(2), r: +g.r.toFixed(2) }));
      return { grapes, adj };
    }
    relax(G, 6, false);
  }
  return null;
}

// Re-derives adjacency from (rounded) geometry so host and guest always agree with what's drawn.
function finalize(b) {
  const { border } = cells(b.grapes);
  const n = b.grapes.length;
  const adj = b.grapes.map(() => []);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i !== j && Math.min(border[i][j], border[j][i]) >= 0.3 * Math.min(b.grapes[i].r, b.grapes[j].r)) adj[i].push(j);
  }
  return { grapes: b.grapes, adj };
}

export function generate(size = 'medium', seed = (Math.random() * 2 ** 31) | 0) {
  const N = SIZES[size] || (typeof size === 'number' ? size : SIZES.medium);
  for (let k = 0; k < 400; k++) {
    const b = attempt(N, seed + k * 7919);
    if (b) {
      // sort top-to-bottom so indices read naturally
      const order = b.grapes.map((_, i) => i).sort((p, q) => b.grapes[p].y - b.grapes[q].y || b.grapes[p].x - b.grapes[q].x);
      const grapes = order.map((i) => b.grapes[i]);
      const out = finalize({ grapes });
      if (connected(out.adj)) return { size, ...out };
    }
  }
  throw new Error('could not generate a bunch');
}

// ---------- rules ----------
function create(board, first = 0) {
  const n = board.grapes.length;
  return {
    board, n,
    eaten: Array(n).fill(-1),
    fly: [-1, -1],
    first, turn: first, phase: 'place', ply: 0, winner: -1,
    last: null, from: null,
  };
}
const clone = (s) => ({ ...s, eaten: s.eaten.slice(), fly: s.fly.slice() });
const free = (s, g) => s.eaten[g] < 0 && g !== s.fly[0] && g !== s.fly[1];

function legal(s, p = s.turn) {
  if (s.winner >= 0) return [];
  if (s.phase === 'place') return p === s.turn ? [...Array(s.n).keys()].filter((g) => g !== s.fly[0] && g !== s.fly[1]) : [];
  if (s.fly[p] < 0) return [];
  return s.board.adj[s.fly[p]].filter((g) => free(s, g));
}
const isLegal = (s, g) => Number.isInteger(g) && legal(s).includes(g);

// Mutates s. Returns true if the move was applied.
function apply(s, g) {
  if (!isLegal(s, g)) return false;
  const p = s.turn;
  s.from = s.fly[p] >= 0 ? s.fly[p] : null;
  if (s.phase === 'place') {
    s.fly[p] = g;
    if (s.fly[1 - p] >= 0) s.phase = 'move'; // the second placer moves first
    else s.turn = 1 - p;
  } else {
    s.eaten[s.fly[p]] = p;
    s.fly[p] = g;
    s.turn = 1 - p;
  }
  s.last = { p, g };
  s.ply++;
  if (s.phase === 'move' && !legal(s).length) s.winner = 1 - s.turn;
  return true;
}
const isOver = (s) => s.winner >= 0;
const eatenBy = (s, p) => s.eaten.reduce((n, e) => n + (e === p), 0);

// ---------- analysis ----------
function bfs(adj, eaten, fly, src, other) {
  const n = eaten.length, d = new Int16Array(n).fill(-1);
  d[src] = 0;
  const q = [src];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const v of adj[u]) if (d[v] < 0 && eaten[v] < 0 && v !== other && v !== src) { d[v] = d[u] + 1; q.push(v); }
  }
  return d;
}

// Longest simple path (in moves) from src over free grapes. Exact within a node budget, else a lower bound.
function longestPath(adj, eaten, src, other, budget = 20000) {
  const n = eaten.length, used = new Uint8Array(n);
  used[src] = 1;
  if (other >= 0) used[other] = 1;
  for (let i = 0; i < n; i++) if (eaten[i] >= 0) used[i] = 1;
  // upper bound: size of the reachable region
  let reach = 0;
  { const seen = used.slice(), q = [src]; for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (!seen[v]) { seen[v] = 1; reach++; q.push(v); } }
  let best = 0, nodes = 0;
  const dfs = (u, len) => {
    if (len > best) best = len;
    if (best >= reach || ++nodes > budget) return;
    // visit neighbours with fewest onward exits first (hugging walls finds long paths quickly)
    const nb = adj[u].filter((v) => !used[v]);
    nb.sort((a, b) => adj[a].filter((x) => !used[x]).length - adj[b].filter((x) => !used[x]).length);
    for (const v of nb) { used[v] = 1; dfs(v, len + 1); used[v] = 0; if (best >= reach || nodes > budget) return; }
  };
  dfs(src, 0);
  return best;
}

// Summary used by the AI evaluation and the characters' reactions.
function assess(s) {
  const { adj } = s.board, [a, b] = s.fly;
  if (a < 0 || b < 0) return null;
  const da = bfs(adj, s.eaten, s.fly, a, b), db = bfs(adj, s.eaten, s.fly, b, a);
  let terr = [0, 0], shared = false;
  for (let i = 0; i < s.n; i++) {
    if (i === a || i === b) continue;
    const x = da[i], y = db[i];
    if (x > 0 && y > 0) shared = true;
    if (x > 0 && (y < 0 || x < y)) terr[0]++;
    else if (y > 0 && (x < 0 || y < x)) terr[1]++;
  }
  const mob = [legal(s, 0).length, legal(s, 1).length];
  const out = { sep: !shared, terr, mob };
  if (!shared) out.len = [longestPath(adj, s.eaten, a, b, 4000), longestPath(adj, s.eaten, b, a, 4000)];
  return out;
}

// ---------- AI ----------
const WIN = 100000;
const pick = (arr, R = Math.random) => arr[Math.floor(R() * arr.length)];

function makeSearch(s, deadline) {
  const adj = s.board.adj, eaten = Int8Array.from(s.eaten), fly = s.fly.slice();
  let turn = s.turn, nodes = 0, aborted = false;
  const moves = (p) => adj[fly[p]].filter((g) => eaten[g] < 0 && g !== fly[1 - p]);

  function evaluate() {
    const me = turn, op = 1 - turn;
    const dm = bfs(adj, eaten, fly, fly[me], fly[op]), dop = bfs(adj, eaten, fly, fly[op], fly[me]);
    let t = 0, shared = false;
    for (let i = 0; i < eaten.length; i++) {
      const x = dm[i], y = dop[i];
      if (x <= 0 && y <= 0) continue;
      if (x > 0 && y > 0) shared = true;
      if (x > 0 && (y < 0 || x <= y)) t++; // the side to move wins races of equal length
      else t--;
    }
    if (!shared) {
      const lm = longestPath(adj, eaten, fly[me], fly[op], 3000), lo = longestPath(adj, eaten, fly[op], fly[me], 3000);
      // separated: the side to move runs out first unless its path is strictly longer
      return (lm > lo ? WIN / 2 : -WIN / 2) + (lm - lo) * 50;
    }
    return t * 10 + (moves(me).length - moves(op).length) * 3;
  }

  function negamax(depth, alpha, beta, ply) {
    if ((++nodes & 255) === 0 && Date.now() > deadline) aborted = true;
    if (aborted) return 0;
    const ms = moves(turn);
    if (!ms.length) return -WIN + ply;
    if (depth === 0) return evaluate();
    let best = -Infinity;
    for (const g of ms) {
      const p = turn, from = fly[p];
      eaten[from] = p; fly[p] = g; turn = 1 - p;
      const v = -negamax(depth - 1, -beta, -alpha, ply + 1);
      turn = p; fly[p] = from; eaten[from] = -1;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Root search with iterative deepening; returns [{g, v}] sorted best first from the deepest finished pass.
  function root(maxDepth) {
    let order = moves(turn), scored = order.map((g) => ({ g, v: 0 }));
    for (let depth = 1; depth <= maxDepth; depth++) {
      const cur = [];
      for (const g of order) {
        const p = turn, from = fly[p];
        eaten[from] = p; fly[p] = g; turn = 1 - p;
        const v = -negamax(depth - 1, -Infinity, Infinity, 1);
        turn = p; fly[p] = from; eaten[from] = -1;
        if (aborted) break;
        cur.push({ g, v });
      }
      if (aborted) break;
      cur.sort((a, b) => b.v - a.v);
      scored = cur;
      order = cur.map((x) => x.g);
      if (Math.abs(cur[0].v) > WIN / 4 && depth >= 2) break; // outcome known
    }
    return scored;
  }

  return { root, evaluate, get aborted() { return aborted; } };
}

function separated(s) {
  const a = assess(s);
  return a && a.sep;
}

// Best move when the flies can no longer meet: follow the longest path.
function endgameMove(s) {
  const p = s.turn, { adj } = s.board;
  let best = null, bv = -1;
  for (const g of legal(s)) {
    const e = s.eaten.slice(); e[s.fly[p]] = p;
    const v = longestPath(adj, e, g, s.fly[1 - p], 30000);
    if (v > bv) { bv = v; best = g; }
  }
  return best;
}

function placeFirst(s, level) {
  const { adj } = s.board;
  const cand = legal(s);
  if (level === 'easy') return pick(cand);
  // prefer central, well-connected grapes: high degree, small average distance to the rest
  const score = (g) => {
    const d = bfs(adj, s.eaten, s.fly, g, -1);
    let sum = 0; for (const x of d) if (x > 0) sum += x;
    return adj[g].length * 4 - sum / s.n * 6;
  };
  const ranked = cand.map((g) => ({ g, v: score(g) })).sort((a, b) => b.v - a.v);
  return pick(ranked.slice(0, level === 'hard' ? 3 : 6)).g;
}

function placeSecond(s, level, budget) {
  const cand = legal(s);
  if (level === 'easy') {
    const near = cand.filter((g) => s.board.adj[g].length >= 3);
    return pick(near.length ? near : cand);
  }
  const depth = level === 'hard' ? 5 : 2;
  const deadline = Date.now() + budget;
  let best = [], bv = -Infinity;
  for (const [i, g] of cand.entries()) {
    const x = clone(s); apply(x, g);
    if (x.winner >= 0) { const v = x.winner === s.turn ? WIN : -WIN; if (v > bv) { bv = v; best = [g]; } continue; }
    // after placing, it's our move: search from our perspective
    const slice = Math.max(8, (deadline - Date.now()) / (cand.length - i));
    const sr = makeSearch(x, Date.now() + slice).root(depth);
    const v = sr.length ? sr[0].v : -WIN;
    if (v > bv + 2) { bv = v; best = [g]; } else if (v >= bv - 2) best.push(g);
  }
  return pick(best);
}

// level: 'easy' | 'normal' | 'hard'. opts.time: thinking budget in ms (hard).
function aiMove(s, level = 'normal', opts = {}) {
  const ms = legal(s);
  if (!ms.length) return null;
  if (s.phase === 'place') return s.fly[1 - s.turn] < 0 ? placeFirst(s, level) : placeSecond(s, level, opts.time ?? 600);
  if (ms.length === 1) return ms[0];
  const p = s.turn, adj = s.board.adj;
  const onward = (g) => adj[g].filter((x) => x !== s.fly[p] && free(s, x)).length;
  if (level === 'easy') {
    // wander: usually avoid an instant dead end, otherwise anything goes
    const ok = ms.filter((g) => onward(g) > 0);
    if (ok.length && Math.random() < 0.8) {
      if (Math.random() < 0.5) return ok.reduce((a, b) => (onward(b) > onward(a) ? b : a));
      return pick(ok);
    }
    return pick(ms);
  }
  if (separated(s)) return endgameMove(s);
  const time = opts.time ?? (level === 'hard' ? 700 : 150);
  const depth = level === 'hard' ? 40 : 3;
  const res = makeSearch(s, Date.now() + time).root(depth);
  if (!res.length) return pick(ms);
  const top = res.filter((x) => x.v >= res[0].v - (level === 'hard' ? 0 : 4));
  return pick(top).g;
}

export const GR = {
  W, H, SIZES, generate, cells, create, clone, legal, isLegal, apply, isOver, eatenBy, assess, aiMove, longestPath,
};
