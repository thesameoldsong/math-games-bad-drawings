import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEQ } from './engine.js';

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

const idx = (s, r, c) => r * s.n + c;
// Build a position from rows like '1 2 . #' with owners given by a parallel map ('b'/'r').
function board(rows, owners, extra = {}) {
  const n = rows.length;
  const s = SEQ.create({ size: n, ...extra });
  for (let r = 0; r < n; r++) {
    const vs = rows[r].trim().split(/\s+/), os = owners[r].trim().split(/\s+/);
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      s.from[i] = -1;
      if (vs[c] === '.') { s.own[i] = -1; s.val[i] = 0; }
      else if (vs[c] === '#') { s.own[i] = -2; s.val[i] = 0; }
      else { s.own[i] = os[c] === 'b' ? 0 : 1; s.val[i] = +vs[c]; }
    }
  }
  s.max = [0, 1].map((p) => Math.max(0, ...s.val.filter((v, i) => s.own[i] === p)));
  return s;
}

test('start position: 1-2-3 diagonals from opposite corners, centre blocked on 7×7', () => {
  const s = SEQ.create({ size: 6 });
  assert.deepEqual([0, 7, 14].map((i) => [s.own[i], s.val[i]]), [[0, 1], [0, 2], [0, 3]]);
  assert.deepEqual([35, 28, 21].map((i) => [s.own[i], s.val[i]]), [[1, 1], [1, 2], [1, 3]]);
  assert.equal(s.turn, 0);
  const s7 = SEQ.create({ size: 7 });
  assert.equal(s7.own[24], SEQ.BLOCK);
  assert.equal(s7.own.filter((o) => o === SEQ.BLOCK).length, 1);
  assert.equal(SEQ.create({ size: 8 }).own.filter((o) => o === SEQ.BLOCK).length, 0);
  assert.equal(SEQ.create({ size: 6, first: 1 }).turn, 1);
});

test('a move writes source + 1 into an adjacent empty cell, diagonals included', () => {
  const s = SEQ.create({ size: 6 });
  assert.ok(SEQ.isLegal(s, { from: 14, to: 21 - 6 })); // 3 → right neighbour
  assert.ok(SEQ.isLegal(s, { from: 14, to: 9 }));      // 3 → diagonal up-right
  assert.ok(SEQ.isLegal(s, { from: 0, to: 1 }));       // any own number may grow
  assert.ok(!SEQ.isLegal(s, { from: 14, to: 21 }));    // occupied by the opponent
  assert.ok(!SEQ.isLegal(s, { from: 14, to: 16 }));    // not adjacent
  assert.ok(!SEQ.isLegal(s, { from: 21, to: 20 }));    // not your number
  SEQ.apply(s, { from: 14, to: 15 });
  assert.equal(s.val[15], 4);
  assert.equal(s.own[15], 0);
  assert.equal(s.from[15], 14);
  assert.deepEqual(s.max, [4, 3]);
  assert.equal(s.turn, 1);
});

test('legal moves use the largest neighbouring number', () => {
  const s = SEQ.create({ size: 6 });
  const m = SEQ.legalMoves(s).find((x) => x.to === 8); // touches 2 and 3
  assert.equal(s.val[m.from], 3);
  // every empty cell next to blue appears exactly once
  const tos = SEQ.legalMoves(s).map((x) => x.to);
  assert.equal(new Set(tos).size, tos.length);
});

test('a diagonal step may cross the opponent’s diagonal link', () => {
  const s = board(['1 1', '2 .'], ['b r', 'r .']);
  s.turn = 0;
  assert.ok(SEQ.isLegal(s, { from: 0, to: 3 }));
  SEQ.apply(s, { from: 0, to: 3 });
  assert.equal(s.val[3], 2);
});

