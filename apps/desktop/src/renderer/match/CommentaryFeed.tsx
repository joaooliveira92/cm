import { useLayoutEffect, useRef } from "react";
import type { CommentaryLineView } from "@cm-clone/contracts";

/** Lines that mark a phase of the match rather than play. They show as dividers, with the phase in the
 * minute column instead of a minute. */
const MILESTONES: Readonly<Record<string, string>> = {
  MatchStarted: "KO",
  HalfTimeReached: "HT",
  FullTimeWhistle: "FT",
};

const TONE: Readonly<Record<string, string>> = {
  Goal: "font-semibold text-text-success",
  RedCard: "text-text-danger",
  Injury: "text-text-danger",
  YellowCard: "text-text-warning",
  Penalty: "text-text-strong",
  Substitution: "text-text-secondary",
  TacticsChanged: "text-text-secondary",
};

const CARD_COLOUR: Readonly<Record<string, string>> = {
  YellowCard: "bg-text-warning",
  RedCard: "bg-text-danger",
};

/** How close to the bottom, in px, still counts as following the feed. */
const FOLLOW_SLACK_PX = 24;

const rowClass = (tag: string): string => {
  if (tag in MILESTONES) return "border-y border-panel-border py-1.5 font-semibold text-text-strong";
  if (tag === "Goal") return "border-l-2 border-text-success bg-row-selected py-1.5 pl-2";
  return "py-0.5";
};

/**
 * The Commentary feed, shared by Match day and the Match Commentary screen. A `log` region, so a
 * screen reader announces each revealed line. It follows the newest line while the reader is at the
 * bottom, and stays put once they scroll back up to reread.
 */
export const CommentaryFeed = ({
  lines,
  emptyMessage,
  className = "",
}: {
  readonly lines: ReadonlyArray<CommentaryLineView>;
  readonly emptyMessage: string;
  readonly className?: string;
}) => {
  const listRef = useRef<HTMLOListElement>(null);
  const followingRef = useRef(true);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list !== null && followingRef.current) list.scrollTop = list.scrollHeight;
  }, [lines.length]);

  const onScroll = () => {
    const list = listRef.current;
    if (list === null) return;
    followingRef.current = list.scrollHeight - list.scrollTop - list.clientHeight <= FOLLOW_SLACK_PX;
  };

  return (
    <ol
      ref={listRef}
      role="log"
      aria-label="Commentary"
      onScroll={onScroll}
      className={`space-y-1 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-4 text-body shadow-panel ${className}`}
    >
      {lines
        .filter((line) => line.text !== "")
        .map((line, index) => (
          <li key={index} className={`flex gap-3 ${rowClass(line.tag)}`}>
            <span className="w-10 shrink-0 text-data tabular-nums text-text-muted">
              {MILESTONES[line.tag] ?? `${line.minute}'`}
            </span>
            {CARD_COLOUR[line.tag] !== undefined && (
              <span aria-hidden="true" className={`mt-1 inline-block h-3 w-2 shrink-0 rounded-[1px] ${CARD_COLOUR[line.tag]}`} />
            )}
            <span className={TONE[line.tag] ?? ""}>{line.text}</span>
          </li>
        ))}
      {lines.length === 0 && <li className="text-text-muted italic">{emptyMessage}</li>}
    </ol>
  );
};
