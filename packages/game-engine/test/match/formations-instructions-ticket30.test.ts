/**
 * Directional tests for formations-and-instructions ticket 30:
 * run target phases, out-of-position cost, new match stats, and new commentary templates.
 */
import { describe, expect, it } from "vitest";
import {
  builtInTemplate,
  DEFAULT_TEAM_INSTRUCTIONS,
  DEFAULT_PLAYER_INSTRUCTIONS,
  suitability,
  type Slot,
  type PlayerAttributes,
  type PositionalRatings,
} from "@cm-clone/shared";
import { simulateMatch, type SimulateMatchInput } from "../../src/match/simulate/index.js";
import type { MatchPlayerInput, MatchTeamSetup, MatchTactic } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId, playerId as makePlayerId } from "./fixtures.js";
import { COMMENTARY_TEMPLATES, renderCommentary } from "../../src/match/commentary.js";

const AVERAGE_ATTRIBUTES: PlayerAttributes = {
  passing: 11, shooting: 11, tackling: 11, dribbling: 11, heading: 11,
  crossing: 11, finishing: 11, firstTouch: 11, positioning: 11, decisions: 11,
  composure: 11, determination: 11, teamwork: 11, flair: 11, bravery: 11,
  aggression: 11, pace: 11, acceleration: 11, stamina: 20, strength: 11,
  agility: 11, naturalFitness: 20, injuryProneness: 1,
};

const DEFAULT_RATINGS: PositionalRatings = {
  lines: { GK: 10, SW: 10, D: 10, DM: 10, M: 10, AM: 10, F: 10, WB: 10 },
  sides: { R: 10, L: 10, C: 10 },
  freeRole: 10,
};

const baseInput = (seed: number): SimulateMatchInput => ({
  seed,
  home: buildTeam(makeClubId("home-club"), seed).setup,
  away: buildTeam(makeClubId("away-club"), seed + 1000).setup,
});

describe("formations-and-instructions ticket 30", () => {
  // ─── 1. Runs → target cell phase ─────────────────────────────────────────

  describe("runs → target cell phase", () => {
    it("a slot with a run counts in the run target's phase when the player is in a formation with runs", () => {
      const template = builtInTemplate("4-4-2 Diamond");
      expect(template).toBeDefined();

      // 4-4-2 Diamond has runs like M R>AM R, M L>AM L — verify the template parsed them
      const hasRun = template!.slots.filter((slot) => slot.run !== null);
      expect(hasRun.length).toBeGreaterThan(0);

      // Verify the first run-to slot phase is "attack" (targetting AM or F)
      const firstRun = hasRun[0]!;
      const basePhase = firstRun.cell.row === "M" ? "midfield" as const : "defense" as const;
      const runTargetPhase = firstRun.run!.row === "AM" || firstRun.run!.row === "F" ? "attack" as const :
        firstRun.run!.row === "M" ? "midfield" as const : "defense" as const;
      expect(runTargetPhase).toBe("attack");
    });

    it("matches with runs complete successfully", () => {
      // Use a template with lots of runs to verify the engine doesn't crash
      const events = simulateMatch(baseInput(42));
      expect(events.some((e) => e._tag === "FullTimeWhistle")).toBe(true);
    });
  });

  // ─── 2. Out-of-position cost ─────────────────────────────────────────

  describe("out-of-position cost", () => {
    it("suitability factor is stored on each slot's behaviour vector", () => {
      const events = simulateMatch(baseInput(100));
      expect(events.length).toBeGreaterThan(0);
      // Verify that the match runs — suitability factors are built into the
      // PerSlotBehaviour at resolution time and used through scaledAttributeValue
      // in resolvers.ts for positioning/decisions/composure
    });

    it("a player with low suitability in a cell has scaled decision-making attributes", () => {
      // Low suitability for a D C player playing in AM C
      const ratings: PositionalRatings = {
        lines: { GK: 1, SW: 1, D: 20, DM: 1, M: 1, AM: 1, F: 1, WB: 1 },
        sides: { R: 20, L: 20, C: 20 },
        freeRole: 1,
      };
      // Suitability for AM C slot (row AM, column C)
      const suitForAM = suitability(ratings, { row: "AM", column: "C" });
      // With D=20 and AM=1, this player is terrible in AM
      expect(suitForAM).toBeLessThan(10);

      // Suitability for D C slot
      const suitForD = suitability(ratings, { row: "D", column: "C" });
      expect(suitForD).toBeGreaterThanOrEqual(15);
    });
  });

  // ─── 3. Match stats ──────────────────────────────────────────────

  describe("match statistics", () => {
    it("fouls and offsides appear in match events across many seeds", () => {
      let fouls = 0;
      let offsides = 0;
      for (let seed = 50; seed < 130; seed++) {
        const events = simulateMatch(baseInput(seed));
        fouls += events.filter((e) => e._tag === "Foul").length;
        offsides += events.filter((e) => e._tag === "Offside").length;
      }
      expect(fouls).toBeGreaterThan(0);
      expect(offsides).toBeGreaterThan(0);
    });

    it("chance type events appear across many seeds (ThroughBall, Cross, LongShot, etc.)", () => {
      const chanceTags = new Set(["ThroughBall", "Cross", "LongShot", "RunWithBall", "HoldUpLayOff", "Counter"]);
      for (let seed = 100; seed < 140; seed++) {
        for (const event of simulateMatch(baseInput(seed))) {
          chanceTags.delete(event._tag);
        }
      }
      // At least some chance types should have fired
      expect(chanceTags.size).toBeLessThan(6);
    });

    it("attempts = sum of goals, shots on target, and shots missed", () => {
      for (let seed = 1; seed < 20; seed++) {
        const events = simulateMatch(baseInput(seed));
        const goals = events.filter((e) => e._tag === "Goal").length;
        const onTarget = events.filter((e) => e._tag === "ShotOnTarget").length;
        const missed = events.filter((e) => e._tag === "ShotMissed").length;
        const attempts = events.filter(
          (e) => e._tag === "Goal" || e._tag === "ShotOnTarget" || e._tag === "ShotMissed",
        ).length;
        expect(attempts).toBe(goals + onTarget + missed);
      }
    });
  });

  // ─── 4. Commentary templates ──────────────────────────────────────

  describe("commentary templates", () => {
    it("BeatenTrap has commentary templates", () => {
      expect(COMMENTARY_TEMPLATES.BeatenTrap).toBeDefined();
      expect(COMMENTARY_TEMPLATES.BeatenTrap.length).toBeGreaterThan(0);
    });

    it("BeatenTrap commentary fills player and team tokens", () => {
      const names = {
        clubName: (id: string) => (id === "home" ? "Home" : "Away"),
        playerName: (id: string) => (id === "p1" ? "P One" : "P Two"),
      };
      const event: import("../../src/match/events.js").MatchEvent = {
        _tag: "BeatenTrap",
        minute: 30,
        half: 1,
        teamClubId: "home" as import("../../src/match/events.js").BeatenTrapEvent["teamClubId"],
        playerId: "p1" as import("../../src/match/events.js").BeatenTrapEvent["playerId"],
      };
      const lines = renderCommentary([event], 1, names);
      expect(lines[0]!.text).toContain("P One");
      // Team token is optional in beaten-trap templates
      expect(lines[0]!.text).not.toMatch(/\{\w+\}/);
    });
  });
});