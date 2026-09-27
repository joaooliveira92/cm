import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
import { CareerSidebar } from "../../../src/renderer/navigation/components/CareerSidebar.js";
import { NavProvider } from "../../../src/renderer/navigation/NavProvider.js";
import { SidebarProvider } from "../../../src/renderer/components/ui/sidebar.js";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { NAV_SECTIONS, POSITION_KEYS } from "../../../src/renderer/navigation/nav-config.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { resetScopeState, setScopeState, clearScopeState } from "../../../src/renderer/actions/scopeState.js";
import { publishBindingOverrides, resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";

const saveId = SaveId.make("s1");

/** The section position keys the action registry actually binds a `g <key>` to. */
const boundSectionKeys: ReadonlySet<string> = new Set(
  ALL_ACTIONS.flatMap((action) =>
    typeof action.metadata?.sectionKey === "string" ? [action.metadata.sectionKey] : [],
  ),
);

const positionKeyOf = (sectionId: string): string =>
  String(NAV_SECTIONS.findIndex((section) => section.id === sectionId) + 1);

const mountSidebar = async (initialChild: string) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: () => (
      <NavProvider saveId={saveId}>
        <SidebarProvider>
          <CareerSidebar />
        </SidebarProvider>
      </NavProvider>
    ),
  });
  const childRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: initialChild,
    component: () => <div />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([childRoute])]),
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
  resetScopeState();
  resetBindingOverrides();
});

