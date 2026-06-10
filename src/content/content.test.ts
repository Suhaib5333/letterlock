import { describe, expect, it } from 'vitest';
import { answerableLetters, normalizePack, serveQuestion } from '../core/packs';
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
      expect(answerableLetters(pack).length).toBeGreaterThanOrEqual(16);
    });
  }
});
