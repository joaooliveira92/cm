/**
 * Filtering feature (note: Sorting and filtering by keyboard, AC-30). Filter
 * semantics are OURS — TanStack never sees a filter clause. Four clause kinds:
 * name search (Market/Free Agents), position (Squad, Market, Free Agents),
 * status (the owned Squad only — rival rows disclose no Condition), and an
 * attribute threshold (the owned Squad only — it reads exact figures). Visible
 * compact controls and enumerated palette Actions back the same pure
 * `applyFilters`; the palette enumerates position and status (name search is
 * free-form and lives in the visible control). Empty clauses are inert, so
 * clearing is just removing the clause.
 */
import { POSITIONS, type Attribute, type KnownFigure } from "@cm-clone/shared";
import type { Action, ActionScope, ScopeState } from "../../actions/types.js";
import type { FilterClause, TableId, TableRowShape } from "../types.js";
import {
  MODELED_STATUSES,
  RESERVED_STATUSES,
  statusesOf,
  type StatusSource,
} from "../squad/playerStatus.js";
import { SQUAD_COLUMN_LABELS } from "../squad/squadColumns.js";
import { tableLabel } from "./sorting.js";

export interface FilterTableActionInput {
  readonly tableId: TableId;
  readonly filter: FilterClause;
}

export interface ClearFilterTableActionInput {
  readonly tableId: TableId;
}

export const EMPTY_FILTERS: readonly FilterClause[] = [];

export const nameSearchClause = (query: string): FilterClause => ({
  _tag: "nameSearch",
  query,
});

export const positionClause = (position: string): FilterClause => ({
  _tag: "position",
  position,
});

export const statusClause = (status: string): FilterClause => ({
  _tag: "status",
  status,
});

export const attributeClause = (attribute: Attribute, min: number): FilterClause => ({
  _tag: "attribute",
  attribute,
  min,
});

/** The thresholds an attribute clause may carry: the Attribute scale. */
export const ATTRIBUTE_MINIMUMS: readonly number[] = Array.from({ length: 20 }, (_, i) => i + 1);

export const matchesNameSearch = (row: TableRowShape, query: string): boolean =>
  `${row.firstName} ${row.lastName}`.toLowerCase().includes(query.trim().toLowerCase());

export const matchesPosition = (row: TableRowShape, position: string): boolean =>
  row.positions.some((p) => p.position === position);

/** A row that carries a Condition field. `TableRowShape` deliberately has none —
 *  the market and rival rosters disclose no fitness — so a status clause narrows
 *  per row instead of widening the shared shape. */
const bearsCondition = (row: TableRowShape): row is TableRowShape & StatusSource => "condition" in row;

/** Defers to `statusesOf`, so the filter and the Status column cannot drift:
 *  a row matches exactly when its cell would render that abbreviation. */
export const matchesStatus = (row: TableRowShape, status: string): boolean =>
  bearsCondition(row) && statusesOf(row).some((s) => s.abbreviation === status);

/** A row that carries per-Attribute figures. Like Condition, `TableRowShape` has
 *  none — the attribute clause narrows per row rather than widening the base. */
const bearsAttributes = (
  row: TableRowShape,
): row is TableRowShape & { readonly attributes: Readonly<Record<string, KnownFigure | undefined>> } =>
  "attributes" in row;

/** Only an exact figure can meet a threshold. A band is never resolved to a
 *  midpoint here: the owned Squad reads exact by rule, and anywhere a band could
 *  appear, matching it would disclose what the band withholds (group-e 03). */
export const matchesAttribute = (row: TableRowShape, attribute: Attribute, min: number): boolean => {
  if (!bearsAttributes(row)) return false;
  const figure = row.attributes[attribute];
  return figure !== undefined && figure._tag === "exact" && figure.value >= min;
};

/** Fold every clause over the row set. Inert clauses fall through untouched.
 *  Generic over the row subtype so a concrete table keeps its row type. */
