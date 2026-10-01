/**
 * Resolve Team Instructions and Player Instructions into numeric behaviour vectors.
 *
 * This is the pure resolution step at the tactic boundary: tactical vocabulary enters, numbers
 * exit. The engine reads numbers only (ADR-0002/0003). All attribute-approximation mappings
 * live in one place so a later attribute-set effort can swap them.
 *
 * "normal" switch value is the engine's baseline = 1.0 weight for that behaviour; "often" ≈ 2.0.
 * Team instructions set team-wide modifiers; per-slot overrides multiply on top.
 *
 * Attribute scaling (ticket 28):
 *   - Through balls: passing + flair (creativity)
 *   - Crosses: crossing
 *   - Long shots: shooting
 *   - Run with ball: dribbling + pace
 *   - Hold up: strength + firstTouch
 *   - Forward runs: pace + acceleration
 *   - Free role: freeRoleRating + flair + decisions
 */

import { suitabilityFactor, type PlayerAttributes, type PlayerInstructions, type TeamInstructions } from "@cm-clone/shared";

// ─── Exported types ─────────────────────────────────────────────────────────

/** Per-slot behaviour vector — the engine reads one of these per on-pitch player. */
export interface PerSlotBehaviour {
  readonly throughBallWeight: number;
  readonly crossWeight: number;
  readonly longShotWeight: number;
  readonly runWithBallWeight: number;
  readonly holdUpWeight: number;
  readonly counterWeight: number;
  readonly forwardRunWeight: number;
  readonly freeRoleWeight: number;
  readonly markingAggression: number;
  readonly closingDownDistance: number;
  readonly tacklingHardness: number;
  readonly offsideRisk: number;
  readonly crossFromDeep: number;
  readonly crossAimPreference: number;
  /** Suitability-scaled decision-making factor [0..1]: affects positioning/decisions/composure/teamwork reads. */
  readonly suitabilityFactor: number;
  /** Distribution preference: 0 = collect (short), 1 = long kick. Only meaningful for GK slot. */
  readonly distributionPreference: number;
  /** Possession retention multiplier from this slot's distribution setting. 1.0 = neutral. */
  readonly possessionRetention: number;
}

/** Team-level behaviour modifiers applied across all slots. */
export interface TeamBehaviourModifiers {
  readonly possessionBias: number;
  readonly tempo: number;
  readonly pressingAggression: number;
  readonly defensiveLine: number;
  readonly counterAttackWeight: number;
  /** Higher = more man-marking (tighter one-on-one), lower = more zonal (positioning & teamwork based). */
  readonly zonalMarkingWeight: number;
  readonly foulRate: number;
  readonly widthBias: number;
  /** Focus passing: multiplies cross chance type weights (bothFlanks/leftFlank/rightFlank). */
  readonly focusCrossMultiplier: number;
  /** Focus passing: multiplies through-ball chance type weights (throughTheMiddle). */
  readonly focusThroughMultiplier: number;
  /** Focus passing: possession shift toward flank play (leftFlank/rightFlank = wider, throughTheMiddle = narrower). */
  readonly focusPossessionBias: number;
  /** Tackling effect on contact injury risk: easy↓/hard↑. */
  readonly contactInjuryMultiplier: number;
  /** ClosingDown effect on fatigue rate (non-contact injury risk): ownHalfOnly↑/always↑↑. */
  readonly fatigueRate: number;
  /** Whether offside trap is active (1 or 0) — enables beaten-trap one-on-one mechanic. */
  readonly offsideTrapActive: number;
  /** CounterAttack reduces settled possession slightly. */
  readonly counterPossessionPenalty: number;
  /** MenBehindTheBall reduces attack strength. */
  readonly attackStrengthPenalty: number;
}

// ─── Switch weights ─────────────────────────────────────────────────────────

const SWITCH_WEIGHTS: Record<string, number> = {
  normal: 1.0,
  often: 2.0,
};

const switchWeight = (value: string): number => SWITCH_WEIGHTS[value] ?? 1.0;

