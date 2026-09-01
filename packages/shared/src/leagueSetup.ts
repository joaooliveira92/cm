/**
 * The validated setup index a new career's scope is chosen from (Screen 3, §3 and §8.4).
 *
 * This is the *catalogue*, not a selection: the regions, Nations, and Competitions a database
 * offers, the League Scope Options each Nation supports, and the dependency edges between
 * Competitions. It is pure data with no IO — the desktop main process reads it, sanitizes its
 * labels, and hands the renderer a read model.
 *
 * Nations are real — real names, ISO 3166-1 alpha-3 codes, real confederation membership — because
 * geography is stable, factual, and what a player recognises. Competition names are structural
 * descriptions rather than real competition brands, and no club is named here at all: those are
 * licensed identities that live in a replaceable content pack (`contentPack.ts`), so the default
 * build carries no licensing question.
 */

import type { ConfederationId, NationCode } from "./nations.js";

/** §9. How much of a Competition the simulation carries. Ordered least- to most-detailed use is
 *  `not_loaded` < `view_only` < `background` < `playable`; `MODE_RANK` is that order as a number. */
export const SIMULATION_MODES = ["playable", "background", "view_only", "not_loaded"] as const;

export type SimulationMode = (typeof SIMULATION_MODES)[number];

/** Mode precedence when two selections reach the same Competition — the most detailed wins, so a
 *  Competition pulled in as a background dependency is upgraded, never downgraded, by a playable
 *  selection elsewhere. */
export const MODE_RANK: Readonly<Record<SimulationMode, number>> = {
  not_loaded: 0,
  view_only: 1,
  background: 2,
  playable: 3,
};

export const strongerMode = (a: SimulationMode, b: SimulationMode): SimulationMode =>
  MODE_RANK[a] >= MODE_RANK[b] ? a : b;

/** §7.1. The state a Nation row renders. Derived, never stored. */
export const NATION_SELECTION_STATES = [
  "not_selected",
  "selected_playable",
  "selected_background",
  "selected_view_only",
  "included_by_dependency",
  "partially_selected",
  "unavailable",
] as const;

export type NationSelectionState = (typeof NATION_SELECTION_STATES)[number];

export type CompetitionKind = "league" | "cup" | "reserve" | "continental";

/**
 * One Competition in the catalogue.
 *
 * `requires` is the §3.7 dependency edge — the Competitions this one cannot operate without —
 * and points *upward* (a second division requires its first division; a top division requires
 * its national cup; a continental tournament requires the top divisions that qualify into it).
 * `clubCount` is 0 for a Competition that draws its entrants from other loaded Competitions
 * rather than owning clubs, which is why a cup costs match load but no squads.
 */
export interface CompetitionNode {
  readonly id: string;
  readonly nationId: string;
  readonly name: string;
  readonly kind: CompetitionKind;
  /** Pyramid tier, 1 = highest. `null` for cups, reserve, and continental competitions, which do
   *  not sit on the ladder — §8.3's reason the UI must not derive structure from tier numbers. */
  readonly tier: number | null;
  readonly requires: readonly string[];
  readonly clubCount: number;
  readonly annualMatches: number;
  /** False when the database cannot support managing a club here (§7.3), so the UI must never
   *  offer Playable for it. */
  readonly playableSupported: boolean;
  /** False when this Competition's cost figures are extrapolated rather than measured — the
   *  input to the estimate's §11.1 `confidence` field. */
  readonly estimatesVerified: boolean;
}

/**
 * §8.4. A supported scope for one Nation. The user picks one of these rather than assembling a
 * Competition graph by hand, which is what keeps noncontiguous pyramids (§8.3) expressible
 * without letting the UI invent an invalid combination.
 */
export interface LeagueScopeOption {
  readonly id: string;
  readonly nationId: string;
  readonly displayName: string;
  readonly playableCompetitionIds: readonly string[];
  readonly backgroundCompetitionIds: readonly string[];
}

export interface NationNode {
  readonly id: string;
  /** ISO 3166-1 alpha-3, the key into `NATION_PROFILES`. The confederation branches carry the code
   *  of a member Nation, since they are tournament containers rather than territories. */
  readonly code: NationCode;
  readonly confederationId: ConfederationId;
  readonly regionId: string;
  readonly name: string;
  /** §10.1. Localized or historical alternatives search also matches. */
  readonly alternativeNames: readonly string[];
  /** False when the database ships the Nation's metadata but not its content (§7.1
   *  `unavailable`): it renders, explains itself, and cannot be selected. */
  readonly available: boolean;
  /** False for a Nation with no playable league (§7.3) — visible, background-capable, never
   *  offered a Playable mode. */
  readonly playableSupported: boolean;
  readonly scopeOptions: readonly LeagueScopeOption[];
  readonly competitions: readonly CompetitionNode[];
  /** The database's own recommendation (§6.1), used by the Recommended preset. `null` when the
   *  database recommends nothing for this Nation. */
  readonly recommendedScopeOptionId: string | null;
}

