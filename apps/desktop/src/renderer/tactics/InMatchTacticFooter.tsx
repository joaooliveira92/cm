import { dispatchAction } from "../actions/dispatch.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";

/** The in-match action bar: validation error, pending-change count and Confirm/Undo/Cancel. */
export const InMatchTacticFooter = ({
  validationError,
  pendingCount,
  isPending,
}: {
  readonly validationError: string | null;
  readonly pendingCount: number;
  readonly isPending: boolean;
}) => (
  <>
    {validationError && (
      <p role="alert" className="mt-1 text-data text-text-warning">
        {validationError}
      </p>
    )}

    {pendingCount > 0 && (
      <p className="mt-1 text-data text-text-secondary">
        <Badge variant="warning">{pendingCount} pending change{pendingCount === 1 ? "" : "s"}</Badge>
      </p>
    )}

    <div className="mt-2 flex items-center justify-center gap-3 border-t border-border-subtle pt-2">
      <Button
        type="button"
        variant="default"
        disabled={isPending}
        data-action-id="confirm-live-tactic"
        onClick={() => void dispatchAction("confirm-live-tactic")}
      >
        {isPending ? "Confirming..." : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pendingCount === 0 || isPending}
        data-action-id="undo-live-tactic"
        onClick={() => void dispatchAction("undo-live-tactic")}
      >
        Undo Last
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pendingCount === 0 || isPending}
        data-action-id="cancel-live-tactic"
        onClick={() => void dispatchAction("cancel-live-tactic")}
      >
        Cancel
      </Button>
    </div>
  </>
);
