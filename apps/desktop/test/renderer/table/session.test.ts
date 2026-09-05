import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TABLE_SESSION,
  discardSelectionForNavigation,
  readTableSession,
  resetTableSessions,
  updateTableSession,
} from "../../../src/renderer/table/tableState.js";

describe("AC-27 — session-scoped table state per TableId", () => {
  beforeEach(() => {
    resetTableSessions();
  });
  afterEach(() => {
    resetTableSessions();
  });

  it("an unknown table reads as null (mounts seed from the defaults)", () => {
    expect(readTableSession("squad")).toBeNull();
  });

  it("sort/filters/scroll/bookmark survive across component rerenders AND navigation (session)", () => {
    updateTableSession("squad", { sort: { columnId: "age", direction: "desc" } });
    updateTableSession("squad", {
      filters: [{ _tag: "position", position: "GK" }],
      scrollLeft: 480,
    });
    const session = readTableSession("squad")!;
    expect(session.sort).toEqual({ columnId: "age", direction: "desc" });
    expect(session.filters).toEqual([{ _tag: "position", position: "GK" }]);
    expect(session.scrollLeft).toBe(480);
  });

  it("sessions are per-table — one table's state never leaks into another", () => {
    updateTableSession("squad", { sort: { columnId: "age", direction: "asc" } });
    updateTableSession("transfer-market", { sort: { columnId: "value", direction: "desc" } });
    expect(readTableSession("squad")!.sort!.columnId).toBe("age");
    expect(readTableSession("transfer-market")!.sort!.columnId).toBe("value");
    expect(readTableSession("free-agents")).toBeNull();
  });

  it("selection is cleared on navigation (discardSelectionForNavigation) — the Actions region must never act on a stale player", () => {
    updateTableSession("squad", { selectedId: "p-1" });
    updateTableSession("squad", { sort: { columnId: "age", direction: "asc" } });
    discardSelectionForNavigation("squad");
    const session = readTableSession("squad")!;
    expect(session.selectedId).toBeNull();
    // The rest of the session is untouched — only selection is cleared.
    expect(session.sort).toEqual({ columnId: "age", direction: "asc" });
  });

  it("updating an empty table starts from the session defaults", () => {
    const next = updateTableSession("league-table", {});
    expect(next).toEqual(DEFAULT_TABLE_SESSION);
  });
});