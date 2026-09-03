// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { bindRouter, navigate } from "../src/renderer/navigation/adapter.js";
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
 * The real creation branch over a memory history, mounted through an actual router so the shell's
 * chrome, the step routes and the navigation adapter all run as shipped. Same harness shape as
 * `create-flow-generation.test.tsx`; this file is about what the club step collects and what
 * survives out of it, rather than about the generation race.
 */
const mountCreateFlow = ({ at = "/create/leagues" }: { at?: string } = {}) => {
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
  return render(<RouterProvider router={router} />);
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


const CLUBS = [
  {
    clubId: "club-a",
    clubName: "Castlemere United",
    statureTier: "big",
    boardObjectiveMin: 1,
    boardObjectiveMax: 6,
    squadQualityBand: "Elite",
    transferBudget: 2_000_000,
    wageBudget: 800_000,
    detail: {
      squadSize: 25,
      averageAge: 25.4,
      topPlayers: [{ name: "Ada Keeper", position: "GK", overallRating: 80 }],
    },
  },
  {
    clubId: "club-b",
    clubName: "Millbrook Town",
    statureTier: "small",
    boardObjectiveMin: 15,
    boardObjectiveMax: 20,
    squadQualityBand: "Weak",
    transferBudget: 100_000,
    wageBudget: 40_000,
    detail: {
      squadSize: 25,
      averageAge: 26.1,
      topPlayers: [{ name: "Bo Striker", position: "ST", overallRating: 60 }],
    },
  },
];

/** The whole flow, answered from fixtures past the leagues stage. The club payload is a fixture
 *  here on purpose: `club-selection-screen.test.tsx` runs the real query, and this file is about
 *  what the flow does with a selection. */
const flowResponses =
  (over: Partial<Record<string, unknown>> = {}) =>
  async (method: string, payload: unknown): Promise<unknown> => {
    if (method in over) return over[method];
    switch (method) {
      case "beginCareer":
        return { _tag: "Success", value: { id: "provisional-1" } };
      case "getClubSelection":
        return { _tag: "Success", value: { clubs: CLUBS } };
      case "commitCareer":
        return {
          _tag: "Success",
          value: {
            id: "provisional-1",
            name: "Career",
            createdAt: "2026-01-01T00:00:00.000Z",
            archivedCause: null,
          },
        };
      default:
        return leagueStageResponse(method, payload);
    }
  };

/** Drive leagues → manager → club step, arriving on the workspace. */
const reachClubStep = async (): Promise<void> => {
  await advanceThroughLeagues();
  fireEvent.change(screen.getByPlaceholderText("My Career"), {
    target: { value: "Test Career" },
  });
  const next = await screen.findByRole("button", { name: "Next: Select Club" });
  await waitFor(() => expect((next as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(next);
  await screen.findByRole("listbox", { name: "Clubs" });
};

const clubRow = (name: string): HTMLElement =>
  within(screen.getByRole("listbox", { name: "Clubs" }))
    .getAllByRole("option")
    .find((row) => row.textContent?.includes(name))!;

beforeEach(() => {
  calls.length = 0;
  window.scrollTo = () => {};
  cleanup();
});
afterEach(cleanup);

describe("Step 3 — the club step collects the decision it exists to collect", () => {
  it("gates Continue on a pick, and opens it once one exists", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachClubStep();

    const next = screen.getByRole("button", { name: "Next: Review" });
    expect((next as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(clubRow("Castlemere United"));

    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Next: Review" }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
  });

  it("keeps the pick across a step back to Manager and forward again, panel populated", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachClubStep();

    fireEvent.click(clubRow("Millbrook Town"));
    await waitFor(() => expect(clubRow("Millbrook Town").getAttribute("aria-selected")).toBe("true"));

    // The club step ships no Back control, so the round trip is driven through the app's own
    // navigation adapter — the same call the shell makes — rather than through a button that
    // does not exist.
    act(() => navigate({ type: "createStep1" }));
    await screen.findByPlaceholderText("My Career");
    act(() => navigate({ type: "createStep2" }));

    await screen.findByRole("listbox", { name: "Clubs" });
    await waitFor(() => expect(clubRow("Millbrook Town").getAttribute("aria-selected")).toBe("true"));
    const panel = screen.getByRole("region", { name: "Club detail" });
    expect(within(panel).getByText("Millbrook Town")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Next: Review" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("runs the tab order club list → Pick a team for me → Cancel → Next: Review", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachClubStep();

    const stops = [...document.querySelectorAll<HTMLElement>("[tabindex='0'], button, select")]
      .filter((node) => !(node instanceof HTMLSelectElement && node.disabled))
      .filter((node) => !(node instanceof HTMLButtonElement && node.disabled));

    expect(stops).toHaveLength(3);
    expect(stops[0]!.getAttribute("role")).toBe("option");
    expect(stops[0]!.textContent).toContain("Castlemere United");
    expect(stops[1]!.textContent?.trim()).toBe("Pick a team for me");
    expect(stops[2]!.textContent?.trim()).toBe("Cancel");
    // `Next: Review` is the fourth stop and is deliberately disabled until a club is picked.
    expect(screen.getByRole("button", { name: "Next: Review" })).toBeTruthy();
  });

  it("carries the chosen club into the review step and into the commit", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachClubStep();

    fireEvent.click(clubRow("Castlemere United"));
    fireEvent.click(await screen.findByRole("button", { name: "Next: Review" }));

    await screen.findByRole("heading", { name: "Review Career" });
    expect(screen.getByText("Club:")).toBeTruthy();
    expect(screen.getByText("Castlemere United")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Create Career" }));

    await waitFor(() => expect(methodsCalled("commitCareer")).toHaveLength(1));
    const payload = methodsCalled("commitCareer")[0]!.payload as { selectedClubId: string };
    expect(payload.selectedClubId).toBe("club-a");
    // The placeholder that made the commit unreachable is gone from the flow entirely.
    expect(JSON.stringify(calls)).not.toContain("temp-club-id");
  });

  it("says what to do when the commit rejects the club id", async () => {
    installPreload(
      flowResponses({
        commitCareer: {
          _tag: "Failure",
          error: { _tag: "ClubNotFoundError", id: "club-a" },
        },
      }),
    );
    mountCreateFlow();
    await reachClubStep();

    fireEvent.click(clubRow("Castlemere United"));
    fireEvent.click(await screen.findByRole("button", { name: "Next: Review" }));
    await screen.findByRole("heading", { name: "Review Career" });
    fireEvent.click(screen.getByRole("button", { name: "Create Career" }));

    await screen.findByText("That club is no longer available. Choose another.");
    // The provisional world is not left behind, and the flow recovers to a step the player can
    // act from rather than a dead end.
    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    expect(screen.getByPlaceholderText("My Career")).toBeTruthy();
  });
});
