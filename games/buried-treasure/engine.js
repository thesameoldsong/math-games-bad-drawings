// Buried Treasure: pure game logic + AI. No DOM.
//
// Map of size N (7, 9 or 11): letters A.. across, numbers 1..N down. Each player secretly holds
// K = (N-1)/2 letters and K numbers; the leftover letter + number mark the treasure.
// A turn = ask about one card (truthful yes/no) + dig at one cell.
// Dig result: 'opp'  — the opponent holds the letter or the number ("no treasure here"),
//             'self' — the opponent holds neither, the digger holds one ("actually, nothing here"),
//             'win'  — nobody holds either: that's the treasure.
// Cards are strings: 'A'..'K' and '1'..'11'. The public log is all both players hear at the table.

const LETTERS = 'ABCDEFGHIJK';
const letters = (n) => LETTERS.slice(0, n).split('');
const numbers = (n) => Array.from({ length: n }, (_, i) => String(i + 1));
const isLetter = (c) => /^[A-K]$/.test(c);
const cellKey = (l, n) => l + n;

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function create({ size = 9, first = 0 } = {}, rand = Math.random) {
  const k = (size - 1) / 2;
  const L = shuffle(letters(size), rand), N = shuffle(numbers(size), rand);
  return {
    size, first, turn: first, phase: 'ask', winner: -1,
    hands: [[...L.slice(0, k), ...N.slice(0, k)], [...L.slice(k, 2 * k), ...N.slice(k, 2 * k)]],
    treasure: [L[2 * k], N[2 * k]],
    log: [],
  };
}
const clone = (s) => JSON.parse(JSON.stringify(s));

// What player p is allowed to know: own hand + public log (+ everything once the game is over).
function view(s, p) {
  const v = clone(s);
  if (s.phase !== 'over') { v.hands[1 - p] = null; v.treasure = null; }
  return v;
}

function resolve(hands, a, l, n) {
  const opp = hands[1 - a], me = hands[a];
  if (opp.includes(l) || opp.includes(n)) return 'opp';
  if (me.includes(l) || me.includes(n)) return 'self';
  return 'win';
}

const isCard = (s, c) => letters(s.size).includes(c) || numbers(s.size).includes(c);
const isCell = (s, l, n) => letters(s.size).includes(l) && numbers(s.size).includes(n);

// Mutating moves. Return the new log entry (or null if illegal).
function ask(s, card) {
  if (s.phase !== 'ask' || !isCard(s, card)) return null;
  const e = { p: s.turn, t: 'ask', c: card, yes: s.hands[1 - s.turn].includes(card) };
  s.log.push(e);
  s.phase = 'dig';
  return e;
}
function dig(s, l, n) {
  if (s.phase !== 'dig' || !isCell(s, l, n)) return null;
  const r = resolve(s.hands, s.turn, l, n);
  const e = { p: s.turn, t: 'dig', l, n, r };
  s.log.push(e);
  if (r === 'win') { s.phase = 'over'; s.winner = s.turn; }
  else { s.turn = 1 - s.turn; s.phase = 'ask'; }
  return e;
}
// Generic move object, handy for online play: {t:'ask', c} | {t:'dig', l, n}
const apply = (s, m) => (m.t === 'ask' ? ask(s, m.c) : dig(s, m.l, m.n));

// ---------- deduction ----------
// Every (letter, number) treasure that is consistent with p's hand and the public log.
function candidates(size, hand, log, p) {
  const Ls = letters(size).filter((c) => !hand.includes(c));
  const Ns = numbers(size).filter((c) => !hand.includes(c));
  const out = [];
  for (const tl of Ls) for (const tn of Ns) {
    const opp = [...Ls, ...Ns].filter((c) => c !== tl && c !== tn);
    const hands = p === 0 ? [hand, opp] : [opp, hand];
    if (log.every((e) => (e.t === 'ask' ? hands[1 - e.p].includes(e.c) === e.yes : resolve(hands, e.p, e.l, e.n) === e.r))) out.push([tl, tn]);
  }
  return out;
}

// Per-card knowledge for p: 'mine' | 'opp' (opponent holds it) | 'gold' (treasure coordinate) | '?'.
// smart: full deduction from every clue; simple: only own cards and direct answers.
function knowledge(size, hand, log, p, smart = true) {
  const k = {};
  const all = [...letters(size), ...numbers(size)];
  for (const c of all) k[c] = hand.includes(c) ? 'mine' : '?';
  if (smart) {
    const cand = candidates(size, hand, log, p);
    for (const c of all) {
      if (k[c] === 'mine' || !cand.length) continue;
      const i = isLetter(c) ? 0 : 1;
      const hits = cand.filter((x) => x[i] === c).length;
      if (!hits) k[c] = 'opp';
      else if (hits === cand.length) k[c] = 'gold';
    }
  } else {
    for (const e of log) if (e.t === 'ask' && e.p === p && k[e.c] !== 'mine') k[e.c] = e.yes ? 'opp' : 'gold';
    // once all but one card of a kind is known, the last one is the treasure
    for (const group of [letters(size), numbers(size)]) {
      const open = group.filter((c) => k[c] === '?');
      if (open.length === 1 && !group.some((c) => k[c] === 'gold')) k[open[0]] = 'gold';
      if (group.some((c) => k[c] === 'gold')) for (const c of open) if (k[c] === '?') k[c] = 'opp';
    }
  }
  return k;
}

