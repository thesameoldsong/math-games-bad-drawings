// Black Hole: pure game logic + AI. No DOM.
// A triangle of circles, `rows` rows (row r has r+1 circles). Players alternately write 1, 1, 2, 2, 3, 3…
// in empty circles. When one circle is left, it becomes the black hole and swallows its neighbours;
// whoever loses the smaller sum wins.

const SIZES = [5, 6, 9];                 // rows; total circles must be odd so exactly one stays empty
const idx = (r, c) => (r * (r + 1)) / 2 + c;

const geomCache = {};
function geom(rows) {
  if (geomCache[rows]) return geomCache[rows];
  const rc = [], nb = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c <= r; c++) rc.push([r, c]);
  for (const [r, c] of rc) {
    const out = [];
    for (const [dr, dc] of [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, 0], [1, 1]]) {
      const R = r + dr, C = c + dc;
      if (R >= 0 && R < rows && C >= 0 && C <= R) out.push(idx(R, C));
    }
    nb.push(out);
  }
  return (geomCache[rows] = { n: rc.length, rc, nb });
}

function create(rows = 6, first = 0) {
  const { n } = geom(rows);
  if (n % 2 === 0) throw new Error('rows must give an odd number of circles');
  return {
    rows, n, first,
    owner: Array(n).fill(-1),   // -1 empty, else player 0/1
    val: Array(n).fill(0),
    turn: first, moves: 0, last: -1,
    hole: -1, lost: [0, 0], winner: -1,   // winner -1 while playing, 2 = tie
  };
}
const clone = (s) => ({ ...s, owner: s.owner.slice(), val: s.val.slice(), lost: s.lost.slice() });
const maxNumber = (s) => (s.n - 1) / 2;
const nextNumber = (s) => Math.floor(s.moves / 2) + 1;
const neighbors = (s, i) => geom(s.rows).nb[i];
const rowCol = (s, i) => geom(s.rows).rc[i];
const isOver = (s) => s.moves === s.n - 1;
const empties = (s) => { const o = []; for (let i = 0; i < s.n; i++) if (s.owner[i] < 0) o.push(i); return o; };
const legal = (s, i) => !isOver(s) && Number.isInteger(i) && i >= 0 && i < s.n && s.owner[i] < 0;

// What a black hole at cell i would swallow from each player right now.
function lossAt(s, i) {
  const l = [0, 0];
  for (const j of geom(s.rows).nb[i]) if (s.owner[j] >= 0) l[s.owner[j]] += s.val[j];
  return l;
}

// Mutates s. Returns true if the move was legal.
function apply(s, i) {
  if (!legal(s, i)) return false;
  s.owner[i] = s.turn;
  s.val[i] = nextNumber(s);
  s.moves++;
  s.last = i;
  s.turn = 1 - s.turn;
  if (isOver(s)) {
    s.hole = s.owner.indexOf(-1);
    s.lost = lossAt(s, s.hole);
    s.winner = s.lost[0] === s.lost[1] ? 2 : s.lost[0] < s.lost[1] ? 0 : 1;
  }
  return true;
}

// ---------- AI ----------
// Negamax with alpha-beta. Values are from the point of view of the side to move:
// (what the opponent loses) − (what I lose).

// Heuristic for unfinished positions: each empty circle is a possible hole; weight the bad ones
// for the side to move a bit more (the opponent will steer towards them), and charge both players
// for numbers that are still to come (higher numbers arrive later, so the empties left near them matter).
function evaluate(s) {
  const me = s.turn, op = 1 - me, nb = geom(s.rows).nb;
  let sum = 0, cnt = 0, worst = Infinity;
  for (let i = 0; i < s.n; i++) {
    if (s.owner[i] >= 0) continue;
    let d = 0;
    for (const j of nb[i]) {
      const o = s.owner[j];
      if (o === op) d += s.val[j]; else if (o === me) d -= s.val[j];
    }
    sum += d; cnt++;
    if (d < worst) worst = d;
  }
  if (!cnt) return 0;
  return 0.7 * (sum / cnt) + 0.3 * worst;
}

