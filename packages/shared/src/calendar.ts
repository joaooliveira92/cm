/**
 * The season's slot template: where a Round's date comes from.
 *
 * A date is the world's unit of time, and a Round is a label local to one Competition. This module
 * is the function between them — `(season start year, competition kind, round) -> ISO date` — and
 * it is pure, so the same save inputs always yield the same calendar. See
 * `.agents/notes/proposed/architecture/2026-09-02-date-bearing-calendar.md`.
 *
 * One August-to-May shape serves every Nation. Real football does not work that way — Nordic and
 * Russian leagues run spring-to-autumn — and that fidelity cost is accepted deliberately, because
 * per-nation cycles would stop `SeasonConcluded` being one moment.
 *
 * Two rules shape the allocation, and both are load-bearing rather than cosmetic:
 *
 * - **Cups reserve their slots first.** A club plays in at most one domestic cup and at most one
 *   league, so reserving the cup's weekends before the leagues draw theirs is what makes "a club
 *   never plays twice on one date" true by construction rather than by a check afterwards.
 * - **Weekends before midweeks.** A league takes weekend slots while they last and only overflows
 *   into midweek ones when its round count needs them, so a 20-club league plays Saturdays and a
 *   24-club league picks up the midweeks the extra eight rounds need.
 *
 * Allocation **fails** — returns `null` — rather than double-booking when a competition's rounds
 * exceed the season's slots. The caller turns that into a typed failure; it is reachable from a
 * catalogue that describes more rounds than August-to-May holds, so it is a condition rather than
 * a defect.
 */

/** Weeks between a career's opening date and the first league round: the pre-season to stand in. */
export const PRE_SEASON_WEEKS = 4;

/** Rounds a cup's slot reservation always holds, whatever field any one save's cup draws. Eight
 *  rounds seat a 256-club field, well past anything the catalogue can imply, and reserving a fixed
 *  count keeps a cup's round dates independent of which sources a save happened to load. */
export const CUP_ROUND_CAPACITY = 8;

const DAY_MS = 86_400_000;

/** ISO `YYYY-MM-DD`, matching `players.date_of_birth`. Text sorts lexicographically, so the
 *  `WHERE scheduled_date <= ?` sweep the advance needs works with no conversion. */
export type IsoDate = string;

const toIso = (millis: number): IsoDate => new Date(millis).toISOString().slice(0, 10);

const utc = (year: number, month: number, day: number): number => Date.UTC(year, month, day);

/** Every occurrence of one weekday (0 = Sunday) between two instants, inclusive. */
const weekdaysBetween = (fromMillis: number, toMillis: number, weekday: number): number[] => {
  const first = new Date(fromMillis);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  const dates: number[] = [];
  for (let at = fromMillis + offset * DAY_MS; at <= toMillis; at += 7 * DAY_MS) dates.push(at);
  return dates;
};

const SATURDAY = 6;
const WEDNESDAY = 3;

/** August 1st of the starting year through May 31st of the next: the season's outer bounds. */
const seasonWindow = (seasonStartYear: number) => ({
  from: utc(seasonStartYear, 7, 1),
  to: utc(seasonStartYear + 1, 4, 31),
});

/**
 * `count` items drawn from `slots` as evenly as the list allows, always including the last one.
 *
 * Index arithmetic only, so the choice is a pure function of the two lengths — no seed, no
 * randomness, and the same answer for every competition of the same shape.
 */
const spread = <T,>(slots: readonly T[], count: number): T[] => {
  if (count <= 0) return [];
  if (count >= slots.length) return [...slots];
  return Array.from({ length: count }, (_, index) =>
    slots[Math.round(((index + 1) * (slots.length - 1)) / count)]!,
  );
};

/** The whole season's slot allocation, computed once per season. */
export interface SeasonSlots {
  /** The date a career or a new season opens on — `PRE_SEASON_WEEKS` before the first league round. */
  readonly seasonStartDate: IsoDate;
  /** Cup round dates, index = round - 1. Reserved before any league draws, so a cup date is never
   *  a league date. */
  readonly cupRoundDates: readonly IsoDate[];
  /** The weekends the cups left, earliest first. A league draws from these until they run out. */
  readonly leagueWeekendDates: readonly IsoDate[];
  /** The midweek slots, earliest first. Drawn from only when a league's rounds outrun the weekends. */
  readonly midweekDates: readonly IsoDate[];
}

/**
 * The season's slots, from the year it starts in.
 *
 * Weekend slots are Saturdays and midweek slots are Wednesdays, so the two sets are disjoint by
 * construction: no allocation can hand two competitions the same date by rounding.
 */
