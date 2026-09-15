import { useCallback, useEffect, useState } from "react";
import { Effect, Result } from "effect";
import type { ClubId, MatchId, PostMatchEventView, PostMatchSummaryView, SaveId } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import type { CareerDestination } from "../navigation/destinations.js";
import { getPostMatchSummary } from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";

type SummaryState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed"; readonly message: string }
  | { readonly _tag: "ready"; readonly summary: PostMatchSummaryView };

/** Words, never colour alone, for each key event (Screen 99 §12). */
const EVENT_LABEL: Readonly<Record<PostMatchEventView["kind"], string>> = {
  Goal: "Goal",
  YellowCard: "Yellow card",
  RedCard: "Red card",
  Injury: "Injury",
};

/** The review screens this match leads to. The Match Report names the match; the other two still
 *  bind to one on their own (tickets 09 and 10). */
const reviewLinks = (saveId: SaveId, matchId: MatchId): ReadonlyArray<{ readonly label: string; readonly destination: CareerDestination }> => [
  { label: "Statistics", destination: { type: "matchStats", saveId } },
  { label: "Player ratings", destination: { type: "matchRatings", saveId } },
  { label: "Match report", destination: { type: "matchReport", saveId, matchId } },
];

/**
 * The Post-Match Summary (Screen 99), shown on Match day once the match reaches full time: the final
 * score with each side's goalscorers, the cards and injuries in match order, and the ways into the
 * deeper post-match review. Everything is read from `getPostMatchSummary`, never from the revealed feed.
 */
export const PostMatchSummary = ({ saveId, matchId }: { readonly saveId: SaveId; readonly matchId: MatchId }) => {
  const [state, setState] = useState<SummaryState>({ _tag: "loading" });

  const load = useCallback(async () => {
    setState({ _tag: "loading" });
    const outcome = await Effect.runPromise(getPostMatchSummary({ saveId, matchId }).pipe(Effect.result));
    setState(
      Result.isFailure(outcome)
        ? { _tag: "failed", message: describeRpcError(outcome.failure as RpcClientError<"getPostMatchSummary">) }
        : { _tag: "ready", summary: outcome.success },
    );
  }, [saveId, matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state._tag === "loading") {
    return <p className="mt-4 text-sm text-text-secondary italic">Loading the match summary...</p>;
  }
  if (state._tag === "failed") {
    return (
      <Alert variant="destructive" className="mt-4">
        <p>{state.message}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => void load()}>
          Retry
        </Button>
      </Alert>
    );
  }

  const { summary } = state;
  const goals = summary.events.filter((event) => event.kind === "Goal");
  const incidents = summary.events.filter((event) => event.kind !== "Goal");

  return (
    <section aria-label="Post-match summary" className="mt-4 space-y-4 rounded-panel border border-panel-border bg-panel-bg p-4 text-sm">
      <h2 className="text-lg font-semibold">
        {summary.homeClubName} {summary.homeScore} - {summary.awayScore} {summary.awayClubName}
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <Scorers label={`${summary.homeClubName} goalscorers`} goals={goals} clubId={summary.homeClubId} />
        <Scorers label={`${summary.awayClubName} goalscorers`} goals={goals} clubId={summary.awayClubId} />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-text-body">Cards and injuries</h3>
        {incidents.length === 0 ? (
          <p className="mt-1 text-text-muted">No cards or injuries.</p>
        ) : (
          <ul aria-label="Cards and injuries" className="mt-1 space-y-1">
            {incidents.map((event, index) => (
              <li key={`${event.kind}-${event.playerId}-${index}`}>
                <span className="mr-2 tabular-nums text-text-muted">{event.minute}&apos;</span>
                {EVENT_LABEL[event.kind]}: {event.playerName} (
                {event.clubId === summary.homeClubId ? summary.homeClubName : summary.awayClubName})
              </li>
            ))}
          </ul>
        )}
      </div>

      <nav aria-label="Post-match review" className="flex gap-2">
        {reviewLinks(saveId, matchId).map((link) => (
          <Button
            key={link.destination.type}
            type="button"
            variant="secondary"
            size="sm"
            onClick={(event) => navigateCareer(link.destination, intentOfClick(event))}
          >
            {link.label}
          </Button>
        ))}
      </nav>
    </section>
  );
};

const Scorers = ({
  label,
  goals,
  clubId,
}: {
  readonly label: string;
  readonly goals: ReadonlyArray<PostMatchEventView>;
  readonly clubId: ClubId;
}) => {
  const own = goals.filter((goal) => goal.clubId === clubId);
  return (
    <div>
      <h3 className="text-xs font-semibold text-text-body">{label}</h3>
      {own.length === 0 ? (
        <p className="mt-1 text-text-muted">None</p>
      ) : (
        <ul aria-label={label} className="mt-1 space-y-1">
          {own.map((goal, index) => (
            <li key={`${goal.playerId}-${index}`}>
              {goal.playerName} <span className="tabular-nums text-text-muted">{goal.minute}&apos;</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
