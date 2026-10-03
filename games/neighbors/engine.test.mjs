import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NB } from './engine.js';

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

const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const board = (rows) => rows.flat();

test('runs: pairs, triples, row + column double count', () => {
  // 4 4 4 . .   → row 12;  first column 4,4 → 8;  7 7 in row 2 → 14
  const b = board([
    [4, 4, 4, 0, 0],
    [4, 1, 2, 7, 7],
    [3, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ]);
  assert.equal(NB.score(b), 12 + 8 + 14);
  assert.equal(NB.runs(b).length, 3);
});

test('non-adjacent equal numbers do not score; a full row of one number scores its sum', () => {
  assert.equal(NB.score(board([[5, 1, 5, 1, 5], [1, 5, 1, 5, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]])), 0);
  assert.equal(NB.score(board([[9, 9, 9, 9, 9], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]])), 45);
});

test('book-style shapes: four 3s in a line 12, in a 2×2 square 24', () => {
  const line = Array(25).fill(0); [0, 1, 2, 3].forEach((i) => (line[i] = 3));
  const sq = Array(25).fill(0); [0, 1, 5, 6].forEach((i) => (sq[i] = 3));
  assert.equal(NB.score(line), 12);
  assert.equal(NB.score(sq), 24);
});

test('gain equals the score difference, including merging two runs', () => {
  const r = rng(7);
  for (let t = 0; t < 3000; t++) {
    const b = Array.from({ length: 25 }, () => (r() < 0.3 ? 0 : 1 + Math.floor(r() * 3)));
    const empty = NB.empties(b);
    if (!empty.length) continue;
    const i = empty[Math.floor(r() * empty.length)], v = 1 + Math.floor(r() * 3);
    const before = NB.score(b);
    const g = NB.gain(b, i, v);
    b[i] = v;
    assert.equal(NB.score(b) - before, g);
  }
});

test('placement rules: only empty cells, once per player per number, next number after everyone', () => {
  const s = NB.create({ players: 2 }, rng(3));
  const v = s.roll;
  NB.place(s, 0, 12);
  assert.throws(() => NB.place(s, 0, 13), /illegal/);
  assert.equal(s.round, 0);
  assert.deepEqual(NB.waiting(s), [1]);
  NB.place(s, 1, 12);
  assert.equal(s.round, 1);
  assert.equal(s.boards[0][12], v);
  assert.equal(s.boards[1][12], v);
  assert.throws(() => NB.place(s, 0, 12), /illegal/);
});

test('game ends after 25 numbers with every board full', () => {
  const s = NB.create({ players: 3 }, rng(11));
  let guard = 0;
  while (!s.over && guard++ < 200) for (const p of NB.waiting(s)) NB.place(s, p, NB.empties(s.boards[p])[0]);
  assert.ok(s.over);
  assert.equal(s.rolls.length, 25);
  for (const b of s.boards) assert.equal(NB.empties(b).length, 0);
  assert.throws(() => NB.place(s, 0, 0), /illegal/);
});

test('deck variant: 25 cards from four of each 1..10, never more than four of a number', () => {
  for (let k = 0; k < 30; k++) {
    const s = NB.create({ players: 1, source: 'deck' }, rng(100 + k));
    while (!s.over) NB.place(s, 0, NB.empties(s.boards[0])[0]);
    const counts = Array(11).fill(0);
    s.rolls.forEach((v) => counts[v]++);
    assert.ok(counts.every((c) => c <= 4));
    assert.equal(s.deck.reduce((a, b) => a + b, 0), 15);
  }
});

test('masked view hides other boards until the game is over', () => {
  const s = NB.create({ players: 2 }, rng(5));
  NB.place(s, 0, 3); NB.place(s, 1, 4);
  const m = NB.masked(s, 1);
  assert.equal(m.boards[0][3], -1);
  assert.equal(m.boards[1][4], s.boards[1][4]);
  assert.equal(NB.score(m.boards[0]), 0);
});

test('winners: ties share the win', () => {
  const s = NB.create({ players: 2 }, rng(1));
  s.boards = [board([[2, 2, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]),
    board([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 1, 1, 1, 0]])];
  assert.deepEqual(NB.winners(s), [0, 1]);
});

