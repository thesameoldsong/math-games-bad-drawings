import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BS } from './engine.js';

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

// seeded PRNG so the tests are deterministic
function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fleetA = () => [
  { r: 0, c: 0, len: 5, dir: 'h' }, { r: 2, c: 0, len: 4, dir: 'v' }, { r: 2, c: 2, len: 3, dir: 'h' },
  { r: 9, c: 7, len: 3, dir: 'h' }, { r: 5, c: 9, len: 2, dir: 'v' },
];
function started(opts = {}) {
  const st = BS.create(opts);
  assert.ok(BS.setFleet(st, 0, fleetA()));
  assert.ok(BS.setFleet(st, 1, fleetA()));
  return st;
}

test('fleet validation: lengths, bounds, overlaps', () => {
  assert.ok(BS.validFleet(fleetA()));
  const out = fleetA(); out[0] = { r: 0, c: 6, len: 5, dir: 'h' };
  assert.ok(!BS.validFleet(out), 'sticks out of the grid');
  const ov = fleetA(); ov[4] = { r: 0, c: 3, len: 2, dir: 'v' };
  assert.ok(!BS.validFleet(ov), 'overlaps the 5');
  const touching = fleetA(); touching[4] = { r: 1, c: 0, len: 2, dir: 'h' };
  assert.ok(BS.validFleet(touching), 'touching ships are allowed');
  const wrong = fleetA(); wrong[1] = { r: 2, c: 0, len: 3, dir: 'v' };
  assert.ok(!BS.validFleet(wrong), 'wrong ship lengths');
  assert.ok(!BS.validFleet(fleetA().slice(0, 4)));
  for (let i = 0; i < 200; i++) assert.ok(BS.validFleet(BS.randomFleet()));
});

test('setup: both fleets start the battle with the chosen first player', () => {
  const st = BS.create({ first: 1 });
  assert.equal(st.phase, 'setup');
  assert.ok(BS.setFleet(st, 0, fleetA()));
  assert.ok(!BS.setFleet(st, 0, fleetA()), 'cannot place twice');
  assert.equal(st.phase, 'setup');
  assert.ok(BS.setFleet(st, 1, fleetA()));
  assert.equal(st.phase, 'fire');
  assert.equal(st.turn, 1);
});

test('salvo reports only the count, sunk ships by length', () => {
  const st = started();
  // 0 and 1 belong to the 5 on row 0, 55 is water
  let r = BS.fire(st, 0, [0, 1, 55]);
  assert.deepEqual(r, { hits: 2, sunk: [] });
  assert.equal(st.salvos[0][0].marks, undefined, 'no per-shot info in the book version');
  assert.equal(st.turn, 1);
  BS.fire(st, 1, [44, 45, 46]);
  r = BS.fire(st, 0, [59, 69, 58]); // the 2 at column 9, rows 5-6 (58 is water)
  assert.deepEqual(r, { hits: 2, sunk: [2] });
  assert.deepEqual(BS.sunkLengths(st, 1), [2]);
});

test('illegal salvos are rejected', () => {
  const st = started();
  assert.equal(BS.fire(st, 1, [0, 1, 2]), null, 'not your turn');
  assert.equal(BS.fire(st, 0, [0, 1]), null, 'too few');
  assert.equal(BS.fire(st, 0, [0, 0, 1]), null, 'duplicate');
  assert.equal(BS.fire(st, 0, [0, 1, 100]), null, 'off the grid');
  assert.ok(BS.fire(st, 0, [0, 1, 2]));
  BS.fire(st, 1, [0, 1, 2]);
  assert.equal(BS.fire(st, 0, [2, 3, 4]), null, 'already fired at 2');
});

