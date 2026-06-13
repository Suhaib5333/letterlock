import type { RawPack, RawQuestion } from '../core/packs';

/**
 * Flag packs. Each question shows a country's flag (from the free flagcdn.com CDN)
 * and the answer is the country's name. The board letters are HIDDEN for these packs
 * (hideBoardLetters) so the first letter never gives the answer away.
 */
// Bundled locally (public/flags/, via scripts/genflags.mjs) so flags always load
// from our own origin — flagcdn.com can be blocked/slow on some networks.
const flag = (code: string): string => `/flags/${code}.svg`;
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
  hideBoardLetters: true,
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
  hideBoardLetters: true,
  letters: {
    A: [q('Austria', 'at'), q('Albania', 'al')],
    B: [q('Bangladesh', 'bd'), q('Bolivia', 'bo'), q('Bulgaria', 'bg')],
    C: [q('Croatia', 'hr'), q('Colombia', 'co'), q('Chile', 'cl')],
    D: [q('Dominican Republic', 'do')],
    E: [q('Ecuador', 'ec'), q('Estonia', 'ee')],
    F: [q('Fiji', 'fj')],
    G: [q('Ghana', 'gh'), q('Georgia', 'ge')],
    H: [q('Hungary', 'hu')],
    I: [q('Indonesia', 'id'), q('Iceland', 'is')],
    J: [q('Jordan', 'jo')],
    K: [q('Kazakhstan', 'kz'), q('Kuwait', 'kw')],
    L: [q('Lebanon', 'lb'), q('Lithuania', 'lt')],
    M: [q('Morocco', 'ma'), q('Malaysia', 'my')],
    N: [q('Nigeria', 'ng'), q('Nepal', 'np')],
    P: [q('Peru', 'pe'), q('Pakistan', 'pk')],
    Q: [q('Qatar', 'qa')],
    R: [q('Romania', 'ro')],
    S: [q('Slovakia', 'sk'), q('Slovenia', 'si'), q('Serbia', 'rs')],
    U: [q('Ukraine', 'ua'), q('Uruguay', 'uy')],
    V: [q('Venezuela', 've')],
  },
};

export const flagsHardPack: RawPack = {
  id: 'flags-hard',
  name: 'World Flags · Hard',
  description: 'For flag experts — obscure nations worldwide.',
  locale: 'en',
  difficulty: 'expert',
  contentRating: 'everyone',
  emoji: '🎌',
  accent: '#bb3e03',
  hideBoardLetters: true,
  letters: {
    A: [q('Armenia', 'am'), q('Azerbaijan', 'az'), q('Angola', 'ao')],
    B: [q('Bhutan', 'bt'), q('Brunei', 'bn'), q('Botswana', 'bw')],
    C: [q('Comoros', 'km'), q('Cambodia', 'kh'), q('Cape Verde', 'cv')],
    D: [q('Djibouti', 'dj')],
    E: [q('Eritrea', 'er'), q('Eswatini', 'sz', ['swaziland'])],
    G: [q('Guyana', 'gy'), q('Gabon', 'ga')],
    K: [q('Kyrgyzstan', 'kg'), q('Kiribati', 'ki')],
    L: [q('Laos', 'la'), q('Lesotho', 'ls')],
    M: [q('Maldives', 'mv'), q('Mauritania', 'mr'), q('Myanmar', 'mm')],
    N: [q('Nauru', 'nr'), q('Namibia', 'na')],
    P: [q('Palau', 'pw'), q('Papua New Guinea', 'pg')],
    S: [q('Suriname', 'sr'), q('Seychelles', 'sc'), q('Sri Lanka', 'lk')],
    T: [q('Tajikistan', 'tj'), q('Turkmenistan', 'tm'), q('Tonga', 'to')],
    U: [q('Uzbekistan', 'uz')],
    V: [q('Vanuatu', 'vu')],
    Z: [q('Zambia', 'zm'), q('Zimbabwe', 'zw')],
  },
};
