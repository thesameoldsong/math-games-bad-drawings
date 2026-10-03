// Corners — pure rules + AI (no DOM).
//
// Board: n×n cells. Each cell is empty (-1) or holds a dot of player 0/1, hollow or shaded.
// A move is either
//   { t: 'dot', i }    — put a hollow dot of your colour on empty cell i, or
//   { t: 'claim', s }  — claim square s (all four corners are yours): shade the corners
//                        (1 point each) and put hollow dots of your colour on the empty cells
//                        inside it (whole area, or just its border in the 'edge' variant).
// Squares are grid-aligned or tilted 45° (diamonds). A claim must change something
// (an unshaded corner or an empty cell to fill). When the board fills up, each player gets
// exactly one more turn, in which only a claim is possible (no claim → the turn is skipped).

const geoCache = new Map();

// All squares of an n×n board, with their corners, filled area and border cells.
function geometry(n) {
  if (geoCache.has(n)) return geoCache.get(n);
  const sq = [];
  const at = (r, c) => r * n + c;
  // grid-aligned: top-left (r, c), side k
  for (let k = 1; k < n; k++) for (let r = 0; r + k < n; r++) for (let c = 0; c + k < n; c++) {
    const corners = [at(r, c), at(r, c + k), at(r + k, c + k), at(r + k, c)];
    const area = [], edge = [];
    for (let y = r; y <= r + k; y++) for (let x = c; x <= c + k; x++) {
      const i = at(y, x);
      if (corners.includes(i)) continue;
      area.push(i);
      if (y === r || y === r + k || x === c || x === c + k) edge.push(i);
    }
    sq.push({ kind: 'grid', size: k, corners, area, edge });
  }
  // diamonds: centre (r, c), half-diagonal a
  for (let a = 1; 2 * a < n; a++) for (let r = a; r + a < n; r++) for (let c = a; c + a < n; c++) {
    const corners = [at(r - a, c), at(r, c + a), at(r + a, c), at(r, c - a)];
    const area = [], edge = [];
    for (let y = r - a; y <= r + a; y++) for (let x = c - a; x <= c + a; x++) {
      const d = Math.abs(y - r) + Math.abs(x - c);
      if (d > a) continue;
      const i = at(y, x);
      if (corners.includes(i)) continue;
      area.push(i);
      if (d === a) edge.push(i);
    }
    sq.push({ kind: 'diamond', size: a, corners, area, edge });
  }
  sq.forEach((s, id) => (s.id = id));
  const byCell = Array.from({ length: n * n }, () => []);
  for (const s of sq) for (const i of s.corners) byCell[i].push(s.id);
  const g = { n, squares: sq, byCell };
  geoCache.set(n, g);
  return g;
}

function create(n = 7, { fill = 'area', first = 0 } = {}) {
  return {
    n, fill,
    owner: Array(n * n).fill(-1),
    shaded: Array(n * n).fill(0),
    turn: first,
    score: [0, 0],
    phase: 'play', // 'play' → 'final' (board full, one claim each) → 'over'
    finalLeft: 0,
    moves: 0,
    claims: [], // { s, p }
    last: null, // { t, i | s, p, gain }
    skipped: [], // players whose final turn was skipped by the last move
    empty: n * n,
  };
}

const clone = (st) => ({
  ...st,
  owner: st.owner.slice(),
  shaded: st.shaded.slice(),
  score: st.score.slice(),
  claims: st.claims.slice(),
  skipped: st.skipped.slice(),
});

const squares = (st) => geometry(st.n).squares;
const fillCells = (st, s) => (st.fill === 'edge' ? s.edge : s.area);

// What claiming square s would give player p, or null if p can't claim it.
function claimGain(st, s, p = st.turn) {
  const sq = typeof s === 'number' ? squares(st)[s] : s;
  let points = 0;
  for (const i of sq.corners) {
    if (st.owner[i] !== p) return null;
    if (!st.shaded[i]) points++;
  }
  let dots = 0;
  for (const i of fillCells(st, sq)) if (st.owner[i] < 0) dots++;
  if (!points && !dots) return null;
  return { points, dots };
}

function claimsFor(st, p = st.turn) {
  const out = [];
  for (const s of squares(st)) {
    const g = claimGain(st, s, p);
    if (g) out.push({ s: s.id, ...g });
  }
  return out;
}
const hasClaim = (st, p) => squares(st).some((s) => claimGain(st, s, p));

