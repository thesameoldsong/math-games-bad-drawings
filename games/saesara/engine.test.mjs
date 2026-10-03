import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SAE, ATOMS } from './engine.js';
import { rng } from '../../shared/sketch.js';

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

const R = (a, op = null, b = null) => ({ t: 'all', a, op, b });
const sq = (N, r, c) => r * N + c;

// A hand-made round with a known rule.
function round(rule, { N = 8, zeroAt = -1, nPlayers = 2 } = {}) {
  const st = SAE.create({ N, nPlayers, rounds: 1, tier: 'easy' }, rng(1));
  st.rule = SAE.normRule(rule);
  st.zero = zeroAt >= 0;
  st.pos = [zeroAt];
  st.obs = []; st.guesses = []; st.votes = [];
  st.turn = 0; st.phase = 'try';
  return st;
}

test('geography atoms', () => {
  const N = 8, P = [-1];
  assert.equal(SAE.evalRule(R('top'), N, P, 1, sq(N, 3, 0)), true);
  assert.equal(SAE.evalRule(R('top'), N, P, 1, sq(N, 4, 0)), false);
  assert.equal(SAE.evalRule(R('chessA'), N, P, 1, sq(N, 0, 0)), true);
  assert.equal(SAE.evalRule(R('chessA'), N, P, 1, sq(N, 0, 1)), false);
  assert.equal(SAE.evalRule(R('edge'), N, P, 1, sq(N, 7, 3)), true);
  assert.equal(SAE.evalRule(R('inner'), N, P, 1, sq(N, 1, 1)), true);
  assert.equal(SAE.evalRule(R('diag'), N, P, 1, sq(N, 2, 5)), true);
  assert.equal(SAE.evalRule(R('center'), N, P, 1, sq(N, 2, 2)), true);
  assert.equal(SAE.evalRule(R('center'), N, P, 1, sq(N, 1, 2)), false);
  assert.equal(SAE.evalRule(R('rowsOdd'), N, P, 1, sq(N, 0, 5)), true);
  assert.equal(SAE.evalRule(R('colsEven'), N, P, 1, sq(N, 0, 5)), true);
  assert.equal(SAE.evalRule(R('none'), N, P, 1, 0), false);
  assert.equal(SAE.evalRule(R('any'), N, P, 1, 0), true);
});

test('previous-number atoms, and no restriction without a previous number', () => {
  const N = 8, P = [sq(N, 3, 3)];
  assert.equal(SAE.evalRule(R('knightPrev'), N, P, 1, sq(N, 5, 4)), true);
  assert.equal(SAE.evalRule(R('knightPrev'), N, P, 1, sq(N, 4, 4)), false);
  assert.equal(SAE.evalRule(R('adjPrev'), N, P, 1, sq(N, 4, 4)), true);
  assert.equal(SAE.evalRule(R('sidePrev'), N, P, 1, sq(N, 4, 4)), false);
  assert.equal(SAE.evalRule(R('linePrev'), N, P, 1, sq(N, 3, 7)), true);
  assert.equal(SAE.evalRule(R('offPrev'), N, P, 1, sq(N, 3, 7)), false);
  assert.equal(SAE.evalRule(R('diagPrev'), N, P, 1, sq(N, 6, 0)), true);
  assert.equal(SAE.evalRule(R('belowPrev'), N, P, 1, sq(N, 4, 0)), true);
  assert.equal(SAE.evalRule(R('leftPrev'), N, P, 1, sq(N, 0, 2)), true);
  for (const a of ATOMS.filter((x) => x.g === 'prev')) assert.equal(SAE.evalRule(R(a.id), N, [-1], 1, 10), true, a.id);
});

test('all-number atoms count the 0 too', () => {
  const N = 8, P = [sq(N, 0, 0), sq(N, 0, 2)];
  assert.equal(SAE.evalRule(R('touch1'), N, P, 2, sq(N, 1, 0)), true);
  assert.equal(SAE.evalRule(R('touch1'), N, P, 2, sq(N, 1, 1)), false); // touches both
  assert.equal(SAE.evalRule(R('touchAny'), N, P, 2, sq(N, 1, 1)), true);
  assert.equal(SAE.evalRule(R('touchNone'), N, P, 2, sq(N, 5, 5)), true);
  assert.equal(SAE.evalRule(R('rowEmpty'), N, P, 2, sq(N, 0, 6)), false);
  assert.equal(SAE.evalRule(R('colEmpty'), N, P, 2, sq(N, 4, 1)), true);
});

