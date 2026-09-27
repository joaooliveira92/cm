import type { SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import { MatchStatsView } from "../match/MatchStatsView.js";
import { useBoundMatchRead, type MatchBinding } from "../match/useBoundMatchRead.js";
import { getMatchStatistics } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";

const read = (binding: MatchBinding) => getMatchStatistics(binding);
const describe = (error: RpcClientError<"getMatchStatistics">) => describeRpcError(error);

/** Match Statistics (Screens 95 and 100), bound to a match by `useBoundMatchRead`. */
export const MatchStatsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const { state, reload } = useBoundMatchRead(saveId, read, describe);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchStats"
      aria-label="Match Statistics"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="mb-6 text-2xl font-bold">Match Statistics</h1>
      {state._tag === "loading" && <p className="text-text-secondary italic">Loading statistics...</p>}
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
      {state._tag === "ready" && state.view !== null && (
        <>
          <h2 className="mb-3 text-lg font-semibold">
            {state.view.homeClubName} v {state.view.awayClubName}
          </h2>
          <MatchStatsView view={state.view} />
        </>
      )}
    </main>
  );
};
