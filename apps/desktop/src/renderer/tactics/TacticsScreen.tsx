import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Tactic, type PlayerId, type SaveId, type SquadPlayerView } from "@cm-clone/contracts";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { useScreenBottomBarActions } from "../chrome/bottom-bar/index.js";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
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
import { swapLineupSlots } from "../squad/lineupEdits.js";
import { ACTIONS_ROW_BUTTON_CLASS } from "../squad/actionsRowClasses.js";
import { clearToolbarControls, setToolbarControls } from "../screenToolbarControls.js";
import { FormationPitch } from "./FormationPitch.js";
import { SetPrioritiesPanel } from "./SetPrioritiesPanel.js";
import { SetInstructionsPanel } from "./SetInstructionsPanel.js";
import { TeamSelectionGrid } from "./TeamSelectionGrid.js";
import { NO_PLAYER, useTacticDraft } from "./useTacticDraft.js";
import { describeRpcError } from "../rpc.js";

/** Whether the Tactic has moved off the built-in template it is named for. */
const isModifiedFromTemplate = (tactic: Tactic): boolean => {
  const source = builtInTemplate(tactic.sourceTemplate);
  return source !== undefined && isModified(tactic, source);
};

/** Choosing another template loads its contents over the Tactic: its slots, instructions and
 *  set-piece settings, an empty eleven and no takers (they name players), the bench kept. Picking
 *  the current one again only resets a modified Tactic to its template, keeping every slot's player. */
const changeTemplate = (tactic: Tactic, name: string): Tactic => {
  const template = builtInTemplate(name);
  if (template === undefined) return tactic;
  return name === tactic.sourceTemplate
    ? new Tactic({ ...tacticFromTemplate(template, tactic.assignments, tactic.bench), takers: tactic.takers })
    : new Tactic(
        tacticFromTemplate(
          template,
          tactic.assignments.map(() => NO_PLAYER),
          tactic.bench,
        ),
      );
};

/** One slot moved to another outfield cell: the template's shape becomes a modified one. A run that
 *  would end where the slot now stands is dropped. */
