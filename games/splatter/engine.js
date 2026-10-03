// Splatter: pure game logic + AI. No DOM.
//
// Board: R×C cells, index i = r*C + c. cells[i]: 0 / 1 = a blob of that player, EMPTY = not filled yet
// (setup by turns), GONE = already splattered (splat[i] remembers who splattered it, for drawing).
// A move in the play phase: { i, p } — splatter your own blob i with pattern p:
//   'one' = just the blob, 'all' = blob + its 8 neighbours, 'x' = + 4 diagonal, 'plus' = + 4 orthogonal.
// A move in the setup phase: { i } — put your blob into empty cell i.
// The game ends when a colour has no blobs left; whoever still has blobs wins. If one splatter wipes
// out the last blobs of both colours, the player who made it wins (the opponent is left without a move).

export const EMPTY = -1, GONE = -2;
const DIRS = {
  one: [],
  all: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
  x: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  plus: [[-1, 0], [0, -1], [0, 1], [1, 0]],
};
export const PATTERNS = { classic: ['one', 'all'], extended: ['one', 'all', 'x', 'plus'] };

function create({ R = 6, C = 6, patterns = 'classic', setup = 'random', first = 0, rand = Math.random } = {}) {
  const n = R * C;
  const s = {
    R, C, patterns, setup, first,
    cells: Array(n).fill(EMPTY), splat: Array(n).fill(-1),
    turn: first, phase: setup === 'turns' ? 'place' : 'play', winner: -1, moves: 0, last: null,
  };
  if (setup !== 'turns') {
    const bag = Array.from({ length: n }, (_, i) => i % 2);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    s.cells = bag;
  }
  return s;
}
const clone = (s) => ({ ...s, cells: s.cells.slice(), splat: s.splat.slice(), last: s.last && { ...s.last, hit: s.last.hit?.slice() } });
const count = (s, p) => s.cells.reduce((n, v) => n + (v === p), 0);
const isOver = (s) => s.winner >= 0;

// Cells a splatter would wipe out (only cells that still hold a blob).
function hits(s, i, p) {
  const r = Math.floor(i / s.C), c = i % s.C, out = [i];
  for (const [dr, dc] of DIRS[p] || []) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || cc < 0 || rr >= s.R || cc >= s.C) continue;
    const j = rr * s.C + cc;
    if (s.cells[j] >= 0) out.push(j);
  }
  return out;
}

function isLegal(s, m) {
  if (!m || isOver(s) || !Number.isInteger(m.i) || m.i < 0 || m.i >= s.cells.length) return false;
  if (s.phase === 'place') return s.cells[m.i] === EMPTY;
  return s.cells[m.i] === s.turn && PATTERNS[s.patterns].includes(m.p);
}

// All legal moves; splatters that wipe out the very same cells are listed once.
function legalMoves(s) {
  const out = [];
  if (isOver(s)) return out;
  if (s.phase === 'place') {
    s.cells.forEach((v, i) => v === EMPTY && out.push({ i }));
    return out;
  }
  const pats = PATTERNS[s.patterns];
  for (let i = 0; i < s.cells.length; i++) {
    if (s.cells[i] !== s.turn) continue;
    const seen = new Set();
    for (const p of pats) {
      const h = hits(s, i, p);
      const k = h.length > 1 ? h.slice(1).sort((a, b) => a - b).join(',') : '';
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ i, p });
    }
  }
  return out;
}

// Mutates s. Returns the list of wiped-out cells (empty list for a placement).
function apply(s, m) {
  if (!isLegal(s, m)) throw new Error('illegal move ' + JSON.stringify(m));
  const me = s.turn;
  s.moves++;
  if (s.phase === 'place') {
    s.cells[m.i] = me;
    s.last = { i: m.i, place: true, by: me };
    s.turn = 1 - me;
    // Each colour gets exactly half of the cells: once one side is done, the other fills the rest.
    const half = s.cells.length / 2;
    if (count(s, s.turn) >= half) s.turn = me;
    if (!s.cells.includes(EMPTY)) { s.phase = 'play'; s.turn = s.first; }
    return [];
  }
  const h = hits(s, m.i, m.p);
  for (const j of h) { s.cells[j] = GONE; s.splat[j] = me; }
  s.last = { i: m.i, p: m.p, hit: h, by: me };
  const mine = count(s, me), theirs = count(s, 1 - me);
  if (theirs === 0) s.winner = me;
  else if (mine === 0) s.winner = 1 - me;
  else s.turn = 1 - me;
  return h;
}

