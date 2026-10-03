import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARP } from './engine.js';

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

// Builds a state with given lists (player 0 ascends unless asc = 1).
function at(lists, { asc = 0, breakAt = [-1, -1] } = {}) {
  const s = ARP.create({ asc });
  s.lists = lists.map((l) => [...l]);
  s.breakAt = [...breakAt];
  return s;
}

test('ascender goes first; dice make both digit orders', () => {
  const s = ARP.create({ asc: 1 });
  assert.equal(s.turn, 1);
  assert.deepEqual(s.dirs, [-1, 1]);
  assert.ok(ARP.apply(s, { t: 'roll', d: [2, 6] }));
  assert.deepEqual(ARP.numbersOf(s.dice).sort(), [26, 62]);
  assert.deepEqual(ARP.legal(s).map((a) => a.t), ['place', 'place', 'pass']);
});

test('pattern, single break and no repeats', () => {
  const s = at([[23, 41], []]);
  assert.equal(ARP.kind(s, 0, 52), 1);
  assert.equal(ARP.kind(s, 0, 41), 0, 'repeat is never allowed');
  assert.equal(ARP.kind(s, 0, 15), 2, 'descending needs the break');
  s.breakAt[0] = 1;
  assert.equal(ARP.kind(s, 0, 15), 0, 'only one break per game');
  const d = at([[], [55]]);
  assert.equal(ARP.kind(d, 1, 54), 1);
  assert.equal(ARP.kind(d, 1, 56), 2);
});

test('placing uses the break and records where', () => {
  const s = at([[54], []]);
  s.turn = 0;
  ARP.apply(s, { t: 'roll', d: [1, 3] });
  assert.ok(ARP.apply(s, { t: 'place', n: 13 }));
  assert.equal(s.breakAt[0], 1);
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'roll');
  // illegal: number not on the dice
  ARP.apply(s, { t: 'roll', d: [4, 4] });
  assert.equal(ARP.apply(s, { t: 'place', n: 45 }), false);
});

test('runway framing: a reset costs like an ordinary move', () => {
  const a = at([[54], []]), b = at([[24], []]);
  assert.equal(ARP.cost(a, 0, 13), ARP.cost(b, 0, 43));
});

test('pass → steal counts as the stealer\'s turn; next roll is the roller\'s again', () => {
  const s = ARP.create({ asc: 0 });
  ARP.apply(s, { t: 'roll', d: [6, 5] });
  ARP.apply(s, { t: 'pass' });
  assert.equal(s.phase, 'steal');
  assert.equal(s.turn, 1);
  assert.ok(ARP.apply(s, { t: 'place', n: 65 }));
  assert.deepEqual(s.lists[1], [65]);
  assert.equal(s.turn, 0);
  assert.equal(s.phase, 'roll');
});

test('pass → decline lets the decliner roll', () => {
  const s = ARP.create({ asc: 0 });
  ARP.apply(s, { t: 'roll', d: [6, 5] });
  ARP.apply(s, { t: 'pass' });
  ARP.apply(s, { t: 'decline' });
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'roll');
  assert.equal(s.dice, null);
});

test('doubles allow exactly one reroll of one die', () => {
  const s = ARP.create({ asc: 0 });
  ARP.apply(s, { t: 'roll', d: [3, 3] });
  assert.ok(ARP.canReroll(s));
  assert.ok(ARP.apply(s, { t: 'reroll', v: 3 }));
  assert.deepEqual(s.dice, [3, 3]);
  assert.equal(ARP.canReroll(s), false);
  assert.equal(ARP.apply(s, { t: 'reroll', v: 5 }), false);
  ARP.apply(s, { t: 'pass' });
  assert.equal(ARP.legal(s).some((a) => a.t === 'reroll'), false, 'stealer cannot reroll');
});

test('tenth number wins', () => {
  const s = at([[11, 12, 13, 14, 15, 16, 21, 22, 23], [66]]);
  s.turn = 0;
  ARP.apply(s, { t: 'roll', d: [2, 4] });
  ARP.apply(s, { t: 'place', n: 42 });
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 0);
  assert.equal(s.end, 'ten');
});

test('both players stuck: longer list wins (or a tie)', () => {
  const s = at([[11, 66, 12, 66], [66, 11, 65, 11]], { breakAt: [2, 2] });
  assert.ok(ARP.stuck(s, 0) && ARP.stuck(s, 1));
  const t = at([[11, 66, 12, 65], [66, 11, 65, 11]], { breakAt: [2, 2] });
  t.turn = 0;
  ARP.apply(t, { t: 'roll', d: [6, 6] });
  ARP.apply(t, { t: 'place', n: 66 });
  assert.equal(t.phase, 'over');
  assert.equal(t.end, 'stuck');
  assert.equal(t.winner, 0);
});

test('AI only makes legal moves and AI-vs-AI games terminate', () => {
  let rnd = 7;
  const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  for (const [a, b] of [['easy', 'normal'], ['normal', 'easy'], ['normal', 'normal'], ['easy', 'easy']]) {
    for (let g = 0; g < 25; g++) {
      const s = ARP.create({ asc: g % 2 });
      let steps = 0;
      while (!ARP.isOver(s)) {
        const act = ARP.aiMove(s, s.turn === 0 ? a : b, r);
        const kinds = ARP.legal(s).map((x) => x.t + (x.n ?? ''));
        assert.ok(kinds.includes(act.t + (act.n ?? '')), `illegal ${JSON.stringify(act)}`);
        assert.ok(ARP.apply(s, act));
        assert.ok(++steps < 3000, 'game did not terminate');
      }
      assert.ok(s.winner >= 0);
    }
  }
});

