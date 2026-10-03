import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TP } from './engine.js';

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

const at = (N, r, c) => r * N + c;

test('placing toward an empty cell or the edge turns nothing', () => {
  const s = TP.create(4);
  assert.deepEqual(TP.apply(s, { i: at(4, 0, 0), d: 0 }), []); // faces the top edge
  assert.deepEqual(TP.apply(s, { i: at(4, 2, 2), d: 1 }), []); // faces an empty cell
  assert.equal(s.b[at(4, 0, 0)], 0);
  assert.equal(s.b[at(4, 2, 2)], 1);
  assert.equal(s.turn, 0);
  assert.equal(s.ply, 2);
});

test('a hit piece turns 90° clockwise and the chain continues', () => {
  // Row 1: [A][B] where B faces down onto C at (2,1); C faces left onto the empty (2,0).
  const s = TP.create(4);
  s.b[at(4, 1, 1)] = 0;  // B faces up (empty above) -> after a turn faces right (empty) -> stops
  const chain = TP.apply(s, { i: at(4, 1, 0), d: 1 }); // new piece faces B
  assert.deepEqual(chain, [at(4, 1, 1)]);
  assert.equal(s.b[at(4, 1, 1)], 1);

  // Chain of two: B now faces right onto D at (1,2) facing up -> D turns to face right (empty) -> stop.
  const t = TP.create(4);
  t.b[at(4, 1, 1)] = 0; t.b[at(4, 1, 2)] = 1; // B up; D right
  // B turns to right (faces D), D turns right->down (faces empty (2,2)), stop.
  assert.deepEqual(TP.apply(t, { i: at(4, 1, 0), d: 1 }), [at(4, 1, 1), at(4, 1, 2)]);
  assert.equal(t.b[at(4, 1, 1)], 1);
  assert.equal(t.b[at(4, 1, 2)], 2);
});

test('a chain may come back and turn the piece that started it', () => {
  // 2x2: new piece at (0,0) faces right onto (0,1) which faces left (back at it).
  const s = TP.create(2);
  s.b[at(2, 0, 1)] = 2; // faces down onto (1,1)
  s.b[at(2, 1, 1)] = 2; // faces down (edge) -> turns to left onto (1,0)
  s.b[at(2, 1, 0)] = 3; // faces left (edge) -> turns to up onto (0,0) = the new piece
  const chain = TP.apply(s, { i: at(2, 0, 0), d: 1 });
  // (0,1) down->left: faces (0,0) the new piece -> new piece right->down: faces (1,0) -> (1,0) left->up: faces (0,0) -> ...
  assert.ok(chain.length >= 2);
  assert.equal(chain[0], at(2, 0, 1));
  assert.equal(chain[1], at(2, 0, 0));
  // Whatever happens, the chain ends on a piece facing the edge or an empty cell.
  const last = chain[chain.length - 1];
  assert.equal(TP.neighbor(2, last, s.b[last]) < 0 || s.b[TP.neighbor(2, last, s.b[last])] === -1, true);
});

test('a chain that loops through the new piece twice, traced by hand', () => {
  // 2x2: (0,1) down, (1,1) down, (1,0) left; new piece at (0,0) faces right.
  // (0,1) down->left faces (0,0); (0,0) right->down faces (1,0); (1,0) left->up faces (0,0);
  // (0,0) down->left faces the edge: stop.
  const s = TP.create(2);
  s.b = [-1, 2, 3, 2];
  assert.deepEqual(TP.apply(s, { i: 0, d: 1 }), [1, 0, 2, 0]);
  assert.deepEqual(s.b, [3, 3, 0, 2]);
  assert.deepEqual(TP.score(s), [2, 0]);
});

test('a straight line of fish passes the push along until one faces empty', () => {
  // Row 0 of a 4x4: three fish facing up (the edge). Each turns right and pushes the next;
  // the last one turns right and faces the empty (0,3).
  const s = TP.create(4);
  s.b[1] = 0; s.b[2] = 0;
  assert.deepEqual(TP.apply(s, { i: 0, d: 1 }), [1, 2]);
  assert.deepEqual(s.b.slice(0, 4), [1, 1, 1, -1]);
  // Filling (0,3) facing left turns (0,2) right->down onto the empty (1,2): chain of one.
  assert.deepEqual(TP.apply(s, { i: 3, d: 3 }), [2]);
  assert.deepEqual(s.b.slice(0, 4), [1, 1, 2, 3]);
});

test('place/unplace restores the board exactly', () => {
  for (let k = 0; k < 2000; k++) {
    const N = 3 + (k % 4), b = Array(N * N).fill(-1);
    const empt = [];
    for (let i = 0; i < b.length; i++) if (Math.random() < 0.7) b[i] = (Math.random() * 4) | 0; else empt.push(i);
    if (!empt.length) continue;
    const copy = b.slice(), i = empt[0], d = (Math.random() * 4) | 0;
    const turned = TP.place(b, N, i, d);
    TP.unplace(b, i, turned);
    assert.deepEqual(b, copy);
  }
});

test('scoring: left = blue, right = red, up/down = nobody', () => {
  const s = TP.create(2);
  s.b = [3, 3, 1, 0]; s.ply = 4;
  assert.deepEqual(TP.score(s), [2, 1]);
  assert.equal(TP.isOver(s), true);
  assert.equal(TP.winner(s), 0);
  s.b = [3, 1, 2, 0];
  assert.equal(TP.winner(s), -1);
});

