import {
  ClubNotFoundError,
  ClubSummary,
  ClubTransfersView,
  TransferHistoryEntryView,
  TransferHistoryView,
  type ClubId,
  type SaveId,
} from "@cm-clone/contracts";
import type { StatureTier } from "@cm-clone/shared";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadUserClub } from "../club/squad.js";
import { withExistingSave } from "../season/decider.js";
import { displayNames } from "../world/displayNames.js";

/**
 * Transfer History screen (Screen 146): every completed transfer into or out of the manager's Club,
 * newest first, read from `player_transfers` — the authoritative record of who moved where, written
 * by `completeTransfer`.
 *
 * `from_club_id` is nullable, and a NULL there is not missing data: it is a **Free Agent** signing,
 * where there was no Club to leave — so the selling Club's name is `null` while the buying Club's
 * never is.
 *
 * Rows for Players the world no longer contains are already removed by `discardSquadsForClubs`, so
 * the Player join needs no tolerance for a missing row.
 */
export const getTransferHistoryScreen = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      return yield* readTransferHistory(club.id);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/**
 * Club Transfers (Screen 42): the same history for **any** club.
 *
 * `readTransferHistory` was already club-parameterised; only the entry point above hardcoded the
 * user's club. So this is a sibling entry point rather than a second query — one read of
 * `player_transfers`, two ways in, which is what the club-scoped rule asks for.
 *
 * The club rides with the rows so one read answers the whole page, and an unknown club is
 * `ClubNotFoundError`: a club that has completed no transfer is a real answer, so a club that does
 * not exist must not be able to look like one.
 */
export const getClubTransfers = (savesDir: string, saveId: SaveId, clubId: ClubId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const clubRows = yield* sql<{ statureTier: StatureTier; isUserClub: number }>`
        SELECT stature_tier as "statureTier", is_user_club as "isUserClub"
        FROM clubs WHERE id = ${clubId}`;
      const club = clubRows[0];
      if (club === undefined) {
        return yield* new ClubNotFoundError({ id: clubId });
      }

      const nameOf = yield* displayNames;
      const history = yield* readTransferHistory(clubId);
      return new ClubTransfersView({
        club: new ClubSummary({
          id: clubId,
          name: nameOf(clubId),
          statureTier: club.statureTier,
        }),
        // SQLite has no boolean: the column is the integer flag world generation writes.
        isUserClub: club.isUserClub === 1,
        entries: history.entries,
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

const readTransferHistory = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    /** Club names live in the save's content pack, not in `clubs` — there is no name column to
     *  join to, so the query returns ids and resolution happens here, at the one seam that owns it. */
    const nameOf = yield* displayNames;

    /**
     * `transferred_on` is an ISO `YYYY-MM-DD` string, so a lexicographic DESC is a chronological
     * one. The `id` tie-break makes the order total: two transfers completing on the same in-world
     * date would otherwise come back in whatever order SQLite happened to produce, and this read
     * has to be deterministic across runs.
     */
    const rows = yield* sql.unsafe<{
      id: number;
      transferredOn: string;
      playerFirstName: string;
      playerLastName: string;
      fromClubId: string | null;
      toClubId: string;
      fee: number;
    }>(
      `SELECT t.id, t.transferred_on as "transferredOn",
              p.first_name as "playerFirstName", p.last_name as "playerLastName",
              t.from_club_id as "fromClubId", t.to_club_id as "toClubId", t.fee
       FROM player_transfers t
       JOIN players p ON p.id = t.player_id
       WHERE t.from_club_id = ? OR t.to_club_id = ?
       ORDER BY t.transferred_on DESC, t.id DESC`,
      [clubId, clubId],
    );

    return new TransferHistoryView({
      entries: rows.map(
        (row) =>
          new TransferHistoryEntryView({
            id: row.id,
            transferredOn: row.transferredOn,
            playerFirstName: row.playerFirstName,
            playerLastName: row.playerLastName,
            fromClubName: row.fromClubId === null ? null : nameOf(row.fromClubId),
            toClubName: nameOf(row.toClubId),
            fee: row.fee,
          }),
      ),
    });
  });
