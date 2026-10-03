import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPR } from './engine.js';

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

// deterministic randomness for reproducible games
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const at = (s, i) => [s.spots[i].x, s.spots[i].y];
const fixed = (pts) => ({ n: pts.length, spots: pts.map(([x, y]) => ({ x, y, deg: 0 })), edges: [], turn: 0, moves: 0, count: [0, 0], last: null, over: false, winner: -1 });
const circlePts = (cx, cy, r, from = -Math.PI / 2, n = 40) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(from + (i / n) * Math.PI * 2), cy + r * Math.sin(from + (i / n) * Math.PI * 2)]);
const regionsWith = (s, v) => SPR.topology(s).regions.filter((R) => R.some((b) => b.includes(v)));

test('start: n isolated spots in one region', () => {
  const s = SPR.create(4, rng(1));
  assert.equal(s.spots.length, 4);
  const t = SPR.topology(s);
  assert.equal(t.regions.length, 1);
  assert.deepEqual(t.regions[0].map((b) => b.length), [1, 1, 1, 1]);
});

test('known results: first player loses with 1–2 spots, wins with 3–4', () => {
  const g = (n) => SPR.grundy(SPR.topology(SPR.create(n, rng(n))), 20000);
  assert.equal(g(1), 0);
  assert.equal(g(2), 0);
  assert.notEqual(g(3), 0);
  assert.notEqual(g(4), 0);
});

test('a straight line adds a spot in the middle and two edges', () => {
  const s = fixed([[100, 200], [300, 200]]);
  const m = SPR.makeMove(s, 0, 1, [at(s, 0), at(s, 1)]);
  assert.ok(!m.err, m.err);
  SPR.apply(s, m);
  assert.equal(s.spots.length, 3);
  assert.equal(s.edges.length, 2);
  assert.deepEqual(s.spots.map((p) => p.deg), [1, 1, 2]);
  assert.ok(Math.abs(s.spots[2].x - 200) < 40);
  assert.equal(s.turn, 1);
});

test('crossing, touching and running through spots are rejected', () => {
  const s = fixed([[100, 200], [300, 200], [200, 100], [200, 300], [200, 400]]);
  SPR.apply(s, SPR.makeMove(s, 0, 1, [at(s, 0), at(s, 1)]));
  assert.equal(SPR.makeMove(s, 2, 3, [at(s, 2), at(s, 3)]).err, 'spot'); // passes the new middle spot
  assert.equal(SPR.makeMove(s, 2, 3, [at(s, 2), [240, 150], [240, 250], at(s, 3)]).err, 'cross');
  assert.equal(SPR.makeMove(s, 2, 4, [at(s, 2), [130, 150], [130, 201], [130, 260], at(s, 4)]).err, 'cross');
  assert.ok(!SPR.makeMove(s, 3, 4, [at(s, 3), [250, 350], at(s, 4)]).err);
});

test('a spot takes at most three lines; a loop needs two free ends', () => {
  const s = fixed([[200, 240], [200, 60], [60, 400], [340, 400], [380, 60]]);
  for (const j of [1, 2]) SPR.apply(s, SPR.makeMove(s, 0, j, [at(s, 0), at(s, j)]));
  assert.equal(s.spots[0].deg, 2);
  assert.equal(SPR.makeMove(s, 0, 0, circlePts(200, 280, 40, -Math.PI / 2).map(([x, y]) => [x, y - 0])).err, 'loop');
  SPR.apply(s, SPR.makeMove(s, 0, 3, [at(s, 0), at(s, 3)]));
  assert.equal(SPR.makeMove(s, 0, 4, [at(s, 0), at(s, 4)]).err, 'full');
});

test('one spot: loop, then the only reply ends the game — second player wins', () => {
  const s = fixed([[200, 200]]);
  const loop = circlePts(200, 260, 60); // circle through the spot (its top point)
  const m = SPR.makeMove(s, 0, 0, loop);
  assert.ok(!m.err, m.err);
  SPR.apply(s, m);
  assert.equal(SPR.topology(s).regions.length, 2);
  assert.ok(!s.over);
  const m2 = SPR.sampleMoves(s, 1, rng(3))[0];
  assert.ok(m2);
  SPR.apply(s, m2);
  assert.ok(s.over);
  assert.equal(s.winner, 1);
});

test('topology knows inside from outside', () => {
  // spot 0 draws a loop around spot 1; spot 2 stays outside
  const s = fixed([[200, 100], [200, 220], [200, 420]]);
  const m = SPR.makeMove(s, 0, 0, circlePts(200, 200, 100));
  assert.ok(!m.err, m.err);
  SPR.apply(s, m);
  const in1 = regionsWith(s, 1), in2 = regionsWith(s, 2);
  assert.equal(in1.length, 1);
  assert.equal(in2.length, 1);
  assert.notEqual(in1[0], in2[0]);
  // the loop's new spot (3) borders both regions, spot 1 and spot 2 share none
  assert.equal(regionsWith(s, 3).length, 2);
  assert.ok(!SPR.livePairs(s).some(([a, b]) => (a === 1 && b === 2)));
  assert.ok(SPR.livePairs(s).some(([a, b]) => (a === 1 && b === 3)));
  // a curve from 1 to 2 must cross the loop
  assert.equal(SPR.makeMove(s, 1, 2, [at(s, 1), [260, 330], at(s, 2)]).err, 'cross');
});

