// Verdedig het dorp: chess puzzles and games against Hugo's bokkenrijders.
// Stages come from web/levels/dorp (see `levelpack dorp`).

import { t } from '../i18n.js';
import * as store from '../storage.js';
import { app, fetchJson, leavePlay, showStory, storyOnce, openMenu, stageMap, cleared, firstOpenLevel, showSpinner } from '../shell.js';
import { ChessScreen } from './dorp-play.js';
import { scene, goal, card } from './dorp-art.js';

const ID = 'dorp';
const INTRO = ['raid', 'square', 'help'];
const FINALE_STAGE = 8;

let index = null;
const packs = {};

const scenes = (names) => names.map((n) => (opts) => scene(n, opts));

async function pack(stage) {
  if (!packs[stage]) {
    const info = index.stages.find((s) => s.stage === stage);
    packs[stage] = await fetchJson(`levels/dorp/${info.file}`);
  }
  return packs[stage];
}

async function start() {
  if (!index) {
    showSpinner(t('loading'));
    index = await fetchJson('levels/dorp/index.json');
  }
  storyOnce(ID, scenes(INTRO), t('dorpStory'), showMap);
}

function need(stage) {
  return index.stages.find((s) => s.stage === stage)?.need ?? 1;
}

function showMap() {
  stageMap({
    modeId: ID,
    stages: index.stages.map((info) => ({ stage: info.stage, count: info.count, name: t('dorpStages')[info.stage - 1] ?? '', need: info.need })),
    scene: scene('map', { scare: store.settings().scare }),
    goal: goal(),
    onStage: (n) => playLevel(n, firstOpenLevel(ID, n, index.stages.find((s) => s.stage === n).count)),
    onBack: app.home,
    onStory: () => showStory(scenes(INTRO), t('dorpStory'), showMap),
    menu: () => openMenu(showMap, menuExtra()),
  });
}

async function playLevel(stage, level) {
  leavePlay();
  const p = await pack(stage);
  const puzzle = p.puzzles[level];
  const m = store.mode(ID);
  m.current = { stage, level };
  store.save();
  app.current = { mode: ID, stage, level, data: puzzle };
  const wasCleared = cleared(ID, stage, need(stage));
  app.play = new ChessScreen(app.el, {
    puzzle,
    label: `${t('stage', { n: stage })} · ${t('levelOf', { n: level + 1, total: p.puzzles.length })}`,
    strength: store.settings().chessLevel,
    onWin: (stars) => store.recordWin(ID, stage, level, stars),
    onNext: () => {
      const justCleared = !wasCleared && cleared(ID, stage, need(stage));
      if (justCleared && stage === FINALE_STAGE && !m.finaleSeen) {
        return showStory(scenes(['feast']), t('dorpFinale'), () => {
          m.finaleSeen = true;
          store.save();
          showMap();
        });
      }
      if (justCleared) return showMap();
      if (level + 1 < p.puzzles.length) playLevel(stage, level + 1);
      else showMap();
    },
    onReplay: () => playLevel(stage, level),
    onHome: showMap,
    onMenu: () => openMenu(null, menuExtra()),
  });
}

/** Adult-menu row: how well the bokkenrijders play. */
function menuExtra() {
  return {
    rows: (seg) => {
      const level = store.settings().chessLevel;
      return `<div class="menu-row"><span>${t('chessStrength')}</span>
        ${t('chessLevels').map((name, i) => seg('chess', i, name, level === i)).join('')}</div>`;
    },
    activate: (id) => {
      const [group, value] = id.split(':');
      if (group !== 'chess') return undefined;
      store.setSetting('chessLevel', Number(value));
      if (app.play instanceof ChessScreen) app.play.opts.strength = Number(value);
      return undefined;
    },
  };
}

export default {
  id: ID,
  name: () => t('modes').dorp,
  card,
  start,
};
