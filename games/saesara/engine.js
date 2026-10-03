// Saesara — pure rules, referee and computer guesser. No DOM.
//
// Board: N×N squares, index sq = r * N + c (r from the top, c from the left).
// Numbers are written in order 1, 2, 3… (optionally after a starting 0). pos[k] = square of number k
// (pos[0] = -1 when the round has no 0). The next number to place is pos.length.
//
// A secret rule (and every guess) is built from "atoms" — yes/no tests on a square:
//   { t: 'all', a, op: null | 'and' | 'or', b }   one test (or two joined) for every number
//   { t: 'par', odd, even }                         one test for odd numbers, another for even ones
//
// Observations are public facts: { n, sq, ok, pre } — "number n may (ok) / may not go on sq",
// in the position where numbers 0…n-1 stand on the real squares, except the last pre.length of them
// which stand on the hypothetical squares listed in pre (the referee's "imagine the game went on…").

export const ATOMS = [
  // special
  { id: 'any', g: 'special' }, { id: 'none', g: 'special' },
  // board geography
  { id: 'chessA', g: 'geo' }, { id: 'chessB', g: 'geo' },
  { id: 'top', g: 'geo' }, { id: 'bottom', g: 'geo' }, { id: 'left', g: 'geo' }, { id: 'right', g: 'geo' },
  { id: 'edge', g: 'geo' }, { id: 'inner', g: 'geo' }, { id: 'diag', g: 'geo' }, { id: 'center', g: 'geo' },
  { id: 'rowsOdd', g: 'geo' }, { id: 'rowsEven', g: 'geo' }, { id: 'colsOdd', g: 'geo' }, { id: 'colsEven', g: 'geo' },
  // relative to the previous number
  { id: 'adjPrev', g: 'prev' }, { id: 'sidePrev', g: 'prev' }, { id: 'farPrev', g: 'prev' },
  { id: 'linePrev', g: 'prev' }, { id: 'rowPrev', g: 'prev' }, { id: 'colPrev', g: 'prev' }, { id: 'offPrev', g: 'prev' },
  { id: 'diagPrev', g: 'prev' }, { id: 'knightPrev', g: 'prev' },
  { id: 'belowPrev', g: 'prev' }, { id: 'abovePrev', g: 'prev' }, { id: 'rightPrev', g: 'prev' }, { id: 'leftPrev', g: 'prev' },
  // relative to all numbers on the board
  { id: 'touch1', g: 'all' }, { id: 'touchAny', g: 'all' }, { id: 'touchNone', g: 'all' },
  { id: 'rowEmpty', g: 'all' }, { id: 'colEmpty', g: 'all' },
];
const AIDX = Object.fromEntries(ATOMS.map((a, i) => [a.id, i]));
const NA = ATOMS.length;
// Atoms that need some number already on the board, so such rules start with a 0.
const NEEDS_ZERO = new Set([...ATOMS.filter((a) => a.g === 'prev').map((a) => a.id), 'touch1', 'touchAny']);

export const SIZES = { 6: 10, 8: 20, 10: 30 }; // board size → stalemate threshold

