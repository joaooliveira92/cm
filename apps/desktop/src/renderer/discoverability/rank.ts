/**
 * Command-palette ranking (command-palette note, AC-04/AC-23). Pure and
 * unit-tested: given the registry's live Action rows for the current scope
 * union and a query, produce the ordered palette list.
 *
 * Ordering: available actions rank above unavailable, then by label match
 * tier — exact → prefix → substring → binding → scope → word-initials fuzzy.
 * The note's "+10 rank boost" is realised as the available-before-unavailable
 * split, matching AC-04's wording ("available actions before unavailable;
 * label match score within each tier") — an additive boost could let a
 * disabled exact-match entry outrank an enabled prefix match, which is the
 * opposite of "the player sees what they *can* do first".
 *
 * "Never hidden": an unavailable row that *matches* the query is kept and
 * rendered disabled-with-reason; only rows a query does not match are dropped,
 * exactly like any available row.
 */
import type { Action, ScopeState } from "../actions/types.js";

/** One palette row: the Action plus its current availability + plain reason. */
export interface PaletteCandidate {
  readonly action: Action;
  readonly available: boolean;
  /** Plain-language unavailable reason (null when available — AC-23). */
  readonly reason: string | null;
}

/** The label-match tiers in ascending rank weight. */
export type MatchTier =
  | "none"
  | "word-initials"
  | "scope"
  | "binding"
  | "substring"
  | "prefix"
  | "exact";

const TIER_WEIGHT: Readonly<Record<MatchTier, number>> = {
  none: 0,
  "word-initials": 1,
  scope: 2,
  binding: 3,
  substring: 4,
  prefix: 5,
  exact: 6,
};

const DEFAULT_UNAVAILABLE_REASON = "Not available right now";

/** The match tier of a single Action against the query, per the note's order. */
export const labelMatchTier = (
  label: string,
  binding: string | undefined,
  scope: string,
  query: string,
): MatchTier => {
  const q = query.trim().toLowerCase();
  if (q === "") return "none";
  const l = label.toLowerCase();
  if (l === q) return "exact";
  if (l.startsWith(q)) return "prefix";
  if (l.includes(q)) return "substring";
  if (binding !== undefined && binding.toLowerCase().includes(q)) return "binding";
  if (scope.toLowerCase().includes(q)) return "scope";
  const initials = l
    .split(/\s+/)
    .map((word) => word[0])
    .filter((char): char is string => char !== undefined)
    .join("");
  if (initials !== "" && initials.includes(q)) return "word-initials";
  return "none";
};

const compareTiers = (a: MatchTier, b: MatchTier): number => TIER_WEIGHT[b] - TIER_WEIGHT[a];

/**
 * Rank the palette rows. `actions` are the current scope union (globals +
 * career-globals + current-screen); `state` is the live ScopeState the
 * availability predicates read. Rows keep a stable input order on ties.
 */
export const rankPaletteActions = (
  actions: ReadonlyArray<Action>,
  query: string,
  state: ScopeState,
): ReadonlyArray<PaletteCandidate> => {
  const trimmed = query.trim();
  const scored = actions.map((action, index) => {
    const available = action.available(state);
    return {
      action,
      index,
      available,
      reason: available ? null : (action.unavailableReason ?? DEFAULT_UNAVAILABLE_REASON),
      tier: labelMatchTier(action.label, action.binding, action.scope, trimmed),
    };
  });
  const filtered = trimmed === "" ? scored : scored.filter((s) => s.tier !== "none");
  return filtered
    .sort(
      (a, b) =>
        Number(b.available) - Number(a.available) ||
        compareTiers(a.tier, b.tier) ||
        a.index - b.index,
    )
    .map((s) => ({ action: s.action, available: s.available, reason: s.reason }));
};