import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HTL } from './engine.js';

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

const at = (s, r, c) => r * s.N + c;
const mv = (s, [r1, c1], [r2, c2]) => ({ from: at(s, r1, c1), to: at(s, r2, c2) });
const play = (s, ...segs) => { for (const [a, b] of segs) { const m = mv(s, a, b); assert.ok(HTL.isLegal(s, m), `legal ${a}->${b}`); HTL.apply(s, m); } return s; };

test('first move: any straight line of any length, no knight-ish or bent lines', () => {
  const s = HTL.create();
  assert.equal(HTL.moves(s).length, 76);
  assert.ok(HTL.isLegal(s, mv(s, [0, 0], [3, 3])));
  assert.ok(HTL.isLegal(s, mv(s, [3, 0], [0, 3])));
  assert.ok(HTL.isLegal(s, mv(s, [1, 0], [1, 3])));
  assert.ok(!HTL.isLegal(s, mv(s, [0, 0], [1, 2])));
  assert.ok(!HTL.isLegal(s, mv(s, [0, 0], [0, 0])));
});

test('a long segment occupies the dots it passes through', () => {
  const s = play(HTL.create(), [[0, 0], [0, 3]]);
  for (let c = 0; c < 4; c++) assert.equal(s.vis[at(s, 0, c)], 1);
  // You may not start from a middle dot, nor touch the line.
  assert.ok(!HTL.isLegal(s, mv(s, [0, 1], [1, 1])));
  assert.ok(HTL.isLegal(s, mv(s, [0, 0], [3, 0])));
  assert.ok(HTL.isLegal(s, mv(s, [0, 3], [3, 0])));
});

test('cannot run over or end on the line, including its other end', () => {
  const s = play(HTL.create(), [[1, 0], [1, 2]], [[1, 2], [3, 2]]);
  // From (3,2) going up passes (2,2) then hits (1,2): stops before.
  assert.ok(HTL.isLegal(s, mv(s, [3, 2], [2, 2])) === false); // (2,2) is already on the line
  assert.ok(!HTL.isLegal(s, mv(s, [1, 0], [1, 3])));          // would pass through (1,1),(1,2)
  // Closing the loop back onto the other end is touching.
  const t = play(HTL.create(), [[0, 0], [0, 1]], [[0, 1], [1, 1]]);
  assert.ok(!HTL.isLegal(t, mv(t, [1, 1], [0, 0])));
});

test('diagonals may not cross each other', () => {
  const w = play(HTL.create(), [[0, 1], [1, 2]], [[1, 2], [1, 3]]);  // diagonal through square (0,1)
  // From (0,1) to (1,1)? orthogonal, ok. Then from (1,1) to (0,2) crosses (0,1)-(1,2).
  play(w, [[0, 1], [1, 1]]);
  assert.ok(!HTL.isLegal(w, mv(w, [1, 1], [0, 2])));
  assert.ok(!HTL.moves(w).some((m) => m.from === at(w, 1, 1) && m.to === at(w, 0, 2)));
  assert.ok(HTL.isLegal(w, mv(w, [1, 1], [2, 2])));
});

test('moves list matches isLegal (both ends, every direction)', () => {
  for (let i = 0; i < 40; i++) {
    const s = HTL.create({ variant: i % 3 === 0 ? 'lucas' : i % 3 === 1 ? 'sackson5' : 'sackson4' });
    while (!HTL.isOver(s)) {
      const ms = HTL.moves(s);
      const legal = new Set(ms.map((m) => m.from + '-' + m.to));
      const NN = s.N * s.N;
      if (s.ends) {
        for (let a = 0; a < NN; a++) for (let b = 0; b < NN; b++) {
          assert.equal(HTL.isLegal(s, { from: a, to: b }), legal.has(a + '-' + b), `${s.variant} ${a}-${b}`);
        }
      }
      HTL.apply(s, ms[Math.floor(Math.random() * ms.length)]);
    }
  }
});

test('Sackson: whoever draws the last segment loses', () => {
  // A full snake on 4×4 covering every dot leaves no extension.
  const s = HTL.create({ first: 0 });
  play(s, [[0, 0], [0, 3]], [[0, 3], [1, 3]], [[1, 3], [1, 0]], [[1, 0], [2, 0]], [[2, 0], [2, 3]], [[2, 3], [3, 3]], [[3, 3], [3, 0]]);
  assert.ok(HTL.isOver(s));
  // Player 0 drew segments 1,3,5,7 — the last one — and loses.
  assert.equal(s.turn, 1);
  assert.equal(HTL.winner(s), 1);
});

