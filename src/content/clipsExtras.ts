// Bridge file: re-exports the AUTO-GENERATED clip packs (from sitcomsClips.ts
// and musicDecadeClips.ts) as letter-maps usable by `withExtra(...)`.
//
// This lets the same iTunes-preview clip questions be MIXED INTO their parent
// trivia pack (e.g. sitcomsEasyPack already has ~220 text questions; the
// clip extras add real episode previews so players see a trivia/clip blend
// when picking up the same pack).

import {
  sitcomsEasyClipsPack,
  sitcomsMediumClipsPack,
  sitcomsHardClipsPack,
} from './sitcomsClips';
import {
  music80spopClipsPack,
  music80srockClipsPack,
  music90spopClipsPack,
  music90shiphopClipsPack,
  music90saltClipsPack,
  music90srnbClipsPack,
  music00spopClipsPack,
  music00shiphopClipsPack,
  music10spopClipsPack,
  music10shiphopClipsPack,
} from './musicDecadeClips';

export const sitcomsEasyClipsExtra = sitcomsEasyClipsPack.letters;
export const sitcomsMediumClipsExtra = sitcomsMediumClipsPack.letters;
export const sitcomsHardClipsExtra = sitcomsHardClipsPack.letters;

export const music80sPopClipsExtra = music80spopClipsPack.letters;
export const music80sRockClipsExtra = music80srockClipsPack.letters;
export const music90sPopClipsExtra = music90spopClipsPack.letters;
export const music90sHipHopClipsExtra = music90shiphopClipsPack.letters;
export const music90sAltClipsExtra = music90saltClipsPack.letters;
export const music90sRnBClipsExtra = music90srnbClipsPack.letters;
export const music00sPopClipsExtra = music00spopClipsPack.letters;
export const music00sHipHopClipsExtra = music00shiphopClipsPack.letters;
export const music10sPopClipsExtra = music10spopClipsPack.letters;
export const music10sHipHopClipsExtra = music10shiphopClipsPack.letters;
