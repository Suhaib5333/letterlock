import { describe, expect, it } from 'vitest';
import { answerableLetters, normalizePack, serveQuestion, totalQuestions } from '../core/packs';
import { mulberry32 } from '../core/rng';
import { generalKnowledgePack } from './generalKnowledge';
import { kidsPack } from './kids';
import { PACKS } from './index';

const FULLY_COVERED = [normalizePack(generalKnowledgePack), normalizePack(kidsPack)];

describe('authored packs cover the full alphabet', () => {
  for (const pack of FULLY_COVERED) {
    it(`${pack.name} has questions for all 26 letters`, () => {
      expect(answerableLetters(pack)).toHaveLength(26);
    });
  }
});

describe('every answer genuinely starts with its letter (the core mechanic)', () => {
  for (const pack of FULLY_COVERED) {
    it(`${pack.name}`, () => {
      for (const [letter, qs] of Object.entries(pack.letters)) {
        for (const q of qs) {
          const first = q.a.trim()[0]?.toUpperCase();
          expect(
            first,
            `Pack "${pack.name}" letter ${letter}: answer "${q.a}" must start with ${letter}`,
          ).toBe(letter);
        }
      }
    });
  }
});

describe('no duplicate question text within a letter', () => {
  for (const pack of FULLY_COVERED) {
    it(`${pack.name}`, () => {
      for (const qs of Object.values(pack.letters)) {
        const seen = new Set<string>();
        for (const q of qs) {
          expect(seen.has(q.q)).toBe(false);
          seen.add(q.q);
        }
      }
    });
  }
});

describe('all registered packs are playable', () => {
  for (const pack of PACKS) {
    it(`${pack.name} serves a question for each of its letters`, () => {
      const rng = mulberry32(1);
      for (const letter of answerableLetters(pack)) {
        const served = serveQuestion(pack, letter, [], rng);
        expect(served.question.a.length).toBeGreaterThan(0);
      }
      // Themed packs may not cover all letters, but must cover enough to play.
      // Letterless packs (flags/logos/clips) serve from the WHOLE pack regardless of
      // the cell's letter, so their letter spread is irrelevant — only the total count
      // matters (e.g. many TV titles start with "The" → one bucket, but every tile still
      // draws a distinct clip from the whole pool).
      if (pack.hideBoardLetters) {
        expect(totalQuestions(pack)).toBeGreaterThanOrEqual(16);
      } else {
        expect(answerableLetters(pack).length).toBeGreaterThanOrEqual(16);
      }
    });
  }
});

