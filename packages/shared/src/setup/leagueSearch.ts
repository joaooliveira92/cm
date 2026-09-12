/**
 * Nation and Competition search and status filtering (§10).
 *
 * Text matching and filter predicates over the catalogue, kept apart from `./leagueSelection/index.js`
 * because nothing here reads or produces a selection — a filtered list is a view of the catalogue,
 * not a decision about it.
 */

import { type LeagueSetupIndex, type NationSelectionState } from "./leagueSetup.js";
import { catalogueName } from "../content/contentPack.js";

// ---------------------------------------------------------------------------
// Search and filtering (§10)
// ---------------------------------------------------------------------------

/**
 * §10.2. Case-folded, diacritic-stripped, whitespace-collapsed. Applied to both the query and the
 * candidate so "Doravia" matches "doravia" and "República Doravia" matches "republica".
 */
export const normalizeSearchText = (value: string): string =>
  value
    .normalize("NFD")
    // Combining marks: strip the accent, keep the base letter.
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export interface SearchHit {
  readonly nationId: string;
  /** The Competition that matched, when the hit was on a Competition rather than the Nation. */
  readonly competitionId: string | null;
}

/**
 * §10.1. Matches Nation names, alternative names, Competition names, and region names. Never
 * matches a stable entity id: §10.2 keeps identifiers out of ordinary results, so a user typing
 * "comp-aravia-1" gets nothing rather than a leak of the internal vocabulary.
 */
export const searchIndex = (index: LeagueSetupIndex, query: string): readonly SearchHit[] => {
  const needle = normalizeSearchText(query);
  if (needle === "") return [];

  const regionNames = new Map(index.regions.map((region) => [region.id, region.name]));
  const hits: SearchHit[] = [];

  for (const nation of index.nations) {
    const nationHaystack = [
      nation.name,
      ...nation.alternativeNames,
      regionNames.get(nation.regionId) ?? "",
    ].map((value) => normalizeSearchText(value));

    if (nationHaystack.some((value) => value.includes(needle))) {
      hits.push({ nationId: nation.id, competitionId: null });
    }
    for (const competition of nation.competitions) {
      if (normalizeSearchText(catalogueName(competition.id)).includes(needle)) {
        hits.push({ nationId: nation.id, competitionId: competition.id });
      }
    }
  }
  return hits;
};

export const STATUS_FILTERS = [
  "all",
  "selected",
  "playable",
  "background",
  "view_only",
  "included_by_dependency",
  "warnings",
  "unavailable",
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** §10.4. Pure predicate over a Nation's derived state; the caller supplies the state so a list
 *  render derives it once per Nation rather than once per filter test. */
export const matchesStatusFilter = (
  filter: StatusFilter,
  state: NationSelectionState,
  hasWarning: boolean,
): boolean => {
  switch (filter) {
    case "all":
      return true;
    case "selected":
      return state !== "not_selected" && state !== "unavailable";
    case "playable":
      return state === "selected_playable";
    case "background":
      return state === "selected_background";
    case "view_only":
      return state === "selected_view_only";
    case "included_by_dependency":
      return state === "included_by_dependency";
    case "warnings":
      return hasWarning;
    case "unavailable":
      return state === "unavailable";
  }
};
