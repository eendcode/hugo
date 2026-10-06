// The chess play screen for "Verdedig het dorp": board, selecting and
// moving villagers, feedback per puzzle kind, and the engine's replies.
// Rules, hints and the engine come from the Rust core (chess_* functions).

import { icon } from '../../art.js';
import { t, textOr } from '../../i18n.js';
import * as audio from '../../audio.js';
import { app, sleep, winOverlay } from '../../shell.js';
import { piece, tree } from './art.js';

const MOVE_MS = 330;
const GAMES = new Set(['PawnRace', 'Endgame', 'Battle']);

const isWhite = (ch) => /[KQRBNP]/.test(ch);
const isBlack = (ch) => /[kqrbnp]/.test(ch);

/** The board's art; a story skin (opts.art) can replace any of these. */
const ART = {
  piece,
  tree,
  /** One square; `start` is what stood there at the start of the puzzle. */
  square: (dark, start) => `<rect class="${dark ? 'dark' : 'light'}" width="100" height="100"/>`,
  /** Drawn on a square whose robber has been taken (none by default). */
  taken: null,
};

/**
 * Which piece stands where, as its place among the same pieces at the start
 * (reading order): the second white rook is ('R', 1) wherever it goes. A
 * skin's piece(letter, k) can tell two rooks apart this way.
 */
function startOrder(pos) {
  const seen = {};
  return pos.rows.join('').split('').map((ch) => (ch === '.' || ch === '#' ? null : (seen[ch] = (seen[ch] ?? -1) + 1)));
}

export class ChessScreen {
  /**
   * opts: level (the puzzle), label, strength (0–3), onWin(stars), onNext(), onReplay(), onHome(), onMenu(),
   * and optionally, when the story mode hosts the screen: goal (replaces the
   * goal line; in a mate in two only until the first move works), text (the
   * story's words for chessRobber, chessPick, chessCantGo, goalMate1,
   * mateEscape, mateEscapeLater, mateTaken (a wrong move in a mate puzzle
   * whose answer takes a villager), and in a game check, stalemate and
   * robbersWin), backdrop (a 1600×900 SVG scene behind it) and art (see
   * ART; piece(letter, k) also gets the piece's place k among the same
   * pieces at the start, see startOrder).
   */
  constructor(root, opts) {
    this.root = root;
    this.opts = opts;
    this.art = { ...ART, ...opts.art };
    this.puzzle = opts.level;
    this.kind = this.puzzle.kind;
    this.core = app.core;
    this.input = app.input;
    this.pos = structuredClone(this.puzzle.position);
    this.ids = startOrder(this.pos);
    this.w = this.pos.width;
    this.h = this.pos.height;
    this.mateLeft = this.puzzle.moves;
    this.moveCount = 0;
    this.hints = 0;
    this.history = [];
    this.selected = null;
    this.targets = [];
    this.lastMove = null;
    this.busy = false;
    this.build();
    this.render();
    this.showGoal();
    this.input.setScreen(this.root, {
      initial: `c${this.firstWhite()}`,
      activate: (el) => this.onActivate(el),
      back: () => this.onBack(),
      undo: () => this.undo(),
      onFocus: (el) => this.onFocus(el),
    });
  }

  destroy() {
    this.destroyed = true;
  }

  // ---------- core ----------

  call(fn, ...args) {
    return JSON.parse(this.core[fn](...args));
  }

  json(pos = this.pos) {
    return JSON.stringify(pos);
  }

  at(i, pos = this.pos) {
    return pos.rows[Math.floor(i / this.w)][i % this.w];
  }

  /** A copy of `pos` with `m` played by hand (for robber moves in solo puzzles). */
  moved(pos, m) {
    const rows = pos.rows.map((r) => [...r]);
    const [fx, fy, tx, ty] = [m.from % this.w, Math.floor(m.from / this.w), m.to % this.w, Math.floor(m.to / this.w)];
    rows[ty][tx] = rows[fy][fx];
    rows[fy][fx] = '.';
    return { ...pos, rows: rows.map((r) => r.join('')) };
  }

  firstWhite() {
    for (let i = this.w * this.h - 1; i >= 0; i--) if (isWhite(this.at(i))) return i;
    return 0;
  }

