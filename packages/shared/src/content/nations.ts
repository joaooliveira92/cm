/**
 * The real-world geographic foundation, and the football profile each Nation is generated against.
 *
 * Two kinds of data live here and they are not the same kind of claim:
 *
 * **Factual and stable** — country names, ISO 3166-1 alpha-3 codes, continents, confederation
 * membership, languages, currency codes. These are recorded because they are true and rarely
 * change; with the city catalogue in `cities.ts` they are the real-world data the simulation core
 * depends on.
 *
 * **Gameplay priors** — every 0-1 weight in a `NationProfile`, and every value in
 * `MIGRATION_LINKS`. These are *not* measurements and must never be presented as facts about a
 * country or its people. They are tuning knobs chosen to make a generated world feel plausible,
 * documented so they can be argued with and recalibrated against generated output.
 *
 * Two rules govern how the priors are consumed, and they are the reason this file can exist
 * without encoding stereotypes:
 *
 * 1. **A prior shifts a distribution; it never sets a value.** Nothing reads `youthProduction` and
 *    decides a player's quality from it.
 * 2. **Individual variance must exceed the national modifier.** Two players from the same country
 *    differ from each other far more than their countries' profiles differ. A generator that
 *    inverts that ratio is producing caricatures, and is wrong.
 *
 * Club and competition *display names* are deliberately not here — they are replaceable content,
 * see `contentPack.ts`.
 */

export const CONTINENTS = ["EUROPE", "SOUTH_AMERICA"] as const;
export type Continent = (typeof CONTINENTS)[number];

/** FIFA organises its member associations through six continental confederations; this database
 *  ships content for two of them. */
export const CONFEDERATIONS = ["UEFA", "CONMEBOL"] as const;
export type ConfederationId = (typeof CONFEDERATIONS)[number];

export interface Confederation {
  readonly id: ConfederationId;
  readonly name: string;
  readonly continent: Continent;
}

export const CONFEDERATION_BY_ID: Readonly<Record<ConfederationId, Confederation>> = {
  UEFA: { id: "UEFA", name: "Union of European Football Associations", continent: "EUROPE" },
  CONMEBOL: {
    id: "CONMEBOL",
    name: "South American Football Confederation",
    continent: "SOUTH_AMERICA",
  },
};

/** ISO 3166-1 alpha-3. The canonical, stable identifier for a Nation everywhere in the codebase. */
export type NationCode = (typeof NATION_CODES)[number];

export const NATION_CODES = ["ENG", "ESP", "PRT", "FRA", "DEU", "BRA", "AND", "ITA"] as const;

/** The canonical nation id in the one underscore convention the whole catalogue uses (`nation_eng`). */
export const canonicalNationId = (code: NationCode): string => `nation_${code.toLowerCase()}`;

/**
 * The reverse leg, for a caller holding a persisted `nations.id` that needs the profile behind it.
 *
 * Returns `null` for an id no member of `NATION_CODES` mints — a competition owned by a
 * confederation branch rather than a territory has no nation, and inventing one here would be a
 * worse answer than saying so.
 */
export const nationCodeFromId = (nationId: string): NationCode | null =>
  NATION_CODES.find((code) => canonicalNationId(code) === nationId) ?? null;

/**
 * A Nation's tactical leaning. Weights, not rules: they nudge the distribution an archetype is
 * drawn from, and are dominated by the individual player's own draw.
 */
export interface TacticalPreferences {
  readonly technical: number;
  readonly physical: number;
  readonly directness: number;
  readonly pressing: number;
}

/**
 * A Nation's data-driven football profile. Every field is a 0-1 gameplay prior.
 *
 * This is data rather than code on purpose: country behaviour that lives in `if (nation === ...)`
 * branches cannot be recalibrated, reviewed as a set, or replaced by a content pack.
 */