describe("the career sidebar", () => {
  it("lists every primary section", async () => {
    await mountSidebar("league");
    const nav = within(screen.getByRole("navigation", { name: "Primary navigation" }));
    for (const section of NAV_SECTIONS) {
      expect(nav.getByRole("button", { name: section.label })).toBeTruthy();
    }
  });

  it("expands the section the route belongs to, and marks it current", async () => {
    await mountSidebar("league");
    // Active section is Analysis; its submenu is the one expanded.
    const submenu = within(screen.getByRole("navigation", { name: "Analysis submenu" }));
    for (const option of ["League Table", "Fixtures", "Match Day", "Season Summary"]) {
      expect(submenu.getByRole("button", { name: option })).toBeTruthy();
    }
    expect(
      screen.getByRole("button", { name: "Analysis" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("the Squad submenu lists the club menu options and marks Squad active on the squad route", async () => {
    await mountSidebar("squad");
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
   * Arriving on a career route must leave the navigation oriented. The News route was absent from
   * the route-to-destination map, so landing on the inbox cleared the active section and took the
   * whole submenu down with it — the screen rendered, but the nav around it went blank.
   */
  it("keeps the News section active and its submenu up on the inbox route", async () => {
    await mountSidebar("news");
    const submenu = within(screen.getByRole("navigation", { name: "News submenu" }));
    expect(submenu.getByRole("button", { name: "Inbox" }).getAttribute("aria-current")).toBe("page");
  });

  /**
   * One submenu at a time. This is what keeps an item label that two sections share — "Transfers"
   * belongs to Squad and to Recruitment — resolving to exactly one control, and it is why the
   * collapsible panel must unmount rather than merely hide its contents.
   */
  it("holds exactly one section open", async () => {
    await mountSidebar("squad");
    expect(screen.getAllByRole("navigation", { name: /submenu$/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Transfers" })).toBeTruthy();
  });

  it("opens another section without navigating away from the current screen", async () => {
    await mountSidebar("squad");
    fireEvent.click(screen.getByRole("button", { name: "Toggle Recruitment submenu" }));

    expect(screen.getByRole("navigation", { name: "Recruitment submenu" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Squad submenu" })).toBeNull();
    // The route did not change, so Squad keeps the active marker even with its submenu closed.
    expect(screen.getByRole("button", { name: "Squad" }).getAttribute("aria-current")).toBe("page");
  });

  it("closes the open section when its own toggle is pressed again", async () => {
    await mountSidebar("squad");
    fireEvent.click(screen.getByRole("button", { name: "Toggle Squad submenu" }));
    expect(screen.queryByRole("navigation", { name: "Squad submenu" })).toBeNull();
  });
});

describe("leader-key hints on the sidebar (global-key-map note, g <key> prefix)", () => {
  const hintsIn = (name: string | RegExp): Array<string> =>
    Array.from(
      screen.getByRole("navigation", { name }).querySelectorAll("[data-shortcut-hint]"),
      (badge) => badge.textContent ?? "",
    );

  /** The section hints, excluding the ones the expanded submenu contributes. */
  const sectionHints = (): Array<string> => {
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    const submenus = Array.from(nav.querySelectorAll('[aria-label$="submenu"]'));
    return Array.from(nav.querySelectorAll("[data-shortcut-hint]"))
      .filter((badge) => !submenus.some((submenu) => submenu.contains(badge)))
      .map((badge) => badge.textContent ?? "");
  };

  it("shows no hints while the prefix is idle", async () => {
    await mountSidebar("league");
    expect(hintsIn("Primary navigation")).toEqual([]);
  });

  it("badges each section's number key while the level0 prefix is pending", async () => {
    await mountSidebar("league");
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));
    // A section is badged with its position key only if that key actually dispatches. Derived from
    // the binding registry rather than from `NAV_SECTIONS`, because deriving from the section array
    // would compare `String(index + 1)` against the identical expression in `SidebarNavSection`,
    // which cannot fail and would assert nothing about whether the advertised key works.
    //
    // This was red while World showed an `8` badge that level 0 of the prefix rejected. See
    // `.scratch/navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md`.
    expect(sectionHints()).toEqual(
      NAV_SECTIONS.map((_, index) => String(index + 1)).filter((key) => boundSectionKeys.has(key)),
    );
    // The items of the expanded section don't show hints during the level0 prefix.
    expect(hintsIn("Analysis submenu")).toEqual([]);

    act(() => setScopeState({ prefixActive: false }));
    clearScopeState("prefixKind");
    expect(hintsIn("Primary navigation")).toEqual([]);
  });

  it("badges the items of the section the prefix has descended into", async () => {
    await mountSidebar("league");
    act(() =>
      setScopeState({
        prefixActive: true,
        prefixKind: "level1",
        deepSectionId: positionKeyOf("analysis"),
      }),
    );
    const analysisItems = NAV_SECTIONS.find((section) => section.id === "analysis")?.items ?? [];
    expect(hintsIn("Analysis submenu")).toEqual(
      analysisItems.map((_, index) => POSITION_KEYS[index]),
    );
    // The section rows themselves are level 0's business, so they stay unbadged.
    expect(sectionHints()).toEqual([]);
  });

  // Ticket 02 settled that the nav advertises a key only if that key dispatches. A user override
  // that moves a section's go-to action off `g <position>` takes that key out of level 0 of the
  // prefix, so the section's badge has to go with it. The other sections keep theirs.
  it("drops a section's number badge once the user rebinds its go-to action away from it", async () => {
    await mountSidebar("league");
    const tacticsKey = positionKeyOf("tactics");
    act(() => publishBindingOverrides({ "go-to-tactics": "n" }));
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));

    expect(sectionHints()).toEqual(
      NAV_SECTIONS.map((_, index) => String(index + 1)).filter(
        (key) => boundSectionKeys.has(key) && key !== tacticsKey,
      ),
    );

    // Resetting the override brings the badge back, so the badge follows the live binding both ways.
    act(() => resetBindingOverrides());
    expect(sectionHints()).toContain(tacticsKey);
  });

  it("keeps the hint out of the control's accessible name", async () => {
    await mountSidebar("league");
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));
    expect(screen.getByRole("button", { name: "Fixtures" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Squad" })).toBeTruthy();
  });

  it("does not remount the control, so focus survives the hint appearing", async () => {
    await mountSidebar("league");
    const fixtures = screen.getByRole("button", { name: "Fixtures" });
    fixtures.focus();
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));
    expect(document.activeElement).toBe(fixtures);
  });
});
