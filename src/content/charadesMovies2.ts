import type { RawQuestion } from '../core/packs';

// Third charades expansion batch for the Movies & TV pack. Same rules as
// charades.ts / charadesExtra.ts: `q` is a generic acting instruction that never
// contains the title, `a` is the movie or TV-show title to act out
// (category 'charade'), bucketed under the FIRST LETTER of the title. No image
// fields. Every title here is NEW — none duplicate charadesMoviesPack or
// charadesMoviesExtra. Mix of films and TV series.

const ACT = 'Act out this movie or show — no talking!';
const MIME = 'Mime this title for your team!';
const SILENT = 'Silently act out this title!';
const PERFORM = 'Perform it — not a single word!';
const SHOW = 'Show this one without speaking!';
const NOW = 'No talking — act out the title!';

export const charadesMovies2: Record<string, RawQuestion[]> = {
  A: [
    { q: ACT, a: 'Aladdin and the King of Thieves', category: 'charade' },
    { q: MIME, a: 'Ant-Man', category: 'charade' },
    { q: SILENT, a: 'A Bug’s Life', category: 'charade' },
    { q: PERFORM, a: 'Arrested Development', category: 'charade' },
    { q: SHOW, a: 'The Addams Family', category: 'charade' },
    { q: NOW, a: 'Air Bud', category: 'charade' },
  ],
  B: [
    { q: SHOW, a: 'Back to the Future', category: 'charade' },
    { q: NOW, a: 'Breaking Bad', category: 'charade' },
    { q: ACT, a: 'The Breakfast Club', category: 'charade' },
    { q: MIME, a: 'Beetlejuice', category: 'charade' },
    { q: SILENT, a: 'Black Panther', category: 'charade' },
    { q: PERFORM, a: 'Bridgerton', category: 'charade' },
    { q: SHOW, a: 'Blade Runner', category: 'charade' },
  ],
  C: [
    { q: NOW, a: 'Chicken Run', category: 'charade' },
    { q: ACT, a: 'Charlie and the Chocolate Factory', category: 'charade' },
    { q: MIME, a: 'The Croods', category: 'charade' },
    { q: SILENT, a: 'Cheers', category: 'charade' },
    { q: PERFORM, a: 'Captain America', category: 'charade' },
    { q: SHOW, a: 'The Crown', category: 'charade' },
    { q: NOW, a: 'Cobra Kai', category: 'charade' },
    { q: ACT, a: 'Charlie’s Angels', category: 'charade' },
  ],
  D: [
    { q: NOW, a: 'Doctor Who', category: 'charade' },
    { q: ACT, a: 'Downton Abbey', category: 'charade' },
    { q: MIME, a: 'Dora the Explorer', category: 'charade' },
    { q: SILENT, a: 'The Dark Knight', category: 'charade' },
    { q: PERFORM, a: 'Deadpool', category: 'charade' },
    { q: SHOW, a: 'Despicable Me 2', category: 'charade' },
  ],
  E: [
    { q: SHOW, a: 'E.T. the Extra-Terrestrial', category: 'charade' },
    { q: NOW, a: 'The Emperor’s New Groove', category: 'charade' },
    { q: ACT, a: 'Elf', category: 'charade' },
    { q: MIME, a: 'Emily in Paris', category: 'charade' },
  ],
  F: [
    { q: MIME, a: 'Friends', category: 'charade' },
    { q: SILENT, a: 'The Fast and the Furious', category: 'charade' },
    { q: PERFORM, a: 'Finding Dory', category: 'charade' },
    { q: SHOW, a: 'Frasier', category: 'charade' },
    { q: NOW, a: 'Ferris Bueller’s Day Off', category: 'charade' },
    { q: ACT, a: 'The Flintstones', category: 'charade' },
    { q: MIME, a: 'Family Guy', category: 'charade' },
  ],
  G: [
    { q: ACT, a: 'Game of Thrones', category: 'charade' },
    { q: MIME, a: 'The Goonies', category: 'charade' },
    { q: SILENT, a: 'Ghostbusters: Afterlife', category: 'charade' },
    { q: PERFORM, a: 'Grey’s Anatomy', category: 'charade' },
    { q: SHOW, a: 'The Greatest Showman', category: 'charade' },
    { q: NOW, a: 'Guardians of the Galaxy', category: 'charade' },
    { q: ACT, a: 'Glee', category: 'charade' },
  ],
  H: [
    { q: ACT, a: 'How to Train Your Dragon', category: 'charade' },
    { q: MIME, a: 'The Hunger Games', category: 'charade' },
    { q: SILENT, a: 'Happy Days', category: 'charade' },
    { q: PERFORM, a: 'Hotel Transylvania', category: 'charade' },
    { q: SHOW, a: 'The Hobbit', category: 'charade' },
    { q: NOW, a: 'House of the Dragon', category: 'charade' },
  ],
  I: [
    { q: NOW, a: 'Indiana Jones', category: 'charade' },
    { q: ACT, a: 'The Incredibles', category: 'charade' },
    { q: MIME, a: 'Ice Age', category: 'charade' },
    { q: SILENT, a: 'Interstellar', category: 'charade' },
  ],
  J: [
    { q: PERFORM, a: 'The Jungle Book', category: 'charade' },
    { q: SHOW, a: 'James Bond', category: 'charade' },
    { q: NOW, a: 'John Wick', category: 'charade' },
    { q: ACT, a: 'Jumanji: The Next Level', category: 'charade' },
  ],
  K: [
    { q: ACT, a: 'The Karate Kid', category: 'charade' },
    { q: MIME, a: 'Kill Bill', category: 'charade' },
    { q: SILENT, a: 'Kong: Skull Island', category: 'charade' },
    { q: PERFORM, a: 'Kung Fu Panda 2', category: 'charade' },
    { q: SHOW, a: 'Knives Out', category: 'charade' },
  ],
  L: [
    { q: PERFORM, a: 'The Lord of the Rings', category: 'charade' },
    { q: SHOW, a: 'Life of Pi', category: 'charade' },
    { q: NOW, a: 'Lost', category: 'charade' },
    { q: ACT, a: 'The Little Mermaid', category: 'charade' },
    { q: MIME, a: 'Lego Movie', category: 'charade' },
    { q: SILENT, a: 'Law and Order', category: 'charade' },
    { q: PERFORM, a: 'Lassie', category: 'charade' },
  ],
  M: [
    { q: SILENT, a: 'Monsters, Inc.', category: 'charade' },
    { q: PERFORM, a: 'Mrs. Doubtfire', category: 'charade' },
    { q: SHOW, a: 'The Mandalorian', category: 'charade' },
    { q: NOW, a: 'Men in Black', category: 'charade' },
    { q: ACT, a: 'Mission: Impossible', category: 'charade' },
    { q: MIME, a: 'Mad Max', category: 'charade' },
    { q: SILENT, a: 'Modern Family', category: 'charade' },
  ],
  N: [
    { q: SILENT, a: 'The Nightmare Before Christmas', category: 'charade' },
    { q: PERFORM, a: 'Night at the Museum', category: 'charade' },
    { q: SHOW, a: 'Narnia', category: 'charade' },
    { q: NOW, a: 'Naruto', category: 'charade' },
  ],
  O: [
    { q: NOW, a: 'Ocean’s Eleven', category: 'charade' },
    { q: ACT, a: 'Oppenheimer', category: 'charade' },
    { q: MIME, a: 'Old School', category: 'charade' },
  ],
  P: [
    { q: SILENT, a: 'The Princess Bride', category: 'charade' },
    { q: PERFORM, a: 'Paddington', category: 'charade' },
    { q: SHOW, a: 'Peaky Blinders', category: 'charade' },
    { q: NOW, a: 'The Polar Express', category: 'charade' },
    { q: ACT, a: 'Puss in Boots', category: 'charade' },
    { q: MIME, a: 'Parks and Recreation', category: 'charade' },
    { q: SILENT, a: 'Pulp Fiction', category: 'charade' },
  ],
  Q: [{ q: MIME, a: 'Queen’s Gambit', category: 'charade' }],
  R: [
    { q: SILENT, a: 'Raiders of the Lost Ark', category: 'charade' },
    { q: PERFORM, a: 'Rio', category: 'charade' },
    { q: SHOW, a: 'Rango', category: 'charade' },
    { q: NOW, a: 'The Revenant', category: 'charade' },
    { q: ACT, a: 'Rick and Morty', category: 'charade' },
    { q: MIME, a: 'Rush Hour', category: 'charade' },
  ],
  S: [
    { q: ACT, a: 'Stranger Things', category: 'charade' },
    { q: MIME, a: 'SpongeBob SquarePants', category: 'charade' },
    { q: SILENT, a: 'The Simpsons', category: 'charade' },
    { q: PERFORM, a: 'Sherlock', category: 'charade' },
    { q: SHOW, a: 'Saving Private Ryan', category: 'charade' },
    { q: NOW, a: 'The Sound of Music', category: 'charade' },
    { q: ACT, a: 'Squid Game', category: 'charade' },
    { q: MIME, a: 'Schitt’s Creek', category: 'charade' },
    { q: SILENT, a: 'Severance', category: 'charade' },
    { q: PERFORM, a: 'Sesame Street', category: 'charade' },
  ],
  T: [
    { q: MIME, a: 'Teenage Mutant Ninja Turtles', category: 'charade' },
    { q: SILENT, a: 'The Truman Show', category: 'charade' },
    { q: PERFORM, a: 'Twilight', category: 'charade' },
    { q: SHOW, a: 'Trolls', category: 'charade' },
    { q: NOW, a: 'The Office', category: 'charade' },
    { q: ACT, a: 'The Avengers: Endgame', category: 'charade' },
    { q: MIME, a: 'Ted Lasso', category: 'charade' },
  ],
  U: [
    { q: ACT, a: 'Uncharted', category: 'charade' },
    { q: MIME, a: 'Up in the Air', category: 'charade' },
  ],
  V: [
    { q: SILENT, a: 'A Quiet Place', category: 'charade' },
    { q: PERFORM, a: 'Venom', category: 'charade' },
    { q: SHOW, a: 'The Vampire Diaries', category: 'charade' },
  ],
  W: [
    { q: SHOW, a: 'The Walking Dead', category: 'charade' },
    { q: NOW, a: 'Willy Wonka', category: 'charade' },
    { q: ACT, a: 'The Witcher', category: 'charade' },
    { q: MIME, a: 'WandaVision', category: 'charade' },
    { q: SILENT, a: 'Wednesday', category: 'charade' },
    { q: PERFORM, a: 'Westworld', category: 'charade' },
  ],
  Y: [{ q: PERFORM, a: 'Yellowstone', category: 'charade' }],
  Z: [{ q: SHOW, a: 'Zoolander', category: 'charade' }],
};
