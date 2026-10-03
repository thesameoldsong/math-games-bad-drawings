// Ultimate Tic-Tac-Toe: pure game logic + AI. No DOM.
//
// Cells are numbered 0..80: m = board * 9 + cell, both 0..8 in reading order.
// boards[b]: -1 open, 0 / 1 won by that player, 2 filled up with no three-in-a-row ("dead").
// next: the mini-board the side to move is sent to, or -1 = any open board.
// winner: -1 game on, 0 / 1 winner, 2 tie.
// rules: { win: 'line' | 'majority' | 'single', shared: bool }
//   line     — three won boards in a row (the classic); shared → dead boards count for both players
//   majority — more boards than the opponent once every board is closed
//   single   — the first mini-board decides the game

export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const DEFAULT_RULES = { win: 'line', shared: false };

function create(rules = {}) {
  return {
    rules: { ...DEFAULT_RULES, ...rules },
    cells: Array(81).fill(-1),
    boards: Array(9).fill(-1),
    boardLines: Array(9).fill(null),
    next: -1, turn: 0, winner: -1, line: null, moves: 0, last: -1,
  };
}
const clone = (s) => ({
  ...s, rules: { ...s.rules },
  cells: s.cells.slice(), boards: s.boards.slice(), boardLines: s.boardLines.slice(),
});

const isOpen = (s, b) => s.boards[b] === -1;
// Mini-boards the side to move may play on.
function targets(s) {
  if (s.winner !== -1) return [];
  if (s.next >= 0 && isOpen(s, s.next)) return [s.next];
  const out = [];
  for (let b = 0; b < 9; b++) if (isOpen(s, b)) out.push(b);
  return out;
}
function legalMoves(s) {
  const out = [];
  for (const b of targets(s)) for (let c = 0; c < 9; c++) if (s.cells[b * 9 + c] < 0) out.push(b * 9 + c);
  return out;
}
const isLegal = (s, m) => Number.isInteger(m) && m >= 0 && m < 81 && s.cells[m] < 0 && targets(s).includes((m / 9) | 0);

function lineIn(get, p) {
  for (const L of LINES) if (get(L[0]) === p && get(L[1]) === p && get(L[2]) === p) return L;
  return null;
}
// A meta-line for p: every board in it is p's (or dead, when dead boards are shared).
function metaLine(s, p) {
  const sh = s.rules.shared;
  for (const L of LINES) if (L.every((b) => s.boards[b] === p || (sh && s.boards[b] === 2))) return L;
  return null;
}
// Could p still complete some meta-line?
function canStillLine(s, p) {
  const sh = s.rules.shared;
  return LINES.some((L) => L.every((b) => s.boards[b] === p || s.boards[b] === -1 || (sh && s.boards[b] === 2)));
}
const count = (s, p) => s.boards.filter((x) => x === p).length;

// Mutates s. Returns the new status of the mini-board that was played on (-1 still open, 0/1 won, 2 dead).
function apply(s, m) {
  const p = s.turn, b = (m / 9) | 0, c = m % 9;
  s.cells[m] = p;
  const L = lineIn((i) => s.cells[b * 9 + i], p);
  if (L) { s.boards[b] = p; s.boardLines[b] = L; }
  else if (!s.cells.slice(b * 9, b * 9 + 9).includes(-1)) s.boards[b] = 2;
  s.last = m;
  s.moves++;
  s.turn = 1 - p;
  s.next = isOpen(s, c) ? c : -1;
  decide(s, p);
  return s.boards[b];
}

function decide(s, mover) {
  const anyOpen = s.boards.includes(-1);
  const { win } = s.rules;
  if (win === 'single') {
    const w = s.boards.findIndex((x) => x === 0 || x === 1);
    if (w >= 0) s.winner = s.boards[w];
    else if (!anyOpen) s.winner = 2;
    return;
  }
  if (win === 'majority') {
    if (anyOpen) return;
    const a = count(s, 0), b = count(s, 1);
    s.winner = a === b ? 2 : a > b ? 0 : 1;
    return;
  }
  // classic: the mover is checked first (with shared dead boards, a draw could complete both sides' lines)
  for (const p of [mover, 1 - mover]) {
    const L = metaLine(s, p);
    if (L) { s.winner = p; s.line = L; return; }
  }
  // Nobody can make three in a row any more → stop early, it's a tie.
  if (!anyOpen || (!canStillLine(s, 0) && !canStillLine(s, 1))) s.winner = 2;
}
const isOver = (s) => s.winner !== -1;

