import type { RawQuestion } from '../core/packs';

// Charades expansion batch 2A. Same rules as charades.ts / charadesExtra.ts:
// `q` is a generic acting instruction that never contains the answer, `a` is the
// thing to act out (category 'charade'). No image fields. Each answer is bucketed
// under the FIRST LETTER of its answer. These are all NEW words — none duplicate
// any answer already present across charades.ts or charadesExtra.ts.

const ACT = 'Act this out — no talking!';
const MIME = 'Mime it for your team!';
const ACT2 = 'Act it out — no words!';
const DRAW = 'Act or draw it — no words!';
const SHOW = 'Show it without speaking!';
const NOW = 'No talking — perform it!';
const SILENT = 'Silently act this out!';

// ~130 NEW everyday actable objects / things / actions a child could mime:
// food, household objects, weather, vehicles, sports, body actions, toys, nature.
export const charadesEasy2: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Avocado', category: 'charade' },
    { q: MIME, a: 'Acorn', category: 'charade' },
    { q: ACT2, a: 'Anchor', category: 'charade' },
    { q: DRAW, a: 'Ambulance', category: 'charade' },
    { q: SILENT, a: 'Apron', category: 'charade' },
  ],
  B: [
    { q: DRAW, a: 'Balloon', category: 'charade' },
    { q: SHOW, a: 'Bubbles', category: 'charade' },
    { q: NOW, a: 'Broom', category: 'charade' },
    { q: ACT, a: 'Backpack', category: 'charade' },
    { q: MIME, a: 'Blowing a kiss', category: 'charade' },
    { q: ACT2, a: 'Bouncing', category: 'charade' },
    { q: SILENT, a: 'Boat', category: 'charade' },
    { q: DRAW, a: 'Blanket', category: 'charade' },
    { q: NOW, a: 'Bell', category: 'charade' },
  ],
  C: [
    { q: DRAW, a: 'Cake', category: 'charade' },
    { q: SHOW, a: 'Cookie', category: 'charade' },
    { q: NOW, a: 'Crown', category: 'charade' },
    { q: ACT, a: 'Carrot', category: 'charade' },
    { q: MIME, a: 'Coughing', category: 'charade' },
    { q: ACT2, a: 'Cartwheel', category: 'charade' },
    { q: SILENT, a: 'Cup', category: 'charade' },
  ],
  D: [
    { q: DRAW, a: 'Doughnut', category: 'charade' },
    { q: SHOW, a: 'Dribbling a ball', category: 'charade' },
    { q: NOW, a: 'Dustpan', category: 'charade' },
    { q: ACT, a: 'Dominoes', category: 'charade' },
    { q: MIME, a: 'Dice', category: 'charade' },
    { q: ACT2, a: 'Doorbell', category: 'charade' },
  ],
  E: [
    { q: ACT, a: 'Egg', category: 'charade' },
    { q: MIME, a: 'Escalator', category: 'charade' },
    { q: ACT2, a: 'Earrings', category: 'charade' },
  ],
  F: [
    { q: DRAW, a: 'French fries', category: 'charade' },
    { q: SHOW, a: 'Football', category: 'charade' },
    { q: NOW, a: 'Frying pan', category: 'charade' },
    { q: ACT, a: 'Fireworks', category: 'charade' },
    { q: MIME, a: 'Fork', category: 'charade' },
    { q: ACT2, a: 'Feeding a baby', category: 'charade' },
  ],
  G: [
    { q: ACT2, a: 'Grapes', category: 'charade' },
    { q: DRAW, a: 'Gloves', category: 'charade' },
    { q: SHOW, a: 'Globe', category: 'charade' },
    { q: NOW, a: 'Goggles', category: 'charade' },
    { q: ACT, a: 'Grapefruit', category: 'charade' },
  ],
  H: [
    { q: NOW, a: 'Hamburger', category: 'charade' },
    { q: ACT, a: 'Headphones', category: 'charade' },
    { q: MIME, a: 'Helicopter', category: 'charade' },
    { q: ACT2, a: 'Hula hoop', category: 'charade' },
    { q: SILENT, a: 'Honey', category: 'charade' },
  ],
  I: [
    { q: DRAW, a: 'Igloo', category: 'charade' },
    { q: SHOW, a: 'Itching', category: 'charade' },
  ],
  J: [
    { q: ACT, a: 'Jump rope', category: 'charade' },
    { q: MIME, a: 'Jacket', category: 'charade' },
    { q: ACT2, a: 'Jelly', category: 'charade' },
  ],
  K: [
    { q: DRAW, a: 'Kayak', category: 'charade' },
    { q: SHOW, a: 'Knocking on a door', category: 'charade' },
    { q: ACT, a: 'Karate chop', category: 'charade' },
  ],
  L: [
    { q: NOW, a: 'Lollipop', category: 'charade' },
    { q: ACT, a: 'Lawnmower', category: 'charade' },
    { q: MIME, a: 'Leaf', category: 'charade' },
    { q: ACT2, a: 'Lightning', category: 'charade' },
  ],
  M: [
    { q: ACT2, a: 'Motorcycle', category: 'charade' },
    { q: DRAW, a: 'Microphone', category: 'charade' },
    { q: SHOW, a: 'Marching', category: 'charade' },
    { q: NOW, a: 'Moon', category: 'charade' },
    { q: SILENT, a: 'Milkshake', category: 'charade' },
  ],
  N: [
    { q: ACT, a: 'Notebook', category: 'charade' },
    { q: MIME, a: 'Napping', category: 'charade' },
    { q: ACT2, a: 'Net', category: 'charade' },
  ],
  O: [
    { q: ACT2, a: 'Orange', category: 'charade' },
    { q: DRAW, a: 'Oven', category: 'charade' },
    { q: SHOW, a: 'Onion', category: 'charade' },
  ],
  P: [
    { q: SHOW, a: 'Popcorn', category: 'charade' },
    { q: NOW, a: 'Paintbrush', category: 'charade' },
    { q: ACT, a: 'Parachute', category: 'charade' },
    { q: MIME, a: 'Pumpkin', category: 'charade' },
    { q: ACT2, a: 'Pushing a cart', category: 'charade' },
    { q: SILENT, a: 'Pancake', category: 'charade' },
    { q: DRAW, a: 'Pogo stick', category: 'charade' },
  ],
  Q: [
    { q: ACT, a: 'Quilt', category: 'charade' },
  ],
  R: [
    { q: DRAW, a: 'Roller skates', category: 'charade' },
    { q: SHOW, a: 'Rocket', category: 'charade' },
    { q: NOW, a: 'Raking leaves', category: 'charade' },
    { q: ACT, a: 'Rolling pin', category: 'charade' },
    { q: MIME, a: 'Raincoat', category: 'charade' },
  ],
  S: [
    { q: MIME, a: 'Sandwich', category: 'charade' },
    { q: ACT2, a: 'Spaceship', category: 'charade' },
    { q: DRAW, a: 'Sunglasses', category: 'charade' },
    { q: SHOW, a: 'Slide', category: 'charade' },
    { q: NOW, a: 'Stretching', category: 'charade' },
    { q: ACT, a: 'Spoon', category: 'charade' },
    { q: SILENT, a: 'Seesaw', category: 'charade' },
    { q: DRAW, a: 'Sledding', category: 'charade' },
    { q: MIME, a: 'Scooter', category: 'charade' },
    { q: ACT2, a: 'Saw', category: 'charade' },
  ],
  T: [
    { q: MIME, a: 'Trampoline', category: 'charade' },
    { q: ACT2, a: 'Train', category: 'charade' },
    { q: DRAW, a: 'Teddy bear', category: 'charade' },
    { q: SHOW, a: 'Tractor', category: 'charade' },
    { q: NOW, a: 'Toaster', category: 'charade' },
    { q: SILENT, a: 'Towel', category: 'charade' },
    { q: ACT, a: 'Telescope', category: 'charade' },
    { q: MIME, a: 'Trumpet', category: 'charade' },
  ],
  U: [
    { q: ACT, a: 'Ukulele', category: 'charade' },
    { q: MIME, a: 'Unwrapping a present', category: 'charade' },
  ],
  V: [
    { q: MIME, a: 'Vegetable garden', category: 'charade' },
    { q: ACT2, a: 'Van', category: 'charade' },
    { q: DRAW, a: 'Vase', category: 'charade' },
  ],
  W: [
    { q: ACT2, a: 'Watermelon', category: 'charade' },
    { q: DRAW, a: 'Windmill', category: 'charade' },
    { q: SHOW, a: 'Whistling', category: 'charade' },
    { q: NOW, a: 'Wiping a window', category: 'charade' },
    { q: ACT, a: 'Wand', category: 'charade' },
  ],
  Y: [
    { q: ACT, a: 'Yo-yo', category: 'charade' },
  ],
  Z: [
    { q: MIME, a: 'Zipping a jacket', category: 'charade' },
  ],
};

