import { Scoreboard } from "./Scoreboard.js";
import { useMatchContext } from "./MatchProvider.js";
import { useMatchStreaming } from "./streaming.js";

/**
 * The live match commentary feed (Phase 4). Streaming lives HERE, in the component that renders
 * the stream, exactly as the ticket phases describe: `useMatchStreaming` drives the provider's
 * pacing meta (poll ahead + buffer, reveal one line per tick, hold while a no-subs decision
 * pauses), and the scoreboard/status/feed render from the state that hook feeds.
 */
export const MatchCommentaryStream = () => {
  useMatchStreaming();
  const { state } = useMatchContext();
  const { match } = state;
  if (match === null) return null;
  return (
    <>
      <Scoreboard
        homeClubName={match.homeClubName}
        homeScore={state.homeScore}
        awayScore={state.awayScore}
        awayClubName={match.awayClubName}
      />
      <p className="mt-3 text-sm text-text-secondary">
        {state.isComplete ? "Full time" : state.paused ? "Paused — awaiting decision" : "Live"}
      </p>

      <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-4 text-sm shadow-panel">
        {state.revealed.map((line, index) => (
          <li key={index} className="flex gap-3">
            <span className="w-10 shrink-0 tabular-nums text-text-muted">{line.minute}&apos;</span>
            <span className={commentaryTone(line.tag)}>{line.text}</span>
          </li>
        ))}
        {state.revealed.length === 0 && <li className="text-text-muted">Kick-off is coming up...</li>}
      </ul>
    </>
  );
};

/** Incident tone for a commentary line, from the shared danger/warning/success
 *  tokens (match-day note AC-5). Classification is by Match Event tag only —
 *  the renderer does not chase the scored-club side, so a `Goal` reads as a
 *  neutral highlight rather than risking a one-off `text-text-*` ad-hoc. */
const COMMENTARY_TONE: Readonly<Record<string, string>> = {
  Injury: "text-text-danger",
  RedCard: "text-text-danger",
  YellowCard: "text-text-warning",
  BigChance: "text-text-warning",
  ShotMissed: "text-text-warning",
  Goal: "text-text-success",
  ShotOnTarget: "text-text-success",
};

const commentaryTone = (tag: string): string => COMMENTARY_TONE[tag] ?? "";