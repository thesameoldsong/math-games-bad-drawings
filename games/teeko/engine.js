// Teeko: pure game logic + AI. No DOM.
// Board: 5×5 cells, index i = r * 5 + c; value -1 empty, 0 blue, 1 red.
// Drop phase: each player places 4 tokens. Move phase: step one own token to an adjacent
// (8 directions) empty cell. Win: 4 in a row (any direction) or the 4 corners of an upright
// square (any size in "advanced", only 2×2 in "classic"). Same position 3× in the move phase → draw.

const N = 5, CELLS = N * N, PIECES = 4;
const rowOf = (i) => Math.floor(i / N);
const colOf = (i) => i % N;
const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

const NEIGH = Array.from({ length: CELLS }, (_, i) => {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const r = rowOf(i) + dr, c = colOf(i) + dc;
    if (inside(r, c)) out.push(r * N + c);
  }
  return out;
});

const ALL = [];
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    if (!inside(r + 3 * dr, c + 3 * dc)) continue;
    ALL.push({ kind: 'line', size: 0, cells: [0, 1, 2, 3].map((k) => (r + k * dr) * N + c + k * dc) });
  }
}
for (let k = 1; k < N; k++) for (let r = 0; r + k < N; r++) for (let c = 0; c + k < N; c++) {
  ALL.push({ kind: 'square', size: k, cells: [r * N + c, r * N + c + k, (r + k) * N + c, (r + k) * N + c + k] });
}
const PATTERNS = { advanced: ALL, classic: ALL.filter((p) => p.kind === 'line' || p.size === 1) };
const BY_CELL = {};
for (const v of ['advanced', 'classic']) {
  BY_CELL[v] = Array.from({ length: CELLS }, (_, i) => PATTERNS[v].filter((p) => p.cells.includes(i)));
}
const variantOf = (s) => (s.classic ? 'classic' : 'advanced');

function create({ first = 0, classic = false } = {}) {
  return {
    b: Array(CELLS).fill(-1), turn: first, first, placed: [0, 0], ply: 0,
    classic: !!classic,
    last: null, winner: -1, win: null, draw: false, rep: {},
  };
}
const clone = (s) => ({
  ...s, b: s.b.slice(), placed: s.placed.slice(), rep: { ...s.rep },
  last: s.last && { ...s.last }, win: s.win && { ...s.win, cells: s.win.cells.slice() },
});

const phaseOf = (s, p = s.turn) => (s.placed[p] < PIECES ? 'drop' : 'move');
const isOver = (s) => s.winner >= 0 || s.draw;
const posKey = (s) => s.b.map((v) => v + 1).join('') + s.turn;

// Moves for player p (defaults to the side to move), ignoring whether the game is over.
function movesFor(s, p = s.turn) {
  const out = [];
  if (phaseOf(s, p) === 'drop') {
    for (let i = 0; i < CELLS; i++) if (s.b[i] < 0) out.push({ to: i });
  } else {
    for (let i = 0; i < CELLS; i++) {
      if (s.b[i] !== p) continue;
      for (const j of NEIGH[i]) if (s.b[j] < 0) out.push({ from: i, to: j });
    }
  }
  return out;
}
const legalMoves = (s) => (isOver(s) ? [] : movesFor(s));
const sameMove = (a, b) => a.to === b.to && (a.from ?? -1) === (b.from ?? -1);
const isLegal = (s, m) => !!m && legalMoves(s).some((x) => sameMove(x, m));

// The pattern p completes through cell `at` on board b (or null).
function winThrough(b, p, at, variant) {
  for (const pat of BY_CELL[variant][at]) if (pat.cells.every((i) => b[i] === p)) return pat;
  return null;
}
function findWin(b, p, variant) {
  for (const pat of PATTERNS[variant]) if (pat.cells.every((i) => b[i] === p)) return pat;
  return null;
}

