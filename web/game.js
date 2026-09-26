// Game state for one level: placements, tray orientations, selection,
// unlimited undo, hints. Rules and hints come from the Rust core.

const ORIENTATIONS = { Straight: 2, Curve: 4, TJunction: 4, Cross: 1, DeadEnd: 4, Obstacle: 1 };

export function orientations(kind) {
  return ORIENTATIONS[kind] ?? 4;
}

export class Game {
  constructor(level, core) {
    this.level = level;
    this.core = core;
    this.levelJson = JSON.stringify(level);
    this.placed = level.cells.map(() => null); // {piece, rot}
    this.trayRot = level.tray.map((t) => t.rot || 0);
    this.selected = null;
    this.history = [];
    this.hints = 0;
    this.lastCell = null;
    this.result = this.check();
  }

  get size() {
    return { w: this.level.width, h: this.level.height };
  }

  cell(i) {
    return this.level.cells[i];
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

  /** The tile shown in a cell: fixed, placed, or null. */
  tileAt(i) {
    const c = this.level.cells[i];
    if (c.tile) return c.tile;
    const p = this.placed[i];
    return p ? { kind: this.level.tray[p.piece].kind, rot: p.rot } : null;
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

  normRot(kind, rot) {
    return ((rot % orientations(kind)) + orientations(kind)) % orientations(kind);
  }

  /** Tap on a tray piece: select it, or turn it if it is already selected. */
  selectTray(piece) {
    if (this.selected === piece && this.level.rotatable) {
      const kind = this.level.tray[piece].kind;
      this.trayRot[piece] = this.normRot(kind, this.trayRot[piece] + 1);
      return 'rotate';
    }
    this.selected = piece;
    return 'select';
  }

  place(cell, piece, rot = this.trayRot[piece]) {
    this.commit();
    const old = this.placed[cell];
    if (old) this.trayRot[old.piece] = old.rot;
    const kind = this.level.tray[piece].kind;
    this.placed[cell] = { piece, rot: this.level.rotatable ? this.normRot(kind, rot) : this.level.tray[piece].rot };
    this.lastCell = cell;
    this.selected = null;
  }

  rotate(cell, to = null) {
    const p = this.placed[cell];
    if (!p || !this.level.rotatable) return false;
    this.commit();
    const kind = this.level.tray[p.piece].kind;
    p.rot = this.normRot(kind, to ?? p.rot + 1);
    this.lastCell = cell;
    return true;
  }

  remove(cell) {
    const p = this.placed[cell];
    if (!p) return false;
    this.commit();
    this.trayRot[p.piece] = p.rot;
    this.placed[cell] = null;
    if (this.lastCell === cell) this.lastCell = null;
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
    if (h.type === 'Place') {
      // The piece may currently be selected or turned in the tray; that's fine.
      this.place(h.cell, h.piece, h.rot);
    } else if (h.type === 'Rotate') {
      this.rotate(h.cell, h.rot);
    } else if (h.type === 'Remove') {
      this.remove(h.cell);
    }
    return h;
  }

  stars() {
    return this.hints === 0 ? 3 : this.hints <= 2 ? 2 : 1;
  }
}
