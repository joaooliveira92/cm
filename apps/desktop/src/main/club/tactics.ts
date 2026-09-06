import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  InvalidTacticError,
  Tactic,
  TacticRevisionConflictError,
  TacticsScreenView,
  type SaveId,
  type ClubId,
  type PlayerId,
  type WriteRequestId,
} from "@cm-clone/contracts";
import { FORMATION_SLOTS, POSITION_ROLES } from "@cm-clone/shared";
import { Effect, Schema, Semaphore } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";

/**
 * The per-save write gate for `changeTactics`.
 *
 * One process owns every save (the same single-writer premise `advanceLock.ts` rests on), so a
 * module-level semaphore per save serialises genuinely concurrent saves — a double-click on Save
 * from one window, or a window racing a retry. Without it, two deferred SQLite transactions can
 * both read the same revision and both commit: the second silently clobbers the first instead of
 * surfacing the typed conflict the revision guard exists to produce. The first caller to take the
 * permit runs the whole transaction, so the second reads the committed revision after it and gets
 * `TacticRevisionConflictError`. Entries live for the process lifetime; saves are few.
 */
const tacticSaveLocks = new Map<SaveId, Semaphore.Semaphore>();
const changeTacticsPermit = (saveId: SaveId) => {
  let lock = tacticSaveLocks.get(saveId);
  if (lock === undefined) {
    lock = Semaphore.makeUnsafe(1);
    tacticSaveLocks.set(saveId, lock);
  }
  return lock.withPermits(1);
};

/** The club's persisted Tactic, if `ChangeTactics` has ever been issued — assumes a `SqlClient` in
 * context. Exported for season.ts (ticket 15, synthesizes a default for AI clubs without one) and
 * match.ts (ticket 13, needs the opponent club's Tactic too). */
export const loadPersistedTactic = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const tacticRows = yield* sql<{
      formation: string;
      mentality: string;
      tempo: string;
      pressing: string;
    }>`SELECT formation, mentality, tempo, pressing FROM tactics WHERE club_id = ${clubId}`;
    if (tacticRows.length === 0) return null;

    const slotRows = yield* sql<{
      position: string;
      role: string;
      playerId: PlayerId;
    }>`SELECT position, role, player_id as "playerId" FROM tactic_slots WHERE club_id = ${clubId} ORDER BY slot_index`;

    return yield* Schema.decodeUnknownEffect(Tactic)({
      ...tacticRows[0],
      slots: slotRows,
    });
  });

/** The revision guard a submit compares against — the stored `revision`; a club that has never
 * been saved reads as 0. Assumes a `SqlClient` in context. */
const loadTacticRevision = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ revision: number }>`SELECT revision FROM tactics WHERE club_id = ${clubId}`;
    return rows[0]?.revision ?? 0;
  });

/** True when `requestId` was already accepted for this club — the idempotency side of the guard.
 * Assumes a `SqlClient` in context. */
const hasAcceptedRequestId = (clubId: ClubId, requestId: WriteRequestId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ found: number }>`
      SELECT 1 as found FROM tactic_write_requests WHERE club_id = ${clubId} AND request_id = ${requestId}`;
    return rows.length > 0;
  });

export const getTactics = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      const squad = yield* loadSquadPlayers(club.id);
      const tactic = yield* loadPersistedTactic(club.id);
      const revision = yield* loadTacticRevision(club.id);
      return new TacticsScreenView({ club, squad, tactic, revision });
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

/** Writes a Tactic's `tactics`/`tactic_slots` rows for one club, at `revision` — shared by
 * `changeTactics` (the user's own club, after `validateTactic` below) and `aiClubs.ts`'s
 * Season-start AI Tactic assignment (ticket 17), which calls this directly in-process rather than
 * through the RpcGroup and passes revision 0 — AI-written tactics are never revisioned. The caller
 * owns the revision: writing it explicitly alongside the rows keeps the row from depending on the
 * column default, which a `persistTactic` caller bypassing `changeTactics` would otherwise have to
 * know about. Assumes a `SqlClient` in context. */
