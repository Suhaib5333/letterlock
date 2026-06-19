import type { RawQuestion } from '../core/packs';

// Top-up questions for the Bahrain pack, targeting the skinny letters V and Z.
// Grouped here by the first letter of the answer for readability; `rebucketByAnswer`
// in index.ts re-files every question by its answer's true first letter at load time,
// so the grouping is purely a human aid.
export const bahrainGaps: Record<string, RawQuestion[]> = {
  V: [
    {
      q: 'The net-and-ball court sport overseen since 1976 by the kingdom\'s federation of the same name; the men\'s under-21 side won the FIVB world championship in 2023.',
      a: 'Volleyball',
      category: 'bahrain',
      difficulty: 3,
    },
    {
      q: 'The long-term economic plan launched by King Hamad in October 2008 to wean the kingdom off oil and grow its private sector by the year named in the plan.',
      a: 'Vision 2030',
      category: 'bahrain',
      difficulty: 4,
      alt: ['Bahrain Vision 2030', 'Economic Vision 2030'],
    },
  ],
  Z: [
    {
      q: 'The southern Manama suburb whose name comes from a Persian word for "black", divided into Old and New halves and lying near the Sheikh Isa bin Salman highway.',
      a: 'Zinj',
      category: 'bahrain',
      difficulty: 4,
    },
    {
      q: 'The village on the western coast of the main island, in the Southern Governorate, known for its long beach and the nearby Al Areen wildlife park.',
      a: 'Zallaq',
      category: 'bahrain',
      difficulty: 4,
      alt: ['Az Zallaq', 'Az Zallāq'],
    },
    {
      q: 'The town on the northwest tip of Qatar that the ruling Al Khalifa family used as their base before crossing the water to conquer the islands in 1783.',
      a: 'Zubarah',
      category: 'bahrain',
      difficulty: 5,
      alt: ['Al Zubarah', 'Zubara'],
    },
    {
      q: 'The prominent Bahraini merchant family whose holding group, founded in 1977, runs Euro Motors and whose member Zayed has served as Minister of Industry, Commerce and Tourism.',
      a: 'Zayani',
      category: 'bahrain',
      difficulty: 5,
      alt: ['Al-Zayani', 'Alzayani'],
    },
    {
      q: 'The ancient Persian fire-revering faith that was practised across eastern Arabia, including greater Bahrain, in the pre-Islamic Sassanid era.',
      a: 'Zoroastrianism',
      category: 'bahrain',
      difficulty: 5,
    },
  ],
};
