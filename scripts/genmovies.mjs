// Build the "Guess the Movie / TV-Show" clip packs — 3 movie tiers + 3 TV tiers.
//
// MOVIES: official YouTube trailers. We can't search YouTube without an API key, so we
//   curate [title, year, youtubeId] and VERIFY each id against the real video title via
//   YouTube's keyless oEmbed — only ids whose title matches AND is a trailer survive, so
//   a wrong/dead id can never ship. Embedded via youtube-nocookie (legal; nothing stored).
//
// TV SHOWS: REAL 30-second episode preview clips from the iTunes Search API
//   (entity=tvEpisode → previewUrl .m4v, hotlinkable like the song previews). We match
//   results by artistName (= the show) so the clip is genuinely from that series. This
//   is "guess the show from real footage" — and needs no guessed ids (the API is the
//   source of truth). Netflix/HBO-Max originals aren't on iTunes, so the TV lists lean on
//   network/cable/HBO shows that are.
//
// Run:  node scripts/genmovies.mjs   → writes src/content/movieClips.ts
import { writeFile } from 'node:fs/promises';

// ---------- MOVIES (YouTube trailers) ----------
const MOVIES_EASY = [
  ['Frozen', 2013, 'TbQm5doF_Uc'], ['Frozen II', 2019, 'Zi4LMpSDccc'], ['The Lion King', 2019, '7TavVZMewpY'],
  ['Minions', 2015, 'eisKxhjBnZ0'], ['Barbie', 2023, 'pBk4NYhWNMM'], ['Jurassic World', 2015, 'RFinNxS5KN4'],
  ['Jurassic Park', 1993, 'lc0UehYemQA'], ['The Avengers', 2012, 'eOrNdBpGMv8'], ['Avengers: Endgame', 2019, 'TcMBFSGVi1c'],
  ['Avengers: Infinity War', 2018, '6ZfuNTqbHE8'], ['Spider-Man: No Way Home', 2021, 'JfVOs4VSpmA'],
  ['Spider-Man: Into the Spider-Verse', 2018, 'g4Hbz2jLxvQ'], ['Black Panther', 2018, 'xjDjIWPwcPU'],
  ['Titanic', 1997, '2e-eXJ6HgkQ'], ['Harry Potter and the Sorcerer’s Stone', 2001, 'VyHV0BRtdxo'],
  ['Star Wars: The Force Awakens', 2015, 'sGbxmsDFVnE'], ['Moana', 2016, 'LKFuXETZUsI'], ['Encanto', 2021, 'CaimKeDcudo'],
  ['Coco', 2017, 'Rvr68u6k5sI'], ['Zootopia', 2016, 'jWM0ct-OLsM'], ['Inside Out', 2015, 'yRUAzGQ3nSY'],
  ['Aquaman', 2018, 'WDkg3h8PCVU'], ['Wonder Woman', 2017, '1Q8fG0TtVAY'], ['Sonic the Hedgehog', 2020, 'szby7ZHLnkA'],
  ['The Lego Movie', 2014, 'fZ_JOBCLF-I'], ['Brave', 2012, 'TEHWDA_6e3M'], ['Wall-E', 2008, 'alIq_wG9FNk'],
  ['Ratatouille', 2007, 'c3sBBRxDAqk'], ['The Incredibles', 2004, '-UaGUdNJdRQ'], ['The Hunger Games', 2012, 'mfmrPu43DF8'],
  ['Iron Man', 2008, '8ugaeA-nMTc'], ['The Little Mermaid', 2023, 'kpGo2_d3oYE'], ['Beauty and the Beast', 2017, 'e1nqfMN2vN4'],
  ['Aladdin', 2019, 'foyufD52aog'], ['The Jungle Book', 2016, 'lac8DBwxiHo'], ['The Super Mario Bros. Movie', 2023, 'TnGl01FkMMo'],
  ['Despicable Me 2', 2013, 'AC4xVjY1NY0'], ['Kung Fu Panda', 2008, 'wbHCxBn5sV4'], ['How to Train Your Dragon', 2010, 'pq8Yu25fmgY'],
  ['Madagascar', 2005, 'pBVKv8iWUVo'], ['Shrek 2', 2004, 'qWS9b9DJPZs'],
];
const MOVIES_MEDIUM = [
  ['Inception', 2010, 'YoHD9XEInc0'], ['Interstellar', 2014, 'zSWdZVtXT7E'], ['The Dark Knight', 2008, 'EXeTwQWrcwY'],
  ['The Matrix', 1999, 'vKQi3bBA1y8'], ['Gladiator', 2000, 'owK1qxDselE'], ['Avatar: The Way of Water', 2022, 'd9MyW72ELq0'],
  ['Joker', 2019, 'zAGVQLHvwOY'], ['Dune', 2021, 'n9xhJrPXop4'], ['Deadpool', 2016, 'ONHBaC-pfsk'],
  ['Guardians of the Galaxy', 2014, 'd96cjJhvlMA'], ['Captain America: Civil War', 2016, 'dKrVegVI0Us'],
  ['Thor: Ragnarok', 2017, 'ue80QwXMRHg'], ['Doctor Strange', 2016, 'HSzx-zryEgM'], ['Top Gun: Maverick', 2022, 'qSqVVswa420'],
  ['Tenet', 2020, 'L3pk_TBkihU'], ['Black Widow', 2021, 'Fp9pNPdNwjI'], ['Wakanda Forever', 2022, 'RlOB3UALvrQ'],
  ['No Time to Die', 2021, 'BIhNsAtPbPI'], ['Skyfall', 2012, '6kw1UVovByw'], ['Mad Max: Fury Road', 2015, 'hEJnMQG9ev8'],
  ['John Wick', 2014, 'C0BMx-qxsP4'], ['A Quiet Place', 2018, 'WR7cc5t7tv8'], ['Get Out', 2017, 'DzfpyUB60YY'],
  ['It', 2017, 'FnCdOQsX5kc'], ['Bohemian Rhapsody', 2018, 'mP0VHJYFOAU'], ['La La Land', 2016, '0pdqf4P9MB8'],
  ['Oppenheimer', 2023, 'uYPbbksJxIg'], ['Avatar', 2009, '5PSNL1qE6VY'], ['The Wolf of Wall Street', 2013, 'iszwuX1AK6A'],
  ['Logan', 2017, 'Div0iP65aZo'], ['The Batman', 2022, 'mqqft2x_Aa4'], ['Venom', 2018, 'u9Mv98Gr5pY'],
  ['Shutter Island', 2010, '5iaYLCiq5RM'], ['The Revenant', 2015, 'LfWkXDfmk9w'], ['Once Upon a Time in Hollywood', 2019, 'ELeMaP8EPAA'],
  ['Knives Out', 2019, 'qGqiHJTsRkQ'],
];
const MOVIES_HARD = [
  ['The Godfather', 1972, 'sY1S34973zA'], ['Pulp Fiction', 1994, 's7EdQ4FqbhY'], ['The Shawshank Redemption', 1994, 'NmzuHjWmXOc'],
  ['Forrest Gump', 1994, 'bLvqoHBptjg'], ['Parasite', 2019, '5xH0HfJHsaY'],
  ['The Lord of the Rings: The Fellowship of the Ring', 2001, 'V75dMMIW2B4'], ['Whiplash', 2014, '7d_jQycdQGo'],
  ['Fight Club', 1999, 'qtRKdVHc-cE'], ['Goodfellas', 1990, '2ilzidi_J8Q'], ['The Departed', 2006, 'iojhqm0JTW4'],
  ['Schindler’s List', 1993, 'gG22XNhtnoY'], ['No Country for Old Men', 2007, '38A__WT3-o0'], ['Django Unchained', 2012, '0fUCuvNlOCg'],
  ['The Prestige', 2006, 'o4gHCmTQDVI'], ['Blade Runner 2049', 2017, 'gCcx85zbxz4'], ['The Grand Budapest Hotel', 2014, '1Fg5iWmQjwk'],
  ['1917', 2019, 'YqNYrYUiMfg'], ['Moonlight', 2016, '9NJj12tJzqc'], ['Drive', 2011, 'KBiOF3y1W0Y'], ['Birdman', 2014, 'uJfLoE6hanc'],
  ['The Silence of the Lambs', 1991, 'W6Mm8Sbe__o'], ['Memento', 2000, '0vS0E9bBSL0'], ['Alien', 1979, 'LjLamj-b0I8'],
  ['Inglourious Basterds', 2009, 'KnrRy6kSFF0'], ['Saving Private Ryan', 1998, 'zwhP5b4tD6g'], ['Gladiator II', 2024, 'Vqkdiu5R7Vk'],
  ['The Green Mile', 1999, 'Ki4haFrqSrw'], ['Casino', 1995, '4-rAvHL7vyA'], ['Heat', 1995, '2GfZl4kuVNI'],
  ['Scarface', 1983, 'tF-vBA0KZ8s'], ['Apocalypse Now', 1979, 'Fm10MNkVHII'],
];

