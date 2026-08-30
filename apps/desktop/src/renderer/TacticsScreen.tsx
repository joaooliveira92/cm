import { useEffect, useState } from "react";
import { PlayerId, Tactic, type SaveId, type TacticSlot } from "@cm-clone/contracts";
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { FOCUS_RING } from "./focus.js";
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
} from "./rpc.js";

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
    <p className="text-sm text-slate-400">{label}</p>
    <div className="mt-1 flex gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-action-id={actionId}
          className={`rounded px-3 py-1 text-sm capitalize ${FOCUS_RING.join(" ")} ${
            option === value ? "bg-slate-100 text-slate-900" : "bg-slate-800 hover:bg-slate-700"
          }`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
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

  if (viewError) return <p className="p-8 text-red-400">{describeRpcError(viewError)}</p>;
  if (viewResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading tactics...</p>;
  if (viewResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load tactics</p>;

  const view = viewResult.value;
  const squadById = new Map(view.squad.map((player) => [player.id, player]));
  const assignedElsewhere = (slotIndex: number) =>
    new Set(tactic.slots.filter((_, index) => index !== slotIndex).map((slot) => slot.playerId));

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">Tactics &mdash; {view.club.name}</h1>

      <section className="mt-6">
        <p className="text-sm text-slate-400">Formation</p>
        <div className="mt-1 flex gap-1">
          {FORMATIONS.map((formation) => (
            <button
              key={formation}
              type="button"
              data-action-id="set-formation"
              className={`rounded px-3 py-1 text-sm ${FOCUS_RING.join(" ")} ${
                formation === tactic.formation
                  ? "bg-slate-100 text-slate-900"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
              onClick={() => void dispatchAction("set-formation", { formation })}
            >
              {formation}
            </button>
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
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-4">Slot</th>
              <th className="py-1 pr-4">Position</th>
              <th className="py-1 pr-4">Role</th>
              <th className="py-1 pr-4">Player</th>
              <th className="py-1 pr-4">Role Rating</th>
            </tr>
          </thead>
          <tbody>
            {tactic.slots.map((slot: TacticSlot, index) => {
              const player = squadById.get(slot.playerId);
              const taken = assignedElsewhere(index);
              return (
                <tr key={index} className="border-b border-slate-800">
                  <td className="py-1 pr-4">{index + 1}</td>
                  <td className="py-1 pr-4">{slot.position}</td>
                  <td className="py-1 pr-4">{slot.role}</td>
                  <td className="py-1 pr-4">
                    <select
                      data-action-id="assign-slot-player"
                      className={`rounded bg-slate-800 px-2 py-1 ${FOCUS_RING.join(" ")}`}
                      value={slot.playerId}
                      onChange={(event) =>
                        void dispatchAction("assign-slot-player", {
                          index,
                          playerId: PlayerId.make(event.target.value),
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {view.squad
                        .filter((candidate) => !taken.has(candidate.id) || candidate.id === slot.playerId)
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.firstName} {candidate.lastName}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="py-1 pr-4 font-semibold">
                    {player
                      ? roleRating(player.attributes as PlayerAttributes, slot.role)
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <button
          type="button"
          data-action-id="save-tactic"
          className={`rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 ${FOCUS_RING.join(" ")}`}
          onClick={() => void dispatchAction("save-tactic")}
        >
          Save Tactic
        </button>
        {status && <span className="ml-3 text-sm text-slate-400">{status}</span>}
      </section>
    </main>
  );
};