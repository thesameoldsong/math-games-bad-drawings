import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAM } from './engine.js';

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

// Rigs a fresh round with chosen cards (players are guests 0 and 1).
function rig(cards, opts = {}) {
  const s = LAM.create({ guests: 16, rounds: 1, seed: 7, ...opts });
  s.card = cards.concat(Array.from({ length: s.n - cards.length }, (_, i) => 100 + i * 10));
  s.known = s.card.map((_, g) => g < 2);
  return s;
}

test('deal: unique cards from 1..n+10, track rows by the book', () => {
  for (const n of LAM.SIZES) {
    const s = LAM.create({ guests: n, seed: n });
    assert.equal(new Set(s.card).size, n);
    assert.ok(s.card.every((c) => c >= 1 && c <= n + 10));
    assert.equal(s.labels.length, n / 2);
    assert.equal(s.labels[0], 100);
    assert.equal(s.labels[1], n <= 20 ? 90 : 95);
    assert.deepEqual(s.known.filter(Boolean).length, 2);
  }
});

test('scoring: row / difference, +5 for the lower card', () => {
  const s = rig([13, 15]);
  s.target[1] = 0;                 // red already proposes to blue
  const ev = LAM.apply(s, { t: 'propose', g: 1 });
  assert.ok(ev.some((e) => e.t === 'marry' && e.row === 0));
  assert.equal(s.score[0], 100 / 2 + 5);
  assert.equal(s.score[1], 100 / 2);
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.totals, [55, 50]);
});

test('hidden cards cannot be proposed to, only asked', () => {
  const s = rig([5, 9]);
  assert.equal(LAM.isLegal(s, { t: 'propose', g: 3 }), false);
  assert.equal(LAM.isLegal(s, { t: 'ask', g: 3 }), true);
  assert.equal(LAM.isLegal(s, { t: 'ask', g: 1 }), false);
  LAM.apply(s, { t: 'ask', g: 3 });
  assert.equal(s.known[3], true);
  assert.equal(LAM.isLegal(s, { t: 'propose', g: s.turn === 0 ? 1 : 0 }), true);
});

test('a refused proposal stays open, and the crowd accepts eventually', () => {
  const s = rig([10, 40, 14]);     // guest 2 holds 14: four away from blue
  s.known[2] = true;
  s.pick[2] = 0.85;
  s.turn = 0; s.first = 0; s.step = 0;
  const ev = LAM.apply(s, { t: 'propose', g: 2 });
  assert.ok(ev.some((e) => e.t === 'refuse'));
  assert.equal(s.target[0], 2);
  let married = false;
  for (let i = 0; i < 40 && s.phase === 'play'; i++) {
    LAM.apply(s, { t: 'wait' });
    if (s.partner[0] === 2) { married = true; break; }
  }
  assert.ok(married || s.partner[2] >= 2, 'guest 14 married blue or somebody else');
});

test('marriages fill rows top-down and the round ends at the clock', () => {
  const s = LAM.create({ guests: 16, rounds: 2, seed: 3 });
  while (s.phase === 'play') LAM.apply(s, { t: 'wait' });
  assert.equal(s.phase, 'roundEnd');
  assert.equal(s.beat, s.T);
  assert.deepEqual(s.totals, [0, 0]);
  s.track.forEach(([a, b], i) => { assert.equal(s.row[a], i); assert.equal(s.partner[a], b); });
  LAM.apply(s, { t: 'next' });
  assert.equal(s.round, 2);
  assert.equal(s.track.length, 0);
});

test('redacted state hides unknown cards and the seed', () => {
  const s = LAM.create({ seed: 11 });
  const r = LAM.redact(s);
  for (let g = 0; g < s.n; g++) assert.equal(r.card[g], s.known[g] ? s.card[g] : 0);
  assert.equal(r.rs, 0);
});

test('AI only makes legal moves and full AI games terminate', () => {
  for (const n of LAM.SIZES) for (const [a, b] of [['easy', 'normal'], ['normal', 'normal'], ['easy', 'easy']]) {
    for (let seed = 0; seed < 15; seed++) {
      const s = LAM.create({ guests: n, rounds: 3, seed });
      let steps = 0;
      while (s.phase !== 'over') {
        const lv = s.turn === 1 ? b : a;
        const m = LAM.aiAction(s, lv);
        assert.ok(LAM.isLegal(s, m), JSON.stringify(m));
        LAM.apply(s, m);
        assert.ok(++steps < 500);
      }
      assert.equal(s.history.length, 3);
    }
  }
});

test('normal AI outscores easy AI on average', () => {
  const tot = [0, 0];
  for (let seed = 0; seed < 120; seed++) {
    const s = LAM.create({ guests: 16, rounds: 1, seed });
    const lv = seed % 2 ? ['normal', 'easy'] : ['easy', 'normal'];
    while (s.phase !== 'over') LAM.apply(s, LAM.aiAction(s, lv[s.turn]));
    tot[lv[0] === 'normal' ? 0 : 1] += s.totals[0];
    tot[lv[1] === 'normal' ? 0 : 1] += s.totals[1];
  }
  assert.ok(tot[0] > tot[1] * 1.15, `normal ${tot[0]} vs easy ${tot[1]}`);
});

