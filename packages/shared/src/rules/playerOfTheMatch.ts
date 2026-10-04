/**
 * Player of the Match (match-screen ticket 20): the one player with the highest Match Rating across
 * both sides at full time.
 *
 * The tie-break is deterministic and locale-free: goals, then assists, then the winning side's
 * player, then player id by `compareCodeUnits`, so the same match always names the same man. It is
 * computed on read, never stored, so it moves with the rating weights.
 */
import { compareCodeUnits } from "@cm-clone/content";

export interface PlayerOfTheMatchCandidate {
  readonly playerId: string;
  readonly rating: number;
  readonly goals: number;
  readonly assists: number;
  /** Whether the player's club won the match. */
  readonly won: boolean;
}

export const playerOfTheMatch = (
  candidates: ReadonlyArray<PlayerOfTheMatchCandidate>,
): string | null => {
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) =>
      b.rating - a.rating ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      Number(b.won) - Number(a.won) ||
      compareCodeUnits(a.playerId, b.playerId),
  )[0]!.playerId;
};