// ---------- atoms ----------
// P: positions of numbers 0…n-1 (P[0] may be -1), n: the number being placed, sq: an empty square.
function atomsAt(N, P, n, sq) {
  const v = new Uint8Array(NA);
  const r = (sq / N) | 0, c = sq % N, h = N / 2, m = Math.floor(N / 4);
  const set = (id, x) => { v[AIDX[id]] = x ? 1 : 0; };
  set('any', true); set('none', false);
  set('chessA', (r + c) % 2 === 0); set('chessB', (r + c) % 2 === 1);
  set('top', r < h); set('bottom', r >= h); set('left', c < h); set('right', c >= h);
  const edge = r === 0 || c === 0 || r === N - 1 || c === N - 1;
  set('edge', edge); set('inner', !edge);
  set('diag', r === c || r + c === N - 1);
  set('center', r >= m && r < N - m && c >= m && c < N - m);
  set('rowsOdd', r % 2 === 0); set('rowsEven', r % 2 === 1); set('colsOdd', c % 2 === 0); set('colsEven', c % 2 === 1);

  const p = n >= 1 ? P[n - 1] : -1;
  if (p < 0) {
    // No previous number: tests about it don't restrict anything.
    for (const a of ATOMS) if (a.g === 'prev') v[AIDX[a.id]] = 1;
  } else {
    const dr = r - ((p / N) | 0), dc = c - (p % N), ar = Math.abs(dr), ac = Math.abs(dc), ch = Math.max(ar, ac);
    set('adjPrev', ch === 1); set('sidePrev', ar + ac === 1); set('farPrev', ch > 1);
    set('linePrev', dr === 0 || dc === 0); set('rowPrev', dr === 0); set('colPrev', dc === 0); set('offPrev', dr !== 0 && dc !== 0);
    set('diagPrev', ar === ac); set('knightPrev', (ar === 1 && ac === 2) || (ar === 2 && ac === 1));
    set('belowPrev', dr > 0); set('abovePrev', dr < 0); set('rightPrev', dc > 0); set('leftPrev', dc < 0);
  }
  let touch = 0, rowE = true, colE = true;
  for (let k = 0; k < n; k++) {
    const q = P[k];
    if (q < 0) continue;
    const qr = (q / N) | 0, qc = q % N;
    if (Math.max(Math.abs(qr - r), Math.abs(qc - c)) === 1) touch++;
    if (qr === r) rowE = false;
    if (qc === c) colE = false;
  }
  set('touch1', touch === 1); set('touchAny', touch >= 1); set('touchNone', touch === 0);
  set('rowEmpty', rowE); set('colEmpty', colE);
  return v;
}

// ---------- rules ----------
function compile(rule) {
  if (rule.t === 'par') return { t: 1, o: AIDX[rule.odd], e: AIDX[rule.even] };
  return { t: 0, a: AIDX[rule.a], b: rule.op ? AIDX[rule.b] : -1, op: rule.op === 'or' ? 1 : 0 };
}
function evalC(cr, v, n) {
  if (cr.t === 1) return !!v[n % 2 ? cr.o : cr.e];
  if (cr.b < 0) return !!v[cr.a];
  return cr.op ? !!(v[cr.a] || v[cr.b]) : !!(v[cr.a] && v[cr.b]);
}
const atomsOf = (rule) => (rule.t === 'par' ? [rule.odd, rule.even] : rule.op ? [rule.a, rule.b] : [rule.a]);
export const needsZero = (rule) => atomsOf(rule).some((a) => NEEDS_ZERO.has(a));
const isAtom = (id) => typeof id === 'string' && Object.hasOwn(AIDX, id);
export const validRule = (rule) =>
  !!rule && typeof rule === 'object' && (rule.t === 'par' ? isAtom(rule.odd) && isAtom(rule.even)
    : rule.t === 'all' && isAtom(rule.a) && (!rule.op || ((rule.op === 'and' || rule.op === 'or') && isAtom(rule.b))));
export function normRule(rule) {
  if (rule.t === 'par') return rule.odd === rule.even ? { t: 'all', a: rule.odd, op: null, b: null } : { t: 'par', odd: rule.odd, even: rule.even };
  if (!rule.op || rule.a === rule.b) return { t: 'all', a: rule.a, op: null, b: null };
  const [a, b] = AIDX[rule.a] < AIDX[rule.b] ? [rule.a, rule.b] : [rule.b, rule.a];
  return { t: 'all', a, op: rule.op, b };
}
export const ruleKey = (r) => (r.t === 'par' ? `p:${r.odd}:${r.even}` : r.op ? `${r.op}:${r.a}:${r.b}` : `a:${r.a}`);
export const sameRule = (x, y) => ruleKey(normRule(x)) === ruleKey(normRule(y));

export function evalRule(rule, N, P, n, sq) {
  return evalC(compile(rule), atomsAt(N, P, n, sq), n);
}

