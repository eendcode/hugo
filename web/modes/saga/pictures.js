// Picture icons for the story mode: the answer choices on riddle cards and
// the items in Pim's bag. Each picture is an SVG fragment in a 100×100 box,
// for use inside <svg viewBox="0 0 100 100">. One clear object per picture,
// bold shapes with a darker outline, readable on the night backgrounds and on
// the parchment riddle card. Dark subjects get a light rim or a pale backdrop.
//
// Only the shared DEFS from art.js are used (g-gold, g-silver, g-lantern,
// g-sun, f-soft, …); there are no extra defs to install.

import { dame } from '../../art.js';
import { house, piece } from '../dorp/art.js';
import { barend as barendArt } from '../programma/art.js';
import { at, sparkle as twinkle, STAR } from './kit.js';

/** Draw `shapes` as one silhouette with a merged outline (stroke pass, then fill pass). */
const merged = (shapes, fill, stroke, w = 3) =>
  `<g fill="${fill}" stroke="${stroke}" stroke-width="${w * 2}" stroke-linejoin="round" stroke-linecap="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;

/** A thick line with a darker outline, e.g. a handle or a strap. */
const rod = (d, fill, stroke, w) =>
  `<path d="${d}" stroke="${stroke}" stroke-width="${w + 5}" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;

/** A soft ground shadow under an object. */
const shadow = (cx = 50, cy = 90, rx = 32) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.16}" fill="#000" opacity=".22"/>`;

/** A little four-point sparkle ("it shines"); pictures are small, so it stays still. */
const sparkle = (x, y, r = 6, fill) => twinkle(x, y, r, fill, '');

const MOON = 'M60 10 A40 40 0 1 0 60 90 A60 60 0 0 1 60 10Z'; // crescent, open to the right
const WOOD = '#c98a4a';
const WOOD_DARK = '#4a2f1a';
const RIM = '#9aa3d6'; // light rim around dark subjects, so they read at night

// ---------- characters and animals ----------

/** A feather: `vane` colour, `barb` lines, `edge` outline; tilted like it floats. */
function feather({ vane, barb, edge, shaft = '#a89878', tip = '', rot = 30 }) {
  const barbs = [24, 34, 44, 54, 64].map((y) => `<path d="M50 ${y + 6} L${38 + (y - 24) * 0.05} ${y}"/><path d="M50 ${y + 6} L${62 - (y - 24) * 0.1} ${y - 2}"/>`).join('');
  return `<g transform="rotate(${rot} 50 50)">
    <path d="M50 8 C68 20 68 58 54 82 L50 80 L46 82 C32 58 32 22 50 8Z" fill="${vane}" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>
    ${tip}
    <path d="M36 44 l6 2 M64 38 l-6 3 M35 60 l6 1" stroke="${edge}" stroke-width="2.5" stroke-linecap="round"/>
    <g stroke="${barb}" stroke-width="1.6" stroke-linecap="round" opacity=".8">${barbs}</g>
    <path d="M50 12 Q51 50 50 94" stroke="${shaft}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  </g>`;
}

/** The little black kid goat from the finale, facing right. Big head, big eyes. */
function bokje() {
  const c = '#2e2840';
  return `<g class="bokje">
    ${shadow(48, 88, 30)}
    <g fill="${c}" stroke="${RIM}" stroke-width="2.5">
      <rect x="28" y="64" width="7" height="22" rx="3.5"/><rect x="38" y="66" width="7" height="21" rx="3.5"/>
      <rect x="50" y="66" width="7" height="21" rx="3.5"/><rect x="59" y="64" width="7" height="22" rx="3.5"/>
      <path d="M24 56 q-8 -4 -6 -14" fill="none" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="45" cy="60" rx="24" ry="14"/>
      <path d="M58 26 q2 -8 7 -9 q-1 6 0 10z M76 26 q-1 -8 -6 -9 q0 6 -1 10z" fill="#d9c7a0" stroke="#8a7a5a" stroke-width="1.5"/>
      <ellipse cx="50" cy="38" rx="11" ry="5" transform="rotate(18 50 38)"/>
      <ellipse cx="84" cy="38" rx="11" ry="5" transform="rotate(-18 84 38)"/>
      <circle cx="67" cy="42" r="18"/>
    </g>
    <ellipse cx="51" cy="38.5" rx="6" ry="2.2" fill="#b07a98" transform="rotate(18 51 38)"/>
    <ellipse cx="83" cy="38.5" rx="6" ry="2.2" fill="#b07a98" transform="rotate(-18 83 38)"/>
    <ellipse cx="67" cy="52" rx="9" ry="6.5" fill="#4a4262"/>
    <circle cx="64" cy="51" r="1.4" fill="#1b1330"/><circle cx="70" cy="51" r="1.4" fill="#1b1330"/>
    <path d="M63 55 q4 3 8 0" stroke="#c9b8e0" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="60" cy="41" r="5.5" fill="#fff"/><circle cx="74" cy="41" r="5.5" fill="#fff"/>
    <circle cx="61" cy="42" r="3.4" fill="#1b1330"/><circle cx="75" cy="42" r="3.4" fill="#1b1330"/>
    <circle cx="62.2" cy="40.6" r="1.3" fill="#fff"/><circle cx="76.2" cy="40.6" r="1.3" fill="#fff"/>
    <circle cx="56" cy="49" r="2.6" fill="#e58aa8" opacity=".55"/><circle cx="78" cy="49" r="2.6" fill="#e58aa8" opacity=".55"/>
  </g>`;
}

/** Hoofdman Hugo as a bust: his dark silhouette, big hat with the red feather, on a moon. */
function hugo() {
  const c = '#150d26';
  return `<g class="hugo-bust">
    <circle cx="50" cy="52" r="42" fill="#e4dcf4" stroke="#a898cc" stroke-width="2.5"/>
    <g fill="${c}">
      <path d="M14 96 Q14 70 50 66 Q86 70 86 96 Q68 99 50 99 Q32 99 14 96Z"/>
      <circle cx="50" cy="50" r="15"/>
      <path d="M61 46 Q78 49 73 57 Q66 58 61 53Z"/>
      <path d="M41 58 Q50 80 60 59Z"/>
      <path d="M8 38 Q50 22 94 36 Q74 37 50 39 Q28 40 8 38Z"/>
      <path d="M30 36 Q29 10 52 10 Q71 10 70 36Z"/>
    </g>
    <path d="M33 22 Q16 2 4 7 Q14 12 20 20 Q25 28 34 29Z" fill="#d8433a" stroke="#7a1f1a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30 22 Q20 12 10 9" stroke="#ff8a7a" stroke-width="1.6" fill="none"/>
    <circle cx="56" cy="47" r="2.8" fill="#ffd35a"/>
    <path d="M51 41 l9 -2" stroke="#ffd35a" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>
  </g>`;
}

/**
 * Hugo as he is in Book 3, after the haunted house: the same big hat with
 * the red feather and the purple coat, but a round, kind face with a smile
 * (the bust above is a dark, beaky silhouette). On a warm sunny disc.
 */
function hugoLief() {
  return `<g class="hugo-lief">
    <circle cx="50" cy="52" r="42" fill="#fde7b8" stroke="#e0b060" stroke-width="2.5"/>
    <path d="M12 97 Q13 72 50 68 Q87 72 88 97 Q68 100 50 100 Q32 100 12 97Z" fill="#4a3470" stroke="#21163a" stroke-width="2.5"/>
    <path d="M40 69 L50 83 L60 69Z" fill="#f4ead2" stroke="#21163a" stroke-width="2"/>
    <circle cx="50" cy="90" r="3.6" fill="#f2c23a" stroke="#8c6420" stroke-width="1.5"/>
    <path d="M40 66 h20 v6 h-20z" fill="#e9b894"/>
    <ellipse cx="50" cy="54" rx="17" ry="16" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="2.2"/>
    <ellipse cx="33" cy="55" rx="3.5" ry="5" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="1.8"/><ellipse cx="67" cy="55" rx="3.5" ry="5" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="1.8"/>
    <path d="M41 51 q3.5 -4.5 7 0 M52 51 q3.5 -4.5 7 0" stroke="#2b1b10" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="58" r="3.6" fill="#f08a80" opacity=".6"/><circle cx="60" cy="58" r="3.6" fill="#f08a80" opacity=".6"/>
    <ellipse cx="50" cy="56" rx="3.6" ry="3" fill="#e0987a"/>
    <path d="M42 61 q4 -4 8 -1 q4 -3 8 1 q-4 3 -8 1 q-4 2 -8 -1z" fill="#3a2440"/>
    <path d="M44 63.5 q6 6 12 0" stroke="#7a2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M7 40 Q50 28 93 38 Q74 45 50 45 Q27 45 7 40Z" fill="#2a1d40" stroke="#120a1f" stroke-width="2.2"/>
    <path d="M30 40 Q28 13 52 12 Q72 13 70 39Z" fill="#3a2858" stroke="#120a1f" stroke-width="2.2"/>
    <path d="M31 35 Q50 30 70 34" stroke="#c9a13a" stroke-width="3.5" fill="none"/>
    <path d="M33 23 Q16 3 4 8 Q14 13 20 21 Q25 29 34 30Z" fill="#d8433a" stroke="#7a1f1a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30 23 Q20 13 10 10" stroke="#ff8a7a" stroke-width="1.6" fill="none"/>
  </g>`;
}

/** Hugo's dark goat, flying, with purple-glowing eyes. Facing right. */
function hugosGeit() {
  const c = '#3a2850';
  const leg = (d) => rod(d, c, '#8f6fc0', 6);
  return `<g class="hugos-geit">
    <circle cx="76" cy="38" r="16" fill="#b58cff" opacity=".55" filter="url(#f-soft)"/>
    <path d="M4 70 q10 -4 20 0 M8 80 q10 -4 20 0" stroke="#8f6fc0" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>
    ${leg('M34 62 L16 70')}${leg('M40 64 L26 78')}${leg('M62 62 L80 72')}${leg('M56 64 L72 80')}
    <path d="M24 50 q-10 -6 -8 -14" stroke="#8f6fc0" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M24 50 q-10 -6 -8 -14" stroke="${c}" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    ${merged('<ellipse cx="46" cy="56" rx="26" ry="13" transform="rotate(-6 46 56)"/><path d="M62 52 q6 -14 12 -16 l6 10 q-6 6 -12 14z"/><ellipse cx="77" cy="40" rx="11" ry="9" transform="rotate(15 77 40)"/>', c, '#8f6fc0', 2.2)}
    <path d="M70 32 q-4 -18 -18 -16 q10 4 9 13" stroke="#d9c7a0" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M78 31 q2 -14 -6 -18" stroke="#d9c7a0" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M81 47 l2 10 l4 -9z" fill="${c}" stroke="#8f6fc0" stroke-width="1.5"/>
    <circle cx="80" cy="38" r="6" fill="#c58cff" opacity=".6"/>
    <circle cx="80" cy="38" r="3.2" fill="#f0dcff"/>
    ${sparkle(90, 22, 5, '#d9b8ff')}${sparkle(60, 20, 3.5, '#d9b8ff')}
  </g>`;
}

