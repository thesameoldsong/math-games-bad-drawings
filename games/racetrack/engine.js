// Racetrack — pure rules + AI (no DOM).
//
// The board is a lattice of grid points (0..W) × (0..H). A track is a closed band between two
// walls; each wall is a closed polyline sampled from a hand-made centreline (control points with a
// width). A car is a lattice point plus a velocity. Each turn the velocity may change by −1/0/+1 on
// each axis (9 options); the car then moves by the new velocity in a straight line. Touching a wall
// or leaving the track is a crash: the car is put back on the nearest track point, stops dead and
// sits out `penalty` turns. Crossing the start/finish line forwards completes the lap.
// Rounds: the player who moved second in a round always gets to answer; if both finish in the same
// round, whoever ends farther past the line wins.

export const W = 18, H = 24;
const NP = (W + 1) * (H + 1);
const MARGIN = 0.28;         // lattice points closer than this to a wall don't count as "inside"
const VM = 12;               // speed bound used by the search (never reachable on these boards)

// Centrelines: [x, y, width]. Point 0 sits on the start/finish line; cars drive towards point 1.
const DEFS = {
  loop: {
    finishY: 12.5, starts: [[2, 12], [4, 12]],
    ctrl: [[3, 12.5, 5], [3.2, 8, 5], [4.2, 4.3, 5], [7.4, 3, 4.8], [11, 3.3, 4.6], [14.2, 3.4, 5.2], [15, 7.8, 5],
      [14.4, 12.5, 4.4], [15, 17, 5], [14.2, 20.6, 5], [10.4, 20.9, 4.6], [6.6, 21, 5], [3.8, 20, 5], [3, 16.4, 5]],
  },
  bean: {
    finishY: 12.5, starts: [[2, 12], [4, 12]],
    ctrl: [[3, 12.5, 5], [3.1, 8, 5], [4.4, 4, 5], [8.4, 2.9, 4.6], [12.8, 3, 4.6], [15.2, 5.2, 4.4], [14.6, 8.6, 4],
      [11.6, 11, 3.8], [11.4, 14.2, 3.8], [14.4, 16.6, 4], [15, 20.2, 4.4], [11.6, 21.4, 4.6], [7, 21.2, 5], [3.8, 19.6, 5], [3, 16.2, 5]],
  },
  pin: {
    finishY: 12.5, starts: [[2, 12], [3, 12]],
    ctrl: [[2.5, 12.5, 3.8], [2.5, 7.6, 3.8], [3.4, 3.4, 3.8], [7.4, 2.4, 3.6], [11.6, 2.5, 3.6], [15, 3.4, 3.6], [15.8, 7.4, 3.4],
      [15.8, 13, 3.4], [15.8, 18.6, 3.6], [14.8, 21.6, 3.4], [12.6, 21.2, 3], [11.7, 17.4, 3], [11.4, 12.8, 3.2], [9.4, 9.8, 3.2],
      [7.2, 11.6, 3.2], [6.6, 15.6, 3], [6.2, 20.4, 3], [4.2, 21.8, 3.4], [2.6, 19.6, 3.6], [2.5, 16.2, 3.8]],
  },
};
export const TRACKS = Object.keys(DEFS);

// ---------- geometry ----------
function spline(ctrl, per) {
  const n = ctrl.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
        (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  return out;
}

function pip(poly, x, y) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const k = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  return Math.hypot(px - ax - k * dx, py - ay - k * dy);
}

// Parameter t on AB where AB meets CD (or -1).
function hit(ax, ay, bx, by, cx, cy, dx, dy) {
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-12) return -1;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / den, u = ((cx - ax) * ry - (cy - ay) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}

// The inside of a tight bend folds over itself when offset; cut those little loops out.
function untangle(w) {
  for (let guard = 0; guard < 50; guard++) {
    const n = w.length;
    let cut = null;
    for (let i = 0; i < n && !cut; i++) {
      const a = w[i], b = w[(i + 1) % n];
      for (let k = 2; k < n / 3; k++) {
        const j = (i + k) % n, c = w[j], d = w[(j + 1) % n];
        const t = hit(a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]);
        if (t >= 0) { cut = { i, k, p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] }; break; }
      }
    }
    if (!cut) return w;
    // drop points i+1 .. i+k, put the crossing point in their place
    const keep = [];
    for (let m = 0; m < n; m++) {
      const off = (m - cut.i - 1 + n) % n;
      if (off < cut.k) { if (off === 0) keep.push(cut.p); } else keep.push(w[m]);
    }
    w.length = 0;
    w.push(...keep);
  }
  return w;
}

