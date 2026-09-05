import type { ContentPack } from "./contentPack.js";

/**
 * A licensed content pack for the elite Brazilian league, sourced from the 2026 Série A record.
 *
 * This is the first pack in the codebase to exercise the `LICENSED` boundary with *real* identity
 * data: the twenty clubs of `comp_bra_1`, their home settlements, and their grounds as they were
 * entered into the 2026 Campeonato Brasileiro Série A. It exists to answer the same question the
 * base pack answers for England ("countless clubs, which one am I managing?") with the commercial
 * answer a real name provides — and it is shipped *as data*, replaceable and provable, exactly as
 * `contentPack.ts` describes. The competition name it carries is the licensed brand; the club
 * ordinals are addresses, not rankings, so which real club `club_bra_1_13` is says nothing about
 * how strong that club is (its Stature Tier is drawn by seed, `statureTiersFor`).
 *
 * Sources: the 2026 Série A "Stadiums and locations" team table (Wikipedia) for each club's home
 * settlement, stadium, and capacity. An `*` note in the stadium name documents the single-ground
 * pick where the 2026 table entered two venues (Remo), since the schema carries one stadium per
 * club.
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
 * The home settlements below are the same settlement names `cities.ts` curates for Brazil, so
 * `canonicalCityId("BRA", pin.name)` already resolves to a persisted catalogue id for the common
 * cases (Sao Paulo, Rio de Janeiro, Belo Horizonte, Porto Alegre, Salvador, Fortaleza, Recife,
 * Curitiba, Manaus). Settlements Série A needs that the catalogue does not yet curate — Chapeco,
 * Mirassol, Braganca Paulista, Belem, Santos — are added to `cities.ts` in the same change so the
 * pins and the catalogue stay consistent.
 */
export const BRAZIL_SERIES_A_PACK: ContentPack = {
  id: "brazil-serie-a-licenced",
  displayName: "Brazilian Série A (licensed)",
  version: "1.0.0",
  contentSource: "LICENSED",
  displayNames: {
    // The competition the pack's clubs play in. Replaces the structural "Brazilian First Division"
    // the base pack carries with the licensed brand name.
    comp_bra_1: { "*": "Campeonato Brasileiro Série A" },

    // The twenty clubs, in ordinal address order. An ordinal is an address, never a ranking: the
    // real clubs are mapped 01-20 mechanically so the pack's key space matches the catalogue's
    // `clubCount`. Stature (and therefore real-world strength) is assigned by seed in
    // `statureTiersFor`, not by this number.
    club_bra_1_01: { "*": "Athletico Paranaense" },
    club_bra_1_02: { "*": "Atlético Mineiro" },
    club_bra_1_03: { "*": "Bahia" },
    club_bra_1_04: { "*": "Botafogo" },
    club_bra_1_05: { "*": "Chapecoense" },
    club_bra_1_06: { "*": "Corinthians" },
    club_bra_1_07: { "*": "Coritiba" },
    club_bra_1_08: { "*": "Cruzeiro" },
    club_bra_1_09: { "*": "Flamengo" },
    club_bra_1_10: { "*": "Fluminense" },
    club_bra_1_11: { "*": "Grêmio" },
    club_bra_1_12: { "*": "Internacional" },
    club_bra_1_13: { "*": "Mirassol" },
    club_bra_1_14: { "*": "Palmeiras" },
    club_bra_1_15: { "*": "Red Bull Bragantino" },
    club_bra_1_16: { "*": "Remo" },
    club_bra_1_17: { "*": "Santos" },
    club_bra_1_18: { "*": "São Paulo" },
    club_bra_1_19: { "*": "Vasco da Gama" },
    club_bra_1_20: { "*": "Vitória" },
  },
  clubColours: {},
  stadiums: {
    club_bra_1_01: { name: "Arena da Baixada", capacity: 42372 },
    club_bra_1_02: { name: "Arena MRV", capacity: 44892 },
    club_bra_1_03: { name: "Casa de Apostas Arena Fonte Nova", capacity: 50052 },
    club_bra_1_04: { name: "Olímpico Nilton Santos", capacity: 44661 },
    club_bra_1_05: { name: "Arena Condá", capacity: 20089 },
    club_bra_1_06: { name: "Neo Química Arena", capacity: 47252 },
    club_bra_1_07: { name: "Couto Pereira", capacity: 40502 },
    club_bra_1_08: { name: "Mineirão", capacity: 66658 },
    club_bra_1_09: { name: "Maracanã", capacity: 78838 },
    club_bra_1_10: { name: "Maracanã", capacity: 78838 },
    club_bra_1_11: { name: "Arena do Grêmio", capacity: 60540 },
    club_bra_1_12: { name: "Beira-Rio", capacity: 49055 },
    club_bra_1_13: { name: "Campos Maia", capacity: 14534 },
    club_bra_1_14: { name: "Nubank Parque", capacity: 43713 },
    club_bra_1_15: { name: "Cícero de Souza Marques", capacity: 12000 },
    // The 2026 table entered both Baenão (13,792) and Mangueirão (53,645) for Remo. The single-
    // ground schema takes Baenão, the club's own home; Mangueirão is the larger venue Remo uses
    // for high-draw Série A matches.
    club_bra_1_16: { name: "Baenão", capacity: 13792 },
    club_bra_1_17: { name: "Vila Belmiro", capacity: 16068 },
    club_bra_1_18: { name: "MorumBIS", capacity: 66671 },
    club_bra_1_19: { name: "São Januário", capacity: 24584 },
    club_bra_1_20: { name: "Barradão", capacity: 30793 },
  },
  homeCities: {
    club_bra_1_01: { name: "Curitiba", populationBand: "mid" },
    club_bra_1_02: { name: "Belo Horizonte", populationBand: "large" },
    club_bra_1_03: { name: "Salvador", populationBand: "large" },
    club_bra_1_04: { name: "Rio de Janeiro", populationBand: "major" },
    club_bra_1_05: { name: "Chapeco", populationBand: "small" },
    club_bra_1_06: { name: "Sao Paulo", populationBand: "major" },
    club_bra_1_07: { name: "Curitiba", populationBand: "mid" },
    club_bra_1_08: { name: "Belo Horizonte", populationBand: "large" },
    club_bra_1_09: { name: "Rio de Janeiro", populationBand: "major" },
    club_bra_1_10: { name: "Rio de Janeiro", populationBand: "major" },
    club_bra_1_11: { name: "Porto Alegre", populationBand: "large" },
    club_bra_1_12: { name: "Porto Alegre", populationBand: "large" },
    club_bra_1_13: { name: "Mirassol", populationBand: "small" },
    club_bra_1_14: { name: "Sao Paulo", populationBand: "major" },
    club_bra_1_15: { name: "Braganca Paulista", populationBand: "small" },
    club_bra_1_16: { name: "Belem", populationBand: "large" },
    club_bra_1_17: { name: "Santos", populationBand: "mid" },
    club_bra_1_18: { name: "Sao Paulo", populationBand: "major" },
    club_bra_1_19: { name: "Rio de Janeiro", populationBand: "major" },
    club_bra_1_20: { name: "Salvador", populationBand: "large" },
  },
};