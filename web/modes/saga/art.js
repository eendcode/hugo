// Art for the story mode: the book covers, the mode card, Pim's bag, and
// the scenes of Book 1, with the chapel that fills up as the chapters are
// done. Scenes are 1600×900 (like art.js); small pieces are 100×100 boxes
// unless noted. Griezelstand only changes the sky colours (CSS) and the
// Dame's face, never what is shown.

import { pim, dame, hugo, treasure, scenery } from '../../art.js';
import { stable } from '../programma/art.js';
import { candle } from '../spookhuis/art.js';
import { at, flip, shade, ringing, dune, nightSky as sky, houses } from './kit.js';

// ---------- small pieces ----------

/** A clock face showing `hour` o'clock, centred on (0, 0) with radius `r`. */
export function clockFace(hour, r = 50) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const k = i % 3 ? 0.84 : 0.76;
    return `<path d="M${(Math.sin(a) * r * k).toFixed(1)} ${(-Math.cos(a) * r * k).toFixed(1)} L${(Math.sin(a) * r * 0.92).toFixed(1)} ${(-Math.cos(a) * r * 0.92).toFixed(1)}"/>`;
  }).join('');
  const ha = ((hour % 12) * Math.PI) / 6;
  return `<g class="clock-face">
    <circle r="${r}" fill="#fffaf0" stroke="#6b4a2a" stroke-width="${r * 0.12}"/>
    <g stroke="#3a2a1a" stroke-width="${r * 0.06}" stroke-linecap="round">${ticks}</g>
    <path d="M0 0 L${(Math.sin(ha) * r * 0.48).toFixed(1)} ${(-Math.cos(ha) * r * 0.48).toFixed(1)}" stroke="#2a1d1a" stroke-width="${r * 0.13}" stroke-linecap="round"/>
    <path d="M0 0 V${-r * 0.74}" stroke="#2a1d1a" stroke-width="${r * 0.08}" stroke-linecap="round"/>
    <circle r="${r * 0.09}" fill="#c9a13a"/>
  </g>`;
}

/** Pim's bag (satchel), 100×100. */
export function bag() {
  return `<g class="bag-art">
    <path d="M30 34 q20 -30 40 0" stroke="#6b4a2a" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M16 38 h68 l-6 50 q-28 8 -56 0z" fill="#a0683a" stroke="#4a2f16" stroke-width="4" stroke-linejoin="round"/>
    <path d="M16 38 h68 v16 q-34 14 -68 0z" fill="#8a5530" stroke="#4a2f16" stroke-width="4" stroke-linejoin="round"/>
    <rect x="44" y="50" width="12" height="14" rx="3" fill="#f2c23a" stroke="#4a2f16" stroke-width="3"/>
  </g>`;
}

/** A side view of boer Teun's cart, loaded with planks. 200×120. */
function plankCart() {
  const planks = [0, 1, 2].map((k) => `<rect x="${18 + k * 4}" y="${34 - k * 12}" width="${170 - k * 8}" height="12" rx="3" fill="${['#c98a4a', '#d9a066', '#b97a3a'][k]}" stroke="#5a3418" stroke-width="3"/>`).join('');
  const wheel = (x) => `<g transform="translate(${x} 92)"><circle r="24" fill="#6b4a2a" stroke="#3a2210" stroke-width="4"/>
    <path d="M-20 0 H20 M0 -20 V20 M-14 -14 L14 14 M14 -14 L-14 14" stroke="#3a2210" stroke-width="4"/><circle r="6" fill="#3a2210"/></g>`;
  return `<g class="plank-cart">
    ${planks}
    <rect x="10" y="46" width="180" height="26" rx="4" fill="#8a5a2e" stroke="#3a2210" stroke-width="4"/>
    <path d="M10 60 L-14 52" stroke="#6b4a2a" stroke-width="8" stroke-linecap="round"/>
    ${wheel(50)}${wheel(150)}
  </g>`;
}

/** A bale of hay, 200×110. */
function bale(x, y) {
  return `<g transform="translate(${x} ${y})"><rect width="200" height="110" rx="12" fill="#e8c86a" stroke="#9a7a2a" stroke-width="5"/><path d="M0 36 H200 M0 74 H200" stroke="#c9a44a" stroke-width="5"/></g>`;
}

/** A muddy puddle, 100×100 (also Barend's goal in chapter 1.4). */
export function mud() {
  return `<g class="mud">
    <ellipse cx="50" cy="60" rx="44" ry="28" fill="#5a3a1e"/>
    <ellipse cx="48" cy="58" rx="36" ry="21" fill="#7a5230"/>
    <ellipse cx="38" cy="52" rx="12" ry="5" fill="#9a6e42" opacity=".8"/>
    <circle cx="64" cy="62" r="5" fill="none" stroke="#9a6e42" stroke-width="3"/>
    <circle cx="30" cy="66" r="3" fill="none" stroke="#9a6e42" stroke-width="2.5"/>
  </g>`;
}

