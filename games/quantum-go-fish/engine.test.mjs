import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QGF } from './engine.js';

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

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ask = (to, suit) => ({ t: 'ask', to, suit });
const yes = { t: 'answer', yes: true }, no = { t: 'answer', yes: false };
function play(st, ...ms) { for (const m of ms) { assert.ok(QGF.isLegal(st, m), 'illegal ' + JSON.stringify(m)); QGF.apply(st, m); } return st; }

// cards are conserved and every suit still fits exactly 4 cards
function invariants(st) {
  assert.equal(st.hand.reduce((a, b) => a + b, 0), 4 * st.n);
  for (let s = 0; s < st.n; s++) assert.ok(st.known.reduce((a, r) => a + r[s], 0) <= 4);
  assert.ok(QGF.feasible(st), 'state became paradoxical');
}

test('new game: nothing known, only a new suit can be asked', () => {
  const st = QGF.create(4);
  assert.equal(st.phase, 'ask');
  const ms = QGF.askMoves(st);
  assert.equal(ms.length, 3);
  assert.ok(ms.every((m) => m.suit === 0));
  assert.ok(!QGF.isLegal(st, ask(1, 1)), 'cannot skip to an unnamed suit');
  assert.ok(!QGF.isLegal(st, ask(0, 0)), 'cannot ask yourself');
});

test('the book’s sample round: forced yes, and a win by knowing every hand', () => {
  // Xia 0, Yael 1, Zoe 2; suits N 0, S 1, Q 2
  const st = QGF.create(3, { first: 0 });
  play(st, ask(1, 0), no);           // Yael: no Narwhals
  play(st, ask(2, 1), yes);          // Zoe hands a Scruple to Yael
  assert.deepEqual(st.hand, [4, 5, 3]);
  play(st, ask(1, 2));               // Zoe asks Yael for Qualms
  assert.deepEqual(QGF.answers(st), { yes: true, no: false }, '“no” would give Yael five Scruples');
  play(st, yes);
  play(st, ask(2, 0));               // Xia asks Zoe for Narwhals
  const alt = QGF.clone(st);
  QGF.apply(alt, no);
  assert.equal(alt.winner, 0, '“no” would hand Xia all four Narwhals');
  assert.equal(alt.winBy, 'four');
  play(st, yes);
  play(st, ask(0, 2), yes);          // Yael takes the last Qualm from Xia
  assert.equal(st.phase, 'ask');
  assert.equal(QGF.minOf(st, 1, 1), 3, 'Yael’s last unknown card must be a Scruple');
  play(st, ask(0, 1));               // Zoe asks Xia for Scruples
  assert.deepEqual(QGF.answers(st), { yes: false, no: true });
  play(st, no);
  assert.equal(st.phase, 'over');
  assert.equal(st.winner, 2);
  assert.equal(st.winBy, 'all');
  invariants(st);
});

test('a pinned card must be handed over when asked', () => {
  const st = QGF.create(3);
  play(st, ask(1, 0), no);           // P0 has a pinned 0
  play(st, ask(2, 1), no);
  play(st, ask(0, 0));               // P2 asks P0 for suit 0
  assert.deepEqual(QGF.answers(st), { yes: true, no: false });
});

test('cannot ask for a suit you provably lack', () => {
  const st = QGF.create(3);
  play(st, ask(1, 0), no);           // P1 holds no suit 0
  assert.equal(st.turn, 1);
  assert.ok(!QGF.isLegal(st, ask(0, 0)));
  assert.ok(!QGF.isLegal(st, ask(2, 0)));
  assert.ok(QGF.isLegal(st, ask(2, 1)), 'a brand-new suit is fine');
  assert.ok(!QGF.isLegal(st, ask(2, 2)), 'new suits are named in order');
});

test('saying no is not allowed when it creates a paradox', () => {
  const st = QGF.create(3);
  play(st, ask(1, 0), no, ask(2, 1), yes, ask(1, 2));
  assert.ok(!QGF.isLegal(st, no));
  assert.ok(QGF.isLegal(st, yes));
});

