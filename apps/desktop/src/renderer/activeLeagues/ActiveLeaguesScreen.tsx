import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  AdvancedOptionsPayload,
  LeagueSelectionSnapshot,
  LeagueSetupIndexView,
  NationSelectionIntentPayload,
} from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { Alert } from "../components/ui/alert.js";
import {
  describeActiveLeaguesBottomBar,
  ShellBottomBar,
  type BottomBarPlan,
} from "../chrome/bottom-bar/index.js";
import { LeagueSelectionScreen } from "../leagueSelection/LeagueSelectionScreen.js";
import {
  buildLeaguePreset,
  describeRpcError,
  getLeagueSetupIndex,
  loadSetupDraft,
  saveSetupDraft,
  submitLeagueSelection,
} from "../rpc.js";
import { CreateSessionContext } from "../router/createSessionContext.js";
import { ActiveLeaguesLayout } from "./ActiveLeaguesLayout.js";
import { ActiveLeaguesProvider, useActiveLeagues } from "./ActiveLeaguesProvider.js";
import { ActiveLeaguesSidebar } from "./ActiveLeaguesSidebar.js";
import { ActiveLeaguesWorkspace } from "./ActiveLeaguesWorkspace.js";
import { createDraftSaver, type DraftSaver } from "./draft.js";
import {
  begin,
  fail,
  failureMessage,
  idleOperation,
  isPending,
  succeed,
  type Operation,
} from "./operation.js";
import { NARROW_LAYOUT_QUERY, useMediaQuery } from "./useViewportWidth.js";

/**
 * Create-flow step 1: the **Active Leagues** setup screen.
 *
 * This is the route-level component. It loads the catalogue and the starting configuration, owns
 * the two operations that cross the boundary (persisting the draft, recording the selection),
 * wires the workspace's typed intents to the setup state, and hands the resulting
 * `LeagueSelectionSnapshot` to the creation flow. It replaces the League & Nation tree as the
 * primary surface — the tree is retained, reachable through **Manage leagues**, which opens it as
 * a working copy of the same intents rather than as a second configuration.
 *
 * Nothing downstream of this screen changes. Continue records the same snapshot the tree used to
 * record and the flow lands on Step 2 · Manager exactly as before; the four-stage flow, its step
 * gating, and the Review handoff are untouched.
 *
 * Layer discipline: this file is the only one in the folder that calls IPC. The workspace, the
 * grid, the sidebar, and the advanced disclosure below it are presentational — every interaction
 * leaves them as a typed intent through a callback, and every figure arrives already derived.
 */

const runAtEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<Result.Result<A, E>> =>
  Effect.runPromise(Effect.result(effect));

/** What the screen needs before it can render anything: the catalogue and a starting setup. */
type Boot =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Failed"; readonly message: string }
  | {
      readonly _tag: "Ready";
      readonly index: LeagueSetupIndexView;
      readonly intents: readonly NationSelectionIntentPayload[];
      readonly advancedOptions: AdvancedOptionsPayload | undefined;
    };

export interface ActiveLeaguesScreenProps {
  /** Called with the snapshot once Continue succeeds. The screen never navigates itself. */
  readonly onContinue: (snapshot: LeagueSelectionSnapshot) => void;
  /** Cancel: leave setup for the Main Menu. */
  readonly onCancel: () => void;
}

