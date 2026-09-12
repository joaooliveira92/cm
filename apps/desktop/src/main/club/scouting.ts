import { type ClubId, type PlayerId, type SaveId } from "@cm-clone/contracts";
import {
  PlayerNotFoundError,
  ScoutingView,
  ScoutingTargetView,
  UnknownScoutError,
} from "@cm-clone/contracts";
import { FULLY_SCOUTED, nextProgress } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";

/**
 * Scouting: assigning a named scout to a player, and the club's knowledge accruing over time.
 *
 * Two shapes carry it, and both push what would otherwise be rules into the schema. Assignments are
 * keyed on the scout, so "already at cap" and "duplicate assignment" are unreachable rather than
 * errors — the club has N scout rows and each holds at most one assignment. Progress is keyed on the
 * club and the player and is sparse, so scouting a player nobody has ever looked at costs nothing.
 *
 * Nothing here branches on Simulation Depth. A player in a `results-only` competition cannot be
 * scouted because no player row exists to key a progress row to, so the scoutable set is simply the
 * players who have rows and the rule enforces itself. That means Depth hides a transfer market as
 * well as a simulation: the human cannot sign from a nation they cannot see into.
 */

/** The club the human manages, or `null` before one is chosen. */
const loadHumanClubId = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{ id: ClubId }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
  return rows[0]?.id ?? null;
});

/**
 * Assigns a scout to a player.
 *
 * Its only observable failures are the ones the shape cannot make unreachable: a scout who does not
 * exist, and a player who does not. There is no cap error and no duplicate error, because the
 * primary key on the scout and the unique index on the player make both states impossible to reach.
 *
 * Reassigning a scout who is already watching someone is a legitimate move rather than a conflict —
 * the manager is redirecting a person, and the progress they have accrued for the club stays.
 */
export const assignScout = (savesDir: string, saveId: SaveId, scoutId: string, playerId: PlayerId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);

      const scouts = yield* sql<{ id: string }>`
        SELECT id FROM staff WHERE id = ${scoutId} AND role = 'scout'`;
      if (scouts[0] === undefined) return yield* new UnknownScoutError({ scoutId });

      // The scoutable set is exactly the players who have rows. No depth predicate appears here.
      const players = yield* sql<{ id: PlayerId }>`SELECT id FROM players WHERE id = ${playerId}`;
      if (players[0] === undefined) return yield* new PlayerNotFoundError({ playerId });

      // Another scout at this club may already hold this player; redirecting is the manager's call,
      // so the earlier assignment yields rather than the command failing.
      yield* sql`DELETE FROM scouting_assignments WHERE player_id = ${playerId}`;
      yield* sql`INSERT INTO scouting_assignments (scout_id, player_id) VALUES (${scoutId}, ${playerId})
        ON CONFLICT(scout_id) DO UPDATE SET player_id = excluded.player_id`;

      return yield* readScouting;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** Frees a scout. Their accrued progress stays with the club: knowledge is not un-learned. */
export const unassignScout = (savesDir: string, saveId: SaveId, scoutId: string) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      yield* assertSaveNotArchived(saveId);

      const scouts = yield* sql<{ id: string }>`
        SELECT id FROM staff WHERE id = ${scoutId} AND role = 'scout'`;
      if (scouts[0] === undefined) return yield* new UnknownScoutError({ scoutId });

      yield* sql`DELETE FROM scouting_assignments WHERE scout_id = ${scoutId}`;
      return yield* readScouting;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** The scouting board: every scout at the human's club, and what they are watching. */
export const getScouting = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    readScouting.pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

const readScouting = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const clubId = yield* loadHumanClubId;

  const rows = yield* sql<{
    scoutId: string;
    scoutName: string;
    quality: number;
    playerId: PlayerId | null;
    playerName: string | null;
    progress: number | null;
  }>`SELECT s.id as "scoutId", s.name as "scoutName", s.quality,
            a.player_id as "playerId",
            p.first_name || ' ' || p.last_name as "playerName",
            sp.progress
     FROM staff s
     LEFT JOIN scouting_assignments a ON a.scout_id = s.id
     LEFT JOIN players p ON p.id = a.player_id
     LEFT JOIN scouting_progress sp ON sp.player_id = a.player_id AND sp.club_id = ${clubId}
     WHERE s.club_id = ${clubId} AND s.role = 'scout'
     ORDER BY s.id ASC`;

  return new ScoutingView({
    scouts: rows.map(
      (row) =>
        new ScoutingTargetView({
          scoutId: row.scoutId,
          scoutName: row.scoutName,
          quality: row.quality,
          playerId: row.playerId,
          playerName: row.playerName,
          // Absence of a progress row means Unscouted, which is what a null reports.
          progress: row.progress,
        }),
    ),
  });
});

/**
 * One advance's worth of scouting, for every scout the human's club has assigned.
 *
 * Called from the calendar advance. This is the only writer of `scouting_progress`, and it is where
 * the sparse table's invariant lives: a row is created at the first accrual, which is strictly
 * positive, so no row is ever written at zero.
 */
export const accrueScoutingProgress = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const clubId = yield* loadHumanClubId;
  if (clubId === null) return;

  const assigned = yield* sql<{ playerId: PlayerId; quality: number; progress: number | null }>`
    SELECT a.player_id as "playerId", s.quality, sp.progress
    FROM scouting_assignments a
    JOIN staff s ON s.id = a.scout_id
    LEFT JOIN scouting_progress sp ON sp.player_id = a.player_id AND sp.club_id = ${clubId}
    WHERE s.club_id = ${clubId}
    ORDER BY a.player_id ASC`;

  for (const row of assigned) {
    const updated = nextProgress(row.progress ?? 0, row.quality);
    if (updated === row.progress) continue;
    yield* sql`INSERT INTO scouting_progress (club_id, player_id, progress)
      VALUES (${clubId}, ${row.playerId}, ${updated})
      ON CONFLICT(club_id, player_id) DO UPDATE SET progress = excluded.progress`;
  }
});

/**
 * Drops every assignment and every progress row belonging to the named clubs.
 *
 * Called when the manager leaves a club, alongside the release of its backroom. Without it a career
 * accumulates the scouting of every former club, and the unique index on `player_id` would wrongly
 * stop the new club from watching someone the old one was.
 */
export const discardScoutingForClubs = (clubIds: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    if (clubIds.length === 0) return;
    yield* sql`DELETE FROM scouting_assignments WHERE scout_id IN (
      SELECT id FROM staff WHERE ${sql.in("club_id", clubIds)})`;
    yield* sql`DELETE FROM scouting_progress WHERE ${sql.in("club_id", clubIds)}`;
  });

/**
 * Drops the scouting of players who are about to stop existing.
 *
 * Relegation into a `results-only` tier deletes player rows, and the scouting of a person the world
 * no longer contains has to go with them — retaining it would attach the progress to a player who
 * does not survive the round trip. The scout's slot silently reopens; telling the manager their
 * target has vanished is an inbox concern this does not build.
 */
export const discardScoutingForPlayers = (playerIds: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    if (playerIds.length === 0) return;
    yield* sql`DELETE FROM scouting_assignments WHERE ${sql.in("player_id", playerIds)}`;
    yield* sql`DELETE FROM scouting_progress WHERE ${sql.in("player_id", playerIds)}`;
  });

export { FULLY_SCOUTED };
