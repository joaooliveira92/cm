import { describe, expect, it } from "vitest";
import { assessContinueReadiness, assessMatchReadiness, type ContinueReadinessFacts } from "../../src/index.js";

/** A career that is free to advance: in season, nothing running, Tactic set. */
const READY: ContinueReadinessFacts = {
  phase: "in_season",
  hasTactic: true,
  matchInProgress: false,
  advancing: false,
  pendingIncomingBids: 0,
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

    it("names the consequence, rather than only that something is missing", () => {
      const [item] = assessContinueReadiness({ ...READY, hasTactic: false }).items;

      expect(item!.title).toBe("No Tactic set");
      // It used to promise an automatic 4-4-2, which was true while a fallback silently supplied
      // one. The fallback is gone, so the honest consequence is that the Fixture cannot be played.
      expect(item!.detail).toContain("Fixture");
      expect(item!.detail).not.toContain("4-4-2");
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
        pendingIncomingBids: 0,
      });

      expect(ids).toEqual(["match-in-progress", "advance-in-flight", "season-complete"]);
    });

    it("gives every item a non-empty title and detail", () => {
      const { items } = assessContinueReadiness({
        phase: "season_complete",
        hasTactic: false,
        matchInProgress: true,
        advancing: true,
        pendingIncomingBids: 1,
      });

      expect(items).toHaveLength(5);
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

describe("bids awaiting the manager", () => {
  it("says nothing when no bid is waiting", () => {
    expect(idsOf(READY)).not.toContain("bids-awaiting-response");
  });

  it("reports a waiting bid without blocking the advance", () => {
    const readiness = assessContinueReadiness({ ...READY, pendingIncomingBids: 1 });

    expect(readiness.canAdvance).toBe(true);
    expect(readiness.items[0]!.id).toBe("bids-awaiting-response");
    expect(readiness.items[0]!.severity).toBe("advisory");
  });

  /** The advance is what lapses these bids, so an advisory that only counted them would be a trap. */
  it("names the consequence of advancing, not just the count", () => {
    const item = assessContinueReadiness({ ...READY, pendingIncomingBids: 2 }).items[0]!;

    expect(item.detail).toContain("2 clubs");
    expect(item.detail).toContain("lapse");
  });

  it("reads naturally for a single bid", () => {
    const item = assessContinueReadiness({ ...READY, pendingIncomingBids: 1 }).items[0]!;

    expect(item.detail).toContain("A club has");
    expect(item.detail).not.toContain("1 clubs");
  });

  /** The career band shows one advisory. A lapsing bid outranks a standing condition that will
   *  still be true after the advance. */
  it("outranks the no-Tactic advisory", () => {
    const items = assessContinueReadiness({
      ...READY,
      hasTactic: false,
      pendingIncomingBids: 1,
    }).items;

    expect(items.map((item) => item.id)).toEqual(["bids-awaiting-response", "no-tactic"]);
  });

  it("still reports both advisories behind a blocker", () => {
    const readiness = assessContinueReadiness({
      ...READY,
      matchInProgress: true,
      hasTactic: false,
      pendingIncomingBids: 1,
    });

    expect(readiness.canAdvance).toBe(false);
    expect(readiness.items.map((item) => item.id)).toEqual([
      "match-in-progress",
      "bids-awaiting-response",
      "no-tactic",
    ]);
  });

  describe("every item names where its fix lives", () => {
    it("sends an unset Tactic to Tactics and unanswered bids to Transfers", () => {
      const items = assessContinueReadiness({
        ...READY,
        hasTactic: false,
        pendingIncomingBids: 2,
      }).items;

      expect(items.find((i) => i.id === "no-tactic")!.destination).toBe("tactics");
      expect(items.find((i) => i.id === "bids-awaiting-response")!.destination).toBe("transfers");
    });

    it("offers nothing to open for a condition that clears itself", () => {
      const [item] = assessContinueReadiness({ ...READY, advancing: true }).items;

      expect(item!.id).toBe("advance-in-flight");
      expect(item!.destination).toBeNull();
    });

    it("carries a destination on every other rule, so no item is a dead end", () => {
      const everything = assessContinueReadiness({
        phase: "season_complete",
        hasTactic: false,
        matchInProgress: true,
        advancing: false,
        pendingIncomingBids: 1,
      }).items;

      expect(everything.length).toBeGreaterThan(3);
      expect(everything.filter((i) => i.destination === null)).toEqual([]);
    });
  });
});

describe("assessMatchReadiness", () => {
  const READY_TO_PLAY = { hasTactic: true, missingSlotPlayers: 0 };

  it("lets a prepared club play", () => {
    const readiness = assessMatchReadiness(READY_TO_PLAY);
    expect(readiness.canPlay).toBe(true);
    expect(readiness.blockers).toEqual([]);
  });

  it("blocks a club with no Tactic, where the advance only advises", () => {
    // The same fact, two answers: advisory before the boundary, blocking at it. That is the whole
    // of the boundary-aware rule — a career several Matchdays from kickoff is not gated, and the
    // Fixture itself is not crossable.
    const readiness = assessMatchReadiness({ ...READY_TO_PLAY, hasTactic: false });
    expect(readiness.canPlay).toBe(false);
    expect(readiness.blockers.map((blocker) => blocker.id)).toEqual(["no-tactic"]);
  });

  it("blocks a Tactic whose slots name players who have left", () => {
    // A Tactic is eleven slots by construction, so a departed player is the only way the club can
    // arrive at kickoff unable to field a legal eleven.
    const readiness = assessMatchReadiness({ hasTactic: true, missingSlotPlayers: 2 });
    expect(readiness.canPlay).toBe(false);
    expect(readiness.blockers.map((blocker) => blocker.id)).toEqual(["tactic-names-departed-players"]);
    expect(readiness.blockers[0]!.detail).toContain("2 slots");
  });

  it("carries a destination on every blocker, so resolving one is a step and not a hunt", () => {
    const readiness = assessMatchReadiness({ hasTactic: false, missingSlotPlayers: 0 });
    expect(readiness.blockers.every((blocker) => blocker.destination !== null)).toBe(true);
  });

  it("says nothing about a weak but legal selection", () => {
    // Strategic failure is the player's to own; only structurally absent or invalid state blocks.
    expect(assessMatchReadiness(READY_TO_PLAY).blockers).toEqual([]);
  });
});
