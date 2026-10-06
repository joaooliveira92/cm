import { dispatchAction } from "../../actions/dispatch.js";
import { Badge } from "../../components/ui/badge.js";
import { FOCUS_RING } from "../../focus.js";
import { useMatchControlContext } from "../matchControlContext.js";

export const PanelHeader = () => {
  const { state, meta } = useMatchControlContext();
  const { toggleRef } = meta;
  return (
    <button
      type="button"
      ref={toggleRef}
      data-action-id="toggle-control-panel"
      className={`flex w-full items-center justify-between px-4 py-2 text-left text-heading ${FOCUS_RING.join(" ")}`}
      onClick={() => void dispatchAction("toggle-control-panel")}
    >
      <span>
        Tactics &amp; substitutions
        {state.injuryPrompt && (
          <Badge className="ml-2" variant={state.hasRedInjury ? "destructive" : "warning"}>
            {state.hasRedInjury ? "Severe injury — must re-sub" : "Knock — sub or play on"}
          </Badge>
        )}
      </span>
      <span className="text-text-secondary">{state.open ? "Hide" : "Show"}</span>
    </button>
  );
};