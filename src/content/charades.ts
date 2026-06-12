import type { RawPack } from '../core/packs';

// Charades packs: the player secretly sees the answer (and an attached image) and
// acts / mimes / draws it for their team. `q` is a generic acting instruction (it
// must never contain the answer), `a` is the thing to act out. Letters are hidden
// on the board (hideBoardLetters) so the first letter never gives the answer away.
// Each answer is bucketed under the FIRST LETTER of its answer.

const ACT = 'Act this out — no talking!';
const MIME = 'Mime it for your team!';
const ACT2 = 'Act it out!';
const DRAW = 'Act or draw it — no words!';
const SHOW = 'Show it without speaking!';

export const charadesEasyPack: RawPack = {
  id: 'charades-easy',
  name: 'Charades · Easy',
  description: 'Act out everyday things — no words allowed!',
  locale: 'en',
  difficulty: 'easy',
  contentRating: 'everyone',
  emoji: '🎭',
  accent: '#7c3aed',
  hideBoardLetters: true,
  letters: {
    A: [
      { q: ACT, a: 'Airplane', category: 'charade' },
      { q: MIME, a: 'Apple', category: 'charade' },
    ],
    B: [
      { q: ACT2, a: 'Brushing teeth', category: 'charade' },
      { q: DRAW, a: 'Bicycle', category: 'charade' },
      { q: SHOW, a: 'Banana', category: 'charade' },
      { q: ACT, a: 'Ball', category: 'charade' },
    ],
    C: [
      { q: MIME, a: 'Cat', category: 'charade' },
      { q: ACT2, a: 'Clapping', category: 'charade' },
      { q: DRAW, a: 'Crying', category: 'charade' },
      { q: SHOW, a: 'Car', category: 'charade' },
    ],
    D: [
      { q: ACT, a: 'Dancing', category: 'charade' },
      { q: MIME, a: 'Dog', category: 'charade' },
      { q: ACT2, a: 'Drinking', category: 'charade' },
    ],
    E: [
      { q: SHOW, a: 'Eating', category: 'charade' },
    ],
    F: [
      { q: MIME, a: 'Flower', category: 'charade' },
      { q: ACT2, a: 'Falling down', category: 'charade' },
    ],
    G: [
      { q: DRAW, a: 'Guitar', category: 'charade' },
      { q: SHOW, a: 'Giggling', category: 'charade' },
    ],
    H: [
      { q: ACT, a: 'Hopping', category: 'charade' },
      { q: MIME, a: 'Hugging', category: 'charade' },
    ],
    I: [{ q: DRAW, a: 'Ice cream', category: 'charade' }],
    J: [{ q: SHOW, a: 'Jumping', category: 'charade' }],
    K: [
      { q: ACT, a: 'Kicking a ball', category: 'charade' },
      { q: MIME, a: 'Kite', category: 'charade' },
    ],
    L: [{ q: ACT2, a: 'Laughing', category: 'charade' }],
    M: [
      { q: DRAW, a: 'Munching', category: 'charade' },
    ],
    N: [{ q: ACT, a: 'Nodding', category: 'charade' }],
    O: [{ q: MIME, a: 'Opening a door', category: 'charade' }],
    P: [
      { q: ACT2, a: 'Piano', category: 'charade' },
      { q: DRAW, a: 'Painting', category: 'charade' },
      { q: SHOW, a: 'Pointing', category: 'charade' },
    ],
    R: [
      { q: ACT, a: 'Ripping paper', category: 'charade' },
      { q: ACT2, a: 'Reading', category: 'charade' },
    ],
    S: [
      { q: DRAW, a: 'Swimming', category: 'charade' },
      { q: SHOW, a: 'Sleeping', category: 'charade' },
      { q: MIME, a: 'Sneezing', category: 'charade' },
      { q: ACT, a: 'Shivering', category: 'charade' },
      { q: ACT2, a: 'Stirring a pot', category: 'charade' },
      { q: DRAW, a: 'Sneakers', category: 'charade' },
    ],
    T: [
      { q: MIME, a: 'Tickling', category: 'charade' },
      { q: ACT, a: 'Tying shoelaces', category: 'charade' },
      { q: ACT2, a: 'Telephone', category: 'charade' },
      { q: DRAW, a: 'Tree', category: 'charade' },
      { q: SHOW, a: 'Tiptoeing', category: 'charade' },
    ],
    U: [{ q: ACT, a: 'Umbrella', category: 'charade' }],
    V: [{ q: MIME, a: 'Violin', category: 'charade' }],
    W: [
      { q: ACT2, a: 'Waving', category: 'charade' },
      { q: DRAW, a: 'Walking', category: 'charade' },
      { q: SHOW, a: 'Washing hands', category: 'charade' },
    ],
    Y: [{ q: ACT, a: 'Yawning', category: 'charade' }],
  },
};

