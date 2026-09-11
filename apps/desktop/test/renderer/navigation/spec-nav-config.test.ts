import { describe, expect, it } from "vitest";
import {
  SPEC_SECTIONS,
  MORE_ITEMS,
  sectionById,
  isTabVisible,
  type SecondaryTab,
  type ConditionalTab,
} from "../../../src/renderer/navigation/spec-nav-config.js";

describe("spec nav config — primary sections (§5)", () => {
  it("defines exactly 10 sections in spec order", () => {
    expect(SPEC_SECTIONS.map((s) => s.label)).toEqual([
      "Manager",
      "Squad",
      "Tactics",
      "Training",
      "Transfers",
      "Club",
      "Competitions",
      "World",
      "Search",
      "More",
    ]);
  });

  it("every section has a unique id", () => {
    const ids = SPEC_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every section has at least a default tab", () => {
    for (const section of SPEC_SECTIONS) {
      expect(section.defaultTab).toBeTruthy();
    }
  });

  it("only Competitions defines a context selector", () => {
    const withSelector = SPEC_SECTIONS.filter((s) => s.contextSelector !== undefined);
    expect(withSelector).toHaveLength(1);
    expect(withSelector[0]?.id).toBe("competitions");
  });

  it("sectionById returns the correct section", () => {
    expect(sectionById("squad")?.label).toBe("Squad");
    expect(sectionById("manager")?.label).toBe("Manager");
    expect(sectionById("world")?.label).toBe("World");
    expect(sectionById("nonexistent")).toBeUndefined();
  });
});

describe("spec nav config — Manager secondary tabs", () => {
  const manager = SPEC_SECTIONS.find((s) => s.id === "manager")!;

  it("has 7 tabs in spec order", () => {
    expect(manager.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Inbox",
      "Confidence",
      "Notes",
      "Jobs",
      "Responsibilities",
      "Career",
    ]);
  });

  it("defaults to Overview", () => {
    expect(manager.defaultTab).toBe("overview");
  });
});

describe("spec nav config — Squad secondary tabs", () => {
  const squad = SPEC_SECTIONS.find((s) => s.id === "squad")!;

  it("has 7 tabs in spec order", () => {
    expect(squad.tabs.map((t) => t.label)).toEqual([
      "First Team",
      "Reserves",
      "Under-19s",
      "Selection",
      "Fixtures",
      "Statistics",
      "Reports",
    ]);
  });

  it("defaults to First Team", () => {
    expect(squad.defaultTab).toBe("first-team");
  });
});

describe("spec nav config — Tactics secondary tabs", () => {
  const tactics = SPEC_SECTIONS.find((s) => s.id === "tactics")!;

  it("has 7 tabs in spec order", () => {
    expect(tactics.tabs.map((t) => t.label)).toEqual([
      "Formation",
      "Team Instructions",
      "Player Instructions",
      "Set Pieces",
      "Takers",
      "Captains",
      "Templates",
    ]);
  });

  it("defaults to Formation", () => {
    expect(tactics.defaultTab).toBe("formation");
  });
});

describe("spec nav config — Training secondary tabs", () => {
  const training = SPEC_SECTIONS.find((s) => s.id === "training")!;

  it("has 7 tabs in spec order", () => {
    expect(training.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Schedules",
      "Players",
      "Coaches",
      "Assignments",
      "Reports",
      "Options",
    ]);
  });

  it("defaults to Overview", () => {
    expect(training.defaultTab).toBe("overview");
  });
});

describe("spec nav config — Transfers secondary tabs", () => {
  const transfers = SPEC_SECTIONS.find((s) => s.id === "transfers")!;

  it("has 6 tabs in spec order", () => {
    expect(transfers.tabs.map((t) => t.label)).toEqual([
      "Transfer Centre",
      "Player Search",
      "Shortlist",
      "Scouting",
      "Staff Search",
      "History",
    ]);
  });

  it("defaults to Transfer Centre", () => {
    expect(transfers.defaultTab).toBe("transfer-centre");
  });
});

describe("spec nav config — Club secondary tabs", () => {
  const club = SPEC_SECTIONS.find((s) => s.id === "club")!;

  it("has 8 tabs in spec order", () => {
    expect(club.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Staff",
      "Fixtures",
      "Finances",
      "Facilities",
      "Records",
      "History",
      "Transfers",
    ]);
  });

  it("defaults to Overview", () => {
    expect(club.defaultTab).toBe("overview");
  });
});

