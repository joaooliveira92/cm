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
import {
  PLAYER_OVERRIDE_VALUES,
  PLAYER_STANDALONE_VALUES,
  PLAYER_SWITCHES,
  SET_PIECE_ROLE_VALUES,
  TAKER_LISTS,
  TEAM_INSTRUCTION_VALUES,
  TEAM_SET_PIECE_VALUES,
  TEAM_SWITCHES,
  describeTacticProblem,
  validateTactic as validateTacticRules,
} from "@cm-clone/shared";
import { Effect, Schema, Semaphore } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { assertSaveNotArchived } from "../career/managerStatus.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";

/**
 * The per-save gate around one tactic write (or the overview's snapshot read).
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

/**
 * Runs `effect` under one permit of the save's tactic gate. Shared by `changeTactics` (the write)
 * and the overview's snapshot read, so a snapshot read can never interleave with an accepted save
 * and return a tactic from one revision beside a revision counter from another.
 */
export const withTacticSavePermit = <A, E, R>(saveId: SaveId, effect: Effect.Effect<A, E, R>) =>
  changeTacticsPermit(saveId)(effect);

const snakeCase = (name: string): string => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/** `column AS "field"` for each field, so a row reads back under the domain's own names. */
const selectList = (fields: ReadonlyArray<string>): string =>
  fields.map((field) => `${snakeCase(field)} AS "${field}"`).join(", ");

const TEAM_CHOICES = Object.keys(TEAM_INSTRUCTION_VALUES);
const TEAM_SET_PIECE_FIELDS = Object.keys(TEAM_SET_PIECE_VALUES);
const INSTRUCTION_FIELDS = [
  ...Object.keys(PLAYER_OVERRIDE_VALUES),
  ...Object.keys(PLAYER_STANDALONE_VALUES),
  ...PLAYER_SWITCHES,
];
const SET_PIECE_ROLE_FIELDS = Object.keys(SET_PIECE_ROLE_VALUES);

type Row = Readonly<Record<string, unknown>>;
const pick = (row: Row, fields: ReadonlyArray<string>): Record<string, unknown> =>
  Object.fromEntries(fields.map((field) => [field, row[field]]));

/** A run is stored as two nullable columns; both null is no run. */
const cellOrNull = (row: string | null, column: string | null) =>
  row === null || column === null ? null : { row, column };

/** The club's persisted Tactic, if `ChangeTactics` has ever been issued — assumes a `SqlClient` in
 * context. Read whole: the tactic row, its eleven slots, the bench and every taker list, decoded
 * through the `Tactic` schema so a row the schema cannot decode fails loudly rather than reaching a
 * screen or the engine. Exported for season.ts (ticket 15, synthesizes a default for AI clubs
 * without one) and match.ts (ticket 13, needs the opponent club's Tactic too). */
export const loadPersistedTactic = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const tacticRows = yield* sql.unsafe<Row>(
      `SELECT source_template AS "sourceTemplate", ${selectList([...TEAM_CHOICES, ...TEAM_SWITCHES, ...TEAM_SET_PIECE_FIELDS])}
       FROM tactics WHERE club_id = ?`,
      [clubId],
    );
    const tacticRow = tacticRows[0];
    if (tacticRow === undefined) return null;

    const slotRows = yield* sql.unsafe<Row>(
      `SELECT player_id AS "playerId", cell_row AS "cellRow", cell_column AS "cellColumn",
              run_row AS "runRow", run_column AS "runColumn",
              ${selectList([...INSTRUCTION_FIELDS, ...SET_PIECE_ROLE_FIELDS])}
       FROM tactic_slots WHERE club_id = ? ORDER BY slot_index`,
      [clubId],
    );

    const benchRows = yield* sql<{ playerId: PlayerId | null }>`
      SELECT player_id as "playerId" FROM tactic_bench_slots WHERE club_id = ${clubId} ORDER BY slot_index`;

    const takerRows = yield* sql<{ list: string; playerId: PlayerId }>`
      SELECT list, player_id as "playerId" FROM tactic_takers WHERE club_id = ${clubId} ORDER BY list, place`;

    return yield* Schema.decodeUnknownEffect(Tactic)({
      sourceTemplate: tacticRow["sourceTemplate"],
      team: {
        ...pick(tacticRow, TEAM_CHOICES),
        ...Object.fromEntries(TEAM_SWITCHES.map((name) => [name, tacticRow[name] === 1])),
      },
      teamSetPieces: pick(tacticRow, TEAM_SET_PIECE_FIELDS),
      slots: slotRows.map((row) => ({
        cell: { row: row["cellRow"], column: row["cellColumn"] },
        run: cellOrNull(row["runRow"] as string | null, row["runColumn"] as string | null),
        instructions: pick(row, INSTRUCTION_FIELDS),
        setPieceRoles: pick(row, SET_PIECE_ROLE_FIELDS),
      })),
      assignments: slotRows.map((row) => row["playerId"]),
      bench: benchRows.map((row) => row.playerId),
      takers: Object.fromEntries(
        TAKER_LISTS.map((list) => [list, takerRows.filter((row) => row.list === list).map((row) => row.playerId)]),
      ),
    });
  });

