/**
 * Build a "Guess the Song" pack from the free iTunes Search API. We fetch each
 * famous song's official 30-second PREVIEW url (Apple's preview CDN, made for
 * hotlinking in preview players) and reference it directly — nothing copyrighted
 * is stored in the repo. Answer = song title (guess the song from the clip).
 */
import { writeFileSync } from 'node:fs';

// [title, artist, answer, alts?] — answer is what players guess (the title).
// A broad set of very famous songs (many genres/decades) so the pack clears 200
// after iTunes resolves previews. Duplicates by answer are de-duped downstream.
const SONGS = [
  ['Africa', 'Toto', 'Africa'], ['All Star', 'Smash Mouth', 'All Star'],
  ['Believer', 'Imagine Dragons', 'Believer'], ['Bohemian Rhapsody', 'Queen', 'Bohemian Rhapsody'],
  ['Bad Guy', 'Billie Eilish', 'Bad Guy'], ['Counting Stars', 'OneRepublic', 'Counting Stars'],
  ['Creep', 'Radiohead', 'Creep'], ['Dynamite', 'BTS', 'Dynamite'],
  ['Dancing Queen', 'ABBA', 'Dancing Queen'], ['Eye of the Tiger', 'Survivor', 'Eye of the Tiger'],
  ['Faded', 'Alan Walker', 'Faded'], ['Firework', 'Katy Perry', 'Firework'],
  ['Hello', 'Adele', 'Hello'], ['Happy', 'Pharrell Williams', 'Happy'],
  ['Hey Jude', 'The Beatles', 'Hey Jude'], ['Imagine', 'John Lennon', 'Imagine'],
  ['In the End', 'Linkin Park', 'In the End'], ['Jolene', 'Dolly Parton', 'Jolene'],
  ['Just the Way You Are', 'Bruno Mars', 'Just the Way You Are'], ['Levitating', 'Dua Lipa', 'Levitating'],
  ['Let It Be', 'The Beatles', 'Let It Be'], ['Lose Yourself', 'Eminem', 'Lose Yourself'],
  ['Mamma Mia', 'ABBA', 'Mamma Mia'], ['My Heart Will Go On', 'Celine Dion', 'My Heart Will Go On'],
  ['Numb', 'Linkin Park', 'Numb'], ['November Rain', "Guns N' Roses", 'November Rain'],
  ['One Dance', 'Drake', 'One Dance'], ['Perfect', 'Ed Sheeran', 'Perfect'],
  ['Paranoid', 'Black Sabbath', 'Paranoid'], ['Radioactive', 'Imagine Dragons', 'Radioactive'],
  ['Rolling in the Deep', 'Adele', 'Rolling in the Deep'], ['Roar', 'Katy Perry', 'Roar'],
  ['Shape of You', 'Ed Sheeran', 'Shape of You'], ['Smells Like Teen Spirit', 'Nirvana', 'Smells Like Teen Spirit'],
  ['Stairway to Heaven', 'Led Zeppelin', 'Stairway to Heaven'],
  ['Sweet Child O Mine', "Guns N' Roses", "Sweet Child o' Mine", ['sweet child of mine']],
  ['Thriller', 'Michael Jackson', 'Thriller'], ['Titanium', 'David Guetta', 'Titanium'],
  ['Uptown Funk', 'Mark Ronson', 'Uptown Funk'], ['Umbrella', 'Rihanna', 'Umbrella'],
  ['Viva la Vida', 'Coldplay', 'Viva la Vida'], ['Wonderwall', 'Oasis', 'Wonderwall'],
  ['We Will Rock You', 'Queen', 'We Will Rock You'], ['Yesterday', 'The Beatles', 'Yesterday'],
  ['Yellow', 'Coldplay', 'Yellow'], ['Zombie', 'The Cranberries', 'Zombie'],
  // --- expansion ---
  ['Billie Jean', 'Michael Jackson', 'Billie Jean'], ['Beat It', 'Michael Jackson', 'Beat It'],
  ['Smooth Criminal', 'Michael Jackson', 'Smooth Criminal'], ['Like a Prayer', 'Madonna', 'Like a Prayer'],
  ['Material Girl', 'Madonna', 'Material Girl'], ['Vogue', 'Madonna', 'Vogue'],
  ['Purple Rain', 'Prince', 'Purple Rain'], ['Sweet Dreams', 'Eurythmics', 'Sweet Dreams'],
  ['Take On Me', 'a-ha', 'Take On Me'], ['Livin on a Prayer', 'Bon Jovi', "Livin' on a Prayer"],
  ['Every Breath You Take', 'The Police', 'Every Breath You Take'], ['Dont Stop Believin', 'Journey', "Don't Stop Believin'"],
  ['Hotel California', 'Eagles', 'Hotel California'], ['Sweet Home Alabama', 'Lynyrd Skynyrd', 'Sweet Home Alabama'],
  ['Born to Run', 'Bruce Springsteen', 'Born to Run'], ['Dancing in the Dark', 'Bruce Springsteen', 'Dancing in the Dark'],
  ['Like a Rolling Stone', 'Bob Dylan', 'Like a Rolling Stone'], ['Imagine', 'John Lennon', 'Imagine'],
  ['Come Together', 'The Beatles', 'Come Together'], ['Here Comes the Sun', 'The Beatles', 'Here Comes the Sun'],
  ['Satisfaction', 'The Rolling Stones', 'Satisfaction'], ['Paint It Black', 'The Rolling Stones', 'Paint It Black'],
  ['Hey Ya', 'OutKast', 'Hey Ya'], ['Lose Control', 'Missy Elliott', 'Lose Control'],
  ['Crazy in Love', 'Beyonce', 'Crazy in Love'], ['Halo', 'Beyonce', 'Halo'],
  ['Single Ladies', 'Beyonce', 'Single Ladies'], ['Toxic', 'Britney Spears', 'Toxic'],
  ['Baby One More Time', 'Britney Spears', 'Baby One More Time'],
  ['Genie in a Bottle', 'Christina Aguilera', 'Genie in a Bottle'], ['No Scrubs', 'TLC', 'No Scrubs'],
  ['Waterfalls', 'TLC', 'Waterfalls'], ['Wannabe', 'Spice Girls', 'Wannabe'],
  ['I Want It That Way', 'Backstreet Boys', 'I Want It That Way'], ['Bye Bye Bye', 'NSYNC', 'Bye Bye Bye'],
  ['Livin la Vida Loca', 'Ricky Martin', 'Livin la Vida Loca'], ['Smooth', 'Santana', 'Smooth'],
  ['Mr Brightside', 'The Killers', 'Mr. Brightside', ['mr brightside']], ['Somebody Told Me', 'The Killers', 'Somebody Told Me'],
  ['Seven Nation Army', 'The White Stripes', 'Seven Nation Army'], ['Take Me Out', 'Franz Ferdinand', 'Take Me Out'],
  ['Feel Good Inc', 'Gorillaz', 'Feel Good Inc.', ['feel good inc']], ['Clint Eastwood', 'Gorillaz', 'Clint Eastwood'],
  ['Boulevard of Broken Dreams', 'Green Day', 'Boulevard of Broken Dreams'], ['American Idiot', 'Green Day', 'American Idiot'],
  ['Basket Case', 'Green Day', 'Basket Case'], ['The Middle', 'Jimmy Eat World', 'The Middle'],
  ['Mr Jones', 'Counting Crows', 'Mr. Jones', ['mr jones']], ['Iris', 'Goo Goo Dolls', 'Iris'],
  ['Hey There Delilah', "Plain White T's", 'Hey There Delilah'], ['Bad Day', 'Daniel Powter', 'Bad Day'],
  ['Hips Dont Lie', 'Shakira', "Hips Don't Lie"], ['Waka Waka', 'Shakira', 'Waka Waka'],
  ['Despacito', 'Luis Fonsi', 'Despacito'], ['Gangnam Style', 'PSY', 'Gangnam Style'],
  ['Call Me Maybe', 'Carly Rae Jepsen', 'Call Me Maybe'], ['Royals', 'Lorde', 'Royals'],
  ['Pumped Up Kicks', 'Foster the People', 'Pumped Up Kicks'], ['Some Nights', 'fun.', 'Some Nights'],
  ['We Are Young', 'fun.', 'We Are Young'], ['Ho Hey', 'The Lumineers', 'Ho Hey'],
  ['Riptide', 'Vance Joy', 'Riptide'], ['Take Me to Church', 'Hozier', 'Take Me to Church'],
  ['Stay With Me', 'Sam Smith', 'Stay With Me'], ['Thinking Out Loud', 'Ed Sheeran', 'Thinking Out Loud'],
  ['Castle on the Hill', 'Ed Sheeran', 'Castle on the Hill'], ['Photograph', 'Ed Sheeran', 'Photograph'],
  ['Someone Like You', 'Adele', 'Someone Like You'], ['Set Fire to the Rain', 'Adele', 'Set Fire to the Rain'],
  ['Skyfall', 'Adele', 'Skyfall'], ['Easy on Me', 'Adele', 'Easy on Me'],
  ['Shake It Off', 'Taylor Swift', 'Shake It Off'], ['Blank Space', 'Taylor Swift', 'Blank Space'],
  ['Love Story', 'Taylor Swift', 'Love Story'], ['Anti-Hero', 'Taylor Swift', 'Anti-Hero'],
  ['Bad Blood', 'Taylor Swift', 'Bad Blood'], ['Cardigan', 'Taylor Swift', 'Cardigan'],
  ['Blinding Lights', 'The Weeknd', 'Blinding Lights'], ['Starboy', 'The Weeknd', 'Starboy'],
  ['Cant Feel My Face', 'The Weeknd', "Can't Feel My Face"], ['Save Your Tears', 'The Weeknd', 'Save Your Tears'],
  ['Sunflower', 'Post Malone', 'Sunflower'], ['Circles', 'Post Malone', 'Circles'],
  ['Rockstar', 'Post Malone', 'Rockstar'], ['Old Town Road', 'Lil Nas X', 'Old Town Road'],
  ['Industry Baby', 'Lil Nas X', 'Industry Baby'], ['Sicko Mode', 'Travis Scott', 'Sicko Mode'],
  ['Gods Plan', 'Drake', "God's Plan"], ['Hotline Bling', 'Drake', 'Hotline Bling'],
  ['In My Feelings', 'Drake', 'In My Feelings'], ['Humble', 'Kendrick Lamar', 'HUMBLE.', ['humble']],
  ['Stronger', 'Kanye West', 'Stronger'], ['Gold Digger', 'Kanye West', 'Gold Digger'],
  ['Empire State of Mind', 'Jay-Z', 'Empire State of Mind'], ['In da Club', '50 Cent', 'In da Club'],
  ['Hey Ya', 'OutKast', 'Hey Ya'], ['Drop It Like Its Hot', 'Snoop Dogg', "Drop It Like It's Hot"],
  ['California Love', '2Pac', 'California Love'], ['Juicy', 'The Notorious B.I.G.', 'Juicy'],
  ['Lose Yourself', 'Eminem', 'Lose Yourself'], ['Without Me', 'Eminem', 'Without Me'],
  ['The Real Slim Shady', 'Eminem', 'The Real Slim Shady'], ['Stan', 'Eminem', 'Stan'],
  ['Uptown Girl', 'Billy Joel', 'Uptown Girl'], ['Piano Man', 'Billy Joel', 'Piano Man'],
  ['Rocket Man', 'Elton John', 'Rocket Man'], ['Tiny Dancer', 'Elton John', 'Tiny Dancer'],
  ['Your Song', 'Elton John', 'Your Song'], ['I Will Survive', 'Gloria Gaynor', 'I Will Survive'],
  ['September', 'Earth Wind and Fire', 'September'], ['Superstition', 'Stevie Wonder', 'Superstition'],
  ['I Wanna Dance with Somebody', 'Whitney Houston', 'I Wanna Dance with Somebody'],
  ['I Will Always Love You', 'Whitney Houston', 'I Will Always Love You'], ['Respect', 'Aretha Franklin', 'Respect'],
  ['What a Wonderful World', 'Louis Armstrong', 'What a Wonderful World'], ['My Way', 'Frank Sinatra', 'My Way'],
  ['Fly Me to the Moon', 'Frank Sinatra', 'Fly Me to the Moon'], ['Cant Help Falling in Love', 'Elvis Presley', "Can't Help Falling in Love"],
  ['Jailhouse Rock', 'Elvis Presley', 'Jailhouse Rock'], ['Johnny B Goode', 'Chuck Berry', 'Johnny B. Goode', ['johnny b goode']],
  ['Good Vibrations', 'The Beach Boys', 'Good Vibrations'], ['Wouldnt It Be Nice', 'The Beach Boys', "Wouldn't It Be Nice"],
  ['Dancing in the Street', 'Martha and the Vandellas', 'Dancing in the Street'], ['My Girl', 'The Temptations', 'My Girl'],
  ['I Heard It Through the Grapevine', 'Marvin Gaye', 'I Heard It Through the Grapevine'],
  ['Aint No Mountain High Enough', 'Marvin Gaye', "Ain't No Mountain High Enough"], ['Stand by Me', 'Ben E. King', 'Stand by Me'],
  ['Wake Me Up', 'Avicii', 'Wake Me Up'], ['Levels', 'Avicii', 'Levels'],
  ['Animals', 'Martin Garrix', 'Animals'], ['Wake Me Up Before You Go-Go', 'Wham!', 'Wake Me Up Before You Go-Go'],
  ['Careless Whisper', 'George Michael', 'Careless Whisper'], ['Sweet Caroline', 'Neil Diamond', 'Sweet Caroline'],
  ['Dont Stop Me Now', 'Queen', "Don't Stop Me Now"], ['Another One Bites the Dust', 'Queen', 'Another One Bites the Dust'],
  ['Somebody to Love', 'Queen', 'Somebody to Love'], ['Under Pressure', 'Queen', 'Under Pressure'],
  ['Wish You Were Here', 'Pink Floyd', 'Wish You Were Here'], ['Another Brick in the Wall', 'Pink Floyd', 'Another Brick in the Wall'],
  ['Comfortably Numb', 'Pink Floyd', 'Comfortably Numb'], ['Back in Black', 'AC/DC', 'Back in Black'],
  ['Highway to Hell', 'AC/DC', 'Highway to Hell'], ['Thunderstruck', 'AC/DC', 'Thunderstruck'],
  ['Enter Sandman', 'Metallica', 'Enter Sandman'], ['Nothing Else Matters', 'Metallica', 'Nothing Else Matters'],
  ['Crazy Train', 'Ozzy Osbourne', 'Crazy Train'], ['Living on a Prayer', 'Bon Jovi', "Livin' on a Prayer"],
  ['Pour Some Sugar on Me', 'Def Leppard', 'Pour Some Sugar on Me'], ['Carry On Wayward Son', 'Kansas', 'Carry On Wayward Son'],
  ['Dream On', 'Aerosmith', 'Dream On'], ['I Dont Want to Miss a Thing', 'Aerosmith', "I Don't Want to Miss a Thing"],
  ['November Rain', "Guns N' Roses", 'November Rain'], ['Welcome to the Jungle', "Guns N' Roses", 'Welcome to the Jungle'],
  ['Smoke on the Water', 'Deep Purple', 'Smoke on the Water'], ['More Than a Feeling', 'Boston', 'More Than a Feeling'],
  ['Black', 'Pearl Jam', 'Black'], ['Alive', 'Pearl Jam', 'Alive'],
  ['Come as You Are', 'Nirvana', 'Come as You Are'], ['Heart-Shaped Box', 'Nirvana', 'Heart-Shaped Box'],
  ['Loser', 'Beck', 'Loser'], ['1979', 'The Smashing Pumpkins', '1979'],
  ['Wonderwall', 'Oasis', 'Wonderwall'], ['Dont Look Back in Anger', 'Oasis', "Don't Look Back in Anger"],
  ['Champagne Supernova', 'Oasis', 'Champagne Supernova'], ['Bitter Sweet Symphony', 'The Verve', 'Bitter Sweet Symphony'],
  ['Karma Police', 'Radiohead', 'Karma Police'], ['No Surprises', 'Radiohead', 'No Surprises'],
  ['Yellow Submarine', 'The Beatles', 'Yellow Submarine'], ['Twist and Shout', 'The Beatles', 'Twist and Shout'],
  ['A Thousand Miles', 'Vanessa Carlton', 'A Thousand Miles'], ['Complicated', 'Avril Lavigne', 'Complicated'],
  ['Sk8er Boi', 'Avril Lavigne', 'Sk8er Boi'], ['Since U Been Gone', 'Kelly Clarkson', 'Since U Been Gone'],
  ['Hollaback Girl', 'Gwen Stefani', 'Hollaback Girl'], ['Rich Girl', 'Gwen Stefani', 'Rich Girl'],
  ['Drops of Jupiter', 'Train', 'Drops of Jupiter'], ['Hey Soul Sister', 'Train', 'Hey Soul Sister'],
  ['How to Save a Life', 'The Fray', 'How to Save a Life'], ['Chasing Cars', 'Snow Patrol', 'Chasing Cars'],
  ['Use Somebody', 'Kings of Leon', 'Use Somebody'], ['Sex on Fire', 'Kings of Leon', 'Sex on Fire'],
  ['Viva la Vida', 'Coldplay', 'Viva la Vida'], ['Clocks', 'Coldplay', 'Clocks'],
  ['The Scientist', 'Coldplay', 'The Scientist'], ['Fix You', 'Coldplay', 'Fix You'],
  ['Paradise', 'Coldplay', 'Paradise'], ['Something Just Like This', 'The Chainsmokers', 'Something Just Like This'],
  ['Closer', 'The Chainsmokers', 'Closer'], ['Wake Me Up', 'Avicii', 'Wake Me Up'],
  ['Lean On', 'Major Lazer', 'Lean On'], ['Sorry', 'Justin Bieber', 'Sorry'],
  ['Love Yourself', 'Justin Bieber', 'Love Yourself'], ['Baby', 'Justin Bieber', 'Baby'],
  ['Senorita', 'Shawn Mendes', 'Senorita'], ['Stitches', 'Shawn Mendes', 'Stitches'],
  ['Cheap Thrills', 'Sia', 'Cheap Thrills'], ['Chandelier', 'Sia', 'Chandelier'],
  ['Titanium', 'David Guetta', 'Titanium'], ['Roses', 'SAINt JHN', 'Roses'],
  ['Watermelon Sugar', 'Harry Styles', 'Watermelon Sugar'], ['As It Was', 'Harry Styles', 'As It Was'],
  ['Drivers License', 'Olivia Rodrigo', "Drivers License"], ['Good 4 U', 'Olivia Rodrigo', 'Good 4 U'],
  ['Stay', 'The Kid LAROI', 'Stay'], ['Heat Waves', 'Glass Animals', 'Heat Waves'],
  ['Dance Monkey', 'Tones and I', 'Dance Monkey'], ['Shallow', 'Lady Gaga', 'Shallow'],
  ['Bad Romance', 'Lady Gaga', 'Bad Romance'], ['Poker Face', 'Lady Gaga', 'Poker Face'],
  ['Just Dance', 'Lady Gaga', 'Just Dance'], ['Rolling in the Deep', 'Adele', 'Rolling in the Deep'],
  ['Uptown Funk', 'Mark Ronson', 'Uptown Funk'], ['24K Magic', 'Bruno Mars', '24K Magic'],
  ['The Lazy Song', 'Bruno Mars', 'The Lazy Song'], ['Grenade', 'Bruno Mars', 'Grenade'],
  ['Locked Out of Heaven', 'Bruno Mars', 'Locked Out of Heaven'], ['Treasure', 'Bruno Mars', 'Treasure'],
  ['Get Lucky', 'Daft Punk', 'Get Lucky'], ['One More Time', 'Daft Punk', 'One More Time'],
  ['Harder Better Faster Stronger', 'Daft Punk', 'Harder, Better, Faster, Stronger', ['harder better faster stronger']],
  ['Wonderful Tonight', 'Eric Clapton', 'Wonderful Tonight'], ['Tears in Heaven', 'Eric Clapton', 'Tears in Heaven'],
  ['Layla', 'Derek and the Dominos', 'Layla'], ['Free Bird', 'Lynyrd Skynyrd', 'Free Bird'],
  ['American Pie', 'Don McLean', 'American Pie'], ['Bridge Over Troubled Water', 'Simon and Garfunkel', 'Bridge Over Troubled Water'],
  ['The Sound of Silence', 'Simon and Garfunkel', 'The Sound of Silence'], ['Mrs Robinson', 'Simon and Garfunkel', 'Mrs. Robinson', ['mrs robinson']],
  ['Take It Easy', 'Eagles', 'Take It Easy'], ['Dont Stop', 'Fleetwood Mac', "Don't Stop"],
  ['Go Your Own Way', 'Fleetwood Mac', 'Go Your Own Way'], ['Dreams', 'Fleetwood Mac', 'Dreams'],
  ['Landslide', 'Fleetwood Mac', 'Landslide'], ['Africa', 'Toto', 'Africa'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Source previews from the iTunes Search API. Apple's preview CDN
// (audio-ssl.itunes.apple.com) is DIRECTLY hotlinkable and plays in an <audio>
// tag on real browsers (Safari/Chrome decode the AAC/m4a). (Deezer's preview CDN
// is hotlink-protected and won't play cross-site, so we don't use it.)
async function lookupOnce(title, artist) {
  const term = encodeURIComponent(`${title} ${artist}`);
  const url = `https://itunes.apple.com/search?term=${term}&entity=song&limit=5&country=US`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000); // never hang on a stalled connection
  let res;
  try {
    res = await fetch(url, { signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!text.trim().startsWith('{')) throw new Error('non-JSON (rate-limited?)');
  const data = JSON.parse(text);
  const results = data.results || [];
  const a = artist.toLowerCase().replace(/[^a-z]/g, '');
  const pick =
    results.find((r) => r.previewUrl && (r.artistName || '').toLowerCase().replace(/[^a-z]/g, '').includes(a.slice(0, 6))) ||
    results.find((r) => r.previewUrl);
  return pick?.previewUrl || null;
}

// Retry a couple of times with backoff to ride out iTunes rate-limiting.
async function lookup(title, artist) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const p = await lookupOnce(title, artist);
      if (p) return p;
    } catch {
      /* retry */
    }
    await sleep(800 + attempt * 700);
  }
  return null;
}