test('freehand strokes snap to spots; tampered online moves are refused', () => {
  const s = fixed([[100, 200], [300, 200]]);
  const stroke = [[104, 203], [150, 230], [200, 240], [250, 230], [296, 204]];
  const m = SPR.fromStroke(s, stroke);
  assert.ok(!m.err, m.err);
  assert.equal(m.a, 0); assert.equal(m.b, 1);
  assert.ok(SPR.verify(s, JSON.parse(JSON.stringify(m))));
  assert.equal(SPR.verify(s, { ...m, pts: [at(s, 0), [200, 600], at(s, 1)] }), null);
  assert.equal(SPR.fromStroke(s, [[150, 300], [250, 300]]).err, 'end');
});

test('Euler: spots − lines + regions = 1 + pieces, all game long', () => {
  const s = SPR.create(4, rng(11)), rand = rng(12);
  while (!s.over) {
    const m = SPR.aiMove(s, 'easy', rand);
    assert.ok(m);
    SPR.apply(s, m);
    const V = s.spots.length, E = s.edges.length, F = SPR.topology(s).regions.length;
    const par = s.spots.map((_, i) => i), find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
    for (const e of s.edges) par[find(e.a)] = find(e.b);
    const C = new Set(s.spots.map((_, i) => find(i))).size;
    assert.equal(V - E + F, 1 + C);
  }
});

test('AI only plays legal moves and every game ends within 2n…3n−1 moves', () => {
  for (const [n, levels, seed] of [[2, ['easy', 'hard'], 1], [3, ['normal', 'easy'], 2], [4, ['easy', 'easy'], 3], [5, ['easy', 'normal'], 4], [6, ['easy', 'easy'], 5]]) {
    const rand = rng(seed * 101), s = SPR.create(n, rand);
    let guard = 3 * n;
    while (!s.over && guard--) {
      const m = SPR.aiMove(s, levels[s.turn], rand);
      assert.ok(m, `no move found with ${n} spots after ${s.moves} moves`);
      assert.ok(SPR.verify(s, JSON.parse(JSON.stringify(m))), 'AI move failed re-validation');
      SPR.apply(s, m);
    }
    assert.ok(s.over, 'game did not end');
    assert.ok(s.moves >= 2 * n && s.moves <= 3 * n - 1, `${s.moves} moves with ${n} spots`);
    assert.ok(!SPR.hasMoves(s));
  }
});

test('strong AI wins the 3-spot game when it moves first', () => {
  for (let i = 0; i < 4; i++) {
    const rand = rng(500 + i), s = SPR.create(3, rand);
    while (!s.over) SPR.apply(s, SPR.aiMove(s, s.turn === 0 ? 'hard' : 'easy', rand));
    assert.equal(s.winner, 0);
  }
});

test('regions with fewer than two free ends offer no moves', () => {
  // two spots with one free end each, in different regions: game over; in the same region: one move
  assert.deepEqual(SPR.normalize([[[0]], [[1]]], [1, 1]), []);
  assert.equal(SPR.normalize([[[0], [1]]], [1, 1]).length, 1);
  // a single spot with two free ends can still loop
  assert.equal(SPR.normalize([[[0]]], [2]).length, 1);
  assert.equal(SPR.grundy({ regions: [[[0]], [[1]]], lives: [1, 1] }), 0);
  assert.equal(SPR.grundy({ regions: [[[0], [1]]], lives: [1, 1] }), 1);
});

test('online moves are re-checked: bad spot indices, full spots and loops on one free end are refused', () => {
  const s = fixed([[200, 240], [200, 60], [60, 400], [340, 400]]);
  for (const j of [1, 2, 3]) SPR.apply(s, SPR.makeMove(s, 0, j, [at(s, 0), at(s, j)]));
  assert.equal(SPR.verify(s, { a: 0, b: 1, pts: [at(s, 0), [120, 150], at(s, 1)] }), null); // spot 0 is full
  assert.equal(SPR.verify(s, { a: 9, b: 1, pts: [[0, 0], at(s, 1)] }), null);
  assert.equal(SPR.verify(s, null), null);
  assert.equal(SPR.verify(s, { a: 1, b: 1, pts: circlePts(200, 100, 40) }), null); // spot 1 has one free end
});

test('the computer can join two spots that sit very close together', () => {
  const s = fixed([[200, 240], [214, 240]]);
  for (let i = 0; i < 5; i++) {
    const m = SPR.sampleMoves(s, 1, rng(70 + i), [[0, 1]])[0];
    assert.ok(m, 'no route found');
    assert.ok(SPR.verify(s, JSON.parse(JSON.stringify(m))));
  }
});

test('no move is offered once the game is over', () => {
  const s = fixed([[200, 200]]), rand = rng(9);
  while (!s.over) SPR.apply(s, SPR.aiMove(s, 'easy', rand));
  assert.deepEqual(SPR.livePairs(s), []);
  assert.equal(SPR.aiMove(s, 'easy', rand), null);
  assert.equal(SPR.canDraw(s), false);
});