export interface RegionNode {
  readonly id: string;
  readonly name: string;
}

/**
 * The whole catalogue. `fingerprint` identifies the database *content*, and every persisted
 * preset and setup draft carries it: §29 and §6.3 both refuse to restore a configuration whose
 * fingerprint no longer matches, rather than guessing at renamed Competitions.
 */
export interface LeagueSetupIndex {
  readonly fingerprint: string;
  readonly databaseName: string;
  readonly databaseVersion: string;
  readonly regions: readonly RegionNode[];
  readonly nations: readonly NationNode[];
}

const league = (
  nationId: string,
  id: string,
  name: string,
  tier: number,
  requires: readonly string[],
  clubCount: number,
  options: { readonly playableSupported?: boolean; readonly estimatesVerified?: boolean } = {},
): CompetitionNode => ({
  id,
  nationId,
  name,
  kind: "league",
  tier,
  requires,
  clubCount,
  // A double round-robin: every club plays every other home and away.
  annualMatches: clubCount * (clubCount - 1),
  playableSupported: options.playableSupported ?? true,
  estimatesVerified: options.estimatesVerified ?? true,
});

const cup = (
  nationId: string,
  id: string,
  name: string,
  annualMatches: number,
): CompetitionNode => ({
  id,
  nationId,
  name,
  kind: "cup",
  tier: null,
  requires: [],
  clubCount: 0,
  annualMatches,
  playableSupported: false,
  estimatesVerified: true,
});

/**
 * The shipped catalogue: real Nations, fictional identities.
 *
 * Geography is factual — country names, ISO 3166-1 alpha-3 codes, continents, and confederation
 * membership are real, and are what a player recognises when choosing where to manage. Everything
 * *named* below a Nation is not: competition names here are structural descriptions ("English
 * First Division"), never real competition brands, because competition and club names are licensed
 * commercial assets that must stay replaceable through a content pack. See `contentPack.ts` for
 * that boundary and `nations.ts` for the profiles these Nations generate against.
 *
 * Club counts and tier depths are shaped after real pyramids, but they are configuration rather
 * than a claim about any particular season — competition structures change, and §9 of the spec
 * treats them as updateable source data.
 *
 * The catalogue deliberately keeps every structural shape §8.3 says the model must survive, now
 * carried by Nations for which each shape is natural rather than invented:
 *
 * - a four-tier pyramid with a reserve league and a cup its top division depends on (England);
 * - parallel regional divisions at one tier, which a tier *number* cannot express (Spain, Brazil);
 * - a Nation with no playable league, visible and explained rather than hidden (Andorra);
 * - a Nation present in metadata but with no content shipped (Italy) — exactly how a real database
 *   ships partial coverage;
 * - cross-border tournaments whose dependencies span several Nations (the confederation branches).
 */
