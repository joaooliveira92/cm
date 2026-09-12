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
import {
  NAV_SECTIONS,
  POSITION_KEYS,
  sectionKeyToEntry,
} from "../navigation/nav-config.js";
import { usePrefixState } from "./usePrefixState.js";

export interface KeyboardStateValue {
  readonly bindingOverrides: KeyBindingOverrides;
  readonly adoptOverrides: (next: KeyBindingOverrides) => void;
  readonly prefix: PrefixState;
  readonly setPrefix: (next: PrefixState) => void;
  readonly effectiveActions: ReadonlyArray<Action>;
  readonly activeActions: ReadonlyArray<Action>;
  readonly effectiveCompletions: ReadonlySet<string>;
  readonly effectiveGByKey: ReadonlyMap<string, Action>;
  readonly effectivePrefixEntries: ReadonlyArray<PrefixIndicatorEntry>;
  readonly level0Completions: ReadonlySet<string>;
  readonly level1Completions: ReadonlySet<string>;
  readonly level1PrefixEntries: ReadonlyArray<PrefixIndicatorEntry>;
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
  const [bindingOverrides, setBindingOverrides] = useState<KeyBindingOverrides>(
    EMPTY_KEY_BINDING_OVERRIDES,
  );
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

  useEffect(() => {
    publishBindingOverrides(bindingOverrides);
  }, [bindingOverrides]);

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

  const { prefix, setPrefix } = usePrefixState();

  // Level 0 completions: section keys (1-7) plus back (b). Filter by the
  // registry's actual g-bindings so rebinding "g 1" to something else removes
  // "1" from the valid set.
  const level0Completions = useMemo(
    () => new Set([...effectiveCompletions].filter((k) => k === "b" || /^[1-7]$/.test(k))),
    [effectiveCompletions],
  );

  // Level 1 completions: position keys (q/w/e/...) for the section currently
  // selected in deep prefix. Computed from NAV_SECTIONS so it stays in sync
  // with the nav config regardless of the registry.
  const level1Completions = useMemo(() => {
    if (prefix.kind !== "level1") return new Set<string>();
    const entry = sectionKeyToEntry.get(prefix.sectionKey);
    if (entry === undefined) return new Set<string>();
    const section = NAV_SECTIONS.find((s) => s.id === entry.sectionId);
    if (section === undefined) return new Set<string>();
    const keys = section.items.map((_, i) => POSITION_KEYS[i]).filter(Boolean) as string[];
    return new Set<string>(keys);
  }, [prefix]);

  // Prefix indicator entries for deep prefix: "SectionName: q [Item] · w [Item] · …"
  const level1PrefixEntries = useMemo(() => {
    if (prefix.kind !== "level1") return [];
    const entry = sectionKeyToEntry.get(prefix.sectionKey);
    if (entry === undefined) return [];
    const section = NAV_SECTIONS.find((s) => s.id === entry.sectionId);
    if (section === undefined) return [];
    return section.items
      .map((item, i) => ({
        label: item.label,
        key: POSITION_KEYS[i]?.toUpperCase() ?? "",
      }))
      .filter((e) => e.key !== "");
  }, [prefix]);

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
      level0Completions,
      level1Completions,
      level1PrefixEntries,
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
      level0Completions,
      level1Completions,
      level1PrefixEntries,
    ],
  );

  return <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>;
};

export const useKeyboardState = (): KeyboardStateValue => {
  const ctx = useContext(KeyboardContext);
  if (ctx === null) throw new Error("useKeyboardState must be used within a KeyboardStateProvider");
  return ctx;
};