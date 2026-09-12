import type { SimulationMode } from "./leagueSetup.js";

/**
 * Simulation depth: the per-competition grain the active-leagues screen is built around.
 *
 * §"Simulation Depth is a new domain term" of the Active Leagues Setup spec. Deliberately
 * distinct from `SimulationMode` (in `leagueSetup.ts`): `SimulationMode` is a per-Nation
 * selection — how much of a Nation's pyramid the career carries — while `SimulationDepth`
 * is a per-competition reading of *how deeply that one Competition is simulated*. The
 * three-tier ladder is CM Clone-native, and each tier maps onto the established mode
 * ladder, but the two readings stay separate in the shared vocabulary so a caller can
 * ask "what depth is this Competition at?" without collapsing it into the Nation's mode.
 */

/** The three CM Clone-native depth tiers, ordered least- to most-detailed. */
export const SIMULATION_DEPTHS = ["full", "standard", "results-only"] as const;

export type SimulationDepth = (typeof SIMULATION_DEPTHS)[number];

/** Rank order: results-only < standard < full. */
export const DEPTH_RANK: Readonly<Record<SimulationDepth, number>> = {
  "results-only": 0,
  standard: 1,
  full: 2,
};

/** The deeper of two depths wins. */
export const strongerDepth = (a: SimulationDepth, b: SimulationDepth): SimulationDepth =>
  DEPTH_RANK[a] >= DEPTH_RANK[b] ? a : b;

/**
 * Map a `SimulationMode` onto its `SimulationDepth` reading. `playable` → `full`,
 * `background` → `standard`, `view_only` → `results-only`. `not_loaded` has no depth:
 * a Competition that is not loaded is not in the active-leagues projection at all, so
 * the mapping is partial by construction and the caller must guard before calling.
 */
export const depthFromMode = (mode: string): SimulationDepth => {
  switch (mode) {
    case "playable":
      return "full";
    case "background":
      return "standard";
    case "view_only":
      return "results-only";
    default:
      // `not_loaded` and anything unexpected: there is no depth to report, so this is a
      // caller error rather than a silent wrong answer. Fail loudly at the boundary.
      throw new Error(`Cannot derive a SimulationDepth from mode "${mode}".`);
  }
};

/** The reverse leg: which `SimulationMode` a depth implies when the caller needs it. */
export const modeFromDepth = (depth: SimulationDepth): SimulationMode =>
  depth === "full" ? "playable" : depth === "standard" ? "background" : "view_only";