// Het spiegelraam: a stained-glass window whose right half must mirror
// the left half. Tapping a pane on the right cycles its colour.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { starsFrom } from './room.js';
import { GLASS } from './art.js';

/** (columns, rows, colours, fraction of panes coloured) per level. */
const LEVELS = [
  [4, 3, 1, 0.45],
  [4, 4, 1, 0.5],
  [4, 4, 2, 0.55],
  [6, 4, 2, 0.55],
  [6, 5, 2, 0.6],
  [6, 5, 3, 0.6],
  [6, 6, 3, 0.6],
  [8, 6, 3, 0.6],
];

export class Mirror {
  constructor(ctx) {
    this.ctx = ctx;
    const [w, h, colors, fill] = LEVELS[Math.min(ctx.level, LEVELS.length - 1)];
    this.w = w;
    this.h = h;
    this.colors = colors;
    this.palette = ctx.rng.shuffle([...GLASS]).slice(0, colors);
    // Left half: a random pattern with every colour in it. 0 = clear glass.
    const half = w / 2;
    do {
      this.left = Array.from({ length: half * h }, () => (ctx.rng.chance(fill) ? 1 + ctx.rng.below(colors) : 0));
    } while (new Set(this.left.filter(Boolean)).size < colors);
    this.right = new Array(half * h).fill(0);
    this.history = [];
    this.initial = `p-${h * half - half}`;
  }

  goal() {
    return t('goalMirror');
  }

  /** The colour the right-half pane (x, y) should have: the mirror of the left. */
  want(x, y) {
    const half = this.w / 2;
    return this.left[y * half + (half - 1 - x)];
  }

  html() {
    const W = this.w * 100;
    const H = this.h * 100;
    return `<svg class="mirror board" viewBox="-30 -${W / 2 + 30} ${W + 60} ${H + W / 2 + 60}">
      <path class="window-frame" d="M-24 ${H + 24} V0 A${W / 2 + 24} ${W / 2 + 24} 0 0 1 ${W + 24} 0 V${H + 24}Z"/>
      <path class="window-arch" d="M0 0 A${W / 2} ${W / 2} 0 0 1 ${W} 0Z"/>
      <g class="panes"></g>
      <path class="mirror-line" d="M${W / 2} -${W / 2} V${H}"/>
    </svg>`;
  }

  mount(el) {
    this.panes = el.querySelector('.panes');
    this.render();
  }

  render() {
    const half = this.w / 2;
    const out = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const right = x >= half;
        const v = right ? this.right[y * half + x - half] : this.left[y * half + x];
        const fill = v ? this.palette[v - 1] : '';
        const nav = right ? ` data-nav="p-${y * half + x - half}"` : '';
        out.push(`<g class="pane ${right ? 'edit' : 'given'}"${nav} transform="translate(${x * 100} ${y * 100})">
          <rect x="3" y="3" width="94" height="94" rx="4" class="${v ? 'glass' : 'clear'}"${fill ? ` style="fill:${fill}"` : ''}/>
        </g>`);
      }
    }
    this.panes.innerHTML = out.join('');
    this.ctx.refresh();
  }

  activate(id) {
    const i = Number(id.slice(2));
    this.history.push([i, this.right[i]]);
    this.right[i] = (this.right[i] + 1) % (this.colors + 1);
    audio.play('rotate');
    this.render();
    if (this.isDone()) this.ctx.solved();
  }

  isDone() {
    const half = this.w / 2;
    return this.right.every((v, i) => v === this.want(i % half, Math.floor(i / half)));
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    if (!this.history.length) return false;
    const [i, v] = this.history.pop();
    this.right[i] = v;
    this.render();
    return true;
  }

  hint() {
    const half = this.w / 2;
    const i = this.right.findIndex((v, k) => v !== this.want(k % half, Math.floor(k / half)));
    if (i < 0) return false;
    this.history.push([i, this.right[i]]);
    this.right[i] = this.want(i % half, Math.floor(i / half));
    this.render();
    this.ctx.pulse(this.panes.querySelector(`[data-nav="p-${i}"]`));
    if (this.isDone()) this.ctx.solved();
    return true;
  }

  stars(hints) {
    return starsFrom(0, hints);
  }
}
