// Het grote verhaal: the story mode, in books of chapters. Each chapter is
// a list of steps (story pages, a riddle card, a puzzle) read from
// web/levels/saga/book-N.json. Progress is kept per book as mode
// `saga-N`, one "stage" per chapter, so the stage map, stars and
// unlocking work as in the other modes. The book's backdrop, Pim's bag,
// Book 3's suspect board and Book 4's Nachtbok-meter are worked out from
// which chapters (and steps) are done; Book 4 also remembers the bokje's
// name, and story text says it where it has {bokje}.

import { icon } from '../../art.js';
import { t } from '../../i18n.js';
import * as store from '../../storage.js';
import * as audio from '../../audio.js';
import { app, fetchJson, leavePlay, openMenu, showSpinner, stageMap } from '../../shell.js';
import { seedOf } from '../../rng.js';
import { readPages, riddleCard, bagStrip } from './pages.js';
import { suspectStep } from './suspects.js';
import { meterStep } from './meter.js';
import { ENGINES, preload, skinOpts } from './engines.js';
import { cover, rosette, card, BOOK as BOOK1 } from './art.js';
import { BOOK as BOOK2 } from './art2.js';
import { BOOK as BOOK3 } from './art3.js';
import { BOOK as BOOK4 } from './art4.js';

const ID = 'saga';

let index = null;
const books = {}; // book number → book data, for books that have a file

const modeId = (n) => `saga-${n}`;

/** Each book's art: its scenes, map, cover, stops, … (see BOOK in art.js). */
const BOOK_ART = { 1: BOOK1, 2: BOOK2, 3: BOOK3, 4: BOOK4 };
const artOf = (book) => BOOK_ART[book?.book] ?? BOOK1;

async function start() {
  if (!index) {
    showSpinner(t('loading'));
    try {
      index = await fetchJson('levels/saga/index.json');
      const loads = index.books.filter((b) => b.file).map(async (b) => (books[b.book] = await fetchJson(`levels/saga/${b.file}`)));
      await Promise.all([...loads, preload()]);
    } catch (err) {
      console.error(err);
      index = null;
      return app.home();
    }
  }
  showShelf();
}

// ---------- progress ----------

const chapterDone = (n, ci) => store.levelsDone(modeId(n), ci + 1) > 0;
const doneFlags = (book) => book.chapters.map((_, ci) => chapterDone(book.book, ci));
const bookComplete = (book) => !!book?.chapters.length && book.chapters.every((_, ci) => chapterDone(book.book, ci));

/** 'open', 'locked' (the book before isn't finished) or 'soon' (not written yet). */
function bookState(n) {
  if (!books[n]?.chapters.length) return 'soon';
  if (n === 1 || store.settings().unlockAll || bookComplete(books[n - 1])) return 'open';
  return 'locked';
}

/** Items in the bag: the book's own (`bag`) and those of the done chapters (before `upTo`, if given). */
function bagItems(book, upTo = book.chapters.length) {
  return [...(book.bag ?? []), ...book.chapters.slice(0, upTo).flatMap((c, ci) => (chapterDone(book.book, ci) ? c.items ?? [] : []))];
}

/** The suspects turned over by a chapter's steps (before step `upTo`, if given). */
const turnsIn = (c, upTo = c.steps.length) => c.steps.slice(0, upTo).flatMap((s) => s.suspects?.turn ?? []);

/**
 * Suspects turned over on the board: on the map, by the done chapters; in
 * chapter `ci` at step `k`, by everything the story has told before it.
 */
function turnedOver(book, ci = null, k = 0) {
  const ids = book.chapters.flatMap((c, i) => {
    if (ci === null) return chapterDone(book.book, i) ? turnsIn(c) : [];
    return i < ci ? turnsIn(c) : i === ci ? turnsIn(c, k) : [];
  });
  return new Set(ids);
}

/** The Nachtbok-meter's sizes set by a chapter's steps (before step `upTo`, if given). */
const metersIn = (c, upTo = c.steps.length) => c.steps.slice(0, upTo).flatMap((s) => (s.meter?.to ? [s.meter.to] : []));

/**
 * How big the Nachtbok is (Book 4's meter): on the map, after the done
 * chapters; in chapter `ci` at step `k`, after everything the story has told
 * before it. Null for a book without a meter.
 */
function meterAt(book, ci = null, k = 0) {
  if (!book.meter?.length) return null;
  const sizes = book.chapters.flatMap((c, i) => {
    if (ci === null) return chapterDone(book.book, i) ? metersIn(c) : [];
    return i < ci ? metersIn(c) : i === ci ? metersIn(c, k) : [];
  });
  return sizes.at(-1) ?? book.meter[0].id;
}

