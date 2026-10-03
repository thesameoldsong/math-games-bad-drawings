import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAP } from './engine.js';

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

// Four 9-cell regions on a 6×6 grid, one per row-pair band split in halves:
// rows 0-2 left = 0, rows 0-2 right = 1, rows 3-5 left = 2, rows 3-5 right = 3.
const QUAD = Array.from({ length: 36 }, (_, i) => {
  const r = Math.floor(i / 6), c = i % 6;
  return (r >= 3 ? 2 : 0) + (c >= 3 ? 1 : 0);
});

function ready(opts = {}, a = QUAD, b = QUAD) {
  const s = LAP.create(opts);
  assert.ok(LAP.setBoard(s, 0, a));
  assert.ok(LAP.setBoard(s, 1, b));
  return s;
}

test('board validation: sizes, connectivity, emptiness', () => {
  assert.ok(LAP.check(QUAD, 6, 4).ok);
  const holes = QUAD.slice(); holes[0] = -1;
  assert.equal(LAP.check(holes, 6, 4).ok, false);
  const swapped = QUAD.slice(); [swapped[0], swapped[35]] = [swapped[35], swapped[0]];
  const c = LAP.check(swapped, 6, 4);
  assert.equal(c.ok, false);
  assert.deepEqual(c.broken.sort(), [0, 3]);
  const unequal = QUAD.slice(); unequal[3] = 0; // region 0 has 10, region 1 has 8
  assert.equal(LAP.check(unequal, 6, 4).ok, false);
});

test('setup: invalid boards are refused, play starts after both are set', () => {
  const s = LAP.create({ first: 1 });
  assert.equal(LAP.setBoard(s, 0, QUAD.map(() => 0)), false);
  assert.ok(LAP.setBoard(s, 0, QUAD));
  assert.equal(LAP.setBoard(s, 0, QUAD), false, 'board can only be set once');
  assert.equal(s.phase, 'setup');
  assert.ok(LAP.setBoard(s, 1, QUAD));
  assert.equal(s.phase, 'play');
  assert.equal(s.turn, 1);
});

test('probe answers count regions in the opponent grid and pass the turn', () => {
  const other = QUAD.map((v) => 3 - v);
  const s = ready({}, QUAD, other);
  const counts = LAP.probe(s, { r0: 2, c0: 2, r1: 3, c1: 3 });
  assert.deepEqual(counts, [1, 1, 1, 1]);
  assert.equal(s.turn, 1);
  assert.deepEqual(LAP.probe(s, { r0: 0, c0: 0, r1: 1, c1: 2 }), [6, 0, 0, 0]);
  assert.deepEqual(s.probes[0][0].counts, [1, 1, 1, 1]);
  assert.equal(s.moves, 4);
});

test('probe shapes: at least 2×2, exactly 2×2 in classic rules', () => {
  const s = ready();
  assert.equal(LAP.probe(s, { r0: 0, c0: 0, r1: 0, c1: 3 }), null);
  assert.equal(LAP.probe(s, { r0: 0, c0: 0, r1: 6, c1: 1 }), null);
  assert.ok(LAP.probe(s, { r0: 0, c0: 0, r1: 5, c1: 5 }));
  const c = ready({ classic: true });
  assert.equal(LAP.probe(c, { r0: 0, c0: 0, r1: 2, c1: 1 }), null);
  assert.ok(LAP.probe(c, { r0: 4, c0: 4, r1: 5, c1: 5 }));
  assert.equal(LAP.allRects(c).length, 25);
  assert.equal(LAP.allRects(s).length, 225);
});

test('guess: matching shapes win even with other region names; a wrong guess loses', () => {
  const s = ready();
  assert.equal(LAP.guess(s, QUAD.map((v) => (v + 1) % 4)), true);
  assert.equal(s.winner, 0);
  assert.equal(s.phase, 'over');
  assert.equal(LAP.probe(s, { r0: 0, c0: 0, r1: 1, c1: 1 }), null, 'no moves after the end');

  const t = ready();
  LAP.probe(t, { r0: 0, c0: 0, r1: 1, c1: 1 });
  const wrong = QUAD.slice(); [wrong[2], wrong[3]] = [wrong[3], wrong[2]];
  assert.equal(LAP.guess(t, wrong), false);
  assert.equal(t.winner, 0, 'player 1 guessed wrong, player 0 wins');
  const mm = LAP.mismatches(wrong, QUAD, 4);
  assert.equal(mm.filter(Boolean).length, 2);
});

