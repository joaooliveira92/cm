import { useEffect, useState } from "react";
import { PlayerId, Tactic, type SaveId, type TacticSlot } from "@cm-clone/contracts";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { Button } from "../components/ui/button.js";
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
  FORMATION_SLOTS,
  MENTALITY_OPTIONS,
  POSITION_ROLES,
  PRESSING_OPTIONS,
  TEMPO_OPTIONS,
  roleRating,
  type Formation,
  type Mentality,
  type PlayerAttributes,
  type Pressing,
  type Tempo,
} from "@cm-clone/shared";
import {
  changeTacticsMutation,
  describeRpcError,
  tacticsAtom,
  typedError,
  useAtomSet,
  useAtomValue,
} from "../rpc.js";

const defaultTacticFor = (formation: Formation): Tactic =>
  new Tactic({
    formation,
    slots: FORMATION_SLOTS[formation].map((position) => ({
      position,
      role: POSITION_ROLES[position],
      playerId: PlayerId.make(""),
    })),
    mentality: "balanced",
    tempo: "normal",
    pressing: "medium",
  });

const changeFormation = (tactic: Tactic, formation: Formation): Tactic =>
  new Tactic({ ...defaultTacticFor(formation), mentality: tactic.mentality, tempo: tactic.tempo, pressing: tactic.pressing });

const changeSlotPlayer = (tactic: Tactic, slotIndex: number, playerId: PlayerId): Tactic =>
  new Tactic({
    ...tactic,
    slots: tactic.slots.map((slot, index) => (index === slotIndex ? { ...slot, playerId } : slot)),
  });

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
  const viewResult = useAtomValue(tacticsAtom(saveId));
  const [draft, setDraft] = useState<Tactic | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const saveTactic = useAtomSet(changeTacticsMutation, { mode: "promise" });

  useEffect(() => {
    if (draft === null && viewResult._tag === "Success") {
      setDraft(viewResult.value.tactic ?? defaultTacticFor("4-4-2"));
    }
  }, [draft, viewResult]);

  const viewError = typedError(viewResult);

  // A screen-safe tactic that also holds pre-load / error states, so the live
  // handler registration below never sits behind a conditional early return.
  const pendingView = viewResult._tag === "Success" ? viewResult.value : null;
  const tactic = draft ?? pendingView?.tactic ?? defaultTacticFor("4-4-2");

  const onSubmit = async () => {
    setStatus("Saving...");
    try {
      const saved = await saveTactic({ saveId, tactic });
      setDraft(saved.tactic ?? tactic);
      setStatus("Saved.");
    } catch {
      setStatus("Failed to save tactic — check every slot has a unique player assigned.");
    }
  };

  // Register the Tactics screen's operation handlers (save + the draft edits).
  // Decided before the error/loading returns so hook order is unconditional.
  useEffect(() => {
    const unregisters = [
      registerActionHandler("save-tactic", () => {
        void onSubmit();
      }),
      registerActionHandler("set-formation", (params) =>
        setDraft(changeFormation(tactic, (params as { formation: Formation }).formation)),
      ),
      registerActionHandler("set-mentality", (params) =>
        setDraft(new Tactic({ ...tactic, mentality: (params as { value: Mentality }).value })),
      ),
      registerActionHandler("set-tempo", (params) =>
        setDraft(new Tactic({ ...tactic, tempo: (params as { value: Tempo }).value })),
      ),
      registerActionHandler("set-pressing", (params) =>
        setDraft(new Tactic({ ...tactic, pressing: (params as { value: Pressing }).value })),
      ),
      registerActionHandler("assign-slot-player", (params) => {
        const p = params as { index: number; playerId: PlayerId };
        setDraft(changeSlotPlayer(tactic, p.index, p.playerId));
      }),
    ];
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [saveId, tactic]);

  if (viewError) return <p className="p-8 text-text-danger">{describeRpcError(viewError)}</p>;
  if (viewResult._tag === "Initial") return <p className="p-8 text-text-secondary">Loading tactics...</p>;
  if (viewResult._tag === "Failure") return <p className="p-8 text-text-danger">Failed to load tactics</p>;

  const view = viewResult.value;
  const squadById = new Map(view.squad.map((player) => [player.id, player]));
  const assignedElsewhere = (slotIndex: number) =>
    new Set(tactic.slots.filter((_, index) => index !== slotIndex).map((slot) => slot.playerId));

  return (
    <main className="bg-background p-8 text-foreground">
      <h1 className="text-2xl font-bold">Tactics</h1>

      <section className="mt-6">
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
      </section>

      <section className="mt-6 flex gap-8">
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

      <section className="mt-6">
        <Table className="min-w-full text-left">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pr-4">Slot</TableHead>
              <TableHead className="pr-4">Position</TableHead>
              <TableHead className="pr-4">Role</TableHead>
              <TableHead className="pr-4">Player</TableHead>
              <TableHead className="pr-4">Role Rating</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tactic.slots.map((slot: TacticSlot, index) => {
              const player = squadById.get(slot.playerId);
              const taken = assignedElsewhere(index);
              return (
                <TableRow key={index}>
                  <TableCell className="pr-4 tabular-nums">{index + 1}</TableCell>
                  <TableCell className="pr-4">{slot.position}</TableCell>
                  <TableCell className="pr-4">{slot.role}</TableCell>
                  <TableCell className="pr-4">
                    <Select
                      value={slot.playerId}
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
                  <TableCell className="pr-4 font-semibold tabular-nums">
                    {player
                      ? roleRating(player.attributes as PlayerAttributes, slot.role)
                      : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section className="mt-6">
        <Button
          type="button"
          data-action-id="save-tactic"
          onClick={() => void dispatchAction("save-tactic")}
        >
          Save Tactic
        </Button>
        {status && <span className="ml-3 text-sm text-text-secondary">{status}</span>}
      </section>
    </main>
  );
};

/** The slot-player picker's trigger paint. See the note in `table/TablePanel.tsx`. */
const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;
