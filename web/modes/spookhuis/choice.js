// Pick-the-answer puzzles: "Wat komt er nu?" (patterns), the number
// sequences in the counting room, and the shadows in the attic. Each level
// is three questions; a wrong pick wiggles and counts as a mistake.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { sleep } from '../../shell.js';
import { starsFrom } from './room.js';
import { shape, SHAPES, GLASS, dots } from './art.js';

const ROUNDS = 3;

class ChoicePuzzle {
  constructor(ctx) {
    this.ctx = ctx;
    this.round = 0;
    this.mistakes = 0;
    this.initial = 'p-0';
    this.q = this.make(ctx.level, ctx.rng);
  }

  html() {
    return `<div class="choice">
      <div class="question" aria-live="polite"></div>
      <div class="options"></div>
      <div class="round-dots">${Array.from({ length: ROUNDS }, () => '<span></span>').join('')}</div>
    </div>`;
  }

  mount(el) {
    this.el = el;
    this.render();
  }

  render() {
    this.el.querySelector('.question').innerHTML = this.questionHtml(this.q, false);
    this.el.querySelector('.options').innerHTML = this.q.options
      .map((o, k) => `<button class="option" data-nav="p-${k}">${this.optionHtml(o)}</button>`)
      .join('');
    this.el.querySelectorAll('.round-dots span').forEach((d, k) => d.classList.toggle('on', k < this.round));
  }

  goal() {
    return this.q.goal ?? t(this.goalKey);
  }

  activate(id, el) {
    const k = Number(id.slice(2));
    if (k === this.q.answer) {
      this.ctx.busy(async () => {
        audio.play('treasure');
        el.classList.add('right');
        this.el.querySelector('.question').innerHTML = this.questionHtml(this.q, true);
        this.round++;
        this.el.querySelectorAll('.round-dots span').forEach((d, i) => d.classList.toggle('on', i < this.round));
        await sleep(1100);
        if (this.round >= ROUNDS) return this.ctx.solved();
        this.q = this.make(this.ctx.level, this.ctx.rng);
        this.render();
        this.ctx.say(this.goal());
        this.ctx.refresh();
      });
    } else {
      this.mistakes++;
      audio.play('whoosh');
      this.ctx.wiggle(el);
      this.ctx.say(t('lookAgain'), 'warn');
    }
  }

  hint() {
    const el = this.el.querySelector(`[data-nav="p-${this.q.answer}"]`);
    this.ctx.pulse(el);
    return true;
  }

  stars(hints) {
    return starsFrom(this.mistakes, hints);
  }
}

/** Shuffle the right answer in among distinct wrong ones. */
function withOptions(rng, answer, wrong, count, same = (a, b) => JSON.stringify(a) === JSON.stringify(b)) {
  const options = [answer];
  for (const w of wrong) {
    if (options.length >= count) break;
    if (!options.some((o) => same(o, w))) options.push(w);
  }
  rng.shuffle(options);
  return { options, answer: options.findIndex((o) => same(o, answer)) };
}

// ---------- Wat komt er nu? ----------

export class Pattern extends ChoicePuzzle {
  goalKey = 'goalPattern';

