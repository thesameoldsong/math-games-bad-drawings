// Neutron: pure game logic + AI. No DOM.
//
// 5×5 board, cells indexed r*5+c. b[i]: -1 empty, 0 blue piece, 1 red piece, 2 the neutron.
// Blue's home row is the bottom row (4), red's is the top row (0).
// A turn = move the neutron (one king step, or a full slide in the "slide" variant),
// then slide one of your own pieces as far as it goes. The very first turn of a game
// skips the neutron step. The neutron entering a home row wins for that row's owner
// (whoever pushed it there); a player who can't complete a turn (usually: the neutron is boxed in) loses.

const N = 5;
const NEUTRON = 2;
const HOME = [4, 0];
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const WIN = 100000;

const rowOf = (i) => (i / N) | 0;
const colOf = (i) => i % N;

function create({ first = 0, slide = false } = {}) {
  const b = Array(N * N).fill(-1);
  for (let c = 0; c < N; c++) { b[HOME[0] * N + c] = 0; b[HOME[1] * N + c] = 1; }
  b[12] = NEUTRON;
  return { b, nu: 12, turn: first, first, phase: 'piece', ply: 0, turns: 0, slide, winner: -1, draw: false, reason: null, last: [], seen: {} };
}

// Full copy (for undo history / network); `seen` counts positions for the repetition rule.
const clone = (s) => ({ ...s, b: s.b.slice(), last: s.last.slice(), seen: s.seen ? { ...s.seen } : null });
// Search copy: no repetition bookkeeping.
const fast = (s) => ({ ...s, b: s.b.slice(), last: s.last.slice(), seen: null });
const MAX_TURNS = 200;   // a game this long is called a draw
const REPEATS = 3;       // the same position (same player to move) for the third time → draw

// Where a piece starting at `from` ends up when sliding in direction d (or -1 if it can't move).
function slideEnd(b, from, [dr, dc]) {
  let r = rowOf(from), c = colOf(from), end = -1;
  for (;;) {
    r += dr; c += dc;
    if (r < 0 || r >= N || c < 0 || c >= N || b[r * N + c] !== -1) return end;
    end = r * N + c;
  }
}

function neutronTargets(b, nu, slide) {
  const out = [];
  for (const d of DIRS) {
    if (slide) { const e = slideEnd(b, nu, d); if (e >= 0) out.push(e); continue; }
    const r = rowOf(nu) + d[0], c = colOf(nu) + d[1];
    if (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === -1) out.push(r * N + c);
  }
  return out;
}

function pieceMovesOf(b, p) {
  const out = [];
  for (let i = 0; i < N * N; i++) {
    if (b[i] !== p) continue;
    for (const d of DIRS) { const e = slideEnd(b, i, d); if (e >= 0) out.push({ from: i, to: e }); }
  }
  return out;
}

// Owner of the home row a cell belongs to (-1 for the middle rows).
const homeOwner = (i) => (rowOf(i) === HOME[0] ? 0 : rowOf(i) === HOME[1] ? 1 : -1);

function hasPieceMoveAfterNeutron(s, to) {
  const b = s.b.slice();
  b[s.nu] = -1; b[to] = NEUTRON;
  return pieceMovesOf(b, s.turn).length > 0;
}

// Legal half-moves for the current phase. A neutron step that doesn't end the game must leave
// at least one piece move (otherwise the turn couldn't be completed).
function legalMoves(s) {
  if (s.winner >= 0 || s.draw) return [];
  if (s.phase === 'piece') return pieceMovesOf(s.b, s.turn);
  return neutronTargets(s.b, s.nu, s.slide)
    .filter((to) => homeOwner(to) >= 0 || hasPieceMoveAfterNeutron(s, to))
    .map((to) => ({ from: s.nu, to }));
}

const isLegal = (s, m) => !!m && legalMoves(s).some((x) => x.from === m.from && x.to === m.to);

