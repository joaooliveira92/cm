// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClubId, SaveId } from "@cm-clone/contracts";
import { STAFF_DEPARTMENTS, STATURE_TIERS } from "@cm-clone/shared";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { CareerClubChildView } from "../../../src/renderer/router/career.js";
import { ClubStaffScreen } from "../../../src/renderer/clubStaff/ClubStaffScreen.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

const rid = (id: string) => SaveId.make(id);
const cid = (id: string) => ClubId.make(id);

const staffView = (clubId: string, clubName: string) => ({
  club: { id: cid(clubId), name: clubName, statureTier: STATURE_TIERS[0] },
  groups: STAFF_DEPARTMENTS.map((department, index) => ({
    department,
    members: [
      {
        role: index === 0 ? "president" : index === 1 ? "coach" : index === 2 ? "scout" : "physio",
        firstName: "Alan",
        lastName: "Reyes",
      },
    ],
  })),
});

const squadView = () => ({
  club: { id: cid("club-7"), name: "My Club", statureTier: STATURE_TIERS[0] },
  players: [],
});

/**
 * The real club segment mounted at its real path, so the test exercises the parameter decode and
 * the route wiring rather than a hand-passed prop. Anything less would pass even if the `staff`
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
  const staffRoute = createRoute({
    getParentRoute: () => clubRoute,
    path: "staff",
    component: () => (
      <CareerClubChildView screenId="clubStaff" Screen={ClubStaffScreen} />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([clubRoute.addChildren([staffRoute])])]),
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

describe("ticket 03 — the club-scoped staff route carries the target club to the screen", () => {
  it("reads the club named in the URL, not some ambient selection", async () => {
    const seen: unknown[] = [];
    mockPreload(async (method, payload) => {
      seen.push(payload);
      if (method === "getClubStaff") {
        return { _tag: "Success", value: staffView("club-7", "Northport Rovers") } as never;
      }
      if (method === "getSquad") {
        return { _tag: "Success", value: squadView() } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });

    mountAt("/career/s1/club/club-7/staff");

    await screen.findByText(/Northport Rovers/);
    expect(seen).toContainEqual({ saveId: rid("s1"), clubId: cid("club-7") });
  });

  it("a well-formed clubId naming no club renders the screen's error state, never a redirect", async () => {
    const navigateSpy = vi.fn();
    bindRouter({
      navigate: navigateSpy,
      history: { back: vi.fn(), forward: vi.fn(), canGoBack: () => false },
    } as never);
    mockPreload(async (method) => {
      if (method === "getClubStaff") {
        return {
          _tag: "Failure",
          error: { _tag: "ClubNotFoundError", id: cid("ghost") },
        } as never;
      }
      if (method === "getSquad") {
        return { _tag: "Success", value: squadView() } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });

    mountAt("/career/s1/club/ghost/staff");

    await waitFor(() => {
      expect(screen.getByText("That club could not be found.")).toBeTruthy();
    });
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("renders the departments on a well-formed club", async () => {
    mockPreload(async (method) => {
      if (method === "getClubStaff") {
        return { _tag: "Success", value: staffView("club-7", "Northport Rovers") } as never;
      }
      if (method === "getSquad") {
        return { _tag: "Success", value: squadView() } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });

    mountAt("/career/s1/club/club-7/staff");

    await screen.findByRole("heading", { name: /^Northport Rovers/ });
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent?.trim());
    expect(headings[0]).toBe("Executive");
    expect(headings[1]).toBe("Coaching");
    expect(headings[2]).toBe("Recruitment");
    expect(headings[3]).toBe("Medical");
  });
});