export const charadesAnimalsPack: RawPack = {
  id: 'charades-animals',
  name: 'Charades · Animals',
  description: 'Become the beast — act out every animal!',
  locale: 'en',
  difficulty: 'easy',
  contentRating: 'everyone',
  emoji: '🦁',
  accent: '#16a34a',
  hideBoardLetters: true,
  letters: {
    A: [
      { q: ACT, a: 'Alligator', category: 'charade' },
      { q: MIME, a: 'Ant', category: 'charade' },
    ],
    B: [
      { q: ACT2, a: 'Bear', category: 'charade' },
      { q: DRAW, a: 'Butterfly', category: 'charade' },
      { q: SHOW, a: 'Bat', category: 'charade' },
      { q: ACT, a: 'Bee', category: 'charade' },
    ],
    C: [
      { q: MIME, a: 'Crocodile', category: 'charade' },
      { q: ACT2, a: 'Crab', category: 'charade' },
      { q: DRAW, a: 'Camel', category: 'charade' },
      { q: SHOW, a: 'Chicken', category: 'charade' },
    ],
    D: [
      { q: ACT, a: 'Dolphin', category: 'charade' },
      { q: MIME, a: 'Duck', category: 'charade' },
      { q: ACT2, a: 'Deer', category: 'charade' },
    ],
    E: [
      { q: DRAW, a: 'Eagle', category: 'charade' },
      { q: SHOW, a: 'Elephant', category: 'charade' },
    ],
    F: [
      { q: ACT, a: 'Frog', category: 'charade' },
      { q: MIME, a: 'Flamingo', category: 'charade' },
      { q: ACT2, a: 'Fox', category: 'charade' },
    ],
    G: [
      { q: DRAW, a: 'Gorilla', category: 'charade' },
      { q: SHOW, a: 'Giraffe', category: 'charade' },
      { q: ACT, a: 'Goat', category: 'charade' },
    ],
    H: [
      { q: MIME, a: 'Horse', category: 'charade' },
      { q: ACT2, a: 'Hippo', category: 'charade' },
      { q: DRAW, a: 'Hedgehog', category: 'charade' },
    ],
    J: [{ q: SHOW, a: 'Jellyfish', category: 'charade' }],
    K: [{ q: ACT, a: 'Kangaroo', category: 'charade' }],
    L: [
      { q: MIME, a: 'Lion', category: 'charade' },
      { q: ACT2, a: 'Lizard', category: 'charade' },
    ],
    M: [
      { q: DRAW, a: 'Monkey', category: 'charade' },
      { q: SHOW, a: 'Mouse', category: 'charade' },
    ],
    O: [
      { q: ACT, a: 'Octopus', category: 'charade' },
      { q: MIME, a: 'Owl', category: 'charade' },
      { q: ACT2, a: 'Ostrich', category: 'charade' },
    ],
    P: [
      { q: DRAW, a: 'Penguin', category: 'charade' },
      { q: SHOW, a: 'Parrot', category: 'charade' },
      { q: ACT, a: 'Peacock', category: 'charade' },
      { q: MIME, a: 'Panda', category: 'charade' },
    ],
    R: [
      { q: ACT2, a: 'Rabbit', category: 'charade' },
      { q: DRAW, a: 'Rhino', category: 'charade' },
    ],
    S: [
      { q: SHOW, a: 'Snake', category: 'charade' },
      { q: ACT, a: 'Shark', category: 'charade' },
      { q: MIME, a: 'Spider', category: 'charade' },
      { q: ACT2, a: 'Snail', category: 'charade' },
    ],
    T: [
      { q: DRAW, a: 'Tiger', category: 'charade' },
      { q: SHOW, a: 'Turtle', category: 'charade' },
      { q: ACT, a: 'Turkey', category: 'charade' },
    ],
    W: [
      { q: MIME, a: 'Whale', category: 'charade' },
      { q: ACT2, a: 'Wolf', category: 'charade' },
    ],
    Z: [{ q: DRAW, a: 'Zebra', category: 'charade' }],
  },
};

