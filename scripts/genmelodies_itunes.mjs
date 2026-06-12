// Expand "Guess the Melody" past 200 with REAL iTunes previews of famous INSTRUMENTAL
// themes (film/TV/game scores + classical). The synthesized PD WAVs (~23) stay; this
// adds hotlinkable iTunes preview clips. answer = clean recognizable name; we search
// iTunes and keep a preview whose track/collection name confirms the piece (loose
// token check) so we don't ship a wrong recording. Run: node scripts/genmelodies_itunes.mjs
import { writeFile } from 'node:fs/promises';

// [answer, searchTerm] — searchTerm includes composer/artist for a reliable hit.
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
  ['Mission Impossible TV', 'Mission Impossible original TV theme'],
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
  // ---- Classical ----
  ["Beethoven's 5th Symphony", 'Beethoven Symphony No. 5 Allegro con brio'],
  ['Ode to Joy', 'Beethoven Ode to Joy Symphony No 9'],
  ['Für Elise', 'Beethoven Fur Elise'],
  ['Moonlight Sonata', 'Beethoven Moonlight Sonata'],
  ['Eine kleine Nachtmusik', 'Mozart Eine kleine Nachtmusik'],
  ['Turkish March', 'Mozart Rondo alla Turca'],
  ['The Marriage of Figaro', 'Mozart Marriage of Figaro overture'],
  ['The Four Seasons', 'Vivaldi Four Seasons Spring'],
  ['Canon in D', 'Pachelbel Canon in D'],
  ['Toccata and Fugue in D minor', 'Bach Toccata and Fugue in D minor'],
  ['Air on the G String', 'Bach Air on the G String'],
  ["Brandenburg Concerto", 'Bach Brandenburg Concerto No 3'],
  ['Ave Maria', 'Schubert Ave Maria'],
  ['The Blue Danube', 'Strauss Blue Danube waltz'],
  ['Bolero', 'Ravel Bolero'],
  ['Clair de Lune', 'Debussy Clair de Lune'],
  ['Gymnopedie', 'Satie Gymnopedie No 1'],
  ['Nocturne', 'Chopin Nocturne Op 9 No 2'],
  ['Prelude in E minor', 'Chopin Prelude Op 28 No 4'],
  ['Hungarian Rhapsody', 'Liszt Hungarian Rhapsody No 2'],
  ['Swan Lake', 'Tchaikovsky Swan Lake'],
  ['The Nutcracker', 'Tchaikovsky Dance of the Sugar Plum Fairy'],
  ['1812 Overture', 'Tchaikovsky 1812 Overture'],
  ['Flight of the Bumblebee', 'Rimsky-Korsakov Flight of the Bumblebee'],
  ['In the Hall of the Mountain King', 'Grieg In the Hall of the Mountain King'],
  ['Carmen', 'Bizet Carmen Habanera'],
  ['William Tell Overture', 'Rossini William Tell Overture finale'],
  ['Ride of the Valkyries', 'Wagner Ride of the Valkyries'],
  ['Pomp and Circumstance', 'Elgar Pomp and Circumstance'],
  ['The Planets: Mars', 'Holst The Planets Mars'],
  ['Rhapsody in Blue', 'Gershwin Rhapsody in Blue'],
  ['Boléro', 'Ravel Bolero orchestra'],
  ['Peer Gynt: Morning Mood', 'Grieg Morning Mood Peer Gynt'],
  ['Pictures at an Exhibition', 'Mussorgsky Pictures at an Exhibition Promenade'],
  ['Carmina Burana', 'Carl Orff O Fortuna Carmina Burana'],
  ['Adagio for Strings', 'Barber Adagio for Strings'],
  ['New World Symphony', 'Dvorak New World Symphony Largo'],
  ['Peter and the Wolf', 'Prokofiev Peter and the Wolf'],
  ['Clarinet Concerto', 'Mozart Clarinet Concerto Adagio'],
  ['Pachelbel', 'Pachelbel Canon orchestra'],
  ['Habanera', 'Bizet Habanera Carmen'],
  ['Greensleeves', 'Greensleeves classical'],
  ['Pavane', 'Faure Pavane'],
  ['Liebestraum', 'Liszt Liebestraum No 3'],
  ['Hallelujah Chorus', 'Handel Hallelujah Chorus Messiah'],
  ['Eine Alpensinfonie', 'Strauss Also sprach Zarathustra opening'],
  ['Spring Sonata', 'Beethoven Spring Sonata'],
  ['Clair', 'Debussy Reverie'],
  ['Nessun Dorma', 'Puccini Nessun Dorma'],
  ['Vltava', 'Smetana Vltava Moldau'],
  ['Bolero Ravel', 'Maurice Ravel Bolero'],
  // ---- Other famous instrumentals ----
  ['Take Five', 'Dave Brubeck Take Five'],
  ['Rondo Alla Turca', 'Mozart Turkish March piano'],
  ['Comptine', "Yann Tiersen Comptine d'un autre ete"],
  ['River Flows in You', 'Yiruma River Flows in You'],
  ['Nuvole Bianche', 'Ludovico Einaudi Nuvole Bianche'],
  ['Experience', 'Ludovico Einaudi Experience'],
  ['The Entertainer', 'Scott Joplin The Entertainer'],
  ['Maple Leaf Rag', 'Scott Joplin Maple Leaf Rag'],
  ['Sabre Dance', 'Khachaturian Sabre Dance'],
  ['Flight Facilities', 'Vangelis Conquest of Paradise'],
  ['Oxygene', 'Jean-Michel Jarre Oxygene'],
  ['Tubular Bells', 'Mike Oldfield Tubular Bells'],
  ['Axel F', 'Harold Faltermeyer Axel F Beverly Hills Cop'],
  ['Chariots', 'Vangelis Chariots of Fire titles'],
  ['Albatross', 'Fleetwood Mac Albatross'],
  ['Apache', 'The Shadows Apache'],
  ['Sleepwalk', 'Santo and Johnny Sleepwalk'],
  ['Europa', 'Santana Europa'],
  ['Cavatina', 'Cavatina Deer Hunter Stanley Myers'],
  ['Classical Gas', 'Mason Williams Classical Gas'],
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
  // ---- Batch 2: more classical ----
  ['Jesu, Joy of Man\'s Desiring', 'Bach Jesu Joy of Man Desiring'],
  ['Cello Suite No. 1', 'Bach Cello Suite No 1 Prelude'],
  ['Wedding March', 'Mendelssohn Wedding March'],
  ['Bridal Chorus', 'Wagner Bridal Chorus Here Comes the Bride'],
  ['Funeral March', 'Chopin Funeral March Sonata No 2'],
  ['Minute Waltz', 'Chopin Minute Waltz'],
  ['Revolutionary Etude', 'Chopin Revolutionary Etude'],
  ['La Campanella', 'Liszt La Campanella'],
  ['Danse Macabre', 'Saint-Saens Danse Macabre'],
  ['The Swan', 'Saint-Saens The Swan Carnival of the Animals'],
  ['Meditation from Thais', 'Massenet Meditation Thais'],
  ['Csardas', 'Monti Csardas'],
  ['Zorba the Greek', 'Theodorakis Zorba the Greek'],
  ['Por una Cabeza', 'Gardel Por una Cabeza tango'],
  ['Libertango', 'Piazzolla Libertango'],
  ['Hungarian Dance No. 5', 'Brahms Hungarian Dance No 5'],
  ['Adagio in G minor', 'Albinoni Adagio in G minor'],
  ['Jupiter', 'Holst The Planets Jupiter'],
  ['Finlandia', 'Sibelius Finlandia'],
  ['Pathetique Sonata', 'Beethoven Pathetique Sonata 2nd movement'],
  ['Emperor Concerto', 'Beethoven Emperor Concerto'],
  ['Piano Concerto No. 1', 'Tchaikovsky Piano Concerto No 1'],
  ['Clair de Lune Debussy', 'Debussy Arabesque No 1'],
  ['Gnossienne', 'Satie Gnossienne No 1'],
  ['O Fortuna', 'Carl Orff O Fortuna'],
  ['Symphony No. 40', 'Mozart Symphony No 40 G minor'],
  ['Spring', 'Vivaldi Four Seasons Winter'],
  ['Toreador Song', 'Bizet Toreador Song Carmen'],
  ['Peer Gynt', 'Grieg Anitra\'s Dance'],
  ['Lacrimosa', 'Mozart Requiem Lacrimosa'],
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
  ['Clocks', 'Coldplay Clocks instrumental'],
  ['Cantina Band', 'Star Wars Cantina Band'],
  ['The Imperial March', 'Star Wars Imperial March'],
  ['Duel of the Fates', 'Star Wars Duel of the Fates'],
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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
for (const [answer, term] of PIECES) {
  if (seenAns.has(norm(answer))) continue;
  let j = null;
  for (let a = 0; a < 4 && !j; a++) {
    if (a) await sleep(700 * a);
    j = await search(term);
  }
  const want = [...new Set([...tokensOf(answer), ...tokensOf(term)])];
  const hit = (j?.results || []).find((x) => {
    if (!x.previewUrl || x.kind !== 'song') return false;
    const hay = norm(`${x.trackName} ${x.collectionName} ${x.artistName}`);
    return want.some((w) => hay.includes(w));
  }) || (j?.results || []).find((x) => x.previewUrl);
  if (hit && !seenUrl.has(hit.previewUrl)) {
    seenUrl.add(hit.previewUrl);
    seenAns.add(norm(answer));
    kept.push({ answer, url: hit.previewUrl });
    console.log(`✅ ${answer}`);
  } else {
    console.log(`❌ ${answer}`);
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
console.log(`\nKept ${kept.length}/${PIECES.length}. Wrote src/content/melodiesExtra.ts`);
