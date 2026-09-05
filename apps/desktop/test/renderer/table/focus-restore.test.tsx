// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { FAMILIARITY_TIERS, STATURE_TIERS } from "@cm-clone/shared";
import { TransfersScreen } from "../../../src/renderer/transfers/TransfersScreen.js";
import { RouteView } from "../../../src/renderer/router/RouteView.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { chooseOptionByLabel } from "../../setup/baseUiSelect.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const marketPlayer = (
  id: string,
  name: string,
  position: string,
  club: boolean,
  overallRating = 78,
  transferValue = 1200000,
) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  age: 24,
  clubId: club ? rid(`club-${id}`) : null,
  clubName: club ? `Club ${id}` : null,
  overallRating,
  transferValue,
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
});

const transfersView = (overrides: {
  marketPlayers?: ReturnType<typeof marketPlayer>[];
  freeAgents?: ReturnType<typeof marketPlayer>[];
} = {}) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season" as const },
  windowOpen: true,
  transferBudgetRemaining: 500000,
  wageBudget: 1000000,
  wageBudgetUsed: 300000,
  incomingBids: [],
  outgoingBids: [],
  freeAgents:
    overrides.freeAgents ?? [marketPlayer("fa1", "Fan", "ST", false), marketPlayer("fa2", "Des", "DC", false)],
  marketPlayers:
    overrides.marketPlayers ??
    [
      marketPlayer("mp1", "Alan", "ST", true),
      marketPlayer("mp2", "Bob", "DC", true),
      marketPlayer("mp3", "Cal", "GK", true),
    ],
});

const mountTransfers = async (view: unknown, options: { withRouteView?: boolean } = {}): Promise<void> => {
  mockPreload(async (method) =>
    method === "getTransfersScreen"
      ? ({ _tag: "Success", value: view } as never)
      : ({ _tag: "Failure", error: NOT_FOUND } as never),
  );
  const screenContent = <TransfersScreen saveId={rid("s1")} />;
  render(
    <RegistryProvider>
      {options.withRouteView === true ? (
        <RouteView screenId="transfers">{screenContent}</RouteView>
      ) : (
        screenContent
      )}
    </RegistryProvider>,
  );
};

beforeEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
});

describe("AC-31 (review F-1) — Transfers restores focus when a sort/filter/refetch removes the focused row", () => {
  it("Market: filtering out the focused row restores focus to its old next neighbour, never document.body", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });

    const focused = document.querySelector(
      '[data-focus-id="transfers.marketTable.mp1"]',
    ) as HTMLElement;
    expect(focused).toBeTruthy();
    act(() => {
      focused.focus();
    });
    expect(document.activeElement).toBe(focused);

    // Filter out mp1 (ST): only DC rows remain. The roving universe loses the
    // focused row; the restore effect must land focus on mp2 (old next).
    await chooseOptionByLabel(/Filter Market by position/, "DC");
    await waitFor(() => {
      expect(document.activeElement?.getAttribute("data-focus-id")).toBe(
        "transfers.marketTable.mp2",
      );
    });
    // Never stranded on document.body.
    expect(document.activeElement).not.toBe(document.body);
  });

  it("Market: when every row is filtered out, focus leaves the region for the screen target — never document.body", async () => {
    await mountTransfers(transfersView(), { withRouteView: true });
    await screen.findByRole("button", { name: /Alan Player/ });

    const focused = document.querySelector(
      '[data-focus-id="transfers.marketTable.mp1"]',
    ) as HTMLElement;
    act(() => {
      focused.focus();
    });

    // A position with no Market row → empty result state; the restore effect's
    // empty-target hands focus to the screen primary (RouteView), never body.
    await chooseOptionByLabel(/Filter Market by position/, "AMC");
    await waitFor(() => screen.findByText("No players match the current filters."));
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("transfers");
    expect(document.activeElement).not.toBe(document.body);
  });

  it("Free Agents: filtering out the focused free-agent row restores focus to the first visible row", async () => {
    await mountTransfers(
      transfersView({
        freeAgents: [
          marketPlayer("fa1", "Fan", "ST", false),
          marketPlayer("fa2", "Des", "DC", false),
          marketPlayer("fa3", "Geo", "GK", false),
        ],
      }),
    );
    // Free Agents rows are rendered before the Market section.
    await screen.findByRole("button", { name: /Fan Player/ });

    const focused = document.querySelector(
      '[data-focus-id="transfers.freeAgentTable.fa1"]',
    ) as HTMLElement;
    expect(focused).toBeTruthy();
    act(() => {
      focused.focus();
    });

    await chooseOptionByLabel(/Filter Free Agents by position/, "DC");
    await waitFor(() => {
      expect(document.activeElement?.getAttribute("data-focus-id")).toBe(
        "transfers.freeAgentTable.fa2",
      );
    });
    expect(document.activeElement).not.toBe(document.body);
  });
});