import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIM } from './engine.js';

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

const e = (a, b) => ({ e: SIM.edge(a, b) });
function playAll(s, moves) { for (const m of moves) SIM.apply(s, m); return s; }

test('board: 6 dots, 15 lines, 20 triangles', () => {
  assert.equal(SIM.EDGES.length, 15);
  assert.equal(SIM.TRIS.length, 20);
  const s = SIM.create();
  assert.equal(SIM.freeEdges(s).length, 15);
});

test('closing a triangle in your own colour loses at once', () => {
  // blue: 0-1, 1-2; red: 3-4, 4-5 (red is in no danger)
  const s = playAll(SIM.create(), [e(0, 1), e(3, 4), e(1, 2), e(4, 5)]);
  assert.equal(s.over, false);
  assert.equal(s.turn, 0);
  SIM.apply(s, e(0, 2));
  assert.equal(s.over, true);
  assert.equal(s.winner, 1);
  assert.equal(s.reason, 'triangle');
  assert.deepEqual(s.tri, [0, 1, 2]);
});

test('mixed triangles and crossings are harmless', () => {
  const s = playAll(SIM.create(), [e(0, 1), e(1, 2), e(3, 5), e(0, 2)]);
  // blue 0-1, 3-5; red 1-2, 0-2: triangle 0-1-2 is mixed
  assert.equal(s.over, false);
  assert.equal(SIM.monoTris(s).length, 0);
});

test('drawn lines cannot be redrawn; turn alternates', () => {
  const s = SIM.create({ first: 1 });
  assert.equal(s.turn, 1);
  SIM.apply(s, e(2, 5));
  assert.equal(s.turn, 0);
  assert.equal(SIM.isLegal(s, e(5, 2)), false);
  assert.throws(() => SIM.apply(s, e(2, 5)));
});

test('no ties: every full colouring has a one-colour triangle (Ramsey R(3,3)=6)', () => {
  for (let k = 0; k < 2000; k++) {
    const s = SIM.create({ manual: true });
    s.col = s.col.map(() => (Math.random() < 0.5 ? 0 : 1));
    assert.ok(SIM.monoTris(s).length > 0);
  }
});

test('manual rule: triangle stays until called; correct call wins, own-triangle steal wins, false call loses', () => {
  const base = () => playAll(SIM.create({ manual: true }), [e(0, 1), e(3, 4), e(1, 2), e(4, 5), e(0, 2)]);
  // blue made 0-1-2; game goes on
  let s = base();
  assert.equal(s.over, false);
  assert.equal(s.turn, 1);
  SIM.apply(s, { call: [2, 0, 1] });
  assert.equal(s.winner, 1); assert.equal(s.reason, 'called');

  // red misses it and moves; blue steals the win by pointing at its own triangle
  s = base();
  SIM.apply(s, e(3, 5)); // red closes 3-4-5 as well (only matters if blue calls it)
  SIM.apply(s, { call: [0, 1, 2] });
  assert.equal(s.winner, 0); assert.equal(s.reason, 'stolen');

  s = base();
  SIM.apply(s, { call: [0, 1, 3] });
  assert.equal(s.winner, 0); assert.equal(s.reason, 'false');

  // calls are illegal under the automatic rule
  assert.equal(SIM.isLegal(SIM.create(), { call: [0, 1, 2] }), false);
  assert.equal(SIM.isLegal(SIM.create({ manual: true }), { call: [0, 0, 2] }), false);
});

test('manual rule: a full board forces a call', () => {
  const s = SIM.create({ manual: true });
  let i = 0;
  while (SIM.freeEdges(s).length) { SIM.apply(s, { e: SIM.freeEdges(s)[i++ % 3 === 0 ? 0 : SIM.freeEdges(s).length - 1] }); }
  assert.ok(SIM.mustCall(s));
  const m = SIM.aiMove(s, 'easy');
  assert.ok(m.call);
  SIM.apply(s, m);
  assert.equal(s.over, true);
  assert.notEqual(s.reason, 'false');
});

test('solver: Sim is a second-player win', () => {
  assert.equal(SIM.moverWins(SIM.create()), false);
  assert.ok(SIM.moveValues(SIM.create()).every((x) => x.v < 0));
});

