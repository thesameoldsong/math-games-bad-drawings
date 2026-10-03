import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OAC } from './engine.js';

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

const at = (r, c) => r * 6 + c;
function setup(marks, opts) {
  const s = OAC.create(opts);
  for (const [r, c, sym] of marks) { s.cells[at(r, c)] = sym; s.by[at(r, c)] = 0; }
  return s;
}

test('there are 32 five-cell lines on a 6×6 board', () => {
  assert.equal(OAC.WINDOWS.length, 32);
});

test('order moves first and turns alternate', () => {
  const s = OAC.create();
  assert.equal(s.turn, 0);
  OAC.apply(s, { i: 0, sym: 'X' });
  assert.equal(s.turn, 1);
  assert.equal(s.by[0], 0);
  OAC.apply(s, { i: 1, sym: 'X' });
  assert.equal(s.turn, 0);
  assert.equal(s.by[1], 1);
});

test('five in a row of either symbol wins for Order, whoever completes it', () => {
  for (const sym of ['X', 'O']) {
    const s = setup([[2, 1, sym], [2, 2, sym], [2, 3, sym], [2, 4, sym]]);
    s.turn = 1; // even Chaos completing it hands Order the win
    OAC.apply(s, { i: at(2, 5), sym });
    assert.equal(s.winner, 0);
    assert.deepEqual(s.line, [at(2, 1), at(2, 2), at(2, 3), at(2, 4), at(2, 5)]);
    assert.equal(OAC.points(s), 5 + 36 - 5);
  }
});

test('vertical and both diagonals count; mixed lines do not', () => {
  const v = setup([[0, 3, 'O'], [1, 3, 'O'], [2, 3, 'O'], [3, 3, 'O']]);
  OAC.apply(v, { i: at(4, 3), sym: 'O' });
  assert.equal(v.winner, 0);
  const d = setup([[1, 1, 'X'], [2, 2, 'X'], [3, 3, 'X'], [4, 4, 'X']]);
  OAC.apply(d, { i: at(5, 5), sym: 'X' });
  assert.equal(d.winner, 0);
  const a = setup([[0, 4, 'X'], [1, 3, 'X'], [2, 2, 'X'], [3, 1, 'X']]);
  OAC.apply(a, { i: at(4, 0), sym: 'X' });
  assert.equal(a.winner, 0);
  const mixed = setup([[2, 0, 'X'], [2, 1, 'X'], [2, 2, 'O'], [2, 3, 'X']]);
  OAC.apply(mixed, { i: at(2, 4), sym: 'X' });
  assert.equal(mixed.winner, -1);
});

test('six in a row also wins (contains a five)', () => {
  const s = setup([[0, 0, 'X'], [0, 1, 'X'], [0, 3, 'X'], [0, 4, 'X'], [0, 5, 'X']]);
  OAC.apply(s, { i: at(0, 2), sym: 'X' });
  assert.equal(s.winner, 0);
});

test('Chaos wins as soon as no line can become uniform', () => {
  // A pattern with an X and an O in every five-cell line; filling it row by row ends the game early.
  const pat = (r, c) => ((r + Math.floor(c / 2)) % 2 ? 'X' : 'O');
  const s = OAC.create();
  for (let i = 0; i < 36 && !OAC.isOver(s); i++) OAC.apply(s, { i, sym: pat(Math.floor(i / 6), i % 6) });
  assert.equal(s.winner, 1);
  assert.equal(s.line, null);
  assert.ok(OAC.empties(s) > 0, 'decided before the board is full');
  assert.equal(OAC.points(s), 5 + OAC.empties(s));
  assert.ok(!OAC.anyAlive(s.cells));
});

test('jewels: wild counts as both, blank as neither, once each', () => {
  const s = setup([[3, 0, 'X'], [3, 1, 'X'], [3, 3, 'X'], [3, 4, 'X']], { jewels: true });
  assert.deepEqual(OAC.symbols(s), ['X', 'O', 'W']);
  OAC.apply(s, { i: at(3, 2), sym: 'W' });
  assert.equal(s.winner, 0);

  const b = setup([[3, 0, 'O'], [3, 1, 'O'], [3, 3, 'O'], [3, 4, 'O']], { jewels: true });
  b.turn = 1;
  assert.deepEqual(OAC.symbols(b), ['X', 'O', 'B']);
  OAC.apply(b, { i: at(3, 2), sym: 'B' });
  assert.equal(b.winner, -1);
  assert.equal(b.jewels[1], false);
  b.turn = 1;
  assert.ok(!OAC.legal(b, { i: at(5, 5), sym: 'B' }), 'blank only once');
  assert.ok(!OAC.legal(b, { i: at(5, 5), sym: 'W' }), 'chaos cannot use the wild');
  assert.ok(!OAC.legal(OAC.create(), { i: 0, sym: 'W' }), 'no jewels unless the variant is on');
});

test('illegal moves are rejected', () => {
  const s = OAC.create();
  OAC.apply(s, { i: 7, sym: 'O' });
  assert.ok(!OAC.legal(s, { i: 7, sym: 'X' }));
  assert.ok(!OAC.legal(s, { i: 36, sym: 'X' }));
  assert.ok(!OAC.legal(s, { i: 3, sym: 'Z' }));
});

