/**
 * The keyboard-help overlay (command-palette note, AC-09/10/24). Opened with
 * `Primary+/`; lists every registered Action with its binding under All,
 * Global, or This-screen tabs. Rows are derived from the live Action registry
 * for the current scope union — never a hand-maintained list — and each
 * availability-afforded entry carries a check indicator (a snapshot at open
 * time; the binding table is always accurate).
 *
 * Escape closes; ArrowLeft/ArrowRight switch tabs and the tabs are native
 * buttons, so Tab reaches them too. The overlay's own close affordance is read
 * back from the binding seam's live registration (`useSeamHotkeysContext`),
 * so even the meta line derives from what is actually bound.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Action, ScreenName, ScopeState } from "../actions/types.js";
import { ALL_ACTIONS } from "../actions/allActions.js";
import { actionsInTiers } from "../actions/registry.js";
import { FOCUS_RING } from "../focus.js";
import { useSeamHotkeys, useSeamHotkeysContext } from "../hotkeys.js";

export type HelpTabMode = "all" | "global" | "current";

const TABS: ReadonlyArray<{ readonly mode: HelpTabMode; readonly label: string }> = [
  { mode: "all", label: "All" },
  { mode: "global", label: "Global" },
  { mode: "current", label: "This screen" },
];

const TAB_ORDER: ReadonlyArray<HelpTabMode> = ["all", "global", "current"];

const matchesTab = (action: Action, mode: HelpTabMode): boolean => {
  if (mode === "all") return true;
  if (mode === "global") return action.scope === "app-global" || action.scope === "career-global";
  return action.scope !== "app-global" && action.scope !== "career-global";
};

export const HelpOverlay = ({
  screen,
  state,
  onClose,
}: {
  readonly screen: ScreenName;
  readonly state: ScopeState;
  readonly onClose: () => void;
}) => {
  const [tab, setTab] = useState<HelpTabMode>("all");
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const seam = useSeamHotkeysContext();

  // Every row is the live registry snapshot for the current scope union.
  const rows: ReadonlyArray<Action> = useMemo(() => actionsInTiers(ALL_ACTIONS, screen), [screen]);
  const visibleRows = useMemo(() => rows.filter((action) => matchesTab(action, tab)), [rows, tab]);

  const cycleTab = useCallback((direction: 1 | -1) => {
    setTab((prev) => {
      const index = TAB_ORDER.indexOf(prev);
      return TAB_ORDER[(index + direction + TAB_ORDER.length) % TAB_ORDER.length]!;
    });
  }, []);

  useSeamHotkeys(
    "Escape",
    (event) => {
      event.preventDefault();
      onClose();
    },
    undefined,
    [onClose],
  );
  useSeamHotkeys(
    "ArrowLeft",
    (event) => {
      event.preventDefault();
      cycleTab(-1);
    },
    undefined,
    [cycleTab],
  );
  useSeamHotkeys(
    "ArrowRight",
    (event) => {
      event.preventDefault();
      cycleTab(1);
    },
    undefined,
    [cycleTab],
  );

  const activeTabIndex = TAB_ORDER.indexOf(tab);

  // Give the overlay focus on open (the active tab carries it — roving).
  useEffect(() => {
    tabsRef.current[activeTabIndex]?.focus();
  }, [activeTabIndex]);

  // The close affordance reads the seam's live registration (the seam lowercases
  // its hotkey strings, so present them capitalised; absent registration falls
  // back to the still-correct default).
  const seamEscape = seam.hotkeys.find((hotkey) => hotkey.hotkey.toLowerCase() === "escape")?.hotkey;
  const escapeKey =
    seamEscape === undefined
      ? "Escape"
      : seamEscape.charAt(0).toUpperCase() + seamEscape.slice(1);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="flex max-h-[70vh] w-[36rem] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
      >
        <div className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-100">
          Keyboard shortcuts
        </div>
        <div role="tablist" aria-label="Shortcut scope" className="flex border-b border-slate-800">
          {TABS.map((t, index) => (
            <button
              key={t.mode}
              ref={(element) => {
                tabsRef.current[index] = element;
              }}
              type="button"
              role="tab"
              aria-selected={t.mode === tab}
              className={`border-b-2 px-4 py-2 text-sm ${
                t.mode === tab
                  ? "border-amber-400 text-slate-100"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              } ${FOCUS_RING.join(" ")}`}
              onClick={() => setTab(t.mode)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="flex-1 overflow-y-auto px-4 py-3">
          {visibleRows.map((action) => {
            const available = action.available(state);
            return (
              <div
                key={action.id}
                data-action-id={action.id}
                className="flex items-center justify-between gap-3 border-b border-slate-800/60 py-1.5 text-sm"
              >
                <span className={available ? "text-slate-200" : "text-slate-500"}>{action.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {available && (
                    <span aria-label="available" className="text-xs text-emerald-400">
                      ✓
                    </span>
                  )}
                  {action.binding !== undefined && (
                    <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-sky-300">
                      {action.binding}
                    </kbd>
                  )}
                </span>
              </div>
            );
          })}
          {visibleRows.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-600">Nothing in this scope.</p>
          )}
        </div>
        <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
          <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono">{escapeKey}</kbd> closes ·
          Arrow keys switch tabs
        </div>
      </div>
    </div>
  );
};