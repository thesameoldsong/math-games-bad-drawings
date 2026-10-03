// Hand-drawn auction lots (our own drawings): each fits a 100 × 100 box. Wobble is seeded per item.
import { line, circle, curve, withSeed, PALETTE } from '../../shared/sketch.js';

const INK = PALETTE.ink;
const EYE = 'var(--ce-eye)'; // eyes / print on a coloured fill: stays dark in both themes
const S = (d, w = 3.2, c = INK) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const F = (d, c) => `<path d="${d}" fill="${c}" filter="url(#mg-crayon)"/>`;
const FS = (d, c, w) => F(d, c) + S(d, w);
const poly = (pts, close = true) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + (close ? ' Z' : '');

const DRAW = [
  // 0 teddy bear
  () => {
    const brown = '#c58b52', light = '#ecc597';
    return FS(circle(30, 22, 10), brown) + FS(circle(70, 22, 10), brown) +
      FS(circle(50, 76, 24, 20), brown) + FS(circle(26, 88, 9, 7), brown) + FS(circle(74, 88, 9, 7), brown) +
      FS(circle(50, 38, 22, 20), brown) + FS(circle(50, 76, 12, 10), light) + FS(circle(50, 45, 9, 7), light) +
      `<circle cx="42" cy="34" r="2.6" fill="${EYE}"/><circle cx="58" cy="34" r="2.6" fill="${EYE}"/><circle cx="50" cy="42" r="2.8" fill="${EYE}"/>` +
      S(line(46, 48, 50, 50, 0.3), 2.2, EYE) + S(line(50, 50, 54, 48, 0.3), 2.2, EYE);
  },
  // 1 pencil stub
  () => {
    const body = poly([[22, 62], [62, 30], [74, 44], [34, 76]]);
    return FS(body, '#f6c945') + FS(poly([[62, 30], [70, 23], [82, 37], [74, 44]]), '#f39aa7') +
      FS(poly([[22, 62], [34, 76], [12, 82]]), '#efd9b4') + `<path d="M12 82 L16 77 L18 81 Z" fill="${INK}"/>` +
      S(line(28, 69, 68, 37, 0.6), 2) + S(line(80, 30, 86, 24, 1), 2.4) + S(line(84, 38, 92, 36, 1), 2.4);
  },
  // 2 cracker
  () => {
    const sq = poly([[18, 22], [82, 18], [86, 80], [22, 84]]);
    let dots = '';
    for (const [x, y] of [[34, 36], [52, 34], [70, 33], [35, 52], [53, 51], [71, 50], [36, 68], [54, 67], [72, 66]]) dots += `<circle cx="${x}" cy="${y}" r="2.4" fill="#9a6a2c"/>`;
    return FS(sq, '#e9b867') + S(poly([[24, 27], [77, 24], [80, 75], [28, 78]]), 1.6, '#b98436') + dots +
      FS(circle(60, 40, 7, 5), '#a86a3a');
  },
  // 3 discount coupon
  () => {
    const t = 'M10 30 L90 26 L90 42 Q83 50 90 58 L90 74 L10 76 L10 60 Q17 52 10 44 Z';
    return FS(t, '#9fdc9a') + S(line(66, 30, 66, 72, 0.5) , 2, INK).replace('stroke-width', 'stroke-dasharray="4 5" stroke-width') +
      `<text x="38" y="61" font-family="Caveat, cursive" font-weight="700" font-size="30" text-anchor="middle" fill="${EYE}">−20%</text>` +
      `<path d="${circle(79, 51, 5)}" stroke="${INK}" stroke-width="2" fill="var(--ce-frame)"/>`;
  },
  // 4 paperclip
  () => {
    const d = curve([[40, 78], [40, 26], [52, 16], [64, 26], [64, 70], [56, 80], [48, 70], [48, 34]]);
    return S(d, 7, '#9aa4b1') + S(d, 2.4, INK);
  },
  // 5 lonely sock
  () => {
    const d = 'M36 12 L64 12 L64 58 Q66 72 84 74 Q94 80 86 90 L46 90 Q30 88 34 70 Z';
    return FS(d, '#f58b95') + S(line(36, 26, 64, 26, 0.6), 5, '#fff') + S(line(36, 38, 64, 38, 0.6), 5, '#fff') +
      S(line(36, 18, 64, 18, 0.4), 2.4) + FS(circle(83, 82, 6, 5), '#b3172b');
  },
  // 6 rubber duck
  () => FS(circle(52, 66, 32, 20), '#f8d23a') + FS(circle(36, 36, 16, 15), '#f8d23a') +
    FS('M20 36 L6 40 L20 44 Z', '#f28a1e') + `<circle cx="33" cy="32" r="2.8" fill="${EYE}"/>` +
    S(curve([[48, 62], [60, 54], [72, 60]]), 2.4, EYE),
  // 7 chipped mug
  () => {
    const body = 'M20 24 L56 22 L60 30 L68 24 L72 26 L70 84 L24 86 Z';
    return FS(body, '#7fd0ea') + S(curve([[71, 38], [88, 40], [88, 60], [70, 66]]), 5) +
      S(curve([[30, 48], [40, 42], [50, 50], [60, 44]]), 2.2, '#0b6f94') + S(line(32, 20, 30, 10, 1.5), 2, PALETTE.pencil) + S(line(46, 18, 48, 6, 1.5), 2, PALETTE.pencil);
  },
  // 8 spoon
  () => FS(circle(50, 28, 15, 20), '#d4d9e0') + S(line(50, 48, 52, 92, 1), 7, INK) + S(line(50, 48, 52, 92, 1), 3, '#d4d9e0') +
    S(curve([[44, 20], [46, 14], [52, 12]]), 2, '#fff'),
  // 9 mystery key
  () => FS(circle(28, 50, 17), '#e7c34a') + `<path d="${circle(28, 50, 6)}" fill="var(--ce-frame)" stroke="${INK}" stroke-width="2.4"/>` +
    S(line(44, 50, 90, 50, 0.6), 7, INK) + S(line(44, 50, 90, 50, 0.6), 3, '#e7c34a') +
    S(line(80, 52, 80, 64, 0.3), 5) + S(line(70, 52, 70, 60, 0.3), 5) +
    `<text x="66" y="34" font-family="Caveat, cursive" font-weight="700" font-size="26" fill="${INK}">?</text>`,
  // 10 banana
  () => {
    const d = 'M14 34 Q24 82 78 74 Q90 70 88 64 Q60 68 40 52 Q26 40 22 26 Z';
    return FS(d, '#f6d84a') + S(curve([[22, 34], [34, 58], [60, 68]]), 1.8, '#c79a1a') + S(line(14, 34, 22, 26, 0.3), 5, '#6b4a1c');
  },
  // 11 light bulb
  () => FS(circle(50, 38, 24, 26), '#fff3a6') + FS(poly([[40, 62], [60, 62], [58, 82], [42, 82]]), '#b9bec6') +
    S(line(41, 69, 59, 69, 0.3), 2) + S(line(42, 75, 58, 75, 0.3), 2) +
    S(curve([[44, 62], [44, 46], [50, 40], [56, 46], [56, 62]]), 2, '#c79a1a') +
    S(line(18, 16, 24, 22, 1), 2.4, '#f0a020') + S(line(82, 16, 76, 22, 1), 2.4, '#f0a020') + S(line(50, 4, 50, 10, 1), 2.4, '#f0a020'),
];

const cache = {};
// SVG markup of item `id` scaled to `size` and placed with its top-left at (x, y).
export function itemSVG(id, x, y, size) {
  const k = id % DRAW.length;
  const inner = (cache[k] ??= withSeed(101 + k * 17, DRAW[k]));
  return `<g transform="translate(${x} ${y}) scale(${size / 100})">${inner}</g>`;
}
