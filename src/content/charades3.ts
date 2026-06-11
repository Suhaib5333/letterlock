import type { RawQuestion } from '../core/packs';

// Charades expansion batch 3. Same rules as charades.ts / charadesExtra.ts /
// charades2a.ts / charades2b.ts: `q` is a generic acting instruction that never
// contains the answer, `a` is the thing to act out (category 'charade'). No image
// fields. Each answer is bucketed under the FIRST LETTER of its answer. Every word
// here is NEW — none duplicate any answer already present across charades.ts,
// charadesExtra.ts, charades2a.ts, or charades2b.ts.

const ACT = 'Act this out — no talking!';
const MIME = 'Mime it for your team!';
const ACT2 = 'Act it out — no words!';
const DRAW = 'Act or draw it — no words!';
const SHOW = 'Show it without speaking!';
const NOW = 'No talking — perform it!';
const PERF = 'Perform it silently!';
const GO = 'Go — make them guess it!';
const HUSH = 'Lips sealed — act it out!';

// ~70 NEW animals: more mammals, birds, sea creatures, insects, reptiles.
export const charadesAnimals3: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Anaconda', category: 'charade' },
    { q: MIME, a: 'Axolotl', category: 'charade' },
    { q: ACT2, a: 'Aphid', category: 'charade' },
  ],
  B: [
    { q: DRAW, a: 'Barracuda', category: 'charade' },
    { q: SHOW, a: 'Bullfrog', category: 'charade' },
    { q: NOW, a: 'Bumblebee', category: 'charade' },
    { q: ACT, a: 'Bobcat', category: 'charade' },
  ],
  C: [
    { q: MIME, a: 'Cockatoo', category: 'charade' },
    { q: ACT2, a: 'Coyote', category: 'charade' },
    { q: DRAW, a: 'Cricket bug', category: 'charade' },
    { q: SHOW, a: 'Crane', category: 'charade' },
    { q: HUSH, a: 'Caribou', category: 'charade' },
  ],
  D: [
    { q: ACT, a: 'Dormouse', category: 'charade' },
    { q: MIME, a: 'Dugong', category: 'charade' },
  ],
  E: [
    { q: DRAW, a: 'Echidna', category: 'charade' },
    { q: SHOW, a: 'Elk', category: 'charade' },
  ],
  F: [
    { q: NOW, a: 'Flounder', category: 'charade' },
    { q: ACT, a: 'Flying squirrel', category: 'charade' },
  ],
  G: [
    { q: ACT2, a: 'Gerbil', category: 'charade' },
    { q: DRAW, a: 'Gnat', category: 'charade' },
    { q: SHOW, a: 'Grizzly bear', category: 'charade' },
  ],
  H: [
    { q: ACT, a: 'Halibut', category: 'charade' },
    { q: MIME, a: 'Hagfish', category: 'charade' },
  ],
  I: [
    { q: DRAW, a: 'Ibis', category: 'charade' },
  ],
  J: [
    { q: ACT, a: 'Jellyfish bloom', category: 'charade' },
  ],
  K: [
    { q: ACT2, a: 'Krill', category: 'charade' },
    { q: DRAW, a: 'Komodo dragon', category: 'charade' },
  ],
  L: [
    { q: SHOW, a: 'Lobster trap', category: 'charade' },
    { q: ACT, a: 'Lemming', category: 'charade' },
    { q: MIME, a: 'Locust', category: 'charade' },
  ],
  M: [
    { q: ACT2, a: 'Mongoose', category: 'charade' },
    { q: DRAW, a: 'Mackerel', category: 'charade' },
    { q: SHOW, a: 'Macaw', category: 'charade' },
    { q: NOW, a: 'Marmot', category: 'charade' },
  ],
  N: [
    { q: ACT, a: 'Nautilus', category: 'charade' },
  ],
  O: [
    { q: MIME, a: 'Okapi', category: 'charade' },
    { q: ACT2, a: 'Opossum', category: 'charade' },
  ],
  P: [
    { q: DRAW, a: 'Pangolin', category: 'charade' },
    { q: SHOW, a: 'Piranha', category: 'charade' },
    { q: NOW, a: 'Possum', category: 'charade' },
    { q: ACT, a: 'Pug', category: 'charade' },
  ],
  Q: [
    { q: ACT2, a: 'Quetzal', category: 'charade' },
  ],
  R: [
    { q: DRAW, a: 'Raven', category: 'charade' },
    { q: SHOW, a: 'Roadrunner', category: 'charade' },
    { q: NOW, a: 'Rattlesnake', category: 'charade' },
  ],
  S: [
    { q: ACT, a: 'Sea lion', category: 'charade' },
    { q: MIME, a: 'Salmon', category: 'charade' },
    { q: ACT2, a: 'Squid', category: 'charade' },
    { q: DRAW, a: 'Swordtail', category: 'charade' },
    { q: SHOW, a: 'Seagull', category: 'charade' },
  ],
  T: [
    { q: ACT, a: 'Tapir', category: 'charade' },
    { q: MIME, a: 'Trout', category: 'charade' },
    { q: ACT2, a: 'Tarsier', category: 'charade' },
  ],
  U: [
    { q: DRAW, a: 'Uakari', category: 'charade' },
  ],
  V: [
    { q: SHOW, a: 'Vampire bat', category: 'charade' },
  ],
  W: [
    { q: NOW, a: 'Wallaby', category: 'charade' },
    { q: ACT, a: 'Wolverine', category: 'charade' },
    { q: MIME, a: 'Weevil', category: 'charade' },
  ],
};

