import { dispatchAction } from "../../actions/dispatch.js";
import { Alert } from "../../components/ui/alert.js";
import { Button } from "../../components/ui/button.js";
import { useMatchControlContext } from "../matchControlContext.js";

export const InjuryDecisionModal = () => {
  const { state } = useMatchControlContext();
  if (state.mode._tag !== "injury-decision" || !state.orangeInjury) return null;
  return (
    <Alert className="border-text-warning/40 bg-text-warning/10 text-text-warning">
      <p className="font-semibold">
        {state.orangeInjury.playerId} has a knock and you&apos;ve no subs left.
      </p>
      <p className="mt-1">
        Play on (crippled, at risk of escalation to red) or bring them off and play with 10.
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-action-id="play-on"
          onClick={() => void dispatchAction("play-on")}
        >
          Play on
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          data-action-id="bring-off"
          onClick={() => void dispatchAction("bring-off")}
        >
          Bring off (10 men)
        </Button>
      </div>
    </Alert>
  );
};