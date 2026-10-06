// The story mode's reading screens: story pages in large type (one
// sentence per line, speech highlighted, Hugo's letter on a scrap of
// paper), Pim's bag (Tas), the card screen that every card step is shown
// in (the riddle card here, Book 3's suspect board, Book 4's Nachtbok-meter)
// and the riddle card (Raadselkaart) with picture answers. Story text comes
// from the book files and is Dutch only for now.

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as store from '../../storage.js';
import * as audio from '../../audio.js';
import { app, leavePlay, sleep } from '../../shell.js';
import { Rng } from '../../rng.js';
import { picture } from './pictures.js';
import { bag } from './art.js';

/** Taps this soon after a screen appears are the second half of a double tap: ignore them. */
const SETTLE_MS = 350;

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** One line of story text; „speech” gets its own colour. */
export function line(text) {
  return esc(text).replace(/„[^”]*”/g, (q) => `<span class="say">${q}</span>`);
}

/**
 * Story pages. pages: [{scene, lines?, letter?, sound?, goto?}]; `goto`
 * ({mode, label}) adds a button that leaves for another game mode.
 * opts: art(name, {scare}) → SVG, heading (text above the page), onBack()
 * for Back on the first page (default: done), start (the page to open on),
 * onGoto(mode) for a page's goto button.
 */
