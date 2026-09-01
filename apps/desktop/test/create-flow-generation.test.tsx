// @vitest-environment jsdom
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Effect } from "effect";
import { bindRouter } from "../src/renderer/navigation/adapter.js";
import {
  buildLeaguePresetIntents,
  getLeagueSetupIndex,
  resolveLeagueSelection,
} from "../src/main/leagueSelection.js";
import {
  CreateFlowLayout,
  LeagueSelectionRouteContent,
  StepOneRouteContent,
  StepThreeRouteContent,
  StepTwoRouteContent,
} from "../src/renderer/router/createFlow.js";
import { LEAGUE_SETUP_INDEX } from "@cm-clone/shared";

interface RpcCall {
  readonly method: string;
  readonly payload: unknown;
}

type Responder = (method: string, payload: unknown) => Promise<unknown>;

const calls: Array<RpcCall> = [];

const installPreload = (respond: Responder): void => {
  (window as unknown as { cmClone: { call: Responder } }).cmClone = {
    call: (method, payload) => {
      calls.push({ method, payload });
      return respond(method, payload);
    },
  };
};

const methodsCalled = (method: string): ReadonlyArray<RpcCall> =>
  calls.filter((call) => call.method === method);

/**
 * The real creation branch over a memory history. The flow is mounted through
 * an actual router rather than in isolation so the mount-time generation start,
 * the unmount-time abandonment, and the navigation adapter all run as shipped.
 */
const mountCreateFlow = ({
  strict = false,
  at = "/create/leagues",
}: { strict?: boolean; at?: string } = {}) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const mainMenuRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <p>Save List</p>,
  });
  const createFlowRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "create",
    component: CreateFlowLayout,
  });
  const routeTree = rootRoute.addChildren([
    mainMenuRoute,
    createFlowRoute.addChildren([
      createRoute({
        getParentRoute: () => createFlowRoute,
        path: "leagues",
        component: LeagueSelectionRouteContent,
      }),
      createRoute({
        getParentRoute: () => createFlowRoute,
        path: "step-1",
        component: StepOneRouteContent,
      }),
      createRoute({
        getParentRoute: () => createFlowRoute,
        path: "step-2",
        component: StepTwoRouteContent,
      }),
      createRoute({
        getParentRoute: () => createFlowRoute,
        path: "step-3",
        component: StepThreeRouteContent,
      }),
    ]),
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [at] }),
  });
  bindRouter(router);
  const tree = <RouterProvider router={router} />;
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

/**
 * The league-stage responses the flow needs before generation is allowed to start.
 *
 * Generation is gated on a `LeagueSelectionSnapshot` (Screen 3): the scope of the world is
 * settled before the world is built. These tests are about what happens *after* that gate, so
 * they satisfy it with a minimal valid snapshot rather than driving the whole selection screen —
 * `league-selection-screen.test.tsx` covers the stage itself.
 */
const LEAGUE_SNAPSHOT = {
  id: "snapshot-1",
  databaseFingerprint: LEAGUE_SETUP_INDEX.fingerprint,
  createdAt: "2026-01-01T00:00:00.000Z",
  intents: [],
  selections: [],
  dependencies: [],
  estimate: {
    selectedNationCount: 1,
    playableNationCount: 1,
    backgroundNationCount: 0,
    playableCompetitionCount: 1,
    backgroundCompetitionCount: 0,
    estimatedClubCount: 20,
    estimatedPlayerCount: 500,
    estimatedStaffCount: 160,
    estimatedMemoryBytes: 300_000_000,
    estimatedInitialSaveBytes: 12_000_000,
    simulationSpeedRating: "fast",
    confidence: "high",
  },
};

/**
 * Answers for the leagues stage, so the flow can be driven through it to reach the manager step.
 * `getLeagueSetupIndex`, `buildLeaguePreset`, and `resolveLeagueSelection` run the real service;
 * only the snapshot is a fixture, because these tests are about generation rather than scope.
 */
const leagueStageResponse = async (method: string, payload: unknown): Promise<unknown> => {
  switch (method) {
    case "getLeagueSetupIndex":
      return { _tag: "Success", value: json(await Effect.runPromise(getLeagueSetupIndex)) };
    case "loadSetupDraft":
      return { _tag: "Success", value: null };
    case "buildLeaguePreset":
      return {
        _tag: "Success",
        value: json(
          await Effect.runPromise(
            buildLeaguePresetIntents((payload as { preset: "recommended" }).preset),
          ),
        ),
      };
    case "resolveLeagueSelection": {
      const { selectionRevision, intents } = payload as { selectionRevision: number; intents: [] };
      return {
        _tag: "Success",
        value: json(await Effect.runPromise(resolveLeagueSelection(selectionRevision, intents))),
      };
    }
    case "submitLeagueSelection":
      return { _tag: "Success", value: LEAGUE_SNAPSHOT };
    default:
      return { _tag: "Success", value: undefined };
  }
};

const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value)) as unknown;

/**
 * Drive the leagues stage to completion. This is the real path into the manager step: the
 * snapshot it produces is what unblocks generation.
 */
const advanceThroughLeagues = async (): Promise<void> => {
  const button = await screen.findByRole("button", { name: /^Continue/ }, { timeout: 3000 });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false), {
    timeout: 3000,
  });
  fireEvent.click(button);
  await screen.findByRole("button", { name: "Next: Select Club" }, { timeout: 3000 });
};

