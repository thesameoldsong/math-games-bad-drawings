import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CON } from './engine.js';

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

const R = 0, P = 1, S = 2;
const all = (t) => Array(10).fill(t);

function ready(players = 2, types = [], opts = {}) {
  const s = CON.create({ players, rounds: 8, ...opts });
  for (let p = 0; p < players; p++) assert.ok(CON.setTypes(s, p, types[p] || all(R)));
  return s;
}

test('duel: rock beats scissors beats paper beats rock; same type → higher number', () => {
  assert.equal(CON.duel(R, 1, S, 10), 1);
  assert.equal(CON.duel(S, 1, P, 10), 1);
  assert.equal(CON.duel(P, 1, R, 10), 1);
  assert.equal(CON.duel(S, 10, R, 1), -1);
  assert.equal(CON.duel(R, 7, R, 3), 1);
  assert.equal(CON.duel(P, 2, P, 9), -1);
  assert.equal(CON.duel(S, 5, S, 5), 0);
});

test('setup: invalid types rejected, game starts when everyone is ready', () => {
  const s = CON.create({ players: 2 });
  assert.equal(CON.setTypes(s, 0, [0, 1, 2]), false);
  assert.equal(CON.setTypes(s, 0, all(3)), false);
  assert.ok(CON.setTypes(s, 0, all(R)));
  assert.equal(CON.setTypes(s, 0, all(P)), false, 'only once');
  assert.equal(s.phase, 'setup');
  assert.ok(CON.setTypes(s, 1, all(S)));
  assert.equal(s.phase, 'turn');
});

test('winner of a fight keeps both cards; tie leaves them', () => {
  const s = ready(2, [all(R), all(S)]);
  assert.ok(CON.challenge(s, 0, 1, 2)); // blue rock 3
  assert.equal(s.phase, 'fight');
  assert.equal(CON.respond(s, 0, 12), false, 'only the defender answers');
  assert.ok(CON.respond(s, 1, 19)); // red scissors 10
  assert.equal(s.last.w, 0);
  assert.equal(s.hand[0].length, 11);
  assert.ok(s.hand[0].includes(19));
  assert.equal(CON.score(s, 0), 10);
  assert.equal(CON.score(s, 1), 0);
  assert.ok(s.shown[2] && s.shown[19]);
  // red's turn now; same type + number → nothing changes
  const t = ready(2, [all(R), all(R)]);
  CON.challenge(t, 0, 1, 4); CON.respond(t, 1, 14);
  assert.equal(t.last.w, -1);
  assert.equal(t.hand[0].length, 10);
  assert.equal(t.turn, 1);
});

test('scores count only the highest card from each opponent, own cards are worthless', () => {
  const s = ready(3);
  s.hand[0] = [0, 1, 12, 15, 27, 29];
  assert.equal(CON.score(s, 0), 6 + 10);
  assert.deepEqual([...CON.counting(s, 0)].sort(), [15, 29]);
});

test('swap: one offer per turn, both cards move, receivers learn the types', () => {
  const s = ready(2, [all(P), all(S)]);
  assert.equal(CON.offer(s, 0, 1, 3, 3), false);
  assert.ok(CON.offer(s, 0, 1, 3, 15));
  assert.equal(s.phase, 'trade');
  assert.ok(CON.answer(s, 1, true));
  assert.ok(s.hand[0].includes(15) && s.hand[1].includes(3));
  assert.ok(s.known[3] & 2 && s.known[15] & 1);
  assert.equal(s.turn, 0, 'swap does not end the turn');
  assert.equal(CON.offer(s, 0, 1, 4, 16), false, 'only one offer per turn');
  assert.ok(CON.pass(s, 0));
  assert.equal(s.turn, 1);
  assert.ok(CON.offer(s, 1, 0, 16, 4));
  assert.ok(CON.answer(s, 0, false));
  assert.ok(s.hand[1].includes(16));
});

