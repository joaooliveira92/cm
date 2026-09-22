import { useState } from "react";
import { Tactic, type SaveId, type TacticSlot } from "@cm-clone/contracts";
import { MENTALITY_OPTIONS, PRESSING_OPTIONS, TEMPO_OPTIONS } from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import { LiveCommandFrame } from "../match/LiveCommandFrame.js";
import { useLiveMatchCommands, type LiveMatchReady } from "../match/useLiveMatchCommands.js";

/** Screen 97, tactics half: the formation and line-up in play, and the three live Team
 *  Instructions, submitted to the match as one `ChangeTactics`. */
export const MatchMatchTacticsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const commands = useLiveMatchCommands(saveId);
  return (
    <LiveCommandFrame saveId={saveId} focusId="matchMatchTactics" title="Match Tactics" commands={commands}>
      {(ready) => (
        <TacticsForm
          // A new tactic in play (an applied substitution, an accepted change) resets the draft.
          key={JSON.stringify(ready.tactic)}
          ready={ready}
          pending={commands.status?._tag === "pending"}
          onSubmit={(tactic) => commands.submit({ _tag: "ChangeTactics", clubId: ready.clubId, tactic })}
        />
      )}
    </LiveCommandFrame>
  );
};

const InstructionChoice = <T extends string>({
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
  <div role="group" aria-label={label}>
    <p className="text-xs text-text-secondary">{label}</p>
    <div className="mt-1 flex gap-1">
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={option === value ? "default" : "secondary"}
          aria-pressed={option === value}
          className="capitalize"
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  </div>
);

const TacticsForm = ({
  ready,
  pending,
  onSubmit,
}: {
  readonly ready: LiveMatchReady;
  readonly pending: boolean;
  readonly onSubmit: (tactic: Tactic) => Promise<void>;
}) => {
  const [draft, setDraft] = useState<Tactic>(ready.tactic);
  const nameOf = (id: string) => {
    const player = ready.squad.find((p) => p.id === id);
    return player ? `${player.firstName} ${player.lastName}` : id;
  };
  const changed =
    draft.mentality !== ready.tactic.mentality ||
    draft.tempo !== ready.tactic.tempo ||
    draft.pressing !== ready.tactic.pressing;

  return (
    <>
      <section aria-label="Formation in play" className="rounded-panel border border-panel-border bg-panel-bg p-4">
        <p className="font-semibold">Formation: {draft.formation}</p>
        <p className="mt-1 text-xs text-text-muted">
          The formation stays fixed while the match is live; only Mentality, Tempo and Pressing change.
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
          {draft.slots.map((slot: TacticSlot) => (
            <li key={`${slot.position}-${slot.playerId}`}>
              <span className="mr-2 font-mono text-xs text-text-tertiary">{slot.position}</span>
              {nameOf(slot.playerId)}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Team instructions" className="space-y-3">
        <div className="flex flex-wrap gap-6">
          <InstructionChoice
            label="Mentality"
            options={MENTALITY_OPTIONS}
            value={draft.mentality}
            onChange={(mentality) => setDraft(new Tactic({ ...draft, mentality }))}
          />
          <InstructionChoice
            label="Tempo"
            options={TEMPO_OPTIONS}
            value={draft.tempo}
            onChange={(tempo) => setDraft(new Tactic({ ...draft, tempo }))}
          />
          <InstructionChoice
            label="Pressing"
            options={PRESSING_OPTIONS}
            value={draft.pressing}
            onChange={(pressing) => setDraft(new Tactic({ ...draft, pressing }))}
          />
        </div>
        <Button type="button" disabled={!changed || pending} onClick={() => void onSubmit(draft)}>
          {pending ? "Submitting..." : "Apply tactics change"}
        </Button>
      </section>
    </>
  );
};
