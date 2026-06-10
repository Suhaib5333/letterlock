import { normalizePack, type QuestionPack, type RawPack } from '../core/packs';
import { generalKnowledgePack } from './generalKnowledge';
import { kidsPack } from './kids';
import { flagsEasyPack, flagsMediumPack } from './flags';

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
  generalKnowledgePack,
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
  generalKnowledgePack,
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
  generalKnowledgePack,
  kidsPack,
  flagsEasyPack,
  flagsMediumPack,
  sciencePack,
  worldPack,
].map((p) => normalizePack(p));

export const DEFAULT_PACK_ID = generalKnowledgePack.id;

export function packById(id: string): QuestionPack {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}