// ~70 NEW verbs / professions / sports / hobbies / chores.
export const charadesActions3: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Astronomer', category: 'charade' },
    { q: MIME, a: 'Auto racing', category: 'charade' },
  ],
  B: [
    { q: SHOW, a: 'Baker', category: 'charade' },
    { q: ACT, a: 'Bricklaying', category: 'charade' },
    { q: MIME, a: 'Bobsledding', category: 'charade' },
    { q: ACT2, a: 'Brushing a dog', category: 'charade' },
  ],
  C: [
    { q: SHOW, a: 'Carpentry', category: 'charade' },
    { q: ACT, a: 'Cartographer', category: 'charade' },
    { q: MIME, a: 'Carrying groceries', category: 'charade' },
    { q: ACT2, a: 'Croquet', category: 'charade' },
  ],
  D: [
    { q: GO, a: 'Decorator', category: 'charade' },
    { q: ACT, a: 'Darts', category: 'charade' },
    { q: MIME, a: 'Drilling', category: 'charade' },
  ],
  E: [
    { q: DRAW, a: 'Embroidery', category: 'charade' },
    { q: NOW, a: 'Escaping a maze', category: 'charade' },
  ],
  F: [
    { q: ACT, a: 'Fortune teller', category: 'charade' },
    { q: MIME, a: 'Fly fishing', category: 'charade' },
  ],
  G: [
    { q: DRAW, a: 'Glassblowing', category: 'charade' },
    { q: ACT, a: 'Greengrocer', category: 'charade' },
  ],
  H: [
    { q: MIME, a: 'Harvesting', category: 'charade' },
    { q: ACT2, a: 'Horse riding', category: 'charade' },
    { q: SHOW, a: 'Hopscotch', category: 'charade' },
  ],
  I: [
    { q: GO, a: 'Illustrator', category: 'charade' },
  ],
  J: [
    { q: MIME, a: 'Javelin throw', category: 'charade' },
  ],
  K: [
    { q: DRAW, a: 'Kickboxing', category: 'charade' },
    { q: ACT, a: 'Knight', category: 'charade' },
  ],
  L: [
    { q: MIME, a: 'Lumberjack', category: 'charade' },
    { q: ACT2, a: 'Limbo dancing', category: 'charade' },
  ],
  M: [
    { q: NOW, a: 'Miner', category: 'charade' },
    { q: ACT, a: 'Marathon', category: 'charade' },
    { q: MIME, a: 'Massage therapist', category: 'charade' },
  ],
  N: [
    { q: DRAW, a: 'Newscaster', category: 'charade' },
  ],
  O: [
    { q: ACT, a: 'Origami', category: 'charade' },
  ],
  P: [
    { q: ACT2, a: 'Pharmacist', category: 'charade' },
    { q: DRAW, a: 'Parasailing', category: 'charade' },
    { q: SHOW, a: 'Polishing shoes', category: 'charade' },
    { q: NOW, a: 'Pottery wheel', category: 'charade' },
  ],
  R: [
    { q: ACT, a: 'Rugby', category: 'charade' },
    { q: MIME, a: 'Ranger', category: 'charade' },
    { q: ACT2, a: 'Rollerblading', category: 'charade' },
  ],
  S: [
    { q: NOW, a: 'Sculpting', category: 'charade' },
    { q: ACT, a: 'Shepherd', category: 'charade' },
    { q: MIME, a: 'Sumo wrestling', category: 'charade' },
    { q: ACT2, a: 'Sweeping a chimney', category: 'charade' },
    { q: PERF, a: 'Squash', category: 'charade' },
  ],
  T: [
    { q: ACT, a: 'Tobogganing', category: 'charade' },
    { q: MIME, a: 'Tour guide', category: 'charade' },
    { q: ACT2, a: 'Tying a tie', category: 'charade' },
  ],
  U: [
    { q: DRAW, a: 'Upholsterer', category: 'charade' },
  ],
  V: [
    { q: MIME, a: 'Vaulting', category: 'charade' },
  ],
  W: [
    { q: ACT2, a: 'Waxing a car', category: 'charade' },
    { q: DRAW, a: 'Whittling', category: 'charade' },
    { q: NOW, a: 'Wallpapering', category: 'charade' },
  ],
  Y: [
    { q: GO, a: 'Yarn spinning', category: 'charade' },
  ],
};