const occupied = (P, n) => { const s = new Set(); for (let k = 0; k < n; k++) if (P[k] >= 0) s.add(P[k]); return s; };
function allowedSet(cr, N, P, n) {
  const occ = occupied(P, n), out = [];
  for (let sq = 0; sq < N * N; sq++) if (!occ.has(sq) && evalC(cr, atomsAt(N, P, n, sq), n)) out.push(sq);
  return out;
}
export const allowedSquares = (rule, N, P, n = P.length) => allowedSet(compile(rule), N, P, n);

// Positions behind an observation.
export function obsPositions(pos, o) {
  const pre = o.pre || [];
  return pos.slice(0, o.n - pre.length).concat(pre);
}

// ---------- secret rule generator ----------
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
const EASY = ['chessA', 'chessB', 'top', 'bottom', 'left', 'right', 'edge', 'inner', 'rowsOdd', 'rowsEven', 'colsOdd', 'colsEven',
  'adjPrev', 'farPrev', 'linePrev', 'offPrev', 'diagPrev', 'knightPrev', 'touchAny', 'touchNone', 'touch1'];
const REAL = ATOMS.filter((a) => a.g !== 'special').map((a) => a.id);
const GEO = ATOMS.filter((a) => a.g === 'geo').map((a) => a.id);
const REL = ATOMS.filter((a) => a.g === 'prev' || a.g === 'all').map((a) => a.id);

function candidate(tier, rng) {
  if (tier === 'easy') return { t: 'all', a: pick(EASY, rng), op: null, b: null };
  if (tier === 'medium') {
    const k = rng();
    if (k < 0.4) return normRule({ t: 'all', a: pick(GEO, rng), op: 'and', b: pick(REL, rng) });
    if (k < 0.55) return normRule({ t: 'all', a: pick(GEO, rng), op: 'or', b: pick(GEO, rng) });
    if (k < 0.75) return rng() < 0.5 ? { t: 'par', odd: pick(GEO, rng), even: 'any' } : { t: 'par', odd: 'any', even: pick(GEO, rng) };
    return { t: 'par', odd: pick(GEO, rng), even: pick(GEO, rng) };
  }
  const k = rng();
  if (k < 0.3) return normRule({ t: 'all', a: pick(REL, rng), op: rng() < 0.5 ? 'and' : 'or', b: pick(REL, rng) });
  if (k < 0.5) return normRule({ t: 'all', a: pick(REAL, rng), op: 'or', b: pick(REL, rng) });
  if (k < 0.8) return { t: 'par', odd: pick(REAL, rng), even: pick(REL, rng) };
  return { t: 'par', odd: pick(REL, rng), even: pick(REAL, rng) };
}

// Simulates random rounds under a rule: how often it reaches the last number, and how much of the board it allows.
export function playability(rule, N, maxNum, rng = Math.random, runs = 40, zero = needsZero(rule)) {
  const cr = compile(rule);
  let full = 0, frac = 0, steps = 0;
  for (let i = 0; i < runs; i++) {
    const P = [zero ? Math.floor(rng() * N * N) : -1];
    let ok = true;
    while (P.length <= maxNum) {
      const n = P.length, al = allowedSet(cr, N, P, n), free = N * N - occupied(P, n).size;
      frac += al.length / free; steps++;
      if (!al.length) { ok = false; break; }
      P.push(pick(al, rng));
    }
    if (ok) full++;
  }
  return { full: full / runs, frac: frac / steps };
}

export function randomRule(N, maxNum, tier = 'easy', rng = Math.random) {
  for (let i = 0; i < 400; i++) {
    const r = candidate(tier, rng);
    if (r.t === 'all' && r.op && r.a === r.b) continue;
    if (r.t === 'par' && r.odd === r.even) continue;
    const { full, frac } = playability(r, N, maxNum, rng, 24);
    if (full >= 0.9 && frac <= 0.62 && frac >= 0.05) return r;
  }
  return { t: 'all', a: 'top', op: null, b: null };
}

