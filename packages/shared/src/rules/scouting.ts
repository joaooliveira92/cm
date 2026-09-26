import { transferValue } from "./ratings.js";
import { weeklyWage } from "./transfers.js";

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

/**
 * A figure the market publishes about a player the club has not fully scouted: the exact value, or
 * the Attribute Range the manager's Scouting Progress narrows. Never both: a range and an exact
 * number in the same cell would ask the reader to disbelieve one of them. The tag decides the shape
 * — there is no `exact` boolean a caller could set to claim a range is really exact. See CONTEXT.md,
 * Attribute Range / Fully Scouted, and the Agent Note 2026-09-19 (knowledge limits every player read).
 */
export type KnownFigure =
  | { readonly _tag: "exact"; readonly value: number }
  | { readonly _tag: "range"; readonly low: number; readonly high: number };

/** Reached at the terminal state (Scouting Progress at 100): every figure collapses from a Range to
 *  the exact value, identical to the manager's own-squad view (CONTEXT.md, Fully Scouted). */
const isFullyScouted = (progress: number): boolean =>
  Math.min(FULLY_SCOUTED, Math.max(0, progress)) >= FULLY_SCOUTED;

/** The figure for one true value at one Scouting Progress: exact once Fully Scouted, otherwise the
 *  most specific Range progress allows. Derived on every read and stored nowhere, exactly like
 *  `attributeRange`. */
export const figureByProgress = (
  trueValue: number,
  progress: number,
  scale: readonly [number, number] = [1, 100],
): KnownFigure => {
  if (isFullyScouted(progress)) return { _tag: "exact", value: trueValue };
  const [low, high] = attributeRange(trueValue, progress, scale);
  return { _tag: "range", low, high };
};

/**
 * The Scouting Progress one Player read should gate on: the manager's own club reads its Players at
 * full knowledge whatever the ledger says, and every other Player reads by the progress recorded
 * for him — 0 when there is no row, the widest honest Range.
 *
 * The one home for that question. `readPlayerProfile`, the transfer market and the Contract Offer
 * each resolve it here, so no screen can widen a player's knowledge by picking its own branch
 * (Agent Note 2026-09-19 — knowledge limits every player read).
 */
export const progressForReading = (
  playerClubId: string | null,
  readingClubId: string,
  progress: number,
): number => (playerClubId === readingClubId ? FULLY_SCOUTED : progress);

/**
 * The Transfer Value a below-Fully-Scouted market read shows: the Overall Rating's Attribute Range
 * run through `transferValue`, not a percentage off the true value. `transferValue` is monotone
 * non-decreasing in Overall Rating across the whole Rating / age / Potential-Ability domain, so the
 * Rating band's low end prices the low end of the Value band and the width narrows with it. The
 * value is derived on every read, never persisted.
 */
export const transferValueFigureByProgress = (
  overall: number,
  age: number,
  potentialAbility: number,
  progress: number,
): KnownFigure => {
  if (isFullyScouted(progress)) {
    return { _tag: "exact", value: transferValue(overall, age, potentialAbility) };
  }
  const [lowRating, highRating] = attributeRange(overall, progress);
  return {
    _tag: "range",
    low: transferValue(lowRating, age, potentialAbility),
    high: transferValue(highRating, age, potentialAbility),
  };
};

/**
 * The weekly wage a below-Fully-Scouted read shows, built exactly like
 * `transferValueFigureByProgress` above and for the same reason: the wage is a *derived* price, so
 * the Rating band's ends price the ends of the wage band. Running a fixed band off the true wage
 * instead would publish a figure the Rating band does not support — an unscouted OVR of 50–90
 * cannot justify quoting a wage to the Credit.
 *
 * Monotone in Overall Rating (`weeklyWage` rises across the Rating domain), so the low end of the
 * Rating band prices the low end of the wage band and the width narrows as progress narrows it.
 * Derived on every read, never persisted — the Contract the manager signs stores the wage they
 * offered, not this band.
 */
export const wageFigureByProgress = (
  overall: number,
  age: number,
  potentialAbility: number,
  progress: number,
): KnownFigure => {
  if (isFullyScouted(progress)) {
    return { _tag: "exact", value: weeklyWage(overall, age, potentialAbility) };
  }
  const [lowRating, highRating] = attributeRange(overall, progress);
  return {
    _tag: "range",
    low: weeklyWage(lowRating, age, potentialAbility),
    high: weeklyWage(highRating, age, potentialAbility),
  };
};

/**
 * Whether an offered weekly wage falls inside what this player's knowledge supports.
 *
 * The one home for the rule, read by both ends: the Command that signs a Free Agent refuses an
 * offer outside it, and the terms form disables its submit while the typed wage sits outside it. A
 * Fully Scouted player supports exactly one wage, so the offer must name it; below that the manager
 * may name any whole number of Credits inside the band their own Scouting Progress published — the
 * knowledge, never what the player would accept, is what bounds the term.
 */
export const wageIsWithinFigure = (wage: number, figure: KnownFigure): boolean =>
  Number.isInteger(wage) &&
  wage > 0 &&
  (figure._tag === "exact"
    ? wage === figure.value
    : wage >= figure.low && wage <= figure.high);

/**
 * Team Scout Report vocabulary.
 *
 * A report has an **observed half and a predicted half**, and the two bands below sit either side of
 * that seam. `KnowledgeConfidence` grades the observed half — how much of the target squad has been
 * scouted at all — and is never a claim about correctness, because an observation cannot be wrong,
 * only partial. `ReportFreshness` grades how far the reading has fallen behind the club it
 * describes. The two are independent: a report can be thorough and stale, or fresh and mostly gaps,
 * so neither can be derived from the other. See CONTEXT.md's Scouting section.
 */

/** How much of the target squad the report actually rests on, worst to best. Ordered, so a band's
 *  index is comparable — the derivation relies on that to keep confidence monotonic in progress. */
export const KNOWLEDGE_CONFIDENCES = ["low", "moderate", "high", "complete"] as const;
export type KnowledgeConfidence = (typeof KNOWLEDGE_CONFIDENCES)[number];

/** How far the reading has fallen behind, best to worst. Ordered for the same reason. */
export const REPORT_FRESHNESSES = ["current", "recent", "aging", "stale"] as const;
export type ReportFreshness = (typeof REPORT_FRESHNESSES)[number];

/**
 * The part of a club a finding speaks about. A closed set rather than free text so the screen can
 * group findings without parsing prose, and so a finding can never name a part of the game the
 * report has no knowledge of.
 */
export const FINDING_AREAS = ["attack", "midfield", "defense", "setPieces"] as const;
export type FindingArea = (typeof FINDING_AREAS)[number];
