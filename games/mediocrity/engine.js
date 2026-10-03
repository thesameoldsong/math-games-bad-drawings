// Mediocrity: pure game logic + AI. No DOM.
//
// Three players secretly pick a whole number 0..max each round. The median pick scores its own value.
// If exactly two picks coincide, the odd one out hands the points to one of the two.
// If all three coincide, nobody scores. After the last round the player with the MIDDLE total wins;
// if two totals tie, the odd one out crowns one of the tied pair; three equal totals = a draw.

const N = 3;

function create({ rounds = 5, max = 30 } = {}) {
  return {
    rounds, max, round: 0,
    picks: Array(N).fill(null),
    scores: Array(N).fill(0),
    phase: 'pick',          // pick | assign | crown | over
    pending: null,          // assign/crown: { value, chooser, tied:[a,b] }
    log: [],                // [{ picks, value, to (-1 none), chooser (-1 none) }]
    winner: null,           // over: player index, -1 = draw
    n: 0,                   // action counter (online sync)
  };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

// Who scores a round with these picks.
// { type:'single', value, to } | { type:'tie', value, chooser, tied } | { type:'triple', value }
function outcome(picks) {
  const [a, b, c] = picks;
  const sorted = picks.slice().sort((x, y) => x - y);
  const value = sorted[1];
  if (a === b && b === c) return { type: 'triple', value };
  if (a === b) return { type: 'tie', value, chooser: 2, tied: [0, 1] };
  if (a === c) return { type: 'tie', value, chooser: 1, tied: [0, 2] };
  if (b === c) return { type: 'tie', value, chooser: 0, tied: [1, 2] };
  return { type: 'single', value, to: picks.indexOf(value) };
}

// Final standings: { type:'single', to } | { type:'tie', chooser, tied } | { type:'draw' }
function finalOutcome(scores) {
  const o = outcome(scores);
  if (o.type === 'triple') return { type: 'draw' };
  return o;
}

const legalPick = (s, p, x) =>
  s.phase === 'pick' && p >= 0 && p < N && s.picks[p] === null && Number.isInteger(x) && x >= 0 && x <= s.max;

// Mutating actions. Each returns true if legal and applied.
function pick(s, p, x) {
  if (!legalPick(s, p, x)) return false;
  s.picks[p] = x;
  s.n++;
  if (s.picks.every((v) => v !== null)) resolveRound(s);
  return true;
}

function resolveRound(s) {
  const o = outcome(s.picks);
  if (o.type === 'tie') {
    s.phase = 'assign';
    s.pending = { value: o.value, chooser: o.chooser, tied: o.tied };
  } else commit(s, o.type === 'single' ? o.to : -1, -1, o.value);
}

function assign(s, p, to) {
  if (s.phase !== 'assign' || s.pending.chooser !== p || !s.pending.tied.includes(to)) return false;
  s.n++;
  commit(s, to, p, s.pending.value);
  return true;
}

function commit(s, to, chooser, value) {
  s.log.push({ picks: s.picks.slice(), value, to, chooser });
  if (to >= 0) s.scores[to] += value;
  s.round++;
  s.picks = Array(N).fill(null);
  s.pending = null;
  s.phase = 'pick';
  if (s.round >= s.rounds) finishGame(s);
}

function finishGame(s) {
  const o = finalOutcome(s.scores);
  if (o.type === 'tie') { s.phase = 'crown'; s.pending = { value: s.scores[o.tied[0]], chooser: o.chooser, tied: o.tied }; return; }
  s.phase = 'over';
  s.winner = o.type === 'single' ? o.to : -1;
}

function crown(s, p, to) {
  if (s.phase !== 'crown' || s.pending.chooser !== p || !s.pending.tied.includes(to)) return false;
  s.n++;
  s.phase = 'over';
  s.winner = to;
  s.pending = { ...s.pending, crowned: to };
  return true;
}

// Who must act now: list of players (pick: everyone without a pick; assign/crown: the chooser).
function waitingFor(s) {
  if (s.phase === 'pick') return [0, 1, 2].filter((p) => s.picks[p] === null);
  if (s.phase === 'assign' || s.phase === 'crown') return [s.pending.chooser];
  return [];
}

// Hide the picks a given seat may not see (online): others' numbers become -1 ("picked, secret").
// Only matters while picking: once all three are in, the numbers are public anyway.
function redact(s, seat) {
  const r = clone(s);
  if (r.phase === 'pick') r.picks = r.picks.map((v, i) => (i === seat || v === null ? v : -1));
  return r;
}

// ---------------------------------------------------------------- AI
// Easy: a hunch, often around the middle of the range; gives tied points away at random.
// Normal: Monte Carlo — for every candidate number, sample what the others might pick, resolve the round,
// play the remaining rounds out with a simple policy, and count how often we finish with the middle total.

function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A plausible human-ish pick: mix of "anything", "around the middle" and "low-ish".
function guessPick(max, rnd) {
  const u = rnd();
  if (u < 0.35) return Math.floor(rnd() * (max + 1));
  if (u < 0.8) return Math.round(((rnd() + rnd() + rnd()) / 3) * max);
  return Math.round(rnd() * rnd() * max);
}

// Result value of final scores for player p: 1 win, 0.5 coin-flip crown, 0 otherwise (draw = 1/3).
function finalValue(scores, p) {
  const o = finalOutcome(scores);
  if (o.type === 'draw') return 1 / 3;
  if (o.type === 'single') return o.to === p ? 1 : 0;
  return o.tied.includes(p) ? 0.5 : 0;
}

// Cheap assignment policy for playouts: give the points to whoever ends up farther from the middle... for me.
function quickAssign(scores, chooser, tied, value) {
  const [a, b] = tied;
  const va = scores.slice(); va[a] += value;
  const vb = scores.slice(); vb[b] += value;
  const sa = middleness(va, chooser), sb = middleness(vb, chooser);
  return sa >= sb ? a : b;
}
// Heuristic: how "in the middle" is player p (bigger = better).
function middleness(scores, p) {
  const others = scores.filter((_, i) => i !== p);
  const lo = Math.min(...others), hi = Math.max(...others), m = scores[p];
  if (m > lo && m < hi) return Math.min(m - lo, hi - m);
  return -Math.min(Math.abs(m - lo), Math.abs(m - hi)) - 1;
}

function playRound(scores, picks) {
  const o = outcome(picks);
  if (o.type === 'single') scores[o.to] += o.value;
  else if (o.type === 'tie') scores[quickAssign(scores, o.chooser, o.tied, o.value)] += o.value;
}

function playout(scores, roundsLeft, max, rnd) {
  const sc = scores.slice();
  for (let r = 0; r < roundsLeft; r++) playRound(sc, [guessPick(max, rnd), guessPick(max, rnd), guessPick(max, rnd)]);
  return sc;
}

function aiPick(s, p, level = 'normal', seed = (Math.random() * 2 ** 32) >>> 0) {
  const rnd = mulberry(seed);
  if (level === 'easy') {
    return rnd() < 0.5 ? Math.round(((rnd() + rnd()) / 2) * s.max) : Math.floor(rnd() * (s.max + 1));
  }
  const samples = 360;
  const left = s.rounds - s.round - 1;
  const others = [0, 1, 2].filter((i) => i !== p);
  const wins = new Float64Array(s.max + 1);
  for (let k = 0; k < samples; k++) {
    // common random numbers: every candidate faces the same opponents and the same future
    const sk = (seed + k * 7919) >>> 0;
    const r0 = mulberry(sk);
    const opp = [guessPick(s.max, r0), guessPick(s.max, r0)];
    for (let x = 0; x <= s.max; x++) {
      const picks = [0, 0, 0];
      picks[p] = x; picks[others[0]] = opp[0]; picks[others[1]] = opp[1];
      const sc = s.scores.slice();
      playRound(sc, picks);
      const fin = left > 0 ? playout(sc, left, s.max, mulberry(sk ^ 0x9e3779b9)) : sc;
      wins[x] += finalValue(fin, p);
    }
  }
  let best = 0;
  for (let x = 1; x <= s.max; x++) if (wins[x] > wins[best] + 1e-9 || (Math.abs(wins[x] - wins[best]) < 1e-9 && rnd() < 0.5)) best = x;
  return best;
}

function aiAssign(s, p, level = 'normal', seed = (Math.random() * 2 ** 32) >>> 0) {
  const { tied, value } = s.pending;
  const rnd = mulberry(seed);
  if (level === 'easy') return tied[rnd() < 0.5 ? 0 : 1];
  if (s.phase === 'crown') return tied[rnd() < 0.5 ? 0 : 1]; // the chooser can't win either way
  const left = s.rounds - s.round - 1;
  const score = [0, 0];
  const samples = 600;
  tied.forEach((to, i) => {
    for (let k = 0; k < samples; k++) {
      const sc = s.scores.slice(); sc[to] += value;
      const fin = left > 0 ? playout(sc, left, s.max, mulberry((seed + k * 104729) >>> 0)) : sc;
      score[i] += finalValue(fin, p);
    }
  });
  if (score[0] === score[1]) return quickAssign(s.scores, p, tied, value);
  return score[0] > score[1] ? tied[0] : tied[1];
}

export const MED = {
  N, create, clone, outcome, finalOutcome, legalPick, pick, assign, crown, waitingFor, redact,
  aiPick, aiAssign,
};
