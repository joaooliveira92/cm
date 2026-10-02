import type { TeamInstructions } from "@cm-clone/shared";
import type { TeamBehaviourModifiers } from "../resolveBehaviourVectors.js";
import type { MatchTactic } from "../types.js";

const MENTALITY_MULTIPLIERS: Record<TeamInstructions["mentality"], { attack: number; defense: number }> = {
  ultraDefensive: { attack: 0.8, defense: 1.2 },
  defensive: { attack: 0.9, defense: 1.1 },
  normal: { attack: 1.0, defense: 1.0 },
  attacking: { attack: 1.1, defense: 0.9 },
  gungHo: { attack: 1.2, defense: 0.8 },
};

export interface ResolvedInstructions {
  readonly attack: number;
  readonly midfield: number;
  readonly defense: number;
}

export const resolveTeamInstructions = (
  tactic: Pick<MatchTactic, "team">,
): ResolvedInstructions => {
  const mentality = MENTALITY_MULTIPLIERS[tactic.team.mentality];
  return { attack: mentality.attack, midfield: 1, defense: mentality.defense };
};

export const resolveTeamModifiers = (team: TeamInstructions): TeamBehaviourModifiers => {
  const possessionBias = team.passing === "short" ? 1.2
    : team.passing === "direct" ? 0.85
    : team.passing === "long" ? 0.7
    : 1.0;

  const tempo = 1.0;

  const pressingAggression = team.closingDown === "always" ? 1.4
    : team.closingDown === "ownHalfOnly" ? 0.7
    : 1.0;

  const fatigueRate = team.closingDown === "always" ? 1.4
    : team.closingDown === "ownHalfOnly" ? 1.15
    : 1.0;

  const defensiveLine = team.offsideTrap ? 1.3 : team.menBehindTheBall ? 0.7 : 1.0;
  const defensiveLineFinal = team.closingDown === "ownHalfOnly" ? defensiveLine * 0.85 : defensiveLine;

  const counterAttackWeight = team.counterAttack ? 1.5 : 1.0;
  const zonalMarkingWeight = team.zonalMarking ? 0.85 : 1.15;

  const tacklingFoulRate = team.tackling === "hard" ? 1.5
    : team.tackling === "easy" ? 0.7
    : 1.0;
  const foulRateFromTackling = tacklingFoulRate * (pressingAggression > 1 ? 1.2 : 1.0);

  const contactInjuryMultiplier = team.tackling === "hard" ? 1.3
    : team.tackling === "easy" ? 0.7
    : 1.0;

  const focusCrossMultiplier = team.focusPassing === "leftFlank" || team.focusPassing === "rightFlank" ? 1.5
    : team.focusPassing === "bothFlanks" ? 1.3
    : team.focusPassing === "throughTheMiddle" ? 0.85
    : 1.0;
  const focusThroughMultiplier = team.focusPassing === "throughTheMiddle" ? 1.4
    : team.focusPassing === "bothFlanks" ? 0.9
    : 1.0;

  const focusPossessionBias = team.focusPassing === "leftFlank" || team.focusPassing === "rightFlank" ? 1.05
    : team.focusPassing === "throughTheMiddle" ? 1.0
    : 1.0;

  const widthBias = team.focusPassing === "leftFlank" || team.focusPassing === "rightFlank" ? 1.3
    : team.focusPassing === "throughTheMiddle" ? 0.7
    : 1.0;

  const counterPossessionPenalty = team.counterAttack ? 0.92 : 1.0;
  const attackStrengthPenalty = team.menBehindTheBall ? 0.85 : 1.0;
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