// ---------- match / round state ----------
export function create({ N = 8, nPlayers = 2, rounds = 3, maker = 'cpu', tier = 'easy' } = {}, rng = Math.random) {
  const st = {
    N, maxNum: SIZES[N] || 20, nPlayers, makerMode: maker === 'players' && nPlayers >= 3 ? 'players' : 'cpu', tier,
    rounds: maker === 'players' && nPlayers >= 3 ? nPlayers : rounds,
    round: -1, scores: Array(nPlayers).fill(0), acts: 0,
  };
  startRound(st, rng);
  return st;
}

export function startRound(st, rng = Math.random) {
  st.round++;
  Object.assign(st, { rule: null, zero: false, pos: [-1], obs: [], guesses: [], votes: [], result: null, end: null, last: null, maker: -1 });
  if (st.makerMode === 'players') {
    st.maker = st.round % st.nPlayers;
    st.turn = st.maker;
    st.phase = 'make';
  } else {
    setRule(st, randomRule(st.N, st.maxNum, st.tier, rng), rng, rng() < 0.3);
    st.turn = st.round % st.nPlayers;
    st.phase = 'try';
  }
}

function setRule(st, rule, rng, extraZero = false) {
  st.rule = normRule(rule);
  st.zero = needsZero(st.rule) || extraZero;
  st.pos = [-1];
  if (!st.zero) return;
  // Put the 0 where the first number has somewhere to go (if any such square exists).
  for (let i = 0; i < 50; i++) {
    st.pos = [Math.floor(rng() * st.N * st.N)];
    if (allowedSquares(st.rule, st.N, st.pos).length) break;
  }
}

export const nextNum = (st) => st.pos.length;
export const roundPoints = (st) => Math.floor(Math.max(0, st.pos.length - 1) / 2);
export const guessers = (st) => [...Array(st.nPlayers).keys()].filter((p) => p !== st.maker);
export const isOccupied = (st, sq) => st.pos.includes(sq);
// Squares already refused for the number about to be written.
export const rejectedNow = (st) => st.obs.filter((o) => o.n === nextNum(st) && !o.pre?.length && !o.ok).map((o) => o.sq);
export function canTry(st, sq) {
  return st.phase === 'try' && Number.isInteger(sq) && sq >= 0 && sq < st.N * st.N && !isOccupied(st, sq) && !rejectedNow(st).includes(sq);
}

function nextGuesser(st, p) {
  for (let i = 1; i <= st.nPlayers; i++) {
    const q = (p + i) % st.nPlayers;
    if (q !== st.maker) return q;
  }
  return p;
}

function finishRound(st, result) {
  st.result = { ...result, rule: st.rule, maker: st.maker };
  st.phase = st.round >= st.rounds - 1 ? 'over' : 'roundover';
}

