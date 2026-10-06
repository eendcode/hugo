// Book 1's puzzle skins: the pieces that dress a hosted puzzle's board as
// the chapter's scene (see SKINS in engines.js). Their backdrops are
// BOOK.backdrops in art.js. Pieces are 100×100 unless noted and keep the
// puzzle readable.

import { cart } from '../wegvrij/art.js';
import { mud } from './art.js';

/** The barn's wooden floor, for the cart yard: size×size cells of 100. */
function barnFloor(size) {
  const S = size * 100;
  const boards = Array.from({ length: size * 2 }, (_, k) => `<rect x="0" y="${k * 50}" width="${S}" height="50" fill="${k % 2 ? '#8a6238' : '#94693d'}"/>`).join('');
  const seams = Array.from({ length: size * 2 }, (_, k) => `<path d="M${((k * 137) % 5) * 100 + 60} ${k * 50} v50" stroke="#5a3e22" stroke-width="3"/>`).join('');
  const straw = Array.from({ length: size * 3 }, (_, k) => `<path d="M${(k * 173) % S} ${(k * 97) % S} l${24 + (k % 3) * 8} ${-6 + (k % 4) * 4}" stroke="#e8c86a" stroke-width="4" stroke-linecap="round" opacity=".7"/>`).join('');
  const cells = [];
  for (let i = 0; i < size * size; i++) cells.push(`<rect x="${(i % size) * 100 + 4}" y="${Math.floor(i / size) * 100 + 4}" width="92" height="92" rx="12" fill="none" stroke="#5a3e22" stroke-width="2" opacity=".55"/>`);
  return `${boards}${seams}${straw}${cells.join('')}`;
}

/** Carts in the barn: Barend's is boer Teun's red cart with the planks on it. */
function barnCart(len, k, plankCart) {
  if (!plankCart) return cart(len, k);
  const W = len * 100;
  const planks = [24, 42, 60].map((y, i) => `<rect x="18" y="${y}" width="${W - 36}" height="16" rx="3" fill="${['#e0aa62', '#c98848', '#eabf7c'][i]}" stroke="#5a3418" stroke-width="2.5"/><circle cx="30" cy="${y + 8}" r="3" fill="#3a2a1a"/><circle cx="${W - 30}" cy="${y + 8}" r="3" fill="#3a2a1a"/>`).join('');
  return `<g class="cart-art">
    <rect x="10" y="4" width="16" height="10" rx="3" fill="#2a1d1a"/><rect x="${W - 26}" y="4" width="16" height="10" rx="3" fill="#2a1d1a"/>
    <rect x="10" y="86" width="16" height="10" rx="3" fill="#2a1d1a"/><rect x="${W - 26}" y="86" width="16" height="10" rx="3" fill="#2a1d1a"/>
    <rect x="6" y="12" width="${W - 12}" height="76" rx="14" fill="#d8433a" stroke="#2a1d1a" stroke-width="4"/>
    ${planks}
  </g>`;
}

/** A beacon on a sandy mound, for the lantern puzzle's moonstones (100×100). */
function boardBeacon(lit) {
  return `<g class="board-beacon ${lit ? 'on' : ''}">
    ${lit ? '<circle cx="50" cy="34" r="44" fill="url(#g-fire)"/>' : ''}
    <ellipse cx="50" cy="86" rx="38" ry="11" fill="#d9bf86"/>
    <rect x="44" y="44" width="12" height="44" fill="#8a5a2e" stroke="#3a2210" stroke-width="2"/>
    <path d="M24 30 h52 l-10 18 h-32z" fill="${lit ? '#3a2a1a' : '#9a8a72'}" stroke="${lit ? '#1b1330' : '#f0e6cc'}" stroke-width="4"/>
    ${lit ? '<g class="flame"><path d="M50 0 C62 14 64 24 58 32 H42 C36 24 38 14 50 0Z" fill="#ff8a2f"/><path d="M50 12 C55 20 56 26 54 32 H46 C44 26 45 20 50 12Z" fill="#ffd35a"/></g>' : ''}
  </g>`;
}

/** The chapel's front wall behind the candle puzzle's windows (board of size×size cells). */
function chapelWall(size) {
  const S = size * 100;
  const lines = [];
  for (let y = 40; y < S; y += 60) lines.push(`M-10 ${y} H${S + 10}`);
  return `<rect x="-10" y="-10" width="${S + 20}" height="${S + 20}" rx="18" fill="#efe4cc"/>
    <path d="${lines.join('')}" stroke="#ddd0b2" stroke-width="3"/>
    <rect x="-10" y="-10" width="${S + 20}" height="${S + 20}" rx="18" fill="none" stroke="#8c7f66" stroke-width="6"/>`;
}

/** One chapel window: dark, or lit from inside (100×100). */
function chapelWindow(lit) {
  return `<g class="chapel-window">
    ${lit ? '<circle cx="50" cy="52" r="46" fill="url(#g-lantern)"/>' : ''}
    <path d="M24 88 V40 a26 26 0 0 1 52 0 V88z" fill="${lit ? '#ffd35a' : '#2b2f55'}" stroke="#8c7f66" stroke-width="6"/>
    <path d="M50 16 V88 M24 54 H76" stroke="${lit ? '#c9a13a' : '#6b6f8f'}" stroke-width="4"/>
    ${lit ? '' : '<path d="M32 44 q4 -12 12 -16" stroke="#4a5080" stroke-width="3" fill="none"/>'}
  </g>`;
}

// ---------- the skins ----------

/** The cart yard in boer Teun's barn (1.2). */
export const barnYard = { ground: barnFloor, cart: barnCart };

/** Barend's program ends in the mud (1.4). */
export const mudGoal = { stable: mud };

/** Lantern light with beacons for moonstones (1.5). */
export const duneBeacons = { stone: boardBeacon };

/** The candles as the chapel's windows (1.6). */
export const chapelCandles = { boardArt: chapelWall, cellArt: chapelWindow };
