import { act, cleanup, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClubId, FixtureId, MatchId, SaveId } from "@cm-clone/contracts";
import { matchClock } from "../../../src/renderer/chrome/header/MatchHeader.js";
import {
  clearActiveMatch,
  recordHalfTimeRevealed,
  recordRevealedMinute,
  recordRevealedScore,
  setActiveMatch,
} from "../../../src/renderer/match/session.js";
import { MATCH_COLOURS } from "../match/matchColours.js";
import { mountCareer, resetCareerHarness } from "./career-harness.js";

const saveId = SaveId.make("s1");
const matchId = MatchId.make("m1");

const startMatch = (phase: "live" | "complete" = "live") =>
  setActiveMatch({
    saveId,
    match: {
      matchId,
      fixtureId: FixtureId.make(1),
      homeClubId: ClubId.make("home"),
      homeClubName: "Vasco da Gama",
      awayClubId: ClubId.make("away"),
      awayClubName: "Palmeiras",
      ...MATCH_COLOURS,
      isHome: false,
    } as never,
    phase,
  });

/** The session store notifies on a microtask; flush it inside `act`. */
const settle = () => act(async () => { await Promise.resolve(); });

const scoreboard = () => screen.getByRole("region", { name: "Match score" });

beforeEach(resetCareerHarness);

afterEach(() => {
  clearActiveMatch(saveId);
  cleanup();
});

describe("the career header while a match is on", () => {
  it("becomes the scoreboard from kickoff, and returns once the result is accepted", async () => {
    await mountCareer("in_season", "fixtures");
    expect(screen.queryByRole("region", { name: "Match score" })).toBeNull();

    startMatch();
    await settle();

    const board = within(scoreboard());
    expect(board.getByText("Vasco da Gama")).toBeTruthy();
    expect(board.getByText("Palmeiras")).toBeTruthy();
    expect(board.getByText("0'")).toBeTruthy();
    // The season band and its controls step aside; navigation stays.
    expect(screen.queryByText("Season 3 · 17 Oct 2026")).toBeNull();
    expect(screen.queryByRole("button", { name: /Continue/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Preferences" })).toBeNull();
    expect(screen.getByRole("button", { name: /Open Match day/ })).toBeTruthy();

    // It follows what Match day reveals.
    recordRevealedScore(saveId, matchId, { homeScore: 0, awayScore: 2 });
    recordRevealedMinute(saveId, matchId, 63);
    await settle();
    expect(screen.getByRole("button", { name: "Vasco da Gama 0, Palmeiras 2, 63'. Open Match day" })).toBeTruthy();

    // Accept result clears the session: the ordinary header is back.
    clearActiveMatch(saveId);
    await settle();
    expect(screen.queryByRole("region", { name: "Match score" })).toBeNull();
    expect(await screen.findByText("Season 3 · 17 Oct 2026")).toBeTruthy();
  });

  it("stays up at full time until the result is accepted", async () => {
    await mountCareer("in_season", "fixtures");
    startMatch("complete");
    await settle();
    expect(within(scoreboard()).getByText("FT")).toBeTruthy();
  });

  it("mounts the Possession bar with the scoreboard, and takes it down when the result is accepted", async () => {
    await mountCareer("in_season", "fixtures");
    expect(screen.queryByText("Possession")).toBeNull();

    startMatch();
    await settle();
    expect(screen.getByText("Possession")).toBeTruthy();

    clearActiveMatch(saveId);
    await settle();
    expect(screen.queryByText("Possession")).toBeNull();
  });
});

describe("the scoreboard clock", () => {
  it("reads the revealed minute, HT at the break and FT at the end", () => {
    expect(matchClock({ minute: 17, atHalfTime: false, complete: false })).toBe("17'");
    expect(matchClock({ minute: 45, atHalfTime: true, complete: false })).toBe("HT");
    expect(matchClock({ minute: 90, atHalfTime: false, complete: true })).toBe("FT");
  });

  it("shows HT once half time is revealed at 45", async () => {
    await mountCareer("in_season", "fixtures");
    startMatch();
    recordRevealedMinute(saveId, matchId, 45);
    recordHalfTimeRevealed(saveId, matchId);
    await settle();
    expect(within(scoreboard()).getByText("HT")).toBeTruthy();
  });
});
