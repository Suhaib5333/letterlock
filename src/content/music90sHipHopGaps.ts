import type { RawQuestion } from '../core/packs';

// 90s Hip-Hop gap-fill — answers grouped here for readability; `rebucketByAnswer`
// in index.ts re-files each question by the first letter of its answer at load.
export const music90sHipHopGaps: Record<string, RawQuestion[]> = {
  F: [
    { q: 'Bronx-born MC Joseph Cartagena whose 1995 "Jealous One\'s Envy" launched his Terror Squad career.', a: 'Fat Joe', category: 'music' },
    { q: 'Hot 97 turntablist and "Mix Tape Volume" series host who dominated New York rap radio through the 1990s.', a: 'Funkmaster Flex', category: 'music' },
    { q: 'Trini-born Tribe Called Quest member Malik Taylor\'s self-bestowed nickname referencing his short stature and lethal flow.', a: 'Five Foot Assassin', category: 'music' },
  ],
  U: [
    { q: '1994 Notorious B.I.G. track from "Ready to Die" opening "Live from Bedford-Stuyvesant, the livest one…" — a one-word boast about his own skill.', a: 'Unbelievable', category: 'music' },
    { q: '1991 Naughty by Nature posse cut from their debut LP that crowns their New Jersey neighborhood as the source of their sound.', a: 'Uptown Anthem', category: 'music' },
    { q: 'James Todd Smith\'s warmer mid-career nickname, the avuncular alter-ego he embraced from the mid-1990s onward.', a: 'Uncle L', category: 'music' },
    { q: '1997 Timbaland-produced Magoo posse single featuring Aaliyah whose hook commands the dance floor to rise.', a: 'Up Jumps da Boogie', category: 'music', alt: ['Up Jumps the Boogie'] },
  ],
  Q: [
    { q: 'Compton producer-rapper David Blake\'s 1991 debut LP — a self-referential five-word title built on his own stage moniker.', a: 'Quik Is the Name', category: 'music' },
    { q: '1999 Mobb Deep track from "Murda Muzik" featuring Lil\' Kim — its title is the meteorological term for an intense localized burst.', a: 'Quiet Storm', category: 'music' },
    { q: 'The New York public-housing project in Long Island City that produced Nas, Mobb Deep, MC Shan and Marley Marl.', a: 'Queensbridge', category: 'music' },
  ],
  V: [
    { q: 'Raekwon\'s 1995 "Only Built 4 Cuban Linx" duet with Nas — its two-word title is a euphemism for sharp lyrical sparring on the mic.', a: 'Verbal Intercourse', category: 'music' },
    { q: 'Glossy Time Inc. urban-music magazine launched by Quincy Jones in 1993 that became the genre\'s glossy paper of record.', a: 'Vibe', category: 'music' },
  ],
  X: [
    { q: 'Brooklyn Afrocentric group of Brother J and Professor X whose 1990 debut "To the East, Blackwards" set the template for conscious rap.', a: 'X-Clan', category: 'music' },
  ],
  Y: [
    { q: 'Pioneering MTV show hosted by Fab 5 Freddy, Ed Lover and Dr. Dre that ran from 1988 to 1995 and put the genre on cable television.', a: 'Yo! MTV Raps', category: 'music', alt: ['Yo MTV Raps'] },
  ],
  Z: [
    { q: 'Female duo of Renee Neufville and Jean Norris whose 1993 Naughty by Nature collaboration "Hey Mr. DJ" launched their career.', a: 'Zhane', category: 'music', alt: ['Zhané'] },
  ],
};