  // ---------- layout ----------

  build() {
    const { w, h } = this;
    const squares = [];
    for (let i = 0; i < w * h; i++) {
      const [x, y] = this.xy(i);
      const dark = (Math.floor(i / w) + (i % w)) % 2 === 1;
      squares.push(`<g class="sq" data-nav="c${i}" transform="translate(${x} ${y})">${this.art.square(dark, this.at(i, this.puzzle.position))}</g>`);
    }
    this.root.innerHTML = `
      <section class="play chess${this.opts.backdrop ? ' skinned' : ''}" style="--n: ${Math.max(w, h)}">
        ${this.opts.backdrop ? `<svg class="scene play-backdrop" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${this.opts.backdrop}</svg>` : ''}
        <header class="play-head">
          <div class="play-label">${this.opts.label}</div>
          <div class="goal" role="status" aria-live="polite"></div>
        </header>
        <div class="board-wrap">
          <svg class="board" viewBox="-8 -8 ${w * 100 + 16} ${h * 100 + 16}" role="grid" aria-label="${t('modes').dorp}">
            <rect x="-8" y="-8" width="${w * 100 + 16}" height="${h * 100 + 16}" rx="14" fill="#5a3c22"/>
            <g class="squares">${squares.join('')}</g>
            <g class="taken-marks"></g>
            <g class="marks"></g>
            <g class="pieces"></g>
            <g class="dots"></g>
            <g class="fx"></g>
            <rect class="ring" x="-2" y="-2" width="104" height="104" rx="10" visibility="hidden"/>
          </svg>
        </div>
        <aside class="side">
          ${this.kind === 'Capture' ? `<div class="counter" aria-live="polite"></div>` : ''}
          <div class="buttons">
            ${this.button('undo', 'undo', t('undo'))}
            ${this.button('hint', 'hint', t('hint'))}
            ${this.button('home', 'home', t('home'))}
            ${this.button('menu', 'gear', '', 'small')}
          </div>
        </aside>
      </section>`;
    // Kept, so a move that plays out after Kaart (see onActivate) only touches the old screen.
    this.playEl = this.root.querySelector('.play');
    this.undoEl = this.root.querySelector('[data-nav="b-undo"]');
    this.svg = this.root.querySelector('.board');
    this.piecesG = this.svg.querySelector('.pieces');
    this.marksG = this.svg.querySelector('.marks');
    this.takenG = this.svg.querySelector('.taken-marks');
    this.dotsG = this.svg.querySelector('.dots');
    this.fx = this.svg.querySelector('.fx');
    this.ring = this.svg.querySelector('.ring');
    this.goalEl = this.root.querySelector('.goal');
    this.counterEl = this.root.querySelector('.counter');
  }

  button(id, iconName, label, cls = '') {
    return `<button class="btn ${cls}" data-nav="b-${id}" aria-label="${label || id}">${icon(iconName)}${label ? `<span>${label}</span>` : ''}</button>`;
  }

  xy(i) {
    return [(i % this.w) * 100, Math.floor(i / this.w) * 100];
  }

  // ---------- rendering ----------

  render() {
    const items = [];
    const taken = [];
    for (let i = 0; i < this.w * this.h; i++) {
      const ch = this.at(i);
      const [x, y] = this.xy(i);
      if (this.art.taken && isBlack(this.at(i, this.puzzle.position)) && !isBlack(ch)) taken.push(`<g transform="translate(${x} ${y})">${this.art.taken()}</g>`);
      if (ch === '.') continue;
      items.push(`<g class="pc" data-sq="${i}" style="transform: translate(${x}px, ${y}px)"><g transform="translate(5 5) scale(.9)">${ch === '#' ? this.art.tree() : this.art.piece(ch, this.ids[i] ?? 0)}</g></g>`);
    }
    this.piecesG.innerHTML = items.join('');
    this.takenG.innerHTML = taken.join('');
    this.renderMarks();
    this.renderButtons();
    if (this.counterEl) this.counterEl.innerHTML = `${icon('hoof')}<span>${this.moveCount}</span><small>/ ${this.puzzle.moves}</small>`;
  }

