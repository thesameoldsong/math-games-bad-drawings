import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEU } from './engine.js';

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

const at = (r, c) => r * 5 + c;
// Build a position from a 5-line picture: . empty, b blue, r red, n neutron.
function pos(rows, turn = 0, phase = 'neutron', slide = false) {
  const s = NEU.create({ first: turn, slide });
  s.b = rows.join('').replace(/\s/g, '').split('').map((ch) => ({ '.': -1, b: 0, r: 1, n: 2 })[ch]);
  s.nu = s.b.indexOf(2); s.turn = turn; s.phase = phase; s.ply = 5;
  return s;
}

test('setup and opening turn: piece only', () => {
  const s = NEU.create();
  assert.equal(s.b.filter((v) => v === 0).length, 5);
  assert.equal(s.b.filter((v) => v === 1).length, 5);
  assert.equal(s.b[12], 2);
  assert.equal(s.phase, 'piece');
  const moves = NEU.legalMoves(s);
  assert.ok(moves.every((m) => s.b[m.from] === 0));
  NEU.apply(s, moves[0]);
  assert.equal(s.turn, 1);
  assert.equal(s.phase, 'neutron');
});

test('pieces slide until blocked, never stop early', () => {
  const s = NEU.create();
  // bottom-left piece: straight up stops below the red piece (row 1); the diagonal stops next to the neutron
  const up = NEU.legalMoves(s).filter((m) => m.from === at(4, 0));
  assert.deepEqual(up.map((m) => m.to).sort((a, b) => a - b), [at(1, 0), at(3, 1)]);
  // middle piece: up is blocked by the neutron at (2,2) → stops at (3,2); diagonals run to row 1
  const mid = NEU.legalMoves(s).filter((m) => m.from === at(4, 2)).map((m) => m.to).sort((a, b) => a - b);
  assert.deepEqual(mid, [at(2, 0), at(2, 4), at(3, 2)].sort((a, b) => a - b));
});

test('neutron steps one square (or slides in the variant)', () => {
  const s = pos(['rrrrr', '.....', '..n..', '.....', 'bbbbb']);
  assert.equal(NEU.legalMoves(s).length, 8);
  assert.ok(NEU.legalMoves(s).every((m) => Math.abs(NEU.rowOf(m.to) - 2) <= 1));
  const v = pos(['rrrrr', '.....', '..n..', '.....', 'bbbbb'], 0, 'neutron', true);
  assert.deepEqual(NEU.legalMoves(v).map((m) => m.to).sort((a, b) => a - b), [at(1, 1), at(1, 2), at(1, 3), at(2, 0), at(2, 4), at(3, 1), at(3, 2), at(3, 3)]);
});

test('neutron reaching your home row wins', () => {
  const s = pos(['rrrrr', '.....', '.....', '..n..', 'bb.bb']);
  NEU.apply(s, { from: at(3, 2), to: at(4, 2) });
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'home');
  assert.ok(NEU.isOver(s));
  assert.deepEqual(NEU.legalMoves(s), []);
});

test('pushing the neutron into the opponent\'s row loses (own goal)', () => {
  const s = pos(['rr.rr', '..n..', '.....', '.....', 'bbbbb'], 0);
  NEU.apply(s, { from: at(1, 2), to: at(0, 2) });
  assert.equal(s.winner, 1);
  assert.equal(s.reason, 'own-goal');
});

test('trapping the neutron wins', () => {
  // neutron in a corner of the middle, blue closes the last gap
  const s = pos(['rrrrr', 'n.b..', 'bb...', '.....', '..bb.'], 0, 'piece');
  // blue slides (1,2) left to (1,1): neutron at (1,0) has neighbours (0,0)r,(0,1)r,(1,1)b,(2,0)b,(2,1)b
  NEU.apply(s, { from: at(1, 2), to: at(1, 1) });
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'trap');
});

test('outlook detects immediate wins and safe moves', () => {
  const s = pos(['rr.rr', '..n..', '.....', '.....', 'bbbbb'], 1);
  const o = NEU.outlook(s);
  assert.equal(o.canWin, true);
  assert.ok(o.safe > 0);
});

test('AI takes a win in one and never plays illegal moves', () => {
  const s = pos(['rr.rr', '..n..', '.....', '.....', 'bbbbb'], 1);
  for (const level of ['easy', 'normal', 'hard']) {
    if (level === 'easy') continue; // easy may miss on purpose
    const tr = NEU.aiTurn(NEU.clone(s), level);
    assert.equal(tr.n.to, at(0, 2), level);
  }
  for (const level of ['easy', 'normal']) {
    for (let g = 0; g < 4; g++) {
      const x = NEU.create({ first: g % 2, slide: g >= 2 });
      while (!NEU.isOver(x)) {
        const tr = NEU.aiTurn(x, level);
        if (tr.n) { assert.ok(NEU.isLegal(x, tr.n)); NEU.apply(x, tr.n); }
        if (tr.p && !NEU.isOver(x)) { assert.ok(NEU.isLegal(x, tr.p)); NEU.apply(x, tr.p); }
      }
    }
  }
});

