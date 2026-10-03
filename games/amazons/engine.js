// Amazons: pure game logic + AI. No DOM.
//
// Board: flat array of N*N cells, index = r * N + c (row 0 is the top).
//   -1 empty, 0 blue amazon, 1 red amazon, 2 burnt square (an arrow landed there).
// A turn is one move {from, to, arrow}: slide an amazon like a chess queen, then shoot an arrow
// like a queen from its new square (it may fly back over / onto the square it just left).
// The player who cannot complete a turn on their move loses.

const EMPTY = -1, BURNT = 2;
const SIZES = [6, 8, 10];

// Starting squares [row, col] for blue (0) and red (1).
const START = {
  6: [[[0, 2], [5, 3]], [[2, 0], [3, 5]]],
  8: [[[5, 7], [6, 0], [7, 4]], [[0, 3], [1, 7], [2, 0]]],
  10: [[[6, 0], [6, 9], [9, 3], [9, 6]], [[0, 3], [0, 6], [3, 0], [3, 9]]],
};

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

// rays[N][cell] = 8 arrays of cells walking outward in each direction; nbrs[N][cell] = king neighbours.
const geo = {};
function geometry(N) {
  if (geo[N]) return geo[N];
  const rays = [], nbrs = [];
  for (let i = 0; i < N * N; i++) {
    const r0 = Math.floor(i / N), c0 = i % N, rs = [], nb = [];
    for (const [dr, dc] of DIRS) {
      const ray = [];
      for (let r = r0 + dr, c = c0 + dc; r >= 0 && r < N && c >= 0 && c < N; r += dr, c += dc) ray.push(r * N + c);
      if (ray.length) { rs.push(ray); nb.push(ray[0]); }
    }
    rays.push(rs); nbrs.push(nb);
  }
  return (geo[N] = { rays, nbrs });
}

function create({ N = 8, first = 0 } = {}) {
  if (!START[N]) N = 8;
  const b = Array(N * N).fill(EMPTY);
  for (const p of [0, 1]) for (const [r, c] of START[N][p]) b[r * N + c] = p;
  return { N, b, turn: first, first, ply: 0, last: null, winner: -1 };
}

const clone = (s) => ({ ...s, b: s.b.slice(), last: s.last && { ...s.last } });

// Cells an amazon (or arrow) at `from` can reach along open lines.
function reach(b, N, from) {
  const out = [];
  for (const ray of geometry(N).rays[from]) for (const j of ray) { if (b[j] !== EMPTY) break; out.push(j); }
  return out;
}

const amazons = (s, p) => s.b.reduce((a, v, i) => (v === p ? (a.push(i), a) : a), []);

// An amazon that can step anywhere can also shoot (back where it came from), so
// "has a move" = some amazon has an empty neighbour.
const canStep = (b, N, i) => geometry(N).nbrs[i].some((j) => b[j] === EMPTY);
const freeCount = (s, p) => amazons(s, p).filter((i) => canStep(s.b, s.N, i)).length;
const hasMove = (s, p = s.turn) => freeCount(s, p) > 0;

function legalMoves(s) {
  const out = [], b = s.b.slice();
  for (const from of amazons(s, s.turn)) {
    for (const to of reach(b, s.N, from)) {
      b[from] = EMPTY; b[to] = s.turn;
      for (const arrow of reach(b, s.N, to)) out.push({ from, to, arrow });
      b[to] = EMPTY; b[from] = s.turn;
    }
  }
  return out;
}

// Destinations / arrow targets for a half-finished turn (used by the UI).
const targets = (s, from) => reach(s.b, s.N, from);
function arrowTargets(s, from, to) {
  const b = s.b.slice();
  b[from] = EMPTY; b[to] = b[to] === EMPTY ? s.b[from] : b[to];
  return reach(b, s.N, to);
}