test('view hides unseen types and the challenger’s card', () => {
  const s = ready(2, [all(P), all(S)]);
  const v = CON.view(s, 1);
  assert.equal(v.type[0], null);
  assert.equal(v.type[10], S);
  CON.challenge(s, 0, 1, 5);
  assert.equal(CON.view(s, 1).pend.ca, null);
  assert.equal(CON.view(s, 0).pend.ca, 5);
  CON.respond(s, 1, 10);
  assert.equal(CON.view(s, -1).type[5], P);
  assert.equal(CON.view(s, -1).type[6], null);
});

test('rematch refusal: only with 3+ players, until both fought someone else', () => {
  const two = ready(2);
  CON.challenge(two, 0, 1, 0); CON.respond(two, 1, 10);
  CON.challenge(two, 1, 0, 11);
  assert.equal(CON.canDecline(two, 0, 1), false);

  const s = ready(3);
  const fight = (a, b) => { assert.ok(CON.challenge(s, a, b, s.hand[a][0])); assert.ok(CON.respond(s, b, s.hand[b][0])); };
  CON.challenge(s, 0, 1, 0);
  assert.equal(CON.canDecline(s, 1, 0), false, 'first fight must be accepted');
  CON.respond(s, 1, 10);                        // 0 vs 1, turn → 1
  CON.challenge(s, 1, 0, s.hand[1][0]);
  assert.ok(CON.canDecline(s, 0, 1));
  assert.ok(CON.decline(s, 0));
  assert.equal(s.phase, 'turn');
  assert.equal(CON.canChallenge(s, 1, 0), false, 'refused this turn');
  fight(1, 2);                                  // turn → 2
  CON.challenge(s, 2, 1, s.hand[2][0]);
  assert.ok(CON.canDecline(s, 1, 2), 'they just fought');
  CON.respond(s, 1, s.hand[1][0]);              // turn → 0
  assert.ok(CON.canDecline(s, 1, 0), '0 has not fought anyone else yet');
  fight(0, 2);                                  // turn → 1; now both 0 and 1 fought player 2
  assert.equal(s.turn, 1);
  CON.challenge(s, 1, 0, s.hand[1][0]);
  assert.equal(CON.canDecline(s, 0, 1), false);
  assert.equal(CON.decline(s, 0), false);
});

test('game ends after the agreed rounds', () => {
  const s = ready(2, [], { rounds: 2 });
  for (let i = 0; i < 4; i++) assert.ok(CON.pass(s, s.turn));
  assert.equal(s.phase, 'over');
  assert.equal(CON.pass(s, s.turn), false);
});

test('game ends early when only one player still has cards', () => {
  const s = ready(2, [all(R), all(S)], { rounds: 50 });
  for (let i = 0; i < 10 && s.phase !== 'over'; i++) {
    if (s.turn === 0) { CON.challenge(s, 0, 1, s.hand[0][0]); CON.respond(s, 1, s.hand[1][0]); }
    else { CON.challenge(s, 1, 0, s.hand[1][0]); CON.respond(s, 0, s.hand[0][0]); }
  }
  assert.equal(s.phase, 'over');
  assert.equal(s.hand[1].length, 0);
  assert.deepEqual(CON.winners(s), [0]);
});

function playAI(players, levels, rounds = 8) {
  const s = CON.create({ players, rounds });
  for (let p = 0; p < players; p++) assert.ok(CON.setTypes(s, p, CON.aiTypes(levels[p])));
  let guard = 0;
  while (s.phase !== 'over') {
    assert.ok(++guard < 1000, 'game must terminate');
    const [p] = CON.actors(s);
    const v = CON.view(s, p), lv = levels[p];
    if (s.phase === 'turn') {
      const a = CON.aiAct(v, p, lv);
      const ok = a.kind === 'pass' ? CON.pass(s, p) : a.kind === 'offer' ? CON.offer(s, p, a.b, a.give, a.want) : CON.challenge(s, p, a.b, a.card);
      assert.ok(ok, 'illegal AI action ' + JSON.stringify(a));
    } else if (s.phase === 'fight') {
      const a = CON.aiRespond(v, p, lv);
      assert.ok(a.kind === 'decline' ? CON.decline(s, p) : CON.respond(s, p, a.card), 'illegal AI response');
    } else if (s.phase === 'trade') {
      assert.ok(CON.answer(s, p, CON.aiAnswer(v, p, lv)));
    }
  }
  // every card still exists exactly once
  const ids = s.hand.flat().sort((a, b) => a - b);
  assert.deepEqual(ids, Array.from({ length: players * 10 }, (_, i) => i));
  return s;
}

