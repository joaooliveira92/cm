import type { MatchRatingRow, MatchRatingsView as MatchRatings } from "@cm-clone/contracts";
import { ratingTone } from "./ratingTone.js";

/** What happened to the player, in words: dismissed and injured states are shown explicitly, never by
 *  color alone (Screen 96 §17). */
const statusOf = (row: MatchRatingRow): string => {
  const parts: Array<string> = [];
  if (row.cameOnMinute !== null) parts.push(`On ${row.cameOnMinute}'`);
  if (row.sentOff) parts.push(row.wentOffMinute === null ? "Sent off" : `Sent off ${row.wentOffMinute}'`);
  else if (row.wentOffMinute !== null) parts.push(`Off ${row.wentOffMinute}'`);
  if (row.injured) parts.push("Injured");
  return parts.join(" · ");
};

const SideRatings = ({ clubName, rows }: { readonly clubName: string; readonly rows: ReadonlyArray<MatchRatingRow> }) => (
  <table className="w-full border-collapse">
    <caption className="mb-2 text-left text-heading text-text-highlight">{clubName}</caption>
    <thead>
      <tr className="border-b border-panel-border text-left text-data text-text-secondary">
        <th scope="col" className="py-1 pr-3 font-semibold">Pos</th>
        <th scope="col" className="py-1 pr-3 font-semibold">Player</th>
        <th scope="col" className="py-1 pr-3 text-right font-semibold">Rating</th>
        <th scope="col" className="py-1 font-semibold">Status</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row) => (
        <tr key={row.playerId} className="border-b border-border-subtle">
          <td className="py-1 pr-3 text-text-secondary">{row.position}</td>
          <th scope="row" className="py-1 pr-3 text-left font-normal">
            {row.playerName}
          </th>
          <td className={`py-1 pr-3 text-right font-semibold tabular-nums ${ratingTone(row.rating)}`}>{row.rating.toFixed(1)}</td>
          <td className="py-1 text-data text-text-secondary">{statusOf(row)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * The shared player-ratings tables (Screens 96 and 101): each side's players who took part, with their
 * Match Rating and what happened to them. It renders a view the main process rated, and shows neither
 * the formula nor its weights. An unused substitute has no row.
 */
export const MatchRatingsView = ({ view }: { readonly view: MatchRatings }) => (
  <section aria-label="Player ratings" className="space-y-4 text-body">
    <p className="text-text-secondary">
      {view.throughMinute === null ? "Full match" : `Up to ${view.throughMinute}'`}
    </p>
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <SideRatings clubName={view.homeClubName} rows={view.home} />
      <SideRatings clubName={view.awayClubName} rows={view.away} />
    </div>
    <p className="text-data text-text-muted">
      Ratings run from 1 to 10. A player who stayed on the bench is not rated.
    </p>
  </section>
);
