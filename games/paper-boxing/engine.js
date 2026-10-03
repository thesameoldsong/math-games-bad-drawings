// Paper Boxing: pure game logic + AI. No DOM.
//
// Each player owns a 4×4 grid: the top-left cell (index 0) is a blank start square, the other 15 cells
// hold the numbers 1..15. Grids are arranged in secret, then revealed for the whole game.
// 15 rounds: each player moves from their latest cell to an unvisited king-neighbour (diagonals count)
// and plays that cell's number; the higher number wins the round (+1), equal numbers score nothing.
// A player with no legal step is trapped and plays 0 for every remaining round.
//   mode 'secret'  — both choose simultaneously and in secret (the book's version);
//   mode 'open'    — "classic": one after the other in public; the last round's winner chooses first
//                    (round 1: bigger sum around the start square; ties keep the previous order, blue first).

const SIZE = 4, CELLS = 16, ROUNDS = 15;

// king-move neighbours of every cell
const NB = Array.from({ length: CELLS }, (_, i) => {
  const r = Math.floor(i / SIZE), c = i % SIZE, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(rr * SIZE + cc);
  }
  return out;
});

function shuffle(a, rnd = Math.random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function randomGrid(rnd = Math.random) {
  return [null, ...shuffle(Array.from({ length: 15 }, (_, i) => i + 1), rnd)];
}
function validGrid(g) {
  if (!Array.isArray(g) || g.length !== CELLS || g[0] !== null) return false;
  const seen = new Set(g.slice(1));
  return seen.size === 15 && [...seen].every((v) => Number.isInteger(v) && v >= 1 && v <= 15);
}

function create({ mode = 'secret', grids = null } = {}) {
  const s = {
    mode,
    grids: [null, null],
    phase: 'setup',          // setup | pick | over
    pos: [0, 0],             // current cell of each player
    path: [[0], [0]],        // visited cells in order
    picks: [null, null],     // this round's chosen cell (secret mode: hidden from the other side)
    first: 0,                // open mode: who chooses first this round
    round: 0,
    score: [0, 0],
    log: [],                 // [{ c:[cell|-1, cell|-1], v:[a,b], w: 0|1|-1 }]
    n: 0,                    // action counter (online sync)
    id: Math.random().toString(36).slice(2, 8),   // game id, so a peer can tell a new game from an old one
  };
  if (grids) for (const p of [0, 1]) setGrid(s, p, grids[p]);
  s.n = 0;
  return s;
}
const clone = (s) => JSON.parse(JSON.stringify(s));

function setGrid(s, p, g) {
  if (s.phase !== 'setup' || s.grids[p] || !validGrid(g)) return false;
  s.grids[p] = g.slice();
  s.n++;
  if (s.grids[0] && s.grids[1]) startPlay(s);
  return true;
}

function startPlay(s) {
  s.phase = 'pick';
  const around = (p) => NB[0].reduce((t, i) => t + s.grids[p][i], 0);
  s.first = around(1) > around(0) ? 1 : 0;
}

const visited = (s, p, i) => s.path[p].includes(i);
const moves = (s, p) => NB[s.pos[p]].filter((i) => !visited(s, p, i));
const trapped = (s, p) => moves(s, p).length === 0;
const value = (s, p, cell) => (cell < 0 ? 0 : s.grids[p][cell]);

// Players who still have to choose this round.
function waitingFor(s) {
  if (s.phase !== 'pick') return [];
  const need = [0, 1].filter((p) => s.picks[p] === null && !trapped(s, p));
  if (s.mode !== 'open') return need;
  if (need.includes(s.first)) return [s.first];
  return need;
}

function pick(s, p, cell) {
  if (!waitingFor(s).includes(p) || !moves(s, p).includes(cell)) return false;
  s.picks[p] = cell;
  s.n++;
  if (!waitingFor(s).length) resolve(s);
  return true;
}

function resolve(s) {
  const c = [0, 1].map((p) => (s.picks[p] === null ? -1 : s.picks[p]));
  const v = [0, 1].map((p) => value(s, p, c[p]));
  const w = v[0] === v[1] ? -1 : v[0] > v[1] ? 0 : 1;
  for (const p of [0, 1]) if (c[p] >= 0) { s.pos[p] = c[p]; s.path[p].push(c[p]); }
  if (w >= 0) { s.score[w]++; s.first = w; }
  s.log.push({ c, v, w });
  s.picks = [null, null];
  s.round++;
  if (s.round >= ROUNDS || (trapped(s, 0) && trapped(s, 1))) s.phase = 'over';
}

// 0 / 1 = winner, -1 = tie, null = not over
function winner(s) {
  if (s.phase !== 'over') return null;
  return s.score[0] === s.score[1] ? -1 : s.score[0] > s.score[1] ? 0 : 1;
}

// What player p may see: the other grid stays hidden during setup, the other secret pick while choosing.
function redact(s, p) {
  const v = clone(s);
  const o = 1 - p;
  if (v.phase === 'setup' && v.grids[o]) v.grids[o] = 'ready';
  if (v.mode !== 'open' && v.picks[o] !== null) v.picks[o] = 'hidden';
  return v;
}
const isReady = (s, p) => !!s.grids[p];

// ---------- AI ----------
// Fast bit-mask simulation for rollouts.
const NBM = NB.map((l) => l.reduce((m, i) => m | (1 << i), 0));
const bits = (m) => { const out = []; for (let i = 0; i < CELLS; i++) if (m & (1 << i)) out.push(i); return out; };
const popc = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };

// Rollout policy: random, but prefers squares that keep the path alive.
function rollStep(pos, mask, rnd) {
  const free = NBM[pos] & ~mask;
  if (!free) return -1;
  const opts = bits(free);
  if (opts.length === 1) return opts[0];
  let tot = 0;
  const w = opts.map((i) => { const k = popc(NBM[i] & ~(mask | (1 << i))); const x = k === 0 ? 0.15 : 1 + Math.min(k, 3); tot += x; return x; });
  let r = rnd() * tot;
  for (let j = 0; j < opts.length; j++) { r -= w[j]; if (r <= 0) return opts[j]; }
  return opts[opts.length - 1];
}

function rollout(g, pos, mask, round, score, rnd) {
  pos = pos.slice(); mask = mask.slice(); score = score.slice();
  for (let r = round; r < ROUNDS; r++) {
    const c = [rollStep(pos[0], mask[0], rnd), rollStep(pos[1], mask[1], rnd)];
    if (c[0] < 0 && c[1] < 0) break;
    const v = [c[0] < 0 ? 0 : g[0][c[0]], c[1] < 0 ? 0 : g[1][c[1]]];
    if (v[0] > v[1]) score[0]++; else if (v[1] > v[0]) score[1]++;
    for (const p of [0, 1]) if (c[p] >= 0) { pos[p] = c[p]; mask[p] |= 1 << c[p]; }
  }
  return score;
}

// Payoff matrix M[a][b] for player p (rows = p's options incl. -1 for "trapped", cols = opponent's).
function payoffMatrix(s, p, rollouts, rnd) {
  const o = 1 - p;
  const A = trapped(s, p) ? [-1] : moves(s, p);
  const B = trapped(s, o) ? [-1] : moves(s, o);
  const g = s.grids;
  const mask0 = s.path.map((l) => l.reduce((m, i) => m | (1 << i), 0));
  const M = A.map((a) => B.map((b) => {
    const c = p === 0 ? [a, b] : [b, a];
    const v = [c[0] < 0 ? 0 : g[0][c[0]], c[1] < 0 ? 0 : g[1][c[1]]];
    const score = s.score.slice();
    if (v[0] > v[1]) score[0]++; else if (v[1] > v[0]) score[1]++;
    const pos = [0, 1].map((q) => (c[q] < 0 ? s.pos[q] : c[q]));
    const mask = [0, 1].map((q) => (c[q] < 0 ? mask0[q] : mask0[q] | (1 << c[q])));
    let tot = 0;
    for (let k = 0; k < rollouts; k++) {
      const f = rollout(g, pos, mask, s.round + 1, score, rnd);
      const d = f[p] - f[o];
      tot += Math.sign(d) + 0.12 * d;
    }
    return tot / rollouts;
  }));
  return { A, B, M };
}

