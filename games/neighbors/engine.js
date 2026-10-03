// Neighbors: pure logic + AI. No DOM.
// Every player fills a private 5×5 grid with the same 25 announced numbers (1..10).
// Board = Array(25), index = row * 5 + col; 0 = empty, 1..10 = number, -1 = filled but hidden (masked view).
// Scoring: every maximal run of 2+ equal numbers in a row or a column scores the sum of its numbers.

const SIDE = 5, CELLS = 25, ROUNDS = 25;

function create({ players = 2, source = 'die' } = {}, rand = Math.random) {
  const s = {
    n: players, source,
    boards: Array.from({ length: players }, () => Array(CELLS).fill(0)),
    placed: Array(players).fill(false),
    last: Array(players).fill(-1),
    round: 0, roll: 0, rolls: [], over: false,
    deck: source === 'deck' ? [0, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4] : null,
  };
  draw(s, rand);
  return s;
}

const clone = (s) => ({
  ...s,
  boards: s.boards.map((b) => b.slice()), placed: s.placed.slice(), last: s.last.slice(),
  rolls: s.rolls.slice(), deck: s.deck && s.deck.slice(),
});

// Next announced number: a fair d10, or a card from the 40-card deck (four each of 1..10).
function draw(s, rand = Math.random) {
  let v;
  if (!s.deck) v = 1 + Math.floor(rand() * 10);
  else {
    const total = s.deck.reduce((a, b) => a + b, 0);
    let k = Math.floor(rand() * total);
    for (v = 1; v <= 10; v++) { k -= s.deck[v]; if (k < 0) break; }
    s.deck[v]--;
  }
  s.roll = v;
  s.rolls.push(v);
  return v;
}

const empties = (b) => { const out = []; for (let i = 0; i < CELLS; i++) if (!b[i]) out.push(i); return out; };
const canPlace = (s, p, i) => !s.over && !s.placed[p] && Number.isInteger(i) && i >= 0 && i < CELLS && s.boards[p][i] === 0;
const waiting = (s) => { const out = []; for (let p = 0; p < s.n; p++) if (!s.placed[p]) out.push(p); return out; };

// Mutates s: player p writes the current number into cell i. When everybody has written it,
// the next number is drawn (or the game ends after 25). Returns the points this placement scored.
function place(s, p, i, rand = Math.random) {
  if (!canPlace(s, p, i)) throw new Error(`illegal placement p${p} @${i}`);
  const g = gain(s.boards[p], i, s.roll);
  s.boards[p][i] = s.roll;
  s.placed[p] = true;
  s.last[p] = i;
  if (s.placed.every(Boolean)) {
    if (s.round === ROUNDS - 1) s.over = true;
    else { s.round++; s.placed.fill(false); draw(s, rand); }
  }
  return g;
}

// ---------- scoring ----------
// Points gained along one line by writing v at index i (pos = position along that line, step = 1 or 5).
function lineGain(b, i, v, step, pos) {
  let L = 0, R = 0;
  for (let k = pos - 1, j = i - step; k >= 0 && b[j] === v; k--, j -= step) L++;
  for (let k = pos + 1, j = i + step; k < SIDE && b[j] === v; k++, j += step) R++;
  if (L + R === 0) return 0;
  return v * (L + R + 1) - (L >= 2 ? v * L : 0) - (R >= 2 ? v * R : 0);
}
const gain = (b, i, v) => lineGain(b, i, v, 1, i % SIDE) + lineGain(b, i, v, SIDE, (i / SIDE) | 0);

// All scoring runs: {cells: [i...], v, dir: 'h' | 'v', points}.
function runs(b) {
  const out = [];
  const scan = (start, step, dir) => {
    let k = 0;
    while (k < SIDE) {
      const v = b[start + k * step];
      let e = k;
      while (e + 1 < SIDE && v > 0 && b[start + (e + 1) * step] === v) e++;
      if (v > 0 && e > k) {
        const cells = [];
        for (let j = k; j <= e; j++) cells.push(start + j * step);
        out.push({ cells, v, dir, points: v * cells.length });
      }
      k = e + 1;
    }
  };
  for (let r = 0; r < SIDE; r++) scan(r * SIDE, 1, 'h');
  for (let c = 0; c < SIDE; c++) scan(c, SIDE, 'v');
  return out;
}
const score = (b) => runs(b).reduce((n, r) => n + r.points, 0);
const scores = (s) => s.boards.map(score);

// Indices of the best score(s); ties share the win.
function winners(s) {
  const sc = scores(s), m = Math.max(...sc);
  return sc.map((x, p) => (x === m ? p : -1)).filter((p) => p >= 0);
}

// Copy of the state that shows player `viewer` only what they may see: the other boards become
// -1 ("something is written here") until the game is over.
function masked(s, viewer) {
  if (s.over) return clone(s);
  const x = clone(s);
  x.boards = x.boards.map((b, p) => (p === viewer ? b : b.map((v) => (v ? -1 : 0))));
  x.last = x.last.map((c, p) => (p === viewer ? c : -1));
  return x;
}

// ---------- AI ----------
// Chance of each number 1..10 on future draws.
function odds(s) {
  if (!s.deck) return Array.from({ length: 11 }, (_, v) => (v ? 0.1 : 0));
  const total = s.deck.reduce((a, b) => a + b, 0) || 1;
  return s.deck.map((c) => c / total);
}

