import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QTT } from './engine.js';

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

const P = (a, b) => ({ t: 'place', a, b });
const C = (c) => ({ t: 'collapse', c });
const play = (s, moves) => moves.forEach((m) => QTT.apply(s, m));

test('placing marks alternates turns and numbers marks', () => {
  const s = QTT.create();
  play(s, [P(0, 1), P(1, 2)]);
  assert.equal(s.turn, 0);
  assert.deepEqual(s.marks.map((m) => [m.p, m.n]), [[0, 1], [1, 2]]);
  assert.equal(s.phase, 'place');
  assert.equal(QTT.legalMoves(s).length, 36);
});

test('both halves must go in two different non-classical cells', () => {
  const s = QTT.create();
  assert.equal(QTT.isLegal(s, P(3, 3)), false);
  assert.throws(() => QTT.apply(s, P(4, 4)));
  play(s, [P(0, 1), P(0, 1), C(0)]);
  assert.equal(QTT.isLegal(s, P(0, 5)), false);
  assert.equal(QTT.isLegal(s, P(2, 5)), true);
});

test('a loop of two marks: the other player chooses and both resolve', () => {
  const s = QTT.create();
  play(s, [P(0, 1), P(0, 1)]);
  assert.equal(s.phase, 'collapse');
  assert.equal(s.turn, 0, 'X did not close the loop, so X chooses');
  assert.deepEqual(QTT.legalMoves(s), [C(0), C(1)]);
  assert.equal(QTT.isLegal(s, P(2, 3)), false);
  QTT.apply(s, C(0)); // O2 goes to 0, so X1 is forced into 1
  assert.deepEqual(s.cls[0], { p: 1, n: 2 });
  assert.deepEqual(s.cls[1], { p: 0, n: 1 });
  assert.equal(s.phase, 'place');
  assert.equal(s.turn, 0, 'the chooser then makes the next placement');
});

test('collapse forces a three-cycle and the marks hanging off it', () => {
  const s = QTT.create();
  // X1: 0-1, O2: 1-2, X3: 2-8 (tail), O4: 5-8 (tail of tail), X5: 0-2 closes loop 0-1-2
  play(s, [P(0, 1), P(1, 2), P(2, 8), P(5, 8), P(0, 2)]);
  assert.equal(s.phase, 'collapse');
  assert.deepEqual(new Set(QTT.cycle(s).cells), new Set([0, 1, 2]));
  assert.deepEqual(new Set(QTT.cycle(s).marks), new Set([1, 2, 5]));
  const prev = QTT.previewCollapse(s, 2);
  QTT.apply(s, C(2)); // X5 → 2, O2 → 1, X1 → 0; X3 kicked out of 2 → 8; O4 kicked out of 8 → 5
  assert.deepEqual(s.cls.map((c) => c && c.n), [1, 2, 5, null, null, 4, null, null, 3]);
  assert.equal(prev.length, 5);
  // X has 0,2 + … no line yet: 0,1,2 = X1,O2,X5
  assert.equal(s.over, false);
  assert.equal(QTT.open(s).length, 0);
});

test('unrelated marks stay spooky after a collapse', () => {
  const s = QTT.create();
  play(s, [P(0, 1), P(6, 7), P(0, 1), C(1)]);
  assert.equal(QTT.open(s).length, 1);
  assert.equal(QTT.open(s)[0].n, 2);
  assert.equal(s.cls[6], null);
});

test('three classical in a row wins', () => {
  const s = QTT.create();
  play(s, [P(0, 1), P(3, 4), P(0, 1)]); // X3 closes an all-X loop
  assert.equal(s.turn, 1);
  QTT.apply(s, C(0));
  assert.equal(s.cls[0].p, 0); assert.equal(s.cls[1].p, 0);
  play(s, [P(6, 7), P(2, 8), P(3, 4), C(3), P(2, 8)]); // X7 closes an all-X loop on 2-8
  assert.equal(s.phase, 'collapse');
  QTT.apply(s, C(2));
  assert.equal(s.over, true);
  assert.deepEqual(s.result.winners, [0]);
  assert.equal(s.result.pts[0], 1);
  assert.deepEqual(QTT.legalMoves(s), []);
});

