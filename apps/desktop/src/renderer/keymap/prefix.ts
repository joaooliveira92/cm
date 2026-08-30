/**
 * The `g <key>` prefix lifecycle (global-key-map note, AC-18). A pure state
 * machine: pressing `g` enters the prefix state (no single-key `g` action), a
 * valid destination key completes and navigates, and `Escape`, an invalid key,
 * or the ~800ms timeout cancels without firing an unrelated bare-key action.
 *
 * `validCompletions` is the set of destination keys drawn from the registry's
 * `g ` navigation actions — never derived from screen initials.
 */
import { prefixTimeoutMs } from "./timeout.js";

export interface PrefixState {
  readonly active: boolean;
  readonly startedAt: number;
}

export const IDLE_PREFIX: PrefixState = { active: false, startedAt: 0 };

export type PrefixEvent =
  | { readonly kind: "start"; readonly now: number }
  | { readonly kind: "key"; readonly key: string; readonly now: number }
  | { readonly kind: "tick"; readonly now: number };

export type PrefixOutcomeKind =
  | "idle"
  | "active"
  | "complete"
  | "cancel";

export interface PrefixOutcome {
  readonly kind: PrefixOutcomeKind;
  /** The destination key that completed navigation (kind === "complete"). */
  readonly completion?: string;
  readonly reason?: "timeout" | "escape" | "invalid";
}

export interface PrefixStep {
  readonly outcome: PrefixOutcome;
  readonly state: PrefixState;
}

const expired = (state: PrefixState, now: number): boolean =>
  now - state.startedAt > prefixTimeoutMs();

/** Advance the prefix machine by one event. Pure — no side effects, no navigation. */
export const prefixReduce = (
  state: PrefixState,
  event: PrefixEvent,
  validCompletions: ReadonlySet<string>,
): PrefixStep => {
  if (!state.active) {
    if (event.kind === "start") {
      return { outcome: { kind: "active" }, state: { active: true, startedAt: event.now } };
    }
    return { outcome: { kind: "idle" }, state: IDLE_PREFIX };
  }

  if (event.kind === "tick") {
    return expired(state, event.now)
      ? { outcome: { kind: "cancel", reason: "timeout" }, state: IDLE_PREFIX }
      : { outcome: { kind: "active" }, state };
  }

  if (event.kind === "start") {
    return { outcome: { kind: "cancel" }, state: IDLE_PREFIX };
  }

  // event.kind === "key"
  if (expired(state, event.now)) {
    return { outcome: { kind: "cancel", reason: "timeout" }, state: IDLE_PREFIX };
  }
  if (event.key === "Escape") {
    return { outcome: { kind: "cancel", reason: "escape" }, state: IDLE_PREFIX };
  }
  if (validCompletions.has(event.key)) {
    return { outcome: { kind: "complete", completion: event.key }, state: IDLE_PREFIX };
  }
  // An invalid bare key cancels the prefix and must NOT fire an unrelated action.
  return { outcome: { kind: "cancel", reason: "invalid" }, state: IDLE_PREFIX };
};

/** Forward-declared for tree-shaking ergonomics; the single timeout knob. */
export { prefixTimeoutMs };
