// Art for Hugo's haunted house: the house itself, candles, bells, frames,
// shapes, and the story scenes. All procedural SVG; 100×100 boxes unless noted.

import { hugo, pim, dame, chapel, treasure } from '../../art.js';
import { piece } from '../dorp/art.js';

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

/** A candle; `lit` adds a flame and glow, otherwise a curl of smoke. */
export function candle(lit, { color = '#f4ead2' } = {}) {
  return `<g class="candle ${lit ? 'candle-on' : 'candle-off'}">
    ${lit ? '<circle class="candle-glow" cx="50" cy="30" r="34" fill="url(#g-lantern)"/>' : ''}
    <ellipse cx="50" cy="90" rx="26" ry="6" fill="#8a6a3a"/>
    <path d="M30 88 q20 -8 40 0 v-4 h-40z" fill="#b8862a"/>
    <rect x="38" y="40" width="24" height="46" rx="4" fill="${color}" stroke="#b8a882" stroke-width="2"/>
    <path d="M40 44 q4 6 0 12" stroke="#fffaf0" stroke-width="3" fill="none" opacity=".7"/>
    <path d="M50 40 v-6" stroke="#3a2a1a" stroke-width="2.5"/>
    ${
      lit
        ? '<path class="flame" d="M50 8 C58 18 60 24 56 30 C54 34 46 34 44 30 C40 24 42 18 50 8Z" fill="#ffc53d"/><path d="M50 18 C54 24 54 28 52 31 C51 32 49 32 48 31 C46 28 46 24 50 18Z" fill="#fff3b0"/>'
        : '<path class="smoke" d="M50 32 q-6 -6 0 -12 q6 -6 0 -12" stroke="#9aa3c8" stroke-width="3" fill="none" opacity=".6"/>'
    }
  </g>`;
}

/** A cobweb in the top-left corner of a box of size `s`. */
export function cobweb(s = 100) {
  const r = s * 0.42;
  const angles = [0, 22.5, 45, 67.5, 90].map((a) => (a * Math.PI) / 180);
  const pt = (a, f) => `${(Math.cos(a) * r * f).toFixed(1)} ${(Math.sin(a) * r * f).toFixed(1)}`;
  const spokes = angles.map((a) => `M0 0 L${pt(a, 1)}`).join(' ');
  const rings = [0.35, 0.65, 0.95].map((f) => 'M' + angles.map((a) => pt(a, f)).join(' L')).join(' ');
  return `<g class="cobweb" stroke="#cfd6ee" stroke-width="1.6" fill="none" opacity=".65"><path d="${spokes} ${rings}"/></g>`;
}

/** A picture frame of w×h around nothing (content is drawn separately). */
export function frame(w = 100, h = 100, color = '#b8862a') {
  return `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="6" fill="none" stroke="${color}" stroke-width="7"/>
    <rect x="7" y="7" width="${w - 14}" height="${h - 14}" rx="3" fill="none" stroke="#6b4a2a" stroke-width="2"/>`;
}

/** A church-style bell in `color`; `ring` adds motion lines. */
export function bell(color, ring = false) {
  return `<g class="bell-shape">
    ${ring ? '<g class="ringing" stroke="#ffe27a" stroke-width="4" fill="none" stroke-linecap="round"><path d="M14 30 q-8 14 0 28"/><path d="M86 30 q8 14 0 28"/></g>' : ''}
    <path d="M44 12 a6 6 0 0 1 12 0" stroke="#6b4a2a" stroke-width="4" fill="none"/>
    <path d="M50 14 C30 14 28 40 26 62 L18 76 H82 L74 62 C72 40 70 14 50 14Z" fill="${color}" stroke="#2a1d3a" stroke-width="3"/>
    <path d="M34 28 q-2 14 -3 28" stroke="#fff" stroke-width="3" fill="none" opacity=".45"/>
    <circle cx="50" cy="84" r="7" fill="#6b4a2a"/>
  </g>`;
}

/** Hugo, stuck in a gold frame, looking cross (the curse). 100×100. */
export function hugoPortrait({ free = false } = {}) {
  return `<g>
    <rect x="6" y="6" width="88" height="88" fill="${free ? '#fff3c4' : '#3a2e5a'}"/>
    ${free ? '' : '<circle cx="72" cy="28" r="14" fill="url(#g-moon)"/>'}
    ${free ? '' : at(10, 26, 0.4, hugo())}
    ${frame(100, 100, '#c9a13a')}
  </g>`;
}

// ---------- the house ----------

/** Room slots on the house: [x, y, w, h] in a 1000×1000 box. */
export const ROOM_SLOTS = {
  toren: [410, 40, 180, 170],
  zolder: [250, 280, 220, 170],
  raam: [530, 280, 220, 170],
  galerij: [150, 500, 220, 170],
  bibliotheek: [390, 500, 220, 170],
  rekenkamer: [630, 500, 220, 170],
  hal: [250, 720, 220, 170],
  zaal: [530, 720, 220, 170],
  kelder: [390, 910, 220, 80],
};

