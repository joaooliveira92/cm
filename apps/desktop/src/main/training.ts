import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  NotYourPlayerError,
  PlayerNotFoundError,
  TrainingFocusView,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import type { Category } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "./decider.js";
import { assertSaveNotArchived } from "./managerStatus.js";
import { loadUserClub } from "./squad.js";
import { loadSeasonRow } from "./season/currentSeason.js";

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