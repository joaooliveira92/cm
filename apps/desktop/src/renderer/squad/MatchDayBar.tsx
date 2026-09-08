/**
 * The Squad screen's bottom bar: the match-day lineup selector. It renders the persisted Tactic's
 * eighteen slots — the formation's eleven starters plus the seven-slot bench — as drop targets,
 * with the registered players who are not yet on the lineup as a draggable pool strip above them.
 *
 * The draft is the same persisted Tactic the Tactics editor owns (`useTacticDraft`), and a Save
 * button in the bar commits it through the same expected-revision submit, so a lost write race
 * surfaces as the same conflict-and-refresh offer. Editing here and editing in Tactics are the
 * same edit.
 *
 * Interactions (all native, no drag library):
 * - drag a pool player onto an empty slot — assign;
 * - drag a pool player onto an occupied slot — replace (the occupant returns to the pool);
 * - drag one filled slot onto another — the two players swap;
 * - drag a filled slot back onto the pool strip — unassign it.
 * Keyboard is a two-step carry: Enter (or Space) on a pool player or a filled slot "picks it up";
 * Enter on a slot places it (replace when occupied), Enter on the pool strips it back, Escape
 * releases. The picked-up state is always more than colour — see `aria-pressed`.
 */
import { useEffect, useState } from "react";
import { PlayerId } from "@cm-clone/contracts";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError } from "../rpc.js";
import { useTacticDraft } from "../tactics/useTacticDraft.js";
import type { LineupSlot } from "./lineupEdits.js";
import {
  clearLineupSlot,
  dropOnLineupSlot,
  lineupSlotsOf,
  swapLineupSlots,
  unselectedPlayerIds,
} from "./lineupEdits.js";
import { useSquad } from "./SquadProvider.js";

const CONFLICT_MESSAGE =
  "A newer tactic was saved since you opened this squad. Your lineup changes are kept — refresh to load the current version.";

const SAVE_FAILURE =
  "Failed to save lineup — every slot must name a distinct, still-registered player.";

/** The drop payload: the dragged player plus whether the drag began on a slot (a swap/move) or in
 *  the pool (an assign/replace). Slot origins keep both players on the lineup; pool origins drop
 *  the occupant back to the pool. */
const DRAG_PLAYER = "text/plain";
const DRAG_ORIGIN = "application/x-cm-lineup-origin";

interface DragData {
  readonly playerId: string;
  readonly origin: "slot" | "pool";
}

const readDrag = (event: React.DragEvent): DragData | null => {
  const playerId = event.dataTransfer.getData(DRAG_PLAYER);
  const origin = event.dataTransfer.getData(DRAG_ORIGIN);
  return playerId === "" || (origin !== "slot" && origin !== "pool") ? null : { playerId, origin };
};

const writeDrag = (event: React.DragEvent, origin: "slot" | "pool", playerId: string) => {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(DRAG_PLAYER, playerId);
  event.dataTransfer.setData(DRAG_ORIGIN, origin);
};

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
  <div
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
    className={`flex min-h-10 min-w-12 flex-col items-center justify-center rounded-control border px-1 py-0.5 ${
      slot.playerId === null
        ? "border-border-subtle text-text-secondary"
        : "border-bright text-text-highlight"
    } ${FOCUS_RING.join(" ")}`}
  >
    <span className="font-mono text-xs leading-tight">{slot.label}</span>
    <span className="max-w-12 truncate text-[10px] leading-tight">
      {occupantName?.split(" ").at(-1) ?? "—"}
    </span>
  </div>
);