test('AI never makes illegal moves and games terminate (2-4 players, all levels)', () => {
  for (const n of [2, 3, 4]) for (const lv of ['easy', 'normal']) for (let i = 0; i < 4; i++) playAI(n, Array(n).fill(lv));
});

test('normal AI beats easy AI more often than not', () => {
  let won = 0, lost = 0;
  for (let i = 0; i < 60; i++) {
    const lv = i % 2 ? ['normal', 'easy'] : ['easy', 'normal'];
    const s = playAI(2, lv);
    const me = i % 2 ? 0 : 1, sc = CON.scores(s);
    if (sc[me] > sc[1 - me]) won++; else if (sc[me] < sc[1 - me]) lost++;
  }
  assert.ok(won > lost * 1.4, `normal won ${won}, lost ${lost}`);
});

test('a player without cards is skipped; the round count still advances', () => {
  const s = ready(3, [], { rounds: 3 });
  s.hand[0] = s.hand[0].concat(s.hand[1]); s.hand[1] = [];  // red is out of cards
  assert.ok(CON.pass(s, 0));
  assert.equal(s.turn, 2, 'red is skipped');
  assert.equal(s.turnNo, 2);
  assert.equal(CON.canChallenge(s, 2, 1), false, 'nobody can challenge an empty hand');
  assert.equal(CON.offer(s, 2, 1, 20, 0), false);
  assert.ok(CON.pass(s, 2));
  assert.equal(s.turn, 0);
  assert.equal(CON.round(s), 2);
  for (let i = 0; i < 3; i++) assert.ok(CON.pass(s, s.turn));
  assert.equal(s.phase, 'turn');
  assert.ok(CON.pass(s, s.turn));
  assert.equal(s.phase, 'over', 'after 3 rounds (9 turns, 3 of them skipped)');
});

test('setup ignores seats outside the table; actions out of phase are rejected', () => {
  const s = CON.create({ players: 2 });
  assert.equal(CON.setTypes(s, 2, all(R)), false);
  assert.equal(CON.setTypes(s, -1, all(R)), false);
  assert.equal(s.type.length, 20);
  assert.equal(CON.pass(s, 0), false, 'no turns during setup');
  assert.equal(CON.challenge(s, 0, 1, 0), false);
  CON.setTypes(s, 0, all(R)); CON.setTypes(s, 1, all(R));
  assert.equal(CON.respond(s, 1, 10), false, 'no pending fight');
  assert.equal(CON.answer(s, 1, true), false, 'no pending offer');
  assert.equal(CON.challenge(s, 0, 1, 15), false, 'cannot fight with a card you do not hold');
  assert.equal(CON.challenge(s, 1, 0, 10), false, 'not your turn');
  assert.equal(CON.challenge(s, 0, 0, 1), false, 'not yourself');
  assert.ok(CON.offer(s, 0, 1, 0, 10));
  assert.equal(CON.pass(s, 0), false, 'must wait for the answer');
  assert.equal(CON.challenge(s, 0, 1, 1), false);
});

test('exact tie in a fight: both cards revealed, nothing moves, the fight still counts', () => {
  const s = ready(3, [all(P), all(P), all(R)]);
  CON.challenge(s, 0, 1, 6); CON.respond(s, 1, 16);
  assert.equal(s.last.w, -1);
  assert.equal(s.hand[0].length, 10); assert.equal(s.hand[1].length, 10);
  assert.ok(s.shown[6] && s.shown[16]);
  CON.pass(s, 1); CON.pass(s, 2);
  CON.challenge(s, 0, 1, 0);
  assert.ok(CON.canDecline(s, 1, 0), 'a drawn fight is still a fight for the rematch rule');
});

