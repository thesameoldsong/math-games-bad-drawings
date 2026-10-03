// Battleship (salvo-count version): pure game logic + AI. No DOM.
//
// Each player secretly places five ships (lengths 5, 4, 3, 3, 2) in straight lines on a 10×10 grid.
// Ships may not overlap or leave the grid; touching is allowed (the rules don't forbid it).
// Players take turns firing a salvo of three different squares they haven't fired at before.
// The defender reports only HOW MANY of the three were hits (variant 'exact': which ones), plus the
// length of every ship that the salvo finished off. First to sink the whole enemy fleet wins.
//
// Cells are indices 0..99 (r * 10 + c). A ship is { r, c, len, dir: 'h' | 'v' }.

const N = 10, CELLS = N * N;
const SHIPS = [5, 4, 3, 3, 2];
const SHOTS = 3;
const TOTAL = SHIPS.reduce((a, b) => a + b, 0);

const idx = (r, c) => r * N + c;
const rc = (i) => [Math.floor(i / N), i % N];

function shipCells(s) {
  const out = [];
  for (let k = 0; k < s.len; k++) out.push(s.dir === 'h' ? idx(s.r, s.c + k) : idx(s.r + k, s.c));
  return out;
}
function fits(s) {
  return Number.isInteger(s.r) && Number.isInteger(s.c) && s.r >= 0 && s.c >= 0 &&
    (s.dir === 'h' ? s.c + s.len <= N && s.r < N : s.r + s.len <= N && s.c < N);
}

// Fleet must be exactly SHIPS (in order), inside the grid, without overlaps.
function validFleet(f) {
  if (!Array.isArray(f) || f.length !== SHIPS.length) return false;
  const used = new Set();
  for (let k = 0; k < SHIPS.length; k++) {
    const s = f[k];
    if (!s || s.len !== SHIPS[k] || (s.dir !== 'h' && s.dir !== 'v') || !fits(s)) return false;
    for (const i of shipCells(s)) { if (used.has(i)) return false; used.add(i); }
  }
  return true;
}
// Index of the ship occupying each cell (-1 = water).
function occupancy(f) {
  const o = new Array(CELLS).fill(-1);
  f.forEach((s, k) => shipCells(s).forEach((i) => (o[i] = k)));
  return o;
}
// Would ship k fit at s, given the rest of the fleet?
function canPlace(f, k, s) {
  if (!fits(s)) return false;
  const o = occupancy(f.map((x, j) => (j === k ? { ...x, len: 0 } : x)));
  return shipCells(s).every((i) => o[i] < 0);
}

// Random fleet; prefers ships that don't touch (looks tidier), falls back to touching ones.
function randomFleet(rnd = Math.random) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const strict = attempt < 300;
    const blocked = new Set(), f = [];
    let ok = true;
    for (const len of SHIPS) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const dir = rnd() < 0.5 ? 'h' : 'v';
        const r = Math.floor(rnd() * (dir === 'v' ? N - len + 1 : N));
        const c = Math.floor(rnd() * (dir === 'h' ? N - len + 1 : N));
        const s = { r, c, len, dir }, cells = shipCells(s);
        if (cells.some((i) => blocked.has(i))) continue;
        f.push(s);
        for (const i of cells) {
          blocked.add(i);
          if (strict) {
            const [a, b] = rc(i);
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
              const rr = a + dr, cc = b + dc;
              if (rr >= 0 && rr < N && cc >= 0 && cc < N) blocked.add(idx(rr, cc));
            }
          }
        }
        placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return f;
  }
  return [{ r: 0, c: 0, len: 5, dir: 'h' }, { r: 2, c: 0, len: 4, dir: 'h' }, { r: 4, c: 0, len: 3, dir: 'h' },
    { r: 6, c: 0, len: 3, dir: 'h' }, { r: 8, c: 0, len: 2, dir: 'h' }];
}