export interface NationProfile {
  readonly code: NationCode;
  readonly displayName: string;
  readonly continent: Continent;
  readonly confederationId: ConfederationId;
  readonly primaryLanguages: readonly string[];
  readonly currencyCode: string;
  /** How central football is to the Nation — drives the size of its generated player population. */
  readonly footballImportance: number;
  /** Drives club finances and wage scales. */
  readonly economicPower: number;
  readonly youthProduction: number;
  readonly coachingQuality: number;
  readonly infrastructureQuality: number;
  /** How well the Nation keeps its own players rather than exporting them. */
  readonly domesticRetention: number;
  readonly exportTendency: number;
  readonly naturalizationRate: number;
  readonly dualNationalityRate: number;
  readonly tacticalPreferences: TacticalPreferences;
}

/**
 * The shipped profiles.
 *
 * The prose behind each is in `docs/research/real-data-spec.md` §4 as "recommended initial
 * identities". They are starting points for calibration, not conclusions: the spec's own
 * instruction is to tune them against generated output rather than to treat them as final.
 */
export const NATION_PROFILES: Readonly<Record<NationCode, NationProfile>> = {
  ENG: {
    code: "ENG",
    displayName: "England",
    continent: "EUROPE",
    confederationId: "UEFA",
    primaryLanguages: ["en-GB"],
    currencyCode: "GBP",
    footballImportance: 0.95,
    economicPower: 0.95,
    youthProduction: 0.72,
    coachingQuality: 0.8,
    infrastructureQuality: 0.92,
    domesticRetention: 0.86,
    exportTendency: 0.24,
    naturalizationRate: 0.04,
    dualNationalityRate: 0.14,
    tacticalPreferences: { technical: 0.7, physical: 0.86, directness: 0.62, pressing: 0.74 },
  },
  ESP: {
    code: "ESP",
    displayName: "Spain",
    continent: "EUROPE",
    confederationId: "UEFA",
    primaryLanguages: ["es-ES"],
    currencyCode: "EUR",
    footballImportance: 0.93,
    economicPower: 0.76,
    youthProduction: 0.85,
    coachingQuality: 0.88,
    infrastructureQuality: 0.82,
    domesticRetention: 0.74,
    exportTendency: 0.4,
    naturalizationRate: 0.06,
    dualNationalityRate: 0.16,
    tacticalPreferences: { technical: 0.9, physical: 0.6, directness: 0.32, pressing: 0.7 },
  },
  PRT: {
    code: "PRT",
    displayName: "Portugal",
    continent: "EUROPE",
    confederationId: "UEFA",
    primaryLanguages: ["pt-PT"],
    currencyCode: "EUR",
    footballImportance: 0.9,
    economicPower: 0.5,
    youthProduction: 0.86,
    coachingQuality: 0.84,
    infrastructureQuality: 0.68,
    domesticRetention: 0.42,
    exportTendency: 0.84,
    naturalizationRate: 0.08,
    dualNationalityRate: 0.2,
    tacticalPreferences: { technical: 0.86, physical: 0.6, directness: 0.4, pressing: 0.66 },
  },
  FRA: {
    code: "FRA",
    displayName: "France",
    continent: "EUROPE",
    confederationId: "UEFA",
    primaryLanguages: ["fr-FR"],
    currencyCode: "EUR",
    footballImportance: 0.88,
    economicPower: 0.78,
    youthProduction: 0.92,
    coachingQuality: 0.82,
    infrastructureQuality: 0.8,
    domesticRetention: 0.52,
    exportTendency: 0.8,
    naturalizationRate: 0.06,
    dualNationalityRate: 0.22,
    tacticalPreferences: { technical: 0.78, physical: 0.84, directness: 0.5, pressing: 0.7 },
  },
  DEU: {
    code: "DEU",
    displayName: "Germany",
    continent: "EUROPE",
    confederationId: "UEFA",
    primaryLanguages: ["de-DE"],
    currencyCode: "EUR",
    footballImportance: 0.92,
    economicPower: 0.86,
    youthProduction: 0.84,
    coachingQuality: 0.92,
    infrastructureQuality: 0.9,
    domesticRetention: 0.8,
    exportTendency: 0.34,
    naturalizationRate: 0.05,
    dualNationalityRate: 0.18,
    tacticalPreferences: { technical: 0.76, physical: 0.82, directness: 0.5, pressing: 0.86 },
  },
  BRA: {
    code: "BRA",
    displayName: "Brazil",
    continent: "SOUTH_AMERICA",
    confederationId: "CONMEBOL",
    primaryLanguages: ["pt-BR"],
    currencyCode: "BRL",
    footballImportance: 0.98,
    economicPower: 0.64,
    youthProduction: 0.94,
    coachingQuality: 0.76,
    infrastructureQuality: 0.7,
    domesticRetention: 0.54,
    exportTendency: 0.88,
    naturalizationRate: 0.05,
    dualNationalityRate: 0.1,
    tacticalPreferences: { technical: 0.84, physical: 0.66, directness: 0.48, pressing: 0.65 },
  },
  AND: {
    code: "AND",
    displayName: "Andorra",
    continent: "EUROPE",
    confederationId: "UEFA",
    primaryLanguages: ["ca-AD"],
    currencyCode: "EUR",
    footballImportance: 0.3,
    economicPower: 0.4,
    youthProduction: 0.2,
    coachingQuality: 0.3,
    infrastructureQuality: 0.3,
    domesticRetention: 0.5,
    exportTendency: 0.3,
    naturalizationRate: 0.2,
    dualNationalityRate: 0.35,
    tacticalPreferences: { technical: 0.5, physical: 0.5, directness: 0.55, pressing: 0.45 },
  },
  ITA: {
    code: "ITA",
    displayName: "Italy",
    continent: "EUROPE",
    confederationId: "UEFA",
    primaryLanguages: ["it-IT"],
    currencyCode: "EUR",
    footballImportance: 0.92,
    economicPower: 0.74,
    youthProduction: 0.7,
    coachingQuality: 0.88,
    infrastructureQuality: 0.7,
    domesticRetention: 0.76,
    exportTendency: 0.36,
    naturalizationRate: 0.07,
    dualNationalityRate: 0.18,
    tacticalPreferences: { technical: 0.8, physical: 0.7, directness: 0.42, pressing: 0.6 },
  },
};

