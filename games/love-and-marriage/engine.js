// Love and Marriage — pure game logic + AI (no DOM).
//
// A party of n guests. Guests 0 and 1 are the two players; the rest are the "crowd",
// played by a simple, deterministic policy. Cards are dealt from a deck 1..n+10.
// Time runs in beats. In each beat the unmarried players act in turn (propose to a guest
// or wait), then the crowd moves. Every unmarried guest points at (proposes to) at most
// one other guest; a marriage happens when a proposal is accepted. A couple takes the
// highest free row of the scoring track. Score = row / |difference| (+5 for the lower card).
// Unmarried players score 0 when the clock runs out. Several rounds; totals decide the match.

const SIZES = [16, 20, 24];
const BEATS = 10;
const SHOUTS = (st) => Math.round(st.n / 8);

function rand(st) {
  // mulberry32 with its state kept inside the game state (so online/undo stay deterministic)
  st.rs = (st.rs + 0x6d2b79f5) | 0;
  let t = st.rs;
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function labels(n) {
  const rows = Math.floor(n / 2), step = n <= 20 ? 10 : 5;
  return Array.from({ length: rows }, (_, i) => 100 - step * i);
}

function create({ guests = 16, rounds = 3, seed } = {}) {
  const n = SIZES.includes(+guests) ? +guests : 16;
  const st = {
    n, rounds: Math.max(1, +rounds || 3), round: 0, T: BEATS, labels: labels(n),
    rs: (seed ?? Math.floor(Math.random() * 2 ** 31)) | 0,
    totals: [0, 0], history: [], moves: 0,
  };
  st.id = Math.floor(Math.random() * 2 ** 31);   // tells one match from another (online resync); not from the seed
  deal(st);
  return st;
}

function deal(st) {
  const deck = Array.from({ length: st.n + 10 }, (_, i) => i + 1);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand(st) * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  st.round++;
  st.card = deck.slice(0, st.n);
  st.partner = Array(st.n).fill(-1);
  st.target = Array(st.n).fill(-1);
  st.score = Array(st.n).fill(0);
  st.row = Array(st.n).fill(-1);
  st.pick = st.card.map(() => 0.35 + rand(st) * 0.5);
  st.known = st.card.map((_, g) => g < 2);
  // where everybody stands in the room (independent of the cards)
  st.pos = Array.from({ length: st.n }, (_, i) => i);
  for (let i = st.n - 1; i > 0; i--) {
    const j = Math.floor(rand(st) * (i + 1));
    [st.pos[i], st.pos[j]] = [st.pos[j], st.pos[i]];
  }
  st.track = [];
  st.beat = 0;
  st.first = (st.round - 1) % 2;
  st.step = 0;
  st.phase = 'play';
  st.turn = st.first;
}

const clone = (st) => JSON.parse(JSON.stringify(st));
const free = (st, g) => st.partner[g] < 0;
const base = (st) => st.labels[st.track.length] ?? 0;
const isPlayer = (g) => g < 2;

// Points a guest g would get by marrying c right now.
function value(st, g, c) {
  const d = Math.abs(st.card[g] - st.card[c]);
  return base(st) / d + (st.card[g] < st.card[c] ? 5 : 0);
}

function singles(st, except = -1) {
  const out = [];
  for (let g = 0; g < st.n; g++) if (g !== except && free(st, g)) out.push(g);
  return out;
}

// The crowd's patience shrinks as the clock runs down: early on a guest only settles for
// a match close to the dream (a free neighbour, one step away, from below).
function threshold(st, g) {
  return st.pick[g] * (base(st) + 5) * Math.max(0, 1 - st.beat / st.T);
}
function crowdAccepts(st, g, c) {
  return free(st, g) && free(st, c) && g !== c && (st.target[g] === c || value(st, g, c) >= threshold(st, g) - 1e-9);
}

function marry(st, a, b, events, by) {
  const row = st.track.length;
  st.partner[a] = b; st.partner[b] = a;
  st.row[a] = st.row[b] = row;
  st.score[a] = value(st, a, b);
  st.score[b] = value(st, b, a);
  st.track.push([a, b]);
  st.target[a] = b; st.target[b] = a;
  st.known[a] = st.known[b] = true;
  events.push({ t: 'marry', a, b, row, base: st.labels[row], by });
}

function crowdPhase(st, events) {
  const order = [];
  for (let g = 2; g < st.n; g++) if (free(st, g)) order.push(g);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand(st) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const g of order) {
    if (!free(st, g)) continue;
    // answer the best acceptable suitor
    let best = -1, bv = -1;
    for (let s = 0; s < st.n; s++) {
      if (s === g || !free(st, s) || st.target[s] !== g) continue;
      if (!crowdAccepts(st, g, s)) continue;
      const v = value(st, g, s);
      if (v > bv) { bv = v; best = s; }
    }
    if (best >= 0) { marry(st, g, best, events, g); continue; }
    // otherwise court the most attractive known guest who would plausibly say yes;
    // walking up to someone means showing them your card
    let tgt = -1, tv = -1;
    const thr = threshold(st, g);
    for (const c of singles(st, g)) {
      if (!st.known[c]) continue;
      const v = value(st, g, c);
      const ok = isPlayer(c) ? Math.abs(st.card[c] - st.card[g]) <= 3 : crowdAccepts(st, c, g);
      if (ok && v >= thr * 0.8 && v > tv) { tv = v; tgt = c; }
    }
    st.target[g] = tgt;
    if (tgt >= 0 && !st.known[g]) { st.known[g] = true; events.push({ t: 'reveal', g, by: g }); }
  }
  // a few guests shout their numbers across the room
  const hidden = singles(st).filter((g) => !st.known[g]);
  for (let k = 0; k < SHOUTS(st) && hidden.length; k++) {
    const g = hidden.splice(Math.floor(rand(st) * hidden.length), 1)[0];
    st.known[g] = true;
    events.push({ t: 'reveal', g, by: g });
  }
}

