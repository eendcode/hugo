// Procedural SVG art. Every function returns an SVG fragment string drawn
// in a 100×100 cell box (centre 50,50) unless noted. No image assets.
// All characters and designs here are original.

export const COLORS = {
  night: '#0e1733',
  ground: '#1c2a55',
  groundFixed: '#373f72',
  groundEdge: '#4d5c9c',
  sand: '#f0d59c',
  sandEdge: '#6b4f2a',
  trail: '#c9a466',
  heather: '#9a62b3',
  lantern: '#ffd35a',
  ghost: '#e6f4ff',
  ghostBlue: '#a9d4ff',
};

/** Shared gradients and filters, installed once into the document. */
export const DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="g-lantern"><stop offset="0" stop-color="#fff3b0" stop-opacity=".95"/><stop offset=".35" stop-color="#ffd35a" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-ghost" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#e6f4ff"/><stop offset="1" stop-color="#b8dcff" stop-opacity=".75"/></radialGradient>
    <radialGradient id="g-ghostglow"><stop offset="0" stop-color="#cfe9ff" stop-opacity=".7"/><stop offset="1" stop-color="#cfe9ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-blue-lantern"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#a9d4ff" stop-opacity=".8"/><stop offset="1" stop-color="#a9d4ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-fire"><stop offset="0" stop-color="#ffb347" stop-opacity=".7"/><stop offset="1" stop-color="#ff7a2f" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-mist"><stop offset="0" stop-color="#e8f3ff" stop-opacity=".85"/><stop offset=".7" stop-color="#cfe2f5" stop-opacity=".45"/><stop offset="1" stop-color="#cfe2f5" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-moon"><stop offset=".6" stop-color="#fbf6dc"/><stop offset=".75" stop-color="#fbf6dc" stop-opacity=".25"/><stop offset="1" stop-color="#fbf6dc" stop-opacity="0"/></radialGradient>
    <radialGradient id="g-sun"><stop offset=".45" stop-color="#ffe27a"/><stop offset=".7" stop-color="#ffc24d" stop-opacity=".45"/><stop offset="1" stop-color="#ffa94d" stop-opacity="0"/></radialGradient>
    <linearGradient id="g-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sky-top)"/><stop offset="1" stop-color="var(--sky-bottom)"/></linearGradient>
    <linearGradient id="g-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb6ff"/><stop offset=".6" stop-color="#ffd9a0"/><stop offset="1" stop-color="#ffc07a"/></linearGradient>
    <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#f2c23a"/><stop offset="1" stop-color="#b8862a"/></linearGradient>
    <linearGradient id="g-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cdd6e3"/><stop offset="1" stop-color="#8793a6"/></linearGradient>
    <filter id="f-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
