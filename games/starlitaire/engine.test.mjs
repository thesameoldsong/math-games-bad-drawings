import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAR } from './engine.js';

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

test('skip one on 8 dots: an octagram drawn as one figure', () => {
  const s = STAR.create(8, [2]);
  assert.equal(STAR.tap(s, 0), 'start');
  assert.equal(STAR.next(s), 3);
  assert.deepEqual(STAR.skipped(s), [1, 2]);
  let r;
  for (let i = 0; i < 8; i++) r = STAR.tap(s, STAR.next(s));
  assert.equal(r, 'done');
  assert.equal(s.segs.length, 8);
  assert.deepEqual(STAR.figures(s).map((f) => f.corners), [8]);
});

test('figure count for a single skip equals gcd(n, skip + 1)', () => {
  for (let n = 3; n <= 24; n++) for (let k = 0; k + 1 < n; k++) {
    const f = STAR.figures(STAR.complete(STAR.create(n, [k])));
    const g = STAR.gcd(n, k + 1);
    assert.equal(f.length, g, `n=${n} skip=${k}`);
    for (const x of f) assert.equal(x.corners, n / g);
  }
});

test('12 dots: skip 1/2/3 give 2/3/4 figures; 13 dots always one', () => {
  assert.deepEqual([1, 2, 3].map((k) => STAR.predictFigures(12, [k])), [2, 3, 4]);
  assert.deepEqual([1, 2, 3].map((k) => STAR.predictFigures(13, [k])), [1, 1, 1]);
});

test('wrong dot is rejected and counted, state otherwise unchanged', () => {
  const s = STAR.create(10, [1]);
  STAR.tap(s, 4);
  assert.equal(STAR.tap(s, 5), 'wrong');
  assert.equal(s.mistakes, 1);
  assert.equal(s.segs.length, 0);
  assert.equal(STAR.tap(s, 6), 'line');
});

test('a new figure must start on an untouched dot', () => {
  const s = STAR.create(6, [1]);
  STAR.tap(s, 0);
  assert.equal(STAR.tap(s, 2), 'line');
  assert.equal(STAR.tap(s, 4), 'line');
  assert.equal(STAR.tap(s, 0), 'close');
  assert.equal(s.pen, null);
  assert.equal(STAR.tap(s, 2), 'ignored');
  assert.deepEqual(STAR.startDots(s), [1, 3, 5]);
  assert.equal(STAR.tap(s, 3), 'start');
  STAR.tap(s, 5); STAR.tap(s, 1);
  assert.equal(STAR.tap(s, 3), 'done');
  assert.ok(STAR.isDone(s));
  assert.equal(STAR.tap(s, 0), 'ignored');
});

test('diameters: 6 dots skipping 2 draws three 2-corner figures', () => {
  const f = STAR.figures(STAR.complete(STAR.create(6, [2])));
  assert.deepEqual(f.map((x) => x.corners), [2, 2, 2]);
});

test('mixed rule cycles through the skips and closes only in phase', () => {
  const s = STAR.create(12, [1, 2]);
  STAR.tap(s, 0);
  assert.equal(STAR.next(s), 2); STAR.tap(s, 2);
  assert.equal(STAR.next(s), 5); STAR.tap(s, 5);
  assert.equal(STAR.next(s), 7);
  const done = STAR.complete(s);
  assert.ok(STAR.isDone(done));
  assert.equal(STAR.figures(done).length, 1);
  assert.equal(done.segs.length, 24);
});

test('every preset on every size terminates with all dots touched', () => {
  for (let n = 5; n <= 24; n++) for (const p of STAR.PATTERNS) {
    if (p.some((k) => k + 1 >= n)) continue;
    const c = STAR.complete(STAR.create(n, p));
    assert.ok(STAR.isDone(c), `n=${n} p=${p}`);
  }
});

test('auto tap never makes an illegal move', () => {
  const s = STAR.create(15, [1, 3]);
  let n = 0;
  while (!STAR.isDone(s)) {
    const r = STAR.tap(s, STAR.autoTap(s));
    assert.ok(!['wrong', 'ignored'].includes(r), r);
    assert.ok(++n < 1000);
  }
  assert.equal(s.mistakes, 0);
});

