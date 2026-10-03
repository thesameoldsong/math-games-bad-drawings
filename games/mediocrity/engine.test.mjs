import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MED } from './engine.js';

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

test('median pick scores its own value', () => {
  assert.deepEqual(MED.outcome([5, 20, 12]), { type: 'single', value: 12, to: 2 });
  assert.deepEqual(MED.outcome([0, 30, 29]), { type: 'single', value: 29, to: 2 });
  const s = MED.create({ rounds: 3 });
  MED.pick(s, 0, 5); MED.pick(s, 1, 20); MED.pick(s, 2, 12);
  assert.deepEqual(s.scores, [0, 0, 12]);
  assert.equal(s.round, 1);
  assert.deepEqual(s.picks, [null, null, null]);
  assert.equal(s.log[0].to, 2);
});

test('two equal picks: the odd one out assigns the points', () => {
  for (const [picks, chooser, tied] of [[[7, 7, 1], 2, [0, 1]], [[3, 9, 3], 1, [0, 2]], [[30, 2, 2], 0, [1, 2]]]) {
    const o = MED.outcome(picks);
    assert.equal(o.type, 'tie');
    assert.equal(o.chooser, chooser);
    assert.deepEqual(o.tied, tied);
  }
  const s = MED.create();
  MED.pick(s, 0, 7); MED.pick(s, 1, 7); MED.pick(s, 2, 25);
  assert.equal(s.phase, 'assign');
  assert.equal(s.pending.chooser, 2);
  assert.equal(MED.assign(s, 0, 1), false, 'only the chooser may assign');
  assert.equal(MED.assign(s, 2, 2), false, 'cannot give points to yourself');
  assert.equal(MED.assign(s, 2, 1), true);
  assert.deepEqual(s.scores, [0, 7, 0]);
  assert.equal(s.phase, 'pick');
  assert.equal(s.log[0].chooser, 2);
});

test('three equal picks score nothing', () => {
  const s = MED.create();
  MED.pick(s, 0, 15); MED.pick(s, 1, 15); MED.pick(s, 2, 15);
  assert.deepEqual(s.scores, [0, 0, 0]);
  assert.equal(s.log[0].to, -1);
  assert.equal(s.round, 1);
});

test('illegal picks are rejected', () => {
  const s = MED.create({ max: 30 });
  assert.equal(MED.pick(s, 0, 31), false);
  assert.equal(MED.pick(s, 0, -1), false);
  assert.equal(MED.pick(s, 0, 2.5), false);
  assert.equal(MED.pick(s, 3, 2), false);
  assert.equal(MED.pick(s, 0, 4), true);
  assert.equal(MED.pick(s, 0, 5), false, 'no re-pick');
  assert.equal(s.picks[0], 4);
});

test('the middle total wins; ties are crowned by the odd one out; all equal is a draw', () => {
  const play = (rounds) => {
    const s = MED.create({ rounds: rounds.length });
    for (const r of rounds) { r.forEach((x, p) => MED.pick(s, p, x)); }
    return s;
  };
  // totals 10 / 20 / 0 → player 0 wins
  let s = play([[10, 0, 30], [30, 20, 0]]);
  assert.deepEqual(s.scores, [10, 20, 0]);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 0);
  // totals 10 / 10 / 0 → player 2 crowns
  s = play([[10, 0, 30], [30, 10, 0]]);
  assert.deepEqual(s.scores, [10, 10, 0]);
  assert.equal(s.phase, 'crown');
  assert.equal(s.pending.chooser, 2);
  assert.equal(MED.crown(s, 0, 1), false);
  assert.equal(MED.crown(s, 2, 1), true);
  assert.equal(s.winner, 1);
  // all zero → draw
  s = play([[5, 5, 5]]);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, -1);
});

test('no picks are accepted after the game ends', () => {
  const s = MED.create({ rounds: 2 });
  MED.pick(s, 0, 1); MED.pick(s, 1, 2); MED.pick(s, 2, 3);
  MED.pick(s, 0, 20); MED.pick(s, 1, 30); MED.pick(s, 2, 10);
  assert.deepEqual(s.scores, [20, 2, 0]);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 1);
  assert.equal(MED.pick(s, 0, 4), false);
});

test('redact hides other players\' numbers', () => {
  const s = MED.create();
  MED.pick(s, 0, 11); MED.pick(s, 2, 3);
  const r = MED.redact(s, 1);
  assert.deepEqual(r.picks, [-1, null, -1]);
  assert.deepEqual(MED.redact(s, 0).picks, [11, null, -1]);
  assert.deepEqual(s.picks, [11, null, 3], 'original untouched');
});

function aiGame(levels, rounds = 5, seed = 1) {
  const s = MED.create({ rounds });
  let guard = 0;
  while (s.phase !== 'over') {
    assert.ok(guard++ < 100, 'game terminates');
    if (s.phase === 'pick') {
      for (const p of MED.waitingFor(s)) {
        const x = MED.aiPick(s, p, levels[p], seed++);
        assert.ok(MED.legalPick(s, p, x), `legal pick ${x}`);
        MED.pick(s, p, x);
      }
    } else {
      const p = s.pending.chooser;
      const to = MED.aiAssign(s, p, levels[p], seed++);
      assert.ok(s.pending.tied.includes(to));
      assert.ok(s.phase === 'assign' ? MED.assign(s, p, to) : MED.crown(s, p, to));
    }
  }
  return s;
}

