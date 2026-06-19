import type { RawQuestion } from '../core/packs';

// Round-2 top-up for the 2010s Hip-Hop & R&B pack — adds fresh entries on the
// still-thin U and X buckets. Every answer is a real 2010-2019 hip-hop/R&B
// entity (song, artist, or album), distinct from the base pack's allAnswers
// and from the first gaps file. Every clue is a single clean fact that never
// names its own answer.

export const music10sHipHopGaps2: Record<string, RawQuestion[]> = {
  U: [
    {
      q: "Rocko's 2013 trap anthem featuring verses from Future and Rick Ross, whose acronym title translates to a defiant boast about not knowing one's whereabouts.",
      a: 'U.O.E.N.O.',
      alt: ['UOENO', 'You Ain\'t Even Know It'],
      category: '10s-hiphop',
      difficulty: 3,
    },
    {
      q: "French Montana's 2017 diamond-certified ballad featuring Swae Lee, whose Uganda-shot video became one of the most-viewed hip-hop clips on YouTube.",
      a: 'Unforgettable',
      category: '10s-hiphop',
      difficulty: 2,
    },
  ],
  X: [
    {
      q: "Chris Brown's 2014 sixth studio album whose lead single 'Loyal' featured Lil Wayne and Tyga and went six-times platinum.",
      a: 'X',
      category: '10s-hiphop',
      difficulty: 3,
    },
  ],
};
