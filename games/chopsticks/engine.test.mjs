import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CS } from './engine.js';

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

const rng = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const st = (hands, turn = 0, opts = {}) => { const s = CS.create({ players: hands.length, ...opts }); s.hands = hands.map((h) => h.slice()); s.turn = turn; s.seen = { [CS.key(s)]: 1 }; return s; };

test('start position: one finger each, first player moves', () => {
  const s = CS.create();
  assert.deepEqual(s.hands, [[1, 1], [1, 1]]);
  assert.equal(s.turn, 0);
  assert.equal(CS.create({ first: 1 }).turn, 1);
  assert.deepEqual(CS.create({ start: 4 }).hands, [[4, 4], [4, 4]]);
});

test('tapping adds fingers; exactly five is out; more than five wraps', () => {
  assert.equal(CS.tapValue(1, 2), 3);
  assert.equal(CS.tapValue(3, 2), 0);
  assert.equal(CS.tapValue(3, 4), 2);
  assert.equal(CS.tapValue(4, 4), 3);
  assert.equal(CS.tapValue(3, 4, true), 0, 'cutoff: over five is out too');
  const s = st([[1, 3], [2, 4]]);
  CS.apply(s, { t: 'tap', h: 1, p: 1, to: 1 });
  assert.deepEqual(s.hands, [[1, 3], [2, 2]]);
  assert.equal(s.turn, 1);
});

test('dead hands cannot tap or be tapped', () => {
  const s = st([[0, 2], [0, 3]]);
  const ms = CS.moves(s);
  assert.ok(ms.filter((m) => m.t === 'tap').every((m) => m.h === 1 && m.to === 1));
  assert.equal(ms.filter((m) => m.t === 'tap').length, 1);
  assert.ok(!CS.isLegal(s, { t: 'tap', h: 0, p: 1, to: 1 }));
  assert.ok(!CS.isLegal(s, { t: 'tap', h: 1, p: 1, to: 0 }));
});

test('splits keep the total, may revive or kill a hand, never just swap', () => {
  assert.deepEqual(CS.splitsOf([1, 3]).map(String).sort(), ['0,4', '2,2', '4,0']);
  assert.deepEqual(CS.splitsOf([0, 4]).map(String).sort(), ['1,3', '2,2', '3,1']);
  assert.deepEqual(CS.splitsOf([0, 1]), [], 'only a swap is possible: no split');
  assert.deepEqual(CS.splitsOf([1, 1]), [[0, 2], [2, 0]]);
  assert.deepEqual(CS.splitsOf([4, 4]), [], 'eight fingers fit only as 4+4');
  assert.deepEqual(CS.splitsOf([2, 3]).map(String).sort(), ['1,4', '4,1']);
  const s = st([[0, 4], [1, 1]]);
  const info = CS.apply(s, { t: 'split', to: [2, 2] });
  assert.ok(info.revived);
  assert.deepEqual(s.hands[0], [2, 2]);
});

test('knocking out the last hand wins', () => {
  const s = st([[0, 2], [0, 3]]);
  const info = CS.apply(s, { t: 'tap', h: 1, p: 1, to: 1 });
  assert.equal(info.eliminated, 1);
  assert.equal(s.winner, 0);
  assert.ok(CS.isOver(s));
  assert.deepEqual(CS.moves(s), []);
});

test('third repetition of a position is a draw', () => {
  const s = st([[1, 1], [1, 1]]);
  // both players split back and forth: (1,1) -> (0,2) -> (1,1) ...
  const seq = [[0, 2], [0, 2], [1, 1], [1, 1], [0, 2], [0, 2], [1, 1], [1, 1]];
  let i = 0;
  while (!CS.isOver(s)) CS.apply(s, { t: 'split', to: seq[i++] });
  assert.equal(s.winner, -1);
  assert.equal(s.rep, 3);
  assert.ok(i <= 8);
});

test('three players: turns skip eliminated players, last one standing wins', () => {
  const s = st([[1, 1], [0, 4], [2, 2]]);
  CS.apply(s, { t: 'tap', h: 0, p: 1, to: 1 });
  assert.equal(s.hands[1][1], 0);
  assert.equal(s.winner, null);
  assert.equal(s.turn, 2, 'player 1 is out, player 2 moves next');
  assert.ok(CS.moves(s).every((m) => m.t !== 'tap' || m.p === 0));
  s.hands[0] = [0, 3];
  CS.apply(s, { t: 'tap', h: 0, p: 0, to: 1 });
  assert.equal(s.winner, 2);
});

test('solver: standard start is a draw, cutoff start is a loss for the first player', () => {
  assert.equal(CS.evaluate(CS.create()).v, 0);
  assert.equal(CS.evaluate(CS.create({ cutoff: true })).v, -1);
  // a lone single finger against 3+3: no split, the only tap makes a 4, and that 4 knocks out the 1
  assert.equal(CS.evaluate(st([[0, 1], [3, 3]])).v, -1);
  // immediate win available
  assert.deepEqual(CS.evaluate(st([[2, 0], [0, 3]])), { v: 1, d: 1 });
});

test('AI never makes illegal moves and takes an immediate win', () => {
  const r = rng(7);
  for (const level of ['easy', 'normal', 'hard']) {
    for (let g = 0; g < 30; g++) {
      const s = CS.create({ cutoff: g % 3 === 0, start: g % 4 === 0 ? 4 : 1 });
      for (let k = 0; k < 6; k++) { if (CS.isOver(s)) break; const ms = CS.moves(s); CS.apply(s, ms[Math.floor(r() * ms.length)]); }
      while (!CS.isOver(s)) {
        const m = CS.aiMove(s, level, r);
        assert.ok(CS.isLegal(s, m), `${level} illegal ${JSON.stringify(m)}`);
        CS.apply(s, m);
      }
    }
  }
  for (const level of ['normal', 'hard']) {
    const s = st([[2, 0], [0, 3]]);
    CS.apply(s, CS.aiMove(s, level, r));
    assert.equal(s.winner, 0, level);
  }
});

test('hard AI never loses a won position and never throws away a draw', () => {
  const r = rng(3);
  for (let g = 0; g < 40; g++) {
    const s = CS.create();
    while (!CS.isOver(s)) {
      if (s.turn === 0) {
        const before = CS.evaluate(s);
        const m = CS.aiMove(s, 'hard', r);
        const mv = CS.moveValue(s, m);
        assert.ok(mv.v >= before.v, 'hard AI made its position worse');
        CS.apply(s, m);
      } else CS.apply(s, CS.aiMove(s, g % 2 ? 'easy' : 'normal', r));
    }
    assert.notEqual(s.winner, 1, 'hard AI lost from a drawn start');
  }
});

test('full AI-vs-AI games terminate', () => {
  const r = rng(11);
  const levels = ['easy', 'normal', 'hard'];
  for (const a of levels) for (const b of levels) {
    const s = CS.create({ first: 0 });
    let n = 0;
    while (!CS.isOver(s)) { CS.apply(s, CS.aiMove(s, s.turn === 0 ? a : b, r)); assert.ok(++n < 2000); }
  }
});

test('random 4-player games terminate with a single winner or a draw', () => {
  const r = rng(5);
  for (let g = 0; g < 50; g++) {
    const s = CS.create({ players: 4 });
    let n = 0;
    while (!CS.isOver(s)) { const ms = CS.moves(s); CS.apply(s, ms[Math.floor(r() * ms.length)]); n++; }
    assert.ok(n < 5000);
    if (s.winner >= 0) assert.equal([0, 1, 2, 3].filter((p) => CS.alive(s, p)).length, 1);
  }
});

test('illegal moves are rejected: own hand, eliminated player, wrong split total, splitting into a five', () => {
  const s = st([[2, 3], [1, 1], [0, 0]]);
  assert.ok(!CS.isLegal(s, { t: 'tap', h: 0, p: 0, to: 1 }), 'no tapping your own hand');
  assert.ok(!CS.isLegal(s, { t: 'tap', h: 0, p: 2, to: 0 }), 'no tapping an eliminated player');
  assert.ok(!CS.isLegal(s, { t: 'split', to: [3, 3] }), 'split must keep the total');
  assert.ok(!CS.isLegal(s, { t: 'split', to: [0, 5] }), 'a split cannot make a five');
  assert.ok(!CS.isLegal(s, { t: 'split', to: [3, 2] }), 'a plain swap is not a move');
  assert.ok(CS.isLegal(s, { t: 'split', to: [1, 4] }));
  for (const pair of [[1, 2], [2, 2], [0, 3], [3, 4], [4, 4]]) for (const sp of CS.splitsOf(pair)) assert.ok(sp[0] < 5 && sp[1] < 5 && sp[0] + sp[1] === pair[0] + pair[1]);
});

test('repetition treats a hand pair as unordered', () => {
  const a = st([[1, 3], [2, 0]]), b = st([[3, 1], [0, 2]]);
  assert.equal(CS.key(a), CS.key(b));
  assert.notEqual(CS.key(a), CS.key(st([[1, 3], [2, 0]], 1)), 'who moves is part of the position');
});

test('solver agrees with the move generator on every two-player position', () => {
  const hs = [];
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (a || b) hs.push([a, b]);
  for (const cutoff of [false, true]) for (const A of hs) for (const B of hs) {
    const s = st([A, B], 0, { cutoff });
    const vals = CS.moves(s).map((m) => CS.moveValue(s, m).v);
    const want = vals.includes(1) ? 1 : vals.every((v) => v === -1) ? -1 : 0;
    assert.equal(CS.evaluate(s).v, want, `${cutoff} ${A} ${B}`);
  }
  // "Suns" (4 fingers each): a draw under the usual rules, a first-player win under cutoff
  assert.equal(CS.evaluate(CS.create({ start: 4 })).v, 0);
  assert.equal(CS.evaluate(CS.create({ start: 4, cutoff: true })).v, 1);
});

test('AI levels clearly beat random play, and normal beats easy', () => {
  const r = rng(21);
  const randomMove = (s) => { const ms = CS.moves(s); return ms[Math.floor(r() * ms.length)]; };
  const run = (level, other, games) => {
    let won = 0;
    for (let g = 0; g < games; g++) {
      const s = CS.create({ first: g % 2 });
      while (!CS.isOver(s)) CS.apply(s, s.turn === 0 ? CS.aiMove(s, level, r) : other(s));
      if (s.winner === 0) won++;
    }
    return won / games;
  };
  assert.ok(run('easy', randomMove, 100) > 0.65, 'easy vs random');
  assert.ok(run('normal', randomMove, 100) > 0.9, 'normal vs random');
  assert.ok(run('hard', randomMove, 100) > 0.9, 'hard vs random');
  assert.ok(run('normal', (s) => CS.aiMove(s, 'easy', r), 60) > 0.8, 'normal vs easy');
});
