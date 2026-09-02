import type { ClubSelectionRow } from "@cm-clone/contracts";
import { SQUAD_QUALITY_BANDS, STATURE_TIERS, type SquadQualityBand, type StatureTier } from "@cm-clone/shared";

/**
 * The pure reading of the club list the workspace renders. Everything here is a function of the
 * one `getClubSelection` payload — no second read, no UI-local content tables.
 */

/** What the panel says before a club is picked: the league's size and its shape. */
export interface LeagueSummary {
  readonly clubCount: number;
  readonly tiers: ReadonlyArray<{ readonly tier: StatureTier; readonly count: number }>;
}

export const leagueSummaryOf = (
  clubs: ReadonlyArray<ClubSelectionRow>,
): LeagueSummary => ({
  clubCount: clubs.length,
  tiers: STATURE_TIERS.map((tier) => ({
    tier,
    count: clubs.filter((club) => club.statureTier === tier).length,
  })),
});

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty",
] as const;

const ordinal = (position: number): string => {
  const remainderTen = position % 10;
  const remainderHundred = position % 100;
  if (remainderTen === 1 && remainderHundred !== 11) return `${position}st`;
  if (remainderTen === 2 && remainderHundred !== 12) return `${position}nd`;
  if (remainderTen === 3 && remainderHundred !== 13) return `${position}rd`;
  return `${position}th`;
};

/**
 * The Board Objective as prose, stated against the league's size rather than as a raw `min – max`
 * pair. The band itself comes from the shared `BOARD_OBJECTIVE_BANDS` table on the main-process
 * side and rides on the row; this only phrases it, and the phrasing is truthful about the band —
 * never "win the league or be sacked", which the sacking ladder does not support.
 */
export const expectationProse = (
  club: Pick<ClubSelectionRow, "boardObjectiveMin" | "boardObjectiveMax">,
  leagueSize: number,
): string => {
  const { boardObjectiveMin: min, boardObjectiveMax: max } = club;
  if (min <= 1) {
    const word = NUMBER_WORDS[max] ?? String(max);
    return `The board expects a top-${word} finish.`;
  }
  if (max >= leagueSize) {
    return `The board expects ${ordinal(min)} or below.`;
  }
  return `The board expects a finish between ${ordinal(min)} and ${ordinal(max)}.`;
};

/** How many of the meter's six segments a band fills. The meter is the ordinal position of the
 *  band in `SQUAD_QUALITY_BANDS`, so it retunes with the bands rather than duplicating them. */
export const QUALITY_SEGMENTS = SQUAD_QUALITY_BANDS.length;

export const filledSegments = (band: SquadQualityBand): number =>
  SQUAD_QUALITY_BANDS.indexOf(band) + 1;

/**
 * `Pick a team for me`: a uniform draw over the loaded clubs, excluding the one currently
 * selected so a press is always observable. Pure in its randomness source, which is what makes
 * exclusion and membership testable — the distribution is not the property under test.
 *
 * Returns `null` only when there is nothing to pick: an empty list, or a single club that is
 * already the selection.
 */
export const rollClub = (
  clubs: ReadonlyArray<ClubSelectionRow>,
  currentClubId: string | null,
  random: () => number,
): ClubSelectionRow | null => {
  const candidates = clubs.filter((club) => club.clubId !== currentClubId);
  if (candidates.length === 0) return null;
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index] ?? null;
};
