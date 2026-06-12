import type { RawPack } from '../core/packs';

export const saudiPack: RawPack = {
  id: 'saudi-arabia',
  name: 'Saudi Arabia',
  description: 'Trivia on the kingdom — holy cities, deserts, Aramco, Vision 2030 and more.',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🇸🇦',
  accent: '#006c35',
  letters: {
    R: [
      { q: 'The capital and largest city of the kingdom, in the central Najd region.', a: 'Riyadh', category: 'gcc', difficulty: 2 },
      { q: 'The body of water along the kingdom\'s western coast, bordering Egypt and Sudan.', a: 'Red Sea', category: 'gcc', difficulty: 2 },
      { q: 'The giant tourism megadevelopment on the kingdom\'s western coast turning untouched islands and lagoons into luxury resorts.', a: 'Red Sea Project', category: 'gcc', difficulty: 5 },
      { q: 'The vast empty desert in the south-east is also known by this English name meaning a quarter that is unoccupied.', a: 'Rub al Khali', category: 'gcc', difficulty: 3, alt: ['Empty Quarter'] },
      { q: 'The Islamic fasting month during which Muslims abstain from food and drink in daylight.', a: 'Ramadan', category: 'gcc', difficulty: 2 },
      { q: 'The currency of the kingdom, divided into 100 halalas.', a: 'Riyal', category: 'gcc', difficulty: 3, alt: ['Saudi riyal'] },
    ],
    M: [
      { q: 'The holiest city in Islam, birthplace of the Prophet Muhammad and site of the Kaaba.', a: 'Mecca', category: 'gcc', difficulty: 2, alt: ['Makkah'] },
      { q: 'The second holiest city in Islam, home to the Prophet\'s Mosque and his tomb.', a: 'Medina', category: 'gcc', difficulty: 2, alt: ['Madinah'] },
      { q: 'The Prophet whose birthplace and mission are central to the kingdom\'s religious significance.', a: 'Muhammad', category: 'gcc', difficulty: 2 },
      { q: 'The standing on this plain near the holy city is the climactic rite of the pilgrimage.', a: 'Mount Arafat', category: 'gcc', difficulty: 4, alt: ['Arafat'] },
      { q: 'The traditional flatbread baked in clay ovens, a staple at Saudi tables.', a: 'Markook', category: 'gcc', difficulty: 4 },
      { q: 'The heir apparent who as crown prince has driven the kingdom\'s reform agenda since 2017, by his given name.', a: 'Mohammed bin Salman', category: 'gcc', difficulty: 4, alt: ['MBS'] },
      { q: 'The pan-fried folded pastry stuffed with spiced minced meat or banana, a popular Hejazi street snack.', a: 'Mutabbaq', category: 'gcc', difficulty: 5, alt: ['Martabak'] },
    ],
    H: [
      { q: 'The major pilgrimage to Islam\'s holiest city, a duty for able Muslims once in a lifetime.', a: 'Hajj', category: 'gcc', difficulty: 2 },
      { q: 'The western region along the Red Sea coast containing the two holy cities.', a: 'Hejaz', category: 'gcc', difficulty: 3, alt: ['Hijaz'] },
    ],
    U: [
      { q: 'The lesser pilgrimage that can be performed at any time of year.', a: 'Umrah', category: 'gcc', difficulty: 3 },
      { q: 'The international cultural body whose World Heritage list includes Al-Ula\'s Hegra and historic Diriyah.', a: 'UNESCO', category: 'gcc', difficulty: 4 },
    ],
    N: [
      { q: 'The central highland region of the Arabian Peninsula where the capital sits.', a: 'Najd', category: 'gcc', difficulty: 3 },
      { q: 'The futuristic mega-city being built in the north-west as part of the kingdom\'s economic plan.', a: 'NEOM', category: 'gcc', difficulty: 3 },
      { q: 'The kingdom\'s founding holiday each September marking the 1932 unification.', a: 'National Day', category: 'gcc', difficulty: 3 },
    ],
    A: [
      { q: 'The state-owned oil company, the world\'s most valuable producer of petroleum.', a: 'Aramco', category: 'gcc', difficulty: 2, alt: ['Saudi Aramco'] },
      { q: 'The ancient north-western region famous for its rock-cut tombs at Hegra, a UNESCO site.', a: 'Al-Ula', category: 'gcc', difficulty: 4, alt: ['AlUla'] },
      { q: 'The large south-west Asian landmass between the Red Sea and the Gulf, most of which the kingdom occupies.', a: 'Arabian Peninsula', category: 'gcc', difficulty: 2 },
      { q: 'The coral-stone historic old town of the Red Sea port, a UNESCO site of carved wooden balconies.', a: 'Al-Balad', category: 'gcc', difficulty: 5 },
      { q: 'The crisp golden fried dough balls soaked in syrup, an Arabian sweet.', a: 'Awameh', category: 'gcc', difficulty: 5, alt: ['Awama'] },
      { q: 'The lush south-western highland region of terraced farms and cool peaks bordering Yemen.', a: 'Asir', category: 'gcc', difficulty: 4 },
      { q: 'The eastern oasis governorate famous for its huge palm groves, a UNESCO World Heritage Site.', a: 'Al-Ahsa', category: 'gcc', difficulty: 4, alt: ['Hofuf', 'Al Hasa'] },
    ],
    J: [
      { q: 'The major Red Sea port city, historic gateway for pilgrims travelling to Mecca.', a: 'Jeddah', category: 'gcc', difficulty: 2, alt: ['Jiddah'] },
      { q: 'The annual national heritage and culture festival held near the capital.', a: 'Janadriyah', category: 'gcc', difficulty: 5 },
      { q: 'The pillar of Islam meaning struggle, sometimes listed among religious duties.', a: 'Jihad', category: 'gcc', difficulty: 4 },
    ],
    V: [
      { q: 'The kingdom\'s national reform plan announced in 2016 to diversify away from oil, named for a target year.', a: 'Vision 2030', category: 'gcc', difficulty: 2 },
    ],
    K: [
      { q: 'The black cube-shaped building at the centre of the holy sanctuary toward which Muslims pray.', a: 'Kaaba', category: 'gcc', difficulty: 2 },
      { q: 'The national rice-and-meat dish, considered the kingdom\'s signature meal.', a: 'Kabsa', category: 'gcc', difficulty: 3 },
      { q: 'The Eastern Province city that is a major hub of the petroleum industry near the coast.', a: 'Khobar', category: 'gcc', difficulty: 4, alt: ['Al Khobar'] },
      { q: 'The skyscraper in the capital with a distinctive inverted-arch sky bridge near its top, named after a realm.', a: 'Kingdom Centre', category: 'gcc', difficulty: 4, alt: ['Kingdom Tower'] },
    ],
    I: [
      { q: 'The founding monarch who unified the kingdom in 1932, often called by this short family name.', a: 'Ibn Saud', category: 'gcc', difficulty: 3, alt: ['Abdulaziz'] },
      { q: 'The religion practised by the overwhelming majority of the kingdom\'s population.', a: 'Islam', category: 'gcc', difficulty: 1 },
      { q: 'The two seamless white sheets a male pilgrim wears, entering a state of ritual purity.', a: 'Ihram', category: 'gcc', difficulty: 4 },
    ],
    S: [
      { q: 'The royal family that lends its name to the modern kingdom, ruling since 1932.', a: 'Saud', category: 'gcc', difficulty: 2, alt: ['House of Saud', 'Al Saud'] },
      { q: 'The creamy Hejazi dish of rice cooked in milk, often served with chicken.', a: 'Saleeg', category: 'gcc', difficulty: 5, alt: ['Saleig'] },
      { q: 'The Islamic holy law, the kingdom\'s primary legal source.', a: 'Sharia', category: 'gcc', difficulty: 3 },
      { q: 'The checkered red-and-white head cloth worn by Saudi men.', a: 'Shemagh', category: 'gcc', difficulty: 4, alt: ['Ghutra'] },
      { q: 'The ritual of formal worship performed five times daily, one of the pillars of Islam.', a: 'Salah', category: 'gcc', difficulty: 3, alt: ['Salat', 'Prayer'] },
    ],
    D: [
      { q: 'The fruit of the palm tree, a dietary staple and traditional gift across the kingdom.', a: 'Dates', category: 'gcc', difficulty: 2 },
      { q: 'The Eastern Province city headquarters of the national oil company.', a: 'Dhahran', category: 'gcc', difficulty: 4 },
      { q: 'The mud-brick historic district of the capital, a UNESCO World Heritage Site and ancestral seat of the ruling family.', a: 'Diriyah', category: 'gcc', difficulty: 4, alt: ['Diryah'] },
    ],
    T: [
      { q: 'The southern highland city known for its cool climate and roses.', a: 'Taif', category: 'gcc', difficulty: 4 },
      { q: 'The annual pilgrimage circling of the cube-shaped shrine seven times.', a: 'Tawaf', category: 'gcc', difficulty: 4 },
      { q: 'The long limestone escarpment that snakes through the centre of the country near the capital, a popular hiking spot.', a: 'Tuwaiq', category: 'gcc', difficulty: 5 },
    ],
    P: [
      { q: 'The fossil fuel whose vast reserves made the kingdom an economic power.', a: 'Petroleum', category: 'gcc', difficulty: 2, alt: ['Oil'] },
      { q: 'The fruit-bearing tree whose dates and shade are iconic of the desert kingdom.', a: 'Palm tree', category: 'gcc', difficulty: 3, alt: ['Date palm'] },
      { q: 'The annual journey of the faithful to the holy city, the broad English word for such a sacred trip.', a: 'Pilgrimage', category: 'gcc', difficulty: 2 },
    ],
    G: [
      { q: 'The vast house of worship in the holy city that encloses the Kaaba, the largest in the world, known in Arabic by this two-word name.', a: 'Masjid al-Haram', category: 'gcc', difficulty: 3, alt: ['Grand Mosque', 'Great Mosque of Mecca'] },
      { q: 'The traditional coffee, lightly roasted and spiced with cardamom, served to guests.', a: 'Gahwa', category: 'gcc', difficulty: 4, alt: ['Arabic coffee', 'Qahwa'] },
    ],
    O: [
      { q: 'The black liquid resource, the kingdom\'s dominant export for decades.', a: 'Oil', category: 'gcc', difficulty: 1, alt: ['Petroleum'] },
      { q: 'The cartel of petroleum-exporting nations of which the kingdom is the leading member.', a: 'OPEC', category: 'gcc', difficulty: 3 },
      { q: 'The lush green area in the desert, watered by springs, where date palms and towns grow.', a: 'Oasis', category: 'gcc', difficulty: 2 },
    ],
    E: [
      { q: 'The English nickname for the great southern sand sea, the Rub al Khali.', a: 'Empty Quarter', category: 'gcc', difficulty: 2 },
      { q: 'The oil-rich administrative region of the kingdom lying along the Gulf coast.', a: 'Eastern Province', category: 'gcc', difficulty: 3 },
    ],
    B: [
      { q: 'The desert-dwelling nomadic Arab peoples whose heritage shapes Gulf culture.', a: 'Bedouin', category: 'gcc', difficulty: 2 },
      { q: 'The incense resin and its smoke, used to perfume homes and clothing across the Gulf.', a: 'Bukhoor', category: 'gcc', difficulty: 4 },
      { q: 'The men\'s gold-trimmed ceremonial cloak worn over the thobe at weddings and formal events.', a: 'Bisht', category: 'gcc', difficulty: 4 },
    ],
    F: [
      { q: 'The hunting bird trained for sport, a prized symbol of Arabian heritage.', a: 'Falcon', category: 'gcc', difficulty: 2 },
      { q: 'The set of basic religious duties — creed, prayer, charity, fasting and pilgrimage — every Muslim observes.', a: 'Five Pillars', category: 'gcc', difficulty: 3 },
      { q: 'The aromatic resin from Arabian trees, burned for its sweet smoke since antiquity.', a: 'Frankincense', category: 'gcc', difficulty: 4, alt: ['Luban'] },
    ],
    Q: [
      { q: 'The central religious text of Islam, believed revealed to the Prophet.', a: 'Quran', category: 'gcc', difficulty: 2, alt: ['Koran'] },
    ],
    W: [
      { q: 'The conservative Islamic reform movement historically associated with the kingdom\'s founding.', a: 'Wahhabism', category: 'gcc', difficulty: 4 },
    ],
    C: [
      { q: 'The aromatic spice, dried and added to traditional Gulf coffee, with a green pod.', a: 'Cardamom', category: 'gcc', difficulty: 3 },
      { q: 'The dromedary, the single-humped desert animal central to Bedouin life and racing.', a: 'Camel', category: 'gcc', difficulty: 1 },
      { q: 'The honorific the king holds as protector of the two holy mosques, often translated as guardian.', a: 'Custodian', category: 'gcc', difficulty: 4 },
    ],
    L: [
      { q: 'The fried sweet dough balls drizzled with date syrup, a beloved Gulf dessert.', a: 'Luqaimat', category: 'gcc', difficulty: 4 },
    ],
    Y: [
      { q: 'The country bordering the kingdom to the south, sharing a long mountainous frontier.', a: 'Yemen', category: 'gcc', difficulty: 2 },
    ],
  },
};

