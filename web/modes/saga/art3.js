// Art for Book 3, "Wie heeft het klokje gestolen?": a mystery by day. The
// village and its chapel in the morning (the bell tower stands empty until
// the end), the woods with the big tree and the magpie's nest, the koster's
// kitchen, friendly Hugo, the Book 3 scenes and book map, the two pictures
// for "Wat is er anders?" (chapter 3.1) and the backdrops behind the
// chapter puzzles (the pieces on their boards are in skins3.js).
//
// Scenes are 1600×900 and keep what matters above y ≈ 620 (the caption
// covers the rest) and inside x ≈ 300–1300 (a phone shows the middle);
// small pieces are 100×100 unless noted. It is daytime, so Griezelstand
// changes nothing here; only the very last picture is at night.

import { pim, treasure } from '../../art.js';
import { barend, stable } from '../programma/art.js';
import { hugoPortrait } from '../spookhuis/art.js';
import { pimAlone, villager, clockFace } from './art.js';
import { picture } from './pictures.js';
import { suspectBoard } from './suspects.js';
import { at, flip, shade, sparkle, ringing, dune as hill, STAR, hearts, bubble, shout, zzz, houses } from './kit.js';

const SKY = '#9fd6f4';
const SKY_LOW = '#e4f5fb';
const HILL_FAR = '#a9d68e';
const HILL = '#86c06a';
const GRASS = '#6fb25a';
const SAND = '#f0dba6';
const SAND_EDGE = '#d4b77a';
const LEAF = ['#4f9a4a', '#5fae52', '#3f8a44'];
const BARK = '#7a5230';
const BARK_DARK = '#4a2f16';
const COAT = '#4a3470';
const COAT_EDGE = '#21163a';
const SKIN = '#f2c4a0';
const SKIN_EDGE = '#8a5a3a';
/** The light haze over a daytime backdrop. */
const HAZE = '#10203a';
/** The village's roofs by day. */
const ROOFS = ['#b85450', '#7d6aa6', '#b07a42', '#5a8a7a'];

/** What Book 3's chapters have done. `done` is a flag per chapter, or a count. */
function progressOf(done) {
  const f = Array.isArray(done) ? done : Array.from({ length: 6 }, (_, i) => i < done);
  return { look: !!f[0], owl: !!f[1], chess: !!f[2], feathers: !!f[3], nest: !!f[4], bell: !!f[5], count: f.filter(Boolean).length };
}

// ---------- small pieces ----------

/** A flat white cloud by day, about 210×70 (flatter than the kit's cloud). */
function cloud(x, y, s = 1) {
  return at(x, y, s, '<g fill="#fff" opacity=".92"><ellipse cx="70" cy="44" rx="64" ry="26"/><ellipse cx="120" cy="30" rx="50" ry="30"/><ellipse cx="166" cy="46" rx="44" ry="22"/></g>');
}

/** The sky by day: blue, paler near the ground, a sun and a few clouds. */
function daySky({ sun = [1400, 130], clouds = [[200, 110, 1], [860, 70, 0.8]] } = {}) {
  return `<rect width="1600" height="900" fill="${SKY}"/>
    <rect y="320" width="1600" height="580" fill="${SKY_LOW}" opacity=".7"/>
    ${sun ? `<circle cx="${sun[0]}" cy="${sun[1]}" r="130" fill="url(#g-sun)"/>` : ''}
    ${clouds.map(([x, y, s]) => cloud(x, y, s)).join('')}`;
}

/** A round leafy tree, 200×300 (trunk foot at 100, 300). `tone` picks the green. */
function leafTree(tone = 0) {
  const [a, b, c] = [LEAF[tone % 3], LEAF[(tone + 1) % 3], LEAF[(tone + 2) % 3]];
  return `<g class="leaf-tree">
    <path d="M88 300 L92 170 Q100 160 108 170 L112 300Z" fill="${BARK}" stroke="${BARK_DARK}" stroke-width="4"/>
    <circle cx="70" cy="140" r="62" fill="${c}"/><circle cx="134" cy="132" r="60" fill="${b}"/>
    <circle cx="100" cy="86" r="70" fill="${a}"/><circle cx="76" cy="62" r="20" fill="#8fd07a" opacity=".5"/>
  </g>`;
}

