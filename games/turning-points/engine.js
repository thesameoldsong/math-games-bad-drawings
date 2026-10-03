// Turning Points: pure game logic + AI. No DOM.
//
// Square N×N board, cells indexed i = r*N + c. A piece faces one of four directions:
// 0 = up, 1 = right, 2 = down, 3 = left (clockwise order, so a 90° clockwise turn is d → d+1).
// Pieces belong to nobody. Player 0 (blue) owns the LEFT edge, player 1 (red) the RIGHT edge:
// at the end a piece facing left is a point for blue, facing right a point for red.
//
// Placing a piece facing an occupied neighbour turns that neighbour clockwise; if it now faces
// another piece, that one turns too, and so on until a piece faces an empty cell or the edge.

const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];
const EMPTY = -1;
// Every chain ends: if some fish were hit forever, it would face all four sides in turn, so its
// neighbours would be hit forever too, and so on out to a fish on the border, which sooner or
// later faces the edge and stops the chain. So the loop in place() needs no cap.

function create(N = 4, first = 0) {
  return { N, b: Array(N * N).fill(EMPTY), turn: first, first, ply: 0, last: null, chain: [] };
}
const clone = (s) => ({ ...s, b: s.b.slice(), chain: s.chain.slice(), last: s.last && { ...s.last } });

function neighbor(N, i, d) {
  const r = Math.floor(i / N) + DR[d], c = (i % N) + DC[d];
  return r < 0 || c < 0 || r >= N || c >= N ? -1 : r * N + c;
}

const isLegal = (s, m) =>
  !!m && Number.isInteger(m.i) && Number.isInteger(m.d) && m.i >= 0 && m.i < s.N * s.N && m.d >= 0 && m.d < 4 && s.b[m.i] === EMPTY;

function legalMoves(s) {
  const out = [];
  for (let i = 0; i < s.b.length; i++) if (s.b[i] === EMPTY) for (let d = 0; d < 4; d++) out.push({ i, d });
  return out;
}

// Low-level: place + run the chain on board array b. Returns the list of turned cells in order
// (a cell may appear several times). Used by the search with an explicit undo.
function place(b, N, i, d) {
  b[i] = d;
  const turned = [];
  let j = neighbor(N, i, d);
  while (j >= 0 && b[j] !== EMPTY) {
    b[j] = (b[j] + 1) & 3;
    turned.push(j);
    j = neighbor(N, j, b[j]);
  }
  return turned;
}
function unplace(b, i, turned) {
  for (let k = turned.length - 1; k >= 0; k--) b[turned[k]] = (b[turned[k]] + 3) & 3;
  b[i] = EMPTY;
}

// Mutates s. Returns the chain: cells turned, in order.
function apply(s, m) {
  const chain = place(s.b, s.N, m.i, m.d);
  s.last = { i: m.i, d: m.d };
  s.chain = chain;
  s.ply++;
  s.turn = 1 - s.turn;
  return chain;
}

function scoreOf(b) {
  let blue = 0, red = 0;
  for (const v of b) { if (v === 3) blue++; else if (v === 1) red++; }
  return [blue, red];
}
const score = (s) => scoreOf(s.b);
const isOver = (s) => s.ply >= s.N * s.N;
function winner(s) {
  const [a, b] = score(s);
  return a === b ? -1 : a > b ? 0 : 1;
}

// ---------- AI ----------
// Score difference from the point of view of player p; the search sees the tactics.
const evalFor = (b, p) => {
  const [blue, red] = scoreOf(b);
  return p === 0 ? blue - red : red - blue;
};

function negamax(b, N, p, depth, alpha, beta, empties, deadline, stats) {
  if (empties === 0 || depth === 0) return evalFor(b, p);
  if ((++stats.nodes & 1023) === 0 && Date.now() > deadline) stats.timeout = true;
  if (stats.timeout) return 0;
  let best = -Infinity;
  const moves = orderedMoves(b, N, p);
  for (const [i, d] of moves) {
    const turned = place(b, N, i, d);
    const v = -negamax(b, N, 1 - p, depth - 1, -beta, -alpha, empties - 1, deadline, stats);
    unplace(b, i, turned);
    if (stats.timeout) return 0;
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

// Cheap 1-ply ordering: moves that gain the most for p first. No move is pruned: even a fish
// facing the opponent's shore can be the best move (a later chain may turn it), so pruning
// would make the exact endgame search wrong.
function orderedMoves(b, N, p) {
  const out = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== EMPTY) continue;
    for (let d = 0; d < 4; d++) {
      const turned = place(b, N, i, d);
      const v = evalFor(b, p);
      unplace(b, i, turned);
      out.push([i, d, v]);
    }
  }
  out.sort((x, y) => y[2] - x[2]);
  return out;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// level: easy | normal | hard. Returns a legal move {i, d}.
function aiMove(s, level = 'normal', ms = 700) {
  const b = s.b.slice(), N = s.N, p = s.turn;
  const empties = b.filter((v) => v === EMPTY).length;
  const all = legalMoves(s);
  if (!all.length) return null;

  if (level === 'easy') {
    // Half the time a random move, otherwise the best immediate gain.
    if (Math.random() < 0.5) return pick(all);
    return bestAtDepth(b, N, p, 1, empties, Infinity).move;
  }
  if (level === 'normal') return bestAtDepth(b, N, p, 2, empties, Infinity).move;

  // hard: iterative deepening under a time budget; exact once few cells are left.
  const deadline = Date.now() + ms;
  let best = bestAtDepth(b, N, p, 2, empties, Infinity).move;
  for (let depth = 3; depth <= empties; depth++) {
    const r = bestAtDepth(b, N, p, depth, empties, deadline);
    if (r.timeout) break;
    best = r.move;
    if (depth >= empties) break;
  }
  return best;
}

function bestAtDepth(b, N, p, depth, empties, deadline) {
  const stats = { nodes: 0, timeout: false };
  const moves = orderedMoves(b, N, p);
  let bestV = -Infinity, bests = [];
  let alpha = -Infinity;
  for (const [i, d] of moves) {
    const turned = place(b, N, i, d);
    // Search with a window that still lets equal moves tie, for variety.
    const v = -negamax(b, N, 1 - p, depth - 1, -Infinity, -(alpha - 1), empties - 1, deadline, stats);
    unplace(b, i, turned);
    if (stats.timeout) return { timeout: true };
    if (v > bestV) { bestV = v; bests = [{ i, d }]; }
    else if (v === bestV) bests.push({ i, d });
    if (v > alpha) alpha = v;
  }
  return { move: pick(bests), value: bestV };
}

export const TP = {
  DR, DC, EMPTY,
  create, clone, neighbor, isLegal, legalMoves, apply, place, unplace,
  score, scoreOf, isOver, winner, aiMove, evalFor,
};
