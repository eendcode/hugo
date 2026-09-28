// Barends programma: lay cards in the slots, press Start, watch Barend go.
// Running the program and hints come from the Rust core (program_*).

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { sleep } from '../../shell.js';
import { BoardScreen, starsFor } from '../gridplay.js';
import { barend, apple, stable, grass, tree, cardArt } from './art.js';

const STEP_MS = 420;

export class ProgramScreen extends BoardScreen {
  get cls() {
    return 'prog';
  }

  setup() {
    const f = this.level;
    this.w = f.width;
    this.h = f.height;
    this.n = Math.max(f.width, f.height);
    this.cards = [];
    this.palette = f.relative
      ? [{ type: 'Forward', n: 1 }, { type: 'Left' }, { type: 'Right' }]
      : ['N', 'E', 'S', 'W'].map((dir) => ({ type: 'Step', dir, n: 1 }));
  }

  goal() {
    const apples = this.level.cells.filter((c) => c === 'Apple').length;
    return apples ? t('goalProgramApples') : t('goalProgram');
  }

  initialFocus() {
    return 'k0';
  }

  cellBox(i) {
    return [(i % this.w) * 100, Math.floor(i / this.w) * 100, 100, 100];
  }

  boardHtml() {
    const f = this.level;
    const cells = f.cells
      .map((c, i) => {
        const [x, y] = this.cellBox(i);
        const inner = { Tree: tree(), Apple: `<g class="apple-slot" data-cell="${i}">${apple()}</g>`, Stable: stable() }[c] ?? '';
        return `<g transform="translate(${x} ${y})">${grass()}${inner}</g>`;
      })
      .join('');
    return `<svg class="board" viewBox="-6 -6 ${this.w * 100 + 12} ${this.h * 100 + 12}">
      <rect x="-6" y="-6" width="${this.w * 100 + 12}" height="${this.h * 100 + 12}" rx="16" fill="#6b4a2a"/>
      ${cells}
      <g class="actor goat-actor"><g class="goat-face"><g class="facing-mark"><path d="M50 4 l10 12 h-20z"/></g><g class="goat-flip">${barend()}</g></g></g>
      <g class="fx"></g>
      <rect class="ring" x="-2" y="-2" width="104" height="104" rx="12" visibility="hidden"/>
    </svg>`;
  }

  sideHtml() {
    return `<div class="program" role="list"></div>
      <div class="palette">${this.palette.map((c, j) => `<button class="card-btn" data-nav="k${j}" aria-label="${c.type}"><svg viewBox="0 0 100 100">${cardArt(c)}</svg></button>`).join('')}</div>`;
  }

  extraButtons() {
    return `<button class="btn primary go" data-nav="b-go">${icon('play')}<span>${t('start')}</span></button>
      ${this.button('remove', 'remove', t('remove'))}`;
  }

  mount() {
    this.programEl = this.root.querySelector('.program');
    this.actor = this.svg.querySelector('.goat-actor');
    this.fx = this.svg.querySelector('.fx');
    this.root.querySelector('.play').classList.toggle('relative', this.level.relative);
    this.place(this.level.start, this.level.facing, false);
  }

  render() {
    const slots = [];
    for (let i = 0; i < this.level.slots; i++) {
      const c = this.cards[i];
      slots.push(
        c
          ? `<button class="card-btn in-program" data-nav="s${i}" data-longpress role="listitem"><svg viewBox="0 0 100 100">${cardArt(c)}</svg></button>`
          : '<div class="slot" role="listitem"></div>',
      );
    }
    this.programEl.innerHTML = slots.join('');
    this.root.querySelector('[data-nav="b-remove"]')?.classList.toggle('dim', !this.cards.length);
  }

  /** Put Barend on `cell`, facing `dir`. */
  place(cell, dir, animate = true) {
    const [x, y] = this.cellBox(cell);
    this.actor.style.transition = animate ? '' : 'none';
    this.actor.style.transform = `translate(${x}px, ${y}px)`;
    this.actor.dataset.facing = dir;
    this.actor.querySelector('.facing-mark').setAttribute('transform', `rotate(${'NESW'.indexOf(dir) * 90} 50 50)`);
    if (!animate) this.actor.getBoundingClientRect();
  }

  snapshot() {
    return this.cards.map((c) => ({ ...c }));
  }

  restore(s) {
    this.cards = s;
  }

