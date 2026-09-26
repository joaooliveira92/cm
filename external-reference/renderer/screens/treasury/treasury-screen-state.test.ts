import { describe, expect, it } from "vite-plus/test";
import type { PlayerProjection } from "@bluewave/campaign-engine";

import {
  applyLoadFailed,
  applyProjectionLoaded,
  initialTreasuryScreenState,
  summarizeTreasury,
} from "./treasury-screen-state.js";

const projection: PlayerProjection = {
  campaignIdentity: "campaign_1",
  revision: 3 as PlayerProjection["revision"],
  month: { year: 1880, month: 3 },
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
  knownTechnologyIds: ["tech_steel_hull"],
  fleet: [
    {
      name: "Channel Fleet",
      divisions: [{ name: "Channel Squadron", areaId: "area_northern_europe", ships: [] }],
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
  ],
  knownEnemyNations: ["nation_germany"],
  commandWorkspace: { commands: [], movementCommands: [] },
  snapshotHash: "hash_abc123",
};

describe("treasury-screen-state", () => {
  it("starts with no projection loaded", () => {
    const state = initialTreasuryScreenState();
    expect(state.projection).toBeNull();
    expect(state.loadError).toBeNull();
  });

  it("applies a loaded projection and clears prior errors", () => {
    const failed = applyLoadFailed(initialTreasuryScreenState(), "SESSION_NOT_FOUND");
    const loaded = applyProjectionLoaded(failed, projection);
    expect(loaded.projection).toBe(projection);
    expect(loaded.loadError).toBeNull();
  });

  it("records a load failure", () => {
    const state = applyLoadFailed(initialTreasuryScreenState(), "SESSION_NOT_FOUND");
    expect(state.loadError).toBe("SESSION_NOT_FOUND");
  });

  it("summarizes every row from the projection (income, expenditure, result)", () => {
    const t = summarizeTreasury(projection);
    expect(t.income).toBe(4000);
    expect(t.fleetMaintenance).toBe(200);
    expect(t.constructionSpend).toBe(500);
    expect(t.researchSpend).toBe(300);
    expect(t.totalExpenditure).toBe(1000);
    expect(t.projectedSurplusDeficit).toBe(1000);
    expect(t.availableFunds).toBe(50000);
    expect(t.projectedMonthEndFunds).toBe(51000);
  });

  it("carries a negative projected surplus/deficit honestly", () => {
    const deficit: PlayerProjection = {
      ...projection,
      projectedSurplusDeficit: -250,
      economy: { ...projection.economy, maintenanceCost: 2500 },
    };
    const t = summarizeTreasury(deficit);
    expect(t.projectedSurplusDeficit).toBe(-250);
    expect(t.projectedMonthEndFunds).toBe(49750);
  });
});
