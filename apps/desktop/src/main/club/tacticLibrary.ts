/** Tactic Library (ticket 25): the manager's saved Tactic Templates in the save. */
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  InvalidTacticError,
  Tactic,
  TacticLibraryNameTakenError,
  TacticLibraryNotFoundError,
  TacticLibraryReadOnlyError,
  TacticLibraryRevisionConflictError,
  TacticLibraryView,
  TacticTemplateSummary,
  TacticsScreenView,
  type SaveId,
} from "@cm-clone/contracts";
import {
  BUILT_IN_TEMPLATE_NAMES,
  PLAYER_OVERRIDE_VALUES,
  PLAYER_STANDALONE_VALUES,
  PLAYER_SWITCHES,
  SET_PIECE_ROLE_VALUES,
  TEAM_INSTRUCTION_VALUES,
  TEAM_SET_PIECE_VALUES,
  TEAM_SWITCHES,
  rowCountLabel,
  validateTactic as validateTacticRules,
  describeTacticProblem,
  type TacticSlot,
  type Slot,
  type TakerList,
} from "@cm-clone/shared";
import { Data, Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { withExistingSave } from "../season/decider.js";
import { loadSquadPlayers, loadUserClub } from "./squad.js";
import { changeTactics, loadPersistedTactic } from "./tactics.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const snakeCase = (name: string): string => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

/** `column AS "field"` for each field, so a row reads back under the domain's own names. */
const selectList = (fields: ReadonlyArray<string>): string =>
  fields.map((field) => `${snakeCase(field)} AS "${field}"`).join(", ");

const TEAM_CHOICES = Object.keys(TEAM_INSTRUCTION_VALUES);
const TEAM_SET_PIECE_FIELDS = Object.keys(TEAM_SET_PIECE_VALUES);
const SLOT_INSTRUCTION_FIELDS = [
  ...Object.keys(PLAYER_OVERRIDE_VALUES),
  ...Object.keys(PLAYER_STANDALONE_VALUES),
  ...PLAYER_SWITCHES,
];
const SLOT_SET_PIECE_ROLE_FIELDS = Object.keys(SET_PIECE_ROLE_VALUES);
const ALL_TEAM_COLUMNS = [...TEAM_CHOICES, ...TEAM_SWITCHES, ...TEAM_SET_PIECE_FIELDS];

type Row = Readonly<Record<string, unknown>>;
const pick = (row: Row, fields: ReadonlyArray<string>): Record<string, unknown> =>
  Object.fromEntries(fields.map((field) => [field, row[field]]));

/** `?, ?, ?` for `count` bound values. */
const placeholders = (count: number): string => Array<string>(count).fill("?").join(", ");

// ---------------------------------------------------------------------------
// Load the full library from DB and derive built-in templates
// ---------------------------------------------------------------------------

/**
 * Load the full Tactic Library view: saved templates from the DB, plus the names of built-in
 * templates from the code constants. Assumes a `SqlClient` in context.
 */
const loadLibraryFromDb = () =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const rows = yield* sql.unsafe<Row>(
      `SELECT id, name, revision, is_built_in AS "isBuiltIn",
              source_template AS "sourceTemplate",
              ${selectList(ALL_TEAM_COLUMNS)}
       FROM tactic_library ORDER BY name COLLATE NOCASE`,
    );

    const templates: Array<TacticTemplateSummary> = [];
    for (const row of rows) {
      const id = row["id"] as number;
      const isBuiltIn = (row["isBuiltIn"] as number) === 1;
      // For the rowCountLabel we need the slots — read them separately
      const slotRows = yield* sql.unsafe<Row>(
        `SELECT cell_row AS "cellRow", cell_column AS "cellColumn"
         FROM tactic_library_slots WHERE library_id = ? ORDER BY slot_index`,
        [id],
      );
      const shape = rowCountLabel(
        slotRows.map((sr) => ({ cell: { row: sr["cellRow"], column: sr["cellColumn"] } }) as unknown as Pick<TacticSlot, "cell">),
      );
      templates.push(
        new TacticTemplateSummary({
          id,
          name: row["name"] as string,
          sourceTemplate: row["sourceTemplate"] as string,
          isBuiltIn,
          revision: row["revision"] as number,
          rowCountLabel: shape,
        }),
      );
    }
    return templates;
  });

