import type { MatchId, SaveId } from "@cm-clone/contracts";
import { resumeSimulation as resumeSimulationRaw, submitMatchCommand as submitMatchCommandRaw } from "../../../src/main/match/index.js";
import { revealed } from "./revealedEvents.js";

/**
 * The read entry points with the raw revealed count branded, so a test call site stays a plain
 * number while the production signatures stay nominal. Shared by the revealed-* specs rather than
 * copied into each.
 */
export const resumeSimulation = (
  savesDir: string,
  saveId: SaveId,
  matchId: MatchId,
  cursor: number,
  revealedEvents: number | null,
) => resumeSimulationRaw(savesDir, saveId, matchId, cursor, revealed(revealedEvents));

export const submitMatchCommand = (
  savesDir: string,
  saveId: SaveId,
  matchId: MatchId,
  cursor: number,
  revealedEvents: number | null,
  requestedMinute: number,
  isHalftime: boolean,
  command: Parameters<typeof submitMatchCommandRaw>[7],
) => submitMatchCommandRaw(savesDir, saveId, matchId, cursor, revealed(revealedEvents), requestedMinute, isHalftime, command);
