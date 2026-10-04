import { afterEach, describe, expect, it } from "vitest";
import { MatchId, SaveId } from "@cm-clone/contracts";
import {
  clearCommittedMatch,
  getCommittedMatch,
  setCommittedMatch,
  supersededByAwaiting,
} from "../../../src/renderer/match/session.js";

const s1 = SaveId.make("s1");
const s2 = SaveId.make("s2");

const match = (matchId = "m1") =>
  ({
    matchId: MatchId.make(matchId),
    fixtureId: 1,
    homeClubId: "home",
    homeClubName: "Home FC",
    awayClubId: "away",
    awayClubName: "Away FC",
    isHome: true,
  }) as never;

afterEach(() => {
  clearCommittedMatch(s1);
  clearCommittedMatch(s2);
});

describe("the committed-match store", () => {
  it("holds one match at a time, read back only for its own save", () => {
    setCommittedMatch(s1, match("m1"));
    expect(getCommittedMatch(s1)?.match.matchId).toBe("m1");
    expect(getCommittedMatch(s2)).toBeNull();

    setCommittedMatch(s2, match("m2"));
    expect(getCommittedMatch(s1)).toBeNull();
    expect(getCommittedMatch(s2)?.match.matchId).toBe("m2");
  });

  it("clear affects only the save it names", () => {
    setCommittedMatch(s1, match("m1"));
    clearCommittedMatch(s2);
    expect(getCommittedMatch(s1)?.match.matchId).toBe("m1");

    clearCommittedMatch(s1);
    expect(getCommittedMatch(s1)).toBeNull();
  });
});

describe("supersededByAwaiting", () => {
  const committed = { saveId: s1, match: match("m1") } as never;

  it("does not supersede while no Fixture is awaiting", () => {
    expect(supersededByAwaiting(committed, null)).toBe(false);
  });

  it("does not supersede while the season still names the committed match", () => {
    expect(supersededByAwaiting(committed, { matchId: MatchId.make("m1") })).toBe(false);
  });

  it("supersedes a different started Fixture", () => {
    expect(supersededByAwaiting(committed, { matchId: MatchId.make("m2") })).toBe(true);
  });

  it("supersedes a new Fixture whose match has not started", () => {
    expect(supersededByAwaiting(committed, { matchId: null })).toBe(true);
  });
});
