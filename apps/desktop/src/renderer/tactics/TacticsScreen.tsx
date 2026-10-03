import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Tactic, type PlayerId, type SaveId, type SquadPlayerView } from "@cm-clone/contracts";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { useScreenBottomBarActions } from "../chrome/bottom-bar/index.js";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import {
  BUILT_IN_TEMPLATE_NAMES,
  builtInTemplate,
  emptyBench,
  isModified,
  tacticFromTemplate,
  type Slot,
  type TeamInstructions,
} from "@cm-clone/shared";
import { assistantLineupOf, reseatStarters, swapLineupSlots } from "../squad/lineupEdits.js";
import { CM_BUTTON_CLASS, CM_PANEL_CLASS, CM_PANEL_TITLE_CLASS } from "./cmChrome.js";
import { FormationPitch } from "./FormationPitch.js";
import { SetPrioritiesPanel } from "./SetPrioritiesPanel.js";
import { SetInstructionsPanel } from "./SetInstructionsPanel.js";
import { TeamSelectionGrid } from "./TeamSelectionGrid.js";
import { NO_PLAYER, useTacticDraft } from "./useTacticDraft.js";
import { describeRpcError } from "../rpc.js";

// ── Pure tactic transforms ──────────────────────────────────────
//
// Editing a Tactic is a pipeline of immutable value transforms, so a caller can describe a change
// ("move this slot", "clear the selection") without touching React or the draft lifecycle.

/** Whether the Tactic has moved off the built-in template it is named for. */
const isModifiedFromTemplate = (tactic: Tactic): boolean => {
  const source = builtInTemplate(tactic.sourceTemplate);
  return source !== undefined && isModified(tactic, source);
};

/** Choosing another template loads its slots, instructions and set-piece settings over the Tactic.
 *  The selection survives: the same eleven reseated in the new shape where each fits best, and the
 *  bench and takers kept. Picking the current one again only resets a modified Tactic to its
 *  template, keeping every slot's player. */
const changeTemplate = (tactic: Tactic, name: string, squad: ReadonlyArray<SquadPlayerView>): Tactic => {
  const template = builtInTemplate(name);
  if (template === undefined) return tactic;
  const assignments =
    name === tactic.sourceTemplate
      ? tactic.assignments
      : reseatStarters(
          tactic.assignments,
          template.slots.map((slot) => slot.cell),
          squad,
        );
  return new Tactic({ ...tacticFromTemplate(template, assignments, tactic.bench), takers: tactic.takers });
};

/** One slot moved to another outfield cell: the template's shape becomes a modified one. A run that
 *  would end where the slot now stands is dropped. `subRow`/`subCol` default to centre (0.5). */
const moveSlot = (tactic: Tactic, slotIndex: number, cell: Slot, subRow: number = 0.5, subCol: number = 0.5): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) =>
      index === slotIndex
        ? {
            ...slot,
            cell,
            subRow,
            subCol,
            run: slot.run !== null && slot.run.row === cell.row && slot.run.column === cell.column ? null : slot.run,
          }
        : slot,
    ),
  });

/** Toggle (or set) a slot's run target. When `target` is `null`, the run is cleared. */
const toggleRun = (tactic: Tactic, slotIndex: number, target: Slot | null): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) =>
      index === slotIndex ? { ...slot, run: target } : slot,
    ),
  });

/** Every starter slot and bench place emptied, and the takers with them; the shape and instructions
 *  stay. The server refuses a Tactic with an empty starter, so this is a draft to refill, never a
 *  save on its own. */
const clearSelection = (tactic: Tactic): Tactic =>
  new Tactic({
    ...tactic,
    assignments: tactic.assignments.map(() => NO_PLAYER),
    bench: emptyBench(),
    takers: {
      captain: [],
      penalties: [],
      freeKicksLeft: [],
      freeKicksRight: [],
      cornersLeft: [],
      cornersRight: [],
      throwInsLeft: [],
      throwInsRight: [],
    },
  });

const hasSelection = (tactic: Tactic): boolean =>
  tactic.assignments.some((playerId) => playerId !== "") || tactic.bench.some((place) => place !== null);

const changeSlotPlayer = (tactic: Tactic, slotIndex: number, playerId: PlayerId): Tactic =>
  new Tactic({
    ...tactic,
    assignments: tactic.assignments.map((assigned, index) => (index === slotIndex ? playerId : assigned)),
  });

