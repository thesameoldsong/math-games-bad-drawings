// Cats and Dogs (Snort): pure rules + AI, no DOM.
// Seat 0 = cats, seat 1 = dogs. Players alternately place their animal on an empty square.
// rule 'snort': a cat may never touch a dog (dog likewise); rule 'col': an animal may never touch its own kind.
// "Touch" = share a side, or (diag = true, the book's rule) also a corner.
// The player who cannot place an animal on their turn loses (the last player to move wins).

const nbCache = new Map();
function neighbors(n, diag) {
  const k = n + (diag ? 'd' : 'o');
  if (nbCache.has(k)) return nbCache.get(k);
  const list = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const a = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      if (!diag && dr && dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) a.push(rr * n + cc);
    }
    list.push(a);
  }
  nbCache.set(k, list);
  return list;
}

function create({ size = 7, rule = 'snort', diag = true, first = 0 } = {}) {
  return {
    n: size, rule, diag, first, turn: first, moves: 0, last: -1, winner: -1,
    cells: new Array(size * size).fill(-1),
  };
}
const clone = (s) => ({ ...s, cells: s.cells.slice() });

// Which animal a cell must not touch for player p.
const enemy = (s, p) => (s.rule === 'col' ? p : 1 - p);

function canPlay(s, p, i) {
  if (s.cells[i] !== -1) return false;
  const bad = enemy(s, p);
  for (const j of neighbors(s.n, s.diag)[i]) if (s.cells[j] === bad) return false;
  return true;
}
function movesFor(s, p) {
  const out = [];
  for (let i = 0; i < s.cells.length; i++) if (canPlay(s, p, i)) out.push(i);
  return out;
}
const legal = (s, i) => s.winner < 0 && Number.isInteger(i) && i >= 0 && i < s.cells.length && canPlay(s, s.turn, i);

function apply(s, i) {
  if (!legal(s, i)) throw new Error('illegal move ' + i);
  s.cells[i] = s.turn;
  s.last = i;
  s.moves++;
  s.turn = 1 - s.turn;
  if (!movesFor(s, s.turn).length) s.winner = 1 - s.turn;
  return s;
}
const isOver = (s) => s.winner >= 0;

// Per-cell status for empty cells: 0 nobody can play, 1 only cats, 2 only dogs, 3 both; -1 occupied.
function status(s) {
  return s.cells.map((v, i) => (v !== -1 ? -1 : (canPlay(s, 0, i) ? 1 : 0) | (canPlay(s, 1, i) ? 2 : 0)));
}
function counts(s) {
  const st = status(s), c = { avail: [0, 0], own: [0, 0], both: 0, dead: 0 };
  for (const v of st) {
    if (v < 0) continue;
    if (v & 1) c.avail[0]++;
    if (v & 2) c.avail[1]++;
    if (v === 1) c.own[0]++;
    else if (v === 2) c.own[1]++;
    else if (v === 3) c.both++;
    else c.dead++;
  }
  return c;
}

// ---------- AI ----------
// Fast mutable board: cells + per-cell neighbour counts of each animal.
function fastBoard(s) {
  const N = s.cells.length, nb = neighbors(s.n, s.diag);
  const cells = Int8Array.from(s.cells), cnt = [new Int8Array(N), new Int8Array(N)];
  for (let i = 0; i < N; i++) if (cells[i] >= 0) for (const j of nb[i]) cnt[cells[i]][j]++;
  const col = s.rule === 'col';
  const ok = (p, i) => cells[i] === -1 && cnt[col ? p : 1 - p][i] === 0;
  const put = (p, i) => { cells[i] = p; for (const j of nb[i]) cnt[p][j]++; };
  const take = (p, i) => { cells[i] = -1; for (const j of nb[i]) cnt[p][j]--; };
  return { N, nb, cells, cnt, col, ok, put, take };
}

const WIN = 100000;
// Static score for player p to move.
function evaluate(B, p) {
  let mine = 0, theirs = 0, both = 0;
  const own = [0, 0], safe = [0, 0];
  for (let i = 0; i < B.N; i++) {
    if (B.cells[i] !== -1) continue;
    const a = B.ok(p, i), b = B.ok(1 - p, i);
    if (a) mine++;
    if (b) theirs++;
    if (a && b) both++;
    else if (a || b) {
      // A reserved square is safe if the opponent can never drop an animal next to it.
      const q = a ? 0 : 1, foe = a ? 1 - p : p;
      own[q]++;
      let ok = true;
      for (const j of B.nb[i]) if (B.ok(foe, j)) { ok = false; break; }
      if (ok) safe[q]++;
    }
  }
  if (!mine) return -WIN;
  if (B.col) return (mine - theirs) * 10;
  // Snort: everything decided — each side just counts its untouchable squares.
  if (!both && safe[0] === own[0] && safe[1] === own[1]) return own[0] > own[1] ? WIN / 2 + own[0] - own[1] : -WIN / 2 + own[0] - own[1];
  return (safe[0] - safe[1]) * 10 + (own[0] - own[1]) * 6 + (mine - theirs) * 3;
}

