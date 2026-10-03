import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GL } from './engine.js';

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

// Deterministic rng for reproducible games.
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
}

test('placing a rectangle shades exactly a×b empty cells and passes the turn', () => {
  const s = GL.create(10);
  s.dice = [3, 4];
  assert.ok(GL.apply(s, { b: 0, r: 0, c: 0, h: 3, w: 4 }));
  assert.equal(GL.score(s, 0), 12);
  assert.equal(s.turn, 1);
  assert.equal(s.dice, null);
});

test('both orientations are allowed, other shapes are not', () => {
  const s = GL.create(10);
  s.dice = [2, 5];
  assert.ok(GL.canPlace(s, { b: 0, r: 0, c: 0, h: 5, w: 2 }));
  assert.ok(GL.canPlace(s, { b: 0, r: 0, c: 0, h: 2, w: 5 }));
  assert.ok(!GL.canPlace(s, { b: 0, r: 0, c: 0, h: 2, w: 4 }));
  assert.ok(!GL.canPlace(s, { b: 0, r: 0, c: 6, h: 2, w: 5 }), 'off the grid');
});

test('overlap is illegal; the opponent grid is allowed only with spoiling on', () => {
  const s = GL.create(10);
  s.dice = [2, 2]; GL.apply(s, { b: 0, r: 0, c: 0, h: 2, w: 2 });
  s.dice = [1, 1];
  assert.equal(s.turn, 1);
  // player 1 spoils player 0's grid: overlap check on that grid
  assert.ok(!GL.canPlace(s, { b: 0, r: 1, c: 1, h: 1, w: 1 }));
  assert.ok(GL.apply(s, { b: 0, r: 5, c: 5, h: 1, w: 1 }));
  assert.equal(GL.score(s, 0), 5, 'spoiled cells count for the grid owner');
  assert.equal(GL.score(s, 1), 0);
  const q = GL.create(10, { spoil: false });
  q.dice = [1, 2];
  assert.ok(!GL.canPlace(q, { b: 1, r: 0, c: 0, h: 1, w: 2 }));
  assert.ok(!GL.legalMoves(q).some((m) => m.b === 1));
});

test('pass only when the roll does not fit on your own grid; two passes in a row end the game', () => {
  const s = GL.create(4);
  s.dice = [4, 4];
  assert.ok(!GL.canPass(s));
  assert.ok(!GL.apply(s, { pass: true }));
  GL.apply(s, { b: 0, r: 0, c: 0, h: 4, w: 4 }); // player 0's grid full
  s.dice = [1, 1]; GL.apply(s, { b: 1, r: 0, c: 0, h: 1, w: 1 });
  s.dice = [1, 1];
  assert.ok(GL.canPass(s));
  assert.ok(GL.legalMoves(s).some((m) => !m.pass && m.b === 1), 'may still spoil');
  GL.apply(s, { pass: true });
  assert.ok(!s.over);
  s.dice = [4, 4];
  assert.ok(GL.canPass(s));
  GL.apply(s, { pass: true });
  assert.ok(s.over);
  assert.equal(GL.winner(s), 0);
});

test('a placement between two passes resets the pass counter', () => {
  const s = GL.create(4);
  s.dice = [4, 4]; GL.apply(s, { b: 0, r: 0, c: 0, h: 4, w: 4 });
  s.dice = [1, 1]; GL.apply(s, { b: 1, r: 0, c: 0, h: 1, w: 1 });
  s.dice = [2, 2]; GL.apply(s, { pass: true });
  s.dice = [1, 1]; GL.apply(s, { b: 1, r: 3, c: 3, h: 1, w: 1 });
  s.dice = [2, 2]; GL.apply(s, { pass: true });
  assert.ok(!s.over);
  assert.equal(s.passes, 1);
});

test('legal moves are exactly the placements that fit', () => {
  const s = GL.create(5);
  s.dice = [2, 3];
  const own = GL.legalMoves(s).filter((m) => m.b === 0);
  assert.equal(own.length, 4 * 3 + 3 * 4);
  for (const m of GL.legalMoves(s)) assert.ok(m.pass || GL.canPlace(s, m));
});

test('AI never makes an illegal move and AI-vs-AI games terminate', () => {
  for (const [a, b] of [['easy', 'easy'], ['normal', 'hard'], ['hard', 'easy'], ['hard', 'hard']]) {
    for (const N of [8, 10, 12]) {
      const rng = seeded(N * 7 + a.length);
      const s = GL.create(N, { first: N % 2 });
      let guard = 0;
      while (!s.over && guard++ < 1000) {
        GL.roll(s, rng);
        const m = GL.aiMove(s, s.turn === 0 ? a : b, rng);
        assert.ok(m, 'AI returned a move');
        assert.ok(GL.apply(s, m), `illegal ${JSON.stringify(m)} for ${s.dice}`);
      }
      assert.ok(s.over, 'game ended');
      assert.ok(GL.score(s, 0) <= N * N && GL.score(s, 1) <= N * N);
    }
  }
});

