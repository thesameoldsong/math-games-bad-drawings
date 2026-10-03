import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAN } from './engine.js';

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

const at = (s, r, c) => s.cells[r * s.n + c];

test('classic schedule: 7 plantings and 7 gusts, alternating, dandelions first', () => {
  const s = DAN.create(5);
  assert.equal(s.sched, 'PWPWPWPWPWPWPW');
  assert.equal(DAN.turn(s), 0);
  const d = DAN.create(5, 'double');
  assert.equal(d.sched.length, 14);
  assert.equal([...d.sched].filter((x) => x === 'P').length, 7);
  assert.ok(d.sched.startsWith('PPW') && d.sched.endsWith('PWW'));
});

test('a gust carries seeds from every flower all the way to the edge', () => {
  const s = DAN.create(5);
  DAN.apply(s, { t: 'p', i: 1 * 5 + 2 });
  const seeds = DAN.apply(s, { t: 'w', d: 6 }); // west
  assert.deepEqual(seeds.sort(), [5, 6]);
  assert.equal(at(s, 1, 1), 1); assert.equal(at(s, 1, 0), 1);
  DAN.apply(s, { t: 'p', i: 3 * 5 + 3 });
  DAN.apply(s, { t: 'w', d: 5 }); // south-west
  // from (1,2): (2,1),(3,0); from (3,3): (4,2)
  for (const [r, c] of [[2, 1], [3, 0], [4, 2]]) assert.equal(at(s, r, c), 1, `${r},${c}`);
  assert.equal(DAN.emptyCount(s), 25 - 2 - 5);
});

test('seeds pass over flowers and seeds; seeds themselves never spread', () => {
  const s = DAN.create(5);
  DAN.apply(s, { t: 'p', i: 0 });
  DAN.apply(s, { t: 'w', d: 2 }); // east: whole top row
  DAN.apply(s, { t: 'p', i: 2 }); // plant on a seed
  assert.equal(at(s, 0, 2), 2);
  const seeds = DAN.apply(s, { t: 'w', d: 4 }); // south from both flowers only
  assert.deepEqual(seeds.sort((a, b) => a - b), [5, 7, 10, 12, 15, 17, 20, 22]);
  assert.equal(at(s, 1, 1), 0);
});

test('illegal moves are rejected', () => {
  const s = DAN.create(5);
  assert.throws(() => DAN.apply(s, { t: 'w', d: 0 })); // wind out of turn
  DAN.apply(s, { t: 'p', i: 7 });
  assert.throws(() => DAN.apply(s, { t: 'p', i: 3 }));
  DAN.apply(s, { t: 'w', d: 0 });
  assert.throws(() => DAN.apply(s, { t: 'p', i: 7 })); // on a flower
  DAN.apply(s, { t: 'p', i: 8 });
  assert.throws(() => DAN.apply(s, { t: 'w', d: 0 })); // direction already used
  assert.equal(DAN.isLegal(s, { t: 'w', d: 9 }), false);
});

test('game ends after the 7th gust; full meadow → dandelions, any gap → wind', () => {
  const s = DAN.create(5);
  for (let k = 0; k < 7; k++) { DAN.apply(s, { t: 'p', i: k }); DAN.apply(s, { t: 'w', d: k }); }
  assert.ok(DAN.isOver(s));
  assert.equal(DAN.turn(s), -1);
  assert.equal(DAN.legalMoves(s).length, 0);
  assert.equal(DAN.winner(s), DAN.emptyCount(s) ? 1 : 0);
  assert.equal(DAN.unused(s).length, 1);

  // A known dandelion win: diagonal-ish plantings that the wind can't escape.
  const w = DAN.create(3);
  w.cells.fill(1); w.cells[4] = 0;
  w.step = w.sched.length;
  assert.equal(DAN.winner(w), 1);
  w.cells[4] = 2;
  assert.equal(DAN.winner(w), 0);
});

test('guaranteed cells: reached by two unused directions', () => {
  const s = DAN.create(5);
  DAN.apply(s, { t: 'p', i: 0 });      // (0,0)
  DAN.apply(s, { t: 'w', d: 0 });      // north: nothing
  DAN.apply(s, { t: 'p', i: 4 });      // (0,4)
  const g = DAN.guaranteed(s);
  // (0,1..3) is east of (0,0) and west of (0,4) → two directions → guaranteed
  for (const i of [1, 2, 3]) assert.ok(g.includes(i), 'cell ' + i);
  // (1,1) is only reached by SE from (0,0) and... SW from (0,4) reaches (1,3),(2,2) → (2,2) guaranteed, (1,1) not
  assert.ok(g.includes(12));
  assert.ok(!g.includes(6));
});

test('AI never makes illegal moves and games terminate (all levels, sizes, variants)', () => {
  for (const n of DAN.SIZES) for (const variant of ['classic', 'double']) for (const lv of ['easy', 'normal', 'hard']) {
    const s = DAN.create(n, variant);
    let guard = 0;
    while (!DAN.isOver(s)) {
      const m = DAN.aiMove(s, lv);
      assert.ok(DAN.isLegal(s, m), JSON.stringify(m));
      DAN.apply(s, m);
      assert.ok(++guard <= 14);
    }
    assert.ok([0, 1].includes(DAN.winner(s)));
  }
});

