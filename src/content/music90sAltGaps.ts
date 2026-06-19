import type { RawQuestion } from '../core/packs';

// Skinny-letter gap fills for the 90s Grunge & Alt pack. Strictly 1990–1999.
// New entries only — none of these duplicate the existing music90sAlt or
// music90sAltExtra answers. Every answer's first letter matches its bucket and
// never appears verbatim in its clue.
const K: RawQuestion[] = [
  {
    q: "Bassist of the Pixies who founded the Breeders and sang lead on their 1993 alt-radio smash 'Cannonball'.",
    a: 'Kim Deal',
    category: '90s-alt',
    difficulty: 3,
  },
  {
    q: "Bakersfield nu-metal pioneers whose 1994 self-titled debut and 1998 'Follow the Leader' broke the genre to the mainstream.",
    a: 'Korn',
    category: '90s-alt',
    difficulty: 2,
  },
  {
    q: "Veteran MTV News anchor who broke the April 1994 story of Cobain's death and fronted the channel's news segments throughout the decade.",
    a: 'Kurt Loder',
    category: '90s-alt',
    difficulty: 3,
  },
  {
    q: "Sonic Youth co-founder and bassist who sang lead on 1990's 'Kool Thing' and 1994's 'Bull in the Heather'.",
    a: 'Kim Gordon',
    category: '90s-alt',
    difficulty: 3,
  },
];

const O: RawQuestion[] = [
  {
    q: "Orange County punk band behind the 1994 album 'Smash' and the 1998 hit 'Pretty Fly (for a White Guy)'.",
    a: 'Offspring',
    alt: ['The Offspring'],
    category: '90s-alt',
    difficulty: 2,
  },
  {
    q: "1996 Wallflowers single from 'Bringing Down the Horse' that won the Grammy for Best Rock Song.",
    a: 'One Headlight',
    category: '90s-alt',
    difficulty: 3,
  },
  {
    q: "Garbage's self-pitying 1995 single from their self-titled debut, an anthem of preferring miserable weather.",
    a: 'Only Happy When It Rains',
    category: '90s-alt',
    difficulty: 3,
  },
  {
    q: "U2's ballad from 'Achtung Baby' (1991) opening 'Is it getting better, or do you feel the same?'.",
    a: 'One',
    category: '90s-alt',
    difficulty: 3,
  },
];

const U: RawQuestion[] = [
  {
    q: "Red Hot Chili Peppers' 1991 ballad from 'Blood Sugar Sex Magik' confessing loneliness on the streets of Los Angeles.",
    a: 'Under the Bridge',
    category: '90s-alt',
    difficulty: 2,
  },
];

const V: RawQuestion[] = [
  {
    q: "Pixies single from their 1990 album 'Bossanova' whose music video shows the band tumbling down a quarry.",
    a: 'Velouria',
    category: '90s-alt',
    difficulty: 4,
  },
  {
    q: "Hole single from 'Live Through This' (1994) opening 'And the sky was made of amethyst…'.",
    a: 'Violet',
    category: '90s-alt',
    difficulty: 3,
  },
  {
    q: "Veruca Salt's 1997 lead single from 'Eight Arms to Hold You' whose chorus self-references the band's earlier 'Seether'.",
    a: 'Volcano Girls',
    category: '90s-alt',
    difficulty: 4,
  },
  {
    q: "Garbage's debut 1994 single, a Shirley Manson revenge anthem released as their first 7-inch on Mushroom Records.",
    a: 'Vow',
    category: '90s-alt',
    difficulty: 4,
  },
];

const Y: RawQuestion[] = [
  {
    q: "Hoboken indie trio of Ira Kaplan and Georgia Hubley behind the 1997 LP 'I Can Hear the Heart Beating as One'.",
    a: 'Yo La Tengo',
    category: '90s-alt',
    difficulty: 4,
  },
  {
    q: "Alanis Morissette's bitter 1995 single from 'Jagged Little Pill' aimed at a former lover and featuring Flea on bass.",
    a: 'You Oughta Know',
    category: '90s-alt',
    difficulty: 2,
  },
];

const Z: RawQuestion[] = [
  {
    q: "U2's 1993 follow-up to 'Achtung Baby', recorded during a break in their tour and titled with a portmanteau of Europe.",
    a: 'Zooropa',
    category: '90s-alt',
    difficulty: 3,
  },
];

export const music90sAltGaps: Record<string, RawQuestion[]> = { K, O, U, V, Y, Z };
