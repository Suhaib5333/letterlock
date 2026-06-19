import type { RawQuestion } from '../core/packs';

// Top-up answers for the 80s Rock pack: skinny letters Q (3), U (2), Z (1).
// Every answer is fresh vs the base pack's allAnswers; no answer-leak in q.
export const music80sRockGaps: Record<string, RawQuestion[]> = {
  Q: [
    { q: 'Portland new-wave rock outfit fronted by saxophonist-singer Rindy Ross — 1981 hit "Harden My Heart" rode a sax hook to the top ten.', a: 'Quarterflash', category: '80s-rock' },
    { q: 'London glam-blues outfit fronted by raspy-voiced Spike that formed in 1984 — late-80s single "7 O\'Clock" set up the 1990 debut "A Bit of What You Fancy"; band name homophones the church-singer kind of boys.', a: 'The Quireboys', alt: ['Quireboys'], category: '80s-rock' },
    { q: 'Juice Newton\'s 1981 rockabilly-pop top-ten smash about playing-card royalty in matters of love — first two words of the title.', a: 'Queen of Hearts', category: '80s-rock' },
  ],
  U: [
    { q: 'London hard-rock institution led by Phil Mogg — 1982 album "Mechanix" and 1983\'s "Making Contact" capped a decade-long run; their three-letter name is more often associated with unidentified things in the sky.', a: 'UFO', category: '80s-rock' },
    { q: 'Birmingham reggae-pop octet whose 1983 cover of a Neil Diamond drinking lament topped the UK and US charts — the name nods to a British dole-office form.', a: 'UB40', category: '80s-rock' },
  ],
  Z: [
    { q: 'New Orleans-bred power trio whose self-titled 1983 debut on Atlantic produced the rock-radio staple "Tell Me What You Want" — name borrows a striped African mammal.', a: 'Zebra', category: '80s-rock' },
  ],
};
