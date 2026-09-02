import { NATION_CODES, canonicalNationId, type NationCode } from "./nations.js";

/**
 * The curated real-geography city catalogue, the factual half of the world catalogue (`nations.ts`
 * is the other half).
 *
 * Two rules govern this module, both consequences of what a City is (`CONTEXT.md`):
 *
 * 1. **City names are plain data, never content-pack data.** A City is real, factual, licence-free
 *    geography — the same kind of claim a country name is — so its name is carried directly and the
 *    content pack never sees it. No code path resolves a city name through `contentPack.ts`.
 * 2. **A population band is an ordering, not a figure.** A City carries one of four coarse bands —
 *    `major`, `large`, `mid`, `small` — as a plausibility input to generation. There is no
 *    population figure and there are no coordinates: nothing in the simulation needs either, and a
 *    real population number is a factual claim that goes stale while nothing notices.
 *
 * The catalogue is code; the save records the resolved world. `CITIES_BY_NATION` keys every nation
 * in `NATION_CODES`, so a nation added to the nation list without its geography is a **compile-time
 * error**, and the acceptance test over the flat `CITIES` list catches a nation with an empty
 * curated set as a defect in the shipped data rather than a runtime failure. Growing the per-nation
 * set toward the spec's ~60-per-nation target is content work that needs no schema change.
 */

/** The four population bands, ordered greatest to least. See `CONTEXT.md`'s City. */
export const POPULATION_BANDS = ["major", "large", "mid", "small"] as const;

export type PopulationBand = (typeof POPULATION_BANDS)[number];

/** One curated real settlement. `name` is the plain factual name; the canonical id is minted from
 *  it, never hand-written, so the two cannot drift. */
export interface City {
  readonly nationCode: NationCode;
  readonly name: string;
  readonly populationBand: PopulationBand;
}

/** Lowercases a city name and reduces it to `[a-z0-9_]` so it can suffix a canonical id — the
 *  `location` half of `city_eng_london`. Pure, deterministic, locale-free. */
const citySlug = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/** The canonical city id in the one underscore convention the whole catalogue uses
 *  (`city_eng_london`, via `NationCode` and the name's slug). */
export const canonicalCityId = (nationCode: NationCode, name: string): string =>
  `city_${nationCode.toLowerCase()}_${citySlug(name)}`;

/**
 * The curated set, nation-keyed. Typed as a complete record over `NATION_CODES`, so TypeScript
 * refuses to compile a catalogue that omits a nation.
 *
 * The set is a head start, not the destination: the spec budgets roughly sixty cities per nation so
 * every club in a full pyramid can draw a distinct plausible hometown. These lists carry the shape
 * and at least one city for every nation; growing them is content work.
 */
