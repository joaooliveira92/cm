import { SeasonView, type SEASON_PHASES } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/**
 * "The save's current season" — one home for a row every command and read path needs.
 *
 * The save has exactly one season table, and the current season is its highest `season_number`.
 * That sentence used to be re-spelled in seven places (two copies of this block, three loose
 * `ORDER BY season_number DESC LIMIT 1` reads, and two `(SELECT MAX(season_number) ...)`
 * sub-selects), which is one definition too many for a fact the rollover moves.
 */

export type SeasonPhase = (typeof SEASON_PHASES)[number];

export interface SeasonRow {
  readonly seasonNumber: number;
  readonly currentDate: string;
  readonly phase: SeasonPhase;
}

/** The current season's number as SQL text, for the two read paths that need it *inside* a larger
 * query (a join predicate, a fixture filter) rather than as a value they could bind. */
export const CURRENT_SEASON_NUMBER_SQL = "(SELECT MAX(season_number) FROM season)";

/** The current season row, or `undefined` before a season exists — a world can be generated and a
 * career begun before `startSeason` writes the first row. Assumes a `SqlClient` in context. */
export const loadCurrentSeasonRow = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    seasonNumber: number;
    currentDate: string;
    phase: SeasonPhase;
  }>`SELECT season_number as "seasonNumber", game_date as "currentDate", phase FROM season
     ORDER BY season_number DESC LIMIT 1`;
  return rows[0];
});

/** The current season row for the callers that only ever run inside a started season — every
 * command handler behind `withExistingSave`. Use `loadCurrentSeasonRow` where the absence of a
 * season is a state the caller can actually reach. */
export const loadSeasonRow = loadCurrentSeasonRow.pipe(Effect.map((row) => row!));

/** Every season number the save has recorded, newest first. The head is the current season; the
 * length is the manager's tenure, which is the one caller that needs more than the head row. */
export const loadSeasonNumbersDesc = Effect.gen(function* () {
  const sql = yield* SqlClient;
  return yield* sql<{
    seasonNumber: number;
  }>`SELECT season_number as "seasonNumber" FROM season ORDER BY season_number DESC`;
});

export const toSeasonView = (row: SeasonRow) =>
  new SeasonView({ seasonNumber: row.seasonNumber, currentDate: row.currentDate, phase: row.phase });

/** Transfer commands are legal only inside an open Transfer Window: the pre-season one, open from
 * the season's start date until the first fixture, or the mid-season one, open across its date
 * range. Both are read here as `season.phase` and nothing compares dates — the calendar advance is
 * the single writer of phase, which is what keeps one rule from becoming five readers of two
 * bounds. */
export const isWindowOpen = (phase: SeasonPhase) => phase === "pre_season" || phase === "mid_window_open";
