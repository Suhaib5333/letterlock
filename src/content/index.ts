import { bucketLetter, DIFFICULTY_RANK, normalizePack, type QuestionPack, type RawPack } from '../core/packs';
import { generalKnowledgePack } from './generalKnowledge';
import { extraGeneralKnowledge } from './generalKnowledge2';
import { extraGeneralKnowledge3 } from './generalKnowledge3';
import { kidsPack } from './kids';
import { extraKids } from './kids2';
import { flagsEasyPack, flagsMediumPack, flagsHardPack } from './flags';
import { historyPack } from './history';
import { spacePack } from './space';
import { geniusPack } from './genius';
import { logosEasyPack, logosMediumPack, logosHardPack } from './logos';
import { sportsEasyPack, sportsMediumPack } from './sports';
import { moviesPack, moviesHardPack } from './screen';
import { tvClipsEasyPack, tvClipsMediumPack, tvClipsHardPack } from './movieClips';
import { musicMediumPack, musicHardPack } from './musicpack';
import { melodiesPack } from './melodies';
import { melodiesExtra } from './melodiesExtra';
import { songsPack } from './songs';
import { songsExtra } from './songsExtra';
// Expansions authored to push every pack past 200 questions.
import { moviesMediumExtra } from './moviesExtra';
import { moviesHardExtra } from './moviesHardExtra';
import { musicMediumExtra, musicHardExtra } from './musicExtra';
import { sportsEasyExtra, sportsMediumExtra } from './sportsExtra';
import { geoExtra } from './geoExtra';
import { flagsEasyExtra, flagsMediumExtra, flagsHardExtra } from './flagsExtra';
import { logosEasyExtra, logosMediumExtra, logosHardExtra } from './logosExtra';
// New packs: regional + charades.
import { bahrainPack } from './bahrain';
import { saudiPack, uaePack, gulfPack } from './gcc';
import {
  charadesEasyPack,
  charadesAnimalsPack,
  charadesMoviesPack,
  charadesActionsPack,
  charadesHardPack,
} from './charades';
import {
  charadesEasyExtra,
  charadesAnimalsExtra,
  charadesMoviesExtra,
  charadesActionsExtra,
  charadesHardExtra,
} from './charadesExtra';
import { charadesMovies2 } from './charadesMovies2';
import { charadesEasy2, charadesAnimals2 } from './charades2a';
import { charadesActions2, charadesHard2 } from './charades2b';
import { charadesAnimals3, charadesActions3, charadesHard3 } from './charades3';
import { saudiExtra, uaeExtra, gulfExtra } from './gccExtra';
// Round-9 regional expansions (each pushes its pack past 200 questions).
import { bahrainExtra } from './bahrainExtra';
import { saudiExtra2 } from './saudiExtra2';
import { uaeExtra2 } from './uaeExtra2';
import { gulfExtra2 } from './gulfExtra2';
// Round-10: sitcoms (3 tiers) + decade-and-genre music packs.
import { sitcomsEasyPack } from './sitcomsEasy';
import { sitcomsMediumPack } from './sitcomsMedium';
import { sitcomsHardPack } from './sitcomsHard';
import { music80sPopPack } from './music80sPop';
import { music80sRockPack } from './music80sRock';
import { music90sHipHopPack } from './music90sHipHop';
import { music90sPopPack } from './music90sPop';
import { music90sAltPack } from './music90sAlt';
import { music90sRnBPack } from './music90sRnB';
import { music00sPopPack } from './music00sPop';
import { music00sHipHopPack } from './music00sHipHop';
import { music10sPopPack } from './music10sPop';
import { music10sHipHopPack } from './music10sHipHop';
// Round-11: each music pack expanded past 200 questions.
import { music80sPopExtra } from './music80sPopExtra';
import { music80sRockExtra } from './music80sRockExtra';
import { music90sPopExtra } from './music90sPopExtra';
import { music90sHipHopExtra } from './music90sHipHopExtra';
import { music90sAltExtra } from './music90sAltExtra';
import { music90sRnBExtra } from './music90sRnBExtra';
import { music00sPopExtra } from './music00sPopExtra';
import { music00sHipHopExtra } from './music00sHipHopExtra';
import { music10sPopExtra } from './music10sPopExtra';
// Round-12: per-letter gap-fillers — every playable letter now has ≥5 questions.
import { sportsEasyGaps } from './sportsEasyGaps';
import { sportsMediumGaps } from './sportsMediumGaps';
import { sitcomsEasyGaps } from './sitcomsEasyGaps';
import { sitcomsMediumGaps } from './sitcomsMediumGaps';
import { sitcomsHardGaps } from './sitcomsHardGaps';
import { scienceNatureGaps } from './scienceNatureGaps';
import { worldGeographyGaps } from './worldGeographyGaps';
import { moviesTvGaps } from './moviesTvGaps';
import { moviesTvHardGaps } from './moviesTvHardGaps';
import { musicGaps } from './musicGaps';
import { musicHardGaps } from './musicHardGaps';
import { music80sPopGaps } from './music80sPopGaps';
import { music80sRockGaps } from './music80sRockGaps';
import { music90sPopGaps } from './music90sPopGaps';
import { music90sHipHopGaps } from './music90sHipHopGaps';
import { music90sAltGaps } from './music90sAltGaps';
import { music90sRnBGaps } from './music90sRnBGaps';
import { music00sPopGaps } from './music00sPopGaps';
import { music00sHipHopGaps } from './music00sHipHopGaps';
import { music10sPopGaps } from './music10sPopGaps';
import { music10sHipHopGaps } from './music10sHipHopGaps';
import { historyGaps } from './historyGaps';
import { spaceCosmosGaps } from './spaceCosmosGaps';
import { geniusExtremeGaps } from './geniusExtremeGaps';
import { bahrainGaps } from './bahrainGaps';
import { saudiArabiaGaps } from './saudiArabiaGaps';
import { uaeGaps } from './uaeGaps';
import { gulfCultureGaps } from './gulfCultureGaps';
// Round-13: two new themed packs + history easy/medium tiers.
import { mythologyPack } from './mythology';
import { animalKingdomPack } from './animalKingdom';
import { conspiracyEasyPack } from './conspiracyEasy';
import { conspiracyMediumPack } from './conspiracyMedium';
import { conspiracyHardPack } from './conspiracyHard';
import { historyEasyPack } from './historyEasy';
import { historyMediumPack } from './historyMedium';
// Round-14: world-map identification packs (a country highlighted on the map).
import { mapsEasyPack, mapsMediumPack, mapsHardPack } from './maps';
// Round-16: genre-based Guess-the-Song packs (iTunes audio previews).
import {
  songsRockPack,
  songsPopPack,
  songsHiphopPack,
  songsRnbPack,
} from './songsByGenre';
// Round-15: clip extras — iTunes preview audio/video mixed into the existing
// sitcom + music decade packs (so each pack ships a trivia/clip blend).
import {
  sitcomsEasyClipsExtra, sitcomsMediumClipsExtra, sitcomsHardClipsExtra,
  music80sPopClipsExtra, music80sRockClipsExtra,
  music90sPopClipsExtra, music90sHipHopClipsExtra, music90sAltClipsExtra, music90sRnBClipsExtra,
  music00sPopClipsExtra, music00sHipHopClipsExtra,
  music10sPopClipsExtra, music10sHipHopClipsExtra,
} from './clipsExtras';
// Round-12 second pass — fill the last hard-letter shortfalls (Q/U/V/X/Y/Z).
import { sitcomsHardGaps2 } from './sitcomsHardGaps2';
import { moviesTvHardGaps2 } from './moviesTvHardGaps2';
import { musicHardGaps2 } from './musicHardGaps2';
import { music90sHipHopGaps2 } from './music90sHipHopGaps2';
import { music90sAltGaps2 } from './music90sAltGaps2';
import { music90sRnBGaps2 } from './music90sRnBGaps2';
import { music00sHipHopGaps2 } from './music00sHipHopGaps2';
import { music10sPopGaps2 } from './music10sPopGaps2';
import { music10sHipHopGaps2 } from './music10sHipHopGaps2';
import { historyGaps2 } from './historyGaps2';
// Round-17: the Arabic section (Arabic letters on the board, RTL).
import { arGeneralEasyPack } from './arGeneralEasy';
import { arGeneralMediumPack } from './arGeneralMedium';
import { arGeneralHardPack } from './arGeneralHard';
import { arGeographyPack } from './arGeography';
import { arIslamicPack } from './arIslamic';
import { arSportsPack } from './arSports';
import { arSciencePack } from './arScience';
// Round-17: Video Games — three tiers built on the most iconic/nostalgic games.
import { videoGamesEasyPack } from './videoGamesEasy';
import { videoGamesMediumPack } from './videoGamesMedium';
import { videoGamesHardPack } from './videoGamesHard';
// Round-17 wave 2: more Arabic + themed packs (all 200+ questions).
import { arProverbsPack } from './arProverbs';
import { arFoodPack } from './arFood';
import { emojiEasyPack } from './emojiEasy';
import { emojiMediumPack } from './emojiMedium';
import { foodDrinkEasyPack } from './foodDrinkEasy';
import { foodDrinkMediumPack } from './foodDrinkMedium';
import { superheroesEasyPack } from './superheroesEasy';
import { superheroesMediumPack } from './superheroesMedium';
import { arArabWorldPack } from './arArabWorld';
import { arLiteraturePack } from './arLiterature';
import { arCelebritiesPack } from './arCelebrities';
import { animeEasyPack } from './animeEasy';
import { animeMediumPack } from './animeMedium';
import { footballEasyPack } from './footballEasy';
import { footballMediumPack } from './footballMedium';
// Round-18: Fandoms — one deep pack per franchise (its own browse group).
import { fandomHarryPotterPack } from './fandomHarryPotter';
import { fandomLotrPack } from './fandomLotr';
import { fandomMarvelPack } from './fandomMarvel';
import { fandomGotPack } from './fandomGot';
import { fandomPokemonPack } from './fandomPokemon';
import { fandomMinecraftPack } from './fandomMinecraft';
import { fandomStarWarsPack } from './fandomStarWars';
import { fandomDisneyPack } from './fandomDisney';
import { fandomMarioPack } from './fandomMario';
import { fandomBreakingBadPack } from './fandomBreakingBad';
import { fandomDcPack } from './fandomDc';
import { fandomGtaPack } from './fandomGta';
import { fandomStrangerThingsPack } from './fandomStrangerThings';
import { fandomZeldaPack } from './fandomZelda';
import { fandomFriendsPack } from './fandomFriends';
import { fandomTheOfficePack } from './fandomTheOffice';
import { fandomSpongebobPack } from './fandomSpongebob';
import { ancientWorldPack } from './ancientWorld';
import { arBodyPack } from './arBody';
import { architectureLandmarksPack } from './architectureLandmarks';
import { arProphetsPack } from './arProphets';
import { arRiddlesPack } from './arRiddles';
import { arSongsPack } from './arSongs';
import { artPaintersPack } from './artPainters';
import { aviationSpaceRacePack } from './aviationSpaceRace';
import { birdsInsectsPack } from './birdsInsects';
import { businessBrandsPack } from './businessBrands';
import { carsMotorsportPack } from './carsMotorsport';
import { fairyTalesPack } from './fairyTales';
import { horrorMoviesPack } from './horrorMovies';
import { internetMemesPack } from './internetMemes';
import { inventionsPack } from './inventions';
import { medicineBodyPack } from './medicineBody';
import { oceanLifePack } from './oceanLife';
import { royalsPack } from './royals';
import { arAnimalsPack } from './arAnimals';
import { arPoetryPack } from './arPoetry';
import { arScholarsPack } from './arScholars';
import { weatherDisastersPack } from './weatherDisasters';
import { worldRecordsPack } from './worldRecords';
import { arCitiesPack } from './arCities';
import { arSpacePack } from './arSpace';
import { arRamadanPack } from './arRamadan';
import { arGulfKitchenPack } from './arGulfKitchen';
import { arInventionsPack } from './arInventions';
import { arIslamicHistoryPack } from './arIslamicHistory';
import { arLanguagePack } from './arLanguage';
import { arTechPack } from './arTech';
import { languagesWordsPack } from './languagesWords';
import { militaryHistoryPack } from './militaryHistory';
import { comicsGraphicNovelsPack } from './comicsGraphicNovels';
import { moneyEconomicsPack } from './moneyEconomics';
import { olympicsPack } from './olympics';
import { petsPack } from './pets';
import { arDramaPack } from './arDrama';
import { arGulfGeoPack } from './arGulfGeo';
import { arMathPack } from './arMath';
import { arMedicinePack } from './arMedicine';
import { arPlantsPack } from './arPlants';
import { arQuranPack } from './arQuran';
import { famousFirstsPack } from './famousFirsts';
import { fashionDesignersPack } from './fashionDesigners';
import { trainsShipsPack } from './trainsShips';
import { travelAirlinesPack } from './travelAirlines';
import { arEconomyPack } from './arEconomy';
import { arIslamicArtPack } from './arIslamicArt';
import { arSeaPack } from './arSea';
import { arWorldHistoryPack } from './arWorldHistory';
import { arCarsPack } from './arCars';
import { arCraftsPack } from './arCrafts';
import { arDesertAnimalsPack } from './arDesertAnimals';
import { arEgyptPack } from './arEgypt';
import { arLevantPack } from './arLevant';
import { arMediaPack } from './arMedia';
import { boardGamesPack } from './boardGames';
import { festivalsHolidaysPack } from './festivalsHolidays';
import { arJerusalemPack } from './arJerusalem';
import { arMaghrebPack } from './arMaghreb';
import { dinosaursPack } from './dinosaurs';
import { chessPack } from './chess';
import { oceanSailingPack } from './oceanSailing';
import { photographyPack } from './photography';
import { riversLakesPack } from './riversLakes';
import { volcanoesPack } from './volcanoes';
import { castlesPack } from './castles';
import { engineeringPack } from './engineering';
import { dancePack } from './dance';
import { predatorsPack } from './predators';
import { codesSpiesPack } from './codesSpies';
import { roboticsAiPack } from './roboticsAi';
import { drinksPack } from './drinks';
import { nobelPack } from './nobel';
import { cyclingPack } from './cycling';
import { arWorldCitiesPack } from './arWorldCities';
import { arWorldFoodPack } from './arWorldFood';
import { arJobsPack } from './arJobs';
import { arTravelPack } from './arTravel';
import { arHomePack } from './arHome';
// AUTO-REGISTER-IMPORTS (scripts/autoregister.mjs inserts new pack imports above this line)