function endTurnCheck(s, mover) {
  // the next player must be able to make a full turn, otherwise the mover wins
  if (legalMoves(s).length === 0) {
    s.winner = mover;
    s.reason = neutronTargets(s.b, s.nu, s.slide).length ? 'stuck' : 'trap';
  }
}

// Mutates s with one half-move (no legality check — use legalMoves / isLegal).
function apply(s, m) {
  const who = s.turn;
  // keep the previous player's turn plus the current (partial) one, for drawing move arrows
  if (s.last.length && s.last[s.last.length - 1].who !== who) s.last = s.last.filter((x) => x.who !== who);
  s.last.push({ from: m.from, to: m.to, who, kind: s.phase });
  s.ply++;
  if (s.phase === 'neutron') {
    s.b[m.from] = -1; s.b[m.to] = NEUTRON; s.nu = m.to;
    const owner = homeOwner(m.to);
    if (owner >= 0) { s.winner = owner; s.reason = owner === who ? 'home' : 'own-goal'; return s; }
    s.phase = 'piece';
    if (!pieceMovesOf(s.b, who).length) { s.winner = 1 - who; s.reason = 'stuck'; }
    return s;
  }
  s.b[m.to] = s.b[m.from]; s.b[m.from] = -1;
  s.turn = 1 - who;
  s.phase = 'neutron';
  s.turns++;
  endTurnCheck(s, who);
  if (s.winner < 0 && s.seen) {
    const k = s.turn + s.b.join('');
    s.seen[k] = (s.seen[k] || 0) + 1;
    if (s.seen[k] >= REPEATS) { s.draw = true; s.reason = 'repeat'; }
    else if (s.turns >= MAX_TURNS) { s.draw = true; s.reason = 'long'; }
  }
  return s;
}

const isOver = (s) => s.winner >= 0 || s.draw;

// ---------- analysis helpers (also used by the UI for reactions) ----------
// From the point of view of the side to move in the neutron phase:
// canWin — can step the neutron into its own home row; safe — neutron moves that don't hand the game over.
function outlook(s) {
  const me = s.turn;
  let canWin = false, safe = 0, total = 0;
  if (s.winner >= 0 || s.phase !== 'neutron') return { canWin, safe, total };
  for (const to of neutronTargets(s.b, s.nu, s.slide)) {
    total++;
    const o = homeOwner(to);
    if (o === me) canWin = true;
    else if (o < 0 && hasPieceMoveAfterNeutron(s, to)) safe++;
  }
  return { canWin, safe, total };
}

// ---------- AI ----------
// The AI thinks in whole turns: {n: neutron move | null, p: piece move | null}.
function turns(s) {
  const out = [];
  if (s.winner >= 0) return out;
  if (s.phase === 'piece') { for (const p of legalMoves(s)) out.push({ n: null, p }); return out; }
  for (const n of legalMoves(s)) {
    if (homeOwner(n.to) >= 0) { out.push({ n, p: null }); continue; }
    const x = fast(s); apply(x, n);
    for (const p of legalMoves(x)) out.push({ n, p });
  }
  return out;
}

function playTurn(s, tr) {
  if (tr.n) apply(s, tr.n);
  if (tr.p && !isOver(s)) apply(s, tr.p);
  return s;
}

function emptiesInRow(b, r) {
  let n = 0;
  for (let c = 0; c < N; c++) if (b[r * N + c] === -1) n++;
  return n;
}

// Static score for the side to move (at the start of its neutron phase).
function evaluate(s) {
  const me = s.turn;
  const o = outlook(s);
  if (o.canWin) return WIN - 1;
  if (!o.safe) return -(WIN - 1);
  const dMe = Math.abs(rowOf(s.nu) - HOME[me]);
  let v = (2 - dMe) * 30 + o.safe * 8;
  v += 5 * (emptiesInRow(s.b, HOME[me]) - emptiesInRow(s.b, HOME[1 - me]));
  return v;
}

