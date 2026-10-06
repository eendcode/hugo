// Book 4's puzzle skins: the pieces that dress a hosted puzzle as the night
// sky of the final (see SKINS in engines.js). Their backdrops are
// BOOK.backdrops in art4.js. Pieces are 100×100 unless noted and keep the
// puzzle readable. A skin that shows the Nachtbok's eyes is a function of
// {scare}: in "zacht" they don't glow.

import { ROAD_PATHS, dame } from '../../art.js';
import { darkGoat } from './art.js';
import { pimFlying, towerPiece, pimKing, stormKing } from './art4.js';
import { at } from './kit.js';

const PUFF = '<ellipse cx="34" cy="60" rx="26" ry="16"/><circle cx="48" cy="46" r="20"/><circle cx="66" cy="54" r="18"/><ellipse cx="70" cy="64" rx="22" ry="12"/>';

// ---------- the cloud path through the storm (4.1, the road game) ----------

/** The "Kijk" button's icon: a lightning bolt (a 24×24 line icon like art.js's). */
function boltIcon() {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13 2 L5 13 H11 L9 22 L19 9 H13Z"/></svg>`;
}

/** The night sky for the board's cells: dark blue, the empty ones with a dashed edge (a cloud can go there). */
function skyGround(type) {
  const sq = (c) => `<rect x="3" y="3" width="94" height="94" rx="12" fill="${c}"/>`;
  const glints = '<circle cx="20" cy="22" r="2" fill="#fff8d8" opacity=".6"/><circle cx="78" cy="70" r="1.6" fill="#fff8d8" opacity=".5"/>';
  switch (type) {
    case 'empty':
      return `${sq('#1d2456')}${glints}<rect x="9" y="9" width="82" height="82" rx="10" fill="none" stroke="#9fb4f0" stroke-width="3" stroke-dasharray="9 9" opacity=".75"/>`;
    case 'placed':
      return `${sq('#232b62')}${glints}`;
    case 'fixed':
      return `${sq('#2c3672')}${glints}${[12, 88].flatMap((x) => [12, 88].map((y) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#ffe27a" opacity=".85"/>`)).join('')}`;
    default:
      return sq('#161b44');
  }
}

/** A path of soft white cloud instead of a sand road: puffy edges, no sand; kept inside its cell. */
function cloudRoad(kind, rot = 0) {
  const d = ROAD_PATHS[kind];
  if (!d) return '';
  const cap = kind === 'DeadEnd';
  const end = (r, c) => (cap ? `<circle cx="50" cy="50" r="${r}" fill="${c}"/>` : '');
  // The round puffs would spill into the next cell: a nested svg clips them at the edge.
  return `<svg class="cloud-road" x="0" y="0" width="100" height="100" viewBox="0 0 100 100" overflow="hidden"><g transform="rotate(${rot * 90} 50 50)">
    <path d="${d}" stroke="#8fa2d8" stroke-width="44" fill="none"/>${end(22, '#8fa2d8')}
    <path d="${d}" stroke="#dfe7fb" stroke-width="40" stroke-dasharray="0 17" stroke-linecap="round" fill="none"/>
    <path d="${d}" stroke="#eef3ff" stroke-width="34" fill="none"/>${end(18, '#eef3ff')}
    <path d="${d}" stroke="#ffffff" stroke-width="14" stroke-dasharray="10 14" stroke-linecap="round" fill="none" opacity=".9"/>
  </g></svg>`;
}

/** Things in the sky instead of dunes, pines, heather and campfires: they block the way. */
function skyThing(kind) {
  switch (kind) {
    case 'Dune': // a dark rain cloud
      return `<g fill="#3a3560" transform="translate(0 -6)">${PUFF}</g><g fill="#2b2748">${PUFF}</g>
        <path d="M34 80 l-5 12 M50 82 l-5 12 M66 80 l-5 12" stroke="#8fb0e8" stroke-width="4" stroke-linecap="round"/>`;
    case 'Pine': // a whirl of wind
      return `<path d="M20 34 Q50 14 80 34 Q50 46 28 42 M24 56 Q56 40 84 58 Q54 68 30 62 M32 78 Q56 66 74 80" stroke="#cfe0ff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85"/>`;
    case 'Heather': // a cluster of stars
      return [[30, 34, 13], [66, 30, 10], [50, 64, 15], [78, 70, 8], [22, 72, 7]]
        .map(([x, y, r]) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="#ffe27a" stroke="#b8862a" stroke-width="2"/>`)
        .join('');
    case 'Campfire': // the moon
      return `<circle cx="50" cy="50" r="40" fill="url(#g-lantern)" opacity=".5"/><path d="M58 14 A36 36 0 1 0 58 86 A46 46 0 0 1 58 14Z" fill="#fbe7a0" stroke="#b8862a" stroke-width="3"/>`;
    default:
      return '';
  }
}