test('AI never picks an illegal cell, and every level finishes the game', () => {
  for (const source of ['die', 'deck']) {
    const s = NB.create({ players: 3, source }, rng(42));
    const lv = ['easy', 'normal', 'hard'];
    while (!s.over) {
      for (const p of NB.waiting(s)) {
        const i = NB.aiMove(s, p, lv[p]);
        assert.ok(NB.canPlace(s, p, i), `${lv[p]} picked ${i}`);
        NB.place(s, p, i);
      }
    }
    assert.equal(s.rolls.length, 25);
  }
});

test('hard scores more than normal, normal more than easy (same numbers)', () => {
  const tot = { easy: 0, normal: 0, hard: 0 };
  for (let g = 0; g < 8; g++) {
    const draws = rng(900 + g);
    const s = NB.create({ players: 3 }, draws);
    const lv = ['easy', 'normal', 'hard'];
    while (!s.over) for (const p of NB.waiting(s)) NB.place(s, p, NB.aiMove(s, p, lv[p]), draws);
    NB.scores(s).forEach((x, p) => (tot[lv[p]] += x));
  }
  assert.ok(tot.hard > tot.normal && tot.normal > tot.easy, JSON.stringify(tot));
});

test('end game: a low number goes to the quiet corner, keeping the prime center for a big one', () => {
  // Two holes left: the corner (0) and the center (12), which a 9 would turn into 45 points.
  const b = board([
    [0, 2, 3, 6, 6],
    [5, 2, 9, 4, 4],
    [5, 9, 0, 9, 7],
    [1, 3, 1, 8, 7],
    [2, 3, 10, 8, 8],
  ]);
  const s = NB.create({ players: 1 }, rng(2));
  s.boards[0] = b; s.roll = 1; s.round = 23;
  assert.ok(NB.gain(b, 12, 1) > NB.gain(b, 0, 1));
  // Exact endgame: corner keeps 4.7 expected vs 3.9 for the center; must hold for every seed.
  for (let k = 0; k < 20; k++) assert.equal(NB.aiMove(s, 0, 'hard', rng(50 + k)), 0);
  assert.equal(NB.smartMove(s, 0), 0);
  // Greedy normal grabs the point.
  assert.equal(NB.aiMove(s, 0, 'normal'), 12);
});

test('deck end game: exact search knows which cards are gone', () => {
  // Same board, but all four 9s are used up: now the center is only worth a 1 → take the point.
  const b = board([
    [0, 2, 3, 6, 6],
    [5, 2, 9, 4, 4],
    [5, 9, 0, 9, 7],
    [1, 3, 1, 8, 7],
    [2, 3, 10, 8, 8],
  ]);
  const s = NB.create({ players: 1, source: 'deck' }, rng(4));
  s.boards[0] = b; s.roll = 1; s.round = 23;
  s.deck = [0, 2, 3, 3, 3, 3, 3, 3, 3, 0, 3];
  for (let k = 0; k < 10; k++) assert.equal(NB.aiMove(s, 0, 'hard', rng(70 + k)), 12);
});

test('masked view hides the last placed cell of others and keeps own board; full reveal at the end', () => {
  const s = NB.create({ players: 2 }, rng(9));
  NB.place(s, 0, 7); NB.place(s, 1, 8);
  const m = NB.masked(s, 1);
  assert.equal(m.last[0], -1);
  assert.equal(m.last[1], 8);
  assert.ok(m.boards[0].every((v) => v === 0 || v === -1));
  while (!s.over) for (const p of NB.waiting(s)) NB.place(s, p, NB.empties(s.boards[p])[0]);
  assert.deepEqual(NB.masked(s, 1).boards, s.boards);
});

test('every level clearly beats random play', () => {
  // (hard vs normal is covered above; hard is the slow one)
  const tot = { random: 0, easy: 0, normal: 0 };
  for (let g = 0; g < 10; g++) {
    const r = rng(300 + g);
    const s = NB.create({ players: 3 }, r);
    const lv = ['random', 'easy', 'normal'];
    while (!s.over) for (const p of NB.waiting(s)) {
      const e = NB.empties(s.boards[p]);
      NB.place(s, p, lv[p] === 'random' ? e[Math.floor(r() * e.length)] : NB.aiMove(s, p, lv[p], r), r);
    }
    NB.scores(s).forEach((x, p) => (tot[lv[p]] += x));
  }
  assert.ok(tot.easy > 2 * tot.random && tot.normal > 2.5 * tot.random, JSON.stringify(tot));
});
