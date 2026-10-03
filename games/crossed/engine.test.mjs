import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CROSSED as C } from './engine.js';

// Deterministic randomness: statistical AI-strength tests must not flake.
{
  let a = 0x2545f491;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded RNG so AI tests are reproducible.
const seeded = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

test('board: 4 dots per side, 16 dots, sides numbered clockwise', () => {
  const s = C.create(4);
  assert.equal(s.used.length, 16);
  assert.deepEqual([0, 3, 4, 7, 8, 11, 12, 15].map((d) => C.side(s, d)), [0, 0, 1, 1, 2, 2, 3, 3]);
  // positions: no corners, all on the boundary
  for (let d = 0; d < 16; d++) {
    const [x, y] = C.pos(4, d);
    assert.ok(x === 0 || x === 1 || y === 0 || y === 1);
    assert.ok(!((x === 0 || x === 1) && (y === 0 || y === 1)), 'no corner dots');
  }
});

test('legal moves: different sides, unused dots only', () => {
  const s = C.create(4);
  assert.equal(C.legalMoves(s).length, 120 - 4 * 6);
  assert.ok(!C.isLegal(s, 0, 3), 'same side');
  assert.ok(!C.isLegal(s, 2, 2));
  assert.ok(C.isLegal(s, 0, 4));
  C.apply(s, [0, 8]);
  assert.ok(!C.isLegal(s, 0, 5), 'dot already used');
  assert.ok(!C.isLegal(s, 8, 1));
  assert.throws(() => C.apply(s, [1, 2]));
  assert.equal(C.legalMoves(s).length, 91 - (2 * 3 + 2 * 6));
});

test('crossing test is about interleaved endpoints', () => {
  assert.ok(C.crosses(0, 8, 4, 12));   // top-bottom vs right-left: a plus sign
  assert.ok(!C.crosses(0, 4, 8, 12));  // two corner cuts
  assert.ok(C.crosses(12, 2, 0, 8));   // order of endpoints does not matter
  assert.ok(!C.crosses(1, 6, 2, 5));   // nested chords near the top-right corner
});

test('scoring: +1 per opponent line, +2 per own line', () => {
  const s = C.create(4);
  assert.deepEqual(C.apply(s, [1, 9]), { pts: 0, own: 0, opp: 0 });      // A: top to bottom
  assert.deepEqual(C.apply(s, [5, 13]), { pts: 1, own: 0, opp: 1 });     // B crosses A
  assert.deepEqual(C.apply(s, [0, 15]), { pts: 0, own: 0, opp: 0 });     // A: cuts the top-left corner, misses both
  assert.deepEqual(C.apply(s, [10, 2]), { pts: 3, own: 1, opp: 1 });     // B crosses own line (+2) and A's first (+1)
  assert.deepEqual(C.apply(s, [3, 12]), { pts: 4, own: 1, opp: 2 });     // A: own first line, both of B's
  assert.deepEqual(s.score, [4, 4]);
});

test('the game ends when the free dots sit on one side (or none are left)', () => {
  const s = C.create(4);
  // use up right, bottom and left sides with lines that never touch the top
  for (const m of [[4, 8], [5, 9], [6, 12], [7, 13], [10, 14], [11, 15]]) {
    assert.ok(!C.isOver(s));
    C.apply(s, m);
  }
  assert.ok(C.isOver(s), 'only top dots remain');
  assert.equal(C.legalMoves(s).length, 0);
  assert.equal(s.lines.length, 6);

  const f = C.create(3);
  while (!C.isOver(f)) C.apply(f, C.legalMoves(f)[0]);
  assert.ok(f.lines.length <= 6);
});

test('first player setting and winner', () => {
  const s = C.create(4, 1);
  assert.equal(s.turn, 1);
  C.apply(s, [0, 8]);
  assert.equal(s.used[0], 1);
  assert.equal(s.turn, 0);
  assert.equal(C.winner(s), -1);
  C.apply(s, [4, 12]);
  assert.equal(C.winner(s), 0);
});

test('meet() finds the crossing point of two chords', () => {
  const [x, y] = C.meet(4, { a: 1, b: 10 }, { a: 5, b: 14 }); // a vertical-ish and a horizontal-ish chord
  assert.ok(x > 0 && x < 1 && y > 0 && y < 1);
  const [cx, cy] = C.meet(3, { a: 1, b: 7 }, { a: 4, b: 10 }); // middle dots: centre of the square
  assert.ok(Math.abs(cx - 0.5) < 1e-9 && Math.abs(cy - 0.5) < 1e-9);
});

test('every AI level only plays legal moves and the game terminates', () => {
  for (const n of [3, 4, 5]) for (const level of ['easy', 'normal', 'hard']) {
    const rnd = seeded(n * 7 + level.length);
    const s = C.create(n);
    let moves = 0;
    while (!C.isOver(s)) {
      const m = C.aiMove(s, level, rnd);
      assert.ok(C.isLegal(s, m[0], m[1]), `${level} n=${n} played ${m}`);
      C.apply(s, m);
      assert.ok(++moves <= 2 * n);
    }
    assert.equal(C.aiMove(s, level), null);
  }
});

test('AI vs AI game (hard vs normal) terminates with consistent scores', () => {
  const s = C.create(4);
  const rnd = seeded(3);
  let total = 0;
  while (!C.isOver(s)) total += C.apply(s, C.aiMove(s, s.turn ? 'normal' : 'hard', rnd)).pts;
  assert.equal(s.score[0] + s.score[1], total);
});

test('hard AI grabs a winning last move', () => {
  // Two dots left on different sides: the only move must be taken.
  const s = C.create(3);
  for (const m of [[0, 6], [1, 7], [3, 9], [4, 10]]) C.apply(s, m);
  const m = C.aiMove(s, 'hard');
  assert.ok(C.isLegal(s, m[0], m[1]));
});

test('hard beats easy clearly over several games', () => {
  let diff = 0;
  for (let i = 0; i < 8; i++) {
    const rnd = seeded(100 + i);
    const s = C.create(4, i % 2);
    while (!C.isOver(s)) C.apply(s, C.aiMove(s, s.turn === 0 ? 'hard' : 'easy', rnd));
    diff += s.score[0] - s.score[1];
  }
  assert.ok(diff > 0, `hard minus easy = ${diff}`);
});

// ---- review additions ----
const randomMove = (s, rnd) => { const L = C.legalMoves(s); return L[Math.floor(rnd() * L.length)]; };
const greedyMove = (s) => {
  let best = -1, m = null;
  for (const x of C.legalMoves(s)) { const g = C.gain(s, x[0], x[1]); if (g > best) { best = g; m = x; } }
  return m;
};
// Exact value (mover minus other) of the rest of the game, by brute force.
function exact(s) {
  let best = -Infinity;
  for (const m of C.legalMoves(s)) {
    const c = C.clone(s), r = C.apply(c, m);
    best = Math.max(best, r.pts - exact(c));
  }
  return best === -Infinity ? 0 : best;
}

test('crossing agrees with real geometry on every pair of chords (n = 3, 4, 5)', () => {
  const segX = (p1, p2, p3, p4) => {
    const o = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    return o(p1, p2, p3) * o(p1, p2, p4) < 0 && o(p3, p4, p1) * o(p3, p4, p2) < 0;
  };
  for (const n of [3, 4, 5]) {
    const ms = C.legalMoves(C.create(n));
    for (const [a, b] of ms) for (const [c, d] of ms) {
      if (new Set([a, b, c, d]).size < 4) continue;
      assert.equal(C.crosses(a, b, c, d), segX(C.pos(n, a), C.pos(n, b), C.pos(n, c), C.pos(n, d)), `${a}-${b} x ${c}-${d}`);
    }
  }
});

test('three lines through the centre: the third crosses both earlier ones', () => {
  const s = C.create(3); // middle dots 1, 4, 7, 10; corners-ish diagonals pass through the centre too
  C.apply(s, [1, 7]);    // A: vertical through the centre
  C.apply(s, [4, 10]);   // B: horizontal through the centre, crosses A
  const r = C.apply(s, [0, 6]); // A: from top-left dot to bottom-right dot, also through the centre
  assert.deepEqual(r, { pts: 3, own: 1, opp: 1 });
});

test('game ends when every dot is used; 2n moves at most; scores add up', () => {
  for (const n of [3, 4, 5]) {
    const rnd = seeded(n);
    const s = C.create(n);
    let total = 0;
    while (!C.isOver(s)) total += C.apply(s, randomMove(s, rnd)).pts;
    assert.ok(s.lines.length <= 2 * n);
    assert.equal(s.score[0] + s.score[1], total);
    const free = s.used.map((u, d) => (u < 0 ? C.side(s, d) : -1)).filter((x) => x >= 0);
    assert.ok(new Set(free).size <= 1);
  }
  const s = C.create(4);
  for (const m of [[0, 4], [1, 5], [2, 6], [3, 7], [8, 12], [9, 13], [10, 14], [11, 15]]) C.apply(s, m);
  assert.ok(C.isOver(s));
  assert.equal(s.used.filter((u) => u < 0).length, 0);
});

test('apply rejects junk input', () => {
  const s = C.create(4);
  for (const m of [[-1, 4], [0, 16], [0.5, 4], ['0', 4], [0, 0]]) assert.throws(() => C.apply(s, m));
  assert.equal(s.lines.length, 0);
});

test('hard AI is exact in a small endgame', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const rnd = seeded(seed);
    const s = C.create(3);
    for (let i = 0; i < 2; i++) C.apply(s, randomMove(s, rnd));
    const m = C.aiMove(s, 'hard', rnd), c = C.clone(s), r = C.apply(c, m);
    assert.equal(r.pts - exact(c), exact(s), `seed ${seed}`);
  }
});