export const persistTactic = (clubId: ClubId, tactic: Tactic, revision: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM tactic_slots WHERE club_id = ${clubId}`;
    yield* sql`DELETE FROM tactics WHERE club_id = ${clubId}`;
    yield* sql`INSERT INTO tactics (club_id, formation, mentality, tempo, pressing, revision) VALUES (${clubId}, ${tactic.formation}, ${tactic.mentality}, ${tactic.tempo}, ${tactic.pressing}, ${revision})`;
    for (const [index, slot] of tactic.slots.entries()) {
      yield* sql`INSERT INTO tactic_slots (club_id, slot_index, position, role, player_id) VALUES (${clubId}, ${index}, ${slot.position}, ${slot.role}, ${slot.playerId})`;
    }
  });

/** Exported for `aiClubs.ts`'s Season-start AI Tactic assignment (ticket 17), which validates the
 * synthesized Tactic against the same rules the human Tactics screen enforces before persisting. */
export const validateTactic = (tactic: Tactic, squadPlayerIds: ReadonlySet<string>) =>
  Effect.gen(function* () {
    const expectedPositions = FORMATION_SLOTS[tactic.formation];
    if (tactic.slots.length !== expectedPositions.length) {
      return yield* new InvalidTacticError({
        reason: `${tactic.formation} needs ${expectedPositions.length} slots, got ${tactic.slots.length}`,
      });
    }

    const seenPlayers = new Set<string>();
    for (const [index, slot] of tactic.slots.entries()) {
      if (slot.position !== expectedPositions[index]) {
        return yield* new InvalidTacticError({
          reason: `slot ${index} must be ${expectedPositions[index]} in ${tactic.formation}, got ${slot.position}`,
        });
      }
      if (slot.role !== POSITION_ROLES[slot.position]) {
        return yield* new InvalidTacticError({
          reason: `slot ${index} (${slot.position}) must use Role ${POSITION_ROLES[slot.position]}, got ${slot.role}`,
        });
      }
      if (!squadPlayerIds.has(slot.playerId)) {
        return yield* new InvalidTacticError({
          reason: `player ${slot.playerId} is not in the squad`,
        });
      }
      if (seenPlayers.has(slot.playerId)) {
        return yield* new InvalidTacticError({
          reason: `player ${slot.playerId} is assigned to more than one slot`,
        });
      }
      seenPlayers.add(slot.playerId);
    }
  });

/**
 * The revision-bound, idempotent tactics save. A submit carries the `expectedRevision` the caller
 * read and a fresh `requestId`; the whole decision and write happen in one SQLite transaction, so
 * a concurrent save cannot land between the check and the write.
 *
 * - A replay whose `requestId` is already in the request log is a *no-op success* returning the
 *   current state — checked before the revision comparison and before validation, so a retry after
 *   a lost response never double-applies and never conflicts, however stale its expected revision
 *   or however invalid its (once-valid) payload has since become.
 * - A submit whose `expectedRevision` no longer matches the stored one fails with a
 *   `TacticRevisionConflictError` naming the current revision, and changes nothing.
 * - Otherwise the Tactic is replaced and the revision raised by exactly one; the success echoes
 *   the stored Tactic and the new revision, read inside the same transaction so the two can never
 *   disagree.
 */
export const changeTactics = (
  savesDir: string,
  saveId: SaveId,
  tactic: Tactic,
  expectedRevision: number,
  requestId: WriteRequestId,
) =>
  changeTacticsPermit(saveId)(
    withExistingSave(savesDir, saveId, (filename) =>
      Effect.gen(function* () {
        yield* assertSaveNotArchived(saveId);
        const sql = yield* SqlClient;

        const outcome = yield* sql.withTransaction(
          Effect.gen(function* () {
            const club = yield* loadUserClub;
            const currentRevision = yield* loadTacticRevision(club.id);

            if (yield* hasAcceptedRequestId(club.id, requestId)) {
              const squad = yield* loadSquadPlayers(club.id);
              const replayed = yield* loadPersistedTactic(club.id);
              return yield* Effect.succeed({
                club,
                squad,
                tactic: replayed,
                revision: currentRevision,
              });
            }

            if (currentRevision !== expectedRevision) {
              return yield* new TacticRevisionConflictError({ saveId, currentRevision });
            }

            const squad = yield* loadSquadPlayers(club.id);
            yield* validateTactic(tactic, new Set(squad.map((player) => player.id)));
            yield* persistTactic(club.id, tactic, currentRevision + 1);
            yield* sql`INSERT INTO tactic_write_requests (club_id, request_id) VALUES (${club.id}, ${requestId})`;
            const stored = yield* loadPersistedTactic(club.id);
            return yield* Effect.succeed({
              club,
              squad,
              tactic: stored,
              revision: currentRevision + 1,
            });
          }),
        );

        return new TacticsScreenView(outcome);
      }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
    ),
  );
