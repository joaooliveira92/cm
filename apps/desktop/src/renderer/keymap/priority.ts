import { type Action, type Keystroke } from "../actions/types.js";
import { prefixReduce, type PrefixState, IDLE_PREFIX } from "./prefix.js";
import { isBareLetterOrDigit } from "./keystroke.js";

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
  readonly typing: boolean;
  readonly nativeActivation?: boolean;
  readonly prefix: PrefixState;
  readonly now: number;
  readonly actions: ReadonlyArray<Action>;
  readonly level0Completions: ReadonlySet<string>;
  readonly level1Completions: ReadonlySet<string>;
  readonly overlay?: OverlayLayer;
}

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
    return false;
  }
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

const isPrefixG = (keystroke: Keystroke, actions: ReadonlyArray<Action>): boolean =>
  !keystroke.primary &&
  !keystroke.ctrl &&
  !keystroke.meta &&
  keystroke.key.toLowerCase() === "g" &&
  !actions.some((a) => a.binding === "g" && a.scope !== "app-global");

export const resolveDispatch = (ctx: ResolveContext): DispatchDecision => {
  const { keystroke, typing, prefix, now, actions, level0Completions, level1Completions, overlay } = ctx;
  const nativeActivation = ctx.nativeActivation ?? false;

  const top = overlay ?? "none";
  if (top === "panel") {
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

  if (typing) {
    if (keystroke.primary) {
      const hit = findActionWithBinding(actions, keystroke, "app-global");
      return hit ? { kind: "action", action: hit } : { kind: "native" };
    }
    return { kind: "native" };
  }

  if (nativeActivation) return { kind: "native" };

  if (prefix.kind !== "idle") {
    const completions = prefix.kind === "level0" ? level0Completions : level1Completions;
    const step = prefixReduce(prefix, { kind: "key", key: keystroke.key, now }, completions);
    if (step.outcome.kind === "complete") {
      return { kind: "complete-prefix", completion: step.outcome.completion! };
    }
    if (step.outcome.kind === "cancel") {
      return { kind: "cancel-prefix" };
    }
    return { kind: "none" };
  }

  if (isPrefixG(keystroke, actions)) {
    return { kind: "start-prefix" };
  }

  if (keystroke.primary) {
    const hit = findActionWithBinding(actions, keystroke, "app-global");
    return hit ? { kind: "action", action: hit } : { kind: "none" };
  }

  const careerHit = findActionWithBinding(actions, keystroke, "career-global");
  if (careerHit) return { kind: "action", action: careerHit };

  const screenHit = actions.find(
    (action) => action.scope !== "app-global" && action.scope !== "career-global" && bindingMatches(action.binding, keystroke),
  );
  if (screenHit) return { kind: "action", action: screenHit };

  return { kind: "none" };
};

export { IDLE_PREFIX };