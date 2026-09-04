import { SaveArchivedError, type ClubId, type SaveId } from "@cm-clone/contracts";
import type { ArchivedCause, ManagerOutcome } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { discardScoutingForClubs } from "./scouting.js";

export interface ManagerStatusRow {
  readonly consecutiveMisses: number;
  /** `null` while the career is live; the cause that archived the save once it has ended. */
  readonly archivedCause: ArchivedCause | null;
  readonly lastOutcome: ManagerOutcome;
}

/** Reads the save's single `manager_status` row (ticket 18 / ADR-0006). Assumes a `SqlClient` in
 * context. Lives in its own module (rather than `season.ts`, which writes it) so every mutating
 * command handler — `tactics.ts`, `match.ts`, `transfers.ts`, `season.ts` itself — can depend on it
 * without a circular import. */
export const loadManagerStatus = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    consecutiveMisses: number;
    archivedCause: ArchivedCause | null;
    lastOutcome: ManagerOutcome;
  }>`SELECT consecutive_misses as "consecutiveMisses", archived_cause as "archivedCause", last_outcome as "lastOutcome" FROM manager_status WHERE id = 1`;
  const row = rows[0]!;
  return {
    consecutiveMisses: row.consecutiveMisses,
    archivedCause: row.archivedCause,
    lastOutcome: row.lastOutcome,
  } satisfies ManagerStatusRow;
});

/** Rejects with `SaveArchivedError` once the save is an Archived Save (ticket 18 / ADR-0006:
 * "read-only, no further commands accepted"). Both causes — `ManagerSacked` and `ManagerRetired` —
 * archive through the same nullable column, so the guard reads the archived state and never the
 * cause; the cause rides along on the error only so the renderer can word the refusal correctly.
 * Every mutating command handler must call this before writing. Assumes a `SqlClient` in context. */
export const assertSaveNotArchived = (saveId: SaveId) =>
  Effect.gen(function* () {
    const managerStatus = yield* loadManagerStatus;
    if (managerStatus.archivedCause !== null) {
      return yield* new SaveArchivedError({ saveId, cause: managerStatus.archivedCause });
    }
  });

/**
 * Everything that stops belonging to the manager when they leave a club.
 *
 * Staff exist for a club that is or has been human-managed; once the manager is gone, nobody reads
 * either binding, so the rows go with them. Re-deriving them on a later return costs nothing and
 * yields the same people, because they are a function of the world seed and the club's canonical
 * id — never of arrival time or career history.
 */
export const releaseClubStaff = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    // Scouting goes with the backroom. It belongs to the club rather than to the manager, so a
    // career move starts the next club Unscouted on everyone rather than importing an inheritance —
    // and leaving the rows behind would let the old club's assignments block the new one's, through
    // the unique index on `player_id`.
    yield* discardScoutingForClubs([clubId]);
    yield* sql`DELETE FROM staff WHERE club_id = ${clubId}`;
  });