/** The Nachtbok's storm cloud at the end of the path (the road game's finish); lit when Pim gets there. */
function stormFinish(lit, { scare = 'spannend' } = {}) {
  const glow = scare === 'zacht' ? '' : '<circle cx="50" cy="50" r="46" fill="#b36bff" opacity=".28" filter="url(#f-soft)"/>';
  return `<g class="storm-finish">
    ${lit ? '<circle cx="50" cy="50" r="48" fill="url(#g-lantern)"/>' : glow}
    <path d="M30 34 C24 14 46 6 52 22 M70 34 C76 14 54 6 48 22" stroke="#6e5f94" stroke-width="7" fill="none" stroke-linecap="round"/>
    <g fill="#4d4778" transform="translate(0 -6)">${PUFF}</g><g fill="#2b2748">${PUFF}</g>
    <circle cx="42" cy="56" r="5" fill="${lit || scare === 'zacht' ? '#fff' : '#e2c4ff'}"/><circle cx="60" cy="54" r="5" fill="${lit || scare === 'zacht' ? '#fff' : '#e2c4ff'}"/>
    ${scare === 'zacht' && !lit ? '<circle cx="41" cy="57" r="2.4" fill="#1b1330"/><circle cx="59" cy="55" r="2.4" fill="#1b1330"/>' : ''}
    ${lit ? '<path d="M44 70 q8 6 16 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' : ''}
  </g>`;
}

/** A flash of lightning in a little cloud: walks the patrol loop. */
function lightning() {
  return `<g class="sky-lightning">
    <circle cx="50" cy="54" r="40" fill="#fff3a0" opacity=".25" class="flash"/>
    <g transform="translate(6 -10) scale(.9)"><g fill="#4d4778" transform="translate(0 -6)">${PUFF}</g><g fill="#2b2748">${PUFF}</g></g>
    <path d="M52 52 L40 74 H50 L42 96 L66 66 H54 L62 52Z" fill="#fff3a0" stroke="#c9a13a" stroke-width="3" stroke-linejoin="round"/>
  </g>`;
}

export const skyRoad = ({ scare } = {}) => ({
  ground: skyGround,
  road: cloudRoad,
  scenery: skyThing,
  finish: (lit) => stormFinish(lit, { scare }),
  pim: pimFlying,
  patrol: lightning,
  lookIcon: boltIcon,
  companion: null,
});

// ---------- the mist (4.2, lantern light) ----------

/** The night in the mist: squares where a mirror can go are a little lighter. */
function mistGround(empty) {
  return `<rect x="3" y="3" width="94" height="94" rx="12" fill="${empty ? '#2b3466' : '#1f2550'}"/>
    <path d="M10 70 q20 -10 40 0 t40 0" stroke="#8a96c8" stroke-width="4" fill="none" opacity="${empty ? 0.35 : 0.2}" stroke-linecap="round"/>`;
}

/** Thick mist instead of a stone wall: the beam can't get through. */
function mistWall() {
  return `<g class="mist-wall">
    <g fill="#9aa4c8"><ellipse cx="50" cy="60" rx="44" ry="26"/><circle cx="34" cy="44" r="22"/><circle cx="60" cy="38" r="26"/></g>
    <g fill="#c8d0e8"><ellipse cx="50" cy="56" rx="40" ry="22"/><circle cx="34" cy="42" r="18"/><circle cx="60" cy="36" r="22"/></g>
    <path d="M24 60 q14 -8 28 0 t26 0" stroke="#eef2ff" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>`;
}

/**
 * A weak spot in the mist around the Nachtbok, instead of a moonstone: a
 * dull purple knot of mist; when the light reaches it, it bursts open into
 * light.
 */
function mistSpot(lit) {
  if (lit) {
    return `<g class="mist-spot open">
      <circle cx="50" cy="50" r="48" fill="url(#g-lantern)"/>
      ${Array.from({ length: 8 }, (_, i) => `<path d="M50 50 L${50 + Math.cos((i * Math.PI) / 4) * 46} ${50 + Math.sin((i * Math.PI) / 4) * 46}" stroke="#fff3b0" stroke-width="6" stroke-linecap="round"/>`).join('')}
      <path d="M50 16 L59 41 L84 50 L59 59 L50 84 L41 59 L16 50 L41 41Z" fill="#ffe27a" stroke="#d08a1a" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="50" cy="50" r="9" fill="#fffbe0"/>
    </g>`;
  }
  return `<g class="mist-spot">
    <circle cx="50" cy="50" r="36" fill="#7a5aa8" opacity=".45"/>
    <path d="M50 22 C72 22 78 46 62 54 C48 60 40 44 50 40 C58 38 60 48 54 50" stroke="#c9b0f0" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M24 60 C24 78 46 84 58 76" stroke="#a68ad8" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="6" fill="#e8dcff"/>
  </g>`;
}

