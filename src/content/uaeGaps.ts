import type { RawQuestion } from '../core/packs';

// Top-up questions for the United Arab Emirates pack, targeting the skinny
// letters Z, N, Y, Q and V. Grouped here by the first letter of the answer
// for readability; `rebucketByAnswer` in index.ts re-files every question by
// its answer's true first letter at load time, so the grouping is purely a
// human aid.
export const uaeGaps: Record<string, RawQuestion[]> = {
  Z: [
    {
      q: 'The planned cultural institution on Saadiyat Island in the capital, named for the federation\'s founding father and designed by Foster + Partners with five steel towers shaped like falcon wing tips.',
      a: 'Zayed National Museum',
      category: 'gcc',
      difficulty: 5,
    },
    {
      q: 'The Abu Dhabi multi-sport complex whose 43,000-seat stadium hosted the 2017 and 2018 FIFA Club World Cup finals, named for the founding president.',
      a: 'Zayed Sports City',
      category: 'gcc',
      difficulty: 5,
    },
    {
      q: 'The capital\'s main air hub, renamed in February 2024 in honour of the country\'s founding father after a major Terminal A expansion.',
      a: 'Zayed International Airport',
      category: 'gcc',
      difficulty: 5,
      alt: ['Abu Dhabi International Airport', 'AUH'],
    },
  ],
  N: [
    {
      q: 'The state-owned property developer of the largest emirate behind the Palm Jumeirah, the World Islands and Deira Islands, taking its name from the Arabic for palm trees.',
      a: 'Nakheel',
      category: 'gcc',
      difficulty: 5,
      alt: ['Nakheel Properties'],
    },
    {
      q: 'The pair of glass-clad skyscrapers on the capital\'s Corniche housing some of the country\'s tallest residences and a St. Regis hotel high above the seafront, by their two-word name.',
      a: 'Nation Towers',
      category: 'gcc',
      difficulty: 5,
    },
    {
      q: 'The collective informal name for the five smaller members of the federation outside Abu Dhabi and Dubai — Sharjah, Ajman, Umm Al Quwain, Ras Al Khaimah and Fujairah — often grouped in trade and statistics.',
      a: 'Northern Emirates',
      category: 'gcc',
      difficulty: 4,
    },
  ],
  Y: [
    {
      q: 'The 5.281-kilometre Hermann Tilke-designed motor racing track east of the capital, host of the Formula One season-ending night race since 2009.',
      a: 'Yas Marina Circuit',
      category: 'gcc',
      difficulty: 4,
    },
    {
      q: 'The Emirati-themed water park on the leisure island east of the capital, opened in 2013 with 43 slides drawing on local pearl-diving folklore.',
      a: 'Yas Waterworld',
      category: 'gcc',
      difficulty: 5,
    },
  ],
  Q: [
    {
      q: 'The 380,000-square-metre working presidential palace in the capital that opened to visitors in 2019, set in formal gardens west of the Emirates Palace hotel, with a 37-metre dome ringed by Arabic calligraphy.',
      a: 'Qasr Al Watan',
      category: 'gcc',
      difficulty: 5,
    },
    {
      q: 'The Anantara luxury desert resort in the Liwa dunes of the Empty Quarter, styled as a sand-coloured Arabian fortress, its name meaning "Palace of the Mirage".',
      a: 'Qasr Al Sarab',
      category: 'gcc',
      difficulty: 5,
    },
    {
      q: 'The restored 19th-century mud-brick fort in the inland garden city near Oman, birthplace of the second president of the country and part of a UNESCO World Heritage cluster.',
      a: 'Qasr Al Muwaiji',
      category: 'gcc',
      difficulty: 5,
    },
  ],
  V: [
    {
      q: 'The Swedish-carmaker-sponsored round-the-world crewed sailing event, whose 2014-15 edition was won by the capital-sponsored entry and which has used the capital as a stopover port multiple times.',
      a: 'Volvo Ocean Race',
      category: 'gcc',
      difficulty: 5,
    },
  ],
};
