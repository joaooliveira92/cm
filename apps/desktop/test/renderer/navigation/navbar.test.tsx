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
import { SaveId, type ClubColoursView } from "@cm-clone/contracts";
import { Navbar } from "../../../src/renderer/navigation/components/Navbar.js";
import type { ScreenIdentity } from "../../../src/renderer/screenIdentity.js";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { NAV_SECTIONS } from "../../../src/renderer/navigation/nav-config.js";
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

const mountNavbar = async (
  initialChild: string,
  overrides?: {
    readonly clubColours?: ClubColoursView | null;
    readonly badgeKey?: string | null;
    readonly identity?: ScreenIdentity | null;
  },
) => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: () => (
      <Navbar
        saveId={saveId}
        clubName="Northport Rovers"
        clubColours={overrides?.clubColours}
        badgeKey={overrides?.badgeKey}
        identity={overrides?.identity}
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
    // A section is badged with its position key only if that key actually dispatches. Derived from
    // the binding registry rather than from `NAV_SECTIONS`, because deriving from the section array
    // would compare `String(index + 1)` against the identical expression in `PrimaryNavItem`, which
    // cannot fail and would assert nothing about whether the advertised key works.
    //
    // This was red while World showed an `8` badge that level 0 of the prefix rejected. See
    // `.scratch/navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md`.
    expect(hintsIn("Primary navigation")).toEqual(
      NAV_SECTIONS.map((_, index) => String(index + 1)).filter((key) => boundSectionKeys.has(key)),
    );
    // Submenu items don't show hints during level0 prefix.
    expect(hintsIn("Analysis submenu")).toEqual([]);

    act(() => setScopeState({ prefixActive: false }));
    clearScopeState("prefixKind");
    expect(hintsIn("Primary navigation")).toEqual([]);
  });

  // Ticket 02 settled that the navbar advertises a key only if that key dispatches. A user override
  // that moves a section's go-to action off `g <position>` takes that key out of level 0 of the
  // prefix, so the section's badge has to go with it. The other sections keep theirs.
  it("drops a section's number badge once the user rebinds its go-to action away from it", async () => {
    await mountNavbar("league");
    const tacticsIndex = NAV_SECTIONS.findIndex((section) => section.id === "tactics");
    const tacticsKey = String(tacticsIndex + 1);
    act(() => publishBindingOverrides({ "go-to-tactics": "n" }));
    act(() => setScopeState({ prefixActive: true, prefixKind: "level0" }));

    const expected = NAV_SECTIONS.map((_, index) => String(index + 1)).filter(
      (key) => boundSectionKeys.has(key) && key !== tacticsKey,
    );
    expect(hintsIn("Primary navigation")).toEqual(expected);
    expect(hintsIn("Primary navigation")).not.toContain(tacticsKey);

    // Resetting the override brings the badge back, so the badge follows the live binding both ways.
    act(() => resetBindingOverrides());
    expect(hintsIn("Primary navigation")).toContain(tacticsKey);
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

const SAMPLE_COLOURS: ClubColoursView = {
  primary: { foreground: "#ffffff", background: "#000000" },
  secondary: { foreground: "#000000", background: "#ffffff" },
  tertiary: null,
  quaternary: null,
};

describe("club badge in the header identity zone", () => {
  it("shows the colour-and-initials shield when badgeKey is null", async () => {
    await mountNavbar("league", { clubColours: SAMPLE_COLOURS, badgeKey: null });
    expect(screen.getByRole("img", { name: "Northport Rovers crest" })).toBeTruthy();
  });

  it("shows the club badge fallback shield when badgeKey is provided but the image is unavailable", async () => {
    await mountNavbar("league", { clubColours: SAMPLE_COLOURS, badgeKey: "eng/northport-rovers" });
    expect(screen.getByRole("img", { name: "Northport Rovers crest" })).toBeTruthy();
  });

  it("renders neither badge nor shield when clubColours is not set", async () => {
    await mountNavbar("league");
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Northport Rovers")).toBeTruthy();
  });
});

describe("a screen's identity in place of the club name", () => {
  it("names the player and their club, with the facts line beneath", async () => {
    await mountNavbar("league", {
      identity: {
        name: "Florian David",
        qualifier: "Benfica",
        facts: "GK, France, Age 22",
        player: {
          overallRating: { _tag: "exact", value: 60 },
          transferValue: { _tag: "exact", value: 0 },
          wage: null,
          contractExpiry: "2 years",
          injury: "None",
        },
      },
    });
    expect(screen.getByText("Florian David", { exact: false })).toBeTruthy();
    expect(screen.getByText("(Benfica)")).toBeTruthy();
    expect(screen.getByText("GK, France, Age 22")).toBeTruthy();
    expect(screen.queryByText("Northport Rovers")).toBeNull();
  });
});