/** The Witte Dame with her lantern instead of Pim's lantern on a post; a soft cone shows where it shines. */
function dameLantern(facing = 1) {
  return `<g class="dame-lantern">
    <g transform="rotate(${facing * 90} 50 50)"><path d="M50 50 L34 0 H66Z" fill="#cfe9ff" opacity=".4"/></g>
    ${at(4, 2, 0.92, dame({ scare: 'zacht', mood: 'happy' }))}
  </g>`;
}

export const mistLight = { stone: mistSpot, wall: mistWall, ground: mistGround, lantern: dameLantern };

// ---------- the ribbons (4.3, candles) ----------

/**
 * The goats tied to the Nachtbok, instead of candles. Behind them, faint
 * purple ribbons run from every knot to the knots beside it: untie one and
 * its neighbours flip too ("elk lint zit vast aan het lint ernaast").
 */
export const ribbonKnots = {
  boardArt(n) {
    const S = n * 100;
    const links = [];
    for (let i = 0; i < n * n; i++) {
      const [x, y] = [i % n, Math.floor(i / n)];
      if (x + 1 < n) links.push(`M${x * 100 + 50} ${y * 100 + 50} q50 ${(i % 2 ? 1 : -1) * 16} 100 0`);
      if (y + 1 < n) links.push(`M${x * 100 + 50} ${y * 100 + 50} q${(i % 2 ? 1 : -1) * 16} 50 0 100`);
    }
    return `<rect x="-10" y="-10" width="${S + 20}" height="${S + 20}" rx="18" fill="#1b1533" stroke="#5a4a8a" stroke-width="5"/>
      <path d="${links.join(' ')}" stroke="#b36bff" stroke-width="14" fill="none" opacity=".25" filter="url(#f-soft)"/>
      <path d="${links.join(' ')}" stroke="#a87ae8" stroke-width="5" fill="none" stroke-dasharray="10 8" opacity=".7"/>`;
  },
  /** One goat: tied with a glowing purple knot, or free (`lit`). */
  cellArt(free) {
    if (free) {
      return `<g class="ribbon-goat free">
        <circle cx="50" cy="50" r="44" fill="url(#g-lantern)" opacity=".7"/>
        <g style="filter: brightness(1.7) saturate(.7)">${at(2, 2, 0.9, darkGoat())}</g>
        <path d="M70 26 q6 -4 10 0 M76 18 l3 -6" stroke="#5fae52" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M14 86 q10 -6 18 2 q8 -8 18 -2" stroke="#c58cff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>
        <path d="M84 30 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="#fffbe0"/>
      </g>`;
    }
    return `<g class="ribbon-goat">
      <circle cx="50" cy="56" r="40" fill="#b36bff" opacity=".22" filter="url(#f-soft)"/>
      <g opacity=".85">${at(2, 2, 0.9, darkGoat({ eyes: true }))}</g>
      <path d="M50 58 C38 46 22 48 24 58 C26 68 40 64 50 58Z M50 58 C62 46 78 48 76 58 C74 68 60 64 50 58Z" fill="#c58cff" stroke="#6a3aa8" stroke-width="3" stroke-linejoin="round"/>
      <path d="M48 60 L40 84 M52 60 L62 84" stroke="#c58cff" stroke-width="6" stroke-linecap="round"/>
      <rect x="44" y="52" width="12" height="12" rx="4" fill="#e2c4ff" stroke="#6a3aa8" stroke-width="3"/>
    </g>`;
  },
};

// ---------- chess in the clouds (4.4) ----------

/**
 * The pieces: Pim on Barend is the king, the two rooks are a village tower
 * and Hugo (a tower in his hat, the second rook on the board), the
 * Nachtbok is the dark king. `k` is the piece's place among the same
 * pieces at the start (in reading order).
 */
function skyPiece(letter, k = 0, { scare = 'spannend' } = {}) {
  switch (letter) {
    case 'K':
      return pimKing();
    case 'R':
      return towerPiece({ hugo: k === 1 });
    case 'k':
      return stormKing({ scare });
    default:
      return '';
  }
}

export const skyChess = ({ scare } = {}) => ({
  square(dark) {
    return `<rect width="100" height="100" fill="${dark ? '#9fb0dc' : '#eef3ff'}"/>
      <path d="M10 ${dark ? 74 : 30} q14 -10 28 0 q14 -10 28 0" stroke="${dark ? '#b8c6ea' : '#dbe3f8'}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  },
  tree: () => '',
  piece: (letter, k) => skyPiece(letter, k, { scare }),
});
