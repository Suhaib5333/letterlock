import type { RawQuestion } from '../core/packs';

// Top-up entries for the 80s Pop pack — fills the thin Q/U/X/Z buckets so a
// small board can always serve a fair question on those letters. Every answer
// is a real 1980s pop entity (song, artist, or band) that released or peaked
// between 1980 and 1989, and every clue is a clean one-fact prompt that never
// names its own answer.

export const music80sPopGaps: Record<string, RawQuestion[]> = {
  Q: [
    {
      q: "Portland-based new wave group whose saxophone-led 1981 single 'Harden My Heart' peaked at Billboard #3.",
      a: 'Quarterflash',
      category: '80s-pop',
      difficulty: 3,
    },
    {
      q: "Juice Newton's 1981 country-pop crossover that spent two weeks at Billboard #2 about a wandering lover and a playing card.",
      a: 'Queen of Hearts',
      category: '80s-pop',
      difficulty: 3,
    },
  ],
  U: [
    {
      q: "Billy Joel's 1983 doo-wop-styled hit, inspired by his romance with Christie Brinkley, about a downtown boy chasing someone from the rich side of town.",
      a: 'Uptown Girl',
      category: '80s-pop',
      difficulty: 2,
    },
    {
      q: "1981 Queen and David Bowie collaboration whose iconic bassline was later sampled by Vanilla Ice for 'Ice Ice Baby'.",
      a: 'Under Pressure',
      category: '80s-pop',
      difficulty: 2,
    },
    {
      q: "Joe Cocker and Jennifer Warnes duet from the 1982 film 'An Officer and a Gentleman' that won the Academy Award for Best Original Song.",
      a: 'Up Where We Belong',
      category: '80s-pop',
      difficulty: 3,
    },
  ],
  X: [
    {
      q: "Swindon-formed English new wave band led by Andy Partridge whose 1982 single 'Senses Working Overtime' broke the UK Top 10.",
      a: 'XTC',
      category: '80s-pop',
      difficulty: 3,
    },
  ],
  Z: [
    {
      q: "Bearded Texas blues-rock trio whose 1983 album 'Eliminator' produced 'Legs' and 'Sharp Dressed Man' on heavy MTV rotation.",
      a: 'ZZ Top',
      category: '80s-pop',
      difficulty: 2,
    },
  ],
};
