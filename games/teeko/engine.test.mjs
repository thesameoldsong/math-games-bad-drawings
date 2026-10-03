import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEEKO as T } from './engine.js';

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

const idx = (r, c) => r * 5 + c;
// Build a state from a picture: 'B' blue, 'R' red, '.' empty. All tokens count as placed.
function fromRows(rows, { turn = 0, classic = false } = {}) {
  const s = T.create({ first: turn, classic });
  rows.join('').split('').forEach((ch, i) => {
    if (ch === 'B') { s.b[i] = 0; s.placed[0]++; }
    if (ch === 'R') { s.b[i] = 1; s.placed[1]++; }
  });
  return s;
}

test('pattern counts: 28 lines, 30 squares (advanced) / 16 (classic)', () => {
  assert.equal(T.PATTERNS.advanced.filter((p) => p.kind === 'line').length, 28);
  assert.equal(T.PATTERNS.advanced.filter((p) => p.kind === 'square').length, 30);
  assert.equal(T.PATTERNS.classic.filter((p) => p.kind === 'square').length, 16);
});

test('drop phase: 4 tokens each, then moves', () => {
  const s = T.create();
  assert.equal(T.legalMoves(s).length, 25);
  const drops = [0, 24, 2, 22, 10, 14, 13, 11];
  for (const to of drops) { assert.equal(T.phaseOf(s), 'drop'); T.apply(s, { to }); }
  assert.deepEqual(s.placed, [4, 4]);
  assert.equal(T.phaseOf(s), 'move');
  assert.ok(T.legalMoves(s).every((m) => m.from >= 0 && s.b[m.from] === s.turn && s.b[m.to] === -1));
  assert.ok(!T.isLegal(s, { to: 5 }), 'no more drops once all four are placed');
});

test('moves go one step in 8 directions only to empty cells', () => {
  const s = fromRows(['B....', '.R...', '.....', '...BB', 'B..RR']);
  s.b[idx(0, 0)] = 0;
  const from00 = T.legalMoves(s).filter((m) => m.from === 0).map((m) => m.to).sort((a, b) => a - b);
  assert.deepEqual(from00, [1, 5]); // (1,1) is occupied by red
  assert.ok(!T.isLegal(s, { from: 0, to: 2 }));
  assert.ok(T.isLegal(s, { from: idx(3, 3), to: idx(2, 2) }));
});

test('wins: row, column, diagonal, anti-diagonal', () => {
  for (const cells of [[0, 1, 2, 3], [1, 6, 11, 16], [6, 12, 18, 24], [4, 8, 12, 16]]) {
    const s = T.create();
    s.placed = [3, 3];
    cells.slice(0, 3).forEach((i) => (s.b[i] = 0));
    [20, 21, 23].forEach((i) => (s.b[i] = 1));
    T.apply(s, { to: cells[3] });
    assert.equal(s.winner, 0);
    assert.equal(s.win.kind, 'line');
    assert.deepEqual([...s.win.cells].sort((a, b) => a - b), [...cells].sort((a, b) => a - b));
    assert.ok(T.isOver(s));
    assert.equal(T.legalMoves(s).length, 0);
  }
});

test('three in a row is not a win; bent lines are not a win', () => {
  const s = T.create();
  for (const to of [0, 20, 1, 21, 2, 23, 8, 24]) T.apply(s, { to });
  assert.equal(s.winner, -1);
});

test('squares: 2×2 wins in both variants, big squares only in advanced', () => {
  const big = ['B...B', 'RRR..', '..R..', '.....', 'B....'];
  const a = fromRows(big);
  T.apply(a, { to: 24 });
  assert.equal(a.winner, 0);
  assert.equal(a.win.kind, 'square');
  assert.equal(a.win.size, 4);

  const c = fromRows(big, { classic: true });
  T.apply(c, { to: 24 });
  assert.equal(c.winner, -1, 'classic: a 5×5 square does not count');

  const mid = fromRows(['B.B..', '.....', 'B....', '.RRR.', '...R.']);
  T.apply(mid, { to: 12 });
  assert.equal(mid.win.size, 2);

  const small = fromRows(['BB...', 'B....', '.....', '.RRR.', '...R.'], { classic: true });
  T.apply(small, { to: 6 });
  assert.equal(small.winner, 0);
  assert.equal(small.win.size, 1);
});

test('winning by moving a token', () => {
  const s = fromRows(['BBB..', '....B', '.....', 'RR...', 'R.R..']);
  assert.equal(T.phaseOf(s), 'move');
  T.apply(s, { from: idx(1, 4), to: idx(0, 3) });
  assert.equal(s.winner, 0);
});

test('a token leaving a pattern cell does not count for that pattern', () => {
  // Blue has three in a row plus one token; moving a row token next to it must not count as a win.
  const s = fromRows(['BBB..', '...B.', '.....', 'RR...', 'R.R..']);
  T.apply(s, { from: idx(0, 0), to: idx(1, 0) });
  assert.equal(s.winner, -1);
});

test('winningMoves finds threats for either side', () => {
  const d = T.create(); d.placed = [3, 3];
  [0, 1, 2].forEach((i) => (d.b[i] = 0)); [20, 21, 24].forEach((i) => (d.b[i] = 1));
  assert.deepEqual(T.winningMoves(d, 0).map((x) => x.move.to), [3]);
  assert.deepEqual(T.winningMoves(d, 1).map((x) => x.move.to), []);
  const m = fromRows(['BBB..', '....B', '.....', 'RR...', 'R.R..']);
  assert.ok(T.winningMoves(m, 0).some((x) => x.move.from === 9 && x.move.to === 3));
});

