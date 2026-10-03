import { test } from 'node:test';
import assert from 'node:assert/strict';
import { H101 } from './engine.js';

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

// seeded rng so the statistical tests are stable
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const die = (r) => 1 + Math.floor(r() * 6);

test('turns alternate, plain and ×10 add correctly', () => {
  const s = H101.create({ n: 2, rounds: 1 });
  assert.equal(s.turn, 0);
  H101.roll(s, 4); H101.choose(s, true);
  assert.equal(s.totals[0], 40);
  assert.equal(s.turn, 1);
  H101.roll(s, 3); H101.choose(s, false);
  assert.equal(s.totals[1], 3);
  assert.equal(s.turn, 0);
  assert.equal(H101.choose(s, true), false, 'cannot choose before rolling');
  assert.equal(H101.roll(s, 7), false, 'die is 1..6');
});

test('going over 100 busts and the player sits out', () => {
  const s = H101.create({ n: 2, rounds: 1 });
  H101.roll(s, 6); H101.choose(s, true);  // 60
  H101.roll(s, 1); H101.choose(s, false);
  H101.roll(s, 5); H101.choose(s, true);  // 110 → bust
  assert.equal(s.bust[0], true);
  assert.equal(H101.left(s, 0), 0);
  // only player 1 rolls from now on
  for (let i = 0; i < 5; i++) { assert.equal(s.turn, 1); H101.roll(s, 1); H101.choose(s, false); }
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.history[0].winners, [1]);
  assert.deepEqual(s.wins, [0, 1]);
});

test('a forced bust (even the plain face is too much) applies at once', () => {
  const s = H101.create({ n: 2, rounds: 1 });
  s.totals[0] = 98; s.rolls[0] = [{ d: 1, x10: false }];
  H101.roll(s, 3);
  assert.equal(s.bust[0], true);
  assert.equal(s.phase, 'roll');
  assert.equal(s.turn, 1);
  assert.equal(s.last.forced, true);
});

test('exactly 100 is fine; ties share the round; all-bust gives nobody the round', () => {
  assert.deepEqual(H101.roundWinners([100, 99], [false, false]), [0]);
  assert.deepEqual(H101.roundWinners([90, 90, 40], [false, false, false]), [0, 1]);
  assert.deepEqual(H101.roundWinners([120, 101], [true, true]), []);
  assert.deepEqual(H101.roundWinners([120, 12], [true, false]), [1]);
});

test('rounds rotate the starting player and the match ends after the last round', () => {
  const r = rng(1);
  const s = H101.create({ n: 3, rounds: 3 });
  const firsts = [];
  while (s.phase !== 'over') {
    if (s.phase === 'roundover') { H101.nextRound(s); continue; }
    if (s.rolls.every((x) => !x.length)) firsts.push(s.turn);
    H101.roll(s, die(r));
    if (s.phase === 'choose') H101.choose(s, r() < 0.5);
  }
  assert.deepEqual(firsts, [0, 1, 2]);
  assert.equal(s.history.length, 3);
  assert.equal(s.wins.reduce((a, b) => a + b, 0) >= 0, true);
  assert.ok(H101.champions(s).length >= 1);
});

test('every player rolls six times unless busted', () => {
  const s = H101.create({ n: 4, rounds: 1 });
  while (s.phase !== 'over') { H101.roll(s, 1); H101.choose(s, false); }
  assert.deepEqual(s.totals, [6, 6, 6, 6]);
  assert.deepEqual(s.wins, [1, 1, 1, 1]);
});

test('solo expectation and survival tables look sane', () => {
  assert.equal(H101.survive(94, 1), 1);
  assert.equal(H101.survive(100, 1), 0);
  assert.ok(Math.abs(H101.survive(96, 1) - 4 / 6) < 1e-12);
  // jumping to 96 with two rolls left is worse than staying low
  assert.ok(H101.ev(36, 2) > H101.ev(96, 2));
});

