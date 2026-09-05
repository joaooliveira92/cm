// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import {
  FAMILIARITY_TIERS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITIONS,
  STATURE_TIERS,
} from "@cm-clone/shared";
import { SquadScreen } from "../src/renderer/squad/SquadScreen.js";
import { TransfersScreen } from "../src/renderer/transfers/TransfersScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";
import {
  dispatchAction,
  registerActionHandler,
  resetActionHandlers,
} from "../src/renderer/actions/dispatch.js";
import { ACTION_REGISTRY } from "../src/renderer/actions/allActions.js";
import { resetScopeState } from "../src/renderer/actions/scopeState.js";
import { resetTableSessions } from "../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../src/renderer/table/announcement.js";
import { chooseOptionByLabel, selectValueOf } from "./setup/baseUiSelect.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

const squadPlayer = (id: string, name: string, position: string) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
  overallRating: 80,
  positionRatings: { ST: 12 },
  condition: 100,
  trainingFocus: null,
  nationality: "England",
  birthplace: "London",
});

const squadView = (players: ReturnType<typeof squadPlayer>[]) => ({
  club: { id: rid("me"), name: "Test FC", statureTier: STATURE_TIERS[0] },
  players,
});

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

const transfersView = (overrides: Partial<Parameters<typeof transfersFixture>[0]> = {}) =>
  transfersFixture(overrides);

const transfersFixture = (overrides: {
  windowOpen?: boolean;
  marketPlayers?: ReturnType<typeof marketPlayer>[];
  freeAgents?: ReturnType<typeof marketPlayer>[];
} = {}) => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season" as const },
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

const mountSquad = async (view: unknown): Promise<void> => {
  mockPreload(async (method) =>
    method === "getSquad"
      ? ({ _tag: "Success", value: view } as never)
      : ({ _tag: "Failure", error: NOT_FOUND } as never),
  );
  render(
    <RegistryProvider>
      <SquadScreen saveId={rid("s1")} />
    </RegistryProvider>,
  );
};

const mountTransfers = async (view: unknown): Promise<void> => {
  mockPreload(async (method) =>
    method === "getTransfersScreen"
      ? ({ _tag: "Success", value: view } as never)
      : ({ _tag: "Failure", error: NOT_FOUND } as never),
  );
  render(
    <RegistryProvider>
      <TransfersScreen saveId={rid("s1")} />
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
  window.localStorage.clear();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
});

