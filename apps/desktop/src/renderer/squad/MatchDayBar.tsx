/**
 * The Squad screen's bottom bar: the match-day lineup selector. It renders the persisted Tactic's
 * eighteen slots — the formation's eleven starters plus the seven-slot bench — as drop targets.
 * Players are dragged straight from the squad roster above (the table or the position list), which
 * stays the home of the unselected; the bar itself no longer lists anyone.
 *
 * The draft is the same persisted Tactic the Tactics editor owns
 * (`useTacticDraft`). There is no Save button: every edit autosaves through the
 * same expected-revision submit, so a lost write race surfaces as the same
 * conflict-and-refresh offer. The server refuses a Tactic with an empty starter
 * slot, so while any starter is missing the bar says the lineup is not saved
 * yet, and the first complete lineup saves. Editing here and editing in Tactics are the same
 * edit. The draft is shared with the rest of the screen through the squad
 * provider — the roster rows report who is selected to play or sit on the
 * bench against the very slots this bar edits.
 *
 * Interactions (all native, no drag library):
 * - drag a roster player onto an empty slot — assign;
 * - drag a roster player onto an occupied slot — replace (the occupant returns to the roster);
 * - drag one filled slot onto another — the two players swap;
 * - drag a filled slot back onto the bar — unassign it.
 * Keyboard is a two-step carry for reordering the lineup: Enter (or Space) on a filled slot picks
 * it up, Enter on another slot places it (swap), Escape releases. The picked-up state is always
 * more than colour — see `aria-pressed`.
 */
import { useState } from "react";
import { PlayerId, type Tactic } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError } from "../rpc.js";
import type { LineupSlot } from "./lineupEdits.js";
import {
  clearLineupSlot,
  dropOnLineupSlot,
  lineupSlotsOf,
  missingStartersOf,
  swapLineupSlots,
} from "./lineupEdits.js";
import { readLineupDrag, writeLineupDrag } from "./lineupDrag.js";
import { useSquad } from "./SquadProvider.js";

const CONFLICT_MESSAGE =
  "A newer tactic was saved since you opened this squad. Your lineup changes are kept — refresh to load the current version.";

/** A slot's accessible name: its label plus the occupant, mirroring what the eye sees. */
const slotAriaLabel = (slot: LineupSlot, occupantName: string | null): string =>
  occupantName === null ? `${slot.label} slot` : `${slot.label} slot, ${occupantName}`;

const SlotBox = ({
  slot,
  occupantName,
  carried,
  onDragStart,
  onDrop,
  onKeyDown,
}: {
  readonly slot: LineupSlot;
  readonly occupantName: string | null;
  readonly carried: boolean;
  readonly onDragStart: (event: React.DragEvent) => void;
  readonly onDrop: (event: React.DragEvent) => void;
  readonly onKeyDown: (event: React.KeyboardEvent) => void;
}) => (
  <Button
    role="button"
    tabIndex={0}
    draggable={slot.playerId !== null}
    aria-label={slotAriaLabel(slot, occupantName)}
    aria-pressed={carried}
    data-order={slot.order}
    data-action-id={slot.kind === "starter" ? "lineup-starter-slot" : "lineup-bench-slot"}
    onDragStart={onDragStart}
    onDragOver={(event) => event.preventDefault()}
    onDrop={onDrop}
    onKeyDown={onKeyDown}
    className={`h-6 min-w-11 border px-1.5 ${slot.playerId === null
      ? "border-panel-border-dark text-text-strong"
      : "border-text-highlight text-text-highlight"
      } ${FOCUS_RING.join(" ")}`}
  >
    <span className="text-2xs font-bold leading-tight">{slot.label}</span>
  </Button>
);

