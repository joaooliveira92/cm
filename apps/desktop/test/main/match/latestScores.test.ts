import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { it as effectIt } from "@effect/vitest";
import { ClubId, CompetitionId, FixtureId, type MatchId, type SaveId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { getLatestScores, latestScoresFromRows, type LatestScoreRow } from "../../../src/main/match/latestScores.js";
import { resumeSimulation } from "../../../src/main/match/index.js";
import { commitMatchday } from "../../../src/main/season/commitMatchday.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

const club = (id: string) => ClubId.make(id);
const comp = (id: string) => CompetitionId.make(id);
const row = (overrides: Partial<Omit<LatestScoreRow, "id">> & { readonly id: number }): LatestScoreRow => ({
  competitionId: comp("league-eng-1"),
  homeClubId: club("home"),
  awayClubId: club("away"),
  homeGoals: 2,
  awayGoals: 1,
  homePenalties: null,
  awayPenalties: null,
  ...overrides,
  id: FixtureId.make(overrides.id),
});

const nameOf = (id: string) => `name:${id}`;

describe("latestScoresFromRows — grouping and the unresolved Matchday", () => {
  it("groups fixtures by competition, naming clubs and the competition", () => {
    const view = latestScoresFromRows(
      "2026-08-01",
      true,
      [
        row({ id: 1 }),
        row({ id: 2, competitionId: comp("cup-eng") }),
        row({ id: 3 }),
      ],
      nameOf,
    );
    expect(view.resolved).toBe(true);
    expect(view.groups.map((group) => group.competitionId)).toEqual(["league-eng-1", "cup-eng"]);
    expect(view.groups[0]!.fixtures.map((fixture) => fixture.id)).toEqual([1, 3]);
    expect(view.groups[0]!.competitionName).toBe("name:league-eng-1");
    expect(view.groups[0]!.fixtures[0]!.homeClubName).toBe("name:home");
  });

  it("drops every score while unresolved, so no result is revealed before the commit", () => {
    const view = latestScoresFromRows("2026-08-01", false, [row({ id: 1 })], nameOf);
    expect(view.resolved).toBe(false);
    expect(view.groups[0]!.fixtures[0]!.homeGoals).toBeNull();
    expect(view.groups[0]!.fixtures[0]!.awayGoals).toBeNull();
  });

  it("carries a drawn cup tie's shootout penalties alongside the score", () => {
    const view = latestScoresFromRows(
      "2026-08-01",
      true,
      [row({ id: 1, competitionId: comp("cup-eng"), homeGoals: 1, awayGoals: 1, homePenalties: 4, awayPenalties: 3 })],
      nameOf,
    );
    const fixture = view.groups[0]!.fixtures[0]!;
    expect(fixture.homePenalties).toBe(4);
    expect(fixture.awayPenalties).toBe(3);
  });

  it("strips penalties too while unresolved", () => {
    const view = latestScoresFromRows(
      "2026-08-01",
      false,
      [row({ id: 1, homeGoals: 1, awayGoals: 1, homePenalties: 4, awayPenalties: 3 })],
      nameOf,
    );
    expect(view.groups[0]!.fixtures[0]!.homePenalties).toBeNull();
  });
});

const drain = (savesDir: string, saveId: SaveId, matchId: MatchId) =>
  Effect.gen(function* () {
    let cursor = 0;
    let isComplete = false;
    while (!isComplete) {
      // oxlint-disable-next-line no-await-in-loop -- sequential by design: each chunk starts at the last cursor
      const chunk = yield* resumeSimulation(savesDir, saveId, matchId, cursor, null);
      cursor = chunk.cursor;
      isComplete = chunk.isComplete;
    }
  });

effectIt.effect("getLatestScores shows no scores until the result is accepted, then the other fixtures", () =>
  Effect.gen(function* () {
    const savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-latest-scores-"));
    const { save, fixtureId } = yield* atFirstFixture(savesDir);
    const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);

    // Before the user's result is accepted, the sibling fixtures are unresolved.
    const live = yield* getLatestScores(savesDir, save.id);
    expect(live.resolved).toBe(false);
    expect(live.groups.length).toBeGreaterThan(0);
    const liveFixtures = live.groups.flatMap((group) => group.fixtures);
    expect(liveFixtures.length).toBeGreaterThan(0);
    expect(liveFixtures.every((fixture) => fixture.homeGoals === null && fixture.awayGoals === null)).toBe(true);
    expect(liveFixtures.some((fixture) => fixture.id === fixtureId)).toBe(false);

    yield* drain(savesDir, save.id, match.matchId);
    yield* commitMatchday(savesDir, save.id, fixtureId);

    const post = yield* getLatestScores(savesDir, save.id);
    expect(post.resolved).toBe(true);
    const fixtures = post.groups.flatMap((group) => group.fixtures);
    expect(fixtures.some((fixture) => fixture.id === fixtureId)).toBe(false);
    expect(fixtures.every((fixture) => fixture.homeGoals !== null && fixture.awayGoals !== null)).toBe(true);
    expect(fixtures.some((fixture) => fixture.homeClubName.length > 0 && fixture.awayClubName.length > 0)).toBe(true);

    yield* Effect.promise(() => rm(savesDir, { recursive: true, force: true }));
  }),
);
