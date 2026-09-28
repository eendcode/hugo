// Barends programma: plan Barend's walk with arrow cards, then press Start.
// Stages come from web/levels/programma (see `levelpack programma`).

import { packMode, pages } from '../packmode.js';
import { ProgramScreen } from './play.js';
import { scene, goal, card } from './art.js';

export default packMode({
  id: 'programma',
  dir: 'programma',
  Screen: ProgramScreen,
  intro: pages(scene, ['hungry', 'cards']),
  introKey: 'programStory',
  finale: pages(scene, ['home']),
  finaleKey: 'programFinale',
  stagesKey: 'programStages',
  scene: () => scene('map'),
  goal,
  card,
});
