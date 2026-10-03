import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OUT } from './engine.js';

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

const G = (lo, hi) => ({ lo, hi });

test('misses score nothing; correct ranges beat misses and wider correct ranges', () => {
  // answer 50: A [40,60] w20, B [45,55] w10, C [0,30] miss, D [0,100] w100
  const r = OUT.score([G(40, 60), G(45, 55), G(0, 30), G(0, 100)], 50);
  assert.deepEqual(r.correct, [true, true, false, true]);
  assert.deepEqual(r.gains, [2, 3, 0, 1]);
  assert.equal(r.misses, 1);
});

test('equal widths do not beat each other; bounds are inclusive', () => {
  const r = OUT.score([G(10, 20), G(20, 30), G(21, 40)], 20);
  assert.deepEqual(r.correct, [true, true, false]);
  assert.deepEqual(r.gains, [1, 1, 0]);
  const pt = OUT.score([G(7, 7), G(1, 10)], 7);
  assert.deepEqual(pt.gains, [1, 0], 'an exact point guess is the narrowest possible');
});

test('the judge earns a point per miss and never guesses', () => {
  const r = OUT.score([null, G(1, 2), G(3, 9), G(100, 200)], 5, 0);
  assert.deepEqual(r.gains, [2, 0, 2, 0]);
  assert.equal(r.misses, 2);
});

test('book example: two guessers on a d10', () => {
  // I say 1–8, you say 1–7: you win on 1..7, I win on 8, nobody on 9–10
  for (let a = 1; a <= 10; a++) {
    const g = OUT.score([G(1, 8), G(1, 7)], a).gains;
    if (a <= 7) assert.deepEqual(g, [0, 1]);
    else if (a === 8) assert.deepEqual(g, [1, 0]);
    else assert.deepEqual(g, [0, 0]);
  }
});

test('ratio scoring compares hi/lo, zero-touching ranges are infinitely wide', () => {
  // moon distance style: [3000, 300000] ratio 100 vs [100000, 400000] ratio 4
  const w = OUT.score([G(3000, 300000), G(100000, 400000)], 239000, -1, 'width');
  assert.deepEqual(w.gains, [1, 0]);
  const r = OUT.score([G(3000, 300000), G(100000, 400000)], 239000, -1, 'ratio');
  assert.deepEqual(r.gains, [0, 1]);
  const z = OUT.score([G(0, 10), G(-5, 50), G(4, 6)], 5, -1, 'ratio');
  assert.deepEqual(z.gains, [0, 0, 2], "both zero-touching ranges tie at infinity");
  assert.equal(OUT.size(G(-10, -2), 'ratio'), 5);
});

test('game flow: guesses resolve the round, swapped ends are fixed, scores add up', () => {
  const s = OUT.create({ players: 3, rounds: 2, deck: 'trivia', seed: 7 });
  const a = s.qs[0].a;
  assert.equal(OUT.guess(s, 0, a + 10, a - 10), true);
  assert.deepEqual(s.guesses[0], { lo: a - 10, hi: a + 10 });
  assert.equal(OUT.guess(s, 0, 1, 2), false, 'no second guess');
  assert.equal(OUT.guess(s, 1, NaN, 2), false);
  OUT.guess(s, 1, a, a);
  assert.deepEqual(OUT.waitingFor(s), [2]);
  OUT.guess(s, 2, a + 1, a + 2);
  assert.equal(s.round, 1);
  assert.deepEqual(s.scores, [1, 2, 0]);
  assert.equal(s.log.length, 1);
  assert.deepEqual(s.guesses, [null, null, null]);
  for (const p of [0, 1, 2]) OUT.guess(s, p, -1e12, 1e12);
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.scores, [1, 2, 0]);
  assert.deepEqual(OUT.winners(s), [1]);
  assert.equal(OUT.guess(s, 0, 1, 2), false);
});

test('rotating judge: rounds round up to a multiple of players, judge sits out', () => {
  const s = OUT.create({ players: 3, rounds: 5, judge: true, seed: 1 });
  assert.equal(s.rounds, 6);
  assert.equal(OUT.judgeOf(s), 0);
  assert.deepEqual(OUT.waitingFor(s), [1, 2]);
  assert.equal(OUT.guess(s, 0, 1, 2), false);
  const a = s.qs[0].a;
  OUT.guess(s, 1, a - 1, a + 1);
  OUT.guess(s, 2, a + 5, a + 6);
  assert.deepEqual(s.scores, [1, 1, 0]);
  assert.equal(OUT.judgeOf(s), 1);
  const two = OUT.create({ players: 2, judge: true });
  assert.equal(two.judge, false, 'two players never use a judge');
});

