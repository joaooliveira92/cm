import { describe, expect, it } from "vitest";
import { computePhaseStrengths, resolveTacticalModifiers } from "../../src/match/tactical-modifiers.js";
import { buildTeam, clubId as makeClubId } from "./fixtures.js";

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
    const removed = team.setup.tactic.slots.find((s) => s.position === "DC")!.playerId;
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
      { ...team.setup.tactic, mentality: "attacking" },
      playersById,
    );
    const defensive = resolveTacticalModifiers(
      { ...team.setup.tactic, mentality: "defensive" },
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

  it("caps the Role Rating bump at ±0.05 on the relevant phase multiplier", () => {
    const team = buildTeam(makeClubId("home"), 5);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const modifiers = resolveTacticalModifiers(
      { ...team.setup.tactic, mentality: "balanced" },
      playersById,
    );
    expect(modifiers.midfield).toBeGreaterThanOrEqual(1 - 0.05);
    expect(modifiers.midfield).toBeLessThanOrEqual(1 + 0.05);
  });

  it("doubles the fatigue decay multiplier under High pressing", () => {
    const team = buildTeam(makeClubId("home"), 6);
    const playersById = new Map(team.squad.map((p) => [p.id, p]));
    const high = resolveTacticalModifiers({ ...team.setup.tactic, pressing: "high" }, playersById);
    const medium = resolveTacticalModifiers({ ...team.setup.tactic, pressing: "medium" }, playersById);
    expect(high.fatigueDecayMultiplier).toBe(medium.fatigueDecayMultiplier * 2);
  });
});
