import type { ContentPack } from "./contentPack.js";

/**
 * A licensed content pack for the elite English league, sourced from the 2025–26 Premier League
 * record.
 *
 * The second pack in the codebase to exercise the `LICENSED` boundary with *real* identity data,
 * after `brazilSeriesA.ts`: the twenty clubs of `comp_eng_1`, their home settlements, and their
 * grounds as they were entered into the 2025–26 English Premier League. It answers the same
 * question the base pack answers for a player of the English first division ("countless clubs,
 * which one am I managing?") with the commercial answer a real name provides — shipped *as data*,
 * replaceable and provable, exactly as `contentPack.ts` describes. The competition name it carries
 * is the licensed brand; the club ordinals are addresses, not rankings, so which real club
 * `club_eng_1_13` is says nothing about how strong that club is (its Stature Tier is drawn by
 * seed, `statureTiersFor`).
 *
 * Sources: the 2025–26 Premier League "Stadiums and locations" team table (Wikipedia) for each
 * club's home settlement, stadium, and capacity, plus the `Premier League` article (Wikipedia) for
 * the competition's licensed brand name.
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
 * The home settlements below are the same settlement names `cities.ts` curates for England, so
 * `canonicalCityId("ENG", pin.name)` already resolves to a persisted catalogue id for the common
 * cases (London, Manchester, Birmingham, Liverpool, Leeds, Nottingham). Settlements the Premier
 * League needs that the catalogue did not already curate — Bournemouth, Brighton, Burnley,
 * Newcastle, Sunderland, Wolverhampton — are added to `cities.ts` in the same change so the pins
 * and the catalogue stay consistent.
 */