// ---------- TV SHOWS (iTunes episode preview clips) ----------
const TV_EASY = [
  'The Office', 'Friends', 'The Big Bang Theory', 'Game of Thrones', "Grey's Anatomy", 'How I Met Your Mother',
  'The Simpsons', 'Modern Family', 'Breaking Bad', 'Family Guy', 'SpongeBob SquarePants', 'Brooklyn Nine-Nine',
  'Parks and Recreation', 'Two and a Half Men', 'NCIS', 'Glee', 'Desperate Housewives', 'The Walking Dead',
  'CSI: Miami', 'Hannah Montana', 'Scrubs', 'That 70s Show', 'Malcolm in the Middle', 'The Fresh Prince of Bel-Air',
  'iCarly', 'Wizards of Waverly Place', 'Drake & Josh', 'Victorious', 'Phineas and Ferb', 'South Park',
  'American Dad', 'Futurama', "Bob's Burgers", 'King of the Hill', 'Avatar: The Last Airbender', 'Riverdale',
  'Gossip Girl', 'Pretty Little Liars', 'New Girl', 'The Vampire Diaries', 'Community', 'Gilmore Girls',
];
const TV_MEDIUM = [
  'Lost', 'Prison Break', 'Dexter', 'House', 'Suits', 'Sons of Anarchy', 'Vikings', 'Homeland',
  'Supernatural', 'Arrow', 'The Flash', '24', 'Heroes', 'Smallville', 'White Collar', 'Burn Notice',
  'Castle', 'Bones', 'Fringe', 'Entourage', 'Californication', 'True Blood', 'Person of Interest',
  'The Mentalist', 'Criminal Minds', 'Law & Order: Special Victims Unit', 'CSI', 'Chuck', 'Once Upon a Time',
  'Grimm', 'Hawaii Five-0', 'Blue Bloods', 'Elementary', 'Luther', 'Broadchurch', 'Downton Abbey',
  'The Americans', 'Banshee', 'Hell on Wheels', 'Ray Donovan', 'Billions', 'Shameless', 'The Affair',
];
const TV_HARD = [
  'The Wire', 'The Sopranos', 'Mad Men', 'Deadwood', 'Boardwalk Empire', 'Six Feet Under', 'Twin Peaks',
  'Battlestar Galactica', 'Band of Brothers', 'Curb Your Enthusiasm', "It's Always Sunny in Philadelphia",
  'Frasier', 'Seinfeld', 'Cheers', 'The X-Files', 'Buffy the Vampire Slayer', 'The West Wing', 'Oz',
  'Veep', 'Rome', 'Justified', 'The Shield', 'Spartacus', 'Sherlock', 'Better Call Saul', 'Fargo',
  'Westworld', 'Mr. Robot', 'The Newsroom', 'Hannibal', 'The Knick', 'Boardwalk Empire', 'Generation Kill',
  'Angels in America', 'John Adams', 'True Detective', 'Big Love', 'Carnivale', 'Treme',
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['the', 'of', 'and', 'a', 'an', 'to', 'in', 'ii', 'iii', 'your', 'how', 'no', 'will', 'be']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// --- movies via YouTube oEmbed ---
function ytMatches(title, ytTitle) {
  const tnorm = norm(ytTitle);
  if (!/\b(trailer|teaser|first look)\b/.test(tnorm)) return false;
  const tokens = norm(title).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  if (tokens.length === 0) return tnorm.includes(norm(title));
  return tokens.every((tok) => tnorm.includes(tok));
}
async function verifyMovies(list, kind) {
  const kept = [];
  for (const [title, year, id] of list) {
    const j = await getJson(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${encodeURIComponent(id)}`);
    if (j?.title && ytMatches(title, j.title)) kept.push({ title, year, id });
    else console.log(`  ❌ movie ${title} → ${id}`);
    await sleep(110);
  }
  console.log(`  [${kind}] kept ${kept.length}/${list.length}`);
  return kept;
}

// --- TV via iTunes episode previews ---
async function verifyTv(shows, kind) {
  const kept = [];
  const seen = new Set();
  for (const show of shows) {
    if (seen.has(norm(show))) continue;
    seen.add(norm(show));
    // iTunes rate-limits bursts → retry with backoff so a throttle doesn't drop a real show.
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(show)}&entity=tvEpisode&limit=50&country=US`;
    let j = null;
    for (let attempt = 0; attempt < 4 && !j; attempt++) {
      if (attempt) await sleep(800 * attempt);
      j = await getJson(url);
    }
    const target = norm(show);
    const cands = (j?.results || []).filter((x) => {
      if (!x.previewUrl) return false;
      const a = norm(x.artistName || '');
      const c = norm(x.collectionName || '');
      return a === target || a.startsWith(target + ' ') || c.startsWith(target + ' ') || c === target;
    });
    // Prefer an exact-artist match (avoids spin-offs sneaking in via startsWith).
    const hit = cands.find((x) => norm(x.artistName || '') === target) || cands[0];
    if (hit) kept.push({ title: show, url: hit.previewUrl, year: (hit.releaseDate || '').slice(0, 4) });
    else console.log(`  ❌ tv ${show}`);
    await sleep(350);
  }
  console.log(`  [${kind}] kept ${kept.length}/${shows.length}`);
  return kept;
}

const movieRow = (k) =>
  `      { q: 'Watch the trailer — name the movie. (${k.year})', a: ${JSON.stringify(k.title)}, youtube: ${JSON.stringify(k.id)}, category: 'screen', difficulty: 2 },`;
const tvRow = (k) =>
  `      { q: 'Watch the clip — name the TV show.', a: ${JSON.stringify(k.title)}, video: ${JSON.stringify(k.url)}, category: 'screen', difficulty: 2 },`;

function packLiteral(varName, id, name, desc, emoji, accent, difficulty, kept, rowFn) {
  return `export const ${varName}: RawPack = {
  id: '${id}',
  name: ${JSON.stringify(name)},
  description: ${JSON.stringify(desc)},
  emoji: '${emoji}',
  accent: '${accent}',
  difficulty: '${difficulty}',
  locale: 'en',
  contentRating: 'everyone',
  hideBoardLetters: true,
  letters: {
    _: [
${kept.map(rowFn).join('\n')}
    ],
  },
};
`;
}

console.log('=== MOVIES (YouTube trailers) ===');
const me = await verifyMovies(MOVIES_EASY, 'movies-easy');
const mm = await verifyMovies(MOVIES_MEDIUM, 'movies-medium');
const mh = await verifyMovies(MOVIES_HARD, 'movies-hard');
console.log('=== TV SHOWS (iTunes episode previews) ===');
const te = await verifyTv(TV_EASY, 'tv-easy');
const tm = await verifyTv(TV_MEDIUM, 'tv-medium');
const th = await verifyTv(TV_HARD, 'tv-hard');

const out = `// AUTO-GENERATED by scripts/genmovies.mjs — do not hand-edit.
// "Guess the Movie / TV-Show" clip packs.
//  • Movies: official YouTube trailers (privacy-mode embed), each id verified at build
//    time against the real video title via YouTube oEmbed — no wrong/dead trailer ships.
//  • TV shows: REAL 30-second episode preview clips from the iTunes Search API
//    (hotlinked .m4v, same CDN family as the song previews), matched by show name.
// Both are letterless: any hex serves any clip. Promotional trailers / store previews
// are meant for embedding — nothing copyrighted is stored.
import type { RawPack } from '../core/packs';

${packLiteral('movieClipsEasyPack', 'movies-clips-easy', 'Movie Clips — Easy', 'Watch an official trailer and name the blockbuster everyone knows.', '🎬', '#e85d75', 'easy', me, movieRow)}
${packLiteral('movieClipsMediumPack', 'movies-clips-medium', 'Movie Clips — Medium', 'Name the movie from its trailer — modern hits and classics.', '🎬', '#d6336c', 'medium', mm, movieRow)}
${packLiteral('movieClipsHardPack', 'movies-clips-hard', 'Movie Clips — Hard', 'For film buffs — name the acclaimed film from its trailer.', '🎬', '#a61e4d', 'hard', mh, movieRow)}
${packLiteral('tvClipsEasyPack', 'tv-clips-easy', 'TV Show Clips — Easy', 'Watch a real clip and name the hit series.', '📺', '#4c6ef5', 'easy', te, tvRow)}
${packLiteral('tvClipsMediumPack', 'tv-clips-medium', 'TV Show Clips — Medium', 'Name the TV show from a real episode clip.', '📺', '#3b5bdb', 'medium', tm, tvRow)}
${packLiteral('tvClipsHardPack', 'tv-clips-hard', 'TV Show Clips — Hard', 'For true binge-watchers — name the prestige series from a clip.', '📺', '#364fc7', 'hard', th, tvRow)}
`;

await writeFile(new URL('../src/content/movieClips.ts', import.meta.url), out, 'utf8');
console.log('Counts:', { me: me.length, mm: mm.length, mh: mh.length, te: te.length, tm: tm.length, th: th.length });
console.log('Wrote src/content/movieClips.ts');