// Applies an action by the player whose turn it is (or any guesser for 'giveup'). Returns an event or null if illegal.
//   { type: 'make', rule } · { type: 'try', sq } · { type: 'guess', rule } · { type: 'pass' } · { type: 'giveup', p } · { type: 'next' }
export function apply(st, act, rng = Math.random) {
  const by = st.turn;
  let ev = null;
  switch (act.type) {
    case 'make': {
      if (st.phase !== 'make' || !validRule(act.rule)) return null;
      setRule(st, act.rule, rng);
      if (!allowedSquares(st.rule, st.N, st.pos).length) { st.rule = null; st.pos = [-1]; st.zero = false; return null; }
      st.turn = nextGuesser(st, st.maker);
      st.phase = 'try';
      ev = { type: 'make', by };
      break;
    }
    case 'try': {
      if (!canTry(st, act.sq)) return null;
      const n = nextNum(st), ok = evalRule(st.rule, st.N, st.pos, n, act.sq);
      st.obs.push({ n, sq: act.sq, ok, pre: [], by, k: 'try' });
      ev = { type: 'try', by, sq: act.sq, n, ok };
      if (ok) {
        st.pos.push(act.sq);
        if (nextNum(st) > st.maxNum) { finishRound(st, { kind: 'max' }); ev.end = 'max'; break; }
        if (!allowedSquares(st.rule, st.N, st.pos).length) { finishRound(st, { kind: 'stuck' }); ev.end = 'stuck'; break; }
      }
      st.phase = 'decide';
      break;
    }
    case 'guess': {
      if (st.phase !== 'decide' || !validRule(act.rule)) return null;
      const rule = normRule(act.rule);
      const cx = judge(st, rule, rng);
      st.guesses.push({ by, rule, cx, n: nextNum(st) });
      if (!cx) {
        const pts = roundPoints(st);
        st.scores[by] += pts;
        if (st.maker >= 0) st.scores[st.maker] += pts;
        finishRound(st, { kind: 'guessed', by, pts });
        ev = { type: 'right', by, pts, rule };
      } else {
        st.obs.push({ ...cx, by, k: 'cx' });
        st.turn = nextGuesser(st, by);
        st.phase = 'try';
        ev = { type: 'wrong', by, rule, cx };
      }
      break;
    }
    case 'pass': {
      if (st.phase !== 'decide') return null;
      st.turn = nextGuesser(st, by);
      st.phase = 'try';
      ev = { type: 'pass', by };
      break;
    }
    case 'giveup': {
      if (st.phase !== 'try' && st.phase !== 'decide') return null;
      if (!guessers(st).includes(act.p)) return null;
      st.votes[act.p] = true;
      ev = { type: 'vote', by: act.p };
      if (guessers(st).every((p) => st.votes[p])) { finishRound(st, { kind: 'giveup' }); ev.end = 'giveup'; }
      break;
    }
    case 'next': {
      if (st.phase !== 'roundover') return null;
      startRound(st, rng);
      ev = { type: 'round' };
      break;
    }
    default: return null;
  }
  st.acts++;
  st.last = ev;
  return ev;
}

// ---------- referee ----------
// Returns null if the guess matches the secret rule on every observed fact, the current position and
// (as far as random look-ahead can tell) every future position; otherwise a counterexample
// { n, sq, ok, pre, src: 'past' | 'now' | 'future' } where ok tells what the SECRET rule says.
export function judge(st, guess, rng = Math.random, playouts = 300) {
  const S = compile(st.rule), G = compile(guess), N = st.N;
  // 1. something we have already seen
  for (let i = st.obs.length - 1; i >= 0; i--) {
    const o = st.obs[i], P = obsPositions(st.pos, o);
    if (evalC(G, atomsAt(N, P, o.n, o.sq), o.n) !== o.ok) return { n: o.n, sq: o.sq, ok: o.ok, pre: o.pre || [], src: 'past' };
  }
  const n0 = nextNum(st);
  if (n0 > st.maxNum) return null;
  const diffs = (P, n) => {
    const occ = occupied(P, n), out = [];
    for (let sq = 0; sq < N * N; sq++) {
      if (occ.has(sq)) continue;
      const v = atomsAt(N, P, n, sq), s = evalC(S, v, n);
      if (s !== evalC(G, v, n)) out.push({ sq, ok: s });
    }
    return out;
  };
  // 2. the current position
  const d0 = diffs(st.pos, n0);
  if (d0.length) { const d = pick(d0, rng); return { n: n0, sq: d.sq, ok: d.ok, pre: [], src: 'now' }; }
  // 3. one move ahead, exhaustively
  if (n0 + 1 <= st.maxNum) {
    const first = allowedSet(S, N, st.pos, n0);
    const found = [];
    for (const s1 of first) {
      const P = st.pos.concat([s1]);
      for (const d of diffs(P, n0 + 1)) found.push({ n: n0 + 1, sq: d.sq, ok: d.ok, pre: [s1], src: 'future' });
    }
    if (found.length) return pick(found, rng);
  }
  // 4. random look-ahead further on (each step: compare both rules everywhere, then follow the secret one)
  const runs = Math.round(playouts * Math.min(1, 64 / (N * N)) ** 0.5);
  for (let t = 0; t < runs; t++) {
    const P = st.pos.slice();
    let al = allowedSet(S, N, P, P.length);
    while (P.length < st.maxNum && al.length) {
      P.push(pick(al, rng));
      const n = P.length, occ = occupied(P, n), d = [];
      al = [];
      for (let sq = 0; sq < N * N; sq++) {
        if (occ.has(sq)) continue;
        const v = atomsAt(N, P, n, sq), s = evalC(S, v, n);
        if (s) al.push(sq);
        if (s !== evalC(G, v, n)) d.push({ sq, ok: s });
      }
      if (d.length) { const x = pick(d, rng); return { n, sq: x.sq, ok: x.ok, pre: P.slice(st.pos.length), src: 'future' }; }
    }
  }
  return null;
}

