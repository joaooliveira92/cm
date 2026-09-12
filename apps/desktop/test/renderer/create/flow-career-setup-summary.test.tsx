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
import { bindRouter, navigate } from "../../../src/renderer/navigation/adapter.js";
import { buildLeaguePresetIntents, getLeagueSetupIndex, resolveLeagueSelection } from "../../../src/main/world/index.js";
import { CreateFlowLayout } from "../../../src/renderer/create/CreateFlowLayout.js";
import {
  LeagueSelectionRouteContent,
  StepOneRouteContent,
  StepThreeRouteContent,
  StepTwoRouteContent,
} from "../../../src/renderer/router/createFlow.js";
import { LEAGUE_SETUP_INDEX } from "@cm-clone/shared";

/**
 * §22's Career Setup Summary as the Review step renders it.
 *
 * The world figures are a fixture here rather than a real generated world — `career-setup-summary`
 * in `test/main/career/` runs the real count against a real save, and this file is about what the
 * step does with the answer: that it shows up beside the configuration, that a failed read costs
 * the player a line and not a career, and that nothing on the panel can edit a foundation.
 */

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
 * The snapshot the leagues stage produces. Its estimate is deliberately *wrong* about the world:
 * 20 clubs and 500 players against a summary reporting 140 and 3,500. That divergence is the whole
 * assertion behind "generated, not estimated" — a panel that quietly reused the estimate would
 * render the estimate's numbers and this file would catch it.
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

const SUMMARY = {
  seasonNumber: 1,
  seasonLabel: "2026/27",
  seasonStartDate: "2026-07-04",
  nationCount: 2,
  competitions: [
    { depth: "full", competitionCount: 3, clubCount: 60 },
    { depth: "results-only", competitionCount: 4, clubCount: 80 },
  ],
  clubCount: 140,
  playerCount: 3500,
  staffCount: 0,
};

const json = (value: unknown): unknown => JSON.parse(JSON.stringify(value)) as unknown;

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
];

const flowResponses =
  (over: Partial<Record<string, unknown>> = {}) =>
  async (method: string, payload: unknown): Promise<unknown> => {
    if (method in over) return over[method];
    switch (method) {
      case "beginCareer":
        return { _tag: "Success", value: { id: "provisional-1" } };
      case "getClubSelection":
        return { _tag: "Success", value: { clubs: CLUBS, leagueName: "English First Division" } };
      case "getCareerSetupSummary":
        return { _tag: "Success", value: SUMMARY };
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

/** Leagues → manager → club → review, arriving on the Review step with a club picked. */
const reachReviewStep = async (): Promise<void> => {
  const button = await screen.findByRole("button", { name: /^Continue/ }, { timeout: 3000 });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false), { timeout: 3000 });
  fireEvent.click(button);

  const nameInput = await screen.findByPlaceholderText("My Career");
  fireEvent.change(nameInput, { target: { value: "Test Career" } });
  fireEvent.click(await screen.findByRole("button", { name: "Next: Manager Identity" }));

  const next = await screen.findByRole("button", { name: "Next: Select Club" }, { timeout: 3000 });
  await waitFor(() => expect((next as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(next);

  const table = await screen.findByRole("table", { name: "Clubs" });
  const row = within(table)
    .getAllByRole("row")
    .find((candidate) => candidate.textContent?.includes("Castlemere United"))!;
  fireEvent.click(row);
  fireEvent.click(await screen.findByRole("button", { name: "Next: Review" }));
  await screen.findByRole("heading", { name: "Review Career" });
};

/** The value rendered against a term, read the way a screen reader pairs them: the `dd` that
 *  follows the `dt`, not the next matching string anywhere on the page. */
const figure = (label: string): string => {
  const term = screen.getByText(`${label}:`);
  return term.parentElement?.querySelector("dd")?.textContent?.trim() ?? "";
};

const worldPanel = (): HTMLElement => screen.getByRole("region", { name: "Generated world" });

beforeEach(() => {
  calls.length = 0;
  window.scrollTo = () => {};
  cleanup();
});
afterEach(cleanup);

describe("Step 4 — Review is the Career Setup Summary", () => {
  it("describes the generated world beside the configuration, each figure with its label", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachReviewStep();

    await within(worldPanel()).findByText("Starting season:");

    expect(figure("Starting season")).toBe("2026/27 · starts 4 Jul 2026");
    expect(figure("Nations")).toBe("2");
    expect(figure("Competitions")).toBe(
      "3 competitions at Full depth (60 clubs), 4 competitions at Results only depth (80 clubs)",
    );
    expect(figure("Clubs")).toBe("140");
    expect(figure("Players generated")).toBe("3,500");
    // Zero is the truth on a provisional world — the backroom is materialised at the commit this
    // panel confirms — so the line says that rather than printing a bare 0.
    expect(figure("Staff")).toBe("Appointed when the career is created");

    // The configuration the flow collected is still there, and still its own answer.
    expect(figure("Save name")).toBe("Test Career");
    expect(figure("Club")).toBe("Castlemere United");

    // The read is against the world that was built, not against a name or a snapshot.
    expect(methodsCalled("getCareerSetupSummary")).toHaveLength(1);
    expect(methodsCalled("getCareerSetupSummary")[0]!.payload).toEqual({ saveId: "provisional-1" });
  });

  it("reports the generated figures, never the pre-generation estimate", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachReviewStep();

    await within(worldPanel()).findByText("Starting season:");

    // The snapshot's estimate says 20 clubs and 500 players. Neither may appear as a world figure.
    expect(figure("Clubs")).not.toBe("20");
    expect(figure("Players generated")).not.toBe("500");
    expect(within(worldPanel()).queryByText("20")).toBeNull();
    expect(within(worldPanel()).queryByText("500")).toBeNull();
  });

  it("degrades to an explicit unavailable line, and the career still commits", async () => {
    installPreload(
      flowResponses({
        getCareerSetupSummary: { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: "provisional-1" } },
      }),
    );
    mountCreateFlow();
    await reachReviewStep();

    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("World summary unavailable");

    // No zeroes stood in for the figures that could not be read.
    expect(screen.queryByText("Players generated:")).toBeNull();
    expect(screen.queryByText("Clubs:")).toBeNull();

    // The configuration still renders, and the commit is not blocked by the failed read.
    expect(figure("Save name")).toBe("Test Career");
    expect(figure("Club")).toBe("Castlemere United");

    fireEvent.click(screen.getByRole("button", { name: "Create Career" }));
    await waitFor(() => expect(methodsCalled("commitCareer")).toHaveLength(1));
  });

  it("offers no way to edit the world, and stepping back regenerates nothing", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachReviewStep();

    await within(worldPanel()).findByText("Starting season:");

    // §22: read-only after generation. The panel itself carries no controls at all — the only
    // buttons on the step belong to the shell's bottom bar.
    expect(within(worldPanel()).queryAllByRole("button")).toHaveLength(0);
    expect(within(worldPanel()).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(worldPanel()).queryAllByRole("combobox")).toHaveLength(0);

    act(() => navigate({ type: "createStep1" }));
    await screen.findByRole("heading", { name: "Manager identity" });
    act(() => navigate({ type: "createStep3" }));
    await screen.findByRole("heading", { name: "Review Career" });
    await within(worldPanel()).findByText("Starting season:");

    // Returning to the manager step and back is not a new world: one generation, one read.
    expect(methodsCalled("beginCareer")).toHaveLength(1);
    expect(methodsCalled("discardCareer")).toHaveLength(0);
    expect(figure("Clubs")).toBe("140");
  });
});
