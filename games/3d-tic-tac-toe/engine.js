// 3D Tic-Tac-Toe (4 × 4 × 4, "Qubic"): pure game logic + AI. No DOM.
// Cell index i = z*16 + y*4 + x; z = layer (0 = top, 3 = bottom), y = row, x = column.
// Board b[i]: -1 empty, 0 = player 0 (X), 1 = player 1 (O).
// Gravity variant ("3D Connect Four"): a mark goes on the bottom layer or right above an existing mark.

const N = 4, CELLS = 64;
const idx = (x, y, z) => z * 16 + y * 4 + x;
const coords = (i) => ({ x: i % 4, y: (i >> 2) % 4, z: i >> 4 });

// All 76 winning lines.
const LINES = [];
{
  const inb = (v) => v >= 0 && v < N;
  for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    // keep one direction of each pair: first non-zero component positive
    const first = dz || dy || dx;
    if (first <= 0) continue;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (inb(x - dx) && inb(y - dy) && inb(z - dz)) continue; // not a line start
      if (!inb(x + 3 * dx) || !inb(y + 3 * dy) || !inb(z + 3 * dz)) continue;
      LINES.push([0, 1, 2, 3].map((k) => idx(x + k * dx, y + k * dy, z + k * dz)));
    }
  }
}
const LINES_AT = Array.from({ length: CELLS }, () => []);
LINES.forEach((L, li) => L.forEach((i) => LINES_AT[i].push(li)));
// A line is "cross-layer" when its cells sit on different layers.
const crossLayer = (li) => (LINES[li][0] >> 4) !== (LINES[li][3] >> 4);

function create({ gravity = false, first = 0 } = {}) {
  return { b: Array(CELLS).fill(-1), turn: first, first, moves: 0, gravity: !!gravity, over: false, winner: -1, line: -1, last: -1 };
}
const clone = (s) => ({ ...s, b: s.b.slice() });

const legalCell = (b, g, i) => b[i] === -1 && (!g || i >= 48 || b[i + 16] !== -1);
const canPlay = (s, i) => !s.over && Number.isInteger(i) && i >= 0 && i < CELLS && legalCell(s.b, s.gravity, i);
function legalMoves(s) {
  const out = [];
  if (s.over) return out;
  for (let i = 0; i < CELLS; i++) if (legalCell(s.b, s.gravity, i)) out.push(i);
  return out;
}

function lineAt(b, i, p) {
  for (const li of LINES_AT[i]) if (LINES[li].every((j) => b[j] === p)) return li;
  return -1;
}

// Mutates s. Returns false for an illegal move.
function apply(s, i) {
  if (!canPlay(s, i)) return false;
  const p = s.turn;
  s.b[i] = p;
  s.moves++;
  s.last = i;
  const li = lineAt(s.b, i, p);
  if (li >= 0) { s.over = true; s.winner = p; s.line = li; }
  else if (s.moves === CELLS) { s.over = true; s.winner = -1; }
  else s.turn = 1 - p;
  return true;
}

// Cells where p would complete a line right now (only cells p may legally play).
function winCellsB(b, g, p) {
  const out = [];
  for (const L of LINES) {
    let mine = 0, empty = -1, ne = 0;
    for (const j of L) { if (b[j] === p) mine++; else if (b[j] === -1) { ne++; empty = j; } }
    if (mine === 3 && ne === 1 && legalCell(b, g, empty) && !out.includes(empty)) out.push(empty);
  }
  return out;
}
const winCells = (s, p) => winCellsB(s.b, s.gravity, p);

// Lines with three of p's marks and an empty fourth cell (even if not yet playable under gravity).
function threats(s, p) {
  const out = [];
  for (let li = 0; li < LINES.length; li++) {
    let mine = 0, ne = 0, empty = -1;
    for (const j of LINES[li]) { if (s.b[j] === p) mine++; else if (s.b[j] === -1) { ne++; empty = j; } }
    if (mine === 3 && ne === 1) out.push({ line: li, cell: empty });
  }
  return out;
}

// ---------- AI ----------
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ATK = [1, 6, 40, 100000];
const DEF = [0.5, 4, 30, 50000];

function heuristic(b, g, p, i) {
  const o = 1 - p;
  let v = 0;
  for (const li of LINES_AT[i]) {
    let mine = 0, theirs = 0;
    for (const j of LINES[li]) { if (b[j] === p) mine++; else if (b[j] === o) theirs++; }
    if (!theirs) v += ATK[mine];
    if (!mine) v += DEF[theirs];
  }
  b[i] = p;
  const myWins = winCellsB(b, g, p).length;
  if (myWins >= 2) v += 5000;
  if (g) {
    // under gravity, the cell above becomes playable: don't hand it over
    const oppWins = winCellsB(b, g, o).length;
    if (oppWins) v -= 20000 * oppWins;
    if (i >= 16 && b[i - 16] === -1) {
      for (const li of LINES_AT[i - 16]) {
        let mine = 0, theirs = 0;
        for (const j of LINES[li]) { if (b[j] === p) mine++; else if (b[j] === o) theirs++; }
        if (mine === 3 && !theirs) v -= 300; // my own threat becomes blockable
      }
    }
  }
  b[i] = -1;
  return v;
}

function ranked(s, p) {
  const moves = legalMoves(s);
  return moves.map((i) => ({ i, v: heuristic(s.b, s.gravity, p, i) + Math.random() * 0.9 })).sort((a, c) => c.v - a.v);
}

