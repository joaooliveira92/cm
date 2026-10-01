/**
 * The CM 03/04-style Set Priorities panel: the eight ordered taker lists (captains, penalty
 * takers, and free kick, corner and throw-in takers per side), one card per set-piece kind. The
 * team set-piece instructions themselves live under Set Instructions → Team.
 *
 * Edits update the draft through `onTacticChange` and persist when the user presses Save.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Tactic, type PlayerId, type SquadPlayerView } from "@cm-clone/contracts";
import { type TakerList } from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command.js";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.js";
import { FOCUS_RING } from "../focus.js";
import { CM_BAND_CLASS, CM_PANEL_CLASS, CM_PANEL_TITLE_CLASS } from "./cmChrome.js";

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

/** The panel's cards: each pairs two lists under one heading, with a short column title each. */
const GROUPS: ReadonlyArray<{
  readonly title: string;
  readonly lists: readonly [
    { readonly key: TakerList; readonly title: string },
    { readonly key: TakerList; readonly title: string },
  ];
}> = [
  {
    title: "Captain & Penalties",
    lists: [
      { key: "captain", title: "Captains" },
      { key: "penalties", title: "Penalties" },
    ],
  },
  {
    title: "Free Kicks",
    lists: [
      { key: "freeKicksLeft", title: "Left" },
      { key: "freeKicksRight", title: "Right" },
    ],
  },
  {
    title: "Corners",
    lists: [
      { key: "cornersLeft", title: "Left" },
      { key: "cornersRight", title: "Right" },
    ],
  },
  {
    title: "Throw Ins",
    lists: [
      { key: "throwInsLeft", title: "Left" },
      { key: "throwInsRight", title: "Right" },
    ],
  },
];

const ROW_BUTTON_CLASS = `rounded p-0.5 text-text-muted hover:bg-surface-raised hover:text-text-primary disabled:opacity-30 ${FOCUS_RING.join(" ")}`;

// ── Player picker ───────────────────────────────────────────────────────────

