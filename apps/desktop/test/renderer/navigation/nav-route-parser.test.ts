import { describe, expect, it } from "vitest";
import {
  parseNavState,
  inferSectionForEntity,
  resolveActiveTabId,
  resolveEntityTabId,
} from "../../../src/renderer/navigation/nav-route-parser.js";
import type { SpecSection } from "../../../src/renderer/navigation/spec-nav-config.js";

describe("nav route parser — primary section recognition", () => {
  it("parses /career/$saveId/manager as Manager section", () => {
    const result = parseNavState("/career/s1/manager", new URLSearchParams());
    expect(result.primarySection?.id).toBe("manager");
    expect(result.entityType).toBeNull();
    expect(result.matchContext).toBeNull();
  });

  it("parses /career/$saveId/squad as Squad section", () => {
    const result = parseNavState("/career/s1/squad/first-team", new URLSearchParams());
    expect(result.primarySection?.id).toBe("squad");
    expect(result.activeTabId).toBe("first-team");
  });

  it("parses /career/$saveId/tactics as Tactics section", () => {
    const result = parseNavState("/career/s1/tactics", new URLSearchParams());
    expect(result.primarySection?.id).toBe("tactics");
  });

  it("parses /career/$saveId/transfers as Transfers section", () => {
    const result = parseNavState("/career/s1/transfers", new URLSearchParams());
    expect(result.primarySection?.id).toBe("transfers");
  });

  it("parses /career/$saveId/world/world as World section", () => {
    const result = parseNavState("/career/s1/world/nations", new URLSearchParams());
    expect(result.primarySection?.id).toBe("world");
    expect(result.activeTabId).toBe("nations");
  });

  it("parses /career/$saveId/search as Search section", () => {
    const result = parseNavState("/career/s1/search/players", new URLSearchParams());
    expect(result.primarySection?.id).toBe("search");
    expect(result.activeTabId).toBe("players");
  });

  it("returns null for unrecognized route segments", () => {
    const result = parseNavState("/career/s1/unknown/page", new URLSearchParams());
    expect(result.primarySection).toBeNull();
  });
});

describe("nav route parser — entity context recognition", () => {
  it("detects player entity from /players/:id path", () => {
    const result = parseNavState("/career/s1/players/42/overview", new URLSearchParams());
    expect(result.entityType).toBe("player");
    expect(result.entityId).toBe("42");
    expect(result.activeTabId).toBe("overview");
    expect(result.primarySection?.id).toBe("squad");
  });

  it("detects staff entity from /staff/:id path", () => {
    const result = parseNavState("/career/s1/staff/7", new URLSearchParams());
    expect(result.entityType).toBe("staff");
    expect(result.entityId).toBe("7");
  });

  it("detects nation entity from /nations/:id path", () => {
    const result = parseNavState("/career/s1/nations/ita", new URLSearchParams());
    expect(result.entityType).toBe("nation");
    expect(result.entityId).toBe("ita");
  });
});

describe("nav route parser — origin param (§12)", () => {
  it("uses ?origin to keep a primary section active while viewing a player", () => {
    const result = parseNavState(
      "/career/s1/players/42/overview",
      new URLSearchParams("origin=squad"),
    );
    expect(result.primarySection?.id).toBe("squad");
    expect(result.originSectionId).toBe("squad");
    expect(result.entityType).toBe("player");
    expect(result.activeTabId).toBe("overview");
  });

  it("uses ?origin=transfers when viewing a player from the transfers screen", () => {
    const result = parseNavState(
      "/career/s1/players/42/overview",
      new URLSearchParams("origin=transfers"),
    );
    expect(result.primarySection?.id).toBe("transfers");
    expect(result.originSectionId).toBe("transfers");
    expect(result.activeTabId).toBe("overview");
  });

  it("handles ?origin without entity path gracefully", () => {
    const result = parseNavState(
      "/career/s1/squad/first-team",
      new URLSearchParams("origin=manager"),
    );
    expect(result.entityType).toBeNull();
  });

  it("ignores unknown origin values", () => {
    const result = parseNavState(
      "/career/s1/squad",
      new URLSearchParams("origin=nonexistent"),
    );
    expect(result.originSectionId).toBeNull();
  });
});

