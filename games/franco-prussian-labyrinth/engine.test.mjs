import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FPL } from './engine.js';

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

const ek = FPL.ek;
// Deterministic RNG for reproducible tests.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function ready(variant = 'classic', m0, m1, seed = 1) {
  const s = FPL.create(variant, 0), { N, W } = FPL.VARIANTS[variant];
  assert.ok(FPL.setMaze(s, 0, m0 || FPL.randomMaze(N, W, rng(seed))));
  assert.ok(FPL.setMaze(s, 1, m1 || FPL.randomMaze(N, W, rng(seed + 1))));
  return s;
}

test('edges and segments round-trip; border is not a wall', () => {
  const N = 9, all = FPL.allEdges(N);
  assert.equal(all.length, 2 * N * (N - 1));
  for (const e of all) assert.equal(FPL.edgeOfSeg(N, ...FPL.segOf(N, e)), e);
  assert.equal(FPL.edgeOfSeg(N, [0, 0], [0, 1]), null);
  assert.equal(FPL.edgeOfSeg(N, [0, 9], [1, 9]), null);
  assert.ok(!FPL.isEdge(N, ek(8, 9)), 'row wrap is not an edge');
});

test('a labyrinth must keep the exit reachable and have exactly W walls', () => {
  const N = 9;
  const seal = [ek(0, 1), ek(0, 9)];
  assert.ok(!FPL.connected(N, seal));
  assert.ok(!FPL.canAddWall(N, [ek(0, 1)], ek(0, 9)));
  assert.ok(FPL.canAddWall(N, [ek(0, 1)], ek(1, 10)));
  const s = FPL.create('classic');
  assert.ok(!FPL.setMaze(s, 0, [ek(0, 1)]), 'too few walls');
  const m = FPL.randomMaze(9, 30, rng(5));
  assert.equal(m.length, 30);
  assert.ok(FPL.connected(9, m));
  assert.ok(!FPL.setMaze(s, 0, [...m.slice(0, 29), m[0]]), 'duplicates rejected');
  assert.ok(FPL.setMaze(s, 0, m));
  assert.equal(s.phase, 'build');
  assert.ok(FPL.setMaze(s, 1, FPL.randomMaze(9, 30, rng(6))));
  assert.equal(s.phase, 'play');
});

test('random mazes always valid (both variants)', () => {
  for (let i = 0; i < 40; i++) {
    for (const v of ['classic', 'french']) {
      const { N, W } = FPL.VARIANTS[v];
      assert.ok(FPL.validMaze(N, W, FPL.randomMaze(N, W, rng(100 + i))));
    }
  }
});

test('classic: five steps then the turn passes', () => {
  const s = ready();
  // Blue (0) walks Red's maze; give Red an empty-looking maze by brute force: walls far away.
  s.maze[1] = FPL.allEdges(9).filter((e) => { const [a, b] = FPL.cellsOf(e); return a >= 45 && b >= 45 && a % 9 < 4; }).slice(0, 30);
  for (let i = 0; i < 4; i++) { const e = FPL.apply(s, { d: 1 }); assert.equal(e.turnEnd, false); }
  assert.equal(s.pos[0], 4);
  assert.equal(s.left, 1);
  const e = FPL.apply(s, { d: 2 });
  assert.equal(e.turnEnd, true);
  assert.equal(s.turn, 1);
  assert.equal(s.left, 5);
  assert.equal(s.moves[0], 5);
});

test('classic: bumping a wall ends the turn, stays put, reveals the wall', () => {
  const s = ready();
  const walls = FPL.randomMaze(9, 29, rng(9), [ek(0, 1)]);
  s.maze[1] = walls;
  const e = FPL.apply(s, { d: 1 });
  assert.equal(e.bump, ek(0, 1));
  assert.equal(s.pos[0], 0);
  assert.equal(s.know[0][ek(0, 1)], 2);
  assert.equal(s.turn, 1);
  // Now walking into that known wall isn't offered any more.
  s.turn = 0;
  assert.ok(!FPL.legalMoves(s).some((m) => m.d === 1));
  assert.ok(!FPL.legalMoves(s).some((m) => m.d === 0 || m.d === 3), 'never off the board');
});

test('classic: reaching the corner wins at once', () => {
  const s = ready();
  s.maze[1] = FPL.randomMaze(9, 30, rng(3));
  s.pos[0] = 79; // H9, next to I9
  s.maze[1] = s.maze[1].filter((e) => e !== ek(79, 80));
  while (s.maze[1].length < 30) { const e = FPL.allEdges(9).find((x) => x !== ek(79, 80) && !s.maze[1].includes(x) && FPL.canAddWall(9, s.maze[1], x)); s.maze[1].push(e); }
  const e = FPL.apply(s, { d: 1 });
  assert.ok(e.win);
  assert.equal(s.phase, 'over');
  assert.equal(s.winner, 0);
  assert.deepEqual(FPL.legalMoves(s), []);
});

