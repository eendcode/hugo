// Unified input: one focus model serves touch/mouse and keyboard/TV remote.
//
// Every focusable thing carries `data-nav="<id>"`. Arrow keys move focus to
// the nearest item in that direction (by on-screen position, so it works
// for any layout). OK/Enter or a tap activates; long-press or
// Backspace/Delete means "remove". The remote's Back button is caught with
// history sentinel entries so it never leaves the page.

const ARROWS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Up: 'up', Down: 'down', Left: 'left', Right: 'right',
};
const ARROW_CODES = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };
const OK_KEYS = new Set(['Enter', ' ', 'Select', 'Accept']);
const OK_CODES = new Set([13, 23, 66]); // Enter, Android DPAD_CENTER, Android ENTER
const BACK_KEYS = new Set(['Escape', 'GoBack', 'BrowserBack', 'Back']);
const BACK_CODES = new Set([27, 461, 10009, 166, 4]); // Esc, webOS, Tizen, BrowserBack, Android
const REMOVE_KEYS = new Set(['Backspace', 'Delete']);
const OK_REPEAT_MS = 300;
const LONG_PRESS_MS = 600;

export class Input {
  constructor() {
    this.layers = []; // [{root, handlers, focusId}]
    this.lastOk = 0;
    this.lastKeyBack = 0;
    this.activity = [];
    this.press = null;
    this.suppressClick = false;

    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    document.addEventListener('pointerup', () => this.cancelPress());
    document.addEventListener('pointercancel', () => this.cancelPress());
    document.addEventListener('pointermove', (e) => this.onPointerMove(e));
    document.addEventListener('click', (e) => this.onClick(e), true);
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest?.('[data-nav]')) e.preventDefault();
    });

    // Back button: keep a sentinel entry on top of the history stack.
    try {
      history.replaceState({ duinkapel: 'base' }, '');
      history.pushState({ duinkapel: 'sentinel' }, '');
      window.addEventListener('popstate', () => {
        history.pushState({ duinkapel: 'sentinel' }, '');
        // Some remotes send both a key event and a history step.
        if (Date.now() - this.lastKeyBack > 400) this.back();
      });
    } catch {
      /* history API unavailable: Back falls through to the browser */
    }
  }

  get top() {
    return this.layers[this.layers.length - 1];
  }

  /** Replace everything with a new screen. */
  setScreen(root, handlers = {}) {
    this.layers = [{ root, handlers, focusId: handlers.initial ?? null }];
    this.refresh();
  }

  /** Open a modal layer (menu, message) on top. */
  pushLayer(root, handlers = {}) {
    this.layers.push({ root, handlers, focusId: handlers.initial ?? null });
    this.refresh();
  }

  popLayer() {
    if (this.layers.length > 1) this.layers.pop();
    this.refresh();
  }

  onActivity(fn) {
    this.activity.push(fn);
  }

  notify() {
    this.activity.forEach((fn) => fn());
  }

  items() {
    const layer = this.top;
    if (!layer) return [];
    return [...layer.root.querySelectorAll('[data-nav]')].filter((el) => {
      if (el.closest('[hidden]') || el.getAttribute('aria-disabled') === 'true') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
  }

  current() {
    const layer = this.top;
    if (!layer || layer.focusId == null) return null;
    return layer.root.querySelector(`[data-nav="${CSS.escape(layer.focusId)}"]`);
  }

  focusedId() {
    return this.top?.focusId ?? null;
  }

  /** Move focus to an element or id. */
  focus(target) {
    const layer = this.top;
    if (!layer) return;
    const id = typeof target === 'string' ? target : target?.dataset.nav;
    if (id == null) return;
    layer.focusId = id;
    this.refresh();
  }

  /** Re-apply the focus marker (call after re-rendering). */
  refresh() {
    document.querySelectorAll('.is-focused').forEach((el) => el.classList.remove('is-focused'));
    let el = this.current();
    if (!el) {
      const items = this.items();
      el = items[0];
      if (el && this.top) this.top.focusId = el.dataset.nav;
    }
    // Leaving a text field with the D-pad: stop typing into it.
    const active = document.activeElement;
    if (active?.matches?.('input') && active !== el) active.blur();
    if (el) {
      el.classList.add('is-focused');
      if (el.scrollIntoView && document.body.classList.contains('kbd')) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    this.top?.handlers.onFocus?.(el);
  }

  move(dir) {
    const items = this.items();
    const cur = this.current();
    if (!cur || !items.includes(cur)) {
      if (items[0]) this.focus(items[0]);
      return;
    }
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const horizontal = dir === 'left' || dir === 'right';
    let best = null;
    let bestScore = Infinity;
    for (const el of items) {
      if (el === cur) continue;
      const q = el.getBoundingClientRect();
      const dx = q.left + q.width / 2 - cx;
      const dy = q.top + q.height / 2 - cy;
      const primary = { right: dx, left: -dx, down: dy, up: -dy }[dir];
      if (primary <= 4) continue;
      const secondary = Math.abs(horizontal ? dy : dx);
      const overlap = horizontal ? q.bottom > r.top && q.top < r.bottom : q.right > r.left && q.left < r.right;
      const score = primary + secondary * (overlap ? 0.3 : 2.5);
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    if (best) this.focus(best);
  }

  activate(el) {
    if (!el) return;
    this.notify();
    this.focus(el);
    this.top?.handlers.activate?.(el);
  }

  remove(el) {
    if (!el) return;
    this.notify();
    this.top?.handlers.remove?.(el);
  }

  back() {
    this.notify();
    this.top?.handlers.back?.();
  }

  onKey(e) {
    if (e.target.closest?.('input, textarea, select') && !BACK_KEYS.has(e.key)) {
      if (e.key !== 'Enter' && !(e.key in ARROWS)) return;
      if (e.key in ARROWS && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    }
    const dir = ARROWS[e.key] || (!e.key || e.key === 'Unidentified' ? ARROW_CODES[e.keyCode] : null);
    if (dir) {
      e.preventDefault();
      document.body.classList.add('kbd');
      this.notify();
      this.move(dir);
      return;
    }
    if (OK_KEYS.has(e.key) || (!OK_KEYS.has(e.key) && OK_CODES.has(e.keyCode) && e.key !== 'Backspace')) {
      e.preventDefault();
      document.body.classList.add('kbd');
      // Ignore key-repeat bursts so one press is one action.
      const now = Date.now();
      if (e.repeat || now - this.lastOk < OK_REPEAT_MS) return;
      this.lastOk = now;
      const el = this.current();
      if (el?.matches('input')) {
        el.focus();
        return;
      }
      this.activate(el);
      return;
    }
    if (BACK_KEYS.has(e.key) || BACK_CODES.has(e.keyCode)) {
      e.preventDefault();
      if (e.repeat) return;
      this.lastKeyBack = Date.now();
      this.back();
      return;
    }
    if (REMOVE_KEYS.has(e.key)) {
      e.preventDefault();
      if (!e.repeat) this.remove(this.current());
      return;
    }
    if ((e.key === 'u' || e.key === 'U') && !e.repeat) {
      this.notify();
      this.top?.handlers.undo?.();
    }
  }

  onPointerDown(e) {
    document.body.classList.remove('kbd');
    this.notify();
    const el = e.target.closest?.('[data-nav]');
    if (!el || !this.top?.root.contains(el)) return;
    this.suppressClick = false;
    if (el.hasAttribute('data-longpress')) {
      this.press = {
        el,
        x: e.clientX,
        y: e.clientY,
        timer: setTimeout(() => {
          this.suppressClick = true;
          this.press = null;
          this.focus(el);
          this.remove(el);
        }, LONG_PRESS_MS),
      };
    }
  }

  onPointerMove(e) {
    if (this.press && Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 16) this.cancelPress();
  }

  cancelPress() {
    if (this.press) clearTimeout(this.press.timer);
    this.press = null;
  }

  onClick(e) {
    const el = e.target.closest?.('[data-nav]');
    if (!el || !this.top?.root.contains(el)) return;
    if (el.matches('input')) {
      this.focus(el);
      return;
    }
    e.preventDefault();
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.activate(el);
  }
}