// ─── Attribute helpers ──────────────────────────────────────────────────────

/**
 * Normalise a 1-20 attribute value to a [0.5, 2.0] multiplier centred at 1.0 (attribute = 10).
 * A player with 10 in every attribute has a neutral 1.0 multiplier.
 */
const attrFactor = (value: number): number => value / 10;

/**
 * Average of two attribute values, normalised. Used for two-attribute-scored behaviours.
 */
const pairFactor = (a: number, b: number): number => attrFactor((a + b) / 2);

/**
 * Read a named attribute from a `PlayerAttributes`-shaped lookup, defaulting to 10.
 */
const readAttr = (attrs: Partial<Record<string, number>>, name: string): number =>
  attrs[name as keyof PlayerAttributes] ?? 10;

/**
 * Default attribute map used when no player data is available (e.g. substitution with no previous
 * attributes). All values are the neutral 10.
 */
const DEFAULT_ATTRS: Partial<Record<string, number>> = {};

// ─── Attribute approximation table ──────────────────────────────────────────

/**
 * Where CM's instructions read attributes this game lacks, the closest existing one.
 * Maps instruction concept → attribute name. One swappable table.
 */
export const CLOSEST_ATTRIBUTE: Record<string, string> = {
  marking: "positioning",
  offTheBall: "positioning",
  anticipation: "decisions",
  creativity: "flair",
  longShots: "shooting",
  workRate: "stamina",
};

// ─── Resolve individual slot behaviours ─────────────────────────────────────

/**
 * Resolve one slot's instruction set into a numeric behaviour vector. Pure and stateless.
 *
 * @param instructions  The PlayerInstructions for this slot (from the tactic).
 * @param team          The team-level instructions for context (e.g. counter-attack team instruction).
 * @param suitability   The player's suitability in this slot (1-20), for scaling decision attributes.
 * @param attributes    The player's attributes for scaling behaviours (neutral 10 default).
 * @param freeRoleRating The player's Free Role Rating from positional ratings (1-20, default 10).
 */
