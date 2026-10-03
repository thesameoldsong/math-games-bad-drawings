import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WLB } from './engine.js';

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

const seeded = (seed) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x80000000;
};

test('deal gives each seat a different card and finds the guesser', () => {
  for (let i = 0; i < 50; i++) {
    const s = WLB.create();
    assert.deepEqual(s.roles.slice().sort(), ['banana', 'lose', 'win']);
    assert.equal(s.roles[s.win], 'win');
    assert.equal(WLB.suspects(s).length, 2);
    assert.ok(!WLB.suspects(s).includes(s.win));
  }
});

test('right guess: win and banana share the victory', () => {
  const s = WLB.create({ roles: ['lose', 'win', 'banana'] });
  assert.ok(WLB.pick(s, 2));
  assert.equal(s.phase, 'over');
  assert.equal(s.result.correct, true);
  assert.deepEqual(s.result.winners.sort(), [1, 2]);
  assert.deepEqual(s.scores, [0, 1, 1]);
});

test('wrong guess: lose wins alone', () => {
  const s = WLB.create({ roles: ['lose', 'win', 'banana'], scores: [2, 3, 4] });
  assert.ok(WLB.pick(s, 0));
  assert.equal(s.result.correct, false);
  assert.deepEqual(s.result.winners, [0]);
  assert.deepEqual(s.scores, [3, 3, 4]);
});

test('illegal actions are refused', () => {
  const s = WLB.create({ roles: ['win', 'banana', 'lose'] });
  assert.equal(WLB.pick(s, 0), false, 'cannot pick yourself');
  assert.equal(WLB.pick(s, 3), false);
  assert.equal(WLB.pitch(s, 0, 'me'), false, 'the guesser does not pitch');
  assert.equal(WLB.pitch(s, 1, 'nonsense'), false);
  assert.ok(WLB.pitch(s, 1, 'me'));
  assert.ok(WLB.pitch(s, 1, 'swear'), 'humans guessing → suspects may talk freely');
  WLB.pick(s, 1);
  assert.equal(WLB.pick(s, 2), false, 'no second guess');
  assert.equal(WLB.pitch(s, 2, 'me'), false, 'no talking after the reveal');
});

test('computer guesser: one final word each, guess only after both spoke', () => {
  const s = WLB.create({ bots: [true, false, false], roles: ['win', 'banana', 'lose'] });
  assert.ok(s.oneWord);
  assert.equal(WLB.canPick(s, 1), false);
  assert.ok(WLB.pitch(s, 1, 'me'));
  assert.equal(WLB.pitch(s, 1, 'liar'), false);
  assert.equal(WLB.canPick(s, 1), false);
  assert.ok(WLB.pitch(s, 2, 'me'));
  assert.ok(WLB.canPick(s, 2));
});

test('view hides suspects from the guesser and spectators, not from suspects', () => {
  const s = WLB.create({ roles: ['lose', 'win', 'banana'] });
  assert.deepEqual(WLB.view(s, 1).roles, [null, 'win', null]);
  assert.deepEqual(WLB.view(s, -1).roles, [null, 'win', null]);
  assert.deepEqual(WLB.view(s, 0).roles, ['lose', 'win', 'banana']);
  WLB.pick(s, 0);
  assert.deepEqual(WLB.view(s, 1).roles, ['lose', 'win', 'banana']);
});

test('bots get tells only as suspects', () => {
  const s = WLB.create({ bots: [true, true, true], roles: ['banana', 'win', 'lose'] });
  assert.equal(s.tell[1], null);
  assert.ok(['calm', 'nervous'].includes(s.tell[0]));
  assert.ok(['calm', 'nervous'].includes(s.tell[2]));
});