test('french: slide until a wall or the edge; next start from any visited square', () => {
  const s = ready('french');
  s.maze[1] = FPL.randomMaze(10, 39, rng(4), [ek(3, 4)]).filter((e) => ![ek(0, 1), ek(1, 2), ek(2, 3)].includes(e));
  while (s.maze[1].length < 40) { const e = FPL.allEdges(10).find((x) => x > '5' && !s.maze[1].includes(x) && FPL.canAddWall(10, s.maze[1], x)); s.maze[1].push(e); }
  assert.ok(FPL.validMaze(10, 40, s.maze[1]));
  const e = FPL.apply(s, { from: 0, d: 1 });
  assert.deepEqual(e.path, [0, 1, 2, 3]);
  assert.equal(e.bump, ek(3, 4));
  assert.equal(s.pos[0], 3);
  assert.deepEqual(s.starts[0], [0, 1, 2, 3]);
  assert.equal(s.turn, 1);
  s.turn = 0;
  const froms = new Set(FPL.legalMoves(s).map((m) => m.from));
  assert.deepEqual([...froms].sort((a, b) => a - b), [0, 1, 2, 3]);
  assert.ok(!FPL.isLegal(s, { from: 5, d: 2 }), 'cannot start from an unvisited square');
});

test('redact hides only the opponent maze, and only until the end', () => {
  const s = ready();
  const r = FPL.redact(s, 1);
  assert.equal(r.maze[0], null);
  assert.deepEqual(r.maze[1], s.maze[1]);
  s.phase = 'over';
  assert.deepEqual(FPL.redact(s, 1).maze[0], s.maze[0]);
});

test('AI never makes illegal moves and full AI-vs-AI games terminate', () => {
  for (const v of ['classic', 'french']) for (const lvl of ['easy', 'normal', 'hard']) {
    const R = rng(lvl.length * 7 + v.length);
    const s = FPL.create(v, 0);
    FPL.setMaze(s, 0, FPL.aiMaze(v, lvl, R));
    FPL.setMaze(s, 1, FPL.aiMaze(v, lvl, R));
    let guard = 3000;
    while (s.phase === 'play' && guard--) {
      const m = FPL.aiMove(s, lvl, R);
      assert.ok(FPL.isLegal(s, m), `${v}/${lvl} illegal move ${JSON.stringify(m)}`);
      FPL.apply(s, m);
    }
    assert.equal(s.phase, 'over', `${v}/${lvl} did not finish`);
    assert.equal(s.pos[s.winner], FPL.goal(s.N));
  }
});

test('levels: normal walker beats easy; hard mazes are slower to solve', () => {
  const R = rng(42);
  let easy = 0, normal = 0, hardMaze = 0;
  for (let i = 0; i < 12; i++) {
    const m = FPL.randomMaze(9, 30, R);
    easy += FPL.solveTurns('classic', m, 'easy', R);
    normal += FPL.solveTurns('classic', m, 'normal', R);
  }
  for (let i = 0; i < 6; i++) {
    const m = FPL.aiMaze('classic', 'hard', R);
    hardMaze += FPL.solveTurns('classic', m, 'normal', R) + FPL.solveTurns('classic', m, 'normal', R);
  }
  assert.ok(normal < easy, `normal ${normal} vs easy ${easy}`);
  assert.ok(hardMaze / 12 > normal / 12, `hard mazes ${hardMaze / 12} vs random ${normal / 12}`);
});

test('maze validation rejects junk: non-canonical keys, border edges, wrong count, after the build', () => {
  const N = 9, m = FPL.randomMaze(N, 30, rng(11));
  assert.ok(!FPL.isEdge(N, '01-2'), 'leading zero is not a canonical key');
  assert.ok(!FPL.isEdge(N, '2-1') && !FPL.isEdge(N, '0-2') && !FPL.isEdge(N, '72-81') && !FPL.isEdge(N, 5));
  const s = FPL.create('classic');
  assert.ok(!FPL.setMaze(s, 0, [...m.slice(0, 29), '0' + m[0]]), 'disguised duplicate rejected');
  assert.ok(!FPL.setMaze(s, 0, [...m, FPL.allEdges(N).find((e) => !m.includes(e))]), '31 walls rejected');
  assert.ok(!FPL.setMaze(s, 0, 'nope'));
  assert.ok(FPL.setMaze(s, 0, m) && FPL.setMaze(s, 1, m));
  assert.ok(!FPL.setMaze(s, 0, m), 'no rebuilding once play has started');
  assert.deepEqual(FPL.legalMoves(FPL.create('classic')), [], 'no moves during the build');
});

// Walls only between squares of rows 2..N-1 and columns A..(N-1): the top row, the bottom row and the
// right-hand column stay wide open.
function farMaze(N, W) {
  const out = [], inside = (c) => Math.floor(c / N) >= 1 && Math.floor(c / N) <= N - 2 && c % N <= N - 2;
  for (const e of FPL.allEdges(N)) {
    const [a, b] = FPL.cellsOf(e);
    if (out.length < W && inside(a) && inside(b) && FPL.canAddWall(N, out, e)) out.push(e);
  }
  return out;
}

