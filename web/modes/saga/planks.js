// Planken (story chapter 1.3, "Timmer de deur dicht"): the chapel door has
// gaps. Tap a plank in the tray to pick it, tap it again to turn it, then tap
// a gap: the plank snaps to fit around that cell. Tap a nailed plank to take
// it back. The door is shut when every gap is covered.
//
// A Puzzle for RoomScreen (../spookhuis/room.js). `ctx.data` is one door from
// web/levels/saga/planks.json (the serde form of `planks::Door`):
//   {width, height, holes: [bool], planks: [{w, h, cells: [bool]}], solution, seed, difficulty, score}
// Without ctx.data a door of difficulty ctx.level (0–7) is made from ctx.rng.
// The Rust core (core/src/planks.rs) checks the door and gives the hints.

import { t } from '../../i18n.js';
import * as audio from '../../audio.js';
import { sleep } from '../../shell.js';
import { starsFrom } from '../spookhuis/room.js';

const FRAME = 34; // the stone frame around the door
const ARCH = 80; // the arched top above the cells
const INSET = 7; // gap between a plank's edge and its cells' edges
const WOODS = ['#e0aa62', '#c98848', '#eabf7c', '#b9783e', '#d99a50'];
const DARK_WOOD = '#5a3414';

/**
 * The plank turned `rot` quarter turns clockwise, as {w, h, cells}.
 * Same as `Plank::turned` in core/src/planks.rs: old (x, y) → new (h−1−y, x).
 */
function turn(plank, rot) {
  let { w, h, cells } = plank;
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) {
    const next = new Array(w * h).fill(false);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) next[x * h + (h - 1 - y)] = cells[y * w + x];
    }
    [w, h, cells] = [h, w, next];
  }
  return { w, h, cells };
}

/** The squares [x, y] of a shape, in reading order. */
function squares(s) {
  return s.cells.flatMap((c, i) => (c ? [[i % s.w, Math.floor(i / s.w)]] : []));
}

/**
 * The outline of a plank's squares as an SVG path (100 units per cell),
 * pulled in by `d` all round. The boundary is walked with the wood on the
 * right; each corner moves in along both of its edges' inward normals.
 */
function outline(sq, d) {
  const on = new Set(sq.map(([x, y]) => `${x},${y}`));
  const has = (x, y) => on.has(`${x},${y}`);
  const next = new Map();
  for (const [x, y] of sq) {
    if (!has(x, y - 1)) next.set(`${x},${y}`, [x + 1, y]);
    if (!has(x + 1, y)) next.set(`${x + 1},${y}`, [x + 1, y + 1]);
    if (!has(x, y + 1)) next.set(`${x + 1},${y + 1}`, [x, y + 1]);
    if (!has(x - 1, y)) next.set(`${x},${y + 1}`, [x, y]);
  }
  const start = next.keys().next().value;
  const loop = [start.split(',').map(Number)];
  for (let p = next.get(start); `${p}` !== start; p = next.get(`${p}`)) loop.push(p);
  // Keep the corners only.
  const corners = loop.filter((c, i) => {
    const a = loop[(i + loop.length - 1) % loop.length];
    const b = loop[(i + 1) % loop.length];
    return (c[0] - a[0]) * (b[1] - c[1]) !== (c[1] - a[1]) * (b[0] - c[0]);
  });
  const pts = corners.map((c, i) => {
    const a = corners[(i + corners.length - 1) % corners.length];
    const b = corners[(i + 1) % corners.length];
    const din = [Math.sign(c[0] - a[0]), Math.sign(c[1] - a[1])];
    const dout = [Math.sign(b[0] - c[0]), Math.sign(b[1] - c[1])];
    // The wood is on the right: normal (−dy, dx).
    return [c[0] * 100 + d * (-din[1] - dout[1]), c[1] * 100 + d * (din[0] + dout[0])];
  });
  return `M${pts.map((p) => p.join(' ')).join('L')}Z`;
}

