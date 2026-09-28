// What every game mode shares: the app state, settings, the spinner, story
// pages, the win overlay and the adult menu. Modes live in `modes/`.

import { scene, icon } from './art.js';
import { t, setLang, getLang } from './i18n.js';
import * as store from './storage.js';
import * as audio from './audio.js';

export const app = {
  core: null, // the WASM module
  input: null,
  el: null, // #screen
  play: null, // the active play screen (has destroy())
  screen: null, // name of the current screen, for resize handling
  current: null, // what is being played, for the adult menu
  home: null, // () => show the mode menu
};

export async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export function applySettings() {
  const s = store.settings();
  document.body.dataset.scare = s.scare;
  setLang(s.lang);
  document.title = t('title');
  audio.setScare(s.scare);
  audio.setMuted(!s.sound);
}

export function lanternSpinner() {
  return `<svg class="spinner" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="url(#g-lantern)"/><rect x="42" y="38" width="16" height="22" rx="3" fill="#ffd35a" stroke="#6b4a2a" stroke-width="3"/></svg>`;
}

export function showSpinner(text = t('making')) {
  leavePlay();
  app.el.innerHTML = `<div class="center-msg">${lanternSpinner()}<p>${text}</p></div>`;
  app.input.setScreen(app.el, {});
}

