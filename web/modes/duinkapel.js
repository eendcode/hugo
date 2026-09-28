// De Duinkapel: the road-building game. Stage map, level packs, treasures
// and the finale, plus live puzzles from the adult menu.

import { chapel, treasure, scene } from '../art.js';
import { t, treasureName } from '../i18n.js';
import * as store from '../storage.js';
import { PlayScreen } from '../board.js';
import { app, fetchJson, leavePlay, showStory, storyOnce, openMenu, stageMap, cleared, firstOpenLevel, showSpinner } from '../shell.js';

const ID = 'duinkapel';
/** Clearing these stages returns a treasure to the chapel (stage → order). */
const TREASURE_STAGES = { 3: 0, 5: 1, 8: 2 };
const INTRO_SCENES = ['storm', 'scatter', 'dame', 'pim', 'rules'];
const FINALE_SCENES = ['bell', 'dawn', 'runaway'];
/** Board size per difficulty for live puzzles ("Vrij spel"). */
const SIZE_FOR = [4, 5, 5, 5, 6, 5, 6, 6, 6, 6];
const MAX_DIFFICULTY = 9;

/** Map layouts: stop positions, the chapel (centre, scale), and the end of the path. */
const MAP_LAYOUTS = {
  landscape: {
    box: [1600, 900],
    stops: [[200, 720], [430, 600], [300, 420], [560, 300], [820, 420], [1000, 620], [1220, 520], [1180, 300]],
    end: [1420, 200],
    goal: [1420, 160, 2],
  },
  portrait: {
    box: [900, 1600],
    stops: [[200, 1400], [520, 1310], [720, 1130], [400, 1000], [180, 820], [440, 690], [720, 560], [470, 400]],
    end: [640, 250],
    goal: [660, 160, 2],
  },
};

let index = null;
const packs = {};
let freeDifficulty = 0;

async function pack(stage) {
  if (!packs[stage]) {
    const info = index.stages.find((s) => s.stage === stage);
    packs[stage] = await fetchJson(`levels/${info.file}`);
  }
  return packs[stage];
}

function returnedTreasures() {
  return Object.entries(TREASURE_STAGES).filter(([s]) => cleared(ID, Number(s))).map(([, o]) => o);
}

async function start() {
  if (!index) {
    showSpinner(t('loading'));
    index = await fetchJson('levels/index.json');
  }
  storyOnce(ID, INTRO_SCENES, t('storyPages'), showMap);
}

function showMap() {
  const s = store.settings();
  stageMap({
    modeId: ID,
    stages: index.stages.map((info) => ({
      stage: info.stage,
      count: info.count,
      name: t('stageNames')[info.stage - 1] ?? '',
      badge: TREASURE_STAGES[info.stage] !== undefined ? treasure(TREASURE_STAGES[info.stage]) : '',
    })),
    layouts: MAP_LAYOUTS,
    scene: scene('map', { scare: s.scare }),
    goal: chapel({ lit: returnedTreasures().length > 0, treasures: returnedTreasures() }),
    onStage: startStage,
    onBack: app.home,
    onStory: () => showStory(INTRO_SCENES, t('storyPages'), showMap),
    menu: () => openMenu(showMap, menuExtra()),
  });
}

function startStage(stage) {
  const info = index.stages.find((s) => s.stage === stage);
  playLevel(stage, firstOpenLevel(ID, stage, info.count));
}

async function playLevel(stage, level) {
  leavePlay();
  const p = await pack(stage);
  const data = p.levels[level];
  store.mode(ID).current = { stage, level };
  store.save();
  app.current = { mode: ID, stage, level, data };
  const wasCleared = cleared(ID, stage);
  startPlay(data, `${t('stage', { n: stage })} · ${t('levelOf', { n: level + 1, total: p.levels.length })}`, {
    onWin: (stars) => store.recordWin(ID, stage, level, stars),
    onNext: () => {
      const justCleared = !wasCleared && cleared(ID, stage);
      if (justCleared && TREASURE_STAGES[stage] !== undefined) return treasureReturned(stage);
      if (justCleared) return showMap();
      if (level + 1 < p.levels.length) playLevel(stage, level + 1);
      else showMap();
    },
    onReplay: () => playLevel(stage, level),
  });
}

function treasureReturned(stage) {
  const order = TREASURE_STAGES[stage];
  const m = store.mode(ID);
  if (order === 2 && !m.finaleSeen) {
    return showStory(FINALE_SCENES, t('finalePages'), () => {
      m.finaleSeen = true;
      store.save();
      showMap();
    });
  }
  showStory(['returned'], [t('returned', { t: treasureName(order) })], showMap, { treasures: returnedTreasures() });
}

function startPlay(level, label, handlers) {
  leavePlay();
  app.play = new PlayScreen(app.el, {
    level,
    core: app.core,
    input: app.input,
    scare: store.settings().scare,
    label,
    onHome: showMap,
    onMenu: () => openMenu(null, menuExtra()),
    ...handlers,
  });
}

// ---------- free play (live generation) ----------

function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function playFree(difficulty, seed = randomSeed(), size = SIZE_FOR[difficulty]) {
  freeDifficulty = difficulty;
  // Show a spinner first; generation is synchronous WASM.
  showSpinner();
  requestAnimationFrame(() =>
    setTimeout(() => {
      let level;
      try {
        level = JSON.parse(app.core.generate(seed, difficulty, size));
      } catch (err) {
        console.error(err);
        return playFree(difficulty, randomSeed(), size);
      }
      app.current = { mode: ID, free: true, data: level };
      startPlay(level, t('freePlay', { d: difficulty }), {
        onNext: () => playFree(difficulty, randomSeed(), size),
        onReplay: () => playFree(difficulty, seed, size),
      });
    }, 30),
  );
}

/** Adult-menu rows for the road game: live puzzles and replaying a code. */
function menuExtra() {
  const cur = () => (app.current?.mode === ID ? app.current.data : null);
  const diff = () => cur()?.difficulty ?? freeDifficulty;
  const go = (d, seed, size) => playFree(Math.max(0, Math.min(MAX_DIFFICULTY, d)), seed, size);
  return {
    rows: () => {
      const d = diff();
      const size = cur()?.width ?? SIZE_FOR[d];
      return `<div class="menu-row"><span>${t('level', { d, s: size })}</span>
        <button class="btn" data-nav="easier">${t('easier')}</button>
        <button class="btn" data-nav="new">${t('newPuzzle')}</button>
        <button class="btn" data-nav="harder">${t('harder')}</button></div>
      <div class="menu-row"><span>${t('seed')}</span>
        <input class="seed-input" data-nav="seed" type="number" inputmode="numeric" min="0" max="4294967295" value="${cur()?.seed ?? ''}">
        <button class="btn" data-nav="playseed">${t('playSeed')}</button></div>`;
    },
    activate: (id, _b, menu) => {
      const d = diff();
      if (id === 'easier') go(d - 1);
      else if (id === 'harder') go(d + 1);
      else if (id === 'new') go(d);
      else if (id === 'playseed') {
        const seed = Number(menu.querySelector('.seed-input').value);
        if (!(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff)) return 'stay';
        go(d, seed, cur()?.width ?? SIZE_FOR[d]);
      } else return undefined;
      return 'close';
    },
  };
}

export default {
  id: ID,
  name: () => t('modes').duinkapel,
  card: () => `<g transform="translate(50 12) scale(1.1)">${chapel({ lit: true, treasures: returnedTreasures() })}</g>`,
  start,
  showMap,
};
