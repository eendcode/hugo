// Every sound is synthesised with the Web Audio API: no recordings, no
// speech synthesis. The AudioContext starts on the first user gesture.

let ctx = null;
let master = null;
let muted = false;
let scare = 'spannend';
let owlTimer = null;
let wind = null;
let noiseBuffer = null;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ctx.destination);
      applyAmbient();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
  applyAmbient();
}

export function setScare(level) {
  scare = level;
  applyAmbient();
}

function noise() {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  return src;
}

/** A single enveloped oscillator note. */
function tone({ freq, type = 'sine', at = 0, dur = 0.2, gain = 0.3, attack = 0.005, slide = null, dest = master }) {
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** A bell: a few inharmonic partials with a long decay. */
function bell(freq, at = 0, gain = 0.25, dur = 1.6) {
  [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
    tone({ freq: freq * ratio, at, dur: dur / (i + 1), gain: gain / (i + 1.5), attack: 0.002 });
  });
}

function hoof(at = 0) {
  const t0 = ctx.currentTime + at;
  const src = noise();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.35, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random());
  src.stop(t0 + 0.1);
}

function owl(at = 0) {
  // "Hoo… hoo-hoo": soft sine with a little droop.
  const hoot = (t, d) => tone({ freq: 410, slide: 360, at: at + t, dur: d, gain: 0.12, attack: 0.06 });
  hoot(0, 0.45);
  hoot(0.7, 0.2);
  hoot(0.95, 0.5);
}

const SOUNDS = {
  select: () => tone({ freq: 660, dur: 0.08, gain: 0.15 }),
  place: () => {
    tone({ freq: 330, type: 'triangle', dur: 0.15, gain: 0.3 });
    hoof(0.01);
  },
  rotate: () => tone({ freq: 880, type: 'square', dur: 0.04, gain: 0.06 }),
  remove: () => tone({ freq: 500, slide: 300, type: 'triangle', dur: 0.15, gain: 0.2 }),
  undo: () => tone({ freq: 600, slide: 400, dur: 0.12, gain: 0.15 }),
  hint: () => [0, 0.08, 0.16].forEach((at, i) => tone({ freq: 1200 + i * 300, at, dur: 0.18, gain: 0.08 })),
  step: () => hoof(),
  treasure: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, at: i * 0.09, dur: 0.4, gain: 0.15 })),
  win: () => {
    bell(523, 0);
    bell(659, 0.25);
    bell(784, 0.5);
    bell(1047, 0.8, 0.3, 2.2);
  },
  chapel: () => {
    bell(392, 0, 0.3, 2.5);
    bell(523, 0.6, 0.3, 2.5);
  },
  // Near-miss: a gentle whoosh, never a "fail" buzzer.
  whoosh: () => {
    const t0 = ctx.currentTime;
    const src = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(400, t0);
    f.frequency.exponentialRampToValueAtTime(1400, t0 + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + 0.7);
  },
  owl: () => owl(),
  // Book 4: far-away thunder (softer in "zacht"), and the Nachtbok shrinking: a falling slide and a pop.
  thunder: () => {
    const t0 = ctx.currentTime;
    const src = noise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    const g = ctx.createGain();
    const peak = scare === 'zacht' ? 0.12 : scare === 'eng' ? 0.45 : 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(peak * 0.4, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + 1.9);
  },
  shrink: () => {
    tone({ freq: 700, slide: 180, type: 'triangle', dur: 0.45, gain: 0.18 });
    tone({ freq: 1400, at: 0.42, dur: 0.12, gain: 0.16 });
    [784, 1047].forEach((f, i) => tone({ freq: f, at: 0.55 + i * 0.1, dur: 0.3, gain: 0.12 }));
  },
};

/** Bell tower notes, lowest to highest (C, E, G, high C). */
const NOTES = [523, 659, 784, 1047];

export function note(i) {
  if (!ctx || muted) return;
  try {
    bell(NOTES[i % NOTES.length], 0, 0.28, 1.2);
  } catch {
    /* sound is optional */
  }
}

export function play(name) {
  if (!ctx || muted || !SOUNDS[name]) return;
  try {
    SOUNDS[name]();
  } catch {
    /* sound is optional */
  }
}

function stopWind() {
  if (!wind) return;
  try {
    wind.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    const w = wind;
    setTimeout(() => w.src.stop(), 1500);
  } catch {
    /* ignore */
  }
  wind = null;
}

function startWind() {
  if (wind || !ctx) return;
  const src = noise();
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 500;
  f.Q.value = 0.8;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(f.frequency);
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  g.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5);
  src.connect(f).connect(g).connect(master);
  src.start();
  lfo.start();
  wind = { src, gain: g };
}

function applyAmbient() {
  clearTimeout(owlTimer);
  owlTimer = null;
  if (!ctx || muted || scare === 'zacht') {
    stopWind();
    return;
  }
  if (scare === 'eng') startWind();
  else stopWind();
  const next = () => {
    owlTimer = setTimeout(() => {
      play('owl');
      next();
    }, 18000 + Math.random() * 25000);
  };
  next();
}
