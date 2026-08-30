// src/renderer/components/match-screen/SecondaryTabs.tsx
import React from "react";

export interface SecondaryTab {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface SecondaryTabsProps {
  tabs: SecondaryTab[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const SecondaryTabs: React.FC<SecondaryTabsProps> = ({ tabs, selectedId, onSelect }) => {
  return (
    <nav className="secondary-tabs" role="tablist">
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
            className={`tab secondary-tab ${isSelected ? "tab--selected" : ""} ${isDisabled ? "tab--disabled" : ""}`}
            onClick={() => !isDisabled && onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};