/** The next starter slot after `from` that still names nobody, wrapping round; `null` once the
 *  eleven is full. Filling an empty slot moves the selection here, so an eleven is picked by
 *  clicking players in turn. */
const nextEmptySlot = (tactic: Tactic, from: number): number | null => {
  const count = tactic.assignments.length;
  for (let step = 1; step <= count; step++) {
    const index = (from + step) % count;
    if (tactic.assignments[index] === NO_PLAYER) return index;
  }
  return null;
};

/** The one conflict sentence, rendered as the `role="alert"` span beside the Refresh button. */
const CONFLICT_MESSAGE =
  "A newer tactic was saved since you loaded this page. Your draft is kept — refresh to load the current version.";

type Mode = "positions" | "instructions" | "priorities";

/** Which of the Team Selection table's optional columns are shown. */
interface ColumnVisibility {
  readonly pos: boolean;
  readonly fit: boolean;
  readonly condition: boolean;
}

/** Configuration for in-match mode. When provided, the Tactics screen renders as a standalone
 *  editor inside a `LiveCommandFrame`, receiving all data from the match context instead of loading
 *  it from the server. The outer `<main>` tag is left to `LiveCommandFrame`. */
export interface InMatchTactics {
  /** The current tactic to display and edit. */
  readonly tactic: Tactic;
  /** The squad from the match context, used for player names and selection. */
  readonly squad: ReadonlyArray<SquadPlayerView>;
  /** The controlled club's display name. */
  readonly clubName: string;
  /** Called when the user edits the tactic (seeding an undo stack entry). */
  readonly setTactic: (tactic: Tactic) => void;
  /** Called when Confirm is triggered. */
  readonly onConfirm: () => void;
  /** Called when Undo Last is triggered. */
  readonly onUndoLast: () => void;
  /** Called when Cancel is triggered. */
  readonly onCancel: () => void;
  /** Number of pending (undoable) changes. */
  readonly pendingCount: number;
  /** Validation error to display, or null. */
  readonly validationError: string | null;
  /** True while a command is being submitted. */
  readonly isPending: boolean;
}

// ── Co-located presentational components ────────────────────────
//
// The writable scope is this one file, so the screen's sections live here rather than one per file.
// Each owns a single slice of markup and receives only what it renders; the parent below is left to
// own state, connect hooks and compose them.

