// Quantum Tic-Tac-Toe: pure game logic + AI. No DOM.
//
// Cells 0..8 (row-major). A "spooky" mark n (n = 1, 2, … in move order) sits in two cells a, b at once.
// Marks are edges of an entanglement graph on the non-classical cells. When a new mark closes a loop,
// the player who did NOT close it picks which of its two cells the new mark takes; that forces every
// mark in the loop (and every mark hanging off it) into a single cell — they become classical.
//
// State: { cls[9]: null | {p, n}, marks: [{p, n, a, b, at}], turn, first, phase: 'place' | 'collapse',
//          pending: n | null, ply, coin, over, result, last }
// Moves: { t: 'place', a, b }   |   { t: 'collapse', c }

export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function create({ first = 0, coin = false } = {}) {
  return {
    cls: Array(9).fill(null), marks: [], turn: first, first, phase: 'place', pending: null,
    ply: 0, coin: !!coin, over: false, result: null, last: null,
  };
}
const clone = (s) => ({
  ...s,
  cls: s.cls.map((x) => (x ? { ...x } : null)),
  marks: s.marks.map((m) => ({ ...m })),
  result: s.result && { ...s.result, pts: s.result.pts.slice(), lines: s.result.lines.map((l) => ({ ...l, cells: l.cells.slice() })) },
  last: s.last && { ...s.last },
});

const sym = (s, p) => (p === s.first ? 'X' : 'O');
const freeCells = (s) => { const o = []; for (let i = 0; i < 9; i++) if (!s.cls[i]) o.push(i); return o; };
const open = (s) => s.marks.filter((m) => m.at < 0);
const markN = (s, n) => s.marks[n - 1];
const other = (m, c) => (m.a === c ? m.b : m.a);

// Path a → b through unresolved marks (optionally skipping one mark). Returns {cells, marks} or null.
function path(s, a, b, skip = -1) {
  const prev = new Map([[a, null]]), q = [a], ms = open(s).filter((m) => m.n !== skip);
  while (q.length) {
    const c = q.shift();
    if (c === b) break;
    for (const m of ms) {
      if (m.a !== c && m.b !== c) continue;
      const d = other(m, c);
      if (!prev.has(d)) { prev.set(d, { c, n: m.n }); q.push(d); }
    }
  }
  if (!prev.has(b)) return null;
  const cells = [b], marks = [];
  for (let x = prev.get(b); x; x = prev.get(x.c)) { cells.push(x.c); marks.push(x.n); }
  return { cells, marks };
}
const connected = (s, a, b) => a === b || !!path(s, a, b);

// The loop that is waiting to collapse: its cells and marks (pending mark included).
function cycle(s) {
  if (s.phase !== 'collapse') return null;
  const m = markN(s, s.pending), p = path(s, m.a, m.b, m.n);
  return { cells: p.cells, marks: [...p.marks, m.n] };
}

function legalMoves(s) {
  if (s.over) return [];
  if (s.phase === 'collapse') { const m = markN(s, s.pending); return [{ t: 'collapse', c: m.a }, { t: 'collapse', c: m.b }]; }
  const f = freeCells(s), out = [];
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) out.push({ t: 'place', a: f[i], b: f[j] });
  return out;
}
function isLegal(s, mv) {
  if (!mv || s.over) return false;
  if (s.phase === 'collapse') { const m = markN(s, s.pending); return mv.t === 'collapse' && (mv.c === m.a || mv.c === m.b); }
  return mv.t === 'place' && Number.isInteger(mv.a) && Number.isInteger(mv.b) && mv.a !== mv.b &&
    mv.a >= 0 && mv.a < 9 && mv.b >= 0 && mv.b < 9 && !s.cls[mv.a] && !s.cls[mv.b];
}

function checkEnd(s) {
  const lines = [];
  for (const L of LINES) {
    const [x, y, z] = L.map((i) => s.cls[i]);
    if (x && y && z && x.p === y.p && y.p === z.p) lines.push({ p: x.p, cells: L.slice(), max: Math.max(x.n, y.n, z.n) });
  }
  const pts = [0, 1].map((p) => Math.min(2, lines.filter((l) => l.p === p).length));
  const free = freeCells(s).length;
  if (lines.length || free < 2) {
    s.over = true;
    const winners = [0, 1].filter((p) => pts[p] > 0);
    s.result = { lines, pts, winners, draw: !winners.length };
  }
}

