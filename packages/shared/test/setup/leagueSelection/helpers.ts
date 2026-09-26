/**
 * Fixtures shared by the `leagueSelection` specs. Moved verbatim out of the single
 * `leagueSelection.test.ts` when it was split to mirror `src/setup/leagueSelection/`.
 */

import {
  LEAGUE_SETUP_INDEX,
  resolveSelection,
  type NationSelectionIntent,
} from "../../../src/index.js";

export const index = LEAGUE_SETUP_INDEX;

export const playable = (nationId: string, scopeOptionId: string): NationSelectionIntent => ({
  nationId,
  mode: "playable",
  scopeOptionId,
  source: "user",
});

export const activeIds = (intents: readonly NationSelectionIntent[]): readonly string[] =>
  resolveSelection(index, intents).dependencies.map((d) => d.competitionId);

export const modeOf = (intents: readonly NationSelectionIntent[], competitionId: string) =>
  resolveSelection(index, intents).dependencies.find((d) => d.competitionId === competitionId)?.mode;
