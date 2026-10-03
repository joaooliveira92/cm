import type { ClubColoursView } from "@cm-clone/contracts";

const scheme = (background: string, foreground: string): ClubColoursView => ({
  primary: { foreground, background },
  secondary: { foreground: background, background: foreground },
  tertiary: null,
  quaternary: null,
});

/** Both clubs' colours for a `MatchSummary` fixture: spread it in beside the names. */
export const MATCH_COLOURS = {
  homeClubColours: scheme("#1f5f3a", "#ffffff"),
  awayClubColours: scheme("#c8102e", "#ffffff"),
} as const;
