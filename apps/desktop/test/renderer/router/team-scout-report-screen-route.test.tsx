// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { CareerClubChildView } from "../../../src/renderer/router/career.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { TeamScoutReportScreen } from "../../../src/renderer/scouting/TeamScoutReportScreen.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const reportFor = (clubId: string, clubName: string) => ({
  reportId: `${clubId}:2024-08-01`,
  targetClubId: ClubId.make(clubId),
  targetClubName: clubName,
  scout: null,
  observedAt: "2024-08-01",
  knowledgeConfidence: "moderate",
  freshness: "current",
  predictedFormation: null,
  recentForm: [],
  strengths: [],
  weaknesses: [],
  keyPlayers: [],
  setPieceFindings: [],
});

/**
 * The real club segment mounted at its real path, so the test exercises the parameter decode and
 * the route wiring rather than a hand-passed prop. Anything less would pass even if the `$clubId`
 * segment were never read.
 */
const mountAt = (path: string) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: () => <Outlet />,
  });
  const clubRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: "club/$clubId",
    component: () => <Outlet />,
  });
  const reportRoute = createRoute({
    getParentRoute: () => clubRoute,
    path: "scout-report",
    component: () => (
      <CareerClubChildView screenId="teamScoutReport" Screen={TeamScoutReportScreen} />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([clubRoute.addChildren([reportRoute])])]),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(
    <RegistryProvider>
      <RouterProvider router={router} />
    </RegistryProvider>,
  );
};

beforeEach(() => {
  bindRouter({
    navigate: vi.fn(),
    history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
  } as never);
});

afterEach(() => cleanup());

describe("ticket 05 — the route carries the target club to the screen", () => {
  it("reads the club named in the URL, not some ambient selection", async () => {
    const seen: unknown[] = [];
    mockPreload((_method, payload) => {
      seen.push(payload);
      return Promise.resolve({ _tag: "Success", value: reportFor("club-7", "Northport Rovers") });
    });

    mountAt("/career/s1/club/club-7/scout-report");

    await screen.findByText("Northport Rovers");
    expect(seen[0]).toEqual({ saveId: SaveId.make("s1"), clubId: ClubId.make("club-7") });
  });

  it("a different club in the URL reads that club instead", async () => {
    mockPreload((_method, payload) => {
      const clubId = (payload as { clubId: string }).clubId;
      return Promise.resolve({
        _tag: "Success",
        value: reportFor(clubId, clubId === "club-9" ? "Eastvale United" : "Wrong Club"),
      });
    });

    mountAt("/career/s1/club/club-9/scout-report");

    await screen.findByText("Eastvale United");
  });

  // The rule ticket 05 is most specific about: a club that does not exist is the RPC's answer,
  // rendered on this screen. Not a redirect, not a thrown route error, not an "invalid address".
  it("a clubId naming no club reaches the screen's failure state rather than redirecting", async () => {
    const navigateSpy = vi.fn();
    bindRouter({
      navigate: navigateSpy,
      history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
    } as never);
    mockPreload(() =>
      Promise.resolve({
        _tag: "Failure",
        error: { _tag: "ClubNotFoundError", clubId: ClubId.make("ghost") },
      }),
    );

    mountAt("/career/s1/club/ghost/scout-report");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Team Scout Report" })).toBeTruthy();
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("a club nobody has scouted reaches the not-scouted message, also on the screen", async () => {
    mockPreload(() =>
      Promise.resolve({
        _tag: "Failure",
        error: { _tag: "ClubNotScoutedError", clubId: ClubId.make("club-3") },
      }),
    );

    mountAt("/career/s1/club/club-3/scout-report");

    await screen.findByText(/have not watched this club yet/);
  });
});
