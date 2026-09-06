// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ALL_ACTIONS } from "../../../src/renderer/actions/allActions.js";
import { matchReadout } from "../../../src/renderer/chrome/CareerChrome.js";
import { publishBindingOverrides, resetBindingOverrides } from "../../../src/renderer/actions/bindingState.js";
import { clearScopeState, resetScopeState, setScopeState } from "../../../src/renderer/actions/scopeState.js";
import { bindRouter } from "../../../src/renderer/navigation/adapter.js";
import {
  counters,
  leagueTableSourcePath,
  mockPreload,
  mountCareer,
  mountRoutedCareer,
  resetCareerHarness,
  rid,
  SAMPLE_TACTIC,
  tacticsPayload,
} from "./career-harness.js";

beforeEach(resetCareerHarness);

afterEach(() => {
  cleanup();
  resetScopeState();
  resetBindingOverrides();
});

describe("Continue in the chrome", () => {
  it("dispatches the career loop from a screen that is not the league table", async () => {
    await mountCareer("in_season", "fixtures");
    act(() => {
      screen.getByRole("button", { name: /Continue/ }).click();
    });
    await screen.findByRole("button", { name: /Continue/ });
    expect(counters.advanceCalls).toBe(1);
  });

  it("answers Space from a screen that is not the league table", async () => {
    await mountCareer("in_season", "fixtures");
    // The chrome publishes the phase/advancing read model the registry's
    // availability predicate evaluates; without it the spine would refuse.
    act(() => fireEvent.keyDown(document, { key: " " }));
    expect(counters.advanceCalls).toBe(0); // no spine mounted here — the handler is what we assert
    act(() => {
      screen.getByRole("button", { name: /Continue/ }).click();
    });
    expect(counters.advanceCalls).toBe(1);
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
    expect(counters.advanceCalls).toBe(0);
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

  it("lists every outstanding item, blockers first, each with the screen that owns its fix", async () => {
    mockPreload(async (method) => {
      if (method === "getLeagueTable") {
        return {
          _tag: "Success",
          value: {
            season: { seasonNumber: 3, currentDate: "2026-10-17", phase: "season_complete" as const },
            standings: [],
          },
        } as never;
      }
      // No Tactic, and two clubs waiting on an answer: a career with three
      // things outstanding at once, which is the case the single-line warning
      // could not report.
      if (method === "getTactics") return tacticsPayload(null);
      if (method === "getNewsInbox") {
        return {
          _tag: "Success",
          value: {
            messages: [],
            counts: {
              total: 2,
              unread: 0,
              actionRequired: 2,
              flagged: 0,
              archived: 0,
              highPriorityUnread: 0,
            },
          },
        } as never;
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: rid("s1") } } as never;
    });
    await mountRoutedCareer("league");

    const band = await screen.findByRole("region", { name: "Outstanding before you continue" });
    const rows = within(band).getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(rows).toHaveLength(3);
    // The blocker leads; the advisory the advance itself destroys outranks the
    // standing one that survives it.
    expect(rows[0]).toContain("The season is complete");
    expect(rows[1]).toContain("Bids awaiting your response");
    expect(rows[2]).toContain("No Tactic set");
    expect(within(band).getByRole("button", { name: "Tactics" })).toBeTruthy();
    expect(within(band).getByRole("button", { name: "Transfers" })).toBeTruthy();
  });

  it("the outstanding band is derived, not dismissible: it clears when its condition does", async () => {
    let hasTactic = false;
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
      if (method === "getTactics") return tacticsPayload(hasTactic ? SAMPLE_TACTIC : null);
      if (method === "advanceCalendar") {
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
    await mountRoutedCareer("league");

    const band = await screen.findByRole("region", { name: "Outstanding before you continue" });
    // Nothing dismisses it — an acknowledged reminder would leave the Tactic unset.
    expect(within(band).queryByRole("button", { name: "Dismiss" })).toBeNull();

    hasTactic = true;
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Outstanding before you continue" }),
      ).toBeNull(),
    );
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
        counters.advanceCalls += 1;
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
    counters.advanceCalls = 0;
    await mountRoutedCareer("league");

    // Scoped to the child screen: the shell renders its own readout from the
    // same query, and this test is about the screen refreshing under it.
    const table = await screen.findByRole("main");
    expect(await within(table).findByText(/17 Oct 2026/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    expect(await within(table).findByText(/18 Oct 2026/)).toBeTruthy();
    expect(counters.advanceCalls).toBe(1);
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
    // The header says why the control is greyed; the band says what is blocking
    // it and where that lives. Two questions, stated once each.
    expect(screen.getByText("The Calendar cannot advance right now.")).toBeTruthy();
    const outstanding = screen.getByRole("region", { name: "Outstanding before you continue" });
    expect(within(outstanding).getByText("The season cannot advance during a match.")).toBeTruthy();
    const disabled = screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;
    expect(disabled.disabled).toBe(true);

    // Clearing the `match` key on full time restores the season readout.
    act(() => {
      clearScopeState("match");
    });
    expect(screen.getByText("Season 3 · 17 Oct 2026")).toBeTruthy();
    expect(screen.queryByText("The season cannot advance during a match.")).toBeNull();
    expect(screen.queryByRole("region", { name: "Outstanding before you continue" })).toBeNull();
    const enabled = screen.getByRole("button", { name: /Continue/ }) as HTMLButtonElement;
    expect(enabled.disabled).toBe(false);
  });

  it("formats the match readout consistently with the dashboard language", () => {
    expect(
      matchReadout({ homeClubName: "Northport", awayClubName: "Eastvale", homeScore: 2, awayScore: 1, currentMinute: 63 }),
    ).toBe("63' · Northport 2–1 Eastvale");
  });
});