test('AI pitches and guesses are always legal; AI-vs-AI rounds terminate', () => {
  const rng = seeded(7);
  for (const level of ['easy', 'normal']) {
    let scores = [0, 0, 0];
    const model = WLB.newModel();
    for (let r = 1; r <= 300; r++) {
      const s = WLB.create({ bots: [true, true, true], level, scores, round: r, rng });
      for (const p of WLB.suspects(s)) {
        const id = WLB.aiPitch(s, p, rng);
        assert.ok(WLB.PITCHES.includes(id));
        assert.ok(WLB.pitch(s, p, id));
      }
      const g = WLB.aiGuess(s, model, rng);
      assert.ok(WLB.canPick(s, g));
      assert.ok(WLB.pick(s, g));
      assert.ok(WLB.isOver(s));
      WLB.learn(model, s);
      scores = s.scores;
    }
    assert.ok(scores.reduce((a, b) => a + b) >= 300);
  }
});

test('normal guesser reads easy bots better than chance', () => {
  const rng = seeded(11);
  let right = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const s = WLB.create({ bots: [true, true, true], level: 'easy', rng });
    for (const p of WLB.suspects(s)) WLB.pitch(s, p, WLB.aiPitch(s, p, rng));
    // the guesser's reading of the bots' pitches and faces (same level table as the suspects)
    const [a, b] = WLB.suspects(s);
    const g = WLB.bananaChance(s, {}, a) > 0.5 ? a : b;
    if (g === WLB.bananaOf(s)) right++;
  }
  assert.ok(right / N > 0.7, `only ${right}/${N}`);
});

test('normal guesser learns a predictable human', () => {
  const rng = seeded(3);
  const model = WLB.newModel();
  let right = 0, total = 0;
  for (let i = 0; i < 200; i++) {
    // seat 0 is the human; seat 1 a bot guesser; seat 2 a bot suspect
    const roles = rng() < 0.5 ? ['banana', 'win', 'lose'] : ['lose', 'win', 'banana'];
    const s = WLB.create({ bots: [false, true, true], level: 'normal', roles, rng });
    WLB.pitch(s, 0, s.roles[0] === 'banana' ? 'me' : 'liar'); // a human with a habit
    WLB.pitch(s, 2, WLB.aiPitch(s, 2, rng));
    const g = WLB.aiGuess(s, model, rng);
    if (i >= 40) { total++; if (g === WLB.bananaOf(s)) right++; }
    WLB.pick(s, g);
    WLB.learn(model, s);
  }
  assert.ok(right / total > 0.8, `only ${right}/${total}`);
});

test('easy guesser is a coin flip', () => {
  const rng = seeded(5);
  let first = 0;
  for (let i = 0; i < 1000; i++) {
    const s = WLB.create({ bots: [true, false, false], level: 'easy', roles: ['win', 'banana', 'lose'], rng });
    WLB.pitch(s, 1, 'me'); WLB.pitch(s, 2, 'me');
    if (WLB.aiGuess(s, {}, rng) === 1) first++;
  }
  assert.ok(first > 420 && first < 580);
});

const PERMS = [
  ['win', 'lose', 'banana'], ['win', 'banana', 'lose'], ['lose', 'win', 'banana'],
  ['banana', 'win', 'lose'], ['lose', 'banana', 'win'], ['banana', 'lose', 'win'],
];

test('every deal: both guesses score exactly as the rules say', () => {
  for (const roles of PERMS) {
    const win = roles.indexOf('win'), banana = roles.indexOf('banana'), lose = roles.indexOf('lose');
    for (const target of [banana, lose]) {
      const s = WLB.create({ roles, scores: [5, 5, 5] });
      assert.ok(WLB.pick(s, target), 'a human guesser may pick before anyone talks');
      const exp = [5, 5, 5];
      if (target === banana) { exp[win]++; exp[banana]++; } else exp[lose]++;
      assert.deepEqual(s.scores, exp, `${roles} → ${target}`);
      assert.equal(s.result.correct, target === banana);
      assert.equal(WLB.pick(s, target), false);
    }
  }
});

test('out-of-range and post-reveal actions are refused', () => {
  const s = WLB.create({ roles: ['lose', 'win', 'banana'] });
  for (const p of [-1, 3, 1]) assert.equal(WLB.pitch(s, p, 'me'), false);
  for (const t of [-1, 1, 3, undefined, null, '2', 0.5]) assert.equal(WLB.canPick(s, t), false, String(t));
  assert.equal(WLB.pitch(s, '0', 'me'), false);
  assert.ok(WLB.pick(s, 2));
  assert.equal(WLB.pitch(s, 0, 'me'), false);
  assert.equal(s.n, 1);
});

