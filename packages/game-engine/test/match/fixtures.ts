import { FORMATION_SLOTS, POSITION_ROLES, generateSquad, type GeneratedPlayer, type Position } from "@cm-clone/shared";
import { createSeededRng } from "../../src/rng.js";
import type { MatchPlayerInput, MatchTactic, MatchTeamSetup } from "../../src/match/types.js";

export interface GeneratedTeam {
  readonly setup: MatchTeamSetup;
  readonly squad: ReadonlyArray<MatchPlayerInput & { readonly primaryPosition: Position }>;
}

const withIds = (
  clubId: string,
  squad: ReadonlyArray<GeneratedPlayer>,
): ReadonlyArray<MatchPlayerInput & { readonly primaryPosition: Position }> =>
  squad.map((player, index) => ({
    id: `${clubId}-p${index}`,
    attributes: player.attributes,
    primaryPosition: player.positions[0]!.position,
  }));

/** Builds a full squad + a Tactic filling every Formation slot from a natural-fit player, for match-sim tests. */
export const buildTeam = (clubId: string, seed: number, formation: keyof typeof FORMATION_SLOTS = "4-4-2"): GeneratedTeam => {
  const random = createSeededRng(seed);
  const squad = withIds(clubId, generateSquad("mid", random));

  const usedIds = new Set<string>();
  const slots = FORMATION_SLOTS[formation].map((position) => {
    const player = squad.find((p) => p.primaryPosition === position && !usedIds.has(p.id)) ?? squad.find((p) => !usedIds.has(p.id))!;
    usedIds.add(player.id);
    return { position, role: POSITION_ROLES[position], playerId: player.id };
  });

  const tactic: MatchTactic = {
    formation,
    slots,
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  };

  return {
    setup: { clubId, squad, tactic },
    squad,
  };
};
