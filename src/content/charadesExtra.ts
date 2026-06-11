import type { RawQuestion } from '../core/packs';

// Expansion batches for the Charades packs. Same rules as charades.ts:
// `q` is a generic acting instruction that never contains the answer, `a` is the
// thing to act out (category 'charade'). Images attach automatically in code, so
// no image fields here. Each answer is bucketed under the FIRST LETTER of its
// answer. These are all NEW words — none duplicate charades.ts.

const ACT = 'Act this out — no talking!';
const MIME = 'Mime it for your team!';
const ACT2 = 'Act it out — no words!';
const DRAW = 'Act or draw it — no words!';
const SHOW = 'Show it without speaking!';
const NOW = 'No talking — perform it!';

export const charadesEasyExtra: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Alarm clock', category: 'charade' },
    { q: MIME, a: 'Astronaut helmet', category: 'charade' },
  ],
  B: [
    { q: ACT2, a: 'Brushing hair', category: 'charade' },
    { q: DRAW, a: 'Boots', category: 'charade' },
    { q: SHOW, a: 'Butterfly net', category: 'charade' },
  ],
  C: [
    { q: NOW, a: 'Camera', category: 'charade' },
    { q: ACT, a: 'Candle', category: 'charade' },
    { q: MIME, a: 'Cooking', category: 'charade' },
  ],
  D: [
    { q: ACT2, a: 'Drum', category: 'charade' },
    { q: DRAW, a: 'Door', category: 'charade' },
  ],
  F: [
    { q: SHOW, a: 'Flashlight', category: 'charade' },
    { q: ACT, a: 'Fan', category: 'charade' },
  ],
  G: [
    { q: MIME, a: 'Glasses', category: 'charade' },
    { q: ACT2, a: 'Gift', category: 'charade' },
  ],
  H: [
    { q: DRAW, a: 'Hat', category: 'charade' },
    { q: SHOW, a: 'Hammer', category: 'charade' },
  ],
  I: [{ q: NOW, a: 'Ice skating', category: 'charade' }],
  K: [
    { q: ACT, a: 'Key', category: 'charade' },
    { q: MIME, a: 'Kettle', category: 'charade' },
  ],
  L: [
    { q: ACT2, a: 'Ladder', category: 'charade' },
    { q: DRAW, a: 'Lamp', category: 'charade' },
  ],
  M: [{ q: SHOW, a: 'Mirror', category: 'charade' }],
  N: [{ q: ACT, a: 'Necklace', category: 'charade' }],
  O: [{ q: MIME, a: 'Opening a jar', category: 'charade' }],
  P: [
    { q: ACT2, a: 'Pillow', category: 'charade' },
    { q: DRAW, a: 'Pizza', category: 'charade' },
    { q: SHOW, a: 'Phone call', category: 'charade' },
  ],
  Q: [{ q: NOW, a: 'Queen', category: 'charade' }],
  R: [
    { q: ACT, a: 'Rainbow', category: 'charade' },
    { q: MIME, a: 'Robot', category: 'charade' },
  ],
  S: [
    { q: ACT2, a: 'Scissors', category: 'charade' },
    { q: DRAW, a: 'Snowman', category: 'charade' },
    { q: SHOW, a: 'Skateboard', category: 'charade' },
  ],
  T: [
    { q: NOW, a: 'Toothbrush', category: 'charade' },
    { q: ACT, a: 'Tying shoes', category: 'charade' },
  ],
  U: [{ q: MIME, a: 'Unicorn', category: 'charade' }],
  V: [{ q: ACT2, a: 'Vacuuming', category: 'charade' }],
  W: [
    { q: DRAW, a: 'Watch', category: 'charade' },
    { q: SHOW, a: 'Wheelbarrow', category: 'charade' },
  ],
};

