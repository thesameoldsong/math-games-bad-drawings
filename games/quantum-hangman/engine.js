// Quantum Hangman — pure rules + computer players (no DOM).
//
// The setter secretly picks 2 (or 3) words of equal length. Each guessed letter fills its blanks in
// EVERY still-alive word. When two different letters land in the same blank, the guessers must keep
// one of them: every alive word whose (revealed) letter there differs is eliminated, and its letters
// leave the board — guesses that only matched it turn into wrong guesses. Guessers win when an alive
// word is fully revealed, lose at `maxWrong` wrong guesses.
import { WORDS } from './words.js';

export const ALPHA = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ru: 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
};
// Rough letter frequency orders (fallback when no dictionary word fits).
const FREQ = {
  en: 'ETAOINSRHLDCUMFPGWYBVKXJQZ',
  ru: 'ОЕАИНТСРВЛКМДПУЯЫЬГЗБЧЙХЖШЮЦЩЭФЪ',
};
export const MIN_LEN = 3, MAX_LEN = 10;

const norm = (w) => String(w || '').trim().toUpperCase().replace(/Ё/g, 'Е');
function alphaOf(w) {
  if (/^[A-Z]+$/.test(w)) return 'en';
  if (/^[А-Я]+$/.test(w)) return 'ru';
  return null;
}
const byLen = {};
function pool(alpha, L) {
  const k = alpha + L;
  return (byLen[k] ??= (WORDS[alpha] || []).filter((w) => w.length === L));
}

// Validate setter input; returns null when fine or an error code.
function checkWords(raw) {
  const ws = raw.map(norm);
  if (ws.some((w) => !w)) return 'empty';
  const al = ws.map(alphaOf);
  if (al.some((a) => !a)) return 'chars';
  if (al.some((a) => a !== al[0])) return 'mixed';
  if (ws.some((w) => w.length < MIN_LEN)) return 'short';
  if (ws.some((w) => w.length > MAX_LEN)) return 'long';
  if (ws.some((w) => w.length !== ws[0].length)) return 'len';
  if (new Set(ws).size !== ws.length) return 'same';
  return null;
}

function create(raw, maxWrong = 8) {
  const words = raw.map(norm);
  return { words, alpha: alphaOf(words[0]), L: words[0].length, alive: words.map(() => true), guessed: [], maxWrong, n: 0 };
}
const clone = (s) => ({ ...s, words: [...s.words], alive: [...s.alive], guessed: [...s.guessed] });

const aliveWords = (s) => s.words.filter((_, i) => s.alive[i]);
const inAlive = (s, c) => aliveWords(s).some((w) => w.includes(c));

// cells[i] = distinct revealed letters at blank i among alive words.
function cells(s) {
  const G = new Set(s.guessed), out = [];
  for (let i = 0; i < s.L; i++) {
    const set = [];
    s.words.forEach((w, k) => { if (s.alive[k] && G.has(w[i]) && !set.includes(w[i])) set.push(w[i]); });
    out.push(set);
  }
  return out;
}
// Letters of eliminated words that were on the board (drawn struck through).
function ghosts(s) {
  const G = new Set(s.guessed), cs = cells(s);
  return cs.map((set, i) => {
    const g = [];
    s.words.forEach((w, k) => { if (!s.alive[k] && G.has(w[i]) && !set.includes(w[i]) && !g.includes(w[i])) g.push(w[i]); });
    return g;
  });
}
const conflictPos = (s) => cells(s).findIndex((c) => c.length > 1);
function wrong(s) {
  return s.guessed.filter((c) => !inAlive(s, c)).map((c) => ({ c, retro: s.words.some((w) => w.includes(c)) }));
}
const fullWord = (s) => s.words.findIndex((w, k) => s.alive[k] && [...w].every((c) => s.guessed.includes(c)));

function status(s) {
  if (wrong(s).length >= s.maxWrong) return 'lost';
  if (conflictPos(s) >= 0) return 'conflict';
  if (fullWord(s) >= 0) return 'won';
  return 'play';
}
const isOver = (s) => { const x = status(s); return x === 'won' || x === 'lost'; };

const canGuess = (s, c) => status(s) === 'play' && ALPHA[s.alpha].includes(c) && !s.guessed.includes(c);

// Returns {hit, blanks, conflict} — blanks = number of positions newly showing the letter.
function guess(s, c) {
  if (!canGuess(s, c)) return null;
  s.guessed.push(c);
  s.n++;
  let blanks = 0;
  for (let i = 0; i < s.L; i++) if (aliveWords(s).some((w) => w[i] === c)) blanks++;
  return { hit: blanks > 0, blanks, conflict: conflictPos(s) >= 0 };
}

// Keep `letter` at the conflicting blank `pos`. Returns {eliminated, retro} or null if illegal.
function resolve(s, pos, letter) {
  if (status(s) !== 'conflict' || conflictPos(s) !== pos || !cells(s)[pos].includes(letter)) return null;
  const before = wrong(s).length, G = new Set(s.guessed), eliminated = [];
  s.words.forEach((w, k) => {
    if (s.alive[k] && G.has(w[pos]) && w[pos] !== letter) { s.alive[k] = false; eliminated.push(k); }
  });
  s.n++;
  return { eliminated, retro: wrong(s).length - before };
}

// What a player may see. Words are only included when `reveal` (game over, or the setter's own screen).
function view(s, reveal = false) {
  const v = {
    L: s.L, alpha: s.alpha, guessed: [...s.guessed], nWords: s.words.length, alive: s.alive.filter(Boolean).length,
    cells: cells(s), ghosts: ghosts(s), wrong: wrong(s), maxWrong: s.maxWrong, status: status(s),
    conflict: conflictPos(s), n: s.n,
  };
  if (reveal) { v.words = [...s.words]; v.aliveMask = [...s.alive]; }
  return v;
}

