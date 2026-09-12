import type { ContentPack } from "./contentPack.js";

/**
 * A licensed content pack for the elite Spanish league, sourced from the 2026–27 La Liga record.
 *
 * The fourth pack in the codebase to exercise the `LICENSED` boundary with *real* identity data,
 * after `brazilSeriesA.ts`, `brazilSeriesB.ts`, and `englishPremierLeague.ts`: the twenty clubs of
 * `comp_esp_1`, their home settlements, and their grounds as they were entered into the 2026–27
 * Spanish Primera División. It answers the same question the base pack answers for a player of the
 * Spanish first division ("countless clubs, which one am I managing?") with the commercial answer a
 * real name provides — shipped *as data*, replaceable and provable, exactly as `contentPack.ts`
 * describes. The competition name it carries is the licensed brand; the club ordinals are
 * addresses, not rankings, so which real club `club_esp_1_13` is says nothing about how strong
 * that club is (its Stature Tier is drawn by seed, `statureTiersFor`).
 *
 * Sources: the 2026–27 La Liga "Stadiums and locations" team table (Wikipedia) for each club's
 * home settlement, stadium, and capacity, plus the `La Liga` article (Wikipedia) for the
 * competition's licensed brand name.
 *
 * ### Deliberately not authored here
 *
 * - **Colours.** Real kit colour is part of a club's commercial identity, so it would belong in
 *   this pack — but it is not part of the "clubs, places, stadiums" request this pack was
 *   generated to satisfy, and an authored `clubColours` entry is a factual claim that must be
 *   sourced per club rather than guessed. The pack leaves `clubColours` empty, so every club
 *   resolves to its id-derived fallback scheme (`clubColours.ts`) until kit data is researched.
 *
 * ### Status of the identity maps
 *
 * `stadiums` and `homeCities` record real facts about each club but **nothing reads them yet**:
 * MVP generation draws a fictional ground name, capacity, and home town for every club from
 * `clubGeneration.ts`, and the schema stores whatever generation wrote. Until a ticket wires
 * generation to consult the active pack (and decides how a pack that authors some clubs degrades
 * the clubs it leaves un-authored), these maps are the licensed truth sitting beside the names,
 * ready to be honoured.
 *
 * ### City reference
 *
 * The home settlements below are the same settlement names `cities.ts` curates for Spain, so
 * `canonicalCityId("ESP", pin.name)` already resolves to a persisted catalogue id for the common
 * cases (Madrid, Barcelona, Valencia, Seville, Malaga, Bilbao). Settlements La Liga needs that the
 * catalogue did not already curate — Vitoria-Gasteiz, Vigo, Elche, A Coruna, San Sebastian,
 * Getafe, Santander, Villarreal, Cornella de Llobregat, Pamplona — are added to `cities.ts` in the
 * same change so the pins and the catalogue stay consistent.
 *
 * ### Single-ground note
 *
 * The 2026–27 season sees three clubs temporarily away from their primary grounds: Rayo Vallecano
 * at Estadio Ontime Butarque, Real Betis at Estadio Olímpico de la Cartuja, and Deportivo at
 * Estadio ABANCA Riazor (their own ground, re-adapted). The table's entered venues are recorded
 * here as-is; the single-ground schema takes whatever the season's table carries.
 */
