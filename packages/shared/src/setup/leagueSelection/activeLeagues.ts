/**
 * The active-leagues projection (§12).
 *
 * Split out of `leagueSelection.ts`. Turns a resolved selection into the row model the Active
 * Leagues screen renders, one row per active Competition with its effective simulation depth.
 */

import {
  competitionIndex,
  nationIndex,
  scopeOptionIndex,
  type LeagueSetupIndex,
} from "../leagueSetup.js";
import { catalogueName } from "../../content/contentPack.js";
import { depthFromMode, type SimulationDepth } from "../simulation.js";
import { issue, type SelectionIssue } from "./issues.js";
import type { ResolvedSelection } from "./selection.js";

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