/**
 * Re-bucket every question under the letter its ANSWER actually starts with.
 * This is the single source of truth for the core mechanic and corrects any
 * mis-keyed authoring (e.g. a question filed by its subject rather than answer).
 */
function rebucketByAnswer(pack: RawPack): RawPack {
  const letters: RawPack['letters'] = {};
  const seen = new Set<string>(); // drop duplicate questions within a pack
  for (const qs of Object.values(pack.letters)) {
    for (const q of qs) {
      // Locale-aware: Arabic packs bucket by Arabic letter (article "ال" ignored,
      // hamza forms unified) — see core/packs.bucketLetter.
      const k = bucketLetter(q.a, pack.locale);
      if (!k) continue; // skip answers outside the pack's alphabet
      const sig = `${q.q.trim().toLowerCase()}|${q.a.trim().toLowerCase()}`;
      if (seen.has(sig)) continue; // de-duplicate
      seen.add(sig);
      (letters[k] ??= []).push(q);
    }
  }
  return { ...pack, letters };
}

/** Merge one or more extra letter→questions maps into a base pack. */
function withExtra(base: RawPack, ...extras: Record<string, RawPack['letters'][string]>[]): RawPack {
  const letters: RawPack['letters'] = {};
  for (const [letter, qs] of Object.entries(base.letters)) letters[letter] = [...qs];
  for (const extra of extras) {
    for (const [letter, qs] of Object.entries(extra)) {
      letters[letter] = [...(letters[letter] ?? []), ...qs];
    }
  }
  return { ...base, letters };
}