export const uaePack: RawPack = {
  id: 'uae',
  name: 'United Arab Emirates',
  description: 'Trivia on the seven emirates — skyscrapers, Sheikh Zayed, falcons and the desert.',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🇦🇪',
  accent: '#00732f',
  letters: {
    A: [
      { q: 'The federal capital of the country and largest of the seven emirates by area.', a: 'Abu Dhabi', category: 'gcc', difficulty: 2 },
      { q: 'The flowing black over-garment traditionally worn by Emirati women in public.', a: 'Abaya', category: 'gcc', difficulty: 4 },
      { q: 'The inland garden city by Oman, a UNESCO site famous for its oases and the country\'s only mountain hot springs.', a: 'Al Ain', category: 'gcc', difficulty: 4 },
      { q: 'The smallest emirate by area, a city-state wedged along the coast just north of Sharjah.', a: 'Ajman', category: 'gcc', difficulty: 4 },
    ],
    D: [
      { q: 'The most populous emirate and city, a global hub for trade, tourism and finance.', a: 'Dubai', category: 'gcc', difficulty: 1 },
      { q: 'The saltwater inlet that splits the largest city in two, its historic trading heart crossed by abra water-taxis.', a: 'Dubai Creek', category: 'gcc', difficulty: 3 },
      { q: 'The traditional wooden Arabian sailing boat once used for pearling and trade.', a: 'Dhow', category: 'gcc', difficulty: 3 },
      { q: 'The fruit of the palm, a dietary staple and traditional welcome across the country.', a: 'Dates', category: 'gcc', difficulty: 2 },
      { q: 'The currency of the country, divided into 100 fils.', a: 'Dirham', category: 'gcc', difficulty: 2 },
      { q: 'The white ankle-length men\'s robe, called kandura locally, known by this name in nearby Oman and elsewhere.', a: 'Dishdasha', category: 'gcc', difficulty: 4 },
      { q: 'The world\'s deepest swimming pool, a diving attraction in the largest city that opened in 2021.', a: 'Deep Dive Dubai', category: 'gcc', difficulty: 5 },
      { q: 'The dry, hot inland terrain of rolling sand that covers most of the country\'s interior.', a: 'Desert', category: 'gcc', difficulty: 1 },
    ],
    B: [
      { q: 'The tallest building in the world, a tapering spire in the country\'s largest city.', a: 'Burj Khalifa', category: 'gcc', difficulty: 2 },
      { q: 'The sail-shaped luxury hotel on its own island, an icon of the largest city.', a: 'Burj Al Arab', category: 'gcc', difficulty: 3 },
      { q: 'The desert-dwelling nomadic Arab peoples whose heritage underpins the nation\'s culture.', a: 'Bedouin', category: 'gcc', difficulty: 2 },
      { q: 'The men\'s formal gold-trimmed cloak worn over the kandura on ceremonial occasions.', a: 'Bisht', category: 'gcc', difficulty: 4 },
      { q: 'The smoke from this fragrant wood and resin perfumes Emirati majlis gatherings.', a: 'Bukhoor', category: 'gcc', difficulty: 4 },
    ],
    S: [
      { q: 'The founding father and first president of the country, who united the emirates in 1971.', a: 'Sheikh Zayed', category: 'gcc', difficulty: 2, alt: ['Zayed', 'Zayed bin Sultan'] },
      { q: 'The vast white domed house of worship in the capital, named after the founding president.', a: 'Sheikh Zayed Mosque', category: 'gcc', difficulty: 3, alt: ['Grand Mosque'] },
      { q: 'The cultural emirate, a UNESCO-recognised Arab cultural capital north of the largest city.', a: 'Sharjah', category: 'gcc', difficulty: 3 },
      { q: 'The cultural island in the capital that is home to the Louvre branch and other museums.', a: 'Saadiyat', category: 'gcc', difficulty: 4, alt: ['Saadiyat Island'] },
      { q: 'The covered traditional gold-and-spice markets that draw tourists to the old quarter of the largest city.', a: 'Souk', category: 'gcc', difficulty: 3, alt: ['Souq'] },
      { q: 'The wind-sculpted ridges of fine grains that roll across the country\'s vast interior deserts.', a: 'Sand dunes', category: 'gcc', difficulty: 2 },
    ],
    F: [
      { q: 'The political term for the union of seven self-governing states under one national government, formed in 1971.', a: 'Federation', category: 'gcc', difficulty: 3, alt: ['Federal union'] },
      { q: 'The hunting bird trained for sport, the national bird and a symbol of heritage.', a: 'Falcon', category: 'gcc', difficulty: 2 },
      { q: 'The traditional Bedouin practice of training birds of prey to hunt, recognised by UNESCO as living heritage.', a: 'Falconry', category: 'gcc', difficulty: 3 },
      { q: 'The northern emirate facing the Gulf of Oman, the only one entirely on the east coast.', a: 'Fujairah', category: 'gcc', difficulty: 4 },
      { q: 'The smaller unit of the country\'s currency, with 100 making one dirham.', a: 'Fils', category: 'gcc', difficulty: 3 },
      { q: 'The motor sport whose Grand Prix is held on Yas Island each year, often the season finale.', a: 'Formula One', category: 'gcc', difficulty: 3, alt: ['F1'] },
    ],
    P: [
      { q: 'The artificial tree-shaped island built off the coast of the largest city.', a: 'Palm Jumeirah', category: 'gcc', difficulty: 2, alt: ['The Palm'] },
      { q: 'The harvesting of these gems from oyster beds was the region\'s main industry before oil.', a: 'Pearls', category: 'gcc', difficulty: 2, alt: ['Pearling'] },
      { q: 'The fossil fuel whose discovery transformed the country\'s economy in the 1960s.', a: 'Petroleum', category: 'gcc', difficulty: 2, alt: ['Oil'] },
      { q: 'The head-of-state office of the federation, held by the ruler of Abu Dhabi by convention.', a: 'President', category: 'gcc', difficulty: 3 },
    ],
    L: [
      { q: 'The famous French-partnered art museum that opened on Saadiyat Island in the capital in 2017.', a: 'Louvre Abu Dhabi', category: 'gcc', difficulty: 3 },
      { q: 'The fried sweet dough balls in date syrup, a popular Emirati dessert.', a: 'Luqaimat', category: 'gcc', difficulty: 4 },
      { q: 'The crescent of oases on the edge of the Empty Quarter, ancestral home of the ruling family of the capital.', a: 'Liwa', category: 'gcc', difficulty: 5 },
    ],
    R: [
      { q: 'The northernmost emirate, known for its mountains and beaches near the Strait of Hormuz.', a: 'Ras Al Khaimah', category: 'gcc', difficulty: 4, alt: ['RAK'] },
      { q: 'The Islamic fasting month observed across the country.', a: 'Ramadan', category: 'gcc', difficulty: 2 },
      { q: 'The visionary founding ruler of Dubai who built its port and modern infrastructure, by his first name.', a: 'Rashid', category: 'gcc', difficulty: 5, alt: ['Sheikh Rashid'] },
    ],
    U: [
      { q: 'The quiet northern emirate on the Gulf coast between Ajman and Ras Al Khaimah, lightly populated.', a: 'Umm Al Quwain', category: 'gcc', difficulty: 5 },
      { q: 'The world cultural body whose Heritage list includes Al Ain\'s oases and historic Sharjah.', a: 'UNESCO', category: 'gcc', difficulty: 4 },
    ],
    E: [
      { q: 'The word for each of the seven member states that make up the federation.', a: 'Emirate', category: 'gcc', difficulty: 2 },
      { q: 'The national flag carrier based in the capital, distinct from the larger Dubai airline.', a: 'Etihad', category: 'gcc', difficulty: 4, alt: ['Etihad Airways'] },
      { q: 'The flag carrier based in the largest city, one of the world\'s busiest long-haul carriers.', a: 'Emirates airline', category: 'gcc', difficulty: 3, alt: ['Emirates'] },
    ],
    K: [
      { q: 'The traditional white ankle-length men\'s robe worn across the country.', a: 'Kandura', category: 'gcc', difficulty: 3, alt: ['Dishdasha'] },
      { q: 'The fishing town and beach resort on the country\'s rugged east coast, a Sharjah exclave on the Gulf of Oman.', a: 'Khor Fakkan', category: 'gcc', difficulty: 5 },
    ],
    G: [
      { q: 'The traditional spiced coffee served to guests as a sign of hospitality.', a: 'Gahwa', category: 'gcc', difficulty: 4, alt: ['Arabic coffee', 'Qahwa'] },
      { q: 'The arm of the sea on which six of the seven emirates have their main coastline.', a: 'Gulf', category: 'gcc', difficulty: 2, alt: ['Arabian Gulf', 'Persian Gulf'] },
    ],
    C: [
      { q: 'The single-humped desert animal raced for sport and central to Bedouin heritage.', a: 'Camel', category: 'gcc', difficulty: 1 },
      { q: 'The aromatic green-podded spice flavouring traditional Gulf coffee.', a: 'Cardamom', category: 'gcc', difficulty: 3 },
      { q: 'The Emirati sport in which jockeys ride dromedaries around a track, now often with robot riders.', a: 'Camel racing', category: 'gcc', difficulty: 3 },
    ],
    O: [
      { q: 'The country bordering the emirates to the east and south, around the Musandam peninsula.', a: 'Oman', category: 'gcc', difficulty: 2 },
      { q: 'The shellfish from which the region\'s historic pearl industry harvested its treasure.', a: 'Oyster', category: 'gcc', difficulty: 3 },
      { q: 'The lush green watered spot in the desert where towns and date farms grew before modern cities.', a: 'Oasis', category: 'gcc', difficulty: 2 },
      { q: 'The black liquid whose 1960s discovery turned a poor pearling coast into one of the world\'s richest nations.', a: 'Oil', category: 'gcc', difficulty: 1, alt: ['Petroleum'] },
    ],
    M: [
      { q: 'The shopping centre beside Burj Khalifa, among the world\'s biggest by area, drawing tens of millions of visitors a year.', a: 'Dubai Mall', category: 'gcc', difficulty: 3, alt: ['The Dubai Mall'] },
      { q: 'The reception room where Emiratis traditionally welcome guests, also the word for a consultative council.', a: 'Majlis', category: 'gcc', difficulty: 4 },
      { q: 'The coastal salt-tolerant trees whose protected forests line the capital\'s shoreline and shelter wildlife.', a: 'Mangroves', category: 'gcc', difficulty: 4 },
    ],
    J: [
      { q: 'The coastal district of the largest city famous for its beach and the sail-shaped hotel.', a: 'Jumeirah', category: 'gcc', difficulty: 3 },
      { q: 'The vast deep-water port and free-trade zone south of the largest city, one of the world\'s busiest.', a: 'Jebel Ali', category: 'gcc', difficulty: 5 },
    ],
    H: [
      { q: 'The narrow waterway between the emirates region and Iran through which much oil ships.', a: 'Hormuz', category: 'gcc', difficulty: 3, alt: ['Strait of Hormuz'] },
      { q: 'The duty of welcoming and generously feeding guests, a deeply held Bedouin and Emirati value.', a: 'Hospitality', category: 'gcc', difficulty: 3 },
    ],
    N: [
      { q: 'How many emirates united on 2 December 1971, before a seventh joined the following year?', a: 'Six', category: 'gcc', difficulty: 4 },
    ],
    W: [
      { q: 'The valley channels that flow only after rare desert rains, dotting the landscape.', a: 'Wadi', category: 'gcc', difficulty: 4 },
      { q: 'The traditional tall chimney-like structure that funnelled cooling breezes into old Gulf houses before electricity.', a: 'Wind tower', category: 'gcc', difficulty: 4, alt: ['Barjeel'] },
    ],
    T: [
      { q: 'The English noun for the many record-breaking skyscrapers built across the country.', a: 'Towers', category: 'gcc', difficulty: 2 },
    ],
    Y: [
      { q: 'The leisure island in the capital that hosts a Ferrari theme park, a waterpark and the Grand Prix track.', a: 'Yas Island', category: 'gcc', difficulty: 4 },
    ],
  },
};

