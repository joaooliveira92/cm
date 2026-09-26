/**
 * Transfer Target Comparison (Screen 129, ticket 12): a stub so the router compiles. The real
 * screen is implemented in `apps/desktop/src/renderer/playerComparison/PlayerComparisonScreen.tsx`;
 * this file exists only to satisfy the router's import until that work lands.
 */
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

const STUB_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const PlayerComparisonScreen = ({
  saveId,
  playerIds,
}: {
  readonly saveId: SaveId;
  readonly playerIds: ReadonlyArray<PlayerId>;
}) => (
  <div className={STUB_CLASS}>
    <p className="text-sm text-text-secondary">
      Transfer Target Comparison — save {String(saveId)}, {playerIds.length} player
      {playerIds.length === 1 ? "" : "s"} selected.
    </p>
  </div>
);