// Art for "Verdedig het dorp": chess pieces and village scenes.
// The villagers are cream-coloured; the bokkenrijders are dark, with goat
// horns, and their knight is a goat. Pieces keep the classic silhouettes
// so a child who knows chess recognises them at once. 100×100 box.

import { hugo, pim } from '../art.js';

const LOOK = {
  w: { fill: '#f7efdc', stroke: '#5a3c22', detail: '#c9a466' },
  b: { fill: '#3a2850', stroke: '#120a1f', detail: '#8f6fc0' },
};

/** Little curled goat horns on top of a robber's head at (x, y). */
function horns(x, y, s = 1) {
  return `<g class="horns" transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#d9c7a0" stroke-width="4" stroke-linecap="round">
    <path d="M-5 0 q-10 -4 -10 -14 q2 6 6 6"/><path d="M5 0 q10 -4 10 -14 q-2 6 -6 6"/>
  </g>`;
}

const BASE = '<path d="M24 86 h52 a4 4 0 0 0 4 -4 v-2 a4 4 0 0 0 -4 -4 h-52 a4 4 0 0 0 -4 4 v2 a4 4 0 0 0 4 4z"/>';

const SHAPES = {
  p: (c) => `${BASE}
    <path d="M34 76 q2 -18 10 -26 h12 q8 8 10 26z"/>
    <path d="M38 50 h24 a3 3 0 0 0 0 -6 h-24 a3 3 0 0 0 0 6z"/>
    <circle cx="50" cy="32" r="13"/>
    ${c === 'b' ? horns(50, 22, 0.8) : ''}`,
  r: () => `${BASE}
    <path d="M32 76 l3 -34 h30 l3 34z"/>
    <path d="M28 42 h44 v-6 h-44z"/>
    <path d="M28 36 v-20 h9 v8 h7 v-8 h12 v8 h7 v-8 h9 v20z"/>`,
  b: (c) => `${BASE}
    <path d="M34 76 q4 -16 8 -22 h16 q4 6 8 22z"/>
    <path d="M36 54 h28 a3 3 0 0 0 0 -6 h-28 a3 3 0 0 0 0 6z"/>
    <path d="M50 14 c-14 10 -18 24 -10 34 h20 c8 -10 4 -24 -10 -34z"/>
    <circle cx="50" cy="12" r="5"/>
    <path d="M56 26 l-10 12" stroke="${LOOK[c].detail}" stroke-width="4" stroke-linecap="round"/>`,
  n: (c) =>
    c === 'b'
      ? // A goat: long face, beard, and big curled horns.
        `${BASE}
        <path d="M32 76 c0 -14 4 -22 10 -28 c-6 2 -14 4 -18 -2 c-4 -6 0 -14 8 -18 l10 -6 c16 -2 28 10 28 30 l-2 24z"/>
        <path d="M30 48 l4 12 l5 -11z"/>
        <circle cx="40" cy="30" r="3" fill="#ffd35a" stroke="none"/>
        <path d="M46 22 q2 -16 16 -14 q10 2 8 12 q-4 -6 -10 -4" fill="none" stroke="#d9c7a0" stroke-width="5" stroke-linecap="round"/>`
      : // A village horse.
        `${BASE}
        <path d="M32 76 c0 -14 4 -22 12 -30 c-8 2 -16 4 -20 -2 c-4 -6 2 -16 12 -20 l6 -12 l6 8 c16 0 26 14 24 34 l-2 22z"/>
        <circle cx="42" cy="30" r="3" fill="${LOOK[c].stroke}" stroke="none"/>
        <path d="M58 22 q10 10 8 30" fill="none" stroke="${LOOK[c].detail}" stroke-width="4" stroke-linecap="round"/>`,
  q: () => `${BASE}
    <path d="M34 76 q2 -14 6 -22 h20 q4 8 6 22z"/>
    <path d="M36 54 h28 a3 3 0 0 0 0 -6 h-28 a3 3 0 0 0 0 6z"/>
    <path d="M30 22 l6 26 h28 l6 -26 l-12 12 l-8 -18 l-8 18z"/>
    <circle cx="30" cy="20" r="5"/><circle cx="50" cy="12" r="5"/><circle cx="70" cy="20" r="5"/>`,
  k: (c) => `${BASE}
    <path d="M34 76 q2 -14 6 -22 h20 q4 8 6 22z"/>
    <path d="M36 54 h28 a3 3 0 0 0 0 -6 h-28 a3 3 0 0 0 0 6z"/>
    <path d="M32 30 c0 -10 36 -10 36 0 l-4 18 h-28z"/>
    <path d="M46 4 h8 v6 h6 v8 h-6 v8 h-8 v-8 h-6 v-8 h6z"/>
    ${c === 'b' ? horns(50, 33, 1.1) : ''}`,
};

/** A chess piece: `letter` as in the position strings (KQRBNP / kqrbnp). */
export function piece(letter) {
  const c = letter === letter.toUpperCase() ? 'w' : 'b';
  const kind = letter.toLowerCase();
  const { fill, stroke } = LOOK[c];
  return `<g class="chess-piece piece-${c}" fill="${fill}" stroke="${stroke}" stroke-width="3.5" stroke-linejoin="round">${SHAPES[kind](c)}</g>`;
}