test('four of a kind is found by deduction, not only by pinned cards', () => {
  const st = QGF.create(3);
  st.known[0][0] = 1; st.named = 1;
  st.excl[1][0] = true; st.excl[2][0] = true;
  assert.ok(QGF.feasible(st));
  assert.equal(QGF.fourOf(st, 0), 0);
  assert.equal(QGF.minOf(st, 0, 0), 4);
  assert.equal(QGF.fourOf(st, 1), -1);
  assert.ok(!QGF.determined(st));
});

test('a paradoxical set of facts is reported as infeasible', () => {
  const st = QGF.create(3);
  st.known[1][1] = 5; st.hand[1] = 5; st.hand[0] = 3;
  assert.ok(!QGF.feasible(st));
});

test('determined: one player holding everything is fully known', () => {
  const st = QGF.create(3);
  st.hand = [12, 0, 0];
  assert.ok(QGF.determined(st));
  assert.ok(!QGF.determined(QGF.create(3)));
});

test('players with no cards are skipped and cannot be asked', () => {
  const st = QGF.create(3);
  st.hand = [6, 0, 6]; // contrived but consistent
  assert.ok(QGF.feasible(st));
  assert.ok(QGF.askMoves(st).every((m) => m.to === 2));
  play(st, ask(2, 0), yes);
  assert.equal(st.phase, 'ask');
  assert.equal(st.turn, 2);
});

function selfPlay(n, levels, seed, check = true) {
  const rnd = rng(seed);
  const st = QGF.create(n, { rnd, first: seed % n });
  let guard = 0;
  while (!QGF.isOver(st)) {
    const lvl = levels[QGF.actor(st) % levels.length];
    const m = QGF.aiMove(st, lvl, rnd);
    if (check) assert.ok(QGF.isLegal(st, m), `AI ${lvl} made an illegal move ${JSON.stringify(m)}`);
    QGF.apply(st, m);
    if (check) invariants(st);
    assert.ok(++guard < 20000, 'game does not end');
  }
  return st;
}

test('AI never makes illegal moves and games end (easy/normal, 3–8 players)', () => {
  let wins = 0, draws = 0;
  for (let n = 3; n <= 8; n++) {
    for (let g = 0; g < 4; g++) {
      const st = selfPlay(n, ['easy', 'normal'], n * 100 + g);
      if (st.draw) draws++; else { wins++; assert.ok(st.winner >= 0 && st.winner < n); }
    }
  }
  assert.ok(wins > 0, `some games should be won (wins ${wins}, draws ${draws})`);
});

test('games with 6 and 8 normal players stay legal', () => {
  for (const n of [3, 5]) {
    const t0 = Date.now();
    const st = selfPlay(n + 3, ['normal'], 7 + n);
    assert.ok(QGF.isOver(st));
    assert.ok(Date.now() - t0 < 60000);
  }
});

test('normal AI grabs a forced win and never answers into an immediate loss when it can avoid it', () => {
  // replay the book round up to Xia's question to Zoe
  const st = QGF.create(3, { first: 0 });
  play(st, ask(1, 0), no, ask(2, 1), yes, ask(1, 2), yes, ask(2, 0));
  const m = QGF.aiMove(st, 'normal', rng(1));
  assert.deepEqual(m, yes, 'Zoe must not say “no” — that hands Xia four Narwhals');
});

test('normal AI beats easy AI more often than not (4 players, 1 normal vs 3 easy)', () => {
  let normalWins = 0, games = 0;
  for (let g = 0; g < 24; g++) {
    const st = selfPlay(4, ['normal', 'easy', 'easy', 'easy'], 500 + g, false);
    if (!st.draw) { games++; if (st.winner === 0) normalWins++; }
  }
  assert.ok(normalWins / Math.max(1, games) > 0.25, `normal won ${normalWins}/${games}`);
});

test('rounds without any new fact end in a draw', () => {
  const st = QGF.create(3);
  st.known[0][0] = 1; st.known[1][0] = 1; st.named = 1;
  st.idle = QGF.idleLimit(st) - 1;
  play(st, ask(1, 0));
  assert.deepEqual(QGF.answers(st), { yes: true, no: false });
  const before = QGF.info(st);
  play(st, yes);
  assert.equal(QGF.info(st), before);
  assert.ok(st.draw);
  assert.equal(st.phase, 'over');
});

