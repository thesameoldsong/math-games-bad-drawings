// Crossed: pure game logic + AI. No DOM.
//
// n dots sit on each side of a square (no dots in the corners), 4n dots in total, numbered clockwise
// around the perimeter starting at the top-left: top side 0..n-1, right side n..2n-1, bottom 2n..3n-1,
// left 3n..4n-1. A move joins two unused dots that lie on different sides. Because every dot is on
// the boundary of a convex shape, two chords cross exactly when their endpoints interleave around it.
// Drawing a line scores 1 per opponent line it crosses and 2 per own line it crosses.

function create(n = 4, first = 0) {
  return { n, used: Array(4 * n).fill(-1), lines: [], turn: first, first, score: [0, 0] };
}
const clone = (s) => ({ ...s, used: s.used.slice(), lines: s.lines.map((l) => ({ ...l })), score: s.score.slice() });

const side = (s, d) => Math.floor(d / s.n);
const norm = (a, b) => (a < b ? [a, b] : [b, a]);

// Unit-square coordinates (0..1) of dot d, clockwise from the top-left.
function pos(n, d) {
  const k = d % n, f = (k + 1) / (n + 1);
  switch (Math.floor(d / n)) {
    case 0: return [f, 0];
    case 1: return [1, f];
    case 2: return [1 - f, 1];
    default: return [0, 1 - f];
  }
}

// Do chords (a,b) and (c,d) cross? All four endpoints must be distinct.
function crosses(a, b, c, d) {
  [a, b] = norm(a, b);
  const inC = c > a && c < b, inD = d > a && d < b;
  return inC !== inD;
}

function isLegal(s, a, b) {
  const N = 4 * s.n;
  return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a < N && b < N && a !== b &&
    s.used[a] < 0 && s.used[b] < 0 && side(s, a) !== side(s, b);
}

function legalMoves(s) {
  const free = [];
  for (let d = 0; d < s.used.length; d++) if (s.used[d] < 0) free.push(d);
  const out = [];
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    if (side(s, free[i]) !== side(s, free[j])) out.push([free[i], free[j]]);
  }
  return out;
}
const isOver = (s) => {
  let sides = 0;
  for (let d = 0; d < s.used.length; d++) if (s.used[d] < 0) sides |= 1 << side(s, d);
  return (sides & (sides - 1)) === 0; // unused dots on at most one side
};

// Lines that (a,b) would cross, with what each is worth to player p.
function crossings(s, a, b, p = s.turn) {
  const out = [];
  for (let i = 0; i < s.lines.length; i++) {
    const l = s.lines[i];
    if (crosses(a, b, l.a, l.b)) out.push({ i, own: l.p === p, pts: l.p === p ? 2 : 1 });
  }
  return out;
}
const gain = (s, a, b, p = s.turn) => crossings(s, a, b, p).reduce((t, c) => t + c.pts, 0);

// Mutates s. Returns { pts, own, opp } (points scored, own lines crossed, opponent lines crossed).
function apply(s, [a, b]) {
  if (!isLegal(s, a, b)) throw new Error(`illegal move ${a}-${b}`);
  [a, b] = norm(a, b);
  const p = s.turn, cr = crossings(s, a, b, p);
  const own = cr.filter((c) => c.own).length, opp = cr.length - own, pts = own * 2 + opp;
  s.used[a] = s.used[b] = p;
  s.lines.push({ a, b, p });
  s.score[p] += pts;
  s.turn = 1 - p;
  return { pts, own, opp };
}

const winner = (s) => (s.score[0] === s.score[1] ? -1 : s.score[0] > s.score[1] ? 0 : 1);

// Intersection point (unit coords) of two crossing chords — for drawing.
function meet(n, l1, l2) {
  const [x1, y1] = pos(n, l1.a), [x2, y2] = pos(n, l1.b), [x3, y3] = pos(n, l2.a), [x4, y4] = pos(n, l2.b);
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-12) return [(x1 + x2) / 2, (y1 + y2) / 2];
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

// ---------------- AI ----------------
function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length)]; }