  renderMarks() {
    const rect = (i, cls) => {
      const [x, y] = this.xy(i);
      return `<rect class="${cls}" x="${x}" y="${y}" width="100" height="100"/>`;
    };
    const marks = [];
    if (this.lastMove) marks.push(rect(this.lastMove.from, 'last'), rect(this.lastMove.to, 'last'));
    if (this.selected !== null) marks.push(rect(this.selected, 'picked'));
    const st = this.status();
    if (st.check) {
      const king = st.position.turn === 'White' ? 'K' : 'k';
      for (let i = 0; i < this.w * this.h; i++) {
        if (this.at(i) === king) {
          const [x, y] = this.xy(i);
          marks.push(`<circle class="check" cx="${x + 50}" cy="${y + 50}" r="48"/>`);
        }
      }
    }
    this.marksG.innerHTML = marks.join('');
    this.dotsG.innerHTML = this.targets
      .map((i) => {
        const [x, y] = this.xy(i);
        return this.at(i) === '.'
          ? `<circle class="dot" cx="${x + 50}" cy="${y + 50}" r="15"/>`
          : `<circle class="dot take" cx="${x + 50}" cy="${y + 50}" r="44"/>`;
      })
      .join('');
    this.playEl.classList.toggle('has-selection', this.selected !== null);
  }

  renderButtons() {
    this.undoEl.classList.toggle('dim', !this.history.length);
  }

  status(pos = this.pos) {
    return this.call('chess_status', this.json(pos));
  }

  say(text, kind = '') {
    this.goalEl.textContent = text;
    this.goalEl.className = `goal ${kind}`;
    if (kind) {
      this.goalEl.classList.remove('bump');
      void this.goalEl.offsetWidth;
      this.goalEl.classList.add('bump');
    }
  }

  showGoal() {
    this.say(this.goalText());
  }

  goalText() {
    // A story's goal line stands until a mate in two is half done.
    if (this.opts.goal && !(this.kind === 'Mate' && this.mateLeft < this.puzzle.moves)) return this.opts.goal;
    switch (this.kind) {
      case 'Capture': {
        const kinds = new Set(this.pos.rows.join('').replace(/[^KQRBNP]/g, ''));
        const name = kinds.size === 1 ? t('pieceNames')[[...kinds][0]] : '';
        return `${name ? `${name}: ` : ''}${t('goalCapture', { n: this.puzzle.moves })}`;
      }
      case 'SafeCapture':
        return t('goalSafe');
      case 'Mate':
        return this.mateLeft === 1 ? textOr(this.opts.text, 'goalMate1') : t('goalMateN', { n: this.mateLeft });
      case 'PawnRace':
        return t('goalRace');
      case 'Endgame':
        return t('goalEndgame');
      default:
        return t('goalBattle');
    }
  }

  onFocus(el) {
    const id = el?.dataset.nav || '';
    if (id.startsWith('c') && document.body.classList.contains('kbd')) {
      const [x, y] = this.xy(Number(id.slice(1)));
      this.ring.setAttribute('x', x - 2);
      this.ring.setAttribute('y', y - 2);
      this.ring.setAttribute('visibility', 'visible');
    } else {
      this.ring.setAttribute('visibility', 'hidden');
    }
  }

  wiggle(i) {
    const el = this.piecesG.querySelector(`[data-sq="${i}"] > g`) || this.svg.querySelector(`[data-nav="c${i}"]`);
    el.classList.remove('wiggle');
    void el.getBoundingClientRect();
    el.classList.add('wiggle');
  }

  pulse(i, cls = 'hint-pulse') {
    const [x, y] = this.xy(i);
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({ x: x + 3, y: y + 3, width: 94, height: 94, rx: 10, class: cls }).forEach(([k, v]) => r.setAttribute(k, v));
    this.fx.appendChild(r);
    setTimeout(() => r.remove(), 2600);
  }

  /** Slide the piece on `from` to `to`; a captured piece fades out. */
  async animate(from, to) {
    this.ids[to] = this.ids[from];
    this.ids[from] = null;
    const el = this.piecesG.querySelector(`[data-sq="${from}"]`);
    const victim = this.piecesG.querySelector(`[data-sq="${to}"]`);
    if (!el) return;
    this.piecesG.appendChild(el);
    const [x, y] = this.xy(to);
    el.style.transform = `translate(${x}px, ${y}px)`;
    victim?.classList.add('taken');
    await sleep(MOVE_MS);
  }