/** A small pine for the tree squares in the refresher puzzles. */
export function tree() {
  return `<g><rect x="45" y="70" width="10" height="16" fill="#6b4a2a"/>
    <polygon points="50,10 74,44 26,44" fill="#2f7a55"/>
    <polygon points="50,26 80,62 20,62" fill="#276a49"/>
    <polygon points="50,42 84,80 16,80" fill="#1f5a3d"/></g>`;
}

/** A village house (100×100) with a lit window. */
export function house(roof = '#9a4747', lit = true) {
  return `<g class="house">
    <rect x="18" y="44" width="64" height="46" fill="#e8dcc0" stroke="#6b5a40" stroke-width="2"/>
    <polygon points="10,48 50,14 90,48" fill="${roof}"/>
    <rect x="30" y="56" width="16" height="14" fill="${lit ? '#ffd35a' : '#3a3a55'}" stroke="#6b5a40" stroke-width="2"/>
    <path d="M58 90 v-22 h14 v22" fill="#6b4a2a"/>
    ${lit ? '<circle cx="38" cy="63" r="18" fill="url(#g-lantern)" opacity=".4"/>' : ''}
  </g>`;
}

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

function village(y = 520, s = 2.4) {
  const roofs = ['#9a4747', '#6d5a9a', '#9a6a3a', '#4f7a6a', '#9a4747'];
  return roofs.map((r, i) => at(120 + i * 290, y - (i % 2) * 30, s, house(r))).join('');
}

function night(extra = '') {
  return `<rect width="1600" height="900" fill="url(#g-night)"/>
    <circle cx="1350" cy="140" r="100" fill="url(#g-moon)"/>
    ${extra}
    <path d="M0 640 Q400 560 800 630 T1600 610 V900 H0Z" fill="var(--dune-far)"/>`;
}

/** A checkered village square (the board in the story). */
function square(y = 700) {
  const cells = [];
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 3; j++) {
      cells.push(`<rect x="${i * 100}" y="${y + j * 70}" width="100" height="70" fill="${(i + j) % 2 ? '#b0875a' : '#eed9a8'}"/>`);
    }
  }
  return cells.join('');
}

export function scene(name, { scare = 'spannend' } = {}) {
  switch (name) {
    case 'raid':
      return `${night()}
        ${at(900, 260, 1.6, hugo())}${at(1180, 320, 1.1, hugo())}${at(640, 330, 0.9, hugo())}
        ${village(560, 2.2)}
        <path d="M0 800 Q800 760 1600 800 V900 H0Z" fill="var(--dune-near)"/>`;
    case 'square':
      return `${night()}
        ${village(420, 2.2)}
        ${square(660)}
        ${at(260, 470, 2.4, piece('K'))}${at(460, 470, 2.4, piece('Q'))}${at(660, 470, 2.4, piece('N'))}
        ${at(1000, 470, 2.4, piece('p'))}${at(1180, 470, 2.4, piece('n'))}${at(1360, 470, 2.4, piece('k'))}`;
    case 'help':
      return `${night()}
        ${village(460, 2)}
        ${square(700)}
        ${at(380, 330, 4.4, pim())}
        ${at(1020, 420, 3, piece('k'))}`;
    case 'feast':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        <circle cx="800" cy="600" r="240" fill="url(#g-sun)"/>
        ${village(420, 2.2)}
        ${square(660)}
        ${at(200, 360, 3.6, pim())}
        ${at(700, 480, 2.4, piece('K'))}${at(900, 480, 2.4, piece('Q'))}
        ${at(1250, 560, 0.9, hugo())}`;
    case 'map':
      return `${night()}${village(520, 1.8)}<path d="M0 820 Q800 780 1600 820 V900 H0Z" fill="var(--dune-near)"/>`;
    default:
      return night();
  }
}

/** The goal at the end of the village map: the village bell tower. */
export function goal() {
  return `<g>
    <rect x="36" y="30" width="28" height="62" fill="#e8dcc0" stroke="#6b5a40" stroke-width="2"/>
    <polygon points="30,32 50,4 70,32" fill="#6d5a9a"/>
    <path d="M44 52 a6 6 0 0 1 12 0 v8 h-12z" fill="#f2c23a"/>
    <path d="M44 92 v-16 a6 6 0 0 1 12 0 v16z" fill="#6b4a2a"/>
  </g>`;
}

/** The card on the mode menu (200×150). */
export function card() {
  const sq = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) sq.push(`<rect x="${20 + i * 40}" y="${96 + j * 22}" width="40" height="22" fill="${(i + j) % 2 ? '#b0875a' : '#eed9a8'}"/>`);
  return `${sq.join('')}
    ${at(8, 6, 0.9, house('#6d5a9a'))}${at(112, 18, 0.8, house('#9a4747'))}
    ${at(46, 40, 0.7, piece('N'))}${at(92, 40, 0.7, piece('k'))}`;
}
