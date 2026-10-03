// Sim: six dots, two colours, every pair of dots may be joined once.
// Whoever is left with a triangle (three of the six dots) all in their own colour loses.
//
// State: { col[15] (-1 free, 0 blue, 1 red), turn, first, ply, last, over, winner, reason, tri, manual }
// Moves: { e } — colour edge e for the player to move; { call: [a, b, c] } — "S-I-M!" (manual rule only).
// Auto rule (default): completing a triangle in your own colour loses on the spot.
// Manual rule (the book's table version): nothing happens until someone calls it. Calling any
// one-colour triangle wins for the caller (your opponent's, or your own the opponent failed to spot);
// calling three dots that are not a one-colour triangle loses.

const N = 6;
const EDGES = [];
const EID = Array.from({ length: N }, () => Array(N).fill(-1));
for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) { EID[a][b] = EID[b][a] = EDGES.length; EDGES.push([a, b]); }
const E = EDGES.length; // 15
const FULL = (1 << E) - 1;

const TRIS = []; // { v: [a,b,c], e: [ab, ac, bc], m: mask }
for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) for (let c = b + 1; c < N; c++) {
  const e = [EID[a][b], EID[a][c], EID[b][c]];
  TRIS.push({ v: [a, b, c], e, m: (1 << e[0]) | (1 << e[1]) | (1 << e[2]) });
}
// For every edge, the masks of the other two edges of each of the 4 triangles through it.
const PAIRS = EDGES.map((_, i) => TRIS.filter((t) => t.m & (1 << i)).map((t) => t.m & ~(1 << i)));

const bits = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
// Would adding edge i to mask m close a triangle?
const closes = (m, i) => PAIRS[i].some((p) => (m & p) === p);

function masks(s) {
  let m0 = 0, m1 = 0;
  s.col.forEach((c, i) => { if (c === 0) m0 |= 1 << i; else if (c === 1) m1 |= 1 << i; });
  return [m0, m1];
}

