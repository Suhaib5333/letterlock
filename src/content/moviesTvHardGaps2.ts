import type { RawQuestion } from '../core/packs';

/**
 * Movies & TV (Hard) — round-2 top-up for the skinny X letter.
 * Three additional deep-cut answers that don't duplicate the existing
 * X bucket (X-Men, Xala).
 */
export const moviesTvHardGaps2: Record<string, RawQuestion[]> = {
  X: [
    {
      q: 'Joan Chen\'s 1998 directorial debut, set during the Cultural Revolution, about a Chinese teenage city dweller exiled to the Tibetan grasslands to train with a horse herder.',
      a: 'Xiu Xiu: The Sent Down Girl',
      alt: ['xiu xiu', 'the sent down girl'],
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Third-Generation Chinese filmmaker whose career stretched from "Woman Basketball Player No. 5" (1957) through "Two Stage Sisters" and "Hibiscus Town" — the only Chinese director admitted to both the Academy and the DGA.',
      a: 'Xie Jin',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Robert Greenwald\'s 1980 American musical-fantasy film starring Olivia Newton-John as a roller-skating muse and Gene Kelly as a former big-band clarinettist opening a nightclub.',
      a: 'Xanadu',
      category: 'screen',
      difficulty: 4,
    },
  ],
};