test('incomplete guesses are rejected', () => {
  const s = ready();
  const g = QUAD.slice(); g[5] = -1;
  assert.equal(LAP.guess(s, g), null);
  assert.equal(s.phase, 'play');
});

test('random boards are always valid for every variant', () => {
  for (const variant of ['std', 'beginner', 'expert']) {
    const s = LAP.create({ variant });
    for (let i = 0; i < 30; i++) assert.ok(LAP.check(LAP.randomBoard(s.N, s.K), s.N, s.K).ok, variant);
  }
});

test('classic rules: ambiguous boards are detected and refused', () => {
  // A comb row: region 0 and 1 interlock along row 1. Shifting the teeth by one column
  // changes no 2×2 window, so 2×2 probes can never tell the two boards apart.
  const comb = (shift) => Array.from({ length: 36 }, (_, i) => {
    const r = Math.floor(i / 6), c = i % 6;
    if (r === 0) return 0;
    if (r === 1) return (c + shift) % 2;
    if (r === 2) return 1;
    return c < 3 ? 2 : 3;
  });
  assert.ok(LAP.check(comb(0), 6, 4).ok && LAP.check(comb(1), 6, 4).ok);
  assert.equal(LAP.ambiguous(comb(0), 6, 4), true);
  const s = LAP.create({ classic: true });
  assert.equal(LAP.setBoard(s, 0, comb(0)), false);
  // …but a 2×3 probe sees the difference, so the normal rules allow it.
  const n = LAP.create();
  assert.ok(LAP.setBoard(n, 0, comb(0)));
  assert.notDeepEqual(LAP.answer(comb(0), 6, 4, { r0: 0, c0: 0, r1: 1, c1: 2 }), LAP.answer(comb(1), 6, 4, { r0: 0, c0: 0, r1: 1, c1: 2 }));
  for (let i = 0; i < 5; i++) assert.equal(LAP.ambiguous(LAP.makeBoard(s), 6, 4), false);
});

test('solver: candidates always agree with every probe answer', () => {
  const s = ready({}, QUAD, LAP.randomBoard(6, 4));
  for (let i = 0; i < 4; i++) { s.turn = 0; LAP.probe(s, LAP.allRects(s)[i * 37]); }
  const { pool } = LAP.candidates(s, 0, { samples: 8 });
  assert.ok(pool.length > 0);
  for (const g of pool) {
    assert.ok(LAP.check(g, 6, 4).ok);
    for (const x of s.probes[0]) assert.deepEqual(LAP.answer(g, 6, 4, x), x.counts);
  }
});

test('AI only makes legal moves and a full AI-vs-AI game ends with a correct or wrong guess', () => {
  for (const [variant, classic, levels] of [['std', false, ['easy', 'normal']], ['std', true, ['normal', 'hard']], ['beginner', false, ['hard', 'easy']]]) {
    const s = LAP.create({ variant, classic });
    LAP.setBoard(s, 0, LAP.makeBoard(s, 'normal'));
    LAP.setBoard(s, 1, LAP.makeBoard(s, 'hard'));
    let n = 0;
    while (s.phase === 'play' && n++ < 120) {
      const m = LAP.aiMove(s, levels[s.turn]);
      if (m.type === 'guess') assert.notEqual(LAP.guess(s, m.grid), null);
      else {
        assert.ok(LAP.rectOk(s, m.rect), 'legal probe');
        assert.ok(LAP.probe(s, m.rect));
      }
    }
    assert.equal(s.phase, 'over', `${variant} game ended`);
    assert.ok(s.winner === 0 || s.winner === 1);
  }
});

test('normal and hard AI never guess wrong', () => {
  for (const level of ['normal', 'hard']) {
    for (let k = 0; k < 3; k++) {
      const s = ready({}, QUAD, LAP.randomBoard(6, 4));
      let n = 0;
      while (s.phase === 'play' && n++ < 60) {
        s.turn = 0;
        const m = LAP.aiMove(s, level);
        if (m.type === 'guess') { assert.equal(LAP.guess(s, m.grid), true); break; }
        LAP.probe(s, m.rect);
      }
      assert.equal(s.phase, 'over');
    }
  }
});

