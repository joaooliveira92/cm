/**
 * The validated setup index a new career's scope is chosen from (Screen 3, §3 and §8.4).
 *
 * This is the *catalogue*, not a selection: the regions, Nations, and Competitions a database
 * offers, the League Scope Options each Nation supports, and the dependency edges between
 * Competitions. It is pure data with no IO — the desktop main process reads it, sanitizes its
 * labels, and hands the renderer a read model.
 *
 * Every name here is fictional. Structures are modelled after real pyramid shapes (parallel
 * regional divisions, cups, reserve leagues, a cross-border tournament) without reproducing any
 * real competition's identity.
 */

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
 * The shipped catalogue. Twelve Nations across six regions, deliberately covering the shapes §8.3
 * says the model must survive: a four-tier pyramid with a reserve league (Aravia), parallel
 * regional second divisions (Caldonia), a Nation with no playable league at all (Ismere), a
 * Nation present in metadata but unavailable (Jorvalia), and a cross-border tournament whose
 * dependencies span three Nations (Continental).
 */
export const LEAGUE_SETUP_INDEX: LeagueSetupIndex = {
  fingerprint: "fictional-world-2003-04@1.0.0",
  databaseName: "Fictional World 2003/04",
  databaseVersion: "1.0.0",
  regions: [
    { id: "region-north", name: "Northern Reach" },
    { id: "region-south", name: "Southern Cape" },
    { id: "region-east", name: "Eastern Marches" },
    { id: "region-west", name: "Western Isles" },
    { id: "region-meridian", name: "Meridian Basin" },
    { id: "region-continental", name: "Continental" },
  ],
  nations: [
    {
      id: "nation-aravia",
      regionId: "region-north",
      name: "Aravia",
      alternativeNames: ["Aravian Union"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope-aravia-two",
      competitions: [
        // The top division requires its national cup: the two share entrants and a calendar,
        // so loading one without the other leaves the season with holes (§3.7).
        league("nation-aravia", "comp-aravia-1", "Aravian Premier Division", 1, ["comp-aravia-cup"], 20),
        league("nation-aravia", "comp-aravia-2", "Aravian First Division", 2, ["comp-aravia-1"], 22),
        league("nation-aravia", "comp-aravia-3", "Aravian Second Division", 3, ["comp-aravia-2"], 24),
        league("nation-aravia", "comp-aravia-4", "Aravian Third Division", 4, ["comp-aravia-3"], 24),
        cup("nation-aravia", "comp-aravia-cup", "Aravian National Cup", 126),
        {
          id: "comp-aravia-reserve",
          nationId: "nation-aravia",
          name: "Aravian Reserve League",
          kind: "reserve",
          tier: null,
          requires: ["comp-aravia-1"],
          clubCount: 20,
          annualMatches: 380,
          playableSupported: false,
          estimatesVerified: true,
        },
      ],
      scopeOptions: [
        {
          id: "scope-aravia-top",
          nationId: "nation-aravia",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-aravia-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-aravia-two",
          nationId: "nation-aravia",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp-aravia-1", "comp-aravia-2"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-aravia-pyramid",
          nationId: "nation-aravia",
          displayName: "National pyramid",
          playableCompetitionIds: [
            "comp-aravia-1",
            "comp-aravia-2",
            "comp-aravia-3",
            "comp-aravia-4",
          ],
          backgroundCompetitionIds: ["comp-aravia-reserve"],
        },
      ],
    },
    {
      id: "nation-brennmark",
      regionId: "region-north",
      name: "Brennmark",
      alternativeNames: ["Brennmarken"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope-brennmark-top",
      competitions: [
        league("nation-brennmark", "comp-brennmark-1", "Brennmark Elite Division", 1, ["comp-brennmark-cup"], 18),
        league("nation-brennmark", "comp-brennmark-2", "Brennmark First Division", 2, ["comp-brennmark-1"], 20),
        league("nation-brennmark", "comp-brennmark-3", "Brennmark Second Division", 3, ["comp-brennmark-2"], 20),
        cup("nation-brennmark", "comp-brennmark-cup", "Brennmark Cup", 96),
      ],
      scopeOptions: [
        {
          id: "scope-brennmark-top",
          nationId: "nation-brennmark",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-brennmark-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-brennmark-pyramid",
          nationId: "nation-brennmark",
          displayName: "National pyramid",
          playableCompetitionIds: [
            "comp-brennmark-1",
            "comp-brennmark-2",
            "comp-brennmark-3",
          ],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-caldonia",
      regionId: "region-north",
      name: "Caldonia",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: "scope-caldonia-top",
      competitions: [
        league("nation-caldonia", "comp-caldonia-1", "Caldonian National Division", 1, [], 16),
        // Parallel regional second tier: two Competitions at the same depth, both feeding the
        // same division above. A depth *number* cannot express this, which is why the scope
        // option is the unit of selection (§8.3).
        league("nation-caldonia", "comp-caldonia-2n", "Caldonian Northern Second", 2, ["comp-caldonia-1"], 14),
        league("nation-caldonia", "comp-caldonia-2s", "Caldonian Southern Second", 2, ["comp-caldonia-1"], 14),
      ],
      scopeOptions: [
        {
          id: "scope-caldonia-top",
          nationId: "nation-caldonia",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-caldonia-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-caldonia-regional",
          nationId: "nation-caldonia",
          displayName: "National and regional pyramid",
          playableCompetitionIds: [
            "comp-caldonia-1",
            "comp-caldonia-2n",
            "comp-caldonia-2s",
          ],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-doravia",
      regionId: "region-south",
      name: "Doravia",
      alternativeNames: ["República Doravia"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-doravia", "comp-doravia-1", "Doravian Apertura", 1, ["comp-doravia-cup"], 18),
        league("nation-doravia", "comp-doravia-2", "Doravian Second Division", 2, ["comp-doravia-1"], 18),
        cup("nation-doravia", "comp-doravia-cup", "Doravian National Cup", 88),
      ],
      scopeOptions: [
        {
          id: "scope-doravia-top",
          nationId: "nation-doravia",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-doravia-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-doravia-two",
          nationId: "nation-doravia",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp-doravia-1", "comp-doravia-2"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-esperanza",
      regionId: "region-south",
      name: "Esperanza",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-esperanza", "comp-esperanza-1", "Esperanzan First Division", 1, [], 16),
      ],
      scopeOptions: [
        {
          id: "scope-esperanza-top",
          nationId: "nation-esperanza",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-esperanza-1"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-fennland",
      regionId: "region-east",
      name: "Fennland",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-fennland", "comp-fennland-1", "Fennish Premier League", 1, [], 14),
        league("nation-fennland", "comp-fennland-2", "Fennish First League", 2, ["comp-fennland-1"], 14),
      ],
      scopeOptions: [
        {
          id: "scope-fennland-top",
          nationId: "nation-fennland",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-fennland-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-fennland-two",
          nationId: "nation-fennland",
          displayName: "Top two divisions",
          playableCompetitionIds: ["comp-fennland-1", "comp-fennland-2"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-gostrava",
      regionId: "region-east",
      name: "Gostrava",
      alternativeNames: ["Gostravia"],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-gostrava", "comp-gostrava-1", "Gostravan Super Liga", 1, [], 12, {
          estimatesVerified: false,
        }),
      ],
      scopeOptions: [
        {
          id: "scope-gostrava-top",
          nationId: "nation-gostrava",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-gostrava-1"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      id: "nation-halvern",
      regionId: "region-west",
      name: "Halvern",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-halvern", "comp-halvern-1", "Halvern Premier Division", 1, ["comp-halvern-cup"], 20),
        league("nation-halvern", "comp-halvern-2", "Halvern First Division", 2, ["comp-halvern-1"], 20),
        league("nation-halvern", "comp-halvern-3", "Halvern Second Division", 3, ["comp-halvern-2"], 22),
        cup("nation-halvern", "comp-halvern-cup", "Halvern Challenge Cup", 110),
      ],
      scopeOptions: [
        {
          id: "scope-halvern-top",
          nationId: "nation-halvern",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-halvern-1"],
          backgroundCompetitionIds: [],
        },
        {
          id: "scope-halvern-pyramid",
          nationId: "nation-halvern",
          displayName: "National pyramid",
          playableCompetitionIds: ["comp-halvern-1", "comp-halvern-2", "comp-halvern-3"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      // §7.3. Real clubs and players, no league the database can make playable. The row stays
      // visible and reads "Background data only"; no scope option offers Playable.
      id: "nation-ismere",
      regionId: "region-west",
      name: "Ismere",
      alternativeNames: ["Ismere Territory"],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-ismere", "comp-ismere-1", "Ismere Island Championship", 1, [], 10, {
          playableSupported: false,
          estimatesVerified: false,
        }),
      ],
      scopeOptions: [],
    },
    {
      // §7.1 `unavailable`. Present in metadata, absent from content; selecting it is refused
      // rather than silently ignored.
      id: "nation-jorvalia",
      regionId: "region-meridian",
      name: "Jorvalia",
      alternativeNames: [],
      available: false,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [],
      scopeOptions: [],
    },
    {
      id: "nation-kestria",
      regionId: "region-meridian",
      name: "Kestria",
      alternativeNames: [],
      available: true,
      playableSupported: true,
      recommendedScopeOptionId: null,
      competitions: [
        league("nation-kestria", "comp-kestria-1", "Kestrian National League", 1, ["comp-kestria-cup"], 14, {
          estimatesVerified: false,
        }),
        cup("nation-kestria", "comp-kestria-cup", "Kestrian Cup", 60),
      ],
      scopeOptions: [
        {
          id: "scope-kestria-top",
          nationId: "nation-kestria",
          displayName: "Top division only",
          playableCompetitionIds: ["comp-kestria-1"],
          backgroundCompetitionIds: [],
        },
      ],
    },
    {
      // A cross-border tournament modelled as its own Nation-shaped branch so the browser stays
      // one uniform tree. It is never playable on its own; it exists to be pulled in as a
      // dependency, or selected as background alongside the Nations that qualify into it.
      id: "nation-continental",
      regionId: "region-continental",
      name: "Continental Competitions",
      alternativeNames: [],
      available: true,
      playableSupported: false,
      recommendedScopeOptionId: null,
      competitions: [
        {
          id: "comp-continental-champions",
          nationId: "nation-continental",
          name: "Continental Champions Series",
          kind: "continental",
          tier: null,
          requires: ["comp-aravia-1", "comp-brennmark-1", "comp-caldonia-1"],
          clubCount: 0,
          annualMatches: 125,
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
