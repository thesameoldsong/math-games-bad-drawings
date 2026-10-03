import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QH } from './engine.js';
import { WORDS } from './words.js';

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

const seeded = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

test('word validation', () => {
  assert.equal(QH.checkWords(['skunk', 'apple']), null);
  assert.equal(QH.checkWords(['ёжик', 'утка']), null);
  assert.equal(QH.checkWords(['skunk', 'apples']), 'len');
  assert.equal(QH.checkWords(['skunk', 'skunk']), 'same');
  assert.equal(QH.checkWords(['skunk', 'яблок']), 'mixed');
  assert.equal(QH.checkWords(['sk1nk', 'apple']), 'chars');
  assert.equal(QH.checkWords(['ab', 'cd']), 'short');
  assert.equal(QH.checkWords(['', 'cd']), 'empty');
  assert.equal(QH.create(['ёжик', 'утка']).words[0], 'ЕЖИК');
});

test('book example: SKUNK / APPLE', () => {
  const s = QH.create(['skunk', 'apple']);
  assert.deepEqual(QH.guess(s, 'R'), { hit: false, blanks: 0, conflict: false });
  assert.equal(QH.guess(s, 'A').hit, true);
  QH.guess(s, 'N'); QH.guess(s, 'E');
  assert.deepEqual(QH.cells(s).map((c) => c.join('')), ['A', '', '', 'N', 'E']);
  assert.equal(QH.wrong(s).length, 1);
  const r = QH.guess(s, 'L');
  assert.equal(r.conflict, true);
  assert.equal(QH.status(s), 'conflict');
  assert.equal(QH.conflictPos(s), 3);
  assert.equal(QH.guess(s, 'K'), null, 'no guessing during a conflict');
  assert.equal(QH.resolve(s, 3, 'Z'), null);
  assert.equal(QH.resolve(s, 2, 'N'), null);
  const res = QH.resolve(s, 3, 'N');
  assert.deepEqual(res.eliminated, [1]);
  assert.equal(res.retro, 3); // A, E, L become wrong
  assert.deepEqual(QH.wrong(s).map((w) => w.c + (w.retro ? '*' : '')), ['R', 'A*', 'E*', 'L*']);
  assert.deepEqual(QH.cells(s).map((c) => c.join('')), ['', '', '', 'N', '']);
  assert.deepEqual(QH.ghosts(s).map((c) => c.join('')), ['A', '', '', 'L', 'E']);
  for (const c of 'SKU') QH.guess(s, c);
  assert.equal(QH.status(s), 'won');
  assert.equal(QH.fullWord(s), 0);
});

test('losing at eight wrong guesses, possibly retroactively', () => {
  const s = QH.create(['skunk', 'apple']);
  for (const c of 'RTIOH') QH.guess(s, c);
  for (const c of 'APE') QH.guess(s, c);
  assert.equal(QH.status(s), 'play');
  QH.guess(s, 'N'); // N lands on P? no: N at pos 3 vs L unguessed -> fine
  QH.guess(s, 'U'); // U at pos 2 vs P(guessed) -> conflict
  assert.equal(QH.status(s), 'conflict');
  QH.resolve(s, 2, 'U'); // APPLE dies: A, P, E retro-wrong -> 8 wrong
  assert.equal(QH.wrong(s).length, 8);
  assert.equal(QH.status(s), 'lost');
  assert.equal(QH.isOver(s), true);
});

test('a letter in both words at the same spot is not a conflict; win before collapse', () => {
  const s = QH.create(['cat', 'car']);
  QH.guess(s, 'C'); QH.guess(s, 'A');
  assert.equal(QH.status(s), 'play');
  QH.guess(s, 'T');
  assert.equal(QH.status(s), 'won'); // CAT fully shown, CAR still alive is fine
});

test('three words: two collapses', () => {
  const s = QH.create(['bat', 'cot', 'dog']);
  QH.guess(s, 'B'); QH.guess(s, 'C');
  assert.equal(QH.conflictPos(s), 0);
  QH.resolve(s, 0, 'C'); // BAT gone; DOG has D unrevealed so it survives
  assert.deepEqual(s.alive, [false, true, true]);
  QH.guess(s, 'D');
  assert.equal(QH.status(s), 'conflict');
  QH.resolve(s, 0, 'D');
  assert.deepEqual(s.alive, [false, false, true]);
  QH.guess(s, 'O'); QH.guess(s, 'G');
  assert.equal(QH.status(s), 'won');
});