const moveSlot = (tactic: Tactic, slotIndex: number, cell: Slot): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) =>
      index === slotIndex
        ? {
            ...slot,
            cell,
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

/** The one conflict sentence, rendered as the `role="alert"` span beside the Refresh button. */
const CONFLICT_MESSAGE =
  "A newer tactic was saved since you loaded this page. Your draft is kept — refresh to load the current version.";

type Mode = "positions" | "instructions" | "priorities";

const MENU_BUTTON_CLASS = `${ACTIONS_ROW_BUTTON_CLASS} text-body`;
const MENU_BUTTON_ACTIVE_CLASS = `${MENU_BUTTON_CLASS} bg-surface-raised text-text-primary`;

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
        className={`${MENU_BUTTON_CLASS} ${open ? "bg-surface-raised" : ""}`}
      >
        {label} ▾
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

const STARTER_COUNT = 11;

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

  const [mode, setMode] = useState<Mode>("positions");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [columns, setColumns] = useState({ pos: true, fit: true, condition: true });
  const squadByIdRef = useRef<ReadonlyMap<string, SquadPlayerView>>(new Map());

  // Update squadByIdRef when the view changes
  useEffect(() => {
    if (viewResult._tag === "Success") {
      squadByIdRef.current = new Map(viewResult.value.squad.map((p) => [p.id, p]));
    }
  }, [viewResult]);

  // Custom event listener for bench swap (dispatched by TeamSelectionGrid)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { from: number; to: number } | undefined;
      if (detail) {
        setTactic(swapLineupSlots(tactic, detail.from, detail.to));
      }
    };
    window.addEventListener("cm-tactic-swap", handler);
    return () => window.removeEventListener("cm-tactic-swap", handler);
  }, [tactic, setTactic]);

  // Register action handlers
  useEffect(() => {
    const unregisters: Array<() => void> = [];

    if (!isInMatch) {
      unregisters.push(
        registerActionHandler("save-tactic", () => {
          void save();
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
        setTactic(changeTemplate(tactic, (params as { formation: string }).formation)),
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
        const p = params as { index: number; cell: Slot };
        setTactic(moveSlot(tactic, p.index, p.cell));
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
  }, [saveId, tactic, revision, setTactic, save]);

  // Screen bottom bar (normal mode only)
  if (!isInMatch) {
    const selectionPresent = hasSelection(tactic);
    const bottomBarActions = useMemo(
      () => ({
        buttons: [
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
      [selectionPresent],
    );
    useScreenBottomBarActions(viewResult._tag === "Success" ? bottomBarActions : null);
  }

  // Toolbar controls
  const loaded = viewResult._tag === "Success";
  const modified = isModifiedFromTemplate(tactic);
  const toolbarControls = useMemo(
    () =>
      loaded ? (
        <>
          <span className="ml-3 text-body font-semibold text-text-highlight">
            {tactic.sourceTemplate}
            {modified ? " (modified)" : ""}
          </span>
        </>
      ) : null,
    [loaded, modified, tactic.sourceTemplate],
  );
  useEffect(() => {
    setToolbarControls(toolbarControls);
    return () => clearToolbarControls();
  }, [toolbarControls]);

  // Keyboard handling: global shortcuts
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

  // Group fixtures — always computed, safe before early returns
  const modifiedTemplates = useMemo(() => {
    return BUILT_IN_TEMPLATE_NAMES.map((name) => ({
      name,
      current: name === tactic.sourceTemplate,
    }));
  }, [tactic.sourceTemplate]);

  // Callbacks for pitch interactions — defined before early returns so hook order is stable
  const handleMove = useCallback(
    (index: number, cell: Slot) => {
      setTactic(moveSlot(tactic, index, cell));
    },
    [tactic, setTactic],
  );

  const handleSwap = useCallback(
    (from: number, to: number) => {
      setTactic(swapLineupSlots(tactic, from, to));
    },
    [tactic, setTactic],
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
    [],
  );

  // Early returns — all hooks above are stable across renders
  if (!isInMatch) {
    if (viewError)
      return (
        <main
          tabIndex={-1}
          data-focus-id="tactics"
          aria-label="Tactics"
          className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
        >
          <Alert variant="destructive">
            <p>{describeRpcError(viewError)}</p>
          </Alert>
        </main>
      );
    if (viewResult._tag === "Initial")
      return (
        <main
          tabIndex={-1}
          data-focus-id="tactics"
          aria-label="Tactics"
          className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
        >
          <p className="p-8 text-text-secondary">Loading tactics...</p>
        </main>
      );
    if (viewResult._tag === "Failure")
      return (
        <main
          tabIndex={-1}
          data-focus-id="tactics"
          aria-label="Tactics"
          className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
        >
          <Alert variant="destructive">
            <p>Failed to load tactics</p>
          </Alert>
        </main>
      );
  }

  // ── Success only from here (or inMatch always ready) ──────────

  const squadById = new Map(squad.map((player) => [player.id, player]));

  // Build the content that's shared between modes
  const content: ReactNode = (
    <>
      <h1 className="sr-only">{clubName} Tactics</h1>

      {/* Menu bar */}
      <nav aria-label="Tactics menu" className="flex items-center gap-2 border-b border-border-subtle pb-2">
        {isInMatch ? (
          <MenuButton
            label="File"
            items={[
              ...modifiedTemplates.map((t) => ({
                label: `${t.current ? "✓ " : ""}Quick Load: ${t.name}`,
                onSelect: () => void dispatchAction("set-formation", { formation: t.name }),
                current: t.current,
              })),
            ]}
          />
        ) : (
          <MenuButton
            label="File"
            items={[
              ...modifiedTemplates.map((t) => ({
                label: `${t.current ? "✓ " : ""}Quick Load: ${t.name}`,
                onSelect: () => void dispatchAction("set-formation", { formation: t.name }),
                current: t.current,
              })),
              { label: "Save", onSelect: () => void dispatchAction("save-tactic") },
            ]}
          />
        )}
        <MenuButton
          label="View"
          items={[
            {
              label: `${columns.pos ? "Hide" : "Show"} Position`,
              onSelect: () => setColumns((c) => ({ ...c, pos: !c.pos })),
              current: columns.pos,
            },
            {
              label: `${columns.fit ? "Hide" : "Show"} Fit`,
              onSelect: () => setColumns((c) => ({ ...c, fit: !c.fit })),
              current: columns.fit,
            },
            {
              label: `${columns.condition ? "Hide" : "Show"} Condition`,
              onSelect: () => setColumns((c) => ({ ...c, condition: !c.condition })),
              current: columns.condition,
            },
          ]}
        />
        <div className="ml-2 flex items-center gap-2 border-l border-border-subtle pl-2">
          <button
            type="button"
            aria-pressed={mode === "positions"}
            onClick={() => setMode("positions")}
            className={mode === "positions" ? MENU_BUTTON_ACTIVE_CLASS : MENU_BUTTON_CLASS}
          >
            Set Positions
          </button>
          <button
            type="button"
            aria-pressed={mode === "instructions"}
            onClick={() => setMode("instructions")}
            className={mode === "instructions" ? MENU_BUTTON_ACTIVE_CLASS : MENU_BUTTON_CLASS}
          >
            Set Instructions
          </button>
          <button
            type="button"
            aria-pressed={mode === "priorities"}
            onClick={() => setMode("priorities")}
            className={mode === "priorities" ? MENU_BUTTON_ACTIVE_CLASS : MENU_BUTTON_CLASS}
          >
            Set Priorities
          </button>
        </div>
        <span className="ml-auto text-label text-text-muted">
          {tactic.sourceTemplate}
          {modified ? " (modified)" : ""}
        </span>
      </nav>

      {/* Main content: left column (Team Selection) + right area (pitch) */}
      <div className="mt-2 flex flex-1 gap-4">
        {/* Left column: Team Selection */}
        <section
          aria-label="Team Selection"
          className="w-[34rem] shrink-0 overflow-y-auto rounded-panel border border-border bg-card/80"
        >
          <h2 className="sticky top-0 z-10 rounded-t-panel bg-sky-900/70 px-3 py-1 text-heading text-yellow-300">
            Team Selection
          </h2>
          <div className="p-1">
            <TeamSelectionGrid
              tactic={tactic}
              squad={squad}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSelectSlot}
            />
          </div>
          <p className="px-3 py-2 text-caption text-text-muted">
            Click a starter to select; then click a substitute to swap, or an empty cell on the pitch to move.
          </p>
        </section>

        {/* Right area: mode-dependent content */}
        <div className="min-w-0 flex-1">
          {mode === "positions" && (
            <FormationPitch
              formation={tactic.sourceTemplate}
              slots={tactic.slots}
              assignments={tactic.assignments}
              squadById={squadById}
              selectedSlot={selectedSlot}
              onSelectSlot={handleSelectSlot}
              onSwap={handleSwap}
              onMove={handleMove}
              onToggleRun={handleToggleRun}
            />
          )}

          {mode === "instructions" && (
            <SetInstructionsPanel
              tactic={tactic}
              squadById={squadById}
              selectedSlot={selectedSlot}
              onTacticChange={setTactic}
            />
          )}

          {mode === "priorities" && (
            <SetPrioritiesPanel
              tactic={tactic}
              squad={squad}
              squadById={squadById}
              onTacticChange={setTactic}
            />
          )}
        </div>
      </div>

      {/* In-match mode bar */}
      {isInMatch && (
        <>
          {/* Validation error */}
          {inMatch!.validationError && (
            <p role="alert" className="mt-1 text-data text-text-warning">
              {inMatch!.validationError}
            </p>
          )}

          {/* Pending changes indicator */}
          {inMatch!.pendingCount > 0 && (
            <p className="mt-1 text-data text-text-secondary">
              <Badge variant="warning">{inMatch!.pendingCount} pending change{inMatch!.pendingCount === 1 ? "" : "s"}</Badge>
            </p>
          )}

          <div className="mt-2 flex items-center justify-center gap-3 border-t border-border-subtle pt-2">
            <Button
              type="button"
              variant="default"
              disabled={inMatch!.isPending}
              data-action-id="confirm-live-tactic"
              onClick={() => void dispatchAction("confirm-live-tactic")}
            >
              {inMatch!.isPending ? "Confirming..." : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={inMatch!.pendingCount === 0 || inMatch!.isPending}
              data-action-id="undo-live-tactic"
              onClick={() => void dispatchAction("undo-live-tactic")}
            >
              Undo Last
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={inMatch!.pendingCount === 0 || inMatch!.isPending}
              data-action-id="cancel-live-tactic"
              onClick={() => void dispatchAction("cancel-live-tactic")}
            >
              Cancel
            </Button>
          </div>
        </>
      )}

      {/* Conflict bar (normal mode only) */}
      {!isInMatch && (conflict !== null || status) && (
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
                onClick={refresh}
              >
                Refresh
              </Button>
            </>
          )}
          {status && <span className="text-body text-text-bright">{status}</span>}
        </section>
      )}
    </>
  );

  // In in-match mode, LiveCommandFrame provides the <main> tag
  if (isInMatch) return content;

  return (
    <main
      tabIndex={-1}
      data-focus-id="tactics"
      aria-label="Tactics"
      className={`flex flex-col gap-0 p-4 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      {content}
    </main>
  );
};