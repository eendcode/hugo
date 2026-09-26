// Boot, WASM loading (with a fallback for servers that send the wrong MIME
// type), level packs, and screen routing: title, story, map, play, menu.

import { DEFS, scene, icon, chapel, treasure } from './art.js';
import { t, setLang, getLang, treasureName } from './i18n.js';
import * as store from './storage.js';
import * as audio from './audio.js';
import { Input } from './input.js';
import { PlayScreen } from './board.js';

/** Levels to finish in a stage before the next one opens. */
const LEVELS_TO_CLEAR = 10;
/** Clearing these stages returns a treasure to the chapel (stage → order). */
const TREASURE_STAGES = { 3: 0, 5: 1, 8: 2 };
const INTRO_SCENES = ['storm', 'scatter', 'dame', 'pim', 'rules'];
const FINALE_SCENES = ['bell', 'dawn', 'runaway'];
/** Board size per difficulty for live puzzles ("Vrij spel"). */
const SIZE_FOR = [4, 5, 5, 5, 6, 5, 6, 6, 6, 6];
const MAX_DIFFICULTY = 9;

const app = {
  core: null,
  index: null,
  packs: {},
  input: null,
  el: null,
  play: null,
  current: null, // {stage, level} or {free: true, difficulty, size, seed}
  freeDifficulty: 0,
};

// ---------- boot ----------

async function loadWasm() {
  const core = await import('./pkg/duinkapel_core.js');
  const url = new URL('./pkg/duinkapel_core_bg.wasm', import.meta.url);
  try {
    // Fast path: compile while downloading. Needs Content-Type: application/wasm.
    if (!WebAssembly.compileStreaming) throw new Error('no streaming compile');
    const module = await WebAssembly.compileStreaming(fetch(url));
    await core.default({ module_or_path: module });
  } catch (err) {
    // Wrong MIME type (or an old browser): fetch the bytes and instantiate them.
    console.warn('WASM streaming failed, using fallback:', err);
    const bytes = await (await fetch(url)).arrayBuffer();
    await core.default({ module_or_path: bytes });
  }
  return core;
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function pack(stage) {
  if (!app.packs[stage]) {
    const info = app.index.stages.find((s) => s.stage === stage);
    app.packs[stage] = await fetchJson(`levels/${info.file}`);
  }
  return app.packs[stage];
}

function applySettings() {
  const s = store.progress().settings;
  document.body.dataset.scare = s.scare;
  setLang(s.lang);
  document.title = t('title');
  audio.setScare(s.scare);
  audio.setMuted(!s.sound);
}

async function boot() {
  document.body.insertAdjacentHTML('afterbegin', DEFS);
  store.load();
  applySettings();
  app.el = document.getElementById('screen');
  app.input = new Input();
  document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
  document.addEventListener('keydown', () => audio.unlock(), { capture: true });
  app.el.innerHTML = `<div class="center-msg">${lanternSpinner()}<p>${t('loading')}</p></div>`;
  try {
    [app.core, app.index] = await Promise.all([loadWasm(), fetchJson('levels/index.json')]);
  } catch (err) {
    console.error(err);
    app.el.innerHTML = `<div class="center-msg"><p>${t('wasmError')}</p><button class="btn big" data-nav="reload">${icon('again')}<span>OK</span></button></div>`;
    app.input.setScreen(app.el, { activate: () => location.reload() });
    return;
  }
  showTitle();
}

function lanternSpinner() {
  return `<svg class="spinner" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="url(#g-lantern)"/><rect x="42" y="38" width="16" height="22" rx="3" fill="#ffd35a" stroke="#6b4a2a" stroke-width="3"/></svg>`;
}

function leavePlay() {
  app.play?.destroy();
  app.play = null;
  app.screen = null;
}

// The map has separate portrait and landscape layouts.
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (app.screen === 'map' && app.input.layers.length === 1) showMap();
  }, 250);
});

// ---------- title ----------