/** The library view: saved templates plus built-in names. */
const buildLibraryView = () =>
  Effect.gen(function* () {
    const templates = yield* loadLibraryFromDb();
    return new TacticLibraryView({
      templates,
      builtInTemplateNames: [...BUILT_IN_TEMPLATE_NAMES],
    });
  });

// ---------------------------------------------------------------------------
// Load one template's full content (slots, team instructions) from DB
// ---------------------------------------------------------------------------

/**
 * Load a saved template's full tactical content (slots with cell/run/instructions/roles,
 * team instructions, team set pieces). Returns null if the row doesn't exist.
 * Assumes a `SqlClient` in context.
 */
const loadTemplateContent = (id: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const tacticRows = yield* sql.unsafe<Row>(
      `SELECT source_template AS "sourceTemplate",
              ${selectList(ALL_TEAM_COLUMNS)}
       FROM tactic_library WHERE id = ?`,
      [id],
    );
    const tacticRow = tacticRows[0];
    if (tacticRow === undefined) return null as Tactic | null;

    const slotRows = yield* sql.unsafe<Row>(
      `SELECT cell_row AS "cellRow", cell_column AS "cellColumn",
              run_row AS "runRow", run_column AS "runColumn",
              ${selectList([...SLOT_INSTRUCTION_FIELDS, ...SLOT_SET_PIECE_ROLE_FIELDS])}
       FROM tactic_library_slots WHERE library_id = ? ORDER BY slot_index`,
      [id],
    );

    const decoded = yield* Schema.decodeUnknownEffect(Tactic)({
      sourceTemplate: tacticRow["sourceTemplate"],
      team: {
        ...pick(tacticRow, TEAM_CHOICES),
        ...Object.fromEntries(TEAM_SWITCHES.map((name) => [name, tacticRow[name] === 1])),
      },
      teamSetPieces: pick(tacticRow, TEAM_SET_PIECE_FIELDS),
      slots: slotRows.map((row) => ({
        cell: { row: row["cellRow"], column: row["cellColumn"] },
        run:
          row["runRow"] === null || row["runColumn"] === null
            ? null
            : { row: row["runRow"], column: row["runColumn"] },
        instructions: pick(row, SLOT_INSTRUCTION_FIELDS),
        setPieceRoles: pick(row, SLOT_SET_PIECE_ROLE_FIELDS),
      })),
      // A template has no player assignments, bench, or takers — these are filled in on quick load
      assignments: [],
      bench: [],
      takers: { captain: [], penalties: [], freeKicksLeft: [], freeKicksRight: [], cornersLeft: [], cornersRight: [], throwInsLeft: [], throwInsRight: [] },
    });

    return decoded;
  });

// ---------------------------------------------------------------------------
// Check for unique name (case-insensitive)
// ---------------------------------------------------------------------------

const nameExists = (name: string, excludeId: number | null) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    if (excludeId !== null) {
      const rows = yield* sql<{ found: number }>`
        SELECT 1 as found FROM tactic_library WHERE name = ${name} COLLATE NOCASE AND id != ${excludeId}`;
      return rows.length > 0;
    }
    const rows = yield* sql<{ found: number }>`
      SELECT 1 as found FROM tactic_library WHERE name = ${name} COLLATE NOCASE`;
    return rows.length > 0;
  });

// ---------------------------------------------------------------------------
// Check if a request was already accepted (idempotency for write operations)
// ---------------------------------------------------------------------------

const idempotent = (requestId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ found: number }>`
      SELECT 1 as found FROM tactic_library WHERE write_request_id = ${requestId}`;
    return rows.length > 0;
  });

// ---------------------------------------------------------------------------
// Insert or update a template's slot rows (full replacement)
// ---------------------------------------------------------------------------

