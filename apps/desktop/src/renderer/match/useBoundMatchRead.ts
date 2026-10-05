import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Effect, Result } from "effect";
import { RevealedEvents, type MatchId, type SaveId } from "@cm-clone/contracts";
import { leagueTableAtom, useAtomValue } from "../rpc.js";
import { getActiveMatch, getRevealedEvents, revealedToFullTime, subscribeActiveMatch } from "./session.js";

/** Which match a per-match read shows, and how much of it. */
export interface MatchBinding {
  readonly saveId: SaveId;
  readonly matchId: MatchId | null;
  readonly revealedEvents: RevealedEvents | null;
}

export type BoundMatchState<A> =
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed"; readonly message: string }
  | { readonly _tag: "ready"; readonly view: A | null };

/** A bound-match state that carries a settled answer — everything but `loading`. */
type SettledBoundMatch<A> = Exclude<BoundMatchState<A>, { readonly _tag: "loading" }>;

/**
 * A per-match read (Match Statistics, Match Ratings, Match Player Stats, Match Overview) bound to
 * one match in this order:
 *
 * 1. a live match — cut after the Match Events Match day has revealed, so the screen never runs ahead
 *    of the commentary;
 * 2. the started Fixture still awaiting its result — in full only while this renderer holds it at
 *    full time; otherwise (e.g. the app restarted mid-match) cut at nothing revealed;
 * 3. otherwise the controlled club's most recent played match, resolved by the main process. A match
 *    whose result was accepted lands here: Accept result refreshes the season read, which then no
 *    longer awaits it (group-g-match-day 41).
 *
 * `describe` turns a failure into the sentence the screen shows.
 */
export const useBoundMatchRead = <A, E>(
  saveId: SaveId,
  read: (binding: MatchBinding) => Effect.Effect<A | null, E>,
  describe: (error: E) => string,
): { readonly state: BoundMatchState<A>; readonly reload: () => void } => {
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const awaitingMatchId = tableResult._tag === "Success" ? (tableResult.value.season.awaitingFixture?.matchId ?? null) : null;
  // Wait for the season read before binding: loading on a still-pending read would ask for the last
  // played match, and that reply could land after the right one. A read being refreshed (after Accept
  // result, say) may still name a match no longer awaited, so it is waited for too.
  const seasonKnown = (tableResult._tag === "Success" || tableResult._tag === "Failure") && !tableResult.waiting;
  // The revealed count, so a live read re-runs as Match day reveals each event rather than freezing at
  // kickoff. Subscribed the way the Attacks bar is; the active-match store notifies on every reveal.
  const revealedEvents = useSyncExternalStore(subscribeActiveMatch, () => getRevealedEvents(saveId));

  // The binding this hook currently reads, derived during render from the same stores the read
  // consults. The answer is stored against a key built from that binding, so a render whose key
  // differs from the stored one is the `loading` state — derived, never set synchronously.
  const session = getActiveMatch(saveId);
  const live = session !== null && (session.phase === "live" || session.phase === "paused");
  const boundMatchId = live ? session.match.matchId : awaitingMatchId;
  const [attempt, setAttempt] = useState(0);
  const bindingKey = `${saveId}:${boundMatchId ?? "none"}:${live ? "live" : "static"}:${String(revealedEvents)}:${attempt}`;
  const [stored, setStored] = useState<{ readonly key: string; readonly state: SettledBoundMatch<A> } | null>(
    null,
  );

  const readBound = useCallback(async (): Promise<SettledBoundMatch<A>> => {
    const outcome = await Effect.runPromise(
      read({
        saveId,
        matchId: boundMatchId,
        revealedEvents: live
          ? revealedEvents
          : awaitingMatchId !== null && !revealedToFullTime(saveId, awaitingMatchId)
            ? RevealedEvents.make(0)
            : null,
      }).pipe(Effect.result),
    );
    return Result.isFailure(outcome)
      ? { _tag: "failed", message: describe(outcome.failure) }
      : { _tag: "ready", view: outcome.success };
  }, [saveId, boundMatchId, live, awaitingMatchId, revealedEvents, read, describe]);

  const applyBound = useCallback(
    (next: SettledBoundMatch<A>): void => {
      setStored({ key: bindingKey, state: next });
    },
    [bindingKey],
  );

  useEffect(() => {
    if (!seasonKnown) return;
    let cancelled = false;
    const run = async (): Promise<void> => {
      const next = await readBound();
      if (!cancelled) applyBound(next);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [readBound, applyBound, seasonKnown]);

  const state: BoundMatchState<A> =
    stored !== null && stored.key === bindingKey ? stored.state : { _tag: "loading" };
  return { state, reload: () => setAttempt((n) => n + 1) };
};
