/**
 * League and Nation Selection: the pure decision layer (Screen 3, §11, §12, §15, §19).
 *
 * Two models, deliberately separate (§34): the user's **intents** — what they asked for, one
 * record per Nation — and the **effective selection** the intents resolve to once dependencies
 * are closed over. Nothing here does IO, reads a clock, or holds state; the desktop main process
 * owns those and calls into this module as the trusted resolver behind its RPC boundary.
 *
 * Keeping resolution here rather than in the renderer is what makes §23 enforceable: a forged
 * renderer command reaches `resolveSelection`, which knows the catalogue, rather than a UI
 * reducer that has already been told the answer.
 */

import {
  competitionIndex,
  MODE_RANK,
  nationIndex,
  scopeOptionIndex,
  strongerMode,
  type CompetitionNode,
  type LeagueScopeOption,
  type LeagueSetupIndex,
  type NationNode,
  type NationSelectionState,
  type SimulationMode,
} from "./leagueSetup.js";

// ---------------------------------------------------------------------------
// Intent and effective selection (§19)
// ---------------------------------------------------------------------------

/** Where an intent came from. Carried so the summary can say *why* something is selected — a
 *  recommendation the user has not yet touched reads differently from a deliberate choice (§6.1). */
export const INTENT_SOURCES = ["user", "preset", "recommended", "restored"] as const;

export type IntentSource = (typeof INTENT_SOURCES)[number];

export interface NationSelectionIntent {
  readonly nationId: string;
  readonly mode: SimulationMode;
  /** Required when `mode` is `playable`; ignored otherwise. */
  readonly scopeOptionId?: string;
  readonly source: IntentSource;
}

export interface EffectiveNationSelection {
  readonly nationId: string;
  readonly mode: SimulationMode;
  readonly scopeOptionId?: string;
  readonly playableCompetitionIds: readonly string[];
  readonly backgroundCompetitionIds: readonly string[];
  readonly viewOnlyCompetitionIds: readonly string[];
  /** Competitions active in this Nation *only* because something else needs them (§3.7). Always
   *  disjoint from the three lists above: a Competition the user chose is not a dependency. */
  readonly dependencyCompetitionIds: readonly string[];
}

// ---------------------------------------------------------------------------
// Issues (§16)
// ---------------------------------------------------------------------------

export const ISSUE_LEVELS = ["info", "warning", "blocking"] as const;

export type IssueLevel = (typeof ISSUE_LEVELS)[number];

export const ISSUE_CODES = [
  "unknown_nation",
  "unknown_scope_option",
  "scope_option_nation_mismatch",
  "nation_unavailable",
  "playable_not_supported",
  "scope_option_required",
  "dependency_cycle",
  "missing_dependency",
  "no_playable_competition",
  "dependencies_added",
  "heavy_selection",
] as const;

export type IssueCode = (typeof ISSUE_CODES)[number];

export interface SelectionIssue {
  readonly code: IssueCode;
  readonly level: IssueLevel;
  readonly message: string;
  readonly nationId: string | null;
  /** Competitions the issue is about, so the browser can mark exactly the rows involved rather
   *  than the whole Nation. */
  readonly competitionIds: readonly string[];
}

const issue = (
  code: IssueCode,
  level: IssueLevel,
  message: string,
  nationId: string | null = null,
  competitionIds: readonly string[] = [],
): SelectionIssue => ({ code, level, message, nationId, competitionIds });

// ---------------------------------------------------------------------------
// Dependency resolution (§12)
// ---------------------------------------------------------------------------

/**
 * Why one Competition is active. `requiredBy` is the §12.3 reference count: a Competition stays
 * active while *any* selection still needs it, so removing one Nation cannot silently strip a
 * Competition another Nation depends on.
 */
export interface DependencyRecord {
  readonly competitionId: string;
  readonly mode: SimulationMode;
  /** Competition ids that directly require this one. Empty when the user chose it outright. */
  readonly requiredBy: readonly string[];
  readonly chosenDirectly: boolean;
}

export interface ResolvedSelection {
  readonly selections: readonly EffectiveNationSelection[];
  /** Every active Competition keyed by id, including dependencies. The summary counts read from
   *  here so §11's "effective selection" claim is literally what is rendered. */
  readonly dependencies: readonly DependencyRecord[];
  readonly issues: readonly SelectionIssue[];
}

