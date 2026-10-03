// Pennywise — pure rules + AI (no DOM).
//
// Every player starts with the same purse. On your turn you put one coin on the table and may take back
// change from the table: coins of lower denomination whose total is strictly less than the coin you put in
// (classic rule). A player whose purse is empty is out; the last player holding coins wins.
//
// State: { denoms:[ascending values], rule, n, hands:[[count per denom]], pot:[count per denom],
//          turn, alive:[bool], out:[seats in order of going broke], moves, last }
// Move:  { give: denomIndex, take: [count per denom] }

// Starting purses (values in cents / units) — the classic set and the alternatives suggested for the game.
const COINAGES = {
  classic: [1, 1, 1, 1, 5, 5, 5, 10, 10, 25],
  coprimes: [1, 1, 1, 1, 4, 4, 4, 7, 7, 13],
  darlene: [1, 1, 1, 3, 3, 3, 10, 10, 20],
  nodimes: [1, 1, 1, 1, 5, 5, 5, 25],
  sugar: [1, 1, 2, 2, 5, 5, 10],
  taylor: [1, 1, 1, 5, 5, 10],
  djibouti: [1, 1, 1, 2, 2, 2, 5, 5, 10],
  chile: [1, 1, 1, 1, 5, 5, 5, 10, 10, 50],
  bhutan: [1, 1, 1, 1, 5, 5, 5, 10, 20, 25],
  azerbaijan: [1, 1, 1, 1, 3, 3, 3, 5, 5, 10],
  madagascar: [1, 1, 1, 2, 2, 2, 4, 4, 4, 5, 5, 10],
};
// classic: change worth < coin; perfect: change worth ≤ coin; more: every smaller coin on the table, no limit.
const RULES = ['classic', 'perfect', 'more'];

const sum = (a) => a.reduce((x, y) => x + y, 0);
const value = (denoms, counts) => counts.reduce((x, c, i) => x + c * denoms[i], 0);

function create({ coins = 'classic', rule = 'classic', n = 2, first = 0 } = {}) {
  const purse = COINAGES[coins] || COINAGES.classic;
  const denoms = [...new Set(purse)].sort((a, b) => a - b);
  const hand = denoms.map((d) => purse.filter((x) => x === d).length);
  return {
    denoms, rule: RULES.includes(rule) ? rule : 'classic', n,
    hands: Array.from({ length: n }, () => hand.slice()),
    pot: denoms.map(() => 0),
    turn: first % n, alive: Array(n).fill(true), out: [], moves: 0, last: null,
  };
}

const clone = (s) => ({
  ...s, hands: s.hands.map((h) => h.slice()), pot: s.pot.slice(), alive: s.alive.slice(), out: s.out.slice(),
  last: s.last && { ...s.last, take: s.last.take.slice() },
});

// Largest total the change may reach (Infinity = no limit) when giving coin `give`.
function limit(s, give) {
  const v = s.denoms[give];
  return s.rule === 'classic' ? v - 1 : s.rule === 'perfect' ? v : Infinity;
}

function legalTake(s, give, take) {
  if (!Array.isArray(take) || take.length !== s.denoms.length) return false;
  for (let j = 0; j < take.length; j++) {
    const c = take[j];
    if (!Number.isInteger(c) || c < 0 || c > s.pot[j]) return false;
    if (c > 0 && j >= give) return false;          // only coins of a lower denomination
  }
  return value(s.denoms, take) <= limit(s, give);
}

function legal(s, m) {
  if (!m || isOver(s)) return false;
  const h = s.hands[s.turn];
  return Number.isInteger(m.give) && m.give >= 0 && m.give < h.length && h[m.give] > 0 && legalTake(s, m.give, m.take);
}

// Can one more coin of denomination j be added to a change-in-progress?
function canAdd(s, give, take, j) {
  if (j >= give || take[j] >= s.pot[j]) return false;
  return value(s.denoms, take) + s.denoms[j] <= limit(s, give);
}

function apply(s, m) {
  if (!legal(s, m)) throw new Error('illegal move ' + JSON.stringify(m));
  const p = s.turn, h = s.hands[p];
  h[m.give]--;
  s.pot[m.give]++;
  for (let j = 0; j < m.take.length; j++) { h[j] += m.take[j]; s.pot[j] -= m.take[j]; }
  const broke = sum(h) === 0;
  if (broke) { s.alive[p] = false; s.out.push(p); }
  s.moves++;
  s.last = { p, give: m.give, take: m.take.slice(), broke };
  if (!isOver(s)) s.turn = nextAlive(s, p);
  return s.last;
}

function nextAlive(s, p) {
  for (let k = 1; k <= s.n; k++) { const q = (p + k) % s.n; if (s.alive[q]) return q; }
  return p;
}
const aliveCount = (s) => s.alive.filter(Boolean).length;
const isOver = (s) => aliveCount(s) <= 1;
const winner = (s) => (isOver(s) ? s.alive.indexOf(true) : -1);
const coins = (s, p) => sum(s.hands[p]);
const cents = (s, p) => value(s.denoms, s.hands[p]);

