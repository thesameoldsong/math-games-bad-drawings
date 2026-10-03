import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BC } from './engine.js';

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

const ready = (opts, a, b) => {
  const s = BC.create(opts);
  assert.ok(BC.setSecret(s, 0, a));
  assert.ok(BC.setSecret(s, 1, b));
  return s;
};

test('feedback: bullseyes and close calls', () => {
  assert.deepEqual(BC.score('1234', '1234'), [4, 0]);
  assert.deepEqual(BC.score('1234', '4321'), [0, 4]);
  assert.deepEqual(BC.score('1234', '1567'), [1, 0]);
  assert.deepEqual(BC.score('1234', '5612'), [0, 2]);
  assert.deepEqual(BC.score('1234', '5678'), [0, 0]);
  assert.deepEqual(BC.score('0123', '0321'), [2, 2]);
});

test('feedback with repeated digits counts each digit once', () => {
  assert.deepEqual(BC.score('1112', '1221'), [1, 2]);
  assert.deepEqual(BC.score('1112', '2223'), [0, 1]);
  assert.deepEqual(BC.score('1111', '1211'), [3, 0]);
});

test('code validity', () => {
  assert.ok(BC.validCode(4, false, '0123'));
  assert.ok(!BC.validCode(4, false, '1123'));
  assert.ok(BC.validCode(4, true, '1123'));
  assert.ok(!BC.validCode(4, false, '123'));
  assert.ok(!BC.validCode(4, false, '12a4'));
  assert.ok(!BC.validCode(3, false, 123));
  assert.equal(BC.universe(4, false).strs.length, 5040);
  assert.equal(BC.universe(3, true).strs.length, 1000);
});

test('secrets: setup until both chosen, no overwriting, guesses rejected before play', () => {
  const s = BC.create({ len: 4 });
  assert.equal(BC.guess(s, '0123'), null);
  assert.ok(!BC.setSecret(s, 0, '1123'));
  assert.ok(BC.setSecret(s, 0, '1234'));
  assert.ok(!BC.setSecret(s, 0, '5678'));
  assert.equal(s.phase, 'setup');
  assert.ok(BC.setSecret(s, 1, '5678'));
  assert.equal(s.phase, 'play');
  assert.equal(BC.guess(s, '1123'), null, 'repeated digits are illegal');
});

test('turns alternate and feedback is against the opponent secret', () => {
  const s = ready({ len: 4 }, '1234', '5678');
  assert.equal(s.turn, 0);
  assert.deepEqual(BC.guess(s, '8765'), { g: '8765', b: 0, c: 4 });
  assert.equal(s.turn, 1);
  assert.deepEqual(BC.guess(s, '1243'), { g: '1243', b: 2, c: 2 });
  assert.equal(s.turn, 0);
});

test('first player cracks it: second player gets a last try and can tie', () => {
  const s = ready({ len: 4 }, '1234', '5678');
  BC.guess(s, '5678');
  assert.equal(s.phase, 'play');
  assert.ok(BC.lastChance(s));
  BC.guess(s, '1234');
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, -1);
});

test('first player cracks it and the last try misses', () => {
  const s = ready({ len: 4 }, '1234', '5678');
  BC.guess(s, '5670'); BC.guess(s, '1243');
  BC.guess(s, '5678');
  BC.guess(s, '1235');
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 0);
  assert.equal(BC.guess(s, '1234'), null, 'no guesses after the end');
});

test('second player cracking it ends the game at once', () => {
  const s = ready({ len: 3, first: 1 }, '012', '345');
  assert.equal(s.turn, 1);
  BC.guess(s, '012');
  assert.equal(s.phase, 'play', 'player 0 (moving second) still gets a last try');
  assert.equal(s.turn, 0);
  const s2 = ready({ len: 3, first: 0 }, '012', '345');
  BC.guess(s2, '987');
  BC.guess(s2, '012');
  assert.equal(s2.phase, 'over');
  assert.equal(s2.winner, 1);
});

test('view hides the opponent secret until the end', () => {
  const s = ready({ len: 4 }, '1234', '5678');
  const v = BC.view(s, 1);
  assert.equal(v.secrets[0], '?');
  assert.equal(v.secrets[1], '5678');
  BC.guess(s, '5678'); BC.guess(s, '1234');
  assert.equal(BC.view(s, 1).secrets[0], '1234');
});

test('candidates are consistent with all clues', () => {
  const clues = [{ g: '0123', b: 1, c: 1 }, { g: '4567', b: 0, c: 2 }];
  const c = BC.candidates(4, false, clues);
  assert.ok(c.length > 0);
  for (const x of c) for (const e of clues) assert.deepEqual(BC.score(x, e.g), [e.b, e.c]);
});

for (const [len, rep] of [[3, false], [4, false], [5, false], [4, true]]) {
  test(`AI vs AI finishes with legal guesses (len ${len}${rep ? ', repeats' : ''})`, () => {
    for (const [a, b] of [['easy', 'hard'], ['normal', 'easy'], ['hard', 'normal']]) {
      const s = BC.create({ len, rep, first: len % 2 });
      BC.setSecret(s, 0, BC.randomCode(len, rep));
      BC.setSecret(s, 1, BC.randomCode(len, rep));
      let n = 0;
      while (s.phase === 'play' && n < 200) {
        const g = BC.aiGuess(s, s.turn === 0 ? a : b);
        assert.ok(BC.validCode(len, rep, g), `illegal guess ${g}`);
        assert.ok(BC.guess(s, g));
        n++;
      }
      assert.equal(s.phase, 'over');
      assert.ok([-1, 0, 1].includes(s.winner));
    }
  });
}