export const MatchDayBar = () => {
  const { state, lineup } = useSquad();
  const { allPlayers } = state;
  const { viewError, tactic, conflict, status, setTactic, autosave, refresh } = lineup;

  // The player being keyboard-carried between slots. `null` while idle.
  const [carriedId, setCarriedId] = useState<string | null>(null);

  const playerById = new Map(allPlayers.map((player) => [player.id, player]));
  const slotPlayerName = (playerId: string | null): string | null => {
    if (playerId === null) return null;
    const row = playerById.get(playerId);
    return row === undefined ? null : `${row.firstName} ${row.lastName}`;
  };

  const slots = lineupSlotsOf(tactic);

  const orderOfCarried = (playerId: string): number | null =>
    slots.find((slot) => slot.playerId !== null && String(slot.playerId) === playerId)?.order ??
    null;

  // Every edit goes through here: it replaces the draft and, once all starters are named, saves it.
  const edit = (next: Tactic) => {
    setTactic(next);
    if (missingStartersOf(next) === 0) void autosave(next);
  };

  const assignToSlot = (playerId: string, order: number) =>
    edit(dropOnLineupSlot(tactic, order, PlayerId.make(playerId)));
  const swapSlots = (from: number, to: number) => edit(swapLineupSlots(tactic, from, to));
  const unassignSlot = (order: number) => edit(clearLineupSlot(tactic, order));
  const missingStarters = missingStartersOf(tactic);

  const dropOnSlot = (event: React.DragEvent, order: number) => {
    event.preventDefault();
    event.stopPropagation();
    const drag = readLineupDrag(event);
    if (drag === null) return;
    if (drag.origin === "slot") {
      const from = orderOfCarried(drag.playerId);
      if (from !== null && from !== order) swapSlots(from, order);
    } else {
      assignToSlot(drag.playerId, order);
    }
    setCarriedId(null);
  };

  // The bar is also a drop target: a filled slot dragged off the lineup onto its
  // empty surface unassigns the player, keeping the gesture the pool strip used.
  const dropOnBar = (event: React.DragEvent) => {
    event.preventDefault();
    const drag = readLineupDrag(event);
    if (drag !== null && drag.origin === "slot") {
      const from = orderOfCarried(drag.playerId);
      if (from !== null) unassignSlot(from);
    }
    setCarriedId(null);
  };

  // Keyboard carry: Enter/Space picks up a filled slot, Enter on another slot places
  // it (assign, evicting the occupant where occupied), Escape releases.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setCarriedId(null);
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const order = Number(event.currentTarget.getAttribute("data-order"));
    if (carriedId === null) {
      const occupant = slots[order]?.playerId ?? null;
      if (occupant !== null) setCarriedId(String(occupant));
      return;
    }
    assignToSlot(carriedId, order);
    setCarriedId(null);
  };

  return (
    <footer
      aria-label="Lineup selector"
      data-testid="lineup-bar"
      className="sticky bottom-0 z-10 mt-3 bg-background px-4 pt-2 pb-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOnBar}
    >
      {viewError !== null && (
        <p className="mb-2 text-sm text-text-danger">{describeRpcError(viewError)}</p>
      )}

      {/* CM 03/04's titled Positions panel: starters and bench on one centred row. */}
      <section className="rounded-panel bg-panel-bg px-3 pt-1.5 pb-2.5">
        <h2 className="text-center text-base font-bold text-text-highlight">Positions</h2>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
          {slots
            .filter((slot) => slot.kind === "starter")
            .map((slot) => (
              <SlotBox
                key={`starter-${slot.groupIndex}`}
                slot={slot}
                occupantName={slotPlayerName(
                  slot.playerId === null ? null : String(slot.playerId),
                )}
                carried={carriedId !== null && slot.playerId !== null && String(slot.playerId) === carriedId}
                onDragStart={(event) => {
                  if (slot.playerId !== null) writeLineupDrag(event, "slot", String(slot.playerId));
                }}
                onDrop={(event) => dropOnSlot(event, slot.order)}
                onKeyDown={onKeyDown}
              />
            ))}

          {slots
            .filter((slot) => slot.kind === "bench")
            .map((slot) => (
              <SlotBox
                key={`bench-${slot.groupIndex}`}
                slot={slot}
                occupantName={slotPlayerName(
                  slot.playerId === null ? null : String(slot.playerId),
                )}
                carried={carriedId !== null && slot.playerId !== null && String(slot.playerId) === carriedId}
                onDragStart={(event) => {
                  if (slot.playerId !== null) writeLineupDrag(event, "slot", String(slot.playerId));
                }}
                onDrop={(event) => dropOnSlot(event, slot.order)}
                onKeyDown={onKeyDown}
              />
            ))}
          {carriedId !== null && (
            <span className="ml-1 self-center text-xs text-text-secondary" data-testid="lineup-carried">
              Holding {playerById.get(carriedId)?.lastName ?? carriedId}…
            </span>
          )}
        </div>
      </section>

      <div className="mt-1.5 flex min-h-5 items-center justify-center gap-3 text-xs" data-testid="lineup-save-state">
        {conflict !== null ? (
          <>
            <span role="alert" className="text-text-danger" data-testid="lineup-conflict">
              {CONFLICT_MESSAGE}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={refresh}>
              Refresh
            </Button>
          </>
        ) : missingStarters > 0 ? (
          // The server refuses a lineup with an empty starter slot, so say what saving waits on
          // rather than failing every drop while the lineup is being built.
          <span className="text-text-secondary">
            Not saved yet: pick {missingStarters} more {missingStarters === 1 ? "starter" : "starters"}.
          </span>
        ) : (
          status && <span className="text-text-secondary">{status}</span>
        )}
      </div>
    </footer>
  );
};