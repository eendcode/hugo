// Maak de weg vrij: tap a cart, then tap where it should slide to (it
// only moves along its length). Get Barend's cart out through the gate.
// Hints come from the Rust core (carts_hint).

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { sleep } from '../../shell.js';
import { BoardScreen, starsFor } from '../gridplay.js';
import { cart, yardGround } from './art.js';

const GATE_ROW = 2;

export class YardScreen extends BoardScreen {
  get cls() {
    return 'yard';
  }

  setup() {
    this.size = this.level.size;
    this.n = this.size;
    this.carts = this.level.carts.map((c) => ({ ...c }));
    this.selected = null;
    this.targets = [];
    this.moves = 0;
  }

  goal() {
    return t('goalYard', { n: this.level.par });
  }

  initialFocus() {
    const c = this.carts[0];
    return `c${c.y * this.size + c.x}`;
  }

  cellBox(i) {
    return [(i % this.size) * 100, Math.floor(i / this.size) * 100, 100, 100];
  }

  boardHtml() {
    const S = this.size * 100;
    const cells = [];
    for (let i = 0; i < this.size * this.size; i++) {
      const [x, y] = this.cellBox(i);
      cells.push(`<rect class="yard-cell" data-nav="c${i}" x="${x}" y="${y}" width="100" height="100"/>`);
    }
    return `<svg class="board" viewBox="-14 -14 ${S + 128} ${S + 28}">
      <rect x="-14" y="-14" width="${S + 28}" height="${S + 28}" rx="16" fill="#6b4a2a"/>
      <rect x="${S}" y="${GATE_ROW * 100 + 6}" width="14" height="88" fill="#ffd35a" class="gate"/>
      <path d="M${S + 20} ${GATE_ROW * 100 + 50} h80 m-26 -22 l26 22 l-26 22" class="exit-arrow"/>
      <rect x="0" y="0" width="${S}" height="${S}" fill="#4a4a5e"/>
      ${yardGround(this.size)}
      <g class="marks"></g>
      <g class="carts"></g>
      <g class="dots"></g>
      <g class="hit">${cells.join('')}</g>
      <rect class="ring" x="-2" y="-2" width="104" height="104" rx="12" visibility="hidden"/>
    </svg>`;
  }

  sideHtml() {
    return '<div class="counter" aria-live="polite"></div>';
  }

  mount() {
    this.cartsG = this.svg.querySelector('.carts');
    this.dotsG = this.svg.querySelector('.dots');
    this.marksG = this.svg.querySelector('.marks');
    this.counterEl = this.root.querySelector('.counter');
    this.cartsG.innerHTML = this.carts
      .map((c, k) => {
        const art = cart(c.len, k, k === 0);
        const body = c.horizontal ? art : `<g transform="translate(100 0) rotate(90)">${art}</g>`;
        return `<g class="cart ${k === 0 ? 'barends' : ''}" data-cart="${k}">${body}</g>`;
      })
      .join('');
  }

  cartAt(i) {
    const x = i % this.size;
    const y = Math.floor(i / this.size);
    return this.carts.findIndex((c) => (c.horizontal ? c.y === y && x >= c.x && x < c.x + c.len : c.x === x && y >= c.y && y < c.y + c.len));
  }

  /** Squares cart `k` can slide its front or back onto, with the new position. */
  slides(k) {
    const c = this.carts[k];
    const out = [];
    for (const dir of [-1, 1]) {
      for (let step = 1; ; step++) {
        const p = (c.horizontal ? c.x : c.y) + dir * step;
        const edge = dir < 0 ? p : p + c.len - 1;
        if (edge < 0 || edge >= this.size) break;
        const cell = c.horizontal ? c.y * this.size + edge : edge * this.size + c.x;
        if (this.cartAt(cell) >= 0) break;
        out.push({ cell, to: p });
      }
    }
    return out;
  }

  render() {
    this.carts.forEach((c, k) => {
      const g = this.cartsG.querySelector(`[data-cart="${k}"]`);
      g.style.transform = `translate(${c.x * 100}px, ${c.y * 100}px)`;
      g.classList.toggle('selected', k === this.selected);
    });
    this.dotsG.innerHTML = this.targets
      .map(({ cell }) => {
        const [x, y] = this.cellBox(cell);
        return `<circle class="dot" cx="${x + 50}" cy="${y + 50}" r="16"/>`;
      })
      .join('');
    this.counterEl.innerHTML = `<span>${this.moves}</span><small>/ ${this.level.par}</small>`;
  }

  snapshot() {
    return { carts: this.carts.map((c) => ({ ...c })), moves: this.moves };
  }

  restore(s) {
    this.carts = s.carts;
    this.moves = s.moves;
    this.select(null);
  }

  select(k) {
    this.selected = k;
    this.targets = k === null ? [] : this.slides(k);
  }

  activate(id) {
    const i = Number(id.slice(1));
    const target = this.targets.find((tg) => tg.cell === i);
    if (target) return this.slide(this.selected, target.to);
    const k = this.cartAt(i);
    if (k < 0) {
      this.say(this.selected === null ? t('pickCart') : t('cartCantGo'), 'warn');
      return;
    }
    if (k === this.selected) {
      this.select(null);
    } else {
      this.select(k);
      audio.play('select');
      if (!this.targets.length) {
        this.flash(this.cartsG.querySelector(`[data-cart="${k}"] > g`), 'wiggle');
        this.say(t('cartStuck'), 'warn');
      }
    }
    this.refresh();
  }

  async slide(k, to) {
    this.push();
    const c = this.carts[k];
    if (c.horizontal) c.x = to;
    else c.y = to;
    this.moves++;
    audio.play('place');
    this.select(k);
    this.refresh();
    if (k === 0 && c.x + c.len === this.size) {
      // Out through the gate!
      this.busy = true;
      this.select(null);
      this.refresh();
      await sleep(300);
      const g = this.cartsG.querySelector('[data-cart="0"]');
      g.style.transform = `translate(${(this.size + 1) * 100}px, ${c.y * 100}px)`;
      g.classList.add('leaving');
      await sleep(600);
      this.busy = false;
      this.win();
    } else {
      this.say(this.goal());
    }
  }

  giveHint() {
    const pos = this.carts.map((c) => (c.horizontal ? c.x : c.y));
    const m = JSON.parse(this.core.carts_hint(JSON.stringify(this.level), JSON.stringify(pos)));
    if (!m) return false;
    this.select(m.cart);
    this.refresh();
    const target = this.targets.find((tg) => tg.to === m.to);
    const cell = target ? target.cell : null;
    this.flash(this.cartsG.querySelector(`[data-cart="${m.cart}"]`));
    if (cell !== null) {
      this.input.focus(`c${cell}`);
      const [x, y] = this.cellBox(cell);
      this.marksG.innerHTML = `<rect class="hint-mark" x="${x + 6}" y="${y + 6}" width="88" height="88" rx="12"/>`;
      setTimeout(() => (this.marksG.innerHTML = ''), 2400);
    }
    return true;
  }

  stars() {
    return starsFor(this.moves, this.level.par, this.hints, Math.max(2, Math.ceil(this.level.par / 3)));
  }
}
