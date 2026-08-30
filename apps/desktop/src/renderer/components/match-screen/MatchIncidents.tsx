// src/renderer/components/match-screen/MatchIncidents.tsx
import React from "react";
import type { MatchIncident, Score } from "./types.js";
import { formatMinutes } from "./formatters.js";

export interface MatchIncidentsProps {
  incidents: MatchIncident[];
  periodScores?: {
    halfTime?: Score;
    fullTime?: Score;
    extraTime?: Score;
  };
  homeTeamName: string;
  awayTeamName: string;
}

const ICON_MAP: Record<string, string> = {
  goal: "⚽",
  "own-goal": "⚽",
  "yellow-card": "🟨",
  "red-card": "🟥",
  substitution: "🔄",
  injury: "🤕",
  "penalty-scored": "⚽",
  "penalty-missed": "🎯",
  other: "📌",
};

export const MatchIncidents: React.FC<MatchIncidentsProps> = ({
  incidents,
  periodScores,
  homeTeamName,
  awayTeamName,
}) => {
  const homeIncidents = incidents.filter((i) => i.side === "home");
  const awayIncidents = incidents.filter((i) => i.side === "away");

  return (
    <section className="match-incidents" aria-label="Match incidents">
      <h2 className="section-heading">Match Incidents</h2>

      <div className="incidents-grid">
        <div className="incident-column incident-column--home">
          <h3 className="column-heading">{homeTeamName}</h3>
          {homeIncidents.length === 0 && <p className="no-incidents">No incidents</p>}
          {homeIncidents.map((incident) => (
            <div
              key={incident.id}
              className={`incident-row ${incident.type === "injury" ? "incident-row--injury" : ""}`}
            >
              <span className="incident-icon" aria-hidden="true">
                {ICON_MAP[incident.type] || "📌"}
              </span>
              <span className="incident-name">{incident.displayText || incident.participantName}</span>
              <span className="incident-minutes">
                {formatMinutes(incident.minutes)}
                {incident.stoppageTime && incident.stoppageTime.length > 0 && (
                  <>
                    <span className="stoppage-separator"> / </span>
                    {incident.stoppageTime.map((m: number) => `+${m}`).join(", ")}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="incident-column incident-column--away">
          <h3 className="column-heading">{awayTeamName}</h3>
          {awayIncidents.length === 0 && <p className="no-incidents">No incidents</p>}
          {awayIncidents.map((incident) => (
            <div
              key={incident.id}
              className={`incident-row ${incident.type === "injury" ? "incident-row--injury" : ""}`}
            >
              <span className="incident-minutes">
                {formatMinutes(incident.minutes)}
                {incident.stoppageTime && incident.stoppageTime.length > 0 && (
                  <>
                    <span className="stoppage-separator"> / </span>
                    {incident.stoppageTime.map((m: number) => `+${m}`).join(", ")}
                  </>
                )}
              </span>
              <span className="incident-name">{incident.displayText || incident.participantName}</span>
              <span className="incident-icon" aria-hidden="true">
                {ICON_MAP[incident.type] || "📌"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {periodScores && (
        <div className="period-summary">
          {periodScores.halfTime && (
            <div className="summary-line">
              <span className="summary-label">Score at half time:</span>
              <span className="summary-value">
                {periodScores.halfTime.home}–{periodScores.halfTime.away}
              </span>
            </div>
          )}
          {periodScores.fullTime && (
            <div className="summary-line">
              <span className="summary-label">Score at full time:</span>
              <span className="summary-value">
                {periodScores.fullTime.home}–{periodScores.fullTime.away}
              </span>
            </div>
          )}
          {periodScores.extraTime && (
            <div className="summary-line">
              <span className="summary-label">Extra time:</span>
              <span className="summary-value">
                {periodScores.extraTime.home}–{periodScores.extraTime.away}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};