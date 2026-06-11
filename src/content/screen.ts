import type { RawPack } from '../core/packs';

export const moviesPack: RawPack = {
  id: 'movies-tv',
  name: 'Movies & TV',
  description: 'Films, shows, characters and the people who made them.',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🎬',
  accent: '#e11d48',
  letters: {
    A: [
      { q: 'James Cameron\'s 2009 sci-fi epic set on the moon Pandora, featuring the blue-skinned Na\'vi people.', a: 'Avatar', category: 'screen' },
      { q: 'Disney animated musical about a street-smart boy who falls for a princess with the help of a magic lamp.', a: 'Aladdin', category: 'screen' },
      { q: 'Marvel\'s superhero ensemble films collectively known by this name, featuring Iron Man, Thor, and Captain America.', a: 'Avengers', category: 'screen' },
      { q: 'Denis Villeneuve\'s 2016 sci-fi drama in which a linguist must learn to communicate with alien visitors.', a: 'Arrival', category: 'screen' },
      { q: 'Ridley Scott\'s 1979 sci-fi horror in which the crew of the Nostromo encounters a lethal creature in space.', a: 'Alien', category: 'screen' },
      { q: 'Ron Howard\'s 1995 drama recreating the harrowing true story of NASA\'s failed 1970 lunar mission.', a: 'Apollo 13', category: 'screen' },
      { q: 'Ben Affleck directed and starred in this 2012 Best Picture winner about a CIA hostage rescue disguised as a film shoot.', a: 'Argo', category: 'screen' },
    ],
    B: [
      { q: 'AMC drama about a high-school chemistry teacher who becomes a methamphetamine producer named Heisenberg.', a: 'Breaking Bad', category: 'screen' },
      { q: 'Greta Gerwig\'s 2023 live-action comedy starring Margot Robbie as the iconic plastic doll.', a: 'Barbie', category: 'screen' },
      { q: 'Mel Gibson directed and starred in this 1995 Scottish independence epic about William Wallace.', a: 'Braveheart', category: 'screen' },
      { q: 'Tim Burton\'s 1989 dark superhero film in which Michael Keaton plays Gotham\'s caped protector.', a: 'Batman', category: 'screen' },
      { q: 'Alejandro González Iñárritu\'s 2014 Oscar-winning black comedy about a faded superhero actor staging a Broadway comeback.', a: 'Birdman', category: 'screen' },
    ],
    C: [
      { q: 'Orson Welles\'s 1941 fictional portrait of a media tycoon, widely considered the greatest film ever made.', a: 'Citizen Kane', category: 'screen' },
      { q: 'Pixar film set in Mexico during Día de los Muertos, in which a boy travels to the land of the dead.', a: 'Coco', category: 'screen' },
      { q: '1942 Humphrey Bogart classic set in a North African city with the line "Here\'s looking at you, kid."', a: 'Casablanca', category: 'screen' },
      { q: 'Roman Polanski\'s 1974 neo-noir in which a private detective uncovers corruption behind Los Angeles\'s water supply.', a: 'Chinatown', category: 'screen' },
    ],
    D: [
      { q: 'Martin Scorsese\'s 2006 crime thriller in which undercover cops and mob moles work to expose each other.', a: 'Departed', category: 'screen' },
      { q: 'Ryan Gosling plays a stunt driver who moonlights as a getaway driver in this 2011 neo-noir thriller.', a: 'Drive', category: 'screen' },
      { q: 'Christopher Nolan\'s 2017 war film depicting the miraculous WWII evacuation from a French beach.', a: 'Dunkirk', category: 'screen' },
    ],
    E: [
      { q: 'Steven Spielberg\'s 1982 film in which a lonely boy befriends a stranded alien who wants to go home.', a: 'ET the Extra-Terrestrial', category: 'screen' },
      { q: 'Disney animated musical set in Colombia whose heroine Mirabel has no magical gift in her family.', a: 'Encanto', category: 'screen' },
      { q: 'Will Ferrell Christmas comedy in which a human raised by elves travels to New York City to find his father.', a: 'Elf', category: 'screen' },
    ],
    F: [
      { q: 'Robert Zemeckis\'s 1994 film in which a kind-hearted man with a low IQ narrates his extraordinary life story.', a: 'Forrest Gump', category: 'screen' },
      { q: 'NBC sitcom about six flatmates and coffee-shop regulars in New York City, running for ten seasons from 1994 to 2004.', a: 'Friends', category: 'screen' },
      { q: 'Disney animated film about two royal sisters and a kingdom trapped in an eternal winter.', a: 'Frozen', category: 'screen' },
      { q: 'David Fincher\'s 1999 film in which a white-collar insomniac forms an underground brawling organisation with a soap salesman.', a: 'Fight Club', category: 'screen' },
      { q: 'Coen Brothers\' 1996 dark comedy about a kidnapping scheme gone wrong in snowy Minnesota.', a: 'Fargo', category: 'screen' },
    ],
    G: [
      { q: 'Ridley Scott\'s 2000 Roman epic in which a betrayed general becomes an arena warrior to avenge his family.', a: 'Gladiator', category: 'screen' },
      { q: 'Martin Scorsese\'s 1990 mob film based on the real-life rise and fall of gangster Henry Hill.', a: 'Goodfellas', category: 'screen' },
      { q: 'Jordan Peele\'s 2017 horror in which a Black man discovers a disturbing secret at his white girlfriend\'s family home.', a: 'Get Out', category: 'screen' },
      { q: 'HBO epic fantasy series following the fight for the Iron Throne of the Seven Kingdoms.', a: 'Game of Thrones', category: 'screen' },
    ],
    H: [
      { q: 'Daniel Radcliffe stars as a young wizard who attends a school for magic and battles a dark lord.', a: 'Harry Potter', category: 'screen' },
      { q: 'Quentin Tarantino\'s 2015 mystery Western, shot in 70mm, in which a bounty hunter and his prisoner share a snowbound Wyoming haberdashery with six other suspicious strangers.', a: 'Hateful Eight', category: 'screen' },
      { q: 'Spike Jonze\'s 2013 film in which a man falls in love with his AI operating system voiced by Scarlett Johansson.', a: 'Her', category: 'screen' },
      { q: 'Michael Mann\'s 1995 crime thriller pitting Al Pacino\'s detective against Robert De Niro\'s master thief.', a: 'Heat', category: 'screen' },
    ],
    I: [
      { q: 'Christopher Nolan\'s 2010 film in which a thief steals corporate secrets by entering people\'s dreams.', a: 'Inception', category: 'screen' },
      { q: 'Christopher Nolan\'s 2014 sci-fi epic in which astronauts travel through a wormhole to find a new home.', a: 'Interstellar', category: 'screen' },
      { q: 'Jon Favreau\'s 2008 Marvel film in which a weapons manufacturer builds a powered suit of armour.', a: 'Iron Man', category: 'screen' },
      { q: 'Quentin Tarantino\'s 2009 WWII revisionist film following a Jewish revenge squad behind enemy lines in occupied Europe.', a: 'Inglourious Basterds', category: 'screen' },
    ],
    J: [
      { q: 'Steven Spielberg\'s 1975 thriller about a great white shark terrorising a New England beach resort.', a: 'Jaws', category: 'screen' },
      { q: 'Spielberg\'s 1993 adventure in which genetically engineered prehistoric creatures escape on an island attraction.', a: 'Jurassic Park', category: 'screen' },
      { q: 'Todd Phillips\'s 2019 psychological thriller in which a failed comedian transforms into Gotham\'s most notorious villain.', a: 'Joker', category: 'screen' },
    ],
    K: [
      { q: 'Quentin Tarantino\'s two-part 2003–2004 revenge saga starring Uma Thurman as a deadly assassin.', a: 'Kill Bill', category: 'screen' },
      { q: 'Rian Johnson\'s 2019 murder mystery in which Daniel Craig plays the eccentric detective Benoit Blanc.', a: 'Knives Out', category: 'screen' },
    ],
    L: [
      { q: 'David Lean\'s 1962 epic in which Peter O\'Toole plays a British officer who leads the Arab Revolt against the Ottoman Empire in WWI.', a: 'Lawrence of Arabia', category: 'screen' },
      { q: 'Luc Besson\'s 1994 action film in which a solitary contract killer takes in a young girl whose family was murdered by corrupt DEA agents.', a: 'Leon the Professional', category: 'screen' },
      { q: 'Greta Gerwig\'s 2019 adaptation of Louisa May Alcott\'s novel about the March sisters during the Civil War.', a: 'Little Women', category: 'screen' },
      { q: 'ABC drama series in which survivors of a plane crash encounter mysterious forces on a tropical island.', a: 'Lost', category: 'screen' },
    ],
    M: [
      { q: 'Disney animated film in which a young Polynesian woman sets sail to restore a stolen heart and save her island.', a: 'Moana', category: 'screen' },
      { q: 'George Miller\'s 2015 post-apocalyptic action film in which Furiosa tries to free enslaved women from a warlord.', a: 'Mad Max Fury Road', category: 'screen' },
      { q: 'Christopher Nolan\'s 2000 neo-noir told in reverse order about a man with no short-term memory hunting a killer.', a: 'Memento', category: 'screen' },
      { q: 'Disney animated film in which a young Chinese woman disguises herself as a soldier to protect her ailing father.', a: 'Mulan', category: 'screen' },
      { q: 'Barry Jenkins\'s 2016 Best Picture winner following a young Black man\'s identity and sexuality across three life stages.', a: 'Moonlight', category: 'screen' },
    ],
    N: [
      { q: 'Coen Brothers\' 2007 Best Picture winner following a drug deal gone wrong in the Texas desert.', a: 'No Country for Old Men', category: 'screen' },
      { q: 'Julia Roberts and Hugh Grant star in this 1999 romantic comedy set in a London neighbourhood.', a: 'Notting Hill', category: 'screen' },
    ],
    O: [
      { q: 'Christopher Nolan\'s 2023 biographical drama about the physicist who led the Manhattan Project.', a: 'Oppenheimer', category: 'screen' },
      { q: 'Elia Kazan\'s 1954 drama in which Marlon Brando says "I coulda been a contender" on the New York docks.', a: 'On the Waterfront', category: 'screen' },
    ],
    P: [
      { q: 'Bong Joon-ho\'s 2019 South Korean Oscar-winning film about class inequality between two families.', a: 'Parasite', category: 'screen' },
      { q: 'Quentin Tarantino\'s 1994 crime anthology featuring Vincent Vega, Jules, and a mysterious briefcase.', a: 'Pulp Fiction', category: 'screen' },
      { q: 'Alfred Hitchcock\'s 1960 horror classic featuring the Bates Motel and an iconic shower scene.', a: 'Psycho', category: 'screen' },
      { q: 'Denis Villeneuve\'s 2013 thriller starring Hugh Jackman as a father who takes the law into his own hands.', a: 'Prisoners', category: 'screen' },
      { q: 'Disney animated classic about a wooden puppet brought to life who wishes to become a real boy.', a: 'Pinocchio', category: 'screen' },
    ],
    Q: [
      { q: 'The 22nd James Bond film in which Daniel Craig\'s 007 hunts the villainous Dominic Greene in Bolivia.', a: 'Quantum of Solace', category: 'screen' },
    ],
    R: [
      { q: 'Alfonso Cuarón\'s 2018 black-and-white Mexican film that won three Academy Awards including Best Director.', a: 'Roma', category: 'screen' },
      { q: 'Sylvester Stallone\'s 1976 boxing drama about a Philadelphia underdog who gets a shot at the world title.', a: 'Rocky', category: 'screen' },
      { q: 'Brad Bird\'s 2007 Pixar film about a rat in Paris who dreams of becoming a great chef.', a: 'Ratatouille', category: 'screen' },
      { q: 'Alfred Hitchcock\'s 1954 thriller in which a wheelchair-bound photographer suspects his neighbour of murder.', a: 'Rear Window', category: 'screen' },
    ],
    S: [
      { q: 'Steven Spielberg\'s 1993 black-and-white film about a German industrialist who rescued over a thousand people from the Nazi death camps.', a: 'Schindler\'s List', category: 'screen' },
      { q: 'George Lucas\'s 1977 space opera that launched one of the biggest film franchises in history.', a: 'Star Wars', category: 'screen' },
      { q: 'HBO drama about the Roy family\'s battle for control of a global media empire.', a: 'Succession', category: 'screen' },
      { q: 'Sam Mendes\'s 2012 Bond film in which Javier Bardem plays a vengeful former MI6 agent.', a: 'Skyfall', category: 'screen' },
      { q: 'Hayao Miyazaki\'s 2001 animated film in which a ten-year-old girl must work in a magical spirit bathhouse.', a: 'Spirited Away', category: 'screen' },
    ],
    T: [
      { q: 'James Cameron\'s 1997 epic romance set aboard a doomed ocean liner on its maiden voyage.', a: 'Titanic', category: 'screen' },
      { q: 'James Cameron\'s 1984 sci-fi film in which Arnold Schwarzenegger plays a killing machine sent from the future.', a: 'The Terminator', category: 'screen' },
      { q: 'John Lasseter\'s 1995 Pixar debut about a cowboy doll whose status as a child\'s favourite is threatened by a flashy new space-ranger action figure.', a: 'Toy Story', category: 'screen' },
      { q: 'M. Night Shyamalan\'s 1999 thriller in which a boy who sees dead people visits a child psychologist.', a: 'The Sixth Sense', category: 'screen' },
    ],
    U: [
      { q: 'Pixar\'s 2009 film in which a retired balloon salesman lifts his house skyward to honour a lifelong promise.', a: 'Up', category: 'screen' },
      { q: 'Clint Eastwood\'s 1992 Academy Award-winning revisionist Western about a retired outlaw taking one last job.', a: 'Unforgiven', category: 'screen' },
      { q: 'Jordan Peele\'s 2019 horror film about a family terrorised by their own sinister doubles called the Tethered.', a: 'Us', category: 'screen' },
    ],
    V: [
      { q: 'Alfred Hitchcock\'s 1958 psychological thriller starring James Stewart as a detective who becomes obsessed with a mysterious woman.', a: 'Vertigo', category: 'screen' },
      { q: 'James McTeigue\'s 2005 dystopian film in which a masked anarchist fights a totalitarian British government.', a: 'V for Vendetta', category: 'screen' },
    ],
    W: [
      { q: 'Pixar\'s 2008 film about a robot left alone on a garbage-covered Earth who falls in love with another robot.', a: 'WALL-E', category: 'screen' },
      { q: 'Damien Chazelle\'s 2014 film in which a drumming student is pushed to breaking point by a brutal music instructor.', a: 'Whiplash', category: 'screen' },
      { q: 'HBO science fiction series set in a futuristic theme park populated by lifelike androids who gain consciousness.', a: 'Westworld', category: 'screen' },
    ],
    X: [
      { q: 'Bryan Singer\'s 2000 Marvel film introducing Hugh Jackman as Wolverine and a team of mutant heroes.', a: 'X-Men', category: 'screen' },
      { q: 'Lucy Lawless starred in this popular 1990s syndicated fantasy series as a sword-wielding heroine of ancient Greece who fights alongside her companion Gabrielle.', a: 'Xena Warrior Princess', category: 'screen' },
    ],
    Y: [
      { q: 'Paramount Network drama following the Dutton family\'s vast Montana cattle ranch, starring Kevin Costner.', a: 'Yellowstone', category: 'screen' },
    ],
    Z: [
      { q: 'David Fincher\'s 2007 crime thriller about San Francisco detectives hunting a taunting serial killer who was never caught.', a: 'Zodiac', category: 'screen' },
      { q: 'Disney animated film in which a rabbit becomes the first of her species to join a city police force of talking animals.', a: 'Zootopia', category: 'screen' },
    ],
  },
};

