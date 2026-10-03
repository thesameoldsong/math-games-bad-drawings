// Quantum Go Fish — pure game logic + AI (no DOM).
//
// Nobody's cards have a suit until the game forces one. The state stores only public FACTS:
//   hand[p]       — how many cards player p holds
//   known[p][s]   — cards of p already pinned down as suit s (by asking for s, or received as s)
//   excl[p][s]    — p said "no" to s: p's still-unknown cards are not s
// Everything else is deduced: the facts are consistent iff the unknown cards can be dealt out so that
// every suit has exactly 4 cards — a small bipartite max-flow (players → suits).
//
// Turn: the asker picks another player and a suit they "have" (asking pins one of their cards to it),
// the asked player answers "yes" (hands over exactly one card of that suit) or "no".
// A move that would make the facts contradictory (a paradox) is illegal.
// At the end of the asker's turn they win if they provably hold four of a suit, or if every hand is determined.

const SIZE = 4; // cards per suit and per starting hand

// ---------- tiny max-flow ----------
// Players 0..n-1 hold u[p] unknown cards; suit s still needs r[s] cards; allow[p][s] says whether an unknown
// card of p may be s; cap (optional) limits the p→s edge. Returns the flow matrix or null if not saturating.
function assign(n, u, r, allow, cap) {
  const N = 2 * n + 2, S = 2 * n, T = 2 * n + 1;
  const c = Array.from({ length: N }, () => new Array(N).fill(0));
  let need = 0;
  for (let p = 0; p < n; p++) { c[S][p] = u[p]; need += u[p]; }
  for (let s = 0; s < n; s++) c[n + s][T] = r[s];
  for (let p = 0; p < n; p++) for (let s = 0; s < n; s++) if (allow[p][s]) c[p][n + s] = cap && cap[p] && cap[p][s] != null ? cap[p][s] : 99;
  let flow = 0;
  const prev = new Array(N);
  for (;;) {
    prev.fill(-1); prev[S] = S;
    const q = [S];
    for (let i = 0; i < q.length && prev[T] < 0; i++) {
      const x = q[i];
      for (let y = 0; y < N; y++) if (prev[y] < 0 && c[x][y] > 0) { prev[y] = x; q.push(y); }
    }
    if (prev[T] < 0) break;
    let aug = Infinity;
    for (let y = T; y !== S; y = prev[y]) aug = Math.min(aug, c[prev[y]][y]);
    for (let y = T; y !== S; y = prev[y]) { c[prev[y]][y] -= aug; c[y][prev[y]] += aug; }
    flow += aug;
  }
  if (flow !== need) return null;
  // flow on p→s = residual on the reverse edge
  return Array.from({ length: n }, (_, p) => Array.from({ length: n }, (_, s) => c[n + s][p]));
}

function parts(st) {
  const n = st.n, u = [], r = new Array(n).fill(SIZE), allow = [];
  for (let p = 0; p < n; p++) {
    let k = 0;
    for (let s = 0; s < n; s++) { k += st.known[p][s]; r[s] -= st.known[p][s]; }
    u.push(st.hand[p] - k);
    allow.push(st.excl[p].map((x) => !x));
  }
  return { n, u, r, allow };
}
const sane = ({ u, r }) => u.every((x) => x >= 0) && r.every((x) => x >= 0);

function solve(st, tweak) {
  const P = parts(st);
  if (tweak) tweak(P);
  if (!sane(P)) return null;
  return assign(P.n, P.u, P.r, P.allow, P.cap);
}

const clone = (st) => ({
  ...st,
  hand: st.hand.slice(),
  known: st.known.map((r) => r.slice()),
  excl: st.excl.map((r) => r.slice()),
  ask: st.ask && { ...st.ask },
  last: st.last && { ...st.last },
  look: st.look.slice(),
});

function shuffle(a, rnd) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function create(n = 4, { first = 0, rnd = Math.random, looks = 8 } = {}) {
  return {
    n,
    hand: new Array(n).fill(SIZE),
    known: Array.from({ length: n }, () => new Array(n).fill(0)),
    excl: Array.from({ length: n }, () => new Array(n).fill(false)),
    named: 0,          // suits 0..named-1 have been mentioned; the rest are interchangeable
    turn: first,
    phase: 'ask',      // 'ask' | 'answer' | 'over'
    ask: null,         // {from, to, suit} while waiting for the answer
    moves: 0,          // moves applied (asks + answers) — the online move counter
    turns: 0,          // completed turns
    idle: 0,           // completed turns in a row that taught nobody anything
    winner: -1, winBy: null, winSuit: -1, draw: false,
    last: null,        // last completed exchange, for the UI
    look: shuffle(Array.from({ length: looks }, (_, i) => i), rnd).slice(0, n), // which drawing/name each suit gets
  };
}

