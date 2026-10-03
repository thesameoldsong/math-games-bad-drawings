import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JAM } from './engine.js';

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

const play = (s, nums) => nums.forEach((n) => assert.ok(JAM.apply(s, n), `claim ${n}`));

test('there are exactly 8 trios summing to 15, matching the magic square lines', () => {
  assert.equal(JAM.TRIOS.length, 8);
  for (const t of JAM.TRIOS) assert.equal(t[0] + t[1] + t[2], 15);
  const M = JAM.MAGIC;
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const fromSquare = new Set(lines.map((l) => l.map((i) => M[i]).sort((a, b) => a - b).join(',')));
  const fromTrios = new Set(JAM.TRIOS.map((t) => t.join(',')));
  assert.deepEqual([...fromSquare].sort(), [...fromTrios].sort());
  assert.equal(JAM.reach(5), 4);
  assert.equal(JAM.reach(2), 3);
  assert.equal(JAM.reach(1), 2);
});

test('a number cannot be claimed twice, nor outside 1..9', () => {
  const s = JAM.create();
  play(s, [5]);
  assert.equal(JAM.apply(s, 5), false);
  assert.equal(JAM.apply(s, 0), false);
  assert.equal(JAM.apply(s, 10), false);
  assert.equal(JAM.apply(s, 2.5), false);
  assert.equal(s.turn, 1);
  assert.equal(s.moves, 1);
});

test('first trio to 15 wins; two numbers summing to 15 with others do not count', () => {
  const s = JAM.create();
  // blue: 2, 4, 9 → 15 ; red: 8, 7
  play(s, [2, 8, 4, 7]);
  assert.equal(s.over, false);
  play(s, [9]);
  assert.equal(s.over, true);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.trio, [2, 4, 9]);
  assert.equal(JAM.apply(s, 1), false);
});

test('only trios count, not four numbers summing to 15', () => {
  const s = JAM.create();
  // blue: 1, 2, 3, 9 → 1+2+3+9 = 15 but no three of them add to 15 (1+2+3=6, 1+2+9=12, 1+3+9=13, 2+3+9=14)
  play(s, [1, 4, 2, 7, 3, 8, 9]);
  assert.deepEqual(JAM.numbersOf(s, 0), [1, 2, 3, 9]);
  assert.equal(s.over, false);
});

test('red can win too, and win detection uses the right player', () => {
  const s = JAM.create();
  play(s, [1, 4, 2, 5, 9, 6]);
  assert.equal(s.winner, 1);
  assert.deepEqual(s.trio, [4, 5, 6]);
});

test('all nine numbers taken without a trio is a tie', () => {
  // the drawn tic-tac-toe board  X O X / X O O / O X X  read through the magic square
  const t = JAM.create();
  play(t, [2, 7, 6, 5, 9, 1, 3, 4, 8]);
  assert.equal(t.over, true);
  assert.equal(t.winner, -1);
});

test('completers finds the missing number of every two-thirds trio', () => {
  const s = JAM.create();
  play(s, [2, 1, 4]); // blue 2,4 → needs 9; also 2+? ... red 1
  assert.deepEqual(JAM.completers(s, 0), [9]);
  play(s, [9]); // red blocks
  assert.deepEqual(JAM.completers(s, 0), []);
});

test('hard AI wins when it can and blocks otherwise', () => {
  const s = JAM.create();
  play(s, [2, 1, 4]); // red to move, blue threatens 9
  assert.equal(JAM.aiMove(s, 'hard'), 9);
  assert.equal(JAM.aiMove(s, 'normal'), 9);
  const w = JAM.create();
  play(w, [5, 1, 4]); // red to move: blue needs 6 (4+5+6); red only has 1
  assert.equal(JAM.aiMove(w, 'hard'), 6);
  const x = JAM.create();
  play(x, [5, 1, 4, 6, 8]); // red has 1,6 → needs 8? taken. blue 5,4,8 → needs 2 (5+8+2)/ 6 taken / 4+8+3
  // red to move: blue threatens 2 and 3 (fork) — red to move, no win of its own
  assert.ok(JAM.legal(x, JAM.aiMove(x, 'hard')));
});

