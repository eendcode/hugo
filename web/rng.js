// A small seeded PRNG (mulberry32) for puzzles generated in the browser,
// so the same room and level always give the same puzzle.

export class Rng {
  constructor(seed) {
    this.s = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [0, n). */
  below(n) {
    return Math.floor(this.next() * n);
  }

  /** Integer in [lo, hi]. */
  int(lo, hi) {
    return lo + this.below(hi - lo + 1);
  }

  pick(list) {
    return list[this.below(list.length)];
  }

  chance(p) {
    return this.next() < p;
  }

  shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = this.below(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }
}

/** A stable seed for (text, numbers…). */
export function seedOf(...parts) {
  let h = 2166136261;
  for (const ch of parts.join('/')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
