// Hand-drawn SVG helpers: wobbly lines, marker circles, crayon fills, stick figures.

function rng(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = Math.random;
function withSeed(seed, fn) {
  const prev = rand;
  rand = rng(seed);
  try { return fn(); } finally { rand = prev; }
}
const jit = (a) => (rand() * 2 - 1) * a;
const f = (n) => n.toFixed(1);

function line(x1, y1, x2, y2, amp = 1.4) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bend = jit(amp) * Math.min(1, len / 40);
  const mx = (x1 + x2) / 2 + nx * bend, my = (y1 + y2) / 2 + ny * bend;
  const e = amp * 0.5;
  return `M${f(x1 + jit(e))} ${f(y1 + jit(e))} Q${f(mx)} ${f(my)} ${f(x2 + jit(e))} ${f(y2 + jit(e))}`;
}

function curve(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// Marker circle: slightly lumpy, start and end overlap like a real pen stroke.
function circle(cx, cy, rx, ry = rx, amp = 0.05) {
  const n = 12, start = rand() * Math.PI * 2, over = 0.25 + rand() * 0.3, pts = [];
  for (let i = 0; i <= n; i++) {
    const a = start + ((Math.PI * 2 + over) * i) / n, k = 1 + jit(amp);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return curve(pts);
}

// Grey pencil scribble used as a ground shadow under figures.
function scribble(cx, cy, w, h, n = 11) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = cx - w / 2 + (w * i) / n, t = (x - cx) / (w / 2);
    const hh = h * Math.sqrt(Math.max(0.05, 1 - t * t));
    pts.push(`${f(x + jit(2))} ${f(cy + ((i % 2 ? 1 : -1) * hh) / 2 + jit(1))}`);
  }
  return 'M' + pts.join(' L');
}

const DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<defs>
  <filter id="mg-crayon" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="noise"/>
    <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="mask"/>
    <feComposite in="SourceGraphic" in2="mask" operator="in"/>
  </filter>
  <filter id="mg-marker" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="2"/>
  </filter>
</defs>
</svg>`;
function injectDefs() {
  if (!document.getElementById('mg-crayon')) document.body.insertAdjacentHTML('afterbegin', DEFS);
}

const PALETTE = {
  // CSS custom properties, so drawings follow the light/dark theme (see :root in shared/style.css).
  // main = strokes, text = coloured text on paper, fill = crayon tint, dark = eyes/mouth drawn on the head.
  blue: { main: 'var(--blue)', text: 'var(--blue-dark)', fill: 'var(--blue-fill)', dark: 'var(--blue-face)' },
  red: { main: 'var(--red)', text: 'var(--red-dark)', fill: 'var(--red-fill)', dark: 'var(--red-face)' },
  // extra seats for 3+ player games
  green: { main: 'var(--green)', text: 'var(--green-dark)', fill: 'var(--green-fill)', dark: 'var(--green-face)' },
  violet: { main: 'var(--violet)', text: 'var(--violet-dark)', fill: 'var(--violet-fill)', dark: 'var(--violet-face)' },
  ink: 'var(--dot)',
  pencil: 'var(--pencil)',
};

// Stick figure in the book's spirit (our own drawing).
// mood: neutral | happy | sad | smug | worried; pose: down | point | up | wave; face: right | left
function figure({ color = PALETTE.blue, mood = 'neutral', pose = 'down', face = 'right', seed = 1 } = {}) {
  return withSeed(seed, () => {
    const d = face === 'right' ? 1 : -1;
    const hx = 70, hy = 60, hr = 42;
    const sw = 'stroke-linecap="round" stroke-linejoin="round" fill="none"';
    const P = (path, w = 4.5, c = color.main) => `<path d="${path}" stroke="${c}" stroke-width="${w}" ${sw}/>`;
    let s = '';

    s += `<path d="${scribble(hx, 228, 78, 14)}" stroke="${PALETTE.pencil}" stroke-width="5" ${sw} filter="url(#mg-crayon)"/>`;

    // body + limbs
    const neckY = hy + hr - 2, hipY = 172, shY = 120;
    s += P(line(hx, neckY, hx + jit(2), hipY));
    s += P(line(hx, hipY, hx - 15, 226)) + P(line(hx, hipY, hx + 15, 226));
    const arms = {
      down: [[hx - 24, 170], [hx + 24, 170]],
      point: [[hx - d * 22, 170], [hx + d * 62, 112]],
      up: [[hx - 52, 86], [hx + 52, 86]],
      wave: [[hx - d * 22, 170], [hx + d * 44, 84]],
    }[pose] || [[hx - 24, 170], [hx + 24, 170]];
    for (const [ax, ay] of arms) s += P(line(hx, shY, ax, ay));

    // head: crayon fill + marker outline
    const head = circle(hx, hy, hr, hr * 1.02);
    s += `<path d="${head}" fill="${color.main}" filter="url(#mg-crayon)"/>`;
    s += P(head, 4.5);

    // eyes
    const ex = [hx - 15 + d * 7, hx + 15 + d * 7], ey = hy - 8, rx = 14.5, ry = 17;
    const look = { happy: [d * 3, -5], sad: [d * 1, 6], smug: [d * 6, 4], worried: [-d * 4, 1], neutral: [d * 6, 0] }[mood] || [d * 6, 0];
    for (const x of ex) {
      s += `<path d="${circle(x, ey, rx, ry, 0.04)}" fill="var(--eye)" stroke="${color.dark}" stroke-width="3" ${sw.replace('fill="none"', '')}/>`;
      s += `<circle cx="${f(x + look[0])}" cy="${f(ey + look[1])}" r="5.8" fill="${color.dark}"/>`;
      if (mood === 'sad' || mood === 'smug') {
        const lid = `M${f(x - rx - 1)} ${f(ey + 1)} Q${f(x)} ${f(ey - ry - 6)} ${f(x + rx + 1)} ${f(ey + 1)} Z`;
        s += `<path d="${lid}" fill="${color.fill}" stroke="${color.dark}" stroke-width="3" stroke-linejoin="round"/>`;
      }
      if (mood === 'worried') s += P(line(x - 8, ey - ry - 6 + (x < hx ? 3 : -3) * d, x + 8, ey - ry - 6 - (x < hx ? 3 : -3) * d, 0.4), 3, color.dark);
    }

    // mouth
    const mx = hx + d * 6, my = hy + 22;
    const mouth = {
      happy: `M${f(mx - 10)} ${f(my - 2)} Q${f(mx)} ${f(my + 11)} ${f(mx + 10)} ${f(my - 2)}`,
      smug: `M${f(mx - 9)} ${f(my + 1)} Q${f(mx + 2)} ${f(my + 7)} ${f(mx + 11)} ${f(my - 4)}`,
      sad: `M${f(mx - 9)} ${f(my + 6)} Q${f(mx)} ${f(my - 4)} ${f(mx + 9)} ${f(my + 6)}`,
      worried: `M${f(mx - 7)} ${f(my + 3)} Q${f(mx - 3)} ${f(my - 1)} ${f(mx)} ${f(my + 3)} Q${f(mx + 3)} ${f(my + 7)} ${f(mx + 7)} ${f(my + 2)}`,
      neutral: line(mx - 7, my + 2, mx + 7, my + 1, 0.6),
    }[mood];
    s += P(mouth, 3.2, color.dark);

    return s;
  });
}

function figureSVG(opts) {
  return `<svg viewBox="0 0 140 240" class="mg-figure" aria-hidden="true">${figure(opts)}</svg>`;
}

export { rng, withSeed, line, circle, curve, scribble, injectDefs, figure, figureSVG, PALETTE };
