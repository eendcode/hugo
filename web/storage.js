// Progress and settings in localStorage. Every access is wrapped in
// try/catch: the game must work (without saving) if storage is unavailable.
//
// Each game mode keeps its own progress under `modes[id]`. Saves from
// before the modes existed hold the road game's progress at the top level;
// `load` moves it to `modes.duinkapel`.

const KEY = 'duinkapel-v1';

const DEFAULTS = {
  settings: { scare: 'spannend', sound: true, lang: 'nl', unlockAll: false, chessLevel: 1 },
  modes: {},
};

const MODE_DEFAULTS = {
  storySeen: false,
  finaleSeen: false,
  // stars[stage] = array of best stars per level (0 = not done yet)
  stars: {},
  // where "Spelen" continues
  current: { stage: 1, level: 0 },
};

let available = true;
let data = clone(DEFAULTS);

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

/** Old saves: the road game's progress sat at the top level. */
function migrate(saved) {
  const modes = { ...(saved.modes || {}) };
  if (!modes.duinkapel && (saved.stars || saved.current || saved.storySeen)) {
    modes.duinkapel = {
      storySeen: !!saved.storySeen,
      finaleSeen: !!saved.finaleSeen,
      stars: saved.stars || {},
      current: saved.current || MODE_DEFAULTS.current,
    };
  }
  return modes;
}

export function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      data = {
        settings: { ...DEFAULTS.settings, ...(saved.settings || {}) },
        modes: migrate(saved),
      };
    }
  } catch {
    available = false;
  }
  return data;
}

export function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    available = true;
  } catch {
    available = false;
  }
}

export function storageAvailable() {
  return available;
}

export function settings() {
  return data.settings;
}

export function setSetting(name, value) {
  data.settings[name] = value;
  save();
}

/** One mode's progress: {storySeen, finaleSeen, stars, current, ...}. */
export function mode(id) {
  if (!data.modes[id]) data.modes[id] = clone(MODE_DEFAULTS);
  const m = data.modes[id];
  m.stars ||= {};
  m.current ||= { ...MODE_DEFAULTS.current };
  return m;
}

export function recordWin(id, stage, level, stars) {
  const all = mode(id).stars;
  const list = all[stage] || (all[stage] = []);
  list[level] = Math.max(list[level] || 0, stars);
  save();
}

export function starsFor(id, stage) {
  return mode(id).stars[stage] || [];
}

export function levelsDone(id, stage) {
  return starsFor(id, stage).filter((s) => s > 0).length;
}

/** All stars earned in a mode. */
export function totalStars(id) {
  return Object.values(mode(id).stars)
    .flat()
    .reduce((a, b) => a + (b || 0), 0);
}

export function reset() {
  data = { ...clone(DEFAULTS), settings: data.settings };
  save();
}
