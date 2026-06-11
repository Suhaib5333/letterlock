/**
 * Generate small WAV audio clips of famous PUBLIC-DOMAIN melodies, synthesized
 * from scratch (the compositions are public domain; this rendition is original,
 * so it's fully legal to bundle). Powers the "Guess the Melody" audio pack.
 * No ffmpeg needed — writes compact mono 16-bit WAVs directly.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const SR = 22050;
const OUT = 'public/clips';
mkdirSync(OUT, { recursive: true });

// note name -> frequency (e.g. "A4", "C#5", "Eb4")
const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function freq(note) {
  if (note === 'R') return 0; // rest
  const m = note.match(/^([A-G][#b]?)(\d)$/);
  const semis = SEMI[m[1]] + (parseInt(m[2], 10) - 4) * 12; // relative to C4
  return 440 * Math.pow(2, (semis - 9) / 12); // A4 = 440
}

function renderMelody(notes, beat = 0.34) {
  const samples = [];
  for (const [name, beats] of notes) {
    const dur = beats * beat;
    const n = Math.floor(dur * SR);
    const f = freq(name);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = 0;
      if (f > 0) {
        // music-box-ish timbre: fundamental + soft harmonics
        v = Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * 2 * f * t) * 0.2 + Math.sin(2 * Math.PI * 3 * f * t) * 0.08;
        // percussive pluck envelope (quick attack, exp decay) + tiny gap at note end
        const env = Math.min(1, t / 0.01) * Math.exp(-3.2 * (t / dur)) * (1 - Math.min(1, (t - (dur - 0.02)) / 0.02 > 0 ? (t - (dur - 0.02)) / 0.02 : 0));
        v *= env;
      }
      samples.push(v * 0.5);
    }
  }
  return samples;
}

function toWav(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
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
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

// [id, beat, notes[ [name,beats] ]]
const MELODIES = {
  beethoven5: [0.3, [['G4', 0.5], ['G4', 0.5], ['G4', 0.5], ['Eb4', 2], ['F4', 0.5], ['F4', 0.5], ['F4', 0.5], ['D4', 2]]],
  odetojoy: [0.34, [['E4', 1], ['E4', 1], ['F4', 1], ['G4', 1], ['G4', 1], ['F4', 1], ['E4', 1], ['D4', 1], ['C4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['E4', 1.5], ['D4', 0.5], ['D4', 2]]],
  furelise: [0.26, [['E5', 1], ['Eb5', 1], ['E5', 1], ['Eb5', 1], ['E5', 1], ['B4', 1], ['D5', 1], ['C5', 1], ['A4', 2]]],
  einekleine: [0.28, [['G4', 1], ['D4', 1], ['G4', 0.5], ['D4', 0.5], ['G4', 1], ['D5', 1], ['B4', 1], ['G4', 1], ['D4', 1]]],
  turkishmarch: [0.22, [['B4', 0.5], ['A4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['C5', 1], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 1]]],
  twinkle: [0.32, [['C4', 1], ['C4', 1], ['G4', 1], ['G4', 1], ['A4', 1], ['A4', 1], ['G4', 2], ['F4', 1], ['F4', 1], ['E4', 1], ['E4', 1], ['D4', 1], ['D4', 1], ['C4', 2]]],
  canon: [0.4, [['F#5', 1], ['E5', 1], ['D5', 1], ['C#5', 1], ['B4', 1], ['A4', 1], ['B4', 1], ['C#5', 1], ['D5', 2]]],
  cancan: [0.18, [['A4', 0.5], ['A4', 0.5], ['A4', 0.5], ['A4', 0.5], ['A4', 0.5], ['G4', 0.5], ['A4', 0.5], ['F4', 0.5], ['D4', 1], ['D4', 1]]],
  bluedanube: [0.3, [['G4', 1], ['B4', 1], ['D5', 1], ['D5', 1], ['D5', 1], ['G4', 1], ['B4', 1], ['D5', 2]]],
  mountainking: [0.22, [['B4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['F#5', 0.5], ['D5', 0.5], ['F#5', 1], ['F5', 0.5], ['C5', 0.5], ['F5', 1]]],
  williamtell: [0.16, [['E4', 0.5], ['E4', 0.5], ['E4', 1], ['E4', 0.5], ['E4', 0.5], ['E4', 1], ['E4', 0.5], ['G4', 0.5], ['C4', 0.5], ['D4', 0.5], ['E4', 1]]],
  weddingmarch: [0.3, [['C5', 0.5], ['C5', 0.25], ['C5', 0.75], ['F5', 2], ['C5', 1], ['A4', 1], ['F5', 1]]],
  jinglebells: [0.26, [['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['E4', 1], ['E4', 2], ['E4', 1], ['G4', 1], ['C4', 1.5], ['D4', 0.5], ['E4', 2]]],
  happybirthday: [0.3, [['C4', 0.75], ['C4', 0.25], ['D4', 1], ['C4', 1], ['F4', 1], ['E4', 2], ['C4', 0.75], ['C4', 0.25], ['D4', 1], ['C4', 1], ['G4', 1], ['F4', 2]]],
  marylamb: [0.3, [['E4', 1], ['D4', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['E4', 1], ['E4', 2], ['D4', 1], ['D4', 1], ['D4', 2]]],
  amazinggrace: [0.34, [['D4', 1], ['G4', 2], ['B4', 1], ['G4', 1], ['B4', 2], ['A4', 1], ['G4', 2], ['E4', 1], ['D4', 2]]],
  rowboat: [0.3, [['C4', 1], ['C4', 1], ['C4', 0.75], ['D4', 0.25], ['E4', 1], ['E4', 0.75], ['D4', 0.25], ['E4', 0.75], ['F4', 0.25], ['G4', 2]]],
  greensleeves: [0.3, [['A4', 1], ['C5', 1.5], ['D5', 0.5], ['E5', 1.5], ['F5', 0.5], ['E5', 1], ['D5', 1.5], ['B4', 0.5], ['G4', 1], ['A4', 1.5], ['B4', 0.5], ['C5', 1]]],
  lullaby: [0.34, [['E4', 0.5], ['E4', 0.5], ['G4', 1], ['E4', 0.5], ['E4', 0.5], ['G4', 1], ['E4', 1], ['G4', 1], ['C5', 1], ['B4', 1], ['A4', 1], ['A4', 1], ['G4', 2]]],
  swanlake: [0.34, [['B4', 1], ['F#4', 1], ['B4', 1], ['D5', 1], ['C#5', 1], ['B4', 1], ['A4', 1], ['G4', 1], ['F#4', 2]]],
  nutcracker: [0.2, [['E5', 0.5], ['B4', 0.5], ['G4', 0.5], ['E4', 0.5], ['B4', 0.5], ['G4', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 0.5], ['E5', 0.5], ['C5', 0.5], ['A4', 0.5]]],
  valkyries: [0.26, [['B3', 0.75], ['F#4', 0.25], ['B4', 1.5], ['F#4', 0.75], ['B4', 0.25], ['D5', 1.5], ['B4', 0.75], ['D5', 0.25], ['F#5', 1.5]]],
  springvivaldi: [0.26, [['E5', 0.5], ['G#4', 0.5], ['G#4', 0.5], ['G#4', 0.5], ['A4', 0.5], ['G#4', 0.5], ['E5', 0.5], ['E5', 0.5], ['E5', 0.5], ['B4', 0.5], ['B4', 0.5], ['B4', 0.5]]],
};

let total = 0;
for (const [id, [beat, notes]] of Object.entries(MELODIES)) {
  const wav = toWav(renderMelody(notes, beat));
  writeFileSync(`${OUT}/${id}.wav`, wav);
  total += wav.length;
  console.log(`${id}.wav  ${(wav.length / 1024).toFixed(0)} KB`);
}
console.log(`\n${Object.keys(MELODIES).length} clips, ${(total / 1024 / 1024).toFixed(2)} MB total`);
