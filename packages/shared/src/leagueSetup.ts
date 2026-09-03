/**
 * The validated setup index a new career's scope is chosen from (Screen 3, §3 and §8.4).
 *
 * This is the *catalogue*, not a selection: the regions, Nations, and Competitions a database
 * offers, the League Scope Options each Nation supports, and the dependency edges between
 * Competitions. It is pure data with no IO — the desktop main process reads it, sanitizes its
 * labels, and hands the renderer a read model.
 *
 * Nations are real — real names, ISO 3166-1 alpha-3 codes, real confederation membership — because
 * geography is stable, factual, and what a player recognises. Nothing below a Nation is named here:
 * a Competition node carries its canonical id and its structure, and its display name is resolved
 * through the content pack (`contentPack.ts`), as a club's is. Ids follow that module's underscore
 * convention — `nation_eng`, `comp_eng_1` — because it is the module that states the rule a
 * canonical id is never a display name, so it is the one the catalogue follows rather than the
 * reverse.
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

/**
 * One pairing of a higher and a lower Competition, and how many clubs swap between them at the
 * end of each Season.
 *
 * Promotion and relegation are **one symmetric fact read in two directions**, not two. A single
 * `slots` count governing both is what guarantees a division never changes size — the invariant a
 * pair of independent counts would silently break. It also expresses what a `promotion_slots`
 * column on the Competition cannot: with parallel regional divisions feeding one division above,
 * no arithmetic on tier identifies the destination, so the link names it.
 *
 * Asymmetric exchange ("three up, four down") is deliberately not expressible.
 */
export interface ExchangeLink {
  readonly higherCompetitionId: string;
  readonly lowerCompetitionId: string;
  readonly slots: number;
}

/**
 * One Competition whose clubs enter another — a national cup's feeder divisions, or the top
 * divisions that qualify into a continental tournament.
 *
 * Its own relation rather than a `kind` discriminator on `ExchangeLink`, because an entry edge has
 * no slot count: merging them would leave `slots` meaningless for half the rows, which is the shape
 * that invites a query to forget the discriminator.
 */
