import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PW } from './engine.js';

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

const Z = (s) => s.denoms.map(() => 0);

test('classic purse: 4×1, 3×5, 2×10, 1×25 = 64¢ for everyone', () => {
  const s = PW.create({ n: 3 });
  assert.deepEqual(s.denoms, [1, 5, 10, 25]);
  for (let p = 0; p < 3; p++) { assert.equal(PW.cents(s, p), 64); assert.equal(PW.coins(s, p), 10); }
  assert.equal(PW.value(s, s.pot), 0);
});

test('first move takes no change; change must be worth strictly less', () => {
  const s = PW.create();
  assert.deepEqual(PW.moves(s).map((m) => m.take), [Z(s), Z(s), Z(s), Z(s)]);
  PW.apply(s, { give: 1, take: Z(s) });             // blue: 5¢
  PW.apply(s, { give: 1, take: Z(s) });             // red: 5¢
  PW.apply(s, { give: 0, take: Z(s) });             // blue: 1¢   (table: 1, 5, 5)
  // red puts in a dime: may take 5 + 1 = 6¢ but not 5 + 5 = 10¢
  assert.ok(PW.legal(s, { give: 2, take: [1, 1, 0, 0] }));
  assert.ok(!PW.legal(s, { give: 2, take: [0, 2, 0, 0] }));
  assert.ok(!PW.legal(s, { give: 2, take: [0, 0, 1, 0] }), 'cannot take the same coin back');
  assert.ok(!PW.legal(s, { give: 0, take: [1, 0, 0, 0] }), 'a penny buys no change');
  assert.deepEqual(PW.bestTake(s, 2), [1, 1, 0, 0]);
  assert.deepEqual(PW.bestTake(s, 3), [1, 2, 0, 0]);
  assert.throws(() => PW.apply(s, { give: 2, take: [0, 2, 0, 0] }));
});

test('perfect and more-than-perfect change rules', () => {
  const s = PW.create({ rule: 'perfect' });
  s.pot = [5, 3, 1, 0];
  assert.ok(PW.legal(s, { give: 2, take: [0, 2, 0, 0] }), 'two nickels for a dime');
  assert.ok(!PW.legal(s, { give: 2, take: [0, 0, 1, 0] }), 'never the same denomination');
  assert.ok(!PW.legal(s, { give: 2, take: [1, 2, 0, 0] }));
  const m = PW.create({ rule: 'more' });
  m.pot = [5, 3, 1, 0];
  assert.ok(PW.legal(m, { give: 2, take: [5, 3, 0, 0] }), 'all smaller coins, 20¢ for a dime');
  assert.deepEqual(PW.maximalTakes(m, 2), [[5, 3, 0, 0]]);
  assert.deepEqual(PW.maximalTakes(m, 0), [[0, 0, 0, 0]]);
});

test('canAdd respects the limit and the table', () => {
  const s = PW.create();
  s.pot = [2, 1, 0, 0];
  assert.ok(PW.canAdd(s, 2, [0, 0, 0, 0], 1));
  assert.ok(!PW.canAdd(s, 2, [0, 1, 0, 0], 1), 'only one nickel on the table');
  assert.ok(PW.canAdd(s, 2, [1, 1, 0, 0], 0));
  assert.ok(!PW.canAdd(s, 1, [0, 0, 0, 0], 1));
});

test('running out of coins knocks a player out; last one standing wins', () => {
  const s = PW.create({ coins: 'taylor', n: 3 });
  s.hands = [[1, 0, 0], [0, 1, 0], [1, 0, 0]];
  PW.apply(s, { give: 0, take: [0, 0, 0] });
  assert.equal(s.alive[0], false);
  assert.equal(s.turn, 1);
  assert.ok(!PW.isOver(s));
  PW.apply(s, { give: 1, take: [1, 0, 0] });        // 5¢ for the penny: still alive
  assert.equal(s.turn, 2);
  PW.apply(s, { give: 0, take: [0, 0, 0] });
  assert.ok(PW.isOver(s));
  assert.equal(PW.winner(s), 1);
  assert.deepEqual(s.out, [0, 2]);
});

