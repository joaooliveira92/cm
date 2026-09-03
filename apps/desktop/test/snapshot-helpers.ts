import { NationId, NationSelectionIntentPayload, ScopeOptionId, type SnapshotId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { submitLeagueSelection } from "../src/main/leagueSelection.js";
import { DEFAULT_CAREER_INTENTS } from "../src/main/saves.js";

/**
 * The default snapshot ticket 03's test helpers construct: submit the default career scope
 * (England, top division — the single-league world generation has always produced) through the
 * real submission machinery and return the minted id. Direct `beginCareer` callers need a real
 * snapshot id because `beginCareer` loads the snapshot by id from `userDataDir`.
 */
export const createDefaultSnapshot = (userDataDir: string): Effect.Effect<SnapshotId> =>
  Effect.map(submitLeagueSelection(userDataDir, DEFAULT_CAREER_INTENTS), (snapshot) => snapshot.id);

/**
 * A snapshot for a deliberately *wider* scope than the default — England's top division plus
 * Spain's. Used where a test has to vary the selection itself rather than the seed, which is the
 * only way to observe that something is selection-independent now that `beginCareer` re-resolves
 * a real selection.
 */
export const createWiderSnapshot = (userDataDir: string): Effect.Effect<SnapshotId> =>
  createSnapshotFor(userDataDir, [
    ...DEFAULT_CAREER_INTENTS,
    new NationSelectionIntentPayload({
      nationId: NationId.make("nation_esp"),
      mode: "playable",
      scopeOptionId: ScopeOptionId.make("scope_esp_top"),
      source: "user",
    }),
  ]);

/** A snapshot for an arbitrary scope, for a test that has to name the competitions it expects. */
export const createSnapshotFor = (
  userDataDir: string,
  intents: readonly NationSelectionIntentPayload[],
): Effect.Effect<SnapshotId> =>
  Effect.map(submitLeagueSelection(userDataDir, intents), (snapshot) => snapshot.id);

/** The one-nation scope that exercises parallel regional divisions: Spain's national and regional
 *  pyramid, where two second-tier divisions feed the one division above them. */
export const createRegionalSnapshot = (userDataDir: string): Effect.Effect<SnapshotId> =>
  createSnapshotFor(userDataDir, [
    new NationSelectionIntentPayload({
      nationId: NationId.make("nation_esp"),
      mode: "playable",
      scopeOptionId: ScopeOptionId.make("scope_esp_regional"),
      source: "user",
    }),
  ]);

/** England's whole pyramid — the *widened scope option* shape of the superset property, as opposed
 *  to `createWiderSnapshot`'s added nation. */
export const createPyramidSnapshot = (userDataDir: string): Effect.Effect<SnapshotId> =>
  createSnapshotFor(userDataDir, [
    new NationSelectionIntentPayload({
      nationId: NationId.make("nation_eng"),
      mode: "playable",
      scopeOptionId: ScopeOptionId.make("scope_eng_pyramid"),
      source: "user",
    }),
  ]);

/** England's top division beside Spain's regional pyramid: England's own competitions are
 *  unchanged, but a great deal else is loaded around them. */
export const createRegionalPlusEnglandSnapshot = (userDataDir: string): Effect.Effect<SnapshotId> =>
  createSnapshotFor(userDataDir, [
    ...DEFAULT_CAREER_INTENTS,
    new NationSelectionIntentPayload({
      nationId: NationId.make("nation_esp"),
      mode: "playable",
      scopeOptionId: ScopeOptionId.make("scope_esp_regional"),
      source: "user",
    }),
  ]);
