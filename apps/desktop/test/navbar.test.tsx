// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { SaveId } from "@cm-clone/contracts";
import { Navbar } from "../src/renderer/navigation/components/Navbar.js";
import { bindRouter } from "../src/renderer/navigation/adapter.js";

const saveId = SaveId.make("s1");

const mountNavbar = async (initialChild: string) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: () => (
      <Navbar
        saveId={saveId}
        clubName="Northport Rovers"
        actions={<button type="button">Back to saves</button>}
      />
    ),
  });
  const childRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: initialChild,
    component: () => <div />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([
        saveRoute.addChildren([childRoute]),
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: [`/career/s1/${initialChild}`] }),
  });
  bindRouter({ navigate: () => undefined, history: { back: () => undefined, forward: () => undefined, canGoBack: () => false } } as never);
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: "Squad" });
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the redesigned navbar (spec §2 / §4 / §5.1)", () => {
  it("shows the persistent contextual strip for the active section", async () => {
    await mountNavbar("league");
    // Active section is Analysis; the persistent strip shows its items.
    expect(screen.getByRole("button", { name: "League Table" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fixtures" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Match Day" })).toBeTruthy();
  });

  it("opens a section's submenu after the hover-intent delay", async () => {
    await mountNavbar("league");
    vi.useFakeTimers();
    const recruitment = screen.getByRole("button", { name: "Recruitment" });
    // Before the delay, Recruitment's items are not shown; League Table is.
    expect(screen.queryByRole("button", { name: "Transfers" })).toBeNull();
    fireEvent.mouseEnter(recruitment);
    // No flash before the intent delay expires.
    expect(screen.queryByRole("button", { name: "Transfers" })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // After the delay, the preview shows Recruitment's items.
    expect(screen.getByRole("button", { name: "Transfers" })).toBeTruthy();
  });

  it("hovering a different section never marks it active", async () => {
    await mountNavbar("league");
    vi.useFakeTimers();
    // Preview Recruitment.
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Recruitment" }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // The previewed section's items appear but never receive the active
    // indicator; only the route's actual section carries aria-current.
    expect(screen.getByRole("button", { name: "Transfers" }).getAttribute("aria-current")).toBeNull();
  });
});
