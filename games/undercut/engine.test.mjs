import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UC } from './engine.js';

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

const round = (s, a, b) => { assert.equal(UC.pick(s, 0, a), null); return UC.pick(s, 1, b); };

test('plain round: both score their own number', () => {
  const s = UC.create();
  const r = round(s, 2, 5);
  assert.deepEqual(r.pts, [2, 5]);
  assert.equal(r.cut, -1);
  assert.deepEqual(s.score, [2, 5]);
  assert.deepEqual(s.pending, [null, null]);
});

test('undercut: one less takes both numbers', () => {
  let s = UC.create();
  let r = round(s, 3, 4);
  assert.deepEqual(r.pts, [7, 0]);
  assert.equal(r.cut, 0);
  s = UC.create();
  r = round(s, 5, 4);
  assert.deepEqual(r.pts, [0, 9]);
  assert.equal(r.cut, 1);
  s = UC.create();
  r = round(s, 1, 2);
  assert.deepEqual(r.pts, [3, 0]);
});

test('same numbers: both score, nobody undercuts', () => {
  const s = UC.create();
  const r = round(s, 4, 4);
  assert.deepEqual(r.pts, [4, 4]);
  assert.equal(r.cut, -1);
});

test('1 vs 5 is not an undercut (no wrap-around)', () => {
  const s = UC.create();
  assert.deepEqual(round(s, 1, 5).pts, [1, 5]);
});

test('illegal picks are ignored, picks cannot be changed', () => {
  const s = UC.create();
  for (const v of [0, 6, 2.5, '3', null]) assert.equal(UC.pick(s, 0, v), null);
  assert.deepEqual(s.pending, [null, null]);
  UC.pick(s, 0, 3);
  UC.pick(s, 0, 4);
  assert.equal(s.pending[0], 3);
});

test('a lead of exactly the target wins; game then refuses picks', () => {
  const s = UC.create({ target: 11 });
  round(s, 5, 1); // +4
  round(s, 5, 1); // +8
  assert.equal(s.winner, -1);
  round(s, 4, 1); // +11
  assert.equal(s.winner, 0);
  assert.equal(UC.pick(s, 0, 3), null);
  assert.equal(s.rounds.length, 3);
});

test('red can win by undercutting', () => {
  const s = UC.create({ target: 7 });
  round(s, 5, 4); // red +9
  assert.equal(s.winner, 1);
});

test('flaunt: repeats multiply, undercutter takes the boosted value', () => {
  const s = UC.create({ target: 10000, flaunt: true });
  assert.deepEqual(round(s, 4, 1).pts, [4, 1]);
  assert.deepEqual(round(s, 4, 1).pts, [16, 1]);
  assert.deepEqual(round(s, 4, 2).pts, [64, 2]);
  assert.equal(UC.streak(s, 0, 4), 4);
  const r = round(s, 4, 3);
  assert.deepEqual(r.vals, [256, 3]);
  assert.deepEqual(r.pts, [0, 259]);
  // switching numbers resets the streak
  assert.equal(UC.worth(s, 0, 2), 2);
});

test('equilibrium mix: every pure reply breaks even', () => {
  const s = UC.create();
  for (const a of UC.NUMS) {
    const ev = UC.NUMS.reduce((acc, b) => acc + UC.NASH[b - 1] * UC.net(a, b, a, b), 0);
    assert.ok(Math.abs(ev) < 1e-9, `reply ${a} gets ${ev}`);
  }
  assert.ok(Math.abs(UC.NASH.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.equal(s.rounds.length, 0);
});

test('AI only ever picks legal numbers and never peeks at a pending pick', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    for (const flaunt of [false, true]) {
      const s = UC.create({ target: 1e9, flaunt });
      for (let i = 0; i < 80; i++) {
        const a = UC.aiPick(s, 0, level);
        assert.ok(UC.valid(a));
        UC.pick(s, 0, a);
        // pending pick of player 0 must not influence player 1: compare with a copy without it
        const blind = UC.clone(s); blind.pending = [null, null];
        let seed = 7; const r1 = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        let seed2 = 7; const r2 = () => ((seed2 = (seed2 * 16807) % 2147483647) / 2147483647);
        const b = UC.aiPick(s, 1, level, r1);
        assert.equal(b, UC.aiPick(blind, 1, level, r2));
        assert.ok(UC.valid(b));
        UC.pick(s, 1, b);
      }
    }
  }
});

