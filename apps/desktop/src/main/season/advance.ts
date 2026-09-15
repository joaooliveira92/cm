import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  AdvanceCalendarResult,
  SeasonCompleteError,
  type ClubId,
  type FixtureId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  nextCalendarBoundary,
  seasonStartYear,
  seasonWindows,
  withinMidSeasonWindow,
  type ManagerOutcome,
  type CalendarHorizon,
  type Verdict,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { runAiTransferWindow } from "../club/aiClubs.js";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "./decider.js";
import { assertSaveNotArchived, releaseClubStaff } from "../career/managerStatus.js";
import { accrueScoutingProgress } from "../club/scouting.js";
import { loadUserClub } from "../club/squad.js";
import { readGenerationManifest } from "../world/worldGeneration.js";
import { loadSeasonRow, toSeasonView, type SeasonPhase, type SeasonRow } from "./currentSeason.js";
import { withAdvanceLock } from "./advanceLock.js";
import { stepCalendarTo } from "./resolveThrough.js";
import { cupRoundsOutstanding, materialiseCupRounds, nextCupRoundDate } from "./cups.js";
import { type FixtureResult, resolveFixtureScore } from "./matchday.js";
import { PLAYABLE_DEPTH, STREAM_TYPE } from "./start.js";

/**
 * Resolves every unplayed fixture in the world dated on or before `throughDate`.
 *
 * World-wide rather than per-competition: a background division whose fixtures went unresolved
 * would leave its league table stale, so background fixtures must resolve as their dates pass. What
 * Depth decides is how often the human is *stopped*, never how often matches run.
 *
 * The returned results cover playable competitions only. Reporting every resolved fixture would put
 * thousands of rows into one IPC payload per Continue, and nothing on the other side reads a
 * background result.
 */
const resolveDueFixtures = (throughDate: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    // The fixture's match seed derives from the world seed (ticket 01). Read once per advance —
    // the value is stored and replayable, so this is not a fresh-entropy draw.
    const manifest = yield* readGenerationManifest;
    const results: Array<FixtureResult> = [];

    // Draw, resolve, draw again. One Continue can jump past two cup dates, and the second round's
    // participants are not known until the first has been played — so materialising once up front
    // would silently skip a round rather than play it.
    for (;;) {
      const seasonNumber = (yield* loadSeasonRow).seasonNumber;
      yield* materialiseCupRounds(seasonNumber, manifest.worldSeed, manifest.referenceYear);

      const fixtureRows = yield* sql<{
        id: FixtureId;
        homeClubId: ClubId;
        awayClubId: ClubId;
        seasonNumber: number;
        competitionId: string;
        round: number;
        depth: string;
        kind: string;
      }>`SELECT f.id, f.home_club_id as "homeClubId", f.away_club_id as "awayClubId",
                f.season_number as "seasonNumber", f.competition_id as "competitionId", f.round,
                c.depth, c.kind
         FROM fixtures f
         JOIN competitions c ON c.id = f.competition_id
         WHERE f.played = 0 AND f.scheduled_date <= ${throughDate}
         ORDER BY f.scheduled_date ASC, f.id ASC`;
      if (fixtureRows.length === 0) return results;

      for (const fixture of fixtureRows) {
        const score = yield* resolveFixtureScore(
          fixture.homeClubId,
          fixture.awayClubId,
          fixture.seasonNumber,
          fixture.competitionId,
          fixture.round,
          manifest.worldSeed,
          fixture.kind === "cup",
        );
        yield* sql`UPDATE fixtures SET home_goals = ${score.homeGoals}, away_goals = ${score.awayGoals},
            home_penalties = ${score.homePenalties}, away_penalties = ${score.awayPenalties}, played = 1
          WHERE id = ${fixture.id}`;
        if (fixture.depth === PLAYABLE_DEPTH) {
          results.push({
            fixtureId: fixture.id,
            homeClubId: fixture.homeClubId,
            awayClubId: fixture.awayClubId,
            homeGoals: score.homeGoals,
            awayGoals: score.awayGoals,
          });
        }
      }
    }
  });


/**
 * The human club's unplayed fixture on `date`, or `null` when the club is not playing.
 *
 * "Not playing" is an ordinary state once a world holds more than one playable competition: a date
 * carrying someone else's cup tie is a date the calendar passes through without stopping. What must
 * never happen is the opposite — the human's fixture resolving inside the sweep, which is where the
 * career's most important moment used to go.
 *
 * Assumes a `SqlClient` in context.
 */
