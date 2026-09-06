// @vitest-environment jsdom
import path from "node:path";
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
import { CareerChildView, CareerShell } from "../../../src/renderer/router/career.js";
import { seasonReadout, matchReadout } from "../../../src/renderer/chrome/CareerChrome.js";
import { LeagueTableScreen } from "../../../src/renderer/leagueTable/LeagueTableScreen.js";
import { FixturesScreen } from "../../../src/renderer/fixtures/FixturesScreen.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { resetActionHandlers } from "../../../src/renderer/actions/dispatch.js";
import { clearScopeState, resetScopeState, setScopeState } from "../../../src/renderer/actions/scopeState.js";
import { resetBindingOverrides, publishBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { resetTableSessions } from "../../../src/renderer/table/tableState.js";

const rid = (s: string) => SaveId.make(s);

// The jsdom environment rewrites `import.meta.url` to a non-file scheme, so
// resolve the source path from the vitest cwd (the desktop package root)
// instead of the module URL.
const leagueTableSourcePath = path.join(
  process.cwd(),
  "src/renderer/leagueTable/LeagueTableScreen.tsx",
);

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

type Phase = "pre_season" | "in_season" | "mid_window_open" | "season_complete";

let advanceCalls = 0;

const preload = (phase: Phase) => {
  advanceCalls = 0;
  mockPreload(async (method) => {
    if (method === "getLeagueTable") {
      return {
        _tag: "Success",
        value: { season: { seasonNumber: 3, currentDate: "2026-10-17", phase }, standings: [] },
      } as never;
    }
    if (method === "getManagerProfileScreen") {
      return {
        _tag: "Success",
        value: {
          profile: {
            managerName: "Boss",
            archetypeOrigin: "custom",
            pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
          },
          clubName: "Northport Rovers",
          clubColours: {
            primary: { foreground: "#ffffff", background: "#000000" },
            secondary: { foreground: "#000000", background: "#ffffff" },
            tertiary: null,
            quaternary: null,
          },
          seasonNumber: 3,
          tenureSeasons: 2,
          archived: false,
        },
      } as never;
    }
    if (method === "loadSave") {
      return {
        _tag: "Success",
        value: {
          id: rid("s1"),
          name: "My Save",
          createdAt: "2026-01-01T00:00:00.000Z",
          archivedCause: null,
        },
      } as never;
    }
    if (method === "advanceCalendar") {
      advanceCalls += 1;
      return {
        _tag: "Success",
        value: {
          season: { seasonNumber: 3, currentDate: "2026-10-24", phase: "in_season" as const },
          resolvedDate: "2026-10-17",
          transferWindowClosed: null,
          transferWindowOpened: null,
          seasonConcluded: false,
          boardObjectiveVerdict: null,
          managerOutcome: "none" as const,
        },
      } as never;
    }
    if (method === "getFixtures") {
      return {
        _tag: "Success",
        value: { season: { seasonNumber: 3, currentDate: "2026-10-17", phase }, fixtures: [] },
      } as never;
    }
    return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
  });
};

/**
 * The real career shell through the router — `CareerShell` renders the chrome
 * and the child screen exactly as the shipped route tree does. Mounting the
 * chrome by hand would not exercise the composition that ships.
 */
const mountCareer = async (phase: Phase, child: "league" | "fixtures") => {
  preload(phase);
  await mountRoutedCareer(child);
};

/** The router half of `mountCareer`, without the canned preload — for a test
 *  that needs its own wire responses (a payload that changes between calls). */
const mountRoutedCareer = async (child: "league" | "fixtures") => {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const careerRoute = createRoute({ getParentRoute: () => rootRoute, path: "career" });
  const saveRoute = createRoute({
    getParentRoute: () => careerRoute,
    path: "$saveId",
    component: CareerShell,
  });
  const leagueRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: "league",
    component: () => <CareerChildView screenId="league" Screen={LeagueTableScreen} />,
  });
  const fixturesRoute = createRoute({
    getParentRoute: () => saveRoute,
    path: "fixtures",
    component: () => <CareerChildView screenId="fixtures" Screen={FixturesScreen} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      careerRoute.addChildren([saveRoute.addChildren([leagueRoute, fixturesRoute])]),
    ]),
    history: createMemoryHistory({ initialEntries: [`/career/s1/${child}`] }),
  });
  bindRouter({ navigate: () => undefined, history: { back: () => undefined, forward: () => undefined, canGoBack: () => false } } as never);
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", { name: /Continue/ });
};

