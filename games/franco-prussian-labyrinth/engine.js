// Franco-Prussian Labyrinth: pure game logic + AI. No DOM.
//
// Board: N×N cells, cell index = r*N + c. Start = 0 (A1, top-left), goal = N*N-1 (bottom-right).
// A wall is an internal edge between two orthogonally adjacent cells, keyed "a-b" (a < b).
// maze[p] is the labyrinth BUILT by player p — it is walked by the opponent (1-p).
// know[p] is what walker p has learned about maze[1-p]: edgeKey → 1 (open) | 2 (wall).
//
// Variants:
//   classic — 9×9, 30 walls, up to 5 single steps per turn; a bump ends the turn.
//   french  — 10×10, 40 walls, one slide per turn (until a wall or the edge); the next turn may
//             start from any square visited during the previous turn.

export const VARIANTS = {
  classic: { N: 9, W: 30, steps: 5, slide: false },
  french: { N: 10, W: 40, steps: 1, slide: true },
};

const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1]; // up, right, down, left

const ek = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
const goal = (N) => N * N - 1;
function nb(N, cell, d) {
  const r = Math.floor(cell / N) + DR[d], c = (cell % N) + DC[d];
  return r < 0 || c < 0 || r >= N || c >= N ? -1 : r * N + c;
}
function cellsOf(key) { const [a, b] = key.split('-'); return [+a, +b]; }

function allEdges(N) {
  const out = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const a = r * N + c;
    if (c < N - 1) out.push(ek(a, a + 1));
    if (r < N - 1) out.push(ek(a, a + N));
  }
  return out;
}
const isEdge = (N, key) => {
  if (typeof key !== 'string' || !/^\d+-\d+$/.test(key)) return false;
  const [a, b] = cellsOf(key);
  if (a >= b || b >= N * N || key !== ek(a, b)) return false; // canonical form only ("01-2" would never block)
  return (b === a + 1 && a % N !== N - 1) || b === a + N;
};

// Wall as a lattice segment [[x1,y1],[x2,y2]] (x = column line, y = row line); used for drawing.
function segOf(N, key) {
  const [a, b] = cellsOf(key);
  const r = Math.floor(a / N), c = a % N;
  return b === a + 1 ? [[c + 1, r], [c + 1, r + 1]] : [[c, r + 1], [c + 1, r + 1]];
}
// Inverse: a unit segment in lattice coordinates → edge key, or null when it lies on the border.
function edgeOfSeg(N, [x1, y1], [x2, y2]) {
  if (x1 === x2) {
    const x = x1, y = Math.min(y1, y2);
    if (Math.abs(y1 - y2) !== 1 || x < 1 || x > N - 1 || y < 0 || y > N - 1) return null;
    return ek(y * N + x - 1, y * N + x);
  }
  if (y1 === y2) {
    const y = y1, x = Math.min(x1, x2);
    if (Math.abs(x1 - x2) !== 1 || y < 1 || y > N - 1 || x < 0 || x > N - 1) return null;
    return ek((y - 1) * N + x, y * N + x);
  }
  return null;
}

// Is the goal reachable from the start given a set of walls?
function connected(N, walls) {
  const w = walls instanceof Set ? walls : new Set(walls);
  const seen = new Uint8Array(N * N), q = [0];
  seen[0] = 1;
  while (q.length) {
    const c = q.pop();
    if (c === goal(N)) return true;
    for (let d = 0; d < 4; d++) {
      const x = nb(N, c, d);
      if (x >= 0 && !seen[x] && !w.has(ek(c, x))) { seen[x] = 1; q.push(x); }
    }
  }
  return false;
}
function canAddWall(N, walls, key) {
  if (!isEdge(N, key)) return false;
  const w = new Set(walls);
  if (w.has(key)) return false;
  w.add(key);
  return connected(N, w);
}
function validMaze(N, W, walls) {
  return Array.isArray(walls) && walls.length === W && new Set(walls).size === W && walls.every((k) => isEdge(N, k)) && connected(N, walls);
}

// Random labyrinth that keeps the exit reachable. Walls tend to grow into longer lines (like hand-drawn ones).
function randomMaze(N, W, rnd = Math.random, base = []) {
  const walls = new Set(base), edges = allEdges(N);
  let prev = null, tries = 0;
  while (walls.size < W && tries++ < 20000) {
    let e = null;
    if (prev && rnd() < 0.6) {
      const [p, q] = segOf(N, prev), end = rnd() < 0.5 ? p : q, d = Math.floor(rnd() * 4);
      e = edgeOfSeg(N, end, [end[0] + DC[d], end[1] + DR[d]]);
    } else e = edges[Math.floor(rnd() * edges.length)];
    if (!e || walls.has(e)) { prev = null; continue; }
    walls.add(e);
    if (!connected(N, walls)) { walls.delete(e); prev = null; continue; }
    prev = e;
  }
  return [...walls];
}

