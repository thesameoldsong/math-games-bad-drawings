// Domineering: pure game logic + AI. No DOM.
// Board R×C, cells hold -1 (empty) or the index of the piece covering them.
// Move = {r, c, o}: o 'h' covers (r,c)+(r,c+1), o 'v' covers (r,c)+(r+1,c).
// Player 0 places horizontally, player 1 vertically. Cram variant: anyone may place either way.
// Whoever cannot place a piece on their turn loses.

function create({ R = 8, C = 8, first = 0, cram = false } = {}) {
  return { R, C, cram, first, turn: first, cells: Array(R * C).fill(-1), pieces: [] };
}
const clone = (s) => ({ ...s, cells: s.cells.slice(), pieces: s.pieces.map((p) => ({ ...p })) });
const orients = (s, p) => (s.cram ? ['h', 'v'] : [p === 0 ? 'h' : 'v']);
const cellsOf = (s, m) => (m.o === 'h' ? [[m.r, m.c], [m.r, m.c + 1]] : [[m.r, m.c], [m.r + 1, m.c]]);

function fits(s, m) {
  if (!m || (m.o !== 'h' && m.o !== 'v') || !Number.isInteger(m.r) || !Number.isInteger(m.c)) return false;
  const [[r1, c1], [r2, c2]] = cellsOf(s, m);
  if (r1 < 0 || c1 < 0 || r2 >= s.R || c2 >= s.C) return false;
  return s.cells[r1 * s.C + c1] < 0 && s.cells[r2 * s.C + c2] < 0;
}
const isLegal = (s, m, p = s.turn) => !!m && orients(s, p).includes(m.o) && fits(s, m);

function moves(s, p = s.turn) {
  const out = [];
  for (const o of orients(s, p))
    for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) if (fits(s, { r, c, o })) out.push({ r, c, o });
  return out;
}
const countMoves = (s, p = s.turn) => moves(s, p).length;
const isOver = (s) => countMoves(s, s.turn) === 0;
// The player who just moved wins once the side to move is stuck.
const winner = (s) => (isOver(s) ? 1 - s.turn : -1);

// Mutates s. Throws on illegal moves so callers can't silently corrupt the board.
function apply(s, m) {
  if (!isLegal(s, m)) throw new Error('illegal move ' + JSON.stringify(m));
  const id = s.pieces.length;
  for (const [r, c] of cellsOf(s, m)) s.cells[r * s.C + c] = id;
  s.pieces.push({ p: s.turn, r: m.r, c: m.c, o: m.o });
  s.turn = 1 - s.turn;
  return id;
}

// "Safe" spots: room for a piece that the opponent can never take away
// (no opponent piece can ever cover either cell). Counted as disjoint placements.
function safeSpots(s, p) {
  if (s.cram) return 0;
  return safeCount(toGrid(s), s.R, s.C, p === 0 ? 0 : 1);
}