interface ActiveCompetition {
  mode: SimulationMode;
  readonly requiredBy: string[];
  chosenDirectly: boolean;
}

/**
 * Close over the dependency graph from one directly-chosen Competition.
 *
 * Dependencies inherit the mode of what pulled them in, capped at `background`: a playable
 * selection needs its parents *simulated*, not manageable, and §12.1 lists exactly that
 * behaviour. A Competition already active at a stronger mode keeps it.
 *
 * Detects cycles by tracking the path in progress. A cyclic catalogue is a database defect, not a
 * user error, so it surfaces as a blocking issue naming the Competitions on the cycle (§30.5).
 */
const closeDependencies = (
  competitions: ReadonlyMap<string, CompetitionNode>,
  active: Map<string, ActiveCompetition>,
  rootId: string,
  rootMode: SimulationMode,
  cycles: Set<string>,
  missing: Set<string>,
): void => {
  const walk = (id: string, mode: SimulationMode, requiredBy: string | null, path: readonly string[]): void => {
    if (path.includes(id)) {
      // Record the cycle once, canonically, so two entries into the same loop report one issue.
      const loop = [...path.slice(path.indexOf(id)), id];
      cycles.add(loop.join(" -> "));
      return;
    }
    const node = competitions.get(id);
    if (node === undefined) {
      missing.add(id);
      return;
    }

    const existing = active.get(id);
    // Read the previous mode before the entry is mutated: `entry` and `existing` are the same
    // object on a revisit, so comparing after the write would always say "unchanged" and the
    // strengthening re-walk below would never happen.
    const previousMode = existing?.mode;
    const nextMode = previousMode === undefined ? mode : strongerMode(previousMode, mode);
    const entry: ActiveCompetition = existing ?? { mode: nextMode, requiredBy: [], chosenDirectly: false };
    entry.mode = nextMode;
    if (requiredBy === null) {
      entry.chosenDirectly = true;
    } else if (!entry.requiredBy.includes(requiredBy)) {
      entry.requiredBy.push(requiredBy);
    }
    active.set(id, entry);

    // Re-walk when the mode strengthened even if the node was already visited: the parents it
    // pulled in at the weaker mode have to be raised too. An unchanged revisit stops here, which
    // is also what bounds the walk on a diamond-shaped graph.
    const strengthened = previousMode !== undefined && MODE_RANK[nextMode] > MODE_RANK[previousMode];
    if (previousMode !== undefined && !strengthened) return;

    // A dependency is simulated, never managed: cap at background.
    const inheritedMode: SimulationMode = nextMode === "playable" ? "background" : nextMode;
    for (const requirement of node.requires) {
      walk(requirement, inheritedMode, id, [...path, id]);
    }
  };

  walk(rootId, rootMode, null, []);
};

// ---------------------------------------------------------------------------
// Selection resolution (§19, §34)
// ---------------------------------------------------------------------------

const dedupe = (values: readonly string[]): string[] => [...new Set(values)];

/**
 * Turn a list of user intents into the effective selection, or into the issues that stop it
 * being one. Total: an unknown Nation id, an unknown scope option, or a scope option belonging to
 * another Nation each produce a blocking issue and contribute nothing to the selection, rather
 * than throwing. That is what lets the same function serve the UI's live preview and the trusted
 * submission check without a second code path (§17).
 */