function terminalValue(s) {
  // s is over; side to move is s.turn.
  return s.lost[1 - s.turn] - s.lost[s.turn];
}

// Fast in-place make/unmake for the search.
function make(s, i) {
  s.owner[i] = s.turn; s.val[i] = Math.floor(s.moves / 2) + 1; s.moves++; s.turn = 1 - s.turn;
}
function unmake(s, i) {
  s.turn = 1 - s.turn; s.moves--; s.owner[i] = -1; s.val[i] = 0;
}
function leafValue(s) {
  // only one empty left: it's the hole
  const h = s.owner.indexOf(-1), me = s.turn, nb = geom(s.rows).nb;
  let v = 0;
  for (const j of nb[h]) { const o = s.owner[j]; if (o === me) v -= s.val[j]; else if (o >= 0) v += s.val[j]; }
  return v;
}

function orderMoves(s) {
  // Prefer filling holes that would hurt me most (protecting my numbers) — good for pruning.
  const me = s.turn, nb = geom(s.rows).nb, out = [];
  for (let i = 0; i < s.n; i++) {
    if (s.owner[i] >= 0) continue;
    let k = 0;
    for (const j of nb[i]) { const o = s.owner[j]; if (o === me) k += s.val[j]; else if (o >= 0) k -= s.val[j]; }
    out.push([k, i]);
  }
  out.sort((a, b) => b[0] - a[0]);
  return out.map((x) => x[1]);
}

function negamax(s, depth, alpha, beta) {
  const left = s.n - s.moves;
  if (left === 1) return leafValue(s);
  if (depth === 0) return evaluate(s);
  let best = -Infinity;
  for (const i of orderMoves(s)) {
    make(s, i);
    const v = -negamax(s, depth - 1, -beta, -alpha);
    unmake(s, i);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

// Scores every legal move (from the mover's point of view).
// With `onlyBest`, moves that can't tie the best one get just an upper bound (much faster; their
// exact values aren't needed when no noise is added).
function scoreMoves(s, depth, onlyBest = false) {
  const x = clone(s), out = [];
  let best = -Infinity;
  for (const i of orderMoves(x)) {
    make(x, i);
    const v = -negamax(x, depth - 1, -Infinity, onlyBest ? -(best - 1e-9) : Infinity);
    unmake(x, i);
    out.push({ i, v });
    if (v > best) best = v;
  }
  return out;
}

// Exact value of the position with perfect play (only for small endgames).
function solve(s) {
  if (isOver(s)) return terminalValue(s);
  const x = clone(s);
  return negamax(x, Infinity, -Infinity, Infinity) + 0;
}

const LEVELS = {
  // exact: solve exactly when at most this many circles are empty; depth: lookahead otherwise
  easy: { exact: 3, depth: 1, noise: 6 },
  normal: { exact: 7, depth: 2, noise: 0.8 },
  hard: { exact: 12, depth: 4, noise: 0 },
};

function aiMove(s, level = 'normal', rnd = Math.random) {
  const free = empties(s);
  if (!free.length || isOver(s)) return -1;
  if (free.length === 1) return free[0];
  const L = LEVELS[level] || LEVELS.normal;
  if (level === 'easy' && rnd() < 0.35) return free[Math.floor(rnd() * free.length)];
  const left = s.n - s.moves;
  // the exact endgame search gets slower on the big board (more neighbours per empty circle)
  const exact = s.n > 21 ? Math.min(L.exact, 11) : L.exact;
  const depth = left <= exact ? Infinity : L.depth;
  // normal plays solved endgames cleanly; easy stays sloppy all game
  const noise = depth === Infinity && level !== 'easy' ? 0 : L.noise;
  const scored = scoreMoves(s, depth, noise === 0).map((m) => ({ ...m, v: m.v + (rnd() * 2 - 1) * noise }));
  const top = Math.max(...scored.map((m) => m.v));
  const best = scored.filter((m) => m.v >= top - 1e-9);
  return best[Math.floor(rnd() * best.length)].i;
}

export const BH = {
  SIZES, create, clone, idx, neighbors, rowCol, maxNumber, nextNumber, isOver, empties, legal,
  lossAt, apply, solve, scoreMoves, aiMove,
};
