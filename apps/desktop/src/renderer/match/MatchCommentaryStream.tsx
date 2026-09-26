import { Scoreboard } from "./Scoreboard.js";
import { useMatchContext } from "./MatchProvider.js";
import { useCommentaryContext } from "./CommentaryProvider.js";
import { useMatchStreaming } from "./streaming.js";

export const MatchCommentaryStream = () => {
  useMatchStreaming();
  const { state } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  const { match } = state;
  if (match === null) return null;
  return (
    <>
      <Scoreboard
        homeClubName={match.homeClubName}
        homeScore={comm.homeScore}
        awayScore={comm.awayScore}
        awayClubName={match.awayClubName}
      />
      <p className="mt-3 text-sm text-text-secondary">
        {state.phase === "complete" ? "Full time" : state.phase === "paused" ? "Paused — awaiting decision" : "Live"}
      </p>

      <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-4 text-sm shadow-panel">
        {comm.revealed.map((line, index) => (
          <li key={index} className="flex gap-3">
            <span className="w-10 shrink-0 tabular-nums text-text-muted">{line.minute}&apos;</span>
            <span className={commentaryTone(line.tag)}>{line.text}</span>
          </li>
        ))}
        {comm.revealed.length === 0 && <li className="text-text-muted">Kick-off is coming up...</li>}
      </ul>
    </>
  );
};

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