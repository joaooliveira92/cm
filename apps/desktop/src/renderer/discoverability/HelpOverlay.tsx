/**
 * The keyboard-help overlay (command-palette note, AC-09/10/24) — and, since ticket 14
 * (Stage 6), the rebinding surface. Opened with `Primary+/` (or the palette's "Rebind…"
 * command); lists every registered Action with its *effective* binding under All, Global, or
 * This-screen tabs. Rows are derived from the live Action registry for the current scope union —
 * never a hand-maintained list — and each availability-afforded entry carries a check indicator
 * (a snapshot at open time; the binding table is always accurate).
 *
 * Rebinding is editing this surface in place (AC-36): every row offers a "Rebind" button that
 * captures the next keystroke, validates it (locked keys, collisions naming the conflicting
 * Action, unexpressible shapes — `actions/overrides.ts` is the single enforcement point), and
 * persists it through the typed RPC seam. The coded default is always visible beneath an
 * override, and per-Action reset plus reset-all restore it — so a mistaken rebind is trivially
 * reversible and never needs an undo stack. The mutable override map is spine-owned; the overlay
 * only reports changes through `onOverridesChange`.
 *
 * The one-shot key capture is the app's only "press any key" listener, so it attaches directly in
 * capture phase rather than through the binding seam: it is not a binding registration, it must
 * win over every seam-registered hotkey for exactly one keystroke, and it tears down immediately.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Effect } from "effect";
import type { Action, ScreenName, ScopeState } from "../actions/types.js";
import { ALL_ACTIONS } from "../actions/allActions.js";
import { actionsInTiers } from "../actions/registry.js";
import {
  bindingFromKeystroke,
  effectiveBinding,
  validateOverride,
  withEffectiveBindings,
  type KeyBindingOverrides,
  type OverrideRejection,
} from "../actions/overrides.js";
import { FOCUS_RING } from "../focus.js";
import { useSeamHotkeys, useSeamHotkeysContext } from "../hotkeys.js";
import { keyOf } from "../keymap/keystroke.js";
import {
  describeRpcError,
  resetAllKeyBindings,
  resetKeyBinding,
  setKeyBindingOverride,
  type RpcClientError,
} from "../rpc.js";

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

/** A rebind outcome rendered in the overlay's status region. */
type RebindStatus =
  | { readonly _tag: "idle" }
  | { readonly _tag: "error"; readonly message: string }
  | { readonly _tag: "saved"; readonly message: string };

const rejectionMessage = (rejection: OverrideRejection): string => rejection.message;

/** Render a seam failure (a main-side guard or transport issue) as a rebind status message. The
 *  description function already pattern-matches every `RpcClientError` branch. */
const errorMessage = (error: RpcClientError<"setKeyBindingOverride">): string =>
  describeRpcError(error);

