import type { ClubId, SaveId, TeamScoutReportView } from "@cm-clone/contracts";
import { useState } from "react";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError, teamScoutReadingsAtom, typedError, useAtomValue } from "../rpc.js";
import { compareReports, hasChanges, type ReportComparison } from "./compareReports.js";
import { confidenceLabel } from "./reportSections.js";

const rangeText = ([low, high]: readonly [number, number]): string =>
  low === high ? `${low}` : `${low}–${high}`;

/**
 * The Team Scout Report's Previous Reports tab (ticket 08): the readings this club has filed about
 * the target, newest first, and what changed between a chosen one and the report on screen.
 *
 * Read-only. Choosing a reading is local state over a list that is already loaded, so switching
 * readings starts no request that could arrive late. The list itself is admitted only when it names
 * the club the screen is aimed at, the same rule the report follows.
 */
export const PreviousReportsPanel = ({
  saveId,
  clubId,
  current,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
  readonly current: TeamScoutReportView;
}) => {
  const result = useAtomValue(teamScoutReadingsAtom(saveId, clubId));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const error = typedError(result);
  if (error !== null || result._tag === "Failure") {
    return (
      <p className="text-sm text-text-danger">
        {error === null ? "Earlier readings could not be loaded." : describeRpcError(error)}
      </p>
    );
  }
  if (result._tag === "Initial" || result.value.targetClubId !== clubId) {
    return <p className="text-sm text-text-secondary">Loading earlier readings...</p>;
  }

  const readings = result.value.readings;
  if (readings.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        No earlier readings yet. One is kept each time a scout stops watching this club.
      </p>
    );
  }

  const selected = readings.find((reading) => reading.reportId === selectedId) ?? null;

  return (
    <section aria-labelledby="previous-reports-heading">
      <h2 id="previous-reports-heading" className="text-lg font-semibold">
        Earlier readings
      </h2>
      <ul className="mt-2 text-sm">
        {readings.map((reading) => (
          <li key={reading.reportId} className="py-0.5">
            <button
              type="button"
              aria-pressed={reading.reportId === selectedId}
              className={`text-left underline-offset-2 hover:underline aria-pressed:font-semibold ${FOCUS_RING.join(" ")}`}
              onClick={() => setSelectedId(reading.reportId)}
            >
              {reading.observedAt}
            </button>
            <span className="text-text-secondary">
              {" "}
              · {confidenceLabel(reading.knowledgeConfidence)} knowledge ·{" "}
              {reading.scout === null ? "Compiled from player scouting" : reading.scout.scoutName}
            </span>
          </li>
        ))}
      </ul>

      {selected !== null && (
        <Comparison
          since={selected.observedAt}
          comparison={compareReports(selected, current)}
        />
      )}
    </section>
  );
};

const Comparison = ({
  since,
  comparison,
}: {
  readonly since: string;
  readonly comparison: ReportComparison;
}) => (
  <section aria-labelledby="report-comparison-heading" aria-live="polite" className="mt-4">
    <h3 id="report-comparison-heading" className="font-semibold">
      Changes since {since}
    </h3>
    {!hasChanges(comparison) ? (
      <p className="mt-1 text-sm text-text-secondary">Nothing has changed since that reading.</p>
    ) : (
      <ul className="mt-1 text-sm">
        {comparison.confidence !== null && (
          <li>
            Knowledge: {confidenceLabel(comparison.confidence.from)} →{" "}
            {confidenceLabel(comparison.confidence.to)}
          </li>
        )}
        {comparison.formation !== null && (
          <li>
            Predicted formation: {comparison.formation.from ?? "Unknown"} →{" "}
            {comparison.formation.to ?? "Unknown"}
          </li>
        )}
        {comparison.findingsAdded.map(({ kind, finding }) => (
          <li key={`added-${kind}-${finding.area}-${finding.note}`}>
            New {kind}: {finding.note}
          </li>
        ))}
        {comparison.findingsRemoved.map(({ kind, finding }) => (
          <li key={`removed-${kind}-${finding.area}-${finding.note}`}>
            No longer a {kind}: {finding.note}
          </li>
        ))}
        {comparison.playersAdded.map((name) => (
          <li key={`player-added-${name}`}>New key player: {name}</li>
        ))}
        {comparison.playersRemoved.map((name) => (
          <li key={`player-removed-${name}`}>No longer a key player: {name}</li>
        ))}
        {comparison.rangesChanged.map((change) => (
          <li key={`range-${change.name}`}>
            {change.name}: ability {rangeText(change.from)} → {rangeText(change.to)}
          </li>
        ))}
      </ul>
    )}
  </section>
);
