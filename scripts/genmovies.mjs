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

// ---------- TV SHOWS (iTunes episode preview clips) ----------
const TV_EASY = [
  'The Office', 'Friends', 'The Big Bang Theory', 'Game of Thrones', "Grey's Anatomy", 'How I Met Your Mother',
  'The Simpsons', 'Modern Family', 'Breaking Bad', 'Family Guy', 'SpongeBob SquarePants', 'Brooklyn Nine-Nine',
  'Parks and Recreation', 'Two and a Half Men', 'NCIS', 'Glee', 'Desperate Housewives', 'The Walking Dead',
  'CSI: Miami', 'Hannah Montana', 'Scrubs', 'That 70s Show', 'Malcolm in the Middle', 'The Fresh Prince of Bel-Air',
  'iCarly', 'Wizards of Waverly Place', 'Drake & Josh', 'Victorious', 'Phineas and Ferb', 'South Park',
  'American Dad', 'Futurama', "Bob's Burgers", 'King of the Hill', 'Avatar: The Last Airbender', 'Riverdale',
  'Gossip Girl', 'Pretty Little Liars', 'New Girl', 'The Vampire Diaries', 'Community', 'Gilmore Girls',
  'Friday Night Lights', 'The OC', 'One Tree Hill', '90210', 'Smallville', 'Glee', 'Dawson’s Creek',
  'Everybody Loves Raymond', 'King of Queens', 'Will & Grace', 'Frasier', 'Seinfeld', 'Cheers', 'Full House',
  'Boy Meets World', 'Saved by the Bell', 'Sabrina the Teenage Witch', 'Lizzie McGuire', 'That’s So Raven',
  'Suite Life of Zack and Cody', 'Kim Possible', 'Recess', 'Rugrats', 'Hey Arnold!', 'The Powerpuff Girls',
  'Dexter’s Laboratory', 'Tom and Jerry', 'Scooby-Doo, Where Are You!', 'Teen Titans Go!', 'Adventure Time',
  'Spongebob Squarepants', 'The Amazing World of Gumball', 'Ben 10', 'Naruto', 'Dragon Ball Z', 'Pokémon',
  'Glee', 'Empire', 'Scandal', 'How to Get Away with Murder', 'This Is Us', 'The Good Doctor', '9-1-1',
  'Chicago Fire', 'Chicago P.D.', 'Chicago Med', 'NCIS: Los Angeles', 'NCIS: New Orleans', 'Hawaii Five-0',
  'MacGyver', 'Magnum P.I.', 'Survivor', 'The Bachelor', 'American Idol', 'The Voice', 'Shark Tank',
];
const TV_MEDIUM = [
  'Lost', 'Prison Break', 'Dexter', 'House', 'Suits', 'Sons of Anarchy', 'Vikings', 'Homeland',
  'Supernatural', 'Arrow', 'The Flash', '24', 'Heroes', 'Smallville', 'White Collar', 'Burn Notice',
  'Castle', 'Bones', 'Fringe', 'Entourage', 'Californication', 'True Blood', 'Person of Interest',
  'The Mentalist', 'Criminal Minds', 'Law & Order: Special Victims Unit', 'CSI', 'Chuck', 'Once Upon a Time',
  'Grimm', 'Hawaii Five-0', 'Blue Bloods', 'Elementary', 'Luther', 'Broadchurch', 'Downton Abbey',
  'The Americans', 'Banshee', 'Hell on Wheels', 'Ray Donovan', 'Billions', 'Shameless', 'The Affair',
  'Nip/Tuck', 'Rescue Me', 'The Closer', 'Damages', 'Boston Legal', 'Ally McBeal', 'The Practice', 'ER',
  'Chicago Hope', 'Law & Order', 'Law & Order: Criminal Intent', 'NYPD Blue', 'The Shield', 'Numb3rs',
  'Cold Case', 'Without a Trace', 'Monk', 'Psych', 'Royal Pains', 'Covert Affairs', 'Leverage', 'Warehouse 13',
  'Eureka', 'Stargate SG-1', 'Stargate Atlantis', 'Battlestar Galactica', 'Farscape', 'Firefly', 'Dollhouse',
  'Angel', 'Charmed', 'Roswell', 'Veronica Mars', 'Alias', 'Felicity', 'Nikita', 'Revenge', 'Scandal',
  'The Blacklist', 'Quantico', 'Designated Survivor', 'Madam Secretary', 'House of Cards', 'Boardwalk Empire',
  'Peaky Blinders', 'Narcos', 'Ozark', 'Better Call Saul', 'Fargo', 'Mr. Robot', 'Westworld',
];
const TV_HARD = [
  'The Wire', 'The Sopranos', 'Mad Men', 'Deadwood', 'Boardwalk Empire', 'Six Feet Under', 'Twin Peaks',
  'Battlestar Galactica', 'Band of Brothers', 'Curb Your Enthusiasm', "It's Always Sunny in Philadelphia",
  'Frasier', 'Seinfeld', 'Cheers', 'The X-Files', 'Buffy the Vampire Slayer', 'The West Wing', 'Oz',
  'Veep', 'Rome', 'Justified', 'The Shield', 'Spartacus', 'Sherlock', 'Better Call Saul', 'Fargo',
  'Westworld', 'Mr. Robot', 'The Newsroom', 'Hannibal', 'The Knick', 'Generation Kill',
  'Angels in America', 'John Adams', 'True Detective', 'Big Love', 'Carnivale', 'Treme', 'Enlightened',
  'In Treatment', 'Looking', 'Getting On', 'Togetherness', 'Vinyl', 'The Pacific', 'Chernobyl',
  'Watchmen', 'The Leftovers', 'Sharp Objects', 'Mare of Easttown', 'I May Destroy You', 'Succession',
  'Barry', 'Silicon Valley', 'Eastbound & Down', 'Bored to Death', 'Flight of the Conchords', 'The Comeback',
  'Party Down', 'Arrested Development', '30 Rock', 'Community', 'Louie', 'Atlanta', 'Master of None',
  'Transparent', 'Mozart in the Jungle', 'Patriot', 'Sneaky Pete', 'Goliath', 'Bosch', 'Hand of God',
  'The Man in the High Castle', 'Homecoming', 'Hunters', 'Tales from the Loop', 'Devs', 'Counterpart',
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

// NOTE: Movie packs were removed — the ONLY movie-video source was YouTube trailers
// (iTunes' movie API is dead), and a YouTube iframe can't be made spoiler-safe in
// fullscreen (title/end-screen leak). TV clips use the native <video> (iTunes preview
// .m4v) which supports SAFE fullscreen — real footage, no title overlay.
console.log('=== TV SHOWS (iTunes episode previews) ===');
const te = await verifyTv(TV_EASY, 'tv-easy');
const tm = await verifyTv(TV_MEDIUM, 'tv-medium');
const th = await verifyTv(TV_HARD, 'tv-hard');

const out = `// AUTO-GENERATED by scripts/genmovies.mjs — do not hand-edit.
// "Guess the TV-Show (Clip)" packs — REAL 30-second episode preview clips from the
// iTunes Search API (hotlinked .m4v, same CDN family as the song previews), matched by
// show name. Letterless: any hex serves any clip. The native <video> supports fullscreen
// safely (no title/thumbnail to leak). Store preview clips are made for embedding —
// nothing copyrighted is stored. (Movie packs were removed — see scripts/genmovies.mjs.)
import type { RawPack } from '../core/packs';

${packLiteral('tvClipsEasyPack', 'tv-clips-easy', 'TV Show Clips — Easy', 'Watch a real clip and name the hit series.', '📺', '#4c6ef5', 'easy', te, tvRow)}
${packLiteral('tvClipsMediumPack', 'tv-clips-medium', 'TV Show Clips — Medium', 'Name the TV show from a real episode clip.', '📺', '#3b5bdb', 'medium', tm, tvRow)}
${packLiteral('tvClipsHardPack', 'tv-clips-hard', 'TV Show Clips — Hard', 'For true binge-watchers — name the prestige series from a clip.', '📺', '#364fc7', 'hard', th, tvRow)}
`;

await writeFile(new URL('../src/content/movieClips.ts', import.meta.url), out, 'utf8');
console.log('Counts:', { te: te.length, tm: tm.length, th: th.length, total: te.length + tm.length + th.length });
console.log('Wrote src/content/movieClips.ts');
