import { Button } from "../components/ui/button.js";

/** The one conflict sentence, rendered as the `role="alert"` span beside the Refresh button. */
const CONFLICT_MESSAGE =
  "A newer tactic was saved since you loaded this page. Your draft is kept — refresh to load the current version.";

/** The save-conflict bar: a lost write race offers Refresh, and the transient status line. */
export const TacticConflictBar = ({
  conflict,
  status,
  onRefresh,
}: {
  readonly conflict: number | null;
  readonly status: string | null;
  readonly onRefresh: () => void;
}) => {
  if (conflict === null && !status) return null;
  return (
    <section className="chrome-gradient mt-2 flex items-center gap-3 rounded-panel border border-panel-border px-3 py-2 shadow-chrome">
      {conflict !== null && (
        <>
          <span role="alert" className="text-body text-text-danger" data-testid="tactic-conflict">
            {CONFLICT_MESSAGE}
          </span>
          <Button
            type="button"
            variant="secondary"
            data-action-id="refresh-tactics"
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </>
      )}
      {status && <span className="text-body text-text-bright">{status}</span>}
    </section>
  );
};
