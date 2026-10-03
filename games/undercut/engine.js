// Undercut — pure rules + computer players (no DOM).
//
// Each round both players secretly pick a number 1..5, then reveal.
// You score your number — unless it is exactly 1 more than the opponent's:
// then you were undercut and the opponent scores both numbers.
// The first player to lead by `target` points wins.
//
// Flaunt variant: repeating the same number k rounds in a row makes it worth n^k.

const NUMS = [1, 2, 3, 4, 5];
// Equilibrium mix for the classic game (out of 66): every pure reply breaks even against it.
const NASH = [10, 26, 13, 16, 1].map((x) => x / 66);
const TARGETS = { classic: [7, 11, 21], flaunt: [50, 100, 500] };
const DEFAULT_TARGET = { classic: 11, flaunt: 100 };

function create({ target = 11, flaunt = false } = {}) {
  return { target, flaunt, score: [0, 0], rounds: [], pending: [null, null], winner: -1 };
}

const clone = (s) => JSON.parse(JSON.stringify(s));
const isOver = (s) => s.winner >= 0;
const valid = (v) => Number.isInteger(v) && v >= 1 && v <= 5;

// How many times in a row player p will have played v if they play it now.
function streak(s, p, v) {
  let k = 1;
  for (let i = s.rounds.length - 1; i >= 0 && s.rounds[i].picks[p] === v; i--) k++;
  return k;
}
const worth = (s, p, v) => (s.flaunt ? v ** streak(s, p, v) : v);

// Outcome of picks a (player 0) and b (player 1) given current state (streaks matter in Flaunt).
// cut: player who undercut the other (-1 if nobody).
function outcome(s, a, b) {
  const va = worth(s, 0, a), vb = worth(s, 1, b);
  if (a === b + 1) return { vals: [va, vb], pts: [0, va + vb], cut: 1 };
  if (b === a + 1) return { vals: [va, vb], pts: [va + vb, 0], cut: 0 };
  return { vals: [va, vb], pts: [va, vb], cut: -1 };
}

// Lock in player p's pick. Returns the finished round when both picks are in, else null.
function pick(s, p, v) {
  if (isOver(s) || !valid(v) || s.pending[p] !== null) return null;
  s.pending[p] = v;
  if (s.pending[0] === null || s.pending[1] === null) return null;
  const picks = [s.pending[0], s.pending[1]];
  const o = outcome(s, picks[0], picks[1]);
  const round = { picks, vals: o.vals, pts: o.pts, cut: o.cut };
  s.rounds.push(round);
  s.score[0] += o.pts[0];
  s.score[1] += o.pts[1];
  s.pending = [null, null];
  const d = s.score[0] - s.score[1];
  if (Math.abs(d) >= s.target) s.winner = d > 0 ? 0 : 1;
  return round;
}

// Net gain for the player picking `me` (worth vm) against `op` (worth vo).
function net(me, op, vm, vo) {
  if (me === op + 1) return -(vm + vo);
  if (op === me + 1) return vm + vo;
  return vm - vo;
}

function sample(w, rnd) {
  const tot = w.reduce((a, b) => a + b, 0);
  let x = rnd() * tot;
  for (let i = 0; i < w.length; i++) if ((x -= w[i]) < 0) return i + 1;
  return w.length;
}

// ---------- pattern sniffer (hard AI) ----------
// Several tiny predictors guess the opponent's next number; each is weighted by how well it did so far.
function predictors(rs, me) {
  const op = 1 - me, n = rs.length;
  const models = [
    () => [], // overall frequency (recent rounds weigh more)
    (i) => [rs[i - 1].picks[op]], // after their own last number
    (i) => [rs[i - 1].picks[me]], // in reply to my last number
    (i) => [rs[i - 1].picks[op], rs[i - 2]?.picks[op]], // after their last two numbers
    (i) => [rs[i - 1].picks[op], rs[i - 1].picks[me]], // after the last pair
    (i) => [rs[i - 1].cut], // after who undercut whom
  ];
  const minI = [0, 1, 1, 2, 1, 1];
  return models.map((ctx, m) => {
    const table = new Map();
    let score = 0;
    const dist = (key) => {
      const c = table.get(key) || [0, 0, 0, 0, 0];
      return c.map((x) => x + 0.4);
    };
    for (let i = minI[m]; i < n; i++) {
      const key = ctx(i).join(',');
      const d = dist(key), tot = d.reduce((a, b) => a + b, 0);
      const actual = rs[i].picks[op];
      score = score * 0.92 + Math.log((d[actual - 1] / tot) * 5); // > 0 when better than a blind guess
      const c = table.get(key) || [0, 0, 0, 0, 0];
      for (let k = 0; k < 5; k++) c[k] *= 0.94;
      c[actual - 1] += 1;
      table.set(key, c);
    }
    const d = n >= minI[m] && n > 0 ? dist(ctx(n).join(',')) : [1, 1, 1, 1, 1];
    const tot = d.reduce((a, b) => a + b, 0);
    return { p: d.map((x) => x / tot), score };
  });
}

function predict(s, me) {
  const ms = predictors(s.rounds, me);
  const best = Math.max(...ms.map((m) => m.score));
  const ws = ms.map((m) => Math.exp(2 * (m.score - best)));
  const W = ws.reduce((a, b) => a + b, 0);
  const p = [0, 0, 0, 0, 0];
  ms.forEach((m, i) => m.p.forEach((x, k) => (p[k] += (x * ws[i]) / W)));
  return p;
}

// Expected net gain of each of my numbers against a predicted distribution of theirs.
function expected(s, me, p) {
  const op = 1 - me;
  return NUMS.map((a) => NUMS.reduce((acc, b) => acc + p[b - 1] * net(a, b, worth(s, me, a), worth(s, op, b)), 0));
}

// Computer pick for player `me`. Uses only revealed rounds — never the opponent's pending pick.
function aiPick(s, me, level = 'normal', rnd = Math.random) {
  if (level === 'easy') {
    // A "naive human": likes big numbers and tends to repeat itself.
    const last = s.rounds.length ? s.rounds[s.rounds.length - 1].picks[me] : 0;
    if (last && rnd() < 0.3) return last;
    return sample([1, 2, 3, 4, 4], rnd);
  }
  const n = s.rounds.length;
  if (level === 'normal' || n < (s.flaunt ? 1 : 3)) return sample(NASH, rnd);
  // hard: best-respond to the predicted distribution when that clearly pays, otherwise hide behind
  // the equilibrium mix. (The 1-in-66 mix is only an equilibrium for classic scoring.)
  let p = predict(s, me);
  if (s.flaunt) {
    // In Flaunt a repeated number snowballs, so always reckon with the opponent repeating.
    const last = s.rounds[n - 1].picks[1 - me];
    p = p.map((x, k) => 0.7 * x + (k === last - 1 ? 0.3 : 0));
  }
  const ev = expected(s, me, p);
  const bestEv = Math.max(...ev);
  if (!s.flaunt && (bestEv < 0.3 || rnd() < 0.1)) return sample(NASH, rnd);
  // pick among near-best replies to stay a little unpredictable
  const slack = s.flaunt ? Math.max(0.25, bestEv * 0.05) : 0.25;
  const near = ev.map((x) => (x >= bestEv - slack ? Math.exp((0.75 * (x - bestEv)) / slack) : 0));
  return sample(near, rnd);
}

export const UC = {
  NUMS, NASH, TARGETS, DEFAULT_TARGET,
  create, clone, isOver, valid, streak, worth, outcome, pick, net, aiPick, predict, expected,
};
