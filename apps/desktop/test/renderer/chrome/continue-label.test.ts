// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { deriveContinueLabel, type ContinueLabelSeason } from "../../../src/renderer/chrome/header/continue-label.js";

const season: ContinueLabelSeason = { awaitingFixture: null };
const pendingMatchSeason: ContinueLabelSeason = {
  awaitingFixture: {
    fixtureId: "f1",
    date: "2026-10-24",
    competitionId: "league_1",
    opponentClubId: "c2",
    opponentClubName: "United",
    isHome: true,
    matchId: null,
    blockers: [],
  },
};

describe("deriveContinueLabel", () => {
  it('returns "Continue" by default', () => {
    expect(
      deriveContinueLabel({ season, continueDisabled: false, actionRequired: null }),
    ).toBe("Continue");
  });

  it('returns "Continue" when season is null', () => {
    expect(
      deriveContinueLabel({ season: null, continueDisabled: false, actionRequired: null }),
    ).toBe("Continue");
  });

  it('returns "Continue" when disabled', () => {
    expect(
      deriveContinueLabel({ season, continueDisabled: true, actionRequired: null }),
    ).toBe("Continue");
  });

  it('returns "Go to Match" when awaiting a fixture', () => {
    expect(
      deriveContinueLabel({
        season: pendingMatchSeason,
        continueDisabled: false,
        actionRequired: null,
      }),
    ).toBe("Go to Match");
  });

  it('returns "Go to Match" even when actions are required (match takes priority)', () => {
    expect(
      deriveContinueLabel({
        season: pendingMatchSeason,
        continueDisabled: false,
        actionRequired: 2,
      }),
    ).toBe("Go to Match");
  });

  it('returns "Respond" when actions are required', () => {
    expect(
      deriveContinueLabel({ season, continueDisabled: false, actionRequired: 1 }),
    ).toBe("Respond");
  });

  it('returns "Respond" for multiple outstanding actions', () => {
    expect(
      deriveContinueLabel({ season, continueDisabled: false, actionRequired: 5 }),
    ).toBe("Respond");
  });

  it('returns "Continue" when disabled even with actions', () => {
    expect(
      deriveContinueLabel({ season, continueDisabled: true, actionRequired: 3 }),
    ).toBe("Continue");
  });
});