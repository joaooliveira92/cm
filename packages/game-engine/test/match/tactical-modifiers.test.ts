import { describe, expect, it } from "vitest";
import { builtInTemplate, DEFAULT_PLAYER_INSTRUCTIONS, DEFAULT_TEAM_SET_PIECES, EMPTY_TAKERS, tacticFromTemplate } from "@cm-clone/shared";
import { computePhaseStrengths, resolveTacticalModifiers } from "../../src/match/tactical-modifiers.js";
import { toMatchTactic } from "../../src/match/types.js";
import { buildTeam, clubId as makeClubId, playerId } from "./fixtures.js";

describe("computePhaseStrengths", () => {
  it("computes a positive rating for all three phases from a full XI", () => {
    const team = buildTeam(makeClubId("home"), 1);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const strengths = computePhaseStrengths(team.setup.tactic, playersById);
    expect(strengths.attack).toBeGreaterThan(0);
    expect(strengths.midfield).toBeGreaterThan(0);
    expect(strengths.defense).toBeGreaterThan(0);
  });

  it("excludes a player who is no longer on the pitch (e.g. sent off)", () => {
    const team = buildTeam(makeClubId("home"), 2);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const fullOnPitch = new Set(team.setup.tactic.slots.map((s) => s.playerId));
    const withoutOne = new Set(fullOnPitch);
    const removed = team.setup.tactic.slots.find((s) => s.cell.row === "D" && s.cell.column === "RC")!.playerId;
    withoutOne.delete(removed);

    const full = computePhaseStrengths(team.setup.tactic, playersById, fullOnPitch);
    const reduced = computePhaseStrengths(team.setup.tactic, playersById, withoutOne);
    expect(reduced.defense).not.toBe(full.defense);
  });
});

describe("resolveTacticalModifiers", () => {
  it("applies the attacking mentality's boosted attack / reduced defense multipliers", () => {
    const team = buildTeam(makeClubId("home"), 3);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const attacking = resolveTacticalModifiers(
      { ...team.setup.tactic, team: { ...team.setup.tactic.team, mentality: "attacking" } },
      playersById,
    );
    const defensive = resolveTacticalModifiers(
      { ...team.setup.tactic, team: { ...team.setup.tactic.team, mentality: "defensive" } },
      playersById,
    );
    expect(attacking.attack).toBeGreaterThan(defensive.attack);
    expect(attacking.defense).toBeLessThan(defensive.defense);
  });

  it("keeps event-odds bias fixed at 0 for v1", () => {
    const team = buildTeam(makeClubId("home"), 4);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const modifiers = resolveTacticalModifiers(team.setup.tactic, playersById);
    expect(modifiers.eventOddsBias).toBe(0);
  });

  it("leaves every phase multiplier at exactly 1 under the normal mentality (no Role bump, no Tempo or Pressing)", () => {
    const team = buildTeam(makeClubId("home"), 5);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const modifiers = resolveTacticalModifiers({ ...team.setup.tactic, team: { ...team.setup.tactic.team, mentality: "normal" } }, playersById);
    expect(modifiers).toEqual({ attack: 1, midfield: 1, defense: 1, eventOddsBias: 0 });
  });

  it("orders the five mentalities from ultra defensive to gung ho on attack and the reverse on defence", () => {
    const team = buildTeam(makeClubId("home"), 6);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const ladder = (["ultraDefensive", "defensive", "normal", "attacking", "gungHo"] as const).map((mentality) =>
      resolveTacticalModifiers({ ...team.setup.tactic, team: { ...team.setup.tactic.team, mentality } }, playersById),
    );
    for (let step = 1; step < ladder.length; step++) {
      expect(ladder[step]!.attack).toBeGreaterThan(ladder[step - 1]!.attack);
      expect(ladder[step]!.defense).toBeLessThan(ladder[step - 1]!.defense);
    }
  });

  it("rates a slot at its cell: the same player scores differently in a defensive and an attacking cell", () => {
    const team = buildTeam(makeClubId("home"), 8);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const player = team.setup.tactic.slots[5]!.playerId;
    const at = (row: "D" | "F") =>
      computePhaseStrengths(
        { ...team.setup.tactic, slots: [{ playerId: player, cell: { row, column: "C" }, run: null, instructions: { ...DEFAULT_PLAYER_INSTRUCTIONS } }] },
        playersById,
      );
    expect(at("D").defense).toBeGreaterThan(0);
    expect(at("D").attack).toBe(0);
    expect(at("F").attack).toBeGreaterThan(0);
    expect(at("F").defense).toBe(0);
  });
});

describe("toMatchTactic", () => {
  it("keeps who starts where, the bench, the team instructions and each slot's instructions", () => {
    const players = Array.from({ length: 18 }, (_, i) => playerId(`p${i}`));
    const tactic = tacticFromTemplate(builtInTemplate("4-3-3")!, players.slice(0, 11), players.slice(11));
    const complete = { ...tactic, team: { ...tactic.team, mentality: "gungHo", passing: "long", offsideTrap: true } } as const;
    const adapted = toMatchTactic(complete);
    expect(adapted.team.mentality).toBe("gungHo");
    expect(adapted.slots.map((slot) => slot.playerId)).toEqual(players.slice(0, 11));
    expect(adapted.slots.map((slot) => slot.cell)).toEqual(tactic.slots.map((slot) => slot.cell));
    expect(adapted.slots.map((slot) => slot.instructions)).toEqual(tactic.slots.map((slot) => slot.instructions));
    expect(adapted.bench).toEqual(players.slice(11));
    // The new fields get their defaults since the adapter input omits them
    expect(adapted.teamSetPieces).toEqual(DEFAULT_TEAM_SET_PIECES);
    expect(adapted.takers).toEqual(EMPTY_TAKERS);
    expect(Object.keys(adapted).sort()).toEqual(["bench", "slots", "takers", "team", "teamSetPieces"]);
  });
});