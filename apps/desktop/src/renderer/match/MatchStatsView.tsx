import type { MatchStatisticKey, MatchStatisticsView, UnavailableMatchStatistic } from "@cm-clone/contracts";

/** Each total's label and what it counts, stated rather than implied (Screen 95 §17). */
const STATISTIC: Readonly<Record<MatchStatisticKey, { readonly label: string; readonly definition: string }>> = {
  goals: { label: "Goals", definition: "Goals scored" },
  attempts: { label: "Attempts", definition: "Goals, shots on target, shots off target and big chances" },
  shotsOnTarget: { label: "Shots on target", definition: "Goals plus shots saved" },
  shotsOffTarget: { label: "Shots off target", definition: "Shots that missed the goal" },
  bigChances: { label: "Big chances", definition: "Clear chances not converted into a recorded shot" },
  yellowCards: { label: "Yellow cards", definition: "Yellow cards shown" },
  redCards: { label: "Red cards", definition: "Red cards shown" },
  injuries: { label: "Injuries", definition: "Players injured" },
  substitutions: { label: "Substitutions", definition: "Substitutions made" },
};

const UNAVAILABLE_LABEL: Readonly<Record<UnavailableMatchStatistic, string>> = {
  possession: "Possession",
  corners: "Corners",
  fouls: "Fouls",
  offsides: "Offsides",
};

/**
 * The shared team-statistics table (Screens 95 and 100): one row per total, both sides as numbers in
 * an accessible table, and the statistics the match model does not simulate named as unavailable.
 * It renders a view the main process aggregated; it computes nothing.
 */
export const MatchStatsView = ({ view }: { readonly view: MatchStatisticsView }) => (
  <section aria-label="Match statistics" className="space-y-3 text-sm">
    <p className="text-text-secondary">
      {view.throughMinute === null ? "Full match" : `Up to ${view.throughMinute}'`}
    </p>
    <table className="w-full max-w-xl border-collapse">
      <caption className="sr-only">
        Team statistics, {view.homeClubName} against {view.awayClubName}
      </caption>
      <thead>
        <tr className="border-b border-panel-border text-left text-xs text-text-secondary">
          <th scope="col" className="py-1 pr-4 text-right font-semibold">{view.homeClubName}</th>
          <th scope="col" className="py-1 text-center font-semibold">Statistic</th>
          <th scope="col" className="py-1 pl-4 font-semibold">{view.awayClubName}</th>
        </tr>
      </thead>
      <tbody>
        {view.rows.map((row) => (
          <tr key={row.key} className="border-b border-border-subtle">
            <td className="py-1 pr-4 text-right tabular-nums">{row.home}</td>
            <th scope="row" className="py-1 text-center font-normal" title={STATISTIC[row.key].definition}>
              {STATISTIC[row.key].label}
              <span className="block text-xs text-text-muted">{STATISTIC[row.key].definition}</span>
            </th>
            <td className="py-1 pl-4 tabular-nums">{row.away}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {view.unavailable.length > 0 && (
      <p className="text-xs text-text-muted">
        Not tracked by the match model: {view.unavailable.map((key) => UNAVAILABLE_LABEL[key]).join(", ")}.
      </p>
    )}
  </section>
);
