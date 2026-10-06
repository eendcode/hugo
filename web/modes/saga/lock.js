// Slot (story chapter 2.1, "Het hek"): a lock with three wheels, 1–6.
// Count the things in the picture next to it, turn each wheel to its count
// and press Open (on the padlock, right of the wheels). Tap a wheel (or OK
// on it) to turn it on by one; on the D-pad, left and right move along the
// wheels to Open and up and down turn the focused wheel. A hint sets the first wrong wheel and counts its things
// out loud in the picture: 1, 2, 3…
//
// A Puzzle for RoomScreen (../spookhuis/room.js). ctx.data = {code: [a, b, c]},
// each 1–6 (checked by `make validate`). What the lock shows comes from a
// skin, ctx.art, like the other puzzles' art (see engines.js): picture() is
// an SVG fragment in the box viewBox() where every thing to count for wheel
// k is a `.count-k .count-item` with data-x/data-y (its centre, for the
// number badges); wheelIcon(k) is the 100×100 picture above wheel k.
// Without a skin the picture is empty and the wheels show their number.

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { sleep } from '../../shell.js';
import { starsFrom } from '../spookhuis/room.js';
import { dots } from '../spookhuis/art.js';

/** The lock's art without a skin. */
const ART = {
  viewBox: () => [0, 0, 100, 100],
  picture: () => '',
  wheelIcon: (k) => `<circle cx="50" cy="50" r="40" fill="#2a2140" stroke="#c9a13a" stroke-width="7"/>
    <text x="50" y="66" text-anchor="middle" font-size="46" font-weight="800" fill="#fff3c4">${k + 1}</text>`,
};

export class Lock {
  constructor(ctx) {
    this.ctx = ctx;
    this.art = { ...ART, ...ctx.art };
    this.code = ctx.data?.code ?? [1, 2, 3];
    this.wheels = this.code.map(() => 1);
    this.mistakes = 0;
    this.initial = 'p-w0';
  }

  goal() {
    return t('goalLock');
  }

  // ---------- markup ----------

  html() {
    const [, , vw, vh] = this.art.viewBox();
    const wheels = this.code
      .map((_, k) => `<button class="lk-wheel" data-nav="p-w${k}" aria-label="${t('lockWheel', { n: k + 1 })}">
        <svg class="lk-icon" viewBox="0 0 100 100" aria-hidden="true">${this.art.wheelIcon(k)}</svg>
        <span class="lk-window"><span class="lk-num"></span></span>
        <svg class="lk-dots" viewBox="0 0 100 100" aria-hidden="true"></svg>
        <span class="lk-turn" aria-hidden="true">↻</span>
      </button>`)
      .join('');
    return `<div class="saga-lock" style="--ratio: ${vw} / ${vh}">
      <svg class="lk-picture" viewBox="${this.art.viewBox().join(' ')}" aria-hidden="true">${this.art.picture()}<g class="lk-badges"></g></svg>
      <div class="lk-side">
        <div class="lk-body">
          <svg class="lk-shackle" viewBox="0 0 200 110" aria-hidden="true"><path d="M40 110 V70 a60 60 0 0 1 120 0 V110" fill="none" stroke="#8d909c" stroke-width="26"/><path d="M40 110 V70 a60 60 0 0 1 120 0 V110" fill="none" stroke="#c4c8d4" stroke-width="10"/></svg>
          <div class="lk-wheels">${wheels}
            <button class="btn primary lk-open" data-nav="p-open">${icon('lock')}<span>${t('lockOpen')}</span></button>
          </div>
        </div>
      </div>
    </div>`;
  }

  mount(el) {
    this.el = el;
    this.lockEl = el.querySelector('.saga-lock');
    this.badges = el.querySelector('.lk-badges');
    // A picture must show as many things as the code says.
    if (this.art.picture()) {
      this.code.forEach((n, k) => {
        const shown = el.querySelectorAll(`.count-${k} .count-item`).length;
        if (shown !== n) console.error(`lock: wheel ${k + 1} wants ${n}, the picture shows ${shown}`);
      });
    }
    this.render();
  }

