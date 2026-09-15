import { useState } from "react";
import { PlayerId, type SaveId, type TacticSlot } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { SELECT_CLASS } from "../match/controls.js";
import { LiveCommandFrame } from "../match/LiveCommandFrame.js";
import { substitutionErrorLabel, validateLiveSubstitution } from "../match/substitution.js";
import { useLiveMatchCommands, type LiveMatchReady } from "../match/useLiveMatchCommands.js";

/** Screen 97, substitutions half: pick who comes off and who comes on, then submit a
 *  `MakeSubstitution` to the live match. The caps shown and enforced come from the match. */
export const MatchSubstitutionsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const commands = useLiveMatchCommands(saveId);
  return (
    <LiveCommandFrame saveId={saveId} focusId="matchSubstitutions" title="Match Substitutions" commands={commands}>
      {(ready) => (
        <SubstitutionForm
          ready={ready}
          pending={commands.status?._tag === "pending"}
          onSubmit={(outPlayerId, inPlayerId) =>
            commands.submit({ _tag: "MakeSubstitution", clubId: ready.clubId, outPlayerId, inPlayerId })
          }
        />
      )}
    </LiveCommandFrame>
  );
};

const SubstitutionForm = ({
  ready,
  pending,
  onSubmit,
}: {
  readonly ready: LiveMatchReady;
  readonly pending: boolean;
  readonly onSubmit: (outPlayerId: PlayerId, inPlayerId: PlayerId) => Promise<void>;
}) => {
  const [outPlayerId, setOutPlayerId] = useState("");
  const [inPlayerId, setInPlayerId] = useState("");
  const [alert, setAlert] = useState<string | null>(null);

  const { tactic, squad, snapshot } = ready;
  const onPitchIds = new Set(tactic.slots.map((slot: TacticSlot) => slot.playerId));
  const bench = squad.filter((player) => !onPitchIds.has(player.id));
  const nameOf = (id: string) => {
    const player = squad.find((p) => p.id === id);
    return player ? `${player.firstName} ${player.lastName}` : id;
  };
  const capReached = snapshot.subs.capReached;

  const submit = async () => {
    const validation = validateLiveSubstitution(snapshot.subs, outPlayerId, inPlayerId);
    if (!validation.ok) {
      setAlert(substitutionErrorLabel(validation.error!));
      return;
    }
    setAlert(null);
    await onSubmit(PlayerId.make(outPlayerId), PlayerId.make(inPlayerId));
    setOutPlayerId("");
    setInPlayerId("");
  };

  return (
    <section aria-label="Make a substitution" className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Player coming off
          <select
            value={outPlayerId}
            disabled={capReached || pending}
            onChange={(event) => setOutPlayerId(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Select player</option>
            {tactic.slots.map((slot: TacticSlot) => (
              <option key={slot.playerId} value={slot.playerId}>
                {nameOf(slot.playerId)} ({slot.position})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-secondary">
          Player coming on
          <select
            value={inPlayerId}
            disabled={capReached || pending}
            onChange={(event) => setInPlayerId(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Select player</option>
            {bench.map((player) => (
              <option key={player.id} value={player.id}>
                {player.firstName} {player.lastName}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          disabled={capReached || pending || outPlayerId === "" || inPlayerId === ""}
          onClick={() => void submit()}
        >
          {pending ? "Submitting..." : "Make substitution"}
        </Button>
      </div>
      {capReached && (
        <p className="text-xs text-text-warning">{substitutionErrorLabel("cap-reached")}</p>
      )}
      {alert && (
        <p role="alert" className="text-xs text-text-warning">
          {alert}
        </p>
      )}
    </section>
  );
};