// Claimable squares for p that have cell i as a corner, best first.
function claimsAt(st, i, p = st.turn) {
  if (st.owner[i] !== p) return [];
  const g = geometry(st.n);
  return g.byCell[i]
    .map((id) => ({ s: id, g: claimGain(st, id, p) }))
    .filter((x) => x.g)
    .map((x) => ({ s: x.s, ...x.g }))
    .sort((a, b) => b.points + b.dots * 0.5 - (a.points + a.dots * 0.5) || b.s - a.s);
}

function legalMoves(st) {
  if (st.phase === 'over') return [];
  const out = [];
  if (st.phase === 'play') for (let i = 0; i < st.owner.length; i++) if (st.owner[i] < 0) out.push({ t: 'dot', i });
  for (const c of claimsFor(st)) out.push({ t: 'claim', s: c.s });
  return out;
}

function isLegal(st, m) {
  if (!m || st.phase === 'over') return false;
  if (m.t === 'dot') return st.phase === 'play' && Number.isInteger(m.i) && m.i >= 0 && m.i < st.owner.length && st.owner[m.i] < 0;
  if (m.t === 'claim') return Number.isInteger(m.s) && m.s >= 0 && m.s < squares(st).length && !!claimGain(st, m.s);
  return false;
}

// Applies a move in place. Returns false (and changes nothing) if illegal.
function apply(st, m) {
  if (!isLegal(st, m)) return false;
  const p = st.turn;
  if (m.t === 'dot') {
    st.owner[m.i] = p;
    st.empty--;
    st.last = { t: 'dot', i: m.i, p };
  } else {
    const sq = squares(st)[m.s];
    let points = 0, dots = 0;
    for (const i of sq.corners) if (!st.shaded[i]) { st.shaded[i] = 1; points++; }
    for (const i of fillCells(st, sq)) if (st.owner[i] < 0) { st.owner[i] = p; st.empty--; dots++; }
    st.score[p] += points;
    st.claims.push({ s: m.s, p });
    st.last = { t: 'claim', s: m.s, p, points, dots };
  }
  st.moves++;
  st.skipped = [];
  if (st.phase === 'final') st.finalLeft--;
  else if (st.empty === 0) { st.phase = 'final'; st.finalLeft = 2; }
  st.turn = 1 - p;
  while (st.phase === 'final' && st.finalLeft > 0 && !hasClaim(st, st.turn)) {
    st.skipped.push(st.turn);
    st.finalLeft--;
    st.turn = 1 - st.turn;
  }
  if (st.phase === 'final' && st.finalLeft === 0) st.phase = 'over';
  return true;
}

const isOver = (st) => st.phase === 'over';
const winner = (st) => (st.score[0] === st.score[1] ? -1 : st.score[0] > st.score[1] ? 0 : 1);

// ---------- AI ----------

export const W = { hollow: 0.15, two: 0.09, one: 0.015, cashMove: 0.95, cashWait: 0.85, dots: 0.22, thrMove: 1.6, thrMoveX: 0.25, thrFork: 1.4, thrForkX: 0.2, thrOne: 0.35 };

// Static evaluation from player 0's point of view.
function evaluate(st) {
  const { squares: sqs } = geometry(st.n);
  const { owner, shaded, turn } = st;
  let v = st.score[0] - st.score[1];
  let hollow0 = 0, hollow1 = 0;
  for (let i = 0; i < owner.length; i++) if (owner[i] >= 0 && !shaded[i]) owner[i] ? hollow1++ : hollow0++;
  v += W.hollow * (hollow0 - hollow1);
  if (st.phase === 'over') return v;

  const cashable = [new Set(), new Set()]; // hollow corners of claimable squares
  const bestDots = [0, 0];
  const threat = [new Set(), new Set()]; // empty cells that would complete a square
  let shape = 0;
  for (const s of sqs) {
    let m0 = 0, m1 = 0, e = 0, hole = -1;
    for (const i of s.corners) {
      const o = owner[i];
      if (o < 0) { e++; hole = i; } else if (o) m1++; else m0++;
    }
    if (m0 && m1) continue;
    const p = m0 ? 0 : 1, m = m0 || m1, sign = p ? -1 : 1;
    if (m === 4) {
      let dots = 0, any = false;
      for (const i of s.corners) if (!shaded[i]) { cashable[p].add(i); any = true; }
      for (const i of fillCells(st, s)) if (owner[i] < 0) dots++;
      if (any || dots) bestDots[p] = Math.max(bestDots[p], dots);
    } else if (m === 3) {
      threat[p].add(hole);
    } else if (m === 2) shape += sign * W.two;
    else if (m === 1) shape += sign * W.one;
  }
  v += shape;
  for (const p of [0, 1]) {
    const sign = p ? -1 : 1;
    const toMove = turn === p;
    let val = cashable[p].size * (toMove ? W.cashMove : W.cashWait) + bestDots[p] * W.dots;
    if (st.phase === 'play') {
      const t = threat[p].size;
      if (t) val += toMove ? W.thrMove + W.thrMoveX * (t - 1) : t >= 2 ? W.thrFork + W.thrForkX * (t - 2) : W.thrOne;
    }
    v += sign * val;
  }
  return v;
}

