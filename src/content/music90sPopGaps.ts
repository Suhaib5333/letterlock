import type { RawQuestion } from '../core/packs';

const J: RawQuestion[] = [
  { q: 'Alaska-raised folk-pop singer-songwriter whose 1995 debut "Pieces of You" included "Who Will Save Your Soul" and "You Were Meant for Me".', a: 'Jewel', category: 'music', difficulty: 2 },
  { q: 'American pop-R&B icon, youngest sibling of a musical dynasty, whose 1993 self-titled album and 1997 "The Velvet Rope" dominated MTV.', a: 'Janet Jackson', category: 'music', difficulty: 2 },
  { q: 'British acid-jazz funk group fronted by Jay Kay, behind 1996\'s "Virtual Insanity" and its famous moving-floor music video.', a: 'Jamiroquai', category: 'music', difficulty: 2 },
  { q: 'American singer whose 1998 worldwide hit "Crush" peaked at number three on the Billboard Hot 100.', a: 'Jennifer Paige', category: 'music', difficulty: 3 },
  { q: 'ESPN-branded sports-stadium dance compilation series whose first volume dropped in 1995.', a: 'Jock Jams', category: 'music', difficulty: 3 },
  { q: 'American R&B singer behind 1998\'s "They Don\'t Know" and the 1995 duet "Are U Still Down" with 2Pac.', a: 'Jon B', category: 'music', difficulty: 3 },
];

const K: RawQuestion[] = [
  { q: 'American R&B brother duo, formerly of an early-90s vocal quartet, whose 1997 ballad "All My Life" topped the charts.', a: 'K-Ci & JoJo', category: 'music', difficulty: 2 },
  { q: 'Australian pop princess whose decade spanned "Better the Devil You Know" and 1994\'s sultry "Confide in Me".', a: 'Kylie Minogue', category: 'music', difficulty: 2 },
  { q: 'American new-jack-swing R&B crooner whose 1996 self-titled album went triple platinum on the back of "Twisted".', a: 'Keith Sweat', category: 'music', difficulty: 3 },
  { q: 'Atlanta tween rap duo whose 1992 smash "Jump" had kids everywhere wearing their clothes backwards.', a: 'Kris Kross', category: 'music', difficulty: 2 },
];

const P: RawQuestion[] = [
  { q: 'American singer-songwriter whose 1997 single "Where Have All the Cowboys Gone?" earned a Grammy for Best New Artist.', a: 'Paula Cole', category: 'music', difficulty: 3 },
  { q: 'American hip-hop duo whose 1991 dreamy single "Set Adrift on Memory Bliss" sampled Spandau Ballet\'s "True".', a: 'P.M. Dawn', category: 'music', difficulty: 3 },
  { q: 'Minneapolis purple icon whose 1990s output included "Cream", "Diamonds and Pearls" and a famously unpronounceable symbol.', a: 'Prince', category: 'music', difficulty: 2 },
  { q: 'Bad Boy Records mogul Sean Combs\'s late-90s rap moniker behind 1997\'s "I\'ll Be Missing You".', a: 'Puff Daddy', category: 'music', difficulty: 2 },
];

const Q: RawQuestion[] = [
  { q: 'British rock band whose "Bohemian Rhapsody" re-entered the charts in 1992 after appearing in "Wayne\'s World".', a: 'Queen', category: 'music', difficulty: 2 },
  { q: 'Newark-born rapper and actress whose 1993 album "Black Reign" included the Grammy-winning anti-misogyny anthem "U.N.I.T.Y.".', a: 'Queen Latifah', category: 'music', difficulty: 3 },
];

const U: RawQuestion[] = [
  { q: 'Guns N\' Roses 1991 simultaneously-released double album set, issued as parts I and II.', a: 'Use Your Illusion', category: 'music', difficulty: 3 },
  { q: 'TLC\'s 1999 "FanMail" single about self-image, body acceptance and resisting cosmetic pressure.', a: 'Unpretty', category: 'music', difficulty: 3 },
  { q: 'MC Hammer\'s 1990 parachute-pants smash that sampled Rick James\'s "Super Freak".', a: 'U Can\'t Touch This', category: 'music', difficulty: 2 },
  { q: 'Cardigans-style 1995 dance anthem by British house act Strike that reached number four on the UK singles chart.', a: 'U Sure Do', category: 'music', difficulty: 4 },
];

const Z: RawQuestion[] = [
  { q: 'American R&B duo Jean Norris and Renee Neufville behind the 1993 hit "Hey Mr. DJ".', a: 'Zhané', category: 'music', difficulty: 3 },
  { q: 'Jamaican reggae singer, eldest son of a legendary Tuff Gong figure, who led the Melody Makers through the 1990s.', a: 'Ziggy Marley', category: 'music', difficulty: 3 },
];

export const music90sPopGaps: Record<string, RawQuestion[]> = { J, K, P, Q, U, Z };
