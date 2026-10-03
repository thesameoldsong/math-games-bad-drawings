import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAX } from './engine.js';

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

test('claiming a number taxes all remaining proper divisors', () => {
  const s = TAX.create(12);
  const r = TAX.apply(s, 12);
  assert.deepEqual(r.taxed, [1, 2, 3, 4, 6]);
  assert.deepEqual(s.score, [12, 16]);
  assert.equal(s.owner[12], 0);
  for (const d of [1, 2, 3, 4, 6]) assert.equal(s.owner[d], 1);
});

test('a number with no divisors left cannot be claimed; 1 never can', () => {
  const s = TAX.create(12);
  assert.equal(TAX.isLegal(s, 1), false);
  assert.equal(TAX.apply(s, 1), null);
  TAX.apply(s, 9);                       // taxes 1 and 3
  assert.equal(TAX.isLegal(s, 5), false); // only divisor 1 is gone (the book's example)
  assert.equal(TAX.isLegal(s, 7), false);
  assert.equal(TAX.isLegal(s, 9), false); // already taken
  assert.equal(TAX.isLegal(s, 12), true);
  assert.equal(TAX.apply(s, 5), null);
  assert.equal(TAX.isLegal(s, 0), false);
  assert.equal(TAX.isLegal(s, 13), false);
});

test('game ends when nothing is claimable and the taxman sweeps the rest', () => {
  const s = TAX.create(6);
  TAX.apply(s, 5);           // tax 1
  TAX.apply(s, 4);           // tax 2
  const r = TAX.apply(s, 6); // tax 3 -> nothing left claimable
  assert.ok(s.over);
  assert.deepEqual(r.sweep, []);
  assert.deepEqual(s.score, [15, 6]);
  const s2 = TAX.create(10);
  TAX.apply(s2, 7);
  TAX.apply(s2, 10);         // tax 2, 5
  TAX.apply(s2, 9);          // tax 3 -> 4? 4 has 2 gone, 4's divisors 1,2 gone; 6: 3 gone,2 gone; 8: 4 left
  assert.equal(s2.over, false);
  TAX.apply(s2, 8);          // tax 4 -> 6 has no divisors left
  assert.ok(s2.over);
  assert.deepEqual(s2.sweep, [6]);
  assert.equal(s2.score[0] + s2.score[1], TAX.total(10));
});

test('scores always add up to the total; legal moves are exactly the claimable numbers', () => {
  for (let k = 0; k < 50; k++) {
    const s = TAX.create(TAX.CEILINGS[k % TAX.CEILINGS.length]);
    while (!s.over) {
      const ms = TAX.legalMoves(s);
      assert.ok(ms.length > 0);
      for (const x of ms) assert.ok(TAX.taxOf(s, x).length > 0 && s.owner[x] === -1);
      TAX.apply(s, ms[Math.floor(Math.random() * ms.length)]);
    }
    assert.equal(s.score[0] + s.score[1], TAX.total(s.n));
    for (let x = 1; x <= s.n; x++) assert.ok(s.owner[x] === 0 || s.owner[x] === 1);
  }
});

test('stranded() reports numbers that lost their last divisor', () => {
  const s = TAX.create(12);
  TAX.apply(s, 11);
  const before = TAX.clone(s);
  TAX.apply(s, 12);          // takes 2, 3, 4, 6 -> 8 and 9 orphaned (10 still has 5)
  assert.deepEqual(TAX.stranded(before, s), [8, 9]);
});

test('exact solver matches the known best scores for small ceilings', () => {
  const known = { 1: 0, 2: 2, 3: 3, 4: 7, 5: 9, 6: 15, 7: 17, 8: 21, 9: 30, 10: 40, 11: 44, 12: 50, 13: 52, 14: 66, 15: 81, 20: 124, 24: 182 };
  for (const [n, best] of Object.entries(known)) {
    const r = TAX.solve(TAX.create(+n));
    assert.ok(r.exact);
    assert.equal(r.gain, best, `n=${n}`);
  }
  for (const n of TAX.CEILINGS.filter((n) => n <= 24)) assert.equal(TAX.OPTIMUM[n], TAX.solve(TAX.create(n)).gain);
});

test('following hints reaches the optimum (exact range) and beats the taxman everywhere', () => {
  for (const n of TAX.CEILINGS) {
    const s = TAX.create(n);
    while (!s.over) {
      const x = TAX.hint(s, 150000);
      assert.ok(TAX.isLegal(s, x), `hint ${x} illegal at n=${n}`);
      TAX.apply(s, x);
    }
    if (n <= 24) assert.equal(s.score[0], TAX.OPTIMUM[n], `n=${n}`);
    assert.ok(s.score[0] > s.score[1], `n=${n}: ${s.score}`);
    assert.ok(s.score[0] >= TAX.OPTIMUM[n] * 0.95, `n=${n}: ${s.score[0]} vs ${TAX.OPTIMUM[n]}`);
  }
});

test('clone is independent', () => {
  const s = TAX.create(12);
  const c = TAX.clone(s);
  TAX.apply(s, 11);
  assert.equal(c.owner[11], -1);
  assert.deepEqual(c.score, [0, 0]);
});

test('illegal moves never change the state; a finished game accepts nothing', () => {
  const s = TAX.create(10);
  const snap = JSON.stringify({ o: [...s.owner], sc: s.score, l: s.log });
  for (const x of [-1, 0, 1, 11, 2.5]) assert.equal(TAX.apply(s, x), null);
  assert.equal(JSON.stringify({ o: [...s.owner], sc: s.score, l: s.log }), snap);
  while (!s.over) TAX.apply(s, TAX.legalMoves(s)[0]);
  assert.deepEqual(TAX.legalMoves(s), []);
  assert.equal(TAX.hint(s), null);
  for (let x = 1; x <= 10; x++) assert.equal(TAX.apply(s, x), null);
});

test('every first move costs exactly the 1 when the number is prime; claiming a taken divisor is not taxed twice', () => {
  const s = TAX.create(12);
  assert.deepEqual(TAX.apply(s, 11).taxed, [1]);
  assert.deepEqual(TAX.taxOf(s, 12), [2, 3, 4, 6]);
  TAX.apply(s, 4);                        // tax 2
  assert.deepEqual(TAX.taxOf(s, 12), [3, 6]);
  assert.deepEqual(s.score, [15, 3]);
});

test('hints are exact from mid-game positions (independent brute force)', () => {
  const brute = (s) => { let b = 0; for (const x of TAX.legalMoves(s)) { const c = TAX.clone(s); TAX.apply(c, x); b = Math.max(b, x + brute(c)); } return b; };
  for (let k = 0; k < 20; k++) {
    const s = TAX.create(12);
    for (let i = 0; i < 2 && !s.over; i++) { const m = TAX.legalMoves(s); TAX.apply(s, m[Math.floor(Math.random() * m.length)]); }
    if (s.over) continue;
    const best = brute(s), r = TAX.solve(s);
    assert.equal(r.gain, best);
    const c = TAX.clone(s); TAX.apply(c, r.move);
    assert.equal(r.move + brute(c), best);
  }
});