/**
 * Recruitment weights: how likely a club in the outer Nation is to look to the inner Nation when
 * signing a foreign player.
 *
 * These are **recruitment probabilities for a generated world**, not population statistics and not
 * claims about migration. They exist so that a generated squad's foreign contingent looks like it
 * came from somewhere rather than from a uniform draw over every Nation in the database.
 *
 * Nationality and dual nationality are modelled as individual probabilities against these weights;
 * nothing here assigns an origin to a player deterministically.
 */
export const MIGRATION_LINKS: Readonly<
  Partial<Record<NationCode, Readonly<Partial<Record<NationCode, number>>>>>
> = {
  PRT: { BRA: 0.3, FRA: 0.08, ESP: 0.07 },
  ESP: { BRA: 0.1, PRT: 0.04, FRA: 0.06 },
  ENG: { FRA: 0.12, ESP: 0.08, PRT: 0.07, BRA: 0.06 },
  FRA: { PRT: 0.05, BRA: 0.04 },
  DEU: { FRA: 0.05, ESP: 0.03, PRT: 0.03, BRA: 0.03 },
};

export const nationProfile = (code: NationCode): NationProfile => NATION_PROFILES[code];

/**
 * The display name of a persisted `nations.id`, or the id itself if it names no known nation.
 *
 * A country name is factual, licence-free geography — the same class of claim as a city name — so
 * it is read straight from code rather than resolved through the content pack, which exists only
 * for club and competition identities.
 */
export const nationName = (nationId: string): string => {
  const code = nationCodeFromId(nationId);
  return code === null ? nationId : NATION_PROFILES[code].displayName;
};

/** The recruitment weight from `from` toward `to`, or 0 when the pair has no modelled link. */
export const migrationLink = (from: NationCode, to: NationCode): number =>
  MIGRATION_LINKS[from]?.[to] ?? 0;
