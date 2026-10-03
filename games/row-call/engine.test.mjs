import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RC } from './engine.js';

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

// put marks directly: list of [cell, player]
function setup(marks, opts = {}) {
  const s = RC.create(opts);
  for (const [c, p] of marks) s.cells[c] = p;
  return s;
}

test('a turn: caller picks a line, opponent places the caller’s mark in it', () => {
  const s = RC.create();
  assert.equal(RC.actor(s), 0);
  assert.equal(RC.apply(s, { pick: { t: 'r', i: 1 } }), false);
  assert.equal(s.phase, 'place');
  assert.equal(RC.actor(s), 1);
  assert.equal(RC.legal(s, { place: 0 }), false, 'cell outside the called row');
  assert.equal(RC.legal(s, { pick: { t: 'c', i: 0 } }), false, 'cannot pick twice');
  assert.equal(RC.apply(s, { place: 6 }), true);
  assert.equal(s.cells[6], 0, 'the mark belongs to the caller');
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'pick');
  assert.equal(RC.actor(s), 1);
});

test('full lines cannot be called; occupied cells cannot be chosen', () => {
  const s = setup([[0, 0], [1, 1], [2, 0], [3, 1]]);
  assert.equal(RC.legal(s, { pick: { t: 'r', i: 0 } }), false);
  assert.equal(RC.lines(s).length, 7);
  RC.apply(s, { pick: { t: 'c', i: 0 } });
  assert.equal(RC.legal(s, { place: 0 }), false);
  assert.equal(RC.legal(s, { place: 4 }), true);
  assert.equal(RC.legal(s, { pick: { t: 'x', i: 0 } }), false);
  assert.equal(RC.legal(RC.create(), { pick: { t: 'r', i: 4 } }), false);
});

test('a line with a single free cell is filled at once', () => {
  const s = setup([[0, 0], [1, 1], [2, 1]]);
  assert.equal(RC.apply(s, { pick: { t: 'r', i: 0 } }), true);
  assert.equal(s.forced, true);
  assert.equal(s.cells[3], 0);
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'pick');
});

test('three in a row wins on 4×4: across, down and both diagonals', () => {
  for (const [cells, last, L] of [
    [[4, 5], 6, { t: 'r', i: 1 }],
    [[1, 5], 9, { t: 'c', i: 1 }],
    [[0, 5], 10, { t: 'r', i: 2 }],
    [[7, 10], 13, { t: 'r', i: 3 }],
  ]) {
    const s = setup(cells.map((c) => [c, 0]));
    RC.apply(s, { pick: L });
    RC.apply(s, { place: last });
    assert.equal(s.winner, 0, `win via ${last}`);
    assert.ok(RC.isOver(s));
    assert.deepEqual([...s.win].sort((a, b) => a - b), [...cells, last].sort((a, b) => a - b));
    assert.equal(RC.legal(s, { pick: { t: 'r', i: 0 } }), false, 'no moves after a win');
  }
});

test('two in a row is not a win; 5×5 needs four', () => {
  const s = setup([[0, 0]]);
  RC.apply(s, { pick: { t: 'r', i: 0 } });
  RC.apply(s, { place: 1 });
  assert.equal(s.winner, -1);
  const f = setup([[0, 0], [1, 0]], { N: 5 });
  assert.equal(f.K, 4);
  RC.apply(f, { pick: { t: 'r', i: 0 } });
  RC.apply(f, { place: 2 });
  assert.equal(f.winner, -1);
  f.turn = 0;
  RC.apply(f, { pick: { t: 'r', i: 0 } });
  RC.apply(f, { place: 3 });
  assert.equal(f.winner, 0);
});

test('the opponent can be forced to hand over a win (deadly call)', () => {
  // blue: 0, 5 (diagonal needs 10) and 8, 9 (row needs 10); row 2's only free cell is 10
  const s = setup([[0, 0], [5, 0], [8, 0], [9, 0], [12, 1], [13, 1], [3, 1], [15, 1], [11, 1]]);
  const killers = RC.killerLines(s, 0);
  assert.ok(killers.some((L) => L.t === 'r' && L.i === 2), 'row 3 is deadly: only cell 10 is left');
  assert.ok(RC.threats(s, 0).includes(10));
});

test('a full board without a row is a draw', () => {
  // X O X O / X O X O / O X O X / O X O X  — no three in a row anywhere
  const pat = [0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0];
  const s = setup(pat.map((p, i) => [i, p]).filter(([i]) => i !== 15));
  s.turn = 0; // pat[15] is blue's
  // sanity: the pattern has no three in a row
  const full = pat.slice();
  for (const w of RC.windows(4, 3)) assert.ok(!w.every((c) => full[c] === full[w[0]]), 'pattern has a line ' + w);
  RC.apply(s, { pick: { t: 'r', i: 3 } });
  assert.equal(s.winner, -1);
  assert.ok(RC.isOver(s));
  assert.equal(RC.aiAction(s, 'hard'), null);
});