  make(level, rng) {
    const kinds = rng.shuffle(SHAPES.filter((k) => k !== 'arrow'));
    const colors = rng.shuffle([...GLASS]);
    const item = (o) => ({ kind: kinds[0], color: colors[0], rot: 0, count: 1, size: 1, ...o });
    let seq;
    let wrong;
    switch (level) {
      case 0: {
        // Colours A B A B …
        const A = item({ color: colors[0] });
        const B = item({ color: colors[1] });
        seq = [A, B, A, B, A, B, A];
        wrong = [B, item({ color: colors[2] })];
        break;
      }
      case 1: {
        // Shapes A B C A B C …
        const ABC = [0, 1, 2].map((k) => item({ kind: kinds[k], color: colors[k] }));
        seq = [0, 1, 2, 0, 1, 2, 0].map((k) => ABC[k]);
        wrong = [ABC[2], ABC[0], item({ kind: kinds[3], color: colors[3] })];
        break;
      }
      case 2: {
        // A A B A A B …
        const A = item({ kind: kinds[0], color: colors[0] });
        const B = item({ kind: kinds[1], color: colors[1] });
        seq = [A, A, B, A, A, B, A, A];
        wrong = [B, item({ kind: kinds[2], color: colors[2] })];
        break;
      }
      case 3: {
        // Counting up: 1, 2, 3, 4, ?
        const start = rng.int(1, 2);
        seq = [0, 1, 2, 3, 4].map((k) => item({ count: start + k }));
        const n = start + 4;
        wrong = [item({ count: n - 1 }), item({ count: n + 1 }), item({ count: n - 2 })];
        break;
      }
      case 4: {
        // A turning arrow.
        const dir = rng.chance(0.5) ? 1 : 3;
        const r0 = rng.below(4);
        seq = [0, 1, 2, 3, 4, 5].map((k) => item({ kind: 'arrow', rot: (r0 + dir * k) % 4 }));
        const r = (r0 + dir * 5) % 4;
        wrong = [1, 2, 3].map((d) => item({ kind: 'arrow', rot: (r + d) % 4 }));
        break;
      }
      case 5: {
        // Shapes A B C while colours go A B.
        seq = [0, 1, 2, 3, 4, 5, 6].map((k) => item({ kind: kinds[k % 3], color: colors[k % 2] }));
        const k = 6;
        wrong = [
          item({ kind: kinds[k % 3], color: colors[(k + 1) % 2] }),
          item({ kind: kinds[(k + 1) % 3], color: colors[k % 2] }),
          item({ kind: kinds[(k + 2) % 3], color: colors[(k + 1) % 2] }),
        ];
        break;
      }
      case 6: {
        // Growing bigger while colours alternate.
        seq = [0, 1, 2, 3, 4].map((k) => item({ size: k / 4, color: colors[k % 2] }));
        wrong = [item({ size: 1, color: colors[1] }), item({ size: 0.5, color: colors[0] }), item({ size: 0, color: colors[0] })];
        break;
      }
      default: {
        // Counting down while shapes alternate.
        const start = rng.int(5, 6);
        seq = [0, 1, 2, 3, 4].map((k) => item({ count: start - k, kind: kinds[k % 2], color: colors[k % 2] }));
        const n = start - 4;
        wrong = [
          item({ count: n, kind: kinds[1], color: colors[1] }),
          item({ count: n + 1, kind: kinds[0], color: colors[0] }),
          item({ count: n - 1 || 3, kind: kinds[0], color: colors[0] }),
        ];
      }
    }
    const answer = seq.pop();
    return { shown: seq, value: answer, ...withOptions(rng, answer, wrong, level < 3 ? 3 : 4) };
  }

  questionHtml(q, solved) {
    const cell = (inner, cls = '') => `<div class="tile ${cls}"><svg viewBox="0 0 100 100">${inner}</svg></div>`;
    return q.shown.map((it) => cell(shape(it))).join('') + (solved ? cell(shape(q.value), 'answer') : cell('<text x="50" y="68" class="ask">?</text>', 'ask'));
  }

  optionHtml(o) {
    return `<svg viewBox="0 0 100 100">${shape(o)}</svg>`;
  }
}

// ---------- Getallenrij (the counting room) ----------

export class Numbers extends ChoicePuzzle {
  goalKey = 'goalNumbers';

  make(level, rng) {
    let seq;
    let step = 1;
    let hide = null; // index of a missing number (level 7)
    switch (level) {
      case 0: {
        const s = rng.int(1, 5);
        seq = [0, 1, 2, 3, 4].map((k) => s + k);
        break;
      }
      case 1: {
        const s = rng.int(6, 10);
        step = -1;
        seq = [0, 1, 2, 3, 4].map((k) => s - k);
        break;
      }
      case 2: {
        const s = rng.int(0, 6);
        step = 2;
        seq = [0, 1, 2, 3, 4].map((k) => s + 2 * k);
        break;
      }
      case 3: {
        step = rng.pick([5, 10]);
        const s = step * rng.int(0, 3);
        seq = [0, 1, 2, 3, 4].map((k) => s + step * k);
        break;
      }
      case 4: {
        step = rng.pick([3, -2, 4, -3]);
        const s = step > 0 ? rng.int(1, 6) : rng.int(14, 20);
        seq = [0, 1, 2, 3, 4].map((k) => s + step * k);
        break;
      }
      case 5: {
        const s = rng.int(1, 3);
        seq = [0, 1, 2, 3, 4].map((k) => s * 2 ** k);
        step = 0;
        break;
      }
      case 6: {
        // The steps grow: +1, +2, +3, …
        const s = rng.int(1, 5);
        seq = [s];
        for (let k = 1; k < 6; k++) seq.push(seq[k - 1] + k);
        step = 0;
        break;
      }
      case 7: {
        step = rng.int(2, 5);
        const s = rng.int(1, 10);
        seq = [0, 1, 2, 3, 4].map((k) => s + step * k);
        hide = rng.int(1, 3);
        break;
      }
      case 8: {
        // Two steps taking turns: +3, −1, +3, −1, …
        const up = rng.int(2, 4);
        const s = rng.int(1, 6);
        seq = [s];
        for (let k = 1; k < 7; k++) seq.push(seq[k - 1] + (k % 2 ? up : -1));
        step = 0;
        break;
      }
      default: {
        if (rng.chance(0.5)) {
          // Add the two before: 1, 1, 2, 3, 5, 8, …
          const a = rng.int(1, 2);
          seq = [a, a];
          for (let k = 2; k < 7; k++) seq.push(seq[k - 1] + seq[k - 2]);
        } else {
          const s = rng.int(1, 2);
          seq = [0, 1, 2, 3, 4].map((k) => (s + k) ** 2);
        }
        step = 0;
      }
    }
    let value;
    let shown;
    if (hide !== null) {
      value = seq[hide];
      shown = seq.map((v, k) => (k === hide ? null : v));
    } else {
      value = seq[seq.length - 1];
      shown = [...seq.slice(0, -1), null];
    }
    const last = seq[seq.length - 2];
    const wrong = [value + 1, value - 1, value + (step || 2), last, value + 2, value - 2].filter((v) => v >= 0 && v !== value);
    return {
      shown,
      value,
      dots: level <= 1,
      goal: hide !== null ? t('goalNumbersMissing') : null,
      ...withOptions(rng, value, wrong, level < 3 ? 3 : 4, (a, b) => a === b),
    };
  }