export const resolveSelection = (
  index: LeagueSetupIndex,
  intents: readonly NationSelectionIntent[],
  options: { readonly allowBackgroundOnlyCareer?: boolean } = {},
): ResolvedSelection => {
  const nations = nationIndex(index);
  const competitions = competitionIndex(index);
  const scopeOptions = scopeOptionIndex(index);

  const issues: SelectionIssue[] = [];
  const active = new Map<string, ActiveCompetition>();
  const cycles = new Set<string>();
  const missing = new Set<string>();
  /** Scope option accepted per Nation, kept so the effective selection can echo it back. */
  const acceptedScope = new Map<string, string>();
  const requestedMode = new Map<string, SimulationMode>();

  // Last intent wins per Nation: the UI sends a full intent per change, and a duplicate id in a
  // forged payload must resolve to one answer rather than two conflicting selections.
  const byNation = new Map<string, NationSelectionIntent>();
  for (const intent of intents) byNation.set(intent.nationId, intent);

  for (const intent of byNation.values()) {
    if (intent.mode === "not_loaded") continue;

    const nation = nations.get(intent.nationId);
    if (nation === undefined) {
      issues.push(
        issue("unknown_nation", "blocking", `Unknown nation "${intent.nationId}".`, intent.nationId),
      );
      continue;
    }
    if (!nation.available) {
      issues.push(
        issue(
          "nation_unavailable",
          "blocking",
          `${nation.name} is listed in this database but its content is not installed.`,
          nation.id,
        ),
      );
      continue;
    }

    if (intent.mode === "playable") {
      if (!nation.playableSupported) {
        issues.push(
          issue(
            "playable_not_supported",
            "blocking",
            `${nation.name} has no league this database can make playable.`,
            nation.id,
          ),
        );
        continue;
      }
      if (intent.scopeOptionId === undefined) {
        issues.push(
          issue(
            "scope_option_required",
            "blocking",
            `Choose how much of ${nation.name} to load before continuing.`,
            nation.id,
          ),
        );
        continue;
      }
      const option = scopeOptions.get(intent.scopeOptionId);
      if (option === undefined) {
        issues.push(
          issue(
            "unknown_scope_option",
            "blocking",
            `Unknown league scope "${intent.scopeOptionId}".`,
            nation.id,
          ),
        );
        continue;
      }
      if (option.nationId !== nation.id) {
        issues.push(
          issue(
            "scope_option_nation_mismatch",
            "blocking",
            `League scope "${option.displayName}" does not belong to ${nation.name}.`,
            nation.id,
          ),
        );
        continue;
      }

      acceptedScope.set(nation.id, option.id);
      requestedMode.set(nation.id, "playable");
      for (const id of option.playableCompetitionIds) {
        closeDependencies(competitions, active, id, "playable", cycles, missing);
      }
      for (const id of option.backgroundCompetitionIds) {
        closeDependencies(competitions, active, id, "background", cycles, missing);
      }
      continue;
    }

    // Background and view-only take the Nation's whole league set: there is no depth to choose
    // when nothing is manageable, and §9.5 keeps any previous playable depth on the intent side
    // for restoration rather than in the effective selection.
    requestedMode.set(nation.id, intent.mode);
    for (const competition of nation.competitions) {
      closeDependencies(competitions, active, competition.id, intent.mode, cycles, missing);
    }
  }

  for (const loop of cycles) {
    issues.push(
      issue(
        "dependency_cycle",
        "blocking",
        `This database describes a circular competition dependency (${loop}). The selection cannot be resolved.`,
        null,
        loop.split(" -> "),
      ),
    );
  }
  for (const id of missing) {
    issues.push(
      issue(
        "missing_dependency",
        "blocking",
        `A selected competition requires "${id}", which this database does not contain.`,
        null,
        [id],
      ),
    );
  }

  // Group the active set back into per-Nation rows.
  const perNation = new Map<
    string,
    { playable: string[]; background: string[]; viewOnly: string[]; dependency: string[] }
  >();
  for (const [id, entry] of active) {
    const node = competitions.get(id);
    if (node === undefined) continue;
    const bucket =
      perNation.get(node.nationId) ??
      { playable: [], background: [], viewOnly: [], dependency: [] };
    if (!entry.chosenDirectly) {
      bucket.dependency.push(id);
    } else if (entry.mode === "playable") {
      bucket.playable.push(id);
    } else if (entry.mode === "background") {
      bucket.background.push(id);
    } else if (entry.mode === "view_only") {
      bucket.viewOnly.push(id);
    }
    perNation.set(node.nationId, bucket);
  }

  const selections: EffectiveNationSelection[] = [];
  for (const [nationId, bucket] of perNation) {
    const scopeOptionId = acceptedScope.get(nationId);
    const mode: SimulationMode =
      requestedMode.get(nationId) ?? (bucket.playable.length > 0 ? "playable" : "background");
    selections.push({
      nationId,
      mode,
      ...(scopeOptionId === undefined ? {} : { scopeOptionId }),
      playableCompetitionIds: dedupe(bucket.playable).sort(),
      backgroundCompetitionIds: dedupe(bucket.background).sort(),
      viewOnlyCompetitionIds: dedupe(bucket.viewOnly).sort(),
      dependencyCompetitionIds: dedupe(bucket.dependency).sort(),
    });
  }
  selections.sort((a, b) => a.nationId.localeCompare(b.nationId));

  const dependencies: DependencyRecord[] = [...active.entries()]
    .map(([competitionId, entry]) => ({
      competitionId,
      mode: entry.mode,
      requiredBy: [...entry.requiredBy].sort(),
      chosenDirectly: entry.chosenDirectly,
    }))
    .sort((a, b) => a.competitionId.localeCompare(b.competitionId));

  const autoIncluded = dependencies.filter((record) => !record.chosenDirectly);
  if (autoIncluded.length > 0) {
    issues.push(
      issue(
        "dependencies_added",
        "info",
        `${autoIncluded.length} competition${autoIncluded.length === 1 ? " was" : "s were"} included automatically because your selection requires ${autoIncluded.length === 1 ? "it" : "them"}.`,
        null,
        autoIncluded.map((record) => record.competitionId),
      ),
    );
  }

  const hasPlayable = dependencies.some((record) => record.mode === "playable");
  if (!hasPlayable && options.allowBackgroundOnlyCareer !== true) {
    issues.push(
      issue(
        "no_playable_competition",
        "blocking",
        "Select at least one playable league before continuing.",
      ),
    );
  }

  return { selections, dependencies, issues };
};

