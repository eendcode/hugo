// A game mode built on level packs in web/levels/<dir>/: an intro story,
// a stage map, levels played one after another, and a finale when the last
// stage is cleared. The village, Barend's program, lantern light and the
// cart yard all work this way; only their play screens differ.

import { t } from '../i18n.js';
import * as store from '../storage.js';
import { app, fetchJson, leavePlay, showStory, storyOnce, openMenu, stageMap, cleared, firstOpenLevel, showSpinner } from '../shell.js';

/**
 * opts:
 *   id, dir                  mode id and level folder
 *   Screen                   play screen class: new Screen(root, {level, label, onWin, onNext, onReplay, onHome, onMenu, ...screenOpts()})
 *   key = 'levels'           the list in each stage file
 *   intro, finale            [sceneFn], with their caption keys introKey / finaleKey
 *   stagesKey                i18n key of the stage names
 *   scene(opts), goal(), card()
 *   screenOpts()             extra options for the play screen (optional)
 *   menuExtra()              extra adult-menu rows (optional)
 */
export function packMode(opts) {
  const { id, dir } = opts;
  const key = opts.key ?? 'levels';
  let index = null;
  const packs = {};

  const info = (stage) => index.stages.find((s) => s.stage === stage);

  async function pack(stage) {
    if (!packs[stage]) packs[stage] = await fetchJson(`levels/${dir}/${info(stage).file}`);
    return packs[stage];
  }

  async function start() {
    if (!index) {
      showSpinner(t('loading'));
      index = await fetchJson(`levels/${dir}/index.json`);
    }
    storyOnce(id, opts.intro, t(opts.introKey), showMap);
  }

  function showMap() {
    stageMap({
      modeId: id,
      stages: index.stages.map((s) => ({ stage: s.stage, count: s.count, need: s.need, name: t(opts.stagesKey)[s.stage - 1] ?? '' })),
      scene: opts.scene({ scare: store.settings().scare }),
      goal: opts.goal(),
      onStage: (n) => playLevel(n, firstOpenLevel(id, n, info(n).count)),
      onBack: app.home,
      onStory: () => showStory(opts.intro, t(opts.introKey), showMap),
      menu: () => openMenu(showMap, opts.menuExtra?.()),
    });
  }

  async function playLevel(stage, level) {
    leavePlay();
    const p = await pack(stage);
    const data = p[key][level];
    const m = store.mode(id);
    m.current = { stage, level };
    store.save();
    app.current = { mode: id, stage, level, data };
    const last = index.stages[index.stages.length - 1].stage;
    const wasCleared = cleared(id, stage, info(stage).need);
    app.play = new opts.Screen(app.el, {
      level: data,
      label: `${t('stage', { n: stage })} · ${t('levelOf', { n: level + 1, total: p[key].length })}`,
      onWin: (stars) => store.recordWin(id, stage, level, stars),
      onNext: () => {
        const justCleared = !wasCleared && cleared(id, stage, info(stage).need);
        if (justCleared && stage === last && !m.finaleSeen && opts.finale) {
          return showStory(opts.finale, t(opts.finaleKey), () => {
            m.finaleSeen = true;
            store.save();
            showMap();
          });
        }
        if (justCleared) return showMap();
        if (level + 1 < p[key].length) playLevel(stage, level + 1);
        else showMap();
      },
      onReplay: () => playLevel(stage, level),
      onHome: showMap,
      onMenu: () => openMenu(null, opts.menuExtra?.()),
      ...(opts.screenOpts?.() ?? {}),
    });
  }

  return { id, name: () => t('modes')[id], card: opts.card, start };
}

/** Scene names → story page functions. */
export const pages = (scene, names) => names.map((n) => (o) => scene(n, o));