describe("AC-28 — row-oriented roving on a semantic <table>, no ARIA grid", () => {
  it("renders exactly one focusable control per row (the player-name button), roving one tab stop", async () => {
    await mountSquad(
      squadView([
        squadPlayer("p1", "Alan", POSITIONS[2]),
        squadPlayer("p2", "Bob", POSITIONS[2]),
        squadPlayer("p3", "Cal", POSITIONS[2]),
      ]),
    );
    await screen.findByText(/Alan Player/);
    const nameButtons = [...document.querySelectorAll("button[data-focus-id]")];
    expect(nameButtons).toHaveLength(3);
    const tabStops = nameButtons.filter((b) => b.getAttribute("tabindex") === "0");
    expect(tabStops).toHaveLength(1);
    // Semantic table — never a role="grid" composite.
    expect(document.querySelector("[role='grid']")).toBeNull();
    expect(document.querySelector("table")).toBeTruthy();
  });

  it("ArrowDown roves focus between name buttons; selection is separate from focus (Space commits selection)", async () => {
    await mountSquad(
      squadView([
        squadPlayer("p1", "Alan", POSITIONS[2]),
        squadPlayer("p2", "Bob", POSITIONS[2]),
        squadPlayer("p3", "Cal", POSITIONS[2]),
      ]),
    );
    await screen.findByText(/Alan Player/);
    const tbody = document.querySelector("tbody")!;
    const firstRow = document.querySelector('[data-focus-id="squad.squadTable.p1"]') as HTMLElement;
    firstRow.focus();

    // Space toggles selection WITHOUT moving focus.
    fireEvent.keyDown(tbody, { key: " " });
    const selectedRow = document.querySelector('tr[aria-selected="true"]')!;
    expect(selectedRow.textContent).toContain("Alan Player");

    // Roving focus moves on, selection stays on the committed player.
    fireEvent.keyDown(tbody, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("squad.squadTable.p2");
    expect(document.querySelector('tr[aria-selected="true"]')?.textContent).toContain("Alan Player");
  });

  it("clicking a name button (pointer) commits selection and marks that row aria-selected", async () => {
    await mountSquad(
      squadView([squadPlayer("p1", "Alan", POSITIONS[2]), squadPlayer("p2", "Bob", POSITIONS[2])]),
    );
    await screen.findByText(/Alan Player/);
    fireEvent.click(document.querySelector('[data-focus-id="squad.squadTable.p2"]')!);
    expect(document.querySelector('tr[aria-selected="true"]')?.textContent).toContain("Bob Player");
  });
});

describe("AC-30 — sortable header buttons in native Tab order with aria-sort", () => {
  it("a header button cycles asc → desc → none with aria-sort and announces the change", async () => {
    await mountSquad(
      squadView([
        squadPlayer("p1", "Zoe", POSITIONS[2]),
        squadPlayer("p2", "Alan", POSITIONS[2]),
      ]),
    );
    await screen.findByText(/Zoe Player/);
    const group = screen.getByRole("group", { name: "Squad" });
    const nameHeader = within(group).getByRole("button", { name: "Name" });
    expect(nameHeader.tabIndex).toBe(0); // native Tab order, not roving

    fireEvent.click(nameHeader);
    expect(group.querySelector("th[aria-sort]")?.getAttribute("aria-sort")).toBe("ascending");
    expect(within(group).getByRole("status").textContent).toContain("Sorted by Name, ascending.");

    fireEvent.click(within(group).getByRole("button", { name: "Name" }));
    expect(group.querySelector("th[aria-sort]")?.getAttribute("aria-sort")).toBe("descending");

    // Removal enabled: a third click drops the sort and the header.
    fireEvent.click(within(group).getByRole("button", { name: "Name" }));
    expect(group.querySelector("th[aria-sort]")).toBeNull();
  });
});

describe("AC-29 — bid entry lives in the contextual Actions region, never in a row", () => {
  it("selecting a Market player shows the region with the single bid input; no input exists inside rows", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });

    // No bid input anywhere before a selection.
    expect(document.querySelector("input[placeholder='Amount']")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Alan Player/ }));
    const region = screen.getByRole("region", { name: "Place bid" });
    expect(region.textContent).toContain("Player: Alan Player");
    const amount = screen.getByLabelText("Your bid:") as HTMLInputElement;
    // The bid button only enables once a positive amount is typed.
    const bidButton = within(region).getByRole("button", { name: "Bid" }) as HTMLButtonElement;
    expect(bidButton.disabled).toBe(true);
    fireEvent.change(amount, { target: { value: "500000" } });
    expect((within(region).getByRole("button", { name: "Bid" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("a dirty draft on selection change asks for an explicit discard — no silent discard", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    fireEvent.click(screen.getByRole("button", { name: /Alan Player/ }));
    fireEvent.change(screen.getByLabelText("Your bid:"), { target: { value: "450000" } });

    // Retarget to a different player while the draft is dirty.
    fireEvent.click(screen.getByRole("button", { name: /Bob Player/ }));
    const confirm = screen.getByRole("dialog", { name: "Discard the bid in progress?" });
    expect(confirm.textContent).toContain("You typed an amount");

    // Explicit discard retargets to the new player with a clean draft.
    fireEvent.click(within(confirm).getByRole("button", { name: "Discard draft" }));
    expect(screen.queryByRole("dialog", { name: "Discard the bid in progress?" })).toBeNull();
    const region = screen.getByRole("region", { name: "Place bid" });
    expect(region.textContent).toContain("Player: Bob Player");
    expect((screen.getByLabelText("Your bid:") as HTMLInputElement).value).toBe("");
  });

  it("Keep-bid preserves the drafted player and amount when the retarget is refused", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    fireEvent.click(screen.getByRole("button", { name: /Alan Player/ }));
    fireEvent.change(screen.getByLabelText("Your bid:"), { target: { value: "450000" } });
    fireEvent.click(screen.getByRole("button", { name: /Bob Player/ }));

    const confirm = screen.getByRole("dialog", { name: "Discard the bid in progress?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Keep bid" }));
    expect(screen.queryByRole("dialog", { name: "Discard the bid in progress?" })).toBeNull();
    const region = screen.getByRole("region", { name: "Place bid" });
    expect(region.textContent).toContain("Player: Alan Player");
    expect((screen.getByLabelText("Your bid:") as HTMLInputElement).value).toBe("450000");
  });
});