// ---------------------------------------------------------------------------
// Estimates (§11)
// ---------------------------------------------------------------------------

export const SIMULATION_SPEED_RATINGS = [
  "very_fast",
  "fast",
  "medium",
  "slow",
  "very_slow",
  "unsupported",
] as const;

export type SimulationSpeedRating = (typeof SIMULATION_SPEED_RATINGS)[number];

export interface SystemCapabilityProfile {
  readonly totalMemoryBytes: number;
  /** 1.0 is the reference machine the cost table was calibrated on; 2.0 is twice as fast. */
  readonly performanceIndex: number;
}

export const DEFAULT_SYSTEM_PROFILE: SystemCapabilityProfile = {
  totalMemoryBytes: 8 * 1024 * 1024 * 1024,
  performanceIndex: 1,
};

export interface CareerScopeEstimate {
  readonly selectedNationCount: number;
  readonly playableNationCount: number;
  readonly backgroundNationCount: number;
  readonly playableCompetitionCount: number;
  readonly backgroundCompetitionCount: number;
  readonly estimatedClubCount: number;
  readonly estimatedPlayerCount: number;
  readonly estimatedStaffCount: number;
  readonly estimatedMemoryBytes: number;
  readonly estimatedInitialSaveBytes: number;
  readonly simulationSpeedRating: SimulationSpeedRating;
  readonly confidence: "low" | "medium" | "high";
}

/**
 * Per-mode multipliers. Deliberately coarse: §11.4 forbids implying a precision the model does
 * not have, and every figure derived from these is rendered rounded and hedged.
 */
const SQUAD_SIZE: Readonly<Record<SimulationMode, number>> = {
  playable: 25,
  background: 22,
  // §9.3: view-only keeps standings and results, not squads.
  view_only: 0,
  not_loaded: 0,
};

const STAFF_PER_CLUB: Readonly<Record<SimulationMode, number>> = {
  playable: 8,
  background: 3,
  view_only: 0,
  not_loaded: 0,
};

/** Relative per-match processing cost by mode. Playable is the unit. */
const MATCH_COST: Readonly<Record<SimulationMode, number>> = {
  playable: 1,
  background: 0.25,
  view_only: 0.05,
  not_loaded: 0,
};

const BASE_MEMORY_BYTES = 256 * 1024 * 1024;
const BYTES_PER_PLAYER = 3_500;
const BYTES_PER_CLUB = 40_000;
const BYTES_PER_MATCH = 1_200;

const BASE_SAVE_BYTES = 4 * 1024 * 1024;
const SAVE_BYTES_PER_PLAYER = 1_400;
const SAVE_BYTES_PER_CLUB = 12_000;

/** Cost-score cut points, in reference-machine match-cost units, for the §11.2 categorical rating. */
const SPEED_THRESHOLDS: readonly (readonly [number, SimulationSpeedRating])[] = [
  [1_500, "very_fast"],
  [6_000, "fast"],
  [18_000, "medium"],
  [40_000, "slow"],
  [90_000, "very_slow"],
];

/**
 * Estimate the cost of an already-resolved selection. Pure and fast — the debounce and
 * cancellation §11.5 asks for live at the call site, not here, because a function that takes
 * microseconds has nothing to cancel.
 */
