// Book 3's puzzle skins: the pieces that dress a hosted puzzle as a place
// in the mystery (see SKINS in engines.js). Their backdrops are
// BOOK.backdrops in art3.js. Pieces are 100×100 unless noted and keep the
// puzzle readable.

import { pim, ROAD_PATHS, treasure } from '../../art.js';
import { piece as villagePiece } from '../dorp/art.js';
import { picture } from './pictures.js';
import { spotChapel, SPOTS, SHINY, dullStone, BUTTONS } from './art3.js';
import { at } from './kit.js';

// ---------- "Wat is er anders?" (3.1) ----------

/** The two pictures of the chapel for spot.js. */
export const chapelSpot = {
  viewBox: () => [0, 0, 800, 600],
  picture: (day) => spotChapel(day),
  spots: () => SPOTS,
};

// ---------- the feather trail in the woods (3.4, the road game) ----------

/** The forest floor for the road board's cells (the `ground` types of art.js). */
function forestGround(type) {
  const moss = (c) => `<rect x="3" y="3" width="94" height="94" rx="10" fill="${c}"/>`;
  const tufts = '<path d="M18 80 q2 -8 5 -11 M24 82 q1 -8 4 -12 M74 26 q2 -8 5 -11" stroke="#8fd07a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>';
  switch (type) {
    case 'empty':
      return `${moss('#4f8a44')}${tufts}<rect x="9" y="9" width="82" height="82" rx="8" fill="none" stroke="#c9e8a0" stroke-width="3" stroke-dasharray="9 9" opacity=".8"/>`;
    case 'placed':
      return `${moss('#5a9a4c')}${tufts}`;
    case 'fixed':
      return `${moss('#6aa85a')}${tufts}${[12, 88].flatMap((x) => [12, 88].map((y) => `<circle cx="${x}" cy="${y}" r="4" fill="#a8a29a" stroke="#6a645a" stroke-width="1.5"/>`)).join('')}`;
    default:
      return moss('#3f7a3a');
  }
}

/** A forest trail instead of a sand road: brown earth with pebbles. */
function trail(kind, rot = 0) {
  const d = ROAD_PATHS[kind];
  if (!d) return '';
  const cap = kind === 'DeadEnd';
  const end = (r, c) => (cap ? `<circle cx="50" cy="50" r="${r}" fill="${c}"/>` : '');
  return `<g transform="rotate(${rot * 90} 50 50)">
    <path d="${d}" stroke="#5a3a1a" stroke-width="42" fill="none"/>${end(21, '#5a3a1a')}
    <path d="${d}" stroke="#b8875a" stroke-width="32" fill="none"/>${end(16, '#b8875a')}
    <path d="${d}" stroke="#d6aa76" stroke-width="4" stroke-dasharray="3 13" stroke-linecap="round" fill="none"/>
  </g>`;
}

/** Things in the woods instead of dunes, pines, heather and campfires. */
function forestThing(kind) {
  switch (kind) {
    case 'Dune': // a bush
      return `<ellipse cx="50" cy="80" rx="38" ry="10" fill="#000" opacity=".15"/>
        <circle cx="34" cy="62" r="22" fill="#3f8a44"/><circle cx="64" cy="60" r="24" fill="#4f9a4a"/><circle cx="50" cy="44" r="22" fill="#5fae52"/>
        <circle cx="40" cy="52" r="4" fill="#e0474c"/><circle cx="60" cy="46" r="4" fill="#e0474c"/><circle cx="66" cy="66" r="4" fill="#e0474c"/>`;
    case 'Pine': // a little leafy tree
      return `<rect x="44" y="60" width="12" height="30" rx="3" fill="#7a5230" stroke="#4a2f16" stroke-width="2"/>
        <circle cx="34" cy="48" r="20" fill="#3f8a44"/><circle cx="66" cy="46" r="20" fill="#4f9a4a"/><circle cx="50" cy="28" r="24" fill="#5fae52"/>`;
    case 'Heather': // toadstools
      return `<ellipse cx="50" cy="84" rx="34" ry="8" fill="#000" opacity=".15"/>
        <rect x="30" y="52" width="12" height="30" rx="5" fill="#fbf4e4" stroke="#8a7a5a" stroke-width="2"/><path d="M14 56 Q36 22 58 56Z" fill="#e0474c" stroke="#7a1f1a" stroke-width="2.5"/>
        <circle cx="28" cy="46" r="3.5" fill="#fff"/><circle cx="42" cy="40" r="3" fill="#fff"/>
        <rect x="62" y="62" width="10" height="22" rx="4" fill="#fbf4e4" stroke="#8a7a5a" stroke-width="2"/><path d="M50 66 Q67 40 84 66Z" fill="#e0474c" stroke="#7a1f1a" stroke-width="2.5"/>
        <circle cx="64" cy="58" r="3" fill="#fff"/>`;
    case 'Campfire': // a tree stump
      return `<ellipse cx="50" cy="82" rx="36" ry="9" fill="#000" opacity=".15"/>
        <path d="M22 50 V78 Q50 90 78 78 V50Z" fill="#8a5a2e" stroke="#4a2f16" stroke-width="3"/>
        <ellipse cx="50" cy="50" rx="28" ry="10" fill="#d9a066" stroke="#4a2f16" stroke-width="3"/>
        <ellipse cx="50" cy="50" rx="16" ry="5" fill="none" stroke="#a8743a" stroke-width="2"/>
        <path d="M34 60 v14 M60 62 v16" stroke="#5a3a1a" stroke-width="2.5"/>`;
    default:
      return '';
  }
}