const fullGeneralKnowledge = withExtra(
  generalKnowledgePack,
  extraGeneralKnowledge,
  extraGeneralKnowledge3,
  geoExtra, // more geography feeds GK + the World Geography themed pack
);
const fullKids = withExtra(kidsPack, extraKids);

// Trivia packs expanded past 200 questions via authored extras.
// Round-12: each non-letterless pack also merges in a *Gaps file so every
// letter has ≥5 questions. A *Gaps2 file follows where round-1 ran short.
const fullMovies = withExtra(moviesPack, moviesMediumExtra, moviesTvGaps);
const fullMoviesHard = withExtra(moviesHardPack, moviesHardExtra, moviesTvHardGaps, moviesTvHardGaps2);
const fullMusic = withExtra(musicMediumPack, musicMediumExtra, musicGaps);
const fullMusicHard = withExtra(musicHardPack, musicHardExtra, musicHardGaps, musicHardGaps2);
const fullSportsEasy = withExtra(sportsEasyPack, sportsEasyExtra, sportsEasyGaps);
const fullSportsMedium = withExtra(sportsMediumPack, sportsMediumExtra, sportsMediumGaps);
const fullFlagsEasy = withExtra(flagsEasyPack, flagsEasyExtra);
const fullFlagsMedium = withExtra(flagsMediumPack, flagsMediumExtra);
const fullFlagsHard = withExtra(flagsHardPack, flagsHardExtra);

