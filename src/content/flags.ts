import type { RawPack, RawQuestion } from '../core/packs';

/**
 * Flag packs. Each question shows a country's flag (from the free flagcdn.com CDN)
 * and the answer is the country's name — which starts with the hex's letter, so the
 * core Blockbusters mechanic still holds. Easy = well-known nations; Medium = trickier.
 */
const flag = (code: string): string => `https://flagcdn.com/${code}.svg`;
const PROMPT = 'Which country does this flag belong to?';

function q(country: string, code: string, alt?: string[]): RawQuestion {
  return { q: PROMPT, a: country, image: flag(code), ...(alt ? { alt } : {}) };
}

export const flagsEasyPack: RawPack = {
  id: 'flags-easy',
  name: 'World Flags · Easy',
  description: 'Identify well-known countries by their flag.',
  locale: 'en',
  difficulty: 'easy',
  contentRating: 'everyone',
  emoji: '🚩',
  accent: '#2a9d8f',
  letters: {
    A: [q('Argentina', 'ar'), q('Australia', 'au')],
    B: [q('Brazil', 'br'), q('Belgium', 'be')],
    C: [q('Canada', 'ca'), q('China', 'cn')],
    D: [q('Denmark', 'dk')],
    E: [q('Egypt', 'eg')],
    F: [q('France', 'fr'), q('Finland', 'fi')],
    G: [q('Germany', 'de'), q('Greece', 'gr')],
    I: [q('Italy', 'it'), q('India', 'in'), q('Ireland', 'ie')],
    J: [q('Japan', 'jp'), q('Jamaica', 'jm')],
    K: [q('Kenya', 'ke')],
    M: [q('Mexico', 'mx')],
    N: [q('Norway', 'no'), q('Netherlands', 'nl', ['the netherlands', 'holland'])],
    P: [q('Portugal', 'pt'), q('Poland', 'pl')],
    R: [q('Russia', 'ru')],
    S: [q('Spain', 'es'), q('Sweden', 'se'), q('Switzerland', 'ch')],
    T: [q('Turkey', 'tr'), q('Thailand', 'th')],
    U: [q('United States', 'us', ['usa', 'america', 'united states of america'])],
    V: [q('Vietnam', 'vn')],
  },
};

export const flagsMediumPack: RawPack = {
  id: 'flags-medium',
  name: 'World Flags · Medium',
  description: 'Trickier flags from every continent.',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🏴',
  accent: '#6a4c93',
  letters: {
    A: [q('Austria', 'at'), q('Albania', 'al')],
    B: [q('Bangladesh', 'bd'), q('Bolivia', 'bo')],
    C: [q('Croatia', 'hr'), q('Colombia', 'co'), q('Chile', 'cl')],
    E: [q('Ecuador', 'ec'), q('Estonia', 'ee')],
    F: [q('Fiji', 'fj')],
    G: [q('Ghana', 'gh'), q('Georgia', 'ge')],
    H: [q('Hungary', 'hu')],
    I: [q('Indonesia', 'id'), q('Iceland', 'is')],
    K: [q('Kazakhstan', 'kz'), q('Kenya', 'ke')],
    L: [q('Lebanon', 'lb'), q('Lithuania', 'lt')],
    M: [q('Morocco', 'ma'), q('Malaysia', 'my')],
    N: [q('Nigeria', 'ng'), q('Nepal', 'np')],
    P: [q('Peru', 'pe'), q('Portugal', 'pt')],
    Q: [q('Qatar', 'qa')],
    R: [q('Romania', 'ro')],
    S: [q('Slovakia', 'sk'), q('Slovenia', 'si'), q('Serbia', 'rs')],
    U: [q('Ukraine', 'ua'), q('Uruguay', 'uy')],
    V: [q('Venezuela', 've')],
  },
};