  questionHtml(q, solved) {
    return q.shown
      .map((v) => {
        const n = v ?? (solved ? q.value : null);
        const cls = v === null ? (solved ? 'answer' : 'ask') : '';
        return `<div class="tile number ${cls}">
          <span class="num">${n ?? '?'}</span>
          ${q.dots && n !== null ? `<svg class="pips" viewBox="0 0 100 100">${dots(n)}</svg>` : ''}
        </div>`;
      })
      .join('');
  }

  optionHtml(o) {
    return `<span class="num">${o}</span>`;
  }
}

// ---------- Schaduwen (the attic) ----------

/** Shapes that look the same after these quarter turns. */
const TURN_SYMMETRY = { circle: 1, square: 1, diamond: 2 };

function canonRot(kind, rot) {
  const s = TURN_SYMMETRY[kind];
  if (s === 1) return 0;
  if (s === 2) return rot % 2;
  return rot % 4;
}

/** The toy seen in a mirror: slots flip left-right, turns flip too. */
function mirrored(parts) {
  return parts.map((p) => ({
    ...p,
    gx: 2 - p.gx,
    rot: p.kind === 'moon' ? (6 - p.rot) % 4 : (4 - p.rot) % 4,
  }));
}

function silhouette(parts) {
  return JSON.stringify(parts.map((p) => [p.kind, p.gx, p.gy, canonRot(p.kind, p.rot), p.size]).sort());
}

export class Shadows extends ChoicePuzzle {
  goalKey = 'goalShadows';

  make(level, rng) {
    const count = Math.min(5, 2 + Math.floor(level / 2));
    const slots = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const colors = rng.shuffle([...GLASS]);
    const parts = slots.slice(0, count).map((s, k) => ({
      kind: rng.pick(SHAPES),
      gx: s % 3,
      gy: Math.floor(s / 3),
      rot: rng.below(4),
      size: rng.pick([0.8, 1]),
      color: colors[k % colors.length],
    }));
    const free = slots.slice(count);
    const variants = [];
    // Easier levels: a part missing or moved. Harder: a different shape or a mirror image.
    const removeOne = () => parts.filter((_, k) => k !== rng.below(parts.length));
    const moveOne = () => {
      const k = rng.below(parts.length);
      const s = rng.pick(free);
      return parts.map((p, j) => (j === k ? { ...p, gx: s % 3, gy: Math.floor(s / 3) } : p));
    };
    const reshape = () => {
      const k = rng.below(parts.length);
      const other = rng.pick(SHAPES.filter((x) => x !== parts[k].kind));
      return parts.map((p, j) => (j === k ? { ...p, kind: other } : p));
    };
    const makers = level < 3 ? [removeOne, reshape] : level < 6 ? [moveOne, reshape, removeOne] : [reshape, () => mirrored(parts), moveOne];
    const seen = new Set([silhouette(parts)]);
    for (let tries = 0; variants.length < 3 && tries < 60; tries++) {
      const v = makers[tries % makers.length]();
      const key = silhouette(v);
      if (v.length && !seen.has(key)) {
        seen.add(key);
        variants.push(v);
      }
    }
    return { toy: parts, ...withOptions(rng, parts, variants, level < 3 ? 3 : 4, (a, b) => silhouette(a) === silhouette(b)) };
  }

  static draw(parts, shadow) {
    return parts
      .map((p) => {
        const s = 0.34 * (0.8 + 0.2 * p.size);
        const x = 18 + p.gx * 32 - 50 * s;
        const y = 18 + p.gy * 32 - 50 * s;
        return `<g transform="translate(${x} ${y}) scale(${s})">${shape({ kind: p.kind, color: shadow ? '#1b1330' : p.color, rot: p.rot })}</g>`;
      })
      .join('');
  }

  questionHtml(q) {
    return `<div class="tile toy"><svg viewBox="0 0 100 100">${Shadows.draw(q.toy, false)}</svg></div>`;
  }

  optionHtml(o) {
    return `<svg class="shadow" viewBox="0 0 100 100">${Shadows.draw(o, true)}</svg>`;
  }
}