// ---------- AI ----------
const WIN = 100000;
export const EW = { a: 6, b: 3 };
// Fast search on a typed array: v[i] = 0/1 blob, 2 = no blob.
const pick = (a, rand = Math.random) => a[Math.floor(rand() * a.length)];

function makeSearch(s) {
  const R = s.R, C = s.C, N = R * C;
  const nb = { all: [], x: [], plus: [] };
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / C), c = i % C;
    for (const p of ['all', 'x', 'plus']) {
      nb[p][i] = DIRS[p].map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && b >= 0 && a < R && b < C).map(([a, b]) => a * C + b);
    }
  }
  const pats = PATTERNS[s.patterns].filter((p) => p !== 'one');
  // Zobrist hashing for the transposition table.
  const zr = () => (Math.random() * 0x100000000) >>> 0;
  const Z = [Array.from({ length: N }, zr), Array.from({ length: N }, zr)];
  const Z2 = [Array.from({ length: N }, zr), Array.from({ length: N }, zr)];
  const v = new Uint8Array(N), cnt = [0, 0];
  let h1 = 0, h2 = 0;
  for (let i = 0; i < N; i++) {
    const x = s.cells[i];
    v[i] = x >= 0 ? x : 2;
    if (x >= 0) { cnt[x]++; h1 ^= Z[x][i]; h2 ^= Z2[x][i]; }
  }

  // Moves for player me: list of [i, pattern, wiped cells], duplicates removed.
  function moves(me) {
    const out = [];
    for (let i = 0; i < N; i++) {
      if (v[i] !== me) continue;
      out.push([i, 'one', [i]]);
      const seen = new Set();
      for (const p of pats) {
        const h = [i];
        for (const j of nb[p][i]) if (v[j] < 2) h.push(j);
        if (h.length === 1) continue;
        const k = h.join(',');
        if (seen.has(k)) continue;
        seen.add(k);
        out.push([i, p, h]);
      }
    }
    return out;
  }
  function doHits(h) {
    const undo = [];
    for (const j of h) { const x = v[j]; undo.push(x); v[j] = 2; cnt[x]--; h1 ^= Z[x][j]; h2 ^= Z2[x][j]; }
    return undo;
  }
  function undoHits(h, undo) {
    for (let k = 0; k < h.length; k++) { const j = h[k], x = undo[k]; v[j] = x; cnt[x]++; h1 ^= Z[x][j]; h2 ^= Z2[x][j]; }
  }
  // Gain of a move for `me`: their blobs removed minus my extra blobs removed.
  function gain(h, me) {
    let g = 0;
    for (let k = 1; k < h.length; k++) g += v[h[k]] === me ? -1 : 1;
    return g;
  }
  // Static evaluation from the point of view of `me`, who is to move.
  // Pure race: with only lone splatters the side to move wins iff it has more blobs.
  // Threats: my best immediate swing vs theirs.
  function evaluate(me) {
    const op = 1 - me;
    let best = [0, 0], contact = false;
    for (let i = 0; i < N; i++) {
      const x = v[i];
      if (x === 2) continue;
      if (!contact) for (const j of nb.all[i]) if (v[j] === 1 - x) { contact = true; break; }
      for (const p of pats) {
        let g = 0;
        for (const j of nb[p][i]) if (v[j] < 2) g += v[j] === x ? -1 : 1;
        if (g > best[x]) best[x] = g;
      }
    }
    // No blob touches an enemy blob: from now on it's a pure race, decided by the counts.
    if (!contact) return cnt[me] > cnt[op] ? WIN - 1000 : -WIN + 1000;
    return (cnt[me] - cnt[op] - 0.5) * 10 + best[me] * EW.a - best[op] * EW.b;
  }
  return { v, cnt, moves, doHits, undoHits, gain, evaluate, key: () => h1 * 2097152 + (h2 & 0x1fffff) };
}