test('perfect play from the start is a draw', () => {
  assert.equal(JAM.outlook(JAM.create(), 0), 0);
});

test('AI never makes illegal moves and every game terminates', () => {
  const levels = ['easy', 'normal', 'hard'];
  for (const a of levels) for (const b of levels) for (let i = 0; i < 6; i++) {
    const s = JAM.create({ first: i % 2 });
    let guard = 0;
    while (!JAM.isOver(s)) {
      const n = JAM.aiMove(s, s.turn === 0 ? a : b);
      assert.ok(JAM.legal(s, n), `illegal ${n}`);
      JAM.apply(s, n);
      assert.ok(++guard <= 9);
    }
    assert.ok(s.winner === -1 || s.trio);
  }
});

test('hard never loses, and beats easy most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 40; i++) {
    const s = JAM.create({ first: i % 2 });
    while (!s.over) JAM.apply(s, JAM.aiMove(s, s.turn === 0 ? 'hard' : (i < 20 ? 'easy' : 'normal')));
    assert.notEqual(s.winner, 1, 'hard lost');
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 14, `hard won only ${wins}/40`);
});

test('hard vs hard is always a draw', () => {
  for (let i = 0; i < 6; i++) {
    const s = JAM.create({ first: i % 2 });
    while (!s.over) JAM.apply(s, JAM.aiMove(s, 'hard'));
    assert.equal(s.winner, -1);
  }
});

test('red can move first; turns alternate and the game freezes after a win', () => {
  const s = JAM.create({ first: 1 });
  assert.equal(s.turn, 1);
  play(s, [8, 1, 3, 2, 4]); // red 8,3,4 = 15
  assert.equal(s.winner, 1);
  assert.equal(s.turn, 1);
  assert.deepEqual(JAM.free(s), [5, 6, 7, 9]);
  assert.equal(JAM.aiMove(s, 'hard'), null);
});

test('a win on the ninth move is a win, not a tie', () => {
  const s = JAM.create();
  // X O X / O X O / O X X on the magic square 2 7 6 / 9 5 1 / 4 3 8, X's last cell completing the diagonal
  play(s, [2, 7, 6, 9, 5, 1, 3, 4]);
  assert.equal(s.over, false);
  play(s, [8]);
  assert.equal(s.winner, 0);
  assert.deepEqual(s.trio, [2, 5, 8]);
});

test('completers lists every winning number (fork) and clone is independent', () => {
  const s = JAM.create();
  play(s, [5, 1, 4, 6, 8]); // blue 5,4,8 → needs 6 (taken), 3 (4+8+3), 2 (5+8+2)
  assert.deepEqual(JAM.completers(s, 0), [2, 3]);
  const c = JAM.clone(s);
  JAM.apply(c, 2);
  assert.equal(s.owner[2], -1);
  assert.equal(s.moves, 5);
});

test('normal AI clearly beats random play; easy beats it too', () => {
  const rnd = (s) => { const f = JAM.free(s); return f[Math.floor(Math.random() * f.length)]; };
  const run = (lvl, N) => {
    let w = 0, l = 0;
    for (let i = 0; i < N; i++) {
      const s = JAM.create({ first: i % 2 });
      while (!s.over) JAM.apply(s, s.turn === 0 ? JAM.aiMove(s, lvl) : rnd(s));
      if (s.winner === 0) w++; else if (s.winner === 1) l++;
    }
    return { w, l };
  };
  const n = run('normal', 300), e = run('easy', 300);
  assert.ok(n.w >= 240 && n.l <= 15, `normal ${JSON.stringify(n)}`);
  assert.ok(e.w > e.l * 2, `easy ${JSON.stringify(e)}`);
});
