// The story mode's drawing kit: small SVG helpers that the books' art
// (art.js … art4.js), the puzzle skins (skins1.js … skins4.js), the
// pictures and the suspect board share. Scenes are 1600×900; pieces are
// 100×100 boxes unless noted.

import { house } from '../dorp/art.js';

/** `inner` moved to (x, y) and scaled by s. */
export const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

/** `inner` mirrored left to right within a box `w` wide. */
export const flip = (inner, w = 100) => `<g transform="translate(${w} 0) scale(-1 1)">${inner}</g>`;

/** A veil over a whole scene: behind a puzzle, or to dim a picture. */
export const shade = (o = 0.35, c = '#05081a') => `<rect width="1600" height="900" fill="${c}" opacity="${o}"/>`;

/** A four-point sparkle centred on (x, y); its class makes it twinkle (none: it stays still). */
export const sparkle = (x, y, r = 14, fill = '#fffbe0', cls = 'sparkle') =>
  `<path${cls ? ` class="${cls}"` : ''} d="M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}Z" fill="${fill}"/>`;

/** Bell-ringing arcs above a point. */
export function ringing(x, y, s = 1, color = '#ffb800') {
  return [0, 1, 2]
    .map((i) => `<path class="ring" style="animation-delay:${i * 0.4}s" d="M${x - 50 * s * (i + 1)} ${y - 14 * i * s} q${50 * s * (i + 1)} -${(40 + 16 * i) * s} ${100 * s * (i + 1)} 0" stroke="${color}" stroke-width="${8 * s}" fill="none" stroke-linecap="round"/>`)
    .join('');
}

/** A rolling dune (or hill) across the whole scene, from height y down. */
export const dune = (y, color, amp = 50) => `<path d="M0 ${y} Q200 ${y - amp} 400 ${y} T800 ${y} T1200 ${y} T1600 ${y} V900 H0Z" fill="${color}"/>`;

/** Where the small stars of a night sky twinkle. */
export const STARS = [[120, 80], [260, 180], [420, 60], [560, 150], [700, 40], [880, 110], [1040, 60], [1180, 170], [1300, 50], [1540, 260], [340, 300], [640, 260], [80, 340]];

/** Twinkling star dots at `list`'s points. */
export const starField = (opacity = 1, list = STARS) =>
  list.map(([x, y], i) => `<circle class="star" cx="${x}" cy="${y}" r="${2 + (i % 3)}" fill="#fff8d8" opacity="${opacity}" style="animation-delay:${(i % 5) * 0.7}s"/>`).join('');

/** The night sky with stars and the moon (radius r); `dark`: faint stars and no moon. */
export function nightSky({ dark = false, moon = [1440, 130], r = 96, stars = true } = {}) {
  return `<rect width="1600" height="900" fill="url(#g-night)"/>
    ${stars ? starField(dark ? 0.35 : 1) : ''}
    ${dark ? '' : `<circle cx="${moon[0]}" cy="${moon[1]}" r="${r}" fill="url(#g-moon)"/>`}`;
}

/** A five-pointed star in a 100×100 box. */
export const STAR = 'M50 10 l11 24 26 3 -19 18 5 26 -23 -13 -23 13 5 -26 -19 -18 26 -3z';

/** A gold star centred on (x, y). */
export const star = (x, y, s = 1, fill = '#ffe27a') => `<path d="${STAR}" transform="translate(${x - 50 * s} ${y - 50 * s}) scale(${s})" fill="${fill}" stroke="#b8862a" stroke-width="${4 / s}" stroke-linejoin="round"/>`;

const CLOUD = '<ellipse cx="80" cy="70" rx="70" ry="32"/><circle cx="96" cy="46" r="38"/><circle cx="148" cy="54" r="34"/><ellipse cx="170" cy="76" rx="60" ry="26"/><circle cx="56" cy="58" r="26"/>';

/** A fluffy cloud, about 240×110, with a lighter rim on top. */
export function cloud(x, y, s = 1, { fill = '#fff', rim = null, o = 1 } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}">${rim ? `<g fill="${rim}" transform="translate(0 -7)">${CLOUD}</g>` : ''}<g fill="${fill}">${CLOUD}</g></g>`;
}

/** Red hearts: [x, y, scale]; `stroke` null draws them without an edge. */
export const hearts = (list, stroke = '#7a1f1a') =>
  list.map(([x, y, s = 1]) => `<path d="M${x} ${y} c${-20 * s} ${-24 * s} ${-50 * s} 0 0 ${34 * s} c${50 * s} ${-34 * s} ${20 * s} ${-58 * s} 0 ${-34 * s}z" fill="#e0474c"${stroke ? ` stroke="${stroke}" stroke-width="3"` : ''}/>`).join('');

