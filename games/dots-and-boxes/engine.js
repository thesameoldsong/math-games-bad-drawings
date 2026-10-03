// Dots and Boxes: pure game logic + AI. No DOM.
// Edge = {t:'h'|'v', r, c}. h[r][c] joins dots (r,c)-(r,c+1); v[r][c] joins (r,c)-(r+1,c).

function create(R, C) {
  return {
    R, C,
    h: Array.from({ length: R + 1 }, () => Array(C).fill(-1)),
    v: Array.from({ length: R }, () => Array(C + 1).fill(-1)),
    box: Array.from({ length: R }, () => Array(C).fill(-1)),
    turn: 0, score: [0, 0], last: null,
  };
}
const clone = (s) => ({
  ...s,
  h: s.h.map((a) => a.slice()), v: s.v.map((a) => a.slice()), box: s.box.map((a) => a.slice()),
  score: s.score.slice(),
});
const key = (e) => e.t + e.r + '_' + e.c;
const get = (s, e) => (e.t === 'h' ? s.h[e.r][e.c] : s.v[e.r][e.c]);
const set = (s, e, p) => (e.t === 'h' ? (s.h[e.r][e.c] = p) : (s.v[e.r][e.c] = p));
const edgesOfBox = (r, c) => [{ t: 'h', r, c }, { t: 'h', r: r + 1, c }, { t: 'v', r, c }, { t: 'v', r, c: c + 1 }];
const sides = (s, r, c) => edgesOfBox(r, c).reduce((n, e) => n + (get(s, e) >= 0), 0);
function boxesOf(s, e) {
  const out = [];
  if (e.t === 'h') { if (e.r > 0) out.push([e.r - 1, e.c]); if (e.r < s.R) out.push([e.r, e.c]); }
  else { if (e.c > 0) out.push([e.r, e.c - 1]); if (e.c < s.C) out.push([e.r, e.c]); }
  return out;
}
function freeEdges(s) {
  const out = [];
  for (let r = 0; r <= s.R; r++) for (let c = 0; c < s.C; c++) if (s.h[r][c] < 0) out.push({ t: 'h', r, c });
  for (let r = 0; r < s.R; r++) for (let c = 0; c <= s.C; c++) if (s.v[r][c] < 0) out.push({ t: 'v', r, c });
  return out;
}
const isOver = (s) => s.score[0] + s.score[1] === s.R * s.C;

// Mutates s. Returns number of boxes completed (0 → turn passes).
function apply(s, e) {
  set(s, e, s.turn);
  let got = 0;
  for (const [r, c] of boxesOf(s, e)) if (sides(s, r, c) === 4) { s.box[r][c] = s.turn; s.score[s.turn]++; got++; }
  s.last = e;
  if (!got) s.turn = 1 - s.turn;
  return got;
}

// ---------- AI ----------
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const completing = (s) => freeEdges(s).filter((e) => boxesOf(s, e).some(([r, c]) => sides(s, r, c) === 3));
const isSafe = (s, e) => boxesOf(s, e).every(([r, c]) => sides(s, r, c) < 2);
const missing = (s, r, c) => edgesOfBox(r, c).filter((e) => get(s, e) < 0);

// Greedily capture everything for the side to move; returns boxes taken.
function captureAll(s) {
  const me = s.turn; let n = 0;
  while (s.turn === me && !isOver(s)) {
    const c = completing(s);
    if (!c.length) break;
    n += apply(s, c[0]);
  }
  return n;
}
function giveaway(s, e) {
  const x = clone(s); apply(x, e);
  return captureAll(x);
}
function hasSafeAfterCapture(s) {
  const x = clone(s); captureAll(x);
  return freeEdges(x).some((e) => isSafe(x, e));
}

// Standard policy: take everything, then play safe, then sacrifice the fewest boxes.
function normalMove(s) {
  const comp = completing(s);
  if (comp.length) return comp.find((e) => boxesOf(s, e).filter(([r, c]) => sides(s, r, c) === 3).length === 2) || comp[0];
  const free = freeEdges(s), safe = free.filter((e) => isSafe(s, e));
  if (safe.length) return pick(safe);
  let best = [], bv = Infinity;
  for (const e of free) {
    const g = giveaway(s, e);
    if (g < bv) { bv = g; best = [e]; } else if (g === bv) best.push(e);
  }
  return pick(best);
}

function playout(s, me) {
  const x = clone(s);
  let guard = 1000;
  while (!isOver(x) && guard--) apply(x, normalMove(x));
  return x.score[me] - x.score[1 - me];
}

// Look for the "last two boxes of a chain": A has 3 sides, its gap leads into B with 2 sides,
// and B's other gap leads off the board or into a box that isn't part of the chain.
function doubleCrossSpot(s) {
  for (const eAB of completing(s)) {
    const bs = boxesOf(s, eAB);
    if (bs.length !== 2) continue;
    const [p, q] = bs, sp = sides(s, ...p), sq = sides(s, ...q);
    const B = sp === 3 && sq === 2 ? q : sq === 3 && sp === 2 ? p : null;
    if (!B) continue;
    const eB = missing(s, ...B).find((e) => key(e) !== key(eAB));
    const beyond = boxesOf(s, eB).filter(([r, c]) => !(r === B[0] && c === B[1]));
    if (beyond.every(([r, c]) => sides(s, r, c) <= 1)) return { eAB, eB };
  }
  return null;
}

function aiMove(s, level) {
  const comp = completing(s);
  if (level === 'easy') {
    if (comp.length && Math.random() < 0.85) return comp[0];
    const safe = freeEdges(s).filter((e) => isSafe(s, e));
    return safe.length ? pick(safe) : pick(freeEdges(s));
  }
  if (level === 'hard' && comp.length && !hasSafeAfterCapture(s)) {
    const spot = doubleCrossSpot(s);
    if (spot) {
      // First grab any boxes that aren't part of this final pair.
      const other = comp.find((e) => key(e) !== key(spot.eAB));
      if (other) return other;
      const me = s.turn, tries = 3;
      let take = 0, decline = 0;
      for (let i = 0; i < tries; i++) {
        const a = clone(s); apply(a, spot.eAB); take += playout(a, me);
        const b = clone(s); apply(b, spot.eB); decline += playout(b, me);
      }
      return decline > take ? spot.eB : spot.eAB;
    }
  }
  return normalMove(s);
}

export const DAB = { create, clone, key, get, apply, boxesOf, freeEdges, isOver, aiMove };