test('isLegal rejects occupied cells and bad input', () => {
  const s = TP.create(4);
  TP.apply(s, { i: 5, d: 2 });
  assert.equal(TP.isLegal(s, { i: 5, d: 0 }), false);
  assert.equal(TP.isLegal(s, { i: 16, d: 0 }), false);
  assert.equal(TP.isLegal(s, { i: 3, d: 4 }), false);
  assert.equal(TP.isLegal(s, null), false);
  assert.equal(TP.isLegal(s, { i: 3, d: 1 }), true);
});

test('AI only plays legal moves and every game ends with a full board', () => {
  for (const N of [4, 5, 6]) for (const level of ['easy', 'normal', 'hard']) {
    const s = TP.create(N, N % 2);
    while (!TP.isOver(s)) {
      const m = TP.aiMove(s, level, 60);
      assert.ok(TP.isLegal(s, m), `${level} illegal ${JSON.stringify(m)}`);
      TP.apply(s, m);
    }
    assert.ok(s.b.every((v) => v >= 0 && v < 4));
    assert.equal(TP.aiMove(s, level), null);
  }
});

test('AI grabs an obvious point', () => {
  // 2x2 with three pieces facing up; red to move into the last cell.
  const s = TP.create(2, 1);
  s.b = [0, 2, -1, 0]; s.ply = 3; s.turn = 1;
  // Facing right (onto (1,1), which turns up->right) nets red two points; facing up turns (0,0)
  // to the right but (0,1) to the left, netting zero.
  for (const level of ['normal', 'hard']) assert.deepEqual(TP.aiMove(s, level), { i: 2, d: 1 });
});

test('AI strength: normal crushes random play, beats easy on points; hard beats normal', () => {
  const rnd = (s) => { const a = TP.legalMoves(s); return a[Math.floor(Math.random() * a.length)]; };
  const run = (games, N, A, B) => {
    let wins = 0, diff = 0;
    for (let g = 0; g < games; g++) {
      const s = TP.create(N, g % 2);
      while (!TP.isOver(s)) TP.apply(s, s.turn === 0 ? A(s) : B(s));
      const [a, b] = TP.score(s);
      diff += a - b;
      if (TP.winner(s) === 0) wins++;
    }
    return { wins, diff };
  };
  // Measured: normal beats random ~95% on 4x4 (the rest are ties).
  const vsRandom = run(20, 4, (s) => TP.aiMove(s, 'normal'), rnd);
  assert.ok(vsRandom.wins >= 15, `normal beat random only ${vsRandom.wins}/20`);
  // Normal wins ~80% against easy; the total point margin over 20 games is a stable signal.
  const vsEasy = run(20, 4, (s) => TP.aiMove(s, 'normal'), (s) => TP.aiMove(s, 'easy'));
  assert.ok(vsEasy.diff > 10, `normal vs easy total margin ${vsEasy.diff}`);
  const hard = run(4, 4, (s) => TP.aiMove(s, 'hard', 150), (s) => TP.aiMove(s, 'normal'));
  assert.ok(hard.diff > 0, `hard vs normal total margin ${hard.diff}`);
});

test('every chain ends: exhaustive on 2x2, random full-ish 3x3..6x6 boards', () => {
  const N = 2, b = Array(4).fill(-1);
  const rec = (k) => {
    if (k === 4) {
      for (let i = 0; i < 4; i++) if (b[i] < 0) for (let d = 0; d < 4; d++) {
        const c = b.slice(), turned = TP.place(c, N, i, d);
        const last = turned.length ? turned[turned.length - 1] : i, j = TP.neighbor(N, last, c[last]);
        assert.ok(j < 0 || c[j] < 0, 'chain stopped while facing a piece');
      }
      return;
    }
    for (let v = -1; v < 4; v++) { b[k] = v; rec(k + 1); }
  };
  rec(0);
  for (let k = 0; k < 20000; k++) {
    const n = 3 + (k % 4), c = Array.from({ length: n * n }, () => (Math.random() * 4) | 0);
    const i = (Math.random() * c.length) | 0;
    c[i] = -1;
    const turned = TP.place(c, n, i, (Math.random() * 4) | 0);
    const last = turned.length ? turned[turned.length - 1] : i, j = TP.neighbor(n, last, c[last]);
    assert.ok(j < 0 || c[j] < 0, 'chain stopped while facing a piece');
  }
});

test('hard AI plays exact endgames (checked against plain minimax on 3x3)', () => {
  const mm = (b, p) => {
    let best = -Infinity;
    for (let i = 0; i < b.length; i++) if (b[i] < 0) for (let d = 0; d < 4; d++) {
      const t = TP.place(b, 3, i, d), v = -mm(b, 1 - p);
      TP.unplace(b, i, t);
      if (v > best) best = v;
    }
    return best === -Infinity ? TP.evalFor(b, p) : best;
  };
  for (let k = 0; k < 120; k++) {
    const s = TP.create(3, k % 2), empties = 1 + (k % 4);
    while (9 - s.ply > empties) { const a = TP.legalMoves(s); TP.apply(s, a[(Math.random() * a.length) | 0]); }
    const b = s.b.slice(), p = s.turn, opt = mm(b, p);
    const m = TP.aiMove(s, 'hard', 5000), t = TP.place(b, 3, m.i, m.d), v = -mm(b, 1 - p);
    TP.unplace(b, m.i, t);
    assert.equal(v, opt, `suboptimal move on ${JSON.stringify(s.b)}`);
  }
});

test('apply records the move and clone is independent', () => {
  const s = TP.create(3, 1), c = TP.clone(s);
  TP.apply(s, { i: 4, d: 3 });
  assert.deepEqual(s.last, { i: 4, d: 3 });
  assert.equal(s.turn, 0);
  assert.equal(c.b[4], -1);
  assert.equal(c.turn, 1);
});
