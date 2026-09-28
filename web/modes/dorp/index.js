// Verdedig het dorp: chess puzzles and games against Hugo's bokkenrijders.
// Stages come from web/levels/dorp (see `levelpack dorp`).

import { t } from '../../i18n.js';
import * as store from '../../storage.js';
import { app } from '../../shell.js';
import { packMode, pages } from '../packmode.js';
import { ChessScreen } from './play.js';
import { scene, goal, card } from './art.js';

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

export default packMode({
  id: 'dorp',
  dir: 'dorp',
  key: 'puzzles',
  Screen: ChessScreen,
  intro: pages(scene, ['raid', 'square', 'help']),
  introKey: 'dorpStory',
  finale: pages(scene, ['feast']),
  finaleKey: 'dorpFinale',
  stagesKey: 'dorpStages',
  scene: (o) => scene('map', o),
  goal,
  card,
  screenOpts: () => ({ strength: store.settings().chessLevel }),
  menuExtra,
});
