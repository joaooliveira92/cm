/**
 * Selection issues and the submission gate (§16, §17).
 *
 * Split out of `leagueSelection.ts`. Every issue the resolver, the projection and the estimate
 * raise is one of these codes; `canContinue` is the §5.5 gate the screen's Continue button reads.
 */

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

/** Internal constructor shared by the resolver, the projection and the gate. Not part of the
 *  module's public surface: `careerScopeEstimate` deliberately keeps its own local mirror. */
export const issue = (
  code: IssueCode,
  level: IssueLevel,
  message: string,
  nationId: string | null = null,
  competitionIds: readonly string[] = [],
): SelectionIssue => ({ code, level, message, nationId, competitionIds });

export const blockingIssues = (issues: readonly SelectionIssue[]): readonly SelectionIssue[] =>
  issues.filter((entry) => entry.level === "blocking");

export const warningIssues = (issues: readonly SelectionIssue[]): readonly SelectionIssue[] =>
  issues.filter((entry) => entry.level === "warning");

/** §5.5. `Continue` is live only when nothing blocks. Warnings do not block; they gate on an
 *  acknowledgement the caller tracks. */
export const canContinue = (issues: readonly SelectionIssue[]): boolean =>
  blockingIssues(issues).length === 0;
