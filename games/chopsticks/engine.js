// Chopsticks — pure rules + AI (no DOM).
//
// State: { n, hands: [[l, r], ...], turn, rules: {cutoff, start}, moves, seen, rep, winner, last }
//   hands[p] = fingers on player p's left / right hand, 0..4 (0 = "out", a closed fist).
//   winner: null while playing, player index, or -1 for a draw (same position for the third time).
// Moves: { t: 'tap', h, p, to }  — my hand h taps player p's hand `to`
//        { t: 'split', to: [l, r] } — redistribute my fingers (same total, must change the position).

const FULL = 5;

const sorted = ([a, b]) => (a <= b ? [a, b] : [b, a]);
const sameSet = (x, y) => { const [a, b] = sorted(x), [c, d] = sorted(y); return a === c && b === d; };
const live = (pair) => pair[0] > 0 || pair[1] > 0;

function create({ players = 2, cutoff = false, start = 1, first = 0 } = {}) {
  const s = {
    n: players,
    hands: Array.from({ length: players }, () => [start, start]),
    turn: first % players,
    rules: { cutoff: !!cutoff, start },
    moves: 0,
    seen: {},
    rep: 1,
    winner: null,
    last: null,
  };
  s.seen[key(s)] = 1;
  return s;
}

const clone = (s) => ({
  ...s,
  hands: s.hands.map((h) => h.slice()),
  rules: { ...s.rules },
  seen: { ...s.seen },
  last: s.last && JSON.parse(JSON.stringify(s.last)),
});

// Position key for repetition: hands as unordered pairs (left/right order doesn't matter) + who moves.
function key(s) {
  return s.hands.map((h) => sorted(h).join('')).join('.') + '/' + s.turn;
}

// Fingers after a hand with `b` is tapped by a hand with `a`.
function tapValue(a, b, cutoff) {
  const v = a + b;
  if (v === FULL) return 0;
  if (v > FULL) return cutoff ? 0 : v - FULL;
  return v;
}

const alive = (s, p) => live(s.hands[p]);

function splitsOf(pair) {
  const total = pair[0] + pair[1], out = [];
  for (let l = 0; l < FULL; l++) {
    const r = total - l;
    if (r < 0 || r >= FULL) continue;
    if (sameSet([l, r], pair)) continue;
    out.push([l, r]);
  }
  return out;
}

function moves(s) {
  if (s.winner !== null) return [];
  const me = s.turn, mine = s.hands[me], out = [];
  for (let h = 0; h < 2; h++) {
    if (!mine[h]) continue;
    for (let p = 0; p < s.n; p++) {
      if (p === me || !alive(s, p)) continue;
      for (let to = 0; to < 2; to++) if (s.hands[p][to]) out.push({ t: 'tap', h, p, to });
    }
  }
  for (const to of splitsOf(mine)) out.push({ t: 'split', to });
  return out;
}

function isLegal(s, m) {
  return moves(s).some((x) => sameMove(x, m));
}
function sameMove(a, b) {
  if (!a || !b || a.t !== b.t) return false;
  if (a.t === 'tap') return a.h === b.h && a.p === b.p && a.to === b.to;
  return a.to[0] === b.to[0] && a.to[1] === b.to[1];
}

function nextAlive(s, from) {
  for (let i = 1; i <= s.n; i++) {
    const p = (from + i) % s.n;
    if (alive(s, p)) return p;
  }
  return from;
}

// Applies a legal move in place. Returns what happened (for reactions/animation):
// { add: fingers that tapped, knocked: a hand went out, eliminated: player index or -1, revived: a split brought back a fist }.
function apply(s, m) {
  const me = s.turn;
  const info = { add: 0, knocked: false, eliminated: -1, revived: false };
  if (m.t === 'tap') {
    const a = s.hands[me][m.h];
    const v = tapValue(a, s.hands[m.p][m.to], s.rules.cutoff);
    s.hands[m.p][m.to] = v;
    Object.assign(info, { add: a, knocked: v === 0 });
    if (!alive(s, m.p)) info.eliminated = m.p;
  } else {
    const old = s.hands[me];
    info.revived = (old[0] === 0 || old[1] === 0) && m.to[0] > 0 && m.to[1] > 0;
    s.hands[me] = m.to.slice();
  }
  s.moves++;
  s.last = { ...m, by: me, to: Array.isArray(m.to) ? m.to.slice() : m.to };
  const left = [];
  for (let p = 0; p < s.n; p++) if (alive(s, p)) left.push(p);
  if (left.length === 1) { s.winner = left[0]; return info; }
  s.turn = nextAlive(s, me);
  const k = key(s);
  s.rep = s.seen[k] = (s.seen[k] || 0) + 1;
  if (s.rep >= 3) s.winner = -1;
  return info;
}