let gameId = 0;
// exact: false = the book's rule (only the number of hits is reported); true = classic per-shot report.
function create({ first = 0, exact = false } = {}) {
  return {
    id: Date.now().toString(36) + (++gameId),
    phase: 'setup',            // setup → fire → over
    fleets: [null, null],
    ready: [false, false],
    salvos: [[], []],          // salvos[p] = shots fired BY p: { cells, hits, sunk: [len…], marks? }
    turn: first, first, exact: !!exact,
    winner: -1,
    n: 0,                      // move counter (online sync)
  };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

function setFleet(st, p, f) {
  if (st.phase !== 'setup' || st.ready[p] || !validFleet(f)) return false;
  st.fleets[p] = f.map((s) => ({ r: s.r, c: s.c, len: s.len, dir: s.dir }));
  st.ready[p] = true;
  st.n++;
  if (st.ready[0] && st.ready[1]) { st.phase = 'fire'; st.turn = st.first; }
  return true;
}

function firedBy(st, p) {
  const s = new Set();
  for (const v of st.salvos[p]) for (const i of v.cells) s.add(i);
  return s;
}
const shotsLeft = (st, p) => CELLS - firedBy(st, p).size;
const salvoSize = (st, p) => Math.min(SHOTS, shotsLeft(st, p));

// Which of defender d's ships are sunk (array of booleans), from the attacker's shots.
function sunkFlags(st, d) {
  const f = st.fleets[d];
  if (!f) return null;
  const fired = firedBy(st, 1 - d);
  return f.map((s) => shipCells(s).every((i) => fired.has(i)));
}
// Lengths of d's ships sunk so far — public information.
const sunkLengths = (st, d) => st.salvos[1 - d].flatMap((v) => v.sunk);

function legalSalvo(st, p, cells) {
  if (st.phase !== 'fire' || st.turn !== p || !Array.isArray(cells)) return false;
  if (cells.length !== salvoSize(st, p)) return false;
  const fired = firedBy(st, p), seen = new Set();
  for (const i of cells) {
    if (!Number.isInteger(i) || i < 0 || i >= CELLS || fired.has(i) || seen.has(i)) return false;
    seen.add(i);
  }
  return true;
}

// Fire a salvo; returns the public report { hits, sunk } or null if illegal.
function fire(st, p, cells) {
  if (!legalSalvo(st, p, cells)) return null;
  const d = 1 - p, occ = occupancy(st.fleets[d]);
  const before = sunkFlags(st, d);
  const marks = cells.map((i) => occ[i] >= 0);
  const v = { cells: cells.slice(), hits: marks.filter(Boolean).length, sunk: [] };
  if (st.exact) v.marks = marks;
  st.salvos[p].push(v);
  const after = sunkFlags(st, d);
  after.forEach((x, k) => { if (x && !before[k]) v.sunk.push(st.fleets[d][k].len); });
  v.sunk.sort((a, b) => b - a);
  st.n++;
  if (after.every(Boolean)) { st.phase = 'over'; st.winner = p; }
  else st.turn = d;
  return { hits: v.hits, sunk: v.sunk };
}

// What viewer may see: the opponent's fleet stays secret until the game is over.
function redact(st, viewer) {
  const s = clone(st);
  if (s.phase !== 'over') s.fleets[1 - viewer] = null;
  return s;
}

// ---------- deduction from the reports ----------
// For the shots p fired: per cell 1 = certainly a hit, -1 = certainly water, 0 = unknown/unfired.
// frac[i] = remaining hits / remaining unknown cells of that cell's salvo (0..1), or null.
function deduce(salvos) {
  const known = new Array(CELLS).fill(0);
  for (const v of salvos) if (v.marks) v.cells.forEach((i, k) => (known[i] = v.marks[k] ? 1 : -1));
  let changed = true;
  while (changed) {
    changed = false;
    for (const v of salvos) {
      const unk = v.cells.filter((i) => !known[i]);
      if (!unk.length) continue;
      const rem = v.hits - v.cells.filter((i) => known[i] === 1).length;
      if (rem <= 0) { unk.forEach((i) => (known[i] = -1)); changed = true; }
      else if (rem >= unk.length) { unk.forEach((i) => (known[i] = 1)); changed = true; }
    }
  }
  const frac = new Array(CELLS).fill(null);
  for (const v of salvos) {
    const unk = v.cells.filter((i) => !known[i]);
    if (!unk.length) continue;
    const rem = v.hits - v.cells.filter((i) => known[i] === 1).length;
    unk.forEach((i) => (frac[i] = rem / unk.length));
  }
  return { known, frac };
}

// ---------- AI ----------
function remainingLengths(sunk) {
  const left = SHIPS.slice();
  for (const l of sunk) { const k = left.indexOf(l); if (k >= 0) left.splice(k, 1); }
  return left;
}

// Heat map over unfired cells: weighted count of ship placements covering each cell.
// A placement is weighted by how plausible its fired cells are (certain hits pull, uncertain cells
// count by their salvo's hit ratio, certain water forbids it).
function heat(salvos, sunk) {
  const { known, frac } = deduce(salvos);
  const fired = new Set(salvos.flatMap((v) => v.cells));
  const sunkCells = sunk.reduce((a, b) => a + b, 0);
  const sureHits = known.filter((x) => x === 1).length;
  const hitsTotal = salvos.reduce((a, v) => a + v.hits, 0);
  const left = remainingLengths(sunk);
  // prior chance that an unfired cell is a ship cell
  const unfired = CELLS - fired.size;
  const prior = Math.max(0.02, Math.min(0.9, (TOTAL - hitsTotal) / Math.max(1, unfired)));
  // hits that are not yet explained by sunk ships make placements through them attractive
  const liveHits = hitsTotal > sunkCells;
  const w = new Array(CELLS).fill(1);
  for (let i = 0; i < CELLS; i++) {
    if (!fired.has(i)) continue;
    if (known[i] === -1) w[i] = 0;
    else if (known[i] === 1) w[i] = liveHits ? (sureHits > sunkCells ? 8 : 3) : 0.6;
    else w[i] = Math.max(0.05, Math.min(6, (frac[i] ?? 0) / prior)) * (liveHits ? 1 : 0.5);
  }
  const score = new Array(CELLS).fill(0);
  for (const len of left) {
    for (const dir of ['h', 'v']) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const s = { r, c, len, dir };
      if (!fits(s)) continue;
      const cells = shipCells(s);
      let wt = 1;
      for (const i of cells) { wt *= w[i]; if (!wt) break; }
      if (!wt) continue;
      for (const i of cells) if (!fired.has(i)) score[i] += wt;
    }
  }
  return { score, fired };
}

