import type { RawQuestion } from '../core/packs';

// Second-pass top-up for the 90s R&B pack: skinny letters V (+3), X (+3), Q (+3).
// Strictly 1990–1999. Deduped vs base pack allAnswers AND vs music90sRnBGaps.ts.
// V — base has Vision of Love + Vanessa Williams; gaps1 added Vanessa Williams.
// X — base has Xscape + Xtra Naked; gaps1 reused Xtra Naked.
// Q — base has Queen of the Night + Quincy Jones; gaps1 reused Quincy Jones.
export const music90sRnBGaps2: Record<string, RawQuestion[]> = {
  V: [
    { q: "Powerhouse contralto whose 1991 A&M album 'Special' delivered the title track that climbed to #2 on the Billboard R&B singles chart.", a: 'Vesta Williams', category: '90s-rnb', alt: ['Vesta'] },
    { q: "New York R&B-jazz trio fronted by Angie Stone whose 1993 A&M debut single from the album 'A Matter of Time' griped that a partner was busy.", a: 'Vertical Hold', category: '90s-rnb' },
    { q: "North Philly Latino R&B quintet on Jellybean Benitez's H.O.L.A. Recordings whose 1998 single 'Say It' reached #10 on the Billboard Hot 100.", a: 'Voices of Theory', category: '90s-rnb' },
  ],
  X: [
    { q: "Brooklyn collective led by Brother J whose 1992 Polydor album 'Xodus' — subtitled 'The New Testament' — hit #11 on Billboard's Top R&B/Hip-Hop Albums chart.", a: 'X Clan', category: '90s-rnb', alt: ['X-Clan'] },
    { q: "X Clan's 1992 sophomore LP on Polydor whose title track preached Black-nationalist spiritualism alongside the singles 'Fire & Earth' and 'A.D.A.M.'.", a: 'Xodus', category: '90s-rnb' },
    { q: "1997 Asphodel Records debut by NYC turntablist crew Roc Raida, Rob Swift, Mista Sinista and DJ Total Eclipse — a landmark scratching album that charted on Billboard's R&B/Hip-Hop list.", a: 'X-Pressions', category: '90s-rnb', alt: ['Xpressions', 'X Pressions'] },
  ],
  Q: [
    { q: "New Jersey-born Dana Owens — her third LP 'Black Reign' (1993) spawned the Grammy-winning hip-hop-soul anthem 'U.N.I.T.Y.' and the double A-side 'Just Another Day / Weekend Love'.", a: 'Queen Latifah', category: '90s-rnb' },
    { q: "Brooklyn rapper Lynise Walters whose 1997 Teddy Riley-executive-produced debut album on Lil' Man Records gave us 'All My Love' (with Eric Williams) and 'Man Behind the Music'.", a: 'Queen Pen', category: '90s-rnb' },
    { q: "Jacksonville bass-music duo of Nathaniel Orange and Johnny McGowan whose 1996 #3 Hot 100 train-whistle smash came off the debut LP 'Get On Up and Dance'.", a: "Quad City DJ's", category: '90s-rnb', alt: ['Quad City DJs', 'Quad City DJs (group)'] },
  ],
};
