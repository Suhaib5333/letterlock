/**
 * The Letterlock soundtrack, as DATA (no browser APIs), so `scripts/rendermusic.ts`
 * can preview the exact same tunes the app plays.
 *
 * ⚖️ COPYRIGHT / ROYALTIES: every piece below was composed here, from scratch, for
 * Letterlock. Nothing is sampled, transcribed, arranged or "inspired-by" at the
 * melodic level — not the Jeopardy! think cue, not any recording. The chord
 * progressions (ii-V-I, I-vi-ii-V) and the walking bass are generic musical
 * devices in the public domain; copyright attaches to a specific melody, and
 * these melodies are ours. The app SYNTHESIZES them live with Web Audio, so the
 * build ships no audio file at all: nothing to license, no royalties, no PRO
 * registration, no revenue share, and nothing for a store review to flag.
 *
 * Style: calm instrumental quiz-show "thinking music" — vibraphone over gentle
 * jazz harmony with a soft walking bass. Unhurried on purpose; it sits under the
 * UI, never on top of it.
 */

export interface Chord {
  /** Scale index the bass plays on beat 1 of the bar. */
  root: number;
  /** ...and on beat 3, so the bass walks instead of thudding. */
  fifth: number;
}

export interface Piece {
  name: string;
  /** The piece's diatonic notes in Hz, low → high; melody/bass index into this. */
  scale: number[];
  /** One chord per bar, cycled forever. */
  chords: Chord[];
  /** The tune: [scale index, beats]; index -1 is a rest. */
  melody: [number, number][];
  /** ms per beat. */
  beat: number;
  wave: OscillatorType;
  /** Note attack in seconds — 0.01 reads as a struck vibraphone, 0.3 as a pad. */
  attack: number;
  /** Vibraphone shimmer on the lead, in Hz (0 = off). */
  tremolo: number;
  /** 0..1 chance of a stacked diatonic third under a lead note. */
  harmony: number;
  /** Sustained root+fifth drone beneath everything (0 = none). */
  padGain: number;
}

// F major · Gm7 - C7 - Fmaj7 - Dm7 (ii-V-I-vi)
const F = [174.61, 196.0, 220.0, 233.08, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 466.16, 523.25, 587.33, 659.25];
// C major · Cmaj7 - Am7 - Dm7 - G7 (I-vi-ii-V)
const C = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99];
// G major · Gmaj7 - Em7 - Am7 - D7
const G = [196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25];
// D major · Dmaj7 - Bm7 - Gmaj7 - A7 (I-vi-IV-V)
const D = [293.66, 329.63, 369.99, 392.0, 440.0, 493.88, 554.37, 587.33, 659.25, 739.99, 783.99, 880.0];

export const PIECES: Piece[] = [
  {
    // The signature home-screen piece: a poised ii-V-I that keeps asking a
    // question and answering it — quiz-show pensive, never tense.
    name: 'quizroom',
    scale: F,
    chords: [
      { root: 1, fifth: 5 }, // Gm7  → G, D
      { root: 4, fifth: 8 }, // C7   → C, G
      { root: 0, fifth: 4 }, // Fmaj7→ F, C
      { root: 5, fifth: 9 }, // Dm7  → D, A
    ],
    melody: [
      [8, 2], [10, 1], [11, 1], // Gm7:   G  Bb C
      [13, 2], [11, 2], //         C7:    E  C
      [9, 3], [8, 1], //           Fmaj7: A  G
      [7, 2], [-1, 2], //          Dm7:   F  ·
      [10, 1], [11, 1], [12, 2], // Gm7:  Bb C  D
      [11, 2], [10, 1], [9, 1], //  C7:   C  Bb A
      [8, 2], [6, 1], [7, 1], //    Fmaj7:G  E  F
      [9, 4], //                    Dm7:  A ———
    ],
    beat: 500, wave: 'triangle', attack: 0.012, tremolo: 5.2, harmony: 0.45, padGain: 0.035,
  },
  {
    // Sparser and slower — the "still thinking" one. Long notes, lots of room.
    name: 'thinktime',
    scale: C,
    chords: [
      { root: 0, fifth: 4 }, // Cmaj7 → C, G
      { root: 5, fifth: 2 }, // Am7   → A, E
      { root: 1, fifth: 5 }, // Dm7   → D, A
      { root: 4, fifth: 1 }, // G7    → G, D
    ],
    melody: [
      [7, 3], [6, 1], //         Cmaj7: C  B
      [5, 2], [4, 2], //         Am7:   A  G
      [3, 2], [5, 2], //         Dm7:   F  A
      [4, 3], [-1, 1], //        G7:    G  ·
      [9, 2], [7, 2], //         Cmaj7: E  C
      [6, 1], [5, 1], [4, 2], // Am7:   B  A  G
      [8, 2], [7, 2], //         Dm7:   D  C
      [6, 2], [4, 2], //         G7:    B  G
    ],
    beat: 620, wave: 'sine', attack: 0.02, tremolo: 4.4, harmony: 0.3, padGain: 0.045,
  },
  {
    // Warm lounge electric-piano feel: maj7 colours, a gentle downward drift.
    name: 'lounge',
    scale: G,
    chords: [
      { root: 0, fifth: 4 }, // Gmaj7 → G, D
      { root: 5, fifth: 9 }, // Em7   → E, B
      { root: 1, fifth: 5 }, // Am7   → A, E
      { root: 4, fifth: 8 }, // D7    → D, A
    ],
    melody: [
      [9, 2], [11, 2], //         Gmaj7: B  D
      [12, 2], [9, 2], //         Em7:   E  B
      [10, 1], [8, 1], [7, 2], // Am7:   C  A  G
      [6, 2], [8, 2], //          D7:    F# A
      [7, 3], [9, 1], //          Gmaj7: G  B
      [9, 2], [6, 2], //          Em7:   B  F#
      [5, 2], [7, 2], //          Am7:   E  G
      [4, 4], //                  D7:    D ———
    ],
    beat: 540, wave: 'triangle', attack: 0.014, tremolo: 5.8, harmony: 0.5, padGain: 0.03,
  },
  {
    // A touch brighter for the between-games lift — still calm, still background.
    name: 'spotlight',
    scale: D,
    chords: [
      { root: 0, fifth: 4 }, // Dmaj7 → D, A
      { root: 5, fifth: 9 }, // Bm7   → B, F#
      { root: 3, fifth: 7 }, // Gmaj7 → G, D
      { root: 4, fifth: 8 }, // A7    → A, E
    ],
    melody: [
      [7, 2], [9, 2], //          Dmaj7: D  F#
      [9, 1], [7, 1], [5, 2], //  Bm7:   F# D  B
      [5, 2], [3, 2], //          Gmaj7: B  G
      [4, 2], [6, 2], //          A7:    A  C#
      [9, 3], [8, 1], //          Dmaj7: F# E
      [7, 2], [5, 2], //          Bm7:   D  B
      [3, 2], [4, 2], //          Gmaj7: G  A
      [2, 2], [0, 2], //          A7:    F# D
    ],
    beat: 520, wave: 'sine', attack: 0.01, tremolo: 6.2, harmony: 0.4, padGain: 0.03,
  },
];
