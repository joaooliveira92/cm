/**
 * The game's static content catalogue: league packs, clubs, cities, nations, name pools and the
 * league-setup data, plus the pure helpers that read them (`canonicalId`, `contentPack`, the setup
 * index accessors) and `compareCodeUnits`.
 *
 * No Effect, no `node:*`, no React, and no dependency on `@cm-clone/shared` — that package depends
 * on this one. See `packages/AGENTS.md`.
 */
export * from "./brazilSeriesA.js";
export * from "./brazilSeriesB.js";
export * from "./canonicalId.js";
export * from "./cities.js";
export * from "./clubColours.js";
export * from "./clubs.js";
export * from "./contentPack.js";
export * from "./contentPackRegistry.js";
export * from "./englishPremierLeague.js";
export * from "./germanBundesliga.js";
export * from "./leagueSetup.js";
export * from "./leagueSetupCatalogue.js";
export * from "./namePools.js";
export * from "./nations.js";
export * from "./order.js";
export * from "./portuguesePrimeiraLiga.js";
export * from "./spanishLaLiga.js";
