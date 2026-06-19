// Convert sitcoms + music-decade packs into CLIP packs.
//   - Sitcoms (Easy/Medium/Hard) → real iTunes tvEpisode previews (.m4v video clips)
//   - Music decades (80s..2010s × pop/rock/hiphop/alt/rnb) → iTunes song previews (.m4a)
//
// Each pack becomes letterless (hideBoardLetters: true), every question is
// "Watch the clip — name the show." / "Listen to the clip — name the song.".
// Real previews are hotlinked from Apple's preview CDN — nothing copyrighted
// is stored. Auto-error → AUTO_SKIP, same as the existing tv-clips pack.
//
// Run:  node scripts/genClipsAll.mjs

import { writeFile } from 'node:fs/promises';

// ---------- SITCOM SHOW LISTS ----------
const SITCOMS_EASY = [
  'Friends', 'Seinfeld', 'The Office', 'The Big Bang Theory', 'How I Met Your Mother', 'Modern Family',
  'Brooklyn Nine-Nine', 'Parks and Recreation', 'Frasier', 'Cheers', 'M*A*S*H', 'I Love Lucy',
  'The Cosby Show', 'Three\'s Company', 'Bewitched', 'The Brady Bunch', 'Family Matters',
  'The Fresh Prince of Bel-Air', 'Full House', 'Saved by the Bell', 'Married… with Children',
  'Roseanne', 'Home Improvement', 'Everybody Loves Raymond', 'The King of Queens', 'Will & Grace',
  'Scrubs', 'Malcolm in the Middle', 'That 70s Show', 'Two and a Half Men', 'According to Jim',
  'Boy Meets World', 'Step by Step', 'Growing Pains', 'Diff\'rent Strokes', 'The Jeffersons',
  'Sanford and Son', 'All in the Family', 'The Mary Tyler Moore Show', 'Taxi', 'The Andy Griffith Show',
  'Happy Days', 'Laverne & Shirley', 'The Nanny', 'Mike & Molly', 'Last Man Standing',
];
const SITCOMS_MEDIUM = [
  '30 Rock', 'Community', 'Arrested Development', 'Curb Your Enthusiasm', 'Schitt\'s Creek', 'Veep',
  'Atlanta', 'Insecure', 'Black-ish', 'The Good Place', 'It\'s Always Sunny in Philadelphia',
  'Bob\'s Burgers', 'Letterkenny', 'Derry Girls', 'Fleabag', 'The IT Crowd', 'Father Ted', 'Spaced',
  'Peep Show', 'The Office', 'Silicon Valley', 'Broad City', 'Workaholics', 'New Girl', 'Younger',
  'Mom', '2 Broke Girls', 'The Goldbergs', 'Speechless', 'Trial & Error', 'Catastrophe',
  'Extras', 'Will & Grace', 'Mike & Molly', 'Roseanne', 'Designing Women',
];
const SITCOMS_HARD = [
  'NewsRadio', 'Sports Night', 'Better Off Ted', 'The Larry Sanders Show', 'Newhart',
  'The Bob Newhart Show', 'WKRP in Cincinnati', 'Barney Miller', 'Soap', 'Just Shoot Me!',
  'Spin City', 'Coach', 'Wings', 'Becker', 'Empty Nest', 'The Mary Tyler Moore Show',
  'Get Smart', 'The Andy Griffith Show', 'The Dick Van Dyke Show', 'Yes Minister',
  'Yes, Prime Minister', 'Mr. Belvedere', 'Perfect Strangers', 'Family Ties', 'Murphy Brown',
  'Designing Women', 'The Wonder Years', 'Frasier', 'Cheers', 'Taxi', 'Phil of the Future',
  'Greg the Bunny', 'Andy Richter Controls the Universe', 'The Young Ones', 'Yes Dear',
];

