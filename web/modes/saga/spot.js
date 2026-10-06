// Wat is er anders? (story chapter 3.1): two pictures of the same place,
// yesterday and today, side by side (on a portrait screen, one above the
// other). Tap a difference in either picture: it is circled in both. A tap
// on something that is the same gives a gentle wiggle and nothing else;
// stars only drop for hints. A hint pulses one difference still to find
// (the story's clues first).
//
// On the D-pad the today picture is a grid of squares (`grid`, e.g. 4×3),
// each one a focus stop, so the arrows move a cursor over the picture and
// OK looks in that square. Every square can be chosen, so moving the focus
// gives nothing away; `make validate` checks that no two differences share
// a square, so OK on a square finds at most one.
//
// A Puzzle for RoomScreen (../spookhuis/room.js). ctx.data =
//   {scene, grid: [cols, rows], zones: [{id, x, y, r, story?}]}
// in the picture's own box (checked by `make validate`). What the pictures
// show comes from a skin, ctx.art, like the lock's (see engines.js):
// viewBox() is the picture's box, picture(day) draws 'yesterday' or
// 'today', and spots() says where the art draws each difference
// ({id: [x, y]}); mount() checks that every zone has its difference there.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { app, sleep } from '../../shell.js';
import { starsFrom } from '../spookhuis/room.js';

const DAYS = ['yesterday', 'today'];

/** The pictures without a skin: empty. */
const ART = {
  viewBox: () => [0, 0, 800, 600],
  picture: () => '',
  spots: () => ({}),
};

export class Spot {
  constructor(ctx) {
    this.ctx = ctx;
    this.art = { ...ART, ...ctx.art };
    this.zones = ctx.data?.zones ?? [];
    [this.cols, this.rows] = ctx.data?.grid ?? [4, 3];
    this.found = new Set();
    this.initial = `p-g${Math.floor(this.rows / 2) * this.cols + Math.floor(this.cols / 2)}`;
  }

  goal() {
    return t('goalSpot');
  }

  // ---------- markup ----------

  html() {
    const [, , w, h] = this.art.viewBox();
    const cw = w / this.cols;
    const ch = h / this.rows;
    const cells = Array.from({ length: this.cols * this.rows }, (_, k) => {
      const [x, y] = [(k % this.cols) * cw, Math.floor(k / this.cols) * ch];
      return `<rect class="sp-cell" data-nav="p-g${k}" x="${x + 6}" y="${y + 6}" width="${cw - 12}" height="${ch - 12}" rx="18" aria-label="${t('spotSquare', { n: k + 1 })}"/>`;
    }).join('');
    const pic = (day) => `<figure class="sp-pic sp-${day}">
        <figcaption>${t(day)}</figcaption>
        <svg viewBox="${this.art.viewBox().join(' ')}" data-day="${day}" role="img" aria-label="${t(day)}">
          ${this.art.picture(day)}
          <g class="sp-marks"></g>
          ${day === 'today' ? `<g class="sp-grid">${cells}</g>` : ''}
        </svg>
      </figure>`;
    return `<div class="saga-spot" style="--ratio: ${w} / ${h}">
      <div class="sp-pics">${DAYS.map(pic).join('')}</div>
      <div class="sp-count" aria-live="polite">${this.zones.map(() => '<span></span>').join('')}</div>
    </div>`;
  }

  mount(el) {
    this.el = el;
    this.svgs = [...el.querySelectorAll('.sp-pic svg')];
    this.svgs.forEach((svg) => svg.addEventListener('click', (e) => this.tap(svg, e)));
    // Every zone must sit on a difference the art draws.
    const spots = this.art.spots();
    for (const z of this.zones) {
      const s = spots[z.id];
      if (!s) console.error(`spot: the picture has no difference "${z.id}"`);
      else if (Math.hypot(s[0] - z.x, s[1] - z.y) > z.r) console.error(`spot: "${z.id}" is drawn at ${s}, its zone is at ${z.x},${z.y}`);
    }
  }

  // ---------- actions ----------

  /** A tap or click on one of the pictures, at its own coordinates. */
  tap(svg, e) {
    if (this.busy || this.dead) return;
    audio.unlock();
    const m = svg.getScreenCTM?.();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    // The nearest zone the tap is in (a little generous: small fingers).
    const hit = this.zones
      .map((z) => [z, Math.hypot(p.x - z.x, p.y - z.y) / (z.r * 1.15)])
      .filter(([, d]) => d <= 1)
      .sort((a, b) => a[1] - b[1])[0]?.[0];
    if (hit && !this.found.has(hit.id)) this.find(hit);
    else if (!hit) this.miss(svg.closest('.sp-pic'));
  }

  /** OK on a square of the today picture: look there. */
  activate(id) {
    if (this.busy || !id.startsWith('p-g')) return;
    const k = Number(id.slice(3));
    const z = this.zones.find((z) => this.cellOf(z) === k);
    if (z && !this.found.has(z.id)) this.find(z);
    else if (!z) this.miss(this.el.querySelector('.sp-today'));
  }

  cellOf(z) {
    const [, , w, h] = this.art.viewBox();
    return Math.floor(z.y / (h / this.rows)) * this.cols + Math.floor(z.x / (w / this.cols));
  }

  /** Circle `z` in both pictures; the last one solves the puzzle. */
  find(z) {
    this.found.add(z.id);
    audio.play('treasure');
    for (const svg of this.svgs) {
      svg.querySelector(`.sp-hint[data-id="${z.id}"]`)?.remove();
      svg.querySelector('.sp-marks').insertAdjacentHTML(
        'beforeend',
        `<g class="sp-found"><circle cx="${z.x}" cy="${z.y}" r="${z.r}" pathLength="100" class="sp-ring"/><circle cx="${z.x}" cy="${z.y}" r="${z.r}" class="sp-flash"/></g>`,
      );
    }
    this.el.querySelectorAll('.sp-count span').forEach((s, k) => s.classList.toggle('on', k < this.found.size));
    if (this.offGoal) {
      this.offGoal = false;
      this.ctx.say(this.goal());
    }
    if (this.found.size < this.zones.length) return;
    this.busy = true;
    this.ctx.busy(() => sleep(1100)).then(() => this.ctx.solved());
  }

  miss(fig) {
    audio.play('whoosh');
    this.ctx.say(t('spotWrong'), 'warn');
    this.offGoal = true;
    this.ctx.wiggle(fig);
  }

  /** Pulse one difference still to find (the story's clues first) in both pictures. */
  hint() {
    if (this.busy) return false;
    const left = this.zones.filter((z) => !this.found.has(z.id));
    const z = left.find((z) => z.story) ?? left[0];
    if (!z) return false;
    for (const svg of this.svgs) {
      svg.querySelector(`.sp-hint[data-id="${z.id}"]`)?.remove();
      svg.querySelector('.sp-marks').insertAdjacentHTML('beforeend', `<circle class="sp-hint" data-id="${z.id}" cx="${z.x}" cy="${z.y}" r="${z.r}"/>`);
    }
    setTimeout(() => this.el.querySelectorAll(`.sp-hint[data-id="${z.id}"]`).forEach((c) => c.remove()), 2600);
    // On the D-pad the cursor jumps to it too.
    if (document.body.classList.contains('kbd')) app.input.focus(`p-g${this.cellOf(z)}`);
    return true;
  }

  destroy() {
    this.dead = true;
  }

  stars(hints) {
    return starsFrom(0, hints);
  }
}
