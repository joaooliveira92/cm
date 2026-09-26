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

import type { ConfederationId, NationCode } from "../content/nations.js";

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
