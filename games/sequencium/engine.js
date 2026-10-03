// Sequencium: pure game logic + AI. No DOM.
//
// Board: n×n cells, index i = r*n + c. own[i]: -1 empty, -2 blocked (7×7 centre), 0/1 owner.
// val[i]: the number written there; from[i]: the cell it grew out of (-1 for the starting 1).
// A move {from, to}: from is one of the mover's numbers, to is an empty neighbour (8 directions);
// to receives val[from] + 1. The board is played until nobody can move; the highest number wins.
//
// Turn order ("order"): 'alt'    — plain alternation A B A B …           (the book's main rules)
//                       'double' — A, then B B, A A, B B …               (the book's anti-copycat fix)
//                       'tm'     — Thue–Morse: A B B A B A A B …         (the book's "fairest" order)
// A player who has no move simply loses that slot; the other keeps going until the board is full.

const EMPTY = -1, BLOCK = -2;

function slotOwner(order, slot) {
  if (order === 'double') return slot === 0 ? 0 : ((slot - 1) >> 1) & 1 ? 0 : 1;
  if (order === 'tm') { let k = slot, b = 0; while (k) { b ^= k & 1; k >>= 1; } return b; }
  return slot & 1;
}
const slotPlayer = (s, slot) => slotOwner(s.order, slot) ^ s.first;

function create({ size = 6, order = 'alt', first = 0 } = {}) {
  const n = size, N = n * n;
  const s = {
    n, order, first, own: Array(N).fill(EMPTY), val: Array(N).fill(0), from: Array(N).fill(-1),
    slot: 0, ply: 0, turn: first, last: -1, skipped: -1, over: false, max: [3, 3],
  };
  const put = (r, c, p, v, f) => { const i = r * n + c; s.own[i] = p; s.val[i] = v; s.from[i] = f; return i; };
  let a = -1, b = -1;
  for (let k = 0; k < 3; k++) {
    a = put(k, k, 0, k + 1, a);
    b = put(n - 1 - k, n - 1 - k, 1, k + 1, b);
  }
  if (n % 2) s.own[(n * n - 1) / 2] = BLOCK; // odd board: the centre would favour the first player
  return s;
}

const clone = (s) => ({ ...s, own: s.own.slice(), val: s.val.slice(), from: s.from.slice(), max: s.max.slice() });

// Neighbour lists are cached per board size.
const NB = {};
function neighbours(n) {
  if (NB[n]) return NB[n];
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const a = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) a.push(rr * n + cc);
    }
    out.push(a);
  }
  return (NB[n] = out);
}

// The best source for writing into `to`: the mover's largest neighbouring number
// (ties: prefer a straight step over a diagonal one, it reads nicer).
function bestFrom(s, p, to) {
  const n = s.n;
  let best = -1, bv = -1, bd = 0;
  for (const j of neighbours(n)[to]) {
    if (s.own[j] !== p) continue;
    const diag = (Math.floor(j / n) !== Math.floor(to / n)) && (j % n !== to % n) ? 1 : 0;
    if (s.val[j] > bv || (s.val[j] === bv && diag < bd)) { best = j; bv = s.val[j]; bd = diag; }
  }
  return best;
}

// One move per reachable empty cell, always from the largest neighbour: writing a smaller number
// into the same cell is never better, so the AI doesn't need those.
function legalMoves(s, p = s.turn) {
  const out = [];
  if (s.over) return out;
  for (let i = 0; i < s.own.length; i++) {
    if (s.own[i] !== EMPTY) continue;
    const f = bestFrom(s, p, i);
    if (f >= 0) out.push({ from: f, to: i });
  }
  return out;
}
function hasMove(s, p) {
  const nb = neighbours(s.n);
  for (let i = 0; i < s.own.length; i++) {
    if (s.own[i] !== EMPTY) continue;
    for (const j of nb[i]) if (s.own[j] === p) return true;
  }
  return false;
}

function isLegal(s, m) {
  if (s.over || !m || !Number.isInteger(m.from) || !Number.isInteger(m.to)) return false;
  const N = s.own.length;
  if (m.from < 0 || m.from >= N || m.to < 0 || m.to >= N) return false;
  return s.own[m.from] === s.turn && s.own[m.to] === EMPTY && neighbours(s.n)[m.to].includes(m.from);
}

// Mutates s. Assumes the move is legal.
function apply(s, m) {
  const p = s.turn;
  s.own[m.to] = p; s.val[m.to] = s.val[m.from] + 1; s.from[m.to] = m.from;
  if (s.val[m.to] > s.max[p]) s.max[p] = s.val[m.to];
  s.last = m.to; s.ply++; s.slot++; s.skipped = -1;
  advance(s);
  return s;
}

// Find who moves next, skipping slots of a player who is boxed in.
function advance(s) {
  const can = [hasMove(s, 0), hasMove(s, 1)];
  if (!can[0] && !can[1]) { s.over = true; return; }
  let p = slotPlayer(s, s.slot);
  if (!can[p]) {
    s.skipped = p;
    while (slotPlayer(s, s.slot) === p) s.slot++;
    p = 1 - p;
  }
  s.turn = p;
}

const isOver = (s) => s.over;
// -1 = tie
function winner(s) {
  if (s.max[0] === s.max[1]) return -1;
  return s.max[0] > s.max[1] ? 0 : 1;
}
// Will the player to move also get the next slot?
const movesAgain = (s) => !s.over && slotPlayer(s, s.slot + 1) === s.turn;
const emptyCount = (s) => s.own.reduce((k, o) => k + (o === EMPTY), 0);

