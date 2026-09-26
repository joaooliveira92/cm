import { useEffect, useState } from "react";
import {
  PlayerId,
  Tactic,
  type SaveId,
  type SquadPlayerView,
  type TacticSlot,
} from "@cm-clone/contracts";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { FOCUS_RING } from "../focus.js";
import {
  FORMATIONS,
  MENTALITY_OPTIONS,
  PRESSING_OPTIONS,
  TEMPO_OPTIONS,
  roleRating,
  type Formation,
  type Mentality,
  type PlayerAttributes,
  type Pressing,
  type Tempo,
} from "@cm-clone/shared";
import { swapLineupSlots } from "../squad/lineupEdits.js";
import { FormationPitch } from "./FormationPitch.js";
import { defaultTacticFor, useTacticDraft } from "./useTacticDraft.js";
import { describeRpcError } from "../rpc.js";

const changeFormation = (tactic: Tactic, formation: Formation): Tactic =>
  new Tactic({
    ...defaultTacticFor(formation),
    mentality: tactic.mentality,
    tempo: tactic.tempo,
    pressing: tactic.pressing,
    bench: tactic.bench,
  });

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

const InstructionSlider = <T extends string>({
  label,
  options,
  value,
  onChange,
  actionId,
}: {
  readonly label: string;
  readonly options: ReadonlyArray<T>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly actionId: string;
}) => (
  <div>
    <p className="text-sm text-text-secondary">{label}</p>
    <div className="mt-1 flex gap-1">
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          variant={option === value ? "default" : "secondary"}
          aria-pressed={option === value}
          data-action-id={actionId}
          className="capitalize"
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  </div>
);

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
    ];
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [saveId, tactic, revision, setTactic, save]);

  if (viewError)
    return (
      <main
        tabIndex={-1}
        data-focus-id="tactics"
        aria-label="Tactics"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
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
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
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
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
      >
        <Alert variant="destructive">
          <p>Failed to load tactics</p>
        </Alert>
      </main>
    );

  const view = viewResult.value;
  const squadById = new Map(view.squad.map((player) => [player.id, player]));
  const assignedElsewhere = (slotIndex: number) =>
    new Set(tactic.slots.filter((_, index) => index !== slotIndex).map((slot) => slot.playerId));
  const starters = new Set(tactic.slots.map((slot) => slot.playerId));
  const reserves = reservesOf(view.squad, starters, tactic.bench);
  // The trigger's label source: without `items`, Base UI's `SelectValue` renders the raw player id.
  const pickerItems = [
    { label: "Unassigned", value: "" },
    ...view.squad.map((player) => ({
      label: `${player.firstName} ${player.lastName}`,
      value: player.id as string,
    })),
  ];

  return (
    <main
      tabIndex={-1}
      data-focus-id="tactics"
      aria-label="Tactics"
      className={`flex flex-col gap-4 bg-background p-6 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <header className="chrome-gradient rounded-panel border border-panel-border px-4 py-2 text-center shadow-chrome">
        <h1 className="text-2xl font-bold text-text-highlight">{view.club.name} Tactics</h1>
        <p className="text-sm font-semibold capitalize text-text-bright">
          {tactic.formation} {tactic.mentality}
        </p>
      </header>

      <section aria-label="Formation and team instructions" className="flex flex-wrap gap-x-8 gap-y-3">
        <div>
          <p className="text-sm text-text-secondary">Formation</p>
          <div className="mt-1 flex gap-1">
            {FORMATIONS.map((formation) => (
              <Button
                key={formation}
                type="button"
                variant={formation === tactic.formation ? "default" : "secondary"}
                aria-pressed={formation === tactic.formation}
                data-action-id="set-formation"
                onClick={() => void dispatchAction("set-formation", { formation })}
              >
                {formation}
              </Button>
            ))}
          </div>
        </div>
        <InstructionSlider<Mentality>
          label="Mentality"
          options={MENTALITY_OPTIONS}
          value={tactic.mentality}
          actionId="set-mentality"
          onChange={(mentality) => void dispatchAction("set-mentality", { value: mentality })}
        />
        <InstructionSlider<Tempo>
          label="Tempo"
          options={TEMPO_OPTIONS}
          value={tactic.tempo}
          actionId="set-tempo"
          onChange={(tempo) => void dispatchAction("set-tempo", { value: tempo })}
        />
        <InstructionSlider<Pressing>
          label="Pressing"
          options={PRESSING_OPTIONS}
          value={tactic.pressing}
          actionId="set-pressing"
          onChange={(pressing) => void dispatchAction("set-pressing", { value: pressing })}
        />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)]">
        <Card aria-labelledby="team-selection-heading" className="p-3">
          <h2 id="team-selection-heading" className="text-base font-bold text-text-highlight">
            Team Selection
          </h2>
          <Table className="mt-2 min-w-full text-left">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pr-2">No</TableHead>
                <TableHead className="pr-4">Player</TableHead>
                <TableHead className="pr-4">Pos</TableHead>
                <TableHead className="pr-4">Role</TableHead>
                <TableHead className="pr-2 text-right">Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tactic.slots.map((slot: TacticSlot, index) => {
                const player = squadById.get(slot.playerId);
                const taken = assignedElsewhere(index);
                return (
                  <TableRow key={index}>
                    <TableCell className="pr-2">
                      <NumberChip label={String(index + 1)} starter />
                    </TableCell>
                    <TableCell className="pr-4">
                      <Select
                        value={slot.playerId}
                        items={pickerItems}
                        open={openSlot === index}
                        onOpenChange={(open) => setOpenSlot(open ? index : null)}
                        onValueChange={(value) => {
                          if (value !== null) {
                            void dispatchAction("assign-slot-player", {
                              index,
                              playerId: PlayerId.make(value),
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          data-action-id="assign-slot-player"
                          aria-label={`Slot ${index + 1} player`}
                          className={SELECT_CLASS}
                        >
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {view.squad
                            .filter(
                              (candidate) =>
                                !taken.has(candidate.id) || candidate.id === slot.playerId,
                            )
                            .map((candidate) => (
                              <SelectItem key={candidate.id} value={candidate.id}>
                                {candidate.firstName} {candidate.lastName}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="pr-4 font-semibold">{slot.position}</TableCell>
                    <TableCell className="pr-4 text-text-body">{slot.role}</TableCell>
                    <TableCell className="pr-2 text-right font-semibold tabular-nums">
                      {player
                        ? roleRating(player.attributes as PlayerAttributes, slot.role)
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
                className="flex items-center gap-3 px-2 py-1 text-sm text-text-secondary"
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
          />
        </div>
      </div>

      <section className="chrome-gradient flex items-center gap-3 rounded-panel border border-panel-border px-3 py-2 shadow-chrome">
        {conflict !== null && (
          <>
            <span role="alert" className="text-sm text-text-danger" data-testid="tactic-conflict">
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
        {status && <span className="text-sm text-text-bright">{status}</span>}
        <Button
          type="button"
          className="ml-auto"
          data-action-id="save-tactic"
          onClick={() => void dispatchAction("save-tactic")}
        >
          Save Tactic
        </Button>
      </section>
    </main>
  );
};

/** The shirt-number cell: a starter's slot number on the green chip, a reserve's bench slot (or a
 *  dash) on the blue one. The colour repeats what the label already says, never replaces it. */
const NumberChip = ({ label, starter }: { readonly label: string; readonly starter: boolean }) => (
  <span
    className={`inline-flex h-5 min-w-9 items-center justify-center rounded-control px-1 text-2xs font-bold tabular-nums text-text-bright ${
      starter ? "bg-pitch-marker-gk" : "bg-chrome-mid"
    }`}
  >
    {label}
  </span>
);

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

/** The slot-player picker's trigger paint. See the note in `table/TablePanel.tsx`. */
const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;
