// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  applyFilters,
  clearFilters,
  EMPTY_FILTERS,
  nameSearchClause,
  positionClause,
  removeFilter,
  upsertFilter,
  matchesNameSearch,
  matchesPosition,
} from "../../../src/renderer/table/features/filtering.js";
import { classifyTableParamAction } from "../../../src/renderer/table/paramActions.js";
import {
  tableSortAndFilterActions,
  SQUAD_PALETTE_OPTIONS,
  MARKET_PALETTE_OPTIONS,
} from "../../../src/renderer/table/paletteActions.js";

interface Row {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly positions: ReadonlyArray<{ readonly position: string }>;
}

const row = (id: string, firstName: string, lastName: string, positions: string[]): Row => ({
  id,
  firstName,
  lastName,
  positions: positions.map((position) => ({ position })),
});

const dataset: readonly Row[] = [
  row("p1", "Alan", "Keeper", ["GK"]),
  row("p2", "Bob", "Defender", ["DC", "DM"]),
  row("p3", "Ari", "Striker", ["ST"]),
];

describe("AC-30 — filter semantics (OURS, never TanStack's)", () => {
  it("name search is a case-insensitive substring over the display name", () => {
    expect(applyFilters(dataset, [nameSearchClause("al")]).map((r) => r.id)).toEqual(["p1"]);
    expect(applyFilters(dataset, [nameSearchClause("KeEP")]).map((r) => r.id)).toEqual(["p1"]);
    expect(matchesNameSearch(dataset[1]!, "bob def")).toBe(true);
  });

  it("position filter matches any position in the row's positions array", () => {
    expect(applyFilters(dataset, [positionClause("DC")]).map((r) => r.id)).toEqual(["p2"]);
    expect(matchesPosition(dataset[1]!, "DM")).toBe(true);
    expect(applyFilters(dataset, [positionClause("GK")]).map((r) => r.id)).toEqual(["p1"]);
  });

  it("clauses fold together (name AND position)", () => {
    const both = applyFilters(dataset, [nameSearchClause("a"), positionClause("ST")]);
    expect(both.map((r) => r.id)).toEqual(["p3"]);
  });

  it("an empty name-search clause is inert and never hides rows", () => {
    expect(applyFilters(dataset, [nameSearchClause("   ")]).map((r) => r.id)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
  });

  it("clearFilters returns the empty set", () => {
    expect(clearFilters()).toBe(EMPTY_FILTERS);
    expect(clearFilters()).toHaveLength(0);
  });
});

describe("AC-30 — visible-filter edit helpers (clause by identity, never index)", () => {
  it("upsertFilter replaces the existing clause of the same kind", () => {
    const one = upsertFilter([], positionClause("GK"));
    expect(one).toEqual([{ _tag: "position", position: "GK" }]);
    const retargeted = upsertFilter(one, positionClause("ST"));
    expect(retargeted).toEqual([{ _tag: "position", position: "ST" }]);
  });

  it("upsertFilter keeps different clause kinds side by side", () => {
    const both = upsertFilter([positionClause("GK")], nameSearchClause("al"));
    expect(both).toHaveLength(2);
  });

  it("removeFilter drops the whole clause kind", () => {
    const both = upsertFilter([positionClause("GK")], nameSearchClause("al"));
    expect(removeFilter(both, positionClause("GK"))).toEqual([nameSearchClause("al")]);
  });
});

describe("AC-30 — the palette and header back the SAME command (param classification)", () => {
  const marketActions = tableSortAndFilterActions(MARKET_PALETTE_OPTIONS);

  it("sort-<table>-<column>-ascending/descending classify to set-sort with a typed SortState", () => {
    const asc = marketActions.find((a) => a.id === "sort-transfer-market-name-ascending")!;
    expect(asc.metadata).toBeDefined();
    const params = (asc.metadata! as { params: unknown }).params;
    expect(classifyTableParamAction(asc.id, params)).toEqual({
      kind: "set-sort",
      tableId: "transfer-market",
      sort: { columnId: "name", direction: "asc" },
    });
    const desc = marketActions.find((a) => a.id === "sort-transfer-market-value-descending")!;
    const descParams = (desc.metadata! as { params: unknown }).params;
    expect(classifyTableParamAction(desc.id, descParams)).toEqual({
      kind: "set-sort",
      tableId: "transfer-market",
      sort: { columnId: "value", direction: "desc" },
    });
  });

  it("filter-<table>-<position> classifies to set-filter carrying a position clause", () => {
    const filter = marketActions.find((a) => a.id === "filter-transfer-market-mc")!;
    const params = (filter.metadata! as { params: unknown }).params;
    expect(classifyTableParamAction(filter.id, params)).toEqual({
      kind: "set-filter",
      tableId: "transfer-market",
      filter: { _tag: "position", position: "MC" },
    });
  });

  it("clear-sort / clear-filters classify by prefix", () => {
    const clearSort = marketActions.find((a) => a.id === "clear-sort-transfer-market")!;
    expect(
      classifyTableParamAction(clearSort.id, { tableId: "transfer-market" }),
    ).toEqual({ kind: "clear-sort", tableId: "transfer-market" });
    const clearFilters = marketActions.find((a) => a.id === "clear-filters-transfer-market")!;
    expect(
      classifyTableParamAction(clearFilters.id, { tableId: "transfer-market" }),
    ).toEqual({ kind: "clear-filters", tableId: "transfer-market" });
  });

  it("malformed params classify to null (a handler must never act on garbage)", () => {
    const asc = marketActions.find((a) => a.id === "sort-transfer-market-name-ascending")!;
    expect(classifyTableParamAction(asc.id, null)).toBeNull();
    expect(classifyTableParamAction(asc.id, { tableId: "nope" })).toBeNull();
    expect(classifyTableParamAction(asc.id, {})).toBeNull();
  });

  it("the squad palette also enumerates the position dimension", () => {
    const squadActions = tableSortAndFilterActions(SQUAD_PALETTE_OPTIONS);
    expect(squadActions.some((a) => a.id === "filter-squad-gk")).toBe(true);
    expect(squadActions.some((a) => a.id === "sort-squad-overall-descending")).toBe(true);
  });

  it("name search has no palette row (visible control only), but every enumerated row carries typed params", () => {
    // 4 sortable columns × 2 directions + clear-sort + 10 positions + clear-filters
    expect(marketActions).toHaveLength(4 * 2 + 1 + 10 + 1);
    for (const action of marketActions) {
      expect((action.metadata as { params: unknown }).params).toBeDefined();
    }
  });
});