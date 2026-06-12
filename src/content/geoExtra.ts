import type { RawQuestion } from '../core/packs';

export const geoExtra: Record<string, RawQuestion[]> = {
  N: [
    { q: 'The longest river in Africa, flowing north through Egypt to the Mediterranean.', a: 'Nile', category: 'geography', difficulty: 2 },
    { q: 'The Scandinavian country with a long fjord-lined western coast and capital Oslo.', a: 'Norway', category: 'geography', difficulty: 2 },
    { q: 'The Asian country whose capital is Kathmandu, home to the highest peaks on Earth.', a: 'Nepal', category: 'geography', difficulty: 3 },
  ],
  A: [
    { q: 'The longest river in South America, flowing through Brazil to the Atlantic.', a: 'Amazon', category: 'geography', difficulty: 2 },
    { q: 'The smallest continent, lying in the Southern Hemisphere.', a: 'Australia', category: 'geography', difficulty: 1 },
    { q: 'The frozen continent surrounding the South Pole.', a: 'Antarctica', category: 'geography', difficulty: 1 },
    { q: 'The mountain range running along the western edge of South America.', a: 'Andes', category: 'geography', difficulty: 3 },
  ],
  P: [
    { q: 'The largest and deepest ocean on Earth.', a: 'Pacific Ocean', category: 'geography', difficulty: 2 },
    { q: 'The capital of France.', a: 'Paris', category: 'geography', difficulty: 1 },
    { q: 'The Himalayan country whose capital is Islamabad.', a: 'Pakistan', category: 'geography', difficulty: 3 },
  ],
  S: [
    { q: 'The vast hot desert covering much of northern Africa.', a: 'Sahara', category: 'geography', difficulty: 2 },
    { q: 'The city-state at the southern tip of the Malay Peninsula.', a: 'Singapore', category: 'geography', difficulty: 2 },
    { q: 'The waterway in Egypt linking the Mediterranean to the Red Sea.', a: 'Suez Canal', category: 'geography', difficulty: 3 },
    { q: 'The Scandinavian country whose capital is Stockholm.', a: 'Sweden', category: 'geography', difficulty: 2 },
  ],
  M: [
    { q: 'The longest river in North America by some measures, joining the Mississippi.', a: 'Missouri River', category: 'geography', difficulty: 4 },
    { q: 'The North African kingdom whose capital is Rabat.', a: 'Morocco', category: 'geography', difficulty: 3 },
    { q: 'The active volcano in Sicily, the tallest in Europe outside the Caucasus.', a: 'Mount Etna', category: 'geography', difficulty: 4 },
  ],
  V: [
    { q: 'The longest river in Europe, flowing through Russia to the Caspian Sea.', a: 'Volga', category: 'geography', difficulty: 4 },
    { q: 'The smallest sovereign state in the world, an enclave within Rome.', a: 'Vatican City', category: 'geography', difficulty: 3 },
  ],
  K: [
    { q: 'The highest mountain in Africa, a dormant volcano in Tanzania.', a: 'Kilimanjaro', category: 'geography', difficulty: 3 },
    { q: 'The capital of Ukraine.', a: 'Kyiv', category: 'geography', difficulty: 3 },
  ],
  E: [
    { q: 'The highest mountain on Earth, on the Nepal–Tibet border.', a: 'Everest', category: 'geography', difficulty: 2 },
    { q: 'The longest country in Africa from north to south along the Nile.', a: 'Egypt', category: 'geography', difficulty: 2 },
  ],
  B: [
    { q: 'The largest country in South America by area.', a: 'Brazil', category: 'geography', difficulty: 1 },
    { q: 'The Belgian city that serves as the de facto capital of the European Union.', a: 'Brussels', category: 'geography', difficulty: 3 },
  ],
  C: [
    { q: 'The longest river in Asia, flowing through China to the East China Sea.', a: 'Yangtze', category: 'geography', difficulty: 4, alt: ['changjiang'] },
    { q: 'The capital of Australia.', a: 'Canberra', category: 'geography', difficulty: 3 },
  ],
  G: [
    { q: 'The narrow waterway separating Spain from Morocco at the mouth of the Mediterranean.', a: 'Strait of Gibraltar', category: 'geography', difficulty: 4 },
    { q: 'The large body of water bordered by Texas, Florida, and the Yucatán Peninsula.', a: 'Gulf of Mexico', category: 'geography', difficulty: 3 },
  ],
  H: [
    { q: 'The towering mountain system separating the Indian subcontinent from Tibet.', a: 'Himalayas', category: 'geography', difficulty: 2 },
    { q: 'The capital of Cuba.', a: 'Havana', category: 'geography', difficulty: 3 },
  ],
  L: [
    { q: 'The capital of the United Kingdom.', a: 'London', category: 'geography', difficulty: 1 },
    { q: 'The largest lake in Africa by surface area, bordered by three nations.', a: 'Lake Victoria', category: 'geography', difficulty: 4 },
  ],
  T: [
    { q: 'The busy shipping strait separating Peninsular Malaysia from the Indonesian island of Sumatra.', a: 'Strait of Malacca', category: 'geography', difficulty: 5, alt: ['malacca'] },
    { q: 'The river flowing through London past the Houses of Parliament.', a: 'Thames', category: 'geography', difficulty: 3 },
  ],
  D: [
    { q: 'The river flowing through Vienna, Budapest, and Belgrade to the Black Sea.', a: 'Danube', category: 'geography', difficulty: 3 },
    { q: 'The cold coastal desert of southwestern Africa, among the oldest on Earth.', a: 'Namib Desert', category: 'geography', difficulty: 5, alt: ['namib'] },
  ],
  R: [
    { q: 'The longest river system in the United States, draining much of the central plains.', a: 'Mississippi', category: 'geography', difficulty: 3 },
    { q: 'The vast red-sand desert at the heart of Australia, named for a British monarch.', a: 'Great Victoria Desert', category: 'geography', difficulty: 4 },
  ],
  I: [
    { q: 'The island nation southeast of Australia whose capital is Wellington.', a: 'New Zealand', category: 'geography', difficulty: 2 },
    { q: 'The large island country in the Indian Ocean off the coast of Mozambique.', a: 'Madagascar', category: 'geography', difficulty: 3 },
  ],
  O: [
    { q: 'The smallest of the world’s five named oceans, surrounding the North Pole.', a: 'Arctic Ocean', category: 'geography', difficulty: 3 },
    { q: 'The freshwater lake on the Canada–US border, the smallest of the Great Lakes.', a: 'Lake Ontario', category: 'geography', difficulty: 4 },
  ],
  W: [
    { q: 'The thunderous falls on the Zambezi River between Zambia and Zimbabwe.', a: 'Victoria Falls', category: 'geography', difficulty: 4 },
    { q: 'The capital of Poland.', a: 'Warsaw', category: 'geography', difficulty: 3 },
  ],
  F: [
    { q: 'The largest peninsular nation of Scandinavia known for thousands of lakes; its capital is Helsinki.', a: 'Finland', category: 'geography', difficulty: 3 },
  ],
  J: [
    { q: 'The longest river in the Holy Land, flowing into the Dead Sea.', a: 'Jordan River', category: 'geography', difficulty: 4 },
  ],
  Y: [
    { q: 'The peninsula of Mexico that juts into the Caribbean, dotted with Mayan ruins.', a: 'Yucatán', category: 'geography', difficulty: 4 },
  ],
  U: [
    { q: 'The river forming much of the eastern border of Argentina, sharing its name with a small neighbouring republic.', a: 'Uruguay River', category: 'geography', difficulty: 5 },
  ],
};