export const charadesMoviesPack: RawPack = {
  id: 'charades-movies',
  name: 'Charades · Movies & TV',
  description: 'Act out famous movies and TV shows — silence on set!',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🎬',
  accent: '#e11d48',
  hideBoardLetters: true,
  letters: {
    A: [
      { q: ACT, a: 'Avatar', category: 'charade' },
      { q: MIME, a: 'Aladdin', category: 'charade' },
      { q: ACT2, a: 'Avengers', category: 'charade' },
    ],
    B: [
      { q: DRAW, a: 'Batman', category: 'charade' },
      { q: SHOW, a: 'Bambi', category: 'charade' },
      { q: ACT, a: 'Beauty and the Beast', category: 'charade' },
    ],
    C: [
      { q: MIME, a: 'Cinderella', category: 'charade' },
      { q: ACT2, a: 'Coco', category: 'charade' },
      { q: DRAW, a: 'Cars', category: 'charade' },
    ],
    D: [
      { q: SHOW, a: 'Dumbo', category: 'charade' },
      { q: ACT, a: 'Dune', category: 'charade' },
    ],
    E: [{ q: MIME, a: 'Encanto', category: 'charade' }],
    F: [
      { q: ACT2, a: 'Frozen', category: 'charade' },
      { q: DRAW, a: 'Finding Nemo', category: 'charade' },
      { q: SHOW, a: 'Forrest Gump', category: 'charade' },
    ],
    G: [
      { q: ACT, a: 'Gladiator', category: 'charade' },
      { q: MIME, a: 'Ghostbusters', category: 'charade' },
    ],
    H: [
      { q: ACT2, a: 'Hercules', category: 'charade' },
      { q: DRAW, a: 'Home Alone', category: 'charade' },
      { q: SHOW, a: 'Harry Potter', category: 'charade' },
    ],
    I: [
      { q: ACT, a: 'Inception', category: 'charade' },
      { q: MIME, a: 'Inside Out', category: 'charade' },
    ],
    J: [
      { q: ACT2, a: 'Jaws', category: 'charade' },
      { q: DRAW, a: 'Jurassic Park', category: 'charade' },
      { q: SHOW, a: 'Joker', category: 'charade' },
    ],
    K: [{ q: ACT, a: 'Kung Fu Panda', category: 'charade' }],
    L: [{ q: MIME, a: 'La La Land', category: 'charade' }],
    M: [
      { q: ACT2, a: 'Moana', category: 'charade' },
      { q: DRAW, a: 'The Matrix', category: 'charade' },
      { q: SHOW, a: 'Madagascar', category: 'charade' },
    ],
    N: [{ q: ACT, a: 'The Notebook', category: 'charade' }],
    P: [
      { q: MIME, a: 'Pinocchio', category: 'charade' },
      { q: ACT2, a: 'Pocahontas', category: 'charade' },
    ],
    R: [
      { q: DRAW, a: 'Rocky', category: 'charade' },
      { q: SHOW, a: 'Ratatouille', category: 'charade' },
    ],
    S: [
      { q: ACT, a: 'Shrek', category: 'charade' },
      { q: MIME, a: 'Spider-Man', category: 'charade' },
      { q: ACT2, a: 'Star Wars', category: 'charade' },
      { q: DRAW, a: 'Superman', category: 'charade' },
    ],
    T: [
      { q: SHOW, a: 'Titanic', category: 'charade' },
      { q: ACT, a: 'Tarzan', category: 'charade' },
      { q: MIME, a: 'Toy Story', category: 'charade' },
      { q: ACT2, a: 'The Lion King', category: 'charade' },
      { q: DRAW, a: 'The Wizard of Oz', category: 'charade' },
    ],
    U: [{ q: SHOW, a: 'Up', category: 'charade' }],
    W: [{ q: ACT, a: 'WALL-E', category: 'charade' }],
    Z: [{ q: MIME, a: 'Zootopia', category: 'charade' }],
  },
};

