import { describe, expect, it } from "vitest";
import { describeContinueOutcome, type ContinueOutcomeFacts } from "../../src/index.js";

/** The quietest advance the Calendar can report: a Matchday resolved, nothing else. */
const MATCHDAY: ContinueOutcomeFacts = {
  resolvedDate: "2026-10-17",
  transferWindowClosed: null,
  transferWindowOpened: null,
  seasonConcluded: false,
  boardObjectiveVerdict: null,
  managerOutcome: "none",
};

const idsOf = (facts: ContinueOutcomeFacts) =>
  describeContinueOutcome(facts).consequences.map((c) => c.id);

describe("describeContinueOutcome", () => {
  it("names the Matchday the advance landed on", () => {
    const outcome = describeContinueOutcome(MATCHDAY);

    expect(idsOf(MATCHDAY)).toEqual(["matchday-resolved"]);
    expect(outcome.consequences[0]!.detail).toContain("17 Oct 2026");
    expect(outcome.headline).toBe(outcome.consequences[0]!.title);
  });

  it("sends the Matchday result to the League table", () => {
    expect(describeContinueOutcome(MATCHDAY).consequences[0]!.destination).toBe("league");
  });

  it("reports a Transfer Window opening, and sends it to Transfers", () => {
    const outcome = describeContinueOutcome({
      ...MATCHDAY,
      resolvedDate: null,
      transferWindowOpened: "mid_season",
    });

    expect(outcome.consequences.map((c) => c.id)).toEqual(["transfer-window-opened"]);
    expect(outcome.consequences[0]!.destination).toBe("transfers");
    expect(outcome.headline).toContain("Transfer window");
  });

  it("reports a Transfer Window closing without offering an action it forbids", () => {
    const outcome = describeContinueOutcome({ ...MATCHDAY, transferWindowClosed: "pre_season" });
    const closed = outcome.consequences.find((c) => c.id === "transfer-window-closed")!;

    expect(closed).toBeDefined();
    // The window is shut: routing to Transfers would imply the player can still act.
    expect(closed.destination).toBeNull();
  });

  describe("priority when several consequences arrive on one press", () => {
    const EVERYTHING: ContinueOutcomeFacts = {
      resolvedDate: "2027-05-22",
      transferWindowClosed: "mid_season",
      transferWindowOpened: null,
      seasonConcluded: true,
      boardObjectiveVerdict: "missed",
      managerOutcome: "sacked",
    };

    it("orders manager outcome, board verdict, season conclusion, Matchday, window transition", () => {
      expect(idsOf(EVERYTHING)).toEqual([
        "manager-outcome",
        "board-verdict",
        "season-concluded",
        "matchday-resolved",
        "transfer-window-closed",
      ]);
    });

    it("drops none of them — ordering is display, not selection", () => {
      expect(describeContinueOutcome(EVERYTHING).consequences).toHaveLength(5);
    });

    it("takes its headline from the highest-priority consequence", () => {
      expect(describeContinueOutcome(EVERYTHING).headline).toBe("You have been sacked");
    });
  });

  it("distinguishes a warning from a sacking, and stays silent on neither", () => {
    expect(idsOf({ ...MATCHDAY, seasonConcluded: true, managerOutcome: "warned" })).toContain(
      "manager-outcome",
    );
    expect(idsOf({ ...MATCHDAY, seasonConcluded: true, managerOutcome: "none" })).not.toContain(
      "manager-outcome",
    );
  });

  it("routes the season's conclusion to the Season Summary", () => {
    const outcome = describeContinueOutcome({
      ...MATCHDAY,
      seasonConcluded: true,
      boardObjectiveVerdict: "met",
    });

    expect(outcome.consequences.find((c) => c.id === "season-concluded")!.destination).toBe(
      "seasonSummary",
    );
  });

  it("never expresses the advance as a number of days", () => {
    const everything = describeContinueOutcome({
      ...MATCHDAY,
      seasonConcluded: true,
      boardObjectiveVerdict: "met",
      transferWindowOpened: "mid_season",
      managerOutcome: "warned",
    });
    const copy = [
      everything.headline,
      ...everything.consequences.flatMap((c) => [c.title, c.detail]),
    ].join(" ");

    expect(copy).not.toMatch(/\bdays?\b/i);
  });

  it("never names a season number: at a conclusion the result already holds the next one", () => {
    const outcome = describeContinueOutcome({
      ...MATCHDAY,
      seasonConcluded: true,
      boardObjectiveVerdict: "met",
    });
    const copy = [outcome.headline, ...outcome.consequences.flatMap((c) => [c.title, c.detail])];

    expect(copy.join(" ")).not.toMatch(/\bseason \d/i);
  });

  it("says so when a press changed nothing it can report", () => {
    const outcome = describeContinueOutcome({
      ...MATCHDAY,
      resolvedDate: null,
    });

    expect(outcome.consequences).toEqual([]);
    expect(outcome.headline).toBe("The Calendar advanced");
  });
});
