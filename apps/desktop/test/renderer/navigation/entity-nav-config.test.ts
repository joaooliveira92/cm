import { describe, expect, it } from "vitest";
import {
  ENTITY_TAB_CONFIGS,
  entityTabConfigForType,
} from "../../../src/renderer/navigation/entity-nav-config.js";

describe("entity nav config — player profile tabs (§6.1)", () => {
  const config = ENTITY_TAB_CONFIGS.player;

  it("has 12 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Attributes",
      "Positions",
      "Form",
      "History",
      "Contract",
      "Transfer",
      "Training",
      "Reports",
      "Relationships",
      "Injuries",
      "Notes",
    ]);
  });

  it("defaults to Overview", () => {
    expect(config.defaultTab).toBe("overview");
  });

  it("entityType is player", () => {
    expect(config.entityType).toBe("player");
  });
});

describe("entity nav config — staff profile tabs (§6.2)", () => {
  const config = ENTITY_TAB_CONFIGS.staff;

  it("has 7 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Attributes",
      "Contract",
      "Career",
      "Assignments",
      "Reports",
      "Notes",
    ]);
  });

  it("defaults to Overview", () => {
    expect(config.defaultTab).toBe("overview");
  });

  it("entityType is staff", () => {
    expect(config.entityType).toBe("staff");
  });
});

describe("entity nav config — club profile tabs (§6.3)", () => {
  const config = ENTITY_TAB_CONFIGS.club;

  it("has 9 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Squad",
      "Staff",
      "Fixtures",
      "Results",
      "Transfers",
      "Finances",
      "History",
      "Records",
    ]);
  });

  it("defaults to Overview", () => {
    expect(config.defaultTab).toBe("overview");
  });
});

describe("entity nav config — nation profile tabs (§6.4)", () => {
  const config = ENTITY_TAB_CONFIGS.nation;

  it("has 8 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Senior Team",
      "Under-21s",
      "Players",
      "Fixtures",
      "Results",
      "Competitions",
      "History",
    ]);
  });

  it("defaults to Overview", () => {
    expect(config.defaultTab).toBe("overview");
  });
});

describe("entity nav config — competition profile tabs (§6.5)", () => {
  const config = ENTITY_TAB_CONFIGS.competition;

  it("has 6 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Fixtures",
      "Results",
      "Statistics",
      "Rules",
      "History",
    ]);
  });

  it("defaults to Overview", () => {
    expect(config.defaultTab).toBe("overview");
  });
});

describe("entity nav config — match profile tabs (§6.6)", () => {
  const config = ENTITY_TAB_CONFIGS.match;

  it("has 6 tabs in spec order", () => {
    expect(config.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Lineups",
      "Commentary",
      "Statistics",
      "Player Ratings",
      "Events",
    ]);
  });

  it("defaults to Overview", () => {
    expect(config.defaultTab).toBe("overview");
  });
});

describe("entity nav config — lookup", () => {
  it("entityTabConfigForType returns the correct config", () => {
    expect(entityTabConfigForType("player").entityType).toBe("player");
    expect(entityTabConfigForType("staff").tabs).toHaveLength(7);
  });
});

describe("entity nav config — every entity type has a config", () => {
  it("covers all 6 entity types", () => {
    const types = Object.keys(ENTITY_TAB_CONFIGS).sort();
    expect(types).toEqual(["club", "competition", "match", "nation", "player", "staff"]);
  });

  it("every config has a unique entityType and defaultTab", () => {
    for (const [key, config] of Object.entries(ENTITY_TAB_CONFIGS)) {
      expect(config.entityType).toBe(key);
      expect(config.defaultTab).toBeTruthy();
      expect(config.tabs.length).toBeGreaterThan(0);
    }
  });
});