// src/renderer/components/match-screen/Sidebar.tsx
import React from "react";

export interface SidebarProps {
  status?: "scheduled" | "live" | "full-time" | "halftime";
  elapsedMinutes?: number;
  clockValue?: string;
  canContinue: boolean;
  onContinue: () => void;
  onPrevious: () => void;
  onNext: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  selected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  status,
  elapsedMinutes,
  clockValue,
  canContinue,
  onContinue,
  onPrevious,
  onNext,
  isPreviousDisabled,
  isNextDisabled,
}) => {
  const getStatusDisplay = () => {
    if (status === "scheduled" && clockValue) {
      return clockValue;
    }
    if (status === "full-time" && elapsedMinutes !== undefined) {
      return `${elapsedMinutes}"`;
    }
    if (status === "halftime") {
      return "HT";
    }
    return null;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {getStatusDisplay() && <div className="match-status">{getStatusDisplay()}</div>}
      </div>

      <div className="nav-buttons">
        <button
          className="nav-button"
          onClick={onPrevious}
          disabled={isPreviousDisabled}
          aria-label="Previous screen"
        >
          <span className="nav-arrow left" aria-hidden="true">◀</span>
          Previous
        </button>
        <button
          className="nav-button"
          onClick={onNext}
          disabled={isNextDisabled}
          aria-label="Next screen"
        >
          <span className="nav-arrow right" aria-hidden="true">▶</span>
          Next
        </button>
      </div>

      <button
        className="continue-button"
        onClick={onContinue}
        disabled={!canContinue}
      >
        Continue Game
      </button>

      <div className="sidebar-nav">
        <button className="nav-item">
          <span className="nav-icon">👤</span>
          Manager Profile
        </button>
        <button className="nav-item">
          <span className="nav-icon">🏆</span>
          Competitions
        </button>
        <button className="nav-item">
          <span className="nav-icon">⚽</span>
          Nations & Clubs
        </button>
        <button className="nav-item">
          <span className="nav-icon">📊</span>
          Screen History
        </button>
        <button className="nav-item">
          <span className="nav-icon">⚙️</span>
          Game Options
        </button>
      </div>

      <div className="version-label">
        v1.02
      </div>
    </aside>
  );
};