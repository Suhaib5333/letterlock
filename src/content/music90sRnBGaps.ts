import type { RawQuestion } from '../core/packs';

// Top-up answers for the 90s R&B pack: skinny letters G (4), K (3), P (4), V (1), X (1), Q (1).
// Every entry is fresh vs the base pack's allAnswers (Ginuwine, Groove Theory, Gotham City,
// G.H.E.T.T.O.U.T., K-Ci & JoJo, Killing Me Softly, Knockin' Da Boots, Pony, Poison,
// Pretty Brown Eyes, Portrait, Vision of Love, Xscape, Queen of the Night).
// Strictly 1990–1999. No answer-leak in the question.
export const music90sRnBGaps: Record<string, RawQuestion[]> = {
  G: [
    { q: "Cleveland-bred crooner — son of the O'Jays' frontman Eddie — whose 1991 solo debut 'Private Line' spun off the 1992 quiet-storm single 'Baby Hold On to Me'.", a: 'Gerald Levert', category: '90s-rnb' },
    { q: "Seattle trio Dignity Respect Sincerity's mournful 1993 platinum single about a fallen homie, rolling on a slow West Coast beat.", a: 'Gangsta Lean', category: '90s-rnb' },
    { q: "Teddy Riley's new jack swing trio whose 1990 album 'The Future' produced the slow-jam standard 'Let's Chill'.", a: 'Guy', category: '90s-rnb' },
    { q: "Keith Sweat's 1994 self-produced fourth studio album whose title track invited a lover to climb aboard.", a: 'Get Up on It', category: '90s-rnb' },
  ],
  K: [
    { q: "Harlem-bred new jack swing crooner whose 1990 sophomore album 'I'll Give All My Love to You' and 1991 follow-up 'Keep It Comin'' kept the slow jams flowing.", a: 'Keith Sweat', category: '90s-rnb' },
    { q: "Washington-born baritone whose 1996 self-titled debut yielded the silky ballad 'For You'.", a: 'Kenny Lattimore', category: '90s-rnb' },
    { q: "Los Angeles-born singer married to producer Terry Lewis whose 1991 #1 ballad 'Romantic' came off the Jam-and-Lewis-helmed album 'Ritual of Love'.", a: 'Karyn White', category: '90s-rnb' },
  ],
  P: [
    { q: "Perri McKissack — the singer whose 1990 single 'Giving You the Benefit' came off the album 'Always' and who married producer L.A. Reid.", a: 'Pebbles', category: '90s-rnb' },
    { q: "Philly soul legend who returned to the charts in 1994 with the Babyface-helmed single 'Right Kinda Lover' from the album 'Gems'.", a: 'Patti LaBelle', category: '90s-rnb' },
    { q: "New Jersey duo of Attrell and Jarrett Cordes whose 1991 Spandau Ballet-sampling single 'Set Adrift on Memory Bliss' hit #1.", a: 'P.M. Dawn', category: '90s-rnb', alt: ['PM Dawn'] },
    { q: "Barry White's 1994 comeback album whose title urged listeners to live by their own sermons.", a: 'Practice What You Preach', category: '90s-rnb' },
  ],
  V: [
    { q: "Former Miss America turned R&B singer whose 1992 Linda Ronstadt-covering ballad spent five weeks at #1 and capped the album 'The Comfort Zone'.", a: 'Vanessa Williams', category: '90s-rnb' },
  ],
  X: [
    { q: "Shabba Ranks's 1992 Epic LP — the dancehall-meets-R&B set behind the crossover smash 'Mr. Loverman' that won the Best Reggae Album Grammy.", a: 'Xtra Naked', category: '90s-rnb' },
  ],
  Q: [
    { q: "Producer-mogul whose 1995 all-star album 'Jook Joint' paired Brandy, Tamia and Babyface on the single 'You Put a Move on My Heart'.", a: 'Quincy Jones', category: '90s-rnb' },
  ],
};
