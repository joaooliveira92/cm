import type { MovementCommand } from "@bluewave/campaign-engine";
import type {
  FleetScreenProjection,
  MovementCommandOutcome,
} from "../../../shared/fleet-contract.js";
import type { RequestLifecycle } from "../../lib/command-screen-workflow.js";
import { commandNotice } from "../../lib/command-screen-workflow.js";

/**
 * Presentation state for the fleet movement screen. Divisions, geography, and
 * commands are copied from engine responses — the screen never decides whether
 * a route is adjacent, accessible, or otherwise legal.
 */
export interface FleetScreenState extends RequestLifecycle {
  readonly month: FleetScreenProjection["month"] | null;
  readonly playerNationId: string | null;
  readonly divisions: FleetScreenProjection["divisions"];
  readonly areas: FleetScreenProjection["areas"];
  readonly areaEdges: FleetScreenProjection["areaEdges"];
  readonly ports: FleetScreenProjection["ports"];
  readonly movementCommands: readonly MovementCommand[];
}

export function initialFleetScreenState(): FleetScreenState {
  return {
    revision: 0,
    month: null,
    playerNationId: null,
    divisions: [],
    areas: [],
    areaEdges: [],
    ports: [],
    movementCommands: [],
    pendingRequest: null,
    requiresRefresh: false,
    notice: null,
  };
}

/**
 * Map a fleet projection's domain fields into the state. The command screen
 * module owns the lifecycle fields (revision, pending, refresh, notice).
 */
export function projectFleetScreen(projection: FleetScreenProjection): Partial<FleetScreenState> {
  return {
    month: projection.month,
    playerNationId: projection.playerNationId,
    divisions: projection.divisions,
    areas: projection.areas,
    areaEdges: projection.areaEdges,
    ports: projection.ports,
    movementCommands: projection.movementCommands,
  };
}

/**
 * The route the engine currently holds for a division, if any. A superseded or
 * cancelled command stays in the workspace for audit but is no longer pending.
 */
export function pendingRouteFor(
  state: FleetScreenState,
  divisionId: string,
): MovementCommand | null {
  return (
    state.movementCommands.find(
      (command) => command.divisionId === divisionId && command.status === "submitted",
    ) ?? null
  );
}

export function acceptMovementCommand(value: MovementCommandOutcome): {
  readonly patch: Partial<FleetScreenState>;
  readonly notice: string;
} {
  return {
    patch: { movementCommands: value.workspace.movementCommands },
    notice: commandNotice(value.command),
  };
}
