import { BRAZIL_SERIES_A_PACK } from "./brazilSeriesA.js";
import { BRAZIL_SERIES_B_PACK } from "./brazilSeriesB.js";
import { BASE_CONTENT_PACK, type ContentPack } from "./contentPack.js";
import { ENGLISH_PREMIER_LEAGUE_PACK } from "./englishPremierLeague.js";
import { SPANISH_LA_LIGA_PACK } from "./spanishLaLiga.js";

/**
 * Every content pack this build carries: the fictional base pack and the licensed packs beside it.
 *
 * One list, so every consumer that must see *all* packs reads the same set. Saves resolve names
 * against it, the club badge library's integrity test checks every pack's `clubBadges` against it,
 * and the badge import refuses to remove a key any of them maps. A pack added anywhere else would
 * be resolvable by saves yet invisible to those guards.
 */
export const CONTENT_PACKS: ReadonlyArray<ContentPack> = [
  BASE_CONTENT_PACK,
  BRAZIL_SERIES_A_PACK,
  BRAZIL_SERIES_B_PACK,
  ENGLISH_PREMIER_LEAGUE_PACK,
  SPANISH_LA_LIGA_PACK,
];