export const resolveSlotBehaviours = (
  instructions: PlayerInstructions,
  team: Pick<TeamInstructions, "counterAttack" | "focusPassing" | "zonalMarking" | "menBehindTheBall">,
  suitability: number,
  attributes: Partial<Record<string, number>> = DEFAULT_ATTRS,
  freeRoleRating: number = 10,
): PerSlotBehaviour => {
  // Read attributes (defaulting to 10 = neutral)
  const passing = readAttr(attributes, "passing");
  const flair = readAttr(attributes, "flair");
  const crossing = readAttr(attributes, "crossing");
  const shooting = readAttr(attributes, "shooting");
  const dribbling = readAttr(attributes, "dribbling");
  const pace = readAttr(attributes, "pace");
  const acceleration = readAttr(attributes, "acceleration");
  const strength = readAttr(attributes, "strength");
  const firstTouch = readAttr(attributes, "firstTouch");
  const decisions = readAttr(attributes, "decisions");

  // Suitability factor: uses the shared curve from suitability.ts
  // (1.0 at 20, ~0.9 at 15, ~0.5 at 1).
  const suitabilityFactorValue = suitabilityFactor(suitability);

  // Core behaviour weights from switches × attribute factors (ticket 28)
  // Through balls: passing + creativity (flair)
  const throughBallWeightBase = switchWeight(instructions.tryThroughBalls) * pairFactor(passing, flair);
  // Crosses: crossing
  const crossWeightBase = switchWeight(instructions.crossBall) * attrFactor(crossing);
  // Long shots: shooting
  const longShotWeight = switchWeight(instructions.longShots) * attrFactor(shooting);
  // Run with ball: dribbling + pace
  const runWithBallWeight = switchWeight(instructions.runWithBall) * pairFactor(dribbling, pace);
  // Hold up: strength + firstTouch
  const holdUpWeight = switchWeight(instructions.holdUpBall) * pairFactor(strength, firstTouch);
  // Counter: team instruction, not per-player
  const counterWeight = team.counterAttack ? 1.5 : 1.0;
  // Forward runs: pace + acceleration
  const forwardRunWeight = switchWeight(instructions.forwardRuns) * pairFactor(pace, acceleration);
  // Free Role: freeRoleRating + flair + decisions (ticket 28: "Free Role Rating, flair, decisions")
  const freeRoleBase = (freeRoleRating / 10 + attrFactor(flair) + attrFactor(decisions)) / 3;
  const freeRoleWeight = switchWeight(instructions.freeRole) * freeRoleBase;

  // Focus passing modifiers on per-slot behaviour
  const fp = team.focusPassing;
  const focusCrossMod = fp === "leftFlank" || fp === "rightFlank" || fp === "bothFlanks" ? 1.3
    : fp === "throughTheMiddle" ? 0.85
    : 1.0; // mixed
  const focusThroughMod = fp === "throughTheMiddle" ? 1.3
    : fp === "bothFlanks" ? 0.9
    : 1.0; // mixed, left, right

  // Defensive behaviour
  const markingAggression = instructions.marking === "man" ? 1.5 : instructions.marking === "zonal" ? 0.8 : 1.0;
  const teamMarkingMod = team.zonalMarking ? 0.85 : 1.15;
  const closingDownDistance = instructions.closingDown === "always" ? 1.5
    : instructions.closingDown === "ownHalfOnly" ? 0.6
    : instructions.closingDown === "standOff" ? 0.4
    : 1.0; // "team" → resolved to team's closingDown at resolution time
  const tacklingHardness = instructions.tackling === "hard" ? 1.5
    : instructions.tackling === "easy" ? 0.6
    : 1.0; // "team" or "normal"

  const offsideRisk = forwardRunWeight * 0.3 + throughBallWeightBase * 0.2;
  const crossFromDeep = instructions.crossFrom === "deep" ? 1.5
    : instructions.crossFrom === "touchline" ? 0.8
    : 1.0;
  const crossAimPreference = instructions.crossAim === "nearPost" ? 0.0
    : instructions.crossAim === "centre" ? 0.5
    : instructions.crossAim === "farPost" ? 1.0
    : instructions.crossAim === "man" ? -1.0
    : 0.5; // "default" → centre

  // Distribution (GK only): longKick = high preference for long, askDefendersToCollect = short
  const distributionPreference = instructions.distribution === "longKick" ? 1.0
    : instructions.distribution === "askDefendersToCollect" ? 0.0
    : 0.5; // "default" — balanced
  // Possession retention: longKick reduces retention (kick deep → likely turnover),
  // askDefendersToCollect improves it (play short → keep ball).
  const possessionRetention = instructions.distribution === "longKick" ? 0.85
    : instructions.distribution === "askDefendersToCollect" ? 1.15
    : 1.0; // "default"

  return {
    throughBallWeight: throughBallWeightBase * focusThroughMod,
    crossWeight: crossWeightBase * focusCrossMod,
    longShotWeight,
    runWithBallWeight,
    holdUpWeight,
    counterWeight,
    forwardRunWeight,
    freeRoleWeight,
    markingAggression: markingAggression * teamMarkingMod,
    closingDownDistance,
    tacklingHardness,
    offsideRisk,
    crossFromDeep,
    crossAimPreference,
suitabilityFactor: suitabilityFactorValue,
    distributionPreference,
    possessionRetention,
  };
};

// ─── Resolve team-level modifiers ───────────────────────────────────────────

/**
 * Resolve the nine Team Instructions into numeric team-level modifiers. Pure and stateless.
 * Called once per team at kickoff and on every live ChangeTactics.
 */
