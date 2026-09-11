import { describe, expect, it } from "vitest";
import {
  MATCH_TAB_CONFIGS,
  matchTabConfigForContext,
} from "../../../src/renderer/navigation/match-nav-config.js";
import { type MatchConditionalTab } from "../../../src/renderer/navigation/match-nav-config.js";

describe("match nav config — pre-match tabs (§7)", () => {
  const config = MATCH_TAB_CONFIGS["pre-match"];

  it("has 6 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Team Selection",
      "Tactics",
      "Opposition",
      "Past Meetings",
      "Conditions",
    ]);
  });

  it("defaults to Overview", () => {
    expect(config.defaultTab).toBe("overview");
  });

  it("matchContext is pre-match", () => {
    expect(config.matchContext).toBe("pre-match");
  });
});

describe("match nav config — live-match tabs (§8)", () => {
  const config = MATCH_TAB_CONFIGS["live-match"];

  it("has 7 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Match",
      "Commentary",
      "Statistics",
      "Player Ratings",
      "Tactics",
      "Opposition",
      "Live Table",
    ]);
  });

  it("defaults to Match", () => {
    expect(config.defaultTab).toBe("match");
  });

  it("Live Table is conditional", () => {
    const liveTable = config.tabs.find((t) => t.id === "live-table") as MatchConditionalTab;
    expect(liveTable.visible(true)).toBe(true);
    expect(liveTable.visible(false)).toBe(false);
    expect(liveTable.visible(undefined)).toBe(false);
  });
});

describe("match nav config — post-match tabs (§9)", () => {
  const config = MATCH_TAB_CONFIGS["post-match"];

  it("has 6 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Summary",
      "Statistics",
      "Player Ratings",
      "Commentary",
      "Other Results",
      "Table",
    ]);
  });

  it("defaults to Summary", () => {
    expect(config.defaultTab).toBe("summary");
  });

  it("Table is conditional", () => {
    const table = config.tabs.find((t) => t.id === "table") as MatchConditionalTab;
    expect(table.visible(true)).toBe(true);
    expect(table.visible(false)).toBe(false);
  });
});

describe("match nav config — lookup", () => {
  it("matchTabConfigForContext returns the correct config", () => {
    expect(matchTabConfigForContext("pre-match").matchContext).toBe("pre-match");
    expect(matchTabConfigForContext("live-match").matchContext).toBe("live-match");
    expect(matchTabConfigForContext("post-match").tabs).toHaveLength(6);
  });
});

describe("match nav config — coverage", () => {
  it("covers all 3 match contexts", () => {
    const contexts = Object.keys(MATCH_TAB_CONFIGS).sort();
    expect(contexts).toEqual(["live-match", "post-match", "pre-match"]);
  });

  it("every config has a unique matchContext and defaultTab", () => {
    for (const [key, config] of Object.entries(MATCH_TAB_CONFIGS)) {
      expect(config.matchContext).toBe(key);
      expect(config.defaultTab).toBeTruthy();
      expect(config.tabs.length).toBeGreaterThan(0);
    }
  });
});