/** DB persistence for the Tactic Library: CRUD for saved templates. */
import { Tactic, TacticLibraryView, TacticTemplateSummary } from "@cm-clone/contracts";
import {
  BUILT_IN_TEMPLATE_NAMES,
  PLAYER_OVERRIDE_VALUES,
  PLAYER_STANDALONE_VALUES,
  PLAYER_SWITCHES,
  rowCountLabel,
  SET_PIECE_ROLE_VALUES,
  TEAM_INSTRUCTION_VALUES,
  TEAM_SET_PIECE_VALUES,
  TEAM_SWITCHES,
  type TacticSlot,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

// ---------------------------------------------------------------------------
// Shared DB helpers
// ---------------------------------------------------------------------------

const snakeCase = (name: string): string => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const selectList = (fields: ReadonlyArray<string>): string =>
  fields.map((field) => `${snakeCase(field)} AS "${field}"`).join(", ");

export const TEAM_CHOICES = Object.keys(TEAM_INSTRUCTION_VALUES);
export const TEAM_SET_PIECE_FIELDS = Object.keys(TEAM_SET_PIECE_VALUES);
export const SLOT_INSTRUCTION_FIELDS = [
  ...Object.keys(PLAYER_OVERRIDE_VALUES),
  ...Object.keys(PLAYER_STANDALONE_VALUES),
  ...PLAYER_SWITCHES,
];
export const SLOT_SET_PIECE_ROLE_FIELDS = Object.keys(SET_PIECE_ROLE_VALUES);
export const ALL_TEAM_COLUMNS = [...TEAM_CHOICES, ...TEAM_SWITCHES, ...TEAM_SET_PIECE_FIELDS];

type Row = Readonly<Record<string, unknown>>;
export const pick = (row: Row, fields: ReadonlyArray<string>): Record<string, unknown> =>
  Object.fromEntries(fields.map((field) => [field, row[field]]));

const placeholders = (count: number): string => Array<string>(count).fill("?").join(", ");

// ---------------------------------------------------------------------------
// Load the full library from DB and derive built-in templates
// ---------------------------------------------------------------------------

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

export const buildLibraryView = Effect.gen(function* () {
    const templates = yield* loadLibraryFromDb();
    return new TacticLibraryView({
      templates,
      builtInTemplateNames: [...BUILT_IN_TEMPLATE_NAMES],
    });
  });

// ---------------------------------------------------------------------------
// Load one template's full content from DB
// ---------------------------------------------------------------------------

export const loadTemplateContent = (id: number) =>
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
              sub_row AS "subRow", sub_col AS "subCol",
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
        subRow: row["subRow"] as number,
        subCol: row["subCol"] as number,
      })),
      assignments: [],
      bench: [],
      takers: { captain: [], penalties: [], freeKicksLeft: [], freeKicksRight: [], cornersLeft: [], cornersRight: [], throwInsLeft: [], throwInsRight: [] },
    });

    return decoded;
  });

// ---------------------------------------------------------------------------
// Name uniqueness check (case-insensitive)
// ---------------------------------------------------------------------------

export const nameExists = (name: string, excludeId: number | null) =>
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
// Idempotency check
// ---------------------------------------------------------------------------

export const idempotent = (requestId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ found: number }>`
      SELECT 1 as found FROM tactic_library WHERE write_request_id = ${requestId}`;
    return rows.length > 0;
  });

// ---------------------------------------------------------------------------
// Slot persistence (full replacement)
// ---------------------------------------------------------------------------

export const persistTemplateSlots = (libraryId: number, tactic: Tactic) =>
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
        `INSERT INTO tactic_library_slots (library_id, slot_index, cell_row, cell_column, run_row, run_column, sub_row, sub_col, ${slotColumns.map(snakeCase).join(", ")})
         VALUES (${placeholders(8 + slotColumns.length)})`,
        [libraryId, index, slot.cell.row, slot.cell.column, slot.run?.row ?? null, slot.run?.column ?? null, slot.subRow, slot.subCol, ...values],
      );
    }
  });

// ---------------------------------------------------------------------------
// Insert a new template row
// ---------------------------------------------------------------------------

export const insertTemplate = (name: string, tactic: Tactic, requestId: string | null) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const teamValues = [
      ...TEAM_CHOICES.map((name) => tactic.team[name as keyof typeof tactic.team]),
      ...TEAM_SWITCHES.map((name) => (tactic.team[name] ? 1 : 0)),
      ...TEAM_SET_PIECE_FIELDS.map((name) => tactic.teamSetPieces[name as keyof typeof tactic.teamSetPieces]),
    ];

    const insertColumns = ALL_TEAM_COLUMNS.map(snakeCase);
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

export const deleteTemplate = (id: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    yield* sql`DELETE FROM tactic_library_slots WHERE library_id = ${id}`;
    yield* sql`DELETE FROM tactic_library WHERE id = ${id}`;
  });