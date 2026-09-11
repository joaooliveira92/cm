// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { PrimaryNav, type PrimaryNavProps } from "../../../src/renderer/navigation/components/PrimaryNav.js";

const WIDE_QUERY = "(min-width: 1200px)";
const MEDIUM_QUERY = "(min-width: 768px)";

interface MatchMediaListener {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: () => void;
  removeEventListener: () => void;
  addListener: () => void;
  removeListener: () => void;
  dispatchEvent: () => false;
}

const makeMatchMedia = (wide: boolean, medium: boolean): ((query: string) => MatchMediaListener) =>
  (query: string) => ({
    matches:
      query === WIDE_QUERY ? wide : query === MEDIUM_QUERY ? medium : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });

const mountAtPath = (
  props: Partial<PrimaryNavProps>,
  pathSegments: ReadonlyArray<string>,
) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: () => <PrimaryNav {...props} />,
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

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([leafRoute])]),
    ]),
    history: createMemoryHistory({ initialEntries: [`/career/s1/${pathSegments.join("/")}`] }),
  });
  render(<RouterProvider router={router} />);
};

const mountWide = (props: PrimaryNavProps = {}, extraSegments?: ReadonlyArray<string>) => {
  window.matchMedia = makeMatchMedia(true, true);
  return mountAtPath(props, ["squad", ...(extraSegments ?? [])]);
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe("PrimaryNav — rendering (§5 spec order)", () => {
  it("renders 10 primary items in spec order on wide viewport", async () => {
    mountWide();
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });

    const itemLabels = [
      "Manager",
      "Squad",
      "Tactics",
      "Training",
      "Transfers",
      "Club",
      "Competitions",
      "World",
      "Search",
      "More",
    ];

    for (const label of itemLabels) {
      expect(within(nav).getByRole("button", { name: label })).toBeTruthy();
    }
  });
});

