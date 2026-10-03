import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOM } from './engine.js';

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

test('players are restricted to their orientation', () => {
  const s = DOM.create({ R: 4, C: 4 });
  assert.equal(s.turn, 0);
  assert.ok(DOM.isLegal(s, { r: 0, c: 0, o: 'h' }));
  assert.ok(!DOM.isLegal(s, { r: 0, c: 0, o: 'v' }));
  assert.throws(() => DOM.apply(s, { r: 0, c: 0, o: 'v' }));
  DOM.apply(s, { r: 0, c: 0, o: 'h' });
  assert.equal(s.turn, 1);
  assert.ok(DOM.isLegal(s, { r: 1, c: 0, o: 'v' }));
  assert.ok(!DOM.isLegal(s, { r: 0, c: 0, o: 'v' }), 'overlaps');
  assert.ok(!DOM.isLegal(s, { r: 3, c: 0, o: 'v' }), 'off the board');
  assert.ok(!DOM.isLegal(s, { r: 1, c: 1, o: 'h' }), 'wrong orientation');
});

test('edges of the board', () => {
  const s = DOM.create({ R: 3, C: 3 });
  assert.ok(!DOM.isLegal(s, { r: 0, c: 2, o: 'h' }));
  assert.ok(DOM.isLegal(s, { r: 0, c: 1, o: 'h' }));
  assert.equal(DOM.countMoves(s, 0), 6);
  assert.equal(DOM.countMoves(s, 1), 6);
});

test('a player with no room loses', () => {
  // 2×2: H plays top row, V has no vertical pair left → H wins.
  const s = DOM.create({ R: 2, C: 2 });
  DOM.apply(s, { r: 0, c: 0, o: 'h' });
  assert.ok(DOM.isOver(s));
  assert.equal(DOM.winner(s), 0);
  // 1×3 strip: vertical player can never move.
  const t = DOM.create({ R: 1, C: 3, first: 1 });
  assert.ok(DOM.isOver(t));
  assert.equal(DOM.winner(t), 0);
});

test('cram lets anyone place either way', () => {
  const s = DOM.create({ R: 2, C: 2, cram: true });
  assert.ok(DOM.isLegal(s, { r: 0, c: 0, o: 'v' }));
  DOM.apply(s, { r: 0, c: 0, o: 'v' });
  assert.ok(DOM.isLegal(s, { r: 0, c: 1, o: 'v' }));
  DOM.apply(s, { r: 0, c: 1, o: 'v' });
  assert.ok(DOM.isOver(s));
  assert.equal(DOM.winner(s), 1);
});

test('safe spots are counted', () => {
  // 1-row board: every horizontal spot is safe from the vertical player.
  const s = DOM.create({ R: 1, C: 5 });
  assert.equal(DOM.safeSpots(s, 0), 2);
  assert.equal(DOM.safeSpots(s, 1), 0);
});

test('AI never makes illegal moves and games terminate', () => {
  for (const cram of [false, true]) for (const level of ['easy', 'normal', 'hard']) for (const N of [5, 8]) {
    const s = DOM.create({ R: N, C: N, cram, first: N % 2 });
    let guard = 0;
    while (!DOM.isOver(s)) {
      const m = DOM.aiMove(s, level, { time: 60 });
      assert.ok(DOM.isLegal(s, m), `${level} ${JSON.stringify(m)}`);
      DOM.apply(s, m);
      assert.ok(++guard <= (N * N) / 2);
    }
    assert.ok(DOM.winner(s) === 0 || DOM.winner(s) === 1);
  }
});

test('AI finds a forced win in a small endgame', () => {
  // Empty 3×3, H to move: the first player wins, and an exhaustive search must keep the win.
  const s = DOM.create({ R: 3, C: 3 });
  const m = DOM.aiMove(s, 'hard', { time: 500 });
  const x = DOM.clone(s); DOM.apply(x, m);
  // verify by brute force that H wins after m
  const wins = (st) => { // does the side to move win?
    for (const mv of DOM.moves(st)) { const y = DOM.clone(st); DOM.apply(y, mv); if (!wins(y)) return true; }
    return false;
  };
  assert.equal(wins(s), true, 'first player wins 3×3');
  assert.equal(wins(x), false, 'AI move keeps the win');
});

