import { useEffect, useMemo, useState } from "react";
import {
  PlayerId,
  Tactic,
  type SaveId,
  type SquadPlayerView,
  type TacticSlot,
} from "@cm-clone/contracts";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { useScreenBottomBarActions } from "../chrome/bottom-bar/index.js";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { FOCUS_RING } from "../focus.js";
import {
  FORMATIONS,
  FORMATION_SLOTS,
  MENTALITY_OPTIONS,
  POSITION_ROLES,
  PRESSING_OPTIONS,
  TEMPO_OPTIONS,
  emptyBench,
  isCustomShape,
  type Formation,
  type Mentality,
  type Pressing,
  type Tempo,
  type Position,
} from "@cm-clone/shared";
import { swapLineupSlots } from "../squad/lineupEdits.js";
import { ToolbarChoiceMenu, type ToolbarChoice } from "../squad/ToolbarChoiceMenu.js";
import { ACTIONS_ROW_BUTTON_CLASS } from "../squad/actionsRowClasses.js";
import { clearToolbarControls, setToolbarControls } from "../screenToolbarControls.js";
import { FormationPitch } from "./FormationPitch.js";
import { NumberChip } from "./NumberChip.js";
import { TeamSelectionGrid } from "./TeamSelectionGrid.js";
import { defaultTacticFor, useTacticDraft } from "./useTacticDraft.js";
import { describeRpcError } from "../rpc.js";

/** A slot moved to `position`, carrying that Position's Role; its player stays. */
const placeSlot = (slot: TacticSlot, position: Position): TacticSlot => ({
  ...slot,
  position,
  role: POSITION_ROLES[position],
});

/** A new Formation starts over from its template with an empty eleven. Picking the current one
 *  again only resets a custom shape to its template, keeping every slot's player. */
const changeFormation = (tactic: Tactic, formation: Formation): Tactic =>
  formation === tactic.formation
    ? new Tactic({
        ...tactic,
        slots: tactic.slots.map((slot, index) =>
          placeSlot(slot, FORMATION_SLOTS[formation][index]!),
        ),
      })
    : new Tactic({
        ...defaultTacticFor(formation),
        mentality: tactic.mentality,
        tempo: tactic.tempo,
        pressing: tactic.pressing,
        bench: tactic.bench,
      });

/** One slot moved to another outfield Position: the Formation's shape becomes a custom one. */
const moveSlot = (tactic: Tactic, slotIndex: number, position: Position): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) => (index === slotIndex ? placeSlot(slot, position) : slot)),
  });


/** Every starter slot and bench place emptied; the formation and instructions stay. The server
 *  refuses a Tactic with an empty starter, so this is a draft to refill, never a save on its own. */
const clearSelection = (tactic: Tactic): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot) => ({ ...slot, playerId: PlayerId.make("") })),
    bench: emptyBench(),
  });

const hasSelection = (tactic: Tactic): boolean =>
  tactic.slots.some((slot) => slot.playerId !== "") || tactic.bench.some((place) => place !== null);

const changeSlotPlayer = (tactic: Tactic, slotIndex: number, playerId: PlayerId): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) =>
      index === slotIndex ? { ...slot, playerId } : slot,
    ),
  });

/** The one conflict sentence, rendered as the `role="alert"` span beside the Refresh button. It is
 * the only place the editor words a conflict — the generic `describeRpcError` fallback in
 * `errors.ts` exists for surfaces with no room for a button, not for this screen. */
const CONFLICT_MESSAGE =
  "A newer tactic was saved since you loaded this page. Your draft is kept — refresh to load the current version.";

/** "balanced" → "Balanced": the instruction values are lower-case identifiers. */
const titleCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const choicesOf = (options: ReadonlyArray<string>): ReadonlyArray<ToolbarChoice> =>
  options.map((option) => ({ value: option, label: titleCase(option) }));

const FORMATION_CHOICES = FORMATIONS.map((formation) => ({ value: formation, label: formation }));
const MENTALITY_CHOICES = choicesOf(MENTALITY_OPTIONS);
const TEMPO_CHOICES = choicesOf(TEMPO_OPTIONS);
const PRESSING_CHOICES = choicesOf(PRESSING_OPTIONS);