/** A small flower, 40×60 (stem foot at 20, 60). */
function flower(color = '#e0474c') {
  return `<path d="M20 60 V26" stroke="#3f8a44" stroke-width="4"/><path d="M20 46 q-12 -6 -14 -14 q10 0 14 10" fill="#5fae52"/>
    ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="20" cy="14" rx="7" ry="11" fill="${color}" transform="rotate(${a} 20 22)"/>`).join('')}
    <circle cx="20" cy="22" r="6" fill="#f2c23a" stroke="#b8862a" stroke-width="2"/>`;
}

/** A butterfly, 60×50, centred on (30, 25). */
function butterfly() {
  return `<g class="butterfly"><ellipse cx="18" cy="16" rx="15" ry="12" fill="#f29a3a" stroke="#8a4a12" stroke-width="2.5"/><ellipse cx="42" cy="16" rx="15" ry="12" fill="#f29a3a" stroke="#8a4a12" stroke-width="2.5"/>
    <ellipse cx="20" cy="34" rx="10" ry="9" fill="#f2c23a" stroke="#8a4a12" stroke-width="2.5"/><ellipse cx="40" cy="34" rx="10" ry="9" fill="#f2c23a" stroke="#8a4a12" stroke-width="2.5"/>
    <rect x="27" y="8" width="6" height="34" rx="3" fill="#3a2410"/><path d="M28 9 q-6 -8 -10 -8 M32 9 q6 -8 10 -8" stroke="#3a2410" stroke-width="2" fill="none"/></g>`;
}

/** A black-and-white magpie feather lying flat, about 120×50. */
function lyingFeather() {
  return `<g class="lying-feather"><ellipse cx="62" cy="40" rx="58" ry="8" fill="#000" opacity=".18"/>
    <g transform="translate(-6 66) rotate(-78)">${picture('veerZwartWit')}</g></g>`;
}

// ---------- people ----------

/**
 * Hugo in Book 3: friendly. The big hat with the red feather and the
 * purple coat (with shiny gold buttons, for chapter 3.6) as before, but a
 * round, kind face. 160×240, feet at the bottom. pose: 'stand', 'wave',
 * 'cheer', 'think', 'ring' (both hands up on a rope), 'open' (coat open,
 * full of buttons); mood: 'happy', 'sad' (tears), 'surprised'.
 */
export function hugoKind({ pose = 'stand', mood = 'happy' } = {}) {
  const arm = (d) => `<path d="${d}" stroke="${COAT_EDGE}" stroke-width="22" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${COAT}" stroke-width="15" stroke-linecap="round" fill="none"/>`;
  const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width="2.5"/>`;
  const down = arm('M50 116 Q36 142 40 168') + hand(40, 172);
  const downR = arm('M110 116 Q124 142 120 168') + hand(120, 172);
  const arms = {
    stand: down + downR,
    wave: down + arm('M110 116 Q138 100 142 62') + hand(142, 56),
    cheer: arm('M50 116 Q28 88 26 56') + hand(26, 52) + arm('M110 116 Q132 88 134 56') + hand(134, 52),
    think: down + arm('M110 116 Q122 132 100 108') + hand(98, 104),
    ring: arm('M110 116 Q132 80 122 36') + hand(121, 32) + arm('M50 116 Q76 128 116 92') + hand(121, 90),
    open: arm('M50 116 Q24 132 18 150') + hand(16, 154) + arm('M110 116 Q136 132 142 150') + hand(144, 154),
  }[pose];
  const eyes = {
    happy: `<path d="M64 72 q6 -7 12 0 M84 72 q6 -7 12 0" stroke="#2b1b10" stroke-width="3.6" fill="none" stroke-linecap="round"/>`,
    sad: `<circle cx="70" cy="72" r="3.6" fill="#2b1b10"/><circle cx="90" cy="72" r="3.6" fill="#2b1b10"/>
      <path d="M62 64 l12 3 M98 64 l-12 3" stroke="#2b1b10" stroke-width="3" stroke-linecap="round"/>
      <path d="M68 80 q-4 10 0 16 q5 -4 0 -16z M92 80 q-4 10 0 16 q5 -4 0 -16z" fill="#7cc8f0" stroke="#3a7aa8" stroke-width="1.5"/>`,
    surprised: `<circle cx="70" cy="71" r="5" fill="#fff" stroke="#2b1b10" stroke-width="2.5"/><circle cx="90" cy="71" r="5" fill="#fff" stroke="#2b1b10" stroke-width="2.5"/><circle cx="70" cy="72" r="2.4" fill="#2b1b10"/><circle cx="90" cy="72" r="2.4" fill="#2b1b10"/>`,
  }[mood];
  const mouth = {
    happy: '<path d="M70 92 q10 10 20 0" stroke="#7a2a1a" stroke-width="3.4" fill="#c0504a" stroke-linecap="round"/>',
    sad: '<path d="M71 96 q9 -7 18 0" stroke="#7a2a1a" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
    surprised: '<ellipse cx="80" cy="95" rx="5" ry="6" fill="#7a2a1a"/>',
  }[mood];
  const buttons = [120, 142, 164].map((y) => `<circle cx="80" cy="${y}" r="5.5" fill="#f2c23a" stroke="#8c6420" stroke-width="2"/>`).join('');
  // With the coat open: the lining is full of shiny buttons.
  const lining =
    pose === 'open'
      ? `<path d="M52 108 L80 200 L108 108 Z" fill="#c0392b" stroke="${COAT_EDGE}" stroke-width="3"/>
        ${[[70, 128, '#f2c23a'], [90, 128, '#cfd6e3'], [66, 150, '#3f7fd0'], [80, 146, '#e0474c'], [94, 150, '#f2c23a'], [74, 170, '#cfd6e3'], [88, 170, '#9a62b3']]
          .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="#3a2410" stroke-width="2"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#fff" opacity=".8"/>`)
          .join('')}`
      : '';
  return `<g class="hugo-kind">
    <path d="M66 190 V230 M94 190 V230" stroke="#2a1d40" stroke-width="16" stroke-linecap="round"/>
    <ellipse cx="60" cy="232" rx="14" ry="7" fill="#1b1330"/><ellipse cx="100" cy="232" rx="14" ry="7" fill="#1b1330"/>
    <path d="M46 108 Q80 96 114 108 L124 196 Q80 206 36 196Z" fill="${COAT}" stroke="${COAT_EDGE}" stroke-width="4"/>
    ${lining}
    <path d="M66 100 L80 120 L94 100Z" fill="#f4ead2" stroke="${COAT_EDGE}" stroke-width="3"/>
    ${pose === 'open' ? '' : buttons}
    ${arms}
    <rect x="70" y="90" width="20" height="14" fill="#e9b894"/>
    <circle cx="80" cy="76" r="27" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width="3"/>
    <ellipse cx="53" cy="78" rx="5" ry="7" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width="2.5"/><ellipse cx="107" cy="78" rx="5" ry="7" fill="${SKIN}" stroke="${SKIN_EDGE}" stroke-width="2.5"/>
    ${eyes}
    <circle cx="64" cy="84" r="5.5" fill="#f08a80" opacity=".55"/><circle cx="96" cy="84" r="5.5" fill="#f08a80" opacity=".55"/>
    <ellipse cx="80" cy="81" rx="5.5" ry="4.5" fill="#e0987a"/>
    <path d="M66 89 q7 -7 14 -2 q7 -5 14 2 q-7 4 -14 1 q-7 3 -14 -1z" fill="#3a2440"/>
    ${mouth}
    <path d="M14 56 Q80 38 146 54 Q116 64 80 64 Q44 64 14 56Z" fill="#2a1d40" stroke="#120a1f" stroke-width="3"/>
    <path d="M48 56 Q46 14 82 12 Q114 14 112 54Z" fill="#3a2858" stroke="#120a1f" stroke-width="3"/>
    <path d="M49 49 Q80 42 111 48" stroke="#c9a13a" stroke-width="6" fill="none"/>
    <path d="M54 34 C40 20 34 6 22 -2 C36 4 48 16 62 30Z" fill="#d8433a" stroke="#7a1f1a" stroke-width="2.5"/>
    <path d="M52 30 Q40 16 28 4" stroke="#ff8a7a" stroke-width="2" fill="none"/>
  </g>`;
}

/** Barend standing beside Pim when Pim (100×160 at scale 2) stands at (x, y). */
const barendBy = (x, y) => at(x + 120, y + 116, 2.4, barend());

/** Pim on foot with his magnifying glass. 100×160. */
function pimLooking() {
  return `${pimAlone()}<g transform="translate(58 58) rotate(-20) scale(.5)">${picture('vergrootglas')}</g>`;
}

/** The koster: a dark coat with a white collar, grey hair round a bald head, a big key. 100×160. */
function koster({ arms = false } = {}) {
  const head = `<path d="M33 50 q-4 -14 6 -20 M67 50 q4 -14 -6 -20" stroke="#d6d6dc" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M42 66 h16 l-3 7 h-10z" fill="#fff" stroke="#6a6a7a" stroke-width="1.5"/>
    <path d="M40 40 q4 -3 8 0 M52 40 q4 -3 8 0" stroke="#8a8a96" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  return `${villager('#2f3044', { arms, hat: head })}<g transform="translate(70 96) rotate(30)"><circle r="6" fill="none" stroke="#c9a13a" stroke-width="3"/><path d="M0 6 V24 M0 18 h6 M0 23 h5" stroke="#c9a13a" stroke-width="3"/></g>`;
}

/** Hugo's goat asleep: the friendly dark goat curled up, eyes shut. 100×100. */
function sleepingGoat() {
  return `<g class="sleeping-goat">
    <ellipse cx="50" cy="78" rx="38" ry="16" fill="#6a5a80" stroke="#1b1330" stroke-width="2.5"/>
    <path d="M20 72 q-8 -4 -6 -12" stroke="#6a5a80" stroke-width="6" stroke-linecap="round" fill="none"/>
    <ellipse cx="78" cy="66" rx="12" ry="10" fill="#6a5a80" stroke="#1b1330" stroke-width="2.5"/>
    <path d="M74 58 q-6 -12 -16 -8 M80 57 q2 -12 -6 -14" stroke="#c9b48a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M78 66 q4 3 8 0" stroke="#e0d8f0" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M86 72 l2 8 l3 -7z" fill="#4a3d5c"/>
  </g>`;
}