// Mutates s.
function apply(s, m) {
  const who = s.turn;
  if (m.from !== undefined && m.from >= 0) s.b[m.from] = -1;
  else s.placed[who]++;
  s.b[m.to] = who;
  s.ply++;
  s.last = { from: m.from ?? -1, to: m.to, who };
  const w = winThrough(s.b, who, m.to, variantOf(s));
  if (w) { s.winner = who; s.win = { kind: w.kind, size: w.size, cells: w.cells.slice() }; return s; }
  s.turn = 1 - who;
  if (s.placed[0] === PIECES && s.placed[1] === PIECES) {
    const k = posKey(s);
    s.rep[k] = (s.rep[k] || 0) + 1;
    if (s.rep[k] >= 3) { s.draw = true; s.reason = 'repeat'; }
  }
  if (!s.draw && !movesFor(s).length) { s.draw = true; s.reason = 'stuck'; }
  return s;
}

// Moves that would win at once for player p, if it were p's turn: [{move, cells}].
function winningMoves(s, p) {
  const out = [], v = variantOf(s), b = s.b.slice();
  for (const m of movesFor(s, p)) {
    if (m.from !== undefined) b[m.from] = -1;
    b[m.to] = p;
    const w = winThrough(b, p, m.to, v);
    if (w) out.push({ move: m, cells: w.cells.slice() });
    b[m.to] = -1;
    if (m.from !== undefined) b[m.from] = p;
  }
  return out;
}

// ---------- AI ----------
const WIN = 100000;
const W3 = [0, 1, 6, 30];       // value of a pattern holding 1/2/3 of my tokens and none of theirs
const CENTER = Array.from({ length: CELLS }, (_, i) => 2 - Math.max(Math.abs(rowOf(i) - 2), Math.abs(colOf(i) - 2)));

function evaluate(b, p, variant) {
  let sc = 0;
  for (const pat of PATTERNS[variant]) {
    let mine = 0, theirs = 0;
    for (const i of pat.cells) { const v = b[i]; if (v === p) mine++; else if (v >= 0) theirs++; }
    if (!theirs) sc += W3[mine] || 0;
    else if (!mine) sc -= W3[theirs] || 0;
  }
  for (let i = 0; i < CELLS; i++) if (b[i] >= 0) sc += (b[i] === p ? 1 : -1) * CENTER[i];
  return sc;
}

// Lightweight search position: {b, turn, placed}.
function genMoves(b, p, placed) {
  const out = [];
  if (placed[p] < PIECES) {
    for (let i = 0; i < CELLS; i++) if (b[i] < 0) out.push(-1, i);
  } else {
    for (let i = 0; i < CELLS; i++) {
      if (b[i] !== p) continue;
      for (const j of NEIGH[i]) if (b[j] < 0) out.push(i, j);
    }
  }
  return out; // flat pairs from, to
}