/** A plank drawn in its own box: warm wood, grain along its length, a nail on every square. */
function plankArt(s, k) {
  const sq = squares(s);
  const path = outline(sq, INSET);
  const across = s.w >= s.h;
  // Grain runs along each straight run of squares.
  const grain = [];
  const runs = across ? s.h : s.w;
  const len = across ? s.w : s.h;
  for (let r = 0; r < runs; r++) {
    let from = null;
    for (let i = 0; i <= len; i++) {
      const filled = i < len && s.cells[across ? r * s.w + i : i * s.w + r];
      if (filled && from === null) from = i;
      if (!filled && from !== null) {
        const [a, b] = [from * 100 + 18, i * 100 - 18];
        for (const o of [30, 68]) {
          const c = r * 100 + o;
          const wave = `${a} ${c} C${a + (b - a) / 3} ${c - 6} ${a + (2 * (b - a)) / 3} ${c + 6} ${b} ${c}`;
          grain.push(across ? `M${wave}` : `M${wave.replace(/(-?[\d.]+) (-?[\d.]+)/g, '$2 $1')}`);
        }
        from = null;
      }
    }
  }
  const nails = sq
    .map(([x, y]) => {
      const [cx, cy] = [x * 100 + 50, y * 100 + 50];
      return `<circle cx="${cx}" cy="${cy}" r="9" class="pk-nail"/><circle cx="${cx - 3}" cy="${cy - 3}" r="3" class="pk-nail-shine"/>`;
    })
    .join('');
  return `<path d="${path}" transform="translate(5 7)" class="pk-shadow"/>
    <path d="${path}" fill="${WOODS[k % WOODS.length]}" stroke="${DARK_WOOD}" stroke-width="5" stroke-linejoin="round"/>
    <path d="${grain.join('')}" class="pk-grain"/>
    ${nails}`;
}

/** A hammer whose head strikes at (0, 0); it swings around the end of its handle. */
function hammer() {
  return `<g transform="translate(90 -15)"><g class="pk-hammer">
    <rect x="-92" y="-6" width="98" height="12" rx="6" fill="#a8743f" stroke="${DARK_WOOD}" stroke-width="4"/>
    <rect x="-114" y="-15" width="48" height="30" rx="6" fill="#9097a6" stroke="#383c48" stroke-width="4"/>
  </g></g>`;
}

export class Planks {
  constructor(ctx) {
    this.ctx = ctx;
    this.door = ctx.data ?? JSON.parse(ctx.core.planks_generate(ctx.rng.below(0xffffffff), ctx.level ?? 0));
    this.doorJson = JSON.stringify(this.door);
    this.W = this.door.width;
    this.H = this.door.height;
    this.placed = this.door.planks.map(() => null); // per plank: {rot, anchor}
    this.order = []; // planks in the order they were nailed on
    this.trayRot = this.door.planks.map(() => 0);
    this.selected = null;
    this.history = [];
    this.offGoal = false;
    this.initial = 'p-t0';
  }

  goal() {
    return t('goalPlanks');
  }

  xy(i) {
    return [(i % this.W) * 100, Math.floor(i / this.W) * 100];
  }

  isHole(x, y) {
    return x >= 0 && y >= 0 && x < this.W && y < this.H && this.door.holes[y * this.W + x];
  }

  // ---------- markup ----------

  html() {
    const [w, h] = [this.W * 100, this.H * 100];
    const vb = [-FRAME, -FRAME - ARCH, w + 2 * FRAME, h + 2 * FRAME + ARCH];
    const hits = this.door.holes
      .map((hole, i) => {
        const [x, y] = this.xy(i);
        return hole
          ? `<g class="cell" data-nav="p-c${i}"><rect class="pk-hit" x="${x + 4}" y="${y + 4}" width="92" height="92" rx="12"/></g>`
          : `<rect class="pk-wood" data-cell="${i}" x="${x}" y="${y}" width="100" height="100"/>`;
      })
      .join('');
    return `<div class="planks">
      <svg class="pk-door" viewBox="${vb.join(' ')}" style="aspect-ratio: ${vb[2]} / ${vb[3]}">
        ${this.doorArt()}
        ${this.gapArt()}
        <g class="pk-placed"></g>
        <g class="pk-ghost"></g>
        <g class="pk-fx"></g>
        <g class="pk-hits">${hits}</g>
      </svg>
      <div class="plank-tray" role="list"></div>
    </div>`;
  }