const DRAW = {
  // --- Book 1 ---
  klok: () => `<g>
    ${rod('M14 12 H86', '#8a5a2a', WOOD_DARK, 7)}
    <rect x="45" y="12" width="10" height="10" fill="${WOOD_DARK}"/>
    <g class="ringing" stroke="#ffb347" stroke-width="4" fill="none" stroke-linecap="round"><path d="M12 38 q-8 14 0 28"/><path d="M88 38 q8 14 0 28"/></g>
    <path d="M50 20 C28 20 26 46 24 64 L14 78 H86 L76 64 C74 46 72 20 50 20Z" fill="url(#g-gold)" stroke="#5a3c22" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M20 71 H80" stroke="#8c6420" stroke-width="3"/>
    <path d="M35 32 q-3 14 -4 28" stroke="#fff6c8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
    <circle cx="50" cy="86" r="8" fill="#8c6420" stroke="#5a3c22" stroke-width="3"/>
  </g>`,

  vogel: () => `<g>
    <path d="M28 60 L6 50 L10 70Z" fill="#2d6fb8" stroke="#1f3f6e" stroke-width="3" stroke-linejoin="round"/>
    <path d="M44 78 l-3 12 M56 78 l3 12 M36 90 h10 M54 90 h10" stroke="#e8842a" stroke-width="3.5" stroke-linecap="round"/>
    ${merged('<ellipse cx="46" cy="60" rx="28" ry="21"/><circle cx="68" cy="38" r="16"/>', '#4a90e2', '#1f3f6e', 1.8)}
    <ellipse cx="54" cy="68" rx="17" ry="11" fill="#f5e0b0"/>
    <path d="M26 54 q18 -10 32 6 q-18 12 -32 -6z" fill="#2d6fb8" stroke="#1f3f6e" stroke-width="2.5"/>
    <path d="M82 34 L97 40 L82 46Z" fill="#f2a23a" stroke="#8a4a12" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="72" cy="35" r="4.2" fill="#1b1330"/><circle cx="73.4" cy="33.6" r="1.4" fill="#fff"/>
    <circle cx="70" cy="44" r="3" fill="#ff9a9a" opacity=".6"/>
  </g>`,

  lamp: () => `<g>
    <circle cx="50" cy="44" r="44" fill="url(#g-lantern)" opacity=".8"/>
    ${shadow(50, 91, 26)}
    <rect x="46" y="48" width="8" height="34" fill="#8a6a3a" stroke="${WOOD_DARK}" stroke-width="2.5"/>
    <path d="M28 90 Q30 80 50 80 Q70 80 72 90Z" fill="#b8862a" stroke="${WOOD_DARK}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="50" cy="50" rx="26" ry="5" fill="#fff3b0"/>
    <path d="M30 14 H70 L80 50 Q50 58 20 50Z" fill="#ffc94a" stroke="#8a5a1a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M36 20 L30 46" stroke="#fff3b0" stroke-width="4" stroke-linecap="round" opacity=".8"/>
    <path d="M24 44 Q50 50 76 44" stroke="#d99a2a" stroke-width="2.5" fill="none"/>
  </g>`,

  vlag: () => `<g>
    ${shadow(22, 92, 14)}
    <path d="M24 14 Q40 6 56 14 T88 14 V58 Q72 50 56 58 T24 58Z" fill="#fff"/>
    <path d="M24 14 Q40 6 56 14 T88 14 V28.7 Q72 20.7 56 28.7 T24 28.7Z" fill="#d8433a"/>
    <path d="M24 43.3 Q40 35.3 56 43.3 T88 43.3 V58 Q72 50 56 58 T24 58Z" fill="#2d5ea3"/>
    <path d="M24 14 Q40 6 56 14 T88 14 V58 Q72 50 56 58 T24 58Z" fill="none" stroke="#2a1d3a" stroke-width="3" stroke-linejoin="round"/>
    <rect x="17" y="10" width="7" height="82" rx="3" fill="#8a6a3a" stroke="${WOOD_DARK}" stroke-width="2.5"/>
    <circle cx="20.5" cy="9" r="5.5" fill="url(#g-gold)" stroke="#5a3c22" stroke-width="2"/>
  </g>`,

  plank: () => `<g transform="rotate(-24 50 50)">
    <rect x="6" y="38" width="88" height="22" rx="3" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3.5"/>
    <path d="M12 45 q20 -4 34 1 t40 -1 M18 53 q14 3 28 0 t28 1" stroke="#9a6232" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="60" cy="49" rx="4.5" ry="2.6" fill="none" stroke="#7a4a22" stroke-width="2"/>
    <circle cx="14" cy="49" r="2.6" fill="#5a5f7a"/><circle cx="86" cy="49" r="2.6" fill="#5a5f7a"/>
  </g>`,

  appel: () => `<g>
    ${shadow(50, 91, 28)}
    <path d="M50 30 C40 22 16 24 16 50 C16 74 32 92 50 87 C68 92 84 74 84 50 C84 24 60 22 50 30Z" fill="#d8433a" stroke="#7a1f1a" stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="33" cy="46" rx="6" ry="11" fill="#ff8a7a" opacity=".75" transform="rotate(15 33 46)"/>
    <path d="M50 32 q0 -12 7 -20" stroke="#6b4a2a" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M55 20 q16 -12 28 -1 q-14 10 -28 1z" fill="#4f9a55" stroke="#2f5a3a" stroke-width="2.5" stroke-linejoin="round"/>
  </g>`,

  bal: () => `<g>
    ${shadow(50, 92, 30)}
    <g transform="rotate(-28 50 52)">
      <circle cx="50" cy="52" r="36" fill="#fff"/>
      <path d="M50 16 A36 36 0 0 0 50 88 A18 36 0 0 1 50 16Z" fill="#e0474c"/>
      <path d="M50 16 A18 36 0 0 0 50 88 L50 16Z" fill="#fff"/>
      <path d="M50 16 L50 88 A18 36 0 0 0 50 16Z" fill="#3f7fd0"/>
      <path d="M50 16 A18 36 0 0 1 50 88 A36 36 0 0 0 50 16Z" fill="#f2c23a"/>
      <path d="M50 16 A18 36 0 0 0 50 88 M50 16 V88 M50 16 A18 36 0 0 1 50 88" stroke="#2a1d3a" stroke-width="2" fill="none"/>
      <circle cx="50" cy="52" r="36" fill="none" stroke="#2a1d3a" stroke-width="3.5"/>
      <circle cx="50" cy="17" r="5" fill="#fff" stroke="#2a1d3a" stroke-width="2"/>
    </g>
    <path d="M28 34 q6 -10 16 -14" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>
  </g>`,

  vis: () => `<g>
    <path d="M26 50 L6 30 L12 50 L6 70Z" fill="#e8742a" stroke="#7a3a12" stroke-width="3" stroke-linejoin="round"/>
    <path d="M46 30 Q54 14 70 24 L64 32Z" fill="#e8742a" stroke="#7a3a12" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M22 50 C34 26 70 22 92 50 C70 78 34 74 22 50Z" fill="#f29a3a" stroke="#7a3a12" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M40 46 q5 5 0 10 M50 42 q5 5 0 10 M50 54 q5 5 0 10 M40 58 q4 4 0 8 M40 36 q4 4 0 8" stroke="#d9702a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M66 36 q-7 14 0 28" stroke="#7a3a12" stroke-width="2.5" fill="none"/>
    <circle cx="77" cy="45" r="5.5" fill="#fff" stroke="#7a3a12" stroke-width="2"/><circle cx="78.5" cy="45" r="2.8" fill="#1b1330"/>
    <path d="M90 54 q-4 2 -7 0" stroke="#7a3a12" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`,

  hamer: () => `<g transform="rotate(-35 50 52)">
    <rect x="44" y="30" width="12" height="66" rx="5" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3"/>
    <path d="M47 40 v48" stroke="#e0a86a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M22 18 H70 V40 H22 Q14 34 12 26 Q16 20 22 18Z" fill="url(#g-silver)" stroke="#3a4a6a" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="70" y="14" width="12" height="30" rx="2" fill="#a8b2c4" stroke="#3a4a6a" stroke-width="3.5"/>
    <path d="M28 23 H62" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  </g>`,

  bloem: () => `<g>
    <path d="M50 52 V94" stroke="#2f6a3a" stroke-width="9" stroke-linecap="round"/>
    <path d="M50 52 V94" stroke="#4f9a55" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 80 Q30 80 24 64 Q44 62 50 80Z M50 74 Q68 72 76 58 Q56 56 50 74Z" fill="#4f9a55" stroke="#2f5a2a" stroke-width="2.5" stroke-linejoin="round"/>
    ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="50" cy="19" rx="10.5" ry="15" transform="rotate(${a} 50 36)" fill="#e0474c" stroke="#8a1f2a" stroke-width="2.5"/>`).join('')}
    <circle cx="50" cy="36" r="10" fill="#ffd35a" stroke="#b8862a" stroke-width="2.5"/>
    <circle cx="47" cy="33" r="2.5" fill="#fff3b0"/>
  </g>`,

  pop: () => `<g>
    ${shadow(50, 94, 22)}
    <path d="M42 82 V93 M58 82 V93" stroke="#f7d1b0" stroke-width="7" stroke-linecap="round"/>
    <path d="M38 94 h8 M54 94 h8" stroke="#3a2a4a" stroke-width="5" stroke-linecap="round"/>
    ${rod('M36 56 L24 72', '#f7d1b0', '#8a5a3a', 6)}${rod('M64 56 L76 72', '#f7d1b0', '#8a5a3a', 6)}
    <path d="M36 50 L26 86 H74 L64 50Z" fill="#e0474c" stroke="#6b1f1a" stroke-width="3" stroke-linejoin="round"/>
    ${[[38, 66], [56, 62], [46, 78], [64, 78], [34, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff"/>`).join('')}
    <path d="M40 50 Q50 58 60 50" fill="#fff" stroke="#6b1f1a" stroke-width="2"/>
    <circle cx="27" cy="34" r="8" fill="#f2a23a" stroke="#8a4a12" stroke-width="2.5"/><circle cx="73" cy="34" r="8" fill="#f2a23a" stroke="#8a4a12" stroke-width="2.5"/>
    <circle cx="50" cy="34" r="16" fill="#f7d1b0" stroke="#8a5a3a" stroke-width="2.5"/>
    <path d="M34 32 Q34 16 50 16 Q66 16 66 32 Q58 24 50 26 Q42 24 34 32Z" fill="#f2a23a" stroke="#8a4a12" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="44" cy="35" r="2.2" fill="#2b2b2b"/><circle cx="56" cy="35" r="2.2" fill="#2b2b2b"/>
    <circle cx="40" cy="41" r="3" fill="#f28a8a" opacity=".6"/><circle cx="60" cy="41" r="3" fill="#f28a8a" opacity=".6"/>
    <path d="M45 42 q5 4 10 0" stroke="#8a4b33" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`,

  schep: () => `<g transform="rotate(28 50 52)">
    <rect x="46" y="12" width="8" height="52" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3"/>
    <rect x="36" y="6" width="28" height="10" rx="5" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3"/>
    <path d="M34 60 H66 V78 Q66 94 50 98 Q34 94 34 78Z" fill="url(#g-silver)" stroke="#3a4a6a" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="44" y="56" width="12" height="10" rx="2" fill="#8793a6" stroke="#3a4a6a" stroke-width="2.5"/>
    <path d="M40 70 V84" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  </g>`,

  modder: () => `<g>
    <ellipse cx="50" cy="66" rx="47" ry="26" fill="#5f9a4f" stroke="#2f5a2a" stroke-width="2.5"/>
    <path d="M10 64 C8 50 30 46 44 49 C58 42 90 46 90 61 C92 78 66 84 50 80 C32 86 12 80 10 64Z" fill="#7a4f2a" stroke="#3f2612" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M20 64 C20 56 36 54 46 56 C58 51 80 53 80 62 C82 72 64 74 50 72 C36 76 20 72 20 64Z" fill="#62401f"/>
    <path d="M28 60 q10 -4 22 -2 M58 60 q8 -2 14 1" stroke="#9fc4e8" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>
    <circle cx="44" cy="67" r="4" fill="#6b4422" stroke="#a07850" stroke-width="1.8"/><circle cx="64" cy="68" r="2.8" fill="#6b4422" stroke="#a07850" stroke-width="1.5"/><circle cx="54" cy="64" r="2" fill="#6b4422" stroke="#a07850" stroke-width="1.2"/>
    ${[[16, 44, 4.5], [26, 36, 3], [80, 40, 4], [88, 50, 3], [18, 84, 3.5], [84, 82, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#7a4f2a" stroke="#3f2612" stroke-width="1.8"/>`).join('')}
  </g>`,

  steen: () => `<g>
    ${shadow(50, 86, 36)}
    <path d="M16 76 C10 54 26 30 52 30 C76 30 92 52 86 74 C82 88 22 90 16 76Z" fill="#9a9aa6" stroke="#44445a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M20 74 C30 82 70 84 84 72 C82 84 24 88 20 74Z" fill="#76768a"/>
    <path d="M32 46 q8 -9 22 -8" stroke="#d6d6e0" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    <circle cx="62" cy="58" r="2.4" fill="#76768a"/><circle cx="40" cy="64" r="2" fill="#76768a"/><circle cx="70" cy="46" r="1.8" fill="#76768a"/>
  </g>`,

  brug: () => `<g>
    <path d="M4 74 h92 v20 h-92z" fill="#4a90e2"/>
    <path d="M6 82 q8 -4 16 0 t16 0 M58 86 q8 -4 16 0 t16 0" stroke="#bfe3ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M4 74 h92 v20 h-92z" fill="none" stroke="#1f3f6e" stroke-width="3"/>
    <path d="M2 74 Q6 66 18 68 L20 94 H2Z M98 74 Q94 66 82 68 L80 94 H98Z" fill="#5f9a4f" stroke="#2f5a2a" stroke-width="2.5" stroke-linejoin="round"/>
    <g stroke="${WOOD_DARK}" stroke-width="3" stroke-linecap="round"><path d="M20 61 V45 M35 54 V38 M50 52 V36 M65 54 V38 M80 61 V45"/></g>
    <path d="M10 51 Q50 15 90 51" stroke="${WOOD_DARK}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M10 51 Q50 15 90 51" stroke="${WOOD}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M8 70 Q50 34 92 70 L92 80 Q50 46 8 80Z" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14 72 Q50 42 86 72" stroke="#9a6232" stroke-width="2" fill="none"/>
  </g>`,

  gras: () => {
    const blades = [
      [10, 4, 30, -4], [18, 2, 18, 6], [28, 6, 10, -2], [38, 4, 22, 8], [46, 6, 6, 2], [56, 4, 16, -6], [64, 6, 8, 4], [74, 4, 20, -2], [84, 4, 26, 6],
    ];
    const blade = ([x, w, top, lean], i) =>
      `<path d="M${x - w} 88 Q${x + lean * 0.5} ${(top + 88) / 2} ${x + lean} ${top} Q${x + w * 0.6} ${(top + 88) / 2} ${x + w + 4} 88Z" fill="${i % 2 ? '#5fae4f' : '#3f8f3f'}" stroke="#1f4a22" stroke-width="2.5" stroke-linejoin="round"/>`;
    return `<g>${shadow(50, 90, 42)}${blades.map(blade).join('')}<path d="M4 88 H96" stroke="#1f4a22" stroke-width="3.5" stroke-linecap="round"/></g>`;
  },

  spiegel: () => `<g transform="rotate(-14 50 50)">
    <rect x="43" y="64" width="14" height="32" rx="6" fill="url(#g-gold)" stroke="#5a3c22" stroke-width="3"/>
    <ellipse cx="50" cy="38" rx="31" ry="34" fill="url(#g-gold)" stroke="#5a3c22" stroke-width="3.5"/>
    <ellipse cx="50" cy="38" rx="23" ry="26" fill="#bfe3ff" stroke="#8c6420" stroke-width="2.5"/>
    <path d="M36 32 L52 16 M36 46 L62 20" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity=".9"/>
    <circle cx="50" cy="5" r="4" fill="#d64545" stroke="#5a3c22" stroke-width="2"/>
  </g>`,

  raam: () => `<g>
    <rect x="18" y="14" width="64" height="66" fill="#8fd0ff" stroke="${WOOD_DARK}" stroke-width="3.5"/>
    <path d="M24 70 Q34 58 46 66 Q58 54 76 66 V74 H24Z" fill="#7cc06a"/>
    <path d="M56 34 a6 6 0 0 1 11 -2 a5 5 0 0 1 5 7 h-18 a4 4 0 0 1 2 -5z" fill="#fff"/>
    <rect x="22" y="18" width="56" height="58" fill="none" stroke="#f4ede0" stroke-width="5"/>
    <path d="M50 18 V76 M22 47 H78" stroke="#f4ede0" stroke-width="5"/>
    <path d="M22 18 h56 v58 h-56z M50 18 V76 M22 47 H78" stroke="${WOOD_DARK}" stroke-width="1.2" fill="none" opacity=".5"/>
    <path d="M28 26 l8 -6 M28 34 l14 -11" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>
    <path d="M10 8 H34 Q26 40 36 84 H10Z" fill="#d8433a" stroke="#6b1f1a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M90 8 H66 Q74 40 64 84 H90Z" fill="#d8433a" stroke="#6b1f1a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M18 14 q2 30 6 66 M82 14 q-2 30 -6 66" stroke="#a8302a" stroke-width="2" fill="none"/>
    <rect x="8" y="80" width="84" height="9" rx="3" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3"/>
    ${rod('M6 8 H94', '#8a5a2a', WOOD_DARK, 4)}
  </g>`,

  deur: () => `<g>
    <path d="M20 94 V38 A30 30 0 0 1 80 38 V94Z" fill="#6b4a2a" stroke="${WOOD_DARK}" stroke-width="3"/>
    <path d="M26 92 V40 A24 24 0 0 1 74 40 V92Z" fill="#b0703a" stroke="${WOOD_DARK}" stroke-width="3"/>
    <path d="M38 20 V92 M50 16 V92 M62 20 V92" stroke="#7a4a22" stroke-width="2.5"/>
    <rect x="26" y="40" width="48" height="6" fill="#3a3a4a"/><rect x="26" y="74" width="48" height="6" fill="#3a3a4a"/>
    <circle cx="66" cy="62" r="4.5" fill="url(#g-gold)" stroke="#5a3c22" stroke-width="2"/>
    <rect x="14" y="90" width="72" height="7" rx="2" fill="#9a9aa6" stroke="#44445a" stroke-width="2.5"/>
  </g>`,

  bord: () => `<g>
    ${shadow(50, 80, 40)}
    <ellipse cx="50" cy="54" rx="44" ry="30" fill="#fbfbff" stroke="#4a5a7a" stroke-width="3.5"/>
    <ellipse cx="50" cy="54" rx="36" ry="24" fill="none" stroke="#3f7fd0" stroke-width="4"/>
    <ellipse cx="50" cy="55" rx="27" ry="17" fill="#eef2f8" stroke="#c8d0e0" stroke-width="2"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${(50 + Math.cos(r) * 40).toFixed(1)}" cy="${(54 + Math.sin(r) * 27).toFixed(1)}" r="2" fill="#3f7fd0"/>`;
    }).join('')}
    <path d="M24 44 q10 -10 26 -12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>`,

  witteDame: () => `<g>
    ${dame({ scare: 'spannend', mood: 'happy' })}
    <path d="M50 10 C31 10 27 32 29 52 C31 70 23 82 16 92 Q26 86 33 93 Q41 85 50 93 Q59 85 67 93 Q74 86 84 92 C77 82 69 70 71 52 C73 32 69 10 50 10Z" fill="none" stroke="#7d97bf" stroke-width="2.5" stroke-linejoin="round"/>
  </g>`,

  hugo,

  wolk: () => `<g>
    ${merged('<circle cx="30" cy="52" r="17"/><circle cx="50" cy="40" r="22"/><circle cx="72" cy="50" r="18"/><rect x="22" y="50" width="58" height="20" rx="10"/>', '#ffffff', '#7d8fb8', 3)}
    <path d="M38 36 q6 -10 16 -10" stroke="#e1ebfa" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${[[34, 80], [52, 84], [70, 80]].map(([x, y]) => `<path d="M${x} ${y - 8} q-5 7 0 11 q5 -4 0 -11z" fill="#4a90e2" stroke="#1f3f6e" stroke-width="1.6"/>`).join('')}
  </g>`,

  schaap: () => `<g>
    ${shadow(48, 92, 32)}
    <g fill="#2b2733"><rect x="28" y="66" width="7" height="24" rx="3"/><rect x="40" y="68" width="7" height="22" rx="3"/><rect x="54" y="68" width="7" height="22" rx="3"/><rect x="64" y="66" width="7" height="24" rx="3"/></g>
    ${merged('<circle cx="28" cy="54" r="14"/><circle cx="42" cy="44" r="15"/><circle cx="58" cy="44" r="14"/><circle cx="68" cy="58" r="13"/><circle cx="50" cy="64" r="15"/><circle cx="32" cy="66" r="12"/>', '#f7f3ea', '#8a8070', 2.5)}
    <path d="M36 50 q4 -4 8 0 M50 56 q4 -4 8 0 M30 62 q4 -4 8 0" stroke="#d6cfc0" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="68" cy="34" rx="8" ry="4.5" transform="rotate(-25 68 34)" fill="#2b2733"/>
    <ellipse cx="92" cy="36" rx="8" ry="4.5" transform="rotate(25 92 36)" fill="#2b2733"/>
    <ellipse cx="80" cy="44" rx="11" ry="14" fill="#2b2733" stroke="#8a8070" stroke-width="2"/>
    <circle cx="80" cy="30" r="8" fill="#f7f3ea" stroke="#8a8070" stroke-width="2"/>
    <circle cx="76" cy="42" r="2.6" fill="#fff"/><circle cx="84" cy="42" r="2.6" fill="#fff"/>
    <circle cx="76.5" cy="42.5" r="1.4" fill="#1b1330"/><circle cx="84.5" cy="42.5" r="1.4" fill="#1b1330"/>
  </g>`,

  // --- Book 2 ---
  kleed: () => `<g>
    <g stroke="#e8d8b0" stroke-width="3" stroke-linecap="round">${[30, 37, 44, 51, 58, 65, 72].map((y) => `<path d="M12 ${y} H4 M88 ${y} H96"/>`).join('')}</g>
    <rect x="12" y="24" width="76" height="54" rx="3" fill="#b8433a" stroke="#5a1f1a" stroke-width="3.5"/>
    <rect x="18" y="30" width="64" height="42" rx="2" fill="none" stroke="#f2c23a" stroke-width="3"/>
    <path d="M50 36 L66 51 L50 66 L34 51Z" fill="#3f7fd0" stroke="#f2c23a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M50 44 L57 51 L50 58 L43 51Z" fill="#f2c23a"/>
    <path d="M24 36 l5 5 -5 5 M24 56 l5 5 -5 5 M76 36 l-5 5 5 5 M76 56 l-5 5 5 5" stroke="#f2c23a" stroke-width="2.2" fill="none"/>
  </g>`,

  trom: () => `<g>
    ${shadow(50, 92, 32)}
    ${rod('M22 10 L46 34', '#e0a86a', WOOD_DARK, 4)}${rod('M80 12 L56 36', '#e0a86a', WOOD_DARK, 4)}
    <circle cx="22" cy="10" r="5" fill="#f5ecd8" stroke="${WOOD_DARK}" stroke-width="2"/><circle cx="80" cy="12" r="5" fill="#f5ecd8" stroke="${WOOD_DARK}" stroke-width="2"/>
    <path d="M16 44 V80 A34 10 0 0 0 84 80 V44Z" fill="#d8433a" stroke="#5a1f1a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M17 48 L29 78 L40 50 L51 80 L62 50 L73 78 L83 48" stroke="#f5ecd8" stroke-width="2.5" fill="none" stroke-linejoin="round"/>
    <path d="M16 80 A34 10 0 0 0 84 80" stroke="#f2c23a" stroke-width="5" fill="none"/>
    <ellipse cx="50" cy="44" rx="34" ry="10" fill="#f5ecd8" stroke="#f2c23a" stroke-width="5"/>
    <ellipse cx="50" cy="44" rx="34" ry="10" fill="none" stroke="#5a1f1a" stroke-width="1.5"/>
  </g>`,

  bel: () => `<g>
    <g class="ringing" stroke="#ffb347" stroke-width="4" fill="none" stroke-linecap="round"><path d="M14 50 q-6 10 0 20"/><path d="M84 30 q8 10 4 22"/></g>
    <g transform="rotate(-18 50 56)">
      <rect x="43" y="6" width="14" height="28" rx="6" fill="#b0503a" stroke="${WOOD_DARK}" stroke-width="3"/>
      <rect x="40" y="31" width="20" height="7" rx="3" fill="#7a3a22" stroke="${WOOD_DARK}" stroke-width="2.5"/>
      <path d="M50 37 C35 37 33 58 31 72 L24 82 H76 L69 72 C67 58 65 37 50 37Z" fill="url(#g-silver)" stroke="#3a4a6a" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M39 46 q-2 10 -3 20" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="88" r="6" fill="#5a5f7a" stroke="#3a4a6a" stroke-width="2"/>
    </g>
  </g>`,

  emmer: () => `<g>
    ${shadow(50, 92, 28)}
    <path d="M20 36 Q50 0 80 36" stroke="#2a3a5a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M20 36 Q50 0 80 36" stroke="#a8b2c4" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M18 36 H82 L72 90 H28Z" fill="#3f7fd0" stroke="#1f3f6e" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M22 54 H78 M25 72 H75" stroke="#2d5ea3" stroke-width="4"/>
    <path d="M30 44 L34 84" stroke="#8fc0f0" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="50" cy="36" rx="32" ry="8" fill="#2d5ea3" stroke="#1f3f6e" stroke-width="3"/>
    <ellipse cx="50" cy="37" rx="26" ry="5" fill="#8fd0ff"/>
    <circle cx="20" cy="36" r="3.5" fill="#a8b2c4" stroke="#2a3a5a" stroke-width="2"/><circle cx="80" cy="36" r="3.5" fill="#a8b2c4" stroke="#2a3a5a" stroke-width="2"/>
  </g>`,

  sleutel: () => `<g transform="rotate(-32 50 50)">
    <path d="M8 50 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0Z M17 50 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0Z" fill="url(#g-gold)" fill-rule="evenodd" stroke="#6b4a1a" stroke-width="3"/>
    <path d="M43 45 H92 V55 H86 V70 H78 V62 H72 V72 H64 V55 H43Z" fill="url(#g-gold)" stroke="#6b4a1a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M48 48 H88" stroke="#fff6c8" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 42 q4 -8 12 -9" stroke="#fff6c8" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>`,

  lepel: () => `<g transform="rotate(24 50 50)">
    ${merged('<ellipse cx="50" cy="28" rx="16" ry="22"/><path d="M46 46 L44 92 Q50 98 56 92 L54 46Z"/>', 'url(#g-silver)', '#3a4a6a', 1.8)}
    <ellipse cx="50" cy="29" rx="10" ry="15" fill="#b8c2d2"/>
    <ellipse cx="46" cy="25" rx="4" ry="9" fill="#fff" opacity=".85"/>
    <path d="M49 54 L48 88" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  </g>`,

  vork: () => `<g transform="rotate(24 50 50)">
    ${merged('<rect x="34" y="6" width="6" height="30" rx="3"/><rect x="43" y="4" width="6" height="32" rx="3"/><rect x="52" y="4" width="6" height="32" rx="3"/><rect x="61" y="6" width="6" height="30" rx="3"/><path d="M34 30 H67 Q67 46 55 50 H46 Q34 46 34 30Z"/><path d="M46 46 L44 92 Q50 98 56 92 L54 46Z"/>', 'url(#g-silver)', '#3a4a6a', 1.8)}
    <path d="M49 54 L48 88" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M37 10 V30" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  </g>`,

  munt: () => `<g>
    <circle cx="50" cy="56" r="36" fill="#a8761f" stroke="#5a3c12" stroke-width="3"/>
    <circle cx="50" cy="50" r="36" fill="url(#g-gold)" stroke="#5a3c12" stroke-width="3"/>
    <circle cx="50" cy="50" r="28" fill="none" stroke="#b8862a" stroke-width="2.5" stroke-dasharray="3 3"/>
    <g transform="translate(25 25) scale(.5)"><path d="${STAR}" fill="#f2c23a" stroke="#8c6420" stroke-width="5" stroke-linejoin="round"/></g>
    <path d="M24 38 q6 -14 20 -18" stroke="#fffbe0" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    ${sparkle(82, 18, 7)}
  </g>`,

  boek: () => `<g>
    ${shadow(50, 88, 40)}
    <path d="M6 28 Q28 20 50 28 Q72 20 94 28 V84 Q72 76 50 84 Q28 76 6 84Z" fill="#b8433a" stroke="#5a1f1a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M11 24 Q30 16 50 26 V78 Q30 68 11 76Z" fill="#fbf6e6" stroke="#8a7a5a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M89 24 Q70 16 50 26 V78 Q70 68 89 76Z" fill="#fbf6e6" stroke="#8a7a5a" stroke-width="2.5" stroke-linejoin="round"/>
    <g stroke="#9a9080" stroke-width="2.4" stroke-linecap="round" fill="none">
      ${[34, 42, 50, 58].map((y) => `<path d="M17 ${y} Q30 ${y - 5} 44 ${y + 2}"/><path d="M56 ${y + 2} Q70 ${y - 5} 83 ${y}"/>`).join('')}
    </g>
    <path d="M50 26 V82" stroke="#5a1f1a" stroke-width="2.5"/>
    <path d="M60 66 L64 90 L68 84 L72 90 L72 66" fill="#f2c23a" stroke="#8c6420" stroke-width="2" stroke-linejoin="round"/>
  </g>`,

  boom: () => `<g>
    ${shadow(50, 92, 30)}
    <path d="M43 92 L45 56 L38 46 L44 44 L50 52 L58 42 L62 46 L55 56 L57 92Z" fill="#8a5a2a" stroke="${WOOD_DARK}" stroke-width="3" stroke-linejoin="round"/>
    ${merged('<circle cx="50" cy="32" r="22"/><circle cx="28" cy="44" r="17"/><circle cx="72" cy="44" r="17"/><circle cx="38" cy="56" r="13"/><circle cx="62" cy="56" r="13"/>', '#4f9a55', '#23502e', 2.5)}
    <circle cx="42" cy="26" r="8" fill="#6fbf73"/><circle cx="24" cy="40" r="6" fill="#6fbf73"/><circle cx="66" cy="36" r="6" fill="#6fbf73"/>
    <path d="M44 62 Q50 68 56 62" stroke="#23502e" stroke-width="2.5" fill="none"/>
  </g>`,

  stoel: () => `<g>
    ${shadow(50, 92, 30)}
    <rect x="31" y="66" width="6" height="18" fill="#9a6232" stroke="${WOOD_DARK}" stroke-width="2.5"/>
    <rect x="63" y="66" width="6" height="18" fill="#9a6232" stroke="${WOOD_DARK}" stroke-width="2.5"/>
    <rect x="28" y="10" width="44" height="46" rx="5" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="3"/>
    <rect x="35" y="18" width="30" height="30" rx="3" fill="#a86a32" stroke="${WOOD_DARK}" stroke-width="2"/>
    <path d="M44 18 V48 M56 18 V48" stroke="${WOOD_DARK}" stroke-width="2"/>
    <path d="M24 56 H76 L84 68 H16Z" fill="#d89a5a" stroke="${WOOD_DARK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="16" y="68" width="68" height="6" fill="#a86a32" stroke="${WOOD_DARK}" stroke-width="2.5"/>
    <rect x="17" y="74" width="7" height="20" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="2.5"/>
    <rect x="76" y="74" width="7" height="20" fill="${WOOD}" stroke="${WOOD_DARK}" stroke-width="2.5"/>
  </g>`,

  hond: () => `<g>
    ${shadow(50, 93, 28)}
    <path d="M70 82 q20 -2 18 -22" stroke="#7a4a1a" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M70 82 q20 -2 18 -22" stroke="#c98a4a" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    ${merged('<ellipse cx="50" cy="72" rx="22" ry="20"/><circle cx="50" cy="40" r="20"/>', '#c98a4a', '#6b3f1a', 1.8)}
    <ellipse cx="38" cy="90" rx="8" ry="5" fill="#e8c08a" stroke="#6b3f1a" stroke-width="2.5"/><ellipse cx="62" cy="90" rx="8" ry="5" fill="#e8c08a" stroke="#6b3f1a" stroke-width="2.5"/>
    <ellipse cx="50" cy="74" rx="12" ry="14" fill="#e8c08a"/>
    <path d="M32 26 Q20 26 22 52 Q30 56 36 40Z" fill="#7a4a1a" stroke="#4a2a0a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M68 26 Q80 26 78 52 Q70 56 64 40Z" fill="#7a4a1a" stroke="#4a2a0a" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="50" rx="11" ry="8" fill="#f0d0a0"/>
    <circle cx="42" cy="36" r="3" fill="#1b1330"/><circle cx="58" cy="36" r="3" fill="#1b1330"/>
    <circle cx="43" cy="35" r="1" fill="#fff"/><circle cx="59" cy="35" r="1" fill="#fff"/>
    <ellipse cx="50" cy="45" rx="5" ry="3.5" fill="#1b1330"/>
    <path d="M44 52 q6 4 12 0" stroke="#4a2a0a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M47 53 q3 9 6 0z" fill="#f28a9a" stroke="#a04a5a" stroke-width="1.5"/>
    <path d="M34 58 Q50 64 66 58" stroke="#3f7fd0" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="50" cy="64" r="3.5" fill="url(#g-gold)" stroke="#8c6420" stroke-width="1.5"/>
  </g>`,

  barend: () => `${shadow(52, 92, 30)}${at(-12, -10, 1.2, barendArt())}`,

  koe: () => `<g>
    ${shadow(48, 92, 34)}
    <g fill="#fff" stroke="#3a3a3a" stroke-width="2.5"><rect x="20" y="62" width="9" height="26" rx="3"/><rect x="32" y="64" width="9" height="24" rx="3"/><rect x="54" y="64" width="9" height="24" rx="3"/><rect x="64" y="62" width="9" height="26" rx="3"/></g>
    <g fill="#2b2b2b"><rect x="20" y="84" width="9" height="5"/><rect x="32" y="84" width="9" height="5"/><rect x="54" y="84" width="9" height="5"/><rect x="64" y="84" width="9" height="5"/></g>
    <path d="M14 50 q-8 6 -6 22" stroke="#3a3a3a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="8" cy="73" r="3.5" fill="#2b2b2b"/>
    <rect x="12" y="38" width="66" height="34" rx="15" fill="#fff" stroke="#3a3a3a" stroke-width="3"/>
    <path d="M22 42 q10 -2 14 6 q-2 10 -12 8 q-6 -6 -2 -14z M50 52 q12 -4 16 6 q-4 10 -14 6 q-6 -6 -2 -12z M40 66 q6 -4 10 0 q-2 4 -10 4z" fill="#2b2b2b"/>
    <ellipse cx="44" cy="74" rx="7" ry="4" fill="#f4a8b0" stroke="#a04a5a" stroke-width="1.5"/>
    <path d="M70 22 q-4 -8 2 -12 M90 22 q4 -8 -2 -12" stroke="#d9c7a0" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="66" cy="28" rx="7" ry="4" fill="#fff" stroke="#3a3a3a" stroke-width="2" transform="rotate(-20 66 28)"/>
    <ellipse cx="94" cy="28" rx="7" ry="4" fill="#fff" stroke="#3a3a3a" stroke-width="2" transform="rotate(20 94 28)"/>
    <rect x="68" y="18" width="24" height="34" rx="11" fill="#fff" stroke="#3a3a3a" stroke-width="3"/>
    <path d="M70 26 q6 -6 12 -6 q-2 8 -10 12z" fill="#2b2b2b"/>
    <ellipse cx="80" cy="50" rx="14" ry="9" fill="#f4b8b0" stroke="#a04a5a" stroke-width="2.5"/>
    <ellipse cx="75" cy="50" rx="2" ry="3" fill="#a04a5a"/><ellipse cx="85" cy="50" rx="2" ry="3" fill="#a04a5a"/>
    <circle cx="74" cy="34" r="2.6" fill="#1b1330"/><circle cx="86" cy="34" r="2.6" fill="#1b1330"/>
  </g>`,

  kat: () => `<g>
    ${shadow(50, 93, 26)}
    <path d="M66 86 q24 2 22 -22 q-1 -8 -8 -10" stroke="#7a3a12" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M66 86 q24 2 22 -22 q-1 -8 -8 -10" stroke="#f29a3a" stroke-width="5.5" stroke-linecap="round" fill="none"/>
    ${merged('<path d="M30 90 Q26 56 50 52 Q74 56 70 90Z"/><ellipse cx="50" cy="40" rx="21" ry="18"/><path d="M32 34 L28 10 L46 24Z"/><path d="M68 34 L72 10 L54 24Z"/>', '#f29a3a', '#7a3a12', 1.8)}
    <path d="M33 28 L31 16 L41 24Z M67 28 L69 16 L59 24Z" fill="#f4a8b0"/>
    <path d="M44 24 l2 6 M50 22 v7 M56 24 l-2 6 M34 66 h8 M58 66 h8 M36 76 h7 M57 76 h7" stroke="#d9702a" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="76" rx="9" ry="12" fill="#fbe0b8"/>
    <ellipse cx="42" cy="38" rx="4.5" ry="5" fill="#8fd05a" stroke="#2a4a12" stroke-width="1.5"/><ellipse cx="58" cy="38" rx="4.5" ry="5" fill="#8fd05a" stroke="#2a4a12" stroke-width="1.5"/>
    <ellipse cx="42" cy="38" rx="1.4" ry="4" fill="#1b1330"/><ellipse cx="58" cy="38" rx="1.4" ry="4" fill="#1b1330"/>
    <path d="M47 45 h6 l-3 3z" fill="#e0607a"/>
    <path d="M50 48 q-3 4 -6 2 M50 48 q3 4 6 2" stroke="#7a3a12" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M38 46 L22 44 M38 49 L22 52 M62 46 L78 44 M62 49 L78 52" stroke="#5a2a0a" stroke-width="1.4" stroke-linecap="round"/>
  </g>`,

  bril: () => `<g>
    <path d="M14 44 L4 34 M86 44 L96 34" stroke="#2a1d3a" stroke-width="5" stroke-linecap="round"/>
    <path d="M44 48 Q50 40 56 48" stroke="#2a1d3a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="29" cy="54" r="17" fill="#cfe8ff" fill-opacity=".55" stroke="#2a1d3a" stroke-width="6"/>
    <circle cx="71" cy="54" r="17" fill="#cfe8ff" fill-opacity=".55" stroke="#2a1d3a" stroke-width="6"/>
    <circle cx="29" cy="54" r="17" fill="none" stroke="#8a5a2a" stroke-width="2.5"/>
    <circle cx="71" cy="54" r="17" fill="none" stroke="#8a5a2a" stroke-width="2.5"/>
    <path d="M20 50 l7 -8 M62 50 l7 -8" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  </g>`,

  glas: () => `<g>
    ${shadow(50, 91, 22)}
    <path d="M26 14 H74 L66 88 H34Z" fill="#e6f4ff" fill-opacity=".55"/>
    <path d="M29.5 40 H70.5 L66.5 86 H33.5Z" fill="#6fb6ff" fill-opacity=".85"/>
    <ellipse cx="50" cy="40" rx="20.5" ry="4" fill="#bfe3ff" stroke="#4a7ab0" stroke-width="1.5"/>
    <path d="M26 14 H74 L66 88 H34Z" fill="none" stroke="#3f6a9a" stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="14" rx="24" ry="4" fill="none" stroke="#3f6a9a" stroke-width="2.5"/>
    <path d="M34 20 L40 82" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/>
    <circle cx="58" cy="62" r="2.4" fill="#fff" opacity=".7"/><circle cx="52" cy="72" r="1.8" fill="#fff" opacity=".7"/>
  </g>`,

  // --- Book 3 ---
  veer: () => feather({ vane: '#eef1f7', barb: '#aab4c8', edge: '#6b7a9a' }),

  veerZwartWit: () =>
    // A magpie's feather: clearly half black, half white, with a dark outline (Hugo's is red).
    feather({
      vane: '#fbfbf6',
      barb: '#9aa0b4',
      edge: '#14121e',
      shaft: '#6a6878',
      tip: '<path d="M50 8 C32 22 32 58 46 82 L50 80 Z" fill="#15151f" stroke="#14121e" stroke-width="3" stroke-linejoin="round"/><path d="M42 26 Q38 44 42 62" stroke="#3f8f9a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>',
    }),

  veerRood: () =>
    feather({
      vane: '#d8433a',
      barb: '#ff9a8a',
      edge: '#6b1f1a',
      shaft: '#f5ecd8',
      rot: -30,
      tip: '<path d="M50 8 C62 16 66 30 64 40 Q60 26 50 18Z" fill="#ff7a6a"/>',
    }),

  blad: () => `<g transform="rotate(-35 50 50)">
    <path d="M50 8 C82 24 82 66 50 84 C18 66 18 24 50 8Z" fill="#5fae4f" stroke="#2f5a2a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M50 24 C40 36 36 52 40 66" stroke="#8fd07a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M50 12 V96" stroke="#2f5a2a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M50 30 L64 22 M50 30 L36 22 M50 46 L68 36 M50 46 L32 36 M50 62 L66 52 M50 62 L34 52" stroke="#2f5a2a" stroke-width="2.5" stroke-linecap="round"/>
  </g>`,

  ei: () => `<g>
    ${shadow(50, 91, 24)}
    <path d="M50 10 C70 10 82 44 82 62 C82 80 68 90 50 90 C32 90 18 80 18 62 C18 44 30 10 50 10Z" fill="#fffdf6" stroke="#9c8460" stroke-width="3.5"/>
    <path d="M24 66 C24 80 38 86 50 86 C66 86 78 78 78 64 C72 76 60 80 50 80 C38 80 28 74 24 66Z" fill="#efe4cc"/>
    <ellipse cx="38" cy="36" rx="6" ry="11" fill="#fff" transform="rotate(20 38 36)"/>
    <circle cx="60" cy="40" r="2" fill="#d9c6a0"/><circle cx="66" cy="56" r="1.6" fill="#d9c6a0"/><circle cx="52" cy="28" r="1.4" fill="#d9c6a0"/>
  </g>`,

  ekster: () => `<g>
    ${rod('M4 82 H96', '#8a5a2a', WOOD_DARK, 5)}
    <path d="M36 62 L4 70 L8 78 L40 70Z" fill="#1b2030" stroke="${RIM}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M30 66 L10 71" stroke="#3f8f9a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M50 74 l-3 8 M58 74 l2 8" stroke="#2b2b3a" stroke-width="3.5" stroke-linecap="round"/>
    ${merged('<ellipse cx="52" cy="58" rx="22" ry="16"/><circle cx="72" cy="36" r="12"/><path d="M62 42 L74 46 L66 56Z"/>', '#1b2030', RIM, 1.4)}
    <path d="M40 60 Q52 76 70 58 Q66 72 52 74 Q40 72 40 60Z" fill="#fff"/>
    <path d="M36 52 Q48 44 60 52 Q50 58 38 58Z" fill="#fff" stroke="#c8d0e0" stroke-width="1"/>
    <path d="M82 34 L95 38 L82 42Z" fill="#2b2b3a" stroke="${RIM}" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="75" cy="34" r="3.4" fill="#fff"/><circle cx="76" cy="34" r="2" fill="#1b1330"/>
  </g>`,

  uil: () => `<g>
    ${rod('M8 88 H92', '#8a5a2a', WOOD_DARK, 5)}
    <path d="M32 26 L28 8 L42 20Z M68 26 L72 8 L58 20Z" fill="#8a5a2a" stroke="#3f2612" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="56" rx="27" ry="32" fill="#a0703a" stroke="#3f2612" stroke-width="3.5"/>
    <path d="M24 52 Q14 70 30 84 Q32 66 30 52Z M76 52 Q86 70 70 84 Q68 66 70 52Z" fill="#7a5028" stroke="#3f2612" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="66" rx="15" ry="18" fill="#e8cfa0"/>
    <path d="M44 60 l3 3 3 -3 3 3 3 -3 M42 70 l3 3 3 -3 3 3 3 -3 3 3 M46 80 l2 2 2 -2 2 2 2 -2" stroke="#a0703a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="39" cy="40" r="12" fill="#f5e6c8" stroke="#7a5028" stroke-width="2"/><circle cx="61" cy="40" r="12" fill="#f5e6c8" stroke="#7a5028" stroke-width="2"/>
    <circle cx="39" cy="40" r="7.5" fill="#f2b33a"/><circle cx="61" cy="40" r="7.5" fill="#f2b33a"/>
    <circle cx="39" cy="40" r="4.2" fill="#1b1330"/><circle cx="61" cy="40" r="4.2" fill="#1b1330"/>
    <circle cx="40.5" cy="38.5" r="1.5" fill="#fff"/><circle cx="62.5" cy="38.5" r="1.5" fill="#fff"/>
    <path d="M46 48 L54 48 L50 56Z" fill="#e8842a" stroke="#8a4a12" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M40 88 l-3 -5 M44 88 v-6 M56 88 v-6 M60 88 l3 -5" stroke="#e8842a" stroke-width="3" stroke-linecap="round"/>
  </g>`,

  hugosGeit,
  hugoLief,

  knor: () => `<g>
    <path d="M12 98 Q14 68 50 64 Q86 68 88 98Z" fill="#5a4a7a" stroke="#241a38" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 66 L50 82 L60 66" fill="#f2f0e8" stroke="#241a38" stroke-width="2"/>
    <path d="M42 70 h16 M45 75 h10" stroke="#c84a4a" stroke-width="2.5"/>
    <circle cx="30" cy="86" r="3" fill="#c9a466"/><circle cx="70" cy="86" r="3" fill="#c9a466"/>
    <ellipse cx="50" cy="46" rx="23" ry="21" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="2.5"/>
    <ellipse cx="27" cy="48" rx="4" ry="6" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="2"/><ellipse cx="73" cy="48" rx="4" ry="6" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="2"/>
    <g fill="#8a6a5a" opacity=".55">${[[38, 60], [44, 63], [56, 63], [62, 60], [50, 65], [34, 56], [66, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2"/>`).join('')}</g>
    <rect x="26" y="34" width="48" height="12" rx="6" fill="#1b1330"/>
    <ellipse cx="40" cy="40" rx="5" ry="4" fill="#fff"/><ellipse cx="60" cy="40" rx="5" ry="4" fill="#fff"/>
    <circle cx="41" cy="41" r="2.2" fill="#1b1330"/><circle cx="59" cy="41" r="2.2" fill="#1b1330"/>
    <circle cx="50" cy="51" r="6" fill="#e07a6a" stroke="#8a3a2a" stroke-width="1.6"/>
    <path d="M42 58 q8 6 16 -1" stroke="#6b2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M20 34 Q50 24 80 34 Q78 38 50 36 Q22 38 20 34Z" fill="#2e2440" stroke="#120a1f" stroke-width="2"/>
    <path d="M30 32 Q30 12 50 12 Q70 12 70 32Z" fill="#3a2e52" stroke="#120a1f" stroke-width="2.5"/>
    <path d="M31 30 Q50 34 69 30" stroke="#8f6fc0" stroke-width="3" fill="none"/>
    <g fill="none" stroke="#d9c7a0" stroke-width="4" stroke-linecap="round"><path d="M36 16 q-10 -4 -10 -14 q2 6 6 6"/><path d="M64 16 q10 -4 10 -14 q-2 6 -6 6"/></g>
  </g>`,

  koning: () => piece('K'),
  paard: () => piece('N'),
  toren: () => piece('R'),
  pion: () => piece('P'),
  loper: () => piece('B'),

  huis: () => `<g>${shadow(50, 92, 38)}${house('#9a4747', true)}</g>`,

  berg: () => `<g>
    <path d="M66 26 L96 88 H36Z" fill="#6d7fa8" stroke="#2a3a5a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M66 26 L75 45 L69 41 L63 47 L58 42Z" fill="#fff" stroke="#2a3a5a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M38 10 L80 88 H4Z" fill="#8a9ac8" stroke="#2a3a5a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M38 10 L52 36 L45 32 L38 40 L31 32 L24 36Z" fill="#fff" stroke="#2a3a5a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M38 40 L30 88" stroke="#6d7fa8" stroke-width="4" opacity=".7"/>
    <path d="M2 88 H98" stroke="#2f5a2a" stroke-width="5" stroke-linecap="round"/>
  </g>`,

  nest: () => `<g>
    <ellipse cx="50" cy="52" rx="38" ry="10" fill="#5a3a1a"/>
    <ellipse cx="38" cy="48" rx="9" ry="11" fill="#bfe3ef" stroke="#4a7a8a" stroke-width="2.5"/>
    <ellipse cx="62" cy="48" rx="9" ry="11" fill="#bfe3ef" stroke="#4a7a8a" stroke-width="2.5"/>
    <ellipse cx="50" cy="44" rx="9" ry="11" fill="#d6f0f8" stroke="#4a7a8a" stroke-width="2.5"/>
    <circle cx="47" cy="40" r="2.2" fill="#fff"/>
    <path d="M10 50 Q50 66 90 50 Q88 84 50 86 Q12 84 10 50Z" fill="#9a6a32" stroke="#4a2f1a" stroke-width="3.5" stroke-linejoin="round"/>
    <g stroke="#5a3a1a" stroke-width="2.4" stroke-linecap="round" fill="none">
      <path d="M16 60 Q40 72 70 62 M20 70 Q50 80 82 66 M28 78 Q52 86 74 76 M22 58 L40 78 M44 64 L60 82 M62 60 L78 76 M80 58 L66 76 M56 62 L38 80"/>
    </g>
    <g stroke="#c9945a" stroke-width="2" stroke-linecap="round"><path d="M12 52 L4 46 M88 52 L96 44 M30 58 L20 52 M72 58 L84 54"/></g>
  </g>`,

  mand: () => `<g>
    ${shadow(50, 91, 34)}
    <path d="M22 50 Q50 -2 78 50" stroke="#6b4a1a" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M22 50 Q50 -2 78 50" stroke="#d9a35a" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M14 48 H86 L76 88 H24Z" fill="#d9a35a" stroke="#6b4a1a" stroke-width="3.5" stroke-linejoin="round"/>
    <g stroke="#a8742a" stroke-width="2.5"><path d="M17 60 H83 M20 72 H80 M22 82 H78"/></g>
    <g stroke="#a8742a" stroke-width="2.5">${[28, 38, 50, 62, 72].map((x) => `<path d="M${x} 52 L${50 + (x - 50) * 0.82} 86"/>`).join('')}</g>
    <rect x="10" y="44" width="80" height="9" rx="4.5" fill="#c98a4a" stroke="#6b4a1a" stroke-width="3"/>
    <path d="M16 48 h68" stroke="#e8c08a" stroke-width="2" stroke-dasharray="5 4"/>
  </g>`,

  hoed: () => `<g>
    ${shadow(50, 86, 40)}
    <ellipse cx="50" cy="72" rx="44" ry="13" fill="#2d5ea3" stroke="#14284a" stroke-width="3.5"/>
    <path d="M26 72 V38 Q26 22 50 22 Q74 22 74 38 V72 Q50 80 26 72Z" fill="#3f7fd0" stroke="#14284a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M38 26 Q50 34 62 26" stroke="#14284a" stroke-width="2.5" fill="none"/>
    <path d="M26 60 Q50 68 74 60 V70 Q50 78 26 70Z" fill="#f2c23a" stroke="#14284a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M32 34 V56" stroke="#8fc0f0" stroke-width="4" stroke-linecap="round"/>
  </g>`,

  knoop: () => `<g>
    <circle cx="50" cy="52" r="38" fill="#d8433a" stroke="#6b1f1a" stroke-width="3.5"/>
    <circle cx="50" cy="52" r="28" fill="#c0392b" stroke="#ef7a6a" stroke-width="2.5"/>
    <circle cx="50" cy="52" r="34" fill="none" stroke="#a8302a" stroke-width="1.5" stroke-dasharray="2 4"/>
    ${[[41, 43], [59, 43], [41, 61], [59, 61]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="#3a1010" stroke="#8a2a20" stroke-width="1.5"/>`).join('')}
    <path d="M22 44 q4 -14 16 -20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
    ${sparkle(84, 16, 8)}
  </g>`,

  maan: () => `<g>
    <circle cx="40" cy="50" r="48" fill="url(#g-lantern)" opacity=".45"/>
    <path d="${MOON}" fill="#fbe7a0" stroke="#b8862a" stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="34" cy="32" r="3.5" fill="#ecd488"/><circle cx="29" cy="54" r="5" fill="#ecd488"/><circle cx="38" cy="74" r="3.5" fill="#ecd488"/>
  </g>`,

  // --- Book 4 ---
  ballon: () => `<g>
    <path d="M50 72 q-8 8 0 14 t0 12" stroke="#6b4a2a" stroke-width="2.5" fill="none"/>
    <path d="M45 74 L55 74 L50 66Z" fill="#b8302a" stroke="#7a1f1a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M50 6 C74 6 82 28 80 40 C78 58 60 68 50 68 C40 68 22 58 20 40 C18 28 26 6 50 6Z" fill="#e0474c" stroke="#7a1f1a" stroke-width="3.5"/>
    <ellipse cx="37" cy="26" rx="6" ry="11" fill="#fff" opacity=".7" transform="rotate(20 37 26)"/>
  </g>`,

  lantaarn: () => `<g>
    <circle cx="50" cy="56" r="44" fill="url(#g-lantern)"/>
    <circle cx="50" cy="12" r="7" fill="none" stroke="${WOOD_DARK}" stroke-width="4"/>
    <path d="M30 28 L50 17 L70 28Z" fill="#6b4a2a" stroke="${WOOD_DARK}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="28" y="26" width="44" height="8" rx="2" fill="#6b4a2a" stroke="${WOOD_DARK}" stroke-width="2.5"/>
    <rect x="33" y="34" width="34" height="42" rx="3" fill="#ffd35a" stroke="${WOOD_DARK}" stroke-width="3"/>
    <path d="M50 46 C56 54 58 58 55 64 C53 68 47 68 45 64 C42 58 44 54 50 46Z" fill="#ff8a2f"/>
    <path d="M50 54 C53 58 53 61 52 64 C51 65 49 65 48 64 C47 61 47 58 50 54Z" fill="#fff3b0"/>
    <path d="M44.5 34 V76 M55.5 34 V76" stroke="#6b4a2a" stroke-width="2.5"/>
    <rect x="28" y="76" width="44" height="9" rx="2" fill="#6b4a2a" stroke="${WOOD_DARK}" stroke-width="2.5"/>
  </g>`,

  tas: () => `<g>
    ${shadow(50, 92, 34)}
    <path d="M24 42 Q50 -4 76 42" stroke="#4a2f1a" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M24 42 Q50 -4 76 42" stroke="#8a5226" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="12" y="36" width="76" height="52" rx="12" fill="#b0703a" stroke="#4a2f1a" stroke-width="3.5"/>
    <path d="M12 46 Q12 36 24 36 H76 Q88 36 88 46 V60 Q50 76 12 60Z" fill="#8a5226" stroke="#4a2f1a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M17 58 Q50 72 83 58" stroke="#d9a35a" stroke-width="2" fill="none" stroke-dasharray="4 4"/>
    <rect x="43" y="58" width="14" height="14" rx="2" fill="none" stroke="#f2c23a" stroke-width="3.5"/>
    <path d="M50 58 V70" stroke="#f2c23a" stroke-width="2.5"/>
  </g>`,

  lint: () => `<g>
    <path d="M47 50 C40 64 30 72 22 92 L32 88 L36 96 C44 78 50 66 52 54Z" fill="#e05a8a" stroke="#7a1f4a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M53 50 C62 62 68 74 82 90 L72 88 L70 96 C58 80 50 66 48 54Z" fill="#c8487a" stroke="#7a1f4a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 48 C34 26 10 26 12 44 C14 60 34 58 50 48Z" fill="#e05a8a" stroke="#7a1f4a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 48 C66 26 90 26 88 44 C86 60 66 58 50 48Z" fill="#e05a8a" stroke="#7a1f4a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M46 46 C34 36 22 36 20 42 M54 46 C66 36 78 36 80 42" stroke="#a8306a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect x="42" y="40" width="16" height="16" rx="6" fill="#f07aa8" stroke="#7a1f4a" stroke-width="3"/>
    <path d="M20 38 q4 -4 10 -4" stroke="#ffc2d8" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`,

  slang: () => `<g>
    ${shadow(46, 90, 36)}
    <path d="M10 82 C30 94 70 90 64 70 C58 52 26 62 28 42 C30 26 54 24 64 30" stroke="#23502e" stroke-width="18" stroke-linecap="round" fill="none"/>
    <path d="M10 82 C30 94 70 90 64 70 C58 52 26 62 28 42 C30 26 54 24 64 30" stroke="#5fae4f" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M10 82 C30 94 70 90 64 70 C58 52 26 62 28 42 C30 26 54 24 64 30" stroke="#d6e87a" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 9" fill="none"/>
    <path d="M84 32 l8 -3 M84 32 l8 3" stroke="#d8433a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M78 32 L86 32" stroke="#d8433a" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="72" cy="30" rx="13" ry="10" fill="#5fae4f" stroke="#23502e" stroke-width="3"/>
    <circle cx="74" cy="25" r="3.6" fill="#fff"/><circle cx="75" cy="25" r="2" fill="#1b1330"/>
    <path d="M76 35 q4 1 7 -1" stroke="#23502e" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  </g>`,

  potlood: () => `<g transform="rotate(-40 50 50)">
    <rect x="6" y="40" width="12" height="20" rx="4" fill="#f08a9a" stroke="#6b2a3a" stroke-width="3"/>
    <rect x="16" y="39" width="9" height="22" fill="url(#g-silver)" stroke="#3a4a6a" stroke-width="2.5"/>
    <rect x="25" y="40" width="48" height="20" fill="#f2c23a" stroke="#7a5a12" stroke-width="3"/>
    <path d="M25 47 H73 M25 53 H73" stroke="#d9a01a" stroke-width="2"/>
    <path d="M73 40 L94 50 L73 60Z" fill="#f0d59c" stroke="#7a5a12" stroke-width="3" stroke-linejoin="round"/>
    <path d="M86 46.2 L94 50 L86 53.8Z" fill="#2b2b3a"/>
  </g>`,

  sok: () => `<g>
    <path d="M30 8 H62 V54 L80 68 Q94 80 84 90 Q74 98 62 90 L34 70 Q28 64 30 54Z" fill="#3f7fd0" stroke="#1f3f6e" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M30 30 H62 M30 42 H62" stroke="#fff" stroke-width="5"/>
    <path d="M30 8 H62 V20 H30Z" fill="#f4f0e6" stroke="#1f3f6e" stroke-width="3"/>
    <path d="M36 9 V19 M42 9 V19 M48 9 V19 M54 9 V19" stroke="#c8c0b0" stroke-width="2"/>
    <path d="M76 66 Q92 76 86 88 Q78 98 66 90 Q76 84 76 66Z" fill="#d8433a" stroke="#1f3f6e" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M30 56 Q30 68 38 72 Q42 62 40 54Z" fill="#d8433a" stroke="#1f3f6e" stroke-width="2.5" stroke-linejoin="round"/>
  </g>`,

  schaduw: () => {
    // A child on a sunny patch of sand, with his long shadow lying behind him.
    const kid = '<circle cx="0" cy="-38" r="8"/><path d="M-8 -28 H8 L10 -10 H-10Z"/><path d="M-6 -10 L-7 0 M6 -10 L7 0" stroke-width="5" stroke-linecap="round"/><path d="M-9 -26 L-14 -14 M9 -26 L14 -14" stroke-width="4" stroke-linecap="round"/>';
    return `<g>
      <circle cx="14" cy="14" r="9" fill="#ffd35a" stroke="#c97a1a" stroke-width="2.5"/>
      <path d="M14 0 v-4 M28 14 h4 M24 4 l3 -3 M4 24 l-3 3 M24 24 l3 3" stroke="#ffb347" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="56" cy="72" rx="43" ry="25" fill="#f0d59c" stroke="#b99c63" stroke-width="2.5"/>
      <g transform="translate(30 84) scale(1.25)">
        <g transform="matrix(1 0.1 -1.05 0.6 0 0)" fill="#2e2846" stroke="#2e2846" opacity=".88">${kid}</g>
        <path d="M-6 -10 L-7 0 M6 -10 L7 0" stroke="#2d5ea3" stroke-width="5" stroke-linecap="round"/>
        <path d="M-9 -26 L-14 -14 M9 -26 L14 -14" stroke="#f7d1b0" stroke-width="4" stroke-linecap="round"/>
        <path d="M-8 -28 H8 L10 -10 H-10Z" fill="#3f7fd0" stroke="#1f3f6e" stroke-width="2"/>
        <circle cx="0" cy="-38" r="8" fill="#f7d1b0" stroke="#8a5a3a" stroke-width="2"/>
        <path d="M-8 -39 q1 -8 8 -8 q7 0 8 8z" fill="#d8433a"/>
        <circle cx="3" cy="-37" r="1.3" fill="#2b2b2b"/>
        <path d="M2 -33 q2 1.5 4 0" stroke="#8a4b33" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      </g>
    </g>`;
  },

  kraai: () => `<g>
    ${shadow(50, 91, 26)}
    <path d="M44 74 l-2 14 M54 74 l2 14 M36 89 h10 M52 89 h10" stroke="#3a3a4a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M30 62 L6 74 L10 82 L34 70Z" fill="#1b1b2a" stroke="${RIM}" stroke-width="2.5" stroke-linejoin="round"/>
    ${merged('<ellipse cx="48" cy="58" rx="26" ry="18" transform="rotate(-18 48 58)"/><circle cx="70" cy="34" r="14"/>', '#1b1b2a', RIM, 1.4)}
    <path d="M30 60 Q46 48 62 56 Q50 70 32 68Z" fill="#2a2f48"/>
    <path d="M36 62 Q48 56 58 60" stroke="#4a5a8a" stroke-width="2" fill="none"/>
    <path d="M81 28 L98 36 L81 42Z" fill="#3a3a4a" stroke="${RIM}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="73" cy="31" r="3.6" fill="#fff"/><circle cx="74" cy="31" r="2" fill="#1b1330"/>
  </g>`,

  nacht: () => `<g>
    <rect x="8" y="8" width="84" height="84" rx="16" fill="#172457" stroke="${RIM}" stroke-width="3"/>
    <path d="M10 74 Q30 62 50 72 T90 68 V80 Q90 90 80 90 H20 Q10 90 10 80Z" fill="#3b3f6e"/>
    <circle cx="62" cy="34" r="22" fill="url(#g-lantern)" opacity=".5"/>
    <g transform="translate(46 16) scale(.38)"><path d="${MOON}" fill="#fbe7a0"/></g>
    ${[[22, 24, 2.6], [34, 46, 2], [20, 56, 1.8], [44, 22, 1.6], [82, 56, 2.2], [76, 20, 1.6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff8d8"/>`).join('')}
    ${sparkle(30, 34, 5)}${sparkle(80, 44, 4)}
  </g>`,

  zon: () => `<g>
    <circle cx="50" cy="50" r="48" fill="url(#g-sun)"/>
    ${Array.from({ length: 12 }, (_, i) => `<path d="M50 4 L56 20 H44Z" fill="#ffb347" stroke="#c97a1a" stroke-width="2" stroke-linejoin="round" transform="rotate(${i * 30} 50 50)"/>`).join('')}
    <circle cx="50" cy="50" r="24" fill="#ffd35a" stroke="#c97a1a" stroke-width="3.5"/>
    <path d="M36 42 q4 -10 14 -12" stroke="#fff3b0" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>`,

  ster: () => `<g>
    <circle cx="50" cy="52" r="44" fill="url(#g-lantern)" opacity=".7"/>
    <path d="${STAR}" transform="translate(-5 -3) scale(1.1)" fill="url(#g-gold)" stroke="#8c6420" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M42 34 L48 24" stroke="#fffbe0" stroke-width="3.5" stroke-linecap="round"/>
    ${sparkle(86, 14, 6)}${sparkle(14, 84, 4.5)}
  </g>`,

  vriend: () => `<g>
    <g transform="translate(0 -2)">
      <g transform="translate(111 31) scale(-.62 .62)">${bokje()}</g>
      ${at(-12, 18, 0.8, barendArt())}
    </g>
    <path d="M54 34 C46 26 34 28 36 18 C38 10 50 10 54 18 C58 10 70 10 72 18 C74 28 62 26 54 34Z" fill="#e0474c" stroke="#7a1f1a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M42 17 q3 -4 7 -3" stroke="#ffb0b0" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`,

  schat: () => `<g>
    <circle cx="50" cy="48" r="44" fill="url(#g-lantern)" opacity=".7"/>
    ${shadow(50, 91, 36)}
    <path d="M18 44 L24 14 H76 L82 44Z" fill="#5a2e1a" stroke="#3a1d0e" stroke-width="3" stroke-linejoin="round"/>
    <path d="M28 18 H72 L76 40 H24Z" fill="#7a3a22"/>
    ${[[30, 44], [40, 38], [52, 36], [62, 40], [70, 44], [46, 44], [58, 46], [36, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#g-gold)" stroke="#8c6420" stroke-width="2"/>`).join('')}
    <path d="M48 28 l6 6 -6 6 -6 -6z" fill="#3fa0e0" stroke="#1f4a7a" stroke-width="2"/>
    <circle cx="66" cy="32" r="4.5" fill="#e0474c" stroke="#7a1f1a" stroke-width="2"/>
    <rect x="14" y="46" width="72" height="42" rx="4" fill="#a0522d" stroke="#3a1d0e" stroke-width="3.5"/>
    <path d="M14 58 H86" stroke="#7a3a22" stroke-width="2.5"/>
    <rect x="24" y="46" width="8" height="42" fill="url(#g-gold)" stroke="#8c6420" stroke-width="2"/>
    <rect x="68" y="46" width="8" height="42" fill="url(#g-gold)" stroke="#8c6420" stroke-width="2"/>
    <rect x="42" y="54" width="16" height="18" rx="3" fill="url(#g-gold)" stroke="#8c6420" stroke-width="2.5"/>
    <path d="M50 60 v6" stroke="#3a1d0e" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="60" r="2.4" fill="#3a1d0e"/>
    ${sparkle(82, 20, 6)}${sparkle(20, 26, 4.5)}
  </g>`,

  storm: () => `<g>
    <g stroke="#6fa8e0" stroke-width="3" stroke-linecap="round"><path d="M22 70 l-5 12 M34 74 l-5 12 M70 72 l-5 12 M82 68 l-5 12"/></g>
    ${merged('<circle cx="28" cy="46" r="16"/><circle cx="48" cy="34" r="21"/><circle cx="70" cy="42" r="17"/><rect x="18" y="44" width="64" height="20" rx="10"/>', '#5a6080', '#22253a', 3)}
    <path d="M34 34 q6 -10 16 -10" stroke="#7a809a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M54 56 L40 78 H51 L42 98 L66 70 H55 L63 56Z" fill="#ffe27a" stroke="#b8862a" stroke-width="2.5" stroke-linejoin="round"/>
  </g>`,

  taart: () => `<g>
    <ellipse cx="50" cy="86" rx="42" ry="8" fill="#e6eef8" stroke="#5a6a8a" stroke-width="3"/>
    <path d="M18 54 V80 A32 8 0 0 0 82 80 V54Z" fill="#f5d0a0" stroke="#8a5a3a" stroke-width="3" stroke-linejoin="round"/>
    <path d="M18 67 A32 8 0 0 0 82 67" stroke="#fff4e8" stroke-width="4" fill="none"/>
    <path d="M18 54 V62 Q22 68 26 62 Q30 70 35 62 Q40 68 46 62 Q52 70 58 62 Q63 68 68 62 Q73 70 78 62 Q80 64 82 62 V54Z" fill="#f8b8d0" stroke="#a04a6a" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="54" rx="32" ry="8" fill="#fbd0e0" stroke="#a04a6a" stroke-width="2.5"/>
    <circle cx="34" cy="52" r="5" fill="#e0474c" stroke="#7a1f1a" stroke-width="1.8"/><circle cx="66" cy="52" r="5" fill="#e0474c" stroke="#7a1f1a" stroke-width="1.8"/><circle cx="50" cy="58" r="5" fill="#e0474c" stroke="#7a1f1a" stroke-width="1.8"/>
    <rect x="46" y="28" width="8" height="24" rx="2" fill="#7fb0f0" stroke="#2d5ea3" stroke-width="2"/>
    <path d="M50 10 C55 16 57 20 54 25 C52 28 48 28 46 25 C43 20 45 16 50 10Z" fill="#ffc53d" stroke="#e07a1a" stroke-width="1.5"/>
  </g>`,

  kaart: () => `<g>
    <path d="M14 18 Q32 12 50 18 Q68 12 86 18 L84 84 Q66 90 50 84 Q32 90 16 84Z" fill="#e8c47e" stroke="#6b4a1a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M50 18 L50 84" stroke="#c9a05a" stroke-width="2" stroke-dasharray="4 4"/>
    <path d="M18 70 q6 -4 12 0 t12 0 M20 78 q6 -4 12 0" stroke="#3f7fd0" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M62 74 l8 -14 l8 14z" fill="#4f9a55" stroke="#2f5a2a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M22 30 l10 -10 l10 10z" fill="#a08060" stroke="#6b4a1a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30 62 Q38 44 54 52 Q66 58 66 36" stroke="#c0392b" stroke-width="3.5" fill="none" stroke-dasharray="5 5" stroke-linecap="round"/>
    <path d="M60 24 L74 38 M74 24 L60 38" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/>
  </g>`,

  vergrootglas: () => `<g>
    ${rod('M60 60 L88 88', '#a0522d', WOOD_DARK, 10)}
    <rect x="56" y="54" width="10" height="12" rx="2" fill="#8793a6" stroke="#3a4a6a" stroke-width="2.5" transform="rotate(-45 61 60)"/>
    <circle cx="40" cy="40" r="28" fill="#cfe8ff" fill-opacity=".6" stroke="#3a4a6a" stroke-width="10"/>
    <circle cx="40" cy="40" r="28" fill="none" stroke="#a8b2c4" stroke-width="5"/>
    <path d="M24 36 q2 -12 14 -14" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  </g>`,

  zwarteSteen: () => `<g>
    <circle cx="50" cy="56" r="36" fill="#b58cff" opacity=".55" filter="url(#f-soft)"/>
    ${shadow(50, 88, 30)}
    <path d="M50 22 L74 36 L72 74 L48 86 L26 72 L28 38Z" fill="#1e1a2e" stroke="#8f6fc0" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M50 22 L46 50 L72 74 M46 50 L26 72 M46 50 L28 38" stroke="#3a2f55" stroke-width="2.5" fill="none"/>
    <path d="M56 40 l-6 8 l4 4 l-6 10" stroke="#c58cff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M34 44 l6 -4" stroke="#6a5a9a" stroke-width="3" stroke-linecap="round"/>
    ${sparkle(76, 24, 5, '#e0c8ff')}${sparkle(22, 30, 3.5, '#e0c8ff')}
  </g>`,

  planken: () => `<g>
    ${shadow(50, 90, 40)}
    ${[0, 1, 2, 3].map((i) => {
      const y = 70 - i * 16;
      const x = 12 + (i % 2) * 6;
      return `<rect x="${x}" y="${y}" width="70" height="15" rx="2" fill="${i % 2 ? '#b97a3c' : WOOD}" stroke="${WOOD_DARK}" stroke-width="3"/>
        <path d="M${x + 6} ${y + 6} q16 -3 30 1 t28 -1" stroke="#9a6232" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <ellipse cx="${x + 70}" cy="${y + 7.5}" rx="4" ry="7.5" fill="#e0a86a" stroke="${WOOD_DARK}" stroke-width="2.5"/>`;
    }).join('')}
    ${rod('M30 22 V86', '#c0392b', '#6b1f1a', 4)}
  </g>`,

  bokje,

  // The Nachtbok-meter's horse (the chess piece is `paard`), and the three
  // names the child can give the bokje (Book 4, before the finale).
  paardDier: () => `<g>
    ${shadow(48, 92, 34)}
    <g fill="#a8703a" stroke="#4a2f16" stroke-width="3" stroke-linejoin="round">
      <rect x="22" y="56" width="9" height="34" rx="4"/><rect x="34" y="58" width="9" height="32" rx="4"/>
      <rect x="56" y="58" width="9" height="32" rx="4"/><rect x="68" y="56" width="9" height="34" rx="4"/>
      <ellipse cx="48" cy="54" rx="34" ry="16"/>
      <path d="M68 46 L76 18 Q80 10 88 14 L98 30 Q100 36 94 38 L84 36 L80 52Z"/>
    </g>
    <path d="M72 20 Q66 34 66 48 M76 16 Q70 30 70 44" stroke="#5a3418" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M14 50 q-10 10 -6 26 q6 -10 10 -14" fill="#5a3418"/>
    <path d="M80 12 l2 -8 l5 9z" fill="#a8703a" stroke="#4a2f16" stroke-width="2"/>
    <circle cx="86" cy="24" r="2.4" fill="#4a2f16"/><circle cx="96" cy="34" r="1.6" fill="#4a2f16"/>
    <path d="M22 88 h9 M34 88 h9 M56 88 h9 M68 88 h9" stroke="#3a2210" stroke-width="4"/>
  </g>`,

  bokjeNachtje: () => `<g>
    <circle cx="50" cy="50" r="46" fill="#1c2a55"/>
    ${[[18, 26], [30, 14], [82, 60], [14, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#fff8d8"/>`).join('')}
    <g transform="translate(66 6) scale(.3)"><path d="${MOON}" fill="#fbe7a0" stroke="#b8862a" stroke-width="6"/></g>
    ${at(4, 10, 0.92, bokje())}
  </g>`,

  bokjePikkie: () => `<g>
    <circle cx="50" cy="50" r="46" fill="#f4ead2"/>
    ${at(4, 10, 0.92, bokje())}
    <path d="M60 64 l-10 -6 v12z M60 64 l10 -6 v12z" fill="#e0474c" stroke="#7a1f1a" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="60" cy="64" r="3.4" fill="#ff8a7a" stroke="#7a1f1a" stroke-width="1.5"/>
  </g>`,

  bokjeSterre: () => `<g>
    <circle cx="50" cy="50" r="46" fill="#3a2a5a"/>
    ${at(4, 10, 0.92, bokje())}
    <path d="${STAR}" transform="translate(54.5 16) scale(.22)" fill="url(#g-gold)" stroke="#8c6420" stroke-width="6" stroke-linejoin="round"/>
    ${sparkle(86, 18, 6)}${sparkle(14, 30, 5)}
  </g>`,
};

/** Neutral fallback for unknown names: a soft disc with a question mark. */
function unknown() {
  return `<circle cx="50" cy="50" r="38" fill="#d9cfb6" stroke="#6b5a40" stroke-width="4"/>
    <text x="50" y="66" text-anchor="middle" font-size="48" font-weight="700" font-family="sans-serif" fill="#6b5a40">?</text>`;
}

/** SVG markup (no outer <svg>) for `name`, drawn in a 0 0 100 100 box. Never throws. */
export function picture(name) {
  const draw = typeof name === 'string' && Object.hasOwn(DRAW, name) ? DRAW[name] : null;
  if (!draw) return unknown();
  try {
    return draw();
  } catch {
    return unknown();
  }
}
