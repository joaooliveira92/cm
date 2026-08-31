import type { StatureTier } from "./clubs.js";

/**
 * Board Objective vocabulary (ADR-0006 / ticket 06): a per-club League-position band, a sibling
 * output of Stature Tier alongside Transfer/Wage Budget (ADR-0005) — neither derives from the
 * other. Only the player's club is ever assigned a Board Objective and judged against it.
 */
export const VERDICTS = ["exceeded", "met", "missed"] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface BoardObjectiveBand {
  readonly minPosition: number;
  readonly maxPosition: number;
}

/**
 * Fixed Stature Tier -> Board Objective band table (ADR-0006: "exact bands left as tuning data").
 * A 20-club League: big clubs are expected top-half-and-better, small clubs are expected to avoid
 * the bottom, mid sits in between. Permanently fixed per tier for v1 (Stature Tier itself never
 * moves, ADR-0006).
 */
export const BOARD_OBJECTIVE_BANDS: Record<StatureTier, BoardObjectiveBand> = {
  big: { minPosition: 1, maxPosition: 6 },
  mid: { minPosition: 7, maxPosition: 14 },
  small: { minPosition: 15, maxPosition: 20 },
};

/** Compares a final League position to a Board Objective band (ADR-0006 Verdict rule). */
export const judgeBoardObjective = (finalPosition: number, band: BoardObjectiveBand): Verdict => {
  if (finalPosition < band.minPosition) return "exceeded";
  if (finalPosition > band.maxPosition) return "missed";
  return "met";
};

export const MANAGER_OUTCOMES = ["none", "warned", "sacked"] as const;
export type ManagerOutcome = (typeof MANAGER_OUTCOMES)[number];

/**
 * The two ways a career ends and the save becomes an Archived Save: the board sacked the manager,
 * or the manager retired. `null` (never a member here) means the save is still active. Distinct from
 * `ManagerOutcome`, which is the board's judgment and never records a player action.
 */
export const ARCHIVED_CAUSES = ["sacked", "retired"] as const;
export type ArchivedCause = (typeof ARCHIVED_CAUSES)[number];

/**
 * Consecutive-Miss Counter transition (ADR-0006): increments on Missed, resets on Exceeded/Met.
 * 0->1 warns (no mechanical effect), 1->2 sacks (save archived read-only). Pure so it's unit
 * testable independent of the DB, mirroring `nextCalendarBoundary` in season.ts.
 */
export const nextManagerOutcome = (
  verdict: Verdict,
  previousConsecutiveMisses: number,
): { readonly consecutiveMisses: number; readonly outcome: ManagerOutcome } => {
  if (verdict !== "missed") {
    return { consecutiveMisses: 0, outcome: "none" };
  }
  const consecutiveMisses = previousConsecutiveMisses + 1;
  if (consecutiveMisses >= 2) return { consecutiveMisses, outcome: "sacked" };
  return { consecutiveMisses, outcome: "warned" };
};