/** A CM-style dropdown menu: a button that opens a list of actions in a floating panel. */
const MenuButton = ({
  label,
  items,
}: {
  readonly label: string;
  readonly items: ReadonlyArray<{
    readonly label: string;
    readonly onSelect: () => void;
    readonly current?: boolean;
    readonly disabled?: boolean;
  }>;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={CM_BUTTON_CLASS}
      >
        {label} <span aria-hidden="true">▼</span>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute z-40 mt-1 max-h-80 min-w-56 overflow-auto rounded-panel border border-border bg-popover py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className={`w-full px-3 py-1 text-left text-body transition-colors hover:bg-white/10 ${
                  item.current ? "text-text-highlight font-semibold" : "text-foreground"
                } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** The screen's `<main>` shell. Message states share the plain frame; the workspace adds the
 *  full-height flex layout. */
const TacticsScreenFrame = ({
  children,
  variant,
}: {
  readonly children: ReactNode;
  readonly variant: "message" | "workspace";
}) => (
  <main
    tabIndex={-1}
    data-focus-id="tactics"
    aria-label="Tactics"
    className={
      variant === "workspace"
        ? `flex min-h-0 flex-1 flex-col gap-0 p-3 text-foreground ${FOCUS_RING.join(" ")}`
        : `p-8 text-foreground ${FOCUS_RING.join(" ")}`
    }
  >
    {children}
  </main>
);

/** The formation menu bar: quick-load templates, column toggles, the template label and the
 *  positions/instructions/priorities mode switch. */
const TacticsMenuBar = ({
  isInMatch,
  sourceTemplate,
  modified,
  columns,
  onToggleColumn,
  mode,
  onSelectMode,
}: {
  readonly isInMatch: boolean;
  readonly sourceTemplate: string;
  readonly modified: boolean;
  readonly columns: ColumnVisibility;
  readonly onToggleColumn: (column: keyof ColumnVisibility) => void;
  readonly mode: Mode;
  readonly onSelectMode: (mode: Mode) => void;
}) => {
  const templateItems = useMemo(
    () =>
      BUILT_IN_TEMPLATE_NAMES.map((name) => ({
        label: `${name === sourceTemplate ? "✓ " : ""}Quick Load: ${name}`,
        onSelect: () => void dispatchAction("set-formation", { formation: name }),
        current: name === sourceTemplate,
      })),
    [sourceTemplate],
  );

  return (
    <nav aria-label="Tactics menu" className="flex shrink-0 items-center gap-2 pb-2">
      <MenuButton
        label="File"
        items={
          isInMatch
            ? templateItems
            : [...templateItems, { label: "Save", onSelect: () => void dispatchAction("save-tactic") }]
        }
      />
      <MenuButton
        label="View"
        items={[
          {
            label: `${columns.pos ? "Hide" : "Show"} Position`,
            onSelect: () => onToggleColumn("pos"),
            current: columns.pos,
          },
          {
            label: `${columns.fit ? "Hide" : "Show"} Fit`,
            onSelect: () => onToggleColumn("fit"),
            current: columns.fit,
          },
          {
            label: `${columns.condition ? "Hide" : "Show"} Condition`,
            onSelect: () => onToggleColumn("condition"),
            current: columns.condition,
          },
        ]}
      />
      <span
        data-testid="tactic-template-label"
        className="ml-2 text-label font-semibold text-text-bright [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]"
      >
        {sourceTemplate}
        {modified ? " (modified)" : ""}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-pressed={mode === "positions"}
          onClick={() => onSelectMode("positions")}
          className={CM_BUTTON_CLASS}
        >
          Set Positions
        </button>
        <button
          type="button"
          aria-pressed={mode === "instructions"}
          onClick={() => onSelectMode("instructions")}
          className={CM_BUTTON_CLASS}
        >
          Set Instructions
        </button>
        <button
          type="button"
          aria-pressed={mode === "priorities"}
          onClick={() => onSelectMode("priorities")}
          className={CM_BUTTON_CLASS}
        >
          Set Priorities
        </button>
      </div>
    </nav>
  );
};

/** The left column: the Team Selection grid and its interaction hint. */
const TeamSelectionPanel = ({
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

/** The right area: the pitch in positions mode, or the instructions/priorities panel. */
const TacticsModeArea = ({
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

/** The in-match action bar: validation error, pending-change count and Confirm/Undo/Cancel. */
const InMatchTacticFooter = ({
  validationError,
  pendingCount,
  isPending,
}: {
  readonly validationError: string | null;
  readonly pendingCount: number;
  readonly isPending: boolean;
}) => (
  <>
    {validationError && (
      <p role="alert" className="mt-1 text-data text-text-warning">
        {validationError}
      </p>
    )}

    {pendingCount > 0 && (
      <p className="mt-1 text-data text-text-secondary">
        <Badge variant="warning">{pendingCount} pending change{pendingCount === 1 ? "" : "s"}</Badge>
      </p>
    )}

    <div className="mt-2 flex items-center justify-center gap-3 border-t border-border-subtle pt-2">
      <Button
        type="button"
        variant="default"
        disabled={isPending}
        data-action-id="confirm-live-tactic"
        onClick={() => void dispatchAction("confirm-live-tactic")}
      >
        {isPending ? "Confirming..." : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pendingCount === 0 || isPending}
        data-action-id="undo-live-tactic"
        onClick={() => void dispatchAction("undo-live-tactic")}
      >
        Undo Last
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pendingCount === 0 || isPending}
        data-action-id="cancel-live-tactic"
        onClick={() => void dispatchAction("cancel-live-tactic")}
      >
        Cancel
      </Button>
    </div>
  </>
);

/** The save-conflict bar: a lost write race offers Refresh, and the transient status line. */
const TacticConflictBar = ({
  conflict,
  status,
  onRefresh,
}: {
  readonly conflict: number | null;
  readonly status: string | null;
  readonly onRefresh: () => void;
}) => {
  if (conflict === null && !status) return null;
  return (
    <section className="chrome-gradient mt-2 flex items-center gap-3 rounded-panel border border-panel-border px-3 py-2 shadow-chrome">
      {conflict !== null && (
        <>
          <span role="alert" className="text-body text-text-danger" data-testid="tactic-conflict">
            {CONFLICT_MESSAGE}
          </span>
          <Button
            type="button"
            variant="secondary"
            data-action-id="refresh-tactics"
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </>
      )}
      {status && <span className="text-body text-text-bright">{status}</span>}
    </section>
  );
};

/** Publishes the screen's verbs to the shell's bottom bar while it is mounted. Renders nothing. */
const TacticsBottomBar = ({
  tactic,
  squad,
  enabled,
}: {
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly enabled: boolean;
}) => {
  const selectionPresent = hasSelection(tactic);
  const canField = squad.length >= tactic.slots.length;
  const bottomBarActions = useMemo(
    () => ({
      buttons: [
        {
          id: "assistant-pick-tactic-team",
          actionId: "assistant-pick-tactic-team",
          label: "Assistant Picks Team",
          disabled: !canField,
          onTrigger: () => void dispatchAction("assistant-pick-tactic-team"),
        },
        {
          id: "clear-tactic-selection",
          actionId: "clear-tactic-selection",
          label: "Clear Selection",
          disabled: !selectionPresent,
          onTrigger: () => void dispatchAction("clear-tactic-selection"),
        },
        {
          id: "save-tactic",
          actionId: "save-tactic",
          label: "Save Tactic",
          disabled: false,
          onTrigger: () => void dispatchAction("save-tactic"),
        },
      ],
    }),
    [selectionPresent, canField],
  );
  useScreenBottomBarActions(enabled ? bottomBarActions : null);
  return null;
};

// ── Co-located hooks ────────────────────────────────────────────

/** Registers the screen's action handlers for the lifetime of the mount. The dependency array is
 *  deliberately the one the screen had: `isInMatch` and `inMatch` are fixed per mount, so they are
 *  not listed and the handlers close over the current values as before. */
const useTacticsActionHandlers = ({
  isInMatch,
  inMatch,
  saveId,
  tactic,
  squad,
  revision,
  setTactic,
  save,
}: {
  readonly isInMatch: boolean;
  readonly inMatch: InMatchTactics | undefined;
  readonly saveId: SaveId;
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly revision: number;
  readonly setTactic: (tactic: Tactic) => void;
  readonly save: () => Promise<boolean>;
}): void => {
  useEffect(() => {
    const unregisters: Array<() => void> = [];

    if (!isInMatch) {
      unregisters.push(
        registerActionHandler("save-tactic", () => {
          void save();
        }),
        registerActionHandler("assistant-pick-tactic-team", () => {
          const next = assistantLineupOf(tactic, squad);
          if (next !== null) setTactic(next);
        }),
      );
    }

    if (isInMatch) {
      unregisters.push(
        registerActionHandler("confirm-live-tactic", () => inMatch!.onConfirm()),
        registerActionHandler("undo-live-tactic", () => inMatch!.onUndoLast()),
        registerActionHandler("cancel-live-tactic", () => inMatch!.onCancel()),
      );
    }

    unregisters.push(
      registerActionHandler("set-formation", (params) =>
        setTactic(changeTemplate(tactic, (params as { formation: string }).formation, squad)),
      ),
      registerActionHandler("set-mentality", (params) =>
        setTactic(
          new Tactic({
            ...tactic,
            team: { ...tactic.team, mentality: (params as { value: TeamInstructions["mentality"] }).value },
          }),
        ),
      ),
      registerActionHandler("assign-slot-player", (params) => {
        const p = params as { index: number; playerId: PlayerId };
        setTactic(changeSlotPlayer(tactic, p.index, p.playerId));
      }),
      registerActionHandler("swap-slot-players", (params) => {
        const p = params as { from: number; to: number };
        setTactic(swapLineupSlots(tactic, p.from, p.to));
      }),
      registerActionHandler("set-slot-cell", (params) => {
        const p = params as { index: number; cell: Slot; subRow?: number; subCol?: number };
        setTactic(moveSlot(tactic, p.index, p.cell, p.subRow, p.subCol));
      }),
      registerActionHandler("toggle-slot-run", (params) => {
        const p = params as { index: number; target: Slot | null };
        setTactic(toggleRun(tactic, p.index, p.target));
      }),
      registerActionHandler("clear-tactic-selection", () => setTactic(clearSelection(tactic))),
    );
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [saveId, tactic, squad, revision, setTactic, save]);
};

/** The screen's global keyboard shortcuts: Ctrl/Cmd+S saves (and is swallowed in-match), Escape
 *  clears the selected slot. The empty dependency array matches the effect it replaces: the handler
 *  closes over `isInMatch` and the stable setters. */
const useTacticsShortcuts = ({
  isInMatch,
  setSelectedSlot,
}: {
  readonly isInMatch: boolean;
  readonly setSelectedSlot: (slotIndex: number | null) => void;
}): void => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isInMatch && (event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        return;
      }
      if (!isInMatch && (event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        void dispatchAction("save-tactic");
        return;
      }
      if (event.key === "Escape") {
        setSelectedSlot(null);
        return;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
};

/** The draft-editing commands: the pitch drags, lineup swaps and player assignments, all expressed
 *  as `Tactic` transforms against the current draft. Owns the one rule that spans them — an empty
 *  slot that is filled hands the selection on to the next empty one. */
const useTacticEditing = ({
  tactic,
  setTactic,
  setSelectedSlot,
}: {
  readonly tactic: Tactic;
  readonly setTactic: (tactic: Tactic) => void;
  readonly setSelectedSlot: (slotIndex: number | null) => void;
}) => {
  const handleMove = useCallback(
    (index: number, cell: Slot, subRow?: number, subCol?: number) => {
      setTactic(moveSlot(tactic, index, cell, subRow, subCol));
    },
    [tactic, setTactic],
  );

  const handleSwap = useCallback(
    (from: number, to: number) => {
      setTactic(swapLineupSlots(tactic, from, to));
    },
    [tactic, setTactic],
  );

  /** A substitute or reserve brought into the selected slot. A slot that was empty hands the
   *  selection on to the next empty one; replacing a starter keeps it where it is. */
  const bringIntoSelected = useCallback(
    (slotIndex: number, next: Tactic) => {
      setTactic(next);
      if (tactic.assignments[slotIndex] === NO_PLAYER) setSelectedSlot(nextEmptySlot(next, slotIndex));
    },
    [tactic, setTactic, setSelectedSlot],
  );

  const handleBringIn = useCallback(
    (from: number, to: number) => bringIntoSelected(to, swapLineupSlots(tactic, from, to)),
    [tactic, bringIntoSelected],
  );

  const handleAssign = useCallback(
    (slotIndex: number, playerId: PlayerId) => bringIntoSelected(slotIndex, changeSlotPlayer(tactic, slotIndex, playerId)),
    [tactic, bringIntoSelected],
  );

  const handleToggleRun = useCallback(
    (slotIndex: number, target: Slot | null) => {
      setTactic(toggleRun(tactic, slotIndex, target));
    },
    [tactic, setTactic],
  );

  const handleSelectSlot = useCallback(
    (slotIndex: number | null) => {
      setSelectedSlot(slotIndex);
    },
    [setSelectedSlot],
  );

  return { handleMove, handleSwap, handleBringIn, handleAssign, handleToggleRun, handleSelectSlot };
};

// ── The screen ──────────────────────────────────────────────────

export const TacticsScreen = ({ saveId, inMatch }: { readonly saveId: SaveId; readonly inMatch?: InMatchTactics }) => {
  const isInMatch = inMatch !== undefined;

  // ── Data sources ──────────────────────────────────────────────

  const draftHooks = !isInMatch
    ? useTacticDraft(saveId, {
        saveFailureMessage: "Failed to save tactic — check every slot has a unique player assigned.",
      })
    : null;

  const viewResult = isInMatch
    ? ({
        _tag: "Success" as const,
        value: { squad: inMatch!.squad, club: { name: inMatch!.clubName }, tactic: inMatch!.tactic, revision: 0 },
      } as const)
    : draftHooks!.viewResult;
  const viewError = isInMatch ? null : draftHooks!.viewError;
  const tactic = isInMatch ? inMatch!.tactic : draftHooks!.tactic;
  const revision = isInMatch ? 0 : draftHooks!.revision;
  const conflict = isInMatch ? null : draftHooks!.conflict;
  const status = isInMatch ? null : draftHooks!.status;
  const setTactic = isInMatch ? inMatch!.setTactic : draftHooks!.setTactic;
  const save = isInMatch ? (() => Promise.resolve(false)) : draftHooks!.save;
  const refresh = isInMatch ? (() => {}) : draftHooks!.refresh;

  const squad: ReadonlyArray<SquadPlayerView> = isInMatch
    ? inMatch!.squad
    : viewResult._tag === "Success"
      ? viewResult.value.squad
      : [];
  const clubName: string = isInMatch
    ? inMatch!.clubName
    : viewResult._tag === "Success"
      ? viewResult.value.club.name
      : "";

  // ── Local editor state ────────────────────────────────────────

  const [mode, setMode] = useState<Mode>("positions");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [columns, setColumns] = useState<ColumnVisibility>({ pos: true, fit: true, condition: true });

  const toggleColumn = useCallback((column: keyof ColumnVisibility) => {
    setColumns((current) => ({ ...current, [column]: !current[column] }));
  }, []);

  // ── Wiring ────────────────────────────────────────────────────

  useTacticsActionHandlers({ isInMatch, inMatch, saveId, tactic, squad, revision, setTactic, save });
  const editing = useTacticEditing({ tactic, setTactic, setSelectedSlot });
  useTacticsShortcuts({ isInMatch, setSelectedSlot });

  const modified = isModifiedFromTemplate(tactic);

  // Early returns — all hooks above are stable across renders
  if (!isInMatch) {
    if (viewError)
      return (
        <TacticsScreenFrame variant="message">
          <Alert variant="destructive">
            <p>{describeRpcError(viewError)}</p>
          </Alert>
        </TacticsScreenFrame>
      );
    if (viewResult._tag === "Initial")
      return (
        <TacticsScreenFrame variant="message">
          <p className="p-8 text-text-secondary">Loading tactics...</p>
        </TacticsScreenFrame>
      );
    if (viewResult._tag === "Failure")
      return (
        <TacticsScreenFrame variant="message">
          <Alert variant="destructive">
            <p>Failed to load tactics</p>
          </Alert>
        </TacticsScreenFrame>
      );
  }

  // ── Success only from here (or inMatch always ready) ──────────

  const squadById = new Map(squad.map((player) => [player.id, player]));

  const content: ReactNode = (
    <>
      <h1 className="sr-only">{clubName} Tactics</h1>

      <TacticsMenuBar
        isInMatch={isInMatch}
        sourceTemplate={tactic.sourceTemplate}
        modified={modified}
        columns={columns}
        onToggleColumn={toggleColumn}
        mode={mode}
        onSelectMode={setMode}
      />

      {/* Main content: left column (Team Selection) + right area (pitch) */}
      {/* A size container, so the pitch panel can take the width a 68:100 pitch of this height needs.
          In a match the match state sits above it, so it keeps a floor rather than shrink to nothing
          on a short window. */}
      <div className={`flex min-h-0 flex-1 gap-3 [container-type:size] ${isInMatch ? "min-h-[24rem]" : ""}`}>
        <TeamSelectionPanel
          tactic={tactic}
          squad={squad}
          mode={mode}
          selectedSlot={selectedSlot}
          columns={columns}
          onSelectSlot={editing.handleSelectSlot}
          onSwap={editing.handleBringIn}
          onAssign={editing.handleAssign}
        />

        {/* Right area: mode-dependent content */}
        {/* Set Positions: the pitch's width at full height (68% of it, plus the panel's padding and
            border), capped so Team Selection keeps 40% of the row. The other modes take the rest. */}
        <TacticsModeArea
          mode={mode}
          tactic={tactic}
          squad={squad}
          squadById={squadById}
          selectedSlot={selectedSlot}
          columns={columns}
          onSelectSlot={editing.handleSelectSlot}
          onSwap={editing.handleSwap}
          onMove={editing.handleMove}
          onToggleRun={editing.handleToggleRun}
          onTacticChange={setTactic}
        />
      </div>

      {!isInMatch && (
        <TacticsBottomBar tactic={tactic} squad={squad} enabled={viewResult._tag === "Success"} />
      )}

      {isInMatch && (
        <InMatchTacticFooter
          validationError={inMatch!.validationError}
          pendingCount={inMatch!.pendingCount}
          isPending={inMatch!.isPending}
        />
      )}

      <TacticConflictBar conflict={conflict} status={status} onRefresh={refresh} />
    </>
  );

  // In in-match mode, LiveCommandFrame provides the <main> tag
  if (isInMatch) return content;

  return <TacticsScreenFrame variant="workspace">{content}</TacticsScreenFrame>;
};