const byLetter = {};
let ok = 0;
for (const [title, artist, answer, alts] of SONGS) {
  let preview = null;
  try {
    preview = await lookup(title, artist);
  } catch (e) {
    console.log('ERR', title, e.message);
  }
  await sleep(600); // be polite to the API (avoid iTunes throttling)
  if (!preview) {
    console.log('skip (no preview):', title);
    continue;
  }
  const L = answer.trim()[0].toUpperCase();
  if (L < 'A' || L > 'Z') {
    console.log('skip (non-letter answer):', answer); // rebucketByAnswer drops these anyway
    continue;
  }
  (byLetter[L] ??= []).push({ a: answer, audio: preview, artist, alts: alts || [artist] });
  ok++;
  console.log('ok:', title, '→', preview.slice(0, 50));
}

const lines = [];
lines.push(`import type { RawPack } from '../core/packs';`);
lines.push('');
lines.push('/**');
lines.push(' * "Guess the Song" — real audio clips via the free Deezer API (official 30s');
lines.push(' * preview MP3s on Deezer\'s hotlinkable preview CDN, nothing stored). Board');
lines.push(' * letters hidden so the clip is the only clue. Generated by scripts/gensongs.mjs.');
lines.push(' */');
lines.push('export const songsPack: RawPack = {');
lines.push(`  id: 'songs',`);
lines.push(`  name: 'Guess the Song',`);
lines.push(`  description: 'Hear a clip of a famous song and name it. Real audio!',`);
lines.push(`  locale: 'en',`);
lines.push(`  difficulty: 'medium',`);
lines.push(`  contentRating: 'everyone',`);
lines.push(`  emoji: '🎧',`);
lines.push(`  accent: '#db2777',`);
lines.push(`  hideBoardLetters: true,`);
lines.push('  letters: {');
for (const L of Object.keys(byLetter).sort()) {
  lines.push(`    '${L}': [`);
  for (const q of byLetter[L]) {
    const alt = JSON.stringify(q.alts.map((x) => x.toLowerCase()));
    lines.push(
      `      { q: 'Name this famous song.', a: ${JSON.stringify(q.a)}, audio: ${JSON.stringify(q.audio)}, category: 'music', alt: ${alt} },`,
    );
  }
  lines.push('    ],');
}
lines.push('  },');
lines.push('};');
writeFileSync('src/content/songs.ts', lines.join('\n') + '\n');
console.log(`\nWROTE src/content/songs.ts — ${ok} songs across ${Object.keys(byLetter).length} letters`);
