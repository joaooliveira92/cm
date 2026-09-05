import type { ContentPack } from "./contentPack.js";

/**
 * A licensed content pack for Brazil's second tier, sourced from the 2026 Série B record.
 *
 * The sibling of `brazilSeriesA.ts`: where that pack exercises the `LICENSED` boundary for the
 * elite league (`comp_bra_1`), this one does the same for the second division (`comp_bra_2`),
 * re-realising the twenty clubs of `comp_bra_2`, their settlements, and their grounds as entered
 * into the 2026 Campeonato Brasileiro Série B. The 2026 field is a deliberately stale-adjacent
 * snapshot: four clubs were relegated from the previous Série A (Ceará, Fortaleza, Juventude,
 * Sport) and four promoted from Série C (Londrina, Náutico, Ponte Preta, São Bernardo) — but the
 * ordinals below are addresses, not standings, so which real club `club_bra_2_06` is says nothing
 * about strength (that is drawn by seed in `statureTiersFor`).
 *
 * Sources: the 2026 Série B "Stadiums and locations" team table (Wikipedia) for each club's home
 * settlement, stadium, and capacity. Capacity figures are as entered there for the 2026 season.
 *
 * ### Deliberately not authored here
 *
 * - **Colours.** Same decision as the Série A pack: real kit colour is a factual claim that must
 *   be sourced per club, so `clubColours` stays empty and clubs resolve to their id-derived
 *   fallback scheme until kit data is researched.
 *
 * ### Status of the identity maps
 *
 * As with Série A, `stadiums` and `homeCities` record real facts but **nothing reads them yet**:
 * MVP generation draws fictional grounds and home towns from `clubGeneration.ts`, and the schema
 * stores whatever generation wrote. The maps are the licensed truth sitting beside the names,
 * ready for the ticket that wires generation to consult the active pack.
 *
 * ### City reference
 *
 * The home settlements below are the same names `cities.ts` curates for Brazil, so
 * `canonicalCityId("BRA", pin.name)` already resolves to a persisted catalogue id. Série B's
 * settlements that the catalogue did not yet curate — Goiania, Campinas, Maceio, Ribeirao Preto,
 * Sao Bernardo do Campo, Cuiaba, Florianopolis, Londrina, Caxias do Sul, Criciuma, Sao Joao
 * del-Rei, Ponta Grossa, Novo Horizonte — are added to `cities.ts` in the same change so the pins
 * and the catalogue stay consistent.
 */
