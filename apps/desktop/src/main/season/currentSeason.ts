import {
  PendingFixtureIntegrityError,
  PendingFixtureView,
  SeasonView,
  type ClubId,
  type FixtureId,
  type MatchId,
  type SEASON_PHASES,
} from "@cm-clone/contracts";
import { loadMatchBlockers } from "../club/matchReadiness.js";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "../world/displayNames.js";

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
  /** The pre-match boundary: the human club's fixture the calendar has stopped before, or `null`. */
  readonly awaitingFixtureId: FixtureId | null;
  /** The started match stream for that fixture, or `null` before Play or Quick result is accepted. */
  readonly awaitingMatchId: MatchId | null;
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
    awaitingFixtureId: FixtureId | null;
    awaitingMatchId: MatchId | null;
  }>`SELECT season_number as "seasonNumber", game_date as "currentDate", phase,
            awaiting_fixture_id as "awaitingFixtureId", awaiting_match_id as "awaitingMatchId"
     FROM season ORDER BY season_number DESC LIMIT 1`;
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

/**
 * The pending fixture behind `season.awaiting_fixture_id`, or `null` when nothing is pending.
 *
 * The query carries the invariants a foreign key cannot: the fixture is unplayed, belongs to this
 * season, and includes the human club. A row that fails any of them is an integrity violation, and
 * it fails loudly here rather than being repaired by picking a different fixture or clearing the
 * boundary — a career that quietly plays the wrong match is worse than one that stops.
 *
 * Assumes a `SqlClient` in context.
 */
export const loadPendingFixture = (row: SeasonRow) =>
  Effect.gen(function* () {
    const fixtureId = row.awaitingFixtureId;
    if (fixtureId === null) {
      // A started match the season cannot locate a fixture for. There is no safe repair — clearing
      // the link would strand a stream that already froze a seed and both squads, and adopting some
      // other fixture would play the wrong match.
      if (row.awaitingMatchId !== null) {
        return yield* new PendingFixtureIntegrityError({
          fixtureId: null,
          reason: "a match is linked but no fixture is pending",
        });
      }
      return null;
    }

    const sql = yield* SqlClient;
    const rows = yield* sql<{
      id: FixtureId;
      date: string;
      competitionId: string;
      homeClubId: ClubId;
      awayClubId: ClubId;
      homeIsUser: number;
      awayIsUser: number;
      played: number;
      seasonNumber: number;
    }>`SELECT f.id, f.scheduled_date as "date", f.competition_id as "competitionId",
              f.home_club_id as "homeClubId", f.away_club_id as "awayClubId",
              f.played, f.season_number as "seasonNumber",
              h.is_user_club as "homeIsUser", a.is_user_club as "awayIsUser"
       FROM fixtures f
       JOIN clubs h ON h.id = f.home_club_id
       JOIN clubs a ON a.id = f.away_club_id
       WHERE f.id = ${fixtureId}`;

    const fixture = rows[0];
    if (fixture === undefined) {
      return yield* new PendingFixtureIntegrityError({ fixtureId, reason: "no such fixture" });
    }
    if (fixture.played !== 0) {
      return yield* new PendingFixtureIntegrityError({ fixtureId, reason: "already played" });
    }
    if (fixture.seasonNumber !== row.seasonNumber) {
      return yield* new PendingFixtureIntegrityError({ fixtureId, reason: "belongs to another season" });
    }
    const isHome = fixture.homeIsUser === 1;
    if (!isHome && fixture.awayIsUser !== 1) {
      return yield* new PendingFixtureIntegrityError({
        fixtureId,
        reason: "does not involve the human club",
      });
    }

    const nameOf = yield* displayNames;
    const opponentClubId = isHome ? fixture.awayClubId : fixture.homeClubId;
    const humanClubId = isHome ? fixture.homeClubId : fixture.awayClubId;
    // Advisory, and recomputed here on every read rather than stored: the player may set a Tactic a
    // second after seeing this, and a persisted readiness record would then be stale with nothing to
    // invalidate it. The authoritative evaluation happens inside `startMatch`.
    const blockers = yield* loadMatchBlockers(humanClubId);
    return new PendingFixtureView({
      fixtureId: fixture.id,
      date: fixture.date,
      competitionId: fixture.competitionId,
      opponentClubId,
      opponentClubName: nameOf(opponentClubId),
      isHome,
      matchId: row.awaitingMatchId,
      blockers,
    });
  });

/** The season as the renderer sees it, boundary included. Effectful because the boundary is a join:
 *  every surface that shows where the career stands needs it, so it rides the season view rather
 *  than being fetched separately by whichever screen remembered to. */
export const toSeasonView = (row: SeasonRow) =>
  Effect.gen(function* () {
    const awaitingFixture = yield* loadPendingFixture(row);
    return new SeasonView({
      seasonNumber: row.seasonNumber,
      currentDate: row.currentDate,
      phase: row.phase,
      awaitingFixture,
    });
  });

/** Transfer commands are legal only inside an open Transfer Window: the pre-season one, open from
 * the season's start date until the first fixture, or the mid-season one, open across its date
 * range. Both are read here as `season.phase` and nothing compares dates — the calendar advance is
 * the single writer of phase, which is what keeps one rule from becoming five readers of two
 * bounds. */
export const isWindowOpen = (phase: SeasonPhase) => phase === "pre_season" || phase === "mid_window_open";
