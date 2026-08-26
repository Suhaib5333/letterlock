/**
 * The answer-leak rules, shared by the content tests and `scripts/leaks.mjs`.
 * A question must never contain its own answer. Lives here rather than inside the
 * test so tooling that reports leaks can never drift from what the test enforces.
 */

// Generic head-nouns that legitimately appear in both a clue and a multi-word
// answer (e.g. "ocean" in "Pacific Ocean") - only the DISTINCTIVE word leaking is a bug.
const GENERIC = new Set([
    'ocean', 'sea', 'river', 'lake', 'mountain', 'desert', 'island', 'city', 'year', 'day',
    'number', 'angle', 'triangle', 'square', 'circle', 'scale', 'note', 'rock', 'stone',
    'jersey', 'jump', 'race', 'racing', 'kick', 'vault', 'match', 'test', 'set', 'sets',
    'point', 'points', 'sport', 'game', 'team', 'trophy', 'stadium', 'derby', 'tour',
    'bowler', 'animal', 'bird', 'fish', 'tree', 'plant', 'flower', 'colour', 'color',
    'shape', 'meal', 'pastry', 'moon', 'phase', 'chromosome', 'pulsar', 'star', 'wonder',
    'half', 'clef', 'song', 'dance', 'opera', 'concerto', 'symphony',
    // space / science head-nouns
    'velocity', 'spacecraft', 'programme', 'program', 'mission', 'station', 'cluster',
    'galaxy', 'planet', 'nebula', 'comet', 'asteroid', 'meteor', 'telescope', 'probe',
    'ring', 'rings', 'belt', 'field', 'tilt', 'orbit', 'light', 'sun', 'system', 'effect',
    'force', 'energy', 'wave', 'particle', 'acid', 'element', 'organ', 'gland', 'disease',
    'instrument', 'theory', 'reaction', 'cloud', 'crater', 'tide', 'eclipse', 'matter',
    // geography head-nouns
    'mount', 'cape', 'gulf', 'bay', 'strait', 'range', 'peak', 'falls', 'kingdom',
    'country', 'nation', 'capital', 'republic', 'sea', 'union',
    // history / culture head-nouns
    'war', 'battle', 'treaty', 'empire', 'dynasty', 'revolution', 'coup', 'code', 'age', 'period',
    'era', 'century', 'king', 'queen', 'emperor', 'pope', 'saint', 'language', 'alphabet',
    // buildings / structures / organisations (generic head-nouns)
    'mosque', 'tower', 'towers', 'studio', 'palace', 'fort', 'castle', 'bridge', 'temple',
    'cathedral', 'stadium', 'circuit', 'causeway', 'governorate', 'emirate',
    // sports head-nouns
    'medal', 'league', 'club', 'final', 'open', 'championship', 'tournament', 'event',
    'jersey', 'cup', 'goal', 'series', 'cricket', 'football', 'tennis', 'golf', 'rugby',
    // screen / music head-nouns
    'film', 'movie', 'show', 'series', 'award', 'prize', 'band', 'novel', 'poem', 'play',
    'genre', 'sonata', 'overture', 'painting', 'opera', 'god', 'goddess', 'myth',
    // faith descriptors + pronouns/common words that legitimately recur
    'islam', 'islamic', 'muslim', 'christian', 'buddhist', 'hindu', 'jewish', 'faith',
    'your', 'this', 'that', 'them', 'with', 'from', 'into',
  ]);

// The English check tokenizes on [^a-z0-9], which erases Arabic entirely, so
// Arabic packs get this twin: tokenize on the Arabic block, strip a leading "ال".
const AR_GENERIC = new Set([
    'دولة', 'مدينة', 'عاصمة', 'نهر', 'جبل', 'بحر', 'قارة', 'لغة', 'عملة', 'كتاب',
    'سورة', 'نبي', 'ملك', 'حيوان', 'طائر', 'كوكب', 'لعبة', 'فريق', 'نادي', 'بطولة',
    'شاعر', 'كاتب', 'عالم', 'مسجد', 'برج', 'جزيرة', 'خليج', 'صحراء', 'قناة', 'ميناء',
  ]);
const stripAl = (w: string) => (/^ال./.test(w) ? w.slice(2) : w);

function leaksEn(q: string, a: string): boolean {
  const ql = ` ${q.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `;
  const words = a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = words.filter((w) => w.length >= 4);
  if (meaningful.length === 0) return false; // short answers exempt (rarely leak)
  if (words.length === 1) return ql.includes(` ${words[0]} `); // single-word answer present = leak
  if (ql.includes(` ${words.join(' ')} `)) return true; // whole phrase present
  return meaningful.some((w) => !GENERIC.has(w) && ql.includes(` ${w} `)); // distinctive word present
}

function leaksAr(q: string, a: string): boolean {
  const qWords = new Set(q.split(/[^ء-ي]+/).filter(Boolean).map(stripAl));
  const aWords = a.split(/[^ء-ي]+/).filter(Boolean).map(stripAl);
  return aWords.some((w) => w.length >= 3 && !AR_GENERIC.has(w) && qWords.has(w));
}

/** True if this question gives its own answer away. Locale picks the tokenizer. */
export function leaks(q: { q: string; a: string }, locale = 'en'): boolean {
  return locale.startsWith('ar') ? leaksAr(q.q, q.a) : leaksEn(q.q, q.a);
}