// TV clips: iTunes can't supply 200+ *recognizable* shows per difficulty tier, so the
// three tiers are merged into ONE "TV Show Clips" pack (~220, all real verified clips).
const fullTvClips: RawPack = {
  ...withExtra(tvClipsEasyPack, tvClipsMediumPack.letters, tvClipsHardPack.letters),
  id: 'tv-clips',
  name: 'TV Show Clips',
  description: 'Watch a real episode clip and name the series — no title, no spoilers.',
  difficulty: 'medium',
};

/** Auto-attach a keyword image to charade prompts (the secret prompt shown via QR). */
function charadeImg(answer: string): string {
  const tags = answer
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .split(/\s+/)
    .join(',');
  return `https://loremflickr.com/640/480/${encodeURIComponent(tags)}`;
}
function withCharadeImages(pack: RawPack): RawPack {
  const letters: RawPack['letters'] = {};
  for (const [letter, qs] of Object.entries(pack.letters)) {
    letters[letter] = qs.map((q) => ({ ...q, image: q.image ?? charadeImg(q.a) }));
  }
  return { ...pack, letters };
}

/** Build a themed pack by filtering the GK pack to a set of categories. */
function themedFrom(
  base: RawPack,
  meta: Pick<RawPack, 'id' | 'name' | 'description' | 'emoji' | 'accent' | 'difficulty'>,
  categories: Set<string>,
): RawPack {
  const letters: RawPack['letters'] = {};
  for (const [letter, qs] of Object.entries(base.letters)) {
    const filtered = qs.filter((q) => q.category && categories.has(q.category));
    if (filtered.length > 0) letters[letter] = filtered;
  }
  return { ...base, ...meta, locale: base.locale, contentRating: 'everyone', letters };
}

