import type { ClubSelectionRow } from "@cm-clone/contracts";
import { Badge } from "../components/ui/badge.js";
import { formatCredits } from "../format.js";
import { PANEL_STRONG } from "../theme.js";
import { expectationProse, type LeagueSummary } from "./model.js";

export interface ClubDetailPanelProps {
  readonly club: ClubSelectionRow | null;
  readonly summary: LeagueSummary;
  /** The one polite line this panel speaks, or `""` when it has nothing new to say. */
  readonly announcement: string;
}

/**
 * The right-hand panel. Before a pick it shows the league summary — true before any decision
 * exists, where an auto-selected club would assert a choice nobody made and an empty state would
 * waste the larger half of the workspace at the moment the player knows least.
 *
 * After a pick it is a compact squad readout built entirely from the payload the rail already
 * has: no second call, so no loading state of its own. Budgets are two labelled Credits rows;
 * squad size and average age stay subordinate to the top-five readout, because a raw squad total
 * misleads without positional breakdown and composition is constant by construction.
 *
 * It carries the screen's single polite announcer, which speaks only when the shown club changes
 * — arrow-key roving moves focus, not the panel, and narrating per row would be a barrage.
 */
export const ClubDetailPanel = ({ club, summary, announcement }: ClubDetailPanelProps) => (
  <section aria-label="Club detail" className={`${PANEL_STRONG} flex min-h-0 flex-1 flex-col overflow-y-auto`}>
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>

    {club === null ? (
      <div className="text-text-body">
        <h3 className="text-base font-semibold text-text-primary">The league</h3>
        <p className="mt-2 text-sm">
          {summary.clubCount} club{summary.clubCount === 1 ? "" : "s"} to choose from.
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {summary.tiers.map(({ tier, count }) => (
            <li key={tier} className="flex items-center gap-2">
              <Badge variant="outline">{tier}</Badge>
              <span>
                {count} club{count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-text-muted">Choose a club to see what the job looks like.</p>
      </div>
    ) : (
      <div className="text-text-body">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-text-primary">{club.clubName}</h3>
          <Badge variant="outline">{club.statureTier}</Badge>
        </div>

        <p className="mt-2 text-sm">{expectationProse(club, summary.clubCount)}</p>

        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted">Transfer Budget</dt>
            <dd className="tabular-nums">{formatCredits(club.transferBudget)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-text-muted">Wage Budget</dt>
            <dd className="tabular-nums">{formatCredits(club.wageBudget)}</dd>
          </div>
        </dl>

        <h4 className="mt-4 text-2xs font-semibold tracking-wide text-text-muted uppercase">
          Best players
        </h4>
        <ul className="mt-1 space-y-1 text-sm">
          {club.detail.topPlayers.map((player) => (
            <li key={player.name} className="flex items-center justify-between gap-4">
              <span className="truncate">{player.name}</span>
              <span className="text-text-muted">{player.position}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-text-muted">
          Squad of {club.detail.squadSize}, average age {club.detail.averageAge}.
        </p>
      </div>
    )}
  </section>
);
