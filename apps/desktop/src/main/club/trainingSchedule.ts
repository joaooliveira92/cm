/**
 * The human club's team training schedule (training-schedule-and-delegation 03 and 05): read it,
 * save it against the revision the caller read, hand it to the Assistant Manager, and let the
 * assistant plan each microcycle while delegated. Every write — the manager's, the delegation
 * toggle, and the assistant's — goes through the same shape: raise the revision by one, replace the
 * sessions, and append a `TrainingScheduleSet` event naming who wrote it.
 *
 * The manager's writes carry `changeTactics`'s guard: a per-save permit, a request-id replay check,
 * and a revision check, in one transaction. The assistant's write runs inside the Calendar's own
 * transaction when the human's Matchday is committed, so it needs no guard of its own.
 *
 * See `.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md`,
 * `.agents/notes/proposed/architecture/2026-09-28-assistant-delegation-stays-a-presence-rule.md` and
 * `.agents/notes/proposed/feature/2026-09-28-turning-delegation-on-is-the-consent.md`.
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
  TRAINING_SCHEDULE_TEMPLATES,
  bestPracticeSchedule,
  scheduleRecoveryModifier,
  trainingTemplateOf,
  type TrainingIntensity,
  type TrainingSession,
  type TrainingSessionType,
} from "@cm-clone/shared";
import { conditionAfterDays } from "@cm-clone/game-engine";
import { Effect, Semaphore } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadAssistantName } from "../career/staff.js";
import { loadGameDate, loadSeasonRow } from "../season/currentSeason.js";
import { displayNames } from "../world/displayNames.js";
import { loadUserClub } from "./squad.js";

const CLUB_STREAM = "club";
const DAY_MS = 86_400_000;

/**
 * One permit per save around a manager write, for the reason `tactics.ts` gives for its own: two
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

/** The club's saved sessions, revision and delegation flag; a club that never saved reads as
 *  Balanced at revision 0, planned by the manager. */
const loadSchedule = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ revision: number; delegated: number }>`
      SELECT revision, delegated FROM training_schedules WHERE club_id = ${clubId}`;
    const row = rows[0];
    if (row === undefined) return { sessions: DEFAULT_TRAINING_SCHEDULE, revision: 0, delegated: false };
    const sessionRows = yield* sql<{ type: TrainingSessionType; intensity: TrainingIntensity }>`
      SELECT session_type as "type", intensity FROM training_schedule_sessions
      WHERE club_id = ${clubId} ORDER BY slot_index`;
    return {
      sessions: sessionRows as ReadonlyArray<TrainingSession>,
      revision: row.revision,
      delegated: row.delegated === 1,
    };
  });

/** The club's next two unplayed Fixtures this Season, soonest first: the end of the microcycle
 *  being planned, and the one after it, which is what makes a run congested. */
