// @vitest-environment jsdom
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
import { SecondaryNav } from "../../../src/renderer/navigation/components/SecondaryNav.js";

const mountAtPath = (
  pathSegments: ReadonlyArray<string>,
  searchParams?: string,
  props?: Parameters<typeof SecondaryNav>[0],
) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: () => <SecondaryNav {...props} />,
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
  render(<RouterProvider router={router} />);
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe("SecondaryNav — tab rendering for each section (§5)", () => {
  it("renders Squad tabs on the /squad route", async () => {
    mountAtPath(["squad"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    const expected = ["First Team", "Reserves", "Under-19s", "Selection", "Fixtures", "Statistics", "Reports"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders Manager tabs on the /manager route", async () => {
    mountAtPath(["manager"]);
    const nav = await screen.findByRole("navigation", { name: "Manager tabs" });
    const expected = ["Overview", "Inbox", "Confidence", "Notes", "Jobs", "Responsibilities", "Career"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders Tactics tabs on the /tactics route", async () => {
    mountAtPath(["tactics"]);
    const nav = await screen.findByRole("navigation", { name: "Tactics tabs" });
    const expected = ["Formation", "Team Instructions", "Player Instructions", "Set Pieces", "Takers", "Captains", "Templates"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders Training tabs on the /training route", async () => {
    mountAtPath(["training"]);
    const nav = await screen.findByRole("navigation", { name: "Training tabs" });
    const expected = ["Overview", "Schedules", "Players", "Coaches", "Assignments", "Reports", "Options"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders Transfers tabs on the /transfers route", async () => {
    mountAtPath(["transfers"]);
    const nav = await screen.findByRole("navigation", { name: "Transfers tabs" });
    const expected = ["Transfer Centre", "Player Search", "Shortlist", "Scouting", "Staff Search", "History"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders Club tabs on the /club route", async () => {
    mountAtPath(["club"]);
    const nav = await screen.findByRole("navigation", { name: "Club tabs" });
    const expected = ["Overview", "Staff", "Fixtures", "Finances", "Facilities", "Records", "History", "Transfers"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders World tabs on the /world route", async () => {
    mountAtPath(["world"]);
    const nav = await screen.findByRole("navigation", { name: "World tabs" });
    const expected = ["Nations", "Clubs", "International", "Regions", "Rankings"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders Search tabs on the /search route", async () => {
    mountAtPath(["search"]);
    const nav = await screen.findByRole("navigation", { name: "Search tabs" });
    const expected = ["Quick Search", "Players", "Staff", "Clubs", "Nations", "Recent", "Saved Searches"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
  });

  it("renders Competitions tabs on the /competitions route", async () => {
    mountAtPath(["competitions"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    const expected = ["Overview", "Fixtures", "Results", "Statistics", "Rules", "History"];
    for (const label of expected) {
      expect(within(nav).getByRole("tab", { name: label })).toBeTruthy();
    }
    // Awards is conditional — hidden without a competitionType
    expect(within(nav).queryByRole("tab", { name: "Awards" })).toBeNull();
  });
});

describe("SecondaryNav — active state (§12)", () => {
  it("marks the first tab as active when no tab in the route", async () => {
    mountAtPath(["squad"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    expect(
      within(nav).getByRole("tab", { name: "First Team" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("marks the correct tab active from the route", async () => {
    mountAtPath(["squad", "reserves"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Reserves" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("exactly one tab has aria-current=page", async () => {
    mountAtPath(["competitions", "fixtures"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    const activeTabs = within(nav).queryAllByRole("tab", { current: "page" });
    expect(activeTabs.length).toBe(1);
  });

  it("marks the default tab when an unknown tab id is in the route", async () => {
    mountAtPath(["squad", "nonexistent-tab"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    expect(
      within(nav).getByRole("tab", { name: "First Team" }).getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("SecondaryNav — conditional tab visibility", () => {
  it("shows Table tab for league competition type", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "league" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByRole("tab", { name: "Table" })).toBeTruthy();
  });

  it("shows Table tab for group competition type", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "group" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByRole("tab", { name: "Table" })).toBeTruthy();
  });

  it("hides Table tab for knockout competition type", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "knockout" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).queryByRole("tab", { name: "Table" })).toBeNull();
  });

  it("shows Tree tab for knockout competition type", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "knockout" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByRole("tab", { name: "Tree" })).toBeTruthy();
    expect(within(nav).getByRole("tab", { name: "Draw" })).toBeTruthy();
  });

  it("hides Tree and Draw tabs for league competition type", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "league" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).queryByRole("tab", { name: "Tree" })).toBeNull();
    expect(within(nav).queryByRole("tab", { name: "Draw" })).toBeNull();
  });

  it("shows Stages tab for multi-stage competition type", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "multi-stage" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByRole("tab", { name: "Stages" })).toBeTruthy();
  });

  it("shows Coefficients tab for coefficient competition type", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "coefficient" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByRole("tab", { name: "Coefficients" })).toBeTruthy();
  });

  it("shows Awards tab for competitions with a competition type (non-empty)", async () => {
    mountAtPath(["competitions", "overview"], undefined, { competitionType: "league" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByRole("tab", { name: "Awards" })).toBeTruthy();
  });

  it("hides Awards tab when competition type is undefined", async () => {
    mountAtPath(["competitions", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).queryByRole("tab", { name: "Awards" })).toBeNull();
  });
});

describe("SecondaryNav — context selector", () => {
  it("renders a context selector on the Competitions section", async () => {
    mountAtPath(["competitions"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByText("Competition")).toBeTruthy();
  });

  it("does not render a context selector on sections without one", async () => {
    mountAtPath(["squad"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    expect(within(nav).queryByText("Competition")).toBeNull();
  });
});

describe("SecondaryNav — fallback on invalid tab", () => {
  it("falls back to the default tab when the active conditional tab disappears", async () => {
    mountAtPath(["competitions", "tree"], undefined, { competitionType: "league" });
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).queryByRole("tab", { name: "Tree" })).toBeNull();
    expect(
      within(nav).getByRole("tab", { name: "Overview" }).getAttribute("aria-current"),
    ).toBe("page");
  });
});

describe("SecondaryNav — returns null for unknown sections", () => {
  it("renders nothing for a non-career route", async () => {
    const rootRoute = createRootRoute({ component: () => <SecondaryNav /> });
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    const { container } = render(<RouterProvider router={router} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("SecondaryNav — entity context (§6, §10.3)", () => {
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

  it("renders club tabs when on a club path via /world/clubs/:id", async () => {
    mountAtPath(["world", "clubs", "99", "overview"]);
    // /world/clubs/99 doesn't match entity route pattern — entities use /players/:id, /staff/:id, /nations/:id
    // Clubs are not in routeSegmentToEntityType. This test just confirms the section still works.
    const nav = await screen.findByRole("navigation", { name: "World tabs" });
    expect(within(nav).getByRole("tab", { name: "Clubs" })).toBeTruthy();
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

  it("renders competition tabs for competition route", async () => {
    mountAtPath(["competitions", "table"]); // Not an entity route — competitions section
    // This should still show section tabs
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    expect(within(nav).getByRole("tab", { name: "Overview" })).toBeTruthy();
  });

  it("renders player tabs with ?origin param keeping section state", async () => {
    mountAtPath(["players", "42", "contract"], "?origin=squad");
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(
      within(nav).getByRole("tab", { name: "Contract" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("does not render context selector when showing entity tabs", async () => {
    mountAtPath(["players", "42"]);
    const nav = await screen.findByRole("navigation", { name: "Player tabs" });
    expect(within(nav).queryByText("Competition")).toBeNull();
  });
});

describe("SecondaryNav — overflow scroll (§13.3, spec §14)", () => {
  const FAT_SECTION_TABS = "squad";

  it("applies overflow-x-auto and mask-image when many tabs overflow", async () => {
    mountAtPath([FAT_SECTION_TABS]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });

    // Squad has 7 tabs, which is > 6, so overflow styling applies
    expect(nav.className).toContain("overflow-x-auto");
    expect(nav.className).toContain("mask-image");
  });
});

describe("SecondaryNav — keyboard navigation", () => {
  it("tablist has role=tablist and aria-label", async () => {
    mountAtPath(["competitions", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    const tablist = within(nav).getByRole("tablist");
    expect(tablist.getAttribute("aria-label")).toBe("Competitions");
  });

  it("tabs have correct tabIndex for roving tabindex pattern", async () => {
    mountAtPath(["competitions", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    const overviewTab = within(nav).getByRole("tab", { name: "Overview" });
    const fixturesTab = within(nav).getByRole("tab", { name: "Fixtures" });

    expect(overviewTab.getAttribute("tabindex")).toBe("0");
    expect(fixturesTab.getAttribute("tabindex")).toBe("-1");
  });

  it("non-active tabs have tabindex=-1", async () => {
    mountAtPath(["competitions", "fixtures"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    const fixturesTab = within(nav).getByRole("tab", { name: "Fixtures" });
    const overviewTab = within(nav).getByRole("tab", { name: "Overview" });

    expect(fixturesTab.getAttribute("tabindex")).toBe("0");
    expect(overviewTab.getAttribute("tabindex")).toBe("-1");
  });

  it("moves focus with ArrowRight and ArrowLeft", async () => {
    mountAtPath(["competitions", "overview"]);
    const nav = await screen.findByRole("navigation", { name: "Competitions tabs" });
    const overviewTab = within(nav).getByRole("tab", { name: "Overview" });
    overviewTab.focus();

    act(() => {
      fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
    });
    const fixturesTab = within(nav).getByRole("tab", { name: "Fixtures" });
    expect(document.activeElement).toBe(fixturesTab);

    act(() => {
      fireEvent.keyDown(fixturesTab, { key: "ArrowLeft" });
    });
    expect(document.activeElement).toBe(overviewTab);
  });

  it("wraps around with ArrowRight at the end", async () => {
    mountAtPath(["squad", "reports"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    const reportsTab = within(nav).getByRole("tab", { name: "Reports" });
    reportsTab.focus();

    act(() => {
      fireEvent.keyDown(reportsTab, { key: "ArrowRight" });
    });
    const firstTab = within(nav).getByRole("tab", { name: "First Team" });
    expect(document.activeElement).toBe(firstTab);
  });

  it("moves to the first tab with Home key", async () => {
    mountAtPath(["squad", "reports"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    const reportsTab = within(nav).getByRole("tab", { name: "Reports" });
    reportsTab.focus();

    act(() => {
      fireEvent.keyDown(reportsTab, { key: "Home" });
    });
    const firstTab = within(nav).getByRole("tab", { name: "First Team" });
    expect(document.activeElement).toBe(firstTab);
  });

  it("moves to the last tab with End key", async () => {
    mountAtPath(["squad", "first-team"]);
    const nav = await screen.findByRole("navigation", { name: "Squad tabs" });
    const firstTab = within(nav).getByRole("tab", { name: "First Team" });
    firstTab.focus();

    act(() => {
      fireEvent.keyDown(firstTab, { key: "End" });
    });
    const lastTab = within(nav).getByRole("tab", { name: "Reports" });
    expect(document.activeElement).toBe(lastTab);
  });
});