export const ENGLISH_PREMIER_LEAGUE_PACK: ContentPack = {
  id: "english-premier-league-licensed",
  displayName: "English Premier League (licensed)",
  version: "1.0.0",
  contentSource: "LICENSED",
  displayNames: {
    // The competition the pack's clubs play in. Replaces the structural "English First Division"
    // the base pack carries with the licensed brand name.
    comp_eng_1: { "*": "Premier League" },

    // The twenty clubs, in ordinal address order. An ordinal is an address, never a ranking: the
    // real clubs are mapped 01-20 mechanically so the pack's key space matches the catalogue's
    // `clubCount`. Stature (and therefore real-world strength) is assigned by seed in
    // `statureTiersFor`, not by this number.
    club_eng_1_01: { "*": "Arsenal" },
    club_eng_1_02: { "*": "Aston Villa" },
    club_eng_1_03: { "*": "Bournemouth" },
    club_eng_1_04: { "*": "Brentford" },
    club_eng_1_05: { "*": "Brighton & Hove Albion" },
    club_eng_1_06: { "*": "Burnley" },
    club_eng_1_07: { "*": "Chelsea" },
    club_eng_1_08: { "*": "Crystal Palace" },
    club_eng_1_09: { "*": "Everton" },
    club_eng_1_10: { "*": "Fulham" },
    club_eng_1_11: { "*": "Leeds United" },
    club_eng_1_12: { "*": "Liverpool" },
    club_eng_1_13: { "*": "Manchester City" },
    club_eng_1_14: { "*": "Manchester United" },
    club_eng_1_15: { "*": "Newcastle United" },
    club_eng_1_16: { "*": "Nottingham Forest" },
    club_eng_1_17: { "*": "Sunderland" },
    club_eng_1_18: { "*": "Tottenham Hotspur" },
    club_eng_1_19: { "*": "West Ham United" },
    club_eng_1_20: { "*": "Wolverhampton Wanderers" },
  },
  clubColours: {
    club_eng_1_01: { // Arsenal
      primary: { background: "#EF0107", foreground: "#FFFFFF" }, // Red & White
      secondary: { background: "#FFFFFF", foreground: "#EF0107" }, // White away
      tertiary: { background: "#063672", foreground: "#FFFFFF" }, // Dark Blue alternate
      quaternary: null
    },
    club_eng_1_02: { // Aston Villa
      primary: { background: "#95BFE5", foreground: "#7B193A" }, // Claret & Blue (Blue background for high header contrast)
      secondary: { background: "#FFFFFF", foreground: "#7B193A" }, // White away
      tertiary: { background: "#7B193A", foreground: "#95BFE5" }, // Claret surface
      quaternary: null
    },
    club_eng_1_03: { // Bournemouth
      primary: { background: "#B50E12", foreground: "#000000" }, // Red & Black
      secondary: { background: "#FFFFFF", foreground: "#B50E12" }, // White/Mint away
      tertiary: null,
      quaternary: null
    },
    club_eng_1_04: { // Brentford
      primary: { background: "#E30613", foreground: "#FFFFFF" }, // Red & White
      secondary: { background: "#1A2E3B", foreground: "#FFFFFF" }, // Navy / Dark change kit
      tertiary: null,
      quaternary: null
    },
    club_eng_1_05: { // Brighton & Hove Albion
      primary: { background: "#0057B8", foreground: "#FFFFFF" }, // Blue & White
      secondary: { background: "#FFFFFF", foreground: "#0057B8" }, // White change
      tertiary: { background: "#FFCD00", foreground: "#000000" }, // Yellow alternate
      quaternary: null
    },
    club_eng_1_06: { // Burnley
      primary: { background: "#6C1D45", foreground: "#81B7E2" }, // Claret & Sky Blue
      secondary: { background: "#FFFFFF", foreground: "#6C1D45" }, // White change
      tertiary: null,
      quaternary: null
    },
    club_eng_1_07: { // Chelsea
      primary: { background: "#034694", foreground: "#FFFFFF" }, // Royal Blue
      secondary: { background: "#FFFFFF", foreground: "#034694" }, // White away
      tertiary: null,
      quaternary: null
    },
    club_eng_1_08: { // Crystal Palace
      primary: { background: "#1B458F", foreground: "#C4122E" }, // Red & Blue
      secondary: { background: "#FFFFFF", foreground: "#1B458F" }, // White away with bar
      tertiary: { background: "#000000", foreground: "#FFFFFF" }, // Black alternative
      quaternary: null
    },
    club_eng_1_09: { // Everton
      primary: { background: "#004898", foreground: "#FFFFFF" }, // Everton Blue
      secondary: { background: "#FFFFFF", foreground: "#004898" }, // White away
      tertiary: null,
      quaternary: null
    },
    club_eng_1_10: { // Fulham
      primary: { background: "#FFFFFF", foreground: "#000000" }, // White & Black
      secondary: { background: "#000000", foreground: "#FFFFFF" }, // Black away
      tertiary: null,
      quaternary: null
    },
    club_eng_1_11: { // Leeds United
      primary: { background: "#FFFFFF", foreground: "#0D2240" }, // All White (with Blue/Yellow details)
      secondary: { background: "#0D2240", foreground: "#AC9416" }, // Navy & Yellow change kit
      tertiary: null,
      quaternary: null
    },
    club_eng_1_12: { // Liverpool
      primary: { background: "#C8102E", foreground: "#FFFFFF" }, // Liverpool Red
      secondary: { background: "#FFFFFF", foreground: "#00B2A9" }, // White & Teal away
      tertiary: { background: "#1C2422", foreground: "#C8102E" }, // Dark charcoal/purple alternate
      quaternary: null
    },
    club_eng_1_13: { // Manchester City
      primary: { background: "#6CABDD", foreground: "#1C2C5B" }, // Sky Blue
      secondary: { background: "#1C2C5B", foreground: "#6CABDD" }, // Dark Navy change kit
      tertiary: { background: "#000000", foreground: "#E0FF60" }, // Neon accent alternate
      quaternary: null
    },
    club_eng_1_14: { // Manchester United
      primary: { background: "#DA291C", foreground: "#FFFFFF" }, // Red Devils
      secondary: { background: "#FFFFFF", foreground: "#132257" }, // White away
      tertiary: { background: "#132257", foreground: "#FFFFFF" }, // Navy alternative
      quaternary: null
    },
    club_eng_1_15: { // Newcastle United
      primary: { background: "#000000", foreground: "#FFFFFF" }, // Magpies Black & White
      secondary: { background: "#FFFFFF", foreground: "#000000" }, // White surface alternate
      tertiary: { background: "#41B6E6", foreground: "#FFFFFF" }, // Light blue/Green alternate kit
      quaternary: null
    },
    club_eng_1_16: { // Nottingham Forest
      primary: { background: "#DD0000", foreground: "#FFFFFF" }, // Garibaldi Red
      secondary: { background: "#FFFFFF", foreground: "#DD0000" }, // White away
      tertiary: null,
      quaternary: null
    },
    club_eng_1_17: { // Sunderland
      primary: { background: "#E50027", foreground: "#FFFFFF" }, // Red & White stripes
      secondary: { background: "#FFFFFF", foreground: "#002855" }, // White change
      tertiary: { background: "#002855", foreground: "#FFFFFF" }, // Navy / Royal alternate
      quaternary: null
    },
    club_eng_1_18: { // Tottenham Hotspur
      primary: { background: "#FFFFFF", foreground: "#132257" }, // Lilywhites (White & Navy)
      secondary: { background: "#132257", foreground: "#FFFFFF" }, // Navy away
      tertiary: null,
      quaternary: null
    },
    club_eng_1_19: { // West Ham United
      primary: { background: "#7C2C4A", foreground: "#7ACAF1" }, // Claret & Blue
      secondary: { background: "#FFFFFF", foreground: "#7C2C4A" }, // White away
      tertiary: { background: "#000000", foreground: "#7C2C4A" }, // Black alternative
      quaternary: null
    },
    club_eng_1_20: { // Wolverhampton Wanderers
      primary: { background: "#FDB913", foreground: "#231F20" }, // Old Gold & Black
      secondary: { background: "#231F20", foreground: "#FDB913" }, // Black away
      tertiary: null,
      quaternary: null
    }
  },
  stadiums: {
    club_eng_1_01: { name: "Emirates Stadium", capacity: 60704 },
    club_eng_1_02: { name: "Villa Park", capacity: 43205 },
    club_eng_1_03: { name: "Dean Court", capacity: 11307 },
    club_eng_1_04: { name: "Brentford Community Stadium", capacity: 17250 },
    club_eng_1_05: { name: "Falmer Stadium", capacity: 31876 },
    club_eng_1_06: { name: "Turf Moor", capacity: 21990 },
    club_eng_1_07: { name: "Stamford Bridge", capacity: 40044 },
    club_eng_1_08: { name: "Selhurst Park", capacity: 25194 },
    club_eng_1_09: { name: "Hill Dickinson Stadium", capacity: 52769 },
    club_eng_1_10: { name: "Craven Cottage", capacity: 28800 },
    club_eng_1_11: { name: "Elland Road", capacity: 37645 },
    club_eng_1_12: { name: "Anfield", capacity: 61276 },
    club_eng_1_13: { name: "City of Manchester Stadium", capacity: 52900 },
    club_eng_1_14: { name: "Old Trafford", capacity: 74244 },
    club_eng_1_15: { name: "St James' Park", capacity: 52264 },
    club_eng_1_16: { name: "City Ground", capacity: 31042 },
    club_eng_1_17: { name: "Stadium of Light", capacity: 48707 },
    club_eng_1_18: { name: "Tottenham Hotspur Stadium", capacity: 62850 },
    club_eng_1_19: { name: "London Stadium", capacity: 62500 },
    club_eng_1_20: { name: "Molineux Stadium", capacity: 31750 },
  },
  homeCities: {
    club_eng_1_01: { name: "London", populationBand: "major" },
    club_eng_1_02: { name: "Birmingham", populationBand: "large" },
    club_eng_1_03: { name: "Bournemouth", populationBand: "mid" },
    club_eng_1_04: { name: "London", populationBand: "major" },
    club_eng_1_05: { name: "Brighton", populationBand: "large" },
    club_eng_1_06: { name: "Burnley", populationBand: "small" },
    club_eng_1_07: { name: "London", populationBand: "major" },
    club_eng_1_08: { name: "London", populationBand: "major" },
    club_eng_1_09: { name: "Liverpool", populationBand: "large" },
    club_eng_1_10: { name: "London", populationBand: "major" },
    club_eng_1_11: { name: "Leeds", populationBand: "large" },
    club_eng_1_12: { name: "Liverpool", populationBand: "large" },
    club_eng_1_13: { name: "Manchester", populationBand: "major" },
    club_eng_1_14: { name: "Manchester", populationBand: "major" },
    club_eng_1_15: { name: "Newcastle", populationBand: "large" },
    club_eng_1_16: { name: "Nottingham", populationBand: "mid" },
    club_eng_1_17: { name: "Sunderland", populationBand: "large" },
    club_eng_1_18: { name: "London", populationBand: "major" },
    club_eng_1_19: { name: "London", populationBand: "major" },
    club_eng_1_20: { name: "Wolverhampton", populationBand: "mid" },
  },
};
