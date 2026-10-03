import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it as effectIt } from "@effect/vitest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClubId, PitchSlotView, PlayerId, type PitchSlotView as PitchSlot } from "@cm-clone/contracts";
import { pitchBeforeEachEvent, type MatchEvent, type MatchTeamSetup, type PersistedForcedOff } from "@cm-clone/game-engine";
import { MATCH_RATING_BASE } from "@cm-clone/shared";
import { Effect } from "effect";
import { getMatchRatings, resumeSimulation } from "../../../src/main/match/index.js";
import { rateSide } from "../../../src/main/match/ratings.js";
import { atFirstFixture, startSeededMatch } from "./seededMatch.js";

/**
 * group-g-match-day ticket 10: the fold from a stored timeline to each participant's Match Rating. The
 * formula itself is `packages/shared/test/rules/matchRating.test.ts`; this pins who is rated, and
 * what counts for whom, over hand-built timelines.
 */

const HOME = ClubId.make("home");
const AWAY = ClubId.make("away");
const pid = (id: string) => PlayerId.make(id);
const setup = { clubId: HOME } as unknown as MatchTeamSetup;
const name = (id: string) => `Player ${id}`;

const slot = (playerId: string, position: PitchSlot["position"]) => new PitchSlotView({ playerId: pid(playerId), position });

const KICKOFF = [slot("gk", "GK"), slot("dc", "DC"), slot("st", "ST")];

const started: MatchEvent = { _tag: "MatchStarted", seed: 1, homeClubId: HOME, awayClubId: AWAY };
const goal = (minute: number, teamClubId: ClubId, playerId: string, homeScore: number, awayScore: number): MatchEvent => ({
  _tag: "Goal",
  minute,
  half: minute <= 45 ? 1 : 2,
  teamClubId,
  playerId: pid(playerId),
  homeScore,
  awayScore,
  chanceType: "throughBall",
});
const fullTime = (homeScore: number, awayScore: number): MatchEvent => ({ _tag: "FullTimeWhistle", minute: 90, homeScore, awayScore });

const rowOf = (rows: ReturnType<typeof rateSide>, id: string) => rows.find((row) => row.playerId === pid(id));