export const HelpOverlay = ({
  screen,
  state,
  overrides,
  onOverridesChange,
  onClose,
}: {
  readonly screen: ScreenName;
  readonly state: ScopeState;
  /** The current override map, owned by the spine; the overlay reports changes back. */
  readonly overrides: KeyBindingOverrides;
  readonly onOverridesChange: (next: KeyBindingOverrides) => void;
  readonly onClose: () => void;
}) => {
  const [tab, setTab] = useState<HelpTabMode>("all");
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [capturing, setCapturing] = useState<string | null>(null);
  const [status, setStatus] = useState<RebindStatus>({ _tag: "idle" });
  const captureHintRef = useRef<HTMLSpanElement | null>(null);
  const seam = useSeamHotkeysContext();

  // Every row is the live registry snapshot for the current scope union, with overrides layered
  // over the coded defaults — the same projection the spine's resolver and the palette consume.
  const rows: ReadonlyArray<Action> = useMemo(
    () => withEffectiveBindings(actionsInTiers(ALL_ACTIONS, screen), overrides),
    [screen, overrides],
  );
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

  // The one-shot "press a key" capture. While a row is capturing, a capture-phase window listener
  // owns exactly the next keystroke: Escape cancels, an unboundable key is rejected with a
  // reason, and a valid key is validated and persisted. `overrides` is stable while capturing
  // (the seam only changes it through `onOverridesChange`, which exits capture first).
  useEffect(() => {
    if (capturing === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setCapturing(null);
        setStatus({ _tag: "idle" });
        return;
      }
      const keystroke = keyOf(event);
      const binding = bindingFromKeystroke(keystroke);
      const actionId = capturing;
      if (binding === null) {
        setCapturing(null);
        setStatus({
          _tag: "error",
          message: `"${event.key}" cannot be bound. Press a letter or digit key, Space, or a Cmd/Ctrl+key chord.`,
        });
        return;
      }
      const rejection = validateOverride(ALL_ACTIONS, overrides, actionId, binding);
      if (rejection !== null) {
        setCapturing(null);
        setStatus({ _tag: "error", message: rejectionMessage(rejection) });
        return;
      }
      Effect.runPromise(Effect.result(setKeyBindingOverride(actionId, binding))).then((result) => {
        if (result._tag === "Success") {
          setStatus({
            _tag: "saved",
            message: `${visibleLabel(actionId)} is now bound to ${binding}.`,
          });
          onOverridesChange(result.success);
        } else {
          setStatus({ _tag: "error", message: errorMessage(result.failure) });
        }
        setCapturing(null);
      });
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [capturing, overrides, onOverridesChange]);

  const beginRebind = useCallback(
    (actionId: string) => {
      setStatus({ _tag: "idle" });
      setCapturing(actionId);
      // Focus the capture hint so the next keystroke lands where the player is looking.
      requestAnimationFrame(() => captureHintRef.current?.focus());
    },
    [],
  );

  const doReset = useCallback(
    (actionId: string) => {
      Effect.runPromise(Effect.result(resetKeyBinding(actionId))).then((result) => {
        if (result._tag === "Success") {
          setStatus({ _tag: "saved", message: `${visibleLabel(actionId)} is back to its default.` });
          onOverridesChange(result.success);
        } else {
          setStatus({ _tag: "error", message: describeRpcError(result.failure) });
        }
      });
    },
    [onOverridesChange],
  );

  const doResetAll = useCallback(() => {
    Effect.runPromise(Effect.result(resetAllKeyBindings())).then((result) => {
      if (result._tag === "Success") {
        setStatus({ _tag: "saved", message: "All bindings are back to their defaults." });
        onOverridesChange(result.success);
      } else {
        setStatus({ _tag: "error", message: describeRpcError(result.failure) });
      }
    });
  }, [onOverridesChange]);

  const visibleLabel = (actionId: string): string => {
    const action = ALL_ACTIONS.find((candidate) => candidate.id === actionId);
    return action?.label ?? actionId;
  };

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
        className="flex max-h-[70vh] w-[38rem] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
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
            const binding = effectiveBinding(action, overrides);
            const overridden = overrides[action.id] !== undefined;
            const isCapturing = capturing === action.id;
            return (
              <div
                key={action.id}
                data-action-id={action.id}
                className="flex items-center justify-between gap-3 border-b border-slate-800/60 py-1.5 text-sm"
              >
                <span className={available ? "text-slate-200" : "text-slate-500"}>{action.label}</span>
                {isCapturing ? (
                  <span
                    ref={captureHintRef}
                    tabIndex={-1}
                    role="status"
                    className="rounded border border-amber-400/60 bg-slate-800 px-2 py-0.5 font-mono text-xs text-amber-300"
                  >
                    Press a key… (Escape cancels)
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-2">
                    {available && (
                      <span aria-label="available" className="text-xs text-emerald-400">
                        ✓
                      </span>
                    )}
                    {binding !== undefined && (
                      <kbd
                        aria-label={overridden ? `Binding ${binding}, rebound` : `Binding ${binding}`}
                        className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                          overridden ? "bg-amber-400/20 text-amber-300" : "bg-slate-800 text-sky-300"
                        }`}
                      >
                        {binding}
                        {overridden ? " *" : ""}
                      </kbd>
                    )}
                    <button
                      type="button"
                      aria-label={`Rebind ${action.label}`}
                      className={`rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300 hover:text-slate-100 ${FOCUS_RING.join(" ")}`}
                      onClick={() => beginRebind(action.id)}
                    >
                      Rebind
                    </button>
                    {overridden && (
                      <button
                        type="button"
                        aria-label={`Reset ${action.label} binding`}
                        className={`rounded border border-slate-700 px-1.5 py-0.5 text-xs text-slate-300 hover:text-slate-100 ${FOCUS_RING.join(" ")}`}
                        onClick={() => doReset(action.id)}
                      >
                        Reset
                      </button>
                    )}
                  </span>
                )}
              </div>
            );
          })}
          {visibleRows.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-600">Nothing in this scope.</p>
          )}
        </div>
        <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500">
          {status._tag === "error" && (
            <p role="alert" className="mb-2 text-red-400">
              {status.message}
            </p>
          )}
          {status._tag === "saved" && (
            <p className="mb-2 text-emerald-400">{status.message}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono">{escapeKey}</kbd> closes
              · Arrow keys switch tabs · Rebind captures the next key
            </span>
            <button
              type="button"
              aria-label="Reset all bindings"
              className={`rounded border border-red-900/60 px-2 py-0.5 text-xs text-red-400 hover:text-red-300 ${FOCUS_RING.join(" ")}`}
              onClick={doResetAll}
            >
              Reset all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};