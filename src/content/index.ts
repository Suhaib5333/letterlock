import { normalizePack, type QuestionPack, type RawPack } from '../core/packs';
import { generalKnowledgePack } from './generalKnowledge';
import { extraGeneralKnowledge } from './generalKnowledge2';
import { kidsPack } from './kids';
import { flagsEasyPack, flagsMediumPack, flagsHardPack } from './flags';

/** Merge an extra letter→questions map into a base pack. */
function withExtra(base: RawPack, extra: Record<string, RawPack['letters'][string]>): RawPack {
  const letters: RawPack['letters'] = {};
  for (const [letter, qs] of Object.entries(base.letters)) letters[letter] = [...qs];
  for (const [letter, qs] of Object.entries(extra)) {
    letters[letter] = [...(letters[letter] ?? []), ...qs];
  }
  return { ...base, letters };
}

const fullGeneralKnowledge = withExtra(generalKnowledgePack, extraGeneralKnowledge);

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

export const PACKS: QuestionPack[] = [
  fullGeneralKnowledge,
  kidsPack,
  flagsEasyPack,
  flagsMediumPack,
  flagsHardPack,
  sciencePack,
  worldPack,
].map((p) => normalizePack(p));

export const DEFAULT_PACK_ID = fullGeneralKnowledge.id;

export function packById(id: string): QuestionPack {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}
