import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPL, EMPTY, GONE } from './engine.js';

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

// Build a play-phase position from rows of 'b' (blue/0), 'r' (red/1), '.' (gone).
function pos(rows, { turn = 0, patterns = 'classic' } = {}) {
  const s = SPL.create({ R: rows.length, C: rows[0].length, patterns });
  s.cells = rows.join('').split('').map((ch) => (ch === 'b' ? 0 : ch === 'r' ? 1 : GONE));
  s.turn = turn;
  return s;
}

test('random setup has equal numbers of each colour', () => {
  for (const [R, C] of [[4, 4], [4, 6], [6, 6], [8, 8]]) {
    const s = SPL.create({ R, C });
    assert.equal(SPL.count(s, 0), R * C / 2);
    assert.equal(SPL.count(s, 1), R * C / 2);
    assert.equal(s.phase, 'play');
  }
});

test('splatter alone removes only the blob; with neighbours removes all 8 around', () => {
  const s = pos(['rbr', 'brb', 'rbr']);
  assert.deepEqual(SPL.apply(s, { i: 1, p: 'one' }), [1]);
  assert.equal(s.cells[1], GONE);
  assert.equal(s.turn, 1);
  const h = SPL.apply(s, { i: 4, p: 'all' }).sort((a, b) => a - b);
  assert.deepEqual(h, [0, 2, 3, 4, 5, 6, 7, 8]); // cell 1 is already gone
  assert.ok(SPL.isOver(s));
  assert.equal(s.winner, 1); // the mover wipes out both colours at once → mover wins
});

test('diagonal and orthogonal patterns in the extended variant', () => {
  const s = pos(['bbb', 'brb', 'bbb'], { turn: 1, patterns: 'extended' });
  assert.deepEqual(SPL.hits(s, 4, 'x').sort(), [0, 2, 4, 6, 8]);
  assert.deepEqual(SPL.hits(s, 4, 'plus').sort(), [1, 3, 4, 5, 7]);
  assert.equal(SPL.isLegal(pos(['br'], { patterns: 'classic' }), { i: 0, p: 'x' }), false);
});

test('cannot splatter an opponent blob or a gone cell', () => {
  const s = pos(['br.']);
  assert.equal(SPL.isLegal(s, { i: 1, p: 'one' }), false);
  assert.equal(SPL.isLegal(s, { i: 2, p: 'one' }), false);
  assert.throws(() => SPL.apply(s, { i: 1, p: 'one' }));
});

test('removing the last enemy blob wins; removing your own last blob loses', () => {
  const a = pos(['br', '.b']);
  SPL.apply(a, { i: 0, p: 'all' });
  assert.equal(a.winner, 0);
  const b = pos(['b.', '.r', 'rr'], { turn: 0 });
  SPL.apply(b, { i: 0, p: 'one' });
  assert.equal(b.winner, 1);
});

test('corner/edge neighbours are clipped to the board', () => {
  const s = pos(['br', 'rb']);
  assert.deepEqual(SPL.hits(s, 0, 'all').sort(), [0, 1, 2, 3]);
});

test('legal moves drop duplicate splatters', () => {
  const s = pos(['b.r', '...', 'rrr']);
  assert.deepEqual(SPL.legalMoves(s), [{ i: 0, p: 'one' }]);
});

test('setup by turns: alternate, half each, then play starts with the first player', () => {
  const s = SPL.create({ R: 4, C: 4, setup: 'turns', first: 1 });
  assert.equal(s.phase, 'place');
  assert.equal(s.turn, 1);
  let last = null;
  while (s.phase === 'place') {
    const m = SPL.aiMove(s, 'easy');
    assert.equal(s.cells[m.i], EMPTY);
    assert.notEqual(s.turn, last);
    last = s.turn;
    SPL.apply(s, m);
  }
  assert.equal(SPL.count(s, 0), 8);
  assert.equal(SPL.count(s, 1), 8);
  assert.equal(s.turn, 1);
});

test('search finds a winning splatter', () => {
  // Blue to move: splattering (1,1) with neighbours wipes out every red blob.
  const s = pos(['rrr.', 'rbr.', 'rrr.', '...b']);
  const m = SPL.searchMove(s, { timeMs: 300 });
  assert.deepEqual([m.i, m.p], [5, 'all']);
});

test('search prefers the slow lone splatter when racing', () => {
  // Isolated blobs, blue to move with 3 vs 2: any lone splatter wins, the race is solved.
  const s = pos(['b.b.b', '.....', 'r...r']);
  const m = SPL.searchMove(s, { timeMs: 300 });
  assert.ok(m.value > 1000);
});

