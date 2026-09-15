import type { SeasonWindows } from "./calendar.js";

/**
 * The calendar's boundary vocabulary and the pure rule that picks the next one.
 *
 * Split out of `apps/desktop/src/main/season.ts`, where it was exported only so tests could reach
 * it. It touches no database and no Effect runtime -- given where the calendar stands and what is
 * ahead of it, it is a total function -- so it belongs beside `calendar.ts`, which already owns
 * `leagueRoundDates`, `seasonWindows` and `withinMidSeasonWindow`.
 */

export type CalendarBoundary =
  | { readonly type: "windowOpen"; readonly date: string }
  | { readonly type: "matchDate"; readonly date: string }
  | { readonly type: "seasonEnd"; readonly date: string }
  | { readonly type: "seasonComplete" };

/** What the calendar can see ahead of it, all of it read from fixture rows rather than stored. */
export interface CalendarHorizon {
  readonly currentDate: string;
  /** The earliest date after `currentDate` carrying an unplayed fixture of a playable competition,
   *  or `null` when the human has no football left this season. */
  readonly nextPlayableDate: string | null;
  /** The latest unplayed fixture date anywhere in the world, cup final included, or `null` once
   *  every fixture of the season has resolved. */
  readonly finalUnplayedDate: string | null;
  readonly windows: SeasonWindows;
}

/**
 * Pure: given where the calendar stands and what is ahead of it, where does the next Continue land?
 *
 * The advance stops only where a **playable** competition has a fixture. Stopping at every date with
 * a fixture anywhere would halt the human because a background third division played on a Tuesday;
 * stopping only where the human's own club plays would skip past a date on which a rival's result
 * moved the table they are about to read.
 *
 * Landing on a date with no fixture at all is not a failure — it is what the mid-season window's
 * open looks like, and it is why the pre-season exists.
 */
export const nextCalendarBoundary = (horizon: CalendarHorizon): CalendarBoundary => {
  if (horizon.finalUnplayedDate === null) return { type: "seasonComplete" };

  // The window's open is a boundary the way a fixture date is, which is what gives the human a
  // moment to act inside it. Once the calendar has reached it the guard cannot fire again, so the
  // window opens exactly once per season.
  const { midSeasonOpen } = horizon.windows;
  if (
    horizon.currentDate < midSeasonOpen &&
    (horizon.nextPlayableDate === null || midSeasonOpen <= horizon.nextPlayableDate)
  ) {
    return { type: "windowOpen", date: midSeasonOpen };
  }

  if (horizon.nextPlayableDate !== null) return { type: "matchDate", date: horizon.nextPlayableDate };

  // No playable football left, but the world still has fixtures — a cup final, or a background
  // league running past the human's last round. The season ends at the last of them rather than at
  // a tidy invented end date.
  return { type: "seasonEnd", date: horizon.finalUnplayedDate };
};
