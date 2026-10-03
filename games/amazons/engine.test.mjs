import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AMZ } from './engine.js';

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

// Build a position from a picture: . empty, b blue, r red, # burnt.
function pos(rows, turn = 0) {
  const N = rows.length;
  const s = AMZ.create({ N: 8 });
  s.N = N;
  s.b = rows.join('').split('').map((ch) => ({ '.': -1, b: 0, r: 1, '#': 2 })[ch]);
  s.turn = turn; s.ply = 10;
  return s;
}
const at = (s, r, c) => r * s.N + c;

test('starting positions follow the book', () => {
  for (const [N, k] of [[6, 2], [8, 3], [10, 4]]) {
    const s = AMZ.create({ N });
    assert.equal(s.b.length, N * N);
    assert.equal(AMZ.amazons(s, 0).length, k);
    assert.equal(AMZ.amazons(s, 1).length, k);
    // the 180° turn of the board lands every amazon on an amazon
    for (const p of [0, 1]) for (const i of AMZ.amazons(s, p)) assert.ok(s.b[N * N - 1 - i] >= 0);
  }
  const s = AMZ.create({ N: 8 });
  assert.equal(s.b[at(s, 0, 3)], 1);
  assert.equal(s.b[at(s, 7, 4)], 0);
});

test('amazons move like queens and stop at obstacles', () => {
  const s = pos([
    '.....',
    '.#...',
    '..b.r',
    '.....',
    '.....',
  ]);
  const to = AMZ.targets(s, at(s, 2, 2)).sort((a, b) => a - b);
  // up-left is blocked by the burnt square, right stops before red
  assert.ok(!to.includes(at(s, 1, 1)) && !to.includes(at(s, 0, 0)));
  assert.ok(to.includes(at(s, 2, 3)) && !to.includes(at(s, 2, 4)));
  assert.ok(to.includes(at(s, 0, 2)) && to.includes(at(s, 4, 4)) && to.includes(at(s, 2, 0)));
  assert.equal(to.length, 13);
});

test('arrow may fly back over (or onto) the square just left', () => {
  const s = pos([
    'b....',
    '.....',
    '.....',
    '.....',
    '....r',
  ]);
  const from = at(s, 0, 0), to = at(s, 0, 2);
  const arrows = AMZ.arrowTargets(s, from, to);
  assert.ok(arrows.includes(from));
  assert.ok(AMZ.isLegal(s, { from, to, arrow: from }));
  assert.ok(!AMZ.isLegal(s, { from, to, arrow: to }));
  AMZ.apply(s, { from, to, arrow: from });
  assert.equal(s.b[from], AMZ.BURNT);
  assert.equal(s.b[to], 0);
  assert.equal(s.turn, 1);
});

test('arrows cannot pass through pieces or burnt squares', () => {
  const s = pos([
    'b.r..',
    '#....',
    '.....',
    '.....',
    '.....',
  ]);
  const from = at(s, 0, 0);
  // step to (0,1); arrow to the right is blocked by red at (0,2)
  assert.ok(!AMZ.isLegal(s, { from, to: at(s, 0, 1), arrow: at(s, 0, 3) }));
  // step down is blocked by the burnt square
  assert.ok(!AMZ.isLegal(s, { from, to: at(s, 2, 0), arrow: at(s, 3, 0) }));
  assert.ok(AMZ.isLegal(s, { from, to: at(s, 1, 1), arrow: at(s, 4, 4) }));
});

test('isLegal rejects junk and the wrong player', () => {
  const s = AMZ.create();
  assert.ok(!AMZ.isLegal(s, null));
  assert.ok(!AMZ.isLegal(s, { from: -1, to: 0, arrow: 1 }));
  const red = AMZ.amazons(s, 1)[0];
  assert.ok(!AMZ.isLegal(s, { from: red, to: red + 8, arrow: red }));
  for (const m of AMZ.legalMoves(s).slice(0, 200)) assert.ok(AMZ.isLegal(s, m));
});

test('the player left without a move loses', () => {
  const s = pos([
    'r#...',
    '##...',
    '.....',
    '..b..',
    '.....',
  ]);
  assert.ok(!AMZ.hasMove(s, 1));
  assert.equal(AMZ.freeCount(s, 1), 0);
  AMZ.apply(s, { from: at(s, 3, 2), to: at(s, 3, 3), arrow: at(s, 4, 4) });
  assert.equal(s.winner, 0);
  assert.ok(AMZ.isOver(s));
});

test('a move that boxes yourself in hands the win only when you have no other amazon', () => {
  // blue's last free amazon walks into a pocket; red still moves → game goes on
  const s = pos([
    '##...',
    '.#...',
    '##...',
    '.....',
    '...r.',
  ]);
  s.b[at(s, 3, 0)] = 0;
  AMZ.apply(s, { from: at(s, 3, 0), to: at(s, 1, 0), arrow: at(s, 3, 0) });
  assert.equal(s.winner, -1);
  assert.equal(AMZ.freeCount(s, 0), 0);
  // red moves; now blue cannot → red wins
  AMZ.apply(s, { from: at(s, 4, 3), to: at(s, 4, 4), arrow: at(s, 4, 3) });
  assert.equal(s.winner, 1);
});

test('AI takes a winning trap when it sees one', () => {
  // red's amazon has a single exit at (1,0); the AI should shoot it shut
  const s = pos([
    'r#...',
    '.#...',
    '.#...',
    '.....',
    '..b..',
  ]);
  for (const level of ['normal', 'hard']) {
    const m = AMZ.aiMove(AMZ.clone(s), level);
    const x = AMZ.clone(s);
    assert.ok(AMZ.isLegal(x, m));
    AMZ.apply(x, m);
    assert.equal(x.winner, 0, level);
  }
});

test('AI never plays illegal moves and full games terminate', () => {
  for (const N of [6, 8]) {
    for (const [a, b] of [['easy', 'normal'], ['hard', 'easy']]) {
      const s = AMZ.create({ N });
      let guard = N * N;
      while (!AMZ.isOver(s) && guard--) {
        const m = AMZ.aiMove(s, s.turn === 0 ? a : b);
        assert.ok(AMZ.isLegal(s, m), JSON.stringify(m));
        AMZ.apply(s, m);
      }
      assert.ok(AMZ.isOver(s));
      assert.ok(!AMZ.hasMove(s, s.turn));
      assert.equal(s.winner, 1 - s.turn);
    }
  }
});

test('a 10 × 10 game finishes too', () => {
  const s = AMZ.create({ N: 10 });
  while (!AMZ.isOver(s)) AMZ.apply(s, AMZ.aiMove(s, 'normal'));
  assert.ok(s.ply <= 92);
});

test('stronger levels beat weaker ones most of the time', () => {
  let hard = 0, normal = 0;
  for (let i = 0; i < 6; i++) {
    const a = AMZ.create({ N: 6, first: i % 2 });
    while (!AMZ.isOver(a)) AMZ.apply(a, AMZ.aiMove(a, a.turn === 0 ? 'hard' : 'normal'));
    if (a.winner === 0) hard++;
    const b = AMZ.create({ N: 8, first: i % 2 });
    while (!AMZ.isOver(b)) AMZ.apply(b, AMZ.aiMove(b, b.turn === 0 ? 'normal' : 'easy'));
    if (b.winner === 0) normal++;
  }
  assert.ok(hard >= 4, `hard won ${hard}/6`);
  assert.ok(normal >= 4, `normal won ${normal}/6`);
});
