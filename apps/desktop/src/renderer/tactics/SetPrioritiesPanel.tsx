/**
 * The CM 03/04-style Set Priorities panel: team set-piece instruction dropdowns and the eight
 * ordered taker lists (captains, penalty takers, free kick takers, corner takers, throw-in takers,
 * each left and right where applicable).
 *
 * Edits update the draft through `onTacticChange` and persist when the user presses Save.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { Tactic, type PlayerId, type SquadPlayerView } from "@cm-clone/contracts";
import {
  TAKER_LISTS,
  TEAM_SET_PIECE_VALUES,
  type TakerList,
  type TeamSetPieces,
} from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";

// ── Display helpers ─────────────────────────────────────────────────────────

/** Human-readable labels for each taker list key. */
const TAKER_LIST_LABELS: Record<TakerList, string> = {
  captain: "Captains",
  penalties: "Penalty Takers",
  freeKicksLeft: "Free Kick Takers (Left)",
  freeKicksRight: "Free Kick Takers (Right)",
  cornersLeft: "Corner Takers (Left)",
  cornersRight: "Corner Takers (Right)",
  throwInsLeft: "Throw In Takers (Left)",
  throwInsRight: "Throw In Takers (Right)",
};

/** Human-readable labels for each set piece instruction key. */
const SET_PIECE_LABELS: Record<keyof TeamSetPieces, string> = {
  cornersLeft: "Corners (Left)",
  cornersRight: "Corners (Right)",
  freeKicksLeft: "Free Kicks (Left)",
  freeKicksRight: "Free Kicks (Right)",
  throwInsLeft: "Throw Ins (Left)",
  throwInsRight: "Throw Ins (Right)",
};

/** Human-readable labels for set piece option values. */
const SET_PIECE_OPTION_LABELS: Record<string, string> = {
  default: "Default",
  short: "Short",
  nearPost: "Near Post",
  farPost: "Far Post",
  edgeOfArea: "Edge of Area",
  edgeOfSixYardBox: "Edge of Six Yard Box",
  long: "Long",
  crossNear: "Cross Near",
  crossFar: "Cross Far",
  crossCentre: "Cross Centre",
  aimForBestHeader: "Aim for Best Header",
  quick: "Quick",
};

/** The taker list keys that are side-specific (left/right pairs sharing a category). */
const SIDE_KEYS: ReadonlyArray<{ readonly label: string; readonly left: TakerList; readonly right: TakerList }> = [
  { label: "Free Kicks", left: "freeKicksLeft", right: "freeKicksRight" },
  { label: "Corners", left: "cornersLeft", right: "cornersRight" },
  { label: "Throw Ins", left: "throwInsLeft", right: "throwInsRight" },
];

// ── Player picker ───────────────────────────────────────────────────────────

/**
 * A compact dropdown listing every squad player not already in the given taker list,
 * for adding a player to that list.
 */
