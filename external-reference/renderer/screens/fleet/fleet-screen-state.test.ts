import { describe, expect, it } from "vite-plus/test";
import type { FleetScreenProjection } from "../../../shared/fleet-contract.js";
import type { FleetScreenState } from "./fleet-screen-state.js";
import {
  acceptMovementCommand,
  initialFleetScreenState,
  pendingRouteFor,
  projectFleetScreen,
} from "./fleet-screen-state.js";
import {
  acceptCommand,
  applyProjection,
  applyRejection,
  applyTransportFailure,
  beginRequest,
} from "../../lib/command-screen-workflow.js";
import type { PreparedCommand, RequestKind } from "../../lib/command-screen-workflow.js";

const movementCommand = {
  commandId: "mcmd_1",
  divisionId: "Channel Squadron",
  fromAreaId: "area_northern_europe",
  toAreaId: "area_mediterranean",
  status: "submitted" as const,
  submittedAtRevision: 0,
};

const projection: FleetScreenProjection = {
  revision: 3,
  month: { year: 1900, month: 1 },
  playerNationId: "nation_uk",
  divisions: [
    {
      fleetName: "Home Fleet",
      divisionId: "Channel Squadron",
      areaId: "area_northern_europe",
      ships: [
        {
          name: "HMS Majestic",
          designId: "design_majestic",
          status: "commissioned",
        },
      ],
    },
  ],
  areas: [
    { id: "area_northern_europe", name: "Northern Europe" },
    { id: "area_mediterranean", name: "Mediterranean" },
  ],
  areaEdges: [{ fromAreaId: "area_northern_europe", toAreaId: "area_mediterranean" }],
  ports: [
    {
      id: "port_portsmouth",
      name: "Portsmouth",
      areaId: "area_northern_europe",
      capacity: 40,
    },
  ],
  movementCommands: [movementCommand],
};

const workspace = {
  commands: [],
  movementCommands: [movementCommand],
  treasuryReserved: 0,
  capacityReserved: 0,
};

function loaded(): FleetScreenState {
  return applyProjection(initialFleetScreenState(), projection, projectFleetScreen(projection));
}

function prepared(kind: RequestKind, transportRequestId: string): PreparedCommand<unknown> {
  return {
    kind,
    context: { expectedRevision: 0, transportRequestId },
    send: async () => ({ outcome: "success", value: undefined, diagnostics: [] }),
  };
}

describe("fleet screen state", () => {
  it("maps the engine projection domain fields without deriving geography", () => {
    expect(projectFleetScreen(projection)).toEqual({
      month: projection.month,
      playerNationId: projection.playerNationId,
      divisions: projection.divisions,
      areas: projection.areas,
      areaEdges: projection.areaEdges,
      ports: projection.ports,
      movementCommands: projection.movementCommands,
    });
  });

  it("adopts the projection revision and clears every request marker", () => {
    const state = loaded();

    expect(state.revision).toBe(3);
    expect(state.divisions).toEqual(projection.divisions);
    expect(state.areas).toEqual(projection.areas);
    expect(state.areaEdges).toEqual(projection.areaEdges);
    expect(state.movementCommands).toEqual(projection.movementCommands);
    expect(state.pendingRequest).toBeNull();
    expect(state.requiresRefresh).toBe(false);
  });

  it("reports the submitted command as the pending route for a division", () => {
    const state = loaded();

    expect(pendingRouteFor(state, "Channel Squadron")).toEqual(movementCommand);
    expect(pendingRouteFor(state, "Mediterranean Squadron")).toBeNull();
  });

  it("ignores superseded and cancelled commands when reporting the pending route", () => {
    const state = applyProjection(
      initialFleetScreenState(),
      projection,
      projectFleetScreen({
        ...projection,
        movementCommands: [
          { ...movementCommand, status: "superseded" as const },
          {
            ...movementCommand,
            commandId: "mcmd_2",
            status: "cancelled" as const,
          },
        ],
      }),
    );

    expect(pendingRouteFor(state, "Channel Squadron")).toBeNull();
  });

  it("keeps the transport request identity of the request in flight", () => {
    const state = beginRequest(loaded(), prepared("submit", "tx-1"));

    expect(state.pendingRequest).toEqual({
      kind: "submit",
      transportRequestId: "tx-1",
    });
    expect(state.notice).toBeNull();
  });

  it("applies an accepted movement command from the engine response", () => {
    const { patch, notice } = acceptMovementCommand({
      command: movementCommand,
      workspace,
    });
    const state = acceptCommand(beginRequest(loaded(), prepared("submit", "tx-1")), patch, notice);

    expect(state.movementCommands).toEqual([movementCommand]);
    expect(state.pendingRequest).toBeNull();
    expect(state.notice).toContain("mcmd_1");
    expect(state.notice).toContain("submitted");
  });

  it("shows the engine reason code and diagnostics for an illegal route", () => {
    const state = applyRejection(beginRequest(loaded(), prepared("submit", "tx-1")), {
      outcome: "rejected",
      reason: "VALIDATION_FAILED",
      diagnostics: ["NON_ADJACENT: No area edge connecting 'a' to 'b'"],
    });

    expect(state.notice).toContain("VALIDATION_FAILED");
    expect(state.notice).toContain("NON_ADJACENT");
    expect(state.requiresRefresh).toBe(false);
    expect(state.pendingRequest).toBeNull();
  });

  it("marks the projection as stale when the engine reports a newer revision", () => {
    const state = applyRejection(beginRequest(loaded(), prepared("replace", "tx-2")), {
      outcome: "rejected",
      reason: "STALE_REVISION",
      diagnostics: [],
      currentRevision: 5,
    });

    expect(state.revision).toBe(5);
    expect(state.requiresRefresh).toBe(true);
    expect(state.notice).toContain("current revision 5");
  });

  it("keeps the pending request after a transport failure so it can be retried", () => {
    const state = applyTransportFailure(
      beginRequest(loaded(), prepared("cancel", "tx-3")),
      "channel closed",
    );

    expect(state.pendingRequest).toEqual({
      kind: "cancel",
      transportRequestId: "tx-3",
    });
    expect(state.notice).toContain("TRANSPORT_FAILURE");
  });
});
