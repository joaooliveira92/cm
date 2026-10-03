import type { ContentPack } from "./contentPack.js";

/**
 * A licensed content pack for the elite German league, sourced from the 2026-27 Bundesliga record.
 *
 * The sibling of `portuguesePrimeiraLiga.ts`: the eighteen clubs of `comp_deu_1`, their home
 * settlements, and their grounds. The competition name is the licensed brand; the club ordinals are
 * addresses, not rankings, so which real club `club_deu_1_05` is says nothing about how strong that
 * club is (its Stature Tier is drawn by seed, `statureTiersFor`).
 *
 * The eighteen are the clubs the badge library holds under the current season of its Bundesliga
 * source, mapped to their `deu/` badge keys by hand. Stadium capacities are rounded league-record
 * figures.
 *
 * Colours are deliberately not authored: a kit colour is a factual claim to source per club, so
 * `clubColours` stays empty and clubs use their id-derived fallback scheme.
 *
 * `stadiums` and `homeCities` record real facts but nothing reads them yet, exactly as in the other
 * licensed packs.
 */
export const GERMAN_BUNDESLIGA_PACK: ContentPack = {
  id: "german-bundesliga-licensed",
  displayName: "German Bundesliga (licensed)",
  version: "1.0.0",
  contentSource: "LICENSED",
  displayNames: {
    comp_deu_1: { "*": "Bundesliga" },

    club_deu_1_01: { "*": "1. FC Köln" },
    club_deu_1_02: { "*": "1. FC Union Berlin" },
    club_deu_1_03: { "*": "1. FSV Mainz 05" },
    club_deu_1_04: { "*": "Bayer 04 Leverkusen" },
    club_deu_1_05: { "*": "Bayern Munich" },
    club_deu_1_06: { "*": "Borussia Dortmund" },
    club_deu_1_07: { "*": "Borussia Mönchengladbach" },
    club_deu_1_08: { "*": "Eintracht Frankfurt" },
    club_deu_1_09: { "*": "FC Augsburg" },
    club_deu_1_10: { "*": "FC Schalke 04" },
    club_deu_1_11: { "*": "Hamburger SV" },
    club_deu_1_12: { "*": "RB Leipzig" },
    club_deu_1_13: { "*": "SC Freiburg" },
    club_deu_1_14: { "*": "SC Paderborn 07" },
    club_deu_1_15: { "*": "SV 07 Elversberg" },
    club_deu_1_16: { "*": "SV Werder Bremen" },
    club_deu_1_17: { "*": "TSG 1899 Hoffenheim" },
    club_deu_1_18: { "*": "VfB Stuttgart" },
  },
  clubColours: {},
  clubBadges: {
    club_deu_1_01: "deu/1-fc-koln",
    club_deu_1_02: "deu/1-fc-union-berlin",
    club_deu_1_03: "deu/1-fsv-mainz-05",
    club_deu_1_04: "deu/bayer-04-leverkusen",
    club_deu_1_05: "deu/bayern-munich",
    club_deu_1_06: "deu/borussia-dortmund",
    club_deu_1_07: "deu/borussia-monchengladbach",
    club_deu_1_08: "deu/eintracht-frankfurt",
    club_deu_1_09: "deu/fc-augsburg",
    club_deu_1_10: "deu/fc-schalke-04",
    club_deu_1_11: "deu/hamburger-sv",
    club_deu_1_12: "deu/rb-leipzig",
    club_deu_1_13: "deu/sc-freiburg",
    club_deu_1_14: "deu/sc-paderborn-07",
    club_deu_1_15: "deu/sv-07-elversberg",
    club_deu_1_16: "deu/sv-werder-bremen",
    club_deu_1_17: "deu/tsg-1899-hoffenheim",
    club_deu_1_18: "deu/vfb-stuttgart",
  },
  stadiums: {
    club_deu_1_01: { name: "RheinEnergieStadion", capacity: 50000 },
    club_deu_1_02: { name: "Stadion An der Alten Försterei", capacity: 22012 },
    club_deu_1_03: { name: "Mewa Arena", capacity: 33305 },
    club_deu_1_04: { name: "BayArena", capacity: 30210 },
    club_deu_1_05: { name: "Allianz Arena", capacity: 75024 },
    club_deu_1_06: { name: "Signal Iduna Park", capacity: 81365 },
    club_deu_1_07: { name: "Borussia-Park", capacity: 54057 },
    club_deu_1_08: { name: "Deutsche Bank Park", capacity: 58000 },
    club_deu_1_09: { name: "WWK Arena", capacity: 30660 },
    club_deu_1_10: { name: "Veltins-Arena", capacity: 62271 },
    club_deu_1_11: { name: "Volksparkstadion", capacity: 57000 },
    club_deu_1_12: { name: "Red Bull Arena", capacity: 47069 },
    club_deu_1_13: { name: "Europa-Park Stadion", capacity: 34700 },
    club_deu_1_14: { name: "Home Deluxe Arena", capacity: 15000 },
    club_deu_1_15: { name: "Ursapharm-Arena an der Kaiserlinde", capacity: 10000 },
    club_deu_1_16: { name: "Weserstadion", capacity: 42100 },
    club_deu_1_17: { name: "PreZero Arena", capacity: 30150 },
    club_deu_1_18: { name: "MHPArena", capacity: 60449 },
  },
  homeCities: {
    club_deu_1_01: { name: "Cologne", populationBand: "large" },
    club_deu_1_02: { name: "Berlin", populationBand: "major" },
    club_deu_1_03: { name: "Mainz", populationBand: "small" },
    club_deu_1_04: { name: "Leverkusen", populationBand: "small" },
    club_deu_1_05: { name: "Munich", populationBand: "major" },
    club_deu_1_06: { name: "Dortmund", populationBand: "large" },
    club_deu_1_07: { name: "Monchengladbach", populationBand: "small" },
    club_deu_1_08: { name: "Frankfurt", populationBand: "large" },
    club_deu_1_09: { name: "Augsburg", populationBand: "small" },
    club_deu_1_10: { name: "Gelsenkirchen", populationBand: "small" },
    club_deu_1_11: { name: "Hamburg", populationBand: "major" },
    club_deu_1_12: { name: "Leipzig", populationBand: "mid" },
    club_deu_1_13: { name: "Freiburg", populationBand: "small" },
    club_deu_1_14: { name: "Paderborn", populationBand: "small" },
    club_deu_1_15: { name: "Elversberg", populationBand: "small" },
    club_deu_1_16: { name: "Bremen", populationBand: "mid" },
    club_deu_1_17: { name: "Sinsheim", populationBand: "small" },
    club_deu_1_18: { name: "Stuttgart", populationBand: "large" },
  },
};