/** Goat hoof prints along a list of points. */
function hoofTrail(points) {
  return `<g class="hoof-trail" fill="#3a2414" opacity=".85">${points
    .map(([x, y], i) => `<g transform="translate(${x} ${y + (i % 2 ? 10 : -10)})"><ellipse cx="-5" cy="0" rx="4" ry="7"/><ellipse cx="5" cy="0" rx="4" ry="7"/></g>`)
    .join('')}</g>`;
}

/** A beacon on a post: a fire basket that is dark or burning. 100×100. */
function beacon(lit) {
  return `<g class="beacon">
    ${lit ? '<circle cx="50" cy="26" r="46" fill="url(#g-fire)"/>' : ''}
    <rect x="46" y="38" width="8" height="58" fill="#4a2f16"/>
    <path d="M30 30 h40 l-8 14 h-24z" fill="#3a2a1a" stroke="#1b1330" stroke-width="3"/>
    ${lit ? '<g class="flame"><path d="M50 -4 C62 12 64 22 58 30 H42 C36 22 38 12 50 -4Z" fill="#ff8a2f"/><path d="M50 10 C55 18 56 24 54 30 H46 C44 24 45 18 50 10Z" fill="#ffd35a"/></g>' : ''}
  </g>`;
}

/** One of Hugo's goats, facing right; `eyes` glow purple (the curse). 100×100. */
export function darkGoat({ eyes = false } = {}) {
  return `<g class="dark-goat">
    <rect x="31" y="66" width="6" height="18" rx="3" fill="#4a3d5c"/>
    <rect x="41" y="68" width="6" height="17" rx="3" fill="#5a4a6e"/>
    <rect x="57" y="68" width="6" height="17" rx="3" fill="#4a3d5c"/>
    <rect x="65" y="66" width="6" height="18" rx="3" fill="#5a4a6e"/>
    <path d="M24 60 q-8 -6 -4 -12" stroke="#5a4a6e" stroke-width="5" stroke-linecap="round" fill="none"/>
    <ellipse cx="49" cy="64" rx="27" ry="13" fill="#6a5a80" stroke="#1b1330" stroke-width="2"/>
    <path d="M68 58 q6 -14 12 -16" stroke="#6a5a80" stroke-width="12" stroke-linecap="round" fill="none"/>
    <ellipse cx="82" cy="45" rx="9" ry="8" fill="#6a5a80" stroke="#1b1330" stroke-width="2"/>
    <path d="M78 39 q-6 -14 -16 -10" stroke="#c9b48a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M84 52 l2 9 l3 -8z" fill="#4a3d5c"/>
    ${eyes ? '<circle cx="85" cy="43" r="6" fill="#b36bff" opacity=".45" filter="url(#f-soft)"/><circle cx="85" cy="43" r="2.6" fill="#e2b8ff"/>' : '<circle cx="85" cy="43" r="1.8" fill="#d9c7a0"/>'}
  </g>`;
}

/** Hugo's red hat feather, to lay over `hugo()` (200×160 box). */
function feather() {
  return '<path d="M84 20 C70 6 58 -6 46 -12 C58 -4 66 8 78 22Z" fill="#d8433a" stroke="#8a2420" stroke-width="2"/>';
}

/** Hugo on his goat with the red feather; `eyes` makes the goat's eyes glow. 200×160. */
export function rider({ eyes = false, red = false } = {}) {
  const glow = eyes ? '<circle cx="173" cy="86" r="14" fill="#b36bff" opacity=".7" filter="url(#f-soft)"/><circle cx="173" cy="86" r="4.5" fill="#f0d8ff"/>' : '';
  return `${hugo()}${red ? feather() : ''}${glow}`;
}

/** A villager, 100×160: `arms` up when cheering. */
export function villager(coat = '#3f7fd0', { arms = false, hat = null } = {}) {
  const armPath = arms ? 'M34 72 L18 40 M66 72 L82 40' : 'M34 74 L26 108 M66 74 L74 108';
  return `<g class="villager">
    <path d="${armPath}" stroke="#f7d1b0" stroke-width="9" stroke-linecap="round"/>
    <path d="M30 70 q20 -14 40 0 l6 70 h-52z" fill="${coat}" stroke="#1b1330" stroke-width="3"/>
    <rect x="38" y="138" width="9" height="20" rx="3" fill="#3a2a1a"/><rect x="53" y="138" width="9" height="20" rx="3" fill="#3a2a1a"/>
    <circle cx="50" cy="50" r="18" fill="#f7d1b0" stroke="#8a5a3a" stroke-width="2"/>
    <circle cx="44" cy="48" r="2.2" fill="#2b2b2b"/><circle cx="56" cy="48" r="2.2" fill="#2b2b2b"/>
    <path d="M43 57 q7 6 14 0" stroke="#8a4b33" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${hat ?? '<path d="M32 46 q2 -20 18 -20 q16 0 18 20 q-18 -8 -36 0z" fill="#6b4a2a"/>'}
  </g>`;
}

/** Boer Teun: straw hat, green overalls, a red scarf. 100×160. */
export function teun() {
  return villager('#4f8a5a', { hat: '<ellipse cx="50" cy="34" rx="30" ry="7" fill="#e8c86a" stroke="#9a7a2a" stroke-width="2"/><path d="M36 34 q2 -16 14 -16 q12 0 14 16z" fill="#e8c86a" stroke="#9a7a2a" stroke-width="2"/><path d="M38 64 h24 l-4 8 h-16z" fill="#d8433a"/>' });
}

