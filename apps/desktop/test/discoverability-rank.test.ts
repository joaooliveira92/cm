import { describe, expect, it } from "vitest";
import { ACTION_REGISTRY } from "../src/renderer/actions/allActions.js";
import type { Action, ScopeState } from "../src/renderer/actions/types.js";
import {
  labelMatchTier,
  rankPaletteActions,
} from "../src/renderer/discoverability/rank.js";

const always = () => true;
const never = () => false;

const action = (partial: Partial<Action> & Pick<Action, "id" | "scope">): Action => ({
  label: partial.id,
  available: always,
  handler: () => undefined,
  ...partial,
});

const ready = (extra?: Partial<ScopeState>): ScopeState => ({ ready: true, ...extra });

describe("labelMatchTier — the note's exact → prefix → substring → binding → scope → initials order", () => {
  it("exact beats prefix beats substring", () => {
    const binding = "g z";
    const scope = "transfers";
    expect(labelMatchTier("Go to Squad", binding, scope, "Go to Squad")).toBe("exact");
    expect(labelMatchTier("Go to Squad", binding, scope, "Go to")).toBe("prefix");
    expect(labelMatchTier("Go to Squad", binding, scope, "to")).toBe("substring");
  });

  it("falls through the order: binding beats scope beats word-initials", () => {
    // "Match Day" contains neither "g m" nor the query as label text; the
    // binding ("g m") outranks the scope match, which outranks initials.
    expect(labelMatchTier("Match Day", "g m", "squad", "g m")).toBe("binding");
    expect(labelMatchTier("Open keyboard help", undefined, "tactics", "tactics")).toBe("scope");
    expect(labelMatchTier("Go to Season Summary", undefined, "squad", "gtss")).toBe("word-initials");
  });

  it("no query and no match both yield none", () => {
    expect(labelMatchTier("Go to Squad", "g s", "squad", "")).toBe("none");
    expect(labelMatchTier("Go to Squad", "g s", "squad", "zzz")).toBe("none");
  });
});

describe("rankPaletteActions — AC-04/AC-23 available above unavailable, then match score", () => {
  const available = action({ id: "open-help", scope: "app-global", label: "Open keyboard help", binding: "Primary+/" });
  const unavailable = action({
    id: "continue",
    scope: "career-global",
    label: "Continue",
    binding: "Space",
    available: never,
    unavailableReason: "The Calendar cannot advance right now.",
  });
  const screenAction = action({ id: "focus-bid", scope: "transfers", label: "Focus the bid workflow", binding: "b" });

  it("puts available actions above unavailable even when the unavailable match is better", () => {
    // "Calendar" is an exact label match but unavailable; "Close the calendar"
    // is only a substring match. Availability is the primary tier (AC-04): the
    // available action ranks first despite the lower label score.
    const unavailableExact = action({
      id: "advance-cal",
      scope: "league",
      label: "Calendar",
      available: never,
      unavailableReason: "The Calendar cannot advance right now.",
    });
    const availableSub = action({
      id: "close-cal",
      scope: "league",
      label: "Close the calendar",
      available: always,
    });
    const ranked = rankPaletteActions([unavailableExact, availableSub], "calendar", ready());
    expect(ranked.map((entry) => entry.action.id)).toEqual(["close-cal", "advance-cal"]);
    expect(ranked[0]).toMatchObject({ available: true, reason: null });
    expect(ranked[1]).toMatchObject({ available: false });
  });

  it("within the same availability, better label matches rank first", () => {
    const exact = action({ id: "continue", scope: "career-global", label: "Continue" });
    const prefix = action({ id: "c-prefix", scope: "transfers", label: "Continue scouting" });
    const substring = action({ id: "c-sub", scope: "transfers", label: "Please do continue" });
    const ranked = rankPaletteActions([substring, prefix, exact], "continue", ready());
    expect(ranked.map((entry) => entry.action.id)).toEqual(["continue", "c-prefix", "c-sub"]);
  });

  it("unavailable actions are kept (never hidden) when they match, dropped only when they do not", () => {
    const matching = rankPaletteActions(
      [available, unavailable],
      "contin",
      ready(),
    );
    expect(matching.map((entry) => entry.action.id)).toEqual(["continue"]);
    expect(matching[0]?.reason).toBe("The Calendar cannot advance right now.");

    const nonMatching = rankPaletteActions(
      [available, unavailable],
      "zzzz",
      ready(),
    );
    expect(nonMatching).toEqual([]);
  });

  it("falls back to a default reason when the action carries none", () => {
    const bare = action({ id: "place-bid", scope: "transfers", label: "Place a bid", available: never });
    const ranked = rankPaletteActions([bare], "", ready());
    expect(ranked[0]?.reason).toBe("Not available right now");
  });

  it("an empty query lists every row, available first, stable registry order within tiers", () => {
    const ranked = rankPaletteActions([unavailable, available, screenAction], "", ready());
    // available first (stable: open-help then focus-bid), then disabled.
    expect(ranked.map((entry) => entry.action.id)).toEqual(["open-help", "focus-bid", "continue"]);
  });
});

describe("AC-23 — the palette over the real registry is a strict command surface", () => {
  it("matching any playerish string finds no rows (commands only, no game-data search)", () => {
    for (const query of ["Roberto Carlos", "Wembley", "Arsenal"]) {
      const rows = rankPaletteActions(ACTION_REGISTRY.all, query, ready());
      expect(rows.map((row) => row.action.label)).not.toContain(query);
      expect(rows.every((row) => row.action.id !== undefined)).toBe(true);
    }
  });

  it("the real continue/advance-calendar rows surface disabled-with-reason on a complete season", () => {
    const rows = rankPaletteActions(
      ACTION_REGISTRY.all,
      "",
      ready({ phase: "season_complete", advancing: false }),
    );
    for (const id of ["continue", "advance-calendar"]) {
      const row = rows.find((entry) => entry.action.id === id);
      expect(row, `${id} must remain listed (never hidden)`).toBeDefined();
      expect(row!.available).toBe(false);
      expect(row!.reason).toBe("The Calendar cannot advance right now.");
    }
  });
});