import { test } from 'node:test';
import assert from 'node:assert/strict';
import { N99 } from './engine.js';

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

const seeded = (s) => () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);

test('fractions reduce and division by zero is refused', () => {
  assert.deepEqual(N99.apply(N99.F(1), '/', N99.F(2)), { n: 1, d: 2 });
  assert.deepEqual(N99.apply(N99.F(2, 4), '*', N99.F(4)), { n: 2, d: 1 });
  assert.deepEqual(N99.apply(N99.F(1), '-', N99.F(3)), { n: -2, d: 1 });
  assert.equal(N99.apply(N99.F(5), '/', N99.F(0)), null);
  // (3 − 3) as a divisor is rejected by combine
  const t = N99.combine(N99.startTiles([3, 3, 2, 1, 1]), 0, '-', 1);
  assert.equal(N99.combine(t, 1, '/', 0), null);
});

test('combine puts the result in the second tile’s place', () => {
  const t = N99.combine(N99.startTiles([6, 5, 4, 3, 2]), 4, '*', 0); // 2 × 6
  assert.equal(t.length, 4);
  assert.deepEqual(t.map((x) => N99.fracText(x.v)), ['12', '5', '4', '3']);
  assert.equal(N99.combine(t, 1, '+', 1), null);
  assert.equal(N99.combine(t, 0, '%', 1), null);
});

test('fractions are fine in the middle: 8 ÷ (1 − 1/5) = 10', () => {
  const dice = [1, 1, 5, 8];
  const t = N99.replay(dice, [[1, '/', 2], [0, '-', 1], [1, '/', 0]]);
  assert.equal(t.length, 1);
  assert.deepEqual(t[0].v, { n: 10, d: 1 });
  assert.equal(N99.exprText(t[0].e, dice), '8 ÷ (1 − 1 ÷ 5)');
});

test('scoring: distance to target, never over, whole numbers only, cap 10', () => {
  assert.equal(N99.points(55, N99.F(54)), 1);
  assert.equal(N99.points(55, N99.F(55)), 0);
  assert.equal(N99.points(55, N99.F(56)), 10);
  assert.equal(N99.points(55, N99.F(30)), 10);
  assert.equal(N99.points(55, N99.F(46)), 9);
  assert.equal(N99.points(55, N99.F(109, 2)), 10);
  assert.equal(N99.points(55, null), 10);
});

test('incomplete or invalid answers score 10', () => {
  const dice = [6, 5, 4, 3, 2];
  assert.equal(N99.scoreSteps(dice, 60, [[0, '*', 1]]), 10);
  assert.equal(N99.scoreSteps(dice, 60, [[0, '*', 9], [0, '+', 1], [0, '+', 1], [0, '+', 1]]), 10);
  assert.equal(N99.scoreSteps(dice, 60, null), 10);
  // 6 × 5 × 4 ÷ 2 ÷ 3 = 20 → 40 away, capped
  assert.equal(N99.scoreSteps(dice, 60, [[0, '*', 1], [0, '*', 1], [0, '/', 2], [0, '/', 1]]), 10);
  // 6 × 5 = 30; 30 + 4 = 34; 3 × 34 = 102; 102 − 2 = 100 → over 99 → 10, but 98 target … exact check on 100
  const ex = [[0, '*', 1], [0, '+', 1], [1, '*', 0], [0, '-', 1]];
  assert.deepEqual(N99.finalTile(dice, ex).v, { n: 100, d: 1 });
  assert.equal(N99.scoreSteps(dice, 99, ex), 10);
  const ex2 = [[0, '*', 1], [0, '+', 1], [1, '*', 0], [1, '-', 0]]; // 2 − 102 = −100
  assert.deepEqual(N99.finalTile(dice, ex2).v, { n: -100, d: 1 });
});

test('solver agrees with the book on 1,2,3,4,5 (60 of the targets 33..99 reachable)', () => {
  const w = N99.wholeValues([1, 2, 3, 4, 5]);
  let c = 0;
  for (let t = 33; t <= 99; t++) if (w.has(t)) c++;
  assert.equal(c, 60);
  // 1,2,3,4,7 reaches every target
  const w2 = N99.wholeValues([1, 2, 3, 4, 7]);
  for (let t = 33; t <= 99; t++) assert.ok(w2.has(t), `missing ${t}`);
});

