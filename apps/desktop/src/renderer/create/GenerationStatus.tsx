import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
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
        <p className="text-text-secondary">Building the league&hellip;</p>
        <div
          role="progressbar"
          aria-label="Building the league"
          aria-busy="true"
          className="h-1 w-full overflow-hidden rounded-control bg-surface"
        >
          <div className="h-full w-1/3 animate-pulse bg-text-muted motion-reduce:animate-none" />
        </div>
      </>
    )}

    {state._tag === "Failed" && (
      <Alert variant="destructive" className="text-sm">
        <p>Building the league failed. {state.message}</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </Alert>
    )}
  </div>
);