// ---------- AI ----------
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Would the side to move win the mini-board b by playing there right now?
function boardWinningCells(s, b, p) {
  const out = [];
  if (!isOpen(s, b)) return out;
  for (let c = 0; c < 9; c++) {
    if (s.cells[b * 9 + c] >= 0) continue;
    s.cells[b * 9 + c] = p;
    if (lineIn((i) => s.cells[b * 9 + i], p)) out.push(c);
    s.cells[b * 9 + c] = -1;
  }
  return out;
}

// Quick 1-ply evaluation of a move for the side to move (higher is better).
function quickScore(s, m) {
  const me = s.turn, op = 1 - me;
  const x = clone(s);
  const res = apply(x, m);
  if (x.winner === me) return 10000;
  let v = 0;
  if (res === me) v += 60;
  // Blocking: did this cell sit on the opponent's winning spot?
  const b = (m / 9) | 0, c = m % 9;
  if (boardWinningCells(s, b, op).includes(c)) v += 35;
  // Where does the opponent go now?
  const tb = x.next < 0 ? null : x.next;
  if (tb === null) v -= 25; // free choice for them
  else {
    if (boardWinningCells(x, tb, op).length) v -= 45;
    // can the opponent win the whole game from here?
    for (const mm of legalMoves(x).slice(0, 40)) {
      const y = clone(x); apply(y, mm);
      if (y.winner === op) { v -= 500; break; }
    }
  }
  if (c === 4) v += 3;
  if (b === 4) v += 4;
  return v;
}

function greedyMove(s, noise) {
  let best = [], bv = -Infinity;
  for (const m of legalMoves(s)) {
    const v = quickScore(s, m) + Math.random() * noise;
    if (v > bv) { bv = v; best = [m]; } else if (v === bv) best.push(m);
  }
  return pick(best);
}

// Monte-Carlo tree search with random playouts.
function mcts(root, { iters = 2000, timeMs = 0 } = {}) {
  const moves = legalMoves(root);
  if (moves.length === 1) return moves[0];
  for (const m of moves) { const x = clone(root); apply(x, m); if (x.winner === root.turn) return m; }
  const mk = (parent, move, player, s) => ({ parent, move, player, kids: [], untried: legalMoves(s), n: 0, w: 0 });
  const top = mk(null, -1, 1 - root.turn, root);
  const t0 = Date.now();
  for (let it = 0; ; it++) {
    if (timeMs ? (it >= 200 && Date.now() - t0 > timeMs) || it >= iters * 50 : it >= iters) break;
    let node = top;
    const s = clone(root);
    while (!node.untried.length && node.kids.length) {
      const ln = Math.log(node.n);
      let best = null, bv = -Infinity;
      for (const k of node.kids) {
        const v = k.w / k.n + 1.25 * Math.sqrt(ln / k.n);
        if (v > bv) { bv = v; best = k; }
      }
      node = best;
      apply(s, node.move);
    }
    if (node.untried.length && !isOver(s)) {
      const i = Math.floor(Math.random() * node.untried.length);
      const m = node.untried[i];
      node.untried[i] = node.untried[node.untried.length - 1]; node.untried.pop();
      const p = s.turn;
      apply(s, m);
      const kid = mk(node, m, p, s);
      node.kids.push(kid);
      node = kid;
    }
    while (!isOver(s)) apply(s, pick(legalMoves(s)));
    for (let n = node; n; n = n.parent) {
      n.n++;
      n.w += s.winner === n.player ? 1 : s.winner === 2 ? 0.5 : 0;
    }
  }
  let best = top.kids[0];
  for (const k of top.kids) if (k.n > best.n) best = k;
  return best ? best.move : pick(moves);
}

// level: easy | normal | hard. opts lets tests/workers tune the search budget.
function aiMove(s, level, opts = {}) {
  if (level === 'easy') return Math.random() < 0.25 ? pick(legalMoves(s)) : greedyMove(s, 50);
  if (level === 'normal') return mcts(s, { iters: opts.iters ?? 600 });
  return mcts(s, { iters: opts.iters ?? 20000, timeMs: opts.timeMs ?? 0 });
}

export const UTTT = {
  create, clone, targets, legalMoves, isLegal, apply, isOver, count, aiMove, metaLine, canStillLine, boardWinningCells, LINES,
};
