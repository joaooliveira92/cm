import { access } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  CoachAssignmentView,
  CoachingAssignmentsView,
  NotYourPlayerError,
  PlayerNotFoundError,
  SaveNotFoundError,
  TrainingFocusView,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import type { Category } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadUserClub } from "./squad.js";
import { loadSeasonRow } from "../season/currentSeason.js";

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