test('AI takes a deadly call and avoids handing over a win', () => {
  const s = setup([[0, 0], [5, 0], [8, 0], [9, 0], [11, 1], [12, 1], [13, 1], [3, 1], [15, 1]]);
  for (const lvl of ['normal', 'hard']) {
    const a = RC.aiAction(RC.clone(s), lvl);
    const t = RC.clone(s);
    RC.apply(t, a);
    if (t.phase === 'place') RC.apply(t, RC.aiAction(t, 'hard'));
    assert.equal(t.winner, 0, lvl + ' should win right away');
  }
  // placer side: blue called row 1 holding 4 and 5 — red must not put blue on 6 when 7 is free
  const p = setup([[4, 0], [5, 0], [0, 1], [10, 1]]);
  RC.apply(p, { pick: { t: 'r', i: 1 } });
  for (const lvl of ['normal', 'hard']) {
    const a = RC.aiAction(p, lvl);
    assert.notEqual(a.place, 6, lvl);
  }
});

test('AI never makes illegal moves and AI-vs-AI games terminate', () => {
  const levels = ['easy', 'normal', 'hard'];
  for (const N of [4, 5]) {
    for (let g = 0; g < (N === 4 ? 6 : 2); g++) {
      const s = RC.create({ N, first: g % 2 });
      let steps = 0;
      while (!RC.isOver(s)) {
        const lvl = levels[(g + RC.actor(s)) % 3];
        const a = RC.aiAction(s, lvl);
        assert.ok(RC.legal(s, a), `illegal ${JSON.stringify(a)}`);
        RC.apply(s, a);
        assert.ok(++steps <= 2 * N * N);
      }
      assert.ok(s.winner >= 0 || RC.isFull(s));
    }
  }
});

test('normal AI beats easy AI most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 20; i++) {
    const s = RC.create({ first: i % 2 });
    while (!RC.isOver(s)) RC.apply(s, RC.aiAction(s, RC.actor(s) === 0 ? 'normal' : 'easy'));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 15, `normal won only ${wins}/20`);
});

// ---------- extra edge cases ----------

const randomAction = (s, rnd) => {
  if (s.phase === 'pick') { const L = RC.lines(s); return { pick: L[Math.floor(rnd() * L.length)] }; }
  const e = RC.empties(s, s.line);
  return { place: e[Math.floor(rnd() * e.length)] };
};
function lcg(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

test('malformed actions are rejected', () => {
  const s = RC.create();
  for (const a of [null, undefined, {}, { pick: null }, { pick: { t: 'r' } }, { pick: { t: 'r', i: -1 } }, { pick: { t: 'r', i: 1.5 } }, { place: 0 }]) {
    assert.equal(RC.legal(s, a), false, JSON.stringify(a));
  }
  assert.throws(() => RC.apply(s, { place: 0 }));
  RC.apply(s, { pick: { t: 'c', i: 2 } });
  for (const a of [{ place: -1 }, { place: 16 }, { place: '2' }, { place: 1 }]) assert.equal(RC.legal(s, a), false, JSON.stringify(a));
  assert.equal(RC.legal(s, { place: 14 }), true);
});

test('a forced mark can win; a mark never scores for the other side', () => {
  // blue has 0 and 1; row 0 has only cell 2 free — calling it wins at once
  const s = setup([[0, 0], [1, 0], [3, 1]]);
  assert.equal(RC.apply(s, { pick: { t: 'r', i: 0 } }), true);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.win, [0, 1, 2]);
  // the caller's mark that lands in the opponent's open row never scores for the opponent
  const t = setup([[4, 1], [5, 1]]);
  RC.apply(t, { pick: { t: 'r', i: 1 } });
  RC.apply(t, { place: 6 });
  assert.equal(t.winner, -1);
  assert.equal(t.cells[6], 0);
});

test('5×5: four on a diagonal wins, three does not; five in a row also wins', () => {
  const s = setup([[1, 0], [7, 0], [13, 0]], { N: 5 });
  RC.apply(s, { pick: { t: 'r', i: 3 } });
  RC.apply(s, { place: 19 });
  assert.equal(s.winner, 0);
  const a = setup([[4, 1], [8, 1]], { N: 5, first: 1 });
  RC.apply(a, { pick: { t: 'r', i: 2 } });
  RC.apply(a, { place: 12 });
  assert.equal(a.winner, -1, 'three on the anti-diagonal is not enough on 5×5');
  const f = setup([[0, 0], [1, 0], [3, 0], [4, 0]], { N: 5 });
  RC.apply(f, { pick: { t: 'r', i: 0 } });
  assert.equal(f.winner, 0, 'the gap filled by force makes five');
});

