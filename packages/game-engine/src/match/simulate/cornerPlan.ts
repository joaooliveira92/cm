import type { PlayerId } from "@cm-clone/contracts";
import type { SetPieceRoles, TeamSetPieces } from "@cm-clone/shared";
import type { ResolvedSlot } from "../tactical-modifiers.js";
import {
  CORNER_BOX_PRESENCE_FLOOR,
  CORNER_CHALLENGE_KEEPER_FACTOR,
  CORNER_FLICK_ON_BONUS,
  CORNER_ROLE_MATCH_BONUS,
} from "./constants.js";
import { attributeValue, pickTaker } from "./setPiecePicks.js";
import type { TeamRuntimeState } from "./teamState.js";

/** How a corner is delivered, from the team's set-piece instructions for that side. */
export type CornerDelivery = TeamSetPieces["cornersLeft"];

type AttackCornerRole = SetPieceRoles["attackCorner"];

/**
 * What a corner turns into once the attacking side's instructions are read:
 * - a header by a player in the box, which the defence then tries to deal with;
 * - a shot from the edge of the area, for a corner played back to a player waiting there;
 * - a short corner to the player offering for it, kept rather than shot.
 */
export type CornerPlan =
  | {
      readonly kind: "header";
      readonly headerId: PlayerId;
      readonly assistId: PlayerId | undefined;
      /** Multiplies the header's attack value. */
      readonly attackFactor: number;
      /** Multiplies the defence's value against it. */
      readonly defenceFactor: number;
    }
  | { readonly kind: "volley"; readonly shooterId: PlayerId; readonly assistId: PlayerId }
  | { readonly kind: "short"; readonly receiverId: PlayerId };

/** Roles that keep a player out of the six-yard and penalty-spot scrum. */
const STAYS_OUT_OF_THE_BOX: ReadonlySet<AttackCornerRole> = new Set<AttackCornerRole>([
  "alwaysStayBack",
  "stayBackIfNeeded",
  "lurkOutsideArea",
  "attackBallFromEdgeOfArea",
  "offerShortOption",
]);

/** For each aimed delivery, the roles that put a player where the ball is going. */
const ROLES_FOR_DELIVERY: Partial<Record<CornerDelivery, ReadonlySet<AttackCornerRole>>> = {
  nearPost: new Set<AttackCornerRole>(["attackNearPost", "nearPostFlickOn"]),
  farPost: new Set<AttackCornerRole>(["attackFarPost", "standOnFarPost"]),
  edgeOfSixYardBox: new Set<AttackCornerRole>(["challengeGoalkeeper", "goForward"]),
};

const FAR_POST_ROLES: ReadonlySet<AttackCornerRole> = new Set<AttackCornerRole>(["attackFarPost", "standOnFarPost"]);

const roleOf = (slot: ResolvedSlot): AttackCornerRole => slot.setPieceRoles.attackCorner;

/** The best of `slots` at `attribute`, ties to the earlier slot; null when there are none. */
const bestAt = (team: TeamRuntimeState, slots: ReadonlyArray<ResolvedSlot>, attribute: string): PlayerId | null =>
  slots.length === 0 ? null : pickTaker([], new Set(slots.map((slot) => slot.playerId)), team.playersById, (player) => attributeValue(player, attribute));

const withRole = (slots: ReadonlyArray<ResolvedSlot>, roles: ReadonlySet<AttackCornerRole>): ReadonlyArray<ResolvedSlot> =>
  slots.filter((slot) => roles.has(roleOf(slot)));

/**
 * Reads the attacking side's corner instructions (set-piece-roles 02). The roles decide who is in the box
 * and where; the delivery picks the target among them, or makes the corner a shot from the edge or a short
 * one when someone has that role. Every pick is deterministic, so a plan draws no random numbers.
 *
 * With every role and the delivery at `default` this is exactly the old rule: the best header among the
 * outfield players other than the taker, assisted by the taker, with both factors at 1. A side down to its
 * taker and keeper sends the taker in.
 */
export const planCorner = (team: TeamRuntimeState, takerId: PlayerId, delivery: CornerDelivery): CornerPlan => {
  const outfield = team.resolved.slots.filter((slot) => !slot.isGoalkeeper && slot.playerId !== takerId);

  if (delivery === "short") {
    const receiver = withRole(outfield, new Set<AttackCornerRole>(["offerShortOption"]))[0];
    if (receiver !== undefined) return { kind: "short", receiverId: receiver.playerId };
  }
  if (delivery === "edgeOfArea") {
    const shooterId =
      bestAt(team, withRole(outfield, new Set<AttackCornerRole>(["attackBallFromEdgeOfArea"])), "shooting") ??
      bestAt(team, withRole(outfield, new Set<AttackCornerRole>(["lurkOutsideArea"])), "shooting");
    if (shooterId !== null) return { kind: "volley", shooterId, assistId: takerId };
  }

  const inTheBox = outfield.filter((slot) => !STAYS_OUT_OF_THE_BOX.has(roleOf(slot)));
  const pool = inTheBox.length > 0 ? inTheBox : outfield;
  if (pool.length === 0) return { kind: "header", headerId: takerId, assistId: undefined, attackFactor: 1, defenceFactor: 1 };

  const aimedRoles = ROLES_FOR_DELIVERY[delivery];
  const aimedAt = aimedRoles === undefined ? [] : withRole(pool, aimedRoles);
  let headerId = bestAt(team, aimedAt.length > 0 ? aimedAt : pool, "heading")!;
  let assistId: PlayerId = takerId;
  let attackFactor = aimedAt.length > 0 ? CORNER_ROLE_MATCH_BONUS : 1;

  const header = pool.find((slot) => slot.playerId === headerId)!;
  if (delivery === "nearPost" && roleOf(header) === "nearPostFlickOn") {
    const farPost = bestAt(team, withRole(pool, FAR_POST_ROLES).filter((slot) => slot.playerId !== headerId), "heading");
    if (farPost !== null) {
      assistId = headerId;
      headerId = farPost;
      attackFactor *= CORNER_FLICK_ON_BONUS;
    }
  }

  if (inTheBox.length < outfield.length) {
    attackFactor *= CORNER_BOX_PRESENCE_FLOOR + (1 - CORNER_BOX_PRESENCE_FLOOR) * (inTheBox.length / outfield.length);
  }
  const keeperChallenged = pool.some((slot) => slot.playerId !== headerId && roleOf(slot) === "challengeGoalkeeper");

  return {
    kind: "header",
    headerId,
    assistId,
    attackFactor,
    defenceFactor: keeperChallenged ? CORNER_CHALLENGE_KEEPER_FACTOR : 1,
  };
};
