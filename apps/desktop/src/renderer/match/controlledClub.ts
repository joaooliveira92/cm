import type { ClubId, MatchPitchView, MatchSummary, RpcSuccess, SubstitutionStatusView } from "@cm-clone/contracts";

/** The club the manager controls in this match, whichever side it plays. */
export const controlledClubId = (match: MatchSummary): ClubId => (match.isHome ? match.homeClubId : match.awayClubId);

/** The controlled club's substitution counts from a match response, as of the revealed position the request sent. */
export const controlledSubs = (
  match: MatchSummary,
  view: RpcSuccess<"resumeSimulation"> | RpcSuccess<"submitMatchCommand">,
): SubstitutionStatusView => (match.isHome ? view.homeSubs : view.awaySubs);

/** The controlled club's pitch from a match response — who is on it and who may still come on — as of
 *  the revealed position the request sent. The substitution pickers list these, never a Tactic. */
export const controlledPitch = (
  match: MatchSummary,
  view: RpcSuccess<"resumeSimulation"> | RpcSuccess<"submitMatchCommand">,
): MatchPitchView => (match.isHome ? view.homePitch : view.awayPitch);

/** The controlled club's head-count from a match response: the size of its pitch, as of the revealed position the request sent. */
export const controlledOnPitchCount = (match: MatchSummary, view: RpcSuccess<"resumeSimulation">): number =>
  match.isHome ? view.homeOnPitchCount : view.awayOnPitchCount;
