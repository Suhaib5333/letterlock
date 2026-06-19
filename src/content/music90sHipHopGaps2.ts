import type { RawQuestion } from '../core/packs';

// 90s Hip-Hop gap-fill (round 2) — tops up the remaining hard-letter gaps.
// Answers grouped here for readability; `rebucketByAnswer` in index.ts re-files
// each question by the first letter of its answer at load. Strict 1990–1999.
export const music90sHipHopGaps2: Record<string, RawQuestion[]> = {
  V: [
    { q: 'West-coast MC behind the 1993 Immortal Records single "Pistolgrip-Pump" — his stage name pairs a letter with a round number.', a: 'Volume 10', category: 'music' },
  ],
  X: [
    { q: 'New York turntablist supergroup of Rob Swift, Roc Raida, Total Eclipse and Mista Sinista whose 1997 debut "X-Pressions" defined late-90s scratch culture.', a: 'X-ecutioners', category: 'music', alt: ['The X-ecutioners', 'Xecutioners'] },
    { q: 'Sacramento gangsta rapper Anerae Brown who recorded much of his 1992 debut "Psycho Active" from a jail cell while awaiting trial.', a: 'X-Raided', category: 'music' },
    { q: '1998 DMX track from "It\'s Dark and Hell Is Hot" whose three-word title announces the arrival of the Yonkers rapper himself.', a: 'X Is Coming', category: 'music', alt: ['X Is Comin\''] },
  ],
  Y: [
    { q: 'Trio of Spin 4th, Jingle Bell and D\'Ranged whose 1994 Mercury LP "Action Packed Adventure" mixed cartoon humour with East Coast boom-bap.', a: 'Yaggfu Front', category: 'music' },
    { q: 'Atlanta Pallas Records crew whose lone 1993 album "Van Full of Pakistans" became a Southern alt-rap cult favourite.', a: 'Y\'all So Stupid', category: 'music', alt: ['Yall So Stupid'] },
    { q: 'Long Island crew signed to Hank Shocklee\'s SOUL imprint whose self-titled 1991 debut featured the single "Tap the Bottle."', a: 'Young Black Teenagers', category: 'music' },
  ],
  Z: [
    { q: 'Harlem quartet of Robbie, Sweet Lou, Captain C and Jamal whose 1992 Polydor self-titled debut spawned the hit "Toss It Up."', a: 'Zhigge', category: 'music' },
    { q: 'Daniel Dumile\'s rapper alias in early-90s Long Island trio KMD, retired after his brother Subroc\'s 1993 death and reborn years later as a masked villain.', a: 'Zev Love X', category: 'music' },
    { q: '1996 Fugees track from "The Score" opening "Rap rejects my tape deck, ejects projectile" — its title brands rival MCs as fanatical pretenders.', a: 'Zealots', category: 'music' },
  ],
};