export const applyFilters = <R extends TableRowShape>(
  rows: readonly R[],
  filters: readonly FilterClause[],
): readonly R[] => {
  let out = rows;
  for (const filter of filters) {
    switch (filter._tag) {
      case "nameSearch":
        if (filter.query.trim() !== "") out = out.filter((r) => matchesNameSearch(r, filter.query));
        break;
      case "position":
        out = out.filter((r) => matchesPosition(r, filter.position));
        break;
      case "status":
        out = out.filter((r) => matchesStatus(r, filter.status));
        break;
      case "attribute":
        out = out.filter((r) => matchesAttribute(r, filter.attribute, filter.min));
        break;
    }
  }
  return out;
};

export const clearFilters = (): readonly FilterClause[] => EMPTY_FILTERS;

/** Fix a single clause in place (visible controls edit the clause by identity,
 *  never by index arithmetic that a reorder could corrupt). */
export const upsertFilter = (
  filters: readonly FilterClause[],
  next: FilterClause,
): readonly FilterClause[] => [
  ...filters.filter((f) => f._tag !== next._tag),
  next,
];

/** Remove the whole clause kind (each kind is present at most once, enforced
 *  by `upsertFilter`). Position re-map needs nothing more: one position at a
 *  time is the model. */
export const removeFilter = (
  filters: readonly FilterClause[],
  filter: FilterClause,
): readonly FilterClause[] => filters.filter((f) => f._tag !== filter._tag);

/** UNUSED-SHAPE guard: the named filter id used by generated actions. Position
 *  and status clauses produce `<position>` / `<abbreviation>` ids; the
 *  free-form name clause is never a palette row, so it needs no stable id here. */
export const clauseId = (filter: FilterClause): string => {
  switch (filter._tag) {
    case "position":
      return filter.position.toLowerCase();
    case "status":
      return filter.status.toLowerCase();
    case "attribute":
      return `${filter.attribute.toLowerCase()}-${filter.min}`;
    case "nameSearch":
      return "name";
  }
};

/** The palette row label for an enumerable clause. A status reads as its full
 *  term ("Tired"), never the three-letter code. */
export const clauseLabel = (filter: FilterClause): string => {
  switch (filter._tag) {
    case "position":
      return filter.position;
    case "status": {
      const status = RESERVED_STATUSES.find((s) => s.abbreviation === filter.status);
      return status === undefined ? filter.status : status.term;
    }
    case "attribute":
      return `${SQUAD_COLUMN_LABELS[filter.attribute] ?? filter.attribute} ${filter.min}+`;
    case "nameSearch":
      return "name search";
  }
};

const ready = (state: ScopeState): boolean => state.ready === true;

const positionFilterAction = (
  scope: ActionScope,
  tableId: TableId,
  position: string,
): Action => ({
  id: `filter-${tableId}-${position.toLowerCase()}`,
  label: `Filter ${tableLabel(tableId)}: ${position}`,
  scope,
  available: ready,
  handler: () => undefined,
  metadata: { params: { tableId, filter: positionClause(position) } satisfies FilterTableActionInput },
});

/** Enumerated position filters for one table: one palette row per Position. */
export const positionFilterActions = (
  scope: ActionScope,
  tableId: TableId,
): ReadonlyArray<Action> => POSITIONS.map((position) => positionFilterAction(scope, tableId, position));

/** Enumerated status filters for one table: one palette row per status the
 *  engine models (Tired today), so the palette cannot offer an invented state.
 *  The caller decides which tables get them — only the owned Squad does. */
export const statusFilterActions = (
  scope: ActionScope,
  tableId: TableId,
): ReadonlyArray<Action> =>
  MODELED_STATUSES.map((status) => ({
    id: `filter-${tableId}-${status.abbreviation.toLowerCase()}`,
    label: `Filter ${tableLabel(tableId)}: ${status.term}`,
    scope,
    available: ready,
    handler: () => undefined,
    metadata: {
      params: { tableId, filter: statusClause(status.abbreviation) } satisfies FilterTableActionInput,
    },
  }));

export const clearFilterTableAction = (
  scope: ActionScope,
  tableId: TableId,
): Action => ({
  id: `clear-filters-${tableId}`,
  label: `Clear ${tableLabel(tableId)} filters`,
  scope,
  available: ready,
  handler: () => undefined,
  metadata: { params: { tableId } satisfies ClearFilterTableActionInput },
});