test('Lucas: one-step orthogonal moves from the newest end; last mover wins', () => {
  const s = HTL.create({ variant: 'lucas', first: 0 });
  assert.equal(s.N, 6);
  assert.ok(!HTL.isLegal(s, mv(s, [0, 0], [0, 2])));
  assert.ok(!HTL.isLegal(s, mv(s, [0, 0], [1, 1])));
  play(s, [[2, 2], [2, 3]]);
  // Second move may grow either end of the first segment.
  assert.ok(HTL.isLegal(s, mv(s, [2, 2], [2, 1])));
  assert.ok(HTL.isLegal(s, mv(s, [2, 3], [2, 4])));
  play(s, [[2, 3], [3, 3]]);
  // Now only the newest end (3,3) may grow.
  assert.ok(!HTL.isLegal(s, mv(s, [2, 2], [2, 1])));
  assert.ok(HTL.isLegal(s, mv(s, [3, 3], [4, 3])));
  // Corner trap: snake into a corner and the next player is stuck.
  const t = HTL.create({ variant: 'lucas', first: 0 });
  play(t, [[0, 1], [1, 1]], [[0, 1], [0, 0]], [[0, 0], [1, 0]], [[1, 0], [2, 0]]);
  assert.ok(!HTL.isOver(t));
  const u = HTL.create({ variant: 'lucas', first: 0 });
  play(u, [[1, 0], [1, 1]], [[1, 1], [0, 1]], [[0, 1], [0, 0]]);
  assert.ok(HTL.isOver(u));      // (0,0): neighbours (0,1),(1,0) both used
  assert.equal(HTL.winner(u), 0); // player 0 drew the last segment and wins
});

test('Lucas: the domino-tiling strategy really wins for the starter (solver agrees)', () => {
  const s = play(HTL.create({ variant: 'lucas' }), [[0, 0], [0, 1]]);
  assert.equal(HTL.evaluate(s, 5e6), false); // the player to move (second player) is lost
});

test('Sackson 4×4: the solver finds a winning first move', () => {
  const s = HTL.create();
  const wins = HTL.moves(s).filter((m) => { const c = HTL.clone(s); HTL.apply(c, m); return HTL.evaluate(c, 5e6) === false; });
  assert.ok(wins.length > 0);
});

test('AI never plays illegal moves and every game ends with a winner', () => {
  for (const variant of ['sackson4', 'sackson5', 'lucas']) {
    for (const [a, b] of [['easy', 'easy'], ['normal', 'easy'], ['hard', 'normal']]) {
      const s = HTL.create({ variant, first: 1 });
      let n = 0;
      while (!HTL.isOver(s)) {
        const m = HTL.aiMove(s, s.turn === 0 ? a : b);
        assert.ok(HTL.isLegal(s, m), `${variant} illegal ${JSON.stringify(m)}`);
        HTL.apply(s, m);
        assert.ok(++n < 100);
      }
      assert.ok([0, 1].includes(HTL.winner(s)));
    }
  }
});

test('hard AI beats easy AI almost always on 4×4', () => {
  let wins = 0;
  for (let i = 0; i < 12; i++) {
    const s = HTL.create({ first: i % 2 });
    while (!HTL.isOver(s)) HTL.apply(s, HTL.aiMove(s, s.turn === 0 ? 'hard' : 'easy'));
    if (HTL.winner(s) === 0) wins++;
  }
  assert.ok(wins >= 10, `hard won only ${wins}/12`);
});

test('hard AI as the starter wins 4×4 against anyone (it is a solved first-player win)', () => {
  for (let i = 0; i < 4; i++) {
    const s = HTL.create({ first: 0 });
    while (!HTL.isOver(s)) HTL.apply(s, HTL.aiMove(s, s.turn === 0 ? 'hard' : 'normal'));
    assert.equal(HTL.winner(s), 0);
  }
});

test('state survives JSON (online transfer)', () => {
  const s = play(HTL.create({ variant: 'lucas' }), [[2, 2], [2, 3]], [[2, 3], [3, 3]]);
  const r = JSON.parse(JSON.stringify(s));
  assert.deepEqual(HTL.moves(r), HTL.moves(s));
  assert.ok(HTL.isLegal(r, mv(r, [3, 3], [4, 3])));
});