  // ---------- actions ----------

  onActivate(el) {
    const id = el.dataset.nav;
    // Kaart always works, also while a move plays out (a win still counts, see win()).
    if (id === 'b-home') return this.opts.onHome();
    if (this.busy) return;
    audio.unlock();
    if (id.startsWith('c')) this.onSquare(Number(id.slice(1)));
    else if (id === 'b-undo') this.undo();
    else if (id === 'b-hint') this.hint();
    else if (id === 'b-menu') this.opts.onMenu();
  }

  onBack() {
    if (this.busy) return;
    if (this.selected !== null) this.select(null);
    else if (this.history.length) this.undo();
    else this.opts.onHome();
  }

  select(i) {
    this.selected = i;
    this.targets = i === null ? [] : this.call('chess_moves', this.json(), i).map((m) => m.to);
    this.renderMarks();
  }

  onSquare(i) {
    const ch = this.at(i);
    if (this.selected !== null && this.targets.includes(i)) {
      this.move(this.selected, i);
      return;
    }
    if (isWhite(ch)) {
      if (this.selected === i) return this.select(null);
      this.select(i);
      if (!this.targets.length) {
        this.wiggle(i);
        this.say(this.status().check ? t('chessInCheck') : t('chessStuck'), 'warn');
      } else audio.play('select');
      return;
    }
    this.wiggle(i);
    const text = (key) => textOr(this.opts.text, key);
    if (isBlack(ch)) this.say(text('chessRobber'));
    else if (this.selected !== null) this.say(text('chessCantGo'), 'warn');
    else this.say(text('chessPick'));
  }

  snapshot() {
    return { pos: this.pos, ids: [...this.ids], mateLeft: this.mateLeft, moveCount: this.moveCount, lastMove: this.lastMove };
  }

  restore(s) {
    Object.assign(this, s);
    this.select(null);
    this.render();
  }

  async move(from, to) {
    this.busy = true;
    const before = this.snapshot();
    const capture = this.at(to) !== '.';
    const st = this.call('chess_play', this.json(), from, to);
    this.selected = null;
    this.targets = [];
    this.renderMarks();
    await this.animate(from, to);
    audio.play(capture ? 'place' : 'rotate');
    this.pos = st.position;
    this.lastMove = { from, to };
    this.moveCount++;
    this.render();
    try {
      await this.afterMove(before, st, capture, to);
    } finally {
      if (!this.destroyed) this.busy = false;
    }
  }

  async afterMove(before, st, capture, to) {
    const won = st.outcome?.winner === 'White';
    switch (this.kind) {
      case 'Capture':
        this.history.push(before);
        this.renderButtons();
        if (won) return this.win();
        return;
      case 'SafeCapture': {
        if (!capture) {
          this.say(t('safeNeedCapture'), 'warn');
          audio.play('whoosh');
          await sleep(1100);
          return this.restore(before);
        }
        const back = this.call('chess_recapture', this.json(), to);
        if (!back) return this.win();
        this.say(t('safeTakenBack'), 'warn');
        audio.play('whoosh');
        await sleep(450);
        await this.animate(back.from, back.to);
        this.pos = this.moved(this.pos, back);
        this.lastMove = back;
        this.render();
        await sleep(1500);
        if (this.destroyed) return;
        this.restore(before);
        this.say(t('safeTryAgain'));
        return;
      }
      case 'Mate': {
        if (st.outcome?.reason === 'Mate') return this.win();
        const reply = this.call('chess_defend', this.json(), Math.max(1, this.mateLeft - 1));
        if (!reply) {
          this.say(textOr(this.opts.text, 'stalemate'), 'warn');
          audio.play('whoosh');
          await sleep(1600);
          return this.restore(before);
        }
        await sleep(350);
        const took = isWhite(this.at(reply.to));
        await this.reply(reply);
        if (this.mateLeft > 1 && this.core.chess_forces_mate(this.json(), this.mateLeft - 1)) {
          this.history.push(before);
          this.mateLeft--;
          this.renderButtons();
          this.say(this.goalText(), 'good');
          return;
        }
        // A story can say what the child sees when the reply takes a piece (text.mateTaken).
        const why = took && this.opts.text?.mateTaken ? 'mateTaken' : this.mateLeft === 1 ? 'mateEscape' : 'mateEscapeLater';
        this.say(textOr(this.opts.text, why), 'warn');
        audio.play('whoosh');
        await sleep(1700);
        if (this.destroyed) return;
        this.restore(before);
        this.showGoal();
        return;
      }
      default: {
        // A game: the robbers answer.
        this.history.push(before);
        this.renderButtons();
        if (st.outcome) return this.gameOver(st.outcome);
        if (st.check) this.say(textOr(this.opts.text, 'check'));
        await sleep(300);
        const reply = this.call('chess_reply', this.json(), this.opts.strength, (Math.random() * 0xffffffff) >>> 0);
        if (!reply || this.destroyed) return;
        const after = await this.reply(reply);
        if (after.outcome) return this.gameOver(after.outcome);
        if (after.check) this.say(t('chessInCheck'), 'warn');
        else this.showGoal();
      }
    }
  }

