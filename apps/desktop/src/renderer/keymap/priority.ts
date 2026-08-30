import { type Action, type Keystroke } from "../actions/types.js";
import { prefixReduce, type PrefixState, IDLE_PREFIX } from "./prefix.js";
import { isBareLetterOrDigit } from "./keystroke.js";

/**
 * The dispatch-priority stack (global-key-map note: one keystroke, at most one
 * action). Pure and unit-tested (AC-17, AC-19, AC-20): the spine resolves a
 * keystroke to exactly one decision before any handoff to the binding seam.
 *
 *   1. native text/focused-control behaviour
 *   2. topmost overlay layer (Stage 4 palette/help/first-run splash; a
 *      "none" in `overlay` skips the stack entirely)
 *   3. active prefix completion / cancellation (`g <key>`)
 *   4. global modifier shortcuts (Primary+K, Primary+/)
 *   5. career-global (Space → Continue)
 *   6. current-screen bare actions
 *   7. otherwise no action
 */

/**
 * The transient layers the keyboard spine can own, and their z-order for
 *  Escape (AC-20): the topmost one closes first. `splash` is the one-shot
 *  teaching overlay; while it is up it owns every keystroke.
 *
 * `panel` is the match-day live control panel (match-day keyboard note, AC-33):
 * a *soft* layer — the commentary feed continues behind it, so it suppresses
 * bare keys beneath it (panel controls are keyboard-reachable only while the
 * panel is open) but Primary modifier shortcuts (Primary+K palette, Primary+/
 * help) stay live, matching the decision table. Escape while it is topmost is
 * owned by the panel itself through the binding seam. */
export type OverlayLayer = "none" | "palette" | "help" | "splash" | "panel";

export type DispatchDecision =
  | { readonly kind: "native" }
  | { readonly kind: "start-prefix" }
  | { readonly kind: "cancel-prefix" }
  | { readonly kind: "complete-prefix"; readonly completion: string }
  | { readonly kind: "action"; readonly action: Action }
  | { readonly kind: "none" };

export interface ResolveContext {
  readonly keystroke: Keystroke;
  /** True when the focus target is a text entry (bare keys suppressed — AC-19). */
  readonly typing: boolean;
  readonly prefix: PrefixState;
  readonly now: number;
  /** The currently active Action set (current scope + globals). */
  readonly actions: ReadonlyArray<Action>;
  /** The valid `g <key>` completion set (destination keys), when a career is shown. */
  readonly prefixCompletions: ReadonlySet<string>;
  /** The open transient overlay (dispatch priority 2). While one is open it
   *  owns the keystroke; bindings beneath it never fire (AC-20). Defaults to
   *  "none" so callers without an overlay layer keep the Stage 3 behaviour. */
  readonly overlay?: OverlayLayer;
}

/** Whether a normalized keystroke matches a coded `binding` string. */
export const bindingMatches = (binding: string | undefined, keystroke: Keystroke): boolean => {
  if (binding === undefined) return false;
  const b = binding.trim();
  const key = keystroke.key;
  if (b === "Space" || b === " ") return !keystroke.primary && !keystroke.ctrl && !keystroke.meta && key === " ";
  if (b === "Enter") return !keystroke.primary && key === "Enter";
  if (b === "Escape") return !keystroke.primary && key === "Escape";
  if (b.startsWith("Primary+")) {
    const char = b.slice("Primary+".length);
    return keystroke.primary && key.toLowerCase() === char.toLowerCase();
  }
  if (b.includes(" ")) {
    // `g <key>` sequences are handled by the prefix machine, never here.
    return false;
  }
  // Bare key (lowercase letter). Only a truly bare keystroke matches.
  return isBareLetterOrDigit(keystroke) && key.toLowerCase() === b.toLowerCase();
};

const findActionWithBinding = (
  actions: ReadonlyArray<Action>,
  keystroke: Keystroke,
  scope?: string,
): Action | undefined =>
  actions.find((action) => {
    if (scope !== undefined && action.scope !== scope) return false;
    return bindingMatches(action.binding, keystroke);
  });