test('sinking every ship wins; last salvo may be smaller than three', () => {
  const st = started();
  const targets = fleetA().flatMap(BS.shipCells);
  let k = 0, other = 0;
  while (st.phase === 'fire') {
    if (st.turn === 0) {
      const fired = BS.firedBy(st, 0);
      const pick = targets.filter((i) => !fired.has(i)).slice(0, 3);
      for (let i = 0; pick.length < BS.salvoSize(st, 0); i++) if (!fired.has(i) && !pick.includes(i)) pick.push(i);
      assert.ok(BS.fire(st, 0, pick));
      k++;
    } else {
      // player 1 wastes shots on water far away
      const fired = BS.firedBy(st, 1);
      const water = [];
      for (let i = 99; water.length < 3; i--) if (!fired.has(i) && BS.occupancy(fleetA())[i] < 0) water.push(i);
      assert.ok(BS.fire(st, 1, water));
      other++;
    }
  }
  assert.equal(st.phase, 'over');
  assert.equal(st.winner, 0);
  assert.equal(k, Math.ceil(17 / 3));
  assert.equal(BS.sunkLengths(st, 1).length, 5);
  assert.equal(BS.fire(st, 1, [0, 1, 2]), null, 'no moves after the end');
  // salvo size shrinks at the very end of the grid
  const s2 = started();
  s2.salvos[0] = [{ cells: Array.from({ length: 98 }, (_, i) => i + 2).filter((i) => i !== 50), hits: 0, sunk: [] }];
  assert.equal(BS.shotsLeft(s2, 0), 3);
  s2.salvos[0][0].cells.push(50);
  assert.equal(BS.salvoSize(s2, 0), 2);
});

test('exact variant attaches per-shot marks', () => {
  const st = started({ exact: true });
  BS.fire(st, 0, [0, 55, 1]);
  assert.deepEqual(st.salvos[0][0].marks, [true, false, true]);
});

test('redact hides the opponent fleet until the end', () => {
  const st = started();
  const v = BS.redact(st, 1);
  assert.equal(v.fleets[0], null);
  assert.ok(v.fleets[1]);
  st.phase = 'over';
  assert.ok(BS.redact(st, 1).fleets[0]);
});

test('deduce: zero-hit and all-hit salvos, propagation across salvos', () => {
  const salvos = [
    { cells: [0, 1, 2], hits: 0, sunk: [] },
    { cells: [10, 11, 12], hits: 3, sunk: [] },
    { cells: [20, 21, 22], hits: 1, sunk: [] },
  ];
  const { known, frac } = BS.deduce(salvos);
  assert.deepEqual([known[0], known[1], known[2]], [-1, -1, -1]);
  assert.deepEqual([known[10], known[11], known[12]], [1, 1, 1]);
  assert.equal(known[20], 0);
  assert.ok(Math.abs(frac[20] - 1 / 3) < 1e-9);
  const exact = [{ cells: [5, 6, 7], hits: 1, sunk: [], marks: [false, true, false] }];
  const e = BS.deduce(exact).known;
  assert.deepEqual([e[5], e[6], e[7]], [-1, 1, -1]);
});

test('Monte Carlo samples agree with the reports', () => {
  const r = rng(7);
  const st = started();
  BS.fire(st, 0, [0, 1, 55]);
  BS.fire(st, 1, [90, 91, 92]);
  BS.fire(st, 0, [20, 30, 40]);
  const mc = BS.sampleProbs(st.salvos[0], r, { budget: 6000, chains: 4 });
  assert.ok(mc && mc.samples > 0);
  // the two hits of salvo 1 sit among 0, 1, 55: their probabilities sum to ~2
  const s = mc.prob[0] + mc.prob[1] + mc.prob[55];
  assert.ok(Math.abs(s - 2) < 1e-6, `sum ${s}`);
});

for (const level of ['easy', 'normal', 'hard']) {
  test(`AI (${level}) only fires legal salvos and finishes a game`, () => {
    const r = rng(level.length * 101);
    const st = BS.create({ first: 0 });
    BS.setFleet(st, 0, BS.aiFleet(r));
    BS.setFleet(st, 1, BS.aiFleet(r));
    let n = 0;
    while (st.phase === 'fire') {
      const p = st.turn;
      const cells = BS.aiSalvo(BS.redact(st, p), p, level, r);
      assert.ok(BS.legalSalvo(st, p, cells), `illegal salvo ${cells}`);
      BS.fire(st, p, cells);
      assert.ok(++n < 80);
    }
    assert.equal(st.phase, 'over');
    assert.ok(st.winner === 0 || st.winner === 1);
  });
}

test('hard AI needs fewer salvos than easy AI on average', () => {
  const r = rng(3);
  const avg = (level) => {
    let total = 0;
    for (let g = 0; g < 6; g++) {
      const st = BS.create({ exact: false });
      BS.setFleet(st, 0, BS.randomFleet(r));
      BS.setFleet(st, 1, BS.randomFleet(r));
      while (st.phase === 'fire') { st.turn = 0; BS.fire(st, 0, BS.aiSalvo(BS.redact(st, 0), 0, level, r)); }
      total += st.salvos[0].length;
    }
    return total / 6;
  };
  const easy = avg('easy'), hard = avg('hard');
  assert.ok(hard < easy - 3, `hard ${hard} vs easy ${easy}`);
});