// Threat-space search: can p (to move) force a win by a chain of threats?
// Returns the first move of such a chain, or -1. `budget` = { n } nodes left.
function forced(b, g, p, depth, budget) {
  const o = 1 - p;
  const mine = winCellsB(b, g, p);
  if (mine.length) return mine[0];
  if (depth <= 0 || --budget.n <= 0) return -1;
  const theirs = winCellsB(b, g, o);
  if (theirs.length > 1) return -1;
  let cands;
  if (theirs.length === 1) cands = theirs;
  else {
    // moves that make a line of three with an empty fourth cell
    const set = new Set();
    for (const L of LINES) {
      let m = 0, e = 0;
      for (const j of L) { if (b[j] === p) m++; else if (b[j] === -1) e++; }
      if (m === 2 && e === 2) for (const j of L) if (b[j] === -1 && legalCell(b, g, j)) set.add(j);
    }
    cands = [...set];
  }
  for (const m of cands) {
    b[m] = p;
    let ok = false;
    const w = winCellsB(b, g, p);
    if (w.length && !winCellsB(b, g, o).length) {
      if (w.length >= 2) ok = true;
      else {
        b[w[0]] = o; // forced block
        ok = forced(b, g, p, depth - 1, budget) >= 0;
        b[w[0]] = -1;
      }
    }
    b[m] = -1;
    if (ok) return m;
    if (budget.n <= 0) break;
  }
  return -1;
}

// Static evaluation from p's point of view: open lines weighted by how full they are.
const LINE_W = [0, 1, 7, 50];
function evaluate(b, g, p) {
  let v = 0;
  for (const L of LINES) {
    let a = 0, c = 0;
    for (const j of L) { if (b[j] === p) a++; else if (b[j] !== -1) c++; }
    if (a && !c) v += LINE_W[a];
    else if (c && !a) v -= LINE_W[c];
  }
  return v;
}

// Cheap move-ordering score (no look-ahead).
function quick(b, p, i) {
  let v = 0;
  for (const li of LINES_AT[i]) {
    let mine = 0, theirs = 0;
    for (const j of LINES[li]) { if (b[j] === p) mine++; else if (b[j] !== -1) theirs++; }
    if (!theirs) v += ATK[mine];
    if (!mine) v += DEF[theirs];
  }
  return v;
}

// Plain alpha-beta over the K most promising moves (negamax).
function negamax(b, g, p, depth, alpha, beta, K, budget) {
  const o = 1 - p;
  if (winCellsB(b, g, p).length) return 1e6 + depth; // p wins next move
  if (depth === 0 || --budget.n <= 0) return evaluate(b, g, p);
  const block = winCellsB(b, g, o);
  if (block.length > 1) return -1e6 - depth;
  let moves;
  if (block.length) moves = block;
  else {
    moves = [];
    for (let i = 0; i < CELLS; i++) if (legalCell(b, g, i)) moves.push(i);
    if (!moves.length) return 0;
    moves = moves.map((i) => [i, quick(b, p, i)]).sort((x, y) => y[1] - x[1]).slice(0, K).map((x) => x[0]);
  }
  let best = -Infinity;
  for (const m of moves) {
    b[m] = p;
    const v = -negamax(b, g, o, depth - 1, -beta, -alpha, K, budget);
    b[m] = -1;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function aiMove(s, level = 'normal') {
  const p = s.turn, o = 1 - p, b = s.b.slice(), g = s.gravity;
  const moves = legalMoves(s);
  if (!moves.length) return -1;
  const win = winCellsB(b, g, p), block = winCellsB(b, g, o);

  if (level === 'easy') {
    if (win.length && Math.random() < 0.8) return pick(win);
    if (block.length && Math.random() < 0.55) return pick(block);
    return Math.random() < 0.45 ? ranked(s, p)[0].i : pick(moves);
  }

  if (win.length) return win[0];
  if (block.length) return block[0];

  const order = ranked(s, p);
  // never hand the opponent an immediate win (matters under gravity)
  const safe = order.filter(({ i }) => { b[i] = p; const bad = winCellsB(b, g, o).length > 0; b[i] = -1; return !bad; });
  const pool = safe.length ? safe : order;

  const hard = level === 'hard';
  const atk = forced(b, g, p, hard ? 12 : 3, { n: hard ? 60000 : 1500 });
  if (atk >= 0) return atk;

  if (hard) {
    // Look a few plies ahead; then make sure the chosen move doesn't allow a forced threat chain.
    const K = g ? 16 : 10, depth = g ? 6 : 4, budget = { n: g ? 60000 : 40000 };
    const scored = [];
    let alpha = -Infinity;
    for (const { i } of pool.slice(0, K)) {
      b[i] = p;
      const v = -negamax(b, g, o, depth - 1, -Infinity, -alpha + 1, K, budget);
      b[i] = -1;
      scored.push({ i, v });
      if (v > alpha) alpha = v;
    }
    scored.sort((x, y) => y.v - x.v);
    for (const { i } of scored.slice(0, 6)) {
      b[i] = p;
      const bad = forced(b, g, o, 8, { n: 4000 }) >= 0;
      b[i] = -1;
      if (!bad) return i;
    }
    return scored[0].i;
  }

  // Normal: avoid moves that leave the opponent a short forced win.
  const depth = 2, per = 300;
  const oppStart = forced(b, g, o, depth, { n: per * 2 });
  if (oppStart < 0) return pool[0].i;
  const cands = pool.slice(0, 5).map((x) => x.i);
  if (!cands.includes(oppStart) && pool.some((x) => x.i === oppStart)) cands.unshift(oppStart);
  for (const i of cands) {
    b[i] = p;
    const bad = forced(b, g, o, depth, { n: per }) >= 0;
    b[i] = -1;
    if (!bad) return i;
  }
  return pool[0].i;
}

export const Q3 = {
  N, CELLS, LINES, LINES_AT, idx, coords, crossLayer,
  create, clone, legalMoves, canPlay, apply, winCells, threats, aiMove,
};
