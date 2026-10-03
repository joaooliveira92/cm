import type { SquadPlayerView, Tactic } from "@cm-clone/contracts";
import type { Slot } from "@cm-clone/shared";
import { CM_PANEL_CLASS } from "./cmChrome.js";
import { FormationPitch } from "./FormationPitch.js";
import { SetInstructionsPanel } from "./SetInstructionsPanel.js";
import { SetPrioritiesPanel } from "./SetPrioritiesPanel.js";
import type { ColumnVisibility, Mode } from "./tacticsTypes.js";

/** The right area: the pitch in positions mode, or the instructions/priorities panel. */
export const TacticsModeArea = ({
  mode,
  tactic,
  squad,
  squadById,
  selectedSlot,
  columns,
  onSelectSlot,
  onSwap,
  onMove,
  onToggleRun,
  onTacticChange,
}: {
  readonly mode: Mode;
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly selectedSlot: number | null;
  readonly columns: ColumnVisibility;
  readonly onSelectSlot: (slotIndex: number | null) => void;
  readonly onSwap: (from: number, to: number) => void;
  readonly onMove: (index: number, cell: Slot, subRow?: number, subCol?: number) => void;
  readonly onToggleRun: (slotIndex: number, target: Slot | null) => void;
  readonly onTacticChange: (tactic: Tactic) => void;
}) => (
  <div
    className={`flex min-h-0 flex-col ${
      mode === "positions" ? "w-[min(calc(68cqh+1.75rem),60cqw)] shrink-0" : "min-w-[28rem] flex-1"
    }`}
  >
    {mode === "positions" && (
      <section
        aria-label="Positions"
        className={`${CM_PANEL_CLASS} flex-1 items-center justify-center px-3 [container-type:size]`}
      >
        <FormationPitch
          formation={tactic.sourceTemplate}
          slots={tactic.slots}
          assignments={tactic.assignments}
          squadById={squadById}
          selectedSlot={selectedSlot}
          onSelectSlot={onSelectSlot}
          onSwap={onSwap}
          onMove={onMove}
          onToggleRun={onToggleRun}
          pitchView={{ position: columns.pos, fit: columns.fit, condition: columns.condition }}
        />
      </section>
    )}

    {mode === "instructions" && (
      <SetInstructionsPanel
        tactic={tactic}
        squadById={squadById}
        selectedSlot={selectedSlot}
        onSelectSlot={onSelectSlot}
        onTacticChange={onTacticChange}
      />
    )}

    {mode === "priorities" && (
      <SetPrioritiesPanel
        tactic={tactic}
        squad={squad}
        squadById={squadById}
        onTacticChange={onTacticChange}
      />
    )}
  </div>
);