// ---------- MUSIC SEED LISTS [title, artist] ----------
// Curated representative songs per decade × genre. iTunes audio previews.
const MUSIC = {
  '80s-pop': [
    ['Like a Virgin', 'Madonna'], ['Material Girl', 'Madonna'], ['Like a Prayer', 'Madonna'],
    ['Vogue', 'Madonna'], ['Papa Don\'t Preach', 'Madonna'], ['Billie Jean', 'Michael Jackson'],
    ['Thriller', 'Michael Jackson'], ['Beat It', 'Michael Jackson'], ['Smooth Criminal', 'Michael Jackson'],
    ['Bad', 'Michael Jackson'], ['Man in the Mirror', 'Michael Jackson'], ['The Way You Make Me Feel', 'Michael Jackson'],
    ['I Wanna Dance with Somebody', 'Whitney Houston'], ['Greatest Love of All', 'Whitney Houston'],
    ['How Will I Know', 'Whitney Houston'], ['Girls Just Want to Have Fun', 'Cyndi Lauper'],
    ['Time After Time', 'Cyndi Lauper'], ['True Colors', 'Cyndi Lauper'], ['Careless Whisper', 'George Michael'],
    ['Faith', 'George Michael'], ['Wake Me Up Before You Go-Go', 'Wham!'], ['Last Christmas', 'Wham!'],
    ['1999', 'Prince'], ['Purple Rain', 'Prince'], ['When Doves Cry', 'Prince'], ['Kiss', 'Prince'],
    ['Little Red Corvette', 'Prince'], ['Raspberry Beret', 'Prince'], ['In the Air Tonight', 'Phil Collins'],
    ['Against All Odds', 'Phil Collins'], ['Sussudio', 'Phil Collins'], ['Hello', 'Lionel Richie'],
    ['All Night Long', 'Lionel Richie'], ['Endless Love', 'Lionel Richie'], ['Private Dancer', 'Tina Turner'],
    ['What\'s Love Got to Do with It', 'Tina Turner'], ['Maneater', 'Hall & Oates'],
    ['Karma Chameleon', 'Culture Club'], ['Do You Really Want to Hurt Me', 'Culture Club'],
    ['Take On Me', 'a-ha'], ['Sweet Dreams', 'Eurythmics'], ['West End Girls', 'Pet Shop Boys'],
    ['It\'s a Sin', 'Pet Shop Boys'], ['Total Eclipse of the Heart', 'Bonnie Tyler'],
    ['Heaven Is a Place on Earth', 'Belinda Carlisle'], ['Mickey', 'Toni Basil'],
    ['I Think We\'re Alone Now', 'Tiffany'], ['Lost in Your Eyes', 'Debbie Gibson'],
    ['Straight Up', 'Paula Abdul'], ['Forever Your Girl', 'Paula Abdul'], ['Hungry Like the Wolf', 'Duran Duran'],
    ['Rio', 'Duran Duran'], ['Notorious', 'Duran Duran'], ['Modern Love', 'David Bowie'],
    ['Let\'s Dance', 'David Bowie'], ['China Girl', 'David Bowie'], ['Walk Like an Egyptian', 'The Bangles'],
    ['Eternal Flame', 'The Bangles'], ['Manic Monday', 'The Bangles'], ['I Ran', 'A Flock of Seagulls'],
    ['Tainted Love', 'Soft Cell'], ['99 Luftballons', 'Nena'], ['Africa', 'Toto'], ['Rosanna', 'Toto'],
    ['Owner of a Lonely Heart', 'Yes'], ['Money for Nothing', 'Dire Straits'], ['Walk of Life', 'Dire Straits'],
    ['Don\'t You (Forget About Me)', 'Simple Minds'], ['Drive', 'The Cars'], ['You Might Think', 'The Cars'],
  ],
  '80s-rock': [
    ['Welcome to the Jungle', "Guns N' Roses"], ['Sweet Child o\' Mine', "Guns N' Roses"],
    ['Paradise City', "Guns N' Roses"], ['Patience', "Guns N' Roses"], ['Livin\' on a Prayer', 'Bon Jovi'],
    ['You Give Love a Bad Name', 'Bon Jovi'], ['Wanted Dead or Alive', 'Bon Jovi'],
    ['Bad Medicine', 'Bon Jovi'], ['Back in Black', 'AC/DC'], ['Highway to Hell', 'AC/DC'],
    ['Thunderstruck', 'AC/DC'], ['You Shook Me All Night Long', 'AC/DC'],
    ['Pour Some Sugar on Me', 'Def Leppard'], ['Photograph', 'Def Leppard'], ['Hysteria', 'Def Leppard'],
    ['Love Bites', 'Def Leppard'], ['Jump', 'Van Halen'], ['Panama', 'Van Halen'],
    ['Why Can\'t This Be Love', 'Van Halen'], ['Sunday Bloody Sunday', 'U2'], ['With or Without You', 'U2'],
    ['Where the Streets Have No Name', 'U2'], ['Pride (In the Name of Love)', 'U2'],
    ['I Still Haven\'t Found What I\'m Looking For', 'U2'], ['Born in the U.S.A.', 'Bruce Springsteen'],
    ['Glory Days', 'Bruce Springsteen'], ['Dancing in the Dark', 'Bruce Springsteen'],
    ['Born to Run', 'Bruce Springsteen'], ['Don\'t Stop Believin\'', 'Journey'], ['Any Way You Want It', 'Journey'],
    ['Open Arms', 'Journey'], ['Faithfully', 'Journey'], ['Separate Ways', 'Journey'],
    ['I Want to Know What Love Is', 'Foreigner'], ['Cold as Ice', 'Foreigner'], ['Hot Blooded', 'Foreigner'],
    ['Barracuda', 'Heart'], ['Alone', 'Heart'], ['Hit Me with Your Best Shot', 'Pat Benatar'],
    ['Heartbreaker', 'Pat Benatar'], ['Love Is a Battlefield', 'Pat Benatar'], ['Dream On', 'Aerosmith'],
    ['Walk This Way', 'Aerosmith'], ['Dude (Looks Like a Lady)', 'Aerosmith'], ['Janie\'s Got a Gun', 'Aerosmith'],
    ['Master of Puppets', 'Metallica'], ['One', 'Metallica'], ['Battery', 'Metallica'],
    ['For Whom the Bell Tolls', 'Metallica'], ['Dr. Feelgood', 'Mötley Crüe'], ['Kickstart My Heart', 'Mötley Crüe'],
    ['Home Sweet Home', 'Mötley Crüe'], ['Girls, Girls, Girls', 'Mötley Crüe'], ['Talk Dirty to Me', 'Poison'],
    ['Every Rose Has Its Thorn', 'Poison'], ['Nothin\' but a Good Time', 'Poison'],
    ['Round and Round', 'Ratt'], ['Cum on Feel the Noize', 'Quiet Riot'],
    ['Bang Your Head (Metal Health)', 'Quiet Riot'], ['We\'re Not Gonna Take It', 'Twisted Sister'],
    ['Here I Go Again', 'Whitesnake'], ['Is This Love', 'Whitesnake'], ['Don\'t Know What You Got', 'Cinderella'],
    ['18 and Life', 'Skid Row'], ['Sharp Dressed Man', 'ZZ Top'], ['Gimme All Your Lovin\'', 'ZZ Top'],
    ['Legs', 'ZZ Top'], ['Sultans of Swing', 'Dire Straits'], ['Roxanne', 'The Police'],
    ['Every Breath You Take', 'The Police'], ['Message in a Bottle', 'The Police'],
    ['Don\'t Stand So Close to Me', 'The Police'], ['Eye of the Tiger', 'Survivor'],
    ['Holding Out for a Hero', 'Bonnie Tyler'], ['Eye in the Sky', 'The Alan Parsons Project'],
    ['Crazy Train', 'Ozzy Osbourne'], ['Mr. Crowley', 'Ozzy Osbourne'], ['Bark at the Moon', 'Ozzy Osbourne'],
    ['Run to the Hills', 'Iron Maiden'], ['The Trooper', 'Iron Maiden'], ['Number of the Beast', 'Iron Maiden'],
    ['You\'ve Got Another Thing Comin\'', 'Judas Priest'], ['Breaking the Law', 'Judas Priest'],
    ['Holy Diver', 'Dio'], ['Rainbow in the Dark', 'Dio'], ['Free Fallin\'', 'Tom Petty'],
    ['I Won\'t Back Down', 'Tom Petty'], ['Refugee', 'Tom Petty'], ['Jack & Diane', 'John Mellencamp'],
    ['Pink Houses', 'John Mellencamp'], ['Rebel Yell', 'Billy Idol'], ['White Wedding', 'Billy Idol'],
    ['Can\'t Fight This Feeling', 'REO Speedwagon'], ['Take It on the Run', 'REO Speedwagon'],
  ],
  '90s-pop': [
    ['Wannabe', 'Spice Girls'], ['Spice Up Your Life', 'Spice Girls'], ['Say You\'ll Be There', 'Spice Girls'],
    ['2 Become 1', 'Spice Girls'], ['Stop', 'Spice Girls'], ['Viva Forever', 'Spice Girls'],
    ['…Baby One More Time', 'Britney Spears'], ['Sometimes', 'Britney Spears'],
    ['Born to Make You Happy', 'Britney Spears'], ['From the Bottom of My Broken Heart', 'Britney Spears'],
    ['I Want It That Way', 'Backstreet Boys'], ['Everybody (Backstreet\'s Back)', 'Backstreet Boys'],
    ['Quit Playing Games', 'Backstreet Boys'], ['Larger Than Life', 'Backstreet Boys'],
    ['As Long as You Love Me', 'Backstreet Boys'], ['Show Me the Meaning of Being Lonely', 'Backstreet Boys'],
    ['Tearin\' Up My Heart', 'NSYNC'], ['I Want You Back', 'NSYNC'],
    ['(God Must Have Spent) A Little More Time on You', 'NSYNC'], ['Genie in a Bottle', 'Christina Aguilera'],
    ['What a Girl Wants', 'Christina Aguilera'], ['Come On Over Baby', 'Christina Aguilera'],
    ['Vision of Love', 'Mariah Carey'], ['Hero', 'Mariah Carey'], ['Always Be My Baby', 'Mariah Carey'],
    ['Fantasy', 'Mariah Carey'], ['Honey', 'Mariah Carey'], ['My All', 'Mariah Carey'],
    ['Dreamlover', 'Mariah Carey'], ['Heartbreaker', 'Mariah Carey'], ['I Will Always Love You', 'Whitney Houston'],
    ['I Have Nothing', 'Whitney Houston'], ['Run to You', 'Whitney Houston'], ['Exhale (Shoop Shoop)', 'Whitney Houston'],
    ['It\'s Not Right but It\'s Okay', 'Whitney Houston'], ['My Heart Will Go On', 'Celine Dion'],
    ['Because You Loved Me', 'Celine Dion'], ['The Power of Love', 'Celine Dion'],
    ['It\'s All Coming Back to Me Now', 'Celine Dion'], ['All by Myself', 'Celine Dion'],
    ['The Sign', 'Ace of Base'], ['All That She Wants', 'Ace of Base'], ['Don\'t Turn Around', 'Ace of Base'],
    ['MMMBop', 'Hanson'], ['Barbie Girl', 'Aqua'], ['Macarena', 'Los del Río'], ['Mambo No. 5', 'Lou Bega'],
    ['Livin\' la Vida Loca', 'Ricky Martin'], ['Believe', 'Cher'], ['Iris', 'Goo Goo Dolls'],
    ['Torn', 'Natalie Imbruglia'], ['Save Tonight', 'Eagle-Eye Cherry'], ['Crush', 'Jennifer Paige'],
    ['Don\'t Speak', 'No Doubt'], ['Just a Girl', 'No Doubt'], ['Spiderwebs', 'No Doubt'],
    ['Ironic', 'Alanis Morissette'], ['You Oughta Know', 'Alanis Morissette'],
    ['Hand in My Pocket', 'Alanis Morissette'], ['Black Velvet', 'Alannah Myles'],
    ['Truly Madly Deeply', 'Savage Garden'], ['I Want You', 'Savage Garden'],
    ['I Knew I Loved You', 'Savage Garden'], ['Kiss Me', 'Sixpence None the Richer'],
    ['Closing Time', 'Semisonic'], ['You Get What You Give', 'New Radicals'],
    ['Two Princes', 'Spin Doctors'], ['Linger', 'The Cranberries'], ['Zombie', 'The Cranberries'],
    ['Dreams', 'The Cranberries'], ['What\'s Up?', '4 Non Blondes'], ['Smile', 'Lily Allen'],
  ],
  '90s-hiphop': [
    ['California Love', '2Pac'], ['Hit \'Em Up', '2Pac'], ['Changes', '2Pac'], ['Dear Mama', '2Pac'],
    ['I Get Around', '2Pac'], ['Keep Ya Head Up', '2Pac'], ['Hail Mary', '2Pac'],
    ['Juicy', 'The Notorious B.I.G.'], ['Hypnotize', 'The Notorious B.I.G.'], ['Big Poppa', 'The Notorious B.I.G.'],
    ['Mo Money Mo Problems', 'The Notorious B.I.G.'], ['One More Chance', 'The Notorious B.I.G.'],
    ['Going Back to Cali', 'The Notorious B.I.G.'], ['Nuthin\' but a \'G\' Thang', 'Dr. Dre'],
    ['Gin and Juice', 'Snoop Dogg'], ['Who Am I (What\'s My Name)?', 'Snoop Dogg'], ['Drop It Like It\'s Hot', 'Snoop Dogg'],
    ['Hard Knock Life', 'Jay-Z'], ['Can I Get A...', 'Jay-Z'], ['Big Pimpin\'', 'Jay-Z'],
    ['It\'s All About the Benjamins', 'Puff Daddy'], ['I\'ll Be Missing You', 'Puff Daddy'],
    ['C.R.E.A.M.', 'Wu-Tang Clan'], ['Protect Ya Neck', 'Wu-Tang Clan'], ['Triumph', 'Wu-Tang Clan'],
    ['Gangsta\'s Paradise', 'Coolio'], ['U Can\'t Touch This', 'MC Hammer'], ['2 Legit 2 Quit', 'MC Hammer'],
    ['Push It', 'Salt-N-Pepa'], ['Shoop', 'Salt-N-Pepa'], ['Whatta Man', 'Salt-N-Pepa'],
    ['It Was a Good Day', 'Ice Cube'], ['Bow Down', 'Ice Cube'], ['Mama Said Knock You Out', 'LL Cool J'],
    ['Doin\' It', 'LL Cool J'], ['Around the Way Girl', 'LL Cool J'], ['Bring the Pain', 'Method Man'],
    ['How High', 'Method Man'], ['Ruff Ryders\' Anthem', 'DMX'], ['Party Up (Up in Here)', 'DMX'],
    ['Get at Me Dog', 'DMX'], ['Woo Hah!! Got You All in Check', 'Busta Rhymes'], ['Put Your Hands Where My Eyes Could See', 'Busta Rhymes'],
    ['Doo Wop (That Thing)', 'Lauryn Hill'], ['Killing Me Softly with His Song', 'Fugees'],
    ['Ready or Not', 'Fugees'], ['Gone Till November', 'Wyclef Jean'], ['Bonita Applebum', 'A Tribe Called Quest'],
    ['Scenario', 'A Tribe Called Quest'], ['Can I Kick It?', 'A Tribe Called Quest'],
    ['Check the Rhime', 'A Tribe Called Quest'], ['Me Myself and I', 'De La Soul'],
    ['Insane in the Brain', 'Cypress Hill'], ['How I Could Just Kill a Man', 'Cypress Hill'],
    ['Tha Crossroads', 'Bone Thugs-N-Harmony'], ['Shook Ones, Pt. II', 'Mobb Deep'],
    ['Quiet Storm', 'Mobb Deep'], ['Get Money', 'Junior M.A.F.I.A.'], ['Player\'s Anthem', 'Junior M.A.F.I.A.'],
    ['Crush on You', 'Lil\' Kim'], ['Not Tonight', 'Lil\' Kim'], ['Get You Home', 'Foxy Brown'],
    ['Ant\'s Marching', 'Dave Matthews Band'], ['Ms. Fat Booty', 'Mos Def'], ['Definition', 'Black Star'],
    ['Microphone Fiend', 'Eric B. & Rakim'], ['Top Billin\'', 'Audio Two'], ['Jump Around', 'House of Pain'],
    ['Bust a Move', 'Young MC'], ['Wild Thing', 'Tone Loc'], ['Funky Cold Medina', 'Tone Loc'],
  ],
  '90s-alt': [
    ['Smells Like Teen Spirit', 'Nirvana'], ['Come as You Are', 'Nirvana'], ['Lithium', 'Nirvana'],
    ['In Bloom', 'Nirvana'], ['Heart-Shaped Box', 'Nirvana'], ['All Apologies', 'Nirvana'],
    ['Polly', 'Nirvana'], ['Alive', 'Pearl Jam'], ['Jeremy', 'Pearl Jam'], ['Even Flow', 'Pearl Jam'],
    ['Black', 'Pearl Jam'], ['Better Man', 'Pearl Jam'], ['Yellow Ledbetter', 'Pearl Jam'],
    ['Last Kiss', 'Pearl Jam'], ['Black Hole Sun', 'Soundgarden'], ['Spoonman', 'Soundgarden'],
    ['Rusty Cage', 'Soundgarden'], ['Outshined', 'Soundgarden'], ['Burden in My Hand', 'Soundgarden'],
    ['Man in the Box', 'Alice in Chains'], ['Would?', 'Alice in Chains'], ['Rooster', 'Alice in Chains'],
    ['Down in a Hole', 'Alice in Chains'], ['Plush', 'Stone Temple Pilots'],
    ['Interstate Love Song', 'Stone Temple Pilots'], ['Vasoline', 'Stone Temple Pilots'],
    ['Glycerine', 'Bush'], ['Comedown', 'Bush'], ['Machinehead', 'Bush'],
    ['Buddy Holly', 'Weezer'], ['Say It Ain\'t So', 'Weezer'], ['Undone — The Sweater Song', 'Weezer'],
    ['Basket Case', 'Green Day'], ['When I Come Around', 'Green Day'],
    ['Good Riddance (Time of Your Life)', 'Green Day'], ['Welcome to Paradise', 'Green Day'],
    ['Longview', 'Green Day'], ['Brain Stew', 'Green Day'], ['Everlong', 'Foo Fighters'],
    ['Monkey Wrench', 'Foo Fighters'], ['My Hero', 'Foo Fighters'], ['Learn to Fly', 'Foo Fighters'],
    ['Big Me', 'Foo Fighters'], ['Creep', 'Radiohead'], ['Karma Police', 'Radiohead'],
    ['No Surprises', 'Radiohead'], ['Paranoid Android', 'Radiohead'], ['High and Dry', 'Radiohead'],
    ['Fake Plastic Trees', 'Radiohead'], ['Lucky', 'Radiohead'], ['1979', 'The Smashing Pumpkins'],
    ['Tonight, Tonight', 'The Smashing Pumpkins'], ['Bullet with Butterfly Wings', 'The Smashing Pumpkins'],
    ['Today', 'The Smashing Pumpkins'], ['Disarm', 'The Smashing Pumpkins'],
    ['Cherub Rock', 'The Smashing Pumpkins'], ['Wonderwall', 'Oasis'], ['Champagne Supernova', 'Oasis'],
    ['Don\'t Look Back in Anger', 'Oasis'], ['Live Forever', 'Oasis'], ['Some Might Say', 'Oasis'],
    ['Roll with It', 'Oasis'], ['Song 2', 'Blur'], ['Parklife', 'Blur'], ['Beetlebum', 'Blur'],
    ['Common People', 'Pulp'], ['Disco 2000', 'Pulp'], ['Bitter Sweet Symphony', 'The Verve'],
    ['The Drugs Don\'t Work', 'The Verve'], ['Why Does It Always Rain on Me?', 'Travis'],
    ['Mr. Jones', 'Counting Crows'], ['A Long December', 'Counting Crows'], ['Round Here', 'Counting Crows'],
    ['Lightning Crashes', 'Live'], ['I Alone', 'Live'], ['Shine', 'Collective Soul'],
    ['Pump It Up', 'Limp Bizkit'], ['Nookie', 'Limp Bizkit'], ['Break Stuff', 'Limp Bizkit'],
    ['Freak on a Leash', 'Korn'], ['Got the Life', 'Korn'], ['Closer', 'Nine Inch Nails'],
    ['Hurt', 'Nine Inch Nails'], ['The Beautiful People', 'Marilyn Manson'],
    ['Sweet Dreams (Are Made of This)', 'Marilyn Manson'], ['Killing in the Name', 'Rage Against the Machine'],
    ['Bulls on Parade', 'Rage Against the Machine'], ['Sober', 'Tool'], ['Aenima', 'Tool'],
    ['Self Esteem', 'The Offspring'], ['Come Out and Play', 'The Offspring'],
    ['Pretty Fly (For a White Guy)', 'The Offspring'], ['Why Don\'t You Get a Job?', 'The Offspring'],
    ['Semi-Charmed Life', 'Third Eye Blind'], ['Jumper', 'Third Eye Blind'],
    ['Sex and Candy', 'Marcy Playground'], ['Name', 'Goo Goo Dolls'], ['Slide', 'Goo Goo Dolls'],
  ],
  '90s-rnb': [
    ['Waterfalls', 'TLC'], ['No Scrubs', 'TLC'], ['Creep', 'TLC'], ['Unpretty', 'TLC'],
    ['End of the Road', 'Boyz II Men'], ['I\'ll Make Love to You', 'Boyz II Men'],
    ['On Bended Knee', 'Boyz II Men'], ['Motownphilly', 'Boyz II Men'], ['Water Runs Dry', 'Boyz II Men'],
    ['4 Seasons of Loneliness', 'Boyz II Men'], ['The Boy Is Mine', 'Brandy'], ['Sittin\' Up in My Room', 'Brandy'],
    ['Have You Ever?', 'Brandy'], ['Angel of Mine', 'Monica'], ['Don\'t Take It Personal', 'Monica'],
    ['For You I Will', 'Monica'], ['Try Again', 'Aaliyah'], ['Are You That Somebody?', 'Aaliyah'],
    ['One in a Million', 'Aaliyah'], ['Back & Forth', 'Aaliyah'], ['If Your Girl Only Knew', 'Aaliyah'],
    ['Un-Break My Heart', 'Toni Braxton'], ['You\'re Makin\' Me High', 'Toni Braxton'],
    ['Another Sad Love Song', 'Toni Braxton'], ['Breathe Again', 'Toni Braxton'], ['Bump n\' Grind', 'R. Kelly'],
    ['I Believe I Can Fly', 'R. Kelly'], ['Down Low (Nobody Has to Know)', 'R. Kelly'],
    ['Hold On', 'En Vogue'], ['Free Your Mind', 'En Vogue'], ['Don\'t Let Go (Love)', 'En Vogue'],
    ['Weak', 'SWV'], ['Right Here / Human Nature', 'SWV'], ['I\'m So Into You', 'SWV'],
    ['Just Kickin\' It', 'Xscape'], ['Understanding', 'Xscape'], ['Forever My Lady', 'Jodeci'],
    ['Stay', 'Jodeci'], ['Lately', 'Jodeci'], ['Poison', 'Bell Biv DeVoe'], ['Do Me!', 'Bell Biv DeVoe'],
    ['I Wanna Sex You Up', 'Color Me Badd'], ['I Adore Mi Amor', 'Color Me Badd'],
    ['Real Love', 'Mary J. Blige'], ['You Remind Me', 'Mary J. Blige'], ['Be Happy', 'Mary J. Blige'],
    ['Not Gon\' Cry', 'Mary J. Blige'], ['Brown Sugar', 'D\'Angelo'], ['Lady', 'D\'Angelo'],
    ['Ascension (Don\'t Ever Wonder)', 'Maxwell'], ['On & On', 'Erykah Badu'], ['Tyrone', 'Erykah Badu'],
    ['Pony', 'Ginuwine'], ['So Anxious', 'Ginuwine'], ['Anytime', 'Brian McKnight'],
    ['Back at One', 'Brian McKnight'], ['Cupid', '112'], ['Anywhere', '112'],
    ['In My Bed', 'Dru Hill'], ['How Deep Is Your Love', 'Dru Hill'], ['Too Close', 'Next'],
    ['I Swear', 'All-4-One'], ['So Much in Love', 'All-4-One'], ['I Wanna Be Down', 'Brandy'],
    ['Best Friend', 'Brandy'], ['I\'ll Be Missing You', 'Faith Evans'],
  ],
  '00s-pop': [
    ['Since U Been Gone', 'Kelly Clarkson'], ['Behind These Hazel Eyes', 'Kelly Clarkson'],
    ['Because of You', 'Kelly Clarkson'], ['Breakaway', 'Kelly Clarkson'], ['My Life Would Suck Without You', 'Kelly Clarkson'],
    ['Crazy in Love', 'Beyoncé'], ['Single Ladies (Put a Ring on It)', 'Beyoncé'],
    ['Halo', 'Beyoncé'], ['Irreplaceable', 'Beyoncé'], ['Listen', 'Beyoncé'],
    ['SexyBack', 'Justin Timberlake'], ['Cry Me a River', 'Justin Timberlake'],
    ['Rock Your Body', 'Justin Timberlake'], ['What Goes Around... Comes Around', 'Justin Timberlake'],
    ['My Love', 'Justin Timberlake'], ['Clocks', 'Coldplay'], ['Yellow', 'Coldplay'],
    ['Viva la Vida', 'Coldplay'], ['Fix You', 'Coldplay'], ['The Scientist', 'Coldplay'],
    ['Speed of Sound', 'Coldplay'], ['This Love', 'Maroon 5'], ['She Will Be Loved', 'Maroon 5'],
    ['Sunday Morning', 'Maroon 5'], ['Makes Me Wonder', 'Maroon 5'], ['Mr. Brightside', 'The Killers'],
    ['Somebody Told Me', 'The Killers'], ['When You Were Young', 'The Killers'], ['Human', 'The Killers'],
    ['Where Is the Love?', 'The Black Eyed Peas'], ['I Gotta Feeling', 'The Black Eyed Peas'],
    ['Boom Boom Pow', 'The Black Eyed Peas'], ['My Humps', 'The Black Eyed Peas'],
    ['In the End', 'Linkin Park'], ['Numb', 'Linkin Park'], ['What I\'ve Done', 'Linkin Park'],
    ['Crawling', 'Linkin Park'], ['Complicated', 'Avril Lavigne'], ['Sk8er Boi', 'Avril Lavigne'],
    ['Girlfriend', 'Avril Lavigne'], ['I\'m with You', 'Avril Lavigne'], ['Get the Party Started', 'Pink'],
    ['So What', 'Pink'], ['Just like a Pill', 'Pink'], ['Stupid Girls', 'Pink'],
    ['Hollaback Girl', 'Gwen Stefani'], ['What You Waiting For?', 'Gwen Stefani'],
    ['Cool', 'Gwen Stefani'], ['Beautiful', 'Christina Aguilera'], ['Dirrty', 'Christina Aguilera'],
    ['Toxic', 'Britney Spears'], ['Oops!... I Did It Again', 'Britney Spears'],
    ['Lucky', 'Britney Spears'], ['I\'m a Slave 4 U', 'Britney Spears'], ['Stronger', 'Britney Spears'],
    ['Just Dance', 'Lady Gaga'], ['Poker Face', 'Lady Gaga'], ['Bad Romance', 'Lady Gaga'],
    ['Paparazzi', 'Lady Gaga'], ['LoveGame', 'Lady Gaga'], ['I Kissed a Girl', 'Katy Perry'],
    ['Hot N Cold', 'Katy Perry'], ['Waking Up in Vegas', 'Katy Perry'], ['Umbrella', 'Rihanna'],
    ['Don\'t Stop the Music', 'Rihanna'], ['Disturbia', 'Rihanna'], ['Take a Bow', 'Rihanna'],
    ['Pon de Replay', 'Rihanna'], ['SOS', 'Rihanna'], ['Whenever, Wherever', 'Shakira'],
    ['Hips Don\'t Lie', 'Shakira'], ['Underneath Your Clothes', 'Shakira'], ['Promiscuous', 'Nelly Furtado'],
    ['Maneater', 'Nelly Furtado'], ['Say It Right', 'Nelly Furtado'], ['I\'m Like a Bird', 'Nelly Furtado'],
    ['Big Girls Don\'t Cry', 'Fergie'], ['London Bridge', 'Fergie'], ['Glamorous', 'Fergie'],
    ['Wake Me Up When September Ends', 'Green Day'], ['American Idiot', 'Green Day'],
    ['Boulevard of Broken Dreams', 'Green Day'], ['21 Guns', 'Green Day'],
    ['Welcome to the Black Parade', 'My Chemical Romance'], ['Helena', 'My Chemical Romance'],
    ['Famous Last Words', 'My Chemical Romance'], ['Sugar, We\'re Goin Down', 'Fall Out Boy'],
    ['Dance, Dance', 'Fall Out Boy'], ['Thnks fr th Mmrs', 'Fall Out Boy'],
    ['I Write Sins Not Tragedies', 'Panic! at the Disco'], ['Photograph', 'Nickelback'],
    ['How You Remind Me', 'Nickelback'], ['Far Away', 'Nickelback'], ['Rockstar', 'Nickelback'],
    ['Hero', 'Enrique Iglesias'], ['Bring Me to Life', 'Evanescence'], ['My Immortal', 'Evanescence'],
    ['Going Under', 'Evanescence'],
  ],
  '00s-hiphop': [
    ['Lose Yourself', 'Eminem'], ['The Real Slim Shady', 'Eminem'], ['Stan', 'Eminem'],
    ['Without Me', 'Eminem'], ['Cleanin\' Out My Closet', 'Eminem'], ['Like Toy Soldiers', 'Eminem'],
    ['When I\'m Gone', 'Eminem'], ['Mockingbird', 'Eminem'], ['In Da Club', '50 Cent'],
    ['21 Questions', '50 Cent'], ['P.I.M.P.', '50 Cent'], ['Candy Shop', '50 Cent'],
    ['Many Men', '50 Cent'], ['Just a Lil Bit', '50 Cent'], ['Stronger', 'Kanye West'],
    ['Heartless', 'Kanye West'], ['Gold Digger', 'Kanye West'], ['Jesus Walks', 'Kanye West'],
    ['Through the Wire', 'Kanye West'], ['Touch the Sky', 'Kanye West'], ['Flashing Lights', 'Kanye West'],
    ['Love Lockdown', 'Kanye West'], ['Diamonds from Sierra Leone', 'Kanye West'],
    ['99 Problems', 'Jay-Z'], ['Empire State of Mind', 'Jay-Z'], ['Izzo (H.O.V.A.)', 'Jay-Z'],
    ['Heart of the City (Ain\'t No Love)', 'Jay-Z'], ['Dirt Off Your Shoulder', 'Jay-Z'],
    ['Run This Town', 'Jay-Z'], ['Encore', 'Jay-Z'], ['Bring \'Em Out', 'T.I.'],
    ['What You Know', 'T.I.'], ['Live Your Life', 'T.I.'], ['Whatever You Like', 'T.I.'],
    ['Dead and Gone', 'T.I.'], ['Lollipop', 'Lil Wayne'], ['A Milli', 'Lil Wayne'], ['Got Money', 'Lil Wayne'],
    ['Money Maker', 'Ludacris'], ['Stand Up', 'Ludacris'], ['Hot in Herre', 'Nelly'],
    ['Country Grammar', 'Nelly'], ['Dilemma', 'Nelly'], ['Ride wit Me', 'Nelly'],
    ['Grillz', 'Nelly'], ['Air Force Ones', 'Nelly'], ['Yeah!', 'Usher'], ['Burn', 'Usher'],
    ['Confessions Part II', 'Usher'], ['Caught Up', 'Usher'], ['U Got It Bad', 'Usher'],
    ['U Remind Me', 'Usher'], ['Love in This Club', 'Usher'], ['OMG', 'Usher'],
    ['So Sick', 'Ne-Yo'], ['Sexy Love', 'Ne-Yo'], ['Because of You', 'Ne-Yo'], ['Closer', 'Ne-Yo'],
    ['Fallin\'', 'Alicia Keys'], ['You Don\'t Know My Name', 'Alicia Keys'],
    ['If I Ain\'t Got You', 'Alicia Keys'], ['No One', 'Alicia Keys'],
    ['Ordinary People', 'John Legend'], ['Save Room', 'John Legend'], ['Green Light', 'John Legend'],
    ['Family Affair', 'Mary J. Blige'], ['Be Without You', 'Mary J. Blige'],
    ['We Belong Together', 'Mariah Carey'], ['Shake It Off', 'Mariah Carey'], ['Touch My Body', 'Mariah Carey'],
    ['Run It!', 'Chris Brown'], ['Yo (Excuse Me Miss)', 'Chris Brown'], ['Kiss Kiss', 'Chris Brown'],
    ['With You', 'Chris Brown'], ['Forever', 'Chris Brown'], ['Hey Ya!', 'OutKast'],
    ['The Way You Move', 'OutKast'], ['Roses', 'OutKast'], ['Ms. Jackson', 'OutKast'],
    ['So Fresh, So Clean', 'OutKast'], ['Drop It Like It\'s Hot', 'Snoop Dogg'],
    ['Beautiful', 'Snoop Dogg'], ['Sensual Seduction', 'Snoop Dogg'], ['Crank That (Soulja Boy)', 'Soulja Boy'],
    ['Walk It Out', 'DJ Unk'], ['Pop, Lock & Drop It', 'Huey'], ['Smack That', 'Akon'],
    ['Don\'t Matter', 'Akon'], ['I Wanna Love You', 'Akon'], ['Sorry, Blame It on Me', 'Akon'],
    ['Buy U a Drank (Shawty Snappin\')', 'T-Pain'], ['Bartender', 'T-Pain'], ['Apple Bottom Jeans / Low', 'Flo Rida'],
    ['Right Round', 'Flo Rida'], ['Best I Ever Had', 'Drake'], ['Successful', 'Drake'],
    ['Forever', 'Drake'], ['Soulja Boy', 'Soulja Boy'],
  ],
  '10s-pop': [
    ['Rolling in the Deep', 'Adele'], ['Someone Like You', 'Adele'], ['Set Fire to the Rain', 'Adele'],
    ['Hello', 'Adele'], ['Skyfall', 'Adele'], ['When We Were Young', 'Adele'],
    ['Shake It Off', 'Taylor Swift'], ['Blank Space', 'Taylor Swift'], ['Bad Blood', 'Taylor Swift'],
    ['Wildest Dreams', 'Taylor Swift'], ['Look What You Made Me Do', 'Taylor Swift'],
    ['Style', 'Taylor Swift'], ['ME!', 'Taylor Swift'], ['You Need to Calm Down', 'Taylor Swift'],
    ['Lover', 'Taylor Swift'], ['Cardigan', 'Taylor Swift'], ['Problem', 'Ariana Grande'],
    ['Break Free', 'Ariana Grande'], ['Bang Bang', 'Ariana Grande'], ['Side to Side', 'Ariana Grande'],
    ['Dangerous Woman', 'Ariana Grande'], ['No Tears Left to Cry', 'Ariana Grande'],
    ['God Is a Woman', 'Ariana Grande'], ['Thank U, Next', 'Ariana Grande'],
    ['7 Rings', 'Ariana Grande'], ['Shape of You', 'Ed Sheeran'], ['Photograph', 'Ed Sheeran'],
    ['Thinking Out Loud', 'Ed Sheeran'], ['Castle on the Hill', 'Ed Sheeran'],
    ['Perfect', 'Ed Sheeran'], ['Galway Girl', 'Ed Sheeran'], ['Happier', 'Ed Sheeran'],
    ['Uptown Funk', 'Mark Ronson'], ['Locked Out of Heaven', 'Bruno Mars'],
    ['Grenade', 'Bruno Mars'], ['Just the Way You Are', 'Bruno Mars'], ['The Lazy Song', 'Bruno Mars'],
    ['Treasure', 'Bruno Mars'], ['When I Was Your Man', 'Bruno Mars'], ['24K Magic', 'Bruno Mars'],
    ['That\'s What I Like', 'Bruno Mars'], ['Finesse', 'Bruno Mars'], ['Born This Way', 'Lady Gaga'],
    ['Edge of Glory', 'Lady Gaga'], ['Marry the Night', 'Lady Gaga'], ['Applause', 'Lady Gaga'],
    ['Million Reasons', 'Lady Gaga'], ['Shallow', 'Lady Gaga'], ['Roar', 'Katy Perry'],
    ['Dark Horse', 'Katy Perry'], ['Firework', 'Katy Perry'], ['California Gurls', 'Katy Perry'],
    ['Last Friday Night (T.G.I.F.)', 'Katy Perry'], ['Teenage Dream', 'Katy Perry'],
    ['Chained to the Rhythm', 'Katy Perry'], ['Diamonds', 'Rihanna'], ['We Found Love', 'Rihanna'],
    ['Only Girl (In the World)', 'Rihanna'], ['What\'s My Name?', 'Rihanna'], ['Stay', 'Rihanna'],
    ['Work', 'Rihanna'], ['Needed Me', 'Rihanna'], ['Drag Me Down', 'One Direction'],
    ['Story of My Life', 'One Direction'], ['What Makes You Beautiful', 'One Direction'],
    ['Best Song Ever', 'One Direction'], ['Live While We\'re Young', 'One Direction'],
    ['Night Changes', 'One Direction'], ['Sign of the Times', 'Harry Styles'],
    ['Watermelon Sugar', 'Harry Styles'], ['Adore You', 'Harry Styles'], ['Lights Up', 'Harry Styles'],
    ['Sorry', 'Justin Bieber'], ['Love Yourself', 'Justin Bieber'], ['What Do You Mean?', 'Justin Bieber'],
    ['Boyfriend', 'Justin Bieber'], ['Despacito', 'Luis Fonsi'], ['Stitches', 'Shawn Mendes'],
    ['Treat You Better', 'Shawn Mendes'], ['There\'s Nothing Holdin\' Me Back', 'Shawn Mendes'],
    ['Senorita', 'Shawn Mendes'], ['Havana', 'Camila Cabello'], ['Royals', 'Lorde'],
    ['Team', 'Lorde'], ['Green Light', 'Lorde'], ['Video Games', 'Lana Del Rey'],
    ['Summertime Sadness', 'Lana Del Rey'], ['Born to Die', 'Lana Del Rey'],
    ['Without Me', 'Halsey'], ['Closer', 'The Chainsmokers'], ['Don\'t Let Me Down', 'The Chainsmokers'],
    ['Something Just Like This', 'The Chainsmokers'], ['Wake Me Up', 'Avicii'],
    ['Hey Brother', 'Avicii'], ['Levels', 'Avicii'], ['Waiting for Love', 'Avicii'],
    ['Lean On', 'Major Lazer'], ['Cheap Thrills', 'Sia'], ['Chandelier', 'Sia'],
    ['Counting Stars', 'OneRepublic'], ['Believer', 'Imagine Dragons'], ['Thunder', 'Imagine Dragons'],
    ['Demons', 'Imagine Dragons'], ['Radioactive', 'Imagine Dragons'], ['Natural', 'Imagine Dragons'],
    ['Stressed Out', 'Twenty One Pilots'], ['Heathens', 'Twenty One Pilots'], ['Ride', 'Twenty One Pilots'],
    ['Pompeii', 'Bastille'], ['Riptide', 'Vance Joy'], ['Take Me to Church', 'Hozier'],
    ['Stay With Me', 'Sam Smith'], ['Too Good at Goodbyes', 'Sam Smith'],
    ['Locked Away', 'R. City'], ['Cheerleader', 'OMI'], ['Trumpets', 'Jason Derulo'],
    ['Wiggle', 'Jason Derulo'], ['Talk Dirty', 'Jason Derulo'], ['Want to Want Me', 'Jason Derulo'],
  ],
  '10s-hiphop': [
    ['HUMBLE.', 'Kendrick Lamar'], ['DNA.', 'Kendrick Lamar'], ['Alright', 'Kendrick Lamar'],
    ['King Kunta', 'Kendrick Lamar'], ['Money Trees', 'Kendrick Lamar'], ['Swimming Pools (Drank)', 'Kendrick Lamar'],
    ['LOYALTY.', 'Kendrick Lamar'], ['ELEMENT.', 'Kendrick Lamar'], ['Hotline Bling', 'Drake'],
    ['One Dance', 'Drake'], ['Started from the Bottom', 'Drake'], ['Take Care', 'Drake'],
    ['Headlines', 'Drake'], ['God\'s Plan', 'Drake'], ['In My Feelings', 'Drake'],
    ['Nice for What', 'Drake'], ['Nonstop', 'Drake'], ['Best I Ever Had', 'Drake'],
    ['Power', 'Kanye West'], ['Runaway', 'Kanye West'], ['All of the Lights', 'Kanye West'],
    ['Monster', 'Kanye West'], ['Niggas in Paris', 'Jay-Z'], ['Otis', 'Jay-Z'],
    ['Black Skinhead', 'Kanye West'], ['Bound 2', 'Kanye West'], ['Famous', 'Kanye West'],
    ['Anaconda', 'Nicki Minaj'], ['Super Bass', 'Nicki Minaj'], ['Starships', 'Nicki Minaj'],
    ['Pound the Alarm', 'Nicki Minaj'], ['Bang Bang', 'Jessie J'], ['Side to Side', 'Ariana Grande'],
    ['Bodak Yellow', 'Cardi B'], ['I Like It', 'Cardi B'], ['Be Careful', 'Cardi B'],
    ['Money', 'Cardi B'], ['Bad and Boujee', 'Migos'], ['Walk It Talk It', 'Migos'],
    ['MotorSport', 'Migos'], ['T-Shirt', 'Migos'], ['Stir Fry', 'Migos'], ['Versace', 'Migos'],
    ['Sicko Mode', 'Travis Scott'], ['Goosebumps', 'Travis Scott'], ['Antidote', 'Travis Scott'],
    ['Stargazing', 'Travis Scott'], ['Highest in the Room', 'Travis Scott'],
    ['Mask Off', 'Future'], ['Where Ya At', 'Future'], ['Low Life', 'Future'],
    ['Jumpman', 'Drake'], ['Trap Queen', 'Fetty Wap'], ['679', 'Fetty Wap'],
    ['No Role Modelz', 'J. Cole'], ['Crooked Smile', 'J. Cole'], ['Wet Dreamz', 'J. Cole'],
    ['ATM', 'J. Cole'], ['Middle Child', 'J. Cole'], ['I Got the Keys', 'DJ Khaled'],
    ['All Me', 'Drake'], ['Wild Thoughts', 'DJ Khaled'], ['I\'m the One', 'DJ Khaled'],
    ['No Brainer', 'DJ Khaled'], ['Sunflower', 'Post Malone'], ['Better Now', 'Post Malone'],
    ['Congratulations', 'Post Malone'], ['Rockstar', 'Post Malone'], ['White Iverson', 'Post Malone'],
    ['Circles', 'Post Malone'], ['Wow.', 'Post Malone'], ['Goodbyes', 'Post Malone'],
    ['Lucid Dreams', 'Juice WRLD'], ['All Girls Are the Same', 'Juice WRLD'], ['Robbery', 'Juice WRLD'],
    ['Lean wit Me', 'Juice WRLD'], ['Suge', 'DaBaby'], ['Bop', 'DaBaby'],
    ['The Box', 'Roddy Ricch'], ['Look at Me!', 'XXXTentacion'], ['SAD!', 'XXXTentacion'],
    ['Jocelyn Flores', 'XXXTentacion'], ['Moonlight', 'XXXTentacion'], ['Changes', 'XXXTentacion'],
    ['Falling Down', 'XXXTentacion'], ['Earned It', 'The Weeknd'], ['Can\'t Feel My Face', 'The Weeknd'],
    ['Starboy', 'The Weeknd'], ['I Feel It Coming', 'The Weeknd'], ['The Hills', 'The Weeknd'],
    ['In the Night', 'The Weeknd'], ['Often', 'The Weeknd'], ['Wicked Games', 'The Weeknd'],
    ['Heartless', 'The Weeknd'], ['Blinding Lights', 'The Weeknd'],
    ['Old Town Road', 'Lil Nas X'], ['Panini', 'Lil Nas X'], ['Holy Grail', 'Jay-Z'],
    ['Tom Ford', 'Jay-Z'], ['Pink + White', 'Frank Ocean'], ['Thinkin Bout You', 'Frank Ocean'],
    ['Pyramids', 'Frank Ocean'], ['Nikes', 'Frank Ocean'], ['Best Part', 'H.E.R.'],
    ['Truth Hurts', 'Lizzo'], ['Good as Hell', 'Lizzo'], ['Juice', 'Lizzo'],
    ['Tempo', 'Lizzo'], ['Make Me Feel', 'Janelle Monáe'],
  ],
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

async function findSong(title, artist) {
  const term = `${title} ${artist}`;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=10&country=US`;
  let j = null;
  for (let attempt = 0; attempt < 4 && !j; attempt++) {
    if (attempt) await sleep(700 * attempt);
    j = await getJson(url);
  }
  const t = norm(title);
  const a = norm(artist);
  const cands = (j?.results || []).filter((x) => x.previewUrl && x.kind === 'song');
  // Best: artist matches and track contains title
  const hit =
    cands.find((x) => norm(x.artistName) === a && norm(x.trackName).startsWith(t)) ||
    cands.find((x) => norm(x.artistName) === a) ||
    cands.find((x) => norm(x.trackName).startsWith(t));
  return hit ? { previewUrl: hit.previewUrl, trackName: hit.trackName, artistName: hit.artistName } : null;
}

async function findTv(show) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(show)}&entity=tvEpisode&limit=50&country=US`;
  let j = null;
  for (let attempt = 0; attempt < 4 && !j; attempt++) {
    if (attempt) await sleep(700 * attempt);
    j = await getJson(url);
  }
  const target = norm(show);
  const cands = (j?.results || []).filter((x) => {
    if (!x.previewUrl) return false;
    const a = norm(x.artistName || '');
    const c = norm(x.collectionName || '');
    return a === target || a.startsWith(target + ' ') || c.startsWith(target + ' ') || c === target;
  });
  const hit = cands.find((x) => norm(x.artistName) === target) || cands[0];
  return hit ? { previewUrl: hit.previewUrl } : null;
}

const sitcomRow = (title, url) =>
  `      { q: 'Watch the clip — name the sitcom.', a: ${JSON.stringify(title)}, video: ${JSON.stringify(url)}, category: 'screen', difficulty: 2 },`;
const songRow = (title, artist, url) =>
  `      { q: 'Listen to the clip — name the song.', a: ${JSON.stringify(title)}, audio: ${JSON.stringify(url)}, alt: ${JSON.stringify([norm(`${title} ${artist}`)])}, category: 'music', difficulty: 2 },`;

function packLiteral(varName, id, name, desc, emoji, accent, difficulty, rows) {
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
${rows.join('\n')}
    ],
  },
};
`;
}

// --- run ---
const out = {
  sitcoms: [],
  music: {},
};

async function runSitcoms() {
  for (const [tier, shows] of [
    ['easy', SITCOMS_EASY],
    ['medium', SITCOMS_MEDIUM],
    ['hard', SITCOMS_HARD],
  ]) {
    const kept = [];
    const seen = new Set();
    for (const show of shows) {
      const k = norm(show);
      if (seen.has(k)) continue;
      seen.add(k);
      const hit = await findTv(show);
      if (hit) kept.push({ title: show, url: hit.previewUrl });
      else console.log(`  ❌ sitcom-${tier}: ${show}`);
      await sleep(350);
    }
    console.log(`  [sitcoms-${tier}] kept ${kept.length}/${shows.length}`);
    out.sitcoms.push({ tier, kept });
  }
}

async function runMusic() {
  for (const [packKey, songs] of Object.entries(MUSIC)) {
    const kept = [];
    const seen = new Set();
    for (const [title, artist] of songs) {
      const k = `${norm(title)}|${norm(artist)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const hit = await findSong(title, artist);
      if (hit) kept.push({ title, artist, url: hit.previewUrl });
      else console.log(`  ❌ music-${packKey}: ${title} - ${artist}`);
      await sleep(350);
    }
    console.log(`  [music-${packKey}] kept ${kept.length}/${songs.length}`);
    out.music[packKey] = kept;
  }
}

