import type { RawQuestion } from '../core/packs';

// Second top-up batch for the 2010s Pop & EDM pack — fills the still-thin
// U / V / Y / Z buckets with strictly 2010–2019 entries that don't duplicate
// any existing answer in the pack. Clues are one-fact prompts that never
// restate or name their own answer.

export const music10sPopGaps2: Record<string, RawQuestion[]> = {
  U: [
    {
      q: "Atlanta R&B vocalist whose 2012 album 'Looking 4 Myself' produced the chart-topping single 'Climax'.",
      a: 'Usher',
      category: '10s-pop',
      difficulty: 2,
    },
    {
      q: "Lana Del Rey's June 2014 sophomore studio album that debuted at #1 in the US and UK, with a Dan Auerbach-produced title track.",
      a: 'Ultraviolence',
      category: '10s-pop',
      difficulty: 3,
    },
    {
      q: "X Ambassadors' 2015 piano-driven hit from the album 'VHS', popularised by 'Me Before You' and an HBO promo.",
      a: 'Unsteady',
      category: '10s-pop',
      difficulty: 3,
    },
  ],
  V: [
    {
      q: "Panic! at the Disco's 2015 brass-laden anthem and second single from the 'Death of a Bachelor' album.",
      a: 'Victorious',
      category: '10s-pop',
      difficulty: 4,
    },
  ],
  Y: [
    {
      q: "The opening half of a two-part 2013 self-titled-album cut that segues into 'Partition', featuring a Boots-produced beat.",
      a: 'Yoncé',
      category: '10s-pop',
      difficulty: 3,
      alt: ['Yonce'],
    },
  ],
  Z: [
    {
      q: "Imagine Dragons' 2018 single recorded for the 'Ralph Breaks the Internet' soundtrack, themed around feeling like a nobody.",
      a: 'Zero',
      category: '10s-pop',
      difficulty: 3,
    },
  ],
};