export interface CupEntrant {
  readonly cupCompetitionId: string;
  readonly sourceCompetitionId: string;
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
  tier: number,
  requires: readonly string[],
  clubCount: number,
  options: { readonly playableSupported?: boolean; readonly estimatesVerified?: boolean } = {},
): CompetitionNode => ({
  id,
  nationId,
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
  annualMatches: number,
): CompetitionNode => ({
  id,
  nationId,
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
 * membership are real, and are what a player recognises when choosing where to manage. Nothing
 * below a Nation is named here at all: competition and club names are licensed commercial assets
 * that stay replaceable through a content pack, so this file carries `comp_eng_1` and the pack
 * decides what that reads as. See `contentPack.ts` for that boundary and `nations.ts` for the
 * profiles these Nations generate against.
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
  // The fingerprint identifies the database *content*. Moving competition names out to the content
  // pack and every id to the underscore convention changed every key in here, so persisted presets
  // and setup drafts from the old catalogue must be refused rather than half-restored against ids
  // that no longer mean the same thing (§29, §6.3).
  fingerprint: "real-geography@2.0.0",
  databaseName: "World Football",
  databaseVersion: "1.0.0",
  regions: [
    { id: "region_western_europe", name: "Western Europe" },
    { id: "region_southern_europe", name: "Southern Europe" },
    { id: "region_south_america", name: "South America" },
    { id: "region_continental", name: "Continental" },
  ],
  nations: [
    {
      id: "nation_eng",
      code: "ENG",
      confederationId: "UEFA",
      regionId: "region_western_europe",
      name: "England",
      alternativeNames: ["English Football"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope_eng_two",
      competitions: [
        // The top division requires its national cup: the two share entrants and a calendar,
        // so loading one without the other leaves the season with holes (§3.7).
        league("nation_eng", "comp_eng_1", 1, ["comp_eng_cup"], 20),
        league("nation_eng", "comp_eng_2", 2, ["comp_eng_1"], 24),
        league("nation_eng", "comp_eng_3", 3, ["comp_eng_2"], 24),
        league("nation_eng", "comp_eng_4", 4, ["comp_eng_3"], 24),
        cup("nation_eng", "comp_eng_cup", 126),
        {
          id: "comp_eng_reserve",
          nationId: "nation_eng",
          kind: "reserve",
          tier: null,
          requires: ["comp_eng_1"],
          clubCount: 20,
          annualMatches: 380,
          playableSupported: false,
          estimatesVerified: true,
        },
      ],
      scopeOptions: [
        {
          id: "scope_eng_top",
          nationId: "nation_eng",
          displayName: "Top division only",
          playableCompetitionIds: ["comp_eng_1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_eng_two",
          nationId: "nation_eng",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp_eng_1", "comp_eng_2"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_eng_pyramid",
          nationId: "nation_eng",
          displayName: "National pyramid",
          playableCompetitionIds: ["comp_eng_1", "comp_eng_2", "comp_eng_3", "comp_eng_4"],
          backgroundCompetitionIds: ["comp_eng_reserve"],
        },
      ],
    },
    {
      id: "nation_esp",
      code: "ESP",
      confederationId: "UEFA",
      regionId: "region_southern_europe",
      name: "Spain",
      alternativeNames: ["España", "Espana"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope_esp_top",
      competitions: [
        league("nation_esp", "comp_esp_1", 1, ["comp_esp_cup"], 20),
        // Parallel regional second tier: two Competitions at the same depth, both feeding the
        // same division above. A depth *number* cannot express this, which is why the scope
        // option is the unit of selection (§8.3).
        league("nation_esp", "comp_esp_2n", 2, ["comp_esp_1"], 20),
        league("nation_esp", "comp_esp_2s", 2, ["comp_esp_1"], 20),
        cup("nation_esp", "comp_esp_cup", 118),
      ],
      scopeOptions: [
        {
          id: "scope_esp_top",
          nationId: "nation_esp",
          displayName: "Top division only",
          playableCompetitionIds: ["comp_esp_1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_esp_regional",
          nationId: "nation_esp",
          displayName: "National and regional pyramid",
          playableCompetitionIds: ["comp_esp_1", "comp_esp_2n", "comp_esp_2s"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation_deu",
      code: "DEU",
      confederationId: "UEFA",
      regionId: "region_western_europe",
      name: "Germany",
      alternativeNames: ["Deutschland"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope_deu_top",
      competitions: [
        league("nation_deu", "comp_deu_1", 1, ["comp_deu_cup"], 18),
        league("nation_deu", "comp_deu_2", 2, ["comp_deu_1"], 18),
        league("nation_deu", "comp_deu_3", 3, ["comp_deu_2"], 20),
        cup("nation_deu", "comp_deu_cup", 96),
      ],
      scopeOptions: [
        {
          id: "scope_deu_top",
          nationId: "nation_deu",
          displayName: "Top division only",
          playableCompetitionIds: ["comp_deu_1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_deu_pyramid",
          nationId: "nation_deu",
          displayName: "National pyramid",
          playableCompetitionIds: ["comp_deu_1", "comp_deu_2", "comp_deu_3"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation_fra",
      code: "FRA",
      confederationId: "UEFA",
      regionId: "region_western_europe",
      name: "France",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation_fra", "comp_fra_1", 1, ["comp_fra_cup"], 20),
        league("nation_fra", "comp_fra_2", 2, ["comp_fra_1"], 20),
        cup("nation_fra", "comp_fra_cup", 110),
      ],
      scopeOptions: [
        {
          id: "scope_fra_top",
          nationId: "nation_fra",
          displayName: "Top division only",
          playableCompetitionIds: ["comp_fra_1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_fra_two",
          nationId: "nation_fra",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp_fra_1", "comp_fra_2"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation_prt",
      code: "PRT",
      confederationId: "UEFA",
      regionId: "region_southern_europe",
      name: "Portugal",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        // Portugal's cost figures are extrapolated rather than measured, so any scope that
        // selects it reports reduced confidence (§11.1).
        league("nation_prt", "comp_prt_1", 1, [], 18, {
          estimatesVerified: false,
        }),
        league("nation_prt", "comp_prt_2", 2, ["comp_prt_1"], 18, {
          estimatesVerified: false,
        }),
      ],
      scopeOptions: [
        {
          id: "scope_prt_top",
          nationId: "nation_prt",
          displayName: "Top division only",
          playableCompetitionIds: ["comp_prt_1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_prt_two",
          nationId: "nation_prt",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp_prt_1", "comp_prt_2"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation_bra",
      code: "BRA",
      confederationId: "CONMEBOL",
      regionId: "region_south_america",
      name: "Brazil",
      alternativeNames: ["Brasil", "República Federativa do Brasil"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope_bra_top",
      competitions: [
        league("nation_bra", "comp_bra_1", 1, ["comp_bra_cup"], 20),
        league("nation_bra", "comp_bra_2", 2, ["comp_bra_1"], 20),
        // A second parallel-regional shape, and a different one from Spain's: these sit beside the
        // national pyramid on their own calendar rather than feeding a division above.
        league("nation_bra", "comp_bra_state_se", 1, [], 16, {
          estimatesVerified: false,
        }),
        league("nation_bra", "comp_bra_state_ne", 1, [], 16, {
          estimatesVerified: false,
        }),
        cup("nation_bra", "comp_bra_cup", 122),
      ],
      scopeOptions: [
        {
          id: "scope_bra_top",
          nationId: "nation_bra",
          displayName: "Top division only",
          playableCompetitionIds: ["comp_bra_1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_bra_two",
          nationId: "nation_bra",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp_bra_1", "comp_bra_2"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope_bra_with_state",
          nationId: "nation_bra",
          displayName: "National pyramid and state championships",
          playableCompetitionIds: ["comp_bra_1", "comp_bra_2"],
          backgroundCompetitionIds: ["comp_bra_state_se", "comp_bra_state_ne"],
        },
      ],
    },
    {
      // §7.3. A real association whose domestic league this database carries as background data
      // only. The row stays visible and reads "Background data only"; no scope option offers
      // Playable.
      id: "nation_and",
      code: "AND",
      confederationId: "UEFA",
      regionId: "region_southern_europe",
      name: "Andorra",
      alternativeNames: ["Principat d'Andorra"],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation_and", "comp_and_1", 1, [], 10, {
          playableSupported: false,
          estimatesVerified: false,
        }),
      ],
      scopeOptions: [],
    },
    {
      // §7.1 `unavailable`. Present in metadata, absent from content — the ordinary case of a
      // database that ships partial coverage. Selecting it is refused rather than silently ignored.
      id: "nation_ita",
      code: "ITA",
      confederationId: "UEFA",
      regionId: "region_southern_europe",
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
      id: "nation_uefa",
      code: "ENG",
      confederationId: "UEFA",
      regionId: "region_continental",
      name: "European Competitions",
      alternativeNames: ["UEFA"],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        {
          id: "comp_uefa_champions",
          nationId: "nation_uefa",
          kind: "continental",
          tier: null,
          requires: ["comp_eng_1", "comp_esp_1", "comp_deu_1"],
          clubCount: 0,
          annualMatches: 125,
          playableSupported: false,
          estimatesVerified: true,
        },
      ],
      scopeOptions: [],
    },
    {
      id: "nation_conmebol",
      code: "BRA",
      confederationId: "CONMEBOL",
      regionId: "region_continental",
      name: "South American Competitions",
      alternativeNames: ["CONMEBOL"],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        {
          id: "comp_conmebol_champions",
          nationId: "nation_conmebol",
          kind: "continental",
          tier: null,
          requires: ["comp_bra_1"],
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


/**
 * The Pyramids: which division sits above which, and how many clubs exchange between them.
 *
 * Structure lives here rather than on the `CompetitionNode` for one reason — nothing that browses
 * the catalogue reads it. The setup screens render Nations, Competitions, and scope options; this
 * is what *generation* reads to write a save's competition graph, and keeping it beside the
 * catalogue rather than inside its row types leaves the read model the renderer receives unchanged.
 * `competition-graph.test.ts` is what keeps the two from drifting: every endpoint below must name a
 * Competition this index carries, and every league below the top of its Pyramid must have a link
 * upward.
 *
 * Note what is *absent*: the reserve league, and Brazil's state championships. Neither sits on a
 * ladder — a reserve side is not promoted into the first division, and the state championships run
 * beside the national pyramid rather than feeding it — so neither has a link, which is exactly the
 * fact a tier number cannot express.
 */
export const EXCHANGE_LINKS: readonly ExchangeLink[] = [
  { higherCompetitionId: "comp_eng_1", lowerCompetitionId: "comp_eng_2", slots: 3 },
  { higherCompetitionId: "comp_eng_2", lowerCompetitionId: "comp_eng_3", slots: 3 },
  { higherCompetitionId: "comp_eng_3", lowerCompetitionId: "comp_eng_4", slots: 3 },
  // Spain's parallel regional second tier: two links of one slot each, so the division above
  // relegates one club into each region and the destination is named rather than guessed.
  { higherCompetitionId: "comp_esp_1", lowerCompetitionId: "comp_esp_2n", slots: 1 },
  { higherCompetitionId: "comp_esp_1", lowerCompetitionId: "comp_esp_2s", slots: 1 },
  { higherCompetitionId: "comp_deu_1", lowerCompetitionId: "comp_deu_2", slots: 3 },
  { higherCompetitionId: "comp_deu_2", lowerCompetitionId: "comp_deu_3", slots: 3 },
  { higherCompetitionId: "comp_fra_1", lowerCompetitionId: "comp_fra_2", slots: 3 },
  { higherCompetitionId: "comp_prt_1", lowerCompetitionId: "comp_prt_2", slots: 2 },
  { higherCompetitionId: "comp_bra_1", lowerCompetitionId: "comp_bra_2", slots: 4 },
];

/**
 * Which Competitions' clubs enter which cups and continental tournaments.
 *
 * A continental tournament is a cup for this relation's purposes: it owns no clubs of its own and
 * draws its field from elsewhere, which is the only property the relation cares about.
 */
export const CUP_ENTRANTS: readonly CupEntrant[] = [
  { cupCompetitionId: "comp_eng_cup", sourceCompetitionId: "comp_eng_1" },
  { cupCompetitionId: "comp_eng_cup", sourceCompetitionId: "comp_eng_2" },
  { cupCompetitionId: "comp_eng_cup", sourceCompetitionId: "comp_eng_3" },
  { cupCompetitionId: "comp_eng_cup", sourceCompetitionId: "comp_eng_4" },
  { cupCompetitionId: "comp_esp_cup", sourceCompetitionId: "comp_esp_1" },
  { cupCompetitionId: "comp_esp_cup", sourceCompetitionId: "comp_esp_2n" },
  { cupCompetitionId: "comp_esp_cup", sourceCompetitionId: "comp_esp_2s" },
  { cupCompetitionId: "comp_deu_cup", sourceCompetitionId: "comp_deu_1" },
  { cupCompetitionId: "comp_deu_cup", sourceCompetitionId: "comp_deu_2" },
  { cupCompetitionId: "comp_deu_cup", sourceCompetitionId: "comp_deu_3" },
  { cupCompetitionId: "comp_fra_cup", sourceCompetitionId: "comp_fra_1" },
  { cupCompetitionId: "comp_fra_cup", sourceCompetitionId: "comp_fra_2" },
  { cupCompetitionId: "comp_bra_cup", sourceCompetitionId: "comp_bra_1" },
  { cupCompetitionId: "comp_bra_cup", sourceCompetitionId: "comp_bra_2" },
  { cupCompetitionId: "comp_uefa_champions", sourceCompetitionId: "comp_eng_1" },
  { cupCompetitionId: "comp_uefa_champions", sourceCompetitionId: "comp_esp_1" },
  { cupCompetitionId: "comp_uefa_champions", sourceCompetitionId: "comp_deu_1" },
  { cupCompetitionId: "comp_conmebol_champions", sourceCompetitionId: "comp_bra_1" },
];

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
