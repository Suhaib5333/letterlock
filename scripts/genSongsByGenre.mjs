// Genre-based "Guess the Song" packs — same iTunes-preview approach as the
// existing `songs` pack but split by genre so players who love one style can
// drill in. We curate ~250 [title, artist] candidates per genre and keep
// whatever iTunes returns a working preview for.
//
// Run:  node scripts/genSongsByGenre.mjs
// Outputs: src/content/songsByGenre.ts (4 packs)

import { writeFile } from 'node:fs/promises';

const GENRES = {
  rock: {
    name: 'Songs · Rock',
    desc: 'Classic rock, hard rock, alternative — listen and name the track.',
    accent: '#dc2626',
    songs: [
      // Classic rock canon
      ['Hotel California', 'Eagles'], ['Take It Easy', 'Eagles'], ['Stairway to Heaven', 'Led Zeppelin'],
      ['Whole Lotta Love', 'Led Zeppelin'], ['Black Dog', 'Led Zeppelin'], ['Rock and Roll', 'Led Zeppelin'],
      ['Kashmir', 'Led Zeppelin'], ['Immigrant Song', 'Led Zeppelin'], ['Bohemian Rhapsody', 'Queen'],
      ['Don\'t Stop Me Now', 'Queen'], ['We Will Rock You', 'Queen'], ['We Are the Champions', 'Queen'],
      ['Another One Bites the Dust', 'Queen'], ['Under Pressure', 'Queen'], ['Somebody to Love', 'Queen'],
      ['Killer Queen', 'Queen'], ['Radio Ga Ga', 'Queen'], ['I Want to Break Free', 'Queen'],
      ['Smoke on the Water', 'Deep Purple'], ['Highway Star', 'Deep Purple'], ['Child in Time', 'Deep Purple'],
      ['Free Bird', 'Lynyrd Skynyrd'], ['Sweet Home Alabama', 'Lynyrd Skynyrd'], ['Simple Man', 'Lynyrd Skynyrd'],
      ['Carry On Wayward Son', 'Kansas'], ['Dust in the Wind', 'Kansas'], ['More Than a Feeling', 'Boston'],
      ['Long Time', 'Boston'], ['Don\'t Look Back', 'Boston'],
      // AC/DC
      ['Back in Black', 'AC/DC'], ['Highway to Hell', 'AC/DC'], ['Thunderstruck', 'AC/DC'],
      ['You Shook Me All Night Long', 'AC/DC'], ['T.N.T.', 'AC/DC'], ['Hells Bells', 'AC/DC'],
      ['Whole Lotta Rosie', 'AC/DC'], ['Dirty Deeds Done Dirt Cheap', 'AC/DC'],
      // Bon Jovi
      ['Livin\' on a Prayer', 'Bon Jovi'], ['You Give Love a Bad Name', 'Bon Jovi'], ['Wanted Dead or Alive', 'Bon Jovi'],
      ['Bad Medicine', 'Bon Jovi'], ['It\'s My Life', 'Bon Jovi'], ['Always', 'Bon Jovi'],
      ['Have a Nice Day', 'Bon Jovi'],
      // Def Leppard
      ['Pour Some Sugar on Me', 'Def Leppard'], ['Photograph', 'Def Leppard'], ['Hysteria', 'Def Leppard'],
      ['Animal', 'Def Leppard'], ['Love Bites', 'Def Leppard'], ['Rock of Ages', 'Def Leppard'],
      // Guns N' Roses
      ['Welcome to the Jungle', "Guns N' Roses"], ['Sweet Child o\' Mine', "Guns N' Roses"],
      ['Paradise City', "Guns N' Roses"], ['November Rain', "Guns N' Roses"], ['Patience', "Guns N' Roses"],
      ['Don\'t Cry', "Guns N' Roses"], ['Knockin\' on Heaven\'s Door', "Guns N' Roses"],
      ['Civil War', "Guns N' Roses"],
      // Aerosmith
      ['Dream On', 'Aerosmith'], ['Walk This Way', 'Aerosmith'], ['Sweet Emotion', 'Aerosmith'],
      ['Janie\'s Got a Gun', 'Aerosmith'], ['Cryin\'', 'Aerosmith'], ['Crazy', 'Aerosmith'],
      ['Don\'t Want to Miss a Thing', 'Aerosmith'], ['Love in an Elevator', 'Aerosmith'],
      // Metallica
      ['Enter Sandman', 'Metallica'], ['Nothing Else Matters', 'Metallica'], ['Master of Puppets', 'Metallica'],
      ['One', 'Metallica'], ['Fade to Black', 'Metallica'], ['For Whom the Bell Tolls', 'Metallica'],
      ['Sad but True', 'Metallica'], ['The Unforgiven', 'Metallica'], ['Battery', 'Metallica'],
      // Van Halen
      ['Jump', 'Van Halen'], ['Panama', 'Van Halen'], ['Eruption', 'Van Halen'],
      ['Hot for Teacher', 'Van Halen'], ['Why Can\'t This Be Love', 'Van Halen'], ['Right Now', 'Van Halen'],
      // The Beatles
      ['Hey Jude', 'The Beatles'], ['Let It Be', 'The Beatles'], ['Yesterday', 'The Beatles'],
      ['Come Together', 'The Beatles'], ['Here Comes the Sun', 'The Beatles'], ['A Day in the Life', 'The Beatles'],
      ['Something', 'The Beatles'], ['Help!', 'The Beatles'], ['Twist and Shout', 'The Beatles'],
      ['Eleanor Rigby', 'The Beatles'], ['While My Guitar Gently Weeps', 'The Beatles'],
      // The Rolling Stones
      ['Paint It Black', 'The Rolling Stones'], ['(I Can\'t Get No) Satisfaction', 'The Rolling Stones'],
      ['Sympathy for the Devil', 'The Rolling Stones'], ['Gimme Shelter', 'The Rolling Stones'],
      ['Brown Sugar', 'The Rolling Stones'], ['Start Me Up', 'The Rolling Stones'], ['Angie', 'The Rolling Stones'],
      ['Wild Horses', 'The Rolling Stones'],
      // The Who, Springsteen, Petty
      ['Baba O\'Riley', 'The Who'], ['Won\'t Get Fooled Again', 'The Who'], ['My Generation', 'The Who'],
      ['Pinball Wizard', 'The Who'], ['Born in the U.S.A.', 'Bruce Springsteen'], ['Born to Run', 'Bruce Springsteen'],
      ['Dancing in the Dark', 'Bruce Springsteen'], ['Streets of Philadelphia', 'Bruce Springsteen'],
      ['Free Fallin\'', 'Tom Petty'], ['American Girl', 'Tom Petty'], ['Learning to Fly', 'Tom Petty'],
      // Pink Floyd
      ['Comfortably Numb', 'Pink Floyd'], ['Another Brick in the Wall', 'Pink Floyd'], ['Wish You Were Here', 'Pink Floyd'],
      ['Money', 'Pink Floyd'], ['Time', 'Pink Floyd'], ['Shine On You Crazy Diamond', 'Pink Floyd'],
      ['Hey You', 'Pink Floyd'], ['Run Like Hell', 'Pink Floyd'],
      // Alt / 90s rock
      ['Smells Like Teen Spirit', 'Nirvana'], ['Come as You Are', 'Nirvana'], ['Heart-Shaped Box', 'Nirvana'],
      ['Lithium', 'Nirvana'], ['In Bloom', 'Nirvana'], ['All Apologies', 'Nirvana'],
      ['Black', 'Pearl Jam'], ['Alive', 'Pearl Jam'], ['Jeremy', 'Pearl Jam'],
      ['Better Man', 'Pearl Jam'], ['Even Flow', 'Pearl Jam'],
      ['Black Hole Sun', 'Soundgarden'], ['Spoonman', 'Soundgarden'], ['Outshined', 'Soundgarden'],
      ['Man in the Box', 'Alice in Chains'], ['Would?', 'Alice in Chains'],
      ['Plush', 'Stone Temple Pilots'], ['Interstate Love Song', 'Stone Temple Pilots'],
      ['Glycerine', 'Bush'], ['Comedown', 'Bush'],
      ['1979', 'The Smashing Pumpkins'], ['Tonight, Tonight', 'The Smashing Pumpkins'],
      ['Bullet with Butterfly Wings', 'The Smashing Pumpkins'], ['Today', 'The Smashing Pumpkins'],
      ['Buddy Holly', 'Weezer'], ['Say It Ain\'t So', 'Weezer'], ['Hash Pipe', 'Weezer'],
      ['Wonderwall', 'Oasis'], ['Champagne Supernova', 'Oasis'], ['Don\'t Look Back in Anger', 'Oasis'],
      ['Live Forever', 'Oasis'],
      // Foo Fighters, RHCP, RATM
      ['Everlong', 'Foo Fighters'], ['Monkey Wrench', 'Foo Fighters'], ['Best of You', 'Foo Fighters'],
      ['My Hero', 'Foo Fighters'], ['Learn to Fly', 'Foo Fighters'], ['The Pretender', 'Foo Fighters'],
      ['Times Like These', 'Foo Fighters'],
      ['Californication', 'Red Hot Chili Peppers'], ['Under the Bridge', 'Red Hot Chili Peppers'],
      ['Scar Tissue', 'Red Hot Chili Peppers'], ['Otherside', 'Red Hot Chili Peppers'],
      ['Snow (Hey Oh)', 'Red Hot Chili Peppers'], ['By the Way', 'Red Hot Chili Peppers'],
      ['Killing in the Name', 'Rage Against the Machine'], ['Bulls on Parade', 'Rage Against the Machine'],
      // Indie rock / 2000s
      ['Seven Nation Army', 'The White Stripes'], ['Fell in Love with a Girl', 'The White Stripes'],
      ['Mr. Brightside', 'The Killers'], ['Somebody Told Me', 'The Killers'],
      ['When You Were Young', 'The Killers'], ['Read My Mind', 'The Killers'],
      ['Pumped Up Kicks', 'Foster the People'], ['Take Me Out', 'Franz Ferdinand'],
      ['Last Nite', 'The Strokes'], ['Reptilia', 'The Strokes'],
      ['Feel Good Inc.', 'Gorillaz'], ['Clint Eastwood', 'Gorillaz'],
      ['Boulevard of Broken Dreams', 'Green Day'], ['American Idiot', 'Green Day'],
      ['Basket Case', 'Green Day'], ['When I Come Around', 'Green Day'],
      ['Wake Me Up When September Ends', 'Green Day'], ['21 Guns', 'Green Day'],
      ['Good Riddance', 'Green Day'],
      // U2
      ['One', 'U2'], ['With or Without You', 'U2'], ['Sunday Bloody Sunday', 'U2'],
      ['Where the Streets Have No Name', 'U2'], ['I Still Haven\'t Found What I\'m Looking For', 'U2'],
      ['Beautiful Day', 'U2'], ['Vertigo', 'U2'], ['Pride (In the Name of Love)', 'U2'],
      // More
      ['Eye of the Tiger', 'Survivor'], ['Don\'t Stop Believin\'', 'Journey'], ['Open Arms', 'Journey'],
      ['Faithfully', 'Journey'], ['Any Way You Want It', 'Journey'],
      ['Eye in the Sky', 'The Alan Parsons Project'], ['Carry On Wayward Son', 'Kansas'],
      ['Dust in the Wind', 'Kansas'],
      ['Living Loving Maid', 'Led Zeppelin'], ['When the Levee Breaks', 'Led Zeppelin'],
      ['Tom Sawyer', 'Rush'], ['Limelight', 'Rush'], ['YYZ', 'Rush'],
      // Tom Morello / Audioslave
      ['Like a Stone', 'Audioslave'], ['Show Me How to Live', 'Audioslave'], ['Cochise', 'Audioslave'],
      // Iron Maiden
      ['Run to the Hills', 'Iron Maiden'], ['The Trooper', 'Iron Maiden'], ['Fear of the Dark', 'Iron Maiden'],
      // Black Sabbath
      ['Iron Man', 'Black Sabbath'], ['Paranoid', 'Black Sabbath'], ['War Pigs', 'Black Sabbath'],
      // Crosby Stills Nash
      ['Suite: Judy Blue Eyes', 'Crosby, Stills & Nash'], ['Teach Your Children', 'Crosby, Stills, Nash & Young'],
      // Dire Straits
      ['Money for Nothing', 'Dire Straits'], ['Sultans of Swing', 'Dire Straits'],
      // ZZ Top
      ['Sharp Dressed Man', 'ZZ Top'], ['Legs', 'ZZ Top'], ['Gimme All Your Lovin\'', 'ZZ Top'],
      // Police
      ['Every Breath You Take', 'The Police'], ['Roxanne', 'The Police'], ['Message in a Bottle', 'The Police'],
      ['Don\'t Stand So Close to Me', 'The Police'], ['Walking on the Moon', 'The Police'],
      // INXS / Cars
      ['Need You Tonight', 'INXS'], ['Never Tear Us Apart', 'INXS'], ['New Sensation', 'INXS'],
      ['Just What I Needed', 'The Cars'], ['Drive', 'The Cars'],
      // Heart, Pat Benatar
      ['Barracuda', 'Heart'], ['Alone', 'Heart'], ['What About Love', 'Heart'],
      ['Hit Me with Your Best Shot', 'Pat Benatar'], ['Love Is a Battlefield', 'Pat Benatar'],
      // Springsteen Glory
      ['Glory Days', 'Bruce Springsteen'], ['Thunder Road', 'Bruce Springsteen'], ['The Rising', 'Bruce Springsteen'],
      // Cure / Smiths / Joy Div
      ['Lovesong', 'The Cure'], ['Friday I\'m in Love', 'The Cure'], ['Just Like Heaven', 'The Cure'],
      ['How Soon Is Now?', 'The Smiths'], ['This Charming Man', 'The Smiths'],
      ['Love Will Tear Us Apart', 'Joy Division'],
      // Coldplay rock
      ['Clocks', 'Coldplay'], ['Yellow', 'Coldplay'], ['Viva la Vida', 'Coldplay'],
      ['The Scientist', 'Coldplay'], ['Fix You', 'Coldplay'],
      // Misc
      ['Mr. Jones', 'Counting Crows'], ['Round Here', 'Counting Crows'],
      ['Iris', 'Goo Goo Dolls'], ['Slide', 'Goo Goo Dolls'], ['Name', 'Goo Goo Dolls'],
      ['Semi-Charmed Life', 'Third Eye Blind'], ['Jumper', 'Third Eye Blind'],
      ['Sex and Candy', 'Marcy Playground'], ['Closing Time', 'Semisonic'],
      ['You Get What You Give', 'New Radicals'], ['Two Princes', 'Spin Doctors'],
      ['Black Velvet', 'Alannah Myles'], ['Linger', 'The Cranberries'], ['Zombie', 'The Cranberries'],
      ['Dreams', 'The Cranberries'],
      ['Pumped Up Kicks', 'Foster the People'], ['Tighten Up', 'The Black Keys'],
      ['Lonely Boy', 'The Black Keys'], ['Gold on the Ceiling', 'The Black Keys'],
      ['Howlin\' for You', 'The Black Keys'],
      ['Float On', 'Modest Mouse'], ['Dashboard', 'Modest Mouse'],
      ['Hey Ya!', 'OutKast'], // Pop-rock crossover acceptable
    ],
  },
  pop: {
    name: 'Songs · Pop',
    desc: 'Mainstream pop across decades — listen and name the track.',
    accent: '#ec4899',
    songs: [
      // Madonna
      ['Like a Virgin', 'Madonna'], ['Material Girl', 'Madonna'], ['Like a Prayer', 'Madonna'],
      ['Vogue', 'Madonna'], ['Express Yourself', 'Madonna'], ['Papa Don\'t Preach', 'Madonna'],
      ['Hung Up', 'Madonna'], ['Music', 'Madonna'], ['Ray of Light', 'Madonna'],
      // Michael Jackson
      ['Thriller', 'Michael Jackson'], ['Billie Jean', 'Michael Jackson'], ['Beat It', 'Michael Jackson'],
      ['Bad', 'Michael Jackson'], ['Smooth Criminal', 'Michael Jackson'], ['Man in the Mirror', 'Michael Jackson'],
      ['Black or White', 'Michael Jackson'], ['Don\'t Stop \'Til You Get Enough', 'Michael Jackson'],
      ['Rock with You', 'Michael Jackson'], ['The Way You Make Me Feel', 'Michael Jackson'],
      ['Remember the Time', 'Michael Jackson'],
      // Whitney
      ['I Will Always Love You', 'Whitney Houston'], ['I Wanna Dance with Somebody', 'Whitney Houston'],
      ['Greatest Love of All', 'Whitney Houston'], ['How Will I Know', 'Whitney Houston'],
      ['I Have Nothing', 'Whitney Houston'],
      // Mariah, Celine, Adele
      ['Hero', 'Mariah Carey'], ['Vision of Love', 'Mariah Carey'], ['Always Be My Baby', 'Mariah Carey'],
      ['Fantasy', 'Mariah Carey'], ['Honey', 'Mariah Carey'], ['We Belong Together', 'Mariah Carey'],
      ['Touch My Body', 'Mariah Carey'],
      ['My Heart Will Go On', 'Celine Dion'], ['Because You Loved Me', 'Celine Dion'],
      ['The Power of Love', 'Celine Dion'], ['All by Myself', 'Celine Dion'],
      ['Rolling in the Deep', 'Adele'], ['Someone Like You', 'Adele'], ['Set Fire to the Rain', 'Adele'],
      ['Hello', 'Adele'], ['Skyfall', 'Adele'], ['When We Were Young', 'Adele'], ['Easy on Me', 'Adele'],
      // Taylor Swift
      ['Shake It Off', 'Taylor Swift'], ['Blank Space', 'Taylor Swift'], ['Bad Blood', 'Taylor Swift'],
      ['Wildest Dreams', 'Taylor Swift'], ['Look What You Made Me Do', 'Taylor Swift'],
      ['Style', 'Taylor Swift'], ['You Belong with Me', 'Taylor Swift'], ['Love Story', 'Taylor Swift'],
      ['Anti-Hero', 'Taylor Swift'], ['Cardigan', 'Taylor Swift'], ['ME!', 'Taylor Swift'],
      // Ariana, Katy, Gaga
      ['Problem', 'Ariana Grande'], ['Bang Bang', 'Ariana Grande'], ['Thank U, Next', 'Ariana Grande'],
      ['7 Rings', 'Ariana Grande'], ['Side to Side', 'Ariana Grande'], ['No Tears Left to Cry', 'Ariana Grande'],
      ['Dangerous Woman', 'Ariana Grande'], ['Into You', 'Ariana Grande'], ['God Is a Woman', 'Ariana Grande'],
      ['Firework', 'Katy Perry'], ['Roar', 'Katy Perry'], ['Dark Horse', 'Katy Perry'],
      ['Teenage Dream', 'Katy Perry'], ['California Gurls', 'Katy Perry'], ['I Kissed a Girl', 'Katy Perry'],
      ['Last Friday Night', 'Katy Perry'], ['Hot N Cold', 'Katy Perry'],
      ['Bad Romance', 'Lady Gaga'], ['Poker Face', 'Lady Gaga'], ['Just Dance', 'Lady Gaga'],
      ['Born This Way', 'Lady Gaga'], ['Applause', 'Lady Gaga'], ['Shallow', 'Lady Gaga'],
      ['Paparazzi', 'Lady Gaga'], ['Telephone', 'Lady Gaga'],
      // Britney, Christina, NSYNC, BSB
      ['...Baby One More Time', 'Britney Spears'], ['Toxic', 'Britney Spears'], ['Oops!... I Did It Again', 'Britney Spears'],
      ['Stronger', 'Britney Spears'], ['Womanizer', 'Britney Spears'], ['Gimme More', 'Britney Spears'],
      ['Genie in a Bottle', 'Christina Aguilera'], ['Beautiful', 'Christina Aguilera'], ['Dirrty', 'Christina Aguilera'],
      ['I Want It That Way', 'Backstreet Boys'], ['Everybody', 'Backstreet Boys'], ['Larger Than Life', 'Backstreet Boys'],
      ['Bye Bye Bye', 'NSYNC'], ['Tearin\' Up My Heart', 'NSYNC'], ['It\'s Gonna Be Me', 'NSYNC'],
      // Spice Girls
      ['Wannabe', 'Spice Girls'], ['Say You\'ll Be There', 'Spice Girls'], ['2 Become 1', 'Spice Girls'],
      ['Stop', 'Spice Girls'], ['Spice Up Your Life', 'Spice Girls'],
      // Ed Sheeran, Bruno Mars
      ['Shape of You', 'Ed Sheeran'], ['Thinking Out Loud', 'Ed Sheeran'], ['Photograph', 'Ed Sheeran'],
      ['Perfect', 'Ed Sheeran'], ['Castle on the Hill', 'Ed Sheeran'], ['Bad Habits', 'Ed Sheeran'],
      ['Galway Girl', 'Ed Sheeran'], ['Happier', 'Ed Sheeran'],
      ['Uptown Funk', 'Mark Ronson'], ['Just the Way You Are', 'Bruno Mars'], ['Grenade', 'Bruno Mars'],
      ['Locked Out of Heaven', 'Bruno Mars'], ['When I Was Your Man', 'Bruno Mars'], ['Treasure', 'Bruno Mars'],
      ['24K Magic', 'Bruno Mars'], ['Marry You', 'Bruno Mars'], ['That\'s What I Like', 'Bruno Mars'],
      // Beyoncé / Rihanna
      ['Crazy in Love', 'Beyoncé'], ['Single Ladies', 'Beyoncé'], ['Halo', 'Beyoncé'], ['Irreplaceable', 'Beyoncé'],
      ['Drunk in Love', 'Beyoncé'], ['Formation', 'Beyoncé'], ['Run the World (Girls)', 'Beyoncé'],
      ['Umbrella', 'Rihanna'], ['Diamonds', 'Rihanna'], ['We Found Love', 'Rihanna'], ['Only Girl', 'Rihanna'],
      ['What\'s My Name?', 'Rihanna'], ['Don\'t Stop the Music', 'Rihanna'], ['Disturbia', 'Rihanna'],
      ['Take a Bow', 'Rihanna'],
      // 80s pop
      ['Take On Me', 'a-ha'], ['Sweet Dreams', 'Eurythmics'], ['Karma Chameleon', 'Culture Club'],
      ['Girls Just Want to Have Fun', 'Cyndi Lauper'], ['Time After Time', 'Cyndi Lauper'],
      ['Careless Whisper', 'George Michael'], ['Faith', 'George Michael'], ['Wake Me Up Before You Go-Go', 'Wham!'],
      ['1999', 'Prince'], ['Purple Rain', 'Prince'], ['When Doves Cry', 'Prince'], ['Kiss', 'Prince'],
      ['Hungry Like the Wolf', 'Duran Duran'], ['Rio', 'Duran Duran'],
      ['Africa', 'Toto'], ['Rosanna', 'Toto'], ['Don\'t You', 'Simple Minds'],
      ['Tainted Love', 'Soft Cell'],
      // 2010s pop
      ['Royals', 'Lorde'], ['Team', 'Lorde'], ['Green Light', 'Lorde'],
      ['Counting Stars', 'OneRepublic'], ['Apologize', 'OneRepublic'],
      ['Stay With Me', 'Sam Smith'], ['Too Good at Goodbyes', 'Sam Smith'],
      ['Take Me to Church', 'Hozier'],
      ['Believer', 'Imagine Dragons'], ['Thunder', 'Imagine Dragons'], ['Demons', 'Imagine Dragons'],
      ['Radioactive', 'Imagine Dragons'], ['Natural', 'Imagine Dragons'],
      ['Stressed Out', 'Twenty One Pilots'], ['Heathens', 'Twenty One Pilots'], ['Ride', 'Twenty One Pilots'],
      ['Cheerleader', 'OMI'], ['Despacito', 'Luis Fonsi'],
      ['Closer', 'The Chainsmokers'], ['Something Just Like This', 'The Chainsmokers'],
      ['Wake Me Up', 'Avicii'], ['Levels', 'Avicii'], ['Hey Brother', 'Avicii'],
      // Coldplay pop side
      ['Adventure of a Lifetime', 'Coldplay'], ['A Sky Full of Stars', 'Coldplay'], ['Paradise', 'Coldplay'],
      ['Hymn for the Weekend', 'Coldplay'],
      // Sia
      ['Chandelier', 'Sia'], ['Cheap Thrills', 'Sia'], ['Elastic Heart', 'Sia'],
      // Maroon 5
      ['Sugar', 'Maroon 5'], ['Memories', 'Maroon 5'], ['Girls Like You', 'Maroon 5'],
      ['Moves Like Jagger', 'Maroon 5'], ['Maps', 'Maroon 5'], ['She Will Be Loved', 'Maroon 5'],
      ['This Love', 'Maroon 5'], ['Payphone', 'Maroon 5'],
      // The Weeknd
      ['Blinding Lights', 'The Weeknd'], ['Starboy', 'The Weeknd'], ['Can\'t Feel My Face', 'The Weeknd'],
      ['Save Your Tears', 'The Weeknd'], ['I Feel It Coming', 'The Weeknd'], ['The Hills', 'The Weeknd'],
      ['Earned It', 'The Weeknd'],
      // Bieber
      ['Sorry', 'Justin Bieber'], ['Love Yourself', 'Justin Bieber'], ['What Do You Mean?', 'Justin Bieber'],
      ['Boyfriend', 'Justin Bieber'],
      // One Direction
      ['What Makes You Beautiful', 'One Direction'], ['Best Song Ever', 'One Direction'],
      ['Story of My Life', 'One Direction'], ['Night Changes', 'One Direction'], ['Drag Me Down', 'One Direction'],
      // Harry Styles
      ['Sign of the Times', 'Harry Styles'], ['Watermelon Sugar', 'Harry Styles'], ['Adore You', 'Harry Styles'],
      ['As It Was', 'Harry Styles'],
      // Dua Lipa
      ['New Rules', 'Dua Lipa'], ['Don\'t Start Now', 'Dua Lipa'], ['Levitating', 'Dua Lipa'],
      ['IDGAF', 'Dua Lipa'], ['One Kiss', 'Calvin Harris'],
      // ABBA, oldies
      ['Dancing Queen', 'ABBA'], ['Mamma Mia', 'ABBA'], ['Waterloo', 'ABBA'], ['Take a Chance on Me', 'ABBA'],
      ['Money, Money, Money', 'ABBA'], ['Gimme! Gimme! Gimme!', 'ABBA'], ['SOS', 'ABBA'],
      // Misc 2000s
      ['Mr. Brightside', 'The Killers'], ['Don\'t Stop the Music', 'Rihanna'],
      ['Toxic', 'Britney Spears'], ['Crazy', 'Gnarls Barkley'],
      ['Bleeding Love', 'Leona Lewis'], ['Just Dance', 'Lady Gaga'],
      // Misc
      ['Smile', 'Lily Allen'], ['Bad Day', 'Daniel Powter'], ['Apologize', 'OneRepublic'],
      ['Don\'t Speak', 'No Doubt'], ['Just a Girl', 'No Doubt'],
      ['I\'m Yours', 'Jason Mraz'], ['I Won\'t Give Up', 'Jason Mraz'],
      ['Hey, Soul Sister', 'Train'], ['Drops of Jupiter', 'Train'],
      // Country crossover (it's all pop now)
      ['Cruise', 'Florida Georgia Line'], ['Body Like a Back Road', 'Sam Hunt'],
    ],
  },
  hiphop: {
    name: 'Songs · Hip-Hop & Rap',
    desc: 'Rap classics and modern hip-hop hits — listen and name the track.',
    accent: '#0f172a',
    songs: [
      // Eminem
      ['Lose Yourself', 'Eminem'], ['Without Me', 'Eminem'], ['The Real Slim Shady', 'Eminem'],
      ['Stan', 'Eminem'], ['Not Afraid', 'Eminem'], ['Love the Way You Lie', 'Eminem'],
      ['Cleanin\' Out My Closet', 'Eminem'], ['Mockingbird', 'Eminem'], ['Like Toy Soldiers', 'Eminem'],
      ['When I\'m Gone', 'Eminem'], ['Rap God', 'Eminem'], ['Sing for the Moment', 'Eminem'],
      ['My Name Is', 'Eminem'], ['Berzerk', 'Eminem'],
      // 50 Cent
      ['In Da Club', '50 Cent'], ['21 Questions', '50 Cent'], ['P.I.M.P.', '50 Cent'],
      ['Candy Shop', '50 Cent'], ['Many Men', '50 Cent'], ['Just a Lil Bit', '50 Cent'],
      // Jay-Z
      ['99 Problems', 'Jay-Z'], ['Empire State of Mind', 'Jay-Z'], ['Big Pimpin\'', 'Jay-Z'],
      ['Hard Knock Life', 'Jay-Z'], ['Can I Get A...', 'Jay-Z'], ['Izzo (H.O.V.A.)', 'Jay-Z'],
      ['Run This Town', 'Jay-Z'], ['Holy Grail', 'Jay-Z'], ['Dirt Off Your Shoulder', 'Jay-Z'],
      // Kanye
      ['Stronger', 'Kanye West'], ['Heartless', 'Kanye West'], ['Gold Digger', 'Kanye West'],
      ['Jesus Walks', 'Kanye West'], ['Through the Wire', 'Kanye West'], ['Touch the Sky', 'Kanye West'],
      ['Flashing Lights', 'Kanye West'], ['POWER', 'Kanye West'], ['Runaway', 'Kanye West'],
      ['All of the Lights', 'Kanye West'], ['Famous', 'Kanye West'], ['Bound 2', 'Kanye West'],
      // Drake
      ['Hotline Bling', 'Drake'], ['One Dance', 'Drake'], ['God\'s Plan', 'Drake'], ['In My Feelings', 'Drake'],
      ['Started from the Bottom', 'Drake'], ['Nice for What', 'Drake'], ['Take Care', 'Drake'],
      ['Best I Ever Had', 'Drake'], ['Headlines', 'Drake'], ['Nonstop', 'Drake'], ['Toosie Slide', 'Drake'],
      // Kendrick
      ['HUMBLE.', 'Kendrick Lamar'], ['DNA.', 'Kendrick Lamar'], ['Alright', 'Kendrick Lamar'],
      ['King Kunta', 'Kendrick Lamar'], ['Money Trees', 'Kendrick Lamar'], ['Swimming Pools (Drank)', 'Kendrick Lamar'],
      ['LOYALTY.', 'Kendrick Lamar'], ['ELEMENT.', 'Kendrick Lamar'], ['i', 'Kendrick Lamar'],
      // 2Pac, Biggie
      ['California Love', '2Pac'], ['Changes', '2Pac'], ['Dear Mama', '2Pac'], ['Hit \'Em Up', '2Pac'],
      ['I Get Around', '2Pac'], ['Keep Ya Head Up', '2Pac'], ['Hail Mary', '2Pac'],
      ['Juicy', 'The Notorious B.I.G.'], ['Hypnotize', 'The Notorious B.I.G.'], ['Big Poppa', 'The Notorious B.I.G.'],
      ['Mo Money Mo Problems', 'The Notorious B.I.G.'], ['One More Chance', 'The Notorious B.I.G.'],
      ['Going Back to Cali', 'The Notorious B.I.G.'],
      // Dr. Dre, Snoop
      ['Nuthin\' but a \'G\' Thang', 'Dr. Dre'], ['Still D.R.E.', 'Dr. Dre'], ['The Next Episode', 'Dr. Dre'],
      ['Gin and Juice', 'Snoop Dogg'], ['Drop It Like It\'s Hot', 'Snoop Dogg'], ['Who Am I (What\'s My Name)?', 'Snoop Dogg'],
      ['Beautiful', 'Snoop Dogg'], ['Young, Wild & Free', 'Snoop Dogg'],
      // Outkast
      ['Hey Ya!', 'OutKast'], ['Ms. Jackson', 'OutKast'], ['The Way You Move', 'OutKast'],
      ['Roses', 'OutKast'], ['So Fresh, So Clean', 'OutKast'], ['B.O.B.', 'OutKast'],
      // T.I., Lil Wayne, Nelly, Ludacris
      ['What You Know', 'T.I.'], ['Live Your Life', 'T.I.'], ['Whatever You Like', 'T.I.'],
      ['Dead and Gone', 'T.I.'], ['Bring \'Em Out', 'T.I.'],
      ['Lollipop', 'Lil Wayne'], ['A Milli', 'Lil Wayne'], ['Got Money', 'Lil Wayne'],
      ['Hot in Herre', 'Nelly'], ['Country Grammar', 'Nelly'], ['Dilemma', 'Nelly'],
      ['Ride wit Me', 'Nelly'], ['Grillz', 'Nelly'],
      ['Stand Up', 'Ludacris'], ['Move Bitch', 'Ludacris'], ['Money Maker', 'Ludacris'],
      // Wu-Tang
      ['C.R.E.A.M.', 'Wu-Tang Clan'], ['Protect Ya Neck', 'Wu-Tang Clan'], ['Triumph', 'Wu-Tang Clan'],
      // J. Cole, Lupe, Common
      ['No Role Modelz', 'J. Cole'], ['Middle Child', 'J. Cole'], ['Crooked Smile', 'J. Cole'],
      ['Power Trip', 'J. Cole'], ['Wet Dreamz', 'J. Cole'], ['ATM', 'J. Cole'],
      ['Superstar', 'Lupe Fiasco'], ['Kick, Push', 'Lupe Fiasco'],
      ['The Light', 'Common'],
      // Migos, Travis Scott, Future, Post Malone
      ['Bad and Boujee', 'Migos'], ['Walk It Talk It', 'Migos'], ['MotorSport', 'Migos'],
      ['T-Shirt', 'Migos'], ['Versace', 'Migos'],
      ['Sicko Mode', 'Travis Scott'], ['Goosebumps', 'Travis Scott'], ['Antidote', 'Travis Scott'],
      ['Stargazing', 'Travis Scott'], ['Highest in the Room', 'Travis Scott'],
      ['Mask Off', 'Future'], ['Low Life', 'Future'], ['Life Is Good', 'Future'],
      ['Sunflower', 'Post Malone'], ['Better Now', 'Post Malone'], ['Congratulations', 'Post Malone'],
      ['Rockstar', 'Post Malone'], ['White Iverson', 'Post Malone'], ['Circles', 'Post Malone'],
      ['Wow.', 'Post Malone'], ['Goodbyes', 'Post Malone'],
      // Nicki Minaj
      ['Anaconda', 'Nicki Minaj'], ['Super Bass', 'Nicki Minaj'], ['Starships', 'Nicki Minaj'],
      ['Pound the Alarm', 'Nicki Minaj'],
      // Cardi B, Doja, Megan, Lizzo
      ['Bodak Yellow', 'Cardi B'], ['I Like It', 'Cardi B'], ['Money', 'Cardi B'], ['WAP', 'Cardi B'],
      ['Say So', 'Doja Cat'], ['Kiss Me More', 'Doja Cat'], ['Streets', 'Doja Cat'],
      ['Savage', 'Megan Thee Stallion'], ['Body', 'Megan Thee Stallion'],
      ['Truth Hurts', 'Lizzo'], ['Good as Hell', 'Lizzo'], ['Juice', 'Lizzo'],
      // Lil Nas X, DaBaby, Roddy
      ['Old Town Road', 'Lil Nas X'], ['Industry Baby', 'Lil Nas X'], ['Panini', 'Lil Nas X'],
      ['Montero (Call Me by Your Name)', 'Lil Nas X'],
      ['Suge', 'DaBaby'], ['Bop', 'DaBaby'],
      ['The Box', 'Roddy Ricch'],
      // XXXTentacion, Juice WRLD
      ['Look at Me!', 'XXXTentacion'], ['SAD!', 'XXXTentacion'], ['Jocelyn Flores', 'XXXTentacion'],
      ['Moonlight', 'XXXTentacion'], ['Changes', 'XXXTentacion'], ['Falling Down', 'XXXTentacion'],
      ['Lucid Dreams', 'Juice WRLD'], ['All Girls Are the Same', 'Juice WRLD'], ['Robbery', 'Juice WRLD'],
      // Old school + crossovers
      ['Gangsta\'s Paradise', 'Coolio'], ['U Can\'t Touch This', 'MC Hammer'], ['2 Legit 2 Quit', 'MC Hammer'],
      ['Push It', 'Salt-N-Pepa'], ['Shoop', 'Salt-N-Pepa'], ['Whatta Man', 'Salt-N-Pepa'],
      ['Mama Said Knock You Out', 'LL Cool J'], ['Around the Way Girl', 'LL Cool J'],
      ['It Was a Good Day', 'Ice Cube'], ['You Know How We Do It', 'Ice Cube'],
      ['Doo Wop (That Thing)', 'Lauryn Hill'], ['Killing Me Softly', 'Fugees'], ['Ready or Not', 'Fugees'],
      ['Insane in the Brain', 'Cypress Hill'], ['Tha Crossroads', 'Bone Thugs-N-Harmony'],
      ['Jump Around', 'House of Pain'], ['Bust a Move', 'Young MC'], ['Wild Thing', 'Tone Loc'],
      // DMX, Busta, Method Man
      ['Ruff Ryders\' Anthem', 'DMX'], ['Party Up (Up in Here)', 'DMX'], ['X Gon\' Give It to Ya', 'DMX'],
      ['Woo Hah!!', 'Busta Rhymes'], ['Bring the Pain', 'Method Man'],
      // Akon, T-Pain, Flo Rida
      ['Smack That', 'Akon'], ['Don\'t Matter', 'Akon'], ['I Wanna Love You', 'Akon'],
      ['Buy U a Drank', 'T-Pain'], ['Bartender', 'T-Pain'],
      ['Low', 'Flo Rida'], ['Right Round', 'Flo Rida'], ['Whistle', 'Flo Rida'],
      ['Wild Ones', 'Flo Rida'], ['My House', 'Flo Rida'], ['Good Feeling', 'Flo Rida'],
      // Soulja Boy, Chris Brown
      ['Crank That (Soulja Boy)', 'Soulja Boy'], ['Kiss Me Thru the Phone', 'Soulja Boy'],
      // Ja Rule, Ashanti, Ja
      ['Always on Time', 'Ja Rule'], ['Foolish', 'Ashanti'],
      // Will Smith
      ['Gettin\' Jiggy wit It', 'Will Smith'], ['Miami', 'Will Smith'],
      // Ye / Kanye late
      ['Closed on Sunday', 'Kanye West'], ['Follow God', 'Kanye West'],
      // Tyler, Frank Ocean
      ['EARFQUAKE', 'Tyler, The Creator'], ['NEW MAGIC WAND', 'Tyler, The Creator'],
      ['Thinkin Bout You', 'Frank Ocean'], ['Pyramids', 'Frank Ocean'], ['Pink + White', 'Frank Ocean'],
      // Childish Gambino
      ['This Is America', 'Childish Gambino'], ['3005', 'Childish Gambino'], ['Redbone', 'Childish Gambino'],
      // Wiz Khalifa
      ['See You Again', 'Wiz Khalifa'], ['Black and Yellow', 'Wiz Khalifa'], ['Young, Wild & Free', 'Wiz Khalifa'],
    ],
  },
  rnb: {
    name: 'Songs · R&B & Soul',
    desc: 'R&B classics and modern soul — listen and name the track.',
    accent: '#7c3aed',
    songs: [
      // Stevie Wonder, Marvin Gaye, Otis, Sam Cooke
      ['Superstition', 'Stevie Wonder'], ['Sir Duke', 'Stevie Wonder'], ['Higher Ground', 'Stevie Wonder'],
      ['Signed, Sealed, Delivered', 'Stevie Wonder'], ['Isn\'t She Lovely', 'Stevie Wonder'],
      ['I Just Called to Say I Love You', 'Stevie Wonder'], ['Living for the City', 'Stevie Wonder'],
      ['What\'s Going On', 'Marvin Gaye'], ['Let\'s Get It On', 'Marvin Gaye'],
      ['I Heard It Through the Grapevine', 'Marvin Gaye'], ['Sexual Healing', 'Marvin Gaye'],
      ['Ain\'t No Mountain High Enough', 'Marvin Gaye'],
      ['Sittin\' on the Dock of the Bay', 'Otis Redding'], ['Try a Little Tenderness', 'Otis Redding'],
      ['A Change Is Gonna Come', 'Sam Cooke'], ['You Send Me', 'Sam Cooke'],
      ['Respect', 'Aretha Franklin'], ['(You Make Me Feel Like) A Natural Woman', 'Aretha Franklin'],
      ['Think', 'Aretha Franklin'], ['Chain of Fools', 'Aretha Franklin'],
      // Motown
      ['My Girl', 'The Temptations'], ['Papa Was a Rolling Stone', 'The Temptations'],
      ['Just My Imagination', 'The Temptations'], ['Get Ready', 'The Temptations'],
      ['I Want You Back', 'The Jackson 5'], ['ABC', 'The Jackson 5'], ['I\'ll Be There', 'The Jackson 5'],
      ['Stop! In the Name of Love', 'The Supremes'], ['You Can\'t Hurry Love', 'The Supremes'],
      ['Where Did Our Love Go', 'The Supremes'],
      ['Stand by Me', 'Ben E. King'],
      // 90s R&B
      ['Waterfalls', 'TLC'], ['No Scrubs', 'TLC'], ['Creep', 'TLC'], ['Unpretty', 'TLC'],
      ['End of the Road', 'Boyz II Men'], ['I\'ll Make Love to You', 'Boyz II Men'],
      ['On Bended Knee', 'Boyz II Men'], ['Motownphilly', 'Boyz II Men'],
      ['The Boy Is Mine', 'Brandy'], ['Have You Ever?', 'Brandy'], ['Sittin\' Up in My Room', 'Brandy'],
      ['Angel of Mine', 'Monica'], ['For You I Will', 'Monica'],
      ['Try Again', 'Aaliyah'], ['Are You That Somebody?', 'Aaliyah'], ['One in a Million', 'Aaliyah'],
      ['Back & Forth', 'Aaliyah'],
      ['Un-Break My Heart', 'Toni Braxton'], ['You\'re Makin\' Me High', 'Toni Braxton'],
      ['Breathe Again', 'Toni Braxton'],
      ['I Believe I Can Fly', 'R. Kelly'], ['Bump n\' Grind', 'R. Kelly'],
      ['Hold On', 'En Vogue'], ['Free Your Mind', 'En Vogue'], ['Don\'t Let Go (Love)', 'En Vogue'],
      ['Weak', 'SWV'], ['Right Here', 'SWV'],
      ['Real Love', 'Mary J. Blige'], ['You Remind Me', 'Mary J. Blige'], ['Family Affair', 'Mary J. Blige'],
      ['Be Without You', 'Mary J. Blige'], ['Not Gon\' Cry', 'Mary J. Blige'],
      ['Brown Sugar', 'D\'Angelo'], ['Lady', 'D\'Angelo'], ['Untitled (How Does It Feel)', 'D\'Angelo'],
      ['Ascension', 'Maxwell'], ['Pretty Wings', 'Maxwell'],
      ['On & On', 'Erykah Badu'], ['Tyrone', 'Erykah Badu'],
      ['Pony', 'Ginuwine'], ['So Anxious', 'Ginuwine'], ['Differences', 'Ginuwine'],
      ['Anytime', 'Brian McKnight'], ['Back at One', 'Brian McKnight'],
      ['Cupid', '112'], ['Anywhere', '112'], ['Peaches & Cream', '112'],
      ['In My Bed', 'Dru Hill'], ['How Deep Is Your Love', 'Dru Hill'],
      ['Too Close', 'Next'],
      ['I Swear', 'All-4-One'], ['So Much in Love', 'All-4-One'],
      ['Killing Me Softly', 'Fugees'], ['Doo Wop (That Thing)', 'Lauryn Hill'],
      // 2000s R&B
      ['Yeah!', 'Usher'], ['Burn', 'Usher'], ['Confessions Part II', 'Usher'],
      ['Caught Up', 'Usher'], ['U Got It Bad', 'Usher'], ['U Remind Me', 'Usher'],
      ['Love in This Club', 'Usher'], ['OMG', 'Usher'], ['DJ Got Us Fallin\' in Love', 'Usher'],
      ['Fallin\'', 'Alicia Keys'], ['You Don\'t Know My Name', 'Alicia Keys'],
      ['If I Ain\'t Got You', 'Alicia Keys'], ['No One', 'Alicia Keys'], ['Girl on Fire', 'Alicia Keys'],
      ['Ordinary People', 'John Legend'], ['All of Me', 'John Legend'], ['Tonight (Best You Ever Had)', 'John Legend'],
      ['Love Me Now', 'John Legend'], ['Stay With You', 'John Legend'],
      ['So Sick', 'Ne-Yo'], ['Sexy Love', 'Ne-Yo'], ['Closer', 'Ne-Yo'], ['Miss Independent', 'Ne-Yo'],
      ['Run It!', 'Chris Brown'], ['Kiss Kiss', 'Chris Brown'], ['With You', 'Chris Brown'],
      ['Forever', 'Chris Brown'], ['Yeah 3x', 'Chris Brown'], ['Loyal', 'Chris Brown'], ['Look at Me Now', 'Chris Brown'],
      ['Crazy in Love', 'Beyoncé'], ['Single Ladies', 'Beyoncé'], ['Halo', 'Beyoncé'], ['Irreplaceable', 'Beyoncé'],
      ['Drunk in Love', 'Beyoncé'],
      ['We Belong Together', 'Mariah Carey'], ['Shake It Off', 'Mariah Carey'], ['Touch My Body', 'Mariah Carey'],
      // Frank Ocean, Solange, Daniel Caesar, H.E.R., SZA, Khalid
      ['Thinkin Bout You', 'Frank Ocean'], ['Pyramids', 'Frank Ocean'], ['Pink + White', 'Frank Ocean'],
      ['Nights', 'Frank Ocean'], ['Self Control', 'Frank Ocean'], ['Ivy', 'Frank Ocean'],
      ['Cranes in the Sky', 'Solange'], ['Don\'t Touch My Hair', 'Solange'],
      ['Best Part', 'H.E.R.'], ['Focus', 'H.E.R.'],
      ['Get You', 'Daniel Caesar'], ['Best Part', 'Daniel Caesar'], ['Japanese Denim', 'Daniel Caesar'],
      ['The Weekend', 'SZA'], ['Good Days', 'SZA'], ['Love Galore', 'SZA'], ['Broken Clocks', 'SZA'],
      ['Location', 'Khalid'], ['Young Dumb & Broke', 'Khalid'], ['Better', 'Khalid'],
      // The Weeknd, Bruno R&B side
      ['Earned It', 'The Weeknd'], ['Can\'t Feel My Face', 'The Weeknd'], ['The Hills', 'The Weeknd'],
      ['Starboy', 'The Weeknd'], ['I Feel It Coming', 'The Weeknd'], ['Often', 'The Weeknd'],
      ['Wicked Games', 'The Weeknd'],
      ['Versace on the Floor', 'Bruno Mars'], ['Finesse', 'Bruno Mars'], ['That\'s What I Like', 'Bruno Mars'],
      // Ella Mai, Summer Walker, Kehlani
      ['Boo\'d Up', 'Ella Mai'], ['Trip', 'Ella Mai'],
      ['Girls Need Love', 'Summer Walker'], ['Playing Games', 'Summer Walker'],
      ['Honey', 'Kehlani'], ['Distraction', 'Kehlani'],
      // Anderson .Paak, Lizzo
      ['Come Down', 'Anderson .Paak'], ['Tints', 'Anderson .Paak'],
      ['Truth Hurts', 'Lizzo'], ['Good as Hell', 'Lizzo'], ['Juice', 'Lizzo'],
      // Janelle, Jorja Smith, Daniel Caesar
      ['Make Me Feel', 'Janelle Monáe'], ['PYNK', 'Janelle Monáe'],
      ['Blue Lights', 'Jorja Smith'], ['On My Mind', 'Jorja Smith'],
      // Justin Timberlake (R&B side)
      ['SexyBack', 'Justin Timberlake'], ['Cry Me a River', 'Justin Timberlake'], ['Rock Your Body', 'Justin Timberlake'],
      ['My Love', 'Justin Timberlake'], ['What Goes Around... Comes Around', 'Justin Timberlake'],
      ['Mirrors', 'Justin Timberlake'], ['Suit & Tie', 'Justin Timberlake'],
      ['Can\'t Stop the Feeling!', 'Justin Timberlake'],
      // Misc
      ['Bills, Bills, Bills', 'Destiny\'s Child'], ['Say My Name', 'Destiny\'s Child'],
      ['Survivor', 'Destiny\'s Child'], ['Bootylicious', 'Destiny\'s Child'],
      ['Independent Women', 'Destiny\'s Child'],
      ['As Long as You Love Me', 'Backstreet Boys'],
      ['That\'s Just the Way It Is', 'Bruce Hornsby'],
      ['Ribbon in the Sky', 'Stevie Wonder'], ['Part-Time Lover', 'Stevie Wonder'],
      ['Lost Without You', 'Robin Thicke'], ['Blurred Lines', 'Robin Thicke'],
    ],
  },
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
  const hit =
    cands.find((x) => norm(x.artistName) === a && norm(x.trackName).startsWith(t)) ||
    cands.find((x) => norm(x.artistName) === a) ||
    cands.find((x) => norm(x.trackName).startsWith(t));
  return hit ? hit.previewUrl : null;
}

