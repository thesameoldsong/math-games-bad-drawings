import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UTTT } from './engine.js';

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

const at = (b, c) => b * 9 + c;
// Plays a list of [board, cell] moves, asserting each is legal.
function play(s, list) {
  for (const [b, c] of list) {
    assert.ok(UTTT.isLegal(s, at(b, c)), `illegal ${b}/${c} (next=${s.next})`);
    UTTT.apply(s, at(b, c));
  }
  return s;
}

test('first move can go anywhere, then the cell sends the opponent to that board', () => {
  const s = UTTT.create();
  assert.equal(UTTT.legalMoves(s).length, 81);
  UTTT.apply(s, at(4, 2));
  assert.equal(s.turn, 1);
  assert.deepEqual(UTTT.targets(s), [2]);
  assert.equal(UTTT.legalMoves(s).length, 9);
  assert.ok(!UTTT.isLegal(s, at(4, 0)));
  assert.ok(UTTT.isLegal(s, at(2, 4)));
});

test('three in a row wins a mini-board, which then closes and frees whoever is sent there', () => {
  const t = UTTT.create();
  t.cells[at(0, 0)] = 0; t.cells[at(0, 1)] = 0;
  t.next = 0; t.turn = 0;
  assert.equal(UTTT.apply(t, at(0, 2)), 0);
  assert.equal(t.boards[0], 0);
  assert.deepEqual(t.boardLines[0], [0, 1, 2]);
  // O must play on board 2
  assert.deepEqual(UTTT.targets(t), [2]);
  UTTT.apply(t, at(2, 0));     // O sends X to the closed board 0 → free choice
  assert.equal(t.next, -1);
  const tg = UTTT.targets(t);
  assert.equal(tg.length, 8);
  assert.ok(!tg.includes(0));
  assert.ok(UTTT.legalMoves(t).every((m) => ((m / 9) | 0) !== 0));
});

test('a full mini-board without a line is dead and closed', () => {
  const s = UTTT.create();
  // X O X / X O O / O X _  — last cell X makes no line
  const pat = [0, 1, 0, 0, 1, 1, 1, 0];
  pat.forEach((p, i) => (s.cells[at(3, i)] = p));
  s.turn = 0; s.next = 3;
  assert.equal(UTTT.apply(s, at(3, 8)), 2);
  assert.equal(s.boards[3], 2);
  // O is sent to board 8 (open)
  assert.deepEqual(UTTT.targets(s), [8]);
});

test('three won boards in a row win the game', () => {
  const s = UTTT.create();
  s.boards[0] = 0; s.boards[4] = 0;
  s.cells[at(8, 0)] = 0; s.cells[at(8, 4)] = 0;
  s.turn = 0; s.next = 8;
  UTTT.apply(s, at(8, 8));
  assert.equal(s.winner, 0);
  assert.deepEqual(s.line, [0, 4, 8]);
  assert.equal(UTTT.legalMoves(s).length, 0);
});

test('dead boards count for both only with the shared-territory option', () => {
  for (const shared of [false, true]) {
    const s = UTTT.create({ shared });
    s.boards[0] = 1; s.boards[1] = 1; s.boards[2] = 2;
    s.boards[3] = 0; s.boards[4] = 0;
    s.cells[at(5, 0)] = 0; s.cells[at(5, 1)] = 0;
    s.turn = 0; s.next = 5;
    UTTT.apply(s, at(5, 2));
    // X completes 3-4-5 either way
    assert.equal(s.winner, 0);
  }
  const s = UTTT.create({ shared: true });
  s.boards[0] = 1; s.boards[1] = 1;
  // O fills board 2 to a dead board → completes O's top row with shared territory
  [0, 1, 0, 0, 1, 1, 1, 0].forEach((p, i) => (s.cells[at(2, i)] = p));
  s.turn = 0; s.next = 2;
  UTTT.apply(s, at(2, 8));
  assert.equal(s.boards[2], 2);
  assert.equal(s.winner, 1);
  assert.deepEqual(s.line, [0, 1, 2]);
});

test('the game stops as a tie when no three-in-a-row is possible', () => {
  const s = UTTT.create();
  // X O X / O X O / O X _ pattern of board owners, last board decides nothing
  const owners = [0, 1, 0, 1, 1, 0, 0, 0, 1];
  owners.forEach((o, b) => (s.boards[b] = o));
  s.boards[8] = -1; s.boards[4] = 1; // leaves only board 8 open
  // lines through 8: [6,7,8] X X _, [2,5,8] X X _, [0,4,8] X O _ → still possible for X
  assert.ok(UTTT.canStillLine(s, 0));
  const t = UTTT.create();
  [0, 1, 0, 1, 1, 0, 0, 0, 1].forEach((o, b) => (t.boards[b] = o));
  t.boards[8] = -1; t.boards[5] = 1; t.boards[7] = 1; t.boards[4] = 2;
  t.cells[at(8, 0)] = 0; t.turn = 1; t.next = 8;
  UTTT.apply(t, at(8, 1));
  assert.equal(t.winner, 2);
});

test('majority and single-board variants', () => {
  const m = UTTT.create({ win: 'majority' });
  for (let b = 0; b < 8; b++) m.boards[b] = b < 4 ? 0 : b < 7 ? 1 : 2;
  m.cells[at(8, 0)] = 1; m.cells[at(8, 1)] = 1; m.turn = 1; m.next = 8;
  UTTT.apply(m, at(8, 2));       // O wins board 8 → 4 : 4 → tie
  assert.equal(m.winner, 2);

  const s = UTTT.create({ win: 'single' });
  s.cells[at(6, 2)] = 1; s.cells[at(6, 4)] = 1; s.turn = 1; s.next = 6;
  UTTT.apply(s, at(6, 6));
  assert.equal(s.winner, 1);
});

