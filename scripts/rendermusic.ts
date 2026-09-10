/**
 * Render the soundtrack to WAV so a human can actually LISTEN to what the app
 * will play, instead of taking "the code looks right" on trust.
 *
 *   npx vite-node scripts/rendermusic.ts [outDir]
 *
 * It imports the very same `src/services/musicScore.ts` the app imports, so the
 * tunes, tempos, chords and timbres are identical by construction. Only the
 * SYNTH is re-implemented here (WebAudio nodes don't exist in node), following
 * the same envelope maths: an exponential ramp to peak over `attack`, then an
 * exponential decay to silence over the note, plus the tremolo LFO.
 * ponytail: ~60 lines of duplicated DSP buys an audible check; the score, which
 * is the part that actually defines the music, is shared, not copied.
 * Output is peak-normalised for listening; in the app it sits far quieter.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PIECES, type Piece } from '../src/services/musicScore';

const SR = 24000;
const SECONDS_PER_PIECE = 24;
const CROSSFADE = 2;
const out = process.argv[2] || 'music-preview';
mkdirSync(out, { recursive: true });

// Deterministic RNG so two renders of the same score are byte-identical.
let seed = 20260910;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/** Band-limited triangle/sine, so the render doesn't alias where WebAudio wouldn't. */
function wavef(wave: string, phase: number, freq: number): number {
  if (wave !== 'triangle') return Math.sin(phase);
  let v = 0;
  for (let n = 1; n * freq < SR / 2; n += 2) {
    v += (n % 4 === 1 ? 1 : -1) * Math.sin(n * phase) / (n * n);
  }
  return v * (8 / Math.PI ** 2);
}

/** The same envelope WebAudio's exponentialRampToValueAtTime pair produces. */
function env(t: number, attack: number, dur: number, peak: number): number {
  const floor = 0.0001;
  if (t < 0 || t > dur) return 0;
  if (t < attack) return floor * (peak / floor) ** (t / attack);
  return peak * (floor / peak) ** ((t - attack) / (dur - attack));
}

function addNote(buf: Float32Array, at: number, freq: number, dur: number, peak: number, wave: string, attack: number, tremolo: number) {
  const start = Math.floor(at * SR);
  const n = Math.floor((dur + 0.1) * SR);
  const w = 2 * Math.PI * freq / SR;
  for (let i = 0; i < n; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= buf.length) continue;
    const t = i / SR;
    let a = env(t, attack, dur, peak);
    if (tremolo > 0) a += Math.sin(2 * Math.PI * tremolo * t) * peak * 0.3 * (a / peak); // LFO on the note gain
    buf[idx] += wavef(wave, w * i, freq) * a;
  }
}

function renderPiece(p: Piece, seconds: number): Float32Array {
  const buf = new Float32Array(Math.ceil(seconds * SR));
  const beat = p.beat / 1000;

  // lead + its stacked third
  let t = 0;
  for (let i = 0; t < seconds; i++) {
    const [deg, beats] = p.melody[i % p.melody.length];
    const dur = beats * beat;
    if (deg >= 0) {
      const d = Math.min(deg, p.scale.length - 1);
      addNote(buf, t, p.scale[d], dur * 0.92 + 0.6, 0.16, p.wave, p.attack, p.tremolo);
      if (rnd() < p.harmony && d + 2 < p.scale.length) {
        addNote(buf, t, p.scale[d + 2], dur * 0.9 + 0.5, 0.055, p.wave, p.attack, p.tremolo);
      }
    }
    t += dur;
  }

  // walking bass: root on beat 1, fifth on beat 3
  const bar = 4 * beat;
  for (let b = 0; b * bar < seconds; b++) {
    const c = p.chords[b % p.chords.length];
    addNote(buf, b * bar, p.scale[c.root] / 2, 2 * beat + 0.4, 0.09, 'sine', 0.03, 0);
    addNote(buf, b * bar + bar / 2, p.scale[c.fifth] / 2, 2 * beat + 0.4, 0.09, 'sine', 0.03, 0);
  }

  // pad: sustained root + fifth drone
  if (p.padGain > 0) {
    const root = p.scale[0] / 2;
    for (const f of [root, root * 1.5]) {
      const w = 2 * Math.PI * f / SR;
      for (let i = 0; i < buf.length; i++) buf[i] += Math.sin(w * i) * p.padGain;
    }
  }
  return buf;
}

function toWav(s: Float32Array): Buffer {
  const buf = Buffer.alloc(44 + s.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + s.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(s.length * 2, 40);
  for (let i = 0; i < s.length; i++) buf.writeInt16LE(Math.max(-1, Math.min(1, s[i])) * 32767, 44 + i * 2);
  return buf;
}

function normalise(s: Float32Array, to = 0.7): { peak: number; rms: number } {
  let peak = 0;
  let sum = 0;
  for (const v of s) {
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
  }
  const rms = Math.sqrt(sum / s.length);
  if (peak > 0) for (let i = 0; i < s.length; i++) s[i] = (s[i] / peak) * to;
  return { peak, rms };
}

const all = new Float32Array(Math.ceil((PIECES.length * (SECONDS_PER_PIECE - CROSSFADE) + CROSSFADE) * SR));
PIECES.forEach((p, i) => {
  const raw = renderPiece(p, SECONDS_PER_PIECE);
  const { peak, rms } = normalise(new Float32Array(raw)); // measure pre-mix levels
  console.log(`${p.name.padEnd(10)} beat ${p.beat}ms  ${p.melody.length} notes  peak ${peak.toFixed(3)}  rms ${rms.toFixed(4)}`);
  if (peak > 0.99) console.error(`  !! ${p.name} clips before the master gain`);
  if (rms < 0.005) console.error(`  !! ${p.name} is near-silent`);

  // fade the piece in/out, then lay it into the combined preview with a crossfade
  const fade = Math.floor(CROSSFADE * SR);
  for (let j = 0; j < fade; j++) {
    raw[j] *= j / fade;
    raw[raw.length - 1 - j] *= j / fade;
  }
  const at = Math.floor(i * (SECONDS_PER_PIECE - CROSSFADE) * SR);
  for (let j = 0; j < raw.length && at + j < all.length; j++) all[at + j] += raw[j];

  const solo = renderPiece(p, SECONDS_PER_PIECE);
  normalise(solo);
  writeFileSync(join(out, `${i + 1}-${p.name}.wav`), toWav(solo));
});

const mixed = normalise(all);
writeFileSync(join(out, 'letterlock-soundtrack.wav'), toWav(all));
console.log(`\nWrote ${PIECES.length + 1} WAVs to ${out}/ (mix peak ${mixed.peak.toFixed(3)}, rms ${mixed.rms.toFixed(4)})`);
