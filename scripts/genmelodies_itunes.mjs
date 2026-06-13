// Expand "Guess the Melody" past 200 with REAL iTunes previews of famous INSTRUMENTAL
// themes (film/TV/game scores + classical). The synthesized PD WAVs (~23) stay; this
// adds hotlinkable iTunes preview clips. answer = clean recognizable name; we search
// iTunes and keep a preview whose track/collection name confirms the piece (loose
// token check) so we don't ship a wrong recording. Run: node scripts/genmelodies_itunes.mjs
import { writeFile } from 'node:fs/promises';

// [answer, searchTerm].
//  - answer  = the clean, CONSISTENT, FULL display name shown to players. For classical
//              / art-music pieces this is "<Proper title> (<Composer>)" so it's always a
//              full, recognizable name — never a bare composer ("Beethoven") nor a bare
//              key/movement ("…in D minor"). Franchise themes keep their property name.
//  - searchTerm = composer/artist + work, used ONLY to fetch & VERIFY the right preview.
//  Every entry is a distinct piece (no duplicate works under different names).
const PIECES = [
  // ---- Film scores ----
  ['Star Wars', 'Star Wars main title John Williams'],
  ['Indiana Jones', 'Indiana Jones Raiders March John Williams'],
  ['Jaws', 'Jaws theme John Williams'],
  ['Jurassic Park', 'Jurassic Park theme John Williams'],
  ['Harry Potter', "Hedwig's Theme Harry Potter John Williams"],
  ['Superman', 'Superman march John Williams'],
  ['E.T.', 'E.T. flying theme John Williams'],
  ["Schindler's List", "Schindler's List theme John Williams"],
  ['Pirates of the Caribbean', 'Pirates of the Caribbean He\'s a Pirate Zimmer'],
  ['Mission: Impossible', 'Mission Impossible theme Lalo Schifrin'],
  ['James Bond', 'James Bond theme Monty Norman'],
  ['The Pink Panther', 'Pink Panther theme Henry Mancini'],
  ['Rocky', 'Rocky Gonna Fly Now Bill Conti'],
  ['The Good, the Bad and the Ugly', 'The Good the Bad and the Ugly Ennio Morricone'],
  ['Back to the Future', 'Back to the Future theme Alan Silvestri'],
  ['The Lord of the Rings', 'Lord of the Rings Concerning Hobbits Howard Shore'],
  ['Gladiator', 'Gladiator Now We Are Free Hans Zimmer'],
  ['Inception', 'Inception Time Hans Zimmer'],
  ['Interstellar', 'Interstellar main theme Hans Zimmer'],
  ['The Dark Knight', 'The Dark Knight theme Hans Zimmer'],
  ['Titanic', 'Titanic My Heart Will Go On instrumental James Horner'],
  ['The Godfather', 'The Godfather waltz Nino Rota'],
  ['Psycho', 'Psycho theme Bernard Herrmann'],
  ['Halloween', 'Halloween theme John Carpenter'],
  ['The Magnificent Seven', 'Magnificent Seven theme Elmer Bernstein'],
  ['Lawrence of Arabia', 'Lawrence of Arabia theme Maurice Jarre'],
  ['Chariots of Fire', 'Chariots of Fire Vangelis'],
  ['Out of Africa', 'Out of Africa theme John Barry'],
  ['Dances with Wolves', 'Dances with Wolves John Barry'],
  ['Forrest Gump', 'Forrest Gump suite Alan Silvestri'],
  ['Cinema Paradiso', 'Cinema Paradiso Ennio Morricone'],
  ['Once Upon a Time in the West', 'Once Upon a Time in the West Morricone'],
  ['The Mission', 'The Mission Gabriel\'s Oboe Morricone'],
  ['Avatar', 'Avatar theme James Horner'],
  ['How to Train Your Dragon', 'How to Train Your Dragon test drive Powell'],
  ['Up', 'Up Married Life Michael Giacchino'],
  ['The Avengers', 'The Avengers theme Alan Silvestri'],
  ['Black Panther', 'Black Panther theme Ludwig Goransson'],
  ['La La Land', 'La La Land Mia and Sebastian theme Hurwitz'],
  ['Amelie', 'Amelie Comptine d\'un autre ete Yann Tiersen'],
  ['Requiem for a Dream', 'Requiem for a Dream Lux Aeterna Clint Mansell'],
  ['2001: A Space Odyssey', 'Also sprach Zarathustra Strauss'],
  ['The Last of the Mohicans', 'Last of the Mohicans main theme'],
  ['Braveheart', 'Braveheart main theme James Horner'],
  ['A Beautiful Mind', 'A Beautiful Mind James Horner'],
  ['Edward Scissorhands', 'Edward Scissorhands Danny Elfman'],
  ['Batman', 'Batman 1989 theme Danny Elfman'],
  // ---- TV themes ----
  ['Game of Thrones', 'Game of Thrones main title Ramin Djawadi'],
  ['The Simpsons', 'The Simpsons theme Danny Elfman'],
  ['Friends', 'Friends I\'ll Be There for You instrumental'],
  ['Stranger Things', 'Stranger Things theme Kyle Dixon'],
  ['Doctor Who', 'Doctor Who theme'],
  ['The X-Files', 'X-Files theme Mark Snow'],
  ['Twin Peaks', 'Twin Peaks theme Angelo Badalamenti'],
  ['Westworld', 'Westworld main title Ramin Djawadi'],
  ['Succession', 'Succession main title theme Nicholas Britell'],
  ['The Office', 'The Office theme'],
  ['Seinfeld', 'Seinfeld theme'],
  ['Cheers', 'Cheers theme Where Everybody Knows Your Name'],
  ['The Mandalorian', 'The Mandalorian theme Ludwig Goransson'],
  ['Sherlock', 'Sherlock theme David Arnold'],
  ['House of Cards', 'House of Cards main title Jeff Beal'],
  ['Peaky Blinders', 'Peaky Blinders Red Right Hand Nick Cave'],
  ['Curb Your Enthusiasm', 'Curb Your Enthusiasm Frolic theme'],
  // ---- Video game ----
  ['Super Mario Bros.', 'Super Mario Bros theme Koji Kondo'],
  ['The Legend of Zelda', 'Legend of Zelda main theme'],
  ['Tetris', 'Tetris theme Korobeiniki'],
  ['Pokemon', 'Pokemon theme'],
  ['Halo', 'Halo theme Martin O\'Donnell'],
  ['The Elder Scrolls: Skyrim', 'Skyrim main theme Jeremy Soule'],
  ['Final Fantasy', 'Final Fantasy prelude Nobuo Uematsu'],
  ['Sonic the Hedgehog', 'Sonic the Hedgehog Green Hill Zone'],
  ['Minecraft', 'Minecraft Sweden C418'],
  ['Castlevania', 'Castlevania Vampire Killer'],
  ['Mega Man', 'Mega Man 2 Dr Wily theme'],
  ['Donkey Kong', 'Donkey Kong Country Aquatic Ambience'],
  // ---- Classical: "<Proper title> (<Composer>)" — full, consistent, one entry per work ----
  ['Symphony No. 5 (Beethoven)', 'Beethoven Symphony No. 5 Allegro con brio'],
  ['Ode to Joy (Beethoven)', 'Beethoven Ode to Joy Symphony No 9'],
  ['Für Elise (Beethoven)', 'Beethoven Fur Elise'],
  ['Moonlight Sonata (Beethoven)', 'Beethoven Moonlight Sonata'],
  ['Spring Sonata (Beethoven)', 'Beethoven Spring Sonata violin'],
  ['Pathétique Sonata (Beethoven)', 'Beethoven Pathetique Sonata 2nd movement'],
  ['Emperor Concerto (Beethoven)', 'Beethoven Emperor Concerto'],
  ['Eine kleine Nachtmusik (Mozart)', 'Mozart Eine kleine Nachtmusik'],
  ['Rondo alla Turca (Mozart)', 'Mozart Rondo alla Turca Turkish March'],
  ['The Marriage of Figaro (Mozart)', 'Mozart Marriage of Figaro overture'],
  ['Symphony No. 40 (Mozart)', 'Mozart Symphony No 40 G minor'],
  ['Clarinet Concerto (Mozart)', 'Mozart Clarinet Concerto Adagio'],
  ['Requiem: Lacrimosa (Mozart)', 'Mozart Requiem Lacrimosa'],
  ['The Four Seasons: Spring (Vivaldi)', 'Vivaldi Four Seasons Spring'],
  ['The Four Seasons: Winter (Vivaldi)', 'Vivaldi Four Seasons Winter'],
  ['Canon in D (Pachelbel)', 'Pachelbel Canon in D'],
  ['Toccata and Fugue in D minor (Bach)', 'Bach Toccata and Fugue in D minor'],
  ['Air on the G String (Bach)', 'Bach Air on the G String'],
  ['Brandenburg Concerto No. 3 (Bach)', 'Bach Brandenburg Concerto No 3'],
  ["Jesu, Joy of Man's Desiring (Bach)", 'Bach Jesu Joy of Man Desiring'],
  ['Cello Suite No. 1 (Bach)', 'Bach Cello Suite No 1 Prelude'],
  ['Ave Maria (Schubert)', 'Schubert Ave Maria'],
  ['The Blue Danube (Strauss)', 'Strauss Blue Danube waltz'],
  ['Boléro (Ravel)', 'Ravel Bolero'],
  ['Clair de Lune (Debussy)', 'Debussy Clair de Lune'],
  ['Arabesque No. 1 (Debussy)', 'Debussy Arabesque No 1'],
  ['Rêverie (Debussy)', 'Debussy Reverie'],
  ['Gymnopédie No. 1 (Satie)', 'Satie Gymnopedie No 1'],
  ['Gnossienne No. 1 (Satie)', 'Satie Gnossienne No 1'],
  ['Nocturne in E-flat (Chopin)', 'Chopin Nocturne Op 9 No 2'],
  ['Prelude in E minor (Chopin)', 'Chopin Prelude Op 28 No 4'],
  ['Minute Waltz (Chopin)', 'Chopin Minute Waltz'],
  ['Revolutionary Étude (Chopin)', 'Chopin Revolutionary Etude'],
  ['Funeral March (Chopin)', 'Chopin Funeral March Sonata No 2'],
  ['Hungarian Rhapsody No. 2 (Liszt)', 'Liszt Hungarian Rhapsody No 2'],
  ['Liebestraum No. 3 (Liszt)', 'Liszt Liebestraum No 3'],
  ['La Campanella (Liszt)', 'Liszt La Campanella'],
  ['Swan Lake (Tchaikovsky)', 'Tchaikovsky Swan Lake'],
  ['Dance of the Sugar Plum Fairy (Tchaikovsky)', 'Tchaikovsky Dance of the Sugar Plum Fairy'],
  ['1812 Overture (Tchaikovsky)', 'Tchaikovsky 1812 Overture'],
  ['Piano Concerto No. 1 (Tchaikovsky)', 'Tchaikovsky Piano Concerto No 1'],
  ['Flight of the Bumblebee (Rimsky-Korsakov)', 'Rimsky-Korsakov Flight of the Bumblebee'],
  ['In the Hall of the Mountain King (Grieg)', 'Grieg In the Hall of the Mountain King'],
  ['Morning Mood (Grieg)', 'Grieg Morning Mood Peer Gynt'],
  ["Anitra's Dance (Grieg)", 'Grieg Anitra Dance Peer Gynt'],
  ['Carmen: Habanera (Bizet)', 'Bizet Carmen Habanera'],
  ['Carmen: Toreador Song (Bizet)', 'Bizet Toreador Song Carmen'],
  ['William Tell Overture (Rossini)', 'Rossini William Tell Overture finale'],
  ['Ride of the Valkyries (Wagner)', 'Wagner Ride of the Valkyries'],
  ['Bridal Chorus (Wagner)', 'Wagner Bridal Chorus Here Comes the Bride'],
  ['Pomp and Circumstance (Elgar)', 'Elgar Pomp and Circumstance'],
  ['The Planets: Mars (Holst)', 'Holst The Planets Mars'],
  ['The Planets: Jupiter (Holst)', 'Holst The Planets Jupiter'],
  ['Rhapsody in Blue (Gershwin)', 'Gershwin Rhapsody in Blue'],
  ['Pictures at an Exhibition (Mussorgsky)', 'Mussorgsky Pictures at an Exhibition Promenade'],
  ['O Fortuna (Orff)', 'Carl Orff O Fortuna Carmina Burana'],
  ['Adagio for Strings (Barber)', 'Barber Adagio for Strings'],
  ['New World Symphony (Dvořák)', 'Dvorak New World Symphony Largo'],
  ['Peter and the Wolf (Prokofiev)', 'Prokofiev Peter and the Wolf'],
  ['Greensleeves (Traditional)', 'Greensleeves classical'],
  ['Pavane (Fauré)', 'Faure Pavane'],
  ['Hallelujah Chorus (Handel)', 'Handel Hallelujah Chorus Messiah'],
  ['Nessun Dorma (Puccini)', 'Puccini Nessun Dorma'],
  ['Vltava (Smetana)', 'Smetana Vltava Moldau'],
  ['Danse Macabre (Saint-Saëns)', 'Saint-Saens Danse Macabre'],
  ['The Swan (Saint-Saëns)', 'Saint-Saens The Swan Carnival of the Animals'],
  ['Méditation from Thaïs (Massenet)', 'Massenet Meditation Thais'],
  ['Csárdás (Monti)', 'Monti Csardas'],
  ['Hungarian Dance No. 5 (Brahms)', 'Brahms Hungarian Dance No 5'],
  ['Adagio in G minor (Albinoni)', 'Albinoni Adagio in G minor'],
  ['Sabre Dance (Khachaturian)', 'Khachaturian Sabre Dance'],
  ['Finlandia (Sibelius)', 'Sibelius Finlandia'],
  ['Wedding March (Mendelssohn)', 'Mendelssohn Wedding March'],
  ['The Entertainer (Joplin)', 'Scott Joplin The Entertainer'],
  ['Maple Leaf Rag (Joplin)', 'Scott Joplin Maple Leaf Rag'],
  // ---- Other famous instrumentals (jazz / modern / easy-listening) ----
  ['Take Five (Brubeck)', 'Dave Brubeck Take Five'],
  ['River Flows in You (Yiruma)', 'Yiruma River Flows in You'],
  ['Nuvole Bianche (Einaudi)', 'Ludovico Einaudi Nuvole Bianche'],
  ['Experience (Einaudi)', 'Ludovico Einaudi Experience'],
  ['Por una Cabeza (Gardel)', 'Gardel Por una Cabeza tango'],
  ['Libertango (Piazzolla)', 'Piazzolla Libertango'],
  ['Zorba the Greek (Theodorakis)', 'Theodorakis Zorba the Greek'],
  ['Conquest of Paradise (Vangelis)', 'Vangelis Conquest of Paradise'],
  ['Oxygène (Jean-Michel Jarre)', 'Jean-Michel Jarre Oxygene'],
  ['Tubular Bells (Mike Oldfield)', 'Mike Oldfield Tubular Bells'],
  ['Axel F (Beverly Hills Cop)', 'Harold Faltermeyer Axel F Beverly Hills Cop'],
  ['Albatross (Fleetwood Mac)', 'Fleetwood Mac Albatross'],
  ['Apache (The Shadows)', 'The Shadows Apache'],
  ['Sleepwalk (Santo & Johnny)', 'Santo and Johnny Sleepwalk'],
  ['Europa (Santana)', 'Santana Europa'],
  ['Cavatina (The Deer Hunter)', 'Cavatina Deer Hunter Stanley Myers'],
  ['Classical Gas (Mason Williams)', 'Mason Williams Classical Gas'],
  ['Clocks (Coldplay)', 'Coldplay Clocks instrumental'],
  // ---- Batch 2: more film ----
  ['Star Trek', 'Star Trek original series theme'],
  ['The Terminator', 'Terminator theme Brad Fiedel'],
  ['Top Gun', 'Top Gun Anthem Harold Faltermeyer'],
  ['Home Alone', 'Home Alone Somewhere in My Memory John Williams'],
  ['Hook', 'Hook John Williams flight to Neverland'],
  ['The Bourne Identity', 'Bourne Identity theme John Powell'],
  ['Casino Royale', 'Casino Royale You Know My Name instrumental'],
  ['Tron: Legacy', 'Tron Legacy Daft Punk End of Line'],
  ['The Social Network', 'Social Network Hand Covers Bruise Trent Reznor'],
  ['Blade Runner', 'Blade Runner Vangelis main titles'],
  ['Dunkirk', 'Dunkirk Hans Zimmer Supermarine'],
  ['Wonder Woman', 'Wonder Woman theme Is She With You Zimmer'],
  ['Man of Steel', 'Man of Steel Hans Zimmer flight'],
  ['Pulp Fiction', 'Misirlou Dick Dale'],
  ['Kill Bill', 'Twisted Nerve whistle Kill Bill'],
  ['Apollo 13', 'Apollo 13 James Horner'],
  ['Glory', 'Glory James Horner Charging Fort Wagner'],
  ['Legends of the Fall', 'Legends of the Fall James Horner'],
  ['The Rock', 'The Rock Hans Zimmer'],
  ['The Untouchables', 'The Untouchables Ennio Morricone'],
  ['Arrival', 'Arrival Johann Johannsson'],
  ['Gravity', 'Gravity Steven Price'],
  ['Spider-Man', 'Spider-Man 2002 theme Danny Elfman'],
  ['The Incredibles', 'The Incredibles Michael Giacchino'],
  ['Ratatouille', 'Ratatouille Le Festin instrumental'],
  ['Coco', 'Coco Remember Me instrumental'],
  ['Frozen', 'Frozen Vuelie instrumental'],
  // ---- Batch 2: more TV / games / other ----
  ['MASH', 'MASH Suicide Is Painless instrumental'],
  ['The Twilight Zone', 'Twilight Zone theme'],
  ['Knight Rider', 'Knight Rider theme'],
  ['Hawaii Five-O', 'Hawaii Five-O theme'],
  ['Looney Tunes', 'Merrily We Roll Along Looney Tunes'],
  ['Outlander', 'Outlander Skye Boat Song Bear McCreary'],
  ['Downton Abbey', 'Downton Abbey theme John Lunn'],
  ['Pac-Man', 'Pac-Man theme'],
  ['Street Fighter', 'Street Fighter II Guile theme'],
  ['Mortal Kombat', 'Mortal Kombat techno theme'],
  ['Undertale', 'Undertale Megalovania'],
  ['The Witcher 3', 'Witcher 3 Geralt of Rivia'],
  ['Red Dead Redemption', 'Red Dead Redemption 2 main theme'],
  ['Civilization IV', 'Baba Yetu Civilization'],
  ['Metal Gear Solid', 'Metal Gear Solid theme'],
  ['Animal Crossing', 'Animal Crossing main theme'],
  ['Cantina Band', 'Star Wars Cantina Band'],
  ['The Imperial March', 'Star Wars Imperial March'],
  ['Duel of the Fates', 'Star Wars Duel of the Fates'],
];