// ---------- evaluation ----------
// Territory: every empty cell goes to whoever can reach it in fewer steps (ties are shared).
// A player's outlook = the best "number at the edge of a region + cells of that region they can fill",
// i.e. roughly how high their snake could still climb, but never below their current record.
function outlook(s) {
  const n = s.n, N = n * n, nb = neighbours(n);
  const dist = [new Array(N).fill(99), new Array(N).fill(99)];
  for (const p of [0, 1]) {
    const d = dist[p], q = [];
    for (let i = 0; i < N; i++) if (s.own[i] === p) { d[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h];
      for (const j of nb[i]) if (s.own[j] === EMPTY && d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); }
    }
  }
  const terr = [0, 0], pot = [s.max[0], s.max[1]];
  const share = new Array(N).fill(null); // [w0, w1] for empty reachable cells
  for (let i = 0; i < N; i++) {
    if (s.own[i] !== EMPTY) continue;
    const a = dist[0][i], b = dist[1][i];
    if (a === 99 && b === 99) continue;
    share[i] = a < b ? [1, 0] : b < a ? [0, 1] : [0.5, 0.5];
    terr[0] += share[i][0]; terr[1] += share[i][1];
  }
  // regions of empty cells that a player has any share in, scored from their largest bordering number
  for (const p of [0, 1]) {
    const seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (seen[i] || !share[i] || !share[i][p]) continue;
      let size = 0, top = 0;
      const q = [i]; seen[i] = 1;
      for (let h = 0; h < q.length; h++) {
        const k = q[h];
        size += share[k][p];
        for (const j of nb[k]) {
          if (s.own[j] === p && s.val[j] > top) top = s.val[j];
          if (!seen[j] && share[j] && share[j][p]) { seen[j] = 1; q.push(j); }
        }
      }
      if (top && top + size > pot[p]) pot[p] = top + size;
    }
  }
  return { pot, terr };
}

function evaluate(s, me) {
  if (s.over) return (s.max[me] - s.max[1 - me]) * 1000;
  const { pot, terr } = outlook(s);
  return (pot[me] - pot[1 - me]) * 10 + (terr[me] - terr[1 - me]) * 2 + (s.max[me] - s.max[1 - me]);
}

// ---------- search ----------
function orderMoves(s, moves, me) {
  return moves
    .map((m) => { const x = clone(s); apply(x, m); return { m, x, v: evaluate(x, me) }; })
    .sort((a, b) => (s.turn === me ? b.v - a.v : a.v - b.v));
}

function search(s, depth, alpha, beta, me, deadline) {
  if (s.over || depth === 0) return evaluate(s, me);
  if (Date.now() > deadline) throw TIMEOUT;
  const maxing = s.turn === me;
  const kids = depth > 1 ? orderMoves(s, legalMoves(s), me) : legalMoves(s).map((m) => ({ m }));
  let best = maxing ? -Infinity : Infinity;
  for (const k of kids) {
    let x = k.x;
    if (!x) { x = clone(s); apply(x, k.m); }
    const v = search(x, depth - 1, alpha, beta, me, deadline);
    if (maxing) { if (v > best) best = v; if (v > alpha) alpha = v; }
    else { if (v < best) best = v; if (v < beta) beta = v; }
    if (alpha >= beta) break;
  }
  return best;
}
const TIMEOUT = new Error('timeout');

const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

// level: easy | normal | hard. Returns a legal move (or null when the side to move can't move).
function aiMove(s, level = 'normal', { rnd = Math.random, budget } = {}) {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  const me = s.turn;
  if (moves.length === 1) return moves[0];
  if (level === 'easy') {
    // short-sighted: sometimes a random move, otherwise one of the better-looking third (no lookahead)
    if (rnd() < 0.35) return pick(moves, rnd);
    const scored = orderMoves(s, moves, me);
    const top = scored.slice(0, Math.max(1, Math.ceil(scored.length / 3)));
    return pick(top, rnd).m;
  }
  const maxDepth = level === 'hard' ? 12 : 2;
  const deadline = Date.now() + (budget ?? (level === 'hard' ? 900 : 400));
  let root = orderMoves(s, moves, me);
  let bestMove = root[0].m;
  for (let depth = 2; depth <= maxDepth; depth++) {
    try {
      const scored = [];
      let alpha = -Infinity;
      for (const k of root) {
        // children of the root are searched with the root's sign: the next mover may be me again
        // (alpha - 1: evals are integers, so a move that ties the best is still scored exactly)
        const v = search(k.x, depth - 1, alpha - 1, Infinity, me, deadline);
        scored.push({ ...k, v });
        if (v > alpha) alpha = v;
      }
      scored.sort((a, b) => b.v - a.v);
      const bestV = scored[0].v;
      const ties = scored.filter((k) => k.v === bestV);
      bestMove = pick(ties, rnd).m;
      root = scored;
      if (depth >= emptyCount(s)) break;
    } catch (e) {
      if (e !== TIMEOUT) throw e;
      break;
    }
  }
  return bestMove;
}

export const SEQ = {
  EMPTY, BLOCK, create, clone, legalMoves, hasMove, isLegal, apply, isOver, winner, movesAgain,
  bestFrom, neighbours, slotOwner, outlook, aiMove, emptyCount,
};
