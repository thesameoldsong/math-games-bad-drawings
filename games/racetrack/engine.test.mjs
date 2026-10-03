import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RT } from './engine.js';

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

const mv = (ax, ay) => ({ ax, ay });
const legalMoves = (s) => RT.legal(s).map((m) => `${m.ax},${m.ay}`);

test('tracks: start points are on the track and the lap length is sane', () => {
  for (const id of RT.TRACKS) {
    const T = RT.track(id);
    assert.ok(T.pts.length > 150, id);
    for (const [x, y] of T.starts) assert.ok(T.isIn(x, y), `${id} start ${x},${y}`);
    assert.ok(T.L > 30 && T.L < 120, `${id} L=${T.L}`);
  }
});

test('inertia: nine options around the coasting point', () => {
  const s = RT.create('loop');
  const c = s.cars[0];
  c.x = 3; c.y = 8; c.vx = 1; c.vy = -2; s.cars[1].x = 4; s.cars[1].y = 16;
  const o = RT.options(s);
  assert.equal(o.length, 9);
  const pts = o.map((m) => `${m.x},${m.y}`).sort();
  const want = [];
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) want.push(`${3 + 1 + dx},${8 - 2 + dy}`);
  assert.deepEqual(pts, want.sort());
});

test('a move keeps velocity and passes the turn', () => {
  const s = RT.create('loop');
  RT.apply(s, mv(0, -1));
  assert.deepEqual([s.cars[0].x, s.cars[0].y, s.cars[0].vx, s.cars[0].vy], [2, 11, 0, -1]);
  assert.equal(s.turn, 1);
  RT.apply(s, mv(0, -1));
  RT.apply(s, mv(0, -1));           // blue: speed 2 up
  assert.deepEqual([s.cars[0].x, s.cars[0].y, s.cars[0].vy], [2, 9, -2]);
});

test('cannot stop on the rival', () => {
  const s = RT.create('loop');      // blue at (2,12), red at (4,12)
  s.cars[0].vx = 1;                 // coasting would land on (3,12); +1 lands on red
  const bad = RT.options(s).find((m) => m.x === 4 && m.y === 12);
  assert.ok(bad.blocked);
  assert.equal(RT.apply(RT.clone(s), { ax: bad.ax, ay: bad.ay }), null);
  assert.ok(!legalMoves(s).includes(`${bad.ax},${bad.ay}`));
});

test('crash: car is put back on the track, stopped, and misses two turns', () => {
  const s = RT.create('loop');
  const c = s.cars[0];
  c.vx = -3; c.vy = 0;              // flying left into the outer wall
  const ev = RT.apply(s, mv(0, 0));
  assert.ok(ev.crash);
  assert.ok(RT.track('loop').isIn(c.x, c.y));
  assert.deepEqual([c.vx, c.vy, c.skip], [0, 0, 2]);
  assert.equal(s.turn, 1);
  RT.apply(s, mv(0, -1));           // red moves; blue's turn is skipped
  assert.equal(s.turn, 1);
  assert.equal(c.skip, 1);
  RT.apply(s, mv(0, -1));
  assert.equal(s.turn, 1);
  assert.equal(c.skip, 0);
  RT.apply(s, mv(0, -1));
  assert.equal(s.turn, 0);
});

test('crash penalty "out" ends the race at once', () => {
  const s = RT.create('loop', { penalty: 'out' });
  s.cars[0].vx = -3;
  const ev = RT.apply(s, mv(0, 0));
  assert.ok(ev.crash && s.over);
  assert.equal(s.winner, 1);
  assert.equal(s.reason, 'crash');
});

test('a path cutting through the island is a crash even if it ends on track', () => {
  const s = RT.create('loop');
  const c = s.cars[0];
  c.x = 3; c.y = 16; c.vx = 11; c.vy = 0;   // (3,16) → (14,16) straight through the infield
  const T = RT.track('loop');
  assert.ok(T.isIn(14, 16));
  assert.ok(RT.apply(s, mv(0, 0)).crash);
});