export const BRAZIL_SERIES_B_PACK: ContentPack = {
  id: "brazil-serie-b-licenced",
  displayName: "Brazilian Série B (licensed)",
  version: "1.0.0",
  contentSource: "LICENSED",
  displayNames: {
    // The competition the pack's clubs play in, replacing the structural "Brazilian Second
    // Division" the base pack carries with the licensed brand name.
    comp_bra_2: { "*": "Campeonato Brasileiro Série B" },

    // The twenty clubs, in ordinal address order. An ordinal is an address, never a ranking — the
    // real clubs are mapped 01-20 mechanically to match the catalogue's `clubCount`.
    club_bra_2_01: { "*": "América Mineiro" },
    club_bra_2_02: { "*": "Athletic" },
    club_bra_2_03: { "*": "Atlético Goianiense" },
    club_bra_2_04: { "*": "Avaí" },
    club_bra_2_05: { "*": "Botafogo-SP" },
    club_bra_2_06: { "*": "Ceará" },
    club_bra_2_07: { "*": "CRB" },
    club_bra_2_08: { "*": "Criciúma" },
    club_bra_2_09: { "*": "Cuiabá" },
    club_bra_2_10: { "*": "Fortaleza" },
    club_bra_2_11: { "*": "Goiás" },
    club_bra_2_12: { "*": "Juventude" },
    club_bra_2_13: { "*": "Londrina" },
    club_bra_2_14: { "*": "Náutico" },
    club_bra_2_15: { "*": "Novorizontino" },
    club_bra_2_16: { "*": "Operário Ferroviário" },
    club_bra_2_17: { "*": "Ponte Preta" },
    club_bra_2_18: { "*": "São Bernardo" },
    club_bra_2_19: { "*": "Sport" },
    club_bra_2_20: { "*": "Vila Nova" },
  },
  clubColours: {},
  stadiums: {
    club_bra_2_01: { name: "Arena Independência", capacity: 23018 },
    club_bra_2_02: { name: "Arena Sicredi", capacity: 6000 },
    club_bra_2_03: { name: "Antônio Accioly", capacity: 12500 },
    club_bra_2_04: { name: "Ressacada", capacity: 17826 },
    club_bra_2_05: { name: "Santa Cruz", capacity: 29292 },
    // Ceará and Fortaleza both enter Castelão as their 2026 ground; the two share the arena, the
    // same way Flamengo and Fluminense share Maracanã in the Série A pack.
    club_bra_2_06: { name: "Castelão", capacity: 57876 },
    club_bra_2_07: { name: "Rei Pelé", capacity: 17126 },
    club_bra_2_08: { name: "Heriberto Hülse", capacity: 19225 },
    club_bra_2_09: { name: "Arena Pantanal", capacity: 44000 },
    club_bra_2_10: { name: "Castelão", capacity: 57876 },
    club_bra_2_11: { name: "Estádio da Serrinha", capacity: 14450 },
    club_bra_2_12: { name: "Alfredo Jaconi", capacity: 19924 },
    club_bra_2_13: { name: "Estádio do Café", capacity: 31000 },
    club_bra_2_14: { name: "Aflitos", capacity: 22856 },
    club_bra_2_15: { name: "Doutor Jorge Ismael de Biasi", capacity: 16000 },
    club_bra_2_16: { name: "Germano Krüger", capacity: 10632 },
    club_bra_2_17: { name: "Moisés Lucarelli", capacity: 19728 },
    club_bra_2_18: { name: "1º de Maio", capacity: 15159 },
    club_bra_2_19: { name: "Ilha do Retiro", capacity: 32983 },
    club_bra_2_20: { name: "Onésio Brasileiro Alvarenga", capacity: 6500 },
  },
  homeCities: {
    club_bra_2_01: { name: "Belo Horizonte", populationBand: "large" },
    club_bra_2_02: { name: "Sao Joao del-Rei", populationBand: "small" },
    club_bra_2_03: { name: "Goiania", populationBand: "large" },
    club_bra_2_04: { name: "Florianopolis", populationBand: "mid" },
    club_bra_2_05: { name: "Ribeirao Preto", populationBand: "large" },
    club_bra_2_06: { name: "Fortaleza", populationBand: "large" },
    club_bra_2_07: { name: "Maceio", populationBand: "large" },
    club_bra_2_08: { name: "Criciuma", populationBand: "small" },
    club_bra_2_09: { name: "Cuiaba", populationBand: "mid" },
    club_bra_2_10: { name: "Fortaleza", populationBand: "large" },
    club_bra_2_11: { name: "Goiania", populationBand: "large" },
    club_bra_2_12: { name: "Caxias do Sul", populationBand: "mid" },
    club_bra_2_13: { name: "Londrina", populationBand: "mid" },
    club_bra_2_14: { name: "Recife", populationBand: "large" },
    club_bra_2_15: { name: "Novo Horizonte", populationBand: "small" },
    club_bra_2_16: { name: "Ponta Grossa", populationBand: "small" },
    club_bra_2_17: { name: "Campinas", populationBand: "large" },
    club_bra_2_18: { name: "Sao Bernardo do Campo", populationBand: "large" },
    club_bra_2_19: { name: "Recife", populationBand: "large" },
    club_bra_2_20: { name: "Goiania", populationBand: "large" },
  },
};