function orderedMoves(B, p) {
  const ms = [];
  for (let i = 0; i < B.N; i++) {
    if (!B.ok(p, i)) continue;
    // Prefer contested squares that steal many contested neighbours.
    let k = B.ok(1 - p, i) ? 20 : 0;
    for (const j of B.nb[i]) if (B.cells[j] === -1 && B.ok(1 - p, j)) k += B.ok(p, j) ? 3 : 1;
    ms.push([k, i]);
  }
  ms.sort((a, b) => b[0] - a[0]);
  return ms.map((x) => x[1]);
}

function negamax(B, p, depth, alpha, beta, ctx) {
  if (++ctx.nodes % 1024 === 0 && Date.now() > ctx.deadline) ctx.stop = true;
  if (ctx.stop) return 0;
  const ms = orderedMoves(B, p);
  if (!ms.length) return -WIN - depth;
  if (depth === 0) return evaluate(B, p);
  let best = -Infinity;
  for (const i of ms) {
    B.put(p, i);
    const v = -negamax(B, 1 - p, depth - 1, -beta, -alpha, ctx);
    B.take(p, i);
    if (ctx.stop) return 0;
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

function search(s, maxDepth, timeMs, rnd) {
  const B = fastBoard(s), p = s.turn;
  let ms = orderedMoves(B, p);
  if (ms.length <= 1) return ms[0];
  const ctx = { nodes: 0, deadline: Date.now() + timeMs, stop: false };
  let bestMove = ms[0];
  for (let d = 1; d <= maxDepth; d++) {
    let alpha = -Infinity, cand = null;
    const scored = [];
    for (const i of ms) {
      B.put(p, i);
      const v = -negamax(B, 1 - p, d - 1, -Infinity, -alpha + 1, ctx);
      B.take(p, i);
      if (ctx.stop) break;
      scored.push([v, i]);
      if (v > alpha) { alpha = v; cand = i; }
    }
    if (ctx.stop) break;
    // Proven loss: keep the previous depth's choice, it at least makes the opponent find the win.
    if (alpha <= -WIN / 2 && d > 1) break;
    // Random pick among equally good moves keeps games varied.
    const top = scored.filter((x) => x[0] >= alpha);
    bestMove = top.length > 1 ? top[Math.floor(rnd() * top.length)][1] : cand;
    ms = [bestMove, ...ms.filter((x) => x !== bestMove)];
    if (alpha >= WIN / 2) break;
  }
  return bestMove;
}

// Point-symmetric strategy: on an odd board under the Snort rule, whoever owns the centre and
// answers every move with its mirror image can never run out of moves first.
function mirrorMove(s) {
  if (s.rule !== 'snort' || s.n % 2 === 0) return -1;
  const N = s.cells.length, c = (N - 1) / 2, p = s.turn;
  if (s.cells[c] === -1) return s.moves === 0 && canPlay(s, p, c) ? c : -1;
  if (s.cells[c] !== p) return -1;
  let gap = -1;
  for (let i = 0; i < N; i++) {
    if (i === c) continue;
    const a = s.cells[i], b = s.cells[N - 1 - i];
    if (a === -1 && b === -1) continue;
    if (a !== -1 && b !== -1 && a === 1 - b) continue;
    if (a === 1 - p && b === -1 && gap < 0) { gap = N - 1 - i; continue; }
    if (b === 1 - p && a === -1) continue; // counted from the other side
    return -1;
  }
  return gap >= 0 && canPlay(s, p, gap) ? gap : -1;
}

function aiMove(s, level = 'normal', { timeMs = 600, rnd = Math.random, mirror = true } = {}) {
  const ms = movesFor(s, s.turn);
  if (!ms.length) return -1;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  if (level === 'easy') {
    // Mostly random, but grabs a square that leaves the opponent stuck.
    for (const i of ms) { const t = clone(s); t.cells[i] = s.turn; if (!movesFor(t, 1 - s.turn).length) return i; }
    return rnd() < 0.35 ? search(s, 1, timeMs, rnd) : pick(ms);
  }
  if (level === 'hard') {
    const m = mirror ? mirrorMove(s) : -1;
    if (m >= 0) return m;
    return search(s, 12, timeMs, rnd);
  }
  return search(s, 2, timeMs, rnd);
}

export const CAD = { create, clone, neighbors, canPlay, movesFor, legal, apply, isOver, status, counts, mirrorMove, aiMove };
