/**
 * `CommitMatchday`: the career accepting the human's result.
 *
 * The simulation reaching full time and the career accepting that result are two different facts,
 * and this module exists to keep them different. `resumeSimulation` is polled on a timer and is
 * read-shaped; if one poll happening to observe the final whistle were what committed the Matchday,
 * durable career state would depend on polling cadence, component lifecycle, timer behaviour, IPC
 * retries, and whether the player is still looking at the screen.
 *
 * So committing is an explicit command, keyed on the Fixture. It validates first, then writes the
 * human result, the rest of that Matchday, every Condition write-back, the resolution event and the
 * Calendar's step as one transaction. A rollback leaves the boundary intact and the Matchday
 * incomplete, so retrying is safe; a repeat after success writes nothing at all.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  CommitMatchdayResult,
  FixtureNotPendingError,
  MatchNotCompleteError,
  MatchNotFoundError,
  MatchNotStartedError,
  type ClubId,
  type FixtureId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { withinMidSeasonWindow, seasonStartYear, seasonWindows } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { accrueScoutingProgress } from "../club/scouting.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { MATCH_STREAM_TYPE, deriveMatchEvents } from "../match/stream.js";
import { readGenerationManifest } from "../world/worldGeneration.js";
import { withAdvanceLock } from "./advanceLock.js";
import { loadSeasonRow, type SeasonPhase } from "./currentSeason.js";
import { appendStreamEvents, loadStreamEvents, nextStreamSeq, withExistingSave } from "./decider.js";
import { recordMatchdayConditions, resolveOtherFixturesOn } from "./matchday.js";
import { stepCalendarTo } from "./resolveThrough.js";
import { STREAM_TYPE } from "./start.js";

/** The pending fixture's own row, as the commit needs to see it. */
interface PendingFixtureRow {
  readonly id: FixtureId;
  readonly date: string;
  readonly homeClubId: ClubId;
  readonly awayClubId: ClubId;
  readonly seasonNumber: number;
  readonly played: number;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
}

const loadFixtureRow = (fixtureId: FixtureId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<PendingFixtureRow>`
      SELECT id, scheduled_date as "date", home_club_id as "homeClubId",
             away_club_id as "awayClubId", season_number as "seasonNumber", played,
             home_goals as "homeGoals", away_goals as "awayGoals"
      FROM fixtures WHERE id = ${fixtureId}`;
    return rows[0];
  });

/**
 * Commits the Matchday the Calendar is standing at.
 *
 * Held under the same per-Save lock as the advance, because the two do the same kind of work to the
 * same rows and a commit interleaved with an advance would be exactly the half-applied Matchday the
 * boundary exists to prevent.
 */
export const commitMatchday = (savesDir: string, saveId: SaveId, fixtureId: FixtureId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    withAdvanceLock(saveId)(
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        return yield* sql.withTransaction(runCommit(saveId, fixtureId));
      }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
    ),
  );

/** The commit itself, inside the caller's transaction. Assumes a `SqlClient` in context. */
const runCommit = (saveId: SaveId, fixtureId: FixtureId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* assertSaveNotArchived(saveId);

    const fixture = yield* loadFixtureRow(fixtureId);
    if (fixture === undefined) return yield* new FixtureNotPendingError({ fixtureId });

    // Idempotency keys on the Fixture already being played, which is the one fact that cannot be
    // true twice. Checked before the boundary, because a successful commit clears the boundary —
    // so a retry of a call that already succeeded arrives with nothing pending and must still be
    // answered with the committed result rather than a refusal.
    if (fixture.played !== 0) {
      return new CommitMatchdayResult({
        fixtureId,
        alreadyCommitted: true,
        homeClubId: fixture.homeClubId,
        awayClubId: fixture.awayClubId,
        homeGoals: fixture.homeGoals ?? 0,
        awayGoals: fixture.awayGoals ?? 0,
        otherFixturesResolved: 0,
        seasonConcluded: false,
      });
    }

    const season = yield* loadSeasonRow;
    if (season.awaitingFixtureId !== fixtureId) {
      return yield* new FixtureNotPendingError({ fixtureId });
    }
    const matchId = season.awaitingMatchId;
    if (matchId === null) return yield* new MatchNotStartedError({ fixtureId });

    const stream = yield* loadStreamEvents(MATCH_STREAM_TYPE, matchId);
    if (stream.length === 0) return yield* new MatchNotFoundError({ matchId });

    // The human result is *derived from the persisted stream*, never re-simulated from scratch:
    // re-running would discard the command journal the player built during the match and could
    // produce a different score from the one they watched.
    const derived = yield* Effect.sync(() => deriveMatchEvents(stream));
    const fullTime = derived.events.find((event) => event._tag === "FullTimeWhistle");
    if (fullTime === undefined || fullTime._tag !== "FullTimeWhistle") {
      return yield* new MatchNotCompleteError({ matchId });
    }

    const injuries = new Map<PlayerId, "none" | "light" | "medium" | "severe">();
    for (const event of derived.events) {
      if (event._tag === "Injury") injuries.set(event.playerId, event.severity);
    }

    yield* sql`UPDATE fixtures SET home_goals = ${fullTime.homeScore}, away_goals = ${fullTime.awayScore},
        home_penalties = NULL, away_penalties = NULL, played = 1
      WHERE id = ${fixtureId}`;
    yield* recordMatchdayConditions(fixture.seasonNumber, derived.conditions, injuries);

    // The rest of the Matchday, in the same transaction as the human's own result. The League table
    // is never allowed to show a Matchday the player has played and the division has not, or the
    // reverse — `computeStandings` would faithfully report either as an inconsistent `played`
    // column.
    const others = yield* resolveOtherFixturesOn(fixture.date, fixtureId);

    const manifest = yield* readGenerationManifest;
    const windows = seasonWindows(seasonStartYear(manifest.referenceYear, season.seasonNumber));
    const phaseAt = (date: string): SeasonPhase =>
      withinMidSeasonWindow(windows, date) ? "mid_window_open" : "in_season";

    const streamEvents: Array<{ readonly tag: string; readonly payload: unknown }> = [
      { tag: "MatchdayResolved", payload: { date: fixture.date, resolved: others + 1 } },
    ];

    // Scouts watch while the calendar moves, and this commit is the step the Calendar takes for
    // this Matchday — so accrual happens here rather than on the advance that stopped at it.
    yield* accrueScoutingProgress;

    // Clear the boundary before the Calendar steps: `stepCalendarTo` may conclude the Season and
    // roll the world over, and a next season inheriting a pending fixture from the last one is a
    // state nothing downstream is written for.
    yield* sql`UPDATE season SET awaiting_fixture_id = NULL, awaiting_match_id = NULL
      WHERE season_number = ${season.seasonNumber}`;

    const conclusion = yield* stepCalendarTo(
      fixture.date,
      season.seasonNumber,
      manifest,
      phaseAt,
      streamEvents,
    );

    const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
    yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, streamEvents);

    return new CommitMatchdayResult({
      fixtureId,
      alreadyCommitted: false,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: fullTime.homeScore,
      awayGoals: fullTime.awayScore,
      otherFixturesResolved: others,
      seasonConcluded: conclusion.seasonConcluded,
    });
  });
