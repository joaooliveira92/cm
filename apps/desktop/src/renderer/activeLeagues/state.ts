import type {
  AdvancedOptionsPayload,
  NationSelectionIntentPayload,
} from "@cm-clone/contracts";
import { NationId, ScopeOptionId } from "@cm-clone/contracts";
import {
  applyAdvancedOption,
  defaultAdvancedOptions,
  type AdvancedOptionsKey,
  type AdvancedOptionsState,
  type LeagueSetupIndex,
  type SimulationMode,
} from "@cm-clone/shared";
import type { ActiveLeaguesIntent, ActiveLeaguesSetupState } from "./types.js";

/**
 * The pure reducer behind the Active Leagues setup state.
 *
 * Every user interaction arrives as a typed `ActiveLeaguesIntent` and is turned into a new
 * authoritative `ActiveLeaguesSetupState` here — never arbitrary path mutation (spec
 * "Interactions as typed intents; operations as explicit lifecycles"). The reducer owns the two
 * domain rules the grid needs: depth changes ride the per-Nation scope-option safety rail (a row
 * cannot be made `full` where no scope option can express league playable), and removal takes the
 * owning Nation's intent out of the career (`not_loaded`), exactly what the spec says Simulation
 * Mode's `not_loaded` means for removed rows.
 *
 * Failures are checked values, never throws: an unknown league id or an inexpressible depth
 * leaves the state unchanged and lets the caller render the current answer, which is what the
 * screen is already showing.
 *
 * This is a pure fold over the *domain* catalogue (`LeagueSetupIndex`), not the wire view: the
 * scope-option check happens against a catalogue the renderer can trust to express scope, and
 * the same catalogue is what the projection consequences read, so the reducer and the derived
 * figures cannot disagree.
 */

export const initialState = (
  options?: Partial<{
    readonly intents: readonly NationSelectionIntentPayload[];
    readonly advancedOptions: AdvancedOptionsPayload;
  }>,
): ActiveLeaguesSetupState => ({
  intents: options?.intents ?? [],
  advancedOptions: options?.advancedOptions ?? defaultAdvancedOptions(),
  revision: 0,
  notice: null,
});

const bumped = (state: ActiveLeaguesSetupState, patch: Partial<ActiveLeaguesSetupState>): ActiveLeaguesSetupState => ({
  ...state,
  ...patch,
  revision: state.revision + 1,
});

interface LeagueHit {
  readonly nationId: string;
}

const findLeague = (index: LeagueSetupIndex, leagueId: string): LeagueHit | null => {
  for (const nation of index.nations) {
    if (!nation.available) continue;
    const league = nation.competitions.find((competition) => competition.id === leagueId);
    if (league !== undefined) {
      return { nationId: nation.id };
    }
  }
  return null;
};

/** The scope option with the fewest own competitions that still carries the league as playable. */
const scopeForPlayable = (
  index: LeagueSetupIndex,
  nationId: string,
  leagueId: string,
): string | null => {
  const nation = index.nations.find((entry) => entry.id === nationId);
  if (nation === undefined) return null;
  const candidates = nation.scopeOptions.filter((option) =>
    option.playableCompetitionIds.includes(leagueId),
  );
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => a.playableCompetitionIds.length - b.playableCompetitionIds.length,
  )[0]!.id;
};

/** Mint the branded payload the wire carries. Brand-stripping and brand-minting happen here at
 *  the model boundary, never in domain logic (`as never` casts push the seam into the rules). */
const intentPayload = (
  nationId: string,
  mode: SimulationMode,
  scopeOptionId?: string,
): NationSelectionIntentPayload => ({
  nationId: NationId.make(nationId),
  mode,
  ...(scopeOptionId === undefined ? {} : { scopeOptionId: ScopeOptionId.make(scopeOptionId) }),
  source: "user",
});

const withNationIntent = (
  state: ActiveLeaguesSetupState,
  intent: NationSelectionIntentPayload,
): ActiveLeaguesSetupState =>
  bumped(state, {
    intents: [
      ...state.intents.filter((entry) => entry.nationId !== intent.nationId),
      intent,
    ],
  });

const dropNation = (state: ActiveLeaguesSetupState, nationId: string): ActiveLeaguesSetupState =>
  bumped(state, {
    intents: state.intents.filter((entry) => entry.nationId !== nationId),
  });

/** A competition this Nation's current intent directly owns — a playable scope's own playable
 *  and background lists. A competition active only as somebody's dependency is not owned, so the
 *  grid cannot be tricked into re-depth-ing a capped row through a forged intent. */
