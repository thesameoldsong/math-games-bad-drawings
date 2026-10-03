import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BR } from './engine.js';

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

const idx = (cat, ...names) => names.map((n) => cat.items.findIndex((it) => it[1] === n));

test('question bank: every topic has 5–8 distinct values and both languages', () => {
  const ids = new Set();
  for (const c of BR.CATS) {
    assert.ok(!ids.has(c.id), 'duplicate id ' + c.id); ids.add(c.id);
    assert.ok(c.items.length >= 5 && c.items.length <= 8, c.id);
    assert.equal(new Set(c.items.map((x) => x[2])).size, c.items.length, c.id + ' has a tie');
    for (const k of ['ru', 'en']) assert.ok(c.t[k] && c.s[k] && typeof c.u[k] === 'string', c.id);
    for (const it of c.items) assert.ok(it[0] && it[1] && Number.isFinite(it[2]), c.id);
  }
  assert.ok(BR.CATS.length >= 20);
});

test('check: decreasing list is correct, any rise breaks rank', () => {
  const c = BR.CAT.continents;
  assert.deepEqual(BR.check(c, idx(c, 'Asia', 'Europe')), { ok: true, bad: [] });
  assert.equal(BR.check(c, idx(c, 'Antarctica')).ok, true);
  const r = BR.check(c, idx(c, 'Asia', 'Africa', 'North America', 'Antarctica', 'South America', 'Australia'));
  assert.deepEqual(r, { ok: false, bad: [4] });
  const y = BR.CAT.landmarks; // years: newest first
  assert.equal(BR.check(y, idx(y, 'Eiffel Tower', 'Colosseum', 'Great Pyramid of Giza')).ok, true);
  assert.equal(BR.check(y, idx(y, 'Great Pyramid of Giza', 'Colosseum')).ok, false);
});

test('scoring: guesser gets one point per item, or the judge gets one', () => {
  const s = BR.create({ rounds: 1, seed: 42 });
  assert.equal(s.phase, 'pick');
  assert.equal(s.offer.length, 3);
  assert.ok(BR.apply(s, { type: 'pick', cat: s.offer[0] }));
  const cat = BR.cat(s), truth = BR.truth(cat);
  assert.ok(BR.apply(s, { type: 'submit', list: truth.slice(0, 3) }));
  assert.deepEqual(s.score, [3, 0]);
  assert.equal(s.phase, 'reveal');
  assert.ok(BR.apply(s, { type: 'next' }));
  assert.equal(BR.guesser(s), 1);
  BR.apply(s, { type: 'pick', cat: s.offer[1] });
  const t2 = BR.truth(BR.cat(s));
  BR.apply(s, { type: 'submit', list: [t2[2], t2[0]] });
  assert.deepEqual(s.score, [4, 0]);
  assert.equal(s.last.ok, false);
  BR.apply(s, { type: 'next' });
  assert.ok(BR.isOver(s));
  assert.equal(BR.winner(s), 0);
});

test('illegal moves are rejected', () => {
  const s = BR.create({ seed: 1 });
  assert.equal(BR.apply(s, { type: 'submit', list: [0] }), false);
  assert.equal(BR.apply(s, { type: 'pick', cat: 'nope' }), false);
  assert.equal(BR.apply(s, { type: 'next' }), false);
  BR.apply(s, { type: 'pick', cat: s.offer[2] });
  assert.equal(BR.apply(s, { type: 'submit', list: [] }), false);
  assert.equal(BR.apply(s, { type: 'submit', list: [0, 0] }), false);
  assert.equal(BR.apply(s, { type: 'submit', list: [99] }), false);
  assert.equal(BR.apply(s, { type: 'pick', cat: s.offer[0] }), false);
});

test('same seed + same moves → same state (online sync)', () => {
  const a = BR.create({ seed: 777 }), b = BR.clone(a);
  for (const s of [a, b]) {
    BR.apply(s, { type: 'pick', cat: s.offer[1] });
    BR.apply(s, { type: 'submit', list: [s.order[0]] });
    BR.apply(s, { type: 'next' });
  }
  assert.deepEqual(a, b);
});

test('topics are not repeated within a game; random-topic mode skips picking', () => {
  const s = BR.create({ rounds: 5, choose: false, seed: 9 });
  while (!BR.isOver(s)) {
    assert.equal(s.phase, 'guess');
    assert.ok(!s.used.includes(s.cat));
    BR.apply(s, { type: 'submit', list: [s.order[0]] });
    BR.apply(s, { type: 'next' });
  }
  assert.equal(new Set(s.used).size, 10);
});

test('AI only makes legal moves and full AI-vs-AI games terminate', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    for (let g = 0; g < 30; g++) {
      const r = BR.rng(g + 1);
      const s = BR.create({ rounds: 5, seed: g * 31 + 5, starter: g % 2 });
      let steps = 0;
      while (!BR.isOver(s) && steps++ < 100) {
        const m = s.phase === 'pick' ? BR.aiPick(s, level, r) : s.phase === 'guess' ? BR.aiGuess(s, level, r) : { type: 'next' };
        assert.ok(BR.legal(s, m), JSON.stringify(m));
        BR.apply(s, m);
      }
      assert.ok(BR.isOver(s));
    }
  }
});

test('hard AI scores more than easy AI on average', () => {
  const avg = (level) => {
    let total = 0, N = 300;
    const r = BR.rng(level.length * 99);
    for (let g = 0; g < N; g++) {
      const s = BR.create({ seed: g + 1000 });
      BR.apply(s, { type: 'pick', cat: s.offer[0] });
      const m = BR.aiGuess(s, level, r);
      BR.apply(s, m);
      total += s.score[0];
    }
    return total / N;
  };
  const e = avg('easy'), n = avg('normal'), h = avg('hard');
  assert.ok(h > n && n > e, `easy ${e} normal ${n} hard ${h}`);
});