test('normal AI beats easy AI most of the time', () => {
  let wins = 0;
  for (let g = 0; g < 120; g++) {
    const s = ARP.create({ asc: g % 2 });
    while (!ARP.isOver(s)) ARP.apply(s, ARP.aiMove(s, s.turn === 0 ? 'normal' : 'easy'));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 80, `normal won only ${wins}/120`);
});

test('AI takes an obviously great number and steals a gift', () => {
  const s = at([[12, 23, 34], [55]]);
  s.turn = 0;
  ARP.apply(s, { t: 'roll', d: [3, 5] });
  assert.deepEqual(ARP.aiMove(s, 'normal'), { t: 'place', n: 35 });
  const u = at([[12], [55, 54, 53]]);
  u.turn = 0;
  ARP.apply(u, { t: 'roll', d: [5, 2] });
  ARP.apply(u, { t: 'pass' });
  assert.deepEqual(ARP.aiMove(u, 'normal'), { t: 'place', n: 52 });
});

test('actions out of phase or with bad dice are rejected', () => {
  const s = ARP.create({ asc: 0 });
  assert.equal(ARP.apply(s, { t: 'pass' }), false);
  assert.equal(ARP.apply(s, { t: 'decline' }), false);
  assert.equal(ARP.apply(s, { t: 'place', n: 11 }), false);
  assert.equal(ARP.apply(s, { t: 'roll', d: [0, 7] }), false);
  assert.equal(ARP.apply(s, { t: 'roll', d: [2, 5] }), true);
  assert.equal(ARP.apply(s, { t: 'roll', d: [2, 5] }), false, 'no second roll');
  assert.equal(ARP.apply(s, { t: 'reroll', v: 3 }), false, 'reroll needs doubles');
  assert.equal(ARP.apply(s, { t: 'decline' }), false, 'roller cannot decline');
  ARP.apply(s, { t: 'pass' });
  assert.equal(ARP.apply(s, { t: 'pass' }), false, 'stealer cannot pass back');
  assert.equal(s.n, 2);
});

test('descender: break is a single step up, then down again', () => {
  const s = at([[], [44, 32]], { asc: 0 });
  assert.equal(ARP.kind(s, 1, 31), 1);
  assert.equal(ARP.kind(s, 1, 61), 2);
  s.turn = 1;
  ARP.apply(s, { t: 'roll', d: [6, 1] });
  ARP.apply(s, { t: 'place', n: 61 });
  assert.equal(s.breakAt[1], 2);
  assert.equal(ARP.kind(s, 1, 62), 0, 'second step up not allowed');
  assert.equal(ARP.kind(s, 1, 16), 1);
});

test('stuck only after the break is spent; one stuck player does not end the game', () => {
  const s = at([[11, 66], [55]]);
  assert.equal(ARP.stuck(s, 0), false, 'unused break still allows a step down');
  const t = at([[11, 66, 12, 65], [55]], { breakAt: [2, -1] });
  t.turn = 0;
  ARP.apply(t, { t: 'roll', d: [6, 6] });
  ARP.apply(t, { t: 'place', n: 66 });
  assert.ok(ARP.stuck(t, 0));
  assert.equal(t.phase, 'roll', 'opponent can still play');
  assert.equal(t.turn, 1);
  // a stuck roller can only pass
  t.turn = 0;
  ARP.apply(t, { t: 'roll', d: [6, 6] });
  assert.deepEqual(ARP.legal(t).map((a) => a.t), ['reroll', 'pass']);
  const d = at([[], [66, 11]], { breakAt: [-1, 1] });
  assert.ok(ARP.stuck(d, 1), 'descender stuck at 11 with the break used');
});

test('a new roller gets their own reroll after a decline', () => {
  const s = ARP.create({ asc: 0 });
  ARP.apply(s, { t: 'roll', d: [4, 4] });
  ARP.apply(s, { t: 'reroll', v: 4 });
  ARP.apply(s, { t: 'pass' });
  ARP.apply(s, { t: 'decline' });
  ARP.apply(s, { t: 'roll', d: [2, 2] });
  assert.equal(s.turn, 1);
  assert.ok(ARP.canReroll(s));
});

test('state survives a JSON round trip (online)', () => {
  const s = ARP.create({ asc: 1 });
  ARP.apply(s, { t: 'roll', d: [3, 1] });
  const c = JSON.parse(JSON.stringify(s));
  assert.ok(ARP.apply(c, { t: 'place', n: 13 }));
  assert.deepEqual(c.lists, [[], [13]]);
});

test('normal AI crushes a random player', () => {
  let rnd = 11;
  const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const random = (s) => {
    if (s.phase === 'roll') return { t: 'roll', d: [ARP.die(r), ARP.die(r)] };
    const L = ARP.legal(s), a = L[Math.floor(r() * L.length)];
    return a.t === 'reroll' ? { t: 'reroll', v: ARP.die(r) } : a;
  };
  let wins = 0;
  for (let g = 0; g < 100; g++) {
    const me = g % 2, s = ARP.create({ asc: (g >> 1) % 2 });
    while (!ARP.isOver(s)) ARP.apply(s, s.turn === me ? ARP.aiMove(s, 'normal', r) : random(s));
    if (s.winner === me) wins++;
  }
  assert.ok(wins >= 90, `normal won only ${wins}/100`);
});
