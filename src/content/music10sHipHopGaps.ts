import type { RawQuestion } from '../core/packs';

// Top-up entries for the 2010s Hip-Hop & R&B pack — fills the thin U/V/X/Y
// buckets. Every answer is a real 2010-2019 hip-hop/R&B entity (song, artist,
// or album) and is fresh vs the base pack's allAnswers list. Every clue is a
// single clean fact that never names its own answer.

export const music10sHipHopGaps: Record<string, RawQuestion[]> = {
  U: [
    {
      q: "Kanye West's 2019 worship-themed track from 'Jesus Is King' featuring Clipse and Kenny G on saxophone.",
      a: 'Use This Gospel',
      category: '10s-hiphop',
      difficulty: 3,
    },
    {
      q: 'Philadelphia rapper born Symere Woods whose breakthrough mixtape "Luv Is Rage" arrived in 2015 and whose first studio LP topped the Billboard 200 in 2017.',
      a: 'Lil Uzi Vert',
      category: '10s-hiphop',
      difficulty: 2,
    },
  ],
  V: [
    {
      q: "Eminem's 2018 single from 'Kamikaze' that doubled as the theme song for a Tom Hardy comic-book film about a Marvel antihero.",
      a: 'Venom',
      category: '10s-hiphop',
      difficulty: 2,
    },
    {
      q: "South London grime star Stormzy's 2019 single that debuted at number one on the UK Singles Chart, taking its title from a dance move he popularized.",
      a: 'Vossi Bop',
      category: '10s-hiphop',
      difficulty: 3,
    },
    {
      q: 'Chicago rapper, a Savemoney crew member and onetime Kids These Days frontman, whose 2013 mixtape "INNANETAPE" preceded his 2014 viral hit "Down on My Luck".',
      a: 'Vic Mensa',
      category: '10s-hiphop',
      difficulty: 3,
    },
  ],
  X: [
    {
      q: "Lil Uzi Vert's 2017 platinum-certified breakout single from 'Luv Is Rage 2' that peaked at number seven on the Billboard Hot 100.",
      a: 'XO TOUR Llif3',
      alt: ['XO Tour Llif3', 'XO Tour Life'],
      category: '10s-hiphop',
      difficulty: 2,
    },
    {
      q: "Penultimate track on Kendrick Lamar's 2017 album 'DAMN.' featuring U2, addressing American gun violence over a Mike Will Made-It beat.",
      a: 'XXX.',
      alt: ['XXX'],
      category: '10s-hiphop',
      difficulty: 3,
    },
  ],
  Y: [
    {
      q: "Tyler, the Creator's confrontational 2011 single from his album 'Goblin' whose Clark Jenkins-directed video earned the Best New Artist MTV VMA.",
      a: 'Yonkers',
      category: '10s-hiphop',
      difficulty: 2,
    },
    {
      q: 'Atlanta rapper born Jeffery Lamar Williams whose 2015 mixtape "Barter 6" and feature on Rich Gang\'s "Lifestyle" established him as a 2010s trap innovator.',
      a: 'Young Thug',
      category: '10s-hiphop',
      difficulty: 2,
    },
    {
      q: "Reflective deep cut from Travis Scott's 2018 album 'Astroworld' named after a famous California national park.",
      a: 'Yosemite',
      category: '10s-hiphop',
      difficulty: 3,
    },
  ],
};
