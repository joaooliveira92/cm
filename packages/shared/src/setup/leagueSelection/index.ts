/**
 * League and Nation Selection: the pure decision layer (Screen 3, §11, §12, §15, §19).
 *
 * Two models, deliberately separate (§34): the user's **intents** — what they asked for, one
 * record per Nation — and the **effective selection** the intents resolve to once dependencies
 * are closed over. Nothing here does IO, reads a clock, or holds state; the desktop main process
 * owns those and calls into this module as the trusted resolver behind its RPC boundary.
 *
 * Keeping resolution here rather than in the renderer is what makes §23 enforceable: a forged
 * renderer command reaches `resolveSelection`, which knows the catalogue, rather than a UI
 * reducer that has already been told the answer.
 *
 * The four concerns live in their own files; this barrel re-exports exactly the surface the
 * single `leagueSelection.ts` had, so call sites name the same symbols they always did:
 *
 * | File | Concern | Spec |
 * |---|---|---|
 * | `selection.ts` | intent, dependency closure, effective selection | §12, §19, §34 |
 * | `issues.ts` | issue codes and the submission gate | §16, §17 |
 * | `activeLeagues.ts` | active-leagues projection | §12 |
 * | `nations.ts` | Nation rows and mode transitions | §7, §9.5 |
 *
 * The re-exports are named rather than `export *` on purpose: `issues.ts` exports its `issue`
 * constructor so its siblings can reach it, and that constructor was private before.
 */

export {
  INTENT_SOURCES,
  resolveSelection,
  type DependencyRecord,
  type EffectiveNationSelection,
  type IntentSource,
  type NationSelectionIntent,
  type ResolvedSelection,
} from "./selection.js";

export {
  blockingIssues,
  canContinue,
  ISSUE_CODES,
  ISSUE_LEVELS,
  warningIssues,
  type IssueCode,
  type IssueLevel,
  type SelectionIssue,
} from "./issues.js";

export {
  projectActiveLeagues,
  type ActiveLeaguesProjection,
  type ActiveLeaguesRow,
} from "./activeLeagues.js";

export {
  applyModeChange,
  applyScopeChange,
  nationSelectionState,
  nationTriState,
  type ModeChangeResult,
  type TriState,
} from "./nations.js";
