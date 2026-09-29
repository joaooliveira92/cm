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
  matchesStatus,
  statusClause,
  clauseLabel,
  attributeClause,
  replaceAttributeFilters,
  matchesAttribute,
  filterChangeNotice,
} from "../../../src/renderer/table/features/filtering.js";
import { NON_CONTACT_CONDITION_THRESHOLD } from "@cm-clone/game-engine";
import { classifyTableParamAction } from "../../../src/renderer/table/paramActions.js";
import {
  tableSortAndFilterActions,
  SQUAD_PALETTE_OPTIONS,
  MARKET_PALETTE_OPTIONS,
  FREE_AGENT_PALETTE_OPTIONS,
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
describe("Screen 71 — the status filter (group-e 02)", () => {
  interface ConditionRow extends Row {
    readonly condition?: number;
  }

  const withCondition = (base: Row, condition: number | undefined): ConditionRow =>
    condition === undefined ? base : { ...base, condition };

  const TIRED = NON_CONTACT_CONDITION_THRESHOLD - 1;
  const squad: readonly ConditionRow[] = [
    withCondition(row("t1", "Tom", "Tired", ["DC"]), TIRED),
    withCondition(row("f1", "Fay", "Fresh", ["DC"]), 100),
    withCondition(row("t2", "Tia", "Striker", ["ST"]), TIRED),
    // A rival's row: no Condition disclosed, so it can never carry a status.
    withCondition(row("r1", "Ron", "Rival", ["DC"]), undefined),
  ];

  it("matches through the status vocabulary, with the engine's threshold as the boundary", () => {
    expect(matchesStatus(withCondition(dataset[0]!, TIRED), "Tir")).toBe(true);
    // At the threshold the engine rolls no fatigue injury, so the player is not Tired.
    expect(matchesStatus(withCondition(dataset[0]!, NON_CONTACT_CONDITION_THRESHOLD), "Tir")).toBe(false);
    expect(matchesStatus(dataset[0]!, "Tir")).toBe(false);
    // A reserved but unmodelled abbreviation matches nobody: the filter cannot invent state.
    expect(matchesStatus(withCondition(dataset[0]!, TIRED), "Inj")).toBe(false);
  });

  it("folds a status clause together with a position clause", () => {
    expect(applyFilters(squad, [statusClause("Tir")]).map((r) => r.id)).toEqual(["t1", "t2"]);
    expect(applyFilters(squad, [positionClause("DC"), statusClause("Tir")]).map((r) => r.id)).toEqual(["t1"]);
  });

  it("keeps the status and position clauses side by side, and removes one without the other", () => {
    const both = upsertFilter([positionClause("DC")], statusClause("Tir"));
    expect(both).toEqual([positionClause("DC"), statusClause("Tir")]);
    expect(removeFilter(both, positionClause("DC"))).toEqual([statusClause("Tir")]);
    expect(removeFilter(both, statusClause("Tir"))).toEqual([positionClause("DC")]);
  });

  it("labels a status clause by its full term, never the abbreviation", () => {
    expect(clauseLabel(statusClause("Tir"))).toBe("Tired");
  });

  it("offers a status palette row on the owned Squad only, dispatching a typed clause", () => {
    const squadActions = tableSortAndFilterActions(SQUAD_PALETTE_OPTIONS);
    const tired = squadActions.find((a) => a.id === "filter-squad-tir")!;
    expect(tired.label).toBe("Filter Squad: Tired");
    expect(classifyTableParamAction(tired.id, (tired.metadata as { params: unknown }).params)).toEqual({
      kind: "set-filter",
      tableId: "squad",
      filter: { _tag: "status", status: "Tir" },
    });
    for (const options of [MARKET_PALETTE_OPTIONS, FREE_AGENT_PALETTE_OPTIONS]) {
      expect(tableSortAndFilterActions(options).some((a) => a.id.endsWith("-tir"))).toBe(false);
    }
  });

  it("gives every Squad palette row a distinct id, so a status can never shadow a position", () => {
    const ids = tableSortAndFilterActions(SQUAD_PALETTE_OPTIONS).map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Screen 71 — the attribute thresholds (group-e 04, 05)", () => {
  type Figure = { readonly _tag: "exact"; readonly value: number } | { readonly _tag: "range"; readonly low: number; readonly high: number };
  interface SquadLikeRow extends Row {
    readonly condition: number;
    readonly attributes: Readonly<Record<string, Figure | undefined>>;
  }
  const exact = (value: number): Figure => ({ _tag: "exact", value });
  const squadRow = (id: string, position: string, condition: number, pace: Figure | undefined): SquadLikeRow => ({
    ...row(id, id, "Player", [position]),
    condition,
    attributes: { pace },
  });
  const TIRED = NON_CONTACT_CONDITION_THRESHOLD - 1;

  it("meets the threshold only with an exact figure at or above it", () => {
    expect(matchesAttribute(squadRow("a", "DC", 100, exact(15)), "pace", 15)).toBe(true);
    expect(matchesAttribute(squadRow("b", "DC", 100, exact(14)), "pace", 15)).toBe(false);
    // A band is never resolved to its midpoint, even one wholly above the threshold.
    expect(matchesAttribute(squadRow("c", "DC", 100, { _tag: "range", low: 16, high: 18 }), "pace", 15)).toBe(false);
    expect(matchesAttribute(squadRow("d", "DC", 100, undefined), "pace", 15)).toBe(false);
    // A row with no attributes at all — a market row's shape — never matches.
    expect(matchesAttribute(row("e", "E", "Market", ["DC"]), "pace", 1)).toBe(false);
  });

  it("folds with position and status, keeping only rows that match all three", () => {
    const rows = [
      squadRow("keep", "DC", TIRED, exact(16)),
      squadRow("slow", "DC", TIRED, exact(10)),
      squadRow("fresh", "DC", 100, exact(18)),
      squadRow("striker", "ST", TIRED, exact(18)),
    ];
    const filters = [positionClause("DC"), statusClause("Tir"), attributeClause("pace", 15)];
    expect(applyFilters(rows, filters).map((r) => r.id)).toEqual(["keep"]);
  });

  it("holds one clause per Attribute, replacing and removing it without touching the others", () => {
    const first = upsertFilter([positionClause("DC")], attributeClause("pace", 15));
    const both = upsertFilter(first, attributeClause("strength", 12));
    expect(both).toEqual([positionClause("DC"), attributeClause("pace", 15), attributeClause("strength", 12)]);
    const raised = upsertFilter(both, attributeClause("pace", 17));
    expect(raised).toEqual([positionClause("DC"), attributeClause("strength", 12), attributeClause("pace", 17)]);
    expect(removeFilter(raised, attributeClause("strength", 12))).toEqual([
      positionClause("DC"),
      attributeClause("pace", 17),
    ]);
  });

  it("keeps only rows meeting every threshold", () => {
    const paceAndStrength = (id: string, pace: number, strength: number) => ({
      ...squadRow(id, "DC", TIRED, exact(pace)),
      attributes: { pace: exact(pace), strength: exact(strength) },
    });
    const rows = [paceAndStrength("both", 16, 14), paceAndStrength("fast", 16, 8), paceAndStrength("strong", 9, 14)];
    const filters = [attributeClause("pace", 15), attributeClause("strength", 12)];
    expect(applyFilters(rows, filters).map((r) => r.id)).toEqual(["both"]);
  });

  it("replaces the whole attribute set in one step, leaving the other kinds alone", () => {
    const before = [positionClause("DC"), attributeClause("pace", 15), statusClause("Tir")];
    expect(
      replaceAttributeFilters(before, [
        { attribute: "strength", min: 12 },
        { attribute: "finishing", min: 14 },
      ]),
    ).toEqual([positionClause("DC"), statusClause("Tir"), attributeClause("strength", 12), attributeClause("finishing", 14)]);
    expect(replaceAttributeFilters(before, [])).toEqual([positionClause("DC"), statusClause("Tir")]);
  });

  it("labels the clause by the column header's name and the threshold", () => {
    expect(clauseLabel(attributeClause("pace", 15))).toBe("Pace 15+");
  });
});

describe("filterChangeNotice — the bottom-bar line for a filter change", () => {
  it("names the clause that was set, then the count", () => {
    expect(filterChangeNotice([], [positionClause("DC")], 2)).toBe(
      "Filtered by Position: DC. 2 players match the current filters.",
    );
    expect(filterChangeNotice([positionClause("DC")], [positionClause("DC"), statusClause("Tir")], 1)).toBe(
      "Filtered by Status: Tired. 1 player matches the current filters.",
    );
  });

  it("names a replaced attribute threshold by its new value", () => {
    expect(filterChangeNotice([attributeClause("pace", 12)], [attributeClause("pace", 15)], 3)).toBe(
      "Filtered by Attribute: Pace 15+. 3 players match the current filters.",
    );
  });

  it("names the attribute thresholds as a set, and says when they are cleared", () => {
    const pace = attributeClause("pace", 15);
    const strength = attributeClause("strength", 12);
    expect(filterChangeNotice([pace], [pace, strength], 2)).toBe(
      "Filtered by Attributes: Pace 15+, Strength 12+. 2 players match the current filters.",
    );
    expect(filterChangeNotice([positionClause("DC"), pace, strength], [positionClause("DC")], 5)).toBe(
      "Cleared the Attribute filter. 5 players match the current filters.",
    );
    // An unchanged set with a changed Position names the Position, not the attributes.
    expect(filterChangeNotice([pace, strength], [pace, strength, positionClause("ST")], 1)).toBe(
      "Filtered by Position: ST. 1 player matches the current filters.",
    );
  });

  it("names the kind that was removed, and says so when nothing is left", () => {
    const both = [positionClause("DC"), statusClause("Tir")];
    expect(filterChangeNotice(both, [positionClause("DC")], 4)).toBe(
      "Cleared the Status filter. 4 players match the current filters.",
    );
    expect(filterChangeNotice([positionClause("DC")], [], 1)).toBe("Cleared the filters. 1 player is shown.");
  });

  it("treats an empty name search as no filter, and quotes a typed one", () => {
    expect(filterChangeNotice([], [nameSearchClause("  ")], 9)).toBe("9 players match the current filters.");
    expect(filterChangeNotice([], [nameSearchClause("ala")], 1)).toBe(
      'Filtered by name "ala". 1 player matches the current filters.',
    );
    expect(filterChangeNotice([nameSearchClause("ala")], [nameSearchClause("")], 9)).toBe(
      "Cleared the filters. 9 players are shown.",
    );
  });
});
