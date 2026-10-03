import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BH } from './engine.js';

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

test('geometry: pyramid sizes and hexagonal neighbours', () => {
  assert.equal(BH.create(6).n, 21);
  assert.equal(BH.create(5).n, 15);
  assert.equal(BH.create(9).n, 45);
  const s = BH.create(6);
  // apex touches only the two circles below it
  assert.deepEqual(BH.neighbors(s, 0).slice().sort((a, b) => a - b), [1, 2]);
  // a bottom corner touches its row neighbour and one circle above
  const bl = BH.idx(5, 0);
  assert.deepEqual(BH.neighbors(s, bl).slice().sort((a, b) => a - b), [BH.idx(4, 0), BH.idx(5, 1)].sort((a, b) => a - b));
  // an inner circle has six neighbours
  assert.equal(BH.neighbors(s, BH.idx(3, 1)).length, 6);
  // adjacency is symmetric
  for (let i = 0; i < s.n; i++) for (const j of BH.neighbors(s, i)) assert.ok(BH.neighbors(s, j).includes(i));
  assert.throws(() => BH.create(4));
});

test('numbers go 1,1,2,2,… and turns alternate; occupied circles are illegal', () => {
  const s = BH.create(6, 1);
  assert.equal(s.turn, 1);
  assert.ok(BH.apply(s, 0)); assert.equal(s.val[0], 1); assert.equal(s.owner[0], 1);
  assert.ok(BH.apply(s, 1)); assert.equal(s.val[1], 1); assert.equal(s.owner[1], 0);
  assert.ok(BH.apply(s, 2)); assert.equal(s.val[2], 2);
  assert.equal(BH.apply(s, 2), false);
  assert.equal(BH.apply(s, 99), false);
  assert.equal(BH.apply(s, -1), false);
  assert.equal(BH.nextNumber(s), 2);
});

