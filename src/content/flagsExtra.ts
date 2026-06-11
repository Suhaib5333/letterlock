import type { RawQuestion } from '../core/packs';

/**
 * Additional flag questions, kept separate from flags.ts to avoid duplicating
 * any country already used there. Same image source (flagcdn.com) and helper
 * format. Each entry is bucketed under the FIRST LETTER of the country name.
 */
const flag = (code: string): string => `https://flagcdn.com/${code}.svg`;
const PROMPT = 'Which country does this flag belong to?';

function q(country: string, code: string, alt?: string[]): RawQuestion {
  return { q: PROMPT, a: country, image: flag(code), ...(alt ? { alt } : {}) };
}

// ~30 more WELL-KNOWN countries (none duplicate flags.ts Easy/Medium/Hard).
export const flagsEasyExtra: Record<string, RawQuestion[]> = {
  A: [q('Austria', 'at')],
  C: [q('Chile', 'cl'), q('Colombia', 'co'), q('Czechia', 'cz', ['czech republic'])],
  H: [q('Hungary', 'hu')],
  I: [q('Indonesia', 'id'), q('Israel', 'il')],
  N: [q('New Zealand', 'nz'), q('Nigeria', 'ng')],
  P: [q('Peru', 'pe'), q('Philippines', 'ph', ['the philippines'])],
  Q: [q('Qatar', 'qa')],
  S: [
    q('Saudi Arabia', 'sa'),
    q('Singapore', 'sg'),
    q('South Africa', 'za'),
    q('South Korea', 'kr'),
  ],
  U: [
    q('Ukraine', 'ua'),
    q('United Arab Emirates', 'ae', ['uae', 'emirates']),
  ],
};

// ~40 moderately-known countries (none duplicate flags.ts or Easy above).
export const flagsMediumExtra: Record<string, RawQuestion[]> = {
  A: [q('Algeria', 'dz'), q('Armenia', 'am'), q('Azerbaijan', 'az')],
  B: [
    q('Bahrain', 'bh'),
    q('Belarus', 'by'),
    q('Bosnia and Herzegovina', 'ba', ['bosnia']),
  ],
  C: [q('Cambodia', 'kh'), q('Costa Rica', 'cr'), q('Cuba', 'cu'), q('Cyprus', 'cy')],
  E: [q('Ethiopia', 'et')],
  L: [q('Latvia', 'lv'), q('Luxembourg', 'lu')],
  M: [
    q('Mongolia', 'mn'),
    q('Montenegro', 'me'),
    q('Myanmar', 'mm'),
  ],
  N: [q('North Macedonia', 'mk', ['macedonia'])],
  O: [q('Oman', 'om')],
  P: [q('Panama', 'pa'), q('Paraguay', 'py')],
  S: [q('Sri Lanka', 'lk')],
  T: [q('Tanzania', 'tz'), q('Tunisia', 'tn')],
};

// ~40 lesser-known / tricky flags (none duplicate any list above or flags.ts).
export const flagsHardExtra: Record<string, RawQuestion[]> = {
  A: [q('Afghanistan', 'af'), q('Andorra', 'ad'), q('Antigua and Barbuda', 'ag')],
  B: [
    q('Barbados', 'bb'),
    q('Belize', 'bz'),
    q('Benin', 'bj'),
    q('Burkina Faso', 'bf'),
    q('Burundi', 'bi'),
  ],
  C: [
    q('Cameroon', 'cm'),
    q('Chad', 'td'),
    q('Congo', 'cg', ['republic of the congo']),
  ],
  D: [q('Dominica', 'dm')],
  E: [q('El Salvador', 'sv'), q('Equatorial Guinea', 'gq')],
  G: [
    q('Gambia', 'gm', ['the gambia']),
    q('Grenada', 'gd'),
    q('Guatemala', 'gt'),
    q('Guinea', 'gn'),
  ],
  H: [q('Haiti', 'ht'), q('Honduras', 'hn')],
  K: [q('Kosovo', 'xk')],
  L: [q('Liberia', 'lr'), q('Liechtenstein', 'li')],
  M: [
    q('Madagascar', 'mg'),
    q('Malawi', 'mw'),
    q('Mali', 'ml'),
    q('Malta', 'mt'),
    q('Mauritius', 'mu'),
    q('Micronesia', 'fm'),
    q('Moldova', 'md'),
    q('Mozambique', 'mz'),
  ],
  N: [q('Nicaragua', 'ni'), q('Niger', 'ne')],
  P: [q('Palau', 'pw')],
  R: [q('Rwanda', 'rw')],
  S: [
    q('Samoa', 'ws'),
    q('San Marino', 'sm'),
    q('Senegal', 'sn'),
    q('Solomon Islands', 'sb'),
    q('Somalia', 'so'),
    q('South Sudan', 'ss'),
    q('Sudan', 'sd'),
  ],
  T: [q('Togo', 'tg'), q('Trinidad and Tobago', 'tt'), q('Tuvalu', 'tv')],
  U: [q('Uganda', 'ug')],
  Y: [q('Yemen', 'ye')],
};