// What a player may see: the secret rule only once the round is over.
export function publicView(st) {
  const v = clone(st);
  if (st.phase !== 'roundover' && st.phase !== 'over') v.rule = null;
  return v;
}
// What one seat may see online: the public view, plus the secret rule for the seat that made it up.
export function seatView(st, seat) {
  const v = publicView(st);
  if (st.rule && seat === st.maker) v.rule = clone(st.rule);
  return v;
}
export const clone = (st) => JSON.parse(JSON.stringify(st));

// ---------- computer guesser ----------
let HYP = null;
function hypotheses() {
  if (HYP) return HYP;
  const ids = ATOMS.map((a) => a.id), real = ids.filter((x) => x !== 'any' && x !== 'none');
  HYP = [];
  for (const a of ids) HYP.push({ rule: { t: 'all', a, op: null, b: null }, kind: 's' });
  for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++)
    for (const op of ['and', 'or']) HYP.push({ rule: { t: 'all', a: real[i], op, b: real[j] }, kind: 'p' });
  for (const o of [...real, 'any']) for (const e of [...real, 'any']) if (o !== e) HYP.push({ rule: { t: 'par', odd: o, even: e }, kind: 'q' });
  for (const h of HYP) { h.c = compile(h.rule); h.z = needsZero(h.rule); }
  return HYP;
}
const PRIOR = { easy: { s: 0.9, p: 0.05, q: 0.05 }, medium: { s: 0.15, p: 0.45, q: 0.4 }, hard: { s: 0.1, p: 0.4, q: 0.5 }, players: { s: 0.4, p: 0.3, q: 0.3 } };

// Hypotheses still consistent with everything seen so far, with prior weights.
export function beliefs(st, memory = Infinity) {
  const H = hypotheses();
  const mix = PRIOR[st.makerMode === 'players' ? 'players' : st.tier] || PRIOR.medium;
  const cnt = { s: 0, p: 0, q: 0 };
  for (const h of H) cnt[h.kind]++;
  const vecs = st.obs.slice(-memory).map((o) => [atomsAt(st.N, obsPositions(st.pos, o), o.n, o.sq), o.n, o.ok]);
  const out = [];
  for (const h of H) {
    if (!st.zero && h.z) continue;
    if (h.rule.t === 'all' && (h.rule.a === 'none' || h.rule.a === 'any') && st.makerMode !== 'players') continue;
    let ok = true;
    for (const [v, n, want] of vecs) if (evalC(h.c, v, n) !== want) { ok = false; break; }
    if (ok) out.push({ h, w: mix[h.kind] / cnt[h.kind] });
  }
  return out;
}

// Groups behaviourally identical hypotheses by testing them on the current position plus random positions.
function classes(st, bel, rng) {
  const N = st.N, states = [{ P: st.pos, n: nextNum(st) }];
  for (let i = 0; i < 18; i++) {
    const m = 1 + Math.floor(rng() * Math.min(st.maxNum, N * N - 2)), P = [], used = new Set();
    if (!st.zero) { P.push(-1); }
    while (P.length < m) { const q = Math.floor(rng() * N * N); if (!used.has(q)) { used.add(q); P.push(q); } }
    states.push({ P, n: P.length });
  }
  const tests = [];
  for (const { P, n } of states) {
    const occ = occupied(P, n);
    for (let sq = 0; sq < N * N; sq++) if (!occ.has(sq)) tests.push([atomsAt(N, P, n, sq), n]);
  }
  const map = new Map();
  for (const b of bel) {
    let sig = '';
    for (const [v, n] of tests) sig += evalC(b.h.c, v, n) ? '1' : '0';
    let c = map.get(sig);
    if (!c) map.set(sig, (c = { w: 0, items: [] }));
    c.w += b.w;
    c.items.push(b);
  }
  return [...map.values()].sort((a, b) => b.w - a.w);
}

