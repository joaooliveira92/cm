/**
 * How a shot was struck — one rule read by commentary and by the attribution pass, so both agree on
 * which shots are headers. A set-piece shot follows its Corner/FreeKick/Penalty event directly and
 * carries a placeholder `chanceType`, so the set piece wins; an open-play shot reads its own. A free
 * kick or penalty is struck by its taker; a corner is headed by someone else, the taker's assist.
 */
import type { MatchEvent } from "./events.js";
import type { ShotKind } from "./commentarySections.js";

export type { ShotKind };

export type ShotEvent = Extract<MatchEvent, { readonly _tag: "Goal" | "ShotOnTarget" | "ShotMissed" }>;

export const shotKindFor = (event: ShotEvent, previous: MatchEvent | undefined): ShotKind => {
  if (previous !== undefined && "playerId" in previous && previous.playerId === event.playerId) {
    if (previous._tag === "Penalty") return "penalty";
    if (previous._tag === "FreeKick") return "freeKick";
  }
  // A corner is headed, unless it was played back to the edge of the area for a shot from range, or
  // flicked on at the near post by someone other than the taker.
  if (previous?._tag === "Corner" && previous.teamClubId === event.teamClubId) {
    if (event.chanceType === "longShot") return "longRange";
    const assist = "assistPlayerId" in event ? event.assistPlayerId : undefined;
    return assist !== undefined && assist !== previous.playerId ? "flickOn" : "header";
  }
  if (event.chanceType === "cross") return "header";
  if (event.chanceType === "longShot") return "longRange";
  return "closeRange";
};

/** Whether a shot was a header, the fact the attribution pass credits as a `HeaderDuel`. */
export const isHeaderShot = (event: ShotEvent, previous: MatchEvent | undefined): boolean =>
  shotKindFor(event, previous) === "header";
