// Hold That Line: pure game logic + AI. No DOM.
//
// Dots are numbered i = r * N + c. A move is {from, to}: a straight segment (orthogonal or,
// where allowed, 45° diagonal) that starts at one end of the line and runs over fresh dots only.
// The very first move may join any two dots in a straight line.
//
// Rule sets:
//   sackson4 / sackson5 — Sid Sackson's game: any length, diagonals allowed, grow from either end,
//                         the player who draws the LAST segment loses.
//   lucas               — Édouard Lucas's older game: 6×6 dots, one-step orthogonal moves, grow from the
//                         end the opponent just drew, the player who draws the last segment WINS.

const VARIANTS = {
  sackson4: { N: 4, diag: true, maxLen: 99, bothEnds: true, misere: true },
  sackson5: { N: 5, diag: true, maxLen: 99, bothEnds: true, misere: true },
  lucas: { N: 6, diag: false, maxLen: 1, bothEnds: false, misere: false },
};
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];

const rules = (s) => VARIANTS[s.variant];

function create({ variant = 'sackson4', first = 0 } = {}) {
  const v = VARIANTS[variant] || VARIANTS.sackson4;
  const N = v.N;
  return {
    variant: VARIANTS[variant] ? variant : 'sackson4', N,
    vis: Array(N * N).fill(0),            // 1 = dot already on the line
    diag: Array((N - 1) * (N - 1)).fill(0), // 1 = a diagonal already runs through this unit square
    segs: [],                              // [{from, to, p}] in the order drawn
    ends: null,                            // [a, b] once the first segment is down
    active: null,                          // Lucas: the only end that may grow (null = either end)
    turn: first, first,
  };
}
const clone = (s) => ({
  ...s, vis: s.vis.slice(), diag: s.diag.slice(), segs: s.segs.map((g) => ({ ...g })),
  ends: s.ends && s.ends.slice(),
});

const rc = (s, i) => [Math.floor(i / s.N), i % s.N];
const dirsOf = (v) => (v.diag ? DIRS : DIRS.slice(0, 4));

// Walk a straight line from dot `from` in direction (dr, dc); yields every dot reachable
// over fresh dots (and, for diagonal steps, through unit squares no diagonal has crossed yet).
// When `free` is false the walk ignores what has been drawn (used for the first move's shape).
function* walk(s, from, dr, dc, maxLen, free = true) {
  const N = s.N;
  let [r, c] = rc(s, from);
  for (let k = 1; k <= maxLen; k++) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= N || nc >= N) return;
    const to = nr * N + nc;
    if (free) {
      if (s.vis[to]) return;
      if (dr && dc && s.diag[Math.min(r, nr) * (N - 1) + Math.min(c, nc)]) return;
    }
    yield to;
    r = nr; c = nc;
  }
}

// The ends that may grow this turn.
function growEnds(s) {
  if (!s.ends) return [];
  if (s.active !== null) return [s.active];
  return rules(s).bothEnds || s.segs.length === 1 ? s.ends.slice() : [s.ends[1]];
}

function moves(s) {
  const v = rules(s), out = [];
  if (!s.ends) {
    // First segment: any two dots on a common line (Lucas: neighbours only). Listed once per pair.
    for (let a = 0; a < s.N * s.N; a++) {
      for (const [dr, dc] of dirsOf(v)) {
        if (dr < 0 || (dr === 0 && dc < 0)) continue;
        for (const b of walk(s, a, dr, dc, v.maxLen, false)) out.push({ from: a, to: b });
      }
    }
    return out;
  }
  for (const e of growEnds(s)) {
    for (const [dr, dc] of dirsOf(v)) for (const b of walk(s, e, dr, dc, v.maxLen)) out.push({ from: e, to: b });
  }
  return out;
}

