import { PlayerId } from "@cm-clone/contracts";
import { dispatchAction } from "../../actions/dispatch.js";
import { Alert } from "../../components/ui/alert.js";
import { Button } from "../../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import { useMatchControlContext } from "../matchControlContext.js";
import { NO_SUBSTITUTES_LEFT } from "../substitution.js";

export const SubstitutionControl = () => {
  const { state } = useMatchControlContext();
  const onPitch = state.pitch?.onPitch ?? [];
  const substitutes = state.pitch?.substitutes ?? [];
  const fullNameOf = (id: string) => {
    const player = state.squad.find((p) => p.id === id);
    return player ? `${player.firstName} ${player.lastName}` : id;
  };
  return (
    <>
      {state.isShorthanded && (
        <Alert variant="destructive">
          <p className="font-semibold">Playing with {state.onPitchCount} men</p>
          <p className="mt-1">
            A player is off with no substitute left, so the team plays on a man down.
            Mentality, Tempo and Pressing below can still change.
          </p>
        </Alert>
      )}

      {state.mode._tag === "injury-prompt" && state.mode.severity === "red" && !state.isShorthanded && (
        <Alert variant="destructive">
          <p className="font-semibold">A severe injury has forced a player off.</p>
          {state.subsStatus.capReached && (
            <p className="mt-1">
              No subs left — the team plays on a man down.
            </p>
          )}
        </Alert>
      )}

      <div>
        <p className="mb-1 text-data font-semibold text-text-soft">Make a substitution</p>
        <div className="flex items-end gap-2">
          <div>
            <p className="text-data text-text-secondary">Off</p>
            <Select
              value={state.outPlayerId}
              disabled={state.subsStatus.capReached}
              onValueChange={(value) => {
                if (value !== null) {
                  void dispatchAction("set-live-substitute-off", {
                    playerId: PlayerId.make(value),
                  });
                }
              }}
            >
              <SelectTrigger
                data-action-id="set-live-substitute-off"
                aria-label="Player to bring off"
              >
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select player</SelectItem>
                {onPitch.map((slot) => (
                  <SelectItem key={slot.playerId} value={slot.playerId}>
                    {fullNameOf(slot.playerId)} ({slot.position})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-data text-text-secondary">On</p>
            <Select
              value={state.inPlayerId}
              disabled={state.subsStatus.capReached}
              onValueChange={(value) => {
                if (value !== null) {
                  void dispatchAction("set-live-substitute-in", {
                    playerId: PlayerId.make(value),
                  });
                }
              }}
            >
              <SelectTrigger
                data-action-id="set-live-substitute-in"
                aria-label="Player to bring on"
              >
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select player</SelectItem>
                {substitutes.map((playerId) => (
                  <SelectItem key={playerId} value={playerId}>
                    {fullNameOf(playerId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.pitch !== null && substitutes.length === 0 && !state.subsStatus.capReached && (
              <p className="mt-1 text-data text-text-secondary">{NO_SUBSTITUTES_LEFT}</p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            data-action-id="make-substitution"
            disabled={!state.subsKnown || state.subsStatus.capReached || !state.outPlayerId || !state.inPlayerId}
            onClick={() => void dispatchAction("make-substitution")}
          >
            Make substitution
          </Button>
        </div>
        {state.subAlert && (
          <p role="alert" className="mt-1 text-data text-text-warning">
            {state.subAlert}
          </p>
        )}
      </div>
    </>
  );
};