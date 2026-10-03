import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRO } from './engine.js';

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

const X = PRO.X;
// Build a position from rows of tokens: '.' empty, 'x' X, 'aN' blue N, 'bN' red N.
function board(rows, opts) {
  const R = rows.length, C = rows[0].length;
  const s = PRO.create(R, C, opts);
  rows.forEach((row, r) => row.forEach((tok, c) => {
    const i = r * C + c;
    if (tok === '.') return;
    if (tok === 'x') { s.cells[i] = X; s.owner[i] = 0; return; }
    const v = +tok.slice(1), p = tok[0] === 'a' ? 0 : 1;
    s.cells[i] = v; s.owner[i] = p;
    s.rowMask[r] |= 1 << v; s.colMask[c] |= 1 << v;
  }));
  return s;
}

test('numbers range from 1 to the longer side; X is always allowed', () => {
  const s = PRO.create(4, 5);
  assert.deepEqual(PRO.legalValues(s, 0), [1, 2, 3, 4, 5]);
  assert.ok(PRO.legal(s, { i: 0, v: X }));
  assert.ok(!PRO.legal(s, { i: 0, v: 6 }));
  assert.ok(!PRO.legal(s, { i: 0, v: 0 }));
  assert.ok(!PRO.legal(s, { i: 20, v: 1 }));
});

test('no repeated number in a row or column', () => {
  const s = PRO.create(4, 4);
  PRO.apply(s, { i: 0, v: 3 });
  assert.ok(!PRO.legal(s, { i: 2, v: 3 }), 'same row');
  assert.ok(!PRO.legal(s, { i: 8, v: 3 }), 'same column');
  assert.ok(PRO.legal(s, { i: 5, v: 3 }), 'different row and column');
  assert.ok(!PRO.legal(s, { i: 0, v: 1 }), 'occupied cell');
  assert.equal(s.turn, 1);
});

test('dead cells are crossed out automatically and do not cost a turn', () => {
  // row 0: 1 2 3 . ; column 3 already holds 4 → cell (0,3) can take nothing
  const s = board([
    ['a1', 'b2', '.', '.'],
    ['.', '.', '.', 'b4'],
    ['.', '.', '.', '.'],
    ['.', '.', '.', '.'],
  ]);
  const auto = PRO.apply(s, { i: 2, v: 3 });
  assert.deepEqual(auto, [3]);
  assert.equal(s.cells[3], X);
  assert.equal(s.owner[3], -1);
  assert.equal(s.turn, 1);
  assert.equal(s.moves, 1);
});

test('scoring: a correct prophecy scores its value in its row and in its column', () => {
  // 3 × 3: row 0 has numbers 2,1 → "2" correct (blue, +2). column 0 has 2 and 1? see layout
  const s = board([
    ['a2', 'b1', 'x'],
    ['x', 'x', 'x'],
    ['b1', 'x', 'x'],
  ]);
  // rows: r0 count 2 → a2 hit (+2 blue); r1 count 0; r2 count 1 → b1 hit (+1 red)
  // cols: c0 count 2 → a2 hit (+2 blue); c1 count 1 → b1 hit (+1 red); c2 count 0
  const sc = PRO.score(s);
  assert.deepEqual(sc.pts, [4, 2]);
  assert.ok(PRO.isOver(s));
  assert.equal(sc.lines.filter((l) => l.hit >= 0).length, 4);
});

test('book example: 4 × 5 final board scores 12 : 19', () => {
  // pink = a (blue here), teal = b
  const s = board([
    ['a5', 'a4', 'a2', 'b3', 'x'],
    ['a2', 'b5', 'a4', 'a1', 'b3'],
    ['b3', 'x', 'x', 'a4', 'b2'],
    ['a4', 'a2', 'b3', 'b5', 'a1'],
  ]);
  assert.deepEqual(PRO.score(s).pts, [12, 19]);
});

test('X variant counts crosses instead of numbers', () => {
  const s = board([
    ['a1', 'x', '.'],
    ['.', '.', '.'],
    ['.', '.', '.'],
  ], { variant: 'x' });
  assert.equal(PRO.maxValue(s), 2);
  assert.deepEqual(PRO.lineRange(s, PRO.lines(s)[0]), [1, 2]);
  const f = board([
    ['a1', 'x', 'b2'],
    ['x', 'b1', 'x'],
    ['b2', 'x', 'a1'],
  ], { variant: 'x' });
  // rows: r0 1 X → a1 (+1); r1 2 X → none (b1); r2 1 X → a1 (+1)
  // cols: c0 1 X → a1 (+1); c1 2 X → none; c2 1 X → a1 (+1)
  assert.deepEqual(PRO.score(f).pts, [4, 0]);
});

test('alive: a prophecy outside the reachable range fades', () => {
  const s = board([
    ['a1', 'b2', '.', '.'],
    ['.', '.', '.', '.'],
    ['.', '.', '.', '.'],
    ['.', '.', '.', '.'],
  ]);
  // row 0 has 2 numbers already: "1" cannot be right in the row, but the column (1..4) still allows it
  assert.ok(PRO.alive(s, 0));
  PRO.apply(s, { i: 4, v: 3 }); // column 0 now has 2 numbers too
  assert.ok(!PRO.alive(s, 0));
  assert.ok(PRO.alive(s, 1));
});