</svg>`;

export const ROAD_PATHS = {
  Straight: 'M50 0V100',
  Curve: 'M50 0A50 50 0 0 0 100 50',
  TJunction: 'M50 0V100M50 50H100',
  Cross: 'M50 0V100M0 50H100',
  DeadEnd: 'M50 0V50',
};

/** A road piece. `trail` draws a robber trail with goat-hoof prints. */
export function road(kind, rot = 0, { trail = false, dim = false } = {}) {
  const d = ROAD_PATHS[kind];
  if (!d) return '';
  const cap = kind === 'DeadEnd';
  const sand = trail ? COLORS.trail : COLORS.sand;
  const marks = trail
    ? `<path d="${d}" stroke="#4a2f16" stroke-width="7" stroke-dasharray="2 5 2 16" stroke-linecap="round" fill="none"/>`
    : `<path d="${d}" stroke="#d6b474" stroke-width="3" stroke-dasharray="7 11" fill="none"/>`;
  return `<g transform="rotate(${rot * 90} 50 50)"${dim ? ' opacity=".55"' : ''}>
    <path d="${d}" stroke="${COLORS.sandEdge}" stroke-width="42" fill="none"/>
    ${cap ? `<circle cx="50" cy="50" r="21" fill="${COLORS.sandEdge}"/>` : ''}
    <path d="${d}" stroke="${sand}" stroke-width="32" fill="none"/>
    ${cap ? `<circle cx="50" cy="50" r="16" fill="${sand}"/>` : ''}
    ${marks}
  </g>`;
}

/** Cell ground. `fixed` cells are lighter with corner rivets (the lock mark). */
export function ground(type) {
  switch (type) {
    case 'empty':
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="${COLORS.ground}"/>
        <rect x="9" y="9" width="82" height="82" rx="8" fill="none" stroke="${COLORS.groundEdge}" stroke-width="3" stroke-dasharray="9 9"/>`;
    case 'placed':
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="${COLORS.ground}"/>`;
    case 'fixed':
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="${COLORS.groundFixed}" stroke="#6770a8" stroke-width="3"/>
        ${[12, 88].flatMap((x) => [12, 88].map((y) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#9aa3d6"/>`)).join('')}`;
    default:
      return `<rect x="3" y="3" width="94" height="94" rx="10" fill="#17224a"/>`;
  }
}

/** The base of a multi-cell block: one raised plank spanning w×h cells. */
export function blockBase(w, h) {
  const W = w * 100;
  const H = h * 100;
  const seams = [];
  for (let x = 1; x < w; x++) seams.push(`<path d="M${x * 100} 12V${H - 12}"/>`);
  for (let y = 1; y < h; y++) seams.push(`<path d="M12 ${y * 100}H${W - 12}"/>`);
  return `<rect class="block-shadow" x="6" y="10" width="${W - 8}" height="${H - 8}" rx="14"/>
    <rect class="block-base" x="4" y="4" width="${W - 8}" height="${H - 8}" rx="14"/>
    <g class="block-seams">${seams.join('')}</g>`;
}

/** A grass tuft for block cells without road. */
export function grass() {
  return `<g class="grass">
    <path d="M30 70 q4 -22 10 -30 M40 72 q0 -26 6 -38 M50 72 q2 -20 12 -28 M60 72 q4 -16 14 -20" stroke="#6fbf73" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="66" cy="44" r="6" fill="${COLORS.heather}"/><circle cx="36" cy="38" r="5" fill="#e0b8f0"/>
  </g>`;
}

export function scenery(kind) {
  switch (kind) {
    case 'Dune':
      return `<path d="M4 84 Q28 30 58 74 Q72 48 96 84 Z" fill="#d9bf86"/>
        <path d="M28 44 Q44 52 58 74 Q40 70 20 84 L10 84 Q18 58 28 44Z" fill="#b99c63" opacity=".6"/>
        <path d="M60 70 q8 -6 18 -4" stroke="#b99c63" stroke-width="3" fill="none"/>`;
    case 'Pine':
      return `<rect x="45" y="72" width="10" height="16" fill="#6b4a2a"/>
        <polygon points="50,8 76,46 24,46" fill="#2f7a55"/>
        <polygon points="50,24 82,66 18,66" fill="#276a49"/>
        <polygon points="50,42 86,80 14,80" fill="#1f5a3d"/>`;
    case 'Heather':
      return `<ellipse cx="50" cy="76" rx="38" ry="12" fill="#2b5a3a"/>
        ${[
          [26, 62, 13], [42, 52, 15], [60, 54, 14], [74, 64, 12], [50, 68, 14], [34, 72, 10], [66, 72, 10],
        ].map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${i % 2 ? '#b77fd0' : COLORS.heather}"/>`).join('')}
        ${[[30, 56], [46, 46], [62, 50], [52, 62], [72, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#e0b8f0"/>`).join('')}`;
    case 'Campfire':
      return `<circle cx="50" cy="60" r="40" fill="url(#g-fire)"/>
        <rect x="22" y="70" width="56" height="10" rx="5" fill="#6b4a2a" transform="rotate(-12 50 75)"/>
        <rect x="22" y="70" width="56" height="10" rx="5" fill="#7d5733" transform="rotate(12 50 75)"/>
        <g class="flame"><path d="M50 22 C62 40 68 50 62 64 C58 74 42 74 38 64 C32 50 42 44 50 22Z" fill="#ff8a2f"/>
        <path d="M50 42 C57 52 58 58 55 66 C52 70 48 70 45 66 C42 58 45 52 50 42Z" fill="#ffd35a"/></g>`;
    default:
      return '';
  }
}

/** Ghost mist over a cell (drawn on top of any lure road). */
export function mist() {
  return `<g class="mist">
    <circle cx="30" cy="40" r="30" fill="url(#g-mist)"/>
    <circle cx="68" cy="34" r="28" fill="url(#g-mist)"/>
    <circle cx="50" cy="66" r="34" fill="url(#g-mist)"/>
    <g class="wisp"><path d="M12 56 q14 -10 28 0 t28 0 t22 -4" stroke="#f4faff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>
    <path d="M20 30 q12 -8 24 0 t24 0" stroke="#f4faff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".5"/></g>
  </g>`;
}

/** Pim on his goat Barend, lantern in hand. Faces right; `flip` faces left. */
export function pim({ flip = false, glow = true } = {}) {
  return `<g class="pim"${flip ? ' transform="translate(100 0) scale(-1 1)"' : ''}>
    ${glow ? '<circle class="lantern-glow" cx="74" cy="40" r="30" fill="url(#g-lantern)"/>' : ''}
    <g class="barend">
      <rect x="31" y="66" width="6" height="18" rx="3" fill="#d9d2c2"/>
      <rect x="41" y="68" width="6" height="17" rx="3" fill="#e9e4d8"/>
      <rect x="57" y="68" width="6" height="17" rx="3" fill="#d9d2c2"/>
      <rect x="65" y="66" width="6" height="18" rx="3" fill="#e9e4d8"/>
      <path d="M24 60 q-8 -6 -4 -12" stroke="#e9e4d8" stroke-width="5" stroke-linecap="round" fill="none"/>
      <ellipse cx="49" cy="64" rx="27" ry="13" fill="#f4f0e6" stroke="#9c9380" stroke-width="2"/>
      <path d="M68 58 q6 -14 12 -16" stroke="#f4f0e6" stroke-width="12" stroke-linecap="round" fill="none"/>
      <ellipse cx="82" cy="45" rx="9" ry="8" fill="#f4f0e6" stroke="#9c9380" stroke-width="2"/>
      <path d="M78 39 q-4 -12 -12 -12" stroke="#b39463" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M83 38 q2 -12 -5 -15" stroke="#b39463" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      <path d="M84 52 l2 9 l3 -8z" fill="#d9d2c2"/>
      <circle cx="85" cy="43" r="1.8" fill="#2b2b2b"/>
      <ellipse cx="74" cy="42" rx="4" ry="2" fill="#e0d8c6" transform="rotate(-20 74 42)"/>
    </g>
    <g class="rider">
      <path d="M40 58 q-2 -16 8 -20 q10 -2 12 14 z" fill="#3f7fd0"/>
      <rect x="42" y="56" width="16" height="8" rx="3" fill="#2d5ea3"/>
      <path d="M56 44 l12 -6" stroke="#3f7fd0" stroke-width="6" stroke-linecap="round"/>
      <circle cx="50" cy="30" r="10" fill="#f7d1b0"/>
      <path d="M40 29 q1 -12 11 -12 q10 0 10 11 z" fill="#d8433a"/>
      <circle cx="40" cy="24" r="3.5" fill="#fff"/>
      <circle cx="54" cy="31" r="1.6" fill="#2b2b2b"/>
      <path d="M52 35 q3 2 6 0" stroke="#8a4b33" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="57" cy="33" r="2" fill="#f2a58a" opacity=".6"/>
    </g>
    <g class="lantern">
      <path d="M72 30 v-4" stroke="#6b4a2a" stroke-width="2"/>
      <rect x="68" y="30" width="10" height="13" rx="2" fill="#ffd35a" stroke="#6b4a2a" stroke-width="2"/>
      <rect x="67" y="28" width="12" height="3" rx="1" fill="#6b4a2a"/>
    </g>
  </g>`;
}

/** De Duinkapel: small whitewashed chapel with a bell tower. */
export function chapel({ lit = true, treasures = [] } = {}) {
  const t = treasures.map((o, i) => `<g transform="translate(${30 + i * 14} 70) scale(.22)">${treasure(o)}</g>`).join('');
  return `<g class="chapel">
    ${lit ? '<circle cx="50" cy="62" r="34" fill="url(#g-lantern)" opacity=".5"/>' : ''}
    <rect x="42" y="16" width="16" height="20" fill="#ece3cf" stroke="#8c7f66" stroke-width="1.5"/>
    <polygon points="39,18 50,4 61,18" fill="#8a3f3f"/>
    <path d="M50 4 v-4 M47 -2 h6" stroke="#6b4a2a" stroke-width="2"/>
    <path d="M46 34 v-8 a4 4 0 0 1 8 0 v8z" fill="#3a2a1a"/>
    <path d="M47.5 28 q2.5 -3 5 0 v2 h-5z" fill="#ffd35a"/>
    <rect x="26" y="44" width="48" height="42" fill="#f1e8d4" stroke="#8c7f66" stroke-width="1.5"/>
    <polygon points="20,46 50,26 80,46" fill="#9a4747"/>
    <path d="M42 86 v-16 a8 8 0 0 1 16 0 v16z" fill="#5a3a22"/>
    <circle cx="50" cy="56" r="5" fill="${lit ? '#ffd35a' : '#6d6a80'}" stroke="#8c7f66" stroke-width="1.5"/>
    ${t}
  </g>`;
}

/** The stolen treasures: 0 kandelaar, 1 beker, 2 klokje. */
export function treasure(order) {
  switch (order) {
    case 0:
      return `<g class="treasure">
        <ellipse cx="50" cy="86" rx="20" ry="6" fill="url(#g-silver)"/>
        <rect x="46" y="44" width="8" height="42" fill="url(#g-silver)"/>
        <ellipse cx="50" cy="62" rx="10" ry="4" fill="url(#g-silver)"/>
        <path d="M34 44 h32 l-6 6 h-20z" fill="url(#g-silver)"/>
        <rect x="44" y="24" width="12" height="20" rx="2" fill="#fbf6e6"/>
        <path class="flame" d="M50 6 C56 14 58 18 55 23 C53 26 47 26 45 23 C42 18 44 14 50 6Z" fill="#ffc53d"/>
      </g>`;
    case 1:
      return `<g class="treasure">
        <path d="M26 16 h48 q0 34 -24 38 q-24 -4 -24 -38z" fill="url(#g-gold)" stroke="#8c6420" stroke-width="2"/>
        <rect x="46" y="54" width="8" height="18" fill="url(#g-gold)"/>
        <ellipse cx="50" cy="80" rx="20" ry="7" fill="url(#g-gold)" stroke="#8c6420" stroke-width="2"/>
        <circle cx="50" cy="32" r="5" fill="#d64545"/>
        <path d="M32 22 q2 14 10 22" stroke="#fff6c8" stroke-width="3" fill="none" opacity=".8"/>
      </g>`;
    case 2:
      return `<g class="treasure">
        <path d="M44 14 a6 6 0 0 1 12 0" stroke="#8c6420" stroke-width="4" fill="none"/>
        <path d="M50 16 C30 16 28 40 26 60 L20 72 H80 L74 60 C72 40 70 16 50 16Z" fill="url(#g-gold)" stroke="#8c6420" stroke-width="2"/>
        <circle cx="50" cy="80" r="7" fill="#b8862a"/>
        <path d="M34 30 q-2 14 -3 28" stroke="#fff6c8" stroke-width="3" fill="none" opacity=".8"/>
      </g>`;
    default:
      return '';
  }
}

/**
 * De Witte Dame: a softly glowing, flowing figure of mist with a pale-blue
 * lantern. No face in "zacht". `mood` is 'sad' or 'happy' (finale).
 */
export function dame({ scare = 'spannend', mood = 'sad' } = {}) {
  const face =
    scare === 'zacht' && mood !== 'happy'
      ? ''
      : `<ellipse cx="43" cy="34" rx="${scare === 'eng' ? 3.6 : 3}" ry="${scare === 'eng' ? 4.8 : 4}" fill="#56688f"/>
         <ellipse cx="57" cy="34" rx="${scare === 'eng' ? 3.6 : 3}" ry="${scare === 'eng' ? 4.8 : 4}" fill="#56688f"/>
         ${mood === 'happy' ? '<path d="M43 44 Q50 51 57 44" stroke="#56688f" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="39" cy="41" r="3" fill="#ffc2d1" opacity=".7"/><circle cx="61" cy="41" r="3" fill="#ffc2d1" opacity=".7"/>'
           : '<path d="M45 46 Q50 42.5 55 46" stroke="#56688f" stroke-width="2.2" fill="none" stroke-linecap="round"/>'}`;
  return `<g class="dame dame-${scare}">
    <ellipse class="dame-glow" cx="50" cy="54" rx="44" ry="46" fill="url(#g-ghostglow)"/>
    <g class="dame-body">
      <path d="M50 10 C31 10 27 32 29 52 C31 70 23 82 16 92 Q26 86 33 93 Q41 85 50 93 Q59 85 67 93 Q74 86 84 92 C77 82 69 70 71 52 C73 32 69 10 50 10Z" fill="url(#g-ghost)"/>
      <path d="M36 16 C30 34 34 60 26 84" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".7"/>
      <path d="M64 16 C70 34 66 60 74 84" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".7"/>
      <path d="M40 56 q-8 6 -4 14" stroke="#d6ecff" stroke-width="5" stroke-linecap="round" fill="none"/>
      ${face}
      <path d="M62 56 q10 2 14 -2" stroke="#d6ecff" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle class="dame-lantern-glow" cx="80" cy="60" r="16" fill="url(#g-blue-lantern)"/>
      <path d="M78 46 v6" stroke="#8fb3d9" stroke-width="1.5"/>
      <rect x="75" y="52" width="10" height="13" rx="2.5" fill="#dff0ff" stroke="#8fb3d9" stroke-width="1.5"/>
    </g>
  </g>`;
}

/** Hoofdman Hugo, leader of the bokkenrijders, on his goat: a silly-scary silhouette (story only). 200×160 box. */
export function hugo() {
  const c = '#150d26';
  return `<g class="hugo" fill="${c}">
    <path d="M40 104 Q52 78 96 80 Q140 78 150 96 Q156 110 144 118 L150 150 L140 150 L132 124 Q110 130 86 126 L70 152 L60 150 L66 122 Q46 120 40 104Z"/>
    <path d="M44 106 L18 132 L26 138 L52 116Z"/>
    <path d="M142 96 Q160 74 176 78 Q188 84 180 96 Q170 104 156 106Z"/>
    <path d="M166 78 Q160 52 140 50 Q156 60 158 78Z"/>
    <path d="M176 80 Q190 58 176 44 Q182 62 170 78Z"/>
    <path d="M178 96 l6 16 l-10 -12z"/>
    <path d="M86 84 Q80 56 96 46 Q114 40 118 60 Q120 76 110 84Z"/>
    <circle cx="104" cy="34" r="15"/>
    <path d="M114 36 q16 2 18 8 q-10 2 -18 -2z"/>
    <path d="M100 42 q-14 8 -24 2 q8 -2 12 -8z"/>
    <path d="M72 26 Q104 -2 136 24 Q120 18 104 20 Q88 18 72 26Z"/>
    <path d="M118 58 L150 40 L154 46 L122 66Z"/>
    <circle cx="108" cy="32" r="2.4" fill="#ffd35a"/>
  </g>`;
}

function stars(count, w, h, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: count }, () => {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 1 + rnd() * 2.2;
    return `<circle class="star" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="#fff8d8" style="animation-delay:${(rnd() * 4).toFixed(1)}s"/>`;
  }).join('');
}