test('AI with spoiling off never touches the other grid', () => {
  const rng = seeded(5);
  const s = GL.create(10, { spoil: false });
  while (!s.over) {
    GL.roll(s, rng);
    const m = GL.aiMove(s, 'hard', rng);
    assert.ok(m.pass || m.b === s.turn);
    GL.apply(s, m);
  }
});

test('stronger AI levels beat weaker ones more often than not', () => {
  const duel = (A, B, n, seed) => {
    const rng = seeded(seed); let w = 0;
    for (let i = 0; i < n; i++) {
      const s = GL.create(10, { first: i % 2 });
      while (!s.over) { GL.roll(s, rng); GL.apply(s, GL.aiMove(s, s.turn === 0 ? A : B, rng)); }
      if (GL.winner(s) === 0) w++;
    }
    return w;
  };
  assert.ok(duel('normal', 'easy', 30, 1) >= 20);
  assert.ok(duel('hard', 'normal', 30, 2) >= 17);
});

test('no move without dice or after the end; ties are reported as -1', () => {
  const s = GL.create(4);
  assert.ok(!GL.apply(s, { b: 0, r: 0, c: 0, h: 1, w: 1 }), 'no dice yet');
  assert.deepEqual(GL.legalMoves(s), []);
  s.dice = [2, 4]; GL.apply(s, { b: 0, r: 0, c: 0, h: 2, w: 4 });
  s.dice = [4, 2]; GL.apply(s, { b: 1, r: 0, c: 0, h: 4, w: 2 });
  assert.equal(GL.winner(s), -1);
  s.dice = [5, 5]; GL.apply(s, { pass: true });
  s.dice = [5, 5]; assert.deepEqual(GL.legalMoves(s), [{ pass: true }], 'nothing fits anywhere → only a pass');
  GL.apply(s, { pass: true });
  assert.ok(s.over);
  s.dice = [1, 1];
  assert.ok(!GL.apply(s, { b: 0, r: 3, c: 3, h: 1, w: 1 }));
  assert.ok(!GL.apply(s, { pass: true }));
});

test('a rejected move leaves the state untouched; boards are independent', () => {
  const s = GL.create(6);
  s.dice = [3, 3];
  const before = JSON.stringify(s);
  assert.ok(!GL.apply(s, { b: 0, r: 4, c: 0, h: 3, w: 3 }));
  assert.ok(!GL.apply(s, { b: 2, r: 0, c: 0, h: 3, w: 3 }));
  assert.ok(!GL.apply(s, { b: 0, r: 0, c: 0, h: 3, w: 2 }));
  assert.equal(JSON.stringify(s), before);
  GL.apply(s, { b: 0, r: 0, c: 0, h: 3, w: 3 });
  s.dice = [3, 3];
  assert.ok(GL.canPlace(s, { b: 1, r: 0, c: 0, h: 3, w: 3 }), 'same spot on the other grid is free');
});

test('both grids full: two lost turns end the game; clone is deep', () => {
  const s = GL.create(4);
  s.dice = [4, 4]; GL.apply(s, { b: 0, r: 0, c: 0, h: 4, w: 4 });
  s.dice = [4, 4]; GL.apply(s, { b: 1, r: 0, c: 0, h: 4, w: 4 }); // both full
  // the clone used for undo history is deep
  const c = GL.clone(s); c.cells[0][0] = -1;
  assert.equal(s.cells[0][0], 0);
  s.dice = [1, 1]; assert.ok(GL.apply(s, { pass: true }));
  s.dice = [1, 1]; assert.ok(GL.apply(s, { pass: true }));
  assert.ok(s.over);
  assert.equal(GL.score(s, 0), 16); assert.equal(GL.score(s, 1), 16);
});

test('decent AI levels crush a random mover', () => {
  const rng = (seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; })(42);
  for (const lvl of ['normal', 'hard']) {
    let w = 0;
    for (let i = 0; i < 20; i++) {
      const s = GL.create(10, { first: i % 2 });
      while (!s.over) {
        GL.roll(s, rng);
        const L = GL.legalMoves(s);
        GL.apply(s, s.turn === 0 ? GL.aiMove(s, lvl, rng) : L[Math.floor(rng() * L.length)]);
      }
      if (GL.winner(s) === 0) w++;
    }
    assert.ok(w >= 17, `${lvl} won ${w}/20 vs random`);
  }
});