test('AI only plays legal moves and AI-vs-AI games finish', () => {
  for (const rules of [{}, { win: 'majority' }, { win: 'single' }, { shared: true }]) {
    for (const [a, b] of [['easy', 'normal'], ['normal', 'hard']]) {
      const s = UTTT.create(rules);
      let guard = 0;
      while (!UTTT.isOver(s)) {
        const m = UTTT.aiMove(s, s.turn === 0 ? a : b, { iters: 400 });
        assert.ok(UTTT.isLegal(s, m), `illegal AI move ${m}`);
        UTTT.apply(s, m);
        assert.ok(++guard <= 81);
      }
      assert.ok([0, 1, 2].includes(s.winner));
    }
  }
});

test('the AI takes an immediate game win', () => {
  const s = UTTT.create();
  s.boards[0] = 1; s.boards[1] = 1;
  s.cells[at(2, 0)] = 1; s.cells[at(2, 1)] = 1;
  s.turn = 1; s.next = 2;
  for (const lv of ['normal', 'hard']) assert.equal(UTTT.aiMove(s, lv, { iters: 300 }), at(2, 2));
});

test('normal AI beats easy AI most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 8; i++) {
    const s = UTTT.create();
    const me = i % 2;
    while (!UTTT.isOver(s)) UTTT.apply(s, UTTT.aiMove(s, s.turn === me ? 'normal' : 'easy'));
    if (s.winner === me) wins++;
  }
  assert.ok(wins >= 5, `normal won only ${wins}/8`);
});

test('isLegal rejects junk, occupied cells and anything after the game is over', () => {
  const s = UTTT.create();
  for (const m of [-1, 81, 1.5, '4', null, undefined, NaN]) assert.ok(!UTTT.isLegal(s, m), String(m));
  UTTT.apply(s, at(4, 4));
  assert.ok(!UTTT.isLegal(s, at(4, 4)), 'occupied');
  assert.ok(UTTT.isLegal(s, at(4, 0)), 'sent back to the same board');
  const w = UTTT.create({ win: 'single' });
  play(w, [[0, 0], [0, 3], [3, 0], [0, 4], [4, 0], [0, 5]]);
  assert.equal(w.winner, 1);
  assert.equal(UTTT.legalMoves(w).length, 0);
  assert.ok(!UTTT.isLegal(w, at(5, 0)));
});

test('being sent to a dead board gives a free choice among open boards only', () => {
  const s = UTTT.create();
  s.boards[4] = 2; s.boards[0] = 1;
  s.cells[at(7, 0)] = 0; s.turn = 1; s.next = 7;
  UTTT.apply(s, at(7, 4));
  assert.equal(s.next, -1);
  assert.deepEqual(UTTT.targets(s), [1, 2, 3, 5, 6, 7, 8]);
});

test('majority does not end while boards are still open; single ties only when all are dead', () => {
  const m = UTTT.create({ win: 'majority' });
  for (let b = 0; b < 5; b++) m.boards[b] = 0;
  m.turn = 1; m.next = 8;
  UTTT.apply(m, at(8, 0));
  assert.equal(m.winner, -1);
  const s = UTTT.create({ win: 'single' });
  for (let b = 0; b < 8; b++) s.boards[b] = 2;
  [0, 1, 0, 0, 1, 1, 1, 0].forEach((p, i) => (s.cells[at(8, i)] = p));
  s.turn = 0; s.next = 8;
  UTTT.apply(s, at(8, 8));
  assert.equal(s.winner, 2);
});

test('state survives a JSON round-trip (online sync)', () => {
  const s = UTTT.create({ shared: true });
  play(s, [[4, 0], [0, 4], [4, 1], [1, 4], [4, 2]]);
  const r = JSON.parse(JSON.stringify(s));
  assert.deepEqual(UTTT.legalMoves(r), UTTT.legalMoves(s));
  UTTT.apply(r, UTTT.legalMoves(r)[0]);
  assert.equal(r.moves, 6);
});

test('normal and hard AI never send the opponent to a board that wins them the game', () => {
  // O owns boards 0 and 1 and has two in a row on board 2. X must play on board 5;
  // playing cell 2 there would send O to board 2 and lose at once.
  const s = UTTT.create();
  s.boards[0] = 1; s.boards[1] = 1;
  s.cells[at(2, 0)] = 1; s.cells[at(2, 1)] = 1;
  s.turn = 0; s.next = 5;
  for (const lv of ['normal', 'hard']) {
    for (let i = 0; i < 3; i++) {
      const m = UTTT.aiMove(s, lv, { iters: lv === 'hard' ? 4000 : undefined });
      assert.notEqual(m, at(5, 2), lv);
    }
  }
});

test('every AI level beats a random mover clearly', () => {
  const rnd = (s) => { const l = UTTT.legalMoves(s); return l[Math.floor(Math.random() * l.length)]; };
  for (const lv of ['easy', 'normal']) {
    let wins = 0;
    for (let i = 0; i < 10; i++) {
      const s = UTTT.create();
      const me = i % 2;
      while (!UTTT.isOver(s)) UTTT.apply(s, s.turn === me ? UTTT.aiMove(s, lv) : rnd(s));
      if (s.winner === me) wins++;
    }
    assert.ok(wins >= 7, `${lv} won only ${wins}/10 vs random`);
  }
});