const songRow = (title, artist, url) =>
  `      { q: 'Listen to the clip — identify the song.', a: ${JSON.stringify(title)}, audio: ${JSON.stringify(url)}, alt: ${JSON.stringify([norm(`${title} ${artist}`)])}, category: 'music', difficulty: 2 },`;

function packLiteral(varName, id, meta, rows) {
  return `export const ${varName}: RawPack = {
  id: '${id}',
  name: ${JSON.stringify(meta.name)},
  description: ${JSON.stringify(meta.desc)},
  emoji: '🎵',
  accent: '${meta.accent}',
  difficulty: 'medium',
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

const results = {};
for (const [genre, meta] of Object.entries(GENRES)) {
  const kept = [];
  const seen = new Set();
  for (const [title, artist] of meta.songs) {
    const k = `${norm(title)}|${norm(artist)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const url = await findSong(title, artist);
    if (url) kept.push({ title, artist, url });
    else console.log(`  ❌ ${genre}: ${title} - ${artist}`);
    await sleep(280);
  }
  console.log(`  [${genre}] kept ${kept.length}/${meta.songs.length}`);
  results[genre] = kept;
}

const literals = Object.entries(GENRES).map(([genre, meta]) => {
  const varName = `songs${genre.charAt(0).toUpperCase()}${genre.slice(1)}Pack`;
  const id = `songs-${genre}`;
  return packLiteral(varName, id, meta, results[genre].map((k) => songRow(k.title, k.artist, k.url)));
});

const out = `// AUTO-GENERATED by scripts/genSongsByGenre.mjs — do not hand-edit.
// Genre-based Guess-the-Song packs (iTunes 30-second previews, .m4a).
import type { RawPack } from '../core/packs';

${literals.join('\n')}
`;
await writeFile(new URL('../src/content/songsByGenre.ts', import.meta.url), out, 'utf8');
console.log('Wrote src/content/songsByGenre.ts');
console.log('Totals:', Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.length])));
