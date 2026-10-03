// Jam: players take turns claiming the numbers 1..9; the first to own three numbers summing to 15 wins.
// Pure logic + AI, no DOM. Secretly it is tic-tac-toe on the 3 × 3 magic square.

// The eight trios of distinct numbers 1..9 that add up to 15 (= the eight lines of the magic square).
const TRIOS = [];
for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) {
  const c = 15 - a - b;
  if (c > b && c <= 9) TRIOS.push([a, b, c]);
}

// Magic square, row by row: every row, column and diagonal is one of the TRIOS.
const MAGIC = [2, 7, 6, 9, 5, 1, 4, 3, 8];

const NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function create({ first = 0 } = {}) {
  // owner[n] for n = 1..9: -1 free, 0 / 1 claimed by that player (index 0 unused)
  return { owner: Array(10).fill(-1), turn: first, first, moves: 0, order: [], winner: -1, trio: null, over: false };
}

const clone = (s) => ({ ...s, owner: s.owner.slice(), order: s.order.slice(), trio: s.trio && s.trio.slice() });
const free = (s) => NUMS.filter((n) => s.owner[n] < 0);
const numbersOf = (s, p) => NUMS.filter((n) => s.owner[n] === p);
const legal = (s, n) => !s.over && Number.isInteger(n) && n >= 1 && n <= 9 && s.owner[n] < 0;

// A trio fully owned by p, or null.
function trioOf(owner, p) {
  for (const t of TRIOS) if (owner[t[0]] === p && owner[t[1]] === p && owner[t[2]] === p) return t;
  return null;
}

function apply(s, n) {
  if (!legal(s, n)) return false;
  const p = s.turn;
  s.owner[n] = p;
  s.order.push(n);
  s.moves++;
  const t = trioOf(s.owner, p);
  if (t) { s.winner = p; s.trio = t.slice(); s.over = true; }
  else if (s.moves === 9) s.over = true; // all numbers gone, nobody made 15: a tie
  else s.turn = 1 - p;
  return true;
}

const isOver = (s) => s.over;

// Free numbers that would immediately give p a trio summing to 15.
function completers(s, p) {
  const out = new Set();
  for (const t of TRIOS) {
    const mine = t.filter((n) => s.owner[n] === p).length;
    const open = t.filter((n) => s.owner[n] < 0);
    if (mine === 2 && open.length === 1) out.add(open[0]);
  }
  return [...out].sort((a, b) => a - b);
}

// ---------- perfect play (the full game tree is tiny: at most 3^9 positions) ----------
const memo = new Map();
const keyOf = (owner, turn) => owner.slice(1).map((v) => v + 1).join('') + turn;

// Value from the point of view of the player to move: +1 win, 0 draw, -1 loss (scaled by speed).
function value(owner, turn, left) {
  const k = keyOf(owner, turn);
  const m = memo.get(k);
  if (m !== undefined) return m;
  let best = -Infinity;
  for (let n = 1; n <= 9; n++) {
    if (owner[n] >= 0) continue;
    owner[n] = turn;
    let v;
    if (trioOf(owner, turn)) v = 10 + left;            // win sooner = better
    else if (left === 1) v = 0;
    else v = -value(owner, 1 - turn, left - 1);
    owner[n] = -1;
    if (v > best) best = v;
  }
  memo.set(k, best);
  return best;
}

// Score of every legal move for the player to move.
function scoreMoves(s) {
  const owner = s.owner.slice(), p = s.turn, left = 9 - s.moves;
  return free(s).map((n) => {
    owner[n] = p;
    const v = trioOf(owner, p) ? 10 + left : left === 1 ? 0 : -value(owner, 1 - p, left - 1);
    owner[n] = -1;
    return { n, v };
  });
}

// How many trios a number belongs to: 5 → 4, even numbers → 3, odd non-5 → 2 (centre / corners / edges).
const reach = (n) => TRIOS.filter((t) => t.includes(n)).length;

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

// level: easy | normal | hard
function aiMove(s, level = 'normal', rnd = Math.random) {
  const moves = free(s);
  if (!moves.length || s.over) return null;
  const p = s.turn;
  const win = completers(s, p), block = completers(s, 1 - p);

  if (level === 'easy') {
    // Grabs a win it sees most of the time, blocks only sometimes, otherwise picks at random.
    if (win.length && rnd() < 0.8) return pick(win, rnd);
    if (block.length && rnd() < 0.4) return pick(block, rnd);
    return pick(moves, rnd);
  }

  if (level === 'normal') {
    // Sensible but short-sighted: win, block, then prefer numbers that sit in many live trios;
    // it does not look for forks, so it can be trapped.
    if (win.length) return pick(win, rnd);
    if (block.length) return pick(block, rnd);
    let best = -Infinity, cand = [];
    for (const n of moves) {
      let sc = 0;
      for (const t of TRIOS) {
        if (!t.includes(n)) continue;
        const theirs = t.some((x) => s.owner[x] === 1 - p);
        const mine = t.filter((x) => s.owner[x] === p).length;
        if (!theirs) sc += 1 + mine * 2;
      }
      sc += rnd() * 1.5;
      if (sc > best + 1e-9) { best = sc; cand = [n]; }
    }
    return cand[0];
  }

  // hard: perfect play; among equally good moves prefer the ones that leave the opponent
  // the most ways to go wrong.
  const scored = scoreMoves(s);
  const top = Math.max(...scored.map((m) => m.v));
  const best = scored.filter((m) => m.v === top).map((m) => m.n);
  if (best.length === 1) return best[0];
  let bestTraps = -1, cand = [];
  for (const n of best) {
    const t = clone(s);
    apply(t, n);
    let traps = 0;
    if (!t.over) for (const m of scoreMoves(t)) if (m.v < 0) traps++;
    traps += reach(n) * 0.1 + rnd() * 0.5;
    if (traps > bestTraps) { bestTraps = traps; cand = [n]; }
  }
  return cand[0];
}

// Outcome of the position with perfect play from now on, for player p: 1 win, 0 draw, -1 loss.
function outlook(s, p) {
  if (s.over) return s.winner < 0 ? 0 : s.winner === p ? 1 : -1;
  const v = Math.max(...scoreMoves(s).map((m) => m.v));
  const sign = Math.sign(v);
  return s.turn === p ? sign : -sign;
}

export const JAM = {
  TRIOS, MAGIC, NUMS, create, clone, free, numbersOf, legal, apply, isOver, completers, trioOf, aiMove, scoreMoves, outlook, reach,
};