test('maximal takes: nothing can be added to any of them', () => {
  const s = PW.create({ n: 4 });
  s.pot = [7, 4, 3, 1];
  for (let g = 0; g < 4; g++) for (const tk of PW.maximalTakes(s, g)) {
    assert.ok(PW.legalTake(s, g, tk));
    for (let j = 0; j < 4; j++) assert.ok(!PW.canAdd(s, g, tk, j));
  }
});

test('solver: with perfect play the second player wins the classic two-player game', () => {
  assert.equal(PW.solve(PW.create()), false);
  assert.equal(PW.solve(PW.create({ coins: 'taylor' })), false);
});

test('AI never makes illegal moves and every game ends', () => {
  const levels = ['easy', 'normal', 'hard'];
  for (const coins of ['classic', 'sugar', 'darlene']) for (const rule of PW.RULES) for (const n of [2, 3, 5]) {
    const s = PW.create({ coins, rule, n });
    let guard = 0;
    while (!PW.isOver(s)) {
      const m = PW.aiMove(s, levels[(s.turn + guard) % 3]);
      assert.ok(PW.legal(s, m), `${coins}/${rule}/${n}: ${JSON.stringify(m)}`);
      PW.apply(s, m);
      assert.ok(++guard < 1000);
    }
    const total = PW.create({ coins, n });
    assert.equal(s.hands.flat().reduce((a, b) => a + b, 0) + s.pot.reduce((a, b) => a + b, 0), total.hands.flat().reduce((a, b) => a + b, 0), 'coins are conserved');
  }
});

test('hard beats normal, normal beats easy', () => {
  const duel = (a, b, games = 20) => {
    let w = 0;
    for (let g = 0; g < games; g++) {
      const s = PW.create({ first: g % 2 });
      while (!PW.isOver(s)) PW.apply(s, PW.aiMove(s, s.turn === 0 ? a : b));
      if (PW.winner(s) === 0) w++;
    }
    return w;
  };
  assert.ok(duel('hard', 'normal') >= 16);
  assert.ok(duel('normal', 'easy') >= 14);
});

test('malformed or out-of-turn moves are rejected; partial change is allowed', () => {
  const s = PW.create();
  s.pot = [3, 2, 0, 0];
  for (const m of [null, {}, { give: 4, take: Z(s) }, { give: -1, take: Z(s) }, { give: 1.5, take: Z(s) },
    { give: 2, take: [1, 0, 0] }, { give: 2, take: [-1, 0, 0, 0] }, { give: 2, take: [0.5, 0, 0, 0] }, { give: 2, take: [4, 0, 0, 0] }])
    assert.ok(!PW.legal(s, m), JSON.stringify(m));
  assert.ok(PW.legal(s, { give: 2, take: [1, 0, 0, 0] }), 'less change than allowed is fine');
  assert.ok(PW.legal(s, { give: 2, take: Z(s) }), 'no change at all is fine');
  s.hands[0][2] = 0;
  assert.ok(!PW.legal(s, { give: 2, take: Z(s) }), 'cannot give a coin you do not have');
  s.alive = [true, false]; // game over
  assert.ok(!PW.legal(s, { give: 0, take: Z(s) }));
});

test('more-than-perfect never hands out a coin of the same or a bigger denomination', () => {
  const s = PW.create({ rule: 'more' });
  s.pot = [4, 3, 2, 1];
  assert.ok(!PW.legal(s, { give: 1, take: [0, 1, 0, 0] }));
  assert.ok(!PW.legal(s, { give: 2, take: [0, 0, 0, 1] }));
  assert.deepEqual(PW.bestTake(s, 3), [4, 3, 2, 0]);
});

test('turn order skips players who went broke, with six players', () => {
  const s = PW.create({ coins: 'taylor', n: 6 });
  s.hands = s.hands.map(() => [1, 0, 0]);
  s.hands[3] = [2, 0, 0];
  for (const p of [0, 1, 2]) { assert.equal(s.turn, p); PW.apply(s, { give: 0, take: [0, 0, 0] }); }
  assert.equal(s.turn, 3);
  PW.apply(s, { give: 0, take: [0, 0, 0] });        // 3 still has a penny
  PW.apply(s, { give: 0, take: [0, 0, 0] });        // 4 out
  PW.apply(s, { give: 0, take: [0, 0, 0] });        // 5 out
  assert.ok(PW.isOver(s));
  assert.equal(PW.winner(s), 3);
  assert.deepEqual(s.out, [0, 1, 2, 4, 5]);
});