test('isLegal rejects junk', () => {
  const st = QGF.create(4);
  for (const m of [null, {}, { t: 'answer', yes: true }, ask(9, 0), ask(1, -1), ask(1, 'x')]) assert.ok(!QGF.isLegal(st, m));
});

// Every completion of the facts, by brute force (small tables only): count matrices [player][suit].
function completions(st) {
  const n = st.n, u = [], r = new Array(n).fill(4), out = [], M = [];
  for (let p = 0; p < n; p++) { u.push(QGF.unknown(st, p)); for (let s = 0; s < n; s++) r[s] -= st.known[p][s]; }
  (function rows(p, rem) {
    if (p === n) { if (rem.every((x) => x === 0)) out.push(M.map((row, q) => row.map((c, s) => c + st.known[q][s]))); return; }
    const row = new Array(n).fill(0);
    (function col(s, left) {
      if (s === n) { if (left === 0) { M[p] = row.slice(); rows(p + 1, rem.map((x, i) => x - row[i])); } return; }
      for (let c = 0; c <= (st.excl[p][s] ? 0 : Math.min(left, rem[s])); c++) { row[s] = c; col(s + 1, left - c); }
      row[s] = 0;
    })(0, u[p]);
  })(0, r);
  return out;
}

test('deductions, forced answers and allowed questions match brute force (random 3–4 player games)', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const rnd = rng(seed), n = 3 + (seed % 2), st = QGF.create(n, { rnd, first: seed % n });
    while (!QGF.isOver(st)) {
      const S = completions(st);
      assert.ok(S.length > 0);
      assert.equal(QGF.determined(st), S.length === 1);
      for (let p = 0; p < n; p++) {
        for (let s = 0; s < n; s++) assert.equal(QGF.minOf(st, p, s), Math.min(...S.map((x) => x[p][s])));
        const f = QGF.fourOf(st, p);
        if (f >= 0) assert.ok(S.every((x) => x[p][f] >= 4));
        else assert.ok([...Array(n).keys()].every((s) => S.some((x) => x[p][s] < 4)));
      }
      if (st.phase === 'answer') {
        const { to: q, suit: s } = st.ask;
        assert.deepEqual(QGF.answers(st), { yes: S.some((x) => x[q][s] > 0), no: st.known[q][s] === 0 && S.some((x) => x[q][s] === 0) });
      } else {
        const p = st.turn;
        for (let s = 0; s < n; s++) {
          const ok = s <= st.named && (st.known[p][s] > 0 || (!st.excl[p][s] && S.some((x) => x[p][s] > st.known[p][s])));
          assert.equal(QGF.canHold(st, p, s), ok);
        }
      }
      const ms = QGF.legalMoves(st);
      assert.ok(ms.length > 0, 'a live game always has a legal move');
      QGF.apply(st, ms[Math.floor(rnd() * ms.length)]);
    }
  }
});

test('the winner is always the player whose turn just ended', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rnd = rng(seed), st = QGF.create(3 + (seed % 4), { rnd });
    let asker = -1;
    while (!QGF.isOver(st)) {
      if (st.phase === 'ask') asker = st.turn;
      const ms = QGF.legalMoves(st);
      QGF.apply(st, ms[Math.floor(rnd() * ms.length)]);
    }
    if (!st.draw) assert.equal(st.winner, asker);
  }
});

test('normal AI clearly beats purely random players', () => {
  let wins = 0;
  const G = 60, n = 4;
  for (let g = 0; g < G; g++) {
    const rnd = rng(900 + g), me = g % n, st = QGF.create(n, { rnd, first: g % n });
    while (!QGF.isOver(st)) {
      const ms = QGF.legalMoves(st);
      QGF.apply(st, QGF.actor(st) === me ? QGF.aiMove(st, 'normal', rnd) : ms[Math.floor(rnd() * ms.length)]);
    }
    if (!st.draw && st.winner === me) wins++;
  }
  assert.ok(wins / G > 0.45, `normal won ${wins}/${G} against three random players (chance is 25%)`);
});
