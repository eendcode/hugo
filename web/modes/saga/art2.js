// Art for Book 2, "Red Barend!": Hugo's house on the heath (with the gate,
// the tower and the things the lock in chapter 2.1 counts), the Book 2
// scenes and book map, and the backdrops behind the chapter puzzles (the
// pieces that go on their boards are in skins2.js). Scenes are 1600×900 and
// keep what matters above y ≈ 620 (the caption covers the rest) and inside
// x ≈ 300–1300 (a phone shows the middle); small pieces are 100×100 unless
// noted. The night sky here has no small stars: the only stars are the five
// above the roof, so counting them is never confusing.

import { pim, scenery } from '../../art.js';
import { barend } from '../programma/art.js';
import { candle, house as mansion, hugoPortrait } from '../spookhuis/art.js';
import { pimAlone, rider, darkGoat, LAYOUTS } from './art.js';
import { picture } from './pictures.js';
import { at, flip, shade, nightSky, hearts, bubble, shout, zzz } from './kit.js';

const WALL = '#3a3058';
const ROOF = '#1d1733';
const INK = '#120d22';
const IRON = '#17121f';
const GLASS = '#252a4f';
const LIT = '#ffd35a';

/** What the chapters of Book 2 have changed at Hugo's house. `done` is a flag per chapter, or a count. */
function houseOf(done) {
  const f = Array.isArray(done) ? done : Array.from({ length: 6 }, (_, i) => i < done);
  return { gate: !!f[0], corridor: !!f[1], cellar: !!f[2], library: !!f[3], free: !!f[4], open: !!f[5] };
}

// ---------- small pieces ----------

/** A five-pointed star centred on (cx, cy). */
function star(cx, cy, r) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const k = i % 2 ? r * 0.45 : r;
    return `${(cx + Math.cos(a) * k).toFixed(1)},${(cy + Math.sin(a) * k).toFixed(1)}`;
  }).join(' ');
  return `<circle cx="${cx}" cy="${cy}" r="${r * 1.6}" fill="url(#g-lantern)" opacity=".4"/>
    <polygon points="${pts}" fill="#ffe27a" stroke="#c9a13a" stroke-width="${r * 0.14}" stroke-linejoin="round"/>`;
}

/** A goat's face from the front, centred on (0, 0), about 50 wide. */
export function goatFace({ fur = '#f4f0e6', edge = '#8c836e' } = {}) {
  return `<g class="goat-face-front">
    <path d="M-9 -12 q-14 -10 -8 -24 q2 10 12 16 M9 -12 q14 -10 8 -24 q-2 10 -12 16" fill="#c9b48a" stroke="#7a6640" stroke-width="2"/>
    <ellipse cx="-17" cy="-6" rx="11" ry="5" fill="${fur}" stroke="${edge}" stroke-width="2" transform="rotate(-20 -17 -6)"/>
    <ellipse cx="17" cy="-6" rx="11" ry="5" fill="${fur}" stroke="${edge}" stroke-width="2" transform="rotate(20 17 -6)"/>
    <path d="M-12 -10 Q0 -18 12 -10 Q14 8 6 18 Q0 22 -6 18 Q-14 8 -12 -10Z" fill="${fur}" stroke="${edge}" stroke-width="2"/>
    <path d="M-3 18 l3 10 l3 -10z" fill="#d9d2c2"/>
    <circle cx="-5.5" cy="-3" r="2.4" fill="#2b2b2b"/><circle cx="5.5" cy="-3" r="2.4" fill="#2b2b2b"/>
    <ellipse cx="0" cy="12" rx="4.5" ry="3" fill="#e8a8a8"/>
  </g>`;
}

/** A round iron medallion with a goat's face, on the gate. */
function goatMedal(cx, cy, r = 29) {
  return `<g transform="translate(${cx} ${cy})">
    <circle r="${r}" fill="#2a2140" stroke="#c9a13a" stroke-width="5"/>
    <g transform="translate(0 3) scale(${(r / 30).toFixed(2)})">${goatFace({ fur: '#e9e4d8' })}</g>
  </g>`;
}

/** An arched window, `w` wide, with its top-left corner at (x, y). */
function archWindow(x, y, w, h, { lit = false, glass = GLASS, inside = '' } = {}) {
  const r = w / 2;
  const d = `M${x} ${y + h} V${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h}Z`;
  return `<g>
    ${lit ? `<circle cx="${x + r}" cy="${y + h / 2}" r="${w * 1.3}" fill="url(#g-lantern)" opacity=".7"/>` : ''}
    <path d="${d}" fill="${lit ? LIT : glass}" stroke="${INK}" stroke-width="7"/>
    ${inside}
    <path d="M${x + r} ${y + 4} V${y + h} M${x} ${y + h * 0.55} H${x + w}" stroke="${INK}" stroke-width="4" opacity="${inside ? 0 : 1}"/>
    <rect x="${x - 6}" y="${y + h - 2}" width="${w + 12}" height="10" rx="3" fill="#5a4a7a" stroke="${INK}" stroke-width="3"/>
  </g>`;
}

/** Barend peeking out of a window: his face, ears and horns. Centred on (0, 0). */
function barendPeek() {
  return `<g class="barend-peek">${goatFace()}<path d="M-12 26 h24" stroke="#d8433a" stroke-width="5" stroke-linecap="round"/></g>`;
}

/**
 * The sleepwalking robber: nightcap with his horns poking through, eyes
 * shut, a red nose, arms out in front. Faces right. 100×100.
 */