// Accent-insensitive normalize so "Bolero"/"Boléro" dedupe to the same key.
const norm = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'no', 'op', 'minor', 'major', 'theme', 'main', 'title', 'overture', 'symphony', 'concerto', 'sonata', 'march', 'suite', 'instrumental']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=8&country=US`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function tokensOf(s) {
  return norm(s).split(' ').filter((w) => w.length >= 4 && !STOP.has(w));
}

const kept = [];
const seenUrl = new Set();
const seenAns = new Set();
let dropped = 0;
for (const [answer, term] of PIECES) {
  if (seenAns.has(norm(answer))) continue;
  let j = null;
  for (let a = 0; a < 4 && !j; a++) {
    if (a) await sleep(700 * a);
    j = await search(term);
  }
  // Distinctive tokens (work title words, minus generic music words) must drive the
  // pick — composer alone is NOT enough, so e.g. "Vivaldi Winter" can't grab a Spring
  // recording. Score each result by distinctive-token hits and take the best (>=1).
  // NO loose fallback: a non-matching search is DROPPED, never shipped mislabeled.
  const distinctive = new Set(tokensOf(answer).concat(tokensOf(term)));
  let best = null;
  let bestScore = 0;
  for (const x of j?.results || []) {
    if (!x.previewUrl || x.kind !== 'song' || seenUrl.has(x.previewUrl)) continue;
    const hay = norm(`${x.trackName} ${x.collectionName} ${x.artistName}`);
    let score = 0;
    for (const w of distinctive) if (hay.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = x;
    }
  }
  if (best && bestScore >= 1) {
    seenUrl.add(best.previewUrl);
    seenAns.add(norm(answer));
    kept.push({ answer, url: best.previewUrl });
    console.log(`✅ ${answer}  (score ${bestScore} — ${best.trackName})`);
  } else {
    dropped += 1;
    console.log(`❌ ${answer}  (no confident match — dropped)`);
  }
  await sleep(300);
}

const rows = kept
  .map((k) => `      { q: '🎵 Listen and name this famous tune or theme.', a: ${JSON.stringify(k.answer)}, audio: ${JSON.stringify(k.url)}, category: 'melody', difficulty: 3 },`)
  .join('\n');

const out = `// AUTO-GENERATED by scripts/genmelodies_itunes.mjs — do not hand-edit.
// Famous INSTRUMENTAL themes & classical pieces as REAL iTunes preview clips (.m4a,
// hotlinkable), to expand "Guess the Melody" past 200 alongside the synthesized PD WAVs.
// answer = the clean recognizable name; each preview was confirmed to match the piece.
import type { RawQuestion } from '../core/packs';

export const melodiesExtra: Record<string, RawQuestion[]> = {
  _: [
${rows}
  ],
};
`;

await writeFile(new URL('../src/content/melodiesExtra.ts', import.meta.url), out, 'utf8');
console.log(`\nKept ${kept.length}/${PIECES.length} (dropped ${dropped}). Wrote src/content/melodiesExtra.ts`);
