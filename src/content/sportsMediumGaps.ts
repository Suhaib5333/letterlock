import type { RawQuestion } from '../core/packs';

// Top-up questions for the Sports · Medium pack, targeting the skinny letters
// X, K and Q. Grouped here by the first letter of the answer for readability;
// `rebucketByAnswer` in index.ts re-files every question by its answer's true
// first letter at load time, so the grouping is purely a human aid.
export const sportsMediumGaps: Record<string, RawQuestion[]> = {
  X: [
    { q: 'Catalan midfield maestro born 1980 who anchored Barcelona\'s tiki-taka era and Spain\'s 2010 World Cup win, later returning to coach the club.', a: 'Xavi Hernández', category: 'sports', difficulty: 3, alt: ['Xavi Hernandez'] },
    { q: 'Aruban-born infielder who won the 2018 World Series with the Red Sox and signed a long-term deal with the Padres in 2023.', a: 'Xander Bogaerts', category: 'sports', difficulty: 3 },
    { q: 'The spring American football league relaunched in 2020 and again in 2023, originally founded by Vince McMahon as a rival to the NFL.', a: 'XFL', category: 'sports', difficulty: 3, alt: ['Xtreme Football League'] },
    { q: 'Swiss attacking midfielder born in Kosovo who scored at the 2014, 2018 and 2022 World Cups for his adopted country.', a: 'Xherdan Shaqiri', category: 'sports', difficulty: 4, alt: ['Shaqiri'] },
    { q: 'Basque-born former Liverpool, Real Madrid and Bayern Munich midfielder, current Bayer Leverkusen head coach who won the 2023-24 Bundesliga unbeaten.', a: 'Xabi Alonso', category: 'sports', difficulty: 3 },
  ],
  K: [
    { q: 'NBA all-time leading scorer until 2023, the seven-foot Lakers and Bucks centre famous for his unstoppable skyhook.', a: 'Kareem Abdul-Jabbar', category: 'sports', difficulty: 3, alt: ['Kareem Abdul Jabbar', 'Abdul-Jabbar'] },
    { q: 'American beach volleyball legend who won Olympic gold in Atlanta 1996 with Kent Steffes, considered the greatest player in the sport\'s history.', a: 'Karch Kiraly', category: 'sports', difficulty: 4 },
    { q: 'Utah Jazz power forward nicknamed "The Mailman" who retired in 2004 with 36,928 career points, second on the all-time list at the time.', a: 'Karl Malone', category: 'sports', difficulty: 3 },
    { q: 'Australian tennis showman of Greek descent, born 1995, who reached the 2022 Wimbledon final and is known for between-the-legs tweeners and on-court tantrums.', a: 'Kyrgios', category: 'sports', difficulty: 3, alt: ['Nick Kyrgios'] },
    { q: 'Golden State Warriors sharpshooter who set the NBA single-game three-point record with 14 against the Bulls in October 2018.', a: 'Klay Thompson', category: 'sports', difficulty: 3 },
    { q: 'Two-time NBA Finals MVP with the Spurs and Raptors, the silent Klaw who hit a buzzer-beater off four bounces against Philadelphia in 2019.', a: 'Kawhi Leonard', category: 'sports', difficulty: 3 },
    { q: 'Notre Dame head coach from 1918 to 1930 who popularised the forward pass and gave the "win one for the Gipper" speech before dying in a 1931 plane crash.', a: 'Knute Rockne', category: 'sports', difficulty: 4 },
    { q: 'Brooklyn-born NBA forward, two-time Finals MVP with the Warriors who joined the Suns in 2023, often listed at six-foot-eleven.', a: 'Kevin Durant', category: 'sports', difficulty: 3 },
  ],
  Q: [
    { q: 'American sprinter who took 400-metre gold at the Barcelona 1992 Olympics in a then-Olympic-record 43.50 seconds, formerly of USC.', a: 'Quincy Watts', category: 'sports', difficulty: 4 },
    { q: 'The composite NFL passer statistic combining completion percentage, yards per attempt, touchdowns and interceptions, with a perfect score of 158.3.', a: 'Quarterback rating', category: 'sports', difficulty: 3, alt: ['QB rating'] },
    { q: 'The four-revolution jump in figure skating first landed in competition by Kurt Browning in 1988 and now standard for elite men.', a: 'Quadruple jump', category: 'sports', difficulty: 4, alt: ['Quad jump', 'Quad'] },
    { q: 'Canadian-born NHL head coach who won three Stanley Cups with the Chicago Blackhawks in 2010, 2013 and 2015 before resigning over the Aldrich scandal.', a: 'Quenneville', category: 'sports', difficulty: 4, alt: ['Joel Quenneville'] },
    { q: 'The strongest piece in chess, a single move of which from h5 to f7 delivers the famous Scholar\'s Mate.', a: 'Queen', category: 'sports', difficulty: 2 },
    { q: 'The traditional pre-Wimbledon ATP grass tournament held in west London since 1890, won a record five times by Andy Murray.', a: 'Queen\'s Club Championships', category: 'sports', difficulty: 4, alt: ['Queens Club Championships', 'Queen\'s Club', 'Queens Club'] },
    { q: 'West London football club nicknamed the Hoops, who play at Loftus Road and last reached the Premier League in 2014-15.', a: 'Queens Park Rangers', category: 'sports', difficulty: 3, alt: ['QPR', 'Queen\'s Park Rangers'] },
  ],
};
