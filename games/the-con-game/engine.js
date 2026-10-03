// The Con Game: pure game logic + AI. No DOM.
//
// Every player starts with ten cards numbered 1..10 that carry their name, and secretly marks each one
// rock, paper or scissors. Players take turns. On a turn you may offer one swap (card for card, the other
// side accepts or not) and then either challenge someone to a fight or pass. In a fight both sides pick a
// card in secret; rock > scissors > paper > rock, same type → higher number wins, exact tie → nothing.
// The winner keeps both cards. After the agreed number of rounds, each player scores the highest card
// they hold from every OTHER player (own cards are worth nothing). Highest total wins.
//
// Cards are ids 0..np*10-1: owner = id / 10, number = id % 10 + 1. Owner and number are public
// (everyone saw where every card went); the TYPE is secret until the card is shown in a fight.

export const ROCK = 0, PAPER = 1, SCISSORS = 2;
const HAND = 10;

const owner = (id) => Math.floor(id / HAND);
const num = (id) => (id % HAND) + 1;
const range = (n) => Array.from({ length: n }, (_, i) => i);
const all = (np) => (1 << np) - 1;

// 1: a wins, -1: b wins, 0: nobody
function duel(ta, na, tb, nb) {
  if (ta === tb) return na > nb ? 1 : na < nb ? -1 : 0;
  return (ta - tb + 3) % 3 === 1 ? 1 : -1;
}