// ---------- Monte Carlo: sample whole enemy fleets that agree with every report ----------
// Energy = how badly a candidate fleet disagrees with the reports (hit counts, sunk lengths, exact marks).
// Simulated annealing finds fleets with energy 0; the share of samples covering a cell ≈ its chance to hide a ship.
function sampler(salvos) {
  const S = salvos.length;
  const sIdx = new Int16Array(CELLS).fill(-1);
  const mark = new Int8Array(CELLS);
  salvos.forEach((v, t) => v.cells.forEach((i, k) => { sIdx[i] = t; if (v.marks) mark[i] = v.marks[k] ? 1 : -1; }));
  const hits = salvos.map((v) => v.hits);
  const sunkAt = salvos.map((v) => v.sunk.slice().sort());
  const cnt = new Int16Array(S);
  function energy(f) {
    cnt.fill(0);
    let e = 0;
    const pred = Array.from({ length: S }, () => []);
    const occ = new Uint8Array(CELLS);
    for (const s of f) {
      let last = -1, done = true;
      for (const i of shipCells(s)) {
        if (occ[i]) e += 50;
        occ[i] = 1;
        const t = sIdx[i];
        if (t < 0) { done = false; continue; }
        cnt[t]++;
        if (t > last) last = t;
      }
      if (done) pred[last].push(s.len);
    }
    for (let i = 0; i < CELLS; i++) if (mark[i] && (mark[i] > 0) !== !!occ[i]) e += 2;
    for (let t = 0; t < S; t++) {
      e += Math.abs(cnt[t] - hits[t]);
      const a = pred[t], b = sunkAt[t];
      if (a.length || b.length) {
        a.sort();
        const rest = b.slice();
        let miss = 0;
        for (const l of a) { const k = rest.indexOf(l); if (k >= 0) rest.splice(k, 1); else miss++; }
        e += 2 * (miss + rest.length);
      }
    }
    return e;
  }
  return energy;
}