// ---------- AI ----------
// The AI only ever sees view(s, me): its own hand and the public log.
const pick = (a, rand) => a[Math.floor(rand() * a.length)];

function entropy(ws) {
  const tot = ws.reduce((a, b) => a + b, 0);
  let h = 0;
  for (const w of ws) if (w > 0) { const q = w / tot; h -= q * Math.log2(q); }
  return h;
}

// Hard AI: the opponent usually asks about cards they DON'T hold, so a question about a card
// we don't hold hints that it's the treasure. Weight candidates by that (bluffs stay possible).
function weights(v, me, cand, soft) {
  return cand.map(([tl, tn]) => {
    let w = 1;
    if (soft) for (const e of v.log) {
      if (e.t !== 'ask' || e.p === me || v.hands[me].includes(e.c)) continue;
      if (e.c !== tl && e.c !== tn) w *= 0.25;
    }
    return w;
  });
}

function aiAsk(v, level, rand = Math.random) {
  const me = v.turn, hand = v.hands[me], size = v.size;
  const all = [...letters(size), ...numbers(size)];
  const notMine = all.filter((c) => !hand.includes(c));
  if (level === 'easy') {
    const k = knowledge(size, hand, v.log, me, false);
    const open = notMine.filter((c) => k[c] === '?');
    return open.length && rand() < 0.5 ? pick(open, rand) : pick(notMine, rand);
  }
  const cand = candidates(size, hand, v.log, me);
  const w = weights(v, me, cand, level === 'hard');
  const solved = cand.length <= 1;
  // Hard bluffs: once it knows the spot (or now and then) it asks about an own card,
  // so its questions don't tell the opponent where the treasure is.
  if (level === 'hard' && (solved || rand() < 0.08)) return pick(hand, rand);
  let best = [], bv = -1;
  for (const c of notMine) {
    const i = isLetter(c) ? 0 : 1;
    let y = 0, n = 0;
    cand.forEach((x, j) => (x[i] === c ? (n += w[j]) : (y += w[j])));
    const h = entropy([y, n]);
    if (h > bv + 1e-9) { bv = h; best = [c]; } else if (Math.abs(h - bv) < 1e-9) best.push(c);
  }
  return pick(best, rand);
}

function aiDig(v, level, rand = Math.random) {
  const me = v.turn, hand = v.hands[me], size = v.size;
  const Ls = letters(size), Ns = numbers(size);
  if (level === 'easy') {
    const k = knowledge(size, hand, v.log, me, false);
    // Easy forgets half of what it learned.
    const ok = (group) => {
      const gold = group.filter((c) => k[c] === 'gold');
      if (gold.length && rand() < 0.6) return gold;
      return group.filter((c) => k[c] !== 'mine' && (k[c] !== 'opp' || rand() < 0.5));
    };
    const okL = ok(Ls), okN = ok(Ns);
    return { l: pick(okL.length ? okL : Ls, rand), n: pick(okN.length ? okN : Ns, rand) };
  }
  const cand = candidates(size, hand, v.log, me);
  if (cand.length === 1) return { l: cand[0][0], n: cand[0][1] };
  const w = weights(v, me, cand, level === 'hard');
  const tot = w.reduce((a, b) => a + b, 0);
  let best = [], bv = -Infinity;
  for (const l of Ls) for (const n of Ns) {
    const out = { opp: 0, self: 0, win: 0 };
    cand.forEach(([tl, tn], j) => {
      if (tl === l && tn === n) out.win += w[j];
      else if ((!hand.includes(l) && l !== tl) || (!hand.includes(n) && n !== tn)) out.opp += w[j];
      else out.self += w[j];
    });
    const sc = (out.win / tot) * 2.4 + entropy([out.opp, out.self, out.win]);
    if (sc > bv + 1e-9) { bv = sc; best = [{ l, n }]; } else if (Math.abs(sc - bv) < 1e-9) best.push({ l, n });
  }
  return pick(best, rand);
}

function aiMove(v, level, rand = Math.random) {
  return v.phase === 'ask' ? { t: 'ask', c: aiAsk(v, level, rand) } : { t: 'dig', ...aiDig(v, level, rand) };
}

export const BT = {
  letters, numbers, isLetter, cellKey, create, clone, view, resolve,
  ask, dig, apply, candidates, knowledge, aiAsk, aiDig, aiMove,
};