test('turn orders: single, double (A BB AA …) and Thue–Morse', () => {
  const seq = (order) => Array.from({ length: 9 }, (_, k) => SEQ.slotOwner(order, k)).join('');
  assert.equal(seq('alt'), '010101010');
  assert.equal(seq('double'), '011001100');
  assert.equal(seq('tm'), '011010011');
  const s = SEQ.create({ size: 6, order: 'double' });
  const turns = [];
  for (let k = 0; k < 5; k++) { turns.push(s.turn); SEQ.apply(s, SEQ.legalMoves(s)[0]); }
  assert.deepEqual(turns, [0, 1, 1, 0, 0]);
  const f = SEQ.create({ size: 6, order: 'double', first: 1 });
  const t2 = [];
  for (let k = 0; k < 3; k++) { t2.push(f.turn); SEQ.apply(f, SEQ.legalMoves(f)[0]); }
  assert.deepEqual(t2, [1, 0, 0]);
});

test('a boxed-in player is skipped and the other fills the board', () => {
  // red's only number is walled in by blue; blue still has room on the right and bottom
  const s2 = board([
    '1 2 3 .',
    '9 1 4 .',
    '8 7 5 .',
    '. . . .',
  ], [
    'b b b .',
    'b r b .',
    'b b b .',
    '. . . .',
  ]);
  s2.turn = 0; s2.slot = 0;
  assert.ok(!SEQ.hasMove(s2, 1));
  SEQ.apply(s2, { from: idx(s2, 0, 2), to: idx(s2, 0, 3) });
  assert.equal(s2.turn, 0, 'red has no move, blue goes again');
  assert.equal(s2.skipped, 1);
  let guard = 50;
  while (!SEQ.isOver(s2) && guard--) SEQ.apply(s2, SEQ.legalMoves(s2)[0]);
  assert.ok(SEQ.isOver(s2));
  assert.equal(s2.own.filter((o) => o === -1).length, 0, 'board is full at the end');
  assert.equal(SEQ.winner(s2), 0);
});

test('winner is the higher maximum; equal maxima tie', () => {
  const s = board(['1 2', '3 4'], ['b b', 'r r']);
  s.over = true;
  assert.equal(SEQ.winner(s), 1);
  const t = board(['5 1', '2 5'], ['b b', 'r r']);
  assert.equal(SEQ.winner(t), -1);
});

test('the game ends only when nobody can move, and legal moves are empty then', () => {
  const s = SEQ.create({ size: 6 });
  while (!SEQ.isOver(s)) SEQ.apply(s, SEQ.legalMoves(s)[0]);
  assert.equal(s.own.filter((o) => o === -1).length, 0);
  assert.deepEqual(SEQ.legalMoves(s), []);
  assert.equal(SEQ.aiMove(s, 'normal'), null);
});

test('AI only plays legal moves and full AI games terminate (all sizes, orders, levels)', () => {
  let r = 1;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (const size of [6, 7, 8]) for (const order of ['alt', 'double', 'tm']) {
    const s = SEQ.create({ size, order, first: size % 2 });
    const levels = [['easy', 'normal'], ['normal', 'hard'], ['hard', 'easy']][(size + order.length) % 3];
    let guard = 100;
    while (!SEQ.isOver(s) && guard--) {
      const m = SEQ.aiMove(s, levels[s.turn], { rnd, budget: 40 });
      assert.ok(SEQ.isLegal(s, m), `illegal ${JSON.stringify(m)}`);
      SEQ.apply(s, m);
    }
    assert.ok(SEQ.isOver(s), `${size} ${order} did not finish`);
    assert.equal(s.ply, size * size - 6 - (size % 2));
  }
});