/** A magpie flying, wings up, facing right. 120×80. `faint`: just a glimpse. */
function flyingMagpie({ faint = false } = {}) {
  return `<g class="flying-magpie"${faint ? ' opacity=".35"' : ''}>
    <path d="M10 46 L-30 40 L-28 52 L12 54Z" fill="#1b2030" stroke="#9aa3d6" stroke-width="2"/>
    <path d="M40 40 Q30 4 4 0 Q28 20 34 44Z" fill="#1b2030" stroke="#9aa3d6" stroke-width="2"/>
    <path d="M30 26 Q22 12 12 8" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="50" cy="48" rx="30" ry="14" fill="#1b2030" stroke="#9aa3d6" stroke-width="2"/>
    <path d="M30 52 Q50 64 70 50 Q64 60 48 60Z" fill="#fff"/>
    <circle cx="82" cy="40" r="11" fill="#1b2030" stroke="#9aa3d6" stroke-width="2"/>
    <path d="M92 38 L106 42 L92 46Z" fill="#2b2b3a"/><circle cx="85" cy="38" r="2.6" fill="#fff"/>
  </g>`;
}

// ---------- the chapel by day ----------

/**
 * The Duinkapel by day, in Book 1's 400×640 box (door at the bottom
 * centre). `bell`: the klokje hangs in the tower's arch (it is gone for
 * most of the book). The clock shows nine in the morning.
 */
export function dayChapel({ bell = true, hour = 9 } = {}) {
  const win = (x) => `<path d="M${x} 520 V430 a30 30 0 0 1 60 0 V520z" fill="#bfe3f5" stroke="#8c7f66" stroke-width="5"/>
    <path d="M${x + 30} 400 V520 M${x} 460 H${x + 60}" stroke="#8c7f66" stroke-width="4"/>
    <path d="M${x + 8} 446 q6 -14 16 -18" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/>`;
  return `<g class="day-chapel">
    <polygon points="0,316 200,196 400,316" fill="#b85450" stroke="#6a2a2a" stroke-width="5"/>
    <rect x="20" y="310" width="360" height="330" fill="#fbf4e4" stroke="#8c7f66" stroke-width="5"/>
    ${win(60)}${win(280)}
    <path d="M140 640 V520 a60 60 0 0 1 120 0 V640z" fill="#7a4a28" stroke="#3a2210" stroke-width="5"/>
    <path d="M170 640 V500 M200 640 V462 M230 640 V500" stroke="#5a3418" stroke-width="4"/>
    <circle cx="236" cy="590" r="6" fill="#c9a13a"/>
    <rect x="128" y="40" width="144" height="290" fill="#f4ecd8" stroke="#8c7f66" stroke-width="5"/>
    <polygon points="116,46 200,-70 284,46" fill="#a04848" stroke="#6a2a2a" stroke-width="5"/>
    <path d="M200 -70 v-30 M188 -88 h24" stroke="#6b4a2a" stroke-width="6" stroke-linecap="round"/>
    <path d="M162 140 V92 a38 38 0 0 1 76 0 V140z" fill="#4a3a2e" stroke="#8c7f66" stroke-width="5"/>
    <path d="M200 56 V70" stroke="#6b4a2a" stroke-width="4"/>
    ${bell ? `<g class="klokje">${at(170, 62, 0.62, treasure(2))}</g>` : '<path d="M194 70 h12" stroke="#6b4a2a" stroke-width="5" stroke-linecap="round"/>'}
    <g transform="translate(200 224)">${clockFace(hour, 56)}</g>
  </g>`;
}

/**
 * The village in the morning with the chapel on its dune. `bell`: the
 * klokje is back. `prints`: footprints in the sand before the door.
 * `back`/`front` add SVG behind and in front of the chapel.
 */
function village({ bell = false, back = '', front = '', chapel = [900, 74, 0.82], ground = 606 } = {}) {
  const [cx, cy, cs] = chapel;
  return `${daySky()}
    ${hill(470, HILL_FAR, 40)}
    ${houses([[150, 300, 1.7], [330, 330, 1.4], [1300, 300, 1.7], [1460, 330, 1.4]], { roofs: ROOFS })}
    ${back}
    <path d="M0 ${ground} Q400 ${ground - 40} 800 ${ground - 10} T1600 ${ground} V900 H0Z" fill="${GRASS}"/>
    <path d="M${cx + 60} ${ground + 4} Q${cx + 164 * cs} ${ground - 14} ${cx + 340 * cs} ${ground} L${cx + 420 * cs} 900 H${cx - 100} Z" fill="${SAND}"/>
    ${at(cx, cy, cs, dayChapel({ bell }))}
    ${front}`;
}

// ---------- the woods and the big tree ----------

