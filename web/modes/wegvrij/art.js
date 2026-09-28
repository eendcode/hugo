// Art for Maak de weg vrij: the cobbled yard, carts seen from above,
// Barend's goat cart, and the story scenes.

import { pim, hugo } from '../../art.js';
import { barend } from '../programma/art.js';

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

const CART_COLORS = ['#c9a466', '#7a5a9a', '#4f7a6a', '#9a6a3a', '#5a6fae', '#a0522d'];

/** A cart seen from above, `len` cells long, in a box of len×100 by 100 (horizontal). */
export function cart(len, k, barendsCart = false) {
  const W = len * 100;
  const color = barendsCart ? '#d8433a' : CART_COLORS[k % CART_COLORS.length];
  const hay = barendsCart ? '' : k % 2 ? `<path d="M20 30 q${W / 4} -14 ${W / 2 - 20} 0 t${W / 2 - 20} 0" stroke="#f2d06b" stroke-width="10" fill="none" stroke-linecap="round"/>` : '';
  return `<g class="cart-art">
    <rect x="10" y="4" width="16" height="10" rx="3" fill="#2a1d1a"/><rect x="${W - 26}" y="4" width="16" height="10" rx="3" fill="#2a1d1a"/>
    <rect x="10" y="86" width="16" height="10" rx="3" fill="#2a1d1a"/><rect x="${W - 26}" y="86" width="16" height="10" rx="3" fill="#2a1d1a"/>
    <rect x="6" y="12" width="${W - 12}" height="76" rx="14" fill="${color}" stroke="#2a1d1a" stroke-width="4"/>
    <rect x="16" y="22" width="${W - 32}" height="56" rx="8" fill="none" stroke="#2a1d1a" stroke-width="2" opacity=".4"/>
    ${hay}
    ${barendsCart ? `<g transform="translate(${W - 110} 4) scale(.9)">${barend()}</g>` : ''}
  </g>`;
}

export function yardGround(size) {
  const stones = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      stones.push(`<rect x="${x * 100 + 4}" y="${y * 100 + 4}" width="92" height="92" rx="12" class="cobble"/>`);
    }
  }
  return stones.join('');
}

function night(extra = '') {
  return `<rect width="1600" height="900" fill="url(#g-night)"/>
    <circle cx="1350" cy="140" r="100" fill="url(#g-moon)"/>${extra}
    <path d="M0 660 Q400 600 800 650 T1600 640 V900 H0Z" fill="var(--dune-far)"/>`;
}

export function scene(name) {
  switch (name) {
    case 'parked':
      return `${night()}${at(300, 330, 1.6, hugo())}
        ${at(700, 560, 1.4, cart(3, 1))}${at(1150, 520, 1.4, cart(2, 2))}
        <path d="M0 800 Q800 760 1600 800 V900 H0Z" fill="var(--dune-near)"/>`;
    case 'stuck':
      return `${night()}${at(200, 520, 1.8, cart(2, 0, true))}
        ${at(620, 360, 1.3, cart(2, 1))}${at(900, 560, 1.3, cart(3, 4))}
        ${at(1200, 300, 3, pim())}`;
    case 'free':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        <circle cx="1300" cy="240" r="200" fill="url(#g-sun)"/>
        <path d="M0 660 Q400 600 800 650 T1600 640 V900 H0Z" fill="#d7b877"/>
        ${at(600, 540, 2.2, cart(2, 0, true))}${at(180, 330, 3.4, pim())}`;
    default:
      return night();
  }
}

export function goal() {
  // The gate in the fence.
  return `<g><rect x="10" y="30" width="16" height="60" fill="#6b4a2a"/><rect x="74" y="30" width="16" height="60" fill="#6b4a2a"/>
    <path d="M26 40 H74 M26 60 H74" stroke="#8a6a3a" stroke-width="8"/><circle cx="50" cy="20" r="12" fill="url(#g-lantern)"/></g>`;
}

export function card() {
  return `<rect x="16" y="14" width="168" height="124" rx="10" fill="#4a4a5e"/>
    ${at(22, 60, 0.3, cart(2, 0, true))}${at(90, 20, 0.3, `<g transform="rotate(90 50 50) translate(0 0)">${cart(2, 1)}</g>`)}
    ${at(110, 94, 0.3, cart(3, 2))}
    <rect x="182" y="58" width="10" height="34" fill="#ffd35a"/>`;
}
