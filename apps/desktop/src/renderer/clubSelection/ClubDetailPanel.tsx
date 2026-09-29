"use client";

import type { ClubSelectionRow } from "@cm-clone/contracts";
import { PANEL_STRONG } from "../theme.js";
import { ClubProfile } from "./ClubProfile.js";
import { LeagueOverview } from "./LeagueOverview.js";
import type { LeagueSummary } from "./model.js";

export interface ClubDetailPanelProps {
  readonly club: ClubSelectionRow | null;
  readonly summary: LeagueSummary;
  readonly announcement: string;
}

/**
 * The right-hand panel. Before a pick it shows the league summary — true before any decision
 * exists, where an auto-selected club would assert a choice nobody made and an empty state would
 * waste the larger half of the workspace at the moment the player knows least.
 *
 * After a pick it is a rich club profile built entirely from the payload the rail already
 * has: no second call, so no loading state of its own. Budgets are animated with
 * NumberTicker; the squad quality bar, colour-coded cards and tooltip-augmented player
 * rows give the panel visual depth without a second fetch.
 *
 * It carries the screen's single polite announcer, which speaks only when the shown club changes
 * — arrow-key roving moves focus, not the panel, and narrating per row would be a barrage.
 */
export const ClubDetailPanel = ({ club, summary, announcement }: ClubDetailPanelProps) => (
  <section aria-label="Club detail" className={`${PANEL_STRONG} flex min-h-0 flex-1 flex-col overflow-y-auto`}>
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
    {club === null ? <LeagueOverview summary={summary} /> : <ClubProfile club={club} leagueSize={summary.clubCount} />}
  </section>
);