export const estimateCareerScope = (
  index: LeagueSetupIndex,
  resolved: ResolvedSelection,
  profile: SystemCapabilityProfile = DEFAULT_SYSTEM_PROFILE,
): CareerScopeEstimate => {
  const competitions = competitionIndex(index);

  let clubs = 0;
  let players = 0;
  let staff = 0;
  let matches = 0;
  let costScore = 0;
  let playableCompetitions = 0;
  let backgroundCompetitions = 0;
  let verified = 0;
  let total = 0;

  for (const record of resolved.dependencies) {
    const node = competitions.get(record.competitionId);
    if (node === undefined) continue;
    total += 1;
    if (node.estimatesVerified) verified += 1;

    clubs += node.clubCount;
    players += node.clubCount * SQUAD_SIZE[record.mode];
    staff += node.clubCount * STAFF_PER_CLUB[record.mode];
    matches += node.annualMatches;
    costScore += node.annualMatches * MATCH_COST[record.mode];

    if (record.mode === "playable") playableCompetitions += 1;
    else if (record.mode === "background") backgroundCompetitions += 1;
  }

  const adjustedCost = costScore / Math.max(profile.performanceIndex, 0.1);
  const estimatedMemoryBytes =
    BASE_MEMORY_BYTES + players * BYTES_PER_PLAYER + clubs * BYTES_PER_CLUB + matches * BYTES_PER_MATCH;

  // A selection that cannot fit in memory is `unsupported` rather than merely very slow: §16.3
  // wants a blocking signal the summary can render without pretending a speed exists.
  const simulationSpeedRating: SimulationSpeedRating =
    estimatedMemoryBytes > profile.totalMemoryBytes
      ? "unsupported"
      : (SPEED_THRESHOLDS.find(([limit]) => adjustedCost <= limit)?.[1] ?? "very_slow");

  const playableNations = resolved.selections.filter((s) => s.playableCompetitionIds.length > 0);
  const backgroundNations = resolved.selections.filter(
    (s) => s.playableCompetitionIds.length === 0 && s.backgroundCompetitionIds.length > 0,
  );

  const verifiedShare = total === 0 ? 1 : verified / total;

  return {
    selectedNationCount: resolved.selections.length,
    playableNationCount: playableNations.length,
    backgroundNationCount: backgroundNations.length,
    playableCompetitionCount: playableCompetitions,
    backgroundCompetitionCount: backgroundCompetitions,
    estimatedClubCount: clubs,
    estimatedPlayerCount: players,
    estimatedStaffCount: staff,
    estimatedMemoryBytes,
    estimatedInitialSaveBytes:
      BASE_SAVE_BYTES + players * SAVE_BYTES_PER_PLAYER + clubs * SAVE_BYTES_PER_CLUB,
    simulationSpeedRating,
    confidence: verifiedShare === 1 ? "high" : verifiedShare >= 0.5 ? "medium" : "low",
  };
};

/**
 * Issues the estimate itself raises (§15, §16.2). Kept apart from `resolveSelection` because they
 * depend on the machine, and a selection that is merely slow here is valid everywhere else.
 */
export const estimateIssues = (estimate: CareerScopeEstimate): readonly SelectionIssue[] => {
  if (estimate.simulationSpeedRating === "unsupported") {
    return [
      issue(
        "heavy_selection",
        "blocking",
        "This selection needs more memory than this computer has. Reduce the number of loaded leagues.",
      ),
    ];
  }
  if (estimate.simulationSpeedRating === "very_slow" || estimate.simulationSpeedRating === "slow") {
    return [
      issue(
        "heavy_selection",
        "warning",
        "This selection is large. Processing a day of the season may take noticeably longer on this computer.",
      ),
    ];
  }
  return [];
};

// ---------------------------------------------------------------------------
// Validation and submission gating (§17)
// ---------------------------------------------------------------------------

export const blockingIssues = (issues: readonly SelectionIssue[]): readonly SelectionIssue[] =>
  issues.filter((entry) => entry.level === "blocking");

export const warningIssues = (issues: readonly SelectionIssue[]): readonly SelectionIssue[] =>
  issues.filter((entry) => entry.level === "warning");

/** §5.5. `Continue` is live only when nothing blocks. Warnings do not block; they gate on an
 *  acknowledgement the caller tracks. */
