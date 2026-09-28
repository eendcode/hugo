// Lantaarnlicht: guide the lantern's beam with mirrors to light every
// moonstone. Stages come from web/levels/lantaarn (see `levelpack lantaarn`).

import { packMode, pages } from '../packmode.js';
import { LanternScreen } from './play.js';
import { scene, goal, card } from './art.js';

export default packMode({
  id: 'lantaarn',
  dir: 'lantaarn',
  Screen: LanternScreen,
  intro: pages(scene, ['dark', 'beam']),
  introKey: 'lanternStory',
  finale: pages(scene, ['bright']),
  finaleKey: 'lanternFinale',
  stagesKey: 'lanternStages',
  scene: (o) => scene('map', o),
  goal,
  card,
});