export const charadesActionsPack: RawPack = {
  id: 'charades-actions',
  name: 'Charades · Actions & Jobs',
  description: 'Mime sports, verbs and professions!',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🏃',
  accent: '#0ea5e9',
  hideBoardLetters: true,
  letters: {
    A: [
      { q: ACT, a: 'Astronaut', category: 'charade' },
      { q: MIME, a: 'Archery', category: 'charade' },
    ],
    B: [
      { q: ACT2, a: 'Boxing', category: 'charade' },
      { q: DRAW, a: 'Baking', category: 'charade' },
      { q: SHOW, a: 'Basketball', category: 'charade' },
      { q: ACT, a: 'Bowling', category: 'charade' },
    ],
    C: [
      { q: MIME, a: 'Chef', category: 'charade' },
      { q: ACT2, a: 'Climbing', category: 'charade' },
      { q: DRAW, a: 'Cycling', category: 'charade' },
    ],
    D: [
      { q: SHOW, a: 'Diving', category: 'charade' },
      { q: ACT, a: 'Doctor', category: 'charade' },
      { q: MIME, a: 'Drumming', category: 'charade' },
      { q: ACT2, a: 'Dentist', category: 'charade' },
    ],
    F: [
      { q: DRAW, a: 'Fishing', category: 'charade' },
      { q: SHOW, a: 'Firefighter', category: 'charade' },
    ],
    G: [
      { q: ACT, a: 'Golfing', category: 'charade' },
      { q: MIME, a: 'Gardening', category: 'charade' },
    ],
    H: [{ q: ACT2, a: 'Hiking', category: 'charade' }],
    J: [
      { q: DRAW, a: 'Juggling', category: 'charade' },
      { q: SHOW, a: 'Judge', category: 'charade' },
    ],
    K: [{ q: ACT, a: 'Karate', category: 'charade' }],
    L: [{ q: MIME, a: 'Lawyer', category: 'charade' }],
    M: [
      { q: ACT2, a: 'Magician', category: 'charade' },
      { q: DRAW, a: 'Mechanic', category: 'charade' },
    ],
    N: [{ q: SHOW, a: 'Nurse', category: 'charade' }],
    P: [
      { q: ACT, a: 'Painter', category: 'charade' },
      { q: MIME, a: 'Pilot', category: 'charade' },
      { q: ACT2, a: 'Photographer', category: 'charade' },
      { q: DRAW, a: 'Plumber', category: 'charade' },
    ],
    R: [
      { q: SHOW, a: 'Rowing', category: 'charade' },
      { q: ACT, a: 'Running', category: 'charade' },
    ],
    S: [
      { q: MIME, a: 'Surgeon', category: 'charade' },
      { q: ACT2, a: 'Skiing', category: 'charade' },
      { q: DRAW, a: 'Surfing', category: 'charade' },
      { q: SHOW, a: 'Sweeping', category: 'charade' },
      { q: ACT, a: 'Soldier', category: 'charade' },
    ],
    T: [
      { q: MIME, a: 'Teacher', category: 'charade' },
      { q: ACT2, a: 'Tennis', category: 'charade' },
      { q: DRAW, a: 'Typing', category: 'charade' },
    ],
    V: [{ q: SHOW, a: 'Voting', category: 'charade' }],
    W: [
      { q: ACT, a: 'Waiter', category: 'charade' },
      { q: MIME, a: 'Welding', category: 'charade' },
    ],
    Y: [{ q: ACT2, a: 'Yoga', category: 'charade' }],
  },
};