// ---------- computer guesser (sees only the public view) ----------
function hypotheses(v, level) {
  const G = new Set(v.guessed);
  const singles = pool(v.alpha, v.L).filter((w) => {
    for (let i = 0; i < v.L; i++) {
      const c = v.cells[i];
      if (G.has(w[i]) && !c.includes(w[i])) return false;
      if (v.alive === 1 && c.length && w[i] !== c[0]) return false;
    }
    return true;
  });
  if (level === 'hard' && v.alive === 2 && singles.length < 400) {
    // Exact test for pairs: the board must show precisely the guessed letters of the two words.
    const pairs = [];
    for (let a = 0; a < singles.length; a++) for (let b = a + 1; b < singles.length; b++) {
      const x = singles[a], y = singles[b];
      let ok = true;
      for (let i = 0; i < v.L && ok; i++) {
        const want = v.cells[i], got = [];
        if (G.has(x[i])) got.push(x[i]);
        if (G.has(y[i]) && y[i] !== x[i]) got.push(y[i]);
        ok = got.length === want.length && got.every((c) => want.includes(c));
      }
      if (ok) pairs.push([x, y]);
    }
    if (pairs.length) return { kind: 'pairs', list: pairs };
  }
  return { kind: 'singles', list: singles.map((w) => [w]) };
}

function aiGuess(v, level = 'normal', rnd = Math.random) {
  const G = new Set(v.guessed);
  const open = [...ALPHA[v.alpha]].filter((c) => !G.has(c));
  const freq = [...FREQ[v.alpha]].filter((c) => !G.has(c));
  if (!open.length) return null;
  // Weaker levels sometimes just blurt out a common letter instead of thinking.
  const blurt = { easy: 0.75, normal: 0.3, hard: 0 }[level] ?? 0;
  if (rnd() < blurt) {
    const top = freq.slice(0, level === 'easy' ? 8 : 4);
    return top[Math.floor(rnd() * top.length)] || open[0];
  }
  const { list } = hypotheses(v, level);
  if (!list.length) return freq[0] || open[0];
  const score = {};
  for (const h of list) {
    const seen = new Set(h.join(''));
    for (const c of seen) if (!G.has(c)) score[c] = (score[c] || 0) + 1;
  }
  let best = null, bs = -1;
  for (const c of freq) {
    const sc = (score[c] || 0) + (level !== 'hard' ? rnd() * 0.5 : 0);
    if (sc > bs) { bs = sc; best = c; }
  }
  return bs > 0 || level !== 'hard' ? best : freq[0];
}

// Pick which letter to keep in a conflict.
function aiResolve(v, level = 'normal', rnd = Math.random) {
  const pos = v.conflict, opts = v.cells[pos];
  if (level === 'hard') {
    const { kind, list } = hypotheses(v, 'hard');
    if (kind === 'pairs' && list.length) {
      const G = new Set(v.guessed);
      let best = null, bc = Infinity;
      for (const x of opts) {
        let tot = 0, cnt = 0;
        for (const [a, b] of list) {
          const kept = a[pos] === x ? a : b[pos] === x ? b : null;
          if (!kept) continue;
          const wrongAfter = v.guessed.filter((c) => !kept.includes(c)).length;
          const remain = new Set([...kept].filter((c) => !G.has(c))).size;
          tot += wrongAfter + 0.7 * remain; cnt++;
        }
        const cost = cnt ? tot / cnt : 99;
        if (cost < bc) { bc = cost; best = x; }
      }
      if (best) return { pos, letter: best };
    }
  }
  return { pos, letter: opts[Math.floor(rnd() * opts.length)] };
}

// One computer action for the guesser side of a full state (used by tests / simulations).
function aiAct(s, level, rnd = Math.random) {
  const v = view(s);
  if (v.status === 'conflict') { const r = aiResolve(v, level, rnd); return resolve(s, r.pos, r.letter); }
  return guess(s, aiGuess(v, level, rnd));
}

// ---------- computer setter ----------
function randomWords(alpha, L, n, rnd = Math.random) {
  const p = pool(alpha, L);
  const pick = new Set();
  while (pick.size < n && pick.size < p.length) pick.add(p[Math.floor(rnd() * p.length)]);
  return [...pick];
}
function aiWords(alpha, L, n, level = 'normal', rnd = Math.random) {
  const tries = level === 'easy' ? 1 : level === 'normal' ? 5 : 18;
  let best = null, bs = -Infinity;
  for (let t = 0; t < tries; t++) {
    const ws = randomWords(alpha, L, n, rnd);
    if (tries === 1) return ws;
    // Play it out against a normal guesser; prefer sets that cost it the most.
    let sc = 0;
    for (let k = 0; k < 2; k++) {
      const s = create(ws);
      while (!isOver(s)) aiAct(s, 'normal', rnd);
      sc += wrong(s).length + (status(s) === 'lost' ? 4 : 0);
    }
    if (sc > bs) { bs = sc; best = ws; }
  }
  return best;
}

export const QH = {
  ALPHA, MIN_LEN, MAX_LEN, norm, alphaOf, pool, checkWords, create, clone, cells, ghosts, conflictPos, wrong,
  fullWord, status, isOver, canGuess, guess, resolve, view, aiGuess, aiResolve, aiAct, randomWords, aiWords,
};