test('blocked cells and finished games reject moves; legal moves never target them', () => {
  const s = SEQ.create({ size: 7 });
  // walk blue's 3 (2,2) towards the centre (3,3): it is a neighbour but blocked
  assert.ok(!SEQ.isLegal(s, { from: idx(s, 2, 2), to: 24 }));
  assert.ok(!SEQ.legalMoves(s).some((m) => m.to === 24));
  assert.ok(!SEQ.isLegal(s, { from: 'x', to: 3 }));
  assert.ok(!SEQ.isLegal(s, { from: -1, to: 3 }));
  assert.ok(!SEQ.isLegal(s, { from: 0, to: 49 }));
  const t = SEQ.clone(s);
  t.over = true;
  assert.ok(!SEQ.isLegal(t, { from: 0, to: 1 }));
  // clone is deep: applying to a clone leaves the original untouched
  SEQ.apply(SEQ.clone(s), { from: 0, to: 1 });
  assert.equal(s.own[1], SEQ.EMPTY);
});

test('turn orders with the second player starting', () => {
  const turns = (order) => {
    const s = SEQ.create({ size: 8, order, first: 1 }), out = [];
    for (let k = 0; k < 8; k++) { out.push(s.turn); SEQ.apply(s, SEQ.legalMoves(s)[0]); }
    return out.join('');
  };
  assert.equal(turns('alt'), '10101010');
  assert.equal(turns('double'), '10011001');
  assert.equal(turns('tm'), '10010110');
});

test('Thue–Morse: a blocked player loses all their slots, the other plays every move', () => {
  const s = board([
    '1 2 3 .',
    '9 1 4 .',
    '8 7 5 .',
    '. . . .',
  ], [
    'b b b .',
    'b r b .',
    'b b b .',
    '. . . .',
  ], { order: 'tm' });
  s.turn = 0; s.slot = 0;
  let moves = 0;
  while (!SEQ.isOver(s)) { assert.equal(s.turn, 0); SEQ.apply(s, SEQ.legalMoves(s)[0]); moves++; }
  assert.equal(moves, 7);
  assert.equal(SEQ.winner(s), 0);
});

test('AI levels clearly beat random play', () => {
  let r = 7;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (const level of ['easy', 'normal']) {
    let wins = 0;
    for (let g = 0; g < 10; g++) {
      const s = SEQ.create({ size: 6, order: g % 3 ? 'alt' : 'double', first: g % 2 });
      while (!SEQ.isOver(s)) {
        const ms = SEQ.legalMoves(s);
        SEQ.apply(s, s.turn === 0 ? SEQ.aiMove(s, level, { rnd, budget: 100 }) : ms[Math.floor(rnd() * ms.length)]);
      }
      if (SEQ.winner(s) === 0) wins++;
    }
    assert.ok(wins >= (level === 'easy' ? 6 : 9), `${level} won only ${wins}/10 against random`);
  }
});

test('normal AI beats easy AI most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 10; i++) {
    const s = SEQ.create({ size: 6, first: i % 2 });
    while (!SEQ.isOver(s)) SEQ.apply(s, SEQ.aiMove(s, s.turn === 0 ? 'normal' : 'easy', { budget: 100 }));
    if (SEQ.winner(s) === 0) wins++;
  }
  assert.ok(wins >= 7, `normal won only ${wins}/10`);
});

test('AI sees that boxing the opponent in wins', () => {
  // A (top-left) touches only blue; B (bottom-right) touches blue 2 and red 8/9.
  // Taking A now ties 10:10, taking B first shuts red out and then A gives 10:9.
  const s = board([
    '. 9 1 1',
    '1 1 1 1',
    '1 1 8 2',
    '1 1 9 .',
  ], [
    '. b b b',
    'b b r r',
    'r r r b',
    'r r r .',
  ]);
  s.turn = 0; s.slot = 0;
  for (const level of ['normal', 'hard']) assert.equal(SEQ.aiMove(s, level, { budget: 200 }).to, 15, level);
  const x = SEQ.clone(s);
  SEQ.apply(x, { from: 11, to: 15 });
  assert.equal(x.turn, 0);
  SEQ.apply(x, SEQ.legalMoves(x)[0]);
  assert.ok(x.over);
  assert.equal(SEQ.winner(x), 0);
});
