// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { buildLeaguePresetIntents, getLeagueSetupIndex, resolveLeagueSelection } from "../../../src/main/world/index.js";
import { CreateFlowLayout } from "../../../src/renderer/create/CreateFlowLayout.js";
import {
  LeagueSelectionRouteContent,
  StepOneRouteContent,
  StepThreeRouteContent,
  StepTwoRouteContent,
} from "../../../src/renderer/router/createFlow.js";
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
 * The real creation branch over a memory history, mounted through an actual router. Same harness
 * shape as its two sibling flow tests; this file is about the gate in front of leaving — what
 * raises it, what surviving it costs, and what declining preserves.
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

/** A minimal valid snapshot: this file is about leaving, not about scope. */
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
      default:
        return leagueStageResponse(method, payload);
    }
  };

/** Drive the leagues stage, then the Manager step's personal-details panel. */
const advanceThroughLeagues = async (): Promise<void> => {
  const button = await screen.findByRole("button", { name: /^Continue/ }, { timeout: 3000 });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false), {
    timeout: 3000,
  });
  fireEvent.click(button);

  const nameInput = await screen.findByPlaceholderText("My Career");
  fireEvent.change(nameInput, { target: { value: "Test Career" } });
  const identity = await screen.findByRole("button", { name: "Next: Manager Identity" });
  fireEvent.click(identity);
  await screen.findByRole("button", { name: "Next: Select Club" }, { timeout: 3000 });
};

/** Drive leagues → manager → club step, arriving on the workspace with a world in hand. */
const reachClubStep = async (): Promise<void> => {
  await advanceThroughLeagues();
  const next = await screen.findByRole("button", { name: "Next: Select Club" });
  await waitFor(() => expect((next as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(next);
  await screen.findByRole("table", { name: "Clubs" });
};

const clubRow = (name: string): HTMLElement =>
  within(screen.getByRole("table", { name: "Clubs" }))
    .getAllByRole("row")
    .filter((row) => within(row).queryAllByRole("columnheader").length === 0)
    .find((row) => row.textContent?.includes(name))!;

const confirmation = (): HTMLElement => screen.getByRole("dialog", { name: "Discard this career?" });

beforeEach(() => {
  calls.length = 0;
  window.scrollTo = () => {};
  cleanup();
});
afterEach(cleanup);

describe("§21 — leaving a built world is confirmed, not assumed", () => {
  it("names what will be discarded, and discards it only once the player says so", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachClubStep();
    fireEvent.click(clubRow("Castlemere United"));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    const dialog = confirmation();
    expect(dialog.textContent).toContain("The world that was built");
    expect(dialog.textContent).toContain("your career details");
    expect(dialog.textContent).toContain("Castlemere United");
    // Nothing has gone yet: the world is still on disk and the player is still in the flow.
    expect(methodsCalled("discardCareer")).toHaveLength(0);
    expect(screen.getByRole("table", { name: "Clubs" })).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }));

    await screen.findByText("Save List");
    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    expect(methodsCalled("discardCareer")[0]?.payload).toEqual({ id: "provisional-1" });
  });

  it("declining leaves the world, the career details, and the club pick exactly as they were", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachClubStep();
    fireEvent.click(clubRow("Castlemere United"));
    await waitFor(() => expect(clubRow("Castlemere United").getAttribute("aria-selected")).toBe("true"));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(confirmation()).getByRole("button", { name: "Keep Editing" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    // Same step, same world, same pick: nothing was regenerated and nothing was reset.
    expect(screen.getByRole("table", { name: "Clubs" })).toBeTruthy();
    expect(clubRow("Castlemere United").getAttribute("aria-selected")).toBe("true");
    expect(methodsCalled("discardCareer")).toHaveLength(0);
    expect(methodsCalled("beginCareer")).toHaveLength(1);

    // And the flow still carries what it collected, all the way to the summary.
    fireEvent.click(screen.getByRole("button", { name: "Next: Review" }));
    const summary = (await screen.findByRole("heading", { name: "Review Career" })).parentElement!;
    expect(within(summary).getByText("Save name:").parentElement?.textContent).toContain(
      "Test Career",
    );
    expect(within(summary).getByText("Club:").parentElement?.textContent).toContain(
      "Castlemere United",
    );
  });

  it("confirms a world still being built, because the player waited for that one too", async () => {
    let settle: ((value: unknown) => void) | null = null;
    const pending = new Promise<unknown>((resolve) => {
      settle = resolve;
    });
    installPreload((method, payload) =>
      method === "beginCareer" ? pending : flowResponses()(method, payload),
    );
    mountCreateFlow();
    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirmation().textContent).toContain("The world being built");

    fireEvent.click(within(confirmation()).getByRole("button", { name: "Discard" }));
    await screen.findByText("Save List");

    // The id does not exist yet at the moment the player confirms; the late arrival is discarded.
    (settle as ((value: unknown) => void) | null)?.({
      _tag: "Success",
      value: { id: "provisional-late" },
    });
    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    expect(methodsCalled("discardCareer")[0]?.payload).toEqual({ id: "provisional-late" });
  });

  it("leaves immediately while no world exists, because there is nothing to lose", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await screen.findByRole("heading", { name: "Active Leagues" }, { timeout: 3000 });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await screen.findByText("Save List");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(methodsCalled("beginCareer")).toHaveLength(0);
  });

  it("gates the leagues step's own Cancel too, once stepping back has left a world behind", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await advanceThroughLeagues();
    await waitFor(() => expect(methodsCalled("beginCareer")).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "Back: Leagues" }));
    await screen.findByRole("heading", { name: "Active Leagues" }, { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // The guarantee is about leaving, not about one button.
    expect(confirmation()).toBeTruthy();
    expect(methodsCalled("discardCareer")).toHaveLength(0);
  });

  it("opens focus on the safe choice and hands it back to the control that opened it", async () => {
    installPreload(flowResponses());
    mountCreateFlow();
    await reachClubStep();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    cancel.focus();
    fireEvent.click(cancel);

    const keep = within(confirmation()).getByRole("button", { name: "Keep Editing" });
    expect(document.activeElement).toBe(keep);

    fireEvent.keyDown(confirmation(), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    expect(methodsCalled("discardCareer")).toHaveLength(0);
  });

  it("still leaves nothing for the player to find when the discard itself fails", async () => {
    installPreload(
      flowResponses({
        discardCareer: {
          _tag: "Failure",
          error: { _tag: "TransportFailure", method: "discardCareer", cause: null },
        },
      }),
    );
    mountCreateFlow();
    await reachClubStep();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(confirmation()).getByRole("button", { name: "Discard" }));

    await screen.findByText("Save List");
    await waitFor(() => expect(methodsCalled("discardCareer")).toHaveLength(1));
    // The provisional world was never a career: a failed deletion leaves an orphan file, never a
    // save the player can open. Nothing committed it on the way out.
    expect(methodsCalled("commitCareer")).toHaveLength(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
