// Book 2's puzzle skins: the pieces that dress a hosted puzzle as a room of
// Hugo's house (see SKINS in engines.js). Their backdrops are
// BOOK.backdrops in art2.js. Pieces are 100×100 unless noted and keep the
// puzzle readable.

import { pim, ROAD_PATHS } from '../../art.js';
import { apple } from '../programma/art.js';
import { candle } from '../spookhuis/art.js';
import { pimAlone } from './art.js';
import { hugoHouse, goatFace, raft, sneakingPim, sleeper, drawing } from './art2.js';
import { at } from './kit.js';

// ---------- the gate's lock (chapter 2.1) ----------

/** The lock's art (see lock.js): Hugo's house to count in, and what each wheel counts. */
export const gateLock = {
  viewBox: () => [10, -60, 780, 870],
  picture: () => hugoHouse(),
  wheelIcon(k) {
    return [
      `<circle cx="50" cy="50" r="40" fill="#2a2140" stroke="#c9a13a" stroke-width="7"/><g transform="translate(50 54) scale(1.25)">${goatFace({ fur: '#e9e4d8' })}</g>`,
      '<path d="M24 92 V42 a26 26 0 0 1 52 0 V92z" fill="#252a4f" stroke="#120d22" stroke-width="7"/><path d="M50 18 V92 M24 60 H76" stroke="#120d22" stroke-width="5"/>',
      '<polygon points="50,8 61,36 92,38 68,57 76,88 50,71 24,88 32,57 8,38 39,36" fill="#ffe27a" stroke="#c9a13a" stroke-width="5" stroke-linejoin="round"/>',
    ][k];
  },
};

// ---------- the corridor (2.2, the road game) ----------

/** The "Kijk" button's icon: the sleepwalker's nightcap, Zz (a 24×24 line icon like art.js's). */
function sleeperIcon() {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="16" r="5"/><path d="M4.5 14 Q6 7 13 7.5 Q18.5 9 20 15"/><circle cx="20" cy="17" r="1.6"/><path d="M15 2.5 h4 l-4 3.5 h4"/></svg>`;
}

function floorGround(type) {
  const boards = `<g stroke="#4e321c" stroke-width="2.5">${[28, 52, 76].map((y) => `<path d="M6 ${y} H94"/>`).join('')}<path d="M40 6 V28 M70 28 V52 M30 52 V76 M64 76 V94"/></g>`;
  switch (type) {
    case 'empty':
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="#5e3f26"/>${boards}
        <rect x="9" y="9" width="82" height="82" rx="8" fill="none" stroke="#c9a466" stroke-width="3" stroke-dasharray="9 9" opacity=".8"/>`;
    case 'placed':
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="#6b4a2e"/>${boards}`;
    case 'fixed':
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="#7a5636" stroke="#a07a4a" stroke-width="3"/>${boards}
        ${[12, 88].flatMap((x) => [12, 88].map((y) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#e0c08a"/>`)).join('')}`;
    default:
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="#4e3420"/>${boards}`;
  }
}

/** The carpet runner (loper) instead of a road: red with a gold border. */
function carpet(kind, rot = 0) {
  const d = ROAD_PATHS[kind];
  if (!d) return '';
  const cap = kind === 'DeadEnd';
  const end = (r, c) => (cap ? `<circle cx="50" cy="50" r="${r}" fill="${c}"/>` : '');
  return `<g transform="rotate(${rot * 90} 50 50)">
    <path d="${d}" stroke="#4a0f18" stroke-width="44" fill="none"/>${end(22, '#4a0f18')}
    <path d="${d}" stroke="#e8b84a" stroke-width="38" fill="none"/>${end(19, '#e8b84a')}
    <path d="${d}" stroke="#a8262f" stroke-width="30" fill="none"/>${end(15, '#a8262f')}
    <path d="${d}" stroke="#f2d27a" stroke-width="5" stroke-dasharray="4 10" fill="none"/>
  </g>`;
}

