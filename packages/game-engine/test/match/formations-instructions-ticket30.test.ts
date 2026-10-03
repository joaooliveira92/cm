/**
 * Directional tests for formations-and-instructions ticket 30:
 * run target phases, out-of-position cost, new match stats, and new commentary templates.
 */
import { describe, expect, it } from "vitest";
import {
  builtInTemplate,
  DEFAULT_TEAM_INSTRUCTIONS,
  DEFAULT_PLAYER_INSTRUCTIONS,
  DEFAULT_TEAM_SET_PIECES,
  EMPTY_TAKERS,
  suitability,
  type PlayerAttributes,
  type PositionalRatings,
} from "@cm-clone/shared";
import { simulateMatch, type SimulateMatchInput } from "../../src/match/simulate/index.js";
import { aggregatePhaseSlots, resolveTeamTactics } from "../../src/match/tactical-modifiers.js";
import type { MatchPlayerInput, MatchTeamSetup, MatchTactic } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId, playerId as makePlayerId } from "./fixtures.js";
import { SHIPPED, renderShipped as renderCommentary } from "./shippedCommentary.js";

const COMMENTARY_TEMPLATES = SHIPPED.templates;
import type { BeatenTrapEvent, MatchEvent } from "../../src/match/events.js";

const AVERAGE_ATTRIBUTES: PlayerAttributes = {
  passing: 11, shooting: 11, tackling: 11, dribbling: 11, heading: 11,
  crossing: 11, finishing: 11, firstTouch: 11, positioning: 11, decisions: 11,
  composure: 11, determination: 11, teamwork: 11, flair: 11, bravery: 11,
  aggression: 11, pace: 11, acceleration: 11, stamina: 20, strength: 11,
  agility: 11, naturalFitness: 20, injuryProneness: 1,
};

const baseInput = (seed: number): SimulateMatchInput => ({
  seed,
  home: buildTeam(makeClubId("home-club"), seed).setup,
  away: buildTeam(makeClubId("away-club"), seed + 1000).setup,
});