const humanFixtureOn = (date: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ id: FixtureId }>`
      SELECT f.id FROM fixtures f
      JOIN clubs h ON h.id = f.home_club_id
      JOIN clubs a ON a.id = f.away_club_id
      WHERE f.played = 0 AND f.scheduled_date = ${date}
        AND (h.is_user_club = 1 OR a.is_user_club = 1)
      ORDER BY f.id ASC LIMIT 1`;
    return rows[0]?.id ?? null;
  });

/** Reads the horizon from the fixture rows themselves. Per-competition progress is never stored. */
const loadCalendarHorizon = (row: SeasonRow, referenceYear: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const playable = yield* sql<{ date: string | null }>`
      SELECT MIN(f.scheduled_date) as "date"
      FROM fixtures f JOIN competitions c ON c.id = f.competition_id
      WHERE f.played = 0 AND f.scheduled_date > ${row.currentDate} AND c.depth = ${PLAYABLE_DEPTH}`;
    const remaining = yield* sql<{ date: string | null }>`
      SELECT MAX(scheduled_date) as "date" FROM fixtures WHERE played = 0`;

    // A cup between rounds holds no unplayed fixture and is not finished. Its next round is drawn
    // inside the resolution loop, so the horizon has to admit that there is still football ahead of
    // it — otherwise the advance would conclude the season on the evening of a semi-final.
    const cupPending = yield* cupRoundsOutstanding(row.seasonNumber);
    const nextCupDate = cupPending ? yield* nextCupRoundDate(row, referenceYear) : null;
    const later = (a: string | null, b: string | null) =>
      a === null ? b : b === null ? a : a > b ? a : b;
    const earlier = (a: string | null, b: string | null) =>
      a === null ? b : b === null ? a : a < b ? a : b;

    return {
      currentDate: row.currentDate,
      nextPlayableDate: earlier(playable[0]?.date ?? null, nextCupDate),
      finalUnplayedDate: later(remaining[0]?.date ?? null, nextCupDate),
      windows: seasonWindows(seasonStartYear(referenceYear, row.seasonNumber)),
    } satisfies CalendarHorizon;
  });

/**
 * Lapse every Bid the human club never answered.
 *
 * Runs at the *start* of an advance, which is what encodes the rule "a pending Bid gets exactly one
 * Continue to be answered": a Bid placed by `runAiTransferWindow` later in this same advance is
 * inserted after this statement and therefore survives it, and is still pending at the start of the
 * next one only if the manager left it alone.
 *
 * That timing is the whole reason no `placed_at_matchday` column is needed — "was it here before
 * the player pressed Continue" is exactly what being pending at this point means.
 *
 * Only human-club Bids can be pending at all (`aiPlaceBid` resolves every other seller inline), so
 * this needs no seller predicate. Lapsing is deliberately not the same as rejecting: `expired` says
 * the manager never answered, which is what the News Inbox reports.
 */
export const expireStalePendingBids = Effect.gen(function* () {
  const sql = yield* SqlClient;
  yield* sql`UPDATE bids SET status = 'expired' WHERE status = 'pending'`;
});