test('AI never plays illegal moves and every level finishes a game', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    for (const [R, C, variant] of [[4, 4, 'classic'], [4, 5, 'x'], [6, 6, 'classic']]) {
      const s = PRO.create(R, C, { variant });
      let guard = 0;
      while (!PRO.isOver(s)) {
        const m = PRO.aiMove(s, level);
        assert.ok(PRO.legal(s, m), `${level} illegal ${JSON.stringify(m)}`);
        PRO.apply(s, m);
        assert.ok(++guard <= R * C);
      }
      const { pts } = PRO.score(s);
      assert.ok(pts[0] >= 0 && pts[1] >= 0);
    }
  }
});

test('hard AI takes a winning last move', () => {
  // last empty cell (2,2): writing 1 makes row 2 and column 2 each hold exactly one number
  const s = board([
    ['x', 'x', 'x'],
    ['x', 'x', 'x'],
    ['x', 'x', '.'],
  ]);
  assert.deepEqual(PRO.aiMove(s, 'hard'), { i: 8, v: 1 });
});

test('stronger levels beat weaker ones', () => {
  const play = (a, b, n, R = 5) => {
    let w = 0;
    for (let g = 0; g < n; g++) {
      const s = PRO.create(R, R, { first: g % 2 });
      while (!PRO.isOver(s)) PRO.apply(s, PRO.aiMove(s, s.turn === 0 ? a : b));
      const { pts } = PRO.score(s);
      if (pts[0] > pts[1]) w++;
    }
    return w;
  };
  assert.ok(play('normal', 'easy', 10) >= 8);
  assert.ok(play('hard', 'normal', 8) >= 6);
});

test('a number can kill cells in its row and its column at once; an X never auto-crosses', () => {
  // 3 × 3 (numbers 1..3). Cell (0,2) misses only 3 (row has 1,2); cell (2,0) misses only 3 (column has 1,2).
  const s = board([
    ['a1', 'b2', '.'],
    ['b2', '.', '.'],
    ['.', '.', '.'],
  ]);
  const before = s.cells.slice();
  assert.deepEqual(PRO.apply(s, { i: 4, v: X }), []);
  assert.deepEqual(s.cells.filter((v, i) => v !== before[i]), [X]);
  // (0,2) row {1,2}, column empty; (2,0) column {1,2}. Writing 3 at (2,2) closes both.
  const auto = PRO.apply(s, { i: 8, v: 3 }).sort((a, b) => a - b);
  assert.deepEqual(auto, [2, 6]);
  assert.equal(s.turn, 0, 'two moves made, auto crosses are free');
});

test('legal() rejects malformed and out-of-range moves (online input)', () => {
  const s = PRO.create(4, 4, { variant: 'x' });
  assert.equal(PRO.maxValue(s), 3);
  for (const m of [null, {}, { i: 0 }, { i: -1, v: 1 }, { i: 16, v: 1 }, { i: 1.5, v: 1 }, { i: 0, v: 4 }, { i: 0, v: 2.5 }, { i: '0', v: 1 }, { i: 0, v: -2 }])
    assert.ok(!PRO.legal(s, m), JSON.stringify(m));
  assert.ok(PRO.legal(s, { i: 0, v: 3 }));
});

test('automatic crosses belong to nobody and no correct prophecy means no points', () => {
  const s = board([
    ['a3', 'x'],
    ['x', 'b3'],
  ]);
  s.owner[1] = -1; s.owner[2] = -1;
  assert.deepEqual(PRO.score(s).pts, [0, 0]);
  const xs = board([
    ['a1', 'x'],
    ['x', 'b1'],
  ], { variant: 'x' });
  xs.owner[1] = -1; xs.owner[2] = -1;
  // every line holds one X (auto ones count too) → each 1 scores in its row and its column
  assert.deepEqual(PRO.score(xs).pts, [2, 2]);
});

test('clone is independent of the original', () => {
  const s = PRO.create(4, 4);
  PRO.apply(s, { i: 0, v: 2 });
  const c = PRO.clone(s);
  PRO.apply(c, { i: 5, v: 1 });
  assert.equal(s.cells[5], 0);
  assert.equal(s.rowMask[1], 0);
  assert.equal(s.last.i, 0);
});

test('every AI level clearly beats random play', () => {
  const rnd = (s) => { const l = PRO.moves(s); return l[Math.floor(Math.random() * l.length)]; };
  for (const level of ['easy', 'normal', 'hard']) {
    let w = 0;
    const n = level === 'hard' ? 6 : 16;
    for (let g = 0; g < n; g++) {
      const s = PRO.create(5, 5, { first: g % 2 });
      while (!PRO.isOver(s)) PRO.apply(s, s.turn === 0 ? PRO.aiMove(s, level) : rnd(s));
      const { pts } = PRO.score(s);
      if (pts[0] > pts[1]) w++;
    }
    assert.ok(w >= n * 0.75, `${level} won only ${w}/${n} against random`);
  }
});
