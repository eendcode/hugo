// Het spookhuis van Hugo: nine rooms, each with its own kind of puzzle.
// Solving enough puzzles in a room lights its candle; when every candle
// burns, the curse breaks. Puzzles are generated from a fixed seed per
// room and level, so a level is the same every time.

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as store from '../../storage.js';
import * as audio from '../../audio.js';
import { app, leavePlay, showStory, storyOnce, openMenu, cleared } from '../../shell.js';
import { seedOf } from '../../rng.js';
import { RoomScreen } from './room.js';
import { Candles } from './candles.js';
import { Pairs } from './pairs.js';
import { Pipes } from './pipes.js';
import { Pattern, Numbers, Shadows } from './choice.js';
import { Slide } from './slide.js';
import { Mirror } from './mirror.js';
import { Bells } from './bells.js';
import { scene, house, card, candle, bell, cobweb, shape, frame, ROOM_SLOTS, GLASS } from './art.js';

const ID = 'spookhuis';
const INTRO = ['mansion', 'spell', 'stuck', 'enter'];
const FINALE = ['lifted', 'free'];

const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

/** The rooms in the order they open. `need` puzzles light the candle. */
const ROOMS = [
  { id: 'hal', Puzzle: Candles, count: 8, need: 5, art: () => at(10, 0, 0.8, candle(true)) + at(60, 10, 0.7, candle(false)) },
  { id: 'zaal', Puzzle: Pairs, count: 8, need: 5, art: () => at(4, 20, 0.6, frame()) + at(70, 20, 0.6, frame()) + '<text x="34" y="54" class="icon-q">?</text><text x="100" y="54" class="icon-q">?</text>' },
  { id: 'kelder', Puzzle: Pipes, count: 8, need: 5, art: () => '<path d="M10 50H70V10M70 50V90" stroke="#9aa3c8" stroke-width="22" fill="none"/><path d="M10 50H70V10M70 50V90" stroke="#3aa0e0" stroke-width="12" fill="none"/>' },
  { id: 'galerij', Puzzle: Pattern, count: 8, need: 5, art: () => [0, 1, 2].map((k) => at(k * 45, 25, 0.45, shape({ kind: ['circle', 'square', 'triangle'][k], color: GLASS[k] }))).join('') },
  { id: 'rekenkamer', Puzzle: Numbers, count: 10, need: 6, art: () => '<text x="70" y="66" class="icon-num">1 2 3 ?</text>' },
  { id: 'bibliotheek', Puzzle: Slide, count: 8, need: 5, art: () => [0, 1, 2, 3].map((k) => `<rect x="${20 + (k % 2) * 46}" y="${6 + Math.floor(k / 2) * 46}" width="42" height="42" rx="4" fill="${GLASS[k]}" stroke="#1b1330" stroke-width="3"/>`).join('') },
  { id: 'raam', Puzzle: Mirror, count: 8, need: 5, art: () => '<path d="M20 96V40A40 40 0 0 1 100 40V96Z" fill="#1b1330"/><path d="M26 92V42A34 34 0 0 1 60 8V92Z" fill="#3f7fd0"/><path d="M60 8A34 34 0 0 1 94 42V92H60Z" fill="#3f7fd0" opacity=".55"/><path d="M60 8V92" stroke="#c9a13a" stroke-width="3"/>' },
  { id: 'zolder', Puzzle: Shadows, count: 8, need: 5, art: () => at(4, 10, 0.7, shape({ kind: 'star', color: '#f2c23a' })) + at(66, 18, 0.62, shape({ kind: 'star', color: '#1b1330' })) },
  { id: 'toren', Puzzle: Bells, count: 8, need: 5, art: () => at(26, 0, 0.9, bell('#f2c23a')) },
];

function roomIndex(id) {
  return ROOMS.findIndex((r) => r.id === id);
}

function lit(room) {
  return cleared(ID, roomIndex(room.id) + 1, room.need);
}

function litCount() {
  return ROOMS.filter(lit).length;
}

/** The first two rooms are open; after that, one more opens for every candle lit. */
function isOpen(room) {
  const k = roomIndex(room.id);
  return store.settings().unlockAll || k < 2 || litCount() >= k - 1;
}

function start() {
  storyOnce(ID, INTRO.map((n) => (o) => scene(n, o)), t('spookStory'), showHouse);
}

