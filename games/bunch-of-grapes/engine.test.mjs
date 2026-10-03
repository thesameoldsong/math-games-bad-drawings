import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GR } from './engine.js';

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

// Hand-made board: a path 0-1-2-3-4 plus a branch 2-5.
const tiny = () => ({
  size: 'tiny',
  grapes: [0, 1, 2, 3, 4, 5].map((i) => ({ x: i * 10, y: 0, r: 6 })),
  adj: [[1], [0, 2], [1, 3, 5], [2, 4], [3], [2]],
});

test('generator: connected boards of the requested size, symmetric adjacency', () => {
  for (const size of ['small', 'medium', 'large']) for (let seed = 1; seed <= 6; seed++) {
    const b = GR.generate(size, seed * 1013);
    assert.equal(b.grapes.length, GR.SIZES[size]);
    b.adj.forEach((a, i) => { assert.ok(a.length > 0); for (const j of a) assert.ok(b.adj[j].includes(i), `asym ${i}-${j}`); });
    for (const g of b.grapes) assert.ok(g.x - g.r > -20 && g.x + g.r < GR.W + 20 && g.y + g.r < GR.H + 20);
  }
});

test('generator: every pair either shares a clear border or is clearly apart', () => {
  for (let seed = 1; seed <= 5; seed++) {
    const b = GR.generate('large', seed * 77);
    const { border } = GR.cells(b.grapes);
    const n = b.grapes.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = b.grapes[i], B = b.grapes[j], d = Math.hypot(A.x - B.x, A.y - B.y), s = A.r + B.r;
      const shared = Math.min(border[i][j], border[j][i]);
      if (b.adj[i].includes(j)) assert.ok(shared >= 0.3 * Math.min(A.r, B.r));
      else assert.ok(shared === 0 && (d < s || d >= 1.05 * s), `ambiguous ${i}-${j} d/s=${(d / s).toFixed(3)} shared=${shared}`);
    }
  }
});

test('placement: second placer moves first; flies cannot share a grape', () => {
  const s = GR.create(tiny(), 0);
  assert.equal(s.phase, 'place');
  assert.ok(GR.apply(s, 0));
  assert.equal(s.turn, 1);
  assert.equal(GR.apply(s, 0), false, 'occupied grape');
  assert.ok(GR.apply(s, 4));
  assert.equal(s.phase, 'move');
  assert.equal(s.turn, 1, 'second placer moves first');
  assert.deepEqual(GR.legal(s), [3]);
});

test('moves: eat the grape you leave, only to free neighbours', () => {
  const s = GR.create(tiny(), 0);
  GR.apply(s, 0); GR.apply(s, 3);       // blue on 0, red on 3; red moves first
  assert.deepEqual(GR.legal(s).sort(), [2, 4]);
  assert.equal(GR.apply(s, 0), false, 'not adjacent');
  assert.ok(GR.apply(s, 2));            // red eats 3, goes to 2
  assert.equal(s.eaten[3], 1);
  assert.equal(s.turn, 0);
  assert.deepEqual(GR.legal(s), [1]);   // blue on 0 can only go to 1
  assert.ok(GR.apply(s, 1));
  assert.equal(s.turn, 1);
  assert.deepEqual(GR.legal(s), [5]);   // 1 has the blue fly, 3 is eaten
  assert.ok(GR.apply(s, 5));            // red eats 2 → blue on 1: neighbours 0 (eaten) and 2 (eaten)
  assert.ok(GR.isOver(s));
  assert.equal(s.winner, 1);
  assert.equal(GR.eatenBy(s, 1), 2);
  assert.equal(GR.apply(s, 0), false, 'no moves after the end');
});

test('a fly boxed in right after placement loses immediately', () => {
  const s = GR.create(tiny(), 0);
  GR.apply(s, 3);   // blue on 3
  GR.apply(s, 4);   // red on 4: its only neighbour is blue's grape
  assert.ok(GR.isOver(s));
  assert.equal(s.winner, 0);
});

test('longest path on a branch', () => {
  const b = tiny(), e = Array(6).fill(-1);
  assert.equal(GR.longestPath(b.adj, e, 0, -1), 4);
  assert.equal(GR.longestPath(b.adj, e, 2, -1), 2);
});