export const SPANISH_LA_LIGA_PACK: ContentPack = {
  id: "spanish-la-liga-licensed",
  displayName: "Spanish La Liga (licensed)",
  version: "1.0.0",
  contentSource: "LICENSED",
  displayNames: {
    // The competition the pack's clubs play in. Replaces the structural "Spanish First Division"
    // the base pack carries with the licensed brand name.
    comp_esp_1: { "*": "La Liga" },

    // The twenty clubs, in ordinal address order. An ordinal is an address, never a ranking: the
    // real clubs are mapped 01-20 mechanically so the pack's key space matches the catalogue's
    // `clubCount`. Stature (and therefore real-world strength) is assigned by seed in
    // `statureTiersFor`, not by this number.
    club_esp_1_01: { "*": "Alavés" },
    club_esp_1_02: { "*": "Athletic Bilbao" },
    club_esp_1_03: { "*": "Atlético Madrid" },
    club_esp_1_04: { "*": "Barcelona" },
    club_esp_1_05: { "*": "Celta Vigo" },
    club_esp_1_06: { "*": "Deportivo A Coruña" },
    club_esp_1_07: { "*": "Elche" },
    club_esp_1_08: { "*": "Espanyol" },
    club_esp_1_09: { "*": "Getafe" },
    club_esp_1_10: { "*": "Levante" },
    club_esp_1_11: { "*": "Málaga" },
    club_esp_1_12: { "*": "Osasuna" },
    club_esp_1_13: { "*": "Racing Santander" },
    club_esp_1_14: { "*": "Rayo Vallecano" },
    club_esp_1_15: { "*": "Real Betis" },
    club_esp_1_16: { "*": "Real Madrid" },
    club_esp_1_17: { "*": "Real Sociedad" },
    club_esp_1_18: { "*": "Sevilla" },
    club_esp_1_19: { "*": "Valencia" },
    club_esp_1_20: { "*": "Villarreal" },
  },
  clubColours: {},
  clubBadges: {
    club_esp_1_01: "esp/deportivo-alaves",
    club_esp_1_02: "esp/athletic-bilbao",
    club_esp_1_03: "esp/atletico-de-madrid",
    club_esp_1_04: "esp/fc-barcelona",
    club_esp_1_05: "esp/celta-de-vigo",
    club_esp_1_06: "esp/deportivo-a-coruna",
    club_esp_1_07: "esp/elche-cf",
    club_esp_1_08: "esp/rcd-espanyol-barcelona",
    club_esp_1_09: "esp/getafe-cf",
    club_esp_1_10: "esp/levante-ud",
    club_esp_1_11: "esp/malaga-cf",
    club_esp_1_12: "esp/ca-osasuna",
    club_esp_1_13: "esp/racing-santander",
    club_esp_1_14: "esp/rayo-vallecano",
    club_esp_1_15: "esp/real-betis-balompie",
    club_esp_1_16: "esp/real-madrid",
    club_esp_1_17: "esp/real-sociedad",
    club_esp_1_18: "esp/sevilla-fc",
    club_esp_1_19: "esp/valencia-cf",
    club_esp_1_20: "esp/villarreal-cf",
  },
  stadiums: {
    club_esp_1_01: { name: "Estadio Mendizorrotza", capacity: 19840 },
    club_esp_1_02: { name: "Estadio San Mamés", capacity: 53289 },
    club_esp_1_03: { name: "Estadio Riyadh Air Metropolitano", capacity: 70692 },
    club_esp_1_04: { name: "Camp Nou", capacity: 105000 },
    club_esp_1_05: { name: "Estadio ABANCA Balaídos", capacity: 24870 },
    club_esp_1_06: { name: "Estadio ABANCA Riazor", capacity: 32660 },
    club_esp_1_07: { name: "Estadio Martínez Valero", capacity: 31388 },
    club_esp_1_08: { name: "RCDE Stadium", capacity: 37776 },
    club_esp_1_09: { name: "Estadio Coliseum", capacity: 16500 },
    club_esp_1_10: { name: "Estadio Ciutat de València", capacity: 26354 },
    club_esp_1_11: { name: "La Rosaleda Stadium", capacity: 30044 },
    club_esp_1_12: { name: "Estadio El Sadar", capacity: 23576 },
    club_esp_1_13: { name: "Campos de Sport de El Sardinero", capacity: 22308 },
    club_esp_1_14: { name: "Estadio Ontime Butarque", capacity: 14500 },
    club_esp_1_15: { name: "Estadio Olímpico de la Cartuja", capacity: 70000 },
    club_esp_1_16: { name: "Bernabéu", capacity: 83186 },
    club_esp_1_17: { name: "Reale Arena", capacity: 39313 },
    club_esp_1_18: { name: "Estadio Ramón Sánchez-Pizjuán", capacity: 43883 },
    club_esp_1_19: { name: "Camp de Mestalla", capacity: 49430 },
    club_esp_1_20: { name: "Estadio de la Cerámica", capacity: 23008 },
  },
  homeCities: {
    club_esp_1_01: { name: "Vitoria-Gasteiz", populationBand: "mid" },
    club_esp_1_02: { name: "Bilbao", populationBand: "mid" },
    club_esp_1_03: { name: "Madrid", populationBand: "major" },
    club_esp_1_04: { name: "Barcelona", populationBand: "major" },
    club_esp_1_05: { name: "Vigo", populationBand: "mid" },
    club_esp_1_06: { name: "A Coruna", populationBand: "mid" },
    club_esp_1_07: { name: "Elche", populationBand: "mid" },
    club_esp_1_08: { name: "Cornella de Llobregat", populationBand: "small" },
    club_esp_1_09: { name: "Getafe", populationBand: "small" },
    club_esp_1_10: { name: "Valencia", populationBand: "large" },
    club_esp_1_11: { name: "Malaga", populationBand: "mid" },
    club_esp_1_12: { name: "Pamplona", populationBand: "mid" },
    club_esp_1_13: { name: "Santander", populationBand: "small" },
    club_esp_1_14: { name: "Madrid", populationBand: "major" },
    club_esp_1_15: { name: "Seville", populationBand: "large" },
    club_esp_1_16: { name: "Madrid", populationBand: "major" },
    club_esp_1_17: { name: "San Sebastian", populationBand: "small" },
    club_esp_1_18: { name: "Seville", populationBand: "large" },
    club_esp_1_19: { name: "Valencia", populationBand: "large" },
    club_esp_1_20: { name: "Villarreal", populationBand: "small" },
  },
};