export const charadesAnimalsExtra: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Anteater', category: 'charade' },
    { q: MIME, a: 'Armadillo', category: 'charade' },
  ],
  B: [
    { q: ACT2, a: 'Buffalo', category: 'charade' },
    { q: DRAW, a: 'Beaver', category: 'charade' },
  ],
  C: [
    { q: SHOW, a: 'Cheetah', category: 'charade' },
    { q: ACT, a: 'Cow', category: 'charade' },
  ],
  D: [
    { q: MIME, a: 'Donkey', category: 'charade' },
    { q: ACT2, a: 'Dragonfly', category: 'charade' },
  ],
  F: [
    { q: DRAW, a: 'Falcon', category: 'charade' },
    { q: SHOW, a: 'Ferret', category: 'charade' },
  ],
  G: [
    { q: NOW, a: 'Gecko', category: 'charade' },
    { q: ACT, a: 'Goose', category: 'charade' },
  ],
  H: [
    { q: MIME, a: 'Hamster', category: 'charade' },
    { q: ACT2, a: 'Hawk', category: 'charade' },
  ],
  I: [{ q: DRAW, a: 'Iguana', category: 'charade' }],
  K: [
    { q: SHOW, a: 'Koala', category: 'charade' },
    { q: ACT, a: 'Kitten', category: 'charade' },
  ],
  L: [
    { q: MIME, a: 'Leopard', category: 'charade' },
    { q: ACT2, a: 'Lobster', category: 'charade' },
  ],
  M: [{ q: DRAW, a: 'Moose', category: 'charade' }],
  N: [{ q: SHOW, a: 'Newt', category: 'charade' }],
  O: [
    { q: ACT, a: 'Otter', category: 'charade' },
    { q: MIME, a: 'Ox', category: 'charade' },
  ],
  P: [
    { q: ACT2, a: 'Pig', category: 'charade' },
    { q: DRAW, a: 'Polar bear', category: 'charade' },
    { q: SHOW, a: 'Porcupine', category: 'charade' },
  ],
  R: [
    { q: NOW, a: 'Raccoon', category: 'charade' },
    { q: ACT, a: 'Rooster', category: 'charade' },
  ],
  S: [
    { q: MIME, a: 'Seal', category: 'charade' },
    { q: ACT2, a: 'Squirrel', category: 'charade' },
    { q: DRAW, a: 'Sheep', category: 'charade' },
  ],
  T: [
    { q: SHOW, a: 'Toad', category: 'charade' },
    { q: ACT, a: 'Tortoise', category: 'charade' },
  ],
  V: [{ q: MIME, a: 'Vulture', category: 'charade' }],
  W: [
    { q: ACT2, a: 'Walrus', category: 'charade' },
    { q: DRAW, a: 'Woodpecker', category: 'charade' },
  ],
  Y: [{ q: SHOW, a: 'Yak', category: 'charade' }],
};

export const charadesMoviesExtra: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Aquaman', category: 'charade' },
    { q: MIME, a: 'Antz', category: 'charade' },
  ],
  B: [
    { q: ACT2, a: 'Brave', category: 'charade' },
    { q: DRAW, a: 'Big Hero 6', category: 'charade' },
  ],
  C: [
    { q: SHOW, a: 'Cruella', category: 'charade' },
    { q: ACT, a: 'Casablanca', category: 'charade' },
  ],
  D: [{ q: MIME, a: 'Despicable Me', category: 'charade' }],
  F: [
    { q: ACT2, a: 'Footloose', category: 'charade' },
    { q: DRAW, a: 'Fantasia', category: 'charade' },
  ],
  G: [
    { q: SHOW, a: 'Grease', category: 'charade' },
    { q: ACT, a: 'Godzilla', category: 'charade' },
  ],
  I: [{ q: MIME, a: 'Iron Man', category: 'charade' }],
  J: [{ q: ACT2, a: 'Jumanji', category: 'charade' }],
  K: [{ q: DRAW, a: 'King Kong', category: 'charade' }],
  L: [
    { q: NOW, a: 'Lilo and Stitch', category: 'charade' },
    { q: SHOW, a: 'Luca', category: 'charade' },
  ],
  M: [
    { q: ACT, a: 'Mary Poppins', category: 'charade' },
    { q: MIME, a: 'Minions', category: 'charade' },
    { q: ACT2, a: 'Mulan', category: 'charade' },
  ],
  O: [{ q: DRAW, a: 'Onward', category: 'charade' }],
  P: [
    { q: SHOW, a: 'Peter Pan', category: 'charade' },
    { q: ACT, a: 'Pirates of the Caribbean', category: 'charade' },
  ],
  R: [
    { q: MIME, a: 'Ratatouille', category: 'charade' },
    { q: ACT2, a: 'Robin Hood', category: 'charade' },
  ],
  S: [
    { q: DRAW, a: 'Sing', category: 'charade' },
    { q: SHOW, a: 'Snow White', category: 'charade' },
    { q: ACT, a: 'Soul', category: 'charade' },
  ],
  T: [
    { q: MIME, a: 'Tangled', category: 'charade' },
    { q: ACT2, a: 'Terminator', category: 'charade' },
    { q: DRAW, a: 'Top Gun', category: 'charade' },
  ],
  V: [{ q: SHOW, a: 'Vaiana', category: 'charade' }],
  W: [
    { q: ACT, a: 'Wonder Woman', category: 'charade' },
    { q: MIME, a: 'Wreck-It Ralph', category: 'charade' },
  ],
  X: [{ q: ACT2, a: 'X-Men', category: 'charade' }],
};

