import { describe, expect, it } from "vitest";
import { EMPTY_NEWS_FILTER } from "@cm-clone/shared";
import {
  bulkTargets,
  edgeSelection,
  isNarrowed,
  resolveSelection,
  stepSelection,
  toggleCategory,
  withSearch,
  withView,
} from "../../../src/renderer/news/inboxState.js";

const list = (...ids: ReadonlyArray<string>) => ids.map((messageId) => ({ messageId }));

describe("resolveSelection", () => {
  it("keeps a selection the list still contains", () => {
    expect(resolveSelection(list("a", "b", "c"), "b")).toBe("b");
  });

  it("keeps it even when newer messages arrive above it", () => {
    expect(resolveSelection(list("new", "a", "b"), "b")).toBe("b");
  });

  it("falls back to the first row when a filter hides the selection", () => {
    expect(resolveSelection(list("a", "c"), "b")).toBe("a");
  });

  it("selects the first row when nothing was selected", () => {
    expect(resolveSelection(list("a", "b"), null)).toBe("a");
  });

  it("selects nothing when the list is empty", () => {
    expect(resolveSelection([], "a")).toBeNull();
    expect(resolveSelection([], null)).toBeNull();
  });
});

describe("stepSelection", () => {
  const visible = list("a", "b", "c");

  it("moves forward and back", () => {
    expect(stepSelection(visible, "b", 1)).toBe("c");
    expect(stepSelection(visible, "b", -1)).toBe("a");
  });

  it("clamps at both ends rather than wrapping", () => {
    expect(stepSelection(visible, "c", 1)).toBe("c");
    expect(stepSelection(visible, "a", -1)).toBe("a");
  });

  it("starts at the first row when the selection is not in the list", () => {
    expect(stepSelection(visible, "gone", 1)).toBe("a");
    expect(stepSelection(visible, null, -1)).toBe("a");
  });

  it("selects nothing in an empty list", () => {
    expect(stepSelection([], "a", 1)).toBeNull();
  });
});

describe("edgeSelection", () => {
  it("jumps to the first and last visible message", () => {
    expect(edgeSelection(list("a", "b", "c"), "first")).toBe("a");
    expect(edgeSelection(list("a", "b", "c"), "last")).toBe("c");
  });

  it("selects nothing in an empty list", () => {
    expect(edgeSelection([], "first")).toBeNull();
  });
});

describe("toggleCategory", () => {
  it("adds a category that is not selected", () => {
    expect(toggleCategory([], "board")).toEqual(["board"]);
  });

  it("removes one that is", () => {
    expect(toggleCategory(["board", "result"], "board")).toEqual(["result"]);
  });

  it("returns to no constraint when the last category is deselected", () => {
    expect(toggleCategory(["board"], "board")).toEqual([]);
  });
});

describe("isNarrowed", () => {
  it("is false for the untouched filter", () => {
    expect(isNarrowed(EMPTY_NEWS_FILTER)).toBe(false);
  });

  it("is true for any narrowing axis", () => {
    expect(isNarrowed(withView(EMPTY_NEWS_FILTER, "unread"))).toBe(true);
    expect(isNarrowed({ ...EMPTY_NEWS_FILTER, categories: ["board"] })).toBe(true);
    expect(isNarrowed(withSearch(EMPTY_NEWS_FILTER, "board"))).toBe(true);
  });

  it("treats a whitespace-only search as no search", () => {
    expect(isNarrowed(withSearch(EMPTY_NEWS_FILTER, "   "))).toBe(false);
  });
});

describe("bulkTargets", () => {
  const visible = [
    { messageId: "a", state: "unread" },
    { messageId: "b", state: "read" },
    { messageId: "c", state: "archived" },
  ];

  it("marks read only what is unread", () => {
    expect(bulkTargets(visible, "read")).toEqual(["a"]);
  });

  it("marks unread only what is read", () => {
    expect(bulkTargets(visible, "unread")).toEqual(["b"]);
  });

  it("archives everything not already archived", () => {
    expect(bulkTargets(visible, "archive")).toEqual(["a", "b"]);
  });

  it("restores only what is archived", () => {
    expect(bulkTargets(visible, "restore")).toEqual(["c"]);
  });

  it("returns nothing when no visible message is eligible", () => {
    expect(bulkTargets([{ messageId: "a", state: "read" }], "read")).toEqual([]);
  });
});