test('random games keep the invariants', () => {
  const rnd = lcg(7);
  for (let g = 0; g < 300; g++) {
    const N = g % 3 ? 4 : 5;
    const s = RC.create({ N, first: g % 2 });
    let marks = 0;
    while (!RC.isOver(s)) {
      const caller = s.turn;
      const a = randomAction(s, rnd);
      assert.ok(RC.legal(s, a));
      if (RC.apply(s, a)) {
        marks++;
        assert.equal(s.cells[s.last], caller, 'the mark belongs to the caller');
        if (!RC.isOver(s)) assert.equal(s.turn, 1 - caller, 'roles swap after a mark');
      } else assert.equal(RC.actor(s), 1 - caller, 'the opponent places');
    }
    assert.equal(s.cells.filter((c) => c >= 0).length, marks);
    if (s.winner >= 0) assert.ok(s.win.every((c) => s.cells[c] === s.winner) && s.win.length === s.K);
    else {
      assert.ok(RC.isFull(s));
      for (const w of RC.windows(N, s.K)) assert.ok(!w.every((c) => s.cells[c] === s.cells[w[0]]));
    }
    assert.deepEqual(RC.lines(s), []);
  }
});

test('normal AI crushes random play on both boards', () => {
  const rnd = lcg(11);
  for (const [N, games, need] of [[4, 40, 36], [5, 12, 10]]) {
    let wins = 0;
    for (let i = 0; i < games; i++) {
      const s = RC.create({ N, first: i % 2 });
      while (!RC.isOver(s)) RC.apply(s, RC.actor(s) === 0 ? RC.aiAction(s, 'normal') : randomAction(s, rnd));
      if (s.winner === 0) wins++;
    }
    assert.ok(wins >= need, `${N}×${N}: normal won only ${wins}/${games}`);
  }
});

// ---------- reviewer additions ----------

test('the very last free cell can still win (win beats a full board)', () => {
  // only cell 15 is free and it completes blue's diagonal 5-10-15
  const pat = [1, 0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, -1];
  for (const w of RC.windows(4, 3)) assert.ok(!w.every((c) => pat[c] >= 0 && pat[c] === pat[w[0]]), 'no row yet ' + w);
  const s = setup(pat.map((p, i) => [i, p]).filter(([, p]) => p >= 0));
  s.turn = 0;
  RC.apply(s, { pick: { t: 'c', i: 3 } });
  assert.ok(RC.isFull(s));
  assert.equal(s.winner, 0);
  assert.deepEqual([...s.win].sort((a, b) => a - b), [5, 10, 15]);
});

test('a doomed placer still returns a legal move; the state survives a JSON round-trip', () => {
  // blue calls row 1 (free: 5 and 6); 5 completes 0-5-10 and 6 completes 6-9-12 — red is doomed
  const s = setup([[0, 0], [4, 0], [7, 0], [9, 0], [10, 0], [12, 0], [1, 1], [2, 1], [3, 1], [8, 1]]);
  assert.ok(RC.killerLines(s, 0).some((L) => L.t === 'r' && L.i === 1));
  RC.apply(s, { pick: { t: 'r', i: 1 } });
  const free = RC.empties(s, s.line);
  assert.deepEqual(free, [5, 6]);
  for (const lvl of ['easy', 'normal', 'hard']) {
    const a = RC.aiAction(s, lvl);
    assert.ok(RC.legal(s, a) && free.includes(a.place), lvl);
  }
  const t = JSON.parse(JSON.stringify(s));
  const a = RC.aiAction(t, 'hard');
  assert.ok(RC.legal(t, a));
  RC.apply(t, a);
  assert.equal(t.n, s.n + 1);
});

test('hard AI beats normal AI and stays within its time budget', () => {
  let wins = 0, losses = 0, slow = 0;
  for (let i = 0; i < 12; i++) {
    const s = RC.create({ first: i % 2 });
    while (!RC.isOver(s)) {
      const hard = RC.actor(s) === 0, t0 = Date.now();
      RC.apply(s, RC.aiAction(s, hard ? 'hard' : 'normal'));
      if (hard) slow = Math.max(slow, Date.now() - t0);
    }
    if (s.winner === 0) wins++; else if (s.winner === 1) losses++;
  }
  assert.ok(wins >= 8 && wins > 2 * losses, `hard ${wins}:${losses} vs normal`);
  assert.ok(slow < 1200, `hard took ${slow} ms`);
});