function bothDone(st) {
  if (!free(st, 0) && !free(st, 1)) return true;
  // a single player with nobody left to marry is done as well
  return [0, 1].every((p) => !free(st, p) || singles(st, p).length === 0);
}

function endRound(st, events) {
  const rs = [st.score[0], st.score[1]];
  st.totals[0] += rs[0]; st.totals[1] += rs[1];
  st.history.push({ round: st.round, cards: [st.card[0], st.card[1]], partners: [st.partner[0] >= 0 ? st.card[st.partner[0]] : null, st.partner[1] >= 0 ? st.card[st.partner[1]] : null], score: rs });
  st.phase = st.round >= st.rounds ? 'over' : 'roundEnd';
  st.turn = -1;
  events.push({ t: st.phase, score: rs });
}

// Moves the turn on: next unmarried player in this beat, or the crowd and a new beat.
function advance(st, events) {
  for (;;) {
    if (bothDone(st)) return endRound(st, events);
    if (st.step < 2) {
      const p = st.step === 0 ? st.first : 1 - st.first;
      if (free(st, p)) { st.turn = p; return; }
      st.step++;
      continue;
    }
    crowdPhase(st, events);
    st.beat++;
    st.step = 0;
    st.first = 1 - st.first;
    if (bothDone(st) || st.beat >= st.T) return endRound(st, events);
  }
}

function legal(st) {
  if (st.phase !== 'play') return st.phase === 'roundEnd' ? [{ t: 'next' }] : [];
  const p = st.turn;
  const s = singles(st, p);
  return [{ t: 'wait' }, ...s.filter((g) => st.known[g]).map((g) => ({ t: 'propose', g })), ...s.filter((g) => !st.known[g]).map((g) => ({ t: 'ask', g }))];
}

