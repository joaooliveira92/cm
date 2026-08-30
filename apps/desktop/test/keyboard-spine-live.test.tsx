// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";
import { SaveId } from "@cm-clone/contracts";
import { STATURE_TIERS } from "@cm-clone/shared";
import { KeyboardSpine, PrefixIndicator, PREFIX_INDICATOR_ENTRIES } from "../src/renderer/KeyboardSpine.js";
import { bindRouter } from "../src/renderer/navigation/adapter.js";
import { resetActionHandlers } from "../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../src/renderer/actions/scopeState.js";
import { G_PREFIX_COMPLETIONS } from "../src/renderer/actions/allActions.js";
import { setPrefixTimeoutMs } from "../src/renderer/keymap/timeout.js";
import { teachingSplashStorageKey } from "../src/renderer/discoverability/TeachingSplash.js";
import { TransfersScreen } from "../src/renderer/TransfersScreen.js";
import { LeagueTableScreen } from "../src/renderer/LeagueTableScreen.js";
import { RegistryProvider } from "../src/renderer/rpc.js";

const rid = (id: string) => SaveId.make(id);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const marketPlayer = (id: string) => ({
  id: rid(id),
  firstName: "Test",
  lastName: id.toUpperCase(),
  age: 24,
  clubId: rid(`club-${id}`),
  clubName: `Club ${id}`,
  overallRating: 78,
  transferValue: 1200000,
  positions: [],
});

const transfersView = () => ({
  club: { id: rid("me"), name: "My Club", statureTier: STATURE_TIERS[0] },
  season: { seasonNumber: 1, currentMatchday: 1, phase: "in_season" as const },
  windowOpen: true,
  transferBudgetRemaining: 500000,
  wageBudget: 1000000,
  wageBudgetUsed: 300000,
  incomingBids: [],
  outgoingBids: [],
  freeAgents: [],
  marketPlayers: [marketPlayer("mp")],
});

const leagueView = (phase: "in_season" | "season_complete") => ({
  season: { seasonNumber: 1, currentMatchday: 1, phase },
  standings: [],
});