test('combinations and odd/even rules', () => {
  const N = 8, P = [-1];
  const and = R('top', 'and', 'left'), or = R('top', 'or', 'left');
  assert.equal(SAE.evalRule(and, N, P, 1, sq(N, 0, 7)), false);
  assert.equal(SAE.evalRule(or, N, P, 1, sq(N, 0, 7)), true);
  const par = { t: 'par', odd: 'top', even: 'bottom' };
  assert.equal(SAE.evalRule(par, N, P, 1, sq(N, 0, 0)), true);
  assert.equal(SAE.evalRule(par, N, [-1, 5], 2, sq(N, 0, 0)), false);
  assert.ok(SAE.sameRule(R('left', 'or', 'top'), or));
  assert.ok(SAE.needsZero(R('top', 'and', 'adjPrev')));
  assert.ok(!SAE.needsZero(R('top', 'and', 'touchNone')));
});

test('tries: yes writes the number, no marks the square, refused squares cannot be retried', () => {
  const st = round(R('top'));
  assert.equal(SAE.apply(st, { type: 'try', sq: sq(8, 6, 0) }).ok, false);
  assert.equal(st.phase, 'decide');
  assert.equal(SAE.apply(st, { type: 'try', sq: 0 }), null, 'one try per turn');
  SAE.apply(st, { type: 'pass' });
  assert.equal(st.turn, 1);
  assert.equal(SAE.canTry(st, sq(8, 6, 0)), false, 'already refused for this number');
  const ev = SAE.apply(st, { type: 'try', sq: 3 });
  assert.equal(ev.ok, true);
  assert.deepEqual(st.pos, [-1, 3]);
  SAE.apply(st, { type: 'pass' });
  assert.equal(SAE.canTry(st, 3), false, 'occupied');
  assert.equal(SAE.canTry(st, sq(8, 6, 0)), true, 'a new number may be tried there again');
});

test('a correct guess scores floor(highest / 2) for the guesser (and a human rule maker)', () => {
  const st = round(R('top'));
  for (let i = 0; i < 5; i++) {
    SAE.apply(st, { type: 'try', sq: i });
    SAE.apply(st, { type: 'pass' });
  }
  SAE.apply(st, { type: 'try', sq: 8 });
  const ev = SAE.apply(st, { type: 'guess', rule: R('top') });
  assert.equal(ev.type, 'right');
  assert.equal(ev.pts, 3); // highest number is 6
  assert.deepEqual(st.scores, [0, 3]);
  assert.equal(st.phase, 'over');

  const st3 = SAE.create({ N: 8, nPlayers: 3, maker: 'players' }, rng(2));
  assert.equal(st3.phase, 'make');
  assert.equal(st3.maker, 0);
  assert.equal(SAE.apply(st3, { type: 'make', rule: R('none') }), null, 'unplayable rule refused');
  SAE.apply(st3, { type: 'make', rule: R('left') });
  assert.equal(st3.turn, 1);
  for (let i = 0; i < 4; i++) { SAE.apply(st3, { type: 'try', sq: i * 8 }); SAE.apply(st3, { type: 'pass' }); }
  assert.ok([1, 2].includes(st3.turn), 'maker never takes a turn');
  SAE.apply(st3, { type: 'try', sq: 1 });
  const by = st3.turn;
  SAE.apply(st3, { type: 'guess', rule: R('left') });
  assert.equal(st3.scores[by], 2);
  assert.equal(st3.scores[0], 2, 'maker scores too');
  assert.equal(st3.phase, 'roundover');
  SAE.apply(st3, { type: 'next' });
  assert.equal(st3.maker, 1);
});

test('an equivalent rule worded differently is accepted', () => {
  const st = round(R('chessA'));
  SAE.apply(st, { type: 'try', sq: 0 });
  const ev = SAE.apply(st, { type: 'guess', rule: { t: 'par', odd: 'chessA', even: 'chessA' } });
  assert.equal(ev.type, 'right');
  const st2 = round(R('top', 'or', 'bottom'));
  SAE.apply(st2, { type: 'try', sq: 0 });
  assert.equal(SAE.apply(st2, { type: 'guess', rule: R('any') }).type, 'right');
});

