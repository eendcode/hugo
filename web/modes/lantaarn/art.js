// Art for Lantaarnlicht: the lantern on its post, mirrors, moonstones,
// stone walls, and the story scenes. 100×100 boxes unless noted.

import { pim, dame } from '../../art.js';

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

export function lantern(facing = 1) {
  // The lantern hangs on a post; a little cone shows where it shines.
  return `<g class="lantern-post">
    <g transform="rotate(${facing * 90} 50 50)"><path d="M50 50 L36 0 H64Z" fill="#ffd35a" opacity=".35"/></g>
    <rect x="46" y="44" width="8" height="48" fill="#6b4a2a"/>
    <path d="M50 44 q0 -10 -10 -10" stroke="#6b4a2a" stroke-width="4" fill="none"/>
    <circle cx="40" cy="44" r="18" fill="url(#g-lantern)"/>
    <rect x="32" y="36" width="16" height="20" rx="3" fill="#ffd35a" stroke="#6b4a2a" stroke-width="3"/>
  </g>`;
}

/** A mirror on a stand: `/` or `\`. `fixed` ones are bolted down. */
export function mirror(kind, fixed = false) {
  const r = kind === 'Slash' ? -45 : 45;
  return `<g class="mirror-piece ${fixed ? 'fixed' : ''}">
    ${fixed ? '<rect x="6" y="6" width="88" height="88" rx="10" class="fixed-plate"/>' : ''}
    <g transform="rotate(${r} 50 50)">
      <rect x="10" y="44" width="80" height="12" rx="4" fill="#cfe8ff" stroke="#3a4a6a" stroke-width="3"/>
      <rect x="14" y="47" width="72" height="3" fill="#ffffff" opacity=".8"/>
    </g>
  </g>`;
}

export function stone(lit = false) {
  return `<g class="moonstone ${lit ? 'lit' : ''}">
    ${lit ? '<circle cx="50" cy="52" r="34" fill="url(#g-blue-lantern)"/>' : ''}
    <path d="M50 18 L72 40 L62 80 H38 L28 40Z" fill="${lit ? '#e6f4ff' : '#6d7fa8'}" stroke="#2a3a5a" stroke-width="3"/>
    <path d="M50 18 L50 80 M28 40 H72" stroke="#2a3a5a" stroke-width="2" opacity=".5"/>
  </g>`;
}

export function wall() {
  return `<g class="wall">
    <rect x="6" y="14" width="88" height="76" rx="8" fill="#5a5f7a" stroke="#2a2d40" stroke-width="3"/>
    <path d="M6 40 H94 M6 64 H94 M40 14 V40 M66 40 V64 M30 64 V90 M70 64 V90" stroke="#2a2d40" stroke-width="3"/>
  </g>`;
}

function night(extra = '') {
  return `<rect width="1600" height="900" fill="url(#g-night)"/>${extra}
    <path d="M0 660 Q400 600 800 650 T1600 640 V900 H0Z" fill="var(--dune-far)"/>
    <path d="M0 780 Q800 740 1600 780 V900 H0Z" fill="var(--dune-near)"/>`;
}

export function scene(name, { scare = 'spannend' } = {}) {
  switch (name) {
    case 'dark':
      return `${night()}${at(1000, 250, 3.4, dame({ scare }))}
        ${[0, 1, 2].map((k) => at(200 + k * 220, 560, 1.4, stone(false))).join('')}`;
    case 'beam':
      return `${night()}${at(120, 360, 4, pim())}
        <path d="M470 470 H1000 L1300 200" stroke="#ffe27a" stroke-width="18" fill="none" opacity=".8" filter="url(#f-glow)"/>
        ${at(950, 420, 1, mirror('Slash'))}${at(1250, 140, 1.3, stone(true))}`;
    case 'bright':
      return `<rect width="1600" height="900" fill="#27407a"/>
        ${[0, 1, 2, 3, 4].map((k) => at(160 + k * 280, 500 - (k % 2) * 80, 1.6, stone(true))).join('')}
        ${at(620, 120, 3.4, dame({ scare: 'zacht', mood: 'happy' }))}
        <path d="M0 780 Q800 740 1600 780 V900 H0Z" fill="#6d6f9e"/>`;
    default:
      return night();
  }
}

export function goal() {
  return stone(true);
}

export function card() {
  return `<rect x="10" y="10" width="180" height="130" rx="12" fill="#1c2a55"/>
    ${at(14, 40, 0.8, lantern(1))}
    <path d="M70 80 H130 V30" stroke="#ffe27a" stroke-width="8" fill="none" filter="url(#f-glow)"/>
    ${at(98, 48, 0.64, mirror('Slash'))}${at(104, 2, 0.5, stone(true))}`;
}
