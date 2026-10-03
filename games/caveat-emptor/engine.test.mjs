import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CE } from './engine.js';

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

const pickAll = (s, cards) => cards.forEach((c, p) => CE.apply(s, { t: 'pick', p, card: c }));

test('bidding starts left of the auctioneer once everyone has picked', () => {
  const s = CE.create({ n: 4, rounds: 5, first: 2 });
  assert.equal(s.M, 6);
  pickAll(s, [2, 1, 3, 2]);
  assert.equal(s.phase, 'bid');
  assert.equal(s.turn, 3);
});

test('the opener must bid; bids must rise; drops reveal and skip', () => {
  const s = CE.create({ n: 3, rounds: 5, first: 0 });
  pickAll(s, [5, 1, 4]);
  assert.equal(CE.legal(s, { t: 'drop', p: 1 }), false);
  assert.equal(CE.legal(s, { t: 'bid', p: 2, amount: 3 }), false, 'not your turn');
  CE.apply(s, { t: 'bid', p: 1, amount: 7 });
  assert.equal(CE.legal(s, { t: 'bid', p: 2, amount: 7 }), false, 'must raise');
  CE.apply(s, { t: 'drop', p: 2 });
  assert.equal(s.revealed[2], true);
  assert.equal(s.turn, 0);
  CE.apply(s, { t: 'bid', p: 0, amount: 8 });
  assert.equal(s.turn, 1, 'dropped player is skipped');
  CE.apply(s, { t: 'drop', p: 1 });
  // player 0 is last standing: buys at 8, value 10
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.results[0], { round: 0, item: s.items[0], winner: 0, price: 8, value: 10, profit: 2, picks: [5, 1, 4] });
  assert.deepEqual(s.scores, [2, 0, 0]);
});

test('overpaying scores negative points', () => {
  const s = CE.create({ n: 2, rounds: 3, first: 0 });
  pickAll(s, [1, 1]);
  CE.apply(s, { t: 'bid', p: 1, amount: 5 });
  CE.apply(s, { t: 'drop', p: 0 });
  assert.equal(s.scores[1], -3);
});

test('used cards are gone next round; auctioneer rotates; game ends after the last lot', () => {
  const s = CE.create({ n: 2, rounds: 2, first: 1 });
  assert.equal(s.M, 3);
  pickAll(s, [3, 2]);
  assert.equal(s.turn, 0);
  CE.apply(s, { t: 'bid', p: 0, amount: 1 });
  CE.apply(s, { t: 'drop', p: 1 });
  assert.equal(s.phase, 'reveal');
  CE.apply(s, { t: 'next' });
  assert.equal(s.round, 1);
  assert.equal(s.auctioneer, 0);
  assert.deepEqual(CE.avail(s, 0), [1, 2]);
  assert.equal(CE.legal(s, { t: 'pick', p: 0, card: 3 }), false);
  pickAll(s, [2, 3]);
  assert.equal(s.turn, 1);
  CE.apply(s, { t: 'bid', p: 1, amount: 6 });
  CE.apply(s, { t: 'drop', p: 0 });
  assert.equal(s.phase, 'over');
  assert.equal(CE.isOver(s), true);
  assert.deepEqual(s.scores, [4, -1]);
  assert.deepEqual(CE.winners(s), [0]);
  assert.equal(CE.legal(s, { t: 'next' }), false);
});

test('view hides other players’ unrevealed cards and range uses only visible info', () => {
  const s = CE.create({ n: 4, rounds: 5, first: 0 });
  s.used = [[1, 3, 4], [1, 2, 3], [1, 4, 5], [1, 3, 6]];
  s.round = 3;
  pickAll(s, [5, 4, 2, 2]);
  const v = CE.view(s, 0);
  assert.deepEqual(v.pick, [5, -1, -1, -1]);
  assert.deepEqual(CE.range(v, 0), [5 + 4 + 2 + 2, 5 + 6 + 6 + 5]);
  CE.apply(s, { t: 'bid', p: 1, amount: 12 });
  CE.apply(s, { t: 'drop', p: 2 });
  assert.deepEqual(CE.view(s, 0).pick, [5, -1, 2, -1]);
  assert.deepEqual(CE.view(s, -1).pick, [-1, -1, 2, -1]);
  assert.ok(!JSON.stringify(CE.view(s, 3).ev).includes('"card":4'));
});

test('ties share the win', () => {
  const s = CE.create({ n: 3, rounds: 1 });
  s.scores = [2, 2, -1];
  assert.deepEqual(CE.winners(s), [0, 1]);
});

test('when the bid hits the ceiling the computer drops instead of bidding illegally', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    const s = CE.create({ n: 2, rounds: 5, first: 1 });
    pickAll(s, [6, 6]);
    CE.apply(s, { t: 'bid', p: 0, amount: CE.maxBid(s) });
    const a = CE.aiAction(CE.view(s, 1), 1, level);
    assert.deepEqual(a, { t: 'drop', p: 1 });
  }
});

test('normal AI keeps raising on a lot it knows is worth much more than the price', () => {
  const s = CE.create({ n: 3, rounds: 5, first: 2 });
  pickAll(s, [6, 3, 5]);
  CE.apply(s, { t: 'bid', p: 0, amount: 4 });
  CE.apply(s, { t: 'drop', p: 1 });
  // player 2 knows 3 + 5 = 8 plus player 0's card (at least 1): worth ≥ 9, price 4
  const a = CE.aiAction(CE.view(s, 2), 2, 'normal');
  assert.equal(a.t, 'bid');
});

function playGame(n, rounds, levels, rnd = Math.random) {
  const s = CE.create({ n, rounds, first: Math.floor(rnd() * n), rnd });
  let guard = 5000;
  while (!CE.isOver(s) && guard--) {
    if (s.phase === 'reveal') { CE.apply(s, { t: 'next' }); continue; }
    if (s.phase === 'pick') {
      for (let p = 0; p < n; p++) if (!s.pick[p]) {
        const a = CE.aiAction(CE.view(s, p), p, levels[p], rnd);
        assert.ok(CE.legal(s, a), 'illegal pick ' + JSON.stringify(a));
        CE.apply(s, a);
      }
      continue;
    }
    const p = s.turn;
    const v = CE.view(s, p);
    assert.ok(v.pick.every((c, q) => q === p || s.revealed[q] || c === -1), 'AI sees hidden cards');
    const a = CE.aiAction(v, p, levels[p], rnd);
    assert.ok(CE.legal(s, a), 'illegal bid ' + JSON.stringify(a));
    CE.apply(s, a);
  }
  assert.ok(CE.isOver(s));
  assert.equal(s.results.length, rounds);
  for (let p = 0; p < n; p++) {
    const cards = s.used[p].concat(s.pick[p]);
    assert.equal(new Set(cards).size, rounds, 'each card used once');
  }
  return s;
}

test('AI-only games terminate with legal moves at every level and size', () => {
  for (const level of ['easy', 'normal', 'hard'])
    for (const n of [2, 3, 5, 8]) playGame(n, 5, Array(n).fill(level));
  playGame(4, 3, ['easy', 'normal', 'hard', 'normal']);
  playGame(6, 7, ['hard', 'easy', 'normal', 'hard', 'easy', 'normal']);
});

test('normal AI outscores easy AI over many games', () => {
  let diff = 0;
  for (let g = 0; g < 60; g++) {
    const s = playGame(4, 5, g % 2 ? ['normal', 'easy', 'normal', 'easy'] : ['easy', 'normal', 'easy', 'normal']);
    const sign = g % 2 ? 1 : -1;
    diff += sign * (s.scores[0] + s.scores[2] - s.scores[1] - s.scores[3]);
  }
  assert.ok(diff > 0, 'normal minus easy = ' + diff);
});

test('hard AI does at least as well as normal AI', () => {
  let diff = 0;
  for (let g = 0; g < 24; g++) {
    const s = playGame(3, 5, g % 2 ? ['hard', 'normal', 'normal'] : ['normal', 'hard', 'normal']);
    const h = g % 2 ? 0 : 1;
    diff += s.scores[h] - (s.scores.reduce((a, b) => a + b, 0) - s.scores[h]) / 2;
  }
  assert.ok(diff > -15, 'hard minus normal avg = ' + diff);
});

test('malformed or out-of-phase actions are rejected', () => {
  const s = CE.create({ n: 3, rounds: 3, first: 0 });
  assert.equal(CE.legal(s, null), false);
  assert.equal(CE.legal(s, { t: 'pick', p: 3, card: 1 }), false, 'no such player');
  assert.equal(CE.legal(s, { t: 'pick', p: 0, card: 5 }), false, 'cards only go up to rounds + 1');
  assert.equal(CE.legal(s, { t: 'bid', p: 1, amount: 3 }), false, 'no bidding before everyone has picked');
  assert.equal(CE.legal(s, { t: 'next' }), false);
  CE.apply(s, { t: 'pick', p: 0, card: 2 });
  assert.equal(CE.legal(s, { t: 'pick', p: 0, card: 3 }), false, 'one card per round');
  CE.apply(s, { t: 'pick', p: 1, card: 4 });
  CE.apply(s, { t: 'pick', p: 2, card: 1 });
  assert.equal(CE.legal(s, { t: 'bid', p: 1, amount: 2.5 }), false, 'whole numbers only');
  assert.equal(CE.legal(s, { t: 'bid', p: 1, amount: 0 }), false, 'the opening bid is at least 1');
  assert.equal(CE.legal(s, { t: 'bid', p: 1, amount: CE.maxBid(s) + 1 }), false);
  assert.equal(CE.legal(s, { t: 'bid', p: 1, amount: CE.maxBid(s) }), true);
  assert.throws(() => CE.apply(s, { t: 'drop', p: 1 }));
});

test('the high bidder never gets a turn against themself; the lot sells once everyone else is out', () => {
  const s = CE.create({ n: 4, rounds: 5, first: 0 });
  pickAll(s, [3, 3, 3, 3]);
  CE.apply(s, { t: 'bid', p: 1, amount: 5 });
  CE.apply(s, { t: 'drop', p: 2 });
  CE.apply(s, { t: 'bid', p: 3, amount: 6 });
  CE.apply(s, { t: 'drop', p: 0 });
  assert.equal(s.turn, 1);
  CE.apply(s, { t: 'drop', p: 1 });
  assert.equal(s.phase, 'reveal');
  assert.equal(s.results[0].winner, 3);
  assert.equal(s.scores[3], 12 - 6);
  // everything is public after the sale
  assert.deepEqual(CE.view(s, 0).pick, [3, 3, 3, 3]);
  assert.deepEqual(CE.range(CE.view(s, -1), -1), [12, 12]);
});

test('final round leaves each player exactly two cards and AI picks one of them', () => {
  const s = CE.create({ n: 3, rounds: 3, first: 0 });
  s.used = [[1, 2], [3, 4], [1, 4]];
  s.round = 2; s.auctioneer = 2;
  assert.deepEqual(CE.avail(s, 0), [3, 4]);
  for (let p = 0; p < 3; p++) {
    const a = CE.aiAction(CE.view(s, p), p, 'hard');
    assert.ok(CE.legal(s, a));
    CE.apply(s, a);
  }
  assert.equal(s.phase, 'bid');
  assert.equal(s.turn, 0);
});

test('a decent AI clearly beats a random bidder', () => {
  const random = (v, me) => {
    if (v.bidder < 0) return { t: 'bid', p: me, amount: 1 + Math.floor(Math.random() * v.n * v.M * 0.6) };
    if (Math.random() < 0.5 || CE.minBid(v) > CE.maxBid(v)) return { t: 'drop', p: me };
    return { t: 'bid', p: me, amount: Math.min(CE.maxBid(v), CE.minBid(v) + Math.floor(Math.random() * 3)) };
  };
  let diff = 0;
  for (let g = 0; g < 80; g++) {
    const s = CE.create({ n: 4, rounds: 5, first: g % 4 });
    const smart = (p) => (p + g) % 2 === 0;
    while (!CE.isOver(s)) {
      if (s.phase === 'reveal') { CE.apply(s, { t: 'next' }); continue; }
      if (s.phase === 'pick') { for (let p = 0; p < 4; p++) if (!s.pick[p]) CE.apply(s, CE.aiAction(CE.view(s, p), p, 'easy')); continue; }
      const p = s.turn, v = CE.view(s, p);
      CE.apply(s, smart(p) ? CE.aiAction(v, p, 'normal') : random(v, p));
    }
    s.scores.forEach((x, p) => (diff += smart(p) ? x : -x));
  }
  assert.ok(diff / 80 > 3, 'normal minus random per game = ' + diff / 80);
});
