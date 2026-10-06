// The puzzle engines a chapter can use. Each one starts an existing play
// screen with one frozen level, the chapter's title as its label and a
// story goal line. To add an engine, add an entry to ENGINES: it gets the
// chapter's `puzzle` object and the common screen options
// {label, goal, text?, backdrop?, art?, onWin(stars), onNext(), onReplay(), onHome(), onMenu()}
// and returns the play screen right away. Data an engine needs from a file
// is fetched once in preload(), so starting a puzzle never waits.
//
// A puzzle's `skin` dresses the screen as the chapter's scene: a backdrop
// behind it (one of a book's BOOK.backdrops, in art.js … art4.js) and `art`
// that replaces pieces of its drawing (from skins1.js … skins4.js, one file
// per book). Board screens take it as opts.art, haunted-house puzzles as
// ctx.art (see each screen's or puzzle's header for the names it knows).
// Skins never change how a puzzle plays. A puzzle's `text` (in the book
// file) gives the story's own words for some of a screen's messages, e.g.
// {"dame": "…"} when the patrol is a robber.

import * as store from '../../storage.js';
import { app, fetchJson } from '../../shell.js';
import { PlayScreen } from '../../board.js';
import { RoomScreen } from '../spookhuis/room.js';
import { Bells } from '../spookhuis/bells.js';
import { Candles } from '../spookhuis/candles.js';
import { Pipes } from '../spookhuis/pipes.js';
import { Slide } from '../spookhuis/slide.js';
import { Numbers } from '../spookhuis/choice.js';
import { Pairs } from '../spookhuis/pairs.js';
import { YardScreen } from '../wegvrij/play.js';
import { ProgramScreen } from '../programma/play.js';
import { LanternScreen } from '../lantaarn/play.js';
import { ChessScreen } from '../dorp/play.js';
import { Planks } from './planks.js';
import { Lock } from './lock.js';
import { Spot } from './spot.js';
import { BOOK as BOOK1 } from './art.js';
import { BOOK as BOOK2 } from './art2.js';
import { BOOK as BOOK3 } from './art3.js';
import { BOOK as BOOK4 } from './art4.js';
import { barnYard, mudGoal, duneBeacons, chapelCandles } from './skins1.js';
import { gateLock, corridorRoad, cellarPipes, libraryDrawing, towerArt, gardenChess } from './skins2.js';
import { chapelSpot, woodsRoad, nestLight, kitchenChess, coatButtons } from './skins3.js';
import { skyRoad, mistLight, ribbonKnots, skyChess } from './skins4.js';

const [B1, B2, B3, B4] = [BOOK1, BOOK2, BOOK3, BOOK4].map((b) => b.backdrops);

/**
 * Skin name → {backdrop, art?}. A backdrop is a function of the settings
 * ({scare}); art is an object, or a function of the settings that returns
 * one (Book 4's: in "zacht" the Nachtbok's eyes don't glow).
 */
const SKINS = {
  // Book 1: the night of the bokkenrijders.
  tower: { backdrop: B1.tower },
  barn: { backdrop: B1.barn, art: barnYard },
  mud: { backdrop: B1.dunes, art: mudGoal },
  dunes: { backdrop: B1.dunes, art: duneBeacons },
  chapel: { backdrop: B1.dunes, art: chapelCandles },
  // Book 2: the rooms of Hugo's house.
  gate: { backdrop: B2.gate, art: gateLock },
  corridor: { backdrop: B2.corridor, art: corridorRoad },
  cellar: { backdrop: B2.cellar, art: cellarPipes },
  library: { backdrop: B2.library, art: libraryDrawing },
  towerRoom: { backdrop: B2.towerRoom, art: towerArt },
  garden: { backdrop: B2.garden, art: gardenChess },
  // Book 3: the village, the woods and the big tree by day.
  spot: { backdrop: B3.spot, art: chapelSpot },
  owl: { backdrop: B3.owl },
  kitchen: { backdrop: B3.kitchen, art: kitchenChess },
  woods: { backdrop: B3.forest, art: woodsRoad },
  nest: { backdrop: B3.nest, art: nestLight },
  buttons: { backdrop: B3.cloth, art: coatButtons },
  towerDay: { backdrop: B3.towerDay },
  // Book 4: the night sky of the final.
  sky: { backdrop: B4.skyRoad, art: skyRoad },
  mist: { backdrop: B4.skyMist, art: mistLight },
  ribbons: { backdrop: B4.skyRibbons, art: ribbonKnots },
  skyChess: { backdrop: B4.skyBoard, art: skyChess },
};

/** The screen options for a puzzle's skin: {backdrop, art}, or nothing. `o`: the settings, {scare}. */
export function skinOpts(name, o = {}) {
  const skin = SKINS[name];
  if (!skin) return {};
  return { backdrop: skin.backdrop(o), art: typeof skin.art === 'function' ? skin.art(o) : skin.art };
}

/**
 * A haunted-house puzzle with the story's goal line instead of its own. A
 * puzzle that talks as soon as it starts (the bells say "Luister goed…")
 * waits a moment, so the story goal is seen first.
 */
function storyPuzzle(Puzzle, goal) {
  if (!goal) return Puzzle;
  return class extends Puzzle {
    goal() {
      return goal;
    }

    start() {
      this.startTimer = setTimeout(() => super.start?.(), 1800);
    }

    activate(id, el) {
      clearTimeout(this.startTimer); // the child is already playing
      return super.activate(id, el);
    }

    destroy() {
      clearTimeout(this.startTimer);
      super.destroy?.();
    }
  };
}

/** A puzzle in the haunted house's room frame: {level, seed} pick the puzzle, or `data` is a frozen one (the candles' {size, lit}). */
function room(Puzzle, roomId) {
  return (p, o) => new RoomScreen(app.el, { ...o, Puzzle: storyPuzzle(Puzzle, o.goal), room: roomId, level: p.level ?? 0, seed: p.seed ?? 0, data: p.data });
}

let doors = [];

/** Load what the engines need from files (the doors for Planken). */
export async function preload() {
  try {
    const json = await fetchJson('levels/saga/planks.json');
    doors = Array.isArray(json) ? json : json.levels ?? [];
  } catch (err) {
    console.error('saga: no planks.json', err);
  }
}

function door(i) {
  if (!doors[i]) console.error(`saga: planks.json has no door ${i}`);
  return doors[i] ?? null;
}

export const ENGINES = {
  bells: room(Bells, 'toren'),
  candles: room(Candles, 'hal'),
  planks: (p, o) => room(Planks, 'planks')({ ...p, data: door(p.door ?? 0) }, o),
  carts: (p, o) => new YardScreen(app.el, { ...o, level: p.data }),
  program: (p, o) => new ProgramScreen(app.el, { ...o, level: p.data }),
  lantern: (p, o) => new LanternScreen(app.el, { ...o, level: p.data }),
  lock: (p, o) => room(Lock, 'lock')({ ...p, data: { code: p.code } }, o),
  spot: (p, o) => room(Spot, 'spot')({ ...p, data: { scene: p.scene, grid: p.grid, zones: p.zones } }, o),
  numbers: room(Numbers, 'rekenkamer'),
  pairs: room(Pairs, 'zaal'),
  pipes: room(Pipes, 'kelder'),
  slide: room(Slide, 'bibliotheek'),
  road: (p, o) => new PlayScreen(app.el, { ...o, level: p.data, core: app.core, input: app.input, scare: store.settings().scare }),
  chess: (p, o) => new ChessScreen(app.el, { ...o, level: p.data, strength: 0 }),
};
