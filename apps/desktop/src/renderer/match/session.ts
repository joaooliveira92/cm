import type { SaveId } from "@cm-clone/contracts";
import { clearActiveMatch as clearActiveMatchInner, getActiveMatch, setActiveMatch, subscribeActiveMatch, revealedToFullTime } from "./session/activeMatch.js";
import { clearLiveContext, HALFTIME_MINUTE, getAtHalfTime, getHalfTimeRevealed, getLiveTactic, getRevealedEvents, getRevealedFeed, getRevealedMinute, getRevealedScore, recordClubSubs, recordHalfTimeRevealed, recordLiveTactic, recordRevealedInjuries, recordRevealedLines, recordRevealedMinute, recordRevealedScore } from "./session/revealedFeed.js";

export { getActiveMatch, setActiveMatch, subscribeActiveMatch, revealedToFullTime };
export { HALFTIME_MINUTE, getAtHalfTime, getHalfTimeRevealed, getLiveTactic, getRevealedEvents, getRevealedFeed, getRevealedMinute, getRevealedScore, recordClubSubs, recordHalfTimeRevealed, recordLiveTactic, recordRevealedInjuries, recordRevealedLines, recordRevealedMinute, recordRevealedScore };
export type { ActiveMatchSession, LastRevealedInjury, MatchPhase, RevealedFeed, RevealedInjury, RevealedScore } from "./session/types.js";

export const clearActiveMatch = (saveId: SaveId): void => {
  clearActiveMatchInner(saveId);
  clearLiveContext(saveId);
};