const sciencePack = themedFrom(
  fullGeneralKnowledge,
  {
    id: 'science-nature',
    name: 'Science & Nature',
    description: 'Planets, animals, the body and the natural world.',
    emoji: '🔬',
    accent: '#0a9396',
    difficulty: 'medium',
  },
  new Set(['science', 'nature', 'biology', 'maths']),
);

const worldPack = themedFrom(
  fullGeneralKnowledge,
  {
    id: 'world-geography',
    name: 'World Geography',
    description: 'Capitals, countries, rivers and continents around the globe.',
    emoji: '🗺️',
    accent: '#9b2226',
    difficulty: 'medium',
  },
  new Set(['geography']),
);

/**
 * Ordered category groups, per language. The browse menu shows ONE language's
 * groups at a time (an English ⇄ عربي toggle), so Arabic packs are organised into
 * real Arabic categories rather than dumped in a single "Arabic" bucket.
 */
export const EN_GROUPS = [
  'Trivia & Knowledge',
  'Fandoms',
  'Movies & TV',
  'Music',
  'Video Games',
  'Flags',
  'Logos & Brands',
  'Sports',
  'Charades',
  'Regional',
] as const;
export const AR_GROUPS = [
  'معلومات عامة',
  'دين وتاريخ',
  'علوم وطبيعة',
  'جغرافيا وسفر',
  'رياضة',
  'فنون ومشاهير',
  'أدب ولغة',
  'طعام وتراث',
] as const;
export const PACK_GROUPS = [...EN_GROUPS, ...AR_GROUPS] as const;
export type PackGroup = (typeof PACK_GROUPS)[number];