export const seasonSlots = (seasonStartYear: number): SeasonSlots => {
  const { from, to } = seasonWindow(seasonStartYear);
  const weekends = weekdaysBetween(from, to, SATURDAY);
  const midweeks = weekdaysBetween(from, to, WEDNESDAY);

  // Cups first, spread across the whole season with the final on the last weekend of May. Taking
  // the reservation from the weekends means a cup tie is always a weekend fixture, and leaves the
  // remaining weekends — still the large majority — to the leagues.
  const cupSlots = spread(weekends, CUP_ROUND_CAPACITY);
  const reserved = new Set(cupSlots);
  const leagueWeekends = weekends.filter((slot) => !reserved.has(slot));

  return {
    seasonStartDate: toIso(leagueWeekends[0]! - PRE_SEASON_WEEKS * 7 * DAY_MS),
    cupRoundDates: cupSlots.map((slot) => toIso(slot)),
    leagueWeekendDates: leagueWeekends.map((slot) => toIso(slot)),
    midweekDates: midweeks.map((slot) => toIso(slot)),
  };
};

/**
 * The dates a league of `rounds` rounds plays on, index = round - 1, or `null` when the season has
 * no room for that many rounds.
 *
 * Weekends come before midweeks in *allocation*, not in the returned order: a league short enough
 * to fit the weekends alone never touches a midweek, and one that overflows still gets its rounds
 * in date order, so round `n` is always on or before round `n + 1`.
 */
export const leagueRoundDates = (
  seasonStartYear: number,
  rounds: number,
): readonly IsoDate[] | null => {
  const slots = seasonSlots(seasonStartYear);
  if (rounds <= 0) return [];
  if (rounds <= slots.leagueWeekendDates.length) return slots.leagueWeekendDates.slice(0, rounds);

  const overflow = rounds - slots.leagueWeekendDates.length;
  if (overflow > slots.midweekDates.length) return null;
  return [...slots.leagueWeekendDates, ...spread(slots.midweekDates, overflow)].sort((a, b) =>
    a.localeCompare(b),
  );
};

/** The date a cup's round `round` is played on, or `null` past the reserved capacity. */
export const cupRoundDate = (seasonStartYear: number, round: number): IsoDate | null =>
  seasonSlots(seasonStartYear).cupRoundDates[round - 1] ?? null;

/** The year a season starts in: season 1 opens in the save's reference year. */
export const seasonStartYear = (referenceYear: number, seasonNumber: number): number =>
  referenceYear + seasonNumber - 1;

/** The date a season opens on — the pre-season the human stands in before round 1. */
export const seasonStartDate = (referenceYear: number, seasonNumber: number): IsoDate =>
  seasonSlots(seasonStartYear(referenceYear, seasonNumber)).seasonStartDate;

// ---------------------------------------------------------------------------
// Transfer Windows
// ---------------------------------------------------------------------------

/**
 * The two Transfer Windows, as dates rather than as Matchday arithmetic.
 *
 * One pair globally, which follows from one season shape serving every nation: with a single
 * August-to-May calendar there is nothing for a per-nation window to be relative to.
 *
 * Legality is still read through `season.phase`, not by comparing the current date against these
 * bounds at each call site. Five transfer commands ask "is a window open"; comparing dates in each
 * would make five readers of one rule. The calendar advance stays the single writer of phase and
 * these bounds are its input, so the transfer commands are untouched by the move to dates.
 */
export interface SeasonWindows {
  /** The pre-season window runs from the season's opening date until the first fixture is played,
   *  so it closes on the day the football starts rather than on a date of its own. */
  readonly preSeasonOpen: IsoDate;
  /** The mid-season window opens on this date: the advance stops here the way it stops at a
   *  fixture date, which is what gives the human a moment to act inside it. */
  readonly midSeasonOpen: IsoDate;
  /** The first date the mid-season window is shut again — exclusive, so a fixture on this date is
   *  played with the window closed. */
  readonly midSeasonClose: IsoDate;
}

/** January 1st to February 1st of the season's second calendar year. */
export const seasonWindows = (seasonStartYear: number): SeasonWindows => ({
  preSeasonOpen: seasonSlots(seasonStartYear).seasonStartDate,
  midSeasonOpen: toIso(utc(seasonStartYear + 1, 0, 1)),
  midSeasonClose: toIso(utc(seasonStartYear + 1, 1, 1)),
});

/** Whether a date falls inside the mid-season window's range. */
export const withinMidSeasonWindow = (windows: SeasonWindows, date: IsoDate): boolean =>
  date >= windows.midSeasonOpen && date < windows.midSeasonClose;

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * An ISO date as the game says it: `1 Aug 2026`.
 *
 * Formatted here rather than through `Intl` so a date reads identically wherever it is shown and in
 * whatever locale the machine runs — the calendar is world state, not a machine setting, and two
 * screens disagreeing about how to say one date would read as two different dates.
 */
export const formatCalendarDate = (date: IsoDate): string => {
  const [year, month, day] = date.split("-");
  if (year === undefined || month === undefined || day === undefined) return date;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
};