  activate(id, el) {
    if (id === 'b-go') return this.go();
    if (id === 'b-remove') return this.removeCard(this.cards.length - 1);
    if (id.startsWith('k')) {
      if (this.cards.length >= this.level.slots) {
        this.say(t('programFull'), 'warn');
        this.flash(this.programEl, 'nudge');
        return;
      }
      this.push();
      this.cards.push({ ...this.palette[Number(id.slice(1))] });
      audio.play('place');
      this.refresh();
      return;
    }
    if (id.startsWith('s')) {
      // Tap a laid card to take more steps: 1 → 2 → 3 → 1.
      const c = this.cards[Number(id.slice(1))];
      if (c.n === undefined) {
        this.flash(el, 'wiggle');
        return;
      }
      this.push();
      c.n = (c.n % 3) + 1;
      audio.play('rotate');
      this.refresh();
    }
  }

  onRemove(el) {
    const id = el?.dataset.nav || '';
    if (id.startsWith('s')) this.removeCard(Number(id.slice(1)));
  }

  removeCard(i) {
    if (i < 0 || i >= this.cards.length) return;
    this.push();
    this.cards.splice(i, 1);
    audio.play('remove');
    this.refresh();
  }

  /** Which card each step of the run belongs to. */
  stepCards(run) {
    const owner = [];
    run.steps.slice(1).forEach(() => owner.push(null));
    let k = 0;
    for (let ci = 0; ci < run.played && k < owner.length; ci++) {
      const c = this.cards[ci];
      const count = c.n ?? 1;
      for (let s = 0; s < count && k < owner.length; s++) owner[k++] = ci;
    }
    return owner;
  }

  async go() {
    if (!this.cards.length) {
      this.say(t('programEmpty'), 'warn');
      return;
    }
    this.busy = true;
    const run = JSON.parse(this.core.program_run(JSON.stringify(this.level), JSON.stringify(this.cards)));
    const owner = this.stepCards(run);
    this.say(t('programGo'));
    this.root.querySelector('.play').classList.add('walking');
    const eaten = new Set();
    for (let k = 1; k < run.steps.length; k++) {
      if (this.destroyed) return;
      const [cell, dir] = run.steps[k];
      this.programEl.querySelectorAll('.running').forEach((e) => e.classList.remove('running'));
      this.programEl.querySelector(`[data-nav="s${owner[k - 1]}"]`)?.classList.add('running');
      this.place(cell, dir);
      audio.play('step');
      if (this.level.cells[cell] === 'Apple' && !eaten.has(cell)) {
        eaten.add(cell);
        this.svg.querySelector(`.apple-slot[data-cell="${cell}"]`)?.classList.add('eaten');
        audio.play('treasure');
      }
      await sleep(STEP_MS);
    }
    this.root.querySelector('.play').classList.remove('walking');
    const end = run.ending;
    if (end.type === 'Home') {
      this.busy = false;
      return this.win();
    }
    audio.play('whoosh');
    if (end.type === 'Bump') {
      this.actor.classList.add('bump');
      this.say(end.cell < 0 ? t('bumpFence') : t('bumpTree'), 'warn');
    } else {
      const apples = this.level.cells.filter((c) => c === 'Apple').length;
      this.say(eaten.size < apples && run.steps.some(([c]) => this.level.cells[c] === 'Stable') ? t('applesFirst') : t('notHome'), 'warn');
    }
    await sleep(1500);
    if (this.destroyed) return;
    this.actor.classList.remove('bump');
    this.programEl.querySelectorAll('.running').forEach((e) => e.classList.remove('running'));
    this.svg.querySelectorAll('.apple-slot.eaten').forEach((e) => e.classList.remove('eaten'));
    this.place(this.level.start, this.level.facing, false);
    this.busy = false;
  }

  giveHint() {
    const h = JSON.parse(this.core.program_hint(JSON.stringify(this.level), JSON.stringify(this.cards)));
    if (h.type === 'Go') {
      this.flash(this.root.querySelector('[data-nav="b-go"]'));
      this.say(t('pressStart'));
      return true;
    }
    this.push();
    if (h.type === 'Add') this.cards.push(h.card);
    else this.cards.splice(h.index, 1);
    this.refresh();
    if (h.type === 'Add') this.flash(this.programEl.querySelector(`[data-nav="s${this.cards.length - 1}"]`));
    else this.flash(this.programEl, 'nudge');
    return true;
  }

  stars() {
    return starsFor(this.cards.length, this.level.best, this.hints, 1);
  }
}
