import type { MatchIncidentGoal, MatchOverviewView, MatchTeamIncidents, SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { formatMinute } from "../format.js";
import { getMatchOverview } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { useBoundMatchRead, type MatchBinding } from "./useBoundMatchRead.js";

const read = (binding: MatchBinding) => getMatchOverview(binding);
const describe = (error: RpcClientError<"getMatchOverview">) => describeRpcError(error);

const goalText = (goal: MatchIncidentGoal): string =>
  goal.penalty ? `${formatMinute(goal.minute, goal.half)} (pen)` : formatMinute(goal.minute, goal.half);

const IncidentsColumn = ({
  clubName,
  incidents,
}: {
  readonly clubName: string;
  readonly incidents: MatchTeamIncidents;
}) => (
  <div>
    <h3 className="text-heading text-text-soft">{clubName}</h3>
    {incidents.scorers.length === 0 ? (
      <p className="mt-1 text-text-muted">No scorers.</p>
    ) : (
      <ul aria-label={`${clubName} scorers`} className="mt-1 space-y-1">
        {incidents.scorers.map((scorer) => (
          <li key={scorer.playerId}>
            {scorer.playerName}{" "}
            <span className="tabular-nums text-text-muted">{scorer.goals.map(goalText).join(", ")}</span>
          </li>
        ))}
      </ul>
    )}
    {incidents.sendOffs.map((sendOff) => (
      <p key={sendOff.playerId} className="mt-1 text-text-secondary">
        Sent off: {sendOff.playerName}{" "}
        <span className="tabular-nums text-text-muted">{formatMinute(sendOff.minute, sendOff.half)}</span>
      </p>
    ))}
  </div>
);

const Overview = ({ view }: { readonly view: MatchOverviewView }) => (
  <div className="space-y-4 text-body">
    <section aria-label="Match incidents">
      <h2 className="text-heading">Match Incidents</h2>
      {view.halfTimeHomeScore !== null && view.halfTimeAwayScore !== null && (
        <p className="mt-1 text-text-secondary">
          Score at half time: {view.halfTimeHomeScore}-{view.halfTimeAwayScore}
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-4">
        <IncidentsColumn clubName={view.homeClubName} incidents={view.home} />
        <IncidentsColumn clubName={view.awayClubName} incidents={view.away} />
      </div>
    </section>

    <section aria-label="Fixture">
      <h2 className="text-heading">Fixture</h2>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-data text-text-secondary">
        <dt>Competition</dt>
        <dd>{view.fixture.competitionName}</dd>
        <dt>Round</dt>
        <dd className="tabular-nums">Round {view.fixture.round}</dd>
        <dt>Date</dt>
        <dd className="tabular-nums">{view.fixture.gameDate}</dd>
        <dt>Venue</dt>
        <dd>{view.fixture.venue}</dd>
      </dl>
    </section>
  </div>
);

/**
 * The shared Match Incidents and Fixture panels (map ticket 15), mounted on the live Match tab and
 * the post-match Summary. It renders the `getMatchOverview` read, cut at the revealed position live,
 * so the half-time score is absent until half time is reached and a scorer never appears before
 * their goal. Everything above is text the screen composes; it computes nothing about the match.
 */
export const MatchOverviewPanel = ({ saveId }: { readonly saveId: SaveId }) => {
  const { state, reload } = useBoundMatchRead<MatchOverviewView, RpcClientError<"getMatchOverview">>(
    saveId,
    read,
    describe,
  );

  if (state._tag === "loading") return null;
  if (state._tag === "failed") {
    return (
      <Alert variant="destructive" className="mt-4">
        <p>{state.message}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={reload}>
          Retry
        </Button>
      </Alert>
    );
  }
  if (state.view === null) return null;
  return (
    <section aria-label="Match overview" className="mt-4 rounded-panel border border-panel-border bg-panel-bg p-4">
      <Overview view={state.view} />
    </section>
  );
};
