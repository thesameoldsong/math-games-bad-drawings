// Caveat Emptor: pure game logic + computer bidders. No DOM.
//
// Every round one lot goes under the hammer. Each player secretly picks a card 1..M (M = rounds + 1,
// each card usable once per game); the lot's true value is the sum of all picked cards.
// Bidding starts left of the auctioneer and goes round: raise or drop out (dropping reveals your card).
// The last player standing buys the lot at their bid and scores (true value − price), possibly negative.
//
// State is plain JSON (cheap to clone and to send online). view(s, p) hides what player p may not see.

export const ITEM_COUNT = 12;

function create({ n = 4, rounds = 5, first = 0, items, rnd = Math.random } = {}) {
  const M = rounds + 1;
  let lots = items;
  if (!lots) {
    const pool = Array.from({ length: ITEM_COUNT }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    lots = Array.from({ length: rounds }, (_, i) => pool[i % ITEM_COUNT]);
  }
  return {
    n, rounds, M, round: 0, first, auctioneer: first % n, items: lots,
    used: Array.from({ length: n }, () => []),   // cards spent in finished rounds (public)
    pick: Array(n).fill(0),                      // this round's secret card (0 = not chosen yet)
    revealed: Array(n).fill(false),
    active: Array(n).fill(true),
    bids: Array(n).fill(0),                      // each player's latest bid this round
    bid: 0, bidder: -1, turn: -1,
    phase: 'pick',                               // pick → bid → reveal → pick … → over
    scores: Array(n).fill(0),
    results: [],                                 // finished rounds
    seq: 0, ev: [],
  };
}

const clone = (s) => JSON.parse(JSON.stringify(s));
const maxBid = (s) => s.n * s.M;
// Cards player q may still hold this round (public knowledge: 1..M minus cards used earlier).
function avail(s, q) {
  const out = [];
  for (let c = 1; c <= s.M; c++) if (!s.used[q].includes(c)) out.push(c);
  return out;
}
const activeCount = (s) => s.active.filter(Boolean).length;
const nextActive = (s, p) => { let q = p; do q = (q + 1) % s.n; while (!s.active[q]); return q; };
const minBid = (s) => s.bid + 1;
const isOver = (s) => s.phase === 'over';

function legal(s, a) {
  if (!a || typeof a !== 'object') return false;
  switch (a.t) {
    case 'pick':
      return s.phase === 'pick' && Number.isInteger(a.p) && a.p >= 0 && a.p < s.n && s.pick[a.p] === 0 && avail(s, a.p).includes(a.card);
    case 'bid':
      return s.phase === 'bid' && a.p === s.turn && Number.isInteger(a.amount) && a.amount >= minBid(s) && a.amount <= maxBid(s);
    case 'drop':
      return s.phase === 'bid' && a.p === s.turn && s.bidder >= 0; // the opener must name a price
    case 'next':
      return s.phase === 'reveal';
    default:
      return false;
  }
}

// Mutates s. Fills s.ev with what happened (public info only).
function apply(s, a) {
  if (!legal(s, a)) throw new Error('illegal action ' + JSON.stringify(a));
  s.seq++;
  s.ev = [];
  if (a.t === 'pick') {
    s.pick[a.p] = a.card;
    s.ev.push({ t: 'pick', p: a.p });
    if (s.pick.every((c) => c > 0)) {
      s.phase = 'bid';
      s.turn = (s.auctioneer + 1) % s.n;
      s.ev.push({ t: 'bidstart', p: s.turn });
    }
  } else if (a.t === 'bid') {
    s.ev.push({ t: 'bid', p: a.p, amount: a.amount, open: s.bidder < 0 });
    s.bid = a.amount; s.bidder = a.p; s.bids[a.p] = a.amount;
    s.turn = nextActive(s, a.p);
  } else if (a.t === 'drop') {
    s.active[a.p] = false; s.revealed[a.p] = true;
    s.ev.push({ t: 'drop', p: a.p, card: s.pick[a.p] });
    if (activeCount(s) === 1) resolve(s);
    else s.turn = nextActive(s, a.p);
  } else if (a.t === 'next') {
    for (let p = 0; p < s.n; p++) s.used[p].push(s.pick[p]);
    s.round++;
    s.auctioneer = (s.first + s.round) % s.n;
    s.pick = Array(s.n).fill(0);
    s.revealed = Array(s.n).fill(false);
    s.active = Array(s.n).fill(true);
    s.bids = Array(s.n).fill(0);
    s.bid = 0; s.bidder = -1; s.turn = -1;
    s.phase = 'pick';
    s.ev.push({ t: 'round', p: s.auctioneer });
  }
  return s;
}

function resolve(s) {
  const w = s.bidder;
  const value = s.pick.reduce((a, b) => a + b, 0);
  const profit = value - s.bid;
  s.scores[w] += profit;
  s.revealed = Array(s.n).fill(true);
  s.turn = -1;
  s.results.push({ round: s.round, item: s.items[s.round], winner: w, price: s.bid, value, profit, picks: s.pick.slice() });
  s.phase = s.round === s.rounds - 1 ? 'over' : 'reveal';
  s.ev.push({ t: 'sold', p: w, price: s.bid, value, profit });
  if (s.phase === 'over') s.ev.push({ t: 'over' });
}

function winners(s) {
  const best = Math.max(...s.scores);
  return s.scores.map((v, i) => (v === best ? i : -1)).filter((i) => i >= 0);
}

// What player p may see: other players' unrevealed cards become -1 (chosen, hidden). p = -1: a spectator.
function view(s, p) {
  const v = clone(s);
  for (let q = 0; q < s.n; q++) if (q !== p && !s.revealed[q]) v.pick[q] = s.pick[q] ? -1 : 0;
  return v;
}

// Range of the true value as seen by p (p's own card known if picked).
function range(v, p) {
  let lo = 0, hi = 0;
  for (let q = 0; q < v.n; q++) {
    if (v.pick[q] > 0 && (q === p || v.revealed[q])) { lo += v.pick[q]; hi += v.pick[q]; continue; }
    const a = avail(v, q);
    lo += a[0]; hi += a[a.length - 1];
  }
  return [lo, hi];
}

// ---------- computer bidders ----------
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const known = (v, q, me) => v.pick[q] > 0 && (q === me || v.revealed[q]);

// Likelihood that q holds card c, judging by how high q has bid so far.
function weights(v, q, me, smart) {
  const cards = avail(v, q);
  if (!smart || !v.active[q] || !v.bids[q]) return cards.map((c) => [c, 1]);
  let rest = 0; // q's own estimate of everybody else, roughly
  for (let k = 0; k < v.n; k++) if (k !== q) rest += v.revealed[k] && v.pick[k] > 0 ? v.pick[k] : mean(avail(v, k));
  return cards.map((c) => {
    const x = c + rest - v.bids[q];
    return [c, 0.12 + 0.88 / (1 + Math.exp(-(x - 0.5) / 1.2))];
  });
}

// Probability distribution of the true value from me's point of view.
function valueDist(v, me, smart) {
  let base = 0, dist = [1];
  for (let q = 0; q < v.n; q++) {
    if (known(v, q, me)) { base += v.pick[q]; continue; }
    const w = weights(v, q, me, smart);
    const tot = w.reduce((a, [, x]) => a + x, 0);
    const nd = Array(dist.length + v.M).fill(0);
    dist.forEach((pr, i) => { if (pr) for (const [c, x] of w) nd[i + c] += (pr * x) / tot; });
    dist = nd;
  }
  return { base, dist };
}
function expected(v, me, smart) {
  const { base, dist } = valueDist(v, me, smart);
  return base + dist.reduce((a, pr, i) => a + pr * i, 0);
}

function pickCard(v, me, rnd) {
  const a = avail(v, me);
  return { t: 'pick', p: me, card: a[Math.floor(rnd() * a.length)] };
}

function easyBid(v, me, rnd) {
  const E = expected(v, me, false);
  const limit = E - 1.5 + rnd() * 5; // often overbids
  const min = minBid(v), cap = maxBid(v);
  if (v.bidder < 0) return { t: 'bid', p: me, amount: Math.min(cap, Math.max(1, Math.round(E - 3 - rnd() * 3))) };
  if (min > limit || min > cap) return { t: 'drop', p: me };
  return { t: 'bid', p: me, amount: Math.min(cap, min + (rnd() < 0.3 ? 1 : 0)) };
}

function normalBid(v, me, rnd) {
  const E = expected(v, me, true);
  let hidden = 0;
  for (let q = 0; q < v.n; q++) if (q !== me && v.active[q] && !v.revealed[q]) hidden++;
  // Losing a lot to someone else only hurts relatively, so bid up to about the expected value, but
  // shade it for the winner's curse: if everyone else quits, their (lower) cards come out.
  const limit = E + 0.5 - 0.35 * hidden * (v.n > 2 ? 1 : 0.3) + (rnd() - 0.5) * 1.4;
  const min = minBid(v), cap = maxBid(v);
  if (v.bidder < 0) {
    const lo = range(v, me)[0];
    return { t: 'bid', p: me, amount: Math.min(cap, Math.max(1, Math.floor(lo + (limit - lo) * (0.35 + rnd() * 0.3)))) };
  }
  if (min > limit || min > cap) return { t: 'drop', p: me };
  return { t: 'bid', p: me, amount: Math.min(cap, min + (rnd() < 0.15 && min + 1 <= limit ? 1 : 0)) };
}

// Hard: try a few actions, play the rest of the auction out many times with sampled hidden cards.
function hardBid(v, me, rnd) {
  const base = normalBid(v, me, rnd);
  const min = minBid(v), cap = maxBid(v);
  const opts = [];
  const add = (a) => { if (legal(v, a) && !opts.some((o) => o.t === a.t && o.amount === a.amount)) opts.push(a); };
  add(base);
  if (v.bidder >= 0) add({ t: 'drop', p: me });
  add({ t: 'bid', p: me, amount: min });
  if (min + 1 <= cap) add({ t: 'bid', p: me, amount: min + 1 });
  if (v.bidder < 0) {
    const lo = range(v, me)[0];
    add({ t: 'bid', p: me, amount: Math.max(1, lo) });
    add({ t: 'bid', p: me, amount: Math.max(1, Math.floor(expected(v, me, true)) - 2) });
  }
  if (opts.length === 1) return base;

  const SAMPLES = 48;
  const hiddenW = [];
  for (let q = 0; q < v.n; q++) hiddenW.push(known(v, q, me) ? null : weights(v, q, me, true));
  const score = opts.map(() => 0);
  for (let k = 0; k < SAMPLES; k++) {
    const full = clone(v);
    for (let q = 0; q < v.n; q++) {
      const w = hiddenW[q];
      if (!w) continue;
      const tot = w.reduce((a, [, x]) => a + x, 0);
      let r = rnd() * tot, c = w[w.length - 1][0];
      for (const [cc, x] of w) { if ((r -= x) <= 0) { c = cc; break; } }
      full.pick[q] = c;
    }
    full.revealed = v.revealed.slice();
    opts.forEach((a, i) => {
      const sim = clone(full);
      apply(sim, a);
      let guard = 400;
      while (sim.phase === 'bid' && guard--) apply(sim, normalBid(view(sim, sim.turn), sim.turn, rnd));
      const r = sim.results[sim.results.length - 1];
      score[i] += r.winner === me ? r.profit : -r.profit / (v.n - 1);
    });
  }
  let best = 0;
  for (let i = 1; i < opts.length; i++) if (score[i] > score[best] + 1e-9) best = i;
  return opts[best];
}

// The computer only ever gets view(s, me): its own card plus public information.
function aiAction(v, me, level = 'normal', rnd = Math.random) {
  if (v.phase === 'pick') return pickCard(v, me, rnd);
  if (v.phase !== 'bid' || v.turn !== me) return null;
  if (level === 'easy') return easyBid(v, me, rnd);
  if (level === 'hard') return hardBid(v, me, rnd);
  return normalBid(v, me, rnd);
}

export const CE = {
  create, clone, legal, apply, view, avail, range, winners, isOver, minBid, maxBid, expected, aiAction,
};