test('AI-vs-AI games terminate with a winner', () => {
  for (const [l0, l1] of [['easy', 'hard'], ['normal', 'normal'], ['hard', 'normal']]) {
    for (const flaunt of [false, true]) {
      const s = UC.create({ target: UC.DEFAULT_TARGET[flaunt ? 'flaunt' : 'classic'], flaunt });
      let n = 0;
      while (!UC.isOver(s) && n++ < 5000) { UC.pick(s, 0, UC.aiPick(s, 0, l0)); UC.pick(s, 1, UC.aiPick(s, 1, l1)); }
      assert.ok(UC.isOver(s), `${l0} vs ${l1} did not finish`);
      assert.ok(Math.abs(s.score[0] - s.score[1]) >= s.target);
    }
  }
});

test('hard AI exploits a predictable opponent', () => {
  let wins = 0;
  for (let g = 0; g < 60; g++) {
    const s = UC.create({ target: 11 });
    while (!UC.isOver(s)) { UC.pick(s, 0, 4); UC.pick(s, 1, UC.aiPick(s, 1, 'hard')); }
    if (s.winner === 1) wins++;
  }
  assert.ok(wins >= 45, `hard beat always-4 only ${wins}/60`);
});

test('hard AI beats easy AI more often than not over many games', () => {
  let wins = 0;
  for (let g = 0; g < 300; g++) {
    const s = UC.create({ target: 11 });
    while (!UC.isOver(s)) { UC.pick(s, 0, UC.aiPick(s, 0, 'hard')); UC.pick(s, 1, UC.aiPick(s, 1, 'easy')); }
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 190, `hard won only ${wins}/300`);
});

// ---------- extra edge cases ----------
const lcg = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const play = (lvl, other, { flaunt = false, target, games = 300, seed = 1 } = {}) => {
  const rnd = lcg(seed);
  let wins = 0;
  for (let g = 0; g < games; g++) {
    const s = UC.create({ target: target ?? UC.DEFAULT_TARGET[flaunt ? 'flaunt' : 'classic'], flaunt });
    for (let n = 0; !UC.isOver(s) && n < 2000; n++) {
      const a = UC.aiPick(s, 0, lvl, rnd), b = other(s, rnd);
      UC.pick(s, 0, a); UC.pick(s, 1, b);
    }
    if (s.winner === 0) wins++;
  }
  return wins / games;
};

test('player index out of range is rejected', () => {
  const s = UC.create();
  assert.equal(UC.pick(s, 2, 3), null);
  assert.equal(UC.pick(s, -1, 3), null);
  assert.deepEqual(s.pending, [null, null]);
});

test('scores level again: no winner, game goes on', () => {
  const s = UC.create({ target: 7 });
  round(s, 5, 1); // 5:1
  round(s, 1, 5); // 6:6
  assert.equal(s.winner, -1);
  assert.deepEqual(s.score, [6, 6]);
});

test('overshooting the target still wins', () => {
  const s = UC.create({ target: 7 });
  round(s, 3, 1); // +2
  const r = round(s, 4, 5); // blue undercuts: +9 -> lead 11
  assert.equal(r.cut, 0);
  assert.equal(s.winner, 0);
});

test('flaunt: streaks count for player 1, survive being undercut, ties pay both', () => {
  const s = UC.create({ target: 1e9, flaunt: true });
  assert.deepEqual(round(s, 2, 2).pts, [2, 2]);
  assert.deepEqual(round(s, 2, 2).pts, [4, 4]);
  // red plays 2 a third time (8) but blue undercuts with 1
  const r = round(s, 1, 2);
  assert.deepEqual(r.vals, [1, 8]);
  assert.deepEqual(r.pts, [9, 0]);
  assert.equal(UC.worth(s, 1, 2), 16);
  assert.equal(UC.worth(s, 1, 3), 3);
  assert.equal(UC.worth(s, 0, 1), 1); // 1 to any power is still 1
});

test('classic scoring ignores repeats', () => {
  const s = UC.create();
  round(s, 3, 1); round(s, 3, 1);
  assert.deepEqual(round(s, 3, 1).pts, [3, 1]);
});