/** The bokje's name (Book 4): the one the child picked, or the first one offered. Empty for a book without a `name` step. */
function bokjeName(book) {
  const step = book.chapters.flatMap((c) => c.steps).find((s) => s.name)?.name;
  if (!step?.names?.length) return '';
  const id = store.mode(modeId(book.book)).bokje;
  return (step.names.find((n) => n.id === id) ?? step.names[0]).word;
}

/** The id of the bokje's name (its look: Nachtje's moon, Pikkie's bow, Sterre's star), once picked. */
const bokjeLook = (book) => store.mode(modeId(book.book)).bokje ?? '';

/** Does the book use Pim's bag at all? Book 4 doesn't, so it shows no bag. */
const hasBag = (book) => !!(book.bag?.length || book.chapters.some((c) => c.items?.length));

/** Story lines with {bokje} filled in. */
const named = (book, lines) => lines?.map((l) => l.replaceAll('{bokje}', bokjeName(book)));
const namedPages = (book, pages) => pages.map((p) => (p.lines ? { ...p, lines: named(book, p.lines) } : p));

/** What every scene of a book is drawn with besides its name: the meter and the bokje's name. */
const sceneState = (book, meter) => ({ meter, meters: book.meter ?? [], kid: bokjeName(book), look: bokjeLook(book) });

function chapterStars(n, ci) {
  return store.starsFor(modeId(n), ci + 1)[0] || 0;
}

// ---------- the shelf ----------

/** Behind the shelf: the chapel as far as Book 1 has got. */
function shelfScene() {
  const book = books[1];
  return artOf(book).map({ done: book ? doneFlags(book) : [], tall: window.innerHeight > window.innerWidth });
}

function showShelf() {
  leavePlay();
  app.screen = 'shelf';
  // Every book read: each cover gets a rosette, and the shelf says hooray.
  const allDone = index.books.every((b) => bookComplete(books[b.book]));
  const covers = index.books
    .map((b) => {
      const state = bookState(b.book);
      const done = state === 'open' && bookComplete(books[b.book]);
      const stars = books[b.book]?.chapters.reduce((a, _, ci) => a + chapterStars(b.book, ci), 0) ?? 0;
      const note = state === 'soon' ? t('bookSoon') : state === 'locked' ? t('bookLocked', { n: b.book - 1 }) : `${icon('star', 'on')}${stars}`;
      return `<button class="book-card ${state}${done ? ' done' : ''}" data-nav="b${b.book}" aria-label="${t('book', { n: b.book })}: ${b.title}${done ? ` (${t('bookDone')})` : ''}">
        <svg viewBox="0 0 300 400" aria-hidden="true">${cover(b.book, BOOK_ART[b.book]?.cover({ scare: store.settings().scare }))}${done ? rosette() : ''}${state === 'open' ? '' : `<g class="cover-lock" transform="translate(100 120) scale(4.2)">${icon('lock').replace(/<\/?svg[^>]*>/g, '')}</g>`}</svg>
        <span class="book-title">${b.title}</span>
        <span class="book-note">${note}</span>
      </button>`;
    })
    .join('');
  app.el.innerHTML = `
    <section class="map saga-shelf${allDone ? ' all-done' : ''}">
      <svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${shelfScene()}<rect width="1600" height="900" fill="#05081a" opacity=".45"/></svg>
      <div class="map-top">
        <button class="btn" data-nav="home" aria-label="${t('back')}">${icon('prev')}</button>
        <div class="map-caption" role="status">${allDone ? t('allBooksDone') : t('chooseBook')}</div>
        <button class="btn small" data-nav="menu" aria-label="${t('parents')}">${icon('gear')}</button>
      </div>
      <div class="shelf">${covers}</div>
    </section>`;
  const last = index.books.filter((b) => bookState(b.book) === 'open').pop();
  app.input.setScreen(app.el, {
    initial: `b${last?.book ?? 1}`,
    activate: (el) => {
      const id = el.dataset.nav;
      if (id === 'home') app.home();
      else if (id === 'menu') openMenu(showShelf);
      else if (id.startsWith('b')) {
        const n = Number(id.slice(1));
        if (bookState(n) !== 'open') {
          el.classList.remove('wiggle');
          void el.offsetWidth;
          el.classList.add('wiggle');
          return;
        }
        audio.play('select');
        openBook(books[n]);
      }
    },
    back: app.home,
  });
}

// ---------- the book map ----------

function openBook(book) {
  const m = store.mode(modeId(book.book));
  // A finished book whose finale was skipped (Back on the last pages) shows it now.
  if (bookComplete(book) && !m.finaleSeen) return finale(book);
  showMap(book);
}