const ownsLeague = (index: LeagueSetupIndex, state: ActiveLeaguesSetupState, nationId: string, leagueId: string): boolean => {
  const current = state.intents.find((entry) => entry.nationId === nationId);
  if (current === undefined) return false;
  if (current.mode !== "playable" || current.scopeOptionId === undefined) return true;
  const option = index.nations
    .find((nation) => nation.id === nationId)
    ?.scopeOptions.find((scope) => scope.id === current.scopeOptionId);
  if (option === undefined) return true;
  return (
    option.playableCompetitionIds.includes(leagueId) ||
    option.backgroundCompetitionIds.includes(leagueId)
  );
};

/**
 * Apply one typed intent. `index` is the domain catalogue the scope-option rail checks against.
 * Returns the state unchanged when the intent cannot be expressed (unknown league, or a depth no
 * scope option can carry) — a checked value the caller renders, never a throw.
 */
export const applyIntent = (
  index: LeagueSetupIndex,
  state: ActiveLeaguesSetupState,
  intent: ActiveLeaguesIntent,
): ActiveLeaguesSetupState => {
  switch (intent.type) {
    case "addActiveLeague": {
      const hit = findLeague(index, intent.leagueId);
      if (hit === null) return state;
      // Add the owning Nation at a scope that can carry the league playable; a league no scope
      // option can make playable (a background-only competition) joins at `background`, never
      // fabricated as full (spec's no-free-form-assembly rail).
      const scope = scopeForPlayable(index, hit.nationId, intent.leagueId);
      if (scope !== null) {
        return withNationIntent(state, intentPayload(hit.nationId, "playable", scope));
      }
      return withNationIntent(state, intentPayload(hit.nationId, "background"));
    }

    case "changeSimulationDepth": {
      const hit = findLeague(index, intent.leagueId);
      if (hit === null) return state;
      // A dependency-capped row is not depth-editable: the reducer refuses the depth change on
      // a competition its Nation's own scope does not carry, so nothing short of a caller bug
      // can demote a required competition.
      if (!ownsLeague(index, state, hit.nationId, intent.leagueId)) return state;
      const mode =
        intent.simulationDepth === "full"
          ? "playable"
          : intent.simulationDepth === "standard"
            ? "background"
            : "view_only";

      if (mode === "playable") {
        // Full depth must be expressible: keep the Nation's current playable scope when it
        // already carries this league, else the narrowest scope that does. Anything else is
        // "this league cannot be made full" — a checked no-op, not a fabricated override.
        const current = state.intents.find((entry) => entry.nationId === hit.nationId);
        const currentScope =
          current?.mode === "playable" &&
          current.scopeOptionId !== undefined &&
          index.nations
            .find((nation) => nation.id === hit.nationId)
            ?.scopeOptions.find((option) => option.id === current.scopeOptionId)
            ?.playableCompetitionIds.includes(intent.leagueId) === true
            ? current.scopeOptionId
            : scopeForPlayable(index, hit.nationId, intent.leagueId);
        if (currentScope === null) return state;
        return withNationIntent(state, intentPayload(hit.nationId, "playable", currentScope));
      }

      return withNationIntent(state, intentPayload(hit.nationId, mode));
    }

    case "removeActiveLeague": {
      const hit = findLeague(index, intent.leagueId);
      if (hit === null) return state;
      // The safety rail: the grid is per-competition but the authoritative model is per-Nation,
      // so removing a row takes the owning Nation's selection out of the career (`not_loaded`).
      // A league also kept alive as somebody's dependency survives at its capped `standard`.
      return dropNation(state, hit.nationId);
    }

    case "applySetupPreset":
      return bumped(state, {
        intents: intent.intents,
        notice: intent.notice,
      });

    case "changeAdvancedOption": {
      // The payload and the domain option state are the same shape (the payload schema is the
      // boundary's copy of it); the shared checker validates the combination either way.
      const result = applyAdvancedOption(
        state.advancedOptions as AdvancedOptionsState,
        intent.key as AdvancedOptionsKey,
        intent.value,
      );
      // An incompatible combination is refused rather than forced: `applyAdvancedOption` leaves
      // the state unchanged on an unsupported value, and the shared incompatibility rules surface
      // as checked issues the validation atoms render.
      return { ...state, advancedOptions: result.options as AdvancedOptionsPayload };
    }

    case "restore":
      return {
        ...intent.state,
        revision: state.revision + 1,
      };

    case "dismissNotice":
      return { ...state, notice: null };
  }
};