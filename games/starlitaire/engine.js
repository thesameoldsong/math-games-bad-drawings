// Starlitaire: a circle of n dots joined by a counting rule ("skip k dots").
// Pure logic, no DOM. A rule is a list of skips repeated in a cycle, e.g. [2] or [1, 2];
// pattern === null means free drawing (any dot to any dot).

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const divisors = (n) => { const d = []; for (let i = 1; i <= n; i++) if (n % i === 0) d.push(i); return d; };
const mod = (a, n) => ((a % n) + n) % n;

// Rule presets offered in the settings (skips per step).
const PATTERNS = [[1, 2], [1, 3], [2, 3], [0, 2], [1, 1, 2], [2, 4]];

function create(n, pattern = [1]) {
  if (!(n >= 3)) throw new Error('need at least 3 dots');
  if (pattern) {
    if (!pattern.length) throw new Error('empty rule');
    for (const k of pattern) if (!(Number.isInteger(k) && k >= 0 && k + 1 < n)) throw new Error('bad skip ' + k);
  }
  return {
    n, pattern: pattern ? [...pattern] : null,
    segs: [],          // [from, to, loopIndex]
    loops: [],         // {start, verts:[dots in visiting order], closed}
    pen: null,         // dot where the pen rests, null = pen lifted
    pi: 0,             // index into pattern for the next step
    touched: Array(n).fill(false),
    mistakes: 0,
  };
}

const clone = (s) => ({
  ...s, pattern: s.pattern && [...s.pattern], segs: s.segs.map((x) => [...x]),
  loops: s.loops.map((l) => ({ ...l, verts: [...l.verts] })), touched: [...s.touched],
});

const free = (s) => !s.pattern;
const isDone = (s) => !free(s) && s.pen === null && s.touched.every(Boolean);

// The dot the rule sends the pen to next (null when the pen is up or in free mode).
function next(s) {
  if (free(s) || s.pen === null) return null;
  return mod(s.pen + s.pattern[s.pi] + 1, s.n);
}

// Dots that may be tapped to begin a new figure.
function startDots(s) {
  if (s.pen !== null) return [];
  const all = [...Array(s.n).keys()];
  return free(s) ? all : all.filter((d) => !s.touched[d]);
}

// Dots jumped over by the next step (for the "count with me" hint).
function skipped(s) {
  const to = next(s);
  if (to === null) return [];
  const out = [];
  for (let d = mod(s.pen + 1, s.n); d !== to; d = mod(d + 1, s.n)) out.push(d);
  return out;
}

function begin(s, d) {
  s.loops.push({ start: d, verts: [d], closed: false });
  s.pen = d; s.pi = 0; s.touched[d] = true;
}

// Apply a tap on dot d. Returns what happened:
// 'start' | 'line' | 'close' | 'done' | 'lift' | 'wrong' | 'ignored'
function tap(s, d) {
  if (!Number.isInteger(d) || d < 0 || d >= s.n || isDone(s)) return 'ignored';
  if (s.pen === null) {
    if (!startDots(s).includes(d)) return 'ignored';
    begin(s, d);
    return 'start';
  }
  const loop = s.loops[s.loops.length - 1];
  if (free(s)) {
    if (d === s.pen) {
      if (loop.verts.length < 2) s.loops.pop();
      else loop.closed = true;
      s.pen = null;
      return 'lift';
    }
    s.segs.push([s.pen, d, s.loops.length - 1]);
    loop.verts.push(d); s.touched[d] = true; s.pen = d;
    return 'line';
  }
  if (d !== next(s)) { s.mistakes++; return 'wrong'; }
  s.segs.push([s.pen, d, s.loops.length - 1]);
  s.pen = d; s.touched[d] = true; s.pi = (s.pi + 1) % s.pattern.length;
  if (d === loop.start && s.pi === 0) {
    loop.closed = true; s.pen = null;
    return isDone(s) ? 'done' : 'close';
  }
  loop.verts.push(d);
  return 'line';
}

// The tap an automatic drawer would make: follow the rule, or start at the
// first untouched dot clockwise from the previous figure's start.
function autoTap(s) {
  if (isDone(s) || free(s)) return null;
  if (s.pen !== null) return next(s);
  const from = s.loops.length ? s.loops[s.loops.length - 1].start : 0;
  for (let i = 0; i < s.n; i++) { const d = mod(from + i, s.n); if (!s.touched[d]) return d; }
  return null;
}

// Draw everything automatically; returns the finished state.
function complete(s) {
  const c = clone(s);
  let guard = 0;
  while (!isDone(c) && guard++ < 100000) tap(c, autoTap(c));
  return c;
}

// Figures (closed loops) with their number of distinct corners.
function figures(s) {
  return s.loops.filter((l) => l.closed).map((l) => ({ start: l.start, corners: new Set(l.verts).size, steps: s.segs.filter((x) => s.loops[x[2]] === l).length }));
}

// How many figures the rule draws from dot 0 (the automatic order).
const predictFigures = (n, pattern) => figures(complete(create(n, pattern))).length;

// Choices for the "how many figures?" guess. Only a single skip has a fixed
// answer, gcd(n, k + 1), which always divides n; with a mixed rule the count
// depends on which empty dots the player starts from, so there is no guess.
function guessChoices(n, pattern) {
  if (!pattern || pattern.length !== 1) return [];
  return divisors(n).filter((d) => d < n);
}

// A mixed rule whose steps add up to a whole lap just runs back and forth
// along one chord, so it is not offered.
const degenerate = (n, pattern) => pattern.length > 1 && pattern.reduce((a, k) => a + k + 1, 0) % n === 0;

export const STAR = {
  gcd, divisors, PATTERNS, create, clone, free, isDone, next, startDots, skipped, tap, autoTap, complete,
  figures, predictFigures, guessChoices, degenerate,
};