test('AI never makes an illegal move and AI-vs-AI games terminate', () => {
  const levels = ['easy', 'normal', 'hard'];
  for (let k = 0; k < 9; k++) {
    const s = GR.create(GR.generate(k % 3 ? 'small' : 'medium', 500 + k), k % 2);
    let guard = 200;
    while (!GR.isOver(s) && guard--) {
      const lv = levels[(k + s.turn) % 3];
      const g = GR.aiMove(s, lv, { time: 40 });
      assert.ok(GR.isLegal(s, g), `illegal ${g} by ${lv}`);
      GR.apply(s, g);
    }
    assert.ok(GR.isOver(s));
    assert.ok(s.winner === 0 || s.winner === 1);
  }
});

test('AI finds the only winning line and avoids dead ends', () => {
  // path 0-1-2-3-4-5-6 with a dead-end branch 2-7
  const b = {
    size: 'line', grapes: Array.from({ length: 8 }, (_, i) => ({ x: i * 10, y: 0, r: 6 })),
    adj: [[1], [0, 2], [1, 3, 7], [2, 4], [3, 5], [4, 6], [5], [2]],
  };
  const s = GR.create(b, 0);
  GR.apply(s, 6); GR.apply(s, 2);       // blue on 6, red on 2, red to move
  assert.deepEqual(GR.legal(s).sort(), [1, 3, 7]);
  for (const lv of ['normal', 'hard']) assert.equal(GR.aiMove(s, lv, { time: 50 }), 3, lv);
  // immediate win: step onto the only exit of the opponent
  const t = GR.create(b, 0);
  GR.apply(t, 0); GR.apply(t, 2);       // blue on 0 (only exit: 1), red on 2
  for (const lv of ['normal', 'hard']) assert.equal(GR.aiMove(t, lv, { time: 50 }), 1, lv);
});

test('stronger AI beats the easy one most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 10; i++) {
    const s = GR.create(GR.generate('small', 900 + i), i % 2);
    while (!GR.isOver(s)) GR.apply(s, GR.aiMove(s, s.turn === 0 ? 'normal' : 'easy', { time: 40 }));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 7, `normal won only ${wins}/10`);
});

test('state survives a JSON round trip (online) and clones are independent', () => {
  const s = GR.create(GR.generate('small', 42), 1);
  GR.apply(s, GR.legal(s)[0]); GR.apply(s, GR.legal(s)[3]);
  const r = JSON.parse(JSON.stringify(s));
  assert.deepEqual(GR.legal(r), GR.legal(s));
  const c = GR.clone(s);
  GR.apply(c, GR.legal(c)[0]);
  assert.equal(s.ply, 2);
  assert.ok(s.eaten.every((e) => e < 0));
  assert.equal(GR.isLegal(s, String(GR.legal(s)[0])), false, 'non-integer moves are rejected');
});

test('placement: a placer cannot land on the other fly; first placer may be boxed in later, not at once', () => {
  const s = GR.create(tiny(), 1);
  assert.ok(GR.apply(s, 4));            // red (first placer) on the leaf 4
  assert.equal(s.turn, 0);
  assert.ok(!GR.legal(s).includes(4));
  assert.ok(GR.apply(s, 3));            // blue sits on red's only exit, blue moves first
  assert.equal(s.phase, 'move');
  assert.equal(s.turn, 0);
  assert.ok(!GR.isOver(s));
  assert.ok(GR.apply(s, 2));            // blue eats 3 → red on 4 is stuck
  assert.ok(GR.isOver(s));
  assert.equal(s.winner, 0);
});

test('AI places its fly legally in both placement roles', () => {
  for (const lv of ['easy', 'normal', 'hard']) {
    const s = GR.create(GR.generate('small', 77), 0);
    const a = GR.aiMove(s, lv, { time: 60 });
    assert.ok(GR.isLegal(s, a)); GR.apply(s, a);
    const b = GR.aiMove(s, lv, { time: 60 });
    assert.ok(GR.isLegal(s, b) && b !== a); GR.apply(s, b);
    assert.equal(s.phase, 'move');
  }
});

test('normal and hard AI clearly beat random play', () => {
  const rnd = (s) => { const m = GR.legal(s); return m[Math.floor(Math.random() * m.length)]; };
  for (const lv of ['normal', 'hard']) {
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const s = GR.create(GR.generate('medium', 3100 + i), i % 2), ai = i % 2;
      while (!GR.isOver(s)) GR.apply(s, s.turn === ai ? GR.aiMove(s, lv, { time: 40 }) : rnd(s));
      if (s.winner === ai) wins++;
    }
    assert.ok(wins >= 7, `${lv} beat random only ${wins}/10`);
  }
});