export const advanceCalendar = (savesDir: string, saveId: SaveId) =>
  withAdvanceLock(saveId)(
    withExistingSave(savesDir, saveId, (filename) =>
      Effect.gen(function* () {
        const sql = yield* SqlClient;
        // Every write below commits together or not at all. The advance lapses Bids, resolves every
        // due Fixture in the world, moves the date, and at a Season's end freezes standings, judges
        // the board, develops every player and rolls the world over. A failure partway through
        // without this leaves a save whose date moved but whose season never concluded — a state no
        // reader is written for, and one the player cannot undo.
        return yield* sql.withTransaction(runAdvance(saveId));
      }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
    ),
  );

/** The advance itself, inside the caller's transaction. Assumes a `SqlClient` in context. */
const runAdvance = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const row = yield* loadSeasonRow;

    if (row.phase === "season_complete") {
      return yield* new SeasonCompleteError({ saveId });
    }

    yield* assertSaveNotArchived(saveId);

    // Already standing at the pre-match boundary. Mutate nothing at all — not the pending Bids
    // below, not the Transfer Window, not the date — and report where the career stands.
    //
    // This is what makes a repeated press structurally safe rather than safe by guard: the boundary
    // is a function of unresolved state, so pressing Continue again computes the same answer and
    // writes nothing. It sits above `expireStalePendingBids` deliberately — that is the first
    // statement that would otherwise consume a Bid the player never saw an advance for.
    if (row.awaitingFixtureId !== null) {
      return new AdvanceCalendarResult({
        season: yield* toSeasonView(row),
        resolvedDate: null,
        transferWindowClosed: null,
        transferWindowOpened: null,
        seasonConcluded: false,
        boardObjectiveVerdict: null,
        managerOutcome: "none",
      });
    }

    yield* expireStalePendingBids;

    const manifest = yield* readGenerationManifest;
    const horizon = yield* loadCalendarHorizon(row, manifest.referenceYear);
    const boundary = nextCalendarBoundary(horizon);
    const streamEvents: Array<{ readonly tag: string; readonly payload: unknown }> = [];
    let resolvedDate: string | null = null;
    let transferWindowClosed: "pre_season" | "mid_season" | null = null;
    let transferWindowOpened: "mid_season" | null = null;
    let seasonConcluded = false;
    let boardObjectiveVerdict: Verdict | null = null;
    let managerOutcome: ManagerOutcome = "none";

    if (boundary.type === "seasonComplete") {
      // Every fixture of the season has already resolved and the conclusion has run.
      return yield* new SeasonCompleteError({ saveId });
    }

    /** The phase the calendar stands in once it reaches `date`, derived from the window bounds
     *  rather than tracked separately, so phase has one writer and no memory of its own. */
    const phaseAt = (date: string): SeasonPhase =>
      withinMidSeasonWindow(horizon.windows, date) ? "mid_window_open" : "in_season";

    if (boundary.type === "windowOpen") {
      // The window's open is still a date the calendar passes through, so anything due on or
      // before it is played on the way. Usually there is nothing — but a competition the human is
      // never stopped for can have a date sitting behind this one, and walking past it would
      // strand a fixture the calendar has already gone by.
      const overdue = yield* resolveDueFixtures(boundary.date);
      if (overdue.length > 0) {
        streamEvents.push({
          tag: "MatchdayResolved",
          payload: { date: boundary.date, resolved: overdue.length },
        });
        resolvedDate = boundary.date;
      }
      yield* sql`UPDATE season SET game_date = ${boundary.date}, phase = 'mid_window_open' WHERE season_number = ${row.seasonNumber}`;
      streamEvents.push({
        tag: "TransferWindowOpened",
        payload: { window: "mid_season", date: boundary.date },
      });
      transferWindowOpened = "mid_season";
      // AI-club transfer activity (ticket 17 / ADR-0005) fires at the mid-season window's open —
      // this `windowOpen` boundary *is* that open. Self-issued in-process, never through the
      // RpcGroup.
      yield* runAiTransferWindow(row.seasonNumber);
    } else {

      // A window closes when the calendar moves out of it, which is a fact about the two dates
      // rather than about which fixture was played. The pre-season window has been open since the
      // season's opening date and closes the moment the football starts.
      if (row.phase === "pre_season") {
        streamEvents.push({
          tag: "TransferWindowClosed",
          payload: { window: "pre_season", date: boundary.date },
        });
        transferWindowClosed = "pre_season";
        // The pre-season window's open is the season's start rather than a boundary the advance
        // stops at, so its close is the first moment AI transfer activity has to hook into.
        yield* runAiTransferWindow(row.seasonNumber);
      } else if (
        row.phase === "mid_window_open" &&
        !withinMidSeasonWindow(horizon.windows, boundary.date)
      ) {
        streamEvents.push({
          tag: "TransferWindowClosed",
          payload: { window: "mid_season", date: boundary.date },
        });
        transferWindowClosed = "mid_season";
      }

      // Drawn before the boundary is inspected, not after: a cup round whose participants this
      // advance settles can put the human club's own tie on this very date, and a tie that does not
      // exist yet cannot be stopped for.
      yield* materialiseCupRounds(row.seasonNumber, manifest.worldSeed, manifest.referenceYear);
      const humanFixture = yield* humanFixtureOn(boundary.date);

      if (humanFixture !== null) {
        // The pre-match boundary. None of this Matchday resolves — not the human's fixture and not
        // the ones around it. Resolving the rest eagerly would leave the player at their own
        // kickoff looking at a table where everyone else had played a round they had not, and
        // Condition recovery is not idempotent, so the re-resolution that followed would recover
        // the same squads twice.
        //
        // The date does not move. "The calendar has not crossed it" is literal: the fixture is due,
        // the fixture is unplayed, and every fixture on or before `game_date` has still resolved —
        // the invariant every reader of the date already relies on.
        //
        // The Transfer Window transition above still stands. Its close is a fact about the two
        // dates rather than about which fixture was played, and the first Continue of a career is
        // meant to close the pre-season window and reach Matchday 1 in one press.
        yield* sql`UPDATE season SET phase = ${phaseAt(boundary.date)},
            awaiting_fixture_id = ${humanFixture}
          WHERE season_number = ${row.seasonNumber}`;
      } else {
        const results = yield* resolveDueFixtures(boundary.date);
        // The date and a count, never the results themselves. `fixtures` is authoritative for
        // every scoreline, so restating them here made one row on every Continue whose size grew
        // with the world — a measured ~1.2 MB at pyramid scale. This payload is the same size
        // whether one fixture resolved or four thousand did.
        streamEvents.push({
          tag: "MatchdayResolved",
          payload: { date: boundary.date, resolved: results.length },
        });
        resolvedDate = boundary.date;

        // Scouts watch while the calendar moves. Accrual is per advance rather than per fixture:
        // a scout is observing a player, not attending their club's matches.
        yield* accrueScoutingProgress;

        const conclusion = yield* stepCalendarTo(
          boundary.date,
          row.seasonNumber,
          manifest,
          phaseAt,
          streamEvents,
        );
        seasonConcluded = conclusion.seasonConcluded;
        boardObjectiveVerdict = conclusion.boardObjectiveVerdict;
        managerOutcome = conclusion.managerOutcome;
      }
    }

    const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
    yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, streamEvents);

    const updatedRow = yield* loadSeasonRow;
    return new AdvanceCalendarResult({
      season: yield* toSeasonView(updatedRow),
      resolvedDate,
      transferWindowClosed,
      transferWindowOpened,
      seasonConcluded,
      boardObjectiveVerdict,
      managerOutcome,
    });
  });

