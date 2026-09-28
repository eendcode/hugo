// Boot, WASM loading (with a fallback for servers that send the wrong MIME
// type), the title screen and the mode menu. Each game mode lives in
// `modes/` and shares the helpers in `shell.js`.

import { DEFS, scene, icon } from './art.js';
import { t } from './i18n.js';
import * as store from './storage.js';
import * as audio from './audio.js';
import { Input } from './input.js';
import { app, applySettings, lanternSpinner, leavePlay, showStory, openMenu } from './shell.js';
import duinkapel from './modes/duinkapel.js';
import dorp from './modes/dorp.js';

/** The game modes, in menu order. */
const MODES = [duinkapel, dorp];

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

async function boot() {
  document.body.insertAdjacentHTML('afterbegin', DEFS);
  store.load();
  applySettings();
  app.el = document.getElementById('screen');
  app.input = new Input();
  app.home = showModes;
  document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
  document.addEventListener('keydown', () => audio.unlock(), { capture: true });
  app.el.innerHTML = `<div class="center-msg">${lanternSpinner()}<p>${t('loading')}</p></div>`;
  try {
    app.core = await loadWasm();
  } catch (err) {
    console.error(err);
    app.el.innerHTML = `<div class="center-msg"><p>${t('wasmError')}</p><button class="btn big" data-nav="reload">${icon('again')}<span>OK</span></button></div>`;
    app.input.setScreen(app.el, { activate: () => location.reload() });
    return;
  }
  showTitle();
}

// Maps have separate portrait and landscape layouts.
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (app.screen === 'map' && app.input.layers.length === 1) app.redraw?.();
  }, 250);
});

// ---------- title ----------

const INTRO_SCENES = ['storm', 'scatter', 'dame', 'pim', 'rules'];

function showTitle() {
  leavePlay();
  const s = store.settings();
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
      if (id === 'play') showModes();
      else if (id === 'story') showStory(INTRO_SCENES, t('storyPages'), showTitle);
      else if (id === 'menu') openMenu(showTitle);
    },
    back: () => {},
  });
}

// ---------- mode menu ----------

function showModes() {
  leavePlay();
  app.screen = 'modes';
  const s = store.settings();
  const cards = MODES.map(
    (m) => `<button class="mode-card" data-nav="m-${m.id}">
      <svg viewBox="0 0 200 150" aria-hidden="true">${m.card()}</svg>
      <span class="mode-name">${m.name()}</span>
      <span class="mode-stars">${icon('star', 'on')}${store.totalStars(m.id)}</span>
    </button>`,
  ).join('');
  app.el.innerHTML = `
    <section class="modes">
      <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${scene('map', { scare: s.scare })}</svg>
      <div class="map-top">
        <button class="btn" data-nav="home" aria-label="${t('back')}">${icon('prev')}</button>
        <div class="map-caption" role="status">${t('chooseGame')}</div>
        <button class="btn small" data-nav="menu" aria-label="${t('parents')}">${icon('gear')}</button>
      </div>
      <div class="mode-grid" style="--count: ${MODES.length}">${cards}</div>
    </section>`;
  const last = store.settings().lastMode;
  app.input.setScreen(app.el, {
    initial: `m-${MODES.some((m) => m.id === last) ? last : MODES[0].id}`,
    activate: (el) => {
      const id = el.dataset.nav;
      if (id === 'home') showTitle();
      else if (id === 'menu') openMenu(showModes);
      else if (id.startsWith('m-')) {
        const mode = MODES.find((m) => `m-${m.id}` === id);
        store.setSetting('lastMode', mode.id);
        audio.play('select');
        mode.start();
      }
    },
    back: showTitle,
  });
}

// `?debug` exposes the app state in the console for testing.
if (new URLSearchParams(location.search).has('debug')) window.duinkapel = app;

boot();
