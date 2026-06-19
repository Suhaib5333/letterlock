import type { RawQuestion } from '../core/packs';

export const saudiArabiaGaps: Record<string, RawQuestion[]> = {
  V: [
    { q: 'The entry permit foreign pilgrims must obtain to travel to Mecca for Hajj or Umrah.', a: 'Visa', category: 'gcc', difficulty: 3 },
  ],
  W: [
    { q: 'The central Hajj ritual of standing in prayer on the plain of Arafat on the ninth of Dhul-Hijjah.', a: 'Wukuf', category: 'gcc', difficulty: 5, alt: ['Wuquf'] },
    { q: 'The wedding banquet a Muslim groom is expected to host to celebrate a marriage, recommended in the Sunnah.', a: 'Walima', category: 'gcc', difficulty: 5, alt: ['Waleemah', 'Walimah'] },
    { q: 'The southernmost town of Riyadh Province at the head of a long dry valley that shares its name, on the edge of the Empty Quarter.', a: 'Wadi al-Dawasir', category: 'gcc', difficulty: 5, alt: ['Wadi ad-Dawasir'] },
    { q: 'The odd-numbered voluntary night prayer Muslims perform after Isha and before dawn, closing the day\'s worship.', a: 'Witr', category: 'gcc', difficulty: 5 },
  ],
  L: [
    { q: 'The British officer who fought alongside Sharif Hussein\'s forces in the 1916 revolt against the Ottomans in the Hejaz, by the famous epithet he is known by in English.', a: 'Lawrence of Arabia', category: 'gcc', difficulty: 4, alt: ['T.E. Lawrence', 'TE Lawrence', 'Thomas Edward Lawrence'] },
    { q: 'The ancient North Arabian kingdom centred at Dadan, near modern Al-Ula, that flourished before the rise of the Nabataeans.', a: 'Lihyan', category: 'gcc', difficulty: 5, alt: ['Lihyanites', 'Lihyanite'] },
  ],
  Y: [
    { q: 'The pre-Islamic name of the city the Prophet migrated to in 622 CE, later renamed for the Prophet himself.', a: 'Yathrib', category: 'gcc', difficulty: 5 },
    { q: 'The name traditionally given to the twelve months around the Prophet Muhammad\'s birth, recalling an Abyssinian general\'s ill-fated march on Mecca with a great beast at its head.', a: 'Year of the Elephant', category: 'gcc', difficulty: 5, alt: ['Am al-Fil', "'Am al-Fil"] },
  ],
  Z: [
    { q: 'The midday obligatory prayer, the second of the five daily prayers Muslims perform.', a: 'Zuhr', category: 'gcc', difficulty: 4, alt: ['Dhuhr'] },
    { q: 'The early Companion of the Prophet and nephew of Khadijah, counted among the ten promised paradise, slain after the Battle of the Camel in 656 CE.', a: 'Zubair', category: 'gcc', difficulty: 5, alt: ['Al-Zubayr', 'Az-Zubayr', 'Zubayr', 'Al-Zubayr ibn al-Awwam'] },
  ],
};