// ---------- fast search on a flat Uint8Array ----------
// Move code: cell index * 2 + (0 = horizontal, 1 = vertical).
function toGrid(s) {
  const g = new Uint8Array(s.R * s.C);
  for (let i = 0; i < g.length; i++) g[i] = s.cells[i] >= 0 ? 1 : 0;
  return g;
}
function gen(g, R, C, o, out) {
  out.length = 0;
  if (o === 0) {
    for (let r = 0; r < R; r++) for (let c = 0, i = r * C; c < C - 1; c++, i++) if (!g[i] && !g[i + 1]) out.push(i * 2);
  } else {
    for (let i = 0, n = (R - 1) * C; i < n; i++) if (!g[i] && !g[i + C]) out.push(i * 2 + 1);
  }
  return out;
}
function count(g, R, C, o) {
  let n = 0;
  if (o === 0) { for (let r = 0; r < R; r++) for (let c = 0, i = r * C; c < C - 1; c++, i++) if (!g[i] && !g[i + 1]) n++; }
  else for (let i = 0, k = (R - 1) * C; i < k; i++) if (!g[i] && !g[i + C]) n++;
  return n;
}
// cell can't be used by orientation o (it is boxed in along that direction)
function blocked(g, R, C, i, o) {
  if (o === 1) { const r = (i / C) | 0; return (r === 0 || g[i - C]) && (r === R - 1 || g[i + C]); }
  const c = i % C; return (c === 0 || g[i - 1]) && (c === C - 1 || g[i + 1]);
}
function safeCount(g, R, C, o) {
  let n = 0;
  const other = 1 - o;
  if (o === 0) {
    for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) {
      const i = r * C + c;
      if (!g[i] && !g[i + 1] && blocked(g, R, C, i, other) && blocked(g, R, C, i + 1, other)) { n++; c++; }
    }
  } else {
    for (let c = 0; c < C; c++) for (let r = 0; r < R - 1; r++) {
      const i = r * C + c;
      if (!g[i] && !g[i + C] && blocked(g, R, C, i, other) && blocked(g, R, C, i + C, other)) { n++; r++; }
    }
  }
  return n;
}
// Greedy packing of pieces in either direction (Cram estimate of how many moves remain).
function packing(g, R, C) {
  const h = g.slice();
  let n = 0;
  for (let i = 0; i < h.length; i++) {
    if (h[i]) continue;
    const c = i % C;
    if (c < C - 1 && !h[i + 1]) { h[i] = h[i + 1] = 1; n++; }
    else if (i + C < h.length && !h[i + C]) { h[i] = h[i + C] = 1; n++; }
  }
  return n;
}

const WIN = 100000;