describe("nav route parser — match context", () => {
  it("defaults to pre-match for /matches/:id without child segment", () => {
    const result = parseNavState("/career/s1/matches/101", new URLSearchParams());
    expect(result.matchContext).toBe("pre-match");
    expect(result.entityId).toBe("101");
  });

  it("detects live-match for /matches/:id/live", () => {
    const result = parseNavState("/career/s1/matches/101/live", new URLSearchParams());
    expect(result.matchContext).toBe("live-match");
  });

  it("detects post-match for /matches/:id/post", () => {
    const result = parseNavState("/career/s1/matches/101/post", new URLSearchParams());
    expect(result.matchContext).toBe("post-match");
  });
});

describe("inferSectionForEntity", () => {
  it("maps player and staff to Squad section", () => {
    expect(inferSectionForEntity("player")?.id).toBe("squad");
    expect(inferSectionForEntity("staff")?.id).toBe("squad");
  });

  it("maps club and nation to World section", () => {
    expect(inferSectionForEntity("club")?.id).toBe("world");
    expect(inferSectionForEntity("nation")?.id).toBe("world");
  });

  it("maps competition to Competitions section", () => {
    expect(inferSectionForEntity("competition")?.id).toBe("competitions");
  });

  it("maps match to Squad section", () => {
    expect(inferSectionForEntity("match")?.id).toBe("squad");
  });
});

describe("resolveActiveTabId", () => {
  const squad = { id: "squad", label: "Squad", defaultTab: "first-team" } as SpecSection;

  it("returns the default tab when no tab is specified", () => {
    expect(resolveActiveTabId(squad, null)).toBe("first-team");
  });

  it("returns the default tab when section is null", () => {
    expect(resolveActiveTabId(null, "overview")).toBe("");
  });

  it("returns the requested tab when it exists", () => {
    const section = {
      ...squad,
      tabs: [{ id: "first-team", label: "First Team" }, { id: "reserves", label: "Reserves" }],
    } as SpecSection;
    expect(resolveActiveTabId(section, "reserves")).toBe("reserves");
  });

  it("falls back to default tab when the requested tab does not exist", () => {
    const section = {
      ...squad,
      tabs: [{ id: "first-team", label: "First Team" }],
    } as SpecSection;
    expect(resolveActiveTabId(section, "nonexistent")).toBe("first-team");
  });
});

describe("resolveEntityTabId", () => {
  it("returns the default tab for player when no tab specified", () => {
    expect(resolveEntityTabId("player", null)).toBe("overview");
  });

  it("returns the requested tab for player when it exists", () => {
    expect(resolveEntityTabId("player", "attributes")).toBe("attributes");
    expect(resolveEntityTabId("player", "contract")).toBe("contract");
  });

  it("falls back to default tab for player when the requested tab does not exist", () => {
    expect(resolveEntityTabId("player", "nonexistent")).toBe("overview");
  });

  it("returns the default tab for club when no tab specified", () => {
    expect(resolveEntityTabId("club", null)).toBe("overview");
  });

  it("resolves tabs for staff entity", () => {
    expect(resolveEntityTabId("staff", "career")).toBe("career");
    expect(resolveEntityTabId("staff", "contract")).toBe("contract");
  });

  it("resolves tabs for nation entity", () => {
    expect(resolveEntityTabId("nation", "senior-team")).toBe("senior-team");
    expect(resolveEntityTabId("nation", "players")).toBe("players");
  });

  it("resolves tabs for competition entity", () => {
    expect(resolveEntityTabId("competition", "fixtures")).toBe("fixtures");
    expect(resolveEntityTabId("competition", "rules")).toBe("rules");
  });

  it("resolves tabs for match entity", () => {
    expect(resolveEntityTabId("match", "lineups")).toBe("lineups");
    expect(resolveEntityTabId("match", "statistics")).toBe("statistics");
  });
});