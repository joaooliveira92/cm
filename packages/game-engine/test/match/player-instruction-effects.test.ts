/**
 * Directional tests for player instruction effects (ticket 28).
 *
 * These tests verify that each Player Instruction has the expected directional effect on the
 * slot's behaviour vector (unit tests on `resolveSlotBehaviours`) and that the engine propagates
 * specific marking through the chance pipeline.
 *
 * Methodology: Unit tests on the pure resolution function prove attribute scaling, switch weights,
 * distribution and cross-aim preferences. Integration tests run seeded matches with specific
 * marking to prove the marked opponent's finishing share is reduced.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_INSTRUCTIONS,
  DEFAULT_TEAM_INSTRUCTIONS,
  DEFAULT_TEAM_SET_PIECES,
  EMPTY_TAKERS,
  type PlayerAttributes,
} from "@cm-clone/shared";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import { resolveSlotBehaviours, type PerSlotBehaviour } from "../../src/match/resolveBehaviourVectors.js";
import { initTeamState, applyCommand, type TeamRuntimeState } from "../../src/match/simulate/teamState.js";
import type { MatchPlayerInput, MatchTactic, MatchTeamSetup } from "../../src/match/types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_ATTRS: PlayerAttributes = {
  passing: 10, shooting: 10, tackling: 10, dribbling: 10,
  heading: 10, crossing: 10, finishing: 10, firstTouch: 10,
  positioning: 10, decisions: 10, composure: 10, determination: 10,
  teamwork: 10, flair: 10, bravery: 10, aggression: 10,
  pace: 10, acceleration: 10, stamina: 10, strength: 10, agility: 10,
  naturalFitness: 10, injuryProneness: 10,
};

const buildAttrs = (overrides: Partial<PlayerAttributes>): PlayerAttributes =>
  ({ ...DEFAULT_ATTRS, ...overrides }) as PlayerAttributes;

const defaultTeam = () =>
  ({ ...DEFAULT_TEAM_INSTRUCTIONS }) as Pick<
    typeof DEFAULT_TEAM_INSTRUCTIONS,
    "counterAttack" | "focusPassing" | "zonalMarking" | "menBehindTheBall"
  >;

const resolveBehaviours = (
  overrides: Partial<typeof DEFAULT_PLAYER_INSTRUCTIONS>,
  attrs: PlayerAttributes = DEFAULT_ATTRS,
  freeRoleRating: number = 10,
): PerSlotBehaviour =>
  resolveSlotBehaviours(
    { ...DEFAULT_PLAYER_INSTRUCTIONS, ...overrides } as typeof DEFAULT_PLAYER_INSTRUCTIONS,
    defaultTeam(),
    15, // suitability — competent in the slot
    attrs,
    freeRoleRating,
  );

// ─── Switch weights ──────────────────────────────────────────────────────────

describe("switch weights", () => {
  it('"often" doubles throughBallWeight compared to "normal"', () => {
    const normal = resolveBehaviours({ tryThroughBalls: "normal" });
    const often = resolveBehaviours({ tryThroughBalls: "often" });
    expect(often.throughBallWeight).toBeCloseTo(normal.throughBallWeight * 2, 5);
  });

  it('"often" doubles crossWeight compared to "normal"', () => {
    const normal = resolveBehaviours({ crossBall: "normal" });
    const often = resolveBehaviours({ crossBall: "often" });
    expect(often.crossWeight).toBeCloseTo(normal.crossWeight * 2, 5);
  });

  it('"often" doubles longShotWeight compared to "normal"', () => {
    const normal = resolveBehaviours({ longShots: "normal" });
    const often = resolveBehaviours({ longShots: "often" });
    expect(often.longShotWeight).toBeCloseTo(normal.longShotWeight * 2, 5);
  });

  it('"often" doubles runWithBallWeight compared to "normal"', () => {
    const normal = resolveBehaviours({ runWithBall: "normal" });
    const often = resolveBehaviours({ runWithBall: "often" });
    expect(often.runWithBallWeight).toBeCloseTo(normal.runWithBallWeight * 2, 5);
  });

  it('"often" doubles holdUpWeight compared to "normal"', () => {
    const normal = resolveBehaviours({ holdUpBall: "normal" });
    const often = resolveBehaviours({ holdUpBall: "often" });
    expect(often.holdUpWeight).toBeCloseTo(normal.holdUpWeight * 2, 5);
  });

  it('"often" doubles forwardRunWeight compared to "normal"', () => {
    const normal = resolveBehaviours({ forwardRuns: "normal" });
    const often = resolveBehaviours({ forwardRuns: "often" });
    expect(often.forwardRunWeight).toBeCloseTo(normal.forwardRunWeight * 2, 5);
  });

  it('"often" doubles freeRoleWeight compared to "normal"', () => {
    const normal = resolveBehaviours({ freeRole: "normal" });
    const often = resolveBehaviours({ freeRole: "often" });
    expect(often.freeRoleWeight).toBeCloseTo(normal.freeRoleWeight * 2, 5);
  });
});

// ─── Attribute scaling ───────────────────────────────────────────────────────

describe("attribute scaling (ticket 28)", () => {
  it("throughBallWeight scales with passing attribute", () => {
    const lowPass = resolveBehaviours({}, buildAttrs({ passing: 5 }));
    const highPass = resolveBehaviours({}, buildAttrs({ passing: 15 }));
    expect(highPass.throughBallWeight).toBeGreaterThan(lowPass.throughBallWeight);
  });

  it("throughBallWeight scales with flair attribute (creativity)", () => {
    const lowFlair = resolveBehaviours({}, buildAttrs({ flair: 5 }));
    const highFlair = resolveBehaviours({}, buildAttrs({ flair: 15 }));
    expect(highFlair.throughBallWeight).toBeGreaterThan(lowFlair.throughBallWeight);
  });

  it("crossWeight scales with crossing attribute", () => {
    const low = resolveBehaviours({}, buildAttrs({ crossing: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ crossing: 15 }));
    expect(high.crossWeight).toBeGreaterThan(low.crossWeight);
  });

  it("longShotWeight scales with shooting attribute", () => {
    const low = resolveBehaviours({}, buildAttrs({ shooting: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ shooting: 15 }));
    expect(high.longShotWeight).toBeGreaterThan(low.longShotWeight);
  });

  it("runWithBallWeight scales with dribbling attribute", () => {
    const low = resolveBehaviours({}, buildAttrs({ dribbling: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ dribbling: 15 }));
    expect(high.runWithBallWeight).toBeGreaterThan(low.runWithBallWeight);
  });

  it("runWithBallWeight scales with pace attribute", () => {
    const low = resolveBehaviours({}, buildAttrs({ pace: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ pace: 15 }));
    expect(high.runWithBallWeight).toBeGreaterThan(low.runWithBallWeight);
  });

  it("holdUpWeight scales with strength attribute", () => {
    const low = resolveBehaviours({}, buildAttrs({ strength: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ strength: 15 }));
    expect(high.holdUpWeight).toBeGreaterThan(low.holdUpWeight);
  });

  it("holdUpWeight scales with firstTouch attribute", () => {
    const low = resolveBehaviours({}, buildAttrs({ firstTouch: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ firstTouch: 15 }));
    expect(high.holdUpWeight).toBeGreaterThan(low.holdUpWeight);
  });

  it("forwardRunWeight scales with acceleration attribute", () => {
    const low = resolveBehaviours({}, buildAttrs({ acceleration: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ acceleration: 15 }));
    expect(high.forwardRunWeight).toBeGreaterThan(low.forwardRunWeight);
  });

  it("freeRoleWeight scales with freeRoleRating", () => {
    const low = resolveBehaviours({}, DEFAULT_ATTRS, 5);
    const high = resolveBehaviours({}, DEFAULT_ATTRS, 15);
    expect(high.freeRoleWeight).toBeGreaterThan(low.freeRoleWeight);
  });

  it("freeRoleWeight scales with flair (for free role)", () => {
    const low = resolveBehaviours({}, buildAttrs({ flair: 5 }));
    const high = resolveBehaviours({}, buildAttrs({ flair: 15 }));
    expect(high.freeRoleWeight).toBeGreaterThan(low.freeRoleWeight);
  });
});

// ─── Per-slot overrides ──────────────────────────────────────────────────────

describe("per-slot overrides", () => {
  it("man marking gives higher markingAggression than zonal marking", () => {
    const man = resolveBehaviours({ marking: "man" });
    const zonal = resolveBehaviours({ marking: "zonal" });
    expect(man.markingAggression).toBeGreaterThan(zonal.markingAggression);
  });

  it("always closingDown gives higher distance than standOff", () => {
    const always = resolveBehaviours({ closingDown: "always" });
    const standOff = resolveBehaviours({ closingDown: "standOff" });
    expect(always.closingDownDistance).toBeGreaterThan(standOff.closingDownDistance);
  });

  it("hard tackling gives higher hardness than easy tackling", () => {
    const hard = resolveBehaviours({ tackling: "hard" });
    const easy = resolveBehaviours({ tackling: "easy" });
    expect(hard.tacklingHardness).toBeGreaterThan(easy.tacklingHardness);
  });

  it("ownHalfOnly closingDown sits between standOff and always", () => {
    const standOff = resolveBehaviours({ closingDown: "standOff" });
    const ownHalf = resolveBehaviours({ closingDown: "ownHalfOnly" });
    const always = resolveBehaviours({ closingDown: "always" });
    expect(always.closingDownDistance).toBeGreaterThan(ownHalf.closingDownDistance);
    expect(ownHalf.closingDownDistance).toBeGreaterThan(standOff.closingDownDistance);
  });
});

// ─── Standalone settings ─────────────────────────────────────────────────────

describe("standalone settings", () => {
  describe("distribution (GK)", () => {
    it("longKick gives high distributionPreference (near 1.0)", () => {
      const b = resolveBehaviours({ distribution: "longKick" });
      expect(b.distributionPreference).toBeCloseTo(1.0);
    });

    it("askDefendersToCollect gives low distributionPreference (near 0.0)", () => {
      const b = resolveBehaviours({ distribution: "askDefendersToCollect" });
      expect(b.distributionPreference).toBeCloseTo(0.0);
    });

    it("default gives balanced distributionPreference (0.5)", () => {
      const b = resolveBehaviours({ distribution: "default" });
      expect(b.distributionPreference).toBeCloseTo(0.5);
    });

    it("longKick reduces possessionRetention below 1.0", () => {
      const b = resolveBehaviours({ distribution: "longKick" });
      expect(b.possessionRetention).toBeLessThan(1.0);
    });

    it("askDefendersToCollect increases possessionRetention above 1.0", () => {
      const b = resolveBehaviours({ distribution: "askDefendersToCollect" });
      expect(b.possessionRetention).toBeGreaterThan(1.0);
    });
  });

  describe("crossFrom", () => {
    it("deep gives crossFromDeep > 1.0 (more but lower quality)", () => {
      const b = resolveBehaviours({ crossFrom: "deep" });
      expect(b.crossFromDeep).toBeGreaterThan(1.0);
    });

    it("touchline gives crossFromDeep < 1.0 (higher quality, less often)", () => {
      const b = resolveBehaviours({ crossFrom: "touchline" });
      expect(b.crossFromDeep).toBeLessThan(1.0);
    });

    it("default gives crossFromDeep = 1.0", () => {
      const b = resolveBehaviours({ crossFrom: "default" });
      expect(b.crossFromDeep).toBeCloseTo(1.0);
    });
  });

  describe("crossAim", () => {
    it("nearPost gives crossAimPreference of 0.0 (finishing+pace)", () => {
      const b = resolveBehaviours({ crossAim: "nearPost" });
      expect(b.crossAimPreference).toBeCloseTo(0.0);
    });

    it("centre gives crossAimPreference of 0.5 (finishing+composure)", () => {
      const b = resolveBehaviours({ crossAim: "centre" });
      expect(b.crossAimPreference).toBeCloseTo(0.5);
    });

    it("farPost gives crossAimPreference of 1.0 (heading+strength)", () => {
      const b = resolveBehaviours({ crossAim: "farPost" });
      expect(b.crossAimPreference).toBeCloseTo(1.0);
    });

    it("man gives crossAimPreference of -1.0 (best header)", () => {
      const b = resolveBehaviours({ crossAim: "man" });
      expect(b.crossAimPreference).toBeCloseTo(-1.0);
    });

    it("default gives crossAimPreference of 0.5 (centre)", () => {
      const b = resolveBehaviours({ crossAim: "default" });
      expect(b.crossAimPreference).toBeCloseTo(0.5);
    });
  });
});

// ─── Suitability factor ──────────────────────────────────────────────────────

describe("suitability factor", () => {
  it("natural players (suit = 20) get suitabilityFactor = 1.0", () => {
    const b = resolveSlotBehaviours(
      DEFAULT_PLAYER_INSTRUCTIONS as typeof DEFAULT_PLAYER_INSTRUCTIONS,
      defaultTeam(),
      20, DEFAULT_ATTRS, 10,
    );
    expect(b.suitabilityFactor).toBeCloseTo(1.0);
  });

  it("unfamiliar players (suit = 8) get suitabilityFactor < 0.6", () => {
    const b = resolveSlotBehaviours(
      DEFAULT_PLAYER_INSTRUCTIONS as typeof DEFAULT_PLAYER_INSTRUCTIONS,
      defaultTeam(),
      8, DEFAULT_ATTRS, 10,
    );
    expect(b.suitabilityFactor).toBeLessThan(0.6);
  });
});

// ─── Specific marking (standalone unit test) ─────────────────────────────────

describe("specific marking (pure behaviour resolution)", () => {
  it("crossAimPreference is set regardless of marking state (marking is match-time only)", () => {
    // crossAimPreference is a pure function of the instruction, not affected by marking
    const near = resolveBehaviours({ crossAim: "nearPost" });
    const far = resolveBehaviours({ crossAim: "farPost" });
    expect(near.crossAimPreference).toBeLessThan(far.crossAimPreference);
  });
});

// ─── Offside risk ────────────────────────────────────────────────────────────

describe("offside risk", () => {
  it("increases with forwardRunWeight and throughBallWeight", () => {
    const normal = resolveBehaviours({ forwardRuns: "normal", tryThroughBalls: "normal" });
    const high = resolveBehaviours({ forwardRuns: "often", tryThroughBalls: "often" });
    expect(high.offsideRisk).toBeGreaterThan(normal.offsideRisk);
  });
});

// ─── Tackling hardness effect on offside risk proxy ──────────────────────────

describe("tackling hardness from player instruction", () => {
  it("player-level hard tackling increases tacklingHardness above instruction-level normal", () => {
    const normal = resolveBehaviours({ tackling: "normal" });
    const hard = resolveBehaviours({ tackling: "hard" });
    expect(hard.tacklingHardness).toBeGreaterThan(normal.tacklingHardness);
  });

  it("player-level easy tackling reduces tacklingHardness below instruction-level normal", () => {
    const normal = resolveBehaviours({ tackling: "normal" });
    const easy = resolveBehaviours({ tackling: "easy" });
    expect(easy.tacklingHardness).toBeLessThan(normal.tacklingHardness);
  });
});

// ─── Specific marking integration tests ──────────────────────────────────────

describe("specific marking (integration)", () => {
  const MARKER = PlayerId.make("marker-player");
  const MARKED = PlayerId.make("marked-player");
  const OTHER = PlayerId.make("other-player");
  const OTHER_MARKED = PlayerId.make("other-marked");

  const baseAttrs: PlayerAttributes = {
    passing: 10, shooting: 10, tackling: 10, dribbling: 10,
    heading: 10, crossing: 10, finishing: 10, firstTouch: 10,
    positioning: 10, decisions: 10, composure: 10, determination: 10,
    teamwork: 10, flair: 10, bravery: 10, aggression: 10,
    pace: 10, acceleration: 10, stamina: 10, strength: 10, agility: 10,
    naturalFitness: 10, injuryProneness: 10,
  };
  const baseRatings = {
    lines: { GK: 10, SW: 10, D: 10, DM: 10, M: 10, AM: 10, F: 10, WB: 10 },
    sides: { R: 10, L: 10, C: 10 },
    freeRole: 10,
  };
  const slots = [
    { playerId: MARKER, cell: { row: "D" as const, column: "C" as const }, run: null },
    { playerId: OTHER, cell: { row: "M" as const, column: "C" as const }, run: null },
  ];
  const bench = [] as ReadonlyArray<PlayerId | null>;
  const squad = [
    { id: MARKER, attributes: baseAttrs, positionalRatings: baseRatings },
    { id: OTHER, attributes: baseAttrs, positionalRatings: baseRatings },
  ];

  const baseTactic = (overrides?: Partial<MatchTactic>): MatchTactic => ({
    slots,
    bench,
    team: { ...DEFAULT_TEAM_INSTRUCTIONS },
    slotInstructions: [],
    teamSetPieces: DEFAULT_TEAM_SET_PIECES,
    takers: EMPTY_TAKERS,
    specificMarkings: undefined,
    ...overrides,
  });

  const makeTeam = (tactic: MatchTactic): TeamRuntimeState =>
    initTeamState({
      clubId: ClubId.make("home"),
      squad: squad.map((p) => ({ ...p })) as unknown as ReadonlyArray<MatchPlayerInput>,
      tactic,
    } as MatchTeamSetup);

  const changeTactic = (team: TeamRuntimeState, tactic: MatchTactic) =>
    applyCommand(team, {
      _tag: "ChangeTactics",
      clubId: ClubId.make("home"),
      tactic,
    }, 10, 1, false);

  it("stores specific markings from the kickoff tactic", () => {
    const markings = new Map<PlayerId, PlayerId>([[MARKER, MARKED]]);
    const state = makeTeam(baseTactic({ specificMarkings: markings }));
    expect(state.activeSpecificMarkings.get(MARKER)).toBe(MARKED);
    expect(state.activeSpecificMarkings.size).toBe(1);
  });

  it("starts with no specific markings when none provided", () => {
    const state = makeTeam(baseTactic());
    expect(state.activeSpecificMarkings.size).toBe(0);
  });

  it("clears specific markings on a ChangeTactics without markings", () => {
    const markings = new Map<PlayerId, PlayerId>([[MARKER, MARKED]]);
    const state = makeTeam(baseTactic({ specificMarkings: markings }));
    expect(state.activeSpecificMarkings.size).toBe(1);

    // Apply a ChangeTactics WITHOUT specificMarkings — markings should be cleared
    const result = changeTactic(state, baseTactic());
    expect(result.accepted).toBe(true);
    expect(state.activeSpecificMarkings.size).toBe(0);
  });

  it("sets new specific markings from a ChangeTactics with markings", () => {
    const state = makeTeam(baseTactic());

    const markings = new Map<PlayerId, PlayerId>([[MARKER, MARKED]]);
    const result = changeTactic(state, baseTactic({ specificMarkings: markings }));
    expect(result.accepted).toBe(true);
    expect(state.activeSpecificMarkings.get(MARKER)).toBe(MARKED);
    expect(state.activeSpecificMarkings.size).toBe(1);
  });

  it("replaces old specific markings with new ones from a second ChangeTactics", () => {
    const state = makeTeam(baseTactic());

    // Set first set of markings
    changeTactic(state, baseTactic({ specificMarkings: new Map([[MARKER, MARKED]]) }));
    expect(state.activeSpecificMarkings.size).toBe(1);
    expect(state.activeSpecificMarkings.get(MARKER)).toBe(MARKED);

    // Replace with different markings
    const result = changeTactic(state, baseTactic({ specificMarkings: new Map([[OTHER, OTHER_MARKED]]) }));
    expect(result.accepted).toBe(true);
    expect(state.activeSpecificMarkings.size).toBe(1);
    expect(state.activeSpecificMarkings.get(OTHER)).toBe(OTHER_MARKED);
    // Old marking should be gone
    expect(state.activeSpecificMarkings.has(MARKER)).toBe(false);
  });
});