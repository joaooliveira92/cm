import {
  CUP_ENTRANTS,
  EXCHANGE_LINKS,
  competitionIndex,
  type CompetitionKind,
  type CupEntrant,
  type ExchangeLink,
  type LeagueSetupIndex,
} from "./leagueSetup.js";
import { projectActiveLeagues, type ResolvedSelection } from "./leagueSelection.js";
import type { SimulationDepth } from "./simulation.js";

/**
 * The resolved world: what a save actually records, derived from what the player chose.
 *
 * The catalogue stays in code and a save records the resolved world. The line between them runs on
 * whether anything outside the loaded world points at a row — `nations` and `cities` are copied
 * unconditionally because a player's nationality may name a nation the selection never activated,
 * while competitions are activated-only, because nothing outside the loaded world points in and
 * their volume scales with the chosen scope.
 *
 * Dependency (`requires`) edges are not here, and are persisted nowhere. They are setup-time input
 * to closure resolution; once the world exists, the fact that a top division required its national
 * cup governs nothing a simulation reads. Promotion structure is the opposite case — consulted at
 * every season rollover for the life of the save — which is why it is carried through.
 */

/** One activated Competition, in the shape a save stores it. */
export interface ResolvedCompetition {
  readonly id: string;
  /**
   * The Nation that owns this Competition, or `null` for a cross-border tournament.
   *
   * The catalogue models confederation tournaments as Nation-shaped branches so the browser stays
   * one uniform tree, but a branch is a container rather than a territory and has no `nations` row
   * to point at. `null` says "no single Nation owns this", which is the truth; attributing the
   * European Champions Tournament to England because the branch borrows England's code would make
   * "every Competition in England" quietly wrong.
   */
  readonly nationId: string | null;
  readonly kind: CompetitionKind;
  /** Pyramid tier, 1 = highest. `null` for a kind that does not sit on the ladder. */
  readonly tier: number | null;
  readonly depth: SimulationDepth;
  /** `null` for a Competition whose field is a function of its sources rather than its own. */
  readonly clubCount: number | null;
}

export interface ResolvedWorld {
  readonly competitions: readonly ResolvedCompetition[];
  readonly links: readonly ExchangeLink[];
  readonly entrants: readonly CupEntrant[];
}

/** A Competition that owns no clubs of its own draws its field from its entrant sources. */
const ownsClubs = (kind: CompetitionKind): boolean => kind === "league" || kind === "reserve";

/**
 * Turns an Effective Selection into the rows a save records.
 *
 * Depth comes from the active-leagues projection rather than from the raw selection, so there is
 * one answer to "how deeply is this Competition simulated" — including the rule that a Competition
 * pulled in as a dependency is capped at `standard` however deep the selection that pulled it.
 *
 * Both structural relations are filtered to links whose **endpoints are both loaded**, which is
 * what closes the world at the edge of the chosen scope: the lowest loaded division never relegates
 * anyone out of the world and the highest never promotes anyone out of it. That is a visible
 * flattening — a player in the bottom division of a narrow scope cannot go down — and the mitigation
 * is that a wider League Scope Option is how a player buys the drop.
 *
 * Ordering is by canonical id throughout, so the rows a save records are a function of *which*
 * competitions resolved, never of the order the resolver happened to visit them.
 */
export const resolveWorld = (
  index: LeagueSetupIndex,
  resolved: ResolvedSelection,
): ResolvedWorld => {
  const catalogue = competitionIndex(index);
  const projection = projectActiveLeagues(index, resolved);

  const depthById = new Map<string, SimulationDepth>(
    projection.rows.map((row) => [row.competitionId, row.depth]),
  );

  const competitions = [...depthById.entries()]
    .flatMap(([id, depth]): readonly ResolvedCompetition[] => {
      const node = catalogue.get(id);
      if (node === undefined) return [];
      const nation = index.nations.find((candidate) => candidate.id === node.nationId);
      return [
        {
          id: node.id,
          // A confederation branch is a tournament container, not a territory: it has no row in
          // `nations`, so its competitions carry no nation.
          nationId: nation === undefined || nation.regionId === "region_continental" ? null : nation.id,
          kind: node.kind,
          tier: node.tier,
          depth,
          clubCount: ownsClubs(node.kind) ? node.clubCount : null,
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const loaded = new Set(competitions.map((competition) => competition.id));

  const links = EXCHANGE_LINKS.filter(
    (link) => loaded.has(link.higherCompetitionId) && loaded.has(link.lowerCompetitionId),
  ).sort(
    (a, b) =>
      a.higherCompetitionId.localeCompare(b.higherCompetitionId) ||
      a.lowerCompetitionId.localeCompare(b.lowerCompetitionId),
  );

  const entrants = CUP_ENTRANTS.filter(
    (entrant) => loaded.has(entrant.cupCompetitionId) && loaded.has(entrant.sourceCompetitionId),
  ).sort(
    (a, b) =>
      a.cupCompetitionId.localeCompare(b.cupCompetitionId) ||
      a.sourceCompetitionId.localeCompare(b.sourceCompetitionId),
  );

  return { competitions, links, entrants };
};