test('smarter wind beats a careless gardener; smarter gardener beats a careless wind', () => {
  let windWins = 0, dWins = 0;
  // measured over 200 games: hard wind ≈78% vs easy dandelions, hard dandelions ≈98% vs easy wind
  for (let g = 0; g < 30; g++) {
    const a = DAN.create(5);
    while (!DAN.isOver(a)) DAN.apply(a, DAN.aiMove(a, DAN.turn(a) === 0 ? 'easy' : 'hard'));
    if (DAN.winner(a) === 1) windWins++;
    const b = DAN.create(5);
    while (!DAN.isOver(b)) DAN.apply(b, DAN.aiMove(b, DAN.turn(b) === 0 ? 'hard' : 'easy'));
    if (DAN.winner(b) === 0) dWins++;
  }
  assert.ok(windWins >= 15, `hard wind won ${windWins}/30`);
  assert.ok(dWins >= 25, `hard dandelions won ${dWins}/30`);
});

test('balance variant: exact turn order, two gusts in a row end the game', () => {
  const s = DAN.create(5, 'double');
  assert.equal(s.sched, 'PPWPWPWPWPWPWW');
  const roles = [];
  let k = 0, d = 0;
  while (!DAN.isOver(s)) {
    const tn = DAN.turn(s); roles.push(tn);
    DAN.apply(s, tn === 0 ? { t: 'p', i: k++ } : { t: 'w', d: d++ });
  }
  assert.deepEqual(roles.slice(0, 3), [0, 0, 1]);
  assert.deepEqual(roles.slice(-3), [0, 1, 1]);
  assert.equal(s.flowers.length, 7);
  assert.equal(s.used.length, 7);
  assert.equal(DAN.unused(s).length, 1);
});

test('rejected moves leave the state untouched; winner is undecided mid-game', () => {
  const s = DAN.create(5);
  DAN.apply(s, { t: 'p', i: 12 });
  const snap = JSON.stringify(s);
  for (const m of [null, { t: 'p', i: 3 }, { t: 'w', d: -1 }, { t: 'w', d: 1.5 }, { t: 'w', d: '2' }, { t: 'x' }]) {
    assert.throws(() => DAN.apply(s, m));
  }
  assert.equal(JSON.stringify(s), snap);
  assert.equal(DAN.winner(s), -1);
  assert.equal(DAN.isLegal(s, { t: 'p', i: 25 }), false);
});

test('a flower planted on a seed spreads on later gusts; corners blow nothing outward', () => {
  const s = DAN.create(5);
  DAN.apply(s, { t: 'p', i: 0 });
  assert.deepEqual(DAN.apply(s, { t: 'w', d: 0 }), []); // north from the top-left corner: off the board
  DAN.apply(s, { t: 'p', i: 24 });
  DAN.apply(s, { t: 'w', d: 3 }); // SE: main diagonal from (0,0); nothing from (4,4)
  for (const i of [6, 12, 18]) assert.equal(s.cells[i], 1);
  DAN.apply(s, { t: 'p', i: 12 }); // on the seed
  assert.equal(s.cells[12], 2);
  const seeds = DAN.apply(s, { t: 'w', d: 2 }); // east: row 0 from (0,0), row 2 from (2,2)
  assert.deepEqual(seeds.sort((a, b) => a - b), [1, 2, 3, 4, 13, 14]);
  // a cell already seeded is not reported again
  assert.deepEqual(DAN.gustSeeds(s, 2), []);
});

test('legal moves: every non-flower square for planting, every unused direction for the wind', () => {
  const s = DAN.create(6);
  assert.equal(DAN.legalMoves(s).length, 36);
  DAN.apply(s, { t: 'p', i: 0 });
  assert.equal(DAN.legalMoves(s).length, 8);
  DAN.apply(s, { t: 'w', d: 2 });
  assert.equal(DAN.legalMoves(s).length, 35); // seeds may be planted on
  DAN.apply(s, { t: 'p', i: 1 });
  assert.deepEqual(DAN.legalMoves(s).map((m) => m.d), [0, 1, 3, 4, 5, 6, 7]);
});

test('computer beats random play clearly in both roles', () => {
  const rnd = (s) => { const m = DAN.legalMoves(s); return m[Math.floor(Math.random() * m.length)]; };
  const play = (n, dP, wP) => {
    const s = DAN.create(n);
    while (!DAN.isOver(s)) { const p = DAN.turn(s) === 0 ? dP : wP; DAN.apply(s, p ? DAN.aiMove(s, p) : rnd(s)); }
    return DAN.winner(s);
  };
  let d = 0, w = 0, base = 0;
  for (let g = 0; g < 20; g++) {
    if (play(5, 'normal', null) === 0) d++;
    if (play(6, null, 'normal') === 1) w++;
    if (play(5, null, null) === 0) base++;
  }
  // random vs random on 5×5: dandelions win roughly 1 game in 5
  assert.ok(d >= 15 && d > base + 5, `normal dandelions beat random wind ${d}/20 (random baseline ${base}/20)`);
  assert.ok(w >= 19, `normal wind beat random dandelions ${w}/20 on 6×6`);
});
