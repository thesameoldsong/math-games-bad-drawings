import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PII, CELLS } from './engine.js';

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

const stripes = Array.from({ length: CELLS }, (_, i) => Math.floor(i / 6) % 2);   // rows alternate △ / ●

function round(seats = 3, cpu = false) {
  const m = PII.newMatch({ seats, cpuDesigner: cpu });
  return m;
}

test('match setup: rotating designer, one round per seat', () => {
  const m = round(3);
  assert.equal(m.rounds, 3);
  assert.equal(m.round.designer, 0);
  assert.equal(m.round.phase, 'design');
  assert.equal(m.round.sheets[0], null);
  assert.deepEqual(PII.guessers(m.round), [1, 2]);
  const c = PII.newMatch({ seats: 1, cpuDesigner: true });
  assert.equal(c.rounds, 1);
  assert.equal(c.round.designer, -1);
  assert.throws(() => PII.newMatch({ seats: 1, cpuDesigner: false }));
});

test('pattern validation and peeks', () => {
  const m = round(3), r = m.round;
  assert.equal(PII.setPattern(r, [1, 2, 3]), false);
  assert.equal(PII.setPattern(r, Array(CELLS).fill(4)), false);
  assert.equal(PII.peek(r, 1, [0]), null, 'no peeking before the pattern exists');
  assert.ok(PII.setPattern(r, stripes));
  assert.equal(r.phase, 'guess');
  assert.equal(PII.peek(r, 0, [0]), null, 'designer has no sheet');
  PII.setGuess(r, 1, 6, 0);
  assert.deepEqual(PII.peek(r, 1, [0, 6, 6, 99]), [[0, 0], [6, 1], [6, 1]]);
  assert.equal(r.sheets[1].peeks, 2, 'repeated peeks count once, bad cells ignored');
  assert.equal(r.sheets[1].guess[6], -1, 'revealing clears a guess');
  assert.equal(PII.setGuess(r, 1, 0, 2), false, 'cannot guess on a revealed square');
  assert.equal(r.sheets[2].peeks, 0, 'sheets are private');
});

test('scoring: +1 / −1, revealed squares never score, designer gets the spread', () => {
  const m = round(4), r = m.round;
  PII.setPattern(r, stripes);
  // seat 1: 3 right, 1 wrong; seat 2: 0 right 2 wrong; seat 3: one revealed + right guess elsewhere
  PII.setGuess(r, 1, 0, 0); PII.setGuess(r, 1, 1, 0); PII.setGuess(r, 1, 6, 1); PII.setGuess(r, 1, 7, 0);
  PII.setGuess(r, 2, 0, 1); PII.setGuess(r, 2, 6, 3);
  PII.peek(r, 3, [0]); PII.setGuess(r, 3, 12, 0);
  for (const p of [1, 2, 3]) PII.submit(r, p);
  assert.ok(PII.allDone(r));
  assert.ok(PII.finishRound(m));
  const res = r.result;
  assert.equal(res.scores[1], 2);
  assert.equal(res.scores[2], -2);
  assert.equal(res.scores[3], 1);
  assert.equal(res.spread, 4);
  assert.equal(res.scores[0], 4);
  assert.deepEqual(m.totals, [4, 2, -2, 1]);
});

test('giving up: 0 points, designer pays 5 then 10 more each', () => {
  assert.equal(PII.giveUpPenalty(0), 0);
  assert.equal(PII.giveUpPenalty(1), 5);
  assert.equal(PII.giveUpPenalty(2), 15);
  assert.equal(PII.giveUpPenalty(3), 25);
  const m = round(4), r = m.round;
  PII.setPattern(r, stripes);
  PII.setGuess(r, 1, 0, 0); PII.setGuess(r, 1, 6, 1); PII.submit(r, 1);
  PII.setGuess(r, 2, 0, 3); PII.giveUp(r, 2);
  PII.giveUp(r, 3);
  assert.equal(PII.giveUp(r, 3), false, 'cannot act twice');
  PII.finishRound(m);
  assert.equal(r.result.scores[2], 0);
  assert.equal(r.result.giveUps, 2);
  assert.equal(r.result.scores[0], 2 - 15);
});

