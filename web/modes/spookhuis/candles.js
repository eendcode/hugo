// De hal: light every candle. Touching a candle flips it and its four
// neighbours. The Rust core makes the puzzle and finds the fewest touches.
// A story skin (ctx.art, see the saga's engines.js) may draw the board,
// boardArt(size), and the candles, cellArt(lit), its own way.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { starsForMoves } from './room.js';
import { candle } from './art.js';

/** (board size, touches needed) per level. */
const LEVELS = [
  [3, 1],
  [3, 2],
  [3, 3],
  [3, 4],
  [4, 3],
  [4, 4],
  [5, 3],
  [5, 5],
];

export class Candles {
  constructor(ctx) {
    this.ctx = ctx;
    // A story chapter brings its own frozen board ({size, lit}); otherwise one is made for the level.
    const frozen = ctx.data?.lit ? ctx.data : null;
    const [size, presses] = frozen ? [frozen.size] : LEVELS[Math.min(ctx.level, LEVELS.length - 1)];
    const c = frozen
      ? { size, lit: [...frozen.lit], par: JSON.parse(ctx.core.candles_solve(size, JSON.stringify(frozen.lit)))?.length ?? 0 }
      : JSON.parse(ctx.core.candles_generate(size, presses, ctx.rng.below(0xffffffff)));
    this.size = c.size;
    this.lit = c.lit;
    this.par = c.par;
    this.touches = 0;
    this.history = [];
    this.initial = `p-${Math.floor((this.size * this.size) / 2)}`;
  }

  goal() {
    return t('goalCandles');
  }

  html() {
    return `<svg class="candles board" viewBox="-10 -10 ${this.size * 100 + 20} ${this.size * 100 + 20}">
      ${this.ctx.art?.boardArt?.(this.size) ?? `<rect x="-10" y="-10" width="${this.size * 100 + 20}" height="${this.size * 100 + 20}" rx="18" fill="#2a1f14"/>`}
      <g class="cells"></g>
    </svg>`;
  }

  mount(el) {
    this.cells = el.querySelector('.cells');
    this.render();
  }

  render() {
    this.cells.innerHTML = this.lit
      .map((on, i) => {
        const x = (i % this.size) * 100;
        const y = Math.floor(i / this.size) * 100;
        return `<g class="cell" data-nav="p-${i}" transform="translate(${x} ${y})">
          <rect x="4" y="4" width="92" height="92" rx="12" class="plate"/>
          <g class="cell-inner">${this.ctx.art?.cellArt?.(on) ?? candle(on)}</g>
        </g>`;
      })
      .join('');
    this.ctx.refresh();
  }

  flip(i) {
    const s = this.size;
    const [x, y] = [i % s, Math.floor(i / s)];
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < s && ny < s) this.lit[ny * s + nx] = !this.lit[ny * s + nx];
    }
  }

  activate(id) {
    const i = Number(id.slice(2));
    this.flip(i);
    this.history.push(i);
    this.touches++;
    audio.play(this.lit[i] ? 'place' : 'rotate');
    this.render();
    if (this.lit.every(Boolean)) this.ctx.solved();
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    if (!this.history.length) return false;
    this.flip(this.history.pop());
    this.touches--;
    this.render();
    return true;
  }

  hint() {
    const sol = JSON.parse(this.ctx.core.candles_solve(this.size, JSON.stringify(this.lit)));
    if (!sol?.length) return false;
    this.ctx.pulse(this.cells.querySelector(`[data-nav="p-${sol[0]}"]`));
    return true;
  }

  stars(hints) {
    return starsForMoves(this.touches, this.par, hints, 3);
  }
}
