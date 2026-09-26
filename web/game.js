// Game state for one level: placements, tray orientations, selection,
// unlimited undo, hints. Rules and hints come from the Rust core.
//
// A tray piece is a single tile `{kind, rot}` or a block `{w, h, tiles, rot}`
// covering a w×h rectangle. Placements are stored at their top-left
// ("anchor") cell; blocks cover the rest of their rectangle.

const ORIENTATIONS = { Straight: 2, Curve: 4, TJunction: 4, Cross: 1, DeadEnd: 4, Obstacle: 1 };

export function orientations(piece) {
  return isBlock(piece) ? 4 : ORIENTATIONS[piece.kind] ?? 4;
}

export function isBlock(piece) {
  return piece && piece.w !== undefined;
}

/**
 * The piece turned `rot` quarter turns clockwise, as {w, h, tiles}.
 * Must match `Block::shape` in core/src/model.rs: old (x, y) → new (h-1-y, x).
 */
export function shape(piece, rot) {
  if (!isBlock(piece)) return { w: 1, h: 1, tiles: [{ kind: piece.kind, rot: rot % orientations(piece) }] };
  let { w, h, tiles } = piece;
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) {
    const next = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const t = tiles[y * w + x];
        next[x * h + (h - 1 - y)] = t && { kind: t.kind, rot: (t.rot + 1) % ORIENTATIONS[t.kind] };
      }
    }
    [w, h, tiles] = [h, w, next];
  }
  return { w, h, tiles };
}

export class Game {
  constructor(level, core) {
    this.level = level;
    this.core = core;
    this.levelJson = JSON.stringify(level);
    this.placed = level.cells.map(() => null); // at anchor cells: {piece, rot}
    this.trayRot = level.tray.map((p) => p.rot || 0);
    this.selected = null;
    this.history = [];
    this.hints = 0;
    this.lastCell = null; // anchor of the piece last placed or turned
    this.result = this.check();
  }

  piece(i) {
    return this.level.tray[i];
  }

  isFree(i) {
    return this.level.cells[i].kind === 'Empty';
  }

  isPlaced(piece) {
    return this.placed.some((p) => p && p.piece === piece);
  }

  trayLeft() {
    return this.level.tray.map((_, i) => i).filter((i) => !this.isPlaced(i));
  }