describe("rateSide", () => {
  it("rates only players who were on the pitch, kickoff eleven first, then whoever came on", () => {
    const events: Array<MatchEvent> = [
      started,
      { _tag: "Substitution", minute: 60, half: 2, teamClubId: HOME, outPlayerId: pid("st"), inPlayerId: pid("sub"), forcedByInjury: false },
      fullTime(0, 0),
    ];
    const afterSub = [slot("gk", "GK"), slot("dc", "DC"), slot("sub", "ST")];
    const pitches = [KICKOFF, KICKOFF, afterSub, afterSub];
    const rows = rateSide(setup, events, pitches, events.length, true, name);

    expect(rows.map((row) => row.playerId)).toEqual(["gk", "dc", "st", "sub"].map(pid));
    expect(rowOf(rows, "sub")).toMatchObject({ started: false, cameOnMinute: 60, wentOffMinute: null, position: "ST" });
    expect(rowOf(rows, "st")).toMatchObject({ started: true, cameOnMinute: null, wentOffMinute: 60 });
  });

  it("charges a goal against only the players on the pitch when it went in", () => {
    const events: Array<MatchEvent> = [
      started,
      goal(20, AWAY, "a9", 0, 1),
      { _tag: "Substitution", minute: 46, half: 2, teamClubId: HOME, outPlayerId: pid("gk"), inPlayerId: pid("gk2"), forcedByInjury: false },
      fullTime(0, 1),
    ];
    const afterSub = [slot("gk2", "GK"), slot("dc", "DC"), slot("st", "ST")];
    const pitches = [KICKOFF, KICKOFF, KICKOFF, afterSub, afterSub];
    const rows = rateSide(setup, events, pitches, events.length, true, name);

    // Both keepers lost, but only the first let a goal in; the second came on and kept the rest out.
    expect(rowOf(rows, "gk")!.rating).toBeLessThan(rowOf(rows, "gk2")!.rating);
  });

  it("shows a sending-off explicitly and marks it down", () => {
    const events: Array<MatchEvent> = [
      started,
      { _tag: "RedCard", minute: 30, half: 1, teamClubId: HOME, playerId: pid("dc") },
      fullTime(0, 0),
    ];
    const tenMen = [slot("gk", "GK"), slot("st", "ST")];
    const rows = rateSide(setup, events, [KICKOFF, KICKOFF, tenMen, tenMen], events.length, true, name);

    expect(rowOf(rows, "dc")).toMatchObject({ sentOff: true, wentOffMinute: 30 });
    expect(rowOf(rows, "dc")!.rating).toBeLessThan(MATCH_RATING_BASE);
  });

  it("counts nothing past a live cut", () => {
    const events: Array<MatchEvent> = [started, goal(10, HOME, "st", 1, 0), goal(70, HOME, "st", 2, 0), fullTime(2, 0)];
    const pitches = [KICKOFF, KICKOFF, KICKOFF, KICKOFF, KICKOFF];
    const live = rateSide(setup, events, pitches, 2, true, name);
    const full = rateSide(setup, events, pitches, events.length, true, name);

    expect(rowOf(live, "st")!.rating).toBeLessThan(rowOf(full, "st")!.rating);
  });

  it("rates the away side from its own point of view", () => {
    const events: Array<MatchEvent> = [started, goal(10, HOME, "h9", 1, 0), fullTime(1, 0)];
    const awaySetup = { clubId: AWAY } as unknown as MatchTeamSetup;
    const pitches = [KICKOFF, KICKOFF, KICKOFF, KICKOFF];
    const asAway = rateSide(awaySetup, events, pitches, events.length, false, name);
    const asHome = rateSide(setup, events, pitches, events.length, true, name);

    expect(rowOf(asAway, "gk")!.rating).toBeLessThan(rowOf(asHome, "gk")!.rating);
  });
});

/** A real kickoff setup for `pitchBeforeEachEvent`: three starters and two named substitutes. */
const kickoffSetup = {
  clubId: HOME,
  squad: ["gk", "dc", "st", "bench1", "bench2"].map((id) => ({ id: pid(id) })),
  tactic: {
    slots: [
      { playerId: pid("gk"), cell: { row: "GK", column: "C" } },
      { playerId: pid("dc"), cell: { row: "D", column: "C" } },
      { playerId: pid("st"), cell: { row: "F", column: "C" } },
    ],
    bench: [pid("bench1"), pid("bench2")],
  },
} as unknown as MatchTeamSetup;

const rateThroughPitch = (events: ReadonlyArray<MatchEvent>, forceOffs: ReadonlyArray<PersistedForcedOff> = []) =>
  rateSide(kickoffSetup, events, pitchBeforeEachEvent(kickoffSetup, events, forceOffs), events.length, true, name, forceOffs);

