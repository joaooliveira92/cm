import { useEffect, useMemo, useReducer, useState } from "react";
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
import { FOCUS_RING } from "./focus.js";
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

export interface LeagueSelectionScreenProps {
  /** Called with the snapshot once `Continue` succeeds. The screen never navigates itself — the
   *  creation flow owns where the career goes next. */
  readonly onContinue: (snapshot: LeagueSelectionSnapshot) => void;
  readonly onBack: () => void;
}

export const LeagueSelectionScreen = ({ onContinue, onBack }: LeagueSelectionScreenProps) => {
  const [index, setIndex] = useState<LeagueSetupIndexView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reduce, initialState(""));
  const [warningPrompt, setWarningPrompt] = useState(false);

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

  const persistDraft = async (): Promise<void> => {
    await runAtEdge(
      saveSetupDraft({
        intents: state.intents,
        searchQuery: state.searchQuery,
        regionFilterId: state.regionFilterId,
        statusFilter: state.statusFilter,
      }),
    );
  };

  /** §18. Back saves the draft first, so returning finds the selection intact even though the
   *  screen's own state is gone. A failed save does not trap the user on the screen. */
  const handleBack = (): void => {
    void (async () => {
      await persistDraft();
      onBack();
    })();
  };

  const handleContinue = (): void => {
    if (!canContinueNow(state)) return;
    if (needsWarningAcknowledgement(state)) {
      setWarningPrompt(true);
      return;
    }
    submit();
  };

  const submit = (): void => {
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
      onContinue(outcome.success);
    })();
  };

  const applyPreset = (preset: "recommended" | "minimal" | "broad_world"): void => {
    void (async () => {
      const outcome = await runAtEdge(buildLeaguePreset({ preset }));
      if (Result.isFailure(outcome)) return;
      dispatch({ type: "APPLY_INTENTS", intents: outcome.success.intents, notice: null });
    })();
  };

  if (loadError !== null) {
    return (
      <div role="alert" className="text-red-400">
        {loadError}
      </div>
    );
  }
  if (index === null || view === null) {
    return <p className="text-slate-400">Loading leagues…</p>;
  }

  // §30.1. A database with nothing playable cannot start a career; say so instead of rendering an
  // empty tree with a permanently dead Continue.
  if (index.nations.every((nation) => !nation.playableSupported || !nation.available)) {
    return (
      <div role="alert" className="text-slate-300">
        <h2 className="text-lg font-semibold">No playable leagues in this database</h2>
        <p className="mt-2 text-sm text-slate-400">
          {index.databaseName} contains no league this game can make playable, so a career cannot
          be started from it. Choose a different database.
        </p>
        <button type="button" onClick={onBack} className={backButtonClass}>
          Back
        </button>
      </div>
    );
  }

  return (
    <section aria-labelledby="league-selection-heading" className="text-slate-200">
      <header>
        <h2 id="league-selection-heading" className="text-lg font-semibold">
          Select Leagues
        </h2>
        <p className="text-sm text-slate-400">
          Database: {index.databaseName}, version {index.databaseVersion}
        </p>
      </header>

      {state.notice !== null && (
        <div className="mt-4 flex items-start gap-3 rounded bg-slate-800 p-3 text-sm">
          <p className="flex-1">{state.notice}</p>
          <button
            type="button"
            className={`text-slate-400 hover:text-slate-200 ${FOCUS_RING.join(" ")}`}
            onClick={() => dispatch({ type: "DISMISS_NOTICE" })}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* §5.2 Toolbar. Filters are display-only — none of these controls changes the selection. */}
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col text-xs text-slate-400">
          Search nations or competitions
          <input
            type="search"
            value={state.searchQuery}
            onChange={(event) => dispatch({ type: "SET_SEARCH_QUERY", query: event.target.value })}
            className={`mt-1 rounded bg-slate-800 px-2 py-1 text-sm text-slate-100 ${FOCUS_RING.join(" ")}`}
          />
        </label>
        <label className="flex flex-col text-xs text-slate-400">
          Region
          <select
            value={state.regionFilterId ?? ""}
            onChange={(event) =>
              dispatch({
                type: "SET_REGION_FILTER",
                regionId: event.target.value === "" ? null : event.target.value,
              })
            }
            className={`mt-1 rounded bg-slate-800 px-2 py-1 text-sm ${FOCUS_RING.join(" ")}`}
          >
            <option value="">All regions</option>
            {index.regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-slate-400">
          Status
          <select
            value={state.statusFilter}
            onChange={(event) =>
              dispatch({ type: "SET_STATUS_FILTER", filter: event.target.value as StatusFilter })
            }
            className={`mt-1 rounded bg-slate-800 px-2 py-1 text-sm ${FOCUS_RING.join(" ")}`}
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {STATUS_FILTER_LABELS[filter]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => applyPreset("recommended")} className={toolbarButtonClass}>
            Recommended
          </button>
          <button type="button" onClick={() => applyPreset("minimal")} className={toolbarButtonClass}>
            Minimal
          </button>
          <button type="button" onClick={() => applyPreset("broad_world")} className={toolbarButtonClass}>
            Broad world
          </button>
        </div>
      </div>

      {/* §10.5. Hidden selections are announced, so a filter never reads as a cleared selection. */}
      {view.hiddenSelectedCount > 0 && (
        <p role="status" className="mt-3 rounded bg-amber-900/30 p-2 text-sm text-amber-200">
          {view.hiddenSelectedCount} selected nation
          {view.hiddenSelectedCount === 1 ? " is" : "s are"} hidden by the current filters.{" "}
          <button
            type="button"
            className={`underline ${FOCUS_RING.join(" ")}`}
            onClick={() => {
              dispatch({ type: "SET_STATUS_FILTER", filter: "selected" });
              dispatch({ type: "SET_REGION_FILTER", regionId: null });
              dispatch({ type: "SET_SEARCH_QUERY", query: "" });
            }}
          >
            Show selected
          </button>
        </p>
      )}

      <div className="mt-4 flex gap-6">
        {/* §5.3 Nation and league browser. A real tree: `treeitem` rows under `group`s, with the
            expansion and selection state exposed rather than implied by styling (§25.1). */}
        <div className="flex-1">
          {view.totalMatchCount === 0 ? (
            <p role="status" className="text-sm text-slate-400">
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
                    className={`w-full rounded px-2 py-1 text-left text-sm font-semibold hover:bg-slate-800 ${FOCUS_RING.join(" ")}`}
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
          className="w-72 shrink-0 rounded bg-slate-900 p-4 text-sm"
        >
          <h3 className="font-semibold">Selection summary</h3>
          {estimate === null ? (
            <p className="mt-2 text-slate-400">Calculating…</p>
          ) : (
            <>
              {/* §11.5. The previous figures stay visible and are marked stale rather than
                  blanking while a newer estimate is resolved. */}
              {stale && <p className="mt-1 text-xs text-slate-500">Updating estimate…</p>}
              {state.estimateStatus === "failed" && (
                <p role="status" className="mt-1 text-xs text-amber-300">
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
              <p className="mt-2 text-xs text-slate-500">
                Estimates are approximate and vary with this computer's load.
              </p>
            </>
          )}
        </aside>
      </div>

      {/* §16.3 / §25.4. One error summary, above the actions, listing every blocker. */}
      {blocking.length > 0 && (
        <div role="alert" className="mt-4 rounded bg-red-900/30 p-3 text-sm text-red-300">
          <h3 className="font-semibold">This selection cannot be used yet</h3>
          <ul className="mt-1 list-disc pl-5">
            {blocking.map((entry) => (
              <li key={`${entry.code}-${entry.nationId ?? "global"}`}>{entry.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div role="status" className="mt-4 rounded bg-amber-900/30 p-3 text-sm text-amber-200">
          <ul className="list-disc pl-5">
            {warnings.map((entry) => (
              <li key={`${entry.code}-${entry.nationId ?? "global"}`}>{entry.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={handleBack} className={backButtonClass}>
          Back
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "CLEAR_SELECTION" })}
          className={backButtonClass}
        >
          Clear Selection
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinueNow(state)}
          aria-describedby={canContinueNow(state) ? undefined : "continue-blocked-reason"}
          className={`rounded bg-green-700 px-4 py-2 hover:bg-green-600 disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
        >
          {state.submitting ? "Continuing…" : "Continue"}
        </button>
      </div>
      {/* A greyed control that does not say why is not acceptable. */}
      {!canContinueNow(state) && (
        <p id="continue-blocked-reason" className="mt-2 text-sm text-slate-400">
          {state.submitting
            ? "Creating your selection…"
            : stale
              ? "Checking this selection…"
              : blocking.length > 0
                ? "Resolve the problems listed above to continue."
                : "Select at least one playable league to continue."}
        </p>
      )}

      {/* §17.1. Warnings are confirmed, not silently accepted — and the confirmation is bound to
          the revision it was given for, so changing the selection re-asks. */}
      {warningPrompt && (
        <div role="alertdialog" aria-labelledby="warning-prompt-heading" className="mt-4 rounded bg-slate-800 p-4">
          <h3 id="warning-prompt-heading" className="font-semibold">
            Continue with warnings?
          </h3>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-200">
            {warnings.map((entry) => (
              <li key={entry.code}>{entry.message}</li>
            ))}
          </ul>
          <div className="mt-3 flex gap-3">
            <button type="button" onClick={() => setWarningPrompt(false)} className={backButtonClass}>
              Go back
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "ACKNOWLEDGE_WARNINGS" });
                submit();
              }}
              className={`rounded bg-green-700 px-4 py-2 ${FOCUS_RING.join(" ")}`}
            >
              Continue anyway
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

const toolbarButtonClass = `rounded bg-slate-700 px-3 py-1 text-sm hover:bg-slate-600 ${FOCUS_RING.join(" ")}`;
const backButtonClass = `rounded bg-slate-700 px-4 py-2 hover:bg-slate-600 ${FOCUS_RING.join(" ")}`;

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
    <dt className="text-slate-400">{label}</dt>
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
          row.matchesSearch ? "bg-slate-800" : ""
        }`}
      >
        <span aria-hidden="true" className="text-slate-500">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="min-w-40">{nation.name}</span>

        {!nation.available ? (
          // Non-colour indicator as well as the disabled state (§25.3).
          <span className="text-xs text-slate-500">Unavailable — content not installed</span>
        ) : !nation.playableSupported ? (
          <span className="text-xs text-slate-400">Background data only</span>
        ) : null}

        {nation.available && (
          <label className="flex items-center gap-1 text-xs text-slate-400">
            Mode
            <select
              value={row.mode}
              onChange={(event) => onMode(event.target.value as SimulationMode)}
              aria-label={`Simulation mode for ${nation.name}`}
              className={`rounded bg-slate-800 px-1 py-0.5 text-slate-100 ${FOCUS_RING.join(" ")}`}
            >
              {SIMULATION_MODES.filter(
                (mode) => mode !== "playable" || nation.playableSupported,
              ).map((mode) => (
                <option key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </label>
        )}

        {row.mode === "playable" && nation.scopeOptions.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-slate-400">
            Scope
            <select
              value={row.scopeOptionId ?? ""}
              onChange={(event) => onScope(event.target.value)}
              aria-label={`League scope for ${nation.name}`}
              className={`rounded bg-slate-800 px-1 py-0.5 text-slate-100 ${FOCUS_RING.join(" ")}`}
            >
              {nation.scopeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </select>
          </label>
        )}

        {dependencyOnly && (
          <span className="text-xs text-sky-300">Included because another selection needs it</span>
        )}
        {row.issues.some((entry) => entry.level !== "info") && (
          <span className="text-xs text-amber-300">! {row.issues[0]?.message}</span>
        )}
      </div>

      {expanded && (
        <ul role="group" className="ml-6 mt-1 space-y-0.5 text-xs">
          {nation.competitions.length === 0 && (
            <li className="text-slate-500">This nation has no competitions in this database.</li>
          )}
          {nation.competitions.map((competition) => {
            const isDependency = row.dependencyCompetitionIds.includes(competition.id as string);
            return (
              <li key={competition.id} role="treeitem" aria-selected={activeIds.has(competition.id as string)}>
                <span className={activeIds.has(competition.id as string) ? "text-slate-200" : "text-slate-500"}>
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
