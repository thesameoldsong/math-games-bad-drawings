// Arpeggios — pure rules + AI (no DOM).
//
// Two players race to write 10 two-digit numbers made from a pair of dice (digits 1–6, either order).
// One player's list must go up, the other's down; each may break the pattern exactly once.
// A roller may use the dice or pass; passed dice may be stolen (counts as the stealer's turn) or declined
// (then the decliner rolls). Doubles allow one reroll of one die. Repeats are never allowed.
//
// State (plain JSON, safe to send over the network):
//   dirs [d0, d1]       +1 ascending, -1 descending
//   lists [[..], [..]]  written numbers
//   breakAt [i, i]      index in the list where the pattern was broken (-1 = break still unused)
//   phase               'roll' | 'decide' | 'steal' | 'over'
//   turn                who acts now
//   roller              who rolled the current dice
//   dice [a, b] | null, rerolled (bool)
//   winner              -1 none yet, 0/1, 2 = tie
//   end                 '' | 'ten' | 'stuck'
//   n                   number of actions applied (move counter for online play)

const GOAL = 10;
const H = 80; // horizon (own turns) for the AI's finishing-time tables

const digits = (n) => [Math.floor(n / 10), n % 10];
const isNum = (n) => Number.isInteger(n) && n >= 11 && n <= 66 && n % 10 >= 1 && n % 10 <= 6;
// Position of a number on the 36-step "runway" in a player's own direction.
const rank = (n, dir) => { const [a, b] = digits(n); const i = (a - 1) * 6 + (b - 1); return dir > 0 ? i : 35 - i; };

