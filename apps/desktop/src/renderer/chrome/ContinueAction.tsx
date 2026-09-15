import { dispatchAction } from "../actions/dispatch.js";
import { FOCUS_RING } from "../focus.js";
import { BTN_HEADER_PRIMARY } from "../theme.js";
import { useCareerState } from "./CareerStateProvider.js";
import { ArrowRight } from "lucide-react";

export const ContinueAction = () => {
  const { continueDisabled, advancing, continueLabel } = useCareerState();

  return (
    <button
      type="button"
      data-action-id="continue"
      disabled={continueDisabled}
      title={continueDisabled ? "The Calendar cannot advance right now." : undefined}
      className={`flex items-center gap-1.5 text-sm ${BTN_HEADER_PRIMARY} ${FOCUS_RING.join(" ")}`}
      onClick={() => void dispatchAction("continue")}
    >
      {advancing ? "Advancing\u2026" : continueLabel}
      {!advancing && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
    </button>
  );
};