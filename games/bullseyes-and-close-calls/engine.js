// Bullseyes and Close Calls (Bulls and Cows) — pure rules + computer guesser. No DOM.
//
// Codes are digit strings ('0123'); leading zeros are fine. Without repeats every digit is different.
// Feedback for a guess: b = bullseyes (right digit, right place), c = close calls (right digit, wrong place).
// Turns alternate, starting with st.first. If the first player cracks the code, the second still gets the
// same number of guesses: cracking it too means a tie (equal guesses), otherwise the first player wins.

const cache = new Map();

// All codes for a length / repeat setting: { strs: string[], digs: Uint8Array (len per code) }.
function universe(len, rep) {
  const key = len + (rep ? 'r' : 'd');
  if (cache.has(key)) return cache.get(key);
  const strs = [];
  const rec = (pre, used) => {
    if (pre.length === len) return strs.push(pre);
    for (let d = 0; d < 10; d++) if (rep || !(used & (1 << d))) rec(pre + d, used | (1 << d));
  };
  rec('', 0);
  const digs = new Uint8Array(strs.length * len);
  strs.forEach((s, i) => { for (let k = 0; k < len; k++) digs[i * len + k] = s.charCodeAt(k) - 48; });
  const u = { len, rep, strs, digs, index: new Map(strs.map((s, i) => [s, i])) };
  cache.set(key, u);
  return u;
}

// Feedback of guess g against secret s (both strings of equal length).
function score(s, g) {
  let b = 0;
  const cs = new Array(10).fill(0), cg = new Array(10).fill(0);
  for (let i = 0; i < s.length; i++) {
    if (s[i] === g[i]) b++;
    else { cs[s.charCodeAt(i) - 48]++; cg[g.charCodeAt(i) - 48]++; }
  }
  let c = 0;
  for (let d = 0; d < 10; d++) c += Math.min(cs[d], cg[d]);
  return [b, c];
}

// Fast feedback on the packed digit array; returns b * 8 + c.
const cntS = new Uint8Array(10), cntG = new Uint8Array(10);
function scoreIdx(u, i, j) {
  const L = u.len, D = u.digs, a = i * L, b0 = j * L;
  let b = 0;
  cntS.fill(0); cntG.fill(0);
  for (let k = 0; k < L; k++) {
    const x = D[a + k], y = D[b0 + k];
    if (x === y) b++;
    else { cntS[x]++; cntG[y]++; }
  }
  let c = 0;
  for (let d = 0; d < 10; d++) c += cntS[d] < cntG[d] ? cntS[d] : cntG[d];
  return b * 8 + c;
}

function validCode(len, rep, code) {
  if (typeof code !== 'string' || code.length !== len || !/^[0-9]+$/.test(code)) return false;
  return rep || new Set(code).size === len;
}

function create({ len = 4, rep = false, first = 0 } = {}) {
  return { len, rep, first, turn: first, phase: 'setup', secrets: [null, null], guesses: [[], []], winner: null };
}

const clone = (st) => JSON.parse(JSON.stringify(st));

function setSecret(st, p, code) {
  if (st.phase !== 'setup' || st.secrets[p] !== null || !validCode(st.len, st.rep, code)) return false;
  st.secrets[p] = code;
  if (st.secrets[0] !== null && st.secrets[1] !== null) st.phase = 'play';
  return true;
}

const solved = (st, p) => {
  const g = st.guesses[p];
  return g.length > 0 && g[g.length - 1].b === st.len;
};

// Player p guesses at the opponent's secret. Returns the log entry {g, b, c} or null if illegal.
function guess(st, code) {
  if (st.phase !== 'play' || !validCode(st.len, st.rep, code)) return null;
  const p = st.turn;
  const [b, c] = score(st.secrets[1 - p], code);
  const e = { g: code, b, c };
  st.guesses[p].push(e);
  const s0 = solved(st, 0), s1 = solved(st, 1);
  if (st.guesses[0].length === st.guesses[1].length && (s0 || s1)) {
    st.phase = 'over';
    st.winner = s0 && s1 ? -1 : s0 ? 0 : 1;
  } else st.turn = 1 - p;
  return e;
}