function create({ first = 0, manual = false } = {}) {
  return { col: Array(E).fill(-1), turn: first, first, ply: 0, last: null, over: false, winner: -1, reason: '', tri: null, manual };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

const freeEdges = (s) => s.col.reduce((a, c, i) => (c < 0 ? (a.push(i), a) : a), []);
// One-colour triangles currently on the board: [{ v, p }]
function monoTris(s) {
  const out = [];
  for (const t of TRIS) {
    const c = s.col[t.e[0]];
    if (c >= 0 && s.col[t.e[1]] === c && s.col[t.e[2]] === c) out.push({ v: t.v, p: c });
  }
  return out;
}
function triOf(a, b, c) {
  const v = [a, b, c].sort((x, y) => x - y);
  return TRIS.find((t) => t.v[0] === v[0] && t.v[1] === v[1] && t.v[2] === v[2]) || null;
}
function monoColor(s, v) {
  const t = triOf(...v);
  if (!t || new Set(v).size < 3) return -1;
  const c = s.col[t.e[0]];
  return c >= 0 && s.col[t.e[1]] === c && s.col[t.e[2]] === c ? c : -1;
}

function isLegal(s, m) {
  if (s.over || !m) return false;
  if (m.call) {
    if (!s.manual || !Array.isArray(m.call) || m.call.length !== 3) return false;
    return m.call.every((v) => Number.isInteger(v) && v >= 0 && v < N) && new Set(m.call).size === 3;
  }
  return Number.isInteger(m.e) && m.e >= 0 && m.e < E && s.col[m.e] < 0;
}

// Applies a legal move; returns s.
function apply(s, m) {
  if (!isLegal(s, m)) throw new Error('illegal move ' + JSON.stringify(m));
  const p = s.turn;
  if (m.call) {
    const c = monoColor(s, m.call);
    s.over = true;
    s.tri = [...m.call].sort((a, b) => a - b);
    s.last = { call: s.tri, p };
    if (c < 0) { s.winner = 1 - p; s.reason = 'false'; }
    else { s.winner = p; s.reason = c === p ? 'stolen' : 'called'; }
    s.ply++;
    return s;
  }
  const [m0, m1] = masks(s);
  const mine = p === 0 ? m0 : m1;
  s.col[m.e] = p;
  s.last = { e: m.e, p };
  s.ply++;
  if (!s.manual && closes(mine, m.e)) {
    s.over = true; s.winner = 1 - p; s.reason = 'triangle';
    s.tri = monoTris(s).find((t) => t.p === p && t.v.includes(EDGES[m.e][0]) && t.v.includes(EDGES[m.e][1])).v;
    return s;
  }
  s.turn = 1 - p;
  return s;
}

// In the manual game a full board still needs a call: the player to move has no edges left.
const mustCall = (s) => s.manual && !s.over && s.col.every((c) => c >= 0);

// ---------- analysis ----------
// Edges the player p may colour without closing one of their own triangles.
function safeEdges(s, p) {
  const mine = masks(s)[p];
  return freeEdges(s).filter((i) => !closes(mine, i));
}

// Exact solver for the auto rule, from the point of view of the player to move.
// Value > 0: the mover wins; |value| = plies until the game ends (shorter wins, longer losses preferred).
const memo = new Map();
function solve(mine, theirs) {
  const key = mine * 32768 + theirs;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const free = FULL & ~(mine | theirs);
  let best = -Infinity;
  let anySafe = false;
  for (let i = 0; i < E; i++) {
    if (!(free & (1 << i)) || closes(mine, i)) continue;
    anySafe = true;
    const v = solve(theirs, mine | (1 << i));
    const me = v > 0 ? -(v + 1) : 1 - v; // negamax with distance
    if (me > best) best = me;
  }
  // No safe edge: every remaining edge closes our triangle (a free edge always exists before a mono triangle forms).
  if (!anySafe) best = free ? -1 : 0;
  memo.set(key, best);
  return best;
}
// Value of each free edge for the mover (positive = winning move).
function moveValues(s) {
  const [m0, m1] = masks(s);
  const mine = s.turn === 0 ? m0 : m1, theirs = s.turn === 0 ? m1 : m0;
  return freeEdges(s).map((i) => {
    if (closes(mine, i)) return { e: i, v: -1 };
    const v = solve(theirs, mine | (1 << i));
    return { e: i, v: v > 0 ? -(v + 1) : 1 - v };
  });
}

// Heuristic score of colouring edge i (for the normal level): keep my own options, spoil theirs.
function heuristic(mine, theirs, i) {
  const free = FULL & ~(mine | theirs) & ~(1 << i);
  const m2 = mine | (1 << i);
  let mySafe = 0, theirSafe = 0;
  for (let j = 0; j < E; j++) {
    if (!(free & (1 << j))) continue;
    if (!closes(m2, j)) mySafe++;
    if (!closes(theirs, j)) theirSafe++;
  }
  // "Reserve" edges: safe for me but poison for the opponent — they can never take those from me.
  let reserve = 0;
  for (let j = 0; j < E; j++) if ((free & (1 << j)) && !closes(m2, j) && closes(theirs, j)) reserve++;
  // Triangles through i that already have an opposing edge are dead for both: cheap to play into.
  let mixed = 0;
  for (const p of PAIRS[i]) if (p & theirs) mixed++;
  return mySafe * 2 - theirSafe * 2 + reserve * 1.5 + mixed * 0.6;
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Computer move for the player to move. level: easy | normal | hard.
function aiMove(s, level = 'normal') {
  if (s.over) return null;
  if (s.manual) {
    const tris = monoTris(s);
    if (tris.length) {
      const spot = level === 'easy' ? 0.55 : level === 'normal' ? 0.9 : 1;
      if (mustCall(s) || Math.random() < spot) return { call: pick(tris).v };
    }
    if (mustCall(s)) return { call: [0, 1, 2] }; // unreachable: a full board always has a mono triangle
  }
  const [m0, m1] = masks(s);
  const mine = s.turn === 0 ? m0 : m1, theirs = s.turn === 0 ? m1 : m0;
  const free = freeEdges(s);
  const safe = free.filter((i) => !closes(mine, i));
  if (!safe.length) return { e: pick(free) };
  if (level === 'easy') {
    // Mostly avoids its own triangles, but now and then draws without looking.
    return { e: Math.random() < 0.8 ? pick(safe) : pick(free) };
  }
  if (level === 'normal') {
    // Exact play once the board is crowded, heuristics (with a little noise) before that.
    if (free.length <= 6) {
      const vals = moveValues(s).filter((x) => safe.includes(x.e));
      const top = Math.max(...vals.map((x) => x.v));
      if (Math.random() < 0.8) return { e: pick(vals.filter((x) => x.v === top)).e };
    }
    const scored = safe.map((i) => ({ e: i, v: heuristic(mine, theirs, i) + Math.random() * 3 }));
    scored.sort((a, b) => b.v - a.v);
    return { e: scored[0].e };
  }
  // hard: perfect play; when lost anyway, stretch the game and pick the most testing move.
  const vals = moveValues(s).filter((x) => safe.includes(x.e));
  const wins = vals.filter((x) => x.v > 0);
  if (wins.length) {
    const fastest = Math.min(...wins.map((x) => x.v));
    // among winning moves keep some variety: any win is fine, prefer the heuristic's favourites
    const ranked = wins.map((x) => ({ ...x, h: heuristic(mine, theirs, x.e) + Math.random() * 2 - (x.v - fastest) * 0.1 }));
    ranked.sort((a, b) => b.h - a.h);
    return { e: ranked[0].e };
  }
  // losing: maximise the number of opponent replies that are mistakes, then the game length
  const ranked = vals.map((x) => {
    const t = clone(s);
    t.col[x.e] = s.turn; t.turn = 1 - s.turn;
    const replies = moveValues(t).filter((y) => !closes(theirs, y.e));
    const good = replies.filter((y) => y.v > 0).length;
    return { e: x.e, k: replies.length ? good / replies.length : 1, len: -x.v, r: Math.random() };
  });
  ranked.sort((a, b) => a.k - b.k || b.len - a.len || a.r - b.r);
  return { e: ranked[0].e };
}

// Is the position (auto rule, mover to play) a forced win for the mover?
function moverWins(s) {
  const [m0, m1] = masks(s);
  return s.turn === 0 ? solve(m0, m1) > 0 : solve(m1, m0) > 0;
}

export const SIM = {
  N, E, EDGES, EID, TRIS, create, clone, freeEdges, monoTris, monoColor, isLegal, apply, mustCall,
  safeEdges, aiMove, moveValues, moverWins, solve, masks, closes, edge: (a, b) => EID[a][b],
};