export const gulfPack: RawPack = {
  id: 'gulf-culture',
  name: 'Gulf Culture & Geography',
  description: 'Qatar, Kuwait, Oman and the wider Gulf — capitals, food, the sea and shared heritage.',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🌅',
  accent: '#b8860b',
  letters: {
    D: [
      { q: 'The capital of Qatar, a skyline city on the western shore of the Gulf.', a: 'Doha', category: 'gcc', difficulty: 2 },
      { q: 'The traditional wooden Arabian sailing vessel used for pearling and trade.', a: 'Dhow', category: 'gcc', difficulty: 3 },
      { q: 'The fruit of the palm, a staple food and welcome gift across the region.', a: 'Dates', category: 'gcc', difficulty: 1 },
      { q: 'The currency of Kuwait and Bahrain, among the highest-valued monetary units in the world.', a: 'Dinar', category: 'gcc', difficulty: 3 },
      { q: 'The white ankle-length men\'s robe, the everyday garment of Omani and Gulf men.', a: 'Dishdasha', category: 'gcc', difficulty: 4, alt: ['Kandura', 'Thobe'] },
    ],
    K: [
      { q: 'The country at the head of the Gulf bordering Iraq, invaded in 1990.', a: 'Kuwait', category: 'gcc', difficulty: 2, alt: ['Kuwait City'] },
      { q: 'The trio of slender concrete spires topped with blue-tiled water spheres, the seafront icon of the city north of Bahrain.', a: 'Kuwait Towers', category: 'gcc', difficulty: 4 },
      { q: 'The Omani port and fjord-cruise town at the tip of Musandam, near the Strait of Hormuz.', a: 'Khasab', category: 'gcc', difficulty: 5 },
    ],
    M: [
      { q: 'The capital of Oman, a coastal city flanked by mountains and old forts.', a: 'Muscat', category: 'gcc', difficulty: 3 },
      { q: 'The spiced rice-and-meat dish, Qatar and Kuwait\'s national favourite.', a: 'Machboos', category: 'gcc', difficulty: 3, alt: ['Majboos'] },
      { q: 'The peninsula of Oman jutting toward Iran at the mouth of the Gulf, separated from the rest of the country.', a: 'Musandam', category: 'gcc', difficulty: 5 },
      { q: 'The Bahraini capital and largest city, on the northeast coast of the kingdom\'s main island.', a: 'Manama', category: 'gcc', difficulty: 3 },
    ],
    B: [
      { q: 'The island nation in the Gulf connected to Saudi Arabia by a long causeway.', a: 'Bahrain', category: 'gcc', difficulty: 2 },
      { q: 'The desert-dwelling nomadic Arab peoples whose traditions shape Gulf culture.', a: 'Bedouin', category: 'gcc', difficulty: 2 },
      { q: 'The men\'s gold-trimmed ceremonial cloak worn over the everyday robe at formal Gulf events.', a: 'Bisht', category: 'gcc', difficulty: 4 },
      { q: 'The fragrant wood-and-resin incense burned to perfume Gulf homes and majlis gatherings.', a: 'Bukhoor', category: 'gcc', difficulty: 4 },
    ],
    Q: [
      { q: 'The peninsula nation that hosted the 2022 football World Cup.', a: 'Qatar', category: 'gcc', difficulty: 2 },
      { q: 'The roasted, spiced coffee poured for guests across the Gulf, by its Arabic name.', a: 'Qahwa', category: 'gcc', difficulty: 4, alt: ['Gahwa', 'Arabic coffee'] },
    ],
    O: [
      { q: 'The sultanate at the south-eastern corner of the Arabian Peninsula, famed for frankincense.', a: 'Oman', category: 'gcc', difficulty: 2 },
      { q: 'The cartel of petroleum exporters to which most Gulf states belong.', a: 'OPEC', category: 'gcc', difficulty: 3 },
      { q: 'The shellfish prised open by Gulf divers in search of the natural pearls that built the old economy.', a: 'Oyster', category: 'gcc', difficulty: 3 },
    ],
    G: [
      { q: 'The political and economic bloc of six Arabian states founded in 1981, by its initials.', a: 'GCC', category: 'gcc', difficulty: 2, alt: ['Gulf Cooperation Council'] },
      { q: 'The traditional spiced coffee served to guests across the region.', a: 'Gahwa', category: 'gcc', difficulty: 4, alt: ['Arabic coffee', 'Qahwa'] },
    ],
    H: [
      { q: 'The slow-cooked porridge of wheat and meat eaten especially during Ramadan.', a: 'Harees', category: 'gcc', difficulty: 4, alt: ['Jareesh'] },
      { q: 'The narrow strait at the Gulf\'s mouth, a vital chokepoint for oil shipping.', a: 'Hormuz', category: 'gcc', difficulty: 3, alt: ['Strait of Hormuz'] },
      { q: 'The sticky, fragrant Omani confection of sugar, ghee, rosewater and saffron served to guests with coffee.', a: 'Halwa', category: 'gcc', difficulty: 4, alt: ['Omani halwa'] },
      { q: 'The duty of warmly welcoming and feeding guests, a core Arab and Gulf social value.', a: 'Hospitality', category: 'gcc', difficulty: 3 },
      { q: 'The pilgrimage to the holy city that draws Muslims from across the Gulf each year.', a: 'Hajj', category: 'gcc', difficulty: 2 },
    ],
    L: [
      { q: 'The fried sweet dumplings drenched in date syrup, a classic Gulf dessert.', a: 'Luqaimat', category: 'gcc', difficulty: 4 },
    ],
    P: [
      { q: 'The harvesting of these gems from oyster beds was the Gulf\'s economy before oil.', a: 'Pearls', category: 'gcc', difficulty: 2, alt: ['Pearling'] },
      { q: 'The fossil fuel that transformed the wealth of every Gulf state.', a: 'Petroleum', category: 'gcc', difficulty: 2, alt: ['Oil'] },
      { q: 'The other common English name for the Gulf, used especially by Iran.', a: 'Persian Gulf', category: 'gcc', difficulty: 3 },
      { q: 'The deep-water harbour and free-trade zone, this English noun names the coastal facilities that drive Gulf trade.', a: 'Ports', category: 'gcc', difficulty: 3 },
      { q: 'The act of worshipping five times a day facing the holy city, a pillar of the region\'s faith.', a: 'Prayer', category: 'gcc', difficulty: 2 },
    ],
    A: [
      { q: 'The preferred Arab name for the body of water between the peninsula and Iran.', a: 'Arabian Gulf', category: 'gcc', difficulty: 3 },
      { q: 'The Doha-based news network, one of the most watched in the Arab world.', a: 'Al Jazeera', category: 'gcc', difficulty: 3 },
      { q: 'The body of water south of Oman, part of the Indian Ocean, that the sultanate\'s long southern coast faces.', a: 'Arabian Sea', category: 'gcc', difficulty: 3 },
      { q: 'The small wooden water-taxi that ferries people across the creek of the Emirates\' largest city.', a: 'Abra', category: 'gcc', difficulty: 5 },
      { q: 'The great desert covering most of the peninsula, whose southern sand sea is the largest continuous expanse of sand on Earth.', a: 'Arabian Desert', category: 'gcc', difficulty: 4, alt: ['Rub al Khali', 'Empty Quarter'] },
    ],
    R: [
      { q: 'The currency of Oman and Qatar, divided into smaller units like baisa or dirhams.', a: 'Rial', category: 'gcc', difficulty: 3, alt: ['Riyal'] },
      { q: 'The Islamic fasting month observed throughout the Gulf.', a: 'Ramadan', category: 'gcc', difficulty: 2 },
    ],
    F: [
      { q: 'The hunting bird trained for sport, a shared symbol of Gulf heritage.', a: 'Falcon', category: 'gcc', difficulty: 2 },
      { q: 'The aromatic resin from Oman\'s trees, burned for its fragrant smoke since antiquity.', a: 'Frankincense', category: 'gcc', difficulty: 3, alt: ['Luban'] },
      { q: 'The smaller unit of Gulf currencies, with 100 or 1,000 making up the larger coin.', a: 'Fils', category: 'gcc', difficulty: 3 },
      { q: 'The team sport whose 2022 World Cup, the first in the Arab world, was hosted in Qatar.', a: 'Football', category: 'gcc', difficulty: 1, alt: ['Soccer'] },
    ],
    C: [
      { q: 'The single-humped desert animal raced and revered across the Gulf.', a: 'Camel', category: 'gcc', difficulty: 1 },
      { q: 'The bridge-and-embankment crossing linking Bahrain to Saudi Arabia, named for a Saudi monarch.', a: 'King Fahd Causeway', category: 'gcc', difficulty: 4, alt: ['Causeway'] },
      { q: 'The aromatic green-podded spice that flavours the region\'s traditional coffee.', a: 'Cardamom', category: 'gcc', difficulty: 3 },
      { q: 'The seaside promenade lining the waterfronts of Doha, Muscat and other Gulf cities, a French-derived word.', a: 'Corniche', category: 'gcc', difficulty: 4 },
    ],
    S: [
      { q: 'The title of Oman\'s ruler and former ruler of several Gulf states.', a: 'Sultan', category: 'gcc', difficulty: 3 },
      { q: 'The covered traditional market found at the heart of Gulf cities.', a: 'Souk', category: 'gcc', difficulty: 3, alt: ['Souq'] },
      { q: 'The wind-sculpted ridges of fine grains that form the great deserts of the peninsula.', a: 'Sand dunes', category: 'gcc', difficulty: 3 },
      { q: 'The flavoured water pipe shared socially in Gulf cafés, known elsewhere as a hookah.', a: 'Shisha', category: 'gcc', difficulty: 3, alt: ['Hookah'] },
      { q: 'The form of monarchy by which Oman is governed, its ruler holding a title above an emir or sheikh.', a: 'Sultanate', category: 'gcc', difficulty: 3 },
      { q: 'The southern Omani city whose hills turn green in the monsoon khareef season, drawing Gulf tourists.', a: 'Salalah', category: 'gcc', difficulty: 5 },
    ],
    T: [
      { q: 'The white men\'s robe of the Gulf, called kandura or dishdasha in some states.', a: 'Thobe', category: 'gcc', difficulty: 3 },
      { q: 'The historic exchange of pearls, dates and spices by sea that built the Gulf ports before oil.', a: 'Trade', category: 'gcc', difficulty: 2 },
    ],
    W: [
      { q: 'The dry desert valley that carries water only after rare rains.', a: 'Wadi', category: 'gcc', difficulty: 4 },
      { q: 'The traditional tall chimney that funnelled cooling breezes into Gulf homes before air conditioning.', a: 'Wind tower', category: 'gcc', difficulty: 4, alt: ['Barjeel'] },
    ],
    E: [
      { q: 'The federation of seven states on the southern Gulf coast, by its short name.', a: 'Emirates', category: 'gcc', difficulty: 2, alt: ['UAE'] },
      { q: 'The title of the rulers of Qatar and Kuwait, ranking below a king.', a: 'Emir', category: 'gcc', difficulty: 3 },
    ],
    N: [
      { q: 'The historic interior Omani town and former capital, known for its great round fort and silver souk.', a: 'Nizwa', category: 'gcc', difficulty: 5 },
      { q: 'The gas resource, abundant in Qatar\'s offshore North Field, that the emirate exports in liquefied form worldwide.', a: 'Natural gas', category: 'gcc', difficulty: 3, alt: ['LNG'] },
    ],
    I: [
      { q: 'The religion practised by the great majority across all the Gulf states.', a: 'Islam', category: 'gcc', difficulty: 1 },
      { q: 'The large neighbour across the Gulf to the north and east, a non-Arab state.', a: 'Iran', category: 'gcc', difficulty: 2 },
      { q: 'The Arab country at the head of the Gulf, north of Kuwait, whose 1990 invasion sparked a war.', a: 'Iraq', category: 'gcc', difficulty: 2 },
    ],
    Y: [
      { q: 'The country at the southern tip of Arabia, south of Saudi Arabia and west of Oman.', a: 'Yemen', category: 'gcc', difficulty: 2 },
    ],
  },
};