/** A speech bubble `w` wide whose tail points down at (0, 0) (or, flipped, ends there from the left). */
export function bubble(text, w = 220, { size = 54, color = '#3a2a1a', flipTail = false } = {}) {
  const tail = flipTail ? `M${w - 60} 92 L${w - 20} 140 L${w - 100} 96` : 'M60 92 L20 140 L100 96';
  return `<g transform="translate(${flipTail ? -w + 20 : -20} -140)">
    <rect x="0" y="0" width="${w}" height="100" rx="40" fill="#fffaf0" stroke="#1b1330" stroke-width="5"/>
    <path d="${tail}" fill="#fffaf0" stroke="#1b1330" stroke-width="5" stroke-linejoin="round"/>
    <rect x="4" y="60" width="${w - 8}" height="36" rx="16" fill="#fffaf0"/>
    <text x="${w / 2}" y="${50 + size * 0.36}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${color}">${text}</text>
  </g>`;
}

/** A big outlined word in the scene ("Boem!"). */
export const shout = (x, y, text, size = 110, fill = '#ffe27a') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${fill}" stroke="#1b1330" stroke-width="6" paint-order="stroke">${text}</text>`;

/** Sleepy Zzz rising up and to the right from (x, y). */
export function zzz(x, y, s = 1, fill = '#cfd6ee') {
  return `<g class="zzz" font-weight="800" fill="${fill}" stroke="#1b1330" stroke-width="${3 * s}" paint-order="stroke">
    <text x="${x}" y="${y}" font-size="${44 * s}">Z</text><text x="${x + 34 * s}" y="${y - 30 * s}" font-size="${34 * s}">z</text><text x="${x + 60 * s}" y="${y - 54 * s}" font-size="${26 * s}">z</text></g>`;
}

/** A soft dark outline, so white Barend and Pim stand out against a light sky. */
export const outlined = (inner) => `<g style="filter: drop-shadow(0 0 1.5px #3a2a1a) drop-shadow(0 0 1px #3a2a1a)">${inner}</g>`;

/** A string of party flags from (x1, y1) to (x2, y2). */
export function bunting(x1, y1, x2, y2, sag = 80) {
  const n = 12;
  const colors = ['#e0474c', '#f2c23a', '#3f7fd0', '#5fae52', '#9a62b3'];
  const pts = Array.from({ length: n }, (_, k) => {
    const u = k / (n - 1);
    return [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u + Math.sin(u * Math.PI) * sag];
  });
  return `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag * 2} ${x2} ${y2}" stroke="#4a2f1a" stroke-width="4" fill="none"/>
    ${pts.slice(0, -1).map(([x, y], k) => `<path d="M${x} ${y} L${pts[k + 1][0]} ${pts[k + 1][1]} L${(x + pts[k + 1][0]) / 2} ${(y + pts[k + 1][1]) / 2 + 40}Z" fill="${colors[k % colors.length]}" stroke="#4a2f1a" stroke-width="2"/>`).join('')}`;
}

/** A wooden sign on two posts with a name on it, centred on (0, 0); nothing without a name. */
export function nameSign(name, s = 1) {
  if (!name) return '';
  const w = Math.max(160, name.length * 34 + 60);
  return `<g transform="scale(${s})"><path d="M-6 40 V110 M6 40 V110" stroke="#6b4a2a" stroke-width="10"/>
    <rect x="${-w / 2}" y="-34" width="${w}" height="76" rx="14" fill="#c98a4a" stroke="#4a2f1a" stroke-width="6"/>
    <rect x="${-w / 2 + 8}" y="-26" width="${w - 16}" height="60" rx="10" fill="none" stroke="#e0a86a" stroke-width="3"/>
    <text y="20" text-anchor="middle" font-size="52" font-weight="800" fill="#fffaf0" stroke="#4a2f1a" stroke-width="5" paint-order="stroke">${name}</text></g>`;
}

const ROOFS = ['#9a4747', '#6d5a9a', '#9a6a3a', '#4f7a6a'];

/** Village houses at [x, y, scale]; `lit` windows glow (everyone is awake). */
export function houses(spots, { lit = false, roofs = ROOFS } = {}) {
  return spots.map(([x, y, s], i) => at(x, y, s, (lit ? '<circle cx="50" cy="60" r="62" fill="url(#g-lantern)" opacity=".7"/>' : '') + house(roofs[i % roofs.length], lit))).join('');
}
