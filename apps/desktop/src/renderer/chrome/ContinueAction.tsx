import { ACTION_REGISTRY } from "../actions/allActions.js";
import { dispatchAction } from "../actions/dispatch.js";
import { FOCUS_RING } from "../focus.js";
import { BTN_HEADER_PRIMARY } from "../theme.js";
import { useCareerState } from "./CareerStateProvider.js";
import { ArrowRight } from "lucide-react";

export const ContinueAction = () => {
  const { continueDisabled, advancing } = useCareerState();
  const action = ACTION_REGISTRY.get("continue");
  if (action === undefined) return null;

  const treatment = action.primary === true ? BTN_HEADER_PRIMARY : "";

  return (
    <button
      type="button"
      data-action-id={action.id}
      disabled={continueDisabled}
      title={continueDisabled ? action.unavailableReason : undefined}
      className={`flex items-center gap-1.5 text-sm ${treatment} ${FOCUS_RING.join(" ")}`}
      onClick={() => void dispatchAction(action.id)}
    >
      {advancing ? "Advancing\u2026" : action.label}
      {!advancing && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
    </button>
  );
};