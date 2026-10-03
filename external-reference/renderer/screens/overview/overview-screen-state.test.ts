import { describe, expect, it } from "vite-plus/test";

import {
  applyLoadFailed,
  applyProjectionLoaded,
  initialOverviewScreenState,
  monthLabel,
  summarizeFleet,
  totalPortCapacity,
} from "./overview-screen-state.js";
import type { PlayerProjection } from "@bluewave/campaign-engine";

const projection: PlayerProjection = {
  campaignIdentity: "campaign_1",
  revision: 3 as PlayerProjection["revision"],
  month: { year: 1900, month: 3 },
  nationName: "United Kingdom",
  projectedSurplusDeficit: 1000,
  economy: {
    treasury: 50000,
    monthlyAppropriation: 4000,
    shipyardCapacity: 50,
    constructionSpend: 500,
    researchSpend: 300,
    maintenanceCost: 200,
  },
  knownTechnologyIds: ["tech_steel_hull", "tech_triple_expansion"],
  fleet: [
    {
      name: "Channel Fleet",
      divisions: [
        {
          name: "Channel Squadron",
          areaId: "area_northern_europe",
          ships: [
            { name: "HMS Majestic", designId: "design_majestic" },
            { name: "HMS Magnificent", designId: "design_majestic" },
          ],
        },
        {
          name: "Cruiser Squadron",
          areaId: "area_northern_europe",
          ships: [{ name: "HMS Diadem", designId: "design_diadem" }],
        },
      ],
    },
  ],
  strategicAreas: [{ id: "area_northern_europe", name: "Northern Europe" }],
  ports: [
    {
      id: "port_portsmouth",
      name: "Portsmouth",
      areaId: "area_northern_europe",
      capacity: 30,
    },
    {
      id: "port_chatham",
      name: "Chatham",
      areaId: "area_northern_europe",
      capacity: 20,
    },
  ],
  knownEnemyNations: ["nation_germany"],
  commandWorkspace: { commands: [], movementCommands: [] },
  snapshotHash: "hash_abc123",
};

describe("overview-screen-state", () => {
  it("starts with no projection loaded", () => {
    const state = initialOverviewScreenState();
    expect(state.projection).toBeNull();
    expect(state.loadError).toBeNull();
  });

  it("applies a loaded projection and clears prior errors", () => {
    const failed = applyLoadFailed(initialOverviewScreenState(), "SESSION_NOT_FOUND");
    const loaded = applyProjectionLoaded(failed, projection);
    expect(loaded.projection).toBe(projection);
    expect(loaded.loadError).toBeNull();
  });

  it("records a load failure", () => {
    const state = applyLoadFailed(initialOverviewScreenState(), "SESSION_NOT_FOUND");
    expect(state.loadError).toBe("SESSION_NOT_FOUND");
  });

  it("summarizes fleet totals across all divisions", () => {
    const summary = summarizeFleet(projection);
    expect(summary).toEqual({ totalShips: 3, fleetCount: 1, divisionCount: 2 });
  });

  it("sums port capacity across all ports", () => {
    expect(totalPortCapacity(projection)).toBe(50);
  });

  it("formats the campaign month as a human-readable label", () => {
    expect(monthLabel(projection.month)).toBe("March 1900");
  });

  it("falls back to the numeric month when out of range", () => {
    expect(monthLabel({ year: 1900, month: 13 })).toBe("13 1900");
  });
});