// "Real estate" value of an empty cell: points it would score if the next number landed there.
function cellValue(b, i, pr) {
  let v = 0;
  for (let w = 1; w <= 10; w++) if (pr[w]) v += pr[w] * gain(b, i, w);
  return v;
}
// Change in total real-estate value of the board when v is written at i
// (only cells in the same row or column can change).
function estateDelta(b, i, v, pr) {
  const r = (i / SIDE) | 0, c = i % SIDE;
  let before = cellValue(b, i, pr), after = 0;
  const others = [];
  for (let k = 0; k < SIDE; k++) {
    const a = r * SIDE + k, d = k * SIDE + c;
    if (a !== i && !b[a]) others.push(a);
    if (d !== i && !b[d]) others.push(d);
  }
  for (const j of others) before += cellValue(b, j, pr);
  b[i] = v;
  for (const j of others) after += cellValue(b, j, pr);
  b[i] = 0;
  return after - before;
}

const LAMBDA = 0.9;
const heur = (b, i, v, pr) => gain(b, i, v) + LAMBDA * estateDelta(b, i, v, pr);

function argmax(cells, f, rand) {
  let best = [], bv = -Infinity;
  for (const i of cells) {
    const x = f(i);
    if (x > bv + 1e-9) { bv = x; best = [i]; } else if (x > bv - 1e-9) best.push(i);
  }
  return best[Math.floor(rand() * best.length)];
}

// Exact expected points still to come on board b (written in place, restored) when `left` more numbers
// will be drawn from `deck` (null = fair d10), always picking the best spot. Cheap for the last few holes.
function expectRest(b, deck, left) {
  if (!left) return 0;
  const total = deck ? deck.reduce((a, c) => a + c, 0) : 10;
  let sum = 0;
  for (let w = 1; w <= 10; w++) {
    const c = deck ? deck[w] : 1;
    if (!c) continue;
    if (deck) deck[w]--;
    let best = -Infinity;
    for (const j of empties(b)) {
      const g = gain(b, j, w);
      b[j] = w;
      best = Math.max(best, g + expectRest(b, deck, left - 1));
      b[j] = 0;
    }
    if (deck) deck[w]++;
    sum += (c / total) * best;
  }
  return sum;
}

// Monte Carlo: play the rest of the game many times with the heuristic policy (same future draws for every
// candidate, so the comparison is fair) and keep the spot with the best average final score.
// With only a few holes left the expectation is computed exactly instead.
function rollouts(s, p, rand, K = 8, M = 60) {
  const b = s.boards[p], v = s.roll, pr = odds(s), cells = empties(b);
  if (cells.length <= 1) return cells[0];
  if (cells.length <= 4) {
    const x = b.slice(), deck = s.deck && s.deck.slice();
    return argmax(cells, (i) => {
      const g = gain(x, i, v);
      x[i] = v;
      const e = expectRest(x, deck, cells.length - 1);
      x[i] = 0;
      return g + e;
    }, rand);
  }
  const ranked = cells.map((i) => [i, heur(b, i, v, pr)]).sort((x, y) => y[1] - x[1]).slice(0, K).map((x) => x[0]);
  const left = cells.length - 1;
  const futures = [];
  const pile = [];
  if (s.deck) s.deck.forEach((c, w) => { for (let k = 0; k < c; k++) pile.push(w); });
  for (let m = 0; m < M; m++) {
    if (!s.deck) { futures.push(Array.from({ length: left }, () => 1 + Math.floor(rand() * 10))); continue; }
    const a = pile.slice();
    for (let k = 0; k < left; k++) { const j = k + Math.floor(rand() * (a.length - k)); [a[k], a[j]] = [a[j], a[k]]; }
    futures.push(a.slice(0, left));
  }
  const fixedPr = odds(s);
  return argmax(ranked, (i) => {
    let sum = 0;
    for (const seq of futures) {
      const x = b.slice();
      x[i] = v;
      for (const w of seq) {
        const e = empties(x);
        let bi = e[0], bv = -Infinity;
        for (const j of e) { const h = heur(x, j, w, fixedPr); if (h > bv) { bv = h; bi = j; } }
        x[bi] = w;
      }
      sum += score(x);
    }
    return sum / futures.length;
  }, rand);
}

// level: easy (grabs points it sees ~3 times in 4, otherwise anywhere), normal (greedy: most points now,
// random among ties), hard (Monte Carlo over the heuristic policy: points now + value of spots opened/spoiled).
function aiMove(s, p, level = 'normal', rand = Math.random) {
  const b = s.boards[p], v = s.roll, cells = empties(b);
  if (level === 'easy') {
    const best = argmax(cells, (i) => gain(b, i, v), rand);
    if (gain(b, best, v) > 0 && rand() < 0.75) return best;
    return cells[Math.floor(rand() * cells.length)];
  }
  if (level === 'hard') return rollouts(s, p, rand);
  return argmax(cells, (i) => gain(b, i, v), rand);
}
// The heuristic policy alone, without look-ahead (what the hard AI's rollouts play; used in tests).
const smartMove = (s, p, rand = Math.random) => {
  const b = s.boards[p], pr = odds(s);
  return argmax(empties(b), (i) => heur(b, i, s.roll, pr), rand);
};

export const NB = {
  SIDE, CELLS, ROUNDS,
  create, clone, draw, place, canPlace, waiting, empties,
  gain, runs, score, scores, winners, masked, odds, aiMove, smartMove,
};
