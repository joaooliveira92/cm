import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CommentaryLineView, MatchSummary } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { COMMENTARY_SPEEDS, setCommentarySpeed, useCommentarySpeed } from "./commentarySpeed.js";
import { textSoFar } from "./engine/playback.js";
import type { PlayingLine } from "./hooks/useCommentaryFeed.js";

/** Blinks a flash line gets, and how long each lasts. */
const FLASH_BLINKS = 6;
const FLASH_BLINK_MS = 220;

const clubColours = (match: MatchSummary, line: CommentaryLineView): CSSProperties | undefined => {
  const colours =
    line.clubId === match.homeClubId ? match.homeClubColours : line.clubId === match.awayClubId ? match.awayClubColours : null;
  return colours === null ? undefined : { backgroundColor: colours.primary.background, color: colours.primary.foreground };
};

/** Blinks while `line` is a fresh flash line; false otherwise. A line already on screen when the bar
 *  mounts (returning to Match day after a goal) does not blink again. */
const useFlash = (line: CommentaryLineView | null): boolean => {
  const [blink, setBlink] = useState(0);
  const mountedWith = useRef(line);
  useEffect(() => {
    if (line === null || line.flash !== true || line === mountedWith.current) return;
    setBlink(1);
    const interval = setInterval(() => {
      setBlink((count) => {
        if (count >= FLASH_BLINKS) {
          clearInterval(interval);
          return 0;
        }
        return count + 1;
      });
    }, FLASH_BLINK_MS);
    return () => clearInterval(interval);
  }, [line]);
  return blink % 2 === 1;
};

/**
 * Championship Manager's commentary bar: the line being played, one at a time, in the colours of the
 * club it is about. A follow-on line grows part by part; once it is revealed the bar holds it until the
 * next line starts. Quiet lines never reach it. Hidden from screen readers, which hear each line from
 * the log below when it is revealed.
 */
export const CommentaryBar = ({
  match,
  playing,
  revealed,
}: {
  readonly match: MatchSummary;
  readonly playing: PlayingLine | null;
  readonly revealed: ReadonlyArray<CommentaryLineView>;
}) => {
  const speed = useCommentarySpeed();
  const settled = [...revealed].reverse().find((line) => line.quiet !== true) ?? null;
  const line = playing?.line ?? settled;
  const text = playing === null ? settled?.text : textSoFar(playing.parts, playing.shown);
  const flashing = useFlash(playing === null ? settled : null);
  const colours = line === null ? undefined : clubColours(match, line);

  return (
    <div className="flex items-stretch gap-3">
      <div
        aria-hidden="true"
        data-flashing={flashing}
        style={flashing ? undefined : colours}
        className={`flex min-h-12 flex-1 items-center gap-3 rounded-panel border border-panel-border px-4 py-2 text-heading font-semibold shadow-panel ${
          flashing ? "bg-foreground text-background" : colours === undefined ? "bg-panel-bg-strong text-text-primary" : ""
        }`}
      >
        {line !== null && <span className="w-10 shrink-0 text-data tabular-nums opacity-75">{line.minute}&apos;</span>}
        <span>{text ?? "Kick-off is coming up..."}</span>
      </div>
      <div role="group" aria-label="Commentary speed" className="flex items-center gap-1">
        {COMMENTARY_SPEEDS.map((option) => (
          <Button
            key={option.id}
            type="button"
            size="sm"
            variant={speed === option.id ? "secondary" : "ghost"}
            aria-pressed={speed === option.id}
            onClick={() => setCommentarySpeed(option.id)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
