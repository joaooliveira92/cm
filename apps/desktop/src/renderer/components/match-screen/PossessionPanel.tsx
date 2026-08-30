// src/renderer/components/match-screen/PossessionPanel.tsx
import React from "react";
import type { PossessionStats, Club } from "./types.js";
import { normalizePossession } from "./formatters.js";

export interface PossessionPanelProps {
  possession: PossessionStats;
  homeTeam: Club;
  awayTeam: Club;
}

export const PossessionPanel: React.FC<PossessionPanelProps> = ({
  possession,
  homeTeam,
  awayTeam,
}) => {
  const { home, away } = normalizePossession(possession.home, possession.away);

  return (
    <section className="possession-panel" aria-label="Possession">
      <div className="possession-label">Possession</div>
      <div className="possession-bar" role="img" aria-label={`Home possession ${home}%, away possession ${away}%`}>
        <div
          className="possession-segment possession-segment--home"
          style={{
            width: `${home}%`,
            background: `linear-gradient(to right, ${homeTeam.theme.primary}, ${homeTeam.theme.secondary})`,
          }}
        />
        <div
          className="possession-segment possession-segment--away"
          style={{
            width: `${away}%`,
            background: `linear-gradient(to right, ${awayTeam.theme.primary}, ${awayTeam.theme.secondary})`,
          }}
        />
        <div className="possession-center-line" aria-hidden="true" />
      </div>
      <div className="possession-values">
        <span className="possession-value possession-value--home">{home}%</span>
        <span className="possession-value possession-value--away">{away}%</span>
      </div>
    </section>
  );
};