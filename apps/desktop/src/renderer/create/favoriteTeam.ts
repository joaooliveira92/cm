import type { ClubId, SaveId } from "@cm-clone/contracts";
import { provisionalIdOf, type GenerationState } from "./generation.js";

/**
 * The manager's favorite team, bound to the world it was picked from.
 *
 * A club id is only meaningful against the provisional world that generated it, so the record
 * carries `provisionalId` for the same reason `ClubSelectionRecord` does: carrying the world id
 * beside the club id makes a stale pick (from a replaced world) representable and therefore
 * checkable. `clubName` rides along because the review step renders it and the club rows die with
 * the selection screen.
 */
export interface FavoriteTeamRecord {
  readonly clubId: ClubId;
  readonly clubName: string;
  readonly provisionalId: SaveId;
}

/** The shape `selectedFavoriteTeamOf` reads — the creation session, structurally. */
export interface FavoriteTeamBinding {
  readonly favoriteTeam: FavoriteTeamRecord | null;
  readonly generation: GenerationState;
}

/**
 * The chosen favorite team, or `null` when there is none *for the current world*. `null` is both
 * first paint (nothing is ever auto-selected) and the state a world swap produces, so this is the
 * single read path — anything reading `session.favoriteTeam` directly sees a team the rest of the
 * flow considers unselected.
 */
export const selectedFavoriteTeamOf = (
  session: FavoriteTeamBinding,
): FavoriteTeamRecord | null => {
  const selection = session.favoriteTeam;
  if (selection === null) return null;
  return selection.provisionalId === provisionalIdOf(session.generation) ? selection : null;
};
