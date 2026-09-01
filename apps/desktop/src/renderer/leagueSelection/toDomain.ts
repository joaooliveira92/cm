import type {
  LeagueSetupIndexView,
  NationRow,
  NationSelectionIntentPayload,
  ResolvedSelectionView,
} from "@cm-clone/contracts";
import type {
  ConfederationId,
  LeagueSetupIndex,
  NationCode,
  NationSelectionIntent,
  ResolvedSelection,
} from "@cm-clone/shared";

/**
 * Wire read model → domain model adapters, the single home both selection surfaces read.
 *
 * The trusted resolver returns branded, sanitized view rows; the pure helpers in
 * `@cm-clone/shared` (projections, estimators, resolvers, tri-state derivation, search) consume
 * the domain shapes with plain string ids and validate against the catalogue themselves. These
 * adapters strip the brands and rebuild a faithful domain `LeagueSetupIndex` from the *wire*
 * catalogue — the wire carries `annualMatches` on every Competition, so a renderer-side cost
 * derivation reads real numbers, not stubs.
 *
 * One home per meaning (packages/AGENTS.md): the League & Nation browser (`leagueSelection/`)
 * and the Active Leagues grid (`activeLeagues/`) both import from here, so the two surfaces can
 * never drift on what a wire row means.
 */

const toDomainCompetition = (competition: NationRow["competitions"][number]) => ({
  id: competition.id as string,
  nationId: competition.nationId as string,
  name: competition.name,
  kind: competition.kind,
  tier: competition.tier,
  requires: competition.requires as readonly string[],
  clubCount: competition.clubCount,
  annualMatches: competition.annualMatches,
  playableSupported: competition.playableSupported,
  estimatesVerified: true,
});

export const toDomainNation = (nation: NationRow) => ({
  id: nation.id as string,
  code: nation.code as NationCode,
  confederationId: nation.confederationId as ConfederationId,
  regionId: nation.regionId as string,
  name: nation.name,
  alternativeNames: nation.alternativeNames,
  available: nation.available,
  playableSupported: nation.playableSupported,
  recommendedScopeOptionId: (nation.recommendedScopeOptionId as string | null) ?? null,
  scopeOptions: nation.scopeOptions.map((option) => ({
    id: option.id as string,
    nationId: option.nationId as string,
    displayName: option.displayName,
    playableCompetitionIds: option.playableCompetitionIds as readonly string[],
    backgroundCompetitionIds: option.backgroundCompetitionIds as readonly string[],
  })),
  competitions: nation.competitions.map((competition) => toDomainCompetition(competition)),
});

/** The full catalogue the pure projection, consequence, and selection helpers read. */
export const toDomainIndex = (index: LeagueSetupIndexView): LeagueSetupIndex => ({
  fingerprint: index.fingerprint,
  databaseName: index.databaseName,
  databaseVersion: index.databaseVersion,
  regions: index.regions.map((region) => ({ id: region.id as string, name: region.name })),
  nations: index.nations.map((nation) => toDomainNation(nation)),
});

export const toDomainSelection = (selection: ResolvedSelectionView["selections"][number]) => ({
  nationId: selection.nationId as string,
  mode: selection.mode,
  ...(selection.scopeOptionId === undefined
    ? {}
    : { scopeOptionId: selection.scopeOptionId as string }),
  playableCompetitionIds: selection.playableCompetitionIds as readonly string[],
  backgroundCompetitionIds: selection.backgroundCompetitionIds as readonly string[],
  viewOnlyCompetitionIds: selection.viewOnlyCompetitionIds as readonly string[],
  dependencyCompetitionIds: selection.dependencyCompetitionIds as readonly string[],
});

const toDomainDependency = (dependency: ResolvedSelectionView["dependencies"][number]) => ({
  competitionId: dependency.competitionId as string,
  mode: dependency.mode,
  requiredBy: dependency.requiredBy as readonly string[],
  chosenDirectly: dependency.chosenDirectly,
});

/** The resolved selection as the pure projection and recommendation helpers read it. */
export const toDomainResolved = (resolved: ResolvedSelectionView): ResolvedSelection => ({
  selections: resolved.selections.map((selection) => toDomainSelection(selection)),
  dependencies: resolved.dependencies.map((dependency) => toDomainDependency(dependency)),
  issues: resolved.issues.map((issue) => ({
    code: issue.code,
    level: issue.level,
    message: issue.message,
    nationId: issue.nationId as string | null,
    competitionIds: issue.competitionIds as readonly string[],
  })),
});

export const toDomainIntents = (
  intents: readonly NationSelectionIntentPayload[],
): readonly NationSelectionIntent[] =>
  intents.map((intent) => ({
    nationId: intent.nationId as string,
    mode: intent.mode,
    ...(intent.scopeOptionId === undefined
      ? {}
      : { scopeOptionId: intent.scopeOptionId as string }),
    source: intent.source,
  }));