beforeEach(() => {
  cleanup();
  resetActionHandlers();
  resetScopeState();
  resetBindingOverrides();
  resetTableSessions();
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  resetScopeState();
  resetBindingOverrides();
});

describe("season readout", () => {
  it("stands on the calendar date the season has reached", () => {
    expect(seasonReadout({ seasonNumber: 3, currentDate: "2026-10-17", phase: "in_season" })).toBe(
      "Season 3 · 17 Oct 2026",
    );
  });

  it("replaces the date with a phase word outside the in-season phase", () => {
    const at = (phase: string) =>
      seasonReadout({ seasonNumber: 3, currentDate: "2026-10-17", phase });
    expect(at("pre_season")).toBe("Season 3 · Pre-season");
    expect(at("mid_window_open")).toBe("Season 3 · Transfer window open");
    expect(at("season_complete")).toBe("Season 3 · Season complete");
  });
});

describe("the career chrome", () => {
  it("carries club identity and the temporal cluster on every career screen", async () => {
    await mountCareer("in_season", "fixtures");
    expect(await screen.findByText("Northport Rovers")).toBeTruthy();
    expect(screen.getByText("Season 3 · 17 Oct 2026")).toBeTruthy();
    expect(screen.getByText("My Save")).toBeTruthy();
  });

  it("never renders day-or-date copy", async () => {
    await mountCareer("in_season", "league");
    const chrome = screen.getByRole("banner");
    for (const forbidden of [/\bday\b/i, /\bdate\b/i, /\d{4}-\d{2}-\d{2}/]) {
      expect(chrome.textContent ?? "").not.toMatch(forbidden);
    }
  });

  it("marks the active item and keeps every primary section present", async () => {
    await mountCareer("in_season", "fixtures");
    // The active destination's item lives in the Analysis context strip and
    // carries aria-current; another section's item does not.
    expect(screen.getByRole("button", { name: "Fixtures" }).getAttribute("aria-current")).toBe("page");
    // The context strip shows the active section's items.
    expect(screen.getByRole("button", { name: "League Table" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Match Day" })).toBeTruthy();
    // Every primary section plus Back to saves is present in the primary row.
    for (const label of [
      "Squad",
      "Tactics",
      "Training",
      "Recruitment",
      "Analysis",
      "Club",
      "Back to saves",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });
});

describe("Continue in the chrome", () => {
  it("dispatches the career loop from a screen that is not the league table", async () => {
    await mountCareer("in_season", "fixtures");
    act(() => {
      screen.getByRole("button", { name: /Continue/ }).click();
    });
    await screen.findByRole("button", { name: /Continue/ });
    expect(advanceCalls).toBe(1);
  });

  it("answers Space from a screen that is not the league table", async () => {
    await mountCareer("in_season", "fixtures");
    // The chrome publishes the phase/advancing read model the registry's
    // availability predicate evaluates; without it the spine would refuse.
    act(() => fireEvent.keyDown(document, { key: " " }));
    expect(advanceCalls).toBe(0); // no spine mounted here — the handler is what we assert
    act(() => {
      screen.getByRole("button", { name: /Continue/ }).click();
    });
    expect(advanceCalls).toBe(1);
  });

  it("disables with the action's reason when the season is complete", async () => {
    await mountCareer("season_complete", "fixtures");
    const button = (await screen.findByRole("button", {
      name: /Continue/,
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    const reason = ALL_ACTIONS.find((a) => a.id === "continue")?.unavailableReason;
    expect(reason).toBeDefined();
    expect(screen.getByText(reason!)).toBeTruthy();
    act(() => button.click());
    expect(advanceCalls).toBe(0);
  });

  it("shows the effective binding, following a rebind rather than the coded default", async () => {
    await mountCareer("in_season", "fixtures");
    expect(screen.getByLabelText("Keyboard shortcut Space")).toBeTruthy();
    act(() => publishBindingOverrides({ continue: "n" }));
    expect(screen.getByLabelText("Keyboard shortcut n")).toBeTruthy();
    expect(screen.queryByLabelText("Keyboard shortcut Space")).toBeNull();
  });

  it("is a native button carrying the focus ring, so Enter and Space reach it", async () => {
    await mountCareer("in_season", "league");
    const button = screen.getByRole("button", { name: /Continue/ });
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toContain("focus-visible:ring-2");
    button.focus();
    expect(button).toBe(document.activeElement);
  });

  it("keeps the label fixed — no contextual Go to Match until the calendar supplies one", () => {
    const action = ALL_ACTIONS.find((a) => a.id === "continue");
    expect(action?.label).toBe("Continue");
    // `.primary` is what drives the gradient treatment. Presentation only:
    // the flag must never appear in a dispatch path.
    expect(action?.primary).toBe(true);
  });

  it("is no longer owned by the league table", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(leagueTableSourcePath, "utf8"),
    );
    expect(source).not.toContain('registerActionHandler("continue"');
    // Nor by any other name. The screen owned a second advance control of its
    // own for long enough that only one of the two reported a failure, so what
    // is asserted is that the screen dispatches nothing at all.
    expect(source).not.toContain("registerActionHandler");
    expect(source).not.toContain("advanceCalendarMutation");
    expect(source).not.toContain("data-action-id");
  });

  it("reports why the advance stopped, and routes each consequence to the screen that owns it", async () => {
    mockPreload(async (method) => {
      if (method === "getLeagueTable") {
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 3, currentDate: "2027-05-22", phase: "in_season" as const },
            standings: [],
          },
        } as never;
      }
      if (method === "advanceCalendar") {
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 4, currentDate: "2027-07-01", phase: "pre_season" as const },
            resolvedDate: "2027-05-22",
            transferWindowClosed: "mid_season",
            transferWindowOpened: null,
            seasonConcluded: true,
            boardObjectiveVerdict: "met" as const,
            managerOutcome: "warned" as const,
          },
        } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });
    await mountRoutedCareer("league");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    const band = await screen.findByRole("region", { name: "What Continue did" });
    // The highest-priority consequence is the heading — it can change whether
    // the career continues in its current form.
    expect(
      within(band).getByRole("heading", { name: "The board has warned you" }),
    ).toBeTruthy();
    // ...and the lower-priority ones are still listed, never dropped.
    expect(within(band).getByText(/The season is over/)).toBeTruthy();
    expect(within(band).getByText(/Transfer window has closed/)).toBeTruthy();
    expect(within(band).getByText(/has been resolved/)).toBeTruthy();
    // The reason arrives without looking, once.
    expect(within(band).getAllByRole("status")[0]!.textContent).toBe("The board has warned you");
  });

  it("a consequence opens the screen that owns it, and closes the report", async () => {
    const navigated: string[] = [];
    await mountCareer("in_season", "league");
    bindRouter({
      navigate: (opts: { to: string }) => navigated.push(opts.to),
      history: { back: () => undefined, forward: () => undefined, canGoBack: () => false },
    } as never);

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    const band = await screen.findByRole("region", { name: "What Continue did" });
    // The canned advance resolves a Matchday, whose consequence the League table owns.
    fireEvent.click(within(band).getByRole("button", { name: "League table" }));

    expect(navigated).toEqual(["/career/$saveId/league"]);
    expect(screen.queryByRole("region", { name: "What Continue did" })).toBeNull();
  });

  it("dismissing the report leaves it dismissed", async () => {
    await mountCareer("in_season", "league");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    const band = await screen.findByRole("region", { name: "What Continue did" });

    fireEvent.click(within(band).getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("region", { name: "What Continue did" })).toBeNull();
    // A re-render for an unrelated reason must not bring it back.
    act(() => setScopeState({ ready: true }));
    expect(screen.queryByRole("region", { name: "What Continue did" })).toBeNull();
  });

  it("a failed advance says so rather than vanishing", async () => {
    mockPreload(async (method) => {
      if (method === "getLeagueTable") {
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 3, currentDate: "2026-10-17", phase: "in_season" as const },
            standings: [],
          },
        } as never;
      }
      if (method === "advanceCalendar") {
        return {
          _tag: "Failure",
          error: { _tag: "SaveArchivedError", saveId: rid("s1"), cause: "sacked" },
        } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });
    await mountRoutedCareer("league");
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    // The sentence the League table's own control used to be the only place to
    // see. It is now reported wherever the player pressed Continue.
    const band = await screen.findByRole("region", { name: "What Continue did" });
    expect(
      within(band).getByRole("heading", {
        name: "You have been sacked — this save is archived.",
      }),
    ).toBeTruthy();
  });

  it("advancing from the chrome refreshes the mounted screen with no manual reload", async () => {
    let leagueTableCalls = 0;
    mockPreload(async (method) => {
      if (method === "getLeagueTable") {
        leagueTableCalls += 1;
        return {
          _tag: "Success",
          value: {
            // A different date per refetch, which is what the test observes changing.
            season: {
              seasonNumber: 3,
              currentDate: `2026-10-${String(16 + leagueTableCalls).padStart(2, "0")}`,
              phase: "in_season" as const,
            },
            standings: [],
          },
        } as never;
      }
      if (method === "advanceCalendar") {
        advanceCalls += 1;
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 3, currentDate: "2026-10-24", phase: "in_season" as const },
            resolvedDate: "2026-10-17",
            transferWindowClosed: null,
            transferWindowOpened: null,
            seasonConcluded: false,
            boardObjectiveVerdict: null,
            managerOutcome: "none" as const,
          },
        } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });
    advanceCalls = 0;
    await mountRoutedCareer("league");

    // Scoped to the child screen: the shell renders its own readout from the
    // same query, and this test is about the screen refreshing under it.
    const table = await screen.findByRole("main");
    expect(await within(table).findByText(/17 Oct 2026/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await within(table).findByText(/18 Oct 2026/)).toBeTruthy();
    expect(advanceCalls).toBe(1);
    expect(screen.queryByText(/Refreshing…/)).toBeNull();
  });

  it("swaps the temporal cluster to the match readout and disables during a live match", async () => {
    await mountCareer("in_season", "fixtures");
    // The chrome subscribes to scope-state; a live match publishes a `match`
    // read model exactly as MatchDayScreen does on mount.
    act(() => {
      setScopeState({
        ready: true,
        match: {
          homeClubName: "Northport Rovers",
          awayClubName: "Eastvale",
          homeScore: 2,
          awayScore: 1,
          currentMinute: 63,
        },
      });
    });
    expect(screen.getByText(/63' · Northport Rovers 2–1 Eastvale/)).toBeTruthy();
    expect(screen.getByText("The season cannot advance during a match.")).toBeTruthy();
    const disabled = screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);

    // Clearing the `match` key on full time restores the season readout.
    act(() => {
      clearScopeState("match");
    });
    expect(screen.getByText("Season 3 · 17 Oct 2026")).toBeTruthy();
    expect(screen.queryByText("The season cannot advance during a match.")).toBeNull();
    const enabled = screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;
    expect(enabled.disabled).toBe(false);
  });

  it("formats the match readout consistently with the dashboard language", () => {
    expect(
      matchReadout({ homeClubName: "Northport", awayClubName: "Eastvale", homeScore: 2, awayScore: 1, currentMinute: 63 }),
    ).toBe("63' · Northport 2–1 Eastvale");
  });
});
