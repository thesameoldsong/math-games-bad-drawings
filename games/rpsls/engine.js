// Rock, Paper, Scissors, Lizard, Spock — pure rules + computer opponents (no DOM).
//
// A match is a series of rounds. In each round both players secretly pick a gesture, then reveal.
// The winner of a round scores a point; a tie scores nothing and is simply replayed.
// First to `target` round wins takes the match.

// Gestures listed in "circle order": each one beats the next one and the one three steps ahead,
// so the 5-gesture star diagram is drawn by placing them clockwise in this order.
const ALL = ['scissors', 'paper', 'rock', 'lizard', 'spock'];
const CLASSIC = ['scissors', 'paper', 'rock'];

// [winner, loser, verb key]
const RULES = [
  ['scissors', 'paper', 'cut'],
  ['paper', 'rock', 'cover'],
  ['rock', 'lizard', 'crush'],
  ['lizard', 'spock', 'poison'],
  ['spock', 'scissors', 'smash'],
  ['scissors', 'lizard', 'behead'],
  ['lizard', 'paper', 'eat'],
  ['paper', 'spock', 'disprove'],
  ['spock', 'rock', 'vaporize'],
  ['rock', 'scissors', 'blunt'],
];

const TARGETS = [1, 2, 3, 5, 7];
const SETS = [3, 5];

const gesturesOf = (n) => (n === 3 ? CLASSIC : ALL);

function rule(a, b) {
  return RULES.find(([w, l]) => w === a && l === b) || null;
}
// +1 if a beats b, -1 if b beats a, 0 for a tie.
function outcome(a, b) {
  if (a === b) return 0;
  if (rule(a, b)) return 1;
  if (rule(b, a)) return -1;
  throw new Error(`unknown pair ${a}/${b}`);
}

function create({ set = 5, target = 3 } = {}) {
  return {
    set: SETS.includes(set) ? set : 5,
    target: TARGETS.includes(target) ? target : 3,
    score: [0, 0],
    rounds: [],           // { picks: [g0, g1], win: -1 | 0 | 1 }
    pending: [null, null],
    winner: -1,
  };
}

const clone = (s) => JSON.parse(JSON.stringify(s));
const valid = (s, g) => gesturesOf(s.set).includes(g);
const isOver = (s) => s.winner >= 0;

// Player p locks in gesture g. Returns the finished round when both have picked, else null.
function pick(s, p, g) {
  if (isOver(s)) throw new Error('match is over');
  if (p !== 0 && p !== 1) throw new Error('bad player ' + p);
  if (!valid(s, g)) throw new Error('illegal gesture ' + g);
  if (s.pending[p] !== null) throw new Error('already picked');
  s.pending[p] = g;
  if (s.pending[0] === null || s.pending[1] === null) return null;
  const picks = [s.pending[0], s.pending[1]];
  const o = outcome(picks[0], picks[1]);
  const win = o > 0 ? 0 : o < 0 ? 1 : -1;
  const r = { picks, win };
  s.rounds.push(r);
  s.pending = [null, null];
  if (win >= 0) {
    s.score[win]++;
    if (s.score[win] >= s.target) s.winner = win;
  }
  return r;
}

// ---------- computer opponents ----------
// They only ever look at revealed rounds (s.rounds), never at the opponent's pending pick.

const randomOf = (arr, rnd) => arr[Math.floor(rnd() * arr.length) % arr.length];

// Best reply to a probability distribution over the opponent's next gesture.
function bestReply(gs, dist, rnd) {
  let best = [], bv = -Infinity;
  for (const m of gs) {
    let v = 0;
    for (const o of gs) v += (dist[o] || 0) * outcome(m, o);
    if (v > bv + 1e-9) { bv = v; best = [m]; }
    else if (Math.abs(v - bv) <= 1e-9) best.push(m);
  }
  return randomOf(best, rnd);
}

