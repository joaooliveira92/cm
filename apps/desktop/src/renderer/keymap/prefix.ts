import { prefixTimeoutMs } from "./timeout.js";

export type PrefixState =
  | { readonly kind: "idle" }
  | { readonly kind: "level0"; readonly startedAt: number }
  | { readonly kind: "level1"; readonly startedAt: number; readonly sectionKey: string };

export const IDLE_PREFIX: PrefixState = { kind: "idle" };

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
  readonly completion?: string;
  readonly reason?: "timeout" | "escape" | "invalid";
}

export interface PrefixStep {
  readonly outcome: PrefixOutcome;
  readonly state: PrefixState;
}

const expired = (state: PrefixState, now: number): boolean => {
  if (state.kind === "idle") return false;
  return now - state.startedAt > prefixTimeoutMs();
};

export const prefixReduce = (
  state: PrefixState,
  event: PrefixEvent,
  validCompletions: ReadonlySet<string>,
): PrefixStep => {
  if (state.kind === "idle") {
    if (event.kind === "start") {
      return { outcome: { kind: "active" }, state: { kind: "level0", startedAt: event.now } };
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

  if (expired(state, event.now)) {
    return { outcome: { kind: "cancel", reason: "timeout" }, state: IDLE_PREFIX };
  }
  if (event.key === "Escape") {
    return { outcome: { kind: "cancel", reason: "escape" }, state: IDLE_PREFIX };
  }
  if (validCompletions.has(event.key)) {
    return { outcome: { kind: "complete", completion: event.key }, state: IDLE_PREFIX };
  }
  return { outcome: { kind: "cancel", reason: "invalid" }, state: IDLE_PREFIX };
};

export { prefixTimeoutMs };