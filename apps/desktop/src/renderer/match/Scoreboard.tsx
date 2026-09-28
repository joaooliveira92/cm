/**
 * The match scoreboard — what the career header becomes while a match is on.
 *
 * Two halves meeting in the middle, each painted in its club's primary pair: the club name at the
 * outer edge, its score box against the seam. Each half is a club scope of its own (`club-header`
 * plus `clubHeaderStyle`, the mechanism the career header uses), so the same readability correction
 * applies — a pack's unreadable pair gets a readable name, never an illegible one. Only the score
 * boxes are match-only (`--color-scoreboard-*` in `index.css`): white with dark numerals whatever
 * the clubs wear.
 *
 * The whole board is one button that opens Match day: while the header shows it, Continue is gone,
 * and a manager who wandered off mid-match or at full time needs the way back.
 */
import type { ClubColoursView } from "@cm-clone/contracts";
import { clubHeaderStyle } from "../chrome/header/club-scheme.js";
import { FOCUS_RING } from "../focus.js";

export interface ScoreboardSide {
  readonly name: string;
  readonly colours: ClubColoursView;
  readonly score: number;
}

export interface ScoreboardProps {
  readonly home: ScoreboardSide;
  readonly away: ScoreboardSide;
  /** The match clock as the manager has seen it: `63'`, `HT`, `FT`. */
  readonly status: string;
  readonly onOpen: () => void;
}

const ScoreBox = ({ score }: { readonly score: number }) => (
  <span className="flex h-10 w-11 shrink-0 items-center justify-center rounded-control border border-black/30 bg-scoreboard-box text-xl font-bold tabular-nums text-scoreboard-box-text shadow-inner">
    {score}
  </span>
);

export const Scoreboard = ({ home, away, status, onOpen }: ScoreboardProps) => (
  <section aria-label="Match score" className="flex h-full min-w-0 flex-1 items-center gap-3">
    <button
      type="button"
      title="Open Match day"
      aria-label={`${home.name} ${home.score}, ${away.name} ${away.score}, ${status}. Open Match day`}
      className={`flex h-full min-w-0 flex-1 overflow-hidden rounded-panel border border-black/40 shadow-chrome ${FOCUS_RING.join(" ")}`}
      onClick={onOpen}
    >
      <span
        className="club-header flex min-w-0 flex-1 items-center justify-between gap-3 bg-header-bg pr-2 pl-4 text-header-fg"
        style={clubHeaderStyle(home.colours)}
      >
        <span className="truncate text-lg font-bold">{home.name}</span>
        <ScoreBox score={home.score} />
      </span>
      <span
        className="club-header flex min-w-0 flex-1 items-center justify-between gap-3 bg-header-bg pr-4 pl-2 text-header-fg"
        style={clubHeaderStyle(away.colours)}
      >
        <ScoreBox score={away.score} />
        <span className="truncate text-right text-lg font-bold">{away.name}</span>
      </span>
    </button>
    <span className="w-10 shrink-0 text-center text-sm font-semibold tabular-nums text-header-fg">{status}</span>
  </section>
);
