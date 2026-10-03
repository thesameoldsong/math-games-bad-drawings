// Prophecies — pure rules + AI (no DOM).
//
// Board: R rows × C columns, cells[i] = 0 (empty) | -1 (X) | v ≥ 1 (a prophecy), owner[i] = 0 | 1 | -1 (auto X).
// A move is { i, v }: v = -1 writes an X, v = 1..N writes a prophecy (N = max(R, C)).
// No number may repeat in a row or a column. After every move, empty cells that can no longer take any
// number are crossed out automatically (free bookkeeping, not a turn). When the board is full, each row
// and column scores: if it holds a prophecy equal to its count of numbers (variant 'x': count of X's),
// that prophecy's owner gets that many points.

const X = -1;

function create(R = 5, C = 5, { variant = 'classic', first = 0 } = {}) {
  const N = Math.max(R, C);
  return {
    R, C, N, variant,
    cells: new Array(R * C).fill(0),
    owner: new Array(R * C).fill(-1),
    rowMask: new Array(R).fill(0),
    colMask: new Array(C).fill(0),
    turn: first, first, moves: 0, last: null,
  };
}

const clone = (s) => ({
  ...s, cells: s.cells.slice(), owner: s.owner.slice(), rowMask: s.rowMask.slice(), colMask: s.colMask.slice(),
  last: s.last && { ...s.last, auto: s.last.auto.slice() },
});

// Highest number allowed. In the X variant a prophecy occupies a cell itself, so at most N-1 X's can join it.
const maxValue = (s) => (s.variant === 'x' ? s.N - 1 : s.N);
const fullMask = (s) => ((1 << (maxValue(s) + 1)) - 2);
const freeMask = (s, i) => fullMask(s) & ~(s.rowMask[(i / s.C) | 0] | s.colMask[i % s.C]);

function legalValues(s, i) {
  if (s.cells[i] !== 0) return [];
  const m = freeMask(s, i), out = [];
  for (let v = 1; v <= maxValue(s); v++) if (m & (1 << v)) out.push(v);
  return out;
}

function legal(s, m) {
  if (!m || !Number.isInteger(m.i) || m.i < 0 || m.i >= s.cells.length || s.cells[m.i] !== 0) return false;
  if (m.v === X) return true;
  return Number.isInteger(m.v) && m.v >= 1 && m.v <= maxValue(s) && !!(freeMask(s, m.i) & (1 << m.v));
}

function moves(s) {
  const out = [];
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== 0) continue;
    out.push({ i, v: X });
    const m = freeMask(s, i);
    for (let v = 1; v <= maxValue(s); v++) if (m & (1 << v)) out.push({ i, v });
  }
  return out;
}

// Applies a legal move; returns the indices crossed out automatically.
function apply(s, m) {
  const { i, v } = m, r = (i / s.C) | 0, c = i % s.C;
  s.cells[i] = v;
  s.owner[i] = s.turn;
  const auto = [];
  if (v > 0) {
    s.rowMask[r] |= 1 << v;
    s.colMask[c] |= 1 << v;
    // only cells sharing the row or column can have lost options
    for (let cc = 0; cc < s.C; cc++) checkDead(s, r * s.C + cc, auto);
    for (let rr = 0; rr < s.R; rr++) checkDead(s, rr * s.C + c, auto);
  }
  s.last = { i, v, p: s.turn, auto };
  s.turn = 1 - s.turn;
  s.moves++;
  return auto;
}
function checkDead(s, j, auto) {
  if (s.cells[j] === 0 && !freeMask(s, j)) { s.cells[j] = X; s.owner[j] = -1; auto.push(j); }
}

const isOver = (s) => s.cells.every((v) => v !== 0);

// All rows then all columns, each as a list of cell indices (cached per board size).
const LINES = new Map();
function lines(s) {
  const key = s.R * 16 + s.C;
  if (LINES.has(key)) return LINES.get(key);
  const list = [];
  for (let r = 0; r < s.R; r++) list.push({ kind: 'r', idx: r, cells: Array.from({ length: s.C }, (_, c) => r * s.C + c) });
  for (let c = 0; c < s.C; c++) list.push({ kind: 'c', idx: c, cells: Array.from({ length: s.R }, (_, r) => r * s.C + c) });
  LINES.set(key, list);
  return list;
}

function lineStats(s, L) {
  let k = 0, x = 0, e = 0;
  for (const i of L.cells) { const v = s.cells[i]; if (v > 0) k++; else if (v === X) x++; else e++; }
  return { k, x, e, target: s.variant === 'x' ? x : k };
}

// Which counts can this line still end with? (target = numbers, or X's in the X variant)
function lineRange(s, L) {
  const { k, x, e } = lineStats(s, L);
  return s.variant === 'x' ? [x, x + e] : [k, k + e];
}

// Final (or "if it ended now") scoring: points per player + per-line details.
function score(s) {
  const pts = [0, 0], out = [];
  for (const L of lines(s)) {
    const { target } = lineStats(s, L);
    let hit = -1;
    for (const i of L.cells) if (s.cells[i] === target && target > 0) hit = i;
    const owner = hit >= 0 ? s.owner[hit] : -1;
    if (owner >= 0) pts[owner] += target;
    out.push({ kind: L.kind, idx: L.idx, count: target, hit, owner });
  }
  return { pts, lines: out };
}