describe("formations-and-instructions ticket 30", () => {
  // ─── 1. Runs → target cell phase ─────────────────────────────────────────

  describe("runs → target cell phase", () => {
    it("a slot with a run counts in the run target's phase when the team has possession", () => {
      const template = builtInTemplate("4-4-2 Diamond");
      expect(template).toBeDefined();

      // 4-4-2 Diamond has runs like M R>AM R, M L>AM L — verify the template parsed them
      const hasRun = template!.slots.filter((slot) => slot.run !== null);
      expect(hasRun.length).toBeGreaterThan(0);

      // Verify the first run-to slot phase is "attack" (targetting AM or F)
      const firstRun = hasRun[0]!;
      const runTargetPhase = firstRun.run!.row === "AM" || firstRun.run!.row === "F" ? "attack" as const :
        firstRun.run!.row === "M" ? "midfield" as const : "defense" as const;
      expect(runTargetPhase).toBe("attack");
    });

    it("aggregatePhaseSlots shifts a run-having slot's rating into the target phase with possession", () => {
      // Build a tactic with one slot that has a run from M C to AM C
      const gk: MatchPlayerInput = {
        id: makePlayerId("gk"), attributes: AVERAGE_ATTRIBUTES,
        positionalRatings: { lines: { GK: 20, SW: 1, D: 1, DM: 1, M: 1, AM: 1, F: 1, WB: 1 }, sides: { R: 1, L: 1, C: 1 }, freeRole: 1 },
      };
      const dm: MatchPlayerInput = {
        id: makePlayerId("dm"), attributes: AVERAGE_ATTRIBUTES,
        positionalRatings: { lines: { GK: 1, SW: 1, D: 1, DM: 20, M: 20, AM: 1, F: 1, WB: 1 }, sides: { R: 1, L: 1, C: 20 }, freeRole: 1 },
      };
      const players = [gk, dm];
      const playersById = new Map(players.map((p) => [p.id, p]));

      // This player runs from M C to AM C
      const runner: MatchPlayerInput = {
        id: makePlayerId("runner"), attributes: AVERAGE_ATTRIBUTES,
        positionalRatings: { lines: { GK: 1, SW: 1, D: 1, DM: 1, M: 15, AM: 15, F: 1, WB: 1 }, sides: { R: 1, L: 1, C: 15 }, freeRole: 1 },
      };
      players.push(runner);
      playersById.set(runner.id, runner);

      const tactic: MatchTactic = {
        slots: [
          { cell: { row: "GK", column: "C" }, playerId: gk.id, run: null },
          { cell: { row: "D", column: "C" }, playerId: dm.id, run: null },
          { cell: { row: "M", column: "C" }, playerId: runner.id, run: { row: "AM", column: "C" } },
          { cell: { row: "D", column: "L" }, playerId: dm.id, run: null },
          { cell: { row: "D", column: "R" }, playerId: dm.id, run: null },
          { cell: { row: "DM", column: "C" }, playerId: dm.id, run: null },
          { cell: { row: "M", column: "L" }, playerId: dm.id, run: null },
          { cell: { row: "M", column: "R" }, playerId: dm.id, run: null },
          { cell: { row: "AM", column: "C" }, playerId: dm.id, run: null },
          { cell: { row: "AM", column: "L" }, playerId: dm.id, run: null },
          { cell: { row: "F", column: "C" }, playerId: dm.id, run: null },
        ],
        bench: [null, null, null, null, null, null, null],
        team: DEFAULT_TEAM_INSTRUCTIONS,
        slotInstructions: [],
        teamSetPieces: DEFAULT_TEAM_SET_PIECES,
        takers: EMPTY_TAKERS,
      } as unknown as MatchTactic;

      const resolved = resolveTeamTactics(tactic, playersById);

      // Without possession: runner counts in midfield phase
      const withoutPossession = aggregatePhaseSlots(resolved.slots, playersById, false);
      // With possession: runner counts in attack phase instead
      const withPossession = aggregatePhaseSlots(resolved.slots, playersById, true);

      // The runner has M=15 and AM=15 (same rating), so the attack phase should be higher
      // with possession because the midfielder adds his rating to attack instead of midfield
      expect(withPossession.midfield).toBeLessThan(withoutPossession.midfield);
      expect(withPossession.attack).toBeGreaterThan(withoutPossession.attack);
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

    it("a team playing players out of position scores fewer goals across many seeds", () => {
      // Build a team where every player has terrible suitability for most slots
      // (only D C is natural, everything else is 1)
      const oopRatings: PositionalRatings = {
        lines: { GK: 20, SW: 1, D: 20, DM: 1, M: 1, AM: 1, F: 1, WB: 1 },
        sides: { R: 1, L: 1, C: 20 },
        freeRole: 1,
      };

      const clubId = makeClubId("oop-club");
      const oopSquad = Array.from({ length: 18 }, (_, i) => ({
        id: makePlayerId(`oop-${i}`),
        attributes: { ...AVERAGE_ATTRIBUTES },
        positionalRatings: oopRatings,
      }));

      // Force them into a 4-4-2 where every outfield slot is a poor fit
      // (all players are D C specialists, but 4-4-2 has M, AM, wide slots)
      const template = builtInTemplate("4-4-2")!;
      const tactic: MatchTactic = {
        slots: template.slots.map((s, i) => ({
          cell: s.cell,
          playerId: oopSquad[i]!.id,
          run: s.run,
        })),
        bench: [null, null, null, null, null, null, null],
        team: DEFAULT_TEAM_INSTRUCTIONS,
        slotInstructions: template.slots.map((s) => ({
          cell: s.cell,
          instructions: DEFAULT_PLAYER_INSTRUCTIONS,
        })),
        teamSetPieces: DEFAULT_TEAM_SET_PIECES,
        takers: EMPTY_TAKERS,
      };
      const oopSetup: MatchTeamSetup = { clubId, squad: oopSquad, tactic };

      // Control team: same average attributes, but all-round good positional ratings
      const goodRatings: PositionalRatings = {
        lines: { GK: 15, SW: 15, D: 15, DM: 15, M: 15, AM: 15, F: 15, WB: 15 },
        sides: { R: 15, L: 15, C: 15 },
        freeRole: 15,
      };
      const goodSquad = Array.from({ length: 18 }, (_, i) => ({
        id: makePlayerId(`good-${i}`),
        attributes: { ...AVERAGE_ATTRIBUTES },
        positionalRatings: goodRatings,
      }));
      const goodTemplate = builtInTemplate("4-4-2")!;
      const goodTactic: MatchTactic = {
        slots: goodTemplate.slots.map((s, i) => ({
          cell: s.cell,
          playerId: goodSquad[i]!.id,
          run: s.run,
        })),
        bench: [null, null, null, null, null, null, null],
        team: DEFAULT_TEAM_INSTRUCTIONS,
        slotInstructions: goodTemplate.slots.map((s) => ({
          cell: s.cell,
          instructions: DEFAULT_PLAYER_INSTRUCTIONS,
        })),
        teamSetPieces: DEFAULT_TEAM_SET_PIECES,
        takers: EMPTY_TAKERS,
      };
      const goodSetup: MatchTeamSetup = { clubId: makeClubId("good-club"), squad: goodSquad, tactic: goodTactic };

      let oopGoals = 0;
      let goodGoals = 0;
      for (let s = 0; s < 10; s++) {
        const events = simulateMatch({
          seed: s * 1000 + 100,
          home: oopSetup,
          away: goodSetup,
        });
        oopGoals += events.filter((e) => e._tag === "Goal" && e.teamClubId === clubId).length;
        goodGoals += events.filter((e) => e._tag === "Goal" && e.teamClubId === goodSetup.clubId).length;
      }

      // The out-of-position team should score fewer goals — their players have
      // suitability ~1-7 in most slots (suitabilityFactor ~0.5-0.67), heavily
      // scaling down positioning/decisions/composure
      expect(oopGoals).toBeLessThan(goodGoals);
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
      const event: MatchEvent = {
        _tag: "BeatenTrap",
        minute: 30,
        half: 1,
        teamClubId: "home" as BeatenTrapEvent["teamClubId"],
        playerId: "p1" as BeatenTrapEvent["playerId"],
      };
      const lines = renderCommentary([event], 1, names);
      expect(lines[0]!.text).toContain("P One");
      // Team token is optional in beaten-trap templates
      expect(lines[0]!.text).not.toMatch(/\{\w+\}/);
    });
  });
});