test('normal AI beats random and greedy play clearly', () => {
  for (const [label, opp] of [['random', randomMove], ['greedy', greedyMove]]) {
    let diff = 0, wins = 0, losses = 0;
    for (let i = 0; i < 30; i++) {
      const rnd = seeded(500 + i);
      const s = C.create(4, i % 2);
      while (!C.isOver(s)) C.apply(s, s.turn === 0 ? C.aiMove(s, 'normal', rnd) : opp(s, rnd));
      const d = s.score[0] - s.score[1];
      diff += d; if (d > 0) wins++; else if (d < 0) losses++;
    }
    assert.ok(wins > 2 * losses && diff > 0, `normal vs ${label}: ${wins}-${losses}, diff ${diff}`);
  }
});

// ---- second review ----
test('two free dots on different sides: not over, exactly one move, and it is scored', () => {
  const s = C.create(3);
  for (const m of [[0, 6], [1, 7], [3, 9], [4, 10], [5, 11]]) C.apply(s, m); // dots 2 (top) and 8 (bottom) stay free
  assert.ok(!C.isOver(s));
  assert.deepEqual(C.legalMoves(s), [[2, 8]]);
  const before = s.score.slice(), p = s.turn, r = C.apply(s, [8, 2]);
  assert.equal(s.score[p] - before[p], r.pts);
  assert.equal(r.pts, C.gain({ ...s, lines: s.lines.slice(0, -1), turn: p }, 2, 8));
  assert.ok(C.isOver(s));
});

test('hard AI stays quick on the biggest board (wall-clock cap)', () => {
  const s = C.create(5);
  const t0 = performance.now();
  const m = C.aiMove(s, 'hard', seeded(9));
  assert.ok(performance.now() - t0 < 2500);
  assert.ok(C.isLegal(s, m[0], m[1]));
});

test('normal beats easy', () => {
  let diff = 0;
  for (let i = 0; i < 16; i++) {
    const rnd = seeded(700 + i), s = C.create(4, i % 2);
    while (!C.isOver(s)) C.apply(s, C.aiMove(s, s.turn === 0 ? 'normal' : 'easy', rnd));
    diff += s.score[0] - s.score[1];
  }
  assert.ok(diff > 0, `normal minus easy = ${diff}`);
});
