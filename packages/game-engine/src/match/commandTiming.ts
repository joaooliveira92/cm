import { HALF_LENGTH_MINUTES } from "./simulate/constants.js";

/**
 * The minute a live command takes effect: the first minute the manager has not yet seen any of
 * (group-g-match-day ticket 20, decision request 08 Option A; Agent Note: revealed play is immutable).
 *
 * The engine applies a minute's commands at the start of that minute, before its Minute-Slice
 * resolves, and only for the regular minutes 1–45 and 46–90. Stoppage slices apply none. So a command
 * given while minute M is on screen takes effect at M+1, never at M: stamping it at M would
 * re-simulate a minute whose lines the manager has already been shown.
 *
 * - First half, before minute 45 is shown: M+1.
 * - Minute 45 or first-half stoppage shown, or the half-time boundary: 46, the second half's first
 *   minute. A halftime instruction is the separate `isHalftime` path, applied at the break itself.
 * - Second half: M+1. Once minute 90 or stoppage is shown there is no minute left, and the command
 *   is journaled with a minute the engine never reaches, so it changes nothing.
 *
 * `revealedMinute` is the minute of the last revealed Match Event (0 before kickoff).
 * `halfTimeRevealed` says whether `HalfTimeReached` is among them, because first-half stoppage
 * events carry minutes above 45 too.
 */
export const nextCommandMinute = (revealedMinute: number, halfTimeRevealed: boolean): number => {
  const firstSecondHalfMinute = HALF_LENGTH_MINUTES + 1;
  if (!halfTimeRevealed) return revealedMinute < HALF_LENGTH_MINUTES ? Math.max(1, revealedMinute + 1) : firstSecondHalfMinute;
  return Math.max(firstSecondHalfMinute, revealedMinute + 1);
};
