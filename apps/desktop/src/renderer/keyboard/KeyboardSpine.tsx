import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLocation, useParams } from "@tanstack/react-router";
import { type SaveId } from "@cm-clone/contracts";
import { navigateBack, navigateCareer } from "../navigation/adapter.js";
import { type SaveScopedCareerDestinationType } from "../navigation/destinations.js";
import { decodeSaveId } from "../navigation/params.js";
import { isInsideCareer } from "../actions/registry.js";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { getScopeState, subscribeScopeState } from "../actions/scopeState.js";
import { type ScopeState } from "../actions/types.js";
import { useSeamEveryKeyPress } from "../hotkeys.js";
import { resolveDispatch, IDLE_PREFIX } from "../keymap/priority.js";
import { controlOwnsSpace, keyOf, shouldSuppressForTextEntry } from "../keymap/keystroke.js";
import { CommandPalette } from "../discoverability/CommandPalette.js";
import { HelpOverlay } from "../discoverability/HelpOverlay.js";
import { TeachingSplash } from "../discoverability/TeachingSplash.js";
import { OverlayProvider, useOverlay } from "./OverlayProvider.js";
import { KeyboardStateProvider, useKeyboardState } from "./KeyboardStateProvider.js";
import { screenIdOfPath } from "./screenId.js";
import { PrefixIndicator } from "./PrefixIndicator.js";

// Re-exported for backward compat (spine-live tests import these from this module).
export { PrefixIndicator, type PrefixIndicatorEntry, PREFIX_INDICATOR_ENTRIES } from "./PrefixIndicator.js";

/**
 * The keyboard spine — global keyboard handling and overlay orchestration.
 * Mounted at the renderer root alongside `<Outlet />`.
 */
export const KeyboardSpine = () => {
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const decoded = decodeSaveId(params.saveId ?? "");

  const currentScreen = screenIdOfPath(pathname);
  const saveId: SaveId | undefined = decoded._tag === "Success" ? decoded.success : undefined;
  const isCareer = isInsideCareer(currentScreen as never);
  const nav = isCareer && saveId !== undefined;

  const liveScopeState = useSyncExternalStore(subscribeScopeState, getScopeState);
  const scopeState: ScopeState = useMemo(
    () => ({ ...liveScopeState, ready: isCareer }),
    [isCareer, liveScopeState],
  );

  return (
    <OverlayProvider isCareer={isCareer} matchPanelOpen={scopeState.matchPanelOpen === true} currentScreen={currentScreen}>
      <KeyboardStateProvider currentScreen={currentScreen} scopeState={scopeState}>
        <SpineOrchestrator nav={nav} saveId={saveId} currentScreen={currentScreen} scopeState={scopeState} />
      </KeyboardStateProvider>
    </OverlayProvider>
  );
};

/**
 * The spine's inner orchestration: action registration, the live keystroke
 * handler, and the JSX tree. Consumes overlay + keyboard state from providers.
 */
