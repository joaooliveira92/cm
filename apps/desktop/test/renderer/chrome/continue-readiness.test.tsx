// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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
import { CareerChildView, CareerShell } from "../../../src/renderer/router/career.js";
import { LeagueTableScreen } from "../../../src/renderer/leagueTable/LeagueTableScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";

const rid = (s: string) => SaveId.make(s);

const NO_TACTIC_COPY = "Matches will be played with an automatic 4-4-2 until you set one.";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

/** A tactic shaped as `getTactics` returns it — only its presence matters here. */
const A_TACTIC = {
  formation: "4-4-2",
  slots: [],
  mentality: "balanced",
  tempo: "normal",
  pressing: "medium",
};

const preload = (tactic: unknown) => {
  mockPreload(async (method) => {
    if (method === "getLeagueTable") {
      return {
        _tag: "Success",
        value: {
          season: { seasonNumber: 3, currentDate: "2026-10-17", phase: "in_season" as const },
          standings: [],
        },
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
    if (method === "getTactics") {
      return {
        _tag: "Success",
        value: {
          club: { id: "c1", name: "Northport Rovers", statureTier: "mid" },
          squad: [],
          tactic,
        },
      } as never;
    }
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
};

/** The shipped career shell through the router, the same composition `career-chrome.test.tsx`
 * mounts — the readiness advisory has to survive the real chrome, not a hand-mounted band. */
const mountCareer = async (tactic: unknown) => {
  preload(tactic);
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
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([leagueRoute])]),
    ]),
    history: createMemoryHistory({ initialEntries: ["/career/s1/league"] }),
  });
  bindRouter({
    navigate: () => undefined,
    history: { back: () => undefined, forward: () => undefined, canGoBack: () => false },
  } as never);
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

/**
 * Every AI club is assigned a Tactic at season start and the player's club is not, so the match
 * engine quietly synthesizes a 4-4-2 and the player is never told. The News Inbox cannot carry that —
 * it records what happened, and this is a standing condition that has not happened yet — and a
 * message could be marked read while the condition it describes is still true. So the career band
 * states it next to Continue for as long as it stays true.
 */
describe("Continue readiness in the career chrome", () => {
  it("tells the player their matches will use an automatic 4-4-2 when no Tactic is set", async () => {
    await mountCareer(null);

    expect(await screen.findByText(NO_TACTIC_COPY)).toBeTruthy();
  });

  it("says nothing about the Tactic once one is set", async () => {
    await mountCareer(A_TACTIC);

    expect(screen.queryByText(NO_TACTIC_COPY)).toBeNull();
  });

  /** The advisory must never cost the player the advance — it is a nudge, not a gate. */
  it("leaves Continue enabled while the advisory stands", async () => {
    await mountCareer(null);

    const button = await screen.findByRole<HTMLButtonElement>("button", { name: /Continue/ });
    expect(button.disabled).toBe(false);
  });
});