/** Is this keystroke the bare `g` that begins the prefix? */
const isPrefixG = (keystroke: Keystroke, actions: ReadonlyArray<Action>): boolean =>
  !keystroke.primary &&
  !keystroke.ctrl &&
  !keystroke.meta &&
  keystroke.key.toLowerCase() === "g" &&
  !actions.some((a) => a.binding === "g" && a.scope !== "app-global");

/**
 * Resolve one keystroke against the dispatch priority stack. The implication
 * "one keystroke executes at most one action" (AC-17) is an invariant of this
 * function: each branch returns before considering a lower priority.
 */
export const resolveDispatch = (ctx: ResolveContext): DispatchDecision => {
  const { keystroke, typing, prefix, now, actions, prefixCompletions, overlay } = ctx;

  // Priority 2 — topmost overlay layer. An open palette/help/splash takes
  // precedence over every binding beneath it: the overlay's own components
  // register their keys through the seam (useSeamHotkeys), and the spine's
  // wildcard only ever lets type-to-filter keystrokes through to the overlay's
  // own text field. Nothing else beneath an overlay fires. `overlay` is checked
  // before priority 1's typing carve-out so a Primary-shortcut cannot reopen a
  // lower layer while an overlay owns the keyboard.
  const top = overlay ?? "none";
  if (top === "panel") {
    // Match-day control panel — a soft overlay (AC-33): the feed runs on, so
    // `Primary+K`/`Primary+/` stay live (the match-day decision table shows the
    // palette opening in all three panel states) but every bare key beneath —
    // the `g` prefix, career-global `Space`, and screen-scoped keys — is the
    // panel's to interpret, never a registered binding below it. The panel's
    // own modal keys (Escape/Enter/B) are registered through the seam by
    // `MatchControlPanel`.
    if (typing) return { kind: "native" };
    if (keystroke.primary) {
      const hit = findActionWithBinding(actions, keystroke, "app-global");
      return hit ? { kind: "action", action: hit } : { kind: "none" };
    }
    return { kind: "none" };
  }
  if (top !== "none") {
    return { kind: typing ? "native" : "none" };
  }

  // Priority 1 — native text/focused-control. While typing, bare keys and Space
  // belong to the text field; only Primary-shortcuts and navigational keys escape.
  if (typing) {
    if (keystroke.primary) {
      const hit = findActionWithBinding(actions, keystroke, "app-global");
      return hit ? { kind: "action", action: hit } : { kind: "native" };
    }
    return { kind: "native" };
  }

  // Priority 3 — active prefix completion/cancellation.
  if (prefix.active) {
    const step = prefixReduce(prefix, { kind: "key", key: keystroke.key, now }, prefixCompletions);
    if (step.outcome.kind === "complete") {
      return { kind: "complete-prefix", completion: step.outcome.completion! };
    }
    if (step.outcome.kind === "cancel") {
      return { kind: "cancel-prefix" };
    }
    // Still pending (e.g. a modifier) — wait for the completion key.
    return { kind: "none" };
  }

  // Prefix initiation: a bare `g` starts the sequence. It must not also fire a
  // screen `g` action (none is registered by design).
  if (isPrefixG(keystroke, actions)) {
    return { kind: "start-prefix" };
  }

  // Priority 4 — global modifier shortcuts (Primary+K, Primary+/).
  if (keystroke.primary) {
    const hit = findActionWithBinding(actions, keystroke, "app-global");
    return hit ? { kind: "action", action: hit } : { kind: "none" };
  }

  // Priority 5 — career-global bare action (Space → Continue).
  const careerHit = findActionWithBinding(actions, keystroke, "career-global");
  if (careerHit) return { kind: "action", action: careerHit };

  // Priority 6 — current-screen bare actions.
  const screenHit = actions.find(
    (action) => action.scope !== "app-global" && action.scope !== "career-global" && bindingMatches(action.binding, keystroke),
  );
  if (screenHit) return { kind: "action", action: screenHit };

  // Priority 7 — nothing.
  return { kind: "none" };
};

/** Fresh idle prefix for the resolver's callers. */
export { IDLE_PREFIX };