  /** The robbers' move `m`, animated. */
  async reply(m) {
    const capture = this.at(m.to) !== '.';
    const st = this.call('chess_play', this.json(), m.from, m.to);
    await this.animate(m.from, m.to);
    audio.play(capture ? 'place' : 'step');
    this.pos = st.position;
    this.lastMove = m;
    this.render();
    return st;
  }

  undo() {
    if (this.busy || !this.history.length) return;
    audio.play('undo');
    this.restore(this.history.pop());
    this.showGoal();
  }

  hint() {
    if (this.busy) return;
    const m = this.call('chess_hint', JSON.stringify(this.puzzle), this.json(), this.mateLeft);
    if (!m) return;
    this.hints++;
    audio.play('hint');
    this.select(m.from);
    this.pulse(m.from);
    this.pulse(m.to);
    this.input.focus(`c${m.to}`);
  }

  stars() {
    let base = 3;
    if (this.kind === 'Capture') {
      const extra = this.moveCount - this.puzzle.moves;
      base = extra <= 0 ? 3 : extra <= 2 ? 2 : 1;
    }
    return Math.max(1, base - this.hints);
  }

  async win() {
    // Left (Kaart) during the winning move: it still counts as won.
    if (this.destroyed) return this.opts.onWin?.(this.stars());
    this.busy = true;
    this.say(t('wellDone'), 'good');
    audio.play('win');
    this.playEl.classList.add('won');
    const stars = this.stars();
    await this.opts.onWin?.(stars);
    await sleep(900);
    if (this.destroyed) return;
    winOverlay(this.root, stars, {
      onNext: this.opts.onNext,
      onReplay: this.opts.onReplay,
      onHome: this.opts.onHome,
      title: this.kind === 'SafeCapture' ? t('safeWin') : t('wellDone'),
    });
  }

  /** A game ended: a win celebrates; otherwise offer undo or a new try. */
  gameOver(outcome) {
    if (outcome.winner === 'White') return this.win();
    if (this.destroyed) return;
    audio.play('whoosh');
    const text = textOr(this.opts.text, outcome.winner ? 'robbersWin' : 'stalemate');
    this.say(text, 'warn');
    const el = document.createElement('div');
    el.className = 'overlay';
    el.innerHTML = `<div class="panel">
        <h2>${text}</h2>
        <div class="row">
          <button class="btn big primary" data-nav="undo">${icon('undo')}<span>${t('undo')}</span></button>
          <button class="btn big" data-nav="again">${icon('again')}<span>${t('again')}</span></button>
        </div>
      </div>`;
    this.root.appendChild(el);
    const close = () => {
      this.input.popLayer();
      el.remove();
    };
    this.input.pushLayer(el, {
      initial: 'undo',
      activate: (b) => {
        close();
        if (b.dataset.nav === 'undo') this.undo();
        else this.opts.onReplay();
      },
      back: () => {
        close();
        this.undo();
      },
    });
  }
}
