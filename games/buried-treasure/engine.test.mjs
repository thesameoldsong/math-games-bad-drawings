import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BT } from './engine.js';

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

// deterministic RNG for reproducible tests
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const fixed = () => ({
  size: 9, first: 0, turn: 0, phase: 'ask', winner: -1,
  hands: [['A', 'B', 'C', 'D', '1', '2', '3', '4'], ['E', 'F', 'G', 'H', '5', '6', '7', '8']],
  treasure: ['I', '9'], log: [],
});

test('deal: every card used exactly once, treasure is the leftover', () => {
  for (const size of [7, 9, 11]) {
    const s = BT.create({ size }, rng(size));
    const all = [...s.hands[0], ...s.hands[1], ...s.treasure].sort();
    assert.deepEqual(all, [...BT.letters(size), ...BT.numbers(size)].sort());
    const k = (size - 1) / 2;
    for (const h of s.hands) {
      assert.equal(h.filter(BT.isLetter).length, k);
      assert.equal(h.filter((c) => !BT.isLetter(c)).length, k);
    }
  }
});

test('ask answers truthfully and moves to the dig phase', () => {
  const s = fixed();
  assert.equal(BT.dig(s, 'A', '1'), null, 'cannot dig before asking');
  assert.equal(BT.ask(s, 'E').yes, true);
  assert.equal(s.phase, 'dig');
  assert.equal(BT.ask(s, 'F'), null, 'only one question per turn');
});

test('dig outcomes: opponent card, own bluff, treasure', () => {
  const s = fixed();
  BT.ask(s, 'A'); // bluff question about own card
  assert.equal(s.log[0].yes, false);
  assert.equal(BT.dig(s, 'I', '5').r, 'opp');
  assert.equal(s.turn, 1);
  BT.ask(s, 'Z'); assert.equal(s.phase, 'ask', 'invalid card ignored');
  BT.ask(s, '1');
  assert.equal(BT.dig(s, 'I', '5').r, 'self', 'red holds 5, blue holds neither');
  BT.ask(s, '9');
  assert.equal(BT.dig(s, 'I', '9').r, 'win');
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 0);
  assert.equal(BT.ask(s, 'A'), null);
});

test('view hides the opponent hand and the treasure until the end', () => {
  const s = fixed();
  const v = BT.view(s, 1);
  assert.equal(v.hands[0], null);
  assert.equal(v.treasure, null);
  assert.deepEqual(v.hands[1], s.hands[1]);
  BT.ask(s, '1'); BT.dig(s, 'I', '9');
  assert.deepEqual(BT.view(s, 1).treasure, ['I', '9']);
});

test('deduction: "no" about a card you lack pins the treasure coordinate', () => {
  const s = fixed();
  assert.equal(BT.candidates(9, s.hands[0], s.log, 0).length, 25);
  BT.ask(s, 'I');
  const k = BT.knowledge(9, s.hands[0], s.log, 0);
  assert.equal(k.I, 'gold');
  assert.equal(k.E, 'opp');
  assert.equal(k.A, 'mine');
  assert.equal(BT.candidates(9, s.hands[0], s.log, 0).length, 5);
  // the opponent learns nothing hard from the question alone
  assert.equal(BT.candidates(9, s.hands[1], s.log, 1).length, 25);
});

test('deduction: dig with an own card works as a second question', () => {
  const s = fixed();
  BT.ask(s, 'E');           // yes
  BT.dig(s, 'A', '9');      // red holds neither → blue: "actually nothing" → blue learns 9 is the treasure number
  assert.equal(s.log[1].r, 'self');
  const k = BT.knowledge(9, s.hands[0], s.log, 0);
  assert.equal(k['9'], 'gold');
  assert.equal(k.E, 'opp');
  // red learns blue holds A or 9: the cell A9 is no longer a candidate for red
  const cr = BT.candidates(9, s.hands[1], s.log, 1);
  assert.ok(!cr.some(([l, n]) => l === 'A' && n === '9'));
  assert.equal(cr.length, 24);
});

test('simple notes only use direct answers', () => {
  const s = fixed();
  BT.ask(s, 'E'); BT.dig(s, 'A', '9');
  const k = BT.knowledge(9, s.hands[0], s.log, 0, false);
  assert.equal(k.E, 'opp');
  assert.equal(k['9'], '?');
});

test('the true treasure is always among the candidates', () => {
  const r = rng(7);
  for (let g = 0; g < 30; g++) {
    const s = BT.create({ size: 9 }, r);
    for (let i = 0; i < 40 && s.phase !== 'over'; i++) {
      BT.apply(s, BT.aiMove(BT.view(s, s.turn), ['easy', 'normal', 'hard'][g % 3], r));
      for (const p of [0, 1]) {
        const c = BT.candidates(9, s.hands[p], s.log, p);
        assert.ok(c.some(([l, n]) => l === s.treasure[0] && n === s.treasure[1]));
      }
    }
  }
});