const persistTemplateSlots = (libraryId: number, tactic: Tactic) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM tactic_library_slots WHERE library_id = ${libraryId}`;
    const slotColumns = [...SLOT_INSTRUCTION_FIELDS, ...SLOT_SET_PIECE_ROLE_FIELDS];
    for (const [index, slot] of tactic.slots.entries()) {
      const values = [
        ...SLOT_INSTRUCTION_FIELDS.map((name) => slot.instructions[name as keyof typeof slot.instructions]),
        ...SLOT_SET_PIECE_ROLE_FIELDS.map((name) => slot.setPieceRoles[name as keyof typeof slot.setPieceRoles]),
      ];
      yield* sql.unsafe(
        `INSERT INTO tactic_library_slots (library_id, slot_index, cell_row, cell_column, run_row, run_column, ${slotColumns.map(snakeCase).join(", ")})
         VALUES (${placeholders(6 + slotColumns.length)})`,
        [libraryId, index, slot.cell.row, slot.cell.column, slot.run?.row ?? null, slot.run?.column ?? null, ...values],
      );
    }
  });

// ---------------------------------------------------------------------------
// Insert a new template row
// ---------------------------------------------------------------------------

const insertTemplate = (name: string, tactic: Tactic, requestId: string | null) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const teamValues = [
      ...TEAM_CHOICES.map((name) => tactic.team[name as keyof typeof tactic.team]),
      ...TEAM_SWITCHES.map((name) => (tactic.team[name] ? 1 : 0)),
      ...TEAM_SET_PIECE_FIELDS.map((name) => tactic.teamSetPieces[name as keyof typeof tactic.teamSetPieces]),
    ];

    const insertColumns = [...ALL_TEAM_COLUMNS.map(snakeCase)];
    const insertPlaceholders = placeholders(ALL_TEAM_COLUMNS.length);

    const result = yield* sql.unsafe<Row>(
      `INSERT INTO tactic_library (name, source_template, revision, is_built_in, ${insertColumns.join(", ")}${requestId !== null ? ", write_request_id" : ""})
       VALUES (?, ?, 0, 0, ${insertPlaceholders}${requestId !== null ? ", ?" : ""})
       RETURNING id`,
      requestId !== null
        ? [name, tactic.sourceTemplate, ...teamValues, requestId]
        : [name, tactic.sourceTemplate, ...teamValues],
    );

    const libraryId = result[0]!.id as number;
    yield* persistTemplateSlots(libraryId, tactic);
    return libraryId;
  });

// ---------------------------------------------------------------------------
// Delete one template's rows
// ---------------------------------------------------------------------------

const deleteTemplate = (id: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM tactic_library_slots WHERE library_id = ${id}`;
    yield* sql`DELETE FROM tactic_library WHERE id = ${id}`;
  });