test('hard AI beats easy AI most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 10; i++) {
    const s = DOM.create({ R: 6, C: 6, first: i % 2 });
    const hardSide = (i >> 1) % 2;
    while (!DOM.isOver(s)) DOM.apply(s, DOM.aiMove(s, s.turn === hardSide ? 'hard' : 'easy', { time: 80 }));
    if (DOM.winner(s) === hardSide) wins++;
  }
  assert.ok(wins >= 8, `hard won only ${wins}/10`);
});

test('hard AI beats normal AI from the winning seat', () => {
  // 5×5 is a second-player win in theory; moving second, the hard AI should convert it.
  let wins = 0;
  for (let i = 0; i < 6; i++) {
    const hardSide = i % 2;
    const s = DOM.create({ R: 5, C: 5, first: 1 - hardSide });
    while (!DOM.isOver(s)) DOM.apply(s, DOM.aiMove(s, s.turn === hardSide ? 'hard' : 'normal', { time: 300 }));
    if (DOM.winner(s) === hardSide) wins++;
  }
  assert.ok(wins >= 5, `hard won only ${wins}/6`);
});

test('malformed moves are rejected and apply does not touch the board', () => {
  const s = DOM.create({ R: 4, C: 4 });
  for (const m of [null, undefined, {}, { r: 0, c: 0 }, { r: 0, c: 0, o: 'x' }, { r: -1, c: 0, o: 'h' },
    { r: 0, c: 3, o: 'h' }, { r: 0.5, c: 0, o: 'h' }, { r: NaN, c: 0, o: 'h' }, { r: '0', c: '0', o: 'h' }]) {
    assert.ok(!DOM.isLegal(s, m), JSON.stringify(m));
    const before = JSON.stringify(s);
    assert.throws(() => DOM.apply(s, m));
    assert.equal(JSON.stringify(s), before);
  }
});

test('rectangular boards: rows and columns are not mixed up', () => {
  const s = DOM.create({ R: 9, C: 6 });
  assert.equal(DOM.countMoves(s, 0), 9 * 5);
  assert.equal(DOM.countMoves(s, 1), 8 * 6);
  assert.ok(DOM.isLegal(s, { r: 8, c: 4, o: 'h' }));
  assert.ok(!DOM.isLegal(s, { r: 8, c: 5, o: 'h' }));
  DOM.apply(s, { r: 8, c: 4, o: 'h' });
  assert.ok(DOM.isLegal(s, { r: 7, c: 5, o: 'v' }) === false, 'covered cell');
  assert.ok(DOM.isLegal(s, { r: 6, c: 5, o: 'v' }));
});

test('random games: the game ends exactly when the side to move is stuck', () => {
  for (let g = 0; g < 200; g++) {
    const cram = g % 3 === 0, R = 2 + (g % 5), C = 2 + ((g * 7) % 6);
    const s = DOM.create({ R, C, cram, first: g % 2 });
    while (!DOM.isOver(s)) {
      assert.equal(DOM.winner(s), -1);
      const ms = DOM.moves(s);
      for (const m of ms) assert.ok(DOM.isLegal(s, m));
      DOM.apply(s, ms[Math.floor(Math.random() * ms.length)]);
    }
    // nobody can place anything for the side to move; the other player wins
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const o of DOM.orients(s, s.turn)) assert.ok(!DOM.fits(s, { r, c, o }));
    assert.equal(DOM.winner(s), 1 - s.turn);
    const covered = s.cells.filter((x) => x >= 0).length;
    assert.equal(covered, s.pieces.length * 2);
  }
});

test('aiMove leaves the given state untouched', () => {
  const s = DOM.create({ R: 6, C: 6 });
  DOM.apply(s, { r: 2, c: 2, o: 'h' });
  const before = JSON.stringify(s);
  for (const level of ['easy', 'normal', 'hard']) DOM.aiMove(s, level, { time: 50 });
  assert.equal(JSON.stringify(s), before);
});