test('normal AI avoids handing over a win in one', () => {
  // red to move; neutron one step from blue's open home cell
  const s = pos(['rrrrr', '.....', '..n..', '.....', 'bb.bb'], 1);
  for (let i = 0; i < 5; i++) {
    const x = NEU.clone(s);
    NEU.playTurn(x, NEU.aiTurn(x, 'normal'));
    assert.ok(!NEU.outlook(x).canWin, 'left a win for blue');
  }
});

test('full hard-vs-normal game terminates with a result', () => {
  const s = NEU.create();
  while (!NEU.isOver(s)) NEU.playTurn(s, NEU.aiTurn(s, s.turn === 0 ? 'hard' : 'normal'));
  assert.ok(s.winner >= 0 || s.draw);
});

test('repetition and length limits end the game in a draw', () => {
  const s = NEU.create();
  let guard = 0;
  // shuffle pieces back and forth without moving toward a result
  while (!NEU.isOver(s) && guard++ < 2000) {
    const all = NEU.turns(s);
    const calm = all.find((tr) => NEU.playTurn(NEU.clone(s), tr).winner < 0);
    NEU.playTurn(s, calm || all[0]);
  }
  assert.ok(NEU.isOver(s));
  if (s.winner < 0) assert.ok(s.draw && ['repeat', 'long'].includes(s.reason));
});

test('a neutron step that leaves no piece move is not allowed', () => {
  // blue's only free squares are reached through (3,4); stepping the neutron there would freeze blue
  const s = pos(['r....', '.....', '...n.', 'rrrr.', 'bbbbb'], 0);
  const to = NEU.legalMoves(s).map((m) => m.to);
  assert.ok(!to.includes(at(3, 4)));
  assert.ok(to.includes(at(2, 4)));
});

test('a player who cannot complete a turn loses', () => {
  // red closes the last gap: every blue piece is frozen, so blue can't finish any neutron step
  const s = pos(['.....', '.....', '..n..', 'rrrr.', 'bbbbb'], 1, 'piece');
  s.b[at(1, 4)] = 1;
  NEU.apply(s, { from: at(1, 4), to: at(3, 4) });
  assert.equal(s.winner, 1);
  assert.equal(s.reason, 'stuck');
  // if the only way out is an own goal, it must be played
  const g = pos(['rr.rr', '..n..', '.....', 'rrrrr', 'bbbbb'].map((r) => r), 0);
  g.b[at(0, 0)] = -1; g.b[at(0, 1)] = -1; g.b[at(0, 3)] = -1; g.b[at(0, 4)] = -1;
  const moves = NEU.legalMoves(g);
  assert.ok(moves.length > 0 && moves.every((m) => NEU.rowOf(m.to) === 0));
});

test('slide variant: the neutron wins only where it stops', () => {
  const s = pos(['r.rrr', '.....', '.n...', '.....', 'bbbbb'], 1, 'neutron', true);
  const m = NEU.legalMoves(s).find((x) => x.to === at(0, 1));
  assert.ok(m, 'slides up into the gap');
  assert.ok(!NEU.legalMoves(s).some((x) => x.to === at(1, 1)), 'cannot stop halfway');
  NEU.apply(s, m);
  assert.equal(s.winner, 1);
  for (const level of ['normal', 'hard']) {
    const x = pos(['r.rrr', '.....', '.n...', '.....', 'bbbbb'], 1, 'neutron', true);
    assert.equal(NEU.aiTurn(x, level).n.to, at(0, 1), level);
  }
});

test('repeating a position three times is a draw; state survives JSON (online)', () => {
  // pieces shuffle back and forth while the neutron steps between two squares
  const s = pos(['r...r', '.....', '..n..', '.....', 'b...b'], 0);
  s.seen = {};
  const cycle = [
    [{ from: at(2, 2), to: at(2, 1) }, { from: at(4, 0), to: at(4, 3) }],
    [{ from: at(2, 1), to: at(2, 2) }, { from: at(0, 0), to: at(0, 3) }],
    [{ from: at(2, 2), to: at(2, 1) }, { from: at(4, 3), to: at(4, 0) }],
    [{ from: at(2, 1), to: at(2, 2) }, { from: at(0, 3), to: at(0, 0) }],
  ];
  let k = 0;
  while (!NEU.isOver(s) && k < 40) {
    for (const m of cycle[k % 4]) { assert.ok(NEU.isLegal(s, m), `move ${k}`); NEU.apply(s, m); }
    k++;
    const copy = JSON.parse(JSON.stringify(s));
    assert.deepEqual(NEU.legalMoves(copy), NEU.legalMoves(s));
  }
  assert.ok(s.draw);
  assert.equal(s.reason, 'repeat');
  assert.equal(k, 9); // the position after turn 1 is the first to come up a third time (turns 1, 5, 9)
});

test('normal and hard beat random play', () => {
  const rnd = (s) => { const a = NEU.turns(s); return a[Math.floor(Math.random() * a.length)]; };
  for (const level of ['normal', 'hard']) {
    let wins = 0;
    const n = level === 'hard' ? 2 : 10;
    for (let g = 0; g < n; g++) {
      const s = NEU.create({ first: g % 2 });
      while (!NEU.isOver(s)) NEU.playTurn(s, s.turn === 0 ? NEU.aiTurn(s, level) : rnd(s));
      if (s.winner === 0) wins++;
    }
    assert.ok(wins >= n - 1, `${level}: ${wins}/${n}`);
  }
});