test('deck: questions do not repeat, dice answers are in range, avoided ids go last', () => {
  const s = OUT.create({ players: 2, rounds: 30, deck: 'trivia', seed: 3 });
  assert.equal(new Set(s.qs.map((q) => q.id)).size, 30);
  const d = OUT.create({ players: 2, rounds: 40, deck: 'dice', seed: 5 });
  for (const q of d.qs) {
    const { min, max } = OUT.diceDist(OUT.BY_ID[q.id].dice);
    assert.ok(q.a >= min && q.a <= max && Number.isInteger(q.a));
  }
  const all = OUT.QUESTIONS.filter((q) => !q.dice).map((q) => q.id);
  const avoid = all.slice(0, all.length - 5);
  const f = OUT.create({ players: 2, rounds: 5, deck: 'trivia', avoid, seed: 9 });
  assert.ok(f.qs.every((q) => !avoid.includes(q.id)));
  const m = OUT.create({ players: 2, rounds: 60, deck: 'mix', seed: 11 });
  assert.ok(m.qs.some((q) => OUT.BY_ID[q.id].dice) && m.qs.some((q) => !OUT.BY_ID[q.id].dice));
});

test('dice distribution sums to 1', () => {
  const d = OUT.diceDist([2, 6]);
  assert.equal(d.min, 2); assert.equal(d.max, 12);
  assert.ok(Math.abs(d.p.reduce((a, b) => a + b) - 1) < 1e-12);
  assert.ok(Math.abs(d.p[5] - 6 / 36) < 1e-12);
});

test('redact hides other pending ranges and the unrevealed answer', () => {
  const s = OUT.create({ players: 2, rounds: 3, seed: 2 });
  OUT.guess(s, 0, 1, 5);
  const g = OUT.redact(s, 1);
  assert.equal(g.guesses[0], 'locked');
  assert.equal(g.qs[0].a, null);
  assert.equal(g.qs[1].id, null);
  OUT.guess(s, 1, 2, 3);
  const g2 = OUT.redact(s, 1);
  assert.equal(g2.qs[0].a, s.qs[0].a, 'past answers are visible');
  assert.deepEqual(g2.log[0].guesses[0], { lo: 1, hi: 5 });
});

test('number parsing', () => {
  const P = OUT.parseNumber;
  assert.equal(P('1 200', 'ru'), 1200);
  assert.equal(P('3,5', 'ru'), 3.5);
  assert.equal(P('1,200', 'en'), 1200);
  assert.equal(P('1,234,567', 'en'), 1234567);
  assert.equal(P('2.5k', 'en'), 2500);
  assert.equal(P('1,5 млн', 'ru'), 1500000);
  assert.equal(P('12 тыс', 'ru'), 12000);
  assert.equal(P('−40', 'ru'), -40);
  assert.equal(P('-273.15', 'en'), -273.15);
  assert.equal(P('', 'en'), null);
  assert.equal(P('abc', 'en'), null);
  assert.equal(P('1.2.3', 'en'), null);
});

test('AI ranges are always valid, and better levels score more on average', () => {
  const rnd = OUT.mulberry(42);
  const levels = ['easy', 'normal', 'hard'];
  const total = { easy: 0, normal: 0, hard: 0 };
  for (let game = 0; game < 25; game++) {
    const s = OUT.create({ players: 3, rounds: 10, deck: 'mix', seed: 100 + game });
    while (s.phase !== 'over') {
      for (const p of OUT.waitingFor(s)) {
        const g = OUT.aiGuess(s, p, levels[p], rnd);
        assert.ok(Number.isFinite(g.lo) && Number.isFinite(g.hi) && g.lo <= g.hi, JSON.stringify(g));
        const q = OUT.question(s);
        if (q.log != null && q.a > 0) assert.ok(g.lo >= 0, `log-scale range should stay non-negative ${q.id} ${g.lo}`);
        assert.equal(OUT.guess(s, p, g.lo, g.hi), true);
      }
    }
    levels.forEach((l, p) => (total[l] += s.scores[p]));
  }
  assert.ok(total.hard > total.easy && total.normal > total.easy, JSON.stringify(total));
});

test('every question can be resolved by every AI level (full AI-vs-AI games terminate)', () => {
  const rnd = OUT.mulberry(9);
  for (const deck of ['trivia', 'dice']) {
    const s = OUT.create({ players: 6, rounds: deck === 'trivia' ? 80 : 30, deck, judge: true, seed: 4 });
    let guard = 0;
    while (s.phase !== 'over' && guard++ < 10000) {
      const p = OUT.waitingFor(s)[0];
      const g = OUT.aiGuess(s, p, ['easy', 'normal', 'hard'][p % 3], rnd);
      assert.ok(OUT.guess(s, p, g.lo, g.hi));
    }
    assert.equal(s.phase, 'over');
    assert.equal(s.log.length, s.rounds);
    const judgePts = s.log.reduce((n, e) => n + e.correct.filter((c, p) => !c && p !== e.judge).length, 0);
    const sum = s.scores.reduce((a, b) => a + b);
    assert.ok(sum >= judgePts);
  }
});

