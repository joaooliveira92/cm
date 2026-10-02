import type { TeamRuntimeState, TeamStrengths } from "./teamState.js";
import type { PhaseStrengths } from "../types.js";
import type { RandomSource } from "@cm-clone/shared";
import {
  computeTeamStrengths,
  effectiveStrengths,
  conditionStaminaEquivalent,
} from "./teamState.js";
import { BASE_ATTACK_EVENT_CHANCE, clamp } from "./constants.js";

/**
 * Result of phase strength resolution for a single minute-slice.
 */
export interface PhaseStrengthResult {
  /** The team that has possession. */
  attacker: TeamRuntimeState;
  /** The team defending. */
  defender: TeamRuntimeState;
  /** Effective phase strengths for the attacker. */
  attackerEff: PhaseStrengths;
  /** Effective phase strengths for the defender. */
  defenderEff: PhaseStrengths;
  /** The calculated event probability for this slice. */
  eventProbability: number;
  /** Whether the home team has possession. */
  homeHasPossession: boolean;
}

/**
 * Resolves phase strengths and possession for match simulation.
 * Encapsulates the logic for computing team strengths with possession adjustments,
 * fatigue effects, home advantage, and event probability calculation.
 */
export class PhaseStrengthResolver {
  /**
   * Resolves all phase strengths and possession for a minute-slice.
   * Returns everything needed by the EventResolver.
   */
  static resolve(
    home: TeamRuntimeState,
    away: TeamRuntimeState,
    minute: number,
    random: RandomSource,
  ): PhaseStrengthResult {
    // Compute base phase strengths (no possession adjustment) for possession probability
    const homeStrengths = computeTeamStrengths(home, false);
    const awayStrengths = computeTeamStrengths(away, false);
    const homeCondition = conditionStaminaEquivalent(home);
    const awayCondition = conditionStaminaEquivalent(away);

    const homeEff = effectiveStrengths(homeStrengths, minute, homeCondition, true);
    const awayEff = effectiveStrengths(awayStrengths, minute, awayCondition, false);

    // Possession based on midfield & passing behaviour, plus counter-attack & focus passing adjustments
    const homePossessionModifier = home.resolved.teamModifiers.possessionBias
      * home.resolved.teamModifiers.counterPossessionPenalty
      * home.resolved.teamModifiers.focusPossessionBias;
    const awayPossessionModifier = away.resolved.teamModifiers.possessionBias
      * away.resolved.teamModifiers.counterPossessionPenalty
      * away.resolved.teamModifiers.focusPossessionBias;

    // GK distribution effect on possession retention (ticket 28)
    const gkRetention = (team: TeamRuntimeState): number => {
      const gkSlot = team.resolved.slots.find((s) => s.isGoalkeeper);
      return gkSlot?.behaviour.possessionRetention ?? 1.0;
    };
    const homeGKRet = gkRetention(home);
    const awayGKRet = gkRetention(away);

    const homeEffMid = homeEff.midfield * homePossessionModifier * homeGKRet;
    const awayEffMid = awayEff.midfield * awayPossessionModifier * awayGKRet;
    const totalMidfield = homeEffMid + awayEffMid;
    const homePossessionProbability = totalMidfield > 0 ? homeEffMid / totalMidfield : 0.5;
    const homeHasPossession = random.next() < homePossessionProbability;

    // Re-compute phase strengths WITH run adjustments based on who has possession
    // Runners count in their run target's phase when their team has the ball
    const homePossessionStrengths = computeTeamStrengths(home, homeHasPossession);
    const awayPossessionStrengths = computeTeamStrengths(away, !homeHasPossession);
    const attacker = homeHasPossession ? home : away;
    const defender = homeHasPossession ? away : home;
    const attackerEff = effectiveStrengths(
      homeHasPossession ? homePossessionStrengths : awayPossessionStrengths,
      minute,
      homeHasPossession ? homeCondition : awayCondition,
      homeHasPossession,
    );
    const defenderEff = effectiveStrengths(
      homeHasPossession ? awayPossessionStrengths : homePossessionStrengths,
      minute,
      homeHasPossession ? awayCondition : homeCondition,
      !homeHasPossession,
    );

    // Mentality effect from ResolvedInstructions (attack factor boosts attack attempts)
    const mentalityAttackBias = attacker.resolved.instructions.attack;

    const attackDefenseTotal = attackerEff.attack * mentalityAttackBias + defenderEff.defense;
    const attackDefenseRatio = attackDefenseTotal > 0
      ? (attackerEff.attack * mentalityAttackBias) / attackDefenseTotal
      : 0.5;

    const eventProbability = clamp(
      BASE_ATTACK_EVENT_CHANCE * attackDefenseRatio * 2,
      0,
      0.6,
    );

    return {
      attacker,
      defender,
      attackerEff,
      defenderEff,
      eventProbability,
      homeHasPossession,
    };
  }

  /**
   * Computes the base team strengths (without possession adjustment).
   * Used for possession probability calculation.
   */
  static baseStrengths(team: TeamRuntimeState): TeamStrengths {
    return computeTeamStrengths(team);
  }

  /**
   * Converts average on-pitch Condition % to the 1-20 Stamina scale.
   */
  static conditionToStamina(team: TeamRuntimeState): number {
    return conditionStaminaEquivalent(team);
  }
}