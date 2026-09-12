/* @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";
import type { BluewaveDesktopBridge } from "../../preload/index.js";
import type { CampaignCommandClient } from "../../shared/campaign-command-contract.js";
import type { PlayerProjection } from "@bluewave/campaign-engine";
import { useCampaignShell } from "./useCampaignShell.js";

type CampaignExecute = CampaignCommandClient["execute"];

const projection: PlayerProjection = {
  campaignIdentity: "campaign_1",
  snapshotHash: "hash_abc",
  revision: 3,
  month: { year: 1900, month: 1 },
  nationName: "United Kingdom",
  projectedSurplusDeficit: 1_250_000,
  economy: {
    treasury: 24_500_000,
    monthlyAppropriation: 2_000_000,
    shipyardCapacity: 50,
    constructionSpend: 400_000,
    researchSpend: 350_000,
    maintenanceCost: 250_000,
  },
  fleet: [],
  ports: [],
  knownTechnologyIds: [],
  strategicAreas: [],
  knownEnemyNations: [],
  commandWorkspace: { commands: [], movementCommands: [] },
};

const monthCommitSuccess = {
  outcome: "success" as const,
  value: {
    report: {
      month: { month: 2, year: 1900 },
      openingTreasury: 24_500_000,
      maintenanceCost: 1_100_000,
      newConstructionSpending: 400_000,
      closingTreasury: 22_900_000,
    },
    domainEvents: [],
    financialLedger: [],
    randomDecisions: [],
    closingSnapshot: {
      revision: 4,
      month: { month: 2, year: 1900 },
      submarinePools: [],
      minePressure: [],
      landTargetDamage: [],
      battleOutcomes: [],
      activeWars: [],
    },
  },
  diagnostics: [],
};

function setup(execute: CampaignExecute) {
  const bridge = { campaign: { execute } } as unknown as BluewaveDesktopBridge;
  const rendered = renderHook(() => useCampaignShell(bridge));
  return { ...rendered, execute };
}

describe("useCampaignShell", () => {
  it("maps the INC-1 projection fields into the header campaign on open", async () => {
    const execute = vi.fn(async () => ({
      outcome: "success" as const,
      value: { projection },
      diagnostics: [],
    })) as unknown as CampaignExecute;
    const { result } = setup(execute);

    await act(() => result.current.openCampaign("ses-1"));

    expect(execute).toHaveBeenCalledWith("inspectCampaign", "ses-1");
    expect(result.current.campaign).toEqual({
      month: { year: 1900, month: 1 },
      treasury: 24_500_000,
      revision: 3,
      sessionId: "ses-1",
      nationName: "United Kingdom",
      projectedSurplusDeficit: 1_250_000,
      // Forward-wired INC-2 slot: empty until the priorities projection lands.
      activeAlertsCount: null,
    });
  });

  it("keeps the header fields across a month commit and leaves the alert slot empty", async () => {
    const execute = vi.fn(async (command: string) => {
      if (command === "inspectCampaign") {
        return { outcome: "success" as const, value: { projection }, diagnostics: [] };
      }
      return monthCommitSuccess;
    }) as unknown as CampaignExecute;
    const { result } = setup(execute);

    await act(() => result.current.openCampaign("ses-1"));
    await act(() => result.current.advanceMonth());

    expect(execute).toHaveBeenCalledWith(
      "commitMonth",
      expect.objectContaining({ sessionId: "ses-1", expectedRevision: 3 }),
    );
    expect(result.current.campaign).toEqual({
      month: { month: 2, year: 1900 },
      treasury: 22_900_000,
      revision: 4,
      sessionId: "ses-1",
      // The commit response carries no projection surface (no nationName /
      // projectedSurplusDeficit on ClosingSnapshotSummary), so the shell
      // keeps the stable nation identity and the last-known projection.
      nationName: "United Kingdom",
      projectedSurplusDeficit: 1_250_000,
      activeAlertsCount: null,
    });
    expect(result.current.committing).toBe(false);
  });

  it("keeps the alert slot empty on a rejected commit and stays ready to retry", async () => {
    const execute = vi.fn(async (command: string) => {
      if (command === "inspectCampaign") {
        return { outcome: "success" as const, value: { projection }, diagnostics: [] };
      }
      return {
        outcome: "rejected" as const,
        reason: "SIMULATION_END_REACHED",
        diagnostics: [],
      };
    }) as unknown as CampaignExecute;
    const { result } = setup(execute);

    await act(() => result.current.openCampaign("ses-1"));
    await act(() => result.current.advanceMonth());

    expect(result.current.committing).toBe(false);
    expect(result.current.saveMessage).toContain("SIMULATION_END_REACHED");
    expect(result.current.campaign?.activeAlertsCount).toBeNull();
    expect(result.current.campaign?.nationName).toBe("United Kingdom");
  });
});