export const canContinue = (issues: readonly SelectionIssue[]): boolean =>
  blockingIssues(issues).length === 0;

// ---------------------------------------------------------------------------
// Nation row derivation (§7.1, §7.2)
// ---------------------------------------------------------------------------

export const nationSelectionState = (
  nation: NationNode,
  resolved: ResolvedSelection,
): NationSelectionState => {
  if (!nation.available) return "unavailable";
  const selection = resolved.selections.find((entry) => entry.nationId === nation.id);
  if (selection === undefined) return "not_selected";

  const chosen =
    selection.playableCompetitionIds.length +
    selection.backgroundCompetitionIds.length +
    selection.viewOnlyCompetitionIds.length;
  if (chosen === 0) return "included_by_dependency";

  // "Partially selected" is about the Nation's own pyramid: some of its Competitions are active
  // and some are not. It is the tri-state `mixed` in §7.2, and it is derived — never stored.
  const activeIds = new Set([
    ...selection.playableCompetitionIds,
    ...selection.backgroundCompetitionIds,
    ...selection.viewOnlyCompetitionIds,
    ...selection.dependencyCompetitionIds,
  ]);
  const covers = nation.competitions.every((competition) => activeIds.has(competition.id));
  if (!covers) return "partially_selected";

  return selection.mode === "playable"
    ? "selected_playable"
    : selection.mode === "view_only"
      ? "selected_view_only"
      : "selected_background";
};

export type TriState = "unchecked" | "checked" | "mixed";

export const nationTriState = (state: NationSelectionState): TriState => {
  switch (state) {
    case "not_selected":
    case "unavailable":
      return "unchecked";
    case "partially_selected":
    case "included_by_dependency":
      return "mixed";
    default:
      return "checked";
  }
};

// ---------------------------------------------------------------------------
// Mode transitions (§9.5)
// ---------------------------------------------------------------------------

/**
 * Apply a mode change to the intent list, preserving the Nation's previous playable scope so
 * Background → Playable can restore it (§9.5 steps 4 and the closing paragraph) instead of
 * silently resetting the user's depth.
 *
 * `rememberedScopes` is the caller's memory of prior playable depths; it is returned updated
 * rather than mutated, so the reducer holding it stays a pure fold.
 */
export interface ModeChangeResult {
  readonly intents: readonly NationSelectionIntent[];
  readonly rememberedScopes: Readonly<Record<string, string>>;
}

export const applyModeChange = (
  index: LeagueSetupIndex,
  intents: readonly NationSelectionIntent[],
  rememberedScopes: Readonly<Record<string, string>>,
  nationId: string,
  mode: SimulationMode,
  source: IntentSource = "user",
): ModeChangeResult => {
  const nation = nationIndex(index).get(nationId);
  const previous = intents.find((entry) => entry.nationId === nationId);

  const remembered =
    previous?.mode === "playable" && previous.scopeOptionId !== undefined
      ? { ...rememberedScopes, [nationId]: previous.scopeOptionId }
      : rememberedScopes;

  const withoutNation = intents.filter((entry) => entry.nationId !== nationId);
  if (mode === "not_loaded") {
    return { intents: withoutNation, rememberedScopes: remembered };
  }

  if (mode === "playable") {
    // Restore the remembered depth, else the database's recommendation, else the narrowest
    // supported scope — never nothing, which would leave Continue blocked on a choice the user
    // did not know they had to make.
    const scopeOptionId =
      remembered[nationId] ??
      nation?.recommendedScopeOptionId ??
      nation?.scopeOptions[0]?.id;
    return {
      intents: [
        ...withoutNation,
        scopeOptionId === undefined
          ? { nationId, mode, source }
          : { nationId, mode, scopeOptionId, source },
      ],
      rememberedScopes: remembered,
    };
  }

  return {
    intents: [...withoutNation, { nationId, mode, source }],
    rememberedScopes: remembered,
  };
};

export const applyScopeChange = (
  intents: readonly NationSelectionIntent[],
  nationId: string,
  scopeOptionId: string,
  source: IntentSource = "user",
): readonly NationSelectionIntent[] => [
  ...intents.filter((entry) => entry.nationId !== nationId),
  { nationId, mode: "playable", scopeOptionId, source },
];

// ---------------------------------------------------------------------------
// Search and filtering (§10)
// ---------------------------------------------------------------------------

