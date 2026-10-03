import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIG } from './engine.js';

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

test('scoring of single rolls (two dice)', () => {
  assert.deepEqual(PIG.outcome([3, 4]), { g: 7, kind: 'plain' });
  assert.deepEqual(PIG.outcome([5, 5]), { g: 20, kind: 'double' });
  assert.deepEqual(PIG.outcome([2, 2]), { g: 8, kind: 'double' });
  assert.deepEqual(PIG.outcome([1, 1]), { g: 25, kind: 'snake' });
  assert.equal(PIG.outcome([1, 6]).kind, 'bust');
  assert.equal(PIG.outcome([4, 1]).kind, 'bust');
});

test('scoring with one die', () => {
  assert.deepEqual(PIG.outcome([1]), { g: 0, kind: 'bust' });
  assert.deepEqual(PIG.outcome([6]), { g: 6, kind: 'plain' });
});

test('bust probability is 10/36 and holding at 27 maximises the turn average', () => {
  let bust = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (PIG.outcome([a, b]).kind === 'bust') bust++;
  assert.equal(bust, 10);
  assert.ok(PIG.rollGain(2, 26) > 0);
  assert.ok(PIG.rollGain(2, 27) < 0);
  assert.ok(PIG.rollGain(1, 19) > 0);
  assert.ok(PIG.rollGain(1, 20) < 1e-9);
  assert.ok(PIG.rollGain(1, 21) < 0);
});

test('turn flow: rolls accumulate, hold banks, bust loses the turn total', () => {
  const s = PIG.create();
  assert.equal(PIG.canHold(s), false);
  assert.throws(() => PIG.apply(s, { a: 'hold' }));
  PIG.apply(s, { a: 'roll', d: [3, 4] });
  PIG.apply(s, { a: 'roll', d: [5, 5] });
  assert.equal(s.k, 27);
  assert.equal(PIG.canHold(s), true);
  const e = PIG.apply(s, { a: 'hold' });
  assert.equal(e.banked, 27);
  assert.deepEqual(s.scores, [27, 0]);
  assert.equal(s.turn, 1);
  PIG.apply(s, { a: 'roll', d: [6, 2] });
  const b = PIG.apply(s, { a: 'roll', d: [1, 3] });
  assert.equal(b.type, 'bust');
  assert.equal(b.lost, 8);
  assert.deepEqual(s.scores, [27, 0]);
  assert.equal(s.turn, 0);
  assert.equal(s.k, 0);
  assert.equal(s.moves, 5);
});

test('snake eyes do not end the turn', () => {
  const s = PIG.create();
  const e = PIG.apply(s, { a: 'roll', d: [1, 1] });
  assert.equal(e.type, 'roll');
  assert.equal(s.k, 25);
  assert.equal(s.turn, 0);
});

test('reaching the target wins immediately', () => {
  const s = PIG.create();
  s.scores = [90, 50];
  PIG.apply(s, { a: 'roll', d: [4, 3] });
  assert.equal(s.winner, -1);
  const e = PIG.apply(s, { a: 'roll', d: [2, 3] });
  assert.equal(e.type, 'win');
  assert.equal(s.winner, 0);
  assert.equal(s.scores[0], 102);
  assert.ok(PIG.isOver(s));
  assert.equal(PIG.isLegal(s, { a: 'roll', d: [2, 2] }), false);
});

test('illegal actions are rejected', () => {
  const s = PIG.create({ dice: 1 });
  assert.equal(PIG.isLegal(s, { a: 'roll', d: [2, 3] }), false);
  assert.equal(PIG.isLegal(s, { a: 'roll', d: [7] }), false);
  assert.equal(PIG.isLegal(s, { a: 'roll', d: [0] }), false);
  assert.equal(PIG.isLegal(s, { a: 'jump' }), false);
  assert.equal(PIG.isLegal(s, { a: 'roll', d: [4] }), true);
});

test('turns rotate through all players', () => {
  const s = PIG.create({ players: 4, first: 2 });
  const seen = [];
  for (let i = 0; i < 4; i++) { seen.push(s.turn); PIG.apply(s, { a: 'roll', d: [1, 2] }); }
  assert.deepEqual(seen, [2, 3, 0, 1]);
});

test('AI never acts illegally and every AI-vs-AI game terminates', () => {
  const rnd = PIG.rng(7);
  for (const dice of [1, 2]) for (const players of [2, 3, 8]) for (const level of ['easy', 'normal', 'hard']) {
    for (let g = 0; g < 20; g++) {
      const s = PIG.create({ players, dice, first: g % players });
      let steps = 0;
      while (!PIG.isOver(s)) {
        const a = PIG.aiAction(s, level);
        assert.ok(a === 'roll' || (a === 'hold' && PIG.canHold(s)));
        if (a === 'hold') PIG.hold(s); else PIG.roll(s, rnd);
        assert.ok(++steps < 5000, 'game too long');
      }
      assert.ok(s.scores[s.winner] >= 100);
      assert.equal(s.scores.filter((x) => x >= 100).length, 1);
    }
  }
});