/**
 * `RetireManager` (ticket 02 / Screen 20) — the player deliberately ends their own career from the
 * Manager Profile screen. Appends `ManagerRetired` to the season stream and archives the save with
 * cause `"retired"`, in one transaction.
 *
 * Unlike `ManagerSacked`, which `judgeSeasonEnd` raises as an in-process reactor to
 * `SeasonConcluded`, this is the first player command to write the season stream directly. It can
 * fire at any Season phase: retiring is a decision about the career, not about the calendar.
 *
 * `last_outcome` is deliberately left alone. It records what the board decided, and overwriting it
 * would both mislabel a player action as a board judgment and destroy state — a manager sitting at
 * `warned` who retires keeps that warning, which is the truer record of how the career ended. The
 * Consecutive-Miss Counter is left alone for the same reason.
 *
 * Lives here rather than in `managerProfile.ts` (which owns the screen this is reached from) so
 * every `manager_status` write stays in one module, alongside `startSeason`'s insert and
 * `judgeSeasonEnd`'s update.
 */
export const retireManager = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);

      // The event and the projection must land together: an appended `ManagerRetired` with no
      // `archived_cause` leaves a save that logs a retirement and still accepts commands, and the
      // reverse leaves an archived save with nothing in the log explaining why.
      return yield* sql.withTransaction(
        Effect.gen(function* () {
          const row = yield* loadSeasonRow;
          const startSeq = yield* nextStreamSeq(STREAM_TYPE, saveId);
          yield* appendStreamEvents(STREAM_TYPE, saveId, startSeq, [
            { tag: "ManagerRetired", payload: { seasonNumber: row.seasonNumber } },
          ]);
          yield* sql`UPDATE manager_status SET archived_cause = 'retired' WHERE id = 1`;
          const userClub = yield* loadUserClub;
          yield* releaseClubStaff(userClub.id);
        }),
      );
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );
