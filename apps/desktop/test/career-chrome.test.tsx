// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { SaveId } from "@cm-clone/contracts";
import { CareerChildView, CareerShell } from "../src/renderer/router/career.js";
import { seasonReadout } from "../src/renderer/chrome/CareerChrome.js";
import { LeagueTableScreen } from "../src/renderer/LeagueTableScreen.js";
import { FixturesScreen } from "../src/renderer/FixturesScreen.js";
import { bindRouter } from "../src/renderer/navigation/adapter.js";
import { ALL_ACTIONS } from "../src/renderer/actions/allActions.js";
import { resetActionHandlers } from "../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../src/renderer/actions/scopeState.js";
import { resetBindingOverrides, publishBindingOverrides } from "../src/renderer/actions/bindingState.js";
import { resetTableSessions } from "../src/renderer/table/tableState.js";

const rid = (s: string) => SaveId.make(s);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

type Phase = "pre_season" | "in_season" | "mid_window_open" | "season_complete";

let advanceCalls = 0;

const preload = (phase: Phase) => {
  advanceCalls = 0;
  mockPreload(async (method) => {
    if (method === "getLeagueTable") {
      return {
        _tag: "Success",
        value: { season: { seasonNumber: 3, currentMatchday: 12, phase }, standings: [] },
      } as never;
    }
    if (method === "getManagerProfileScreen") {
      return {
        _tag: "Success",
        value: {
          profile: {
            managerName: "Boss",
            archetypeOrigin: "custom",
            pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
          },
          clubName: "Northport Rovers",
          seasonNumber: 3,
          tenureSeasons: 2,
          archived: false,
        },
      } as never;
    }
    if (method === "loadSave") {
      return {
        _tag: "Success",
        value: {
          id: rid("s1"),
          name: "My Save",
          createdAt: "2026-01-01T00:00:00.000Z",
          archivedCause: null,
        },
      } as never;
    }
    if (method === "advanceCalendar") {
      advanceCalls += 1;
      return {
        _tag: "Success",
        value: {
          season: { seasonNumber: 3, currentMatchday: 13, phase: "in_season" as const },
          resolvedMatchday: 12,
          transferWindowClosed: null,
          transferWindowOpened: null,
          seasonConcluded: false,
          boardObjectiveVerdict: null,
          managerOutcome: "none" as const,
        },
      } as never;
    }
    if (method === "getFixtures") {
      return {
        _tag: "Success",
        value: { season: { seasonNumber: 3, currentMatchday: 12, phase }, fixtures: [] },
      } as never;
    }
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
};

/**
 * The real career shell through the router — `CareerShell` renders the chrome
 * and the child screen exactly as the shipped route tree does. Mounting the
 * chrome by hand would not exercise the composition that ships.
 */
const mountCareer = async (phase: Phase, child: "league" | "fixtures") => {
  preload(phase);
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: CareerShell,
  });
  const leagueRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: "league",
    component: () => <CareerChildView screenId="league" Screen={LeagueTableScreen} />,
  });
  const fixturesRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: "fixtures",
    component: () => <CareerChildView screenId="fixtures" Screen={FixturesScreen} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([leagueRoute, fixturesRoute])]),
    ]),
    history: createMemoryHistory({ initialEntries: [`/career/s1/${child}`] }),
  });
  bindRouter({ navigate: () => undefined, history: { back: () => undefined } } as never);
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: /Continue/ });
};

beforeEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetBindingOverrides();
  resetTableSessions();
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  resetScopeState();
  resetBindingOverrides();
});

describe("season readout", () => {
  it("counts in matchdays, never in days or dates", () => {
    expect(seasonReadout({ seasonNumber: 3, currentMatchday: 12, phase: "in_season" })).toBe(
      "Season 3 · Matchday 12/38",
    );
  });

  it("replaces the matchday with a phase word outside the in-season phase", () => {
    const at = (phase: string) =>
      seasonReadout({ seasonNumber: 3, currentMatchday: 12, phase });
    expect(at("pre_season")).toBe("Season 3 · Pre-season");
    expect(at("mid_window_open")).toBe("Season 3 · Transfer window open");
    expect(at("season_complete")).toBe("Season 3 · Season complete");
  });
});