function showTitle() {
  leavePlay();
  const s = store.progress().settings;
  app.el.innerHTML = `
    <section class="title-screen">
      <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${scene('title', { scare: s.scare })}</svg>
      <h1>${t('title')}</h1>
      <div class="title-buttons">
        <button class="btn big primary" data-nav="play">${icon('play')}<span>${t('play')}</span></button>
        <button class="btn big" data-nav="story">${icon('book')}<span>${t('story')}</span></button>
        <button class="btn small" data-nav="menu" aria-label="${t('parents')}">${icon('gear')}</button>
      </div>
    </section>`;
  app.input.setScreen(app.el, {
    initial: 'play',
    activate: (el) => {
      const id = el.dataset.nav;
      if (id === 'play') {
        if (!store.progress().storySeen) showStory(INTRO_SCENES, t('storyPages'), () => {
          store.progress().storySeen = true;
          store.save();
          showMap();
        });
        else showMap();
      } else if (id === 'story') showStory(INTRO_SCENES, t('storyPages'), showTitle);
      else if (id === 'menu') openMenu(showTitle);
    },
    back: () => {},
  });
}

// ---------- story ----------

function showStory(scenes, pages, done, opts = {}) {
  leavePlay();
  let k = 0;
  const render = () => {
    const s = store.progress().settings;
    app.el.innerHTML = `
      <section class="story">
        <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${scene(scenes[k], { scare: s.scare, ...opts })}</svg>
        <div class="caption">
          <p>${pages[k]}</p>
          <div class="caption-buttons">
            ${k > 0 ? `<button class="btn" data-nav="prev" aria-label="${t('back')}">${icon('prev')}</button>` : ''}
            <button class="btn big primary" data-nav="next">${icon('next')}<span>${t('next')}</span></button>
          </div>
        </div>
        <div class="page-dots">${pages.map((_, i) => `<span class="${i === k ? 'on' : ''}"></span>`).join('')}</div>
      </section>`;
    if (scenes[k] === 'bell') audio.play('chapel');
    app.input.setScreen(app.el, {
      initial: 'next',
      activate: (el) => (el.dataset.nav === 'next' ? go(1) : go(-1)),
      back: () => (k > 0 ? go(-1) : done()),
    });
  };
  const go = (d) => {
    k += d;
    if (k >= pages.length) done();
    else {
      k = Math.max(0, k);
      render();
    }
  };
  render();
}

// ---------- map ----------

/** Map layouts: stop positions, the chapel, and the end of the path. */
const MAP_LAYOUTS = {
  landscape: {
    box: [1600, 900],
    stops: [[200, 720], [430, 600], [300, 420], [560, 300], [820, 420], [1000, 620], [1220, 520], [1180, 300]],
    end: [1420, 200],
    chapel: [1320, 60, 2],
  },
  portrait: {
    box: [900, 1600],
    stops: [[200, 1400], [520, 1310], [720, 1130], [400, 1000], [180, 820], [440, 690], [720, 560], [470, 400]],
    end: [640, 250],
    chapel: [560, 60, 2],
  },
};

function unlocked(stage) {
  if (stage === 1 || store.progress().settings.unlockAll) return true;
  return store.levelsDone(stage - 1) >= LEVELS_TO_CLEAR;
}

function cleared(stage) {
  return store.levelsDone(stage) >= LEVELS_TO_CLEAR;
}

function returnedTreasures() {
  return Object.entries(TREASURE_STAGES).filter(([s]) => cleared(Number(s))).map(([, o]) => o);
}