export const CITIES_BY_NATION: Readonly<Record<NationCode, readonly City[]>> = {
  ENG: [
    { nationCode: "ENG", name: "London", populationBand: "major" },
    { nationCode: "ENG", name: "Manchester", populationBand: "major" },
    { nationCode: "ENG", name: "Birmingham", populationBand: "large" },
    { nationCode: "ENG", name: "Liverpool", populationBand: "large" },
    { nationCode: "ENG", name: "Leeds", populationBand: "large" },
    { nationCode: "ENG", name: "Sheffield", populationBand: "large" },
    { nationCode: "ENG", name: "Nottingham", populationBand: "mid" },
    { nationCode: "ENG", name: "Coventry", populationBand: "mid" },
    { nationCode: "ENG", name: "Reading", populationBand: "mid" },
    { nationCode: "ENG", name: "Luton", populationBand: "small" },
  ],
  ESP: [
    { nationCode: "ESP", name: "Madrid", populationBand: "major" },
    { nationCode: "ESP", name: "Barcelona", populationBand: "major" },
    { nationCode: "ESP", name: "Valencia", populationBand: "large" },
    { nationCode: "ESP", name: "Seville", populationBand: "large" },
    { nationCode: "ESP", name: "Zaragoza", populationBand: "mid" },
    { nationCode: "ESP", name: "Malaga", populationBand: "mid" },
    { nationCode: "ESP", name: "Bilbao", populationBand: "mid" },
    { nationCode: "ESP", name: "Gijon", populationBand: "small" },
  ],
  PRT: [
    { nationCode: "PRT", name: "Lisbon", populationBand: "major" },
    { nationCode: "PRT", name: "Porto", populationBand: "major" },
    { nationCode: "PRT", name: "Braga", populationBand: "large" },
    { nationCode: "PRT", name: "Coimbra", populationBand: "mid" },
    { nationCode: "PRT", name: "Faro", populationBand: "mid" },
    { nationCode: "PRT", name: "Setubal", populationBand: "mid" },
    { nationCode: "PRT", name: "Portimao", populationBand: "small" },
    { nationCode: "PRT", name: "Funchal", populationBand: "small" },
  ],
  FRA: [
    { nationCode: "FRA", name: "Paris", populationBand: "major" },
    { nationCode: "FRA", name: "Marseille", populationBand: "major" },
    { nationCode: "FRA", name: "Lyon", populationBand: "major" },
    { nationCode: "FRA", name: "Toulouse", populationBand: "large" },
    { nationCode: "FRA", name: "Nice", populationBand: "large" },
    { nationCode: "FRA", name: "Nantes", populationBand: "large" },
    { nationCode: "FRA", name: "Strasbourg", populationBand: "large" },
    { nationCode: "FRA", name: "Lens", populationBand: "small" },
  ],
  DEU: [
    { nationCode: "DEU", name: "Berlin", populationBand: "major" },
    { nationCode: "DEU", name: "Hamburg", populationBand: "major" },
    { nationCode: "DEU", name: "Munich", populationBand: "major" },
    { nationCode: "DEU", name: "Cologne", populationBand: "large" },
    { nationCode: "DEU", name: "Dortmund", populationBand: "large" },
    { nationCode: "DEU", name: "Stuttgart", populationBand: "large" },
    { nationCode: "DEU", name: "Leipzig", populationBand: "mid" },
    { nationCode: "DEU", name: "Mainz", populationBand: "small" },
  ],
  BRA: [
    { nationCode: "BRA", name: "Sao Paulo", populationBand: "major" },
    { nationCode: "BRA", name: "Rio de Janeiro", populationBand: "major" },
    { nationCode: "BRA", name: "Belo Horizonte", populationBand: "large" },
    { nationCode: "BRA", name: "Porto Alegre", populationBand: "large" },
    { nationCode: "BRA", name: "Recife", populationBand: "large" },
    { nationCode: "BRA", name: "Salvador", populationBand: "large" },
    { nationCode: "BRA", name: "Curitiba", populationBand: "mid" },
    { nationCode: "BRA", name: "Manaus", populationBand: "mid" },
  ],
  AND: [
    { nationCode: "AND", name: "Andorra la Vella", populationBand: "small" },
    { nationCode: "AND", name: "Escaldes-Engordany", populationBand: "small" },
    { nationCode: "AND", name: "Encamp", populationBand: "small" },
    { nationCode: "AND", name: "Sant Julia de Loria", populationBand: "small" },
  ],
  ITA: [
    { nationCode: "ITA", name: "Rome", populationBand: "major" },
    { nationCode: "ITA", name: "Milan", populationBand: "major" },
    { nationCode: "ITA", name: "Naples", populationBand: "large" },
    { nationCode: "ITA", name: "Turin", populationBand: "large" },
    { nationCode: "ITA", name: "Florence", populationBand: "mid" },
    { nationCode: "ITA", name: "Bologna", populationBand: "mid" },
    { nationCode: "ITA", name: "Genoa", populationBand: "mid" },
    { nationCode: "ITA", name: "Palermo", populationBand: "mid" },
  ],
};

/** Every curated city, flattened in `NATION_CODES` order — the unconditional set every save carries,
 *  whatever the selection scope (spec rule 2: cities sit on the referent side of the catalogue
 *  line, like nations). */
export const CITIES: readonly City[] = NATION_CODES.flatMap((code) => CITIES_BY_NATION[code]);

/** The canonical ids of the whole catalogue, in the same order — what the save's `cities` table
 *  holds, expressed so a test can compare rows to the module without re-deriving the mint. */
export const CITY_IDS: readonly string[] = CITIES.map((city) =>
  canonicalCityId(city.nationCode, city.name),
);

/** The canonical nation ids of the whole catalogue, in `NATION_CODES` order. */
export const NATION_IDS: readonly string[] = NATION_CODES.map(canonicalNationId);