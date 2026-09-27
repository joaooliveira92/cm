import type { SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { MatchRatingsView } from "../match/MatchRatingsView.js";
import { useBoundMatchRead, type MatchBinding } from "../match/useBoundMatchRead.js";
import { getMatchRatings } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";

const read = (binding: MatchBinding) => getMatchRatings(binding);
const describe = (error: RpcClientError<"getMatchRatings">) => describeRpcError(error);

/**
 * Player Ratings (Screens 96 and 101, group-g-match-day ticket 10): each side's Match Ratings, live
 * while a match is in play and for the whole match afterwards. Bound to a match by
 * `useBoundMatchRead`, the same way Match Statistics is.
 */
export const MatchRatingsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const { state, reload } = useBoundMatchRead(saveId, read, describe);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchRatings"
      aria-label="Match Ratings"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="mb-6 text-2xl font-bold">Match Ratings</h1>
      {state._tag === "loading" && <p className="text-text-secondary italic">Loading ratings...</p>}
      {state._tag === "failed" && (
        <Alert variant="destructive">
          <p>{state.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={reload}>
            Retry
          </Button>
        </Alert>
      )}
      {state._tag === "ready" && state.view === null && (
        <p className="text-text-secondary italic">No match played yet.</p>
      )}
      {state._tag === "ready" && state.view !== null && <MatchRatingsView view={state.view} />}
    </main>
  );
};
