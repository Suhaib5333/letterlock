import type { RawQuestion } from '../core/packs';

// Second expansion batch for the Charades packs. Same rules as charades.ts:
// `q` is a generic acting instruction that never contains the answer, `a` is the
// thing to act out (category 'charade'). No image fields. Each answer is bucketed
// under the FIRST LETTER of its answer. Every word here is NEW — none duplicate
// charades.ts (charadesActionsPack/charadesHardPack) or charadesExtra.ts
// (charadesActionsExtra/charadesHardExtra).

const ACT = 'Act this out — no talking!';
const MIME = 'Mime it for your team!';
const ACT2 = 'Act it out — no words!';
const DRAW = 'Act or draw it — no words!';
const SHOW = 'Show it without speaking!';
const NOW = 'No talking — perform it!';
const PERF = 'Perform it silently!';
const GO = 'Go — make them guess it!';

// ~130 NEW verbs / professions / sports / hobbies / chores.
export const charadesActions2: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Accountant', category: 'charade' },
    { q: MIME, a: 'Archaeologist', category: 'charade' },
    { q: ACT2, a: 'Auctioneer', category: 'charade' },
    { q: DRAW, a: 'Arm wrestling', category: 'charade' },
  ],
  B: [
    { q: SHOW, a: 'Badminton', category: 'charade' },
    { q: ACT, a: 'Bartender', category: 'charade' },
    { q: MIME, a: 'Beekeeper', category: 'charade' },
    { q: ACT2, a: 'Blacksmith', category: 'charade' },
    { q: DRAW, a: 'Bungee jumping', category: 'charade' },
    { q: NOW, a: 'Butcher', category: 'charade' },
  ],
  C: [
    { q: SHOW, a: 'Cashier', category: 'charade' },
    { q: ACT, a: 'Conductor', category: 'charade' },
    { q: MIME, a: 'Cowboy', category: 'charade' },
    { q: ACT2, a: 'Canoeing', category: 'charade' },
    { q: DRAW, a: 'Cleaning windows', category: 'charade' },
    { q: PERF, a: 'Curling', category: 'charade' },
  ],
  D: [
    { q: GO, a: 'Dancer', category: 'charade' },
    { q: ACT, a: 'Dishwashing', category: 'charade' },
    { q: MIME, a: 'Drawing', category: 'charade' },
    { q: ACT2, a: 'Dribbling', category: 'charade' },
    { q: SHOW, a: 'Dog walking', category: 'charade' },
  ],
  E: [
    { q: DRAW, a: 'Engineer', category: 'charade' },
    { q: NOW, a: 'Emptying the trash', category: 'charade' },
  ],
  F: [
    { q: ACT, a: 'Florist', category: 'charade' },
    { q: MIME, a: 'Folding laundry', category: 'charade' },
    { q: ACT2, a: 'Figure skating', category: 'charade' },
    { q: SHOW, a: 'Flying a kite', category: 'charade' },
  ],
  G: [
    { q: DRAW, a: 'Gymnastics', category: 'charade' },
    { q: PERF, a: 'Golfer', category: 'charade' },
    { q: ACT, a: 'Grilling', category: 'charade' },
  ],
  H: [
    { q: MIME, a: 'Hunter', category: 'charade' },
    { q: ACT2, a: 'Hockey', category: 'charade' },
    { q: SHOW, a: 'Hang gliding', category: 'charade' },
    { q: NOW, a: 'Hammering a nail', category: 'charade' },
  ],
  I: [
    { q: GO, a: 'Inventor', category: 'charade' },
    { q: ACT, a: 'Ice fishing', category: 'charade' },
  ],
  J: [
    { q: MIME, a: 'Janitor', category: 'charade' },
    { q: ACT2, a: 'Jeweler', category: 'charade' },
    { q: SHOW, a: 'Jump rope', category: 'charade' },
  ],
  K: [
    { q: DRAW, a: 'Kayaking', category: 'charade' },
    { q: ACT, a: 'Kneading dough', category: 'charade' },
  ],
  L: [
    { q: MIME, a: 'Lifeguard', category: 'charade' },
    { q: ACT2, a: 'Locksmith', category: 'charade' },
    { q: SHOW, a: 'Long jump', category: 'charade' },
  ],
  M: [
    { q: NOW, a: 'Mountaineer', category: 'charade' },
    { q: ACT, a: 'Mowing the lawn', category: 'charade' },
    { q: MIME, a: 'Mailman', category: 'charade' },
    { q: ACT2, a: 'Milking a cow', category: 'charade' },
  ],
  N: [
    { q: DRAW, a: 'Navigator', category: 'charade' },
    { q: SHOW, a: 'Nailing', category: 'charade' },
  ],
  O: [
    { q: ACT, a: 'Optician', category: 'charade' },
    { q: MIME, a: 'Orchestra conductor', category: 'charade' },
  ],
  P: [
    { q: ACT2, a: 'Plowing', category: 'charade' },
    { q: DRAW, a: 'Pole vault', category: 'charade' },
    { q: SHOW, a: 'Potter', category: 'charade' },
    { q: NOW, a: 'Pruning', category: 'charade' },
    { q: PERF, a: 'Paddleboarding', category: 'charade' },
  ],
  Q: [{ q: GO, a: 'Quarterback', category: 'charade' }],
  R: [
    { q: ACT, a: 'Receptionist', category: 'charade' },
    { q: MIME, a: 'Roofer', category: 'charade' },
    { q: ACT2, a: 'Raking leaves', category: 'charade' },
    { q: SHOW, a: 'Rock climbing', category: 'charade' },
    { q: DRAW, a: 'Roller skating', category: 'charade' },
  ],
  S: [
    { q: NOW, a: 'Scientist', category: 'charade' },
    { q: ACT, a: 'Singer', category: 'charade' },
    { q: MIME, a: 'Skydiving', category: 'charade' },
    { q: ACT2, a: 'Snorkeling', category: 'charade' },
    { q: DRAW, a: 'Sewing', category: 'charade' },
    { q: SHOW, a: 'Shoveling snow', category: 'charade' },
    { q: PERF, a: 'Stretching', category: 'charade' },
  ],
  T: [
    { q: ACT, a: 'Translator', category: 'charade' },
    { q: MIME, a: 'Truck driver', category: 'charade' },
    { q: ACT2, a: 'Table tennis', category: 'charade' },
    { q: SHOW, a: 'Trampolining', category: 'charade' },
    { q: NOW, a: 'Tap dancing', category: 'charade' },
  ],
  U: [
    { q: DRAW, a: 'Umpire', category: 'charade' },
    { q: ACT, a: 'Unpacking', category: 'charade' },
  ],
  V: [
    { q: MIME, a: 'Vacuuming the car', category: 'charade' },
    { q: SHOW, a: 'Volleyball', category: 'charade' },
  ],
  W: [
    { q: ACT2, a: 'Watering plants', category: 'charade' },
    { q: DRAW, a: 'Window washing', category: 'charade' },
    { q: NOW, a: 'Woodcutting', category: 'charade' },
    { q: PERF, a: 'Water skiing', category: 'charade' },
  ],
  Z: [{ q: GO, a: 'Zookeeper', category: 'charade' }],
};