// Negamax alpha-beta with iterative deepening and a transposition table.
function searchMove(s, { timeMs = 400, maxDepth = 64 } = {}) {
  const S = makeSearch(s);
  const tt = new Map();
  const t0 = Date.now();
  let nodes = 0, timeUp = false;

  function nega(me, depth, alpha, beta, ply) {
    if ((++nodes & 1023) === 0 && Date.now() - t0 > timeMs) timeUp = true;
    if (timeUp) return 0;
    const k = S.key() * 2 + me;
    const e = tt.get(k);
    let bestIdx = -1;
    if (e) {
      if (e.d >= depth) {
        if (e.f === 0) return e.v;
        if (e.f === 1 && e.v >= beta) return e.v;
        if (e.f === -1 && e.v <= alpha) return e.v;
      }
      bestIdx = e.b;
    }
    if (depth <= 0) return S.evaluate(me);
    const ms = S.moves(me);
    // order: TT move first, then by gain
    const scored = ms.map((m, idx) => [m, idx === bestIdx ? 1e9 : S.gain(m[2], me) * 10 - m[2].length]);
    scored.sort((a, b) => b[1] - a[1]);
    const a0 = alpha;
    let best = -Infinity, bi = -1;
    for (const [m] of scored) {
      const u = S.doHits(m[2]);
      let val;
      if (S.cnt[1 - me] === 0) val = WIN - ply;
      else if (S.cnt[me] === 0) val = -WIN + ply;
      else val = -nega(1 - me, depth - 1, -beta, -alpha, ply + 1);
      S.undoHits(m[2], u);
      if (timeUp) return 0;
      if (val > best) { best = val; bi = ms.indexOf(m); }
      if (val > alpha) alpha = val;
      if (alpha >= beta) break;
    }
    tt.set(k, { d: depth, v: best, f: best <= a0 ? -1 : best >= beta ? 1 : 0, b: bi });
    return best;
  }

  const me = s.turn;
  const root = S.moves(me);
  // Shuffle so that equally good moves vary from game to game.
  for (let i = root.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [root[i], root[j]] = [root[j], root[i]]; }
  let bestMove = root[0], bestVal = -Infinity;
  for (let d = 1; d <= maxDepth; d++) {
    let alpha = -Infinity, cur = null, curVal = -Infinity;
    // try previous best first
    const order = [bestMove, ...root.filter((m) => m !== bestMove)];
    for (const m of order) {
      const u = S.doHits(m[2]);
      let val;
      if (S.cnt[1 - me] === 0) val = WIN;
      else if (S.cnt[me] === 0) val = -WIN;
      else val = -nega(1 - me, d - 1, -Infinity, -alpha, 1);
      S.undoHits(m[2], u);
      if (timeUp) break;
      // Only a strictly better score counts: other moves were searched with a null window and
      // their value may just be an upper bound.
      if (val > curVal) { curVal = val; cur = m; }
      if (val > alpha) alpha = val;
    }
    if (timeUp) break;
    bestMove = cur; bestVal = curVal;
    if (Math.abs(bestVal) > WIN / 2) break; // solved
    if (d > S.cnt[0] + S.cnt[1]) break;
  }
  return { i: bestMove[0], p: bestMove[1], value: bestVal, nodes };
}

// One-ply greedy choice (also used for quick playouts).
function greedyMove(s, rand = Math.random) {
  const S = makeSearch(s), me = s.turn;
  let best = [], bv = -Infinity;
  for (const m of S.moves(me)) {
    const g = S.gain(m[2], me);
    if (g > bv) { bv = g; best = [m]; } else if (g === bv) best.push(m);
  }
  const m = pick(best, rand);
  return { i: m[0], p: m[1] };
}

// Setup phase: try every empty cell, finish the fill at random and play quick greedy games.
function placeMove(s, level) {
  const empties = s.cells.map((x, i) => (x === EMPTY ? i : -1)).filter((i) => i >= 0);
  if (level === 'easy' || empties.length <= 1) return { i: pick(empties) };
  const me = s.turn, tries = level === 'hard' ? 6 : 2;
  let best = [], bv = -Infinity;
  for (const i of empties) {
    let score = 0;
    for (let k = 0; k < tries; k++) {
      const x = clone(s);
      apply(x, { i });
      while (x.phase === 'place') apply(x, { i: pick(x.cells.map((v, j) => (v === EMPTY ? j : -1)).filter((j) => j >= 0)) });
      let guard = 200;
      while (!isOver(x) && guard--) apply(x, greedyMove(x));
      score += x.winner === me ? 1 : 0;
    }
    if (score > bv) { bv = score; best = [i]; } else if (score === bv) best.push(i);
  }
  return { i: pick(best) };
}

function aiMove(s, level = 'normal') {
  if (s.phase === 'place') return placeMove(s, level);
  if (level === 'easy') {
    if (Math.random() < 0.45) return greedyMove(s);
    const m = pick(legalMoves(s));
    return { i: m.i, p: m.p };
  }
  const r = searchMove(s, level === 'hard' ? { timeMs: 900 } : { timeMs: 150, maxDepth: 2 });
  return { i: r.i, p: r.p };
}

export const SPL = { create, clone, count, hits, isLegal, legalMoves, apply, isOver, aiMove, searchMove, greedyMove, PATTERNS, EMPTY, GONE };
