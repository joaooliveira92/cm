import { FORMATION_SLOTS, POSITION_ROLES, generateSquad, type ClubStrength, type GeneratedPlayer, type Position } from "@cm-clone/shared";
import { createSeededRng } from "../../src/rng.js";
import { deriveSeed } from "../../src/seed.js";
import { ClubId, PlayerId } from "@cm-clone/contracts";
import type { MatchPlayerInput, MatchTactic, MatchTeamSetup } from "../../src/match/types.js";

/** Fixture ids are branded in `@cm-clone/contracts`; these mint them from plain test literals so
 * every test file reads `clubId("home")` rather than repeating the constructor call. */
export const clubId = (value: string): ClubId => ClubId.make(value);
export const playerId = (value: string): PlayerId => PlayerId.make(value);

export interface GeneratedTeam {
  readonly setup: MatchTeamSetup;
  readonly squad: ReadonlyArray<MatchPlayerInput & { readonly primaryPosition: Position }>;
}

const withIds = (
  clubId: ClubId,
  squad: ReadonlyArray<GeneratedPlayer>,
): ReadonlyArray<MatchPlayerInput & { readonly primaryPosition: Position }> =>
  squad.map((player, index) => ({
    id: PlayerId.make(`${clubId}-p${index}`),
    attributes: player.attributes,
    primaryPosition: player.positions[0]!.position,
  }));

/** A mid-table first-division club in an average nation — the squad these match-sim fixtures were
 *  written against, spelled out now that club strength reads its competition rather than a tier
 *  enum alone. */
const MID_TABLE: ClubStrength = { tier: 1, nationPrior: 0.5, statureTier: "mid" };

/** Builds a full squad + a Tactic filling every Formation slot from a natural-fit player, for match-sim tests. */
export const buildTeam = (clubId: ClubId, seed: number, formation: keyof typeof FORMATION_SLOTS = "4-4-2"): GeneratedTeam => {
  const squad = withIds(
    clubId,
    generateSquad(MID_TABLE, {
      referenceYear: 2026,
      randomForSlot: (slot) => createSeededRng(deriveSeed(seed, "player", slot.index)),
    }),
  );

  const usedIds = new Set<PlayerId>();
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
