// Art for Book 4, "De Nachtbok": the final, a night of storm over the dunes
// that clears into a sunrise. The Nachtbok itself (a big goat made of storm
// clouds: grumpy, never horrid), Pim flying on Barend, Hugo on his goat,
// the Nachtbok-meter (how big the Nachtbok is, next to something familiar),
// the Book 4 scenes and book map, the cover, the backdrops behind the
// chapter puzzles and the chess pieces in the clouds (the other puzzle
// pieces are in skins4.js).
//
// Scenes are 1600×900 and keep what matters above y ≈ 620 (the caption
// covers the rest) and inside x ≈ 300–1300 (a phone shows the middle);
// small pieces are 100×100 unless noted. Griezelstand changes the sky's
// colours (CSS) and, in "zacht", the Nachtbok's eyes: round and cartoonish
// instead of glowing. What happens never changes.

import { pim, dame } from '../../art.js';
import { t } from '../../i18n.js';
import { barend, stable } from '../programma/art.js';
import { villager, pimAlone, darkGoat, teun, bigChapel } from './art.js';
import { omaHilde } from './art2.js';
import { hugoKind, dayChapel, BOOK as BOOK3 } from './art3.js';
import { picture } from './pictures.js';
import { at, flip, shade, sparkle, ringing, dune, STARS, starField, STAR, star, cloud, hearts, shout, outlined, bunting, nameSign } from './kit.js';

const BODY = '#3b3560';
const BODY_DARK = '#28233f';
const RIM = '#7f74b8';
const EDGE = '#140e26';
const HORN = '#6e5f94';
const BOLT = '#fff3a0';

/**
 * How far the storm has gone at each size of the Nachtbok (0 storm, 1 a
 * clear sunrise), and how big it is drawn in scenes (its 400×400 box).
 */
const CLEAR = { berg: 0, huis: 0.12, boom: 0.24, paard: 0.38, schaap: 0.55, hond: 0.78, bokje: 1 };
const SIZE = { berg: 2.1, huis: 1.25, boom: 1, paard: 0.74, schaap: 0.56, hond: 0.42, bokje: 0.3 };
const clearOf = (meter) => CLEAR[meter] ?? 0;
const sizeOf = (meter) => SIZE[meter] ?? 1;
/** Cross while it is big; from a sheep down (the riddles of 4.5) sad and small. */
const moodOf = (meter) => (meter === 'schaap' || meter === 'hond' ? 'sad' : 'angry');

// ---------- small pieces ----------

/** A dark storm cloud with a moonlit top. */
const stormCloud = (x, y, s = 1, o = 1) => cloud(x, y, s, { fill: '#2b2748', rim: '#4d4778', o });

/** A lightning bolt from (x, y) downwards, about 60×150 at scale 1. */
function bolt(x, y, s = 1) {
  return `<g class="bolt" transform="translate(${x} ${y}) scale(${s})">
    <circle cx="0" cy="70" r="70" fill="${BOLT}" opacity=".18"/>
    <path d="M6 0 L-22 70 H-2 L-24 150 L32 54 H10 L30 0Z" fill="${BOLT}" stroke="#c9a13a" stroke-width="4" stroke-linejoin="round"/>
  </g>`;
}

/** Wind lines behind something flying to the right. */
function wind(x, y, s = 1) {
  return `<g stroke="#cfe0ff" stroke-width="${6 * s}" stroke-linecap="round" fill="none" opacity=".55">
    <path d="M${x} ${y} h${-90 * s}"/><path d="M${x - 20 * s} ${y + 30 * s} h${-120 * s}"/><path d="M${x} ${y + 60 * s} h${-80 * s}"/></g>`;
}
/** A purple ribbon of light from (x1, y1) to (x2, y2), waving a little. */
function ribbon(x1, y1, x2, y2, k = 0) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + (k % 2 ? 40 : -40);
  const d = `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
  return `<g class="curse-ribbon"><path d="${d}" stroke="#b36bff" stroke-width="22" fill="none" opacity=".3" filter="url(#f-soft)"/>
    <path d="${d}" stroke="#c58cff" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#f0dcff" stroke-width="3" fill="none" stroke-dasharray="4 14"/></g>`;
}

// ---------- the sky, the dunes, the chapel ----------

/** The night sky's stars, and one more where Book 1 has the moon. */
const SKY_STARS = [...STARS, [1460, 120]];

/**
 * The sky. `clear` (0–1) is how far the storm has gone: at 0 dark rolling
 * clouds with a purple tint and far lightning, then the clouds thin out,
 * and at 1 it is a clear sunrise. `bolts`: lightning (only in the storm).
 */
function sky({ clear = 0, bolts = true } = {}) {
  const c = Math.max(0, Math.min(1, clear));
  const clouds = [[-80, 40, 1.6], [300, -20, 1.3], [700, 30, 1.7], [1100, -30, 1.4], [1380, 60, 1.5], [100, 220, 1.1], [980, 230, 1.0]];
  return `<rect width="1600" height="900" fill="url(#g-night)"/>
    <rect width="1600" height="900" fill="#2a1446" opacity="${(0.5 * (1 - c)).toFixed(2)}"/>
    ${c > 0 ? `<rect width="1600" height="900" fill="url(#g-dawn)" opacity="${(c * c).toFixed(2)}"/>` : ''}
    ${c > 0.15 && c < 0.85 ? starField((1 - c).toFixed(2), SKY_STARS) : ''}
    ${c < 1 ? clouds.map(([x, y, s], i) => stormCloud(x, y, s, (1 - c * 0.9) * (i > 4 ? 0.8 : 1))).join('') : `${cloud(160, 120, 0.9, { o: 0.9 })}${cloud(1000, 70, 0.8, { o: 0.9 })}`}
    ${bolts && c < 0.3 ? bolt(110, 300, 0.8) + bolt(1480, 280, 0.7) : ''}`;
}

/** The dunes: at night in Griezelstand's colours, warmer as the sun comes up (`clear`). */
function dunes(clear = 0, y = 640) {
  const day = clear >= 0.75;
  return `${dune(y, day ? '#e6c98e' : 'var(--dune-far)', 60)}${dune(y + 120, day ? '#d8b574' : 'var(--dune-mid)', 40)}
    ${!day && clear > 0.3 ? `${dune(y, '#f0c890', 60).replace('fill=', `opacity="${((clear - 0.3) * 1.6).toFixed(2)}" fill=`)}` : ''}`;
}

/** The sun coming up over the dunes; `h` is how high (0 just a glow, 1 a whole sun). */
function sunrise(x, y, h = 1) {
  return `<circle cx="${x}" cy="${y + 120 - h * 120}" r="300" fill="url(#g-sun)" opacity=".8"/>
    <circle cx="${x}" cy="${y + 120 - h * 120}" r="110" fill="#ffe27a" stroke="#ffb347" stroke-width="10"/>
    ${Array.from({ length: 11 }, (_, i) => `<path d="M${x - 22} ${y - h * 120 - 4} L${x} ${y - h * 120 - 90} L${x + 22} ${y - h * 120 - 4}Z" fill="#ffd35a" opacity=".7" transform="rotate(${-100 + i * 20} ${x} ${y + 120 - h * 120})"/>`).join('')}
    <circle cx="${x}" cy="${y + 120 - h * 120}" r="110" fill="#ffe27a" stroke="#ffb347" stroke-width="10"/>`;
}

/** The chapel at night (Book 1's, without planks), [x, y, scale] of its 400×640 box. */
const chapelAt = (x, y, s) => at(x, y, s, bigChapel({ hour: 12, windows: true, holes: false }));

/** A few village houses: [x, y, scale]. */
function houses(spots, lit = true) {
  const roofs = ['#9a4747', '#6d5a9a', '#9a6a3a', '#4f7a6a'];
  return spots.map(([x, y, s], i) => at(x, y, s, `${lit ? '<circle cx="50" cy="60" r="56" fill="url(#g-lantern)" opacity=".5"/>' : ''}${picture('huis').replace('#9a4747', roofs[i % 4])}`)).join('');
}

// ---------- characters ----------

/**
 * De Nachtbok: a giant goat made of storm clouds, facing left, in a 400×400
 * box (feet at y ≈ 392). Puffy cloud body, curly horns, a cloud beard.
 * mood: 'angry' (glowing eyes, grumpy brows), 'sad' (eyes up, a tear),
 * 'surprised'. In "zacht" the eyes are round and cartoonish.
 */
