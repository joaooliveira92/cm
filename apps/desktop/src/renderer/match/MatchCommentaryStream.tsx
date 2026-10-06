import { useMatchContext } from "./MatchProvider.js";
import { useCommentaryContext } from "./CommentaryProvider.js";
import { CommentaryBar } from "./CommentaryBar.js";
import { CommentaryFeed } from "./CommentaryFeed.js";
import { useMatchStreaming } from "./streaming.js";

export const MatchCommentaryStream = () => {
  useMatchStreaming();
  const { state } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  const { match } = state;
  if (match === null) return null;
  // The score lives in the career header while the match is on (`chrome/header/MatchHeader.tsx`).
  return (
    <>
      <p className="text-body text-text-secondary">
        {state.phase === "complete" ? "Full time" : state.phase === "paused" ? "Paused — awaiting decision" : "Live"}
      </p>
      <div className="mt-4">
        <CommentaryBar match={match} playing={comm.playing} revealed={comm.revealed} />
      </div>
      <CommentaryFeed lines={comm.revealed} emptyMessage="Kick-off is coming up..." className="mt-3 max-h-[50vh]" />
    </>
  );
};
