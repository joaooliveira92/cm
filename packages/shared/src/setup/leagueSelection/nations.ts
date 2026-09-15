/**
 * Nation row derivation and mode transitions (§7.1, §7.2, §9.5).
 *
 * Split out of `leagueSelection.ts`. Derives each Nation row's tri-state from the resolved
 * selection, and applies the mode and scope changes the browser sends back as intents.
 */

import {
  nationIndex,
  type LeagueSetupIndex,
  type NationNode,
  type NationSelectionState,
  type SimulationMode,
} from "../leagueSetup.js";
import type { IntentSource, NationSelectionIntent, ResolvedSelection } from "./selection.js";

export const nationSelectionState = (
  nation: NationNode,
  resolved: ResolvedSelection,
): NationSelectionState => {
  if (!nation.available) return "unavailable";
  const selection = resolved.selections.find((entry) => entry.nationId === nation.id);
  if (selection === undefined) return "not_selected";

  const chosen =
    selection.playableCompetitionIds.length +
    selection.backgroundCompetitionIds.length +
    selection.viewOnlyCompetitionIds.length;
  if (chosen === 0) return "included_by_dependency";

  // "Partially selected" is about the Nation's own pyramid: some of its Competitions are active
  // and some are not. It is the tri-state `mixed` in §7.2, and it is derived — never stored.
  const activeIds = new Set([
    ...selection.playableCompetitionIds,
    ...selection.backgroundCompetitionIds,
    ...selection.viewOnlyCompetitionIds,
    ...selection.dependencyCompetitionIds,
  ]);
  const covers = nation.competitions.every((competition) => activeIds.has(competition.id));
  if (!covers) return "partially_selected";

  return selection.mode === "playable"
    ? "selected_playable"
    : selection.mode === "view_only"
      ? "selected_view_only"
      : "selected_background";
};

export type TriState = "unchecked" | "checked" | "mixed";

export const nationTriState = (state: NationSelectionState): TriState => {
  switch (state) {
    case "not_selected":
    case "unavailable":
      return "unchecked";
    case "partially_selected":
    case "included_by_dependency":
      return "mixed";
    default:
      return "checked";
  }
};

/**
 * Apply a mode change to the intent list, preserving the Nation's previous playable scope so
 * Background → Playable can restore it (§9.5 steps 4 and the closing paragraph) instead of
 * silently resetting the user's depth.
 *
 * `rememberedScopes` is the caller's memory of prior playable depths; it is returned updated
 * rather than mutated, so the reducer holding it stays a pure fold.
 */
export interface ModeChangeResult {
  readonly intents: readonly NationSelectionIntent[];
  readonly rememberedScopes: Readonly<Record<string, string>>;
}

export const applyModeChange = (
  index: LeagueSetupIndex,
  intents: readonly NationSelectionIntent[],
  rememberedScopes: Readonly<Record<string, string>>,
  nationId: string,
  mode: SimulationMode,
  source: IntentSource = "user",
): ModeChangeResult => {
  const nation = nationIndex(index).get(nationId);
  const previous = intents.find((entry) => entry.nationId === nationId);

  const remembered =
    previous?.mode === "playable" && previous.scopeOptionId !== undefined
      ? { ...rememberedScopes, [nationId]: previous.scopeOptionId }
      : rememberedScopes;

  const withoutNation = intents.filter((entry) => entry.nationId !== nationId);
  if (mode === "not_loaded") {
    return { intents: withoutNation, rememberedScopes: remembered };
  }

  if (mode === "playable") {
    // Restore the remembered depth, else the database's recommendation, else the narrowest
    // supported scope — never nothing, which would leave Continue blocked on a choice the user
    // did not know they had to make.
    const scopeOptionId =
      remembered[nationId] ??
      nation?.recommendedScopeOptionId ??
      nation?.scopeOptions[0]?.id;
    return {
      intents: [
        ...withoutNation,
        scopeOptionId === undefined
          ? { nationId, mode, source }
          : { nationId, mode, scopeOptionId, source },
      ],
      rememberedScopes: remembered,
    };
  }

  return {
    intents: [...withoutNation, { nationId, mode, source }],
    rememberedScopes: remembered,
  };
};

export const applyScopeChange = (
  intents: readonly NationSelectionIntent[],
  nationId: string,
  scopeOptionId: string,
  source: IntentSource = "user",
): readonly NationSelectionIntent[] => [
  ...intents.filter((entry) => entry.nationId !== nationId),
  { nationId, mode: "playable", scopeOptionId, source },
];