function create({ players = 2, rounds = 8, first = 0 } = {}) {
  const np = Math.max(2, Math.min(4, players | 0));
  return {
    np, rounds, first: first % np,
    phase: 'setup',               // setup | turn | fight | trade | over
    type: Array(np * HAND).fill(null),
    known: range(np * HAND).map((id) => 1 << owner(id)), // bitmask: who has seen this card's type
    shown: Array(np * HAND).fill(false),                 // revealed to everyone in a fight
    hand: range(np).map((p) => range(HAND).map((i) => p * HAND + i)),
    ready: Array(np).fill(false),
    turnNo: 0, turn: first % np,
    traded: false,                // this turn's swap offer is used up
    refused: [],                  // players who declined the current player's challenge this turn
    fights: [],                   // [a, b] pairs in order (for the "you may refuse a rematch" rule)
    pend: null,                   // fight: {a, b, ca} · trade: {a, b, give, want}
    last: null,                   // last fight: {a, b, ca, cb, w} (w = winner seat or -1)
    ev: null,                     // last public event, for reactions
    seq: 0,                       // action counter (online sync)
  };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

// ---------- scoring ----------
function bestFrom(hand, p, np) {
  const best = Array(np).fill(0);
  for (const id of hand) { const o = owner(id); if (o !== p && num(id) > best[o]) best[o] = num(id); }
  return best;
}
const scoreOf = (hand, p, np) => bestFrom(hand, p, np).reduce((a, b) => a + b, 0);
const score = (s, p) => scoreOf(s.hand[p], p, s.np);
const scores = (s) => range(s.np).map((p) => score(s, p));
// Cards that currently count for p's score (the highest card from each opponent).
function counting(s, p) {
  const best = bestFrom(s.hand[p], p, s.np), out = new Set();
  for (const id of s.hand[p]) if (owner(id) !== p && num(id) === best[owner(id)]) out.add(id);
  return out;
}
function winners(s) {
  const sc = scores(s), top = Math.max(...sc);
  return range(s.np).filter((p) => sc[p] === top);
}

// ---------- rules ----------
const validTypes = (t) => Array.isArray(t) && t.length === HAND && t.every((x) => x === 0 || x === 1 || x === 2);

function setTypes(s, p, types) {
  if (s.phase !== 'setup' || !(p >= 0 && p < s.np) || s.ready[p] || !validTypes(types)) return false;
  types.forEach((x, i) => (s.type[p * HAND + i] = x));
  s.ready[p] = true;
  s.seq++;
  if (s.ready.every(Boolean)) { s.phase = 'turn'; s.ev = { k: 'start' }; checkStuck(s); }
  return true;
}

const canFight = (s, p) => s.hand[p].length > 0;
function canChallenge(s, a, b) {
  return s.phase === 'turn' && s.turn === a && a !== b && b >= 0 && b < s.np &&
    canFight(s, a) && canFight(s, b) && !s.refused.includes(b);
}
// Once two players have fought, either may refuse a rematch until BOTH have fought someone else.
// With only two players that would end the game, so the rule only applies to three or more.
function canDecline(s, b, a) {
  if (s.np < 3) return false;
  let i = s.fights.length - 1;
  for (; i >= 0; i--) { const [x, y] = s.fights[i]; if ((x === a && y === b) || (x === b && y === a)) break; }
  if (i < 0) return false;
  const since = s.fights.slice(i + 1);
  const other = (p) => since.some(([x, y]) => (x === p && y !== (p === a ? b : a)) || (y === p && x !== (p === a ? b : a)));
  return !(other(a) && other(b));
}
const canOffer = (s, a, b, give, want) =>
  s.phase === 'turn' && s.turn === a && !s.traded && a !== b && b >= 0 && b < s.np &&
  s.hand[a].includes(give) && s.hand[b].includes(want);

function challenge(s, a, b, ca) {
  if (!canChallenge(s, a, b) || !s.hand[a].includes(ca)) return false;
  s.phase = 'fight';
  s.pend = { a, b, ca };
  s.ev = { k: 'challenge', a, b };
  s.seq++;
  return true;
}

function respond(s, b, cb) {
  if (s.phase !== 'fight' || s.pend.b !== b || !s.hand[b].includes(cb)) return false;
  const { a, ca } = s.pend;
  const r = duel(s.type[ca], num(ca), s.type[cb], num(cb));
  const w = r > 0 ? a : r < 0 ? b : -1;
  if (r > 0) { s.hand[b] = s.hand[b].filter((x) => x !== cb); s.hand[a].push(cb); }
  if (r < 0) { s.hand[a] = s.hand[a].filter((x) => x !== ca); s.hand[b].push(ca); }
  for (const id of [ca, cb]) { s.shown[id] = true; s.known[id] = all(s.np); }
  s.fights.push([a, b]);
  s.last = { a, b, ca, cb, w };
  s.ev = { k: 'fight', a, b, ca, cb, w };
  s.pend = null;
  s.seq++;
  endTurn(s);
  return true;
}

function decline(s, b) {
  if (s.phase !== 'fight' || s.pend.b !== b || !canDecline(s, b, s.pend.a)) return false;
  const { a } = s.pend;
  s.refused.push(b);
  s.pend = null;
  s.phase = 'turn';
  s.ev = { k: 'decline', a, b };
  s.seq++;
  return true;
}

function offer(s, a, b, give, want) {
  if (!canOffer(s, a, b, give, want)) return false;
  s.phase = 'trade';
  s.pend = { a, b, give, want };
  s.traded = true;
  s.ev = { k: 'offer', a, b, give, want };
  s.seq++;
  return true;
}

function answer(s, b, yes) {
  if (s.phase !== 'trade' || s.pend.b !== b) return false;
  const { a, give, want } = s.pend;
  if (yes) {
    s.hand[a] = s.hand[a].filter((x) => x !== give).concat(want);
    s.hand[b] = s.hand[b].filter((x) => x !== want).concat(give);
    s.known[give] |= 1 << b;
    s.known[want] |= 1 << a;
  }
  s.pend = null;
  s.phase = 'turn';
  s.ev = { k: yes ? 'deal' : 'nodeal', a, b, give, want };
  s.seq++;
  return true;
}

function pass(s, a) {
  if (s.phase !== 'turn' || s.turn !== a) return false;
  s.ev = { k: 'pass', a };
  s.seq++;
  endTurn(s);
  return true;
}

// A player without cards can do nothing at all (no fight, no swap), so their turns are skipped.
function endTurn(s) {
  s.traded = false;
  s.refused = [];
  s.phase = 'turn';
  do {
    s.turnNo++;
    s.turn = (s.first + s.turnNo) % s.np;
    if (s.turnNo >= s.rounds * s.np) { s.phase = 'over'; return; }
    checkStuck(s);
  } while (s.phase === 'turn' && !canFight(s, s.turn));
}
// Fewer than two players with cards: no fight can ever happen again.
function checkStuck(s) {
  if (s.phase === 'turn' && range(s.np).filter((p) => canFight(s, p)).length < 2) s.phase = 'over';
}

// Who must act now (setup: everybody who hasn't marked their cards yet).
function actors(s) {
  if (s.phase === 'setup') return range(s.np).filter((p) => !s.ready[p]);
  if (s.phase === 'turn') return [s.turn];
  if (s.phase === 'fight' || s.phase === 'trade') return [s.pend.b];
  return [];
}
const round = (s) => Math.min(s.rounds, Math.floor(s.turnNo / s.np) + 1);

// What player p may see (p = -1: only what everybody saw).
function view(s, p) {
  const v = clone(s);
  const bit = p >= 0 ? 1 << p : 0;
  v.type = s.type.map((x, id) => (s.shown[id] || (s.known[id] & bit) ? x : null));
  if (v.pend && v.phase === 'fight' && v.pend.a !== p) v.pend.ca = null;
  return v;
}

// ---------- AI (works on a view: never looks at hidden types) ----------
const rnd = Math.random;

function aiTypes(level = 'normal') {
  // A loose random mix; the normal player avoids putting all its big cards in one basket.
  const t = range(HAND).map(() => Math.floor(rnd() * 3));
  if (level !== 'easy') {
    const big = [7, 8, 9];
    if (big.every((i) => t[i] === t[big[0]])) t[8] = (t[8] + 1 + Math.floor(rnd() * 2)) % 3;
  }
  return t;
}

// How good a distribution of cards is for p: own score minus the others' average, plus a little for
// holding many cards (more ammunition for later fights).
function worth(hand, p, np) {
  let other = 0, cards = 0;
  for (let q = 0; q < np; q++) if (q !== p) { other += scoreOf(hand[q], q, np); cards += hand[q].length; }
  return scoreOf(hand[p], p, np) - other / (np - 1) + 0.3 * (hand[p].length - cards / (np - 1));
}
function moved(hand, id, from, to) {
  const h = hand.slice();
  h[from] = h[from].filter((x) => x !== id);
  h[to] = h[to].concat(id);
  return h;
}

// Probability of each type for card id as seen in view v.
function typeDist(v, id) {
  if (v.type[id] !== null) return [0, 1, 2].map((x) => (x === v.type[id] ? 1 : 0));
  const o = owner(id), k = [1, 1, 1];
  for (let i = o * HAND; i < o * HAND + HAND; i++) if (i !== id && v.type[i] !== null) k[v.type[i]]++;
  const tot = k[0] + k[1] + k[2];
  return k.map((x) => x / tot);
}

// Expected change of worth for p when p plays card c against q (whose card is unknown to p).
function fightEV(v, p, q, c, careful) {
  const np = v.np, base = worth(v.hand, p, np), opp = v.hand[q];
  const winW = {}, loseW = worth(moved(v.hand, c, p, q), p, np) - base;
  // A careful player expects the opponent to hold back cards it would hate to lose.
  const baseQ = careful ? worth(v.hand, q, np) : 0;
  let wsum = 0, ev = 0;
  for (const d of opp) {
    let w = 1;
    if (careful) w = 1 / (1 + Math.max(0, baseQ - worth(moved(v.hand, d, q, p), q, np)) * 0.35);
    winW[d] ??= worth(moved(v.hand, d, q, p), p, np) - base;
    const dist = typeDist(v, d);
    let e = 0;
    for (let t = 0; t < 3; t++) {
      if (!dist[t]) continue;
      const r = duel(v.type[c], num(c), t, num(d));
      e += dist[t] * (r > 0 ? winW[d] : r < 0 ? loseW : 0);
    }
    ev += w * e; wsum += w;
  }
  return wsum ? ev / wsum : 0;
}
function bestCard(v, p, q, careful) {
  let best = null, bv = -Infinity;
  for (const c of v.hand[p]) {
    const e = fightEV(v, p, q, c, careful) + rnd() * 0.02;
    if (e > bv) { bv = e; best = c; }
  }
  return { card: best, ev: bv };
}
const pickAny = (arr) => arr[Math.floor(rnd() * arr.length)];

// Swap gain for both sides, judged from public info (owners and numbers).
function tradeGain(v, a, b, give, want) {
  const h = moved(moved(v.hand, give, a, b), want, b, a);
  return [worth(h, a, v.np) - worth(v.hand, a, v.np), worth(h, b, v.np) - worth(v.hand, b, v.np)];
}

// Action for the player on turn: {kind:'offer', b, give, want} | {kind:'challenge', b, card} | {kind:'pass'}
function aiAct(v, p, level = 'normal') {
  const targets = range(v.np).filter((q) => canChallenge(v, p, q));
  if (level === 'easy') {
    if (!targets.length || rnd() < 0.08) return { kind: 'pass' };
    return { kind: 'challenge', b: pickAny(targets), card: pickAny(v.hand[p]) };
  }
  if (!v.traded && v.hand[p].length) {
    let best = null, bg = 0.6;
    for (let q = 0; q < v.np; q++) {
      if (q === p) continue;
      for (const give of v.hand[p]) for (const want of v.hand[q]) {
        const [mine, theirs] = tradeGain(v, p, q, give, want);
        if (theirs > 0.25 && mine > bg) { bg = mine; best = { kind: 'offer', b: q, give, want }; }
      }
    }
    if (best) return best;
  }
  let best = null, bv = -Infinity;
  for (const q of targets) {
    const r = bestCard(v, p, q, true);
    if (r.ev > bv) { bv = r.ev; best = { kind: 'challenge', b: q, card: r.card }; }
  }
  if (!best || bv < -0.4) return { kind: 'pass' };
  return best;
}

// Answer to a challenge: {kind:'respond', card} | {kind:'decline'}
function aiRespond(v, p, level = 'normal') {
  const a = v.pend.a;
  if (level === 'easy') {
    if (canDecline(v, p, a) && rnd() < 0.3) return { kind: 'decline' };
    return { kind: 'respond', card: pickAny(v.hand[p]) };
  }
  const r = bestCard(v, p, a, true);
  if (canDecline(v, p, a) && r.ev < -0.2) return { kind: 'decline' };
  return { kind: 'respond', card: r.card };
}

// Accept a swap offer?
function aiAnswer(v, p, level = 'normal') {
  const { a, give, want } = v.pend;
  const mine = tradeGain(v, a, p, give, want)[1];
  if (level === 'easy') return mine > -1 && rnd() < 0.5;
  return mine >= 0.25;
}

export const CON = {
  HAND, ROCK, PAPER, SCISSORS,
  owner, num, duel, create, clone,
  score, scores, counting, winners,
  setTypes, canChallenge, canDecline, canOffer, challenge, respond, decline, offer, answer, pass,
  actors, round, view,
  aiTypes, aiAct, aiRespond, aiAnswer, fightEV, worth,
};
