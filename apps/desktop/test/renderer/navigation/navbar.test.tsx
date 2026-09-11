// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
import { Navbar } from "../../../src/renderer/navigation/components/Navbar.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { resetScopeState, setScopeState, clearScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";

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
  await screen.findByRole("navigation", { name: "Primary navigation" });
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  resetScopeState();
  resetBindingOverrides();
});

describe("the redesigned navbar (spec §2 / §4 / §5.1)", () => {
  it("shows the persistent contextual strip for the active section", async () => {
    await mountNavbar("league");
    // Active section is Analysis; the persistent strip shows its items.
    expect(screen.getByRole("button", { name: "League Table" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fixtures" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Match Day" })).toBeTruthy();
  });

  it("the Squad submenu lists the club menu options and marks Squad active on the squad route", async () => {
    await mountNavbar("squad");
    const submenu = within(screen.getByRole("navigation", { name: "Squad submenu" }));
    for (const option of [
      "Squad",
      "Staff",
      "Information",
      "Finances",
      "Fixtures",
      "Transfers",
      "Last Match",
      "Serie A",
      "History",
    ]) {
      expect(submenu.getByRole("button", { name: option })).toBeTruthy();
    }
    expect(
      submenu.getByRole("button", { name: "Squad" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  /**
   * Arriving on a career route must leave the navbar oriented. The News route was absent from the
   * navbar's route-to-destination map, so landing on the inbox cleared the active section and took
   * the whole contextual strip down with it — the screen rendered, but the nav around it went blank.
   */
  it("keeps the News section active and its strip up on the inbox route", async () => {
    await mountNavbar("news");
    expect(screen.getByRole("button", { name: "Inbox" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Inbox" }).getAttribute("aria-current"),
    ).toBe("page");
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

describe("leader-key hints on the navbar (global-key-map note, g <key> prefix)", () => {
  const hintsIn = (name: string): Array<string> =>
    Array.from(
      screen.getByRole("navigation", { name }).querySelectorAll("[data-shortcut-hint]"),
      (badge) => badge.textContent ?? "",
    );

  it("shows no hints while the prefix is idle", async () => {
    await mountNavbar("league");
    expect(hintsIn("Primary navigation")).toEqual([]);
    expect(hintsIn("Analysis submenu")).toEqual([]);
  });

  it("badges each section's number key while the level0 prefix is pending", async () => {
    await mountNavbar("league");
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));
    // Sections show their position number key.
    expect(hintsIn("Primary navigation")).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    // Submenu items don't show hints during level0 prefix.
    expect(hintsIn("Analysis submenu")).toEqual([]);

    act(() => setScopeState({ prefixActive: false }));
    clearScopeState("prefixKind");
    expect(hintsIn("Primary navigation")).toEqual([]);
  });

  it("keeps the hint out of the control's accessible name", async () => {
    await mountNavbar("league");
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));
    expect(screen.getByRole("button", { name: "Fixtures" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Squad" })).toBeTruthy();
  });

  it("does not remount the control, so focus survives the hint appearing", async () => {
    await mountNavbar("league");
    const fixtures = screen.getByRole("button", { name: "Fixtures" });
    fixtures.focus();
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));
    expect(document.activeElement).toBe(fixtures);
  });
});