  /** Cells covered by `piece` turned `rot` with its top-left at `anchor`, or null if off the board. */
  footprint(anchor, piece, rot) {
    const { width: W, height: H } = this.level;
    const s = shape(this.piece(piece), rot);
    const ax = anchor % W;
    const ay = Math.floor(anchor / W);
    if (ax + s.w > W || ay + s.h > H) return null;
    const cells = [];
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) cells.push({ cell: (ay + y) * W + ax + x, tile: s.tiles[y * s.w + x] });
    }
    return cells;
  }

  /** For each cell, the placement covering it: {anchor, piece, rot, tile}. */
  cover() {
    const map = this.level.cells.map(() => null);
    this.placed.forEach((p, anchor) => {
      if (!p) return;
      for (const { cell, tile } of this.footprint(anchor, p.piece, p.rot) || []) {
        map[cell] = { anchor, piece: p.piece, rot: p.rot, tile };
      }
    });
    return map;
  }

  /** The tile shown in a cell: fixed, placed, or null. */
  tileAt(i, cover = this.cover()) {
    const c = this.level.cells[i];
    return c.tile || cover[i]?.tile || null;
  }

  /** Can `piece`/`rot` go at `anchor`, ignoring the placement at `ignore`? */
  fits(anchor, piece, rot, ignore = null, cover = this.cover()) {
    const cells = this.footprint(anchor, piece, rot);
    return !!cells && cells.every(({ cell }) => this.isFree(cell) && (!cover[cell] || cover[cell].anchor === ignore));
  }

  /**
   * Where to put `piece`/`rot` so that it covers `cell`: the top-left spot
   * first, then any other spot that fits. Null if nothing fits.
   */
  anchorFor(cell, piece, rot, ignore = null) {
    const W = this.level.width;
    const s = shape(this.piece(piece), rot);
    const cover = this.cover();
    const cx = cell % W;
    const cy = Math.floor(cell / W);
    for (let oy = 0; oy < s.h; oy++) {
      for (let ox = 0; ox < s.w; ox++) {
        const ax = cx - ox;
        const ay = cy - oy;
        if (ax < 0 || ay < 0) continue;
        const anchor = ay * W + ax;
        if (this.fits(anchor, piece, rot, ignore, cover)) return anchor;
      }
    }
    return null;
  }

  snapshot() {
    return { placed: this.placed.map((p) => p && { ...p }), trayRot: [...this.trayRot], lastCell: this.lastCell };
  }

  commit() {
    this.history.push(this.snapshot());
    if (this.history.length > 500) this.history.shift();
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    const s = this.history.pop();
    if (!s) return false;
    this.placed = s.placed;
    this.trayRot = s.trayRot;
    this.lastCell = s.lastCell;
    this.selected = null;
    return true;
  }

  normRot(piece, rot) {
    const n = orientations(this.piece(piece));
    return ((rot % n) + n) % n;
  }

  /** Tap on a tray piece: select it, or turn it if it is already selected. */
  selectTray(piece) {
    if (this.selected === piece && this.level.rotatable) {
      this.trayRot[piece] = this.normRot(piece, this.trayRot[piece] + 1);
      return 'rotate';
    }
    this.selected = piece;
    return 'select';
  }

  /**
   * Put the selected piece down so it covers `cell`. A single tile on
   * another single swaps them. Returns false if it does not fit.
   */
  dropSelected(cell) {
    const piece = this.selected;
    if (piece === null) return false;
    const rot = this.trayRot[piece];
    const occupant = this.cover()[cell];
    let anchor = this.anchorFor(cell, piece, rot);
    let swap = null;
    if (anchor === null && occupant && !isBlock(this.piece(piece)) && !isBlock(this.piece(occupant.piece))) {
      anchor = cell;
      swap = occupant.anchor;
    }
    if (anchor === null) return false;
    this.commit();
    if (swap !== null) this.lift(swap);
    this.set(anchor, piece, rot);
    return true;
  }

  /** Place exactly (used by hints). */
  placeAt(anchor, piece, rot) {
    this.commit();
    const cells = this.footprint(anchor, piece, rot) || [];
    const cover = this.cover();
    for (const { cell } of cells) if (cover[cell]) this.lift(cover[cell].anchor);
    this.set(anchor, piece, rot);
  }

  set(anchor, piece, rot) {
    this.placed[anchor] = { piece, rot: this.level.rotatable ? this.normRot(piece, rot) : this.piece(piece).rot || 0 };
    this.lastCell = anchor;
    this.selected = null;
  }

  lift(anchor) {
    const p = this.placed[anchor];
    if (!p) return;
    this.trayRot[p.piece] = p.rot;
    this.placed[anchor] = null;
    if (this.lastCell === anchor) this.lastCell = null;
  }

  /**
   * Turn the piece covering `cell` a quarter turn (or to `to`). Blocks keep
   * covering the tapped cell and move over if they must. False if it can't turn.
   */
  rotate(cell, to = null) {
    const c = this.cover()[cell];
    if (!c || !this.level.rotatable) return false;
    const rot = this.normRot(c.piece, to ?? c.rot + 1);
    let anchor = c.anchor;
    if (isBlock(this.piece(c.piece)) && !this.fits(anchor, c.piece, rot, c.anchor)) {
      anchor = this.anchorFor(cell, c.piece, rot, c.anchor);
      if (anchor === null) return false;
    }
    this.commit();
    this.placed[c.anchor] = null;
    this.placed[anchor] = { piece: c.piece, rot };
    this.lastCell = anchor;
    return true;
  }

  /** Take the piece covering `cell` back to the tray. */
  remove(cell) {
    const c = this.cover()[cell];
    if (!c) return false;
    this.commit();
    this.lift(c.anchor);
    return true;
  }

  stateJson() {
    return JSON.stringify({ placed: this.placed });
  }

  check() {
    this.result = JSON.parse(this.core.check(this.levelJson, this.stateJson()));
    return this.result;
  }

  /** Ask the core for one step and apply it. Returns the hint or null. */
  hint() {
    const h = JSON.parse(this.core.hint(this.levelJson, this.stateJson()));
    if (!h) return null;
    this.hints += 1;
    if (h.type === 'Place') this.placeAt(h.cell, h.piece, h.rot);
    else if (h.type === 'Rotate') this.rotate(h.cell, h.rot);
    else if (h.type === 'Remove') this.remove(h.cell);
    return h;
  }

  stars() {
    return this.hints === 0 ? 3 : this.hints <= 2 ? 2 : 1;
  }
}
