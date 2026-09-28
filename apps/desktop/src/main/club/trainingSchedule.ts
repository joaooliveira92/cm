/**
 * The human club's team training schedule (training-schedule-and-delegation 03): read it, and save
 * it against the revision the caller read. The write guard is `changeTactics`'s, applied to a
 * different aggregate — a per-save permit, a request-id replay check, a revision check, then the
 * write and its `TrainingScheduleSet` event in one transaction.
 *
 * The schedule is stored and shown here and does nothing else yet; how it moves Condition is
 * ticket 04. See `.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md`.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  InvalidTrainingScheduleError,
  TrainingScheduleFixtureView,
  TrainingScheduleRevisionConflictError,
  TrainingScheduleView,
  type ClubId,
  type FixtureId,
  type SaveId,
  type WriteRequestId,
} from "@cm-clone/contracts";
import {
  DEFAULT_TRAINING_SCHEDULE,
  TRAINING_SCHEDULE_SLOTS,
  trainingTemplateOf,
  type TrainingIntensity,
  type TrainingSession,
  type TrainingSessionType,
} from "@cm-clone/shared";
import { Effect, Semaphore } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadSeasonRow } from "../season/currentSeason.js";
import { displayNames } from "../world/displayNames.js";
import { loadUserClub } from "./squad.js";

const CLUB_STREAM = "club";

/**
 * One permit per save around a schedule write, for the reason `tactics.ts` gives for its own: two
 * deferred SQLite transactions could otherwise both read the same revision and both commit, and the
 * second would clobber the first instead of surfacing the typed conflict.
 */
const scheduleSaveLocks = new Map<SaveId, Semaphore.Semaphore>();
const withScheduleSavePermit = <A, E, R>(saveId: SaveId, effect: Effect.Effect<A, E, R>) => {
  let lock = scheduleSaveLocks.get(saveId);
  if (lock === undefined) {
    lock = Semaphore.makeUnsafe(1);
    scheduleSaveLocks.set(saveId, lock);
  }
  return lock.withPermits(1)(effect);
};

/** The club's saved sessions and revision; a club that never saved reads as Balanced at 0. */
const loadSchedule = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const revisionRows = yield* sql<{ revision: number }>`
      SELECT revision FROM training_schedules WHERE club_id = ${clubId}`;
    const revision = revisionRows[0]?.revision;
    if (revision === undefined) return { sessions: DEFAULT_TRAINING_SCHEDULE, revision: 0 };
    const sessionRows = yield* sql<{ type: TrainingSessionType; intensity: TrainingIntensity }>`
      SELECT session_type as "type", intensity FROM training_schedule_sessions
      WHERE club_id = ${clubId} ORDER BY slot_index`;
    return { sessions: sessionRows as ReadonlyArray<TrainingSession>, revision };
  });

/** The club's next unplayed Fixture this Season — where the microcycle being planned ends. */
const loadNextFixture = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const { seasonNumber } = yield* loadSeasonRow;
    const rows = yield* sql<{
      id: FixtureId;
      date: string;
      homeClubId: ClubId;
      awayClubId: ClubId;
    }>`SELECT id, scheduled_date as "date", home_club_id as "homeClubId", away_club_id as "awayClubId"
       FROM fixtures
       WHERE played = 0 AND season_number = ${seasonNumber}
         AND (home_club_id = ${clubId} OR away_club_id = ${clubId})
       ORDER BY scheduled_date, id LIMIT 1`;
    const row = rows[0];
    if (row === undefined) return null;
    const nameOf = yield* displayNames;
    const isHome = row.homeClubId === clubId;
    return new TrainingScheduleFixtureView({
      fixtureId: row.id,
      date: row.date,
      opponentClubName: nameOf(isHome ? row.awayClubId : row.homeClubId),
      isHome,
    });
  });

const readScheduleView = (clubId: ClubId) =>
  Effect.gen(function* () {
    const { sessions, revision } = yield* loadSchedule(clubId);
    const nextFixture = yield* loadNextFixture(clubId);
    return new TrainingScheduleView({
      sessions,
      template: trainingTemplateOf(sessions),
      revision,
      nextFixture,
    });
  });

export const getTrainingSchedule = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      return yield* readScheduleView(club.id);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/**
 * The revision-bound, idempotent schedule save:
 *
 * - a replay of an already-accepted `requestId` is a no-op success returning the current state,
 *   checked before the revision and before validation, so a retry after a lost response never
 *   double-applies or conflicts;
 * - a stale `expectedRevision` fails with `TrainingScheduleRevisionConflictError` naming the current
 *   revision, and changes nothing;
 * - otherwise the sessions are replaced, the revision raised by exactly one, and a
 *   `TrainingScheduleSet` event naming the manager appended to the club's stream.
 */
export const changeTrainingSchedule = (
  savesDir: string,
  saveId: SaveId,
  sessions: ReadonlyArray<TrainingSession>,
  expectedRevision: number,
  requestId: WriteRequestId,
) =>
  withScheduleSavePermit(
    saveId,
    withExistingSave(savesDir, saveId, (filename) =>
      Effect.gen(function* () {
        yield* assertSaveNotArchived(saveId);
        const sql = yield* SqlClient;

        return yield* sql.withTransaction(
          Effect.gen(function* () {
            const club = yield* loadUserClub;
            const { revision: currentRevision } = yield* loadSchedule(club.id);

            const replayed = yield* sql<{ found: number }>`
              SELECT 1 as found FROM training_schedule_write_requests
              WHERE club_id = ${club.id} AND request_id = ${requestId}`;
            if (replayed.length > 0) return yield* readScheduleView(club.id);

            if (currentRevision !== expectedRevision) {
              return yield* new TrainingScheduleRevisionConflictError({ saveId, currentRevision });
            }
            if (sessions.length !== TRAINING_SCHEDULE_SLOTS) {
              return yield* new InvalidTrainingScheduleError({
                reason: `a schedule has ${TRAINING_SCHEDULE_SLOTS} sessions, got ${sessions.length}`,
              });
            }

            const revision = currentRevision + 1;
            yield* sql`DELETE FROM training_schedule_sessions WHERE club_id = ${club.id}`;
            yield* sql`INSERT INTO training_schedules (club_id, revision) VALUES (${club.id}, ${revision})
                       ON CONFLICT(club_id) DO UPDATE SET revision = excluded.revision`;
            yield* sql`INSERT INTO training_schedule_sessions ${sql.insert(
              sessions.map((session, slotIndex) => ({
                club_id: club.id,
                slot_index: slotIndex,
                session_type: session.type,
                intensity: session.intensity,
              })),
            )}`;
            yield* sql`INSERT INTO training_schedule_write_requests (club_id, request_id)
                       VALUES (${club.id}, ${requestId})`;

            const { seasonNumber } = yield* loadSeasonRow;
            const seq = yield* nextStreamSeq(CLUB_STREAM, club.id);
            yield* appendStreamEvents(CLUB_STREAM, club.id, seq, [
              {
                tag: "TrainingScheduleSet",
                payload: {
                  seasonNumber,
                  author: "manager",
                  sessions,
                  template: trainingTemplateOf(sessions),
                },
              },
            ]);

            return yield* readScheduleView(club.id);
          }),
        );
      }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
    ),
  );