// Direction and length of a segment, or null if it isn't straight / allowed.
function shape(s, m) {
  const [r1, c1] = rc(s, m.from), [r2, c2] = rc(s, m.to);
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
  if (!len) return null;
  if (dr && dc && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return null;
  if (dr && dc && !rules(s).diag) return null;
  if (len > rules(s).maxLen) return null;
  return { dr, dc, len };
}

function isLegal(s, m) {
  if (!m || !Number.isInteger(m.from) || !Number.isInteger(m.to)) return false;
  const NN = s.N * s.N;
  if (m.from < 0 || m.to < 0 || m.from >= NN || m.to >= NN) return false;
  const sh = shape(s, m);
  if (!sh) return false;
  if (!s.ends) return true;
  if (!growEnds(s).includes(m.from)) return false;
  let last = -1;
  for (const b of walk(s, m.from, sh.dr, sh.dc, sh.len)) last = b;
  return last === m.to;
}

// Dots a segment passes through, endpoints included.
function dotsOf(s, m) {
  const sh = shape(s, m);
  const out = [m.from];
  for (const b of walk(s, m.from, sh.dr, sh.dc, sh.len, false)) out.push(b);
  return out;
}

// Mutates s. Caller checks legality.
function apply(s, m) {
  const N = s.N, path = dotsOf(s, m);
  for (const d of path) s.vis[d] = 1;
  for (let i = 1; i < path.length; i++) {
    const [r1, c1] = rc(s, path[i - 1]), [r2, c2] = rc(s, path[i]);
    if (r1 !== r2 && c1 !== c2) s.diag[Math.min(r1, r2) * (N - 1) + Math.min(c1, c2)] = 1;
  }
  s.segs.push({ from: m.from, to: m.to, p: s.turn });
  if (!s.ends) s.ends = [m.from, m.to];
  else s.ends[s.ends[0] === m.from ? 0 : 1] = m.to;
  if (!rules(s).bothEnds && s.segs.length >= 2) s.active = m.to;
  s.turn = 1 - s.turn;
  return s;
}

const isOver = (s) => !!s.ends && moves(s).length === 0;
// Sackson: whoever drew the last segment loses, so the stuck player (to move) wins. Lucas: the reverse.
function winner(s) {
  if (!isOver(s)) return -1;
  return rules(s).misere ? s.turn : 1 - s.turn;
}

// ---------------------------------------------------------------------------------------------
// Search. A compact mutable position with make/unmake and numeric keys for the memo table.

class Pos {
  constructor(s) {
    const v = rules(s);
    this.v = v; this.N = s.N; this.NN = s.N * s.N;
    this.vis = Uint8Array.from(s.vis); this.diag = Uint8Array.from(s.diag);
    this.visKey = 0; this.diagKey = 0;
    s.vis.forEach((x, i) => { if (x) this.visKey += 2 ** i; });
    s.diag.forEach((x, i) => { if (x) this.diagKey += 2 ** i; });
    this.dBits = v.diag ? (s.N - 1) * (s.N - 1) : 0;
    this.ends = s.ends ? s.ends.slice() : null;
    this.active = s.active;
    this.nseg = s.segs.length;
    // Precomputed rays: ray[d][dir] = list of {to, cell} along that direction.
    this.rays = [];
    const dirs = dirsOf(v).map(([dr, dc]) => [dr, dc]);
    for (let d = 0; d < this.NN; d++) {
      const r0 = Math.floor(d / s.N), c0 = d % s.N, list = [];
      for (const [dr, dc] of dirs) {
        const ray = [];
        let r = r0, c = c0;
        for (let k = 1; k <= v.maxLen; k++) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= s.N || nc >= s.N) break;
          ray.push({ to: nr * s.N + nc, cell: dr && dc ? Math.min(r, nr) * (s.N - 1) + Math.min(c, nc) : -1 });
          r = nr; c = nc;
        }
        list.push(ray);
      }
      this.rays.push(list);
    }
  }
  growEnds() {
    if (this.active !== null) return [this.active];
    return this.v.bothEnds || this.nseg === 1 ? this.ends : [this.ends[1]];
  }
  // Moves as {from, to, dir, len}: dir indexes rays[from], len is the number of steps.
  gen() {
    const out = [];
    const es = this.growEnds();
    for (const e of es) {
      const rs = this.rays[e];
      for (let di = 0; di < rs.length; di++) {
        const ray = rs[di];
        for (let k = 0; k < ray.length; k++) {
          const st = ray[k];
          if (this.vis[st.to] || (st.cell >= 0 && this.diag[st.cell])) break;
          out.push({ from: e, to: st.to, dir: di, len: k + 1 });
        }
      }
    }
    return out;
  }
  hasMove() {
    for (const e of this.growEnds()) {
      for (const ray of this.rays[e]) {
        const st = ray[0];
        if (st && !this.vis[st.to] && !(st.cell >= 0 && this.diag[st.cell])) return true;
      }
    }
    return false;
  }
  make(m) {
    const ray = this.rays[m.from][m.dir];
    for (let k = 0; k < m.len; k++) {
      const st = ray[k];
      this.vis[st.to] = 1; this.visKey += 2 ** st.to;
      if (st.cell >= 0) { this.diag[st.cell] = 1; this.diagKey += 2 ** st.cell; }
    }
    const undo = { ends: this.ends.slice(), active: this.active };
    this.ends = this.ends.slice();
    this.ends[this.ends[0] === m.from ? 0 : 1] = m.to;
    if (!this.v.bothEnds && this.nseg + 1 >= 2) this.active = m.to;
    this.nseg++;
    return undo;
  }
  unmake(m, u) {
    const ray = this.rays[m.from][m.dir];
    for (let k = 0; k < m.len; k++) {
      const st = ray[k];
      this.vis[st.to] = 0; this.visKey -= 2 ** st.to;
      if (st.cell >= 0) { this.diag[st.cell] = 0; this.diagKey -= 2 ** st.cell; }
    }
    this.ends = u.ends; this.active = u.active; this.nseg--;
  }
  key() {
    const NN = this.NN;
    let k = this.visKey * 2 ** this.dBits + this.diagKey;
    if (this.active !== null) return -(k * NN + this.active) - 1;   // one growing end: negative keys
    const a = Math.min(this.ends[0], this.ends[1]), b = Math.max(this.ends[0], this.ends[1]);
    return k * NN * NN + a * NN + b;                                 // < 2^51 even on 5×5
  }
}