test('submit with an explicit guess array (online guest) ignores revealed squares', () => {
  const m = round(2), r = m.round;
  PII.setPattern(r, stripes);
  PII.peek(r, 1, [0]);
  const g = Array(CELLS).fill(-1); g[0] = 2; g[1] = 0; g[2] = 9;
  assert.ok(PII.submit(r, 1, g));
  assert.equal(r.sheets[1].guess[0], -1);
  assert.equal(r.sheets[1].guess[1], 0);
  assert.equal(r.sheets[1].guess[2], -1);
});

test('rounds rotate the designer and the match ends', () => {
  const m = round(2);
  for (let i = 0; i < 2; i++) {
    const r = m.round;
    assert.equal(r.designer, i);
    PII.setPattern(r, stripes);
    PII.submit(r, 1 - i);
    PII.finishRound(m);
    if (i === 0) { assert.ok(!PII.isMatchOver(m)); assert.ok(PII.nextRound(m)); }
  }
  assert.ok(PII.isMatchOver(m));
  assert.equal(PII.nextRound(m), false);
});

test('view for a guest hides the pattern and other sheets until the end', () => {
  const m = round(3, true), r = m.round;
  PII.setPattern(r, stripes);
  PII.peek(r, 0, [0, 1]); PII.setGuess(r, 0, 5, 0);
  PII.peek(r, 1, [7]);
  const v = PII.viewFor(m, 1);
  assert.equal(v.round.pattern, null);
  assert.ok(v.round.sheets[0].rev.every((x) => x === -1));
  assert.ok(v.round.sheets[0].guess.every((x) => x === -1));
  assert.equal(v.round.sheets[0].peeks, 2);
  assert.equal(v.round.sheets[1].rev[7], 1);
  for (const p of [0, 1, 2]) PII.submit(r, p);
  PII.finishRound(m);
  const w = PII.viewFor(m, 1);
  assert.deepEqual(w.round.pattern, stripes);
  assert.equal(w.round.sheets[0].guess[5], 0);
});

test('generated patterns are valid and use at least two symbols', () => {
  for (let i = 0; i < 300; i++) {
    const p = PII.generatePattern();
    assert.ok(PII.validPattern(p));
    assert.ok(new Set(p).size >= 2);
  }
});

test('inference: a striped pattern is predicted after a few peeks', () => {
  const known = Array(CELLS).fill(-1);
  for (const c of [0, 6, 14, 21, 29, 35, 3, 32]) known[c] = stripes[c];
  const P = PII.predict(known);
  let right = 0;
  for (let c = 0; c < CELLS; c++) if (known[c] < 0 && P[c].indexOf(Math.max(...P[c])) === stripes[c]) right++;
  assert.ok(right >= 26, `predicted ${right}/28`);
  for (const row of P) assert.ok(Math.abs(row.reduce((a, b) => a + b, 0) - 1) < 1e-6);
});

test('AI only uses legal actions and does well on structured patterns', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    let total = 0;
    for (let i = 0; i < 25; i++) {
      const m = PII.newMatch({ seats: 1, cpuDesigner: true }), r = m.round;
      const pat = PII.generatePattern();
      PII.setPattern(r, pat);
      const res = PII.aiTurn(r, 0, level);
      assert.ok(res);
      const sh = r.sheets[0];
      assert.notEqual(sh.status, 'play');
      for (let c = 0; c < CELLS; c++) {
        if (sh.rev[c] >= 0) { assert.equal(sh.rev[c], pat[c]); assert.equal(sh.guess[c], -1); }
        assert.ok(sh.guess[c] >= -1 && sh.guess[c] < 4);
      }
      assert.equal(PII.aiTurn(r, 0, level), null, 'cannot play a finished sheet');
      total += PII.sheetScore(pat, sh).score;
    }
    if (level !== 'easy') assert.ok(total / 25 > 8, `${level} averages ${total / 25}`);
  }
});

test('full AI-only match terminates with consistent totals', () => {
  const m = PII.newMatch({ seats: 4, cpuDesigner: false });
  let guard = 0;
  do {
    const r = m.round;
    PII.setPattern(r, PII.generatePattern());
    for (const p of PII.guessers(r)) PII.aiTurn(r, p, ['easy', 'normal', 'hard'][p % 3]);
    assert.ok(PII.finishRound(m));
    if (++guard > 10) throw new Error('match never ended');
  } while (PII.nextRound(m));
  assert.ok(PII.isMatchOver(m));
  assert.equal(m.past.length, 4);
  for (let p = 0; p < 4; p++) assert.equal(m.totals[p], m.past.reduce((a, s) => a + s[p], 0));
  assert.ok(PII.leaders(m).length >= 1);
});

test('edge cases: no actions out of phase, bad cells and symbols rejected', () => {
  const m = round(3), r = m.round;
  assert.equal(PII.setGuess(r, 1, 0, 0), false, 'no guessing during design');
  assert.equal(PII.finishRound(m), false, 'cannot finish during design');
  assert.equal(PII.nextRound(m), false, 'cannot skip an unfinished round');
  PII.setPattern(r, stripes);
  assert.equal(PII.setPattern(r, Array(CELLS).fill(0)), false, 'pattern is fixed once guessing starts');
  assert.equal(PII.setGuess(r, 1, 1.5, 0), false);
  assert.equal(PII.setGuess(r, 1, '3', 0), false);
  assert.equal(PII.setGuess(r, 1, 3, 4), false);
  assert.equal(PII.setGuess(r, 1, 3, 1.5), false);
  assert.ok(PII.setGuess(r, 1, 3, -1), 'clearing is allowed');
  assert.equal(PII.submit(r, 1, [1, 2]), false, 'bad guess array');
  assert.equal(r.sheets[1].status, 'play');
  PII.submit(r, 1);
  assert.equal(PII.finishRound(m), false, 'one guesser still playing');
  assert.equal(PII.peek(r, 1, [0]), null, 'no peeking after handing in');
  assert.equal(PII.setGuess(r, 1, 0, 0), false, 'no guessing after handing in');
  PII.giveUp(r, 2);
  assert.ok(PII.finishRound(m));
  assert.equal(PII.finishRound(m), false, 'a round is scored only once');
  assert.deepEqual(m.totals, [0 - 5, 0, 0], 'spread 0, one give-up costs 5');
  assert.equal(PII.peek(r, 2, [0]), null);
});

test('view for a guest designer contains its own pattern but no other sheets', () => {
  const m = round(3), r = m.round;
  assert.equal(PII.nextRound(m), false);
  assert.equal(r.designer, 0);
  PII.setPattern(r, stripes); for (const p of [1, 2]) PII.submit(r, p); PII.finishRound(m);
  PII.nextRound(m);
  assert.equal(m.round.designer, 1);
  PII.setPattern(m.round, stripes);
  PII.peek(m.round, 2, [4]);
  const v = PII.viewFor(m, 1);
  assert.deepEqual(v.round.pattern, stripes);
  assert.equal(v.round.sheets[1], null);
  assert.ok(v.round.sheets[2].rev.every((x) => x === -1));
  assert.equal(v.round.result, null);
  const h = PII.viewFor(m, 2);
  assert.equal(h.round.pattern, null, 'other seats never get it before the end');
});

test('computer guessers clearly beat random play', () => {
  let rnd = 0, ai = 0;
  const T = 30;
  for (let i = 0; i < T; i++) {
    const pat = PII.generatePattern();
    // random player: peeks 10 random squares, guesses every other square at random
    const m1 = PII.newMatch({ seats: 1 }), r1 = m1.round;
    PII.setPattern(r1, pat);
    const cells = [...Array(CELLS).keys()].sort(() => Math.random() - 0.5);
    PII.peek(r1, 0, cells.slice(0, 10));
    for (const c of cells.slice(10)) PII.setGuess(r1, 0, c, Math.floor(Math.random() * 4));
    PII.submit(r1, 0);
    rnd += PII.sheetScore(pat, r1.sheets[0]).score;
    const m2 = PII.newMatch({ seats: 1 }), r2 = m2.round;
    PII.setPattern(r2, pat);
    PII.aiTurn(r2, 0, 'normal');
    ai += PII.sheetScore(pat, r2.sheets[0]).score;
  }
  assert.ok(ai / T > rnd / T + 10, `ai ${ai / T} vs random ${rnd / T}`);
});