const moves = (st) => st.guesses[0].length + st.guesses[1].length;

// The first player has cracked the code; the other one gets a last try.
const lastChance = (st) => st.phase === 'play' && solved(st, 1 - st.turn);

// What seat `seat` may see: the opponent's secret stays hidden until the game is over.
function view(st, seat) {
  const v = clone(st);
  if (v.phase !== 'over') v.secrets[1 - seat] = v.secrets[1 - seat] === null ? null : '?';
  return v;
}

// Indices (into universe) of codes consistent with a list of {g, b, c} clues.
function candidateIdx(len, rep, clues) {
  const u = universe(len, rep);
  const cl = clues.map((e) => ({ i: u.index.get(e.g), k: e.b * 8 + e.c })).filter((x) => x.i !== undefined);
  const out = [];
  const n = u.strs.length;
  outer: for (let i = 0; i < n; i++) {
    for (const x of cl) if (scoreIdx(u, i, x.i) !== x.k) continue outer;
    out.push(i);
  }
  return out;
}
const candidates = (len, rep, clues) => candidateIdx(len, rep, clues).map((i) => universe(len, rep).strs[i]);
const countPossible = (st, p) => candidateIdx(st.len, st.rep, st.guesses[p]).length;

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];
function sample(arr, n, rnd) {
  if (arr.length <= n) return arr.slice();
  const a = arr.slice();
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rnd() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function randomCode(len, rep, rnd = Math.random) {
  return pick(universe(len, rep).strs, rnd);
}

// Computer guess for the player to move.
//   easy   — forgetful: only trusts its last three clues
//   normal — any number that fits every clue (the book's simple program)
//   hard   — picks the probe that splits the remaining numbers best, even a number it knows is wrong
function aiGuess(st, level = 'normal', rnd = Math.random) {
  const { len, rep } = st, u = universe(len, rep);
  const clues = st.guesses[st.turn];
  if (level === 'easy') return u.strs[pick(candidateIdx(len, rep, clues.slice(-3)), rnd)];
  const cand = candidateIdx(len, rep, clues);
  if (!cand.length) return randomCode(len, rep, rnd); // impossible with honest feedback
  if (level !== 'hard' || cand.length <= 2) return u.strs[pick(cand, rnd)];

  // Expected size of what remains (sum of squared bucket sizes), with a sample when the field is large.
  const BUDGET = 1_000_000;
  const target = sample(cand, 1200, rnd);
  const G = Math.max(30, Math.floor(BUDGET / target.length));
  const isCand = new Set(cand);
  let pool;
  if (cand.length >= G) pool = sample(cand, G, rnd);
  else {
    const others = [];
    const all = u.strs.length;
    for (let tries = 0; others.length < G - cand.length && tries < (G - cand.length) * 3; tries++) {
      const i = Math.floor(rnd() * all);
      if (!isCand.has(i)) others.push(i);
    }
    pool = cand.concat(others);
  }
  const buckets = new Int32Array(8 * (len + 1));
  let best = null, bestV = Infinity;
  for (const g of pool) {
    buckets.fill(0);
    for (const s of target) buckets[scoreIdx(u, s, g)]++;
    let v = 0;
    for (let k = 0; k < buckets.length; k++) v += buckets[k] * buckets[k];
    v = v * 2 - (isCand.has(g) ? 1 : 0);
    if (v < bestV) { bestV = v; best = g; }
  }
  return u.strs[best];
}

export const BC = {
  universe, score, validCode, create, clone, setSecret, guess, solved, moves, lastChance, view,
  candidates, countPossible, randomCode, aiGuess,
};
