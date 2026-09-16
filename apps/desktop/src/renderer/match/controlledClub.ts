import type { ClubId, MatchSummary, RpcSuccess, SubstitutionStatusView } from "@cm-clone/contracts";

/** The club the manager controls in this match, whichever side it plays. */
export const controlledClubId = (match: MatchSummary): ClubId => (match.isHome ? match.homeClubId : match.awayClubId);

/** The controlled club's substitution counts from a match response, as of the revealed position the request sent. */
export const controlledSubs = (
  match: MatchSummary,
  view: RpcSuccess<"resumeSimulation"> | RpcSuccess<"submitMatchCommand">,
): SubstitutionStatusView => (match.isHome ? view.homeSubs : view.awaySubs);

/** The controlled club's head-count at the end of the chunk a response describes. */
export const controlledOnPitchCount = (match: MatchSummary, view: RpcSuccess<"submitMatchCommand">): number =>
  match.isHome ? view.homeOnPitchCount : view.awayOnPitchCount;