function isLegal(s, m) {
  if (!m || s.winner >= 0) return false;
  const { from, to, arrow } = m, NN = s.N * s.N;
  if (![from, to, arrow].every((x) => Number.isInteger(x) && x >= 0 && x < NN)) return false;
  if (s.b[from] !== s.turn) return false;
  if (!targets(s, from).includes(to)) return false;
  return arrowTargets(s, from, to).includes(arrow);
}

// Mutates s.
function apply(s, m) {
  const who = s.turn;
  s.b[m.from] = EMPTY; s.b[m.to] = who; s.b[m.arrow] = BURNT;
  s.last = { from: m.from, to: m.to, arrow: m.arrow, who };
  s.ply++;
  s.turn = 1 - who;
  if (!hasMove(s, s.turn)) s.winner = who;
  return s;
}
const isOver = (s) => s.winner >= 0;

// ---------- evaluation ----------
const INF = 99;
// Multi-source BFS. queen=true: one step = one queen move; false: one step = one king step.
function distances(b, N, p, queen, out, queue) {
  const { rays, nbrs } = geometry(N);
  out.fill(INF);
  let head = 0, tail = 0;
  for (let i = 0; i < N * N; i++) if (b[i] === p) { out[i] = 0; queue[tail++] = i; }
  while (head < tail) {
    const i = queue[head++], d = out[i] + 1;
    if (queen) {
      for (const ray of rays[i]) for (const j of ray) {
        if (b[j] !== EMPTY) break;
        if (out[j] > d) { out[j] = d; queue[tail++] = j; }
      }
    } else {
      for (const j of nbrs[i]) if (b[j] === EMPTY && out[j] > d) { out[j] = d; queue[tail++] = j; }
    }
  }
  return out;
}

function mobility(b, N, p) {
  let total = 0, worst = 0;
  const { rays } = geometry(N);
  for (let i = 0; i < N * N; i++) {
    if (b[i] !== p) continue;
    let m = 0;
    for (const ray of rays[i]) for (const j of ray) { if (b[j] !== EMPTY) break; m++; }
    total += m;
    if (m === 0) worst -= 1; // a fully boxed-in amazon is dead weight
  }
  return total + worst * 6;
}

function scratch(N) {
  const n = N * N;
  return { q0: new Int8Array(n), q1: new Int8Array(n), k0: new Int8Array(n), k1: new Int8Array(n), queue: new Int16Array(n * 8) };
}
const scratchFor = {};

// Score from p's point of view; `turn` is the side to move (wins ties on contested squares).
// Returns { score, terr: [cells closer to blue, closer to red], sealed }.
function analyse(b, N, p, turn, level = 'normal') {
  const S = (scratchFor[N] ??= scratch(N));
  const q0 = distances(b, N, 0, true, S.q0, S.queue), q1 = distances(b, N, 1, true, S.q1, S.queue);
  const k0 = distances(b, N, 0, false, S.k0, S.queue), k1 = distances(b, N, 1, false, S.k1, S.queue);
  const tie = turn === 0 ? 0.2 : -0.2;
  let t1 = 0, t2 = 0, own0 = 0, own1 = 0, contested = 0;
  for (let i = 0; i < N * N; i++) {
    if (b[i] !== EMPTY) continue;
    const a = q0[i], c = q1[i];
    if (a < c) t1++; else if (c < a) t1--; else if (a < INF) t1 += tie;
    const x = k0[i], y = k1[i];
    if (x < y) t2++; else if (y < x) t2--; else if (x < INF) t2 += tie;
    if (x < INF && y < INF) contested++;
    else if (x < INF) own0++;
    else if (y < INF) own1++;
  }
  let score;
  if (level === 'easy') score = t1;
  else if (!contested) score = (own0 - own1) * 2 + t2; // every region belongs to one side: count rooms
  else {
    const filled = 1 - contested / (N * N);
    score = t1 * (1 - filled * 0.5) + t2 * (0.3 + filled * 0.7) + 0.08 * (mobility(b, N, 0) - mobility(b, N, 1));
  }
  if (p === 1) score = -score;
  return { score, terr: [own0 + 0.5 * contested, own1 + 0.5 * contested], sealed: !contested };
}

