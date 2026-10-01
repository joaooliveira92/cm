import type { ClubId, InjuryView } from "@cm-clone/contracts";
import { REFETCH_THRESHOLD } from "../../rpc.js";

export interface PollReadiness {
  readonly fetching: boolean;
  readonly streamComplete: boolean;
  readonly paused: boolean;
  readonly bufferLength: number;
}

export const shouldPollMatch = ({
  fetching,
  streamComplete,
  paused,
  bufferLength,
}: PollReadiness): boolean =>
  !fetching && !streamComplete && !paused && bufferLength <= REFETCH_THRESHOLD;

export const shouldPauseMatch = (
  injuries: ReadonlyArray<InjuryView>,
  clubId: ClubId,
  capReached: boolean,
): boolean => injuries.some((injury) => injury.teamClubId === clubId) && capReached;

export type PaceDecision = "wait" | "reveal" | "complete";

export interface PaceDecisionInput {
  readonly paused: boolean;
  readonly bufferLength: number;
  readonly streamComplete: boolean;
}

export const nextPaceDecision = ({
  paused,
  bufferLength,
  streamComplete,
}: PaceDecisionInput): PaceDecision =>
  paused ? "wait" : bufferLength > 0 ? "reveal" : streamComplete ? "complete" : "wait";