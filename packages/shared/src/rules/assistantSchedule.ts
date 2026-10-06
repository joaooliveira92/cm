/**
 * The Assistant Manager's Best Practice rule (training-schedule-and-delegation 05): what a
 * delegated Training Schedule becomes before each Fixture. One uniform, deterministic rule for every
 * assistant in the world; the assistant has no quality, so which club you take does not change how
 * well your assistant plans. See
 * `.agents/notes/proposed/architecture/2026-09-28-assistant-delegation-stays-a-presence-rule.md`.
 *
 * It picks from the named templates and never picks Heavy: an automatic plan must not run the squad
 * down on the manager's behalf.
 */
import type { TrainingTemplateName } from "./trainingSchedule.js";

/** Below this mean stored Condition the squad is treated as tired and gets a Recovery week. */
export const BEST_PRACTICE_TIRED_BELOW = 85;

/** A following Fixture within this many days of the next one makes the run congested. */
export const CONGESTION_DAYS = 4;

/** At or below this many days to the next Fixture, the gap is short and the week is preparation. */
export const SHORT_GAP_DAYS = 3;

export interface BestPracticeInput {
  /** Days from today to the club's next Fixture, or `null` when none is left this Season. */
  readonly daysToNextFixture: number | null;
  /** Days from that Fixture to the one after it, or `null` when there is no following one. */
  readonly daysFromNextToFollowing: number | null;
  /** The squad's mean stored Condition, 0 to 100. */
  readonly meanCondition: number;
}

export interface BestPracticeChoice {
  readonly template: Exclude<TrainingTemplateName, "heavy">;
  /** One sentence the News Message and the schedule screen give as the reason. */
  readonly reason: string;
}

export const bestPracticeSchedule = (input: BestPracticeInput): BestPracticeChoice => {
  if (input.meanCondition < BEST_PRACTICE_TIRED_BELOW) {
    return { template: "recovery", reason: "the squad has not recovered from the last match" };
  }
  if (input.daysFromNextToFollowing !== null && input.daysFromNextToFollowing <= CONGESTION_DAYS) {
    return { template: "recovery", reason: `another match follows within ${CONGESTION_DAYS} days` };
  }
  if (input.daysToNextFixture !== null && input.daysToNextFixture <= SHORT_GAP_DAYS) {
    return { template: "matchPreparation", reason: "the next match is only a few days away" };
  }
  return { template: "balanced", reason: "there is a normal gap before the next match" };
};