export function sleeper({ z = true } = {}) {
  return `<g class="sleeper">
    <rect x="34" y="78" width="9" height="16" rx="4" fill="#2a2140"/><rect x="50" y="78" width="9" height="16" rx="4" fill="#2a2140"/>
    <ellipse cx="38" cy="94" rx="8" ry="4" fill="#5a4a7a"/><ellipse cx="55" cy="94" rx="8" ry="4" fill="#5a4a7a"/>
    <path d="M26 82 Q24 52 46 48 Q70 50 68 82Z" fill="#5a4a7a" stroke="#241a38" stroke-width="3"/>
    <path d="M30 62 h34 M28 72 h38" stroke="#7d6aa6" stroke-width="5"/>
    <path d="M56 56 L90 54 M54 64 L88 64" stroke="#241a38" stroke-width="10" stroke-linecap="round"/>
    <path d="M56 56 L90 54 M54 64 L88 64" stroke="#5a4a7a" stroke-width="6" stroke-linecap="round"/>
    <circle cx="91" cy="54" r="5" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="1.5"/><circle cx="89" cy="64" r="5" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="1.5"/>
    <ellipse cx="50" cy="36" rx="17" ry="16" fill="#f2c4a0" stroke="#8a5a3a" stroke-width="2.5"/>
    <path d="M40 36 q4 3 8 0 M54 36 q4 3 8 0" stroke="#3a2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="61" cy="42" r="5" fill="#e07a6a" stroke="#8a3a2a" stroke-width="1.5"/>
    <path d="M46 47 q6 3 10 0" stroke="#6b2a1a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <g fill="none" stroke="#d9c7a0" stroke-width="3.5" stroke-linecap="round"><path d="M42 22 q-8 -4 -8 -12"/><path d="M58 22 q8 -4 8 -12"/></g>
    <path d="M33 30 Q34 16 50 16 Q64 16 66 28 Q50 24 33 30Z" fill="#e8e0f4" stroke="#241a38" stroke-width="2.5"/>
    <path d="M38 20 Q24 12 14 30 Q12 38 18 42" fill="none" stroke="#241a38" stroke-width="13" stroke-linecap="round"/>
    <path d="M38 20 Q24 12 14 30 Q12 38 18 42" fill="none" stroke="#e8e0f4" stroke-width="8" stroke-linecap="round" stroke-dasharray="7 6"/>
    <path d="M38 20 Q24 12 14 30 Q12 38 18 42" fill="none" stroke="#7d6aa6" stroke-width="8" stroke-linecap="round" stroke-dasharray="6 7" stroke-dashoffset="6"/>
    <circle cx="19" cy="44" r="6" fill="#fffaf0" stroke="#241a38" stroke-width="2"/>
    ${z ? '<g font-weight="800" fill="#e6ecff" stroke="#1b1330" stroke-width="2.5" paint-order="stroke"><text x="68" y="20" font-size="20">Z</text><text x="84" y="8" font-size="14">z</text></g>' : ''}
  </g>`;
}

/** Pim tiptoeing alone, finger to his lips, for the corridor board. 100×100. */
export function sneakingPim() {
  return `<g class="pim">${at(22, 0, 0.6, pimAlone())}<path d="M58 34 l8 -3" stroke="#f7d1b0" stroke-width="4" stroke-linecap="round"/></g>`;
}

/** Corridor floor boards for the road board's cells (the `ground` types of art.js). */
/** Hugo standing, in his nightcap (with the red feather stuck in it). 160×220; pose 'down', 'up' (spell) or 'stamp'. */
function hugoStanding({ pose = 'down' } = {}) {
  const c = '#1d1430';
  const arms = {
    down: `<path d="M50 104 Q36 130 40 156 M110 104 Q124 130 120 156" stroke="${c}" stroke-width="16" stroke-linecap="round" fill="none"/>`,
    up: `<path d="M52 102 Q30 70 34 40 M108 102 Q126 80 136 52" stroke="${c}" stroke-width="16" stroke-linecap="round" fill="none"/>
      <path d="M136 52 L156 6" stroke="#6b4a2a" stroke-width="6" stroke-linecap="round"/><circle cx="156" cy="6" r="7" fill="#e0b8ff"/>`,
    stamp: `<path d="M50 104 Q28 120 30 96 M110 104 Q132 120 130 96" stroke="${c}" stroke-width="16" stroke-linecap="round" fill="none"/>
      <circle cx="30" cy="94" r="10" fill="${c}"/><circle cx="130" cy="94" r="10" fill="${c}"/>`,
  }[pose];
  const legs = pose === 'stamp' ? `<path d="M66 170 L62 214 h18 M94 170 L104 196 h18" stroke="${c}" stroke-width="15" stroke-linecap="round" fill="none"/>` : `<path d="M66 170 L64 214 h-10 M94 170 L96 214 h10" stroke="${c}" stroke-width="15" stroke-linecap="round" fill="none"/>`;
  return `<g class="hugo-standing">
    ${legs}
    <path d="M44 176 Q46 96 80 88 Q114 96 116 176 Q80 184 44 176Z" fill="${c}"/>
    ${arms}
    <circle cx="80" cy="66" r="24" fill="${c}"/>
    <path d="M100 62 q18 2 20 10 q-12 2 -20 -4z" fill="${c}"/>
    <path d="M70 84 Q80 106 92 84Z" fill="${c}"/>
    <circle cx="90" cy="60" r="4" fill="#ffd35a"/>
    <path d="M82 52 l14 -3" stroke="#ffd35a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M54 56 Q52 22 86 24 Q118 30 136 74 L126 80 Q112 52 104 50 Q80 44 54 56Z" fill="#6b5a9a" stroke="${c}" stroke-width="3"/>
    <path d="M70 34 Q90 32 104 44 M60 46 Q84 40 110 56" stroke="#9a88c8" stroke-width="5" fill="none"/>
    <circle cx="132" cy="82" r="8" fill="#fffaf0" stroke="${c}" stroke-width="2"/>
    <path d="M60 40 C46 22 40 8 30 0 C42 6 52 18 66 34Z" fill="#d8433a" stroke="#7a1f1a" stroke-width="2.5"/>
  </g>`;
}

