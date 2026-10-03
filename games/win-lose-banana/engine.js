// Win, Lose, Banana — pure rules + computer players (no DOM).
//
// Three players, three cards: win, lose, banana. The holder of "win" is public and must guess
// which of the other two (the suspects) holds "banana". Right guess: win + banana share the victory.
// Wrong guess: lose wins alone.
//
// Digital additions (see strings for wording):
// - Suspects "talk" by choosing pitches (stock phrases). If the guesser is a computer, every
//   suspect gets exactly one pitch (a final word) and the computer guesses once all have spoken.
// - Computer suspects may show a visible "tell" (calm / nervous face) chosen at the deal.
// - The normal computer guesser keeps a per-seat model of the humans' pitches by role and
//   picks the likelier banana (Bayes with Laplace smoothing).

const ROLES = ['win', 'lose', 'banana'];
const PITCHES = ['me', 'liar', 'swear', 'bluff'];

// How computer suspects talk: P(pitch | role) and P(nervous | role), per level.
const BOT = {
  easy: {
    banana: { pitch: { me: 0.6, liar: 0.1, swear: 0.3, bluff: 0 }, nervous: 0.15 },
    lose: { pitch: { me: 0.3, liar: 0.4, swear: 0.1, bluff: 0.2 }, nervous: 0.75 },
  },
  normal: {
    banana: { pitch: { me: 0.45, liar: 0.2, swear: 0.25, bluff: 0.1 }, nervous: 0.25 },
    lose: { pitch: { me: 0.45, liar: 0.25, swear: 0.2, bluff: 0.1 }, nervous: 0.4 },
  },
};

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickWeighted(weights, rng) {
  const keys = Object.keys(weights);
  const total = keys.reduce((s, k) => s + weights[k], 0);
  let r = rng() * total;
  for (const k of keys) { r -= weights[k]; if (r < 0) return k; }
  return keys[keys.length - 1];
}
const lvl = (level) => (level === 'easy' ? 'easy' : 'normal');
const isSeat = (p) => Number.isInteger(p) && p >= 0 && p < 3;

export const WLB = {
  ROLES, PITCHES, BOT,

  // bots: [bool ×3] which seats are computers; level: 'easy' | 'normal'.
  create({ bots = [false, false, false], level = 'normal', scores = [0, 0, 0], round = 1, rng = Math.random, roles } = {}) {
    roles = roles ? roles.slice() : shuffle(ROLES.slice(), rng);
    const win = roles.indexOf('win');
    const st = {
      roles, win, bots: bots.slice(), level: lvl(level),
      phase: 'talk',
      said: [[], [], []],
      tell: [null, null, null],
      oneWord: !!bots[win],      // a computer guesser listens to one final word from each suspect
      pick: null,
      result: null,
      scores: scores.slice(), round, n: 0,
    };
    for (const p of WLB.suspects(st)) {
      if (bots[p]) st.tell[p] = rng() < BOT[st.level][roles[p]].nervous ? 'nervous' : 'calm';
    }
    return st;
  },

  clone: (st) => JSON.parse(JSON.stringify(st)),
  suspects: (st) => [0, 1, 2].filter((p) => p !== st.win),
  bananaOf: (st) => st.roles.indexOf('banana'),
  loseOf: (st) => st.roles.indexOf('lose'),
  isOver: (st) => st.phase === 'over',

  canPitch(st, p, id) {
    return st.phase === 'talk' && isSeat(p) && p !== st.win && PITCHES.includes(id) && (!st.oneWord || st.said[p].length === 0);
  },
  pitch(st, p, id) {
    if (!WLB.canPitch(st, p, id)) return false;
    st.said[p].push(id);
    st.n++;
    return true;
  },
  // A computer guesser waits until every suspect has had their word.
  allSpoke: (st) => WLB.suspects(st).every((p) => st.said[p].length > 0),

  canPick(st, target) {
    return st.phase === 'talk' && isSeat(target) && target !== st.win && (!st.oneWord || WLB.allSpoke(st));
  },
  pick(st, target) {
    if (!WLB.canPick(st, target)) return false;
    const banana = WLB.bananaOf(st), lose = WLB.loseOf(st);
    const correct = target === banana;
    st.pick = target;
    st.phase = 'over';
    st.result = { correct, banana, lose, winners: correct ? [st.win, banana] : [lose] };
    for (const p of st.result.winners) st.scores[p]++;
    st.n++;
    return true;
  },

  // What seat `viewer` may know (-1: a spectator). The guesser's card is public; everything is
  // public after the reveal. Hidden roles become null.
  view(st, viewer) {
    const v = WLB.clone(st);
    if (st.phase !== 'over') v.roles = st.roles.map((r, p) => (p === st.win || p === viewer ? r : null));
    // a suspect who knows their own card can deduce the other one
    if (st.phase !== 'over' && viewer >= 0 && viewer !== st.win) v.roles = st.roles.slice();
    return v;
  },

  // ---------- computer players ----------
  aiPitch(st, p, rng = Math.random) {
    return pickWeighted(BOT[st.level][st.roles[p]].pitch, rng);
  },

  // model: { [seat]: { banana: {pitch: count}, lose: {pitch: count} } } — what humans said by role.
  newModel: () => ({}),
  learn(model, st) {
    if (st.phase !== 'over' || !st.oneWord) return model;
    for (const p of WLB.suspects(st)) {
      if (st.bots[p] || !st.said[p].length) continue;
      const m = (model[p] ||= { banana: {}, lose: {} });
      const role = st.roles[p], id = st.said[p][st.said[p].length - 1];
      m[role][id] = (m[role][id] || 0) + 1;
    }
    return model;
  },
  // P(observation of seat p | p holds `role`)
  likelihood(st, model, p, role) {
    const id = st.said[p][st.said[p].length - 1];
    if (st.bots[p]) {
      const b = BOT[st.level][role];
      let l = id ? b.pitch[id] + 0.02 : 1;
      if (st.tell[p]) l *= st.tell[p] === 'nervous' ? b.nervous : 1 - b.nervous;
      return l;
    }
    if (!id) return 1;
    const m = model?.[p]?.[role] || {};
    const total = PITCHES.reduce((s, k) => s + (m[k] || 0), 0);
    return ((m[id] || 0) + 1) / (total + PITCHES.length);
  },
  // Probability (for the guesser) that suspect a holds banana rather than b.
  bananaChance(st, model, a) {
    const b = WLB.suspects(st).find((x) => x !== a);
    const ab = WLB.likelihood(st, model, a, 'banana') * WLB.likelihood(st, model, b, 'lose');
    const ba = WLB.likelihood(st, model, a, 'lose') * WLB.likelihood(st, model, b, 'banana');
    return ab + ba > 0 ? ab / (ab + ba) : 0.5;
  },
  aiGuess(st, model, rng = Math.random) {
    const [a, b] = WLB.suspects(st);
    if (st.level === 'easy') return rng() < 0.5 ? a : b;
    const pa = WLB.bananaChance(st, model, a);
    // a little noise so a human can't farm a fully predictable reader
    if (Math.abs(pa - 0.5) < 0.03 || rng() < 0.1) return rng() < 0.5 ? a : b;
    return pa > 0.5 ? a : b;
  },
};