  /** The chapel door: a stone arch, vertical boards, iron straps and a ring. */
  doorArt() {
    const [w, h] = [this.W * 100, this.H * 100];
    const door = `M0 ${h}V0A${w / 2} ${ARCH} 0 0 1 ${w} 0V${h}Z`;
    const F = FRAME;
    const frame = `M${-F} ${h + F}V0A${w / 2 + F} ${ARCH + F} 0 0 1 ${w + F} 0V${h + F}Z`;
    const seams = [];
    for (let x = 50; x < w; x += 50) seams.push(`M${x} ${-ARCH}V${h}`);
    const stones = [];
    for (let y = 40; y < h; y += 90) stones.push(`M${-F} ${y}h${F}` + (y + 45 < h ? `M${w} ${y + 45}h${F}` : ''));
    const strap = (y) =>
      `<rect x="-6" y="${y}" width="${w + 12}" height="22" rx="4" class="pk-strap"/>` +
      [12, w / 2, w - 12].map((x) => `<circle cx="${x}" cy="${y + 11}" r="5" class="pk-rivet"/>`).join('');
    return `<defs><clipPath id="pk-door-clip"><path d="${door}"/></clipPath></defs>
      <path d="${frame}" class="pk-frame"/>
      <path d="${stones.join('')}" class="pk-stone-lines"/>
      <g clip-path="url(#pk-door-clip)">
        <rect x="0" y="${-ARCH}" width="${w}" height="${h + ARCH}" class="pk-boards"/>
        <path d="${seams.join('')}" class="pk-seams"/>
        ${strap(Math.round(h * 0.12))}${strap(Math.round(h * 0.82))}
      </g>
      <path d="${door}" class="pk-door-edge"/>
      <g class="pk-ring" transform="translate(${w - 34} ${h / 2})">
        <circle r="9" fill="#4a4e5c"/><circle cy="22" r="16" fill="none" stroke="#5c6070" stroke-width="6"/>
      </g>`;
  }

