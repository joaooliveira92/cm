import { describe, expect, it } from "vitest";
import {
  makeTableFocusBookmark,
  resolveTableFocus,
  type TableFocusBookmark,
} from "../../../src/renderer/table/focusBookmark.js";

describe("AC-31 — identity-based focus restoration with neighbour fallback", () => {
  const rows = ["p-1", "p-2", "p-3", "p-4"];

  it("restores the same player by stable id when it survives a sort/filter/refetch", () => {
    const bookmark: TableFocusBookmark = {
      tableId: "squad",
      itemId: "p-2",
      previousItemId: "p-1",
      nextItemId: "p-3",
    };
    // Sort reordered the rows but p-2 is still present.
    expect(resolveTableFocus(bookmark, ["p-4", "p-2", "p-1", "p-3"])).toBe("p-2");
  });

  it("falls back to the old NEXT neighbour when the item is filtered out", () => {
    const bookmark: TableFocusBookmark = {
      tableId: "squad",
      itemId: "p-2",
      previousItemId: "p-1",
      nextItemId: "p-3",
    };
    expect(resolveTableFocus(bookmark, ["p-1", "p-3", "p-4"])).toBe("p-3");
  });

  it("falls back to the old PREVIOUS neighbour when next is also gone", () => {
    const bookmark: TableFocusBookmark = {
      tableId: "squad",
      itemId: "p-2",
      previousItemId: "p-1",
      nextItemId: "p-x",
    };
    expect(resolveTableFocus(bookmark, ["p-1", "p-4"])).toBe("p-1");
  });

  it("falls back to the first visible row when no bookmark id survives", () => {
    const bookmark: TableFocusBookmark = {
      tableId: "squad",
      itemId: "p-x",
      previousItemId: "p-y",
      nextItemId: "p-z",
    };
    expect(resolveTableFocus(bookmark, rows)).toBe("p-1");
  });

  it("with no bookmark, focuses the first present row", () => {
    expect(resolveTableFocus(undefined, rows)).toBe("p-1");
    expect(resolveTableFocus(null, rows)).toBe("p-1");
  });

  it("an empty filtered set resolves to null — the caller moves to the empty-result target, never document.body", () => {
    const bookmark: TableFocusBookmark = { tableId: "squad", itemId: "p-2" };
    expect(resolveTableFocus(bookmark, [])).toBeNull();
  });

  it("makeTableFocusBookmark records the focused row + its neighbours", () => {
    expect(makeTableFocusBookmark("squad", rows, "p-2")).toEqual({
      tableId: "squad",
      itemId: "p-2",
      previousItemId: "p-1",
      nextItemId: "p-3",
    });
  });

  it("makeTableFocusBookmark returns null for a null/absent active id", () => {
    expect(makeTableFocusBookmark("squad", rows, null)).toBeNull();
    expect(makeTableFocusBookmark("squad", rows, "gone")).toBeNull();
  });
});