test('question bank is well formed', () => {
  const ids = new Set();
  for (const q of OUT.QUESTIONS) {
    assert.ok(!ids.has(q.id), 'duplicate ' + q.id); ids.add(q.id);
    assert.ok(q.ru && q.en, q.id);
    if (!q.dice) {
      assert.ok(Number.isFinite(q.a), q.id);
      assert.ok((q.log != null) !== (q.sd != null), 'exactly one of log/sd ' + q.id);
      if (q.a < 0) assert.ok(q.neg, 'negative answers need neg ' + q.id);
    }
  }
});

test('edge cases: float widths tie, everybody misses, judge with ratio scoring', () => {
  // 0.1–0.3 and 1.1–1.3 are the same width despite floating-point noise
  const f = OUT.score([G(0.1, 0.3), G(1.1, 1.3)], 0.2);
  assert.deepEqual(f.gains, [1, 0]);
  assert.deepEqual(OUT.score([G(1.1, 1.3), G(1.15, 1.35)], 1.2).gains, [0, 0]);
  const none = OUT.score([null, G(1, 2), G(3, 4), G(8, 9)], 100, 0);
  assert.deepEqual(none.gains, [3, 0, 0, 0]);
  const r = OUT.score([G(10, 20), null, G(100, 150), G(-1, 500)], 120, 1, 'ratio');
  assert.deepEqual(r.gains, [0, 1, 2, 1], 'judge +1 for the miss; 1.5x beats the zero-crossing range');
  // a judge's stray range is ignored entirely
  assert.deepEqual(OUT.score([G(5, 5), G(1, 9)], 5, 0).gains, [0, 0]);
});

test('judge cannot guess, guesses after the game are ignored, players are clamped', () => {
  const s = OUT.create({ players: 4, rounds: 4, judge: true, seed: 3 });
  assert.equal(s.rounds, 4);
  for (let r = 0; r < 4; r++) {
    assert.equal(OUT.guess(s, r, 1, 2), false, 'judge of round ' + r);
    for (const p of OUT.waitingFor(s)) OUT.guess(s, p, 0, 1e9);
  }
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.log.map((e) => e.judge), [0, 1, 2, 3]);
  assert.equal(OUT.create({ players: 20 }).players, 8);
  assert.equal(OUT.create({ players: 0 }).players, 2);
});

test('more number parsing', () => {
  const P = OUT.parseNumber;
  assert.equal(P('1,5', 'en'), 1.5);
  assert.equal(P('20k', 'en'), 20000);
  assert.equal(P('1.5m', 'en'), 1500000);
  assert.equal(P('3 млрд', 'ru'), 3e9);
  assert.equal(P('-', 'en'), null);
  assert.equal(P('20 тыс.', 'ru'), 20000);
});

test('the careful and sneaky bots clearly beat a random-width guesser', () => {
  // the baseline is generous: its range is random but always lands near the answer's scale
  const rnd = OUT.mulberry(77);
  const randomGuess = (q) => {
    if (q.dice) {
      const { min, max } = OUT.diceDist(q.dice);
      const a = min + Math.floor(rnd() * (max - min + 1)), b = min + Math.floor(rnd() * (max - min + 1));
      return G(Math.min(a, b), Math.max(a, b));
    }
    const span = Math.abs(q.a) * 2 + 10, x = q.a - span / 2 + rnd() * span, y = q.a - span / 2 + rnd() * span;
    return G(Math.min(x, y), Math.max(x, y));
  };
  for (const level of ['normal', 'hard']) {
    let wins = 0, losses = 0;
    for (let game = 0; game < 120; game++) {
      const s = OUT.create({ players: 2, rounds: 8, deck: 'mix', seed: 500 + game });
      while (s.phase !== 'over') {
        const bot = OUT.aiGuess(s, 0, level, rnd), other = randomGuess(OUT.question(s));
        OUT.guess(s, 0, bot.lo, bot.hi); OUT.guess(s, 1, other.lo, other.hi);
      }
      if (s.scores[0] > s.scores[1]) wins++; else if (s.scores[0] < s.scores[1]) losses++;
    }
    assert.ok(wins > 3 * losses && wins > 70, `${level}: ${wins} wins, ${losses} losses`);
  }
});