// Predictors: each guesses the opponent's next gesture from history h (as seen by player `me`)
// and returns a list of equally likely candidates (or null when it has no opinion).
// h items are { mine, theirs, res } where res is +1 when `me` won that round.
const beatersOf = (gs, g) => gs.filter((x) => outcome(x, g) > 0);
const argmax = (c) => {
  const keys = Object.keys(c);
  if (!keys.length) return null;
  const m = Math.max(...keys.map((k) => c[k]));
  return keys.filter((k) => c[k] === m);
};
const PREDICTORS = {
  // they repeat their last gesture
  repeat: (h) => (h.length ? [h[h.length - 1].theirs] : null),
  // they copy my last gesture
  copy: (h) => (h.length ? [h[h.length - 1].mine] : null),
  // they play whatever would have beaten my last gesture
  beatMine: (h, gs) => (h.length ? beatersOf(gs, h[h.length - 1].mine) : null),
  // they play whatever would have beaten their own last gesture
  beatOwn: (h, gs) => (h.length ? beatersOf(gs, h[h.length - 1].theirs) : null),
  // they play their favourite recently
  freq: (h) => {
    if (h.length < 2) return null;
    const c = {};
    h.forEach((r, i) => { c[r.theirs] = (c[r.theirs] || 0) + Math.pow(0.85, h.length - 1 - i); });
    return argmax(c);
  },
  // after their gesture X they tend to play Y
  markov: (h) => {
    if (h.length < 3) return null;
    const last = h[h.length - 1].theirs, c = {};
    for (let i = 1; i < h.length; i++) if (h[i - 1].theirs === last) c[h[i].theirs] = (c[h[i].theirs] || 0) + i;
    return argmax(c);
  },
  // win-stay, lose-shift (to what beats the gesture that beat them)
  wsls: (h, gs) => {
    if (!h.length) return null;
    const r = h[h.length - 1];
    if (r.res < 0) return [r.theirs]; // they won: stay
    if (r.res > 0) return beatersOf(gs, r.mine);
    return null;
  },
  // they walk around the circle in a fixed step
  cycle: (h, gs) => {
    if (h.length < 2) return null;
    const a = gs.indexOf(h[h.length - 2].theirs), b = gs.indexOf(h[h.length - 1].theirs);
    const d = (b - a + gs.length) % gs.length;
    return d ? [gs[(b + d) % gs.length]] : null;
  },
};

const MEMORY = 40; // the computer only remembers the last rounds (keeps it fast and adaptive)
function historyFor(s, me) {
  return s.rounds.slice(-MEMORY).map((r) => ({ mine: r.picks[me], theirs: r.picks[1 - me], res: r.win < 0 ? 0 : r.win === me ? 1 : -1 }));
}

// Replays the history and scores each predictor by how often it would have guessed right lately.
// A random guess scores 0 on average.
function predictorScores(h, gs) {
  const score = Object.fromEntries(Object.keys(PREDICTORS).map((k) => [k, 0]));
  for (let i = 1; i < h.length; i++) {
    const past = h.slice(0, i), actual = h[i].theirs;
    for (const [k, f] of Object.entries(PREDICTORS)) {
      const c = f(past, gs);
      score[k] *= 0.8;
      if (!c || c.length >= gs.length) continue;
      score[k] += c.includes(actual) ? 1 / c.length : -1 / (gs.length - c.length);
    }
  }
  return score;
}

function aiPick(s, p, level = 'normal', rnd = Math.random) {
  const gs = gesturesOf(s.set);
  const h = historyFor(s, p);

  if (level === 'easy') {
    // a creature of habit: likes to stick with the last gesture
    const last = h.length ? h[h.length - 1].mine : null;
    if (last && rnd() < 0.5) return last;
    return randomOf(gs, rnd);
  }

  if (level === 'normal') {
    // counters the opponent's recent favourite, with a good dose of randomness
    const c = PREDICTORS.freq(h, gs);
    if (!c || rnd() < 0.35) return randomOf(gs, rnd);
    return bestReply(gs, Object.fromEntries(c.map((g) => [g, 1 / c.length])), rnd);
  }

  // hard: an ensemble of pattern detectors; trusts only the ones that have been right lately,
  // otherwise plays uniformly at random (which nobody can exploit).
  if (rnd() < 0.1 || h.length < 2) return randomOf(gs, rnd);
  const sc = predictorScores(h, gs);
  const dist = {};
  let total = 0;
  for (const [k, f] of Object.entries(PREDICTORS)) {
    if (sc[k] <= 0.6) continue;
    const c = f(h, gs);
    if (!c) continue;
    const w = sc[k] * sc[k];
    for (const g of c) dist[g] = (dist[g] || 0) + w / c.length;
    total += w;
  }
  if (!total) return randomOf(gs, rnd);
  for (const g of Object.keys(dist)) dist[g] /= total;
  return bestReply(gs, dist, rnd);
}

export const RPS = {
  ALL, CLASSIC, RULES, TARGETS, SETS,
  gesturesOf, rule, outcome, create, clone, valid, isOver, pick, aiPick, bestReply,
};