test('backing over the line does not count as a lap', () => {
  const s = RT.create('loop');
  RT.apply(s, mv(0, 1));            // blue down across the line (backwards)
  assert.equal(s.cars[0].laps, -1);
  RT.apply(s, mv(0, -1));
  RT.apply(s, mv(0, -1));           // blue stops on the line row
  RT.apply(s, mv(0, -1));
  RT.apply(s, mv(0, -1));           // and goes up again: back to lap state 0
  assert.equal(s.cars[0].laps, 0);
  assert.ok(!s.over);
});

function placeBefore(s, p, x, y, vy) { Object.assign(s.cars[p], { x, y, vx: 0, vy, laps: 0 }); }

test('first finisher wins if the rival cannot answer', () => {
  const s = RT.create('loop');
  placeBefore(s, 0, 2, 14, -1);
  placeBefore(s, 1, 4, 20, 0);
  RT.apply(s, mv(0, -1));           // blue (first) crosses: red gets a reply
  assert.ok(!s.over);
  assert.equal(s.pending, 0);
  RT.apply(s, mv(0, 0));            // red can't make it
  assert.ok(s.over);
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'finish');
});

test('both finish in the same round: farther past the line wins', () => {
  const s = RT.create('loop');
  placeBefore(s, 0, 2, 13, -1);     // blue ends at (2,11)… just past
  placeBefore(s, 1, 4, 14, -3);     // red ends at (4,10)… farther
  RT.apply(s, mv(0, -1));
  assert.equal(s.pending, 0);
  RT.apply(s, mv(0, -1));
  assert.ok(s.over);
  assert.equal(s.winner, 1);
  assert.equal(s.reason, 'photo');
});

test('second player finishing wins at once', () => {
  const s = RT.create('loop', { first: 1 });
  placeBefore(s, 0, 2, 13, -2);
  assert.equal(s.turn, 1);
  RT.apply(s, mv(0, 1));            // red dawdles
  RT.apply(s, mv(0, 0));            // blue (second in the round) crosses
  assert.ok(s.over);
  assert.equal(s.winner, 0);
});

test('AI never plays an illegal move and AI races end', () => {
  for (const id of RT.TRACKS) for (const [a, b] of [['easy', 'hard'], ['normal', 'easy'], ['hard', 'normal']]) {
    const s = RT.create(id, { first: 1 });
    let guard = 0;
    while (!s.over && guard++ < 400) {
      const m = RT.aiMove(s, s.turn === 0 ? a : b);
      assert.ok(legalMoves(s).includes(`${m.ax},${m.ay}`), `${id} ${a}/${b}: illegal ${m.ax},${m.ay}`);
      assert.ok(RT.apply(s, m));
    }
    assert.ok(s.over, `${id} ${a}/${b} did not finish`);
  }
});

test('champion beats the rookie and never crashes on purpose', () => {
  for (const id of RT.TRACKS) {
    const s = RT.create(id);
    while (!s.over) RT.apply(s, RT.aiMove(s, s.turn === 0 ? 'hard' : 'easy'));
    assert.equal(s.winner, 0, id);
    assert.equal(s.cars[0].crashes, 0, id);
  }
});

test('state survives a JSON round trip (online)', () => {
  const s = RT.create('pin');
  RT.apply(s, mv(0, -1));
  const t = JSON.parse(JSON.stringify(s));
  RT.apply(s, mv(1, -1)); RT.apply(t, mv(1, -1));
  assert.deepEqual(s, t);
});

test('a crash never puts the car back on the rival', () => {
  const T = RT.track('loop');
  const s0 = RT.create('loop');
  s0.cars[0].vx = -3;               // flying left into the outer wall from (2,12)
  const r = T.drive(2, 12, -1, 12);
  assert.ok(r.crash);
  const s = RT.clone(s0);
  Object.assign(s.cars[1], { x: r.rx, y: r.ry });   // the rival sits on the natural restart point
  const ev = RT.apply(s, mv(0, 0));
  assert.ok(ev.crash);
  assert.notDeepEqual([s.cars[0].x, s.cars[0].y], [r.rx, r.ry]);
  assert.ok(T.isIn(s.cars[0].x, s.cars[0].y));
});