// level: 'easy' | 'normal' | 'hard'. Works on the public view (never looks at the secret).
//   easy   — mostly random probes, remembers only the last few facts, guesses late and sometimes rashly;
//   normal — informative probes, waits for a fair amount of evidence before guessing;
//   hard   — always picks the most informative probe and guesses as soon as one explanation dominates.
const LEVELS = {
  easy: { rand: 0.6, memory: 8, minObs: 20, conf: 0.95 },
  normal: { rand: 0.3, memory: Infinity, minObs: 14, conf: 0.8 },
  hard: { rand: 0, memory: Infinity, minObs: 0, conf: 0.55 },
};
export function aiAction(view, level = 'normal', rng = Math.random) {
  const st = view, p = st.turn, L = LEVELS[level] || LEVELS.normal;
  if (st.phase === 'try') {
    const n = nextNum(st), cands = [];
    for (let sq = 0; sq < st.N * st.N; sq++) if (canTry(st, sq)) cands.push(sq);
    if (!cands.length) return { type: 'giveup', p };
    if (rng() < L.rand) return { type: 'try', sq: pick(cands, rng) };
    const bel = beliefs(st, L.memory);
    if (!bel.length) return { type: 'try', sq: pick(cands, rng) };
    const tot = bel.reduce((s, b) => s + b.w, 0);
    let best = [], bestH = -1;
    for (const sq of cands) {
      const v = atomsAt(st.N, st.pos, n, sq);
      let y = 0;
      for (const b of bel) if (evalC(b.h.c, v, n)) y += b.w;
      const q = y / tot;
      // entropy, nudged a little towards squares that will probably take a number
      const H = (q > 0 && q < 1 ? -(q * Math.log2(q) + (1 - q) * Math.log2(1 - q)) : 0) + 0.05 * q;
      if (H > bestH + 1e-9) { bestH = H; best = [sq]; } else if (Math.abs(H - bestH) <= 1e-9) best.push(sq);
    }
    return { type: 'try', sq: pick(best, rng) };
  }
  if (st.phase === 'decide') {
    const bel = beliefs(st, L.memory);
    if (!bel.length) return { type: 'pass' };
    const cls = classes(st, bel, rng), tot = cls.reduce((s, c) => s + c.w, 0), top = cls[0];
    const conf = top.w / tot, late = nextNum(st) >= st.maxNum - 2, enough = st.obs.length >= L.minObs;
    const rep = top.items.reduce((a, b) => (b.w > a.w ? b : a)).h.rule;
    let go = (enough && (conf >= L.conf || cls.length === 1)) || (late && conf >= 0.25);
    if (level === 'easy') go = (go && rng() < 0.6) || (late && rng() < 0.5);
    // While the highest number is 1, even a correct guess scores 0, so wait for the 2.
    if (level !== 'easy' && roundPoints(st) < 1 && !late) go = false;
    if (!go) return { type: 'pass' };
    const rule = level === 'easy' && cls.length > 1 && rng() < 0.4 ? pick(cls.slice(0, 3), rng).items[0].h.rule : rep;
    return { type: 'guess', rule };
  }
  return null;
}

export const SAE = {
  ATOMS, SIZES, create, startRound, apply, judge, publicView, seatView, clone, aiAction, beliefs,
  evalRule, allowedSquares, needsZero, normRule, ruleKey, sameRule, validRule, randomRule, playability,
  nextNum, roundPoints, guessers, canTry, rejectedNow, isOccupied, obsPositions,
};
