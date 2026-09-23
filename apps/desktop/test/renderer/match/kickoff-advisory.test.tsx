import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveId } from "@cm-clone/contracts";
import { RegistryProvider } from "../../../src/renderer/rpc.js";
import { MatchProvider } from "../../../src/renderer/match/MatchProvider.js";
import { KickoffPanel } from "../../../src/renderer/match/KickoffPanel.js";
import { clearActiveMatch } from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";

/**
 * group-g-match-day 39: the named bench is the only source of substitutes, so a Tactic that names
 * none is flagged on the Kickoff panel. An advisory, not a Readiness Blocker: Play and Quick result
 * stay available beside it.
 */

const s1 = SaveId.make("s1");

const NO_BENCH = {
  id: "no-substitutes-named",
  severity: "advisory",
  title: "No substitutes named",
  detail: "Name a bench on the Squad screen, or no one can come on during the match.",
  destination: "squad",
};

const mockSave = (advisories: ReadonlyArray<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = {
    call: async (method: string) => {
      if (method === "getLeagueTable") {
        return {
          _tag: "Success",
          value: {
            season: {
              seasonNumber: 1,
              currentDate: "2026-08-01",
              phase: "in_season",
              awaitingFixture: {
                fixtureId: 1,
                date: "2026-08-01",
                competitionId: "league_1",
                opponentClubId: "away",
                opponentClubName: "Away FC",
                isHome: true,
                matchId: null,
                blockers: [],
                advisories,
              },
            },
            standings: [],
          },
        };
      }
      return { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: s1 } };
    },
  };
};

const mountKickoff = async () => {
  render(
    <RegistryProvider>
      <MatchProvider saveId={s1}>
        <KickoffPanel />
      </MatchProvider>
    </RegistryProvider>,
  );
  // Two timer beats: the advisory debounces on the first, then settles on the secondched — unrolled
  // rather than looped so the "repeat the same step" shape stays explicit for the lint gate.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

beforeEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(s1);
  resetScopeState();
  vi.useRealTimers();
});

describe("the Kickoff panel flags an empty bench (group-g-match-day 39)", () => {
  it("shows the advisory with an empty bench, and Play and Quick result stay enabled", async () => {
    mockSave([NO_BENCH]);
    await mountKickoff();

    expect(screen.getByText("Home to Away FC")).toBeTruthy();
    const advisories = screen.getByRole("list", { name: "Before kickoff" });
    expect(advisories.textContent).toContain("No substitutes named");
    expect(advisories.textContent).toContain("Squad screen");
    expect((screen.getByRole("button", { name: "Play match" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Quick result" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("says nothing once a bench is named", async () => {
    mockSave([]);
    await mountKickoff();

    expect(screen.getByText("Home to Away FC")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Before kickoff" })).toBeNull();
    expect(screen.queryByText("No substitutes named")).toBeNull();
    expect((screen.getByRole("button", { name: "Play match" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