// Negamax with alpha-beta on (mover's score − other's score) of the rest of the game.
// `budget` caps the node count; `deadline` (performance.now() ms) also stops it on slow devices.
function makeSearch(s, budget, deadline = Infinity) {
  const n = s.n, N = 4 * n;
  const used = s.used.slice();
  const la = [], lb = [], lp = [];
  for (const l of s.lines) { la.push(l.a); lb.push(l.b); lp.push(l.p); }
  let nodes = 0, aborted = false;

  function gen(p) {
    const free = [];
    for (let d = 0; d < N; d++) if (used[d] < 0) free.push(d);
    const ms = [];
    for (let i = 0; i < free.length; i++) {
      const a = free[i], sa = Math.floor(a / n);
      for (let j = i + 1; j < free.length; j++) {
        const b = free[j];
        if (Math.floor(b / n) === sa) continue;
        let g = 0;
        for (let k = 0; k < la.length; k++) {
          const c = la[k], d = lb[k];
          if ((c > a && c < b) !== (d > a && d < b)) g += lp[k] === p ? 2 : 1;
        }
        ms.push({ a, b, g });
      }
    }
    ms.sort((x, y) => y.g - x.g);
    return ms;
  }

  // Value for player p (to move) of the remaining game, searched `depth` plies deep.
  function nega(p, depth, alpha, beta) {
    if (++nodes > budget || ((nodes & 1023) === 0 && performance.now() > deadline)) { aborted = true; return 0; }
    const ms = gen(p);
    if (!ms.length) return 0;
    if (depth === 0) return ms[0].g; // optimistic: take the best immediate gain
    let best = -Infinity;
    for (const m of ms) {
      used[m.a] = used[m.b] = p; la.push(m.a); lb.push(m.b); lp.push(p);
      const v = m.g - nega(1 - p, depth - 1, m.g - beta, m.g - alpha);
      la.pop(); lb.pop(); lp.pop(); used[m.a] = used[m.b] = -1;
      if (aborted) return 0;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function root(depth, rnd) {
    const p = s.turn, ms = gen(p);
    let bestV = -Infinity, bests = [];
    for (const m of ms) {
      used[m.a] = used[m.b] = p; la.push(m.a); lb.push(m.b); lp.push(p);
      // Scores are integers: a window just below the best so far tells ties from worse moves.
      const v = m.g - nega(1 - p, depth - 1, -Infinity, m.g - (bestV - 0.5));
      la.pop(); lb.pop(); lp.pop(); used[m.a] = used[m.b] = -1;
      if (aborted) return null;
      if (v > bestV) { bestV = v; bests = [m]; } else if (v === bestV) bests.push(m);
    }
    const m = pick(bests, rnd);
    return { move: [m.a, m.b], value: bestV };
  }
  return { root, plies: () => Math.floor(used.filter((u) => u < 0).length / 2), stats: () => nodes };
}

function aiMove(s, level = 'normal', rnd = Math.random) {
  const ms = legalMoves(s);
  if (!ms.length) return null;
  if (level === 'easy') {
    // Mostly random, sometimes grabs the juiciest crossing.
    if (rnd() < 0.35) {
      const gs = ms.map((m) => gain(s, m[0], m[1])), top = Math.max(...gs);
      return pick(ms.filter((_, i) => gs[i] === top), rnd);
    }
    return pick(ms, rnd);
  }
  if (level === 'normal') {
    // Two plies: my gain now, minus the opponent's best answer (which itself counts my best gain after it).
    const search = makeSearch(s, Infinity);
    return search.root(Math.min(2, search.plies()), rnd).move;
  }
  // hard: iterative deepening alpha-beta within a node budget (and ~1.2 s of wall time on slow phones);
  // exact once the tree is small enough.
  const search = makeSearch(s, 250000, performance.now() + 1200);
  const maxD = search.plies();
  let res = null;
  for (let d = 2; d <= maxD; d++) {
    const r = search.root(d, rnd);
    if (!r) break;
    res = r;
  }
  if (!res) res = makeSearch(s, Infinity).root(1, rnd);
  return res.move;
}

export const CROSSED = {
  create, clone, side, pos, crosses, isLegal, legalMoves, isOver, crossings, gain, apply, winner, meet, aiMove,
};
