import type { RawQuestion } from '../core/packs';

/**
 * Top-up questions for the Movies & TV pack — fills the skinny letters
 * (K, N, Q, U, X, Y, Z) so small boards always have an answerable hex.
 * Authored against existing `allAnswers` to avoid duplicates.
 */
export const moviesTvGaps: Record<string, RawQuestion[]> = {
  K: [
    {
      q: '1933 monster classic in which a giant ape is captured on a mysterious tropical island and brought to New York, where he climbs the Empire State Building.',
      a: 'King Kong',
      category: 'screen',
      difficulty: 2,
    },
    {
      q: '1990 Ivan Reitman comedy in which Arnold Schwarzenegger goes undercover as a teacher of small children to catch a drug lord.',
      a: 'Kindergarten Cop',
      category: 'screen',
      difficulty: 2,
    },
    {
      q: '1984 Ralph Macchio film in which a bullied teenager trains in martial arts under the wise handyman Mr. Miyagi.',
      a: 'Karate Kid',
      category: 'screen',
      difficulty: 2,
    },
    {
      q: 'DreamWorks animated film in which a clumsy noodle-shop bear voiced by Jack Black is unexpectedly chosen as the Dragon Warrior.',
      a: 'Kung Fu Panda',
      category: 'screen',
      difficulty: 2,
    },
  ],
  N: [
    {
      q: '2004 Jared Hess indie comedy about an awkward Idaho high-schooler who helps his friend Pedro run for class president.',
      a: 'Napoleon Dynamite',
      category: 'screen',
      difficulty: 3,
    },
    {
      q: '2004 Nicolas Cage adventure in which a historian steals the Declaration of Independence to chase a hidden Founding-Fathers fortune.',
      a: 'National Treasure',
      category: 'screen',
      difficulty: 2,
    },
    {
      q: '2006 Jack Black comedy in which a Mexican monastery cook moonlights as a masked wrestler to feed the orphans.',
      a: 'Nacho Libre',
      category: 'screen',
      difficulty: 3,
    },
  ],
  Q: [
    {
      q: 'Robert Redford\'s 1994 drama about the rigging of the 1950s American television contest Twenty-One.',
      a: 'Quiz Show',
      category: 'screen',
      difficulty: 3,
    },
    {
      q: 'Dustin Hoffman\'s 2012 directorial debut, set in a retirement home for opera singers preparing a Verdi gala.',
      a: 'Quartet',
      category: 'screen',
      difficulty: 4,
    },
  ],
  U: [
    {
      q: '2019 Safdie Brothers thriller starring Adam Sandler as a frantic New York jeweller chasing a high-stakes basketball bet on Kevin Garnett.',
      a: 'Uncut Gems',
      category: 'screen',
      difficulty: 3,
    },
    {
      q: 'M. Night Shyamalan\'s 2000 film in which Bruce Willis plays a security guard who survives a train crash without a scratch and discovers superhuman strength.',
      a: 'Unbreakable',
      category: 'screen',
      difficulty: 3,
    },
    {
      q: '2009 Jason Reitman dramedy starring George Clooney as a corporate downsizer who lives out of suitcases and frequent-flyer miles.',
      a: 'Up in the Air',
      category: 'screen',
      difficulty: 3,
    },
    {
      q: '1989 John Hughes comedy in which John Candy plays a slovenly bachelor who babysits his brother\'s three children for a week.',
      a: 'Uncle Buck',
      category: 'screen',
      difficulty: 3,
    },
  ],
  X: [
    {
      q: 'Fox science-fiction series in which FBI agents Mulder and Scully investigate paranormal cases and government cover-ups.',
      a: 'X-Files',
      alt: ['the x-files'],
      category: 'screen',
      difficulty: 2,
    },
    {
      q: '1980 musical fantasy in which Olivia Newton-John plays a Greek muse who inspires a roller-disco nightclub.',
      a: 'Xanadu',
      category: 'screen',
      difficulty: 4,
    },
  ],
  Y: [
    {
      q: 'Mel Brooks\'s 1974 black-and-white horror parody starring Gene Wilder as a brain surgeon who inherits a Transylvanian castle.',
      a: 'Young Frankenstein',
      category: 'screen',
      difficulty: 3,
    },
  ],
  Z: [
    {
      q: '2001 Ben Stiller comedy in which a dim-witted male model is brainwashed to assassinate the prime minister of Malaysia.',
      a: 'Zoolander',
      category: 'screen',
      difficulty: 3,
    },
    {
      q: 'Masked Spanish-Californian vigilante dressed in black, famous for carving his initial into his foes with a rapier; played on screen by Antonio Banderas and Tyrone Power.',
      a: 'Zorro',
      category: 'screen',
      difficulty: 3,
    },
    {
      q: 'Woody Allen\'s 1983 mockumentary about a human chameleon who unconsciously transforms to resemble whomever he stands beside.',
      a: 'Zelig',
      category: 'screen',
      difficulty: 4,
    },
    {
      q: 'Kathryn Bigelow\'s 2012 thriller about the decade-long CIA hunt for Osama bin Laden, culminating in the SEAL raid on Abbottabad.',
      a: 'Zero Dark Thirty',
      category: 'screen',
      difficulty: 3,
    },
  ],
};