describe("AC-18 — the live prefix indicator and lifecycle run through the spine", () => {
  let navCalls: Array<{ to: string }> = [];
  let backCalls = 0;

  const mountTransfersWithSpine = async (): Promise<void> => {
    mockPreload(async (method) => {
      if (method === "getTransfersScreen") return { _tag: "Success", value: transfersView() } as never;
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <KeyboardSpine />
        </>
      ),
    });
    const transfersRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/career/$saveId/transfers",
      component: () => (
        <RegistryProvider>
          <TransfersScreen saveId={rid("s1")} />
        </RegistryProvider>
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([transfersRoute]),
      history: createMemoryHistory({ initialEntries: ["/career/s1/transfers"] }),
    });
    bindRouter({
      navigate: (opts: { to: string }) => navCalls.push({ to: opts.to }),
      history: { back: () => (backCalls += 1) },
    } as never);
    render(<RouterProvider router={router} />);
    await screen.findByRole("button", { name: /Test MP/ });
  };

  beforeEach(async () => {
    cleanup();
    navCalls = [];
    backCalls = 0;
    resetActionHandlers();
    resetScopeState();
    // These scenarios mount a career screen after the one-shot teaching splash
    // has been dismissed (Stage 4), so the splash never steals focus or the
    // keystrokes under test.
    window.localStorage.setItem(teachingSplashStorageKey, "1");
    // TanStack Router's scroll restoration calls window.scrollTo on navigation,
    // which jsdom doesn't implement; stub it so the noise stays out of the runs.
    window.scrollTo = () => undefined;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    resetScopeState();
  });

  it("renders the nonmodal prefix indicator (screen-level) with every g-destination", () => {
    render(<PrefixIndicator entries={PREFIX_INDICATOR_ENTRIES} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Go to:");
    expect(status.textContent).toContain("Squad [S]");
    expect(status.textContent).toContain("Tactics [A]");
    expect(status.textContent).toContain("Season Summary [Y]");
  });

  it("pressing g alone shows the indicator and completes no navigation", async () => {
    await mountTransfersWithSpine();
    act(() => fireEvent.keyDown(document, { key: "g" }));
    expect(screen.getByText("Go to:").textContent).toContain("Go to:");
    expect(navCalls).toEqual([]);
    expect(backCalls).toBe(0);
    act(() => fireEvent.keyDown(document, { key: "Escape" }));
    expect(screen.queryByText("Go to:")).toBeNull();
  });

  it("a valid completion key navigates and hides the indicator", async () => {
    await mountTransfersWithSpine();
    act(() => fireEvent.keyDown(document, { key: "g" }));
    act(() => fireEvent.keyDown(document, { key: "s" }));
    expect(screen.queryByText("Go to:")).toBeNull();
    expect(navCalls.map((c) => c.to)).toEqual(["/career/$saveId/squad"]);
  });

  it("an invalid key cancels without navigating and without firing a bare action", async () => {
    await mountTransfersWithSpine();
    act(() => fireEvent.keyDown(document, { key: "g" }));
    act(() => fireEvent.keyDown(document, { key: "q" }));
    expect(screen.queryByText("Go to:")).toBeNull();
    expect(navCalls).toEqual([]);
    expect(backCalls).toBe(0);
    expect(document.activeElement?.tagName).not.toBe("INPUT");
  });

  it("g b completes go-back (live completions include b) and does not focus the bid input", async () => {
    await mountTransfersWithSpine();
    expect(G_PREFIX_COMPLETIONS.has("b")).toBe(true);
    act(() => fireEvent.keyDown(document, { key: "g" }));
    act(() => fireEvent.keyDown(document, { key: "b" }));
    expect(screen.queryByText("Go to:")).toBeNull();
    expect(backCalls).toBe(1);
    expect(navCalls).toEqual([]);
    // The prefix owned `b`; the transfers bare `b` (focus-bid) must NOT have fired.
    expect(document.activeElement?.getAttribute("placeholder")).not.toBe("Amount");
  });

  it("a bare b focuses the bid workflow on Transfers (not submit)", async () => {
    await mountTransfersWithSpine();
    act(() => fireEvent.keyDown(document, { key: "b" }));
    // Stage 5 (AC-29): the bid input lives in the Actions region behind a
    // selection, so with nothing drafted `b` lands on the Market table's first
    // row (the start of the bid flow) — still no submission.
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("transfers.marketTable.mp");
  });

  it("the ~800ms timeout auto-cancels an incomplete prefix", async () => {
    await mountTransfersWithSpine();
    vi.useFakeTimers();
    try {
      const prior = setPrefixTimeoutMs(30);
      try {
        act(() => fireEvent.keyDown(document, { key: "g" }));
        expect(screen.getByText("Go to:")).toBeTruthy();
        act(() => vi.advanceTimersByTime(40));
        expect(screen.queryByText("Go to:")).toBeNull();
        expect(navCalls).toEqual([]);
      } finally {
        setPrefixTimeoutMs(prior);
      }
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("AC-19 — Space→Continue honours the safety guard through the live spine", () => {
  let advanceCalls = 0;

  const mountLeagueWithSpine = async (phase: "in_season" | "season_complete") => {
    advanceCalls = 0;
    mockPreload(async (method) => {
      if (method === "getLeagueTable") {
        return { _tag: "Success", value: leagueView(phase) } as never;
      }
      if (method === "advanceCalendar") {
        advanceCalls += 1;
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 1, currentMatchday: 2, phase: "in_season" as const },
            resolvedMatchday: 1,
            transferWindowClosed: null,
            transferWindowOpened: null,
            seasonConcluded: false,
            boardObjectiveVerdict: null,
            managerOutcome: "none" as const,
          },
        } as never;
      }
      return { _tag: "Failure", error: NOT_FOUND } as never;
    });
    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <KeyboardSpine />
        </>
      ),
    });
    const leagueRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/career/$saveId/league",
      component: () => (
        <RegistryProvider>
          <LeagueTableScreen saveId={rid("s1")} />
        </RegistryProvider>
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([leagueRoute]),
      history: createMemoryHistory({ initialEntries: ["/career/s1/league"] }),
    });
    bindRouter({ navigate: () => undefined, history: { back: () => undefined } } as never);
    render(<RouterProvider router={router} />);
    await screen.findByRole("button", { name: /Advance Calendar/ });
  };

  beforeEach(() => {
    cleanup();
    resetActionHandlers();
    resetScopeState();
    window.localStorage.setItem(teachingSplashStorageKey, "1");
    window.scrollTo = () => undefined;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    resetScopeState();
  });

  it("does NOT fire when the season is complete", async () => {
    await mountLeagueWithSpine("season_complete");
    const button = screen.getByRole("button", { name: /Advance Calendar/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    act(() => fireEvent.keyDown(document, { key: " " }));
    expect(advanceCalls).toBe(0);
  });

  it("does fire exactly once when the safety contract permits", async () => {
    await mountLeagueWithSpine("in_season");
    act(() => fireEvent.keyDown(document, { key: " " }));
    expect(advanceCalls).toBe(1);
  });
});

describe("AC-17 — the registry's coded bindings are exactly what the live spine can reach", () => {
  // The spine derives ALL key handling from the registry (via resolveDispatch);
  // a binding a screen advertises is reachable, and nothing else is hard-wired.
  it("the live prefix completion set is registry-derived and covers g b", () => {
    expect(new Set(["s", "a", "t", "l", "f", "m", "y", "b"])).toEqual(G_PREFIX_COMPLETIONS);
  });
});