function nachtbok({ scare = 'spannend', mood = 'angry' } = {}) {
  const soft = scare === 'zacht' || mood !== 'angry';
  const puffs = [[160, 215, 70], [232, 186, 82], [305, 206, 72], [342, 255, 56], [152, 268, 56], [246, 276, 68], [104, 222, 46]];
  const puff = (fill, dy = 0) => `<g fill="${fill}">${puffs.map(([x, y, r]) => `<circle cx="${x}" cy="${y + dy}" r="${r}"/>`).join('')}</g>`;
  const leg = (x, fill) => `<path d="M${x - 19} 290 V356 Q${x} 372 ${x + 19} 356 V290Z" fill="${fill}"/><circle cx="${x - 10}" cy="364" r="15" fill="${fill}"/><circle cx="${x + 11}" cy="366" r="14" fill="${fill}"/>`;
  const rain = (x) => `<path d="M${x - 10} 384 l-6 14 M${x + 6} 386 l-6 14" stroke="#8fb0e8" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
  const eyes = soft
    ? `<circle cx="80" cy="140" r="13" fill="#fff" stroke="${EDGE}" stroke-width="3"/><circle cx="117" cy="136" r="13" fill="#fff" stroke="${EDGE}" stroke-width="3"/>
       <circle cx="${mood === 'sad' ? 79 : 75}" cy="${mood === 'sad' ? 136 : 142}" r="6" fill="${EDGE}"/><circle cx="${mood === 'sad' ? 116 : 112}" cy="${mood === 'sad' ? 132 : 138}" r="6" fill="${EDGE}"/>
       <circle cx="${mood === 'sad' ? 81 : 77}" cy="${mood === 'sad' ? 134 : 140}" r="2" fill="#fff"/><circle cx="${mood === 'sad' ? 118 : 114}" cy="${mood === 'sad' ? 130 : 136}" r="2" fill="#fff"/>`
    : `<circle cx="80" cy="141" r="20" fill="#b36bff" opacity=".55" filter="url(#f-soft)"/><circle cx="117" cy="137" r="20" fill="#b36bff" opacity=".55" filter="url(#f-soft)"/>
       <ellipse cx="80" cy="141" rx="10" ry="7" fill="#e2c4ff" stroke="#8f5fd0" stroke-width="2"/><ellipse cx="117" cy="137" rx="10" ry="7" fill="#e2c4ff" stroke="#8f5fd0" stroke-width="2"/>
       <circle cx="78" cy="141" r="3.4" fill="#fff"/><circle cx="115" cy="137" r="3.4" fill="#fff"/>`;
  const brows = {
    angry: 'M60 118 L98 130 M138 112 L102 126',
    sad: 'M62 128 L96 116 M136 120 L104 112',
    surprised: 'M62 116 Q78 106 96 116 M102 112 Q118 102 136 110',
  }[mood] ?? 'M60 118 L98 130 M138 112 L102 126';
  const mouth = {
    angry: 'M58 204 q14 -10 28 0',
    sad: 'M60 206 q12 -8 24 0',
    surprised: '',
  }[mood] ?? 'M58 204 q14 -10 28 0';
  return `<g class="nachtbok nachtbok-${mood}">
    ${[200, 330].map((x) => leg(x, BODY_DARK) + rain(x)).join('')}
    <path d="M372 214 q40 -14 30 -56 q-6 26 -36 34z" fill="${BODY}" stroke="${EDGE}" stroke-width="4"/>
    ${puff(EDGE, 4)}${puff(RIM, -7)}${puff(BODY)}
    <path d="M190 160 q40 -30 90 -18 M270 200 q30 -10 56 6" stroke="#55508a" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
    ${[150, 280].map((x) => leg(x, BODY) + rain(x)).join('')}
    <path d="M56 206 q-8 34 12 52 q4 -16 12 -6 q8 -20 16 -40 q-20 4 -40 -6z" fill="${BODY}" stroke="${EDGE}" stroke-width="4" stroke-linejoin="round"/>
    ${soft ? '' : `<path d="M76 222 l-8 14 h8 l-8 16" stroke="${BOLT}" stroke-width="4" fill="none" stroke-linejoin="round"/>`}
    <path d="M128 106 C126 52 196 40 214 84 C226 116 192 136 178 116 C170 104 180 92 192 98" stroke="${EDGE}" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M128 106 C126 52 196 40 214 84 C226 116 192 136 178 116 C170 104 180 92 192 98" stroke="#55497a" stroke-width="20" fill="none" stroke-linecap="round"/>
    <ellipse cx="160" cy="124" rx="28" ry="11" fill="${BODY_DARK}" stroke="${EDGE}" stroke-width="3.5" transform="rotate(24 160 124)"/>
    <ellipse cx="102" cy="150" rx="58" ry="52" fill="${BODY}" stroke="${EDGE}" stroke-width="4"/>
    <ellipse cx="68" cy="186" rx="40" ry="30" fill="#4c4578" stroke="${EDGE}" stroke-width="4"/>
    <ellipse cx="40" cy="128" rx="30" ry="11" fill="${BODY}" stroke="${EDGE}" stroke-width="3.5" transform="rotate(-24 40 128)"/>
    <ellipse cx="42" cy="128" rx="18" ry="5" fill="#8a6aa8" transform="rotate(-24 42 128)"/>
    <path d="M92 104 C76 50 140 22 176 58 C196 80 176 112 156 100 C144 92 152 76 166 80" stroke="${EDGE}" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M92 104 C76 50 140 22 176 58 C196 80 176 112 156 100 C144 92 152 76 166 80" stroke="${HORN}" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M98 74 l14 -6 M114 52 l10 10 M140 40 l2 14 M164 48 l-8 10" stroke="#9a8ac0" stroke-width="4" stroke-linecap="round"/>
    <path d="M70 100 q20 -14 44 -6" stroke="${RIM}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/>
    ${eyes}
    <path d="${brows}" stroke="${EDGE}" stroke-width="9" stroke-linecap="round" fill="none"/>
    <ellipse cx="52" cy="184" rx="5" ry="7" fill="${EDGE}"/><ellipse cx="78" cy="190" rx="5" ry="7" fill="${EDGE}"/>
    ${mood === 'surprised' ? `<ellipse cx="70" cy="206" rx="9" ry="8" fill="${EDGE}"/>` : `<path d="${mouth}" stroke="${EDGE}" stroke-width="5" fill="none" stroke-linecap="round"/>`}
    ${mood === 'sad' ? '<path d="M118 152 q-5 12 0 18 q6 -6 0 -18z" fill="#7cc8f0" stroke="#3a7aa8" stroke-width="1.5"/>' : ''}
    ${soft ? '' : `<path d="M330 120 l-12 26 h10 l-12 24" stroke="${BOLT}" stroke-width="5" fill="none" stroke-linejoin="round" class="crackle"/>`}
  </g>`;
}

/** The Nachtbok's head, in a 100×100 box (for the riddle card); with `meter` its mood follows its size. */
function nachtbokHead({ scare = 'spannend', meter = null, mood = meter ? moodOf(meter) : 'angry' } = {}) {
  return `<svg x="0" y="0" width="100" height="100" viewBox="6 30 214 214" overflow="hidden">${nachtbok({ scare, mood })}</svg>`;
}

/** The Nachtbok at its meter size, standing with its feet at (x, y). */
function nachtbokAt(meter, x, y, { scare, mood = moodOf(meter), scale = 1 } = {}) {
  if (meter === 'bokje') return at(x - 60 * scale, y - 112 * scale, 1.2 * scale, picture('bokje'));
  const s = sizeOf(meter) * scale;
  return at(x - 200 * s, y - 392 * s, s, nachtbok({ scare, mood }));
}

/** Where nachtbokAt(meter, x, y, {scale}) draws the Nachtbok's two eyes (for a glow through the mist). */
function eyesAt(meter, x, y, scale = 1) {
  const s = sizeOf(meter) * scale;
  return [[80, 141], [117, 137]].map(([ex, ey]) => [x - 200 * s + ex * s, y - 392 * s + ey * s]);
}

/**
 * The bokje (100×100) with the look that goes with its name: Nachtje a
 * little moon, Pikkie a red bow, Sterre a gold star on its forehead.
 */
function kidArt(look = '') {
  const extra = {
    nachtje: '<g transform="translate(80 0) scale(.24)"><path d="M60 10 A40 40 0 1 0 60 90 A60 60 0 0 1 60 10Z" fill="#fbe7a0" stroke="#b8862a" stroke-width="7"/></g>',
    pikkie: '<path d="M56 62 l-11 -7 v14z M56 62 l11 -7 v14z" fill="#e0474c" stroke="#7a1f1a" stroke-width="2" stroke-linejoin="round"/><circle cx="56" cy="62" r="3.6" fill="#ff8a7a" stroke="#7a1f1a" stroke-width="1.5"/>',
    sterre: `<path d="${STAR}" transform="translate(56 17) scale(.22)" fill="url(#g-gold)" stroke="#8c6420" stroke-width="9" stroke-linejoin="round"/>`,
  }[look] ?? '';
  return `<g class="kid">${picture('bokje')}${extra}</g>`;
}

/** Pim on Barend, flying: wind lines behind and a little cloud under the hooves. 100×100, facing right. */
export function pimFlying() {
  return `<g class="pim-flying">
    <g stroke="#cfe0ff" stroke-width="4" stroke-linecap="round" opacity=".7"><path d="M14 52 h-16 M10 64 h-22 M16 76 h-14"/></g>
    ${cloud(18, 74, 0.28, { fill: '#e8eeff', o: 0.85 })}
    <g transform="rotate(-6 50 60)">${pim({ glow: false })}</g>
  </g>`;
}

/** Hugo (friendly) flying on his goat, facing right. 200×160. */
function hugoFlying() {
  // Hugo sits on the goat's back: his legs (below y 185 of his box) are cut off behind it.
  return `<g class="hugo-flying">
    ${at(14, 24, 1.7, picture('hugosGeit'))}
    ${at(64, 24, 0.4, `<svg x="0" y="-10" width="160" height="195" viewBox="0 -10 160 195" overflow="hidden">${hugoKind({ pose: 'wave' })}</svg>`)}
  </g>`;
}

/** A goat floating up, its eyes glowing purple (the curse); `free`: an ordinary goat again. 100×100. */
function floatingGoat({ free = false, white = false } = {}) {
  const goat = white ? barend() : darkGoat({ eyes: !free });
  return `<g class="floating-goat">${free ? '' : '<ellipse cx="50" cy="66" rx="44" ry="26" fill="#b36bff" opacity=".3" filter="url(#f-soft)"/>'}${goat}
    ${free ? '' : '<path d="M30 92 q4 8 0 14 M50 94 q4 8 0 14 M68 92 q4 8 0 14" stroke="#c58cff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>'}</g>`;
}

// ---------- the chess pieces in the clouds (chapter 4.4) ----------

/** A stone village tower: the rook. `hugo` gives it Hugo's hat with the red feather and his face in the window. 100×100. */
export function towerPiece({ hugo = false } = {}) {
  const stone = '#e8e0cc';
  const edge = '#5a4a3a';
  return `<g class="tower-piece">
    <ellipse cx="50" cy="92" rx="34" ry="6" fill="#000" opacity=".25"/>
    <path d="M24 90 L28 40 H72 L76 90Z" fill="${stone}" stroke="${edge}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M22 40 V22 H32 V30 H44 V22 H56 V30 H68 V22 H78 V40Z" fill="${stone}" stroke="${edge}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M27 56 H73 M26 72 H74 M40 40 V56 M60 56 V72 M44 72 V90" stroke="#b8ab8e" stroke-width="3"/>
    <path d="M40 90 V78 a10 10 0 0 1 20 0 V90Z" fill="#6b4a2a" stroke="${edge}" stroke-width="3"/>
    ${hugo
      ? `<circle cx="50" cy="56" r="11" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="2.5"/>
         <path d="M45 54 q2.5 -3 5 0 M51 54 q2.5 -3 5 0" stroke="#2b1b10" stroke-width="2" fill="none" stroke-linecap="round"/>
         <path d="M45 60 q5 5 10 0" stroke="#7a2a1a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
         <path d="M8 26 Q50 12 92 24 Q72 32 50 32 Q28 32 8 26Z" fill="#2a1d40" stroke="#120a1f" stroke-width="3"/>
         <path d="M30 26 Q28 -4 52 -6 Q72 -4 70 24Z" fill="#3a2858" stroke="#120a1f" stroke-width="3"/>
         <path d="M31 20 Q50 14 70 18" stroke="#c9a13a" stroke-width="4" fill="none"/>
         <path d="M34 8 C22 -4 16 -14 6 -18 C18 -12 26 -2 38 10Z" fill="#d8433a" stroke="#7a1f1a" stroke-width="2.5"/>`
      : '<path d="M44 64 V56 a6 6 0 0 1 12 0 V64Z" fill="#3a2a1a"/><path d="M50 22 V4 M50 4 L66 9 L50 14" stroke="#6b4a2a" stroke-width="3" fill="#e0474c" stroke-linejoin="round"/>'}
  </g>`;
}

/** A small gold crown, about 40×26, centred on (0, 0). */
const crown = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-20 12 L-22 -10 L-10 2 L0 -14 L10 2 L22 -10 L20 12Z" fill="url(#g-gold)" stroke="#8c6420" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-14" r="3.5" fill="#e0474c"/></g>`;

/** Pim on Barend with a little crown: the king of the light pieces. 100×100. */
export function pimKing() {
  return `<g class="pim-king">${at(0, 6, 0.94, pim({ glow: false }))}${crown(50, 14, 0.62)}</g>`;
}

/** The Nachtbok as a small storm-goat with a crown: the lone dark king. 100×100. */
export function stormKing({ scare = 'spannend' } = {}) {
  return `<g class="storm-king"><circle cx="50" cy="56" r="44" fill="#b36bff" opacity=".22" filter="url(#f-soft)"/>${at(-6, 4, 0.27, nachtbok({ scare }))}${crown(32, 20, 0.6)}</g>`;
}

// ---------- the Nachtbok-meter ----------

/**
 * The Nachtbok-meter's parts, for a 460×330 panel: the frame, the label
 * ("Zo groot als een huis"), the comparison (the Nachtbok next to the
 * familiar thing, the same height) and the row of all sizes from big to
 * small with the current one ringed. `meters`: the book's list [{id,
 * picture, word}]; `id`: the current size.
 */
export function meterParts(meters = [], id, { scare = 'spannend', ghost = null } = {}) {
  const k = Math.max(0, meters.findIndex((m) => m.id === id));
  const m = meters[k] ?? { id, picture: id, word: id };
  const ref = picture(m.picture);
  const last = k === meters.length - 1;
  // The Nachtbok (and the thing it is as big as) get smaller along the list: from 164 high down to 84.
  const heightOf = (i) => 164 - (80 * i) / Math.max(1, meters.length - 2);
  const beast = (i, mood) => {
    const h = heightOf(i);
    const w = (h * 170) / 164;
    return `<svg x="${(210 - w).toFixed(1)}" y="${(234 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" viewBox="20 30 380 368">${nachtbok({ scare, mood })}</svg>`;
  };
  const g = ghost ? meters.findIndex((mm) => mm.id === ghost) : -1;
  const frame = `<rect x="6" y="10" width="460" height="330" rx="22" fill="#00000055"/>
    <rect width="460" height="330" rx="22" fill="#1b1533" stroke="#c9a13a" stroke-width="7"/>
    <rect x="14" y="14" width="432" height="302" rx="16" fill="none" stroke="#3a2f60" stroke-width="3"/>`;
  const words = t(last ? 'meterSmall' : 'meterSize', { w: m.word });
  // Long labels ("Zo groot als een schaap") are squeezed to fit the panel.
  const label = `<text x="230" y="58" text-anchor="middle" font-size="34" font-weight="800" fill="#fff3c4"${words.length > 20 ? ' textLength="420" lengthAdjust="spacingAndGlyphs"' : ''}>${words}</text>`;
  const h = heightOf(k);
  // The Nachtbok on the left, the familiar thing on the right, as tall; at the end only the little goat.
  // `ghost`: how big it was before, a faint shape behind it (the meter step shows the shrink).
  const compare = last
    ? `<g class="meter-compare"><path d="M40 232 H420" stroke="#4a3f78" stroke-width="5" stroke-linecap="round"/>${at(150, 72, 1.6, picture('bokje'))}${sparkle(130, 110, 12)}${sparkle(330, 96, 10)}</g>`
    : `<g class="meter-compare">
    <path d="M40 232 H420" stroke="#4a3f78" stroke-width="5" stroke-linecap="round"/>
    ${g >= 0 && g < k ? `<g class="meter-ghost" opacity=".28">${beast(g, moodOf(ghost)).replace(/(fill|stroke)="(?!none)[^"]*"/g, '$1="#8a7fc0"')}</g>` : ''}
    ${beast(k, moodOf(id))}
    <text x="230" y="${(234 - h / 2 + 18).toFixed(0)}" text-anchor="middle" font-size="56" font-weight="800" fill="#c9a13a">=</text>
    ${at(336 - h / 2, 234 - h, h / 100, ref)}
  </g>`;
  const step = 400 / Math.max(1, meters.length);
  const row = `<g class="meter-row">${meters
    .map((mm, i) => {
      const cx = 30 + step * (i + 0.5);
      const s = 0.42 - i * 0.025;
      const icon = picture(mm.picture);
      const here = i === k;
      return `${here ? `<circle cx="${cx}" cy="284" r="27" fill="#ffe27a" opacity=".35"/><circle cx="${cx}" cy="284" r="27" fill="none" stroke="#ffe27a" stroke-width="4"/>` : ''}
        <g opacity="${i < k ? 0.35 : 1}">${at(cx - 50 * s, 284 - 50 * s, s, icon)}</g>`;
    })
    .join('')}
    ${meters.slice(0, -1).map((_, i) => `<path d="M${30 + step * (i + 1) - 5} 284 l6 0" stroke="#6a5f9a" stroke-width="3"/>`).join('')}</g>`;
  return { frame, label, compare, row };
}

/** The whole meter panel (460×330). */
function meterPanel(meters, id, o = {}) {
  if (!meters?.length) return '';
  const p = meterParts(meters, id, o);
  return `<g class="meter-panel">${p.frame}${p.label}${p.compare}${p.row}</g>`;
}

// ---------- Book 4 scenes ----------

/**
 * Story scenes for Book 4. `meter` is the Nachtbok's size so far (the
 * story's state), `meters` the book's list of sizes, `kid` the bokje's
 * name (once chosen) and `look` the name's id (its moon, bow or star),
 * `scare` the Griezelstand; `backdrop`: the scene
 * is behind a card (a riddle, the meter), so the small meter is left out.
 */
function scene(name, { scare = 'spannend', meter = 'berg', meters = [], kid = '', look = '', backdrop = false } = {}) {
  const c = clearOf(meter);
  const base = (o = {}) => `${sky({ clear: c, ...o })}${dunes(c)}`;
  const pimFly = (x = 300, y = 220, s = 2.6) => at(x, y, s, pimFlying());
  // The meter, small, top right but inside what a phone shows (x ≤ 1300).
  // Not behind a card (`backdrop`): the card's top bar would cut it in half.
  const badge = (x = 1020, y = 24, s = 0.6) => (meters.length && !backdrop ? at(x, y, s, meterPanel(meters, meter, { scare })) : '');
  switch (name) {
    // --- the intro ---
    case 'nestNight':
      return BOOK3.scene('nestNight');
    case 'crack':
      return `<rect width="1600" height="900" fill="url(#g-night)"/>
        ${SKY_STARS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff8d8"/>`).join('')}
        <circle cx="800" cy="360" r="380" fill="#b58cff" opacity=".35" filter="url(#f-soft)"/>
        <g class="rays" opacity=".7">${Array.from({ length: 14 }, (_, i) => `<path d="M800 360 L${800 + Math.cos((i * Math.PI) / 7) * 760} ${360 + Math.sin((i * Math.PI) / 7) * 760} L${800 + Math.cos((i * Math.PI) / 7 + 0.08) * 760} ${360 + Math.sin((i * Math.PI) / 7 + 0.08) * 760}Z" fill="#e0c8ff" opacity=".35"/>`).join('')}</g>
        <ellipse cx="800" cy="540" rx="430" ry="70" fill="#5a3a1a" stroke="#3f2612" stroke-width="8"/>
        ${at(620, 170, 3.6, picture('zwarteSteen'))}
        <path d="M370 540 Q800 640 1230 540 Q1200 720 800 740 Q400 720 370 540Z" fill="#9a6a32" stroke="#3f2612" stroke-width="8"/>
        <g stroke="#5a3a1a" stroke-width="7" stroke-linecap="round" fill="none"><path d="M400 580 Q800 680 1200 580 M440 640 Q800 720 1160 640 M480 560 L560 700 M680 600 L640 730 M900 600 L960 730 M1100 570 L1020 700"/></g>
        <g stroke="#c9945a" stroke-width="6" stroke-linecap="round"><path d="M380 545 L330 520 M1220 545 L1270 515 M600 600 L560 585 M1000 600 L1050 584"/></g>
        <path d="M790 250 L760 330 L812 380 L770 470 L800 540" stroke="#fff" stroke-width="12" fill="none" stroke-linejoin="round" filter="url(#f-glow)"/>
        ${[[660, 240, -20], [960, 260, 25], [690, 470, 200], [930, 480, 150]].map(([x, y, r]) => `<path d="M${x} ${y} l20 -8 l10 18 l-22 6z" fill="#1e1a2e" stroke="#c58cff" stroke-width="3" transform="rotate(${r} ${x} ${y})"/>`).join('')}
        ${shout(1170, 270, 'Krak!', 120, '#e8d4ff')}`;
    case 'storm':
      return `${sky({ clear: 0 })}
        ${stormCloud(200, 260, 1.8)}${stormCloud(860, 230, 2)}
        ${bolt(560, 150, 1.2)}${bolt(1100, 200, 0.9)}
        ${dunes(0)}
        ${houses([[300, 520, 1.1], [1180, 530, 1.1], [1290, 510, 0.95]])}
        ${chapelAt(660, 250, 0.56)}
        <g stroke="#cfe0ff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".5"><path d="M330 420 q80 -30 160 0 t160 0"/><path d="M900 460 q80 -30 160 0 t160 0"/></g>`;
    case 'nachtbok':
      return `${sky({ clear: 0 })}${dunes(0)}
        ${chapelAt(330, 380, 0.36)}${houses([[200, 560, 0.7], [520, 570, 0.6]])}
        ${nachtbokAt('berg', 960, 760, { scare })}
        ${bolt(1420, 60, 1)}`;
    case 'float':
      return `${base()}
        ${chapelAt(1180, 330, 0.42)}
        ${[[380, 120, 1.2, 0], [620, 60, 1, 1], [860, 150, 1.3, 2], [1110, 90, 0.9, 3]].map(([x, y, s, k]) => at(x, y, s * 1.4, floatingGoat({ white: k === 2 }))).join('')}
        ${[[480, 300], [700, 250], [980, 320]].map(([x, y]) => sparkle(x, y, 16, '#e0c8ff')).join('')}
        <text x="1080" y="300" font-size="70" font-weight="800" fill="#fff3c4" stroke="#1b1330" stroke-width="5" paint-order="stroke">Mèèè!</text>
        ${at(330, 330, 2, pimAlone({ arms: true }))}`;
    case 'fly':
      return `${base()}
        ${nachtbokAt('berg', 1180, 560, { scare, scale: 0.32 })}
        ${pimFly(420, 120, 4.4)}${wind(470, 360, 1.6)}`;
    // --- 4.1 Door de storm ---
    case 'allies':
      return `${base()}
        ${pimFly(330, 250, 2.8)}
        ${at(660, 230, 1.9, hugoFlying())}
        ${badge()}`;
    case 'birds':
      return `${base()}
        <path d="M560 330 Q900 200 1240 260" stroke="#ffe27a" stroke-width="8" stroke-dasharray="4 26" stroke-linecap="round" fill="none"/>
        ${at(700, 150, 2.2, picture('uil'))}${at(980, 110, 2, picture('ekster'))}
        ${bolt(1300, 280, 0.8)}
        ${pimFly(320, 340, 2.3)}
        ${badge(1040, 400, 0.55)}`;
    case 'giant':
      // Zo groot als een berg: the Nachtbok beside a mountain of its own height.
      return `${base()}
        <path d="M280 640 L560 150 L640 260 L720 200 L980 640Z" fill="#5a6890" stroke="#2a3a5a" stroke-width="8" stroke-linejoin="round"/>
        <path d="M560 150 L610 238 L586 226 L560 252 L530 220 L512 232Z" fill="#e8eeff"/>
        ${nachtbokAt('berg', 1170, 700, { scare, scale: 0.6 })}
        ${pimFly(330, 160, 1.5)}`;
    // --- 4.2 De mist ---
    case 'mist':
      return `${base()}
        ${nachtbokAt(meter, 1000, 760, { scare, scale: 0.6 })}
        <g class="thick-mist" filter="url(#f-soft)">${[[700, 300], [1000, 250], [1300, 330], [850, 470], [1200, 500], [560, 520]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="${260 + (i % 2) * 60}" ry="120" fill="#c8d0e8" opacity=".75"/>`).join('')}
          ${[[620, 360], [960, 420], [1260, 380]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="220" ry="90" fill="url(#g-mist)"/>`).join('')}</g>
        ${scare === 'zacht' ? '' : eyesAt(meter, 1000, 760, 0.6).map(([x, y]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="20" fill="#b36bff" opacity=".7" filter="url(#f-soft)"/>`).join('')}
        ${pimFly(300, 230, 2.3)}
        ${badge(1020, 24, 0.6)}`;
    case 'dameLight':
      return `${base()}
        ${[[1100, 520], [1350, 420], [300, 560]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="240" ry="90" fill="#c8d0e8" opacity=".5"/>`).join('')}
        <circle cx="900" cy="350" r="240" fill="url(#g-ghostglow)"/>
        ${at(720, 160, 3.4, dame({ scare: scare === 'eng' ? 'spannend' : scare, mood: 'happy' }))}
        ${pimFly(320, 240, 2.6)}
        ${badge()}`;
    case 'mistGone':
    case 'huis':
      return `${base()}
        ${houses([[1010, 360, 2.6]], true)}
        ${nachtbokAt('huis', 800, 640, { scare, scale: 0.52 })}
        ${pimFly(320, 230, 2.1)}
        ${badge()}`;
    // --- 4.3 Maak de geiten los ---
    case 'ribbons': {
      const goats = [[480, 120, 1.2], [620, 330, 1.1], [760, 90, 1], [860, 360, 1.2]];
      return `${base()}
        ${nachtbokAt(meter, 1230, 700, { scare, scale: 0.7 })}
        ${goats.map(([x, y, s], k) => ribbon(x + 60 * s, y + 70 * s, 1080 + (k % 2) * 80, 360 + k * 30, k)).join('')}
        ${goats.map(([x, y, s]) => at(x, y, s * 1.3, floatingGoat())).join('')}
        ${pimFly(270, 380, 2)}
        ${badge(1020, 24, 0.55)}`;
    }
    case 'painting':
      return `${base()}
        ${at(830, 130, 1.1, `<g transform="rotate(4 100 125)">${omaHilde({ talk: true })}</g>`)}
        ${at(640, 300, 1.9, hugoFlying())}
        ${pimFly(300, 260, 2.3)}
        ${badge(1090, 24, 0.45)}`;
    case 'goatsDown':
    case 'boom':
      return `${base()}
        ${name === 'boom' ? at(1040, 250, 1.2, `<path d="M88 300 L92 170 Q100 160 108 170 L112 300Z" fill="#7a5230" stroke="#4a2f16" stroke-width="4"/><circle cx="70" cy="140" r="62" fill="#3f8a44"/><circle cx="134" cy="132" r="60" fill="#4f9a4a"/><circle cx="100" cy="86" r="70" fill="#5fae52"/>`) : ''}
        ${nachtbokAt(name === 'boom' ? 'boom' : meter, name === 'boom' ? 900 : 1080, 620, { scare, scale: name === 'boom' ? 0.88 : 0.5, mood: 'surprised' })}
        ${[[360, 430, 1], [520, 470, 1.1], [660, 420, 0.9], [780, 480, 1]].map(([x, y, s]) => `${at(x, y, s * 1.2, floatingGoat({ free: true }))}<path d="M${x + 60 * s} ${y - 20} v-40 M${x + 40 * s} ${y - 10} v-30" stroke="#e8eeff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`).join('')}
        ${pimFly(320, 90, 1.9)}${at(560, 50, 1.35, hugoFlying())}
        ${name === 'boom' ? '' : badge()}`;
    // --- 4.4 Zet de Nachtbok vast ---
    case 'flee':
      return `${base()}
        ${nachtbokAt(meter, 1200, 560, { scare, scale: 0.8, mood: 'surprised' })}
        <g stroke="#cfe0ff" stroke-width="8" stroke-linecap="round" opacity=".5"><path d="M1260 260 h120 M1280 320 h150 M1260 380 h110"/></g>
        ${pimFly(300, 280, 2.3)}${at(560, 120, 1.5, hugoFlying())}
        ${badge(1020, 24, 0.55)}`;
    case 'village':
      return `${base()}
        ${chapelAt(700, 200, 0.62)}${houses([[330, 480, 1.3], [470, 500, 1.1], [1080, 480, 1.3], [1220, 500, 1.1]])}
        ${at(380, 380, 1.4, villager('#d8433a', { arms: true }))}${at(520, 390, 1.3, villager('#9a62b3', { arms: true }))}${at(1020, 380, 1.4, teun())}${at(1160, 390, 1.3, villager('#3f7fd0', { arms: true }))}
        ${pimFly(320, 60, 1.9)}${at(980, 40, 1.4, hugoFlying())}`;
    case 'board4':
      return `${base()}
        ${cloud(420, 430, 3.2, { fill: '#e8eeff', rim: '#ffffff', o: 0.95 })}
        <g transform="translate(600 130) scale(.86)">
          <rect x="-12" y="-12" width="504" height="504" rx="20" fill="#5a3c22"/>
          ${Array.from({ length: 25 }, (_, i) => `<rect x="${(i % 5) * 96}" y="${Math.floor(i / 5) * 96}" width="96" height="96" fill="${(Math.floor(i / 5) + (i % 5)) % 2 ? '#9fb0dc' : '#eef3ff'}"/>`).join('')}
          ${at(384, 96, 0.96, stormKing({ scare }))}${at(192, 192, 0.96, towerPiece())}${at(192, 288, 0.96, towerPiece({ hugo: true }))}${at(192, 384, 0.96, pimKing())}
        </g>`;
    case 'caught':
    case 'paard':
      return `${base()}
        ${at(500, 330, 2.4, towerPiece({ hugo: true }))}${at(940, 330, 2.4, towerPiece())}
        ${nachtbokAt('paard', 810, 600, { scare, scale: 0.8, mood: 'surprised' })}
        ${at(1120, 370, 2.3, picture('paardDier'))}
        ${pimFly(300, 160, 1.6)}
        ${backdrop ? '' : shout(800, 170, 'Schaakmat!', 100)}`;
    // --- 4.5 De drie raadsels ---
    case 'stare':
      return `${base({ bolts: false })}
        ${nachtbokAt(meter, 1000, 640, { scare, scale: 0.85 })}
        ${pimFly(320, 280, 2.5)}
        ${backdrop ? '' : shout(720, 230, '?', 140)}
        ${badge()}`;
    case 'shadow':
    case 'schaap':
      return `${base({ bolts: false })}
        <g opacity=".35">${nachtbokAt('paard', 920, 650, { scare, scale: 1.1 }).replace(/fill="[^"]*"/g, 'fill="#120a24"')}</g>
        ${nachtbokAt('schaap', 860, 630, { scare, scale: 0.9, mood: 'sad' })}
        ${at(1020, 440, 1.9, picture('schaap'))}
        ${pimFly(320, 240, 2.3)}
        ${badge()}`;
    case 'sunrise':
    case 'hond':
      return `${sky({ clear: clearOf('hond'), bolts: false })}${sunrise(1180, 600, 0.5)}${dunes(clearOf('hond'))}
        ${nachtbokAt('hond', 820, 640, { scare, scale: 0.95, mood: 'sad' })}
        ${at(930, 450, 1.8, picture('hond'))}
        ${at(330, 330, 2.4, outlined(pim({ glow: false })))}
        ${badge(1020, 24, 0.55)}`;
    case 'kid':
      return `${sky({ clear: 1 })}${sunrise(1300, 600, 0.8)}${dunes(1)}
        <ellipse cx="800" cy="610" rx="150" ry="20" fill="#000" opacity=".15"/>
        <g class="shiver">${at(660, 300, 3, picture('bokje'))}</g>
        <path d="M640 380 l-24 -8 M640 420 l-28 2 M960 380 l24 -8 M960 420 l28 2" stroke="#3a2a5a" stroke-width="6" stroke-linecap="round"/>
        ${at(300, 330, 2.2, outlined(pim({ glow: false })))}`;
    case 'kopje':
      return `${sky({ clear: 1 })}${sunrise(1300, 600, 0.9)}${dunes(1)}
        ${at(500, 260, 3.6, outlined(barend()))}${at(820, 330, 2.6, flip(picture('bokje')))}
        ${hearts([[800, 240, 1.4], [880, 190, 1]])}
        ${at(300, 300, 2, pimAlone({ arms: true }))}`;
    case 'named':
      return `${sky({ clear: 1 })}${sunrise(1350, 600, 1)}${dunes(1)}
        <g transform="translate(1040 330)">${nameSign(kid, 1.3)}</g>
        ${at(320, 300, 2, pimAlone({ arms: true }))}
        ${at(470, 260, 3, outlined(barend()))}${at(720, 340, 2.4, flip(kidArt(look)))}
        ${sparkle(980, 200, 20)}${sparkle(1180, 230, 14)}${sparkle(1100, 160, 16)}`;
    // --- the finale ---
    case 'stars':
      return `${sky({ clear: 0.9, bolts: false })}${dunes(0.9)}
        <circle cx="800" cy="320" r="300" fill="url(#g-lantern)" opacity=".6"/>
        ${Array.from({ length: 34 }, (_, i) => {
          const a = (i * 137.5 * Math.PI) / 180;
          const r = 90 + ((i * 53) % 380);
          return star(800 + Math.cos(a) * r * 1.5, 320 + Math.sin(a) * r * 0.8, 0.22 + (i % 4) * 0.08);
        }).join('')}
        ${at(730, 250, 1.4, picture('zwarteSteen').replace(/#1e1a2e/g, '#4a3f6a'))}
        ${sparkle(800, 320, 40)}`;
    case 'free':
      return `${sky({ clear: 1 })}${dunes(1, 600)}
        ${[[200, 470, 1.6], [700, 450, 1.5], [960, 500, 1.9], [1200, 460, 1.6], [560, 600, 1.4], [860, 620, 1.5]].map(([x, y, s], k) => at(x, y, s, k % 2 ? flip(darkGoat()) : darkGoat())).join('')}
        ${at(360, 380, 2.4, outlined(pim({ glow: false })))}
        ${hearts([[500, 420], [1040, 420, 0.8], [780, 380, 0.9]])}`;
    case 'clear':
      return `${sky({ clear: 1 })}
        <path d="M200 640 A600 520 0 0 1 1400 640" stroke="#e0474c" stroke-width="30" fill="none" opacity=".55"/>
        <path d="M230 640 A570 490 0 0 1 1370 640" stroke="#f2c23a" stroke-width="30" fill="none" opacity=".55"/>
        <path d="M260 640 A540 460 0 0 1 1340 640" stroke="#5fae52" stroke-width="30" fill="none" opacity=".55"/>
        <path d="M290 640 A510 430 0 0 1 1310 640" stroke="#3f7fd0" stroke-width="30" fill="none" opacity=".55"/>
        ${dunes(1)}
        ${at(650, 180, 0.62, dayChapel({ bell: true }))}`;
    case 'stable4':
      return `${sky({ clear: 1 })}${dunes(1, 600)}
        ${at(520, -60, 6, stable(false))}
        <g transform="translate(820 120)">${nameSign(kid, 1.1)}</g>
        ${at(600, 340, 2.6, outlined(barend()))}${at(860, 410, 2, flip(kidArt(look)))}
        ${at(320, 320, 2, pimAlone({ arms: true }))}`;
    case 'feast':
      return feast(kid, look);
    default:
      return `${base()}${badge()}`;
  }
}

/** The last picture: the party at the chapel at sunrise, with everyone. */
function feast(kid, look) {
  return `${sky({ clear: 1 })}${sunrise(1460, 560, 1)}
    ${dune(600, '#e6c98e', 40)}${dune(720, '#d8b574', 30)}
    ${houses([[60, 400, 1.2], [1330, 410, 1.2]], false)}
    ${at(640, 40, 0.8, dayChapel({ bell: true }))}${ringing(800, 90, 1)}
    ${bunting(120, 150, 640, 280, 50)}${bunting(960, 280, 1500, 150, 50)}
    ${at(980, 60, 0.72, omaHilde({ talk: true }))}
    ${at(1150, 120, 1.7, dame({ scare: 'zacht', mood: 'happy' }))}
    ${at(470, 110, 1.05, picture('uil'))}${at(1180, 300, 1, picture('ekster'))}
    ${at(110, 330, 1.5, villager('#d8433a', { arms: true }))}${at(1390, 350, 1.5, villager('#3f7fd0', { arms: true }))}
    ${at(1100, 360, 1.5, teun())}${at(1240, 380, 1.4, villager('#9a62b3', { arms: true }))}
    ${at(310, 290, 1.3, hugoKind({ pose: 'cheer' }))}
    ${at(530, 330, 1.7, pimAlone({ arms: true }))}
    ${at(650, 380, 2.1, outlined(barend()))}${at(860, 430, 1.6, flip(kidArt(look)))}
    ${kid ? `<g transform="translate(960 400)">${nameSign(kid, 0.55)}</g>` : ''}
    ${[[450, 200], [1100, 300], [880, 210], [220, 160]].map(([x, y]) => sparkle(x, y, 16, '#ffe27a')).join('')}`;
}

// ---------- the book map ----------

/** Where things stand on the map, per layout. */
const MAP_AT = {
  map: { chapel: [130, 360, 0.42], houses: [[40, 560, 0.9], [330, 580, 0.8]], nachtbok: [1330, 520, 0.62], sun: [1300, 640], friends: [1080, 290, 1.6] },
  // A phone shows only about x 600–1000: the Nachtbok in the middle, between the meter (top) and the stops.
  tall: { chapel: [890, 470, 0.2], houses: [[600, 600, 0.5]], nachtbok: [810, 600, 0.3], sun: [900, 640], friends: [730, 470, 1.1] },
};

/** The book map's backdrop: the storm over the dunes, clearing as the chapters are done; the Nachtbok in the sky. */
function map({ done = [], tall = false, meter = 'berg', scare = 'spannend', look = '' } = {}) {
  const n = done.filter(Boolean).length;
  const all = done.length > 0 && n === done.length;
  const c = all ? 1 : Math.max(clearOf(meter), n * 0.08);
  const L = MAP_AT[tall ? 'tall' : 'map'];
  return `${sky({ clear: c, bolts: n < 2 })}
    ${all ? sunrise(...L.sun, 1) : n >= 4 ? sunrise(...L.sun, 0.3) : ''}
    ${dunes(c)}
    ${chapelAt(...L.chapel)}${houses(L.houses, !all)}
    ${all ? friends(...L.friends, look) : nachtbokAt(meter, L.nachtbok[0], L.nachtbok[1], { scare, scale: L.nachtbok[2] })}`;
}

/** Barend and the bokje side by side on the dune (the map at the end), [x, y, scale]. */
function friends(x, y, s, look = '') {
  return at(x, y, s, `${outlined(barend())}${at(84, 22, 0.8, flip(kidArt(look)))}${hearts([[96, 10, 0.5]])}`);
}

/** Book 4's cover picture (240×250): the Nachtbok in the storm, Pim flying on Barend. */
function cover({ scare = 'spannend' } = {}) {
  return `<rect width="240" height="250" fill="#1a1036"/>
    ${stormCloud(-40, 0, 0.7)}${stormCloud(120, -20, 0.6)}
    ${bolt(40, 40, 0.4)}
    <path d="M0 214 Q120 196 240 214 V250 H0Z" fill="#3b3f6e"/>
    ${at(60, 46, 0.48, nachtbok({ scare }))}
    ${at(-4, 100, 0.95, pimFlying())}`;
}

// ---------- puzzle backdrops ----------

/**
 * Backdrops behind a Book 4 puzzle (1600×900). The board and its buttons
 * cover most of the screen, so there are no figures here, only the sky (the
 * Nachtbok low in a corner behind the ribbons). `scare`: the Griezelstand.
 */
const BACKDROPS = {
  skyRoad: () => `${sky({ clear: 0 })}${dunes(0)}${shade(0.3)}`,
  skyMist: () => `${sky({ clear: 0.05 })}${dunes(0.05)}
    ${[[200, 300], [1400, 260], [300, 700], [1300, 720]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="260" ry="100" fill="#c8d0e8" opacity=".45"/>`).join('')}
    ${shade(0.3)}`,
  skyRibbons: ({ scare = 'spannend' } = {}) => `${sky({ clear: 0.12 })}${dunes(0.12)}
    ${nachtbokAt('huis', 1430, 820, { scare, scale: 0.6 })}${shade(0.32)}`,
  skyBoard: () => `${sky({ clear: 0.24 })}${dunes(0.24)}
    ${chapelAt(60, 300, 0.5)}${houses([[1380, 560, 1.1], [1260, 580, 0.9]])}${shade(0.3)}`,
};

// ---------- the book ----------

/** Book 4's art, for index.js (see BOOK in art.js). */
export const BOOK = {
  scene,
  map,
  cover,
  // Up from the dunes into the sky, towards the Nachtbok; the meter (the map's goal) beside it.
  // At the end the path leads to Barend and the bokje instead.
  layouts: (done) => ({
    landscape: { box: [1600, 900], stops: [[190, 770], [400, 660], [600, 560], [800, 470], [1000, 390]], end: done.every(Boolean) ? [1130, 410] : [1170, 330], goal: [1200, 595, 0.86] },
    portrait: { box: [900, 1600], stops: [[170, 1490], [450, 1430], [730, 1340], [470, 1250], [200, 1160]], end: [450, 1050], goal: [266, 266, 1.3] },
  }),
  // The Nachtbok-meter stands on the map where another book has its goal.
  goal: ({ meters, meter, scare }) => meterPanel(meters, meter, { scare }),
  // The Nachtbok asks the riddles of 4.5 (its mood follows its size).
  speaker: (who, o) => (who === 'nachtbok' ? nachtbokHead(o) : ''),
  backdrops: BACKDROPS,
};