function create({ asc = 0 } = {}) {
  const dirs = asc === 0 ? [1, -1] : [-1, 1];
  return {
    dirs, lists: [[], []], breakAt: [-1, -1],
    phase: 'roll', turn: asc, roller: asc, dice: null, rerolled: false,
    winner: -1, end: '', n: 0,
  };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

const broke = (s, p) => s.breakAt[p] >= 0;
const last = (s, p) => s.lists[p][s.lists[p].length - 1];

// 0 = not allowed, 1 = follows the pattern, 2 = needs the (unused) break.
function kind(s, p, n) {
  const L = s.lists[p];
  if (!L.length) return 1;
  const l = L[L.length - 1];
  if (n === l) return 0;
  if ((n - l) * s.dirs[p] > 0) return 1;
  return broke(s, p) ? 0 : 2;
}

// Runway position (-1 before the first number; 0..35 first lap, 36..71 after the break).
function pos(s, p) {
  if (!s.lists[p].length) return -1;
  return (broke(s, p) ? 36 : 0) + rank(last(s, p), s.dirs[p]);
}
function step(pos0, r) {
  if (pos0 < 0) return r;
  const lap = pos0 >= 36 ? 1 : 0, c = pos0 % 36;
  if (r > c) return lap * 36 + r;
  if (r < c && !lap) return 36 + r;
  return -1;
}
// How much runway writing n would use up (-1 = illegal).
function cost(s, p, n) {
  const a = pos(s, p), b = step(a, rank(n, s.dirs[p]));
  return b < 0 ? -1 : b - a;
}

const numbersOf = (dice) => (dice ? [...new Set([dice[0] * 10 + dice[1], dice[1] * 10 + dice[0]])] : []);
const options = (s, p) => numbersOf(s.dice).filter((n) => kind(s, p, n));
const isDouble = (s) => !!s.dice && s.dice[0] === s.dice[1];
const canReroll = (s) => s.phase === 'decide' && isDouble(s) && !s.rerolled;
// A player is stuck when no number at all can ever be written again.
const stuck = (s, p) => {
  const l = last(s, p);
  return broke(s, p) && l === (s.dirs[p] > 0 ? 66 : 11);
};

function legal(s) {
  const out = [];
  if (s.phase === 'roll') out.push({ t: 'roll' });
  if (s.phase === 'decide') {
    for (const n of options(s, s.turn)) out.push({ t: 'place', n });
    if (canReroll(s)) out.push({ t: 'reroll' });
    out.push({ t: 'pass' });
  }
  if (s.phase === 'steal') {
    for (const n of options(s, s.turn)) out.push({ t: 'place', n });
    out.push({ t: 'decline' });
  }
  return out;
}

const die = (rnd = Math.random) => 1 + Math.floor(rnd() * 6);

// Applies an action in place. Dice values travel inside the action ({t:'roll', d:[a,b]}, {t:'reroll', v})
// so every device replays exactly the same game. Returns true if the action was legal.
function apply(s, a) {
  const ok = (v) => Number.isInteger(v) && v >= 1 && v <= 6;
  switch (a.t) {
    case 'roll':
      if (s.phase !== 'roll' || !a.d || !ok(a.d[0]) || !ok(a.d[1])) return false;
      s.dice = [a.d[0], a.d[1]]; s.roller = s.turn; s.rerolled = false; s.phase = 'decide';
      break;
    case 'reroll':
      if (!canReroll(s) || !ok(a.v)) return false;
      s.dice = [s.dice[0], a.v]; s.rerolled = true;
      break;
    case 'pass':
      if (s.phase !== 'decide') return false;
      s.phase = 'steal'; s.turn = 1 - s.roller;
      break;
    case 'decline':
      if (s.phase !== 'steal') return false;
      s.phase = 'roll'; s.dice = null; s.rerolled = false;
      break;
    case 'place': {
      if (s.phase !== 'decide' && s.phase !== 'steal') return false;
      if (!isNum(a.n) || !numbersOf(s.dice).includes(a.n)) return false;
      const p = s.turn, k = kind(s, p, a.n);
      if (!k) return false;
      if (k === 2) s.breakAt[p] = s.lists[p].length;
      s.lists[p].push(a.n);
      s.dice = null; s.rerolled = false;
      s.turn = 1 - p; s.phase = 'roll';
      if (s.lists[p].length >= GOAL) { s.phase = 'over'; s.winner = p; s.end = 'ten'; }
      else if (stuck(s, 0) && stuck(s, 1)) {
        const [x, y] = [s.lists[0].length, s.lists[1].length];
        s.phase = 'over'; s.winner = x === y ? 2 : x > y ? 0 : 1; s.end = 'stuck';
      }
      break;
    }
    default: return false;
  }
  s.n++;
  return true;
}
const isOver = (s) => s.phase === 'over';

// ---------- AI ----------
// Table F[h][k*73 + pos+1] = chance that a lone player with k numbers at runway position pos
// writes all 10 within h of their own turns, playing optimally for that goal. The dice are symmetric,
// so one table serves both directions.
let F = null;
function tables() {
  if (F) return F;
  const W = 73;
  F = [new Float64Array(GOAL * W)];
  for (let h = 1; h <= H; h++) {
    const prev = F[h - 1], cur = new Float64Array(GOAL * W);
    const val = (k, p) => (k >= GOAL ? 1 : prev[k * W + p + 1]);
    for (let k = 0; k < GOAL; k++) {
      for (let p = -1; p < 72; p++) {
        const skip = val(k, p);
        const best = (a, b) => {
          let v = skip;
          for (const r of [(a - 1) * 6 + b - 1, (b - 1) * 6 + a - 1]) {
            const q = step(p, r);
            if (q >= 0) v = Math.max(v, val(k + 1, q));
          }
          return v;
        };
        let e = 0;
        for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
          let v = best(a, b);
          if (a === b) {
            let rr = 0;
            for (let r = 1; r <= 6; r++) rr += best(a, r);
            v = Math.max(v, rr / 6);
          }
          e += v;
        }
        cur[k * W + p + 1] = e / 36;
      }
    }
    F.push(cur);
  }
  return F;
}
// Cumulative finishing curve G[t] (t = 0..H) for a player given (count, position).
function curve(k, p) {
  const T = tables(), G = new Float64Array(H + 1);
  if (k >= GOAL) { G.fill(1); return G; }
  for (let t = 0; t <= H; t++) G[t] = T[t][k * 73 + p + 1];
  return G;
}
// Race score for A (to move) against B: P(A finishes first) − P(B finishes first), turns alternating.
function race(Ga, Gb) {
  if (Ga[0] === 1) return 1;
  if (Gb[0] === 1) return -1;
  let pa = 0, pb = 0;
  for (let t = 1; t <= H; t++) {
    pa += (Ga[t] - Ga[t - 1]) * (1 - Gb[t - 1]);
    pb += (Gb[t] - Gb[t - 1]) * (1 - Ga[t]);
  }
  return pa - pb;
}
const curveOf = (s, p, extra) => {
  if (extra === undefined) return curve(s.lists[p].length, pos(s, p));
  const q = step(pos(s, p), rank(extra, s.dirs[p]));
  return curve(s.lists[p].length + 1, q);
};