export const charadesActionsExtra: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Acrobat', category: 'charade' },
    { q: MIME, a: 'Applauding', category: 'charade' },
  ],
  B: [
    { q: ACT2, a: 'Barber', category: 'charade' },
    { q: DRAW, a: 'Baseball', category: 'charade' },
    { q: SHOW, a: 'Builder', category: 'charade' },
  ],
  C: [
    { q: NOW, a: 'Carpenter', category: 'charade' },
    { q: ACT, a: 'Cricket', category: 'charade' },
  ],
  D: [
    { q: MIME, a: 'Detective', category: 'charade' },
    { q: ACT2, a: 'Digging', category: 'charade' },
  ],
  E: [{ q: DRAW, a: 'Electrician', category: 'charade' }],
  F: [
    { q: SHOW, a: 'Farmer', category: 'charade' },
    { q: ACT, a: 'Fencing', category: 'charade' },
  ],
  G: [{ q: MIME, a: 'Goalkeeper', category: 'charade' }],
  H: [
    { q: ACT2, a: 'Hairdresser', category: 'charade' },
    { q: DRAW, a: 'Hurdling', category: 'charade' },
  ],
  I: [{ q: SHOW, a: 'Ironing', category: 'charade' }],
  J: [{ q: ACT, a: 'Jogging', category: 'charade' }],
  K: [{ q: MIME, a: 'Knitting', category: 'charade' }],
  L: [{ q: ACT2, a: 'Librarian', category: 'charade' }],
  M: [
    { q: DRAW, a: 'Mopping', category: 'charade' },
    { q: SHOW, a: 'Musician', category: 'charade' },
  ],
  P: [
    { q: NOW, a: 'Police officer', category: 'charade' },
    { q: ACT, a: 'Ping pong', category: 'charade' },
  ],
  R: [
    { q: MIME, a: 'Referee', category: 'charade' },
    { q: ACT2, a: 'Reporter', category: 'charade' },
  ],
  S: [
    { q: DRAW, a: 'Sailor', category: 'charade' },
    { q: SHOW, a: 'Skateboarding', category: 'charade' },
    { q: ACT, a: 'Sculptor', category: 'charade' },
  ],
  T: [
    { q: MIME, a: 'Tailor', category: 'charade' },
    { q: ACT2, a: 'Tightrope walking', category: 'charade' },
  ],
  V: [{ q: DRAW, a: 'Veterinarian', category: 'charade' }],
  W: [
    { q: SHOW, a: 'Weightlifting', category: 'charade' },
    { q: ACT, a: 'Wrestling', category: 'charade' },
  ],
  Y: [{ q: MIME, a: 'Yodeling', category: 'charade' }],
};

export const charadesHardExtra: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Ambition', category: 'charade' },
    { q: MIME, a: 'Architecture', category: 'charade' },
  ],
  B: [
    { q: ACT2, a: 'Betrayal', category: 'charade' },
    { q: DRAW, a: 'Bravery', category: 'charade' },
  ],
  C: [
    { q: SHOW, a: 'Chaos', category: 'charade' },
    { q: ACT, a: 'Compassion', category: 'charade' },
  ],
  D: [
    { q: MIME, a: 'Diplomacy', category: 'charade' },
    { q: ACT2, a: 'Dizziness', category: 'charade' },
  ],
  E: [
    { q: DRAW, a: 'Echo', category: 'charade' },
    { q: SHOW, a: 'Embarrassment', category: 'charade' },
  ],
  F: [
    { q: ACT, a: 'Fame', category: 'charade' },
    { q: MIME, a: 'Forgiveness', category: 'charade' },
  ],
  G: [{ q: ACT2, a: 'Generosity', category: 'charade' }],
  H: [
    { q: DRAW, a: 'Harmony', category: 'charade' },
    { q: SHOW, a: 'Hypnosis', category: 'charade' },
  ],
  I: [{ q: ACT, a: 'Intuition', category: 'charade' }],
  J: [{ q: MIME, a: 'Justice', category: 'charade' }],
  K: [{ q: ACT2, a: 'Kindness', category: 'charade' }],
  L: [
    { q: NOW, a: 'Levitation', category: 'charade' },
    { q: DRAW, a: 'Luck', category: 'charade' },
  ],
  M: [{ q: SHOW, a: 'Mystery', category: 'charade' }],
  O: [{ q: ACT, a: 'Optimism', category: 'charade' }],
  P: [
    { q: MIME, a: 'Panic', category: 'charade' },
    { q: ACT2, a: 'Pollution', category: 'charade' },
  ],
  Q: [{ q: DRAW, a: 'Quicksand', category: 'charade' }],
  R: [
    { q: SHOW, a: 'Rebellion', category: 'charade' },
    { q: ACT, a: 'Romance', category: 'charade' },
  ],
  S: [
    { q: MIME, a: 'Stress', category: 'charade' },
    { q: ACT2, a: 'Sympathy', category: 'charade' },
  ],
  T: [
    { q: DRAW, a: 'Tradition', category: 'charade' },
    { q: SHOW, a: 'Trust', category: 'charade' },
  ],
  V: [{ q: ACT, a: 'Victory', category: 'charade' }],
  W: [
    { q: MIME, a: 'Warmth', category: 'charade' },
    { q: ACT2, a: 'Whirlpool', category: 'charade' },
  ],
};