console.log('=== SITCOMS (iTunes tvEpisode previews) ===');
await runSitcoms();
console.log('=== MUSIC (iTunes song previews) ===');
await runMusic();

// Write sitcom clips file
const sitcomTiers = out.sitcoms;
const sitcomFile = `// AUTO-GENERATED by scripts/genClipsAll.mjs — do not hand-edit.
// Sitcom clip packs — real iTunes tvEpisode preview clips (.m4v), hotlinked.
import type { RawPack } from '../core/packs';

${packLiteral('sitcomsEasyClipsPack', 'sitcoms-easy-clips', 'Sitcoms · Clips Easy',
  'Watch a real episode clip and name the mainstream sitcom.', '📺', '#f59e0b', 'easy',
  sitcomTiers[0].kept.map(k => sitcomRow(k.title, k.url)))}
${packLiteral('sitcomsMediumClipsPack', 'sitcoms-medium-clips', 'Sitcoms · Clips Medium',
  'Name the critically-acclaimed comedy from a real episode clip.', '📺', '#d97706', 'medium',
  sitcomTiers[1].kept.map(k => sitcomRow(k.title, k.url)))}
${packLiteral('sitcomsHardClipsPack', 'sitcoms-hard-clips', 'Sitcoms · Clips Hard',
  'Deep-cut and classic sitcoms — name the show from a real episode clip.', '📺', '#b45309', 'hard',
  sitcomTiers[2].kept.map(k => sitcomRow(k.title, k.url)))}
`;
await writeFile(new URL('../src/content/sitcomsClips.ts', import.meta.url), sitcomFile, 'utf8');
console.log('Wrote src/content/sitcomsClips.ts');

