/**
 * League and Nation Selection state: catalogue bootstrap, draft/preset restore,
 * the debounced revision-guarded resolver, draft persistence, submission, and
 * the bottom-bar plan (registered with the creation shell when there is one).
 *
 * The screen holds intents and renders answers — every resolution, dependency
 * closure, estimate, and validation happens in the main process (§22).
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import * as React from "react";
import type {
  CareerScopeEstimateView,
  LeagueSelectionSnapshot,
  LeagueSetupIndexView,
  NationSelectionIntentPayload,
  SelectionIssueRow,
} from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import {
  buildLeaguePreset,
  describeRpcError,
  getLeagueSetupIndex,
  loadSetupDraft,
  resolveLeagueSelection,
  saveSetupDraft,
  submitLeagueSelection,
} from "../rpc.js";
import { CreateSessionContext } from "../router/createSessionContext.js";
import {
  describeLeagueSelectionBottomBar,
  describeManageLeaguesBottomBar,
  type BottomBarPlan,
} from "../chrome/bottom-bar/index.js";
import {
  blockingIssueRows,
  browserView,
  canContinueNow,
  initialState,
  needsWarningAcknowledgement,
  reduce,
  warningIssueRows,
  type BrowserView,
  type LeagueSelectionCommand,
  type LeagueSelectionState,
} from "./viewModel.js";

/** §11.5. Long enough that dragging a depth dropdown does not fire a request per step, short
 *  enough that the summary does not feel detached from the click that changed it. */
export const ESTIMATE_DEBOUNCE_MS = 250;

const runAtEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<Result.Result<A, E>> =>
  Effect.runPromise(Effect.result(effect));

/** The two presentations this screen has, reduced to what the state needs to know apart. */
export interface LeagueSelectionInput {
  /** `null` in the step presentation; the working-copy contract in Manage leagues. */
  readonly manage: {
    readonly intents: readonly NationSelectionIntentPayload[];
    readonly onApply: (intents: readonly NationSelectionIntentPayload[]) => void;
    readonly onCancel: () => void;
  } | null;
  readonly onContinue: ((snapshot: LeagueSelectionSnapshot) => void) | null;
  readonly onBack: () => void;
}

export interface LeagueSelectionScreenState {
  readonly index: LeagueSetupIndexView | null;
  readonly loadError: string | null;
  readonly state: LeagueSelectionState;
  readonly view: BrowserView | null;
  readonly blocking: readonly SelectionIssueRow[];
  readonly warnings: readonly SelectionIssueRow[];
  readonly estimate: CareerScopeEstimateView | null;
  readonly stale: boolean;
  readonly warningPrompt: boolean;
  /** §30.1. A database with nothing playable cannot start a career. */
  readonly noPlayableNations: boolean;
  readonly bottomBar: BottomBarPlan | null;
}

export interface LeagueSelectionScreenActions {
  readonly dispatch: React.Dispatch<LeagueSelectionCommand>;
  readonly applyPreset: (preset: "recommended" | "minimal" | "broad_world") => void;
  readonly submit: () => void;
  readonly dismissWarningPrompt: () => void;
}

export interface LeagueSelectionScreenMeta {
  /** `null` outside the creation shell — a standalone render keeps the bar inline. */
  readonly createApi: React.ContextType<typeof CreateSessionContext>;
  readonly onBack: () => void;
}

export interface LeagueSelectionScreenValue {
  readonly state: LeagueSelectionScreenState;
  readonly actions: LeagueSelectionScreenActions;
  readonly meta: LeagueSelectionScreenMeta;
}

export const useLeagueSelection = ({
  manage,
  onContinue,
  onBack,
}: LeagueSelectionInput): LeagueSelectionScreenValue => {
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

  const applyPreset = useCallback((preset: "recommended" | "minimal" | "broad_world"): void => {
    void (async () => {
      const outcome = await runAtEdge(buildLeaguePreset({ preset }));
      if (Result.isFailure(outcome)) return;
      dispatch({ type: "APPLY_INTENTS", intents: outcome.success.intents, notice: null });
    })();
  }, []);

  const dismissWarningPrompt = useCallback((): void => {
    setWarningPrompt(false);
  }, []);

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

  return {
    state: {
      index,
      loadError,
      state,
      view,
      blocking,
      warnings,
      estimate,
      stale,
      warningPrompt,
      noPlayableNations,
      bottomBar,
    },
    actions: { dispatch, applyPreset, submit, dismissWarningPrompt },
    meta: { createApi, onBack },
  };
};
