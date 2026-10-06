// De bibliotheek: slide the pieces of the portrait back into place.
// The Rust core scrambles it and finds the next move of a shortest solution.
// A story skin (ctx.art, see the saga's engines.js) may give its own
// 300×300 picture, ctx.art.picture().

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { starsForMoves } from './room.js';
import { portrait } from './art.js';

/** (width, height, shortest solution from, to) per level. */
const LEVELS = [
  [3, 2, 3, 4],
  [3, 2, 5, 7],
  [3, 2, 8, 11],
  [3, 3, 5, 7],
  [3, 3, 8, 10],
  [3, 3, 11, 13],
  [3, 3, 14, 17],
  [3, 3, 18, 21],
];

export class Slide {
  constructor(ctx) {
    this.ctx = ctx;
    const [w, h, min, max] = LEVELS[Math.min(ctx.level, LEVELS.length - 1)];
    const s = JSON.parse(ctx.core.slide_generate(w, h, min, max, ctx.rng.below(0xffffffff)));
    this.w = s.width;
    this.h = s.height;
    this.tiles = s.tiles;
    this.par = s.par;
    this.moves = 0;
    this.history = [];
    this.numbers = ctx.level < 4;
    // 3×2 boards show the middle band of the square picture.
    this.y0 = (300 - this.h * 100) / 2;
    this.initial = `p-${this.tiles.indexOf(0)}`;
  }

  goal() {
    return t('goalSlide');
  }

  html() {
    const tiles = this.tiles
      .filter((t) => t)
      .map((t) => {
        const hx = (t - 1) % this.w;
        const hy = Math.floor((t - 1) / this.w);
        return `<g class="tile-piece" data-tile="${t}">
          <svg width="100" height="100" viewBox="${hx * 100} ${this.y0 + hy * 100} 100 100"><use href="#slide-picture"/></svg>
          <rect x="1.5" y="1.5" width="97" height="97" rx="6" class="tile-edge"/>
          ${this.numbers ? `<g class="tile-num"><circle cx="18" cy="18" r="13"/><text x="18" y="24">${t}</text></g>` : ''}
        </g>`;
      })
      .join('');
    const squares = this.tiles.map((_, i) => `<rect class="square" data-nav="p-${i}" x="${(i % this.w) * 100}" y="${Math.floor(i / this.w) * 100}" width="100" height="100"/>`).join('');
    return `<svg class="slide board" viewBox="-12 -12 ${this.w * 100 + 24} ${this.h * 100 + 24}">
      <defs><g id="slide-picture">${this.ctx.art?.picture?.() ?? portrait()}</g></defs>
      <rect x="-12" y="-12" width="${this.w * 100 + 24}" height="${this.h * 100 + 24}" rx="10" fill="#8a6420"/>
      <rect x="0" y="0" width="${this.w * 100}" height="${this.h * 100}" fill="#1b1330"/>
      <g class="pieces">${tiles}</g>
      <g class="squares">${squares}</g>
    </svg>`;
  }

  mount(el) {
    this.el = el;
    this.place(false);
  }

  /** Move every picture piece to its square. */
  place(animate = true) {
    this.tiles.forEach((t, i) => {
      if (!t) return;
      const g = this.el.querySelector(`[data-tile="${t}"]`);
      g.style.transition = animate ? '' : 'none';
      g.style.transform = `translate(${(i % this.w) * 100}px, ${Math.floor(i / this.w) * 100}px)`;
    });
  }

  adjacent(a, b) {
    const [ax, ay, bx, by] = [a % this.w, Math.floor(a / this.w), b % this.w, Math.floor(b / this.w)];
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  activate(id, el) {
    const i = Number(id.slice(2));
    const gap = this.tiles.indexOf(0);
    if (!this.tiles[i] || !this.adjacent(i, gap)) {
      this.ctx.wiggle(this.el.querySelector(`[data-tile="${this.tiles[i]}"]`) || el);
      return;
    }
    this.swap(i, gap);
    this.history.push(gap);
    this.moves++;
    audio.play('place');
    this.ctx.refresh();
    if (this.tiles.every((t, k) => t === (k + 1) % this.tiles.length)) {
      this.el.querySelector('.slide').classList.add('whole');
      this.ctx.solved();
    }
  }

  swap(a, b) {
    [this.tiles[a], this.tiles[b]] = [this.tiles[b], this.tiles[a]];
    this.place();
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    if (!this.history.length) return false;
    this.swap(this.history.pop(), this.tiles.indexOf(0));
    this.moves--;
    return true;
  }

  hint() {
    const sq = JSON.parse(this.ctx.core.slide_hint(this.w, this.h, JSON.stringify(this.tiles)));
    if (sq === null) return false;
    this.ctx.pulse(this.el.querySelector(`[data-tile="${this.tiles[sq]}"]`));
    return true;
  }

  stars(hints) {
    return starsForMoves(this.moves, this.par, hints, Math.ceil(this.par / 2));
  }
}