function create(variant = 'classic', first = 0) {
  const V = VARIANTS[variant] || VARIANTS.classic;
  return {
    v: VARIANTS[variant] ? variant : 'classic', N: V.N, W: V.W, steps: V.steps, slide: V.slide,
    phase: 'build', maze: [null, null], ready: [false, false],
    pos: [0, 0], starts: [[0], [0]], know: [{}, {}], trail: [[], []], moves: [0, 0],
    turn: first, first, left: V.steps, n: 0, winner: -1, last: null,
    id: Math.random().toString(36).slice(2, 9),
  };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

// Player p hands in a finished labyrinth. Returns false if it's not a valid one.
function setMaze(s, p, walls) {
  if (s.phase !== 'build' || !validMaze(s.N, s.W, walls)) return false;
  s.maze[p] = walls.slice();
  s.ready[p] = true;
  if (s.ready[0] && s.ready[1]) s.phase = 'play';
  return true;
}

// Legal moves for the side to move. Never into the border or a wall already discovered.
// classic → {d}; french → {from, d}
function legalMoves(s) {
  if (s.phase !== 'play') return [];
  const p = s.turn, K = s.know[p], out = [];
  const froms = s.slide ? s.starts[p] : [s.pos[p]];
  for (const from of froms) for (let d = 0; d < 4; d++) {
    const x = nb(s.N, from, d);
    if (x >= 0 && K[ek(from, x)] !== 2) out.push(s.slide ? { from, d } : { d });
  }
  return out;
}
const isLegal = (s, m) => !!m && legalMoves(s).some((x) => x.d === m.d && (!s.slide || x.from === m.from));

function endTurn(s) { s.turn = 1 - s.turn; s.left = s.steps; }

// Mutates s. Returns the event, also stored in s.last:
// {p, from, d, path:[cells walked], bump: edgeKey|null, win, turnEnd}
function apply(s, m) {
  const p = s.turn, N = s.N, maze = new Set(s.maze[1 - p]), K = s.know[p];
  const from = s.slide ? m.from : s.pos[p];
  let cur = from, bump = null;
  const path = [from];
  for (;;) {
    const x = nb(N, cur, m.d);
    if (x < 0) break;
    const e = ek(cur, x);
    if (maze.has(e)) { K[e] = 2; bump = e; break; }
    K[e] = 1;
    s.trail[p].push([cur, x]);
    cur = x;
    path.push(cur);
    if (!s.slide || cur === goal(N)) break;
  }
  s.pos[p] = cur;
  s.moves[p]++;
  s.n++;
  const win = cur === goal(N);
  let turnEnd = true;
  if (win) { s.phase = 'over'; s.winner = p; }
  else if (s.slide) { s.starts[p] = path; endTurn(s); }
  else if (bump || --s.left <= 0) endTurn(s);
  else turnEnd = false;
  s.last = { p, from, d: m.d, path, bump, win, turnEnd };
  return s.last;
}

// What one seat may see online: the opponent's labyrinth stays hidden until the game is over.
function redact(s, viewer) {
  const x = clone(s);
  if (x.phase !== 'over') x.maze[1 - viewer] = null;
  return x;
}

// ---------- AI ----------
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
const countWalls = (K) => Object.values(K).filter((v) => v === 2).length;
// Chance that an unexplored edge hides a wall, from what's been found so far.
function wallOdds(s, p) {
  const K = s.know[p], total = 2 * s.N * (s.N - 1);
  const unknown = total - Object.keys(K).length;
  return unknown > 0 ? Math.max(0, s.W - countWalls(K)) / unknown : 0;
}

// Dijkstra from the goal over p's map: known open edge costs 1, unknown 1+pen, known wall is impassable.
function distField(s, p, pen, K = s.know[p]) {
  const N = s.N, n = N * N, dist = new Float64Array(n).fill(Infinity), done = new Uint8Array(n);
  dist[goal(N)] = 0;
  for (let it = 0; it < n; it++) {
    let u = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0) break;
    done[u] = 1;
    for (let d = 0; d < 4; d++) {
      const x = nb(N, u, d);
      if (x < 0 || done[x]) continue;
      const k = K[ek(u, x)];
      if (k === 2) continue;
      const w = k === 1 ? 1 : 1 + pen;
      if (best + w < dist[x]) dist[x] = best + w;
    }
  }
  return dist;
}

function classicMove(s, level, rnd) {
  const p = s.turn, moves = legalMoves(s), N = s.N, at = s.pos[p];
  if (level === 'easy') {
    if (rnd() < 0.3) return pick(moves, rnd);
    // A forgetful explorer: remembers only some of the walls it bumped into.
    const K = {};
    for (const [k, v] of Object.entries(s.know[p])) if (v === 1 || rnd() < 0.55) K[k] = v;
    const dist = distField(s, p, 0, K);
    return bestBy(moves, (m) => dist[nb(N, at, m.d)], rnd);
  }
  const q = wallOdds(s, p);
  const hard = level === 'hard';
  const dist = distField(s, p, 0.1);
  return bestBy(moves, (m) => {
    const x = nb(N, at, m.d), known = s.know[p][ek(at, x)] === 1;
    // An early bump wastes the rest of the turn, so the hard AI saves risky steps for later.
    const risk = known || !hard ? 0 : q * (s.left - 1) * 0.3;
    return (known ? 1 : 1.1) + dist[x] + risk;
  }, rnd);
}

