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

/**
 * Ticket 11's frame clause: the creation flow renders inside a single-row chrome
 * band that owns identity, escape (Cancel/Back), and the "Step N of 4" indicator.
 *
 * The seam is rendered semantics — the header contains the controls and the
 * step indicator — never which utility classes the band carries. The Save List
 * boot screen is a separate route (`loadCareer.tsx`) and is covered by its own
 * spec; these tests hold the band scoped to the creation flow, so leaving the
 * flow removes it with the screen.
 */

type Responder = (method: string, payload: unknown) => Promise<unknown>;

const calls: Array<{ method: string; payload: unknown }> = [];

const installPreload = (respond: Responder): void => {
  (window as unknown as { cmClone: { call: Responder } }).cmClone = {
    call: (method, payload) => {
      calls.push({ method, payload });
      return respond(method, payload);
    },
  };
};

const methodsCalled = (method: string): ReadonlyArray<{ method: string; payload: unknown }> =>
  calls.filter((call) => call.method === method);

/**
 * The real creation branch over a memory history. The flow is mounted through
 * an actual router so the shell's band, the step routes, and the navigation
 * adapter all run as shipped.
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

const leagueStageResponse = async (method: string, payload: unknown): Promise<unknown> => {
  switch (method) {
    case "getLeagueSetupIndex":
      return { _tag: "Success", value: JSON.parse(JSON.stringify(await Effect.runPromise(getLeagueSetupIndex))) };
    case "loadSetupDraft":
      return { _tag: "Success", value: null };
    case "buildLeaguePreset":
      return {
        _tag: "Success",
        value: JSON.parse(
          JSON.stringify(
            await Effect.runPromise(
              buildLeaguePresetIntents((payload as { preset: "recommended" }).preset),
            ),
          ),
        ),
      };
    case "resolveLeagueSelection": {
      const { selectionRevision, intents } = payload as { selectionRevision: number; intents: [] };
      return {
        _tag: "Success",
        value: JSON.parse(
          JSON.stringify(await Effect.runPromise(resolveLeagueSelection(selectionRevision, intents))),
        ),
      };
    }
    case "submitLeagueSelection":
      return { _tag: "Success", value: LEAGUE_SNAPSHOT };
    default:
      return { _tag: "Success", value: undefined };
  }
};

const flowResponses = async (method: string, payload: unknown): Promise<unknown> => {
  switch (method) {
    case "beginCareer":
      return { _tag: "Success", value: { id: "provisional-1" } };
    case "getClubSelection":
      return {
        _tag: "Success",
        value: {
          clubs: [
            {
              clubId: "club-a",
              clubName: "Castlemere United",
              leagueId: "comp_eng_1",
              badgeKey: null,
              clubColours: {
                primary: { foreground: "#ffffff", background: "#1a2a6c" },
                secondary: { foreground: "#ffffff", background: "#b91c1c" },
                tertiary: null,
                quaternary: null,
              },
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
          ],
          leagues: [{ leagueId: "comp_eng_1", leagueName: "English First Division" }],
        },
      };
    default:
      return leagueStageResponse(method, payload);
  }
};

/** The shell header — the band under test. */
const band = (): HTMLElement => {
  const header = document.querySelector("header");
  if (header === null) throw new Error("the creation shell renders no header band");
  return header as HTMLElement;
};

/** Drive the leagues stage to completion and land on the Manager step. */
const advanceThroughLeagues = async (): Promise<void> => {
  const button = await screen.findByRole("button", { name: /^Continue/ }, { timeout: 3000 });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false), {
    timeout: 3000,
  });
  fireEvent.click(button);

  await screen.findByPlaceholderText("My Career");
  fireEvent.change(screen.getByPlaceholderText("My Career"), {
    target: { value: "Test Career" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Next: Manager Identity" }));
  await screen.findByRole("button", { name: "Next: Select Club" }, { timeout: 3000 });
};

beforeEach(() => {
  calls.length = 0;
  window.scrollTo = () => {};
  cleanup();
});
afterEach(cleanup);

describe("the pre-career chrome band", () => {
  it("carries identity, the step indicator, and Cancel/Back inside the header on every step", async () => {
    installPreload(flowResponses);
    mountCreateFlow();

    await screen.findByRole("heading", { name: "Active Leagues" }, { timeout: 3000 });

    // Step 1: the band names the product, reads the flow's progress, and the
    // shell's way out — all inside the one header surface.
    expect(within(band()).getByRole("heading", { name: "New Career" })).toBeTruthy();
    expect(within(band()).getByText("Step 1 of 4 · League & Nation")).toBeTruthy();
    expect(within(band()).getByRole("button", { name: "Cancel" })).toBeTruthy();

    await advanceThroughLeagues();

    // Step 2: the indicator follows the route and Back joins the band.
    await screen.findByLabelText("Save name");
    expect(within(band()).getByText("Step 2 of 4 · Manager")).toBeTruthy();
    expect(within(band()).getByRole("button", { name: "Back: Leagues" })).toBeTruthy();
    expect(within(band()).getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("tracks the step indicator into the club step", async () => {
    installPreload(flowResponses);
    mountCreateFlow();
    await advanceThroughLeagues();

    const next = await screen.findByRole("button", { name: "Next: Select Club" });
    await waitFor(() => expect((next as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(next);
    await screen.findByRole("table", { name: "Clubs" }, { timeout: 3000 });

    expect(within(band()).getByText("Step 3 of 4 · Club")).toBeTruthy();
    expect(within(band()).getByRole("button", { name: "Back: Leagues" })).toBeTruthy();
  });

  it("leaves the flow through the band's Cancel, and the band goes with it", async () => {
    installPreload(flowResponses);
    mountCreateFlow();

    await screen.findByRole("heading", { name: "Active Leagues" }, { timeout: 3000 });
    fireEvent.click(within(band()).getByRole("button", { name: "Cancel" }));

    // No world exists yet, so leaving is immediate — no discard confirmation,
    // and the band's step indicator renders nowhere outside the flow.
    await screen.findByText("Save List");
    expect(screen.queryByText(/Step \d of 4/)).toBeNull();
    expect(methodsCalled("beginCareer")).toHaveLength(0);
  });

  it("steps back through the band's Back control", async () => {
    installPreload(flowResponses);
    mountCreateFlow();
    await advanceThroughLeagues();

    fireEvent.click(within(band()).getByRole("button", { name: "Back: Leagues" }));

    await screen.findByRole("heading", { name: "Active Leagues" }, { timeout: 3000 });
    expect(within(band()).getByText("Step 1 of 4 · League & Nation")).toBeTruthy();
  });

  it("keeps the forward verb in the bottom bar, out of the band", async () => {
    installPreload(flowResponses);
    mountCreateFlow();
    await screen.findByRole("heading", { name: "Active Leagues" }, { timeout: 3000 });

    expect(within(band()).queryByRole("button", { name: /Continue|Next:|Create Career/ })).toBeNull();
  });
});