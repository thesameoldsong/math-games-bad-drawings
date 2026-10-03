// Sprouts: pure game logic + AI. No DOM.
//
// Geometry: spots {x, y, deg} and edges {a, b, pts:[[x,y]...], p} (polylines; pts[0] is spot a, last is spot b).
// Every move draws one curve A→B and puts a new spot N on it, so it adds two edges A–N and N–B.
// Topology: from the drawing we extract the faces (regions) and the cyclic order of spots along each
// face boundary. That abstract position drives game-over detection and the AI (Sprague–Grundy search).

export const W = 400, H = 480;
const SPOT_CLEAR = 8;  // a line must keep this far from spots it doesn't use
const GAP = 3;         // ...and this far from other lines (the computer may squeeze down to MIN_GAP)
const MIN_GAP = 1;
const HOOK = 16;       // along this much of its length from an end, a curve may stay close to that end spot
const NEAR = 11;       // near its own end spots a line may run closer to that spot's other lines
const ROT_R = 4;       // radius at which edge directions around a spot are measured
const MARGIN = 6;      // keep away from the paper edge
const MIN_LEN = 30;

// ---------- small geometry ----------
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSeg = (p, a, b) =>
  Math.min(a[0], b[0]) - 1e-9 <= p[0] && p[0] <= Math.max(a[0], b[0]) + 1e-9 &&
  Math.min(a[1], b[1]) - 1e-9 <= p[1] && p[1] <= Math.max(a[1], b[1]) + 1e-9;
function segsIntersect(p1, p2, p3, p4) {
  const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2), d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSeg(p1, p3, p4)) return true;
  if (d2 === 0 && onSeg(p2, p3, p4)) return true;
  if (d3 === 0 && onSeg(p3, p1, p2)) return true;
  if (d4 === 0 && onSeg(p4, p1, p2)) return true;
  return false;
}
function closestOnSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const k = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return [a[0] + k * dx, a[1] + k * dy];
}
const ptSegDist = (p, a, b) => dist(p, closestOnSeg(p, a, b));
// Closest pair between two (non-intersecting) segments: [d, pointOnFirst, pointOnSecond].
function segSegClosest(a, b, c, d) {
  let best = [Infinity];
  for (const [p, s, t, first] of [[a, c, d, true], [b, c, d, true], [c, a, b, false], [d, a, b, false]]) {
    const q = closestOnSeg(p, s, t), dd = dist(p, q);
    if (dd < best[0]) best = first ? [dd, p, q] : [dd, q, p];
  }
  return best;
}
function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; }
function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p[0] * q[1] - q[0] * p[1]; }
  return s / 2;
}
function inPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const r1 = (v) => Math.round(v * 10) / 10;
const roundPts = (pts) => pts.map(([x, y]) => [r1(x), r1(y)]);

