/** Tactic Library (ticket 25): the manager's saved Tactic Templates in the save. */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  InvalidTacticError,
  Tactic,
  TacticLibraryNameTakenError,
  TacticLibraryNotFoundError,
  TacticLibraryReadOnlyError,
  TacticLibraryRevisionConflictError,
  PlayerId,
  WriteRequestId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  EMPTY_TAKERS,
  TEAM_SWITCHES,
  describeTacticProblem,
  validateTactic as validateTacticRules,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { changeTactics, loadPersistedTactic } from "./tactics.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import {
  ALL_TEAM_COLUMNS,
  buildLibraryView,
  deleteTemplate,
  idempotent,
  insertTemplate,
  loadTemplateContent,
  nameExists,
  persistTemplateSlots,
  TEAM_CHOICES,
  TEAM_SET_PIECE_FIELDS,
} from "./tacticLibraryRepository.js";

const snakeCase = (name: string): string => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const validateTacticAgainstSquad = (tactic: Tactic) =>
  Effect.gen(function* () {
    const club = yield* loadUserClub;
    const squad = yield* loadSquadPlayers(club.id);
    const problems = validateTacticRules(tactic, new Set(squad.map((p) => p.id)));
    if (problems.length > 0) {
      return yield* new InvalidTacticError({
        reason: problems.map(describeTacticProblem).join("; "),
        problems,
      });
    }
  });

export const loadTacticLibrary = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    buildLibraryView.pipe(
      Effect.provide(SqliteClient.layer({ filename, readonly: true })),
      Effect.scoped,
    ),
  );

export const saveTacticTemplate = (
  savesDir: string,
  saveId: SaveId,
  name: string,
  tactic: Tactic,
  requestId: string,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;

      const outcome = yield* sql.withTransaction(
        Effect.gen(function* () {
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView;
          }
          if (yield* nameExists(name, null)) {
            return yield* new TacticLibraryNameTakenError({ saveId, name });
          }
          yield* validateTacticAgainstSquad(tactic);
          yield* insertTemplate(name, tactic, requestId);
          return yield* buildLibraryView;
        }),
      );
      return outcome;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

export const renameTacticTemplate = (
  savesDir: string,
  saveId: SaveId,
  id: number,
  name: string,
  expectedRevision: number,
  requestId: string,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;

      const outcome = yield* sql.withTransaction(
        Effect.gen(function* () {
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView;
          }

          const rows = yield* sql<{ revision: number; isBuiltIn: number; name: string }>`
            SELECT revision, is_built_in AS "isBuiltIn", name FROM tactic_library WHERE id = ${id}`;
          const row = rows[0];
          if (row === undefined) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }
          if (row.isBuiltIn === 1) {
            return yield* new TacticLibraryReadOnlyError({ saveId, id, name: row.name });
          }
          if (row.revision !== expectedRevision) {
            return yield* new TacticLibraryRevisionConflictError({ saveId, id, currentRevision: row.revision });
          }
          if (yield* nameExists(name, id)) {
            return yield* new TacticLibraryNameTakenError({ saveId, name });
          }

          yield* sql`
            UPDATE tactic_library SET name = ${name}, revision = revision + 1, write_request_id = ${requestId}
            WHERE id = ${id}`;
          return yield* buildLibraryView;
        }),
      );
      return outcome;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