test('view hides words unless revealed', () => {
  const s = QH.create(['skunk', 'apple']);
  QH.guess(s, 'K');
  const v = QH.view(s);
  assert.equal(v.words, undefined);
  assert.ok(!JSON.stringify(v).includes('SKUNK'));
  assert.deepEqual(QH.view(s, true).words, ['SKUNK', 'APPLE']);
});

test('word pools have enough words of each length', () => {
  for (const a of ['en', 'ru']) {
    for (const w of WORDS[a]) assert.ok(QH.alphaOf(w) === a, `${a}: ${w}`);
    for (let L = 4; L <= 7; L++) assert.ok(QH.pool(a, L).length >= 30, `${a} ${L}: ${QH.pool(a, L).length}`);
  }
});

test('AI guesser only makes legal moves and every game terminates', () => {
  const rnd = seeded(7);
  for (const level of ['easy', 'normal', 'hard']) for (const a of ['en', 'ru']) for (const n of [2, 3]) {
    for (let g = 0; g < 4; g++) {
      const s = QH.create(QH.aiWords(a, 4 + g, n, level, rnd));
      let steps = 0;
      while (!QH.isOver(s)) {
        const v = QH.view(s);
        if (v.status === 'conflict') {
          const r = QH.aiResolve(v, level, rnd);
          assert.ok(QH.resolve(s, r.pos, r.letter), 'legal resolve');
        } else {
          const c = QH.aiGuess(v, level, rnd);
          assert.ok(QH.canGuess(s, c), `legal guess ${c}`);
          QH.guess(s, c);
        }
        assert.ok(++steps < 80);
      }
    }
  }
});

test('AI copes with words outside its dictionary', () => {
  const s = QH.create(['xyzzy', 'qwrtp']);
  while (!QH.isOver(s)) assert.ok(QH.aiAct(s, 'hard'));
});

test('hard guesser beats easy guesser on dictionary words', () => {
  const rnd = seeded(3);
  const wins = { easy: 0, hard: 0 };
  for (let g = 0; g < 30; g++) {
    const ws = QH.randomWords('en', 5, 2, rnd);
    for (const level of ['easy', 'hard']) {
      const s = QH.create(ws);
      while (!QH.isOver(s)) QH.aiAct(s, level, rnd);
      if (QH.status(s) === 'won') wins[level]++;
    }
  }
  assert.ok(wins.hard > wins.easy + 5, JSON.stringify(wins));
});

test('several clashes from one guess are resolved one at a time', () => {
  // AB?? vs BA??: guessing A then B clashes in blanks 0 and 1 at once.
  const s = QH.create(['abcd', 'baef']);
  QH.guess(s, 'A');
  assert.equal(QH.status(s), 'play');
  assert.equal(QH.guess(s, 'B').conflict, true);
  assert.deepEqual(QH.cells(s).slice(0, 2).map((c) => c.length), [2, 2]);
  assert.equal(QH.conflictPos(s), 0);
  assert.equal(QH.resolve(s, 1, 'A'), null, 'only the first clash is open');
  assert.deepEqual(QH.resolve(s, 0, 'A').eliminated, [1]);
  assert.equal(QH.status(s), 'play', 'the second clash vanished with the eliminated word');
  assert.deepEqual(QH.cells(s).map((c) => c.join('')), ['A', 'B', '', '']);
});

test('three words: the surviving unrevealed word clashes later', () => {
  const s = QH.create(['cat', 'bat', 'rat']);
  for (const c of 'CB') QH.guess(s, c);
  assert.equal(QH.status(s), 'conflict');
  QH.resolve(s, 0, 'C'); // BAT out, RAT survives (R not revealed)
  assert.deepEqual(s.alive, [true, false, true]);
  QH.guess(s, 'R');
  assert.deepEqual(QH.cells(s)[0].sort(), ['C', 'R']);
  const r = QH.resolve(s, 0, 'R');
  assert.deepEqual(r.eliminated, [0]);
  assert.equal(r.retro, 1, 'C joins B among the misses');
  assert.deepEqual(QH.wrong(s).map((w) => w.c).sort(), ['B', 'C']);
  for (const c of 'AT') QH.guess(s, c);
  assert.equal(QH.status(s), 'won');
  // a third letter can never join a clash: guessing is blocked until it is resolved
  const u = QH.create(['cat', 'bat', 'rat']);
  for (const c of 'CB') QH.guess(u, c);
  assert.equal(QH.guess(u, 'R'), null);
});