const isOver = (s) => s.winner !== null;

// ---------- exact solution for two players (retrograde analysis) ----------
// A position is (mover's pair, opponent's pair), both unordered and alive: 14 × 14 = 196 positions.
// Value for the player to move: 1 win, -1 loss, 0 draw (perfect play loops forever); dist = plies to the end.
const PAIRS = [];
for (let a = 0; a < FULL; a++) for (let b = a; b < FULL; b++) if (a || b) PAIRS.push([a, b]);
const PI = {};
PAIRS.forEach(([a, b], i) => (PI[a * 10 + b] = i));
const pidx = (pair) => { const [a, b] = sorted(pair); return PI[a * 10 + b]; };

// Children of (me, opp) as [newMe', newOpp'] from the next mover's view; null = opponent eliminated.
function children2(me, opp, cutoff) {
  const out = [];
  for (const a of new Set(me)) {
    if (!a) continue;
    for (const c of new Set(opp)) {
      if (!c) continue;
      const o = opp.slice();
      o[o.indexOf(c)] = tapValue(a, c, cutoff);
      out.push(live(o) ? [o, me] : null);
    }
  }
  const seenSplit = new Set();
  for (const sp of splitsOf(me)) {
    const k = sorted(sp).join('');
    if (seenSplit.has(k)) continue;
    seenSplit.add(k);
    out.push([opp, sp]);
  }
  return out;
}

const tables = {};
function solve(cutoff = false) {
  const tk = cutoff ? 'c' : 'w';
  if (tables[tk]) return tables[tk];
  const N = PAIRS.length;
  const val = new Int8Array(N * N), dist = new Int16Array(N * N);
  const kids = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    kids[i * N + j] = children2(PAIRS[i], PAIRS[j], cutoff).map((c) => (c ? pidx(c[0]) * N + pidx(c[1]) : -1));
  }
  for (let level = 1; ; level++) {
    const snapV = val.slice();
    let changed = false;
    for (let x = 0; x < N * N; x++) {
      if (snapV[x]) continue;
      let win = false, allWin = true;
      for (const c of kids[x]) {
        if (c < 0 || snapV[c] === -1) { win = true; break; }
        if (snapV[c] !== 1) allWin = false;
      }
      if (win) { val[x] = 1; dist[x] = level; changed = true; }
      else if (allWin) { val[x] = -1; dist[x] = level; changed = true; }
    }
    if (!changed) break;
  }
  tables[tk] = { val, dist, N };
  return tables[tk];
}

// Exact value for the player to move (two-player games only).
function evaluate(s) {
  if (s.n !== 2) return null;
  const me = s.turn, opp = 1 - me;
  if (!alive(s, me) || !alive(s, opp)) return null;
  const T = solve(s.rules.cutoff);
  const x = pidx(s.hands[me]) * T.N + pidx(s.hands[opp]);
  return { v: T.val[x], d: T.dist[x] };
}

// ---------- AI ----------
const liveCount = (pair) => (pair[0] > 0) + (pair[1] > 0);

// Static evaluation for the player to move (two players).
function heuristic(s) {
  const me = s.turn, opp = 1 - me;
  const mine = s.hands[me], theirs = s.hands[opp];
  let h = (liveCount(mine) - liveCount(theirs)) * 10;
  // threats: hands I can knock out right now vs. hands they could knock out next
  for (const a of mine) if (a) for (const c of theirs) if (c && tapValue(a, c, s.rules.cutoff) === 0) h += 3;
  for (const c of theirs) if (c) for (const a of mine) if (a && tapValue(c, a, s.rules.cutoff) === 0) h -= 2;
  return h;
}