function bestBy(moves, score, rnd) {
  let best = [], bv = Infinity;
  for (const m of moves) {
    const v = score(m);
    if (v < bv - 1e-9) { bv = v; best = [m]; } else if (Math.abs(v - bv) <= 1e-9) best.push(m);
  }
  return pick(best.length ? best : moves, rnd);
}

// Optimistic slide (unknown edges assumed open): list of edges with their knowledge and cells.
function slideOpt(s, p, from, d) {
  const N = s.N, K = s.know[p], cells = [from], ks = [];
  let cur = from;
  for (;;) {
    const x = nb(N, cur, d);
    if (x < 0) break;
    const k = K[ek(cur, x)];
    if (k === 2) break;
    ks.push(k === 1);
    cur = x;
    cells.push(cur);
    if (cur === goal(N)) break;
  }
  return { cells, ks };
}
// Fewest slides to the goal if every unknown edge were open (any visited square may be the next start).
function slideField(s, p) {
  const N = s.N, n = N * N, rev = Array.from({ length: n }, () => []);
  for (let c = 0; c < n; c++) for (let d = 0; d < 4; d++) for (const x of slideOpt(s, p, c, d).cells) if (x !== c) rev[x].push(c);
  const h = new Array(n).fill(Infinity), q = [goal(N)];
  h[goal(N)] = 0;
  for (let i = 0; i < q.length; i++) for (const c of rev[q[i]]) if (h[c] === Infinity) { h[c] = h[q[i]] + 1; q.push(c); }
  return h;
}
function frenchMove(s, level, rnd) {
  const p = s.turn, moves = legalMoves(s), N = s.N, G = goal(N);
  if (level === 'easy' && rnd() < 0.45) return pick(moves, rnd);
  const h = slideField(s, p);
  const q = level === 'hard' ? wallOdds(s, p) : level === 'normal' ? 0.5 * wallOdds(s, p) : 0;
  const man = (c) => (N - 1 - Math.floor(c / N)) + (N - 1 - (c % N));
  return bestBy(moves, (m) => {
    // Expected "best square reached" over where the slide might really stop.
    const { cells, ks } = slideOpt(s, p, m.from, m.d);
    let reach = 1, ev = 0, bestH = h[m.from], bestM = man(m.from);
    for (let i = 0; i < ks.length; i++) {
      const stopHere = ks[i] ? 0 : q;
      ev += reach * stopHere * (bestH + bestM * 0.01);
      reach *= 1 - stopHere;
      const c = cells[i + 1];
      if (c === G) { bestH = -1; bestM = 0; } else { bestH = Math.min(bestH, h[c]); bestM = Math.min(bestM, man(c)); }
    }
    ev += reach * (bestH + bestM * 0.01);
    return ev;
  }, rnd);
}

function aiMove(s, level = 'normal', rnd = Math.random) {
  return s.slide ? frenchMove(s, level, rnd) : classicMove(s, level, rnd);
}

// How many turns does a walker of the given level need to get through this labyrinth?
function solveTurns(variant, walls, level = 'normal', rnd = Math.random, cap = 300) {
  const s = create(variant, 1);
  s.maze = [walls, walls]; s.ready = [true, true]; s.phase = 'play';
  let turns = 0;
  while (s.phase === 'play' && turns < cap) {
    const e = apply(s, aiMove(s, level, rnd));
    if (e.turnEnd) { turns++; if (s.phase === 'play') endTurn(s); }
  }
  return turns;
}

// The computer's own labyrinth: try a few random ones (hard: many) and keep the one a sensible walker finds slowest.
function aiMaze(variant = 'classic', level = 'normal', rnd = Math.random) {
  const { N, W } = VARIANTS[variant] || VARIANTS.classic;
  if (level === 'easy') return randomMaze(N, W, rnd);
  const [tries, sims] = level === 'hard' ? [24, 3] : [5, 1];
  let best = null, bv = -1;
  for (let i = 0; i < tries; i++) {
    const m = randomMaze(N, W, rnd);
    let v = 0;
    for (let k = 0; k < sims; k++) v += solveTurns(variant, m, 'normal', rnd);
    if (v > bv) { bv = v; best = m; }
  }
  return best;
}

export const FPL = {
  VARIANTS, ek, nb, goal, cellsOf, allEdges, isEdge, segOf, edgeOfSeg, connected, canAddWall, validMaze, randomMaze,
  create, clone, setMaze, legalMoves, isLegal, apply, redact, aiMove, aiMaze, solveTurns, wallOdds,
};