/** A searchable picker of every squad player not already in the list, the starting XI first. */
const PlayerPicker = ({
  listKey,
  takerIds,
  squad,
  starterIds,
  onAdd,
}: {
  readonly listKey: TakerList;
  readonly takerIds: ReadonlyArray<string>;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly starterIds: ReadonlyArray<string>;
  readonly onAdd: (listKey: TakerList, playerId: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const available = squad.filter((p) => !takerIds.includes(p.id));
  const starters = starterIds.flatMap((id) => available.filter((p) => p.id === id));
  const others = available.filter((p) => !starterIds.includes(p.id));

  const renderItem = (player: SquadPlayerView) => (
    <CommandItem
      key={player.id}
      value={player.id}
      keywords={[player.lastName, player.firstName, player.positionLabel]}
      onSelect={() => {
        onAdd(listKey, player.id);
        setOpen(false);
      }}
    >
      <span className="flex-1 truncate">
        <span className="font-semibold">{player.lastName}</span>
        <span className="text-text-secondary">, {player.firstName}</span>
      </span>
      <span className="text-caption text-text-muted">{player.positionLabel}</span>
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Add player to ${TAKER_LIST_LABELS[listKey]}`}
          />
        }
      >
        <Plus />
        Add
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search players…" aria-label="Search players" />
          <CommandList>
            <CommandEmpty>No players available</CommandEmpty>
            {starters.length > 0 && <CommandGroup heading="Starting XI">{starters.map(renderItem)}</CommandGroup>}
            {others.length > 0 && <CommandGroup heading="Squad">{others.map(renderItem)}</CommandGroup>}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
  title,
  takerIds,
  squadById,
  squad,
  starterIds,
  onReorder,
  onRemove,
  onAdd,
  focusState,
  onFocusItem,
}: {
  readonly listKey: TakerList;
  readonly title: string;
  readonly takerIds: ReadonlyArray<string>;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly starterIds: ReadonlyArray<string>;
  readonly onReorder: (listKey: TakerList, fromIndex: number, toIndex: number) => void;
  readonly onRemove: (listKey: TakerList, index: number) => void;
  readonly onAdd: (listKey: TakerList, playerId: string) => void;
  readonly focusState: FocusState | null;
  readonly onFocusItem: (state: FocusState | null) => void;
}) => {
  const isFocusedHere = focusState?.listKey === listKey;

  const move = (from: number, to: number) => {
    onReorder(listKey, from, to);
    onFocusItem({ listKey, itemIndex: to });
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = takerIds.length - 1;
    const reorder = event.ctrlKey || event.metaKey;
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        if (reorder) {
          if (index > 0) move(index, index - 1);
        } else {
          onFocusItem({ listKey, itemIndex: index > 0 ? index - 1 : last });
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (reorder) {
          if (index < last) move(index, index + 1);
        } else {
          onFocusItem({ listKey, itemIndex: index < last ? index + 1 : 0 });
        }
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        onRemove(listKey, index);
        break;
    }
  };

  return (
    <div className="flex min-w-0 flex-col" data-taker-list={listKey} role="group" aria-label={TAKER_LIST_LABELS[listKey]}>
      <div className={`mb-1 flex items-center gap-2 rounded-control py-0.5 pl-2 ${CM_BAND_CLASS}`}>
        <h4>{title}</h4>
        <span className="text-caption tabular-nums text-white/70">{takerIds.length}</span>
        <div className="ml-auto">
          <PlayerPicker listKey={listKey} takerIds={takerIds} squad={squad} starterIds={starterIds} onAdd={onAdd} />
        </div>
      </div>

      {takerIds.length === 0 ? (
        <p className="px-2 py-1 text-caption italic text-text-muted">No players assigned</p>
      ) : (
        <ol className="flex flex-col gap-0.5" role="list" aria-label={`${TAKER_LIST_LABELS[listKey]} ordered list`}>
          {takerIds.map((playerId, index) => {
            const isFocused = isFocusedHere && focusState.itemIndex === index;
            const player = squadById.get(playerId);
            const name = player?.lastName ?? playerId;
            const onPitch = starterIds.includes(playerId);
            return (
              <li
                key={`${listKey}-${index}`}
                role="listitem"
                aria-label={`${index + 1}. ${name}, ${player?.firstName[0] ?? ""}`}
                aria-posinset={index + 1}
                aria-setsize={takerIds.length}
                tabIndex={0}
                ref={(el) => {
                  if (isFocused && el) el.focus();
                }}
                onFocus={() => onFocusItem({ listKey, itemIndex: index })}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`group flex items-center gap-2 rounded-control px-2 py-0.5 text-body transition-colors ${
                  isFocused ? "bg-text-highlight/15" : "hover:bg-row-hover"
                } ${FOCUS_RING.join(" ")}`}
              >
                <span className="w-4 shrink-0 text-right text-caption font-bold tabular-nums text-text-muted">
                  {index + 1}
                </span>

                <span className={`flex-1 truncate ${onPitch ? "" : "text-text-muted"}`}>
                  <span className="font-semibold">{name}</span>
                  {player && <span className="text-text-secondary">, {player.firstName[0] ?? ""}</span>}
                  {listKey === "captain" && index === 0 && (
                    <span className="ml-1.5 inline-block rounded-sm bg-fuchsia-700 px-1 text-caption font-bold text-white">
                      Capt
                    </span>
                  )}
                  {!onPitch && <span className="ml-1.5 text-caption italic">not in XI</span>}
                </span>

                <span className="text-caption text-text-muted">{player?.positionLabel ?? "-"}</span>

                <span className="flex items-center opacity-60 group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label={`Move ${name} up`}
                    tabIndex={-1}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    className={ROW_BUTTON_CLASS}
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${name} down`}
                    tabIndex={-1}
                    disabled={index === takerIds.length - 1}
                    onClick={() => move(index, index + 1)}
                    className={ROW_BUTTON_CLASS}
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${name} from ${TAKER_LIST_LABELS[listKey]}`}
                    tabIndex={-1}
                    onClick={() => onRemove(listKey, index)}
                    className={`${ROW_BUTTON_CLASS} hover:text-text-danger`}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
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
  const starterIds = tactic.assignments.filter((id) => id !== "");

  const setList = (listKey: TakerList, ids: ReadonlyArray<string>) =>
    onTacticChange(
      new Tactic({
        ...tactic,
        takers: { ...tactic.takers, [listKey]: ids as ReadonlyArray<PlayerId> },
      }),
    );

  const addTaker = (listKey: TakerList, playerId: string) => {
    const current = tactic.takers[listKey] as ReadonlyArray<string>;
    if (!current.includes(playerId)) setList(listKey, [...current, playerId]);
  };

  const removeTaker = (listKey: TakerList, index: number) => {
    const current = tactic.takers[listKey] as ReadonlyArray<string>;
    if (index < 0 || index >= current.length) return;
    setList(listKey, current.filter((_, i) => i !== index));
    setFocusState(null);
  };

  const reorderTaker = (listKey: TakerList, fromIndex: number, toIndex: number) => {
    const current = tactic.takers[listKey] as ReadonlyArray<string>;
    if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) return;
    const items = [...current];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved!);
    setList(listKey, items);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2" data-testid="set-priorities-panel">
      <p className="shrink-0 rounded-panel bg-black/45 px-3 py-1.5 text-caption text-text-secondary">
        The first listed player on the pitch takes it. Select a name, then Ctrl+↑/↓ to reorder or Delete to
        remove.
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {GROUPS.map((group) => (
          <section
            key={group.title}
            aria-label={group.title}
            className={`${CM_PANEL_CLASS} shrink-0`}
          >
            <h3 className={CM_PANEL_TITLE_CLASS}>{group.title}</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-3 pb-2 md:grid-cols-2">
              {group.lists.map(({ key, title }) => (
                <TakerListPanel
                  key={key}
                  listKey={key}
                  title={title}
                  takerIds={tactic.takers[key] as ReadonlyArray<string>}
                  squadById={squadById}
                  squad={squad}
                  starterIds={starterIds}
                  onReorder={reorderTaker}
                  onRemove={removeTaker}
                  onAdd={addTaker}
                  focusState={focusState}
                  onFocusItem={setFocusState}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