function negamax(s, depth) {
  if (s.winner !== null) return s.winner === -1 ? 0 : s.winner === s.turn ? 1000 + depth : -1000 - depth;
  if (depth === 0) return heuristic(s);
  let best = -Infinity;
  for (const m of moves(s)) {
    const c = clone(c0(s));
    applyQuiet(c, m);
    const v = c.winner !== null && c.winner !== -1 ? 1000 + depth : -negamax(c, depth - 1);
    if (v > best) best = v;
  }
  return best;
}
// Search copies skip the repetition bookkeeping (cheap and keeps the tree finite).
const c0 = (s) => ({ ...s, seen: {} });
function applyQuiet(s, m) {
  const me = s.turn;
  if (m.t === 'tap') s.hands[m.p][m.to] = tapValue(s.hands[me][m.h], s.hands[m.p][m.to], s.rules.cutoff);
  else s.hands[me] = m.to.slice();
  if (!alive(s, 1 - me)) { s.winner = me; return; }
  s.turn = 1 - me;
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

// Result of a move as an exact value for the mover (needs a 2-player state).
function moveValue(s, m) {
  const c = clone(c0(s));
  applyQuiet(c, m);
  if (c.winner === s.turn) return { v: 1, d: 0 };
  const e = evaluate(c);
  return { v: -e.v, d: e.d };
}

function aiMove(s, level = 'normal', rnd = Math.random) {
  const all = moves(s);
  if (!all.length) return null;
  if (s.n !== 2) return aiMulti(s, all, level, rnd);
  const me = s.turn;
  const winsNow = all.filter((m) => m.t === 'tap' && liveCount(s.hands[m.p]) === 1 && tapValue(s.hands[me][m.h], s.hands[m.p][m.to], s.rules.cutoff) === 0);

  if (level === 'easy') {
    if (winsNow.length && rnd() < 0.8) return pick(winsNow, rnd);
    // usually (not always) avoid handing the opponent an instant win
    const safe = all.filter((m) => {
      const c = clone(c0(s)); applyQuiet(c, m);
      return !moves(c).some((r) => { const d = clone(c0(c)); applyQuiet(d, r); return d.winner === c.turn; });
    });
    return pick(safe.length && rnd() < 0.6 ? safe : all, rnd);
  }

  if (level === 'hard') {
    const scored = all.map((m) => ({ m, ...moveValue(s, m) }));
    const wins = scored.filter((x) => x.v === 1);
    if (wins.length) { const d = Math.min(...wins.map((x) => x.d)); return pick(wins.filter((x) => x.d === d), rnd).m; }
    const draws = scored.filter((x) => x.v === 0);
    if (draws.length) {
      // keep the draw, but prefer positions where the opponent has the most ways to go wrong
      const traps = draws.map((x) => {
        const c = clone(c0(s)); applyQuiet(c, x.m);
        const replies = moves(c);
        const bad = replies.filter((r) => moveValue(c, r).v === -1).length;
        return { ...x, trap: bad / replies.length - (repeats(s, x.m) ? 0.5 : 0) };
      });
      const best = Math.max(...traps.map((x) => x.trap));
      return pick(traps.filter((x) => x.trap >= best - 1e-9), rnd).m;
    }
    // lost anyway: drag it out as long as possible
    const d = Math.max(...scored.map((x) => x.d));
    return pick(scored.filter((x) => x.d === d), rnd).m;
  }

  // normal: a few plies of lookahead with a simple evaluation
  if (winsNow.length) return pick(winsNow, rnd);
  let best = -Infinity, bestMoves = [];
  for (const m of all) {
    const c = clone(c0(s));
    applyQuiet(c, m);
    let v = -negamax(c, 3);
    if (repeats(s, m)) v -= 4; // mild dislike of going round in circles
    if (v > best + 1e-9) { best = v; bestMoves = [m]; }
    else if (Math.abs(v - best) < 1e-9) bestMoves.push(m);
  }
  return pick(bestMoves, rnd);
}

// 3+ players: one-ply greedy. Win > eliminate someone > knock out a hand > stay out of reach.
// ('easy' plays a random move 40% of the time.)
function aiMulti(s, all, level, rnd) {
  if (level === 'easy' && rnd() < 0.4) return pick(all, rnd);
  const me = s.turn;
  let best = -Infinity, bestMoves = [];
  for (const m of all) {
    const c = clone(s);
    const info = apply(c, m);
    let v = 0;
    if (c.winner === me) v += 1000;
    else if (c.winner === -1) v -= 5;
    if (info.eliminated >= 0) v += 60;
    else if (info.knocked) v += 20;
    if (info.revived) v += 6;
    // how many of my live hands could some opponent knock out on their turn
    for (const a of c.hands[me]) {
      if (!a) continue;
      let hit = false;
      for (let p = 0; p < c.n && !hit; p++) {
        if (p === me || !alive(c, p)) continue;
        for (const b of c.hands[p]) if (b && tapValue(b, a, c.rules.cutoff) === 0) hit = true;
      }
      if (hit) v -= liveCount(c.hands[me]) === 1 ? 30 : 9;
    }
    if (s.seen[key(c)]) v -= 3;
    if (v > best + 1e-9) { best = v; bestMoves = [m]; }
    else if (Math.abs(v - best) < 1e-9) bestMoves.push(m);
  }
  return pick(bestMoves, rnd);
}

// Would this move bring back a position that already happened?
function repeats(s, m) {
  const c = clone(c0(s));
  applyQuiet(c, m);
  return !!s.seen[key(c)];
}

export const CS = {
  FULL, create, clone, key, moves, isLegal, sameMove, apply, isOver, alive, tapValue, splitsOf,
  sorted, solve, evaluate, moveValue, aiMove, heuristic, PAIRS,
};
