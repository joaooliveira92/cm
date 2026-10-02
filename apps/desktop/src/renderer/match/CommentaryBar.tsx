import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CommentaryLineView, MatchSummary } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import {
  COMMENTARY_HIGHLIGHTS,
  COMMENTARY_SPEEDS,
  setCommentaryHighlights,
  setCommentarySpeed,
  useCommentaryHighlights,
  useCommentarySpeed,
} from "./commentaryPreferences.js";
import { showsInBar, textSoFar } from "./engine/playback.js";
import type { PlayingLine } from "./hooks/useCommentaryFeed.js";

/** Blinks a flash line gets, and how long each lasts. */
const FLASH_BLINKS = 6;
const FLASH_BLINK_MS = 220;

const clubColours = (match: MatchSummary, line: CommentaryLineView): CSSProperties | undefined => {
  const colours =
    line.clubId === match.homeClubId ? match.homeClubColours : line.clubId === match.awayClubId ? match.awayClubColours : null;
  return colours === null ? undefined : { backgroundColor: colours.primary.background, color: colours.primary.foreground };
};

/** The operating system asks for less motion: a flash line is marked once instead of blinking. */
const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Whether `line` is marked right now: blinking while it is a fresh flash line, or held inverted for
 *  the same time under reduced motion. A line already on screen when the bar mounts (returning to
 *  Match day after a goal) is not marked again. */
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
    // The next line can start mid-blink (a goal holds 1.1 s at Fast, a blink runs 1.3 s): stop marking.
    return () => {
      clearInterval(interval);
      setBlink(0);
    };
  }, [line]);
  return prefersReducedMotion() ? blink > 0 : blink % 2 === 1;
};

/**
 * Championship Manager's commentary bar: the line being played, one at a time, in the colours of the
 * club it is about. A follow-on line grows part by part; once it is revealed the bar holds it until the
 * next line starts. Quiet lines and lines below the chosen highlights never reach it. Hidden from
 * screen readers, which hear each line from the log below when it is revealed.
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
  const highlights = useCommentaryHighlights();
  const settled = [...revealed].reverse().find((line) => showsInBar(line, highlights)) ?? null;
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
      <div className="flex flex-col justify-center gap-1">
        <ChoiceGroup caption="Speed" label="Commentary speed" options={COMMENTARY_SPEEDS} value={speed} onChange={setCommentarySpeed} />
        <ChoiceGroup
          caption="Highlights"
          label="Highlights"
          options={COMMENTARY_HIGHLIGHTS}
          value={highlights}
          onChange={setCommentaryHighlights}
        />
      </div>
    </div>
  );
};

/** A row of toggle buttons for one commentary preference, with a short visible caption: two unlabelled
 *  rows read as one ("Full" beside "Fast"). */
const ChoiceGroup = <Id extends string>({
  caption,
  label,
  options,
  value,
  onChange,
}: {
  readonly caption: string;
  readonly label: string;
  readonly options: ReadonlyArray<{ readonly id: Id; readonly label: string }>;
  readonly value: Id;
  readonly onChange: (id: Id) => void;
}) => (
  <div role="group" aria-label={label} className="flex items-center gap-1">
    <span aria-hidden="true" className="w-20 text-label text-text-muted">
      {caption}
    </span>
    {options.map((option) => (
      <Button
        key={option.id}
        type="button"
        size="sm"
        variant={value === option.id ? "secondary" : "ghost"}
        aria-pressed={value === option.id}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </Button>
    ))}
  </div>
);
