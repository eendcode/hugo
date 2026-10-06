// De kelder: turn the pipes so the water from the pump reaches every pipe
// and nothing leaks. The pipes form a random tree, so there is one way.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { starsFrom } from './room.js';

// Openings as bits: north, east, south, west.
const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRS = [
  [N, 0, -1, S],
  [E, 1, 0, W],
  [S, 0, 1, N],
  [W, -1, 0, E],
];

/** (size, pipes turned out of place) per level. */
const LEVELS = [
  [3, 3],
  [3, 5],
  [4, 6],
  [4, 9],
  [4, 12],
  [5, 12],
  [5, 17],
  [5, 22],
];

/** The openings after a quarter turn clockwise. */
function turn(mask) {
  return ((mask << 1) | (mask >> 3)) & 15;
}

const ARM = { [N]: 'M50 50V0', [E]: 'M50 50H100', [S]: 'M50 50V100', [W]: 'M50 50H0' };

export class Pipes {
  constructor(ctx) {
    this.ctx = ctx;
    const [n, scramble] = LEVELS[Math.min(ctx.level, LEVELS.length - 1)];
    const r = ctx.rng;
    this.n = n;
    this.source = r.below(n) * n; // left column; the pump is off the board to the west
    // A random spanning tree grown from the pump.
    const want = new Array(n * n).fill(0);
    want[this.source] |= W;
    const seen = new Set([this.source]);
    const stack = [this.source];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const [x, y] = [cur % n, Math.floor(cur / n)];
      const next = r.shuffle([...DIRS]).find(([, dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen.has(ny * n + nx);
      });
      if (!next) {
        stack.pop();
        continue;
      }
      const [bit, dx, dy, back] = next;
      const to = (y + dy) * n + x + dx;
      want[cur] |= bit;
      want[to] |= back;
      seen.add(to);
      stack.push(to);
    }
    this.want = want;
    this.mask = [...want];
    // Turn some pipes out of place (ones where turning changes something).
    const cells = r.shuffle(want.map((_, i) => i).filter((i) => turn(want[i]) !== want[i]));
    for (const i of cells.slice(0, scramble)) {
      const turns = 1 + r.below(3);
      for (let k = 0; k < turns; k++) this.mask[i] = turn(this.mask[i]);
    }
    this.history = [];
    this.initial = `p-${this.source}`;
  }

  goal() {
    return t('goalPipes');
  }

  html() {
    const size = this.n * 100;
    // A story skin (ctx.art, see the saga's engines.js) may draw the board and
    // pump its own way, boardArt(n, source), in a viewBox of its own, box(n).
    const art = this.ctx.art;
    return `<svg class="pipes board" viewBox="${art?.box?.(this.n).join(' ') ?? `-110 -10 ${size + 120} ${size + 20}`}">
      ${art?.boardArt?.(this.n, this.source) ?? `<rect x="-10" y="-10" width="${size + 20}" height="${size + 20}" rx="14" fill="#1d2233"/>
      <g class="pump" transform="translate(-100 ${Math.floor(this.source / this.n) * 100})">
        <rect x="10" y="20" width="60" height="60" rx="10" fill="#4f6fa0" stroke="#1b1330" stroke-width="4"/>
        <circle cx="40" cy="50" r="16" fill="#9fd8ff"/>
        <path d="M70 50H100" stroke="#1b1330" stroke-width="30"/><path d="M70 50H100" stroke="#3aa0e0" stroke-width="18"/>
      </g>`}
      <g class="cells"></g>
    </svg>`;
  }

  mount(el) {
    this.cells = el.querySelector('.cells');
    this.render();
  }

  /** Cells the water reaches, following openings that meet. */
  wet() {
    const n = this.n;
    const reached = new Set();
    if (!(this.mask[this.source] & W)) return reached;
    const queue = [this.source];
    reached.add(this.source);
    while (queue.length) {
      const cur = queue.shift();
      const [x, y] = [cur % n, Math.floor(cur / n)];
      for (const [bit, dx, dy, back] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (!(this.mask[cur] & bit) || nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const to = ny * n + nx;
        if (this.mask[to] & back && !reached.has(to)) {
          reached.add(to);
          queue.push(to);
        }
      }
    }
    return reached;
  }

  /** Does every opening meet another (or the pump)? */
  sealed() {
    const n = this.n;
    return this.mask.every((m, i) => {
      const [x, y] = [i % n, Math.floor(i / n)];
      return DIRS.every(([bit, dx, dy, back]) => {
        if (!(m & bit)) return true;
        if (i === this.source && bit === W) return true;
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < n && ny < n && this.mask[ny * n + nx] & back;
      });
    });
  }

  render() {
    const wet = this.wet();
    this.cells.innerHTML = this.mask
      .map((m, i) => {
        const x = (i % this.n) * 100;
        const y = Math.floor(i / this.n) * 100;
        const d = [N, E, S, W].filter((b) => m & b).map((b) => ARM[b]).join('');
        return `<g class="cell ${wet.has(i) ? 'wet' : ''}" data-nav="p-${i}" transform="translate(${x} ${y})">
          <rect x="3" y="3" width="94" height="94" rx="10" class="plate"/>
          <g class="cell-inner">
            <path d="${d}" class="pipe-out"/><path d="${d}" class="pipe-in"/>
            <circle cx="50" cy="50" r="17" class="joint"/>
          </g>
        </g>`;
      })
      .join('');
    this.ctx.refresh();
    return wet;
  }

  activate(id) {
    const i = Number(id.slice(2));
    this.history.push([i, this.mask[i]]);
    this.mask[i] = turn(this.mask[i]);
    audio.play('rotate');
    this.check();
  }

  check() {
    const wet = this.render();
    if (wet.size === this.mask.length && this.sealed()) this.ctx.solved();
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    if (!this.history.length) return false;
    const [i, m] = this.history.pop();
    this.mask[i] = m;
    this.render();
    return true;
  }

  hint() {
    // Nearest wrong pipe to the water first.
    const wet = this.wet();
    const wrong = this.mask.map((m, i) => i).filter((i) => this.mask[i] !== this.want[i]);
    if (!wrong.length) return false;
    const i = wrong.find((k) => wet.has(k)) ?? wrong[0];
    this.history.push([i, this.mask[i]]);
    this.mask[i] = this.want[i];
    this.check();
    this.ctx.pulse(this.cells.querySelector(`[data-nav="p-${i}"]`));
    return true;
  }

  stars(hints) {
    return starsFrom(0, hints);
  }
}
