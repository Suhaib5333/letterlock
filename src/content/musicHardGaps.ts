import type { RawQuestion } from '../core/packs';

/**
 * Top-up questions for the Music · Hard pack — fills the skinny letters
 * (E, Q, V, U, X, Y, Z) so small boards always have an answerable hex.
 * Deep-cut material: classical composers, jazz, prog rock, world music,
 * obscure indie, music theory. Authored against existing `allAnswers` to
 * avoid duplicates.
 */
export const musicHardGaps: Record<string, RawQuestion[]> = {
  E: [
    {
      q: 'The avant-garde bass clarinettist and alto saxophonist whose 1964 album "Out to Lunch!" is a landmark of free jazz; he died in Berlin that same year, aged 36.',
      a: 'Eric Dolphy',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The American singer-songwriter whose 1997 album "Either/Or" and Oscar-nominated song from the Gus Van Sant film "Good Will Hunting" defined indie melancholy in the late 1990s.',
      a: 'Elliott Smith',
      category: 'music',
      difficulty: 4,
    },
    {
      q: 'The French composer of "Gymnopédies" and "Gnossiennes" who coined the term "furniture music" and was a major influence on Debussy and Ravel.',
      a: 'Erik Satie',
      category: 'music',
      difficulty: 3,
    },
    {
      q: 'The Italian film composer of more than 400 scores, including the music for Sergio Leone\'s spaghetti westerns and Brian De Palma\'s "The Untouchables".',
      a: 'Ennio Morricone',
      category: 'music',
      difficulty: 3,
    },
    {
      q: 'The lead guitarist of Funkadelic whose ten-minute solo on the 1971 track "Maggot Brain" is regularly ranked among the greatest in rock history.',
      a: 'Eddie Hazel',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'Edward Elgar\'s 1899 orchestral set of fourteen pieces, dedicated "to my friends pictured within"; each variation portrays a different person identified only by initials or a nickname.',
      a: 'Enigma Variations',
      category: 'music',
      difficulty: 4,
    },
  ],
  Q: [
    {
      q: 'The American producer and arranger behind Michael Jackson\'s "Thriller", "Off the Wall" and "Bad"; a 28-time Grammy winner who also scored "The Color Purple".',
      a: 'Quincy Jones',
      category: 'music',
      difficulty: 3,
    },
    {
      q: 'Olivier Messiaen\'s 1941 chamber work for violin, clarinet, cello and piano, composed and premiered in a German prisoner-of-war camp.',
      a: 'Quartet for the End of Time',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'In opera, this Italian term for the highest soprano coloratura is exemplified by the showpiece aria "Der Hölle Rache" from Mozart\'s "The Magic Flute" — sung by the icy monarch of nocturnal darkness.',
      a: 'Queen of the Night',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The microtonal interval of fifty cents — exactly half of an equal-tempered semitone — used in Persian, Arabic and avant-garde Western music.',
      a: 'Quarter tone',
      category: 'music',
      difficulty: 4,
    },
  ],
  V: [
    {
      q: 'The Greek-born composer of the Oscar-winning score for "Chariots of Fire" and the soundtrack to "Blade Runner"; real name Evangelos Papathanassiou.',
      a: 'Vangelis',
      category: 'music',
      difficulty: 3,
    },
    {
      q: 'The Ukrainian-born American pianist whose 1928 Carnegie Hall debut electrified New York; famed for the Rachmaninoff Third concerto and a 1986 return concert in Moscow after a 61-year absence.',
      a: 'Vladimir Horowitz',
      category: 'music',
      difficulty: 4,
    },
    {
      q: 'The San Francisco jazz pianist who composed the trio score for the "Peanuts" animated specials, including "Linus and Lucy".',
      a: 'Vince Guaraldi',
      category: 'music',
      difficulty: 4,
    },
    {
      q: 'The Brazilian composer of the nine-suite cycle "Bachianas Brasileiras", which fuses the counterpoint of J.S. Bach with the folk music of his homeland.',
      a: 'Heitor Villa-Lobos',
      category: 'music',
      difficulty: 5,
    },
  ],
  U: [
    {
      q: 'The Egyptian contralto known across the Arab world as the "Star of the East", whose monthly Thursday radio broadcasts emptied Cairo\'s streets from the 1930s to the 1970s.',
      a: 'Umm Kulthum',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The German cabaret singer and actress, born in Münster in 1963, celebrated for her interpretations of Kurt Weill and Bertolt Brecht.',
      a: 'Ute Lemper',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The 2017 Björk album, her ninth studio release, featuring twelve flutes and the single "Blissing Me"; described by the Icelandic singer as her "Tinder album".',
      a: 'Utopia',
      category: 'music',
      difficulty: 4,
    },
    {
      q: 'Schubert\'s Symphony No. 8 in B minor (D. 759), of which only the first two movements were completed during the composer\'s lifetime; known by a two-word nickname describing its incomplete state.',
      a: 'Unfinished Symphony',
      category: 'music',
      difficulty: 4,
    },
  ],
  X: [
    {
      q: 'The Romanian-born Greek-French composer of stochastic, mathematically-derived works such as "Metastaseis" and "Pithoprakta"; also an architect who collaborated with Le Corbusier on the Philips Pavilion.',
      a: 'Iannis Xenakis',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The experimental American band led by Jamie Stewart since 2002, taking its name from a 1994 Tsui Hark film; their albums include "Knife Play" and "Fabulous Muscles".',
      a: 'Xiu Xiu',
      category: 'music',
      difficulty: 5,
    },
  ],
  Y: [
    {
      q: 'The Hoboken, New Jersey indie-rock trio led by Ira Kaplan and Georgia Hubley whose 1997 album "I Can Hear the Heart Beating as One" is an indie touchstone.',
      a: 'Yo La Tengo',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The Chattanooga-born jazz multi-instrumentalist (tenor sax, oboe, flute) whose 1961 album "Eastern Sounds" pioneered the fusion of jazz with non-Western instruments.',
      a: 'Yusef Lateef',
      category: 'music',
      difficulty: 5,
    },
    {
      q: 'The Belgian violinist and composer (1858–1931) for whom César Franck wrote his Violin Sonata in A major as a wedding gift; also composed six solo sonatas dedicated to fellow virtuosos.',
      a: 'Eugène Ysaÿe',
      category: 'music',
      difficulty: 5,
    },
  ],
  Z: [
    {
      q: 'The Baltimore-born rock composer who led the Mothers of Invention, satirised American culture on the 1968 album "We\'re Only in It for the Money", and wrote serious orchestral works for the London Symphony.',
      a: 'Frank Zappa',
      category: 'music',
      difficulty: 3,
    },
    {
      q: 'The Indian-born conductor who directed the Israel Philharmonic for nearly five decades and also led the Los Angeles Philharmonic and the New York Philharmonic.',
      a: 'Zubin Mehta',
      category: 'music',
      difficulty: 4,
    },
    {
      q: 'The American tenor saxophonist of the Woody Herman "Four Brothers" reed section, later co-leader of a long-running quintet with Al Cohn.',
      a: 'Zoot Sims',
      category: 'music',
      difficulty: 5,
    },
  ],
};
