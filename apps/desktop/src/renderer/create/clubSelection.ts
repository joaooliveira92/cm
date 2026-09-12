import type { ClubId, SaveId } from "@cm-clone/contracts";
import { provisionalIdOf, type GenerationState } from "./generation.js";

/**
 * The club the player picked, bound to the world it was picked from.
 *
 * A club id is only meaningful against the provisional world that generated it: `commitCareer`
 * matches it by id, and an id from a replaced world matches nothing. Carrying `provisionalId`
 * beside the id makes that mismatch representable and therefore checkable, instead of resting on
 * an invariant stated nowhere. `clubName` rides along because the review step renders it and the
 * club rows die with the selection screen.
 */
export interface ClubSelectionRecord {
  readonly clubId: ClubId;
  readonly clubName: string;
  readonly provisionalId: SaveId;
}

/** The shape `selectedClubOf` reads — the creation session, structurally, so the helper stays
 *  independent of the context module that owns the full session type. */
export interface ClubSelectionBinding {
  readonly clubSelection: ClubSelectionRecord | null;
  readonly generation: GenerationState;
}

/**
 * The chosen club, or `null` when there is none *for the current world*. `null` is both first
 * paint (nothing is ever auto-selected) and the state a world swap produces.
 *
 * The stale record is left in place rather than cleared: clearing it would mean writing state
 * from an effect whose only job is to make a derived value agree with itself. That makes this the
 * single read path — anything reading `session.clubSelection` directly sees a club the rest of the
 * flow considers unselected.
 */
export const selectedClubOf = (session: ClubSelectionBinding): ClubSelectionRecord | null => {
  const selection = session.clubSelection;
  if (selection === null) return null;
  return selection.provisionalId === provisionalIdOf(session.generation) ? selection : null;
};