test('wrong guesses get a counterexample on which the secret and the guess really disagree', () => {
  const r = rng(7);
  for (let k = 0; k < 40; k++) {
    const st = SAE.create({ N: 8, nPlayers: 2, rounds: 1, tier: ['easy', 'medium', 'hard'][k % 3] }, r);
    for (let i = 0; i < 3 && st.phase === 'try'; i++) {
      const free = [...Array(64).keys()].filter((q) => SAE.canTry(st, q));
      SAE.apply(st, { type: 'try', sq: free[Math.floor(r() * free.length)] }, r);
      if (st.phase === 'decide') SAE.apply(st, { type: 'pass' }, r);
    }
    if (st.phase !== 'try') continue;
    SAE.apply(st, { type: 'try', sq: [...Array(64).keys()].find((q) => SAE.canTry(st, q)) }, r);
    if (st.phase !== 'decide') continue;
    const guess = SAE.sameRule(st.rule, R('edge')) ? R('inner') : R('edge');
    const cx = SAE.judge(st, guess, r);
    if (!cx) continue; // guess happened to be equivalent
    const P = SAE.obsPositions(st.pos, cx);
    assert.ok(!P.slice(0, cx.n).includes(cx.sq), 'counterexample square is empty');
    assert.equal(SAE.evalRule(st.rule, 8, P, cx.n, cx.sq), cx.ok);
    assert.notEqual(SAE.evalRule(guess, 8, P, cx.n, cx.sq), cx.ok);
    // hypothetical numbers obey the secret rule
    const base = cx.n - cx.pre.length;
    cx.pre.forEach((q, i) => assert.equal(SAE.evalRule(st.rule, 8, P, base + i, q), true));
  }
});

test('counterexamples become public facts, so the same wrong guess fails at once', () => {
  const st = round(R('bottom'));
  SAE.apply(st, { type: 'try', sq: sq(8, 7, 7) });
  const ev = SAE.apply(st, { type: 'guess', rule: R('right') });
  assert.equal(ev.type, 'wrong');
  assert.equal(st.obs.at(-1).k, 'cx');
  assert.equal(st.turn, 1);
  SAE.apply(st, { type: 'try', sq: sq(8, 7, 6) });
  const cx = SAE.judge(st, R('right'));
  assert.equal(cx.src, 'past');
});

test('round ends in stalemate at the last number or when stuck', () => {
  const st = round(R('any'), { N: 6 });
  st.maxNum = 3;
  for (let i = 0; i < 3; i++) {
    SAE.apply(st, { type: 'try', sq: i });
    if (st.phase === 'decide') SAE.apply(st, { type: 'pass' });
  }
  assert.equal(st.result.kind, 'max');
  assert.deepEqual(st.scores, [0, 0]);

  const s2 = round(R('rowEmpty', 'and', 'colEmpty'), { N: 6 }); // rooks: only 6 numbers fit
  for (let i = 0; i < 6 && s2.phase !== 'over'; i++) {
    SAE.apply(s2, { type: 'try', sq: i * 7 });
    if (s2.phase === 'decide') SAE.apply(s2, { type: 'pass' });
  }
  assert.equal(s2.result.kind, 'stuck');
});

test('giving up needs every guesser', () => {
  const st = round(R('top'));
  SAE.apply(st, { type: 'giveup', p: 0 });
  assert.equal(st.phase, 'try');
  SAE.apply(st, { type: 'giveup', p: 1 });
  assert.equal(st.result.kind, 'giveup');
});

test('public view hides the secret rule until the round is over', () => {
  const st = SAE.create({ N: 8, nPlayers: 2 }, rng(3));
  assert.equal(SAE.publicView(st).rule, null);
  assert.ok(st.rule);
  SAE.apply(st, { type: 'giveup', p: 0 }); SAE.apply(st, { type: 'giveup', p: 1 });
  assert.ok(SAE.publicView(st).rule);
});

test('generated secret rules are playable', () => {
  const r = rng(11);
  for (const tier of ['easy', 'medium', 'hard']) for (const N of [6, 8, 10]) {
    const rule = SAE.randomRule(N, SAE.SIZES[N], tier, r);
    assert.ok(SAE.validRule(rule));
    assert.ok(SAE.playability(rule, N, SAE.SIZES[N], r, 20).full >= 0.6, `${tier} ${N} ${JSON.stringify(rule)}`);
  }
});

test('the computer guesser never makes an illegal move and AI-vs-AI games terminate', () => {
  const r = rng(5);
  for (const tier of ['easy', 'medium', 'hard']) for (const lv of [['easy', 'normal'], ['hard', 'normal']]) {
    const st = SAE.create({ N: 8, nPlayers: 2, rounds: 2, tier }, r);
    let steps = 0;
    while (st.phase !== 'over' && steps < 2000) {
      if (st.phase === 'roundover') { SAE.apply(st, { type: 'next' }, r); continue; }
      const a = SAE.aiAction(SAE.publicView(st), lv[st.turn], r);
      if (a.type === 'giveup') { SAE.apply(st, { type: 'giveup', p: 0 }, r); SAE.apply(st, { type: 'giveup', p: 1 }, r); continue; }
      assert.ok(SAE.apply(st, a, r), `illegal ${JSON.stringify(a)} in phase ${st.phase}`);
      steps++;
    }
    assert.equal(st.phase, 'over');
  }
});

