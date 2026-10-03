import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CORNERS as C } from './engine.js';

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

const at = (n, r, c) => r * n + c;
const findSquare = (n, corners) => {
  const want = [...corners].sort((a, b) => a - b).join();
  return C.geometry(n).squares.find((s) => [...s.corners].sort((a, b) => a - b).join() === want);
};
// Play a list of [player, cell] dots, forcing the turn (handy for setting up positions).
function setup(n, dots, opts) {
  const s = C.create(n, opts);
  for (const [p, r, c] of dots) { s.turn = p; assert.ok(C.apply(s, { t: 'dot', i: at(n, r, c) })); }
  return s;
}

test('geometry counts grid squares and diamonds', () => {
  // 7×7: grid squares 36+25+16+9+4+1 = 91, diamonds 25+9+1 = 35
  const g = C.geometry(7);
  assert.equal(g.squares.filter((s) => s.kind === 'grid').length, 91);
  assert.equal(g.squares.filter((s) => s.kind === 'diamond').length, 35);
  const big = findSquare(7, [at(7, 0, 0), at(7, 0, 6), at(7, 6, 0), at(7, 6, 6)]);
  assert.equal(big.area.length, 45);
  assert.equal(big.edge.length, 20);
  const dia = findSquare(7, [at(7, 0, 3), at(7, 3, 6), at(7, 6, 3), at(7, 3, 0)]);
  assert.equal(dia.kind, 'diamond');
  assert.equal(dia.area.length, 21); // |dy|+|dx| ≤ 3 has 25 cells, minus 4 corners
  assert.equal(dia.edge.length, 8); // |dy|+|dx| = 3 has 12 cells, minus 4 corners
});

test('dots alternate turns and cannot go on taken cells', () => {
  const s = C.create(7);
  assert.ok(C.apply(s, { t: 'dot', i: 10 }));
  assert.equal(s.turn, 1);
  assert.equal(C.apply(s, { t: 'dot', i: 10 }), false);
  assert.equal(s.turn, 1);
  assert.equal(C.apply(s, { t: 'dot', i: 49 }), false);
});

test('a finished square is claimed on a later turn: corners shaded, area filled', () => {
  const n = 7;
  const s = setup(n, [[0, 1, 1], [0, 1, 3], [0, 3, 1], [0, 3, 3], [1, 2, 2]]);
  s.turn = 0;
  const sq = findSquare(n, [at(n, 1, 1), at(n, 1, 3), at(n, 3, 1), at(n, 3, 3)]);
  assert.deepEqual(C.claimGain(s, sq.id, 0), { points: 4, dots: 4 }); // 9-cell area: 4 corners, 1 red dot, 4 to fill
  assert.equal(C.claimGain(s, sq.id, 1), null);
  assert.ok(C.apply(s, { t: 'claim', s: sq.id }));
  assert.equal(s.score[0], 4);
  assert.equal(s.owner[at(n, 2, 2)], 1, 'opponent dot inside stays');
  assert.equal(s.owner[at(n, 1, 2)], 0);
  assert.equal(s.shaded[at(n, 1, 2)], 0, 'filled cells are hollow');
  assert.equal(s.turn, 1);
  s.turn = 0;
  assert.equal(C.apply(s, { t: 'claim', s: sq.id }), false, 'nothing left to gain');
});

test('re-claiming is allowed when it still shades a corner', () => {
  const n = 6;
  const s = setup(n, [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1], [0, 0, 2], [0, 1, 2]]);
  s.turn = 0;
  const a = findSquare(n, [at(n, 0, 0), at(n, 0, 1), at(n, 1, 0), at(n, 1, 1)]);
  const b = findSquare(n, [at(n, 0, 1), at(n, 0, 2), at(n, 1, 1), at(n, 1, 2)]);
  assert.ok(C.apply(s, { t: 'claim', s: a.id }));
  s.turn = 0;
  assert.deepEqual(C.claimGain(s, b.id), { points: 2, dots: 0 });
  assert.ok(C.apply(s, { t: 'claim', s: b.id }));
  assert.equal(s.score[0], 6);
});

test('diamonds count, and the edge variant only fills the border', () => {
  const n = 7;
  const dots = [[0, 1, 3], [0, 3, 5], [0, 5, 3], [0, 3, 1]];
  const sq = findSquare(n, dots.map(([, r, c]) => at(n, r, c)));
  const full = setup(n, dots);
  full.turn = 0;
  assert.deepEqual(C.claimGain(full, sq.id), { points: 4, dots: 9 }); // 13 cells − 4 corners
  const edge = setup(n, dots, { fill: 'edge' });
  edge.turn = 0;
  assert.deepEqual(C.claimGain(edge, sq.id), { points: 4, dots: 4 });
  assert.ok(C.apply(edge, { t: 'claim', s: sq.id }));
  assert.equal(edge.owner[at(n, 3, 3)], -1, 'centre stays empty in the edge variant');
});

