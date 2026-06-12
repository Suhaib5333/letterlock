// Build the "Guess the Movie (Trailer)" pack. We can't search YouTube without an
// API key (and iTunes' movie API is dead), so we curate a candidate list of
// [movie, year, youtubeId] and VERIFY each id against the real video title via
// YouTube's keyless oEmbed endpoint. Only ids whose title actually matches the
// movie (and is a trailer/teaser) are kept — so a wrong/guessed id can never ship.
//
// Run:  node scripts/genmovies.mjs   → writes src/content/movieClips.ts
import { writeFile } from 'node:fs/promises';

// [title, year, youtubeId]  — official-trailer ids from studio / Rotten Tomatoes channels.
const CANDIDATES = [
  ['Inception', 2010, 'YoHD9XEInc0'],
  ['Interstellar', 2014, 'zSWdZVtXT7E'],
  ['The Dark Knight', 2008, 'EXeTwQWrcwY'],
  ['The Matrix', 1999, 'vKQi3bBA1y8'],
  ['Avatar: The Way of Water', 2022, 'd9MyW72ELq0'],
  ['Avengers: Endgame', 2019, 'TcMBFSGVi1c'],
  ['Avengers: Infinity War', 2018, '6ZfuNTqbHE8'],
  ['The Avengers', 2012, 'eOrNdBpGMv8'],
  ['Joker', 2019, 'zAGVQLHvwOY'],
  ['The Lion King', 2019, '7TavVZMewpY'],
  ['Jurassic World', 2015, 'RFinNxS5KN4'],
  ['Jurassic Park', 1993, 'lc0UehYemQA'],
  ['Star Wars: The Force Awakens', 2015, 'sGbxmsDFVnE'],
  ['Gladiator', 2000, 'owK1qxDselE'],
  ['The Godfather', 1972, 'sY1S34973zA'],
  ['Pulp Fiction', 1994, 's7EdQ4FqbhY'],
  ['Forrest Gump', 1994, 'bLvqoHBptjg'],
  ['The Shawshank Redemption', 1994, 'NmzuHjWmXOc'],
  ['Spider-Man: No Way Home', 2021, 'JfVOs4VSpmA'],
  ['Black Panther', 2018, 'xjDjIWPwcPU'],
  ['Frozen', 2013, 'TbQm5doF_Uc'],
  ['Frozen II', 2019, 'Zi4LMpSDccc'],
  ['Harry Potter and the Sorcerer’s Stone', 2001, 'VyHV0BRtdxo'],
  ['The Lord of the Rings: The Fellowship of the Ring', 2001, 'V75dMMIW2B4'],
  ['Finding Nemo', 2003, '2zLkY7P2VK0'],
  ['Coco', 2017, 'Rvr68u6k5sI'],
  ['Moana', 2016, 'LKFuXETZUsI'],
  ['Encanto', 2021, 'CaimKeDcudo'],
  ['Minions', 2015, 'eisKxhjBnZ0'],
  ['Barbie', 2023, 'pBk4NYhWNMM'],
  ['Oppenheimer', 2023, 'uYPbbksJxIg'],
  ['Top Gun: Maverick', 2022, 'qSqVVswa420'],
  ['Dune', 2021, 'n9xhJrPXop4'],
  ['Deadpool', 2016, 'ONHBaC-pfsk'],
  ['Guardians of the Galaxy', 2014, 'd96cjJhvlMA'],
  ['Captain America: Civil War', 2016, 'dKrVegVI0Us'],
  ['Thor: Ragnarok', 2017, 'ue80QwXMRHg'],
  ['Zootopia', 2016, 'jWM0ct-OLsM'],
  ['Inside Out', 2015, 'yRUAzGQ3nSY'],
  ['Toy Story 3', 2010, 'JcUBdT-zCVk'],
  ['Shrek', 2001, 'W1HpyT9Hr6E'],
  ['The Incredibles', 2004, '-UaGUdNJdRQ'],
  ['Wonder Woman', 2017, '1Q8fG0TtVAY'],
  ['Aquaman', 2018, 'WDkg3h8PCVU'],
  ['Doctor Strange', 2016, 'HSzx-zryEgM'],
  ['Iron Man', 2008, '8ugaeA-nMTc'],
  ['Spider-Man: Into the Spider-Verse', 2018, 'g4Hbz2jLxvQ'],
  ['Ratatouille', 2007, 'c3sBBRxDAqk'],
  ['Up', 2009, 'pkqzFUhGPJg'],
  ['Despicable Me', 2010, 'eFC8AG90QnY'],
  ['The Hunger Games', 2012, 'mfmrPu43DF8'],
  ['Titanic', 1997, '2e-eXJ6HgkQ'],
  ['Tenet', 2020, 'L3pk_TBkihU'],
  ['Black Widow', 2021, 'Fp9pNPdNwjI'],
  ['Wakanda Forever', 2022, 'RlOB3UALvrQ'],
  ['No Time to Die', 2021, 'BIhNsAtPbPI'],
  ['Skyfall', 2012, '6kw1UVovByw'],
  ['Mad Max: Fury Road', 2015, 'hEJnMQG9ev8'],
  ['La La Land', 2016, '0pdqf4P9MB8'],
  ['Bohemian Rhapsody', 2018, 'mP0VHJYFOAU'],
  ['Parasite', 2019, '5xH0HfJHsaY'],
  ['Get Out', 2017, 'DzfpyUB60YY'],
  ['It', 2017, 'FnCdOQsX5kc'],
  ['A Quiet Place', 2018, 'WR7cc5t7tv8'],
  ['John Wick', 2014, 'C0BMx-qxsP4'],
  ['The Lego Movie', 2014, 'fZ_JOBCLF-I'],
  ['Sonic the Hedgehog', 2020, 'szby7ZHLnkA'],
  ['Cars', 2006, 'WnLEnDQxFiQ'],
  ['Brave', 2012, 'TEHWDA_6e3M'],
  ['Tangled', 2010, 'ZQUg7Mu8C04'],
  ['Wall-E', 2008, 'alIq_wG9FNk'],
  ['Monsters, Inc.', 2001, 'gZ4fnufgkAU'],
  ['Kung Fu Panda', 2008, '-Ob1Nz7Rdjs'],
  ['How to Train Your Dragon', 2010, 'Q9_eL3jWVUw'],
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['the', 'of', 'and', 'a', 'an', 'to', 'in', 'ii', 'iii', 'your', 'how', 'no']);