const SpineOrchestrator = ({
  currentScreen,
  nav,
  saveId,
  scopeState,
}: {
  readonly currentScreen: string;
  readonly nav: boolean;
  readonly saveId: SaveId | undefined;
  readonly scopeState: ScopeState;
}) => {
  const { topLayer, closeOverlay, dismissSplash, splashActive, layer, openOverlay } = useOverlay();
  const {
    bindingOverrides,
    adoptOverrides,
    prefix,
    setPrefix,
    activeActions,
    effectiveCompletions,
    effectiveGByKey,
    effectivePrefixEntries,
  } = useKeyboardState();

  // Register app-global + career-global live handlers (the overlay opens and
  // career navigation). The Continue (Space) handler is owned by the League
  // screen, which mounts `advanceCalendar` under its safety guard.
  useEffect(() => {
    const unregisters: Array<() => void> = [];
    unregisters.push(registerActionHandler("open-palette", () => openOverlay("palette")));
    unregisters.push(registerActionHandler("open-help", () => openOverlay("help")));
    // "Rebind…" is the palette's discovery path to the rebinding surface: it
    // opens the same help overlay (which is where rebinding lives).
    unregisters.push(registerActionHandler("open-rebind", () => openOverlay("help")));

    if (nav && saveId !== undefined) {
      const target: Record<SaveScopedCareerDestinationType, () => void> = {
        squad: () => navigateCareer({ type: "squad", saveId }, "keyboard"),
        tactics: () => navigateCareer({ type: "tactics", saveId }, "keyboard"),
        tacticsEditor: () => navigateCareer({ type: "tacticsEditor", saveId }, "keyboard"),
        transfers: () => navigateCareer({ type: "transfers", saveId }, "keyboard"),
        league: () => navigateCareer({ type: "league", saveId }, "keyboard"),
        fixtures: () => navigateCareer({ type: "fixtures", saveId }, "keyboard"),
        match: () => navigateCareer({ type: "match", saveId }, "keyboard"),
        seasonSummary: () => navigateCareer({ type: "seasonSummary", saveId }, "keyboard"),
        manager: () => navigateCareer({ type: "manager", saveId }, "keyboard"),
        news: () => navigateCareer({ type: "news", saveId }, "keyboard"),
      };
      for (const [id, type] of Object.entries({
        "go-to-squad": "squad",
        "go-to-tactics": "tactics",
        "go-to-transfers": "transfers",
        "go-to-league": "league",
        "go-to-fixtures": "fixtures",
        "go-to-match": "match",
        "go-to-season-summary": "seasonSummary",
        "go-to-manager": "manager",
      }) as ReadonlyArray<[string, SaveScopedCareerDestinationType]>) {
        unregisters.push(registerActionHandler(id, target[type]));
      }
      unregisters.push(registerActionHandler("go-back", () => navigateBack()));
    }

    return () => { for (const unregister of unregisters) unregister(); };
  }, [nav, saveId, currentScreen, openOverlay]);

  // ONE keystroke input: normalize, suppress-if-typing, resolve, apply.
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const keystroke = keyOf(event);
      const typing = shouldSuppressForTextEntry(event.target, keystroke);
      const nativeActivation = controlOwnsSpace(event.target, keystroke);
      const now = performance.now();
      const decision = resolveDispatch({
        keystroke,
        typing,
        nativeActivation,
        prefix,
        now,
        actions: activeActions,
        prefixCompletions: effectiveCompletions,
        overlay: topLayer,
      });
      switch (decision.kind) {
        case "native":
        case "none":
          return;
        case "start-prefix":
          setPrefix({ active: true, startedAt: now });
          event.preventDefault();
          return;
        case "cancel-prefix":
          setPrefix(IDLE_PREFIX);
          event.preventDefault();
          return;
        case "complete-prefix": {
          const g = effectiveGByKey.get(decision.completion);
          if (g !== undefined) dispatchAction(g.id);
          setPrefix(IDLE_PREFIX);
          event.preventDefault();
          return;
        }
        case "action":
          if (decision.action.available(scopeState)) dispatchAction(decision.action.id);
          event.preventDefault();
          return;
      }
    },
    [prefix, activeActions, scopeState, topLayer, effectiveCompletions, effectiveGByKey],
  );

  useSeamEveryKeyPress(onKeyDown, [onKeyDown]);

  return (
    <>
      {prefix.active && !splashActive && layer === "none" && (
        <PrefixIndicator entries={effectivePrefixEntries} />
      )}
      {layer === "palette" && (
        <CommandPalette
          screen={currentScreen as never}
          state={scopeState}
          overrides={bindingOverrides}
          onClose={closeOverlay}
        />
      )}
      {layer === "help" && (
        <HelpOverlay
          screen={currentScreen as never}
          state={scopeState}
          overrides={bindingOverrides}
          onOverridesChange={adoptOverrides}
          onClose={closeOverlay}
        />
      )}
      {splashActive && layer === "none" && <TeachingSplash onDismiss={dismissSplash} />}
    </>
  );
};