describe("spec nav config — Competitions secondary tabs", () => {
  const competitions = SPEC_SECTIONS.find((s) => s.id === "competitions")!;

  it("has 12 tabs with conditional visibility", () => {
    expect(competitions.tabs.map((t) => t.label)).toEqual([
      "Overview",
      "Table",
      "Fixtures",
      "Results",
      "Statistics",
      "Awards",
      "Rules",
      "History",
      "Stages",
      "Tree",
      "Draw",
      "Coefficients",
    ]);
  });

  it("defaults to Overview", () => {
    expect(competitions.defaultTab).toBe("overview");
  });

  it("ContextSelector is defined with correct label", () => {
    expect(competitions.contextSelector?.label).toBe("Competition");
  });
});

describe("spec nav config — World secondary tabs", () => {
  const world = SPEC_SECTIONS.find((s) => s.id === "world")!;

  it("has 5 tabs in spec order", () => {
    expect(world.tabs.map((t) => t.label)).toEqual([
      "Nations",
      "Clubs",
      "International",
      "Regions",
      "Rankings",
    ]);
  });

  it("defaults to Nations", () => {
    expect(world.defaultTab).toBe("nations");
  });
});

describe("spec nav config — Search secondary tabs", () => {
  const search = SPEC_SECTIONS.find((s) => s.id === "search")!;

  it("has 7 tabs in spec order", () => {
    expect(search.tabs.map((t) => t.label)).toEqual([
      "Quick Search",
      "Players",
      "Staff",
      "Clubs",
      "Nations",
      "Recent",
      "Saved Searches",
    ]);
  });

  it("defaults to Quick Search", () => {
    expect(search.defaultTab).toBe("quick-search");
  });
});

describe("spec nav config — More section", () => {
  const more = SPEC_SECTIONS.find((s) => s.id === "more")!;

  it("has no secondary tabs", () => {
    expect(more.tabs).toHaveLength(0);
  });

  it("defaults to history", () => {
    expect(more.defaultTab).toBe("history");
  });
});

describe("conditional tab visibility predicates", () => {
  it("Table is visible for league and group competitions", () => {
    const tableTab = SPEC_SECTIONS.find((s) => s.id === "competitions")!.tabs
      .find((t) => t.id === "table") as ConditionalTab;
    expect(tableTab.visible("league")).toBe(true);
    expect(tableTab.visible("group")).toBe(true);
    expect(tableTab.visible("knockout")).toBe(false);
    expect(tableTab.visible(undefined)).toBe(false);
  });

  it("non-conditional tabs are always visible", () => {
    const overviewTab = SPEC_SECTIONS.find((s) => s.id === "competitions")!.tabs
      .find((t) => t.id === "overview") as SecondaryTab;
    expect(isTabVisible(overviewTab)).toBe(true);
    expect(isTabVisible(overviewTab, "league")).toBe(true);
  });

  it("Awards is visible when competition type is known", () => {
    const awardsTab = SPEC_SECTIONS.find((s) => s.id === "competitions")!.tabs
      .find((t) => t.id === "awards") as ConditionalTab;
    expect(awardsTab.visible("league")).toBe(true);
    expect(awardsTab.visible("knockout")).toBe(true);
    expect(awardsTab.visible(undefined)).toBe(false);
  });

  it("Stages is visible only for multi-stage competitions", () => {
    const stagesTab = SPEC_SECTIONS.find((s) => s.id === "competitions")!.tabs
      .find((t) => t.id === "stages") as ConditionalTab;
    expect(stagesTab.visible("multi-stage")).toBe(true);
    expect(stagesTab.visible("league")).toBe(false);
    expect(stagesTab.visible("knockout")).toBe(false);
  });

  it("Tree and Draw are visible only for knockout competitions", () => {
    const treeTab = SPEC_SECTIONS.find((s) => s.id === "competitions")!.tabs
      .find((t) => t.id === "tree") as ConditionalTab;
    const drawTab = SPEC_SECTIONS.find((s) => s.id === "competitions")!.tabs
      .find((t) => t.id === "draw") as ConditionalTab;
    expect(treeTab.visible("knockout")).toBe(true);
    expect(treeTab.visible("league")).toBe(false);
    expect(drawTab.visible("knockout")).toBe(true);
    expect(drawTab.visible("league")).toBe(false);
  });

  it("Coefficients is visible only for coefficient-based systems", () => {
    const coeffTab = SPEC_SECTIONS.find((s) => s.id === "competitions")!.tabs
      .find((t) => t.id === "coefficients") as ConditionalTab;
    expect(coeffTab.visible("coefficient")).toBe(true);
    expect(coeffTab.visible("league")).toBe(false);
    expect(coeffTab.visible("knockout")).toBe(false);
  });
});

describe("More items", () => {
  it("lists the expected items", () => {
    expect(MORE_ITEMS.map((i) => i.label)).toEqual([
      "History",
      "Game Status",
      "Hall of Fame",
      "Add Manager",
      "Preferences",
      "Save",
      "Save As",
      "Help",
      "Credits",
      "Quit Game",
    ]);
  });
});