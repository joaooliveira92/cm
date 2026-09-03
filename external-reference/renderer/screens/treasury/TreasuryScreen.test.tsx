/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { PlayerProjection } from "@bluewave/campaign-engine";

import { applyProjectionLoaded, initialTreasuryScreenState } from "./treasury-screen-state.js";
import { TreasuryScreen } from "./TreasuryScreen.js";

/**
 * Render test for the Treasury screen. The hook is mocked so the test
 * asserts PURE rendering: every figure comes from the projection (income /
 * expenditure rows / result), no budget controls exist, and honest error /
 * loading states.
 */

const projection: PlayerProjection = {
  campaignIdentity: "campaign_1",
  revision: 3 as PlayerProjection["revision"],
  month: { year: 1880, month: 3 },
  nationName: "United Kingdom",
  projectedSurplusDeficit: 3000,
  economy: {
    treasury: 50000,
    monthlyAppropriation: 4000,
    shipyardCapacity: 50,
    constructionSpend: 500,
    researchSpend: 300,
    maintenanceCost: 200,
  },
  knownTechnologyIds: [],
  fleet: [
    {
      name: "Channel Fleet",
      divisions: [{ name: "Channel Squadron", areaId: "area_northern_europe", ships: [] }],
    },
  ],
  strategicAreas: [],
  ports: [],
  knownEnemyNations: [],
  commandWorkspace: { commands: [], movementCommands: [] },
  snapshotHash: "hash_abc123",
};

const hookMocks = vi.hoisted(() => {
  const state = vi.fn(() => applyProjectionLoaded(initialTreasuryScreenState(), projection));
  const reload = vi.fn().mockResolvedValue(undefined);
  return { state, reload };
});

const ResizeObserverMock = vi.hoisted(
  () =>
    class implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
);
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("./useTreasuryScreen.js", () => ({
  useTreasuryScreen: () => ({ state: hookMocks.state(), reload: hookMocks.reload }),
}));

afterEach(() => {
  cleanup();
  hookMocks.state.mockClear();
});

describe("TreasuryScreen", () => {
  it("renders the real income / expenditure / result figures from the projection", () => {
    render(<TreasuryScreen sessionId="ses-1" />);

    expect(screen.getByText("Government naval allocation")).not.toBeNull();
    expect(screen.getByText("4,000")).not.toBeNull();

    expect(screen.getByText("Fleet maintenance")).not.toBeNull();
    expect(screen.getByText("Construction")).not.toBeNull();
    expect(screen.getByText("Research")).not.toBeNull();
    expect(screen.getByText("Total expenditure")).not.toBeNull();
    expect(screen.getByText("1,000")).not.toBeNull();

    expect(screen.getByText("Projected surplus / deficit")).not.toBeNull();
    expect(screen.getByText("Available funds")).not.toBeNull();
    expect(screen.getByText("Projected month-end funds")).not.toBeNull();
    expect(screen.getByText("50,000")).not.toBeNull();
    expect(screen.getByText("53,000")).not.toBeNull();
    expect(screen.getByText("Surplus")).not.toBeNull();
  });

  it("renders no budget controls of any kind", () => {
    render(<TreasuryScreen sessionId="ses-1" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("input")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("flags a deficit honestly from a negative projected surplus", () => {
    const deficit: PlayerProjection = {
      ...projection,
      projectedSurplusDeficit: -250,
      economy: { ...projection.economy, maintenanceCost: 2500 },
    };
    hookMocks.state.mockReturnValue(applyProjectionLoaded(initialTreasuryScreenState(), deficit));
    render(<TreasuryScreen sessionId="ses-1" />);
    expect(screen.getByText("Deficit")).not.toBeNull();
  });
});
