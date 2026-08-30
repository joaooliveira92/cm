// src/renderer/components/match-screen/FixturePanel.tsx
import React from "react";
import type { FixtureDetails } from "./types.js";
import { formatDateLong, formatWeather } from "./formatters.js";

export interface FixturePanelProps {
  fixture: FixtureDetails;
}

export const FixturePanel: React.FC<FixturePanelProps> = ({ fixture }) => {
  const formattedDate = fixture.kickoff.includes("T") || fixture.kickoff.match(/\d{2}\.\d{2}\.\d{4}/)
    ? fixture.kickoff
    : formatDateLong(fixture.kickoff);

  return (
    <section className="fixture-panel" aria-label="Fixture information">
      <h2 className="section-heading">Fixture</h2>

      <div className="fixture-grid">
        <div className="fixture-column fixture-column--left">
          <div className="fixture-row">
            <span className="fixture-label">Competition</span>
            <span className="fixture-value">{fixture.competition}</span>
          </div>
          {fixture.round && (
            <div className="fixture-row">
              <span className="fixture-label">Round</span>
              <span className="fixture-value">{fixture.round}</span>
            </div>
          )}
          <div className="fixture-row">
            <span className="fixture-label">Referee</span>
            <span className="fixture-value">{fixture.referee}</span>
          </div>
          <div className="fixture-row">
            <span className="fixture-label">Venue</span>
            <span className="fixture-value">{fixture.venue}</span>
          </div>
        </div>

        <div className="fixture-column fixture-column--right">
          <div className="fixture-row">
            <span className="fixture-label">Date</span>
            <span className="fixture-value">{formattedDate}</span>
          </div>
          <div className="fixture-row">
            <span className="fixture-label">Weather</span>
            <span className="fixture-value">{formatWeather(fixture.weather)}</span>
          </div>
          <div className="fixture-row">
            <span className="fixture-label">Attendance</span>
            <span className="fixture-value">{fixture.attendance.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </section>
  );
};