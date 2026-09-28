// De schilderijenzaal: find the pairs among the paintings on the wall.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { sleep } from '../../shell.js';
import { starsForMoves } from './room.js';
import { PAIR_PICTURES } from './art.js';

/** (columns, rows) per level. */
const LEVELS = [
  [3, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 4],
  [4, 4],
  [5, 4],
  [6, 4],
];

export class Pairs {
  constructor(ctx) {
    this.ctx = ctx;
    const [w, h] = LEVELS[Math.min(ctx.level, LEVELS.length - 1)];
    this.w = w;
    this.h = h;
    const pairs = (w * h) / 2;
    const pics = ctx.rng.shuffle(PAIR_PICTURES.map((_, i) => i)).slice(0, pairs);
    this.cards = ctx.rng.shuffle([...pics, ...pics]);
    this.open = [];
    this.found = new Set();
    this.misses = 0;
    this.initial = 'p-0';
  }

  goal() {
    return t('goalPairs');
  }

  html() {
    return `<div class="pairs" style="--cols:${this.w}; --rows:${this.h}">
      ${this.cards.map((pic, i) => `<button class="card" data-nav="p-${i}"><svg class="back" viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="8"/><text x="50" y="66">?</text></svg><svg class="front" viewBox="0 0 100 100">${PAIR_PICTURES[pic]()}</svg></button>`).join('')}
    </div>`;
  }

  mount(el) {
    this.el = el;
  }

  card(i) {
    return this.el.querySelector(`[data-nav="p-${i}"]`);
  }

  activate(id) {
    const i = Number(id.slice(2));
    if (this.found.has(i) || this.open.includes(i)) return;
    this.open.push(i);
    this.card(i).classList.add('open');
    audio.play('select');
    if (this.open.length < 2) return;
    const [a, b] = this.open;
    this.open = [];
    if (this.cards[a] === this.cards[b]) {
      this.found.add(a).add(b);
      this.card(a).classList.add('found');
      this.card(b).classList.add('found');
      audio.play('treasure');
      if (this.found.size === this.cards.length) this.ctx.solved();
      return;
    }
    this.misses++;
    this.ctx.busy(async () => {
      await sleep(900);
      this.card(a).classList.remove('open');
      this.card(b).classList.remove('open');
    });
  }

  hint() {
    // Peek at one pair that isn't found yet.
    const i = this.cards.findIndex((_, k) => !this.found.has(k));
    if (i < 0) return false;
    const j = this.cards.findIndex((p, k) => k !== i && p === this.cards[i]);
    this.ctx.busy(async () => {
      for (const k of [i, j]) this.card(k).classList.add('open', 'peek');
      await sleep(1300);
      for (const k of [i, j]) if (!this.open.includes(k)) this.card(k).classList.remove('open', 'peek');
    });
    return true;
  }

  stars(hints) {
    // Every pair needs at least one look at each card; some misses are fine.
    const pairs = this.cards.length / 2;
    return starsForMoves(this.misses, Math.ceil(pairs / 2), hints, pairs);
  }
}