/** The house outline behind the rooms (1000×1000). `lit` rooms get warm windows. */
export function house({ cursed = true, windows = false } = {}) {
  const wall = cursed ? '#2e2748' : '#e8dcc0';
  const roof = cursed ? '#1b1530' : '#8a3f3f';
  return `<g class="mansion">
    <rect x="120" y="470" width="760" height="430" fill="${wall}" stroke="#120d22" stroke-width="6"/>
    <rect x="220" y="260" width="560" height="210" fill="${wall}" stroke="#120d22" stroke-width="6"/>
    <polygon points="200,262 500,150 800,262" fill="${roof}"/>
    <polygon points="100,472 500,380 900,472" fill="${roof}" opacity=".9"/>
    <rect x="400" y="30" width="200" height="200" fill="${wall}" stroke="#120d22" stroke-width="6"/>
    <polygon points="380,34 500,-60 620,34" fill="${roof}"/>
    <rect x="360" y="900" width="280" height="96" fill="#1a1528" stroke="#120d22" stroke-width="6"/>
    <path d="M0 900 H1000" stroke="#3b3f6e" stroke-width="10"/>
    ${windows ? houseWindows(cursed) : ''}
  </g>`;
}

/** Arched windows and a door, for the house seen from outside. */
function houseWindows(cursed) {
  const glass = cursed ? '#3b2f66' : '#ffd35a';
  const win = ([x, y, w, h]) => {
    const cx = x + w / 2;
    return `<path d="M${cx - 34} ${y + h - 30} V${y + 60} A34 34 0 0 1 ${cx + 34} ${y + 60} V${y + h - 30}Z" fill="${glass}" stroke="#120d22" stroke-width="6"/>
      <path d="M${cx} ${y + 30} V${y + h - 30} M${cx - 34} ${y + 90} H${cx + 34}" stroke="#120d22" stroke-width="5"/>`;
  };
  return Object.entries(ROOM_SLOTS)
    .filter(([id]) => id !== 'kelder' && id !== 'hal')
    .map(([, slot]) => win(slot))
    .join('') + `<path d="M300 900 V790 A60 60 0 0 1 420 790 V900Z" fill="#4a2f1a" stroke="#120d22" stroke-width="6"/><circle cx="400" cy="850" r="7" fill="#c9a13a"/>`;
}

// ---------- shapes for "Wat komt er nu?" and "Schaduwen" ----------

export const GLASS = ['#e0474c', '#3f7fd0', '#f2c23a', '#3f9f5a', '#9a62b3', '#f08a3a'];

const SHAPE_PATHS = {
  circle: '<circle cx="50" cy="50" r="34"/>',
  square: '<rect x="18" y="18" width="64" height="64" rx="6"/>',
  triangle: '<path d="M50 14 L86 82 H14Z"/>',
  diamond: '<path d="M50 10 L88 50 L50 90 L12 50Z"/>',
  star: '<path d="M50 10 l11 24 26 3 -19 18 5 26 -23 -13 -23 13 5 -26 -19 -18 26 -3z"/>',
  heart: '<path d="M50 86 C20 62 10 44 22 28 C32 16 46 20 50 32 C54 20 68 16 78 28 C90 44 80 62 50 86Z"/>',
  moon: '<path d="M62 12 A38 38 0 1 0 62 88 A48 48 0 0 1 62 12Z"/>',
  arrow: '<path d="M50 10 L84 48 H62 V88 H38 V48 H16Z"/>',
};

export const SHAPES = Object.keys(SHAPE_PATHS);

/** One shape. `rot` in quarter turns; `count` > 1 draws that many small ones. */
export function shape({ kind, color, rot = 0, count = 1, size = 1 }) {
  const body = (s) => `<g fill="${color}" stroke="#1b1330" stroke-width="${4 / s}" stroke-linejoin="round">${SHAPE_PATHS[kind]}</g>`;
  if (count > 1) {
    const cols = count <= 3 ? count : Math.ceil(count / 2);
    const rows = Math.ceil(count / cols);
    const cell = 100 / Math.max(cols, rows);
    const out = [];
    for (let k = 0; k < count; k++) {
      const cx = (k % cols) * cell + (100 - cols * cell) / 2;
      const cy = Math.floor(k / cols) * cell + (100 - rows * cell) / 2;
      out.push(at(cx + cell * 0.08, cy + cell * 0.08, (cell / 100) * 0.84, body(cell / 100)));
    }
    return `<g transform="rotate(${rot * 90} 50 50)">${out.join('')}</g>`;
  }
  const s = 0.55 + 0.45 * size;
  return `<g transform="rotate(${rot * 90} 50 50) translate(${50 - 50 * s} ${50 - 50 * s}) scale(${s})">${body(s)}</g>`;
}