// Can the prophecy in cell i still come true in its row or its column?
function alive(s, i) {
  const v = s.cells[i];
  if (!(v > 0)) return false;
  const r = (i / s.C) | 0, c = i % s.C, L = lines(s);
  for (const line of [L[r], L[s.R + c]]) {
    const [lo, hi] = lineRange(s, line);
    if (v >= lo && v <= hi) return true;
  }
  return false;
}
function aliveCount(s, p) {
  let n = 0;
  for (let i = 0; i < s.cells.length; i++) if (s.owner[i] === p && alive(s, i)) n++;
  return n;
}

// ---------------- AI ----------------
// Static estimate: in every line, each still-empty cell ends up a number about half the time,
// so the final count is binomial; a prophecy is worth value × P(count = value).
const BINOM = (() => {
  const t = [];
  for (let n = 0; n <= 16; n++) {
    t.push([]);
    for (let j = 0; j <= n; j++) {
      let c = 1;
      for (let a = 0; a < j; a++) c = (c * (n - a)) / (a + 1);
      t[n].push(c / 2 ** n);
    }
  }
  return t;
})();

// Evaluation from player p's point of view.
function evaluate(s, p) {
  let total = 0;
  const xv = s.variant === 'x';
  for (const L of lines(s)) {
    let k = 0, x = 0, e = 0;
    for (const i of L.cells) { const v = s.cells[i]; if (v > 0) k++; else if (v === X) x++; else e++; }
    for (const i of L.cells) {
      const v = s.cells[i];
      if (!(v > 0)) continue;
      // number of empties that must become numbers for this prophecy to be right
      const j = xv ? x + e - v : v - k;
      if (j < 0 || j > e) continue;
      const w = v * BINOM[e][j];
      total += s.owner[i] === p ? w : -w;
    }
  }
  return total;
}

function rand(n) { return Math.floor(Math.random() * n); }

function greedy(s, list, noise = 0) {
  const p = s.turn;
  let best = [], bv = -Infinity;
  for (const m of list) {
    const t = clone(s);
    apply(t, m);
    const v = (isOver(t) ? exactDiff(t, p) : evaluate(t, p)) + (noise ? Math.random() * noise : 0);
    if (v > bv + 1e-9) { bv = v; best = [m]; } else if (Math.abs(v - bv) <= 1e-9) best.push(m);
  }
  return best[rand(best.length)];
}
const exactDiff = (s, p) => { const { pts } = score(s); return pts[p] - pts[1 - p]; };

function emptyCount(s) { let n = 0; for (const v of s.cells) if (v === 0) n++; return n; }

// Exact minimax for small endgames (score difference for the side to move). null when over budget.
function solve(s, budget = 60000) {
  let nodes = 0;
  const memo = new Map();
  function neg(t, alpha, beta) {
    if (isOver(t)) return exactDiff(t, t.turn);
    if (++nodes > budget) throw 0;
    const key = t.cells.join(',') + '|' + t.owner.join('') + t.turn;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let best = -Infinity;
    const alpha0 = alpha;
    const list = moves(t);
    // order: moves that look best statically first
    const scored = list.map((m) => { const u = clone(t); apply(u, m); return [evaluate(u, t.turn), u]; }).sort((a, b) => b[0] - a[0]);
    for (const [, u] of scored) {
      const v = -neg(u, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (best > alpha0 && best < beta) memo.set(key, best); // only store exact values
    return best;
  }
  try {
    let best = null, bv = -Infinity;
    const list = moves(s);
    const scored = list.map((m) => { const u = clone(s); apply(u, m); return [evaluate(u, s.turn), u, m]; }).sort((a, b) => b[0] - a[0]);
    for (const [, u, m] of scored) {
      const v = -neg(u, -Infinity, -bv);
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  } catch (e) {
    if (e === 0) return null;
    throw e;
  }
}

// Two-ply search: our move, then the opponent's best static reply.
function twoPly(s, list, width = 24) {
  const p = s.turn;
  const first = list.map((m) => { const t = clone(s); apply(t, m); return { m, t, v: isOver(t) ? exactDiff(t, p) : evaluate(t, p) }; })
    .sort((a, b) => b.v - a.v).slice(0, width);
  let best = [], bv = -Infinity;
  for (const { m, t } of first) {
    let worst;
    if (isOver(t)) worst = exactDiff(t, p);
    else {
      worst = Infinity;
      for (const r of moves(t)) {
        const u = clone(t);
        apply(u, r);
        const v = isOver(u) ? exactDiff(u, p) : evaluate(u, p);
        if (v < worst) worst = v;
        if (worst <= bv - 1e-9) break; // can't beat what we have
      }
    }
    if (worst > bv + 1e-9) { bv = worst; best = [m]; } else if (Math.abs(worst - bv) <= 1e-9) best.push(m);
  }
  return best[rand(best.length)];
}

function aiMove(s, level = 'normal') {
  const list = moves(s);
  if (!list.length) return null;
  if (level === 'easy') {
    if (Math.random() < 0.35) return greedy(s, list, 1.5);
    // a casual player: crosses out now and then, otherwise writes some legal number
    const nums = list.filter((m) => m.v > 0);
    if (!nums.length || Math.random() < 0.3) { const xs = list.filter((m) => m.v === X); return xs[rand(xs.length)]; }
    return nums[rand(nums.length)];
  }
  if (level === 'normal') return greedy(s, list, 0.35);
  // hard
  if (emptyCount(s) <= 10) {
    const m = solve(s);
    if (m) return m;
  }
  return twoPly(s, list);
}

export const PRO = {
  X, create, clone, maxValue, legalValues, legal, moves, apply, isOver, lines, lineStats, lineRange,
  score, alive, aliveCount, evaluate, aiMove, solve,
};