/**
 * §10.2. Case-folded, diacritic-stripped, whitespace-collapsed. Applied to both the query and the
 * candidate so "Doravia" matches "doravia" and "República Doravia" matches "republica".
 */
export const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFD")
    // Combining marks: strip the accent, keep the base letter.
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export interface SearchHit {
  readonly nationId: string;
  /** The Competition that matched, when the hit was on a Competition rather than the Nation. */
  readonly competitionId: string | null;
}

/**
 * §10.1. Matches Nation names, alternative names, Competition names, and region names. Never
 * matches a stable entity id: §10.2 keeps identifiers out of ordinary results, so a user typing
 * "comp-aravia-1" gets nothing rather than a leak of the internal vocabulary.
 */
export const searchIndex = (index: LeagueSetupIndex, query: string): readonly SearchHit[] => {
  const needle = normalizeSearchText(query);
  if (needle === "") return [];

  const regionNames = new Map(index.regions.map((region) => [region.id, region.name]));
  const hits: SearchHit[] = [];

  for (const nation of index.nations) {
    const nationHaystack = [
      nation.name,
      ...nation.alternativeNames,
      regionNames.get(nation.regionId) ?? "",
    ].map((value) => normalizeSearchText(value));

    if (nationHaystack.some((value) => value.includes(needle))) {
      hits.push({ nationId: nation.id, competitionId: null });
    }
    for (const competition of nation.competitions) {
      if (normalizeSearchText(competition.name).includes(needle)) {
        hits.push({ nationId: nation.id, competitionId: competition.id });
      }
    }
  }
  return hits;
};