/** Back to the book's map, or to the shelf if the book is no longer open (after a reset, or unlock-all switched off). */
function reopen(book) {
  if (bookState(book.book) === 'open') showMap(book);
  else showShelf();
}

function showMap(book) {
  const n = book.book;
  const m = store.mode(modeId(n));
  const flags = doneFlags(book);
  // Focus the first chapter still to do.
  const next = flags.indexOf(false);
  m.current = { stage: (next < 0 ? book.chapters.length - 1 : next) + 1, level: 0 };
  const portrait = window.innerHeight > window.innerWidth;
  const art = artOf(book);
  const scare = store.settings().scare;
  stageMap({
    modeId: modeId(n),
    stages: book.chapters.map((c, ci) => ({
      stage: ci + 1,
      count: 1,
      need: 1,
      name: c.title,
      caption: `${ci + 1}. ${c.title}`,
      progress: flags[ci] ? '★'.repeat(chapterStars(n, ci)) : '',
    })),
    scene: art.map({ done: flags, tall: portrait, suspects: book.suspects, turned: turnedOver(book), meter: meterAt(book), scare, look: bokjeLook(book) }),
    // Book 4's Nachtbok-meter stands on the map where a book's goal would.
    goal: art.goal?.({ meters: book.meter, meter: meterAt(book), scare }) ?? '',
    layouts: art.layouts(flags),
    onStage: (s) => {
      audio.play('select');
      playChapter(book, s - 1);
    },
    onBack: showShelf,
    onStory: () => (bookComplete(book) ? finale(book) : intro(book, () => showMap(book))),
    menu: () => openMenu(() => reopen(book)),
  });
  // Pim's bag goes in the top bar, next to the 📖 button.
  if (hasBag(book)) app.el.querySelector('[data-nav="story"]').insertAdjacentHTML('beforebegin', bagStrip(bagItems(book)));
  app.el.querySelector('.map-top').classList.add('saga-bar');
  app.redraw = () => reopen(book);
}

function intro(book, then) {
  readPages(book.intro ?? [], () => {
    const m = store.mode(modeId(book.book));
    m.storySeen = true;
    store.save();
    then();
  }, { art: (name, o) => artOf(book).scene(name, { ...o, hour: 6, done: 0, suspects: book.suspects, turned: new Set(), ...sceneState(book, book.meter?.[0]?.id) }), onBack: () => showMap(book) });
}

function finale(book) {
  const seen = () => {
    store.mode(modeId(book.book)).finaleSeen = true;
    store.save();
  };
  readPages(namedPages(book, book.finale ?? []), () => {
    seen();
    showMap(book);
  }, {
    art: (name, o) => artOf(book).scene(name, { ...o, hour: 12, done: book.chapters.length, suspects: book.suspects, turned: turnedOver(book, book.chapters.length), ...sceneState(book, meterAt(book, book.chapters.length)) }),
    onBack: () => showMap(book),
    // A last page may lead on to another mode (Book 2 → the haunted house).
    onGoto: (mode) => {
      seen();
      app.startMode(mode);
    },
  });
}

// ---------- a chapter ----------

/**
 * Play chapter `ci` of `book`: its steps in order, then back to the map
 * (or on to the book's finale after the last chapter). The chapter counts
 * as done when its last puzzle is won (or, without a puzzle, at the end).
 * Back on a riddle card goes back to the story page before it.
 */