test('solver cache tells apart purses that share denominations (Sugar vs Djibouti)', () => {
  // Same denominations [1, 2, 5, 10], different counts, so the same hands mean a different table.
  const at = (coins) => {
    const s = PW.create({ coins });
    s.hands = [[0, 0, 2, 0], [0, 0, 0, 1]];          // blue: two 5s, red: a dime, the rest is on the table
    s.pot = s.pot.map((_, i) => 2 * PW.create({ coins }).hands[0][i] - s.hands[0][i] - s.hands[1][i]);
    return s;
  };
  assert.deepEqual(at('sugar').denoms, at('djibouti').denoms);
  assert.equal(PW.solve(at('sugar')), true);
  assert.equal(PW.solve(at('djibouti')), false, 'must not reuse the Sugar verdict');
});

test('the solver agrees with a brute force over every possible change (small purses)', () => {
  const all = (s, give) => {
    const out = [], tk = Z(s);
    const rec = (j) => {
      if (j === tk.length) { if (PW.legalTake(s, give, tk)) out.push(tk.slice()); return; }
      for (let c = 0; c <= (j < give ? s.pot[j] : 0); c++) { tk[j] = c; rec(j + 1); }
      tk[j] = 0;
    };
    rec(0);
    return out;
  };
  for (const coins of ['taylor', 'sugar']) for (const rule of PW.RULES) {
    const memo = new Map();
    const wins = (s) => {
      const key = s.hands.join('|') + '/' + s.turn;
      if (memo.has(key)) return memo.get(key);
      let r = false;
      out: for (let g = 0; g < s.denoms.length; g++) if (s.hands[s.turn][g]) for (const take of all(s, g)) {
        const c = PW.clone(s);
        PW.apply(c, { give: g, take });
        if (PW.isOver(c) ? PW.winner(c) === s.turn : !wins(c)) { r = true; break out; }
      }
      memo.set(key, r);
      return r;
    };
    const s = PW.create({ coins, rule });
    assert.equal(PW.solve(s), wins(s), `${coins}/${rule}`);
    let n = 0;
    for (const [key, v] of memo) {
      if (n++ % 7) continue;
      const [hs, turn] = key.split('/');
      const p = PW.create({ coins, rule });
      p.hands = hs.split('|').map((h) => h.split(',').map(Number));
      p.pot = s.hands[0].map((x, i) => 2 * x - p.hands[0][i] - p.hands[1][i]);
      p.turn = +turn;
      assert.equal(PW.solve(p), v, `${coins}/${rule} ${key}`);
    }
  }
});

test('the computer beats random play clearly', () => {
  const rand = (s) => { const ms = PW.moves(s); return ms[Math.floor(Math.random() * ms.length)]; };
  const share = (level, n, games) => {
    let w = 0;
    for (let g = 0; g < games; g++) {
      const s = PW.create({ n, first: g % n });
      while (!PW.isOver(s)) PW.apply(s, s.turn === 0 ? PW.aiMove(s, level) : rand(s));
      if (PW.winner(s) === 0) w++;
    }
    return w / games;
  };
  assert.ok(share('normal', 2, 40) >= 0.8);
  assert.ok(share('hard', 2, 20) >= 0.9);
  assert.ok(share('normal', 4, 40) >= 0.6, 'way above the fair 25% with four players');
  assert.ok(share('hard', 4, 40) >= 0.6);
});

test('hard is at least as strong as normal at a three-player table', () => {
  let w = 0;
  for (let g = 0; g < 30; g++) {
    const s = PW.create({ n: 3, first: g % 3 });
    while (!PW.isOver(s)) PW.apply(s, PW.aiMove(s, s.turn === 0 ? 'hard' : 'normal'));
    if (PW.winner(s) === 0) w++;
  }
  assert.ok(w >= 10, `hard won ${w}/30, fair share is 10`);
});