test('one salvo can sink two ships; both lengths are reported', () => {
  const st = BS.create();
  const f = [
    { r: 0, c: 0, len: 5, dir: 'h' }, { r: 2, c: 0, len: 4, dir: 'h' }, { r: 4, c: 0, len: 3, dir: 'h' },
    { r: 6, c: 0, len: 3, dir: 'h' }, { r: 8, c: 0, len: 2, dir: 'h' },
  ];
  BS.setFleet(st, 0, f); BS.setFleet(st, 1, f);
  assert.deepEqual(BS.fire(st, 0, [40, 41, 80]), { hits: 3, sunk: [] });
  BS.fire(st, 1, [99, 98, 97]);
  // 42 finishes the first 3, 81 finishes the 2, 60 starts the second 3
  assert.deepEqual(BS.fire(st, 0, [81, 42, 60]), { hits: 3, sunk: [3, 2] });
  assert.deepEqual(BS.sunkFlags(st, 1), [false, false, true, false, true]);
  BS.fire(st, 1, [96, 95, 94]);
  // hitting already-sunk ships' neighbourhood does not re-report them
  assert.deepEqual(BS.fire(st, 0, [61, 62, 50]), { hits: 2, sunk: [3] });
});

test('state guards: no set-up after the start, no fleet before set-up ends, odd inputs', () => {
  const st = started();
  assert.ok(!BS.setFleet(st, 0, fleetA()), 'set-up is over');
  assert.equal(BS.fire(st, 0, null), null);
  assert.equal(BS.fire(st, 0, ['0', '1', '2']), null, 'strings are not cells');
  assert.equal(BS.fire(st, 0, [0.5, 1, 2]), null);
  assert.equal(BS.fire(st, 0, [0, 1, 2, 3]), null, 'too many');
  const s0 = BS.create();
  assert.equal(BS.fire(s0, 0, [0, 1, 2]), null, 'cannot fire during set-up');
  const bad = fleetA(); bad[0] = { ...bad[0], dir: 'd' };
  assert.ok(!BS.validFleet(bad));
  const neg = fleetA(); neg[4] = { r: -1, c: 9, len: 2, dir: 'v' };
  assert.ok(!BS.validFleet(neg));
});

test('redact never leaks per-shot marks in the count-only game', () => {
  const st = started();
  BS.fire(st, 0, [0, 1, 55]);
  BS.fire(st, 1, [0, 55, 99]);
  for (const v of [0, 1]) {
    const r = BS.redact(st, v);
    assert.equal(r.fleets[1 - v], null);
    for (const p of [0, 1]) for (const x of r.salvos[p]) assert.equal(x.marks, undefined);
  }
});

test('every AI level fires the short final salvo correctly', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    const st = started();
    // 33 salvos cover 99 squares: only cell 0 (the bow of the 5) is left for a one-shot salvo
    const rest = [];
    for (let i = 1; i < 100; i++) rest.push(i);
    for (let k = 0; k < rest.length; k += 3) {
      st.turn = 0;
      assert.ok(BS.fire(st, 0, rest.slice(k, k + 3)), `salvo ${k}`);
      assert.equal(st.phase, 'fire');
    }
    st.turn = 0;
    assert.equal(BS.salvoSize(st, 0), 1);
    const cells = BS.aiSalvo(BS.redact(st, 0), 0, level, rng(5));
    assert.deepEqual(cells, [0]);
    BS.fire(st, 0, cells);
    assert.equal(st.winner, 0);
  }
});

test('AI stays legal in the exact-report variant', () => {
  const r = rng(11);
  for (const level of ['easy', 'normal', 'hard']) {
    const st = BS.create({ exact: true });
    BS.setFleet(st, 0, BS.randomFleet(r)); BS.setFleet(st, 1, BS.randomFleet(r));
    let n = 0;
    while (st.phase === 'fire') {
      const p = st.turn;
      const cells = BS.aiSalvo(BS.redact(st, p), p, level, r);
      assert.ok(BS.legalSalvo(st, p, cells));
      BS.fire(st, p, cells);
      assert.ok(++n < 80);
    }
  }
});
