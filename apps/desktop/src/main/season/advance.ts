import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  AdvanceCalendarResult,
  SeasonCompleteError,
  type SaveId,
} from "@cm-clone/contracts";
import {
  nextCalendarBoundary,
  withinMidSeasonWindow,
  type ManagerOutcome,
  type Verdict,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "./decider.js";
import { assertSaveNotArchived, releaseClubStaff } from "../career/managerStatus.js";
import { loadUserClub } from "../club/squad.js";
import { readGenerationManifest } from "../world/worldGeneration.js";
import { loadSeasonRow, toSeasonView, type SeasonPhase } from "./currentSeason.js";
import { withAdvanceLock } from "./advanceLock.js";
import { stepCalendarTo } from "./resolveThrough.js";
import { materialiseCupRounds } from "./cups.js";
import { STREAM_TYPE } from "./start.js";
import { resolveDueFixtures, humanFixtureOn, loadCalendarHorizon } from "./resolveFixtures.js";
import { applyFitnessRecovery } from "./applyFitnessRecovery.js";
import { advanceScouting } from "./advanceScouting.js";
import { processAiTransferWindow, computeWindowClose } from "./processAIWindows.js";

/**
 * Lapse every Bid the human club never answered.
 *
 * Runs at the *start* of an advance, which is what encodes the rule "a pending Bid gets exactly one
 * Continue to be answered": a Bid placed by the AI transfer window later in this same advance is
 * inserted after this statement and therefore survives it, and is still pending at the start of the
 * next one only if the manager left it alone.
 *
 * Only human-club Bids can be pending at all (the AI resolves every other seller inline), so this
 * needs no seller predicate. Lapsing is deliberately not the same as rejecting: `expired` says
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
        return yield* sql.withTransaction(runAdvance(saveId));
      }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
    ),
  );

const runAdvance = (saveId: SaveId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const row = yield* loadSeasonRow;

    if (row.phase === "season_complete") {
      return yield* new SeasonCompleteError({ saveId });
    }

    yield* assertSaveNotArchived(saveId);

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
      return yield* new SeasonCompleteError({ saveId });
    }

    const phaseAt = (date: string): SeasonPhase =>
      withinMidSeasonWindow(horizon.windows, date) ? "mid_window_open" : "in_season";

    if (boundary.type === "windowOpen") {
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
      yield* processAiTransferWindow(row.seasonNumber, boundary.date);
    } else {
      const closed = computeWindowClose(row, boundary.date, horizon.windows);
      if (closed !== null) {
        streamEvents.push({
          tag: "TransferWindowClosed",
          payload: { window: closed, date: boundary.date },
        });
        transferWindowClosed = closed;
        if (closed === "pre_season") {
          yield* processAiTransferWindow(row.seasonNumber, row.currentDate);
        }
      }

      yield* materialiseCupRounds(row.seasonNumber, manifest.worldSeed, manifest.referenceYear);
      const humanFixture = yield* humanFixtureOn(boundary.date);

      if (humanFixture !== null) {
        yield* applyFitnessRecovery(humanFixture, row.seasonNumber, boundary.date, phaseAt);
      } else {
        const results = yield* resolveDueFixtures(boundary.date);
        streamEvents.push({
          tag: "MatchdayResolved",
          payload: { date: boundary.date, resolved: results.length },
        });
        resolvedDate = boundary.date;

        yield* advanceScouting;

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

export const retireManager = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);

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