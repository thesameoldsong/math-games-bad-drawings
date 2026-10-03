// Row Call — tic-tac-toe with shared control. Pure logic + AI, no DOM.
//
// Each turn has two halves:
//   1) the "caller" (st.turn) picks a row or a column that still has an empty cell;
//   2) the opponent chooses an empty cell in that line, and the CALLER's mark goes there.
// If the called line has exactly one empty cell, the mark lands there at once (no choice).
// Whoever first gets K of their own marks in a row (across, down or diagonally) wins.
// A full board without such a row is a draw.
//
// State: { N, K, cells: Int8 values -1 | 0 | 1, turn, phase: 'pick' | 'place', line, winner, win, last, n }
// Actions: { pick: { t: 'r' | 'c', i } }  or  { place: cellIndex }

const WIN = 1000;

function windowsFor(N, K) {
  const out = [];
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    for (const [dr, dc] of dirs) {
      const er = r + dr * (K - 1), ec = c + dc * (K - 1);
      if (er < 0 || er >= N || ec < 0 || ec >= N) continue;
      const w = [];
      for (let k = 0; k < K; k++) w.push((r + dr * k) * N + c + dc * k);
      out.push(w);
    }
  }
  return out;
}

const geoCache = {};
function geo(N, K) {
  const key = N + '_' + K;
  if (geoCache[key]) return geoCache[key];
  const wins = windowsFor(N, K);
  const byCell = Array.from({ length: N * N }, () => []);
  wins.forEach((w, wi) => w.forEach((c) => byCell[c].push(wi)));
  const lines = [];
  for (let i = 0; i < N; i++) {
    lines.push({ t: 'r', i, cells: Array.from({ length: N }, (_, k) => i * N + k) });
    lines.push({ t: 'c', i, cells: Array.from({ length: N }, (_, k) => k * N + i) });
  }
  return (geoCache[key] = { wins, byCell, lines });
}

const lineCells = (N, L) => Array.from({ length: N }, (_, k) => (L.t === 'r' ? L.i * N + k : k * N + L.i));

// Winning window through cell c for player p, or null.
function winAt(cells, N, K, c, p) {
  const { wins, byCell } = geo(N, K);
  for (const wi of byCell[c]) if (wins[wi].every((x) => cells[x] === p)) return wins[wi];
  return null;
}

// ---------- search helpers (work on a plain array of cells) ----------

// Heuristic value of a position for player p, who is about to call a line.
function evaluate(cells, N, K, p) {
  const { wins } = geo(N, K);
  const W = K === 3 ? [0, 2, 9] : [0, 1, 5, 22];
  let v = 0;
  for (const w of wins) {
    let a = 0, b = 0;
    for (const x of w) { const q = cells[x]; if (q === p) a++; else if (q === 1 - p) b++; }
    if (a && !b) v += W[a];
    else if (b && !a) v -= W[b];
  }
  return v;
}

// value for caller p if p's mark lands on c (assumes cells[c] is empty)
function after(cells, N, K, p, c, depth, alpha, beta, ctx) {
  cells[c] = p;
  let v;
  if (winAt(cells, N, K, c, p)) v = WIN + depth;
  else if (!cells.includes(-1)) v = 0;
  else if (depth <= 1 || ctx.stop) v = evaluate(cells, N, K, p);
  else v = -negamax(cells, N, K, 1 - p, depth - 1, -beta, -alpha, ctx);
  cells[c] = -1;
  return v;
}

// value of a called line for caller p: the opponent picks the worst cell for p
function lineValue(cells, N, K, p, empt, depth, alpha, beta, ctx) {
  let v = Infinity;
  for (const c of empt) {
    const x = after(cells, N, K, p, c, depth, alpha, Math.min(v, beta), ctx);
    if (x < v) v = x;
    if (v <= alpha) break;
  }
  return v;
}

function negamax(cells, N, K, p, depth, alpha, beta, ctx) {
  if ((++ctx.nodes & 255) === 0 && Date.now() > ctx.deadline) ctx.stop = true;
  const { lines } = geo(N, K);
  let best = -Infinity;
  const opts = [];
  for (const L of lines) {
    const e = L.cells.filter((x) => cells[x] < 0);
    if (e.length) opts.push(e);
  }
  // short lines first: they are the forcing ones
  opts.sort((a, b) => a.length - b.length);
  for (const e of opts) {
    const v = lineValue(cells, N, K, p, e, depth, alpha, beta, ctx);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

const pickRandom = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

export const RC = {
  create({ N = 4, K = N === 4 ? 3 : 4, first = 0 } = {}) {
    return { N, K, cells: Array(N * N).fill(-1), turn: first, phase: 'pick', line: null, winner: -1, win: null, last: -1, forced: false, n: 0 };
  },

  clone: (s) => JSON.parse(JSON.stringify(s)),

  lineCells,
  windows: (N, K) => geo(N, K).wins,

  empties: (s, L) => lineCells(s.N, L).filter((c) => s.cells[c] < 0),

  // lines that may be called now
  lines(s) {
    if (s.phase !== 'pick' || RC.isOver(s)) return [];
    return geo(s.N, s.K).lines.filter((L) => L.cells.some((c) => s.cells[c] < 0)).map(({ t, i }) => ({ t, i }));
  },

  // who has to act: the caller picks, the opponent places
  actor: (s) => (s.phase === 'pick' ? s.turn : 1 - s.turn),

  isFull: (s) => !s.cells.includes(-1),
  isOver: (s) => s.winner >= 0 || !s.cells.includes(-1),

  legal(s, a) {
    if (!a || RC.isOver(s)) return false;
    if (a.pick) {
      const L = a.pick;
      return s.phase === 'pick' && (L.t === 'r' || L.t === 'c') && Number.isInteger(L.i) && L.i >= 0 && L.i < s.N && RC.empties(s, L).length > 0;
    }
    if (a.place !== undefined) {
      return s.phase === 'place' && Number.isInteger(a.place) && s.cells[a.place] === -1 && lineCells(s.N, s.line).includes(a.place);
    }
    return false;
  },

  // Mutates s. Returns true if a mark was placed (a place action, or a pick with a single free cell).
  apply(s, a) {
    if (!RC.legal(s, a)) throw new Error('illegal action ' + JSON.stringify(a));
    s.n++;
    if (a.pick) {
      s.line = { t: a.pick.t, i: a.pick.i };
      s.phase = 'place';
      s.forced = false;
      const e = RC.empties(s, s.line);
      if (e.length === 1) { s.forced = true; RC._put(s, e[0]); return true; }
      return false;
    }
    s.forced = false;
    RC._put(s, a.place);
    return true;
  },

  _put(s, c) {
    const p = s.turn;
    s.cells[c] = p;
    s.last = c;
    s.phase = 'pick';
    const w = winAt(s.cells, s.N, s.K, c, p);
    if (w) { s.winner = p; s.win = w; return; }
    if (s.cells.includes(-1)) s.turn = 1 - p;
  },

  // cells where p's mark would complete a row right now
  threats(s, p) {
    const out = [];
    for (let c = 0; c < s.cells.length; c++) {
      if (s.cells[c] >= 0) continue;
      s.cells[c] = p;
      if (winAt(s.cells, s.N, s.K, c, p)) out.push(c);
      s.cells[c] = -1;
    }
    return out;
  },

  // lines the caller p could call right now and win no matter where the mark is put
  killerLines(s, p) {
    const tr = new Set(RC.threats(s, p));
    return geo(s.N, s.K).lines
      .filter((L) => { const e = L.cells.filter((c) => s.cells[c] < 0); return e.length && e.every((c) => tr.has(c)); })
      .map(({ t, i }) => ({ t, i }));
  },

  // ---------- AI ----------
  // Returns an action for whoever has to act now. level: easy | normal | hard
  aiAction(s, level = 'normal', rnd = Math.random) {
    if (RC.isOver(s)) return null;
    const { N, K } = s;
    const cells = s.cells.slice();
    const p = s.turn;

    if (level === 'easy') {
      if (s.phase === 'pick') {
        const killers = RC.killerLines(s, p);
        if (killers.length && rnd() < 0.5) return { pick: pickRandom(killers, rnd) };
        return { pick: pickRandom(RC.lines(s), rnd) };
      }
      const e = RC.empties(s, s.line);
      const tr = new Set(RC.threats(s, p));
      const safe = e.filter((c) => !tr.has(c));
      return { place: pickRandom(safe.length && rnd() < 0.75 ? safe : e, rnd) };
    }

    const empty = cells.filter((x) => x < 0).length;
    const ctx = { nodes: 0, stop: false, deadline: Infinity };
    const depths = level === 'hard'
      ? (N === 4 ? [2, 4, 6, 8, 10, 16] : [2, 3, 4, 5])
      : [2];
    const t0 = Date.now(), budget = level === 'hard' ? 450 : Infinity; // ms

    // choose the best option by iterative deepening; keep the last fully finished depth
    let result = null;
    for (const d of depths) {
      const depth = Math.min(d, empty);
      ctx.deadline = t0 + budget;
      let scored;
      if (s.phase === 'pick') {
        scored = RC.lines(s).map((L) => ({ a: { pick: L }, v: lineValue(cells, N, K, p, RC.empties(s, L), depth, -Infinity, Infinity, ctx) }));
      } else {
        // the AI is the placer: minimise the caller's value
        scored = RC.empties(s, s.line).map((c) => ({ a: { place: c }, v: -after(cells, N, K, p, c, depth, -Infinity, Infinity, ctx) }));
      }
      if (ctx.stop && result) break;
      result = scored;
      if (depth >= empty) break;
      const top = Math.max(...scored.map((o) => o.v));
      if (Math.abs(top) >= WIN) break;
    }
    const top = Math.max(...result.map((o) => o.v));
    const slack = level === 'normal' ? 1.5 : 0.01;
    return pickRandom(result.filter((o) => o.v >= top - slack), rnd).a;
  },
};
