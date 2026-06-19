import type { RawQuestion } from '../core/packs';

/**
 * Top-up questions for the Movies & TV (Hard) pack — fills the skinny letters
 * (I, Y, Z, H, K, U, X). Deeper-cut: classic, foreign, technical-credit,
 * less-mainstream films and TV. Authored against existing allAnswers to avoid
 * duplicates.
 */
export const moviesTvHardGaps: Record<string, RawQuestion[]> = {
  I: [
    {
      q: 'Pioneering British-American actress turned filmmaker, one of the few women directing inside the 1950s Hollywood studio system; her credits include the 1953 noir "The Hitch-Hiker".',
      a: 'Ida Lupino',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Martin Scorsese\'s 1974 documentary about his own parents Charles and Catherine cooking and reminiscing in their Manhattan apartment.',
      a: 'Italianamerican',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Frank Capra\'s 1946 Christmas-set fable starring James Stewart as a small-town banker shown by an angel what his hometown would look like if he had never been born.',
      a: "It's a Wonderful Life",
      category: 'screen',
      difficulty: 3,
    },
  ],
  Y: [
    {
      q: 'Alfonso Cuarón\'s 2001 Mexican road movie about two teenage boys and an older woman driving to a fictional beach called "Heaven\'s Mouth".',
      a: 'Y Tu Mamá También',
      category: 'screen',
      difficulty: 4,
    },
    {
      q: 'Akira Kurosawa\'s 1961 samurai film in which a masterless ronin plays two rival merchant gangs against each other in a wind-blown town; later remade as "A Fistful of Dollars".',
      a: 'Yojimbo',
      category: 'screen',
      difficulty: 4,
    },
    {
      q: 'Edward Yang\'s nearly-three-hour 2000 Taiwanese family epic following a Taipei engineer, his wife, daughter and small son over the course of a year.',
      a: 'Yi Yi',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Michael Cimino\'s 1985 New York crime drama starring Mickey Rourke as a police captain at war with a Chinatown triad boss.',
      a: 'Year of the Dragon',
      category: 'screen',
      difficulty: 5,
    },
  ],
  Z: [
    {
      q: 'Michael Cacoyannis\'s 1964 black-and-white film, set on Crete, in which Anthony Quinn plays the exuberant peasant who teaches a buttoned-up Englishman to dance on the beach.',
      a: 'Zorba the Greek',
      category: 'screen',
      difficulty: 4,
    },
    {
      q: 'Woody Allen\'s 1983 mockumentary, shot in pastiche newsreel style, about a human chameleon who unconsciously transforms to resemble whomever stands beside him.',
      a: 'Zelig',
      category: 'screen',
      difficulty: 4,
    },
    {
      q: 'Long-running Japanese film and television franchise about a wandering blind masseur and master swordsman of the Edo period, originally played by Shintaro Katsu.',
      a: 'Zatoichi',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Louis Malle\'s 1960 French comedy, adapted from a Raymond Queneau novel, about a precocious little provincial girl visiting her transvestite uncle in Paris and longing to ride the underground.',
      a: 'Zazie dans le Métro',
      alt: ['zazie in the metro'],
      category: 'screen',
      difficulty: 5,
    },
  ],
  H: [
    {
      q: 'Indiana-born classical Hollywood director equally adept at every genre — the screwball "Bringing Up Baby", the western "Red River", the noir "The Big Sleep" and the war picture "Sergeant York".',
      a: 'Howard Hawks',
      category: 'screen',
      difficulty: 4,
    },
    {
      q: 'Taiwanese master of long static takes whose films include the 1989 historical drama "A City of Sadness" and the 2015 wuxia "The Assassin".',
      a: 'Hou Hsiao-hsien',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Howard Hawks\'s 1940 screwball remake of "The Front Page" starring Cary Grant as a fast-talking newspaper editor and Rosalind Russell as his ace reporter ex-wife.',
      a: 'His Girl Friday',
      category: 'screen',
      difficulty: 4,
    },
  ],
  K: [
    {
      q: 'Japanese director, a contemporary of Kurosawa and Mizoguchi at Shochiku studios, known for the 1958 mountain-village film "The Ballad of Narayama" and "Twenty-Four Eyes".',
      a: 'Keisuke Kinoshita',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Abel Ferrara\'s 1990 crime film in which Christopher Walken plays a recently-released drug lord trying to reclaim the Manhattan underworld and finance a hospital in the South Bronx.',
      a: 'King of New York',
      category: 'screen',
      difficulty: 4,
    },
    {
      q: 'Ken Loach\'s 1969 Yorkshire-set drama about a working-class schoolboy who finds purpose training a young kestrel he takes from a nest.',
      a: 'Kes',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: "Roman Polanski's 1962 Polish debut, a taut three-hander aboard a small sailing boat on the Mazurian lakes; the director's only Polish-language feature.",
      a: 'Knife in the Water',
      category: 'screen',
      difficulty: 5,
    },
  ],
  U: [
    {
      q: 'German stage and screen actor who played the surveillance officer Wiesler in the 2006 Oscar-winning drama "The Lives of Others".',
      a: 'Ulrich Mühe',
      category: 'screen',
      difficulty: 5,
    },
    {
      q: 'Jean-Luc Godard\'s 1961 colour musical comedy starring Anna Karina as a Parisian stripper determined to have a baby within three days.',
      a: 'Une Femme est une Femme',
      alt: ['a woman is a woman'],
      category: 'screen',
      difficulty: 5,
    },
    {
      q: "Jonathan Glazer's 2013 Scottish-set science-fiction film starring Scarlett Johansson as an extraterrestrial driving a van around Glasgow preying on lone men.",
      a: 'Under the Skin',
      category: 'screen',
      difficulty: 4,
    },
  ],
  X: [
    {
      q: 'Ousmane Sembène\'s 1975 Senegalese satire in which a polygamous Dakar businessman is struck with a humiliating curse of impotence on the night of his third wedding.',
      a: 'Xala',
      category: 'screen',
      difficulty: 5,
    },
  ],
};