export const charadesHardPack: RawPack = {
  id: 'charades-hard',
  name: 'Charades · Hard',
  description: 'Mime the abstract — concepts, idioms and the impossible!',
  locale: 'en',
  difficulty: 'hard',
  contentRating: 'everyone',
  emoji: '🧠',
  accent: '#f59e0b',
  hideBoardLetters: true,
  letters: {
    A: [
      { q: ACT, a: 'Anxiety', category: 'charade' },
      { q: MIME, a: 'Avalanche', category: 'charade' },
    ],
    B: [
      { q: ACT2, a: 'Boredom', category: 'charade' },
      { q: DRAW, a: 'Bankruptcy', category: 'charade' },
    ],
    C: [
      { q: SHOW, a: 'Curiosity', category: 'charade' },
      { q: ACT, a: 'Claustrophobia', category: 'charade' },
      { q: MIME, a: 'Camouflage', category: 'charade' },
    ],
    D: [
      { q: ACT2, a: 'Déjà vu', category: 'charade' },
      { q: DRAW, a: 'Democracy', category: 'charade' },
    ],
    E: [
      { q: SHOW, a: 'Evolution', category: 'charade' },
      { q: ACT, a: 'Eternity', category: 'charade' },
      { q: MIME, a: 'Earthquake', category: 'charade' },
    ],
    F: [
      { q: ACT2, a: 'Freedom', category: 'charade' },
      { q: DRAW, a: 'Friction', category: 'charade' },
    ],
    G: [
      { q: SHOW, a: 'Gravity', category: 'charade' },
      { q: ACT, a: 'Globalization', category: 'charade' },
    ],
    H: [
      { q: MIME, a: 'Hibernation', category: 'charade' },
      { q: ACT2, a: 'Hurricane', category: 'charade' },
    ],
    I: [
      { q: DRAW, a: 'Inflation', category: 'charade' },
      { q: SHOW, a: 'Imagination', category: 'charade' },
    ],
    J: [{ q: ACT, a: 'Jealousy', category: 'charade' }],
    K: [{ q: MIME, a: 'Karma', category: 'charade' }],
    L: [{ q: ACT2, a: 'Loneliness', category: 'charade' }],
    M: [
      { q: DRAW, a: 'Magnetism', category: 'charade' },
      { q: SHOW, a: 'Meditation', category: 'charade' },
    ],
    N: [{ q: ACT, a: 'Nostalgia', category: 'charade' }],
    P: [
      { q: MIME, a: 'Photosynthesis', category: 'charade' },
      { q: ACT2, a: 'Procrastination', category: 'charade' },
      { q: DRAW, a: 'Patience', category: 'charade' },
    ],
    R: [
      { q: SHOW, a: 'Revolution', category: 'charade' },
      { q: ACT, a: 'Recycling', category: 'charade' },
    ],
    S: [
      { q: MIME, a: 'Stage fright', category: 'charade' },
      { q: ACT2, a: 'Superstition', category: 'charade' },
      { q: DRAW, a: 'Surrender', category: 'charade' },
    ],
    T: [
      { q: SHOW, a: 'Time travel', category: 'charade' },
      { q: ACT, a: 'Teamwork', category: 'charade' },
      { q: MIME, a: 'Temptation', category: 'charade' },
      { q: ACT2, a: 'Tornado', category: 'charade' },
    ],
    V: [{ q: DRAW, a: 'Volcano', category: 'charade' }],
    W: [
      { q: SHOW, a: 'Willpower', category: 'charade' },
      { q: ACT, a: 'Wisdom', category: 'charade' },
    ],
  },
};