describe("AC-30 — visible filter controls show active state and drive the same command as the palette", () => {
  it("the Market name search and position filter are visible native controls that filter rows", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    const group = screen.getByRole("group", { name: "Market" });
    // The visible filter controls sit ABOVE the table (outside the group).

    // Name search hides the non-matching player.
    fireEvent.change(screen.getByLabelText("Search Market by name"), {
      target: { value: "bob" },
    });
    expect(within(group).queryByRole("button", { name: /Alan Player/ })).toBeNull();
    expect(within(group).getByRole("button", { name: /Bob Player/ })).toBeTruthy();

    // Position filter is an independent visible control.
    await chooseOptionByLabel(/Filter Market by position/, "DC");
    expect(within(group).getByRole("button", { name: /Bob Player/ })).toBeTruthy();

    // Filters that hide every Market row surface the explicit no-filter-results state.
    await chooseOptionByLabel(/Filter Market by position/, "ST");
    fireEvent.change(screen.getByLabelText("Search Market by name"), {
      target: { value: "" },
    });
    expect(screen.getByText("No players match the current filters.")).toBeTruthy();
    // Both the filter row and the empty-result state offer a clear path (two
    // identical buttons is expected here).
    expect(
      screen.getAllByRole("button", { name: "Clear all filters" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("filtering by keyboard through a palette Action (dispatchAction) applies the same filter command", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });

    // The enumerated `filter-transfer-market-st` palette row dispatches with
    // typed params; no ST player exists in the Market fixture → NoFilterResults.
    act(() => {
      dispatchAction("filter-transfer-market-st", {
        tableId: "transfer-market",
        filter: { _tag: "position", position: "ST" },
      });
    });
    expect(await screen.findByText("No players match the current filters.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Alan Player/ })).toBeNull();
    // The visible control reflects the same active state as the palette command.
    expect(selectValueOf(screen.getByLabelText("Filter Market by position"))).toBe("ST");
  });

  it("a palette set-filter announces the new result count on Transfers (F-7: parity with the Squad set-filter)", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    act(() => {
      dispatchAction("filter-transfer-market-dc", {
        tableId: "transfer-market",
        filter: { _tag: "position", position: "DC" },
      });
    });
    const marketGroup = screen.getByRole("group", { name: "Market" });
    expect(within(marketGroup).getByRole("status").textContent).toContain(
      "1 player matches the current filters.",
    );
  });
});

describe("AC-31 — selection cleared when the selected row is filtered out (explicit)", () => {
  it("Squad: selecting a row then hiding it behind a position filter clears the selection and announces it", async () => {
    await mountSquad(
      squadView([squadPlayer("gk", "Garek", "GK"), squadPlayer("dc", "Dorso", "DC")]),
    );
    await screen.findByText(/Garek Player/);
    fireEvent.click(document.querySelector('[data-focus-id="squad.squadTable.gk"]')!);
    expect(document.querySelector('tr[aria-selected="true"]')).toBeTruthy();

    await chooseOptionByLabel(/Filter squad by position/, "DC");
    await screen.findByText(/Dorso Player/);
    expect(document.querySelector('tr[aria-selected="true"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Garek Player/ })).toBeNull();
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("hidden by the current filters");
  });

  it("Transfers: the filtered-out selected player disappears from the Actions region too", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    fireEvent.click(screen.getByRole("button", { name: /Alan Player/ }));
    expect(screen.getByRole("region", { name: "Place bid" })).toBeTruthy();

    await chooseOptionByLabel(/Filter Market by position/, "DC");
    await screen.findByRole("button", { name: /Bob Player/ });
    // Alan is filtered out → selection cleared → the Actions region unmounts.
    expect(screen.queryByRole("region", { name: "Place bid" })).toBeNull();
    expect(document.querySelector('tr[aria-selected="true"]')).toBeNull();
  });
});

describe("AC-32 — explicit result/refresh states, polite status announcer, role=alert for blocking errors", () => {
  it("initial loading renders aria-busy with no spinner focus; then the populated table has one polite status per table", async () => {
    mockPreload(async (method) =>
      method === "getSquad"
        ? ({ _tag: "Success", value: squadView([squadPlayer("p1", "Alan", POSITIONS[2])]) } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    render(
      <RegistryProvider>
        <SquadScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    // The atom's initial value renders the loading state synchronously.
    const loading = screen.getByText("Loading squad…");
    expect(loading.closest("[aria-busy='true']")).toBeTruthy();

    await screen.findByRole("button", { name: /Alan Player/ });
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("a blocking load error on Squad renders role=alert with the copy and a Retry affordance", async () => {
    mockPreload(async (method) =>
      method === "getSquad"
        ? ({ _tag: "Failure", error: NOT_FOUND } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    render(
      <RegistryProvider>
        <SquadScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("That save could not be found.");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeTruthy();
  });

  it("a blocking load error on Transfers renders role=alert", async () => {
    mockPreload(async (method) =>
      method === "getTransfersScreen"
        ? ({ _tag: "Failure", error: NOT_FOUND } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    render(
      <RegistryProvider>
        <TransfersScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("That save could not be found.");
  });

  it("Empty Squad renders the EmptyDataset copy; bid tables stay hand-rendered on Transfers", async () => {
    await mountSquad(squadView([]));
    expect(await screen.findByText("No players are currently in your squad.")).toBeTruthy();

    cleanup();
    await mountTransfers(transfersView({ marketPlayers: [], freeAgents: [] }));
    await screen.findByText("No players are currently listed on the transfer market.");
    expect(screen.getByText("No free agents are currently available.")).toBeTruthy();
    // The bid inbox is still plain <table> markup, not the TanStack layer.
    const inboxTables = [...document.querySelectorAll("table")];
    expect(inboxTables.length).toBe(2);
    expect(inboxTables.some((t) => t.textContent?.includes("No incoming Bids."))).toBe(true);
    expect(inboxTables.some((t) => t.textContent?.includes("No outgoing Bids."))).toBe(true);
  });

  it("Empty Squad's affordances are real buttons dispatching registered navigation Actions (note's Empty Squad line)", async () => {
    await mountSquad(squadView([]));
    expect(await screen.findByText("No players are currently in your squad.")).toBeTruthy();
    const explore = screen.getByRole("button", { name: "Explore Free Agents" });
    const market = screen.getByRole("button", { name: "Go to Transfer Market" });
    // Visible controls dispatching the registered career navigation Action.
    expect(explore.getAttribute("data-action-id")).toBe("go-to-transfers");
    expect(market.getAttribute("data-action-id")).toBe("go-to-transfers");
    expect(ACTION_REGISTRY.get("go-to-transfers")).toBeDefined();
    const spy = vi.fn();
    const unregister = registerActionHandler("go-to-transfers", spy);
    fireEvent.click(explore);
    expect(spy).toHaveBeenCalledTimes(1);
    fireEvent.click(market);
    expect(spy).toHaveBeenCalledTimes(2);
    unregister();
  });

  it("a populated Transfers screen carries one polite status announcer per TanStack table", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    expect(screen.getAllByRole("status")).toHaveLength(2);
    // No assertive live region for routine loading.
    expect(document.querySelector("[aria-live='assertive']")).toBeNull();
  });
});

describe("review repairs (stage-5 review) — F1 refresh keeps rows, F2 retry, F3 announcer, F8 NaN bid", () => {
  it("F1: a failed Squad refresh keeps the rows and shows a non-blocking refresh error with Retry", async () => {
    let squadCalls = 0;
    mockPreload(async (method) => {
      if (method === "getSquad") {
        squadCalls += 1;
        if (squadCalls === 1) {
          return { _tag: "Success", value: squadView([squadPlayer("p1", "Alan", POSITIONS[2])]) } as never;
        }
        // The revalidation fails while the previous Success stayed put.
        return { _tag: "Failure", error: NOT_FOUND } as never;
      }
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <SquadScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByRole("button", { name: /Alan Player/ });

    // A manual retry (the exact Action the Retry button dispatches) revalidates.
    act(() => {
      dispatchAction("retry-squad-table");
    });

    await screen.findByText(/Refresh failed/);
    // Rows persist and the error is non-blocking — a line, not an alert that
    // replaces the table.
    expect(screen.getByRole("button", { name: /Alan Player/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(squadCalls).toBe(2);
  });

  it("F1: a failed Transfers refresh keeps both tables and shows the non-blocking refresh error", async () => {
    let transfersCalls = 0;
    mockPreload(async (method) => {
      if (method === "getTransfersScreen") {
        transfersCalls += 1;
        if (transfersCalls === 1) {
          return { _tag: "Success", value: transfersView() } as never;
        }
        return { _tag: "Failure", error: NOT_FOUND } as never;
      }
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <TransfersScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    await screen.findByRole("button", { name: /Alan Player/ });

    act(() => {
      dispatchAction("retry-market-table");
    });

    await screen.findByText(/Refresh failed/);
    expect(screen.getByRole("button", { name: /Alan Player/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(transfersCalls).toBe(2);
  });

  it("F2: a blocking load error on Transfers offers a Retry that re-runs the load", async () => {
    let calls = 0;
    mockPreload(async () => {
      calls += 1;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    render(
      <RegistryProvider>
        <TransfersScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("That save could not be found.");
    const retry = within(alert).getByRole("button", { name: "Retry" });
    expect(retry).toBeTruthy();
    expect(calls).toBe(1);
    fireEvent.click(retry);
    await waitFor(() => {
      expect(calls).toBeGreaterThanOrEqual(2);
    });
  });

  it("F3: the polite status announcer survives the zero-rows transition (Squad)", async () => {
    await mountSquad(
      squadView([squadPlayer("gk", "Garek", "GK"), squadPlayer("dc", "Dorso", "DC")]),
    );
    await screen.findByText(/Garek Player/);
    fireEvent.click(document.querySelector('[data-focus-id="squad.squadTable.gk"]')!);
    expect(screen.getByRole("status").textContent).toContain("Selected Garek Player.");

    // A filter with no matching rows flips the screen to NoFilterResults in the
    // same render the old announcer would unmount; the one status region must
    // persist and keep the latest line.
    await chooseOptionByLabel(/Filter squad by position/, "ST");
    expect(screen.getByText("No players match the current filters.")).toBeTruthy();
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("hidden by the current filters");
  });

  it("F8: a non-numeric bid amount never enables Bid (NaN must not read as > 0)", async () => {
    await mountTransfers(transfersView());
    await screen.findByRole("button", { name: /Alan Player/ });
    fireEvent.click(screen.getByRole("button", { name: /Alan Player/ }));
    const region = screen.getByRole("region", { name: "Place bid" });
    const amount = screen.getByLabelText("Your bid:") as HTMLInputElement;
    const bidButton = () =>
      within(region).getByRole("button", { name: "Bid" }) as HTMLButtonElement;

    fireEvent.change(amount, { target: { value: "abc" } });
    expect(bidButton().disabled).toBe(true);

    fireEvent.change(amount, { target: { value: "0" } });
    expect(bidButton().disabled).toBe(true);

    fireEvent.change(amount, { target: { value: "-5" } });
    expect(bidButton().disabled).toBe(true);

    fireEvent.change(amount, { target: { value: "500000" } });
    expect(bidButton().disabled).toBe(false);
  });
});