// Value of the position after `mover` played a whole turn, from mover's point of view.
// (A game can end mid-turn with s.turn still on the mover, so terminal states are scored here.)
function afterTurn(x, mover, depth, alpha, beta, deadline) {
  if (x.winner >= 0) return x.winner === mover ? WIN + depth : -(WIN + depth);
  return -negamax(x, depth - 1, -beta, -alpha, deadline);
}

function negamax(s, depth, alpha, beta, deadline) {
  if (s.phase === 'neutron' && outlook(s).canWin) return WIN + depth;
  if (depth === 0 || (deadline && Date.now() > deadline)) return evaluate(s);
  let list = turns(s);
  if (!list.length) return -(WIN + depth);
  if (depth >= 2) {
    // order by a one-ply look so alpha-beta cuts early
    const scored = list.map((tr) => ({ tr, v: afterTurn(playTurn(fast(s), tr), s.turn, 1, -Infinity, Infinity, 0) }));
    scored.sort((a, b) => b.v - a.v);
    list = scored.map((x) => x.tr);
  }
  let best = -Infinity;
  for (const tr of list) {
    const x = playTurn(fast(s), tr);
    const v = afterTurn(x, s.turn, depth, alpha, beta, deadline);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Returning to a position that already happened twice ends the game in a draw (score 0);
// a mild penalty for any repeat keeps the computer from shuffling back and forth.
function repetitionAdjust(s, tr, v) {
  if (Math.abs(v) >= WIN) return v;
  const x = playTurn(fast(s), tr);
  if (isOver(x)) return v;
  const n = s.seen[x.turn + x.b.join('')] || 0;
  return n + 1 >= REPEATS ? 0 : n ? v - 6 : v;
}

// Search whole turns to `depth`; the move list is re-ordered by the previous iteration's scores.
function searchRoot(s, maxDepth, budgetMs) {
  const deadline = budgetMs ? Date.now() + budgetMs : 0;
  let list = shuffle(turns(s)).map((tr) => ({ tr, v: 0 }));
  if (list.length === 1) return list[0].tr;
  // quick ordering by static eval after the turn
  for (const it of list) it.v = afterTurn(playTurn(fast(s), it.tr), s.turn, 1, -Infinity, Infinity, 0);
  list.sort((a, b) => b.v - a.v);
  if (list[0].v >= WIN) return list[0].tr;
  let bestTr = list[0].tr;
  for (let depth = 2; depth <= maxDepth; depth++) {
    let alpha = -Infinity, complete = true;
    for (const it of list) {
      it.v = afterTurn(playTurn(fast(s), it.tr), s.turn, depth, alpha, Infinity, deadline);
      if (it.v > alpha) alpha = it.v;
      if (deadline && Date.now() > deadline) { complete = false; break; }
    }
    if (!complete && depth > 2) break;
    if (s.seen) for (const it of list) it.v = repetitionAdjust(s, it.tr, it.v);
    list.sort((a, b) => b.v - a.v);
    bestTr = list[0].tr;
    if (list[0].v >= WIN) break;
  }
  return bestTr;
}

function aiTurn(s, level = 'normal') {
  const all = turns(s);
  if (!all.length) return null;
  const winning = all.find((tr) => playTurn(fast(s), tr).winner === s.turn);
  if (level === 'easy') {
    if (winning && Math.random() < 0.8) return winning;
    // avoid handing over an instant win most of the time
    const ok = all.filter((tr) => {
      const x = playTurn(fast(s), tr);
      return x.winner !== 1 - s.turn && !outlook(x).canWin;
    });
    return ok.length && Math.random() < 0.75 ? shuffle(ok)[0] : shuffle(all)[0];
  }
  if (winning) return winning;
  if (level === 'hard') return searchRoot(s, 4, 900);
  return searchRoot(s, 2, 0);
}

export const NEU = {
  N, HOME, create, clone, legalMoves, isLegal, apply, isOver, outlook, turns, playTurn, aiTurn, homeOwner, rowOf, colOf,
};
