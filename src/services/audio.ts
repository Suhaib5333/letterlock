/**
 * Lightweight synthesized audio (plan §7.4). Uses the Web Audio API so there are
 * no asset files to ship and latency is minimal. Layered, non-punishing stings;
 * wrong = a soft "whomp", never a harsh buzzer. Initialised on first user gesture
 * (browser autoplay rule). Every sound has a captioned/visual counterpart in UI.
 */
import { nativeHaptic } from '../lib/native';
import { PIECES, type Piece } from './musicScore';
type SoundName =
  | 'tap'
  | 'pick'
  | 'claim'
  | 'steal'
  | 'block'
  | 'wrong'
  | 'pass'
  | 'win'
  | 'tick'
  | 'reveal'
  | 'select'
  | 'swap'
  | 'undo'
  | 'whoosh'
  | 'sparkle';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

export function setAudioEnabled(on: boolean) {
  enabled = on;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  endFreq?: number,
) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  g.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.02);
}

function noise(start: number, dur: number, peak: number) {
  if (!ctx || !master) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = peak;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200;
  src.connect(lp);
  lp.connect(g);
  g.connect(master);
  src.start(ctx.currentTime + start);
}

export function play(name: SoundName) {
  if (!enabled || !ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  switch (name) {
    case 'tap':
      tone(520, 0, 0.06, 'sine', 0.12);
      break;
    case 'pick':
      tone(440, 0, 0.08, 'triangle', 0.18);
      tone(660, 0.04, 0.1, 'sine', 0.1);
      break;
    case 'claim': // thunk + sparkle + bass body
      noise(0, 0.09, 0.18);
      tone(120, 0, 0.18, 'sine', 0.3);
      tone(880, 0.03, 0.16, 'triangle', 0.14, 1320);
      break;
    case 'steal':
      tone(300, 0, 0.12, 'sawtooth', 0.16, 520);
      tone(720, 0.05, 0.14, 'triangle', 0.12);
      break;
    case 'block': // distinct "check"-like weight (plan §7.5)
      tone(180, 0, 0.1, 'square', 0.2, 90);
      noise(0, 0.12, 0.16);
      tone(440, 0.08, 0.12, 'triangle', 0.12);
      break;
    case 'wrong': // soft whomp, low-stress
      tone(220, 0, 0.18, 'sine', 0.18, 110);
      break;
    case 'pass':
      tone(330, 0, 0.1, 'sine', 0.1, 280);
      break;
    case 'reveal':
      tone(600, 0, 0.08, 'sine', 0.1);
      tone(900, 0.05, 0.1, 'sine', 0.08);
      break;
    case 'tick':
      tone(880, 0, 0.03, 'square', 0.05);
      break;
    case 'win': { // rising run → triumphant chord
      const run = [523, 659, 784, 1047];
      run.forEach((f, i) => tone(f, i * 0.09, 0.16, 'triangle', 0.2));
      [523, 659, 784].forEach((f) => tone(f, 0.42, 0.7, 'sine', 0.16));
      noise(0.42, 0.4, 0.1);
      break;
    }
    case 'select': // soft pluck when a hex is highlighted
      tone(587, 0, 0.07, 'triangle', 0.12, 740);
      break;
    case 'swap': // pie-rule swap shimmer
      tone(440, 0, 0.1, 'triangle', 0.14, 660);
      tone(660, 0.06, 0.12, 'sine', 0.1, 880);
      break;
    case 'undo': // little reverse blip
      tone(500, 0, 0.1, 'sine', 0.12, 300);
      break;
    case 'whoosh':
      noise(0, 0.18, 0.12);
      break;
    case 'sparkle':
      [880, 1175, 1568].forEach((f, i) => tone(f, i * 0.05, 0.12, 'sine', 0.08));
      break;
  }
}

/* ============================================================
   Suspense countdown cues — ORIGINAL synthesized loops in the spirit of a
   game-show "time's running out!" sting (the actual Jeopardy "Think!" tune is
   copyrighted, so these are original riffs in that STYLE, not transcriptions).
   The Timer starts one in the last few seconds and stops it when time's up / the
   question changes. Routed through `master`, so muting sound mutes these too.
   ============================================================ */
export type SuspenseVariant = 'off' | 'gameshow' | 'heartbeat' | 'clock' | 'drumroll' | 'arcade';

let suspenseVariant: SuspenseVariant = 'gameshow';
let suspenseOn = false;
let suspenseGain: GainNode | null = null;
let suspenseTimer: ReturnType<typeof setTimeout> | null = null;
let suspenseStep = 0;

export function setSuspenseVariant(v: SuspenseVariant) {
  suspenseVariant = v;
}
export function getSuspenseVariant(): SuspenseVariant {
  return suspenseVariant;
}

function susTone(
  freq: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  endFreq?: number,
  delay = 0,
) {
  if (!ctx || !suspenseGain) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(suspenseGain);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function susNoise(dur: number, peak: number, lpf = 2400, delay = 0) {
  if (!ctx || !suspenseGain) return;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = peak;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = lpf;
  src.connect(lp);
  lp.connect(g);
  g.connect(suspenseGain);
  src.start(ctx.currentTime + delay);
}

/** Schedule one step of the current variant; return ms until the next step.
 *  `step` increases over the cue so patterns can accelerate / build tension. */
function suspenseTick(step: number): number {
  switch (suspenseVariant) {
    case 'gameshow': {
      // Steady "think" pulse: a cycling two-note bass + a woodblock tick, with an
      // accent every bar — an original riff in the TV game-show idiom.
      const bass = [98, 98, 110.0, 98][step % 4];
      susTone(bass, 0.24, 'triangle', 0.22);
      susTone(1600, 0.03, 'square', 0.06); // tick
      if (step % 4 === 3) susTone(587.33, 0.22, 'sine', 0.1); // turnaround accent
      return 250;
    }
    case 'heartbeat': {
      // lub-dub thump that speeds up as time runs out.
      susTone(72, 0.12, 'sine', 0.32, 52);
      susTone(62, 0.14, 'sine', 0.28, 44, 0.135); // the "dub"
      return Math.max(340, 720 - step * 34);
    }
    case 'clock': {
      // tick-tock + a slow dread drone swelling in every couple of seconds.
      susTone(step % 2 === 0 ? 2100 : 1650, 0.04, 'square', 0.14);
      if (step % 4 === 0) susTone(120, 1.1, 'sawtooth', 0.06, 165);
      return 500;
    }
    case 'drumroll': {
      // building snare-ish roll → crescendo.
      susNoise(0.06, Math.min(0.26, 0.07 + step * 0.012), 3200);
      return 65;
    }
    case 'arcade': {
      // urgent rising arpeggio that tightens — retro "hurry up!" feel.
      const notes = [330, 392, 440, 523, 587];
      susTone(notes[step % notes.length], 0.12, 'sawtooth', 0.12);
      return Math.max(110, 230 - step * 7);
    }
    default:
      return 300;
  }
}

function runSuspense() {
  if (!suspenseOn || !ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const next = suspenseTick(suspenseStep);
  suspenseStep++;
  suspenseTimer = setTimeout(runSuspense, next);
}

/** Begin the suspense cue (no-op if muted, no audio ctx, or set to 'off'). Safe
 *  to call repeatedly — only the first call while idle starts it. */
export function startSuspense() {
  if (!enabled || !ctx || !master || suspenseOn || suspenseVariant === 'off') return;
  suspenseOn = true;
  suspenseStep = 0;
  suspenseGain = ctx.createGain();
  suspenseGain.gain.value = 0.7;
  suspenseGain.connect(master);
  runSuspense();
}

/** Stop the suspense cue with a quick fade so it never clips off harshly. */
export function stopSuspense() {
  if (!suspenseOn) return;
  suspenseOn = false;
  if (suspenseTimer) clearTimeout(suspenseTimer);
  suspenseTimer = null;
  if (ctx && suspenseGain) {
    const g = suspenseGain;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
    g.gain.linearRampToValueAtTime(0.0001, now + 0.18);
    setTimeout(() => {
      try {
        g.disconnect();
      } catch {
        /* already gone */
      }
    }, 260);
    suspenseGain = null;
  }
}

/* ============================================================
   Soundtrack — calm instrumental quiz-show "thinking music", SYNTHESIZED live
   from our own compositions in `musicScore.ts` (vibraphone lead, soft walking
   bass, faint pad). No audio file, no sample, no third-party track: fully
   royalty-free by construction. The pieces rotate with a cross-fade, run
   quieter during a match, and duck fully when a question clip plays.
   ============================================================ */

let musicGain: GainNode | null = null;
let padOsc: OscillatorNode[] = [];
let musicOn = false;
let ducked = false;
let musicContext: 'menu' | 'game' = 'menu';
let piece: Piece = PIECES[0];
let noteTimer: ReturnType<typeof setTimeout> | null = null;
let pieceTimer: ReturnType<typeof setTimeout> | null = null;
let bassTimer: ReturnType<typeof setTimeout> | null = null;
let melodyIdx = 0;
let barIdx = 0;

function targetVolume(): number {
  if (ducked) return 0.0001;
  return musicContext === 'game' ? 0.05 : 0.13; // quieter during a match
}

function rampMusic(to: number, seconds: number) {
  if (!ctx || !musicGain) return;
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(Math.max(musicGain.gain.value, 0.0001), now);
  musicGain.gain.linearRampToValueAtTime(Math.max(to, 0.0001), now + seconds);
}

/**
 * One struck note: fast attack + long exponential decay = vibraphone/e-piano,
 * with an optional tremolo LFO for the shimmer that timbre is known for.
 */
function softNote(freq: number, dur: number, peak: number, opts: { wave?: OscillatorType; attack?: number; tremolo?: number } = {}) {
  if (!ctx || !musicGain) return;
  const t = ctx.currentTime + 0.02;
  const attack = opts.attack ?? piece.attack;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.wave ?? piece.wave;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(musicGain);
  osc.start(t);
  osc.stop(t + dur + 0.1);
  const trem = opts.tremolo ?? 0;
  if (trem > 0) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = trem;
    depth.gain.value = peak * 0.3;
    lfo.connect(depth);
    depth.connect(g.gain);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  }
}

function stopPad() {
  padOsc.forEach((o) => {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  });
  padOsc = [];
}

function startPad() {
  stopPad();
  if (!ctx || !musicGain || piece.padGain <= 0) return;
  const root = piece.scale[0] / 2;
  [root, root * 1.5].forEach((f) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.value = piece.padGain;
    o.connect(g);
    g.connect(musicGain!);
    o.start();
    padOsc.push(o);
  });
}

/** Walk the composed melody one note at a time, looping — a real recurring tune. */
function scheduleNotes() {
  if (!ctx || !musicOn) return;
  const [deg, beats] = piece.melody[melodyIdx % piece.melody.length];
  melodyIdx++;
  const durSec = (beats * piece.beat) / 1000;
  if (deg >= 0) {
    const freq = piece.scale[Math.min(deg, piece.scale.length - 1)];
    softNote(freq, durSec * 0.92 + 0.6, 0.16, { tremolo: piece.tremolo });
    // a stacked diatonic third, for the two-mallet vibraphone warmth
    if (Math.random() < piece.harmony && deg + 2 < piece.scale.length) {
      softNote(piece.scale[deg + 2], durSec * 0.9 + 0.5, 0.055, { tremolo: piece.tremolo });
    }
  }
  noteTimer = setTimeout(scheduleNotes, beats * piece.beat);
}

/** A soft walking bass: chord root on beat 1, its fifth on beat 3, bar by bar. */
function scheduleBass() {
  if (!ctx || !musicOn) return;
  const chord = piece.chords[barIdx % piece.chords.length];
  barIdx++;
  const bar = 4 * piece.beat;
  const note = (idx: number) => softNote(piece.scale[idx] / 2, (2 * piece.beat) / 1000 + 0.4, 0.09, { wave: 'sine', attack: 0.03 });
  note(chord.root);
  setTimeout(() => musicOn && note(chord.fifth), bar / 2);
  bassTimer = setTimeout(scheduleBass, bar);
}

/** Cross-fade to another piece (loops forever, so the soundtrack keeps moving). */
function rotatePiece(initial = false) {
  if (!ctx || !musicOn) return;
  const fade = initial ? 4 : 3;
  if (!initial) rampMusic(0.0001, fade); // fade current out
  const apply = () => {
    if (!musicOn) return;
    if (!initial) {
      let next = piece;
      while (next === piece && PIECES.length > 1) next = PIECES[Math.floor(Math.random() * PIECES.length)];
      piece = next;
    }
    melodyIdx = 0; // restart the tune from the top of its phrase
    barIdx = 0;
    startPad();
    rampMusic(targetVolume(), fade);
  };
  if (initial) apply();
  else setTimeout(apply, fade * 1000);
  // each piece plays for 40–60s, then rotate again
  pieceTimer = setTimeout(rotatePiece, (initial ? 0 : fade * 1000) + 40000 + Math.random() * 20000);
}

export function startMusic() {
  if (!ctx || musicOn) return;
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.0001;
  musicGain.connect(ctx.destination);
  musicOn = true;
  if (ctx.state === 'suspended') ctx.resume();
  piece = PIECES[0]; // always open on the signature piece; rotation randomises after
  melodyIdx = 0;
  barIdx = 0;
  rotatePiece(true);
  scheduleNotes();
  scheduleBass();
}

export function stopMusic() {
  musicOn = false;
  if (noteTimer) clearTimeout(noteTimer);
  if (pieceTimer) clearTimeout(pieceTimer);
  if (bassTimer) clearTimeout(bassTimer);
  noteTimer = pieceTimer = bassTimer = null;
  stopPad();
  if (ctx && musicGain) {
    rampMusic(0.0001, 1.6);
    const g = musicGain;
    setTimeout(() => g.disconnect(), 2000);
    musicGain = null;
  }
}

/** Louder in menus, quieter during a match. */
export function setMusicContext(c: 'menu' | 'game') {
  musicContext = c;
  if (musicOn && !ducked) rampMusic(targetVolume(), 1.5);
}

/** Duck (pause) the music while a question audio/video clip plays; restore after. */
export function duckMusic(on: boolean) {
  ducked = on;
  if (musicOn) rampMusic(targetVolume(), on ? 0.3 : 1.0);
}

export function isMusicOn() {
  return musicOn;
}

export function haptic(ms = 12) {
  // In the Capacitor apps the Haptics plugin fires (iOS WebView ignores vibrate).
  if (nativeHaptic(ms)) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* no-op on web/desktop */
    }
  }
}

/** Speak a question aloud (plan §7.3 TTS toggle). */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
