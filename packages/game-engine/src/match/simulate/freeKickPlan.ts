import type { PlayerId } from "@cm-clone/contracts";
import type { SetPieceRoles, TeamSetPieces } from "@cm-clone/shared";
import type { ResolvedSlot } from "../tactical-modifiers.js";
import {
  CORNER_DEFENCE_PRESENCE_FLOOR,
  CORNER_MAN_MARK_BONUS,
  CORNER_ROLE_MATCH_BONUS,
  CORNER_ZONAL_BONUS,
  FREE_KICK_DECOY_BONUS,
  FREE_KICK_DISRUPT_KEEPER_FACTOR,
  FREE_KICK_DISRUPT_WALL_BONUS,
  FREE_KICK_WALL_BONUS_PER_PLAYER,
  FREE_KICK_WALL_MAX,
} from "./constants.js";
import { attributeValue, pickTaker } from "./setPiecePicks.js";
import type { TeamRuntimeState } from "./teamState.js";

/** How a free kick is delivered, from the team's set-piece instructions for that side. */
export type FreeKickDelivery = TeamSetPieces["freeKicksLeft"];

type AttackFreeKickRole = SetPieceRoles["attackFreeKick"];
type DefendFreeKickRole = SetPieceRoles["defendFreeKick"];

/**
 * What a free kick turns into:
 * - a direct shot by the taker, as every free kick used to be;
 * - a cross headed by a player in the box;
 * - a short or long ball that keeps possession, with no shot.
 */
export type FreeKickPlan =
  | { readonly kind: "shot"; readonly attackFactor: number; readonly keeperFactor: number }
  | { readonly kind: "header"; readonly headerId: PlayerId; readonly attackFactor: number }
  | { readonly kind: "kept" };

/** Roles that keep a player out of the box when the free kick is crossed. */
const STAYS_OUT_OF_THE_BOX: ReadonlySet<AttackFreeKickRole> = new Set<AttackFreeKickRole>([
  "alwaysStayBack",
  "stayBackIfNeeded",
  "standWithTaker",
  "runOverBall",
  "disruptWall",
]);

const CROSSES: ReadonlySet<FreeKickDelivery> = new Set<FreeKickDelivery>(["crossNear", "crossFar", "crossCentre", "aimForBestHeader"]);

const attackRoleOf = (slot: ResolvedSlot): AttackFreeKickRole => slot.setPieceRoles.attackFreeKick;

/**
 * Reads the attacking side's free-kick instructions (set-piece-roles 04). The delivery decides between a
 * direct shot, a cross and keeping the ball; the roles decide who is in the box for a cross, and help a
 * direct shot by disrupting the wall or the goalkeeper or running past the ball as a decoy. Every pick
 * is deterministic. At `default` delivery with default roles it is the old direct shot, both factors 1.
 */
export const planFreeKick = (team: TeamRuntimeState, takerId: PlayerId, delivery: FreeKickDelivery): FreeKickPlan => {
  if (delivery === "short" || delivery === "long") return { kind: "kept" };
  const outfield = team.resolved.slots.filter((slot) => !slot.isGoalkeeper && slot.playerId !== takerId);

  if (CROSSES.has(delivery)) {
    const inTheBox = outfield.filter((slot) => !STAYS_OUT_OF_THE_BOX.has(attackRoleOf(slot)));
    const pool = inTheBox.length > 0 ? inTheBox : outfield;
    if (pool.length > 0) {
      const headerId = pickTaker([], new Set(pool.map((slot) => slot.playerId)), team.playersById, (player) => attributeValue(player, "heading"))!;
      return { kind: "header", headerId, attackFactor: delivery === "aimForBestHeader" ? CORNER_ROLE_MATCH_BONUS : 1 };
    }
  }

  const roles = new Set<AttackFreeKickRole>(outfield.map(attackRoleOf));
  let attackFactor = 1;
  if (roles.has("disruptWall")) attackFactor *= FREE_KICK_DISRUPT_WALL_BONUS;
  if (roles.has("standWithTaker") || roles.has("runOverBall")) attackFactor *= FREE_KICK_DECOY_BONUS;
  return { kind: "shot", attackFactor, keeperFactor: roles.has("disruptGoalkeeper") ? FREE_KICK_DISRUPT_KEEPER_FACTOR : 1 };
};

/**
 * How the defending side's free-kick roles change its value against `plan`, as one multiplier; exactly
 * 1 when every role is `default`. Players forming the wall make a direct shot harder, each one up to
 * four; against a cross, players left forward thin the box, and zonal and man-marking defenders help.
 */
export const defendFreeKickFactor = (defending: TeamRuntimeState, delivery: FreeKickDelivery, plan: FreeKickPlan): number => {
  if (plan.kind === "kept") return 1;
  const outfield = defending.resolved.slots.filter((slot) => !slot.isGoalkeeper);
  const roleOf = (slot: ResolvedSlot): DefendFreeKickRole => slot.setPieceRoles.defendFreeKick;
  const roles = new Set<DefendFreeKickRole>(outfield.map(roleOf));
  if (roles.size === 1 && roles.has("default")) return 1;

  if (plan.kind === "shot") {
    const wall = Math.min(FREE_KICK_WALL_MAX, outfield.filter((slot) => roleOf(slot) === "formWall").length);
    return 1 + FREE_KICK_WALL_BONUS_PER_PLAYER * wall;
  }

  let factor = 1;
  const back = outfield.filter((slot) => roleOf(slot) !== "forward");
  if (back.length < outfield.length) {
    factor *= CORNER_DEFENCE_PRESENCE_FLOOR + (1 - CORNER_DEFENCE_PRESENCE_FLOOR) * (back.length / outfield.length);
  }
  if ((delivery === "crossNear" && roles.has("nearPost")) || (delivery === "crossFar" && roles.has("farPost"))) {
    factor *= CORNER_ZONAL_BONUS;
  }
  if (roles.has("manMark")) factor *= CORNER_MAN_MARK_BONUS;
  return factor;
};