export const moviesHardPack: RawPack = {
  id: 'movies-tv-hard',
  name: 'Movies & TV · Hard',
  description: 'Deeper cuts for film & TV buffs.',
  locale: 'en',
  difficulty: 'hard',
  contentRating: 'everyone',
  emoji: '🍿',
  accent: '#9f1239',
  letters: {
    A: [
      { q: 'Jean-Pierre Jeunet\'s 2001 French film about a whimsical Parisian waitress who quietly improves the lives of those around her.', a: 'Amélie', category: 'screen' },
      { q: 'Woody Allen\'s 1977 Oscar-winning romantic comedy widely considered his masterpiece, starring Diane Keaton.', a: 'Annie Hall', category: 'screen' },
      { q: 'Joseph L. Mankiewicz\'s 1950 backstage drama in which a scheming young actress ingratiates herself with a Broadway legend.', a: 'All About Eve', category: 'screen' },
      { q: 'Edward Berger\'s 2022 German anti-war film, the third major screen adaptation of Erich Maria Remarque\'s WWI novel.', a: 'All Quiet on the Western Front', category: 'screen' },
      { q: 'James Cameron\'s 1986 sequel that shifted the franchise from horror to action, starring Sigourney Weaver fighting multiple creatures.', a: 'Aliens', category: 'screen' },
      { q: 'Francis Ford Coppola\'s 1979 Vietnam War epic loosely adapted from Joseph Conrad\'s Heart of Darkness.', a: 'Apocalypse Now', category: 'screen' },
      { q: 'Tarkovsky\'s 1966 Soviet epic following a 15th-century icon painter who witnesses suffering and struggles with the purpose of art.', a: 'Andrei Rublev', category: 'screen' },
    ],
    B: [
      { q: 'Terry Gilliam\'s 1985 dystopian satire in which a low-ranking bureaucrat fantasises about escape from a retro-futurist totalitarian state.', a: 'Brazil', category: 'screen' },
      { q: 'Jean-Luc Godard\'s 1960 French New Wave debut about a small-time criminal and his American girlfriend on the run in Paris.', a: 'Breathless', category: 'screen' },
      { q: 'Krzysztof Kieślowski\'s 1993 film — the first of his Three Colours trilogy — exploring grief after a tragic accident.', a: 'Blue', category: 'screen' },
      { q: 'Richard Linklater\'s 2014 coming-of-age film shot over twelve years with the same cast, depicting one boy\'s life.', a: 'Boyhood', category: 'screen' },
    ],
    C: [
      { q: 'Michael Haneke\'s 2005 Austrian-French thriller in which a bourgeois Parisian family receives anonymous surveillance tapes.', a: 'Caché', category: 'screen' },
      { q: 'Bob Fosse\'s 1972 musical set in 1930s Berlin\'s nightclub scene, starring Liza Minnelli as Sally Bowles.', a: 'Cabaret', category: 'screen' },
      { q: 'Ang Lee\'s 2000 wuxia film in which a stolen sword leads to breathtaking martial arts duels across imperial China.', a: 'Crouching Tiger Hidden Dragon', category: 'screen' },
    ],
    D: [
      { q: 'Stanley Kubrick\'s 1964 black comedy in which a rogue U.S. general launches a nuclear strike and a former-Nazi presidential science adviser watches events spiral in the War Room.', a: 'Dr Strangelove', category: 'screen' },
      { q: 'Terrence Malick\'s 1978 lyrical film set among migrant farmworkers in the Texas panhandle, photographed by Néstor Almendros.', a: 'Days of Heaven', category: 'screen' },
    ],
    E: [
      { q: 'Stanley Kubrick\'s 1999 final film, a sexual odyssey starring Tom Cruise and Nicole Kidman navigating hidden worlds in New York.', a: 'Eyes Wide Shut', category: 'screen' },
    ],
    F: [
      { q: 'Werner Herzog\'s 1982 film in which a megalomaniacal opera impresario forces hundreds to haul a steamship over a Peruvian mountain.', a: 'Fitzcarraldo', category: 'screen' },
    ],
    G: [
      { q: 'Martin Scorsese\'s 1990 crime film based on Nicholas Pileggi\'s book "Wiseguy," in which Ray Liotta\'s voiceover narrates the rise and fall of mob associate Henry Hill.', a: 'Goodfellas', category: 'screen' },
    ],
    H: [
      { q: 'Quentin Tarantino\'s 2015 Western shot in 70mm Ultra Panavision, in which bounty hunter John Ruth and his prisoner share a remote Wyoming haberdashery with six other suspicious strangers.', a: 'Hateful Eight', category: 'screen' },
    ],
    I: [
      { q: 'Quentin Tarantino\'s 2009 revisionist WWII film in which a French-Jewish cinema owner hatches her own plot against the Nazi high command alongside a rogue American squad.', a: 'Inglourious Basterds', category: 'screen' },
    ],
    J: [
      { q: 'Todd Phillips\'s 2019 film in which Joaquin Phoenix\'s Arthur Fleck descends into madness in a grimy, debt-ridden Gotham City inspired by 1970s New York.', a: 'Joker', category: 'screen' },
    ],
    K: [
      { q: 'Quentin Tarantino\'s two-part 2003–2004 revenge film in which Uma Thurman\'s Beatrix Kiddo, codenamed Black Mamba, hunts every member of the Deadly Viper Assassination Squad.', a: 'Kill Bill', category: 'screen' },
      { q: 'Rian Johnson\'s 2019 whodunit in which the entire Thrombey family is a suspect after patriarch Harlan is found dead, and detective Benoit Blanc focuses his suspicion on the alibi of nurse Marta.', a: 'Knives Out', category: 'screen' },
    ],
    L: [
      { q: 'David Lean\'s 1962 epic in which Peter O\'Toole\'s eccentric British officer leads the Arab Revolt, wins the Battle of Aqaba, and struggles with a divided identity between two cultures.', a: 'Lawrence of Arabia', category: 'screen' },
      { q: 'Luc Besson\'s 1994 thriller in which Jean Reno\'s laconic cleaner takes in Natalie Portman\'s twelve-year-old Mathilda after DEA agent Stansfield murders her family.', a: 'Leon the Professional', category: 'screen' },
    ],
    M: [
      { q: 'Fritz Lang\'s 1931 German crime thriller in which the city\'s criminals organise a manhunt for a child murderer.', a: 'M', category: 'screen' },
      { q: 'Fritz Lang\'s 1927 silent German expressionist sci-fi depicting a dystopian city where workers toil underground while the elite live above.', a: 'Metropolis', category: 'screen' },
    ],
    N: [
      { q: 'Robert Altman\'s 1975 ensemble film set over five days in the country music capital of Tennessee.', a: 'Nashville', category: 'screen' },
      { q: 'Alexander Payne\'s 2013 black-and-white road movie in which an elderly man drives to claim a sweepstakes prize he almost certainly didn\'t win.', a: 'Nebraska', category: 'screen' },
    ],
    O: [
      { q: 'Elia Kazan\'s 1954 film in which Marlon Brando\'s longshoreman Terry Malloy, complicit in a union murder, must decide whether to testify against corrupt mob boss Johnny Friendly.', a: 'On the Waterfront', category: 'screen' },
    ],
    P: [
      { q: 'Ingmar Bergman\'s 1966 experimental film in which the identities of a nurse and her mute actress patient begin to merge.', a: 'Persona', category: 'screen' },
    ],
    R: [
      { q: 'Akira Kurosawa\'s 1950 crime drama told through four contradictory eyewitness accounts of a murder in feudal Japan.', a: 'Rashomon', category: 'screen' },
      { q: 'Alfonso Cuarón\'s black-and-white 2018 film following a housekeeper in an upper-middle-class household in 1970s Mexico City who navigates an unplanned pregnancy during political unrest.', a: 'Roma', category: 'screen' },
      { q: 'Roberto Rossellini\'s 1945 Italian neorealist film in which Resistance fighters and a Catholic priest help a communist fugitive evade the Gestapo in an occupied Italian capital, shot guerrilla-style on location in the actual streets.', a: 'Rome Open City', category: 'screen' },
    ],
    S: [
      { q: 'Andrei Tarkovsky\'s 1979 Soviet sci-fi in which a guide leads two men through a mysterious forbidden zone that grants desires.', a: 'Stalker', category: 'screen' },
      { q: 'Denis Villeneuve\'s 2015 crime thriller following an idealistic FBI agent drawn into a brutal operation against a Mexican cartel.', a: 'Sicario', category: 'screen' },
      { q: 'Tom McCarthy\'s 2015 drama about the Boston Globe team that exposed widespread clergy sexual abuse in the Catholic Church.', a: 'Spotlight', category: 'screen' },
    ],
    T: [
      { q: 'Yasujirô Ozu\'s 1953 Japanese masterpiece about an elderly couple who visit their grown children and discover they are largely unwanted.', a: 'Tokyo Story', category: 'screen' },
      { q: 'Orson Welles\'s 1958 film noir opening with a legendary long tracking shot in a Mexican border town.', a: 'Touch of Evil', category: 'screen' },
    ],
    U: [
      { q: 'Clint Eastwood\'s 1992 Western in which retired outlaw William Munny takes a bounty job with the Schofield Kid, only to face a brutal confrontation with Gene Hackman\'s sadistic sheriff Little Bill.', a: 'Unforgiven', category: 'screen' },
    ],
    V: [
      { q: 'Agnès Varda\'s 1985 French film following the final weeks of a young drifter woman, pieced together through flashbacks after her death.', a: 'Vagabond', category: 'screen' },
      { q: 'Luis Buñuel\'s 1961 Spanish film in which a devout novice tries to help a Christ-like beggar whose presence unsettles her faith.', a: 'Viridiana', category: 'screen' },
      { q: 'Alfred Hitchcock\'s 1958 film in which retired detective Scottie Ferguson, played by James Stewart, is hired to follow Madeleine Elster and becomes dangerously obsessed with remaking a woman in her image.', a: 'Vertigo', category: 'screen' },
    ],
    W: [
      { q: 'Ingmar Bergman\'s 1963 Swedish film in which a vicar loses his faith after failing to comfort a parishioner terrified by nuclear war.', a: 'Winter Light', category: 'screen' },
    ],
    X: [
      { q: 'Bryan Singer\'s 2000 Marvel film in which Patrick Stewart\'s Professor Xavier and Ian McKellen\'s Magneto — former friends with opposing philosophies — clash over the fate of mutantkind.', a: 'X-Men', category: 'screen' },
    ],
    Y: [
      { q: 'Taylor Sheridan\'s Paramount Network drama in which the Dutton family\'s Montana ranch borders a Native American reservation and a national park, making it a target for developers and politicians.', a: 'Yellowstone', category: 'screen' },
    ],
    Z: [
      { q: 'Costa-Gavras\'s 1969 political thriller, nominated for Best Picture, dramatising the assassination of a Greek pacifist politician.', a: 'Z', category: 'screen' },
      { q: 'David Fincher\'s 2007 procedural in which cartoonist Robert Graysmith, played by Jake Gyllenhaal, becomes consumed by decoding the cipher letters of a San Francisco serial killer who was never identified.', a: 'Zodiac', category: 'screen' },
    ],
  },
};
