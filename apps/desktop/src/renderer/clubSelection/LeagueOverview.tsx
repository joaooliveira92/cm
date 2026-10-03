import { Badge } from "../components/ui/badge.js";
import type { LeagueSummary } from "./model.js";

export interface LeagueOverviewProps {
  readonly summary: LeagueSummary;
}

/** The panel before a pick: the league's size and how its clubs split across stature tiers. */
export const LeagueOverview = ({ summary }: LeagueOverviewProps) => (
  <div className="text-text-soft">
    <h3 className="text-heading text-text-primary">The league</h3>
    <p className="mt-2 text-body">
      {summary.clubCount} club{summary.clubCount === 1 ? "" : "s"} to choose from.
    </p>
    <ul className="mt-2 space-y-1 text-body">
      {summary.tiers.map(({ tier, count }) => (
        <li key={tier} className="flex items-center gap-2">
          <Badge variant="outline">{tier}</Badge>
          <span>
            {count} club{count === 1 ? "" : "s"}
          </span>
        </li>
      ))}
    </ul>
    <p className="mt-4 text-body text-text-muted">Choose a club to see what the job looks like.</p>
  </div>
);