function playChapter(book, ci) {
  const n = book.book;
  const id = modeId(n);
  const ch = book.chapters[ci];
  const steps = ch.steps;
  const lastPuzzle = steps.map((s) => !!s.puzzle).lastIndexOf(true);
  const firstPuzzle = steps.findIndex((s) => s.puzzle);
  const backToMap = () => showMap(book);
  const best = {}; // step → best stars this time, for chapters with several puzzles

  const record = (s) => store.recordWin(id, ci + 1, 0, s);
  const finish = () => {
    if (lastPuzzle < 0) record(3);
    if (ci === book.chapters.length - 1 && !store.mode(id).finaleSeen) finale(book);
    else backToMap();
  };
  /**
   * Show step `k`; `fromEnd` (coming back from the step after it) opens a
   * story step on its last page and a riddle as solved, so Back never loses
   * a solved riddle.
   */
  const run = (k, fromEnd = false) => {
    if (k >= steps.length) return finish();
    const step = steps[k];
    const next = () => run(k + 1);
    // Scenes before the chapter's puzzle show the barricade as it was; after it, with this chapter done.
    const done = ci + (lastPuzzle >= 0 && k > lastPuzzle ? 1 : 0);
    const art = (name, o) => artOf(book).scene(name, { hour: ch.hour ?? 6, done, suspects: book.suspects, turned: turnedOver(book, ci, k), ...sceneState(book, meterAt(book, ci, k)), ...o });
    const scare = store.settings().scare;
    // Back goes to the step before (a puzzle can't be stepped back into: then the map).
    const backStep = k > 0 && !steps[k - 1].puzzle ? () => run(k - 1, true) : backToMap;
    const items = hasBag(book) ? bagItems(book, ci) : null;
    // What every card step has alike: its scene behind it, the chapter's title, the bag and the ways out.
    const card = (sub, o = {}) => ({
      art: art(sub.scene ?? ch.scene ?? '', { scare, backdrop: true, ...o }),
      title: `${ci + 1}. ${ch.title}`,
      items,
      onBack: backStep,
      onHome: backToMap,
      onMenu: () => openMenu(null),
    });
    if (step.story) {
      // The chapter's title stands above the pages that lead up to its puzzle (in a chapter of riddles, its first page).
      const opening = firstPuzzle < 0 ? k === 0 : k < firstPuzzle;
      readPages(namedPages(book, step.story), next, { art, heading: opening ? `${t('chapter', { n: ci + 1 })}: ${ch.title}` : '', onBack: backToMap, start: fromEnd ? step.story.length - 1 : 0 });
    } else if (step.meter) {
      // The Nachtbok shrinks: the scene behind already shows it at its new size.
      meterStep({ ...step.meter, lines: named(book, step.meter.lines) }, { ...card(step.meter, { meter: step.meter.to }), meters: book.meter ?? [], from: meterAt(book, ci, k), scare, onDone: next });
    } else if (step.name) {
      // Naming the bokje: a riddle card where every picture is right; the pick is saved.
      riddleCard({ lines: step.name.lines, answers: step.name.names.map((nm) => ({ picture: nm.picture, word: nm.word, right: true })) }, {
        ...card(step.name),
        seed: seedOf('saga', n, ci, k),
        gain: [],
        pick: true,
        onDone: (i) => {
          store.mode(id).bokje = step.name.names[i]?.id;
          store.save();
          next();
        },
      });
    } else if (step.riddle) {
      const by = step.riddle.by;
      riddleCard(step.riddle, {
        ...card(step.riddle),
        speaker: by ? artOf(book).speaker?.(by, { scare, meter: meterAt(book, ci, k) }) : null,
        seed: seedOf('saga', n, ci, k),
        uses: ch.uses ?? [],
        gain: ch.items ?? [],
        solved: fromEnd,
        onDone: next,
      });
    } else if (step.suspects) {
      suspectStep(step.suspects, { ...card(step.suspects), suspects: book.suspects ?? [], turned: turnedOver(book, ci, k), onDone: next });
    } else if (step.puzzle) {
      const play = () => {
        leavePlay();
        app.current = { mode: id, stage: ci + 1, level: 0 };
        const engine = ENGINES[step.puzzle.engine];
        if (!engine) {
          console.error(`saga: unknown engine ${step.puzzle.engine}`);
          return next();
        }
        // Engines start their screen at once (their files are preloaded), so
        // nothing can be shown in between and a stale screen never appears.
        const screen = engine(step.puzzle, {
          ...skinOpts(step.puzzle.skin, { scare }),
          label: `${ci + 1}. ${ch.title}`,
          goal: step.puzzle.goal,
          text: step.puzzle.text,
          // A puzzle in the middle of a chapter shows no stars: they are the chapter's, after its last puzzle.
          noStars: k !== lastPuzzle,
          onWin: (s) => {
            best[k] = Math.max(best[k] ?? 0, s);
            if (k === lastPuzzle) record(Math.min(...Object.values(best)));
            // Won while leaving for the map (Kaart during the last animation): show the stop as done.
            if (app.play !== screen && app.screen === 'map') showMap(book);
          },
          onNext: next,
          onReplay: play,
          onHome: backToMap,
          onMenu: () => openMenu(null),
        });
        app.play = screen;
      };
      play();
    } else next();
  };
  const m = store.mode(id);
  m.current = { stage: ci + 1, level: 0 };
  store.save();
  // The book's intro comes before its first chapter, the first time.
  if (ci === 0 && !m.storySeen) intro(book, () => run(0));
  else run(0);
}

export default {
  id: ID,
  name: () => t('modes').saga,
  card,
  start,
  /** Stars over all books, for the mode menu. */
  stars: () => [1, 2, 3, 4].reduce((a, n) => a + store.totalStars(modeId(n)), 0),
};