test('AI never makes illegal moves and avoids own triangles when it can', () => {
  for (const level of ['easy', 'normal', 'hard']) for (const manual of [false, true]) {
    for (let g = 0; g < 15; g++) {
      const s = SIM.create({ first: g % 2, manual });
      let guard = 0;
      while (!s.over && guard++ < 40) {
        const m = SIM.aiMove(s, level);
        assert.ok(SIM.isLegal(s, m), `${level}: illegal ${JSON.stringify(m)}`);
        if (m.e !== undefined && level !== 'easy') {
          const safe = SIM.safeEdges(s, s.turn);
          if (safe.length) assert.ok(safe.includes(m.e), `${level} drew its own triangle with safe moves left`);
        }
        SIM.apply(s, m);
      }
      assert.ok(s.over, 'game terminated');
      assert.ok(guard <= 16);
    }
  }
});

test('hard AI never loses as the second player, and beats normal overall', () => {
  let hardWins = 0;
  for (let g = 0; g < 40; g++) {
    const hardSeat = g % 2;
    const s = SIM.create({ first: 0 });
    while (!s.over) SIM.apply(s, SIM.aiMove(s, s.turn === hardSeat ? 'hard' : 'normal'));
    if (hardSeat === 1) assert.equal(s.winner, 1, 'perfect second player must win');
    if (s.winner === hardSeat) hardWins++;
  }
  assert.ok(hardWins >= 24, `hard won ${hardWins}/40`);
});

test('normal AI beats easy most of the time', () => {
  let w = 0;
  for (let g = 0; g < 40; g++) {
    const s = SIM.create({ first: g % 2 });
    while (!s.over) SIM.apply(s, SIM.aiMove(s, s.turn === 0 ? 'normal' : 'easy'));
    if (s.winner === 0) w++;
  }
  assert.ok(w >= 28, `normal won ${w}/40`);
});

test('auto rule: nothing is legal after the game ends; a forced loser still has a legal move', () => {
  const s = playAll(SIM.create(), [e(0, 1), e(3, 4), e(1, 2), e(4, 5), e(0, 2)]);
  assert.equal(s.over, true);
  assert.equal(SIM.isLegal(s, e(2, 3)), false);
  assert.equal(SIM.aiMove(s, 'hard'), null);
  // a position where blue has no safe line left: AI must still return a legal (losing) line
  for (let k = 0; k < 200; k++) {
    const t = SIM.create();
    while (!t.over && SIM.safeEdges(t, t.turn).length) SIM.apply(t, SIM.aiMove(t, 'easy'));
    if (t.over) continue;
    for (const lvl of ['easy', 'normal', 'hard']) {
      const m = SIM.aiMove(t, lvl);
      assert.ok(SIM.isLegal(t, m));
      const u = SIM.apply(SIM.clone(t), m);
      assert.equal(u.over, true); assert.equal(u.winner, 1 - t.turn);
    }
  }
});

test('manual rule: an old unnoticed triangle can still be called later; mixed triangle call loses', () => {
  const s = playAll(SIM.create({ manual: true }), [e(0, 1), e(3, 4), e(1, 2), e(3, 5), e(0, 2), e(2, 3), e(0, 5)]);
  // blue's 0-1-2 has been on the board for two turns; red now calls it
  assert.equal(s.turn, 1);
  const t = SIM.clone(s);
  SIM.apply(t, { call: [1, 2, 0] });
  assert.equal(t.winner, 1); assert.equal(t.reason, 'called');
  // 2-3-? is mixed (2-3 red, 0-2 blue): calling 0,2,3 is false
  SIM.apply(s, { call: [0, 2, 3] });
  assert.equal(s.winner, 0); assert.equal(s.reason, 'false');
});

test('state survives a JSON round trip (online sync) and moves keep working', () => {
  const s = playAll(SIM.create({ first: 1, manual: true }), [e(0, 1), e(2, 3)]);
  const r = JSON.parse(JSON.stringify(s));
  SIM.apply(r, e(4, 5));
  assert.equal(r.ply, 3);
  assert.equal(r.turn, 0);
});

test('hard AI against itself: the second player always wins', () => {
  for (let g = 0; g < 10; g++) {
    const s = SIM.create({ first: g % 2 });
    while (!s.over) SIM.apply(s, SIM.aiMove(s, 'hard'));
    assert.equal(s.winner, 1 - (g % 2));
  }
});

test('normal AI clearly beats random play', () => {
  let w = 0;
  for (let g = 0; g < 200; g++) {
    const s = SIM.create({ first: g % 2 });
    while (!s.over) {
      const f = SIM.freeEdges(s);
      SIM.apply(s, s.turn === 0 ? SIM.aiMove(s, 'normal') : { e: f[Math.floor(Math.random() * f.length)] });
    }
    if (s.winner === 0) w++;
  }
  assert.ok(w >= 180, `normal won ${w}/200 vs random`);
});