test('AI takes an immediate win as Order and blocks it as Chaos', () => {
  for (const level of ['normal', 'hard']) {
    const s = setup([[1, 0, 'O'], [1, 1, 'O'], [1, 2, 'O'], [1, 3, 'O'], [4, 4, 'X']]);
    const m = OAC.aiMove(s, level);
    OAC.apply(s, m);
    assert.equal(s.winner, 0, level + ' order should win');

    const c = setup([[1, 1, 'O'], [1, 2, 'O'], [1, 3, 'O'], [1, 4, 'O'], [1, 0, 'X'], [4, 4, 'X']]);
    c.turn = 1;
    const mc = OAC.aiMove(c, level);
    assert.equal(mc.i, at(1, 5), level + ' chaos must plug the only gap');
    assert.equal(mc.sym, 'X');
  }
});

test('AI only plays legal moves and full AI games terminate', () => {
  for (const [lo, lc, jewels] of [['easy', 'easy', false], ['normal', 'easy', true], ['easy', 'hard', true], ['normal', 'normal', false]]) {
    const s = OAC.create({ jewels });
    let guard = 40;
    while (!OAC.isOver(s) && guard--) {
      const m = OAC.aiMove(s, s.turn === 0 ? lo : lc);
      assert.ok(OAC.legal(s, m), `illegal ${JSON.stringify(m)}`);
      OAC.apply(s, m);
    }
    assert.ok(OAC.isOver(s));
    assert.ok(OAC.points(s) >= 5);
  }
});

test('normal Chaos beats easy Order, normal Order beats easy Chaos', () => {
  let chaos = 0, order = 0;
  for (let i = 0; i < 6; i++) {
    const a = OAC.create();
    while (!OAC.isOver(a)) OAC.apply(a, OAC.aiMove(a, a.turn === 0 ? 'easy' : 'normal'));
    chaos += a.winner === 1;
    const b = OAC.create();
    while (!OAC.isOver(b)) OAC.apply(b, OAC.aiMove(b, b.turn === 0 ? 'normal' : 'easy'));
    order += b.winner === 0;
  }
  assert.ok(chaos >= 4, `chaos won ${chaos}/6`);
  assert.ok(order >= 4, `order won ${order}/6`);
});

test('no moves after the game is decided; clone is independent', () => {
  const s = setup([[0, 0, 'X'], [0, 1, 'X'], [0, 2, 'X'], [0, 3, 'X']]);
  const c = OAC.clone(s);
  OAC.apply(s, { i: at(0, 4), sym: 'X' });
  assert.equal(s.winner, 0);
  assert.deepEqual(OAC.moves(s), []);
  assert.ok(!OAC.legal(s, { i: at(5, 5), sym: 'O' }));
  assert.equal(c.cells[at(0, 4)], '');
  assert.equal(c.winner, -1);
});

test('the double does not rescue a line that already holds both symbols', () => {
  const s = setup([[3, 0, 'X'], [3, 1, 'O'], [3, 3, 'X'], [3, 4, 'X']], { jewels: true });
  OAC.apply(s, { i: at(3, 2), sym: 'W' });
  assert.equal(s.winner, -1);
  assert.equal(s.jewels[0], false);
  s.turn = 0;
  assert.ok(!OAC.legal(s, { i: at(5, 5), sym: 'W' }), 'double only once');
});

test('a blank kills every line through it (can decide the game for Chaos)', () => {
  const s = OAC.create({ jewels: true });
  const bl = OAC.clone(s); bl.turn = 1;
  OAC.apply(bl, { i: at(2, 2), sym: 'B' });
  for (const w of OAC.WINDOWS) assert.equal(OAC.alive(bl.cells, w), !w.includes(at(2, 2)));
});

test('a full board without a five is a Chaos win worth 5', () => {
  const pat = (r, c) => ((r + Math.floor(c / 2)) % 2 ? 'X' : 'O');
  const s = OAC.create();
  for (let i = 0; i < 35; i++) s.cells[i] = pat(Math.floor(i / 6), i % 6);
  // pretend the early check did not fire: put one last square in by hand
  s.cells[35] = '';
  OAC.apply(s, { i: 35, sym: 'X' });
  assert.equal(s.winner, 1);
  assert.equal(OAC.points(s), 5);
});

test('Chaos AI spends its blank on a square that would finish two fives', () => {
  // (2,2) completes an X-five across and an O-five down: X or O there loses, only the blank saves Chaos.
  for (const level of ['easy', 'normal', 'hard']) {
    const s = setup([[2, 0, 'X'], [2, 1, 'X'], [2, 3, 'X'], [2, 4, 'X'], [0, 2, 'O'], [1, 2, 'O'], [3, 2, 'O'], [4, 2, 'O'],
      [2, 5, 'O'], [5, 2, 'X']], { jewels: true });
    s.turn = 1; s.moves = 10;
    const m = OAC.aiMove(s, level);
    if (level !== 'easy') assert.deepEqual(m, { i: at(2, 2), sym: 'B' }, level);
    assert.ok(OAC.legal(s, m));
  }
});

test('normal AI clearly beats random play on both sides', () => {
  const rnd = (s) => { const ms = OAC.moves(s); return ms[Math.floor(Math.random() * ms.length)]; };
  let order = 0, chaos = 0;
  for (let g = 0; g < 8; g++) {
    const a = OAC.create();
    while (!OAC.isOver(a)) OAC.apply(a, a.turn === 0 ? OAC.aiMove(a, 'normal') : rnd(a));
    order += a.winner === 0;
    const b = OAC.create();
    while (!OAC.isOver(b)) OAC.apply(b, b.turn === 1 ? OAC.aiMove(b, 'normal') : rnd(b));
    chaos += b.winner === 1;
  }
  assert.ok(order >= 7, `order won ${order}/8`);
  assert.ok(chaos >= 7, `chaos won ${chaos}/8`);
});