// Approximate mixed equilibrium of a zero-sum matrix game (regret matching, average strategy).
function solveMatrix(M, iters = 600) {
  const n = M.length, m = M[0].length;
  const rA = Array(n).fill(0), rB = Array(m).fill(0), sumA = Array(n).fill(0);
  const strat = (r) => { const pos = r.map((x) => Math.max(0, x)); const t = pos.reduce((a, b) => a + b, 0); return t > 0 ? pos.map((x) => x / t) : r.map(() => 1 / r.length); };
  for (let it = 0; it < iters; it++) {
    const x = strat(rA), y = strat(rB);
    const ua = M.map((row) => row.reduce((t, v, j) => t + v * y[j], 0));
    const ub = Array.from({ length: m }, (_, j) => -M.reduce((t, row, i) => t + row[j] * x[i], 0));
    const va = ua.reduce((t, u, i) => t + u * x[i], 0), vb = ub.reduce((t, u, j) => t + u * y[j], 0);
    for (let i = 0; i < n; i++) { rA[i] += ua[i] - va; sumA[i] += x[i]; }
    for (let j = 0; j < m; j++) rB[j] += ub[j] - vb;
  }
  const t = sumA.reduce((a, b) => a + b, 0);
  return sumA.map((x) => x / t);
}

function sample(probs, rnd) {
  let r = rnd();
  for (let i = 0; i < probs.length; i++) { r -= probs[i]; if (r <= 0) return i; }
  return probs.length - 1;
}

// Pick a cell for player p. Only public information is used: both grids, both paths, the score —
// and, in open mode, a choice the opponent has already announced. Never the opponent's secret pick.
function aiPick(s, p, level = 'normal', rnd = Math.random) {
  const opts = moves(s, p);
  if (!opts.length) return -1;
  if (opts.length === 1) return opts[0];
  const o = 1 - p;
  if (level === 'easy') {
    // avoid walking into a dead end when possible, otherwise random with a taste for big numbers
    const safe = opts.filter((i) => NB[i].some((j) => !visited(s, p, j)));
    const pool = safe.length ? safe : opts;
    if (rnd() < 0.4) return pool.reduce((a, b) => (s.grids[p][b] > s.grids[p][a] ? b : a));
    return pool[Math.floor(rnd() * pool.length)];
  }
  const rollouts = level === 'hard' ? 260 : 60;
  const known = s.mode === 'open' && typeof s.picks[o] === 'number' ? s.picks[o] : null;
  const { A, B, M } = payoffMatrix(s, p, rollouts, rnd);
  if (known !== null) {
    // respond to an announced choice
    const j = B.indexOf(known);
    let best = 0;
    for (let i = 1; i < A.length; i++) if (M[i][j] > M[best][j]) best = i;
    return A[best];
  }
  if (s.mode === 'open' && !trapped(s, o)) {
    // choosing first in public: the opponent will answer with their best reply
    let best = 0, bv = -Infinity;
    A.forEach((_, i) => { const w = Math.min(...M[i]); if (w > bv) { bv = w; best = i; } });
    return A[best];
  }
  // simultaneous secret choice: play an (approximate) equilibrium mix
  const probs = solveMatrix(M, level === 'hard' ? 1200 : 400);
  return A[sample(probs, rnd)];
}

// The computer's board: random arrangement (the book's own advice).
const aiGrid = (rnd = Math.random) => randomGrid(rnd);

export const PB = {
  SIZE, CELLS, ROUNDS, NB,
  create, clone, randomGrid, validGrid, setGrid, isReady, moves, trapped, value, waitingFor, pick, winner, redact,
  aiPick, aiGrid, solveMatrix,
};