test('hard AI is cautious at 96-with-rolls-left and greedy on the last roll', () => {
  const s = H101.create({ n: 2, rounds: 1 });
  s.rolls[0] = [{ d: 3, x10: true }, { d: 3, x10: false }, { d: 1, x10: false }];
  s.rolls[1] = [{ d: 1, x10: false }, { d: 1, x10: false }, { d: 1, x10: false }];
  s.totals = [36, 3];
  s.phase = 'choose'; s.die = 6;  // 36 + 60 = 96 with two rolls still to come
  assert.equal(H101.aiChoose(s, 'hard'), false);
  assert.equal(H101.aiChoose(s, 'normal'), false);
  const e = H101.create({ n: 2, rounds: 1 });
  e.rolls = [Array(5).fill({ d: 1, x10: false }), Array(6).fill({ d: 1, x10: false })];
  e.totals = [35, 50]; e.phase = 'choose'; e.die = 6;
  assert.equal(H101.aiChoose(e, 'hard'), true);
});

test('AI never busts with ×10 and every level finishes full matches', () => {
  const r = rng(7);
  for (const level of ['easy', 'normal', 'hard']) {
    for (const n of [2, 3]) {
      const s = H101.create({ n, rounds: 5 });
      let steps = 0;
      while (s.phase !== 'over') {
        assert.ok(++steps < 1000);
        if (s.phase === 'roundover') { H101.nextRound(s); continue; }
        H101.roll(s, die(r));
        if (s.phase !== 'choose') continue;
        const p = s.turn, a = s.totals[p], d = s.die;
        const x = H101.aiChoose(s, level, r);
        if (x) assert.ok(a + 10 * d <= 100, `${level} chose a ×10 bust`);
        assert.ok(H101.choose(s, x));
      }
      assert.equal(s.history.length, 5);
    }
  }
});

test('hard beats easy clearly over many rounds', () => {
  const r = rng(42);
  let hard = 0, easy = 0;
  for (let g = 0; g < 3000; g++) {
    const s = H101.create({ n: 2, rounds: 1, first: g % 2 });
    while (s.phase !== 'over') {
      H101.roll(s, die(r));
      if (s.phase === 'choose') H101.choose(s, H101.aiChoose(s, s.turn === 0 ? 'hard' : 'easy', r));
    }
    hard += s.wins[0]; easy += s.wins[1];
  }
  assert.ok(hard > easy * 1.3, `hard ${hard} vs easy ${easy}`);
});

test('hard is at least as good as normal head to head', () => {
  const r = rng(9);
  let hard = 0, normal = 0;
  for (let g = 0; g < 1000; g++) {
    const s = H101.create({ n: 2, rounds: 1, first: g % 2 });
    while (s.phase !== 'over') {
      H101.roll(s, die(r));
      if (s.phase === 'choose') H101.choose(s, H101.aiChoose(s, s.turn === 0 ? 'hard' : 'normal', r));
    }
    hard += s.wins[0]; normal += s.wins[1];
  }
  assert.ok(hard >= normal, `hard ${hard} vs normal ${normal}`);
});

test('rate() returns two numbers in [0,1] for 2 and 4 players', () => {
  for (const n of [2, 4]) {
    const s = H101.create({ n, rounds: 1 });
    H101.roll(s, 5);
    const [a, b] = H101.rate(s);
    for (const v of [a, b]) assert.ok(v >= 0 && v <= 1);
  }
});

test('every AI level clearly beats random choices', () => {
  const r = rng(123);
  for (const level of ['easy', 'normal', 'hard']) {
    let ai = 0, rand = 0;
    for (let g = 0; g < 2000; g++) {
      const s = H101.create({ n: 2, rounds: 1, first: g % 2 });
      while (s.phase !== 'over') {
        H101.roll(s, die(r));
        if (s.phase === 'choose') H101.choose(s, s.turn === 0 ? H101.aiChoose(s, level, r) : r() < 0.5);
      }
      ai += s.wins[0]; rand += s.wins[1];
    }
    assert.ok(ai > rand * 1.5, `${level} ${ai} vs random ${rand}`);
  }
});

