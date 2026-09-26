// Progress and settings in localStorage. Every access is wrapped in
// try/catch: the game must work (without saving) if storage is unavailable.

const KEY = 'duinkapel-v1';

const DEFAULTS = {
  settings: { scare: 'spannend', sound: true, lang: 'nl', unlockAll: false },
  storySeen: false,
  finaleSeen: false,
  // stars[stage] = array of best stars per level (0 = not done yet)
  stars: {},
  // where "Spelen" continues
  current: { stage: 1, level: 0 },
};

let available = true;
let data = structuredCloneSafe(DEFAULTS);

function structuredCloneSafe(v) {
  return JSON.parse(JSON.stringify(v));
}

export function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      data = {
        ...structuredCloneSafe(DEFAULTS),
        ...saved,
        settings: { ...DEFAULTS.settings, ...(saved.settings || {}) },
        current: { ...DEFAULTS.current, ...(saved.current || {}) },
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

export function progress() {
  return data;
}

export function setSetting(name, value) {
  data.settings[name] = value;
  save();
}

export function recordWin(stage, level, stars) {
  const list = data.stars[stage] || (data.stars[stage] = []);
  list[level] = Math.max(list[level] || 0, stars);
  save();
}

export function starsFor(stage) {
  return data.stars[stage] || [];
}

export function levelsDone(stage) {
  return starsFor(stage).filter((s) => s > 0).length;
}

export function reset() {
  const settings = data.settings;
  data = structuredCloneSafe(DEFAULTS);
  data.settings = settings;
  save();
}