test('online view hides the other secret grid until the game is over', () => {
  const s = ready();
  const v = LAP.viewFor(s, 1);
  assert.equal(v.boards[0], 'hidden');
  assert.deepEqual(v.boards[1], QUAD);
  LAP.guess(s, QUAD);
  assert.deepEqual(LAP.viewFor(s, 1).boards[0], QUAD);
});

test('illegal actions: wrong phase, malformed or reversed rectangles', () => {
  const s = LAP.create();
  assert.equal(LAP.probe(s, { r0: 0, c0: 0, r1: 1, c1: 1 }), null, 'no probes during setup');
  assert.equal(LAP.guess(s, QUAD), null, 'no guesses during setup');
  LAP.setBoard(s, 0, QUAD); LAP.setBoard(s, 1, QUAD);
  assert.equal(LAP.setBoard(s, 0, QUAD), false, 'no new map once play has started');
  for (const x of [null, { r0: 1, c0: 1, r1: 0, c1: 0 }, { r0: 0.5, c0: 0, r1: 1, c1: 1 }, { r0: -1, c0: 0, r1: 1, c1: 1 }, { r0: 0, c0: 0, r1: 1 }])
    assert.equal(LAP.probe(s, x), null, JSON.stringify(x));
  assert.equal(s.moves, 2);
  assert.equal(LAP.guess(s, QUAD.slice(0, 35)), null, 'wrong length');
  assert.equal(LAP.guess(s, QUAD.map((v) => (v === 3 ? 4 : v))), null, 'unknown label');
});

test('a guess that is not even a legal map simply loses', () => {
  const s = ready();
  assert.equal(LAP.guess(s, QUAD.map(() => 0)), false);
  assert.equal(s.winner, 1);
  // splitting one region in two is not "the same regions" even though every other cell matches
  assert.equal(LAP.samePartition(QUAD.map((v, i) => (v === 0 && i === 0 ? 1 : v)), QUAD), false);
});

test('solver finds exactly the maps that fit the answers (brute force on small boards)', () => {
  const all = (N, K) => {
    const S = (N * N) / K, n = N * N, out = [], g = Array(n).fill(-1), cnt = Array(K).fill(0);
    (function rec(i) {
      if (i === n) { if (LAP.check(g, N, K).ok) out.push(g.slice()); return; }
      for (let L = 0; L < K; L++) if (cnt[L] < S) { g[i] = L; cnt[L]++; rec(i + 1); cnt[L]--; }
    })(0);
    return out;
  };
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const [N, K] of [[3, 3], [4, 2]]) {
    const boards = all(N, K), rects = LAP.allRects({ N, classic: false });
    for (let trial = 0; trial < 60; trial++) {
      const truth = boards[Math.floor(rand() * boards.length)], probes = [];
      for (let j = Math.floor(rand() * 4); j > 0; j--) {
        const x = rects[Math.floor(rand() * rects.length)];
        probes.push({ ...x, counts: LAP.answer(truth, N, K, x) });
      }
      const want = boards.filter((b) => probes.every((x) => LAP.answer(b, N, K, x).join() === x.counts.join())).map(String).sort();
      const got = LAP.solve({ N, K, probes, limit: 1e6, maxNodes: 1e7 }).solutions.map(String).sort();
      assert.deepEqual(got, want);
    }
  }
});

test('normal AI clearly beats easy AI', () => {
  let wins = 0;
  for (let g = 0; g < 6; g++) {
    const s = LAP.create({ first: g % 2 });
    LAP.setBoard(s, 0, LAP.makeBoard(s)); LAP.setBoard(s, 1, LAP.makeBoard(s));
    while (s.phase === 'play') {
      const m = LAP.aiMove(s, s.turn === 0 ? 'normal' : 'easy');
      if (m.type === 'guess') LAP.guess(s, m.grid); else LAP.probe(s, m.rect);
    }
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 5, `normal won ${wins}/6`);
});
