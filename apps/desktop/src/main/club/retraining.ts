/**
 * Retraining (player-positional-model 17): the manager sets one positional line or side a player on
 * their own club is trained toward, and each Microcycle raises that rating gradually, faster for
 * younger and more determined players. Nothing else about a player's positions ever changes: no
 * decay, no growth from match minutes. See
 * `.agents/notes/proposed/feature/2026-09-29-positions-retrain-through-training-only.md`.
 */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  NotYourPlayerError,
  PlayerNotFoundError,
  RetrainingTargetView,
  type ClubId,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { ageOn, applyRetraining, ratingOf, retrainingGain, type RetrainingTarget } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "../season/decider.js";
import { loadSeasonRow } from "../season/currentSeason.js";
import { positionalRatingSelectList, positionalRatingsOf, type PositionalRatingRow } from "../world/positionalRatingColumns.js";
import { loadUserClub } from "./squad.js";

const CLUB_STREAM = "club";

/** `SetRetrainingTarget`: set (or clear, with `target: null`) the line or side a player on the
 *  manager's own club is retrained toward. Setting a target, even the same one again, starts its
 *  progress from zero. Appends a `RetrainingTargetSet` event to the club stream in the same
 *  transaction. A player elsewhere is refused with `NotYourPlayerError`. */
export const setRetrainingTarget = (
  savesDir: string,
  saveId: SaveId,
  playerId: PlayerId,
  target: RetrainingTarget | null,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);

      const club = yield* loadUserClub;
      const rows = yield* sql<{ clubId: ClubId | null }>`SELECT club_id as "clubId" FROM players WHERE id = ${playerId}`;
      const row = rows[0];
      if (row === undefined) return yield* new PlayerNotFoundError({ playerId });
      if (row.clubId !== club.id) return yield* new NotYourPlayerError({ playerId });

      if (target === null) {
        yield* sql`DELETE FROM retraining_targets WHERE player_id = ${playerId}`;
      } else {
        yield* sql`INSERT INTO retraining_targets (player_id, target, progress) VALUES (${playerId}, ${target}, 0)
                   ON CONFLICT(player_id) DO UPDATE SET target = excluded.target, progress = 0`;
      }

      const { seasonNumber } = yield* loadSeasonRow;
      const seq = yield* nextStreamSeq(CLUB_STREAM, club.id);
      yield* appendStreamEvents(CLUB_STREAM, club.id, seq, [
        { tag: "RetrainingTargetSet", payload: { seasonNumber, playerId, target } },
      ]);

      return new RetrainingTargetView({ playerId, target });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

const COLUMN_OF: Record<RetrainingTarget, string> = {
  GK: "line_gk",
  SW: "line_sw",
  D: "line_d",
  DM: "line_dm",
  M: "line_m",
  AM: "line_am",
  F: "line_f",
  WB: "line_wb",
  R: "side_r",
  L: "side_l",
  C: "side_c",
};

/**
 * One Microcycle of retraining for the human club, run when its Matchday is committed: each player
 * with a target gains toward it, banking fractional progress. A target whose player has left the
 * club goes with him, since only the manager's own players are retrained. Draws no randomness, so
 * replaying a save reproduces it. Assumes a `SqlClient` in context, inside the commit's transaction.
 */
export const advanceRetraining = (clubId: ClubId, onDate: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM retraining_targets
               WHERE player_id NOT IN (SELECT id FROM players WHERE club_id = ${clubId})`;
    const rows = yield* sql.unsafe<
      PositionalRatingRow & {
        readonly playerId: PlayerId;
        readonly target: RetrainingTarget;
        readonly progress: number;
        readonly dateOfBirth: string;
        readonly determination: number;
      }
    >(
      `SELECT p.id as "playerId", rt.target as "target", rt.progress as "progress",
              p.date_of_birth as "dateOfBirth", p.determination as "determination",
              ${positionalRatingSelectList("p.")}
       FROM retraining_targets rt JOIN players p ON p.id = rt.player_id
       ORDER BY p.id`,
      [],
    );
    for (const row of rows) {
      const gain = retrainingGain(ageOn(row.dateOfBirth, onDate), row.determination);
      const next = applyRetraining(positionalRatingsOf(row), row.target, row.progress, gain);
      yield* sql.unsafe(`UPDATE players SET ${COLUMN_OF[row.target]} = ? WHERE id = ?`, [
        ratingOf(next.ratings, row.target),
        row.playerId,
      ]);
      yield* sql`UPDATE retraining_targets SET progress = ${next.progress} WHERE player_id = ${row.playerId}`;
    }
  });