/** A deferred `beginCareer` the test settles by hand, to sit inside the race. */
const deferredBeginCareer = () => {
  let settle: ((value: unknown) => void) | null = null;
  const pending = new Promise<unknown>((resolve) => {
    settle = resolve;
  });
  installPreload((method, payload) => {
    if (method === "beginCareer") return pending;
    return leagueStageResponse(method, payload);
  });
  return {
    succeed: (id: string) => settle?.({ _tag: "Success", value: { id } }),
    fail: () =>
      settle?.({
        _tag: "Failure",
        error: { _tag: "TransportFailure", method: "beginCareer", cause: null },
      }),
  };
};

beforeEach(() => {
  calls.length = 0;
  // The router restores scroll on every navigation; jsdom has no scrollTo.
  window.scrollTo = () => {};
  cleanup();
});
afterEach(cleanup);

describe("Screen 2 — generation runs underneath the manager step", () => {
  it("starts generation on entering the flow, before the player asks for club selection", async () => {
    deferredBeginCareer();
    mountCreateFlow();
    await advanceThroughLeagues();

    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    // The player has not touched the transition; the wait is already underway.
    expect(screen.getByRole("button", { name: "Next: Select Club" })).toBeTruthy();
  });

  it("starts exactly one job under a double-invoked mount effect", async () => {
    // StrictMode runs the mount effect twice, which is the shape a rapid
    // re-entry takes: one world on disk, not two.
    const generation = deferredBeginCareer();
    mountCreateFlow({ strict: true });
    await advanceThroughLeagues();

    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());

    expect(methodsCalled("beginCareer")).toHaveLength(1);
  });

  it("redirects a reload of a later step back to the leagues stage", async () => {
    // A reload arrives with an empty session: no league selection and no world. The manager step
    // is no longer a safe landing place either, because generation is gated on a scope nobody
    // has chosen yet — so the redirect goes to the front of the flow.
    deferredBeginCareer();
    mountCreateFlow({ at: "/create/step-2" });

    await screen.findByRole("heading", { name: "Select Leagues" }, { timeout: 3000 });
    expect(methodsCalled("beginCareer")).toHaveLength(0);
  });

  it("does not generate a world before the scope has been chosen", async () => {
    // Screen 3 §1: choosing scope must not create the world. Entering the flow is not consent
    // to generate — submitting the league selection is.
    deferredBeginCareer();
    mountCreateFlow();

    await screen.findByRole("heading", { name: "Select Leagues" }, { timeout: 3000 });
    expect(methodsCalled("beginCareer")).toHaveLength(0);

    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
  });

  it("says why the transition into club selection is unavailable", async () => {
    const generation = deferredBeginCareer();
    mountCreateFlow();
    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    const next = screen.getByRole("button", { name: "Next: Select Club" });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    // A greyed control that does not say why is not acceptable.
    expect(screen.getByText("Building the league first…")).toBeTruthy();
    expect(next.getAttribute("aria-describedby")).toBe("generation-blocked-reason");

    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByText("Building the league first…")).toBeNull());
  });

  it("represents the unmeasurable wait as indeterminate progress, not a percentage", async () => {
    deferredBeginCareer();
    mountCreateFlow();
    await advanceThroughLeagues();

    const bar = await screen.findByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.getAttribute("aria-label")).toBe("Building the league");
    expect(screen.getByRole("status").textContent).toBe("Building the league.");
  });
});

describe("Screen 2 — generation failure is recoverable", () => {
  it("offers Retry instead of a permanently disabled transition, and Retry reissues the job", async () => {
    const first = deferredBeginCareer();
    mountCreateFlow();
    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    first.fail();
    const retry = await screen.findByRole("button", { name: "Retry" });
    // The failure speaks; the blocked-reason line steps aside for it.
    expect(screen.queryByText("Building the league first…")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Building the league failed.");

    const second = deferredBeginCareer();
    fireEvent.click(retry);
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(2));

    second.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Retry" })).toBeNull());
  });
});

describe("Screen 2 — leaving creation never orphans a provisional world", () => {
  it("discards a world that was ready when the player cancelled", async () => {
    const generation = deferredBeginCareer();
    mountCreateFlow();
    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    expect(methodsCalled("discardCareer")[0]?.payload).toEqual({ id: "provisional-1" });
  });

  it("discards a world that arrives after the player cancelled", async () => {
    const generation = deferredBeginCareer();
    mountCreateFlow();
    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    // Cancel lands while `beginCareer` is still in flight: the id being
    // discarded does not exist yet at the moment the player asks.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await screen.findByText("Save List");
    expect(methodsCalled("discardCareer")).toHaveLength(0);

    generation.succeed("provisional-late");

    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    expect(methodsCalled("discardCareer")[0]?.payload).toEqual({ id: "provisional-late" });
  });

  it("discards once, not once per teardown", async () => {
    const generation = deferredBeginCareer();
    const { unmount } = mountCreateFlow();
    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));
    generation.succeed("provisional-1");
    await waitFor(() => expect(screen.queryByRole("progressbar")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    unmount();

    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
  });
});
