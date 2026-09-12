// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyboardSpine } from "../../../src/renderer/keyboard/KeyboardSpine.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { teachingSplashStorageKey } from "../../../src/renderer/discoverability/TeachingSplash.js";
import { CareerClubChildView } from "../../../src/renderer/router/career.js";
import { ClubStaffScreen } from "../../../src/renderer/clubStaff/ClubStaffScreen.js";
import { respondWithStaff, staffView } from "./fixtures.js";

describe("ticket 03 — `g b` returns from the club staff page via real history", () => {
  let backCalls: number;

  const mountClubStaffWithSpine = async () => {
    respondWithStaff(staffView());
    const rootRoute = createRootRoute({
      component: () => (
        <>
          <Outlet />
          <KeyboardSpine />
        </>
      ),
    });
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
      component: () => <CareerClubChildView screenId="clubStaff" Screen={ClubStaffScreen} />,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        careerRoute.addChildren([saveRoute.addChildren([clubRoute.addChildren([staffRoute])])]),
      ]),
      history: createMemoryHistory({ initialEntries: ["/career/s1/club/club-7/staff"] }),
    });
    bindRouter({
      navigate: vi.fn(),
      history: { back: () => (backCalls += 1), forward: () => undefined, canGoBack: () => true },
    } as never);
    render(<RouterProvider router={router} />);
    await screen.findByRole("heading", { name: /^Northport Rovers/ });
  };

  beforeEach(async () => {
    cleanup();
    backCalls = 0;
    resetActionHandlers();
    resetScopeState();
    window.localStorage.setItem(teachingSplashStorageKey, "1");
    window.scrollTo = () => undefined;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    resetScopeState();
  });

  it("the club-scoped page registers the career handlers, so g b runs history back", async () => {
    await mountClubStaffWithSpine();

    act(() => fireEvent.keyDown(document, { key: "g" }));
    act(() => fireEvent.keyDown(document, { key: "b" }));

    expect(backCalls).toBe(1);
  });
});