function propose(f, rnd) {
  const g = f.slice(), k = Math.floor(rnd() * g.length), s = g[k];
  const m = rnd();
  let n;
  if (m < 0.45) {
    const dir = rnd() < 0.5 ? 'h' : 'v';
    n = { r: Math.floor(rnd() * (dir === 'v' ? N - s.len + 1 : N)), c: Math.floor(rnd() * (dir === 'h' ? N - s.len + 1 : N)), len: s.len, dir };
  } else if (m < 0.85) {
    const d = [[0, 1], [0, -1], [1, 0], [-1, 0]][Math.floor(rnd() * 4)];
    n = { ...s, r: s.r + d[0], c: s.c + d[1] };
  } else n = { ...s, dir: s.dir === 'h' ? 'v' : 'h' };
  if (!fits(n)) return null;
  g[k] = n;
  return g;
}

// Probability map from sampled consistent fleets (null when no consistent fleet was found in budget).
function sampleProbs(salvos, rnd = Math.random, { budget = 24000, chains = 8 } = {}) {
  const energy = sampler(salvos);
  const prob = new Float64Array(CELLS);
  let samples = 0;
  const per = Math.floor(budget / chains);
  for (let ch = 0; ch < chains; ch++) {
    let f = randomFleet(rnd), e = energy(f);
    for (let step = 0; step < per; step++) {
      const T = Math.max(0.08, 1.6 * (1 - step / (per * 0.6)));
      const g = propose(f, rnd);
      if (!g) continue;
      const e2 = energy(g);
      if (e2 <= e || rnd() < Math.exp((e - e2) / T)) { f = g; e = e2; }
      if (e === 0 && step % 25 === 0) {
        samples++;
        for (const s of f) for (const i of shipCells(s)) prob[i]++;
      }
    }
  }
  if (!samples) return null;
  for (let i = 0; i < CELLS; i++) prob[i] /= samples;
  return { prob, samples };
}

function pickRandom(pool, k, rnd) {
  const a = pool.slice(), out = [];
  while (out.length < k && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]);
  return out;
}

// view: a redacted state; p: the AI's seat.
function aiSalvo(view, p, level = 'normal', rnd = Math.random) {
  const k = salvoSize(view, p);
  const salvos = view.salvos[p];
  const sunk = salvos.flatMap((v) => v.sunk);
  const { score, fired } = heat(salvos, sunk);
  const pool = [];
  for (let i = 0; i < CELLS; i++) if (!fired.has(i)) pool.push(i);
  if (level === 'easy') {
    // one aimed shot, the rest at random
    const best = pool.reduce((b, i) => (score[i] * (0.6 + rnd()) > score[b] * (0.6 + rnd()) ? i : b), pool[0]);
    const rest = pickRandom(pool.filter((i) => i !== best), k - 1, rnd);
    return rnd() < 0.5 ? pickRandom(pool, k, rnd) : [best, ...rest];
  }
  if (level === 'hard' && salvos.length) {
    const mc = sampleProbs(salvos, rnd);
    if (mc) {
      const ranked = pool.map((i) => [i, mc.prob[i] + rnd() * 1e-3]).sort((a, b) => b[1] - a[1]);
      return ranked.slice(0, k).map(([i]) => i);
    }
  }
  // normal: greedy on the heat map, with a little noise to break ties and stay unpredictable
  const ranked = pool.map((i) => [i, score[i] * (1 + rnd() * 0.15)]).sort((a, b) => b[1] - a[1]);
  const out = [];
  for (const [i] of ranked) {
    if (out.length >= k) break;
    out.push(i);
  }
  return out;
}
function aiFleet(rnd = Math.random) { return randomFleet(rnd); }

export const BS = {
  N, CELLS, SHIPS, SHOTS, TOTAL,
  idx, rc, shipCells, fits, validFleet, occupancy, canPlace, randomFleet,
  create, clone, setFleet, firedBy, shotsLeft, salvoSize, sunkFlags, sunkLengths, legalSalvo, fire, redact,
  deduce, heat, sampleProbs, remainingLengths, aiSalvo, aiFleet,
};