const PlayerPicker = ({
  listKey,
  takerIds,
  squad,
  onAdd,
}: {
  readonly listKey: TakerList;
  readonly takerIds: ReadonlyArray<string>;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly onAdd: (listKey: TakerList, playerId: string) => void;
}) => {
  const alreadyInList = new Set(takerIds);
  const available = useMemo(
    () => squad.filter((p) => !alreadyInList.has(p.id)),
    [squad, alreadyInList],
  );

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="rounded-control bg-surface-raised px-2 py-0.5 text-caption font-semibold text-text-primary hover:bg-surface-hover"
      >
        + Add
      </button>
      {open && available.length > 0 && (
        <ul
          role="listbox"
          aria-label={`Add player to ${TAKER_LIST_LABELS[listKey]}`}
          className="absolute left-0 z-40 mt-1 max-h-60 min-w-56 overflow-auto rounded-panel border border-border bg-popover py-1 shadow-lg"
        >
          {available.map((player) => (
            <li key={player.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="w-full px-3 py-1 text-left text-body text-foreground hover:bg-white/10"
                onClick={() => {
                  onAdd(listKey, player.id);
                  setOpen(false);
                }}
              >
                <span className="font-semibold">{player.lastName}</span>
                <span className="text-text-secondary">, {player.firstName}</span>
                <span className="ml-2 text-caption text-text-muted">({player.positionLabel})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && available.length === 0 && (
        <div className="absolute left-0 z-40 mt-1 min-w-48 rounded-panel border border-border bg-popover px-3 py-2 text-caption text-text-muted shadow-lg">
          No players available
        </div>
      )}
    </div>
  );
};

// ── Taker list component ────────────────────────────────────────────────────

interface FocusState {
  readonly listKey: TakerList;
  readonly itemIndex: number;
}

/** One ordered taker list: numbered items, reorder and remove, and an add-picker. */
const TakerListPanel = ({
  listKey,
  takerIds,
  squadById,
  squad,
  onReorder,
  onRemove,
  onAdd,
  focusState,
  onFocusItem,
}: {
  readonly listKey: TakerList;
  readonly takerIds: ReadonlyArray<string>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly onReorder: (listKey: TakerList, fromIndex: number, toIndex: number) => void;
  readonly onRemove: (listKey: TakerList, index: number) => void;
  readonly onAdd: (listKey: TakerList, playerId: string) => void;
  readonly onMoveFocus: (direction: "prev" | "next") => void;
  readonly focusState: FocusState | null;
  readonly onFocusItem: (state: FocusState | null) => void;
}) => {
  const isFocusedHere = focusState?.listKey === listKey;

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const itemCount = takerIds.length;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          // Reorder up
          if (index > 0) {
            onReorder(listKey, index, index - 1);
            onFocusItem({ listKey, itemIndex: index - 1 });
          }
        } else {
          // Navigate up
          if (index > 0) {
            onFocusItem({ listKey, itemIndex: index - 1 });
          } else {
            // Wrap to last
            onFocusItem({ listKey, itemIndex: itemCount - 1 });
          }
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (event.ctrlKey || event.metaKey) {
          // Reorder down
          if (index < itemCount - 1) {
            onReorder(listKey, index, index + 1);
            onFocusItem({ listKey, itemIndex: index + 1 });
          }
        } else {
          // Navigate down
          if (index < itemCount - 1) {
            onFocusItem({ listKey, itemIndex: index + 1 });
          } else {
            // Wrap to first
            onFocusItem({ listKey, itemIndex: 0 });
          }
        }
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        onRemove(listKey, index);
        break;
      case "Tab":
        // Let default Tab behavior manage focus between lists; we track onFocus
        break;
    }
  };

  return (
    <div
      className="flex flex-col rounded-panel border border-border bg-card/60 p-2"
      data-taker-list={listKey}
      role="group"
      aria-label={TAKER_LIST_LABELS[listKey]}
    >
      <h3 className="mb-1 text-caption font-bold uppercase tracking-wide text-text-secondary">
        {TAKER_LIST_LABELS[listKey]}
        <span className="ml-1 text-caption text-text-muted">({takerIds.length})</span>
      </h3>

      {takerIds.length === 0 ? (
        <p className="py-2 text-caption italic text-text-muted">No players assigned</p>
      ) : (
        <ol className="flex flex-col gap-0.5" role="list" aria-label={`${TAKER_LIST_LABELS[listKey]} ordered list`}>
          {takerIds.map((playerId, index) => {
            const isFocused = isFocusedHere && focusState.itemIndex === index;
            const player = squadById.get(playerId);
            return (
              <li
                key={`${listKey}-${index}`}
                role="listitem"
                aria-label={`${index + 1}. ${player?.lastName ?? playerId}, ${player?.firstName?.[0] ?? ""}`}
                aria-posinset={index + 1}
                aria-setsize={takerIds.length}
                tabIndex={0}
                ref={(el) => {
                  if (isFocused && el) {
                    el.focus();
                  }
                }}
                onFocus={() => onFocusItem({ listKey, itemIndex: index })}
                onBlur={() => {}}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`flex items-center gap-2 rounded-control px-2 py-1 text-body transition-colors ${
                  isFocused
                    ? "bg-text-highlight/15 ring-1 ring-focus-ring"
                    : "hover:bg-row-hover"
                } ${FOCUS_RING.join(" ")}`}
              >
                {/* Number */}
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-chrome-mid text-caption font-bold tabular-nums text-text-bright">
                  {index + 1}
                </span>

                {/* Player name */}
                <span className="flex-1 truncate">
                  <span className="font-semibold">
                    {player?.lastName ?? playerId}
                  </span>
                  {player && (
                    <span className="text-text-secondary">
                      , {player.firstName[0] ?? ""}
                    </span>
                  )}
                  {listKey === "captain" && index === 0 && (
                    <span className="ml-1.5 inline-block rounded-sm bg-fuchsia-700 px-1 text-caption font-bold text-white">
                      Capt
                    </span>
                  )}
                </span>

                {/* Position label */}
                <span className="text-caption text-text-muted">
                  {player?.positionLabel ?? "-"}
                </span>

                {/* Reorder up */}
                {takerIds.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label={`Move ${player?.lastName ?? "player"} up`}
                      tabIndex={-1}
                      disabled={index === 0}
                      onClick={() => {
                        onReorder(listKey, index, index - 1);
                        onFocusItem({ listKey, itemIndex: index - 1 });
                      }}
                      className="rounded px-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${player?.lastName ?? "player"} down`}
                      tabIndex={-1}
                      disabled={index === takerIds.length - 1}
                      onClick={() => {
                        onReorder(listKey, index, index + 1);
                        onFocusItem({ listKey, itemIndex: index + 1 });
                      }}
                      className="rounded px-1 text-text-muted hover:text-text-primary disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </>
                )}

                {/* Remove */}
                <button
                  type="button"
                  aria-label={`Remove ${player?.lastName ?? "player"} from ${TAKER_LIST_LABELS[listKey]}`}
                  tabIndex={-1}
                  onClick={() => onRemove(listKey, index)}
                  className="rounded px-1.5 text-text-danger hover:bg-danger/10"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* Add player picker */}
      <div className="mt-1">
        <PlayerPicker
          listKey={listKey}
          takerIds={takerIds}
          squad={squad}
          squadById={squadById}
          onAdd={onAdd}
        />
      </div>
    </div>
  );
};

// ── Main panel ──────────────────────────────────────────────────────────────

export const SetPrioritiesPanel = ({
  tactic,
  squad,
  squadById,
  onTacticChange,
}: {
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly onTacticChange: (tactic: Tactic) => void;
}) => {
  const [focusState, setFocusState] = useState<FocusState | null>(null);

  // ── Set piece instruction handlers ─────────────────────────────────────────

  const updateSetPiece = useCallback(
    (key: keyof TeamSetPieces, value: string) => {
      onTacticChange(
        new Tactic({
          ...tactic,
          teamSetPieces: { ...tactic.teamSetPieces, [key]: value },
        }),
      );
    },
    [tactic, onTacticChange],
  );

  const setPieceKeys = Object.keys(TEAM_SET_PIECE_VALUES) as ReadonlyArray<keyof TeamSetPieces>;

  // ── Taker list handlers ────────────────────────────────────────────────────

  const addTaker = useCallback(
    (listKey: TakerList, playerId: string) => {
      const current = tactic.takers[listKey] as ReadonlyArray<string>;
      if (current.includes(playerId)) return;
      onTacticChange(
        new Tactic({
          ...tactic,
          takers: {
            ...tactic.takers,
            [listKey]: [...current, playerId as PlayerId],
          },
        }),
      );
    },
    [tactic, onTacticChange],
  );

  const removeTaker = useCallback(
    (listKey: TakerList, index: number) => {
      const current = tactic.takers[listKey] as ReadonlyArray<string>;
      if (index < 0 || index >= current.length) return;
      onTacticChange(
        new Tactic({
          ...tactic,
          takers: {
            ...tactic.takers,
            [listKey]: current.filter((_, i) => i !== index),
          },
        }),
      );
      setFocusState(null);
    },
    [tactic, onTacticChange],
  );

  const reorderTaker = useCallback(
    (listKey: TakerList, fromIndex: number, toIndex: number) => {
      const current = tactic.takers[listKey] as ReadonlyArray<string>;
      if (
        fromIndex < 0 ||
        fromIndex >= current.length ||
        toIndex < 0 ||
        toIndex >= current.length
      )
        return;
      const items = [...current];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved!);
      onTacticChange(
        new Tactic({
          ...tactic,
          takers: {
            ...tactic.takers,
            [listKey]: items,
          },
        }),
      );
    },
    [tactic, onTacticChange],
  );

  // ── Keyboard navigation between lists ──────────────────────────────────────

  const moveFocusBetweenLists = useCallback(
    (direction: "prev" | "next") => {
      const currentIndex = focusState
        ? TAKER_LISTS.indexOf(focusState.listKey)
        : -1;
      const nextIndex =
        direction === "next"
          ? (currentIndex + 1) % TAKER_LISTS.length
          : (currentIndex - 1 + TAKER_LISTS.length) % TAKER_LISTS.length;
      if (nextIndex < 0 || nextIndex >= TAKER_LISTS.length) return;
      const nextList = TAKER_LISTS[nextIndex]!;
      const nextItems = tactic.takers[nextList] as ReadonlyArray<string>;
      setFocusState({
        listKey: nextList,
        itemIndex: nextItems.length > 0 ? 0 : 0,
      });
    },
    [focusState, tactic.takers],
  );

  // ── Non-taker lists (captain is the only non-paired key) ───────────────────

  const soloKeys: ReadonlyArray<TakerList> = ["captain", "penalties"];

  return (
    <div className="flex flex-col gap-4" data-testid="set-priorities-panel">
      {/* ── Team set-piece instructions ──────────────────────────────────── */}
      <section
        aria-label="Team set-piece instructions"
        className="rounded-panel border border-border bg-card/80 p-3"
      >
        <h2 className="mb-2 text-heading font-semibold text-text-primary">
          Team Set-Piece Instructions
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {setPieceKeys.map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 text-body text-text-secondary"
            >
              <span className="w-32 shrink-0">{SET_PIECE_LABELS[key]}</span>
              <select
                value={tactic.teamSetPieces[key]}
                onChange={(e) => updateSetPiece(key, e.target.value)}
                className="flex-1 rounded-control border border-border bg-surface-raised px-2 py-1 text-body text-text-primary"
                aria-label={SET_PIECE_LABELS[key]}
              >
                {TEAM_SET_PIECE_VALUES[key].map((option) => (
                  <option key={option} value={option}>
                    {SET_PIECE_OPTION_LABELS[option] ?? option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      {/* ── Captains ────────────────────────────────────────────────────── */}
      <section aria-label="Captains and penalty takers" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {soloKeys.map((key) => (
            <TakerListPanel
              key={key}
              listKey={key}
              takerIds={tactic.takers[key] as ReadonlyArray<string>}
              squadById={squadById}
              squad={squad}
              onReorder={reorderTaker}
              onRemove={removeTaker}
              onAdd={addTaker}
              onMoveFocus={moveFocusBetweenLists}
              focusState={focusState}
              onFocusItem={setFocusState}
            />
          ))}
        </div>
      </section>

      {/* ── Side-specific taker lists ───────────────────────────────────── */}
      <section aria-label="Set piece takers" className="flex flex-col gap-3">
        {SIDE_KEYS.map(({ label, left, right }) => (
          <div key={label}>
            <h3 className="mb-1 text-body font-semibold text-text-secondary">
              {label}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TakerListPanel
                listKey={left}
                takerIds={tactic.takers[left] as ReadonlyArray<string>}
                squadById={squadById}
                squad={squad}
                onReorder={reorderTaker}
                onRemove={removeTaker}
                onAdd={addTaker}
                onMoveFocus={moveFocusBetweenLists}
                focusState={focusState}
                onFocusItem={setFocusState}
              />
              <TakerListPanel
                listKey={right}
                takerIds={tactic.takers[right] as ReadonlyArray<string>}
                squadById={squadById}
                squad={squad}
                onReorder={reorderTaker}
                onRemove={removeTaker}
                onAdd={addTaker}
                onMoveFocus={moveFocusBetweenLists}
                focusState={focusState}
                onFocusItem={setFocusState}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};