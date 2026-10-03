// Gridlock: pure game logic + AI. No DOM.
//
// Each player owns an N×N grid. On a turn the dice show a and b; the player shades an a×b
// (or b×a) rectangle of empty cells on their own grid — or, as a spoiler, on the opponent's grid.
// If it doesn't fit on their own grid they may still spoil, or they lose the turn (pass).
// Two passes in a row end the game; more filled cells on your own grid wins.
//
// State: { N, spoil, cells: [arr0, arr1] (N*N, -1 empty | player who shaded), pieces: [{b,r,c,h,w,p}],
//          turn, dice: [a,b] | null, passes, over, n (moves made), last }
// Move:  { b, r, c, h, w } (b = board index = owner) or { pass: true }.

function create(N = 10, opts = {}) {
  return {
    N, spoil: opts.spoil !== false,
    cells: [Array(N * N).fill(-1), Array(N * N).fill(-1)],
    pieces: [], turn: opts.first ?? 0, dice: null, passes: 0, over: false, n: 0, last: null,
  };
}
const clone = (s) => ({
  ...s, cells: s.cells.map((a) => a.slice()), pieces: s.pieces.slice(), dice: s.dice && s.dice.slice(),
});

const rollDie = (rng = Math.random) => 1 + Math.floor(rng() * 6);
function roll(s, rng = Math.random) {
  s.dice = [rollDie(rng), rollDie(rng)];
  return s.dice;
}

// Orientations of the current roll: [[h, w], ...] (one entry for squares).
function shapesOf(dice) {
  const [a, b] = dice;
  return a === b ? [[a, b]] : [[a, b], [b, a]];
}

function fitsAt(cells, N, r, c, h, w) {
  if (r < 0 || c < 0 || r + h > N || c + w > N) return false;
  for (let i = r; i < r + h; i++) for (let j = c; j < c + w; j++) if (cells[i * N + j] >= 0) return false;
  return true;
}
const canPlace = (s, m) => !s.over && !!s.dice && (m.b === s.turn || (s.spoil && m.b === 1 - s.turn)) &&
  shapesOf(s.dice).some(([h, w]) => h === m.h && w === m.w) && fitsAt(s.cells[m.b], s.N, m.r, m.c, m.h, m.w);

// Prefix sums of filled cells for O(1) rectangle-emptiness tests.
function prefix(cells, N) {
  const P = new Int32Array((N + 1) * (N + 1));
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
    P[(i + 1) * (N + 1) + j + 1] = (cells[i * N + j] >= 0) + P[i * (N + 1) + j + 1] + P[(i + 1) * (N + 1) + j] - P[i * (N + 1) + j];
  return P;
}
const filledIn = (P, N, r, c, h, w) => {
  const W = N + 1;
  return P[(r + h) * W + c + w] - P[r * W + c + w] - P[(r + h) * W + c] + P[r * W + c];
};

function placements(cells, N, h, w, b, P = prefix(cells, N)) {
  const out = [];
  for (let r = 0; r + h <= N; r++) for (let c = 0; c + w <= N; c++) if (!filledIn(P, N, r, c, h, w)) out.push({ b, r, c, h, w });
  return out;
}
function placementsOn(s, b) {
  if (!s.dice) return [];
  const P = prefix(s.cells[b], s.N), out = [];
  for (const [h, w] of shapesOf(s.dice)) out.push(...placements(s.cells[b], s.N, h, w, b, P));
  return out;
}
const fitsOwn = (s) => placementsOn(s, s.turn).length > 0;
const fitsOpp = (s) => s.spoil && placementsOn(s, 1 - s.turn).length > 0;
// A pass is allowed (and is the only option when nothing fits anywhere) when the own grid has no room.
const canPass = (s) => !s.over && !!s.dice && !fitsOwn(s);
function legalMoves(s) {
  if (s.over || !s.dice) return [];
  const out = placementsOn(s, s.turn);
  if (s.spoil) out.push(...placementsOn(s, 1 - s.turn));
  if (!fitsOwn(s)) out.push({ pass: true });
  return out;
}

const score = (s, p) => s.cells[p].reduce((n, v) => n + (v >= 0), 0);
const isOver = (s) => s.over;
function winner(s) {
  const a = score(s, 0), b = score(s, 1);
  return a === b ? -1 : a > b ? 0 : 1;
}