test('rival in the pits: the first car over the line wins at once', () => {
  const s = RT.create('loop');
  placeBefore(s, 0, 2, 14, -1);
  placeBefore(s, 1, 4, 20, 0);
  s.cars[1].skip = 1;
  RT.apply(s, mv(0, -1));
  assert.ok(s.over);
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'finish');
});

test('a crash on the last-chance reply hands the race to the first finisher', () => {
  const s = RT.create('loop');
  placeBefore(s, 0, 2, 14, -1);
  Object.assign(s.cars[1], { x: 2, y: 17, vx: -3, vy: 0 });   // red is about to hit the outer wall
  RT.apply(s, mv(0, -1));
  assert.equal(s.pending, 0);
  const ev = RT.apply(s, mv(0, 0));
  assert.ok(ev.crash && s.over);
  assert.equal(s.winner, 0);
});

test('both cars exactly level after the same round: a tie', () => {
  const s = RT.create('loop');
  placeBefore(s, 0, 2, 13, -1);
  placeBefore(s, 1, 4, 13, -1);
  RT.apply(s, mv(0, 0));            // blue to (2,12)
  RT.apply(s, mv(0, 0));            // red to (4,12)
  const T = RT.track('loop');
  if (T.togo(2, 12) === T.togo(4, 12)) assert.equal(s.winner, -1);
  else assert.equal(s.winner, T.togo(2, 12) < T.togo(4, 12) ? 0 : 1);
  assert.ok(s.over && s.reason === 'photo');
});

test('a move that crosses the line and then hits the wall still finishes', () => {
  const s = RT.create('loop', { first: 1 });
  Object.assign(s.cars[0], { x: 2, y: 15, vx: -1, vy: -4, laps: 0 });   // (2,15) → (1,11) clips the outer wall past the line
  RT.apply(s, mv(1, 1));            // red dawdles (first in the round)
  const T = RT.track('loop');
  const r = T.drive(2, 15, 0, 10);
  assert.ok(r.crash);
  const ev = RT.apply(s, mv(-1, 0));  // blue: velocity (-2,-5) → aims for (0,10)
  assert.ok(ev.crash);
  assert.equal(s.cars[0].laps, r.cross);
  assert.equal(r.cross, 1);
  assert.ok(s.over && s.winner === 0);
});

test('random races keep every invariant', () => {
  for (const id of RT.TRACKS) for (const penalty of [1, 2, 3, 'out']) for (let g = 0; g < 4; g++) {
    const s = RT.create(id, { penalty, first: g % 2 });
    const T = RT.track(id);
    let guard = 0;
    while (!s.over && guard++ < 500) {
      const l = RT.legal(s);
      assert.ok(l.length > 0);
      const m = Math.random() < 0.5 ? RT.aiMove(s, 'easy') : l[Math.floor(Math.random() * l.length)];
      assert.ok(RT.apply(s, m));
      for (const c of s.cars) assert.ok(T.isIn(c.x, c.y), `${id}: car off the track`);
      assert.ok(s.cars[0].x !== s.cars[1].x || s.cars[0].y !== s.cars[1].y, `${id}: cars on one point`);
      if (!s.over) {
        assert.equal(s.cars[s.turn].skip, 0, 'a car in the pits is to move');
        assert.ok(s.cars[s.turn].laps < 1, 'a finished car is to move');
      }
    }
    assert.ok(s.over, `${id} ${penalty}: race did not end`);
  }
});

test('the racer clearly beats random (but careful) driving', () => {
  let wins = 0, n = 0;
  for (const id of RT.TRACKS) for (let g = 0; g < 2; g++) {
    const s = RT.create(id, { first: g });
    while (!s.over) {
      if (s.turn === 0) RT.apply(s, RT.aiMove(s, 'normal'));
      else {
        const l = RT.legal(s), safe = l.filter((m) => !m.crash), pool = safe.length ? safe : l;
        RT.apply(s, pool[Math.floor(Math.random() * pool.length)]);
      }
    }
    n++; if (s.winner === 0) wins++;
  }
  assert.equal(wins, n);
});
