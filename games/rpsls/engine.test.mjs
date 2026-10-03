import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RPS } from './engine.js';
import { rng } from '../../shared/sketch.js';

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

test('every gesture beats exactly half of the others (5 and 3 gestures)', () => {
  for (const n of [3, 5]) {
    const gs = RPS.gesturesOf(n);
    for (const a of gs) {
      const wins = gs.filter((b) => RPS.outcome(a, b) > 0).length;
      const losses = gs.filter((b) => RPS.outcome(a, b) < 0).length;
      assert.equal(wins, (n - 1) / 2, a);
      assert.equal(losses, (n - 1) / 2, a);
      assert.equal(RPS.outcome(a, a), 0);
    }
  }
  assert.equal(RPS.RULES.length, 10);
});

test('circle order: each gesture beats the next one and the one three ahead', () => {
  const gs = RPS.ALL;
  gs.forEach((g, i) => {
    assert.equal(RPS.outcome(g, gs[(i + 1) % 5]), 1);
    assert.equal(RPS.outcome(g, gs[(i + 3) % 5]), 1);
  });
  const c = RPS.CLASSIC;
  c.forEach((g, i) => assert.equal(RPS.outcome(g, c[(i + 1) % 3]), 1));
});

test('the famous ten rules', () => {
  const o = RPS.outcome;
  assert.equal(o('scissors', 'paper'), 1);
  assert.equal(o('paper', 'rock'), 1);
  assert.equal(o('rock', 'lizard'), 1);
  assert.equal(o('lizard', 'spock'), 1);
  assert.equal(o('spock', 'scissors'), 1);
  assert.equal(o('scissors', 'lizard'), 1);
  assert.equal(o('lizard', 'paper'), 1);
  assert.equal(o('paper', 'spock'), 1);
  assert.equal(o('spock', 'rock'), 1);
  assert.equal(o('rock', 'scissors'), 1);
  assert.equal(o('rock', 'paper'), -1);
});

test('rounds: ties replay, wins score, first to target ends the match', () => {
  const s = RPS.create({ set: 5, target: 2 });
  assert.equal(RPS.pick(s, 0, 'rock'), null);
  assert.throws(() => RPS.pick(s, 0, 'paper'));
  let r = RPS.pick(s, 1, 'rock');
  assert.deepEqual(r, { picks: ['rock', 'rock'], win: -1 });
  assert.deepEqual(s.score, [0, 0]);
  assert.deepEqual(s.pending, [null, null]);
  RPS.pick(s, 1, 'spock');
  r = RPS.pick(s, 0, 'lizard');
  assert.equal(r.win, 0);
  RPS.pick(s, 0, 'paper'); RPS.pick(s, 1, 'scissors');
  assert.deepEqual(s.score, [1, 1]);
  assert.ok(!RPS.isOver(s));
  RPS.pick(s, 0, 'spock'); RPS.pick(s, 1, 'scissors');
  assert.equal(s.winner, 0);
  assert.ok(RPS.isOver(s));
  assert.throws(() => RPS.pick(s, 0, 'rock'));
});

test('classic set rejects lizard and spock', () => {
  const s = RPS.create({ set: 3 });
  assert.throws(() => RPS.pick(s, 0, 'spock'));
  assert.throws(() => RPS.pick(s, 0, 'lizard'));
  assert.equal(RPS.pick(s, 0, 'rock'), null);
});

test('AI only plays legal gestures and AI-vs-AI matches terminate', () => {
  const r = rng(7);
  for (const set of [3, 5]) for (const a of ['easy', 'normal', 'hard']) for (const b of ['easy', 'normal', 'hard']) {
    const s = RPS.create({ set, target: 5 });
    let n = 0;
    while (!RPS.isOver(s)) {
      const g0 = RPS.aiPick(s, 0, a, r), g1 = RPS.aiPick(s, 1, b, r);
      assert.ok(RPS.valid(s, g0) && RPS.valid(s, g1));
      RPS.pick(s, 0, g0); RPS.pick(s, 1, g1);
      assert.ok(++n < 500);
    }
    assert.equal(Math.max(...s.score), 5);
  }
});

test('AI never peeks at the pending pick', () => {
  const s = RPS.create({ set: 5 });
  for (const g of ['rock', 'paper', 'spock', 'rock']) { RPS.pick(s, 0, g); RPS.pick(s, 1, 'lizard'); }
  const a = RPS.clone(s), b = RPS.clone(s);
  RPS.pick(b, 0, 'scissors');
  for (const lvl of ['easy', 'normal', 'hard']) {
    assert.equal(RPS.aiPick(a, 1, lvl, rng(3)), RPS.aiPick(b, 1, lvl, rng(3)));
  }
});

// Plays `rounds` rounds of a fixed strategy (function of history) against an AI level; returns AI's net wins.
function duel(strategy, level, set = 5, rounds = 300, seed = 1) {
  const r = rng(seed);
  const s = RPS.create({ set, target: 7 });
  s.target = 1e9;
  let net = 0;
  for (let i = 0; i < rounds; i++) {
    const g0 = strategy(s.rounds, RPS.gesturesOf(set), r);
    const g1 = RPS.aiPick(s, 1, level, r);
    const rd = RPS.pick(s, 0, g0); RPS.pick(s, 1, g1);
    const last = s.rounds[s.rounds.length - 1];
    net += last.win === 1 ? 1 : last.win === 0 ? -1 : 0;
  }
  return net;
}