/** Map a pack id to its browse-menu group. */
export function groupOf(id: string): PackGroup {
  // Arabic packs get Arabic categories of their own (shown under the عربي toggle).
  if (/^ar-/.test(id)) {
    if (/^ar-(islamic|history|prophets|ramadan|quran|world-history)/.test(id)) return 'دين وتاريخ';
    if (/^ar-(science|space|animals|body|nature|tech|invent|medicine|math|desert-animals)/.test(id))
      return 'علوم وطبيعة';
    if (/^ar-(geography|arab-world|gulf|cities|world-cities|flags|travel|sea|egypt|levant|maghreb|jerusalem)/.test(id))
      return 'جغرافيا وسفر';
    if (/^ar-(sports|football)/.test(id)) return 'رياضة';
    if (/^ar-(celebrities|songs|music|drama|series|movies|art|media)/.test(id)) return 'فنون ومشاهير';
    if (/^ar-(literature|proverbs|poetry|language|riddles)/.test(id)) return 'أدب ولغة';
    if (/^ar-(jobs|home|crafts2|food|world-food|heritage|clothes|plants|kitchen|crafts)/.test(id)) return 'طعام وتراث';
    return 'معلومات عامة';
  }
  if (/^fandom-/.test(id)) return 'Fandoms';
  if (/^videogames/.test(id)) return 'Video Games';
  if (/^anime|^superheroes/.test(id)) return 'Movies & TV';
  if (/^football/.test(id)) return 'Sports';
  if (/^flags|^maps/.test(id)) return 'Flags';
  if (/^logos/.test(id)) return 'Logos & Brands';
  if (/^sports/.test(id)) return 'Sports';
  if (/^charades/.test(id)) return 'Charades';
  if (/^sitcoms|clips|^movies-tv|^movies/.test(id)) return 'Movies & TV';
  if (/^music|^melodies|^songs/.test(id)) return 'Music';
  if (/^bahrain|^saudi|^uae|^gulf/.test(id)) return 'Regional';
  return 'Trivia & Knowledge';
}