// ~130 NEW trickier / abstract concepts, idioms, emotions, science & nature.
export const charadesHard2: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Adrenaline', category: 'charade' },
    { q: MIME, a: 'Apology', category: 'charade' },
    { q: ACT2, a: 'Acceleration', category: 'charade' },
    { q: DRAW, a: 'Aurora', category: 'charade' },
  ],
  B: [
    { q: SHOW, a: 'Black hole', category: 'charade' },
    { q: ACT, a: 'Boiling point', category: 'charade' },
    { q: MIME, a: 'Butterflies in your stomach', category: 'charade' },
    { q: ACT2, a: 'Breaking the ice', category: 'charade' },
  ],
  C: [
    { q: DRAW, a: 'Cold feet', category: 'charade' },
    { q: NOW, a: 'Conscience', category: 'charade' },
    { q: PERF, a: 'Confidence', category: 'charade' },
    { q: ACT, a: 'Combustion', category: 'charade' },
    { q: MIME, a: 'Centrifugal force', category: 'charade' },
  ],
  D: [
    { q: GO, a: 'Determination', category: 'charade' },
    { q: ACT2, a: 'Drought', category: 'charade' },
    { q: SHOW, a: 'Disappointment', category: 'charade' },
    { q: DRAW, a: 'Dawn', category: 'charade' },
  ],
  E: [
    { q: ACT, a: 'Erosion', category: 'charade' },
    { q: MIME, a: 'Empathy', category: 'charade' },
    { q: ACT2, a: 'Eclipse', category: 'charade' },
    { q: NOW, a: 'Envy', category: 'charade' },
    { q: SHOW, a: 'Evaporation', category: 'charade' },
  ],
  F: [
    { q: DRAW, a: 'Frostbite', category: 'charade' },
    { q: PERF, a: 'Fear', category: 'charade' },
    { q: ACT, a: 'Fermentation', category: 'charade' },
    { q: MIME, a: 'Falling in love', category: 'charade' },
  ],
  G: [
    { q: ACT2, a: 'Grief', category: 'charade' },
    { q: SHOW, a: 'Gratitude', category: 'charade' },
    { q: DRAW, a: 'Gridlock', category: 'charade' },
    { q: NOW, a: 'Greenhouse effect', category: 'charade' },
  ],
  H: [
    { q: ACT, a: 'Hesitation', category: 'charade' },
    { q: MIME, a: 'Homesickness', category: 'charade' },
    { q: ACT2, a: 'Hot potato', category: 'charade' },
    { q: SHOW, a: 'Humidity', category: 'charade' },
  ],
  I: [
    { q: DRAW, a: 'Insomnia', category: 'charade' },
    { q: PERF, a: 'Innocence', category: 'charade' },
    { q: ACT, a: 'Inertia', category: 'charade' },
    { q: MIME, a: 'Itch', category: 'charade' },
  ],
  J: [
    { q: ACT2, a: 'Jet lag', category: 'charade' },
    { q: SHOW, a: 'Joy', category: 'charade' },
  ],
  K: [
    { q: DRAW, a: 'Knowledge', category: 'charade' },
    { q: NOW, a: 'Kinetic energy', category: 'charade' },
  ],
  L: [
    { q: ACT, a: 'Loyalty', category: 'charade' },
    { q: MIME, a: 'Lightning', category: 'charade' },
    { q: ACT2, a: 'Longing', category: 'charade' },
    { q: SHOW, a: 'Laziness', category: 'charade' },
  ],
  M: [
    { q: DRAW, a: 'Mirage', category: 'charade' },
    { q: PERF, a: 'Momentum', category: 'charade' },
    { q: ACT, a: 'Migration', category: 'charade' },
    { q: MIME, a: 'Mood swing', category: 'charade' },
    { q: NOW, a: 'Metamorphosis', category: 'charade' },
  ],
  N: [
    { q: ACT2, a: 'Numbness', category: 'charade' },
    { q: SHOW, a: 'Nervousness', category: 'charade' },
  ],
  O: [
    { q: DRAW, a: 'Obsession', category: 'charade' },
    { q: ACT, a: 'Overwhelmed', category: 'charade' },
    { q: MIME, a: 'Orbit', category: 'charade' },
  ],
  P: [
    { q: ACT2, a: 'Pride', category: 'charade' },
    { q: SHOW, a: 'Paranoia', category: 'charade' },
    { q: DRAW, a: 'Photogenic', category: 'charade' },
    { q: NOW, a: 'Pressure', category: 'charade' },
    { q: PERF, a: 'Perseverance', category: 'charade' },
  ],
  Q: [{ q: GO, a: 'Quiet', category: 'charade' }],
  R: [
    { q: ACT, a: 'Relief', category: 'charade' },
    { q: MIME, a: 'Regret', category: 'charade' },
    { q: ACT2, a: 'Resilience', category: 'charade' },
    { q: SHOW, a: 'Rainstorm', category: 'charade' },
  ],
  S: [
    { q: DRAW, a: 'Spilled milk', category: 'charade' },
    { q: NOW, a: 'Shyness', category: 'charade' },
    { q: PERF, a: 'Sarcasm', category: 'charade' },
    { q: ACT, a: 'Suspense', category: 'charade' },
    { q: MIME, a: 'Static electricity', category: 'charade' },
    { q: ACT2, a: 'Sunrise', category: 'charade' },
  ],
  T: [
    { q: SHOW, a: 'Thirst', category: 'charade' },
    { q: DRAW, a: 'Turbulence', category: 'charade' },
    { q: ACT, a: 'Thunder', category: 'charade' },
    { q: MIME, a: 'Tug of war', category: 'charade' },
  ],
  U: [
    { q: ACT2, a: 'Uncertainty', category: 'charade' },
    { q: SHOW, a: 'Unity', category: 'charade' },
  ],
  V: [
    { q: DRAW, a: 'Vertigo', category: 'charade' },
    { q: NOW, a: 'Vibration', category: 'charade' },
    { q: PERF, a: 'Vanity', category: 'charade' },
  ],
  W: [
    { q: ACT, a: 'Wildfire', category: 'charade' },
    { q: MIME, a: 'Wanderlust', category: 'charade' },
    { q: ACT2, a: 'Worry', category: 'charade' },
    { q: SHOW, a: 'Weightlessness', category: 'charade' },
  ],
  Y: [{ q: GO, a: 'Yearning', category: 'charade' }],
  Z: [{ q: DRAW, a: 'Zero gravity', category: 'charade' }],
};