test('the last empty circle swallows its neighbours; smaller loss wins', () => {
  const s = BH.create(6, 0);
  const hole = BH.idx(3, 1);
  const order = [...Array(21).keys()].filter((i) => i !== hole);
  for (const i of order) BH.apply(s, i);
  assert.ok(BH.isOver(s));
  assert.equal(s.moves, 20);
  assert.equal(s.hole, hole);
  assert.equal(BH.maxNumber(s), 10);
  // every number 1..10 used exactly once per player
  for (const p of [0, 1]) assert.deepEqual(s.val.filter((_, i) => s.owner[i] === p).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const exp = [0, 0];
  for (const j of BH.neighbors(s, hole)) exp[s.owner[j]] += s.val[j];
  assert.deepEqual(s.lost, exp);
  const w = exp[0] === exp[1] ? 2 : exp[0] < exp[1] ? 0 : 1;
  assert.equal(s.winner, w);
  assert.equal(BH.apply(s, hole), false, 'no moves after the end');
});

test('tie when both lose the same', () => {
  // 5 rows: hole at the apex, neighbours idx 1 and 2.
  const s = BH.create(5, 0);
  // blue plays 1 on cell1 (value 1), red 1 on cell 2 (value 1) → both lose 1
  BH.apply(s, 1); BH.apply(s, 2);
  for (let i = 3; i < 15; i++) BH.apply(s, i);
  assert.equal(s.hole, 0);
  assert.deepEqual(s.lost, [1, 1]);
  assert.equal(s.winner, 2);
});

test('exact solver: on the last move the AI picks the better hole', () => {
  for (let seed = 1; seed <= 30; seed++) {
    let r = seed;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const s = BH.create(6, seed % 2);
    while (s.n - s.moves > 2) BH.apply(s, BH.empties(s)[Math.floor(rnd() * BH.empties(s).length)]);
    const me = s.turn;
    const [a, b] = BH.empties(s);
    const val = (i) => { const x = BH.clone(s); BH.apply(x, i); return x.lost[1 - me] - x.lost[me]; };
    const best = Math.max(val(a), val(b));
    for (const lvl of ['normal', 'hard']) {
      const m = BH.aiMove(s, lvl);
      assert.equal(val(m), best, `seed ${seed} ${lvl}`);
    }
    assert.equal(BH.solve(s), best);
  }
});

test('AI only plays legal moves and every game terminates', () => {
  for (const rows of BH.SIZES) for (const a of ['easy', 'normal', 'hard']) for (const b of ['easy', 'hard']) {
    const s = BH.create(rows, 0);
    let guard = 0;
    while (!BH.isOver(s) && guard++ < 100) {
      const m = BH.aiMove(s, s.turn === 0 ? a : b);
      assert.ok(BH.legal(s, m), `illegal ${m}`);
      BH.apply(s, m);
    }
    assert.ok(BH.isOver(s));
    assert.ok([0, 1, 2].includes(s.winner));
    assert.equal(BH.empties(s).length, 1);
  }
});

test('stronger levels beat weaker ones', () => {
  const match = (a, b, N = 24) => {
    let wa = 0, wb = 0;
    for (let g = 0; g < N; g++) {
      const s = BH.create(6, g % 2);
      while (!BH.isOver(s)) BH.apply(s, BH.aiMove(s, s.turn === 0 ? a : b));
      if (s.winner === 0) wa++; else if (s.winner === 1) wb++;
    }
    return [wa, wb];
  };
  const [h, n] = match('hard', 'normal');
  assert.ok(h > n * 2, `hard ${h} vs normal ${n}`);
  const [n2, e] = match('normal', 'easy');
  assert.ok(n2 > e * 3, `normal ${n2} vs easy ${e}`);
});

test('edge cases: bad indices, AI on a finished game, numbers on every size', () => {
  const s = BH.create(6, 0);
  for (const bad of [1.5, '3', NaN, null, undefined, 21]) assert.equal(BH.apply(s, bad), false, String(bad));
  assert.equal(s.moves, 0);
  for (const rows of BH.SIZES) {
    const x = BH.create(rows, 1);
    while (!BH.isOver(x)) BH.apply(x, BH.empties(x)[0]);
    const top = BH.maxNumber(x);
    for (const p of [0, 1]) {
      assert.deepEqual(x.val.filter((_, i) => x.owner[i] === p).sort((a, b) => a - b), [...Array(top).keys()].map((k) => k + 1));
    }
    assert.deepEqual(x.lost, BH.lossAt(x, x.hole));
    assert.equal(BH.aiMove(x, 'hard'), -1);
    assert.equal(x.owner[x.hole], -1);
  }
});

test('pruned scoring finds the same best moves as full scoring', () => {
  let r = 7;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (let g = 0; g < 12; g++) {
    const s = BH.create(6, g % 2);
    while (s.n - s.moves > 8) BH.apply(s, BH.empties(s)[Math.floor(rnd() * BH.empties(s).length)]);
    const full = BH.scoreMoves(s, Infinity), cut = BH.scoreMoves(s, Infinity, true);
    const top = Math.max(...full.map((m) => m.v));
    assert.equal(Math.max(...cut.map((m) => m.v)), top);
    assert.equal(BH.solve(s), top);
    const bestOf = (l) => l.filter((m) => m.v >= top).map((m) => m.i).sort((a, b) => a - b);
    assert.deepEqual(bestOf(cut), bestOf(full));
  }
});

test('every AI level clearly beats random play', () => {
  for (const lvl of ['easy', 'normal', 'hard']) {
    let w = 0, l = 0;
    for (let g = 0; g < 20; g++) {
      const s = BH.create(6, g % 2);
      while (!BH.isOver(s)) {
        const free = BH.empties(s);
        BH.apply(s, s.turn === 0 ? BH.aiMove(s, lvl) : free[Math.floor(Math.random() * free.length)]);
      }
      if (s.winner === 0) w++; else if (s.winner === 1) l++;
    }
    assert.ok(lvl === 'easy' ? w > l + 3 : w >= 17 && w > l * 4, `${lvl} vs random ${w}:${l}`);
  }
});

test('AI does not mutate the position it is given; even circle counts are rejected', () => {
  for (const rows of [3, 4, 7, 8]) assert.throws(() => BH.create(rows), String(rows));   // 6, 10, 28, 36 circles
  let r = 11;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  for (const lvl of ['easy', 'normal', 'hard']) for (const first of [0, 1]) {
    const s = BH.create(6, first);
    while (!BH.isOver(s)) {
      const snap = JSON.stringify(s);
      const m = BH.aiMove(s, lvl, rnd);
      assert.equal(JSON.stringify(s), snap, `${lvl} mutated the state`);
      assert.ok(BH.apply(s, m));
    }
  }
});

test('the starter alternates: whoever moves second makes the last move', () => {
  for (const first of [0, 1]) {
    const s = BH.create(6, first);
    while (s.n - s.moves > 1) {
      if (s.n - s.moves === 2) assert.equal(s.turn, 1 - first);
      BH.apply(s, BH.empties(s)[0]);
    }
    assert.equal(s.last >= 0 && s.owner[s.last], 1 - first);
    assert.equal(s.val[s.last], 10);
  }
});