test('every solver expression replays to its value and prints correctly', () => {
  const dice = [2, 2, 3, 5, 6];
  for (const [v, e] of N99.wholeValues(dice)) {
    const steps = N99.treeToSteps(e, 5);
    const t = N99.finalTile(dice, steps);
    assert.ok(t, `no tile for ${v}`);
    assert.deepEqual(t.v, { n: v, d: 1 });
    const js = N99.exprText(e, dice).replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/');
    assert.ok(Math.abs(Function(`return ${js}`)() - v) < 1e-9, `${js} != ${v}`);
  }
});

test('best answer: exact when possible, never over the target', () => {
  const b = N99.best([4, 4, 4, 4, 4], 64);
  assert.equal(b.value, 64); assert.equal(b.pts, 0);
  const b2 = N99.best([4, 4, 4, 4, 4], 62);
  assert.equal(b2.value, 60); assert.equal(b2.pts, 2);
  const b3 = N99.best([1, 1, 1, 1, 1], 99);
  assert.equal(b3.value, 6); assert.equal(b3.pts, 10);
});

test('AI answers are always legal complete answers; hard is optimal', () => {
  const rng = seeded(7);
  for (let k = 0; k < 60; k++) {
    const dice = N99.rollDice(rng), target = N99.aiTarget(rng);
    assert.ok(N99.validTarget(target));
    for (const lvl of ['easy', 'normal', 'hard']) {
      const s = N99.aiSteps(dice, target, lvl, rng);
      assert.equal(s.length, 4);
      assert.ok(N99.finalTile(dice, s), `${lvl} illegal on ${dice}`);
    }
    assert.equal(N99.scoreSteps(dice, target, N99.aiSteps(dice, target, 'hard', rng)), N99.best(dice, target)?.pts ?? 10);
  }
});

test('levels are ordered: hard ≤ normal ≤ easy on average', () => {
  const rng = seeded(11);
  const sum = { easy: 0, normal: 0, hard: 0 };
  for (let k = 0; k < 80; k++) {
    const dice = N99.rollDice(rng), target = N99.aiTarget(rng);
    for (const lvl of Object.keys(sum)) sum[lvl] += N99.scoreSteps(dice, target, N99.aiSteps(dice, target, lvl, rng));
  }
  assert.ok(sum.hard <= sum.normal && sum.normal < sum.easy, JSON.stringify(sum));
});

test('match flow: leaders rotate, rounds end, totals add up, AI-vs-AI terminates', () => {
  const rng = seeded(3);
  for (const n of [2, 3, 5]) {
    const G = N99.newMatch({ n, perLeader: 2, first: 1 % n });
    const leaders = [];
    let guard = 0;
    while (G.phase !== 'over' && guard++ < 100) {
      assert.equal(G.phase, 'pick');
      leaders.push(G.leader);
      assert.equal(N99.setTarget(G, 20, N99.rollDice(rng)), false); // out of range
      assert.ok(N99.setTarget(G, N99.aiTarget(rng), N99.rollDice(rng)));
      assert.equal(N99.setTarget(G, 50, [1, 2, 3, 4, 5]), false); // only once per round
      for (let p = 0; p < n; p++) {
        assert.equal(G.phase, 'solve');
        assert.ok(N99.submit(G, p, p === 1 ? null : N99.aiSteps(G.dice, G.target, ['easy', 'normal', 'hard'][p % 3], rng)));
        assert.equal(N99.submit(G, p, null), false); // one answer per player
      }
      assert.equal(G.phase, 'reveal');
      assert.equal(G.history.at(-1).pts[1], 10);
      N99.nextRound(G);
    }
    assert.equal(G.phase, 'over');
    assert.equal(G.history.length, n * 2);
    for (let p = 0; p < n; p++) assert.equal(leaders.filter((x) => x === p).length, 2);
    for (let p = 0; p < n; p++) assert.equal(G.totals[p], G.history.reduce((s, h) => s + h.pts[p], 0));
    assert.ok(G.totals[1] === n * 2 * 10);
    assert.ok(N99.winners(G).length >= 1 && !N99.winners(G).includes(1) || G.totals.every((x) => x === G.totals[1]));
  }
});