class Searcher {
  constructor(s, deadline) {
    this.R = s.R; this.C = s.C; this.cram = s.cram; this.g = toGrid(s);
    this.deadline = deadline; this.nodes = 0;
    this.tt = new Map();
    // Zobrist-style hashing: two independent 31-bit keys per cell.
    const n = this.R * this.C;
    this.z1 = new Int32Array(n); this.z2 = new Int32Array(n);
    for (let i = 0; i < n; i++) { this.z1[i] = (Math.random() * 2 ** 31) | 0; this.z2[i] = (Math.random() * 2 ** 31) | 0; }
    this.h1 = 0; this.h2 = 0;
    for (let i = 0; i < n; i++) if (this.g[i]) { this.h1 ^= this.z1[i]; this.h2 ^= this.z2[i]; }
    this.bufs = [];
  }
  other(m) { const i = m >> 1; return m & 1 ? i + this.C : i + 1; }
  set(m, v) {
    const a = m >> 1, b = this.other(m);
    this.g[a] = this.g[b] = v;
    this.h1 ^= this.z1[a] ^ this.z1[b]; this.h2 ^= this.z2[a] ^ this.z2[b];
  }
  gen(p, ply) {
    const out = (this.bufs[ply] ||= []);
    const { g, R, C } = this;
    if (this.cram) {
      out.length = 0;
      const tmp = [];
      gen(g, R, C, 0, tmp); out.push(...tmp);
      gen(g, R, C, 1, tmp); out.push(...tmp);
      return out;
    }
    return gen(g, R, C, p, out);
  }
  // Static evaluation from the point of view of player p (to move).
  eval(p) {
    const { g, R, C } = this;
    if (this.cram) {
      const k = packing(g, R, C);
      return k % 2 ? 4 : -4; // odd number of remaining moves favours the side to move
    }
    const mm = count(g, R, C, p), mo = count(g, R, C, 1 - p);
    const sm = safeCount(g, R, C, p), so = safeCount(g, R, C, 1 - p);
    return (mm - mo) * 2 + (sm - so) * 6 + 1;
  }
  // How many enemy placements a move destroys (move ordering).
  hurt(m, p) {
    const { g, R, C } = this;
    const a = m >> 1, b = this.other(m);
    if (this.cram) return 0;
    let n = 0;
    for (const i of [a, b]) {
      if (p === 0) { const r = (i / C) | 0; if (r > 0 && !g[i - C]) n++; if (r < R - 1 && !g[i + C]) n++; }
      else { const c = i % C; if (c > 0 && !g[i - 1]) n++; if (c < C - 1 && !g[i + 1]) n++; }
    }
    return n;
  }
  search(p, depth, alpha, beta, ply) {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) throw this;
    const list = this.gen(p, ply);
    if (!list.length) return -WIN + ply;
    if (depth <= 0) return this.eval(p);
    const key = this.h1 * 2 + p, e = this.tt.get(key);
    let ttMove = -1;
    if (e && e.h2 === this.h2) {
      if (e.depth >= depth) {
        if (e.flag === 0) return e.val;
        if (e.flag === 1 && e.val >= beta) return e.val;
        if (e.flag === -1 && e.val <= alpha) return e.val;
      }
      ttMove = e.move;
    }
    const ms = list.slice();
    const sc = ms.map((m) => (m === ttMove ? 1000 : this.hurt(m, p) * 4 + Math.random()));
    const idx = ms.map((_, i) => i).sort((x, y) => sc[y] - sc[x]);
    const a0 = alpha;
    let best = -Infinity, bestMove = ms[idx[0]];
    for (const k of idx) {
      const m = ms[k];
      this.set(m, 1);
      const v = -this.search(1 - p, depth - 1, -beta, -alpha, ply + 1);
      this.set(m, 0);
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (this.tt.size > 400000) this.tt.clear();
    this.tt.set(key, { h2: this.h2, depth, val: best, flag: best <= a0 ? -1 : best >= beta ? 1 : 0, move: bestMove });
    return best;
  }
  // Root search: returns {move, val, depth}.
  root(p, maxDepth) {
    const list = this.gen(p, 0).slice();
    let order = list.map((m) => ({ m, s: this.hurt(m, p) * 4 + Math.random() })).sort((a, b) => b.s - a.s).map((x) => x.m);
    let best = { move: order[0], val: 0, depth: 0 };
    for (let d = 1; d <= maxDepth; d++) {
      try {
        let alpha = -Infinity, bm = order[0];
        const vals = new Map();
        for (const m of order) {
          this.set(m, 1);
          let v;
          try { v = -this.search(1 - p, d - 1, -Infinity, -alpha + 0.5, 1); }
          finally { this.set(m, 0); }
          vals.set(m, v);
          if (v > alpha) { alpha = v; bm = m; }
        }
        // Proven loss against perfect play: keep the last heuristic choice, it gives a fallible opponent the most rope.
        if (alpha < -WIN / 2 && best.depth > 0) { best.lost = true; break; }
        best = { move: bm, val: alpha, depth: d };
        order = order.slice().sort((a, b) => (vals.get(b) ?? -Infinity) - (vals.get(a) ?? -Infinity));
        if (alpha > WIN / 2) break; // proven win
        if (alpha < -WIN / 2) break;
        if (d > this.g.reduce((n, x) => n + !x, 0) / 2) break; // searched to the end of the game
      } catch (e) {
        if (e !== this) throw e;
        break;
      }
    }
    return best;
  }
}

const decode = (s, m) => ({ r: ((m >> 1) / s.C) | 0, c: (m >> 1) % s.C, o: m & 1 ? 'v' : 'h' });
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// level: easy | normal | hard. Always returns a legal move (or null if there is none).
function aiMove(s, level = 'normal', opts = {}) {
  const p = s.turn;
  const legal = moves(s, p);
  if (!legal.length) return null;
  if (legal.length === 1) return legal[0];
  if (level === 'easy') {
    if (Math.random() < 0.45) return pick(legal);
    const S = new Searcher(s, Infinity);
    return decode(s, S.root(p, 1).move);
  }
  if (level === 'normal') {
    const S = new Searcher(s, Date.now() + (opts.time ?? 400));
    return decode(s, S.root(p, 2).move);
  }
  const S = new Searcher(s, Date.now() + (opts.time ?? 900));
  return decode(s, S.root(p, opts.depth ?? 40).move);
}

export const DOM = {
  create, clone, moves, countMoves, isLegal, fits, apply, isOver, winner, cellsOf, orients, safeSpots, aiMove,
};
