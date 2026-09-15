/**
 * A player's recovery status on the Workload and Recovery screen (Screen 112) — the display form of
 * the Rest/Active indicator main derives from Condition, plus a detail line from the fitness ledger.
 * Recomputed on every render and never persisted.
 *
 * v1 is a rest/active indicator, not a training-load model. The detail line names the last injury's
 * Severity this Season, because recovery between Fixtures is keyed to it (a light injury recovers
 * faster than a severe one). The ledger keeps that Severity until the next Season starts, so the
 * line states it as a fact about the Season rather than claiming a recovery is still under way.
 */
import type { WorkloadPlayerView } from "@cm-clone/contracts";

export type LastInjurySeverity = WorkloadPlayerView["lastInjurySeverity"];

export type RecoveryIndicator = WorkloadPlayerView["recovery"];

export interface RecoveryStatus {
  /** The indicator's display word. */
  readonly label: "Rest" | "Active";
  /** The last injury's Severity this Season, which recovery between Fixtures is keyed to. */
  readonly detail: string;
}

export const FULL_CONDITION = 100;

/**
 * Condition as a displayable whole percentage. Floored rather than rounded, so the number shown
 * never crosses the Rest/Active line the indicator was derived from (a stored 74.6 shows 74%, not
 * 75%, beside Rest). Out-of-range values are clamped, and a non-finite one reads as 0.
 */
export const displayCondition = (condition: number): number =>
  Number.isFinite(condition) ? Math.floor(Math.min(FULL_CONDITION, Math.max(0, condition))) : 0;

/** The display form of a player's recovery indicator and last injury Severity. */
export const recoveryStatus = (
  recovery: RecoveryIndicator,
  lastInjurySeverity: LastInjurySeverity,
): RecoveryStatus => ({
  label: recovery === "rest" ? "Rest" : "Active",
  detail:
    lastInjurySeverity === "none"
      ? "No injury this Season"
      : `Last injury this Season: ${lastInjurySeverity}`,
});
