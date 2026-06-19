import type { RawQuestion } from '../core/packs';

// Top-up answers for the 2000s Pop & Rock pack: skinny letters K (4), V (4).
// Every answer is fresh vs the base pack's allAnswers; strictly 2000–2009.
export const music00sPopGaps: Record<string, RawQuestion[]> = {
  K: [
    { q: "Sussex piano-rock trio fronted by Tom Chaplin whose 2004 debut album 'Hopes and Fears' produced 'Somewhere Only We Know'.", a: 'Keane', category: '00s' },
    { q: "Leicester rock band whose 2004 self-titled debut yielded 'Club Foot' and 'L.S.F.', led by Tom Meighan and Sergio Pizzorno.", a: 'Kasabian', category: '00s' },
    { q: "Detroit-born performer Robert James Ritchie whose 2008 single 'All Summer Long' interpolated 'Sweet Home Alabama' and 'Werewolves of London'.", a: 'Kid Rock', category: '00s' },
    { q: "Leeds indie-rock outfit fronted by Ricky Wilson whose 2005 album 'Employment' produced 'I Predict a Riot' and 'Oh My God'.", a: 'Kaiser Chiefs', category: '00s' },
  ],
  V: [
    { q: "Pennsylvania-born singer-pianist whose 2002 debut album 'Be Not Nobody' featured her signature single about driving a long way for love.", a: 'Vanessa Carlton', category: '00s' },
    { q: "Australian twin-sister pop-rock duo Jess and Lisa Origliasso whose 2007 single 'Untouched' became a global breakout.", a: 'The Veronicas', category: '00s', alt: ['Veronicas'] },
    { q: "Actress-singer whose 2006 debut album 'V' and the single 'Come Back to Me' followed her starring role in 'High School Musical'.", a: 'Vanessa Hudgens', category: '00s' },
    { q: "Washington DC alt-rock band fronted by Matt Scannell whose 2000 single 'Everything You Want' topped the Billboard Hot 100.", a: 'Vertical Horizon', category: '00s' },
  ],
};