// Ramer–Douglas–Peucker
function simplify(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let md = 0, mi = -1;
    for (let k = i + 1; k < j; k++) { const d = ptSegDist(pts[k], pts[i], pts[j]); if (d > md) { md = d; mi = k; } }
    if (md > eps) { keep[mi] = 1; stack.push([i, mi], [mi, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// Chaikin corner cutting, endpoints kept.
function smooth(pts, iters = 2) {
  let p = pts;
  for (let it = 0; it < iters; it++) {
    if (p.length < 3) return p;
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      if (i > 0) out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      if (i < p.length - 2) out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(p[p.length - 1]);
    p = out;
  }
  return p;
}

// ---------- state ----------
const LAYOUTS = {
  1: [[0.5, 0.5]],
  2: [[0.3, 0.5], [0.7, 0.5]],
  3: [[0.5, 0.3], [0.27, 0.67], [0.73, 0.67]],
  4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
  5: [[0.5, 0.2], [0.2, 0.45], [0.8, 0.45], [0.32, 0.79], [0.68, 0.79]],
  6: [[0.3, 0.2], [0.7, 0.2], [0.18, 0.5], [0.82, 0.5], [0.3, 0.8], [0.7, 0.8]],
  7: [[0.3, 0.2], [0.7, 0.2], [0.18, 0.5], [0.5, 0.5], [0.82, 0.5], [0.3, 0.8], [0.7, 0.8]],
};
function create(n = 3, rand = Math.random) {
  const spots = (LAYOUTS[n] || LAYOUTS[3]).map(([x, y]) => ({
    x: r1((x + (rand() * 2 - 1) * 0.035) * W), y: r1((y + (rand() * 2 - 1) * 0.03) * H), deg: 0,
  }));
  return { n, spots, edges: [], turn: 0, moves: 0, count: [0, 0], last: null, over: false, winner: -1 };
}
const clone = (s) => ({
  ...s, spots: s.spots.map((p) => ({ ...p })), edges: s.edges.slice(), count: s.count.slice(),
});
const lives = (s, i) => 3 - s.spots[i].deg;
const P = (s, i) => [s.spots[i].x, s.spots[i].y];

// ---------- move validation ----------
// Checks a candidate curve pts (pts[0] = spot a, last = spot b) and returns null if legal, else a reason.
function check(s, a, b, pts, gap = GAP) {
  const GAP = Math.max(MIN_GAP, gap);
  if (a === b ? lives(s, a) < 2 : lives(s, a) < 1 || lives(s, b) < 1) return a === b && lives(s, a) === 1 ? 'loop' : 'full';
  if (pts.length < 2 || polyLen(pts) < MIN_LEN) return 'short';
  for (const p of pts) if (p[0] < MARGIN || p[1] < MARGIN || p[0] > W - MARGIN || p[1] > H - MARGIN) return 'edge';
  const A = P(s, a), B = P(s, b), n = pts.length - 1;
  // other spots, and our own end spots away from the line's ends
  let head = 1; while (head < n && dist(pts[head], A) < SPOT_CLEAR - 0.5) head++;
  let tail = n - 1; while (tail > 0 && dist(pts[tail], B) < SPOT_CLEAR - 0.5) tail--;
  // a curve may hug its own end spots only right next to them (no hooks curling round a spot)
  const cum = [0]; for (let k = 1; k <= n; k++) cum.push(cum[k - 1] + dist(pts[k - 1], pts[k]));
  const L = cum[n];
  for (let k = 0; k < n; k++) {
    const p = pts[k], q = pts[k + 1];
    for (let i = 0; i < s.spots.length; i++) {
      if ((i === a && k < head) || (i === b && k >= tail)) continue;
      let need = SPOT_CLEAR - 1;
      if (i === a || i === b) need = (i === a && cum[k] < HOOK) || (i === b && L - cum[k + 1] < HOOK) ? OWN_R - 0.5 : SPOT_CLEAR + 3;
      if (ptSegDist(P(s, i), p, q) < need) return 'spot';
    }
  }
  // self-crossing
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const p1 = pts[i], p2 = pts[i + 1], p3 = pts[j], p4 = pts[j + 1];
    if (j === i + 1) {
      if (orient(p1, p2, p4) === 0 && (p4[0] - p2[0]) * (p1[0] - p2[0]) + (p4[1] - p2[1]) * (p1[1] - p2[1]) > 0) return 'cross';
      continue;
    }
    if (a === b && i === 0 && j === n - 1) {
      if (orient(p1, p2, p3) === 0 && (p2[0] - p1[0]) * (p3[0] - p1[0]) + (p2[1] - p1[1]) * (p3[1] - p1[1]) > 0) return 'cross';
      continue;
    }
    if (segsIntersect(p1, p2, p3, p4)) return 'cross';
  }
  // other lines
  for (const e of s.edges) {
    const ends = [];
    if (e.a === a || e.b === a) ends.push(A);
    if (e.a === b || e.b === b) ends.push(B);
    for (let k = 0; k < n; k++) {
      const p = pts[k], q = pts[k + 1];
      const minx = Math.min(p[0], q[0]) - GAP, maxx = Math.max(p[0], q[0]) + GAP, miny = Math.min(p[1], q[1]) - GAP, maxy = Math.max(p[1], q[1]) + GAP;
      for (let m = 0; m < e.pts.length - 1; m++) {
        const c = e.pts[m], d = e.pts[m + 1];
        if (Math.max(c[0], d[0]) < minx || Math.min(c[0], d[0]) > maxx || Math.max(c[1], d[1]) < miny || Math.min(c[1], d[1]) > maxy) continue;
        if (segsIntersect(p, q, c, d)) {
          // touching is fine only at a shared end spot, and not along the same direction
          const X = ends.find((X) => (p === pts[0] && X === A || q === pts[n] && X === B) && (c[0] === X[0] && c[1] === X[1] || d[0] === X[0] && d[1] === X[1]));
          if (!X) return 'cross';
          const o = p === pts[0] && X === A ? q : p, f = c[0] === X[0] && c[1] === X[1] ? d : c;
          if (Math.abs(orient(X, o, f)) < 1e-9 && (o[0] - X[0]) * (f[0] - X[0]) + (o[1] - X[1]) * (f[1] - X[1]) > 0) return 'cross';
          continue;
        }
        const [dd, u, v] = segSegClosest(p, q, c, d);
        if (dd >= GAP) continue;
        if (ends.some((X) => dist(u, X) < NEAR && dist(v, X) < NEAR)) continue;
        return 'cross';
      }
    }
  }
  return null;
}

// Where to put the new spot: the roomiest point around the middle of the curve.
function placeSpot(s, a, b, pts) {
  const L = polyLen(pts), A = P(s, a), B = P(s, b);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const at = (t) => {
    let i = 1; while (i < pts.length - 1 && cum[i] < t) i++;
    const k = (t - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return { i, p: [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k] };
  };
  let best = null;
  for (let f = 0.3; f <= 0.701; f += 0.025) {
    const c = at(L * f);
    if (dist(c.p, A) < SPOT_CLEAR * 1.6 || dist(c.p, B) < SPOT_CLEAR * 1.6) continue;
    let room = Math.min(40, ...s.spots.map((q) => dist(c.p, [q.x, q.y])) );
    for (const e of s.edges) for (let m = 0; m < e.pts.length - 1; m++) { const d = ptSegDist(c.p, e.pts[m], e.pts[m + 1]); if (d < room) room = d; }
    // also stay clear of our own curve's other parts
    for (let m = 0; m < pts.length - 1; m++) {
      if (Math.abs(cum[m] - L * f) < 20 || Math.abs(cum[m + 1] - L * f) < 20) continue;
      const d = ptSegDist(c.p, pts[m], pts[m + 1]); if (d < room) room = d;
    }
    const score = room - Math.abs(f - 0.5) * 6;
    if (!best || score > best.score) best = { ...c, score };
  }
  return best;
}

// Build a full move (or {err}) from a curve between spots a and b.
function makeMove(s, a, b, pts, gap = GAP) {
  pts = roundPts(pts);
  pts[0] = P(s, a); pts[pts.length - 1] = P(s, b);
  // drop zero-length steps
  pts = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
  const err = check(s, a, b, pts, gap);
  if (err) return { err };
  const sp = placeSpot(s, a, b, pts);
  if (!sp) return { err: 'short' };
  const N = [r1(sp.p[0]), r1(sp.p[1])];
  const m = { a, b, pts, k: sp.i, N };
  if (gap < GAP) m.gap = gap;
  return m;
}
// Re-check a move received from elsewhere (online); returns a clean copy or null.
function verify(s, m) {
  if (!m || !Array.isArray(m.pts) || !(m.a >= 0 && m.a < s.spots.length) || !(m.b >= 0 && m.b < s.spots.length)) return null;
  const x = makeMove(s, m.a, m.b, m.pts, Math.max(MIN_GAP, +m.gap || GAP));
  return x.err ? null : x;
}

// Freehand stroke from the UI → move or {err}. snap = how close to a spot the stroke must start/end.
function fromStroke(s, raw, snap = 22) {
  if (raw.length < 2) return { err: 'end' };
  const near = (p) => {
    let bi = -1, bd = snap;
    s.spots.forEach((q, i) => { const d = dist(p, [q.x, q.y]); if (d < bd) { bd = d; bi = i; } });
    return bi;
  };
  const a = near(raw[0]), b = near(raw[raw.length - 1]);
  if (a < 0 || b < 0) return { err: 'end' };
  if (a === b ? lives(s, a) < 2 : lives(s, a) < 1 || lives(s, b) < 1) return { err: a === b && lives(s, a) === 1 ? 'loop' : 'full', a, b };
  let pts = raw.map((p) => [Math.max(MARGIN + 1, Math.min(W - MARGIN - 1, p[0])), Math.max(MARGIN + 1, Math.min(H - MARGIN - 1, p[1]))]);
  const A = P(s, a), B = P(s, b), cut = SPOT_CLEAR + 1;
  let i = 0; while (i < pts.length && dist(pts[i], A) < cut) i++;
  let j = pts.length - 1; while (j >= 0 && dist(pts[j], B) < cut) j--;
  if (j <= i) return { err: 'short', a, b };
  pts = [A, ...pts.slice(i, j + 1), B];
  pts = simplify(pts, 0.9);
  const sm = makeMove(s, a, b, smooth(pts, 2));
  if (!sm.err) return sm;
  const raw2 = makeMove(s, a, b, pts);
  return raw2.err ? { err: sm.err, a, b, stroke: pts } : raw2;
}

// A stroke that touched other lines: find a clean curve between the same spots that follows it closely.
function resample(pts, n = 24) {
  const L = polyLen(pts), out = [pts[0]];
  let i = 1, acc = 0;
  for (let k = 1; k < n; k++) {
    const t = (L * k) / n;
    while (i < pts.length - 1 && acc + dist(pts[i - 1], pts[i]) < t) { acc += dist(pts[i - 1], pts[i]); i++; }
    const seg = dist(pts[i - 1], pts[i]) || 1, f = Math.min(1, (t - acc) / seg);
    out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function assist(s, failed, rand = Math.random) {
  const { a, b, stroke } = failed;
  if (!stroke || a == null || !livePairs(s).some(([x, y]) => (x === Math.min(a, b) && y === Math.max(a, b)))) return null;
  const want = resample(stroke);
  const diff = (m) => {
    const p = resample(m.pts);
    let d1 = 0, d2 = 0;
    for (let i = 0; i < p.length; i++) { d1 += dist(p[i], want[i]); d2 += dist(p[p.length - 1 - i], want[i]); }
    return Math.min(d1, a === b ? d2 : Infinity) / p.length;
  };
  let best = null, bd = 32;
  for (const st of STAGES) {
    const ctx = routingCtx(s, st);
    for (let t = 0; t < 40; t++) {
      const m = a === b && rand() < 0.3 ? petal(s, a, rand, st.gap) : route(s, Math.min(a, b), Math.max(a, b), ctx, rand);
      if (!m) continue;
      const d = diff(m);
      if (d < bd) { bd = d; best = m; }
    }
    if (best) break;
  }
  return best;
}

// Mutates s. Returns the index of the new spot.
function apply(s, m) {
  const ni = s.spots.length;
  const pts1 = m.pts.slice(0, m.k).concat([m.N]), pts2 = [m.N].concat(m.pts.slice(m.k));
  s.spots.push({ x: m.N[0], y: m.N[1], deg: 2 });
  s.spots[m.a].deg++; s.spots[m.b].deg++;
  s.edges = s.edges.concat([{ a: m.a, b: ni, pts: pts1, p: s.turn }, { a: ni, b: m.b, pts: pts2, p: s.turn }]);
  s.count[s.turn]++;
  s.moves++;
  s.last = ni;
  if (!hasMoves(s)) { s.over = true; s.winner = s.turn; }
  else s.turn = 1 - s.turn;
  return ni;
}

// ---------- topology ----------
function exitDir(pts, from) {
  const c = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (dist(pts[i], c) >= ROT_R) {
      const p = pts[i - 1], q = pts[i];
      // find t on p→q with |p + t(q-p) - c| = ROT_R (p is inside the circle)
      const dx = q[0] - p[0], dy = q[1] - p[1], fx = p[0] - c[0], fy = p[1] - c[1];
      const A2 = dx * dx + dy * dy, B2 = 2 * (fx * dx + fy * dy), C2 = fx * fx + fy * fy - ROT_R * ROT_R;
      const t = A2 ? (-B2 + Math.sqrt(Math.max(0, B2 * B2 - 4 * A2 * C2))) / (2 * A2) : 0;
      return Math.atan2(p[1] + t * dy - c[1], p[0] + t * dx - c[0]);
    }
  }
  const q = pts[pts.length - 1];
  return Math.atan2(q[1] - c[1], q[0] - c[0]);
}

// Abstract position: { regions: [[boundary...]...], lives: [] }, boundary = cyclic list of spot indices
// walked with the region on the left. Isolated spots are one-element boundaries.
function topology(s) {
  const he = [];
  s.edges.forEach((e, i) => {
    he.push({ from: e.a, to: e.b, e: i, pts: e.pts });
    he.push({ from: e.b, to: e.a, e: i, pts: e.pts.slice().reverse() });
  });
  const out = s.spots.map(() => []);
  he.forEach((h, i) => { h.ang = exitDir(h.pts); out[h.from].push(i); });
  for (const o of out) o.sort((x, y) => he[x].ang - he[y].ang);
  const pos = he.map(() => 0);
  out.forEach((o) => o.forEach((h, k) => (pos[h] = k)));
  const next = (h) => { const t = h ^ 1, o = out[he[h].to]; return o[(pos[t] + 1) % o.length]; };

  // components (to know which walks belong together)
  const comp = s.spots.map((_, i) => i);
  const find = (x) => (comp[x] === x ? x : (comp[x] = find(comp[x])));
  for (const e of s.edges) comp[find(e.a)] = find(e.b);

  const walks = [], seen = new Uint8Array(he.length);
  for (let h0 = 0; h0 < he.length; h0++) {
    if (seen[h0]) continue;
    const vs = [], poly = [];
    let h = h0, guard = 0;
    do { seen[h] = 1; vs.push(he[h].from); for (let k = 0; k < he[h].pts.length - 1; k++) poly.push(he[h].pts[k]); h = next(h); } while (h !== h0 && ++guard < 100000);
    walks.push({ vs, poly, area: signedArea(poly), c: find(vs[0]) });
  }
  s.spots.forEach((p, i) => { if (!p.deg) walks.push({ vs: [i], poly: [[p.x, p.y]], area: 0, c: find(i) }); });

  // Faces on the left: bounded faces are walked counter-clockwise on screen (negative area with y down).
  const inner = walks.filter((w) => w.area < -1e-6), outerByComp = new Map();
  for (const w of walks) if (!(w.area < -1e-6)) {
    const prev = outerByComp.get(w.c);
    if (!prev || w.area > prev.area) outerByComp.set(w.c, w);
  }
  // every non-chosen non-negative walk (shouldn't happen) is treated as inner to stay total
  for (const w of walks) if (!(w.area < -1e-6) && outerByComp.get(w.c) !== w) inner.push(w);
  const faces = inner.map((w) => ({ walk: w, absA: Math.abs(w.area), bs: [w.vs] }));
  const outerFace = { bs: [] };
  for (const [c, w] of outerByComp) {
    const v = w.vs[0], pt = [s.spots[v].x, s.spots[v].y];
    let host = null;
    for (const f of faces) if (f.walk.c !== c && (!host || f.absA < host.absA) && inPoly(pt, f.walk.poly)) host = f;
    (host || outerFace).bs.push(w.vs);
  }
  return { regions: [outerFace.bs, ...faces.map((f) => f.bs)], lives: s.spots.map((p) => 3 - p.deg) };
}

// ---------- abstract game ----------
function normRegion(R, lv) {
  const bs = [];
  for (const b of R) {
    const f = b.filter((v) => lv[v] > 0);
    if (!f.length) continue;
    let g = f.filter((v, i) => v !== f[(i + 1) % f.length]);
    if (!g.length) g = [f[0]];
    bs.push(g);
  }
  const seen = new Set(); let tot = 0;
  for (const b of bs) for (const v of b) if (!seen.has(v)) { seen.add(v); tot += lv[v]; }
  return tot >= 2 ? bs : null;
}
function normalize(regions, lv) { return regions.map((R) => normRegion(R, lv)).filter(Boolean); }

const anyMove = (pos) => normalize(pos.regions, pos.lives).length > 0;
function hasMoves(s) { return anyMove(topology(s)); }

// All abstract moves of a set of regions: yields new region lists (lives array is shared + extended).
function* abstractMoves(regions, lv) {
  const N = lv.length;
  for (let r = 0; r < regions.length; r++) {
    const R = regions[r], rest = regions.filter((_, i) => i !== r);
    for (let bi = 0; bi < R.length; bi++) {
      const b = R[bi];
      for (let i = 0; i < b.length; i++) {
        const A = b[i];
        if (lv[A] < 1) continue;
        // within the same boundary: split the region
        for (let j = i; j < b.length; j++) {
          const B = b[j];
          if (lv[B] < 1 || (A === B && lv[A] < 2)) continue;
          const r1 = b.slice(i, j + 1).concat([N]);
          const r2 = b.slice(j).concat(b.slice(0, i + 1), [N]);
          const others = R.filter((_, k) => k !== bi), m = others.length;
          for (let mask = 0; mask < 1 << m; mask++) {
            const s1 = [r1], s2 = [r2];
            for (let k = 0; k < m; k++) (mask >> k & 1 ? s1 : s2).push(others[k]);
            yield { A, B, regions: [...rest, s1, s2] };
          }
        }
        // to another boundary: merge them
        for (let bj = bi + 1; bj < R.length; bj++) {
          const c = R[bj];
          for (let k = 0; k < c.length; k++) {
            const B = c[k];
            if (lv[B] < 1) continue;
            const merged = b.slice(i).concat(b.slice(0, i), [A, N], c.slice(k), c.slice(0, k), [B, N]);
            yield { A, B, regions: [...rest, [merged, ...R.filter((_, x) => x !== bi && x !== bj)]] };
          }
        }
      }
    }
  }
}
function afterLives(lv, A, B) { const l = lv.concat([1]); l[A]--; l[B]--; return l; }

// Split normalized regions into groups that share no live spot (independent sub-games).
function groups(regions) {
  const n = regions.length, par = regions.map((_, i) => i);
  const find = (x) => (par[x] === x ? x : (par[x] = find(par[x])));
  const owner = new Map();
  regions.forEach((R, i) => { for (const b of R) for (const v of b) { if (owner.has(v)) par[find(i)] = find(owner.get(v)); else owner.set(v, i); } });
  const g = new Map();
  for (let i = 0; i < n; i++) { const k = find(i); if (!g.has(k)) g.set(k, []); g.get(k).push(regions[i]); }
  return [...g.values()];
}

// Canonical-ish key: sound (equal keys ⇒ same game), not always minimal.
function keyOf(regions, lv) {
  const occ = new Map();
  for (const R of regions) for (const b of R) for (const v of b) occ.set(v, (occ.get(v) || 0) + 1);
  const tok = (v) => (occ.get(v) === 1 ? String(lv[v]) : 'm' + lv[v]);
  const bmin = (b) => {
    const t = b.map(tok); let best = null, rot = 0;
    for (let r = 0; r < t.length; r++) { const x = t.slice(r).concat(t.slice(0, r)).join(','); if (best === null || x < best) { best = x; rot = r; } }
    return { s: best, b: b.slice(rot).concat(b.slice(0, rot)) };
  };
  const regs = regions.map((R) => { const bs = R.map(bmin).sort((x, y) => (x.s < y.s ? -1 : x.s > y.s ? 1 : 0)); return { s: bs.map((x) => x.s).join('|'), bs }; })
    .sort((x, y) => (x.s < y.s ? -1 : x.s > y.s ? 1 : 0));
  const lab = new Map();
  return regs.map((R) => R.bs.map(({ b }) => b.map((v) => {
    if (occ.get(v) === 1) return String(lv[v]);
    if (!lab.has(v)) lab.set(v, lab.size);
    return lv[v] + 'abcdefghijklmnopqrstuvwxyz'[lab.size > 25 ? 25 : lab.get(v)] + (lab.get(v) > 25 ? lab.get(v) : '');
  }).join(',')).join('|')).join('/');
}

const memo = new Map();
let deadline = Infinity, ticks = 0;
class OutOfBudget extends Error {}

function grundyGroup(regions, lv) {
  const k = keyOf(regions, lv);
  const hit = memo.get(k);
  if (hit !== undefined) return hit;
  if ((++ticks & 31) === 0 && Date.now() > deadline) throw new OutOfBudget();
  if (memo.size > 1500000) memo.clear();
  const seen = new Set();
  for (const m of abstractMoves(regions, lv)) {
    const l2 = afterLives(lv, m.A, m.B);
    seen.add(grundyRegions(normalize(m.regions, l2), l2));
  }
  let g = 0; while (seen.has(g)) g++;
  memo.set(k, g);
  return g;
}
function grundyRegions(regions, lv) {
  let g = 0;
  for (const grp of groups(regions)) g ^= grundyGroup(grp, lv);
  return g;
}
// Run fn with a time limit (ms); nested limits only ever shrink. Returns null on timeout.
function timed(ms, fn) {
  const prev = deadline;
  deadline = Math.min(prev, Date.now() + ms);
  try { return fn(); }
  catch (e) { if (e instanceof OutOfBudget) return null; throw e; }
  finally { deadline = prev; }
}
// Grundy value of an abstract position (0 = the player to move loses), or null if it takes too long.
const grundy = (pos, ms = 300) => timed(ms, () => grundyRegions(normalize(pos.regions, pos.lives), pos.lives));
const value = (s, limit) => grundy(topology(s), limit);

// ---------- routing (how the computer draws) ----------
// The free space is rasterised; paths prefer the middle of open areas (cost grows near lines),
// optionally pass through a random waypoint (that's how loops and different "sides" get explored).
let CELL, GW, GH; // grid resolution (set per routing context; everything here is synchronous)
const setCell = (c) => { CELL = c; GW = Math.ceil(W / c); GH = Math.ceil(H / c); };
setCell(3);
const cx = (i) => (i % GW) * CELL + CELL / 2, cy = (i) => Math.floor(i / GW) * CELL + CELL / 2;

const OWN_R = 5; // how close a curve may pass its own end spots (away from its ends)
function blockedGrid(s, clear, spotR, own = []) {
  const g = new Uint8Array(GW * GH);
  for (let i = 0; i < g.length; i++) {
    const x = cx(i), y = cy(i);
    if (x < MARGIN + 3 || y < MARGIN + 3 || x > W - MARGIN - 3 || y > H - MARGIN - 3) g[i] = 1;
  }
  const mark = (x0, y0, x1, y1, r, test) => {
    const i0 = Math.max(0, Math.floor((Math.min(x0, x1) - r) / CELL)), i1 = Math.min(GW - 1, Math.floor((Math.max(x0, x1) + r) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(y0, y1) - r) / CELL)), j1 = Math.min(GH - 1, Math.floor((Math.max(y0, y1) + r) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const c = j * GW + i; if (!g[c] && test(cx(c), cy(c))) g[c] = 1; }
  };
  for (const e of s.edges) {
    // right next to our own end spots their lines may be approached closely (as check() allows)
    const X = [e.a, e.b].filter((v) => own.includes(v)).map((v) => P(s, v));
    for (let m = 0; m < e.pts.length - 1; m++) {
      const p = e.pts[m], q = e.pts[m + 1];
      mark(p[0], p[1], q[0], q[1], clear, (x, y) => ptSegDist([x, y], p, q) < (X.some((c) => Math.hypot(x - c[0], y - c[1]) < NEAR - 1) ? 1.2 : clear));
    }
  }
  s.spots.forEach((p, i) => {
    const r = own.includes(i) ? OWN_R + 0.5 : spotR;
    mark(p.x, p.y, p.x, p.y, r, (x, y) => Math.hypot(x - p.x, y - p.y) < r);
  });
  return g;
}
// Distance (in cells, chamfer 3-4) from every free cell to the nearest blocked one.
function distField(g) {
  const d = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) d[i] = g[i] ? 0 : 1e9;
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const c = j * GW + i; if (!d[c]) continue;
    let v = d[c];
    if (i > 0) v = Math.min(v, d[c - 1] + 3);
    if (j > 0) { v = Math.min(v, d[c - GW] + 3); if (i > 0) v = Math.min(v, d[c - GW - 1] + 4); if (i < GW - 1) v = Math.min(v, d[c - GW + 1] + 4); }
    d[c] = v;
  }
  for (let j = GH - 1; j >= 0; j--) for (let i = GW - 1; i >= 0; i--) {
    const c = j * GW + i; if (!d[c]) continue;
    let v = d[c];
    if (i < GW - 1) v = Math.min(v, d[c + 1] + 3);
    if (j < GH - 1) { v = Math.min(v, d[c + GW] + 3); if (i < GW - 1) v = Math.min(v, d[c + GW + 1] + 4); if (i > 0) v = Math.min(v, d[c + GW - 1] + 4); }
    d[c] = v;
  }
  for (let i = 0; i < d.length; i++) d[i] = (d[i] / 3) * CELL; // → board units
  return d;
}
// Cells just outside a spot from which a straight stub to the spot is clean.
function ring(s, v, g) {
  const p = P(s, v), out = [], R0 = OWN_R + 0.5, R1 = Math.max(R0 + CELL * 1.6, NEAR - 2);
  const inc = s.edges.filter((e) => e.a === v || e.b === v);
  for (let j = Math.floor((p[1] - R1) / CELL); j <= Math.floor((p[1] + R1) / CELL); j++)
    for (let i = Math.floor((p[0] - R1) / CELL); i <= Math.floor((p[0] + R1) / CELL); i++) {
      if (i < 0 || j < 0 || i >= GW || j >= GH) continue;
      const c = j * GW + i, q = [cx(c), cy(c)], d = dist(p, q);
      if (g[c] || d < R0 || d > R1) continue;
      let ok = true;
      for (const e of inc) {
        for (let m = 0; m < e.pts.length - 1; m++) {
          const a = e.pts[m], b = e.pts[m + 1];
          if (dist(a, p) < 0.01 || dist(b, p) < 0.01) continue;
          if (segsIntersect(p, q, a, b) || ptSegDist(q, a, b) < 1.5) { ok = false; break; }
        }
        if (!ok) break;
      }
      if (ok) out.push({ c, ang: Math.atan2(q[1] - p[1], q[0] - p[0]) });
    }
  return out;
}
const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
// Dijkstra with a binary heap; stepping near walls is expensive so paths keep to open space.
function path(g, dt, from, to) {
  if (g[to] || from === to) return null;
  const n = g.length, cost = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
  const heap = [], push = (c, k) => {
    heap.push([k, c]); let i = heap.length - 1;
    while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; }
    }
    return top;
  };
  cost[from] = 0; push(from, 0);
  while (heap.length) {
    const [k, c] = pop();
    if (k > cost[c]) continue;
    if (c === to) break;
    const i = c % GW, j = (c - i) / GW;
    for (const [di, dj, len] of N8) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
      const m = nj * GW + ni;
      if (g[m]) continue;
      if (di && dj && (g[j * GW + ni] || g[nj * GW + i])) continue;
      const w = len * (1 + 30 / (dt[m] + 1));
      if (k + w < cost[m]) { cost[m] = k + w; prev[m] = c; push(m, k + w); }
    }
  }
  if (prev[to] < 0) return null;
  const out = [to]; let x = to;
  while (x !== from) { x = prev[x]; out.push(x); }
  return out.reverse();
}
// Routing passes, from roomy to desperate (thin gaps happen: there are topologically legal moves
// that only fit through a narrow neck).
const STAGES = [
  { clear: GAP + 3.5, spotR: SPOT_CLEAR + 2.5, cell: 3, gap: GAP, tries: 1 },
  { clear: GAP + 1.6, spotR: SPOT_CLEAR + 1, cell: 3, gap: GAP, tries: 1 },
  { clear: GAP + 0.6, spotR: SPOT_CLEAR + 0.3, cell: 1.5, gap: GAP, tries: 0.5 },
  { clear: 2, spotR: SPOT_CLEAR, cell: 1, gap: 1.4, tries: 0.3 },
];
function routingCtx(s, st) {
  return { s, ...st, pairs: {} };
}
// Grid for joining a and b: their own spots are open so curves can leave them through narrow gaps.
function pairCtx(ctx, a, b) {
  setCell(ctx.cell);
  const key = a + ',' + b;
  if (ctx.pairs[key]) return ctx.pairs[key];
  const s = ctx.s, g = blockedGrid(s, ctx.clear, ctx.spotR, [a, b]), dt = distField(g);
  // connected pieces of free space, and roomy waypoint cells in each
  const comp = new Int32Array(g.length).fill(-1), free = [];
  for (let i = 0; i < g.length; i++) {
    if (g[i] || comp[i] >= 0) continue;
    const k = free.length, cells = [], st = [i];
    comp[i] = k;
    while (st.length) {
      const c = st.pop(), x = c % GW, y = (c - x) / GW;
      if (dt[c] > CELL * 1.5) cells.push(c);
      for (const n of [x > 0 ? c - 1 : -1, x < GW - 1 ? c + 1 : -1, y > 0 ? c - GW : -1, y < GH - 1 ? c + GW : -1])
        if (n >= 0 && !g[n] && comp[n] < 0) { comp[n] = k; st.push(n); }
    }
    free.push(cells);
  }
  const ra = ring(s, a, g), rb = ring(s, b, g);
  // a curve can only start where the other end is reachable (narrow wedges leave few such cells)
  const reach = new Set(rb.map((x) => comp[x.c]));
  const start = a === b ? ra : ra.filter((x) => reach.has(comp[x.c]));
  return (ctx.pairs[key] = { g, dt, comp, free, ra, rb, start });
}
function finish(s, a, b, raw, gap) {
  const simp = simplify(raw, 2.2);
  for (const pts of [smooth(simp, 3), smooth(simplify(raw, 1.2), 2), simplify(raw, 0.6)]) {
    const m = makeMove(s, a, b, pts, gap);
    if (!m.err) return m;
  }
  return null;
}
// Gentle arc between two spots (cheap, pretty, works when nothing is in the way).
function arc(s, a, b, rand, gap = GAP) {
  if (a === b) return null;
  const A = P(s, a), B = P(s, b), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, L = dist(A, B);
  const bend = (rand() * 2 - 1) * L * 0.35, nx = -(B[1] - A[1]) / L, ny = (B[0] - A[0]) / L;
  const C = [mx + nx * bend, my + ny * bend], pts = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, u = 1 - t; pts.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]); }
  const m = makeMove(s, a, b, pts, gap);
  return m.err ? null : m;
}

// Teardrop loop from a spot: fits into tight corners.
function petal(s, a, rand, gap = GAP) {
  const A = P(s, a), th = rand() * Math.PI * 2, w = 0.35 + rand() * 0.5, L = 16 + rand() * 40, pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24, phi = th - w + 2 * w * t, r = L * Math.sin(Math.PI * t);
    pts.push([A[0] + r * Math.cos(phi), A[1] + r * Math.sin(phi)]);
  }
  const m = makeMove(s, a, a, pts, gap);
  return m.err ? null : m;
}

// One random attempt to draw a curve a→b. Returns a move or null.
// a ≠ b: shortest roomy path, detouring around 0–2 random blobs (so it tries different sides of things).
// a = b: grow a random "spine" from the spot and go around it — the loop encloses whatever the spine reached.
function blot(g, x, y, r) {
  const i0 = Math.max(0, Math.floor((x - r) / CELL)), i1 = Math.min(GW - 1, Math.floor((x + r) / CELL));
  const j0 = Math.max(0, Math.floor((y - r) / CELL)), j1 = Math.min(GH - 1, Math.floor((y + r) / CELL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(cx(j * GW + i) - x, cy(j * GW + i) - y) < r) g[j * GW + i] = 1;
}
const angDiff = (x, y) => { let d = Math.abs(x - y) % (Math.PI * 2); return Math.min(d, Math.PI * 2 - d); };
function route(s, a, b, ctx, rand) {
  const relaxed = Math.max(ctx.gap, ctx.clear - 1);
  if (a !== b && rand() < 0.3) { const m = arc(s, a, b, rand, relaxed); if (m) return m; }
  if (a === b && rand() < 0.2) { const m = petal(s, a, rand, relaxed); if (m) return m; }
  const pc = pairCtx(ctx, a, b), { g, ra, rb } = pc;
  if (!ra.length || !rb.length) return null;
  const A = P(s, a), B = P(s, b);
  let g2 = g, s1, s2;
  if (a !== b) {
    if (!pc.start.length) return null;
    s1 = pc.start[Math.floor(rand() * pc.start.length)];
    const k = pc.comp[s1.c], ends = rb.filter((x) => pc.comp[x.c] === k);
    s2 = ends[Math.floor(rand() * ends.length)];
    const pool = pc.free[k], nb = rand() < 0.35 ? 0 : 1 + (rand() < 0.4);
    if (nb && pool.length) {
      g2 = g.slice();
      for (let t = 0; t < nb; t++) {
        const w = pool[Math.floor(rand() * pool.length)], x = cx(w), y = cy(w);
        const r = Math.min(8 + rand() * 30, dist([x, y], A) - 12, dist([x, y], B) - 12);
        if (r > 4) blot(g2, x, y, r);
      }
      if (g2[s1.c] || g2[s2.c]) return null;
    }
  } else {
    const sm = ra[Math.floor(rand() * ra.length)], k = pc.comp[sm.c], pool = pc.free[k];
    if (!pool.length) return null;
    const w = pool[Math.floor(rand() * pool.length)];
    const spine = path(g, pc.dt, sm.c, w);
    if (!spine || spine.length < 4) return null;
    g2 = g.slice();
    // keep the loop off the back of the spot: only the sector around the spine stays open
    const R = OWN_R + CELL * 3.5;
    blot(g2, A[0], A[1], OWN_R + 0.5);
    for (let j = Math.floor((A[1] - R) / CELL); j <= Math.floor((A[1] + R) / CELL); j++)
      for (let i = Math.floor((A[0] - R) / CELL); i <= Math.floor((A[0] + R) / CELL); i++) {
        if (i < 0 || j < 0 || i >= GW || j >= GH) continue;
        const c = j * GW + i, x = cx(c), y = cy(c);
        if (Math.hypot(x - A[0], y - A[1]) < R && angDiff(Math.atan2(y - A[1], x - A[0]), sm.ang) > 1.9) g2[c] = 1;
      }
    // the spine: thin near the spot, fat further out (so the loop has room inside)
    const fat = 3 + rand() * 9;
    spine.forEach((c, i) => blot(g2, cx(c), cy(c), Math.min(fat, 1 + i * CELL * 0.35)));
    const side = (lo, hi) => ra.filter((x) => !g2[x.c] && angDiff(x.ang, sm.ang) > lo && angDiff(x.ang, sm.ang) < hi);
    const cand = side(0.3, 1.8);
    const left = cand.filter((x) => Math.sin(x.ang - sm.ang) > 0), right = cand.filter((x) => Math.sin(x.ang - sm.ang) < 0);
    if (!left.length || !right.length) return null;
    s1 = left[Math.floor(rand() * left.length)];
    s2 = right[Math.floor(rand() * right.length)];
  }
  const cells = path(g2, g2 === g ? pc.dt : distField(g2), s1.c, s2.c);
  if (!cells) return null;
  return finish(s, a, b, [A, ...cells.map((c) => [cx(c), cy(c)]), B], ctx.gap);
}

// Random legal geometric moves (up to `want`), trying the given spot pairs (default: all live pairs).
function sampleMoves(s, want, rand = Math.random, pairs = null, tries = 0) {
  pairs ||= livePairs(s);
  const out = [];
  if (!pairs.length) return out;
  tries ||= want * 5;
  for (const st of STAGES.slice(0, 2)) {
    const ctx = routingCtx(s, st);
    for (let t = 0; t < tries && out.length < want; t++) {
      const [a, b] = pairs[Math.floor(rand() * pairs.length)];
      const m = route(s, a, b, ctx, rand);
      if (m) out.push(m);
    }
    if (out.length) break;
  }
  return out;
}

function afterMove(s, m) { const x = clone(s); apply(x, m); return x; }

// level: easy | normal | hard
function aiMove(s, level = 'normal', rand = Math.random) {
  if (level === 'easy') return sampleMoves(s, 1, rand)[0] || fallback(s, rand);
  const T = level === 'hard' ? 2200 : 500;
  const t0 = Date.now(), left = () => Math.max(1, t0 + T - Date.now());
  // Which spot pairs lead to a won position in the abstract game? Then look for a drawing that realises one.
  const pos = topology(s), lv = pos.lives;
  const winPairs = timed(T * 0.6, () => {
    const regs = normalize(pos.regions, lv), pairs = new Map();
    for (const m of abstractMoves(regs, lv)) {
      const l2 = afterLives(lv, m.A, m.B);
      if (grundyRegions(normalize(m.regions, l2), l2) === 0) pairs.set(Math.min(m.A, m.B) + ',' + Math.max(m.A, m.B), [Math.min(m.A, m.B), Math.max(m.A, m.B)]);
    }
    return [...pairs.values()];
  });
  const sloppy = level === 'normal' && rand() < 0.25; // the normal computer sometimes just plays
  if (winPairs?.length && !sloppy) {
    const cands = sampleMoves(s, 30, rand, winPairs, 150);
    for (const m of cands) if (grundy(topology(afterMove(s, m)), left()) === 0) return m;
  }
  const cands = sampleMoves(s, level === 'hard' ? 12 : 6, rand);
  if (!cands.length) return fallback(s, rand);
  // otherwise prefer what we can prove good, then positions still too murky to call
  let best = cands[0], bv = -1;
  for (const m of cands) {
    const v = winPairs === null ? null : grundy(topology(afterMove(s, m)), Math.min(60, left()));
    const sc = (v === 0 ? 3 : v === null ? 2 : 1) + rand() * 0.5;
    if (sc > bv) { bv = sc; best = m; }
  }
  return best;
}
// Last resort: try much harder, down to thin gaps and a fine grid.
function fallback(s, rand) {
  const pairs = livePairs(s);
  if (!pairs.length) return null;
  for (let t = 0; t < 200; t++) {
    const [a, b] = pairs[t % pairs.length];
    const m = a === b ? petal(s, a, rand) : arc(s, a, b, rand);
    if (m) return m;
  }
  for (const st of STAGES) {
    const ctx = routingCtx(s, st);
    for (let t = 0; t < 300 * st.tries; t++) {
      const [a, b] = pairs[t % pairs.length];
      const m = route(s, a, b, ctx, rand);
      if (m) return m;
    }
  }
  for (let t = 0; t < 400; t++) {
    const [a, b] = pairs[t % pairs.length];
    const m = a === b ? petal(s, a, rand, MIN_GAP) : arc(s, a, b, rand, MIN_GAP);
    if (m) return m;
  }
  return null;
}
// Spot pairs that share a region (only those can ever be joined).
function livePairs(s) {
  const pos = topology(s), set = new Map();
  for (const R of normalize(pos.regions, pos.lives)) {
    const vs = [...new Set(R.flat())];
    for (const a of vs) for (const b of vs) if (a < b || (a === b && pos.lives[a] >= 2)) set.set(a + ',' + b, [a, b]);
  }
  return [...set.values()];
}

// Can the player to move still draw something? (a legal move may exist in theory but not fit on the paper)
function canDraw(s, rand = Math.random) {
  if (!hasMoves(s)) return false;
  return !!(sampleMoves(s, 1, rand)[0] || fallback(s, rand));
}

export const SPR = {
  W, H, create, clone, apply, check, makeMove, verify, fromStroke, assist, livePairs, topology, normalize, hasMoves,
  grundy, value, abstractMoves, sampleMoves, aiMove, canDraw, lives, keyOf,
  _: { segsIntersect, signedArea, simplify, smooth },
};
