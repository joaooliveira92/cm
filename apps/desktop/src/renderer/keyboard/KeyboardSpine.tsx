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
import { NAV_SECTIONS, POSITION_KEYS, sectionKeyToEntry } from "../navigation/nav-config.js";

export { PrefixIndicator, type PrefixIndicatorEntry, PREFIX_INDICATOR_ENTRIES } from "./PrefixIndicator.js";

const resolveItemDestination = (
  sectionKey: string,
  positionKey: string,
): SaveScopedCareerDestinationType | null => {
  const entry = sectionKeyToEntry.get(sectionKey);
  if (entry === undefined) return null;
  const section = NAV_SECTIONS.find((s) => s.id === entry.sectionId);
  if (section === undefined) return null;
  const idx = (POSITION_KEYS as readonly string[]).indexOf(positionKey);
  if (idx < 0 || idx >= section.items.length) return null;
  return section.items[idx]!.destination;
};

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
    effectiveGByKey,
    effectivePrefixEntries,
    level0Completions,
    level1Completions,
    level1PrefixEntries,
  } = useKeyboardState();

  useEffect(() => {
    const unregisters: Array<() => void> = [];
    unregisters.push(registerActionHandler("open-palette", () => openOverlay("palette")));
    unregisters.push(registerActionHandler("open-help", () => openOverlay("help")));
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
        "go-to-training": "squad",
        "go-to-recruitment": "transfers",
        "go-to-analysis": "league",
        "go-to-news": "news",
        "go-to-club": "manager",
      }) as ReadonlyArray<[string, SaveScopedCareerDestinationType]>) {
        unregisters.push(registerActionHandler(id, target[type]));
      }
      unregisters.push(registerActionHandler("go-back", () => navigateBack()));
    }

    return () => { for (const unregister of unregisters) unregister(); };
  }, [nav, saveId, currentScreen, openOverlay]);

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
        level0Completions,
        level1Completions,
        overlay: topLayer,
      });
      switch (decision.kind) {
        case "native":
        case "none":
          return;
        case "start-prefix":
          setPrefix({ kind: "level0", startedAt: now });
          event.preventDefault();
          return;
        case "cancel-prefix":
          setPrefix(IDLE_PREFIX);
          event.preventDefault();
          return;
        case "complete-prefix": {
          const completion = decision.completion;
          if (prefix.kind === "level0") {
            if (completion === "b") {
              dispatchAction("go-back");
              setPrefix(IDLE_PREFIX);
            } else {
              const g = effectiveGByKey.get(completion);
              if (g !== undefined) dispatchAction(g.id);
              setPrefix({ kind: "level1", startedAt: now, sectionKey: completion });
            }
          } else if (prefix.kind === "level1") {
            const destination = resolveItemDestination(prefix.sectionKey, completion);
            if (destination !== null && saveId !== undefined) {
              navigateCareer({ type: destination, saveId }, "keyboard");
            }
            setPrefix(IDLE_PREFIX);
          }
          event.preventDefault();
          return;
        }
        case "action":
          if (decision.action.available(scopeState)) dispatchAction(decision.action.id);
          event.preventDefault();
          return;
      }
    },
    [prefix, activeActions, scopeState, topLayer, level0Completions, level1Completions, effectiveGByKey, saveId],
  );

  useSeamEveryKeyPress(onKeyDown, [onKeyDown]);

  return (
    <>
      {prefix.kind !== "idle" && !splashActive && layer === "none" && (
        <PrefixIndicator entries={prefix.kind === "level1" ? level1PrefixEntries : effectivePrefixEntries} />
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