describe('no clue-restatement / sentence answers (the "Ukraine\'s capital is Kyiv" bug)', () => {
  // Narrow patterns that indicate the answer restates the clue instead of being the
  // clean answer — kept tight so real titles ("No Country for Old Men") aren't flagged.
  const BUG = /(capital is|capital of|'s capital|\bbegins with\b|^the country whose|^the .* whose)/i;
  const POSSESSIVE_IS = /\b\w+'s\b[^,]*\bis\b/i; // e.g. "Ukraine's capital is Kyiv"
  for (const pack of PACKS) {
    it(`${pack.name}`, () => {
      const bad: string[] = [];
      for (const qs of Object.values(pack.letters)) {
        for (const q of qs) {
          if (BUG.test(q.a) || POSSESSIVE_IS.test(q.a)) bad.push(q.a);
        }
      }
      expect(bad, `Clue-restatement answers in "${pack.name}":\n${bad.join('\n')}`).toEqual([]);
    });
  }
});

describe('EVERY registered pack: every answer starts with its letter', () => {
  for (const pack of PACKS) {
    it(`${pack.name}`, () => {
      const bad: string[] = [];
      for (const [letter, qs] of Object.entries(pack.letters)) {
        for (const q of qs) {
          const first = q.a.trim()[0]?.toUpperCase();
          if (first !== letter) bad.push(`[${letter}] "${q.a}" (q: ${q.q.slice(0, 40)})`);
        }
      }
      expect(bad, `Mismatches in "${pack.name}":\n${bad.join('\n')}`).toEqual([]);
    });
  }
});

describe('EVERY pack: the answer never leaks into the question text', () => {
  // Generic head-nouns that legitimately appear in both a clue and a multi-word
  // answer (e.g. "ocean" in "Pacific Ocean") — only the DISTINCTIVE word leaking is a bug.
  const GENERIC = new Set([
    'ocean', 'sea', 'river', 'lake', 'mountain', 'desert', 'island', 'city', 'year', 'day',
    'number', 'angle', 'triangle', 'square', 'circle', 'scale', 'note', 'rock', 'stone',
    'jersey', 'jump', 'race', 'racing', 'kick', 'vault', 'match', 'test', 'set', 'sets',
    'point', 'points', 'sport', 'game', 'team', 'trophy', 'stadium', 'derby', 'tour',
    'bowler', 'animal', 'bird', 'fish', 'tree', 'plant', 'flower', 'colour', 'color',
    'shape', 'meal', 'pastry', 'moon', 'phase', 'chromosome', 'pulsar', 'star', 'wonder',
    'half', 'clef', 'song', 'dance', 'opera', 'concerto', 'symphony',
    // space / science head-nouns
    'velocity', 'spacecraft', 'programme', 'program', 'mission', 'station', 'cluster',
    'galaxy', 'planet', 'nebula', 'comet', 'asteroid', 'meteor', 'telescope', 'probe',
    'ring', 'rings', 'belt', 'field', 'tilt', 'orbit', 'light', 'sun', 'system', 'effect',
    'force', 'energy', 'wave', 'particle', 'acid', 'element', 'organ', 'gland', 'disease',
    'instrument', 'theory', 'reaction', 'cloud', 'crater', 'tide', 'eclipse', 'matter',
    // geography head-nouns
    'mount', 'cape', 'gulf', 'bay', 'strait', 'range', 'peak', 'falls', 'kingdom',
    'country', 'nation', 'capital', 'republic', 'sea', 'union',
    // history / culture head-nouns
    'war', 'battle', 'treaty', 'empire', 'dynasty', 'revolution', 'coup', 'code', 'age', 'period',
    'era', 'century', 'king', 'queen', 'emperor', 'pope', 'saint', 'language', 'alphabet',
    // buildings / structures / organisations (generic head-nouns)
    'mosque', 'tower', 'towers', 'studio', 'palace', 'fort', 'castle', 'bridge', 'temple',
    'cathedral', 'stadium', 'circuit', 'causeway', 'governorate', 'emirate',
    // sports head-nouns
    'medal', 'league', 'club', 'final', 'open', 'championship', 'tournament', 'event',
    'jersey', 'cup', 'goal', 'series', 'cricket', 'football', 'tennis', 'golf', 'rugby',
    // screen / music head-nouns
    'film', 'movie', 'show', 'series', 'award', 'prize', 'band', 'novel', 'poem', 'play',
    'genre', 'sonata', 'overture', 'painting', 'opera', 'god', 'goddess', 'myth',
    // faith descriptors + pronouns/common words that legitimately recur
    'islam', 'islamic', 'muslim', 'christian', 'buddhist', 'hindu', 'jewish', 'faith',
    'your', 'this', 'that', 'them', 'with', 'from', 'into',
  ]);
  const leaks = (q: string, a: string): boolean => {
    const ql = ` ${q.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
    const words = a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const meaningful = words.filter((w) => w.length >= 4);
    if (meaningful.length === 0) return false; // short answers exempt (rarely leak)
    if (words.length === 1) return ql.includes(` ${words[0]} `); // single-word answer present = leak
    if (ql.includes(` ${words.join(' ')} `)) return true; // whole phrase present
    return meaningful.some((w) => !GENERIC.has(w) && ql.includes(` ${w} `)); // distinctive word present
  };
  for (const pack of PACKS) {
    it(`${pack.name}`, () => {
      const bad: string[] = [];
      for (const qs of Object.values(pack.letters)) {
        for (const q of qs) {
          if (leaks(q.q, q.a)) bad.push(`"${q.a}" ⟵ ${q.q}`);
        }
      }
      expect(bad, `Answer leaks in "${pack.name}" (${bad.length}):\n${bad.join('\n')}`).toEqual([]);
    });
  }
});

describe('EVERY pack: names in natural spoken order, not "Surname, First" (rule 8)', () => {
  // Index-card order ("Einstein, Albert") reads as a database row AND mis-files the
  // question under the surname's letter. Flag a two-token "Word, Word" answer — but
  // SKIP title-based packs, where comma titles are legitimate ("Crouching Tiger,
  // Hidden Dragon"; "Hello, Goodbye").
  const SURNAME_FIRST = /^[A-Z][a-z]+,\s+[A-Z][a-z]+$/;
  const TITLE_PACK = /movies|songs|melodies|music|charades|screen|clips|tv-/;
  for (const pack of PACKS) {
    if (TITLE_PACK.test(pack.id)) continue;
    it(`${pack.name}`, () => {
      const bad: string[] = [];
      for (const qs of Object.values(pack.letters)) {
        for (const q of qs) if (SURNAME_FIRST.test(q.a.trim())) bad.push(q.a);
      }
      expect(bad, `"Surname, First" answers in "${pack.name}":\n${bad.join('\n')}`).toEqual([]);
    });
  }
});

describe('Guess the Melody: every answer is a full piece name, not a bare composer', () => {
  // Regression for the "sometimes it just says Beethoven / Pachelbel" inconsistency.
  // A melody answer must never be a lone composer surname — it must name the WORK.
  const COMPOSERS = new Set([
    'beethoven', 'mozart', 'bach', 'pachelbel', 'chopin', 'liszt', 'tchaikovsky', 'vivaldi',
    'debussy', 'satie', 'grieg', 'bizet', 'rossini', 'wagner', 'elgar', 'holst', 'gershwin',
    'mussorgsky', 'orff', 'barber', 'dvorak', 'dvořák', 'prokofiev', 'handel', 'puccini',
    'smetana', 'ravel', 'schubert', 'strauss', 'brahms', 'sibelius', 'mendelssohn', 'joplin',
    'albinoni', 'khachaturian', 'massenet', 'monti', 'faure', 'fauré', 'rimsky-korsakov',
  ]);
  const melodies = PACKS.find((p) => p.id === 'melodies');
  it('melodies pack is registered', () => expect(melodies).toBeTruthy());
  it('no answer is a lone composer surname', () => {
    const bad: string[] = [];
    for (const qs of Object.values(melodies!.letters)) {
      for (const q of qs) {
        if (COMPOSERS.has(q.a.trim().toLowerCase())) bad.push(q.a);
      }
    }
    expect(bad, `Composer-only melody answers:\n${bad.join('\n')}`).toEqual([]);
  });
});
