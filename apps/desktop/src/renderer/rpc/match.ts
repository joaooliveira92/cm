import type { RpcPayload, SaveId } from "@cm-clone/contracts";
import { call } from "./call.js";
import type { RpcRead } from "./precareer.js";

/**
 * Match-day calls. Deliberately NOT SWR- or atom-backed: a running match must
 * never show stale progress, so `resumeSimulation` is polled by MatchDay's own
 * hand-rolled loop (its pacing constants live in `./pacing.ts`). The seam only
 * provides typed calls plus the start/command mutations.
 */
export const listOpponentClubs = (saveId: SaveId): RpcRead<"listOpponentClubs"> =>
  call("listOpponentClubs", { saveId });

export const startMatch = (input: RpcPayload<"startMatch">): RpcRead<"startMatch"> =>
  call("startMatch", input);

export const resumeSimulation = (input: RpcPayload<"resumeSimulation">): RpcRead<"resumeSimulation"> =>
  call("resumeSimulation", input);