test('full board: one last claim each, then the game ends', () => {
  const n = 3;
  const s = C.create(n);
  // Fill so that blue owns the four outer corners, red the rest; blue's corner square is claimable.
  const plan = [[0, 0], [1, 1], [0, 2], [1, 3], [0, 6], [1, 4], [0, 8], [0, 7]];
  for (const [p, i] of plan) { s.turn = p; assert.ok(C.apply(s, { t: 'dot', i })); }
  s.turn = 1;
  assert.ok(C.apply(s, { t: 'dot', i: 5 })); // board full now, by red
  assert.equal(s.phase, 'final');
  assert.equal(s.turn, 0, 'blue gets a final claim');
  assert.deepEqual(C.legalMoves(s).map((m) => m.t), ['claim']);
  const big = findSquare(n, [0, 2, 6, 8]);
  assert.ok(C.apply(s, { t: 'claim', s: big.id }));
  // red has no complete square → its final turn is skipped and the game ends
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.skipped, [1]);
  assert.deepEqual(s.score, [4, 0]);
  assert.equal(C.winner(s), 0);
});

test('final phase with nothing to claim ends immediately', () => {
  const s = C.create(2);
  for (const i of [0, 1, 2, 3]) C.apply(s, { t: 'dot', i });
  assert.equal(s.phase, 'over');
  assert.equal(C.winner(s), -1);
});

test('AI never plays illegal moves and every level finishes a game', () => {
  for (const level of ['easy', 'normal', 'hard']) for (const n of [6, 7]) for (const fill of ['area', 'edge']) {
    const s = C.create(n, { fill, first: n % 2 });
    let guard = 0;
    while (!C.isOver(s)) {
      const m = C.aiMove(s, level);
      assert.ok(C.isLegal(s, m), `${level} illegal move`);
      C.apply(s, m);
      assert.ok(++guard < 4 * n * n, 'game must terminate');
    }
    assert.equal(s.owner.filter((o) => o < 0).length, 0);
    assert.equal(s.score[0] + s.score[1], s.shaded.filter(Boolean).length);
  }
});

test('hard AI beats easy AI most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 10; i++) {
    const s = C.create(7, { first: i % 2 });
    while (!C.isOver(s)) C.apply(s, C.aiMove(s, s.turn === 0 ? 'hard' : 'easy'));
    if (C.winner(s) === 0) wins++;
  }
  assert.ok(wins >= 7, `hard won only ${wins}/10`);
});

test('AI completes a square and blocks an obvious threat', () => {
  const n = 7;
  // red to move, red has three corners of a square: it should finish it (or claim, nothing to claim here)
  const s = setup(n, [[1, 0, 0], [1, 0, 2], [1, 2, 0]]);
  s.turn = 1;
  const m = C.aiMove(s, 'normal');
  assert.deepEqual(m, { t: 'dot', i: at(n, 2, 2) });
  // blue to move in the same position: it should block that corner
  s.turn = 0;
  assert.deepEqual(C.aiMove(s, 'normal'), { t: 'dot', i: at(n, 2, 2) });
});

test('geometry counts match the formulas for every board size', () => {
  for (const n of [6, 7, 8, 9]) {
    const g = C.geometry(n);
    let grid = 0, dia = 0;
    for (let k = 1; k < n; k++) grid += (n - k) ** 2;
    for (let a = 1; 2 * a < n; a++) dia += (n - 2 * a) ** 2;
    assert.equal(g.squares.filter((s) => s.kind === 'grid').length, grid);
    assert.equal(g.squares.filter((s) => s.kind === 'diamond').length, dia);
    for (const s of g.squares) {
      assert.equal(new Set(s.corners).size, 4);
      assert.ok(s.edge.every((i) => s.area.includes(i)), 'border is part of the area');
      for (const i of s.corners) assert.ok(g.byCell[i].includes(s.id));
    }
  }
});

test('illegal moves are rejected without changing the state', () => {
  const n = 6;
  // three blue corners and one red: nobody owns that square
  const s = setup(n, [[0, 0, 0], [0, 0, 2], [0, 2, 0], [1, 2, 2]]);
  const sq = findSquare(n, [at(n, 0, 0), at(n, 0, 2), at(n, 2, 0), at(n, 2, 2)]);
  const before = JSON.stringify(s);
  for (const p of [0, 1]) { s.turn = p; assert.equal(C.apply(s, { t: 'claim', s: sq.id }), false); }
  s.turn = 0;
  for (const m of [null, {}, { t: 'dot', i: -1 }, { t: 'dot', i: 1.5 }, { t: 'dot', i: '3' }, { t: 'claim', s: 99999 }, { t: 'claim', s: -1 }, { t: 'pass' }])
    assert.equal(C.apply(s, m), false, JSON.stringify(m));
  assert.equal(JSON.stringify(s), before);
});

