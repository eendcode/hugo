// Lantaarnlicht: tap an empty square to put a mirror there; tap again to
// turn it; once more to take it back. The beam is redrawn after every
// change and the moonstones it touches light up.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { BoardScreen, starsFor } from '../gridplay.js';
import { lantern, mirror, stone, wall } from './art.js';

export class LanternScreen extends BoardScreen {
  get cls() {
    return 'light';
  }

  setup() {
    const f = this.level;
    this.w = f.width;
    this.h = f.height;
    this.n = Math.max(f.width, f.height);
    this.placed = new Map(); // cell → 'Slash' | 'Backslash'
  }

  goal() {
    return t('goalLantern');
  }

  initialFocus() {
    return `c${this.level.cells.findIndex((c) => c === 'Empty')}`;
  }

  cellBox(i) {
    return [(i % this.w) * 100, Math.floor(i / this.w) * 100, 100, 100];
  }

  boardHtml() {
    return `<svg class="board" viewBox="-6 -6 ${this.w * 100 + 12} ${this.h * 100 + 12}">
      <rect x="-6" y="-6" width="${this.w * 100 + 12}" height="${this.h * 100 + 12}" rx="16" fill="#0a1128"/>
      <g class="cells"></g>
      <g class="beam"></g>
      <g class="items"></g>
      <g class="fx"></g>
      <rect class="ring" x="-2" y="-2" width="104" height="104" rx="12" visibility="hidden"/>
    </svg>`;
  }

  sideHtml() {
    return '<div class="mirror-tray" aria-live="polite"></div>';
  }

  mount() {
    this.cellsG = this.svg.querySelector('.cells');
    this.beamG = this.svg.querySelector('.beam');
    this.itemsG = this.svg.querySelector('.items');
    this.trayEl = this.root.querySelector('.mirror-tray');
    this.cellsG.innerHTML = this.level.cells
      .map((c, i) => {
        const [x, y] = this.cellBox(i);
        const nav = c === 'Empty' ? ` data-nav="c${i}" data-longpress` : '';
        return `<g class="cell cell-${typeof c === 'string' ? c.toLowerCase() : 'fixed'}"${nav} transform="translate(${x} ${y})">
          <rect x="3" y="3" width="94" height="94" rx="10" class="ground"/>
        </g>`;
      })
      .join('');
  }

  left() {
    return this.level.mirrors - this.placed.size;
  }

  render() {
    const f = this.level;
    const beam = JSON.parse(this.core.lantern_trace(JSON.stringify(f), JSON.stringify([...this.placed])));
    this.beam = beam;
    const lit = new Set(beam.lit);
    this.itemsG.innerHTML = f.cells
      .map((c, i) => {
        const [x, y] = this.cellBox(i);
        let inner = '';
        if (c === 'Lantern') inner = lantern(f.facing);
        else if (c === 'Wall') inner = wall();
        else if (c === 'Stone') inner = stone(lit.has(i));
        else if (c.Fixed) inner = mirror(c.Fixed, true);
        else if (this.placed.has(i)) inner = mirror(this.placed.get(i));
        return inner ? `<g transform="translate(${x} ${y})">${inner}</g>` : '';
      })
      .join('');
    // The beam: from the lantern's centre through every cell it crosses.
    const pts = beam.path.map(([c]) => {
      const [x, y] = this.cellBox(c);
      return [x + 50, y + 50];
    });
    const [lc, ld] = beam.path[beam.path.length - 1];
    const [ex, ey] = this.cellBox(lc);
    // Run on to the edge of the board or halfway into what stopped it.
    const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][ld];
    pts.push([ex + 50 + d[0] * 50, ey + 50 + d[1] * 50]);
    const path = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ');
    this.beamG.innerHTML = `<path class="beam-glow" d="${path}"/><path class="beam-core" d="${path}"/>`;
    this.trayEl.innerHTML = `${Array.from({ length: f.mirrors }, (_, k) => `<svg class="tray-mirror ${k < this.left() ? '' : 'used'}" viewBox="0 0 100 100">${mirror('Slash')}</svg>`).join('')}`;
  }

  snapshot() {
    return new Map(this.placed);
  }

  restore(s) {
    this.placed = s;
  }

  activate(id) {
    const i = Number(id.slice(1));
    const cur = this.placed.get(i);
    if (!cur && this.left() <= 0) {
      this.say(t('noMirrors'), 'warn');
      this.flash(this.trayEl, 'nudge');
      return;
    }
    this.push();
    if (!cur) this.placed.set(i, 'Slash');
    else if (cur === 'Slash') this.placed.set(i, 'Backslash');
    else this.placed.delete(i);
    audio.play(cur === 'Backslash' ? 'remove' : cur ? 'rotate' : 'place');
    this.afterChange();
  }

  onRemove(el) {
    const i = Number((el?.dataset.nav || '').slice(1));
    if (!this.placed.has(i)) return;
    this.push();
    this.placed.delete(i);
    audio.play('remove');
    this.afterChange();
  }

  afterChange() {
    this.refresh();
    if (this.beam.won) this.win();
    else this.say(this.goal());
  }

  giveHint() {
    const h = JSON.parse(this.core.lantern_hint(JSON.stringify(this.level), JSON.stringify([...this.placed])));
    if (!h) return false;
    this.push();
    if (h.mirror) this.placed.set(h.cell, h.mirror);
    else this.placed.delete(h.cell);
    this.afterChange();
    this.flash(this.cellsG.querySelector(`[data-nav="c${h.cell}"]`));
    this.input.focus(`c${h.cell}`);
    return true;
  }

  stars() {
    return starsFor(0, 0, this.hints, 0);
  }
}
