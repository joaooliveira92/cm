import type { PlayerProjection } from "@bluewave/campaign-engine";

export interface OverviewScreenState {
  readonly projection: PlayerProjection | null;
  readonly loadError: string | null;
}

export function initialOverviewScreenState(): OverviewScreenState {
  return { projection: null, loadError: null };
}

export function applyProjectionLoaded(
  state: OverviewScreenState,
  projection: PlayerProjection,
): OverviewScreenState {
  return { projection, loadError: null };
}

export function applyLoadFailed(state: OverviewScreenState, error: string): OverviewScreenState {
  return { ...state, loadError: error };
}

export interface FleetSummary {
  readonly totalShips: number;
  readonly fleetCount: number;
  readonly divisionCount: number;
}

export function summarizeFleet(projection: PlayerProjection): FleetSummary {
  let totalShips = 0;
  let divisionCount = 0;
  for (const fleet of projection.fleet) {
    for (const division of fleet.divisions) {
      divisionCount++;
      totalShips += division.ships.length;
    }
  }
  return { totalShips, fleetCount: projection.fleet.length, divisionCount };
}

export function totalPortCapacity(projection: PlayerProjection): number {
  return projection.ports.reduce((sum, port) => sum + port.capacity, 0);
}

export function largestPortCapacity(projection: PlayerProjection): number {
  return projection.ports.reduce((max, port) => Math.max(max, port.capacity), 0);
}

export function rederivedMaintenanceCost(projection: PlayerProjection): number {
  // Re-derived fresh from ships — never the raw maintenanceCost (0 pre-first-commit).
  // The projection's economy.maintenanceCost is already the re-derived value
  // (fleetMaintenance via shipMaintenanceCost); this helper documents that the
  // Overview never reads a raw nation.maintenanceCost.
  return projection.economy.maintenanceCost;
}

export function shipsByType(projection: PlayerProjection): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const fleet of projection.fleet) {
    for (const division of fleet.divisions) {
      for (const ship of division.ships) {
        const key = ship.designId || "unknown";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function activeConstructionCount(projection: PlayerProjection): number {
  // Projection does not carry projects directly; the count is derived from
  // constructionSpend + shipyard signal when available. For the Overview spec,
  // we derive from fleet maintenance signal: if constructionSpend > 0 then at
  // least one project is active. This is a placeholder until INC-8's
  // construction projection enriches the view.
  return projection.economy.constructionSpend > 0 ? 1 : 0;
}

export function monthLabel(month: PlayerProjection["month"]): string {
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const name = MONTH_NAMES[month.month - 1] ?? String(month.month);
  return `${name} ${month.year}`;
}