function dunes(y, color, amp = 60, w = 1600) {
  return `<path d="M0 ${y} Q${w * 0.15} ${y - amp} ${w * 0.3} ${y} T${w * 0.6} ${y} T${w * 0.9} ${y} T${w * 1.2} ${y} V900 H0Z" fill="${color}"/>`;
}

/** Night sky with moon, stars and dunes: 1600×900. */
function nightBackdrop({ storm = false, moon = [1320, 150] } = {}) {
  const [mx, my] = moon;
  return `<rect width="1600" height="900" fill="url(#g-night)"/>
    ${stars(70, 1600, 520, storm ? 3 : 7)}
    ${storm ? '' : `<circle cx="${mx}" cy="${my}" r="110" fill="url(#g-moon)"/><circle cx="${mx - 30}" cy="${my - 20}" r="14" fill="#ece5c2" opacity=".6"/><circle cx="${mx + 25}" cy="${my + 25}" r="9" fill="#ece5c2" opacity=".6"/>`}
    ${dunes(640, 'var(--dune-far)', 70)}
    ${dunes(740, 'var(--dune-mid)', 60)}`;
}

function fogBank(y, opacity = 0.6) {
  return `<g class="fogbank" opacity="${opacity}">
    ${[0, 260, 520, 780, 1040, 1300].map((x, i) => `<ellipse cx="${x + 130}" cy="${y + (i % 2) * 20}" rx="220" ry="46" fill="url(#g-mist)"/>`).join('')}
  </g>`;
}

