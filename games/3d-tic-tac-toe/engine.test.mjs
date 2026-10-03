import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Q3 } from './engine.js';

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

const play = (s, cells) => cells.forEach((i) => assert.ok(Q3.apply(s, i), `move ${i}`));

test('there are 76 winning lines; corners and centre cells sit on 7, the rest on 4', () => {
  assert.equal(Q3.LINES.length, 76);
  const keys = new Set(Q3.LINES.map((L) => [...L].sort((a, b) => a - b).join(',')));
  assert.equal(keys.size, 76);
  const counts = Q3.LINES_AT.map((a) => a.length);
  assert.equal(counts.filter((c) => c === 7).length, 16);
  assert.equal(counts.filter((c) => c === 4).length, 48);
  assert.equal(Q3.LINES_AT[Q3.idx(0, 0, 0)].length, 7);
  assert.equal(Q3.LINES_AT[Q3.idx(1, 1, 1)].length, 7);
  assert.equal(Q3.LINES_AT[Q3.idx(1, 0, 0)].length, 4);
});

test('row inside one layer wins', () => {
  const s = Q3.create();
  play(s, [0, 16, 1, 17, 2, 18, 3]);
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.equal(Q3.crossLayer(s.line), false);
});

test('space diagonal through all layers wins', () => {
  const s = Q3.create({ first: 1 });
  const diag = [Q3.idx(0, 0, 0), Q3.idx(1, 1, 1), Q3.idx(2, 2, 2), Q3.idx(3, 3, 3)];
  play(s, [diag[0], 1, diag[1], 2, diag[2], 4]);
  assert.equal(s.over, false);
  play(s, [diag[3]]);
  assert.equal(s.winner, 1);
  assert.equal(Q3.crossLayer(s.line), true);
});

test('vertical column (same cell on every layer) wins', () => {
  const s = Q3.create();
  play(s, [5, 0, 21, 1, 37, 2, 53]);
  assert.equal(s.winner, 0);
});

test('occupied cells and moves after the end are illegal', () => {
  const s = Q3.create();
  play(s, [0]);
  assert.equal(Q3.apply(s, 0), false);
  assert.equal(Q3.apply(s, 64), false);
  assert.equal(Q3.apply(s, -1), false);
  play(s, [16, 1, 17, 2, 18, 3]);
  assert.equal(Q3.apply(s, 40), false);
  assert.equal(Q3.legalMoves(s).length, 0);
});

test('gravity: only the bottom layer or right above a mark', () => {
  const s = Q3.create({ gravity: true });
  assert.equal(Q3.legalMoves(s).length, 16);
  assert.ok(Q3.legalMoves(s).every((i) => i >= 48));
  assert.equal(Q3.apply(s, 5), false);
  play(s, [48 + 5]);
  assert.ok(Q3.canPlay(s, 32 + 5));
  assert.ok(!Q3.canPlay(s, 16 + 5));
});

test('winCells sees threats; gravity hides unreachable ones', () => {
  const s = Q3.create();
  play(s, [0, 63, 1, 62, 2]);
  assert.deepEqual(Q3.winCells(s, 0), [3]);
  const g = Q3.create({ gravity: true });
  // O builds three in a row on layer z=2 on top of X's marks; the fourth cell (35) has nothing under it yet
  play(g, [48, 32, 49, 33, 50, 34]);
  assert.deepEqual(Q3.threats(g, 1).map((t) => t.cell), [35]);
  assert.deepEqual(Q3.winCells(g, 1), []);
  assert.deepEqual(Q3.winCells(g, 0), [51]);
  assert.equal(Q3.aiMove(g, 'normal'), 51);
});

test('normal and hard AI take a win and block a win', () => {
  for (const level of ['normal', 'hard']) {
    const s = Q3.create();
    play(s, [0, 63, 1, 62, 2]);
    assert.equal(Q3.aiMove(s, level), 3, `${level} blocks`);
    const w = Q3.create();
    play(w, [0, 63, 1, 62, 2, 61, 40]);
    assert.equal(Q3.aiMove(w, level), 60, `${level} wins`);
  }
});

test('normal and hard AI cash in a fork against best defence', () => {
  // X: 1,2 (row y=0) and 4,8 (column x=0) on the top layer → cell 0 makes two threats at once.
  for (const level of ['normal', 'hard']) {
    const s = Q3.create();
    play(s, [1, 63, 2, 38, 4, 29, 8, 51]);
    assert.deepEqual(Q3.winCells(s, 1), []);
    let n = 0;
    while (!s.over && n++ < 8) Q3.apply(s, Q3.aiMove(s, s.turn === 0 ? level : 'hard'));
    assert.equal(s.winner, 0, level);
  }
});

test('AI never plays illegal moves and full AI-vs-AI games terminate', () => {
  for (const gravity of [false, true]) {
    for (const [a, b] of [['easy', 'easy'], ['easy', 'normal'], ['normal', 'hard'], ['hard', 'hard']]) {
      const s = Q3.create({ gravity, first: Math.random() < 0.5 ? 0 : 1 });
      let n = 0;
      while (!s.over) {
        const m = Q3.aiMove(s, s.turn === 0 ? a : b);
        assert.ok(Q3.canPlay(s, m), `illegal ${m} (${a}/${b}, gravity ${gravity})`);
        Q3.apply(s, m);
        assert.ok(++n <= 64);
      }
      assert.ok(s.winner >= -1 && s.winner <= 1);
    }
  }
});