describe("PrimaryNav — active state (§12)", () => {
  it("marks the Squad section active on the /squad route", async () => {
    mountWide();
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("button", { name: "Squad" }).getAttribute("aria-current")).toBe("page");
  });

  it("marks the Squad section active on a /squad/:tab route", async () => {
    mountWide({}, ["first-team"]);
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("button", { name: "Squad" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("button", { name: "Tactics" }).getAttribute("aria-current")).toBeNull();
  });

  it("marks the active section only for its own section", async () => {
    window.matchMedia = makeMatchMedia(true, true);
    mountAtPath({}, ["manager"]);
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("button", { name: "Manager" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("button", { name: "Squad" }).getAttribute("aria-current")).toBeNull();
  });

  it("marks the Transfers section active on the /transfers route", async () => {
    window.matchMedia = makeMatchMedia(true, true);
    mountAtPath({}, ["transfers"]);
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("button", { name: "Transfers" }).getAttribute("aria-current")).toBe("page");
  });

  it("marks the Tactics section active on the /tactics route", async () => {
    window.matchMedia = makeMatchMedia(true, true);
    mountAtPath({}, ["tactics"]);
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("button", { name: "Tactics" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("PrimaryNav — club crest and right-zone controls", () => {
  it("renders club crest slot on the far left before nav items", async () => {
    mountWide({ crestSlot: <span data-testid="crest">Crest</span> });
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });

    expect(within(nav).getByTestId("crest")).toBeTruthy();
    expect(nav.innerHTML.indexOf("data-testid=\"crest\"")).toBeLessThan(
      nav.innerHTML.indexOf("Squad"),
    );
  });

  it("renders the Continue slot", async () => {
    mountWide({ continueSlot: <button type="button">Continue</button> });
    await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });

  it("renders the nav slot (back/forward controls)", async () => {
    mountWide({ navSlot: <button type="button">Back</button> });
    await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  it("renders the search slot", async () => {
    mountWide({ searchSlot: <button type="button" aria-label="Open palette" /> });
    await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(screen.getByRole("button", { name: "Open palette" })).toBeTruthy();
  });

  it("renders the date label", async () => {
    mountWide({ dateLabel: "Season 1 · 12 Aug 2026" });
    await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(screen.getByText("Season 1 · 12 Aug 2026")).toBeTruthy();
  });
});

describe("PrimaryNav — Inbox badge", () => {
  it("shows badge count when manager has unread items", async () => {
    mountWide({ badges: { manager: { count: 5, label: "unread messages" } } });
    await screen.findByRole("navigation", { name: "Primary navigation" });

    const inbox = screen.getByRole("button", { name: /Inbox/ });
    expect(inbox).toBeTruthy();
    expect(inbox.textContent).toContain("5");
  });

  it("does not render inbox indicator when count is 0", async () => {
    mountWide({ badges: { manager: { count: 0, label: "unread" } } });
    await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(screen.queryByRole("button", { name: /Inbox/ })).toBeNull();
  });

  it("shows 99+ for counts over 99", async () => {
    mountWide({ badges: { manager: { count: 150, label: "unread messages" } } });
    await screen.findByRole("navigation", { name: "Primary navigation" });

    const inbox = screen.getByRole("button", { name: /Inbox/ });
    expect(inbox.textContent).toContain("99+");
  });
});

describe("PrimaryNav — responsive hiding (§13)", () => {
  it("hides World and Search labels and renders icon-only on medium viewport", async () => {
    window.matchMedia = makeMatchMedia(false, true);
    mountAtPath({}, ["squad"]);

    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    // The icon-only fallback carries the accessible label but no visible text.
    const worldIcon = within(nav).getByRole("button", { name: "World" });
    expect(worldIcon).toBeTruthy();
    expect(worldIcon.getAttribute("data-icon-only")).toBe("true");
    expect(worldIcon.textContent?.includes("World")).toBe(false);

    const searchIcon = within(nav).getByRole("button", { name: "Search" });
    expect(searchIcon.getAttribute("data-icon-only")).toBe("true");
    expect(searchIcon.textContent?.includes("Search")).toBe(false);
  });

  it("shows labels on wide viewport (>=1200px)", async () => {
    window.matchMedia = makeMatchMedia(true, true);
    mountAtPath({}, ["squad"]);

    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    const world = within(nav).getByRole("button", { name: "World" });
    expect(world.getAttribute("data-icon-only")).toBeNull();
    expect(world.textContent?.includes("World")).toBe(true);

    const search = within(nav).getByRole("button", { name: "Search" });
    expect(search.getAttribute("data-icon-only")).toBeNull();
    expect(search.textContent?.includes("Search")).toBe(true);

    expect(within(nav).getByRole("button", { name: "More" })).toBeTruthy();
  });

  it("shows compact top bar on narrow viewport (<768px) with current section label", async () => {
    window.matchMedia = makeMatchMedia(false, false);
    mountAtPath({}, ["squad"]);

    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByText("Squad")).toBeTruthy();
    expect(within(nav).queryByText("World")).toBeNull();
    expect(within(nav).queryByText("Search")).toBeNull();
  });

  it("shows Continue on narrow viewport", async () => {
    window.matchMedia = makeMatchMedia(false, false);
    mountAtPath({ continueSlot: <button type="button">Continue</button> }, ["squad"]);

    await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });
});

describe("PrimaryNav — More dropdown", () => {
  it("renders a More trigger button", async () => {
    mountWide();
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(within(nav).getByRole("button", { name: "More" })).toBeTruthy();
  });

  it("opens a panel with spec-defined items on click", async () => {
    mountWide();
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    const more = within(nav).getByRole("button", { name: "More" });
    await act(async () => {
      more.click();
    });

    const expected = [
      "History",
      "Game Status",
      "Hall of Fame",
      "Add Manager",
      "Preferences",
      "Save",
      "Save As",
      "Help",
      "Credits",
      "Quit Game",
    ];

    for (const label of expected) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});

describe("PrimaryNav — onGoTo callback", () => {
  it("calls onGoTo with section id when a primary item is clicked", async () => {
    const onGoTo = vi.fn();
    mountWide({ onGoTo });
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });

    within(nav).getByRole("button", { name: "Tactics" }).click();
    expect(onGoTo).toHaveBeenCalledWith("tactics");
  });

  it("calls onGoTo with squad when Squad is clicked", async () => {
    const onGoTo = vi.fn();
    window.matchMedia = makeMatchMedia(true, true);
    mountAtPath({ onGoTo }, ["manager"]);
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });

    within(nav).getByRole("button", { name: "Squad" }).click();
    expect(onGoTo).toHaveBeenCalledWith("squad");
  });
});

describe("PrimaryNav — no sidebar", () => {
  it("renders a horizontal nav element — no sidebar", async () => {
    mountWide();
    const nav = await screen.findByRole("navigation", { name: "Primary navigation" });
    expect(nav.tagName.toLowerCase()).toBe("nav");
    expect(nav.className).not.toContain("sidebar");
  });
});