function makeSearch(variant, deadline) {
  const tt = new Map();
  let nodes = 0, aborted = false;
  function negamax(b, p, placed, depth, alpha, beta, ply) {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) aborted = true;
    if (aborted) return 0;
    if (depth === 0) return evaluate(b, p, variant);
    const key = b.join(',') + p;
    const hit = tt.get(key);
    if (hit && hit.depth >= depth) {
      if (hit.flag === 0) return hit.v;
      if (hit.flag === 1 && hit.v >= beta) return hit.v;
      if (hit.flag === -1 && hit.v <= alpha) return hit.v;
    }
    const mv = genMoves(b, p, placed);
    if (!mv.length) return 0;
    // ordering: tt best first, then by centrality of the target
    const idx = [];
    for (let k = 0; k < mv.length; k += 2) idx.push(k);
    const best0 = hit ? hit.best : -1;
    idx.sort((x, y) => (y === best0) - (x === best0) || CENTER[mv[y + 1]] - CENTER[mv[x + 1]]);
    const a0 = alpha;
    let best = -Infinity, bestK = idx[0];
    for (const k of idx) {
      const from = mv[k], to = mv[k + 1];
      if (from >= 0) b[from] = -1; else placed[p]++;
      b[to] = p;
      let v;
      if (winThrough(b, p, to, variant)) v = WIN - ply;
      else v = -negamax(b, 1 - p, placed, depth - 1, -beta, -alpha, ply + 1);
      b[to] = -1;
      if (from >= 0) b[from] = p; else placed[p]--;
      if (aborted) return 0;
      if (v > best) { best = v; bestK = k; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    tt.set(key, { depth, v: best, flag: best <= a0 ? -1 : best >= beta ? 1 : 0, best: bestK });
    return best;
  }
  // Scores root moves. With exact=true every move gets a true score (for "pick among the
  // nearly best"); otherwise moves are searched with a shrinking window and only the best is exact.
  function root(s, depth, moves, exact) {
    const b = s.b.slice(), placed = s.placed.slice(), p = s.turn;
    const out = [];
    let alpha = -WIN - 1;
    for (const m of moves) {
      if (m.from !== undefined) b[m.from] = -1; else placed[p]++;
      b[m.to] = p;
      let v;
      if (winThrough(b, p, m.to, variant)) v = WIN;
      else v = -negamax(b, 1 - p, placed, depth - 1, -WIN - 1, exact ? WIN + 1 : -alpha, 1);
      b[m.to] = -1;
      if (m.from !== undefined) b[m.from] = p; else placed[p]--;
      if (aborted) return null;
      if (!exact && v <= alpha) v = -Infinity;   // only a bound: worse than the best so far
      else if (v > alpha) alpha = v;
      out.push({ m, v });
    }
    return out;
  }
  return { root, get nodes() { return nodes; } };
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
function pickTop(scored, slack) {
  const top = Math.max(...scored.map((x) => x.v));
  return pick(scored.filter((x) => x.v >= top - slack)).m;
}

const LEVELS = {
  easy: { depth: 1, slack: 0 },
  normal: { depth: 4, slack: 2 },
  hard: { depth: 9, slack: 0, time: 700 },
};

function aiMove(s, level = 'normal', opts = {}) {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  const variant = variantOf(s), me = s.turn;
  if (level === 'easy') {
    const wins = winningMoves(s, me);
    if (wins.length && Math.random() < 0.8) return wins[0].move;
    const threats = winningMoves(s, 1 - me);
    if (threats.length && Math.random() < 0.5) {
      const blocks = moves.filter((m) => threats.some((t) => t.move.to === m.to));
      if (blocks.length) return pick(blocks);
    }
    // shallow and noisy
    const scored = moves.map((m) => {
      const x = clone(s); apply(x, m);
      return { m, v: evaluate(x.b, me, variant) + Math.random() * 14 };
    });
    return pickTop(scored, 0);
  }
  const L = LEVELS[level] || LEVELS.normal;
  const time = opts.time ?? L.time ?? 1e9;
  const maxDepth = opts.depth ?? L.depth;
  const search = makeSearch(variant, Date.now() + time);
  const exact = L.slack > 0;
  let order = moves.slice().sort(() => Math.random() - 0.5);
  let best = null;
  for (let d = 1; d <= maxDepth; d++) {
    const r = search.root(s, d, order, exact);
    if (!r) break;
    best = r;
    order = r.slice().sort((x, y) => y.v - x.v).map((x) => x.m);
    if (r.some((x) => x.v >= WIN - 50)) break;          // found a forced win
    if (r.every((x) => x.v <= -WIN + 50)) break;         // everything loses
  }
  if (!best) best = moves.map((m) => ({ m, v: 0 }));
  // Losing anyway? Prefer the move that delays the loss most (already highest score).
  return pickTop(best, L.slack);
}

export const TEEKO = {
  N, CELLS, PIECES, NEIGH, PATTERNS, rowOf, colOf,
  create, clone, phaseOf, isOver, legalMoves, movesFor, isLegal, sameMove, apply,
  findWin, winningMoves, evaluate, aiMove, posKey,
};
