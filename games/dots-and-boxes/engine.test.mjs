import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAB } from './engine.js';

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

test('completing a box scores and keeps the turn', () => {
  const s = DAB.create(2, 2);
  for (const e of [{ t: 'h', r: 0, c: 0 }, { t: 'v', r: 0, c: 0 }, { t: 'v', r: 0, c: 1 }]) DAB.apply(s, e);
  const turn = s.turn;
  assert.equal(DAB.apply(s, { t: 'h', r: 1, c: 0 }), 1);
  assert.equal(s.turn, turn);
  assert.equal(s.score[turn], 1);
});

test('AI always finishes a game with all boxes claimed', () => {
  for (const level of ['easy', 'normal', 'hard']) {
    const s = DAB.create(4, 4);
    while (!DAB.isOver(s)) DAB.apply(s, DAB.aiMove(s, level));
    assert.equal(s.score[0] + s.score[1], 16);
  }
});

test('hard AI beats normal AI most of the time', () => {
  let wins = 0;
  for (let i = 0; i < 20; i++) {
    const s = DAB.create(5, 5);
    if (i % 2) s.turn = 1;
    while (!DAB.isOver(s)) DAB.apply(s, DAB.aiMove(s, s.turn === 0 ? 'hard' : 'normal'));
    if (s.score[0] > s.score[1]) wins++;
  }
  assert.ok(wins >= 13, `hard won only ${wins}/20`);
});