  /** The gaps: dark holes with faint lines between their cells and splintered edges. */
  gapArt() {
    const cells = [];
    const lines = [];
    const rim = [];
    // A splintered edge from (x0, y0) to (x1, y1), jagged towards the wood.
    const splinter = (x0, y0, x1, y1, nx, ny, seed) => {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const f = k / 6;
        const jag = k % 6 === 0 ? 0 : ((seed * 7 + k * 13) % 5) * 2.2;
        pts.push(`${x0 + (x1 - x0) * f + nx * jag} ${y0 + (y1 - y0) * f + ny * jag}`);
      }
      return `M${pts.join('L')}`;
    };
    this.door.holes.forEach((hole, i) => {
      if (!hole) return;
      const [x, y] = this.xy(i);
      const [cx, cy] = [x / 100, y / 100];
      cells.push(`<rect x="${x}" y="${y}" width="100" height="100"/>`);
      if (this.isHole(cx + 1, cy)) lines.push(`M${x + 100} ${y + 12}V${y + 88}`);
      if (this.isHole(cx, cy + 1)) lines.push(`M${x + 12} ${y + 100}H${x + 88}`);
      if (!this.isHole(cx, cy - 1)) rim.push(splinter(x, y, x + 100, y, 0, -1, i));
      if (!this.isHole(cx + 1, cy)) rim.push(splinter(x + 100, y, x + 100, y + 100, 1, 0, i + 1));
      if (!this.isHole(cx, cy + 1)) rim.push(splinter(x, y + 100, x + 100, y + 100, 0, 1, i + 2));
      if (!this.isHole(cx - 1, cy)) rim.push(splinter(x, y, x, y + 100, -1, 0, i + 3));
    });
    return `<g class="pk-gaps">${cells.join('')}</g>
      <path d="${lines.join('')}" class="pk-gap-lines"/>
      <path d="${rim.join('')}" class="pk-rim"/>`;
  }

  mount(el) {
    this.el = el;
    this.svg = el.querySelector('.pk-door');
    this.placedG = el.querySelector('.pk-placed');
    this.ghostG = el.querySelector('.pk-ghost');
    this.fxG = el.querySelector('.pk-fx');
    this.trayEl = el.querySelector('.plank-tray');
    // Mouse users see where the picked plank would land.
    this.svg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const c = e.target.closest?.('.cell');
      this.showGhost(c ? Number(c.dataset.nav.slice(3)) : null);
    });
    this.svg.addEventListener('pointerleave', () => this.showGhost(null));
    // Tapping the wood of the door with a plank in hand.
    this.svg.addEventListener('click', (e) => {
      if (e.target.classList?.contains('pk-wood') && this.selected !== null && !this.busy) this.warn(t('noGap'));
    });
    // D-pad users see it on the focused gap. RoomScreen has no focus hook,
    // so watch the focus marker move.
    this.observer = new MutationObserver(() => this.focusGhost());
    this.observer.observe(el.querySelector('.pk-hits'), { attributes: true, attributeFilter: ['class'], subtree: true });
    // Tray planks are drawn at the size of the door's cells.
    this.sizer = new ResizeObserver(() => {
      const w = this.svg.getBoundingClientRect().width;
      if (w) el.querySelector('.planks').style.setProperty('--pc', `${(w * 100) / (this.W * 100 + 2 * FRAME)}px`);
    });
    this.sizer.observe(this.svg);
    this.render();
  }

  destroy() {
    this.dead = true;
    this.observer?.disconnect();
    this.sizer?.disconnect();
  }

  // ---------- state ----------

  /** For each cell, the plank nailed over it, or −1. */
  cover() {
    const map = this.door.holes.map(() => -1);
    this.placed.forEach((p, k) => {
      if (p) for (const c of this.footprint(k, p.rot, p.anchor) || []) map[c] = k;
    });
    return map;
  }

  /** Cells plank `k` turned `rot` covers with its box's top-left on `anchor`, or null if off the door. */
  footprint(k, rot, anchor) {
    const s = turn(this.door.planks[k], rot);
    const [ax, ay] = [anchor % this.W, Math.floor(anchor / this.W)];
    if (ax < 0 || ay < 0 || ax + s.w > this.W || ay + s.h > this.H) return null;
    return squares(s).map(([x, y]) => (ay + y) * this.W + ax + x);
  }

  /**
   * Where to nail plank `k` turned `rot` so that it covers `cell`: each of
   * its squares in turn on that cell, the first that fits. Null if none does.
   */
  anchorFor(cell, k, rot) {
    const s = turn(this.door.planks[k], rot);
    const cover = this.cover();
    const [cx, cy] = [cell % this.W, Math.floor(cell / this.W)];
    for (const [x, y] of squares(s)) {
      const [ax, ay] = [cx - x, cy - y];
      if (ax < 0 || ay < 0 || ax + s.w > this.W || ay + s.h > this.H) continue;
      const cells = this.footprint(k, rot, ay * this.W + ax);
      if (cells.every((c) => this.door.holes[c] && cover[c] < 0)) return ay * this.W + ax;
    }
    return null;
  }

  placedJson() {
    return JSON.stringify(this.order.map((k) => ({ plank: k, ...this.placed[k] })));
  }

  commit() {
    this.history.push({ placed: this.placed.map((p) => p && { ...p }), order: [...this.order], trayRot: [...this.trayRot] });
  }

  nail(k, rot, anchor) {
    this.placed[k] = { rot, anchor };
    this.order = [...this.order.filter((j) => j !== k), k];
    this.selected = null;
  }

  lift(k) {
    const p = this.placed[k];
    if (!p) return;
    this.trayRot[k] = p.rot;
    this.placed[k] = null;
    this.order = this.order.filter((j) => j !== k);
  }

  // ---------- drawing ----------

  render() {
    this.fxG.innerHTML = '';
    this.placedG.innerHTML = this.order
      .map((k) => {
        const { rot, anchor } = this.placed[k];
        const [x, y] = this.xy(anchor);
        return `<g class="pk-plank" data-plank="${k}" transform="translate(${x} ${y})"><g class="pk-land"><g class="pk-art">${plankArt(turn(this.door.planks[k], rot), k)}</g></g></g>`;
      })
      .join('');
    this.trayEl.innerHTML = this.door.planks
      .map((p, k) => {
        if (this.placed[k]) return '';
        const s = turn(p, this.trayRot[k]);
        const sel = this.selected === k;
        return `<button class="piece plank-piece${sel ? ' selected' : ''}" data-nav="p-t${k}" role="listitem" aria-pressed="${sel}" aria-label="${t('plank')} ${k + 1}" style="--w: ${s.w}; --h: ${s.h}">
          <svg viewBox="-6 -6 ${s.w * 100 + 12} ${s.h * 100 + 14}">${plankArt(s, k)}</svg>${sel ? '<span class="pk-turn" aria-hidden="true">↻</span>' : ''}</button>`;
      })
      .join('');
    this.el.querySelector('.planks').classList.toggle('has-plank', this.selected !== null);
    this.ctx.refresh();
    this.focusGhost();
  }

  /** Ghost of the picked plank where it would land if dropped on `cell`. */
  showGhost(cell) {
    const k = this.selected;
    const anchor = cell === null || k === null ? null : this.anchorFor(cell, k, this.trayRot[k]);
    if (anchor === null) {
      this.ghostG.innerHTML = '';
      return;
    }
    const [x, y] = this.xy(anchor);
    this.ghostG.innerHTML = `<g transform="translate(${x} ${y})">${plankArt(turn(this.door.planks[k], this.trayRot[k]), k)}</g>`;
  }

  focusGhost() {
    if (!document.body.classList.contains('kbd')) return;
    const c = this.el.querySelector('.pk-hits .is-focused');
    this.showGhost(c ? Number(c.dataset.nav.slice(3)) : null);
  }

  /** The hammer taps twice on plank `k`: tik, tik. */
  async tap(k) {
    const cells = this.footprint(k, this.placed[k].rot, this.placed[k].anchor);
    const [x, y] = this.xy(cells[Math.floor((cells.length - 1) / 2)]);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x + 50} ${y + 50})`);
    g.innerHTML = hammer();
    this.fxG.replaceChildren(g);
    const plank = this.placedG.querySelector(`[data-plank="${k}"]`);
    plank?.classList.remove('nailed');
    void plank?.getBoundingClientRect();
    plank?.classList.add('nailed');
    await sleep(110);
    audio.play('place');
    await sleep(330);
    audio.play('place');
    setTimeout(() => g.remove(), 200);
  }

  say(text, kind) {
    this.ctx.say(text, kind);
    this.offGoal = text !== this.goal();
  }

  /** Back to the goal line after a message. */
  sayGoal() {
    if (this.offGoal) this.say(this.goal());
  }

  warn(text) {
    this.say(text, 'warn');
    const sel = this.trayEl.querySelector('.selected');
    if (sel) this.ctx.wiggle(sel);
  }

  // ---------- actions ----------

  activate(id) {
    if (this.busy) return;
    if (id.startsWith('p-t')) this.pick(Number(id.slice(3)));
    else if (id.startsWith('p-c')) this.tapCell(Number(id.slice(3)));
  }

  /** Tap on a tray plank: pick it, or turn it if it is already picked. */
  pick(k) {
    if (this.selected === k) {
      this.trayRot[k] = (this.trayRot[k] + 1) % 4;
      audio.play('rotate');
    } else {
      this.selected = k;
      audio.play('select');
    }
    this.sayGoal();
    this.render();
  }

  tapCell(cell) {
    const on = this.cover()[cell];
    if (on >= 0) {
      // Take the plank back; it stays picked, ready to go somewhere else.
      this.commit();
      this.lift(on);
      this.selected = on;
      audio.play('remove');
      this.sayGoal();
      this.render();
      return;
    }
    const k = this.selected;
    if (k === null) {
      this.say(t('pickPlank'));
      this.trayEl.classList.remove('nudge');
      void this.trayEl.offsetWidth;
      this.trayEl.classList.add('nudge');
      return;
    }
    const anchor = this.anchorFor(cell, k, this.trayRot[k]);
    if (anchor === null) {
      this.warn(t('noFit'));
      return;
    }
    this.commit();
    this.nail(k, this.trayRot[k], anchor);
    this.afterNail(k);
  }

  afterNail(k) {
    this.sayGoal();
    this.render();
    this.tap(k);
    const r = JSON.parse(this.ctx.core.planks_check(this.doorJson, this.placedJson()));
    if (r.won) this.finish();
  }

  /** Every gap is shut: the hammer goes over every plank once more. */
  async finish() {
    this.busy = true;
    await this.ctx.busy(async () => {
      await sleep(500);
      for (const k of this.order) {
        if (this.dead) break;
        await this.tap(k);
        await sleep(160);
      }
      this.svg.classList.add('shut');
    });
    // The door is shut even if the child left for the map meanwhile: it still counts.
    this.ctx.solved();
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    const s = this.history.pop();
    if (!s) return false;
    Object.assign(this, s);
    this.selected = null;
    this.sayGoal();
    this.render();
    return true;
  }

  hint() {
    if (this.busy) return false;
    const h = JSON.parse(this.ctx.core.planks_hint(this.doorJson, this.placedJson()));
    if (!h) return false;
    this.commit();
    if (h.type === 'Remove') {
      this.lift(h.plank);
      this.selected = null;
      this.render();
      this.say(t('plankBack'), 'warn');
      this.ctx.pulse(this.trayEl.querySelector(`[data-nav="p-t${h.plank}"]`));
      return true;
    }
    this.nail(h.plank, h.rot, h.anchor);
    this.afterNail(h.plank);
    this.ctx.pulse(this.placedG.querySelector(`[data-plank="${h.plank}"] .pk-art`));
    return true;
  }

  stars(hints) {
    return starsFrom(0, hints);
  }
}