test('hard AI punishes predictable players', () => {
  const always = (h) => 'rock';
  const cycler = (h, gs) => gs[h.length % gs.length];
  const copycat = (h, gs) => (h.length ? h[h.length - 1].picks[1] : 'paper'); // copies AI's last
  const beater = (h, gs) => (h.length ? gs.find((g) => RPS.outcome(g, h[h.length - 1].picks[1]) > 0) : 'rock');
  for (const st of [always, cycler, copycat, beater]) {
    for (const set of [3, 5]) {
      const net = duel(st, 'hard', set);
      assert.ok(net > 90, `hard only +${net} vs ${st.name || 'strategy'} (${set})`);
    }
  }
});

test('normal AI beats a player stuck on one gesture; easy is exploitable', () => {
  assert.ok(duel(() => 'spock', 'normal') > 80);
  // easy repeats itself half the time: countering its last gesture wins clearly
  const counter = (h, gs) => (h.length ? gs.find((g) => RPS.outcome(g, h[h.length - 1].picks[1]) > 0) : 'rock');
  assert.ok(duel(counter, 'easy', 5, 400) < -60);
});

test('hard AI is not exploitable by a random player (stays near zero)', () => {
  const rand = (h, gs, r) => gs[Math.floor(r() * gs.length)];
  const net = duel(rand, 'hard', 5, 1000, 11);
  assert.ok(Math.abs(net) < 120, `net ${net}`);
});

test('outcome is antisymmetric for every pair; create() falls back on bad settings', () => {
  for (const a of RPS.ALL) for (const b of RPS.ALL) assert.ok(RPS.outcome(a, b) === -RPS.outcome(b, a), a + b);
  const s = RPS.create({ set: 4, target: 99 });
  assert.equal(s.set, 5);
  assert.equal(s.target, 3);
  assert.equal(RPS.create({ set: 3, target: 7 }).target, 7);
});

test('pick rejects a bad player index and leaves the state untouched', () => {
  const s = RPS.create();
  assert.throws(() => RPS.pick(s, 2, 'rock'));
  assert.throws(() => RPS.pick(s, 0, 'banana'));
  assert.deepEqual(s.pending, [null, null]);
  assert.equal(RPS.pick(s, 1, 'rock'), null);
  assert.deepEqual(s.pending, [null, 'rock']);
});

test('hard AI beats human-like habits (favourite gesture, win-stay/lose-shift)', () => {
  const biased = (h, gs, r) => (r() < 0.4 ? gs[0] : gs[Math.floor(r() * gs.length)]);
  const wsls = (h, gs) => {
    if (!h.length) return gs[0];
    const l = h[h.length - 1];
    return l.win === 0 ? l.picks[0] : gs.find((g) => RPS.outcome(g, l.picks[1]) > 0);
  };
  for (const seed of [1, 2, 3]) {
    assert.ok(duel(biased, 'hard', 5, 300, seed) > 25, 'biased');
    assert.ok(duel(wsls, 'hard', 5, 300, seed) > 150, 'wsls');
  }
});

test('every arrow closes a three-way loop (A beats B, some C loses to B but beats A)', () => {
  for (const n of [3, 5]) {
    const gs = RPS.gesturesOf(n);
    for (const [a, b] of RPS.RULES) {
      if (!gs.includes(a) || !gs.includes(b)) continue;
      assert.ok(gs.some((c) => RPS.outcome(b, c) > 0 && RPS.outcome(c, a) > 0), `${a}>${b}`);
    }
  }
  assert.throws(() => RPS.outcome('rock', 'banana'));
});

test('levels are ordered: hard beats normal, normal beats easy (head to head)', () => {
  const h2h = (a, b, seed) => {
    const r = rng(seed), s = RPS.create();
    s.target = 1e9;
    let net = 0;
    for (let i = 0; i < 1500; i++) {
      const g0 = RPS.aiPick(s, 0, a, r), g1 = RPS.aiPick(s, 1, b, r);
      RPS.pick(s, 0, g0); RPS.pick(s, 1, g1);
      const w = s.rounds[s.rounds.length - 1].win;
      net += w === 0 ? 1 : w === 1 ? -1 : 0;
    }
    return net;
  };
  assert.ok(h2h('hard', 'normal', 5) > 100);
  assert.ok(h2h('normal', 'easy', 5) > 100);
});

test('a finished round resets pending; a match-over state rejects picks without changes', () => {
  const s = RPS.create({ target: 1 });
  RPS.pick(s, 0, 'rock'); RPS.pick(s, 1, 'paper');
  assert.equal(s.winner, 1);
  const before = JSON.stringify(s);
  assert.throws(() => RPS.pick(s, 1, 'rock'));
  assert.equal(JSON.stringify(s), before);
});
