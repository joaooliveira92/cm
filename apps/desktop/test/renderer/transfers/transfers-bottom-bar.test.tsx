import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { FAMILIARITY_TIERS, STATURE_TIERS } from "@cm-clone/shared";
import { TransfersScreen } from "../../../src/renderer/transfers/TransfersScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { dispatchAction, resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { RegisteredScreenBar } from "../registered-screen-bar.js";

// Transfers' sort and filter commands report in the shell's bottom bar, as the Squad's do.

const rid = (s: string) => SaveId.make(s);

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
  overallRating: { _tag: "exact", value: overallRating },
  transferValue: { _tag: "exact", value: transferValue },
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
});

const transfersView = (overrides: {
  windowOpen?: boolean;
  marketPlayers?: ReturnType<typeof marketPlayer>[];
  freeAgents?: ReturnType<typeof marketPlayer>[];
} = {}) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, awaitingFixture: null, currentDate: "2026-08-01", phase: "in_season" as const },
  windowOpen: overrides.windowOpen ?? true,
  transferBudgetRemaining: 500000,
  wageBudget: 1000000,
  wageBudgetUsed: 300000,
  incomingBids: [],
  outgoingBids: [],
  freeAgents:
    overrides.freeAgents ?? [marketPlayer("fa", "Fran", "ST", false, 74, 600000)],
  marketPlayers:
    overrides.marketPlayers ??
    [marketPlayer("mp1", "Alan", "GK", true), marketPlayer("mp2", "Bob", "DC", true)],
});

const mountTransfers = async (view: unknown): Promise<void> => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) =>
      method === "getTransfersScreen"
        ? ({ _tag: "Success", value: view } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
  };
  render(
    <RegistryProvider>
      <TransfersScreen saveId={rid("s1")} />
      <RegisteredScreenBar />
    </RegistryProvider>,
  );
};

const reset = () => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
};

beforeEach(reset);
afterEach(reset);

describe("the Transfers bottom-bar notice", () => {
  it("a palette set-filter reports the filter and result count in the bottom bar on Transfers (F-7: parity with the Squad set-filter)", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    act(() => {
      dispatchAction("filter-transfer-market-dc", {
        tableId: "transfer-market",
        filter: { _tag: "position", position: "DC" },
      });
    });
    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Filtered by Position: DC. 1 player matches the current filters.",
    );
  });

  it("clears a Transfers notice when the tab changes, since it describes the tab it came from", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    act(() => {
      dispatchAction("filter-transfer-market-dc", {
        tableId: "transfer-market",
        filter: { _tag: "position", position: "DC" },
      });
    });
    expect(screen.getByRole("contentinfo").textContent).toContain("Filtered by Position: DC.");

    fireEvent.click(screen.getByRole("tab", { name: /Free Agents/ }));
    expect(screen.getByRole("contentinfo").textContent).not.toContain("Filtered by Position: DC.");
  });
});