export const resolveTeamModifiers = (team: TeamInstructions): TeamBehaviourModifiers => {
  // Passing → possession bias
  // short = higher possession (more patient build-up)
  // direct = lower possession (more direct balls forward)
  // long = even lower (bypass midfield)
  const possessionBias = team.passing === "short" ? 1.2
    : team.passing === "direct" ? 0.85
    : team.passing === "long" ? 0.7
    : 1.0; // mixed

  // Tempo — always 1 in the CM model (no tempo instruction)
  const tempo = 1.0;

  // ClosingDown → pressing aggression + fatigue rate + defensive line
  const pressingAggression = team.closingDown === "always" ? 1.4
    : team.closingDown === "ownHalfOnly" ? 0.7
    : 1.0; // default

  // closingDown ownHalfOnly: defense sits deeper (lower defensive line = deeper)
  // closingDown always: more fatigue
  const fatigueRate = team.closingDown === "always" ? 1.4
    : team.closingDown === "ownHalfOnly" ? 1.15
    : 1.0; // default

  // Offside trap → higher defensive line, enables beaten-trap mechanic
  // Men behind ball → deeper defensive line, attack penalty
  const defensiveLine = team.offsideTrap ? 1.3 : team.menBehindTheBall ? 0.7 : 1.0;
  // closingDown ownHalfOnly also deepens defense
  const defensiveLineFinal = team.closingDown === "ownHalfOnly" ? defensiveLine * 0.85 : defensiveLine;

  const counterAttackWeight = team.counterAttack ? 1.5 : 1.0;
  // Zonal marking: zonal = less tight (lower weight) but better shape for defense
  // Man marking: tighter (higher weight), more vulnerable to through balls
  const zonalMarkingWeight = team.zonalMarking ? 0.85 : 1.15;

  // Tackling → foul rate, contact injury multiplier
  const tacklingFoulRate = team.tackling === "hard" ? 1.5
    : team.tackling === "easy" ? 0.7
    : 1.0; // normal
  const foulRateFromTackling = tacklingFoulRate * (pressingAggression > 1 ? 1.2 : 1.0);

  const contactInjuryMultiplier = team.tackling === "hard" ? 1.3
    : team.tackling === "easy" ? 0.7
    : 1.0; // normal

  // Focus passing → chance type multipliers + possession bias
  // bothFlanks/leftFlank/rightFlank: cross weight ↑ (M)
  // throughTheMiddle: through-ball weight ↑ (M)
  const focusCrossMultiplier = team.focusPassing === "leftFlank" || team.focusPassing === "rightFlank" ? 1.5
    : team.focusPassing === "bothFlanks" ? 1.3
    : team.focusPassing === "throughTheMiddle" ? 0.85
    : 1.0; // mixed
  const focusThroughMultiplier = team.focusPassing === "throughTheMiddle" ? 1.4
    : team.focusPassing === "bothFlanks" ? 0.9
    : 1.0; // mixed, left, right

  // leftFlank/rightFlank shift possession slightly toward that flank play
  const focusPossessionBias = team.focusPassing === "leftFlank" || team.focusPassing === "rightFlank" ? 1.05
    : team.focusPassing === "throughTheMiddle" ? 1.0
    : 1.0; // mixed, bothFlanks

  // Width bias from focus passing
  const widthBias = team.focusPassing === "leftFlank" || team.focusPassing === "rightFlank" ? 1.3
    : team.focusPassing === "throughTheMiddle" ? 0.7
    : 1.0; // mixed or bothFlanks

  // Counter attack → slight possession penalty (commits players forward)
  const counterPossessionPenalty = team.counterAttack ? 0.92 : 1.0;

  // Men behind the ball → attack strength penalty
  const attackStrengthPenalty = team.menBehindTheBall ? 0.85 : 1.0;

  // Offside trap active flag
  const offsideTrapActive = team.offsideTrap ? 1.0 : 0.0;

  return {
    possessionBias,
    tempo,
    pressingAggression,
    defensiveLine: defensiveLineFinal,
    counterAttackWeight,
    zonalMarkingWeight,
    foulRate: foulRateFromTackling,
    widthBias,
    focusCrossMultiplier,
    focusThroughMultiplier,
    focusPossessionBias,
    contactInjuryMultiplier,
    fatigueRate,
    offsideTrapActive,
    counterPossessionPenalty,
    attackStrengthPenalty,
  };
};