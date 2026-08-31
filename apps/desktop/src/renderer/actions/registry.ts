import { type Action, type ActionScope, type ScopeState, type ScreenName } from "./types.js";

/**
 * The Action registry (ADR-0012). Actions are declared colocated per screen and
 * collected here at startup; the registry is the single source of truth the key
 * map, command palette (Stage 4), and help overlay derive from.
 *
 * Registration is pure — no Action handler runs here, so no registration has a
 * side effect. Collision and locked-infra-key checks (AC-17) are explicit and
 * enforced at collection time, so the spine can never silently serve two actions
 * for one keystroke within an active scope.
 */

/** Infrastructure keys reserved for the keyboard spine and non-rebindable.
 *  (Escape, Primary+K palette, Primary+/ help, Enter — ticket 14's locked set.) */
export const LOCKED_INFRA_BINDINGS: readonly string[] = [
  "Escape",
  "Primary+K",
  "Primary+/",
  "Enter",
];

export type CollisionRule = "duplicate-id" | "duplicate-binding" | "locked-key";

export interface CollisionViolation {
  readonly rule: CollisionRule;
  readonly binding?: string;
  readonly actionIds: readonly [string, string];
  readonly message: string;
}

/** True when `screen` is one of the eight persistent career screens. */
export const isCareerScreen = (screen: ScreenName): boolean =>
  screen === "squad" ||
  screen === "tactics" ||
  screen === "transfers" ||
  screen === "league" ||
  screen === "fixtures" ||
  screen === "match" ||
  screen === "seasonSummary" ||
  screen === "manager";

/** A scope-tier label helper for the key map (which scope a bound action lives in). */
export const scopeLabel = (scope: ActionScope): string => scope;

/** The registry under test/production: an immutable snapshot of the collected Actions. */
export interface Registry {
  readonly all: ReadonlyArray<Action>;
  /** Look up a single Action by stable id. */
  readonly get: (id: string) => Action | undefined;
  /** The active set for a current screen: globals + career-global (when career)
   *  + that screen's own actions, Availability-filtered. */
  readonly active: (current: ScreenName, state: ScopeState) => ReadonlyArray<Action>;
  /** Collision violations found at collection time (AC-17). */
  readonly collisions: ReadonlyArray<CollisionViolation>;
}

/** Build a registry from a list of colocated Actions. Runs the automated
 *  collision + locked-infra-key checks up front (AC-17) — a violating registry
 *  is a build-time error, not a runtime surprise. Two actions sharing an `id`
 *  are legal across different scopes (the Action model treats them as distinct);
 *  an id collision within one scope is a build error. */
export const createRegistry = (actions: ReadonlyArray<Action>): Registry => {
  const withinScopeDup = findWithinScopeDuplicateId(actions);
  if (withinScopeDup !== null) throw withinScopeDup;
  const collisions = checkCollisions(actions);
  return {
    all: actions,
    get: (id: string): Action | undefined => byId(actions, id),
    active: (current, state) => activeSet(actions, current, state),
    collisions,
  };
};

const byId = (actions: ReadonlyArray<Action>, id: string): Action | undefined =>
  actions.find((a) => a.id === id);

const findWithinScopeDuplicateId = (actions: ReadonlyArray<Action>): Error | null => {
  const seen = new Map<string, Action>();
  for (const action of actions) {
    const prev = seen.get(action.id);
    if (prev !== undefined && prev.scope === action.scope) {
      return new Error(
        `Action registry: duplicate id "${action.id}" in scope "${action.scope}". ` +
          "Two actions with the same id are distinct only across different scopes.",
      );
    }
    seen.set(action.id, action);
  }
  return null;
};

/** The union of currently-active scope tiers, availability-filtered (Action model:
 *  current scope + globals merged into the active set). */
export const activeSet = (
  actions: ReadonlyArray<Action>,
  current: ScreenName,
  state: ScopeState,
): ReadonlyArray<Action> => {
  const includeCareerGlobals = isCareerScreen(current);
  return actions.filter((action) => {
    if (action.scope === "app-global") {
      return action.available(state);
    }
    if (action.scope === "career-global") {
      return includeCareerGlobals && action.available(state);
    }
    return action.scope === current && action.available(state);
  });
};

/** Availability-agnostic union of scope tiers (used by the key map before the
 *  per-key availability predicate runs). */
export const actionsInTiers = (
  actions: ReadonlyArray<Action>,
  current: ScreenName,
): ReadonlyArray<Action> => {
  const includeCareerGlobals = isCareerScreen(current);
  return actions.filter((action) => {
    if (action.scope === "app-global") return true;
    if (action.scope === "career-global") return includeCareerGlobals;
    return action.scope === current;
  });
};

/**
 * Automated collision checks across simultaneously active scopes (AC-17). Returns
 * every violation; a registry with violations must not be used by the spine.
 * Two collisions are recognised:
 *  - duplicate-binding: two actions in one scope tier claim the same binding
 *    (the dispatch priority can only serve one per keystroke).
 *  - locked-key: an action outside `app-global` claims a locked infra key.
 * `duplicate-id` within one scope is also a collision (handled at build).
 */
export const checkCollisions = (
  actions: ReadonlyArray<Action>,
): ReadonlyArray<CollisionViolation> => {
  const out: CollisionViolation[] = [];
  const byBinding = new Map<string, Action>();
  for (const action of actions) {
    if (action.binding === undefined) continue;
    if (LOCKED_INFRA_BINDINGS.includes(action.binding)) {
      if (action.scope !== "app-global") {
        out.push({
          rule: "locked-key",
          binding: action.binding,
          actionIds: [action.id, action.id],
          message: `Action "${action.id}" claims locked infra key "${action.binding}" outside app-global scope.`,
        });
      }
      continue;
    }
    const prior = byBinding.get(action.binding);
    if (prior !== undefined && prior.scope === action.scope) {
      out.push({
        rule: "duplicate-binding",
        binding: action.binding,
        actionIds: [prior.id, action.id],
        message: `Actions "${prior.id}" and "${action.id}" both bind "${action.binding}" in scope "${action.scope}".`,
      });
    } else if (prior === undefined) {
      byBinding.set(action.binding, action);
    }
  }

  const ids = new Map<string, Action>();
  for (const action of actions) {
    const prior = ids.get(action.id);
    if (prior !== undefined && prior.scope === action.scope) {
      out.push({
        rule: "duplicate-id",
        actionIds: [prior.id, action.id],
        message: `Duplicate action id "${action.id}" within scope "${action.scope}".`,
      });
    } else if (prior === undefined) {
      ids.set(action.id, action);
    }
  }
  return out;
};
