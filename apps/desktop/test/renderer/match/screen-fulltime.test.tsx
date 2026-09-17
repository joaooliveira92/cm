// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClubId, MatchId, SaveId, type CommentaryLineView } from "@cm-clone/contracts";
import { MatchDayScreen } from "../../../src/renderer/match/MatchDayScreen.js";
import {
  clearActiveMatch,
  recordRevealedLines,
  recordRevealedMinute,
  recordRevealedScore,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { resetScopeState } from "../../../src/renderer/actions/scopeState.js";
import { RegistryProvider } from "../../../src/renderer/rpc.js";

const rid = (id: string) => SaveId.make(id);
const cid = (id: string) => ClubId.make(id);

const NOT_FOUND = { _tag: "SaveNotFoundError", id: rid("s1") };

const line = (minute: number, text: string): CommentaryLineView => ({
  minute,
  tag: "Goal",
  text,
});

/** A finished match session, the feed revealed to the end and its score recorded, as Match day
 *  leaves it when the manager navigates away at full time. */
const fullTimeSession = () => {
  setActiveMatch({
    saveId: rid("s1"),
    match: {
      matchId: rid("m1"),
      homeClubId: cid("home"),
      homeClubName: "Home FC",
      awayClubId: cid("away"),
      awayClubName: "Away FC",
    },
    phase: "complete",
  } as never);
  recordRevealedLines(rid("s1"), MatchId.make("m1"), [line(23, "Goal!"), line(67, "Second!")]);
  recordRevealedMinute(rid("s1"), MatchId.make("m1"), 67);
  recordRevealedScore(rid("s1"), MatchId.make("m1"), { homeScore: 2, awayScore: 1 });
};

const mockPreload = (impl: (method: string, payload: unknown) => Promise<unknown>) => {
  (window as unknown as { cmClone: { call: unknown } }).cmClone = { call: impl };
};

beforeEach(() => {
  cleanup();
  resetScopeState();
});

afterEach(() => {
  cleanup();
  clearActiveMatch(rid("s1"));
  resetScopeState();
});

describe("MatchDayScreen at full time — the settled feed stays on screen (no lost commentary)", () => {
  it("keeps the scoreboard, the Full time status, the revealed feed and the final score row", async () => {
    fullTimeSession();
    mockPreload(async () => ({ _tag: "Failure", error: NOT_FOUND } as never));
    render(
      <RegistryProvider>
        <MatchDayScreen saveId={rid("s1")} />
      </RegistryProvider>,
    );

    // The scoreboard and status line survive the isComplete → MatchComplete swap.
    await screen.findByText("Full time");
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText("Home FC")).toBeTruthy();
    expect(screen.getByText("Away FC")).toBeTruthy();

    // The settled feed is still readable line by line.
    expect(screen.getByText("Goal!")).toBeTruthy();
    expect(screen.getByText("Second!")).toBeTruthy();

    // The completed-match row and its reset affordance render below the feed.
    await screen.findByText(/Final score: Home FC 2 - 1 Away FC/);
    // Full time is not the career accepting the result: the Matchday is committed by an explicit
    // press, and until it happens the division has not played and the Calendar has not moved.
    expect(screen.getByRole("button", { name: "Accept result" })).toBeTruthy();

    // The live control panel is gone at full time.
    expect(screen.queryByRole("button", { name: /Tactics & substitutions/ })).toBeNull();
  });
});