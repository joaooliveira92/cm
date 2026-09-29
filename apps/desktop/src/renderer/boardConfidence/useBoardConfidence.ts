import { type BoardConfidenceView, type SaveId } from "@cm-clone/contracts";
import { boardConfidenceAtom, readState, type ReadState, useAtomValue } from "../rpc.js";

/**
 * The board-confidence read as a screen can render it: loading line, failure line, or the view.
 * `getBoardConfidence` is save-scoped — `board_objective` is keyed on `season_number` and names the
 * human's club, so a rival has no Board Objective for a club-scoped read to return. This hook never
 * takes a `clubId`; the screen should never acquire a `club/$clubId/board-confidence` route.
 */
export const useBoardConfidence = (saveId: SaveId): ReadState<BoardConfidenceView> =>
  readState(useAtomValue(boardConfidenceAtom(saveId)), {
    loading: "Loading board confidence...",
    failed: "Board confidence could not be loaded.",
  });