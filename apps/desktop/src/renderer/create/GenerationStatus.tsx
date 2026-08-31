import { FOCUS_RING } from "../focus.js";
import { announcement, type GenerationState } from "./generation.js";

/**
 * The primary status region for the generation phase. It reports state, never a
 * percentage: `beginCareer` exposes no measure whose unit is a club that is
 * fully ready for selection, and a count that advances when club rows exist but
 * squads and economy do not would misrepresent readiness. So the bar is
 * indeterminate — `role="progressbar"` with no `aria-valuenow`, which is how an
 * assistive technology is told the value is unknown rather than zero.
 *
 * The live region is `polite` and carries one sentence per state, so a screen
 * reader hears the wait start and end without hearing it tick.
 */
export const GenerationStatus = ({
  state,
  onRetry,
}: {
  readonly state: GenerationState;
  readonly onRetry: () => void;
}) => (
  <div className="space-y-3">
    <p aria-live="polite" role="status" className="sr-only">
      {announcement(state) ?? ""}
    </p>

    {(state._tag === "Pending" || state._tag === "Running") && (
      <>
        <p className="text-slate-400">Building the league&hellip;</p>
        <div
          role="progressbar"
          aria-label="Building the league"
          aria-busy="true"
          className="h-1 w-full overflow-hidden rounded bg-slate-800"
        >
          <div className="h-full w-1/3 animate-pulse bg-slate-500 motion-reduce:animate-none" />
        </div>
      </>
    )}

    {state._tag === "Failed" && (
      <div className="rounded bg-red-900/30 p-3 text-sm text-red-400">
        <p>Building the league failed. {state.message}</p>
        <button
          type="button"
          className={`mt-3 rounded bg-slate-700 px-4 py-2 text-slate-100 hover:bg-slate-600 ${FOCUS_RING.join(" ")}`}
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    )}
  </div>
);