describe("rateSide over pitchBeforeEachEvent", () => {
  it("leaves a named substitute who never came on unrated", () => {
    const rows = rateThroughPitch([started, fullTime(0, 0)]);
    expect(rows.map((row) => row.playerId)).toEqual(["gk", "dc", "st"].map(pid));
  });

  it("marks a player injured off at the forced substitution that replaced them", () => {
    const events: Array<MatchEvent> = [
      started,
      { _tag: "Injury", minute: 40, half: 1, teamClubId: HOME, playerId: pid("dc"), trigger: "contact", severity: "severe", tier: "red", type: "hamstring" },
      { _tag: "Substitution", minute: 40, half: 1, teamClubId: HOME, outPlayerId: pid("dc"), inPlayerId: pid("bench1"), forcedByInjury: true },
      fullTime(0, 0),
    ];
    const rows = rateThroughPitch(events);
    expect(rowOf(rows, "dc")).toMatchObject({ injured: true, wentOffMinute: 40, sentOff: false });
    expect(rowOf(rows, "bench1")).toMatchObject({ started: false, cameOnMinute: 40, position: "DC" });
  });

  it("moves an outfield stand-in into goal without calling them a substitute", () => {
    const events: Array<MatchEvent> = [
      started,
      { _tag: "RedCard", minute: 50, half: 2, teamClubId: HOME, playerId: pid("gk") },
      { _tag: "Substitution", minute: 50, half: 2, teamClubId: HOME, outPlayerId: pid("gk"), inPlayerId: pid("dc"), forcedByInjury: true },
      fullTime(0, 0),
    ];
    const rows = rateThroughPitch(events);
    expect(rowOf(rows, "gk")).toMatchObject({ sentOff: true, wentOffMinute: 50 });
    expect(rowOf(rows, "dc")).toMatchObject({ started: true, cameOnMinute: null, position: "GK" });
  });

  it("dates a bring-off, which leaves no event, by its journaled minute", () => {
    const events: Array<MatchEvent> = [started, goal(20, HOME, "st", 1, 0), goal(80, HOME, "dc", 2, 0), fullTime(2, 0)];
    const broughtOff: PersistedForcedOff = { _tag: "ForceOffMade", minute: 55, isHalftime: false, clubId: HOME, playerId: pid("st") };
    const rows = rateThroughPitch(events, [broughtOff]);
    expect(rowOf(rows, "st")).toMatchObject({ wentOffMinute: 55 });
  });
});

describe("getMatchRatings over a seeded match", () => {
  let savesDir: string;
  beforeEach(() => {
    savesDir = mkdtempSync(path.join(os.tmpdir(), "cm-clone-ratings-"));
  });
  afterEach(() => rm(savesDir, { recursive: true, force: true }));

  effectIt.effect("rates the eleven who started plus everyone who came on, each within 1–10, and a live cut agrees with it so far", () =>
    Effect.gen(function* () {
      const { save, fixtureId } = yield* atFirstFixture(savesDir);
      const match = yield* startSeededMatch(savesDir, save.id, fixtureId, 7);
      let cursor = 0;
      let complete = false;
      while (!complete) {
        // oxlint-disable-next-line no-await-in-loop -- sequential by design: each chunk starts at the last cursor
        const chunk = yield* resumeSimulation(savesDir, save.id, match.matchId, cursor, null);
        cursor = chunk.cursor;
        complete = chunk.isComplete;
      }

      const full = (yield* getMatchRatings(savesDir, save.id, match.matchId, null))!;
      expect(full.throughMinute).toBeNull();
      for (const side of [full.home, full.away]) {
        expect(side.filter((row) => row.started)).toHaveLength(11);
        expect(side.filter((row) => !row.started).every((row) => row.cameOnMinute !== null)).toBe(true);
        for (const row of side) {
          expect(row.rating).toBeGreaterThanOrEqual(1);
          expect(row.rating).toBeLessThanOrEqual(10);
          expect(Math.round(row.rating * 10) / 10).toBe(row.rating);
        }
      }

      // At kickoff nothing has happened yet: the eleven are rated, nobody else, and everyone at the base.
      const atKickoff = (yield* getMatchRatings(savesDir, save.id, match.matchId, 1))!;
      expect(atKickoff.home.map((row) => row.playerId)).toEqual(full.home.filter((row) => row.started).map((row) => row.playerId));
      expect(new Set(atKickoff.home.map((row) => row.rating))).toEqual(new Set([MATCH_RATING_BASE]));

      // With no match id, the read resolves nothing until a match has been played and committed.
      expect(yield* getMatchRatings(savesDir, save.id, null, null)).toBeNull();
    }),
  );
});
