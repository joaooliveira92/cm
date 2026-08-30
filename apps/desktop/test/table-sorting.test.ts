import { describe, expect, it } from "vitest";
import {
  clearSortTableAction,
  cycleSort,
  sortDirectionFrom,
  sortDirectionOf,
  sortTableAction,
} from "../src/renderer/table/features/sorting.js";

describe("AC-30 — the header-button sort cycle (asc → desc → none) is a controlled transition law", () => {
  it("no sort + new column → asc", () => {
    expect(cycleSort(null, "age")).toEqual({ columnId: "age", direction: "asc" });
  });

  it("a different column restarts at asc", () => {
    expect(cycleSort({ columnId: "age", direction: "desc" }, "name")).toEqual({
      columnId: "name",
      direction: "asc",
    });
  });

  it("same column asc → desc → none (removal enabled)", () => {
    const asc = cycleSort(null, "overall")!;
    expect(asc).toEqual({ columnId: "overall", direction: "asc" });
    const desc = cycleSort(asc, "overall")!;
    expect(desc).toEqual({ columnId: "overall", direction: "desc" });
    expect(cycleSort(desc, "overall")).toBeNull();
  });
});

describe("AC-30 — direction naming matches the palette input spelling", () => {
  it("round-trips SortState <-> the palette-facing 'ascending'/'descending' strings", () => {
    expect(sortDirectionOf("asc")).toBe("ascending");
    expect(sortDirectionOf("desc")).toBe("descending");
    expect(sortDirectionFrom("ascending")).toBe("asc");
    expect(sortDirectionFrom("descending")).toBe("desc");
  });

  it("sort actions advertise the parameterized input in their metadata", () => {
    const action = sortTableAction("transfers", "transfer-market", "value", "Value", "descending");
    expect(action.id).toBe("sort-transfer-market-value-descending");
    expect(action.label).toContain("Market");
    expect(action.label).toContain("Value");
    expect((action.metadata as { params: unknown }).params).toEqual({
      tableId: "transfer-market",
      columnId: "value",
      direction: "descending",
    });
    const clear = clearSortTableAction("squad", "squad");
    expect(clear.id).toBe("clear-sort-squad");
    expect((clear.metadata as { params: unknown }).params).toEqual({ tableId: "squad" });
  });
});