/** Pim on foot (without Barend), 100×160. */
export function pimAlone(o = {}) {
  return villager('#3f7fd0', { ...o, hat: '<path d="M31 48 q1 -26 19 -26 q18 0 19 26z" fill="#d8433a"/><circle cx="31" cy="40" r="6" fill="#fff"/>' });
}

// ---------- the chapel ----------

/**
 * The Duinkapel, large, in a 400×640 box (door at the bottom centre).
 * hour: the tower clock. planks: boards over the door. windows: lit.
 */
export function bigChapel({ hour = 6, planks = false, windows = false, holes = !planks } = {}) {
  const win = (x) => `<path d="M${x} 520 V430 a30 30 0 0 1 60 0 V520z" fill="${windows ? '#ffd35a' : '#2b2f55'}" stroke="#8c7f66" stroke-width="5"/>
    <path d="M${x + 30} 400 V520 M${x} 460 H${x + 60}" stroke="#8c7f66" stroke-width="4"/>`;
  const holeMarks = [[176, 520, 14, 10], [222, 560, 12, 9], [186, 598, 10, 8]]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#14101e"/>`)
    .join('');
  const boards = [[-8, 500], [6, 548], [-5, 596]]
    .map(([r, y]) => `<g transform="rotate(${r} 200 ${y})"><rect x="140" y="${y - 12}" width="120" height="24" rx="4" fill="#c98a4a" stroke="#5a3418" stroke-width="4"/>
      <circle cx="152" cy="${y}" r="3.5" fill="#3a2a1a"/><circle cx="248" cy="${y}" r="3.5" fill="#3a2a1a"/></g>`)
    .join('');
  return `<g class="big-chapel">
    ${windows ? '<circle cx="200" cy="420" r="300" fill="url(#g-lantern)" opacity=".55"/>' : ''}
    <polygon points="0,316 200,196 400,316" fill="#9a4747" stroke="#5a2a2a" stroke-width="5"/>
    <rect x="20" y="310" width="360" height="330" fill="#f1e8d4" stroke="#8c7f66" stroke-width="5"/>
    ${win(60)}${win(280)}
    <path d="M140 640 V520 a60 60 0 0 1 120 0 V640z" fill="#6b4024" stroke="#3a2210" stroke-width="5"/>
    <path d="M170 640 V500 M200 640 V462 M230 640 V500" stroke="#4a2c16" stroke-width="4"/>
    ${holes ? holeMarks : ''}
    ${planks ? boards : '<circle cx="236" cy="590" r="6" fill="#c9a13a"/>'}
    <rect x="128" y="40" width="144" height="290" fill="#ece3cf" stroke="#8c7f66" stroke-width="5"/>
    <polygon points="116,46 200,-70 284,46" fill="#8a3f3f" stroke="#5a2a2a" stroke-width="5"/>
    <path d="M200 -70 v-30 M188 -88 h24" stroke="#6b4a2a" stroke-width="6" stroke-linecap="round"/>
    <path d="M168 132 V92 a32 32 0 0 1 64 0 V132z" fill="#3a2a1a"/>
    <path d="M186 104 q14 -16 28 0 v14 h-28z" fill="#f2c23a" stroke="#8c6420" stroke-width="3"/>
    <g transform="translate(200 220)">${clockFace(hour, 58)}</g>
  </g>`;
}

/**
 * What Book 1's chapters have added to the chapel. `done` is a flag per
 * chapter, or a count (the first `done` chapters).
 */
function progressOf(done) {
  const f = Array.isArray(done) ? done : Array.from({ length: 6 }, (_, i) => i < done);
  return { lights: !!f[0], cart: !!f[1], planks: !!f[2], trail: !!f[3], beacons: !!f[4], windows: !!f[5] };
}

/**
 * Where things stand around the chapel, per layout: `map` for the book map
 * (the path of stops runs along the left), `tall` for the map on a portrait
 * screen (everything in the middle third), and `story` for story pages
 * (everything above the caption).
 */
const LAYOUT = {
  map: {
    chapel: [800, 150, 1], ground: 790, far: 640,
    houses: [[1250, 520, 1.1], [1350, 500, 0.95], [1450, 528, 1.1], [1540, 506, 0.9]],
    beacons: [[40, 520, 1], [660, 548, 0.9], [1470, 420, 0.9]],
    cart: [1220, 660, 1], mud: [1236, 762, 1.5],
    trail: [[1150, 800], [1185, 812], [1220, 824]],
  },
  tall: {
    chapel: [656, 70, 0.72], ground: 532, far: 450,
    houses: [[548, 336, 0.62], [610, 352, 0.5], [930, 330, 0.62], [992, 352, 0.5]],
    beacons: [[566, 400, 0.7], [1000, 390, 0.7]],
    cart: [560, 488, 0.55], mud: [952, 452, 0.95],
    trail: [[880, 512], [905, 508], [930, 506]],
  },
  story: {
    chapel: [836, 84, 0.82], ground: 610, far: 480,
    houses: [[1205, 370, 1.1], [1310, 350, 0.95], [1410, 378, 1.1], [1510, 356, 0.95]],
    beacons: [[30, 360, 1], [630, 390, 0.85], [1480, 230, 0.9]],
    cart: [610, 494, 0.82], mud: [1250, 470, 1.6],
    trail: [[1170, 600], [1210, 596], [1250, 590], [1290, 584]],
  },
};