// Cheap per-move score used for ordering (and for the easy level).
function quickScore(st, m) {
  const p = st.turn, q = 1 - p;
  if (m.t === 'claim') {
    const g = claimGain(st, m.s, p);
    return 6 + g.points * 2 + g.dots * 0.6;
  }
  const g = geometry(st.n);
  let sc = 0;
  for (const id of g.byCell[m.i]) {
    const s = g.squares[id];
    let mine = 0, theirs = 0;
    for (const i of s.corners) {
      if (i === m.i) continue;
      if (st.owner[i] === p) mine++;
      else if (st.owner[i] === q) theirs++;
    }
    const big = 1 + fillCells(st, s).length * 0.08;
    if (!theirs) sc += [0.1, 0.5, 1.6, 9][mine] * (mine === 3 ? big : 1);
    if (!mine) sc += [0, 0.3, 1.1, 7][theirs] * (theirs === 3 ? big : 1);
  }
  return sc;
}

function candidates(st, width) {
  const moves = legalMoves(st).map((m) => ({ m, q: quickScore(st, m) }));
  moves.sort((a, b) => b.q - a.q);
  const claims = moves.filter((x) => x.m.t === 'claim').slice(0, 5);
  const dots = moves.filter((x) => x.m.t === 'dot').slice(0, width);
  return [...claims, ...dots].map((x) => x.m);
}

function negamax(st, depth, alpha, beta, width) {
  const sign = st.turn === 0 ? 1 : -1;
  if (depth === 0 || st.phase === 'over') return sign * evaluate(st);
  let best = -Infinity;
  for (const m of candidates(st, width)) {
    const c = clone(st);
    apply(c, m);
    // A skipped final turn can leave the same player to move; negamax sign follows the side to move.
    const v = c.turn === st.turn ? negamax(c, depth - 1, alpha, beta, width) : -negamax(c, depth - 1, -beta, -alpha, width);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export const LEVELS = {
  easy: null,
  normal: { depth: 2, rootWidth: 14, width: 8, noise: 0.15 },
  hard: { depth: 4, rootWidth: 16, width: 8, noise: 0.05 },
};

function aiMove(st, level = 'normal', rnd = Math.random) {
  const moves = legalMoves(st);
  if (!moves.length) return null;
  if (level === 'easy') {
    const claims = moves.filter((m) => m.t === 'claim');
    if (claims.length && (st.phase !== 'play' || rnd() < 0.55)) return claims[Math.floor(rnd() * claims.length)];
    const dots = moves.filter((m) => m.t === 'dot');
    if (!dots.length) return claims[0];
    if (rnd() < 0.45) return dots[Math.floor(rnd() * dots.length)];
    const scored = dots.map((m) => ({ m, q: quickScore(st, m) + rnd() * 2.5 })).sort((a, b) => b.q - a.q);
    return scored[0].m;
  }
  const L = LEVELS[level] || LEVELS.normal;
  const me = st.turn;
  let best = null, bv = -Infinity;
  for (const m of candidates(st, L.rootWidth)) {
    const c = clone(st);
    apply(c, m);
    let v = c.turn === me ? negamax(c, L.depth - 1, -Infinity, Infinity, L.width) : -negamax(c, L.depth - 1, -Infinity, Infinity, L.width);
    v += rnd() * L.noise;
    if (v > bv) { bv = v; best = m; }
  }
  return best || moves[0];
}

// Squares that player p "almost" has (three corners + one empty) — used for reactions.
function threatCells(st, p) {
  const out = new Set();
  for (const s of squares(st)) {
    let mine = 0, hole = -1, bad = false;
    for (const i of s.corners) {
      if (st.owner[i] === p) mine++;
      else if (st.owner[i] < 0) hole = i;
      else bad = true;
    }
    if (!bad && mine === 3) out.add(hole);
  }
  return out;
}

export const CORNERS = {
  geometry, create, clone, claimGain, claimsFor, claimsAt, hasClaim, legalMoves, isLegal, apply,
  isOver, winner, evaluate, aiMove, threatCells,
};
