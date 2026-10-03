import type { PlayerId, SquadPlayerView, Tactic } from "@cm-clone/contracts";
import { CM_PANEL_CLASS, CM_PANEL_TITLE_CLASS } from "./cmChrome.js";
import { TeamSelectionGrid } from "./TeamSelectionGrid.js";
import type { ColumnVisibility, Mode } from "./tacticsTypes.js";

/** The left column: the Team Selection grid and its interaction hint. */
export const TeamSelectionPanel = ({
  tactic,
  squad,
  mode,
  selectedSlot,
  columns,
  onSelectSlot,
  onSwap,
  onAssign,
}: {
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly mode: Mode;
  readonly selectedSlot: number | null;
  readonly columns: ColumnVisibility;
  readonly onSelectSlot: (slotIndex: number | null) => void;
  readonly onSwap: (from: number, to: number) => void;
  readonly onAssign: (slotIndex: number, playerId: PlayerId) => void;
}) => (
  <section
    aria-label="Team Selection"
    className={`${CM_PANEL_CLASS} @container min-w-0 ${mode === "positions" ? "flex-1" : "shrink basis-[34rem]"}`}
  >
    <h2 className={CM_PANEL_TITLE_CLASS}>Team Selection</h2>
    <div className="min-h-0 flex-1 overflow-y-auto px-1">
      <TeamSelectionGrid
        tactic={tactic}
        squad={squad}
        selectedSlot={selectedSlot}
        onSelectSlot={onSelectSlot}
        onSwap={onSwap}
        onAssign={onAssign}
        columns={columns}
      />
    </div>
    <p className="shrink-0 border-t border-white/10 px-3 py-1.5 text-caption text-text-secondary">
      Click a starter to select; then click a substitute or reserve to bring him in, or an empty cell on the pitch to move.
    </p>
  </section>
);
