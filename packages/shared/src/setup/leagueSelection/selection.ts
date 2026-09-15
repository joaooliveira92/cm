/**
 * Intent, dependency closure, and the effective selection (§12, §19, §34).
 *
 * Split out of `leagueSelection.ts`. Holds the two models the screen keeps apart: the user's
 * **intents** and the **effective selection** they resolve to once dependencies are closed over.
 */

import {
  competitionIndex,
  MODE_RANK,
  nationIndex,
  scopeOptionIndex,
  strongerMode,
  type CompetitionNode,
  type LeagueSetupIndex,
  type SimulationMode,
} from "../leagueSetup.js";
import { issue, type SelectionIssue } from "./issues.js";

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
