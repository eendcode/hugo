// Maak de weg vrij: slide the robbers' carts aside so Barend's cart can
// leave the yard. Stages come from web/levels/wegvrij (see `levelpack wegvrij`).

import { packMode, pages } from '../packmode.js';
import { YardScreen } from './play.js';
import { scene, goal, card } from './art.js';

export default packMode({
  id: 'wegvrij',
  dir: 'wegvrij',
  Screen: YardScreen,
  intro: pages(scene, ['parked', 'stuck']),
  introKey: 'yardStory',
  finale: pages(scene, ['free']),
  finaleKey: 'yardFinale',
  stagesKey: 'yardStages',
  scene: () => scene('map'),
  goal,
  card,
});
