import type {
  ConstructionCommandOutcome,
  ConstructionScreenProjection,
} from "../../../shared/construction-contract.js";
import type { RequestLifecycle } from "../../lib/command-screen-workflow.js";
import { commandNotice } from "../../lib/command-screen-workflow.js";

/**
 * Presentation state for the construction screen. Every number here is copied
 * from an engine response — the screen never derives costs, capacity, or
 * remaining treasury itself.
 */
export interface ConstructionScreenState extends RequestLifecycle {
  readonly month: ConstructionScreenProjection["month"] | null;
  readonly economy: ConstructionScreenProjection["economy"] | null;
  readonly designs: ConstructionScreenProjection["designs"];
  readonly workspace: ConstructionScreenProjection["workspace"] | null;
}

export function initialConstructionScreenState(): ConstructionScreenState {
  return {
    revision: 0,
    month: null,
    economy: null,
    designs: [],
    workspace: null,
    pendingRequest: null,
    requiresRefresh: false,
    notice: null,
  };
}

/**
 * Map a construction projection's domain fields into the state. The command
 * screen module owns the lifecycle fields (revision, pending, refresh, notice).
 */
export function projectConstructionScreen(
  projection: ConstructionScreenProjection,
): Partial<ConstructionScreenState> {
  return {
    month: projection.month,
    economy: projection.economy,
    designs: projection.designs,
    workspace: projection.workspace,
  };
}

export function acceptConstructionCommand(value: ConstructionCommandOutcome): {
  readonly patch: Partial<ConstructionScreenState>;
  readonly notice: string;
} {
  return {
    patch: { workspace: value.workspace },
    notice: commandNotice(value.command),
  };
}
