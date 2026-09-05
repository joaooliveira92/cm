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
  type LeagueSetupIndex,
  type NationNode,
  type NationSelectionState,
  type SimulationMode,
} from "./leagueSetup.js";
import { catalogueName } from "../content/contentPack.js";
import { depthFromMode, type SimulationDepth } from "./simulation.js";

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
  "no_active_leagues",
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

/**
 * One row of the active-leagues projection: a single active Competition in the career scope,
 * carrying its own simulation depth at the three-tier grain the screen is built around.
 *
 * The projection is the domain layer's answer to "what does the player actually have loaded?"
 * — one row per active Competition, each with a stable league id (never the array index), a
 * scope description, and the effective depth. A Competition pulled in as a dependency is
 * capped at `standard` and is not depth-editable; its row shows the effective value rather
 * than an editable override. A row whose depth would change only if its Nation's scope
 * changed keeps both in view: the depth it has now, and the scope it came from.
 */
export interface ActiveLeaguesRow {
  readonly competitionId: string;
  /** Stable league identifier — never the array index. */
  readonly leagueId: string;
  readonly leagueName: string;
  readonly nationId: string;
  readonly nationName: string;
  readonly scopeDescription: string;
  readonly depth: SimulationDepth;
  /** True when this Competition is active only because another selection requires it. A
   *  dependency is capped at `standard` and is not depth-editable (§"capped-dependency
   *  rule" of the Active Leagues Setup spec). */
  readonly isDependency: boolean;
  /** The depth this Competition would report if it were chosen directly rather than pulled
   *  in as a dependency. Undefined when the Competition is chosen outright, or when the
   *  Competition is not selectable at a deeper tier at all. Kept alongside `depth` so a
   *  row that must change its Nation's scope to change depth shows both. */
  readonly editableDepth?: SimulationDepth;
}

/**
 * What `projectActiveLeagues` returns: the row model plus the validity outcomes the domain
 * owns. Failures are checked values, not throws — an unknown league or an empty scope is a
 * validation result the screen renders, never a defect.
 */
export interface ActiveLeaguesProjection {
  readonly rows: readonly ActiveLeaguesRow[];
  readonly duplicateLeagueIds: readonly string[];
  readonly hasAtLeastOneActiveLeague: boolean;
  readonly valid: boolean;
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

/**
 * Derive the active-leagues projection from a resolved selection. This is the domain layer's
 * view of "what competitions is the career actually carrying and at what depth?" — one row per
 * active Competition, each with its own simulation depth at the three-tier grain (full /
 * standard / results-only).
 *
 * - A dependency-capped Competition (pulled in because another selection requires it) is
 *   always reported at `standard` depth and is not depth-editable.
 * - A Competition chosen outright reports its effective depth based on the owning Nation's
 *   mode + scope option.
 * - Duplicate league selections are prevented at the domain level; the returned
 *   `duplicateLeagueIds` array identifies any ids that appear more than once across rows,
 *   and the projection remains valid — callers should render the first occurrence and
 *   ignore the duplicate, or present a warning.
 * - An empty scope (zero active leagues across all Nations) sets `valid: false` and adds
 *   a blocking issue rather than throwing. The screen renders this as a validation result,
 *   not a defect.
 */
export const projectActiveLeagues = (
  index: LeagueSetupIndex,
  resolved: ResolvedSelection,
): ActiveLeaguesProjection => {
  const competitions = competitionIndex(index);
  const nations = nationIndex(index);
  const scopeOptions = scopeOptionIndex(index);

  const rows: ActiveLeaguesRow[] = [];
  const seenCompetitionIds = new Set<string>();
  const duplicateLeagueIds: string[] = [];

  for (const selection of resolved.selections) {
    const nation = nations.get(selection.nationId);
    if (nation === undefined) continue;

    let scopeDescription: string;
    if (selection.scopeOptionId !== undefined) {
      const option = scopeOptions.get(selection.scopeOptionId);
      scopeDescription = option && option.nationId === nation.id
        ? option.displayName
        : `${nation.name}`;
    } else {
      scopeDescription = nation.name;
    }

    const competitionIds = [
      ...selection.playableCompetitionIds,
      ...selection.backgroundCompetitionIds,
      ...selection.viewOnlyCompetitionIds,
      ...selection.dependencyCompetitionIds,
    ];

    for (const compId of competitionIds) {
      const node = competitions.get(compId);
      if (node === undefined) continue;

      if (seenCompetitionIds.has(compId)) {
        if (!duplicateLeagueIds.includes(compId)) {
          duplicateLeagueIds.push(compId);
        }
        continue;
      }
      seenCompetitionIds.add(compId);

      const depRecord = resolved.dependencies.find(
        (d) => d.competitionId === compId,
      );
      const isDependency = depRecord !== undefined && !depRecord.chosenDirectly;

      let depth: SimulationDepth;
      if (isDependency) {
        depth = "standard";
      } else {
        depth = depthFromMode(selection.mode);
      }

      const row: ActiveLeaguesRow = {
        competitionId: compId,
        leagueId: compId,
        leagueName: catalogueName(compId),
        nationId: nation.id,
        nationName: nation.name,
        scopeDescription,
        depth,
        isDependency,
      };
      if (!isDependency) {
        rows.push({ ...row, editableDepth: depth });
      } else {
        rows.push(row);
      }
    }
  }

  const hasAtLeastOneActiveLeague = rows.length > 0;
  const issues: SelectionIssue[] = [...resolved.issues];

  if (!hasAtLeastOneActiveLeague) {
    issues.push(
      issue(
        "no_active_leagues",
        "blocking",
        "Select at least one active league to continue.",
      ),
    );
  }

  const valid = hasAtLeastOneActiveLeague && duplicateLeagueIds.length === 0;

  return {
    rows,
    duplicateLeagueIds,
    hasAtLeastOneActiveLeague,
    valid,
    issues,
  };
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