// Mutates s. Returns false for an illegal move (state untouched).
function apply(s, m) {
  if (m.pass) {
    if (!canPass(s)) return false;
    s.passes++;
    s.last = { pass: true, p: s.turn };
  } else {
    if (!canPlace(s, m)) return false;
    const { b, r, c, h, w } = m;
    for (let i = r; i < r + h; i++) for (let j = c; j < c + w; j++) s.cells[b][i * s.N + j] = s.turn;
    s.pieces = [...s.pieces, { b, r, c, h, w, p: s.turn }];
    s.passes = 0;
    s.last = { b, r, c, h, w, p: s.turn };
  }
  s.n++;
  s.dice = null;
  s.turn = 1 - s.turn;
  if (s.passes >= 2) s.over = true;
  return true;
}

// ---------- AI ----------
// Every unordered roll {a ≤ b} with its probability (rotation allowed, so 21 shapes).
const ROLLS = [];
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push([a, b, a === b ? 1 / 36 : 2 / 36]);

// Room left on a grid: expected area of the next roll if it fits (cells you can still bank per turn),
// with a mild bonus for shapes that fit in many places (flexibility).
function room(cells, N) {
  const P = prefix(cells, N);
  let v = 0;
  for (const [a, b, p] of ROLLS) {
    let cnt = 0;
    for (const [h, w] of a === b ? [[a, b]] : [[a, b], [b, a]])
      for (let r = 0; r + h <= N && cnt < 6; r++) for (let c = 0; c + w <= N && cnt < 6; c++) if (!filledIn(P, N, r, c, h, w)) cnt++;
    if (cnt) v += p * a * b * (0.85 + 0.03 * cnt);
  }
  return v;
}

// How snugly a rectangle sits: share of its border that touches a wall or a filled cell.
function contact(cells, N, { r, c, h, w }) {
  let t = 0;
  const filled = (i, j) => i < 0 || j < 0 || i >= N || j >= N || cells[i * N + j] >= 0;
  for (let j = c; j < c + w; j++) t += filled(r - 1, j) + filled(r + h, j);
  for (let i = r; i < r + h; i++) t += filled(i, c - 1) + filled(i, c + w);
  return t / (2 * (h + w));
}

const pick = (a, rng = Math.random) => a[Math.floor(rng() * a.length)];

// Expected number of turns each player still gets, used to weigh "room" against cells banked now.
const horizon = (s) => {
  const empty = s.cells[0].concat(s.cells[1]).reduce((n, v) => n + (v < 0), 0);
  return Math.max(0.6, Math.min(4, empty / 2 / 14));
};

function evalAfter(s, me, m, λ) {
  const x = clone(s); apply(x, m);
  const mine = score(x, me) - score(x, 1 - me);
  const roomDiff = room(x.cells[me], x.N) - room(x.cells[1 - me], x.N);
  const snug = m.pass ? 0 : contact(s.cells[m.b], s.N, m) * (m.b === me ? 1.2 : -0.4);
  return mine + λ * roomDiff + snug;
}

function aiMove(s, level = 'normal', rng = Math.random) {
  const me = s.turn, opts = legalMoves(s);
  if (!opts.length) return null;
  const own = opts.filter((m) => !m.pass && m.b === me);
  if (level === 'easy') {
    // Plays on its own grid, a bit carelessly; never spoils.
    if (!own.length) return { pass: true };
    if (rng() < 0.5) return pick(own, rng);
    let best = [], bv = -Infinity;
    for (const m of own) { const v = contact(s.cells[me], s.N, m); if (v > bv + 1e-9) { bv = v; best = [m]; } else if (Math.abs(v - bv) < 1e-9) best.push(m); }
    return pick(best, rng);
  }
  const λ = horizon(s);
  // Normal only spoils when its own grid has no room; hard weighs spoiling every turn.
  const cand = level === 'hard' || !own.length ? opts : own;
  let best = [], bv = -Infinity;
  for (const m of cand) {
    const v = evalAfter(s, me, m, λ);
    if (v > bv + 1e-9) { bv = v; best = [m]; } else if (Math.abs(v - bv) < 1e-9) best.push(m);
  }
  return pick(best, rng);
}

export const GL = {
  create, clone, roll, shapesOf, fitsAt, canPlace, placementsOn, fitsOwn, fitsOpp, canPass, legalMoves,
  score, isOver, winner, apply, aiMove, room, contact,
};