test('AI-only games terminate with legal moves at every level', () => {
  for (const lv of ['easy', 'normal']) {
    const s = aiGame([lv, lv, lv], 5, 42);
    assert.equal(s.log.length, 5);
    assert.ok(s.winner >= -1 && s.winner < 3);
  }
});

test('ties are resolved by the AI chooser', () => {
  const s = MED.create({ rounds: 3 });
  MED.pick(s, 0, 9); MED.pick(s, 1, 9); MED.pick(s, 2, 1);
  const to = MED.aiAssign(s, 2, 'normal', 5);
  assert.ok([0, 1].includes(to));
});

test('in the last round the normal AI takes a sure middle when it can', () => {
  // Scores 0 / 50 / 100 for p0 / p2 / p1. p2 is already in the middle and wins if nobody overtakes it.
  // AI as p0 (score 0) needs to land 51..99 — impossible with max 30, so any move is fine; check p2 instead:
  const s = MED.create({ rounds: 2 });
  s.round = 1; s.scores = [40, 0, 45];
  // p2 sits on top (45); taking ANY points keeps it on top — so it should avoid scoring: pick an extreme.
  const x = MED.aiPick(s, 2, 'normal', 7);
  assert.ok(x === 0 || x <= 2 || x >= 28, `expected an extreme pick, got ${x}`);
});

test('normal AI beats easy AI more often than chance', () => {
  let wins = 0, games = 30;
  for (let i = 0; i < games; i++) {
    const seat = i % 3;
    const levels = ['easy', 'easy', 'easy'];
    levels[seat] = 'normal';
    const s = aiGame(levels, 5, 1000 + i * 31);
    if (s.winner === seat) wins++;
  }
  assert.ok(wins > games / 3, `normal won only ${wins}/${games}`);
});

test('a tied pair scores its shared number, whether it is the low or the high pair', () => {
  assert.deepEqual(MED.outcome([20, 3, 20]), { type: 'tie', value: 20, chooser: 1, tied: [0, 2] });
  assert.deepEqual(MED.outcome([4, 30, 30]), { type: 'tie', value: 30, chooser: 0, tied: [1, 2] });
  assert.deepEqual(MED.outcome([0, 0, 9]), { type: 'tie', value: 0, chooser: 2, tied: [0, 1] });
});

test('actions out of phase are rejected', () => {
  const s = MED.create({ rounds: 2 });
  assert.equal(MED.assign(s, 0, 1), false, 'no assign while picking');
  assert.equal(MED.crown(s, 0, 1), false, 'no crown while picking');
  MED.pick(s, 0, 6); MED.pick(s, 1, 6); MED.pick(s, 2, 1);
  assert.equal(s.phase, 'assign');
  assert.equal(MED.pick(s, 2, 5), false, 'no pick while a tie is open');
  assert.equal(MED.crown(s, 2, 0), false, 'assign is not crown');
  assert.deepEqual(MED.redact(s, 0).picks, [6, 6, 1], 'picks are public once all are in');
  MED.assign(s, 2, 0);
  // last round ends with totals 6 · 6 · 0: the middle is shared, player 2 crowns
  MED.pick(s, 0, 30); MED.pick(s, 1, 6); MED.pick(s, 2, 0);
  assert.deepEqual(s.scores, [6, 6, 0]);
  assert.equal(s.phase, 'crown');
  assert.equal(MED.assign(s, 2, 0), false, 'crown is not assign');
  assert.equal(MED.crown(s, 2, 2), false, 'the chooser cannot crown themselves');
  assert.equal(MED.crown(s, 2, 0), true);
  assert.equal(MED.crown(s, 2, 1), false, 'only once');
  assert.equal(s.winner, 0);
});

test('tied lowest totals are the middle too: 0 · 0 · 12 is crowned by the leader', () => {
  const s = MED.create({ rounds: 1 });
  MED.pick(s, 0, 12); MED.pick(s, 1, 30); MED.pick(s, 2, 1);
  assert.deepEqual(s.scores, [12, 0, 0]);
  assert.equal(s.phase, 'crown');
  assert.equal(s.pending.chooser, 0);
});

test('AI never makes an illegal move from random mid-game positions', () => {
  let seed = 9;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) {
    const s = MED.create({ rounds: 3 + 2 * (i % 4) });
    s.round = Math.floor(rnd() * s.rounds);
    s.scores = [0, 1, 2].map(() => Math.floor(rnd() * 80));
    for (const lv of ['easy', 'normal']) {
      for (const p of [0, 1, 2]) {
        const x = MED.aiPick(MED.redact(s, p), p, lv, i * 3 + p);
        assert.ok(MED.legalPick(s, p, x), `legal pick ${x}`);
      }
    }
  }
});

test('normal AI clearly beats players who pick uniformly at random', () => {
  let wins = 0, games = 45, seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < games; i++) {
    const me = i % 3, s = MED.create({ rounds: 5 });
    while (s.phase !== 'over') {
      if (s.phase === 'pick') {
        for (const p of MED.waitingFor(s)) MED.pick(s, p, p === me ? MED.aiPick(MED.redact(s, p), p, 'normal', i * 97 + s.round) : Math.floor(rnd() * 31));
      } else {
        const p = s.pending.chooser;
        const to = p === me ? MED.aiAssign(s, p, 'normal', i) : s.pending.tied[rnd() < 0.5 ? 0 : 1];
        s.phase === 'assign' ? MED.assign(s, p, to) : MED.crown(s, p, to);
      }
    }
    if (s.winner === me) wins++;
  }
  assert.ok(wins >= games / 2, `normal won only ${wins}/${games}`);
});
