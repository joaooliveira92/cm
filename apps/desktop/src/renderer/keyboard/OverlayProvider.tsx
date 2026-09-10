/**
 * The transient overlay stack (discoverability Stage 4): manages which overlay
 * (palette, help, teaching splash) is open, its z-order, and focus bookkeeping.
 * Lifted from `KeyboardSpine.tsx` so overlay components can consume the context
 * directly instead of threading props through the spine.
 *
 * Every transient overlay (AC-20) has a layer; Escape closes only the topmost
 * one. `panel` (match-day control panel) is a soft overlay — it suppresses
 * bare keys beneath it but lets Primary shortcuts through (AC-33).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearScopeState,
  setScopeState,
} from "../actions/scopeState.js";
import {
  focusSemanticTarget,
  rememberFocusForOverlay,
  restoreFocusAfterOverlay,
} from "../focus.js";
import { type OverlayLayer } from "../keymap/priority.js";
import {
  useTeachingSplashVisibility,
} from "../discoverability/TeachingSplash.js";

export interface OverlayValue {
  /** The explicit, player-activated layer (palette/help). */
  readonly layer: OverlayLayer;
  /** The resolved topmost layer (splash over palette over panel over none). */
  readonly topLayer: OverlayLayer;
  /** True while the first-run teaching splash is visible (career-screen first load). */
  readonly splashActive: boolean;
  /** Open an explicit overlay layer (palette/help). Stores focus for restoration. */
  readonly openOverlay: (layer: "palette" | "help") => void;
  /** Close the topmost overlay. Restores focus to the element active before open. */
  readonly closeOverlay: () => void;
  /** Dismiss the teaching splash. Hands focus back to the career screen. */
  readonly dismissSplash: () => void;
}

export const OverlayContext = createContext<OverlayValue | null>(null);

export const OverlayProvider = ({
  isCareer,
  matchPanelOpen,
  currentScreen,
  children,
}: {
  readonly isCareer: boolean;
  readonly matchPanelOpen: boolean;
  readonly currentScreen: string;
  readonly children: ReactNode;
}) => {
  const [layer, setLayer] = useState<OverlayLayer>("none");
  const splash = useTeachingSplashVisibility();
  const splashActive = isCareer && splash.visible;
  const panelOpen = matchPanelOpen === true;
  const topLayer: OverlayLayer = useMemo(
    () =>
      splashActive ? "splash" : layer !== "none" ? layer : panelOpen ? "panel" : "none",
    [splashActive, layer, panelOpen],
  );

  // Publish the spine's own (non-panel) top layer so the match control panel
  // can tell when IT is the topmost transient: while a palette/help/splash is
  // open over an open panel, the panel's Escape must not fire (Escape closes
  // only the topmost layer — AC-20). Cleaned on spine unmount.
  useEffect(() => {
    setScopeState({ spineOverlayLayer: splashActive ? "splash" : layer });
    return () => clearScopeState("spineOverlayLayer");
  }, [layer, splashActive]);

  const openOverlay = useCallback((next: "palette" | "help") => {
    rememberFocusForOverlay();
    setLayer(next);
  }, []);

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

  const value: OverlayValue = useMemo(
    () => ({
      layer,
      topLayer,
      splashActive,
      openOverlay,
      closeOverlay,
      dismissSplash,
    }),
    [layer, topLayer, splashActive, openOverlay, closeOverlay, dismissSplash],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
};

export const useOverlay = (): OverlayValue => {
  const ctx = useContext(OverlayContext);
  if (ctx === null) throw new Error("useOverlay must be used within an OverlayProvider");
  return ctx;
};