import type { RpcPayload } from "@cm-clone/contracts";
import { call } from "./call.js";
import type { RpcRead } from "./precareer.js";

/**
 * Match-day calls. Deliberately NOT SWR- or atom-backed: a running match must
 * never show stale progress, so `resumeSimulation` is polled by MatchDay's own
 * hand-rolled loop (its pacing constants live in `./pacing.ts`). Starting a match and
 * accepting its result change the season read, so they are mutations in `./mutations.ts`
 * (`startMatchMutation`, `commitMatchdayMutation`), not plain calls here.
 */

/** The save's awaiting match, for a Match day that mounts after an app restart with no match of its
 *  own in memory. */
export const getAwaitingMatch = (input: RpcPayload<"getAwaitingMatch">): RpcRead<"getAwaitingMatch"> =>
  call("getAwaitingMatch", input);

export const resumeSimulation = (input: RpcPayload<"resumeSimulation">): RpcRead<"resumeSimulation"> =>
  call("resumeSimulation", input);

export const getTeamSheet = (input: RpcPayload<"getTeamSheet">): RpcRead<"getTeamSheet"> =>
  call("getTeamSheet", input);

export const getPostMatchSummary = (input: RpcPayload<"getPostMatchSummary">): RpcRead<"getPostMatchSummary"> =>
  call("getPostMatchSummary", input);

export const getMatchReport = (input: RpcPayload<"getMatchReport">): RpcRead<"getMatchReport"> =>
  call("getMatchReport", input);

export const getMatchStatistics = (input: RpcPayload<"getMatchStatistics">): RpcRead<"getMatchStatistics"> =>
  call("getMatchStatistics", input);