const OUT = Symbol('budget');
const memos = {};   // per variant: key -> true (player to move wins) / false
function memoFor(variant) {
  let m = memos[variant];
  if (!m || m.size > 1e6) m = memos[variant] = new Map();
  return m;
}

// Exact solve with a node budget: true if the player to move wins. Throws OUT when over budget.
function solve(pos, memo, ctl) {
  const k = pos.key();
  const hit = memo.get(k);
  if (hit !== undefined) return hit;
  if (++ctl.nodes > ctl.budget) throw OUT;
  const ms = pos.gen();
  let win;
  if (!ms.length) win = pos.v.misere;
  else {
    win = false;
    for (const m of ms) {
      const u = pos.make(m);
      const r = solve(pos, memo, ctl);
      pos.unmake(m, u);
      if (!r) { win = true; break; }
    }
  }
  memo.set(k, win);
  return win;
}

// Random playout from pos (player to move = "me"). Returns true if "me" wins.
// Light policy: avoid moves that instantly lose, take moves that instantly win.
function playout(pos, rnd) {
  const stack = [];
  let me = true;
  for (;;) {
    const ms = pos.gen();
    if (!ms.length) { const res = pos.v.misere ? me : !me; while (stack.length) { const [m, u] = stack.pop(); pos.unmake(m, u); } return res; }
    let pick = null;
    // Sample a few candidates and prefer a non-suicidal / winning one.
    for (let tries = 0; tries < 4 && pick === null; tries++) {
      const m = ms[Math.floor(rnd() * ms.length)];
      const u = pos.make(m);
      const stuck = !pos.hasMove();
      pos.unmake(m, u);
      if (stuck === !pos.v.misere) pick = m;          // a move that wins on the spot
      else if (!stuck && tries >= 1) pick = m;
    }
    if (pick === null) pick = ms[Math.floor(rnd() * ms.length)];
    stack.push([pick, pos.make(pick)]);
    me = !me;
  }
}

const LEVELS = {
  easy: { budget: 0, playouts: 0 },
  normal: { budget: 2500, playouts: 24, keep: false },
  hard: { budget: 400000, playouts: 200, keep: true },
};

// Evaluate the position for the player to move: {win: true|false|null (unknown)}.
function evaluate(s, budget = 20000) {
  if (!s.ends) return null;
  const pos = new Pos(s), memo = memoFor(s.variant);
  try { return solve(pos, memo, { nodes: 0, budget }); } catch (e) { if (e !== OUT) throw e; return null; }
}

