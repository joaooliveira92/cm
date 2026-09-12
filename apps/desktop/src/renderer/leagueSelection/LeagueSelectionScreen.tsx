import type { LeagueSelectionSnapshot, NationRow, NationSelectionIntentPayload } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { ShellBottomBar } from "../chrome/bottom-bar/index.js";
import { LeagueSelectionProvider, useLeagueSelectionContext } from "./LeagueSelectionProvider.js";
import { LeagueSelectionToolbar } from "./LeagueSelectionToolbar.js";
import { NationTree } from "./NationTree.js";
import { SelectionIssues } from "./SelectionIssues.js";
import { SelectionSummary } from "./SelectionSummary.js";

export { ESTIMATE_DEBOUNCE_MS } from "./useLeagueSelection.js";

export interface LeagueSelectionStepProps {
  readonly mode?: undefined;
  readonly onContinue: (snapshot: LeagueSelectionSnapshot) => void;
  readonly onBack: () => void;
}

export interface LeagueSelectionManageProps {
  readonly mode: "manage";
  readonly intents: readonly NationSelectionIntentPayload[];
  readonly onApply: (intents: readonly NationSelectionIntentPayload[]) => void;
  readonly onCancel: () => void;
}

export type LeagueSelectionScreenProps =
  | LeagueSelectionStepProps
  | LeagueSelectionManageProps;

const DismissibleNotice = () => {
  const { actions: { dispatch }, state: { state: model } } = useLeagueSelectionContext();
  return (
    <Card className="mt-4 flex items-start gap-3 p-3 text-sm">
      <p className="flex-1">{model.notice}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => dispatch({ type: "DISMISS_NOTICE" })}
      >
        Dismiss
      </Button>
    </Card>
  );
};

const WarningPrompt = () => {
  const { state: screenState, actions: { dispatch, dismissWarningPrompt, submit } } = useLeagueSelectionContext();
  return (
    <Card role="alertdialog" aria-labelledby="warning-prompt-heading" className="mt-4 p-3">
      <h3 id="warning-prompt-heading" className="font-semibold">
        Continue with warnings?
      </h3>
      <ul className="mt-2 list-disc pl-5 text-sm text-text-warning">
        {screenState.warnings.map((entry) => (
          <li key={entry.code}>{entry.message}</li>
        ))}
      </ul>
      <div className="mt-3 flex gap-3">
        <Button type="button" variant="secondary" onClick={dismissWarningPrompt}>
          Go back
        </Button>
        <Button
          type="button"
          onClick={() => {
            dispatch({ type: "ACKNOWLEDGE_WARNINGS" });
            submit();
          }}
        >
          Continue anyway
        </Button>
      </div>
    </Card>
  );
};

const HiddenSelectedNotice = () => {
  const { state: { view } } = useLeagueSelectionContext();
  const hiddenCount = view?.hiddenSelectedCount ?? 0;
  if (hiddenCount === 0) return null;

  const { actions: { dispatch } } = useLeagueSelectionContext();
  return (
    <p role="status" className="mt-3 rounded-panel bg-text-warning/10 p-2 text-sm text-text-warning">
      {hiddenCount} selected nation
      {hiddenCount === 1 ? " is" : "s are"} hidden by the current filters.{" "}
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => {
          dispatch({ type: "SET_STATUS_FILTER", filter: "selected" });
          dispatch({ type: "SET_REGION_FILTER", regionId: null });
          dispatch({ type: "SET_SEARCH_QUERY", query: "" });
        }}
      >
        Show selected
      </Button>
    </p>
  );
};

const LeagueSelectionContent = () => {
  const { state: screenState, meta, isManage } = useLeagueSelectionContext();
  const { index, loadError, state: model, view, blocking, warnings } = screenState;
  const { createApi, onBack } = meta;

  if (loadError !== null) {
    return (
      <div role="alert" className="text-text-danger">
        {loadError}
      </div>
    );
  }
  if (index === null || view === null) {
    return <p className="text-text-secondary">Loading leagues…</p>;
  }
  if (screenState.noPlayableNations) {
    return (
      <div role="alert" className="text-text-body">
        <h2 className="text-lg font-semibold">No playable leagues in this database</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {index.databaseName} contains no league this game can make playable, so a career cannot
          be started from it. Choose a different database.
        </p>
        {createApi === null && (
          <Button type="button" onClick={onBack} variant="secondary">
            Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="league-selection-heading" className="text-text-strong">
      <header>
        <h2 id="league-selection-heading" className="text-lg font-semibold">
          {isManage ? "Manage leagues" : "Select Leagues"}
        </h2>
        <p className="text-sm text-text-secondary">
          Database: {index.databaseName}, version {index.databaseVersion}
        </p>
      </header>

      {model.notice !== null && <DismissibleNotice />}

      <LeagueSelectionToolbar />

      {view.hiddenSelectedCount > 0 && <HiddenSelectedNotice />}

      <div className="mt-4 flex gap-6">
        <div className="flex-1">
          <NationTree.Root />
        </div>
        <SelectionSummary.Root />
      </div>

      <SelectionIssues blocking={blocking} warnings={warnings} />

      {createApi === null && screenState.bottomBar !== null && (
        <ShellBottomBar
          plan={screenState.bottomBar}
          className="mt-6 flex min-h-20 w-full flex-col justify-center gap-1"
        />
      )}

      {screenState.warningPrompt && <WarningPrompt />}
    </section>
  );
};

export const LeagueSelectionScreen = (props: LeagueSelectionScreenProps) => {
  const manage = props.mode === "manage" ? props : null;

  return (
    <LeagueSelectionProvider
      manage={manage}
      onContinue={props.mode === "manage" ? null : props.onContinue}
      onBack={props.mode === "manage" ? props.onCancel : props.onBack}
    >
      <LeagueSelectionContent />
    </LeagueSelectionProvider>
  );
};

export type { NationRow, NationSelectionIntentPayload };