/** The revision guard a submit compares against — the stored `revision`; a club that has never
 * been saved reads as 0. Assumes a `SqlClient` in context. */
export const loadTacticRevision = (clubId: ClubId) =>
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

/** `?, ?, ?` for `count` bound values. */
const placeholders = (count: number): string => Array<string>(count).fill("?").join(", ");

/** Writes a Tactic's rows for one club, at `revision` — shared by `changeTactics` (the user's own
 * club, after `validateTactic` below) and `aiClubs.ts`'s Season-start AI Tactic assignment
 * (ticket 17), which calls this directly in-process rather than through the RpcGroup and passes
 * revision 0 — AI-written tactics are never revisioned. The caller owns the revision: writing it
 * explicitly alongside the rows keeps the row from depending on the column default, which a
 * `persistTactic` caller bypassing `changeTactics` would otherwise have to know about. The write is
 * a full replacement: every row of the old Tactic goes first. Assumes a `SqlClient` in context. */
export const persistTactic = (clubId: ClubId, tactic: Tactic, revision: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM tactic_takers WHERE club_id = ${clubId}`;
    yield* sql`DELETE FROM tactic_bench_slots WHERE club_id = ${clubId}`;
    yield* sql`DELETE FROM tactic_slots WHERE club_id = ${clubId}`;
    yield* sql`DELETE FROM tactics WHERE club_id = ${clubId}`;

    const teamColumns = [...TEAM_CHOICES, ...TEAM_SWITCHES, ...TEAM_SET_PIECE_FIELDS];
    const teamValues = [
      ...TEAM_CHOICES.map((name) => tactic.team[name as keyof typeof tactic.team]),
      ...TEAM_SWITCHES.map((name) => (tactic.team[name] ? 1 : 0)),
      ...TEAM_SET_PIECE_FIELDS.map((name) => tactic.teamSetPieces[name as keyof typeof tactic.teamSetPieces]),
    ];
    yield* sql.unsafe(
      `INSERT INTO tactics (club_id, source_template, ${teamColumns.map(snakeCase).join(", ")}, revision)
       VALUES (${placeholders(3 + teamColumns.length)})`,
      [clubId, tactic.sourceTemplate, ...teamValues, revision],
    );

    const slotColumns = [...INSTRUCTION_FIELDS, ...SET_PIECE_ROLE_FIELDS];
    for (const [index, slot] of tactic.slots.entries()) {
      const values = [
        ...INSTRUCTION_FIELDS.map((name) => slot.instructions[name as keyof typeof slot.instructions]),
        ...SET_PIECE_ROLE_FIELDS.map((name) => slot.setPieceRoles[name as keyof typeof slot.setPieceRoles]),
      ];
      yield* sql.unsafe(
        `INSERT INTO tactic_slots (club_id, slot_index, cell_row, cell_column, run_row, run_column, player_id, ${slotColumns.map(snakeCase).join(", ")})
         VALUES (${placeholders(7 + slotColumns.length)})`,
        [clubId, index, slot.cell.row, slot.cell.column, slot.run?.row ?? null, slot.run?.column ?? null, tactic.assignments[index]!, ...values],
      );
    }
    for (const [index, playerId] of tactic.bench.entries()) {
      yield* sql`INSERT INTO tactic_bench_slots (club_id, slot_index, player_id) VALUES (${clubId}, ${index}, ${playerId})`;
    }
    for (const list of TAKER_LISTS) {
      for (const [place, playerId] of tactic.takers[list].entries()) {
        yield* sql`INSERT INTO tactic_takers (club_id, list, place, player_id) VALUES (${clubId}, ${list}, ${place}, ${playerId})`;
      }
    }
  });

/** Exported for `aiClubs.ts`'s Season-start AI Tactic assignment (ticket 17), which validates the
 * synthesized Tactic against the same rules the human Tactics screen enforces before persisting.
 * Refuses with every problem the shared rules name (`InvalidTacticError.problems`), against the
 * club's squad. */
export const validateTactic = (tactic: Tactic, squadPlayerIds: ReadonlySet<string>) =>
  Effect.gen(function* () {
    const problems = validateTacticRules(tactic, squadPlayerIds);
    if (problems.length > 0) {
      return yield* new InvalidTacticError({
        reason: problems.map(describeTacticProblem).join("; "),
        problems,
      });
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
  withTacticSavePermit(
    saveId,
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
