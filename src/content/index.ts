import { DIFFICULTY_RANK, normalizePack, type QuestionPack, type RawPack } from '../core/packs';
import { generalKnowledgePack } from './generalKnowledge';
import { extraGeneralKnowledge } from './generalKnowledge2';
import { extraGeneralKnowledge3 } from './generalKnowledge3';
import { kidsPack } from './kids';
import { extraKids } from './kids2';
import { flagsEasyPack, flagsMediumPack, flagsHardPack } from './flags';
import { historyPack } from './history';
import { spacePack } from './space';
import { geniusPack } from './genius';

/**
 * Re-bucket every question under the letter its ANSWER actually starts with.
 * This is the single source of truth for the core mechanic and corrects any
 * mis-keyed authoring (e.g. a question filed by its subject rather than answer).
 */
function rebucketByAnswer(pack: RawPack): RawPack {
  const letters: RawPack['letters'] = {};
  for (const qs of Object.values(pack.letters)) {
    for (const q of qs) {
      const k = q.a.trim()[0]?.toUpperCase();
      if (!k || k < 'A' || k > 'Z') continue; // skip non A–Z answers
      (letters[k] ??= []).push(q);
    }
  }
  return { ...pack, letters };
}

/** Merge one or more extra letter→questions maps into a base pack. */
function withExtra(base: RawPack, ...extras: Record<string, RawPack['letters'][string]>[]): RawPack {
  const letters: RawPack['letters'] = {};
  for (const [letter, qs] of Object.entries(base.letters)) letters[letter] = [...qs];
  for (const extra of extras) {
    for (const [letter, qs] of Object.entries(extra)) {
      letters[letter] = [...(letters[letter] ?? []), ...qs];
    }
  }
  return { ...base, letters };
}

const fullGeneralKnowledge = withExtra(generalKnowledgePack, extraGeneralKnowledge, extraGeneralKnowledge3);
const fullKids = withExtra(kidsPack, extraKids);

/** Build a themed pack by filtering the GK pack to a set of categories. */
function themedFrom(
  base: RawPack,
  meta: Pick<RawPack, 'id' | 'name' | 'description' | 'emoji' | 'accent' | 'difficulty'>,
  categories: Set<string>,
): RawPack {
  const letters: RawPack['letters'] = {};
  for (const [letter, qs] of Object.entries(base.letters)) {
    const filtered = qs.filter((q) => q.category && categories.has(q.category));
    if (filtered.length > 0) letters[letter] = filtered;
  }
  return { ...base, ...meta, locale: base.locale, contentRating: 'everyone', letters };
}

const sciencePack = themedFrom(
  fullGeneralKnowledge,
  {
    id: 'science-nature',
    name: 'Science & Nature',
    description: 'Planets, animals, the body and the natural world.',
    emoji: '🔬',
    accent: '#0a9396',
    difficulty: 'medium',
  },
  new Set(['science', 'nature', 'biology', 'maths']),
);

const worldPack = themedFrom(
  fullGeneralKnowledge,
  {
    id: 'world-geography',
    name: 'World Geography',
    description: 'Capitals, countries, rivers and continents around the globe.',
    emoji: '🗺️',
    accent: '#9b2226',
    difficulty: 'medium',
  },
  new Set(['geography']),
);

/** All packs, sorted easiest → hardest for the selector. */
export const PACKS: QuestionPack[] = [
  fullKids,
  fullGeneralKnowledge,
  flagsEasyPack,
  flagsMediumPack,
  sciencePack,
  worldPack,
  historyPack,
  spacePack,
  flagsHardPack,
  geniusPack,
]
  .map((p) => normalizePack(rebucketByAnswer(p)))
  .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);

export const DEFAULT_PACK_ID = fullGeneralKnowledge.id;

export function packById(id: string): QuestionPack {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}