test('hard judge picks the hardest offered topic', () => {
  const s = BR.create({ seed: 3 });
  const m = BR.aiPick(s, 'hard');
  const d = s.offer.map((id) => BR.difficulty(BR.CAT[id]));
  assert.equal(BR.difficulty(BR.CAT[m.cat]), Math.max(...d));
});

test('only neighbours are compared; a wrong list gives the judge exactly 1 point', () => {
  const c = BR.CAT.continents;
  // Asia, Antarctica, Africa: Africa is bigger than Antarctica right above it → position 2 is the break
  assert.deepEqual(BR.check(c, idx(c, 'Asia', 'Antarctica', 'Africa')), { ok: false, bad: [2] });
  // Fully reversed list breaks at every step, but the judge still scores just 1
  const s = BR.create({ rounds: 1, seed: 5, choose: false });
  const rev = BR.truth(BR.cat(s)).reverse();
  BR.apply(s, { type: 'submit', list: rev });
  assert.equal(s.last.bad.length, rev.length - 1);
  assert.deepEqual(s.score[BR.guesser(s)], 0);
  assert.deepEqual(s.score[BR.judge(s)], 1);
  // The full correct ranking scores every item
  const s2 = BR.create({ rounds: 1, seed: 6, choose: false });
  const all = BR.truth(BR.cat(s2));
  BR.apply(s2, { type: 'submit', list: all });
  assert.equal(s2.score[BR.guesser(s2)], all.length);
});

test('malformed moves and moves after the end are rejected; ties are ties', () => {
  const s = BR.create({ rounds: 1, seed: 11, choose: false });
  for (const list of [null, 'x', [1.5], ['0'], [-1]]) assert.equal(BR.legal(s, { type: 'submit', list }), false);
  assert.equal(BR.legal(s, null), false);
  assert.equal(BR.legal(s, { type: 'bogus' }), false);
  const g = BR.guesser(s);
  BR.apply(s, { type: 'submit', list: [BR.truth(BR.cat(s))[0]] });
  assert.equal(BR.apply(s, { type: 'submit', list: [0] }), false);
  BR.apply(s, { type: 'next' });
  BR.apply(s, { type: 'submit', list: [BR.truth(BR.cat(s))[0]] });
  BR.apply(s, { type: 'next' });
  assert.ok(BR.isOver(s));
  assert.equal(BR.guesser({ ...s, t: 0 }), g);
  assert.deepEqual(s.score, [1, 1]);
  assert.equal(BR.winner(s), -1);
  for (const m of [{ type: 'next' }, { type: 'pick', cat: 'continents' }, { type: 'submit', list: [0] }]) assert.equal(BR.apply(s, m), false);
});

test('more turns than topics: offers fall back to the full bank instead of breaking', () => {
  const s = BR.create({ rounds: 20, seed: 4 });
  while (!BR.isOver(s)) {
    assert.equal(s.offer.length, 3);
    BR.apply(s, { type: 'pick', cat: s.offer[0] });
    BR.apply(s, { type: 'submit', list: [s.order[0]] });
    BR.apply(s, { type: 'next' });
  }
  assert.equal(s.used.length, 40);
});

test('AI guesses are legal and non-empty on every topic at every level', () => {
  const r = BR.rng(123);
  for (const level of ['easy', 'normal', 'hard']) for (const c of BR.CATS) for (let k = 0; k < 5; k++) {
    const s = BR.create({ seed: k + 1 });
    s.offer = [c.id];
    BR.apply(s, { type: 'pick', cat: c.id });
    const m = BR.aiGuess(s, level, r);
    assert.ok(m.list.length >= 1 && BR.legal(s, m), `${level} ${c.id}`);
  }
});

// A player with no knowledge at all: random topic, random items, random length 1–3.
function randomMove(s, r) {
  if (s.phase === 'pick') return { type: 'pick', cat: s.offer[Math.floor(r() * s.offer.length)] };
  const items = s.order.slice().sort(() => r() - 0.5);
  return { type: 'submit', list: items.slice(0, 1 + Math.floor(r() * 3)) };
}
function match(level, games = 300) {
  let wins = 0, losses = 0;
  for (let g = 0; g < games; g++) {
    const r = BR.rng(g * 7 + 3), ai = g % 2;
    const s = BR.create({ seed: g + 500, starter: g % 2 });
    while (!BR.isOver(s)) {
      if (s.phase === 'reveal') { BR.apply(s, { type: 'next' }); continue; }
      const who = s.phase === 'pick' ? BR.judge(s) : BR.guesser(s);
      const m = who === ai ? (s.phase === 'pick' ? BR.aiPick(s, level, r) : BR.aiGuess(s, level, r)) : randomMove(s, r);
      assert.ok(BR.apply(s, m));
    }
    const w = BR.winner(s);
    if (w === ai) wins++; else if (w === 1 - ai) losses++;
  }
  return { wins, losses };
}

test('every AI level beats a random player; normal and hard clearly', () => {
  const n = match('normal'), h = match('hard'), e = match('easy');
  assert.ok(n.wins > 0.8 * 300, 'normal ' + JSON.stringify(n));
  assert.ok(h.wins > 0.9 * 300, 'hard ' + JSON.stringify(h));
  assert.ok(e.wins > e.losses, 'easy ' + JSON.stringify(e));
});