test('classic: the next turn starts where you stopped; other walker untouched', () => {
  const m = farMaze(9, 30);
  assert.equal(m.length, 30);
  const s = ready('classic', m, m);
  for (let i = 0; i < 5; i++) FPL.apply(s, { d: 1 });
  assert.equal(s.pos[0], 5);
  assert.equal(s.turn, 1);
  assert.equal(s.pos[1], 0, 'red has not moved');
  for (let i = 0; i < 5; i++) FPL.apply(s, { d: 1 }); // red walks its own five steps
  assert.equal(s.turn, 0);
  const e = FPL.apply(s, { d: 1 });
  assert.equal(e.path[0], 5, 'blue continues from F1');
  assert.equal(s.pos[0], 6);
  assert.ok(!FPL.isLegal(s, { d: 0 }), 'off the top edge is never legal');
  assert.ok(!FPL.isLegal(s, { d: 7 }) && !FPL.isLegal(s, null));
});

test('classic: reaching the goal on the 5th step wins (does not just pass the turn)', () => {
  const m = farMaze(9, 30);
  const s = ready('classic', m, m);
  s.pos[0] = 75; // D9: five steps right along the open bottom row reach I9
  for (const k of [ek(75, 76), ek(76, 77), ek(77, 78), ek(78, 79), ek(79, 80)]) assert.ok(!s.maze[1].includes(k));
  let e;
  for (let i = 0; i < 5; i++) e = FPL.apply(s, { d: 1 });
  assert.ok(e.win);
  assert.equal(s.winner, 0);
  assert.equal(s.phase, 'over');
  assert.equal(s.moves[0], 5);
});

test('french: a slide stopped at once leaves a single start square', () => {
  const N = 10, W = 40;
  const s = ready('french');
  s.maze[1] = FPL.randomMaze(N, W, rng(21), [ek(0, 1)]);
  assert.ok(FPL.validMaze(N, W, s.maze[1]));
  const e = FPL.apply(s, { from: 0, d: 1 });
  assert.deepEqual(e.path, [0]);
  assert.equal(e.bump, ek(0, 1));
  assert.deepEqual(s.starts[0], [0]);
  assert.equal(s.turn, 1, 'a slide is the whole turn');
});

test('french: a slide along an open edge goes all the way to the border', () => {
  const m = farMaze(10, 40);
  assert.equal(m.length, 40);
  const s = ready('french', m, m);
  const e = FPL.apply(s, { from: 0, d: 1 });
  assert.deepEqual(e.path, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(e.bump, null);
  assert.equal(s.pos[0], 9);
  s.turn = 0;
  const e2 = FPL.apply(s, { from: 9, d: 2 });
  assert.ok(e2.win, 'sliding down the right edge reaches the corner');
});

test('AI is legal from many random mid-game positions and never walks into a known wall', () => {
  for (const v of ['classic', 'french']) for (let g = 0; g < 6; g++) {
    const R = rng(300 + g);
    const s = ready(v, null, null, 40 + g);
    for (let k = 0; k < 60 && s.phase === 'play'; k++) {
      for (const lvl of ['easy', 'normal', 'hard']) {
        const m = FPL.aiMove(s, lvl, R);
        assert.ok(FPL.isLegal(s, m), `${v}/${lvl} illegal ${JSON.stringify(m)}`);
        const from = s.slide ? m.from : s.pos[s.turn];
        assert.notEqual(s.know[s.turn][ek(from, FPL.nb(s.N, from, m.d))], 2);
      }
      const ms = FPL.legalMoves(s);
      FPL.apply(s, ms[Math.floor(R() * ms.length)]);
    }
  }
});

test('normal walker is far better than a random walker', () => {
  const R = rng(77);
  const solve = (v, walls, walker) => {
    const s = FPL.create(v, 1);
    s.maze = [walls, walls]; s.phase = 'play';
    let turns = 0;
    while (s.phase === 'play' && turns < 1000) {
      const ms = FPL.legalMoves(s);
      const e = FPL.apply(s, walker === 'random' ? ms[Math.floor(R() * ms.length)] : FPL.aiMove(s, walker, R));
      if (e.turnEnd) { turns++; s.turn = 1; s.left = s.steps; }
    }
    return turns;
  };
  for (const v of ['classic', 'french']) {
    const { N, W } = FPL.VARIANTS[v];
    let rnd = 0, normal = 0;
    for (let i = 0; i < 8; i++) { const m = FPL.randomMaze(N, W, R); rnd += solve(v, m, 'random'); normal += solve(v, m, 'normal'); }
    assert.ok(normal * 4 < rnd, `${v}: normal ${normal} vs random ${rnd}`);
  }
});

test('redact returns a copy: changing it never touches the host state', () => {
  const s = ready();
  const r = FPL.redact(s, 1);
  r.maze[1].push('x'); r.know[0]['0-1'] = 2;
  assert.equal(s.maze[1].length, 30);
  assert.equal(s.know[0]['0-1'], undefined);
  assert.ok(s.maze[0]);
});