  render() {
    this.wheels.forEach((n, k) => {
      const w = this.el.querySelector(`[data-nav="p-w${k}"]`);
      w.querySelector('.lk-num').textContent = n;
      w.querySelector('.lk-dots').innerHTML = dots(n);
    });
    this.ctx.refresh();
  }

  // ---------- actions ----------

  activate(id) {
    if (this.busy) return;
    if (id === 'p-open') return this.open();
    if (id.startsWith('p-w')) this.turn(Number(id.slice(3)));
  }

  /** Up and down on a focused wheel turn it on or back. */
  arrow(dir, id) {
    if (this.busy || !id?.startsWith('p-w') || (dir !== 'up' && dir !== 'down')) return false;
    const k = Number(id.slice(3));
    this.turn(k, dir === 'up' ? (this.wheels[k] % 6) + 1 : ((this.wheels[k] + 4) % 6) + 1, dir === 'up' ? 1 : -1);
    return true;
  }

  /** The wheel rolls on to the next number (6 → 1), or to `to`. */
  turn(k, to = (this.wheels[k] % 6) + 1, way = 1) {
    this.wheels[k] = to;
    audio.play('rotate');
    this.render();
    const num = this.el.querySelector(`[data-nav="p-w${k}"] .lk-num`);
    num.classList.remove('roll', 'roll-back');
    void num.offsetWidth;
    num.classList.add(way < 0 ? 'roll-back' : 'roll');
    if (this.offGoal) {
      this.offGoal = false;
      this.ctx.say(this.goal());
    }
  }

  async open() {
    if (this.wheels.every((n, k) => n === this.code[k])) {
      this.busy = true;
      await this.ctx.busy(async () => {
        this.lockEl.classList.add('opening');
        audio.play('place');
        await sleep(600);
        this.lockEl.classList.add('open');
        audio.play('treasure');
        await sleep(900);
      });
      this.ctx.solved();
      return;
    }
    this.mistakes++;
    audio.play('whoosh');
    this.ctx.say(t('lockWrong'), 'warn');
    this.offGoal = true;
    this.ctx.wiggle(this.el.querySelector('.lk-body'));
  }

  /**
   * Set the first wrong wheel, and count its things in the picture one by
   * one. With the code already right it only points at Open, which doesn't
   * count as a hint.
   */
  hint() {
    if (this.busy) return false;
    const k = this.wheels.findIndex((n, i) => n !== this.code[i]);
    if (k < 0) {
      this.ctx.say(t('lockPress'));
      this.offGoal = true;
      this.ctx.pulse(this.el.querySelector('[data-nav="p-open"]'));
      return false;
    }
    this.turn(k, this.code[k]);
    this.ctx.pulse(this.el.querySelector(`[data-nav="p-w${k}"]`));
    this.countOut(k);
    return true;
  }

  /** Number badges pop up on wheel k's things, one after the other. */
  async countOut(k) {
    const run = (this.counting = (this.counting ?? 0) + 1);
    this.badges.innerHTML = '';
    const items = [...this.el.querySelectorAll(`.count-${k} .count-item`)];
    for (const [i, item] of items.entries()) {
      if (this.counting !== run || this.dead) return;
      const [x, y] = [Number(item.dataset.x), Number(item.dataset.y)];
      item.classList.add('lk-counted');
      this.badges.insertAdjacentHTML('beforeend', `<g class="lk-badge" transform="translate(${x + 30} ${y - 34})"><circle r="30"/><text y="13">${i + 1}</text></g>`);
      audio.play('step');
      await sleep(650);
    }
    await sleep(2200);
    if (this.counting !== run || this.dead) return;
    this.badges.innerHTML = '';
    items.forEach((item) => item.classList.remove('lk-counted'));
  }

  destroy() {
    this.dead = true;
  }

  stars(hints) {
    return starsFrom(this.mistakes, hints);
  }
}