function showMap() {
  leavePlay();
  app.screen = 'map';
  const stages = app.index.stages;
  const layout = MAP_LAYOUTS[window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'];
  const path = [...layout.stops, layout.end].map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const stops = stages
    .map((info, i) => {
      const [x, y] = layout.stops[i];
      const open = unlocked(info.stage);
      const done = store.levelsDone(info.stage);
      const stars = store.starsFor(info.stage).reduce((a, b) => a + (b || 0), 0);
      const tr = TREASURE_STAGES[info.stage];
      return `<g class="stop ${open ? '' : 'locked'} ${cleared(info.stage) ? 'cleared' : ''}" data-nav="s${info.stage}" transform="translate(${x} ${y})">
        <circle class="ring" r="78"/>
        <circle class="disc" r="62"/>
        ${tr !== undefined ? `<g transform="translate(24 -92) scale(.5)">${treasure(tr)}</g>` : ''}
        ${open ? `<text class="num" y="20">${info.stage}</text>` : `<g transform="translate(-26 -26) scale(2.2)" class="lock">${icon('lock').replace(/<\/?svg[^>]*>/g, '')}</g>`}
        ${open ? `<text class="progress" y="100">${done}/${info.count} · ${stars}★</text>` : ''}
      </g>`;
    })
    .join('');
  const s = store.progress().settings;
  app.el.innerHTML = `
    <section class="map">
      <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${scene('map', { scare: s.scare })}</svg>
      <svg class="stops" viewBox="0 0 ${layout.box.join(' ')}" preserveAspectRatio="xMidYMid meet">
        <path class="map-path" d="${path}"/>
        <g transform="translate(${layout.chapel[0]} ${layout.chapel[1]}) scale(${layout.chapel[2]})">${chapel({ lit: returnedTreasures().length > 0, treasures: returnedTreasures() })}</g>
        ${stops}
      </svg>
      <div class="map-top">
        <button class="btn" data-nav="home" aria-label="${t('back')}">${icon('prev')}</button>
        <div class="map-caption" role="status"></div>
        <button class="btn" data-nav="story" aria-label="${t('story')}">${icon('book')}</button>
        <button class="btn small" data-nav="menu" aria-label="${t('parents')}">${icon('gear')}</button>
      </div>
    </section>`;
  const caption = app.el.querySelector('.map-caption');
  const cur = store.progress().current;
  app.input.setScreen(app.el, {
    initial: `s${unlocked(cur.stage) ? cur.stage : 1}`,
    onFocus: (el) => {
      const id = el?.dataset.nav || '';
      if (id.startsWith('s')) {
        const n = Number(id.slice(1));
        caption.textContent = `${t('stage', { n })}: ${t('stageNames')[n - 1] ?? ''}`;
      }
    },
    activate: (el) => {
      const id = el.dataset.nav;
      if (id === 'home') showTitle();
      else if (id === 'story') showStory(INTRO_SCENES, t('storyPages'), showMap);
      else if (id === 'menu') openMenu(showMap);
      else if (id.startsWith('s')) {
        const n = Number(id.slice(1));
        if (unlocked(n)) startStage(n);
        else el.classList.add('wiggle'), setTimeout(() => el.classList.remove('wiggle'), 500);
      }
    },
    back: showTitle,
  });
}

function startStage(stage) {
  const info = app.index.stages.find((s) => s.stage === stage);
  const stars = store.starsFor(stage);
  let level = 0;
  while (level < info.count && stars[level] > 0) level++;
  if (level >= info.count) level = 0;
  playLevel(stage, level);
}

// ---------- play ----------

async function playLevel(stage, index) {
  leavePlay();
  const p = await pack(stage);
  const level = p.levels[index];
  store.progress().current = { stage, level: index };
  store.save();
  app.current = { stage, level: index, data: level };
  const wasCleared = cleared(stage);
  startPlay(level, `${t('stage', { n: stage })} · ${t('levelOf', { n: index + 1, total: p.levels.length })}`, {
    onWin: (stars) => store.recordWin(stage, index, stars),
    onNext: () => {
      const justCleared = !wasCleared && cleared(stage);
      if (justCleared && TREASURE_STAGES[stage] !== undefined) return treasureReturned(stage);
      if (justCleared) return showMap();
      if (index + 1 < p.levels.length) playLevel(stage, index + 1);
      else showMap();
    },
    onReplay: () => playLevel(stage, index),
  });
}

function treasureReturned(stage) {
  const order = TREASURE_STAGES[stage];
  const treasures = returnedTreasures();
  if (order === 2 && !store.progress().finaleSeen) {
    return showStory(FINALE_SCENES, t('finalePages'), () => {
      store.progress().finaleSeen = true;
      store.save();
      showMap();
    });
  }
  showStory(['returned'], [t('returned', { t: treasureName(order) })], showMap, { treasures });
}

function startPlay(level, label, handlers) {
  leavePlay();
  const s = store.progress().settings;
  app.play = new PlayScreen(app.el, {
    level,
    core: app.core,
    input: app.input,
    scare: s.scare,
    label,
    onHome: showMap,
    onMenu: () => openMenu(null),
    ...handlers,
  });
}

// ---------- free play (live generation) ----------

function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

function playFree(difficulty, seed = randomSeed(), size = SIZE_FOR[difficulty]) {
  leavePlay();
  app.freeDifficulty = difficulty;
  // Show a spinner first; generation is synchronous WASM.
  app.el.innerHTML = `<div class="center-msg">${lanternSpinner()}<p>${t('making')}</p></div>`;
  app.input.setScreen(app.el, {});
  requestAnimationFrame(() =>
    setTimeout(() => {
      let level;
      try {
        level = JSON.parse(app.core.generate(seed, difficulty, size));
      } catch (err) {
        console.error(err);
        return playFree(difficulty, randomSeed(), size);
      }
      app.current = { free: true, data: level };
      startPlay(level, t('freePlay', { d: difficulty }), {
        onNext: () => playFree(difficulty, randomSeed(), size),
        onReplay: () => playFree(difficulty, seed, size),
      });
    }, 30),
  );
}

// ---------- adult menu ----------

function openMenu(returnTo) {
  const el = document.createElement('div');
  el.className = 'overlay menu-overlay';
  const render = () => {
    const s = store.progress().settings;
    const cur = app.current?.data;
    const d = cur ? cur.difficulty : app.freeDifficulty;
    const size = cur ? cur.width : SIZE_FOR[d];
    const seg = (group, value, label, on) =>
      `<button class="btn seg ${on ? 'on' : ''}" data-nav="${group}:${value}" aria-pressed="${on}">${label}</button>`;
    el.innerHTML = `<div class="panel menu">
      <h2>${t('parents')}</h2>
      ${store.storageAvailable() ? '' : `<p class="note">${t('noStorage')}</p>`}
      <div class="menu-row"><span>${t('scare')}</span>
        ${['zacht', 'spannend', 'eng'].map((v) => seg('scare', v, t('scareLevels')[v], s.scare === v)).join('')}</div>
      <div class="menu-row"><span>${t('sound')}</span>${seg('sound', 'on', t('on'), s.sound)}${seg('sound', 'off', t('off'), !s.sound)}</div>
      <div class="menu-row"><span>${t('language')}</span>${seg('lang', 'nl', 'Nederlands', getLang() === 'nl')}${seg('lang', 'en', 'English', getLang() === 'en')}</div>
      <div class="menu-row"><span>${t('level', { d, s: size })}</span>
        <button class="btn" data-nav="easier">${t('easier')}</button>
        <button class="btn" data-nav="new">${t('newPuzzle')}</button>
        <button class="btn" data-nav="harder">${t('harder')}</button></div>
      <div class="menu-row"><span>${t('seed')}</span>
        <input class="seed-input" data-nav="seed" type="number" inputmode="numeric" min="0" max="4294967295" value="${cur?.seed ?? ''}">
        <button class="btn" data-nav="playseed">${t('playSeed')}</button></div>
      <div class="menu-row"><span></span>${seg('unlock', 'all', t('unlockAll'), s.unlockAll)}
        <button class="btn" data-nav="reset">${t('reset')}</button></div>
      <div class="menu-row end"><button class="btn big primary" data-nav="close">${t('close')}</button></div>
    </div>`;
    app.input.refresh();
  };
  let resetArmed = false;
  const close = () => {
    app.input.popLayer();
    el.remove();
    if (returnTo) returnTo();
  };
  const startFree = (d) => {
    app.input.popLayer();
    el.remove();
    playFree(Math.max(0, Math.min(MAX_DIFFICULTY, d)));
  };
  app.el.appendChild(el);
  render();
  app.input.pushLayer(el, {
    initial: 'close',
    back: close,
    activate: (b) => {
      const id = b.dataset.nav;
      const cur = app.current?.data;
      const d = cur ? cur.difficulty : app.freeDifficulty;
      const [group, value] = id.split(':');
      if (group === 'scare' || group === 'lang') {
        store.setSetting(group, value);
        applySettings();
      } else if (group === 'sound') {
        store.setSetting('sound', value === 'on');
        applySettings();
        if (value === 'on') audio.play('select');
      } else if (group === 'unlock') {
        store.setSetting('unlockAll', !store.progress().settings.unlockAll);
      } else if (id === 'easier') return startFree(d - 1);
      else if (id === 'harder') return startFree(d + 1);
      else if (id === 'new') return startFree(d);
      else if (id === 'playseed') {
        const seed = Number(el.querySelector('.seed-input').value);
        if (Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff) {
          app.input.popLayer();
          el.remove();
          return playFree(d, seed, cur ? cur.width : SIZE_FOR[d]);
        }
      } else if (id === 'reset') {
        if (!resetArmed) {
          resetArmed = true;
          b.textContent = t('resetSure');
          return;
        }
        store.reset();
        return close();
      } else if (id === 'close') return close();
      render();
    },
  });
}

// `?debug` exposes the app state in the console for testing.
if (new URLSearchParams(location.search).has('debug')) window.duinkapel = app;

boot();