test('normal and hard AI crack a 4-digit code in a sensible number of guesses', () => {
  for (const level of ['normal', 'hard']) {
    let total = 0, worst = 0;
    for (let k = 0; k < 15; k++) {
      const s = BC.create({ len: 4 });
      BC.setSecret(s, 0, BC.randomCode(4, false));
      BC.setSecret(s, 1, BC.randomCode(4, false));
      let n = 0;
      for (;;) {
        s.turn = 0;
        n++;
        if (BC.guess(s, BC.aiGuess(s, level)).b === 4) break;
        s.guesses[1].length = 0;
      }
      total += n; worst = Math.max(worst, n);
    }
    assert.ok(total / 15 < 7, `${level} average ${total / 15}`);
    assert.ok(worst <= 10, `${level} worst ${worst}`);
  }
});

test('hard AI probes with a known-wrong number when that is smarter', () => {
  // Like the book's example: candidates differ in one spot, so guessing any one of them splits the rest badly.
  const clues = [{ g: '3097', b: 3, c: 0 }, { g: '3497', b: 3, c: 0 }];
  const s = BC.create({ len: 4 });
  BC.setSecret(s, 0, '3697');
  BC.setSecret(s, 1, '3197');
  s.guesses[0] = clues.slice();
  const left = BC.candidates(4, false, clues);
  const split = (g) => new Set(left.map((x) => BC.score(x, g).join())).size;
  const bestCand = Math.max(...left.map(split));
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const g = BC.aiGuess(s, 'hard', rnd);
  assert.ok(!left.includes(g), `expected a probe, got candidate ${g}`);
  assert.ok(split(g) > bestCand, `probe ${g} splits ${split(g)} vs ${bestCand}`);
});

test('feedback is symmetric and never exceeds the code length', () => {
  for (const [len, rep] of [[4, false], [4, true], [5, true]]) {
    for (let k = 0; k < 300; k++) {
      const a = BC.randomCode(len, rep), b = BC.randomCode(len, rep);
      const [x, y] = BC.score(a, b);
      assert.deepEqual(BC.score(b, a), [x, y]);
      assert.ok(x + y <= len && x >= 0 && y >= 0);
      if (x === len) assert.equal(a, b);
    }
  }
});

test('setup edge cases: wrong length, bad seat state, view during setup', () => {
  const s = BC.create({ len: 3 });
  assert.ok(!BC.setSecret(s, 0, '1234'));
  assert.ok(!BC.setSecret(s, 0, '12'));
  assert.deepEqual(BC.view(s, 1).secrets, [null, null], 'unchosen secrets stay null, not "?"');
  assert.ok(BC.setSecret(s, 0, '012'));
  assert.deepEqual(BC.view(s, 1).secrets, ['?', null]);
  assert.deepEqual(BC.view(s, 0).secrets, ['012', null]);
  assert.ok(BC.setSecret(s, 1, '345'));
  assert.ok(!BC.setSecret(s, 1, '678'), 'no secrets once play has begun');
  assert.equal(BC.view(s, 0).secrets[1], '?');
  assert.equal(BC.guess(s, '01'), null);
  assert.equal(BC.guess(s, '0123'), null);
  assert.equal(s.turn, 0, 'illegal guesses do not pass the turn');
  assert.equal(BC.moves(s), 0);
});

test('repeats variant: repeated guesses and secrets are legal and scored', () => {
  const s = ready({ len: 4, rep: true }, '1112', '0000');
  assert.deepEqual(BC.guess(s, '0000'), { g: '0000', b: 4, c: 0 });
  assert.ok(BC.lastChance(s));
  assert.deepEqual(BC.guess(s, '2223'), { g: '2223', b: 0, c: 1 });
  assert.equal(s.winner, 0);
  assert.ok(!BC.lastChance(s), 'no last chance once the game is over');
});

test('normal and hard AI never repeat a guess', () => {
  for (const level of ['normal', 'hard']) {
    for (let k = 0; k < 4; k++) {
      const s = BC.create({ len: 4 });
      BC.setSecret(s, 0, BC.randomCode(4, false));
      BC.setSecret(s, 1, BC.randomCode(4, false));
      const seen = new Set();
      for (;;) {
        s.turn = 0;
        const g = BC.aiGuess(s, level);
        assert.ok(!seen.has(g), `${level} repeated ${g}`);
        seen.add(g);
        if (BC.guess(s, g).b === 4) break;
        s.guesses[1].length = 0;
      }
    }
  }
});

test('candidates always contain the real secret', () => {
  for (let k = 0; k < 20; k++) {
    const secret = BC.randomCode(4, k % 2 === 1);
    const clues = Array.from({ length: 3 }, () => {
      const g = BC.randomCode(4, k % 2 === 1);
      const [b, c] = BC.score(secret, g);
      return { g, b, c };
    });
    assert.ok(BC.candidates(4, k % 2 === 1, clues).includes(secret));
  }
});

test('stronger levels beat weaker ones head to head', () => {
  const match = (a, b, first) => {
    const s = BC.create({ len: 4, first });
    BC.setSecret(s, 0, BC.randomCode(4, false));
    BC.setSecret(s, 1, BC.randomCode(4, false));
    while (s.phase === 'play') BC.guess(s, BC.aiGuess(s, s.turn === 0 ? a : b));
    return s.winner;
  };
  let w = 0, l = 0;
  for (let i = 0; i < 60; i++) { const r = match('normal', 'easy', i % 2); if (r === 0) w++; if (r === 1) l++; }
  assert.ok(w > l * 1.5, `normal ${w} vs easy ${l}`);
});
