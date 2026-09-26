// All player-facing text. Dutch first; English is the fallback.
// Keep lines short: a parent reads them aloud, the child reads along.

const STRINGS = {
  nl: {
    title: 'Het Geheim van de Duinkapel',
    play: 'Spelen',
    story: 'Verhaal',
    parents: 'Voor ouders',
    next: 'Verder',
    back: 'Terug',
    close: 'Sluiten',
    loading: 'Even laden…',
    making: 'Puzzel maken…',

    goal: 'Maak een weg naar de kapel!',
    goalTreasure: 'Haal de {t} en ga naar de kapel!',
    goalTreasures: 'Haal alle schatten en ga naar de kapel!',
    goalOrdered: 'Haal de schatten op volgorde!',
    goalDame: 'Ontwijk de Witte Dame!',
    pickPiece: 'Kies eerst een stuk.',
    locked: 'Dit stuk zit vast.',
    firstTreasure: 'Haal eerst de {t}!',
    orderFirst: 'Eerst de {t}!',
    mist: 'Oei, daar is de spookmist!',
    dame: 'Oei! De Witte Dame! Neem een andere weg.',
    wellDone: 'Goed zo!',
    again: 'Nog een keer?',
    hint: 'Hint',
    undo: 'Oeps',
    remove: 'Terug',
    look: 'Kijk',
    home: 'Kaart',
    harder: 'Moeilijker',
    easier: 'Makkelijker',
    newPuzzle: 'Nieuwe puzzel',

    stage: 'Etappe {n}',
    levelOf: '{n} van {total}',
    freePlay: 'Vrij spel · niveau {d}',
    stageNames: [
      'De eerste weg',
      'Over de duinen',
      'De spookmist',
      'Twee schatten',
      'Op volgorde',
      'De Witte Dame',
      'Diep in de nacht',
      'Het klokje',
    ],
    returned: 'De {t} is terug in de kapel!',

    treasures: ['kandelaar', 'beker', 'klokje'],

    scare: 'Griezelstand',
    scareLevels: { zacht: 'Zacht', spannend: 'Spannend', eng: 'Eng' },
    sound: 'Geluid',
    on: 'Aan',
    off: 'Uit',
    language: 'Taal',
    level: 'Niveau {d} · {s}×{s}',
    seed: 'Code van deze puzzel',
    playSeed: 'Speel code',
    unlockAll: 'Alle etappes open',
    reset: 'Alles opnieuw',
    resetSure: 'Echt alles wissen?',
    noStorage: 'Voortgang wordt niet bewaard op dit apparaat.',
    wasmError: 'Het spel kon niet laden. Herlaad de pagina.',

    storyPages: [
      'Op een stormnacht kwamen de bokkenrijders van Hoofdman Graaiert. Ze vlogen op hun geiten naar de Duinkapel.',
      'Ze stalen de kandelaar, de beker en het klokje, en verstopten alles in de duinen.',
      'Sindsdien zweeft de Witte Dame door de mist. Ze is verdrietig en jaagt iedereen weg.',
      'Pim en zijn dappere geit Barend brengen alles terug! Leg een weg naar de kapel.',
      'Pas op voor de spookmist, en ontwijk de Witte Dame!',
    ],
    finalePages: [
      'Het klokje is terug. Bim, bam! De kapel luidt!',
      'De Witte Dame lacht. De mist trekt op en de zon komt op.',
      'En Graaiert? Die rent hard weg op zijn geit. Goed gedaan, Pim en Barend!',
    ],
  },
  en: {
    title: 'The Secret of the Dune Chapel',
    play: 'Play',
    story: 'Story',
    parents: 'For parents',
    next: 'Next',
    back: 'Back',
    close: 'Close',
    loading: 'Loading…',
    making: 'Making a puzzle…',

    goal: 'Build a road to the chapel!',
    goalTreasure: 'Get the {t} and go to the chapel!',
    goalTreasures: 'Get all the treasures and go to the chapel!',
    goalOrdered: 'Get the treasures in order!',
    goalDame: 'Stay away from the White Lady!',
    pickPiece: 'Pick a piece first.',
    locked: 'This piece is stuck.',
    firstTreasure: 'Get the {t} first!',
    orderFirst: 'The {t} first!',
    mist: 'Oops, that is ghost mist!',
    dame: 'Oops! The White Lady! Take another road.',
    wellDone: 'Well done!',
    again: 'Again?',
    hint: 'Hint',
    undo: 'Undo',
    remove: 'Return',
    look: 'Look',
    home: 'Map',
    harder: 'Harder',
    easier: 'Easier',
    newPuzzle: 'New puzzle',

    stage: 'Stage {n}',
    levelOf: '{n} of {total}',
    freePlay: 'Free play · level {d}',
    stageNames: [
      'The first road',
      'Over the dunes',
      'The ghost mist',
      'Two treasures',
      'In order',
      'The White Lady',
      'Deep in the night',
      'The little bell',
    ],
    returned: 'The {t} is back in the chapel!',

    treasures: ['candlestick', 'cup', 'little bell'],

    scare: 'Scare level',
    scareLevels: { zacht: 'Gentle', spannend: 'Exciting', eng: 'Spooky' },
    sound: 'Sound',
    on: 'On',
    off: 'Off',
    language: 'Language',
    level: 'Level {d} · {s}×{s}',
    seed: 'Code of this puzzle',
    playSeed: 'Play code',
    unlockAll: 'Unlock all stages',
    reset: 'Start over',
    resetSure: 'Really erase everything?',
    noStorage: 'Progress is not saved on this device.',
    wasmError: 'The game could not load. Please reload the page.',

    storyPages: [
      'One stormy night, the goat riders of Chief Graaiert came. They flew on their goats to the Dune Chapel.',
      'They stole the candlestick, the cup and the little bell, and hid them in the dunes.',
      'Since then, the White Lady floats through the mist. She is sad and scares everyone away.',
      'Pim and his brave goat Barend will bring it all back! Build a road to the chapel.',
      'Watch out for the ghost mist, and stay away from the White Lady!',
    ],
    finalePages: [
      'The little bell is back. Ding, dong! The chapel rings!',
      'The White Lady smiles. The mist lifts and the sun comes up.',
      'And Graaiert? He runs away on his goat. Well done, Pim and Barend!',
    ],
  },
};

let lang = 'nl';

export function setLang(l) {
  lang = STRINGS[l] ? l : 'nl';
  document.documentElement.lang = lang;
}

export function getLang() {
  return lang;
}

/** Look up a string (or list) and fill `{name}` placeholders. */
export function t(key, vars = {}) {
  const value = STRINGS[lang][key] ?? STRINGS.nl[key] ?? key;
  if (typeof value !== 'string') return value;
  return value.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

export function treasureName(order) {
  return t('treasures')[order] ?? '';
}
