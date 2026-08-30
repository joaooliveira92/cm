// src/renderer/components/match-screen/Scoreboard.tsx
import React from "react";
import type { Club } from "./types.js";

export interface ScoreboardProps {
  homeTeam: Club;
  awayTeam: Club;
  score: { home: number; away: number };
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ homeTeam, awayTeam, score }) => {
  return (
    <header className="scoreboard">
      <div
        className="team-header team-header--home"
        style={{ background: `linear-gradient(to bottom, ${homeTeam.theme.primary}, ${homeTeam.theme.secondary})` }}
      >
        <span
          className="team-name"
          style={{ color: homeTeam.theme.foreground }}
        >
          {homeTeam.name}
        </span>
      </div>

      <div className="score-container">
        <div className="score-box score-box--home">
          <span className="score-value">{score.home}</span>
        </div>
        <div className="score-divider">-</div>
        <div className="score-box score-box--away">
          <span className="score-value">{score.away}</span>
        </div>
      </div>

      <div
        className="team-header team-header--away"
        style={{ background: `linear-gradient(to bottom, ${awayTeam.theme.primary}, ${awayTeam.theme.secondary})` }}
      >
        <span
          className="team-name"
          style={{ color: awayTeam.theme.foreground }}
        >
          {awayTeam.name}
        </span>
      </div>
    </header>
  );
};