// ~70 NEW abstract concepts, idioms, emotions, phenomena.
export const charadesHard3: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Amnesia', category: 'charade' },
    { q: MIME, a: 'Absent-mindedness', category: 'charade' },
    { q: ACT2, a: 'Allergy', category: 'charade' },
  ],
  B: [
    { q: SHOW, a: 'Brainstorm', category: 'charade' },
    { q: ACT, a: 'Buoyancy', category: 'charade' },
    { q: MIME, a: 'Bittersweet', category: 'charade' },
  ],
  C: [
    { q: DRAW, a: 'Condensation', category: 'charade' },
    { q: NOW, a: 'Courage', category: 'charade' },
    { q: PERF, a: 'Cliffhanger', category: 'charade' },
  ],
  D: [
    { q: GO, a: 'Doubt', category: 'charade' },
    { q: ACT2, a: 'Dusk', category: 'charade' },
    { q: SHOW, a: 'Daydream', category: 'charade' },
  ],
  E: [
    { q: ACT, a: 'Euphoria', category: 'charade' },
    { q: MIME, a: 'Exhaustion', category: 'charade' },
    { q: ACT2, a: 'Equilibrium', category: 'charade' },
  ],
  F: [
    { q: DRAW, a: 'Friendship', category: 'charade' },
    { q: PERF, a: 'Frustration', category: 'charade' },
    { q: ACT, a: 'Free fall', category: 'charade' },
  ],
  G: [
    { q: ACT2, a: 'Guilt', category: 'charade' },
    { q: SHOW, a: 'Goosebumps', category: 'charade' },
    { q: DRAW, a: 'Gloom', category: 'charade' },
  ],
  H: [
    { q: ACT, a: 'Hope', category: 'charade' },
    { q: MIME, a: 'Hunger', category: 'charade' },
    { q: ACT2, a: 'Heartbreak', category: 'charade' },
  ],
  I: [
    { q: DRAW, a: 'Independence', category: 'charade' },
    { q: PERF, a: 'Impatience', category: 'charade' },
    { q: ACT, a: 'Illusion', category: 'charade' },
  ],
  J: [
    { q: ACT2, a: 'Jitters', category: 'charade' },
  ],
  K: [
    { q: DRAW, a: 'Kinship', category: 'charade' },
  ],
  L: [
    { q: ACT, a: 'Liberty', category: 'charade' },
    { q: MIME, a: 'Lullaby', category: 'charade' },
  ],
  M: [
    { q: DRAW, a: 'Maze', category: 'charade' },
    { q: PERF, a: 'Melancholy', category: 'charade' },
    { q: ACT, a: 'Magnetic field', category: 'charade' },
  ],
  N: [
    { q: ACT2, a: 'Numb fingers', category: 'charade' },
    { q: SHOW, a: 'Nirvana', category: 'charade' },
  ],
  O: [
    { q: DRAW, a: 'Outrage', category: 'charade' },
    { q: ACT, a: 'Osmosis', category: 'charade' },
  ],
  P: [
    { q: ACT2, a: 'Peer pressure', category: 'charade' },
    { q: SHOW, a: 'Privacy', category: 'charade' },
    { q: DRAW, a: 'Phantom', category: 'charade' },
  ],
  Q: [
    { q: GO, a: 'Quagmire', category: 'charade' },
  ],
  R: [
    { q: ACT, a: 'Ripple effect', category: 'charade' },
    { q: MIME, a: 'Restlessness', category: 'charade' },
    { q: ACT2, a: 'Reflection', category: 'charade' },
  ],
  S: [
    { q: DRAW, a: 'Stalemate', category: 'charade' },
    { q: NOW, a: 'Serenity', category: 'charade' },
    { q: PERF, a: 'Shock', category: 'charade' },
    { q: ACT, a: 'Surface tension', category: 'charade' },
  ],
  T: [
    { q: SHOW, a: 'Triumph', category: 'charade' },
    { q: DRAW, a: 'Tidal wave', category: 'charade' },
    { q: ACT, a: 'Tranquility', category: 'charade' },
  ],
  U: [
    { q: ACT2, a: 'Underdog', category: 'charade' },
  ],
  V: [
    { q: DRAW, a: 'Vacuum', category: 'charade' },
    { q: NOW, a: 'Velocity', category: 'charade' },
  ],
  W: [
    { q: ACT, a: 'Whiplash', category: 'charade' },
    { q: MIME, a: 'Wonder', category: 'charade' },
    { q: ACT2, a: 'Wavelength', category: 'charade' },
  ],
  Y: [
    { q: GO, a: 'Yesteryear', category: 'charade' },
  ],
  Z: [
    { q: DRAW, a: 'Zeal', category: 'charade' },
  ],
};
