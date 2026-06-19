import type { RawQuestion } from '../core/packs';

// Top-up answers for the 2000s Hip-Hop & R&B pack: skinny letters U (4), V (2).
// Strictly 2000-2009. Every answer is fresh vs the base pack's allAnswers; no answer-leak in q.
export const music00sHipHopGaps: Record<string, RawQuestion[]> = {
  U: [
    {
      q: 'Jay-Z used this defiant Blueprint cut to brush off a rival, the title aimed straight at anyone who thinks they have his number — 2002 album track that became a fan-favourite battle line.',
      a: "U Don't Know",
      category: '00s-hiphop',
      difficulty: 3,
    },
    {
      q: 'Houston-bred Southern rap duo of Bun B and Pimp C whose 2007 verse on Outkast\'s "Int\'l Players Anthem" is widely cited as one of the decade\'s greatest hip-hop guest spots; abbreviated form of the group\'s longer name.',
      a: 'UGK',
      alt: ['Underground Kingz'],
      category: '00s-hiphop',
      difficulty: 3,
    },
    {
      q: 'Jamie Foxx\'s 2005 chart-topping R&B single featuring Ludacris from his album of the same name — the title is a four-syllable word meaning hard to anticipate.',
      a: 'Unpredictable',
      category: '00s-hiphop',
      difficulty: 2,
    },
    {
      q: 'D\'Angelo\'s January-2000 neo-soul single, infamous for a sparse black-and-white video of the singer nude on a dark backdrop, that tops critics\' lists of the decade\'s greatest R&B songs; the released track carries no proper name, presented in brackets followed by a parenthetical four-word question.',
      a: 'Untitled (How Does It Feel)',
      alt: ['Untitled'],
      category: '00s-hiphop',
      difficulty: 3,
    },
  ],
  V: [
    {
      q: 'Bay-Area crew The Pack\'s breakout 2006 single named for a slip-on skate shoe, one of the earliest hyphy hits to crossover nationally on radio.',
      a: 'Vans',
      category: '00s-hiphop',
      difficulty: 3,
    },
    {
      q: 'D\'Angelo\'s long-gestating 2000 second studio album, an instant neo-soul landmark featuring "Untitled (How Does It Feel)"; one-word title shares its name with a Haitian folk-religion.',
      a: 'Voodoo',
      category: '00s-hiphop',
      difficulty: 3,
    },
  ],
};