test('hard beats easy almost always', () => {
  let wins = 0;
  for (let k = 0; k < 10; k++) {
    const s = Q3.create({ first: k % 2 });
    while (!s.over) Q3.apply(s, Q3.aiMove(s, s.turn === 0 ? 'hard' : 'easy'));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 9, `hard won ${wins}/10`);
});

test('hard beats normal more often than not', () => {
  let h = 0, n = 0;
  for (let k = 0; k < 10; k++) {
    const s = Q3.create({ first: k % 2 });
    while (!s.over) Q3.apply(s, Q3.aiMove(s, s.turn === 0 ? 'hard' : 'normal'));
    if (s.winner === 0) h++; else if (s.winner === 1) n++;
  }
  assert.ok(h > n, `hard ${h} vs normal ${n}`);
});

test('staircase and anti-diagonal lines through the layers win', () => {
  // staircase: same row, column shifts one cell per layer
  const s = Q3.create();
  play(s, [Q3.idx(0, 2, 0), 1, Q3.idx(1, 2, 1), 2, Q3.idx(2, 2, 2), 3]);
  assert.equal(s.over, false);
  play(s, [Q3.idx(3, 2, 3)]);
  assert.equal(s.winner, 0);
  assert.equal(Q3.crossLayer(s.line), true);
  // descending staircase and the opposite corner-to-corner diagonal
  for (const cells of [
    [Q3.idx(1, 3, 0), Q3.idx(1, 2, 1), Q3.idx(1, 1, 2), Q3.idx(1, 0, 3)],
    [Q3.idx(3, 0, 0), Q3.idx(2, 1, 1), Q3.idx(1, 2, 2), Q3.idx(0, 3, 3)],
  ]) {
    const t = Q3.create();
    play(t, [cells[0], 5, cells[1], 6, cells[2], 9, cells[3]]);
    assert.equal(t.winner, 0, cells.join(','));
  }
  // a bent "line" is not a win
  const u = Q3.create();
  play(u, [Q3.idx(0, 0, 0), 5, Q3.idx(1, 0, 1), 6, Q3.idx(2, 0, 2), 9, Q3.idx(2, 0, 3)]);
  assert.equal(u.over, false);
});

test('full board without four in a row is a tie', () => {
  // find a 32/32 colouring of the cube with no one-colour line by local search (draws exist in Qubic)
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const col = Array.from({ length: 64 }, (_, i) => i % 2);
  for (let i = 63; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [col[i], col[j]] = [col[j], col[i]]; }
  const bad = () => Q3.LINES.filter((L) => L.every((j) => col[j] === col[L[0]])).length;
  let cur = bad();
  for (let it = 0; it < 200000 && cur; it++) {
    const a = Math.floor(rnd() * 64), b = Math.floor(rnd() * 64);
    if (col[a] === col[b]) continue;
    [col[a], col[b]] = [col[b], col[a]];
    const v = bad();
    if (v <= cur || rnd() < 0.02) cur = v; else [col[a], col[b]] = [col[b], col[a]];
  }
  assert.equal(cur, 0, 'no drawn colouring found');
  const xs = col.flatMap((c, i) => (c === 0 ? [i] : [])), os = col.flatMap((c, i) => (c === 1 ? [i] : []));
  const s = Q3.create();
  for (let k = 0; k < 32; k++) { play(s, [xs[k]]); if (k < 31) assert.equal(s.over, false); play(s, [os[k]]); }
  assert.equal(s.over, true);
  assert.equal(s.winner, -1);
  assert.equal(s.line, -1);
  assert.equal(Q3.legalMoves(s).length, 0);
});

test('gravity: vertical column builds bottom-up and the AI never opens a win cell for the opponent', () => {
  const s = Q3.create({ gravity: true });
  play(s, [48, 49, 32, 50, 16, 52]);
  assert.equal(s.over, false);
  play(s, [0]);
  assert.equal(s.winner, 0, 'column 48-32-16-0 wins');
  // normal/hard must not play right below the opponent's missing cell
  for (const level of ['normal', 'hard']) {
    const g = Q3.create({ gravity: true });
    // X: 49, 51, 60, 61; O: 50 and 33, 34, 35 on layer 3 (needs 32, which sits on the empty 48)
    for (const i of [49, 51, 60, 61]) g.b[i] = 0;
    for (const i of [50, 33, 34, 35]) g.b[i] = 1;
    g.moves = 8;
    assert.deepEqual(Q3.threats(g, 1).map((x) => x.cell), [32]);
    assert.ok(!Q3.winCells(g, 1).length && !Q3.winCells(g, 0).length);
    for (let k = 0; k < 5; k++) assert.notEqual(Q3.aiMove(g, level), 48, `${level} hands over 32`);
  }
});

test('every AI level beats random play clearly', () => {
  const rnd = (s) => { const m = Q3.legalMoves(s); return m[Math.floor(Math.random() * m.length)]; };
  for (const gravity of [false, true]) for (const level of ['easy', 'normal', 'hard']) {
    let w = 0;
    const n = level === 'hard' ? 6 : 12;
    for (let k = 0; k < n; k++) {
      const s = Q3.create({ gravity, first: k % 2 });
      while (!s.over) Q3.apply(s, s.turn === 0 ? Q3.aiMove(s, level) : rnd(s));
      if (s.winner === 0) w++;
    }
    assert.ok(w >= (level === 'easy' ? n * 0.66 : n - 1), `${level} (gravity ${gravity}) won ${w}/${n} vs random`);
  }
});