test('threefold repetition in the move phase is a draw', () => {
  const s = fromRows(['B.B..', '.....', 'B...B', 'R....', 'R.R.R']);
  const cycle = [{ from: 0, to: 1 }, { from: idx(3, 0), to: idx(3, 1) }, { from: 1, to: 0 }, { from: idx(3, 1), to: idx(3, 0) }];
  let n = 0;
  while (!s.draw && n < 20) { assert.equal(s.winner, -1); T.apply(s, cycle[n++ % 4]); }
  assert.ok(s.draw);
  assert.equal(s.reason, 'repeat');
  assert.equal(n, 9); // the position after move 1 occurs again after moves 5 and 9
});

test('AI takes a win and blocks a threat', () => {
  for (const level of ['normal', 'hard']) {
    const s = T.create({ first: 1 }); s.placed = [3, 3];
    [0, 1, 2].forEach((i) => (s.b[i] = 0)); [20, 21, 22].forEach((i) => (s.b[i] = 1));
    assert.equal(T.aiMove(s, level, { time: 300 }).to, 23, `${level} wins`);
    const b = T.create({ first: 1 }); b.placed = [3, 2];
    [0, 1, 2].forEach((i) => (b.b[i] = 0)); [20, 24].forEach((i) => (b.b[i] = 1));
    assert.equal(T.aiMove(b, level, { time: 300 }).to, 3, `${level} blocks`);
  }
});

test('AI only plays legal moves and AI-vs-AI games terminate', () => {
  const pairs = [['easy', 'easy'], ['easy', 'normal'], ['normal', 'normal'], ['hard', 'normal'], ['hard', 'hard']];
  for (const [i, [a, b]] of pairs.entries()) {
    const s = T.create({ first: i % 2, classic: i === 2 });
    const lv = [a, b];
    let guard = 0;
    while (!T.isOver(s)) {
      const m = T.aiMove(s, lv[s.turn], { time: 60 });
      assert.ok(T.isLegal(s, m), `illegal ${JSON.stringify(m)}`);
      T.apply(s, m);
      assert.ok(++guard < 2000, 'game did not end');
    }
    assert.ok(s.winner >= 0 || s.draw);
  }
});

test('stronger levels beat weaker ones', () => {
  let wins = 0;
  for (let i = 0; i < 10; i++) {
    const s = T.create({ first: i % 2 });
    while (!T.isOver(s)) T.apply(s, T.aiMove(s, s.turn === 0 ? 'normal' : 'easy'));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 8, `normal beat easy only ${wins}/10`);
});

test('state survives JSON (online) and clone is independent', () => {
  const s = T.create();
  for (const to of [12, 0, 6, 4]) T.apply(s, { to });
  const j = JSON.parse(JSON.stringify(s));
  assert.deepEqual(T.legalMoves(j), T.legalMoves(s));
  const c = T.clone(s);
  T.apply(c, { to: 18 });
  assert.equal(s.b[18], -1);
  assert.equal(s.ply, 4);
});

test('edge cases: corner neighbors, foreign tokens, drop-phase square, no repetition count while placing', () => {
  assert.deepEqual(T.NEIGH[0].slice().sort((a, b) => a - b), [1, 5, 6]);
  assert.equal(T.NEIGH[12].length, 8);
  const s = fromRows(['B.B..', '.....', 'B...B', 'R....', 'R.R.R']);
  assert.ok(!T.isLegal(s, { from: idx(3, 0), to: idx(2, 1) }), 'cannot move the opponent token');
  assert.ok(!T.isLegal(s, { from: 0, to: 0 }));
  assert.ok(!T.isLegal(s, { from: 0, to: idx(2, 2) }), 'no two-step moves');

  // A 3×3 square made while placing wins at once (advanced), but not in classic.
  for (const classic of [false, true]) {
    const d = T.create({ classic });
    for (const to of [0, 1, 2, 3, 10, 21]) T.apply(d, { to });
    T.apply(d, { to: 12 });
    assert.equal(d.winner, classic ? -1 : 0);
    if (!classic) assert.deepEqual(d.win, { kind: 'square', size: 2, cells: [0, 2, 10, 12] });
    assert.deepEqual(d.rep, {}, 'positions are not counted during the placing phase');
  }
});

test('AI never makes illegal moves from random move-phase positions', () => {
  for (let k = 0; k < 40; k++) {
    const s = T.create({ first: k % 2, classic: k % 3 === 0 });
    while (T.phaseOf(s, 0) === 'drop' || T.phaseOf(s, 1) === 'drop') {
      const m = T.legalMoves(s); T.apply(s, m[Math.floor(Math.random() * m.length)]);
      if (T.isOver(s)) break;
    }
    if (T.isOver(s)) continue;
    for (const lv of ['easy', 'normal', 'hard']) assert.ok(T.isLegal(s, T.aiMove(s, lv, { time: 40 })), lv);
  }
});

test('every level beats random play', () => {
  const rnd = (s) => { const m = T.legalMoves(s); return m[Math.floor(Math.random() * m.length)]; };
  for (const lv of ['easy', 'normal']) {
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const s = T.create({ first: i % 2 });
      while (!T.isOver(s)) T.apply(s, s.turn === 0 ? T.aiMove(s, lv, { time: 60 }) : rnd(s));
      if (s.winner === 0) wins++;
    }
    assert.ok(wins >= 9, `${lv} beat random only ${wins}/10`);
  }
});
