// Order and Chaos: pure game logic + AI. No DOM.
//
// Board: N×N cells (N = 6), cell values: '' empty, 'X', 'O', 'W' (Order's jewel: counts as X and as O),
// 'B' (Chaos's jewel: counts as neither). Roles: 0 = Order, 1 = Chaos. Order moves first.
// Order wins as soon as any five-in-a-row (row, column or diagonal) is all X or all O.
// Chaos wins as soon as no five-cell line can ever become uniform (or the board fills up).

const N = 6, LEN = 5;

// All five-cell windows on the board (32 on a 6×6 board).
const WINDOWS = [];
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const er = r + dr * (LEN - 1), ec = c + dc * (LEN - 1);
    if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
    WINDOWS.push(Array.from({ length: LEN }, (_, k) => (r + dr * k) * N + c + dc * k));
  }
}
const WIN_OF = Array.from({ length: N * N }, () => []);
WINDOWS.forEach((w, i) => w.forEach((cell) => WIN_OF[cell].push(i)));

function create({ jewels = false } = {}) {
  return {
    n: N,
    cells: Array(N * N).fill(''),
    by: Array(N * N).fill(-1),       // role that placed each mark
    turn: 0,                        // role to move: 0 Order, 1 Chaos
    jewelsOn: !!jewels,
    jewels: jewels ? [true, true] : [false, false], // still available: [Order's ⊗, Chaos's ■]
    moves: 0,
    last: null,                      // {i, sym}
    winner: -1,                      // -1 playing, 0 Order, 1 Chaos
    line: null,                      // winning five (cell indices) when Order wins
  };
}
const clone = (s) => ({ ...s, cells: s.cells.slice(), by: s.by.slice(),jewels: s.jewels.slice(), line: s.line && s.line.slice() });

// Symbols the side to move may place right now.
function symbols(s) {
  const out = ['X', 'O'];
  if (s.turn === 0 && s.jewels[0]) out.push('W');
  if (s.turn === 1 && s.jewels[1]) out.push('B');
  return out;
}
function legal(s, m) {
  return s.winner < 0 && Number.isInteger(m?.i) && m.i >= 0 && m.i < N * N && s.cells[m.i] === '' && symbols(s).includes(m.sym);
}
function moves(s) {
  if (s.winner >= 0) return [];
  const syms = symbols(s), out = [];
  for (let i = 0; i < N * N; i++) if (s.cells[i] === '') for (const sym of syms) out.push({ i, sym });
  return out;
}

// Window status: progress toward X and O (-1 = that colour is blocked there).
function win(cells, w) {
  let x = 0, o = 0, wild = 0, b = false;
  for (const i of w) {
    const v = cells[i];
    if (v === 'X') x++; else if (v === 'O') o++; else if (v === 'W') wild++; else if (v === 'B') b = true;
  }
  return { px: b || o ? -1 : x + wild, po: b || x ? -1 : o + wild };
}
const alive = (cells, w) => { const q = win(cells, w); return q.px >= 0 || q.po >= 0; };
function fiveOf(cells) {
  for (const w of WINDOWS) { const q = win(cells, w); if (q.px === LEN || q.po === LEN) return w; }
  return null;
}
const anyAlive = (cells) => WINDOWS.some((w) => alive(cells, w));
const empties = (s) => s.cells.reduce((n, v) => n + (v === ''), 0);

// Mutates s. Returns s.
function apply(s, m) {
  s.cells[m.i] = m.sym;
  s.by[m.i] = s.turn;
  if (m.sym === 'W') s.jewels[0] = false;
  if (m.sym === 'B') s.jewels[1] = false;
  s.moves++;
  s.last = { i: m.i, sym: m.sym };
  const five = fiveOf(s.cells);
  if (five) { s.winner = 0; s.line = five; }
  else if (!anyAlive(s.cells)) s.winner = 1;
  else s.turn = 1 - s.turn;
  return s;
}
const isOver = (s) => s.winner >= 0;
// Book scoring: 5 for the win + 1 per blank square at the moment the game was decided.
const points = (s) => (s.winner < 0 ? 0 : 5 + empties(s));

// Best progress over windows that are still alive (0..5) — used for reactions.
function bestRun(s) {
  let best = 0;
  for (const w of WINDOWS) { const q = win(s.cells, w); best = Math.max(best, q.px, q.po); }
  return best;
}
const liveCount = (s) => WINDOWS.reduce((n, w) => n + alive(s.cells, w), 0);