test('players can marry each other only when the other one already proposes', () => {
  const s = rig([20, 21]);
  s.turn = 0; s.first = 0; s.step = 0;
  LAM.apply(s, { t: 'propose', g: 1 });          // red has not proposed: no wedding yet
  assert.equal(s.partner[0], -1);
  assert.equal(s.target[0], 1);
  assert.equal(s.turn, 1);
  LAM.apply(s, { t: 'propose', g: 0 });          // red answers: instant wedding
  assert.equal(s.partner[0], 1);
  assert.equal(s.row[0], 0);
  assert.equal(s.score[0], 100 / 1 + 5);
  assert.equal(s.score[1], 100 / 1);
  assert.equal(s.phase, 'over');
});

test('answering a crowd suitor is an instant wedding', () => {
  const s = rig([10, 40, 30]);
  s.known[2] = true; s.target[2] = 0; s.pick[2] = 0.85;
  s.turn = 0; s.first = 0; s.step = 0;
  const ev = LAM.apply(s, { t: 'propose', g: 2 });   // difference 20, yet the suitor says yes
  assert.ok(ev.some((e) => e.t === 'marry' && e.a === 0 && e.b === 2));
  assert.equal(s.score[0], 100 / 20 + 5);
});

test('illegal actions are rejected', () => {
  const s = rig([10, 40]);
  s.turn = 0;
  for (const a of [null, { t: 'propose', g: 0 }, { t: 'propose', g: 99 }, { t: 'propose', g: -1 }, { t: 'ask', g: 0 },
    { t: 'ask', g: 1.5 }, { t: 'next' }, { t: 'fly' }]) assert.equal(LAM.isLegal(s, a), false, JSON.stringify(a));
  s.known[3] = true;
  assert.equal(LAM.isLegal(s, { t: 'ask', g: 3 }), false);
  s.partner[3] = 4; s.partner[4] = 3;
  assert.equal(LAM.isLegal(s, { t: 'propose', g: 3 }), false);
  assert.throws(() => LAM.apply(s, { t: 'propose', g: 3 }));
});

test('labels: 16/20 guests step 10, 24 guests step 5', () => {
  assert.deepEqual(LAM.labels(16), [100, 90, 80, 70, 60, 50, 40, 30]);
  assert.deepEqual(LAM.labels(20), [100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
  assert.deepEqual(LAM.labels(24), [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45]);
});

test('a single player at the end scores 0, a married one keeps the score; totals add up over rounds', () => {
  for (let seed = 0; seed < 40; seed++) {
    const s = LAM.create({ guests: 20, rounds: 3, seed });
    let sum = [0, 0];
    while (s.phase !== 'over') {
      if (s.phase === 'roundEnd') { LAM.apply(s, { t: 'next' }); continue; }
      LAM.apply(s, s.turn === 0 ? { t: 'wait' } : LAM.aiAction(s, 'normal'));
      if (s.phase !== 'play') {
        const h = s.history[s.history.length - 1];
        assert.equal(h.partners[0], s.partner[0] >= 0 ? s.card[s.partner[0]] : null);
        if (s.partner[0] < 0) assert.equal(h.score[0], 0);
        for (const p of [0, 1]) if (s.partner[p] >= 0) {
          const d = Math.abs(s.card[p] - s.card[s.partner[p]]);
          assert.equal(h.score[p], s.labels[s.row[p]] / d + (s.card[p] < s.card[s.partner[p]] ? 5 : 0));
        }
        sum = [sum[0] + h.score[0], sum[1] + h.score[1]];
        assert.ok(s.beat <= s.T);
        assert.ok(s.beat === s.T || [0, 1].every((p) => s.partner[p] >= 0 || LAM.singles(s, p).length === 0));
      }
    }
    assert.deepEqual(s.totals, sum);
  }
});

test('normal AI clearly beats random play', () => {
  let ai = 0, rnd = 0, wins = 0;
  for (let seed = 0; seed < 300; seed++) {
    const s = LAM.create({ guests: LAM.SIZES[seed % 3], rounds: 1, seed });
    const me = seed % 2;
    let k = seed;
    const pick = () => { k = (k * 1103515245 + 12345) % 2 ** 31; return k / 2 ** 31; };
    while (s.phase !== 'over') {
      const L = LAM.legal(s);
      LAM.apply(s, s.turn === me ? LAM.aiAction(s, 'normal') : L[Math.floor(pick() * L.length)]);
    }
    ai += s.totals[me]; rnd += s.totals[1 - me];
    if (s.totals[me] > s.totals[1 - me]) wins++;
  }
  assert.ok(ai > rnd * 2, `normal ${ai} vs random ${rnd}`);
  assert.ok(wins > 200, `wins ${wins}/300`);
});