/** Dots like on a die, for small numbers (1–10). */
export function dots(n) {
  const pos = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[26, 26], [50, 50], [74, 74]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[30, 24], [70, 24], [30, 50], [70, 50], [30, 76], [70, 76]],
  };
  if (n <= 6) return pos[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('');
  // 7–10: two rows of five, filled left to right.
  return Array.from({ length: n }, (_, k) => `<circle cx="${14 + (k % 5) * 18}" cy="${k < 5 ? 34 : 66}" r="7.5"/>`).join('');
}

// ---------- pictures for the pairs game (reusing the other modes' art) ----------

export const PAIR_PICTURES = [
  () => treasure(0),
  () => treasure(1),
  () => treasure(2),
  () => at(8, 8, 0.84, chapel()),
  () => at(4, 6, 0.9, pim({ glow: false })),
  () => at(6, 6, 0.88, dame({ scare: 'zacht' })),
  () => piece('N'),
  () => piece('k'),
  () => candle(true),
  () => bell('#f2c23a'),
  () => at(-4, 12, 0.54, hugo()),
  () => shape({ kind: 'moon', color: '#fbf6dc' }),
];

// ---------- the sliding portrait (300×300) ----------

export function portrait() {
  return `<g class="portrait">
    <rect width="300" height="300" fill="url(#g-night)"/>
    <rect width="300" height="150" fill="#27407a"/>
    <circle cx="232" cy="64" r="40" fill="url(#g-moon)"/>
    ${[[30, 30], [90, 60], [150, 22], [60, 110], [180, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff8d8"/>`).join('')}
    <path d="M0 200 Q75 160 150 200 T300 196 V300 H0Z" fill="#6d6f9e"/>
    <path d="M0 250 Q80 222 160 250 T300 246 V300 H0Z" fill="#948ab3"/>
    ${at(170, 118, 1.1, chapel({ lit: true, treasures: [0, 1, 2] }))}
    ${at(10, 150, 1.25, pim())}
    ${at(120, 20, 0.45, hugo())}
    <rect x="3" y="3" width="294" height="294" fill="none" stroke="#c9a13a" stroke-width="6"/>
  </g>`;
}

// ---------- scenes (1600×900) ----------

function night(extra = '') {
  return `<rect width="1600" height="900" fill="url(#g-night)"/>
    <circle cx="1360" cy="140" r="100" fill="url(#g-moon)"/>${extra}
    <path d="M0 700 Q400 640 800 690 T1600 680 V900 H0Z" fill="var(--dune-far)"/>`;
}

export function scene(name, { scare = 'spannend' } = {}) {
  switch (name) {
    case 'mansion':
      return `${night()}${at(500, 60, 0.62, house({ windows: true }))}
        ${at(250, 520, 1.6, hugo())}
        <path d="M0 820 Q800 780 1600 820 V900 H0Z" fill="var(--dune-near)"/>`;
    case 'spell':
      return `${night()}
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M800 420 L${800 + Math.cos(i * 0.785) * 600} ${420 + Math.sin(i * 0.785) * 600}" stroke="#b58cff" stroke-width="10" opacity=".35"/>`).join('')}
        <circle cx="800" cy="420" r="180" fill="#b58cff" opacity=".25" filter="url(#f-soft)"/>
        ${at(600, 240, 2.4, hugo())}`;
    case 'stuck':
      return `${night()}${at(560, 120, 4.8, hugoPortrait())}
        ${at(180, 520, 1.6, candle(false))}${at(1260, 520, 1.6, candle(false))}
        ${at(0, 0, 3, cobweb())}`;
    case 'enter':
      return `${night()}${at(700, 40, 0.62, house({ windows: true }))}
        ${at(200, 400, 4.2, pim())}`;
    case 'lifted':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        <circle cx="1300" cy="240" r="200" fill="url(#g-sun)"/>
        ${at(480, 40, 0.66, house({ cursed: false, windows: true }))}
        <path d="M0 820 Q800 780 1600 820 V900 H0Z" fill="#c9a866"/>`;
    case 'free':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        ${at(160, 140, 4.4, hugoPortrait({ free: true }))}
        ${at(760, 400, 1.8, hugo())}
        ${at(1120, 380, 3.6, pim())}
        <path d="M0 840 Q800 800 1600 840 V900 H0Z" fill="#c9a866"/>`;
    case 'map':
      return `${night()}<path d="M0 820 Q800 780 1600 820 V900 H0Z" fill="var(--dune-near)"/>`;
    default:
      return night();
  }
}

/** The mode-menu card (200×150). */
export function card() {
  return `${at(52, 4, 0.1, house({ windows: true }))}${at(18, 80, 0.5, candle(true))}${at(142, 72, 0.5, candle(false))}`;
}