// An independent, geometric statement of the rules: a segment from a growing end is legal iff it is
// straight (8 directions, or 4 with one step for Lucas), none of the dots it reaches is on the line yet,
// and no unit square it crosses diagonally already holds a diagonal.
function oracle(s) {
  const N = s.N, v = HTL.VARIANTS[s.variant], vis = new Set(), diags = new Set();
  const rc = (i) => [Math.floor(i / N), i % N];
  const sq = (r, c, dr, dc) => Math.min(r, r + dr) + ',' + Math.min(c, c + dc);
  for (const g of s.segs) {
    const [r1, c1] = rc(g.from), [r2, c2] = rc(g.to);
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1), L = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    for (let k = 0; k <= L; k++) vis.add((r1 + dr * k) + ',' + (c1 + dc * k));
    if (dr && dc) for (let k = 0; k < L; k++) diags.add(sq(r1 + dr * k, c1 + dc * k, dr, dc));
  }
  const D = v.diag ? [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]] : [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const out = [];
  for (const e of HTL.growEnds(s)) {
    const [er, ec] = rc(e);
    for (const [dr, dc] of D) for (let L = 1; L <= Math.min(v.maxLen, N); L++) {
      const tr = er + dr * L, tc = ec + dc * L;
      if (tr < 0 || tc < 0 || tr >= N || tc >= N) break;
      let ok = true;
      for (let k = 1; k <= L; k++) {
        if (vis.has((er + dr * k) + ',' + (ec + dc * k))) ok = false;
        if (dr && dc && diags.has(sq(er + dr * (k - 1), ec + dc * (k - 1), dr, dc))) ok = false;
      }
      if (ok) out.push(e + '-' + (tr * N + tc));
    }
  }
  return out.sort();
}

test('move generator agrees with an independent geometric oracle', () => {
  for (let i = 0; i < 300; i++) {
    const s = HTL.create({ variant: ['sackson4', 'sackson5', 'lucas'][i % 3] });
    const first = HTL.moves(s);
    HTL.apply(s, first[Math.floor(Math.random() * first.length)]);
    for (;;) {
      const mine = HTL.moves(s).map((m) => m.from + '-' + m.to).sort();
      assert.deepEqual(mine, oracle(s), `${s.variant} ${JSON.stringify(s.segs)}`);
      if (!mine.length) break;
      HTL.apply(s, HTL.moves(s)[Math.floor(Math.random() * mine.length)]);
    }
  }
});

test('Lucas: the snake cannot close onto its own tail and the stuck end ends the game', () => {
  const s = play(HTL.create({ variant: 'lucas' }), [[0, 0], [0, 1]], [[0, 1], [1, 1]], [[1, 1], [1, 0]]);
  assert.ok(!HTL.isLegal(s, mv(s, [1, 0], [0, 0])));   // (0,0) is the tail
  assert.ok(HTL.isLegal(s, mv(s, [1, 0], [2, 0])));
  assert.ok(!HTL.isLegal(s, mv(s, [0, 0], [0, 1])));   // the old end may no longer grow
});

test('a long diagonal blocks every crossing diagonal along it (5×5)', () => {
  const s = play(HTL.create({ variant: 'sackson5' }), [[0, 0], [4, 4]], [[4, 4], [4, 3]]);
  // From (4,3) the anti-diagonal step to (3,4) crosses the square (3,3)-(4,4) already crossed.
  assert.ok(!HTL.isLegal(s, mv(s, [4, 3], [3, 4])));
  assert.ok(HTL.isLegal(s, mv(s, [4, 3], [4, 0])));
});

test('AI moves are legal from random midgame positions, every level and board', () => {
  for (let i = 0; i < 60; i++) {
    const s = HTL.create({ variant: ['sackson4', 'sackson5', 'lucas'][i % 3] });
    const k = Math.floor(Math.random() * 8);
    for (let j = 0; j < k && !HTL.isOver(s); j++) { const ms = HTL.moves(s); HTL.apply(s, ms[Math.floor(Math.random() * ms.length)]); }
    if (HTL.isOver(s)) continue;
    for (const level of ['easy', 'normal', 'hard']) assert.ok(HTL.isLegal(s, HTL.aiMove(s, level)), `${s.variant} ${level}`);
  }
});

test('normal AI clearly beats random play on every board', () => {
  for (const variant of ['sackson4', 'sackson5', 'lucas']) {
    let wins = 0;
    const n = 40;
    for (let i = 0; i < n; i++) {
      const s = HTL.create({ variant, first: i % 2 });
      while (!HTL.isOver(s)) {
        const ms = HTL.moves(s);
        HTL.apply(s, s.turn === 0 ? HTL.aiMove(s, 'normal') : ms[Math.floor(Math.random() * ms.length)]);
      }
      if (HTL.winner(s) === 0) wins++;
    }
    assert.ok(wins >= n * 0.7, `${variant}: normal won only ${wins}/${n}`);
  }
});