function sharedBoard() {
  const t = QTT.create();
  t.cls = [{ p: 0, n: 1 }, { p: 0, n: 3 }, null, { p: 1, n: 2 }, { p: 1, n: 4 }, null, null, null, null];
  t.marks = [{ p: 0, n: 1, a: 0, b: 6, at: 0 }, { p: 1, n: 2, a: 3, b: 6, at: 3 }, { p: 0, n: 3, a: 1, b: 7, at: 1 }, { p: 1, n: 4, a: 4, b: 7, at: 4 }];
  return t;
}
test('simultaneous lines are a shared victory', () => {
  const t = sharedBoard();
  play(t, [P(2, 5), P(5, 2)]);
  assert.equal(t.phase, 'collapse');
  QTT.apply(t, C(5)); // O6 → 5, X5 → 2: X row 0-1-2 and O row 3-4-5
  assert.equal(t.over, true);
  assert.deepEqual(t.result.winners, [0, 1]);
  assert.equal(t.result.draw, false);
  const u = sharedBoard();
  play(u, [P(2, 5), P(5, 2), C(2)]); // O6 → 2, X5 → 5: nobody has a line, 3 free cells left
  assert.equal(u.over, false);
});

// X O X / X O O / O ? ?  with X8 spooky in 7-8; O closes the loop 7-8.
function drawBoard() {
  const s = QTT.create();
  s.cls = [0, 1, 0, 0, 1, 1, 1].map((p, i) => ({ p, n: i + 1 })).concat([null, null]);
  s.marks = s.cls.slice(0, 7).map((c, i) => ({ p: c.p, n: c.n, a: i, b: i, at: i }));
  s.marks.push({ p: 0, n: 8, a: 7, b: 8, at: -1 });
  s.turn = 1;
  QTT.apply(s, P(7, 8));
  return s;
}
test('eight-plus classical squares and no line is a draw; collapse choice matters', () => {
  const s = drawBoard();
  assert.equal(s.turn, 0, 'X chooses');
  QTT.apply(s, C(8)); // O9 → 8, X8 → 7
  assert.equal(s.over, true);
  assert.equal(s.result.draw, true);
  const t = drawBoard();
  QTT.apply(t, C(7)); // O9 → 7: column 1-4-7 is O's
  assert.deepEqual(t.result.winners, [1]);
});

test('a single free square left ends the game', () => {
  const s = QTT.create();
  s.cls = [0, 1, 0, 0, 1, 1, 1, 0].map((p, i) => ({ p, n: i + 1 })).concat([null]);
  s.marks = s.cls.slice(0, 8).map((c, i) => ({ p: c.p, n: c.n, a: i, b: i, at: i }));
  assert.deepEqual(QTT.freeCells(s), [8]);
  assert.equal(QTT.legalMoves(s).length, 0);
});

test('AI never makes an illegal move and games terminate', () => {
  for (const [a, b] of [['easy', 'easy'], ['normal', 'easy'], ['hard', 'normal'], ['easy', 'hard']]) {
    for (let g = 0; g < 3; g++) {
      const s = QTT.create({ first: g % 2 });
      let guard = 0;
      while (!s.over) {
        const mv = QTT.aiMove(s, s.turn === 0 ? a : b, { timeMs: 60 });
        assert.ok(QTT.isLegal(s, mv), JSON.stringify(mv));
        QTT.apply(s, mv);
        assert.ok(++guard < 40);
      }
      const classical = s.cls.filter(Boolean).length;
      assert.ok(s.result.winners.length || classical >= 8);
      assert.ok(s.marks.length <= 9);
    }
  }
});

test('AI picks the collapse that avoids handing over a line', () => {
  for (const lvl of ['normal', 'hard']) {
    for (let i = 0; i < 5; i++) {
      const s = drawBoard();
      assert.deepEqual(QTT.aiMove(s, lvl, { timeMs: 50 }), C(8));
    }
  }
});

test('normal AI blocks or wins against random play most of the time', () => {
  let score = 0;
  for (let g = 0; g < 16; g++) {
    const s = QTT.create({ first: g % 2 });
    while (!s.over) QTT.apply(s, QTT.aiMove(s, s.turn === 0 ? 'normal' : 'random'));
    score += s.result.pts[0] - s.result.pts[1];
  }
  assert.ok(score > 4, `normal vs random net ${score}`);
});

