import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocation, useParams } from "@tanstack/react-router";
import { type SaveId } from "@cm-clone/contracts";
import { navigateBack, navigateCareer } from "./navigation/adapter.js";
import { type CareerDestination } from "./navigation/destinations.js";
import { decodeSaveId } from "./navigation/params.js";
import { ACTION_REGISTRY, ALL_ACTIONS, G_PREFIX_COMPLETIONS } from "./actions/allActions.js";
import { isCareerScreen } from "./actions/registry.js";
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { clearScopeState, getScopeState, setScopeState, subscribeScopeState } from "./actions/scopeState.js";
import { type Action, type ScopeState } from "./actions/types.js";
import { useSeamEveryKeyPress } from "./hotkeys.js";
import {
  resolveDispatch,
  IDLE_PREFIX,
  type OverlayLayer,
} from "./keymap/priority.js";
import { keyOf, shouldSuppressForTextEntry } from "./keymap/keystroke.js";
import { type PrefixState } from "./keymap/prefix.js";
import { prefixTimeoutMs } from "./keymap/timeout.js";
import {
  focusSemanticTarget,
  rememberFocusForOverlay,
  restoreFocusAfterOverlay,
} from "./focus.js";
import { CommandPalette } from "./discoverability/CommandPalette.js";
import { HelpOverlay } from "./discoverability/HelpOverlay.js";
import {
  TeachingSplash,
  useTeachingSplashVisibility,
} from "./discoverability/TeachingSplash.js";

/**
 * The keyboard spine (ticket 17, Stage 3 + Stage 4 discoverability). Mounted at
 * the renderer root, it (a) registers the app-global and career-global live
 * handlers (navigation, Continue, and the open-palette/open-help layer opens),
 * (b) installs ONE wildcard keydown binding through the react-hotkeys-hook
 * seam, and (c) owns the transient overlay stack.
 *
 * Every keystroke runs through the pure, unit-tested dispatch model in
 * `keymap/` — `resolveDispatch` (priority stack, AC-17/AC-20), `prefixReduce`
 * (the `g <key>` lifecycle, AC-18) and `shouldSuppressForTextEntry` (AC-19) are
 * the LIVE policy, not a parallel hand-written mirror. While a transient layer
 * (palette, help, or the first-run splash) is open it is the topmost layer
 * (dispatch priority 2): the spine's wildcard returns early so no binding
 * beneath it fires, and the layer's own modal keys (Escape/arrows/Enter/tabs)
 * are registered through the binding seam by the layer component.
 *
 * Opening a transient layer records no history entry: the layer is React state,
 * never a `router.navigate` or `history.back` step. Escape closes only the
 * topmost layer (AC-20) — an open palette/help/splash takes precedence over the
 * `g` prefix and every binding beneath it.
 */

const careerScreenOfId = (id: string): CareerDestination["type"] | null =>
  ["squad", "tactics", "transfers", "league", "fixtures", "match", "seasonSummary"].includes(id)
    ? (id as CareerDestination["type"])
    : null;

/** Given the route path, derive the current screen-id (scope). */
const screenIdOfPath = (pathname: string): string => {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] === "create") return `createStep${segs[1]?.replace("step-", "") ?? "1"}`;
  if (segs[0] === "career") return segs[2] ?? "";
  return "saveList";
};

/** The `g <key>` destination actions by completion key, from the registry. */
const G_BY_KEY: ReadonlyMap<string, Action> = new Map(
  ALL_ACTIONS.filter((a) => a.scope === "career-global" && a.binding?.startsWith("g ")).map(
    (a) => [a.binding!.slice(2).trim(), a],
  ),
);

/** One entry in the nonmodal prefix indicator. */
export interface PrefixIndicatorEntry {
  readonly label: string;
  readonly key: string;
}