const WIN = 10000;
function evalAfter(b, N, me, toMove, level) {
  // side to move with no move loses
  let stuck = true;
  for (let i = 0; i < N * N && stuck; i++) if (b[i] === toMove && canStep(b, N, i)) stuck = false;
  if (stuck) return toMove === me ? -WIN : WIN;
  return analyse(b, N, me, toMove, level).score;
}

// Public: position score for p (positive = good for p).
const evaluate = (s, p = s.turn) => evalAfter(s.b, s.N, p, s.turn, 'normal');
const outlook = (s) => analyse(s.b, s.N, 0, s.turn);

// Visit every move for `who` on a mutable board b, calling fn(from, to, arrow) with the move applied.
function forEachMove(b, N, who, fn) {
  const { rays } = geometry(N);
  for (let from = 0; from < N * N; from++) {
    if (b[from] !== who) continue;
    for (const ray of rays[from]) for (const to of ray) {
      if (b[to] !== EMPTY) break;
      b[from] = EMPTY; b[to] = who;
      for (const aray of rays[to]) for (const arrow of aray) {
        if (b[arrow] !== EMPTY) break;
        b[arrow] = BURNT;
        const stop = fn(from, to, arrow);
        b[arrow] = EMPTY;
        if (stop) { b[to] = EMPTY; b[from] = who; return true; }
      }
      b[to] = EMPTY; b[from] = who;
    }
  }
  return false;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function scoredMoves(s, level, noise) {
  const b = Int8Array.from(s.b), N = s.N, me = s.turn, opp = 1 - me, out = [];
  forEachMove(b, N, me, (from, to, arrow) => {
    out.push({ from, to, arrow, v: evalAfter(b, N, me, opp, level) + (Math.random() * 2 - 1) * noise });
  });
  return out;
}

function aiMove(s, level = 'normal', { budget = 1500 } = {}) {
  const moves = scoredMoves(s, level === 'easy' ? 'easy' : 'normal', level === 'easy' ? 2.5 : level === 'normal' ? 0.25 : 0.05);
  if (!moves.length) return null;
  const strip = ({ from, to, arrow }) => ({ from, to, arrow });
  if (level === 'easy') {
    if (Math.random() < 0.3) return strip(pick(moves));
    return strip(moves.reduce((a, m) => (m.v > a.v ? m : a)));
  }
  moves.sort((a, b) => b.v - a.v);
  if (level !== 'hard' || moves[0].v >= WIN) return strip(moves[0]);

  // Hard: look one reply deeper for the most promising candidates.
  const N = s.N, me = s.turn, opp = 1 - me, b = Int8Array.from(s.b);
  const K = N <= 6 ? 30 : N <= 8 ? 20 : 12, t0 = Date.now();
  let best = moves[0], bestV = -Infinity;
  for (let k = 0; k < Math.min(K, moves.length); k++) {
    const m = moves[k];
    if (k > 0 && Date.now() - t0 > budget) break;
    b[m.from] = EMPTY; b[m.to] = me; b[m.arrow] = BURNT;
    let worst = Infinity;
    const any = forEachMove(b, N, opp, () => {
      const v = evalAfter(b, N, me, me, 'normal');
      if (v < worst) worst = v;
      return worst <= bestV; // can't beat what we already have: stop
    });
    if (worst === Infinity && !any) worst = WIN; // opponent has no reply at all
    b[m.arrow] = EMPTY; b[m.to] = EMPTY; b[m.from] = me;
    if (worst > bestV) { bestV = worst; best = m; }
  }
  return strip(best);
}

export const AMZ = {
  EMPTY, BURNT, SIZES, START, create, clone, reach, targets, arrowTargets, legalMoves, isLegal, apply, isOver,
  amazons, canStep, freeCount, hasMove, evaluate, outlook, aiMove,
};