export const ActiveLeaguesScreen = ({ onContinue, onCancel }: ActiveLeaguesScreenProps) => {
  const [boot, setBoot] = useState<Boot>({ _tag: "Loading" });

  // Mount: the catalogue first, then the configuration to start from — a stored draft if one
  // applies to this database, else the recommended preset. Sequential on purpose: a draft is only
  // meaningful once the catalogue it names is present, and the main process discards a draft
  // whose fingerprint no longer matches before it ever reaches here.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const outcome = await runAtEdge(getLeagueSetupIndex());
      if (cancelled) return;
      if (Result.isFailure(outcome)) {
        setBoot({ _tag: "Failed", message: describeRpcError(outcome.failure) });
        return;
      }
      const index = outcome.success;

      const draft = await runAtEdge(loadSetupDraft());
      if (cancelled) return;
      if (Result.isSuccess(draft) && draft.success !== null) {
        setBoot({
          _tag: "Ready",
          index,
          intents: draft.success.intents,
          advancedOptions: draft.success.advancedOptions,
        });
        return;
      }

      const preset = await runAtEdge(buildLeaguePreset({ preset: "recommended" }));
      if (cancelled) return;
      setBoot({
        _tag: "Ready",
        index,
        intents: Result.isSuccess(preset) ? preset.success.intents : [],
        advancedOptions: undefined,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (boot._tag === "Failed") {
    return (
      <div role="alert" className="text-text-danger">
        {boot.message}
      </div>
    );
  }
  if (boot._tag === "Loading") {
    return <p className="text-text-secondary">Loading leagues…</p>;
  }

  return (
    <ActiveLeaguesProvider
      index={boot.index}
      initialIntents={boot.intents}
      {...(boot.advancedOptions === undefined
        ? {}
        : { initialAdvancedOptions: boot.advancedOptions })}
    >
      <ActiveLeaguesSetup onContinue={onContinue} onCancel={onCancel} />
    </ActiveLeaguesProvider>
  );
};

const ActiveLeaguesSetup = ({ onContinue, onCancel }: ActiveLeaguesScreenProps) => {
  const {
    rows,
    addableLeagues,
    activeLeagueCount,
    nationCount,
    entityEstimate,
    processingCost,
    validation,
    canContinue,
    stale,
    advancedOptions,
    intents,
    dispatch,
  } = useActiveLeagues();

  const [managing, setManaging] = useState(false);
  const [submission, setSubmission] = useState<Operation<LeagueSelectionSnapshot>>(
    idleOperation<LeagueSelectionSnapshot>(),
  );
  const submissionRef = useRef(submission);
  submissionRef.current = submission;

  const narrow = useMediaQuery(NARROW_LAYOUT_QUERY);
  const createApi = useContext(CreateSessionContext);

  // ---- Draft persistence -------------------------------------------------
  // One saver for the screen's lifetime. Every configuration change schedules a write; the saver
  // debounces the burst into one, supersedes anything a newer change has replaced, and flushes
  // whatever is still outstanding when the screen is disposed of.
  const saverRef = useRef<DraftSaver | null>(null);
  saverRef.current ??= createDraftSaver({
    save: async (payload) => {
      const outcome = await runAtEdge(
        saveSetupDraft({
          intents: payload.intents,
          advancedOptions: payload.advancedOptions,
          // The tree's own view state is not this screen's to own; it keeps whatever it had.
          searchQuery: "",
          regionFilterId: null,
          statusFilter: "all",
        }),
      );
      return Result.isFailure(outcome) ? describeRpcError(outcome.failure) : null;
    },
  });
  const saver = saverRef.current;

  useEffect(() => {
    saver.schedule({ intents, advancedOptions });
  }, [saver, intents, advancedOptions]);

  useEffect(
    () => () => {
      void saver.dispose();
    },
    [saver],
  );

  // ---- Focus after removal ----------------------------------------------
  // The spec's rule: next row's equivalent control, else the previous row's, else Manage leagues.
  // The target is chosen *before* the removal (while the row that had focus still exists) and
  // applied once the row model no longer carries the removed league — removal resolves through
  // the trusted layer, so the grid does not change in the same tick as the click.
  const manageLeaguesRef = useRef<HTMLButtonElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusRef = useRef<{
    readonly removedId: string;
    readonly nextId: string | null;
  } | null>(null);

  const handleRemove = useCallback(
    (leagueId: string): void => {
      const position = rows.findIndex((row) => row.leagueId === leagueId);
      const nextId =
        rows[position + 1]?.leagueId ?? (position > 0 ? rows[position - 1]!.leagueId : null);
      pendingFocusRef.current = { removedId: leagueId, nextId: nextId ?? null };
      dispatch({ type: "removeActiveLeague", leagueId });
    },
    [dispatch, rows],
  );

  useEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    if (rows.some((row) => row.leagueId === pending.removedId)) return;
    pendingFocusRef.current = null;

    const target =
      pending.nextId === null
        ? null
        : rootRef.current?.querySelector(`[data-remove-league="${pending.nextId}"]`);
    if (target instanceof HTMLElement) {
      target.focus();
      return;
    }
    // Removing a league takes its whole Nation out of the career, so the neighbour it aimed at
    // may be gone too. The last resort is never "nowhere".
    manageLeaguesRef.current?.focus();
  }, [rows]);

  // ---- Operations --------------------------------------------------------
  const applySetupPreset = useCallback((): void => {
    void (async () => {
      const outcome = await runAtEdge(buildLeaguePreset({ preset: "recommended" }));
      if (Result.isFailure(outcome)) return;
      dispatch({
        type: "applySetupPreset",
        intents: outcome.success.intents,
        notice: "The recommended setup for this computer has been applied.",
      });
    })();
  }, [dispatch]);

  const handleContinue = useCallback((): void => {
    // The guard is in the model, not on the button's `disabled`: a keyboard repeat can outrun a
    // re-render, and two snapshots for one intent set is exactly what must not happen.
    const started = begin(submissionRef.current);
    if (started === null) return;
    if (!canContinue) return;
    setSubmission(started);

    void (async () => {
      // Flush the draft before the boundary call, so a snapshot always has a draft behind it.
      await saver.flush();
      const outcome = await runAtEdge(submitLeagueSelection({ intents }));
      if (Result.isFailure(outcome)) {
        const failure = outcome.failure;
        const message =
          failure._tag === "RemoteFailure" &&
          failure.error._tag === "InvalidLeagueSelectionError"
            ? failure.error.issues.map((entry) => entry.message).join(" ")
            : describeRpcError(failure);
        setSubmission(fail<LeagueSelectionSnapshot>(message));
        return;
      }
      setSubmission(succeed(outcome.success));
      onContinue(outcome.success);
    })();
  }, [canContinue, intents, onContinue, saver]);

  // ---- The shell's bottom bar -------------------------------------------
  const submitting = isPending(submission);
  const bottomBar: BottomBarPlan = useMemo(
    () =>
      describeActiveLeaguesBottomBar({
        canContinue,
        submitting,
        stale,
        hasActiveLeagues: validation.hasAtLeastOneActiveLeague,
        blockingMessages: validation.blockingMessages,
        onCancel,
        onContinue: handleContinue,
      }),
    [canContinue, handleContinue, onCancel, stale, submitting, validation],
  );

  const registerBottomBar = createApi?.registerBottomBar;
  useEffect(() => {
    if (registerBottomBar === undefined) return undefined;
    // The tree registers its own bar while it is open; re-registering ours would fight it.
    if (managing) return undefined;
    registerBottomBar(bottomBar);
    return () => registerBottomBar(null);
  }, [bottomBar, managing, registerBottomBar]);

  // ---- Manage leagues ----------------------------------------------------
  // Two presentations over one intent model: the tree opens seeded from the setup's intents and
  // hands them back on apply, so neither surface can hold a configuration the other does not.
  if (managing) {
    return (
      <LeagueSelectionScreen
        mode="manage"
        intents={intents}
        onApply={(next) => {
          dispatch({ type: "applySetupPreset", intents: next, notice: null });
          setManaging(false);
        }}
        onCancel={() => setManaging(false)}
      />
    );
  }

  const sidebar = (
    <ActiveLeaguesSidebar
      entityEstimate={entityEstimate}
      processingCost={processingCost}
      validation={validation}
      stale={stale}
    />
  );

  const failure = failureMessage(submission);

  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full flex-col">
      {failure !== null && (
        // Readable, actionable, and never a stack trace or a database detail: the controls come
        // back with it, so the player can change the setup and try again.
        <Alert variant="destructive" className="mb-2">
          {failure}
        </Alert>
      )}

      <ActiveLeaguesLayout
        workspace={
          <ActiveLeaguesWorkspace
            rows={rows}
            addableLeagues={addableLeagues}
            activeLeagueCount={activeLeagueCount}
            nationCount={nationCount}
            advancedOptions={advancedOptions}
            blockingMessages={validation.blockingMessages}
            stale={stale}
            manageLeaguesRef={manageLeaguesRef}
            onAddLeague={(leagueId) => dispatch({ type: "addActiveLeague", leagueId })}
            onChangeDepth={(leagueId, simulationDepth) =>
              dispatch({ type: "changeSimulationDepth", leagueId, simulationDepth })
            }
            onRemove={handleRemove}
            onChangeAdvancedOption={(key, value) =>
              dispatch({ type: "changeAdvancedOption", key, value })
            }
            onApplySetupPreset={applySetupPreset}
            onManageLeagues={() => setManaging(true)}
            {...(narrow ? { inlineSidebar: sidebar } : {})}
          />
        }
        {...(narrow ? {} : { sidebar })}
      />

      {/* Inside the creation shell the actions live in the shell's own bottom bar; a standalone
          render puts the same described bar beneath the screen, so the two cannot drift. */}
      {createApi === null && (
        <ShellBottomBar
          plan={bottomBar}
          className="sticky bottom-0 flex min-h-14 w-full shrink-0 items-center border-t border-border-subtle bg-bg-raised px-4"
        />
      )}
    </div>
  );
};