export const overwriteTacticTemplate = (
  savesDir: string,
  saveId: SaveId,
  id: number,
  tactic: Tactic,
  expectedRevision: number,
  requestId: string,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;

      const outcome = yield* sql.withTransaction(
        Effect.gen(function* () {
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView;
          }

          const rows = yield* sql<{ revision: number; isBuiltIn: number; name: string }>`
            SELECT revision, is_built_in AS "isBuiltIn", name FROM tactic_library WHERE id = ${id}`;
          const row = rows[0];
          if (row === undefined) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }
          if (row.isBuiltIn === 1) {
            return yield* new TacticLibraryReadOnlyError({ saveId, id, name: row.name });
          }
          if (row.revision !== expectedRevision) {
            return yield* new TacticLibraryRevisionConflictError({ saveId, id, currentRevision: row.revision });
          }

          yield* validateTacticAgainstSquad(tactic);

          const teamValues = [
            ...TEAM_CHOICES.map((name) => tactic.team[name as keyof typeof tactic.team]),
            ...TEAM_SWITCHES.map((name) => (tactic.team[name] ? 1 : 0)),
            ...TEAM_SET_PIECE_FIELDS.map((name) => tactic.teamSetPieces[name as keyof typeof tactic.teamSetPieces]),
          ];
          const setColumns = ALL_TEAM_COLUMNS.map(snakeCase);

          yield* sql.unsafe(
            `UPDATE tactic_library SET source_template = ?, revision = revision + 1, write_request_id = ?, ${setColumns.join(" = ?, ")} = ?
             WHERE id = ?`,
            [tactic.sourceTemplate, requestId, ...teamValues, id],
          );

          yield* persistTemplateSlots(id, tactic);
          return yield* buildLibraryView;
        }),
      );
      return outcome;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

export const duplicateTacticTemplate = (
  savesDir: string,
  saveId: SaveId,
  id: number,
  requestId: string,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;

      const outcome = yield* sql.withTransaction(
        Effect.gen(function* () {
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView;
          }

          const content = yield* loadTemplateContent(id);
          if (content === null) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }

          const rows = yield* sql<{ name: string }>`SELECT name FROM tactic_library WHERE id = ${id}`;
          const sourceName = rows[0]?.name ?? "Unknown";
          let newName = `${sourceName} (copy)`;

          let attempt = 1;
          while (yield* nameExists(newName, null)) {
            attempt++;
            newName = `${sourceName} (copy ${attempt})`;
          }

          yield* insertTemplate(newName, content, requestId);
          return yield* buildLibraryView;
        }),
      );
      return outcome;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

export const deleteTacticTemplate = (
  savesDir: string,
  saveId: SaveId,
  id: number,
  expectedRevision: number,
  requestId: string,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const sql = yield* SqlClient;

      const outcome = yield* sql.withTransaction(
        Effect.gen(function* () {
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView;
          }

          const rows = yield* sql<{ revision: number; isBuiltIn: number; name: string }>`
            SELECT revision, is_built_in AS "isBuiltIn", name FROM tactic_library WHERE id = ${id}`;
          const row = rows[0];
          if (row === undefined) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }
          if (row.isBuiltIn === 1) {
            return yield* new TacticLibraryReadOnlyError({ saveId, id, name: row.name });
          }
          if (row.revision !== expectedRevision) {
            return yield* new TacticLibraryRevisionConflictError({ saveId, id, currentRevision: row.revision });
          }

          yield* deleteTemplate(id);
          return yield* buildLibraryView;
        }),
      );
      return outcome;
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

export const quickLoadTactic = (
  savesDir: string,
  saveId: SaveId,
  id: number,
  requestId: string,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const content = yield* loadTemplateContent(id);
      if (content === null) {
        return yield* new TacticLibraryNotFoundError({ saveId, id });
      }

      const club = yield* loadUserClub;
      const squad = yield* loadSquadPlayers(club.id);

      const currentTactic = yield* loadPersistedTactic(club.id);

      const assignments = content.slots.map((_slot, slotIndex) => {
        if (currentTactic !== null && slotIndex < currentTactic.assignments.length) {
          return currentTactic.assignments[slotIndex]!;
        }
        if (slotIndex < squad.length) {
          return squad[slotIndex]!.id;
        }
        return PlayerId.make("");
      });

      const bench = currentTactic?.bench ?? [];

      const newTactic = new Tactic({
        sourceTemplate: content.sourceTemplate,
        slots: content.slots,
        team: content.team,
        teamSetPieces: content.teamSetPieces,
        assignments,
        bench,
        takers: EMPTY_TAKERS,
      });

      return yield* changeTactics(savesDir, saveId, newTactic, 0, WriteRequestId.make(requestId));
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );