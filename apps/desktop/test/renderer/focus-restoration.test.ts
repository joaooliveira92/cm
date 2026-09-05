// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  resolveCollectionFocus,
  restoreCollectionFocus,
  rovingTabIndex,
  focusIdOf,
  setBusy,
  type CollectionFocusBookmark,
} from "../../src/renderer/focus.js";

describe("AC-21 — identity-based async restoration", () => {
  const ids = ["p-1", "p-2", "p-3"];

  it("resolves to the same item id when still present", () => {
    const bookmark: CollectionFocusBookmark = { item: "p-2", next: "p-3", prev: "p-1" };
    expect(resolveCollectionFocus(bookmark, ids)).toBe("p-2");
  });

  it("falls back to the old next neighbour when the item is gone", () => {
    const bookmark: CollectionFocusBookmark = { item: "p-2", next: "p-3", prev: "p-1" };
    expect(resolveCollectionFocus(bookmark, ["p-1", "p-3"])).toBe("p-3");
  });

  it("falls back to the old previous neighbour when next is also gone", () => {
    const bookmark: CollectionFocusBookmark = { item: "p-2", next: "p-9", prev: "p-1" };
    expect(resolveCollectionFocus(bookmark, ["p-1", "p-4"])).toBe("p-1");
  });

  it("falls back to the first present item when no bookmark id survives", () => {
    const bookmark: CollectionFocusBookmark = { item: "p-x", next: "p-y", prev: "p-z" };
    expect(resolveCollectionFocus(bookmark, ids)).toBe("p-1");
  });

  it("with no bookmark, focuses the first present item", () => {
    expect(resolveCollectionFocus(undefined, ids)).toBe("p-1");
  });

  it("an empty collection resolves to null (caller moves to the empty-state target), never a stale index", () => {
    expect(resolveCollectionFocus({ item: "p-2" }, [])).toBeNull();
  });

  it("roving tabindex keeps exactly the active row as a tab stop", () => {
    expect(rovingTabIndex("p-2", "p-2")).toBe(0);
    expect(rovingTabIndex("p-2", "p-1")).toBe(-1);
    expect(rovingTabIndex(null, "p-1")).toBe(-1);
  });

  it("restoration focuses the resolved item node in the DOM by identity", () => {
    document.body.innerHTML = `
      <div data-focus-id="squad.squadTable.p-2" tabindex="-1"></div>
      <div data-focus-id="squad.squadTable.p-1" tabindex="-1"></div>
    `;
    restoreCollectionFocus(
      { item: "p-2", next: "p-1" },
      ["p-1", "p-2"],
      (id) => focusIdOf("squad", "squadTable", id),
    );
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("squad.squadTable.p-2");
  });

  it("marking a region busy sets/clears aria-busy on the initiator", () => {
    const node = document.createElement("div");
    setBusy(node, true);
    expect(node.getAttribute("aria-busy")).toBe("true");
    setBusy(node, false);
    expect(node.getAttribute("aria-busy")).toBe("false");
  });
});
