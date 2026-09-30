/**
 * Filtering feature (note: Sorting and filtering by keyboard, AC-30). Filter
 * semantics are OURS — TanStack never sees a filter clause. Four clause kinds:
 * name search (Market/Free Agents), position (Squad, Market, Free Agents),
 * status (the owned Squad only — rival rows disclose no Condition), and
 * attribute thresholds, one per Attribute (the owned Squad only — they read
 * exact figures). Visible
 * compact controls and enumerated palette Actions back the same pure
 * `applyFilters`; the palette enumerates position and status (name search is
 * free-form and lives in the visible control). Empty clauses are inert, so
 * clearing is just removing the clause.
 */
import {
  POSITION_FILTERS,
  positionFilterName,
  type Attribute,
  type KnownFigure,
  type PositionFilter,
} from "@cm-clone/shared";
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

export interface AttributeThreshold {
  readonly attribute: Attribute;
  readonly min: number;
}

export const isAttributeClause = (
  filter: FilterClause,
): filter is Extract<FilterClause, { readonly _tag: "attribute" }> => filter._tag === "attribute";

/** The thresholds an attribute clause may carry: the Attribute scale. */
export const ATTRIBUTE_MINIMUMS: readonly number[] = Array.from({ length: 20 }, (_, i) => i + 1);

export const matchesNameSearch = (row: TableRowShape, query: string): boolean =>
  `${row.firstName} ${row.lastName}`.toLowerCase().includes(query.trim().toLowerCase());

export const matchesPosition = (row: TableRowShape, position: string): boolean => row.canPlay.includes(position);

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

/** The slot a clause occupies: one per kind, except attribute thresholds,
 *  which hold one slot per Attribute so several can apply at once (group-e 05). */
const slotOf = (filter: FilterClause): string =>
  filter._tag === "attribute" ? `attribute:${filter.attribute}` : filter._tag;

/** Fix a single clause in place (visible controls edit the clause by identity,
 *  never by index arithmetic that a reorder could corrupt). */
export const upsertFilter = (
  filters: readonly FilterClause[],
  next: FilterClause,
): readonly FilterClause[] => [
  ...filters.filter((f) => slotOf(f) !== slotOf(next)),
  next,
];

/** Remove the clause in `filter`'s slot (each slot holds at most one clause,
 *  enforced by `upsertFilter`). Position re-map needs nothing more: one
 *  position at a time is the model. */
export const removeFilter = (
  filters: readonly FilterClause[],
  filter: FilterClause,
): readonly FilterClause[] => filters.filter((f) => slotOf(f) !== slotOf(filter));

/** Replace every attribute threshold with `thresholds` in one step, leaving the
 *  other kinds alone. The Attribute dialog applies its whole draft this way, so
 *  one change reads as one notice. A repeated Attribute keeps its last threshold. */
export const replaceAttributeFilters = (
  filters: readonly FilterClause[],
  thresholds: readonly AttributeThreshold[],
): readonly FilterClause[] =>
  thresholds.reduce<readonly FilterClause[]>(
    (out, { attribute, min }) => upsertFilter(out, attributeClause(attribute, min)),
    filters.filter((f) => !isAttributeClause(f)),
  );

/** UNUSED-SHAPE guard: the named filter id used by generated actions. Position
 *  and status clauses produce `<position>` / `<abbreviation>` ids; the
 *  free-form name clause is never a palette row, so it needs no stable id here. */