test('random games keep the board consistent after every move', () => {
  for (let g = 0; g < 300; g++) {
    const s = QTT.create({ first: g % 2, coin: g % 3 === 0 });
    while (!s.over) {
      const moves = QTT.legalMoves(s);
      assert.ok(moves.length > 0, 'a live game always has a legal move');
      for (const mv of moves) assert.ok(QTT.isLegal(s, mv));
      const before = QTT.clone(s);
      QTT.apply(s, moves[Math.floor(Math.random() * moves.length)]);
      assert.deepEqual(before.cls.filter(Boolean).length <= s.cls.filter(Boolean).length, true);
      // resolved marks sit exactly where the board says, spooky marks never touch a classical square
      s.marks.forEach((m) => {
        if (m.at >= 0) assert.deepEqual(s.cls[m.at], { p: m.p, n: m.n });
        else assert.ok(!s.cls[m.a] && !s.cls[m.b]);
      });
      assert.equal(s.cls.filter(Boolean).length, s.marks.filter((m) => m.at >= 0).length);
      // outside a pending collapse, spooky marks form a forest (no loop left unresolved)
      if (s.phase === 'place') assert.ok(QTT.open(s).length <= QTT.freeCells(s).length - 1 || QTT.open(s).length === 0);
      else assert.ok(QTT.cycle(s).marks.includes(s.pending));
      // the player who closed a loop never decides it
      if (s.phase === 'collapse') assert.notEqual(QTT.markN(s, s.pending).p, s.turn);
    }
    const free = QTT.freeCells(s).length;
    assert.ok(s.result.lines.length > 0 || free < 2);
    assert.equal(s.result.draw, s.result.winners.length === 0);
    if (s.result.draw) assert.equal(s.result.lines.length, 0);
  }
});

test('malformed or out-of-phase moves are rejected', () => {
  const s = QTT.create();
  for (const mv of [null, {}, P(-1, 2), P(0, 9), P(0.5, 2), P('0', 1), C(0), { t: 'place', a: 0 }]) assert.equal(QTT.isLegal(s, mv), false);
  play(s, [P(0, 1), P(0, 1)]);
  assert.equal(QTT.isLegal(s, C(2)), false);
  assert.equal(QTT.isLegal(s, P(3, 4)), false);
});

test('clone is deep: playing on a copy leaves the original alone', () => {
  const s = QTT.create();
  play(s, [P(0, 1), P(1, 2)]);
  const c = QTT.clone(s);
  play(c, [P(0, 2), C(0)]);
  assert.equal(s.marks.length, 2);
  assert.ok(s.cls.every((x) => x === null));
  assert.ok(s.marks.every((m) => m.at === -1));
});

test('a long loop through the whole board collapses every square', () => {
  const s = QTT.create();
  // a chain 0-1-2-…-8 (8 marks), then mark 9 joins 8 back to 0: a nine-square loop
  for (let i = 0; i < 8; i++) QTT.apply(s, P(i, i + 1));
  QTT.apply(s, P(8, 0));
  assert.equal(s.phase, 'collapse');
  assert.equal(QTT.cycle(s).cells.length, 9);
  assert.equal(s.turn, 1, 'O decides the loop X closed');
  QTT.apply(s, C(0));
  assert.equal(s.over, true);
  assert.equal(QTT.freeCells(s).length, 0);
});

test('AI levels clearly beat random play', () => {
  for (const [lvl, games, min] of [['easy', 60, 0.15], ['normal', 40, 0.5], ['hard', 16, 0.5]]) {
    let net = 0;
    for (let g = 0; g < games; g++) {
      const s = QTT.create({ first: g % 2 });
      while (!s.over) QTT.apply(s, QTT.aiMove(s, s.turn === 0 ? lvl : 'random', { timeMs: 40 }));
      net += Math.sign(s.result.pts[0] - s.result.pts[1]);
    }
    assert.ok(net / games >= min, `${lvl} vs random: net ${net}/${games}`);
  }
});
