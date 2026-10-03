// 101 and You're Done — pure rules + computer players (no DOM).
//
// A match is several rounds. In a round every player rolls a die ROLLS times (turns go around the table,
// one roll per turn). After each roll the player adds either the face (d) or ten times the face (10d).
// A total above 100 is a bust: it counts as 0 and that player sits out the rest of the round.
// The highest total that is still ≤ 100 takes the round (ties: every tied player takes it; all bust: nobody).
// Most rounds won takes the match.

export const LIMIT = 100;
export const ROLLS = 6;

function create({ n = 2, rounds = 5, first = 0 } = {}) {
  const s = {
    n, rounds, round: 0, first, matchFirst: first,
    wins: Array(n).fill(0), history: [], seq: 0,
  };
  startRound(s);
  return s;
}

function startRound(s) {
  s.first = (s.matchFirst + s.round) % s.n;
  s.turn = s.first;
  s.rolls = Array.from({ length: s.n }, () => []);
  s.totals = Array(s.n).fill(0);
  s.bust = Array(s.n).fill(false);
  s.die = 0;
  s.phase = 'roll';
  s.last = null;            // { p, d, x10, bust }
}

const clone = (s) => JSON.parse(JSON.stringify(s));
const left = (s, p) => (s.bust[p] ? 0 : ROLLS - s.rolls[p].length);
const done = (s, p) => left(s, p) === 0;

// Next player (after p, around the table) who still has rolls; -1 if nobody.
function nextPlayer(s, p) {
  for (let k = 1; k <= s.n; k++) {
    const q = (p + k) % s.n;
    if (!done(s, q)) return q;
  }
  return -1;
}

function roundWinners(totals, bust) {
  const ok = totals.map((v, p) => (bust[p] ? -1 : v));
  const m = Math.max(...ok);
  if (m <= 0) return [];
  return ok.map((v, p) => (v === m ? p : -1)).filter((p) => p >= 0);
}

// Roll result v (1..6) for the player to move. If even +v busts, the bust is applied at once.
function roll(s, v) {
  if (s.phase !== 'roll' || !(v >= 1 && v <= 6)) return false;
  s.die = v;
  s.phase = 'choose';
  s.seq++;
  if (s.totals[s.turn] + v > LIMIT) apply(s, false, true);
  return true;
}

function choose(s, x10) {
  if (s.phase !== 'choose') return false;
  apply(s, !!x10, false);
  s.seq++;
  return true;
}

function apply(s, x10, forced) {
  const p = s.turn, d = s.die, add = x10 ? d * 10 : d;
  s.rolls[p].push({ d, x10 });
  s.totals[p] += add;
  const b = s.totals[p] > LIMIT;
  if (b) s.bust[p] = true;
  s.last = { p, d, x10, bust: b, forced: !!forced };
  s.die = 0;
  const q = nextPlayer(s, p);
  if (q >= 0) { s.turn = q; s.phase = 'roll'; return; }
  const w = roundWinners(s.totals, s.bust);
  for (const p2 of w) s.wins[p2]++;
  s.history.push({ totals: s.totals.slice(), bust: s.bust.slice(), winners: w });
  s.phase = s.round + 1 >= s.rounds ? 'over' : 'roundover';
}

function nextRound(s) {
  if (s.phase !== 'roundover') return false;
  s.round++;
  s.seq++;
  startRound(s);
  return true;
}

function champions(s) {
  const m = Math.max(...s.wins);
  return s.wins.map((v, p) => (v === m ? p : -1)).filter((p) => p >= 0);
}

// ---------- analysis ----------
// Solo: best expected final score (bust = 0) with total a and k rolls to go.
const EV = new Float64Array(101 * 7).fill(NaN);
function ev(a, k) {
  if (a > LIMIT) return 0;
  if (k === 0) return a;
  const i = a * 7 + k;
  if (!Number.isNaN(EV[i])) return EV[i];
  let sum = 0;
  for (let d = 1; d <= 6; d++) sum += Math.max(ev(a + d, k - 1), ev(a + 10 * d, k - 1));
  return (EV[i] = sum / 6);
}

// Probability of finishing ≤ 100 from a with k rolls left (always adding the plain face).
const SURV = new Float64Array(101 * 7).fill(NaN);
function survive(a, k) {
  if (a > LIMIT) return 0;
  if (k === 0) return 1;
  const i = a * 7 + k;
  if (!Number.isNaN(SURV[i])) return SURV[i];
  let sum = 0;
  for (let d = 1; d <= 6; d++) sum += survive(a + d, k - 1);
  return (SURV[i] = sum / 6);
}

// Two players, perfect information: value (win = 1, tie or both bust = ½) for the player about to roll,
// holding a with ka rolls left, against b with kb left (b = -1: the other already busted).
const WP = new Float64Array(101 * 7 * 102 * 7).fill(NaN);
const wpIdx = (a, ka, b, kb) => ((a * 7 + ka) * 102 + (b + 1)) * 7 + kb;
function wp(a, ka, b, kb) {
  const i = wpIdx(a, ka, b, kb);
  if (!Number.isNaN(WP[i])) return WP[i];
  let sum = 0;
  for (let d = 1; d <= 6; d++) sum += Math.max(after(a + d, ka - 1, b, kb), after(a + 10 * d, ka - 1, b, kb));
  return (WP[i] = sum / 6);
}
// value for the mover right after adding to reach a2 (ka2 rolls left)
function after(a2, ka2, b, kb) {
  if (a2 > LIMIT) return b < 0 ? 0.5 : 0.5 * (1 - survive(b, kb));
  if (b >= 0 && kb > 0) return 1 - wp(b, kb, a2, ka2);
  if (ka2 > 0) return wp(a2, ka2, b, 0);
  return b < 0 || a2 > b ? 1 : a2 === b ? 0.5 : 0;
}

// Value of each option (plain, ×10) for the player to move in phase 'choose', on a 0..1 scale.
function rate(s) {
  const p = s.turn, a = s.totals[p], d = s.die, k = left(s, p) - 1;
  if (s.n === 2) {
    const q = 1 - p;
    const b = s.bust[q] ? -1 : s.totals[q], kb = s.bust[q] ? 0 : left(s, q);
    return [after(a + d, k, b, kb), after(a + 10 * d, k, b, kb)];
  }
  // more players: expected score is a fair proxy
  return [ev(a + d, k) / LIMIT, ev(a + 10 * d, k) / LIMIT];
}

// Computer's decision for the current roll: true = take ten times the face.
function aiChoose(s, level = 'normal', rnd = Math.random) {
  const p = s.turn, a = s.totals[p], d = s.die;
  if (a + 10 * d > LIMIT) return false;
  if (level === 'easy') {
    // greedy, with a little caution near the top
    if (a + 10 * d > 90 && left(s, p) > 2) return rnd() < 0.35;
    return rnd() < 0.85;
  }
  if (level === 'normal') {
    const k = left(s, p) - 1;
    return ev(a + 10 * d, k) > ev(a + d, k);
  }
  const [v1, v10] = rate(s);
  return v10 > v1 + 1e-12;
}

export const H101 = {
  LIMIT, ROLLS, create, clone, roll, choose, nextRound, left, done, roundWinners, champions,
  rate, aiChoose, ev, survive, wp,
};
