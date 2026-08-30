// src/renderer/components/match-screen/MatchScreen.tsx
import React, { useState } from "react";
import type { Matchscreen, MatchClockState } from "./types.js";
import { Sidebar } from "./Sidebar.js";
import { Scoreboard } from "./Scoreboard.js";
import { PrimaryTabs } from "./PrimaryTabs.js";
import { MatchIncidents } from "./MatchIncidents.js";
import { FixturePanel } from "./FixturePanel.js";
import { SecondaryTabs } from "./SecondaryTabs.js";
import { PossessionPanel } from "./PossessionPanel.js";
import { BottomCommandBar } from "./BottomCommandBar.js";
import { StadiumOverlay } from "./StadiumOverlay.js";

export interface MatchScreenProps {
  state: Matchscreen;
  onContinue: () => void;
  onHomeTactics: () => void;
  onAwayTactics: () => void;
  onOpenOptions: () => void;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
}

export const MatchScreen: React.FC<MatchScreenProps> = ({
  state,
  onContinue,
  onHomeTactics,
  onAwayTactics,
  onOpenOptions,
  isPreviousDisabled = false,
  isNextDisabled = false,
  onPrevious,
  onNext,
}) => {
  const [primaryTab, setPrimaryTab] = useState(state.primaryTab);
  const [secondaryTab, setSecondaryTab] = useState(
    state.secondaryTab ?? (state.secondaryTabs[0]?.id ?? ""),
  );

  const clockState = state.clock;
  const status = getClockStatus(clockState);
  const elapsedMinutes = clockState.__typename === "full-time" ? clockState.elapsedMinutes : undefined;
  const clockValue = clockState.__typename === "scheduled" ? clockState.value : undefined;

  return (
    <div className="match-screen">
      <StadiumOverlay showOverlay />

      <div className="match-screen-layout">
        <Sidebar
          status={status}
          elapsedMinutes={elapsedMinutes}
          clockValue={clockValue}
          canContinue={state.permissions.canContinue}
          onContinue={onContinue}
          onPrevious={onPrevious ?? (() => {})}
          onNext={onNext ?? (() => {})}
          isPreviousDisabled={isPreviousDisabled}
          isNextDisabled={isNextDisabled}
        />

        <main className="match-workspace">
          <Scoreboard
            homeTeam={state.homeTeam}
            awayTeam={state.awayTeam}
            score={state.score}
          />

          <PrimaryTabs
            tabs={state.primaryTabs}
            selectedId={primaryTab}
            onSelect={setPrimaryTab}
          />

          <div className="main-content-area">
            {primaryTab === "overview" && (
              <>
                <div className="overview-panel">
                  <MatchIncidents
                    incidents={state.incidents}
                    periodScores={state.periodScores}
                    homeTeamName={state.homeTeam.name}
                    awayTeamName={state.awayTeam.name}
                  />
                </div>

                <FixturePanel fixture={state.fixture} />

                <SecondaryTabs
                  tabs={state.secondaryTabs}
                  selectedId={secondaryTab}
                  onSelect={setSecondaryTab}
                />

                <PossessionPanel
                  possession={state.possession}
                  homeTeam={state.homeTeam}
                  awayTeam={state.awayTeam}
                />
              </>
            )}

            {primaryTab !== "overview" && (
              <div className="tab-content-panel">
                <div className="tab-placeholder">
                  {state.primaryTabs.find((t) => t.id === primaryTab)?.label ?? primaryTab} tab content
                </div>
              </div>
            )}
          </div>

          <BottomCommandBar
            statusSegments={state.bottomStatus}
            homeTeamId={state.homeTeam.id}
            awayTeamId={state.awayTeam.id}
            homeTeam={state.homeTeam}
            awayTeam={state.awayTeam}
            onHomeTactics={onHomeTactics}
            onAwayTactics={onAwayTactics}
            onOpenOptions={onOpenOptions}
            canEditHomeTactics={state.permissions.canEditHomeTactics}
            canEditAwayTactics={state.permissions.canEditAwayTactics}
          />
        </main>
      </div>
    </div>
  );
};

function getClockStatus(clock: MatchClockState): "scheduled" | "live" | "full-time" | "halftime" {
  switch (clock.__typename) {
    case "scheduled":
      return "scheduled";
    case "live":
      return "live";
    case "full-time":
      return "full-time";
    case "halftime":
      return "halftime";
    default:
      return "scheduled";
  }
}

export type { MatchScreenProps };