const actor = (st) => (st.phase === 'answer' ? st.ask.to : st.phase === 'ask' ? st.turn : -1);
const unknown = (st, p) => st.hand[p] - st.known[p].reduce((a, b) => a + b, 0);
const info = (st) => {
  let k = 0;
  for (let p = 0; p < st.n; p++) for (let s = 0; s < st.n; s++) k += st.known[p][s] + (st.excl[p][s] ? 1 : 0);
  return k;
};
const feasible = (st) => !!solve(st);

// Can p claim (pin) one more card as suit s? (asking for a suit you have no pinned card of)
function canPin(st, p, s) {
  if (st.excl[p][s] || unknown(st, p) <= 0) return false;
  return !!solve(st, (P) => { P.u[p]--; P.r[s]--; });
}
// p may ask for s if they hold a pinned s, or can pin one without a paradox. s === named is "a new suit".
function canHold(st, p, s) {
  if (!Number.isInteger(s) || s < 0 || s >= st.n || s > st.named) return false;
  return st.known[p][s] > 0 || canPin(st, p, s);
}

function askMoves(st) {
  if (st.phase !== 'ask') return [];
  const p = st.turn, out = [];
  const suits = [];
  for (let s = 0; s <= Math.min(st.named, st.n - 1); s++) if (canHold(st, p, s)) suits.push(s);
  for (let q = 0; q < st.n; q++) {
    if (q === p || st.hand[q] === 0) continue;
    for (const s of suits) out.push({ t: 'ask', to: q, suit: s });
  }
  return out;
}

// Which answers keep the facts consistent?
function answers(st) {
  if (st.phase !== 'answer') return { yes: false, no: false };
  const { to: q, suit: s } = st.ask;
  const yes = st.known[q][s] > 0 || canPin(st, q, s);
  const no = st.known[q][s] === 0 && !!solve(st, (P) => { P.allow[q][s] = false; });
  return { yes, no };
}

function legalMoves(st) {
  if (st.phase === 'ask') return askMoves(st);
  if (st.phase === 'answer') {
    const a = answers(st), out = [];
    if (a.yes) out.push({ t: 'answer', yes: true });
    if (a.no) out.push({ t: 'answer', yes: false });
    return out;
  }
  return [];
}

function isLegal(st, m) {
  if (!m) return false;
  if (st.phase === 'ask' && m.t === 'ask') {
    return Number.isInteger(m.to) && m.to >= 0 && m.to < st.n && m.to !== st.turn && st.hand[m.to] > 0 && canHold(st, st.turn, m.suit);
  }
  if (st.phase === 'answer' && m.t === 'answer') return !!answers(st)[m.yes ? 'yes' : 'no'];
  return false;
}

// ---------- deductions ----------
// Smallest number of s that p must hold (pinned + forced among unknowns).
function minOf(st, p, s) {
  const u = unknown(st, p);
  for (let c = 0; c <= u; c++) {
    if (solve(st, (P) => { P.cap = { [p]: { [s]: c } }; })) return st.known[p][s] + c;
  }
  return st.known[p][s] + u;
}
// Could p's unknown cards include s at all?
const mayHave = (st, p, s) => canPin(st, p, s);

// Is there exactly one way to complete everybody's hand? Take one solution and check that no
// player/suit count in it can move up or down.
function determined(st) {
  const f = solve(st);
  if (!f) return false;
  const P = parts(st);
  for (let p = 0; p < st.n; p++) {
    if (P.u[p] === 0) continue;
    for (let s = 0; s < st.n; s++) {
      if (!P.allow[p][s] || P.r[s] === 0) continue;
      const k = f[p][s];
      if (k > 0 && solve(st, (Q) => { Q.cap = { [p]: { [s]: k - 1 } }; })) return false;
      if (k < P.u[p] && k < P.r[s] && solve(st, (Q) => { Q.u[p] -= k + 1; Q.r[s] -= k + 1; })) return false;
    }
  }
  return true;
}

// Suit that p provably holds four of, or -1.
function fourOf(st, p) {
  const u = unknown(st, p);
  for (let s = 0; s < st.n; s++) {
    const k = st.known[p][s];
    if (k >= SIZE) return s;
    if (k + u < SIZE) continue;
    if (!solve(st, (P) => { P.cap = { [p]: { [s]: SIZE - 1 - k } }; })) return s;
  }
  return -1;
}

// Full picture for the UI: forced counts, impossible suits, and one complete solution when determined.
function deduce(st) {
  const n = st.n, min = [], may = [];
  for (let p = 0; p < n; p++) {
    min.push([]); may.push([]);
    for (let s = 0; s < n; s++) { min[p].push(minOf(st, p, s)); may[p].push(mayHave(st, p, s)); }
  }
  return { min, may, determined: determined(st) };
}

