// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { SaveId } from "@cm-clone/contracts";
import { FAMILIARITY_TIERS, STATURE_TIERS } from "@cm-clone/shared";
import { CareerShell, CareerChildView } from "../../../src/renderer/router/career.js";
import { TransfersScreen } from "../../../src/renderer/transfers/TransfersScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { readTableSession, resetTableSessions } from "../../../src/renderer/table/tableState.js";
import { resetAnnouncements } from "../../../src/renderer/table/announcement.js";
import { chooseOptionByLabel, comboboxByLabel, selectValueOf } from "../../setup/baseUiSelect.js";

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
  transferValue = 1200000,
) => ({
  id: rid(id),
  firstName: name,
  lastName: "Player",
  age: 24,
  clubId: club ? rid(`club-${id}`) : null,
  clubName: club ? `Club ${id}` : null,
  overallRating: 78,
  transferValue,
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
});

const transfersView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentDate: "2026-08-01", phase: "in_season" as const },
  windowOpen: true,
  transferBudgetRemaining: 500000,
  wageBudget: 1000000,
  wageBudgetUsed: 300000,
  incomingBids: [],
  outgoingBids: [],
  freeAgents: [],
  marketPlayers: [marketPlayer("mp1", "Alan", "GK", true), marketPlayer("mp2", "Bob", "DC", true)],
});

/** The real career seam: `/career/$saveId` layout (CareerShell owns the
 *  save-switch reset) plus one child route, mounted on memory history. */
const buildRouter = () => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "career",
    component: () => <Outlet />,
  });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: CareerShell,
  });
  const transfersRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: "transfers",
    component: () => <CareerChildView screenId="transfers" Screen={TransfersScreen} />,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([transfersRoute])]),
    ]),
    history: createMemoryHistory({ initialEntries: ["/career/s1/transfers"] }),
  });
};

beforeEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
  window.localStorage.clear();
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetTableSessions();
  resetAnnouncements();
});

describe("AC-27 (review F-8) — table session state never leaks across a save switch", () => {
  it("a second save does not inherit the first save's sort/filters/focus/draft", async () => {
    mockPreload(async (method) =>
      method === "getTransfersScreen"
        ? ({ _tag: "Success", value: transfersView() } as never)
        : ({ _tag: "Failure", error: NOT_FOUND } as never),
    );
    const router = buildRouter();
    bindRouter(router as never);
    render(<RouterProvider router={router} />);
    await screen.findByRole("button", { name: /Alan Player/ });

    // First save (s1): sort the Market, filter it, focus a row, open a draft.
    const marketGroup = screen.getByRole("group", { name: "Market" });
    fireEvent.click(within(marketGroup).getByRole("button", { name: "OVR" }));
    expect(marketGroup.querySelector("th[aria-sort]")).toBeTruthy();

    await chooseOptionByLabel(/Filter Market by position/, "DC");
    const row = document.querySelector(
      '[data-focus-id="transfers.marketTable.mp2"]',
    ) as HTMLElement;
    act(() => {
      row.focus();
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Bob Player/ }));
    });
    fireEvent.change(screen.getByLabelText("Your bid:"), { target: { value: "300000" } });
    expect(screen.getByRole("region", { name: "Place bid" })).toBeTruthy();
    expect(readTableSession("transfer-market")?.sort).toEqual({
      columnId: "overall",
      direction: "asc",
    });
    expect(readTableSession("transfer-market")?.filters).toEqual([
      { _tag: "position", position: "DC" },
    ]);
    expect(readTableSession("transfer-market")?.focusBookmark).not.toBeNull();

    // Switch to a different save: the real CareerShell seam remounts the
    // keyed registry subtree and clears the module-level table sessions.
    act(() => {
      void router.navigate({ to: "/career/$saveId/transfers", params: { saveId: rid("s2") } });
    });

    // The second save renders the same players from a fresh registry...
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Market" })).toBeTruthy(),
    );
    await waitFor(() => expect(screen.findByRole("button", { name: /Alan Player/ })).toBeTruthy());
    // ...but inherits nothing from the first save:
    expect(screen.queryByRole("region", { name: "Place bid" })).toBeNull(); // no draft
    expect(screen.getByRole("group", { name: "Market" }).querySelector("th[aria-sort]")).toBeNull(); // no sort
    expect(selectValueOf(comboboxByLabel(/Filter Market by position/))).toBe(""); // no filter
    expect(readTableSession("transfer-market")).toBeNull(); // session map is clean
  });
});