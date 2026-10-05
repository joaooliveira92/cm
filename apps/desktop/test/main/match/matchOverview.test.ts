import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it as effectIt } from "@effect/vitest";
import { ClubId, MatchFixturePanel, MatchId, PlayerId } from "@cm-clone/contracts";
import type { MatchEvent, PersistedMatchStarted } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { getMatchOverview, matchOverviewView } from "../../../src/main/match/matchOverview.js";
import { resumeSimulation } from "../../../src/main/match/index.js";
import type { StreamEvent } from "../../../src/main/season/decider.js";
import { revealed } from "./revealedEvents.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

const HOME = ClubId.make("home");
const AWAY = ClubId.make("away");
const p = (id: string) => PlayerId.make(id);
const nameOf = (id: PlayerId) => `Player ${id}`;
const clubName = (id: string) => id;

const started = {
  seed: 1,
  homeClubId: HOME,
  awayClubId: AWAY,
  homeSetup: { tactic: { slots: [] }, squad: [] },
  awaySetup: { tactic: { slots: [] }, squad: [] },
} as unknown as PersistedMatchStarted;

const stream: ReadonlyArray<StreamEvent> = [{ tag: "MatchStarted", payload: started }] as unknown as ReadonlyArray<StreamEvent>;

const fixture = new MatchFixturePanel({ competitionName: "League", round: 12, gameDate: "2026-08-01", venue: "Park, Town" });

const at = (minute: number, tag: string, teamClubId: ClubId, playerId: string, extra: Record<string, unknown> = {}): MatchEvent =>
  ({ _tag: tag, minute, half: minute <= 45 ? 1 : 2, teamClubId, playerId: p(playerId), ...extra }) as unknown as MatchEvent;

const matchStarted: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: HOME, awayClubId: AWAY };

const view = (events: ReadonlyArray<MatchEvent>, revealedEvents: number | null = null) =>
  matchOverviewView(MatchId.make("1"), stream, events, clubName, nameOf, fixture, revealed(revealedEvents));

describe("matchOverviewView — Match Incidents folded from the timeline", () => {
  const penaltyGoal = at(12, "Penalty", HOME, "p1");
  const scored = at(12, "Goal", HOME, "p1", { homeScore: 1, awayScore: 0 });
  const second = at(70, "Goal", HOME, "p1", { homeScore: 2, awayScore: 0 });
  const awayGoal = at(80, "Goal", AWAY, "a9", { homeScore: 2, awayScore: 1 });
  const red = at(63, "RedCard", AWAY, "a4");
  const halfTime: MatchEvent = { _tag: "HalfTimeReached", minute: 45, homeScore: 1, awayScore: 0 };
  const timeline = [matchStarted, penaltyGoal, scored, red, halfTime, second, awayGoal];

  it("groups a scorer's goals on one line with every minute", () => {
    const scoredView = view(timeline);
    expect(scoredView.home.scorers).toHaveLength(1);
    expect(scoredView.home.scorers[0]!.playerName).toBe("Player p1");
    expect(scoredView.home.scorers[0]!.goals.map((goal) => goal.minute)).toEqual([12, 70]);
  });

  it("marks a penalty goal, a Goal directly after the same player's Penalty", () => {
    const scoredView = view(timeline);
    expect(scoredView.home.scorers[0]!.goals.map((goal) => goal.penalty)).toEqual([true, false]);
  });

  it("lists a red card as a sending-off in that side's column", () => {
    expect(view(timeline).away.sendOffs.map((sendOff) => sendOff.playerName)).toEqual(["Player a4"]);
  });

  it("shows the half-time score only once HalfTimeReached is revealed", () => {
    expect(view(timeline, 4).halfTimeHomeScore).toBeNull();
    expect(view(timeline, 4).halfTimeAwayScore).toBeNull();
    expect(view(timeline, 5).halfTimeHomeScore).toBe(1);
    expect(view(timeline, 5).halfTimeAwayScore).toBe(0);
  });

  it("cuts the incidents at the revealed position, so a goal is absent before it happens", () => {
    // Up to but not including the 70' goal.
    const cut = view(timeline, 5);
    expect(cut.home.scorers[0]!.goals.map((goal) => goal.minute)).toEqual([12]);
    expect(cut.away.scorers).toHaveLength(0);
    expect(cut.away.sendOffs).toHaveLength(1);
  });

  it("never draws a referee, weather or attendance", () => {
    const keys = Object.keys(view(timeline).fixture);
    expect(keys).toEqual(["competitionName", "round", "gameDate", "venue"]);
  });
});

describe("getMatchOverview over a seeded match", () => {
  effectIt.effect("reconciles the scorers with the committed score and carries the fixture", () =>
    Effect.gen(function* () {
      const savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-overview-"));
      const { save, fixtureId } = yield* atFirstFixture(savesDir);
      const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);
      let cursor = 0;
      let complete = false;
      let homeScore = 0;
      let awayScore = 0;
      while (!complete) {
        // oxlint-disable-next-line no-await-in-loop -- sequential by design: each chunk starts at the last cursor
        const chunk = yield* resumeSimulation(savesDir, save.id, match.matchId, cursor, null);
        cursor = chunk.cursor;
        complete = chunk.isComplete;
        homeScore = chunk.homeScore;
        awayScore = chunk.awayScore;
      }

      const full = (yield* getMatchOverview(savesDir, save.id, match.matchId, null))!;
      const homeGoals = full.home.scorers.reduce((total, scorer) => total + scorer.goals.length, 0);
      const awayGoals = full.away.scorers.reduce((total, scorer) => total + scorer.goals.length, 0);
      expect(homeGoals).toBe(homeScore);
      expect(awayGoals).toBe(awayScore);
      expect(full.fixture.competitionName.length).toBeGreaterThan(0);
      expect(full.fixture.round).toBeGreaterThanOrEqual(1);
      expect(full.fixture.venue).toContain(",");

      const atKickoff = (yield* getMatchOverview(savesDir, save.id, match.matchId, revealed(1)))!;
      expect(atKickoff.home.scorers).toHaveLength(0);
      expect(atKickoff.away.scorers).toHaveLength(0);
      expect(atKickoff.halfTimeHomeScore).toBeNull();

      expect(yield* getMatchOverview(savesDir, save.id, null, null)).toBeNull();
      yield* Effect.promise(() => rm(savesDir, { recursive: true, force: true }));
    }),
  );
});