// Every change set that can't be extended by one more coin (taking more never hurts, so these are the
// only takes worth considering). Ordered by value, then coin count, descending.
function maximalTakes(s, give) {
  const k = s.denoms.length, lim = limit(s, give), out = [], take = Array(k).fill(0);
  const rec = (j, total) => {
    if (j < 0) {
      for (let i = 0; i < give; i++) if (take[i] < s.pot[i] && total + s.denoms[i] <= lim) return;
      out.push(take.slice());
      return;
    }
    if (j >= give) return rec(j - 1, total);
    const max = Math.min(s.pot[j], Math.floor((lim - total) / s.denoms[j]));
    for (let c = max; c >= 0; c--) { take[j] = c; rec(j - 1, total + c * s.denoms[j]); }
    take[j] = 0;
  };
  rec(k - 1, 0);
  out.sort((a, b) => value(s.denoms, b) - value(s.denoms, a) || sum(b) - sum(a));
  return out;
}

// Default change suggestion: as much money as possible, then as many coins as possible.
const bestTake = (s, give) => maximalTakes(s, give)[0];

function moves(s) {
  const h = s.hands[s.turn], list = [];
  for (let i = 0; i < h.length; i++) if (h[i] > 0) for (const take of maximalTakes(s, i)) list.push({ give: i, take });
  return list;
}

// ---------- AI ----------
// How long a purse can last: every coin is at least one turn; bigger coins are worth extra turns only
// when change is around. Small coins are the valuable ones.
function strength(s, p) {
  const h = s.hands[p];
  if (!s.alive[p]) return -1000;
  let v = 0;
  for (let i = 0; i < h.length; i++) v += h[i] * (1 + 0.22 * (s.denoms[i] - 1) ** 0.8);
  return v;
}

function evalFor(s, p) {
  if (isOver(s)) return winner(s) === p ? 1e6 : -1e6;
  let best = -Infinity;
  for (let q = 0; q < s.n; q++) if (q !== p && s.alive[q]) best = Math.max(best, strength(s, q));
  return strength(s, p) - best;
}