/** Story and finale scenes, 1600×900. */
export function scene(name, { scare = 'spannend', treasures = [] } = {}) {
  const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;
  switch (name) {
    case 'storm':
      return `${nightBackdrop({ storm: true })}
        <path class="lightning" d="M420 0 L380 160 L430 160 L360 360 L470 150 L420 150 L470 0Z" fill="#fff6b0"/>
        ${at(1050, 420, 3.2, chapel({ lit: false }))}
        ${at(260, 250, 2.6, hugo())}
        ${at(40, 120, 1.2, hugo())}
        ${dunes(820, 'var(--dune-near)', 40)}`;
    case 'scatter':
      return `${nightBackdrop()}
        ${at(1180, 430, 2.2, chapel({ lit: false }))}
        ${at(220, 560, 1.4, treasure(0))}
        ${at(620, 620, 1.4, treasure(1))}
        ${at(960, 560, 1.4, treasure(2))}
        ${[300, 700, 1030].map((x) => `<circle cx="${x}" cy="640" r="70" fill="url(#g-lantern)" opacity=".5"/>`).join('')}
        ${dunes(840, 'var(--dune-near)', 40)}`;
    case 'dame':
      return `${nightBackdrop()}
        ${at(1150, 420, 2.6, chapel({ lit: false }))}
        ${fogBank(700, 0.7)}
        ${at(520, 180, 5, dame({ scare }))}
        ${fogBank(800, 0.8)}`;
    case 'pim':
      return `${nightBackdrop()}
        ${dunes(820, 'var(--dune-near)', 40)}
        ${at(430, 330, 6, pim())}
        ${at(1250, 520, 1.6, chapel({ lit: false }))}`;
    case 'rules':
      return `${nightBackdrop()}
        ${fogBank(640, 0.9)}
        ${at(200, 480, 3, pim())}
        ${at(1080, 200, 4, dame({ scare }))}
        ${dunes(840, 'var(--dune-near)', 40)}`;
    case 'returned':
      return `${nightBackdrop()}
        ${at(560, 200, 5, chapel({ lit: true, treasures }))}
        ${at(250, 560, 2.6, pim())}
        ${dunes(860, 'var(--dune-near)', 30)}`;
    case 'bell':
      return `${nightBackdrop()}
        ${at(520, 120, 6, chapel({ lit: true, treasures: [0, 1, 2] }))}
        ${[0, 1, 2].map((i) => `<path class="ring" style="animation-delay:${i * 0.4}s" d="M${760 - 60 * (i + 1)} ${140 - 20 * i} q${60 * (i + 1)} -${50 + 20 * i} ${120 * (i + 1)} 0" stroke="#ffe27a" stroke-width="10" fill="none" stroke-linecap="round"/>`).join('')}
        ${dunes(860, 'var(--dune-near)', 30)}`;
    case 'dawn':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        <circle class="sunrise" cx="800" cy="640" r="260" fill="url(#g-sun)"/>
        ${dunes(640, '#e4c98f', 70)}${dunes(740, '#d7b877', 60)}
        ${fogBank(700, 0.35)}
        ${at(1120, 300, 4, dame({ scare: 'zacht', mood: 'happy' }))}
        ${at(300, 400, 3, chapel({ lit: true, treasures: [0, 1, 2] }))}
        ${dunes(840, '#c9a866', 40)}`;
    case 'runaway':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        <circle cx="1300" cy="300" r="200" fill="url(#g-sun)"/>
        ${dunes(640, '#e4c98f', 70)}${dunes(760, '#d7b877', 60)}
        ${at(1180, 440, 0.9, hugo())}
        ${[0, 1, 2].map((i) => `<circle cx="${1370 + i * 46}" cy="${590 - i * 10}" r="${26 - i * 6}" fill="#f4e3b8" opacity=".85"/>`).join('')}
        ${at(260, 360, 4.4, pim())}
        ${dunes(860, '#c9a866', 30)}`;
    case 'title':
      return `${nightBackdrop({ moon: [230, 170] })}
        ${fogBank(600, 0.3)}
        ${at(1020, 250, 3.6, chapel({ lit: true }))}
        ${at(330, 330, 3.4, pim())}
        ${dunes(840, 'var(--dune-near)', 40)}`;
    case 'map':
      return `${nightBackdrop({ moon: [150, 140] })}${fogBank(560, 0.25)}${dunes(860, 'var(--dune-near)', 30)}`;
    default:
      return nightBackdrop();
  }
}

/** Simple line icons for the on-screen buttons (24×24). */
export const ICONS = {
  undo: '<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12h-3" transform="translate(0 -3)"/>',
  hint: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  remove: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  look: '<path d="M6 21v-9a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/>',
  home: '<path d="M3 12 12 4l9 8M6 10v10h12V10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  prev: '<path d="M15 5l-7 7 7 7"/>',
  again: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  hoof: '<path d="M7 20c-2-3-1-8 2-10 1 3 1 7-2 10zM13 18c-2-3-1-8 2-10 1 3 1 7-2 10z"/><path d="M10 7c-1-2 0-4 2-4M16 5c0-2 1-3 3-3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}