// Cells where placing a symbol completes a five: [{i, sym}] (sym 'X' or 'O').
function threats(cells) {
  const out = [], seen = new Set();
  for (const w of WINDOWS) {
    const q = win(cells, w);
    for (const [p, sym] of [[q.px, 'X'], [q.po, 'O']]) {
      if (p !== LEN - 1) continue;
      const i = w.find((c) => cells[c] === '');
      if (i === undefined) continue;
      const k = i + sym;
      if (!seen.has(k)) { seen.add(k); out.push({ i, sym }); }
    }
  }
  return out;
}

// ---------- AI ----------
const WIN = 1e6;
const WEIGHT = [1, 3, 10, 40, 160];

// Static evaluation from Order's point of view; s is not over.
function evaluate(s) {
  const tr = threats(s.cells);
  if (tr.length) {
    if (s.turn === 0) return WIN / 2;
    // Chaos to move can kill one cell (with the other symbol, or the ■ anywhere).
    const cells = new Set(tr.map((t) => t.i));
    if (cells.size > 1) return WIN / 3;
    const both = tr.length > 1; // the same cell finishes an X-five and an O-five
    if (both && !s.jewels[1]) return WIN / 3;
  }
  let v = 0, live = 0;
  for (const w of WINDOWS) {
    const q = win(s.cells, w);
    if (q.px < 0 && q.po < 0) continue;
    live++;
    const p = Math.max(q.px, q.po);
    v += WEIGHT[p] * (q.px >= 0 && q.po >= 0 ? 1.3 : 1);
  }
  if (!live) return -WIN / 2;
  v += tr.length * 60;
  // Room to work: a few spare empties make every live line more valuable for Order.
  v += live * 2;
  if (s.jewels[0]) v += 25;
  if (s.jewels[1]) v -= 25;
  return v;
}

function terminal(s, depth) {
  return s.winner === 0 ? WIN + depth : -WIN - depth;
}

function orderedMoves(s, keep) {
  const ms = moves(s).map((m) => {
    const x = clone(s); apply(x, m);
    return { m, v: x.winner >= 0 ? terminal(x, 0) : evaluate(x) };
  });
  ms.sort((a, b) => (s.turn === 0 ? b.v - a.v : a.v - b.v));
  return keep ? ms.slice(0, keep) : ms;
}

function search(s, depth, alpha, beta, keep) {
  if (s.winner >= 0) return terminal(s, depth);
  if (depth === 0) return evaluate(s);
  const max = s.turn === 0;
  let best = max ? -Infinity : Infinity;
  for (const { m } of orderedMoves(s, keep)) {
    const x = clone(s); apply(x, m);
    const v = search(x, depth - 1, alpha, beta, keep);
    if (max) { if (v > best) best = v; if (best > alpha) alpha = best; }
    else { if (v < best) best = v; if (best < beta) beta = best; }
    if (alpha >= beta) break;
  }
  return best;
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function aiMove(s, level = 'normal') {
  const all = moves(s);
  if (!all.length) return null;
  const me = s.turn;
  // Never waste a jewel on the first few moves.
  const ok = (m) => s.moves >= 6 || m.sym === 'X' || m.sym === 'O';

  if (level === 'easy') {
    const scored = orderedMoves(s);
    const best = scored[0];
    if (Math.abs(best.v) >= WIN && Math.random() < 0.85) return best.m; // obvious win
    const safe = scored.filter((x) => (me === 0 ? x.v > -WIN / 4 : x.v < WIN / 4) && ok(x.m));
    if (Math.random() < 0.5 && safe.length) return safe[Math.floor(Math.random() * Math.min(6, safe.length))].m;
    return pick(safe.length ? safe : scored).m;
  }

  const depth = level === 'hard' ? 3 : 2, keep = level === 'hard' ? 14 : 10;
  const cand = orderedMoves(s, level === 'hard' ? 24 : 16).filter((x) => ok(x.m));
  let scored = [];
  for (const { m } of cand) {
    const x = clone(s); apply(x, m);
    scored.push({ m, v: search(x, depth - 1, -Infinity, Infinity, keep) });
  }
  if (!scored.length) return pick(all);
  const sign = me === 0 ? 1 : -1;
  scored.sort((a, b) => sign * (b.v - a.v));
  const top = scored[0].v;
  const slack = level === 'hard' ? 2 : 12;
  const near = scored.filter((x) => Math.abs(x.v - top) <= slack);
  return pick(near).m;
}

export const OAC = {
  N, LEN, WINDOWS, create, clone, symbols, legal, moves, apply, isOver, points, empties,
  fiveOf, anyAlive, alive, bestRun, liveCount, threats, evaluate, aiMove,
};