test('hard AI always keeps a won 4×4 position (checked exhaustively)', () => {
  const memo = new Map();
  const wins = (st) => { // does the side to move win?
    const k = st.cells.map((x) => (x >= 0 ? 1 : 0)).join('') + st.turn + st.cram;
    if (memo.has(k)) return memo.get(k);
    let w = false;
    for (const mv of DOM.moves(st)) { const y = DOM.clone(st); DOM.apply(y, mv); if (!wins(y)) { w = true; break; } }
    memo.set(k, w);
    return w;
  };
  let checked = 0;
  for (let g = 0; g < 30; g++) {
    const s = DOM.create({ R: 4, C: 4, first: g % 2, cram: g % 3 === 0 });
    // a couple of random opening moves, then the AI must convert any winning position
    for (let i = 0; i < 2 && !DOM.isOver(s); i++) { const ms = DOM.moves(s); DOM.apply(s, ms[Math.floor(Math.random() * ms.length)]); }
    if (DOM.isOver(s) || !wins(s)) continue;
    const m = DOM.aiMove(s, 'hard', { time: 400 });
    const y = DOM.clone(s); DOM.apply(y, m);
    assert.equal(wins(y), false, `lost a won position with ${JSON.stringify(m)}`);
    checked++;
  }
  assert.ok(checked > 5);
});

test('easy and normal beat random play on 6×6 (hard is tested against easy)', () => {
  for (const level of ['easy', 'normal']) {
    let wins = 0;
    for (let i = 0; i < 60; i++) {
      const ai = i % 2, s = DOM.create({ R: 6, C: 6, first: (i >> 1) % 2 });
      while (!DOM.isOver(s)) {
        const ms = DOM.moves(s);
        DOM.apply(s, s.turn === ai ? DOM.aiMove(s, level, { time: 60 }) : ms[Math.floor(Math.random() * ms.length)]);
      }
      if (DOM.winner(s) === ai) wins++;
    }
    assert.ok(wins >= (level === 'easy' ? 48 : 56), `${level} beat random only ${wins}/60`);
  }
});

test('red may open: the first mover is free, the orientation stays tied to the colour', () => {
  const s = DOM.create({ R: 4, C: 4, first: 1 });
  assert.equal(s.turn, 1);
  assert.ok(!DOM.isLegal(s, { r: 0, c: 0, o: 'h' }));
  DOM.apply(s, { r: 0, c: 0, o: 'v' });
  assert.equal(s.turn, 0);
  assert.deepEqual(s.pieces[0], { p: 1, r: 0, c: 0, o: 'v' });
});

test('no moves after the end; winner is -1 mid-game; AI returns null when stuck', () => {
  const s = DOM.create({ R: 2, C: 2 });
  assert.equal(DOM.winner(s), -1);
  DOM.apply(s, { r: 1, c: 0, o: 'h' });
  assert.equal(DOM.winner(s), 0);
  assert.deepEqual(DOM.moves(s), []);
  assert.throws(() => DOM.apply(s, { r: 0, c: 0, o: 'v' }));
  for (const level of ['easy', 'normal', 'hard']) assert.equal(DOM.aiMove(s, level), null);
});

test('clone is independent and safe spots work for the vertical player', () => {
  const s = DOM.create({ R: 5, C: 1 });
  assert.equal(DOM.safeSpots(s, 1), 2);
  assert.equal(DOM.safeSpots(s, 0), 0);
  const c = DOM.clone(s);
  c.turn = 1;
  DOM.apply(c, { r: 0, c: 0, o: 'v' });
  assert.equal(c.pieces.length, 1);
  assert.equal(s.turn, 0);
  assert.equal(s.pieces.length, 0);
  assert.ok(s.cells.every((x) => x < 0));
});

test('hard AI keeps the win on tiny boards solved by brute force', () => {
  // Tiny boards solved by brute force: from every won start the AI's move must keep the win.
  const wins = (st) => DOM.moves(st).some((mv) => { const y = DOM.clone(st); DOM.apply(y, mv); return !wins(y); });
  for (const [R, C] of [[2, 3], [3, 2], [3, 4]]) for (const first of [0, 1]) {
    const s = DOM.create({ R, C, first });
    if (!wins(s)) continue;
    for (let k = 0; k < 5; k++) {
      const y = DOM.clone(s); DOM.apply(y, DOM.aiMove(s, 'hard', { time: 200 }));
      assert.equal(wins(y), false, `${R}x${C} first ${first}`);
    }
  }
});