test('AI only plays legal moves and every game terminates', () => {
  for (const patterns of ['classic', 'extended']) {
    for (const setup of ['random', 'turns']) {
      for (const level of ['easy', 'normal', 'hard']) {
        const s = SPL.create({ R: 4, C: 6, patterns, setup });
        let guard = 200;
        while (!SPL.isOver(s) && guard--) {
          const m = SPL.aiMove(s, level === 'hard' ? 'normal' : level); // hard only differs by think time
          assert.ok(SPL.isLegal(s, m), `illegal ${JSON.stringify(m)}`);
          SPL.apply(s, m);
        }
        assert.ok(SPL.isOver(s));
        assert.ok(SPL.count(s, 1 - s.winner) === 0);
      }
    }
  }
});

test('a full hard-vs-hard game on 6×6 terminates', () => {
  const s = SPL.create({ R: 6, C: 6 });
  let n = 0;
  while (!SPL.isOver(s) && n++ < 80) {
    const m = SPL.searchMove(s, { timeMs: 60 });
    SPL.apply(s, { i: m.i, p: m.p });
  }
  assert.ok(SPL.isOver(s));
});

test('normal AI beats easy AI most of the time', () => {
  let wins = 0;
  for (let g = 0; g < 16; g++) {
    const s = SPL.create({ R: 6, C: 6, first: g % 2 });
    while (!SPL.isOver(s)) SPL.apply(s, SPL.aiMove(s, s.turn === 0 ? 'normal' : 'easy'));
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 10, `normal won only ${wins}/16`);
});

test('hard AI (deep search) is not worse than normal and crushes easy', () => {
  let vsNormal = 0, vsEasy = 0;
  for (let g = 0; g < 12; g++) {
    for (const opp of ['normal', 'easy']) {
      const s = SPL.create({ R: 6, C: 6, first: g % 2 });
      while (!SPL.isOver(s)) {
        const m = s.turn === 0 ? SPL.searchMove(s, { timeMs: 40 }) : SPL.aiMove(s, opp);
        SPL.apply(s, { i: m.i, p: m.p });
      }
      if (s.winner === 0) opp === 'normal' ? vsNormal++ : vsEasy++;
    }
  }
  assert.ok(vsNormal >= 4, `hard won only ${vsNormal}/12 vs normal`);
  assert.ok(vsEasy >= 8, `hard won only ${vsEasy}/12 vs easy`);
});

test('malformed and out-of-phase moves are rejected', () => {
  const s = pos(['br', 'rb']);
  for (const m of [null, {}, { i: '0', p: 'one' }, { i: 0 }, { i: 0, p: 'nope' }, { i: -1, p: 'one' }, { i: 4, p: 'one' }, { i: 0.5, p: 'one' }])
    assert.equal(SPL.isLegal(s, m), false, JSON.stringify(m));
  const t = SPL.create({ R: 2, C: 2, setup: 'turns' });
  SPL.apply(t, { i: 0 });
  assert.equal(SPL.isLegal(t, { i: 0 }), false); // already filled
  assert.equal(SPL.isLegal(t, { i: 1, p: 'one' }), true); // pattern is ignored while placing
  SPL.apply(t, { i: 1, p: 'one' });
  assert.equal(t.cells[1], 1);
  assert.equal(t.phase, 'place');
});

test('no moves once the game is over; splattered cells are not hit again', () => {
  const s = pos(['br', '..']);
  SPL.apply(s, { i: 0, p: 'all' });
  assert.equal(s.winner, 0);
  assert.deepEqual(SPL.legalMoves(s), []);
  assert.equal(SPL.isLegal(s, { i: 0, p: 'one' }), false);
  const u = pos(['b.r', 'rbr']);
  assert.deepEqual(SPL.hits(u, 0, 'all').sort(), [0, 3, 4]);
});

test('search agrees with the rules on a simultaneous wipe-out', () => {
  // Blue's only blobs: splattering the centre with neighbours removes both last colours → blue wins.
  const s = pos(['rrr', 'rbr', 'rrr']);
  const m = SPL.searchMove(s, { timeMs: 100 });
  assert.deepEqual([m.i, m.p], [4, 'all']);
  assert.ok(m.value > 1000);
});

test('normal AI clearly beats random play', () => {
  let wins = 0;
  for (let g = 0; g < 20; g++) {
    const s = SPL.create({ R: 6, C: 6, first: g % 2, patterns: g < 10 ? 'classic' : 'extended' });
    while (!SPL.isOver(s)) {
      const ms = SPL.legalMoves(s);
      SPL.apply(s, s.turn === 0 ? SPL.aiMove(s, 'normal') : ms[Math.floor(Math.random() * ms.length)]);
    }
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 17, `normal won only ${wins}/20 vs random`);
});
