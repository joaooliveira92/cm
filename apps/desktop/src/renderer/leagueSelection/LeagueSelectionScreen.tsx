/**
 * League and Nation Selection (Screen 3).
 *
 * Defines the *scope* of a career — which Nations take part and how deeply each is simulated —
 * and nothing else. It creates no world: `Continue` produces one immutable
 * `LeagueSelectionSnapshot` and hands it to the next setup stage, which is what lets the user
 * move back and forth through setup without anything being generated prematurely (§1, §17).
 *
 * This module is props, guard returns, and composition only. Every effect, the
 * debounced resolver, the callbacks, and the bottom-bar plan live in
 * `useLeagueSelection`; the four visible regions are its sibling leaves.
 */
import type {
  LeagueSelectionSnapshot,
  NationRow,
  NationSelectionIntentPayload,
} from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { ShellBottomBar } from "../chrome/bottom-bar/index.js";
import { LeagueSelectionToolbar } from "./LeagueSelectionToolbar.js";
import { NationTree } from "./NationTree.js";
import { SelectionIssues } from "./SelectionIssues.js";
import { SelectionSummary } from "./SelectionSummary.js";
import { useLeagueSelection } from "./useLeagueSelection.js";

export { ESTIMATE_DEBOUNCE_MS } from "./useLeagueSelection.js";

/**
 * The step presentation: this screen *is* the League step, so it loads its own draft, submits the
 * selection, and hands a snapshot to the creation flow.
 */
export interface LeagueSelectionStepProps {
  readonly mode?: undefined;
  /** Called with the snapshot once `Continue` succeeds. The screen never navigates itself — the
   *  creation flow owns where the career goes next. */
  readonly onContinue: (snapshot: LeagueSelectionSnapshot) => void;
  readonly onBack: () => void;
}

/**
 * The **Manage leagues** presentation: the same tree, opened *from* the Active Leagues setup
 * screen for the full-pyramid and scope work the dense grid cannot express.
 *
 * Here the tree edits a working copy of the setup's own intents rather than a state of its own:
 * it is seeded from `intents` when it opens and hands its intents back through `onApply` when it
 * closes, so the two presentations cannot drift into disagreeing configurations. Nothing is
 * submitted and no draft is loaded in this mode — the setup screen owns both.
 */
export interface LeagueSelectionManageProps {
  readonly mode: "manage";
  readonly intents: readonly NationSelectionIntentPayload[];
  readonly onApply: (intents: readonly NationSelectionIntentPayload[]) => void;
  readonly onCancel: () => void;
}

export type LeagueSelectionScreenProps =
  | LeagueSelectionStepProps
  | LeagueSelectionManageProps;

export const LeagueSelectionScreen = (props: LeagueSelectionScreenProps) => {
  const manage = props.mode === "manage" ? props : null;
  const { state, actions, meta } = useLeagueSelection({
    manage,
    onContinue: props.mode === "manage" ? null : props.onContinue,
    onBack: props.mode === "manage" ? props.onCancel : props.onBack,
  });
  const { index, loadError, state: model, view, blocking, warnings, estimate, stale } = state;
  const { dispatch, applyPreset, submit, dismissWarningPrompt } = actions;
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

  // §30.1. A database with nothing playable cannot start a career; say so instead of rendering an
  // empty tree with a permanently dead Continue.
  if (state.noPlayableNations) {
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
          {manage === null ? "Select Leagues" : "Manage leagues"}
        </h2>
        <p className="text-sm text-text-secondary">
          Database: {index.databaseName}, version {index.databaseVersion}
        </p>
      </header>

      {model.notice !== null && (
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
      )}

      <LeagueSelectionToolbar
        index={index}
        state={model}
        dispatch={dispatch}
        applyPreset={applyPreset}
      />

      {/* §10.5. Hidden selections are announced, so a filter never reads as a cleared selection. */}
      {view.hiddenSelectedCount > 0 && (
        <p role="status" className="mt-3 rounded-panel bg-text-warning/10 p-2 text-sm text-text-warning">
          {view.hiddenSelectedCount} selected nation
          {view.hiddenSelectedCount === 1 ? " is" : "s are"} hidden by the current filters.{" "}
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
      )}

      <div className="mt-4 flex gap-6">
        <div className="flex-1">
          <NationTree view={view} state={model} dispatch={dispatch} />
        </div>

        <SelectionSummary
          estimate={estimate}
          estimateStatus={model.estimateStatus}
          stale={stale}
        />
      </div>

      <SelectionIssues blocking={blocking} warnings={warnings} />

      {/* Inside the creation shell the actions live in the shell's bottom bar;
          a standalone render puts the same described bar beneath the section,
          so the two paths cannot drift into different layouts. */}
      {createApi === null && state.bottomBar !== null && (
        <ShellBottomBar
          plan={state.bottomBar}
          className="mt-6 flex min-h-20 w-full flex-col justify-center gap-1"
        />
      )}

      {/* §17.1. Warnings are confirmed, not silently accepted — and the confirmation is bound to
          the revision it was given for, so changing the selection re-asks. */}
      {state.warningPrompt && (
        <Card role="alertdialog" aria-labelledby="warning-prompt-heading" className="mt-4 p-3">
          <h3 id="warning-prompt-heading" className="font-semibold">
            Continue with warnings?
          </h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-text-warning">
            {warnings.map((entry) => (
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
      )}
    </section>
  );
};

export type { NationRow, NationSelectionIntentPayload };
