// The frame around every puzzle in Hugo's haunted house: header, goal
// line, the puzzle area, and the Oeps / Hint / Kaart / ⚙ buttons.
//
// A puzzle is a class constructed with a context and providing:
//   html()                markup for the puzzle area (focusable items use data-nav="p-…")
//   mount(el)             called once the markup is in the page
//   activate(id, el)      an item was tapped or chosen with OK
//   hint()                show one step; return false if there is none
//   undo()                optional; return true if something was undone
//   canUndo()             optional
//   stars(hints)          1–3 when solved
//   goal()                the goal line
//   initial               optional data-nav id to focus first
//   arrow(dir, id)        optional: an arrow key on item `id`; return true if used (focus stays)
//   destroy()             optional
// The context: {rng, level, data, art, core, say(text, kind), solved(), pulse(el), wiggle(el), refresh(), busy(fn)}.
// `data` and `art` are passed through from opts untouched: a puzzle that
// plays one given level (such as a story chapter's) reads it from data, and
// a story skin's pictures (each puzzle lists the ones it knows) from art.

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { app, sleep, winOverlay } from '../../shell.js';
import { Rng } from '../../rng.js';

export class RoomScreen {
  /**
   * opts: Puzzle, level, seed, data, art, label, onWin(stars), onNext(), onReplay(), onHome(), onMenu(),
   * and optionally backdrop (a 1600×900 SVG scene behind the room, for the story mode)
   * and noStars (the win overlay leaves the stars out: a story puzzle in the middle of a chapter).
   */
  constructor(root, opts) {
    this.root = root;
    this.opts = opts;
    this.input = app.input;
    this.hints = 0;
    this.done = false;
    this.lock = false;
    const ctx = {
      rng: new Rng(opts.seed),
      level: opts.level,
      data: opts.data,
      art: opts.art,
      core: app.core,
      say: (text, kind) => this.say(text, kind),
      solved: () => this.solved(),
      pulse: (el) => this.flash(el, 'hint-flash'),
      wiggle: (el) => this.flash(el, 'wiggle'),
      refresh: () => this.refresh(),
      busy: (fn) => this.busy(fn),
    };
    this.puzzle = new opts.Puzzle(ctx);
    this.build();
    this.input.setScreen(this.root, {
      initial: this.puzzle.initial,
      activate: (el) => this.onActivate(el),
      back: () => this.onBack(),
      undo: () => this.undo(),
      arrow: (dir, el) => !this.lock && !this.done && this.puzzle.arrow?.(dir, el.dataset.nav) === true,
    });
    this.say(this.puzzle.goal());
    this.puzzle.start?.();
  }

  destroy() {
    this.destroyed = true;
    this.puzzle.destroy?.();
  }

  build() {
    const undo = typeof this.puzzle.undo === 'function';
    this.root.innerHTML = `
      <section class="play room room-${this.opts.room}${this.opts.backdrop ? ' skinned' : ''}">
        ${this.opts.backdrop ? `<svg class="scene play-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${this.opts.backdrop}</svg>` : ''}
        <header class="play-head">
          <div class="play-label">${this.opts.label}</div>
          <div class="goal" role="status" aria-live="polite"></div>
        </header>
        <div class="room-stage">${this.puzzle.html()}</div>
        <aside class="side">
          <div class="buttons">
            ${undo ? this.button('undo', 'undo', t('undo')) : ''}
            ${this.button('hint', 'hint', t('hint'))}
            ${this.button('home', 'home', t('home'))}
            ${this.button('menu', 'gear', '', 'small')}
          </div>
        </aside>
      </section>`;
    this.goalEl = this.root.querySelector('.goal');
    this.puzzle.mount(this.root.querySelector('.room-stage'));
    this.refresh();
  }

  button(id, iconName, label, cls = '') {
    return `<button class="btn ${cls}" data-nav="b-${id}" aria-label="${label || id}">${icon(iconName)}${label ? `<span>${label}</span>` : ''}</button>`;
  }

  refresh() {
    const b = this.root.querySelector('[data-nav="b-undo"]');
    if (b) b.classList.toggle('dim', !this.puzzle.canUndo?.());
    this.input.refresh();
  }

  say(text, kind = '') {
    this.goalEl.textContent = text;
    this.goalEl.className = `goal ${kind}`;
    if (kind) {
      this.goalEl.classList.remove('bump');
      void this.goalEl.offsetWidth;
      this.goalEl.classList.add('bump');
    }
  }

  flash(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 2400);
  }

  /** Run an animation with input locked. */
  async busy(fn) {
    this.lock = true;
    try {
      await fn();
    } finally {
      if (!this.destroyed) this.lock = false;
    }
  }

  onActivate(el) {
    if (this.lock || this.done) {
      if (el.dataset.nav === 'b-home') this.opts.onHome();
      return;
    }
    audio.unlock();
    const id = el.dataset.nav;
    if (id === 'b-undo') this.undo();
    else if (id === 'b-hint') this.hint();
    else if (id === 'b-home') this.opts.onHome();
    else if (id === 'b-menu') this.opts.onMenu();
    else this.puzzle.activate(id, el);
  }

  onBack() {
    if (this.lock) return;
    if (!this.done && this.puzzle.canUndo?.()) this.undo();
    else this.opts.onHome();
  }

  undo() {
    if (this.lock || this.done || !this.puzzle.undo?.()) return;
    audio.play('undo');
    this.refresh();
  }

  hint() {
    if (this.puzzle.hint() === false) return;
    this.hints++;
    audio.play('hint');
    this.refresh();
  }

  async solved() {
    if (this.done) return;
    this.done = true;
    const stars = this.puzzle.stars(this.hints);
    // Left (Kaart) during a finishing animation: it still counts as solved.
    if (this.destroyed) return this.opts.onWin?.(stars);
    this.say(t('wellDone'), 'good');
    audio.play('win');
    this.root.querySelector('.room').classList.add('won');
    await this.opts.onWin?.(stars);
    await sleep(1100);
    if (this.destroyed) return;
    winOverlay(this.root, this.opts.noStars ? 0 : stars, { onNext: this.opts.onNext, onReplay: this.opts.onReplay, onHome: this.opts.onHome });
  }
}

/** Stars from mistakes and hints: 3 for a clean solve, never below 1. */
export function starsFrom(mistakes, hints) {
  return Math.max(1, 3 - Math.min(2, mistakes) - hints);
}

/** Stars from a move count against the best possible. */
export function starsForMoves(moves, par, hints, slack = 2) {
  const base = moves <= par ? 3 : moves <= par + slack ? 2 : 1;
  return Math.max(1, base - hints);
}
