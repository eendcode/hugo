// Art for Barends programma: Barend on his own, apples, his stable, the
// program cards, and story scenes. 100×100 boxes unless noted.

import { scenery, pim } from '../../art.js';

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

/** Barend the goat, facing right. */
export function barend() {
  return `<g class="barend">
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
    <path d="M40 58 q10 -6 20 0" stroke="#d8433a" stroke-width="4" fill="none"/>
  </g>`;
}

export function apple() {
  return `<g class="apple">
    <circle cx="50" cy="56" r="22" fill="#d8433a"/>
    <circle cx="42" cy="48" r="6" fill="#ff8a7a" opacity=".7"/>
    <path d="M50 36 q2 -10 8 -12" stroke="#6b4a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M52 32 q12 -8 18 2 q-10 6 -18 -2z" fill="#4f9a55"/>
  </g>`;
}

export function stable(lit = true) {
  return `<g class="stable">
    ${lit ? '<circle cx="50" cy="60" r="36" fill="url(#g-lantern)" opacity=".45"/>' : ''}
    <rect x="18" y="46" width="64" height="42" fill="#a0522d" stroke="#5a2e1a" stroke-width="3"/>
    <polygon points="10,50 50,18 90,50" fill="#7a3a22" stroke="#5a2e1a" stroke-width="3"/>
    <path d="M38 88 v-26 h24 v26" fill="#f0d59c" stroke="#5a2e1a" stroke-width="3"/>
    <path d="M38 62 l24 26 M62 62 l-24 26" stroke="#5a2e1a" stroke-width="3"/>
  </g>`;
}

export function grass() {
  return `<rect x="2" y="2" width="96" height="96" rx="8" fill="#2f5a3a"/>
    <path d="M20 70 q3 -8 6 -12 M26 72 q1 -8 5 -12 M68 34 q3 -8 6 -12 M74 36 q1 -8 5 -12" stroke="#4f8a5a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

export function tree() {
  return scenery('Pine');
}

const ROT = { N: 0, E: 1, S: 2, W: 3 };

/** A program card's picture: an arrow, or a turn, with ×n for more steps. */
export function cardArt(card) {
  const n = card.n > 1 ? `<g class="card-count"><circle cx="78" cy="78" r="18"/><text x="78" y="86">${card.n}</text></g>` : '';
  switch (card.type) {
    case 'Step':
      return `<g transform="rotate(${ROT[card.dir] * 90} 50 50)"><path class="card-arrow" d="M50 12 L82 46 H62 V88 H38 V46 H18Z"/></g>${n}`;
    case 'Forward':
      return `<path class="card-arrow fwd" d="M50 12 L82 46 H62 V88 H38 V46 H18Z"/>${n}`;
    case 'Left':
      return `<path class="card-turn" d="M70 84 V52 a20 20 0 0 0 -20 -20 H34"/><path class="card-arrow" d="M14 32 L38 12 V52Z"/>`;
    case 'Right':
      return `<path class="card-turn" d="M30 84 V52 a20 20 0 0 1 20 -20 H66"/><path class="card-arrow" d="M86 32 L62 12 V52Z"/>`;
    default:
      return '';
  }
}

function meadow(extra = '') {
  return `<rect width="1600" height="900" fill="url(#g-night)"/>
    <circle cx="1350" cy="140" r="100" fill="url(#g-moon)"/>${extra}
    <path d="M0 640 Q400 580 800 630 T1600 620 V900 H0Z" fill="#2f5a3a"/>
    <path d="M0 760 Q800 720 1600 760 V900 H0Z" fill="#274d31"/>`;
}

export function scene(name) {
  switch (name) {
    case 'hungry':
      return `${meadow()}${at(300, 360, 4.4, barend())}
        ${[0, 1, 2].map((k) => at(1000 + k * 150, 520 - k * 30, 1.4, apple())).join('')}
        ${at(1180, 260, 2.6, stable())}`;
    case 'cards':
      return `${meadow()}${at(200, 420, 3.6, pim())}
        ${[{ type: 'Step', dir: 'E' }, { type: 'Step', dir: 'E', n: 2 }, { type: 'Step', dir: 'S' }].map((c, k) => `<g transform="translate(${760 + k * 230} ${280}) scale(2)"><rect x="4" y="4" width="92" height="92" rx="14" fill="#fff3c4" stroke="#b8862a" stroke-width="5"/>${cardArt({ n: 1, ...c })}</g>`).join('')}`;
    case 'home':
      return `<rect width="1600" height="900" fill="url(#g-dawn)"/>
        <circle cx="1300" cy="240" r="200" fill="url(#g-sun)"/>
        <path d="M0 640 Q400 580 800 630 T1600 620 V900 H0Z" fill="#6fae5f"/>
        ${at(760, 200, 5, stable())}${at(260, 420, 3.6, barend())}
        ${[0, 1, 2].map((k) => at(1260 + k * 90, 700, 0.9, apple())).join('')}`;
    case 'map':
      return meadow();
    default:
      return meadow();
  }
}

export function goal() {
  return stable();
}

export function card() {
  return `<rect x="10" y="96" width="180" height="40" rx="10" fill="#2f5a3a"/>
    ${at(20, 30, 0.8, barend())}${at(96, 70, 0.4, apple())}${at(122, 34, 0.7, stable())}
    ${[0, 1, 2].map((k) => `<g transform="translate(${26 + k * 40} 104) scale(.3)"><rect x="4" y="4" width="92" height="92" rx="14" fill="#fff3c4" stroke="#b8862a" stroke-width="6"/>${cardArt({ type: 'Step', dir: ['E', 'E', 'N'][k], n: 1 })}</g>`).join('')}`;
}