test('actions out of phase are rejected and leave the state untouched', () => {
  const s = H101.create({ n: 2, rounds: 2 });
  assert.equal(H101.nextRound(s), false);
  H101.roll(s, 2);
  assert.equal(H101.roll(s, 3), false, 'cannot roll twice');
  assert.equal(s.die, 2);
  assert.equal(H101.roll({ ...H101.clone(s), phase: 'roll' }, 0), false);
  while (s.phase !== 'roundover') { if (s.phase === 'roll') H101.roll(s, 1); else H101.choose(s, false); }
  const snap = JSON.stringify(s);
  assert.equal(H101.roll(s, 4), false);
  assert.equal(H101.choose(s, true), false);
  assert.equal(JSON.stringify(s), snap);
  assert.ok(H101.nextRound(s));
  assert.equal(s.turn, 1, 'second round starts with the other player');
  while (s.phase !== 'over') { if (s.phase === 'roll') H101.roll(s, 1); else H101.choose(s, false); }
  assert.equal(H101.nextRound(s), false, 'no rounds after the match');
  assert.deepEqual(s.wins, [2, 1], 'round 1: 7 beats 6; round 2: 6 and 6 share');
  assert.deepEqual(H101.champions(s), [0]);
  s.wins = [2, 2];
  assert.deepEqual(H101.champions(s), [0, 1], 'equal round counts share the match');
});

test('a busted player is skipped and the round ends when everyone busts', () => {
  const s = H101.create({ n: 2, rounds: 1 });
  for (const p of [0, 1]) { s.totals[p] = 99; s.rolls[p] = [{ d: 6, x10: true }]; }
  H101.roll(s, 2);        // forced bust for 0
  assert.equal(s.turn, 1);
  H101.roll(s, 6);        // forced bust for 1
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.history[0].winners, []);
  assert.deepEqual(s.wins, [0, 0]);
});

test('hard plays safe once the opponent has busted', () => {
  const s = H101.create({ n: 2, rounds: 1 });
  s.bust[1] = true; s.totals[1] = 120; s.rolls[1] = [{ d: 6, x10: true }, { d: 6, x10: true }];
  s.rolls[0] = [{ d: 1, x10: false }, { d: 1, x10: false }];
  s.totals[0] = 40; s.phase = 'choose'; s.die = 5;   // 90 would still usually survive, but 45 is certain
  assert.equal(H101.aiChoose(s, 'hard'), false);
  const [v1] = H101.rate(s);
  assert.ok(Math.abs(v1 - 1) < 1e-12);
});

test('hard AI value table agrees with self-play (exact solver sanity check)', () => {
  const r = rng(2024);
  const N = 20000;
  let v = 0;
  for (let g = 0; g < N; g++) {
    const s = H101.create({ n: 2, rounds: 1 });
    while (s.phase !== 'over') {
      H101.roll(s, die(r));
      if (s.phase === 'choose') H101.choose(s, H101.aiChoose(s, 'hard', r));
    }
    const w = s.history[0].winners;
    v += w.length === 1 ? (w[0] === 0 ? 1 : 0) : 0.5;
  }
  const exact = H101.wp(0, 6, 0, 6);
  assert.ok(Math.abs(v / N - exact) < 0.015, `self-play ${v / N} vs solver ${exact}`);
});

test('a forced bust on the very last roll closes the round; match start offsets the round rotation', () => {
  const s = H101.create({ n: 3, rounds: 2, first: 2 });
  assert.equal(s.turn, 2);
  // everyone rolls five plain 1s, then player 2's sixth roll is a forced bust
  for (let i = 0; i < 15; i++) { H101.roll(s, 1); H101.choose(s, false); }
  s.totals[2] = 99;
  H101.roll(s, 4);
  assert.equal(s.bust[2], true);
  assert.equal(s.turn, 0);
  for (let i = 0; i < 2; i++) { H101.roll(s, 1); H101.choose(s, false); }
  assert.equal(s.phase, 'roundover');
  assert.deepEqual(s.history[0].winners, [0, 1]);
  H101.nextRound(s);
  assert.equal(s.turn, 0, 'round 2 starts one seat after the match starter');
  assert.deepEqual(s.totals, [0, 0, 0]);
  assert.deepEqual(s.bust, [false, false, false]);
});
