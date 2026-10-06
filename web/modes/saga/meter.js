// Book 4's Nachtbok-meter as a story step: after each phase of the fight
// the Nachtbok shrinks. The meter (art4.js's meterParts: the Nachtbok next
// to a familiar thing, "Zo groot als een huis", and the row of sizes from
// a mountain down to a little goat) stands on a card over the scene; the
// old size puffs away, the new one pops up, and the step's lines say what
// happened.
//
// A book lists its sizes as `meter: [{id, picture, word}]`, biggest first;
// a `meter` step is {to, lines, scene?}. The size before the step comes
// from the steps before it (see index.js), like the suspect board's cards.

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { app } from '../../shell.js';
import { cardScreen, esc, line } from './pages.js';
import { meterParts } from './art4.js';

/** When the old size puffs away and the new one appears (see .saga-meter in saga.css). */
const SHRINK_MS = 900;

/** Little clouds that burst outwards where the Nachtbok stood. */
function puffs() {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return `<circle class="mt-puff" cx="125" cy="160" r="26" fill="#c8d0e8" style="--dx:${(Math.cos(a) * 90).toFixed(0)}px;--dy:${(Math.sin(a) * 70).toFixed(0)}px"/>`;
  }).join('');
}

/**
 * The meter step. step: {to, lines}. opts: those of cardScreen (art, title,
 * items, onBack, onHome, onMenu), and meters (the book's sizes), from (the
 * size before), scare, onDone().
 */
export function meterStep(step, opts) {
  const scare = opts.scare ?? 'spannend';
  const before = meterParts(opts.meters, opts.from, { scare });
  // After the shrink, how big it was stays behind as a faint shape.
  const after = meterParts(opts.meters, step.to, { scare, ghost: opts.from });
  const shrinks = opts.from !== step.to;
  let timer = null;
  const root = cardScreen({
    ...opts,
    cls: `saga-meter${shrinks ? ' shrinks' : ''}`,
    card: `<div class="riddle-card meter-card">
        <div class="riddle-lines">${(step.lines ?? []).map((l) => `<p>${line(l)}</p>`).join('')}</div>
        <svg class="meter-svg" viewBox="-8 -8 478 352" role="img" aria-label="${esc(t('meterSize', { w: opts.meters.find((m) => m.id === step.to)?.word ?? '' }))}">
          ${after.frame}
          ${shrinks ? `<g class="mt-old">${before.label}${before.compare}</g>` : ''}
          <g class="mt-new">${after.label}${after.compare}</g>
          ${shrinks ? puffs() : ''}
          ${after.row}
        </svg>
        <button class="btn big primary mt-next" data-nav="next">${icon('next')}<span>${t('next')}</span></button>
      </div>`,
    initial: 'next',
    // Leaving before the shrink sound: it stays quiet.
    leave: (go) => {
      clearTimeout(timer);
      go();
    },
    activate: (id) => {
      if (id === 'next') {
        clearTimeout(timer);
        opts.onDone();
      }
    },
  });
  audio.play('whoosh');
  if (shrinks) {
    timer = setTimeout(() => {
      if (app.el.querySelector('.saga-meter') === root) audio.play('shrink');
    }, SHRINK_MS);
  }
}