/** The big tree at the end of the trail (the road game's finish); lit when Pim gets there. */
function treeFinish(lit) {
  return `<g class="tree-finish">
    ${lit ? '<circle cx="50" cy="40" r="50" fill="url(#g-lantern)"/>' : ''}
    <path d="M38 94 Q44 70 44 50 L56 50 Q56 70 62 94Z" fill="#7a5230" stroke="#4a2f16" stroke-width="3"/>
    <circle cx="28" cy="40" r="22" fill="#3f8a44"/><circle cx="72" cy="38" r="22" fill="#3f8a44"/>
    <circle cx="50" cy="20" r="26" fill="#4f9a4a"/><circle cx="50" cy="44" r="18" fill="#5fae52"/>
    <path d="M58 30 q8 6 18 2 q-4 8 -12 8 q-6 0 -6 -10z" fill="#9a6a32" stroke="#4a2f16" stroke-width="2"/>
    ${lit ? '<path d="M66 22 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fffbe0"/>' : ''}
  </g>`;
}

/** A black-and-white feather as the road game's treasure (the order badge shows its number). */
function featherTreasure() {
  return `<g transform="rotate(-20 50 50)">${picture('veerZwartWit')}</g>`;
}

export const woodsRoad = {
  ground: forestGround,
  road: trail,
  scenery: forestThing,
  finish: treeFinish,
  pim: () => pim({ glow: false }),
  treasure: featherTreasure,
  // No Witte Dame floating by: it is daytime in the woods.
  companion: null,
};

// ---------- the nest (3.5, lantern light) ----------

const SHINY_ORDER = ['lepel', 'munt', 'ring', 'knoop'];

/**
 * The magpie's shiny things instead of moonstones: dull in the dark, bright
 * when the light reaches them. The last one along the beam is the klokje.
 */
function nestThing(lit, k, n) {
  const last = k === n - 1;
  const inner = last ? at(2, 0, 0.96, treasure(2)) : at(8, 8, 0.84, SHINY[SHINY_ORDER[k % SHINY_ORDER.length]]());
  return `<g class="nest-thing ${lit ? 'on' : ''}">
    ${lit ? '<circle cx="50" cy="50" r="46" fill="url(#g-lantern)"/>' : ''}
    <g${lit ? '' : ' opacity=".6"'}>${inner}</g>
    ${lit ? '<path d="M82 14 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" fill="#fffbe0"/>' : '<rect x="6" y="6" width="88" height="88" rx="14" fill="#10203a" opacity=".35"/>'}
  </g>`;
}

/** Walls in the nest: a clump of twigs; the first one is Opa Bram's black stone (dull, never lit). */
function nestWall(k) {
  if (k === 0) return `<g class="nest-stone">${at(4, 6, 0.92, dullStone())}</g>`;
  return `<g class="twigs">
    <ellipse cx="50" cy="56" rx="40" ry="30" fill="#5a3a1a"/>
    <g stroke="#a8743a" stroke-width="6" stroke-linecap="round"><path d="M14 40 L86 70 M16 70 L84 36 M30 24 L70 86 M50 18 L46 88"/></g>
    <g stroke="#3f2612" stroke-width="3" stroke-linecap="round"><path d="M20 56 L80 50 M36 30 L62 80"/></g>
    <ellipse cx="72" cy="30" rx="12" ry="7" fill="#4f9a4a" transform="rotate(-30 72 30)"/>
  </g>`;
}

/** The nest's floor of woven twigs instead of the night squares; empty squares (where a mirror can go) are lighter. */
function nestGround(empty) {
  return `<rect x="3" y="3" width="94" height="94" rx="10" fill="${empty ? '#7a5430' : '#5a3c20'}" stroke="#4a2f16" stroke-width="3"/>
    <path d="M10 30 Q50 22 90 32 M10 62 Q50 54 90 64 M28 10 Q22 50 30 90 M70 10 Q64 50 72 90" stroke="${empty ? '#8e6638' : '#6a4826'}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}

export const nestLight = { stone: nestThing, wall: nestWall, ground: nestGround };

// ---------- the koster's chess board (3.3) ----------

/**
 * A wooden chess set on the koster's table: Hugo plays the light pieces,
 * the koster the dark ones (no horns, no goat: an ordinary set).
 */
function woodPiece(letter) {
  const white = letter === letter.toUpperCase();
  const art = villagePiece(letter.toUpperCase());
  return white
    ? art.replace(/#f7efdc/g, '#fff4dc').replace(/#5a3c22/g, '#4a2c12').replace(/stroke-width="3.5"/, 'stroke-width="4.5"')
    : art.replace(/#f7efdc/g, '#4a2810').replace(/#5a3c22/g, '#140a04').replace(/#c9a466/g, '#a8743a');
}

export const kitchenChess = {
  square(dark) {
    return `<rect width="100" height="100" fill="${dark ? '#b07a44' : '#f4e0b8'}"/>
      <path d="M8 ${dark ? 30 : 64} q30 -6 50 2 t36 -2" stroke="${dark ? '#946232' : '#e2c896'}" stroke-width="3" fill="none"/>`;
  },
  tree: () => '',
  piece: woodPiece,
};

// ---------- Hugo's buttons (3.6, pairs) ----------

/** Hugo's coat buttons (drawn in art3.js, so the nest scenes show the same ones). */
export const coatButtons = { pictures: () => BUTTONS };
