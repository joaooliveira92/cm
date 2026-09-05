// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  activeFilterCount,
  deriveRefreshState,
  deriveViewState,
  STATE_COPY,
} from "../../../src/renderer/table/viewState.js";
import { announce, resetAnnouncements } from "../../../src/renderer/table/announcement.js";

describe("AC-32 — the five explicit TableViewState result states", () => {
  it("InitialLoading while the atom has not produced a value", () => {
    expect(
      deriveViewState({ status: "loading", totalRows: 0, visibleRows: 0, filters: [] }),
    ).toEqual({ _tag: "InitialLoading" });
  });

  it("LoadError on a blocking load failure dominates every row count", () => {
    expect(
      deriveViewState({
        status: "failure",
        errorMessage: "We could not load the players.",
        totalRows: 5,
        visibleRows: 5,
        filters: [],
      }),
    ).toEqual({ _tag: "LoadError", error: { message: "We could not load the players." } });
  });

  it("EmptyDataset when no rows exist in the dataset at all", () => {
    expect(
      deriveViewState({ status: "success", totalRows: 0, visibleRows: 0, filters: [] }),
    ).toEqual({ _tag: "EmptyDataset" });
  });

  it("NoFilterResults when rows exist but filters hid every one — carries the active filter count", () => {
    expect(
      deriveViewState({
        status: "success",
        totalRows: 8,
        visibleRows: 0,
        filters: [{ _tag: "position", position: "GK" }, { _tag: "nameSearch", query: "zzz" }],
      }),
    ).toEqual({ _tag: "NoFilterResults", activeFilterCount: 2 });
  });

  it("Populated otherwise, reporting how many rows are visible", () => {
    expect(
      deriveViewState({
        status: "success",
        totalRows: 3,
        visibleRows: 2,
        filters: [{ _tag: "position", position: "GK" }],
      }),
    ).toEqual({ _tag: "Populated", visibleRowCount: 2 });
  });

  it("activeFilterCount ignores an empty/inert name search (it is not a real filter)", () => {
    expect(activeFilterCount([])).toBe(0);
    expect(activeFilterCount([{ _tag: "nameSearch", query: "   " }])).toBe(0);
    expect(
      activeFilterCount([
        { _tag: "nameSearch", query: "ari" },
        { _tag: "position", position: "DC" },
      ]),
    ).toBe(2);
  });
});

describe("AC-32 — RefreshState is orthogonal to the view state", () => {
  it("Idle when nothing is in flight", () => {
    expect(deriveRefreshState({ waiting: false, refreshFailed: null })).toEqual({
      _tag: "Idle",
    });
  });

  it("Refreshing while a background revalidation is in flight", () => {
    expect(deriveRefreshState({ waiting: true, refreshFailed: null })).toEqual({
      _tag: "Refreshing",
    });
  });

  it("RefreshFailed wins over the in-flight marker (rows are preserved, non-blocking)", () => {
    expect(
      deriveRefreshState({
        waiting: true,
        refreshFailed: { message: "boom" },
      }),
    ).toEqual({ _tag: "RefreshFailed", error: { message: "boom" } });
  });
});

describe("AC-32 — the copy states match the note's exact wording", () => {
  it("Squad empty line matches the note", () => {
    expect(STATE_COPY.squad.emptyDataset).toBe("No players are currently in your squad.");
  });
  it("Market empty line matches the note (no Clear-filters unless active)", () => {
    expect(STATE_COPY["transfer-market"].emptyDataset).toBe(
      "No players are currently listed on the transfer market.",
    );
  });
  it("Free Agents empty line matches the note", () => {
    expect(STATE_COPY["free-agents"].emptyDataset).toBe("No free agents are currently available.");
  });
  it("shared no-filter-results + error + retry lines", () => {
    expect(STATE_COPY.squad.noFilterResults).toBe("No players match the current filters.");
    expect(STATE_COPY.squad.loadError).toBe("We could not load the players.");
    expect(STATE_COPY.squad.retryLabel).toBe("Retry");
    expect(STATE_COPY.squad.clearFiltersLabel).toBe("Clear all filters");
  });
});

describe("AC-32 — announcement dedup: one polite announcer per table, identical lines spoken once", () => {
  beforeEach(() => {
    resetAnnouncements();
  });
  afterEach(() => {
    resetAnnouncements();
  });

  it("first occurrence of a message is admitted", () => {
    expect(
      announce({ tableId: "squad", eventId: "sort-set", message: "Sorted by Age, ascending." }),
    ).toBe(true);
  });

  it("an identical repeat for the same table is suppressed", () => {
    announce({ tableId: "squad", eventId: "sort-set", message: "Sorted by Age." });
    expect(
      announce({ tableId: "squad", eventId: "sort-set", message: "Sorted by Age." }),
    ).toBe(false);
  });

  it("a different message clears the memory so the same line can be spoken again later", () => {
    announce({ tableId: "squad", eventId: "sort-set", message: "Sorted by Age." });
    announce({ tableId: "squad", eventId: "sort-set", message: "Cleared the sort." });
    // The earlier line is no longer the remembered one → admitted again.
    expect(
      announce({ tableId: "squad", eventId: "sort-set", message: "Sorted by Age." }),
    ).toBe(true);
  });

  it("dedup is per-table: identical lines on different tables are not suppressed", () => {
    announce({ tableId: "squad", eventId: "selection", message: "Selected a player." });
    expect(
      announce({ tableId: "free-agents", eventId: "selection", message: "Selected a player." }),
    ).toBe(true);
  });
});