test('view never mutates the state and hides cards from the guesser in every deal', () => {
  for (const roles of PERMS) {
    const s = WLB.create({ roles });
    const before = JSON.stringify(s);
    for (const v of [0, 1, 2]) {
      const r = WLB.view(s, v).roles;
      if (v === s.win) assert.deepEqual(r.filter(Boolean), ['win']);
      else assert.deepEqual(r, roles);
    }
    assert.equal(JSON.stringify(s), before);
  }
});

test('learn only uses rounds a computer guessed, and only human seats', () => {
  const model = WLB.newModel();
  const h = WLB.create({ roles: ['banana', 'win', 'lose'] });           // human guesser
  WLB.pitch(h, 0, 'me'); WLB.pick(h, 0);
  WLB.learn(model, h);
  assert.deepEqual(model, {});
  const b = WLB.create({ bots: [false, true, true], roles: ['banana', 'win', 'lose'] });
  WLB.learn(model, b);                                                   // not over yet
  assert.deepEqual(model, {});
  WLB.pitch(b, 0, 'swear'); WLB.pitch(b, 2, 'me'); WLB.pick(b, 2);
  WLB.learn(model, b);
  assert.deepEqual(model, { 0: { banana: { swear: 1 }, lose: {} } });
});

test('bananaChance is a proper probability split between the suspects', () => {
  const rng = seeded(21);
  for (let i = 0; i < 200; i++) {
    const s = WLB.create({ bots: [rng() < 0.5, true, rng() < 0.5], level: rng() < 0.5 ? 'easy' : 'normal', rng });
    for (const p of WLB.suspects(s)) if (rng() < 0.8) WLB.pitch(s, p, WLB.PITCHES[Math.floor(rng() * 4)]);
    const [a, b] = WLB.suspects(s);
    const pa = WLB.bananaChance(s, {}, a), pb = WLB.bananaChance(s, {}, b);
    assert.ok(pa >= 0 && pa <= 1);
    assert.ok(Math.abs(pa + pb - 1) < 1e-9);
  }
});

test('aiGuess always names a suspect, whoever holds win', () => {
  const rng = seeded(9);
  for (const roles of PERMS) for (const level of ['easy', 'normal']) {
    const s = WLB.create({ bots: [true, true, true], level, roles, rng });
    for (const p of WLB.suspects(s)) WLB.pitch(s, p, WLB.aiPitch(s, p, rng));
    for (let i = 0; i < 20; i++) assert.ok(WLB.suspects(s).includes(WLB.aiGuess(s, {}, rng)));
  }
});

test('observant guesser beats the easy coin-flipper against observant bots', () => {
  const rng = seeded(37);
  let normal = 0, easy = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const s = WLB.create({ bots: [true, true, true], level: 'normal', rng });
    for (const p of WLB.suspects(s)) WLB.pitch(s, p, WLB.aiPitch(s, p, rng));
    const banana = WLB.bananaOf(s);
    if (WLB.aiGuess(s, {}, rng) === banana) normal++;
    if (WLB.aiGuess({ ...s, level: 'easy' }, {}, rng) === banana) easy++;
  }
  assert.ok(normal / N > easy / N + 0.04, `${normal} vs ${easy}`);
});

test('observant guesser stays at a coin flip against an unpredictable human', () => {
  const rng = seeded(41);
  const model = WLB.newModel();
  let right = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const roles = rng() < 0.5 ? ['banana', 'win', 'lose'] : ['lose', 'win', 'banana'];
    const s = WLB.create({ bots: [false, true, false], level: 'normal', roles, rng });
    for (const p of [0, 2]) WLB.pitch(s, p, WLB.PITCHES[Math.floor(rng() * 4)]);
    const g = WLB.aiGuess(s, model, rng);
    if (g === WLB.bananaOf(s)) right++;
    WLB.pick(s, g); WLB.learn(model, s);
  }
  assert.ok(Math.abs(right / N - 0.5) < 0.05, `${right}/${N}`);
});
