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
import { ContextTabs } from "../../../src/renderer/navigation/components/ContextTabs.js";

const mountAtPath = (
  pathSegments: ReadonlyArray<string>,
  searchParams?: string,
  props?: Parameters<typeof ContextTabs>[0],
) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: () => <ContextTabs {...props} />,
  });

  let parentRoute = saveRoute;
  for (const seg of pathSegments) {
    const route = createRoute({
      getParentRoute: () => parentRoute,
      path: seg,
      component: () => <div />,
    });
    parentRoute = route as never;
  }
  const leafRoute = parentRoute;

  const initialEntry = `/career/s1/${pathSegments.join("/")}${searchParams ?? ""}`;
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([leafRoute])]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  return render(<RouterProvider router={router} />);
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

/**
 * The row's whole reason to exist is the contexts the sidebar cannot express. On a
 * section route the sidebar's own submenu is the secondary navigation, and this row
 * rendering a second, differently-worded set of tabs over the same section was the
 * duplication the sidebar refactor removed. So "nothing here" is the assertion.
 */
describe("ContextTabs — silent wherever the sidebar already navigates", () => {
  it.each([["squad"], ["tactics"], ["training"], ["transfers"], ["competitions"], ["world"]])(
    "renders nothing on the /%s section route",
    (segment) => {
      const { container } = mountAtPath([segment]);
      expect(container.innerHTML).toBe("");
    },
  );

  it("renders nothing on a section route with a tab-shaped second segment", () => {
    const { container } = mountAtPath(["squad", "reserves"]);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for a non-career route", () => {
    const rootRoute = createRootRoute({ component: () => <ContextTabs /> });
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    const { container } = render(<RouterProvider router={router} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("ContextTabs — entity context (§6, §10.3)", () => {
  it("renders player tabs when on a player route", async () => {
    mountAtPath(["players", "42", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    const expected = ["Overview", "Attributes", "Positions", "Form", "History", "Contract"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders staff tabs when on a staff route", async () => {
    mountAtPath(["staff", "7", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Staff tabs" });
    const expected = ["Overview", "Attributes", "Contract", "Career", "Assignments", "Reports", "Notes"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders nation tabs when on a nation route", async () => {
    mountAtPath(["nations", "ita", "senior-team"]);
    const nav = await screen.findByRole("navigation", { name: "Nation tabs" });
    const expected = ["Overview", "Senior Team", "Under-21s", "Players", "Fixtures", "Results", "Competitions", "History"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("marks the active entity tab with aria-current=page", async () => {
    mountAtPath(["players", "42", "attributes"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Attributes" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks the default entity tab when no tab segment is in the route", async () => {
    mountAtPath(["players", "42"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Overview" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("falls back to default entity tab when the tab segment does not exist in config", async () => {
    mountAtPath(["players", "42", "nonexistent"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Overview" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("keeps the entity tabs when an ?origin param names the section it was opened from", async () => {
    mountAtPath(["players", "42", "contract"], "?origin=squad");
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Contract" }).getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("ContextTabs — match context (§7–§9)", () => {
  it("renders pre-match tabs for /pre-match/:fixtureId route", async () => {
    mountAtPath(["pre-match", "201"]);
    const nav = await screen.findByRole("navigation", { name: "Pre-match tabs" });
    const expected = ["Overview", "Team Selection", "Tactics", "Opposition", "Past Meetings", "Conditions"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders live-match tabs for /live-match/:matchId route", async () => {
    mountAtPath(["live-match", "301"], undefined, { matchTabVisibility: { "live-table": true } });
    const nav = await screen.findByRole("navigation", { name: "Live Match tabs" });
    const expected = ["Match", "Commentary", "Statistics", "Home Stats", "Away Stats", "Player Ratings", "Latest Scores", "Tactics", "Opposition", "Live Table"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders post-match tabs for /post-match/:matchId route", async () => {
    mountAtPath(["post-match", "401"], undefined, { matchTabVisibility: { "live-table": true } });
    const nav = await screen.findByRole("navigation", { name: "Post-match tabs" });
    const expected = ["Summary", "Statistics", "Home Stats", "Away Stats", "Player Ratings", "Report", "Commentary", "Latest Scores", "Table"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("shows Report only post-match, never live or pre-match", async () => {
    mountAtPath(["live-match", "301"]);
    const live = await screen.findByRole("navigation", { name: "Live Match tabs" });
    expect(within(live).queryByRole("tab", { name: "Report" })).toBeNull();
    cleanup();
    mountAtPath(["pre-match", "201"]);
    const pre = await screen.findByRole("navigation", { name: "Pre-match tabs" });
    expect(within(pre).queryByRole("tab", { name: "Report" })).toBeNull();
  });

  it("marks the correct pre-match tab active from the route", async () => {
    mountAtPath(["pre-match", "201", "team-selection"]);
    const nav = await screen.findByRole("navigation", { name: "Pre-match tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Team Selection" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks the default pre-match tab when no tab in the route", async () => {
    mountAtPath(["pre-match", "201"]);
    const nav = await screen.findByRole("navigation", { name: "Pre-match tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Overview" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks the default pre-match tab when an unknown tab id is in the route", async () => {
    mountAtPath(["pre-match", "201", "nonexistent-tab"]);
    const nav = await screen.findByRole("navigation", { name: "Pre-match tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Overview" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks the correct live-match tab active from the route", async () => {
    mountAtPath(["live-match", "301", "commentary"]);
    const nav = await screen.findByRole("navigation", { name: "Live Match tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Commentary" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks the correct post-match tab active from the route", async () => {
    mountAtPath(["post-match", "401", "statistics"]);
    const nav = await screen.findByRole("navigation", { name: "Post-match tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Statistics" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("shows the Post-match bar for a flat match route when the phase override says accepted", async () => {
    mountAtPath(["match"], undefined, { matchPhaseOverride: "post-match" });
    const nav = await screen.findByRole("navigation", { name: "Post-match tabs" });
    expect(within(nav).getByRole("tab", { name: "Report" })).toBeTruthy();
    expect(within(nav).getByRole("tab", { name: "Summary" }).getAttribute("aria-current")).toBe("page");
  });

  it("resolves a flat stats route to its Post-match tab under the override", async () => {
    mountAtPath(["match-home-stats"], undefined, { matchPhaseOverride: "post-match" });
    const nav = await screen.findByRole("navigation", { name: "Post-match tabs" });
    expect(within(nav).getByRole("tab", { name: "Home Stats" }).getAttribute("aria-current")).toBe("page");
  });

  it("leaves a flat match route Live when there is no phase override", async () => {
    mountAtPath(["match"]);
    const nav = await screen.findByRole("navigation", { name: "Live Match tabs" });
    expect(within(nav).queryByRole("tab", { name: "Report" })).toBeNull();
  });

  it("does not let the override turn a pre-match route into the Post-match bar", async () => {
    mountAtPath(["pre-match", "201"], undefined, { matchPhaseOverride: "post-match" });
    const nav = await screen.findByRole("navigation", { name: "Pre-match tabs" });
    expect(within(nav).queryByRole("tab", { name: "Report" })).toBeNull();
  });

  it("hides Live Table when matchTabVisibility indicates not applicable", async () => {
    mountAtPath(["live-match", "301"], undefined, { matchTabVisibility: { "live-table": false } });
    const nav = await screen.findByRole("navigation", { name: "Live Match tabs" });
    expect(within(nav).queryByRole("tab", { name: "Live Table" })).toBeNull();
  });

  it("hides Table for post-match when matchTabVisibility indicates not applicable", async () => {
    mountAtPath(["post-match", "401"], undefined, { matchTabVisibility: { "live-table": false } });
    const nav = await screen.findByRole("navigation", { name: "Post-match tabs" });
    expect(within(nav).queryByRole("tab", { name: "Table" })).toBeNull();
  });

  it("scrolls rather than wraps once the tabs overflow", async () => {
    // Live-match has 7 tabs with Live Table visible, one past the overflow threshold.
    mountAtPath(["live-match", "301"], undefined, { matchTabVisibility: { "live-table": true } });
    const liveNav = await screen.findByRole("navigation", { name: "Live Match tabs" });
    expect(liveNav.className).toContain("overflow-x-auto");
    expect(liveNav.className).toContain("mask-image");
  });
});

describe("ContextTabs — the tablist is named for its context", () => {
  it("names the live-match tablist after the match context, not the section the route falls under", async () => {
    mountAtPath(["match"]);
    await screen.findByRole("navigation", { name: "Live Match tabs" });
    expect(screen.getByRole("tablist").getAttribute("aria-label")).toBe("Live Match");
  });

  it("names an entity's tablist after the entity", async () => {
    mountAtPath(["players", "p1"]);
    expect((await screen.findByRole("tablist")).getAttribute("aria-label")).toBe("Player");
  });
});

describe("ContextTabs — keyboard navigation", () => {
  it("gives the active tab the only tab stop, for a roving tabindex", async () => {
    mountAtPath(["players", "42", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(within(nav).getByRole("tab", { name: "Overview" }).getAttribute("tabindex")).toBe("0");
    expect(within(nav).getByRole("tab", { name: "Attributes" }).getAttribute("tabindex")).toBe("-1");
  });

  it("moves the tab stop with the route", async () => {
    mountAtPath(["players", "42", "attributes"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(within(nav).getByRole("tab", { name: "Attributes" }).getAttribute("tabindex")).toBe("0");
    expect(within(nav).getByRole("tab", { name: "Overview" }).getAttribute("tabindex")).toBe("-1");
  });

  it("moves focus with ArrowRight and ArrowLeft", async () => {
    mountAtPath(["players", "42", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    const overview = within(nav).getByRole("tab", { name: "Overview" });
    overview.focus();

    act(() => {
      fireEvent.keyDown(overview, { key: "ArrowRight" });
    });
    const attributes = within(nav).getByRole("tab", { name: "Attributes" });
    expect(document.activeElement).toBe(attributes);

    act(() => {
      fireEvent.keyDown(attributes, { key: "ArrowLeft" });
    });
    expect(document.activeElement).toBe(overview);
  });

  it("wraps around with ArrowRight at the end", async () => {
    mountAtPath(["players", "42", "notes"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    const notes = within(nav).getByRole("tab", { name: "Notes" });
    notes.focus();

    act(() => {
      fireEvent.keyDown(notes, { key: "ArrowRight" });
    });
    expect(document.activeElement).toBe(within(nav).getByRole("tab", { name: "Overview" }));
  });

  it("moves to the first tab with Home and the last with End", async () => {
    mountAtPath(["players", "42", "form"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    const form = within(nav).getByRole("tab", { name: "Form" });
    form.focus();

    act(() => {
      fireEvent.keyDown(form, { key: "Home" });
    });
    expect(document.activeElement).toBe(within(nav).getByRole("tab", { name: "Overview" }));

    act(() => {
      fireEvent.keyDown(document.activeElement as HTMLElement, { key: "End" });
    });
    expect(document.activeElement).toBe(within(nav).getByRole("tab", { name: "Notes" }));
  });
});