test('submit rejects garbage steps as "no answer"', () => {
  const G = N99.newMatch({ n: 2 });
  N99.setTarget(G, 50, [1, 2, 3, 4, 5]);
  N99.submit(G, 0, [[0, '+', 0], [1, '+', 2]]);
  assert.equal(G.subs[0], null);
  N99.submit(G, 1, [[0, '*', 1], [0, '*', 1], [0, '*', 1], [0, '-', 1]]);
  assert.equal(G.phase, 'reveal');
});

test('steps with non-integer or out-of-range indexes are refused', () => {
  const dice = [6, 5, 4, 3, 2];
  assert.equal(N99.replay(dice, [['0', '+', 1]]), null);
  assert.equal(N99.replay(dice, [[0.5, '+', 1]]), null);
  assert.equal(N99.replay(dice, [[-1, '+', 1]]), null);
  assert.equal(N99.replay(dice, [[0, '+', 5]]), null);
  assert.equal(N99.replay(dice, ['0+1']), null);
  // five steps on five dice: the fifth has nothing left to combine
  assert.equal(N99.replay(dice, [[0, '+', 1], [0, '+', 1], [0, '+', 1], [0, '+', 1], [0, '+', 0]]), null);
  const G = N99.newMatch({ n: 2 });
  N99.setTarget(G, 50, dice);
  N99.submit(G, 0, [['0', '*', 1], [0, '*', 1], [0, '*', 1], [0, '-', 1]]);
  assert.equal(G.subs[0], null);
});

test('a whole negative answer or zero scores 10; dice values and target are validated', () => {
  assert.equal(N99.points(40, N99.F(0)), 10);
  assert.equal(N99.points(40, N99.F(-3)), 10);
  assert.equal(N99.points(33, N99.F(33)), 0);
  assert.equal(N99.points(99, N99.F(89)), 10);
  assert.equal(N99.points(99, N99.F(90)), 9);
  const G = N99.newMatch({ n: 2 });
  assert.equal(N99.setTarget(G, 32, [1, 2, 3, 4, 5]), false);
  assert.equal(N99.setTarget(G, 100, [1, 2, 3, 4, 5]), false);
  assert.equal(N99.setTarget(G, 50.5, [1, 2, 3, 4, 5]), false);
  assert.equal(N99.setTarget(G, 50, [1, 2, 3, 4, 7]), false);
  assert.equal(N99.setTarget(G, 50, [1, 2, 3, 4]), false);
  assert.ok(N99.setTarget(G, 33, [1, 2, 3, 4, 6]));
  assert.equal(N99.submit(G, 2, null), false); // no such player
});

test('the book’s phone-ad puzzle: 1, 1, 5, 8 make 10 only via a fraction', () => {
  const w = N99.wholeValues([1, 1, 5, 8]);
  assert.ok(w.has(10));
  const js = N99.exprText(w.get(10), [1, 1, 5, 8]);
  assert.match(js, /÷/);
});

test('decent AI clearly beats random play', () => {
  const rng = seeded(5);
  let rnd = 0, normal = 0;
  for (let k = 0; k < 150; k++) {
    const dice = N99.rollDice(rng), target = N99.aiTarget(rng);
    rnd += N99.scoreSteps(dice, target, N99.aiSteps(dice, target, 'normal', rng, 1));
    normal += N99.scoreSteps(dice, target, N99.aiSteps(dice, target, 'normal', rng));
  }
  assert.ok(normal * 3 < rnd, `normal ${normal} vs random ${rnd}`);
});

test('a tie on totals lists every tied player as a winner', () => {
  const G = N99.newMatch({ n: 3, perLeader: 1 });
  G.totals = [12, 7, 7];
  assert.deepEqual(N99.winners(G), [1, 2]);
});