export function readPages(pages, done, opts = {}) {
  leavePlay();
  let k = Math.min(opts.start ?? 0, pages.length - 1);
  let shownAt = 0;
  const render = () => {
    shownAt = Date.now();
    const page = pages[k];
    const s = store.settings();
    const lines = page.lines ?? [];
    app.el.innerHTML = `
      <section class="story saga-story">
        <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${opts.art(page.scene, { scare: s.scare })}</svg>
        <div class="saga-top">
          ${opts.heading ? `<div class="saga-heading">${esc(opts.heading)}</div>` : ''}
          ${pages.length > 1 ? `<div class="page-dots">${pages.map((_, i) => `<span class="${i === k ? 'on' : ''}"></span>`).join('')}</div>` : ''}
        </div>
        ${page.letter ? `<div class="saga-letter">${page.letter.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
        <div class="caption saga-caption ${lines.length ? '' : 'no-lines'}">
          <div class="saga-lines">${lines.map((l) => `<p>${line(l)}</p>`).join('')}</div>
          <div class="caption-buttons">
            ${k > 0 ? `<button class="btn" data-nav="prev" aria-label="${t('back')}">${icon('prev')}</button>` : ''}
            ${page.goto && opts.onGoto ? `<button class="btn big" data-nav="goto">${icon('play')}<span>${esc(page.goto.label)}</span></button>` : ''}
            <button class="btn big primary" data-nav="next">${icon('next')}<span>${t('next')}</span></button>
          </div>
        </div>
      </section>`;
    if (page.sound) audio.play(page.sound);
    app.input.setScreen(app.el, {
      initial: 'next',
      activate: (el) => {
        if (Date.now() - shownAt < SETTLE_MS) return;
        if (el.dataset.nav === 'goto') opts.onGoto(page.goto.mode);
        else go(el.dataset.nav === 'next' ? 1 : -1);
      },
      back: () => (k > 0 ? go(-1) : (opts.onBack ?? done)()),
    });
  };
  const go = (d) => {
    k += d;
    if (k >= pages.length) done();
    else {
      k = Math.max(0, k);
      render();
    }
  };
  render();
}

/** Pim's bag with the items found so far; `uses` glow (they are used now). */
export function bagStrip(items, uses = []) {
  return `<div class="saga-bag" role="img" aria-label="${t('bag')}">
    <svg class="bag-icon" viewBox="0 0 100 100">${bag()}</svg>
    <div class="bag-items">${items.map((n) => `<svg class="bag-item ${uses.includes(n) ? 'used' : ''}" viewBox="0 0 100 100" data-item="${esc(n)}">${picture(n)}</svg>`).join('')}</div>
    <span class="bag-count">${items.length || ''}</span>
  </div>`;
}

/** Show a reply under a card's lines (`kind`: 'good' or 'warn'), with a little bump. */
export function say(reply, text, kind) {
  reply.textContent = text;
  reply.className = `riddle-reply ${kind}`;
  void reply.offsetWidth;
  reply.classList.add('bump');
}

/** Play a one-off animation class on `el` (a wiggle, a hint flash). */
export function flash(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 2400);
}

/**
 * A card over a story scene: the screen of every card step (riddle,
 * suspects, meter, naming the bokje). It draws the scene behind a shade and
 * the top bar (home, the chapter's title, Pim's bag, 💡 if `hint`, ⚙), and
 * handles what every card does alike: taps right after the screen appears
 * are ignored, nothing but home works while the card is `busy()`, and
 * Back goes to onBack (default onHome). opts: cls (extra classes on the
 * section), art (backdrop SVG), title, items (in the bag; null: the book
 * has no bag), uses (bag items that glow), hint, card (the card's HTML),
 * initial (the first focus), busy(), leave(go) (runs every way out of the
 * screen, e.g. to stop a timer), activate(id, el) for the card's own
 * buttons, 💡 and Verder, onHome(), onBack(), onMenu(). Returns the section.
 */
export function cardScreen(opts) {
  leavePlay();
  const busy = opts.busy ?? (() => false);
  const leave = opts.leave ?? ((go) => go());
  const shownAt = Date.now();
  app.el.innerHTML = `
    <section class="saga-riddle${opts.cls ? ` ${opts.cls}` : ''}">
      <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${opts.art}</svg>
      <div class="riddle-shade"></div>
      <div class="map-top saga-bar">
        <button class="btn" data-nav="home" aria-label="${t('home')}">${icon('home')}</button>
        <div class="map-caption">${esc(opts.title)}</div>
        ${opts.items ? bagStrip(opts.items, opts.uses) : ''}
        ${opts.hint ? `<button class="btn" data-nav="hint" aria-label="${t('hint')}">${icon('hint')}<span>${t('hint')}</span></button>` : ''}
        <button class="btn small" data-nav="menu" aria-label="${t('parents')}">${icon('gear')}</button>
      </div>
      ${opts.card}
    </section>`;
  app.input.setScreen(app.el, {
    initial: opts.initial,
    activate: (el) => {
      const id = el.dataset.nav;
      if (id === 'home') return leave(opts.onHome);
      if (busy() || Date.now() - shownAt < SETTLE_MS) return;
      audio.unlock();
      if (id === 'menu') opts.onMenu();
      else opts.activate(id, el);
    },
    back: () => !busy() && leave(opts.onBack ?? opts.onHome),
  });
  return app.el.querySelector('.saga-riddle');
}

/**
 * The riddle card. riddle: {lines, answers: [{picture, word, right?, reply?, item?}]}.
 * An answer's `item` (or its picture, if listed in `gain`) flies into the
 * bag; `"item": null` keeps it out (the item is found later in the chapter).
 * A riddle with several right answers is solved when all are found; one
 * without answers just has Verder. opts: those of cardScreen (art, title,
 * items, uses, onBack, onHome, onMenu), and seed (answer order), gain (the
 * chapter's items), speaker (an SVG face, 100×100: who asks the riddle,
 * e.g. the Nachtbok), pick (a choice, not a riddle: every card is right,
 * the first one tapped is the answer, and there is no hint), solved (shown
 * already solved, with Verder: Back from the step after it), onDone(i)
 * (i: the last card tapped).
 */
export function riddleCard(riddle, opts) {
  const answers = riddle.answers ?? [];
  const order = new Rng(opts.seed).shuffle(answers.map((_, i) => i));
  const pick = !!opts.pick;
  // Come back to from the step after it: shown solved, with Verder.
  const solved = !!opts.solved && !pick;
  const rightCount = pick ? Math.min(1, answers.length) : answers.filter((a) => a.right).length;
  const found = new Set();
  const crossed = new Set();
  let busy = false;

  const card = (i, pos) => {
    const a = answers[i];
    return `<button class="answer" data-nav="a${i}" style="--k:${pos}" aria-label="${esc(a.word ?? a.picture)}">
      <svg viewBox="0 0 100 100" aria-hidden="true">${picture(a.picture)}</svg>
      ${a.word ? `<span>${esc(a.word)}</span>` : ''}
    </button>`;
  };
  const root = cardScreen({
    ...opts,
    items: opts.items ? [...opts.items] : null,
    hint: rightCount && !pick && !solved,
    card: `<div class="riddle-card${opts.speaker ? ' has-speaker' : ''}${pick ? ' pick' : ''}">
        ${opts.speaker ? `<svg class="riddle-speaker" viewBox="0 0 100 100" aria-hidden="true">${opts.speaker}</svg>` : ''}
        <div class="riddle-lines">${riddle.lines.map((l) => `<p>${line(l)}</p>`).join('')}</div>
        <div class="riddle-reply" role="status" aria-live="polite"></div>
        <div class="answers" style="--count:${answers.length || 1}">
          ${answers.length ? order.map(card).join('') : `<button class="btn big primary" data-nav="next">${icon('next')}<span>${t('next')}</span></button>`}
        </div>
        ${solved && answers.length ? `<button class="btn big primary riddle-next" data-nav="next">${icon('next')}<span>${t('next')}</span></button>` : ''}
      </div>`,
    initial: answers.length && !solved ? `a${order[0]}` : 'next',
    busy: () => busy,
    activate: (id) => {
      if (id === 'hint') hint();
      else if (id === 'next') opts.onDone();
      else if (id.startsWith('a')) {
        const i = Number(id.slice(1));
        if (crossed.has(i) || found.has(i)) return;
        if (pick || answers[i].right) right(i);
        else wrong(i);
      }
    },
  });
  const reply = root.querySelector('.riddle-reply');
  const button = (i) => root.querySelector(`[data-nav="a${i}"]`);

  /** The picture flies from its card into the bag. */
  async function intoBag(i, item) {
    const from = button(i).querySelector('svg').getBoundingClientRect();
    const items = root.querySelector('.bag-items');
    items.insertAdjacentHTML('beforeend', `<svg class="bag-item new" viewBox="0 0 100 100">${picture(item)}</svg>`);
    const slot = items.lastElementChild;
    // On a phone the strip is hidden: fly into the bag icon instead.
    const to = slot.getBoundingClientRect().width ? slot.getBoundingClientRect() : root.querySelector('.bag-icon').getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'flying-picture';
    fly.innerHTML = `<svg viewBox="0 0 100 100">${picture(item)}</svg>`;
    Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    root.appendChild(fly);
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = to.width / from.width;
    try {
      await fly.animate([{ transform: 'none' }, { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 80}px) scale(${(1 + s) / 1.6})`, offset: 0.45 }, { transform: `translate(${dx}px, ${dy}px) scale(${s})` }], { duration: 900, easing: 'ease-in-out', fill: 'forwards' }).finished;
    } catch {
      /* no Web Animations: just appear */
    }
    fly.remove();
    slot.classList.remove('new');
    root.querySelector('.bag-count').textContent = items.children.length;
    audio.play('place');
  }

  async function right(i) {
    busy = true;
    found.add(i);
    const b = button(i);
    b.classList.add('right');
    b.setAttribute('aria-disabled', 'true');
    // With more to find ("Tik ze allemaal aan!"), say how many are left.
    const left = rightCount - found.size;
    say(reply, pick ? t('goodPick') : left > 0 ? t('riddleLeft', { n: left }) : t('wellDone'), 'good');
    audio.play('treasure');
    const a = answers[i];
    const item = a.item !== undefined ? a.item : opts.gain.includes(a.picture) ? a.picture : null;
    if (item && opts.items) {
      await sleep(500);
      await intoBag(i, item);
    }
    await sleep(900);
    if (app.el.querySelector('.saga-riddle') !== root) return;
    busy = false;
    if (found.size >= rightCount) return opts.onDone(i);
    // The found card is disabled now: move the focus to the next one still to choose.
    const at = order.indexOf(i);
    const next = [...order.slice(at + 1), ...order.slice(0, at)].find((k) => !found.has(k) && !crossed.has(k));
    if (app.input.focusedId() === `a${i}` && next !== undefined) app.input.focus(`a${next}`);
    else app.input.refresh();
  }

  function wrong(i) {
    const b = button(i);
    flash(b, 'wiggle');
    b.classList.add('tried');
    say(reply, answers[i].reply ?? t('riddleWrong'), 'warn');
    audio.play('whoosh');
  }

  /** 💡 crosses out one wrong picture (untried ones first); with none left, the right one glows. */
  function hint() {
    const left = order.filter((i) => !answers[i].right && !crossed.has(i));
    const next = left.find((i) => !button(i).classList.contains('tried')) ?? left[0];
    audio.play('hint');
    if (next === undefined) {
      const r = order.find((i) => answers[i].right && !found.has(i));
      if (r !== undefined) flash(button(r), 'hint-flash');
      return;
    }
    crossed.add(next);
    const b = button(next);
    b.classList.add('crossed');
    b.setAttribute('aria-disabled', 'true');
    if (app.input.focusedId() === `a${next}`) app.input.focus(`a${order.find((i) => !crossed.has(i) && !found.has(i))}`);
    else app.input.refresh();
  }

  if (solved) {
    // Every right card as found, the others out of the game.
    order.forEach((i) => {
      if (answers[i].right) found.add(i), button(i).classList.add('right');
      else crossed.add(i);
      button(i).setAttribute('aria-disabled', 'true');
    });
    reply.textContent = t('wellDone');
    reply.className = 'riddle-reply good';
  }
}
