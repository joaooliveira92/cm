// @vitest-environment jsdom
/**
 * The career shell, mounted through the real router, plus the wire responses its
 * queries need. Shared by the chrome's own suite and the Continue bands' suite:
 * both mount the same composition, and a second hand-rolled copy of this harness
 * is how two suites start testing two different shells.
 */
import path from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { SaveId } from "@cm-clone/contracts";
import { emptyBench } from "@cm-clone/shared";
import { CareerChildView, CareerShell } from "../../../src/renderer/router/career.js";
import { LeagueTableScreen } from "../../../src/renderer/leagueTable/LeagueTableScreen.js";
import { FixturesScreen } from "../../../src/renderer/fixtures/FixturesScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";

export const rid = (s: string) => SaveId.make(s);

// The jsdom environment rewrites `import.meta.url` to a non-file scheme, so
// resolve the source path from the vitest cwd (the desktop package root)
// instead of the module URL.
export const leagueTableSourcePath = path.join(
  process.cwd(),
  "src/renderer/leagueTable/LeagueTableScreen.tsx",
);

export const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

export type Phase = "pre_season" | "in_season" | "mid_window_open" | "season_complete";

export const counters = { advanceCalls: 0 };

/** A `getTactics` wire payload. The chrome reads only `tactic`, but the view is
 *  decoded whole, so a partial object would fail the contract and be reported as
 *  "no answer yet" rather than "no Tactic". */
export const SAMPLE_TACTIC = {
  formation: "4-4-2" as const,
  slots: [],
  bench: emptyBench(),
  mentality: "balanced" as const,
  tempo: "normal" as const,
  pressing: "medium" as const,
};

export const tacticsPayload = (tactic: typeof SAMPLE_TACTIC | null) =>
  ({
    _tag: "Success",
    value: {
      club: { id: rid("club"), name: "Northport Rovers", statureTier: "mid" as const },
      squad: [],
      tactic,
      revision: 0,
    },
  }) as never;


export const preload = (phase: Phase) => {
  counters.advanceCalls = 0;
  mockPreload(async (method) => {
    if (method === "getLeagueTable") {
      return {
        _tag: "Success",
        value: { season: { seasonNumber: 3, awaitingFixture: null, currentDate: "2026-10-17", phase }, standings: [] },
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
          badgeKey: null,
          clubColours: {
            primary: { foreground: "#ffffff", background: "#000000" },
            secondary: { foreground: "#000000", background: "#ffffff" },
            tertiary: null,
            quaternary: null,
          },
          seasonNumber: 3, awaitingFixture: null,
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
      counters.advanceCalls += 1;
      return {
        _tag: "Success",
        value: {
          season: { seasonNumber: 3, awaitingFixture: null, currentDate: "2026-10-24", phase: "in_season" as const },
          resolvedDate: "2026-10-17",
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
        value: { season: { seasonNumber: 3, awaitingFixture: null, currentDate: "2026-10-17", phase }, fixtures: [] },
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
export const mountCareer = async (phase: Phase, child: "league" | "fixtures") => {
  preload(phase);
  await mountRoutedCareer(child);
};

/** The router half of `mountCareer`, without the canned preload — for a test
 *  that needs its own wire responses (a payload that changes between calls). */
export const mountRoutedCareer = async (child: "league" | "fixtures") => {
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
  bindRouter({ navigate: () => undefined, history: { back: () => undefined, forward: () => undefined, canGoBack: () => false } } as never);
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: /Continue/ });
};

/** The reset every suite in this directory runs; called from each file's own
 *  `beforeEach` so the harness never registers global hooks of its own. */
export const resetCareerHarness = (): void => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetBindingOverrides();
  resetTableSessions();
  window.scrollTo = () => undefined;
};