/**
 * The chapel on its dune with everything the village has done so far.
 * `back` and `front` add more SVG behind or in front of the chapel.
 */
function chapelScene({ hour = 6, done = 0, layout = 'story', dark = false, moon, back = '', front = '' } = {}) {
  const p = progressOf(done);
  const L = LAYOUT[layout];
  const [cx, cy, cs] = L.chapel;
  return `${sky({ dark, moon })}
    ${dune(L.far, 'var(--dune-far)', 50)}
    ${houses(L.houses, { lit: p.lights })}
    ${L.beacons.map(([x, y, s]) => at(x, y, s, beacon(p.beacons))).join('')}
    ${back}
    <path d="M0 ${L.ground} Q400 ${L.ground - 40} 800 ${L.ground - 10} T1600 ${L.ground} V900 H0Z" fill="var(--dune-mid)"/>
    ${at(cx, cy, cs, bigChapel({ hour, planks: p.planks, windows: p.windows }))}
    ${p.cart ? at(...L.cart, plankCart()) : ''}
    ${p.trail ? hoofTrail(L.trail) + at(...L.mud, mud()) : ''}
    ${front}`;
}

// ---------- Book 1 scenes ----------

// Story scenes keep what matters above y ≈ 620: the caption covers the rest.

/** The chapel inside, with the three treasures on the altar. */
function inside({ letter = true, dim = false } = {}) {
  return `<rect width="1600" height="900" fill="#3a3050"/>
    <rect y="640" width="1600" height="260" fill="#2a2238"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<path d="M${k * 220 - 40} 640 L${k * 220 + 60} 900" stroke="#211a2e" stroke-width="6"/>`).join('')}
    <path d="M660 470 V220 a140 140 0 0 1 280 0 V470z" fill="#1c2a55" stroke="#8c7f66" stroke-width="12"/>
    <circle cx="860" cy="220" r="60" fill="url(#g-moon)"/>
    <path d="M800 80 V470 M660 300 H940" stroke="#8c7f66" stroke-width="8"/>
    <rect x="460" y="500" width="680" height="150" rx="8" fill="#8a5a2e" stroke="#3a2210" stroke-width="6"/>
    <rect x="440" y="480" width="720" height="30" rx="6" fill="#f4ead2" stroke="#b8a882" stroke-width="4"/>
    ${at(500, 270, 2.2, treasure(0))}${at(690, 280, 2.1, treasure(1))}${at(890, 280, 2.1, treasure(2))}
    ${at(170, 330, 2.6, candle(!dim))}${at(1220, 330, 2.6, candle(!dim))}
    ${letter ? `<g transform="translate(640 520) rotate(-6) scale(1.5)"><circle cx="85" cy="30" r="90" fill="url(#g-lantern)" opacity=".7"/>
      <path d="M0 0 h170 l-6 14 l8 14 l-6 16 l6 18 h-172 l4 -16 l-6 -14 l6 -16z" fill="#fffaf0" stroke="#9a8a6a" stroke-width="3"/>
      <path d="M20 20 h110 M20 36 h130 M20 52 h80" stroke="#6b4a2a" stroke-width="4"/></g>` : ''}
    ${dim ? '<rect width="1600" height="900" fill="#05081a" opacity=".55"/>' : ''}`;
}

/** The barn, with the plank cart stuck between hay and junk. */
function barn() {
  const boards = Array.from({ length: 17 }, (_, k) => `<rect x="${k * 100}" y="0" width="96" height="620" fill="${k % 2 ? '#7a4a26' : '#844f2a'}"/>`).join('');
  return `${boards}
    <path d="M0 0 H1600 V60 H0Z" fill="#5a3418"/>
    <rect y="610" width="1600" height="290" fill="#6b5a3a"/>
    <rect x="1300" y="150" width="260" height="460" fill="#2a1d14" stroke="#3a2210" stroke-width="10"/>
    <path d="M1300 150 L1560 610 M1560 150 L1300 610" stroke="#5a3418" stroke-width="16"/>
    ${bale(40, 500)}${bale(110, 390)}${bale(1080, 500)}
    <g transform="translate(980 330) rotate(18)"><rect width="250" height="40" rx="8" fill="#9a6a3a" stroke="#3a2210" stroke-width="5"/></g>
    ${at(600, 420, 1.6, plankCart())}
    ${at(350, 340, 1.65, teun())}
    <text x="470" y="330" font-size="96" font-weight="800" fill="#ffe0a0" stroke="#1b1330" stroke-width="5" paint-order="stroke">?</text>`;
}

/** The chapel door close up: holes, or boarded up with planks. */
function doorClose(planked) {
  const holes = [[650, 300, 44, 30], [890, 420, 40, 28], [700, 540, 36, 26], [940, 220, 30, 22]];
  const boards = [[-6, 250], [5, 410], [-4, 560]]
    .map(([r, y]) => `<g transform="rotate(${r} 800 ${y})"><rect x="520" y="${y - 44}" width="560" height="88" rx="10" fill="#c98a4a" stroke="#5a3418" stroke-width="7"/>
      <path d="M540 ${y - 10} H1060" stroke="#a86a32" stroke-width="5"/>
      ${[560, 1040].map((x) => `<circle cx="${x}" cy="${y}" r="10" fill="#3a2a1a"/>`).join('')}</g>`)
    .join('');
  return `<rect width="1600" height="900" fill="#e9dfc8"/>
    ${Array.from({ length: 9 }, (_, k) => `<path d="M0 ${k * 100 + 40} H1600" stroke="#d4c7a8" stroke-width="5"/>`).join('')}
    <path d="M520 900 V240 a280 200 0 0 1 560 0 V900z" fill="#6b4024" stroke="#3a2210" stroke-width="12"/>
    ${[600, 700, 800, 900, 1000].map((x) => `<path d="M${x} 60 V900" stroke="#4a2c16" stroke-width="8"/>`).join('')}
    ${planked ? boards : holes.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#14101e"/>`).join('')}
    ${at(180, 290, 3.6, pim())}
    ${planked ? '' : at(1120, 440, 1.7, plankCart())}`;
}

/** Hugo's goats on the dune, sniffing for a trail; or stuck in the mud. */
function goatsComing({ inMud = false } = {}) {
  const goats = [[880, 360, 1.5], [1080, 320, 1.35], [1260, 370, 1.6]];
  const stuck = [[780, 420, 1.6, -8], [980, 404, 1.5, 6], [1170, 426, 1.6, -4]];
  return `${sky()}
    ${dune(500, 'var(--dune-far)', 60)}
    ${inMud ? '' : at(1200, 170, 0.9, rider())}
    ${dune(620, 'var(--dune-mid)', 40)}
    ${inMud ? '<ellipse cx="1060" cy="540" rx="400" ry="80" fill="#5a3a1e"/><ellipse cx="1050" cy="532" rx="360" ry="58" fill="#7a5230"/>' : ''}
    ${inMud ? hoofTrail([[420, 584], [500, 580], [580, 576], [650, 570]]) : ''}
    ${(inMud ? stuck : goats).map(([x, y, s, r]) => at(x, y, s, `<g transform="rotate(${r ?? 0} 50 60)">${flip(darkGoat())}</g>`)).join('')}
    ${inMud ? '<path d="M660 520 Q1060 500 1460 520 Q1460 600 1060 618 Q660 600 660 520Z" fill="#5a3a1e"/><path d="M700 530 q360 -14 720 0" stroke="#7a5230" stroke-width="10" fill="none" stroke-linecap="round"/>' : ''}
    ${inMud ? '<text x="900" y="300" font-size="110" font-weight="800" fill="#c9a466" stroke="#3a2414" stroke-width="6" paint-order="stroke">Plof!</text>' : ''}
    ${at(200, 300, 3.1, pim())}
    ${inMud ? '' : '<g transform="translate(540 270)"><circle r="40" fill="url(#g-lantern)"/><path d="M-16 8 a20 20 0 1 1 32 0 v14 h-32z" fill="#fff3b0" stroke="#b8862a" stroke-width="4"/></g>'}`;
}

/** Hugo on the heath, grumbling, his red feather in his hat. */
function heath() {
  return `${sky({ moon: [260, 140] })}
    ${dune(500, '#3a2a50', 50)}
    ${Array.from({ length: 14 }, (_, k) => at(k * 120 - 20, 520 + (k % 3) * 20, 1.2, scenery('Heather'))).join('')}
    <path d="M0 640 Q800 600 1600 640 V900 H0Z" fill="#2b2240"/>
    ${at(500, 150, 2.8, rider({ red: true }))}
    ${at(1250, 450, 1.4, flip(darkGoat()))}${at(1390, 470, 1.2, flip(darkGoat()))}
    <g transform="translate(1060 140)" class="grumble"><path d="M40 0 h240 a40 40 0 0 1 40 40 v50 a40 40 0 0 1 -40 40 h-170 l-50 36 l10 -36 h-30 a40 40 0 0 1 -40 -40 v-50 a40 40 0 0 1 40 -40z" fill="#f4ead2" stroke="#1b1330" stroke-width="5"/>
      <text x="160" y="88" text-anchor="middle" font-size="60" font-weight="800" fill="#8a2420">#@%!</text></g>`;
}