// ---------- moves ----------
function apply(st, m) {
  if (st.phase === 'ask') {
    const p = st.turn, s = m.suit;
    const info0 = info(st);
    const pinned = st.known[p][s] === 0;
    if (pinned) st.known[p][s] = 1;
    const fresh = s === st.named;
    if (fresh) st.named++;
    st.ask = { from: p, to: m.to, suit: s, pinned, fresh, info0 };
    st.phase = 'answer';
    st.moves++;
    return { ask: st.ask };
  }
  if (st.phase !== 'answer') return null;
  const { from: p, to: q, suit: s } = st.ask;
  let pinnedGive = false;
  if (m.yes) {
    if (st.known[q][s] === 0) { st.known[q][s] = 1; pinnedGive = true; }
    st.known[q][s]--; st.known[p][s]++;
    st.hand[q]--; st.hand[p]++;
  } else {
    st.excl[q][s] = true;
  }
  const learned = info(st) > st.ask.info0;
  st.last = { from: p, to: q, suit: s, yes: !!m.yes, pinned: st.ask.pinned, pinnedGive, fresh: st.ask.fresh };
  st.ask = null;
  st.moves++;
  st.turns++;
  st.idle = learned ? 0 : st.idle + 1;
  // end of p's turn: can p claim the win?
  const four = fourOf(st, p);
  if (four >= 0) { st.winner = p; st.winBy = 'four'; st.winSuit = four; st.phase = 'over'; return st.last; }
  if (determined(st)) { st.winner = p; st.winBy = 'all'; st.phase = 'over'; return st.last; }
  if (st.idle >= idleLimit(st)) { st.draw = true; st.phase = 'over'; return st.last; }
  // next player who still has cards
  let t = p;
  do t = (t + 1) % st.n; while (st.hand[t] === 0);
  st.turn = t;
  st.phase = 'ask';
  return st.last;
}

// Three full rounds without any new fact ends the game in a draw (keeps endless card-shuffling finite).
const idleLimit = (st) => 3 * st.hand.filter((h) => h > 0).length;
const isOver = (st) => st.phase === 'over';

// ---------- AI ----------
// Values are vectors, one entry per player (1 = that player wins).
function terminal(st) {
  const v = new Array(st.n).fill(0);
  if (st.draw) return v.fill(0.15);
  v[st.winner] = 1;
  return v;
}
function heuristic(st) {
  const v = [];
  for (let p = 0; p < st.n; p++) {
    const best = Math.max(...st.known[p]);
    v.push(0.2 + 0.04 * best + 0.005 * Math.min(st.hand[p], 8));
  }
  return v;
}

// Better for `me`: higher own value; on a tie, the move that leaves the strongest rival weakest.
function better(a, b, me) {
  if (!b) return true;
  if (a[me] > b[me] + 1e-9) return true;
  if (a[me] < b[me] - 1e-9) return false;
  const top = (v) => Math.max(...v.filter((_, i) => i !== me));
  return top(a) < top(b) - 1e-9;
}

// max^n search: each player maximises their own entry of the value vector. depth counts whole turns.
function evalNode(st, depth) {
  if (st.phase === 'over') return terminal(st);
  if (depth <= 0) return heuristic(st);
  const me = actor(st);
  let best = null;
  for (const m of legalMoves(st)) {
    const c = clone(st);
    apply(c, m);
    const v = evalNode(c, st.phase === 'answer' ? depth - 1 : depth);
    if (better(v, best, me)) best = v;
  }
  return best || heuristic(st);
}

// Scores every legal move for the player to act. Depth 1 = to the end of the current turn:
// the asker spots questions that win whatever the answer; the answerer avoids handing over the game.
function rate(st, depth, rnd) {
  const me = actor(st), out = [];
  for (const m of legalMoves(st)) {
    const c = clone(st);
    apply(c, m);
    const v = evalNode(c, st.phase === 'answer' ? depth - 1 : depth);
    const rival = Math.max(...v.filter((_, i) => i !== me));
    out.push({ m, score: v[me] - rival * 0.01 + rnd() * 0.002 });
  }
  return out;
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

function aiMove(st, level = 'normal', rnd = Math.random) {
  const moves = legalMoves(st);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (level === 'easy') {
    // random, but half the time it notices an answer that hands the asker the game
    if (st.phase === 'answer' && rnd() < 0.5) {
      const safe = moves.filter((m) => { const c = clone(st); apply(c, m); return c.phase !== 'over'; });
      if (safe.length) return pick(safe, rnd);
    }
    if (st.phase === 'ask' && rnd() < 0.5) {
      const wins = rate(st, 1, rnd).filter((x) => x.score > 0.9);
      if (wins.length) return pick(wins, rnd).m;
    }
    return pick(moves, rnd);
  }
  const rated = rate(st, 1, rnd);
  rated.sort((a, b) => b.score - a.score);
  return rated[0].m;
}

export const QGF = {
  SIZE, create, clone, actor, unknown, info, feasible, canHold, canPin, askMoves, answers, legalMoves, isLegal,
  minOf, mayHave, determined, fourOf, deduce, apply, isOver, idleLimit, aiMove,
};