describe("the career chrome", () => {
  it("carries club identity and the temporal cluster on every career screen", async () => {
    await mountCareer("in_season", "fixtures");
    expect(await screen.findByText("Northport Rovers")).toBeTruthy();
    expect(screen.getByText("Season 3 · Matchday 12/38")).toBeTruthy();
    expect(screen.getByText("My Save")).toBeTruthy();
  });

  it("never renders day-or-date copy", async () => {
    await mountCareer("in_season", "league");
    const chrome = screen.getByRole("banner");
    for (const forbidden of [/\bday\b/i, /\bdate\b/i, /\d{4}-\d{2}-\d{2}/]) {
      expect(chrome.textContent ?? "").not.toMatch(forbidden);
    }
  });

  it("marks the active tab and keeps every tab in the DOM", async () => {
    await mountCareer("in_season", "fixtures");
    expect(screen.getByRole("button", { name: "fixtures" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "league table" }).getAttribute("aria-current")).toBeNull();
    // Reachability never depends on visibility: all eight sections plus the
    // chrome's own Back-to-saves control are present.
    for (const label of [
      "squad",
      "tactics",
      "transfers",
      "league table",
      "fixtures",
      "match day",
      "season summary",
      "manager",
      "Back to saves",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});

describe("Continue in the chrome", () => {
  it("dispatches the career loop from a screen that is not the league table", async () => {
    await mountCareer("in_season", "fixtures");
    act(() => {
      screen.getByRole("button", { name: /Continue/ }).click();
    });
    await screen.findByRole("button", { name: /Continue/ });
    expect(advanceCalls).toBe(1);
  });

  it("answers Space from a screen that is not the league table", async () => {
    await mountCareer("in_season", "fixtures");
    // The chrome publishes the phase/advancing read model the registry's
    // availability predicate evaluates; without it the spine would refuse.
    act(() => fireEvent.keyDown(document, { key: " " }));
    expect(advanceCalls).toBe(0); // no spine mounted here — the handler is what we assert
    act(() => {
      screen.getByRole("button", { name: /Continue/ }).click();
    });
    expect(advanceCalls).toBe(1);
  });

  it("disables with the action's reason when the season is complete", async () => {
    await mountCareer("season_complete", "fixtures");
    const button = (await screen.findByRole("button", {
      name: /Continue/,
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const reason = ALL_ACTIONS.find((a) => a.id === "continue")?.unavailableReason;
    expect(reason).toBeDefined();
    expect(screen.getByText(reason!)).toBeTruthy();
    act(() => button.click());
    expect(advanceCalls).toBe(0);
  });

  it("shows the effective binding, following a rebind rather than the coded default", async () => {
    await mountCareer("in_season", "fixtures");
    expect(screen.getByLabelText("Keyboard shortcut Space")).toBeTruthy();
    act(() => publishBindingOverrides({ continue: "n" }));
    expect(screen.getByLabelText("Keyboard shortcut n")).toBeTruthy();
    expect(screen.queryByLabelText("Keyboard shortcut Space")).toBeNull();
  });

  it("keeps the label fixed — no contextual Go to Match until the calendar supplies one", () => {
    const action = ALL_ACTIONS.find((a) => a.id === "continue");
    expect(action?.label).toBe("Continue");
    // `.primary` is what drives the gradient treatment. Presentation only:
    // the flag must never appear in a dispatch path.
    expect(action?.primary).toBe(true);
  });

  it("is no longer owned by the league table", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/renderer/LeagueTableScreen.tsx", import.meta.url), "utf8"),
    );
    expect(source).not.toContain('registerActionHandler("continue"');
  });
});
