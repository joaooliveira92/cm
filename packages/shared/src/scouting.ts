/**
 * Scouting: what a club knows about a player, and what that knowledge is worth.
 *
 * **Progress is the only value stored.** Attribute Range, the fogged Transfer Value range, and every
 * narrowed bound are pure functions of progress and the true stored value, computed here and held
 * nowhere. Storing a range would be a third copy of information already held twice, free to drift
 * from both — the same rule that keeps player ratings derived and Results Strength derived, applied
 * one level further out.
 */

/** Progress at which a player is Fully Scouted and every range collapses to the true value. */
export const FULLY_SCOUTED = 100;

/**
 * Points of progress a scout accrues per calendar advance while assigned.
 *
 * Linear, never tapering: a tapering curve never cleanly reaches 100 without an arbitrary snap, and
 * Fully Scouted has to be a clean terminal state rather than an asymptote.
 *
 * **Strictly positive across the whole 1-20 quality domain.** A poor scout is slow, never futile —
 * an assignment that could never reach Fully Scouted would be a trap rather than a trade-off, and
 * the manager has no way to know they had made it until a season had gone by.
 */
const ACCRUAL_AT_WORST = 2;
const ACCRUAL_AT_BEST = 8;

export const scoutingAccrual = (scoutQuality: number): number => {
  const clamped = Math.min(20, Math.max(1, scoutQuality));
  return Math.round(
    ACCRUAL_AT_WORST + ((clamped - 1) / 19) * (ACCRUAL_AT_BEST - ACCRUAL_AT_WORST),
  );
};

/** Progress after one advance under `scoutQuality`, never decreasing and never past 100. */
export const nextProgress = (progress: number, scoutQuality: number): number =>
  Math.min(FULLY_SCOUTED, progress + scoutingAccrual(scoutQuality));

/** How wide a fully-unscouted attribute's band is, in Position Rating points either side. */
const MAX_BAND = 20;

/**
 * The range a scouted attribute is shown as: `[low, high]`, narrowing linearly to the true value.
 *
 * Derived on every read and stored nowhere. At progress 0 the band is at its widest; at 100 it
 * collapses, so a Fully Scouted player shows exact numbers rather than a range one point wide.
 */
export const attributeRange = (
  trueValue: number,
  progress: number,
  scale: readonly [number, number] = [1, 100],
): readonly [number, number] => {
  const band = (MAX_BAND * (FULLY_SCOUTED - Math.min(FULLY_SCOUTED, Math.max(0, progress)))) / 100;
  const [floor, ceiling] = scale;
  return [
    Math.max(floor, Math.round(trueValue - band)),
    Math.min(ceiling, Math.round(trueValue + band)),
  ];
};
