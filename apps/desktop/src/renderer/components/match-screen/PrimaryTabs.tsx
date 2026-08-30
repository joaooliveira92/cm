// src/renderer/components/match-screen/PrimaryTabs.tsx
import React from "react";

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface PrimaryTabsProps {
  tabs: Tab[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const PrimaryTabs: React.FC<PrimaryTabsProps> = ({ tabs, selectedId, onSelect }) => {
  return (
    <nav className="primary-tabs" role="tablist">
      {tabs.map((tab) => {
        const isSelected = tab.id === selectedId;
        const isDisabled = tab.disabled === true;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isSelected}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            className={`tab ${isSelected ? "tab--selected" : ""} ${isDisabled ? "tab--disabled" : ""}`}
            onClick={() => !isDisabled && onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};