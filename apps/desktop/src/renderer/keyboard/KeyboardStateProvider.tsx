/**
 * The keyboard state context: binding overrides, prefix lifecycle, and all
 * effective-action derivations the spine and overlay components consume.
 * Lifted from `KeyboardSpine.tsx` so the palette, help overlay, and prefix
 * indicator read the same effective bindings the resolver dispatches on.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Effect } from "effect";
import {
  ACTION_REGISTRY,
  ALL_ACTIONS,
} from "../actions/allActions.js";
import { publishBindingOverrides } from "../actions/bindingState.js";
import {
  gByKeyOf,
  gPrefixCompletionsOf,
  prefixIndicatorEntriesOf,
  withEffectiveBindings,
  type KeyBindingOverrides,
  type PrefixIndicatorEntry,
} from "../actions/overrides.js";
import { getKeyBindingOverrides, EMPTY_KEY_BINDING_OVERRIDES } from "../rpc.js";
import { type Action, type ScopeState } from "../actions/types.js";
import { type PrefixState } from "../keymap/prefix.js";
import { usePrefixState } from "./usePrefixState.js";

export interface KeyboardStateValue {
  /** The current key-binding override map. */
  readonly bindingOverrides: KeyBindingOverrides;
  /** Adopt a new override map (from the help overlay's mutation path). */
  readonly adoptOverrides: (next: KeyBindingOverrides) => void;
  /** Current `g <key>` prefix state. */
  readonly prefix: PrefixState;
  /** Set the prefix state (from the `onKeyDown` dispatcher). */
  readonly setPrefix: (next: PrefixState) => void;
  /** The whole registry with overrides layered over defaults. */
  readonly effectiveActions: ReadonlyArray<Action>;
  /** The current-scope active set with overrides applied. */
  readonly activeActions: ReadonlyArray<Action>;
  /** The valid `g <key>` completion set (career-global nav destinations). */
  readonly effectiveCompletions: ReadonlySet<string>;
  /** Destination actions keyed by their `g <key>` completion key. */
  readonly effectiveGByKey: ReadonlyMap<string, Action>;
  /** "Go to: Squad [S] · …" entries for the prefix indicator. */
  readonly effectivePrefixEntries: ReadonlyArray<PrefixIndicatorEntry>;
}

export const KeyboardContext = createContext<KeyboardStateValue | null>(null);

export const KeyboardStateProvider = ({
  currentScreen,
  scopeState,
  children,
}: {
  readonly currentScreen: string;
  readonly scopeState: ScopeState;
  readonly children: ReactNode;
}) => {
  // Machine-local key binding overrides (ticket 14 / Stage 6). Fetched through
  // the seam once at mount; any failure (transport, decode, or a missing/never-error
  // branch) is tolerated as the fresh-player empty map. The help overlay's mutations
  // return the *updated* map and adopt it here, so every effective-binding derivation
  // below re-runs from one state: the registry stays the single membership decision
  // point and the overrides are layered over it — never mirrored.
  const [bindingOverrides, setBindingOverrides] = useState<KeyBindingOverrides>(
    EMPTY_KEY_BINDING_OVERRIDES,
  );
  // The one-shot mount fetch below can resolve AFTER the player has already
  // rebind-changed the map through the overlay's mutation-adoption path — a stale
  // mount response must never clobber a just-adopted override. The adoption path
  // flags itself; the fetch's `.then` yields to it.
  const mutatedRef = useRef(false);
  const adoptOverrides = useCallback((next: KeyBindingOverrides) => {
    mutatedRef.current = true;
    setBindingOverrides(next);
  }, []);
  useEffect(() => {
    let alive = true;
    Effect.runPromise(Effect.option(getKeyBindingOverrides())).then((option) => {
      if (alive && !mutatedRef.current && option._tag === "Some") setBindingOverrides(option.value);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Publish the map so chrome-level controls that *display* a binding (the
  // career chrome's Continue badge) read the same effective value the spine
  // dispatches on, including a rebind adopted mid-session.
  useEffect(() => {
    publishBindingOverrides(bindingOverrides);
  }, [bindingOverrides]);

  // Effective views: the overrides layered over the registry's coded defaults.
  const effectiveActions = useMemo(
    () => withEffectiveBindings(ALL_ACTIONS, bindingOverrides),
    [bindingOverrides],
  );
  const activeActions = useMemo(
    () =>
      withEffectiveBindings(
        ACTION_REGISTRY.active(currentScreen as never, scopeState),
        bindingOverrides,
      ),
    [currentScreen, scopeState, bindingOverrides],
  );
  const effectiveCompletions = useMemo(
    () => gPrefixCompletionsOf(effectiveActions),
    [effectiveActions],
  );
  const effectiveGByKey = useMemo(() => gByKeyOf(effectiveActions), [effectiveActions]);
  const effectivePrefixEntries = useMemo(
    () => prefixIndicatorEntriesOf(effectiveActions),
    [effectiveActions],
  );

  // The `g <key>` prefix lifecycle. The state machine itself is `prefixReduce`
  // (pure, unit-tested); the spine only renders the outcome.
  const { prefix, setPrefix } = usePrefixState();

  const value: KeyboardStateValue = useMemo(
    () => ({
      bindingOverrides,
      adoptOverrides,
      prefix,
      setPrefix,
      effectiveActions,
      activeActions,
      effectiveCompletions,
      effectiveGByKey,
      effectivePrefixEntries,
    }),
    [
      bindingOverrides,
      adoptOverrides,
      prefix,
      setPrefix,
      effectiveActions,
      activeActions,
      effectiveCompletions,
      effectiveGByKey,
      effectivePrefixEntries,
    ],
  );

  return <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>;
};

export const useKeyboardState = (): KeyboardStateValue => {
  const ctx = useContext(KeyboardContext);
  if (ctx === null) throw new Error("useKeyboardState must be used within a KeyboardStateProvider");
  return ctx;
};