export const MatchDayBar = () => {
  const { state, meta } = useSquad();
  const { allPlayers } = state;
  const { saveId } = meta;

  const { viewError, tactic, conflict, status, setTactic, save, refresh } =
    useTacticDraft(saveId, { saveFailureMessage: SAVE_FAILURE });

  // The player being keyboard-carried between slots and the pool. `null` while idle.
  const [carriedId, setCarriedId] = useState<string | null>(null);

  // The bar's Save commits the same persisted Tactic the Tactics editor does.
  useEffect(() => registerActionHandler("save-tactic", () => void save()), [save]);

  const playerById = new Map(allPlayers.map((player) => [player.id, player]));
  const slotPlayerName = (playerId: string | null): string | null => {
    if (playerId === null) return null;
    const row = playerById.get(playerId);
    return row === undefined ? null : `${row.firstName} ${row.lastName}`;
  };

  const slots = lineupSlotsOf(tactic);
  const poolIds = unselectedPlayerIds(tactic, allPlayers.map((player) => player.id));

  const orderOfCarried = (playerId: string): number | null =>
    slots.find((slot) => slot.playerId !== null && String(slot.playerId) === playerId)?.order ??
    null;

  const assignToSlot = (playerId: string, order: number) =>
    setTactic(dropOnLineupSlot(tactic, order, PlayerId.make(playerId)));
  const swapSlots = (from: number, to: number) => setTactic(swapLineupSlots(tactic, from, to));
  const unassignSlot = (order: number) => setTactic(clearLineupSlot(tactic, order));

  const dropOnSlot = (event: React.DragEvent, order: number) => {
    event.preventDefault();
    const drag = readDrag(event);
    if (drag === null) return;
    if (drag.origin === "slot") {
      const from = orderOfCarried(drag.playerId);
      if (from !== null && from !== order) swapSlots(from, order);
    } else {
      assignToSlot(drag.playerId, order);
    }
    setCarriedId(null);
  };

  const dropOnPool = (event: React.DragEvent) => {
    event.preventDefault();
    const drag = readDrag(event);
    if (drag !== null && drag.origin === "slot") {
      const from = orderOfCarried(drag.playerId);
      if (from !== null) unassignSlot(from);
    }
    setCarriedId(null);
  };

  // Keyboard carry: Enter/Space picks a pool player or a filled slot, places it on a slot (replace
  // when occupied) or releases it back to the pool. Escape always releases.
  const onKeyDown = (event: React.KeyboardEvent, kind: "pool" | "poolStrip" | "slot") => {
    if (event.key === "Escape") {
      setCarriedId(null);
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (kind === "pool") {
      const playerId = event.currentTarget.getAttribute("data-player-id");
      if (playerId !== null && carriedId === null) setCarriedId(playerId);
      return;
    }
    if (kind === "poolStrip") {
      if (carriedId !== null) {
        const order = orderOfCarried(carriedId);
        if (order !== null) unassignSlot(order);
        setCarriedId(null);
      }
      return;
    }
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
      className="sticky bottom-0 z-10 mt-4 border-t border-border-subtle bg-bg-raised px-4 py-2"
    >
      {viewError !== null && (
        <p className="mb-2 text-sm text-text-danger">{describeRpcError(viewError)}</p>
      )}

      {/* The pool strip: every registered player not on the lineup, draggable into a slot. It is
          also a drop target — a filled slot dragged here is unassigned. */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Unassigned players"
        data-action-id="lineup-pool"
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropOnPool}
        onKeyDown={(event) => onKeyDown(event, "poolStrip")}
        className={`mb-2 flex flex-wrap items-center gap-1 border border-dashed border-border-subtle px-2 py-1 ${FOCUS_RING.join(" ")}`}
      >
        <span className="pr-1 text-xs text-text-secondary">Unassigned</span>
        {poolIds.map((id) => (
          <span
            key={id}
            role="button"
            tabIndex={0}
            draggable
            data-player-id={id}
            aria-label={`${playerById.get(id)?.lastName ?? id}, unassigned`}
            aria-pressed={carriedId === id}
            data-action-id="lineup-pool-player"
            onDragStart={(event) => writeDrag(event, "pool", id)}
            onKeyDown={(event) => onKeyDown(event, "pool")}
            className={`cursor-grab rounded-control border px-2 py-0.5 font-mono text-xs ${
              carriedId === id
                ? "border-text-highlight bg-text-highlight/15 text-text-highlight"
                : "border-border-subtle text-text-body hover:bg-surface-raised"
            } ${FOCUS_RING.join(" ")}`}
          >
            {playerById.get(id)?.lastName ?? id}
          </span>
        ))}
        {carriedId !== null && (
          <span className="ml-1 text-xs text-text-secondary" data-testid="lineup-carried">
            Holding {playerById.get(carriedId)?.lastName ?? carriedId}…
          </span>
        )}
      </div>

      {/* Starters and bench on the same row. */}
      <div className="flex flex-wrap items-end gap-1">
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
                if (slot.playerId !== null) writeDrag(event, "slot", String(slot.playerId));
              }}
              onDrop={(event) => dropOnSlot(event, slot.order)}
              onKeyDown={(event) => onKeyDown(event, "slot")}
            />
          ))}
        <span className="pr-1 text-xs text-text-secondary">Subs</span>
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
                if (slot.playerId !== null) writeDrag(event, "slot", String(slot.playerId));
              }}
              onDrop={(event) => dropOnSlot(event, slot.order)}
              onKeyDown={(event) => onKeyDown(event, "slot")}
            />
          ))}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <Button
          type="button"
          data-action-id="save-tactic"
          onClick={() => void dispatchAction("save-tactic")}
        >
          Save Lineup
        </Button>
        {conflict !== null && (
          <>
            <span role="alert" className="text-sm text-text-danger" data-testid="lineup-conflict">
              {CONFLICT_MESSAGE}
            </span>
            <Button type="button" variant="secondary" onClick={refresh}>
              Refresh
            </Button>
          </>
        )}
        {status && <span className="ml-3 text-sm text-text-secondary">{status}</span>}
      </div>
    </footer>
  );
};