const loadUpcomingFixtures = (clubId: ClubId) =>
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
       ORDER BY scheduled_date, id LIMIT 2`;
    const nameOf = yield* displayNames;
    return rows.map((row) => {
      const isHome = row.homeClubId === clubId;
      return new TrainingScheduleFixtureView({
        fixtureId: row.id,
        date: row.date,
        opponentClubName: nameOf(isHome ? row.awayClubId : row.homeClubId),
        isHome,
      });
    });
  });

/** Why the assistant chose the current sessions: the reason on the club's latest schedule event,
 *  when the assistant wrote it. */
const loadAssistantReason = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ payload: string }>`
      SELECT payload FROM events
      WHERE stream_type = ${CLUB_STREAM} AND stream_id = ${clubId} AND tag = 'TrainingScheduleSet'
      ORDER BY seq DESC LIMIT 1`;
    const payload = rows[0] === undefined ? null : (JSON.parse(rows[0].payload) as { author?: string; reason?: string });
    return payload?.author === "assistant" ? (payload.reason ?? null) : null;
  });

const readScheduleView = (clubId: ClubId) =>
  Effect.gen(function* () {
    const { sessions, revision, delegated } = yield* loadSchedule(clubId);
    const [nextFixture] = yield* loadUpcomingFixtures(clubId);
    const modifier = scheduleRecoveryModifier(sessions);

    // Compute each player's projected Condition at the next Fixture.
    const sql = yield* SqlClient;
    const fitnessRows = yield* sql<{
      playerId: string;
      firstName: string;
      lastName: string;
      condition: number;
      naturalFitness: number;
      lastInjurySeverity: string;
    }>`SELECT pf.player_id as "playerId", p.first_name as "firstName", p.last_name as "lastName",
              pf.condition, p.natural_fitness as "naturalFitness",
              pf.last_injury_severity as "lastInjurySeverity"
       FROM player_fitness pf
       JOIN players p ON p.id = pf.player_id
       WHERE p.club_id = ${clubId} AND pf.season_number = (SELECT season_number FROM season LIMIT 1)
       ORDER BY p.last_name, p.first_name`;

    const projectedConditions = fitnessRows.map((row) => {
      const base = conditionAfterDays(
        row.condition,
        7,
        row.naturalFitness,
        row.lastInjurySeverity as "none" | "light" | "medium" | "severe",
      );
      const rawGain = base - row.condition;
      return {
        firstName: row.firstName,
        lastName: row.lastName,
        projectedCondition: Math.min(100, Math.max(0, Math.round(row.condition + rawGain * modifier))),
      };
    });

    return new TrainingScheduleView({
      sessions,
      template: trainingTemplateOf(sessions),
      revision,
      nextFixture: nextFixture ?? null,
      delegated,
      assistantName: yield* loadAssistantName(clubId),
      assistantReason: delegated ? yield* loadAssistantReason(clubId) : null,
      projectedConditions,
    });
  });

/** Replace the club's sessions and flag at `revision`. Assumes a `SqlClient` in context. */
const writeSchedule = (
  clubId: ClubId,
  sessions: ReadonlyArray<TrainingSession>,
  revision: number,
  delegated: boolean,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const flag = delegated ? 1 : 0;
    yield* sql`DELETE FROM training_schedule_sessions WHERE club_id = ${clubId}`;
    yield* sql`INSERT INTO training_schedules (club_id, revision, delegated) VALUES (${clubId}, ${revision}, ${flag})
               ON CONFLICT(club_id) DO UPDATE SET revision = excluded.revision, delegated = excluded.delegated`;
    yield* sql`INSERT INTO training_schedule_sessions ${sql.insert(
      sessions.map((session, slotIndex) => ({
        club_id: clubId,
        slot_index: slotIndex,
        session_type: session.type,
        intensity: session.intensity,
      })),
    )}`;
  });

const appendScheduleEvent = (clubId: ClubId, payload: Record<string, unknown>) =>
  Effect.gen(function* () {
    const { seasonNumber } = yield* loadSeasonRow;
    const seq = yield* nextStreamSeq(CLUB_STREAM, clubId);
    yield* appendStreamEvents(CLUB_STREAM, clubId, seq, [
      { tag: "TrainingScheduleSet", payload: { seasonNumber, ...payload } },
    ]);
  });

const daysBetween = (from: string, to: string): number => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

/**
 * The assistant's plan for the coming microcycle, by the Best Practice rule, written at `revision`
 * with delegation left on, and reported as an assistant-authored event the News Inbox words.
 * Assumes a `SqlClient` in context.
 */
const writeAssistantPlan = (clubId: ClubId, revision: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const { seasonNumber } = yield* loadSeasonRow;
    const today = yield* loadGameDate;
    const [next, following] = yield* loadUpcomingFixtures(clubId);
    const conditionRows = yield* sql<{ meanCondition: number | null }>`
      SELECT AVG(COALESCE(pf.condition, 100)) as "meanCondition"
      FROM players p
      LEFT JOIN player_fitness pf ON pf.player_id = p.id AND pf.season_number = ${seasonNumber}
      WHERE p.club_id = ${clubId}`;

    const choice = bestPracticeSchedule({
      daysToNextFixture: next === undefined ? null : daysBetween(today, next.date),
      daysFromNextToFollowing:
        next === undefined || following === undefined ? null : daysBetween(next.date, following.date),
      meanCondition: conditionRows[0]?.meanCondition ?? 100,
    });
    const sessions = TRAINING_SCHEDULE_TEMPLATES[choice.template];
    yield* writeSchedule(clubId, sessions, revision, true);
    yield* appendScheduleEvent(clubId, {
      author: "assistant",
      sessions,
      template: choice.template,
      assistantName: yield* loadAssistantName(clubId),
      reason: choice.reason,
      opponentClubName: next?.opponentClubName ?? null,
    });
  });

/**
 * The assistant's turn, called from the human's Matchday commit once the Calendar has stepped: if
 * the schedule is delegated, plan the next microcycle before the next Pre-match Boundary; otherwise
 * do nothing. Runs in the commit's own transaction. Assumes a `SqlClient` in context.
 */
export const planDelegatedSchedule = (clubId: ClubId) =>
  Effect.gen(function* () {
    const { revision, delegated } = yield* loadSchedule(clubId);
    if (!delegated) return;
    yield* writeAssistantPlan(clubId, revision + 1);
  });

export const getTrainingSchedule = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      return yield* readScheduleView(club.id);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/**
 * The guard every manager write shares: per-save permit, archived check, one transaction, a replay
 * of an accepted `requestId` answered with the current state, and a stale `expectedRevision`
 * refused with `TrainingScheduleRevisionConflictError`. `write` runs only past all of that, with
 * the club and the next revision, and logs nothing itself.
 */
const guardedWrite = <E>(
  savesDir: string,
  saveId: SaveId,
  expectedRevision: number,
  requestId: WriteRequestId,
  write: (clubId: ClubId, revision: number) => Effect.Effect<void, E, SqlClient>,
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

            yield* write(club.id, currentRevision + 1);
            yield* sql`INSERT INTO training_schedule_write_requests (club_id, request_id)
                       VALUES (${club.id}, ${requestId})`;
            return yield* readScheduleView(club.id);
          }),
        );
      }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
    ),
  );

/**
 * The manager's schedule save. It also takes the schedule back from the assistant: a manager edit is
 * never something the assistant may overwrite, so writing one turns delegation off.
 */
export const changeTrainingSchedule = (
  savesDir: string,
  saveId: SaveId,
  sessions: ReadonlyArray<TrainingSession>,
  expectedRevision: number,
  requestId: WriteRequestId,
) =>
  guardedWrite(savesDir, saveId, expectedRevision, requestId, (clubId, revision) =>
    Effect.gen(function* () {
      if (sessions.length !== TRAINING_SCHEDULE_SLOTS) {
        return yield* new InvalidTrainingScheduleError({
          reason: `a schedule has ${TRAINING_SCHEDULE_SLOTS} sessions, got ${sessions.length}`,
        });
      }
      yield* writeSchedule(clubId, sessions, revision, false);
      yield* appendScheduleEvent(clubId, { author: "manager", sessions, template: trainingTemplateOf(sessions) });
    }),
  );

/**
 * Hand the schedule to the Assistant Manager, or take it back. Turning delegation on is the
 * manager's standing consent, so the assistant plans the current microcycle at once rather than
 * leaving the manager's sessions under the assistant's name until the next Matchday. Taking it back
 * keeps the assistant's sessions as the manager's starting point.
 */
export const setTrainingScheduleDelegation = (
  savesDir: string,
  saveId: SaveId,
  delegated: boolean,
  expectedRevision: number,
  requestId: WriteRequestId,
) =>
  guardedWrite(savesDir, saveId, expectedRevision, requestId, (clubId, revision) =>
    Effect.gen(function* () {
      if (delegated) return yield* writeAssistantPlan(clubId, revision);
      const { sessions } = yield* loadSchedule(clubId);
      yield* writeSchedule(clubId, sessions, revision, false);
    }),
  );