test('hard AI clearly beats a uniformly random player; dice is a coin flip', () => {
  const rnd5 = (s, r) => 1 + Math.floor(r() * 5);
  const hard = play('hard', rnd5, { games: 400, seed: 3 });
  assert.ok(hard >= 0.6, `hard vs random ${hard}`);
  const normal = play('normal', rnd5, { games: 400, seed: 5 });
  assert.ok(normal > 0.38 && normal < 0.62, `dice vs random ${normal}`);
});

test('hard AI punishes streaks in Flaunt', () => {
  assert.ok(play('hard', () => 4, { flaunt: true, games: 100, seed: 7 }) >= 0.9);
  const repeat = (s) => (s.rounds.length ? s.rounds.at(-1).picks[1] : 3);
  assert.ok(play('hard', repeat, { flaunt: true, games: 100, seed: 9 }) >= 0.9);
  const easy = play('hard', (s, r) => UC.aiPick(s, 1, 'easy', r), { flaunt: true, games: 200, seed: 11 });
  assert.ok(easy >= 0.75, `hard vs easy (flaunt) ${easy}`);
});

test('hard AI is not an easy mark for "undercut its last number"', () => {
  const counter = (s) => Math.max(1, (s.rounds.length ? s.rounds.at(-1).picks[0] : 3) - 1);
  const w = play('hard', counter, { games: 300, seed: 13 });
  assert.ok(w >= 0.6, `hard vs counter ${w}`);
});

// ---------- reviewer additions ----------
test('flaunt: an undercutter on a streak takes its own boosted value plus the victim\'s', () => {
  const s = UC.create({ target: 1e9, flaunt: true });
  round(s, 3, 4); // blue undercuts: 3 + 4
  round(s, 3, 4); // 9 + 16
  const r = round(s, 3, 4); // 27 + 64
  assert.deepEqual(r.vals, [27, 64]);
  assert.deepEqual(r.pts, [91, 0]);
  assert.deepEqual(s.score, [7 + 25 + 91, 0]);
});

test('flaunt: a streak is broken by any other number, even for one round', () => {
  const s = UC.create({ target: 1e9, flaunt: true });
  round(s, 5, 1); round(s, 5, 1); round(s, 2, 1);
  assert.equal(UC.worth(s, 0, 5), 5);
  assert.equal(UC.worth(s, 1, 1), 1);
  assert.equal(UC.streak(s, 1, 1), 4);
});

test('finished game rejects picks from either seat and never reopens', () => {
  const s = UC.create({ target: 7 });
  round(s, 5, 4); // red +9
  assert.equal(s.winner, 1);
  assert.equal(UC.pick(s, 1, 2), null);
  assert.deepEqual(s.pending, [null, null]);
  assert.deepEqual(s.score, [0, 9]);
});

test('a winning lead is decided only after both picks are in', () => {
  const s = UC.create({ target: 7 });
  round(s, 5, 1); round(s, 5, 1); // 10 : 2, lead 8 >= 7
  assert.equal(s.winner, 0);
  // one pending pick alone never changes the score or ends the game
  const t = UC.create({ target: 11 });
  round(t, 5, 1); // lead 4
  assert.equal(UC.pick(t, 0, 5), null);
  assert.equal(t.winner, -1);
  assert.deepEqual(t.score, [5, 1]);
});

test('hard AI is strong from either seat', () => {
  const rnd = lcg(21);
  let wins = 0;
  for (let g = 0; g < 300; g++) {
    const s = UC.create({ target: 11 });
    while (!UC.isOver(s)) { UC.pick(s, 0, 1 + Math.floor(rnd() * 5)); UC.pick(s, 1, UC.aiPick(s, 1, 'hard', rnd)); }
    if (s.winner === 1) wins++;
  }
  assert.ok(wins / 300 >= 0.6, `hard as red vs random ${wins}/300`);
});

test('every AI level returns a legal number on an empty board and deep into a long game', () => {
  for (const flaunt of [false, true]) {
    const s = UC.create({ target: 1e12, flaunt });
    for (const level of ['easy', 'normal', 'hard']) assert.ok(UC.valid(UC.aiPick(s, 0, level)));
    for (let i = 0; i < 150; i++) { UC.pick(s, 0, 1 + (i % 2)); UC.pick(s, 1, 1 + ((i * 7) % 5)); }
    for (const level of ['easy', 'normal', 'hard']) for (const me of [0, 1]) assert.ok(UC.valid(UC.aiPick(s, me, level)));
  }
});