// ~130 NEW animals: mammals, birds, sea creatures, insects, reptiles, dinosaurs.
export const charadesAnimals2: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Antelope', category: 'charade' },
    { q: MIME, a: 'Albatross', category: 'charade' },
    { q: ACT2, a: 'Angelfish', category: 'charade' },
    { q: DRAW, a: 'Aardvark', category: 'charade' },
  ],
  B: [
    { q: ACT2, a: 'Badger', category: 'charade' },
    { q: DRAW, a: 'Bison', category: 'charade' },
    { q: SHOW, a: 'Boar', category: 'charade' },
    { q: NOW, a: 'Beetle', category: 'charade' },
    { q: ACT, a: 'Baboon', category: 'charade' },
    { q: DRAW, a: 'Brachiosaurus', category: 'charade' },
    { q: MIME, a: 'Bulldog', category: 'charade' },
    { q: SHOW, a: 'Blue jay', category: 'charade' },
  ],
  C: [
    { q: MIME, a: 'Cobra', category: 'charade' },
    { q: ACT2, a: 'Chimpanzee', category: 'charade' },
    { q: DRAW, a: 'Caterpillar', category: 'charade' },
    { q: SHOW, a: 'Clownfish', category: 'charade' },
    { q: NOW, a: 'Chameleon', category: 'charade' },
    { q: ACT, a: 'Cougar', category: 'charade' },
    { q: MIME, a: 'Cuttlefish', category: 'charade' },
  ],
  D: [
    { q: ACT, a: 'Dingo', category: 'charade' },
    { q: MIME, a: 'Dove', category: 'charade' },
    { q: ACT2, a: 'Dachshund', category: 'charade' },
    { q: DRAW, a: 'Dragon', category: 'charade' },
    { q: SHOW, a: 'Dalmatian', category: 'charade' },
  ],
  E: [
    { q: DRAW, a: 'Emu', category: 'charade' },
    { q: SHOW, a: 'Eel', category: 'charade' },
    { q: ACT, a: 'Earthworm', category: 'charade' },
    { q: MIME, a: 'Egret', category: 'charade' },
  ],
  F: [
    { q: NOW, a: 'Fly', category: 'charade' },
    { q: ACT, a: 'Firefly', category: 'charade' },
    { q: MIME, a: 'Fawn', category: 'charade' },
    { q: ACT2, a: 'Finch', category: 'charade' },
  ],
  G: [
    { q: ACT2, a: 'Gazelle', category: 'charade' },
    { q: DRAW, a: 'Gibbon', category: 'charade' },
    { q: SHOW, a: 'Grasshopper', category: 'charade' },
    { q: NOW, a: 'Guinea pig', category: 'charade' },
    { q: ACT, a: 'Gull', category: 'charade' },
    { q: MIME, a: 'Greyhound', category: 'charade' },
  ],
  H: [
    { q: ACT, a: 'Hyena', category: 'charade' },
    { q: MIME, a: 'Heron', category: 'charade' },
    { q: ACT2, a: 'Hummingbird', category: 'charade' },
    { q: DRAW, a: 'Hare', category: 'charade' },
    { q: SHOW, a: 'Hornet', category: 'charade' },
  ],
  I: [
    { q: DRAW, a: 'Impala', category: 'charade' },
    { q: SHOW, a: 'Inchworm', category: 'charade' },
    { q: ACT, a: 'Ibex', category: 'charade' },
  ],
  J: [
    { q: ACT, a: 'Jaguar', category: 'charade' },
    { q: MIME, a: 'Jackal', category: 'charade' },
    { q: ACT2, a: 'Jackrabbit', category: 'charade' },
  ],
  K: [
    { q: ACT2, a: 'Kingfisher', category: 'charade' },
    { q: DRAW, a: 'Kiwi', category: 'charade' },
    { q: SHOW, a: 'Kookaburra', category: 'charade' },
  ],
  L: [
    { q: SHOW, a: 'Llama', category: 'charade' },
    { q: NOW, a: 'Ladybug', category: 'charade' },
    { q: ACT, a: 'Lemur', category: 'charade' },
    { q: MIME, a: 'Lynx', category: 'charade' },
    { q: ACT2, a: 'Lamb', category: 'charade' },
    { q: DRAW, a: 'Loon', category: 'charade' },
  ],
  M: [
    { q: ACT2, a: 'Meerkat', category: 'charade' },
    { q: DRAW, a: 'Mole', category: 'charade' },
    { q: SHOW, a: 'Mosquito', category: 'charade' },
    { q: NOW, a: 'Manatee', category: 'charade' },
    { q: ACT, a: 'Mantis', category: 'charade' },
    { q: MIME, a: 'Mule', category: 'charade' },
  ],
  N: [
    { q: ACT, a: 'Nightingale', category: 'charade' },
    { q: MIME, a: 'Narwhal', category: 'charade' },
  ],
  O: [
    { q: MIME, a: 'Orangutan', category: 'charade' },
    { q: ACT2, a: 'Orca', category: 'charade' },
    { q: DRAW, a: 'Oyster', category: 'charade' },
    { q: SHOW, a: 'Opossum', category: 'charade' },
  ],
  P: [
    { q: DRAW, a: 'Panther', category: 'charade' },
    { q: SHOW, a: 'Pelican', category: 'charade' },
    { q: NOW, a: 'Platypus', category: 'charade' },
    { q: ACT, a: 'Puffin', category: 'charade' },
    { q: MIME, a: 'Pony', category: 'charade' },
    { q: SHOW, a: 'Pterodactyl', category: 'charade' },
    { q: ACT2, a: 'Pheasant', category: 'charade' },
    { q: DRAW, a: 'Puma', category: 'charade' },
    { q: NOW, a: 'Prawn', category: 'charade' },
  ],
  Q: [
    { q: ACT2, a: 'Quail', category: 'charade' },
    { q: DRAW, a: 'Quokka', category: 'charade' },
  ],
  R: [
    { q: DRAW, a: 'Reindeer', category: 'charade' },
    { q: SHOW, a: 'Robin', category: 'charade' },
    { q: NOW, a: 'Rat', category: 'charade' },
    { q: ACT, a: 'Ram', category: 'charade' },
  ],
  S: [
    { q: ACT, a: 'Salamander', category: 'charade' },
    { q: MIME, a: 'Stingray', category: 'charade' },
    { q: ACT2, a: 'Seahorse', category: 'charade' },
    { q: DRAW, a: 'Swan', category: 'charade' },
    { q: SHOW, a: 'Sloth', category: 'charade' },
    { q: NOW, a: 'Starfish', category: 'charade' },
    { q: MIME, a: 'Stegosaurus', category: 'charade' },
    { q: ACT, a: 'Skunk', category: 'charade' },
    { q: SILENT, a: 'Stork', category: 'charade' },
    { q: DRAW, a: 'Swordfish', category: 'charade' },
    { q: SHOW, a: 'Sparrow', category: 'charade' },
    { q: ACT2, a: 'Scorpion', category: 'charade' },
  ],
  T: [
    { q: ACT, a: 'Tarantula', category: 'charade' },
    { q: MIME, a: 'Toucan', category: 'charade' },
    { q: ACT2, a: 'Termite', category: 'charade' },
    { q: SILENT, a: 'Tyrannosaurus', category: 'charade' },
    { q: ACT, a: 'Triceratops', category: 'charade' },
    { q: DRAW, a: 'Tadpole', category: 'charade' },
    { q: SHOW, a: 'Tuna', category: 'charade' },
  ],
  U: [
    { q: DRAW, a: 'Urchin', category: 'charade' },
  ],
  V: [
    { q: SHOW, a: 'Viper', category: 'charade' },
    { q: ACT2, a: 'Velociraptor', category: 'charade' },
  ],
  W: [
    { q: NOW, a: 'Warthog', category: 'charade' },
    { q: ACT, a: 'Wombat', category: 'charade' },
    { q: MIME, a: 'Weasel', category: 'charade' },
    { q: DRAW, a: 'Wasp', category: 'charade' },
    { q: SHOW, a: 'Wildebeest', category: 'charade' },
    { q: ACT2, a: 'Worm', category: 'charade' },
    { q: NOW, a: 'Wren', category: 'charade' },
  ],
  Z: [
    { q: DRAW, a: 'Zebu', category: 'charade' },
  ],
};
