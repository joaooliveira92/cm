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
 *
 * An EMPTY STARTER slot is also a control, and the same Enter/Space and click that starts a carry
 * on a filled slot instead selects the slot: the roster above then leads with whoever can fill it
 * (`lineupFit.ts`). It never starts a carry, so a selection cannot be mistaken for a held player.
 * Escape releases a held player first and only then drops the selection, in that order, so the
 * existing carry contract is untouched. Selected or not, the slot says so in more than colour —
 * see `aria-current`. The slot names the selection's job, not its result: it changes no filter and
 * hides nobody.
 */
import { useState } from "react";
import { PlayerId, type Tactic } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
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

/** A slot's accessible name: its label plus the occupant, mirroring what the eye sees. An empty
 *  starter that is also a selector says so, or the click reads as doing nothing. */
const slotAriaLabel = (slot: LineupSlot, occupantName: string | null): string =>
  occupantName === null
    ? `${slot.label} slot`
    : `${slot.label} slot, ${occupantName}`;

const SlotBox = ({
  slot,
  occupantName,
  carried,
  selected,
  onDragStart,
  onDrop,
  onClick,
  onKeyDown,
}: {
  readonly slot: LineupSlot;
  readonly occupantName: string | null;
  readonly carried: boolean;
  /** This empty starter is the selected fit context. */
  readonly selected: boolean;
  readonly onDragStart: (event: React.DragEvent) => void;
  readonly onDrop: (event: React.DragEvent) => void;
  /** Present only on an empty starter — the only slot that acts as a selector. */
  readonly onClick: (() => void) | undefined;
  readonly onKeyDown: (event: React.KeyboardEvent) => void;
}) => (
  <Button
    role="button"
    // Not `default`: that fills with `primary`, which the Neutral theme makes near-white, and the
    // light slot labels vanish on it. Eighteen slots are not the region's one primary verb anyway.
    variant="secondary"
    tabIndex={0}
    draggable={slot.playerId !== null}
    aria-label={slotAriaLabel(slot, occupantName)}
    aria-pressed={carried}
    // Distinct from `aria-pressed` on purpose: a held player and a selected slot are different
    // things, and one key says both if they share the attribute.
    aria-current={selected || undefined}
    data-order={slot.order}
    data-action-id={slot.kind === "starter" ? "lineup-starter-slot" : "lineup-bench-slot"}
    onDragStart={onDragStart}
    onDragOver={(event) => event.preventDefault()}
    onDrop={onDrop}
    onClick={onClick}
    onKeyDown={onKeyDown}
    // The selection is a ring, not a fill: the eye reads a second outline round a chosen slot
    // without mistaking it for the highlight a filled slot already wears.
    className={`h-6 min-w-11 border px-1.5 ${slot.playerId === null
      ? "border-panel-border-dark text-text-strong"
      : "border-text-highlight bg-text-highlight/15 text-text-highlight"
    } ${selected ? "outline-2 outline-offset-1 outline-text-highlight" : ""} ${FOCUS_RING.join(" ")}`}
  >
    <span className="text-caption font-bold leading-tight">{slot.label}</span>
  </Button>
);

export const MatchDayBar = () => {
  const { state, actions, lineup } = useSquad();
  const { allPlayers, fit } = state;
  const { toggleFitContext, clearFitContext } = actions;
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
  // it (assign, evicting the occupant where occupied), Escape releases. An EMPTY STARTER
  // selects instead of picking up; Escape spends itself on a held player first.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      // Carry first. A manager holding a player and looking at the roster's DC lead has two
      // things to undo, and the one they are mid-way through comes first.
      if (carriedId !== null) setCarriedId(null);
      else clearFitContext();
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    // LOAD-BEARING, not tidy. An empty starter is a real `<button>`, and a button's Enter and
    // Space both carry a native activation behaviour that synthesises a `click` — the same event
    // `onClick` handles. This handler already did the work; without the default being prevented
    // the browser would follow it with a click, `onClick` would toggle a second time, and the
    // slot would select and immediately deselect, leaving the keyboard path a silent no-op while
    // the pointer path worked fine. Preventing the keydown's default is what suppresses that
    // activation, leaving exactly one toggle per press. Nothing here relies on jsdom for it:
    // jsdom never synthesises the click, so the whole keyboard suite stays green with this line
    // deleted — `lineup-fit-keyboard.test.tsx` asserts `defaultPrevented` directly instead.
    event.preventDefault();
    const order = Number(event.currentTarget.getAttribute("data-order"));
    if (carriedId === null) {
      const occupant = slots[order]?.playerId ?? null;
      if (occupant === null) toggleFitContext(order);
      else setCarriedId(String(occupant));
      return;
    }
    assignToSlot(carriedId, order);
    setCarriedId(null);
  };

  const toggleSlot = (slot: LineupSlot) => () => toggleFitContext(slot.order);
  /** The selector affordance belongs to empty starters alone: a bench slot names no Position,
   *  and a filled slot has a player rather than a question. */
  const clickFor = (slot: LineupSlot): (() => void) | undefined =>
    slot.kind === "starter" && slot.playerId === null ? toggleSlot(slot) : undefined;

  return (
    <footer
      aria-label="Lineup selector"
      data-testid="lineup-bar"
      className="sticky bottom-0 z-10 mt-3 bg-background px-4 pt-2 pb-3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={dropOnBar}
    >
      {viewError !== null && (
          <Alert variant="destructive" className="mb-2">
            <p className="text-body">{describeRpcError(viewError)}</p>
          </Alert>
        )}

      {/* CM 03/04's titled Positions panel: starters and bench on one centred row. */}
      <section className="rounded-panel bg-panel-bg px-3 pt-1.5 pb-2.5">
        <h2 className="text-center text-heading text-text-highlight">Positions</h2>
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
                selected={fit?.order === slot.order}
                onDragStart={(event) => {
                  if (slot.playerId !== null) writeLineupDrag(event, "slot", String(slot.playerId));
                }}
                onDrop={(event) => dropOnSlot(event, slot.order)}
                onClick={clickFor(slot)}
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
                selected={false}
                onDragStart={(event) => {
                  if (slot.playerId !== null) writeLineupDrag(event, "slot", String(slot.playerId));
                }}
                onDrop={(event) => dropOnSlot(event, slot.order)}
                onClick={undefined}
                onKeyDown={onKeyDown}
              />
            ))}
          {carriedId !== null && (
            <span className="ml-1 self-center text-data text-text-secondary" data-testid="lineup-carried">
              Holding {playerById.get(carriedId)?.lastName ?? carriedId}…
            </span>
          )}
        </div>
      </section>

      <div className="mt-1.5 flex min-h-5 items-center justify-center gap-3 text-data" data-testid="lineup-save-state">
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