function isLegal(st, a) {
  if (!a) return false;
  if (a.t === 'next') return st.phase === 'roundEnd';
  if (st.phase !== 'play') return false;
  if (a.t === 'wait') return true;
  if (a.t === 'ask') return Number.isInteger(a.g) && a.g >= 2 && a.g < st.n && free(st, a.g) && !st.known[a.g];
  return a.t === 'propose' && Number.isInteger(a.g) && a.g >= 0 && a.g < st.n && a.g !== st.turn && free(st, a.g) && st.known[a.g];
}

// Applies an action, returns a list of events for the UI.
function apply(st, a) {
  if (!isLegal(st, a)) throw new Error('illegal action ' + JSON.stringify(a));
  const events = [];
  st.moves++;
  if (a.t === 'next') {
    deal(st);
    events.push({ t: 'deal' });
    return events;
  }
  const p = st.turn;
  if (a.t === 'propose') {
    const g = a.g;
    st.target[p] = g;
    const yes = isPlayer(g) ? st.target[g] === p : crowdAccepts(st, g, p);
    if (yes) marry(st, p, g, events, p);
    else events.push({ t: 'refuse', p, g });
  } else if (a.t === 'ask') {
    st.known[a.g] = true;
    events.push({ t: 'reveal', g: a.g, by: p });
  } else events.push({ t: 'wait', p });
  st.step++;
  advance(st, events);
  return events;
}

// Guests currently proposing to g.
const suitors = (st, g) => singles(st, g).filter((s) => st.target[s] === g);

// ---------- AI for a player (uses only what is on the table: known cards and who courts whom) ----------
function aiAction(st, level = 'normal', rnd = Math.random) {
  if (st.phase === 'roundEnd') return { t: 'next' };
  const p = st.turn;
  const all = singles(st, p);
  if (!all.length) return { t: 'wait' };
  const known = all.filter((g) => st.known[g]).sort((a, b) => value(st, p, b) - value(st, p, a));
  const hidden = all.filter((g) => !st.known[g]);
  const late = st.beat / st.T;
  const ask = () => ({ t: 'ask', g: hidden[Math.floor(rnd() * hidden.length)] });
  const propose = (g) => ({ t: 'propose', g });

  if (level === 'easy') {
    const sui = suitors(st, p);
    if (sui.length && rnd() < 0.3 + late) return propose(sui[Math.floor(rnd() * sui.length)]);
    if (hidden.length && rnd() < 0.45 - late * 0.4) return ask();
    if (known.length && rnd() < 0.8) return propose(known[Math.floor(rnd() * Math.min(3, known.length))]);
    return hidden.length ? ask() : { t: 'wait' };
  }

  // normal
  const best = known.length ? value(st, p, known[0]) : 0;
  // the best score imaginable right now: a free neighbour one step away that might still be hidden
  const dream = base(st) + 5;
  const want = dream * (0.62 - 0.6 * late);           // aspiration falls as the clock runs
  const sui = suitors(st, p).sort((a, b) => value(st, p, b) - value(st, p, a));
  if (sui.length) {
    const v = value(st, p, sui[0]);
    if (v >= want || v >= best * 0.8 || late >= 0.7) return propose(sui[0]);
  }
  const cur = st.target[p];
  const curOk = cur >= 0 && free(st, cur) && st.known[cur] && value(st, p, cur) >= best * 0.85;
  if (known.length && !curOk && (best >= want || !hidden.length || late >= 0.5)) return propose(known[0]);
  if (hidden.length && late < 0.8) return ask();
  if (known.length) {
    // late in the evening: anyone who might say yes
    const alt = known.find((g) => g !== cur) ?? known[0];
    return propose(curOk && late < 0.9 ? cur : alt);
  }
  return hidden.length ? ask() : { t: 'wait' };
}

// What a remote player may see: hidden cards, crowd temperaments and the random seed stay with the host.
function redact(st) {
  const r = clone(st);
  r.card = r.card.map((c, g) => (r.known[g] ? c : 0));
  r.pick = r.pick.map(() => 0);
  r.rs = 0;
  return r;
}

export const LAM = {
  redact,
  SIZES, BEATS, create, clone, legal, isLegal, apply, aiAction, value, base, suitors, singles,
  crowdAccepts, labels, free,
};