// ---------- track ----------
const cache = {};
export function track(id) {
  if (cache[id]) return cache[id];
  const def = DEFS[id] || DEFS.loop;
  const c = spline(def.ctrl, 12);
  const walls = [[], []];
  for (let i = 0; i < c.length; i++) {
    const a = c[(i - 1 + c.length) % c.length], b = c[(i + 1) % c.length];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty);
    tx /= l; ty /= l;
    const h = c[i][2] / 2;
    walls[0].push([c[i][0] - ty * h, c[i][1] + tx * h]);
    walls[1].push([c[i][0] + ty * h, c[i][1] - tx * h]);
  }
  walls.forEach(untangle);
  // wall edges, bucketed by unit cell for fast segment queries
  const edges = [];
  for (const w of walls) for (let i = 0; i < w.length; i++) edges.push([...w[i], ...w[(i + 1) % w.length]]);
  const BW = W + 5, BH = H + 5, buckets = Array.from({ length: BW * BH }, () => []);
  const cell = (v, n) => Math.max(0, Math.min(n - 1, Math.floor(v) + 2));
  edges.forEach((e, k) => {
    for (let x = cell(Math.min(e[0], e[2]), BW); x <= cell(Math.max(e[0], e[2]), BW); x++)
      for (let y = cell(Math.min(e[1], e[3]), BH); y <= cell(Math.max(e[1], e[3]), BH); y++) buckets[y * BW + x].push(k);
  });
  const stamp = new Int32Array(edges.length);
  let stampN = 0;
  // First wall contact along A→B as t in [0,1], or -1.
  function wallHit(ax, ay, bx, by) {
    stampN++;
    let best = -1;
    for (let x = cell(Math.min(ax, bx), BW); x <= cell(Math.max(ax, bx), BW); x++)
      for (let y = cell(Math.min(ay, by), BH); y <= cell(Math.max(ay, by), BH); y++)
        for (const k of buckets[y * BW + x]) {
          if (stamp[k] === stampN) continue;
          stamp[k] = stampN;
          const e = edges[k], t = hit(ax, ay, bx, by, e[0], e[1], e[2], e[3]);
          if (t >= 0 && (best < 0 || t < best)) best = t;
        }
    return best;
  }

  const inside = new Uint8Array(NP), pts = [];
  for (let y = 0; y <= H; y++) for (let x = 0; x <= W; x++) {
    if (pip(walls[0], x, y) === pip(walls[1], x, y)) continue;
    let d = Infinity;
    for (const e of edges) d = Math.min(d, segDist(x, y, e[0], e[1], e[2], e[3]));
    if (d > MARGIN) { inside[y * (W + 1) + x] = 1; pts.push([x, y]); }
  }

  // start/finish line: across the band at y = finishY, between the two walls around ctrl[0]
  const fy = def.finishY, cx = def.ctrl[0][0], hw = def.ctrl[0][2] / 2 + 0.6;
  const finish = [[cx - hw, fy], [cx + hw, fy]];
  const t1 = def.ctrl[1];
  const dir = [0, Math.sign(t1[1] - fy)]; // the line is horizontal, so forward is ±y
  // +1 forward, −1 backward, 0 none
  const cross = (ax, ay, bx, by) => {
    if (hit(ax, ay, bx, by, finish[0][0], finish[0][1], finish[1][0], finish[1][1]) < 0) return 0;
    if ((ay - fy) * (by - fy) > 0 || ay === by) return 0;
    return Math.sign((by - ay) * dir[1]);
  };

  const T = { id, walls, center: c, finish, dir, starts: def.starts, inside, pts, wallHit, cross, driveCache: new Map() };
  T.isIn = (x, y) => x >= 0 && y >= 0 && x <= W && y <= H && inside[y * (W + 1) + x] === 1;

  // distance-to-go along the track (8-neighbour lattice walk, never crossing the line)
  const toGo = new Float64Array(NP).fill(Infinity);
  const nb = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) nb.push([dx, dy, Math.hypot(dx, dy)]);
  for (const [x, y] of pts) for (const [dx, dy] of nb)
    if (T.isIn(x + dx, y + dy) && wallHit(x, y, x + dx, y + dy) < 0 && cross(x, y, x + dx, y + dy) > 0) toGo[y * (W + 1) + x] = 0.5;
  const done = new Uint8Array(NP);
  for (;;) {
    let bi = -1;
    for (const [x, y] of pts) { const i = y * (W + 1) + x; if (!done[i] && toGo[i] < Infinity && (bi < 0 || toGo[i] < toGo[bi])) bi = i; }
    if (bi < 0) break;
    done[bi] = 1;
    const x = bi % (W + 1), y = (bi / (W + 1)) | 0;
    for (const [dx, dy, l] of nb) {
      const X = x + dx, Y = y + dy, j = Y * (W + 1) + X;
      if (!T.isIn(X, Y) || done[j] || toGo[bi] + l >= toGo[j]) continue;
      if (wallHit(x, y, X, Y) >= 0 || cross(X, Y, x, y) !== 0) continue;
      toGo[j] = toGo[bi] + l;
    }
  }
  let L = 0;
  for (const [x, y] of pts) { const v = toGo[y * (W + 1) + x]; if (v < Infinity) L = Math.max(L, v); }
  T.toGo = toGo; T.L = L;
  T.togo = (x, y) => { const v = toGo[y * (W + 1) + x]; return v < Infinity ? v : L; };

  // Drive from (x,y) to (tx,ty). Result: {crash:false, cross} or
  // {crash:true, ex, ey (wall contact), rx, ry (restart point), cross}. `avoid` = a point the restart may not use.
  T.drive = (x, y, tx, ty, avoid) => {
    const key = ((x * 31 + y) * 101 + tx + 40) * 101 + ty + 40;
    let r = !avoid && T.driveCache.get(key);
    if (r) return r;
    const t = wallHit(x, y, tx, ty);
    if (t < 0 && T.isIn(tx, ty)) r = { crash: false, cross: cross(x, y, tx, ty) };
    else {
      const dx = tx - x, dy = ty - y, len = Math.hypot(dx, dy) || 1;
      let ex = tx, ey = ty, bx = tx, by = ty;
      if (t >= 0) { ex = x + dx * t; ey = y + dy * t; const b = Math.max(0, t - 0.04 / len); bx = x + dx * b; by = y + dy * b; }
      const cand = pts.filter(([px, py]) => !(avoid && px === avoid[0] && py === avoid[1]))
        .map(([px, py]) => [px, py, (px - bx) ** 2 + (py - by) ** 2])
        .sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
      let rp = cand.find(([px, py]) => wallHit(bx, by, px, py) < 0) || cand[0];
      r = { crash: true, ex: +ex.toFixed(2), ey: +ey.toFixed(2), rx: rp[0], ry: rp[1], cross: cross(x, y, bx, by) + cross(bx, by, rp[0], rp[1]) };
    }
    if (!avoid) T.driveCache.set(key, r);
    return r;
  };
  return (cache[id] = T);
}