/** Oma Hilde, a talking painting in an ornate gold frame. 200×250. */
export function omaHilde({ talk = false } = {}) {
  const knobs = [[0, 0], [200, 0], [0, 250], [200, 250], [100, 0], [100, 250]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="url(#g-gold)" stroke="#6b4a1a" stroke-width="3"/>`)
    .join('');
  return `<g class="oma-hilde">
    <rect x="-6" y="-6" width="212" height="262" rx="14" fill="url(#g-gold)" stroke="#6b4a1a" stroke-width="5"/>
    <rect x="10" y="10" width="180" height="230" rx="8" fill="#b8862a" stroke="#6b4a1a" stroke-width="3"/>
    <rect x="20" y="20" width="160" height="210" rx="4" fill="#2f4a3a"/>
    <circle cx="100" cy="110" r="70" fill="#3f6a52" opacity=".7"/>
    <path d="M30 230 Q34 170 100 164 Q166 170 170 230Z" fill="#6d4a8a" stroke="#2a1d3a" stroke-width="3"/>
    <path d="M66 172 q8 10 17 2 q8 10 17 0 q9 10 17 -2 q6 8 0 16 Q100 196 66 188 q-6 -8 0 -16Z" fill="#fffaf0" stroke="#b8a882" stroke-width="2"/>
    <circle cx="100" cy="194" r="7" fill="url(#g-gold)" stroke="#6b4a1a" stroke-width="2"/>
    <rect x="88" y="138" width="24" height="26" fill="#f2cfb4"/>
    <circle cx="100" cy="66" r="24" fill="#ece8f2" stroke="#b8b0c8" stroke-width="3"/>
    <ellipse cx="100" cy="112" rx="40" ry="44" fill="#f4d8c0" stroke="#a8785a" stroke-width="3"/>
    <path d="M60 104 Q60 64 100 64 Q140 64 140 104 Q128 82 100 80 Q72 82 60 104Z" fill="#ece8f2" stroke="#b8b0c8" stroke-width="3"/>
    <circle cx="84" cy="108" r="12" fill="#fffaf066" stroke="#6b4a2a" stroke-width="3"/>
    <circle cx="116" cy="108" r="12" fill="#fffaf066" stroke="#6b4a2a" stroke-width="3"/>
    <path d="M96 106 h8" stroke="#6b4a2a" stroke-width="3"/>
    <circle cx="84" cy="109" r="3.2" fill="#2b2b2b"/><circle cx="116" cy="109" r="3.2" fill="#2b2b2b"/>
    <path d="M74 92 q10 -5 18 0 M108 92 q10 -5 18 0" stroke="#a89cb8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M98 114 q2 8 -4 10" stroke="#a8785a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="74" cy="128" r="7" fill="#f0a0a0" opacity=".55"/><circle cx="126" cy="128" r="7" fill="#f0a0a0" opacity=".55"/>
    ${talk ? '<ellipse cx="100" cy="136" rx="9" ry="7" fill="#7a2a2a"/><path d="M92 134 q8 -3 16 0" stroke="#fff" stroke-width="2" fill="none"/>' : '<path d="M88 134 q12 9 24 0" stroke="#8a3a3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>'}
    ${knobs}
  </g>`;
}

/** The black stone of Opa Bram, glowing purple; `bright` glows more. 100×100. */
function blackStone(bright = false) {
  return `<g class="black-stone">${bright ? '<circle cx="50" cy="56" r="56" fill="#b58cff" opacity=".35" filter="url(#f-soft)"/>' : ''}${picture('zwarteSteen')}</g>`;
}

/** A little raft of three logs; `key` lies on it. 200×90. */
export function raft({ key = true } = {}) {
  const log = (y, c) => `<rect x="10" y="${y}" width="180" height="22" rx="11" fill="${c}" stroke="#4a2c16" stroke-width="4"/><ellipse cx="180" cy="${y + 11}" rx="6" ry="9" fill="#d9a066" stroke="#4a2c16" stroke-width="3"/>`;
  return `<g class="raft">
    ${log(44, '#9a6232')}${log(24, '#b07a42')}
    <path d="M40 26 V60 M160 26 V60" stroke="#c9a466" stroke-width="5"/>
    ${key ? `<circle cx="100" cy="20" r="40" fill="url(#g-lantern)" opacity=".7"/>${at(58, -30, 0.85, picture('sleutel'))}` : ''}
  </g>`;
}

// ---------- Hugo's house ----------

/** Where the countable things are, in the house's own box (for the lock's number badges). Book 2's lock code [4, 3, 5] counts these. */
const COUNT = {
  goats: [[246, 670], [310, 670], [390, 670], [454, 670]],
  windows: [[640, 196], [640, 346], [640, 496]],
  stars: [[110, 190], [190, 96], [300, 40], [410, 92], [490, 186]],
};

/**
 * Hugo's house, in an 800×830 box from y = −40 (ground at 710, the fence's
 * foot at 790). Tower windows, stars and the goats on the gate are each in
 * a group `count-0` (goats) / `count-1` (windows) / `count-2` (stars) with
 * one `count-item` per thing, so the lock can point at them. `state` comes
 * from houseOf(); `out` puts every light out (the finale). `padlock`
 * ('shut' or 'open') hangs the three-wheel lock on the gate, for story
 * scenes only (the lock's own counting picture leaves it off).
 */
export function hugoHouse(state = houseOf(0), { out = false, awake = state.open, padlock = null } = {}) {
  const lit = (on) => on && !out;
  const item = ([x, y], inner) => `<g class="count-item" data-x="${x}" data-y="${y}">${inner}</g>`;
  const stars = COUNT.stars.map((p) => item(p, star(p[0], p[1], 34))).join('');
  // The tower's windows; Barend looks out of the top one until he is free.
  const towerWin = ([x, y], k) => {
    const top = k === 0;
    let inside = '';
    if (top && !state.free) inside = `<g transform="translate(${x} ${y + 14}) scale(.95)">${barendPeek()}</g>`;
    const win = archWindow(x - 34, y - 46, 68, 92, { lit: lit(top && !state.free), glass: top && state.open ? '#0d0a1a' : GLASS, inside });
    const shutters = top && state.open
      ? `<path d="M${x - 40} ${y - 30} l-34 -12 v84 l34 6z M${x + 40} ${y - 30} l34 -12 v84 l-34 6z" fill="#5a3a24" stroke="${INK}" stroke-width="4"/>`
      : '';
    return item([x, y], shutters + win);
  };
  const windows = COUNT.windows.map(towerWin).join('');
  // A rope of knotted sheets from the open window.
  const rope = state.open
    ? `<path d="M640 244 Q622 330 646 420 Q664 520 640 620 Q630 670 644 706" stroke="#e8e4f0" stroke-width="14" fill="none" stroke-linecap="round"/>
       ${[330, 430, 530, 630].map((y, i) => `<circle cx="${i % 2 ? 652 : 630}" cy="${y}" r="11" fill="#e8e4f0" stroke="#9a94b0" stroke-width="2"/>`).join('')}`
    : '';
  // The gate: two iron leaves that rise to the middle; open, they swing back to their posts.
  const leaf = (x0, x1, side) => {
    const [y0, y1] = side < 0 ? [640, 608] : [608, 640];
    const bars = [1, 2, 3].map((k) => `M${x0 + ((x1 - x0) * k) / 4} 790 V${y0 + ((y1 - y0) * k) / 4 + 4}`).join(' ');
    return `<path d="M${x0} 790 V${y0} Q${(x0 + x1) / 2} ${Math.min(y0, y1) + 8} ${x1} ${y1} V790Z" fill="none" stroke="${IRON}" stroke-width="9" stroke-linejoin="round"/>
      <path d="${bars} M${x0} 720 H${x1} M${x0} 770 H${x1}" stroke="${IRON}" stroke-width="7"/>`;
  };
  const swing = (x, side, inner) => `<g class="gate-leaf gate-${side}"${state.gate ? ` transform="translate(${x} 0) scale(.26 1) translate(${-x} 0)"` : ''}>${inner}</g>`;
  const leftLeaf = leaf(208, 350, -1) + COUNT.goats.slice(0, 2).map((p) => item(p, goatMedal(p[0], p[1]))).join('');
  const rightLeaf = leaf(350, 492, 1) + COUNT.goats.slice(2).map((p) => item(p, goatMedal(p[0], p[1]))).join('');
  const fence = (x0, x1) => {
    const bars = [];
    for (let x = x0 + 16; x < x1; x += 34) bars.push(`<path d="M${x} 790 V652 M${x - 7} 656 L${x} 636 L${x + 7} 656Z"/>`);
    return `<g stroke="${IRON}" fill="${IRON}" stroke-width="6">${bars.join('')}<path d="M${x0} 680 H${x1} M${x0} 768 H${x1}" fill="none"/></g>`;
  };
  const post = (x) => `<rect x="${x - 18}" y="600" width="36" height="194" fill="#4a4258" stroke="${INK}" stroke-width="5"/>
    <rect x="${x - 26}" y="588" width="52" height="18" rx="4" fill="#5a5270" stroke="${INK}" stroke-width="5"/>
    <circle cx="${x}" cy="576" r="12" fill="#5a5270" stroke="${INK}" stroke-width="5"/>`;
  return `<g class="hugo-house">
    <g class="count count-2">${stars}</g>
    <rect x="410" y="196" width="46" height="110" fill="#2a2240" stroke="${INK}" stroke-width="6"/>
    <rect x="402" y="186" width="62" height="18" fill="#3a3058" stroke="${INK}" stroke-width="5"/>
    <rect x="570" y="120" width="140" height="590" fill="${WALL}" stroke="${INK}" stroke-width="7"/>
    <polygon points="548,126 640,-30 732,126" fill="${ROOF}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <rect x="80" y="330" width="500" height="380" fill="${WALL}" stroke="${INK}" stroke-width="7"/>
    <path d="M80 420 H580 M80 520 H580 M80 620 H580" stroke="#332a4e" stroke-width="4"/>
    <polygon points="44,338 312,176 600,338" fill="${ROOF}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <g class="count count-1">${windows}</g>
    ${archWindow(275, 392, 74, 84, { lit: lit(awake) })}
    ${archWindow(118, 548, 80, 92, { lit: lit(state.corridor) })}
    ${archWindow(462, 548, 80, 92, { lit: lit(state.library) })}
    <path d="M298 710 V620 a42 42 0 0 1 84 0 V710z" fill="#4a2f1a" stroke="${INK}" stroke-width="7"/>
    <circle cx="368" cy="668" r="6" fill="#c9a13a"/>
    <rect x="150" y="684" width="90" height="26" rx="6" fill="${lit(state.cellar) ? '#6fc8ff' : '#120d22'}" stroke="${INK}" stroke-width="5"/>
    <path d="M172 684 v26 M195 684 v26 M218 684 v26" stroke="${INK}" stroke-width="4"/>
    ${lit(state.cellar) ? '<ellipse cx="195" cy="700" rx="70" ry="22" fill="#6fc8ff" opacity=".3"/>' : ''}
    ${rope}
    <path d="M-40 712 Q400 696 840 712 V830 H-40Z" fill="#262238"/>
    ${state.gate ? '<path d="M290 790 L410 790 L380 712 L320 712Z" fill="#ffd35a" opacity=".18"/>' : ''}
    ${fence(-40, 190)}${fence(510, 840)}
    <g class="count count-0">
      ${swing(208, 'left', leftLeaf)}
      ${swing(492, 'right', rightLeaf)}
    </g>
    ${post(190)}${post(510)}
    ${padlock ? gatePadlock(padlock === 'open') : ''}
  </g>`;
}

/** The lock with three wheels on the gate: shut where the leaves meet, or open on its post. */
function gatePadlock(open) {
  const wheels = [0, 1, 2].map((k) => `<rect x="${-27 + k * 19}" y="2" width="16" height="22" rx="4" fill="#fffaf0" stroke="#1b1330" stroke-width="3"/>`).join('');
  const lock = `<path d="M-18 0 V-16 a18 18 0 0 1 36 0 V${open ? -30 : 0}" fill="none" stroke="#c4c8d4" stroke-width="8"/>
    <rect x="-32" y="-4" width="64" height="44" rx="10" fill="#6a6e80" stroke="#26262e" stroke-width="5"/>${wheels}`;
  return open
    ? `<g transform="translate(530 700) rotate(14)">${lock}</g>`
    : `<g transform="translate(350 712)"><circle r="56" fill="url(#g-lantern)" opacity=".5"/>${lock}</g>`;
}

/** Night sky without star dots (the house brings its own five), with the moon. */
const sky = (moon = [1460, 120]) => nightSky({ moon, r: 90, stars: false });

/** The heath: low purple hills with heather. */
function heath(y = 640, near = true) {
  return `<path d="M0 ${y - 60} Q300 ${y - 120} 700 ${y - 70} T1600 ${y - 90} V900 H0Z" fill="#2e2648"/>
    ${near ? Array.from({ length: 9 }, (_, k) => at(k * 190 - 30, y - 50 + (k % 2) * 16, 1, scenery('Heather'))).join('') : ''}
    <path d="M0 ${y} Q800 ${y - 40} 1600 ${y} V900 H0Z" fill="#241e3a"/>`;
}

/** Where the house stands per layout: [x, y, scale]. */
const HOUSE_AT = {
  map: [690, 40, 0.92],
  tall: [600, 110, 0.5],
  story: [760, 26, 0.72],
  close: [660, 4, 0.76],
};

/** The house on the heath at night, as far as the book has got. */
function houseScene({ done = 0, layout = 'story', back = '', front = '', out = false, padlock = null, moon } = {}) {
  const [x, y, s] = HOUSE_AT[layout];
  const ground = y + 712 * s;
  return `${sky(moon ?? (layout === 'tall' ? [1000, 80] : [1460, 120]))}
    <path d="M0 ${ground - 70} Q400 ${ground - 130} 900 ${ground - 80} T1600 ${ground - 100} V900 H0Z" fill="#2e2648"/>
    ${back}
    <path d="M0 ${ground + 4} Q800 ${ground - 30} 1600 ${ground + 4} V900 H0Z" fill="#241e3a"/>
    ${at(x, y, s, hugoHouse(houseOf(done), { out, padlock }))}
    ${front}`;
}

/** The book map's backdrop: the house, changing as the chapters are done. */
function map({ done = [], tall = false } = {}) {
  return houseScene({ done, layout: tall ? 'tall' : 'map' });
}

// ---------- rooms inside the house ----------

/** The long corridor: striped wallpaper, portraits, candles in sconces, a wooden floor. */
function corridor({ runner = false } = {}) {
  const stripes = Array.from({ length: 20 }, (_, k) => `<rect x="${k * 80}" y="0" width="40" height="470" fill="#523a5c"/>`).join('');
  const frame = (x, y, inner) => `<g transform="translate(${x} ${y})"><rect width="150" height="180" rx="8" fill="#2a2140" stroke="#c9a13a" stroke-width="10"/>${inner}</g>`;
  return `<rect width="1600" height="900" fill="#47324f"/>${stripes}
    <rect y="470" width="1600" height="130" fill="#5a3a24"/>
    ${Array.from({ length: 8 }, (_, k) => `<rect x="${k * 200 + 20}" y="490" width="160" height="90" rx="6" fill="none" stroke="#3e2614" stroke-width="5"/>`).join('')}
    <rect y="600" width="1600" height="300" fill="#6b4a2e"/>
    ${Array.from({ length: 7 }, (_, k) => `<path d="M0 ${620 + k * 44} H1600" stroke="#57391f" stroke-width="4"/>`).join('')}
    ${runner ? '<rect y="660" width="1600" height="90" fill="#9a2a34"/><path d="M0 668 H1600 M0 742 H1600" stroke="#e8b84a" stroke-width="6"/>' : ''}
    ${frame(240, 120, at(10, 20, 1.3, darkGoat()))}
    ${frame(980, 110, '<circle cx="75" cy="80" r="34" fill="#6d5a9a"/><path d="M30 180 Q75 110 120 180Z" fill="#6d5a9a"/>')}
    ${at(620, 210, 1.2, candle(true))}${at(1300, 210, 1.2, candle(true))}
    <path d="M1420 600 V250 a80 70 0 0 1 160 0 V600z" fill="#3a2414" stroke="#1b1330" stroke-width="8"/>`;
}

/** The cellar: a stone vault with dark water; the raft at `raftX`. */
function cellar({ raftX = 1000, key = true, light = false, stairs = true } = {}) {
  const blocks = [];
  for (let y = 0; y < 520; y += 80) {
    for (let x = (y / 80) % 2 ? -70 : 0; x < 1600; x += 140) blocks.push(`<rect x="${x + 4}" y="${y + 4}" width="132" height="72" rx="10"/>`);
  }
  return `<rect width="1600" height="900" fill="#262234"/>
    <g fill="#302b42">${blocks.join('')}</g>
    <path d="M0 0 Q400 120 800 40 Q1200 120 1600 0 V-10 H0Z" fill="#1b1828"/>
    ${[260, 800, 1340].map((x) => `<path d="M${x - 200} 0 Q${x} 160 ${x + 200} 0" fill="none" stroke="#1b1828" stroke-width="30"/>`).join('')}
    <rect y="520" width="1600" height="380" fill="${light ? '#2f6fa0' : '#1d3a5a'}"/>
    ${[560, 610, 670].map((y, i) => `<path d="M${i * 60} ${y} q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#6fa8d8" stroke-width="5" fill="none" opacity=".5"/>`).join('')}
    ${stairs ? `<path d="M0 500 L400 500 L460 620 L0 620Z" fill="#4a4258" stroke="#1b1330" stroke-width="6"/>
      ${[0, 1, 2, 3].map((k) => `<rect x="${20 + k * 60}" y="${300 + k * 50}" width="120" height="30" fill="#5a5270" stroke="#1b1330" stroke-width="5"/>`).join('')}` : ''}
    ${at(raftX, 470, 1.4, raft({ key }))}`;
}

/**
 * The library: shelves of books, Oma Hilde's painting, the black stone on a
 * shelf. `oma` is where her painting hangs ([x, y, scale]); `floor` is where
 * the wall ends; the right bookcase starts at `right`, and the stone stands
 * in a gap on its shelf number `stoneRow` (0 at the top).
 */
function library({ talk = false, stone = true, oma = [640, 70, 1.3], floor = 610, right = 1160, stoneRow = 1 } = {}) {
  const rows = [];
  for (let y = 180; y < floor - 40; y += 160) rows.push(y);
  const stoneY = rows[Math.min(stoneRow, rows.length - 1)];
  const gap = [(right + 1600) / 2 - 60, (right + 1600) / 2 + 60];
  const shelf = (x, y, w) => {
    const books = [];
    for (let bx = x + 10, k = 0; bx < x + w - 30; k++) {
      const bw = 22 + ((k * 7) % 16);
      const bh = 70 + ((k * 13) % 30);
      const inGap = stone && y === stoneY && x === right + 10 && bx + bw > gap[0] && bx < gap[1];
      if (!inGap) books.push(`<rect x="${bx}" y="${y - bh}" width="${bw}" height="${bh}" rx="3" fill="${['#8a3f3f', '#3f6a8a', '#6d5a9a', '#4f8a5a', '#b8862a'][k % 5]}" stroke="#1b1330" stroke-width="3"/>`);
      bx += bw + 3;
    }
    return `${books.join('')}<rect x="${x}" y="${y}" width="${w}" height="18" fill="#6b4a2a" stroke="#2a1a0e" stroke-width="4"/>`;
  };
  const [ox, oy, os] = oma;
  return `<rect width="1600" height="900" fill="#3a2a22"/>
    <rect x="0" y="40" width="440" height="${floor - 30}" fill="#4a3220" stroke="#2a1a0e" stroke-width="8"/>
    <rect x="${right}" y="40" width="${1600 - right}" height="${floor - 30}" fill="#4a3220" stroke="#2a1a0e" stroke-width="8"/>
    ${rows.map((y) => shelf(10, y, 420) + shelf(right + 10, y, 1600 - right - 20)).join('')}
    <rect y="${floor}" width="1600" height="${900 - floor}" fill="#5a3a24"/>
    <rect x="560" y="${floor}" width="480" height="${900 - floor}" fill="#7a2a34" opacity=".8"/>
    ${at(ox, oy, os, omaHilde({ talk }))}
    ${stone ? `<g transform="translate(${gap[0] + 20} ${stoneY - 74})"><circle cx="40" cy="44" r="${talk ? 70 : 54}" fill="#b58cff" opacity=".22" filter="url(#f-soft)"/>${at(0, 0, 0.8, picture('zwarteSteen'))}</g>` : ''}
    ${talk ? `<g stroke="#ffe27a" stroke-width="7" stroke-linecap="round" fill="none" transform="translate(${ox + 100 * os} ${oy + 125 * os})">
      <path d="M${-118 * os} -20 l-34 -10 M${-120 * os} 30 l-38 2 M${-118 * os} 80 l-34 12"/><path d="M${118 * os} -20 l34 -10 M${120 * os} 30 l38 2 M${118 * os} 80 l34 12"/></g>` : ''}`;
}

/** Barend's room in the tower: round stone walls, a small window, straw. */
function towerRoom() {
  const blocks = [];
  for (let y = 0; y < 900; y += 90) {
    for (let x = (y / 90) % 2 ? -80 : 0; x < 1600; x += 160) blocks.push(`<rect x="${x + 4}" y="${y + 4}" width="152" height="82" rx="10"/>`);
  }
  return `<rect width="1600" height="900" fill="#3a3346"/>
    <g fill="#443c52">${blocks.join('')}</g>
    <path d="M1300 340 V230 a70 70 0 0 1 140 0 V340z" fill="url(#g-night)" stroke="#6f6a7a" stroke-width="16"/>
    <circle cx="1400" cy="214" r="34" fill="url(#g-moon)"/>
    <rect y="610" width="1600" height="290" fill="#6b4a2e"/>
    ${Array.from({ length: 26 }, (_, k) => `<path d="M${(k * 131) % 1600} ${630 + ((k * 53) % 250)} l${40 + (k % 3) * 10} ${-8 + (k % 4) * 5}" stroke="#e8c86a" stroke-width="6" stroke-linecap="round" opacity=".7"/>`).join('')}
    <path d="M0 140 H140 V610 H0Z" fill="#5a3a24" stroke="#1b1330" stroke-width="8"/>
    <rect x="0" y="600" width="150" height="14" fill="#ffd35a" opacity=".8"/>`;
}

/** Hugo's garden at night: the ditch with stepping stones, the tower behind. */
function garden({ open = true } = {}) {
  return `${sky([1450, 110])}
    ${at(820, -150, 0.95, hugoHouse(houseOf([1, 1, 1, 1, 1, open]), { awake: open }))}
    <path d="M0 470 Q800 430 1600 470 V900 H0Z" fill="#2b4a36"/>
    <path d="M0 560 Q400 520 800 556 T1600 548 V680 Q1200 700 800 676 T0 690Z" fill="#1d3a5a"/>
    ${[580, 620, 650].map((y) => `<path d="M0 ${y} q100 -12 200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0 t200 0" stroke="#6fa8d8" stroke-width="4" fill="none" opacity=".45"/>`).join('')}
    ${[[260, 600], [520, 580], [800, 610], [1080, 588]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="70" ry="26" fill="#8a8a9a" stroke="#3a3a4a" stroke-width="5"/>`).join('')}`;
}

// ---------- puzzle backdrops ----------
// Scenes behind a chapter's puzzle (see engines.js; the pieces that go on
// the board are in skins2.js). Backdrops are dimmed a little and keep their
// detail away from the middle.

/** Backdrops behind a Book 2 puzzle (1600×900). */
const BACKDROPS = {
  gate: () => `${sky([1480, 100])}${heath(700)}${shade(0.45)}`,
  corridor: () => `${corridor({ runner: true })}${shade(0.45)}`,
  cellar: () => `${cellar({ key: false, stairs: false })}${shade(0.4)}`,
  // Oma's painting hangs high on the right, above the buttons, beside the sliding picture.
  library: () => `${library({ oma: [1000, 66, 1.05], floor: 840, right: 1300, stoneRow: 3 })}${shade(0.35)}`,
  towerRoom: () => `${towerRoom()}${shade(0.35)}`,
  garden: () => `${garden()}${shade(0.4)}`,
};

/** The torn drawing of Hugo's house with Barend in the tower (300×300), for the sliding picture. */
export function drawing() {
  const pencil = 'stroke="#3a2e5a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const torn = 'M4 10 L30 4 L52 12 L80 2 L120 8 L150 3 L190 10 L230 2 L262 9 L296 4 L292 40 L298 80 L290 130 L297 170 L291 220 L298 260 L294 296 L250 290 L210 297 L170 291 L130 298 L90 292 L50 298 L8 293 L3 250 L9 210 L2 160 L8 110 L2 60Z';
  return `<g class="torn-drawing">
    <rect width="300" height="300" fill="#2a1d14"/>
    <path d="${torn}" fill="#f3e6c4" stroke="#b8a070" stroke-width="3"/>
    ${[40, 80, 120, 160, 200, 240].map((y) => `<path d="M14 ${y} H286" stroke="#d8c8a0" stroke-width="2"/>`).join('')}
    <path d="M36 268 V150 H186 V268 M24 156 L111 92 L198 156" ${pencil}/>
    <path d="M196 268 V70 H252 V268 M188 76 L224 22 L260 76" ${pencil}/>
    <path d="M206 132 h30 v26 h-30z M206 196 h30 v26 h-30z M96 268 v-40 h30 v40 M56 190 h30 v26 h-30z M136 190 h30 v26 h-30z" ${pencil}/>
    <g transform="translate(224 102) scale(.5)">${goatFace()}</g>
    <circle cx="224" cy="102" r="30" stroke="#d8433a" stroke-width="5" fill="none" stroke-dasharray="40 6"/>
    <path d="M150 52 Q186 40 196 78" stroke="#d8433a" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M190 64 l8 16 l6 -16" stroke="#d8433a" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${[[40, 50], [86, 40], [130, 56]].map(([x, y]) => `<path d="M${x} ${y - 10} l3 7 h8 l-6 5 l2 8 l-7 -4 l-7 4 l2 -8 l-6 -5 h8z" fill="#f2c23a" stroke="#8c6420" stroke-width="2"/>`).join('')}
    <path d="M24 272 h252" ${pencil}/>
  </g>`;
}

// ---------- Book 2 scenes ----------

/** Story scenes for Book 2. `done` is how many chapters are done (the house changes with it). */
function scene(name, { done = 0 } = {}) {
  // Phones show the middle of a scene (about x 200–1400): what matters stays in x 300–1300.
  const pimAt = (x = 300, y = 300, s = 2) => at(x, y, s, pimAlone());
  switch (name) {
    case 'taken':
      return `${sky([1240, 140])}${heath(660)}
        ${at(1000, 300, 0.36, hugoHouse())}
        ${at(380, 120, 2.2, rider())}
        ${at(430, 196, 1.6, flip(barend()))}
        <g transform="translate(470 190)">${bubble('Mèèè!', 240, { flipTail: true })}</g>`;
    case 'way':
      return `${sky([1240, 110])}${heath(660)}
        ${at(900, 140, 0.48, hugoHouse())}
        <path d="M380 640 Q700 560 1020 520" stroke="#3e3460" stroke-width="40" fill="none" stroke-linecap="round"/>
        ${pimAt(330, 300, 2)}`;
    case 'gate':
      return houseScene({ done, layout: 'close', padlock: 'shut', front: pimAt(330, 300, 1.9) });
    case 'gateOpen':
      return houseScene({ done, layout: 'close', padlock: 'open', front: pimAt(330, 300, 1.9) + shout(430, 250, 'Klik!') });
    case 'corridor':
      return `${corridor({ runner: false })}
        ${at(760, 330, 2.9, sleeper({ z: false }))}${zzz(1020, 330, 1.3)}
        ${pimAt(330, 320, 1.8)}`;
    case 'sneak':
      return `${corridor({ runner: true })}
        ${at(860, 330, 2.9, sleeper({ z: false }))}${zzz(1110, 330, 1.3)}
        ${at(380, 330, 2.8, sneakingPim())}`;
    case 'cellar':
      return `${cellar({ raftX: 1000 })}${pimAt(230, 190, 1.9)}`;
    case 'raft':
      return `${cellar({ raftX: 460, key: false, light: true })}
        ${at(230, 190, 1.9, pimAlone({ arms: true }))}
        <circle cx="330" cy="220" r="70" fill="url(#g-lantern)"/>${at(270, 150, 1.3, picture('sleutel'))}`;
    case 'library':
      return `${library({ talk: true })}${pimAt(420, 330, 1.8)}`;
    case 'drawing':
      return `${library({ talk: false })}
        <g transform="translate(560 40) rotate(-3) scale(1.6)">${drawing()}</g>
        ${pimAt(330, 330, 1.8)}`;
    case 'stone':
      // Close by: Oma's painting, Pim, and the stone on a little table in the light.
      return `${library({ talk: true, stone: false, oma: [320, 70, 1.3] })}
        <rect x="900" y="430" width="260" height="22" rx="6" fill="#6b4a2a" stroke="#2a1a0e" stroke-width="5"/>
        <path d="M930 452 V610 M1130 452 V610" stroke="#4a3220" stroke-width="16"/>
        ${at(920, 220, 2.2, blackStone(true))}
        ${pimAt(640, 330, 1.8)}`;
    case 'stairs': {
      const steps = Array.from({ length: 7 }, (_, k) => `<path d="M${560 + k * 110} ${620 - k * 70} h130 v28 h-130z" fill="#6f6a7a" stroke="#1b1330" stroke-width="5"/>`).join('');
      return `${towerRoom()}${shade(0.2)}${steps}
        <path d="M1140 200 V40 a80 70 0 0 1 160 0 V200z" fill="#5a3a24" stroke="#1b1330" stroke-width="8"/>
        ${at(330, 330, 1.8, pimAlone())}
        <circle cx="560" cy="380" r="60" fill="url(#g-lantern)"/>${at(510, 330, 1, picture('sleutel'))}`;
    }
    case 'door':
      return `${towerRoom()}${shade(0.15)}
        <rect x="640" y="140" width="80" height="480" fill="#5a3a24" stroke="#1b1330" stroke-width="8"/>
        <path d="M666 140 V620 M694 140 V620" stroke="#3e2614" stroke-width="4"/>
        <rect x="720" y="360" width="90" height="26" rx="8" fill="#8d909c" stroke="#3d3f4a" stroke-width="5"/>
        <rect x="790" y="340" width="26" height="66" rx="6" fill="#5c6070" stroke="#3d3f4a" stroke-width="5"/>
        ${at(340, 300, 2, pimAlone())}
        ${at(850, 400, 2.6, flip(barend()))}
        <g transform="translate(1040 320)">${bubble('Mèè?', 200)}</g>`;
    case 'hug':
      return `${towerRoom()}${shade(0.1)}
        ${at(480, 300, 2, pimAlone({ arms: true }))}
        ${at(620, 410, 2.4, flip(barend()))}
        ${hearts([[660, 260], [750, 210], [840, 270]], null)}
        ${shout(1060, 240, 'Mèèè!', 100)}`;
    case 'awake':
      return `<rect width="1600" height="900" fill="#2e2748"/>
        <path d="M1100 360 V230 a80 80 0 0 1 160 0 V360z" fill="url(#g-night)" stroke="#120d22" stroke-width="14"/>
        <rect x="320" y="420" width="760" height="200" rx="20" fill="#6b4024" stroke="#2a1a0e" stroke-width="8"/>
        <rect x="300" y="300" width="60" height="320" rx="14" fill="#6b4024" stroke="#2a1a0e" stroke-width="8"/>
        ${at(420, 120, 1.8, hugoStanding({ pose: 'stamp' }))}
        <path d="M380 440 Q560 400 760 420 Q900 380 1060 440 V560 H380Z" fill="#6d5a9a" stroke="#2a1d3a" stroke-width="6"/>
        <path d="M480 470 Q700 440 1000 470" stroke="#9a88c8" stroke-width="6" fill="none"/>
        <g transform="translate(720 200)">${bubble('Wie is daar?', 420, { size: 60 })}</g>
        ${at(1140, 400, 1.2, candle(true))}`;
    case 'garden':
      return `${garden()}${at(300, 290, 2.6, pim({ glow: false }))}`;
    case 'jump':
      return `${garden()}${at(560, 220, 2.8, pim({ glow: false }))}
        <path d="M380 560 Q520 240 760 360" stroke="#fffaf0" stroke-width="8" fill="none" stroke-dasharray="14 16" opacity=".7"/>
        ${shout(440, 200, 'Hop!')}`;
    case 'run':
      return `${sky([400, 120])}${heath(660)}
        ${at(960, 200, 0.5, hugoHouse(houseOf(6)))}
        ${at(320, 330, 3, flip(pim({ glow: false })))}
        ${[0, 1, 2].map((i) => `<path d="M${660 + i * 30} ${430 + i * 40} h${120 - i * 30}" stroke="#cfd6ee" stroke-width="8" stroke-linecap="round" opacity=".6"/>`).join('')}`;
    case 'stamp':
      return houseScene({ done: 6, layout: 'story', front: `${at(380, 210, 1.9, hugoStanding({ pose: 'stamp' }))}
        <g transform="translate(680 220)">${bubble('Grrr!', 220, { color: '#8a2420' })}</g>
        <path d="M430 640 l-30 20 M560 640 l30 20 M490 650 v30" stroke="#ffe27a" stroke-width="8" stroke-linecap="round"/>` });
    case 'spell':
      return `${houseScene({ done: 6, layout: 'story', back: '<circle cx="700" cy="160" r="300" fill="#b58cff" opacity=".18" filter="url(#f-soft)"/>' })}
        ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M680 150 L${680 + Math.cos(i * 0.785) * 260} ${150 + Math.sin(i * 0.785) * 260}" stroke="#d9b8ff" stroke-width="10" stroke-linecap="round" opacity=".6"/>`).join('')}
        ${at(380, 190, 2, hugoStanding({ pose: 'up' }))}
        ${shout(720, 140, 'Boem!', 120, '#e0b8ff')}`;
    case 'out':
      // Every light in the house goes out: smoke curls from the windows, and Hugo stands in the dark.
      return houseScene({ done: 6, layout: 'story', out: true, front: `${shade(0.3)}
        ${[[860, 380], [1000, 470], [1150, 470], [1220, 170]].map(([x, y]) => `<path d="M${x} ${y} q-14 -18 0 -36 q14 -18 0 -36" stroke="#9aa3c8" stroke-width="7" fill="none" opacity=".8"/>`).join('')}
        ${at(400, 210, 1.9, hugoStanding())}${shout(600, 220, '?!', 100)}` });
    case 'spookhuis':
      // The haunted house as its own mode shows it: the dark mansion, and Hugo stuck in his painting.
      return `${sky([1240, 110])}
        <path d="M0 610 Q800 570 1600 610 V900 H0Z" fill="#2e2648"/>
        ${at(560, 70, 0.56, mansion({ windows: true }))}
        <path d="M0 640 Q800 610 1600 640 V900 H0Z" fill="#241e3a"/>
        ${at(320, 190, 2.1, hugoPortrait())}`;
    default:
      return houseScene({ done, layout: 'story' });
  }
}

/** Book 2's cover picture (240×250): the house with Barend in the tower, Pim at the gate. */
function cover() {
  return `<rect width="240" height="250" fill="#27203e"/><circle cx="40" cy="40" r="22" fill="url(#g-moon)"/>
    ${at(10, 20, 0.28, hugoHouse())}${at(-6, 150, 0.62, pimAlone())}`;
}

// ---------- the book ----------

/** Book 2's art, for index.js (see BOOK in art.js). The stops run along Book 1's path, to Hugo's gate. */
export const BOOK = {
  scene,
  map,
  cover,
  layouts: () => LAYOUTS,
  backdrops: BACKDROPS,
};