export const clauseId = (filter: FilterClause): string => {
  switch (filter._tag) {
    case "position":
      return filter.position.toLowerCase().replace(" ", "-");
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
      return (POSITION_FILTERS as ReadonlyArray<string>).includes(filter.position)
        ? positionFilterName(filter.position as PositionFilter)
        : filter.position;
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

const CLAUSE_KIND_LABELS: Readonly<Record<FilterClause["_tag"], string>> = {
  position: "Position",
  status: "Status",
  attribute: "Attribute",
  nameSearch: "Name",
};

/** An empty name search filters nothing, so a notice treats it as absent. */
const liveClauses = (filters: readonly FilterClause[]): readonly FilterClause[] =>
  filters.filter((f) => f._tag !== "nameSearch" || f.query.trim() !== "");

const sameClause = (a: FilterClause, b: FilterClause): boolean =>
  a._tag === "nameSearch" && b._tag === "nameSearch" ? a.query === b.query : clauseId(a) === clauseId(b);

const describeClause = (filter: FilterClause): string =>
  filter._tag === "nameSearch" ? `name "${filter.query.trim()}"` : `${CLAUSE_KIND_LABELS[filter._tag]}: ${clauseLabel(filter)}`;

const nameQueryOf = (filters: readonly FilterClause[]): string => {
  const name = filters.find((f) => f._tag === "nameSearch");
  return name?._tag === "nameSearch" ? name.query.trim() : "";
};

/** True when two clause lists agree on everything but the name search. */
const sameApartFromName = (a: readonly FilterClause[], b: readonly FilterClause[]): boolean => {
  const rest = (filters: readonly FilterClause[]) => filters.filter((f) => f._tag !== "nameSearch");
  const [left, right] = [rest(a), rest(b)];
  return left.length === right.length && left.every((f) => right.some((g) => g._tag === f._tag && sameClause(f, g)));
};

/** The attribute set as one phrase ("Pace 15+, Finishing 14+"), in clause order. */
const attributeSummary = (filters: readonly FilterClause[]): string =>
  filters.filter(isAttributeClause).map(clauseLabel).join(", ");

/**
 * The bottom-bar line for a filter change: what changed, then how many rows
 * are left ("Filtered by Position: DC. 2 players match the current filters.").
 * Each other kind appears at most once, so the change is the one kind whose
 * clause was added, replaced or removed. The attribute thresholds change as a
 * set (the dialog applies them together), so they are named as a set. Anything
 * else falls back to the count alone.
 *
 * `null` when only the name search moved. That arrives once per keystroke, and
 * the bar line is a live region, so a line per letter would talk over the
 * typing; the table's own count already shows the result.
 */
export const filterChangeNotice = (
  before: readonly FilterClause[],
  after: readonly FilterClause[],
  count: number,
): string | null => {
  const prior = liveClauses(before);
  const next = liveClauses(after);
  if (nameQueryOf(prior) !== nameQueryOf(next) && sameApartFromName(prior, next)) return null;
  const matches = `${count} ${count === 1 ? "player matches" : "players match"} the current filters.`;
  if (next.length === 0 && prior.length > 0) {
    return `Cleared the filters. ${count} ${count === 1 ? "player is" : "players are"} shown.`;
  }
  const attributesBefore = attributeSummary(prior);
  const attributesAfter = attributeSummary(next);
  if (attributesBefore !== attributesAfter) {
    if (attributesAfter === "") return `Cleared the Attribute filter. ${matches}`;
    const kind = next.filter(isAttributeClause).length === 1 ? "Attribute" : "Attributes";
    return `Filtered by ${kind}: ${attributesAfter}. ${matches}`;
  }
  const priorKinds = prior.filter((f) => !isAttributeClause(f));
  const nextKinds = next.filter((f) => !isAttributeClause(f));
  const set = nextKinds.find((f) => {
    const was = priorKinds.find((p) => p._tag === f._tag);
    return was === undefined || !sameClause(was, f);
  });
  if (set !== undefined) return `Filtered by ${describeClause(set)}. ${matches}`;
  const removed = priorKinds.find((p) => !nextKinds.some((f) => f._tag === p._tag));
  if (removed !== undefined) {
    return removed._tag === "nameSearch"
      ? `Cleared the name search. ${matches}`
      : `Cleared the ${CLAUSE_KIND_LABELS[removed._tag]} filter. ${matches}`;
  }
  return matches;
};

const ready = (state: ScopeState): boolean => state.ready === true;

const positionFilterAction = (
  scope: ActionScope,
  tableId: TableId,
  position: string,
): Action => ({
  id: `filter-${tableId}-${position.toLowerCase().replace(" ", "-")}`,
  label: `Filter ${tableLabel(tableId)}: ${positionFilterName(position as PositionFilter)}`,
  scope,
  available: ready,
  handler: () => undefined,
  metadata: { params: { tableId, filter: positionClause(position) } satisfies FilterTableActionInput },
});

/** Enumerated position filters for one table: one palette row per position filter. */
export const positionFilterActions = (
  scope: ActionScope,
  tableId: TableId,
): ReadonlyArray<Action> => POSITION_FILTERS.map((position) => positionFilterAction(scope, tableId, position));

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