// ---------- state ----------
const PEN = { 1: 1, 2: 2, 3: 3, out: 'out' };

function create(trackId = 'loop', { penalty = 2, first = 0 } = {}) {
  const T = track(trackId);
  return {
    track: T.id, penalty: PEN[penalty] ?? 2, first, turn: first, n: 0, over: false, winner: -1, pending: -1, reason: '',
    cars: [0, 1].map((p) => {
      const [x, y] = T.starts[p];
      return { x, y, vx: 0, vy: 0, laps: 0, skip: 0, crashes: 0, trail: [[x, y]] };
    }),
  };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

// The 9 candidate moves for the player to move (or player p).
function options(s, p = s.turn) {
  const T = track(s.track), c = s.cars[p], o = s.cars[1 - p], out = [];
  for (let ay = -1; ay <= 1; ay++) for (let ax = -1; ax <= 1; ax++) {
    const vx = c.vx + ax, vy = c.vy + ay, x = c.x + vx, y = c.y + vy;
    const r = T.drive(c.x, c.y, x, y);
    out.push({ ax, ay, x, y, crash: r.crash, blocked: !r.crash && x === o.x && y === o.y });
  }
  return out;
}
const legal = (s) => options(s).filter((m) => !m.blocked);

// Apply move {ax, ay} for the player to move. Returns an event summary (or null if illegal).
function apply(s, m) {
  if (s.over) return null;
  const p = s.turn, q = 1 - p, T = track(s.track), c = s.cars[p], o = s.cars[q];
  const ax = Math.sign(m.ax | 0), ay = Math.sign(m.ay | 0);
  const vx = c.vx + ax, vy = c.vy + ay, tx = c.x + vx, ty = c.y + vy;
  let r = T.drive(c.x, c.y, tx, ty);
  if (!r.crash && tx === o.x && ty === o.y) return null;
  if (r.crash && r.rx === o.x && r.ry === o.y) r = T.drive(c.x, c.y, tx, ty, [o.x, o.y]);
  const ev = { p, from: [c.x, c.y], speed: Math.max(Math.abs(vx), Math.abs(vy)), crash: r.crash, finished: false, skipped: [] };
  s.n++;
  c.laps += r.cross;
  if (r.crash) {
    c.trail.push([r.rx, r.ry, r.ex, r.ey]);
    c.x = r.rx; c.y = r.ry; c.vx = 0; c.vy = 0; c.crashes++;
    ev.exit = [r.ex, r.ey];
    if (s.penalty === 'out') return end(s, q, 'crash', ev);
    c.skip = s.penalty;
  } else {
    c.trail.push([tx, ty]);
    c.x = tx; c.y = ty; c.vx = vx; c.vy = vy;
  }
  ev.to = [c.x, c.y];
  if (c.laps >= 1) {
    ev.finished = true;
    if (s.pending === q) {
      const a = T.togo(c.x, c.y), b = T.togo(o.x, o.y);
      return end(s, a === b ? -1 : a < b ? p : q, 'photo', ev);
    }
    if (p === s.first && o.skip === 0) { s.pending = p; s.turn = q; ev.reply = true; return ev; }
    return end(s, p, 'finish', ev);
  }
  if (s.pending === q) return end(s, q, 'finish', ev);
  let n = q;
  while (s.cars[n].skip > 0) { s.cars[n].skip--; ev.skipped.push(n); n = 1 - n; }
  s.turn = n;
  return ev;
}
function end(s, w, reason, ev) {
  s.over = true; s.winner = w; s.reason = reason; s.pending = -1;
  ev.over = true;
  return ev;
}

const isOver = (s) => s.over;

// Lap progress 0..1 (for the cards and for the computer's sense of who leads).
function progress(s, p) {
  const T = track(s.track), c = s.cars[p];
  if (c.laps >= 1) return 1;
  if (c.laps < 0) return 0;
  const g0 = T.togo(...T.starts[p]);
  return Math.max(0, Math.min(1, 1 - T.togo(c.x, c.y) / g0));
}
// Unbounded race position (laps × L + distance covered); larger is better.
function position(s, p) {
  const T = track(s.track), c = s.cars[p];
  return (c.laps + 1) * T.L - T.togo(c.x, c.y);
}

// ---------- AI ----------
// Exact shortest race (in turns) by Dijkstra over (x, y, vx, vy, lap-state); a crash costs 1 + penalty.
const SV = 2 * VM + 1;
const SN = (W + 1) * (H + 1) * SV * SV * 2;
let distBuf = null, firstBuf = null;
function plan(s, p, cap = VM) {
  const T = track(s.track), c = s.cars[p], o = s.cars[1 - p];
  const pen = (s.penalty === 'out' ? 60 : s.penalty) + 2; // crashing on purpose looks silly: only when it clearly pays
  if (!distBuf) { distBuf = new Int16Array(SN); firstBuf = new Int8Array(SN); }
  const dist = distBuf.fill(-1), first = firstBuf;
  const enc = (x, y, vx, vy, l) => ((((y * (W + 1) + x) * SV + vx + VM) * SV + vy + VM) << 1) | (l + 1);
  const buckets = [[]];
  const push = (cost, k, f) => {
    if (dist[k] >= 0 && dist[k] <= cost) return;
    dist[k] = cost; first[k] = f;
    (buckets[cost] ||= []).push(k);
  };
  let best = null; // {cost, togo, f}
  const goal = (cost, x, y, f) => {
    const g = T.togo(x, y);
    if (!best || cost < best.cost || (cost === best.cost && g < best.togo)) best = { cost, togo: g, f };
  };
  const expand = (x, y, vx, vy, l, cost, f0) => {
    for (let i = 0; i < 9; i++) {
      const nvx = vx + (i % 3) - 1, nvy = vy + ((i / 3) | 0) - 1;
      const tx = x + nvx, ty = y + nvy;
      const r = T.drive(x, y, tx, ty);
      const f = f0 < 0 ? i : f0;
      if (f0 < 0 && !r.crash && tx === o.x && ty === o.y) continue;
      const nl = l + r.cross;
      if (!r.crash) {
        if (Math.abs(nvx) > cap || Math.abs(nvy) > cap) continue;
        if (nl >= 1) { goal(cost + 1, tx, ty, f); continue; }
        if (nl < -1) continue;
        push(cost + 1, enc(tx, ty, nvx, nvy, nl), f);
      } else {
        if (nl >= 1) { goal(cost + 1 + pen, r.rx, r.ry, f); continue; }
        if (nl < -1) continue;
        push(cost + 1 + pen, enc(r.rx, r.ry, 0, 0, nl), f);
      }
    }
  };
  expand(c.x, c.y, c.vx, c.vy, Math.max(-1, Math.min(0, c.laps)), 0, -1);
  for (let cost = 1; cost < buckets.length; cost++) {
    if (best && cost >= best.cost) break;
    const b = buckets[cost];
    if (!b) continue;
    for (const k of b) {
      if (dist[k] !== cost) continue;
      const l = (k & 1) - 1, r0 = k >> 1;
      const vy = (r0 % SV) - VM, r1 = (r0 / SV) | 0, vx = (r1 % SV) - VM, pi = (r1 / SV) | 0;
      expand(pi % (W + 1), (pi / (W + 1)) | 0, vx, vy, l, cost, first[k]);
    }
  }
  return best;
}

function aiMove(s, level = 'normal') {
  const opts = legal(s);
  const p = s.turn, c = s.cars[p];
  if (!opts.length) return { ax: 0, ay: 0 };
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];
  if (level === 'easy') {
    // Greedy: the step that looks like the most progress, cruising at a modest speed,
    // with no thought about braking for the next bend (so it does crash now and then).
    const safe = opts.filter((m) => !m.crash);
    const calm = safe.filter((m) => Math.abs(m.x - c.x) <= 3 && Math.abs(m.y - c.y) <= 3);
    const pool = calm.length ? calm : safe.length ? safe : opts;
    if (Math.random() < 0.2) return rnd(pool);
    let best = null, bv = -Infinity;
    for (const m of pool) {
      const sim = clone(s); apply(sim, m);
      const v = position(sim, p) + Math.random() * 1.5;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  if (level === 'normal') {
    // Plans the whole lap but keeps to speed 3, and now and then settles for a move one turn worse.
    const pen = s.penalty === 'out' ? 60 : s.penalty;
    const scored = opts.map((m) => {
      const sim = clone(s), ev = apply(sim, m);
      let cost = m.crash ? 1 + pen + 2 : 1;
      if (sim.cars[p].laps < 1) { const b = plan(sim, p, 3); cost += b ? b.cost : 99; }
      return { m, cost: ev && ev.over && sim.winner === p ? 0 : cost };
    });
    const min = Math.min(...scored.map((x) => x.cost));
    const near = scored.filter((x) => x.cost <= min + 1 && !x.m.crash);
    if (near.length > 1 && Math.random() < 0.25) return rnd(near).m;
    return rnd(scored.filter((x) => x.cost === min)).m;
  }
  const best = plan(s, p, VM);
  if (best) return { ax: (best.f % 3) - 1, ay: ((best.f / 3) | 0) - 1 };
  const safe = opts.filter((m) => !m.crash);
  return (safe.length ? safe : opts)[0];
}

export const RT = { W, H, TRACKS, track, create, clone, options, legal, apply, isOver, progress, position, aiMove, plan };
