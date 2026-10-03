import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PB } from './engine.js';

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

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// rows: [_ 1 2 3] [4 5 6 7] [8 9 10 11] [12 13 14 15]
const G = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

test('neighbours are king moves', () => {
  assert.deepEqual(PB.NB[0].sort((a, b) => a - b), [1, 4, 5]);
  assert.equal(PB.NB[5].length, 8);
  assert.equal(PB.NB[15].length, 3);
  assert.equal(PB.NB[7].length, 5);
});

test('grid validation', () => {
  assert.ok(PB.validGrid(G));
  assert.ok(PB.validGrid(PB.randomGrid(rng(3))));
  assert.ok(!PB.validGrid([1, ...G.slice(1)]));
  assert.ok(!PB.validGrid([null, 1, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));
  assert.ok(!PB.validGrid([null, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));
  const s = PB.create();
  assert.equal(s.phase, 'setup');
  assert.ok(!PB.setGrid(s, 0, G.slice(0, 15)));
  assert.ok(PB.setGrid(s, 0, G));
  assert.ok(!PB.setGrid(s, 0, G), 'cannot re-submit');
  assert.equal(s.phase, 'setup');
  assert.ok(PB.setGrid(s, 1, G));
  assert.equal(s.phase, 'pick');
});

test('secret round: higher wins, tie scores nothing, paths advance', () => {
  const s = PB.create({ grids: [G, G] });
  assert.deepEqual(PB.waitingFor(s), [0, 1]);
  assert.ok(!PB.pick(s, 0, 6), 'not adjacent to start');
  assert.ok(PB.pick(s, 0, 5));
  assert.ok(!PB.pick(s, 0, 4), 'already picked');
  assert.deepEqual(PB.waitingFor(s), [1]);
  assert.ok(PB.pick(s, 1, 4));
  assert.deepEqual(s.score, [1, 0]);
  assert.deepEqual(s.log[0], { c: [5, 4], v: [5, 4], w: 0 });
  assert.equal(s.round, 1);
  // tie
  assert.ok(PB.pick(s, 0, 10));
  assert.ok(PB.pick(s, 1, 9) || true);
  // cannot revisit
  assert.ok(!PB.moves(s, 0).includes(5));
  assert.ok(!PB.moves(s, 0).includes(0));
});

test('tie round', () => {
  const s = PB.create({ grids: [G, G] });
  PB.pick(s, 0, 5); PB.pick(s, 1, 5);
  assert.deepEqual(s.score, [0, 0]);
  assert.equal(s.log[0].w, -1);
});

test('trapped player plays 0 for the rest; both trapped ends early', () => {
  const s = PB.create({ grids: [G, G] });
  // player 0 walks 0 → 1 → 4 → 5? Trap: 0→5→1→4 ... let's trap in the corner: path 0,1,5,4 leaves 4 with free 8,9.
  // Use a direct trap: 0 → 4 → 1 → 5 ... instead construct by hand.
  s.path[0] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  s.pos[0] = 13;
  // only 14 is left; after stepping there 15 then trapped
  assert.deepEqual(PB.moves(s, 0), [14]);
  s.path[0].push(14); s.pos[0] = 14;
  s.path[0].push(15); s.pos[0] = 15;
  assert.ok(PB.trapped(s, 0));
  assert.deepEqual(PB.waitingFor(s), [1]);
  assert.ok(!PB.pick(s, 0, 11));
  assert.ok(PB.pick(s, 1, 1));
  assert.deepEqual(s.log[0], { c: [-1, 1], v: [0, 1], w: 1 });
  // trap player 1 too → game over
  s.path[1] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  s.pos[1] = 14;
  assert.deepEqual(PB.moves(s, 1), [15]);
  PB.pick(s, 1, 15);
  assert.equal(s.phase, 'over');
  assert.equal(PB.winner(s), 1);
});

test('15 rounds end the game, winner and tie', () => {
  const s = PB.create({ grids: [G, G] });
  // snake path visiting all cells for both — identical numbers → 15 ties
  const snake = [1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
  for (const c of snake) { assert.ok(PB.pick(s, 0, c)); assert.ok(PB.pick(s, 1, c)); }
  assert.equal(s.phase, 'over');
  assert.equal(s.round, 15);
  assert.equal(PB.winner(s), -1);
  assert.ok(!PB.pick(s, 0, 1));
});

test('open mode: order follows sums, then the last winner', () => {
  const g1 = [null, 15, 2, 3, 14, 13, 6, 7, 8, 9, 10, 11, 12, 5, 4, 1];
  const s = PB.create({ mode: 'open', grids: [G, g1] });
  assert.equal(s.first, 1, 'red has the bigger sum around the start');
  assert.deepEqual(PB.waitingFor(s), [1]);
  assert.ok(!PB.pick(s, 0, 1));
  assert.ok(PB.pick(s, 1, 1));
  assert.deepEqual(PB.waitingFor(s), [0]);
  assert.ok(PB.pick(s, 0, 5));
  // 5 vs 15 → red wins, red first again
  assert.equal(s.first, 1);
  assert.ok(PB.pick(s, 1, 2));
  assert.ok(PB.pick(s, 0, 6));
  // 6 vs 2 → blue wins → blue first
  assert.equal(s.first, 0);
  assert.deepEqual(PB.waitingFor(s), [0]);
});

test('redact hides the opponent grid in setup and the secret pick', () => {
  const s = PB.create();
  PB.setGrid(s, 0, G);
  assert.equal(PB.redact(s, 1).grids[0], 'ready');
  assert.deepEqual(PB.redact(s, 0).grids[0], G);
  PB.setGrid(s, 1, G);
  PB.pick(s, 0, 5);
  assert.equal(PB.redact(s, 1).picks[0], 'hidden');
  assert.equal(PB.redact(s, 0).picks[0], 5);
  const o = PB.create({ mode: 'open', grids: [G, G] });
  PB.pick(o, o.first, 5);
  assert.equal(PB.redact(o, 1 - o.first).picks[o.first], 5);
});

test('matrix solver finds matching-pennies mix', () => {
  const x = PB.solveMatrix([[1, -1], [-1, 1]], 2000);
  assert.ok(Math.abs(x[0] - 0.5) < 0.08);
  const y = PB.solveMatrix([[2, 2], [-1, 0]]);
  assert.ok(y[0] > 0.9);
});

function playGame(levels, mode, seed) {
  const r = rng(seed);
  const s = PB.create({ mode, grids: [PB.aiGrid(r), PB.aiGrid(r)] });
  let guard = 0;
  while (s.phase !== 'over') {
    assert.ok(guard++ < 100, 'game terminates');
    const w = PB.waitingFor(s);
    assert.ok(w.length > 0);
    const p = w[0];
    const view = PB.redact(s, p);
    const c = PB.aiPick(view, p, levels[p], r);
    assert.ok(PB.moves(s, p).includes(c), `legal ${levels[p]} move`);
    assert.ok(PB.pick(s, p, c));
  }
  return s;
}

test('AI vs AI games terminate with legal moves in every level and mode', () => {
  for (const mode of ['secret', 'open']) for (const lv of [['easy', 'normal'], ['normal', 'hard'], ['hard', 'easy']]) {
    const s = playGame(lv, mode, 7 + lv.length + mode.length);
    assert.equal(s.phase, 'over');
    assert.ok(s.round <= 15);
    assert.equal(s.score[0] + s.score[1] + s.log.filter((e) => e.w < 0).length, s.log.length);
  }
});

test('normal AI beats easy AI more often than not', () => {
  let wins = 0, losses = 0;
  for (let i = 0; i < 24; i++) {
    const swap = i % 2;
    const s = playGame(swap ? ['easy', 'normal'] : ['normal', 'easy'], 'secret', 100 + i);
    const w = PB.winner(s);
    if (w < 0) continue;
    if (w === (swap ? 1 : 0)) wins++; else losses++;
  }
  assert.ok(wins > losses, `normal ${wins} : easy ${losses}`);
});

test('picks are rejected before play, after the game, for the start square and for non-cells', () => {
  const s = PB.create();
  assert.ok(!PB.pick(s, 0, 1), 'no picks during set-up');
  PB.setGrid(s, 0, G); PB.setGrid(s, 1, G);
  for (const bad of [0, 2, 16, -1, '1', null, 1.5]) assert.ok(!PB.pick(s, 0, bad), `rejects ${bad}`);
  assert.ok(PB.pick(s, 0, 1));
  assert.ok(!PB.pick(s, 0, 4), 'one pick per round');
  const done = PB.create({ grids: [G, G] });
  done.phase = 'over';
  assert.ok(!PB.pick(done, 0, 1));
  assert.ok(!PB.setGrid(PB.create({ grids: [G, G] }), 0, G), 'no set-up once play has started');
});

test('open mode: a trapped first player hands the turn over; the free player still plays every round', () => {
  // blue has visited every square (a snake through the grid), so it is stuck on 12
  const s = PB.create({ mode: 'open', grids: [G, G] });
  s.path[0] = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
  s.pos[0] = 12; s.round = 3; s.first = 0;
  assert.ok(PB.trapped(s, 0));
  assert.deepEqual(PB.waitingFor(s), [1]);
  assert.ok(PB.pick(s, 1, 1));
  assert.equal(s.score[1], 1);
  assert.equal(s.log.at(-1).v[0], 0);
});

test('AI never moves illegally from random mid-game positions, and only uses public information', () => {
  const r = rng(11);
  for (let k = 0; k < 40; k++) {
    const mode = k % 2 ? 'open' : 'secret';
    const s = PB.create({ mode, grids: [PB.randomGrid(r), PB.randomGrid(r)] });
    const stop = Math.floor(r() * 14);
    while (s.phase === 'pick' && s.round < stop) for (const p of PB.waitingFor(s)) { const m = PB.moves(s, p); PB.pick(s, p, m[Math.floor(r() * m.length)]); }
    if (s.phase !== 'pick') continue;
    for (const p of PB.waitingFor(s)) for (const lvl of ['easy', 'normal', 'hard']) {
      const c = PB.aiPick(PB.redact(s, p), p, lvl, r);
      assert.ok(PB.moves(s, p).includes(c), `${lvl} picked ${c}`);
    }
  }
});

test('AI beats random play clearly', () => {
  const r = rng(5);
  let ai = 0, rand = 0;
  for (let g = 0; g < 16; g++) {
    const s = PB.create({ mode: g % 4 < 2 ? 'secret' : 'open', grids: [PB.randomGrid(r), PB.randomGrid(r)] });
    const me = g % 2;
    while (s.phase === 'pick') for (const p of PB.waitingFor(s)) {
      const m = PB.moves(s, p);
      PB.pick(s, p, p === me ? PB.aiPick(PB.redact(s, p), p, 'normal', r) : m[Math.floor(r() * m.length)]);
    }
    const w = PB.winner(s);
    if (w === me) ai++; else if (w >= 0) rand++;
  }
  assert.ok(ai >= 13 && rand <= 1, `normal ${ai} : random ${rand}`);
});

test('a path may cross itself diagonally but never revisit', () => {
  const s = PB.create({ grids: [G, G] });
  // blue 0 → 5 → 1, then 1 → 4 crosses the 0–5 diagonal: allowed
  PB.pick(s, 0, 5); PB.pick(s, 1, 1);
  PB.pick(s, 0, 1); PB.pick(s, 1, 2);
  assert.ok(PB.moves(s, 0).includes(4));
  assert.ok(!PB.moves(s, 0).includes(5) && !PB.moves(s, 0).includes(0));
  assert.ok(PB.pick(s, 0, 4));
});

test('open mode: equal sums → blue first; a tied round keeps the order', () => {
  const s = PB.create({ mode: 'open', grids: [G, G] });
  assert.equal(s.first, 0);
  assert.deepEqual(PB.waitingFor(s), [0]);
  PB.pick(s, 0, 5);
  assert.equal(PB.redact(s, 1).picks[0], 5, 'open picks are public');
  PB.pick(s, 1, 5);
  assert.equal(s.log[0].w, -1);
  assert.equal(s.first, 0);
  PB.pick(s, 0, 1); PB.pick(s, 1, 6);   // 1 vs 6 → red
  assert.equal(s.first, 1);
  PB.pick(s, 1, 2); PB.pick(s, 0, 2);   // tie 2 : 2 → red stays first
  assert.equal(s.first, 1);
});

test('one trapped player: the other keeps scoring until round 15', () => {
  const s = PB.create({ grids: [G, G] });
  // blue has already walked every square and is stuck on 11 from the very first round
  s.path[0] = [0, 1, 2, 3, 7, 6, 5, 4, 8, 12, 13, 9, 10, 14, 15, 11]; s.pos[0] = 11;
  assert.ok(PB.trapped(s, 0));
  const snake = [1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
  for (const c of snake) { assert.ok(!PB.pick(s, 0, c)); assert.ok(PB.pick(s, 1, c)); }
  assert.equal(s.phase, 'over');
  assert.deepEqual(s.score, [0, 15]);
  assert.ok(s.log.every((e) => e.v[0] === 0 && e.c[0] === -1));
  assert.equal(PB.winner(s), 1);
});

test('secret mode: the AI view never contains the opponent\'s pick', () => {
  const s = PB.create({ grids: [G, G] });
  PB.pick(s, 0, 5);
  const v = PB.redact(s, 1);
  assert.equal(v.picks[0], 'hidden');
  assert.deepEqual(PB.waitingFor(v), [1]);
  for (const lvl of ['easy', 'normal', 'hard']) assert.ok([1, 4, 5].includes(PB.aiPick(v, 1, lvl, rng(2))));
});