function duel(levelA, levelB, games, dice = 2) {
  const rnd = PIG.rng(12345 + dice);
  let a = 0;
  for (let g = 0; g < games; g++) {
    const s = PIG.create({ dice, first: g % 2 });
    while (!PIG.isOver(s)) {
      const act = PIG.aiAction(s, s.turn === 0 ? levelA : levelB);
      if (act === 'hold') PIG.hold(s); else PIG.roll(s, rnd);
    }
    if (s.winner === 0) a++;
  }
  return a / games;
}

test('hard beats normal and normal beats easy', () => {
  const hn = duel('hard', 'normal', 6000);
  const ne = duel('normal', 'easy', 3000);
  assert.ok(hn > 0.52, `hard vs normal ${hn}`);
  assert.ok(ne > 0.55, `normal vs easy ${ne}`);
  const hn1 = duel('hard', 'normal', 4000, 1);
  assert.ok(hn1 > 0.51, `hard vs normal (one die) ${hn1}`);
});

test('edge cases: bust on the first roll, snake-eyes win, one-die win, malformed actions', () => {
  const s = PIG.create({ players: 3 });
  const e = PIG.apply(s, { a: 'roll', d: [6, 1] });
  assert.equal(e.type, 'bust');
  assert.equal(e.lost, 0);
  assert.equal(s.turn, 1);
  s.scores[1] = 80;
  const w = PIG.apply(s, { a: 'roll', d: [1, 1] });
  assert.equal(w.type, 'win');
  assert.equal(s.winner, 1);
  assert.deepEqual(s.scores, [0, 105, 0]);
  assert.equal(PIG.isLegal(s, { a: 'hold' }), false);
  assert.throws(() => PIG.apply(s, { a: 'roll', d: [3, 3] }));

  const o = PIG.create({ dice: 1 });
  o.scores = [97, 0];
  PIG.apply(o, { a: 'roll', d: [2] });
  assert.equal(o.winner, -1);
  assert.equal(PIG.apply(o, { a: 'roll', d: [2] }).type, 'win');
  assert.equal(o.scores[0], 101);

  const m = PIG.create();
  for (const bad of [null, {}, { a: 'roll' }, { a: 'roll', d: '34' }, { a: 'roll', d: [2.5, 3] }, { a: 'roll', d: [3, 4, 5] }]) {
    assert.equal(PIG.isLegal(m, bad), false, JSON.stringify(bad));
  }
});

test('hard AI follows the exact policy where it has several hold intervals', () => {
  const s = PIG.create();
  s.scores = [0, 56];
  s.rolls = [1];
  const at = (k) => { s.k = k; return PIG.aiAction(s, 'hard'); };
  assert.equal(at(20), 'roll');
  assert.equal(at(32), 'hold');
  assert.equal(at(39), 'roll');   // a gap in the middle: pushing on pays here
  assert.equal(at(82), 'hold');   // …but with 82 at stake, bank it
  assert.equal(at(95), 'roll');   // 4 short of 100: go for the win
});

test('every computer level clearly beats a coin-flipping player', () => {
  for (const dice of [1, 2]) for (const level of ['easy', 'normal', 'hard']) {
    const rnd = PIG.rng(321 + dice);
    let won = 0;
    const games = 2000;
    for (let g = 0; g < games; g++) {
      const s = PIG.create({ dice, first: g % 2 });
      while (!PIG.isOver(s)) {
        const act = s.turn === 0 ? PIG.aiAction(s, level) : PIG.canHold(s) && rnd() < 0.5 ? 'hold' : 'roll';
        if (act === 'hold') PIG.hold(s); else PIG.roll(s, rnd);
      }
      if (s.winner === 0) won++;
    }
    assert.ok(won / games > 0.6, `${level} (${dice} dice) vs random: ${won / games}`);
  }
});

test('after a bust the next player cannot bank, banked points survive, clones are independent', () => {
  const s = PIG.create({ players: 3 });
  s.scores = [40, 10, 0];
  PIG.apply(s, { a: 'roll', d: [6, 6] });
  const c = PIG.clone(s);
  PIG.apply(s, { a: 'roll', d: [3, 1] });
  assert.deepEqual(s.scores, [40, 10, 0]);
  assert.equal(s.turn, 1);
  assert.equal(PIG.canHold(s), false);
  assert.equal(PIG.isLegal(s, { a: 'hold' }), false);
  assert.equal(c.k, 24);
  assert.equal(c.turn, 0);
  // the last seat wraps around to the first
  s.turn = 2;
  PIG.apply(s, { a: 'roll', d: [2, 3] });
  PIG.apply(s, { a: 'hold' });
  assert.deepEqual(s.scores, [40, 10, 5]);
  assert.equal(s.turn, 0);
});

test('every level rolls at the start of a turn; hard keeps rolling when the opponent is one roll from winning', () => {
  for (const level of ['easy', 'normal', 'hard']) for (const dice of [1, 2]) {
    const s = PIG.create({ dice });
    assert.equal(PIG.aiAction(s, level), 'roll');
  }
  for (const dice of [1, 2]) {
    const s = PIG.create({ dice });
    s.scores = [0, 98];
    s.rolls = [30]; s.k = 30;
    assert.equal(PIG.aiAction(s, 'hard'), 'roll');
    assert.equal(PIG.aiAction(s, 'normal'), 'hold');
  }
});
