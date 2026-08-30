// src/renderer/components/match-screen/BottomCommandBar.tsx
import React from "react";
import type { BottomStatusSegment, Club } from "./types.js";

export interface BottomCommandBarProps {
  statusSegments: BottomStatusSegment[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Club;
  awayTeam: Club;
  onHomeTactics: () => void;
  onAwayTactics: () => void;
  onOpenOptions: () => void;
  canEditHomeTactics: boolean;
  canEditAwayTactics: boolean;
}

export const BottomCommandBar: React.FC<BottomCommandBarProps> = ({
  statusSegments,
  homeTeamId,
  awayTeamId,
  homeTeam,
  awayTeam,
  onHomeTactics,
  onAwayTactics,
  onOpenOptions,
  canEditHomeTactics,
  canEditAwayTactics,
}) => {
  return (
    <footer className="bottom-command-bar">
      <div className="status-strip">
        {statusSegments.map((segment, i) => {
          if (segment.type === "text") {
            return <span key={`seg-${i}`}> {segment.value} </span>;
          }
          if (segment.type === "separator") {
            return <span key={`sep-${i}`}> {segment.value || "+"} </span>;
          }
          return null;
        })}
      </div>

      <div className="controls">
        {canEditHomeTactics && (
          <button className="tactics-btn" onClick={onHomeTactics}>
            {homeTeam.name} Tactics
          </button>
        )}
        {canEditAwayTactics && (
          <button className="tactics-btn" onClick={onAwayTactics}>
            {awayTeam.name} Tactics
          </button>
        )}

        <button className="options-btn" onClick={onOpenOptions} aria-label="Match options">
          Options ▼
        </button>
      </div>
    </footer>
  );
};