test('a collapse can push misses past the limit; no moves after the end', () => {
  const s = QH.create(['abcde', 'fghij']);
  for (const c of 'KLMNOP') QH.guess(s, c); // P is not in either -> 6 misses
  for (const c of 'BCD') QH.guess(s, c);
  QH.guess(s, 'G'); // clash at blank 1
  assert.equal(QH.status(s), 'conflict');
  QH.resolve(s, 1, 'G'); // B, C, D become misses -> 9
  assert.equal(QH.wrong(s).length, 9);
  assert.equal(QH.status(s), 'lost');
  assert.equal(QH.guess(s, 'F'), null);
  assert.equal(QH.view(s).status, 'lost');
});

test('a miss and a later letter of the same word: the miss stays a plain miss', () => {
  const s = QH.create(['skunk', 'apple']);
  QH.guess(s, 'Z');
  assert.deepEqual(QH.wrong(s), [{ c: 'Z', retro: false }]);
  assert.equal(QH.canGuess(s, 'Z'), false, 'no repeated guesses');
  assert.equal(QH.canGuess(s, 'Я'), false, 'letters of the other alphabet are refused');
});

test('fuzz: random games stay consistent and AI moves are always legal', () => {
  const rnd = seeded(11);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  for (let g = 0; g < 200; g++) {
    const alpha = g % 2 ? 'ru' : 'en', n = 2 + (g % 3 === 0 ? 1 : 0), L = 3 + (g % 6);
    const letters = [...QH.ALPHA[alpha]].slice(0, 8 + (g % 10)); // small alphabets -> many clashes
    const ws = new Set();
    while (ws.size < n) ws.add(Array.from({ length: L }, () => pick(letters)).join(''));
    const s = QH.create([...ws]);
    const level = ['easy', 'normal', 'hard'][g % 3];
    let steps = 0;
    while (!QH.isOver(s)) {
      const before = QH.wrong(s).length, aliveBefore = s.alive.filter(Boolean).length;
      assert.ok(QH.aiAct(s, level, rnd), 'AI acted legally');
      assert.ok(QH.wrong(s).length >= before, 'misses never go down');
      assert.ok(s.alive.filter(Boolean).length >= 1, 'a word always survives');
      assert.ok(s.alive.filter(Boolean).length <= aliveBefore);
      assert.ok(++steps < 120);
    }
    const st = QH.status(s);
    if (st === 'won') assert.ok(QH.wrong(s).length < 8 && QH.fullWord(s) >= 0);
    else assert.ok(QH.wrong(s).length >= 8);
  }
});

test('normal guesser clearly beats a random guesser', () => {
  const rnd = seeded(5);
  const randomAct = (s) => {
    const v = QH.view(s);
    if (v.status === 'conflict') { const o = v.cells[v.conflict]; return QH.resolve(s, v.conflict, o[Math.floor(rnd() * o.length)]); }
    const open = [...QH.ALPHA[v.alpha]].filter((c) => !v.guessed.includes(c));
    return QH.guess(s, open[Math.floor(rnd() * open.length)]);
  };
  const wins = { random: 0, normal: 0 };
  for (let g = 0; g < 60; g++) {
    const ws = QH.randomWords(g % 2 ? 'ru' : 'en', 4 + (g % 4), 2, rnd);
    for (const who of ['random', 'normal']) {
      const s = QH.create(ws);
      while (!QH.isOver(s)) who === 'random' ? randomAct(s) : QH.aiAct(s, 'normal', rnd);
      if (QH.status(s) === 'won') wins[who]++;
    }
  }
  assert.ok(wins.normal > wins.random + 20, JSON.stringify(wins));
});
