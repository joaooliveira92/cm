import { formatCalendarDate } from "@cm-clone/shared";
/**
 * Presentation state for the header's secondary band.
 *
 * The band renders whatever this module describes — it never reads an atom,
 * never calls the RPC seam, and never decides what a number means. That keeps
 * the whole adaptive-header behaviour testable as a pure function, which is the
 * part of the reference header worth having: the component becomes a renderer
 * of a described row, not a pile of conditionals over half-loaded queries.
 *
 * Facts the engine does not expose yet are returned as explicit placeholders
 * (`placeholder: true`, an em dash value) rather than invented values. A header
 * that quietly prints `0` for something it cannot know is worse than one that
 * admits it.
 */
import type { MatchReadout } from "../../actions/types.js";

/** Which shell the header is decorating. Drives the adaptive second row. */
export type HeaderView = "menu" | "load" | "create" | "career";

/**
 * The whole input to the row description, as a union rather than a view plus a
 * bag of optional data: the creation flow has a step and no career, the career
 * shell has a career and no step, and a union is how that stops being a set of
 * conditionals every caller has to get right.
 */
export type HeaderState =
  | { readonly view: "menu" }
  | { readonly view: "load" }
  | { readonly view: "create"; readonly step: string; readonly hint: string }
  | { readonly view: "career"; readonly career: HeaderCareer };

/**
 * The phase word that replaces the date segment outside the in-season phase.
 * `in_season` has no word: that is when the date is the orientation.
 */
const PHASE_WORDS: Readonly<Record<string, string>> = {
  pre_season: "Pre-season",
  mid_window_open: "Transfer window open",
  season_complete: "Season complete",
};

export interface SeasonReadoutInput {
  readonly seasonNumber: number;
  readonly currentDate: string;
  readonly phase: string;
}

/**
 * `Season 3 · 12 Aug 2026`, or the phase word in place of the date.
 *
 * The unit is the date the calendar stands on. It still never walks day by day
 * — Continue jumps between dated events — so no copy here offers a "next day".
 */
export const seasonReadout = (season: SeasonReadoutInput): string => {
  const phaseWord = PHASE_WORDS[season.phase];
  const tail = phaseWord ?? formatCalendarDate(season.currentDate);
  return `Season ${season.seasonNumber} · ${tail}`;
};

/** Match-only verb: the live-match readout. The unit is minutes (a clock would
 *  claim a state the domain does not model). The header shows this in place of
 *  the season readout while a match is in flight. */
export const matchReadout = (match: MatchReadout): string =>
  `${match.currentMinute}' · ${match.homeClubName} ${match.homeScore}–${match.awayScore} ${match.awayClubName}`;

/** The player club's line in the League Table, when the table has loaded. */
export interface HeaderStanding {
  readonly position: number;
  readonly played: number;
  readonly points: number;
}

/** The slice of the career projection the header consumes. */
export interface HeaderCareer {
  readonly clubName: string | null;
  readonly saveName: string | null;
  readonly season: SeasonReadoutInput | null;
  readonly standing: HeaderStanding | null;
  /** Set only while a match is in flight; it replaces the season readout. */
  readonly liveMatch: MatchReadout | null;
  /** Why the career loop cannot advance right now, from the Action record. */
  readonly blockedReason: string | null;
}

export type MetricIcon = "season" | "position" | "points" | "played";

export interface HeaderMetric {
  readonly icon: MetricIcon;
  readonly label: string;
  readonly value: string;
  /** True when the value is not backed by engine data yet. */
  readonly placeholder: boolean;
}

export type SecondaryRow =
  | { readonly kind: "status"; readonly leading: string; readonly trailing: string }
  | {
      readonly kind: "career";
      readonly metrics: readonly HeaderMetric[];
      readonly status: string;
      /** Rendered in the warning tone when set — a blocked loop is never silent. */
      readonly warning: string | null;
    }
  | { readonly kind: "wizard"; readonly heading: string; readonly hint: string };

const NO_VALUE = "—";

const ORDINAL_SUFFIXES = ["th", "st", "nd", "rd"] as const;

/** `1st`, `2nd`, `13th`, `21st` — League positions read as ordinals, never `#4`. */
export const formatPosition = (position: number): string => {
  if (!Number.isFinite(position) || position < 1) return NO_VALUE;
  const whole = Math.trunc(position);
  const teens = whole % 100;
  const suffix =
    teens >= 11 && teens <= 13 ? "th" : (ORDINAL_SUFFIXES[whole % 10] ?? "th");
  return `${whole}${suffix}`;
};

export function describeSecondaryRow(state: HeaderState): SecondaryRow {
  switch (state.view) {
    case "career": {
      const { career } = state;
      return {
        kind: "career",
        metrics: careerMetrics(career),
        status:
          career.liveMatch === null ? (career.saveName ?? NO_VALUE) : matchReadout(career.liveMatch),
        warning: career.blockedReason,
      };
    }

    case "create":
      return { kind: "wizard", heading: state.step, hint: state.hint };

    case "load":
      return {
        kind: "status",
        leading: "Saved careers",
        trailing: "Choose a career to continue",
      };

    case "menu":
      return {
        kind: "status",
        leading: "Main menu",
        trailing: "No career loaded",
      };
  }
}

/**
 * The row deliberately does not restate the club: identity is the band's left
 * zone, and a header that says the same thing twice teaches the reader to stop
 * reading it. `clubName` stays on `HeaderCareer` because the standing lookup
 * and future rows need it.
 */
function careerMetrics(career: HeaderCareer): readonly HeaderMetric[] {
  const { season, standing } = career;

  return [
    {
      icon: "season",
      label: "Calendar",
      value: season === null ? NO_VALUE : seasonReadout(season),
      placeholder: season === null,
    },
    {
      icon: "position",
      label: "Position",
      value: standing === null ? NO_VALUE : formatPosition(standing.position),
      placeholder: standing === null,
    },
    {
      icon: "points",
      label: "Points",
      value: standing === null ? NO_VALUE : String(standing.points),
      placeholder: standing === null,
    },
    {
      icon: "played",
      label: "Played",
      value: standing === null ? NO_VALUE : String(standing.played),
      placeholder: standing === null,
    },
  ];
}