function showHouse() {
  leavePlay();
  app.screen = 'house';
  const slots = ROOMS.map((room, k) => {
    const [x, y, w, h] = ROOM_SLOTS[room.id];
    const open = isOpen(room);
    const on = lit(room);
    const done = store.levelsDone(ID, k + 1);
    const stars = store.starsFor(ID, k + 1).reduce((a, b) => a + (b || 0), 0);
    const s = Math.min(w, h) / 120;
    return `<g class="room-slot ${open ? '' : 'locked'} ${on ? 'is-lit' : ''}" data-nav="r-${room.id}" transform="translate(${x} ${y})">
      <rect class="slot-bg" width="${w}" height="${h}" rx="14"/>
      ${open ? at(w / 2 - 60 * s, 8, s, `<g class="slot-art">${room.art()}</g>`) : ''}
      ${at(w - 44, h - 70, 0.55, candle(on))}
      ${open ? `<text class="slot-progress" x="12" y="${h - 14}">${done}/${room.count} · ${stars}★</text>` : at(w / 2 - 20, h / 2 - 22, 1.8, `<g class="lock">${icon('lock').replace(/<\/?svg[^>]*>/g, '')}</g>`)}
      ${on ? '' : cobweb(Math.min(w, h))}
      <rect class="slot-ring" x="-6" y="-6" width="${w + 12}" height="${h + 12}" rx="18"/>
    </g>`;
  }).join('');
  const s = store.settings();
  app.el.innerHTML = `
    <section class="map house-map">
      <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${scene('map', { scare: s.scare })}</svg>
      <svg class="stops" viewBox="60 -80 880 1090" preserveAspectRatio="xMidYMid meet">
        ${house({ cursed: litCount() < ROOMS.length })}
        ${slots}
      </svg>
      <div class="map-top">
        <button class="btn" data-nav="home" aria-label="${t('back')}">${icon('prev')}</button>
        <div class="map-caption" role="status"></div>
        <button class="btn" data-nav="story" aria-label="${t('story')}">${icon('book')}</button>
        <button class="btn small" data-nav="menu" aria-label="${t('parents')}">${icon('gear')}</button>
      </div>
    </section>`;
  const caption = app.el.querySelector('.map-caption');
  const cur = store.mode(ID).current;
  const first = ROOMS[cur.stage - 1] && isOpen(ROOMS[cur.stage - 1]) ? ROOMS[cur.stage - 1].id : 'hal';
  app.input.setScreen(app.el, {
    initial: `r-${first}`,
    onFocus: (el) => {
      const id = el?.dataset.nav || '';
      if (id.startsWith('r-')) caption.textContent = t('roomNames')[id.slice(2)] ?? '';
    },
    activate: (el) => {
      const id = el.dataset.nav;
      if (id === 'home') app.home();
      else if (id === 'story') showStory(INTRO.map((n) => (o) => scene(n, o)), t('spookStory'), showHouse);
      else if (id === 'menu') openMenu(showHouse);
      else if (id.startsWith('r-')) {
        const room = ROOMS[roomIndex(id.slice(2))];
        if (!isOpen(room)) {
          el.classList.add('wiggle');
          setTimeout(() => el.classList.remove('wiggle'), 500);
          return;
        }
        audio.play('select');
        const stars = store.starsFor(ID, roomIndex(room.id) + 1);
        let level = 0;
        while (level < room.count && stars[level] > 0) level++;
        playRoom(room, level >= room.count ? 0 : level);
      }
    },
    back: () => app.home(),
  });
}

function playRoom(room, level) {
  leavePlay();
  const stage = roomIndex(room.id) + 1;
  const m = store.mode(ID);
  m.current = { stage, level };
  store.save();
  app.current = { mode: ID, stage, level };
  const wasLit = lit(room);
  app.play = new RoomScreen(app.el, {
    Puzzle: room.Puzzle,
    room: room.id,
    level,
    seed: seedOf(ID, room.id, level),
    label: `${t('roomNames')[room.id]} · ${t('levelOf', { n: level + 1, total: room.count })}`,
    onWin: (stars) => store.recordWin(ID, stage, level, stars),
    onNext: () => {
      if (!wasLit && lit(room)) return candleLit(room);
      if (level + 1 < room.count) playRoom(room, level + 1);
      else showHouse();
    },
    onReplay: () => playRoom(room, level),
    onHome: showHouse,
    onMenu: () => openMenu(null),
  });
}

/** A room's candle is lit: a short scene, or the finale for the last one. */
function candleLit(room) {
  const m = store.mode(ID);
  if (litCount() === ROOMS.length && !m.finaleSeen) {
    return showStory(FINALE.map((n) => (o) => scene(n, o)), t('spookFinale'), () => {
      m.finaleSeen = true;
      store.save();
      showHouse();
    });
  }
  showStory([() => `<rect width="1600" height="900" fill="url(#g-night)"/>${at(640, 180, 3.2, candle(true))}`], [t('candleLit', { room: t('roomNames')[room.id].toLowerCase(), left: ROOMS.length - litCount() })], showHouse);
}

export default {
  id: ID,
  name: () => t('modes').spookhuis,
  card,
  start,
};
