// Book 3's suspect board (verdachtenbord): six suspects on a cork board,
// shown on the book map and in some scenes, and a story step in which the
// child turns suspects over as the clues come in.
//
// A book lists its suspects as [{id, picture, word}] (`suspects` in the
// book file); a `suspects` step is {lines, turn: [ids], wrong?}: the cards
// in `turn` must be tapped to turn them over, a tap on another face-up
// card gets the `wrong` reply. Which cards are already turned comes from
// the steps before (see index.js). A turned card shows its back: a soft
// blue card with a faded picture and a green tick ("not the thief"), so
// nobody is crossed out harshly.

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { app, sleep } from '../../shell.js';
import { picture } from './pictures.js';
import { cardScreen, esc, flash, line, say } from './pages.js';
import { at } from './kit.js';

/** A green tick in a soft circle, centred on (0, 0), radius 1 = 30. */
function tick(r = 30) {
  return `<circle r="${r}" fill="#e4f7dc" stroke="#3f9f5a" stroke-width="${r * 0.16}"/>
    <path d="M${-r * 0.45} 0 L${-r * 0.1} ${r * 0.36} L${r * 0.5} ${-r * 0.36}" stroke="#2f7a3a" stroke-width="${r * 0.2}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** One suspect card on the board (120×150), face up or turned over. */
function suspectCard(s, turned) {
  if (turned) {
    return `<g class="sus-card turned">
      <rect x="2" y="6" width="116" height="140" rx="12" fill="#00000033"/>
      <rect width="116" height="140" rx="12" fill="#c9d6ea" stroke="#5a6f96" stroke-width="4"/>
      <g opacity=".3">${at(18, 14, 0.8, picture(s.picture))}</g>
      <g transform="translate(58 104)">${tick(24)}</g>
    </g>`;
  }
  return `<g class="sus-card">
    <rect x="2" y="6" width="116" height="140" rx="12" fill="#00000033"/>
    <rect width="116" height="140" rx="12" fill="#fffaf0" stroke="#b8862a" stroke-width="4"/>
    ${at(12, 8, 0.92, picture(s.picture))}
    <text x="58" y="128" text-anchor="middle" font-size="24" font-weight="800" fill="#3a2410">${esc(s.word)}</text>
  </g>`;
}

/**
 * The cork board with the six cards (3×2) under a title strip, in a
 * 440×400 box; `turned` is a Set of suspect ids. Red pins hold the cards.
 */
export function suspectBoard(suspects = [], turned = new Set()) {
  const cards = suspects
    .map((s, i) => {
      const x = 26 + (i % 3) * 134;
      const y = 82 + Math.floor(i / 3) * 156;
      const tilt = [-3, 2, -1, 2, -2, 3][i % 6];
      return `<g transform="translate(${x} ${y}) rotate(${tilt} 58 70)">${suspectCard(s, turned.has(s.id))}
        <circle cx="58" cy="4" r="8" fill="#d8433a" stroke="#7a1f1a" stroke-width="2.5"/><circle cx="55" cy="1" r="2.5" fill="#ff9a8a"/></g>`;
    })
    .join('');
  return `<g class="suspect-board">
    <rect x="6" y="10" width="440" height="400" rx="18" fill="#00000040"/>
    <rect width="440" height="400" rx="18" fill="#8a5a2e" stroke="#4a2f16" stroke-width="6"/>
    <rect x="16" y="16" width="408" height="368" rx="10" fill="#c99a5e"/>
    ${Array.from({ length: 40 }, (_, k) => `<circle cx="${30 + ((k * 97) % 380)}" cy="${30 + ((k * 61) % 340)}" r="${2 + (k % 3)}" fill="#b0824a"/>`).join('')}
    <rect x="110" y="24" width="220" height="46" rx="8" fill="#fffaf0" stroke="#b8862a" stroke-width="3" transform="rotate(-1 220 47)"/>
    <text x="220" y="58" text-anchor="middle" font-size="32" font-weight="800" fill="#8a3f3f">${esc(t('suspectsTitle'))}</text>
    ${cards}
  </g>`;
}

/**
 * The suspects step: the board as a card on the scene; tap the suspects in
 * `step.turn` to turn them over. opts: those of cardScreen (art, title,
 * items, onBack, onHome, onMenu), and suspects (the book's list), turned
 * (Set: already turned), onDone().
 */
export function suspectStep(step, opts) {
  const turn = new Set(step.turn ?? []);
  const turned = new Set(opts.turned);
  const done = new Set();
  let busy = false;

  const card = (s) => {
    const was = turned.has(s.id);
    return `<button class="suspect ${was ? 'turned' : ''}" data-nav="s-${esc(s.id)}" aria-label="${esc(s.word)}"${was ? ' aria-disabled="true"' : ''}>
      <span class="sus-flip">
        <span class="sus-face sus-front"><svg viewBox="0 0 100 100" aria-hidden="true">${picture(s.picture)}</svg><span>${esc(s.word)}</span></span>
        <span class="sus-face sus-back"><svg viewBox="0 0 100 100" aria-hidden="true"><g opacity=".3">${picture(s.picture)}</g><g transform="translate(50 50)">${tick(26)}</g></svg></span>
      </span>
    </button>`;
  };
  const root = cardScreen({
    ...opts,
    cls: 'saga-suspects',
    hint: turn.size > 0,
    card: `<div class="riddle-card suspect-card">
        <div class="riddle-lines">${(step.lines ?? []).map((l) => `<p>${line(l)}</p>`).join('')}</div>
        <div class="riddle-reply" role="status" aria-live="polite"></div>
        <div class="suspects">${opts.suspects.map(card).join('')}</div>
        ${turn.size ? '' : `<button class="btn big primary sus-next" data-nav="next">${icon('next')}<span>${t('next')}</span></button>`}
      </div>`,
    initial: turn.size ? `s-${opts.suspects.find((s) => !turned.has(s.id))?.id}` : 'next',
    busy: () => busy,
    activate: (id, el) => {
      if (id === 'next') opts.onDone();
      else if (id === 'hint') {
        const next = [...turn].find((s) => !done.has(s));
        audio.play('hint');
        if (!next) return;
        flash(button(next), 'hint-flash');
        // On the D-pad the focus jumps there too.
        if (document.body.classList.contains('kbd')) app.input.focus(`s-${next}`);
      } else if (id.startsWith('s-')) {
        const sid = id.slice(2);
        if (turned.has(sid) || done.has(sid)) return;
        if (turn.has(sid)) turnOver(sid);
        else {
          flash(el, 'wiggle');
          say(reply, step.wrong ?? t('suspectStays'), 'warn');
          audio.play('whoosh');
        }
      }
    },
  });
  const reply = root.querySelector('.riddle-reply');
  const button = (id) => root.querySelector(`[data-nav="s-${CSS.escape(id)}"]`);

  async function turnOver(id) {
    done.add(id);
    const b = button(id);
    b.classList.add('turned', 'flipping');
    b.setAttribute('aria-disabled', 'true');
    audio.play('rotate');
    say(reply, t('wellDone'), 'good');
    if (done.size < turn.size) {
      // Focus the next card still face up (the D-pad would otherwise sit on a disabled one).
      const next = opts.suspects.find((s) => !turned.has(s.id) && !done.has(s.id));
      if (next) app.input.focus(`s-${next.id}`);
      return;
    }
    busy = true;
    audio.play('treasure');
    await sleep(1500);
    if (app.el.querySelector('.saga-suspects') !== root) return;
    opts.onDone();
  }
}
