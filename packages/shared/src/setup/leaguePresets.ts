/**
 * Presets and stored-intent restoration (§13, §29), plus the untrusted label handling (§23) they
 * share with every other database-sourced string.
 *
 * A preset is a *starting point*, not a selection: it produces intents, which `resolveSelection`
 * then resolves like any other. That is why this sits above `./leagueSelection/index.js` rather than
 * inside it.
 */

import {
  nationIndex,
  scopeOptionIndex,
  type LeagueScopeOption,
  type LeagueSetupIndex,
  type NationNode,
} from "./leagueSetup.js";
import { resolveSelection, type NationSelectionIntent } from "./leagueSelection/index.js";
import {
  DEFAULT_SYSTEM_PROFILE,
  estimateCareerScope,
  type SystemCapabilityProfile,
} from "./careerScopeEstimate.js";

// ---------------------------------------------------------------------------
// Presets (§13, §29)
// ---------------------------------------------------------------------------

export const BUILT_IN_PRESETS = ["recommended", "minimal", "broad_world"] as const;

export type BuiltInPreset = (typeof BUILT_IN_PRESETS)[number];

const topScopeOf = (nation: NationNode): LeagueScopeOption | undefined =>
  nation.scopeOptions[0];

/**
 * §6.1 and §13. The three built-in configurations, derived from the catalogue rather than
 * hardcoded id lists, so a database that ships different Nations still produces a valid preset.
 *
 * `recommended` honours each Nation's own `recommendedScopeOptionId` and trims to what the
 * machine can carry; `minimal` is the single cheapest playable Nation; `broad_world` makes every
 * playable Nation playable at its narrowest scope and every other Nation background.
 */
export const buildPreset = (
  index: LeagueSetupIndex,
  preset: BuiltInPreset,
  profile: SystemCapabilityProfile = DEFAULT_SYSTEM_PROFILE,
): readonly NationSelectionIntent[] => {
  const playable = index.nations.filter(
    (nation) => nation.available && nation.playableSupported && nation.scopeOptions.length > 0,
  );

  if (preset === "minimal") {
    const cheapest = [...playable].sort(
      (a, b) => nationClubCount(a) - nationClubCount(b),
    )[0];
    const scope = cheapest === undefined ? undefined : topScopeOf(cheapest);
    return cheapest === undefined || scope === undefined
      ? []
      : [{ nationId: cheapest.id, mode: "playable", scopeOptionId: scope.id, source: "preset" }];
  }

  if (preset === "broad_world") {
    return index.nations.flatMap((nation): readonly NationSelectionIntent[] => {
      if (!nation.available) return [];
      const scope = topScopeOf(nation);
      if (nation.playableSupported && scope !== undefined) {
        return [{ nationId: nation.id, mode: "playable", scopeOptionId: scope.id, source: "preset" }];
      }
      return nation.competitions.length === 0
        ? []
        : [{ nationId: nation.id, mode: "background", source: "preset" }];
    });
  }

  // Recommended: take the database's recommendations, then keep adding until the estimate leaves
  // the comfortable band. A machine with a higher performance index therefore gets a broader
  // default without the policy being written twice.
  const recommended = playable.filter((nation) => nation.recommendedScopeOptionId !== null);
  const intents: NationSelectionIntent[] = [];
  for (const nation of recommended) {
    const candidate: NationSelectionIntent = {
      nationId: nation.id,
      mode: "playable",
      scopeOptionId: nation.recommendedScopeOptionId as string,
      source: "recommended",
    };
    const next = [...intents, candidate];
    const estimate = estimateCareerScope(index, resolveSelection(index, next), profile);
    if (estimate.simulationSpeedRating === "slow" || estimate.simulationSpeedRating === "very_slow" || estimate.simulationSpeedRating === "unsupported") {
      break;
    }
    intents.push(candidate);
  }
  // Never recommend nothing: a database whose recommendations all overflow still needs a career.
  if (intents.length === 0) return buildPreset(index, "minimal", profile);
  return intents;
};

const nationClubCount = (nation: NationNode): number =>
  nation.competitions.reduce((total, competition) => total + competition.clubCount, 0);

/**
 * §13 and §31.4. A stored preset or draft is only applicable to the database it was captured
 * against. Rather than guessing at a renamed Competition, an intent naming something the current
 * catalogue does not contain is dropped and reported, and a fingerprint mismatch rejects the
 * whole payload.
 */
export interface PresetApplication {
  readonly intents: readonly NationSelectionIntent[];
  readonly droppedNationIds: readonly string[];
  readonly droppedScopeOptionIds: readonly string[];
  readonly fingerprintMatches: boolean;
}

export const applyStoredIntents = (
  index: LeagueSetupIndex,
  storedFingerprint: string,
  stored: readonly NationSelectionIntent[],
): PresetApplication => {
  if (storedFingerprint !== index.fingerprint) {
    return {
      intents: [],
      droppedNationIds: [],
      droppedScopeOptionIds: [],
      fingerprintMatches: false,
    };
  }

  const nations = nationIndex(index);
  const scopeOptions = scopeOptionIndex(index);
  const kept: NationSelectionIntent[] = [];
  const droppedNationIds: string[] = [];
  const droppedScopeOptionIds: string[] = [];

  for (const intent of stored) {
    const nation = nations.get(intent.nationId);
    if (nation === undefined || !nation.available) {
      droppedNationIds.push(intent.nationId);
      continue;
    }
    if (intent.mode === "playable") {
      const option = intent.scopeOptionId === undefined ? undefined : scopeOptions.get(intent.scopeOptionId);
      if (option === undefined || option.nationId !== nation.id) {
        if (intent.scopeOptionId !== undefined) droppedScopeOptionIds.push(intent.scopeOptionId);
        continue;
      }
    }
    kept.push(intent);
  }

  return { intents: kept, droppedNationIds, droppedScopeOptionIds, fingerprintMatches: true };
};

// ---------------------------------------------------------------------------
// Untrusted label handling (§23)
// ---------------------------------------------------------------------------

/** Characters that let a database label lie about its own direction or hide content: bidi
 *  overrides and isolates, zero-width joiners, and the C0/C1 control ranges. */
// oxlint-disable-next-line no-control-regex
const UNSAFE_LABEL_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export const MAX_LABEL_LENGTH = 120;

/**
 * §23. Database-derived labels are untrusted. React escapes markup on render, which covers script
 * and tag injection; what it does not cover is a label that reverses the direction of the row
 * around it, hides characters, or is long enough to break the layout. This clamps all three, and
 * is applied where the catalogue crosses into a read model — once, at the boundary, not at each
 * render site.
 */
export const sanitizeLabel = (raw: string): string => {
  const stripped = raw.replace(UNSAFE_LABEL_CHARS, "").replace(/\s+/g, " ").trim();
  if (stripped.length === 0) return "(unnamed)";
  return stripped.length <= MAX_LABEL_LENGTH
    ? stripped
    : `${stripped.slice(0, MAX_LABEL_LENGTH - 1)}…`;
};