// ---------------------------------------------------------------------------
// Validate a tactic against the squad
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const loadTacticLibrary = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    buildLibraryView().pipe(
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
          // Idempotency: if this request was already accepted, return current state
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView();
          }

          // Check unique name
          if (yield* nameExists(name, null)) {
            return yield* new TacticLibraryNameTakenError({ saveId, name });
          }

          // Validate tactic (slots, instructions, etc.)
          yield* validateTacticAgainstSquad(tactic);

          // Insert the new template
          yield* insertTemplate(name, tactic, requestId);
          return yield* buildLibraryView();
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
          // Idempotency
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView();
          }

          // Find the template
          const rows = yield* sql<{ revision: number; isBuiltIn: number; name: string }>`
            SELECT revision, is_built_in AS "isBuiltIn", name FROM tactic_library WHERE id = ${id}`;
          const row = rows[0];
          if (row === undefined) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }

          // Built-in guard
          if (row.isBuiltIn === 1) {
            return yield* new TacticLibraryReadOnlyError({ saveId, id, name: row.name });
          }

          // Revision guard
          if (row.revision !== expectedRevision) {
            return yield* new TacticLibraryRevisionConflictError({ saveId, id, currentRevision: row.revision });
          }

          // Check unique name (excluding ourselves)
          if (yield* nameExists(name, id)) {
            return yield* new TacticLibraryNameTakenError({ saveId, name });
          }

          yield* sql`
            UPDATE tactic_library SET name = ${name}, revision = revision + 1, write_request_id = ${requestId}
            WHERE id = ${id}`;
          return yield* buildLibraryView();
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
          // Idempotency
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView();
          }

          // Find the template
          const rows = yield* sql<{ revision: number; isBuiltIn: number; name: string }>`
            SELECT revision, is_built_in AS "isBuiltIn", name FROM tactic_library WHERE id = ${id}`;
          const row = rows[0];
          if (row === undefined) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }

          // Built-in guard
          if (row.isBuiltIn === 1) {
            return yield* new TacticLibraryReadOnlyError({ saveId, id, name: row.name });
          }

          // Revision guard
          if (row.revision !== expectedRevision) {
            return yield* new TacticLibraryRevisionConflictError({ saveId, id, currentRevision: row.revision });
          }

          // Validate tactic
          yield* validateTacticAgainstSquad(tactic);

          // Update the template
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
          return yield* buildLibraryView();
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
          // Idempotency
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView();
          }

          // Load the source template
          const content = yield* loadTemplateContent(id);
          if (content === null) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }

          // Generate a new name: "(copy)" suffix
          const rows = yield* sql<{ name: string }>`SELECT name FROM tactic_library WHERE id = ${id}`;
          const sourceName = rows[0]?.name ?? "Unknown";
          let newName = `${sourceName} (copy)`;

          // If the copy name is taken, keep appending
          let attempt = 1;
          while (yield* nameExists(newName, null)) {
            attempt++;
            newName = `${sourceName} (copy ${attempt})`;
          }

          // Insert the copy with a fixed source_template from the original
          yield* insertTemplate(newName, content, requestId);
          return yield* buildLibraryView();
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
          // Idempotency
          if (yield* idempotent(requestId)) {
            return yield* buildLibraryView();
          }

          // Find the template
          const rows = yield* sql<{ revision: number; isBuiltIn: number; name: string }>`
            SELECT revision, is_built_in AS "isBuiltIn", name FROM tactic_library WHERE id = ${id}`;
          const row = rows[0];
          if (row === undefined) {
            return yield* new TacticLibraryNotFoundError({ saveId, id });
          }

          // Built-in guard
          if (row.isBuiltIn === 1) {
            return yield* new TacticLibraryReadOnlyError({ saveId, id, name: row.name });
          }

          // Revision guard
          if (row.revision !== expectedRevision) {
            return yield* new TacticLibraryRevisionConflictError({ saveId, id, currentRevision: row.revision });
          }

          yield* deleteTemplate(id);
          return yield* buildLibraryView();
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
      const sql = yield* SqlClient;

      // Load the template content
      const content = yield* loadTemplateContent(id);
      if (content === null) {
        return yield* new TacticLibraryNotFoundError({ saveId, id });
      }

      const club = yield* loadUserClub;
      const squad = yield* loadSquadPlayers(club.id);

      // Load current tactic to preserve player assignments by slot index
      const currentTactic = yield* loadPersistedTactic(club.id);

      // Build new assignments: keep each player in his slot number
      const assignments = content.slots.map((_slot, slotIndex) => {
        if (currentTactic !== null && slotIndex < currentTactic.assignments.length) {
          return currentTactic.assignments[slotIndex]!;
        }
        if (slotIndex < squad.length) {
          return squad[slotIndex]!.id;
        }
        return "" as any;
      });

      // Keep the existing bench
      const bench = currentTactic !== null ? [...currentTactic.bench] : [];
      const takerLists: ReadonlyArray<TakerList> = ["captain", "penalties", "freeKicksLeft", "freeKicksRight", "cornersLeft", "cornersRight", "throwInsLeft", "throwInsRight"];

      const newTactic = new Tactic({
        sourceTemplate: content.sourceTemplate,
        slots: content.slots,
        team: content.team,
        teamSetPieces: content.teamSetPieces,
        assignments: assignments as any,
        bench: bench as any,
        takers: Object.fromEntries(takerLists.map((list) => [list, []])) as any,
      });

      return yield* changeTactics(savesDir, saveId, newTactic, 0, requestId as any);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );