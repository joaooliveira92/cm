import React from "react";
import { MatchScreen } from "./MatchScreen.js";
import { scenario1, scenario2, scenario3 } from "./mock-fixtures.js";
import "./styles.css";

export const MatchScreenDemo = () => {
  const [scenario, setScenario] = React.useState(1);

  const current = scenario === 1 ? scenario1 : scenario === 2 ? scenario2 : scenario3;

  const handleContinue = () => {
    alert("Match completed! Returning to next fixture...");
  };

  const handleHomeTactics = () => {
    alert(`${current.homeTeam.name} Tactics opened`);
  };

  const handleAwayTactics = () => {
    alert(`${current.awayTeam.name} Tactics opened`);
  };

  const handleOpenOptions = () => {
    alert("Match Options opened");
  };

  return (
    <div className="match-screen-container">
      <div className="demo-controls">
        <h2>Scenario: {scenario} - {scenario === 1 ? "Extra-time finish" : scenario === 2 ? "High-scoring league" : "Draw"}</h2>
        <div className="demo-buttons">
          <button onClick={() => setScenario(1)}>Scenario 1</button>
          <button onClick={() => setScenario(2)}>Scenario 2</button>
          <button onClick={() => setScenario(3)}>Scenario 3</button>
        </div>
      </div>

      <MatchScreen
        state={current}
        onContinue={handleContinue}
        onHomeTactics={handleHomeTactics}
        onAwayTactics={handleAwayTactics}
        onOpenOptions={handleOpenOptions}
        isPreviousDisabled={true}
        isNextDisabled={false}
        onPrevious={() => {}}
      />
    </div>
  );
};