export const LEAGUE_SETUP_INDEX: LeagueSetupIndex = {
  // The fingerprint identifies the database *content*. Moving from the fictional world to real
  // geography renamed every Nation and Competition, so persisted presets and setup drafts from the
  // old catalogue must be refused rather than half-restored against ids that no longer mean the
  // same thing (§29, §6.3).
  fingerprint: "real-geography@1.0.0",
  databaseName: "World Football",
  databaseVersion: "1.0.0",
  regions: [
    { id: "region-western-europe", name: "Western Europe" },
    { id: "region-southern-europe", name: "Southern Europe" },
    { id: "region-south-america", name: "South America" },
    { id: "region-continental", name: "Continental" },
  ],
  nations: [
    {
      id: "nation-eng",
      code: "ENG",
      confederationId: "UEFA",
      regionId: "region-western-europe",
      name: "England",
      alternativeNames: ["English Football"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope-eng-two",
      competitions: [
        // The top division requires its national cup: the two share entrants and a calendar,
        // so loading one without the other leaves the season with holes (§3.7).
        league("nation-eng", "comp-eng-1", "English First Division", 1, ["comp-eng-cup"], 20),
        league("nation-eng", "comp-eng-2", "English Second Division", 2, ["comp-eng-1"], 24),
        league("nation-eng", "comp-eng-3", "English Third Division", 3, ["comp-eng-2"], 24),
        league("nation-eng", "comp-eng-4", "English Fourth Division", 4, ["comp-eng-3"], 24),
        cup("nation-eng", "comp-eng-cup", "English National Cup", 126),
        {
          id: "comp-eng-reserve",
          nationId: "nation-eng",
          name: "English Reserve League",
          kind: "reserve",
          tier: null,
          requires: ["comp-eng-1"],
          clubCount: 20,
          annualMatches: 380,
          playableSupported: false,
          estimatesVerified: true,
        },
      ],
      scopeOptions: [
        {
          id: "scope-eng-top",
          nationId: "nation-eng",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-eng-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-eng-two",
          nationId: "nation-eng",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp-eng-1", "comp-eng-2"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-eng-pyramid",
          nationId: "nation-eng",
          displayName: "National pyramid",
          playableCompetitionIds: ["comp-eng-1", "comp-eng-2", "comp-eng-3", "comp-eng-4"],
          backgroundCompetitionIds: ["comp-eng-reserve"],
        },
      ],
    },
    {
      id: "nation-esp",
      code: "ESP",
      confederationId: "UEFA",
      regionId: "region-southern-europe",
      name: "Spain",
      alternativeNames: ["España", "Espana"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope-esp-top",
      competitions: [
        league("nation-esp", "comp-esp-1", "Spanish First Division", 1, ["comp-esp-cup"], 20),
        // Parallel regional second tier: two Competitions at the same depth, both feeding the
        // same division above. A depth *number* cannot express this, which is why the scope
        // option is the unit of selection (§8.3).
        league("nation-esp", "comp-esp-2n", "Spanish Second Division – Northern Group", 2, ["comp-esp-1"], 20),
        league("nation-esp", "comp-esp-2s", "Spanish Second Division – Southern Group", 2, ["comp-esp-1"], 20),
        cup("nation-esp", "comp-esp-cup", "Spanish National Cup", 118),
      ],
      scopeOptions: [
        {
          id: "scope-esp-top",
          nationId: "nation-esp",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-esp-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-esp-regional",
          nationId: "nation-esp",
          displayName: "National and regional pyramid",
          playableCompetitionIds: ["comp-esp-1", "comp-esp-2n", "comp-esp-2s"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-deu",
      code: "DEU",
      confederationId: "UEFA",
      regionId: "region-western-europe",
      name: "Germany",
      alternativeNames: ["Deutschland"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope-deu-top",
      competitions: [
        league("nation-deu", "comp-deu-1", "German First Division", 1, ["comp-deu-cup"], 18),
        league("nation-deu", "comp-deu-2", "German Second Division", 2, ["comp-deu-1"], 18),
        league("nation-deu", "comp-deu-3", "German Third Division", 3, ["comp-deu-2"], 20),
        cup("nation-deu", "comp-deu-cup", "German National Cup", 96),
      ],
      scopeOptions: [
        {
          id: "scope-deu-top",
          nationId: "nation-deu",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-deu-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-deu-pyramid",
          nationId: "nation-deu",
          displayName: "National pyramid",
          playableCompetitionIds: ["comp-deu-1", "comp-deu-2", "comp-deu-3"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-fra",
      code: "FRA",
      confederationId: "UEFA",
      regionId: "region-western-europe",
      name: "France",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-fra", "comp-fra-1", "French First Division", 1, ["comp-fra-cup"], 20),
        league("nation-fra", "comp-fra-2", "French Second Division", 2, ["comp-fra-1"], 20),
        cup("nation-fra", "comp-fra-cup", "French National Cup", 110),
      ],
      scopeOptions: [
        {
          id: "scope-fra-top",
          nationId: "nation-fra",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-fra-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-fra-two",
          nationId: "nation-fra",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp-fra-1", "comp-fra-2"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-prt",
      code: "PRT",
      confederationId: "UEFA",
      regionId: "region-southern-europe",
      name: "Portugal",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        // Portugal's cost figures are extrapolated rather than measured, so any scope that
        // selects it reports reduced confidence (§11.1).
        league("nation-prt", "comp-prt-1", "Portuguese First Division", 1, [], 18, {
          estimatesVerified: false,
        }),
        league("nation-prt", "comp-prt-2", "Portuguese Second Division", 2, ["comp-prt-1"], 18, {
          estimatesVerified: false,
        }),
      ],
      scopeOptions: [
        {
          id: "scope-prt-top",
          nationId: "nation-prt",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-prt-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-prt-two",
          nationId: "nation-prt",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp-prt-1", "comp-prt-2"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-bra",
      code: "BRA",
      confederationId: "CONMEBOL",
      regionId: "region-south-america",
      name: "Brazil",
      alternativeNames: ["Brasil", "República Federativa do Brasil"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope-bra-top",
      competitions: [
        league("nation-bra", "comp-bra-1", "Brazilian First Division", 1, ["comp-bra-cup"], 20),
        league("nation-bra", "comp-bra-2", "Brazilian Second Division", 2, ["comp-bra-1"], 20),
        // A second parallel-regional shape, and a different one from Spain's: these sit beside the
        // national pyramid on their own calendar rather than feeding a division above.
        league("nation-bra", "comp-bra-state-se", "Brazilian State Championship – South East", 1, [], 16, {
          estimatesVerified: false,
        }),
        league("nation-bra", "comp-bra-state-ne", "Brazilian State Championship – North East", 1, [], 16, {
          estimatesVerified: false,
        }),
        cup("nation-bra", "comp-bra-cup", "Brazilian National Cup", 122),
      ],
      scopeOptions: [
        {
          id: "scope-bra-top",
          nationId: "nation-bra",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-bra-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-bra-two",
          nationId: "nation-bra",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp-bra-1", "comp-bra-2"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-bra-with-state",
          nationId: "nation-bra",
          displayName: "National pyramid and state championships",
          playableCompetitionIds: ["comp-bra-1", "comp-bra-2"],
          backgroundCompetitionIds: ["comp-bra-state-se", "comp-bra-state-ne"],
        },
      ],
    },
    {
      // §7.3. A real association whose domestic league this database carries as background data
      // only. The row stays visible and reads "Background data only"; no scope option offers
      // Playable.
      id: "nation-and",
      code: "AND",
      confederationId: "UEFA",
      regionId: "region-southern-europe",
      name: "Andorra",
      alternativeNames: ["Principat d'Andorra"],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-and", "comp-and-1", "Andorran First Division", 1, [], 10, {
          playableSupported: false,
          estimatesVerified: false,
        }),
      ],
      scopeOptions: [],
    },
    {
      // §7.1 `unavailable`. Present in metadata, absent from content — the ordinary case of a
      // database that ships partial coverage. Selecting it is refused rather than silently ignored.
      id: "nation-ita",
      code: "ITA",
      confederationId: "UEFA",
      regionId: "region-southern-europe",
      name: "Italy",
      alternativeNames: ["Italia"],
      available: false,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [],
      scopeOptions: [],
    },
    {
      // Confederation tournaments are modelled as Nation-shaped branches so the browser stays one
      // uniform tree. Neither is playable on its own; they exist to be pulled in as dependencies,
      // or selected as background alongside the Nations that qualify into them.
      id: "nation-uefa",
      code: "ENG",
      confederationId: "UEFA",
      regionId: "region-continental",
      name: "European Competitions",
      alternativeNames: ["UEFA"],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        {
          id: "comp-uefa-champions",
          nationId: "nation-uefa",
          name: "European Champions Tournament",
          kind: "continental",
          tier: null,
          requires: ["comp-eng-1", "comp-esp-1", "comp-deu-1"],
          clubCount: 0,
          annualMatches: 125,
          playableSupported: false,
          estimatesVerified: true,
        },
      ],
      scopeOptions: [],
    },
    {
      id: "nation-conmebol",
      code: "BRA",
      confederationId: "CONMEBOL",
      regionId: "region-continental",
      name: "South American Competitions",
      alternativeNames: ["CONMEBOL"],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        {
          id: "comp-conmebol-champions",
          nationId: "nation-conmebol",
          name: "South American Champions Tournament",
          kind: "continental",
          tier: null,
          requires: ["comp-bra-1"],
          clubCount: 0,
          annualMatches: 138,
          playableSupported: false,
          estimatesVerified: true,
        },
      ],
      scopeOptions: [],
    },
  ],
};

/** Every Competition in the index, flattened. Built once per index, not per lookup. */
export const allCompetitions = (index: LeagueSetupIndex): readonly CompetitionNode[] =>
  index.nations.flatMap((nation) => nation.competitions);

export const competitionIndex = (
  index: LeagueSetupIndex,
): ReadonlyMap<string, CompetitionNode> =>
  new Map(allCompetitions(index).map((competition) => [competition.id, competition]));

export const nationIndex = (index: LeagueSetupIndex): ReadonlyMap<string, NationNode> =>
  new Map(index.nations.map((nation) => [nation.id, nation]));

export const scopeOptionIndex = (
  index: LeagueSetupIndex,
): ReadonlyMap<string, LeagueScopeOption> =>
  new Map(
    index.nations.flatMap((nation) =>
      nation.scopeOptions.map((option) => [option.id, option] as const),
    ),
  );
