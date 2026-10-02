import type { TeamRuntimeState } from "./teamState.js";
import type { TacticalState } from "./tacticalAdapter.js";
import type { MatchEvent, MatchHalf } from "../events.js";
import type { RandomSource } from "@cm-clone/shared";
import {
  resolveAttackingEvent,
  resolveCards,
  resolveOffside,
} from "./minuteResolvers.js";
import {
  resolveContactDuels,
  resolveNonContactInjuries,
} from "./injuryResolver.js";
import { pickPlayerId } from "./teamState.js";

/**
 * Resolves all event types for a single minute-slice.
 * Handles: attacking events, offside, cards, contact duels, and non-contact injuries.
 * Also tracks the event count before slice for set-piece trigger detection.
 */
export class EventResolver {
  /**
   * Resolves the complete set of events for one minute-slice.
   * Called from the simulation loop after phase strengths have been computed.
   *
   * Returns the number of events emitted during this slice (for set-piece trigger detection).
   */
  static resolveEvents(
    attacker: TeamRuntimeState,
    defender: TeamRuntimeState,
    attackerTactical: TacticalState,
    defenderTactical: TacticalState,
    attackerEff: { attack: number; midfield: number; defense: number },
    defenderEff: { attack: number; midfield: number; defense: number },
    minute: number,
    half: MatchHalf,
    score: { home: number; away: number },
    attackerIsHome: boolean,
    random: RandomSource,
    events: Array<MatchEvent>,
  ): number {
    // Snapshot event count before this slice's events so we can detect set-piece triggers
    const eventCountBeforeSlice = events.length;

    // Mentality effect from ResolvedInstructions (attack factor boosts attack attempts)
    const mentalityAttackBias = attackerTactical.instructions.attack;

    const attackDefenseTotal = attackerEff.attack * mentalityAttackBias + defenderEff.defense;
    const attackDefenseRatio = attackDefenseTotal > 0
      ? (attackerEff.attack * mentalityAttackBias) / attackDefenseTotal
      : 0.5;

    const eventProbability = Math.min(
      0.6,
      Math.max(0, 0.16 * attackDefenseRatio * 2),
    );

    // Resolve attacking event based on probability
    if (random.next() < eventProbability) {
      resolveAttackingEvent(attacker, defender, minute, half, score, attackerIsHome, random, events);
    }

    // Offside check for the attacking team
    resolveOffside(attacker, defender, minute, half, random, events);

    // Beaten trap check: when defending team uses offside trap and the attacker beats it
    if (defenderTactical.teamModifiers.offsideTrapActive > 0 && random.next() < 0.25) {
      const beatenPlayerId = pickPlayerId(attacker, random, true);
      if (beatenPlayerId) {
        events.push({
          _tag: "BeatenTrap",
          minute,
          half,
          teamClubId: attacker.clubId,
          playerId: beatenPlayerId,
        });
      }
    }

    // Cards now come through resolveCards (which calls resolveFoul internally)
    resolveCards(defender, minute, half, random, events);
    resolveContactDuels(attacker, defender, minute, half, random, events);
    resolveNonContactInjuries(attacker, minute, half, random, events);
    resolveNonContactInjuries(defender, minute, half, random, events);

    return events.length - eventCountBeforeSlice;
  }
}