// Collapse the pending mark into cell c and resolve everything it forces. Returns the list of cells that became classical.
function collapse(s, c) {
  const done = [], q = [[markN(s, s.pending), c]];
  while (q.length) {
    const [m, cell] = q.shift();
    if (m.at >= 0) continue;
    if (s.cls[cell]) throw new Error('collapse conflict');
    m.at = cell;
    s.cls[cell] = { p: m.p, n: m.n };
    done.push(cell);
    for (const m2 of s.marks) if (m2.at < 0 && (m2.a === cell || m2.b === cell)) q.push([m2, other(m2, cell)]);
  }
  return done;
}

// Mutates s. Returns {cycle: bool} for placements, {cells: [...]} for collapses.
function apply(s, mv) {
  if (!isLegal(s, mv)) throw new Error('illegal move ' + JSON.stringify(mv));
  s.ply++;
  if (mv.t === 'place') {
    const loop = connected(s, mv.a, mv.b);
    const n = s.marks.length + 1;
    s.marks.push({ p: s.turn, n, a: mv.a, b: mv.b, at: -1 });
    s.last = { t: 'place', n, p: s.turn };
    s.turn = 1 - s.turn;
    if (loop) { s.phase = 'collapse'; s.pending = n; }
    return { cycle: loop };
  }
  const cells = collapse(s, mv.c);
  s.last = { t: 'collapse', n: s.pending, p: s.turn, cells };
  s.phase = 'place'; s.pending = null;
  checkEnd(s);
  return { cells };
}

// Where each mark would land for a given collapse choice (for previews): [{cell, p, n}].
function previewCollapse(s, c) {
  const x = clone(s), cells = collapse(x, c);
  return cells.map((cell) => ({ cell, ...x.cls[cell] }));
}

// ---------- AI ----------
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Static evaluation from player me's point of view.
function evaluate(s, me) {
  if (s.over) return (s.result.pts[me] - s.result.pts[1 - me]) * 1000;
  const spooky = Array.from({ length: 9 }, () => [0, 0]);
  for (const m of open(s)) { spooky[m.a][m.p]++; spooky[m.b][m.p]++; }
  let v = 0;
  for (const L of LINES) {
    const own = [0, 0];
    let q = [0, 0];
    for (const i of L) {
      const c = s.cls[i];
      if (c) own[c.p]++;
      else { if (spooky[i][0]) q[0]++; if (spooky[i][1]) q[1]++; }
    }
    for (const p of [0, 1]) {
      if (own[1 - p]) continue;
      const w = own[p] === 2 ? 30 : own[p] === 1 ? 6 : 1;
      v += (p === me ? 1 : -1) * (w + w * q[p] * 0.5);
    }
  }
  return v;
}

function search(s, depth, alpha, beta, me, deadline, stats) {
  if (s.over || depth === 0) return evaluate(s, me) * (s.over ? 1 + depth * 0.01 : 1);
  if (deadline && ++stats.nodes % 256 === 0 && Date.now() > deadline) throw stats;
  const maxing = s.turn === me;
  let best = maxing ? -Infinity : Infinity;
  for (const mv of legalMoves(s)) {
    const x = clone(s); apply(x, mv);
    const v = search(x, depth - 1, alpha, beta, me, deadline, stats);
    if (maxing) { if (v > best) best = v; if (v > alpha) alpha = v; }
    else { if (v < best) best = v; if (v < beta) beta = v; }
    if (alpha >= beta) break;
  }
  return best;
}

function bestMoves(s, depth, deadline, stats = { nodes: 0 }) {
  const me = s.turn;
  let best = [], bv = -Infinity;
  for (const mv of legalMoves(s)) {
    const x = clone(s); apply(x, mv);
    const v = search(x, depth - 1, -Infinity, Infinity, me, deadline, stats);
    if (v > bv + 1e-9) { bv = v; best = [mv]; } else if (Math.abs(v - bv) <= 1e-9) best.push(mv);
  }
  return { best, value: bv };
}

// level: easy | normal | hard. Always returns a legal move (or null if the game is over).
function aiMove(s, level = 'normal', { timeMs = 450 } = {}) {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (level === 'random') return pick(moves);
  if (level === 'easy') {
    if (Math.random() < 0.5) return pick(bestMoves(s, 1).best);
    return pick(moves);
  }
  if (level === 'normal') return pick(bestMoves(s, 2).best);
  // hard: iterative deepening under a time budget
  const deadline = Date.now() + timeMs;
  let best = bestMoves(s, 2).best;
  for (let d = 3; d <= 9; d++) {
    try {
      const r = bestMoves(s, d, deadline);
      best = r.best;
      if (Math.abs(r.value) >= 1000) break;
    } catch (e) { if (e && e.nodes !== undefined) break; throw e; }
  }
  return pick(best);
}

export const QTT = {
  LINES, create, clone, sym, freeCells, legalMoves, isLegal, apply, cycle, previewCollapse,
  connected, evaluate, aiMove, open, markN,
};