test('guest view (online) never leaks unseen types, even after swaps', () => {
  const s = ready(2, [all(S), all(P)]);
  CON.offer(s, 0, 1, 3, 13); CON.answer(s, 1, true);
  const v = CON.view(s, 1);
  assert.equal(v.type[3], S, 'received card is known');
  assert.equal(v.type[4], null);
  assert.equal(CON.view(s, 0).type[13], P);
  assert.equal(CON.view(s, 0).type[14], null);
});

test('a pending offer does not reveal the offered card; a refused swap teaches nothing', () => {
  const s = ready(3, [all(S), all(P), all(R)]);
  assert.ok(CON.offer(s, 0, 1, 4, 15));
  assert.equal(CON.view(s, 1).type[4], null, 'receiver does not see the type before accepting');
  assert.equal(CON.view(s, 2).type[15], null);
  assert.equal(CON.answer(s, 2, true), false, 'only the asked player answers');
  assert.ok(CON.answer(s, 1, false));
  assert.equal(CON.view(s, 1).type[4], null);
  assert.equal(CON.view(s, 0).type[15], null);
  assert.ok(s.hand[0].includes(4) && s.hand[1].includes(15));
});

test('third players never see the committed card; after a refusal the challenger may pick someone else', () => {
  const s = ready(3, [all(R), all(S), all(P)]);
  CON.challenge(s, 0, 1, 0); CON.respond(s, 1, 10);   // blue rock beats red scissors
  CON.pass(s, 1); CON.pass(s, 2);
  assert.ok(CON.challenge(s, 0, 1, 3));
  assert.equal(CON.view(s, 2).pend.ca, null);
  assert.equal(CON.view(s, -1).pend.ca, null);
  assert.ok(CON.decline(s, 1));
  assert.equal(CON.challenge(s, 0, 1, 3), false);
  assert.ok(CON.challenge(s, 0, 2, 3));
  assert.ok(CON.respond(s, 2, 25));                   // paper beats rock: green takes blue's 4
  assert.ok(s.hand[2].includes(3));
  assert.equal(s.refused.length, 0, 'refusals are forgotten when the turn ends');
});

test('fighting with a captured card: the card keeps its owner for scoring', () => {
  const s = ready(2, [all(R), all(S)]);
  CON.challenge(s, 0, 1, 0); CON.respond(s, 1, 19);   // blue takes red 10
  assert.equal(CON.score(s, 0), 10);
  CON.pass(s, 1);
  CON.challenge(s, 0, 1, 19); CON.respond(s, 1, 18);  // red scissors 10 vs red scissors 9: blue wins again
  assert.deepEqual(CON.scores(s), [10, 0]);
  CON.challenge(s, 1, 0, 17); CON.respond(s, 0, 19);  // scissors 8 vs scissors 10: blue keeps it
  assert.ok(s.hand[0].includes(19) && s.hand[0].includes(17));
  assert.equal(CON.score(s, 0), 10);
});

test('equal top scores are a tie', () => {
  const s = ready(3);
  s.hand[0] = [0, 15]; s.hand[1] = [11, 26]; s.hand[2] = [2, 3];
  assert.deepEqual(CON.scores(s), [6, 7, 4], 'own cards count for nothing');
  s.hand[0] = [0, 16];
  assert.deepEqual(CON.winners(s), [0, 1]);
});

test('AI only uses its own view: legal answers even when it knows nothing else', () => {
  for (let i = 0; i < 30; i++) {
    const s = ready(4, [0, 1, 2, 3].map(() => CON.aiTypes()));
    const p = s.turn, v = CON.view(s, p);
    assert.ok(v.type.every((x, id) => x === null || CON.owner(id) === p));
    const a = CON.aiAct(v, p, 'normal');
    assert.ok(a.kind === 'pass' || (a.kind === 'offer' ? CON.canOffer(s, p, a.b, a.give, a.want) : CON.canChallenge(s, p, a.b) && s.hand[p].includes(a.card)));
  }
});
