// The play screen: SVG board, tray, buttons, feedback and celebration.

import { road, ground, scenery, mist, pim, chapel, treasure, dame, icon, blockBase, grass } from './art.js';
import { t, treasureName } from './i18n.js';
import { Game, isBlock, shape } from './game.js';
import * as audio from './audio.js';

const STEP_MS = 380;
const IDLE_DRIFT_MS = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class PlayScreen {
  /**
   * @param {object} opts
   *   level, core, input, scare, label,
   *   onWin(stars) → Promise|void, onNext(), onReplay(), onHome(), onMenu()
   */
  constructor(root, opts) {
    this.root = root;
    this.opts = opts;
    this.input = opts.input;
    this.game = new Game(opts.level, opts.core);
    this.level = opts.level;
    this.busy = false;
    this.lastIssueKey = null;
    this.idleTimer = null;
    this.build();
    this.renderAll();
    this.input.setScreen(this.root, {
      initial: this.game.trayLeft().length ? `t${this.game.trayLeft()[0]}` : null,
      activate: (el) => this.onActivate(el),
      remove: (el) => this.onRemove(el),
      back: () => this.onBack(),
      undo: () => this.doUndo(),
      onFocus: (el) => this.onFocus(el),
    });
    // Mouse users see where a selected block will land.
    this.svg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const cell = e.target.closest?.('.cell');
      this.showPreview(cell ? Number(cell.dataset.nav.slice(1)) : null);
    });
    this.svg.addEventListener('pointerleave', () => this.showPreview(null));
    this.showGoal();
    this.resetIdle();
    this.input.onActivity(() => this.resetIdle());
  }

  destroy() {
    clearTimeout(this.idleTimer);
    this.destroyed = true;
  }

  // ---------- layout ----------

  build() {
    const { width: w, height: h } = this.level;
    const patrol = this.level.patrol?.length > 0;
    this.root.innerHTML = `
      <section class="play" data-patrol="${patrol}" style="--n: ${Math.max(w, h)}">
        <header class="play-head">
          <div class="play-label">${this.opts.label}</div>
          <div class="goal" role="status" aria-live="polite"></div>
        </header>
        <div class="board-wrap">
          <svg class="board" viewBox="-6 -6 ${w * 100 + 12} ${h * 100 + 12}" role="grid" aria-label="${t('title')}">
            <rect x="-6" y="-6" width="${w * 100 + 12}" height="${h * 100 + 12}" rx="18" fill="#0a1128"/>
            <g class="cells"></g>
            <g class="blocks"></g>
            <g class="lights"></g>
            <g class="preview"></g>
            <g class="patrol-layer"></g>
            <g class="fx"></g>
            <g class="actors">
              <g class="actor pim-actor"><g class="actor-inner">${pim()}</g></g>
              ${patrol ? `<g class="actor dame-actor"><g class="actor-inner">${dame({ scare: this.opts.scare })}</g></g>` : ''}
            </g>
            <rect class="ring" x="-2" y="-2" width="104" height="104" rx="14" visibility="hidden"/>
          </svg>
          ${patrol ? '' : `<div class="float-dame" aria-hidden="true"><svg viewBox="0 0 100 100">${dame({ scare: this.opts.scare })}</svg></div>`}
        </div>
        <aside class="side">
          <div class="tray" role="list"></div>
          <div class="buttons">
            ${this.button('undo', 'undo', t('undo'))}
            ${this.button('hint', 'hint', t('hint'))}
            ${this.button('remove', 'remove', t('remove'))}
            ${patrol ? this.button('look', 'look', t('look')) : ''}
            ${this.button('home', 'home', t('home'))}
            ${this.button('menu', 'gear', '', 'small')}
          </div>
        </aside>
      </section>`;
    this.svg = this.root.querySelector('.board');
    this.cellsG = this.svg.querySelector('.cells');
    this.fx = this.svg.querySelector('.fx');
    this.blocksG = this.svg.querySelector('.blocks');
    this.lightsG = this.svg.querySelector('.lights');
    this.previewG = this.svg.querySelector('.preview');
    this.ring = this.svg.querySelector('.ring');
    this.trayEl = this.root.querySelector('.tray');
    this.goalEl = this.root.querySelector('.goal');
    this.pimEl = this.svg.querySelector('.pim-actor');
    this.dameEl = this.svg.querySelector('.dame-actor');
    this.floatDame = this.root.querySelector('.float-dame');
    if (patrol) this.drawPatrol();
    this.moveActor(this.pimEl, this.startCell(), false);
    if (this.dameEl) this.moveActor(this.dameEl, this.level.patrol[0], false);
  }

  button(id, iconName, label, cls = '') {
    return `<button class="btn ${cls}" data-nav="b-${id}" aria-label="${label || id}">${icon(iconName)}${label ? `<span>${label}</span>` : ''}</button>`;
  }

  startCell() {
    return this.level.cells.findIndex((c) => c.kind === 'Start');
  }

  xy(i) {
    return [(i % this.level.width) * 100, Math.floor(i / this.level.width) * 100];
  }

  moveActor(el, cell, animate = true, flip = null) {
    if (!el) return;
    const [x, y] = this.xy(cell);
    el.style.transition = animate ? '' : 'none';
    el.style.transform = `translate(${x}px, ${y}px)`;
    if (flip !== null) el.classList.toggle('flip', flip);
    if (!animate) el.getBoundingClientRect();
  }

  drawPatrol() {
    const pts = this.level.patrol.map((c) => this.xy(c).map((v) => v + 50));
    const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join(' ') + 'Z';
    const steps = pts
      .map(([x, y], k) => {
        const [nx, ny] = pts[(k + 1) % pts.length];
        const mx = (x + nx) / 2;
        const my = (y + ny) / 2;
        const angle = (Math.atan2(ny - y, nx - x) * 180) / Math.PI;
        return `<g transform="translate(${mx} ${my}) rotate(${angle})"><ellipse cx="-7" cy="-6" rx="6" ry="4"/><ellipse cx="7" cy="6" rx="6" ry="4"/></g>`;
      })
      .join('');
    this.svg.querySelector('.patrol-layer').innerHTML = `
      <path class="patrol-path" d="${d}"/>
      <g class="footprints">${steps}</g>
      ${pts.map(([x, y]) => `<circle class="patrol-dot" cx="${x}" cy="${y}" r="10"/>`).join('')}`;
  }

  // ---------- rendering ----------

  renderAll() {
    this.renderCells();
    this.renderTray();
    this.renderButtons();
    this.input.refresh();
  }

  cellContent(i, cover) {
    const c = this.level.cells[i];
    const reached = this.game.result?.reached?.includes(i);
    const tile = c.tile;
    switch (c.kind) {
      case 'Empty': {
        const p = cover[i];
        if (!p) return ground('empty');
        // Blocks are drawn whole in their own layer.
        if (isBlock(this.level.tray[p.piece])) return ground('placed');
        return ground('placed') + road(p.tile.kind, p.tile.rot);
      }
      case 'Road':
        return ground('fixed') + road(tile.kind, tile.rot);
      case 'Trail':
        return ground('fixed') + road(tile.kind, tile.rot, { trail: true });
      case 'Start':
        return ground('fixed') + road(tile.kind, tile.rot);
      case 'Finish':
        return ground('fixed') + road(tile.kind, tile.rot) + `<g transform="translate(10 6) scale(.8)">${chapel({ lit: !!reached })}</g>`;
      case 'Waypoint':
        return (
          ground('fixed') + road(tile.kind, tile.rot) +
          `<g class="treasure-slot" data-order="${c.order}"><circle cx="50" cy="50" r="30" fill="url(#g-lantern)" opacity=".7"/><g transform="translate(24 22) scale(.52)">${treasure(c.order)}</g>` +
          (this.level.ordered ? `<g class="order-badge"><circle cx="82" cy="18" r="13"/><text x="82" y="24" text-anchor="middle">${c.order + 1}</text></g>` : '') +
          '</g>'
        );
      case 'Obstacle':
        return ground('obstacle') + scenery(c.scenery);
      case 'Mist':
        return ground('placed') + (tile ? road(tile.kind, tile.rot, { dim: true }) : '') + mist();
      default:
        return ground('empty');
    }
  }

  renderCells() {
    const { width: w } = this.level;
    const cover = this.game.cover();
    this.cellsG.innerHTML = this.level.cells
      .map((c, i) => {
        const [x, y] = [(i % w) * 100, Math.floor(i / w) * 100];
        const kind = c.kind.toLowerCase();
        const placed = cover[i] ? ' placed' : '';
        return `<g class="cell cell-${kind}${placed}" data-nav="c${i}" data-longpress role="gridcell" transform="translate(${x} ${y})">
          <g class="cell-inner">${this.cellContent(i, cover)}</g>
        </g>`;
      })
      .join('');

    // Blocks: one piece spanning several cells, road fixed on it.
    this.blocksG.innerHTML = this.game.placed
      .map((p, anchor) => {
        if (!p || !isBlock(this.level.tray[p.piece])) return '';
        const [x, y] = this.xy(anchor);
        return `<g class="block" data-anchor="${anchor}" transform="translate(${x} ${y})">${this.blockArt(shape(this.level.tray[p.piece], p.rot))}</g>`;
      })
      .join('');

    // Lantern light on road connected to Pim, and the last-moved piece.
    const reached = new Set(this.game.result?.reached || []);
    const last = this.game.lastCell;
    const lastCells = last !== null && this.game.placed[last] ? this.game.footprint(last, this.game.placed[last].piece, this.game.placed[last].rot) : [];
    this.lightsG.innerHTML =
      [...reached]
        .map((i) => {
          const [x, y] = this.xy(i);
          return `<rect class="lit" data-cell="${i}" x="${x + 3}" y="${y + 3}" width="94" height="94" rx="10"/>`;
        })
        .join('') + this.outline(lastCells.map((c) => c.cell), 'last-mark');
  }

  /** A block drawn in its own box (w×h cells of 100 units). */
  blockArt(s) {
    return (
      blockBase(s.w, s.h) +
      s.tiles
        .map((t, k) => {
          const x = (k % s.w) * 100;
          const y = Math.floor(k / s.w) * 100;
          return `<g transform="translate(${x} ${y})">${t ? road(t.kind, t.rot) : grass()}</g>`;
        })
        .join('')
    );
  }

  /** A rounded outline around a rectangle of cells. */
  outline(cells, cls) {
    if (!cells.length) return '';
    const pts = cells.map((c) => this.xy(c));
    const x0 = Math.min(...pts.map((p) => p[0]));
    const y0 = Math.min(...pts.map((p) => p[1]));
    const x1 = Math.max(...pts.map((p) => p[0])) + 100;
    const y1 = Math.max(...pts.map((p) => p[1])) + 100;
    return `<rect class="${cls}" x="${x0 + 8}" y="${y0 + 8}" width="${x1 - x0 - 16}" height="${y1 - y0 - 16}" rx="10"/>`;
  }

  onFocus(el) {
    const id = el?.dataset.nav || '';
    if (id.startsWith('c') && document.body.classList.contains('kbd')) {
      const [x, y] = this.xy(Number(id.slice(1)));
      this.ring.setAttribute('x', x - 2);
      this.ring.setAttribute('y', y - 2);
      this.ring.setAttribute('visibility', 'visible');
      this.showPreview(Number(id.slice(1)));
    } else {
      this.ring.setAttribute('visibility', 'hidden');
      this.showPreview(null);
    }
  }

  /** Ghost of the selected block where it would land if dropped on `cell`. */
  showPreview(cell) {
    const sel = this.game.selected;
    if (cell === null || sel === null || !isBlock(this.level.tray[sel]) || !this.game.isFree(cell)) {
      this.previewG.innerHTML = '';
      return;
    }
    const rot = this.game.trayRot[sel];
    const anchor = this.game.anchorFor(cell, sel, rot);
    if (anchor === null) {
      this.previewG.innerHTML = '';
      return;
    }
    const [x, y] = this.xy(anchor);
    this.previewG.innerHTML = `<g class="ghost" transform="translate(${x} ${y})">${this.blockArt(shape(this.level.tray[sel], rot))}</g>`;
  }

  renderTray() {
    const left = this.game.trayLeft();
    // Blocks first: they are the big decisions.
    left.sort((a, b) => isBlock(this.level.tray[b]) - isBlock(this.level.tray[a]));
    this.trayEl.innerHTML = left
      .map((i) => {
        const piece = this.level.tray[i];
        const sel = this.game.selected === i ? ' selected' : '';
        if (isBlock(piece)) {
          const s = shape(piece, this.game.trayRot[i]);
          return `<button class="piece block${sel}" data-nav="t${i}" role="listitem" aria-pressed="${!!sel}" style="--w: ${s.w}; --h: ${s.h}">
            <svg viewBox="0 0 ${s.w * 100} ${s.h * 100}">${this.blockArt(s)}</svg></button>`;
        }
        return `<button class="piece${sel}" data-nav="t${i}" role="listitem" aria-pressed="${!!sel}">
          <svg viewBox="0 0 100 100">${ground('placed')}${road(piece.kind, this.game.trayRot[i])}</svg></button>`;
      })
      .join('');
    this.showPreview(null);
    this.root.querySelector('.play').classList.toggle('has-selection', this.game.selected !== null);
  }

  renderButtons() {
    const set = (id, enabled) => {
      const b = this.root.querySelector(`[data-nav="b-${id}"]`);
      if (b) b.classList.toggle('dim', !enabled);
    };
    set('undo', this.game.canUndo());
    set('remove', this.game.lastCell !== null && !!this.game.placed[this.game.lastCell]);
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

  showGoal() {
    const wps = this.level.cells.filter((c) => c.kind === 'Waypoint').length;
    let text = t('goal');
    if (wps === 1) text = t('goalTreasure', { t: treasureName(0) });
    if (wps > 1) text = this.level.ordered ? t('goalOrdered') : t('goalTreasures');
    if (this.level.patrol?.length) text += ' ' + t('goalDame');
    this.say(text);
  }

  // ---------- actions ----------

  onActivate(el) {
    if (this.busy) return;
    audio.unlock();
    const id = el.dataset.nav;
    if (id.startsWith('c')) this.activateCell(Number(id.slice(1)));
    else if (id.startsWith('t')) this.activateTray(Number(id.slice(1)));
    else if (id.startsWith('b-')) this.activateButton(id.slice(2));
  }

  onRemove(el) {
    if (this.busy) return;
    const id = el?.dataset.nav || '';
    if (id.startsWith('c')) this.removeAt(Number(id.slice(1)));
  }

  onBack() {
    if (this.busy) return;
    if (this.game.canUndo()) this.doUndo();
    else this.opts.onHome();
  }

  activateTray(piece) {
    const what = this.game.selectTray(piece);
    audio.play(what === 'rotate' ? 'rotate' : 'select');
    this.renderTray();
    this.input.refresh();
  }

  activateCell(i) {
    const c = this.level.cells[i];
    if (c.kind !== 'Empty') {
      this.wiggle(i);
      if (c.kind === 'Waypoint') this.say(treasureName(c.order));
      else if (c.kind === 'Mist') this.say(t('mist'), 'warn');
      else if (c.kind !== 'Obstacle') this.say(t('locked'));
      return;
    }
    const sel = this.game.selected;
    if (sel !== null) {
      if (this.game.dropSelected(i)) {
        audio.play('place');
        this.afterMove();
      } else {
        this.wiggle(i);
        this.say(t('noFit'), 'warn');
      }
      return;
    }
    if (this.game.cover()[i]) {
      if (!this.level.rotatable) {
        this.game.remove(i);
        audio.play('remove');
      } else if (this.game.rotate(i)) {
        audio.play('rotate');
      } else {
        // A block with no room to turn here.
        this.wiggle(i);
        this.say(t('noFit'), 'warn');
        return;
      }
      this.afterMove();
      return;
    }
    // Empty cell, nothing selected: point at the tray.
    this.say(t('pickPiece'));
    this.trayEl.classList.remove('nudge');
    void this.trayEl.offsetWidth;
    this.trayEl.classList.add('nudge');
  }

  removeAt(i) {
    if (!this.game.remove(i)) return;
    audio.play('remove');
    this.afterMove();
  }

  activateButton(id) {
    switch (id) {
      case 'undo':
        return this.doUndo();
      case 'hint':
        return this.doHint();
      case 'remove':
        if (this.game.lastCell !== null) this.removeAt(this.game.lastCell);
        return;
      case 'look':
        return this.lookAtDame();
      case 'home':
        return this.opts.onHome();
      case 'menu':
        return this.opts.onMenu();
    }
  }

  doUndo() {
    if (this.busy || !this.game.undo()) return;
    audio.play('undo');
    this.afterMove();
  }

  doHint() {
    const h = this.game.hint();
    if (!h) return;
    audio.play('hint');
    this.afterMove();
    const p = this.game.placed[h.cell];
    const cells = p && h.type !== 'Remove' ? this.game.footprint(h.cell, p.piece, p.rot).map((c) => c.cell) : [h.cell];
    cells.forEach((c) => this.pulse(c, 'hint-pulse'));
    this.input.focus(`c${h.cell}`);
  }

  afterMove() {
    const r = this.game.check();
    this.renderAll();
    if (r.won) {
      this.celebrate();
      return;
    }
    const key = r.issue ? JSON.stringify(r.issue) : null;
    if (r.issue && key !== this.lastIssueKey) this.showIssue(r.issue, r.route);
    else if (!r.issue && this.lastIssueKey) this.showGoal();
    this.lastIssueKey = key;
  }

  // ---------- feedback ----------

  cellG(i) {
    return this.cellsG.querySelector(`[data-nav="c${i}"]`);
  }

  wiggle(i) {
    const g = this.cellG(i);
    if (!g) return;
    g.classList.remove('wiggle');
    void g.getBoundingClientRect();
    g.classList.add('wiggle');
  }

  pulse(i, cls = 'issue-pulse') {
    const [x, y] = this.xy(i);
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({ x: x + 2, y: y + 2, width: 96, height: 96, rx: 12, class: cls }).forEach(([k, v]) => r.setAttribute(k, v));
    this.fx.appendChild(r);
    setTimeout(() => r.remove(), 2600);
  }

  treasureCell(order) {
    return this.level.cells.findIndex((c) => c.kind === 'Waypoint' && c.order === order);
  }

  async showIssue(issue, route) {
    audio.play('whoosh');
    switch (issue.type) {
      case 'Mist':
        this.say(t('mist'), 'warn');
        this.pulse(issue.cell);
        break;
      case 'MissingTreasure':
        this.say(t('firstTreasure', { t: treasureName(issue.order) }), 'warn');
        this.pulse(this.treasureCell(issue.order));
        break;
      case 'WrongOrder':
        this.say(t('orderFirst', { t: treasureName(issue.order) }), 'warn');
        this.pulse(this.treasureCell(issue.order));
        break;
      case 'Dame':
        this.say(t('dame'), 'warn');
        await this.walk(route.slice(0, issue.tick + 1), { stopAtEnd: true });
        this.pulse(issue.cell);
        await sleep(900);
        this.resetActors();
        break;
    }
  }

  resetActors() {
    this.moveActor(this.pimEl, this.startCell(), false, false);
    if (this.dameEl) this.moveActor(this.dameEl, this.level.patrol[0], false);
    this.svg.querySelectorAll('.collected').forEach((el) => el.classList.remove('collected'));
  }

  /** Pim rides along `route`; the Dame (if any) moves in step. */
  async walk(route, { celebrate = false } = {}) {
    this.busy = true;
    this.root.querySelector('.play').classList.add('walking');
    const patrol = this.level.patrol || [];
    for (let k = 0; k < route.length; k++) {
      if (this.destroyed) return;
      const cell = route[k];
      const prev = route[k - 1];
      const flip = prev !== undefined ? cell % this.level.width < prev % this.level.width : null;
      this.moveActor(this.pimEl, cell, k > 0, flip);
      if (patrol.length) this.moveActor(this.dameEl, patrol[k % patrol.length], k > 0);
      if (celebrate) this.lightsG.querySelector(`[data-cell="${cell}"]`)?.classList.add('route-lit');
      if (k > 0) audio.play('step');
      const c = this.level.cells[cell];
      if (celebrate && c.kind === 'Waypoint') {
        this.cellG(cell)?.querySelector('.treasure-slot')?.classList.add('collected');
        audio.play('treasure');
      }
      await sleep(STEP_MS);
    }
    this.root.querySelector('.play').classList.remove('walking');
    this.busy = false;
  }

  async lookAtDame() {
    if (!this.dameEl || this.busy) return;
    this.busy = true;
    const p = this.level.patrol;
    for (let k = 0; k <= p.length; k++) {
      this.moveActor(this.dameEl, p[k % p.length], k > 0);
      await sleep(450);
    }
    this.busy = false;
  }

  async celebrate() {
    this.busy = true;
    const route = this.game.result.route;
    this.say(t('wellDone'), 'good');
    await this.walk(route, { celebrate: true });
    if (this.destroyed) return;
    this.busy = true;
    audio.play('win');
    this.root.querySelector('.play').classList.add('won');
    const stars = this.game.stars();
    await this.opts.onWin?.(stars);
    await sleep(500);
    if (this.destroyed) return;
    this.showWinOverlay(stars);
  }

  showWinOverlay(stars) {
    const el = document.createElement('div');
    el.className = 'overlay win-overlay';
    el.innerHTML = `<div class="panel">
        <h2>${t('wellDone')}</h2>
        <div class="stars">${[1, 2, 3].map((n) => icon('star', n <= stars ? 'on' : 'off')).join('')}</div>
        <div class="row">
          <button class="btn big primary" data-nav="next">${icon('next')}<span>${t('next')}</span></button>
          <button class="btn big" data-nav="again">${icon('again')}<span>${t('again')}</span></button>
        </div>
      </div>`;
    this.root.appendChild(el);
    this.input.pushLayer(el, {
      initial: 'next',
      activate: (b) => {
        this.input.popLayer();
        el.remove();
        if (b.dataset.nav === 'next') this.opts.onNext();
        else this.opts.onReplay();
      },
      back: () => {
        this.input.popLayer();
        el.remove();
        this.opts.onHome();
      },
    });
  }

  // ---------- Griezelstand "eng": the Dame drifts closer while waiting ----------

  resetIdle() {
    clearTimeout(this.idleTimer);
    const target = this.dameEl || this.floatDame;
    target?.classList.remove('closer');
    if (this.opts.scare !== 'eng' || this.destroyed) return;
    this.idleTimer = setTimeout(() => target?.classList.add('closer'), IDLE_DRIFT_MS);
  }
}