function aiMove(s, level = 'normal', rnd = Math.random) {
  const all = moves(s);
  if (!all.length) return null;
  const L = { ...(LEVELS[level] || LEVELS.normal) };
  if (level === 'normal' && !rules(s).bothEnds) L.budget = 150; // Lucas's game is tiny: keep 'normal' fallible
  if (!s.ends) {
    // Opening: try to prove a winning first segment within the budget, else play a sensible one:
    // a short segment near the middle keeps the most options open.
    const c = (s.N - 1) / 2;
    const score = (m) => { const [r1, c1] = rc(s, m.from), [r2, c2] = rc(s, m.to); return Math.hypot((r1 + r2) / 2 - c, (c1 + c2) / 2 - c) + Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)) * 0.6 + rnd() * 1.5; };
    if (level === 'easy') return all[Math.floor(rnd() * all.length)];
    const memo = L.keep ? memoFor(s.variant) : new Map();
    const shuffled = all.slice().sort(() => rnd() - 0.5);
    let spent = 0;
    for (const m of shuffled) {
      if (spent > L.budget) break;
      const c2 = clone(s); apply(c2, m);
      const pos = new Pos(c2), ctl = { nodes: 0, budget: L.budget - spent };
      let r = null;
      try { r = solve(pos, memo, ctl); } catch (e) { if (e !== OUT) throw e; }
      spent += ctl.nodes + 1;
      if (r === false) return m;
    }
    return all.reduce((a, b) => (score(b) < score(a) ? b : a));
  }
  const memo = L.keep ? memoFor(s.variant) : new Map(); // only the hard level remembers what it learned
  const pos = new Pos(s);
  const gen = pos.gen();
  const v = rules(s);

  // One-ply facts: does a move leave the opponent stuck?
  const info = gen.map((m) => {
    const u = pos.make(m);
    const stuck = !pos.hasMove();
    pos.unmake(m, u);
    return { m, stuck, instantWin: stuck && !v.misere, instantLoss: stuck && v.misere };
  });
  const pickRandom = (arr) => arr[Math.floor(rnd() * arr.length)];
  const toMove = (x) => ({ from: x.m.from, to: x.m.to });

  if (level === 'easy') {
    const wins = info.filter((x) => x.instantWin);
    if (wins.length && rnd() < 0.7) return toMove(pickRandom(wins));
    const safe = info.filter((x) => !x.instantLoss);
    if (safe.length && rnd() < 0.75) return toMove(pickRandom(safe));
    return toMove(pickRandom(info));
  }

  const wins = info.filter((x) => x.instantWin);
  if (wins.length) return toMove(pickRandom(wins));

  // Exact search per move within the budget; proven wins are played, proven losses avoided.
  const ctl = { nodes: 0, budget: L.budget };
  const unknown = [];
  const losing = [];
  const order = info.slice().sort(() => rnd() - 0.5);
  for (const x of order) {
    const u = pos.make(x.m);
    let r = null;
    try { r = solve(pos, memo, ctl); } catch (e) { if (e !== OUT) throw e; }
    pos.unmake(x.m, u);
    if (r === false) return toMove(x);   // opponent loses from there
    if (r === true) losing.push(x); else unknown.push(x);
    if (ctl.nodes >= ctl.budget) ctl.budget = ctl.nodes + Math.floor(L.budget / 40); // the rest get a quick look
  }
  if (!unknown.length) {
    // Everything loses against perfect play: pick the move that keeps the game longest / murkiest.
    const notInstant = losing.filter((x) => !x.instantLoss);
    return toMove(pickRandom(notInstant.length ? notInstant : losing));
  }
  if (unknown.length === 1) return toMove(unknown[0]);
  // Monte-Carlo playouts among the unproven moves.
  let best = null, bestScore = -1;
  for (const x of unknown) {
    const u = pos.make(x.m);
    let w = 0;
    for (let i = 0; i < L.playouts; i++) if (!playout(pos, rnd)) w++;
    pos.unmake(x.m, u);
    const sc = w / L.playouts + rnd() * 0.02;
    if (sc > bestScore) { bestScore = sc; best = x; }
  }
  return toMove(best);
}

export const HTL = {
  VARIANTS, create, clone, moves, isLegal, apply, isOver, winner, dotsOf, growEnds, rc, aiMove, evaluate,
};
