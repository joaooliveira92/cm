import { describe, expect, it } from "vitest";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { navKeyByDestinationOf } from "../../../src/renderer/actions/overrides.js";
import { NAV_SECTIONS } from "../../../src/renderer/navigation/nav-config.js";
import {
  itemCarriesHint,
  sectionCarriesHint,
  sectionIdForDestination,
} from "../../../src/renderer/navigation/nav-route-index.js";

describe("nav route index (spec §6 rule 1 & §8)", () => {
  it("maps every career destination to its owning section", () => {
    expect(sectionIdForDestination("squad")).toBe("squad");
    expect(sectionIdForDestination("tactics")).toBe("tactics");
    expect(sectionIdForDestination("transfers")).toBe("recruitment");
    expect(sectionIdForDestination("league")).toBe("analysis");
    expect(sectionIdForDestination("fixtures")).toBe("analysis");
    expect(sectionIdForDestination("match")).toBe("analysis");
    expect(sectionIdForDestination("seasonSummary")).toBe("analysis");
    expect(sectionIdForDestination("manager")).toBe("club");
    expect(sectionIdForDestination("news")).toBe("news");
  });

  it("the union of section defaults and items covers exactly the career screens", () => {
    const reached = new Set<string>();
    for (const section of NAV_SECTIONS) {
      reached.add(section.defaultDestination);
      for (const item of section.items) reached.add(item.destination);
    }
    expect(reached).toEqual(
      new Set([
        "squad",
        "tactics",
        "transfers",
        "league",
        "fixtures",
        "match",
        "seasonSummary",
        "manager",
        "news",
      ]),
    );
  });

  it("every section has a stable unique id", () => {
    const ids = NAV_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item id is unique across all sections", () => {
    const ids = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * A leader-key hint says "this key opens this control". Two badges with the same key would make
   * one of them a lie, and a placeholder item (Training, Staff) routed to Squad would advertise `S`
   * for a screen it does not open.
   */
  it("puts every g-destination's hint on exactly one navbar control", () => {
    const hinted: Array<string> = [];
    for (const section of NAV_SECTIONS) {
      if (sectionCarriesHint(section)) hinted.push(section.defaultDestination);
      for (const item of section.items) {
        if (itemCarriesHint(section, item)) hinted.push(item.destination);
      }
    }
    const withKeys = hinted.filter((destination) => navKeyByDestinationOf(ALL_ACTIONS).has(destination));
    expect([...withKeys].sort()).toEqual([...navKeyByDestinationOf(ALL_ACTIONS).keys()].sort());
    expect(new Set(withKeys).size).toBe(withKeys.length);
  });
});
