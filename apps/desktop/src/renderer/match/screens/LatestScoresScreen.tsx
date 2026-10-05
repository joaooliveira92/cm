import { useCallback, useEffect, useState } from "react";
import { Effect, Result } from "effect";
import type { LatestScoreFixtureView, LatestScoresView, SaveId } from "@cm-clone/contracts";
import { Alert } from "../../components/ui/alert.js";
import { Button } from "../../components/ui/button.js";
import { FOCUS_RING } from "../../focus.js";
import { getLatestScores } from "../../rpc.js";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";

type LatestScoresState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed"; readonly message: string }
  | { readonly _tag: "ready"; readonly view: LatestScoresView };

/** A latest-scores state that carries a settled answer — everything but `loading`. */
type SettledLatestScores = Exclude<LatestScoresState, { readonly _tag: "loading" }>;

/** One row's score, or "v" while unresolved, plus the shootout where a drawn cup tie had one. */
const scoreText = (fixture: LatestScoreFixtureView): string => {
  if (fixture.homeGoals === null || fixture.awayGoals === null) return "v";
  const score = `${fixture.homeGoals} - ${fixture.awayGoals}`;
  if (fixture.homePenalties === null || fixture.awayPenalties === null) return score;
  return `${score} (${fixture.homePenalties}-${fixture.awayPenalties} pens)`;
};

/**
 * Latest Scores (Screen 96 family): the other fixtures of the user's Matchday date, grouped by
 * competition. Live, before the user's result is accepted, no score is shown and the list is
 * captioned "Results come in at full time."; after acceptance each row carries its full-time score
 * and, for a drawn cup tie, its penalty shootout.
 */
export const MatchLatestScoresScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [attempt, setAttempt] = useState(0);
  // Keyed by save and an attempt counter: a result tagged with the current key is shown, and any
  // other render is `loading`, derived rather than set. The counter keeps Retry loading until its
  // fresh answer lands.
  const key = `${saveId}:${attempt}`;
  const [stored, setStored] = useState<{
    readonly key: string;
    readonly state: SettledLatestScores;
  } | null>(null);

  const readScores = useCallback(async (): Promise<SettledLatestScores> => {
    const outcome = await Effect.runPromise(getLatestScores({ saveId }).pipe(Effect.result));
    if (Result.isSuccess(outcome)) return { _tag: "ready", view: outcome.success };
    return {
      _tag: "failed",
      message: describeRpcError(outcome.failure as RpcClientError<"getLatestScores">),
    };
  }, [saveId]);

  const applyScores = useCallback(
    (next: SettledLatestScores): void => {
      setStored({ key, state: next });
    },
    [key],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      const next = await readScores();
      if (!cancelled) applyScores(next);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [readScores, applyScores]);

  const state: LatestScoresState = stored !== null && stored.key === key ? stored.state : { _tag: "loading" };
  const retry = (): void => setAttempt((n) => n + 1);

  return (
    <main
      tabIndex={-1}
      data-focus-id="matchLatestScores"
      aria-label="Match Latest Scores"
      className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <h1 className="mb-6 text-title">Latest Scores</h1>
      {state._tag === "loading" && <p className="text-text-secondary italic">Loading the latest scores...</p>}
      {state._tag === "failed" && (
        <Alert variant="destructive">
          <p>{state.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={retry}>
            Retry
          </Button>
        </Alert>
      )}
      {state._tag === "ready" && <LatestScores view={state.view} />}
    </main>
  );
};

const LatestScores = ({ view }: { readonly view: LatestScoresView }) => (
  <div className="space-y-6 text-body">
    {!view.resolved && <p className="text-text-secondary">Results come in at full time.</p>}
    {view.groups.length === 0 ? (
      <p className="text-text-muted">No other fixtures on this date.</p>
    ) : (
      view.groups.map((group) => (
        <section key={group.competitionId} aria-label={group.competitionName}>
          <h2 className="text-heading text-text-soft">{group.competitionName}</h2>
          <ul aria-label={group.competitionName} className="mt-1 space-y-1">
            {group.fixtures.map((fixture) => (
              <li key={fixture.id}>
                <span>{fixture.homeClubName}</span>{" "}
                <span className="tabular-nums text-text-secondary">{scoreText(fixture)}</span>{" "}
                <span>{fixture.awayClubName}</span>
              </li>
            ))}
          </ul>
        </section>
      ))
    )}
  </div>
);
