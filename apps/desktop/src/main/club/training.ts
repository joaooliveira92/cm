import { access } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  AttributeChangeView,
  AttributesSchema,
  CoachAssignmentView,
  CoachingAssignmentsView,
  NotYourPlayerError,
  PlayerDevelopmentHistoryView,
  PlayerNotFoundError,
  SaveNotFoundError,
  SeasonDevelopmentView,
  TrainingFocusView,
  WorkloadPlayerView,
  WorkloadView,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { ALL_ATTRIBUTES, type Category } from "@cm-clone/shared";
import { NON_CONTACT_CONDITION_THRESHOLD } from "@cm-clone/game-engine";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadUserClub } from "./squad.js";
import { CURRENT_SEASON_NUMBER_SQL, loadSeasonRow } from "../season/currentSeason.js";

const CLUB_STREAM = "club";

/** `SetTrainingFocus` command handler (spec: `.scratch/training/spec.md`): a manager sets (or
 * clears, with `focus: null`) the one focused Category for a player on their own club. Changeable
 * at any point — no Transfer Window or season-boundary restriction. Persists the focus (upsert —
 * a missing row and a `NULL` row both mean no-focus) and appends a `TrainingFocusSet` event to the
 * club's stream in the same SQL transaction. */
export const setTrainingFocus = (savesDir: string, saveId: SaveId, playerId: PlayerId, focus: Category | null) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);

      const club = yield* loadUserClub;
      const playerRows = yield* sql<{ id: PlayerId }>`SELECT id FROM players WHERE id = ${playerId}`;
      if (playerRows.length === 0) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      const ownPlayerRows = yield* sql<{ id: PlayerId }>`SELECT id FROM players WHERE id = ${playerId} AND club_id = ${club.id}`;
      if (ownPlayerRows.length === 0) {
        return yield* new NotYourPlayerError({ playerId });
      }

      yield* sql`INSERT INTO training_focus (player_id, focus) VALUES (${playerId}, ${focus})
                 ON CONFLICT(player_id) DO UPDATE SET focus = excluded.focus`;

      const { seasonNumber } = yield* loadSeasonRow;

      const seq = yield* nextStreamSeq(CLUB_STREAM, club.id);
      yield* appendStreamEvents(CLUB_STREAM, club.id, seq, [
        { tag: "TrainingFocusSet", payload: { seasonNumber, playerId, focus } },
      ]);

      return new TrainingFocusView({ playerId, focus });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/**
 * The manager's own club's coaching staff, read from the `staff` DB table.
 *
 * Returns a `CoachingAssignmentsView` with the club's coaches and their quality ratings (1-20).
 * The department is always `"coaching"` for a coach (from `ROLE_DEPARTMENT` in `@cm-clone/shared`).
 * An empty list is valid — it means the save has no materialised staff for the user's club (e.g. a
 * fresh `results-only` save before `commitCareer`).
 *
 * Pure read: follows `getSquad`'s pattern of checking file existence and providing a readonly
 * `SqlClient`, rather than `withExistingSave`, because no transaction context is needed.
 */
export const getCoachingAssignments = (savesDir: string, saveId: SaveId) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      access(filename).then(
        () => true,
        () => false,
      ),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }

    return yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      const coachRows = yield* sql<{
        id: string;
        name: string;
        quality: number;
      }>`SELECT id, name, quality FROM staff
         WHERE club_id = (SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1)
           AND role = 'coach'`;

      return new CoachingAssignmentsView({
        coaches: coachRows.map(
          (row) =>
            new CoachAssignmentView({
              id: row.id,
              name: row.name,
              quality: row.quality,
              department: "coaching",
            }),
        ),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped);
  });

/**
 * Workload and Recovery (Screen 112): every player on the manager's own club with their Condition
 * and last injury Severity from the current Season's fitness ledger (`player_fitness`) — the same
 * ledger `recoverClubFitness` writes between Fixtures and `getSquad` reads Condition from.
 *
 * A player with no ledger row reads as full Condition with no injury, matching `getSquad`'s
 * `COALESCE`. The Rest/Active indicator is derived here from Condition against the engine's
 * non-contact injury threshold (the line the Squad screen's "Tired" status uses), computed on every
 * read and never persisted. Pure read, same shape as `getCoachingAssignments`.
 */
