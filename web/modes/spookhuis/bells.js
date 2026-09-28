// De klokkentoren: the bells play a tune; play it back. Each bell has its
// own colour and place, so the tune can be followed with the sound off.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { sleep } from '../../shell.js';
import { starsFrom } from './room.js';
import { bell } from './art.js';

const COLORS = ['#e0474c', '#f2c23a', '#3f9f5a', '#3f7fd0'];
/** Tune length per level; each level is two tunes. */
const LENGTHS = [2, 3, 3, 4, 4, 5, 5, 6];
const TUNES = 2;
const NOTE_MS = 650;

export class Bells {
  constructor(ctx) {
    this.ctx = ctx;
    this.length = LENGTHS[Math.min(ctx.level, LENGTHS.length - 1)];
    this.tune = 0;
    this.mistakes = 0;
    this.newTune();
    this.initial = 'p-listen';
  }

  newTune() {
    const r = this.ctx.rng;
    this.notes = [];
    while (this.notes.length < this.length) {
      const n = r.below(4);
      // No bell three times in a row: that is hard to count.
      if (this.notes.length >= 2 && this.notes.at(-1) === n && this.notes.at(-2) === n) continue;
      this.notes.push(n);
    }
    this.pos = 0;
  }

  goal() {
    return t('goalBells');
  }

  html() {
    return `<div class="bells">
      <div class="bell-row">${COLORS.map((c, i) => `<button class="bell-btn" data-nav="p-${i}" style="--bell:${c}"><svg viewBox="0 0 100 100">${bell(c)}</svg></button>`).join('')}</div>
      <div class="tune-dots"></div>
      <button class="btn big primary" data-nav="p-listen">${t('listen')}</button>
    </div>`;
  }

  mount(el) {
    this.el = el;
    this.renderDots();
  }

  start() {
    this.playTune();
  }

  renderDots() {
    this.el.querySelector('.tune-dots').innerHTML =
      this.notes.map((n, k) => `<span class="${k < this.pos ? 'on' : ''}" style="${k < this.pos ? `background:${COLORS[n]}` : ''}"></span>`).join('') +
      `<span class="tune-count">${this.tune + 1}/${TUNES}</span>`;
  }

  async ring(i, ms = NOTE_MS) {
    const b = this.el.querySelector(`[data-nav="p-${i}"]`);
    b.classList.add('ringing');
    audio.note(i);
    await sleep(ms * 0.7);
    b.classList.remove('ringing');
    await sleep(ms * 0.3);
  }

  playTune() {
    return this.ctx.busy(async () => {
      this.ctx.say(t('listenWell'));
      this.pos = 0;
      this.renderDots();
      await sleep(500);
      for (const n of this.notes) {
        if (this.dead) return;
        await this.ring(n);
      }
      this.ctx.say(t('yourTurn'));
    });
  }

  activate(id) {
    if (id === 'p-listen') return this.playTune();
    const i = Number(id.slice(2));
    this.ring(i, 300);
    if (i !== this.notes[this.pos]) {
      this.mistakes++;
      this.ctx.say(t('listenAgain'), 'warn');
      this.ctx.busy(async () => {
        await sleep(900);
        this.pos = 0;
        this.renderDots();
      }).then(() => this.playTune());
      return;
    }
    this.pos++;
    this.renderDots();
    if (this.pos < this.notes.length) return;
    this.ctx.busy(async () => {
      audio.play('treasure');
      this.tune++;
      await sleep(1000);
      if (this.tune >= TUNES) return this.ctx.solved();
      this.newTune();
      this.renderDots();
    }).then(() => this.tune < TUNES && this.playTune());
  }

  destroy() {
    this.dead = true;
  }

  hint() {
    const next = this.notes[this.pos];
    this.ctx.pulse(this.el.querySelector(`[data-nav="p-${next}"]`));
    return true;
  }

  stars(hints) {
    return starsFrom(this.mistakes, hints);
  }
}