export const TacticsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const { viewResult, viewError, tactic, revision, conflict, status, setTactic, save, refresh } =
    useTacticDraft(saveId, {
      saveFailureMessage: "Failed to save tactic — check every slot has a unique player assigned.",
    });
  // The slot whose picker is open, so a click on its pitch marker can open it too.
  const [openSlot, setOpenSlot] = useState<number | null>(null);

  // Register the Tactics screen's operation handlers (save + the draft edits).
  // Decided before the error/loading returns so hook order is unconditional.
  useEffect(() => {
    const unregisters = [
      registerActionHandler("save-tactic", () => {
        void save();
      }),
      registerActionHandler("set-formation", (params) =>
        setTactic(changeFormation(tactic, (params as { formation: Formation }).formation)),
      ),
      registerActionHandler("set-mentality", (params) =>
        setTactic(new Tactic({ ...tactic, mentality: (params as { value: Mentality }).value })),
      ),
      registerActionHandler("set-tempo", (params) =>
        setTactic(new Tactic({ ...tactic, tempo: (params as { value: Tempo }).value })),
      ),
      registerActionHandler("set-pressing", (params) =>
        setTactic(new Tactic({ ...tactic, pressing: (params as { value: Pressing }).value })),
      ),
      registerActionHandler("assign-slot-player", (params) => {
        const p = params as { index: number; playerId: PlayerId };
        setTactic(changeSlotPlayer(tactic, p.index, p.playerId));
      }),
      // Starter slots are the lineup's first orders, so a slot index is its lineup order.
      registerActionHandler("swap-slot-players", (params) => {
        const p = params as { from: number; to: number };
        setTactic(swapLineupSlots(tactic, p.from, p.to));
      }),
      registerActionHandler("set-slot-position", (params) => {
        const p = params as { index: number; position: Position };
        setTactic(moveSlot(tactic, p.index, p.position));
      }),
      registerActionHandler("clear-tactic-selection", () => setTactic(clearSelection(tactic))),
    ];
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [saveId, tactic, revision, setTactic, save]);

  // The screen's verbs live in the shell's bottom bar, beside Continue. They dispatch the same
  // registered Actions the palette lists, so the bar is one more way in, not a second definition.
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

  /* Formation and the three team instructions sit in the career chrome's actions row, as the
   *  Squad's selectors do. A custom shape says so on the Formation trigger and brings a Reset
   *  beside it: picking the checked Formation again in a radio menu does nothing. */
  const loaded = viewResult._tag === "Success";
  const customShape = isCustomShape(
    tactic.formation,
    tactic.slots.map((slot) => slot.position),
  );
  const toolbarControls = useMemo(
    () =>
      loaded ? (
        <>
          <ToolbarChoiceMenu
            ariaLabel="Formation"
            actionId="set-formation"
            triggerText={`Formation: ${tactic.formation}${customShape ? " (custom)" : ""}`}
            groupLabel="Formation"
            value={tactic.formation}
            choices={FORMATION_CHOICES}
            onChoose={(formation) => void dispatchAction("set-formation", { formation })}
          />
          {customShape && (
            <button
              type="button"
              className={ACTIONS_ROW_BUTTON_CLASS}
              data-action-id="set-formation"
              onClick={() => void dispatchAction("set-formation", { formation: tactic.formation })}
            >
              Reset to {tactic.formation}
            </button>
          )}
          <ToolbarChoiceMenu
            ariaLabel="Mentality"
            actionId="set-mentality"
            triggerText={`Mentality: ${titleCase(tactic.mentality)}`}
            groupLabel="Mentality"
            value={tactic.mentality}
            choices={MENTALITY_CHOICES}
            onChoose={(value) => void dispatchAction("set-mentality", { value })}
          />
          <ToolbarChoiceMenu
            ariaLabel="Tempo"
            actionId="set-tempo"
            triggerText={`Tempo: ${titleCase(tactic.tempo)}`}
            groupLabel="Tempo"
            value={tactic.tempo}
            choices={TEMPO_CHOICES}
            onChoose={(value) => void dispatchAction("set-tempo", { value })}
          />
          <ToolbarChoiceMenu
            ariaLabel="Pressing"
            actionId="set-pressing"
            triggerText={`Pressing: ${titleCase(tactic.pressing)}`}
            groupLabel="Pressing"
            value={tactic.pressing}
            choices={PRESSING_CHOICES}
            onChoose={(value) => void dispatchAction("set-pressing", { value })}
          />
        </>
      ) : null,
    [loaded, customShape, tactic.formation, tactic.mentality, tactic.tempo, tactic.pressing],
  );
  useEffect(() => {
    setToolbarControls(toolbarControls);
    return () => clearToolbarControls();
  }, [toolbarControls]);

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

  const view = viewResult.value;
  const squadById = new Map(view.squad.map((player) => [player.id, player]));
  const starters = new Set(tactic.slots.map((slot) => slot.playerId));
  const reserves = reservesOf(view.squad, starters, tactic.bench);

  return (
    <main
      tabIndex={-1}
      data-focus-id="tactics"
      aria-label="Tactics"
      className={`flex flex-col gap-4 p-6 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="sr-only">{view.club.name} Tactics</h1>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)]">
        <Card aria-labelledby="team-selection-heading" className="p-3">
          <h2 id="team-selection-heading" className="text-heading text-text-highlight">
            Team Selection
          </h2>
          <TeamSelectionGrid
            tactic={tactic}
            squad={view.squad}
            openSlot={openSlot}
            onOpenSlotChange={setOpenSlot}
          />
          {/* Everyone the eleven leaves out, below the dashed line the way the pickers' own list
              reads: the named bench first, in bench order, then the rest of the squad. A list, not
              table rows — the eleven rows above are the only editable ones. */}
          <ul
            aria-label="Reserves"
            className="mt-1 max-h-72 overflow-y-auto border-t border-dashed border-border-subtle pt-1"
          >
            {reserves.map(({ player, benchIndex }) => (
              <li
                key={player.id}
                className="flex items-center gap-3 px-2 py-1 text-body text-text-secondary"
              >
                <NumberChip
                  label={benchIndex === null ? "-" : `SB${benchIndex + 1}`}
                  starter={false}
                />
                <span className="flex-1 truncate">
                  {player.firstName} {player.lastName}
                </span>
                <span className="font-semibold">{naturalPositions(player)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="lg:sticky lg:top-0">
          <FormationPitch
            formation={tactic.formation}
            slots={tactic.slots}
            squadById={squadById}
            onPick={setOpenSlot}
            onSwap={(from, to) => void dispatchAction("swap-slot-players", { from, to })}
            onMove={(index, position) => void dispatchAction("set-slot-position", { index, position })}
          />
          <p className="mt-2 text-center text-data text-text-secondary">
            Drag a player onto a teammate to swap them, or onto open grass to change their position.
          </p>
        </div>
      </div>

      {(conflict !== null || status) && (
        <section className="chrome-gradient flex items-center gap-3 rounded-panel border border-panel-border px-3 py-2 shadow-chrome">
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
    </main>
  );
};

/** Every squad player outside the eleven, named-bench first in bench order, then squad order. */
const reservesOf = (
  squad: ReadonlyArray<SquadPlayerView>,
  starters: ReadonlySet<string>,
  bench: ReadonlyArray<PlayerId | null>,
): ReadonlyArray<{ readonly player: SquadPlayerView; readonly benchIndex: number | null }> => {
  const benchIndexOf = new Map(
    bench.flatMap((id, index) => (id === null ? [] : [[id as string, index] as const])),
  );
  return squad
    .filter((player) => !starters.has(player.id))
    .map((player) => ({ player, benchIndex: benchIndexOf.get(player.id) ?? null }))
    .sort(
      (a, b) =>
        (a.benchIndex ?? Number.POSITIVE_INFINITY) - (b.benchIndex ?? Number.POSITIVE_INFINITY),
    );
};

/** "D/DM" — the positions a player is natural in, the ones a manager picks a reserve by. */
const naturalPositions = (player: SquadPlayerView): string =>
  player.positions
    .filter((position) => position.familiarity === "natural")
    .map((position) => position.position)
    .join("/");