test('the strong guesser cracks simple rules well before the stalemate', () => {
  const r = rng(9);
  let solved = 0;
  for (let k = 0; k < 8; k++) {
    const st = SAE.create({ N: 8, nPlayers: 1, rounds: 1, tier: 'easy' }, r);
    while (st.phase !== 'over') SAE.apply(st, SAE.aiAction(SAE.publicView(st), 'hard', r), r);
    if (st.result.kind === 'guessed' && st.pos.length - 1 <= 12) solved++;
  }
  assert.ok(solved >= 6, `solved ${solved}/8`);
});

test('out-of-phase and out-of-turn actions are refused', () => {
  const st = round(R('top'));
  assert.equal(SAE.apply(st, { type: 'guess', rule: R('top') }), null, 'guess only after a try');
  assert.equal(SAE.apply(st, { type: 'pass' }), null, 'pass only after a try');
  assert.equal(SAE.apply(st, { type: 'next' }), null);
  assert.equal(SAE.apply(st, { type: 'try', sq: 64 }), null);
  assert.equal(SAE.apply(st, { type: 'try', sq: -1 }), null);
  SAE.apply(st, { type: 'try', sq: 0 });
  assert.equal(SAE.apply(st, { type: 'guess', rule: { t: 'all', a: 'bogus' } }), null, 'invalid rule');
  const s3 = SAE.create({ N: 8, nPlayers: 3, maker: 'players' }, rng(4));
  SAE.apply(s3, { type: 'make', rule: R('adjPrev') });
  assert.ok(s3.zero && s3.pos[0] >= 0, 'a rule about the previous number starts with a 0');
  assert.equal(SAE.apply(s3, { type: 'giveup', p: s3.maker }), null, 'the rule maker cannot vote');
  assert.equal(SAE.apply(s3, { type: 'make', rule: R('top') }), null, 'the rule is made once');
});

test('the 0 is placed where the first number has a square', () => {
  const r = rng(13);
  for (let i = 0; i < 40; i++) {
    const st = round(R('knightPrev', 'and', 'top'));
    SAE.startRound(Object.assign(st, { round: -1, makerMode: 'players' }), r);
    SAE.apply(st, { type: 'make', rule: R('knightPrev', 'and', 'top') }, r);
    assert.ok(SAE.allowedSquares(st.rule, 8, st.pos).length > 0);
  }
});

test('a correct guess while only the 1 is on the board scores nothing, so normal/hard computers wait', () => {
  const st = round(R('top'));
  SAE.apply(st, { type: 'try', sq: 0 });
  assert.equal(SAE.roundPoints(st), 0);
  for (const lv of ['normal', 'hard']) for (let k = 0; k < 5; k++) assert.equal(SAE.aiAction(SAE.publicView(st), lv, rng(k)).type, 'pass');
});

test('the normal computer clearly beats a random player', () => {
  const r = rng(21);
  let ai = 0, other = 0;
  for (let g = 0; g < 12; g++) {
    const st = SAE.create({ N: 8, nPlayers: 2, rounds: 1, tier: g % 2 ? 'medium' : 'easy' }, r);
    const seat = g % 2;
    while (st.phase !== 'over') {
      let a;
      if (st.turn === seat) a = SAE.aiAction(SAE.publicView(st), 'normal', r);
      else if (st.phase === 'try') { const c = [...Array(64).keys()].filter((q) => SAE.canTry(st, q)); a = { type: 'try', sq: c[Math.floor(r() * c.length)] }; }
      else a = r() < 0.1 ? { type: 'guess', rule: R(ATOMS[2 + Math.floor(r() * (ATOMS.length - 2))].id) } : { type: 'pass' };
      if (a.type === 'giveup') { SAE.apply(st, { type: 'giveup', p: 0 }, r); SAE.apply(st, { type: 'giveup', p: 1 }, r); continue; }
      assert.ok(SAE.apply(st, a, r));
    }
    if (st.scores[seat] > st.scores[1 - seat]) ai++; else if (st.scores[seat] < st.scores[1 - seat]) other++;
  }
  assert.ok(ai >= 10 && other <= 1, `ai ${ai} : random ${other}`);
});
