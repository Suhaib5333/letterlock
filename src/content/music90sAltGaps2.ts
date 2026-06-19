import type { RawQuestion } from '../core/packs';

// Round-2 skinny-letter gap fills for the 90s Grunge & Alt pack.
// Strictly 1990–1999. New entries only — none duplicate the existing
// music90sAlt, music90sAltExtra, or music90sAltGaps answers. Every
// answer's first letter matches its bucket and never appears verbatim
// in its clue.

const U: RawQuestion[] = [
  {
    q: "Chicago trio in sharp suits whose 1993 single 'Sister Havana' rode their Geffen debut 'Saturation' onto alt-rock radio.",
    a: 'Urge Overkill',
    category: '90s-alt',
    difficulty: 4,
  },
  {
    q: "Southern California outfit whose 1992 single 'Everything About You' and a 1993 cover of Harry Chapin's 'Cats in the Cradle' put them on MTV heavy rotation.",
    a: 'Ugly Kid Joe',
    category: '90s-alt',
    difficulty: 3,
  },
  {
    q: "Belleville, Illinois alt-country pioneers whose 1993 swan-song LP 'Anodyne' preceded a split that birthed Wilco and Son Volt the following year.",
    a: 'Uncle Tupelo',
    category: '90s-alt',
    difficulty: 4,
  },
];

const Z: RawQuestion[] = [
  {
    q: "Flaming Lips' ambitious 1997 release designed to be played on four stereos at once, named with a portmanteau of an African nation and a Beatles album.",
    a: 'Zaireeka',
    category: '90s-alt',
    difficulty: 4,
  },
  {
    q: "Long Beach-born MC and lyricist who fronted Rage Against the Machine across their 1992 debut, 1996's 'Evil Empire', and 1999's 'The Battle of Los Angeles'.",
    a: 'Zack de la Rocha',
    category: '90s-alt',
    difficulty: 3,
  },
  {
    q: "Industrial-clatter opener of U2's 1991 album 'Achtung Baby' that simulates the rush of a Berlin subway train.",
    a: 'Zoo Station',
    category: '90s-alt',
    difficulty: 4,
  },
];

const Y: RawQuestion[] = [
  {
    q: "New Radicals' 1998 piano-led anthem from 'Maybe You've Been Brainwashed Too', remembered for shout-outs to 'Marilyn Manson, Courtney Love' and a viral mall-trashing video.",
    a: 'You Get What You Give',
    category: '90s-alt',
    difficulty: 3,
  },
];

export const music90sAltGaps2: Record<string, RawQuestion[]> = { U, Z, Y };
