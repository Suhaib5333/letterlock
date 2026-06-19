import type { RawQuestion } from '../core/packs';

// Top-up entries for the 2010s Pop & EDM pack — fills the thin J/K/U/V/Y/Z
// buckets so a small board can always serve a fair question on those letters.
// Every answer is a real 2010s pop or EDM entity (song, artist, or album) that
// released or peaked between 2010 and 2019, and every clue is a clean one-fact
// prompt that never names its own answer.

export const music10sPopGaps: Record<string, RawQuestion[]> = {
  J: [
    {
      q: "Three-sibling pop-rock group from New Jersey whose 2019 comeback single 'Sucker' debuted at Billboard #1 after a six-year hiatus.",
      a: 'Jonas Brothers',
      category: '10s-pop',
      difficulty: 2,
    },
    {
      q: "British pop singer whose vocals featured on Clean Bandit's 2014 #1 'Rather Be' and who scored her own UK chart-topper with 2015's 'Hold My Hand'.",
      a: 'Jess Glynne',
      category: '10s-pop',
      difficulty: 3,
    },
    {
      q: "Los Angeles R&B singer whose 2017 debut 'Trip' followed her 2014 collaboration 'The Worst' from the EP 'Sail Out'.",
      a: 'Jhené Aiko',
      category: '10s-pop',
      difficulty: 3,
    },
    {
      q: "American songwriter-turned-artist who broke through with the 2017 single 'Issues' after co-writing hits for Justin Bieber and Selena Gomez.",
      a: 'Julia Michaels',
      category: '10s-pop',
      difficulty: 3,
    },
  ],
  K: [
    {
      q: "El Paso-raised R&B singer whose 2016 breakout single 'Location' came from his debut album 'American Teen'.",
      a: 'Khalid',
      category: '10s-pop',
      difficulty: 2,
    },
    {
      q: "Texan country-pop singer whose 2018 album 'Golden Hour' won Album of the Year at the 61st Grammy Awards.",
      a: 'Kacey Musgraves',
      category: '10s-pop',
      difficulty: 3,
    },
    {
      q: "Compton rapper who guested on the 2015 remix of Taylor Swift's 'Bad Blood' and dropped the chart-topping album 'DAMN.' in 2017.",
      a: 'Kendrick Lamar',
      category: '10s-pop',
      difficulty: 2,
    },
  ],
  U: [
    {
      q: "Justin Bieber's 2011 Christmas-themed studio album, his second LP, featuring a duet with Mariah Carey on 'All I Want for Christmas Is You'.",
      a: 'Under the Mistletoe',
      category: '10s-pop',
      difficulty: 3,
    },
  ],
  V: [
    {
      q: "Melbourne singer-songwriter James Keogh's stage name, behind the 2013 breakout single 'Riptide'.",
      a: 'Vance Joy',
      category: '10s-pop',
      difficulty: 3,
    },
    {
      q: "New York indie rock band led by Ezra Koenig whose 2013 album 'Modern Vampires of the City' won the Grammy for Best Alternative Music Album.",
      a: 'Vampire Weekend',
      category: '10s-pop',
      difficulty: 3,
    },
  ],
  Y: [
    {
      q: "Lorde's brooding 2014 single recorded for 'The Hunger Games: Mockingjay – Part 1' soundtrack.",
      a: 'Yellow Flicker Beat',
      category: '10s-pop',
      difficulty: 3,
    },
    {
      q: "British synth-pop trio fronted by Olly Alexander whose 2015 single 'King' topped the UK Singles Chart.",
      a: 'Years & Years',
      category: '10s-pop',
      difficulty: 3,
    },
  ],
  Z: [
    {
      q: "Swedish pop singer whose 2015 single 'Lush Life' and MNEK collaboration 'Never Forget You' broke her internationally.",
      a: 'Zara Larsson',
      category: '10s-pop',
      difficulty: 3,
    },
    {
      q: "San Francisco-born electronic producer behind the 2014 deep-house hit 'Faded', released anonymously under a three-letter stage name.",
      a: 'ZHU',
      category: '10s-pop',
      difficulty: 4,
    },
  ],
};
