import type {
  AdvancedOptionsPayload,
  NationSelectionIntentPayload,
  ResolvedSelectionView,
} from "@cm-clone/contracts";
import type { AdvancedOptionsKey, SimulationDepth } from "@cm-clone/shared";

/**
 * The authoritative Active Leagues setup state (Active Leagues Setup spec, "One authoritative
 * setup state; everything else is derived").
 *
 * Only *what the player asked for* lives here — the per-Nation Selection Intents and the
 * Advanced Options — plus the async bookkeeping the resolve edge needs. The row model, the
 * entity count, the processing-cost reading, the recommendation reasons, the validation status,
 * and whether Continue is allowed are all *derived* from it by the atoms in `atoms.ts`; none of
 * those figures is ever written into this state, so the summary can never go stale.
 *
 * The resolved selection is deliberately not "another authoritative store": it is the answer the
 * trusted resolver returned for the current intents, exactly the I/O the concerns already read on
 * the existing seam. Deriving from it (rather than re-resolving in the renderer) keeps the
 * trusted-validation boundary intact — nothing the renderer computes is ever trusted.
 */
export interface ActiveLeaguesSetupState {
  readonly intents: readonly NationSelectionIntentPayload[];
  readonly advancedOptions: AdvancedOptionsPayload;
  /** Monotonic. Every intents-affecting intent bumps it; the resolver echoes it back so the
   *  edge can discard an answer that no longer matches the current selection (§11.5). */
  readonly revision: number;
  /** A transient line (a preset that dropped entries, a restored draft). `null` when idle. */
  readonly notice: string | null;
}

/**
 * Interactions as typed intents — never arbitrary path mutation. The UI fires one of these, the
 * reducer in `state.ts` turns it into a new authoritative `ActiveLeaguesSetupState`, and nothing
 * downstream assembles intents by hand.
 *
 * Every league-targeting intent carries the **stable league id** — the competition id that is the
 * row's identity key, never the array index (spec "TanStack Table for identity and rendering").
 */
export type ActiveLeaguesIntent =
  | { readonly type: "addActiveLeague"; readonly leagueId: string }
  | {
      readonly type: "changeSimulationDepth";
      readonly leagueId: string;
      readonly simulationDepth: SimulationDepth;
    }
  | { readonly type: "removeActiveLeague"; readonly leagueId: string }
  | {
      readonly type: "applySetupPreset";
      readonly intents: readonly NationSelectionIntentPayload[];
      readonly notice: string | null;
    }
  | {
      readonly type: "changeAdvancedOption";
      readonly key: AdvancedOptionsKey;
      readonly value: string;
    }
  | { readonly type: "restore"; readonly state: ActiveLeaguesSetupState }
  | { readonly type: "dismissNotice" };

/**
 * What the resolve edge has produced for the current intents. Held separately from
 * `ActiveLeaguesSetupState` so a decision the domain answered can never be mistaken for a
 * user intent; the derived atoms fold it (showing the previous answer while a newer one is in
 * flight, per §11.5) instead of re-resolving in the renderer.
 */
export type ResolvedSlot =
  | { readonly _tag: "idle" }
  | { readonly _tag: "loading"; readonly previous: ResolvedSelectionView | null }
  | { readonly _tag: "ready"; readonly resolved: ResolvedSelectionView }
  | { readonly _tag: "failed"; readonly previous: ResolvedSelectionView | null };