export const getWorkload = (savesDir: string, saveId: SaveId) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      access(filename).then(
        () => true,
        () => false,
      ),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }

    return yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      const rows = yield* sql.unsafe<{
        id: PlayerId;
        firstName: string;
        lastName: string;
        condition: number;
        lastInjurySeverity: "none" | "light" | "medium" | "severe";
      }>(
        `SELECT p.id, p.first_name as "firstName", p.last_name as "lastName",
                COALESCE(pf.condition, 100) as "condition",
                COALESCE(pf.last_injury_severity, 'none') as "lastInjurySeverity"
         FROM players p
         LEFT JOIN player_fitness pf ON pf.player_id = p.id
           AND pf.season_number = ${CURRENT_SEASON_NUMBER_SQL}
         WHERE p.club_id = (SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1)
         ORDER BY p.last_name, p.first_name, p.id`,
      );

      return new WorkloadView({
        players: rows.map(
          (row) =>
            new WorkloadPlayerView({
              ...row,
              recovery: row.condition < NON_CONTACT_CONDITION_THRESHOLD ? "rest" : "active",
            }),
        ),
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped);
  });

/** One recorded `PlayerDeveloped` outcome for one player: the Season it concluded and the full
 *  Attribute set the player ended it with. */
export interface RecordedDevelopmentOutcome {
  readonly seasonNumber: number;
  readonly attributes: Readonly<Partial<Record<string, number>>>;
}

/**
 * Turns a player's recorded development outcomes into per-Season Attribute changes, newest Season
 * first. Each Season is compared with the player's previous recorded outcome, which is the previous
 * Season unless the player was away from the manager's club in between. The earliest outcome has
 * no recorded starting point, so it carries no comparison rather than an invented one.
 *
 * Only visible Attributes are compared (`ALL_ATTRIBUTES`, never Injury Proneness), in that list's
 * fixed order, and only those present on both sides and different. Pure and derived on every read.
 */
export const seasonDevelopments = (
  outcomes: ReadonlyArray<RecordedDevelopmentOutcome>,
): ReadonlyArray<SeasonDevelopmentView> => {
  const ascending = [...outcomes].sort((a, b) => a.seasonNumber - b.seasonNumber);
  return ascending
    .map((outcome, index) => {
      const previous = ascending[index - 1];
      if (previous === undefined) {
        return new SeasonDevelopmentView({ seasonNumber: outcome.seasonNumber, comparedWithSeason: null, changes: [] });
      }
      const changes = ALL_ATTRIBUTES.flatMap((attribute) => {
        const from = previous.attributes[attribute];
        const to = outcome.attributes[attribute];
        return from === undefined || to === undefined || from === to
          ? []
          : [new AttributeChangeView({ attribute, from, to })];
      });
      return new SeasonDevelopmentView({
        seasonNumber: outcome.seasonNumber,
        comparedWithSeason: previous.seasonNumber,
        changes,
      });
    })
    .reverse();
};

/**
 * Performance Report (Screen 113): one own-club player's recorded Player Development.
 *
 * The source is the `PlayerDeveloped` events on the club streams, which `developPlayersForSeason`
 * appends only for the human club, so every outcome found was recorded while the player was the
 * manager's. All club streams are read rather than the current club's alone, so a manager who has
 * changed clubs keeps the history they recorded. Nothing is written; the changes are derived by
 * `seasonDevelopments` on every read.
 *
 * A player off the manager's club is refused (`NotYourPlayerError`), as `setTrainingFocus` refuses
 * one: their recorded values would be exact readings of a player the manager now sees through
 * Scouting. A stored payload that no longer decodes is this app's own corrupt write, so it is a
 * defect rather than a typed failure.
 */
export const getPlayerDevelopmentHistory = (savesDir: string, saveId: SaveId, playerId: PlayerId) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      access(filename).then(
        () => true,
        () => false,
      ),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }

    return yield* Effect.gen(function* () {
      const sql = yield* SqlClient;
      const playerRows = yield* sql<{ isOwn: number }>`
        SELECT (club_id = (SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1)) as "isOwn"
        FROM players WHERE id = ${playerId}`;
      const player = playerRows[0];
      if (player === undefined) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.isOwn !== 1) {
        return yield* new NotYourPlayerError({ playerId });
      }

      const rows = yield* sql<{ seasonNumber: number; attributes: string }>`
        SELECT json_extract(e.payload, '$.seasonNumber') as "seasonNumber",
               json_extract(entry.value, '$.attributes') as "attributes"
        FROM events e, json_each(e.payload, '$.players') entry
        WHERE e.stream_type = ${CLUB_STREAM}
          AND e.tag = 'PlayerDeveloped'
          AND json_extract(entry.value, '$.playerId') = ${playerId}`;

      const outcomes = yield* Effect.forEach(
        rows,
        (row) =>
          Schema.decodeEffect(Schema.fromJsonString(AttributesSchema))(row.attributes).pipe(
            Effect.map((attributes): RecordedDevelopmentOutcome => ({ seasonNumber: row.seasonNumber, attributes })),
            Effect.orDie,
          ),
        { concurrency: 1 },
      );

      return new PlayerDevelopmentHistoryView({ playerId, seasons: seasonDevelopments(outcomes) });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped);
  });