/** "Go to: Squad [S] · Tactics [A] · …" — derived from the registry's g-actions. */
export const PREFIX_INDICATOR_ENTRIES: ReadonlyArray<PrefixIndicatorEntry> =
  ALL_ACTIONS.filter((a) => a.scope === "career-global" && a.binding?.startsWith("g "))
    .map((a) => ({
      label: a.label.replace(/^Go to /, ""),
      key: a.binding!.slice(2).trim().toUpperCase(),
    }))
    .sort((x, y) => x.key.localeCompare(y.key));

/** The visible nonmodal prefix feedback (AC-18): fixed below the nav bar,
 *  pointer-transparent so it never blocks interaction. */
export const PrefixIndicator = ({
  entries,
}: {
  readonly entries: ReadonlyArray<PrefixIndicatorEntry>;
}) => (
  <div
    role="status"
    aria-live="polite"
    className="pointer-events-none fixed top-14 left-2 z-50 rounded border border-amber-500/60 bg-slate-900/95 px-3 py-1.5 text-sm text-slate-200 shadow-lg"
  >
    <span className="font-semibold text-amber-300">Go to:</span>{" "}
    {entries.map((entry) => `${entry.label} [${entry.key}]`).join(" \u00b7 ")}
  </div>
);

export const KeyboardSpine = () => {
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const decoded = decodeSaveId(params.saveId ?? "");

  const currentScreen = screenIdOfPath(pathname);
  const career = careerScreenOfId(currentScreen);
  const saveId: SaveId | undefined = decoded._tag === "Success" ? decoded.success : undefined;
  const isCareer = isCareerScreen(currentScreen as never);
  const nav = career !== null && saveId !== undefined;

  // Screens publish their availability read-model (League: phase/advancing) into
  // the shared scope state; the spine merges it over its own readiness.
  const liveScopeState = useSyncExternalStore(subscribeScopeState, getScopeState);
  const scopeState: ScopeState = useMemo(
    () => ({ ...liveScopeState, ready: isCareer }),
    [isCareer, liveScopeState],
  );
  const activeActions = useMemo(
    () => ACTION_REGISTRY.active(currentScreen as never, scopeState),
    [currentScreen, scopeState],
  );

  // The transient overlay stack (AC-20). `splashActive` is the one-shot
  // teaching overlay's own visibility (first load of a career screen, never
  // re-shown); it is the topmost layer while visible. `matchPanelOpen` is
  // published by MatchControlPanel (match-day keyboard note, AC-33): while the
  // live control panel is open it is a soft overlay layer beneath any palette/
  // help/splash — bare keys are suppressed, Primary shortcuts stay live.
  const [layer, setLayer] = useState<OverlayLayer>("none");
  const splash = useTeachingSplashVisibility();
  const splashActive = isCareer && splash.visible;
  const panelOpen = scopeState.matchPanelOpen === true;
  const topLayer: OverlayLayer = splashActive ? "splash" : layer !== "none" ? layer : panelOpen ? "panel" : "none";

  // Publish the spine's own (non-panel) top layer so the match control panel
  // can tell when IT is the topmost transient: while a palette/help/splash is
  // open over an open panel, the panel's Escape must not fire (Escape closes
  // only the topmost layer — AC-20). Cleaned on spine unmount.
  useEffect(() => {
    setScopeState({ spineOverlayLayer: splashActive ? "splash" : layer });
    return () => clearScopeState("spineOverlayLayer");
  }, [layer, splashActive]);

  const closeOverlay = useCallback(() => {
    restoreFocusAfterOverlay();
    setLayer("none");
  }, []);

  const dismissSplash = useCallback(() => {
    splash.dismiss();
    // Never leave focus on `document.body`: hand back to the career screen's
    // main region after the teaching card unmounts.
    focusSemanticTarget({ screen: currentScreen });
  }, [currentScreen, splash]);

  // Register app-global + career-global live handlers (navigation plus the
  // palette/help layer opens). The Continue (Space) handler is owned by the
  // League screen, which mounts `advanceCalendar` under its safety guard.
  useEffect(() => {
    const unregisters: Array<() => void> = [];

    unregisters.push(
      registerActionHandler("open-palette", () => {
        rememberFocusForOverlay();
        setLayer("palette");
      }),
    );
    unregisters.push(
      registerActionHandler("open-help", () => {
        rememberFocusForOverlay();
        setLayer("help");
      }),
    );

    if (nav && saveId !== undefined) {
      const target: Record<CareerDestination["type"], () => void> = {
        squad: () => navigateCareer({ type: "squad", saveId }, "keyboard"),
        tactics: () => navigateCareer({ type: "tactics", saveId }, "keyboard"),
        transfers: () => navigateCareer({ type: "transfers", saveId }, "keyboard"),
        league: () => navigateCareer({ type: "league", saveId }, "keyboard"),
        fixtures: () => navigateCareer({ type: "fixtures", saveId }, "keyboard"),
        match: () => navigateCareer({ type: "match", saveId }, "keyboard"),
        seasonSummary: () => navigateCareer({ type: "seasonSummary", saveId }, "keyboard"),
      };
      for (const [id, type] of Object.entries({
        "go-to-squad": "squad",
        "go-to-tactics": "tactics",
        "go-to-transfers": "transfers",
        "go-to-league": "league",
        "go-to-fixtures": "fixtures",
        "go-to-match": "match",
        "go-to-season-summary": "seasonSummary",
      }) as ReadonlyArray<[string, CareerDestination["type"]]>) {
        unregisters.push(registerActionHandler(id, target[type]));
      }
      unregisters.push(registerActionHandler("go-back", () => navigateBack()));
    }

    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [nav, saveId, career]);

  // The live `g <key>` prefix lifecycle. The state machine itself is
  // `prefixReduce` (pure, unit-tested); the spine only renders the outcome.
  const [prefix, setPrefix] = useState<PrefixState>(IDLE_PREFIX);

  // ~800ms timeout auto-cancels an incomplete prefix with no further input.
  useEffect(() => {
    if (!prefix.active) return;
    const timer = setTimeout(() => setPrefix(IDLE_PREFIX), prefixTimeoutMs());
    return () => clearTimeout(timer);
  }, [prefix]);

  // ONE keystroke input: normalize, suppress-if-typing, resolve, apply.
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const keystroke = keyOf(event);
      const typing = shouldSuppressForTextEntry(event.target, keystroke);
      const now = performance.now();
      const decision = resolveDispatch({
        keystroke,
        typing,
        prefix,
        now,
        actions: activeActions,
        prefixCompletions: G_PREFIX_COMPLETIONS,
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
          const g = G_BY_KEY.get(decision.completion);
          if (g !== undefined) dispatchAction(g.id);
          setPrefix(IDLE_PREFIX);
          event.preventDefault();
          return;
        }
        case "action": {
          // Availability predicates are best-effort frontend optimisations, but
          // they are the LIVE contract: the dispatcher honours them, so a key
          // bound to an action that is not permitted right now does nothing.
          if (decision.action.available(scopeState)) dispatchAction(decision.action.id);
          event.preventDefault();
          return;
        }
      }
    },
    [prefix, activeActions, scopeState, topLayer],
  );

  useSeamEveryKeyPress(onKeyDown, [onKeyDown]);

  return (
    <>
      {prefix.active && !splashActive && layer === "none" && (
        <PrefixIndicator entries={PREFIX_INDICATOR_ENTRIES} />
      )}
      {layer === "palette" && (
        <CommandPalette
          screen={currentScreen as never}
          state={scopeState}
          onClose={closeOverlay}
        />
      )}
      {layer === "help" && (
        <HelpOverlay screen={currentScreen as never} state={scopeState} onClose={closeOverlay} />
      )}
      {splashActive && layer === "none" && <TeachingSplash onDismiss={dismissSplash} />}
    </>
  );
};