export function leavePlay() {
  app.play?.destroy();
  app.play = null;
  app.screen = null;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- story ----------

/** Picture pages with a caption each. `scenes` are names for `scene()`, or functions returning SVG. */
export function showStory(scenes, pages, done, opts = {}) {
  leavePlay();
  let k = 0;
  const render = () => {
    const s = store.settings();
    const art = typeof scenes[k] === 'function' ? scenes[k]({ scare: s.scare, ...opts }) : scene(scenes[k], { scare: s.scare, ...opts });
    app.el.innerHTML = `
      <section class="story">
        <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${art}</svg>
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

/** Show a mode's intro story once, then continue. */
export function storyOnce(modeId, scenes, pages, then) {
  const m = store.mode(modeId);
  if (m.storySeen) return then();
  showStory(scenes, pages, () => {
    m.storySeen = true;
    store.save();
    then();
  });
}

// ---------- win overlay ----------

/** "Goed zo!" with stars and Verder / Nog een keer. Back goes home. */
export function winOverlay(root, stars, { onNext, onReplay, onHome, title = t('wellDone') }) {
  const el = document.createElement('div');
  el.className = 'overlay win-overlay';
  el.innerHTML = `<div class="panel">
      <h2>${title}</h2>
      ${stars ? `<div class="stars">${[1, 2, 3].map((n) => icon('star', n <= stars ? 'on' : 'off')).join('')}</div>` : ''}
      <div class="row">
        <button class="btn big primary" data-nav="next">${icon('next')}<span>${t('next')}</span></button>
        ${onReplay ? `<button class="btn big" data-nav="again">${icon('again')}<span>${t('again')}</span></button>` : ''}
      </div>
    </div>`;
  root.appendChild(el);
  const close = () => {
    app.input.popLayer();
    el.remove();
  };
  app.input.pushLayer(el, {
    initial: 'next',
    activate: (b) => {
      close();
      if (b.dataset.nav === 'next') onNext();
      else onReplay();
    },
    back: () => {
      close();
      onHome();
    },
  });
}

// ---------- adult menu ----------

/**
 * The adult menu. `extra` lets the active mode add rows:
 * {rows(): html, activate(id, button) → 'close' | 'stay' | undefined}.
 * 'close' means the mode has already moved on, so the menu just closes.
 */
export function openMenu(returnTo, extra = null) {
  const el = document.createElement('div');
  el.className = 'overlay menu-overlay';
  const seg = (group, value, label, on) =>
    `<button class="btn seg ${on ? 'on' : ''}" data-nav="${group}:${value}" aria-pressed="${on}">${label}</button>`;
  const render = () => {
    const s = store.settings();
    el.innerHTML = `<div class="panel menu">
      <h2>${t('parents')}</h2>
      ${store.storageAvailable() ? '' : `<p class="note">${t('noStorage')}</p>`}
      <div class="menu-row"><span>${t('scare')}</span>
        ${['zacht', 'spannend', 'eng'].map((v) => seg('scare', v, t('scareLevels')[v], s.scare === v)).join('')}</div>
      <div class="menu-row"><span>${t('sound')}</span>${seg('sound', 'on', t('on'), s.sound)}${seg('sound', 'off', t('off'), !s.sound)}</div>
      <div class="menu-row"><span>${t('language')}</span>${seg('lang', 'nl', 'Nederlands', getLang() === 'nl')}${seg('lang', 'en', 'English', getLang() === 'en')}</div>
      ${extra?.rows(seg) ?? ''}
      <div class="menu-row"><span></span>${seg('unlock', 'all', t('unlockAll'), s.unlockAll)}
        <button class="btn" data-nav="reset">${t('reset')}</button></div>
      <div class="menu-row end"><button class="btn big primary" data-nav="close">${t('close')}</button></div>
    </div>`;
    app.input.refresh();
  };
  let resetArmed = false;
  const dismiss = () => {
    app.input.popLayer();
    el.remove();
  };
  const close = () => {
    dismiss();
    if (returnTo) returnTo();
  };
  app.el.appendChild(el);
  render();
  app.input.pushLayer(el, {
    initial: 'close',
    back: close,
    activate: (b) => {
      const id = b.dataset.nav;
      const [group, value] = id.split(':');
      if (group === 'scare' || group === 'lang') {
        store.setSetting(group, value);
        applySettings();
      } else if (group === 'sound') {
        store.setSetting('sound', value === 'on');
        applySettings();
        if (value === 'on') audio.play('select');
      } else if (group === 'unlock') {
        store.setSetting('unlockAll', !store.settings().unlockAll);
      } else if (id === 'reset') {
        if (!resetArmed) {
          resetArmed = true;
          b.textContent = t('resetSure');
          return;
        }
        store.reset();
        return close();
      } else if (id === 'close') return close();
      else if (extra) {
        const r = extra.activate(id, b, el);
        if (r === 'close') return dismiss();
        if (r === 'stay') return;
      }
      render();
    },
  });
}

// ---------- stage map ----------

/** Levels to finish in a stage before the next one opens. */
export const LEVELS_TO_CLEAR = 10;

export function unlocked(modeId, stage, need = LEVELS_TO_CLEAR) {
  if (stage === 1 || store.settings().unlockAll) return true;
  return store.levelsDone(modeId, stage - 1) >= need;
}

export function cleared(modeId, stage, need = LEVELS_TO_CLEAR) {
  return store.levelsDone(modeId, stage) >= need;
}

/** A winding path for `n` stops, ending at the goal (top right / top). */
export function autoLayout(n, portrait) {
  const stops = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1);
    if (portrait) stops.push([i % 2 ? 660 : 240, Math.round(1420 - f * 1000)]);
    else stops.push([Math.round(180 + f * 1080), i % 2 ? 420 : 690 - Math.round(f * 120)]);
  }
  return portrait
    ? { box: [900, 1600], stops, end: [450, 260], goal: [450, 200, 2] }
    : { box: [1600, 900], stops, end: [1420, 240], goal: [1420, 200, 2] };
}

/**
 * A path of stage stops over a backdrop, ending at a goal picture.
 * opts: modeId, stages [{stage, count, name, badge?, need?}], scene (1600×900 SVG),
 *       goal (100×100 SVG), layouts {landscape, portrait} (optional),
 *       onStage(n), onBack(), onStory()?, menu()
 * A stage's `need` (default LEVELS_TO_CLEAR) is how many of its levels open the next.
 */
export function stageMap(opts) {
  leavePlay();
  app.screen = 'map';
  app.redraw = () => stageMap(opts);
  const { modeId, stages } = opts;
  const needOf = (i) => stages[i]?.need ?? LEVELS_TO_CLEAR;
  const isOpen = (n) => {
    const i = stages.findIndex((s) => s.stage === n);
    return i === 0 || unlocked(modeId, n, needOf(i - 1));
  };
  const portrait = window.innerHeight > window.innerWidth;
  const layout = opts.layouts?.[portrait ? 'portrait' : 'landscape'] ?? autoLayout(stages.length, portrait);
  const path = [...layout.stops, layout.end].map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const stops = stages
    .map((info, i) => {
      const [x, y] = layout.stops[i];
      const open = isOpen(info.stage);
      const done = store.levelsDone(modeId, info.stage);
      const stars = store.starsFor(modeId, info.stage).reduce((a, b) => a + (b || 0), 0);
      return `<g class="stop ${open ? '' : 'locked'} ${cleared(modeId, info.stage, needOf(i)) ? 'cleared' : ''}" data-nav="s${info.stage}" transform="translate(${x} ${y})">
        <circle class="ring" r="78"/>
        <circle class="disc" r="62"/>
        ${info.badge ? `<g transform="translate(24 -92) scale(.5)">${info.badge}</g>` : ''}
        ${open ? `<text class="num" y="20">${info.stage}</text>` : `<g transform="translate(-26 -26) scale(2.2)" class="lock">${icon('lock').replace(/<\/?svg[^>]*>/g, '')}</g>`}
        ${open ? `<text class="progress" y="100">${done}/${info.count} · ${stars}★</text>` : ''}
      </g>`;
    })
    .join('');
  const [gx, gy, gs] = layout.goal ?? layout.chapel;
  app.el.innerHTML = `
    <section class="map">
      <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${opts.scene}</svg>
      <svg class="stops" viewBox="0 0 ${layout.box.join(' ')}" preserveAspectRatio="xMidYMid meet">
        <path class="map-path" d="${path}"/>
        <g transform="translate(${gx} ${gy}) scale(${gs})"><g transform="translate(-50 -50)">${opts.goal}</g></g>
        ${stops}
      </svg>
      <div class="map-top">
        <button class="btn" data-nav="home" aria-label="${t('back')}">${icon('prev')}</button>
        <div class="map-caption" role="status"></div>
        ${opts.onStory ? `<button class="btn" data-nav="story" aria-label="${t('story')}">${icon('book')}</button>` : ''}
        <button class="btn small" data-nav="menu" aria-label="${t('parents')}">${icon('gear')}</button>
      </div>
    </section>`;
  const caption = app.el.querySelector('.map-caption');
  const cur = store.mode(modeId).current;
  app.input.setScreen(app.el, {
    initial: `s${stages.some((s) => s.stage === cur.stage) && isOpen(cur.stage) ? cur.stage : stages[0].stage}`,
    onFocus: (el) => {
      const id = el?.dataset.nav || '';
      if (id.startsWith('s')) {
        const n = Number(id.slice(1));
        caption.textContent = `${t('stage', { n })}: ${stages.find((s) => s.stage === n)?.name ?? ''}`;
      }
    },
    activate: (el) => {
      const id = el.dataset.nav;
      if (id === 'home') opts.onBack();
      else if (id === 'story') opts.onStory();
      else if (id === 'menu') opts.menu();
      else if (id.startsWith('s')) {
        const n = Number(id.slice(1));
        if (isOpen(n)) opts.onStage(n);
        else el.classList.add('wiggle'), setTimeout(() => el.classList.remove('wiggle'), 500);
      }
    },
    back: opts.onBack,
  });
}

/** The first level in a stage without stars (or the first one). */
export function firstOpenLevel(modeId, stage, count) {
  const stars = store.starsFor(modeId, stage);
  let level = 0;
  while (level < count && stars[level] > 0) level++;
  return level >= count ? 0 : level;
}