test('the edge variant fills only the sides of a grid square', () => {
  const n = 6;
  const s = setup(n, [[0, 0, 0], [0, 0, 3], [0, 3, 0], [0, 3, 3]], { fill: 'edge' });
  s.turn = 0;
  const sq = findSquare(n, [at(n, 0, 0), at(n, 0, 3), at(n, 3, 0), at(n, 3, 3)]);
  assert.ok(C.apply(s, { t: 'claim', s: sq.id }));
  assert.equal(s.last.dots, 8);
  for (const [r, c] of [[1, 1], [1, 2], [2, 1], [2, 2]]) assert.equal(s.owner[at(n, r, c)], -1);
  for (const [r, c] of [[0, 1], [0, 2], [1, 0], [2, 0], [3, 1], [3, 2], [1, 3], [2, 3]]) assert.equal(s.owner[at(n, r, c)], 0);
});

test('a claim that fills the board starts the final phase with the other player', () => {
  const n = 2;
  const s = C.create(n);
  for (const i of [0, 1, 2]) { s.turn = 0; C.apply(s, { t: 'dot', i }); }
  // blue owns three corners; a red dot can't go anywhere useful, so put blue's 4th dot down
  s.turn = 0; C.apply(s, { t: 'dot', i: 3 });
  assert.equal(s.phase, 'final');
  // red (to move) has nothing and is skipped, blue claims, game over
  assert.equal(s.turn, 0);
  assert.deepEqual(s.skipped, [1]);
  assert.ok(C.apply(s, { t: 'claim', s: 0 }));
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.score, [4, 0]);

  // board filled by a claim: 3×3, blue claims the big square as the last free cell is its centre
  const t = C.create(3);
  const plan = [[0, 0], [1, 1], [0, 2], [1, 3], [0, 6], [1, 5], [0, 8], [1, 7]];
  for (const [p, i] of plan) { t.turn = p; assert.ok(C.apply(t, { t: 'dot', i })); }
  t.turn = 0;
  const big = findSquare(3, [0, 2, 6, 8]);
  assert.ok(C.apply(t, { t: 'claim', s: big.id }));
  assert.equal(t.owner[4], 0);
  // the board is now full; red (its four dots form a diamond) gets the first final claim
  assert.equal(t.phase, 'final');
  assert.equal(t.turn, 1);
  assert.ok(C.apply(t, { t: 'claim', s: findSquare(3, [1, 3, 5, 7]).id }));
  // blue has nothing left to claim → its final turn is skipped, game over
  assert.equal(t.phase, 'over');
  assert.deepEqual(t.skipped, [0]);
  assert.deepEqual(t.score, [4, 4]);
});

test('final phase: a dot is illegal, each side claims at most once', () => {
  const n = 3;
  const s = C.create(n);
  // blue: the four outer corners; red: the four edge midpoints (a diamond); centre left empty
  for (const i of [0, 2, 6, 8]) { s.turn = 0; C.apply(s, { t: 'dot', i }); }
  for (const i of [1, 3, 5]) { s.turn = 1; C.apply(s, { t: 'dot', i }); }
  s.turn = 1; C.apply(s, { t: 'dot', i: 7 });
  s.turn = 0; assert.ok(C.apply(s, { t: 'dot', i: 4 })); // blue fills the board
  assert.equal(s.phase, 'final');
  assert.equal(s.turn, 1, 'the player who did not fill the board goes first');
  assert.equal(C.apply(s, { t: 'dot', i: 4 }), false);
  const dia = findSquare(n, [1, 3, 5, 7]);
  assert.equal(dia.kind, 'diamond');
  assert.ok(C.apply(s, { t: 'claim', s: dia.id }));
  assert.equal(s.turn, 0);
  assert.equal(s.phase, 'final');
  const big = findSquare(n, [0, 2, 6, 8]);
  assert.ok(C.apply(s, { t: 'claim', s: big.id }));
  assert.equal(s.phase, 'over');
  assert.equal(C.winner(s), -1);
  assert.deepEqual(C.legalMoves(s), []);
});

test('state survives a JSON round trip (online sync) and clones are independent', () => {
  const s = setup(7, [[0, 1, 1], [1, 2, 2], [0, 1, 3]]);
  const copy = JSON.parse(JSON.stringify(s));
  const m = { t: 'dot', i: at(7, 3, 1) };
  const a = C.clone(s);
  assert.ok(C.apply(a, m));
  assert.ok(C.apply(copy, m));
  assert.deepEqual(copy, a);
  assert.equal(s.owner[at(7, 3, 1)], -1, 'clone does not touch the original');
});

test('normal and hard AI clearly beat random play', () => {
  const rnd = (s) => { const m = C.legalMoves(s); return m[Math.floor(Math.random() * m.length)]; };
  for (const [level, games] of [['normal', 12], ['hard', 6]]) {
    let wins = 0;
    for (let g = 0; g < games; g++) {
      const s = C.create(7, { first: g % 2, fill: g % 3 ? 'area' : 'edge' });
      while (!C.isOver(s)) assert.ok(C.apply(s, s.turn === 0 ? C.aiMove(s, level) : rnd(s)));
      if (C.winner(s) === 0) wins++;
    }
    assert.ok(wins >= games - 2, `${level} won only ${wins}/${games} against random`);
  }
});
