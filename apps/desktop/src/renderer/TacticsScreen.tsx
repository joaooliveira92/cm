import { useEffect, useState } from "react";
import { PlayerId, Tactic, type SaveId, type TacticSlot } from "@cm-clone/contracts";
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
}: {
  readonly label: string;
  readonly options: ReadonlyArray<T>;
  readonly value: T;
  readonly onChange: (value: T) => void;
}) => (
  <div>
    <p className="text-sm text-slate-400">{label}</p>
    <div className="mt-1 flex gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`rounded px-3 py-1 text-sm capitalize ${
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
  if (viewError) return <p className="p-8 text-red-400">{describeRpcError(viewError)}</p>;
  if (viewResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading tactics...</p>;
  if (viewResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load tactics</p>;

  const view = viewResult.value;
  const tactic = draft ?? view.tactic ?? defaultTacticFor("4-4-2");

  const squadById = new Map(view.squad.map((player) => [player.id, player]));
  const assignedElsewhere = (slotIndex: number) =>
    new Set(tactic.slots.filter((_, index) => index !== slotIndex).map((slot) => slot.playerId));

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
              className={`rounded px-3 py-1 text-sm ${
                formation === tactic.formation
                  ? "bg-slate-100 text-slate-900"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
              onClick={() => setDraft(changeFormation(tactic, formation))}
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
          onChange={(mentality) => setDraft(new Tactic({ ...tactic, mentality }))}
        />
        <InstructionSlider<Tempo>
          label="Tempo"
          options={TEMPO_OPTIONS}
          value={tactic.tempo}
          onChange={(tempo) => setDraft(new Tactic({ ...tactic, tempo }))}
        />
        <InstructionSlider<Pressing>
          label="Pressing"
          options={PRESSING_OPTIONS}
          value={tactic.pressing}
          onChange={(pressing) => setDraft(new Tactic({ ...tactic, pressing }))}
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
                      className="rounded bg-slate-800 px-2 py-1"
                      value={slot.playerId}
                      onChange={(event) => setDraft(changeSlotPlayer(tactic, index, PlayerId.make(event.target.value)))}
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
          className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
          onClick={onSubmit}
        >
          Save Tactic
        </button>
        {status && <span className="ml-3 text-sm text-slate-400">{status}</span>}
      </section>
    </main>
  );
};