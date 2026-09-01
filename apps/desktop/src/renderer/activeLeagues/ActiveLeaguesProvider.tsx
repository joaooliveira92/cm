import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  AdvancedOptionsPayload,
  LeagueSetupIndexView,
  NationSelectionIntentPayload,
} from "@cm-clone/contracts";
import type {
  ActiveLeaguesEntityEstimate,
  ProcessingCostReading,
  LeagueRecommendation,
} from "@cm-clone/shared";
import { Effect, Exit } from "effect";
import { resolveLeagueSelection, RegistryProvider, useAtom, useAtomValue } from "../rpc.js";
import { toDomainIndex } from "./adapters.js";
import {
  createActiveLeaguesAtoms,
  type ActiveLeaguesAtoms,
  type ActiveLeaguesValidation,
  type GridRowView,
} from "./atoms.js";
import { applyIntent, initialState } from "./state.js";
import type { ActiveLeaguesIntent, ActiveLeaguesSetupState } from "./types.js";

/**
 * The Active Leagues setup state owner.
 *
 * This is ticket 04's seam: a React provider that owns the authoritative setup atoms and the
 * one async edge the concerns already perform (the trusted `resolveLeagueSelection` call on the
 * existing seam — no new RPC method). The workspace, sidebar, and footer built in later tickets
 * consume the context it publishes and fire typed intents through `dispatch`; presentation
 * components never call IPC (spec "renderer organization and layer discipline").
 *
 * The resolve edge is the *only* `useEffect` in the file and it carries no calculated number:
 * it asks the trusted layer what the current intents resolve to and stores the *answer*, while
 * every derived figure (rows, entity count, cost, recommendations, validation, can-continue)
 * is computed by the atoms in `atoms.ts`. A summary can never go stale because nothing caches
 * a derived value.
 */

/** Long enough that a burst of depth changes settles into one resolve request, short enough
 *  that the grid never feels detached from the click that changed it (§11.5). */
export const ACTIVE_LEAGUES_DEBOUNCE_MS = 250;

export interface ActiveLeaguesContextValue {
  readonly index: LeagueSetupIndexView;
  readonly rows: readonly GridRowView[];
  readonly activeLeagueCount: number;
  readonly entityEstimate: ActiveLeaguesEntityEstimate;
  readonly processingCost: ProcessingCostReading;
  readonly recommendations: readonly LeagueRecommendation[];
  readonly validation: ActiveLeaguesValidation;
  readonly canContinue: boolean;
  readonly stale: boolean;
  readonly notice: string | null;
  /** The one way user interactions reach the authoritative state. */
  readonly dispatch: (intent: ActiveLeaguesIntent) => void;
}

const ActiveLeaguesContext = createContext<ActiveLeaguesContextValue | null>(null);

export const useActiveLeagues = (): ActiveLeaguesContextValue => {
  const value = useContext(ActiveLeaguesContext);
  if (value === null) {
    throw new Error("active-leagues screen rendered outside ActiveLeaguesProvider");
  }
  return value;
};

export interface ActiveLeaguesProviderProps {
  readonly index: LeagueSetupIndexView;
  readonly initialIntents?: readonly NationSelectionIntentPayload[];
  readonly initialAdvancedOptions?: AdvancedOptionsPayload;
  readonly children: ReactNode;
}

export const ActiveLeaguesProvider = ({
  index,
  initialIntents,
  initialAdvancedOptions,
  children,
}: ActiveLeaguesProviderProps) => (
  // Each screen instance gets a fresh registry and a fresh atom set, exactly like the career
  // shell does per save — a mounted setup can never inherit a previous screen's atom values, and
  // a changed initial seed (a draft restored mid-session) remounts rather than being ignored.
  <RegistryProvider>
    <ActiveLeaguesInner
      key={`${index.fingerprint}:${JSON.stringify(initialIntents ?? [])}:${JSON.stringify(initialAdvancedOptions ?? {})}`}
      index={index}
      initial={initialState({
        intents: initialIntents,
        advancedOptions: initialAdvancedOptions,
      })}
    >
      {children}
    </ActiveLeaguesInner>
  </RegistryProvider>
);

// `runPromiseExit` rather than `runPromise` with a `Result`: a *defect* in the resolver (a bug,
// not a typed failure) must also land in the checked `failed` slot, never in an unhandled
// rejection that leaves the screen stuck on `loading`.
const runAtEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<Exit.Exit<A, E>> =>
  Effect.runPromiseExit(effect);

const ActiveLeaguesInner = ({
  index,
  initial,
  children,
}: {
  readonly index: LeagueSetupIndexView;
  readonly initial: ActiveLeaguesSetupState;
  readonly children: ReactNode;
}) => {
  const atomsRef = useRef<ActiveLeaguesAtoms | null>(null);
  atomsRef.current ??= createActiveLeaguesAtoms(index, initial);
  const atoms = atomsRef.current;

  const [state, setState] = useAtom(atoms.stateAtom);
  const [slot, setSlot] = useAtom(atoms.resolvedSlotAtom);
  const view = useAtomValue(atoms.viewAtom);

  // Latest-value refs the async edge reads through: a settled resolve or a cancelled dispatch can
  // never act on a stale closure — the same discipline the squad screen applies to its handlers.
  const stateRef = useRef(state);
  stateRef.current = state;
  const slotRef = useRef(slot);
  slotRef.current = slot;
  const setSlotRef = useRef(setSlot);
  setSlotRef.current = setSlot;

  const domainIndex = useMemo(() => toDomainIndex(index), [index]);

  const dispatch = useCallback(
    (intent: ActiveLeaguesIntent): void => {
      // The setter accepts an updater, so a burst of dispatches folds over the *current* state
      // rather than a render-captured one.
      setState((current) => applyIntent(domainIndex, current, intent));
    },
    [setState, domainIndex],
  );

  // The one async edge: ask the trusted layer what the current intents resolve to. Marked
  // loading immediately (so the previous figures are shown stale, §11.5), debounced so a burst
  // of changes issues one request, and revision-guarded so an answer for a scrapped selection is
  // discarded — exactly the contract the existing screen already meets.
  useEffect(() => {
    const revision = state.revision;
    const intents = state.intents;
    let cancelled = false;

    const currentReady = slotRef.current._tag === "ready" ? slotRef.current.resolved : null;
    setSlot({ _tag: "loading", previous: currentReady });

    const timer = setTimeout(() => {
      void (async () => {
        const exit = await runAtEdge(
          resolveLeagueSelection({ selectionRevision: revision, intents }),
        );
        if (cancelled || stateRef.current.revision !== revision) return;
        if (Exit.isSuccess(exit)) {
          setSlotRef.current({ _tag: "ready", resolved: exit.value });
          return;
        }
        // A typed failure or a defect both land here as a checked value: the previous answer
        // stays visible (marked stale) and the workspace renders the failure rather than
        // throwing.
        const previous =
          slotRef.current._tag === "loading" ? slotRef.current.previous : null;
        setSlotRef.current({ _tag: "failed", previous });
      })();
    }, ACTIVE_LEAGUES_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `setSlot` is deliberately not in the deps: it is a stable ref-read setter, and including it  // would re-arms the debounce on every slot write.
  }, [state.revision, state.intents]);

  const value = useMemo<ActiveLeaguesContextValue>(
    () => ({
      index,
      rows: view.rows,
      activeLeagueCount: view.activeLeagueCount,
      entityEstimate: view.entityEstimate,
      processingCost: view.processingCost,
      recommendations: view.recommendations,
      validation: view.validation,
      canContinue: view.canContinue,
      stale: view.stale,
      notice: state.notice,
      dispatch,
    }),
    [dispatch, index, state.notice, view],
  );

  return (
    <ActiveLeaguesContext.Provider value={value}>{children}</ActiveLeaguesContext.Provider>
  );
};