/** Woods by day: trees behind, a mossy floor, `path` (a forest trail across). */
function woods({ path = true, light = true } = {}) {
  const back = [[-60, 160, 1.3, 2], [140, 120, 1.5, 0], [380, 170, 1.2, 1], [600, 110, 1.6, 2], [880, 150, 1.3, 0], [1100, 120, 1.5, 1], [1340, 160, 1.3, 2], [1480, 110, 1.5, 0]];
  return `<rect width="1600" height="900" fill="#bfe6c4"/>
    ${light ? '<circle cx="800" cy="80" r="420" fill="#fffbe0" opacity=".45"/>' : ''}
    ${back.map(([x, y, s, k]) => at(x, y, s, leafTree(k))).join('')}
    <path d="M0 600 Q400 570 800 590 T1600 580 V900 H0Z" fill="#5a9e48"/>
    ${path ? '<path d="M-20 760 Q400 640 800 690 T1640 640 V720 Q1200 760 800 770 T-20 860Z" fill="#c99a62"/>' : ''}
    ${[[120, 640], [520, 610], [1000, 620], [1420, 640]].map(([x, y]) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="20" rx="70" ry="26" fill="#3f8a44"/><ellipse cx="40" cy="10" rx="50" ry="24" fill="#4f9a4a"/></g>`).join('')}`;
}

/**
 * The big tree, in a 600×900 box (trunk foot at 300, 900): a thick trunk,
 * branches and a wide crown. The magpie's nest sits on the high branch at
 * about (430, 210); `glint` makes something in it sparkle.
 */
function bigTree({ glint = false, nest = true } = {}) {
  return `<g class="big-tree">
    <path d="M220 900 Q250 700 252 520 Q240 380 170 300 L196 280 Q270 350 290 440 Q300 340 280 220 L320 214 Q330 330 316 430 Q360 330 430 260 L450 286 Q370 370 344 520 Q350 700 390 900Z" fill="${BARK}" stroke="${BARK_DARK}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M270 880 Q280 700 276 560 M320 880 Q316 720 322 600" stroke="${BARK_DARK}" stroke-width="5" fill="none" opacity=".6"/>
    <path d="M190 900 q20 -30 50 -20 M400 900 q-14 -30 -44 -24" stroke="${BARK_DARK}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <g opacity=".96">
      <circle cx="140" cy="230" r="120" fill="${LEAF[2]}"/><circle cx="470" cy="210" r="120" fill="${LEAF[2]}"/>
      <circle cx="300" cy="130" r="150" fill="${LEAF[0]}"/><circle cx="170" cy="120" r="100" fill="${LEAF[1]}"/>
      <circle cx="440" cy="110" r="100" fill="${LEAF[1]}"/><circle cx="240" cy="60" r="60" fill="#8fd07a" opacity=".5"/>
    </g>
    <path d="M360 250 Q400 236 470 232" stroke="${BARK}" stroke-width="22" stroke-linecap="round"/>
    ${nest ? `<g transform="translate(380 176)">
      <path d="M0 40 Q50 70 110 40 Q104 74 56 80 Q8 76 0 40Z" fill="#9a6a32" stroke="#4a2f1a" stroke-width="5"/>
      <path d="M8 50 Q56 70 102 48 M18 62 Q56 76 94 60" stroke="#5a3a1a" stroke-width="4" fill="none"/>
      ${glint ? `<circle cx="56" cy="40" r="44" fill="url(#g-lantern)"/>${sparkle(40, 28, 16)}${sparkle(76, 22, 12)}` : ''}
    </g>` : ''}
  </g>`;
}

// ---------- the nest ----------

/** A spoon, a coin, a ring and a button: the magpie's shiny things (100×100 each). */
export const SHINY = {
  lepel: () => picture('lepel'),
  munt: () => picture('munt'),
  ring: () => `<g><ellipse cx="50" cy="56" rx="30" ry="26" fill="none" stroke="#b8862a" stroke-width="14"/><ellipse cx="50" cy="56" rx="30" ry="26" fill="none" stroke="url(#g-gold)" stroke-width="9"/>
    <path d="M40 28 l10 -14 l10 14 l-10 8z" fill="#9fe0ff" stroke="#3a7aa8" stroke-width="3"/></g>`,
  knoop: () => picture('knoop'),
};

/** A shiny coat button: `fill`, `rim`, `holes` (2 or 4) and an optional shape on it. */
function button(fill, rim, { holes = 4, shape = 'round', mark = '' } = {}) {
  const body = {
    round: `<circle cx="50" cy="50" r="38" fill="${fill}" stroke="${rim}" stroke-width="5"/><circle cx="50" cy="50" r="28" fill="none" stroke="${rim}" stroke-width="2.5" opacity=".6"/>`,
    square: `<rect x="14" y="14" width="72" height="72" rx="16" fill="${fill}" stroke="${rim}" stroke-width="5"/><rect x="24" y="24" width="52" height="52" rx="10" fill="none" stroke="${rim}" stroke-width="2.5" opacity=".6"/>`,
    flower: `${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="50" cy="26" r="16" fill="${fill}" stroke="${rim}" stroke-width="4" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="26" fill="${fill}"/>`,
    heart: `<path d="M50 84 C18 62 10 42 24 26 C36 14 50 22 50 32 C50 22 64 14 76 26 C90 42 82 62 50 84Z" fill="${fill}" stroke="${rim}" stroke-width="5" stroke-linejoin="round"/>`,
    star: `<path d="${STAR}" fill="${fill}" stroke="${rim}" stroke-width="5" stroke-linejoin="round"/>`,
  }[shape];
  const pts = holes === 2 ? [[42, 50], [58, 50]] : [[42, 42], [58, 42], [42, 58], [58, 58]];
  return `<g class="coat-button">${body}${mark}${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#1b1330" opacity=".7"/>`).join('')}
    <path d="M26 34 q6 -12 18 -16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/></g>`;
}

/** Eight different shiny buttons for the magpie's pairs. */
export const BUTTONS = [
  () => button('#e0474c', '#7a1f1a'),
  () => button('url(#g-gold)', '#8c6420', { shape: 'star', holes: 2 }),
  () => button('#3f7fd0', '#14284a', { shape: 'square' }),
  () => button('#5fae52', '#2f5a2a', { shape: 'flower', holes: 2 }),
  () => button('url(#g-silver)', '#5a6070'),
  () => button('#b36bd0', '#4a2060', { shape: 'heart', holes: 2 }),
  () => button('#f29a3a', '#8a4a12', { holes: 2 }),
  () => button('#fffaf0', '#9a8a6a', { shape: 'square', holes: 2 }),
];

/** Opa Bram's black stone without its glow: in the nest by day it is just a dull stone. 100×100. */
export function dullStone() {
  return `<g class="dull-stone">
    <ellipse cx="50" cy="86" rx="30" ry="5" fill="#000" opacity=".2"/>
    <path d="M50 22 L74 36 L72 74 L48 86 L26 72 L28 38Z" fill="#1e1a2e" stroke="#5a4a7a" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M50 22 L46 50 L72 74 M46 50 L26 72 M46 50 L28 38" stroke="#3a2f55" stroke-width="2.5" fill="none"/>
  </g>`;
}

/**
 * The magpie's nest, close up, in an 800×420 box: a big bowl of twigs on
 * a branch, its inside dark, with the front rim over the lower half of what
 * lies in it. `things`: a spoon, a coin and a ring; `klokje`; `buttons`
 * (after the trade); `stone` adds the black stone, dull or `glowing`; `lit`
 * makes the things shine.
 */
function bigNest({ things = true, klokje = true, buttons = false, lit = true, stone = true, glowing = false } = {}) {
  const items = [];
  if (things) items.push(at(110, 110, 1.3, SHINY.lepel()), at(230, 140, 1.1, SHINY.munt()), at(500, 140, 1.1, SHINY.ring()));
  if (buttons) items.push(...[[200, 160], [290, 180], [430, 175], [520, 160], [360, 190]].map(([x, y], k) => at(x, y, 0.8, BUTTONS[k]())));
  if (klokje) items.push(`${lit ? '<circle cx="380" cy="150" r="130" fill="url(#g-lantern)"/>' : ''}${at(300, 40, 1.6, treasure(2))}`);
  if (stone) items.push(glowing ? at(570, 110, 1.4, picture('zwarteSteen')) : at(590, 140, 1.2, dullStone()));
  return `<g class="big-nest">
    <path d="M-40 350 Q300 320 840 370" stroke="${BARK}" stroke-width="60" stroke-linecap="round"/>
    <path d="M-40 350 Q300 320 840 370" stroke="${BARK_DARK}" stroke-width="6" fill="none" opacity=".5"/>
    <ellipse cx="400" cy="236" rx="370" ry="70" fill="#7a5028" stroke="#3f2612" stroke-width="7"/>
    <ellipse cx="400" cy="244" rx="330" ry="50" fill="#4a2f16"/>
    ${items.join('')}
    <path d="M30 236 Q400 330 770 236 Q750 380 400 392 Q50 380 30 236Z" fill="#a8743a" stroke="#4a2f1a" stroke-width="6"/>
    <g stroke="#5a3a1a" stroke-width="5" stroke-linecap="round" fill="none">
      <path d="M60 266 Q400 350 740 266 M100 306 Q400 380 700 306 M150 344 Q400 396 650 344 M100 250 L200 360 M260 280 L330 380 M420 290 L380 386 M560 280 L500 380 M690 256 L600 360"/>
    </g>
    <g stroke="#c9945a" stroke-width="4" stroke-linecap="round"><path d="M40 236 L0 214 M760 236 L800 212 M200 280 L160 266 M620 280 L670 266"/></g>
    ${lit && things ? sparkle(180, 120, 18) + sparkle(560, 130, 16) + sparkle(420, 50, 20) : ''}
  </g>`;
}

/** High in the tree: leaves all round, a branch with the nest. `dusk` darkens it. */
function canopy({ dusk = false } = {}) {
  const leaves = [[80, 90, 150], [330, 40, 170], [620, 70, 150], [980, 40, 170], [1260, 90, 150], [1520, 60, 150], [-20, 420, 160], [1600, 400, 160], [150, 800, 170], [1450, 820, 170]];
  return `<rect width="1600" height="900" fill="${dusk ? '#2c4a3a' : '#a8dcb0'}"/>
    ${leaves.map(([x, y, r], k) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${dusk ? ['#1f3a2c', '#25443a', '#1a3326'][k % 3] : LEAF[k % 3]}"/>`).join('')}
    <path d="M-20 660 Q600 600 1640 700" stroke="${BARK}" stroke-width="80" stroke-linecap="round"/>`;
}

// ---------- the koster's kitchen ----------

/** The koster's kitchen: a sunny window, a cupboard with plates, the table with the chess board. */
function kitchen({ table = true, pieces = true } = {}) {
  const tiles = [];
  for (let y = 0; y < 620; y += 60) for (let x = (y / 60) % 2 ? -30 : 0; x < 1600; x += 60) tiles.push(`<rect x="${x + 2}" y="${y + 2}" width="56" height="56" rx="4"/>`);
  return `<rect width="1600" height="900" fill="#f4ead2"/>
    <g fill="#eadcbc">${tiles.join('')}</g>
    <rect x="1140" y="90" width="300" height="250" rx="10" fill="${SKY}" stroke="#7a5230" stroke-width="16"/>
    <circle cx="1350" cy="160" r="50" fill="url(#g-sun)"/>${at(1150, 220, 0.6, leafTree(0))}
    <path d="M1290 90 V340 M1140 215 H1440" stroke="#7a5230" stroke-width="10"/>
    <rect x="60" y="120" width="260" height="480" fill="#8a5a2e" stroke="#3a2210" stroke-width="8"/>
    ${[200, 330, 460].map((y) => `<rect x="70" y="${y}" width="240" height="14" fill="#6b4024"/>`).join('')}
    ${[[110, 170], [190, 170], [270, 170], [130, 300], [230, 300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30" fill="#fffaf0" stroke="#3f7fd0" stroke-width="6"/>`).join('')}
    <rect y="620" width="1600" height="280" fill="#b07a42"/>
    ${[0, 1, 2, 3, 4, 5].map((k) => `<path d="M0 ${650 + k * 44} H1600" stroke="#9a6232" stroke-width="4"/>`).join('')}
    ${table ? `<rect x="520" y="520" width="560" height="40" rx="8" fill="#9a6232" stroke="#4a2f16" stroke-width="6"/>
      <path d="M570 560 V760 M1030 560 V760" stroke="#6b4024" stroke-width="26"/>
      ${tableBoard()}
      ${pieces ? [[748, 470, '#f2d7a6'], [826, 446, '#5a3418'], [900, 468, '#5a3418'], [862, 500, '#f2d7a6']].map(([x, y, c]) => `<path d="M${x - 18} ${y} h36 l-9 -40 a12 12 0 1 0 -18 0z" fill="${c}" stroke="#2a1a0e" stroke-width="4"/>`).join('') : ''}` : ''}`;
}

/** The chess board lying on the kitchen table, seen from the side: 5×5 squares in perspective. */
function tableBoard() {
  // Corners: back edge (720–940, y 446), front edge (680–980, y 522).
  const pt = (u, v) => [720 - 40 * v + (220 + 80 * v) * u, 446 + 76 * v];
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const q = [pt(c / 5, r / 5), pt((c + 1) / 5, r / 5), pt((c + 1) / 5, (r + 1) / 5), pt(c / 5, (r + 1) / 5)];
      cells.push(`<path d="M${q.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join('L')}Z" fill="${(r + c) % 2 ? '#a8703a' : '#f0d4a0'}"/>`);
    }
  }
  return `<path d="M714 440 L946 440 L990 530 L670 530Z" fill="#5a3c22"/>${cells.join('')}`;
}

// ---------- the suspect board in scenes ----------

/** The board on an easel, `turned` cards turned over; [x, y, scale] of its 440×400 box. */
function easel(suspects, turned, [x, y, s]) {
  return `${at(x, y, s, `<path d="M60 380 L20 640 M380 380 L420 640 M220 400 V620" stroke="#6b4024" stroke-width="18" stroke-linecap="round"/>${suspectBoard(suspects, turned)}`)}`;
}

// ---------- Book 3 scenes ----------

/**
 * Story scenes for Book 3. `done` is how many chapters are done (the
 * klokje is back after the last), `suspects` the book's suspects and
 * `turned` (a Set) the ones turned over so far.
 */
function scene(name, { done = 0, suspects = [], turned = new Set() } = {}) {
  const p = progressOf(done);
  const pimAt = (x = 330, y = 300, s = 2) => at(x, y, s, pimAlone());
  switch (name) {
    case 'painting':
      // Hugo climbs out of the painting; Pim holds his hand.
      return `<rect width="1600" height="900" fill="#e8d6b0"/>
        ${Array.from({ length: 16 }, (_, k) => `<rect x="${k * 100}" y="0" width="50" height="620" fill="#e0caa0"/>`).join('')}
        <rect y="620" width="1600" height="280" fill="#9a6a3a"/>
        ${at(640, 40, 5.4, hugoPortrait({ free: true }))}
        ${at(720, 180, 1.8, hugoKind({ pose: 'wave', mood: 'surprised' }))}
        ${pimAt(420, 310, 2)}
        <path d="M552 452 Q660 430 784 488" stroke="#3f7fd0" stroke-width="16" stroke-linecap="round" fill="none"/>
        <circle cx="788" cy="490" r="12" fill="#f7d1b0" stroke="#8a5a3a" stroke-width="3"/>
        ${sparkle(1030, 120, 22)}${sparkle(660, 90, 16)}${sparkle(1110, 330, 14)}`;
    case 'kind':
      // Hugo helps in the village: he carries a basket of apples for a neighbour.
      return village({
        bell: true,
        front: `${at(420, 230, 1.7, hugoKind({ pose: 'wave' }))}
          ${at(700, 330, 1.7, villager('#d8433a', { arms: true }))}
          ${[[300, 420], [340, 440], [280, 450]].map(([x, y]) => `<g transform="translate(${x} ${y})">${flower('#f2c23a')}</g>`).join('')}
          ${hearts([[880, 260], [960, 220]], null)}`,
      });
    case 'gone':
      // Close by the tower: the arch is empty.
      return `${daySky({ clouds: [[180, 140, 1.1], [1180, 90, 0.9]] })}
        ${at(520, 60, 1.4, dayChapel({ bell: false }))}
        <circle cx="800" cy="210" r="90" fill="none" stroke="#e0474c" stroke-width="10" stroke-dasharray="26 14"/>
        ${shout(1000, 260, '?!', 150, '#e0474c')}`;
    case 'blame':
      return village({
        front: `${at(300, 300, 1.7, villager('#3f7fd0'))}${at(450, 320, 1.6, villager('#9a62b3'))}
          <path d="M412 428 L470 396 M556 438 L620 404" stroke="#f7d1b0" stroke-width="14" stroke-linecap="round"/>
          ${at(660, 210, 1.7, hugoKind({ mood: 'sad' }))}
          <g transform="translate(250 290)">${bubble('Hugo!', 230)}</g>`,
      });
    case 'board':
    case 'oneLeft':
      // Pim with his magnifying glass at the suspect board; Barend beside him.
      return `${daySky({ clouds: [[1100, 80, 0.8]] })}${hill(560, HILL_FAR, 40)}
        <path d="M0 620 Q800 590 1600 620 V900 H0Z" fill="${GRASS}"/>
        ${easel(suspects, turned, [720, 70, 1.25])}
        ${at(330, 300, 2, pimLooking())}${barendBy(330, 300)}
        ${name === 'oneLeft' ? `<g transform="translate(400 320)">${bubble('De ekster!', 300, { size: 50 })}</g>` : ''}`;
    case 'look':
      return village({ front: `${at(380, 300, 2, pimLooking())}${barendBy(380, 300)}` });
    case 'step':
      // The doorstep, close up: a black-and-white feather lies on it.
      return `<rect width="1600" height="900" fill="#fbf4e4"/>
        <path d="M520 0 V560 H1080 V0" fill="#7a4a28" stroke="#3a2210" stroke-width="12"/>
        ${[620, 720, 800, 880, 980].map((x) => `<path d="M${x} 0 V560" stroke="#5a3418" stroke-width="8"/>`).join('')}
        <rect x="380" y="560" width="840" height="90" fill="#c9c2b0" stroke="#8a8270" stroke-width="8"/>
        <rect y="650" width="1600" height="250" fill="${SAND}"/>
        ${at(560, 470, 3.4, lyingFeather())}
        <g transform="translate(260 260) rotate(-12) scale(2.2)"><circle cx="40" cy="40" r="30" fill="#cfe8ff" fill-opacity=".35"/></g>
        ${at(220, 220, 2.2, picture('vergrootglas'))}`;
    case 'feathers':
      // The feather is black and white; Hugo points at his red one.
      return village({
        front: `${at(260, 200, 1.9, hugoKind({ pose: 'think', mood: 'surprised' }))}
          <circle cx="640" cy="290" r="120" fill="#fffaf0" stroke="#d8433a" stroke-width="8"/>${at(550, 200, 1.8, picture('veerRood'))}
          <circle cx="1000" cy="290" r="120" fill="#fffaf0" stroke="#1b2030" stroke-width="8"/>${at(910, 200, 1.8, picture('veerZwartWit'))}
          <g stroke="#1b1330" stroke-width="16" stroke-linecap="round"><path d="M790 264 H850 M790 316 H850 M842 236 L798 344"/></g>`,
      });
    case 'sand':
      // Smooth sand, no footprints; something flew from the tower to the woods.
      return village({
        front: `<path d="M1010 140 Q760 20 420 120" stroke="#3a2410" stroke-width="7" stroke-dasharray="4 22" stroke-linecap="round" fill="none"/>
          ${at(330, 60, 1.1, flyingMagpie({ faint: true }))}
          ${at(380, 300, 2, pimLooking())}${barendBy(380, 300)}
          ${shout(700, 330, '?', 120)}`,
      });
    case 'owl':
    case 'owlSaw': {
      const saw = name === 'owlSaw';
      return `${woods({ path: false })}
        <path d="M1700 300 Q1300 310 900 360" stroke="${BARK}" stroke-width="36" stroke-linecap="round"/>
        ${at(900, 120, 2.6, picture('uil'))}
        ${saw
          ? `<g transform="translate(900 270) scale(1.5)">${bubble('', 300, { flipTail: true })}</g>${at(580, 80, 1.25, flyingMagpie())}${at(730, 100, 0.55, treasure(2))}${sparkle(800, 100, 18, '#f2c23a')}${sparkle(720, 170, 12, '#f2c23a')}`
          : `<g transform="translate(860 170)">${bubble('Oehoe!', 280, { flipTail: true })}</g>`}
        ${at(300, 316, 2, pimLooking())}${barendBy(300, 316)}`;
    }
    case 'kitchen':
    case 'mate':
      return `${kitchen()}
        ${at(340, 280, 2.1, koster({ arms: name === 'mate' }))}
        ${at(1000, 200, 1.75, hugoKind({ pose: name === 'mate' ? 'cheer' : 'stand' }))}
        ${name === 'mate' ? shout(680, 200, 'Schaakmat!', 96) : `<g transform="translate(480 250)">${bubble('Hugo was hier!', 380, { size: 48 })}</g>`}`;
    case 'stable':
      return `${daySky({ clouds: [[300, 90, 1]] })}
        <path d="M0 600 Q800 570 1600 600 V900 H0Z" fill="#c9a866"/>
        ${at(500, -40, 6.4, stable(false))}
        <ellipse cx="770" cy="600" rx="190" ry="34" fill="#e8c86a"/>
        ${Array.from({ length: 14 }, (_, k) => `<path d="M${600 + k * 25} ${590 + (k % 3) * 8} l${30 + (k % 4) * 6} ${-10 + (k % 5) * 4}" stroke="#c9a44a" stroke-width="6" stroke-linecap="round"/>`).join('')}
        ${at(620, 360, 3, sleepingGoat())}${zzz(900, 380, 1.4, '#ffffff')}
        ${at(260, 300, 2, pimLooking())}`;
    case 'trail':
      return `${woods()}
        ${[[700, 640, -20], [960, 620, 10], [1220, 600, -10]].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">${at(-90, -60, 1.6, lyingFeather())}</g>`).join('')}
        ${at(260, 250, 3.8, pim({ glow: false }))}`;
    case 'bigTree':
      return `${woods()}
        ${at(700, -10, 1, bigTree({ glint: true }))}
        ${at(300, 270, 3.6, pim({ glow: false }))}`;
    case 'nestDark':
      return `${canopy({ dusk: true })}
        ${at(500, 230, 1, bigNest({ lit: false }))}
        ${at(220, 260, 1.9, pimAlone())}
        <circle cx="320" cy="400" r="60" fill="url(#g-lantern)"/>`;
    case 'nestLit':
      return `${canopy({ dusk: false })}
        ${at(500, 230, 1, bigNest({ lit: true }))}
        ${at(220, 260, 1.9, pimAlone({ arms: true }))}`;
    case 'magpie':
      return `${canopy()}
        ${at(560, 300, 0.9, bigNest({ klokje: false, things: true }))}
        ${at(860, 60, 2.6, picture('ekster'))}
        ${at(1060, 146, 0.9, treasure(2))}
        ${at(300, 230, 1.6, hugoKind({ pose: 'think' }))}`;
    case 'buttons':
      return `${canopy()}
        ${at(1100, 60, 3.4, flip(picture('ekster')))}
        ${at(420, 160, 2, hugoKind({ pose: 'open' }))}
        ${sparkle(560, 440, 16)}${sparkle(640, 470, 12)}`;
    case 'trade':
      return `${canopy()}
        ${at(560, 300, 0.9, bigNest({ klokje: false, things: true, buttons: true }))}
        ${at(1000, 60, 2.4, picture('ekster'))}
        ${at(300, 240, 1.9, pimAlone({ arms: true }))}
        <circle cx="400" cy="230" r="90" fill="url(#g-lantern)"/>${at(340, 160, 1.2, treasure(2))}`;
    case 'towerUp':
      return `${towerInside()}
        <path d="M790 60 V100" stroke="#6b4a2a" stroke-width="8"/>
        <circle cx="790" cy="180" r="120" fill="url(#g-lantern)"/>${at(700, 90, 1.8, treasure(2))}${sparkle(920, 130, 18)}
        ${at(360, 230, 1.8, hugoKind({ pose: 'cheer' }))}`;
    case 'back':
      return village({ bell: true, front: `${ringing(1064, 120, 1)}${at(360, 300, 2, pimAlone({ arms: true }))}${barendBy(360, 300)}` });
    case 'sorry':
      return village({
        bell: true,
        front: `${at(260, 320, 1.6, villager('#3f7fd0'))}${at(400, 330, 1.5, villager('#9a62b3'))}${at(520, 320, 1.6, villager('#4f8a5a'))}
          ${at(640, 220, 1.7, hugoKind({ mood: 'happy' }))}
          <g transform="translate(300 300)">${bubble('Sorry, Hugo!', 380, { size: 48 })}</g>`,
      });
    case 'ring':
      return `${towerInside()}
        ${at(730, 40, 1.4, treasure(2))}${ringing(800, 70, 1.4)}
        <path d="M800 150 V700" stroke="#c9a466" stroke-width="10"/>
        ${at(606, 250, 1.6, hugoKind({ pose: 'ring', mood: 'happy' }))}
        ${shout(1080, 230, 'Bim bam!', 100)}`;
    case 'friends':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        <circle cx="1460" cy="420" r="160" fill="url(#g-sun)"/>${cloud(150, 100, 1)}${cloud(900, 60, 0.9)}
        ${hill(560, HILL_FAR, 40)}
        <path d="M0 620 Q800 590 1600 620 V900 H0Z" fill="${GRASS}"/>
        ${at(1180, 110, 0.7, dayChapel({ bell: true }))}
        ${at(330, 300, 2, pimAlone({ arms: true }))}${barendBy(330, 300)}
        ${at(660, 200, 1.75, hugoKind({ pose: 'cheer' }))}
        ${hearts([[600, 160], [700, 110], [800, 160]], null)}`;
    case 'nestNight':
      // After „Einde.”: the nest at night, and the black stone starts to glow.
      return `<rect width="1600" height="900" fill="url(#g-night)"/>
        <circle cx="1350" cy="130" r="90" fill="url(#g-moon)"/>
        ${[[200, 80], [420, 160], [640, 60], [980, 120], [1150, 220], [300, 300]].map(([x, y]) => `<circle class="star" cx="${x}" cy="${y}" r="3" fill="#fff8d8"/>`).join('')}
        ${[[-40, 760, 200], [1640, 780, 200]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#152a20"/>`).join('')}
        <g class="night-nest">${at(240, 160, 1.4, bigNest({ things: false, klokje: false, buttons: true, lit: false, stone: true, glowing: true }))}</g>
        <rect width="1600" height="900" fill="#05081a" opacity=".2"/>
        <circle class="stone-glow" cx="1136" cy="424" r="200" fill="#b58cff" opacity=".35" filter="url(#f-soft)"/>`;
    default:
      return village({ bell: p.bell });
  }
}

/** Inside the bell tower by day: white stone, a beam, the village through the arch. */
function towerInside() {
  const blocks = [];
  for (let y = 0; y < 900; y += 90) for (let x = (y / 90) % 2 ? -80 : 0; x < 1600; x += 160) blocks.push(`<rect x="${x + 4}" y="${y + 4}" width="152" height="82" rx="8"/>`);
  return `<rect width="1600" height="900" fill="#d8ccb0"/>
    <g fill="#e8dcc0">${blocks.join('')}</g>
    <path d="M1100 520 V300 a170 170 0 0 1 340 0 V520z" fill="${SKY}" stroke="#a89878" stroke-width="22"/>
    ${at(1120, 300, 0.6, leafTree(1))}${houses([[1200, 410, 0.9], [1320, 420, 0.8]], { roofs: ROOFS })}
    <path d="M1110 470 Q1270 440 1430 470 V520 H1110Z" fill="${GRASS}"/>
    <rect y="0" width="1600" height="60" fill="#7a5230"/>
    <rect y="700" width="1600" height="200" fill="#9a6a3a"/>`;
}

// ---------- the book map ----------

/** Where things stand on the map, per layout: chapel [x, y, s], tree [x, y, s], board [x, y, s], trail points. */
const MAP_AT = {
  map: {
    chapel: [230, 160, 0.62], tree: [1060, 20, 0.92], board: [560, 110, 0.86], ground: 560,
    trees: [[900, 250, 0.9, 1], [1010, 300, 0.75, 0]],
    trail: [[400, 600], [470, 640], [560, 650], [650, 640], [740, 660], [830, 650], [920, 660], [1010, 640], [1100, 650], [1190, 630], [1260, 610], [1320, 600]],
    owl: [1000, 250, 0.9], houses: [[60, 300, 1.4], [150, 340, 1.2]], feathers: [[1170, 590], [1230, 575], [1290, 590]],
  },
  // A phone shows only about x 600–1000: the board top left, the tree's crown beside it and the
  // chapel under it, all above the stops (the path of stops is the trail here, so no footprints).
  tall: {
    chapel: [612, 372, 0.26], tree: [830, 140, 0.42], board: [604, 92, 0.62], ground: 520,
    trees: [], trail: [],
    owl: [968, 330, 0.42], houses: [], feathers: [[900, 530], [940, 542], [980, 530]],
  },
};

/** Footprints, Pim's boots and Barend's hooves, along `points`. */
function prints(points) {
  return `<g class="map-prints" opacity=".75">${points
    .map(([x, y], i) => (i % 2 ? `<g transform="translate(${x} ${y})" fill="#6b4a2a"><ellipse cx="-5" cy="0" rx="4" ry="7"/><ellipse cx="5" cy="0" rx="4" ry="7"/></g>` : `<ellipse cx="${x}" cy="${y}" rx="7" ry="12" fill="#3a2a1a" transform="rotate(70 ${x} ${y})"/>`))
    .join('')}</g>`;
}

/** The book map's backdrop: the village by day, the woods and the big tree, and the suspect board. */
function map({ done = [], tall = false, suspects = [], turned = new Set() } = {}) {
  const p = progressOf(done);
  const L = MAP_AT[tall ? 'tall' : 'map'];
  // The footprints grow by two chapters' worth for each chapter done.
  const steps = L.trail.slice(0, p.count * 2);
  return `${daySky({ sun: tall ? [1000, 60] : [1480, 90], clouds: tall ? [[600, 30, 0.6]] : [[300, 60, 0.8], [760, 40, 0.6]] })}
    ${hill(L.ground - 120, HILL_FAR, 40)}
    ${houses(L.houses, { roofs: ROOFS })}
    ${L.trees.map(([x, y, sc, k]) => at(x, y, sc, leafTree(k))).join('')}
    ${at(...L.tree, bigTree({ glint: p.nest && !p.bell }))}
    <path d="M0 ${L.ground} Q400 ${L.ground - 30} 800 ${L.ground - 10} T1600 ${L.ground} V900 H0Z" fill="${GRASS}"/>
    ${at(...L.chapel, dayChapel({ bell: p.bell }))}
    ${p.owl ? at(...L.owl, picture('uil')) : ''}
    ${p.feathers ? L.feathers.map(([x, y]) => at(x - 30, y - 30, 0.6, picture('veerZwartWit'))).join('') : ''}
    ${prints(steps)}
    ${at(...L.board, suspectBoard(suspects, turned))}`;
}

/** Book 3's cover picture (240×250): the empty tower, the magnifying glass and a black-and-white feather. */
function cover() {
  return `<rect width="240" height="250" fill="${SKY}"/><circle cx="200" cy="40" r="40" fill="url(#g-sun)"/>
    <path d="M0 200 Q120 180 240 200 V250 H0Z" fill="${GRASS}"/>
    ${at(-20, 40, 0.38, dayChapel({ bell: false }))}
    ${at(100, 70, 1.3, picture('vergrootglas'))}
    ${at(120, 150, 0.9, picture('veerZwartWit'))}
    ${at(160, 10, 0.5, flyingMagpie())}`;
}

// ---------- "Wat is er anders?" (chapter 3.1) ----------

/** Where each difference is drawn in the 800×600 pictures (see spot.js), each in its own square of the 4×3 grid. */
export const SPOTS = { klokje: [300, 145], veer: [305, 482], sporen: [500, 535], bloem: [80, 372], vlinder: [650, 120] };

/**
 * The chapel yesterday and today, close up, in an 800×600 box: the bell
 * tower with its big arch, the door with its step, and the sand in front.
 * Yesterday the klokje hangs in the arch, a red flower grows by the wall
 * and footprints lead through the sand. Today the arch is empty, a
 * black-and-white feather lies on the step, the sand is smooth, the flower
 * is yellow and a butterfly flies by. The story's differences are drawn big
 * (the bell is about an eighth of the picture wide).
 */
export function spotChapel(day) {
  const today = day === 'today';
  const prints = [[430, 500], [462, 520], [494, 534], [526, 552], [558, 566]];
  const arch = 'M240 212 V150 a60 60 0 0 1 120 0 V212z';
  return `<rect width="800" height="600" fill="${SKY}"/>
    <rect y="220" width="800" height="380" fill="${SKY_LOW}" opacity=".7"/>
    <circle cx="90" cy="80" r="80" fill="url(#g-sun)"/>
    ${cloud(440, 40, 0.8)}
    <path d="M0 400 Q200 370 400 392 T800 380 V600 H0Z" fill="${HILL_FAR}"/>
    ${houses([[560, 300, 1.2], [680, 320, 1]], { roofs: ROOFS })}
    <path d="M0 470 Q400 450 800 466 V600 H0Z" fill="${GRASS}"/>
    <path d="M220 480 Q520 460 800 500 V600 H160Z" fill="${SAND}"/>
    <polygon points="100,340 300,248 500,340" fill="#b85450" stroke="#6a2a2a" stroke-width="6" stroke-linejoin="round"/>
    <rect x="124" y="334" width="352" height="146" fill="#fbf4e4" stroke="#8c7f66" stroke-width="6"/>
    ${[150, 404].map((x) => `<path d="M${x} 450 V392 a23 23 0 0 1 46 0 V450z" fill="#bfe3f5" stroke="#8c7f66" stroke-width="5"/><path d="M${x + 23} 370 V450" stroke="#8c7f66" stroke-width="4"/>`).join('')}
    <rect x="228" y="56" width="144" height="250" fill="#f4ecd8" stroke="#8c7f66" stroke-width="6"/>
    <polygon points="212,62 300,-20 388,62" fill="#a04848" stroke="#6a2a2a" stroke-width="6" stroke-linejoin="round"/>
    <path d="${arch}" fill="#4a3a2e" stroke="#8c7f66" stroke-width="6"/>
    <path d="M300 90 V106" stroke="#6b4a2a" stroke-width="6"/>
    ${today ? '<path d="M290 106 h20" stroke="#6b4a2a" stroke-width="7" stroke-linecap="round"/>' : `<g class="klokje">${at(240, 92, 1.2, treasure(2))}</g>`}
    <g transform="translate(300 260)">${clockFace(9, 34)}</g>
    <path d="M255 480 V410 a45 45 0 0 1 90 0 V480z" fill="#7a4a28" stroke="#3a2210" stroke-width="5"/>
    <path d="M285 480 V378 M315 480 V378" stroke="#5a3418" stroke-width="4"/>
    <rect x="226" y="476" width="148" height="26" rx="5" fill="#c9c2b0" stroke="#8a8270" stroke-width="4"/>
    <g transform="translate(40 336) scale(2)">${flower(today ? '#f2c23a' : '#e0474c')}</g>
    ${today ? `<g transform="translate(222 432) scale(1.35)">${lyingFeather()}</g>` : ''}
    ${today
      ? '<path d="M420 520 q40 -10 80 0 t80 0 M440 566 q40 -10 80 0 t60 0" stroke="#e6cf96" stroke-width="6" fill="none" stroke-linecap="round"/>'
      : prints.map(([x, y], i) => `<ellipse cx="${x}" cy="${y + (i % 2 ? 12 : -12)}" rx="12" ry="20" fill="#7a5a2e" transform="rotate(-62 ${x} ${y + (i % 2 ? 12 : -12)})"/>`).join('')}
    ${today ? at(602, 80, 1.6, butterfly()) : ''}`;
}

// ---------- puzzle backdrops ----------
// Scenes behind a chapter's puzzle (see engines.js). They keep their detail
// away from the middle and are shaded a little so the puzzle stands out.

/** Backdrops behind a Book 3 puzzle (1600×900). */
const BACKDROPS = {
  /** A wooden desk under the two pictures. */
  spot: () => `<rect width="1600" height="900" fill="#8a5a2e"/>
    ${Array.from({ length: 10 }, (_, k) => `<path d="M0 ${k * 96 + 30} Q800 ${k * 96 + 10} 1600 ${k * 96 + 40}" stroke="#7a4e26" stroke-width="6" fill="none"/>`).join('')}
    ${shade(0.25, HAZE)}`,
  owl: () => `${woods({ path: false })}
    <path d="M1700 240 Q1500 250 1260 300" stroke="${BARK}" stroke-width="30" stroke-linecap="round"/>
    ${at(1290, 90, 1.9, picture('uil'))}${shade(0.3, HAZE)}`,
  kitchen: () => `${kitchen({ table: false })}${shade(0.3, HAZE)}`,
  forest: () => `${woods({ path: false })}${at(1250, 40, 0.75, bigTree({ glint: true }))}${shade(0.3, HAZE)}`,
  nest: () => `${canopy({ dusk: true })}${shade()}`,
  cloth: () => `${canopy()}${at(1300, 120, 2, picture('ekster'))}${shade(0.3, HAZE)}`,
  towerDay: () => `${towerInside()}${shade(0.3, HAZE)}`,
};

// ---------- the book ----------

/** Book 3's art, for index.js (see BOOK in art.js). */
export const BOOK = {
  scene,
  map,
  cover,
  // From the chapel on the left, through the woods, to the big tree.
  layouts: () => ({
    landscape: { box: [1600, 900], stops: [[300, 690], [500, 770], [700, 690], [900, 770], [1100, 690], [1280, 760]], end: [1350, 600], goal: [0, 0, 0] },
    portrait: { box: [900, 1600], stops: [[170, 1490], [450, 1440], [730, 1340], [470, 1240], [190, 1130], [470, 1020]], end: [720, 900], goal: [0, 0, 0] },
  }),
  backdrops: BACKDROPS,
};