const WIN = 1e6;
function negamax(s, depth, alpha, beta, ply, ctx) {
  if (isOver(s)) return winner(s) === s.last.p ? -(WIN - ply) : WIN - ply; // value for the side that did not just move
  if (++ctx.nodes > ctx.budget) { ctx.aborted = true; return 0; }
  if (depth === 0) return evalFor(s, s.turn);
  const key = s.hands.join('|') + '/' + s.turn;
  const hit = ctx.tt.get(key);
  if (hit && hit.depth >= depth) {
    if (hit.flag === 0) return hit.val;
    if (hit.flag === 1 && hit.val >= beta) return hit.val;
    if (hit.flag === -1 && hit.val <= alpha) return hit.val;
  }
  const ms = moves(s);
  if (hit?.best) { const i = ms.findIndex((m) => mkey(m) === hit.best); if (i > 0) ms.unshift(ms.splice(i, 1)[0]); }
  const a0 = alpha;
  let best = -Infinity, bestM = ms[0];
  for (const m of ms) {
    const c = clone(s);
    apply(c, m);
    const v = -negamax(c, depth - 1, -beta, -alpha, ply + 1, ctx);
    if (ctx.aborted) return 0;
    if (v > best) { best = v; bestM = m; }
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  ctx.tt.set(key, { depth, val: best, flag: best <= a0 ? -1 : best >= beta ? 1 : 0, best: mkey(bestM) });
  return best;
}
const mkey = (m) => m.give + ':' + m.take.join(',');

// Two-player search with iterative deepening; small purses are solved outright.
function searchMove(s, { budget = 120000, maxDepth = 60 } = {}) {
  const ms = moves(s);
  if (ms.length === 1) return { move: ms[0], val: 0, solved: false };
  const ctx = { tt: new Map(), nodes: 0, budget, aborted: false };
  let bestMove = ms[0], bestVal = 0, solved = false;
  for (let d = 1; d <= maxDepth; d++) {
    let alpha = -Infinity, cur = null, curVal = -Infinity;
    const order = d > 1 ? [ms.indexOf(bestMove), ...ms.keys()].filter((v, i, a) => a.indexOf(v) === i) : [...ms.keys()];
    for (const i of order) {
      const c = clone(s);
      apply(c, ms[i]);
      const v = -negamax(c, d - 1, -Infinity, -alpha, 1, ctx);
      if (ctx.aborted) break;
      if (v > curVal) { curVal = v; cur = ms[i]; }
      if (v > alpha) alpha = v;
    }
    if (ctx.aborted) break;
    bestMove = cur; bestVal = curVal;
    if (Math.abs(curVal) > WIN / 2) { solved = true; break; }
  }
  return { move: bestMove, val: bestVal, solved };
}

const rnd = (a, r) => a[Math.floor(r() * a.length)];

// ---------- exact two-player solver ----------
// Positions of a two-player game are few enough (tens of thousands for the classic purse) to be solved
// outright; results are cached per (purse, rule) for the whole page session.
const solved = new Map();
const MAX_STATES = 400000;
function solverFor(s) {
  // Keyed by the whole coin supply, not just the denominations: purses like Sugar and Djibouti share
  // denominations but not counts, and a position key (hands + turn) only pins down the table for one supply.
  const supply = s.denoms.map((d, i) => d + 'x' + (s.pot[i] + s.hands.reduce((a, h) => a + h[i], 0)));
  const k = supply.join(',') + '/' + s.rule + '/' + s.n;
  if (!solved.has(k)) solved.set(k, new Map());
  return solved.get(k);
}
// Does the side to move win? Returns null if the cache would grow past the limit.
function wins(s, memo, ctx) {
  const key = s.hands.join('|') + '/' + s.turn;
  const m = memo.get(key);
  if (m !== undefined) return m;
  if (memo.size >= ctx.max) { ctx.aborted = true; return null; }
  let r = false;
  for (const mv of moves(s)) {
    const c = clone(s);
    apply(c, mv);
    const w = isOver(c) ? winner(c) === s.turn : wins(c, memo, ctx);
    if (ctx.aborted) return null;
    if (isOver(c) ? w : !w) { r = true; break; }
  }
  memo.set(key, r);
  return r;
}
function solveMoves(s, max = MAX_STATES) {
  const memo = solverFor(s), ctx = { max, aborted: false }, out = [];
  for (const move of moves(s)) {
    const after = clone(s);
    apply(after, move);
    if (isOver(after)) { out.push({ move, after, win: winner(after) === s.turn, replies: 0, good: 0 }); continue; }
    const theyWin = wins(after, memo, ctx);
    if (ctx.aborted) return null;
    let replies = 0, good = 0;
    if (theyWin) for (const r of moves(after)) {
      const c = clone(after);
      apply(c, r);
      replies++;
      const w = isOver(c) ? winner(c) === after.turn : !wins(c, memo, ctx);
      if (ctx.aborted) return null;
      if (w) good++;
    }
    out.push({ move, after, win: !theyWin, replies, good });
  }
  return out;
}
// Exact outcome for the side to move in a two-player position (null if too big to solve).
function solve(s, max = MAX_STATES) {
  const ctx = { max, aborted: false };
  const r = wins(s, solverFor(s), ctx);
  return ctx.aborted ? null : r;
}

function aiMove(s, level = 'normal', { random = Math.random, budget } = {}) {
  const ms = moves(s);
  if (!ms.length) return null;
  const me = s.turn;
  if (level === 'easy') {
    // Grabs a random coin from the purse, usually takes the most change on offer.
    const gives = [...new Set(ms.map((m) => m.give))];
    const g = rnd(gives, random);
    const opts = ms.filter((m) => m.give === g);
    return random() < 0.75 ? opts[0] : rnd(opts, random);
  }
  if (level === 'hard' && aliveCount(s) === 2) {
    const verdicts = solveMoves(s, budget);
    if (verdicts) {
      const wins = verdicts.filter((v) => v.win);
      if (wins.length) return rnd(wins, random).move;
      // Lost against perfect play: pick the move that leaves the opponent the fewest winning answers,
      // so a human has to find them; ties go to the healthier purse.
      let best = null, bv = Infinity;
      for (const v of verdicts) {
        const score = v.replies ? v.good / v.replies : 1;
        const tie = -evalFor(v.after, me) * 1e-4 + random() * 1e-6;
        if (score + tie < bv) { bv = score + tie; best = v.move; }
      }
      return best;
    }
    return searchMove(s, { budget: 150000 }).move;
  }
  if (level === 'normal' && aliveCount(s) === 2) {
    // shallow lookahead: my move, then the opponent's best reply
    let best = null, bv = -Infinity;
    for (const m of ms) {
      const c = clone(s);
      apply(c, m);
      const v = paranoid(c, 1, me) + random() * 0.01;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  // Three or more players: greedy on purse strength. (Deeper "everyone against me" searches measured
  // clearly weaker here, so 'hard' plays the same way until only two players are left.)
  let best = null, bv = -Infinity;
  for (const m of ms) {
    const c = clone(s);
    apply(c, m);
    const v = evalFor(c, me) + random() * 0.01;
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}

function paranoid(s, depth, me) {
  if (isOver(s) || depth === 0) return evalFor(s, me);
  const ms = moves(s);
  let best = s.turn === me ? -Infinity : Infinity;
  for (const m of ms) {
    const c = clone(s);
    apply(c, m);
    const v = paranoid(c, depth - 1, me);
    best = s.turn === me ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

export const PW = {
  COINAGES, RULES, create, clone, limit, legalTake, legal, canAdd, apply, isOver, winner, nextAlive, aliveCount,
  coins, cents, value: (s, counts) => value(s.denoms, counts), maximalTakes, bestTake, moves, aiMove, searchMove, solve, solveMoves, strength,
};
