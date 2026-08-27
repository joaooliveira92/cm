import { SaveSackedError } from "@cm-clone/contracts";
import type { ManagerOutcome } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

export interface ManagerStatusRow {
  readonly consecutiveMisses: number;
  readonly sacked: boolean;
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
    sacked: number;
    lastOutcome: ManagerOutcome;
  }>`SELECT consecutive_misses as "consecutiveMisses", sacked, last_outcome as "lastOutcome" FROM manager_status WHERE id = 1`;
  const row = rows[0]!;
  return {
    consecutiveMisses: row.consecutiveMisses,
    sacked: row.sacked === 1,
    lastOutcome: row.lastOutcome,
  } satisfies ManagerStatusRow;
});

/** Rejects with `SaveSackedError` once `ManagerSacked` has archived the save (ticket 18 / ADR-0006:
 * "read-only, no further commands accepted"). Every mutating command handler must call this before
 * writing. Assumes a `SqlClient` in context. */
export const assertSaveNotSacked = (saveId: string) =>
  Effect.gen(function* () {
    const managerStatus = yield* loadManagerStatus;
    if (managerStatus.sacked) {
      return yield* new SaveSackedError({ saveId });
    }
  });