async function oembedTitle(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return j.title || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function matches(movie, title) {
  const tnorm = norm(title);
  if (!/\b(trailer|teaser)\b/.test(tnorm)) return false; // must be a trailer, not a clip/review
  const tokens = norm(movie).split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
  if (tokens.length === 0) return tnorm.includes(norm(movie)); // tiny titles: whole-name match
  // require ALL distinctive tokens present (so "Frozen II" ≠ "Frozen") — order-free
  return tokens.every((tok) => tnorm.includes(tok));
}

const kept = [];
const dropped = [];
for (const [movie, year, id] of CANDIDATES) {
  const title = await oembedTitle(id);
  if (title && matches(movie, title)) {
    kept.push({ movie, year, id, title });
    console.log(`✅ ${movie} (${year}) → ${id}  ::  ${title}`);
  } else {
    dropped.push({ movie, id, title });
    console.log(`❌ ${movie} → ${id}  ::  ${title ?? '(no title / not found)'}`);
  }
  await new Promise((r) => setTimeout(r, 120)); // gentle pacing
}

// Ensure ≥16 distinct first-letters (the playability rule). Report it.
const letters = new Set(kept.map((k) => k.movie.replace(/^(the|a|an)\s+/i, '')[0]?.toUpperCase()));
console.log(`\nKept ${kept.length}/${CANDIDATES.length}; distinct first-letters: ${letters.size}`);

// Build the pack file. Answers are the movie titles; rebucketByAnswer files each
// under its first letter automatically. Letterless (hideBoardLetters) so any hex
// serves any trailer. Question is a clean generic prompt (no answer leak).
const rows = kept
  .map(
    (k) =>
      `  { q: 'Watch the trailer — name the movie. (${k.year})', a: ${JSON.stringify(k.movie)}, youtube: ${JSON.stringify(k.id)}, category: 'screen', difficulty: 2 },`,
  )
  .join('\n');

const out = `// AUTO-GENERATED by scripts/genmovies.mjs — do not hand-edit.
// "Guess the Movie (Trailer)" — each question embeds an OFFICIAL trailer (YouTube,
// privacy-mode no-cookie) and asks the player to name the film. Every id below was
// verified at build time against the real video title via YouTube oEmbed, so no
// wrong/dead trailer can ship. Embedding promotional trailers is legal; nothing is stored.
import type { RawPack } from '../core/packs';

export const movieClipsPack: RawPack = {
  id: 'movies-clips',
  name: 'Guess the Movie (Trailer)',
  description: 'Watch an official trailer and name the blockbuster. Eyes on the screen!',
  emoji: '🎬',
  accent: '#e85d75',
  difficulty: 'medium',
  locale: 'en',
  contentRating: 'everyone',
  hideBoardLetters: true,
  letters: {
    _: [
${rows.replace(/^/gm, '    ')}
    ],
  },
};
`;

await writeFile(new URL('../src/content/movieClips.ts', import.meta.url), out, 'utf8');
console.log(`\nWrote src/content/movieClips.ts with ${kept.length} verified trailers.`);