test('free mode: connect anything, tap the pen dot to lift, never done', () => {
  const s = STAR.create(7, null);
  assert.equal(STAR.tap(s, 0), 'start');
  assert.equal(STAR.tap(s, 3), 'line');
  assert.equal(STAR.tap(s, 5), 'line');
  assert.equal(STAR.tap(s, 5), 'lift');
  assert.equal(STAR.figures(s).length, 1);
  STAR.tap(s, 2); STAR.tap(s, 2);
  assert.equal(s.loops.length, 1, 'empty loop discarded');
  for (let d = 0; d < 7; d++) STAR.tap(s, d);
  assert.equal(STAR.isDone(s), false);
});

test('invalid rules are refused', () => {
  assert.throws(() => STAR.create(5, [4]));
  assert.throws(() => STAR.create(2, [0]));
  assert.throws(() => STAR.create(6, []));
});

test('clone is deep', () => {
  const s = STAR.create(9, [2]);
  STAR.tap(s, 0); STAR.tap(s, 3);
  const c = STAR.clone(s);
  STAR.tap(c, 6);
  assert.equal(s.segs.length, 1);
  assert.equal(s.loops[0].verts.length, 2);
});

// Draw to the end, starting each new figure on a random empty dot.
function randomStarts(n, p) {
  const s = STAR.create(n, p);
  while (!STAR.isDone(s)) {
    if (s.pen === null) { const c = STAR.startDots(s); STAR.tap(s, c[Math.floor(Math.random() * c.length)]); }
    else assert.notEqual(STAR.tap(s, STAR.next(s)), 'wrong');
  }
  return s;
}

test('single skip: any start order gives gcd figures, and the guess offers it', () => {
  for (let n = 5; n <= 24; n++) for (let k = 0; k <= n / 2 - 1; k++) {
    const g = STAR.gcd(n, k + 1);
    for (let i = 0; i < 5; i++) assert.equal(STAR.figures(randomStarts(n, [k])).length, g, `n=${n} k=${k}`);
    const ch = STAR.guessChoices(n, [k]);
    assert.ok(ch.includes(g));
    assert.ok(ch.every((d) => d < n && n % d === 0));
  }
});

test('mixed rules and free drawing offer no guess (count depends on starts)', () => {
  assert.deepEqual(STAR.guessChoices(7, [2, 3]), []);
  assert.deepEqual(STAR.guessChoices(7, null), []);
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(STAR.figures(randomStarts(7, [2, 3])).length);
  assert.ok(seen.size > 1, 'start order changes the count');
});

test('degenerate mixed rules (steps sum to a lap) are detected', () => {
  assert.ok(STAR.degenerate(5, [1, 2]));
  assert.ok(STAR.degenerate(8, [2, 4]));
  assert.ok(!STAR.degenerate(12, [1, 2]));
  assert.ok(!STAR.degenerate(6, [4]));
});

test('closing a figure needs the start dot at the start of the rule cycle', () => {
  const s = STAR.create(6, [0, 2]); // steps 1, 3: 0 -> 1 -> 4 -> 5 -> 2 -> 3 -> 0
  STAR.tap(s, 0);
  const seq = [];
  let r;
  do { const d = STAR.next(s); r = STAR.tap(s, d); seq.push(d); } while (r === 'line');
  assert.deepEqual(seq, [1, 4, 5, 2, 3, 0]);
  assert.equal(r, 'done');
});

test('taps out of range, while done, or non-integers are ignored', () => {
  const s = STAR.create(5, [1]);
  for (const d of [-1, 5, 1.5, null, undefined]) assert.equal(STAR.tap(s, d), 'ignored');
  assert.equal(s.mistakes, 0);
  const c = STAR.complete(s);
  assert.equal(STAR.tap(c, 0), 'ignored');
  assert.equal(STAR.autoTap(c), null);
});
