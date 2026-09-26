import { Button } from "../components/ui/button.js";
import { dispatchAction } from "../actions/dispatch.js";
import { useMatchContext } from "./MatchProvider.js";

/**
 * The pre-match boundary as the player meets it: the Fixture the Calendar has stopped before, what
 * currently blocks it, what is worth knowing before kickoff, and the two ways to resolve it.
 *
 * Advisories (an empty bench, say) sit under the blockers and never touch the buttons: they name
 * legal preparation the player may regret, and an advisory that disabled Play would be a blocker
 * by another name.
 *
 * There is no opponent to choose. The Fixture supplies both clubs and which side the player is on,
 * which is the whole point of binding Match day to the schedule — the exhibition path this replaced
 * always seated the player at home and so could not express an away Fixture at all.
 *
 * Quick result sits beside Play rather than under it: both run the same authoritative match, and
 * presenting one as the lesser option would misdescribe what it does.
 */
export const KickoffPanel = () => {
  const { state } = useMatchContext();
  const { pending, phase } = state;

  if (pending === null) {
    return (
      <p className="mt-6 text-text-secondary">
        No Fixture is waiting. Continue the career to reach your next one.
      </p>
    );
  }

  const starting = phase === "starting";
  return (
    <section className="mt-6">
      <p className="text-lg font-semibold">
        {pending.isHome ? "Home" : "Away"} to {pending.opponentClubName}
      </p>

      {pending.blockers.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.blockers.map((blocker) => (
            <li key={blocker.id} className="rounded-panel border border-destructive/40 p-3">
              <p className="font-semibold text-destructive">{blocker.title}</p>
              <p className="text-sm text-text-secondary">{blocker.detail}</p>
            </li>
          ))}
        </ul>
      )}

      {pending.advisories.length > 0 && (
        <ul aria-label="Before kickoff" className="mt-3 space-y-2">
          {pending.advisories.map((advisory) => (
            <li key={advisory.id} className="rounded-panel border border-border p-3">
              <p className="font-semibold">{advisory.title}</p>
              <p className="text-sm text-text-secondary">{advisory.detail}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button
          type="button"
          data-action-id="start-match"
          disabled={starting || pending.blockers.length > 0}
          onClick={() => void dispatchAction("start-match")}
        >
          {starting ? "Starting..." : "Play match"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-action-id="quick-result"
          disabled={starting || pending.blockers.length > 0}
          onClick={() => void dispatchAction("quick-result")}
        >
          Quick result
        </Button>
      </div>
    </section>
  );
};
