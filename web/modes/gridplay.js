// A base for play screens with a board on one side and controls on the
// other: header and goal line, the Oeps / Hint / Kaart / ⚙ buttons, undo
// history, hints, the D-pad focus ring on board cells, and the win flow.
//
// Subclasses provide: cls, boardHtml(), sideHtml(), mount(), render(),
// activate(id, el), snapshot()/restore(s), giveHint() → bool, stars(),
// goal(), cellBox(i) → [x, y, w, h] in board units, and optionally
// extraButtons(), initialFocus(), onRemove(el).
//
// opts.goal (optional) replaces the screen's own goal line, e.g. with a
// story line when the story mode hosts the screen; opts.backdrop (a
// 1600×900 SVG scene) is drawn behind it, opts.art lets a screen swap
// pieces of its art (each screen lists the names it knows), and opts.text
// gives the story's own words for some of its messages (see text()).

import { icon } from '../art.js';
import { t, textOr } from '../i18n.js';
import * as audio from '../audio.js';
import { app, sleep, winOverlay } from '../shell.js';

export class BoardScreen {
  constructor(root, opts) {
    this.root = root;
    this.opts = opts;
    this.level = opts.level;
    this.core = app.core;
    this.input = app.input;
    this.hints = 0;
    this.busy = false;
    this.done = false;
    this.history = [];
    if (opts.goal) this.goal = () => opts.goal;
    this.setup();
    this.build();
    this.input.setScreen(this.root, {
      initial: this.initialFocus?.(),
      activate: (el) => this.dispatch(el),
      remove: (el) => !this.busy && !this.done && this.onRemove?.(el),
      back: () => this.onBack(),
      undo: () => this.undo(),
      onFocus: (el) => this.onFocus(el),
    });
    this.say(this.goal());
  }

  destroy() {
    this.destroyed = true;
  }

  build() {
    this.root.innerHTML = `
      <section class="play ${this.cls}${this.opts.backdrop ? ' skinned' : ''}" style="--n: ${this.n ?? 5}">
        ${this.opts.backdrop ? `<svg class="scene play-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${this.opts.backdrop}</svg>` : ''}
        <header class="play-head">
          <div class="play-label">${this.opts.label}</div>
          <div class="goal" role="status" aria-live="polite"></div>
        </header>
        <div class="board-wrap">${this.boardHtml()}</div>
        <aside class="side">
          ${this.sideHtml()}
          <div class="buttons">
            ${this.extraButtons?.() ?? ''}
            ${this.button('undo', 'undo', t('undo'))}
            ${this.button('hint', 'hint', t('hint'))}
            ${this.button('home', 'home', t('home'))}
            ${this.button('menu', 'gear', '', 'small')}
          </div>
        </aside>
      </section>`;
    this.goalEl = this.root.querySelector('.goal');
    this.svg = this.root.querySelector('.board');
    this.ring = this.svg?.querySelector('.ring');
    this.mount();
    this.refresh();
  }

  button(id, iconName, label, cls = '') {
    return `<button class="btn ${cls}" data-nav="b-${id}" aria-label="${label || id}">${icon(iconName)}${label ? `<span>${label}</span>` : ''}</button>`;
  }

  /** Re-render and update the buttons and focus. */
  refresh() {
    this.render();
    this.root.querySelector('[data-nav="b-undo"]')?.classList.toggle('dim', !this.history.length);
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

  /** Message `key` from i18n, or the story's words for it in opts.text. */
  text(key, vars) {
    return textOr(this.opts.text, key, vars);
  }

  flash(el, cls = 'hint-flash') {
    if (!el) return;
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 2400);
  }

  onFocus(el) {
    if (!this.ring) return;
    const id = el?.dataset.nav || '';
    if (/^c\d+$/.test(id) && document.body.classList.contains('kbd')) {
      const [x, y, w, h] = this.cellBox(Number(id.slice(1)));
      Object.entries({ x: x - 2, y: y - 2, width: w + 4, height: h + 4 }).forEach(([k, v]) => this.ring.setAttribute(k, v));
      this.ring.setAttribute('visibility', 'visible');
    } else {
      this.ring.setAttribute('visibility', 'hidden');
    }
  }

  dispatch(el) {
    const id = el.dataset.nav;
    if (id === 'b-home') return this.opts.onHome();
    if (this.busy || this.done) return;
    audio.unlock();
    if (id === 'b-undo') this.undo();
    else if (id === 'b-hint') this.hint();
    else if (id === 'b-menu') this.opts.onMenu();
    else this.activate(id, el);
  }

  onBack() {
    if (this.busy) return;
    if (!this.done && this.history.length) this.undo();
    else this.opts.onHome();
  }

  /** Remember the state before a change, for Oeps. */
  push() {
    this.history.push(this.snapshot());
  }

  undo() {
    if (this.busy || this.done || !this.history.length) return;
    this.restore(this.history.pop());
    audio.play('undo');
    this.say(this.goal());
    this.refresh();
  }

  hint() {
    if (this.busy || this.done) return;
    if (this.giveHint()) {
      this.hints++;
      audio.play('hint');
    }
  }

  async win() {
    if (this.done) return;
    this.done = true;
    const stars = this.stars();
    // Left (Kaart) during a finishing animation: it still counts as won.
    if (this.destroyed) return this.opts.onWin?.(stars);
    this.say(t('wellDone'), 'good');
    audio.play('win');
    this.root.querySelector('.play').classList.add('won');
    await this.opts.onWin?.(stars);
    await sleep(1000);
    if (this.destroyed) return;
    winOverlay(this.root, stars, { onNext: this.opts.onNext, onReplay: this.opts.onReplay, onHome: this.opts.onHome });
  }
}

/** 3 stars at `par` or better, 2 within `slack` more, else 1; minus hints. */
export function starsFor(used, par, hints, slack) {
  const base = used <= par ? 3 : used <= par + slack ? 2 : 1;
  return Math.max(1, base - hints);
}