// Value (for player p) of each choice when p holds dice `dice` as the roller.
function rollerValue(s, p, dice, allowReroll) {
  const o = 1 - p, Gp = curveOf(s, p), Go = curveOf(s, o);
  const nums = numbersOf(dice).filter((n) => kind(s, p, n));
  const choices = [];
  for (const n of nums) choices.push({ a: { t: 'place', n }, v: -race(Go, curveOf(s, p, n)) + 1e-4 });
  // pass: the opponent picks the better of stealing or rolling themselves
  let opp = race(Go, Gp);
  for (const n of numbersOf(dice).filter((m) => kind(s, o, m))) opp = Math.max(opp, -race(Gp, curveOf(s, o, n)));
  choices.push({ a: { t: 'pass' }, v: -opp });
  if (allowReroll) {
    let e = 0;
    for (let r = 1; r <= 6; r++) e += Math.max(...rollerValue(s, p, [dice[0], r], false).map((c) => c.v));
    choices.push({ a: { t: 'reroll' }, v: e / 6 });
  }
  return choices;
}
function stealerValue(s, p) {
  const o = 1 - p, Gp = curveOf(s, p), Go = curveOf(s, o);
  const choices = [{ a: { t: 'decline' }, v: race(Gp, Go) }];
  for (const n of options(s, p)) choices.push({ a: { t: 'place', n }, v: -race(Go, curveOf(s, p, n)) + 1e-4 });
  return choices;
}

// Evaluated choices for the player to move (used by the AI and for hints/reactions).
function evaluate(s) {
  if (s.phase === 'decide') return rollerValue(s, s.turn, s.dice, canReroll(s));
  if (s.phase === 'steal') return stealerValue(s, s.turn);
  return [];
}

// Returns a complete action (with dice values where needed).
function aiMove(s, level = 'normal', rnd = Math.random) {
  const p = s.turn;
  if (s.phase === 'roll') return { t: 'roll', d: [die(rnd), die(rnd)] };
  let a;
  if (level === 'easy') {
    // Grabs any number that doesn't waste much runway; otherwise passes / rolls. Never thinks about the opponent.
    const opts = options(s, p).map((n) => ({ n, c: cost(s, p, n) })).sort((x, y) => x.c - y.c);
    const limit = s.phase === 'steal' ? 6 : 11;
    if (s.phase === 'decide' && canReroll(s) && rnd() < 0.4) a = { t: 'reroll' };
    else if (opts.length && (opts[0].c <= limit || rnd() < 0.15)) a = { t: 'place', n: (rnd() < 0.2 ? opts[opts.length - 1] : opts[0]).n };
    else a = { t: s.phase === 'steal' ? 'decline' : 'pass' };
  } else {
    const ch = evaluate(s);
    a = ch.reduce((x, y) => (y.v > x.v ? y : x)).a;
  }
  if (a.t === 'reroll') return { t: 'reroll', v: die(rnd) };
  return a;
}

export const ARP = {
  GOAL, create, clone, apply, legal, isOver, kind, cost, pos, rank, step, numbersOf, options,
  isDouble, canReroll, stuck, broke, evaluate, aiMove, die, race, curve,
};
