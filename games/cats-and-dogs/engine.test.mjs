import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAD } from './engine.js';

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

const at = (s, r, c) => r * s.n + c;

test('cats and dogs may not touch, even diagonally', () => {
  const s = CAD.create({ size: 7 });
  CAD.apply(s, at(s, 3, 3)); // cat
  assert.equal(s.turn, 1);
  for (const [r, c] of [[2, 2], [2, 3], [2, 4], [3, 2], [3, 4], [4, 2], [4, 3], [4, 4]]) assert.equal(CAD.legal(s, at(s, r, c)), false);
  assert.equal(CAD.legal(s, at(s, 3, 3)), false, 'occupied');
  assert.equal(CAD.legal(s, at(s, 1, 1)), true);
  assert.throws(() => CAD.apply(s, at(s, 2, 2)));
  CAD.apply(s, at(s, 1, 1)); // dog
  // a cat may sit next to a cat
  assert.equal(CAD.legal(s, at(s, 3, 4)), true);
  assert.equal(CAD.legal(s, at(s, 2, 2)), false, 'touches the dog');
});

test('orthogonal-only neighbourhood allows diagonal contact', () => {
  const s = CAD.create({ size: 5, diag: false });
  CAD.apply(s, at(s, 2, 2));
  assert.equal(CAD.legal(s, at(s, 1, 1)), true);
  assert.equal(CAD.legal(s, at(s, 1, 2)), false);
});

test('Col rule forbids same-species neighbours instead', () => {
  const s = CAD.create({ size: 5, rule: 'col' });
  CAD.apply(s, at(s, 2, 2)); // cat
  assert.equal(CAD.legal(s, at(s, 2, 3)), true, 'dog may touch the cat');
  CAD.apply(s, at(s, 0, 0)); // dog
  assert.equal(CAD.legal(s, at(s, 2, 3)), false, 'cat may not touch a cat');
  assert.equal(CAD.legal(s, at(s, 0, 1)), true, 'cat may touch a dog');
});

test('the player who cannot move loses', () => {
  // 2x2 board: any cat blocks every other square for dogs
  const s = CAD.create({ size: 2 });
  CAD.apply(s, 0);
  assert.equal(CAD.isOver(s), true);
  assert.equal(s.winner, 0);
  assert.equal(CAD.legal(s, 3), false, 'no moves after the end');
  // dogs start
  const d = CAD.create({ size: 2, first: 1 });
  CAD.apply(d, 3);
  assert.equal(d.winner, 1);
});

test('counts classify squares', () => {
  const s = CAD.create({ size: 5 });
  CAD.apply(s, at(s, 0, 0));
  const c = CAD.counts(s);
  assert.equal(c.own[0], 3);       // three neighbours only cats can use
  assert.equal(c.both, 21);
  assert.equal(c.avail[0], 24);
  assert.equal(c.avail[1], 21);
});

test('mirror strategy: centre then point reflection, and it wins', () => {
  for (let g = 0; g < 8; g++) {
    const s = CAD.create({ size: 7 });
    assert.equal(CAD.mirrorMove(s), 24);
    while (!CAD.isOver(s)) {
      if (s.turn === 0) {
        const m = CAD.mirrorMove(s);
        assert.ok(m >= 0, 'mirror reply exists');
        CAD.apply(s, m);
      } else CAD.apply(s, CAD.aiMove(s, g % 2 ? 'normal' : 'easy', { timeMs: 50 }));
    }
    assert.equal(s.winner, 0);
  }
});

test('AI never makes illegal moves and games terminate', () => {
  const levels = ['easy', 'normal', 'hard'];
  for (const rule of ['snort', 'col']) for (const size of [5, 7]) for (let g = 0; g < 3; g++) {
    const s = CAD.create({ size, rule, diag: g !== 2, first: g % 2 });
    let guard = 0;
    while (!CAD.isOver(s)) {
      const m = CAD.aiMove(s, levels[(s.moves + g) % 3], { timeMs: 40 });
      assert.ok(CAD.legal(s, m), `legal ${m}`);
      CAD.apply(s, m);
      assert.ok(++guard <= size * size);
    }
    assert.ok(s.winner === 0 || s.winner === 1);
    assert.equal(CAD.movesFor(s, s.turn).length, 0);
  }
});

// Exhaustive solver for tiny boards: does the player to move win?
function wins(s, memo = new Map()) {
  const k = s.cells.join(',') + s.turn;
  if (memo.has(k)) return memo.get(k);
  let r = false;
  for (const m of CAD.movesFor(s, s.turn)) {
    const t = CAD.clone(s); CAD.apply(t, m);
    if (t.winner === s.turn || !wins(t, memo)) { r = true; break; }
  }
  memo.set(k, r);
  return r;
}

test('hard AI finds a winning move whenever one exists (4x4 positions)', () => {
  let rnd = 7;
  const R = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648);
  let checked = 0;
  for (let g = 0; g < 40; g++) {
    const s = CAD.create({ size: 4, rule: g % 4 === 3 ? 'col' : 'snort', diag: g % 3 !== 2, first: g % 2 });
    const plies = 1 + Math.floor(R() * 4);
    for (let k = 0; k < plies && !CAD.isOver(s); k++) { const ms = CAD.movesFor(s, s.turn); CAD.apply(s, ms[Math.floor(R() * ms.length)]); }
    if (CAD.isOver(s) || !wins(s)) continue;
    const m = CAD.aiMove(s, 'hard', { timeMs: 2000 });
    const t = CAD.clone(s); CAD.apply(t, m);
    assert.ok(t.winner === s.turn || !wins(t), `hard missed a win in game ${g}`);
    checked++;
  }
  assert.ok(checked >= 10);
});

test('hard beats easy most of the time (as second player too)', () => {
  let wins = 0;
  for (let i = 0; i < 10; i++) {
    const s = CAD.create({ size: 6, first: i % 2 });
    while (!CAD.isOver(s)) CAD.apply(s, CAD.aiMove(s, s.turn === 0 ? 'hard' : 'easy', { timeMs: 40 }));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 8, `hard won only ${wins}/10`);
});

test('normal beats easy more often than not', () => {
  let wins = 0;
  for (let i = 0; i < 12; i++) {
    const s = CAD.create({ size: 7, first: i % 2 });
    while (!CAD.isOver(s)) CAD.apply(s, CAD.aiMove(s, s.turn === 0 ? 'normal' : 'easy', { timeMs: 40 }));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 8, `normal won only ${wins}/12`);
});

test('mirror strategy also wins with side-only neighbours, other odd sizes, dogs first', () => {
  for (const [size, diag, first] of [[5, false, 1], [9, true, 1], [7, false, 0], [5, true, 1]]) {
    for (let g = 0; g < 4; g++) {
      const s = CAD.create({ size, diag, first });
      while (!CAD.isOver(s)) {
        if (s.turn === first) {
          const m = CAD.mirrorMove(s);
          assert.ok(m >= 0, `mirror reply exists (${size}, ${diag})`);
          CAD.apply(s, m);
        } else {
          const ms = CAD.movesFor(s, s.turn);
          CAD.apply(s, g % 2 ? ms[Math.floor(Math.random() * ms.length)] : CAD.aiMove(s, 'normal', { timeMs: 20 }));
        }
      }
      assert.equal(s.winner, first);
    }
  }
});

test('mirrorMove declines when the strategy does not apply', () => {
  assert.equal(CAD.mirrorMove(CAD.create({ size: 6 })), -1, 'even board');
  assert.equal(CAD.mirrorMove(CAD.create({ size: 7, rule: 'col' })), -1, 'Col');
  const s = CAD.create({ size: 7 });
  CAD.apply(s, 0);                 // cat in a corner, centre still empty
  assert.equal(CAD.mirrorMove(s), -1, 'second player does not own the centre');
  const u = CAD.create({ size: 7 });
  CAD.apply(u, 24); CAD.apply(u, 0); CAD.apply(u, 40); // cats leave the mirror line themselves
  CAD.apply(u, 6);
  assert.equal(CAD.mirrorMove(u), -1, 'asymmetric position');
});

test('legal rejects junk input and moves after the end', () => {
  const s = CAD.create({ size: 5 });
  for (const m of [-1, 25, 1.5, '3', null, undefined, NaN]) assert.equal(CAD.legal(s, m), false, String(m));
  const t = CAD.create({ size: 2 });
  CAD.apply(t, 0);
  assert.equal(CAD.movesFor(t, 1).length, 0);
  assert.throws(() => CAD.apply(t, 3));
});

test('Col status: cats may not touch cats, dogs still may', () => {
  const s = CAD.create({ size: 3, rule: 'col' });
  CAD.apply(s, 4);                 // cat in the middle of 3x3
  const st = CAD.status(s);
  assert.deepEqual(st.filter((v) => v >= 0), new Array(8).fill(2), 'only dogs can use the ring');
  assert.equal(s.turn, 1);
  assert.equal(CAD.isOver(s), false);
});

test('every level clearly beats random play', () => {
  const rnd = (s) => { const ms = CAD.movesFor(s, s.turn); return ms[Math.floor(Math.random() * ms.length)]; };
  for (const [level, rule, need] of [['easy', 'snort', 13], ['normal', 'snort', 18], ['normal', 'col', 17], ['hard', 'snort', 18]]) {
    let w = 0;
    for (let i = 0; i < 20; i++) {
      const s = CAD.create({ size: 6, rule, first: i % 2 });
      while (!CAD.isOver(s)) CAD.apply(s, s.turn === 1 ? CAD.aiMove(s, level, { timeMs: 15 }) : rnd(s));
      if (s.winner === 1) w++;
    }
    assert.ok(w >= need, `${level}/${rule} won only ${w}/20 vs random`);
  }
});

test('a JSON round trip (as sent online) keeps the position playable', () => {
  const s = CAD.create({ size: 5, diag: false, first: 1 });
  CAD.apply(s, 12); CAD.apply(s, 0);
  const r = JSON.parse(JSON.stringify(s));
  assert.deepEqual(CAD.movesFor(r, r.turn), CAD.movesFor(s, s.turn));
  assert.equal(CAD.mirrorMove(r), CAD.mirrorMove(s));
  CAD.apply(r, CAD.aiMove(r, 'hard', { timeMs: 30 }));
  assert.equal(r.moves, 3);
});

test('status and counts agree with movesFor on random positions (both rules, both neighbourhoods)', () => {
  for (let g = 0; g < 40; g++) {
    const s = CAD.create({ size: 4 + (g % 5), rule: g % 2 ? 'col' : 'snort', diag: g % 3 !== 0, first: g % 2 });
    while (!CAD.isOver(s)) {
      const st = CAD.status(s), c = CAD.counts(s);
      for (const p of [0, 1]) {
        const ms = CAD.movesFor(s, p);
        assert.equal(c.avail[p], ms.length);
        for (const i of ms) assert.ok(st[i] & (1 << p));
      }
      assert.equal(c.own[0] + c.own[1] + c.both + c.dead, s.cells.filter((v) => v < 0).length);
      const ms = CAD.movesFor(s, s.turn);
      CAD.apply(s, ms[(g * 7 + s.moves * 13) % ms.length]);
    }
    assert.equal(CAD.movesFor(s, s.turn).length, 0, 'the loser really is stuck');
    assert.ok(s.moves > 0 && s.winner === 1 - s.turn);
  }
});
