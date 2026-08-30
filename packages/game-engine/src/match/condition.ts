import type { PlayerId } from "@cm-clone/contracts";
/**
 * Per-player in-match Condition (%) model (ticket 02/04). Each on-pitch player's Condition starts
 * near 100 and decays each minute at a rate that rises with match work-rate — a low-Stamina player
 * and a high-Tempo game both drain it faster. Condition is the substrate the fatigue multiplier and
 * the non-contact injury trigger read from: below the threshold (~75%) the muscular/fatigue risk
 * climbs steeply as Condition falls.
 */

export const START_CONDITION = 100;
/** Below this Condition % the non-contact injury check begins rolling each minute (ticket 04). */
export const NON_CONTACT_CONDITION_THRESHOLD = 75;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Condition points lost by one player over one simulated minute. Stamina 1-20, tempo is the team's
 * Tempo instruction multiplier (slow/normal/fast). Tuned so a low-Stamina player drains toward the
 * ~75% risk threshold by late in a normal-tempo match, while a fitter player stays higher. */
export const conditionDecayPerMinute = (stamina: number, tempo: number): number => {
  const staminaFactor = clamp((21 - stamina) / 10, 0.3, 1.6);
  return 0.22 * staminaFactor * tempo;
};

/** A live per-team Condition ledger: playerId -> current Condition % (0-100). Players with a
 * carried-over `startingCondition` (ticket 09) start there, everyone else at `START_CONDITION`. */
export const newConditionLedger = (
  playerIds: ReadonlyArray<PlayerId>,
  players?: ReadonlyArray<{ readonly id: PlayerId; readonly startingCondition?: number }>,
): Map<PlayerId, number> => {
  const ledger = new Map<PlayerId, number>();
  const startingById = new Map((players ?? []).map((p) => [p.id, p.startingCondition]));
  for (const id of playerIds) ledger.set(id, clamp(startingById.get(id) ?? START_CONDITION, 0, START_CONDITION));
  return ledger;
};

/** Non-contact (fatigue) injury recovery between matches (ticket 09): fraction of the gap back to
 * 100% regained per day off, keyed to Natural Fitness and the most recent injury's severity — a
 * knock recovers faster than a severe. Pure so Season advance stays deterministic off the same seed
 * conventions as the rest of the engine. */
export const RECOVERY_RATE_PER_DAY: Record<"none" | "light" | "medium" | "severe", number> = {
  none: 0.08,
  light: 0.06,
  medium: 0.045,
  severe: 0.025,
};

const recoverFraction = (naturalFitness: number): number =>
  clamp(naturalFitness / 20, 0.3, 1.2);

export const conditionAfterDays = (
  current: number,
  days: number,
  naturalFitness: number,
  injurySeverity: "none" | "light" | "medium" | "severe",
): number => {
  const dailyGain = RECOVERY_RATE_PER_DAY[injurySeverity] * recoverFraction(naturalFitness);
  return clamp(current + dailyGain * days * (100 - current), 0, START_CONDITION);
};