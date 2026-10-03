// Pig — pure game logic + computer players (no DOM).
//
// Rules (book version): on your turn roll the dice as often as you like; every roll adds to the turn total.
//   two dice: plain roll → sum; doubles → twice the sum; 1 + 1 → 25; a single 1 → turn total lost, turn over.
//   one die (variant): 1 → turn total lost, turn over; otherwise the face value.
// Hold to bank the turn total. Reaching the target (banked + turn total) wins on the spot.
import { POLICY1, POLICY2, EXTRA1, EXTRA2 } from './policy.js';

const TARGET = 100;

function decode(b64) {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const tables = {};
const table = (dice) => (tables[dice] ??= decode(dice === 1 ? POLICY1 : POLICY2));

// Seeded RNG helper (for tests / reproducible simulations).
function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PIG = {
  TARGET,
  rng: mulberry,

  create({ players = 2, dice = 2, first = 0, target = TARGET } = {}) {
    return {
      n: players, dice, target, first,
      scores: Array(players).fill(0),
      turn: first % players,
      k: 0,            // turn total
      rolls: [],       // gains rolled this turn
      last: null,      // last roll: { p, d, g, kind }
      winner: -1,
      moves: 0,        // action counter (online sync)
      turns: 0,        // completed turns
    };
  },

  clone: (s) => JSON.parse(JSON.stringify(s)),

  // Score of one roll. kind: plain | double | snake | bust
  outcome(d) {
    if (d.length === 1) return d[0] === 1 ? { g: 0, kind: 'bust' } : { g: d[0], kind: 'plain' };
    const [a, b] = d;
    if (a === 1 && b === 1) return { g: 25, kind: 'snake' };
    if (a === 1 || b === 1) return { g: 0, kind: 'bust' };
    if (a === b) return { g: 2 * (a + b), kind: 'double' };
    return { g: a + b, kind: 'plain' };
  },

  throwDice(dice, rnd = Math.random) {
    return Array.from({ length: dice }, () => 1 + Math.floor(rnd() * 6));
  },

  isOver: (s) => s.winner >= 0,
  canRoll: (s) => s.winner < 0,
  canHold: (s) => s.winner < 0 && s.rolls.length > 0,

  isLegal(s, act) {
    if (!act || s.winner >= 0) return false;
    if (act.a === 'hold') return PIG.canHold(s);
    if (act.a !== 'roll' || !Array.isArray(act.d) || act.d.length !== s.dice) return false;
    return act.d.every((x) => Number.isInteger(x) && x >= 1 && x <= 6);
  },

  // Applies { a: 'roll', d: [..] } or { a: 'hold' }. Returns an event describing what happened.
  apply(s, act) {
    if (!PIG.isLegal(s, act)) throw new Error('illegal action ' + JSON.stringify(act));
    const p = s.turn;
    s.moves++;
    if (act.a === 'hold') {
      const banked = s.k;
      s.scores[p] += s.k;
      PIG.endTurn(s);
      return { type: 'hold', p, banked };
    }
    const { g, kind } = PIG.outcome(act.d);
    s.last = { p, d: act.d.slice(), g, kind };
    if (kind === 'bust') {
      const lost = s.k;
      PIG.endTurn(s);
      return { type: 'bust', p, lost, d: act.d };
    }
    s.k += g;
    s.rolls.push(g);
    if (s.scores[p] + s.k >= s.target) {
      s.scores[p] += s.k;
      s.winner = p;
      return { type: 'win', p, g, kind, d: act.d };
    }
    return { type: 'roll', p, g, kind, d: act.d, k: s.k };
  },

  endTurn(s) {
    s.k = 0;
    s.rolls = [];
    s.turns++;
    s.turn = (s.turn + 1) % s.n;
  },

  // Convenience: roll with random dice.
  roll: (s, rnd = Math.random) => PIG.apply(s, { a: 'roll', d: PIG.throwDice(s.dice, rnd) }),
  hold: (s) => PIG.apply(s, { a: 'hold' }),

  // Best opponent score (multi-player games are treated as a duel against the leader).
  rival: (s, p = s.turn) => Math.max(...s.scores.filter((_, q) => q !== p)),

  // Computer decision: 'roll' or 'hold'.
  //   easy   — holds at a modest, slightly random total (too timid, sometimes too greedy)
  //   normal — holds at the total that maximises the average score per turn (27 / 20 with one die)
  //   hard   — exact win-probability-maximising policy (precomputed table)
  aiAction(s, level = 'normal') {
    if (!PIG.canHold(s)) return 'roll';
    const i = s.scores[s.turn], k = s.k, need = s.target - i;
    if (level === 'easy') {
      const base = s.dice === 1 ? 10 : 14;
      const thr = base + ((s.turns * 7 + s.turn * 3) % 9);
      return k >= Math.min(thr, need) ? 'hold' : 'roll';
    }
    if (level === 'normal' || s.target !== TARGET) {
      return k >= Math.min(s.dice === 1 ? 20 : 27, need) ? 'hold' : 'roll';
    }
    const j = Math.min(PIG.rival(s), s.target - 1);
    const extra = (s.dice === 1 ? EXTRA1 : EXTRA2)[`${i},${j}`];
    if (extra) return extra.some(([a, b]) => k >= a && k < b) ? 'hold' : 'roll';
    const tab = table(s.dice), o = 2 * (i * TARGET + j);
    const f = tab[o], r = tab[o + 1];
    return k >= f && k < r ? 'hold' : 'roll';
  },

  // Expected points gained by one more roll with turn total k (for tips / tests).
  rollGain(dice, k) {
    let sum = 0, n = 0, bust = 0;
    const faces = [1, 2, 3, 4, 5, 6];
    const all = dice === 1 ? faces.map((a) => [a]) : faces.flatMap((a) => faces.map((b) => [a, b]));
    for (const d of all) {
      const o = PIG.outcome(d);
      n++;
      if (o.kind === 'bust') bust++; else sum += o.g;
    }
    return sum / n - (bust / n) * k;
  },
};