// Write music clips file
const musicTiers = [
  ['80s-pop', '80s Pop · Clips', '#ec4899', 'medium'],
  ['80s-rock', '80s Rock · Clips', '#dc2626', 'medium'],
  ['90s-pop', '90s Pop · Clips', '#e11d48', 'medium'],
  ['90s-hiphop', '90s Hip-Hop · Clips', '#0f172a', 'medium'],
  ['90s-alt', '90s Grunge & Alt · Clips', '#475569', 'medium'],
  ['90s-rnb', '90s R&B · Clips', '#7c3aed', 'medium'],
  ['00s-pop', '2000s Pop & Rock · Clips', '#0ea5e9', 'medium'],
  ['00s-hiphop', '2000s Hip-Hop & R&B · Clips', '#7c3aed', 'medium'],
  ['10s-pop', '2010s Pop & EDM · Clips', '#06b6d4', 'medium'],
  ['10s-hiphop', '2010s Hip-Hop & R&B · Clips', '#f97316', 'medium'],
];
const musicLiterals = musicTiers.map(([key, name, accent, diff]) => {
  const kept = out.music[key] || [];
  const varName = `music${key.replace(/-/g, '').replace(/^./, c => c.toUpperCase())}ClipsPack`;
  return packLiteral(varName, `music-${key}-clips`, name,
    `Listen to the preview clip and name the ${key.includes('hiphop') ? 'hip-hop track' : key.includes('rock') ? 'rock track' : key.includes('rnb') ? 'R&B track' : key.includes('alt') ? 'alt/grunge track' : 'pop track'}.`,
    '🎵', accent, diff,
    kept.map(k => songRow(k.title, k.artist, k.url)));
});
const musicFile = `// AUTO-GENERATED by scripts/genClipsAll.mjs — do not hand-edit.
// Music decade clip packs — real iTunes 30-second song previews (.m4a), hotlinked.
import type { RawPack } from '../core/packs';

${musicLiterals.join('\n')}
`;
await writeFile(new URL('../src/content/musicDecadeClips.ts', import.meta.url), musicFile, 'utf8');
console.log('Wrote src/content/musicDecadeClips.ts');

const totals = {
  sitcoms: out.sitcoms.reduce((s, t) => s + t.kept.length, 0),
  music: Object.values(out.music).reduce((s, k) => s + k.length, 0),
};
console.log('TOTALS:', totals);
