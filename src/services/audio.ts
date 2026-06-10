/**
 * Lightweight synthesized audio (plan §7.4). Uses the Web Audio API so there are
 * no asset files to ship and latency is minimal. Layered, non-punishing stings;
 * wrong = a soft "whomp", never a harsh buzzer. Initialised on first user gesture
 * (browser autoplay rule). Every sound has a captioned/visual counterpart in UI.
 */
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
  | 'reveal';

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
  }
}

export function haptic(ms = 12) {
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