/** Things standing in the corridor instead of dunes, pines, heather and campfires. */
function corridorThing(kind) {
  switch (kind) {
    case 'Dune': // a chest
      return `<rect x="16" y="40" width="68" height="44" rx="6" fill="#8a5a2e" stroke="#3a2210" stroke-width="4"/>
        <path d="M16 52 Q50 26 84 52" fill="#9a6a3a" stroke="#3a2210" stroke-width="4"/>
        <path d="M30 40 V84 M70 40 V84" stroke="#3a2210" stroke-width="4"/><rect x="44" y="52" width="12" height="14" rx="2" fill="#c9a13a"/>`;
    case 'Pine': // a grandfather clock
      return `<rect x="30" y="8" width="40" height="84" rx="6" fill="#6b4024" stroke="#2a1a0e" stroke-width="4"/>
        <circle cx="50" cy="30" r="14" fill="#fffaf0" stroke="#2a1a0e" stroke-width="3"/><path d="M50 30 V20 M50 30 h7" stroke="#2a1a0e" stroke-width="2.5"/>
        <path d="M50 50 V70" stroke="#c9a13a" stroke-width="3"/><circle cx="50" cy="74" r="6" fill="#c9a13a"/>`;
    case 'Heather': // a plant in a pot
      return `<path d="M34 64 h32 l-4 26 h-24z" fill="#b8603a" stroke="#5a2a14" stroke-width="3"/>
        ${[[50, 30], [34, 40], [66, 40], [42, 22], [60, 24]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="12" ry="7" fill="#3f8a55" stroke="#1f4a2a" stroke-width="2" transform="rotate(${x - 50} ${x} ${y})"/>`).join('')}
        <path d="M50 64 V30" stroke="#1f4a2a" stroke-width="3"/>`;
    case 'Campfire': // a candle on a little table
      return `<rect x="26" y="66" width="48" height="10" rx="3" fill="#6b4024"/><path d="M34 76 v16 M66 76 v16" stroke="#4a2c16" stroke-width="5"/>${at(25, 8, 0.5, candle(true))}`;
    default:
      return '';
  }
}

/** The door at the end of the corridor (the road game's finish). */
function corridorDoor(lit) {
  return `<g class="corridor-door">
    ${lit ? '<circle cx="50" cy="50" r="44" fill="url(#g-lantern)"/>' : ''}
    <path d="M22 92 V30 a28 24 0 0 1 56 0 V92z" fill="#5a3a24" stroke="#1b1330" stroke-width="4"/>
    <path d="M36 92 V24 M50 92 V18 M64 92 V24" stroke="#3e2614" stroke-width="3"/>
    <circle cx="68" cy="62" r="4" fill="#c9a13a"/>
    <rect x="20" y="88" width="60" height="6" rx="2" fill="${lit ? '#ffd35a' : '#2a1a0e'}"/>
  </g>`;
}

/** Pim sneaks alone along the runner; the sleepwalker walks the patrol loop. */
export const corridorRoad = {
  ground: floorGround,
  road: carpet,
  scenery: corridorThing,
  finish: corridorDoor,
  pim: sneakingPim,
  patrol: () => sleeper(),
  lookIcon: sleeperIcon,
};

// ---------- the cellar (2.3, the pipes) ----------

/**
 * The cellar dressing for the pipes: a stone wall and a wall spout as the
 * pump; below the board a spout pours into the water once every pipe is wet,
 * and the raft with the key floats over to Pim (CSS on `.room.won`).
 */
export const cellarPipes = {
  box(n) {
    const size = n * 100;
    return [-120, -14, size + 140, size + 200];
  },
  boardArt(n, source) {
    const size = n * 100;
    const sy = Math.floor(source / n) * 100;
    const stones = [];
    for (let y = -10; y < size + 10; y += 50) {
      for (let x = ((y + 10) / 50) % 2 ? -60 : -10; x < size + 10; x += 100) stones.push(`<rect x="${x + 2}" y="${y + 2}" width="96" height="46" rx="8"/>`);
    }
    const mid = size / 2;
    return `<defs><clipPath id="ce-wall"><rect x="-10" y="-10" width="${size + 20}" height="${size + 20}" rx="14"/></clipPath></defs>
      <rect x="-10" y="-10" width="${size + 20}" height="${size + 20}" rx="14" fill="#2c2838"/>
      <g fill="#363146" clip-path="url(#ce-wall)">${stones.join('')}</g>
      <g class="pump" transform="translate(-110 ${sy})">
        <rect x="6" y="14" width="70" height="72" rx="12" fill="#5a5270" stroke="#1b1330" stroke-width="4"/>
        <circle cx="41" cy="50" r="18" fill="#9fd8ff" stroke="#1b1330" stroke-width="3"/>
        <path d="M76 50H110" stroke="#1b1330" stroke-width="30"/><path d="M76 50H110" stroke="#3aa0e0" stroke-width="18"/>
      </g>
      <g class="ce-pool" transform="translate(0 ${size + 24})">
        <rect class="ce-water" x="-116" y="0" width="${size + 132}" height="150" rx="20"/>
        <path class="ce-waves" d="M-100 40 q30 -10 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#9fd8ff" stroke-width="5" fill="none"/>
        <rect class="ce-stream" x="${mid - 14}" y="-12" width="28" height="70" rx="12"/>
        <ellipse class="ce-splash" cx="${mid}" cy="58" rx="40" ry="10"/>
        <g transform="translate(-110 -20)"><rect x="0" y="80" width="90" height="90" rx="8" fill="#4a4258" stroke="#1b1330" stroke-width="5"/>${at(4, -40, 1.25, pimAlone())}</g>
        <g class="ce-raft-go" style="--go: ${130 - size}px"><g transform="translate(${size - 150} 34) scale(.8)">${raft()}</g></g>
      </g>
      <g class="ce-spout"><rect x="${mid - 26}" y="${size + 6}" width="52" height="22" rx="6" fill="#5a5270" stroke="#1b1330" stroke-width="4"/>
        <path d="M${mid} ${size + 10} V${size + 30}" stroke="#1b1330" stroke-width="26"/><path d="M${mid} ${size + 10} V${size + 30}" stroke="#3aa0e0" stroke-width="14"/></g>`;
  },
};

// ---------- the library (2.4, the sliding picture) ----------

/** The torn drawing of Hugo's house (drawn in art2.js, where the library scenes show it too). */
export const libraryDrawing = { picture: drawing };

// ---------- Barend's room (2.5, the program) ----------

/** Barend's tower room for the program: a wooden floor, chests, and the door's bolt as his goal. */
export const towerArt = {
  grass: () => `<rect x="2" y="2" width="96" height="96" rx="8" fill="#6b4a2e"/>
    <g stroke="#57391f" stroke-width="3">${[26, 50, 74].map((y) => `<path d="M4 ${y} H96"/>`).join('')}</g>
    <path d="M20 70 l18 -4 M62 30 l16 3" stroke="#e8c86a" stroke-width="4" stroke-linecap="round" opacity=".7"/>`,
  tree: () => corridorThing('Dune'),
  apple,
  stable: () => `<g class="bolt-goal">
    <circle cx="50" cy="50" r="44" fill="url(#g-lantern)" opacity=".6"/>
    <rect x="4" y="4" width="34" height="92" rx="4" fill="#5a3a24" stroke="#1b1330" stroke-width="4"/>
    <path d="M14 4 V96 M26 4 V96" stroke="#3e2614" stroke-width="3"/>
    <rect x="30" y="40" width="48" height="16" rx="6" fill="#8d909c" stroke="#3d3f4a" stroke-width="4"/>
    <rect x="70" y="30" width="16" height="36" rx="4" fill="#5c6070" stroke="#3d3f4a" stroke-width="4"/>
    <circle cx="44" cy="48" r="7" fill="#c9a13a" stroke="#6b4a1a" stroke-width="3"/>
  </g>`,
};

// ---------- the garden (2.6, chess) ----------

/** Hugo's garden for the chess board: water in the ditch, grass on the banks, stones to jump on. */
export const gardenChess = {
  square(dark, start) {
    const water = start === '#' || start === 'p';
    if (water) {
      return `<rect class="gc-water" width="100" height="100" fill="${dark ? '#1d3a5a' : '#24466a'}"/>
        <path d="M14 40 q12 -8 24 0 t24 0 M40 74 q12 -8 24 0 t24 0" stroke="#6fa8d8" stroke-width="3" fill="none" opacity=".5"/>`;
    }
    return `<rect width="100" height="100" fill="${dark ? '#2b5a3a' : '#33693f'}"/>
      <path d="M22 76 q3 -10 6 -14 M28 78 q1 -10 5 -14 M68 30 q3 -10 6 -14" stroke="#4f8a5a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  },
  tree: () => '', // the water itself is the blocker
  piece: (ch) => (ch === 'N' ? at(-4, -6, 1.08, pim({ glow: false })) : stone()),
  taken: () => stone({ hoof: true }),
};

/** A flat stepping stone in the water; `hoof` marks one Barend has used. 100×100. */
function stone({ hoof = false } = {}) {
  return `<g class="step-stone">
    <ellipse cx="50" cy="60" rx="40" ry="24" fill="#6fa8d8" opacity=".35"/>
    <ellipse cx="50" cy="56" rx="34" ry="20" fill="#9a9aaa" stroke="#3a3a4a" stroke-width="4"/>
    <ellipse cx="44" cy="50" rx="16" ry="7" fill="#c4c4d2"/>
    ${hoof ? '<g fill="#4a3a2a" opacity=".8"><ellipse cx="44" cy="58" rx="3.5" ry="6"/><ellipse cx="53" cy="58" rx="3.5" ry="6"/></g>' : ''}
  </g>`;
}
