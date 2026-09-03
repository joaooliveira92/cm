import { describe, expect, it } from "vitest";
import { assessContinueReadiness, type ContinueReadinessFacts } from "../src/index.js";

/** A career that is free to advance: in season, nothing running, Tactic set. */
const READY: ContinueReadinessFacts = {
  phase: "in_season",
  hasTactic: true,
  matchInProgress: false,
  advancing: false,
};

const idsOf = (facts: ContinueReadinessFacts) =>
  assessContinueReadiness(facts).items.map((item) => item.id);

describe("assessContinueReadiness", () => {
  it("clears a ready career with nothing to report", () => {
    const readiness = assessContinueReadiness(READY);

    expect(readiness.canAdvance).toBe(true);
    expect(readiness.items).toEqual([]);
  });

  describe("blockers stop the advance", () => {
    it("blocks while a match is in progress", () => {
      const readiness = assessContinueReadiness({ ...READY, matchInProgress: true });

      expect(readiness.canAdvance).toBe(false);
      expect(idsOf({ ...READY, matchInProgress: true })).toContain("match-in-progress");
      expect(readiness.items[0]!.severity).toBe("blocking");
    });

    /** Acceptance criterion 6 — a second press while the first advance is in flight must not
     * advance twice, so an in-flight advance is a blocker rather than a disabled-button detail. */
    it("blocks a duplicate advance while one is already in flight", () => {
      const readiness = assessContinueReadiness({ ...READY, advancing: true });

      expect(readiness.canAdvance).toBe(false);
      expect(idsOf({ ...READY, advancing: true })).toContain("advance-in-flight");
    });

    it("blocks once the season is complete", () => {
      const readiness = assessContinueReadiness({ ...READY, phase: "season_complete" });

      expect(readiness.canAdvance).toBe(false);
      expect(idsOf({ ...READY, phase: "season_complete" })).toContain("season-complete");
    });
  });

  describe("the unset Tactic is advisory, not a blocker", () => {
    /** The engine synthesizes a 4-4-2 for any club with no persisted Tactic, so the career is
     * playable without one — the player just never learns it happened. Surfacing it must not
     * strand a player who does not care. */
    it("reports an unset Tactic while still allowing the advance", () => {
      const readiness = assessContinueReadiness({ ...READY, hasTactic: false });

      expect(readiness.canAdvance).toBe(true);
      expect(idsOf({ ...READY, hasTactic: false })).toEqual(["no-tactic"]);
      expect(readiness.items[0]!.severity).toBe("advisory");
    });

    it("names what happens instead, rather than only that something is missing", () => {
      const [item] = assessContinueReadiness({ ...READY, hasTactic: false }).items;

      expect(item!.title).toBe("No Tactic set");
      expect(item!.detail).toContain("4-4-2");
    });

    it("says nothing about the Tactic once one is set", () => {
      expect(idsOf(READY)).not.toContain("no-tactic");
    });
  });

  describe("reporting order and combination", () => {
    /** Every stop needs an explainable reason (acceptance criterion 2), so a blocked career still
     * reports its advisories — the blocker just leads. */
    it("lists blockers before advisories and keeps both", () => {
      const readiness = assessContinueReadiness({
        ...READY,
        hasTactic: false,
        matchInProgress: true,
      });

      expect(readiness.items.map((item) => item.severity)).toEqual(["blocking", "advisory"]);
      expect(readiness.canAdvance).toBe(false);
    });

    it("reports every applicable blocker rather than only the first", () => {
      const ids = idsOf({
        phase: "season_complete",
        hasTactic: true,
        matchInProgress: true,
        advancing: true,
      });

      expect(ids).toEqual(["match-in-progress", "advance-in-flight", "season-complete"]);
    });

    it("gives every item a non-empty title and detail", () => {
      const { items } = assessContinueReadiness({
        phase: "season_complete",
        hasTactic: false,
        matchInProgress: true,
        advancing: true,
      });

      expect(items).toHaveLength(4);
      for (const item of items) {
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.detail.length).toBeGreaterThan(0);
      }
    });
  });

  describe("pre-season and open-window phases advance normally", () => {
    it.each(["pre_season", "in_season", "mid_window_open"] as const)("allows %s", (phase) => {
      expect(assessContinueReadiness({ ...READY, phase }).canAdvance).toBe(true);
    });
  });
});
