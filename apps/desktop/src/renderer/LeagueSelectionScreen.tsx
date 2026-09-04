import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import * as React from "react";
import type {
  LeagueSelectionSnapshot,
  LeagueSetupIndexView,
  NationRow,
  NationSelectionIntentPayload,
} from "@cm-clone/contracts";
import { SIMULATION_MODES, STATUS_FILTERS, type SimulationMode, type StatusFilter } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import {
  buildLeaguePreset,
  describeRpcError,
  getLeagueSetupIndex,
  loadSetupDraft,
  resolveLeagueSelection,
  saveSetupDraft,
  submitLeagueSelection,
} from "./rpc.js";
import { Alert } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { Card } from "./components/ui/card.js";
import { Input } from "./components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select.js";
import { FOCUS_RING } from "./focus.js";
import { CreateSessionContext } from "./router/createSessionContext.js";
import {
  describeLeagueSelectionBottomBar,
  describeManageLeaguesBottomBar,
  ShellBottomBar,
  type BottomBarPlan,
} from "./chrome/bottom-bar/index.js";
import {
  blockingIssueRows,
  browserView,
  canContinueNow,
  formatBytes,
  formatCount,
  initialState,
  needsWarningAcknowledgement,
  reduce,
  SPEED_LABELS,
  warningIssueRows,
  type NationRowView,
} from "./leagueSelection/viewModel.js";

/**
 * League and Nation Selection (Screen 3).
 *
 * Defines the *scope* of a career — which Nations take part and how deeply each is simulated —
 * and nothing else. It creates no world: `Continue` produces one immutable
 * `LeagueSelectionSnapshot` and hands it to the next setup stage, which is what lets the user
 * move back and forth through setup without anything being generated prematurely (§1, §17).
 *
 * The screen holds intents and renders answers. Every resolution, dependency closure, estimate,
 * and validation happens in the main process (§22): what arrives here is already trustworthy and
 * already sanitized, and what leaves is a Nation id, a mode, and a scope option id.
 */

/** §11.5. Long enough that dragging a depth dropdown does not fire a request per step, short
 *  enough that the summary does not feel detached from the click that changed it. */
export const ESTIMATE_DEBOUNCE_MS = 250;

const runAtEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<Result.Result<A, E>> =>
  Effect.runPromise(Effect.result(effect));

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
  const onContinue = props.mode === "manage" ? null : props.onContinue;
  const onBack = props.mode === "manage" ? props.onCancel : props.onBack;
  const [index, setIndex] = useState<LeagueSetupIndexView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reduce, initialState(""));
  const [warningPrompt, setWarningPrompt] = useState(false);

  // Read once, on mount, by the bootstrap effect. A ref rather than a dependency: reseeding the
  // tree because the setup's intents changed underneath it would discard the edit in progress.
  const manageIntentsRef = useRef<readonly NationSelectionIntentPayload[] | null>(
    manage === null ? null : manage.intents,
  );

  // The creation shell's bottom bar. `null` outside the shell (a standalone
  // render keeps the actions inline below the section); inside it, every render
  // re-registers the action cluster so the registered callbacks can never go
  // stale against this screen's reducer state.
  const createApi = React.use(CreateSessionContext);

  // Mount: fetch the catalogue, then restore a setup draft if one applies to this database.
  // Sequential on purpose — a draft is only meaningful once the catalogue it names is present.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const outcome = await runAtEdge(getLeagueSetupIndex());
      if (cancelled) return;
      if (Result.isFailure(outcome)) {
        setLoadError(describeRpcError(outcome.failure));
        return;
      }
      setIndex(outcome.success);

      // Manage mode is a working copy of somebody else's intents: seeding it from a draft or a
      // preset would silently replace the setup the player came here to edit.
      if (manageIntentsRef.current !== null) {
        dispatch({ type: "APPLY_INTENTS", intents: manageIntentsRef.current, notice: null });
        return;
      }

      const draft = await runAtEdge(loadSetupDraft());
      if (cancelled) return;
      if (Result.isSuccess(draft) && draft.success !== null) {
        dispatch({
          type: "APPLY_INTENTS",
          intents: draft.success.intents,
          notice: "Your previous setup for this database was restored.",
        });
        return;
      }
      // §6.1. No draft: apply the recommendation and say so, rather than starting empty.
      const preset = await runAtEdge(buildLeaguePreset({ preset: "recommended" }));
      if (cancelled || Result.isFailure(preset)) return;
      dispatch({
        type: "APPLY_INTENTS",
        intents: preset.success.intents,
        notice: "A recommended league configuration has been selected for this computer. You can change it before continuing.",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // §11.5. Debounced, revision-guarded resolution. There is no abort on the IPC seam, so an
  // obsolete request is not cancelled — its *answer* is discarded by the reducer, which compares
  // the echoed revision against the current one. The timer is cleared on every change, so a burst
  // of clicks issues one request rather than one per click.
  useEffect(() => {
    if (index === null) return;
    const revision = state.selectionRevision;
    const timer = setTimeout(() => {
      void (async () => {
        const outcome = await runAtEdge(
          resolveLeagueSelection({ selectionRevision: revision, intents: state.intents }),
        );
        if (Result.isFailure(outcome)) {
          dispatch({ type: "ESTIMATE_FAILED", revision });
          return;
        }
        dispatch({ type: "ESTIMATE_UPDATED", resolved: outcome.success });
      })();
    }, ESTIMATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [index, state.selectionRevision, state.intents]);

  const view = useMemo(
    () => (index === null ? null : browserView(index, state, state.resolved)),
    [index, state],
  );

  const blocking = blockingIssueRows(state.resolved);
  const warnings = warningIssueRows(state.resolved);
  const estimate = state.resolved?.estimate ?? null;
  const stale = state.estimateStatus === "updating";

  const persistDraft = useCallback(async (): Promise<void> => {
    await runAtEdge(
      saveSetupDraft({
        intents: state.intents,
        searchQuery: state.searchQuery,
        regionFilterId: state.regionFilterId,
        statusFilter: state.statusFilter,
      }),
    );
  }, [state.intents, state.searchQuery, state.regionFilterId, state.statusFilter]);

  /** §18. Back saves the draft first, so returning finds the selection intact even though the
   *  screen's own state is gone. A failed save does not trap the user on the screen. */
  const handleBack = useCallback((): void => {
    void (async () => {
      await persistDraft();
      onBack();
    })();
  }, [onBack, persistDraft]);

  const submit = useCallback((): void => {
    // AC-13. The reducer refuses a second start while one is in flight, so a double activation
    // cannot produce two submissions — and the guard is in the model, not on the button's
    // `disabled`, which a keyboard repeat can outrun.
    if (state.submitting) return;
    setWarningPrompt(false);
    dispatch({ type: "SUBMISSION_STARTED" });
    void (async () => {
      await persistDraft();
      const outcome = await runAtEdge(submitLeagueSelection({ intents: state.intents }));
      if (Result.isFailure(outcome)) {
        const failure = outcome.failure;
        const message =
          failure._tag === "RemoteFailure" &&
          failure.error._tag === "InvalidLeagueSelectionError"
            ? failure.error.issues.map((entry) => entry.message).join(" ")
            : describeRpcError(failure);
        dispatch({ type: "SUBMISSION_SETTLED", notice: message });
        return;
      }
      dispatch({ type: "SUBMISSION_SETTLED", notice: null });
      onContinue?.(outcome.success);
    })();
  }, [dispatch, onContinue, persistDraft, state.intents, state.submitting]);

  const handleContinue = useCallback((): void => {
    if (!canContinueNow(state)) return;
    if (needsWarningAcknowledgement(state)) {
      setWarningPrompt(true);
      return;
    }
    submit();
  }, [canContinueNow, needsWarningAcknowledgement, state, submit]);

  const clearSelection = useCallback((): void => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, [dispatch]);

  const applyPreset = (preset: "recommended" | "minimal" | "broad_world"): void => {
    void (async () => {
      const outcome = await runAtEdge(buildLeaguePreset({ preset }));
      if (Result.isFailure(outcome)) return;
      dispatch({ type: "APPLY_INTENTS", intents: outcome.success.intents, notice: null });
    })();
  };

  // §30.1. A database with nothing playable cannot start a career. The shell's
  // bottom bar still offers Back — leaving the flow is always possible.
  const noPlayableNations =
    index !== null &&
    index.nations.every((nation) => !nation.playableSupported || !nation.available);

  // The step describes its bar; the shell places the controls. Memoized so the
  // registration effect below only re-fires when the described state actually
  // changes — a fresh identity per render would churn the shell's state into an
  // update loop.
  const bottomBar: BottomBarPlan | null = useMemo(
    () =>
      index === null
        ? null
        : manage !== null
        ? describeManageLeaguesBottomBar({
            onCancel: manage.onCancel,
            onApply: () => manage.onApply(state.intents),
            onClearSelection: clearSelection,
          })
        : describeLeagueSelectionBottomBar({
            canContinue: canContinueNow(state),
            submitting: state.submitting,
            stale,
            blockingCount: blocking.length,
            noPlayableNations,
            onBack: noPlayableNations ? onBack : handleBack,
            onContinue: handleContinue,
            onClearSelection: clearSelection,
          }),
    [blocking.length, handleBack, handleContinue, clearSelection, index, manage, noPlayableNations, onBack, stale, state],
  );

  // `registerBottomBar` is a stable `useCallback` in the shell, so this effect
  // fires exactly when the memoized node actually changes — never per render.
  const registerBottomBar = createApi?.registerBottomBar;
  useEffect(() => {
    if (registerBottomBar === undefined) return undefined;
    registerBottomBar(bottomBar);
    return () => registerBottomBar(null);
  }, [bottomBar, registerBottomBar]);

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
  if (index.nations.every((nation) => !nation.playableSupported || !nation.available)) {
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

      {state.notice !== null && (
        <Card className="mt-4 flex items-start gap-3 p-3 text-sm">
          <p className="flex-1">{state.notice}</p>
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

      {/* §5.2 Toolbar. Filters are display-only — none of these controls changes the selection. */}
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col text-xs text-text-secondary">
          Search nations or competitions
          <Input
            type="search"
            value={state.searchQuery}
            onChange={(event) => dispatch({ type: "SET_SEARCH_QUERY", query: event.target.value })}
            className="mt-1"
          />
        </label>
        <label className="flex flex-col text-xs text-text-secondary">
          Region
          <Select
            value={state.regionFilterId ?? ""}
            onValueChange={(value) =>
              dispatch({
                type: "SET_REGION_FILTER",
                regionId: value === "" || value === null ? null : value,
              })
            }
          >
            <SelectTrigger aria-label="Region" className={SELECT_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All regions</SelectItem>
              {index.regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col text-xs text-text-secondary">
          Status
          <Select
            value={state.statusFilter}
            onValueChange={(value) => {
              if (value !== null) {
                dispatch({
                  type: "SET_STATUS_FILTER",
                  filter: value as StatusFilter,
                });
              }
            }}
          >
            <SelectTrigger aria-label="Status" className={SELECT_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {STATUS_FILTER_LABELS[filter]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-end gap-2">
          <Button type="button" variant="secondary" onClick={() => applyPreset("recommended")}>
            Recommended
          </Button>
          <Button type="button" variant="secondary" onClick={() => applyPreset("minimal")}>
            Minimal
          </Button>
          <Button type="button" variant="secondary" onClick={() => applyPreset("broad_world")}>
            Broad world
          </Button>
        </div>
      </div>

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
        {/* §5.3 Nation and league browser. A real tree: `treeitem` rows under `group`s, with the
            expansion and selection state exposed rather than implied by styling (§25.1). */}
        <div className="flex-1">
          {view.totalMatchCount === 0 ? (
            <p role="status" className="text-sm text-text-secondary">
              No nations or competitions match your search. The selection is unchanged.
            </p>
          ) : (
            <ul role="tree" aria-label="Nations and leagues" className="space-y-1">
              {view.regions.map((region) => (
                <li key={region.regionId} role="none">
                  <button
                    type="button"
                    role="treeitem"
                    aria-expanded={region.expanded}
                    aria-label={`${region.regionName}, ${region.nations.length} nations`}
                    className={`w-full rounded-control px-2 py-1 text-left text-sm font-semibold hover:bg-surface ${FOCUS_RING.join(" ")}`}
                    onClick={() => dispatch({ type: "TOGGLE_REGION", regionId: region.regionId })}
                  >
                    {region.expanded ? "▾" : "▸"} {region.regionName}
                  </button>
                  {region.expanded && (
                    <ul role="group" className="ml-4 space-y-1">
                      {region.nations.map((row) => (
                        <NationTreeRow
                          key={row.nation.id}
                          row={row}
                          expanded={state.expandedNationIds.includes(row.nation.id as string)}
                          onToggle={() =>
                            dispatch({ type: "TOGGLE_NATION", nationId: row.nation.id as string })
                          }
                          onMode={(mode) =>
                            dispatch({
                              type: "SET_NATION_MODE",
                              nationId: row.nation.id as string,
                              mode,
                              fallbackScopeOptionId:
                                (row.nation.recommendedScopeOptionId as string | null) ??
                                (row.nation.scopeOptions[0]?.id as string | undefined) ??
                                null,
                            })
                          }
                          onScope={(scopeOptionId) =>
                            dispatch({
                              type: "SET_NATION_SCOPE",
                              nationId: row.nation.id as string,
                              scopeOptionId,
                            })
                          }
                        />
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* §5.4 Selection summary. A live region: it changes in response to actions taken
            elsewhere on the screen, so a screen-reader user is told without moving focus (§25.2). */}
        <aside
          aria-label="Selection summary"
          aria-live="polite"
          aria-busy={stale}
          className="w-72 shrink-0 rounded-panel border border-panel-border bg-panel-bg p-3 text-sm shadow-panel"
        >
          <h3 className="font-semibold">Selection summary</h3>
          {estimate === null ? (
            <p className="mt-2 text-text-secondary">Calculating…</p>
          ) : (
            <>
              {/* §11.5. The previous figures stay visible and are marked stale rather than
                  blanking while a newer estimate is resolved. */}
              {stale && <p className="mt-1 text-xs text-text-muted">Updating estimate…</p>}
              {state.estimateStatus === "failed" && (
                <p role="status" className="mt-1 text-xs text-text-warning">
                  The estimate could not be calculated. Your selection is unaffected.
                </p>
              )}
              <dl className={`mt-2 space-y-1 ${stale ? "opacity-60" : ""}`}>
                <SummaryRow label="Selected nations" value={formatCount(estimate.selectedNationCount)} />
                <SummaryRow label="Playable nations" value={formatCount(estimate.playableNationCount)} />
                <SummaryRow label="Playable competitions" value={formatCount(estimate.playableCompetitionCount)} />
                <SummaryRow label="Background competitions" value={formatCount(estimate.backgroundCompetitionCount)} />
                <SummaryRow label="Estimated clubs" value={formatCount(estimate.estimatedClubCount)} />
                <SummaryRow label="Estimated players" value={formatCount(estimate.estimatedPlayerCount)} />
                <SummaryRow label="Estimated staff" value={formatCount(estimate.estimatedStaffCount)} />
                <SummaryRow label="Memory estimate" value={formatBytes(estimate.estimatedMemoryBytes)} />
                <SummaryRow label="Save estimate" value={formatBytes(estimate.estimatedInitialSaveBytes)} />
                <SummaryRow
                  label="Expected processing speed"
                  value={SPEED_LABELS[estimate.simulationSpeedRating] ?? estimate.simulationSpeedRating}
                />
                <SummaryRow label="Estimate confidence" value={estimate.confidence} />
              </dl>
              {/* §11.4. The hedge is part of the claim, not decoration. */}
              <p className="mt-2 text-xs text-text-muted">
                Estimates are approximate and vary with this computer's load.
              </p>
            </>
          )}
        </aside>
      </div>

      {/* §16.3 / §25.4. One error summary, above the actions, listing every blocker. */}
      {blocking.length > 0 && (
        <Alert variant="destructive" className="mt-4">
          <h3 className="font-semibold">This selection cannot be used yet</h3>
          <ul className="mt-1 list-disc pl-5">
            {blocking.map((entry) => (
              <li key={`${entry.code}-${entry.nationId ?? "global"}`}>{entry.message}</li>
            ))}
          </ul>
        </Alert>
      )}
      {warnings.length > 0 && (
        <Alert role="status" className="mt-4 border-text-warning/40 bg-text-warning/10 text-text-warning">
          <ul className="list-disc pl-5">
            {warnings.map((entry) => (
              <li key={`${entry.code}-${entry.nationId ?? "global"}`}>{entry.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Inside the creation shell the actions live in the shell's bottom bar;
          a standalone render puts the same described bar beneath the section,
          so the two paths cannot drift into different layouts. */}
      {createApi === null && bottomBar !== null && (
        <ShellBottomBar
          plan={bottomBar}
          className="mt-6 flex min-h-20 w-full flex-col justify-center gap-1"
        />
      )}

      {/* §17.1. Warnings are confirmed, not silently accepted — and the confirmation is bound to
          the revision it was given for, so changing the selection re-asks. */}
      {warningPrompt && (
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
            <Button type="button" variant="secondary" onClick={() => setWarningPrompt(false)}>
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

/*
 * These sizing/paint tokens are shared by every Base UI Select trigger on this
 * screen. The primitive (`components/ui/select.tsx`) supplies the popup listbox;
 * `aria-label`s on the triggers carry the accessible names.
 */
const SELECT_CLASS = `mt-1 rounded-control border border-border-subtle bg-field-bg px-2 py-1 text-sm ${FOCUS_RING.join(" ")}`;
const SELECT_CLASS_COMPACT = `rounded-control border border-border-subtle bg-field-bg px-1 py-0.5 text-text-primary ${FOCUS_RING.join(" ")}`;

const STATUS_FILTER_LABELS: Readonly<Record<StatusFilter, string>> = {
  all: "All",
  selected: "Selected",
  playable: "Playable",
  background: "Background",
  view_only: "View only",
  included_by_dependency: "Included by dependency",
  warnings: "Warnings",
  unavailable: "Unavailable",
};

const MODE_LABELS: Readonly<Record<SimulationMode, string>> = {
  playable: "Playable",
  background: "Background",
  view_only: "View only",
  not_loaded: "Not loaded",
};

const SummaryRow = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="flex justify-between gap-2">
    <dt className="text-text-secondary">{label}</dt>
    <dd>{value}</dd>
  </div>
);


/**
 * One Nation row and its pyramid.
 *
 * The mode selector offers `Playable` only when the database supports it (§7.3), and the whole
 * row is inert for an unavailable Nation (§7.1) — which stays *visible*, with the reason, rather
 * than being hidden.
 */
const NationTreeRow = ({
  row,
  expanded,
  onToggle,
  onMode,
  onScope,
}: {
  readonly row: NationRowView;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onMode: (mode: SimulationMode) => void;
  readonly onScope: (scopeOptionId: string) => void;
}) => {
  const { nation } = row;
  const dependencyOnly = row.state === "included_by_dependency";
  const activeIds = new Set([...row.activeCompetitionIds, ...row.dependencyCompetitionIds]);

  return (
    <li role="none">
      <div
        role="treeitem"
        aria-expanded={expanded}
        aria-selected={row.triState === "checked"}
        // §7.2, §25.1. The mixed state is carried in the accessible semantics, not only in the
        // glyph, so a screen-reader user hears "partially selected" rather than nothing.
        aria-checked={row.triState === "mixed" ? "mixed" : row.triState === "checked"}
        aria-disabled={!nation.available}
        tabIndex={0}
        // The whole row toggles, which is what a tree row is expected to do — but a click that
        // originated in one of the row's own controls is that control's, not the row's, or
        // choosing a mode would collapse the pyramid the choice just changed.
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("select, option, label, input") !== null) return;
          onToggle();
        }}
        onKeyDown={(event) => {
          // §24. Right/Left expand and collapse; Enter and Space toggle. Arrow-key traversal
          // between rows is the browser's own focus order here.
          if (event.key === "ArrowRight" && !expanded) onToggle();
          if (event.key === "ArrowLeft" && expanded) onToggle();
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className={`flex flex-wrap items-center gap-3 rounded px-2 py-1 ${FOCUS_RING.join(" ")} ${
          row.matchesSearch ? "bg-surface" : ""
        }`}
      >
        <span aria-hidden="true" className="text-text-muted">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="min-w-40">{nation.name}</span>

        {!nation.available ? (
          // Non-colour indicator as well as the disabled state (§25.3).
          <span className="text-xs text-text-muted">Unavailable — content not installed</span>
        ) : !nation.playableSupported ? (
          <span className="text-xs text-text-secondary">Background data only</span>
        ) : null}

        {nation.available && (
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            Mode
            <Select
              value={row.mode}
              onValueChange={(value) => {
                if (value !== null) onMode(value as SimulationMode);
              }}
            >
              <SelectTrigger
                aria-label={`Simulation mode for ${nation.name}`}
                className={SELECT_CLASS_COMPACT}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIMULATION_MODES.filter(
                  (mode) => mode !== "playable" || nation.playableSupported,
                ).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {row.mode === "playable" && nation.scopeOptions.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-text-secondary">
            Scope
            <Select
              value={row.scopeOptionId ?? ""}
              onValueChange={(value) => {
                if (value !== null) onScope(value);
              }}
            >
              <SelectTrigger
                aria-label={`League scope for ${nation.name}`}
                className={SELECT_CLASS_COMPACT}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nation.scopeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {dependencyOnly && (
          <span className="text-xs text-sky-300">Included because another selection needs it</span>
        )}
        {row.issues.some((entry) => entry.level !== "info") && (
          <span className="text-xs text-text-warning">! {row.issues[0]?.message}</span>
        )}
      </div>

      {expanded && (
        <ul role="group" className="ml-6 mt-1 space-y-0.5 text-xs">
          {nation.competitions.length === 0 && (
            <li className="text-text-muted">This nation has no competitions in this database.</li>
          )}
          {nation.competitions.map((competition) => {
            const isDependency = row.dependencyCompetitionIds.includes(competition.id as string);
            return (
              <li key={competition.id} role="treeitem" aria-selected={activeIds.has(competition.id as string)}>
                <span className={activeIds.has(competition.id as string) ? "text-text-strong" : "text-text-muted"}>
                  {activeIds.has(competition.id as string) ? "✓" : "·"} {competition.name}
                </span>
                {/* §12.1. An automatically included competition explains itself in place, rather
                    than looking like a choice the user made and forgot. */}
                {isDependency && (
                  <span className="ml-2 text-sky-300">required by your selection</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

export type { NationRow, NationSelectionIntentPayload };