/** A red feather, 100×100, pointing up and to the right. */
function redFeather(stroke = 1.6) {
  return `<path d="M10 80 C30 50 60 20 100 0 C80 30 50 60 20 86Z" fill="#d8433a" stroke="#8a2420" stroke-width="${stroke}"/>
    <path d="M0 96 L100 0" stroke="#8a2420" stroke-width="${stroke * 1.5}"/>
    ${[20, 40, 60, 80].map((d) => `<path d="M${d} ${96 - d} l-8 -6" stroke="#a83030" stroke-width="${stroke}"/>`).join('')}`;
}

/** Barend's stable in the morning: empty, and a red feather in the straw. */
function emptyStable({ close = false } = {}) {
  if (close) {
    return `<rect width="1600" height="900" fill="#d9b86a"/>
      ${Array.from({ length: 40 }, (_, k) => `<path d="M${(k * 97) % 1600} ${40 + ((k * 61) % 820)} l${60 + (k % 4) * 10} ${-20 + (k % 5) * 10}" stroke="${k % 2 ? '#b8963a' : '#f0d58a'}" stroke-width="8" stroke-linecap="round"/>`).join('')}
      <circle cx="800" cy="300" r="300" fill="url(#g-lantern)" opacity=".5"/>
      <g transform="translate(640 260) rotate(-20) scale(3.8)">${redFeather()}</g>`;
  }
  return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
    <circle cx="1350" cy="160" r="150" fill="url(#g-sun)"/>
    <path d="M0 580 Q800 550 1600 580 V900 H0Z" fill="#c9a866"/>
    ${at(450, -40, 7, stable(false))}
    <path d="M730 576 h140" stroke="#e8c86a" stroke-width="22" stroke-linecap="round"/>
    <path d="M760 400 q30 40 0 120" stroke="#8a6a3a" stroke-width="8" fill="none"/>
    <g transform="translate(800 520) rotate(-14) scale(.55)">${redFeather(3)}</g>
    ${at(1160, 250, 2.2, pimAlone())}`;
}

/** Story scenes for Book 1. `hour` is the chapter's time, `done` how far the barricade is. */
function scene(name, { scare = 'spannend', hour = 6, done = 0 } = {}) {
  const pimLeft = at(200, 366, 2.6, pim());
  switch (name) {
    case 'treasures':
      return inside();
    case 'letter':
      return inside({ letter: false, dim: true });
    case 'clock':
      return `${inside({ letter: false })}<rect width="1600" height="900" fill="#05081a" opacity=".3"/>
        <g transform="translate(1200 230)"><rect x="-150" y="-150" width="300" height="300" rx="40" fill="#8a5a2e" stroke="#3a2210" stroke-width="10"/>${clockFace(6, 120)}</g>
        ${at(220, 170, 4.6, pim())}`;
    case 'asleep':
      return chapelScene({ hour, done, front: pimLeft + '<text x="1290" y="320" font-size="70" font-weight="800" fill="#cfd6ee" opacity=".85">z z z</text>' });
    case 'awake':
      return chapelScene({ hour, done, front: ringing(1000, 150, 1, '#ffe27a') + pimLeft });
    case 'barn':
      return barn();
    case 'cart':
      return chapelScene({ hour, done, front: at(330, 370, 2.5, pim()) });
    case 'holes':
      return doorClose(false);
    case 'door':
      return doorClose(true);
    case 'goats':
      return goatsComing();
    case 'mud':
      return goatsComing({ inMud: true });
    case 'dark':
      return `${sky({ dark: true })}${dune(500, 'var(--dune-far)', 60)}${dune(620, 'var(--dune-mid)', 40)}
        ${at(660, 140, 0.68, bigChapel({ hour, planks: true }))}
        <rect width="1600" height="900" fill="#02040f" opacity=".55"/>
        ${at(200, 300, 3, pim())}
        ${[[1180, 440], [1320, 480], [1450, 450]].map(([x, y]) => `<g opacity=".75"><circle cx="${x}" cy="${y}" r="6" fill="#ffd35a"/><circle cx="${x + 20}" cy="${y}" r="6" fill="#ffd35a"/></g>`).join('')}`;
    case 'beacons':
      return chapelScene({ hour, done, back: at(160, 300, 0.9, rider()) + at(380, 330, 0.7, rider()), front: at(300, 400, 2.2, pim()) });
    case 'midnight':
      return chapelScene({ hour: 12, done, front: ringing(1000, 150, 1, '#ffe27a') + pimLeft });
    case 'flying':
      return chapelScene({ hour: 12, done, moon: [330, 200], back: '<circle cx="330" cy="200" r="230" fill="url(#g-moon)" opacity=".9"/>', front: at(150, 70, 1.6, rider({ eyes: true })) + at(1220, 30, 1.3, flip(rider({ eyes: true }), 200)) + at(520, 10, 1, rider({ eyes: true })) });
    case 'dame':
      return chapelScene({ hour: 12, done, moon: [300, 150], front: at(1100, 200, 3, dame({ scare })) + at(150, 80, 1.3, rider()) + at(420, 30, 0.9, rider()) + '<text x="1170" y="190" font-size="96" font-weight="800" fill="#e6f4ff" stroke="#1b2656" stroke-width="6" paint-order="stroke">Boe!</text>' });
    case 'flee':
      return chapelScene({ hour: 12, done, moon: [1380, 130], front: at(1200, 50, 0.7, rider()) + at(1340, 100, 0.55, rider()) + at(1460, 40, 0.45, rider()) + at(220, 230, 2.8, dame({ scare, mood: 'happy' })) });
    case 'party':
      return chapelScene({ hour: 12, done, front: garland() + at(180, 350, 2.4, pim()) + at(440, 380, 1.4, villager('#d8433a', { arms: true })) + at(570, 400, 1.3, villager('#9a62b3', { arms: true })) + at(1230, 380, 1.4, teun()) + at(1390, 120, 1.9, dame({ scare: 'zacht', mood: 'happy' })) });
    case 'heath':
      return heath();
    case 'stable':
      return emptyStable();
    case 'feather':
      return emptyStable({ close: true });
    default:
      return chapelScene({ hour, done });
  }
}

/** Party lights strung from the chapel. */
function garland() {
  const curve = (x0, x1, y, sag, n) => Array.from({ length: n }, (_, k) => [x0 + ((x1 - x0) * k) / (n - 1), y + Math.sin((k / (n - 1)) * Math.PI) * sag * 0.75]);
  const bulbs = (list) => list.map(([x, y], i) => `<circle cx="${x}" cy="${y + 8}" r="11" fill="${['#ffd35a', '#e0474c', '#3f9f5a', '#3f7fd0'][i % 4]}"/>`).join('');
  return `<path d="M60 260 Q450 420 840 260" stroke="#3a2a1a" stroke-width="4" fill="none"/>${bulbs(curve(60, 840, 260, 160, 14))}
    <path d="M1160 260 Q1380 400 1600 260" stroke="#3a2a1a" stroke-width="4" fill="none"/>${bulbs(curve(1160, 1600, 260, 140, 9))}`;
}

/** The book map's backdrop: the chapel as far as the done flags go; the clock moves on one hour per chapter, from six to twelve. */
function map({ done = [], tall = false } = {}) {
  return chapelScene({ hour: 6 + done.filter(Boolean).length, done, layout: tall ? 'tall' : 'map' });
}

/**
 * Stops on the book map: along the left, ending at the book's goal (the
 * chapel door; Book 2 uses the same path to Hugo's gate).
 */
export const LAYOUTS = {
  landscape: {
    box: [1600, 900],
    stops: [[140, 760], [350, 620], [150, 450], [370, 300], [590, 450], [640, 690]],
    end: [1000, 760],
    goal: [0, 0, 0],
  },
  portrait: {
    box: [900, 1600],
    stops: [[170, 1490], [450, 1440], [730, 1340], [470, 1240], [190, 1130], [540, 1030]],
    end: [450, 890],
    goal: [0, 0, 0],
  },
};

// ---------- puzzle backdrops ----------
// Scenes behind a hosted puzzle (see SKINS in engines.js; the pieces that go
// on the board are in skins1.js). Backdrops sit behind the play screen, so
// they are dimmed a little and keep their detail away from the middle.

/** Backdrops behind a Book 1 puzzle (1600×900). */
const BACKDROPS = {
  /**
   * Inside the bell tower: stone walls, a beam with the rope, and through
   * the arched window the sleeping village under the moon. The window sits
   * low on the right, below the puzzle's buttons (16:9 and 4:3 alike).
   */
  tower() {
    const blocks = [];
    for (let y = 0; y < 900; y += 90) {
      for (let x = (y / 90) % 2 ? -80 : 0; x < 1600; x += 160) blocks.push(`<rect x="${x + 4}" y="${y + 4}" width="152" height="82" rx="8"/>`);
    }
    return `<rect width="1600" height="900" fill="#2a2640"/>
      <g fill="#38334f">${blocks.join('')}</g>
      <g transform="translate(1020 590) scale(.85) translate(-1160 -80)">
        <path d="M1160 400 V250 a170 170 0 0 1 340 0 V400z" fill="url(#g-night)" stroke="#6f6a7a" stroke-width="22"/>
        <circle cx="1400" cy="200" r="50" fill="url(#g-moon)"/>
        ${[[1210, 260], [1270, 200], [1440, 300], [1330, 150]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff8d8"/>`).join('')}
        <path d="M1170 350 Q1330 320 1490 345 V400 H1170Z" fill="var(--dune-far)"/>
        ${houses([[1180, 320, 0.45], [1240, 312, 0.4], [1310, 322, 0.45], [1380, 314, 0.4], [1440, 324, 0.4]])}
        <path d="M1330 80 V400" stroke="#6f6a7a" stroke-width="12"/>
      </g>
      <rect y="0" width="1600" height="70" fill="#4a2c16"/>
      <path d="M40 70 V900" stroke="#c9a466" stroke-width="10"/>
      ${shade()}`;
  },
  /** Boer Teun's barn: wooden walls and bales of hay at the sides. */
  barn() {
    return `${Array.from({ length: 17 }, (_, k) => `<rect x="${k * 100}" y="0" width="96" height="900" fill="${k % 2 ? '#6a3f20' : '#734524'}"/>`).join('')}
      <path d="M0 0 H1600 V60 H0Z" fill="#4a2c16"/>
      <rect y="760" width="1600" height="140" fill="#5a4a30"/>
      ${bale(-40, 650)}${bale(30, 540)}${bale(1440, 650)}${bale(1380, 540)}
      ${shade()}`;
  },
  /** The dunes at night. */
  dunes() {
    return `${sky({ moon: [1440, 120] })}
      ${dune(560, 'var(--dune-far)', 60)}
      ${dune(700, 'var(--dune-mid)', 40)}
      ${dune(820, 'var(--dune-near)', 30)}
      ${shade()}`;
  },
};

// ---------- covers and the mode card ----------

const COVER_COLORS = ['#2d5ea3', '#8a3f3f', '#3f7a55', '#3a2850'];

/** Book 1's cover picture (240×250): the boarded-up chapel at midnight, Pim on Barend. */
function chapelCover() {
  return `<rect width="240" height="250" fill="#1c2a55"/>${at(70, 50, 0.32, bigChapel({ hour: 12, planks: true, windows: true }))}<circle cx="200" cy="40" r="22" fill="url(#g-moon)"/>${at(-6, 150, 1, pim())}`;
}

/** Book n's cover, 300×400, around its `picture` (240×250, from the book's BOOK.cover). */
export function cover(n, picture) {
  return `<g class="cover-art">
    <rect x="12" y="8" width="284" height="388" rx="18" fill="#00000055"/>
    <rect x="4" y="2" width="284" height="388" rx="18" fill="${COVER_COLORS[(n - 1) % 4]}" stroke="#1b1330" stroke-width="5"/>
    <rect x="4" y="2" width="30" height="388" rx="12" fill="#00000033"/>
    <svg x="44" y="40" width="226" height="236" viewBox="0 0 240 250"><g>${picture}</g></svg>
    <rect x="44" y="40" width="226" height="236" rx="6" fill="none" stroke="#f2c23a" stroke-width="6"/>
    <circle cx="157" cy="326" r="34" fill="#f2c23a" stroke="#8c6420" stroke-width="5"/>
    <text x="157" y="344" text-anchor="middle" font-size="50" font-weight="800" fill="#1b1330">${n}</text>
  </g>`;
}

/** A gold rosette with a star for a finished book's cover (300×400 box). */
export function rosette() {
  return `<g transform="translate(236 46)"><g class="cover-rosette">
    <path d="M-16 20 L-26 70 L-10 60 L0 76 L4 22Z M16 20 L26 70 L10 60 L0 76 L-4 22Z" fill="#d8433a" stroke="#7a1f1a" stroke-width="3" stroke-linejoin="round"/>
    ${Array.from({ length: 12 }, (_, i) => `<circle cx="${(Math.cos((i * Math.PI) / 6) * 30).toFixed(1)}" cy="${(Math.sin((i * Math.PI) / 6) * 30).toFixed(1)}" r="11" fill="#f2c23a" stroke="#8c6420" stroke-width="2.5"/>`).join('')}
    <circle r="30" fill="url(#g-gold)" stroke="#8c6420" stroke-width="3"/>
    <path d="M0 -18 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1z" fill="#fffaf0" stroke="#8c6420" stroke-width="2" stroke-linejoin="round"/>
  </g></g>`;
}

/** The mode-menu card (200×150): an open storybook with Pim and Barend. */
export function card() {
  return `<path d="M100 40 Q60 22 14 30 V136 Q60 128 100 144 Q140 128 186 136 V30 Q140 22 100 40Z" fill="#8a3f3f"/>
    <path d="M100 36 Q62 18 20 24 V128 Q62 120 100 136Z" fill="#fbf3dc" stroke="#b8a882" stroke-width="2"/>
    <path d="M100 36 Q138 18 180 24 V128 Q138 120 100 136Z" fill="#f4ead2" stroke="#b8a882" stroke-width="2"/>
    ${[48, 62, 76, 90, 104].map((y, k) => `<path d="M30 ${y} Q60 ${y - 6} ${k === 4 ? 66 : 90} ${y + (k === 4 ? -4 : 2)}" stroke="#9a8a6a" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('')}
    ${at(98, 36, 0.86, pim({ glow: true }))}
    <path d="M100 36 V136" stroke="#b8a882" stroke-width="3"/>`;
}

// ---------- the book ----------

/**
 * Book 1's art, for index.js. Every book's art module exports a BOOK like it:
 *   scene(name, o)    a story scene (1600×900); o: {scare, hour, done, suspects,
 *                     turned, meter, meters, kid, look, backdrop (behind a card)}
 *   map(o)            the book map's backdrop; o: {done (a flag per chapter),
 *                     tall, suspects, turned, meter, scare, look}
 *   cover(o)          the cover picture (240×250, framed by cover()); o: {scare}
 *   layouts(done)     the stops on the map, {landscape, portrait} (see stageMap)
 *   goal(o)?          what stands in the map's goal slot (100×100); o: {meters, meter, scare}
 *   speaker(who, o)?  the face of who asks a riddle (its `by`), 100×100; o: {scare, meter}
 *   backdrops         puzzle backdrops by name, each (o: {scare}) → 1600×900 (see SKINS in engines.js)
 */
export const BOOK = {
  scene,
  map,
  cover: chapelCover,
  layouts: () => LAYOUTS,
  backdrops: BACKDROPS,
};