export const STATUS_FILTERS = [
  "all",
  "selected",
  "playable",
  "background",
  "view_only",
  "included_by_dependency",
  "warnings",
  "unavailable",
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** §10.4. Pure predicate over a Nation's derived state; the caller supplies the state so a list
 *  render derives it once per Nation rather than once per filter test. */
export const matchesStatusFilter = (
  filter: StatusFilter,
  state: NationSelectionState,
  hasWarning: boolean,
): boolean => {
  switch (filter) {
    case "all":
      return true;
    case "selected":
      return state !== "not_selected" && state !== "unavailable";
    case "playable":
      return state === "selected_playable";
    case "background":
      return state === "selected_background";
    case "view_only":
      return state === "selected_view_only";
    case "included_by_dependency":
      return state === "included_by_dependency";
    case "warnings":
      return hasWarning;
    case "unavailable":
      return state === "unavailable";
  }
};

// ---------------------------------------------------------------------------
// Presets (§13, §29)
// ---------------------------------------------------------------------------

export const BUILT_IN_PRESETS = ["recommended", "minimal", "broad_world"] as const;

export type BuiltInPreset = (typeof BUILT_IN_PRESETS)[number];

const topScopeOf = (nation: NationNode): LeagueScopeOption | undefined =>
  nation.scopeOptions[0];

/**
 * §6.1 and §13. The three built-in configurations, derived from the catalogue rather than
 * hardcoded id lists, so a database that ships different Nations still produces a valid preset.
 *
 * `recommended` honours each Nation's own `recommendedScopeOptionId` and trims to what the
 * machine can carry; `minimal` is the single cheapest playable Nation; `broad_world` makes every
 * playable Nation playable at its narrowest scope and every other Nation background.
 */
export const buildPreset = (
  index: LeagueSetupIndex,
  preset: BuiltInPreset,
  profile: SystemCapabilityProfile = DEFAULT_SYSTEM_PROFILE,
): readonly NationSelectionIntent[] => {
  const playable = index.nations.filter(
    (nation) => nation.available && nation.playableSupported && nation.scopeOptions.length > 0,
  );

  if (preset === "minimal") {
    const cheapest = [...playable].sort(
      (a, b) => nationClubCount(a) - nationClubCount(b),
    )[0];
    const scope = cheapest === undefined ? undefined : topScopeOf(cheapest);
    return cheapest === undefined || scope === undefined
      ? []
      : [{ nationId: cheapest.id, mode: "playable", scopeOptionId: scope.id, source: "preset" }];
  }

  if (preset === "broad_world") {
    return index.nations.flatMap((nation): readonly NationSelectionIntent[] => {
      if (!nation.available) return [];
      const scope = topScopeOf(nation);
      if (nation.playableSupported && scope !== undefined) {
        return [{ nationId: nation.id, mode: "playable", scopeOptionId: scope.id, source: "preset" }];
      }
      return nation.competitions.length === 0
        ? []
        : [{ nationId: nation.id, mode: "background", source: "preset" }];
    });
  }

  // Recommended: take the database's recommendations, then keep adding until the estimate leaves
  // the comfortable band. A machine with a higher performance index therefore gets a broader
  // default without the policy being written twice.
  const recommended = playable.filter((nation) => nation.recommendedScopeOptionId !== null);
  const intents: NationSelectionIntent[] = [];
  for (const nation of recommended) {
    const candidate: NationSelectionIntent = {
      nationId: nation.id,
      mode: "playable",
      scopeOptionId: nation.recommendedScopeOptionId as string,
      source: "recommended",
    };
    const next = [...intents, candidate];
    const estimate = estimateCareerScope(index, resolveSelection(index, next), profile);
    if (estimate.simulationSpeedRating === "slow" || estimate.simulationSpeedRating === "very_slow" || estimate.simulationSpeedRating === "unsupported") {
      break;
    }
    intents.push(candidate);
  }
  // Never recommend nothing: a database whose recommendations all overflow still needs a career.
  if (intents.length === 0) return buildPreset(index, "minimal", profile);
  return intents;
};

const nationClubCount = (nation: NationNode): number =>
  nation.competitions.reduce((total, competition) => total + competition.clubCount, 0);

/**
 * §13 and §31.4. A stored preset or draft is only applicable to the database it was captured
 * against. Rather than guessing at a renamed Competition, an intent naming something the current
 * catalogue does not contain is dropped and reported, and a fingerprint mismatch rejects the
 * whole payload.
 */
export interface PresetApplication {
  readonly intents: readonly NationSelectionIntent[];
  readonly droppedNationIds: readonly string[];
  readonly droppedScopeOptionIds: readonly string[];
  readonly fingerprintMatches: boolean;
}

export const applyStoredIntents = (
  index: LeagueSetupIndex,
  storedFingerprint: string,
  stored: readonly NationSelectionIntent[],
): PresetApplication => {
  if (storedFingerprint !== index.fingerprint) {
    return {
      intents: [],
      droppedNationIds: [],
      droppedScopeOptionIds: [],
      fingerprintMatches: false,
    };
  }

  const nations = nationIndex(index);
  const scopeOptions = scopeOptionIndex(index);
  const kept: NationSelectionIntent[] = [];
  const droppedNationIds: string[] = [];
  const droppedScopeOptionIds: string[] = [];

  for (const intent of stored) {
    const nation = nations.get(intent.nationId);
    if (nation === undefined || !nation.available) {
      droppedNationIds.push(intent.nationId);
      continue;
    }
    if (intent.mode === "playable") {
      const option = intent.scopeOptionId === undefined ? undefined : scopeOptions.get(intent.scopeOptionId);
      if (option === undefined || option.nationId !== nation.id) {
        if (intent.scopeOptionId !== undefined) droppedScopeOptionIds.push(intent.scopeOptionId);
        continue;
      }
    }
    kept.push(intent);
  }

  return { intents: kept, droppedNationIds, droppedScopeOptionIds, fingerprintMatches: true };
};

// ---------------------------------------------------------------------------
// Untrusted label handling (§23)
// ---------------------------------------------------------------------------

/** Characters that let a database label lie about its own direction or hide content: bidi
 *  overrides and isolates, zero-width joiners, and the C0/C1 control ranges. */
// oxlint-disable-next-line no-control-regex
const UNSAFE_LABEL_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export const MAX_LABEL_LENGTH = 120;

/**
 * §23. Database-derived labels are untrusted. React escapes markup on render, which covers script
 * and tag injection; what it does not cover is a label that reverses the direction of the row
 * around it, hides characters, or is long enough to break the layout. This clamps all three, and
 * is applied where the catalogue crosses into a read model — once, at the boundary, not at each
 * render site.
 */
export const sanitizeLabel = (raw: string): string => {
  const stripped = raw.replace(UNSAFE_LABEL_CHARS, "").replace(/\s+/g, " ").trim();
  if (stripped.length === 0) return "(unnamed)";
  return stripped.length <= MAX_LABEL_LENGTH
    ? stripped
    : `${stripped.slice(0, MAX_LABEL_LENGTH - 1)}…`;
};