test('AI moves are always legal and every AI game ends', () => {
  const r = rng(3);
  const levels = ['easy', 'normal', 'hard'];
  for (const size of [7, 9, 11]) for (const a of levels) for (const b of levels) {
    const s = BT.create({ size, first: (size + a.length) % 2 }, r);
    let moves = 0;
    while (s.phase !== 'over') {
      const m = BT.aiMove(BT.view(s, s.turn), s.turn === 0 ? a : b, r);
      assert.ok(BT.apply(s, m), `illegal move ${JSON.stringify(m)}`);
      assert.ok(++moves < 400, `game too long: ${a} vs ${b}`);
    }
    assert.ok(s.winner === 0 || s.winner === 1);
  }
});

test('normal AI finds the treasure quickly on its own', () => {
  const r = rng(11);
  let total = 0;
  for (let g = 0; g < 40; g++) {
    const s = BT.create({ size: 9 }, r);
    // opponent does nothing useful: always asks/digs the same own-card spot
    let turns = 0;
    while (s.phase !== 'over') {
      if (s.turn === 0) { BT.apply(s, BT.aiMove(BT.view(s, 0), 'normal', r)); if (s.phase === 'ask' || s.phase === 'over') turns++; }
      else { BT.ask(s, s.hands[1][0]); BT.dig(s, s.hands[1][0], s.hands[1][4]); }
    }
    assert.equal(s.winner, 0);
    total += turns;
  }
  assert.ok(total / 40 <= 5, `average ${total / 40} turns`);
});

test('stronger levels beat weaker ones most of the time', () => {
  const r = rng(5);
  const match = (a, b, games) => {
    let wins = 0;
    for (let g = 0; g < games; g++) {
      const s = BT.create({ size: 9, first: g % 2 }, r);
      while (s.phase !== 'over') BT.apply(s, BT.aiMove(BT.view(s, s.turn), s.turn === 0 ? a : b, r));
      if (s.winner === 0) wins++;
    }
    return wins / games;
  };
  const ne = match('normal', 'easy', 200), hn = match('hard', 'normal', 800);
  assert.ok(ne > 0.65, `normal vs easy ${ne}`);
  assert.ok(hn > 0.51, `hard vs normal ${hn}`);
});

test('dig edge cases: opponent answers first, own-own square, off-map input', () => {
  const s = fixed();
  BT.ask(s, 'E');
  assert.equal(BT.dig(s, 'A', '5').r, 'opp', 'opponent holds 5, digger holds A: opponent says "no treasure"');
  BT.ask(s, 'A');
  assert.equal(BT.dig(s, 'E', '5').r, 'self', 'both coordinates are the digger\'s own');
  assert.equal(s.turn, 0);
  assert.equal(BT.ask(s, 'J'), null, 'J is off a 9×9 map');
  assert.equal(BT.ask(s, '10'), null);
  BT.ask(s, 'I');
  assert.equal(BT.dig(s, 'I', '10'), null);
  assert.equal(BT.dig(s, 'J', '9'), null);
  assert.equal(s.phase, 'dig', 'illegal digs change nothing');
  assert.equal(BT.apply(s, { t: 'dig', l: 'I', n: '9' }).r, 'win');
  assert.equal(BT.dig(s, 'I', '9'), null, 'no moves after the treasure is found');
  assert.deepEqual(BT.view(s, 1).hands[0], s.hands[0], 'everything is revealed at the end');
});

test('every AI level beats a random player clearly', () => {
  const r = rng(21);
  const randomMove = (v) => {
    const L = BT.letters(v.size), N = BT.numbers(v.size), p = (a) => a[Math.floor(r() * a.length)];
    return v.phase === 'ask' ? { t: 'ask', c: p([...L, ...N]) } : { t: 'dig', l: p(L), n: p(N) };
  };
  for (const level of ['easy', 'normal', 'hard']) {
    let wins = 0;
    for (let g = 0; g < 200; g++) {
      const s = BT.create({ size: 9, first: g % 2 }, r);
      while (s.phase !== 'over') BT.apply(s, s.turn === 0 ? BT.aiMove(BT.view(s, 0), level, r) : randomMove(BT.view(s, 1)));
      if (s.winner === 0) wins++;
    }
    assert.ok(wins / 200 > 0.85, `${level} vs random ${wins / 200}`);
  }
});