/** All packs, sorted easiest → hardest for the selector. */
export const PACKS: QuestionPack[] = [
  fullKids,
  fullGeneralKnowledge,
  fullFlagsEasy,
  fullFlagsMedium,
  fullFlagsHard,
  withExtra(logosEasyPack, logosEasyExtra),
  withExtra(logosMediumPack, logosMediumExtra),
  withExtra(logosHardPack, logosHardExtra),
  fullSportsEasy,
  fullSportsMedium,
  withExtra(sciencePack, scienceNatureGaps),
  withExtra(worldPack, worldGeographyGaps),
  fullTvClips,
  fullMovies,
  fullMoviesHard,
  fullMusic,
  fullMusicHard,
  withExtra(melodiesPack, melodiesExtra),
  withExtra(songsPack, songsExtra),
  // Genre-based song clip packs (iTunes 30-second previews).
  songsRockPack,
  songsPopPack,
  songsHiphopPack,
  songsRnbPack,
  historyEasyPack,
  historyMediumPack,
  withExtra(historyPack, historyGaps, historyGaps2),
  withExtra(spacePack, spaceCosmosGaps),
  withExtra(geniusPack, geniusExtremeGaps),
  // Round-17: the Arabic section.
  arGeneralEasyPack,
  arGeneralMediumPack,
  arGeneralHardPack,
  arGeographyPack,
  arIslamicPack,
  arSportsPack,
  arSciencePack,
  // Round-17: Video Games tiers.
  videoGamesEasyPack,
  videoGamesMediumPack,
  videoGamesHardPack,
  // Round-17 wave 2.
  arProverbsPack,
  arFoodPack,
  emojiEasyPack,
  emojiMediumPack,
  foodDrinkEasyPack,
  foodDrinkMediumPack,
  superheroesEasyPack,
  superheroesMediumPack,
  arArabWorldPack,
  arLiteraturePack,
  arCelebritiesPack,
  animeEasyPack,
  animeMediumPack,
  footballEasyPack,
  footballMediumPack,
  // Round-18: Fandoms.
  fandomHarryPotterPack,
  fandomLotrPack,
  fandomMarvelPack,
  fandomGotPack,
  fandomPokemonPack,
  fandomMinecraftPack,
  fandomStarWarsPack,
  fandomDisneyPack,
  fandomMarioPack,
  fandomBreakingBadPack,
  fandomDcPack,
  fandomGtaPack,
  fandomStrangerThingsPack,
  fandomZeldaPack,
  fandomFriendsPack,
  fandomTheOfficePack,
  fandomSpongebobPack,
  ancientWorldPack,
  arBodyPack,
  architectureLandmarksPack,
  arProphetsPack,
  arRiddlesPack,
  arSongsPack,
  artPaintersPack,
  aviationSpaceRacePack,
  birdsInsectsPack,
  businessBrandsPack,
  carsMotorsportPack,
  fairyTalesPack,
  horrorMoviesPack,
  internetMemesPack,
  inventionsPack,
  medicineBodyPack,
  oceanLifePack,
  royalsPack,
  arAnimalsPack,
  arPoetryPack,
  arScholarsPack,
  weatherDisastersPack,
  worldRecordsPack,
  arCitiesPack,
  arSpacePack,
  arRamadanPack,
  arGulfKitchenPack,
  arInventionsPack,
  arIslamicHistoryPack,
  arLanguagePack,
  arTechPack,
  languagesWordsPack,
  militaryHistoryPack,
  comicsGraphicNovelsPack,
  moneyEconomicsPack,
  olympicsPack,
  petsPack,
  arDramaPack,
  arGulfGeoPack,
  arMathPack,
  arMedicinePack,
  arPlantsPack,
  arQuranPack,
  famousFirstsPack,
  fashionDesignersPack,
  trainsShipsPack,
  travelAirlinesPack,
  arEconomyPack,
  arIslamicArtPack,
  arSeaPack,
  arWorldHistoryPack,
  arCarsPack,
  arCraftsPack,
  arDesertAnimalsPack,
  arEgyptPack,
  arLevantPack,
  arMediaPack,
  boardGamesPack,
  festivalsHolidaysPack,
  arJerusalemPack,
  arMaghrebPack,
  dinosaursPack,
  chessPack,
  oceanSailingPack,
  photographyPack,
  riversLakesPack,
  volcanoesPack,
  castlesPack,
  engineeringPack,
  dancePack,
  predatorsPack,
  codesSpiesPack,
  roboticsAiPack,
  drinksPack,
  nobelPack,
  cyclingPack,
  arWorldCitiesPack,
  arWorldFoodPack,
  arJobsPack,
  arTravelPack,
  arHomePack,
  // AUTO-REGISTER-PACKS (scripts/autoregister.mjs inserts new pack entries above this line)
  // Round-13: new themed packs.
  mythologyPack,
  animalKingdomPack,
  // Conspiracy Theories — three difficulty tiers (collapse into one tier-card):
  // easy (mainstream lore), medium (named cover-ups/cryptids), hard (declassified
  // ops & deep cuts). 200+ questions each.
  conspiracyEasyPack,
  conspiracyMediumPack,
  conspiracyHardPack,
  // Round-14: world-map identification packs.
  mapsEasyPack,
  mapsMediumPack,
  mapsHardPack,
  // Regional packs (Bahrain + GCC).
  withExtra(bahrainPack, bahrainExtra, bahrainGaps),
  withExtra(saudiPack, saudiExtra, saudiExtra2, saudiArabiaGaps),
  withExtra(uaePack, uaeExtra, uaeExtra2, uaeGaps),
  withExtra(gulfPack, gulfExtra, gulfExtra2, gulfCultureGaps),
  // Charades (images attached for the QR secret-prompt page).
  withCharadeImages(withExtra(charadesEasyPack, charadesEasyExtra, charadesEasy2)),
  withCharadeImages(withExtra(charadesAnimalsPack, charadesAnimalsExtra, charadesAnimals2, charadesAnimals3)),
  withCharadeImages(withExtra(charadesMoviesPack, charadesMoviesExtra, charadesMovies2)),
  withCharadeImages(withExtra(charadesActionsPack, charadesActionsExtra, charadesActions2, charadesActions3)),
  withCharadeImages(withExtra(charadesHardPack, charadesHardExtra, charadesHard2, charadesHard3)),
  // Round-10: sitcoms (Movies & TV group) — easy → hard.
  withExtra(sitcomsEasyPack, sitcomsEasyGaps, sitcomsEasyClipsExtra),
  withExtra(sitcomsMediumPack, sitcomsMediumGaps, sitcomsMediumClipsExtra),
  withExtra(sitcomsHardPack, sitcomsHardGaps, sitcomsHardGaps2, sitcomsHardClipsExtra),
  // Round-10: era + genre music packs (round-11 extras + round-12 gaps merged in).
  // Round-15 clip extras add iTunes preview audio clips into each music pack.
  withExtra(music80sPopPack, music80sPopExtra, music80sPopGaps, music80sPopClipsExtra),
  withExtra(music80sRockPack, music80sRockExtra, music80sRockGaps, music80sRockClipsExtra),
  withExtra(music90sPopPack, music90sPopExtra, music90sPopGaps, music90sPopClipsExtra),
  withExtra(music90sHipHopPack, music90sHipHopExtra, music90sHipHopGaps, music90sHipHopGaps2, music90sHipHopClipsExtra),
  withExtra(music90sAltPack, music90sAltExtra, music90sAltGaps, music90sAltGaps2, music90sAltClipsExtra),
  withExtra(music90sRnBPack, music90sRnBExtra, music90sRnBGaps, music90sRnBGaps2, music90sRnBClipsExtra),
  withExtra(music00sPopPack, music00sPopExtra, music00sPopGaps, music00sPopClipsExtra),
  withExtra(music00sHipHopPack, music00sHipHopExtra, music00sHipHopGaps, music00sHipHopGaps2, music00sHipHopClipsExtra),
  withExtra(music10sPopPack, music10sPopExtra, music10sPopGaps, music10sPopGaps2, music10sPopClipsExtra),
  withExtra(music10sHipHopPack, music10sHipHopGaps, music10sHipHopGaps2, music10sHipHopClipsExtra),
]
  .map((p) => ({ ...normalizePack(rebucketByAnswer(p)), group: groupOf(p.id) }))
  .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);

export const DEFAULT_PACK_ID = fullGeneralKnowledge.id;

export function packById(id: string): QuestionPack {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}
