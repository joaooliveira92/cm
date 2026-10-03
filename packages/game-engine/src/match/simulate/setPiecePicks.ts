import type { PlayerId } from "@cm-clone/contracts";
import type { MatchPlayerInput } from "../types.js";

// ─── Attribute reading ──────────────────────────────────────────────────────

/** Read a numeric attribute from a player, defaulting to 10 (the mid-point on the 1-20 scale). */
export const attributeValue = (player: MatchPlayerInput, attr: string): number => {
  const attrs = player.attributes as Record<string, number | undefined>;
  return attrs[attr] ?? 10;
};

// ─── Taker selection ────────────────────────────────────────────────────────

/**
 * Pick a taker for a set piece from the ordered taker list.
 *
 * The first nominee in the list who is on the pitch takes it. If none are on the
 * pitch, fall back to the on-pitch player with the highest relevant attribute.
 * The captain list is tried for captaincy only — the captain has no match effect.
 *
 * Returns `null` only when the on-pitch player set is empty (should not happen
 * during normal play unless the team has been reduced to 0 on-pitch).
 */
export const pickTaker = (
  takerList: ReadonlyArray<PlayerId>,
  onPitchPlayerIds: ReadonlySet<PlayerId>,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  attributeSelector: (player: MatchPlayerInput) => number,
): PlayerId | null => {
  // 1. First nominee in the list who is on the pitch
  for (const id of takerList) {
    if (onPitchPlayerIds.has(id)) return id;
  }

  // 2. No nominee on pitch — fall back to best attribute on pitch
  let best: PlayerId | null = null;
  let bestScore = -1;
  for (const id of onPitchPlayerIds) {
    const player = playersById.get(id);
    if (!player) continue;
    const score = attributeSelector(player);
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
};
